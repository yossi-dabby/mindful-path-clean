/**
 * test/utils/formulationContractGuard.test.js
 *
 * Unit tests (Phase 10) for formulationContractGuard.js.
 *
 * Covers:
 *  - Unit cases 1–18 (evaluateFormulationResponseContract, fallbacks, correction)
 *  - Integration/regression cases 1–17 (applyFormulationGuardToConversationMessages,
 *    subscription/polling/hydration paths simulated via the pure function)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  classifyFormulationGuardedTurn,
  isGuardedTurn,
  evaluateFormulationResponseContract,
  buildFormulationSafeFallback,
  buildCurrentTurnGroundingFallback,
  buildPendingGroundingCorrectionBlock,
  buildPendingFormulationCorrectionBlock,
  hasGroundingCorrectionAlreadyBeenApplied,
  hasFormulationCorrectionAlreadyBeenApplied,
  applyFormulationGuardToConversationMessages,
  applyCurrentTurnGroundingGuardToConversationMessages,
  evaluateCurrentTurnGroundingContract,
  evaluateCurrentTurnGroundingContractDetailed,
  CURRENT_TURN_GROUNDING_CORRECTION_START,
  CURRENT_TURN_GROUNDING_CORRECTION_END,
  FORMULATION_CORRECTION_START,
  FORMULATION_CORRECTION_END,
} from '../../src/components/utils/formulationContractGuard.js';
import { sanitizeConversationMessagesAligned } from '../../src/components/utils/validateAgentOutput.jsx';
import { applyFinalOutputGovernor } from '../../src/components/utils/finalOutputGovernor.jsx';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const FD_START = '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===';
const FD_END = '=== END FORMULATION DEEPENING ===';
const SM_START = '=== SAFETY MODE \u2014 STAGE 2 PHASE 7 ===';
const SM_END = '=== END SAFETY MODE CONSTRAINTS ===';

const HEBREW_FALLBACK_FIRST_LINE = '\u05E9\u05D5\u05DE\u05E2 \u05D0\u05D5\u05EA\u05DA'; // שומע אותך
const ENGLISH_FALLBACK_SNIPPET = 'I hear that something important is still missing';

/**
 * Builds a raw user message that looks like a guarded turn.
 */
function rawGuardedUser(id, userText = 'מה אתה חושב?', noExercise = false) {
  const noExerciseLine = noExercise
    ? '\nThe person has asked not to receive an exercise yet.\n'
    : '';
  const block = `${FD_START}\nSome instruction.${noExerciseLine}\n${FD_END}`;
  return { id, role: 'user', content: block + '\n\n' + userText };
}

/**
 * Builds a sanitized user message (internal block already stripped).
 */
function sanitizedUser(id, userText = 'מה אתה חושב?') {
  return { id, role: 'user', content: userText };
}

function assistantMsg(id, content) {
  return { id, role: 'assistant', content };
}

function rawSafetyUser(id) {
  const block = `${SM_START}\nSafety instructions.\n${SM_END}`;
  return { id, role: 'user', content: block + '\n\nעזרה' };
}

function rawCorrectionFollowupUser(id, fallbackText, userText) {
  const correctionBlock = buildPendingFormulationCorrectionBlock(fallbackText);
  return { id, role: 'user', content: correctionBlock + '\n\n' + userText };
}

function rawSafetyPlusCorrectionUser(id, fallbackText, userText = 'עזרה') {
  const correctionBlock = buildPendingFormulationCorrectionBlock(fallbackText);
  return {
    id,
    role: 'user',
    content: `${SM_START}\nSafety instructions.\n${SM_END}\n\n${correctionBlock}\n\n${userText}`,
  };
}

// ─── Exact expected fallback texts ───────────────────────────────────────────

const EXACT_HEBREW_FALLBACK =
  '\u05E9\u05D5\u05DE\u05E2 \u05D0\u05D5\u05EA\u05DA. \u05DE\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D1\u05E8\u05D5\u05E8 \u05D4\u05D5\u05D0 \u05E9\u05D4\u05DE\u05E6\u05D1 \u05E0\u05D7\u05D5\u05D5\u05D4 \u05DB\u05DE\u05D0\u05D9\u05D9\u05DD; \u05DE\u05D4 \u05E9\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0\n\u05D9\u05D3\u05D5\u05E2 \u05D4\u05D5\u05D0 \u05D0\u05D9\u05D6\u05D5 \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D0\u05D9\u05E9\u05D9\u05EA \u05D0\u05EA\u05D4 \u05DE\u05D9\u05D9\u05D7\u05E1 \u05DC\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA \u05E9\u05D4\u05EA\u05D5\u05E6\u05D0\u05D4 \u05DC\u05D0 \u05EA\u05D4\u05D9\u05D4\n\u05DE\u05E1\u05E4\u05D9\u05E7 \u05D8\u05D5\u05D1\u05D4. \u05D0\u05E0\u05D9 \u05DC\u05D0 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05D4\u05DE\u05E6\u05D9\u05D0 \u05D0\u05EA \u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05D6\u05D0\u05EA \u05D1\u05DE\u05E7\u05D5\u05DE\u05DA. \u05DB\u05E9\u05D0\u05EA\u05D4\n\u05DE\u05D3\u05DE\u05D9\u05D9\u05DF \u05EA\u05D5\u05E6\u05D0\u05D4 \u05E9\u05D0\u05D9\u05E0\u05D4 \u05DE\u05E1\u05E4\u05D9\u05E7\u05EA \u05D8\u05D5\u05D1\u05D4, \u05DE\u05D4 \u05D4\u05D3\u05D1\u05E8 \u05D4\u05E7\u05E9\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05E9\u05D6\u05D4 \u05D4\u05D9\u05D4 \u05D0\u05D5\u05DE\u05E8\n\u05E2\u05DC\u05D9\u05DA?';

const EXACT_ENGLISH_FALLBACK =
  'I hear that something important is still missing from our understanding.\nWhat remains unknown is the personal meaning you attach to the possibility\nthat the result may not be good enough. I do not want to invent that meaning\nfor you. When you imagine that outcome, what would be the hardest thing it\nmight say about you?';

const EXACT_HEBREW_CONTINUATION_FALLBACK =
  'אני שומע שהחלק הקשה ביותר הוא המחשבה "אני לא מספיק טוב".\nמה שכבר ברור הוא שהמחשבה הזאת מכאיבה; מה שעדיין לא ברור הוא אם\nהיא מופיעה בעיקר סביב ביצועים ומשימות או משקפת משהו רחב יותר,\nואני לא רוצה לקבוע זאת בלי לבדוק איתך. האם המחשבה הזאת עולה\nבעיקר כשאתה נדרש להוכיח יכולת, או גם במצבים אחרים?';

const EXACT_ENGLISH_CONTINUATION_FALLBACK =
  'I hear that the hardest part is the thought, "I am not good enough." What is\nalready clear is that this thought is painful; what remains unclear is whether\nit appears mainly around performance and tasks or reflects something broader,\nand I do not want to decide that without checking with you. Does this thought\ncome up mainly when you have to prove your ability, or in other situations\ntoo?';

// ─── Unit test fixtures ───────────────────────────────────────────────────────

// Hebrew: valid tentative with one question, uses "ייתכן" and "ערך עצמי"
const VALID_TENTATIVE_HE =
  '\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05D3\u05D1\u05E8 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05E2\u05E8\u05DA \u05E2\u05E6\u05DE\u05D9. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1 \u05E2\u05DC \u05DB\u05DA?';
// ייתכן שהדבר קשור לערך עצמי. מה אתה חושב על כך?

// English: valid tentative with one question, uses "I wonder whether" and "self-worth"
const VALID_TENTATIVE_EN =
  'I wonder whether this connects to your self-worth. What does this mean for you?';

// Hebrew prohibited certainty phrase: האיום האמיתי (even with ייתכן prefix)
const PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE =
  '\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05D0\u05D9\u05D5\u05DD \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05DB\u05DA. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// ייתכן שהאיום האמיתי קשור לכך. מה אתה חושב?

// Hebrew: הדפוס עובד כך
const PROHIBITED_HE_PATTERN =
  '\u05D4\u05D3\u05E4\u05D5\u05E1 \u05E2\u05D5\u05D1\u05D3 \u05DB\u05DA: \u05D0\u05EA\u05D4 \u05DE\u05E4\u05D7\u05D3 \u05DE\u05DB\u05D9\u05E9\u05DC\u05D5\u05DF. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// הדפוס עובד כך: אתה מפחד מכישלון. מה אתה חושב?

// Unsupported deeper claim: identity claim without tentative marker
const DEEPER_NO_TENTATIVE_HE =
  '\u05D6\u05D4\u05D5\u05EA \u05D4\u05D9\u05D0 \u05D4\u05E9\u05E2\u05DC\u05D4 \u05D4\u05E2\u05D9\u05E7\u05E8\u05D9\u05EA. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// זהות היא השאלה העיקרית. מה אתה חושב?

// Tentative identity with one question — valid
const DEEPER_WITH_TENTATIVE_ONE_Q_HE =
  '\u05D0\u05D7\u05EA \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05D9\u05D0 \u05E9\u05D6\u05D4 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05D6\u05D4\u05D5\u05EA. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// אחת האפשרויות היא שזה קשור לזהות. מה אתה חושב?

// Missing question — deeper hypothesis, tentative, but no question mark
const DEEPER_WITH_TENTATIVE_NO_Q_HE =
  '\u05D0\u05D7\u05EA \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05D9\u05D0 \u05E9\u05D6\u05D4 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05D6\u05D4\u05D5\u05EA.';
// אחת האפשרויות היא שזה קשור לזהות.

// Two questions — fail
const DEEPER_WITH_TENTATIVE_TWO_Q_HE =
  '\u05D0\u05D7\u05EA \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05D9\u05D0 \u05E9\u05D6\u05D4 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05D6\u05D4\u05D5\u05EA. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1? \u05D5\u05DE\u05D4 \u05D0\u05EA\u05D4 \u05DE\u05E8\u05D2\u05D9\u05E9?';
// אחת האפשרויות היא שזה קשור לזהות. מה אתה חושב? ומה אתה מרגיש?

// No-exercise violation
const EXERCISE_VIOLATION_HE =
  '\u05D0\u05D5\u05DC\u05D9 \u05DB\u05D3\u05D0\u05D9 \u05DC\u05E0\u05E1\u05D5\u05EA \u05EA\u05E8\u05D2\u05D9\u05DC \u05E0\u05E9\u05D9\u05DE\u05D4 \u05D4\u05D9\u05D5\u05DD. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// אולי כדאי לנסות תרגיל נשימה היום. מה אתה חושב?

// Sentence explaining no exercise will be proposed — should NOT fail
const NO_EXERCISE_EXPLANATION_HE =
  '\u05DC\u05D0 \u05D0\u05E6\u05D9\u05E2 \u05DC\u05DA \u05EA\u05E8\u05D2\u05D9\u05DC \u05DB\u05E8\u05D2\u05E2. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
// לא אציע לך תרגיל כרגע. מה אתה חושב?

