/**
 * @file src/lib/therapistStrategyEngine.js
 *
 * Therapist Upgrade — Wave 2A — Therapeutic Strategy Layer (Scaffold)
 *
 * PURPOSE
 * -------
 * Pure deterministic strategy engine that produces a TherapistStrategyState
 * object from bounded inputs.  No LLM calls, no entity access, no async,
 * no side effects.  All outputs are derived from explicit input arguments only.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module has NO imports from any other app module.  It does NOT import
 * from agentWiring, activeAgentWiring, featureFlags, workflowContextInjector,
 * or any entity definition.  It is a standalone, self-contained pure library.
 *
 * This module is NOT wired into any runtime session path in this PR.
 * No Chat.jsx, no buildV8SessionStartContentAsync, no agent wiring changes.
 * Activation is gated by VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED (Wave 2A flag)
 * which defaults to false.  This file may be safely imported by tests in the
 * current state without affecting any live behavior.
 *
 * SAFETY CONTRACT
 * ---------------
 * - If inputs are ambiguous or missing, bias toward conservative / safe modes.
 * - If safety mode is active (safetyResult.safety_mode === true), the output
 *   intervention mode MUST be CONTAINMENT.  No other mode may override this.
 * - All outputs are frozen plain objects.  No mutation after creation.
 * - All public functions never throw — they catch all exceptions and return
 *   fail-safe defaults.
 *
 * FAIL-SAFE DEFAULTS (when inputs are absent, null, or malformed)
 * ---------------------------------------------------------------
 * - distress tier : TIER_LOW
 * - intervention  : STABILISATION (safe middle mode)
 * - strategy state: see STRATEGY_FAIL_SAFE_STATE
 *
 * Source of truth: Wave 2A problem statement (Therapeutic Strategy Layer scaffold)
 */

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Version of the strategy engine.
 * Follows semantic versioning.  Bump the minor when the intervention mode set
 * changes, bump the patch for rule adjustments.
 *
 * @type {string}
 */
export const STRATEGY_VERSION = '1.3.0';

// ─── Distress tiers ───────────────────────────────────────────────────────────

/**
 * Distress tier values, ordered from lowest to highest clinical urgency.
 *
 * The distress tier is an intermediate signal derived from the safety result
 * and the message signals.  It drives intervention mode selection.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const DISTRESS_TIERS = Object.freeze({
  /** No elevated distress signals detected. */
  TIER_LOW: 'tier_low',
  /** Mild distress signals: general emotional language, normal CBT context. */
  TIER_MILD: 'tier_mild',
  /** Moderate distress: high-distress language, low retrieval confidence, or
   *  allowlist rejection without a hard safety trigger. */
  TIER_MODERATE: 'tier_moderate',
  /** High distress: severe hopelessness, shutdown/breakdown, catastrophic
   *  language, or any hard safety trigger active. */
  TIER_HIGH: 'tier_high',
});

// ─── Intervention modes ───────────────────────────────────────────────────────

/**
 * Approved bounded set of intervention modes for the strategy engine.
 *
 * These modes determine the shape of the therapist's response strategy.
 * The set is intentionally small and fixed to prevent scope creep.
 *
 * SAFETY RULE: CONTAINMENT is the mandatory mode when safety_mode is active.
 * No other mode may override a safety-active determination.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const STRATEGY_INTERVENTION_MODES = Object.freeze({
  /**
   * Containment — highest clinical urgency.
   * Activated when safety mode is active (crisis signal, severe hopelessness,
   * shutdown/breakdown, catastrophic language, or flag override).
   * Response must be short, grounding, structured, one question at a time.
   * No exploratory breadth while distress is unresolved.
   */
  CONTAINMENT: 'containment',

  /**
   * Stabilisation — moderate urgency.
   * Activated when moderate distress signals are present but safety mode is
   * not active.  Supports the user in regaining emotional footing before
   * deeper CBT work.  Also the safe default when inputs are absent or ambiguous.
   */
  STABILISATION: 'stabilisation',

  /**
   * Structured exploration — normal CBT engagement.
   * Activated for mild-distress or low-distress sessions with sufficient
   * continuity context (at least one prior session) or a formulation present.
   * Engages the CBT framework (thought records, cognitive restructuring, etc.)
   * within a clear session structure.
   */
  STRUCTURED_EXPLORATION: 'structured_exploration',

  /**
   * Formulation-led deepening — rich continuity session.
   * Activated only when a CaseFormulation is present AND prior session
   * continuity exists (at least one meaningful prior record) AND distress is
   * low or mild.  Prioritises formulation hypotheses and longitudinal patterns
   * in the response focus.
   */
  FORMULATION_DEEPENING: 'formulation_deepening',

  /**
   * Psychoeducation primer — first session / no context.
   * Activated when there is no continuity data and no formulation, regardless
   * of distress tier (as long as safety mode is not active).  Orients the user
   * to the CBT process without assuming any prior clinical picture.
   */
  PSYCHOEDUCATION: 'psychoeducation',
});

// ─── Wave 2C — Continuity richness thresholds ─────────────────────────────────

/**
 * Numeric thresholds for the continuity richness score produced by
 * scoreContinuityRichness().  Higher score = more clinically useful context.
 *
 * Score bands:
 *   MINIMAL  — at least 1 prior session exists; minimal structured data.
 *   MODERATE — 2+ sessions OR at least one of: follow-up tasks / patterns.
 *   RICH     — 2+ sessions AND follow-up tasks AND patterns present.
 *
 * @type {Readonly<Record<string, number>>}
 */
export const CONTINUITY_RICHNESS_THRESHOLDS = Object.freeze({
  MINIMAL: 2,
  MODERATE: 4,
  RICH: 7,
});

// ─── Wave 2C — Formulation strength thresholds ────────────────────────────────

/**
 * Numeric thresholds for the formulation strength score produced by
 * scoreFormulationStrength().  Higher score = more clinical anchoring.
 *
 * Score bands:
 *   THIN     — 1 usable field (e.g. only a hypothesis).
 *   MODERATE — 2 usable fields.
 *   STRONG   — 3+ usable fields (presenting problem + core belief + at least one more).
 *
 * @type {Readonly<Record<string, number>>}
 */
export const FORMULATION_STRENGTH_THRESHOLDS = Object.freeze({
  THIN: 1,
  MODERATE: 2,
  STRONG: 3,
});

// ─── Signal keys ─────────────────────────────────────────────────────────────

/**
 * Message signal keys produced by extractMessageSignals().
 * These are deterministic, pattern-based signals derived from raw message text.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const MESSAGE_SIGNAL_KEYS = Object.freeze({
  HAS_DISTRESS_LANGUAGE: 'has_distress_language',
  HAS_HOPELESSNESS_LANGUAGE: 'has_hopelessness_language',
  HAS_CATASTROPHIC_LANGUAGE: 'has_catastrophic_language',
  HAS_SHUTDOWN_LANGUAGE: 'has_shutdown_language',
  HAS_EMOTIONAL_LANGUAGE: 'has_emotional_language',
  IS_EMPTY_OR_SHORT: 'is_empty_or_short',
});

// ─── Internal pattern tables ──────────────────────────────────────────────────
// These are private to this module.  They are not exported.

/** @type {ReadonlyArray<RegExp>} */
const _HOPELESSNESS_PATTERNS = Object.freeze([
  /\bnothing\s+(will|can|ever)\s+get\s+better\b/i,
  /\bno\s+(hope|point|reason)\s+(left|anymore|at\s+all)\b/i,
  /\bhopeless(ness)?\b/i,
  /\bcan'?t\s+see\s+(a\s+)?way\s+(out|forward|through)\b/i,
  /\blife\s+(is\s+)?(not\s+)?worth\s+(living|it)\b/i,
  /\bwhat'?s\s+the\s+point\b/i,
  /\bnever\s+(going\s+to\s+)?(be\s+)?(okay|fine|better|happy)\b/i,
  /\bnothing\s+(matters|helps|works)\b/i,
]);

/** @type {ReadonlyArray<RegExp>} */
const _SHUTDOWN_PATTERNS = Object.freeze([
  /\bshutting\s+down\b/i,
  /\bcomplete(ly)?\s+(broken|numb|empty|lost)\b/i,
  /\bfalling\s+apart\b/i,
  /\bbreaking\s+down\b/i,
  /\bcollaps(e|ing|ed)\b/i,
  /\bcan'?t\s+(function|cope|go\s+on|face)\b/i,
  /\btotally\s+(lost|numb|empty|broken)\b/i,
  /\bgiven\s+up\b/i,
  // Hebrew — shutdown/collapse language (Wave 2E signal parity, Fix 6)
  /מתפרק/,
  /לא\s+מסוגל.{0,3}לתפקד/,
  /(?:נשבר|מתמוטט)/,
  /לא\s+(?:יכול|מסוגלת?)\s+להמשיך/,
]);

