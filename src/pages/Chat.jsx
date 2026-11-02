import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthError, shouldShowAuthError } from '../components/utils/authErrorHandler';
import AuthErrorBanner from '../components/utils/AuthErrorBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Menu, Sparkles, ArrowLeft, Trash2, Paperclip, Mic, Square, Play, PanelLeftClose, PanelLeftOpen, LifeBuoy } from 'lucide-react';
import PremiumIcon from '@/components/ui/PremiumIcon';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import MessageList from '../components/chat/MessageList';
import ConversationsList from '../components/chat/ConversationsList';
import ChatConversationsSidebar from '../components/chat/ChatConversationsSidebar';
import SessionSummary from '../components/chat/SessionSummary';
import ProactiveCheckIn from '../components/chat/ProactiveCheckIn';
import { validateChatAttachment } from '../components/chat/utils/fileValidation';
import TherapyStateMachine from '../components/chat/TherapyStateMachine';
import EnhancedMoodCheckIn from '../components/home/EnhancedMoodCheckIn';
import InlineConsentBanner from '../components/chat/InlineConsentBanner';
import { resolveCurrentChatConsent } from '@/lib/chatConsent';
import ThoughtWorkSaveHandler from '../components/chat/ThoughtWorkSaveHandler';
import InlineRiskPanel from '../components/chat/InlineRiskPanel';
import ProfileSpecificDisclaimer from '../components/chat/ProfileSpecificDisclaimer';
import { detectCrisisWithReason, isExplicitCurrentSafetyDenial } from '../components/utils/crisisDetector';
import {
  clearSubmittedDraftIfUnchanged,
  createCrisisDetectionLifecycle,
} from '../lib/crisisDetectionLifecycle';
import AgeGateModal from '../components/utils/AgeGateModal';
import AgeRestrictedMessage from '../components/utils/AgeRestrictedMessage';
import ErrorBoundary from '../components/utils/ErrorBoundary';
import { validateAgentOutput, sanitizeConversationMessagesAligned, parseCounters, serializeAttachmentMetadataMarker } from '../components/utils/validateAgentOutput.jsx';
import {
  evaluateCurrentTurnGroundingContractDetailed,
  classifyFormulationGuardedTurn,
} from '../components/utils/formulationContractGuard.js';
import { ACTIVE_CBT_THERAPIST_WIRING, predictTherapistWiringFromRuntimeFlags, resolveTherapistRuntimeActivation } from '@/api/activeAgentWiring.js';
import { createTherapistSessionWiringController } from '@/lib/therapistSessionWiringController.js';
import { createContextComposerV2SessionSelectionController } from '@/lib/contextComposerV2SessionSelectionController.js';
import { buildV6SessionStartContentAsync, buildV7SessionStartContentAsync, buildV8SessionStartContentAsync, buildV9SessionStartContentAsync, buildV10SessionStartContentAsync, buildV11SessionStartContentAsync, buildV12SessionStartContentAsync, buildActionFirstDemotedSessionContentAsync, buildRuntimeSafetySupplement, buildRuntimeFormulationSupplement, buildV10TurnKnowledgeContextAsync } from '@/lib/workflowContextInjector.js';
import { evaluateAssistantReplyFinality } from '@/lib/pollingAssistantFinality.js';
import {
  consumePendingPolicyRefreshAfterSuccessfulSend,
  ensureTherapeuticFormsPolicyInjected,
  getTherapeuticFormsPolicyPayload,
  logTherapeuticFormsPolicyDiagnostic,
  prependPendingPolicyRefreshToUserContent,
} from '@/lib/therapeuticFormsPolicy.js';
// Phase 4 / Phase 5 — Conversation memory write for V7 continuity
import { triggerConversationEndSummarization, CONVERSATION_MIN_MESSAGES_FOR_MEMORY } from '@/lib/sessionEndSummarization.js';
import { MOBILE_HEADER_HEIGHT } from '../components/layout/MobileHeader';
import { BOTTOM_NAV_HEIGHT } from '../components/layout/BottomNav';
import { getHumanSupportCopy } from '../lib/humanSupportDirectory';
// Phase 8 — Upgraded-path UI (flag-gated; hidden in default mode)
import SessionPhaseIndicator from '../components/therapy/SessionPhaseIndicator';
import SafetyModeIndicator from '../components/therapy/SafetyModeIndicator';
// Phase 3 Deep Personalization — Session continuity cue (flag-gated; hidden in default mode)
import SessionContinuityCue from '../components/therapy/SessionContinuityCue';
import {
  buildMobileAudioDiagnosticInfo,
  extractBackendTranscriptionErrorReason,
  buildTranscriptionFailureDescription,
} from '@/utils/audioTranscriptionDiagnostics.js';
import { resolveFormIntentRequest } from '@/utils/resolveFormIntent.js';
import { MAX_GENERATED_FILES_PER_RESPONSE, MAX_MODEL_CANDIDATE_FORMS } from '@/data/therapeuticForms/index.js';
import {
  isWebmFile,
  isMp4File,
  resolveRecordedAudioMimeType,
  decodeAudioDataAsync,
  audioBufferToMonoWavBlob,
} from '@/utils/androidAudioTranscoder.js';
import {
  createS2V8TraceCollector,
  isS2DebugEnabledFromSearch,
  mergeEntryDiagnosticParams,
  normalizeSnippet,
  normalizeTraceSource,
  summarizeText,
} from '@/lib/s2V8TraceDiagnostics.js';
import {
  buildOutboundUserMessageContent,
  buildS2DebugLifecycleDiagnostic,
  applyLegacyVisibleAssistantNormalizationGate,
  calculateExpectedReplyCount,
  deduplicateMessagesByLifecycleKeys,
  getAssistantIdentityKey,
  getAssistantIdentitySource,
  getDefaultPollingLifecycle,
  getPollingDelayForAttempt,
  hasCorrectionBlockAttached,
  hasPollingAttemptTimedOut,
  selectLatestAssistantResponse,
  shouldSuppressSubscriptionEventWhileLoading,
  wasCorrectionBlockSanitized,
} from '@/lib/chatRuntimeLifecycle.js';
import { createSessionStartOpenerFallbackController } from '@/lib/sessionStartOpenerFallback.js';
import {
  beginTimeToFirstValue,
  bindTimeToFirstValueConversation,
  completeTimeToFirstValue,
} from '@/lib/timeToFirstValue.js';
import {
  buildStage12SessionContract,
  buildStage12TurnSupplement,
} from '@/lib/chatQualityStage12.js';
import {
  buildInternalCorrectionDiagnostic,
  consumeInternalCorrectionIntent,
  createInternalCorrectionIntent,
  hasPendingInternalCorrectionIntent,
  internalCorrectionScopeMatches,
  INTERNAL_CORRECTION_CHANNEL,
  INTERNAL_CORRECTION_TYPES,
} from '@/lib/internalCorrectionChannel.js';
import {
  createChatOrchestratorV2,
  buildV2DebugDiagnostic,
} from '@/lib/chatOrchestratorV2.js';
import { isChatOrchestratorV2Enabled, getDedupGuardPollingMode, getFormulationGuardMode, getGroundingGuardMode } from '@/lib/featureFlags.js';
import {
  applyFormulationGuardWithMode,
  applyGroundingGuardWithMode,
  augmentProvenanceWithLifecycle,
  buildCompositeProvenanceKey,
} from '@/lib/guardIsolationAudit.js';
import { enforceResponsePolicy } from '../lib/responsePolicyEnforcer.js';
import { applyAtomicActionGuardToConversationMessages } from '../lib/explicitOutputShapeGuard.js';
import { _therapistWiringCanonicalName } from '@/lib/runtimeCapabilityDiagnostic.js';
import {
  fetchTherapistRuntimeFlagSnapshot,
  buildTherapistRuntimeFlagTransportDiagnostic,
} from '@/lib/therapistRuntimeFlagTransport.js';
import {
  triggerConversationMemoryWriteOnce,
  waitForConversationMemoryWrite,
} from '@/lib/conversationMemoryWriteDedup.js';
import {
  createSessionInstanceId,
  maybePersistCaseFormulationUpdatesForMessages,
  resolveConversationSessionInstanceId,
} from '@/lib/caseFormulationInvocation.js';

// ─── MF-7: Legacy variant-profile agent names — historical conversations under
// these names must NOT receive new messages. Empty clinical stubs; fail-closed.
// Do NOT derive this list dynamically. Do NOT infer from safetyProfile metadata.
const LEGACY_VARIANT_PROFILES = Object.freeze([
'cbt_therapist_strict',
'cbt_therapist_standard',
'cbt_therapist_lenient']
);

// Maps ISO language codes to full names injected into the session-start directive.
// Every supported language, including English, must have an explicit entry so the
// agent always receives a bounded session-language directive on every new session.
const LANG_FULL_NAMES = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese'
};
const IMAGE_ATTACHMENT_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);
const AUDIO_ATTACHMENT_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm']);
const getSpeechRecognitionConstructor = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
const getAudioContextConstructor = () => window.AudioContext || window.webkitAudioContext || null;
const ANDROID_MEDIA_RECORDER_MIME_CANDIDATES = Object.freeze([
'audio/mp4',
'audio/ogg;codecs=opus',
'audio/ogg',
'audio/webm;codecs=opus',
'audio/webm']
);

function areChatViewerStatesEqual(left, right) {
  if (!left || !right) return left === right;
  return left.source === right.source && left.chatConversationId === right.chatConversationId;
}

// Compatibility anchor: keep historical session-start builders referenced for static import-audit tests.
const LEGACY_SESSION_START_BUILDERS = Object.freeze([
  buildV6SessionStartContentAsync,
  buildV7SessionStartContentAsync,
  buildV8SessionStartContentAsync,
  buildV9SessionStartContentAsync,
  buildV10SessionStartContentAsync,
  buildV11SessionStartContentAsync,
  buildV12SessionStartContentAsync,
]);
void LEGACY_SESSION_START_BUILDERS;

function isAndroidRuntime() {
  if (typeof window === 'undefined') return false;
  const capacitorPlatform = typeof window.Capacitor?.getPlatform === 'function' ? window.Capacitor.getPlatform() : null;
  if (capacitorPlatform === 'android') return true;
  return /android/i.test(navigator?.userAgent || '');
}

/**
 * Returns true on mobile browsers and in-app WebView environments.
 * Used to gate enhanced transcription diagnostics to mobile code paths only.
 */
function isMobileBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /android|iphone|ipad|ipod|mobile|webos|blackberry|windows\s?phone/i.test(ua);
}

function getAndroidMediaRecorderMimeCandidates() {
  if (!isAndroidRuntime()) return [];

  if (typeof window?.MediaRecorder?.isTypeSupported !== 'function') {
    return [...ANDROID_MEDIA_RECORDER_MIME_CANDIDATES];
  }

  const supportedMimeTypes = ANDROID_MEDIA_RECORDER_MIME_CANDIDATES.filter((mimeType) =>
  window.MediaRecorder.isTypeSupported(mimeType)
  );

  return supportedMimeTypes.length > 0 ? supportedMimeTypes : [...ANDROID_MEDIA_RECORDER_MIME_CANDIDATES];
}

/**
 * Converts Android WebM and MP4/M4A voice drafts to WAV for transcription compatibility.
 * Non-Android or non-WebM/MP4 files are passed through unchanged.
 *
 * Produces a 16-bit mono PCM WAV file at 16 kHz — the universally accepted speech-recognition
 * format that is small (≈32 KB/s), avoids large uncompressed stereo uploads, and is supported
 * by every major transcription backend.
 *
 * Two key hardening steps beyond a plain decode+encode:
 *   1. AudioContext is created with { sampleRate: 16000 } so the Web Audio API resamples on
 *      decode, keeping the WAV at speech-optimised 16 kHz even on devices that default to 48 kHz.
 *      Falls back to the device default rate on older WebViews that ignore the option.
 *   2. The decoded AudioBuffer length is validated. On some Android WebViews, decodeAudioData can
 *      succeed but return an empty (length = 0) buffer for audio/mp4;codecs=opus. Uploading such
 *      a near-empty WAV causes "unsupported file type" rejections from transcription services.
 *      A length-0 result now throws so the outer handler can surface a clear error.
 */
async function convertAndroidWebmDraftToWav(file) {
  if (!isAndroidRuntime() || (!isWebmFile(file) && !isMp4File(file))) return file;
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    throw new Error('Audio conversion is unavailable on this Android runtime');
  }

  // Request 16 kHz so the AudioContext resamples on decode.
  // Falls back gracefully on WebViews that do not support the sampleRate option.
  let audioContext;
  try {
    audioContext = new AudioContextCtor({ sampleRate: 16000 });
  } catch {
    audioContext = new AudioContextCtor();
  }

  try {
    const audioBuffer = await decodeAudioDataAsync(audioContext, await file.arrayBuffer());

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error(
        'Decoded audio buffer is empty — the codec may not be fully supported on this runtime'
      );
    }

    const wavBlob = audioBufferToMonoWavBlob(audioBuffer);
    const baseName = typeof file.name === 'string' && file.name.trim() ?
      file.name.replace(/\.[^.]+$/, '') :
      `voice-draft-${Date.now()}`;
    return new File([wavBlob], `${baseName}.wav`, { type: 'audio/wav' });
  } finally {
    if (typeof audioContext.close === 'function') {
      try {
        await audioContext.close();
      } catch {
        // no-op
      }
    }
  }
}

function hasUserAttachment(message) {
  if (!message || message.role !== 'user') return false;
  const attachment = message.metadata?.attachment && typeof message.metadata.attachment === 'object' ?
  message.metadata.attachment :
  message.attachment && typeof message.attachment === 'object' ?
  message.attachment :
  null;
  return !!attachment;
}

/**
 * Appends a language directive to a session-start content string.
 * Every supported language, including English, emits an explicit bounded
 * directive so the agent always knows which language to use for its opening
 * turn and all subsequent turns in this session.
 */
function addLangDirective(sessionContent, lang) {
  const name = LANG_FULL_NAMES[lang];
  if (!name) return sessionContent;
  const spanishRegister = lang === 'es'
    ? '\n[SPANISH_REGISTER: Use neutral international Spanish consistently. Use the tú paradigm unless the user explicitly requests another register. Never mix tú with voseo; avoid vos, sentís, querés, podés, llevás, mantené, tenés, hacés, decís, venís, sos. Prefer tú, sientes, quieres, puedes, llevas, mantén, tienes, haces, dices, vienes, eres.]'
    : '';
  return sessionContent + `\n[SESSION_LANGUAGE: ${lang}. Open and respond entirely in ${name} for this session. Do not use another language unless the user explicitly asks to change the session language.]${spanishRegister}`;
}