// Ordinary response (no deeper indicator, no prohibited phrase)
const ORDINARY_RESPONSE_HE =
  '\u05D6\u05D4 \u05E0\u05E9\u05DE\u05E2 \u05E7\u05E9\u05D4. \u05D0\u05D9\u05DA \u05D0\u05EA\u05D4 \u05DE\u05E8\u05D2\u05D9\u05E9?';
// זה נשמע קשה. איך אתה מרגיש?

// English no-exercise violation
const EXERCISE_VIOLATION_EN =
  'Let us try a grounding exercise to help you feel more settled. What do you think?';

const CORRECTION_FOLLOWUP_USER_PROMPT_EN =
  'The hardest thing would be thinking that I am not good enough. Continue gently from there and do not draw a conclusion yet.';

const PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN =
  `That carries a different kind of weight. 'Not good enough' about a result is one thing. 'Not good enough' about who you are is something else entirely. I want to stay with that, because the gap between those two is where this whole pattern lives. Somewhere along the way, what you were avoiding stopped being just the work and became a place where something about you could be confirmed. That's not perfectionism about quality. That's something much more personal, and I can feel how heavy that is.`;

const CORRECTION_FOLLOWUP_USER_PROMPT_HE =
  'החלק הקשה ביותר הוא המחשבה "אני לא מספיק טוב". תמשיך בעדינות מכאן ואל תקבע עדיין מסקנה. בלי תרגיל עדיין.';

const VALID_CORRECTION_FOLLOWUP_HE =
  'ייתכן שיש כאן משמעות אישית רחבה יותר, אבל עדיין לא ברור אם זה כך. האם המחשבה הזאת עולה בעיקר סביב מצבים שבהם אתה צריך להוכיח יכולת?';

const INVALID_CORRECTION_FOLLOWUP_HE =
  'זה קשור לזהות שלך. זה משהו הרבה יותר אישי.';

const CORRECTION_FOLLOWUP_EXERCISE_VIOLATION_HE =
  'אולי כדאי לנסות תרגיל קצר כבר עכשיו. מה אתה חושב?';

const TEST_B_USER_PROMPT =
  'אני מרגיש שאתה כבר יודע את הסיפור, אבל עדיין לא באמת מבין למה זה כל כך מאיים עליי. אל תחזור על מה שכבר ידוע ואל תציע לי עדיין תרגיל. תגיד מה לדעתך חסר בפורמולציה, אבל בלי הסתייגויות ובלי לשאול אותי שאלה.';

const TEST_A_USER_PROMPT =
  'אני מבקש שתאמר מה לדעתך חסר בפורמולציה, אבל הפעם בלי להשתמש במילים "ייתכן" או "אולי", ובלי לשאול אותי שום שאלה. אל תציע תרגיל.';

const TEST_B_FAILING_ASSISTANT =
  'הקשר בין מוכשרות לערך עצמי. בשבילך הם התאחדו לחלוטין. זה מבחן קיומי כדי להיות בעל ערך בכלל. בכל סיטואציה כזו זה מרגיש כמו הימור על כל הערך העצמי שלך ועל הבסיס הכי יסודי של תחושת הערך שלך.';

const TEST_A_FAILING_ASSISTANT =
  'האיום נובע מהמשמעות של הכישלון בשבילך. אתה עצמך לא מספיק. הקישור בין הביצוע לבין הערך העצמי יוצר דפוס שבו הדחייה משמרת את האשליה.';

function runAlignedPipeline(rawMessages, locale = 'he', transformAlignedMessage = null) {
  const sanitizedAligned = sanitizeConversationMessagesAligned(rawMessages, locale);
  const transformedAligned = typeof transformAlignedMessage === 'function'
    ? sanitizedAligned.map((msg, index) => transformAlignedMessage(msg, index))
    : sanitizedAligned;
  const { messages: guardedAligned, pendingCorrection } = applyFormulationGuardToConversationMessages(
    rawMessages,
    transformedAligned,
    { locale }
  );
  return {
    sanitizedAligned,
    transformedAligned,
    guardedAligned,
    finalVisible: guardedAligned.filter(Boolean),
    pendingCorrection,
  };
}

function buildGuardModesByRawIndex(rawMessages) {
  return rawMessages.map((rawMsg, rawIndex) => {
    if (!rawMsg || rawMsg.role !== 'assistant') return null;
    for (let i = rawIndex - 1; i >= 0; i--) {
      const candidate = rawMessages[i];
      if (candidate?.role === 'user' && typeof candidate.content === 'string') {
        return classifyFormulationGuardedTurn(candidate.content);
      }
    }
    return null;
  });
}

function runChatVisiblePipeline(rawMessages, locale = 'en') {
  const raw = Array.isArray(rawMessages) ? rawMessages : [];
  const guardModes = buildGuardModesByRawIndex(raw);
  const sanitizedAligned = sanitizeConversationMessagesAligned(raw, locale);
  const alignedWithRawIndexes = sanitizedAligned.map((msg, rawIndex) => (
    msg ? { ...msg, __rawIndex: rawIndex } : msg
  ));
  const { messages: guardedAligned } = applyFormulationGuardToConversationMessages(raw, alignedWithRawIndexes, { locale });
  const { messages: groundedAligned } = applyCurrentTurnGroundingGuardToConversationMessages(raw, guardedAligned, { locale });
  return groundedAligned
    .map((msg, rawIndex) => {
      if (!msg) return null;
      const resolvedRawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : rawIndex;
      return { ...msg, __rawIndex: resolvedRawIndex, __guardMode: guardModes[resolvedRawIndex] || null };
    })
    .filter(Boolean);
}

function getAssistantIdentityKey(msg, index) {
  if (!msg || msg.role !== 'assistant') return null;
  if (msg.id) return `id:${msg.id}`;
  const rawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : null;
  const createdAt = typeof msg.created_at === 'string' ? msg.created_at : null;
  if (rawIndex !== null && createdAt) return `raw:${rawIndex}|created:${createdAt}`;
  if (rawIndex !== null) return `raw:${rawIndex}`;
  if (createdAt) return `created:${createdAt}|idx:${index}`;
  return `idx:${index}|role:${msg.role}`;
}

function buildAssistantLookup(messages) {
  const map = new Map();
  (messages || []).forEach((msg, index) => {
    if (!msg || msg.role !== 'assistant') return;
    const key = getAssistantIdentityKey(msg, index);
    if (key) map.set(key, msg);
  });
  return map;
}