/** @type {ReadonlyArray<RegExp>} */
const _CATASTROPHIC_PATTERNS = Object.freeze([
  /\beverything\s+is\s+(ruined|destroyed|over|hopeless)\b/i,
  /\bmy\s+life\s+is\s+(ruined|over|destroyed)\b/i,
  /\bno\s+way\s+back\b/i,
  /\birreversible\b/i,
  /\bnever\s+(recover|be\s+okay|be\s+normal|be\s+the\s+same)\b/i,
  /\bthis\s+is\s+(the\s+end|all\s+over)\b/i,
  // Hebrew — catastrophic language (Wave 2E signal parity, Fix 6)
  /הכל\s+(?:הרוס|נגמר|אבוד)/,
  /החיים\s+(?:שלי\s+)?(?:הרוסים|נגמרו|נהרסו)/,
  /(?:אין|לא)\s+(?:חזרה|דרך\s+חזרה)/,
]);

/** @type {ReadonlyArray<RegExp>} */
const _HIGH_DISTRESS_PATTERNS = Object.freeze([
  /\boverwhelm(ed|ing)\b/i,
  /\bcan'?t\s+(breathe|think|move)\b/i,
  /\bfeel(ing)?\s+(so\s+)?(out\s+of\s+control|uncontrollable)\b/i,
  /\bpanic(king|ked)?\b/i,
  /\bscreaming\s+inside\b/i,
  /\bcan'?t\s+stop\s+crying\b/i,
  // Hebrew — elevated distress, not containment-level on its own (Wave 2E parity, Fix 6)
  /מוצף/,
  /לא\s+מצליח\s+לחשוב/,
  /לא\s+(?:יכול|מסוגל)\s+לנשום/,
  /בפאניקה/,
]);

/** @type {ReadonlyArray<RegExp>} */
const _EMOTIONAL_LANGUAGE_PATTERNS = Object.freeze([
  /\b(feel|feeling|felt)\b/i,
  /\b(sad|angry|anxious|worried|scared|afraid|frustrated|upset)\b/i,
  /\b(emotion|emotional)\b/i,
  /\b(stressed|stress)\b/i,
  // Hebrew — general emotional language, mild tier (Wave 2E parity, Fix 6)
  /(?:מרגיש|מרגישה)/,
  /(?:עצוב|עצובה|לחוץ|לחוצה|מודאג|מודאגת|מפחד|מפחדת|כועס|כועסת|עצבני|עצבנית)/,
  /(?:חרדה|פחד|כעס|עצב|מתח)\b/,
]);

// ─── Wave 2E — Hebrew hopelessness with negation resistance (Fix 6) ────────────
//
// Hebrew hopelessness detection needs negation awareness because "לא" (not)
// immediately before a hopelessness phrase inverts its meaning.
// Example: "אני לא מרגיש חסר תקווה" ("I do not feel hopeless") must NOT trigger
// hopelessness detection, while "אני חסר תקווה" ("I am hopeless") must.
//
// The helper checks bounded Hebrew hopelessness constructs and, for the
// "חסר תקווה" construct specifically, verifies that "לא" does not appear within
// 20 characters before the phrase.  Other constructs (e.g. "אין תקווה") embed
// their own negation and do not need a secondary guard.
//
// Deterministic, bounded, no external calls, non-diagnostic.
//
// @private
// @param {string} text
// @returns {boolean}
function _hebrewHopelessnessPresent(text) {
  try {
    // "אין תקווה" / "אין שום תקווה" — "there is no hope" (negation already embedded)
    if (/אין\s+(?:שום\s+)?תקווה/.test(text)) return true;
    // "שום דבר לא ישתפר" — "nothing will improve"
    if (/שום\s+דבר\s+לא\s+ישתפר/.test(text)) return true;
    // "כלום לא ישתנה/ישתפר" — "nothing will change/improve"
    if (/כלום\s+לא\s+(?:ישתנה|ישתפר)/.test(text)) return true;
    // "חסר תקווה" — "hopeless" — but NOT when preceded by "לא" within 20 chars
    const m = text.match(/חסר\s*תקווה/);
    if (m && typeof m.index === 'number') {
      const windowBefore = text.slice(Math.max(0, m.index - 20), m.index);
      if (!windowBefore.includes('לא')) return true;
    }
    return false;
  } catch (_e) {
    return false;
  }
}

/** Minimum message length to not be considered empty/short. @type {number} */
const _EMPTY_OR_SHORT_THRESHOLD = 10;

// ─── Wave 3D — LTS strategy input constants and extractor ─────────────────────

/**
 * Inline LTS schema constants.
 *
 * These mirror the values from therapistMemoryModel.js so that this module
 * retains its zero-import isolation guarantee.  If the upstream constants
 * change, these must be updated to match.
 *
 * Canonical source: src/lib/therapistMemoryModel.js
 *   LTS_VERSION              → _LTS_VERSION_VALUE
 *   LTS_MEMORY_TYPE          → _LTS_MEMORY_TYPE_VALUE
 *   LTS_MIN_SESSIONS_FOR_SIGNALS → _LTS_MIN_SESSIONS_VALUE
 *   LTS_TRAJECTORIES.*       → _LTS_TRAJ_* constants below
 *
 * @private
 */
const _LTS_VERSION_VALUE = '1';
const _LTS_MEMORY_TYPE_VALUE = 'lts';
const _LTS_MIN_SESSIONS_VALUE = 2;

/** @private LTS trajectory label constants (mirrors LTS_TRAJECTORIES). */
const _LTS_TRAJ_PROGRESSING = 'progressing';
const _LTS_TRAJ_STAGNATING = 'stagnating';
const _LTS_TRAJ_FLUCTUATING = 'fluctuating';

/**
 * Fail-safe LTS strategy inputs returned when the LTS record is absent,
 * invalid, or too weak to use.
 *
 * When lts_valid is false, all LTS-aware rules in determineTherapistStrategy
 * are skipped and the exact Wave 2C behavior is preserved.
 *
 * @type {Readonly<LTSStrategyInputs>}
 */
const _LTS_STRATEGY_INPUTS_ABSENT = Object.freeze({
  lts_valid: false,
  lts_session_count: 0,
  lts_trajectory: '',
  lts_stalled_interventions: Object.freeze([]),
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: false,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
});

/**
 * Returns true when the given LTS record is structurally valid and has enough
 * session data to be used as strategy input.
 *
 * Mirrors the isLTSRecord + isLTSWeak checks from therapistMemoryModel.js /
 * workflowContextInjector.js without requiring any imports.
 *
 * @private
 * @param {unknown} ltsRecord
 * @returns {boolean}
 */
function _isValidLTSForStrategy(ltsRecord) {
  if (!ltsRecord || typeof ltsRecord !== 'object') return false;
  if (ltsRecord.lts_version !== _LTS_VERSION_VALUE) return false;
  if (ltsRecord.memory_type !== _LTS_MEMORY_TYPE_VALUE) return false;
  const trajectory = ltsRecord.trajectory;
  if (typeof trajectory !== 'string' || !trajectory) return false;
  if (trajectory === 'unknown' || trajectory === 'insufficient_data') return false;
  const sessionCount = typeof ltsRecord.session_count === 'number' ? ltsRecord.session_count : 0;
  if (sessionCount < _LTS_MIN_SESSIONS_VALUE) return false;
  return true;
}

/**
 * Extracts safe, bounded LTS strategy inputs from a raw LTS record.
 *
 * PURPOSE (Wave 3D)
 * -----------------
 * Validates and normalises a parsed LTS record into a plain struct that is
 * safe to pass into determineTherapistStrategy() as its optional 5th argument.
 * All values are primitive (booleans, numbers, strings, frozen arrays) — no
 * entity references, no raw user content.
 *
 * FAIL-SAFE CONTRACT
 * ------------------
 * Returns _LTS_STRATEGY_INPUTS_ABSENT (lts_valid: false) for any input that:
 *   - is null / undefined / not an object
 *   - fails the LTS schema check (lts_version / memory_type mismatch)
 *   - has trajectory === 'unknown' or 'insufficient_data'
 *   - has session_count < LTS_MIN_SESSIONS_FOR_SIGNALS
 * Never throws — any error returns _LTS_STRATEGY_INPUTS_ABSENT.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * Validation logic is inlined — this function has no imports and no side
 * effects.  It is a pure data normaliser.
 *
 * @param {unknown} ltsRecord - A parsed LTS snapshot from workflowContextInjector.
 * @returns {Readonly<LTSStrategyInputs>}
 */
