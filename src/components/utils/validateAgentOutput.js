/**
 * Non-breaking validator for CBT agent structured output.
 * Returns validated/normalized JSON or null if invalid (falls back gracefully).
 *
 * SAFETY RULES:
 * - Strips any medical/diagnostic language from assistant_message
 * - Blocks responses with harmful advice patterns
 * - Ensures no raw JSON or metadata leaks
 *
 * Phase 3 — TherapeuticForms chat integration:
 * - Detects [FORM:slug] and [FORM:slug:lang] markers in assistant messages.
 * - Strips markers from visible content.
 * - Resolves approved forms via resolveFormIntent and injects generated_file metadata.
 * - No arbitrary URL from model input is ever accepted.
 */
import { resolveFormIntent, resolveFormIntentRequest, FORM_INTENT_MARKER_PATTERN } from '../../utils/resolveFormIntent.js';
import { resolveWorkbookIntentWithContext, resolveEnglishWorkbookIntentWithContext, resolveSpanishWorkbookIntentWithContext, } from '../../utils/resolveWorkbookIntent.js';
import { getAllTherapeuticForms, SUPPORTED_LANGUAGES, MAX_GENERATED_FILES_PER_RESPONSE } from '../../data/therapeuticForms/index.js';
import { THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER } from '../../lib/therapeuticFormsPolicy.js';
import { normalizeGeneratedFile } from '../chat/utils/normalizeGeneratedFile.js';
import { sanitizeCaseFormulationUpdateForClient } from '../../lib/caseFormulationValidator.js';
// Safety patterns to detect and strip
const UNSAFE_PATTERNS = [
    /\b(you (have|might have) (depression|anxiety|PTSD|bipolar|schizophrenia))\b/gi,
    /\b(I (can )?(diagnose|prescribe))\b/gi,
    /\b(take (this|these) (medication|drug)s?)\b/gi
];
// CRITICAL: Forbidden reasoning patterns (NO REASONING LEAKAGE)
const FORBIDDEN_REASONING_PATTERNS = [
    /^\s*THOUGHT\b/mi,
    /^\s*THOUGHT\s*:/mi,
    /^\s*THINKING\b/mi,
    /^\s*THINKING\s*:/mi,
    /^\s*ANALYSIS\s*:/mi,
    /^\s*REASONING\s*:/mi,
    /^\s*INTERNAL\s*:/mi,
    /^\s*SYSTEM\s*:/mi,
    /^\s*DEVELOPER\s*:/mi,
    /^\s*PLAN\s*:/mi,
    /^\s*CHECKLIST\s*:/mi,
    /^\s*STEP\s+\d+\s*:/mi,
    /^\s*CONFIDENCE\s*:/mi,
    /^\s*NOTE\s*:/mi,
    /^\s*CONTEXT\s*:/mi,
    /^\s*OBSERVATION\s*:/mi,
    /^\s*LOCKED_DOMAIN/mi,
    /^\s*RULE ZERO/mi,
    /^\s*CP\d+\b/mi,
    /^I should\b/mi,
    /^I need to\b/mi,
    /^First I'll\b/mi,
    /^Then I'll\b/mi,
    /^My goal is\b/mi,
    /^The next step is\b/mi,
    /^\[checking/mi,
    /^\[internal/mi,
    /^\[validation/mi,
    /^\[constraint/mi,
    /^\[protocol/mi,
    /^\[thinking/mi,
    /^\[reasoning/mi,
    /^\[thought/mi,
    /^\[THOUGHT/mi,
    /\bconstraint checklist\b/i,
    /\bmental sandbox\b/i,
    /\bconfidence score\b/i
];
// Inline patterns — tool names, entity names, field names, schema labels — must not appear anywhere on a line
const FORBIDDEN_INLINE_REASONING_PATTERNS = [
    /retrieveCurriculumUnit/i,
    /retrieveTherapistMemory/i,
    /writeTherapistMemory/i,
    /retrieveTrustedCBTContent/i,
    /retrieveRelevantContent/i,
    // Entity names exposed as tool targets
    /\bThoughtJournal\b/,
    /\bMoodEntry\b/,
    /\bCompanionMemory\b/,
    /\bSessionSummary\b/,
    /\bDailyFlow\b/,
    /\bCrisisAlert\b/,
    /\bCaseFormulation\b/,
    /\bTherapyFeedback\b/,
    /\bCoachingSession\b/,
    /\bProactiveReminder\b/,
    /\bclinical_topic\b/i,
    /\bunit_type\b/i,
    /\blinked_hierarchy_level\b/i,
    /\blinked_outcome_patterns\b/i,
    /\bpriority_score\b/i,
    /\bwhen_to_use\b/i,
    /\bagent_usage_rules\b/i,
    /\bdirective_rewrite_pattern\b/i,
    /\bsource_chunk_ids\b/i,
    /\bblocker_resolution\b/i,
    /\bmicro_step_ladder\b/i,
    /\boutcome_interpretation\b/i,
    /\bphrasing_pattern\b/i,
    /\bmultilingual_response_pattern\b/i,
    /\bformulation_to_action\b/i,
    /\banxiety_cycle_mapping\b/i,
    /\bgrounding_calming\b/i,
    /\bbalanced_thought_work\b/i,
    /\bcoping_plan\b/i,
    /\bself_observation\b/i,
    /\bsleep_intervention\b/i,
    /\bcompleted_step_with_distress\b/i,
    /\bcompleted_step_with_learning\b/i,
    /\bpartial_completion\b/i,
    /\bavoidance_or_noncompletion\b/i,
    /\bstep_too_hard\b/i,
    /\bstep_too_easy\b/i,
    /\bemotional_flooding\b/i,
    /\bno_clear_change\b/i,
    /\bnew_specific_fear_discovered\b/i,
    /\breturn_after_two_steps\b/i,
    /\bLOCKED_DOMAIN\b/i,
    /\bINTERVENTION_MODE\b/i,
    /A(?:\u2192|->)B(?:\u2192|->)C(?:\u2192|->)D(?:\u2192|->)E/,
    /A\s*\u2192\s*B\s*\u2192\s*C/,
    /A\s*->\s*B\s*->\s*C/,
    /\bcurrent_issue\b/i,
    /\bnext_recommended_step\b/i,
    /\bintervention_mode\b/i,
    /\blatest_completed_step\b/i,
    /\blatest_outcome_pattern\b/i,
    /\bdifficulty_level\b/i,
    /\bspecific_fear_discovered\b/i,
    /\bunresolved_blocker\b/i,
    /\bfollow_up_tasks\b/i,
    /\btherapist_memory_version\b/i,
    // English internal-analysis phrases (leak into non-English sessions)
    /\bBased on (?:memory|stored data|prior session|the memory)\b/i,
    /\bAccording to (?:stored|memory|my records)\b/i,
    /\bMemory (?:indicates|shows|records|says)\b/i,
    /\bThe system has\b/i,
    /\bI(?:'ll| will) (?:now |classify |evaluate |check |apply |retrieve |call |use )(?:the |this )?(?:memory|curriculum|tool|unit|pattern|domain|gate|rule)/i,
    /\bLet me (?:evaluate|check|classify|apply|retrieve|call|analyze|assess) (?:the |this )?(?:memory|domain|pattern|current|topic|message|gate)/i,
    /\bNow I(?:'ll| need to| will) (?:check|evaluate|classify|apply|call|retrieve)/i,
    /\bChecking (?:the |for )?(?:gate|domain|rule|condition|memory|pattern)/i,
    /\bApplying (?:the |this )?(?:gate|rule|pattern|domain|CP\d|RULE ZERO|curriculum)/i,
    /\bDomain (?:lock|classification|check|match):/i,
    /\bLOCKED_DOMAIN\s*=/i,
    /\bGate (?:passes|fails|blocked|check)/i,
    /\bContinuity (?:gate|opener|check|suppressed)/i
];
export const ATTACHMENT_METADATA_MARKER_PREFIX = '[ATTACHMENT_METADATA]';
export const PDF_ANALYSIS_OVERFLOW_METADATA_KEY = 'pdf_analysis_overflow';
// ─── Phase 3B: Session language normalization ─────────────────────────────────
/** ISO language codes supported by the TherapeuticForms library. */
const SUPPORTED_LANG_SET = new Set(SUPPORTED_LANGUAGES);
const NO_FORMS_ACCESS_PATTERNS = [
    /\b(?:i\s+(?:do not|don't|have no)\s+(?:currently\s+)?(?:have\s+)?access\s+to\s+(?:the\s+)?(?:therapeutic\s+)?forms?)\b/i,
    /\b(?:i\s+(?:cannot|can't|am unable to)\s+access\s+(?:the\s+)?(?:therapeutic\s+)?forms?)\b/i,
    /\b(?:i\s+(?:do not|don't|have no)\s+(?:currently\s+)?(?:have\s+)?access\s+to\s+(?:any\s+)?worksheets?)\b/i,
];
const THERAPEUTIC_FORMS_ACCESS_CORRECTION = 'I can use the installed therapeutic forms catalog. Tell me the worksheet number, form name, language, or goal and I’ll look for the closest approved match.';
const FORM_REFUSAL_PATTERNS = [
    ...NO_FORMS_ACCESS_PATTERNS,
    /\b(?:cannot|can't|unable to)\s+(?:send|attach|share)\s+(?:that\s+)?(?:form|worksheet)\b/i,
    /\b(?:technical issue|system issue)\b/i,
    /\b(?:cannot|can't|unable to)\s+(?:retrieve|get|find)\s+(?:forms?|worksheets?)\b/i,
    /\b(?:no access|without access)\s+to\s+(?:forms?|worksheets?)\b/i,
    /\b(?:cannot|can't|unable to)\s+directly\s+send\b/i,
];
/**
 * Normalizes a language code to a supported app language code.
 * Returns 'en' if the value is missing, unsupported, or not a string.
 *
 * @param {*} lang
 * @returns {'en'|'he'|'es'|'fr'|'de'|'it'|'pt'}
 */
export function normalizeSessionLanguage(lang) {
    if (typeof lang !== 'string' || !lang.trim())
        return 'en';
    const code = lang.trim().toLowerCase().split('-')[0]; // handle e.g. "he-IL"
    return SUPPORTED_LANG_SET.has(code) ? code : 'en';
}
function hasExplicitLanguageRequestFor(userQuery, targetLanguage) {
    if (typeof userQuery !== 'string' || !userQuery.trim())
        return false;
    const text = userQuery.trim().toLowerCase();
    if (targetLanguage === 'en')
        return /(english|באנגלית|אנגלית)/i.test(text);
    if (targetLanguage === 'he')
        return /(hebrew|בעברית|עברית)/i.test(text);
    if (targetLanguage === 'es')
        return /(spanish|español|ספרדית)/i.test(text);
    if (targetLanguage === 'pt')
        return /(portuguese|português|פורטוגזית)/i.test(text);
    if (targetLanguage === 'fr')
        return /(french|français|צרפתית)/i.test(text);
    if (targetLanguage === 'de')
        return /(german|deutsch|גרמנית)/i.test(text);
    if (targetLanguage === 'it')
        return /(italian|italiano|איטלקית)/i.test(text);
    return false;
}
const PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT = 420;
const IMAGE_ASSISTANT_SHORT_REPLY_CHAR_LIMIT = 320;
const IMAGE_ASSISTANT_MAX_SENTENCES = 3;
const PDF_ASSISTANT_MAX_PARAGRAPH_SENTENCES = 3;
const PDF_ASSISTANT_MAX_BULLETS = 4;
const PDF_ASSISTANT_INTRO_CHAR_LIMIT = 180;
const PDF_ASSISTANT_BULLET_MODE_SENTENCE_CAP = 10;
// Search near the split target for a natural line break so the short chat reply
// ends cleanly (usually after a bullet or sentence) instead of mid-phrase.
const PDF_SPLIT_NEWLINE_LOOKBACK = 100;
const PDF_SPLIT_NEWLINE_LOOKAHEAD = 120;
// Do not split when the remainder would be tiny; tiny tails feel like truncation
// noise and are better kept inline with the short response.
const PDF_MIN_OVERFLOW_LENGTH = 80;
// OCR/extraction dumps often produce very long, punctuation-free lines.
// This threshold suppresses those lines in main chat while keeping normal prose.
const PDF_RAW_LINE_MIN_WORDS = 28;
function normalizeAttachmentMetadata(candidate) {
    if (!candidate || typeof candidate !== 'object')
        return null;
    const type = candidate.type === 'image' || candidate.type === 'pdf' || candidate.type === 'file' || candidate.type === 'audio'
        ? candidate.type
        : null;
    const url = typeof candidate.url === 'string' && candidate.url.trim() ? candidate.url.trim() : null;
    if (!type || !url)
        return null;
    return {
        type,
        url,
        name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : undefined,
        size: typeof candidate.size === 'number' && Number.isFinite(candidate.size) && candidate.size >= 0 ? candidate.size : undefined
    };
}
export function serializeAttachmentMetadataMarker(attachment) {
    const normalized = normalizeAttachmentMetadata(attachment);
    if (!normalized)
        return '';
    return `${ATTACHMENT_METADATA_MARKER_PREFIX}${JSON.stringify(normalized)}`;
}
export function extractAttachmentMetadataFromUserContent(content) {
    if (typeof content !== 'string') {
        return { content, attachment: null };
    }
    const markerIndex = content.lastIndexOf(ATTACHMENT_METADATA_MARKER_PREFIX);
    if (markerIndex === -1) {
        return { content, attachment: null };
    }
    const beforeMarker = content.slice(0, markerIndex).replace(/\n+$/, '');
    const rawPayload = content.slice(markerIndex + ATTACHMENT_METADATA_MARKER_PREFIX.length).trim();
    if (!rawPayload) {
        return { content: beforeMarker, attachment: null };
    }
    try {
        const parsed = JSON.parse(rawPayload);
        const normalized = normalizeAttachmentMetadata(parsed);
        return { content: beforeMarker, attachment: normalized };
    }
    catch (_) {
        return { content, attachment: null };
    }
}
function stripAttachmentContextBlock(content) {
    if (typeof content !== 'string')
        return content;
    return content.replace(/\n?\[ATTACHMENT_CONTEXT\][\s\S]*$/, '').trim();
}
function stripFormRouterContextBlock(content) {
    if (typeof content !== 'string')
        return content;
    return content.replace(/\n?\[FORM_ROUTER_CONTEXT\][\s\S]*$/, '').trim();
}
function getVisibleUserContentForIntent(rawContent) {
    if (typeof rawContent !== 'string')
        return '';
    let content = rawContent.trim();
    if (!content || content.startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER))
        return '';
    if (content.startsWith('[START_SESSION]')) {
        const lastEndMarkerMatch = content.match(/=== END [^\n]+ ===/g);
        let splitPos = -1;
        if (lastEndMarkerMatch) {
            const lastMarker = lastEndMarkerMatch[lastEndMarkerMatch.length - 1];
            const lastMarkerIdx = content.lastIndexOf(lastMarker);
            const sepIdx = content.indexOf('\n\n', lastMarkerIdx + lastMarker.length);
            if (sepIdx !== -1)
                splitPos = sepIdx;
        }
        else {
            const firstSep = content.indexOf('\n\n');
            if (firstSep !== -1)
                splitPos = firstSep;
        }
        if (splitPos === -1)
            return '';
        content = content.substring(splitPos + 2).trim();
    }
    const { content: contentWithoutAttachmentMarker } = extractAttachmentMetadataFromUserContent(content);
    return stripFormRouterContextBlock(stripAttachmentContextBlock(contentWithoutAttachmentMarker));
}
function hasFormRefusalLikeContent(content) {
    const sanitized = typeof content === 'string' ? content : '';
    return FORM_REFUSAL_PATTERNS.some((pattern) => pattern.test(sanitized));
}
function normalizeGeneratedFilesList(files, maxItems = MAX_GENERATED_FILES_PER_RESPONSE) {
    if (!Array.isArray(files))
        return [];
    const seen = new Set();
    const normalized = [];
    for (const candidate of files) {
        const safe = normalizeGeneratedFile(candidate);
        if (!safe)
            continue;
        const key = String(safe.form_id || safe.url || '');
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        normalized.push(safe);
        if (normalized.length >= maxItems)
            break;
    }
    return normalized;
}
function applyDeterministicFormRouteToAssistant({ content, metadata, formRoute }) {
    // Guard only applies when the canonical registry is non-empty; when empty,
    // this function remains no-op so standard fallback copy can be used upstream.
    if (!formRoute?.intent || !formRoute?.stats || formRoute.stats.total <= 0) {
        return {
            content,
            metadata,
        };
    }
    const intentType = formRoute.intent.type;
    const nextMetadata = { ...(metadata || {}) };
    const routeGeneratedFiles = Array.isArray(formRoute.generatedFiles)
        ? formRoute.generatedFiles.filter(Boolean)
        : [];
    if (formRoute.generatedFile && !nextMetadata.generated_file) {
        nextMetadata.generated_file = formRoute.generatedFile;
    }
    if (routeGeneratedFiles.length > 0 && !Array.isArray(nextMetadata.generated_files)) {
        nextMetadata.generated_files = routeGeneratedFiles.slice(0, formRoute.maxGeneratedFiles || 5);
    }
    if (!nextMetadata.generated_file && Array.isArray(nextMetadata.generated_files) && nextMetadata.generated_files.length > 0) {
        nextMetadata.generated_file = nextMetadata.generated_files[0];
    }
    const deterministicText = typeof formRoute.responseText === 'string' ? formRoute.responseText.trim() : '';
    const shouldForceDeterministicText = intentType.startsWith('list_') ||
        intentType === 'forms_capability_query' ||
        intentType === 'search_forms_by_need' ||
        hasFormRefusalLikeContent(content) ||
        (intentType.startsWith('send_') && !nextMetadata.generated_file);
    if (Array.isArray(nextMetadata.generated_files)) {
        nextMetadata.generated_files = normalizeGeneratedFilesList(nextMetadata.generated_files, formRoute.maxGeneratedFiles || 5);
        if (nextMetadata.generated_files.length === 0) {
            delete nextMetadata.generated_files;
        }
    }
    if (nextMetadata.generated_file) {
        const normalizedSingle = normalizeGeneratedFile(nextMetadata.generated_file);
        if (normalizedSingle) {
            nextMetadata.generated_file = normalizedSingle;
        }
        else {
            delete nextMetadata.generated_file;
        }
    }
    if (!nextMetadata.generated_file && Array.isArray(nextMetadata.generated_files) && nextMetadata.generated_files.length > 0) {
        nextMetadata.generated_file = nextMetadata.generated_files[0];
    }
    nextMetadata.deterministic_form_route = {
        intent_type: intentType,
        registry_total: formRoute.stats.total,
        matched_count: Array.isArray(formRoute.matches) ? formRoute.matches.length : 0,
        nearest_count: Array.isArray(formRoute.nearestMatches) ? formRoute.nearestMatches.length : 0,
        used_fallback_language: formRoute.usedFallbackLanguage === true,
        available_languages: Array.isArray(formRoute.availableLanguages) ? formRoute.availableLanguages : [],
    };
    return {
        content: shouldForceDeterministicText && deterministicText ? deterministicText : content,
        metadata: nextMetadata,
    };
}
function getAttachmentContextType(message) {
    if (!message || message.role !== 'user')
        return null;
    const attachmentType = message?.metadata?.attachment?.type;
    if (attachmentType === 'pdf' || attachmentType === 'image')
        return attachmentType;
    if (typeof message?.content === 'string') {
        if (message.content.includes('[ATTACHMENT_CONTEXT]') && /type:\s*pdf/i.test(message.content))
            return 'pdf';
        if (message.content.includes('[ATTACHMENT_CONTEXT]') && /type:\s*image/i.test(message.content))
            return 'image';
    }
    return null;
}
function splitSentences(text) {
    if (typeof text !== 'string')
        return [];
    return text
        .replace(/\s+/g, ' ')
        .trim()
        .match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) || [];
}
function clampTextBySentences(text, maxSentences, maxChars) {
    const normalized = typeof text === 'string' ? text.trim() : '';
    if (!normalized)
        return '';
    const sentences = splitSentences(normalized);
    let compact = sentences.length > 0 ? sentences.slice(0, maxSentences).join(' ').trim() : normalized;
    if (compact.length > maxChars) {
        compact = compact.slice(0, maxChars).trim().replace(/[,:;\s-]+$/g, '');
        if (compact && !/[.!?…]$/.test(compact))
            compact += '…';
    }
    return compact;
}
function keepSingleFollowUpPrompt(text) {
    const sentences = splitSentences(text);
    if (sentences.length <= 1)
        return typeof text === 'string' ? text.trim() : '';
    const next = [];
    let questionUsed = false;
    for (const sentence of sentences) {
        const isQuestion = /\?$/.test(sentence);
        if (isQuestion) {
            if (questionUsed)
                continue;
            questionUsed = true;
        }
        next.push(sentence);
    }
    return next.join(' ').trim();
}
function shapeImageAssistantReply(content) {
    const compact = clampTextBySentences(content, IMAGE_ASSISTANT_MAX_SENTENCES, IMAGE_ASSISTANT_SHORT_REPLY_CHAR_LIMIT);
    return keepSingleFollowUpPrompt(compact);
}
function isLikelyRawPdfExtractionLine(line) {
    if (typeof line !== 'string')
        return false;
    const normalized = line.trim();
    if (!normalized)
        return false;
    if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(normalized))
        return true;
    if (/^[-_=]{3,}$/.test(normalized))
        return true;
    const words = normalized.split(/\s+/).filter(Boolean);
    const punctuationCount = (normalized.match(/[.!?]/g) || []).length;
    return words.length >= PDF_RAW_LINE_MIN_WORDS && punctuationCount === 0;
}
function shapePdfAssistantReply(content) {
    const normalized = typeof content === 'string' ? content.trim() : '';
    if (!normalized)
        return '';
    const lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^extracted_text\s*:/i.test(line) && !/^\[PDF_TEXT\]/i.test(line))
        .filter((line) => !isLikelyRawPdfExtractionLine(line));
    const bulletLines = lines.filter((line) => /^[-*•]\s+/.test(line));
    if (lines.length === 0) {
        return "I'm here with you. What's on your mind right now?";
    }
    if (bulletLines.length > 0) {
        const introLine = lines.find((line) => !/^[-*•]\s+/.test(line));
        const compactIntro = introLine ? clampTextBySentences(introLine, 1, PDF_ASSISTANT_INTRO_CHAR_LIMIT) : '';
        const compactBullets = bulletLines.slice(0, PDF_ASSISTANT_MAX_BULLETS);
        const merged = [compactIntro, ...compactBullets].filter(Boolean).join('\n').trim();
        return keepSingleFollowUpPrompt(clampTextBySentences(merged, PDF_ASSISTANT_BULLET_MODE_SENTENCE_CAP, PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT));
    }
    const asParagraph = lines.join(' ').trim();
    const compactParagraph = clampTextBySentences(asParagraph, PDF_ASSISTANT_MAX_PARAGRAPH_SENTENCES, PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT);
    return keepSingleFollowUpPrompt(compactParagraph);
}
function splitAssistantPdfMessageIfNeeded(message, assistantContent, previousMessage) {
    const normalizedContent = typeof assistantContent === 'string' ? assistantContent.trim() : '';
    const existingOverflow = typeof message?.metadata?.[PDF_ANALYSIS_OVERFLOW_METADATA_KEY] === 'string' ?
        message.metadata[PDF_ANALYSIS_OVERFLOW_METADATA_KEY].trim() :
        '';
    if (!normalizedContent) {
        return { content: normalizedContent, overflow: existingOverflow || null };
    }
    const attachmentType = getAttachmentContextType(previousMessage);
    if (attachmentType === 'image') {
        return { content: shapeImageAssistantReply(normalizedContent), overflow: null };
    }
    if (attachmentType !== 'pdf') {
        return { content: normalizedContent, overflow: existingOverflow || null };
    }
    if (existingOverflow) {
        return { content: shapePdfAssistantReply(normalizedContent), overflow: existingOverflow };
    }
    if (normalizedContent.length <= PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT + PDF_MIN_OVERFLOW_LENGTH) {
        return { content: shapePdfAssistantReply(normalizedContent), overflow: null };
    }
    let splitAt = PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT;
    const splitWindowStart = Math.max(0, PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT - PDF_SPLIT_NEWLINE_LOOKBACK);
    const splitWindowEnd = Math.min(normalizedContent.length - 1, PDF_ASSISTANT_SHORT_REPLY_CHAR_LIMIT + PDF_SPLIT_NEWLINE_LOOKAHEAD);
    const newlineIdx = normalizedContent.lastIndexOf('\n', splitWindowEnd);
    if (newlineIdx >= splitWindowStart) {
        splitAt = newlineIdx + 1;
    }
    else {
        const sentenceEnd = normalizedContent.lastIndexOf('. ', splitWindowEnd);
        if (sentenceEnd >= splitWindowStart)
            splitAt = sentenceEnd + 1;
    }
    const shortContent = normalizedContent.slice(0, splitAt).trim();
    const overflow = normalizedContent.slice(splitAt).trim();
    if (!overflow || overflow.length < PDF_MIN_OVERFLOW_LENGTH) {
        return { content: normalizedContent, overflow: null };
    }
    return { content: shapePdfAssistantReply(shortContent), overflow };
}
function sanitizeAssistantMessage(message) {
    if (!message || typeof message !== 'string')
        return message;
    let sanitized = message;
    // CRITICAL: Strip forbidden reasoning patterns line-by-line (start-pattern + inline)
    const lines = sanitized.split('\n');
    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed)
            return true; // Keep empty lines
        // Line-start forbidden reasoning
        if (FORBIDDEN_REASONING_PATTERNS.some(pattern => pattern.test(line))) {
            console.warn(`[Reasoning Filter] Blocked (start): "${line.substring(0, 60)}..."`);
            return false;
        }
        // Inline forbidden: tool names, field names, schema labels
        if (FORBIDDEN_INLINE_REASONING_PATTERNS.some(pattern => pattern.test(line))) {
            console.warn(`[Reasoning Filter] Blocked (inline): "${line.substring(0, 60)}..."`);
            return false;
        }
        return true;
    });
    sanitized = cleanedLines.join('\n').trim();
    // Failsafe: If we removed everything, use safe fallback.
    // Use English — this function has no language context and Hebrew is not appropriate
    // as a session-agnostic fallback for non-Hebrew sessions.
    if (!sanitized || sanitized.length < 10) {
        console.warn('[Reasoning Filter] Message empty after filtering; safe failsafe applied');
        return "I'm here with you. What's on your mind right now?";
    }
    // Strip unsafe medical patterns
    for (const pattern of UNSAFE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[content removed for safety]');
    }
    if (getAllTherapeuticForms().length > 0 && NO_FORMS_ACCESS_PATTERNS.some((pattern) => pattern.test(sanitized))) {
        return THERAPEUTIC_FORMS_ACCESS_CORRECTION;
    }
    // Ensure no JSON-like structures leak
    if (sanitized.includes('"situation":') || sanitized.includes('"homework":')) {
        console.error('[Safety] JSON structure detected in assistant_message');
        return 'Unable to display this message safely.';
    }
    return sanitized;
}
// Global counters for parse tracking (resetable for testing)
export const parseCounters = {
    PARSE_ATTEMPTS: 0,
    PARSE_SUCCEEDED: 0,
    PARSE_SKIPPED_NOT_JSON: 0,
    PARSE_FAILED: 0,
    SANITIZE_EXTRACT_OK: 0,
    SANITIZE_EXTRACT_FAILED: 0,
    REASONING_LINES_BLOCKED: 0,
    reset() {
        this.PARSE_ATTEMPTS = 0;
        this.PARSE_SUCCEEDED = 0;
        this.PARSE_SKIPPED_NOT_JSON = 0;
        this.PARSE_FAILED = 0;
        this.SANITIZE_EXTRACT_OK = 0;
        this.SANITIZE_EXTRACT_FAILED = 0;
        this.REASONING_LINES_BLOCKED = 0;
    }
};
/**
 * Strict JSON detection - returns true ONLY if content is parseable JSON
 * Prevents JSON.parse on Hebrew/English plain text
 */
function isStrictJSON(content) {
    if (!content || typeof content !== 'string')
        return false;
    const trimmed = content.trim();
    // Must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
        return false;
    // Must not be inside fences
    if (content.includes('```json') || content.includes('```'))
        return false;
    // Check for non-whitespace prefix (indicates it's not pure JSON)
    const beforeBrace = content.substring(0, content.indexOf(trimmed[0]));
    if (beforeBrace.trim().length > 0)
        return false;
    // Must contain JSON-specific markers
    return trimmed.includes('"assistant_message"') ||
        trimmed.includes('"tool_calls"') ||
        trimmed.includes('"homework"');
}
/**
 * Robust extractor for assistant_message from JSON-like content
 * Handles fenced blocks and strings with prefix/suffix
 * Does NOT use JSON.parse for robustness
 */
function extractAssistantMessageRobust(content) {
    if (!content || typeof content !== 'string') {
        parseCounters.SANITIZE_EXTRACT_FAILED++;
        return null;
    }
    // Pattern 1: Extract from fenced JSON block
    const fencedMatch = content.match(/```json?\s*\n?\s*\{[\s\S]*?"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (fencedMatch) {
        parseCounters.SANITIZE_EXTRACT_OK++;
        return fencedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
    // Pattern 2: Extract from JSON-ish string with prefix/suffix
    const jsonishMatch = content.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (jsonishMatch) {
        parseCounters.SANITIZE_EXTRACT_OK++;
        return jsonishMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
    parseCounters.SANITIZE_EXTRACT_FAILED++;
    return null;
}
export function validateAgentOutput(rawContent) {
    if (!rawContent) {
        return null;
    }
    try {
        // Attempt to parse JSON
        let parsed;
        // Handle case where content is already an object
        if (typeof rawContent === 'object') {
            parseCounters.PARSE_ATTEMPTS++;
            parsed = rawContent;
        }
        else if (typeof rawContent === 'string') {
            // STRICT JSON DETECTION: Only parse if truly JSON-shaped
            if (!isStrictJSON(rawContent)) {
                // Not JSON - try robust extraction for fenced blocks or JSON-ish strings
                const extracted = extractAssistantMessageRobust(rawContent);
                if (extracted) {
                    parseCounters.PARSE_SKIPPED_NOT_JSON++;
                    // Return as plain text message (no structured data)
                    return null;
                }
                // Plain text - skip entirely
                parseCounters.PARSE_SKIPPED_NOT_JSON++;
                return null;
            }
            // Strict JSON detected - safe to parse
            parseCounters.PARSE_ATTEMPTS++;
            parsed = JSON.parse(rawContent.trim());
        }
        else {
            return null;
        }
        // Validate required field: assistant_message
        if (!parsed.assistant_message || typeof parsed.assistant_message !== 'string') {
            parseCounters.PARSE_FAILED++;
            return null;
        }
        // Normalize to expected schema (fill missing fields with defaults)
        // CRITICAL: Sanitize assistant_message for safety
        const normalized = {
            assistant_message: sanitizeAssistantMessage(parsed.assistant_message.trim()),
            mode: parsed.mode || 'thought_work',
            situation: parsed.situation || null,
            automatic_thought: parsed.automatic_thought || null,
            evidence_for: Array.isArray(parsed.evidence_for) ? parsed.evidence_for.slice(0, 5) : [],
            evidence_against: Array.isArray(parsed.evidence_against) ? parsed.evidence_against.slice(0, 5) : [],
            balanced_thought: parsed.balanced_thought || null,
            emotion_ratings: {
                anxiety: parsed.emotion_ratings?.anxiety ?? null
            },
            emotion_ratings_after: {
                anxiety: parsed.emotion_ratings_after?.anxiety ?? null
            },
            homework: [],
            // Phase 6b: bound the optional agent-emitted case_formulation_update to
            // an explicit allowlist (signal flags only; provenance stripped).  The
            // backend upsertCaseFormulation writer re-stamps provenance server-side.
            case_formulation_update: sanitizeCaseFormulationUpdateForClient(parsed.case_formulation_update) || undefined,
            journal_save_candidate: {
                should_offer_save: false,
                save_title: parsed.journal_save_candidate?.save_title || null,
                save_summary_bullets: Array.isArray(parsed.journal_save_candidate?.save_summary_bullets)
                    ? parsed.journal_save_candidate.save_summary_bullets.slice(0, 3)
                    : []
            }
        };
        // Validate and normalize homework
        if (Array.isArray(parsed.homework)) {
            normalized.homework = parsed.homework.slice(0, 2).map(item => {
                if (!item || typeof item !== 'object' || !item.step) {
                    return null;
                }
                return {
                    step: String(item.step),
                    duration_minutes: typeof item.duration_minutes === 'number'
                        ? Math.max(1, Math.min(60, Math.floor(item.duration_minutes)))
                        : 10,
                    success_criteria: item.success_criteria ? String(item.success_criteria) : 'Complete the task'
                };
            }).filter(Boolean);
        }
        // Validate emotion_ratings.anxiety if present
        if (normalized.emotion_ratings.anxiety !== null) {
            const anxiety = Number(normalized.emotion_ratings.anxiety);
            if (isNaN(anxiety) || anxiety < 0 || anxiety > 10) {
                normalized.emotion_ratings.anxiety = null;
            }
            else {
                normalized.emotion_ratings.anxiety = Math.max(0, Math.min(10, anxiety));
            }
        }
        // Validate emotion_ratings_after.anxiety if present
        if (normalized.emotion_ratings_after.anxiety !== null) {
            const anxietyAfter = Number(normalized.emotion_ratings_after.anxiety);
            if (isNaN(anxietyAfter) || anxietyAfter < 0 || anxietyAfter > 10) {
                normalized.emotion_ratings_after.anxiety = null;
            }
            else {
                normalized.emotion_ratings_after.anxiety = Math.max(0, Math.min(10, anxietyAfter));
            }
        }
        // Enforce should_offer_save rules
        const hasAnxietyBaseline = normalized.emotion_ratings.anxiety !== null;
        const hasHomework = normalized.homework.length > 0;
        if (parsed.journal_save_candidate?.should_offer_save === true) {
            // Only allow true if both conditions met
            normalized.journal_save_candidate.should_offer_save = hasAnxietyBaseline && hasHomework;
        }
        else {
            normalized.journal_save_candidate.should_offer_save = false;
        }
        parseCounters.PARSE_SUCCEEDED++;
        return normalized;
    }
    catch (error) {
        // Single-line concise warning (no stack trace spam)
        parseCounters.PARSE_FAILED++;
        console.warn(`[Parse] Failed: ${error.message.substring(0, 50)}`);
        return null;
    }
}
/**
 * Extract user-visible message from raw agent output (backward compatible).
 * Returns clean string or original content if validation fails.
 */
export function extractAssistantMessage(rawContent) {
    const validated = validateAgentOutput(rawContent);
    if (validated?.assistant_message) {
        return sanitizeAssistantMessage(validated.assistant_message);
    }
    // Try robust extraction (handles fenced JSON, JSON-ish strings)
    if (typeof rawContent === 'string') {
        const extracted = extractAssistantMessageRobust(rawContent);
        if (extracted) {
            return sanitizeAssistantMessage(extracted);
        }
        // Only try JSON.parse if strict JSON detected
        if (isStrictJSON(rawContent)) {
            try {
                const parsed = JSON.parse(rawContent.trim());
                if (parsed.assistant_message) {
                    return sanitizeAssistantMessage(String(parsed.assistant_message));
                }
            }
            catch (e) {
                // Parse failed - already counted in parseCounters
            }
        }
        // Plain text — sanitize before returning to block any planner/reasoning leakage
        return sanitizeAssistantMessage(rawContent);
    }
    // Object without assistant_message - use deterministic fallback
    if (typeof rawContent === 'object' && rawContent !== null && !rawContent.assistant_message) {
        return 'I received your message. Please rephrase in one sentence what you want me to do next.';
    }
    return 'I received your message. Please rephrase in one sentence what you want me to do next.';
}
// ─── Phase 3: TherapeuticForms form intent extraction ────────────────────────
/**
 * Extracts a `[FORM:slug]` or `[FORM:slug:lang]` marker from assistant message
 * content and resolves it to `generated_file` metadata via the safe form intent
 * resolver.
 *
 * Workbook routing priority (Phase 10):
 *   When the AI resolves an individual worksheet but the user's triggering message
 *   contains explicit workbook-trigger language (e.g. "קונטרס", "חוברת"), the
 *   resolved form is upgraded to the matching workbook via
 *   `resolveWorkbookIntentWithContext`.  This preserves the AI's choice for plain
 *   worksheet requests while correcting workbook-language follow-ups.
 *
 * Safety contract:
 *   - Only the intent slug from the marker is passed to resolveFormIntent.
 *   - No URL or filename from the model is ever accepted.
 *   - Returns null for unknown intents, unapproved forms, or missing file_url.
 *   - Fail-open: any unexpected error returns { cleanedContent: content, generatedFile: null }.
 *
 * @param {string}      content              - Raw assistant message content.
 * @param {string}      [lang]               - Session language code (ISO 639-1). Optional.
 * @param {string|null} [userQuery]          - The user message that triggered this response.
 *                                             Used for workbook routing priority override.
 * @param {string|null} [previousUserContext] - Earlier user message text for anaphoric context.
 * @returns {{ cleanedContent: string, generatedFile: object|null, generatedFiles: object[] }}
 */
function extractAndResolveFormIntent(content, lang, userQuery, previousUserContext) {
    if (typeof content !== 'string' || !content) {
        return { cleanedContent: content, generatedFile: null, generatedFiles: [] };
    }
    try {
        // Reset regex lastIndex before each use (global flag)
        FORM_INTENT_MARKER_PATTERN.lastIndex = 0;
        const resolvedGeneratedFiles = [];
        let cleanedContent = content;
        // Replace all [FORM:slug] / [FORM:slug:lang] markers found in the content.
        // Only the FIRST resolved marker becomes the generated_file (one card per message).
        cleanedContent = content.replace(FORM_INTENT_MARKER_PATTERN, (match, slug, markerLang) => {
            // Prefer the language explicitly in the marker, then the session language
            const effectiveLang = markerLang || lang || 'en';
            const metadata = resolveFormIntent(slug, effectiveLang);
            const normalizedSessionLang = normalizeSessionLanguage(lang || 'en');
            const normalizedMarkerLang = normalizeSessionLanguage(effectiveLang);
            const blocksNonEnglishSpecialized = metadata?.category === 'adolescents_cbt_specialized' && normalizedSessionLang !== 'en';
            const blocksCrossLanguageMarker = normalizedMarkerLang !== normalizedSessionLang &&
                !hasExplicitLanguageRequestFor(userQuery, normalizedMarkerLang);
            if (metadata && !blocksNonEnglishSpecialized && !blocksCrossLanguageMarker) {
                const alreadyIncluded = resolvedGeneratedFiles.some((item) => item?.form_id === metadata.form_id);
                if (!alreadyIncluded && resolvedGeneratedFiles.length < 5) {
                    resolvedGeneratedFiles.push(metadata);
                }
            }
            // Always strip the marker from visible content regardless of resolution
            return '';
        });
        const resolveWorkbookOverride = () => {
            if (typeof userQuery !== 'string' || !userQuery.trim())
                return null;
            const effectiveLangForWorkbook = lang || 'he';
            const prevCtx = typeof previousUserContext === 'string' && previousUserContext.trim()
                ? previousUserContext
                : null;
            if (effectiveLangForWorkbook === 'es') {
                return resolveSpanishWorkbookIntentWithContext(userQuery, prevCtx);
            }
            if (effectiveLangForWorkbook === 'en') {
                return resolveEnglishWorkbookIntentWithContext(userQuery, prevCtx);
            }
            return resolveWorkbookIntentWithContext(userQuery, prevCtx, effectiveLangForWorkbook);
        };
        // Workbook routing priority override:
        // If the AI resolved an individual worksheet but the user's current message
        // contains workbook-trigger language (קונטרס / חוברת / cuaderno / workbook …),
        // attempt to upgrade the resolved form to the matching workbook.
        // Each language-specific resolver returns null when no workbook trigger is
        // present or when no workbook matches, so this is a safe no-op for all
        // plain worksheet requests.
        if (resolvedGeneratedFiles[0] &&
            resolvedGeneratedFiles[0].category !== 'workbook_series' &&
            typeof userQuery === 'string' && userQuery.trim()) {
            try {
                const workbookOverride = resolveWorkbookOverride();
                if (workbookOverride) {
                    resolvedGeneratedFiles[0] = workbookOverride;
                }
            }
            catch (_overrideErr) {
                // Fail-open: keep the original resolved form if the override throws
            }
        }
        // Portuguese workbook fallback:
        // When the model replies to an explicit "caderno" request without any
        // [FORM:...] marker, still attach the matching full workbook instead of
        // leaving the response without a generated_file.
        if (resolvedGeneratedFiles.length === 0 &&
            lang === 'pt' &&
            typeof userQuery === 'string' && userQuery.trim()) {
            try {
                const workbookFallback = resolveWorkbookOverride();
                if (workbookFallback?.category === 'workbook_series') {
                    resolvedGeneratedFiles.push(workbookFallback);
                }
            }
            catch (_fallbackErr) {
                // Fail-open: keep plain assistant text if fallback routing throws
            }
        }
        // Clean up any whitespace artifacts left by marker removal
        cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();
        const generatedFiles = resolvedGeneratedFiles.slice(0, 5);
        return { cleanedContent, generatedFile: generatedFiles[0] || null, generatedFiles };
    }
    catch (_err) {
        // Fail-open: return original content unchanged, no generated file
        return { cleanedContent: content, generatedFile: null, generatedFiles: [] };
    }
}
/**
 * Sanitize corrupted conversation history (recovery utility).
 * Processes all messages and extracts assistant_message from any JSON content.
 *
 * Phase 3B: accepts an optional `sessionLanguage` parameter (e.g. from
 * `sessionLanguageRef.current` in Chat.jsx) used to:
 *   1. Stamp `metadata.session_language` on user messages (normalized).
 *   2. Resolve `[FORM:slug]` / `[FORM:slug:lang]` markers in assistant messages
 *      and inject `metadata.generated_file`.
 *
 * The language resolution chain for FORM markers is:
 *   explicit marker lang > msg.metadata.session_language
 *   > previous user message metadata.session_language
 *   > sessionLanguage parameter > 'en'
 *
 * @param {object[]} messages
 * @param {string} [sessionLanguage='en'] - Current app/session language code.
 * @returns {object[]}
 */
export function sanitizeConversationMessages(messages, sessionLanguage = 'en') {
    if (!Array.isArray(messages))
        return [];
    const normalizedSessionLang = normalizeSessionLanguage(sessionLanguage);
    return messages.map((msg, index, sourceMessages) => {
        const previousMessage = index > 0 ? sourceMessages[index - 1] : null;
        // Strip session-start injection prefix from user messages so the actual
        // user text is always visible in the chat history.
        //
        // When the upgraded workflow path prepends [START_SESSION] context to a
        // user message (e.g. "[START_SESSION]...\n\n<user text>"), the render
        // gate in isMessageRenderSafe blocks the whole message because it starts
        // with "[".  Extract just the user's own text so it renders correctly.
        //
        // Session-start blocks for upgraded wirings always end with a marker of
        // the form "=== END ... ===".  We find the last such marker and take
        // everything after the following "\n\n" as the user's actual text.
        // For the HYBRID wiring, there is no "===" marker — the entire content is
        // "[START_SESSION]" optionally followed by "\n\n<user text>".
        if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.startsWith('[START_SESSION]')) {
            const content = msg.content;
            // Find the last "=== END ... ===" sentinel (V2+ upgraded wirings)
            const lastEndMarkerMatch = content.match(/=== END [^\n]+ ===/g);
            let splitPos = -1;
            if (lastEndMarkerMatch) {
                const lastMarker = lastEndMarkerMatch[lastEndMarkerMatch.length - 1];
                const lastMarkerIdx = content.lastIndexOf(lastMarker);
                // The "\n\n" between the session-start block and user text follows the marker
                const sepIdx = content.indexOf('\n\n', lastMarkerIdx + lastMarker.length);
                if (sepIdx !== -1) {
                    splitPos = sepIdx;
                }
            }
            else {
                // HYBRID wiring: "[START_SESSION]" with no section headers — the first
                // (and only) "\n\n" is the separator before user text
                const firstSep = content.indexOf('\n\n');
                if (firstSep !== -1) {
                    splitPos = firstSep;
                }
            }
            if (splitPos !== -1) {
                const userText = content.substring(splitPos + 2).trim();
                const { content: cleanedUserText, attachment } = extractAttachmentMetadataFromUserContent(userText);
                if (userText) {
                    const visibleUserText = stripFormRouterContextBlock(stripAttachmentContextBlock(cleanedUserText));
                    const pdfMetaSession = {};
                    if (msg.metadata?.pdf_extracted_text)
                        pdfMetaSession.pdf_extracted_text = msg.metadata.pdf_extracted_text;
                    if (msg.metadata?.pdf_page_count)
                        pdfMetaSession.pdf_page_count = msg.metadata.pdf_page_count;
                    // Phase 3B: stamp session_language on user message metadata (do not override existing)
                    const sessionLangMetaSession = {};
                    if (!msg.metadata?.session_language) {
                        sessionLangMetaSession.session_language = normalizedSessionLang;
                    }
                    return {
                        ...msg,
                        content: visibleUserText,
                        metadata: { ...(msg.metadata || {}), ...(attachment ? { attachment } : {}), ...pdfMetaSession, ...sessionLangMetaSession }
                    };
                }
            }
            // Pure session-start injection with no user text — hide from chat history
            return null;
        }
        if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER)) {
            return null;
        }
        if (msg.role === 'user' && typeof msg.content === 'string') {
            const { content, attachment } = extractAttachmentMetadataFromUserContent(msg.content);
            const visibleUserText = stripFormRouterContextBlock(stripAttachmentContextBlock(content));
            // Preserve pdf_extracted_text / pdf_page_count from incoming metadata so the
            // collapsible card in MessageBubble always has the data available, regardless
            // of whether the SDK round-trips custom metadata fields.
            const pdfMeta = {};
            if (msg.metadata?.pdf_extracted_text)
                pdfMeta.pdf_extracted_text = msg.metadata.pdf_extracted_text;
            if (msg.metadata?.pdf_page_count)
                pdfMeta.pdf_page_count = msg.metadata.pdf_page_count;
            // Phase 3B: stamp session_language on user message metadata (do not override existing).
            // Always return a new object so session_language is present for downstream FORM resolution.
            const sessionLangMeta = msg.metadata?.session_language ? {} : { session_language: normalizedSessionLang };
            return {
                ...msg,
                content: visibleUserText,
                metadata: { ...(msg.metadata || {}), ...(attachment ? { attachment } : {}), ...pdfMeta, ...sessionLangMeta }
            };
        }
        if (msg.role === 'assistant' && msg.content) {
            // Phase 3B: compute the effective session language for FORM resolution.
            // Priority chain: msg.session_language > prev user msg session_language
            //   > sessionLanguage param > 'en'.
            // Explicit language in the [FORM:slug:lang] marker is handled inside
            // extractAndResolveFormIntent itself (markerLang wins over all).
            const prevMsgSessionLang = previousMessage?.metadata?.session_language;
            function pickNonEmptyLang(raw) {
                if (typeof raw !== 'string' || !raw.trim())
                    return null;
                return normalizeSessionLanguage(raw);
            }
            const effectiveLang = pickNonEmptyLang(msg.metadata?.session_language) ||
                pickNonEmptyLang(prevMsgSessionLang) ||
                normalizedSessionLang;
            // Workbook routing priority context:
            // The user message at index-1 is the triggering query for this assistant response.
            // Collect older user messages for anaphoric context (e.g. "קונטרס אחר לזה?").
            const rawTriggeringUserMsg = previousMessage?.role === 'user' && typeof previousMessage?.content === 'string'
                ? previousMessage.content
                : null;
            const triggeringUserMsg = rawTriggeringUserMsg ? getVisibleUserContentForIntent(rawTriggeringUserMsg) : null;
            const hasDeterministicFormRouterContext = typeof rawTriggeringUserMsg === 'string' && rawTriggeringUserMsg.includes('[FORM_ROUTER_CONTEXT]');
            const isSessionInjectedTriggeringMessage = typeof rawTriggeringUserMsg === 'string' && rawTriggeringUserMsg.trim().startsWith('[START_SESSION]');
            const isTherapeuticFormsPolicyRefreshMessage = typeof rawTriggeringUserMsg === 'string' &&
                rawTriggeringUserMsg.trim().startsWith(THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER);
            const previousUserContext = 
            // Space-joining is sufficient: workbook routing only does substring matching
            // against Hebrew keywords, so word boundaries between joined messages are fine.
            sourceMessages
                .slice(0, index - 1)
                .filter(m => m.role === 'user' && typeof m.content === 'string')
                .map(m => m.content)
                .slice(-2)
                .join(' ') || null;
            const deterministicFormRoute = (!triggeringUserMsg ||
                (!hasDeterministicFormRouterContext &&
                    (isSessionInjectedTriggeringMessage || isTherapeuticFormsPolicyRefreshMessage)))
                ? null
                : resolveFormIntentRequest(triggeringUserMsg || '', {
                    language: effectiveLang,
                });
            const validated = validateAgentOutput(msg.content);
            if (validated) {
                // Phase 3: extract [FORM:] marker from the validated assistant_message
                // (the marker is placed inside the assistant_message field, not the JSON wrapper).
                const { cleanedContent: cleanedAssistantMsg, generatedFile, generatedFiles } = extractAndResolveFormIntent(validated.assistant_message || '', effectiveLang, triggeringUserMsg, previousUserContext);
                const separated = splitAssistantPdfMessageIfNeeded(msg, cleanedAssistantMsg, previousMessage);
                const nextMetadata = {
                    ...(msg.metadata || {}),
                    structured_data: validated,
                    sanitized: true
                };
                if (generatedFile && !nextMetadata.generated_file)
                    nextMetadata.generated_file = generatedFile;
                if (Array.isArray(generatedFiles) && generatedFiles.length > 0 && !Array.isArray(nextMetadata.generated_files)) {
                    nextMetadata.generated_files = generatedFiles;
                }
                if (!nextMetadata.generated_file && Array.isArray(nextMetadata.generated_files) && nextMetadata.generated_files.length > 0) {
                    nextMetadata.generated_file = nextMetadata.generated_files[0];
                }
                if (separated.overflow) {
                    nextMetadata[PDF_ANALYSIS_OVERFLOW_METADATA_KEY] = separated.overflow;
                }
                const deterministicApplied = applyDeterministicFormRouteToAssistant({
                    content: separated.content,
                    metadata: nextMetadata,
                    formRoute: deterministicFormRoute,
                });
                return {
                    ...msg,
                    content: deterministicApplied.content,
                    metadata: deterministicApplied.metadata
                };
            }
            // Additional fallback for malformed JSON
            if (typeof msg.content === 'string' && msg.content.includes('"assistant_message"')) {
                try {
                    const parsed = JSON.parse(msg.content);
                    if (parsed.assistant_message) {
                        const { cleanedContent: cleanedAssistantMsg, generatedFile, generatedFiles } = extractAndResolveFormIntent(parsed.assistant_message, effectiveLang, triggeringUserMsg, previousUserContext);
                        const separated = splitAssistantPdfMessageIfNeeded(msg, cleanedAssistantMsg, previousMessage);
                        const nextMetadata = {
                            ...(msg.metadata || {}),
                            structured_data: parsed,
                            sanitized: true
                        };
                        if (generatedFile && !nextMetadata.generated_file)
                            nextMetadata.generated_file = generatedFile;
                        if (Array.isArray(generatedFiles) && generatedFiles.length > 0 && !Array.isArray(nextMetadata.generated_files)) {
                            nextMetadata.generated_files = generatedFiles;
                        }
                        if (!nextMetadata.generated_file && Array.isArray(nextMetadata.generated_files) && nextMetadata.generated_files.length > 0) {
                            nextMetadata.generated_file = nextMetadata.generated_files[0];
                        }
                        if (separated.overflow) {
                            nextMetadata[PDF_ANALYSIS_OVERFLOW_METADATA_KEY] = separated.overflow;
                        }
                        const deterministicApplied = applyDeterministicFormRouteToAssistant({
                            content: separated.content,
                            metadata: nextMetadata,
                            formRoute: deterministicFormRoute,
                        });
                        return {
                            ...msg,
                            content: deterministicApplied.content,
                            metadata: deterministicApplied.metadata
                        };
                    }
                }
                catch (e) {
                    console.warn('[Sanitize] Failed to extract from JSON-like content:', msg.content?.substring(0, 100));
                }
            }
            // Plain-text assistant message — sanitize before returning to prevent
            // planner/composer/reasoning text from leaking into visible state.
            // Phase 3: extract [FORM:slug] markers from the original model content
            // before applying text sanitization.
            if (typeof msg.content === 'string') {
                const { cleanedContent: contentAfterFormExtract, generatedFile, generatedFiles } = extractAndResolveFormIntent(msg.content, effectiveLang, triggeringUserMsg, previousUserContext);
                const cleaned = sanitizeAssistantMessage(contentAfterFormExtract);
                const separated = splitAssistantPdfMessageIfNeeded(msg, cleaned, previousMessage);
                const nextMetadata = { ...(msg.metadata || {}) };
                if (generatedFile && !nextMetadata.generated_file)
                    nextMetadata.generated_file = generatedFile;
                if (Array.isArray(generatedFiles) && generatedFiles.length > 0 && !Array.isArray(nextMetadata.generated_files)) {
                    nextMetadata.generated_files = generatedFiles;
                }
                if (!nextMetadata.generated_file && Array.isArray(nextMetadata.generated_files) && nextMetadata.generated_files.length > 0) {
                    nextMetadata.generated_file = nextMetadata.generated_files[0];
                }
                if (separated.overflow) {
                    nextMetadata[PDF_ANALYSIS_OVERFLOW_METADATA_KEY] = separated.overflow;
                }
                const deterministicApplied = applyDeterministicFormRouteToAssistant({
                    content: separated.content,
                    metadata: nextMetadata,
                    formRoute: deterministicFormRoute,
                });
                return { ...msg, content: deterministicApplied.content, metadata: deterministicApplied.metadata };
            }
        }
        return msg;
    }).filter(msg => msg !== null);
}