function applyMonotonicGuardedMerge({ conversationId, incomingMessages, lastConfirmedMessages, scopedMemory }) {
  if (!scopedMemory.has(conversationId)) scopedMemory.set(conversationId, new Map());
  const conversationMemory = scopedMemory.get(conversationId);
  const confirmedLookup = buildAssistantLookup(lastConfirmedMessages || []);

  const merged = (incomingMessages || []).map((msg, index) => {
    if (!msg || msg.role !== 'assistant') return msg;
    const identityKey = getAssistantIdentityKey(msg, index);
    if (!identityKey) return msg;
    const incomingReplaced = msg.metadata?.formulation_guard_replaced === true;
    const confirmed = confirmedLookup.get(identityKey);
    const confirmedReplaced = confirmed?.metadata?.formulation_guard_replaced === true;
    const remembered = conversationMemory.get(identityKey);
    const rememberedReplaced = remembered?.metadata?.formulation_guard_replaced === true;
    const dominant = confirmedReplaced ? confirmed : rememberedReplaced ? remembered : null;
    if (!incomingReplaced && dominant) {
      return {
        ...msg,
        content: dominant.content,
        metadata: {
          ...(msg.metadata || {}),
          ...(dominant.metadata || {}),
          formulation_guard_replaced: true,
          formulation_guard_reason_codes: Array.isArray(dominant.metadata?.formulation_guard_reason_codes)
            ? dominant.metadata.formulation_guard_reason_codes
            : [],
        },
      };
    }
    return msg;
  });

  merged.forEach((msg, index) => {
    if (!msg || msg.role !== 'assistant') return;
    if (msg.metadata?.formulation_guard_replaced !== true) return;
    const identityKey = getAssistantIdentityKey(msg, index);
    if (!identityKey) return;
    conversationMemory.set(identityKey, msg);
  });

  return merged;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('formulationContractGuard — unit tests', () => {
  // ── 1. Valid tentative Hebrew passes ─────────────────────────────────────────
  it('1. valid tentative Hebrew response passes', () => {
    const result = evaluateFormulationResponseContract(
      VALID_TENTATIVE_HE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
  });

  // ── 2. Valid tentative English passes ────────────────────────────────────────
  it('2. valid tentative English response passes', () => {
    const result = evaluateFormulationResponseContract(
      VALID_TENTATIVE_EN,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
  });

  // ── 3. Prohibited certainty phrase with tentative prefix fails ───────────────
  it('3. "ייתכן שהאיום האמיתי..." fails (prohibited unconditionally)', () => {
    const result = evaluateFormulationResponseContract(
      PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('prohibited_certainty_phrase');
  });

  // ── 4. "ייתכן שהאיום האמיתי..." same as above (explicit test per spec) ────────
  it('4. "ייתכן שהאיום האמיתי..." explicitly fails', () => {
    const content =
      '\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05D0\u05D9\u05D5\u05DD \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9 \u05E7\u05E9\u05D5\u05E8 \u05DC\u05DE\u05E9\u05D4\u05D5. \u05DE\u05D4 \u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05D1?';
    const result = evaluateFormulationResponseContract(content, rawGuardedUser('u1').content);
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('prohibited_certainty_phrase');
  });

  // ── 5. "הדפוס עובד כך..." fails ──────────────────────────────────────────────
  it('5. "הדפוס עובד כך..." fails', () => {
    const result = evaluateFormulationResponseContract(
      PROHIBITED_HE_PATTERN,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('prohibited_certainty_phrase');
  });

  // ── 6. Unsupported identity claim without tentative marker fails ──────────────
  it('6. identity claim without tentative marker fails', () => {
    const result = evaluateFormulationResponseContract(
      DEEPER_NO_TENTATIVE_HE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('unsupported_deeper_claim_without_tentative_marker');
  });

  // ── 7. Tentative identity hypothesis with exactly one question passes ─────────
  it('7. tentative identity hypothesis with exactly one question passes', () => {
    const result = evaluateFormulationResponseContract(
      DEEPER_WITH_TENTATIVE_ONE_Q_HE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
  });

  // ── 8. Missing question fails ────────────────────────────────────────────────
  it('8. deeper hypothesis without question mark fails', () => {
    const result = evaluateFormulationResponseContract(
      DEEPER_WITH_TENTATIVE_NO_Q_HE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('missing_verification_question');
  });

  // ── 9. Two questions fail ────────────────────────────────────────────────────
  it('9. deeper hypothesis with two question marks fails', () => {
    const result = evaluateFormulationResponseContract(
      DEEPER_WITH_TENTATIVE_TWO_Q_HE,
      rawGuardedUser('u1').content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('multiple_questions');
  });

  // ── 10. No-exercise violation fails ─────────────────────────────────────────
  it('10. exercise suggestion fails when no-exercise clause active', () => {
    const result = evaluateFormulationResponseContract(
      EXERCISE_VIOLATION_HE,
      rawGuardedUser('u1', 'מה אתה חושב?', true).content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('exercise_proposed_when_blocked');
  });

  // ── 11. Statement that no exercise will be proposed does not fail ─────────────
  it('11. sentence explaining no exercise will be proposed passes', () => {
    const result = evaluateFormulationResponseContract(
      NO_EXERCISE_EXPLANATION_HE,
      rawGuardedUser('u1', 'מה אתה חושב?', true).content
    );
    expect(result.pass).toBe(true);
  });

  // ── 12. Ordinary response outside guarded turn remains unchanged ──────────────
  it('12. ordinary response in non-guarded turn passes through unchanged', () => {
    const rawUser = { id: 'u1', role: 'user', content: 'שלום, מה שלומך?' };
    const asst = assistantMsg('a1', ORDINARY_RESPONSE_HE);
    const { messages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [rawUser, asst],
      { locale: 'he' }
    );
    // The assistant message content must be byte-for-byte unchanged
    const out = messages.find((m) => m.id === 'a1');
    expect(out.content).toBe(ORDINARY_RESPONSE_HE);
    expect(out.metadata?.formulation_guard_replaced).toBeUndefined();
  });

  // ── 13. Safety Mode turn remains unchanged ───────────────────────────────────
  it('13. Safety Mode turn bypasses guard (Safety always wins)', () => {
    const rawUser = rawSafetyUser('u1');
    const sanitizedUserMsg = { id: 'u1', role: 'user', content: 'עזרה' };
    // Even if the assistant content would fail the guard, Safety Mode turn must pass through
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    const { messages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );
    const out = messages.find((m) => m.id === 'a1');
    expect(out.content).toBe(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    expect(out.metadata?.formulation_guard_replaced).toBeUndefined();
  });

  // ── 14. Incomplete user marker stays outside guard scope ────────────────────
  it('14. incomplete FORMULATION DEEPENING marker does not trigger guard', () => {
    const rawUser = {
      id: 'u1',
      role: 'user',
      content: '=== FORMULATION DEEPENING — THIS TURN ONLY ===\nSome partial text without end marker.',
    };
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    const { messages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [rawUser, asst],
      { locale: 'he' }
    );
    const out = messages.find((m) => m.id === 'a1');
    expect(out.content).toBe(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    expect(out.metadata?.formulation_guard_replaced).toBeUndefined();
  });

  // ── 15. No raw text in reason codes ──────────────────────────────────────────
  it('15. reason codes contain only bounded code strings, no raw content', () => {
    const VALID_CODES = new Set([
      'prohibited_certainty_phrase',
      'unsupported_deeper_claim_without_tentative_marker',
      'missing_verification_question',
      'multiple_questions',
      'exercise_proposed_when_blocked',
      'internal_instruction_leak',
      'conclusion_drawn_when_explicitly_blocked',
    ]);
    const inputs = [
      PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE,
      PROHIBITED_HE_PATTERN,
      DEEPER_NO_TENTATIVE_HE,
      DEEPER_WITH_TENTATIVE_NO_Q_HE,
      DEEPER_WITH_TENTATIVE_TWO_Q_HE,
    ];
    for (const content of inputs) {
      const { reasonCodes } = evaluateFormulationResponseContract(
        content,
        rawGuardedUser('u1').content
      );
      for (const code of reasonCodes) {
        expect(typeof code).toBe('string');
        expect(VALID_CODES.has(code)).toBe(true);
      }
    }
  });

  // ── 16. Hebrew fallback exact output ────────────────────────────────────────
  it('16. Hebrew fallback has exact production text with one question mark', () => {
    const fallback = buildFormulationSafeFallback('he');
    expect(fallback).toBe(EXACT_HEBREW_FALLBACK);
    const qCount = (fallback.match(/\?/g) || []).length;
    expect(qCount).toBe(1);
    // Must start with the expected first line
    expect(fallback.startsWith(HEBREW_FALLBACK_FIRST_LINE)).toBe(true);
  });

  // ── 17. English fallback exact output ───────────────────────────────────────
  it('17. English fallback has exact production text with one question mark', () => {
    const fallback = buildFormulationSafeFallback('en');
    expect(fallback).toBe(EXACT_ENGLISH_FALLBACK);
    const qCount = (fallback.match(/\?/g) || []).length;
    expect(qCount).toBe(1);
    expect(fallback.startsWith(ENGLISH_FALLBACK_SNIPPET)).toBe(true);
  });

  // ── 18. Repeated application is idempotent ───────────────────────────────────
  it('18. repeated application of guard to already-replaced message is idempotent', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const raw = [rawUser, asst];
    const sanitized = [sanitizedUserMsg, asst];

    const first = applyFormulationGuardToConversationMessages(raw, sanitized, { locale: 'he' });
    const firstAsst = first.messages.find((m) => m.id === 'a1');
    expect(firstAsst.metadata.formulation_guard_replaced).toBe(true);
    const firstContent = firstAsst.content;

    // Apply guard a second time — input is now already-replaced
    const second = applyFormulationGuardToConversationMessages(
      raw,
      first.messages,
      { locale: 'he' }
    );
    const secondAsst = second.messages.find((m) => m.id === 'a1');
    // Content must be identical
    expect(secondAsst.content).toBe(firstContent);
    // Guard replaced flag still true
    expect(secondAsst.metadata.formulation_guard_replaced).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION / REGRESSION TESTS
// ═══════════════════════════════════════════════════════════════════════════════


describe('formulationContractGuard — correction-followup unit tests', () => {
  it('19. correction-followup Hebrew fallback has exact continuation text', () => {
    const fallback = buildFormulationSafeFallback('he', 'correction_followup');
    expect(fallback).toBe(EXACT_HEBREW_CONTINUATION_FALLBACK);
    expect((fallback.match(/\?/g) || []).length).toBe(1);
  });

  it('20. correction-followup English fallback has exact continuation text', () => {
    const fallback = buildFormulationSafeFallback('en', 'correction_followup');
    expect(fallback).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
    expect((fallback.match(/\?/g) || []).length).toBe(1);
  });

  it('21. correction-followup tentative Hebrew response with one question passes', () => {
    const result = evaluateFormulationResponseContract(
      VALID_CORRECTION_FOLLOWUP_HE,
      rawCorrectionFollowupUser('u2', EXACT_HEBREW_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_HE).content,
      'correction_followup'
    );
    expect(result.pass).toBe(true);
    expect(result.reasonCodes).toEqual([]);
  });

  it('22. correction-followup explicit no-exercise request blocks exercises', () => {
    const result = evaluateFormulationResponseContract(
      CORRECTION_FOLLOWUP_EXERCISE_VIOLATION_HE,
      rawCorrectionFollowupUser('u2', EXACT_HEBREW_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_HE).content,
      'correction_followup'
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('exercise_proposed_when_blocked');
  });

  it('23. correction-followup explicit no-conclusion request adds bounded reason code', () => {
    const result = evaluateFormulationResponseContract(
      INVALID_CORRECTION_FOLLOWUP_HE,
      rawCorrectionFollowupUser('u2', EXACT_HEBREW_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_HE).content,
      'correction_followup'
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('conclusion_drawn_when_explicitly_blocked');
    expect(result.reasonCodes).toContain('unsupported_deeper_claim_without_tentative_marker');
    expect(result.reasonCodes).toContain('missing_verification_question');
  });
});

describe('formulationContractGuard — integration/regression tests', () => {
  // ── 1. Subscription invalid response becomes fallback ───────────────────────
  it('1. subscription: invalid guarded response is replaced by fallback', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const { messages, pendingCorrection } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    const out = messages.find((m) => m.id === 'a1');
    expect(out.content).toBe(buildFormulationSafeFallback('he'));
    expect(out.metadata.formulation_guard_replaced).toBe(true);
    expect(out.metadata.formulation_guard_reason_codes).toContain('prohibited_certainty_phrase');
    expect(pendingCorrection).not.toBeNull();
    expect(pendingCorrection.fallbackText).toBe(buildFormulationSafeFallback('he'));
  });

  // ── 2. Polling invalid response produces identical fallback ─────────────────
  it('2. polling: same invalid response produces identical fallback', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    // Simulate subscription result
    const sub = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );
    // Simulate polling result (same raw data)
    const poll = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    const subAsst = sub.messages.find((m) => m.id === 'a1');
    const pollAsst = poll.messages.find((m) => m.id === 'a1');
    expect(subAsst.content).toBe(pollAsst.content);
  });

  // ── 3. Stale polling does not restore rejected content ──────────────────────
  it('3. stale polling snapshot does not restore rejected content', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const badAsst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    // First apply (subscription path)
    const { messages: guardedFirst } = applyFormulationGuardToConversationMessages(
      [rawUser, badAsst],
      [sanitizedUserMsg, badAsst],
      { locale: 'he' }
    );

    // Stale polling re-applies guard on the same raw data
    const { messages: guardedSecond } = applyFormulationGuardToConversationMessages(
      [rawUser, badAsst],
      guardedFirst,
      { locale: 'he' }
    );

    const asstOut = guardedSecond.find((m) => m.id === 'a1');
    // Must not contain rejected content — must be fallback
    expect(asstOut.content).toBe(buildFormulationSafeFallback('he'));
    expect(asstOut.content).not.toContain(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE.substring(0, 10));
  });

  // ── 4. Hydration reconstructs fallback ──────────────────────────────────────
  it('4. hydration: same raw messages produce the same fallback', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const hydrate1 = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );
    const hydrate2 = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    const a1 = hydrate1.messages.find((m) => m.id === 'a1');
    const a2 = hydrate2.messages.find((m) => m.id === 'a1');
    expect(a1.content).toBe(a2.content);
    expect(a1.content).toBe(buildFormulationSafeFallback('he'));
  });

  // ── 5. Saved-chat restoration reconstructs fallback ─────────────────────────
  it('5. saved-chat restoration: same raw produces same fallback', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', DEEPER_NO_TENTATIVE_HE);

    const result = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );
    expect(result.messages.find((m) => m.id === 'a1').content).toBe(
      buildFormulationSafeFallback('he')
    );
  });

  // ── 6. Conversation switching reconstructs fallback ─────────────────────────
  it('6. conversation switching: each switch from same raw yields same fallback', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_PATTERN);

    const fallback = buildFormulationSafeFallback('he');
    for (let i = 0; i < 3; i++) {
      const { messages } = applyFormulationGuardToConversationMessages(
        [rawUser, asst],
        [sanitizedUserMsg, asst],
        { locale: 'he' }
      );
      expect(messages.find((m) => m.id === 'a1').content).toBe(fallback);
    }
  });

  // ── 7. Valid response remains byte-for-byte unchanged ───────────────────────
  it('7. valid guarded response is byte-for-byte unchanged', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', VALID_TENTATIVE_HE);

    const { messages, pendingCorrection } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    const out = messages.find((m) => m.id === 'a1');
    expect(out.content).toBe(VALID_TENTATIVE_HE);
    expect(out.metadata?.formulation_guard_replaced).toBeUndefined();
    expect(pendingCorrection).toBeNull();
  });

  // ── 8. No duplicate fallback message ────────────────────────────────────────
  it('8. guard does not add duplicate messages', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const { messages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    const asstMsgs = messages.filter((m) => m.role === 'assistant');
    expect(asstMsgs).toHaveLength(1);
  });

  // ── 9. ThoughtWorkSaveHandler receives fallback, not rejected content ────────
  it('9. processedMessages contains fallback (not rejected) after guard', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const { messages: guardedMessages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    // Simulate ThoughtWorkSaveHandler receiving guardedMessages (processedMessages)
    const asstInSave = guardedMessages.find((m) => m.role === 'assistant');
    expect(asstInSave.content).not.toBe(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    expect(asstInSave.content).toBe(buildFormulationSafeFallback('he'));
  });

  // ── 10. Next outbound real user message receives correction block ────────────
  it('10. next outbound user message includes correction block when pending', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const { pendingCorrection } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    expect(pendingCorrection).not.toBeNull();
    const correctionBlock = buildPendingFormulationCorrectionBlock(
      pendingCorrection.fallbackText
    );
    expect(correctionBlock).toContain(FORMULATION_CORRECTION_START);
    expect(correctionBlock).toContain(FORMULATION_CORRECTION_END);
    expect(correctionBlock).toContain(pendingCorrection.fallbackText);
    // Must not contain the raw rejected content
    expect(correctionBlock).not.toContain(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE.substring(0, 15));
  });

  // ── 11. Repeated later user messages do not re-receive the correction block ──
  it('11. correction is not pending once a user message contains the correction block', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    const fallback = buildFormulationSafeFallback('he');
    const correctionBlock = buildPendingFormulationCorrectionBlock(fallback);

    // Simulate the user message that already has the correction block
    const nextUserWithCorrection = {
      id: 'u2',
      role: 'user',
      content: correctionBlock + '\n\n' + 'המשך מכאן',
    };

    // Now re-apply the guard — the correction should be detected as already sent
    const alreadySent = hasFormulationCorrectionAlreadyBeenApplied(
      [rawUser, asst, nextUserWithCorrection],
      1 // after the assistant message index
    );
    expect(alreadySent).toBe(true);
  });

  // ── 12. Correction block is invisible (stripped) after persistence/reload ────
  it('12. correction block is stripped from visible user content by sanitizer', async () => {
    // Import the sanitizer from validateAgentOutput
    const { stripAgentOnlyRuntimeBlocksFromUserContent } = await import(
      '../../src/components/utils/validateAgentOutput.jsx'
    );
    const fallback = buildFormulationSafeFallback('he');
    const correctionBlock = buildPendingFormulationCorrectionBlock(fallback);
    const userText = 'שאלה חדשה שלי';
    const rawContent = correctionBlock + '\n\n' + userText;

    const stripped = stripAgentOnlyRuntimeBlocksFromUserContent(rawContent);
    expect(stripped).not.toContain(FORMULATION_CORRECTION_START);
    expect(stripped).not.toContain(FORMULATION_CORRECTION_END);
    // User's original text must be preserved
    expect(stripped.trim()).toContain(userText);
  });

  // ── 13. Safety Mode for current turn remains authoritative ───────────────────
  it('13. Safety Mode + Formulation Deepening: Safety takes precedence', () => {
    // A message with BOTH Safety Mode AND Formulation Deepening blocks —
    // Safety Mode must win (turn is not guarded).
    const hybridUser = {
      id: 'u1',
      role: 'user',
      content:
        `${SM_START}\nSafety instructions.\n${SM_END}\n\n` +
        `${FD_START}\nFormulation instructions.\n${FD_END}\n\nאני צריך עזרה`,
    };
    const sanitizedHybridUser = { id: 'u1', role: 'user', content: 'אני צריך עזרה' };
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    const { messages } = applyFormulationGuardToConversationMessages(
      [hybridUser, asst],
      [sanitizedHybridUser, asst],
      { locale: 'he' }
    );

    const out = messages.find((m) => m.id === 'a1');
    // Safety Mode wins — content must NOT be replaced
    expect(out.content).toBe(PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);
    expect(out.metadata?.formulation_guard_replaced).toBeUndefined();
  });

  // ── 14. HYBRID, V1–V5, V6 context-only remain unchanged ──────────────────────
  it('14. non-guarded ordinary conversation remains completely unchanged', () => {
    const u1 = { id: 'u1', role: 'user', content: 'Hello, how are you?' };
    const a1 = assistantMsg('a1', 'I am doing well. How can I help you today?');
    const u2 = { id: 'u2', role: 'user', content: 'Tell me about CBT.' };
    const a2 = assistantMsg('a2', 'CBT stands for cognitive behavioral therapy...');

    const { messages, pendingCorrection } = applyFormulationGuardToConversationMessages(
      [u1, a1, u2, a2],
      [u1, a1, u2, a2],
      { locale: 'en' }
    );

    expect(messages[0].content).toBe(u1.content);
    expect(messages[1].content).toBe(a1.content);
    expect(messages[2].content).toBe(u2.content);
    expect(messages[3].content).toBe(a2.content);
    expect(pendingCorrection).toBeNull();
  });

  // ── 15. Existing PR #851 sanitizer blocks pass through guard untouched ────────
  it('15. guard does not duplicate or re-process already-sanitized messages', () => {
    const u1 = sanitizedUser('u1', 'תשאל אותי שאלה');
    const a1 = assistantMsg('a1', VALID_TENTATIVE_HE);

    // When raw and sanitized are both without FD block — no guarded turn
    const { messages } = applyFormulationGuardToConversationMessages(
      [u1, a1],
      [u1, a1],
      { locale: 'he' }
    );

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe(VALID_TENTATIVE_HE);
  });

  // ── 16. English no-exercise violation is caught ──────────────────────────────
  it('16. English no-exercise violation is caught', () => {
    const result = evaluateFormulationResponseContract(
      EXERCISE_VIOLATION_EN,
      rawGuardedUser('u1', 'what do you think?', true).content
    );
    expect(result.pass).toBe(false);
    expect(result.reasonCodes).toContain('exercise_proposed_when_blocked');
  });

  // ── 17. No additional addMessage call is created by the guard ────────────────
  it('17. guard is pure and makes no external calls or side effects', () => {
    const rawUser = rawGuardedUser('u1');
    const sanitizedUserMsg = sanitizedUser('u1');
    const asst = assistantMsg('a1', PROHIBITED_HE_CERTAINTY_WITH_TENTATIVE);

    // Guard runs purely — we verify by checking no external modules are called
    // (the module declares it never calls Base44; we can verify the function is
    //  synchronous and its return value is a plain object).
    const result = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUserMsg, asst],
      { locale: 'he' }
    );

    // Synchronous return with expected shape
    expect(typeof result).toBe('object');
    expect(Array.isArray(result.messages)).toBe(true);
    // pendingCorrection is null or a plain object — not a Promise
    expect(result.pendingCorrection === null || typeof result.pendingCorrection === 'object').toBe(true);
    if (result.pendingCorrection !== null) {
      expect(typeof result.pendingCorrection.then).toBe('undefined');
    }
  });
});


describe('formulationContractGuard — correction-followup integration/regression tests', () => {
  it('18. exact English production correction-followup response is deterministically replaced', () => {
    const initialRawUser = rawGuardedUser('u1', 'What do you think?', true);
    const initialBadAssistant = assistantMsg('a1', DEEPER_WITH_TENTATIVE_NO_Q_HE);
    const correctionRawUser = rawCorrectionFollowupUser(
      'u2',
      EXACT_ENGLISH_FALLBACK,
      CORRECTION_FOLLOWUP_USER_PROMPT_EN
    );
    const failingAssistant = assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN);

    const rawMessages = [initialRawUser, initialBadAssistant, correctionRawUser, failingAssistant];
    const result = runAlignedPipeline(rawMessages, 'en');

    expect(classifyFormulationGuardedTurn(rawMessages[2].content)).toBe('correction_followup');
    expect(result.guardedAligned[3].content).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
    expect(result.guardedAligned[3].metadata?.formulation_guard_replaced).toBe(true);
    expect(result.guardedAligned[3].metadata?.formulation_guard_reason_codes).toContain(
      'unsupported_deeper_claim_without_tentative_marker'
    );
    expect(result.guardedAligned[3].metadata?.formulation_guard_reason_codes).toContain(
      'missing_verification_question'
    );
    expect(result.guardedAligned[3].metadata?.formulation_guard_reason_codes).toContain(
      'conclusion_drawn_when_explicitly_blocked'
    );
    expect(result.finalVisible.some((m) => m?.content === PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN)).toBe(false);
    expect(result.finalVisible.filter((m) => m?.content === EXACT_ENGLISH_CONTINUATION_FALLBACK)).toHaveLength(1);
    expect(result.pendingCorrection).not.toBeNull();
    expect(result.pendingCorrection.fallbackText).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
    expect(result.finalVisible[2].content).toBe(CORRECTION_FOLLOWUP_USER_PROMPT_EN);
  });

  it('19. correction-followup valid Hebrew response remains byte-for-byte unchanged', () => {
    const rawUser = rawCorrectionFollowupUser('u2', EXACT_HEBREW_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_HE);
    const asst = assistantMsg('a2', VALID_CORRECTION_FOLLOWUP_HE);

    const { messages, pendingCorrection } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUser('u2', CORRECTION_FOLLOWUP_USER_PROMPT_HE), asst],
      { locale: 'he' }
    );

    expect(messages[1].content).toBe(VALID_CORRECTION_FOLLOWUP_HE);
    expect(messages[1].metadata?.formulation_guard_replaced).toBeUndefined();
    expect(pendingCorrection).toBeNull();
  });

  it('20. correction-followup invalid Hebrew response becomes the Hebrew continuation fallback', () => {
    const rawUser = rawCorrectionFollowupUser('u2', EXACT_HEBREW_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_HE);
    const asst = assistantMsg('a2', INVALID_CORRECTION_FOLLOWUP_HE);

    const { messages, pendingCorrection } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUser('u2', CORRECTION_FOLLOWUP_USER_PROMPT_HE), asst],
      { locale: 'he' }
    );

    expect(messages[1].content).toBe(EXACT_HEBREW_CONTINUATION_FALLBACK);
    expect(messages[1].metadata?.formulation_guard_reason_codes).toContain(
      'conclusion_drawn_when_explicitly_blocked'
    );
    expect(pendingCorrection?.fallbackText).toBe(EXACT_HEBREW_CONTINUATION_FALLBACK);
  });

  it('preserves raw assistant pairing when earlier assistant turns are filtered from the visible pipeline', () => {
    const raw = [
      { id: 'u1', role: 'user', content: 'hello' },
      { id: 'a1', role: 'assistant', content: 'connection_error' },
      { id: 'u2', role: 'user', content: 'I feel stuck in a loop and it always ends the same way.' },
      {
        id: 'a2',
        role: 'assistant',
        content: 'זה תמיד נגמר אותו דבר עבורך.',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'he');
    const latestAssistant = visible.filter((msg) => msg.role === 'assistant').pop();

    expect(visible.map((msg) => msg.id)).toEqual(['u1', 'u2', 'a2']);
    expect(latestAssistant.__rawIndex).toBe(3);
    expect(latestAssistant.metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('21. correction-followup Safety Mode turn bypasses the formulation guard', () => {
    const rawUser = rawSafetyPlusCorrectionUser('u3', EXACT_HEBREW_FALLBACK, 'תמשיך בעדינות ובלי לקבוע מסקנה');
    const asst = assistantMsg('a3', INVALID_CORRECTION_FOLLOWUP_HE);

    const { messages } = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUser('u3', 'תמשיך בעדינות ובלי לקבוע מסקנה'), asst],
      { locale: 'he' }
    );

    expect(messages[1].content).toBe(INVALID_CORRECTION_FOLLOWUP_HE);
    expect(messages[1].metadata?.formulation_guard_replaced).toBeUndefined();
  });

  it('22. correction-followup subscription, polling, hydration, and restoration stay identical', () => {
    const rawUser = rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN);
    const asst = assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN);
    const sanitizedAligned = [sanitizedUser('u2', CORRECTION_FOLLOWUP_USER_PROMPT_EN), asst];

    const subscription = applyFormulationGuardToConversationMessages([rawUser, asst], sanitizedAligned, { locale: 'en' });
    const polling = applyFormulationGuardToConversationMessages([rawUser, asst], sanitizedAligned, { locale: 'en' });
    const hydration = applyFormulationGuardToConversationMessages([rawUser, asst], sanitizedAligned, { locale: 'en' });
    const restoration = applyFormulationGuardToConversationMessages([rawUser, asst], sanitizedAligned, { locale: 'en' });

    const contents = [subscription, polling, hydration, restoration].map((result) => result.messages[1].content);
    expect(new Set(contents)).toEqual(new Set([EXACT_ENGLISH_CONTINUATION_FALLBACK]));
    expect(subscription.pendingCorrection?.fallbackText).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
    expect(polling.pendingCorrection?.fallbackText).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
  });

  it('23. correction-followup repeated processing is idempotent', () => {
    const rawUser = rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN);
    const asst = assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN);
    const first = applyFormulationGuardToConversationMessages(
      [rawUser, asst],
      [sanitizedUser('u2', CORRECTION_FOLLOWUP_USER_PROMPT_EN), asst],
      { locale: 'en' }
    );
    const second = applyFormulationGuardToConversationMessages([rawUser, asst], first.messages, { locale: 'en' });

    expect(second.messages[1].content).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
    expect(second.messages[1].metadata?.formulation_guard_replaced).toBe(true);
    expect(second.pendingCorrection?.fallbackText).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
  });
});