export function extractLTSStrategyInputs(ltsRecord) {
  try {
    if (!_isValidLTSForStrategy(ltsRecord)) {
      return _LTS_STRATEGY_INPUTS_ABSENT;
    }

    const trajectory = ltsRecord.trajectory;

    const stalledInterventions = Array.isArray(ltsRecord.stalled_interventions)
      ? ltsRecord.stalled_interventions
          .filter(v => typeof v === 'string' && v.trim().length > 0)
          .slice(0, 8) // LTS_ARRAY_MAX bound
      : [];

    const riskFlagHistory = Array.isArray(ltsRecord.risk_flag_history)
      ? ltsRecord.risk_flag_history.filter(v => typeof v === 'string' && v.trim().length > 0)
      : [];

    return Object.freeze({
      lts_valid: true,
      lts_session_count:
        typeof ltsRecord.session_count === 'number' ? ltsRecord.session_count : 0,
      lts_trajectory: trajectory,
      lts_stalled_interventions: Object.freeze(stalledInterventions),
      lts_has_risk_history: riskFlagHistory.length > 0,
      lts_is_stagnating: trajectory === _LTS_TRAJ_STAGNATING,
      lts_is_progressing: trajectory === _LTS_TRAJ_PROGRESSING,
      lts_is_fluctuating: trajectory === _LTS_TRAJ_FLUCTUATING,
      lts_has_stalled_interventions: stalledInterventions.length > 0,
    });
  } catch (_e) {
    return _LTS_STRATEGY_INPUTS_ABSENT;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extracts deterministic message-level signals from raw message text.
 *
 * This is a pure pattern-matching pass over the message string.  It does not
 * call any external service and does not consider session context.
 *
 * SAFETY: Always returns a complete signal object.  Never throws.
 * Empty or null input returns the is_empty_or_short=true signal set.
 *
 * @param {string|null|undefined} messageText
 * @returns {Readonly<{
 *   has_distress_language: boolean,
 *   has_hopelessness_language: boolean,
 *   has_catastrophic_language: boolean,
 *   has_shutdown_language: boolean,
 *   has_emotional_language: boolean,
 *   is_empty_or_short: boolean,
 * }>}
 */
export function extractMessageSignals(messageText) {
  try {
    const text = typeof messageText === 'string' ? messageText : '';
    const isEmpty = text.trim().length < _EMPTY_OR_SHORT_THRESHOLD;

    const hasHopelessness = _HOPELESSNESS_PATTERNS.some(p => p.test(text)) || _hebrewHopelessnessPresent(text);
    const hasShutdown = _SHUTDOWN_PATTERNS.some(p => p.test(text));
    const hasCatastrophic = _CATASTROPHIC_PATTERNS.some(p => p.test(text));
    const hasHighDistress = _HIGH_DISTRESS_PATTERNS.some(p => p.test(text));
    const hasDistress = hasHopelessness || hasShutdown || hasCatastrophic || hasHighDistress;
    const hasEmotional = _EMOTIONAL_LANGUAGE_PATTERNS.some(p => p.test(text));

    return Object.freeze({
      [MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]: hasDistress,
      [MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]: hasHopelessness,
      [MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]: hasCatastrophic,
      [MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]: hasShutdown,
      [MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]: hasEmotional,
      [MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]: isEmpty,
    });
  } catch (_e) {
    return _EMPTY_SIGNALS;
  }
}

/**
 * Scores the current distress tier from the safety result and message signals.
 *
 * Tier mapping (highest matching tier wins):
 *
 *   TIER_HIGH    — safety_mode is active, OR any of: crisis_signal,
 *                  severe_hopelessness, shutdown/breakdown, catastrophic language,
 *                  flag_override in safetyResult.triggers; OR hopelessness,
 *                  catastrophic, or shutdown signal in messageSignals.
 *
 *   TIER_MODERATE — high-distress language signal in messageSignals; OR
 *                   safetyResult has low_retrieval_confidence or allowlist_rejection
 *                   trigger (without a safety_mode active).
 *
 *   TIER_MILD    — emotional language present in messageSignals (no distress tier).
 *
 *   TIER_LOW     — default / no signals.
 *
 * SAFETY: Never throws.  Returns TIER_LOW on any error.
 *
 * @param {object|null|undefined} safetyResult  - SafetyModeResult from therapistSafetyMode
 * @param {object|null|undefined} messageSignals - Output of extractMessageSignals()
 * @returns {string} One of the DISTRESS_TIERS values
 */
export function scoreDistressTier(safetyResult, messageSignals) {
  try {
    const sr = safetyResult && typeof safetyResult === 'object' ? safetyResult : {};
    const ms = messageSignals && typeof messageSignals === 'object' ? messageSignals : {};

    // Safety mode active is always TIER_HIGH regardless of other signals.
    if (sr.safety_mode === true) return DISTRESS_TIERS.TIER_HIGH;

    // Hard safety triggers in the result object → TIER_HIGH.
    const triggers = Array.isArray(sr.triggers) ? sr.triggers : [];
    const highTriggers = ['crisis_signal', 'severe_hopelessness', 'shutdown_breakdown', 'catastrophic_language', 'flag_override'];
    if (triggers.some(t => highTriggers.includes(t))) return DISTRESS_TIERS.TIER_HIGH;

    // Severe message signals → TIER_HIGH.
    if (ms[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]) return DISTRESS_TIERS.TIER_HIGH;
    if (ms[MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]) return DISTRESS_TIERS.TIER_HIGH;
    if (ms[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]) return DISTRESS_TIERS.TIER_HIGH;

    // Soft safety triggers → TIER_MODERATE.
    const moderateTriggers = ['low_retrieval_confidence', 'allowlist_rejection'];
    if (triggers.some(t => moderateTriggers.includes(t))) return DISTRESS_TIERS.TIER_MODERATE;

    // High-distress language (non-severe) → TIER_MODERATE.
    if (ms[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]) return DISTRESS_TIERS.TIER_MODERATE;

    // Emotional language present → TIER_MILD.
    if (ms[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]) return DISTRESS_TIERS.TIER_MILD;

    return DISTRESS_TIERS.TIER_LOW;
  } catch (_e) {
    return DISTRESS_TIERS.TIER_LOW;
  }
}

// ─── Wave 2C — Private continuity-signal extractor ────────────────────────────

/**
 * Extracts structured clinical signals from a continuityData argument.
 *
 * Handles two input shapes:
 *
 *   Aggregated shape (from readCrossSessionContinuity):
 *     { sessionCount, recurringPatterns, openFollowUpTasks, interventionsUsed,
 *       riskFlags, recentSummary }
 *
 *   Records shape (test fixtures / legacy):
 *     { records: Array<{ risk_flags?, follow_up_tasks?, core_patterns?,
 *                        interventions_used? }> }
 *
 * Generic non-null object (fallback): treated as 1 session with no detail.
 *
 * SAFETY: Never throws.  Returns zero-value signals on any error.
 *
 * INTERNAL USE ONLY: This function is a private helper for
 * determineTherapistStrategy() and scoreContinuityRichness().  Its return
 * shape is an implementation detail and may change without notice.
 *
 * @private
 * @param {any} continuityData
 * @returns {{ sessionCount: number, hasRiskFlags: boolean,
 *             hasOpenFollowUpTasks: boolean, hasRecurringPatterns: boolean,
 *             hasInterventionsUsed: boolean, interventionsUsedList: string[] }}
 */
function _extractContinuitySignals(continuityData) {
  try {
    if (!continuityData || typeof continuityData !== 'object') {
      return _ZERO_CONTINUITY_SIGNALS;
    }

    // Aggregated shape: { sessionCount: number, ... }
    if (typeof continuityData.sessionCount === 'number') {
      return {
        sessionCount: continuityData.sessionCount,
        hasRiskFlags:
          Array.isArray(continuityData.riskFlags) && continuityData.riskFlags.length > 0,
        hasOpenFollowUpTasks:
          Array.isArray(continuityData.openFollowUpTasks) &&
          continuityData.openFollowUpTasks.length > 0,
        hasRecurringPatterns:
          Array.isArray(continuityData.recurringPatterns) &&
          continuityData.recurringPatterns.length > 0,
        hasInterventionsUsed:
          Array.isArray(continuityData.interventionsUsed) &&
          continuityData.interventionsUsed.length > 0,
        interventionsUsedList: Array.isArray(continuityData.interventionsUsed)
          ? continuityData.interventionsUsed
          : [],
      };
    }

    // Records shape: { records: [...] }
    if (Array.isArray(continuityData.records)) {
      const records = continuityData.records;
      const sessionCount = records.length;
      const allRiskFlags = records.flatMap(r =>
        Array.isArray(r?.risk_flags) ? r.risk_flags : [],
      );
      const allFollowUps = records.flatMap(r =>
        Array.isArray(r?.follow_up_tasks) ? r.follow_up_tasks : [],
      );
      const allPatterns = records.flatMap(r =>
        Array.isArray(r?.core_patterns) ? r.core_patterns : [],
      );
      const allInterventions = records.flatMap(r =>
        Array.isArray(r?.interventions_used) ? r.interventions_used : [],
      );
      return {
        sessionCount,
        hasRiskFlags: allRiskFlags.length > 0,
        hasOpenFollowUpTasks: allFollowUps.length > 0,
        hasRecurringPatterns: allPatterns.length > 0,
        hasInterventionsUsed: allInterventions.length > 0,
        interventionsUsedList: [...new Set(allInterventions)],
      };
    }

    // Generic object fallback: treat as 1 session with no structured detail.
    const hasAnyValue = Object.values(continuityData).some(
      v => v !== null && v !== undefined && v !== '',
    );
    return {
      sessionCount: hasAnyValue ? 1 : 0,
      hasRiskFlags: false,
      hasOpenFollowUpTasks: false,
      hasRecurringPatterns: false,
      hasInterventionsUsed: false,
      interventionsUsedList: [],
    };
  } catch (_e) {
    return _ZERO_CONTINUITY_SIGNALS;
  }
}

// ─── Wave 2C — Public scoring functions ───────────────────────────────────────

/**
 * Scores the clinical richness of continuityData on a numeric scale.
 *
 * Higher score = more longitudinal clinical context available.
 *
 * Scoring rules (additive):
 *   +2  sessionCount >= 1   (at least one prior session)
 *   +2  sessionCount >= 2   (multiple sessions = stronger longitudinal picture)
 *   +3  openFollowUpTasks non-empty (pending action items = direct continuity hook)
 *   +2  recurringPatterns non-empty (behavioural patterns identified)
 *   +1  interventionsUsed non-empty (prior work was done)
 *   +2  riskFlags non-empty         (clinically significant; always weights high)
 *
 * Returns 0 for null / invalid input (fail-safe).
 *
 * Compare against CONTINUITY_RICHNESS_THRESHOLDS:
 *   score >= RICH     (7)  — multiple sessions + tasks + patterns
 *   score >= MODERATE (4)  — 2+ sessions or open tasks
 *   score >= MINIMAL  (2)  — at least 1 prior session
 *
 * @param {any} continuityData
 * @returns {number} Richness score ≥ 0.
 */
export function scoreContinuityRichness(continuityData) {
  try {
    const sigs = _extractContinuitySignals(continuityData);
    let score = 0;
    if (sigs.sessionCount >= 1) score += 2;
    if (sigs.sessionCount >= 2) score += 2;
    if (sigs.hasOpenFollowUpTasks) score += 3;
    if (sigs.hasRecurringPatterns) score += 2;
    if (sigs.hasInterventionsUsed) score += 1;
    if (sigs.hasRiskFlags) score += 2;
    return score;
  } catch (_e) {
    return 0;
  }
}

/**
 * Scores the clinical strength of a CaseFormulation record on a numeric scale.
 *
 * Checks five fields: presenting_problem, core_belief, maintaining_cycle,
 * treatment_goals, and working_hypotheses (each worth 1 point when non-empty).
 * Arrays count as present when non-empty.  Strings count when length >= 8 chars.
 *
 * Returns 0 for null / invalid input (fail-safe).
 *
 * Compare against FORMULATION_STRENGTH_THRESHOLDS:
 *   score >= STRONG   (3) — presenting + core belief + ≥1 more field
 *   score >= MODERATE (2) — 2 usable fields
 *   score >= THIN     (1) — 1 usable field
 *
 * @param {any} formulationData
 * @returns {number} Strength score ≥ 0.
 */
export function scoreFormulationStrength(formulationData) {
  try {
    if (!formulationData || typeof formulationData !== 'object') return 0;
    const SCORED_FIELDS = [
      'presenting_problem',
      'core_belief',
      'maintaining_cycle',
      'treatment_goals',
      'working_hypotheses',
    ];
    let score = 0;
    for (const field of SCORED_FIELDS) {
      const v = formulationData[field];
      if (Array.isArray(v) && v.length > 0) {
        score += 1;
      } else if (typeof v === 'string' && v.trim().length >= 8) {
        score += 1;
      }
    }
    return score;
  } catch (_e) {
    return 0;
  }
}

/**
 * Determines the full therapeutic strategy from session context inputs.
 *
 * This is the central decision function.  It integrates continuity data,
 * formulation data, distress tier, and message signals into a single
 * TherapistStrategyState.
 *
 * SAFETY CONTRACT (non-negotiable):
 *   - If distressTier is TIER_HIGH, intervention_mode MUST be CONTAINMENT.
 *     LTS inputs NEVER override this rule.
 *   - If inputs are null / missing, default to STABILISATION (safe middle mode).
 *   - If continuity AND formulation are both absent, default to PSYCHOEDUCATION
 *     for low/mild distress tiers.
 *   - FORMULATION_DEEPENING requires: formulation present + at least one prior
 *     session record + distress tier is TIER_LOW or TIER_MILD.
 *
 * WAVE 3D — LTS-AWARE STRATEGY INTEGRATION
 * -----------------------------------------
 * An optional 5th parameter ltsInputs (from extractLTSStrategyInputs) provides
 * safe, bounded LTS-derived signals.  All LTS rules are FAIL-OPEN:
 *   - When ltsInputs is absent, invalid, or lts_valid === false, the exact
 *     Wave 2C behavior is preserved in every branch.
 *   - LTS signals are soft guidance, not hard overrides, except where they
 *     reinforce existing safety/containment logic (D1, D2).
 *   - CONTAINMENT and TIER_MODERATE STABILISATION are never overridden by LTS.
 *
 * @param {object|null|undefined} continuityData
 *   Cross-session continuity output from crossSessionContinuity.js (may be null
 *   for first sessions or when continuity is disabled).
 *   Expected shape: { records: Array, ... }  Any shape is tolerated (fail-safe).
 * @param {object|null|undefined} formulationData
 *   CaseFormulation entity record (may be null if none exists).
 *   Expected shape: { working_hypotheses: string|Array, ... }
 * @param {string} distressTier
 *   One of the DISTRESS_TIERS values, typically from scoreDistressTier().
 * @param {object|null|undefined} messageSignals
 *   Output of extractMessageSignals().
 * @param {object|null|undefined} [ltsInputs]
 *   Optional Wave 3D LTS strategy inputs from extractLTSStrategyInputs().
 *   When absent or invalid (lts_valid !== true), exact Wave 2C behavior is
 *   preserved.  Never throws — any error falls back to Wave 2C behavior.
 * @returns {Readonly<TherapistStrategyState>}
 */
export function determineTherapistStrategy(
  continuityData,
  formulationData,
  distressTier,
  messageSignals,
  ltsInputs,
) {
  try {
    const tier = (typeof distressTier === 'string' && _DISTRESS_TIER_VALUES.has(distressTier))
      ? distressTier
      : DISTRESS_TIERS.TIER_LOW;

    // ── Safety-first: TIER_HIGH → always CONTAINMENT ─────────────────────────
    // LTS NEVER overrides CONTAINMENT.  Exact same as Wave 2C.
    if (tier === DISTRESS_TIERS.TIER_HIGH) {
      const contSigs = _extractContinuitySignals(continuityData);
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.CONTAINMENT, {
        distress_tier: tier,
        continuity_present: _hasContinuity(continuityData),
        formulation_present: _hasFormulation(formulationData),
        message_signals: _normaliseSignals(messageSignals),
        rationale: 'tier_high_containment_mandatory',
        session_count: contSigs.sessionCount,
        has_risk_flags: contSigs.hasRiskFlags,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: scoreContinuityRichness(continuityData),
        formulation_strength_score: scoreFormulationStrength(formulationData),
      });
    }

    const hasContinuity = _hasContinuity(continuityData);
    const hasFormulation = _hasFormulation(formulationData);
    const ms = _normaliseSignals(messageSignals);
    const contSigs = _extractContinuitySignals(continuityData);
    const continuityRichnessScore = scoreContinuityRichness(continuityData);
    const formulationStrengthScore = scoreFormulationStrength(formulationData);
    const isLowOrMild = tier === DISTRESS_TIERS.TIER_LOW || tier === DISTRESS_TIERS.TIER_MILD;

    // ── TIER_MODERATE → STABILISATION ────────────────────────────────────────
    // LTS NEVER overrides STABILISATION forced by TIER_MODERATE.  Exact same
    // as Wave 2C.
    if (tier === DISTRESS_TIERS.TIER_MODERATE) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STABILISATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'tier_moderate_stabilisation',
        session_count: contSigs.sessionCount,
        has_risk_flags: contSigs.hasRiskFlags,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
      });
    }

    // ── Low / mild distress — context-driven selection ────────────────────────

    // No continuity, no formulation → PSYCHOEDUCATION (first-session safe default).
    // LTS does not change this rule — without in-scope clinical data, structured
    // exploration cannot be safely anchored.
    if (!hasContinuity && !hasFormulation) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION, {
        distress_tier: tier,
        continuity_present: false,
        formulation_present: false,
        message_signals: ms,
        rationale: 'no_context_psychoeducation',
        session_count: 0,
        has_risk_flags: false,
        has_open_tasks: false,
        intervention_saturated: false,
        continuity_richness_score: 0,
        formulation_strength_score: formulationStrengthScore,
      });
    }

    // ── Wave 3D — Normalise LTS inputs ────────────────────────────────────────
    // All LTS rules below are gated on ltsActive.  When ltsActive is false
    // (LTS absent, invalid, or weak) the exact Wave 2C logic is preserved in
    // every branch.  No LTS rule can change CONTAINMENT or TIER_MODERATE paths
    // (handled above before LTS is evaluated).
    const lts = (ltsInputs && ltsInputs.lts_valid === true)
      ? ltsInputs
      : _LTS_STRATEGY_INPUTS_ABSENT;
    const ltsActive = lts.lts_valid;

    // Effective session count — use the LTS total when it covers more sessions
    // than the short cross-session window.  Purely for output reporting; does
    // not alter mode selection logic.
    const effectiveSessionCount = (ltsActive && lts.lts_session_count > contSigs.sessionCount)
      ? lts.lts_session_count
      : contSigs.sessionCount;

    // LTS trajectory label for strategy state observability ('' when absent).
    const activeLTSTrajectory = ltsActive ? lts.lts_trajectory : '';

    // ── Wave 2C rule 1: Risk flags in continuity → STABILISATION ─────────────
    // Active risk flags in prior session records signal that this client has
    // known safety-relevant history.  Even at low/mild distress, lean toward
    // stabilisation rather than exploratory or deepening modes.
    if (contSigs.hasRiskFlags && isLowOrMild) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STABILISATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'risk_flags_present_stabilisation',
        session_count: effectiveSessionCount,
        has_risk_flags: true,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // ── Wave 3D rule D1: LTS fluctuating arc → STABILISATION ─────────────────
    // A fluctuating trajectory (mixed improvement / elevated-risk signals
    // across sessions) warrants stabilisation rather than exploration.
    // Applied only at low/mild distress; high/moderate are already handled.
    // FAIL-OPEN: skipped when ltsActive is false (exact Wave 2C behavior).
    if (ltsActive && lts.lts_is_fluctuating && isLowOrMild) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STABILISATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'lts_fluctuating_arc_stabilisation',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // ── Wave 3D rule D2: LTS risk history without current flags → STABILISATION
    // Risk flags in the longitudinal history (even if absent from the recent
    // short window) are a soft caution signal when the arc is not clearly
    // progressing.  The progressing exemption prevents penalising clients who
    // have genuinely recovered.
    // SOFT CAUTION — not a diagnosis; never escalates the distress tier.
    // FAIL-OPEN: skipped when ltsActive is false.
    if (
      ltsActive &&
      lts.lts_has_risk_history &&
      !contSigs.hasRiskFlags &&
      !lts.lts_is_progressing &&
      isLowOrMild
    ) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STABILISATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'lts_risk_history_stabilisation',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // ── Wave 2C rule 2: Intervention saturation → STRUCTURED_EXPLORATION ─────
    // When 3+ sessions have all used only a single unique intervention type,
    // the same cognitive approach is being repeated without broadening.
    // Prefer STRUCTURED_EXPLORATION to introduce variety rather than deepening
    // into an already-saturated formulation thread.
    const isInterventionSaturated = _detectInterventionSaturation(contSigs);
    if (isInterventionSaturated && hasContinuity && hasFormulation && isLowOrMild) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'intervention_saturated_structured_exploration',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: true,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // ── Wave 3D: Stagnation deepening guard ───────────────────────────────────
    // When the longitudinal arc is stagnating OR stalled interventions have been
    // identified, avoid deepening further into an already-stuck formulation
    // thread.  The FORMULATION_DEEPENING rules below use STRUCTURED_EXPLORATION
    // instead when this guard is true.
    // FAIL-OPEN: ltsBlocksDeepening is false when ltsActive is false, so the
    // exact Wave 2C FORMULATION_DEEPENING behavior is preserved.
    const ltsBlocksDeepening =
      ltsActive && (lts.lts_is_stagnating || lts.lts_has_stalled_interventions);

    // ── Wave 2C rule 3: Returning user + open tasks + formulation ────────────
    // A returning client with open follow-up action items and an active
    // formulation is best served by formulation-led deepening — unless the LTS
    // stagnation guard fires (Wave 3D D3/D4), in which case STRUCTURED_EXPLORATION
    // provides variety without deepening into a stalled arc.
    if (hasContinuity && hasFormulation && contSigs.hasOpenFollowUpTasks && isLowOrMild) {
      const mode = ltsBlocksDeepening
        ? STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION
        : STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING;
      return _buildStrategyState(mode, {
        distress_tier: tier,
        continuity_present: true,
        formulation_present: true,
        message_signals: ms,
        rationale: ltsBlocksDeepening
          ? 'lts_stagnation_blocks_deepening'
          : 'returning_user_open_tasks_formulation_deepening',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: true,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // Formulation present + prior continuity + low/mild → FORMULATION_DEEPENING.
    // Wave 3D: downgraded to STRUCTURED_EXPLORATION when ltsBlocksDeepening.
    if (hasFormulation && hasContinuity && isLowOrMild) {
      const mode = ltsBlocksDeepening
        ? STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION
        : STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING;
      return _buildStrategyState(mode, {
        distress_tier: tier,
        continuity_present: true,
        formulation_present: true,
        message_signals: ms,
        rationale: ltsBlocksDeepening
          ? 'lts_stagnation_blocks_deepening'
          : 'formulation_and_continuity_deepening',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // ── Wave 2C rule 4: Returning user + open tasks (no formulation) ──────────
    // A returning client with open follow-up tasks is in an active work arc.
    // Even without a formal formulation, prioritise continuity-explicit
    // structured exploration over the generic partial-context path.
    if (hasContinuity && contSigs.hasOpenFollowUpTasks && isLowOrMild) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'open_tasks_continuity_structured',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: true,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // Formulation only (no continuity) or continuity only (no formulation) → STRUCTURED_EXPLORATION.
    if (hasFormulation || hasContinuity) {
      return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION, {
        distress_tier: tier,
        continuity_present: hasContinuity,
        formulation_present: hasFormulation,
        message_signals: ms,
        rationale: 'partial_context_structured_exploration',
        session_count: effectiveSessionCount,
        has_risk_flags: false,
        has_open_tasks: contSigs.hasOpenFollowUpTasks,
        intervention_saturated: false,
        continuity_richness_score: continuityRichnessScore,
        formulation_strength_score: formulationStrengthScore,
        lts_trajectory: activeLTSTrajectory,
      });
    }

    // Fallback — safe middle mode (should be unreachable given the guards above,
    // but belt-and-suspenders for any future code path additions).
    return _buildStrategyState(STRATEGY_INTERVENTION_MODES.STABILISATION, {
      distress_tier: tier,
      continuity_present: hasContinuity,
      formulation_present: hasFormulation,
      message_signals: ms,
      rationale: 'fallback_stabilisation',
      session_count: effectiveSessionCount,
      has_risk_flags: contSigs.hasRiskFlags,
      has_open_tasks: contSigs.hasOpenFollowUpTasks,
      intervention_saturated: false,
      continuity_richness_score: continuityRichnessScore,
      formulation_strength_score: formulationStrengthScore,
      lts_trajectory: activeLTSTrajectory,
    });
  } catch (_e) {
    return STRATEGY_FAIL_SAFE_STATE;
  }
}

/**
 * Builds a human-readable strategy context section string from a
 * TherapistStrategyState.  This is the text that would be injected into
 * a session-start payload when this module is wired in a future PR.
 *
 * The output is a structured plain-text block with a header, the active
 * intervention mode, distress tier, and context flags.  It does NOT
 * include raw user data.
 *
 * SAFETY: Never throws.  Returns a minimal safe fallback string on any error.
 *
 * @param {object|null|undefined} strategyState  TherapistStrategyState
 * @returns {string}
 */
export function buildStrategyContextSection(strategyState) {
  try {
    const ss = strategyState && typeof strategyState === 'object' ? strategyState : {};
    const mode = typeof ss.intervention_mode === 'string' ? ss.intervention_mode : 'unknown';
    const tier = typeof ss.distress_tier === 'string' ? ss.distress_tier : 'unknown';
    const version = typeof ss.strategy_version === 'string' ? ss.strategy_version : STRATEGY_VERSION;
    const contPresent = ss.continuity_present === true;
    const formPresent = ss.formulation_present === true;
    const sessionCount = typeof ss.session_count === 'number' ? ss.session_count : 0;
    const hasRiskFlags = ss.has_risk_flags === true;
    const hasOpenTasks = ss.has_open_tasks === true;
    const isSaturated = ss.intervention_saturated === true;
    const ltsTrajectory = typeof ss.lts_trajectory === 'string' ? ss.lts_trajectory : '';
    const actionPermitted = ss.action_permitted === true;

    const lines = [
      `=== THERAPEUTIC STRATEGY — WAVE 2C v${version} ===`,
      '',
      // Wave 2E (Fix 4) — usage framing: this block is an internal, provisional
      // response posture, never a diagnosis, and is never surfaced to the user.
      'INTERNAL USE ONLY — do NOT reveal or describe this analysis to the user.',
      'This is a provisional response posture for this turn only, not a diagnosis or fact.',
      'Current user information always overrides prior formulation, continuity, and historical tasks.',
      'Never expose internal labels; never say "The system selected...", "Your distress tier is...", or name a mode.',
      '',
      `Intervention mode: ${mode}`,
      `Distress tier: ${tier}`,
      `Prior continuity: ${contPresent ? 'yes' : 'no'}`,
      `Formulation active: ${formPresent ? 'yes' : 'no'}`,
      `Action permitted: ${actionPermitted ? 'yes' : 'no — holding/reflection/exploration/formulation only, no concrete technique'}`,
    ];

    // Context signals block — only emitted when there is meaningful session context.
    if (sessionCount > 0 || hasRiskFlags || hasOpenTasks || isSaturated) {
      lines.push('');
      lines.push('Context signals:');
      if (sessionCount > 0) lines.push(`  Sessions         : ${sessionCount}`);
      if (hasRiskFlags) lines.push('  Risk flags       : historical context only — not currently active');
      if (hasOpenTasks) lines.push('  Open tasks       : pending');
      if (isSaturated) lines.push('  Intervention sat.: flagged');
    }

    // Wave 2E (Fix 1) — historical safety semantics. Historical risk is past
    // context only: not proof of present danger, not a current diagnosis, and
    // not independently sufficient for containment/stabilisation. Emit a bounded
    // generic reminder; never treat it as currently active.
    if (hasRiskFlags) {
      lines.push('');
      lines.push('Historical safety context is present. Do not infer current risk; verify the current state when clinically relevant.');
    }

    // Wave 3D: LTS trajectory line (emitted only when a meaningful signal is present).
    if (ltsTrajectory && ltsTrajectory !== 'unknown' && ltsTrajectory !== 'insufficient_data') {
      lines.push('');
      lines.push(`LTS arc           : ${ltsTrajectory}`);
    }

    lines.push('');
    lines.push('Guidance:');
    lines.push(_getModeGuidance(mode));
    lines.push('');
    // Wave 2E (Fix 4) — strategy usage contract. Bounded, non-diagnostic; never
    // names an internal mode label so cross-mode word constraints are preserved.
    lines.push('USAGE CONTRACT:');
    lines.push('- This posture is provisional guidance, not a diagnosis or fact about the user.');
    lines.push('- Current user information always overrides prior formulation, continuity, and historical tasks.');
    lines.push('- Posture alone never authorises homework, forms, exposure, or techniques; that needs confirmed readiness.');
    lines.push('- Reference at most one historical theme, and only when directly relevant to what is shared now.');
    lines.push('- A theme the user has set aside must not be revived unless the user returns to it.');
    lines.push('- Ask at most one focused question when needed; warm answers of 2-4 natural paragraphs are welcome.');
    lines.push('');
    lines.push('=== END THERAPEUTIC STRATEGY ===');

    return lines.join('\n');
  } catch (_e) {
    return `=== THERAPEUTIC STRATEGY — WAVE 2C v${STRATEGY_VERSION} ===\nIntervention mode : ${STRATEGY_INTERVENTION_MODES.STABILISATION}\n=== END THERAPEUTIC STRATEGY ===`;
  }
}

// ─── Wave 2D — Safe strategy diagnostic snapshot ──────────────────────────────

/**
 * The set of TherapistStrategyState field names that are safe to include in
 * diagnostic and observability output.
 *
 * OMITTED: message_signals — contains boolean pattern-match flags derived from
 * raw user message text.  Including them in a diagnostic snapshot could leak
 * inferences about message content.  All other fields are clinical labels,
 * numeric scores, or boolean context flags that carry no raw user text.
 *
 * @type {ReadonlyArray<string>}
 */
export const STRATEGY_DIAGNOSTIC_SAFE_FIELDS = Object.freeze([
  'strategy_version',
  'intervention_mode',
  'distress_tier',
  'continuity_present',
  'formulation_present',
  'rationale',
  'fail_safe',
  'session_count',
  'has_risk_flags',
  'has_open_tasks',
  'intervention_saturated',
  'continuity_richness_score',
  'formulation_strength_score',
  'lts_trajectory', // Wave 3D
  // Wave 2E (Fix 3 / Fix 7) — bounded, non-diagnostic metadata.
  'action_permitted',
  'historical_safety_context_present',
  'precedence_enforced',
  'active_precedence_level',
  'failure_reason_code',
]);

// ─── Wave 3E — LTS diagnostic snapshot ───────────────────────────────────────

/**
 * Safe LTS signal field names that are safe to include in diagnostic payloads.
 *
 * Every field here is a boolean, number, or bounded string label.
 * No raw user text, no private entity content, no PII.
 *
 * DELIBERATELY EXCLUDED
 * ---------------------
 * - lts_stalled_interventions: an array of label strings.  Excluded as a
 *   precaution — the aggregate boolean (lts_has_stalled_interventions) is
 *   sufficient for observability and carries no label content risk.
 *
 * @type {ReadonlyArray<string>}
 */
export const LTS_DIAGNOSTIC_SAFE_FIELDS = Object.freeze([
  'lts_valid',
  'lts_session_count',
  'lts_trajectory',
  'lts_has_risk_history',
  'lts_is_stagnating',
  'lts_is_progressing',
  'lts_is_fluctuating',
  'lts_has_stalled_interventions',
]);

/**
 * Builds a safe, sanitized diagnostic snapshot from LTS strategy inputs.
 *
 * PURPOSE (Wave 3E)
 * -----------------
 * Makes the active LTS signals observable without exposing raw user content or
 * private clinical text.  The snapshot is suitable for inclusion in diagnostic
 * payloads, console logs (when _s2debug=true), and test assertions.
 *
 * SAFETY CONTRACT
 * ---------------
 * - lts_stalled_interventions is deliberately excluded (see LTS_DIAGNOSTIC_SAFE_FIELDS).
 * - No raw message content, no entity IDs, no user PII.
 * - Never throws — returns a fail-safe snapshot on any error or absent input.
 * - Output is a frozen plain object (no mutations after creation).
 *
 * DIAGNOSTIC-ONLY
 * ---------------
 * This function is intended for staging/debug surfaces only (gated by
 * ?_s2debug=true in the URL).  It MUST NOT be used to alter routing or
 * therapeutic behavior in any way.
 *
 * @param {object|null|undefined} ltsInputs - LTSStrategyInputs from extractLTSStrategyInputs()
 * @returns {Readonly<{
 *   lts_valid: boolean,
 *   lts_session_count: number,
 *   lts_trajectory: string,
 *   lts_has_risk_history: boolean,
 *   lts_is_stagnating: boolean,
 *   lts_is_progressing: boolean,
 *   lts_is_fluctuating: boolean,
 *   lts_has_stalled_interventions: boolean,
 * }>}
 */
export function buildLTSDiagnosticSnapshot(ltsInputs) {
  try {
    const li = ltsInputs && typeof ltsInputs === 'object' ? ltsInputs : {};
    return Object.freeze({
      lts_valid: li.lts_valid === true,
      lts_session_count: typeof li.lts_session_count === 'number' ? li.lts_session_count : 0,
      lts_trajectory: typeof li.lts_trajectory === 'string' ? li.lts_trajectory : '',
      lts_has_risk_history: li.lts_has_risk_history === true,
      lts_is_stagnating: li.lts_is_stagnating === true,
      lts_is_progressing: li.lts_is_progressing === true,
      lts_is_fluctuating: li.lts_is_fluctuating === true,
      lts_has_stalled_interventions: li.lts_has_stalled_interventions === true,
      // lts_stalled_interventions deliberately omitted — see LTS_DIAGNOSTIC_SAFE_FIELDS.
    });
  } catch (_e) {
    return Object.freeze({
      lts_valid: false,
      lts_session_count: 0,
      lts_trajectory: '',
      lts_has_risk_history: false,
      lts_is_stagnating: false,
      lts_is_progressing: false,
      lts_is_fluctuating: false,
      lts_has_stalled_interventions: false,
    });
  }
}

/**
 * Builds a safe, sanitized diagnostic snapshot from a TherapistStrategyState.
 *
 * PURPOSE (Wave 2D)
 * -----------------
 * Makes the active strategy decision observable without exposing raw user
 * content or private clinical text.  The snapshot is suitable for inclusion
 * in diagnostic payloads, console logs (when _s2debug=true), and test
 * assertions.
 *
 * SAFETY CONTRACT
 * ---------------
 * - message_signals is deliberately excluded (inferred from raw user text).
 * - No raw message content, no entity IDs, no user PII.
 * - Never throws — returns a fail-safe snapshot on any error.
 * - Output is a frozen plain object (no mutations after creation).
 *
 * DIAGNOSTIC-ONLY
 * ---------------
 * This function is intended for staging/debug surfaces only (gated by
 * ?_s2debug=true in the URL).  It MUST NOT be used to alter routing or
 * therapeutic behavior in any way.
 *
 * @param {object|null|undefined} strategyState - A TherapistStrategyState
 * @returns {Readonly<{
 *   strategy_version: string,
 *   intervention_mode: string,
 *   distress_tier: string,
 *   continuity_present: boolean,
 *   formulation_present: boolean,
 *   rationale: string,
 *   fail_safe: boolean,
 *   session_count: number,
 *   has_risk_flags: boolean,
 *   has_open_tasks: boolean,
 *   intervention_saturated: boolean,
 *   continuity_richness_score: number,
 *   formulation_strength_score: number,
 * }>}
 */
export function buildStrategyDiagnosticSnapshot(strategyState) {
  try {
    const ss = strategyState && typeof strategyState === 'object' ? strategyState : {};
    return Object.freeze({
      strategy_version:
        typeof ss.strategy_version === 'string' ? ss.strategy_version : STRATEGY_VERSION,
      intervention_mode:
        typeof ss.intervention_mode === 'string'
          ? ss.intervention_mode
          : STRATEGY_INTERVENTION_MODES.STABILISATION,
      distress_tier:
        typeof ss.distress_tier === 'string' ? ss.distress_tier : DISTRESS_TIERS.TIER_LOW,
      continuity_present: ss.continuity_present === true,
      formulation_present: ss.formulation_present === true,
      rationale: typeof ss.rationale === 'string' ? ss.rationale : 'unknown',
      fail_safe: ss.fail_safe === true,
      session_count: typeof ss.session_count === 'number' ? ss.session_count : 0,
      has_risk_flags: ss.has_risk_flags === true,
      has_open_tasks: ss.has_open_tasks === true,
      intervention_saturated: ss.intervention_saturated === true,
      continuity_richness_score:
        typeof ss.continuity_richness_score === 'number' ? ss.continuity_richness_score : 0,
      formulation_strength_score:
        typeof ss.formulation_strength_score === 'number' ? ss.formulation_strength_score : 0,
      lts_trajectory: typeof ss.lts_trajectory === 'string' ? ss.lts_trajectory : '', // Wave 3D
      // Wave 2E (Fix 3 / Fix 7) — bounded, non-diagnostic metadata. No raw text.
      action_permitted: ss.action_permitted === true,
      historical_safety_context_present: ss.has_risk_flags === true,
      precedence_enforced: ss.precedence_enforced === true,
      active_precedence_level:
        typeof ss.active_precedence_level === 'number' ? ss.active_precedence_level : null,
      failure_reason_code: ss.fail_safe === true ? 'fail_safe' : '',
      // message_signals deliberately omitted — inferred from raw user text.
    });
  } catch (_e) {
    return Object.freeze({
      strategy_version: STRATEGY_VERSION,
      intervention_mode: STRATEGY_INTERVENTION_MODES.STABILISATION,
      distress_tier: DISTRESS_TIERS.TIER_LOW,
      continuity_present: false,
      formulation_present: false,
      rationale: 'diagnostic_error',
      fail_safe: true,
      session_count: 0,
      has_risk_flags: false,
      has_open_tasks: false,
      intervention_saturated: false,
      continuity_richness_score: 0,
      formulation_strength_score: 0,
      lts_trajectory: '', // Wave 3D
      // Wave 2E (Fix 3 / Fix 7) — bounded, non-diagnostic metadata.
      action_permitted: false,
      historical_safety_context_present: false,
      precedence_enforced: false,
      active_precedence_level: null,
      failure_reason_code: 'diagnostic_error',
    });
  }
}

// ─── Fail-safe state ──────────────────────────────────────────────────────────

/**
 * Canonical fail-safe TherapistStrategyState.
 *
 * Returned whenever determineTherapistStrategy() catches an unexpected error.
 * Uses STABILISATION as the safe-default mode (conservative, non-containment,
 * non-exploratory).
 *
 * @type {Readonly<TherapistStrategyState>}
 */

export const RESPONSE_POLICY_VERSION = 'response_policy_v1';

export const RESPONSE_POLICY_REASON_CODES = Object.freeze({
  POLICY_UNAVAILABLE: 'policy_unavailable',
  ACTION_NOT_PERMITTED: 'action_not_permitted',
  ACTION_PERMITTED: 'action_permitted',
  SAFETY_OVERRIDE_REQUIRED: 'safety_override_required',
  PRECEDENCE_BLOCKED: 'precedence_blocked',
  FAIL_SAFE: 'fail_safe',
});

export function extractResponsePolicyFromStrategyState(strategyState) {
  const ss = strategyState && typeof strategyState === 'object' ? strategyState : null;
  if (!ss) {
    return Object.freeze({
      policy_version: RESPONSE_POLICY_VERSION,
      policy_available: false,
      action_permitted: false,
      intervention_mode: STRATEGY_INTERVENTION_MODES.STABILISATION,
      safety_override_required: false,
      reason_codes: Object.freeze([RESPONSE_POLICY_REASON_CODES.POLICY_UNAVAILABLE]),
    });
  }

  const reasonCodes = [];
  if (ss.fail_safe === true) reasonCodes.push(RESPONSE_POLICY_REASON_CODES.FAIL_SAFE);
  if (ss.precedence_enforced === true) reasonCodes.push(RESPONSE_POLICY_REASON_CODES.PRECEDENCE_BLOCKED);
  if (ss.action_permitted === true) {
    reasonCodes.push(RESPONSE_POLICY_REASON_CODES.ACTION_PERMITTED);
  } else {
    reasonCodes.push(RESPONSE_POLICY_REASON_CODES.ACTION_NOT_PERMITTED);
  }
  if (ss.safety_override_required === true) {
    reasonCodes.push(RESPONSE_POLICY_REASON_CODES.SAFETY_OVERRIDE_REQUIRED);
  }

  Object.defineProperty(ss, 'response_policy', {
    value: Object.freeze({
      policy_version: RESPONSE_POLICY_VERSION,
      policy_available: true,
      action_permitted: ss.action_permitted === true,
      intervention_mode:
        typeof ss.intervention_mode === 'string' ? ss.intervention_mode : STRATEGY_INTERVENTION_MODES.STABILISATION,
      safety_override_required: ss.safety_override_required === true,
      reason_codes: Object.freeze(reasonCodes.slice(0, 6)),
    }),
    enumerable: false,
    configurable: true,
    writable: false,
  });

  return Object.freeze({
    policy_version: RESPONSE_POLICY_VERSION,
    policy_available: true,
    action_permitted: ss.action_permitted === true,
    intervention_mode:
      typeof ss.intervention_mode === 'string' ? ss.intervention_mode : STRATEGY_INTERVENTION_MODES.STABILISATION,
    safety_override_required: ss.safety_override_required === true,
    reason_codes: Object.freeze(reasonCodes.slice(0, 6)),
  });
}

export const STRATEGY_FAIL_SAFE_STATE = Object.freeze({
  strategy_version: STRATEGY_VERSION,
  intervention_mode: STRATEGY_INTERVENTION_MODES.STABILISATION,
  distress_tier: DISTRESS_TIERS.TIER_LOW,
  continuity_present: false,
  formulation_present: false,
  message_signals: Object.freeze({
    [MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]: false,
    [MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]: false,
    [MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]: false,
    [MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]: false,
    [MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]: false,
    [MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]: true,
  }),
  rationale: 'fail_safe',
  fail_safe: true,
  // Wave 2C enrichment fields
  session_count: 0,
  has_risk_flags: false,
  has_open_tasks: false,
  intervention_saturated: false,
  continuity_richness_score: 0,
  formulation_strength_score: 0,
  // Wave 3D enrichment field
  lts_trajectory: '',
  // Wave 2E — action permission (Fix 3): fail-safe never authorises action.
  action_permitted: false,
});

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Set of valid distress tier string values for fast lookup. */
const _DISTRESS_TIER_VALUES = new Set(Object.values(DISTRESS_TIERS));

/** Empty signal set returned on error. */
const _EMPTY_SIGNALS = Object.freeze({
  [MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]: false,
  [MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]: false,
  [MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]: false,
  [MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]: false,
  [MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]: false,
  [MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]: true,
});

/** Zero-value continuity signal set returned on error or absent data. */
const _ZERO_CONTINUITY_SIGNALS = Object.freeze({
  sessionCount: 0,
  hasRiskFlags: false,
  hasOpenFollowUpTasks: false,
  hasRecurringPatterns: false,
  hasInterventionsUsed: false,
  interventionsUsedList: Object.freeze([]),
});

/**
 * Returns true when continuityData contains at least one usable record.
 * Tolerates any shape — fail-closed to false on any unexpected structure.
 *
 * @param {any} continuityData
 * @returns {boolean}
 */
function _hasContinuity(continuityData) {
  try {
    if (!continuityData || typeof continuityData !== 'object') return false;
    // Accept { records: [...] } shape.
    if (Array.isArray(continuityData.records)) {
      return continuityData.records.length > 0;
    }
    // Accept a direct array (defensive).
    if (Array.isArray(continuityData)) {
      return continuityData.length > 0;
    }
    // Any non-null object with at least one key besides null values is treated
    // as having continuity context.
    return Object.keys(continuityData).length > 0 &&
      Object.values(continuityData).some(v => v !== null && v !== undefined && v !== '');
  } catch (_e) {
    return false;
  }
}

/**
 * Returns true when formulationData appears to be a meaningful CaseFormulation.
 * Tolerates any shape — fail-closed to false on any unexpected structure.
 *
 * @param {any} formulationData
 * @returns {boolean}
 */
function _hasFormulation(formulationData) {
  try {
    if (!formulationData || typeof formulationData !== 'object') return false;
    // Must have at least one non-empty field.
    return Object.values(formulationData).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return typeof v === 'string' && v.trim().length > 0;
    });
  } catch (_e) {
    return false;
  }
}

/**
 * Normalises a message signals object, filling missing keys with false.
 *
 * @param {any} signals
 * @returns {Readonly<Record<string, boolean>>}
 */
function _normaliseSignals(signals) {
  if (!signals || typeof signals !== 'object') return _EMPTY_SIGNALS;
  return Object.freeze({
    [MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]: signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE] === true,
    [MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]: signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE] === true,
    [MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]: signals[MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE] === true,
    [MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]: signals[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE] === true,
    [MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]: signals[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE] === true,
    [MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]: signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT] === true,
  });
}