function resolveAttachmentType(fileName) {
  const extension = typeof fileName === 'string' ? fileName.split('.').pop()?.toLowerCase() : '';
  if (IMAGE_ATTACHMENT_EXTENSIONS.has(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (AUDIO_ATTACHMENT_EXTENSIONS.has(extension)) return 'audio';
  return 'file';
}

function buildDeterministicFormRouterContext(route, sessionLanguage) {
  if (!route?.intent) return '';
  const COMPACT_CANDIDATE_LIMIT = MAX_MODEL_CANDIDATE_FORMS;
  const COMPACT_FIELD_LIMIT = 140;
  const compactField = (value, max = COMPACT_FIELD_LIMIT) => {
    const normalized = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    if (!normalized) return null;
    return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
  };

  const intent = route.intent;
  const topMatch = route.matches?.[0] || route.nearestMatches?.[0] || null;
  const compactCandidates = (Array.isArray(route.matches) ? route.matches : [])
    .slice(0, COMPACT_CANDIDATE_LIMIT)
    .map((candidate) => ({
      id: candidate?.id || null,
      title: compactField(candidate?.title || candidate?.localizedTitle || ''),
      localizedTitle: compactField(candidate?.localizedTitle || candidate?.title || ''),
      language: candidate?.language || null,
      audience: candidate?.audience || null,
      clinicalDomain: compactField(candidate?.clinicalDomain || ''),
      whenToUse: compactField(candidate?.whenToUse || candidate?.when_to_use || ''),
      category: candidate?.category || null,
    }))
    .filter((candidate) => candidate.id);

  const lines = [
    '[FORM_ROUTER_CONTEXT]',
    `intent: ${intent.type}`,
    `active_language: ${sessionLanguage || 'en'}`,
  ];
  if (intent.language) lines.push(`requested_language: ${intent.language}`);
  if (intent.audience) lines.push(`requested_audience: ${intent.audience}`);
  if (topMatch?.id) lines.push(`best_match_form_id: ${topMatch.id}`);
  if (topMatch?.title) lines.push(`best_match_form_title: ${topMatch.title}`);
  lines.push(`registry_total: ${route.stats?.total || 0}`);
  lines.push(`candidate_total: ${Array.isArray(route.matches) ? route.matches.length : 0}`);
  lines.push(`candidate_included: ${compactCandidates.length}`);
  lines.push(`should_attach_form: ${route.generatedFile ? 'yes' : 'no'}`);
  if (Array.isArray(route.generatedFiles) && route.generatedFiles.length > 0) {
    lines.push(`generated_files_count: ${Math.min(route.generatedFiles.length, MAX_GENERATED_FILES_PER_RESPONSE)}`);
    lines.push(`generated_files_ids: ${route.generatedFiles.map((file) => file?.form_id).filter(Boolean).join(', ')}`);
  }
  if (route.usedFallbackLanguage) lines.push(`fallback_language_used: ${route.generatedFile?.language || route.resolvedLanguage || 'en'}`);
  if (route.responseText) lines.push(`deterministic_hint: ${compactField(route.responseText, 240)}`);
  if (compactCandidates.length > 0) {
    lines.push('[FORM_CANDIDATES]');
    compactCandidates.forEach((candidate, index) => {
      lines.push(
        `${index + 1}. id=${candidate.id} | lang=${candidate.language || 'n/a'} | audience=${candidate.audience || 'n/a'} | category=${candidate.category || 'n/a'} | title=${candidate.localizedTitle || candidate.title || candidate.id} | domain=${candidate.clinicalDomain || 'n/a'} | when_to_use=${candidate.whenToUse || 'n/a'}`
      );
    });
  }
  return `\n${lines.join('\n')}\n`;
}

export default function Chat() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restoredPdfViewerConversationId = location.state?.pdfViewerReturn?.source === 'chat'
    ? location.state.pdfViewerReturn.chatConversationId || null
    : null;
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(restoredPdfViewerConversationId);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessageState] = useState('');
  const inputMessageRef = useRef('');
  const setInputMessage = (nextValue) => {
    if (typeof nextValue === 'function') {
      setInputMessageState((previousValue) => {
        const resolvedValue = nextValue(previousValue);
        inputMessageRef.current = resolvedValue;
        return resolvedValue;
      });
      return;
    }
    inputMessageRef.current = nextValue;
    setInputMessageState(nextValue);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationInitializing, setIsConversationInitializing] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('idle');
  const [responseWaitSeconds, setResponseWaitSeconds] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const deleteReturnFocusRef = useRef(null);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true);
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const summaryPromptShownConversationIdsRef = useRef(new Set());
  const [summaryPromptConversationId, setSummaryPromptConversationId] = useState(null);
  const [showTherapyFlow, setShowTherapyFlow] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [isConsentResolved, setIsConsentResolved] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savePromptData, setSavePromptData] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [audioDraftStatus, setAudioDraftStatus] = useState('idle');
  const [audioDraftUrl, setAudioDraftUrl] = useState(null);
  const [audioDraftFile, setAudioDraftFile] = useState(null);
  const [audioDraftTranscript, setAudioDraftTranscript] = useState('');
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioDraftPlayerRef = useRef(null);
  const audioDraftUrlRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speechTranscriptRef = useRef('');
  const audioDraftLanguageRef = useRef('');
  // MF-7: true when the loaded conversation belongs to a legacy variant-profile agent
  const [variantProfileBlocked, setVariantProfileBlocked] = useState(false);
  // Phase 8 — Upgraded-path UI state (only relevant when V5 wiring is active)
  // safetyModeActive becomes true and stays true once the upgraded safety supplement
  // fires for any turn in this session.  Resets when a new conversation starts.
  const [safetyModeActive, setSafetyModeActive] = useState(false);
  // Session language — locked at conversation start from the active UI locale.
  // Separate from i18n.language (UI locale) so that UI locale changes mid-session
  // do not corrupt the response language used by the Final Output Governor.
  // Stored as a ref so MessageBubble renders do not trigger on locale changes.
  const sessionLanguageRef = useRef(i18n.language || 'en');
  const currentConversationIdRef = useRef(currentConversationId);
  currentConversationIdRef.current = currentConversationId;
  const conversationInitializingRef = useRef(false);
  const sessionInstanceIdByConversationRef = useRef(new Map());
  const formulationPersistedMessageIdsByConversationRef = useRef(new Map());
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const riskPanelRef = useRef(null);
  const crisisDetectionLifecycleRef = useRef(createCrisisDetectionLifecycle());
  const formsPolicyVersionCacheRef = useRef(new Map());
  const pendingTherapeuticFormsPolicyRefreshRef = useRef(new Map());
  const [visibleCount, setVisibleCount] = useState(50);
  const subscriptionActiveRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const expectedReplyCountRef = useRef(0);
  const lastMessageHashRef = useRef('');
  const lastConfirmedMessagesRef = useRef([]);
  const currentTurnIdRef = useRef(0);
  const isRefetchingRef = useRef(false);
  const thinkingPlaceholderRef = useRef(null);
  // Tracks whether the subscription already delivered a confirmed final response for
  // the current send cycle. When true, polling must not overwrite subscription content.
  const subscriptionSucceededRef = useRef(false);
  const snapshotSequenceRef = useRef(0);
  const guardedAssistantMemoryByConversationRef = useRef(new Map());
  const sessionStartOpenerFallbackRef = useRef(null);
  const sessionStartOpenerFallbackDepsRef = useRef({});
  // V8-K: mirrors isLoading for subscription closures that cannot safely close over
  // the React state variable (the closure is created once when the effect runs and
  // would capture a stale false value otherwise).
  const isLoadingRef = useRef(false);
  // V8-K: tracks assistant messages that have been atomically committed to visible
  // state by the authoritative polling / visibility-refetch / load-conversation path.
  // Keyed by conversationId → Set of assistant identity keys.  Once an identity key
  // is present here, safeUpdateMessages will reject any incoming snapshot that would
  // change the content of that message.
  const finalizedAssistantsByConvRef = useRef(new Map());

  // INSTRUMENTATION: Track hard render gate enforcement + send cycle proof
  const instrumentationRef = useRef({
    SEND_COUNT: 0,
    WEB_SENDS_PASS: 0,
    MOBILE_SENDS_PASS: 0,
    HARD_GATE_BLOCKED_OBJECT: 0,
    HARD_GATE_BLOCKED_JSON_STRING: 0,
    HARD_GATE_FALSE_POSITIVE_PREVENTED: 0,
    REFETCH_TRIGGERED: 0,
    DUPLICATE_BLOCKED: 0,
    DUPLICATE_OCCURRED: 0,
    PLACEHOLDER_RENDERED: 0,
    PLACEHOLDER_BECAME_MESSAGE: 0,
    THINKING_OVER_10S: 0,
    UI_FLASHES_DETECTED: 0,
    SAFE_UPDATES: 0,
    TOTAL_MESSAGES_PROCESSED: 0,
    STUCK_THINKING_TIMEOUTS: 0
  });

  const refetchDebounceRef = useRef(null);
  const mountedRef = useRef(true);
  const processedIntentRef = useRef(null);
  const sessionTriggeredRef = useRef(new Set());
  const inFlightIntentRef = useRef(false);
  // Tracks pending/succeeded/failed memory writes by conversation ID. Pending
  // callers share one promise; success is recorded only after persistence.
  const conversationMemoryWrittenRef = useRef(new Map());

  const rememberConversationSessionIdentity = useCallback((conversationId, sessionInstanceId) => {
    if (!conversationId) return '';
    if (typeof sessionInstanceId !== 'string' || !sessionInstanceId.trim()) {
      return sessionInstanceIdByConversationRef.current.get(conversationId) || '';
    }
    const normalized = sessionInstanceId.trim();
    sessionInstanceIdByConversationRef.current.set(conversationId, normalized);
    return normalized;
  }, []);

  const persistFinalizedCaseFormulationUpdates = useCallback(async (conversationId, committedMessages) => {
    const sessionInstanceId = sessionInstanceIdByConversationRef.current.get(conversationId) || '';
    if (!conversationId || !sessionInstanceId || !Array.isArray(committedMessages)) {
      return { attempted: 0, persisted: 0, failed: 0 };
    }
    let persistedIds = formulationPersistedMessageIdsByConversationRef.current.get(conversationId);
    if (!persistedIds) {
      persistedIds = new Set();
      formulationPersistedMessageIdsByConversationRef.current.set(conversationId, persistedIds);
    }
    return maybePersistCaseFormulationUpdatesForMessages(
      base44,
      conversationId,
      sessionInstanceId,
      committedMessages,
      persistedIds,
    );
  }, []);
  // Formulation contract guard — tracks the most recent unresolved pending
  // correction.  Set by buildVisibleConversationMessages after each guard pass;
  // consumed and cleared by handleSendMessage when the next user message is sent.
  const pendingFormulationCorrectionRef = useRef(null);
  const pendingGroundingCorrectionRef = useRef(null);
  const currentTurnResponsePolicyRef = useRef(null);
  const legacyGenerationPolicyRef = useRef(null);
  const pendingInternalCorrectionRef = useRef(null);
  const pollingFinalityStateRef = useRef({
    assistantKey: null,
    content: null,
    stableCount: 0,
  });
  const latestPipelineDiagnosticsRef = useRef(null);
  // Guard Isolation Audit Phase 1 — stores guard provenance records keyed by
  // client_request_id so that lifecycle augmentation is always scoped to the
  // CURRENT assistant candidate / active request.  An older replaced assistant
  // can never be augmented with the safe_update / visible_commit result of a
  // newer assistant.  Each entry is { formulation: provenance|null, grounding: provenance|null }.
  const guardProvenanceByRequestIdRef = useRef(new Map());
  // Capture the entry URL search ONCE so internal Chat navigations (pdfViewerReturn,
  // intent cleanup, Base44 SDK routing) cannot silently change the active _s2 stage
  // or disable diagnostics mid-session.
  const entrySearchRef = useRef(
    typeof window !== 'undefined' ? window.location.search : location.search
  );
  const s2DebugEnabledRef = useRef(isS2DebugEnabledFromSearch(entrySearchRef.current));
  const s2V8TraceCollectorRef = useRef(
    createS2V8TraceCollector({ enabled: s2DebugEnabledRef.current })
  );
  const [s2DebugActiveStage, setS2DebugActiveStage] = useState('idle');

  // ─── V2 Chat Orchestrator ──────────────────────────────────────────────────
  // Evaluate the flag once at mount; frozen for the lifetime of this Chat instance.
  // Flag false preserves exact Phase 0 legacy behavior.
  const chatOrchestratorV2EnabledRef = useRef(isChatOrchestratorV2Enabled());
  // Production-safe FIFO for rapid follow-ups while the legacy single-flight
  // path remains active. Each draft is captured before React can overwrite it.
  const legacyRapidQueueRef = useRef([]);
  // The loading failsafe must not release FIFO while persistence is in flight.
  const legacyMessagePersistencePendingRef = useRef(false);
  const legacyAwaitingReplyRef = useRef(false);
  const [legacyReplyReleaseVersion, setLegacyReplyReleaseVersion] = useState(0);
  const releaseLegacyReply = () => {
    if (!legacyAwaitingReplyRef.current) return;
    legacyAwaitingReplyRef.current = false;
    setLegacyReplyReleaseVersion((version) => version + 1);
  };
  const responsePolicyEnforcementEnabledRef = useRef(isChatOrchestratorV2Enabled('RESPONSE_POLICY_ENFORCEMENT_ENABLED'));
  // Guard Isolation Audit — dedup guard polling mode (ENFORCE / SHADOW / OFF).
  // Frozen at component mount; OFF is the false-default (legacy behavior preserved).
  const dedupGuardPollingModeRef = useRef(getDedupGuardPollingMode());
  // Guard Isolation Audit Phase 1 — formulation + grounding guard modes.
  // Frozen at component mount; ENFORCE is the false-default (behavior-preserving).
  // Selectable via ?_s2=FORMULATION_GUARD_SHADOW / FORMULATION_GUARD_OFF
  // and ?_s2=GROUNDING_GUARD_SHADOW / GROUNDING_GUARD_OFF on preview/staging hosts.
  const formulationGuardModeRef = useRef(getFormulationGuardMode());
  const groundingGuardModeRef = useRef(getGroundingGuardMode());
  // The coordinator is created once and reset when the conversation changes.
  const chatCoordinatorV2Ref = useRef(createChatOrchestratorV2());
  // Tracks the previous currentConversationId so the conversation-change effect can
  // distinguish a first-time ID assignment (null → id, new conversation created during send)
  // from a user-initiated conversation switch (id → id).  resetForConversationChange must
  // only be called on a switch; calling it during a new-conversation creation nukes the
  // _activeTurn that registerSend just created, which causes the V2 poll path to fail.
  const prevConversationIdForV2ResetRef = useRef(null);

  // Phase 0.2A — Session-local therapist wiring controller.
  // Initialized once at mount with the build-time fallback wiring.
  // Accepts a runtime authority decision before the first session-start send;
  // locks the effective wiring on first lockAndConsume() call.
  // A new Chat mount (browser reload) creates a fresh controller.
  const sessionWiringControllerRef = useRef(createTherapistSessionWiringController(ACTIVE_CBT_THERAPIST_WIRING));
  const contextComposerSessionSelectionRef = useRef(createContextComposerV2SessionSelectionController());
  // Phase 0.2 — stores the fetched runtime snapshot so it can be threaded to
  // session-start and summarization call sites without re-fetching.
  const runtimeSnapshotRef = useRef(null);

  const buildTurnScopedResponsePolicy = ({ policy, conversationId, clientRequestId = null, generationIdentity = null, status = 'pending' } = {}) => {
    if (!policy || typeof policy !== 'object') return null;
    return {
      policy_version: typeof policy.policy_version === 'string' ? policy.policy_version : 'response_policy_v1',
      policy_available: policy.policy_available === true,
      action_permitted: policy.action_permitted === true,
      intervention_mode: typeof policy.intervention_mode === 'string' ? policy.intervention_mode : 'stabilisation',
      safety_override_required: policy.safety_override_required === true,
      reason_codes: Array.isArray(policy.reason_codes) ? policy.reason_codes.slice(0, 6) : [],
      conversation_id: conversationId || currentConversationId || null,
      client_request_id: clientRequestId,
      generation_identity: generationIdentity,
      status,
    };
  };

  const captureCurrentTurnResponsePolicy = ({ policy, conversationId, clientRequestId = null, generationIdentity = null, status = 'pending' } = {}) => {
    const scoped = buildTurnScopedResponsePolicy({ policy, conversationId, clientRequestId, generationIdentity, status });
    currentTurnResponsePolicyRef.current = scoped;
    legacyGenerationPolicyRef.current = scoped;
    if (clientRequestId && chatOrchestratorV2EnabledRef.current) {
      chatCoordinatorV2Ref.current.attachResponsePolicy(clientRequestId, scoped);
    }
    return scoped;
  };

  const emitTherapeuticFormsSessionStartDiagnostic = (conversationId) => {
    const { policyVersion, diagnostics } = getTherapeuticFormsPolicyPayload({
      sessionLanguage: sessionLanguageRef.current,
    });
    if (conversationId) {
      formsPolicyVersionCacheRef.current.set(conversationId, policyVersion);
    }
    logTherapeuticFormsPolicyDiagnostic('session-start', {
      ...diagnostics,
      conversationId: conversationId || null,
      injected: true,
      wasExistingConversation: false,
    });
  };

  const refreshTherapistRuntimeFlagTransportDiagnostic = useCallback((sessionId = null) => {
    const snapshot = runtimeSnapshotRef.current;
    const predictedWiring = snapshot?.flags
      ? predictTherapistWiringFromRuntimeFlags(snapshot.flags)
      : ACTIVE_CBT_THERAPIST_WIRING;
    const controllerFields = sessionWiringControllerRef.current.getDiagnosticFields();
    const sessionSelection = contextComposerSessionSelectionRef.current.getSelection(
      sessionId || currentConversationIdRef.current
    );
    const diagnostic = buildTherapistRuntimeFlagTransportDiagnostic({
      snapshot,
      predictedTherapistWiring: _therapistWiringCanonicalName(predictedWiring),
      currentActiveTherapistWiring: _therapistWiringCanonicalName(
        sessionWiringControllerRef.current.getEffectiveWiring()
      ),
      appliedToActiveWiring: controllerFields.applied_to_active_wiring,
      activationReason: controllerFields.activation_reason,
      selectionLocked: controllerFields.selection_locked,
      contextComposerV2Effective: sessionSelection?.context_composer_v2_effective ?? null,
      contextComposerV2SelectionLocked: sessionSelection?.context_composer_v2_selection_locked === true,
      contextComposerV2SelectionReason: sessionSelection?.context_composer_v2_selection_reason ?? null,
    });

    if (s2DebugEnabledRef.current) {
      window.__THERAPIST_RUNTIME_FLAG_TRANSPORT__ = diagnostic;
    }
  }, []);

  const lockContextComposerV2SelectionForSession = useCallback((sessionId, wiring) => {
    const selection = contextComposerSessionSelectionRef.current.lockAndGet({
      sessionId,
      wiring,
      snapshot: runtimeSnapshotRef.current,
    });
    refreshTherapistRuntimeFlagTransportDiagnostic(sessionId);
    return selection;
  }, [refreshTherapistRuntimeFlagTransportDiagnostic]);

  // Mount-only: expose the trace collector and clean up only when Chat unmounts.
  // Do NOT depend on location.search — internal Chat navigations must not recreate
  // or destroy the collector; the entry-URL debug flag is the authoritative source.
  // window.__S2_V8_TRACE__ and window.copyS2V8Trace are deleted only on unmount
  // (or when debug was never enabled on entry).
  useEffect(() => {
    s2V8TraceCollectorRef.current.expose(window);
    return () => {
      delete window.__S2_V8_TRACE__;
      delete window.copyS2V8Trace;
    };
  }, []); // intentional empty deps — mount/unmount only

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const snapshot = await fetchTherapistRuntimeFlagSnapshot();
      if (cancelled) return;

      // Phase 0.2A — Evaluate runtime authority via the pure decision API.
      // If THERAPIST_RUNTIME_APPLY_ENABLED is true in the snapshot, the canonical
      // resolver is invoked over snapshot.flags and the decision is offered to the
      // session wiring controller.  The controller rejects late arrivals (after lock).
      const decision = resolveTherapistRuntimeActivation({
        snapshot,
        fallbackWiring: ACTIVE_CBT_THERAPIST_WIRING,
        hostname: window.location?.hostname ?? '',
      });
      sessionWiringControllerRef.current.tryApply(decision);

      // Phase 0.2 — Store the snapshot for non-routing flag resolution
      // (summarization gate and context composer choice at session-start).
      runtimeSnapshotRef.current = snapshot;

      refreshTherapistRuntimeFlagTransportDiagnostic(currentConversationIdRef.current || null);
    })();

    return () => {
      cancelled = true;
      delete window.__THERAPIST_RUNTIME_FLAG_TRANSPORT__;
    };
  }, [refreshTherapistRuntimeFlagTransportDiagnostic]);

  useEffect(() => {
    refreshTherapistRuntimeFlagTransportDiagnostic(currentConversationId || null);
  }, [currentConversationId, refreshTherapistRuntimeFlagTransportDiagnostic]);

  // Reset visible window when conversation changes
  useEffect(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setVisibleCount(50);
    setVariantProfileBlocked(false); // MF-7: reset block state whenever conversation switches
    setAudioDraftStatus('idle');
    setAudioDraftFile(null);
    setAudioDraftTranscript('');
    speechTranscriptRef.current = '';
    audioDraftLanguageRef.current = '';
    setIsTranscribingAudio(false);
    pendingFormulationCorrectionRef.current = null;
    pendingGroundingCorrectionRef.current = null;
    pendingInternalCorrectionRef.current = null;
    pollingFinalityStateRef.current = {
      assistantKey: null,
      content: null,
      stableCount: 0,
    };
    setAudioDraftUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    // V2 coordinator: reset on conversation switch so that historical messages
    // from the previous conversation are never treated as active turns.
    // Skip the reset when currentConversationId is being set for the first time
    // (prevId was null) — that case is a new-conversation creation mid-send, not a
    // switch, and calling resetForConversationChange at that moment would clear the
    // _activeTurn that registerSend just created, breaking the V2 poll path.
    if (chatOrchestratorV2EnabledRef.current) {
      const prevId = prevConversationIdForV2ResetRef.current;
      if (prevId !== null) {
        chatCoordinatorV2Ref.current.resetForConversationChange();
      }
    }
    prevConversationIdForV2ResetRef.current = currentConversationId;
    // Guard Isolation Audit — clear the composite provenance store on every
    // conversation switch so that evidence from a previous conversation can never
    // be augmented with lifecycle events from the new conversation.
    guardProvenanceByRequestIdRef.current.clear();
  }, [currentConversationId]);

  useEffect(() => {
    audioDraftUrlRef.current = audioDraftUrl;
  }, [audioDraftUrl]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioDraftUrlRef.current) {
        URL.revokeObjectURL(audioDraftUrlRef.current);
      }
    };
  }, []);

  // Load more messages when user scrolls to top
  const handleMessagesScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop < 80 && visibleCount < messages.length) {
      const prevScrollHeight = el.scrollHeight;
      setVisibleCount((prev) => Math.min(prev + 30, messages.length));
      // Preserve scroll position after prepending older messages
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Crisis hard-stops render above the conversation. Move the viewport and
  // keyboard/screen-reader focus to the emergency resources immediately.
  useEffect(() => {
    if (!showRiskPanel) return undefined;
    riskPanelRef.current?.focus({ preventScroll: true });
    const frameId = requestAnimationFrame(() => {
      riskPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      riskPanelRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frameId);
  }, [showRiskPanel, currentConversationId, messages.length]);

  // Emit mandatory one-line stability proof after each send cycle
  const emitStabilitySummary = () => {
    const counters = instrumentationRef.current;
    console.log(
      `FINAL STABILITY SUMMARY | send=${counters.SEND_COUNT} | ` +
      `parse_failed=${parseCounters.PARSE_FAILED} | ` +
      `dup_occurred=${counters.DUPLICATE_OCCURRED} | ` +
      `placeholder_became_msg=${counters.PLACEHOLDER_BECAME_MESSAGE} | ` +
      `thinking_over_10s=${counters.THINKING_OVER_10S}`
    );
  };

  // Print final stability report
  const printFinalStabilityReport = () => {
    const counters = instrumentationRef.current;
    const parseErrors = parseCounters.PARSE_FAILED;
    const duplicates = counters.DUPLICATE_OCCURRED;
    const placeholderIssues = counters.PLACEHOLDER_BECAME_MESSAGE;
    const thinkingIssues = counters.THINKING_OVER_10S;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('[CHAT STABILITY REPORT]');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Web sends: ${counters.WEB_SENDS_PASS}/30 ${counters.WEB_SENDS_PASS >= 30 ? 'PASS' : 'FAIL'}`);
    console.log(`Mobile sends: ${counters.MOBILE_SENDS_PASS}/15 ${counters.MOBILE_SENDS_PASS >= 15 ? 'PASS' : 'FAIL'}`);
    console.log(`UI flashes detected: ${counters.UI_FLASHES_DETECTED === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Parse errors: ${parseErrors === 0 ? 'PASS' : 'FAIL'} (${parseErrors})`);
    console.log(`Duplicates occurred: ${duplicates === 0 ? 'PASS' : 'FAIL'} (${duplicates})`);
    console.log(`Placeholder became message: ${placeholderIssues === 0 ? 'PASS' : 'FAIL'} (${placeholderIssues})`);
    console.log(`Thinking >10s: ${thinkingIssues === 0 ? 'PASS' : 'FAIL'} (${thinkingIssues})`);
    console.log('───────────────────────────────────────────────────');
    console.log('Summary counters:');
    console.log(`  PARSE_ATTEMPTS: ${parseCounters.PARSE_ATTEMPTS}`);
    console.log(`  PARSE_SKIPPED_NOT_JSON: ${parseCounters.PARSE_SKIPPED_NOT_JSON}`);
    console.log(`  SANITIZE_EXTRACT_OK: ${parseCounters.SANITIZE_EXTRACT_OK}`);
    console.log(`  HARD_GATE_BLOCKED_OBJECT: ${counters.HARD_GATE_BLOCKED_OBJECT}`);
    console.log(`  HARD_GATE_BLOCKED_JSON_STRING: ${counters.HARD_GATE_BLOCKED_JSON_STRING}`);
    console.log(`  HARD_GATE_FALSE_POSITIVE_PREVENTED: ${counters.HARD_GATE_FALSE_POSITIVE_PREVENTED}`);
    console.log(`  REFETCH_TRIGGERED: ${counters.REFETCH_TRIGGERED}`);
    console.log(`  DUPLICATE_BLOCKED: ${counters.DUPLICATE_BLOCKED}`);
    console.log('═══════════════════════════════════════════════════\n');
  };

  // V8-K: Keep isLoadingRef in sync so subscription closures can safely read it.
  // The subscription effect runs once per conversationId; closing over `isLoading`
  // directly would capture a stale false and never see subsequent true values.
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setResponseWaitSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setResponseWaitSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (deliveryStatus !== 'sent') return undefined;
    const timer = setTimeout(() => setDeliveryStatus('idle'), 4000);
    return () => clearTimeout(timer);
  }, [deliveryStatus]);

  // CRITICAL: HARD RENDER GATE - validate message is 100% render-safe (NO FALSE POSITIVES)
  const isMessageRenderSafe = (msg) => {
    if (!msg || !msg.role) {
      return false;
    }

    const hasAttachment = hasUserAttachment(msg);
    if (!msg.content && !hasAttachment) {
      return false;
    }

    // Backward compatibility: allow historical user attachment messages with
    // null/legacy non-string content to render via attachment surfaces.
    if (typeof msg.content !== 'string') {
      if (hasAttachment) {
        return true;
      }
      console.error('[HARD GATE] ⛔ Object blocked');
      instrumentationRef.current.HARD_GATE_BLOCKED_OBJECT++;
      return false;
    }

    const content = msg.content;
    const trimmed = content.trim();

    // Block placeholder/thinking messages
    if ((content.toLowerCase().includes('thinking') || content === '...') && content.length < 20) {
      instrumentationRef.current.PLACEHOLDER_BECAME_MESSAGE++;
      return false;
    }

    // Block ONLY if truly JSON-shaped (not just containing keywords)
    const isJSONShaped = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```json');

    if (isJSONShaped) {
      // This is actual JSON structure - block it
      console.error('[HARD GATE] ⛔ JSON structure blocked');
      instrumentationRef.current.HARD_GATE_BLOCKED_JSON_STRING++;
      return false;
    }

    // Plain text that just contains keywords like "assistant_message" is ALLOWED
    // This prevents false positives on Hebrew/English text
    if (trimmed.includes('"assistant_message"') && !isJSONShaped) {
      instrumentationRef.current.HARD_GATE_FALSE_POSITIVE_PREVENTED++;
    }

    // Block suspiciously short for assistant
    if (msg.role === 'assistant' && trimmed.length < 3) {
      return false;
    }

    return true;
  };

  // CRITICAL: Deduplicate using stable message IDs (no content hashing)
  const deduplicateMessages = (newMessages) => {
    const {
      deduplicated,
      duplicateKeys,
      duplicatesBlocked,
      nextTurnId,
    } = deduplicateMessagesByLifecycleKeys(newMessages, {
      startingTurnId: currentTurnIdRef.current,
    });

    currentTurnIdRef.current = nextTurnId;

    if (duplicatesBlocked > 0) {
      duplicateKeys.forEach((msgKey) => {
        console.warn('[Dedup] BLOCKED duplicate:', msgKey);
        instrumentationRef.current.DUPLICATE_BLOCKED++;
      });
      console.log(`[Dedup] ✅ Duplicates blocked: ${duplicatesBlocked}`);
    }

    return deduplicated;
  };

  // CRITICAL: Pre-validate + sanitize messages before allowing state update
  const validateAndSanitizeMessages = (msgs) => {
    const validated = msgs.filter(isMessageRenderSafe);

    if (validated.length < msgs.length) {
      console.log(`[Validation] ✅ BLOCKED ${msgs.length - validated.length} unsafe messages`);
    }

    return deduplicateMessages(validated);
  };

  const isS2DebugEnabled = () => {
    return s2DebugEnabledRef.current === true;
  };

  const logS2DebugLifecycle = (fields) => {
    if (!isS2DebugEnabled()) return;
    const payload = buildS2DebugLifecycleDiagnostic(fields);
    console.log('[S2Debug] chat-runtime-lifecycle', payload);
    if (typeof window !== 'undefined') {
      if (!Array.isArray(window.__S2_DEBUG_LIFECYCLE_LOGS__)) {
        window.__S2_DEBUG_LIFECYCLE_LOGS__ = [];
      }
      window.__S2_DEBUG_LIFECYCLE_LOGS__.push(payload);
    }
  };

  /**
   * Guard Isolation Audit Phase 1 — emits complete guard provenance records
   * augmented with lifecycle outcome fields (safe_update_accepted,
   * visible_commit_completed, response_correlated).
   *
   * Call after safeUpdateMessages and reconcileSnapshot(visible_commit) to
   * connect the guard decision chain to the delivery lifecycle.
   *
   * No-op when _s2debug=true is not present in the URL.
   *
   * @param {object} lifecycle
   * @param {boolean|null} lifecycle.responseCorrelated
   * @param {boolean|null} lifecycle.safeUpdateAccepted
   * @param {boolean|null} lifecycle.visibleCommitCompleted
   * @param {string|null}  [lifecycle.deliverySource]
   */
  const emitAugmentedGuardProvenance = (lifecycle, clientRequestId) => {
    if (!isS2DebugEnabled()) return;
    // The provenance store is keyed by composite key (client_request_id + assistant_id +
    // user_id + guard_name).  Lifecycle augmentation applies to all records whose
    // key begins with the active client_request_id prefix, which identifies every guard
    // evaluation performed for this specific request — regardless of which assistant
    // candidate produced each record.
    const _reqIdSegment = typeof clientRequestId === 'string' && clientRequestId
      ? clientRequestId
      : '__no_request_id__';
    const _prefix = _reqIdSegment + '\x00';
    const _matching = [];
    for (const [k, v] of guardProvenanceByRequestIdRef.current.entries()) {
      if (k.startsWith(_prefix)) _matching.push(v);
    }
    if (_matching.length === 0) return;
    for (const _stored of _matching) {
      const _augmented = augmentProvenanceWithLifecycle(_stored, lifecycle);
      const _label = _stored.guard_name?.includes('Grounding') ? 'grounding' : 'formulation';
      console.log(`[S2Debug][GuardProvenance][augmented] ${_label}`, _augmented);
      if (typeof window !== 'undefined') {
        if (!Array.isArray(window.__S2_GUARD_PROVENANCE_AUGMENTED__)) {
          window.__S2_GUARD_PROVENANCE_AUGMENTED__ = [];
        }
        window.__S2_GUARD_PROVENANCE_AUGMENTED__.push(_augmented);
      }
    }
  };

  const updatePendingInternalCorrection = (pendingFormulationCorrection, pendingGroundingCorrection) => {
    const scopeKey = currentConversationId || null;
    const nextIntent = pendingGroundingCorrection ?
      createInternalCorrectionIntent({
        correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
        canonicalPreviousResponseAvailable: true,
        instructionChannel: INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY,
        consumed: false,
        conversationScopeKey: scopeKey,
      }) :
      pendingFormulationCorrection ?
        createInternalCorrectionIntent({
          correctionType: INTERNAL_CORRECTION_TYPES.FORMULATION,
          canonicalPreviousResponseAvailable: true,
          instructionChannel: INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY,
          consumed: false,
          conversationScopeKey: scopeKey,
        }) :
        null;
    pendingInternalCorrectionRef.current = nextIntent;
    if (isS2DebugEnabled()) {
      logS2DebugLifecycle(buildInternalCorrectionDiagnostic(nextIntent, {
        conversationScopeMatch: internalCorrectionScopeMatches(nextIntent, currentConversationId),
      }));
    }
  };

  const toBoundedReasonCodes = (value) =>
  Array.isArray(value) ?
  value.filter((code) => typeof code === 'string').slice(0, 8) :
  [];

  const getConversationGuardMemory = (conversationId) => {
    if (!conversationId) return null;
    const scoped = guardedAssistantMemoryByConversationRef.current;
    if (!scoped.has(conversationId)) {
      scoped.set(conversationId, new Map());
    }
    return scoped.get(conversationId);
  };

  const isExplicitlyFinalAssistantMessage = (assistantMsg) => {
    const statusValue = typeof assistantMsg?.status === 'string'
      ? assistantMsg.status.trim().toLowerCase()
      : '';
    const metadataStatusValue = typeof assistantMsg?.metadata?.status === 'string'
      ? assistantMsg.metadata.status.trim().toLowerCase()
      : '';
    const finalStatuses = new Set(['done', 'completed', 'complete', 'final', 'finished']);
    if (statusValue && finalStatuses.has(statusValue)) return true;
    if (metadataStatusValue && finalStatuses.has(metadataStatusValue)) return true;
    if (assistantMsg?.metadata?.is_final === true) return true;
    if (assistantMsg?.metadata?.final === true) return true;
    if (assistantMsg?.metadata?.completed === true) return true;
    return false;
  };

  const evaluatePollingAssistantFinality = (msgs) => {
    const result = evaluateAssistantReplyFinality(
      msgs,
      pollingFinalityStateRef.current,
      {
        getAssistantKey: getAssistantIdentityKey,
        isExplicitlyFinal: isExplicitlyFinalAssistantMessage,
      },
    );
    pollingFinalityStateRef.current = result.nextState;
    return result.finality;
  };

  const buildAssistantLookupByIdentity = (msgs) => {
    const map = new Map();
    (Array.isArray(msgs) ? msgs : []).forEach((msg, index) => {
      if (!msg || msg.role !== 'assistant') return;
      const key = getAssistantIdentityKey(msg, index);
      if (!key) return;
      map.set(key, msg);
    });
    return map;
  };

  const buildAssistantContentMapByIdentity = (msgs) => {
    const map = new Map();
    (Array.isArray(msgs) ? msgs : []).forEach((msg, index) => {
      if (!msg || msg.role !== 'assistant') return;
      const key = getAssistantIdentityKey(msg, index);
      if (!key) return;
      map.set(key, typeof msg.content === 'string' ? msg.content : '');
    });
    return map;
  };

  const hasAssistantSnapshotContentChange = (prevMessages, nextMessages) => {
    const prevMap = buildAssistantContentMapByIdentity(prevMessages);
    const nextMap = buildAssistantContentMapByIdentity(nextMessages);
    if (prevMap.size !== nextMap.size) return true;
    for (const [key, content] of prevMap.entries()) {
      if (!nextMap.has(key)) return true;
      if (nextMap.get(key) !== content) return true;
    }
    return false;
  };

  const hasVisibleAssistantMutation = (prevMessages, nextMessages) => {
    const prevMap = buildAssistantContentMapByIdentity(prevMessages);
    if (prevMap.size === 0) return false;
    const nextMap = buildAssistantContentMapByIdentity(nextMessages);
    for (const [key, prevContent] of prevMap.entries()) {
      if (!nextMap.has(key)) continue;
      if (nextMap.get(key) !== prevContent) return true;
    }
    return false;
  };

  const getLatestAssistantDebugInfo = (msgs) => {
    const assistantEntries = (Array.isArray(msgs) ? msgs : [])
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg && msg.role === 'assistant');
    const latest = assistantEntries.length > 0 ? assistantEntries[assistantEntries.length - 1] : null;
    if (!latest) {
      return {
        assistantMessageStableId: null,
        rawArrayIndex: null,
        guardMode: null,
        guardEvaluationPass: null,
        formulationGuardReplaced: false,
        reasonCodes: [],
      };
    }
    const latestMsg = latest.msg;
    const replaced = latestMsg.metadata?.formulation_guard_replaced === true;
    const groundingReplaced = latestMsg.metadata?.current_turn_grounding_guard_replaced === true;
    const reasonCodes = toBoundedReasonCodes(latestMsg.metadata?.formulation_guard_reason_codes);
    const groundingReasonCodes = toBoundedReasonCodes(
      latestMsg.metadata?.current_turn_grounding_guard_reason_codes
    );
    const guardMode = latestMsg.__guardMode ?? null;
    const guardEvaluationPass = guardMode ? !replaced : null;
    return {
      assistantMessageStableId: latestMsg.id || getAssistantIdentityKey(latestMsg, latest.index),
      rawArrayIndex: Number.isInteger(latestMsg.__rawIndex) ? latestMsg.__rawIndex : null,
      guardMode,
      guardEvaluationPass,
      formulationGuardReplaced: replaced,
      groundingGuardReplaced: groundingReplaced,
      reasonCodes,
      groundingReasonCodes,
    };
  };

  const getAssistantContentSummary = (msg) => {
    if (!msg || msg.role !== 'assistant') return { length: 0, hash: null };
    return summarizeText(typeof msg.content === 'string' ? msg.content : '');
  };

  const evaluateAssistantSnapshotFinality = (msgs, source, explicitPollFinality = null) => {
    if (explicitPollFinality && typeof explicitPollFinality.isFinal === 'boolean') {
      return explicitPollFinality;
    }
    const latestAssistantEntry = selectLatestAssistantResponse(msgs);
    if (!latestAssistantEntry) {
      return { isFinal: true, reason: 'no_assistant_in_snapshot' };
    }
    const explicitFinal = isExplicitlyFinalAssistantMessage(latestAssistantEntry.msg);
    if (explicitFinal) {
      return { isFinal: true, reason: 'explicit_final_status' };
    }
    return {
      isFinal: false,
      reason: `non_final_${normalizeTraceSource(source) || 'unknown'}_snapshot`,
    };
  };

  const isNonFinalAssistantPopulationAllowed = (source, previousMessages) => {
    const normalizedSource = normalizeTraceSource(source);
    if (normalizedSource !== 'hydration') return false;
    const hadVisibleAssistant = (Array.isArray(previousMessages) ? previousMessages : [])
      .some((msg) => msg && msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim().length > 0);
    return !hadVisibleAssistant;
  };

  const applyAssistantFeedbackFinalityMetadata = (msgs, decisionIsFinal) => (
    (Array.isArray(msgs) ? msgs : []).map((msg) => {
      if (!msg || msg.role !== 'assistant') return msg;
      return {
        ...msg,
        metadata: {
          ...(msg.metadata || {}),
          feedback_finality_verified: decisionIsFinal === true,
        },
      };
    })
  );

  const buildAssistantFinalitySnapshot = (assistantMsg, pollFinality = null) => {
    const status = typeof assistantMsg?.status === 'string' ? assistantMsg.status : null;
    const metadataStatus =
      typeof assistantMsg?.metadata?.status === 'string' ? assistantMsg.metadata.status : null;
    const metadataFinalFlags = {
      is_final: assistantMsg?.metadata?.is_final === true,
      final: assistantMsg?.metadata?.final === true,
      completed: assistantMsg?.metadata?.completed === true,
    };
    const explicitFinal = isExplicitlyFinalAssistantMessage(assistantMsg);
    return {
      status,
      metadataStatus,
      metadataFinalFlags,
      explicitFinal,
      decisionIsFinal: pollFinality?.isFinal ?? explicitFinal,
      decisionReason: pollFinality?.reason || (explicitFinal ? 'explicit_final_status' : 'not_final_or_unknown'),
    };
  };

  const buildSourceVisibilityCounts = (incomingMessages) => {
    const list = Array.isArray(incomingMessages) ? incomingMessages : [];
    const visibleAssistantBubbles = list.filter((msg) => msg?.role === 'assistant').length;
    const visibleFeedbackCount = visibleAssistantBubbles;
    return {
      visibleAssistantBubbles,
      visibleFeedbackCount,
    };
  };

  const recordS2V8TraceEvent = ({
    source,
    incomingMessages,
    accepted,
    rejectedReasonCode,
    snapshotSequence,
    pollFinality = null,
  }) => {
    if (!isS2DebugEnabled()) return;
    const latestAssistantEntry = selectLatestAssistantResponse(incomingMessages);
    if (!latestAssistantEntry) return;
    const latestAssistant = latestAssistantEntry.msg;
    const assistantIdentityKey = getAssistantIdentityKey(latestAssistant, latestAssistantEntry.index);
    if (!assistantIdentityKey) return;
    const sourceNormalized = normalizeTraceSource(source);
    const boundedPollFinality = sourceNormalized === 'polling' ? pollFinality : null;
    const finalizedBucket = finalizedAssistantsByConvRef.current.get(currentConversationId);
    const sourceLabelLower = String(source || '').toLowerCase();
    const finalizedByCommitPath =
      accepted === true &&
      (
        sourceNormalized === 'subscription' ||
        sourceNormalized === 'polling' ||
        sourceLabelLower.includes('visibilityrefetch') ||
        sourceLabelLower.includes('loadconversation') ||
        sourceLabelLower.includes('currentconversationhydrate')
      );
    const finalizedIdentity =
      (finalizedBucket && finalizedBucket.has(assistantIdentityKey)) || finalizedByCommitPath
        ? assistantIdentityKey
        : null;
    const pipelineDiagnostics = latestPipelineDiagnosticsRef.current;
    const pipelineForAssistant = pipelineDiagnostics?.assistantIdentity?.key === assistantIdentityKey
      ? pipelineDiagnostics
      : null;
    s2V8TraceCollectorRef.current.recordEvent({
      at: new Date().toISOString(),
      source,
      assistantIdentity: {
        id: latestAssistant.id || null,
        rawIndex: Number.isInteger(latestAssistant.__rawIndex) ? latestAssistant.__rawIndex : null,
        created_at: typeof latestAssistant.created_at === 'string' ? latestAssistant.created_at : null,
        key: assistantIdentityKey,
      },
      finality: buildAssistantFinalitySnapshot(latestAssistant, boundedPollFinality),
      pipeline: pipelineForAssistant ? {
        stageTransitions: pipelineForAssistant.stageTransitions,
      } : null,
      groundingGuard: pipelineForAssistant?.groundingGuard || null,
      pendingGroundingCorrection:
        pipelineForAssistant?.pendingGroundingCorrection === true ||
        pendingGroundingCorrectionRef.current !== null,
      safeUpdate: {
        accepted,
        rejectedReasonCode: accepted ? null : rejectedReasonCode || null,
        snapshotSequence,
      },
      finalizedIdentity,
      visibleCounts: buildSourceVisibilityCounts(incomingMessages),
    });
    setS2DebugActiveStage(`${source}:${accepted ? 'accepted' : 'rejected'}`);
    s2V8TraceCollectorRef.current.expose(window);
  };

  const logS2DebugStateUpdate = ({
    source,
    incomingMessages,
    accepted,
    rejectedReasonCode = null,
    preservedExistingGuardedReplacement = false,
    snapshotSequence,
    pollFinality = null,
  }) => {
    if (!isS2DebugEnabled()) return;
    const latestAssistant = getLatestAssistantDebugInfo(incomingMessages);
    const latestAssistantEntry = selectLatestAssistantResponse(incomingMessages);
    const actionPermittedRaw =
      latestAssistantEntry?.msg?.metadata?.structured_data?.strategy_state?.action_permitted;
    const actionPermitted =
      typeof actionPermittedRaw === 'boolean' ? actionPermittedRaw : null;
    const boundedConversationId =
      typeof currentConversationId === 'string' ?
      currentConversationId.slice(0, 64) :
      null;
    const payload = {
      updateSource: source,
      conversationId: boundedConversationId,
      incomingMessageCount: Array.isArray(incomingMessages) ? incomingMessages.length : 0,
      assistantMessageStableId: latestAssistant.assistantMessageStableId,
      rawArrayIndex: latestAssistant.rawArrayIndex,
      guardMode: latestAssistant.guardMode,
      guardEvaluationPass: latestAssistant.guardEvaluationPass,
      formulation_guard_replaced: latestAssistant.formulationGuardReplaced,
      current_turn_grounding_guard_replaced: latestAssistant.groundingGuardReplaced,
      reasonCodes: latestAssistant.reasonCodes,
      groundingReasonCodes: latestAssistant.groundingReasonCodes,
      updateAccepted: accepted,
      updateRejected: !accepted,
      rejectedReasonCode,
      preservedExistingGuardedReplacement,
      subscriptionSucceededRef: subscriptionSucceededRef.current === true,
      snapshotSequence,
      action_permitted: actionPermitted,
      response_policy_enforced: latestAssistantEntry?.msg?.metadata?.response_policy_diagnostics?.policy_enforced === true,
    };
    console.log('[S2Debug] message-state-update', payload);
    recordS2V8TraceEvent({
      source,
      incomingMessages,
      accepted,
      rejectedReasonCode,
      snapshotSequence,
      pollFinality,
    });
  };

  const applyMonotonicGuardedMerge = (incomingMessages) => {
    const incoming = Array.isArray(incomingMessages) ? incomingMessages : [];
    const confirmedLookup = buildAssistantLookupByIdentity(lastConfirmedMessagesRef.current);
    const conversationGuardMemory = getConversationGuardMemory(currentConversationId);
    let preservedExistingGuardedReplacement = false;
    let preservedExistingGroundingReplacement = false;

    const merged = incoming.map((msg, index) => {
      if (!msg || msg.role !== 'assistant') return msg;
      const identityKey = getAssistantIdentityKey(msg, index);
      if (!identityKey) return msg;

      const incomingReplaced = msg.metadata?.formulation_guard_replaced === true;
      const incomingGroundingReplaced = msg.metadata?.current_turn_grounding_guard_replaced === true;
      const confirmedAssistant = confirmedLookup.get(identityKey);
      const confirmedReplaced = confirmedAssistant?.metadata?.formulation_guard_replaced === true;
      const confirmedGroundingReplaced = confirmedAssistant?.metadata?.current_turn_grounding_guard_replaced === true;
      const storedGuarded = conversationGuardMemory?.get(identityKey) || null;
      const storedReplaced = storedGuarded?.metadata?.formulation_guard_replaced === true;
      const storedGroundingReplaced = storedGuarded?.metadata?.current_turn_grounding_guard_replaced === true;
      const dominantGuarded = confirmedReplaced ?
      confirmedAssistant :
      storedReplaced ?
      storedGuarded :
      null;
      const dominantGrounded = confirmedGroundingReplaced ?
        confirmedAssistant :
        storedGroundingReplaced ?
          storedGuarded :
          null;

      if (!incomingReplaced && dominantGuarded) {
        preservedExistingGuardedReplacement = true;
        const dominantReasonCodes = toBoundedReasonCodes(dominantGuarded.metadata?.formulation_guard_reason_codes);
        return {
          ...msg,
          content: dominantGuarded.content,
          metadata: {
            ...(msg.metadata || {}),
            ...(dominantGuarded.metadata || {}),
            formulation_guard_replaced: true,
            formulation_guard_reason_codes: dominantReasonCodes,
          },
        };
      }

      if (!incomingGroundingReplaced && dominantGrounded) {
        preservedExistingGroundingReplacement = true;
        const dominantReasonCodes = toBoundedReasonCodes(
          dominantGrounded.metadata?.current_turn_grounding_guard_reason_codes
        );
        return {
          ...msg,
          content: dominantGrounded.content,
          metadata: {
            ...(msg.metadata || {}),
            ...(dominantGrounded.metadata || {}),
            current_turn_grounding_guard_replaced: true,
            current_turn_grounding_guard_reason_codes: dominantReasonCodes,
          },
        };
      }

      return msg;
    });

    if (conversationGuardMemory) {
      merged.forEach((msg, index) => {
        if (!msg || msg.role !== 'assistant') return;
        if (msg.metadata?.formulation_guard_replaced !== true) return;
        const identityKey = getAssistantIdentityKey(msg, index);
        if (!identityKey) return;
        conversationGuardMemory.set(identityKey, {
          id: msg.id || null,
          role: 'assistant',
          content: msg.content,
          created_at: msg.created_at,
          __rawIndex: msg.__rawIndex,
          __guardMode: msg.__guardMode ?? null,
          metadata: {
            ...(msg.metadata || {}),
            formulation_guard_replaced: true,
            formulation_guard_reason_codes: toBoundedReasonCodes(msg.metadata?.formulation_guard_reason_codes),
            current_turn_grounding_guard_replaced: msg.metadata?.current_turn_grounding_guard_replaced === true,
            current_turn_grounding_guard_reason_codes: toBoundedReasonCodes(
              msg.metadata?.current_turn_grounding_guard_reason_codes
            ),
          },
        });
      });
    }

    return {
      merged,
      preservedExistingGuardedReplacement:
        preservedExistingGuardedReplacement || preservedExistingGroundingReplacement,
    };
  };

  /**
   * V8-K: Records every assistant message in `msgs` as finalized for `convId`.
   *
   * Once finalized, safeUpdateMessages will refuse any incoming snapshot that
   * would mutate the content of a finalized message — preventing post-stream
   * subscription callbacks or stale polling retries from overwriting an already-
   * committed final bubble.
   *
   * This must be called after every authoritative commit path:
   *   - polling (getConversation after expected reply count is met)
   *   - visibility-refetch (page-becoming-visible fetch during loading)
   *   - load-conversation / conversation-switch (initial load from backend)
   *
   * @param {string} convId   Conversation identifier.
   * @param {Array}  msgs     The already-processed visible messages array.
   */
  const markAssistantMessagesFinalized = (convId, msgs) => {
    if (!convId || !Array.isArray(msgs)) return;
    let bucket = finalizedAssistantsByConvRef.current.get(convId);
    if (!bucket) {
      bucket = new Set();
      finalizedAssistantsByConvRef.current.set(convId, bucket);
    }
    msgs.forEach((msg, index) => {
      if (!msg || msg.role !== 'assistant') return;
      const key = getAssistantIdentityKey(msg, index);
      if (key) bucket.add(key);
    });
  };

  /**
   * Phase 6 — Centralized visible-message transformation.
   *
   * Transforms raw Base44 conversation messages into the final array that may
   * be passed to safeUpdateMessages.  All ingestion paths (hydration, switching,
   * subscription, polling, refetch, visibility-refetch) must call this helper
   * instead of calling sanitizeConversationMessages directly.
   *
   * Pipeline order:
   *   1. sanitizeConversationMessages    — strips internal blocks from user messages
   *   2. optional aligned transform      — index-preserving assistant transforms
   *                                        (e.g. validateAgentOutput in subscription)
   *   3. applyFormulationGuardToConversationMessages
   *                                     — replaces violating guarded responses with
   *                                        the deterministic fallback
   *   4. applyCurrentTurnGroundingGuardToConversationMessages
   *                                     — enforces immediate-message grounding and
   *                                        replaces unsupported inferred claims with
   *                                        a localized neutral fallback
   *   5. atomic output-shape guard       — as the final content rewrite, collapses
   *                                        chained imperatives only when the paired
   *                                        current visible user turn explicitly
   *                                        requested exactly one action/step
   *   6. null filtering                  — removes messages hidden by the sanitizer
   *
   * Also updates pendingFormulationCorrectionRef for the next outbound send.
   *
   * @param {Array<object>} rawMessages   Original Base44 messages (full content).
   * @param {string}        sessionLang   Active session locale (e.g. 'he', 'en').
   * @param {(msg: object|null, index: number) => object|null} [transformAlignedMessage]
   * @returns {Array<object>} Final guarded messages (null-free).
   */
  const buildVisibleConversationMessages = (rawMessages, sessionLang, transformAlignedMessage = null, options = {}) => {
    const currentPolicy = options?.responsePolicy || currentTurnResponsePolicyRef.current;
    const raw = Array.isArray(rawMessages) ? rawMessages : [];
    const guardModesByRawIndex = raw.map((rawMsg, rawIndex) => {
      if (!rawMsg || rawMsg.role !== 'assistant') return null;
      const precedingUser = (() => {
        for (let i = rawIndex - 1; i >= 0; i--) {
          if (raw[i] && raw[i].role === 'user' && typeof raw[i].content === 'string') return raw[i];
        }
        return null;
      })();
      return precedingUser ? classifyFormulationGuardedTurn(precedingUser.content) : null;
    });
    const sanitized = sanitizeConversationMessagesAligned(raw, sessionLang);
    const alignedProcessed = typeof transformAlignedMessage === 'function'
      ? sanitized.map((msg, index) => transformAlignedMessage(msg, index))
      : sanitized;
    const policyEnforced = alignedProcessed.map((msg) => {
      if (!msg || msg.role !== 'assistant' || !responsePolicyEnforcementEnabledRef.current) return msg;
      const scopeMatch =
        currentPolicy &&
        currentPolicy.conversation_id === currentConversationId &&
        (currentPolicy.client_request_id ? true : currentPolicy.generation_identity === legacyGenerationPolicyRef.current?.generation_identity);
      const policy = currentPolicy ? { ...currentPolicy, scope_match: scopeMatch } : null;
      const enforced = enforceResponsePolicy({
        content: msg.content,
        metadata: msg.metadata,
        policy,
        locale: sessionLang,
      });
      return {
        ...msg,
        content: enforced.content,
        metadata: {
          ...(enforced.metadata || {}),
          response_policy_diagnostics: enforced.diagnostics,
        },
      };
    });
    const withRawIndexes = policyEnforced.map((msg, rawIndex) => (
      msg ? { ...msg, __rawIndex: rawIndex } : msg
    ));
    // Guard Isolation Audit Phase 1 — mode-aware guard calls.
    // Mode is frozen at component mount via formulationGuardModeRef / groundingGuardModeRef.
    // ENFORCE (default) preserves existing behavior; SHADOW observes without replacing;
    // OFF skips the guard entirely.  No safety control is affected.
    const _fGuardMode = formulationGuardModeRef.current;
    const _gGuardMode = groundingGuardModeRef.current;
    const _auditClientRequestId = chatCoordinatorV2Ref.current?.getActiveTurn()?.client_request_id ?? null;
    const {
      messages: guarded,
      pendingCorrection,
      provenance: formulationProvenance,
    } = applyFormulationGuardWithMode(raw, withRawIndexes, {
      locale: sessionLang,
      mode: _fGuardMode,
      clientRequestId: _auditClientRequestId,
      deliverySource: options?.deliverySource ?? null,
    });
    const {
      messages: grounded,
      pendingCorrection: pendingGroundingCorrection,
      provenance: groundingProvenance,
    } = applyGroundingGuardWithMode(raw, guarded, {
      locale: sessionLang,
      mode: _gGuardMode,
      clientRequestId: _auditClientRequestId,
      deliverySource: options?.deliverySource ?? null,
    });
    pendingFormulationCorrectionRef.current = pendingCorrection;
    pendingGroundingCorrectionRef.current = pendingGroundingCorrection;
    updatePendingInternalCorrection(pendingCorrection, pendingGroundingCorrection);
    // This is deliberately the final content-rewriting stage. It runs after
    // formulation and grounding replacements so no later correction can append a
    // second command after the atomicity recount.
    const outputShaped = applyAtomicActionGuardToConversationMessages(
      sanitized,
      grounded,
      { locale: sessionLang },
    );
    const withRuntimeMetadata = outputShaped.map((msg, rawIndex) => {
      if (!msg) return null;
      const resolvedRawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : rawIndex;
      const guardMode = guardModesByRawIndex[resolvedRawIndex] || null;
      return {
        ...msg,
        __rawIndex: resolvedRawIndex,
        __guardMode: guardMode,
      };
    });
    const finalMessages = withRuntimeMetadata.filter(Boolean);
    const visibleMessages = applyLegacyVisibleAssistantNormalizationGate(
      finalMessages,
      chatOrchestratorV2EnabledRef.current
    );
    if (isS2DebugEnabled()) {
      const latestAssistant = selectLatestAssistantResponse(visibleMessages);
      const assistantRawIndex =
        latestAssistant && Number.isInteger(latestAssistant.msg.__rawIndex)
          ? latestAssistant.msg.__rawIndex
          : null;
      const rawAssistant = assistantRawIndex !== null ? raw[assistantRawIndex] : null;
      const sanitizedAssistant = assistantRawIndex !== null ? sanitized[assistantRawIndex] : null;
      const alignedAssistant = assistantRawIndex !== null ? alignedProcessed[assistantRawIndex] : null;
      const guardedAssistant = assistantRawIndex !== null ? guarded[assistantRawIndex] : null;
      const groundedAssistant = assistantRawIndex !== null ? grounded[assistantRawIndex] : null;
      const finalAssistant = latestAssistant ? latestAssistant.msg : null;
      const precedingRawUser = (() => {
        if (assistantRawIndex === null) return null;
        for (let i = assistantRawIndex - 1; i >= 0; i--) {
          if (raw[i]?.role === 'user') return raw[i];
        }
        return null;
      })();
      const groundingEvaluation = evaluateCurrentTurnGroundingContractDetailed(
        typeof guardedAssistant?.content === 'string' ? guardedAssistant.content : '',
        precedingRawUser?.content || null
      );
      const correctionBlockSanitized = wasCorrectionBlockSanitized(raw, sanitized);
      const pendingInternalCorrection = pendingInternalCorrectionRef.current;
      latestPipelineDiagnosticsRef.current = {
        assistantIdentity: finalAssistant ? {
          id: finalAssistant.id || null,
          rawIndex: assistantRawIndex,
          created_at: typeof finalAssistant.created_at === 'string' ? finalAssistant.created_at : null,
          key: getAssistantIdentityKey(finalAssistant, latestAssistant.index),
        } : null,
        stageTransitions: {
          sanitize: {
            before: getAssistantContentSummary(rawAssistant),
            after: getAssistantContentSummary(sanitizedAssistant),
          },
          alignedTransform: {
            before: getAssistantContentSummary(sanitizedAssistant),
            after: getAssistantContentSummary(alignedAssistant),
          },
          formulationGuard: {
            before: getAssistantContentSummary(alignedAssistant),
            after: getAssistantContentSummary(guardedAssistant),
          },
          groundingGuard: {
            before: getAssistantContentSummary(guardedAssistant),
            after: getAssistantContentSummary(groundedAssistant),
          },
          finalFilter: {
            before: getAssistantContentSummary(groundedAssistant),
            after: getAssistantContentSummary(finalAssistant),
          },
        },
        groundingGuard: {
          visibleUserLength: groundingEvaluation.visibleUserLength,
          visibleUserHash: groundingEvaluation.visibleUserHash || null,
          strictMode: groundingEvaluation.strictMode === true,
          sentenceIndex: groundingEvaluation.sentenceIndex,
          matchedClaimGroup: groundingEvaluation.matchedClaimGroup,
          matchedAssistantTerm: groundingEvaluation.matchedAssistantTerm,
          matchedAffirmativeUserTerm: groundingEvaluation.matchedAffirmativeUserTerm || 'none',
          reasonCodes: Array.isArray(groundingEvaluation.reasonCodes) ? groundingEvaluation.reasonCodes : [],
          replacementApplied: groundedAssistant?.metadata?.current_turn_grounding_guard_replaced === true,
          rejectedSentenceSnippet: normalizeSnippet(groundingEvaluation.rejectedSentenceSnippet, 160),
          correctionBlockDetected: groundingEvaluation.correctionBlockDetected === true,
        },
        pendingGroundingCorrection: pendingGroundingCorrection !== null,
        internalCorrectionDiagnostic: buildInternalCorrectionDiagnostic(pendingInternalCorrection, {
          conversationScopeMatch: internalCorrectionScopeMatches(pendingInternalCorrection, currentConversationId),
          historicalBlockDetected: correctionBlockSanitized,
          historicalBlockSanitized: correctionBlockSanitized,
        }),
      };
      logS2DebugLifecycle({
        delivery_source: 'pipeline',
        assistant_identity_source: finalAssistant ? getAssistantIdentitySource(finalAssistant) : null,
        correction_block_sanitized: correctionBlockSanitized,
        ...buildInternalCorrectionDiagnostic(pendingInternalCorrection, {
          conversationScopeMatch: internalCorrectionScopeMatches(pendingInternalCorrection, currentConversationId),
          historicalBlockDetected: correctionBlockSanitized,
          historicalBlockSanitized: correctionBlockSanitized,
        }),
      });
      // Guard Isolation Audit Phase 1 — emit bounded provenance for each guard.
      // No transcript text, clinical content or PII is included in these payloads.
      if (formulationProvenance) {
        console.log('[S2Debug][GuardProvenance] formulation', formulationProvenance);
        if (!Array.isArray(window.__S2_GUARD_PROVENANCE_LOGS__)) {
          window.__S2_GUARD_PROVENANCE_LOGS__ = [];
        }
        window.__S2_GUARD_PROVENANCE_LOGS__.push(formulationProvenance);
      }
      if (groundingProvenance) {
        console.log('[S2Debug][GuardProvenance] grounding', groundingProvenance);
        if (!Array.isArray(window.__S2_GUARD_PROVENANCE_LOGS__)) {
          window.__S2_GUARD_PROVENANCE_LOGS__ = [];
        }
        window.__S2_GUARD_PROVENANCE_LOGS__.push(groundingProvenance);
      }
      // Store each guard's provenance under a composite key that includes the
      // active client_request_id, the specific assistant's stable identity, the
      // paired user's stable identity, and the guard name.  This prevents any two
      // assistant candidates that share the same client_request_id (e.g. multiple
      // polling snapshots) from ever overwriting or cross-attributing each other's
      // provenance records.
      if (formulationProvenance) {
        const _fKey = buildCompositeProvenanceKey(
          _auditClientRequestId,
          formulationProvenance.assistant_id,
          formulationProvenance.user_id,
          formulationProvenance.guard_name
        );
        guardProvenanceByRequestIdRef.current.set(_fKey, formulationProvenance);
      }
      if (groundingProvenance) {
        const _gKey = buildCompositeProvenanceKey(
          _auditClientRequestId,
          groundingProvenance.assistant_id,
          groundingProvenance.user_id,
          groundingProvenance.guard_name
        );
        guardProvenanceByRequestIdRef.current.set(_gKey, groundingProvenance);
      }
      // Bounded cap: the store is finite and FIFO-evicts the oldest entry when the
      // cap is exceeded.  This prevents unbounded growth across a long conversation.
      const _PROVENANCE_STORE_CAP = 20;
      while (guardProvenanceByRequestIdRef.current.size > _PROVENANCE_STORE_CAP) {
        guardProvenanceByRequestIdRef.current.delete(
          guardProvenanceByRequestIdRef.current.keys().next().value
        );
      }
    } else {
      latestPipelineDiagnosticsRef.current = null;
    }
    return visibleMessages;
  };

  // CRITICAL: Safe state update with duplicate detection
  const safeUpdateMessages = (newMessages, source, options = {}) => {
    const snapshotSequence = ++snapshotSequenceRef.current;
    const { merged, preservedExistingGuardedReplacement } = applyMonotonicGuardedMerge(newMessages);
    const sanitized = validateAndSanitizeMessages(merged);
    const pollFinality = options?.pollFinality || null;
    const suppressFeedback = options?.suppressFeedback === true;
    const finalityDecision = evaluateAssistantSnapshotFinality(sanitized, source, pollFinality);
    instrumentationRef.current.TOTAL_MESSAGES_PROCESSED += newMessages.length;

    // Compare with last confirmed state
    if (sanitized.length < lastConfirmedMessagesRef.current.length) {
      console.log(`[${source}] ⚠️ Rejecting update - fewer messages than confirmed state`);
      logS2DebugStateUpdate({
        source,
        incomingMessages: sanitized,
        accepted: false,
        rejectedReasonCode: 'rejected_shorter_than_confirmed',
        preservedExistingGuardedReplacement,
        snapshotSequence,
        pollFinality,
      });
      return false;
    }

    const assistantContentChanged = hasAssistantSnapshotContentChange(
      lastConfirmedMessagesRef.current,
      sanitized
    );
    const visibleAssistantMutation = hasVisibleAssistantMutation(
      lastConfirmedMessagesRef.current,
      sanitized
    );
    if (visibleAssistantMutation) {
      console.warn(`[${source}] ⛔ IMMUTABLE ASSISTANT CONTENT: blocked mutation of visible assistant prose`);
      logS2DebugStateUpdate({
      source,
      incomingMessages: sanitized,
      accepted: false,
      rejectedReasonCode: 'rejected_visible_assistant_immutable',
      preservedExistingGuardedReplacement,
      snapshotSequence,
      pollFinality,
      });
      return false;
    }

    if (assistantContentChanged && finalityDecision.isFinal !== true) {
      const allowNonFinalPopulation = isNonFinalAssistantPopulationAllowed(
      source,
      lastConfirmedMessagesRef.current
      );
      if (!allowNonFinalPopulation) {
      console.warn(`[${source}] ⛔ NON-FINAL ASSISTANT SNAPSHOT: blocked assistant content change`);
      logS2DebugStateUpdate({
        source,
        incomingMessages: sanitized,
        accepted: false,
        rejectedReasonCode: finalityDecision.reason || 'rejected_non_final_assistant_change',
        preservedExistingGuardedReplacement,
        snapshotSequence,
        pollFinality: finalityDecision,
      });
      return false;
      }
    }

    // CRITICAL: Check for duplicate assistant messages in new batch
    const assistantMessages = sanitized.filter((m) => m.role === 'assistant');
    const assistantContents = assistantMessages.map((m) => String(m.content).substring(0, 100));
    const uniqueContents = new Set(assistantContents);

    if (assistantContents.length !== uniqueContents.size) {
      console.error(`[${source}] ✗ DUPLICATE OCCURRED: ${assistantContents.length - uniqueContents.size} duplicate assistant messages found`);
      instrumentationRef.current.DUPLICATE_OCCURRED += assistantContents.length - uniqueContents.size;

      // Further deduplicate by content
      const seenContents = new Set();
      const fullyDeduplicated = sanitized.filter((msg) => {
        if (msg.role !== 'assistant') return true;
        const contentKey = String(msg.content).substring(0, 100);
        if (seenContents.has(contentKey)) {
          console.warn('[Dedup] Removing duplicate assistant message');
          return false;
        }
        seenContents.add(contentKey);
        return true;
      });

      // Update with fully deduplicated version
      const finalityTaggedMessages = applyAssistantFeedbackFinalityMetadata(
        fullyDeduplicated,
        finalityDecision.isFinal === true && !suppressFeedback
      );
      lastConfirmedMessagesRef.current = finalityTaggedMessages;
      setMessages(finalityTaggedMessages);
      instrumentationRef.current.SAFE_UPDATES++;
      logS2DebugStateUpdate({
        source,
        incomingMessages: finalityTaggedMessages,
        accepted: true,
        preservedExistingGuardedReplacement,
        snapshotSequence,
        pollFinality: finalityDecision,
      });
      return true;
    }

    // Check if this is actually new content
    const lastConfirmedAssistant = lastConfirmedMessagesRef.current.filter((m) => m.role === 'assistant').pop();
    const newAssistant = sanitized.filter((m) => m.role === 'assistant').pop();

    if (lastConfirmedAssistant && newAssistant) {
      const oldContent = String(lastConfirmedAssistant.content);
      const newContent = String(newAssistant.content);

      if (oldContent === newContent && sanitized.length === lastConfirmedMessagesRef.current.length) {
        console.log(`[${source}] ⚠️ Rejecting update - no new content detected`);
        logS2DebugStateUpdate({
          source,
          incomingMessages: sanitized,
          accepted: false,
          rejectedReasonCode: 'rejected_no_new_content',
          preservedExistingGuardedReplacement,
          snapshotSequence,
          pollFinality: finalityDecision,
        });
        return false;
      }

      // CONTENT REGRESSION GUARD: reject any update where the new assistant
      // message is materially shorter than the already-confirmed one.
      // This prevents polling snapshots (which may be a stored/processed version
      // shorter than what was streamed) from overwriting the full response.
      //
      // CRITICAL: Only apply this guard when the incoming batch has the SAME
      // message count as the confirmed baseline AND the message IDs agree (when
      // available).  If the new batch contains MORE messages, the last assistant
      // entry is a genuinely new reply from a different turn — not a shorter
      // overwrite of the previous reply.  Applying the guard in that case would
      // silently block the new reply and cause the stuck-response bug (reply
      // stored in the backend but never shown live without exit/re-entry).
      const isSameMessageCount = sanitized.length === lastConfirmedMessagesRef.current.length;
      // When either message lacks an id we conservatively assume they could be
      // the same message (fail-closed: keep protection when uncertain).  The
      // primary gate is isSameMessageCount — a growing batch always bypasses
      // the guard regardless of ids.
      const isSameMessageId =
      !lastConfirmedAssistant.id || !newAssistant.id ||
      lastConfirmedAssistant.id === newAssistant.id;
      const isSameTurn = isSameMessageCount && isSameMessageId;
      const oldLen = oldContent.length;
      const newLen = newContent.length;
      if (isSameTurn && oldLen > 80 && newLen < oldLen * 0.75) {
        console.warn(`[${source}] ⚠️ CONTENT REGRESSION BLOCKED: new(${newLen}) < old(${oldLen})*0.75 — rejecting`);
        logS2DebugStateUpdate({
          source,
          incomingMessages: sanitized,
          accepted: false,
          rejectedReasonCode: 'rejected_content_regression_guard',
          preservedExistingGuardedReplacement,
          snapshotSequence,
          pollFinality: finalityDecision,
        });
        return false;
      }
    }

    // V8-K: Immutability guard — once an assistant message has been atomically
    // committed by the authoritative polling / visibility-refetch / load path its
    // content must never change, regardless of whether the incoming snapshot is
    // longer (late streaming chunk) or shorter (stale refetch).  Only triggers
    // when the identity key matches AND the content differs.
    const finalizedBucket = finalizedAssistantsByConvRef.current.get(currentConversationId);
    if (finalizedBucket && finalizedBucket.size > 0) {
      const confirmedAssistants = lastConfirmedMessagesRef.current.filter(
        (m) => m && m.role === 'assistant'
      );
      const wouldModifyFinalized = sanitized.some((msg, idx) => {
        if (!msg || msg.role !== 'assistant') return false;
        const key = getAssistantIdentityKey(msg, idx);
        if (!key || !finalizedBucket.has(key)) return false;
        const confirmed = confirmedAssistants.find(
          (cm, ci) => getAssistantIdentityKey(cm, ci) === key
        );
        return confirmed ? String(msg.content) !== String(confirmed.content) : false;
      });
      if (wouldModifyFinalized) {
        console.warn(`[${source}] ⛔ IMMUTABILITY: blocked modification of finalized assistant message`);
        logS2DebugStateUpdate({
          source,
          incomingMessages: sanitized,
          accepted: false,
          rejectedReasonCode: 'rejected_immutability_guard',
          preservedExistingGuardedReplacement,
          snapshotSequence,
          pollFinality: finalityDecision,
        });
        return false;
      }
    }

    // Update is safe - commit to state
    console.log(`[${source}] ✅ SAFE UPDATE: ${sanitized.length} messages`);
    instrumentationRef.current.SAFE_UPDATES++;
    const finalityTaggedMessages = applyAssistantFeedbackFinalityMetadata(
      sanitized,
      finalityDecision.isFinal === true && !suppressFeedback
    );
    lastConfirmedMessagesRef.current = finalityTaggedMessages;
    setMessages(finalityTaggedMessages);
    logS2DebugStateUpdate({
      source,
      incomingMessages: finalityTaggedMessages,
      accepted: true,
      preservedExistingGuardedReplacement,
      snapshotSequence,
      pollFinality: finalityDecision,
    });
    return true;
  };

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  sessionStartOpenerFallbackDepsRef.current = {
    buildVisibleConversationMessages,
    safeUpdateMessages,
    setIsLoading,
    emitStabilitySummary,
    commitLocalOpener: (conversationId) => {
      if (!mountedRef.current || currentConversationIdRef.current !== conversationId) return false;
      const confirmed = Array.isArray(lastConfirmedMessagesRef.current)
        ? lastConfirmedMessagesRef.current
        : [];
      const alreadyVisible = confirmed.some((message) => (
        message?.role === 'assistant' && String(message?.content || '').trim().length > 0
      ));
      if (alreadyVisible) return false;
      const localOpener = {
        id: `local-session-opener-${conversationId}`,
        role: 'assistant',
        content: t('chat_stage.opening_preview', { lng: sessionLanguageRef.current }),
        status: 'final',
        created_date: new Date().toISOString(),
        metadata: {
          is_final: true,
          local_session_opener_fallback: true,
          feedback_finality_verified: false,
        },
      };
      return safeUpdateMessages([...confirmed, localOpener], 'SessionStartLocalFallback', {
        pollFinality: { isFinal: true, reason: 'local_session_opener_fallback' },
        suppressFeedback: true,
      });
    },
  };

  if (!sessionStartOpenerFallbackRef.current) {
    sessionStartOpenerFallbackRef.current = createSessionStartOpenerFallbackController({
      fetchConversation: (conversationId) => base44.agents.getConversation(conversationId),
      buildVisibleConversationMessages: (...args) => (
        sessionStartOpenerFallbackDepsRef.current.buildVisibleConversationMessages(...args)
      ),
      evaluatePollingAssistantFinality,
      safeUpdateMessages: (...args) => (
        sessionStartOpenerFallbackDepsRef.current.safeUpdateMessages(...args)
      ),
      getCurrentConversationId: () => currentConversationIdRef.current,
      getLastConfirmedMessages: () => lastConfirmedMessagesRef.current,
      getSessionLanguage: () => sessionLanguageRef.current,
      isMounted: () => mountedRef.current,
      setIsLoading: (value) => sessionStartOpenerFallbackDepsRef.current.setIsLoading(value),
      clearLoadingTimeout,
      emitStabilitySummary: () => sessionStartOpenerFallbackDepsRef.current.emitStabilitySummary(),
      onExhausted: ({ conversationId }) => (
        sessionStartOpenerFallbackDepsRef.current.commitLocalOpener(conversationId)
      ),
    });
  }

  useEffect(() => {
    // Emergency resources own the viewport while the hard-stop panel is open.
    // Late subscription/polling updates can replace `messages` without changing
    // its length; allowing the normal chat autoscroll here would move the
    // focused alert above the viewport after it has already been revealed.
    if (showRiskPanel) return;

    const container = document.querySelector('[data-testid="chat-messages"]');
    if (!container) {
      scrollToBottom();
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 140;

    if (isNearBottom || isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading, showRiskPanel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionStartOpenerFallbackRef.current?.stop('unmount', {
        clearLoadingTimeout: true,
      });
      mountedRef.current = false;
    };
  }, []);

  // Handle intent from URL parameters - create conversation with intent metadata
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const intentParam = urlParams.get('intent');

    // Prevent duplicate processing of the same intent
    if (intentParam && processedIntentRef.current !== intentParam) {
      processedIntentRef.current = intentParam;

      const handleIntent = async () => {
        // Debounce guard - prevent duplicate triggers
        if (inFlightIntentRef.current) {
          console.log('[Intent Guard] Already processing intent, skipping');
          return;
        }

        inFlightIntentRef.current = true;
        conversationInitializingRef.current = true;
        setIsConversationInitializing(true);
        setIsLoading(true);

        try {
          console.log(`[Intent Detected] ${intentParam}`);

          if (!currentConversationId) {
            // No active conversation - start new one with intent in metadata
            // Get safety profile from user settings or default to 'standard'
            const user = await base44.auth.me().catch(() => null);
            const safetyProfile = user?.preferences?.safety_profile || 'standard';
            // Phase 0.2A: lock and consume the effective wiring for this session.
            const effectiveWiring = sessionWiringControllerRef.current.lockAndConsume();
            const agentName = effectiveWiring.name;
            const newSessionInstanceId = createSessionInstanceId();
            if (!newSessionInstanceId) throw new Error('Unable to create a secure session identity');

            const conversation = await base44.agents.createConversation({
              agent_name: agentName,
              tool_configs: effectiveWiring.tool_configs,
              metadata: {
                name: intentParam === 'thought_work' ? 'Thought Journal Session' :
                intentParam === 'goal_work' ? 'Goal Setting Session' :
                intentParam === 'daily_checkin' ? 'Daily Check-in' :
                intentParam === 'grounding' ? 'Grounding Exercise' :
                `Session ${conversations.length + 1}`,
                description: 'CBT Therapy Session',
                intent: intentParam,
                safety_profile: safetyProfile,
                session_instance_id: newSessionInstanceId
              }
            });

            rememberConversationSessionIdentity(conversation.id, newSessionInstanceId);
            setCurrentConversationId(conversation.id);
            setMessages([]);
            clearLocalAudioDraft();
            setShowSidebar(false);
            // Lock session language at conversation start (separate from UI locale).
            sessionLanguageRef.current = i18n.language || 'en';
            refetchConversations();

            // Trigger AI to send opening message based on intent (one-time only)
            if (!sessionTriggeredRef.current.has(conversation.id)) {
              sessionTriggeredRef.current.add(conversation.id);
              {
                // Keep the localized opener preview visible while the bounded fallback polls.
                if (!loadingTimeoutRef.current) {
                  loadingTimeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                      setIsLoading(false);
                      loadingTimeoutRef.current = null;
                    }
                  }, 25000);
                }
                const sessionComposerSelection = lockContextComposerV2SelectionForSession(conversation.id, effectiveWiring);
                const sessionStartContent = await buildActionFirstDemotedSessionContentAsync(
                  effectiveWiring,
                  base44.entities,
                  base44,
                  {
                    sessionLanguage: i18n.language,
                    conversation_id: conversation.id,
                    continuation_session_id: newSessionInstanceId,
                    runtime_context_composer_v2_override: sessionComposerSelection.context_composer_v2_effective,
                    onStrategyPolicy: (policy) => { captureCurrentTurnResponsePolicy({ policy, conversationId: conversation.id, generationIdentity: `legacy-${conversation.id}` }); },
                  }
                );
                await base44.agents.addMessage(conversation, {
                  role: 'user',
                  content: addLangDirective(sessionStartContent, sessionLanguageRef.current)
                });
                // Match the regular new-session path: poll immediately if the live
                // subscription is late so the opening assistant message is visible.
                sessionStartOpenerFallbackRef.current?.start(conversation.id);
                emitTherapeuticFormsSessionStartDiagnostic(conversation.id);
              }
            }
          } else {
            // Active conversation exists - create new conversation with intent instead
            // Get safety profile from user settings or default to 'standard'
            const user = await base44.auth.me().catch(() => null);
            const safetyProfile = user?.preferences?.safety_profile || 'standard';
            // Phase 0.2A: lock and consume the effective wiring for this session.
            const effectiveWiring = sessionWiringControllerRef.current.lockAndConsume();
            const agentName = effectiveWiring.name;
            const newSessionInstanceId = createSessionInstanceId();
            if (!newSessionInstanceId) throw new Error('Unable to create a secure session identity');

            const conversation = await base44.agents.createConversation({
              agent_name: agentName,
              tool_configs: effectiveWiring.tool_configs,
              metadata: {
                name: intentParam === 'thought_work' ? 'Thought Journal Session' :
                intentParam === 'goal_work' ? 'Goal Setting Session' :
                intentParam === 'daily_checkin' ? 'Daily Check-in' :
                intentParam === 'grounding' ? 'Grounding Exercise' :
                `Session ${conversations.length + 1}`,
                description: 'CBT Therapy Session',
                intent: intentParam,
                safety_profile: safetyProfile,
                session_instance_id: newSessionInstanceId
              }
            });

            rememberConversationSessionIdentity(conversation.id, newSessionInstanceId);
            setCurrentConversationId(conversation.id);
            setMessages([]);
            clearLocalAudioDraft();
            setShowSidebar(false);
            // Lock session language at conversation start (separate from UI locale).
            sessionLanguageRef.current = i18n.language || 'en';
            refetchConversations();

            // Trigger AI to send opening message (one-time only)
            if (!sessionTriggeredRef.current.has(conversation.id)) {
              sessionTriggeredRef.current.add(conversation.id);
              {
                // Keep the localized opener preview visible while the bounded fallback polls.
                if (!loadingTimeoutRef.current) {
                  loadingTimeoutRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                      setIsLoading(false);
                      loadingTimeoutRef.current = null;
                    }
                  }, 25000);
                }
                const sessionComposerSelection = lockContextComposerV2SelectionForSession(conversation.id, effectiveWiring);
                const sessionStartContent = await buildActionFirstDemotedSessionContentAsync(
                  effectiveWiring,
                  base44.entities,
                  base44,
                  {
                    sessionLanguage: i18n.language,
                    conversation_id: conversation.id,
                    continuation_session_id: newSessionInstanceId,
                    runtime_context_composer_v2_override: sessionComposerSelection.context_composer_v2_effective,
                    onStrategyPolicy: (policy) => { captureCurrentTurnResponsePolicy({ policy, conversationId: conversation.id, generationIdentity: `legacy-${conversation.id}` }); },
                  }
                );
                await base44.agents.addMessage(conversation, {
                  role: 'user',
                  content: addLangDirective(sessionStartContent, sessionLanguageRef.current)
                });
                // Match the regular new-session path: poll immediately if the live
                // subscription is late so the opening assistant message is visible.
                sessionStartOpenerFallbackRef.current?.start(conversation.id);
                emitTherapeuticFormsSessionStartDiagnostic(conversation.id);
              }
            }
          }
        } catch (error) {
          console.error('[Intent Error]', error);
          setIsLoading(false);
          toast({
            title: t('chat.session_start.failed_title'),
            description: t('chat.session_start.failed_description'),
            variant: 'destructive',
          });
        } finally {
          inFlightIntentRef.current = false;
          conversationInitializingRef.current = false;
          setIsConversationInitializing(false);
        }
      };

      handleIntent();
    }
  }, [location.search]);

  // Handle visibility changes - force check when page becomes visible
  useEffect(() => {
    if (!currentConversationId) return;

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('[Visibility] Page now visible');

        // If we're loading, force a check for updates
        if (isLoading) {
          console.log('[Visibility] Still loading - forcing refetch');
          try {
            const conversation = await base44.agents.getConversation(currentConversationId);
            const guarded = buildVisibleConversationMessages(conversation.messages || [], sessionLanguageRef.current);
            const visibilityFinality = evaluateAssistantSnapshotFinality(guarded, 'VisibilityRefetch');
            const updated = safeUpdateMessages(guarded, 'VisibilityRefetch');
            if (updated) {
              // V8-K: finalize only when finality is verified.
              if (visibilityFinality.isFinal) {
                markAssistantMessagesFinalized(currentConversationId, guarded);
                await persistFinalizedCaseFormulationUpdates(currentConversationId, guarded);
                sessionStartOpenerFallbackRef.current?.stop('visibility_visible_commit', {
                  clearLoading: true,
                  clearLoadingTimeout: true,
                });
              }
              setIsLoading(false);
              emitStabilitySummary();
            }
          } catch (err) {
            console.error('[Visibility] Refetch failed:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle focus events
    const handleFocus = () => {
      if (isLoading && currentConversationId) {
        console.log('[Focus] Window focused while loading - checking updates');
        handleVisibilityChange();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentConversationId, isLoading, messages.length]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!currentConversationId) {
      console.log('[Subscription] No conversation ID, skipping');
      subscriptionActiveRef.current = false;
      return;
    }

    // CRITICAL: Prevent duplicate subscriptions
    if (subscriptionActiveRef.current) {
      console.log('[Subscription] ⚠️ Already subscribed, skipping duplicate');
      return;
    }

    subscriptionActiveRef.current = true;
    let responseTimeoutId = null;
    let isSubscribed = true;

    console.log('[Subscription] Creating subscription for:', currentConversationId);

    const unsubscribe = base44.agents.subscribeToConversation(
      currentConversationId,
      async (data) => {
        if (!isSubscribed || !mountedRef.current) {
          console.log('[Subscription] Ignoring update - unsubscribed or unmounted');
          return;
        }

        // Summary metadata is independent of streaming message reconciliation.
        // Keep the rendered summary current without requiring a page refresh.
        if (data && Object.prototype.hasOwnProperty.call(data, 'session_summary')) {
          queryClient.setQueryData(['currentConversation', currentConversationId], (previous) => ({
            ...(previous || { id: currentConversationId }),
            session_summary: data.session_summary,
            ...(data.suggested_exercises ? { suggested_exercises: data.suggested_exercises } : {}),
          }));
        }

        // V2 path: do NOT suppress subscription events — all delivery paths flow
        // through reconcileSnapshot() which handles dedup and stale guards.
        // Legacy path: suppress subscription events while loading (polling is authoritative).
        if (!chatOrchestratorV2EnabledRef.current && shouldSuppressSubscriptionEventWhileLoading(isLoadingRef.current, {
          hasAuthoritativePolling: Boolean(pollingIntervalRef.current),
        })) {
          logS2DebugLifecycle({
            delivery_source: 'subscription',
            active_request_count: isLoadingRef.current ? 1 : 0,
            expected_reply_count: expectedReplyCountRef.current,
            subscription_event_suppressed: true,
          });
          console.log('[Subscription] ⏸ Skipping partial streaming draft — polling is authoritative during generation');
          return;
        }

        // CRITICAL: Process updates even if page is hidden
        // Browser may pause event loop, but we still need to process when it fires
        console.log('[Subscription] ✅ DATA RECEIVED, messages:', data.messages?.length, 'hidden:', document.hidden);

        // Clear timeout immediately
        if (responseTimeoutId) {
          clearTimeout(responseTimeoutId);
          responseTimeoutId = null;
        }

        // Clear loading timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        // HARD RENDER GATE: Block unsafe messages BEFORE they reach React state
        let processedMessages = [];
        let lastStructuredData = null;

        try {
          // First pass: identify truly unsafe content (objects or JSON-shaped strings)
          const hasUnsafeContent = (data.messages || []).some((msg) => {
            if (msg.role !== 'assistant' || !msg.content) return false;
            if (typeof msg.content !== 'string') return true;
            const trimmed = msg.content.trim();
            // Only flag as unsafe if truly JSON-shaped (starts with { or [ or ```json)
            return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```json');
          });

          // If unsafe content detected, trigger debounced refetch (don't spam)
          if (hasUnsafeContent && !isRefetchingRef.current) {
            console.error('[HARD GATE] ⛔ UNSAFE CONTENT - Triggering refetch');
            instrumentationRef.current.REFETCH_TRIGGERED++;
            isRefetchingRef.current = true;

            // Debounced refetch (prevent spam)
            if (refetchDebounceRef.current) clearTimeout(refetchDebounceRef.current);
            refetchDebounceRef.current = setTimeout(async () => {
              try {
                const refetched = await base44.agents.getConversation(currentConversationId);
                const guardedRefetch = buildVisibleConversationMessages(refetched.messages || [], sessionLanguageRef.current);
                safeUpdateMessages(guardedRefetch, 'Refetch');
                // Phase 2 fix: clear loading after refetch completes.  The subscription
                // returned early (no setIsLoading call) when unsafe content was detected.
                // The refetch is the recovery path — loading must always clear here so
                // the chat is not stuck when a JSON-shaped agent reply is sanitized away.
                setIsLoading(false);
                isRefetchingRef.current = false;
              } catch (err) {
                console.error('[Refetch] Failed:', err);
                setIsLoading(false);
                isRefetchingRef.current = false;
              }
            }, 200);

            // Keep showing current messages (do not clear state)
            return;
          }

          processedMessages = buildVisibleConversationMessages(
            data.messages || [],
            sessionLanguageRef.current,
            (msg) => {
              if (!msg) return null;
              if (msg.role === 'assistant' && msg.content) {
                // Skip if not render-safe
                if (!isMessageRenderSafe(msg)) {
                  return null;
                }

                // Validate and extract structured data (non-blocking)
                const validated = validateAgentOutput(msg.content);
                if (validated) {
                  lastStructuredData = validated;
                  return {
                    ...msg,
                    content: validated.assistant_message || msg.content,
                    metadata: {
                      ...(msg.metadata || {}),
                      structured_data: validated
                    }
                  };
                }
              }
              return msg;
            }
          );

          // CRITICAL: Safe update with validation + deduplication
          const subscriptionFinality = evaluateAssistantSnapshotFinality(processedMessages, 'Subscription');

          // V2: Two-phase reconcileSnapshot wiring.
          //   Phase A — raw_correlation: correlate the candidate without completing
          //             the turn. visibleAccepted=false when the subscription snapshot
          //             is not yet final (prevents premature turn completion).
          //   Phase B — visible_commit: only after safeUpdateMessages accepts a
          //             terminal visible result do we commit the turn.
          // Legacy path: direct safeUpdateMessages.
          let updated = false;
          if (chatOrchestratorV2EnabledRef.current) {
            const coord = chatCoordinatorV2Ref.current;
            // Phase A: raw correlation — does NOT complete the turn when non-final.
            const correlateResult = coord.reconcileSnapshot({
              snapshot: processedMessages,
              deliverySource: 'subscription',
              startingTurnId: currentTurnIdRef.current,
              phase: 'raw_correlation',
              visibleAccepted: subscriptionFinality.isFinal === true,
              rejectionReason: subscriptionFinality.isFinal === true
                ? null
                : (subscriptionFinality.reason || 'non_final_subscription_snapshot'),
            });
            if (isS2DebugEnabled()) {
              console.log('[V2Orchestrator] subscription raw_correlation', buildV2DebugDiagnostic({
                ...coord.getDiagnosticState(),
                delivery_source: 'subscription',
                phase: 'raw_correlation',
                snapshot_accepted: correlateResult.accepted,
                snapshot_rejected_reason: correlateResult.rejected_reason || undefined,
                response_correlated: correlateResult.response_correlated,
                response_deduplicated: correlateResult.response_deduplicated,
              }));
            }
            if (correlateResult.response_deduplicated) {
              if (correlateResult.stale_client_request_id) {
                // Cross-turn case A dedup: old request's response arrived while a newer
                // turn is active.  Must not close loading or stop polling for the current turn.
                console.log('[V2Orchestrator][Subscription] stale cross-turn dedup — continuing for current turn');
              } else {
                // Already committed for the current active turn — close loading safely.
                console.log('[V2Orchestrator][Subscription] deduped — skipping state update');
                setIsLoading(false);
              }
            } else if (!correlateResult.response_correlated) {
              // No candidate to work with (no assistant msg, stale, etc.) — skip.
              console.log('[V2Orchestrator][Subscription] correlation rejected:', correlateResult.rejected_reason);
            } else if (!subscriptionFinality.isFinal) {
              // Non-final snapshot — do not call safeUpdateMessages; leave the turn
              // open for a later final snapshot.
              console.log('[V2Orchestrator][Subscription] non-final snapshot — turn remains open');
            } else {
              // Phase B: snapshot is final and correlated — attempt visible update,
              // then commit only if safeUpdateMessages accepts.
              const candidateSnapshot = correlateResult._deduplicatedSnapshot || processedMessages;
              updated = safeUpdateMessages(candidateSnapshot, 'Subscription');
              if (updated) {
                // safeUpdateMessages accepted — now formally commit the turn.
                const commitResult = coord.reconcileSnapshot({
                  snapshot: candidateSnapshot,
                  deliverySource: 'subscription',
                  startingTurnId: currentTurnIdRef.current,
                  phase: 'visible_commit',
                  visibleAccepted: true,
                  terminalReason: 'visible_terminal_result_committed',
                });
                if (isS2DebugEnabled()) {
                  console.log('[V2Orchestrator] subscription visible_commit', buildV2DebugDiagnostic({
                    ...coord.getDiagnosticState(),
                    delivery_source: 'subscription',
                    phase: 'visible_commit',
                    snapshot_accepted: commitResult.accepted,
                    snapshot_rejected_reason: commitResult.rejected_reason || undefined,
                    late_response_recovered: commitResult.late_response_recovered,
                    restored_after_reload: commitResult.restored_after_reload,
                    recovery_result: commitResult.recovery_result || undefined,
                  }));
                  // Guard Isolation Audit Phase 1 — augment guard provenance with
                  // lifecycle outcome fields now that we know the full result chain.
                  emitAugmentedGuardProvenance({
                    responseCorrelated: correlateResult.response_correlated,
                    safeUpdateAccepted: true,
                    visibleCommitCompleted: commitResult.accepted === true,
                    deliverySource: 'subscription',
                  }, coord.getActiveTurn()?.client_request_id ?? null);
                }
                // Drain queued sends after turn is committed.
                if (commitResult._nextQueuedSend) {
                  commitResult._nextQueuedSend().catch((err) => {
                    console.error('[V2Orchestrator] queued send failed:', err);
                  });
                }
              } else {
                // safeUpdateMessages rejected — do not complete the turn; leave later
                // snapshots eligible. Do not set subscriptionSucceededRef=true.
                console.log('[V2Orchestrator][Subscription] visible update rejected — turn remains open');
                // Guard Isolation Audit Phase 1 — capture rejection outcome.
                emitAugmentedGuardProvenance({
                  responseCorrelated: correlateResult.response_correlated,
                  safeUpdateAccepted: false,
                  visibleCommitCompleted: false,
                  deliverySource: 'subscription',
                }, coord.getActiveTurn()?.client_request_id ?? null);
              }
            }
          } else {
            updated = safeUpdateMessages(processedMessages, 'Subscription');
          }

          if (updated) {
            if (legacyAwaitingReplyRef.current &&
                (!subscriptionFinality.isFinal || processedMessages.length < expectedReplyCountRef.current)) {
              // A user-only or previous-turn update cannot release the pending reply.
              setIsLoading(true);
              return;
            }
            releaseLegacyReply();
            // CRITICAL: Always reset loading when safe update succeeds
            console.log('[Subscription] ✅ Loading OFF');
            // Mark subscription as having delivered confirmed content for this send
            // cycle. Polling must not overwrite subscription-confirmed content.
            subscriptionSucceededRef.current = subscriptionFinality.isFinal === true;
            setIsLoading(false);
            // V8-K: finalize the committed messages so subsequent subscription
            // callbacks (e.g. reconnect replays) cannot overwrite the bubble.
            if (subscriptionFinality.isFinal) {
              markAssistantMessagesFinalized(currentConversationId, processedMessages);
              await persistFinalizedCaseFormulationUpdates(currentConversationId, processedMessages);
              sessionStartOpenerFallbackRef.current?.stop('subscription_visible_commit', {
                clearLoading: true,
                clearLoadingTimeout: true,
              });
            }

            // Emit FINAL STABILITY SUMMARY for this send cycle
            emitStabilitySummary();

            // Check if we should offer save (homework + emotion baseline present)
            if (lastStructuredData?.journal_save_candidate?.should_offer_save) {
              console.log('[Save Prompt] Triggering save offer');
              setSavePromptData({
                structuredData: lastStructuredData,
                conversationId: currentConversationId,
                messages: processedMessages
              });
              setShowSavePrompt(true);
            }

            // Stop polling if active - subscription worked
            if (pollingIntervalRef.current) {
              console.log('[Subscription] Stopping polling - subscription successful');
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else {
            console.log('[Subscription] Update rejected - keeping current state');
            // V2: when safeUpdateMessages rejects, do NOT mark subscription as
            // succeeded and do NOT drain the queue — leave later snapshots eligible.
            // Legacy (V2 disabled): preserve original behavior of marking succeeded
            // when finality is confirmed even if the update was a no-op.
            if (!chatOrchestratorV2EnabledRef.current && subscriptionFinality.isFinal === true &&
                processedMessages.length >= expectedReplyCountRef.current) {
              releaseLegacyReply();
              subscriptionSucceededRef.current = true;
              setIsLoading(false);
              emitStabilitySummary();
            }
          }
        } catch (err) {
          console.error('[Subscription] ❌ Processing error:', err);
          setIsLoading(false);
        }
      },
      (error) => {
        if (!isSubscribed || !mountedRef.current) return;

        console.error('[Subscription] ❌ Stream error:', error);
        if (responseTimeoutId) {
          clearTimeout(responseTimeoutId);
          responseTimeoutId = null;
        }
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setIsLoading(false);
        subscriptionActiveRef.current = false;
        emitStabilitySummary();
      }
    );

    // Verify subscription created
    if (!unsubscribe || typeof unsubscribe !== 'function') {
      console.error('[Subscription] ❌ Failed to create subscription');
      setIsLoading(false);
      subscriptionActiveRef.current = false;
      return;
    }

    console.log('[Subscription] ✅ Subscription active');

    // Timeout after 60s
    responseTimeoutId = setTimeout(() => {
      if (isSubscribed && mountedRef.current) {
        releaseLegacyReply();
        console.error('[Subscription] ⏱️ Timeout after 60s - forcing recovery');
        instrumentationRef.current.THINKING_OVER_10S++;
        setIsLoading(false);
        subscriptionActiveRef.current = false;

        // Cancel any pending polls
        if (pollingIntervalRef.current) {
          clearTimeout(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        emitStabilitySummary();
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }
    }, 60000);

    return () => {
      console.log('[Subscription] Cleanup - unsubscribing');
      isSubscribed = false;
      subscriptionActiveRef.current = false;
      if (responseTimeoutId) {
        clearTimeout(responseTimeoutId);
        responseTimeoutId = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
          console.log('[Subscription] ✅ Unsubscribed successfully');
        } catch (err) {
          console.error('[Subscription] Cleanup error:', err);
        }
      }
    };
  }, [currentConversationId]);

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        // In test environment, return empty array immediately
        if (window.__TEST_APP_ID__ || document.body.getAttribute('data-test-env') === 'true') {
          return [];
        }

        // Fetch conversations sequentially to avoid rate-limit bursts
        const allConversations = [];
        for (const agentName of ['cbt_therapist_lenient', 'cbt_therapist_standard', 'cbt_therapist_strict', 'cbt_therapist']) {
          const result = await base44.agents.listConversations({ agent_name: agentName }).catch(() => []);
          allConversations.push(result);
        }

        const flatConversations = allConversations.flat();
        const deletedConversations = await base44.entities.UserDeletedConversations.list();
        const deletedIds = Array.isArray(deletedConversations) ? deletedConversations.map((d) => d.agent_conversation_id) : [];
        const conversationsArray = Array.isArray(flatConversations) ? flatConversations : [];
        return conversationsArray.filter((c) => !deletedIds.includes(c.id));
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
    initialData: [],
    refetchOnWindowFocus: false,
    retry: false // Don't retry in test mode
  });

  const { data: conversationPreferences = [] } = useQuery({
    queryKey: ['conversationPreferences'],
    queryFn: async () => {
      try {
        const records = await base44.entities.Conversation.list('-updated_date', 250);
        return Array.isArray(records) ? records : [];
      } catch (error) {
        console.error('Error fetching conversation preferences:', error);
        return [];
      }
    },
    initialData: [],
    refetchOnWindowFocus: false,
    retry: false
  });

  const preferenceByConversationId = useMemo(() => new Map(
    conversationPreferences
      .filter((record) => record?.agent_conversation_id)
      .map((record) => [record.agent_conversation_id, record])
  ), [conversationPreferences]);

  const displayConversations = useMemo(() => conversations.map((conversation) => {
    const preference = preferenceByConversationId.get(conversation.id);
    return {
      ...conversation,
      metadata: {
        ...conversation.metadata,
        name: preference?.title || conversation.metadata?.name
      },
      ui_is_pinned: preference?.is_pinned === true
    };
  }), [conversations, preferenceByConversationId]);

  const conversationPreferenceMutation = useMutation({
    mutationFn: async ({ conversationId, changes }) => {
      const existing = preferenceByConversationId.get(conversationId);
      const sourceConversation = conversations.find((item) => item.id === conversationId);
      const fallbackTitle = sourceConversation?.metadata?.name || `${t('chat.conversations_list.session_prefix')} ${conversationId.slice(0, 8)}`;
      const payload = {
        agent_conversation_id: conversationId,
        title: changes.title ?? existing?.title ?? fallbackTitle,
        is_pinned: changes.is_pinned ?? existing?.is_pinned ?? false
      };
      return existing?.id
        ? base44.entities.Conversation.update(existing.id, payload)
        : base44.entities.Conversation.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversationPreferences'] }),
    onError: (error) => {
      console.error('Conversation preference update failed:', error);
      toast({
        title: t('chat.conversations_list.update_error_title'),
        description: t('chat.conversations_list.update_error_desc'),
        variant: 'destructive'
      });
    }
  });

  const handleRenameConversation = (conversationId, title) =>
    conversationPreferenceMutation.mutateAsync({ conversationId, changes: { title } });

  const handleTogglePinConversation = (conversationId, isPinned) =>
    conversationPreferenceMutation.mutateAsync({ conversationId, changes: { is_pinned: isPinned } });

  const { data: currentConversationData } = useQuery({
    queryKey: ['currentConversation', currentConversationId],
    queryFn: () => currentConversationId ? base44.agents.getConversation(currentConversationId) : null,
    enabled: !!currentConversationId,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!currentConversationId || !currentConversationData) return;
    rememberConversationSessionIdentity(
      currentConversationId,
      resolveConversationSessionInstanceId(currentConversationData),
    );
  }, [currentConversationData, currentConversationId, rememberConversationSessionIdentity]);

  useEffect(() => {
    // Skip hydration once local message state already exists so subscription/polling
    // updates remain authoritative for the active in-memory session.
    if (!currentConversationId || !currentConversationData || messages.length > 0) return;

    const firstUserMsg = (currentConversationData.messages || []).find((m) => m.role === 'user' && m.content);
    const embeddedLang = firstUserMsg?.content?.match(/\[SESSION_LANGUAGE:\s*([a-zA-Z]{2})\b/)?.[1]?.toLowerCase();
    sessionLanguageRef.current = embeddedLang || i18n.language || 'en';

    const guardedHydrate = buildVisibleConversationMessages(currentConversationData.messages || [], sessionLanguageRef.current);
    const hydrateFinality = evaluateAssistantSnapshotFinality(guardedHydrate, 'CurrentConversationHydrate');

    // V2: initialize the baseline so existing assistant messages are not treated
    // as a new response for the next turn.
    if (chatOrchestratorV2EnabledRef.current) {
      chatCoordinatorV2Ref.current.initializeBaseline(guardedHydrate);
      if (isS2DebugEnabled()) {
        console.log('[V2Orchestrator] initBaseline(hydrate)', buildV2DebugDiagnostic({
          ...chatCoordinatorV2Ref.current.getDiagnosticState(),
          delivery_source: 'hydration',
        }));
      }
    }

    const hydrated = safeUpdateMessages(guardedHydrate, 'CurrentConversationHydrate');

    // V2: Call visible_commit only when safeUpdateMessages accepted the snapshot
    // (hydrated=true) AND the snapshot is final. This ensures a rejected hydration
    // cannot complete an active turn. Late delivery for timed_out turns via hydration
    // is only possible when the snapshot is actually accepted and final.
    if (chatOrchestratorV2EnabledRef.current) {
      const coord = chatCoordinatorV2Ref.current;
      const activeTurn = coord.getActiveTurn();
      if (activeTurn && hydrated && hydrateFinality.isFinal) {
        const reconcile = coord.reconcileSnapshot({
          snapshot: guardedHydrate,
          clientRequestId: activeTurn.client_request_id,
          deliverySource: 'hydration',
          phase: 'visible_commit',
          visibleAccepted: true,
          terminalReason: 'visible_terminal_result_committed',
        });
        if (isS2DebugEnabled()) {
          console.log('[V2Orchestrator] hydration reconcile', buildV2DebugDiagnostic({
            ...coord.getDiagnosticState(),
            snapshot_accepted: reconcile.accepted,
            snapshot_rejected_reason: reconcile.rejected_reason || undefined,
            delivery_source: 'hydration',
          }));
        }
        if (reconcile.accepted && reconcile._nextQueuedSend) {
          reconcile._nextQueuedSend();
        }
      }
    }

    // V8-K: finalize hydrated messages so subsequent subscription replays do not
    // overwrite them (e.g. on socket reconnect after initial page load).
    if (hydrated && hydrateFinality.isFinal) {
      markAssistantMessagesFinalized(currentConversationId, guardedHydrate);
      sessionStartOpenerFallbackRef.current?.stop('hydrate_visible_commit', {
        clearLoading: true,
        clearLoadingTimeout: true,
      });
    }
  }, [currentConversationData, currentConversationId, i18n.language, messages.length]);

  useEffect(() => {
    const controller = sessionStartOpenerFallbackRef.current;
    const activeState = controller?.getState?.();
    if (activeState?.active && activeState.conversationId !== currentConversationId) {
      controller.stop('conversation_switch', {
        clearLoading: true,
        clearLoadingTimeout: true,
      });
    }
    releaseLegacyReply();
    legacyRapidQueueRef.current = legacyRapidQueueRef.current.filter(
      (queuedSend) => !queuedSend.conversationId || queuedSend.conversationId === currentConversationId,
    );
  }, [currentConversationId]);

  useEffect(() => {
    const nextViewerState = currentConversationId ? {
      source: 'chat',
      chatConversationId: currentConversationId,
    } : null;
    const currentViewerState = location.state?.pdfViewerReturn?.source === 'chat'
      ? location.state.pdfViewerReturn
      : null;

    if (areChatViewerStatesEqual(currentViewerState, nextViewerState)) return;

    const nextLocationState = { ...(location.state || {}) };
    if (nextViewerState) {
      nextLocationState.pdfViewerReturn = nextViewerState;
    } else {
      delete nextLocationState.pdfViewerReturn;
    }

    navigate(`${location.pathname}${mergeEntryDiagnosticParams(location.search, entrySearchRef.current)}${location.hash}`, {
      replace: true,
      state: nextLocationState,
    });
  }, [
    currentConversationId,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  // Check if we should show summary prompt (after 5+ messages, only once)
  useEffect(() => {
    if (messages.length >= 6 && messages[messages.length - 1]?.role === 'assistant' && currentConversationId && !summaryPromptShownConversationIdsRef.current.has(currentConversationId)) {
      summaryPromptShownConversationIdsRef.current.add(currentConversationId);
      setSummaryPromptConversationId(currentConversationId);
      setShowSummaryPrompt(true);
    }
  }, [currentConversationId, messages.length]);

  // Stage 11: complete the metric only when a new visible assistant response exists.
  // The helper rejects historical assistant messages using the stored baseline.
  useEffect(() => {
    if (!currentConversationId) return;
    const assistantCount = messages.filter((message) => message.role === 'assistant').length;
    completeTimeToFirstValue({
      valueType: 'assistant_response',
      locale: i18n.language || 'en',
      conversationId: currentConversationId,
      assistantCount,
    });
  }, [currentConversationId, i18n.language, messages]);

  const startNewConversationWithIntent = async (intentParam) => {
    if (conversationInitializingRef.current) return;
    beginTimeToFirstValue({
      entryPoint: intentParam ? `chat_intent_${intentParam}` : 'chat_new_session',
      valueType: 'assistant_response',
      locale: i18n.language || 'en',
      baselineAssistantCount: 0,
    });
    conversationInitializingRef.current = true;
    setIsConversationInitializing(true);
    setIsLoading(true);
    crisisDetectionLifecycleRef.current.invalidate();
    setShowRiskPanel(false);
    try {
      // Stage 6 — wait only for the bounded memory-write window for the session
      // being left before starting a new one. Capture current id/meta/messages
      // synchronously so values are stable. Inert when flags are off or messages
      // are below the meaningful-exchange threshold.
      const leavingId = currentConversationId;
      const leavingMeta = conversations?.find((c) => c.id === leavingId)?.metadata || {};
      await waitForConversationMemoryWrite(
        maybeTriggerEndWrite(leavingId, leavingMeta, messages),
      );

      const intentMessages = {
        'daily_checkin': 'User clicked: Daily Check-in. Start daily_checkin flow.',
        'thought_work': 'User clicked: Journal a thought. Start thought_work flow.',
        'journal': 'User clicked: Thought Journal. Start thought_work flow.',
        'goal_work': 'User clicked: Set a Goal. Start goal_work flow.',
        'set_goal': 'User clicked: Set a Goal. Start goal_work flow.',
        'grounding': 'User clicked: Grounding exercise. Start grounding flow.',
        'calming_exercise': 'User clicked: Calming help. Start grounding flow.',
        'anxiety_help': 'User clicked: Anxiety help. Start grounding flow.'
      };

      const initialMessage = intentParam ? intentMessages[intentParam] || 'Hello' : undefined;

      // Get safety profile from user settings or default to 'standard'
      const user = await base44.auth.me().catch(() => null);
      const safetyProfile = user?.preferences?.safety_profile || 'standard';
      // Phase 0.2A: lock and consume the effective wiring for this session.
      const effectiveWiring = sessionWiringControllerRef.current.lockAndConsume();
      const agentName = effectiveWiring.name;
      const newSessionInstanceId = createSessionInstanceId();
      if (!newSessionInstanceId) throw new Error('Unable to create a secure session identity');

      // Track agent profile usage
      if (appParams.appId) {
        base44.analytics.track({
          eventName: 'conversation_started',
          properties: {
            safety_profile: safetyProfile,
            intent: intentParam || 'none',
            agent_name: agentName
          }
        });
      }

      const conversation = await base44.agents.createConversation({
        agent_name: agentName,
        tool_configs: effectiveWiring.tool_configs,
        metadata: {
          name: intentParam ? `${intentParam} session` : `Session ${conversations.length + 1}`,
          description: 'CBT Therapy Session',
          intent: intentParam,
          safety_profile: safetyProfile,
          session_instance_id: newSessionInstanceId
        }
      });

      rememberConversationSessionIdentity(conversation.id, newSessionInstanceId);
      setCurrentConversationId(conversation.id);
      bindTimeToFirstValueConversation(conversation.id, 0);
      setMessages([]);
      clearLocalAudioDraft();
      lastConfirmedMessagesRef.current = []; // Reset baseline for new conversation
      subscriptionSucceededRef.current = false;
      sessionStartOpenerFallbackRef.current?.stop('new_session_reset', {
        clearLoadingTimeout: true,
      });
      setShowSidebar(false);
      setSafetyModeActive(false); // Phase 8: reset safety mode state on new session
      // Lock session language at conversation start (separate from UI locale).
      sessionLanguageRef.current = i18n.language || 'en';
      refetchConversations();

      // Always send [START_SESSION] so the agent initialises correctly on all
      // wiring paths (HYBRID and all upgrade phases).  If there is also an intent
      // message, append it to the same turn so the agent handles both together.
      clearLoadingTimeout();
        // Safety fallback: if the subscription does not deliver a reply within
        // 25 s (e.g. in CI / test environments where the WebSocket is rejected),
        // clear the loading state so the send button is not stuck disabled.
        // The subscription or polling will clear this timeout early when the AI
        // actually responds — same pattern used by handleSendMessage.
        if (!loadingTimeoutRef.current) {
          loadingTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setIsLoading(false);
              loadingTimeoutRef.current = null;
            }
          }, 25000);
        }
      const sessionComposerSelection = lockContextComposerV2SelectionForSession(conversation.id, effectiveWiring);
      const sessionStartContent = await buildActionFirstDemotedSessionContentAsync(
        effectiveWiring,
        base44.entities,
        base44,
        {
          sessionLanguage: i18n.language,
          conversation_id: conversation.id,
          continuation_session_id: newSessionInstanceId,
          runtime_context_composer_v2_override: sessionComposerSelection.context_composer_v2_effective,
          ...(initialMessage ? { message_text: initialMessage } : {}),
        }
      );
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: initialMessage ?
        addLangDirective(sessionStartContent, sessionLanguageRef.current) + '\n\n' + initialMessage :
        addLangDirective(sessionStartContent, sessionLanguageRef.current)
      });
      sessionStartOpenerFallbackRef.current?.start(conversation.id);
      emitTherapeuticFormsSessionStartDiagnostic(conversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsLoading(false);
      toast({
        title: t('chat.session_start.failed_title'),
        description: t('chat.session_start.failed_description'),
        variant: 'destructive',
      });
    } finally {
      conversationInitializingRef.current = false;
      setIsConversationInitializing(false);
    }
  };

  const startNewConversation = async () => {
    return startNewConversationWithIntent(null);
  };

  const loadConversation = async (conversationId) => {
    crisisDetectionLifecycleRef.current.invalidate();
    setShowRiskPanel(false);
    try {
      // Stage 6 — wait only for the bounded memory-write window for the session
      // being left before loading the new one. Capture the current
      // id/meta/messages synchronously (before any state updates) so the correct
      // values are used in the trigger call. Inert when flags are off or messages
      // are below the meaningful-exchange threshold. Deduped via
      // conversationMemoryWrittenRef to prevent double-writes if requestSummary
      // was already called for the same conversation.
      const leavingId = currentConversationId;
      const leavingMeta = conversations?.find((c) => c.id === leavingId)?.metadata || {};
      const endWritePromise = maybeTriggerEndWrite(leavingId, leavingMeta, messages);
      clearLocalAudioDraft();
      await waitForConversationMemoryWrite(endWritePromise);
      sessionStartOpenerFallbackRef.current?.stop('conversation_switch', {
        clearLoading: true,
        clearLoadingTimeout: true,
      });

      let conversation = await base44.agents.getConversation(conversationId);
      rememberConversationSessionIdentity(
        conversationId,
        resolveConversationSessionInstanceId(conversation),
      );
      const isSameConversation = conversationId === currentConversationId;
      setCurrentConversationId(conversationId);

      // CRITICAL: Reset confirmed-messages baseline when switching conversations.
      // Without this reset, safeUpdateMessages rejects the new conversation's messages
      // if it has fewer messages than the previous conversation, causing replies to
      // appear invisible (never rendered) on the newly loaded conversation.
      if (!isSameConversation) {
        lastConfirmedMessagesRef.current = [];
      }

      // Lock session language for this conversation.
      // Prefer the SESSION_LANGUAGE directive embedded in the first user message.
      // Directive format (injected by addLangDirective in Chat.jsx):
      //   "[SESSION_LANGUAGE: <iso2>. Open and respond entirely in <name> ...]"
      // Fall back to the current UI locale so the governor never defaults to English
      // for a non-English session loaded from history.
      const firstUserMsg = (conversation.messages || []).find((m) => m.role === 'user' && m.content);
      const embeddedLang = firstUserMsg?.content?.match(/\[SESSION_LANGUAGE:\s*([a-zA-Z]{2})\b/)?.[1]?.toLowerCase();
      sessionLanguageRef.current = embeddedLang || i18n.language || 'en';

      const policyRefresh = await ensureTherapeuticFormsPolicyInjected({
        conversation,
        sessionLanguage: sessionLanguageRef.current,
        isNewConversation: false,
        injectedVersionCache: formsPolicyVersionCacheRef.current,
        pendingRefreshByConversation: pendingTherapeuticFormsPolicyRefreshRef.current,
      });
      void policyRefresh;

      // Process and sanitize messages before setting
      const guardedLoad = buildVisibleConversationMessages(conversation.messages || [], sessionLanguageRef.current);
      const loadFinality = evaluateAssistantSnapshotFinality(guardedLoad, 'LoadConversation');

      // V2: re-initialize baseline for this conversation so historical assistant
      // messages cannot be treated as a new response from a fresh send.
      if (chatOrchestratorV2EnabledRef.current) {
        chatCoordinatorV2Ref.current.initializeBaseline(guardedLoad);
        if (isS2DebugEnabled()) {
          console.log('[V2Orchestrator] initBaseline(loadConversation)', buildV2DebugDiagnostic({
            ...chatCoordinatorV2Ref.current.getDiagnosticState(),
            delivery_source: 'hydration',
          }));
        }
      }

      const updated = safeUpdateMessages(guardedLoad, 'LoadConversation');
      // V8-K: finalize existing messages so subscription replays cannot overwrite them
      if (updated && loadFinality.isFinal) {
        markAssistantMessagesFinalized(conversationId, guardedLoad);
      }
      setShowSidebar(false);
    } catch (error) {
      console.error('[Load Conversation Error]', error);
      lastConfirmedMessagesRef.current = [];
      setMessages([]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateChatAttachment(file);
    if (!validation.valid) {
      const isTooLarge = validation.reason === 'too_large';
      toast({
        title: t(isTooLarge ? 'chat.errors.file_too_large_title' : 'chat.errors.unsupported_file_title'),
        description: t(isTooLarge ? 'chat.errors.file_too_large_desc' : 'chat.errors.unsupported_file_desc'),
        variant: 'destructive'
      });
      e.target.value = '';
      return;
    }
    setAttachedFile(file);
    e.target.value = '';
  };

  const clearLocalAudioDraft = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
    if (audioDraftPlayerRef.current) {
      audioDraftPlayerRef.current.pause();
      audioDraftPlayerRef.current.currentTime = 0;
    }
    setAudioDraftUrl((prevUrl) => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    setAudioDraftStatus('idle');
    setAudioDraftFile(null);
    setAudioDraftTranscript('');
    speechTranscriptRef.current = '';
    audioDraftLanguageRef.current = '';
    setIsTranscribingAudio(false);
    audioChunksRef.current = [];
  };

  const stopLocalRecordingStream = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onerror = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      toast({
        title: t('chat.errors.voice_unavailable_title'),
        description: t('chat.errors.voice_unavailable_desc'),
        variant: 'destructive'
      });
      clearLocalAudioDraft();
      return;
    }

    try {
      clearLocalAudioDraft();
      stopLocalRecordingStream();
      // Keep the recording's language stable even if the UI locale changes
      // before Transcribe or a retry. It describes input speech, not output translation.
      audioDraftLanguageRef.current = (i18n.resolvedLanguage || i18n.language || '').split(/[-_]/)[0].toLowerCase();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      speechTranscriptRef.current = '';
      setAudioDraftTranscript('');

      const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
      // Mobile must transcribe the saved recording, not a separate live
      // recognition session that may stop early or return unrelated/partial text.
      if (SpeechRecognitionCtor && !isMobileBrowser()) {
        try {
          const speechRecognition = new SpeechRecognitionCtor();
          speechRecognition.continuous = true;
          speechRecognition.interimResults = true;
          speechRecognition.lang = i18n.language || 'en';
          speechRecognition.onresult = (event) => {
            const nextFinalSegments = [];
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              const result = event.results[i];
              if (result?.isFinal && typeof result?.[0]?.transcript === 'string') {
                nextFinalSegments.push(result[0].transcript.trim());
              }
            }
            if (nextFinalSegments.length > 0) {
              const joined = [speechTranscriptRef.current, ...nextFinalSegments].filter(Boolean).join(' ').trim();
              speechTranscriptRef.current = joined;
              setAudioDraftTranscript(joined);
            }
          };
          speechRecognition.onerror = (event) => {
            console.warn('[Voice Draft] speech recognition error:', event);
          };
          speechRecognitionRef.current = speechRecognition;
          speechRecognition.start();
        } catch (speechError) {
          console.warn('[Voice Draft] speech recognition unavailable:', speechError);
          speechRecognitionRef.current = null;
        }
      }

      const androidMediaRecorderMimeCandidates = getAndroidMediaRecorderMimeCandidates();
      let requestedAndroidMimeType = null;
      let recorder = null;

      for (const mimeType of androidMediaRecorderMimeCandidates) {
        try {
          recorder = new window.MediaRecorder(stream, { mimeType });
          requestedAndroidMimeType = mimeType;
          break;
        } catch (error) {
          console.warn('[Voice Draft] MediaRecorder mime candidate rejected:', { mimeType, error });
        }
      }

      if (!recorder) {
        recorder = new window.MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      setAudioDraftStatus('recording');

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('[Voice Draft] recorder error:', event);
        stopLocalRecordingStream();
        clearLocalAudioDraft();
        toast({
          title: t('chat.errors.recording_failed_title'),
          description: t('chat.errors.recording_failed_desc'),
          variant: 'destructive'
        });
      };

      recorder.onstop = () => {
        stopLocalRecordingStream();

        if (audioChunksRef.current.length === 0) {
          clearLocalAudioDraft();
          toast({
            title: t('chat.errors.no_audio_title'),
            description: t('chat.errors.no_audio_desc'),
            variant: 'destructive'
          });
          return;
        }

        const firstChunkMimeType = audioChunksRef.current.find((chunk) =>
          typeof chunk?.type === 'string' && chunk.type.trim() !== ''
        )?.type;
        const blobType = resolveRecordedAudioMimeType({
          chunkMimeType: firstChunkMimeType,
          recorderMimeType: recorder.mimeType,
          requestedMimeType: requestedAndroidMimeType
        });
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const extension = blobType.includes('ogg') ? 'ogg' : blobType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([audioBlob], `voice-draft-${Date.now()}.${extension}`, { type: blobType });
        const localAudioUrl = URL.createObjectURL(audioBlob);
        setAudioDraftUrl((prevUrl) => {
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
          }
          return localAudioUrl;
        });
        setAudioDraftFile(file);
        setAudioDraftStatus('recorded');
      };

      recorder.start();
    } catch (err) {
      console.error('[Voice Draft] start recording failed:', err);
      stopLocalRecordingStream();
      clearLocalAudioDraft();
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      toast({
        title: denied ? t('chat.errors.mic_denied_title') : t('chat.errors.mic_failed_title'),
        description: denied ?
        t('chat.errors.mic_denied_desc') :
        t('chat.errors.mic_failed_desc'),
        variant: 'destructive'
      });
    }
  };

  const handleStopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.warn('[Voice Draft] speech recognition stop failed:', error);
      }
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('[Voice Draft] stop recording failed:', error);
        stopLocalRecordingStream();
        clearLocalAudioDraft();
        toast({
          title: t('chat.errors.recording_failed_title'),
          description: t('chat.errors.recording_failed_desc'),
          variant: 'destructive'
        });
      }
    }
  };

  const handlePlayRecording = async () => {
    if (!audioDraftUrl || !audioDraftPlayerRef.current) return;
    try {
      audioDraftPlayerRef.current.currentTime = 0;
      await audioDraftPlayerRef.current.play();
    } catch (err) {
      console.error('[Voice Draft] playback failed:', err);
      toast({
        title: t('chat.errors.playback_failed_title'),
        description: t('chat.errors.playback_failed_desc'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecording = () => {
    stopLocalRecordingStream();
    clearLocalAudioDraft();
  };

  const extractTranscriptText = (result) => {
    const getTranscriptCandidate = (value) => {
      if (typeof value !== 'string') return '';
      return value.trim() ? value : '';
    };

    const extractFromObjectShape = (value) => {
      if (!value || typeof value !== 'object') return '';

      const directCandidates = [
        value.transcript,
        value.transcription,
        value.text,
        value.output_text,
        value.content
      ];

      for (const directValue of directCandidates) {
        const candidate = getTranscriptCandidate(directValue);
        if (candidate) return candidate;
      }

      if (Array.isArray(value.output)) {
        for (const item of value.output) {
          const candidate = getTranscriptCandidate(item?.text);
          if (candidate) return candidate;
        }
      }

      return '';
    };

    if (typeof result === 'string') return getTranscriptCandidate(result);
    if (!result || typeof result !== 'object') return '';

    return (
      extractFromObjectShape(result) ||
      getTranscriptCandidate(result.data) ||
      extractFromObjectShape(result.data) ||
      ''
    );
  };

  const buildNormalizedAudioDraftForTranscriptionRetry = (file) => {
    if (!file) return null;
    const originalType = typeof file.type === 'string' ? file.type : '';
    if (!originalType) return null;

    const sanitizedType = originalType.split(';')[0].trim().toLowerCase();
    if (!sanitizedType) return null;

    let normalizedType = sanitizedType;
    if (sanitizedType.startsWith('video/')) {
      normalizedType = sanitizedType.replace(/^video\//, 'audio/');
    }

    if (normalizedType === originalType.toLowerCase()) return null;

    const baseName = typeof file.name === 'string' && file.name.trim()
      ? file.name.replace(/\.[^.]+$/, '')
      : `voice-draft-${Math.random().toString(36).slice(2, 10)}`;

    let extension = 'webm';
    if (normalizedType.includes('ogg')) {
      extension = 'ogg';
    } else if (normalizedType.includes('wav')) {
      extension = 'wav';
    } else if (normalizedType.includes('mp4')) {
      extension = 'm4a';
    }

    return new File([file], `${baseName}.${extension}`, { type: normalizedType });
  };

  const handleTranscribeRecording = async () => {
    if (!audioDraftFile || isTranscribingAudio) return;
    const localTranscript = typeof audioDraftTranscript === 'string' ? audioDraftTranscript.trim() : '';
    if (localTranscript && !isMobileBrowser()) {
      setInputMessage((prev) => {
        if (!prev.trim()) return localTranscript;
        return `${prev}${prev.endsWith('\n') ? '' : '\n'}${localTranscript}`;
      });
      if (isAndroidRuntime()) {
        clearLocalAudioDraft();
      }
      toast({ title: t('chat.errors.transcript_added') });
      return;
    }

    // Early guard: 0-byte file cannot be transcribed — surface a clear error immediately.
    if (typeof audioDraftFile.size === 'number' && audioDraftFile.size === 0) {
      console.error('[Audio] Transcription blocked: audio draft is 0 bytes.', {
        name: audioDraftFile.name,
        type: audioDraftFile.type,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '(unknown)',
      });
      toast({
        title: t('chat.errors.no_audio_title'),
        description: t('chat.errors.no_audio_desc'),
        variant: 'destructive',
      });
      return;
    }

    setIsTranscribingAudio(true);

    // Collect diagnostic info on mobile to enrich failure messages.
    // Fired eagerly (before upload) so the DOM canPlayType check and UA read run in parallel
    // with the conversion/upload steps. The promise is only awaited when a failure path is reached.
    const onMobile = isMobileBrowser();
    const diagInfoPromise = onMobile ? buildMobileAudioDiagnosticInfo(audioDraftFile) : Promise.resolve(null);
    let conversionError = null;

    try {
      let transcriptionSourceFile;
      try {
        transcriptionSourceFile = await convertAndroidWebmDraftToWav(audioDraftFile);
      } catch (convertErr) {
        conversionError = convertErr;
        console.error('[Audio] WebM/M4A→WAV conversion failed, falling back to original file:', convertErr);
        transcriptionSourceFile = audioDraftFile;
      }

      if (onMobile) {
        const diagInfo = await diagInfoPromise;
        console.log('[Audio] Mobile transcription diagnostic (pre-upload):', {
          original: { name: audioDraftFile.name, type: audioDraftFile.type, size: audioDraftFile.size },
          source: { name: transcriptionSourceFile.name, type: transcriptionSourceFile.type, size: transcriptionSourceFile.size },
          canPlayType: diagInfo?.canPlayType,
          conversionError: conversionError?.message ?? null,
          ua: diagInfo?.ua,
        });
      }

      let file_url = '';
      try {
        if (!onMobile) {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: transcriptionSourceFile });
          file_url = uploadResult?.file_url;
          if (!file_url) throw new Error('Upload returned no file_url');
        }
      } catch (uploadError) {
        console.error('[Audio] Upload failed before transcription:', uploadError);
        toast({
          title: t('chat.errors.audio_upload_title'),
          description: t('chat.errors.audio_upload_desc'),
          variant: 'destructive'
        });
        return;
      }

      let result;
      // Mobile: dedicated Whisper backend (avoids Base44 InvokeLLM format restrictions on Android)
      // Web: InvokeLLM unchanged
      const runTranscription = async (targetFileUrl, targetFile = transcriptionSourceFile) => {
        if (onMobile) {
          // The SDK sends File parameters as authenticated multipart/form-data.
          // Storage URLs do not encode reliable ownership; send the local bytes.
          const r = await base44.functions.invoke('transcribeMobileAudio', {
            file: targetFile,
            ...(audioDraftLanguageRef.current ? { language: audioDraftLanguageRef.current } : {}),
          });
          const t = r?.data?.transcription;
          if (!t) throw new Error('No transcription returned from backend');
          return t;
        }
        const basePrompt = 'Transcribe this audio to plain text. Return only the spoken words with natural punctuation.';
        const reqs = [{ prompt: basePrompt, file_urls: [targetFileUrl] }, { file_urls: [targetFileUrl] }];
        let lastError = null;
        for (let i = 0; i < reqs.length; i++) {
          try { return await base44.integrations.Core.InvokeLLM(reqs[i]); }
          catch (e) {
            lastError = e;
            if (i >= reqs.length - 1) break;
            const h = [e?.message, e?.data ? JSON.stringify(e.data) : ''].join(' ').toLowerCase();
            if (!(h.includes('prompt') && (h.includes('not supported') || h.includes('unsupported')))) break;
          }
        }
        throw lastError || new Error('Audio transcription request failed');
      };

      try {
        result = await runTranscription(file_url);
      } catch (transcriptionError) {
        const normalizedRetryFile = buildNormalizedAudioDraftForTranscriptionRetry(transcriptionSourceFile);
        if (normalizedRetryFile) {
          try {
            let retryFileUrl = '';
            if (!onMobile) {
              const retryUploadResult = await base44.integrations.Core.UploadFile({ file: normalizedRetryFile });
              retryFileUrl = retryUploadResult?.file_url;
              if (!retryFileUrl) throw new Error('Retry upload returned no file_url');
            }
            result = await runTranscription(retryFileUrl, normalizedRetryFile);
          } catch (retryError) {
            const diagInfo = onMobile ? await diagInfoPromise : null;
            const backendReason = extractBackendTranscriptionErrorReason(retryError) ||
              extractBackendTranscriptionErrorReason(transcriptionError);
            console.error('[Audio] Transcription retry failed:', {
              first_attempt: {
                message: transcriptionError?.message,
                status: transcriptionError?.status,
                code: transcriptionError?.code,
                data: transcriptionError?.data
              },
              retry_attempt: {
                message: retryError?.message,
                status: retryError?.status,
                code: retryError?.code,
                data: retryError?.data
              },
              ...(onMobile && { diagnostic: { ...diagInfo, conversionError: conversionError?.message ?? null, backendReason } }),
            });
            const description = onMobile
              ? buildTranscriptionFailureDescription({ diagInfo, backendReason, conversionError })
              : 'The upload succeeded, but transcription failed. Retry or delete this draft.';
            toast({
              title: t('chat.errors.transcription_title'),
              description,
              variant: 'destructive'
            });
            return;
          }
        } else {
          const diagInfo = onMobile ? await diagInfoPromise : null;
          const backendReason = extractBackendTranscriptionErrorReason(transcriptionError);
          console.error('[Audio] Transcription request failed:', {
            message: transcriptionError?.message,
            status: transcriptionError?.status,
            code: transcriptionError?.code,
            data: transcriptionError?.data,
            ...(onMobile && { diagnostic: { ...diagInfo, conversionError: conversionError?.message ?? null, backendReason } }),
          });
          const description = onMobile
            ? buildTranscriptionFailureDescription({ diagInfo, backendReason, conversionError })
            : 'The upload succeeded, but transcription failed. Retry or delete this draft.';
          toast({
            title: t('chat.errors.transcription_title'),
            description,
            variant: 'destructive'
          });
          return;
        }
      }

      const transcript = extractTranscriptText(result);
      if (!transcript) throw new Error('No transcript returned');

      setInputMessage((prev) => {
        if (!prev.trim()) return transcript;
        return `${prev}${prev.endsWith('\n') ? '' : '\n'}${transcript}`;
      });
      if (isAndroidRuntime()) {
        clearLocalAudioDraft();
      }
      toast({ title: t('chat.errors.transcript_added') });
    } catch (error) {
      const diagInfo = onMobile ? await diagInfoPromise : null;
      const backendReason = extractBackendTranscriptionErrorReason(error);
      console.error('[Audio] Transcription failed:', error, onMobile ? { diagnostic: diagInfo, backendReason } : {});
      const description = onMobile
        ? buildTranscriptionFailureDescription({ diagInfo, backendReason, conversionError })
        : 'No transcript text was returned. Retry or delete this draft.';
      toast({
        title: t('chat.errors.transcription_title'),
        description,
        variant: 'destructive'
      });
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  /**
   * V2: Executes a queued send operation with pre-captured parameters.
   * Called by the coordinator drain mechanism when a queued turn is dequeued.
   * A new active turn has already been atomically created before this is called.
   * This function only runs when chatOrchestratorV2EnabledRef.current is true.
   */
  const handleSendMessageWithParams = async ({ messageText, attachmentToUpload, isVoiceDerivedSend, conversationId }) => {
    if (!mountedRef.current) return;
    // Delegate to handleSendMessage with the queued params via a special params arg.
    // handleSendMessage is defined below and will handle these directly.
    await handleSendMessage({ _v2QueuedParams: { messageText, attachmentToUpload, isVoiceDerivedSend, conversationId } });
  };

  const handleSendMessage = async (_opts = {}) => {
    if (!isConsentResolved || showConsentBanner) {
      setShowConsentBanner(true);
      return;
    }

    // V2: Support being called with pre-captured params from a queued send.
    // When _v2QueuedParams is set, the active turn is already created by _drainQueue.
    const _v2QueuedParams = _opts?._v2QueuedParams || null;
    const _isV2QueuedExecution = _v2QueuedParams !== null;
    const isSummaryRequest = typeof _opts?.summaryMessage === 'string';
    const sendConversationId = _isV2QueuedExecution
      ? _v2QueuedParams.conversationId
      : currentConversationIdRef.current;

    const hasRecordedAudioDraft = audioDraftStatus === 'recorded' && !!audioDraftFile;
    const isAndroidVoiceDraftSend =
    isAndroidRuntime() && !attachedFile && !!audioDraftFile && !!inputMessage.trim();
    const isVoiceDerivedSend = _isV2QueuedExecution
      ? _v2QueuedParams.isVoiceDerivedSend
      : !isSummaryRequest && !attachedFile && !!inputMessage.trim() && (hasRecordedAudioDraft || isAndroidVoiceDraftSend);
    const attachmentToUpload = _isV2QueuedExecution
      ? _v2QueuedParams.attachmentToUpload
      : isSummaryRequest ? null : attachedFile || (!isVoiceDerivedSend ? audioDraftFile : null);
    const rawInputText = _isV2QueuedExecution ? _v2QueuedParams.messageText : isSummaryRequest ? _opts.summaryMessage : inputMessageRef.current;

    if (!rawInputText.trim() && !attachmentToUpload) {
      console.log('[Send] ❌ Blocked - empty message');
      return;
    }

    // Layer 1: Regex-based crisis detection
    // Layer 1 stays synchronous and authoritative. Explicit crisis messages
    // never enter the send queue or start an asynchronous detection lifecycle.
    const reasonCode = detectCrisisWithReason(rawInputText);
    if (reasonCode) {
      setShowRiskPanel(true);
      inputMessageRef.current = '';
      setInputMessage('');
      isLoadingRef.current = false;
      setIsLoading(false);
      return;
    }

    // Reserve the V2 turn before any asynchronous work. This closes the small
    // preflight window in which several rapid Enter presses could each start a
    // Layer-2 check and invalidate the preceding message. Later sends are now
    // captured FIFO immediately and safety-checked only when dequeued.
    let v2ActiveTurn = null;
    if (chatOrchestratorV2EnabledRef.current) {
      if (_isV2QueuedExecution) {
        v2ActiveTurn = chatCoordinatorV2Ref.current.getActiveTurn();
      } else {
        const capturedParams = {
          messageText: rawInputText,
          attachmentToUpload,
          isVoiceDerivedSend,
          conversationId: currentConversationIdRef.current,
        };
        const registration = chatCoordinatorV2Ref.current.registerSend({
          conversationId: currentConversationIdRef.current || '__pending__',
          executeSend: async () => handleSendMessageWithParams(capturedParams),
        });

        if (registration.queue_full) {
          setInputMessage(rawInputText);
          console.warn('[V2Orchestrator] Queue full — message not sent');
          toast({
            title: t('chat.errors.queue_title'),
            description: t('chat.errors.queue_desc'),
            variant: 'destructive',
          });
          return;
        }

        if (registration.queued) {
          inputMessageRef.current = '';
          setInputMessage('');
          console.log('[V2Orchestrator] Short follow-up queued safely, depth:', chatCoordinatorV2Ref.current.getPendingTurnCount());
          return;
        }

        v2ActiveTurn = registration.turn;
      }
    } else if (!_isV2QueuedExecution && (isLoadingRef.current || legacyMessagePersistencePendingRef.current || legacyAwaitingReplyRef.current)) {
      if (legacyRapidQueueRef.current.length >= 10) {
        setInputMessage(rawInputText);
        toast({
          title: t('chat.errors.queue_title'),
          description: t('chat.errors.queue_desc'),
          variant: 'destructive',
        });
        return;
      }
      legacyRapidQueueRef.current.push({
        messageText: rawInputText,
        attachmentToUpload,
        isVoiceDerivedSend,
        conversationId: currentConversationIdRef.current,
      });
      setInputMessage('');
      console.log('[Send] Rapid follow-up queued safely, depth:', legacyRapidQueueRef.current.length);
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const crisisDetectionRequest = crisisDetectionLifecycleRef.current.begin(
      currentConversationIdRef.current,
    );

    // Increment send counter for this cycle
    instrumentationRef.current.SEND_COUNT++;
    console.log('[Send] 📤 Starting send #', instrumentationRef.current.SEND_COUNT);
    // Reset subscription-confirmed flag for this new send cycle.
    subscriptionSucceededRef.current = false;

    // Use the authoritative committed snapshot for queued sends. The React
    // closure that originally captured executeSend may contain an older array.
    expectedReplyCountRef.current = calculateExpectedReplyCount(
      lastConfirmedMessagesRef.current.length,
    );
    pollingFinalityStateRef.current = {
      assistantKey: null,
      content: null,
      stableCount: 0,
    };
    logS2DebugLifecycle({
      correlation_mode: 'array_position_expected_reply_count',
      active_request_count: 1,
      expected_reply_count: expectedReplyCountRef.current,
      delivery_source: 'send',
    });

    // Layer 2: LLM-based crisis detection (nuanced, implicit patterns)
    try {
        const user = await base44.auth.me().catch(() => null);
        let enhancedCheck = { data: { is_crisis: false, severity: 'none', confidence: 0 } };
        try {
          enhancedCheck = await base44.functions.invoke('enhancedCrisisDetector', {
            message: rawInputText,
            language: user?.preferences?.language || 'en'
          });
      } catch (err) {
        console.warn('[Enhanced Crisis Detection] Function invoke failed:', err?.message);
      }

      if (
        !mountedRef.current
        || !crisisDetectionLifecycleRef.current.isCurrent(
          crisisDetectionRequest,
          currentConversationIdRef.current,
        )
      ) {
        console.log('[Enhanced Crisis Detection] Ignoring stale Layer 2 result');
        return;
      }

      const suppressEnhancedHardStop = isExplicitCurrentSafetyDenial(rawInputText);
      if (enhancedCheck.data?.is_crisis && (
      enhancedCheck.data.severity === 'severe' || enhancedCheck.data.severity === 'high') &&
      enhancedCheck.data.confidence > 0.7 &&
      !suppressEnhancedHardStop) {
        setShowRiskPanel(true);
        setInputMessage((currentDraft) => (
          clearSubmittedDraftIfUnchanged(currentDraft, rawInputText)
        ));
        isLoadingRef.current = false;
        setIsLoading(false);
        if (chatOrchestratorV2EnabledRef.current) {
          // Safety hard-stop cancels this turn and any queued follow-ups. Nothing
          // may bypass the crisis panel while the user is being redirected.
          chatCoordinatorV2Ref.current.reset();
        }
        base44.entities.CrisisAlert.create({
          surface: 'chat',
          conversation_id: currentConversationId || 'none',
          reason_code: `llm_${enhancedCheck.data.severity}`,
          user_email: user?.email || 'unknown'
        }).catch(() => {});

        // Analytics tracking for LLM-detected crisis
        if (appParams.appId) {
          base44.analytics.track({
            eventName: 'crisis_detected_llm_layer2',
            properties: {
              severity: enhancedCheck.data.severity,
              confidence: enhancedCheck.data.confidence,
              surface: 'chat'
            }
          });
        }
        return;
      }
    } catch (error) {
      console.warn('[Enhanced Crisis Detection] Failed, continuing with message:', error);
      // Non-blocking: if enhanced detection fails, continue with message send
    }

    const messageText = rawInputText;
    const assistantCountBeforeSend = lastConfirmedMessagesRef.current.filter((message) => message.role === 'assistant').length;
    beginTimeToFirstValue({
      entryPoint: 'chat_message',
      valueType: 'assistant_response',
      locale: i18n.language || 'en',
      conversationId: sendConversationId,
      baselineAssistantCount: assistantCountBeforeSend,
    });
    if (!_isV2QueuedExecution) {
      inputMessageRef.current = '';
      setInputMessage('');
    }
    // Keep an eligible summary offer available after the next reply.
    // Rendering already hides it during generation.

    // The V2 active turn was reserved before Layer-2 safety detection so rapid
    // sends cannot invalidate an earlier preflight. Queued execution reuses the
    // atomically-created turn from the coordinator drain path.

    setDeliveryStatus('saving');
    setIsLoading(true);

    // Phase 7.1 — Explicit safety layer precedence (documented and enforced):
    //   Layer 1 (regex crisis detector)  → HARD_STOP, already returned above if triggered
    //   Layer 2 (LLM crisis detector)    → HARD_STOP, already returned above if triggered
    //   Layer 3 (upgraded safety mode)   → CONSTRAIN_ONLY, V5 path only (see below)
    //   Layer 4 (post-LLM safety filter) → OUTPUT_FILTER, always active on agent output
    //
    // Layer 3 only executes here because Layers 1 and 2 did NOT trigger a hard-stop.
    // Layers 1 and 2 are authoritative — this layer is subordinate.

    // Phase 7.1 Layer 3: Per-turn safety mode supplement (V5 wiring only, flag-gated).
    // Returns null for default HYBRID wiring — no change to default behavior.
    const runtimeSupplement = buildRuntimeSafetySupplement(
      ACTIVE_CBT_THERAPIST_WIRING,
      messageText,
      i18n?.language ?? 'en'
    );
    // Phase 8: track safety mode activation for the upgraded UI indicator.
    // Once triggered, the indicator persists for the rest of the session.
    if (runtimeSupplement !== null) {
      setSafetyModeActive(true);
    }

    // Phase 10b: Per-turn formulation-deepening supplement (V6-LED / V7-V12 paths only).
    // Safety-first precedence: only computed when the safety supplement is null.
    // Returns null for HYBRID, V1-V5, V6 context-only, and non-deepening turns.
    const formulationSupplement = runtimeSupplement === null
      ? buildRuntimeFormulationSupplement(
          ACTIVE_CBT_THERAPIST_WIRING,
          messageText,
          i18n?.language ?? 'en'
        )
      : null;

    legacyMessagePersistencePendingRef.current = !chatOrchestratorV2EnabledRef.current;

    // CRITICAL: Add loading timeout failsafe (10s)
    // V2: the coordinator's polling exhaustion/error paths own terminal timeout state.
    // Do NOT call setIsLoading(false) from the 10s timer when V2 is active and the
    // turn is still in-flight (PENDING/SENT/GENERATING) with bounded polling running.
    // Legacy: persistence and bounded polling retain ownership of the FIFO turn.
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      const v2Active = chatOrchestratorV2EnabledRef.current;
      if (v2Active) {
        const activeTurn = chatCoordinatorV2Ref.current?.getActiveTurn?.();
        const inFlightStatuses = new Set(['pending', 'sent', 'generating']);
        const stillPolling = !!pollingIntervalRef.current;
        if (activeTurn && inFlightStatuses.has(activeTurn.status) && stillPolling) {
          // V2: coordinator owns this lifecycle — do not fire the legacy failsafe.
          console.log('[Send] ⏱️ 10s timeout suppressed — V2 polling still active (turn:', activeTurn.status, ')');
          loadingTimeoutRef.current = null;
          return;
        }
      }
      if (!v2Active && (legacyMessagePersistencePendingRef.current || pollingIntervalRef.current)) {
        // Persistence and bounded authoritative polling still own this turn.
        // Clearing loading here would drain the next draft into the same request.
        loadingTimeoutRef.current = null;
        return;
      }
      console.error('[Send] ⏱️ Loading timeout after 10s - forcing recovery');
      instrumentationRef.current.THINKING_OVER_10S++;
      setIsLoading(false);
      emitStabilitySummary();
      loadingTimeoutRef.current = null;
    }, 10000);

    try {
      let convId = sendConversationId || currentConversationIdRef.current;
      let isNewConversation = false;
      // Phase 0.2A: holds the locked effective wiring when a new conversation is created.
      // Set in the isNewConversation block; used in the session-start content block below.
      let newConversationEffectiveWiring = null;
      let newSessionInstanceId = '';
      if (!convId) {
        isNewConversation = true;
        sessionLanguageRef.current = i18n.language || 'en';
        // Get safety profile from user settings or default to 'standard'
        const user = await base44.auth.me().catch(() => null);
        const safetyProfile = user?.preferences?.safety_profile || 'standard';
        // Phase 0.2A: lock and consume the effective wiring for this session.
        newConversationEffectiveWiring = sessionWiringControllerRef.current.lockAndConsume();
        const agentName = newConversationEffectiveWiring.name;
        newSessionInstanceId = createSessionInstanceId();
        if (!newSessionInstanceId) throw new Error('Unable to create a secure session identity');

        const conversation = await base44.agents.createConversation({
          agent_name: agentName,
          tool_configs: newConversationEffectiveWiring.tool_configs,
          metadata: {
            name: `Session ${conversations?.length + 1 || 1}`,
            description: 'Therapy session',
            safety_profile: safetyProfile,
            session_instance_id: newSessionInstanceId
          }
        });
        convId = conversation.id;
        rememberConversationSessionIdentity(convId, newSessionInstanceId);
        setCurrentConversationId(convId);
        refetchConversations();
        setShowSidebar(false);
      }
      bindTimeToFirstValueConversation(convId, messages.filter((message) => message.role === 'assistant').length);
      let conversation = null;
      try {
        conversation = await base44.agents.getConversation(convId);
        rememberConversationSessionIdentity(
          convId,
          resolveConversationSessionInstanceId(conversation),
        );
      } catch (conversationLookupError) {
        if (isNewConversation) {
          console.warn('[Send] New conversation lookup failed on first send; continuing with created conversation context.', conversationLookupError);
          conversation = { id: convId, messages: [] };
        } else {
          throw conversationLookupError;
        }
      }

      // MF-7: Fail-closed guard — block continuation of legacy variant-profile conversations.
      // Only block when agent_name is EXPLICITLY a known legacy variant.
      // Absent agent_name (Preview platform may not return it) is treated as the primary agent
      // to avoid incorrectly blocking all conversations in environments where the field is omitted.
      const conversationAgentName = conversation?.agent_name;
      if (conversationAgentName && LEGACY_VARIANT_PROFILES.includes(conversationAgentName)) {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setIsLoading(false);
        setVariantProfileBlocked(true);
        return;
      }

      if (!isNewConversation) {
        await ensureTherapeuticFormsPolicyInjected({
          conversation,
          sessionLanguage: sessionLanguageRef.current,
          isNewConversation: false,
          injectedVersionCache: formsPolicyVersionCacheRef.current,
          pendingRefreshByConversation: pendingTherapeuticFormsPolicyRefreshRef.current,
        });
      }

      console.log('[Send] 📤 Adding message to conversation:', convId);

      // When the user types their first message without clicking "Start Session",
      // prepend the [START_SESSION] block so the agent initialises on all wiring paths.
      // Message composition order (Phase 7 updated):
      //   1. Safety supplement (if active) — supersedes formulation supplement
      //   2. Formulation-deepening supplement (if active and safety is null)
      //   3. Pending formulation contract correction block (if prior guarded turn was
      //      replaced and correction not yet sent) — see Phase 7.
      //   4. Current user message
      // For new conversations the session-start content is prepended before all of the above.

      const activePendingInternalCorrection = hasPendingInternalCorrectionIntent(pendingInternalCorrectionRef.current) &&
        internalCorrectionScopeMatches(pendingInternalCorrectionRef.current, convId)
        ? pendingInternalCorrectionRef.current
        : null;
      // Clear stale intent that belongs to a different conversation or is already consumed
      if (pendingInternalCorrectionRef.current && !activePendingInternalCorrection) {
        pendingInternalCorrectionRef.current = null;
      }
      logS2DebugLifecycle({
        delivery_source: 'send',
        ...buildInternalCorrectionDiagnostic(activePendingInternalCorrection, {
          conversationScopeMatch: internalCorrectionScopeMatches(activePendingInternalCorrection, convId),
        }),
      });

      const qualitySupplement = buildStage12TurnSupplement(
        messageText,
        sessionLanguageRef.current || i18n.language,
        { hasAttachment: !!attachmentToUpload },
      );
      let messageContent = buildOutboundUserMessageContent({
        runtimeSupplement,
        formulationSupplement,
        qualitySupplement,
        messageText,
      });
      if (!isNewConversation) {
        const effectiveSessionWiring = sessionWiringControllerRef.current.getEffectiveWiring();
        const v10TurnKnowledgeContext = await buildV10TurnKnowledgeContextAsync(
          effectiveSessionWiring,
          base44.entities,
          {
            sessionLanguage: sessionLanguageRef.current,
            conversation_id: convId,
            continuation_session_id: resolveConversationSessionInstanceId(conversation),
            message_text: messageText,
          },
          base44,
        );
        if (v10TurnKnowledgeContext) {
          messageContent = `${v10TurnKnowledgeContext}\n\n${messageContent}`;
        }
      }
      const deterministicFormRoute = resolveFormIntentRequest(messageText, {
        language: sessionLanguageRef.current,
      });
      const formRouterContext = buildDeterministicFormRouterContext(deterministicFormRoute, sessionLanguageRef.current);
      if (formRouterContext) {
        messageContent += formRouterContext;
      }
      if (isNewConversation) {
        const sessionComposerSelection = lockContextComposerV2SelectionForSession(convId, newConversationEffectiveWiring);
        const sessionStartContent = addLangDirective(
          await buildActionFirstDemotedSessionContentAsync(
            newConversationEffectiveWiring,
            base44.entities,
            base44,
            {
              sessionLanguage: i18n.language,
              conversation_id: convId,
              continuation_session_id: newSessionInstanceId,
              runtime_context_composer_v2_override: sessionComposerSelection.context_composer_v2_effective,
              message_text: messageText,
              onStrategyPolicy: (policy) => {
                captureCurrentTurnResponsePolicy({
                  policy,
                  conversationId: convId,
                  clientRequestId: v2ActiveTurn?.client_request_id || null,
                  generationIdentity: v2ActiveTurn?.client_request_id ? null : `legacy-${convId}`,
                });
              },
            }
          ),
          sessionLanguageRef.current
        );
        const stage12SessionContract = buildStage12SessionContract(
          sessionLanguageRef.current || i18n.language,
        );
        messageContent = sessionStartContent + '\n\n' + stage12SessionContract + '\n\n' + messageContent;
      }
      const outboundContentClean = !hasCorrectionBlockAttached(messageContent);
      logS2DebugLifecycle({
        delivery_source: 'send',
        ...buildInternalCorrectionDiagnostic(activePendingInternalCorrection, {
          conversationScopeMatch: internalCorrectionScopeMatches(activePendingInternalCorrection, convId),
          outboundContentClean,
        }),
      });
      const pendingPolicyRefresh = pendingTherapeuticFormsPolicyRefreshRef.current.get(convId) || null;
      if (pendingPolicyRefresh?.content) {
        messageContent = prependPendingPolicyRefreshToUserContent(messageContent, pendingPolicyRefresh.content);
      }

      // Upload file attachment if present
      let attachmentMeta = undefined;
      let pdfAttachmentMetadata = {};
      let usedAudioDraftAttachment = false;
      if (attachmentToUpload) {
        setIsUploadingFile(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: attachmentToUpload });
          const type = attachmentToUpload === audioDraftFile ? 'audio' : resolveAttachmentType(attachmentToUpload.name);
          attachmentMeta = { type, url: file_url, name: attachmentToUpload.name };
          usedAudioDraftAttachment = attachmentToUpload === audioDraftFile;

          if (type === 'pdf') {
            try {
              const extractionResult = await base44.functions.invoke('extractPdfText', {
                file_url,
                file_name: attachmentToUpload.name
              });
              const extractionData = extractionResult?.data || extractionResult || {};
              if (typeof extractionData.text === 'string' && extractionData.text.trim()) {
                pdfAttachmentMetadata.pdf_extracted_text = extractionData.text;
              }
              if (Number.isFinite(extractionData.page_count) && extractionData.page_count > 0) {
                pdfAttachmentMetadata.pdf_page_count = extractionData.page_count;
              }
            } catch (err) {
              console.warn('[Upload] PDF text extraction failed:', err?.message || err);
            }
          }
        } catch (err) {
          console.error('[Upload] File upload failed:', err);
          toast({
            title: t('chat.errors.file_upload_title'),
            description: t('chat.errors.file_upload_desc'),
            variant: 'destructive'
          });
        } finally {
          setIsUploadingFile(false);
          setAttachedFile(null);
        }
      }

      // Stage 4 voice send contract:
      // If no regular file is attached, persist the recorded audio draft as the
      // user attachment while keeping the edited transcript as message text.
      let shouldClearAudioDraftAfterSend = false;
      if (!isVoiceDerivedSend && !attachmentMeta && audioDraftStatus === 'recorded' && audioDraftFile) {
        setIsUploadingFile(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioDraftFile });
          if (file_url) {
            attachmentMeta = {
              type: 'audio',
              url: file_url,
              name: audioDraftFile.name,
              size: typeof audioDraftFile.size === 'number' ? audioDraftFile.size : undefined
            };
            shouldClearAudioDraftAfterSend = true;
          }
        } catch (err) {
          console.error('[Upload] Audio draft upload failed:', err);
          toast({
            title: t('chat.errors.audio_upload_title'),
            description: t('chat.errors.audio_upload_desc'),
            variant: 'destructive'
          });
        } finally {
          setIsUploadingFile(false);
        }
      }

      // Runtime-safe attachment contract for addMessage:
      // - AI delivery fields go in [ATTACHMENT_CONTEXT] within content.
      // - Round-trip recovery stays in [ATTACHMENT_METADATA] marker.
      // - Do not send custom metadata fields (runtime 422s on attachment metadata).
      const attachmentContextBlock = attachmentMeta ? (() => {
        const lines = [
        '[ATTACHMENT_CONTEXT]',
        `type: ${attachmentMeta.type}`,
        `url: ${attachmentMeta.url}`];
        if (attachmentMeta.name) lines.push(`name: ${attachmentMeta.name}`);
        if (typeof pdfAttachmentMetadata.pdf_page_count === 'number') {
          lines.push(`pdf_page_count: ${pdfAttachmentMetadata.pdf_page_count}`);
        }
        if (typeof pdfAttachmentMetadata.pdf_extracted_text === 'string' && pdfAttachmentMetadata.pdf_extracted_text.trim()) {
          lines.push(`pdf_extracted_text: ${pdfAttachmentMetadata.pdf_extracted_text.replace(/\s+/g, ' ').trim()}`);
        }
        return '\n' + lines.join('\n');
      })() : '';
      const marker = attachmentMeta ? '\n' + serializeAttachmentMetadataMarker(attachmentMeta) : '';
      const finalContent = messageContent + attachmentContextBlock + marker;

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: finalContent,
        ...(attachmentMeta ? {
          file_urls: [attachmentMeta.url]
        } : {})
      });
      legacyMessagePersistencePendingRef.current = false;
      legacyAwaitingReplyRef.current = !chatOrchestratorV2EnabledRef.current;
      if (!chatOrchestratorV2EnabledRef.current) {
        isLoadingRef.current = true;
        setIsLoading(true);
      }
      setDeliveryStatus('sent');
      // Consume the correction intent only after successful addMessage.
      // If addMessage throws, the pending intent is retained so the user can retry.
      if (activePendingInternalCorrection) {
        pendingInternalCorrectionRef.current = consumeInternalCorrectionIntent(activePendingInternalCorrection);
        logS2DebugLifecycle({
          delivery_source: 'send',
          ...buildInternalCorrectionDiagnostic(pendingInternalCorrectionRef.current, {
            conversationScopeMatch: internalCorrectionScopeMatches(pendingInternalCorrectionRef.current, convId),
            outboundContentClean,
          }),
        });
      }
      pendingFormulationCorrectionRef.current = null;
      pendingGroundingCorrectionRef.current = null;
      if (pendingPolicyRefresh?.policyVersion) {
        consumePendingPolicyRefreshAfterSuccessfulSend({
          conversationId: convId,
          pendingRefreshByConversation: pendingTherapeuticFormsPolicyRefreshRef.current,
          injectedVersionCache: formsPolicyVersionCacheRef.current,
        });
      }
      if (isNewConversation) {
        emitTherapeuticFormsSessionStartDiagnostic(convId);
      }
      if (isVoiceDerivedSend) {
        clearLocalAudioDraft();
      }
      if (usedAudioDraftAttachment) {
        clearLocalAudioDraft();
      }

      if (shouldClearAudioDraftAfterSend) {
        clearLocalAudioDraft();
      }

      console.log('[Send] ✅ Message sent - starting authoritative polling');

      // V2: Mark the active turn as generating now that addMessage succeeded.
      if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
        chatCoordinatorV2Ref.current.markGenerating(v2ActiveTurn.client_request_id);
        if (isS2DebugEnabled()) {
          console.log('[V2Orchestrator] markGenerating', buildV2DebugDiagnostic({
            ...chatCoordinatorV2Ref.current.getDiagnosticState(),
            delivery_source: 'send',
          }));
        }
      }

      // CRITICAL: Start authoritative polling with exponential backoff
      // This ensures we get the reply even if subscription fails
      let pollAttempts = 0;
      const { pollDelays, maxPollAttempts } = getDefaultPollingLifecycle();

      const pollWithBackoff = (attemptIndex) => {
        const delay = getPollingDelayForAttempt(attemptIndex, pollDelays);

        pollingIntervalRef.current = setTimeout(async () => {
          pollAttempts++;
          const pollingExhausted = hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts);
          logS2DebugLifecycle({
            delivery_source: 'polling',
            polling_attempt: pollAttempts,
            polling_exhausted: pollingExhausted,
            expected_reply_count: expectedReplyCountRef.current,
          });
          console.log(`[Polling] Attempt ${pollAttempts}/${maxPollAttempts} (delay: ${delay}ms, hidden: ${document.hidden})`);

          try {
            const updatedConv = await base44.agents.getConversation(convId);
            const guardedPoll = buildVisibleConversationMessages(updatedConv.messages || [], sessionLanguageRef.current);
            const pollFinality = evaluatePollingAssistantFinality(guardedPoll);
            const hasExpectedReplyCount = guardedPoll.length >= expectedReplyCountRef.current;

            console.log(
              `[Polling] Retrieved ${guardedPoll.length} messages, expected ${expectedReplyCountRef.current}, finality=${pollFinality.reason}`
            );

            // Final-only commit: expected count alone is not sufficient.
            if (hasExpectedReplyCount && pollFinality.isFinal) {
              console.log(`[Polling] ✅ Final reply confirmed (${pollFinality.reason}) - stopping polling`);

              // Tracks whether Phase A raw_correlation succeeded for this polling attempt.
              // Holds the correlated snapshot so the exhaustion handler can force-complete
              // with the exact same snapshot that Phase A verified.
              let v2PhaseACorrelated = null;

              // V2: Two-phase reconcileSnapshot wiring for polling.
              //   Phase A — raw_correlation: correlate without completing the turn.
              //   Phase B — visible_commit: only after safeUpdateMessages accepts.
              if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                const coord = chatCoordinatorV2Ref.current;
                // Phase A: raw correlation — does NOT complete the turn.
                const correlateResult = coord.reconcileSnapshot({
                  snapshot: guardedPoll,
                  clientRequestId: v2ActiveTurn.client_request_id,
                  deliverySource: 'polling',
                  phase: 'raw_correlation',
                  visibleAccepted: pollFinality.isFinal === true,
                  rejectionReason: pollFinality.isFinal === true
                    ? null
                    : (pollFinality.reason || 'non_final_polling_snapshot'),
                });
                if (isS2DebugEnabled()) {
                  console.log('[V2Orchestrator] polling raw_correlation', buildV2DebugDiagnostic({
                    ...coord.getDiagnosticState(),
                    delivery_source: 'polling',
                    phase: 'raw_correlation',
                    snapshot_accepted: correlateResult.accepted,
                    snapshot_rejected_reason: correlateResult.rejected_reason || undefined,
                    response_correlated: correlateResult.response_correlated,
                    response_deduplicated: correlateResult.response_deduplicated,
                  }));
                }
                if (correlateResult.response_deduplicated) {
                  if (correlateResult.stale_client_request_id) {
                    // Cross-turn case A dedup: the response belongs to the old request but a
                    // newer turn is now active.  Must not close loading or stop polling for the
                    // current turn — continue polling for the active request.
                    console.log('[V2Orchestrator][Polling] stale cross-turn dedup — continuing poll for current turn');
                    if (isS2DebugEnabled()) {
                      logS2DebugLifecycle({
                        client_request_id: v2ActiveTurn.client_request_id,
                        delivery_source: 'polling',
                        phase: 'raw_correlation',
                        response_correlated: correlateResult.response_correlated,
                        safe_update_accepted: false,
                        visible_commit_completed: false,
                        active_turn_status: coord.getActiveTurn()?.status,
                        polling_attempt: pollAttempts,
                        polling_continues: !hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts),
                        rejection_reason: 'stale_cross_turn_dedup',
                      });
                    }
                    if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
                      instrumentationRef.current.STUCK_THINKING_TIMEOUTS++;
                      chatCoordinatorV2Ref.current.markTimedOut(v2ActiveTurn.client_request_id);
                      releaseLegacyReply();
                  setIsLoading(false);
                      emitStabilitySummary();
                      if (pollingIntervalRef.current) {
                        clearTimeout(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                      }
                      if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                        loadingTimeoutRef.current = null;
                      }
                    } else {
                      pollWithBackoff(pollAttempts);
                    }
                    return;
                  }
                  // Same-request dedup: deduplicated committed response for the current active
                  // turn — close loading safely, stop polling, do not drain the queue a second time.
                  console.log('[V2Orchestrator][Polling] deduped — skipping state update');
                  if (isS2DebugEnabled()) {
                    logS2DebugLifecycle({
                      client_request_id: v2ActiveTurn.client_request_id,
                      delivery_source: 'polling',
                      phase: 'raw_correlation',
                      response_correlated: correlateResult.response_correlated,
                      safe_update_accepted: false,
                      visible_commit_completed: false,
                      active_turn_status: coord.getActiveTurn()?.status,
                      polling_attempt: pollAttempts,
                      polling_continues: false,
                      terminal_reason: 'response_deduplicated',
                    });
                  }
                  releaseLegacyReply();
                  setIsLoading(false);
                  if (pollingIntervalRef.current) {
                    clearTimeout(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                    loadingTimeoutRef.current = null;
                  }
                  return;
                }
                if (!correlateResult.response_correlated) {
                  // No candidate yet (stale snapshot, no assistant msg, etc.).
                  // Spec §1/§2: rejection is non-terminal — continue polling.
                  //
                  // Early-exit: when the turn is already completed (committed by
                  // hydration, subscription, or a concurrent polling path), there
                  // is nothing more for this loop to do.  Stop immediately so the
                  // shared pollingIntervalRef is not held open beyond the current
                  // turn, which would otherwise cancel the next turn's polling timer
                  // when this loop eventually clears the ref on exhaustion.
                  if (correlateResult.rejected_reason === 'turn_already_completed') {
                    console.log('[V2Orchestrator][Polling] turn already completed by another path — stopping poll early');
                    if (isS2DebugEnabled()) {
                      logS2DebugLifecycle({
                        client_request_id: v2ActiveTurn.client_request_id,
                        delivery_source: 'polling',
                        phase: 'raw_correlation',
                        response_correlated: false,
                        safe_update_accepted: false,
                        visible_commit_completed: false,
                        active_turn_status: chatCoordinatorV2Ref.current?.getActiveTurn?.()?.status,
                        polling_attempt: pollAttempts,
                        polling_continues: false,
                        terminal_reason: 'turn_already_completed_early_exit',
                      });
                    }
                    releaseLegacyReply();
                  setIsLoading(false);
                    emitStabilitySummary();
                    if (pollingIntervalRef.current) {
                      clearTimeout(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                    }
                    if (loadingTimeoutRef.current) {
                      clearTimeout(loadingTimeoutRef.current);
                      loadingTimeoutRef.current = null;
                    }
                    return;
                  }
                  //
                  // DEDUP_GUARD_POLLING (Guard Isolation Audit):
                  //   When the rejection reason is 'turn_already_completed' AND
                  //   subscription already committed this turn
                  //   (subscriptionSucceededRef.current=true), continuing to poll
                  //   is unnecessary — the turn is done.
                  //   SHADOW: log observation only, fall through (legacy behavior continues).
                  //   ENFORCE: log + suppress the poll continuation.
                  //   OFF (default): no logging, legacy behavior preserved exactly.
                  //   NOTE: The early-exit above now handles 'turn_already_completed'
                  //   unconditionally, so the guard below is a no-op safety net only.
                  const _dedupGuardModeNcr = dedupGuardPollingModeRef.current;
                  if (
                    correlateResult.rejected_reason === 'turn_already_completed' &&
                    subscriptionSucceededRef.current &&
                    (_dedupGuardModeNcr === 'SHADOW' || _dedupGuardModeNcr === 'ENFORCE')
                  ) {
                    // Bounded provenance diagnostic — no PII, no content.
                    console.log('[DedupGuard][' + _dedupGuardModeNcr + '] polling dedup: turn_already_completed + subscription_committed observed', {
                      guard_mode: _dedupGuardModeNcr,
                      delivery_source: 'polling',
                      response_correlated: false,
                      rejected_reason: 'turn_already_completed',
                      subscription_committed: true,
                      polling_attempt: pollAttempts,
                      terminal_reason: 'subscription_committed_turn_completed',
                    });
                    if (_dedupGuardModeNcr === 'ENFORCE') {
                      // ENFORCE: turn is committed — suppress polling continuation.
                      return;
                    }
                    // SHADOW: observation logged; fall through to existing polling continuation.
                  }
                  console.log('[V2Orchestrator] polling correlation not yet matched — continuing poll:', correlateResult.rejected_reason);
                  if (isS2DebugEnabled()) {
                    logS2DebugLifecycle({
                      client_request_id: v2ActiveTurn.client_request_id,
                      delivery_source: 'polling',
                      phase: 'raw_correlation',
                      response_correlated: false,
                      safe_update_accepted: false,
                      visible_commit_completed: false,
                      active_turn_status: coord.getActiveTurn()?.status,
                      polling_attempt: pollAttempts,
                      polling_continues: !hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts),
                      rejection_reason: correlateResult.rejected_reason || 'not_correlated',
                    });
                  }
                  if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
                    instrumentationRef.current.STUCK_THINKING_TIMEOUTS++;
                    chatCoordinatorV2Ref.current.markTimedOut(v2ActiveTurn.client_request_id);
                    releaseLegacyReply();
                  setIsLoading(false);
                    emitStabilitySummary();
                    if (pollingIntervalRef.current) {
                      clearTimeout(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                    }
                    if (loadingTimeoutRef.current) {
                      clearTimeout(loadingTimeoutRef.current);
                      loadingTimeoutRef.current = null;
                    }
                  } else {
                    pollWithBackoff(pollAttempts);
                  }
                  return;
                }
                // Phase A succeeded — Phase B (visible_commit) happens below.
                // Capture the correlated snapshot here so the polling-exhaustion
                // handler uses the exact snapshot that Phase A verified, not a
                // potentially different one from a later re-entry.
                v2PhaseACorrelated = guardedPoll;
              }

              // CRITICAL: Safe update with validation
              // Skip overwrite if subscription already confirmed content — polling
              // snapshot can be shorter than the streamed response and must not win.
              const updated = subscriptionSucceededRef.current ?
              false :
              safeUpdateMessages(guardedPoll, 'Polling', { pollFinality });
              if (subscriptionSucceededRef.current) {
                console.log('[Polling] ⏭️ Skipping overwrite — subscription already confirmed content');
              }

              // emitStabilitySummary is intentionally inside `if (updated)`: it
              // reports a SUCCESSFUL message delivery cycle and should only fire
              // when the state was actually updated (i.e., new content reached the
              // UI).  If the update was rejected (safeUpdateMessages returned false),
              // there is nothing meaningful to report for this cycle.
              if (updated) {
                // V2 Phase B: safeUpdateMessages accepted — now formally commit the turn.
                if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                  const coord = chatCoordinatorV2Ref.current;
                  const commitResult = coord.reconcileSnapshot({
                    snapshot: guardedPoll,
                    clientRequestId: v2ActiveTurn.client_request_id,
                    deliverySource: 'polling',
                    phase: 'visible_commit',
                    visibleAccepted: true,
                    terminalReason: 'visible_terminal_result_committed',
                  });
                  if (isS2DebugEnabled()) {
                    console.log('[V2Orchestrator] polling visible_commit', buildV2DebugDiagnostic({
                      ...coord.getDiagnosticState(),
                      delivery_source: 'polling',
                      phase: 'visible_commit',
                      snapshot_accepted: commitResult.accepted,
                      snapshot_rejected_reason: commitResult.rejected_reason || undefined,
                      late_response_recovered: commitResult.late_response_recovered,
                      recovery_result: commitResult.recovery_result || undefined,
                    }));
                    logS2DebugLifecycle({
                      client_request_id: v2ActiveTurn.client_request_id,
                      delivery_source: 'polling',
                      phase: 'visible_commit',
                      response_correlated: true,
                      safe_update_accepted: true,
                      visible_commit_completed: commitResult.accepted,
                      active_turn_status: coord.getActiveTurn()?.status,
                      polling_attempt: pollAttempts,
                      polling_continues: false,
                      terminal_reason: 'visible_terminal_result_committed',
                    });
                    // Guard Isolation Audit Phase 1 — augment guard provenance with
                    // polling lifecycle outcome fields.
                    emitAugmentedGuardProvenance({
                      responseCorrelated: true,
                      safeUpdateAccepted: true,
                      visibleCommitCompleted: commitResult.accepted === true,
                      deliverySource: 'polling',
                    }, v2ActiveTurn.client_request_id);
                  }
                  if (commitResult._nextQueuedSend) {
                    commitResult._nextQueuedSend().catch((err) => {
                      console.error('[V2Orchestrator] polling queued send failed:', err);
                    });
                  }
                }
                // V8-K: Finalize all committed assistant messages so that subsequent
                // subscription callbacks (late streaming chunks or socket reconnects)
                // cannot overwrite the bubble that was just atomically rendered.
                // safeUpdateMessages synchronously records the exact sanitized,
                // finality-tagged snapshot in lastConfirmedMessagesRef. Persist
                // that committed snapshot so a status-less reply accepted after
                // stable polling reaches the writer as finalized.
                const committedPoll = lastConfirmedMessagesRef.current;
                markAssistantMessagesFinalized(convId, committedPoll);
                await persistFinalizedCaseFormulationUpdates(convId, committedPoll);
                emitStabilitySummary();
              } else if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                // Spec §1: safeUpdateMessages rejected — rejection is non-terminal.
                // Do NOT clear loading, do NOT stop polling, keep the turn GENERATING.
                // Schedule the next bounded polling attempt.
                //
                // DEDUP_GUARD_POLLING (Guard Isolation Audit):
                //   When subscription already committed this turn
                //   (subscriptionSucceededRef.current=true), the updated=false outcome
                //   above is a deliberate skip — NOT a safeUpdateMessages rejection.
                //   SHADOW: log observation only, fall through (legacy behavior continues).
                //   ENFORCE: log + suppress the unnecessary polling continuation.
                //   OFF (default): no logging, legacy behavior preserved exactly.
                const _dedupGuardMode = dedupGuardPollingModeRef.current;
                const _subscriptionCommitted = subscriptionSucceededRef.current;
                if (_subscriptionCommitted && (_dedupGuardMode === 'SHADOW' || _dedupGuardMode === 'ENFORCE')) {
                  // Bounded provenance diagnostic — no PII, no content.
                  console.log('[DedupGuard][' + _dedupGuardMode + '] polling dedup: subscription-committed skip observed (not a safe-update rejection)', {
                    guard_mode: _dedupGuardMode,
                    delivery_source: 'polling',
                    response_correlated: true,
                    subscription_committed: true,
                    polling_attempt: pollAttempts,
                    terminal_reason: 'subscription_committed_skip',
                  });
                  if (_dedupGuardMode === 'ENFORCE') {
                    // ENFORCE: turn is committed — suppress polling continuation.
                    return;
                  }
                  // SHADOW: observation logged; fall through to existing polling continuation.
                }
                const coord = chatCoordinatorV2Ref.current;
                console.log('[V2Orchestrator][Polling] safe-update rejected — continuing poll (turn stays GENERATING)');
                if (isS2DebugEnabled()) {
                  logS2DebugLifecycle({
                    client_request_id: v2ActiveTurn.client_request_id,
                    delivery_source: 'polling',
                    phase: 'raw_correlation',
                    response_correlated: true,
                    safe_update_accepted: false,
                    visible_commit_completed: false,
                    active_turn_status: coord.getActiveTurn()?.status,
                    polling_attempt: pollAttempts,
                    polling_continues: !hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts),
                    rejection_reason: 'safe_update_rejected',
                  });
                  // Guard Isolation Audit Phase 1 — capture safe_update_accepted=false.
                  emitAugmentedGuardProvenance({
                    responseCorrelated: true,
                    safeUpdateAccepted: false,
                    visibleCommitCompleted: false,
                    deliverySource: 'polling',
                  }, v2ActiveTurn.client_request_id);
                }
                if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
                  // Spec §2C: bounded timeout reached.
                  instrumentationRef.current.STUCK_THINKING_TIMEOUTS++;
                  if (v2PhaseACorrelated) {
                    // Phase A already confirmed a valid new response, but
                    // safeUpdateMessages kept rejecting across all poll attempts.
                    // Force-complete the turn via visible_commit so the queue
                    // drains and any subsequent send (turn 2) can proceed.
                    // Without this, _activeTurn stays GENERATING/TIMED_OUT and
                    // the queue is permanently blocked.
                    const forceCoord = chatCoordinatorV2Ref.current;
                    const forceCommit = forceCoord.reconcileSnapshot({
                      snapshot: v2PhaseACorrelated,
                      clientRequestId: v2ActiveTurn.client_request_id,
                      deliverySource: 'polling',
                      phase: 'visible_commit',
                      visibleAccepted: true,
                      terminalReason: 'visible_terminal_result_committed',
                    });
                    if (isS2DebugEnabled()) {
                      logS2DebugLifecycle({
                        client_request_id: v2ActiveTurn.client_request_id,
                        delivery_source: 'polling',
                        phase: 'visible_commit',
                        response_correlated: true,
                        safe_update_accepted: false,
                        visible_commit_completed: forceCommit.accepted,
                        active_turn_status: forceCoord.getActiveTurn()?.status,
                        polling_attempt: pollAttempts,
                        polling_continues: false,
                        terminal_reason: 'polling_exhausted_force_commit',
                      });
                    }
                    if (forceCommit._nextQueuedSend) {
                      forceCommit._nextQueuedSend().catch((err) => {
                        console.error('[V2Orchestrator] polling exhaustion force-commit queued send failed:', err);
                      });
                    }
                  } else {
                    chatCoordinatorV2Ref.current.markTimedOut(v2ActiveTurn.client_request_id);
                  }
                  if (isS2DebugEnabled()) {
                    logS2DebugLifecycle({
                      client_request_id: v2ActiveTurn.client_request_id,
                      delivery_source: 'polling',
                      phase: 'raw_correlation',
                      response_correlated: true,
                      safe_update_accepted: false,
                      visible_commit_completed: false,
                      active_turn_status: coord.getActiveTurn()?.status,
                      polling_attempt: pollAttempts,
                      polling_continues: false,
                      terminal_reason: 'polling_exhausted_after_rejection',
                    });
                  }
                  releaseLegacyReply();
                  setIsLoading(false);
                  emitStabilitySummary();
                  if (pollingIntervalRef.current) {
                    clearTimeout(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                    loadingTimeoutRef.current = null;
                  }
                } else {
                  pollWithBackoff(pollAttempts);
                }
                return;
              }

              // Terminal accepted path (legacy or V2 accepted):
              // Clear loading once finality is verified.
              releaseLegacyReply();
                  setIsLoading(false);

              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
            } else if (hasExpectedReplyCount && !pollFinality.isFinal) {
              console.log(`[Polling] ⏳ Awaiting final snapshot (${pollFinality.reason})`);
              if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
                console.warn('[Polling] Finality not confirmed before max attempts - falling back to timeout path');
                instrumentationRef.current.STUCK_THINKING_TIMEOUTS++;
                // V2: Mark as timed_out (recoverable — late subscription/hydration may complete it).
                if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                  chatCoordinatorV2Ref.current.markTimedOut(v2ActiveTurn.client_request_id);
                }
                safeUpdateMessages(guardedPoll, 'Polling-Timeout', { pollFinality });
                releaseLegacyReply();
                  setIsLoading(false);
                emitStabilitySummary();
                if (pollingIntervalRef.current) {
                  clearTimeout(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                if (loadingTimeoutRef.current) {
                  clearTimeout(loadingTimeoutRef.current);
                  loadingTimeoutRef.current = null;
                }
              } else {
                pollWithBackoff(pollAttempts);
              }
            } else if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
              console.error('[Polling] ⏱️ Timeout - no reply after max attempts');
              instrumentationRef.current.STUCK_THINKING_TIMEOUTS++;

              // V2: Mark as timed_out (recoverable).
              if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                chatCoordinatorV2Ref.current.markTimedOut(v2ActiveTurn.client_request_id);
                if (isS2DebugEnabled()) {
                  console.log('[V2Orchestrator] markTimedOut', buildV2DebugDiagnostic({
                    ...chatCoordinatorV2Ref.current.getDiagnosticState(),
                    delivery_source: 'polling',
                  }));
                }
              }

              // CRITICAL: Safe update with validation
              safeUpdateMessages(guardedPoll, 'Polling-Timeout', { pollFinality });
              releaseLegacyReply();
                  setIsLoading(false);
              emitStabilitySummary();

              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
            } else {
              // Continue polling with next backoff delay
              pollWithBackoff(pollAttempts);
            }
          } catch (err) {
            console.error('[Polling] ❌ Error:', err);
            if (hasPollingAttemptTimedOut(pollAttempts, maxPollAttempts)) {
              instrumentationRef.current.THINKING_OVER_10S++;
              // V2: Mark as failed on persistent polling error.
              if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
                const failedNext = chatCoordinatorV2Ref.current.markFailed(v2ActiveTurn.client_request_id);
                if (failedNext) failedNext.executeSend();
              }
              releaseLegacyReply();
                  setIsLoading(false);
              emitStabilitySummary();
              if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else {
              // Retry with next backoff delay
              pollWithBackoff(pollAttempts);
            }
          }
        }, delay);
      };

      pollWithBackoff(0);
    } catch (error) {
      console.error('[Send] ❌ SEND ERROR:', error);
      releaseLegacyReply();
      setDeliveryStatus('failed');
      if (currentConversationIdRef.current === sendConversationId) {
        setInputMessage((currentDraft) => currentDraft.trim() ? currentDraft : messageText);
      }
      // V2: Mark the active turn as failed and drain the queue.
      if (chatOrchestratorV2EnabledRef.current && v2ActiveTurn) {
        const failedNext = chatCoordinatorV2Ref.current.markFailed(v2ActiveTurn.client_request_id);
        if (failedNext) failedNext.executeSend();
      }
      // Force recovery on send error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsLoading(false);
      subscriptionActiveRef.current = false;

      // Emit summary even on error path
      emitStabilitySummary();

      if (isAuthError(error) && shouldShowAuthError()) {
        setShowAuthError(true);
      } else {
        toast({
          title: t('chat.delivery.failed_title', 'Message not sent'),
          description: t('chat.delivery.failed_description', 'Please try again in a moment.'),
          variant: 'destructive'
        });
      }
    } finally {
      legacyMessagePersistencePendingRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoading || legacyMessagePersistencePendingRef.current || legacyAwaitingReplyRef.current || chatOrchestratorV2EnabledRef.current) return undefined;
    const nextQueuedSend = legacyRapidQueueRef.current.shift();
    if (!nextQueuedSend) return undefined;
    if (nextQueuedSend.conversationId && nextQueuedSend.conversationId !== currentConversationIdRef.current) {
      return undefined;
    }
    const drainTimer = setTimeout(() => {
      handleSendMessageWithParams(nextQueuedSend).catch((error) => {
        console.error('[Send] Queued follow-up failed:', error);
      });
    }, 0);
    return () => clearTimeout(drainTimer);
  }, [isLoading, currentConversationId, legacyReplyReleaseVersion]);

  // Phase 5 — Conversation-switch memory write trigger.
  // Fires triggerConversationEndSummarization for `convId` if:
  //   (a) convId is a non-empty string,
  //   (b) messages had at least CONVERSATION_MIN_MESSAGES_FOR_MEMORY entries
  //       (ensures a real exchange happened before the session ended),
  //   (c) convId has NOT already been written (dedup via conversationMemoryWrittenRef).
  // Pending calls share one promise. Switch callers wait for a bounded period;
  // failures remain fail-open and flags-off mode stays inert.
  const maybeTriggerEndWrite = (
    convId,
    convMeta,
    msgList,
    invoker = 'chat_conversation_switch',
  ) => {
    return triggerConversationMemoryWriteOnce({
      writeTracker: conversationMemoryWrittenRef.current,
      conversationId: convId,
      conversationMeta: convMeta || {},
      messages: msgList,
      minMessages: CONVERSATION_MIN_MESSAGES_FOR_MEMORY,
      trigger: triggerConversationEndSummarization,
      invoker,
      entities: base44.entities,
      runtimeSnapshot: runtimeSnapshotRef.current,
    });
  };

  const requestSummary = async () => {
    if (!currentConversationId) return;

    setShowSummaryPrompt(false);

    // Phase 4 — Trigger non-blocking conversation-end memory write for V7
    // continuity. Gated by isSummarizationEnabled(); inert in default mode.
    // The metadata lookup uses the in-memory conversations list to avoid an
    // extra network round-trip; falls back to empty metadata when unavailable.
    const convForMemory = conversations?.find((c) => c.id === currentConversationId);
    // Phase 5/6 — Claim the conversation ID before triggering so repeated
    // requestSummary calls and any later switch-trigger de-dupe against it.
    void maybeTriggerEndWrite(
      currentConversationId,
      convForMemory?.metadata || {},
      messages,
      'chat_request_summary',
    );

    // Build a language-aware summary request
    const userLang = i18n.language || 'en';
    const summaryPromptByLang = {
      he: 'אנא ספק סיכום מפגש מקיף הכולל: (1) נקודות דיון מרכזיות, (2) תובנות ניתנות לפעולה, (3) צעדים הבאים מומלצים או תרגילים. אנא כתוב את הסיכום בעברית בצורה מובנית וברורה.',
      es: 'Por favor proporciona un resumen completo de la sesión que incluya: (1) puntos clave discutidos, (2) perspectivas accionables, (3) próximos pasos recomendados o ejercicios. Escribe el resumen en español de forma estructurada y clara.',
      fr: 'Veuillez fournir un résumé complet de la séance comprenant: (1) les points clés discutés, (2) des insights actionnables, (3) les prochaines étapes recommandées ou exercices. Rédigez le résumé en français de manière structurée et claire.',
      de: 'Bitte gib eine umfassende Sitzungszusammenfassung, die enthält: (1) besprochene Hauptpunkte, (2) umsetzbare Erkenntnisse, (3) empfohlene nächste Schritte oder Übungen. Schreibe die Zusammenfassung auf Deutsch in strukturierter und klarer Form.',
      it: 'Per favore fornisci un riassunto completo della sessione che includa: (1) punti chiave discussi, (2) intuizioni attuabili, (3) prossimi passi consigliati o esercizi. Scrivi il riassunto in italiano in modo strutturato e chiaro.',
      pt: 'Por favor forneça um resumo abrangente da sessão incluindo: (1) pontos-chave discutidos, (2) insights acionáveis, (3) próximos passos recomendados ou exercícios. Escreva o resumo em português de forma estruturada e clara.',
      en: 'Please provide a comprehensive session summary including: (1) key discussion points, (2) actionable insights, (3) recommended next steps or exercises. Write the summary in English in a structured and easy-to-understand format.'
    };
    const summaryPrompt = summaryPromptByLang[userLang] || summaryPromptByLang['en'];

    // Use the normal persistence, finality, subscription and polling path.
    // Direct addMessage bypasses expectedReplyCount and leaves the summary invisible.
    await handleSendMessage({ summaryMessage: summaryPrompt });
  };

  const handleChatIntentChoice = (entryPoint, prompt) => {
    beginTimeToFirstValue({
      entryPoint,
      valueType: 'assistant_response',
      locale: i18n.language || 'en',
      conversationId: currentConversationId,
      baselineAssistantCount: messages.filter((message) => message.role === 'assistant').length,
      restart: true,
    });
    setInputMessage(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      await base44.entities.UserDeletedConversations.create({
        agent_conversation_id: conversationId,
        conversation_title: conversation?.metadata?.name || 'Deleted Session'
      });
      return conversationId;
    },
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      const previousConversations = queryClient.getQueryData(['conversations']);
      const previousConversationId = currentConversationId;
      const previousMessages = messages;
      queryClient.setQueryData(['conversations'], (old = []) => old.filter((conversation) => conversation.id !== conversationId));
      guardedAssistantMemoryByConversationRef.current.delete(conversationId);
      if (currentConversationId === conversationId) {
        setAttachedFile(null);
        clearLocalAudioDraft();
        setCurrentConversationId(null);
        setMessages([]);
        lastConfirmedMessagesRef.current = []; // Reset baseline when deleting active conversation
      }
      return { previousConversations, previousConversationId, previousMessages };
    },
    onSuccess: () => {
      refetchConversations();
    },
    onError: (error, _conversationId, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousConversationId) {
        setCurrentConversationId(context.previousConversationId);
        setMessages(context.previousMessages || []);
      }
      console.error('Delete error:', error);
      toast({ title: t('chat.delete_error', 'Failed to delete session'), description: t('chat.delete_error_desc', 'Please try again.'), variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const handleDeleteConversation = (conversationId, opener) => {
    deleteReturnFocusRef.current = opener || document.activeElement;
    setPendingDeleteId(conversationId);
  };

  const handleBulkDeleteConversations = async (ids) => {
    if (!ids?.length) return;

    queryClient.setQueryData(['conversations'], (old = []) =>
      old.filter((c) => !ids.includes(c.id))
    );
    ids.forEach((id) => guardedAssistantMemoryByConversationRef.current.delete(id));

    if (ids.includes(currentConversationId)) {
      setAttachedFile(null);
      clearLocalAudioDraft();
      setCurrentConversationId(null);
      setMessages([]);
      lastConfirmedMessagesRef.current = [];
    }

    await Promise.all(
      ids.map((id) =>
        base44.entities.UserDeletedConversations.create({
          agent_conversation_id: id,
          conversation_title: conversations.find((c) => c.id === id)?.metadata?.name || 'Deleted Session'
        }).catch(() => {})
      )
    );
    refetchConversations();
  };
  const handleCheckInComplete = async (checkinData) => {
    if (!currentConversationId) return;

    const conversation = await base44.agents.getConversation(currentConversationId);
    setIsLoading(true);

    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: "I've completed my Daily Check-in.",
      metadata: { checkin_data: checkinData }
    });

    // Invalidate queries to update Home page
    queryClient.invalidateQueries({ queryKey: ['todayMood'] });
    queryClient.invalidateQueries({ queryKey: ['todayFlow'] });

    setShowCheckInModal(false);
  };

  const [isPageReady, setIsPageReady] = useState(false);

  useEffect(() => {
    // Signal page is ready for E2E tests
    document.body.setAttribute('data-page-ready', 'true');
    setIsPageReady(true);

    // Expose report function globally for testing
    window.printChatStabilityReport = printFinalStabilityReport;

    // Detect test environment (Playwright, Cypress, etc.)
    const isTestEnv =
    window.location.search.includes('e2e-test') ||
    document.body.getAttribute('data-test-env') === 'true' ||
    window.navigator.webdriver === true ||
    window.Cypress !== undefined ||
    window.playwright !== undefined ||
    /HeadlessChrome/.test(window.navigator.userAgent);

    if (isTestEnv) {
      setShowConsentBanner(false);
      setIsConsentResolved(true);
      localStorage.setItem('age_verified', 'true');
      // Disable analytics in test environment
      window.__DISABLE_ANALYTICS__ = true;
      return;
    }

    // Check age verification first
    const ageVerified = localStorage.getItem('age_verified');
    if (ageVerified === 'false') {
      setIsAgeRestricted(true);
      return;
    }
    if (!ageVerified) {
      setShowAgeGate(true);
      return;
    }

    // Consent is resolved against an owner-scoped Base44 record. Local storage
    // is only a user-bound cache and can never transfer consent between accounts.
    resolveCurrentChatConsent(base44)
      .then((hasConsent) => {
        setShowConsentBanner(!hasConsent);
        setIsConsentResolved(true);
      })
      .catch(() => {
        setShowConsentBanner(true);
        setIsConsentResolved(true);
      });

    // Run retention cleanup on app start (non-blocking)
    (async () => {
      if (!appParams.appId) return;
      try {
        const lastCleanup = localStorage.getItem('last_retention_cleanup');
        const now = Date.now();
        const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

        if (!lastCleanup || now - parseInt(lastCleanup) > cleanupInterval) {
          await base44.functions.invoke('retentionCleanup', {});
          localStorage.setItem('last_retention_cleanup', now.toString());
        }
      } catch (error) {
        console.error('Retention cleanup failed:', error);
        // Non-blocking: log but don't interrupt user
      }
    })();
  }, []);

  const handleConsentAccept = () => {
    setShowConsentBanner(false);
    setIsConsentResolved(true);
  };

  const handleAgeConfirm = () => {
    localStorage.setItem('age_verified', 'true');
    setShowAgeGate(false);
    resolveCurrentChatConsent(base44)
      .then((hasConsent) => {
        setShowConsentBanner(!hasConsent);
        setIsConsentResolved(true);
      })
      .catch(() => {
        setShowConsentBanner(true);
        setIsConsentResolved(true);
      });
  };

  const handleAgeDecline = () => {
    localStorage.setItem('age_verified', 'false');
    setShowAgeGate(false);
    setIsAgeRestricted(true);
  };

  const s2DebugBadgeBuildSha = isS2DebugEnabled()
    ? s2V8TraceCollectorRef.current.getSnapshot().build.sha
    : null;
  const s2DebugLatestTraceSource = isS2DebugEnabled()
    ? s2V8TraceCollectorRef.current.getSnapshot().activeStage
    : null;

  // Show age restriction message if user is under 18
  if (isAgeRestricted) {
    return <AgeRestrictedMessage />;
  }

  return (
    <>
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => {if (!open) setPendingDeleteId(null);}}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = deleteReturnFocusRef.current?.isConnected ? deleteReturnFocusRef.current : document.querySelector('[data-testid="chat-new-conversation"]');
          target?.focus?.({ preventScroll: true });
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-destructive" />{t('chat.delete_session_title', 'Delete this session?')}</AlertDialogTitle>
            <AlertDialogDescription>{t('chat.delete_session_desc', 'This action cannot be undone.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => {if (pendingDeleteId) deleteConversationMutation.mutate(pendingDeleteId);setPendingDeleteId(null);}}>{t('common.delete', 'Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showAuthError && <AuthErrorBanner onDismiss={() => setShowAuthError(false)} />}
      {/* Active conversations use a viewport height for their message scroll chain.
          The empty entry follows normal page flow so its complete start card is visible. */}
      <div className="garden-chat rounded-2xl flex relative"

      data-testid="chat-root"
      data-chat-empty={!currentConversationId}
      data-page-ready={isPageReady}
      style={{
        height: currentConversationId ? `calc(100dvh - var(--mobile-header-height, calc(${MOBILE_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))) - var(--mobile-bottom-nav-height, calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))))` : 'auto',
        minHeight: !currentConversationId ? `calc(100dvh - var(--mobile-header-height, calc(${MOBILE_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))) - var(--mobile-bottom-nav-height, calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))))` : undefined
      }}>

        {/* On tablet/desktop (≥768px) there is no fixed mobile header or bottom nav,
                                                  so we only subtract the safe-area insets (mirrors AppContent.jsx logic). */}
        <style>{`
          @media (min-width: 768px) {
            [data-testid="chat-root"][data-chat-empty="false"] {
              height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
            }
          }
          @media (min-width: 768px) {
            [data-testid="chat-root"][data-chat-empty="true"] {
              min-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
            }
          }
          [data-chat-empty="true"] .garden-chat-content { flex: 0 0 auto; overflow: visible; }
          @media (max-width: 767px) and (max-height: 540px) {
            body:has([data-testid="therapist-chat-input"]:focus) [data-mobile-header] { display: none; }
            body:has([data-testid="therapist-chat-input"]:focus) #app-scroll-container { padding-top: 0 !important; }
            body:has([data-testid="therapist-chat-input"]:focus) [data-testid="chat-root"][data-chat-empty="false"] {
              height: calc(100dvh - var(--mobile-bottom-nav-height, 80px)) !important;
            }
            [data-testid="chat-header"] { min-height: 44px; padding-block: 0; }
            [data-testid="chat-human-support"] { width: 44px; min-width: 44px; gap: 0; padding-inline: 8px; }
            [data-testid="chat-human-support"] span {
              position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip-path: inset(50%); white-space: nowrap;
            }
            [data-testid="chat-disclaimer"] { line-height: 12px; }
          }
        `}</style>
      <ChatConversationsSidebar open={showSidebar} desktopCollapsed={desktopSidebarCollapsed} onClose={() => setShowSidebar(false)}>
        <ErrorBoundary>
          <ConversationsList
              conversations={Array.isArray(displayConversations) ? displayConversations : []}
              currentConversationId={currentConversationId}
              onSelectConversation={loadConversation}
              onNewConversation={startNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onBulkDeleteConversations={handleBulkDeleteConversations}
              onRenameConversation={handleRenameConversation}
              onTogglePinConversation={handleTogglePinConversation}
              isPreferenceSaving={conversationPreferenceMutation.isPending}
              onClose={() => setShowSidebar(false)} />

        </ErrorBoundary>
      </ChatConversationsSidebar>

      {/* Main Chat Area */}
      <div className="rounded-2xl flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <div data-testid="chat-header" className="bg-[hsl(var(--card)/0.97)] min-h-12 px-2 py-1 rounded-2xl sm:min-h-14 sm:px-4 sm:py-2 lg:px-6 flex items-center gap-2 sm:gap-3 border-b border-border backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label={t('chat.go_back_aria')} className="text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">

            <ArrowLeft className="w-5 h-5 rtl:scale-x-[-1]" />
          </Button>
          <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              mobileLabelKey="menu" aria-label={showSidebar ? t('chat.close_sidebar_aria') : t('chat.open_sidebar_aria')} className="xl:hidden text-primary font-medium tracking-[0.005em] leading-none rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">

            <Menu className="w-5 h-5" />
          </Button>
          <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarCollapsed((collapsed) => !collapsed)}
              aria-label={desktopSidebarCollapsed ? t('chat.open_sidebar_aria') : t('chat.close_sidebar_aria')}
              aria-expanded={!desktopSidebarCollapsed}
              className="hidden xl:inline-flex h-10 w-10 rounded-[var(--radius-control)] text-primary hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">

            {desktopSidebarCollapsed
              ? <PanelLeftOpen className="h-5 w-5 rtl:scale-x-[-1]" />
              : <PanelLeftClose className="h-5 w-5 rtl:scale-x-[-1]" />}
          </Button>
          <div className="hidden md:flex flex-1 min-w-0 items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/70 text-primary flex items-center justify-center border border-border shadow-[var(--shadow-sm)]">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-foreground text-lg font-semibold truncate">{t('chat.title')}</h1>
              <p className="text-muted-foreground text-xs truncate">{t('chat.subtitle')}</p>
            </div>
            {isS2DebugEnabled() && (
              <span
                data-testid="s2-v8-debug-badge"
                className="mt-1 inline-flex rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {`v8 ${s2DebugBadgeBuildSha || 'dev'} • ${s2DebugActiveStage}${s2DebugLatestTraceSource ? ` • src:${s2DebugLatestTraceSource}` : ''}`}
              </span>
            )}
            </div>
          </div>

        {/* Risk Panel — rendered outside conversation gate so it shows even before a conversation is created */}
        {showRiskPanel && !currentConversationId &&
          <div
            ref={riskPanelRef}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            tabIndex={-1}
            className="px-4 md:px-6 pt-3">
            <InlineRiskPanel onDismiss={() => setShowRiskPanel(false)} />
          </div>
          }

        {/* Messages Area */}
        <div className="garden-chat-content text-foreground my-1 px-1 py-1 flex-1 min-h-0 overflow-hidden flex flex-col">
          {!currentConversationId ?
            <div
              data-testid="chat-empty-state-scroll"
              className="min-h-0 shrink-0 pb-3 sm:pb-4">
              {/* Welcome Section - Separate container */}
              <div data-testid="chat-empty-welcome-shell" className="p-1.5 flex items-start justify-center sm:p-4 lg:p-6">
                <Card data-testid="chat-welcome" className="bg-[hsl(var(--card)/0.97)] text-primary p-2 sm:p-6 text-center rounded-3xl backdrop-blur-xl w-full max-w-md border border-border/70 shadow-[var(--shadow-lg)]">
                  <div data-testid="chat-welcome-icon" className="mx-auto mb-1.5 sm:mb-4 rounded-xl sm:rounded-2xl w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center bg-primary text-primary-foreground shadow-[var(--shadow-md)] ring-4 ring-ring">
                    <PremiumIcon name="sparkle" size="lg" bare className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <BotanicalAccent variant="leaves" className="botanical-chat-art" /><h2 data-testid="chat-welcome-title" className="text-foreground mb-1 sm:mb-3 text-base leading-5 sm:text-2xl sm:leading-normal font-semibold tracking-tight">
                    {t('chat.welcome.title', 'Welcome to Therapy')}
                  </h2>
                  <p data-testid="chat-welcome-copy" className="text-muted-foreground mb-2 sm:mb-5 text-xs leading-4 sm:text-sm sm:leading-relaxed">
                    {t('chat.welcome.message', "This is a safe, judgment-free space. Share what's on your mind, and let's work through it together.")}
                  </p>
                  <Button
                    data-testid="chat-start-first-session"
                    onClick={startNewConversation} className="bg-primary text-primary-foreground px-5 min-h-[44px] text-sm font-semibold tracking-[0.005em] rounded-xl inline-flex items-center justify-center gap-2 whitespace-normal border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 shadow-[var(--shadow-md)] hover:bg-primary hover:shadow-[var(--shadow-lg)] active:bg-primary w-full sm:w-auto">


                    {t('chat.welcome.start_session', 'Start Your First Session')}
                  </Button>
                </Card>
              </div>

              {/* Suggestions own their spacing, so no empty strip remains. */}
                  <ErrorBoundary>
                    <ProactiveCheckIn className="mx-auto max-w-2xl p-4 md:p-6" onSendMessage={async (prompt) => {
                      await startNewConversation();
                      setTimeout(() => {
                        setInputMessage(prompt);
                      }, 500);
                    }} />
                  </ErrorBoundary>
            </div> :

            <div data-testid="chat-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll} className="my-1 flex-1 min-h-0 overflow-y-auto" style={{ backgroundColor: 'transparent', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {/* Therapy State Machine */}
              {showTherapyFlow && messages.length === 0 &&
              <div className="p-4 md:p-6" style={{ background: 'transparent' }}>
                  <TherapyStateMachine onComplete={() => setShowTherapyFlow(false)} />
                </div>
              }

              {/* Insight Cards - Show if no flow active */}
              {messages.length === 0 && !showTherapyFlow &&
                    <ErrorBoundary>
                      <ProactiveCheckIn className="mx-auto max-w-3xl p-4 md:p-6" onSendMessage={(prompt) => setInputMessage(prompt)} />
                    </ErrorBoundary>
              }

              {/* Active Chat Messages */}
              <div className="bg-transparent pb-8 p-3 sm:p-4 lg:p-6 space-y-3">
                {/* Inline Consent Banner - Non-blocking, dismissible */}
                {showConsentBanner &&
                <InlineConsentBanner onAccept={handleConsentAccept} />
                }
                {/* Inline Risk Panel - Non-blocking, shown when crisis language detected */}
                {showRiskPanel &&
                <div
                  ref={riskPanelRef}
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  tabIndex={-1}>
                  <InlineRiskPanel onDismiss={() => setShowRiskPanel(false)} />
                </div>
                }
                {/* Profile-specific periodic disclaimer */}
                <ProfileSpecificDisclaimer messageCount={messages.length} />
                {/* Phase 8 — Upgraded-path UI indicators (flag-gated, hidden in default mode).
                             SafetyModeIndicator is SUBORDINATE to InlineRiskPanel/CrisisSafetyPanel.
                             Neither component renders when the upgrade flags are off. */}
                <ErrorBoundary>
                  <SafetyModeIndicator
                    wiring={ACTIVE_CBT_THERAPIST_WIRING}
                    isActive={safetyModeActive} />
                  
                </ErrorBoundary>
                <ErrorBoundary>
                  <SessionPhaseIndicator
                    wiring={ACTIVE_CBT_THERAPIST_WIRING}
                    hasActiveSession={!!currentConversationId} />
                  
                </ErrorBoundary>
                {/* Phase 3 Deep Personalization — Session continuity cue (flag-gated) */}
                <ErrorBoundary>
                  <SessionContinuityCue
                    wiring={ACTIVE_CBT_THERAPIST_WIRING}
                    hasActiveSession={!!currentConversationId}
                    messageCount={messages.length} />
                  
                </ErrorBoundary>
                {messages.length > visibleCount &&
                <div className="text-center py-2">
                    <button
                    onClick={() => setVisibleCount((prev) => Math.min(prev + 30, messages.length))}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full border border-border/50">
                      {t('chat_stage2.load_earlier')}
                    </button>
                  </div>
                }
                <MessageList
                  messages={messages}
                  visibleCount={visibleCount}
                  conversationId={currentConversationId}
                  sessionLanguage={sessionLanguageRef.current}
                />
                {((isLoading && currentConversationId) || (isConversationInitializing && messages.length === 0)) && (() => {
                  instrumentationRef.current.PLACEHOLDER_RENDERED++;
                  return (
                    <div
                      data-testid="chat-loading"
                      ref={thinkingPlaceholderRef}
                      className="flex gap-3"
                      style={{
                        minHeight: '60px',
                        transition: 'opacity 0.2s ease-in-out'
                      }}>

                      <div className="h-7 w-7 flex items-center justify-center flex-shrink-0 rounded-[var(--radius-nested)] bg-secondary">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 flex-1 bg-card border border-border/80" style={{
                        minHeight: '48px',
                        maxHeight: '120px',
                        transition: 'none',
                        willChange: 'auto'
                      }}>
                        <p className="text-sm text-muted-foreground" aria-live="polite">
                          {messages.length === 0
                            ? t('chat_stage.opening_preview')
                            : responseWaitSeconds >= 20
                              ? t('chat.wait.still_working')
                              : responseWaitSeconds >= 8
                                ? t('chat.wait.checking_context')
                                : t('chat.wait.preparing')}
                        </p>
                      </div>
                    </div>);

                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Save Prompt - After homework commitment */}
              {showSavePrompt && !isLoading && savePromptData &&
              <div className="p-4 md:p-6 border-t border-border/70 bg-secondary/35">
                  <div className="max-w-3xl mx-auto">
                    <ThoughtWorkSaveHandler
                    conversationId={savePromptData.conversationId}
                    conversationMessages={savePromptData.messages}
                    onSaveComplete={() => {
                      setShowSavePrompt(false);
                      setSavePromptData(null);
                    }}
                    onCancel={() => {
                      setShowSavePrompt(false);
                      setSavePromptData(null);
                    }} />

                  </div>
                </div>
              }

              {/* Summary Prompt Section - Separate container with border */}
              {showSummaryPrompt && summaryPromptConversationId === currentConversationId && !isLoading &&
              <div data-testid="summary-prompt-card" className="p-4 md:p-6">
                  <div className="max-w-3xl mx-auto">
                    <Card className="p-4 border border-border/80 bg-card shadow-[var(--shadow-md)]">
                      <div className="flex items-start gap-3">
                        <div className="bg-secondary text-primary rounded-[var(--radius-control)] w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="text-primary lucide lucide-sparkles w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-primary mb-1 text-sm font-medium">
                            {t('chat.summary_prompt.title')}
                          </p>
                          <p className="text-primary mb-3 text-xs">
                            {t('chat.summary_prompt.description')}
                          </p>
                          <div className="flex gap-2">
                            <Button
                            onClick={requestSummary}
                            size="sm" className="bg-primary text-primary-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-8 min-h-[44px] md:min-h-0">

                              {t('chat.summary_prompt.yes')}
                            </Button>
                            <Button
                            onClick={() => setShowSummaryPrompt(false)}
                            size="sm"
                            variant="outline" className="bg-card text-foreground px-3 text-xs font-medium tracking-[0.005em] rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-border/70 shadow-[var(--shadow-sm)] hover:bg-secondary/92 hover:text-foreground active:bg-secondary/96 h-8 min-h-[44px] md:min-h-0">

                              {t('chat.summary_prompt.not_now')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              }
              {currentConversationData?.session_summary && <SessionSummary conversation={currentConversationData} />}
            </div>
            }
        </div>

        {/* Composer stays above conversation content; the empty page respects app navigation. */}
        <div data-testid="chat-composer" className="bg-[hsl(var(--card)/0.97)] text-foreground rounded-2xl px-2 py-1 sm:px-4 sm:py-2 lg:px-5 relative border-t border-border/70 backdrop-blur-xl shadow-[var(--shadow-md)]" style={{
            zIndex: currentConversationId ? 50 : 20
          }}>
          <div className="text-primary mx-auto max-w-5xl flex min-w-0">
            {variantProfileBlocked ?
              <div className="flex-1 flex flex-col gap-3">
                <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  {t('chat.variant_blocked.message', 'This past conversation can no longer be continued. You can still read it here.')}
                </div>
                <Button
                  onClick={startNewConversation}
                  className="bg-primary text-primary-foreground font-medium rounded-[var(--radius-card)] border border-transparent transition-all duration-200 shadow-[var(--shadow-md)] hover:bg-primary/92 min-h-[44px] md:min-h-0 h-[48px] w-full">
                  {t('chat.variant_blocked.start_new', 'Start a new conversation')}
                </Button>
              </div> :

              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                  data-testid="chat-file-input"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex flex-col flex-1 gap-1 min-w-0">
                  {attachedFile && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/70 border border-border text-xs text-primary">
                      <Paperclip className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[160px]">{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} aria-label={t('chat.attachments.remove_button_aria')} className="ms-auto flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl p-2 text-primary hover:bg-secondary">✕<span className="mobile-action-label md:hidden">{t('chat.attachments.remove_button_aria')}</span></button>
                    </div>
                  )}
                  {messages.filter((message) => message.role === 'user').length === 0 && !inputMessage.trim() && (
                    <div className="mb-1 flex min-w-0 flex-col items-stretch gap-2 rounded-2xl border border-border bg-[hsl(var(--card)/0.97)] p-1.5 sm:block sm:p-2.5" data-testid="chat-intent-chooser">
                      <p className="mb-0 shrink-0 text-[10px] font-semibold leading-4 text-muted-foreground sm:mb-2 sm:w-auto sm:text-xs">{t('chat_stage.intent_label')}</p>
                      <div data-testid="chat-intent-options" className="grid min-w-0 grid-cols-3 gap-2">
                        <Button type="button" variant="outline" size="sm" className="min-h-10 h-auto min-w-0 whitespace-normal rounded-xl border-border text-primary px-2 py-2 text-xs leading-4 sm:text-sm" onClick={() => handleChatIntentChoice('chat_intent_listen', t('chat_stage.intent.unload_prompt'))}>
                          {t('chat_stage.intent.unload')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="min-h-10 h-auto min-w-0 whitespace-normal rounded-xl border-border text-primary px-2 py-2 text-xs leading-4 sm:text-sm" onClick={() => handleChatIntentChoice('chat_intent_practical', t('chat_stage.intent.practical_prompt'))}>
                          {t('chat_stage.intent.practical')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="min-h-10 h-auto min-w-0 whitespace-normal rounded-xl border-border text-primary px-2 py-2 text-xs leading-4 sm:text-sm" onClick={() => handleChatIntentChoice('chat_intent_guided', t('chat_stage.intent.guided_prompt'))}>
                          <Sparkles className="me-1 h-4 w-4" />
                          {t('chat_stage.intent.guided')}
                        </Button>
                      </div>
                    </div>
                  )}
                  {isLoading && (
                    <p className="px-1 text-xs leading-5 text-primary">{t('chat_stage.queue_hint')}</p>
                  )}
                  <div data-testid="chat-composer-row" className="flex min-w-0 items-end gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => {
                        inputMessageRef.current = e.target.value;
                        setInputMessage(e.target.value);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={t('chat.message_placeholder')} className="bg-[hsl(var(--surface-nested)/0.9)] text-foreground px-3 font-normal tracking-[0.001em] leading-6 rounded-[var(--radius-card)] flex min-w-0 flex-1 border border-input/90 shadow-[var(--shadow-sm)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px] max-h-[160px] resize-none"
                      data-testid="therapist-chat-input"
                      enterKeyHint="send"
                      autoCapitalize="sentences"
                      autoComplete="off"
                      autoCorrect="on"
                      disabled={isConversationInitializing || isUploadingFile} />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!inputMessage.trim() && !attachedFile) || isConversationInitializing || isUploadingFile || isTranscribingAudio || !isConsentResolved || showConsentBanner}
                      mobileLabelKey="send" aria-label={t('mobile_actions.send')} data-testid="therapist-chat-send" className="bg-primary text-primary-foreground px-4 py-2 font-medium tracking-[0.005em] leading-none rounded-[var(--radius-card)] inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[var(--shadow-md)] hover:bg-primary/92 hover:shadow-[var(--shadow-lg)] active:bg-primary/95 h-[48px] min-h-[48px] w-[48px] flex-shrink-0 p-0 sm:h-[44px] sm:min-h-[44px] sm:w-[44px]">
                      {isUploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                  </div>
                  <div data-testid="chat-actions-row" className="flex min-w-0 items-center flex-wrap gap-1 px-1 py-0.5 sm:gap-2 sm:py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}
                      aria-label={t('chat.attachments.attach_button_aria')}
                      className="text-primary h-[44px] w-[44px] min-h-[44px] min-w-[44px] hover:bg-secondary/70" mobileLabelKey="attach">
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    {audioDraftStatus === 'idle' &&
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleStartRecording}
                          disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}
                          aria-label={t('chat.voice.record_aria')}
                          className="text-primary hover:bg-secondary/70 min-h-[44px] min-w-[44px] px-3">
                        <Mic className="w-4 h-4 mr-1" />
                        {t('chat.voice.record')}
                      </Button>
                    }
                    {audioDraftStatus === 'recording' &&
                      <>
                        <span className="inline-flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          {t('chat.voice.recording')}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleStopRecording}
                          aria-label={t('chat.voice.stop_aria')}
                          className="text-red-700 hover:bg-red-100 min-h-[44px] min-w-[44px] px-3">
                          <Square className="w-4 h-4 mr-1" />
                          {t('chat.voice.stop')}
                        </Button>
                      </>
                    }
                    {audioDraftStatus === 'recorded' && audioDraftUrl &&
                      <>
                        <span className="inline-flex items-center gap-1 text-xs text-primary bg-secondary/70 border border-border px-2 py-1 rounded-full">
                          {t('chat.voice.ready')}
                        </span>
                        <audio ref={audioDraftPlayerRef} src={audioDraftUrl} className="hidden" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handlePlayRecording}
                          disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}
                          aria-label={t('chat.voice.play_aria')}
                          className="text-primary hover:bg-secondary/70 min-h-[44px] min-w-[44px] px-3">
                          <Play className="w-4 h-4 mr-1" />
                          {t('chat.voice.play')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleTranscribeRecording}
                          disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}
                          aria-label={t('chat.voice.transcribe_aria')}
                          className="text-primary hover:bg-secondary/70 min-h-[44px] min-w-[44px] px-3">
                          {isTranscribingAudio ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                          {isTranscribingAudio ? t('chat.voice.transcribing') : t('chat.voice.transcribe')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteRecording}
                          disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}
                          aria-label={t('chat.voice.delete_aria')}
                          className="text-red-700 hover:bg-red-100 min-h-[44px] min-w-[44px] px-3">
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('chat.voice.delete')}
                        </Button>
                      </>
                    }
                    <Link
                      to="/contact"
                      data-testid="chat-human-support"
                      aria-label={getHumanSupportCopy(i18n.resolvedLanguage || i18n.language).buttonLabel}
                      className="ms-auto inline-flex min-h-11 max-w-full shrink-0 gap-2 px-3 py-2 items-center justify-center rounded-full border border-border bg-[hsl(var(--card)/0.97)] text-xs font-semibold text-primary shadow-[var(--shadow-sm)] hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-auto sm:w-auto sm:min-h-10 sm:gap-2 sm:rounded-full sm:px-3 sm:py-2"
                    >
                      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                      <span className="whitespace-normal">{getHumanSupportCopy(i18n.resolvedLanguage || i18n.language).buttonLabel}</span>
                    </Link>
                  </div>
                </div>

              </>
              }
          </div>
          {deliveryStatus !== 'idle' && (
            <p
              role="status"
              aria-live="polite"
              data-testid="chat-delivery-status"
              className={`text-center mt-1 text-xs ${deliveryStatus === 'failed' ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}
            >
              {t(`chat.delivery.${deliveryStatus}`)}
            </p>
          )}
          {/* Compact disclaimer */}
          <p data-testid="chat-disclaimer" className="mt-0.5 px-2 text-center text-[10px] leading-4 text-muted-foreground sm:text-xs">
            {t('chat.disclaimer.title')} — {t('chat.disclaimer.message')}
          </p>
        </div>

      {/* Enhanced Check-in Modal - highest z-index when active */}
      {showCheckInModal &&
          <div style={{ zIndex: 100 }}>
          <EnhancedMoodCheckIn
              onClose={() => setShowCheckInModal(false)}
              onComplete={handleCheckInComplete} />

        </div>
          }

      {/* Age Gate Modal - appears before consent */}
      {showAgeGate &&
          <AgeGateModal onConfirm={handleAgeConfirm} onDecline={handleAgeDecline} />
          }
      </div>
      </div>
    </>);

}