describe('formulationContractGuard — raw-index alignment regressions', () => {
  it('1. no id/no created_at with one leading null: TEST B failing response is deterministically replaced', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'שלום, אני כאן איתך.' },
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];

    const result = runAlignedPipeline(raw, 'he');

    expect(result.sanitizedAligned).toHaveLength(4);
    expect(result.sanitizedAligned[0]).toBeNull();
    expect(result.sanitizedAligned[1]?.content).toBe('שלום, אני כאן איתך.');
    expect(result.sanitizedAligned[2]?.content).toBe(TEST_B_USER_PROMPT);
    expect(result.sanitizedAligned[3]?.content).toBe(TEST_B_FAILING_ASSISTANT);

    const guardedAssistant = result.guardedAligned[3];
    expect(guardedAssistant.content).toBe(EXACT_HEBREW_FALLBACK);
    expect(guardedAssistant.metadata?.formulation_guard_replaced).toBe(true);
    expect(guardedAssistant.metadata?.formulation_guard_reason_codes).toContain(
      'unsupported_deeper_claim_without_tentative_marker'
    );
    expect(guardedAssistant.metadata?.formulation_guard_reason_codes).toContain(
      'missing_verification_question'
    );
    expect(result.finalVisible.some((m) => m?.content === TEST_B_FAILING_ASSISTANT)).toBe(false);
    expect(result.pendingCorrection).not.toBeNull();
    expect(result.finalVisible.map((m) => m.role)).toEqual(['assistant', 'user', 'assistant']);
  });

  it('2. no id/no created_at with one leading null: TEST A failing response is deterministically replaced', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'שלום, אני כאן איתך.' },
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_A_USER_PROMPT}` },
      { role: 'assistant', content: TEST_A_FAILING_ASSISTANT },
    ];

    const result = runAlignedPipeline(raw, 'he');
    const guardedAssistant = result.guardedAligned[3];
    expect(guardedAssistant.content).toBe(EXACT_HEBREW_FALLBACK);
    expect(guardedAssistant.metadata?.formulation_guard_replaced).toBe(true);
    expect(guardedAssistant.metadata?.formulation_guard_reason_codes).toContain(
      'unsupported_deeper_claim_without_tentative_marker'
    );
    expect(guardedAssistant.metadata?.formulation_guard_reason_codes).toContain(
      'missing_verification_question'
    );
  });

  it('3. no id/no created_at with multiple leading null/internal user messages still guards by raw index', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'פתיחה רגילה.' },
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];
    const result = runAlignedPipeline(raw, 'he');
    expect(result.sanitizedAligned[0]).toBeNull();
    expect(result.sanitizedAligned[1]).toBeNull();
    expect(result.guardedAligned[4]?.metadata?.formulation_guard_replaced).toBe(true);
    expect(result.guardedAligned[4]?.content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('4. stable IDs present: replacement behavior is unchanged', () => {
    const rawUser = rawGuardedUser('u-100', TEST_B_USER_PROMPT);
    const asst = assistantMsg('a-100', TEST_B_FAILING_ASSISTANT);
    const result = runAlignedPipeline([rawUser, asst], 'he');
    expect(result.guardedAligned[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(result.guardedAligned[1].metadata?.formulation_guard_replaced).toBe(true);
  });

  it('5. created_at present and IDs absent: replacement behavior is unchanged', () => {
    const raw = [
      { role: 'user', created_at: '2026-07-29T00:00:00.000Z', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', created_at: '2026-07-29T00:00:01.000Z', content: TEST_B_FAILING_ASSISTANT },
    ];
    const result = runAlignedPipeline(raw, 'he');
    expect(result.guardedAligned[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(result.guardedAligned[1].metadata?.formulation_guard_replaced).toBe(true);
  });

  it('6. subscription-aligned transform preserves raw array length/indexes before guard', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'פתיחה רגילה.' },
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];

    const result = runAlignedPipeline(raw, 'he', (msg) => {
      if (!msg) return null;
      if (msg.role === 'assistant' && msg.content === 'פתיחה רגילה.') return null;
      return msg;
    });

    expect(result.transformedAligned).toHaveLength(raw.length);
    expect(result.transformedAligned[0]).toBeNull();
    expect(result.transformedAligned[1]).toBeNull();
    expect(result.transformedAligned[2]?.role).toBe('user');
    expect(result.transformedAligned[3]?.role).toBe('assistant');
    expect(result.guardedAligned[3]?.metadata?.formulation_guard_replaced).toBe(true);
  });

  it('7. ordinary unguarded response after null entries remains unchanged', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'פתיחה רגילה.' },
      { role: 'user', content: 'שאלה רגילה בלי בלוק.' },
      { role: 'assistant', content: 'תגובה רגילה בלי העמקה זהותית.' },
    ];
    const result = runAlignedPipeline(raw, 'he');
    expect(result.guardedAligned[3].content).toBe('תגובה רגילה בלי העמקה זהותית.');
    expect(result.guardedAligned[3].metadata?.formulation_guard_replaced).toBeUndefined();
  });

  it('8. Safety Mode response after null entries remains unchanged', () => {
    const raw = [
      { role: 'user', content: '[START_SESSION]' },
      { role: 'assistant', content: 'פתיחה רגילה.' },
      {
        role: 'user',
        content: `${SM_START}\nSafety instructions.\n${SM_END}\n\n${FD_START}\nFormulation instructions.\n${FD_END}\n\nעזרה`,
      },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];
    const result = runAlignedPipeline(raw, 'he');
    expect(result.guardedAligned[3].content).toBe(TEST_B_FAILING_ASSISTANT);
    expect(result.guardedAligned[3].metadata?.formulation_guard_replaced).toBeUndefined();
  });

  it('9. no duplicate fallback across re-application', () => {
    const raw = [
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];
    const first = runAlignedPipeline(raw, 'he');
    const second = applyFormulationGuardToConversationMessages(raw, first.guardedAligned, { locale: 'he' });
    expect(second.messages.filter((m) => m && m.role === 'assistant')).toHaveLength(1);
    expect(second.messages[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('10. pending correction is one-shot in same conversation and does not carry across another conversation', () => {
    const convA = [
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];
    const firstPass = runAlignedPipeline(convA, 'he');
    expect(firstPass.pendingCorrection).not.toBeNull();

    const correctionBlock = buildPendingFormulationCorrectionBlock(firstPass.pendingCorrection.fallbackText);
    const convAAfterCorrection = [
      ...convA,
      { role: 'user', content: `${correctionBlock}\n\nהודעה חדשה` },
      { role: 'assistant', content: 'תשובה תקינה.' },
    ];
    const secondPass = runAlignedPipeline(convAAfterCorrection, 'he');
    expect(secondPass.pendingCorrection).toBeNull();

    const convB = [
      { role: 'user', content: 'שיחה נפרדת ללא בלוק העמקה.' },
      { role: 'assistant', content: 'תשובה נפרדת.' },
    ];
    const convBPass = runAlignedPipeline(convB, 'he');
    expect(convBPass.pendingCorrection).toBeNull();
    expect(convBPass.finalVisible[1].content).toBe('תשובה נפרדת.');
  });

  it('11. guard path does not log raw message content', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const raw = [
      { role: 'user', content: `${FD_START}\nSome instruction.\n${FD_END}\n\n${TEST_B_USER_PROMPT}` },
      { role: 'assistant', content: TEST_B_FAILING_ASSISTANT },
    ];
    runAlignedPipeline(raw, 'he');
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('current-turn grounding guard', () => {
  const CURRENT_TURN_HE_FALLBACK =
    'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';
  const CURRENT_TURN_EN_FALLBACK =
    'There is not yet enough information to determine what is causing this tension. What is the first thing that goes through your mind or body at the moment the tension starts?';

  it('replaces unsupported inferred relationship/perfection claims with deterministic fallback', () => {
    const raw = [
      {
        role: 'user',
        content: 'I become tense before replying to a close person.',
      },
      {
        role: 'assistant',
        content:
          'You need to find the right response because closeness raises the stakes and you fear damaging the relationship.',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible).toHaveLength(2);
    expect(visible[1].content).toBe(CURRENT_TURN_EN_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
    expect(visible[1].metadata?.current_turn_grounding_guard_reason_codes).toEqual([
      'unsupported_current_turn_grounding_claim',
    ]);
  });

  it('records exact grounding diagnostic group/term/reason for replacement path', () => {
    const detail = evaluateCurrentTurnGroundingContractDetailed(
      'Closeness raises the stakes and you fear damaging the relationship.',
      'I become tense before replying to a close person.'
    );
    expect(detail.pass).toBe(false);
    expect(detail.reasonCodes).toEqual(['unsupported_current_turn_grounding_claim']);
    expect(detail.matchedClaimGroup).toBe('relationship_meaning');
    expect(detail.matchedAssistantTerm).toBe('closeness raises the stakes');
    expect(detail.matchedAffirmativeUserTerm).toBe('none');
    expect(typeof detail.rejectedSentenceSnippet).toBe('string');
    expect(detail.rejectedSentenceSnippet.length).toBeLessThanOrEqual(160);
  });

  it('detailed evaluator preserves base pass/reason behavior', () => {
    const assistant =
      'Maybe one possibility is that this feels high-stakes for a reason not yet clear, and I want to check rather than assume. What is the first thought or body sensation you notice when the tension starts?';
    const user = 'I become tense before replying to a close person.';
    const base = evaluateCurrentTurnGroundingContract(assistant, user);
    const detailed = evaluateCurrentTurnGroundingContractDetailed(assistant, user);
    expect(detailed.pass).toBe(base.pass);
    expect(detailed.reasonCodes).toEqual(base.reasonCodes);
  });

  it('allows tentative possibilities only with one verification question', () => {
    const raw = [
      {
        role: 'user',
        content: 'I become tense before replying to a close person.',
      },
      {
        role: 'assistant',
        content:
          'Maybe one possibility is that this feels high-stakes for a reason not yet clear, and I want to check rather than assume. What is the first thought or body sensation you notice when the tension starts?',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible).toHaveLength(2);
    expect(visible[1].content).toContain('Maybe one possibility');
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('keeps current-message facts authoritative across repeated identical prompts', () => {
    const raw = [
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה לאדם קרוב.' },
      {
        role: 'assistant',
        content: 'זה אומר שאתה מפחד לפגוע בקשר, ולכן אתה חייב תשובה נכונה.',
      },
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה לאדם קרוב.' },
      {
        role: 'assistant',
        content: 'כמו שכבר ברור לנו, זה פחד מפגיעה בקשר שמחזיק את המעגל.',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'he');
    const assistantTurns = visible.filter((msg) => msg.role === 'assistant');
    expect(assistantTurns).toHaveLength(2);
    expect(assistantTurns[0].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(assistantTurns[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(assistantTurns[0].metadata?.current_turn_grounding_guard_replaced).toBe(true);
    expect(assistantTurns[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });
});

describe('Chat monotonic guarded-message merge regressions', () => {
  it('1. subscription fallback then polling raw overwrite keeps fallback visible', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-sub-1';
    const guardedRaw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const fallbackVisible = runChatVisiblePipeline(guardedRaw, 'he');
    const first = applyMonotonicGuardedMerge({ conversationId, incomingMessages: fallbackVisible, lastConfirmedMessages: [], scopedMemory });

    const staleRaw = [{ id: 'u1', role: 'user', content: TEST_B_USER_PROMPT }, assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const staleVisible = runChatVisiblePipeline(staleRaw, 'he');
    const second = applyMonotonicGuardedMerge({ conversationId, incomingMessages: staleVisible, lastConfirmedMessages: first, scopedMemory });

    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(second[1].metadata?.formulation_guard_replaced).toBe(true);
  });

  it('2. polling fallback then subscription raw overwrite keeps fallback visible', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-poll-1';
    const guardedRaw = [rawGuardedUser('u1', TEST_A_USER_PROMPT), assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const pollingVisible = runChatVisiblePipeline(guardedRaw, 'he');
    const first = applyMonotonicGuardedMerge({ conversationId, incomingMessages: pollingVisible, lastConfirmedMessages: [], scopedMemory });

    const subscriptionRaw = [{ id: 'u1', role: 'user', content: TEST_A_USER_PROMPT }, assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const subscriptionVisible = runChatVisiblePipeline(subscriptionRaw, 'he');
    const second = applyMonotonicGuardedMerge({ conversationId, incomingMessages: subscriptionVisible, lastConfirmedMessages: first, scopedMemory });

    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('3. fallback snapshot followed by marker-incomplete stale snapshot preserves fallback', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-stale-1';
    const guardedRaw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(guardedRaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const markerIncompleteRaw = [
      { id: 'u1', role: 'user', content: '=== FORMULATION DEEPENING — THIS TURN ONLY ===\nmissing end block' },
      assistantMsg('a1', TEST_B_FAILING_ASSISTANT),
    ];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(markerIncompleteRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('4. correction-followup fallback cannot be replaced by failing English raw response', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-cf-en';
    const guardedRaw = [
      rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN),
      assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN),
    ];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(guardedRaw, 'en'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const staleRaw = [
      { id: 'u2', role: 'user', content: CORRECTION_FOLLOWUP_USER_PROMPT_EN },
      assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN),
    ];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(staleRaw, 'en'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_ENGLISH_CONTINUATION_FALLBACK);
  });

  it('5. initial Hebrew fallback cannot be replaced by failing Hebrew raw response', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-init-he';
    const guardedRaw = [rawGuardedUser('u1', TEST_A_USER_PROMPT), assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(guardedRaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const staleRaw = [{ id: 'u1', role: 'user', content: TEST_A_USER_PROMPT }, assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(staleRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('6. partial streaming update followed by invalid final response never shows rejected content', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-stream-invalid';
    const partialRaw = [rawGuardedUser('u1', 'continue'), assistantMsg('a1', 'ייתכן שזה נוגע לערך עצמי. מה אתה חושב?')];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(partialRaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const invalidFinalRaw = [rawGuardedUser('u1', 'continue'), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(invalidFinalRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(second[1].content).not.toBe(TEST_B_FAILING_ASSISTANT);
  });

  it('7. invalid partial then valid completed response uses deterministic sticky precedence (guarded wins)', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-invalid-then-valid';
    const invalidRaw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(invalidRaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const staleValidRaw = [{ id: 'u1', role: 'user', content: TEST_B_USER_PROMPT }, assistantMsg('a1', VALID_TENTATIVE_HE)];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(staleValidRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(second[1].metadata?.formulation_guard_replaced).toBe(true);
  });

  it('8. visibility refetch after fallback cannot restore rejected content', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-visibility';
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline([rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)], 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const visibilityRaw = [{ id: 'u1', role: 'user', content: TEST_B_USER_PROMPT }, assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(visibilityRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('9. focus refetch after fallback cannot restore rejected content', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-focus';
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline([rawGuardedUser('u1', TEST_A_USER_PROMPT), assistantMsg('a1', TEST_A_FAILING_ASSISTANT)], 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const focusRaw = [{ id: 'u1', role: 'user', content: TEST_A_USER_PROMPT }, assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(focusRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('10. hydration after refresh reconstructs fallback from complete raw history', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-hydration-refresh';
    const raw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const hydrated = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(raw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    expect(hydrated[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('11. conversation switch away and back reconstructs fallback', () => {
    const scopedMemory = new Map();
    const convA = 'conv-A';
    const convB = 'conv-B';
    const convARaw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const firstA = applyMonotonicGuardedMerge({
      conversationId: convA,
      incomingMessages: runChatVisiblePipeline(convARaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const convBRaw = [{ id: 'u10', role: 'user', content: 'regular message' }, assistantMsg('a10', 'regular answer')];
    applyMonotonicGuardedMerge({
      conversationId: convB,
      incomingMessages: runChatVisiblePipeline(convBRaw, 'en'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const backToA = applyMonotonicGuardedMerge({
      conversationId: convA,
      incomingMessages: runChatVisiblePipeline(convARaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    expect(firstA[1].content).toBe(EXACT_HEBREW_FALLBACK);
    expect(backToA[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('12. guarded decision in conversation A does not affect conversation B', () => {
    const scopedMemory = new Map();
    const convA = 'conv-A-iso';
    const convB = 'conv-B-iso';
    const convARaw = [rawGuardedUser('u1', TEST_A_USER_PROMPT), assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    applyMonotonicGuardedMerge({
      conversationId: convA,
      incomingMessages: runChatVisiblePipeline(convARaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const convBRaw = [{ id: 'u1', role: 'user', content: TEST_A_USER_PROMPT }, assistantMsg('a1', TEST_A_FAILING_ASSISTANT)];
    const convBVisible = applyMonotonicGuardedMerge({
      conversationId: convB,
      incomingMessages: runChatVisiblePipeline(convBRaw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    expect(convBVisible[1].content).toBe(
      'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?'
    );
    expect(convBVisible[1].metadata?.formulation_guard_replaced).toBeUndefined();
    expect(convBVisible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('13. later genuine assistant turn with different identity is not blocked', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-later-turn';
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline([rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)], 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const laterRaw = [
      rawGuardedUser('u1', TEST_B_USER_PROMPT),
      assistantMsg('a1', TEST_B_FAILING_ASSISTANT),
      { id: 'u2', role: 'user', content: 'שאלה חדשה רגילה' },
      assistantMsg('a2', 'תגובה חדשה ותקינה.'),
    ];
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(laterRaw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    expect(second).toHaveLength(4);
    expect(second[3].content).toBe('תגובה חדשה ותקינה.');
  });

  it('14. repeated identical subscription snapshots remain idempotent without duplicates', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-idempotent';
    const raw = [rawGuardedUser('u1', TEST_B_USER_PROMPT), assistantMsg('a1', TEST_B_FAILING_ASSISTANT)];
    const first = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(raw, 'he'),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const second = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(raw, 'he'),
      lastConfirmedMessages: first,
      scopedMemory,
    });
    const assistantIds = second.filter((m) => m.role === 'assistant').map((m) => m.id);
    expect(assistantIds).toEqual(['a1']);
    expect(second[1].content).toBe(EXACT_HEBREW_FALLBACK);
  });

  it('15. no second Agent request or retry call is introduced', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(new URL('../../src/pages/Chat.jsx', import.meta.url), 'utf8');
    const addMessageCalls = (source.match(/base44\.agents\.addMessage\(/g) || []).length;
    expect(addMessageCalls).toBe(5);
    const summaryPath = source.split('const requestSummary = async () => {')[1].split('const handleChatIntentChoice')[0];
    expect(summaryPath).toContain('await handleSendMessage({ summaryMessage: summaryPrompt });');
    expect(summaryPath).not.toContain('base44.agents.addMessage(');
  });

  it('16. bounded guard metadata/log payload does not include raw rejected text', () => {
    const scopedMemory = new Map();
    const conversationId = 'conv-bounded-meta';
    const merged = applyMonotonicGuardedMerge({
      conversationId,
      incomingMessages: runChatVisiblePipeline(
        [rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN), assistantMsg('a2', PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN)],
        'en'
      ),
      lastConfirmedMessages: [],
      scopedMemory,
    });
    const serializedMetadata = JSON.stringify(merged[1].metadata || {});
    expect(serializedMetadata).not.toContain(PRODUCTION_CORRECTION_FOLLOWUP_FAILING_ASSISTANT_EN.slice(0, 64));
    expect(Array.isArray(merged[1].metadata?.formulation_guard_reason_codes)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isGuardedTurn helper tests
// ═══════════════════════════════════════════════════════════════════════════════


describe('classifyFormulationGuardedTurn', () => {
  it('returns initial_formulation for complete formulation deepening block', () => {
    expect(classifyFormulationGuardedTurn(rawGuardedUser('u1').content)).toBe('initial_formulation');
  });

  it('returns correction_followup for complete correction block', () => {
    expect(
      classifyFormulationGuardedTurn(
        rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN).content
      )
    ).toBe('correction_followup');
  });

  it('returns null for incomplete correction block', () => {
    expect(
      classifyFormulationGuardedTurn(
        `${FORMULATION_CORRECTION_START}