/**
 * Constructs a frozen TherapistStrategyState from an intervention mode and
 * supporting metadata.
 *
 * @param {string} mode
 * @param {{ distress_tier: string, continuity_present: boolean,
 *            formulation_present: boolean, message_signals: object,
 *            rationale: string, session_count: number,
 *            has_risk_flags: boolean, has_open_tasks: boolean,
 *            intervention_saturated: boolean,
 *            continuity_richness_score: number,
 *            formulation_strength_score: number,
 *            lts_trajectory?: string }} meta
 * @returns {Readonly<TherapistStrategyState>}
 */
function _buildStrategyState(mode, meta) {
  return Object.freeze({
    strategy_version: STRATEGY_VERSION,
    intervention_mode: mode,
    distress_tier: meta.distress_tier,
    continuity_present: meta.continuity_present,
    formulation_present: meta.formulation_present,
    message_signals: meta.message_signals,
    rationale: meta.rationale,
    fail_safe: false,
    // Wave 2C enrichment fields
    session_count: typeof meta.session_count === 'number' ? meta.session_count : 0,
    has_risk_flags: meta.has_risk_flags === true,
    has_open_tasks: meta.has_open_tasks === true,
    intervention_saturated: meta.intervention_saturated === true,
    continuity_richness_score:
      typeof meta.continuity_richness_score === 'number' ? meta.continuity_richness_score : 0,
    formulation_strength_score:
      typeof meta.formulation_strength_score === 'number' ? meta.formulation_strength_score : 0,
    // Wave 3D enrichment field — '' when LTS is absent or not active
    lts_trajectory: typeof meta.lts_trajectory === 'string' ? meta.lts_trajectory : '',
    // Wave 2E — action permission (Fix 3). Response posture (intervention_mode)
    // is separate from action permission. The engine never authorises concrete
    // action on its own; action_permitted defaults to false and is only raised
    // by the injector's precedence guard when clinical readiness is confirmed.
    action_permitted: meta.action_permitted === true,
  });
}