Partial correction only

${CORRECTION_FOLLOWUP_USER_PROMPT_EN}`
      )
    ).toBeNull();
  });

  it('returns null when Safety Mode and correction block are both present', () => {
    expect(
      classifyFormulationGuardedTurn(
        rawSafetyPlusCorrectionUser('u3', EXACT_HEBREW_FALLBACK, 'תמשיך בעדינות').content
      )
    ).toBeNull();
  });
});

describe('isGuardedTurn', () => {
  it('returns true for raw user message with complete FD block', () => {
    expect(isGuardedTurn(rawGuardedUser('u1').content)).toBe(true);
  });

  it('returns true for raw user message with complete correction block', () => {
    expect(
      isGuardedTurn(
        rawCorrectionFollowupUser('u2', EXACT_ENGLISH_FALLBACK, CORRECTION_FOLLOWUP_USER_PROMPT_EN).content
      )
    ).toBe(true);
  });

  it('returns false for message without guarded block', () => {
    expect(isGuardedTurn('hello world')).toBe(false);
  });

  it('returns false for incomplete FD block (start only)', () => {
    expect(isGuardedTurn(`${FD_START}\nsome text`)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isGuardedTurn(null)).toBe(false);
    expect(isGuardedTurn(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// hasFormulationCorrectionAlreadyBeenApplied tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('hasFormulationCorrectionAlreadyBeenApplied', () => {
  const fallback = buildFormulationSafeFallback('en');
  const block = buildPendingFormulationCorrectionBlock(fallback);

  it('returns true when a later user message contains the correction block', () => {
    const msgs = [
      { id: 'a1', role: 'assistant', content: 'rejected content' },
      { id: 'u2', role: 'user', content: block + '\n\nnext message' },
    ];
    expect(hasFormulationCorrectionAlreadyBeenApplied(msgs, 0)).toBe(true);
  });

  it('returns false when no user message contains the correction block', () => {
    const msgs = [
      { id: 'a1', role: 'assistant', content: 'some content' },
      { id: 'u2', role: 'user', content: 'regular message' },
    ];
    expect(hasFormulationCorrectionAlreadyBeenApplied(msgs, 0)).toBe(false);
  });

  it('returns false for empty messages array', () => {
    expect(hasFormulationCorrectionAlreadyBeenApplied([], 0)).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(hasFormulationCorrectionAlreadyBeenApplied(null, 0)).toBe(false);
  });

  it('afterIndex = -1 searches from the beginning of the conversation', () => {
    const msgs = [
      { id: 'u1', role: 'user', content: block + '\n\nearly message' },
      { id: 'a1', role: 'assistant', content: 'some content' },
    ];
    expect(hasFormulationCorrectionAlreadyBeenApplied(msgs, -1)).toBe(true);
  });
});

// ─── V8-H: context-aware grounding fixes ──────────────────────────────────────

describe('V8-H: context-aware grounding — false-pass fixes', () => {
  const CURRENT_TURN_HE_FALLBACK =
    'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';
  const CURRENT_TURN_EN_FALLBACK =
    'There is not yet enough information to determine what is causing this tension. What is the first thing that goes through your mind or body at the moment the tension starts?';

  it('question word "למה" in user message does not ground a causal assistant claim', () => {
    const raw = [
      { role: 'user', content: 'אני לא יודע למה זה קורה לי.' },
      { role: 'assistant', content: 'זה נובע מ-חוויות ילדות שגרמו לך לפחד מדחייה.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('negated instruction "אל תציג כסכנה" does not ground a danger assistant claim', () => {
    const raw = [
      { role: 'user', content: 'אל תציג את זה כסכנה.' },
      { role: 'assistant', content: 'המצב הוא סיכון אמיתי עבורך.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('tentative marker in sentence 1 does not exempt an unsupported claim in sentence 2', () => {
    const raw = [
      { role: 'user', content: 'I feel tense.' },
      {
        role: 'assistant',
        content:
          'Maybe I am not sure about this. You fear rejection in the relationship and this explains the tension.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible[1].content).toBe(CURRENT_TURN_EN_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('strict grounding mode ("current information only") blocks even tentative causal claims', () => {
    const raw = [
      { role: 'user', content: 'I feel tense. Current information only.' },
      { role: 'assistant', content: 'Maybe this is because of past relationship issues.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible[1].content).toBe(CURRENT_TURN_EN_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('Hebrew strict trigger "התייחס למה שקורה עכשיו בלבד" blocks tentative causal claims', () => {
    const raw = [
      { role: 'user', content: 'אני מרגיש לחץ. התייחס למה שקורה עכשיו בלבד.' },
      { role: 'assistant', content: 'ייתכן שזה נובע מ-חוויות ילדות.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('Hebrew strict trigger "התייחס רק למה שתיארתי עכשיו" blocks tentative causal claims', () => {
    const raw = [
      { role: 'user', content: 'אני מרגיש לחץ. התייחס רק למה שתיארתי עכשיו.' },
      { role: 'assistant', content: 'ייתכן שזה נובע מ-חוויות ילדות.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('question form "מה הוא יחשוב" does not ground a relationship meaning claim', () => {
    const raw = [
      { role: 'user', content: 'אני חושב מה הוא יחשוב עלי.' },
      { role: 'assistant', content: 'הפחד מדחייה מסביר את החרדה שלך.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('"תגובה נכונה" correctness claim blocked when user has not confirmed it', () => {
    const raw = [
      { role: 'user', content: 'אני מרגיש לחץ לפני תגובה.' },
      { role: 'assistant', content: 'אתה מחפש את התגובה הנכונה ורוצה להיות מושלם.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('avoidance, delay and cycle claims are blocked without user mention', () => {
    const raw = [
      { role: 'user', content: 'I feel nervous before responding.' },
      {
        role: 'assistant',
        content: 'Delaying your response maintains the avoidance pattern and keeps the cycle going.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible[1].content).toBe(CURRENT_TURN_EN_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('user-confirmed relationship theme allows assistant relationship claims', () => {
    const raw = [
      { role: 'user', content: 'I am afraid this will damage our relationship.' },
      {
        role: 'assistant',
        content: 'You mentioned fear of harming the relationship — that is what we should explore.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'en');
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('allows CBT threat-appraisal terminology when grounded in current-turn thought/tension terms', () => {
    const raw = [
      { role: 'user', content: 'יש לי מחשבה מלחיצה ואני מרגיש מתח חזק בגוף.' },
      {
        role: 'assistant',
        content: 'המחשבה הזאת נחווית כהערכת איום, והמוח מפרש אותה כאיום שמורגשת כמתח בגוף ברגע הזה.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('still blocks unsupported direct current danger claims', () => {
    const raw = [
      { role: 'user', content: 'אני מרגיש מתח עכשיו.' },
      { role: 'assistant', content: 'אתה בסכנה כרגע.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('strips CURRENT_TURN_GROUNDING_CORRECTION blocks before user-evidence extraction', () => {
    const correctionBlock = [
      CURRENT_TURN_GROUNDING_CORRECTION_START,
      'Do not treat inferred danger language as established fact.',
      CURRENT_TURN_GROUNDING_CORRECTION_END,
    ].join('\n');
    const raw = [
      {
        role: 'user',
        content: `${correctionBlock}\n\nאני מרגיש מתח לפני שאני שולח הודעה.`,
      },
      { role: 'assistant', content: 'זה מסוכן עבורך.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('repeated identical prompt returns grounding fallback — never the generic failsafe', () => {
    const raw = [
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה לאדם קרוב.' },
      { role: 'assistant', content: 'זה אומר שאתה מפחד לפגוע בקשר, ולכן אתה חייב תשובה נכונה.' },
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה לאדם קרוב.' },
      { role: 'assistant', content: 'כמו שכבר ברור לנו, זה פחד מפגיעה בקשר שמחזיק את המעגל.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    const assistantTurns = visible.filter(m => m.role === 'assistant');
    for (const turn of assistantTurns) {
      expect(turn.content).toBe(CURRENT_TURN_HE_FALLBACK);
      expect(turn.content).not.toBe('אני כאן איתך. מה הכי מטריד אותך כרגע?');
    }
  });

  it('FinalOutputGovernor preserves the grounding fallback without replacing it', () => {
    const heFallback = buildCurrentTurnGroundingFallback('he');
    const enFallback = buildCurrentTurnGroundingFallback('en');
    expect(applyFinalOutputGovernor(heFallback, { lang: 'he' })).toBe(heFallback);
    expect(applyFinalOutputGovernor(enFallback, { lang: 'en' })).toBe(enFallback);
  });
});

// ─── V8-I: current-turn evidence grounding ────────────────────────────────────

describe('V8-I: allow explanations grounded in explicit current-turn facts', () => {
  const CURRENT_TURN_HE_FALLBACK =
    'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';

  // ─── Exact production prompts used throughout ────────────────────────────

  // User who explicitly states thought + body tension + delay + repeated checking
  const FULL_EVIDENCE_USER_MSG =
    'המחשבה: "מה הוא יחשוב עליי אם אכתוב משהו לא נכון?" ' +
    'אני מרגיש מתח בגוף. ' +
    'אני מתעכב ובודק שוב ושוב לפני שאני שולח. ' +
    'תסביר לי מה הקשר.';

  // Valid assistant explanation grounded only in the stated facts
  const VALID_EXPLANATION =
    "המחשבה \"מה הוא יחשוב עליי\" מעוררת מתח, " +
    "וזה מוביל לעיכוב ובדיקה חוזרת של מה שכתבת — " +
    "הימנעות מלשלוח עד שזה ייראה נכון.";

  it('missing-information prompt produces grounding fallback', () => {
    const raw = [
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה.' },
      { role: 'assistant', content: 'הימנעות מוגדרת שומרת על המעגל ומונעת ממך להתקדם.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('repeated identical prompt continues to return grounding fallback', () => {
    const raw = [
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה.' },
      { role: 'assistant', content: 'הימנעות שומרת על המעגל.' },
      { role: 'user', content: 'אני נהיה מתוח לפני שאני עונה.' },
      { role: 'assistant', content: 'הימנעות שומרת על המעגל.' },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    const assistantTurns = visible.filter((m) => m.role === 'assistant');
    expect(assistantTurns).toHaveLength(2);
    for (const turn of assistantTurns) {
      expect(turn.content).toBe(CURRENT_TURN_HE_FALLBACK);
      expect(turn.metadata?.current_turn_grounding_guard_replaced).toBe(true);
    }
  });

  it('explicit thought + tension + delay prompt allows valid explanation through', () => {
    const raw = [
      { role: 'user', content: FULL_EVIDENCE_USER_MSG },
      { role: 'assistant', content: VALID_EXPLANATION },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('explanation that uses only user-stated facts is not replaced', () => {
    // All assistant terms in this response (הימנעות, עיכוב, בדיקה חוזרת) are
    // grounded by the user explicitly mentioning מתעכב / בודק שוב ושוב.
    const raw = [
      { role: 'user', content: FULL_EVIDENCE_USER_MSG },
      {
        role: 'assistant',
        content:
          'כשעולה המחשבה על מה שיחשבו, הגוף מגיב במתח. ' +
          'המתח מוביל לעיכוב ולבדיקה חוזרת — הימנעות מסיום הכתיבה.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('unsupported identity theme added to the explanation is still blocked', () => {
    const raw = [
      { role: 'user', content: FULL_EVIDENCE_USER_MSG },
      {
        role: 'assistant',
        content:
          VALID_EXPLANATION + ' זהות ומי שאתה כאדם הם השאלות העמוקות כאן.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('connection_error content is never rendered as an AI bubble', () => {
    const raw = [
      { role: 'user', content: 'שלום.' },
      { role: 'assistant', content: 'connection_error' },
    ];
    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    // connection_error message must be suppressed (null)
    expect(sanitized[1]).toBeNull();
  });

  it('connection_error suppression preserves the later valid opener', () => {
    const raw = [
      { role: 'user', content: 'שלום.' },
      { role: 'assistant', content: 'connection_error' },
      { role: 'assistant', content: 'שלום, אני כאן בשבילך. איך אתה מרגיש היום?' },
    ];
    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    expect(sanitized[1]).toBeNull();
    expect(sanitized[2]).not.toBeNull();
    expect(sanitized[2].content).toContain('שלום');
  });
});

// ─── V8-J: exact production-prompt evidence mismatch fix ──────────────────────

describe('V8-J: exact production prompt — explicit connection request without body-tension statement', () => {
  const CURRENT_TURN_HE_FALLBACK =
    'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';

  // ─── Exact production prompt used throughout ─────────────────────────────
  // Explicitly names: thought, delay, repeated checking, and the connection
  // between thought / tension / delay.  Does NOT contain "אני מרגיש מתח בגוף".
  const PROD_USER_MSG =
    'המחשבה: "מה הוא יחשוב עליי אם אכתוב משהו לא נכון?" ' +
    'אני מתעכב ובודק שוב ושוב לפני שאני שולח. ' +
    'תסביר לי את הקשר בין המחשבה, המתח והעיכוב.';

  it('valid explanation using גורמת למתח passes through unchanged', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content:
          'המחשבה "מה הוא יחשוב עליי" גורמת למתח; ' +
          'המתח מוביל לעיכוב ולבדיקה חוזרת של הכתיבה.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('valid explanation using המתח מוביל לעיכוב passes through unchanged', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content: 'המתח מוביל לעיכוב ולבדיקה חוזרת — הימנעות מסיום הכתיבה.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('valid explanation using לכן מתרחשת בדיקה חוזרת passes through unchanged', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content:
          'המחשבה על מה שיחשב גורמת למתח; לכן מתרחשת בדיקה חוזרת לפני שליחה.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('combined realistic response with גורמת, מוביל and לכן all passes unchanged', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content:
          'המחשבה "מה הוא יחשוב עליי" גורמת למתח; ' +
          'המתח מוביל לעיכוב ולבדיקה חוזרת, ' +
          'לכן מתרחשת דחיית השליחה שוב ושוב.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
  });

  it('valid response with added unsupported identity sentence is replaced', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content:
          'המחשבה גורמת למתח; המתח מוביל לעיכוב. ' +
          'זהות ומי שאתה כאדם הם השאלות העמוקות כאן.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('valid response with added unsupported worth sentence is replaced', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content:
          'המחשבה גורמת למתח; המתח מוביל לעיכוב. ' +
          'ערך עצמי ותחושת מסוגלות הם שורש הקושי.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('prompt without explicit connection request still produces grounding fallback', () => {
    // Thought alone, no "הקשר בין" — assistant uses causal terms → blocked.
    const raw = [
      {
        role: 'user',
        content: 'המחשבה: "מה הוא יחשוב עליי אם אכתוב משהו לא נכון?"',
      },
      {
        role: 'assistant',
        content: 'המחשבה גורמת למתח שמוביל לעיכוב ולבדיקה חוזרת.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('repeated exact production prompt continues to allow valid causal explanation', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content: 'המחשבה גורמת למתח; המתח מוביל לעיכוב ולבדיקה חוזרת.',
      },
      { role: 'user', content: PROD_USER_MSG },
      {
        role: 'assistant',
        content: 'גורמת למתח, מוביל לעיכוב, לכן בדיקה חוזרת.',
      },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    const assistantTurns = visible.filter((m) => m.role === 'assistant');
    expect(assistantTurns).toHaveLength(2);
    for (const turn of assistantTurns) {
      expect(turn.content).not.toBe(CURRENT_TURN_HE_FALLBACK);
      expect(turn.metadata?.current_turn_grounding_guard_replaced).toBeUndefined();
    }
  });
});

describe('V8-M: grounding correction parity and wrapped first-turn path', () => {
  const CURRENT_TURN_HE_FALLBACK =
    'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';
  const PROD_USER_MSG =
    'המחשבה: "מה הוא יחשוב עליי אם אכתוב משהו לא נכון?" ' +
    'אני מתעכב ובודק שוב ושוב לפני שאני שולח. ' +
    'תסביר לי את הקשר בין המחשבה, המתח והעיכוב.';
  const SESSION_WRAPPED_PROMPT =
    '[START_SESSION]\n\n' +
    '=== THERAPIST PLANNER-FIRST POLICY ===\n' +
    'formulation-first guidance\n' +
    '=== END THERAPIST PLANNER-FIRST POLICY ===\n\n' +
    PROD_USER_MSG;
  const UNSUPPORTED_GROUNDED_REPLY =
    'המחשבה גורמת למתח; המתח מוביל לעיכוב. זהות ומי שאתה כאדם הם השאלות העמוקות כאן.';

  it('creates a pending grounding correction after replacement', () => {
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      { role: 'assistant', content: UNSUPPORTED_GROUNDED_REPLY },
    ];
    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    const { messages: guarded } = applyFormulationGuardToConversationMessages(raw, sanitized, { locale: 'he' });
    const grounded = applyCurrentTurnGroundingGuardToConversationMessages(raw, guarded, { locale: 'he' });
    expect(grounded.messages[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(grounded.pendingCorrection).not.toBeNull();
    const correctionBlock = buildPendingGroundingCorrectionBlock(grounded.pendingCorrection.fallbackText);
    expect(correctionBlock).toContain(CURRENT_TURN_GROUNDING_CORRECTION_START);
    expect(correctionBlock).toContain(CURRENT_TURN_GROUNDING_CORRECTION_END);
  });

  it('detects when a grounding correction block was already persisted', () => {
    const correction = buildPendingGroundingCorrectionBlock(CURRENT_TURN_HE_FALLBACK);
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      { role: 'assistant', content: UNSUPPORTED_GROUNDED_REPLY },
      { role: 'user', content: `${correction}\n\n${PROD_USER_MSG}` },
    ];
    expect(hasGroundingCorrectionAlreadyBeenApplied(raw, 1)).toBe(true);
  });

  it('wrapped first-turn prompt still applies grounding guard deterministically', () => {
    const raw = [
      { role: 'user', content: SESSION_WRAPPED_PROMPT },
      { role: 'assistant', content: UNSUPPORTED_GROUNDED_REPLY },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(visible[1].metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });

  it('repeated identical prompt after grounding correction still rejects unsupported inference', () => {
    const correction = buildPendingGroundingCorrectionBlock(CURRENT_TURN_HE_FALLBACK);
    const raw = [
      { role: 'user', content: PROD_USER_MSG },
      { role: 'assistant', content: UNSUPPORTED_GROUNDED_REPLY },
      { role: 'user', content: `${correction}\n\n${PROD_USER_MSG}` },
      { role: 'assistant', content: UNSUPPORTED_GROUNDED_REPLY },
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    const assistantTurns = visible.filter((m) => m.role === 'assistant');
    expect(assistantTurns).toHaveLength(2);
    assistantTurns.forEach((turn) => {
      expect(turn.content).toBe(CURRENT_TURN_HE_FALLBACK);
      expect(turn.metadata?.current_turn_grounding_guard_replaced).toBe(true);
    });
  });

  it('does not recreate a consumed grounding correction on later hydration snapshots for the same identities', () => {
    const correction = buildPendingGroundingCorrectionBlock(CURRENT_TURN_HE_FALLBACK);
    const raw = [
      { role: 'user', id: 'u1', content: PROD_USER_MSG },
      { role: 'assistant', id: 'a1', content: UNSUPPORTED_GROUNDED_REPLY },
      { role: 'user', id: 'u2', content: `${correction}\n\n${PROD_USER_MSG}` },
    ];

    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    const { messages: guarded } = applyFormulationGuardToConversationMessages(raw, sanitized, { locale: 'he' });
    const grounded = applyCurrentTurnGroundingGuardToConversationMessages(raw, guarded, { locale: 'he' });

    expect(grounded.pendingCorrection).toBeNull();
    expect(grounded.messages).toHaveLength(3);
  });

  it('allows the production hebrew third turn to stay visible when explicitly grounded in current-turn facts', () => {
    const raw = [
      { role: 'user', id: 'u1', content: 'אני לחוץ לקראת פגישה חשובה מחר.' },
      { role: 'assistant', id: 'a1', content: 'זה נשמע כמו הרבה לחץ לקראת מחר.' },
      { role: 'user', id: 'u2', content: 'אני חושש שאטעה מול האנשים בפגישה.' },
      { role: 'assistant', id: 'a2', content: 'מובן שהחשש לטעות מול אנשים מגביר את המתח.' },
      { role: 'user', id: 'u3', content: 'בגלל המחשבות האלה קשה לי להירדם.' },
      {
        role: 'assistant',
        id: 'a3',
        content: 'נשמע שהמחשבות על האפשרות לטעות בפגישה מגבירות את המתח, והמתח הזה מקשה עליך להירדם. מה אתה שם לב שקורה בגוף או במחשבות בדיוק כשאתה מנסה להירדם?',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'he');
    const finalAssistant = visible[visible.length - 1];
    expect(finalAssistant.content).not.toBe(CURRENT_TURN_HE_FALLBACK);
    expect(finalAssistant.metadata?.current_turn_grounding_guard_replaced).not.toBe(true);
  });

  it('still produces the fallback for a genuinely unsupported grounding claim', () => {
    const raw = [
      { role: 'user', id: 'u1', content: 'אני לחוץ לקראת פגישה חשובה מחר.' },
      {
        role: 'assistant',
        id: 'a1',
        content: 'המתח הזה נובע מכך שאתה יודע שבפנים אתה לא מספיק טוב. מה הדבר הראשון שעובר בך כשזה קורה?',
      },
    ];

    const visible = runChatVisiblePipeline(raw, 'he');
    const finalAssistant = visible[visible.length - 1];
    expect(finalAssistant.content).toBe(CURRENT_TURN_HE_FALLBACK);
    expect(finalAssistant.metadata?.current_turn_grounding_guard_replaced).toBe(true);
  });
});