/**
 * Detects whether a client's intervention history shows saturation.
 *
 * Saturation is defined conservatively as: sessionCount >= 3 (at least three
 * prior sessions) AND only 1 unique intervention type has been used across all
 * of them.  This indicates the same single approach has been applied repeatedly
 * without broadening the therapeutic repertoire.
 *
 * Requires at least 3 sessions to avoid false positives in early therapy arcs
 * where limited interventions are normal.
 *
 * SAFETY: Never throws.  Returns false on any error.
 *
 * @private
 * @param {{ sessionCount: number, hasInterventionsUsed: boolean,
 *           interventionsUsedList: string[] }} continuitySignals
 * @returns {boolean}
 */
function _detectInterventionSaturation(continuitySignals) {
  try {
    if (!continuitySignals) return false;
    return (
      continuitySignals.sessionCount >= 3 &&
      continuitySignals.hasInterventionsUsed &&
      continuitySignals.interventionsUsedList.length === 1
    );
  } catch (_e) {
    return false;
  }
}

/**
 * Returns a brief mode-specific guidance string for context section output.
 *
 * @param {string} mode
 * @returns {string}
 */
function _getModeGuidance(mode) {
  switch (mode) {
    case STRATEGY_INTERVENTION_MODES.CONTAINMENT:
      return 'Guidance: Short, grounding responses. One question at a time. No exploratory breadth while high distress is unresolved. Only for current safety or high distress — do not infer current risk from historical context; assess the present. Preserve natural warmth in English and Hebrew.';
    case STRATEGY_INTERVENTION_MODES.STABILISATION:
      return 'Guidance: Emotional stabilisation before any CBT work. Validate, orient, ground. Do not attempt formulation building, exercise assignment, or task discussion until the person has stabilised. Understanding the pattern can wait — emotional footing comes first. Use for current moderate distress or genuine fail-safe uncertainty; do not imply crisis; hold no premature task. Preserve natural warmth in English and Hebrew.';
    case STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION:
      return 'Guidance: Begin from understanding before selecting any intervention. Formulation-first sequence: check in and understand the current state → clarify what has been happening → update or confirm the formulation → only then determine what clinical move type fits this session. Thought records, cognitive restructuring, and behavioral tasks are tools to apply AFTER the formulation for this session is explicit — not as default opening moves. The maintaining cycle must be named or confirmed before any technique is proposed. Reflect accurately and explore one useful thread; name only grounded, tentative patterns; concrete action stays blocked until readiness is confirmed. Preserve natural warmth in English and Hebrew.';
    case STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING:
      return 'Guidance: Begin by checking in with the person before advancing to new clinical material. Acknowledge what has happened since the last session before formulation deepening. Prioritise formulation hypotheses and longitudinal patterns. Confirm or update the formulation before introducing any new intervention. Reference prior session themes where clinically relevant. New action assignment is secondary to formulation update — the formulation moves first. The formulation is a hypothesis: confirm current relevance, let current correction win, reference at most one prior theme, draw no unsupported identity conclusion, and never auto-return homework. Preserve natural warmth in English and Hebrew.';
    case STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION:
      return 'Guidance: Listen and understand first — do not assume this is a first session merely because prior records are missing. Default reasoning sequence: listen → understand what is happening → acknowledge and hold → clarify the maintaining pattern → name the cognitive-behavioral cycle → only then consider whether any concrete next step is appropriate. Do NOT introduce exercises, homework, or CBT techniques before a working formulation has been explicitly stated and the person has felt genuinely understood. Explain only what concretely helps the current pattern; no generic CBT lecture. Preserve natural warmth in English and Hebrew.';
    default:
      return 'Guidance: Apply standard CBT engagement with clinical judgment. Listen first; understand before acting.';
  }
}

/**
 * @typedef {object} TherapistStrategyState
 * @property {string} strategy_version    - Engine version that produced this state.
 * @property {string} intervention_mode   - One of STRATEGY_INTERVENTION_MODES.
 * @property {string} distress_tier       - One of DISTRESS_TIERS.
 * @property {boolean} continuity_present - True when prior session continuity exists.
 * @property {boolean} formulation_present - True when an active CaseFormulation exists.
 * @property {object} message_signals     - Signal flags from extractMessageSignals().
 * @property {string} rationale           - Short internal rationale key.
 * @property {boolean} fail_safe          - True only when the fail-safe default was used.
 * @property {number} session_count       - Wave 2C/3D: number of prior sessions (0 if unknown).
 * @property {boolean} has_risk_flags     - Wave 2C: true when risk flags are active in continuity.
 * @property {boolean} has_open_tasks     - Wave 2C: true when open follow-up tasks exist.
 * @property {boolean} intervention_saturated - Wave 2C: true when intervention saturation detected.
 * @property {number} continuity_richness_score  - Wave 2C: continuity richness score (0–12+).
 * @property {number} formulation_strength_score - Wave 2C: formulation strength score (0–5).
 * @property {string} lts_trajectory      - Wave 3D: LTS trajectory label ('' when LTS absent).
 */

/**
 * @typedef {object} LTSStrategyInputs
 * @property {boolean} lts_valid                 - True when the LTS record is valid and usable.
 * @property {number}  lts_session_count         - Total session count from LTS (0 when invalid).
 * @property {string}  lts_trajectory            - LTS trajectory label ('' when invalid).
 * @property {ReadonlyArray<string>} lts_stalled_interventions - Bounded stalled intervention labels.
 * @property {boolean} lts_has_risk_history      - True when risk_flag_history is non-empty.
 * @property {boolean} lts_is_stagnating         - True when trajectory === 'stagnating'.
 * @property {boolean} lts_is_progressing        - True when trajectory === 'progressing'.
 * @property {boolean} lts_is_fluctuating        - True when trajectory === 'fluctuating'.
 * @property {boolean} lts_has_stalled_interventions - True when stalled_interventions non-empty.
 */
