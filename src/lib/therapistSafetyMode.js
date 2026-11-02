/**
 * @file src/lib/therapistSafetyMode.js
 *
 * Therapist Upgrade — Stage 2 Phase 7 — Therapist Safety Mode
 *
 * Defines safety-mode entry conditions, runtime behavior constraints, and
 * instruction injection for the upgraded (V5) therapist path only.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * 1. Detects high-distress / high-risk language via deterministic pattern
 *    matching (no LLM dependency for the pattern layer).
 * 2. Evaluates safety-mode entry conditions based on a bounded input signal
 *    set: crisis_signal, low_retrieval_confidence, allowlist_rejection, or
 *    flag_override — plus direct high-distress language detection.
 * 3. Returns a structured SafetyModeResult that the upgraded session path
 *    consumes to constrain its response behavior.
 * 4. Provides SAFETY_MODE_INSTRUCTIONS — the instruction text injected into
 *    the upgraded session context when safety mode is active.
 *
 * FAIL-CLOSED CONTRACT
 * --------------------
 * If mode determination fails for any reason, the caller should treat the
 * result as safety_mode: true (restricted).  This module exposes
 * SAFETY_MODE_FAIL_CLOSED_RESULT as the canonical fail-closed value.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is imported ONLY by workflowContextInjector.js for the V5
 * upgraded path.  It is never imported by the default therapist path.
 * When safety_mode_enabled is absent or false in the active wiring, this
 * module's output is never used.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Call the existing crisis detector (crisisDetector.jsx) — safety mode
 *   LAYERS ON TOP of the existing crisis stack; it does not replace it.
 * - Alter the default therapist path in any way.
 * - Weaken or bypass the existing crisis detection, risk panel, or safety
 *   filter stack.
 * - Make network requests or LLM calls (this is a deterministic module).
 * - Store or log raw user message content.
 *
 * SAFETY MODE BEHAVIOR WHEN ACTIVE (summarized)
 * ----------------------------------------------
 * 1. Shorter, more structured responses.
 * 2. One focused question at a time.
 * 3. Direct grounding style.
 * 4. Explicit separation of emotion / interpretation / belief / behavior / risk.
 * 5. Reduced exploratory breadth.
 * 6. No freeform deep-diving while risk is unresolved.
 * 7. All existing safety constraints remain fully in force.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 7, Task 7.1
 */

// ─── Safety mode version ──────────────────────────────────────────────────────

/** @type {string} */
export const SAFETY_MODE_VERSION = '7.0.0';

// ─── Trigger categories ───────────────────────────────────────────────────────

/**
 * Named trigger categories for safety mode activation.
 * Each category maps to a class of conditions that should constrain the
 * upgraded therapist's behavior toward the safety-mode response set.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SAFETY_TRIGGER_CATEGORIES = Object.freeze({
  /** Detected crisis signal from the existing safety stack */
  CRISIS_SIGNAL: 'crisis_signal',
  /** Retrieval confidence below the minimum safe threshold (Phase 5) */
  LOW_RETRIEVAL_CONFIDENCE: 'low_retrieval_confidence',
  /** Live retrieval blocked by allowlist (Phase 6) */
  ALLOWLIST_REJECTION: 'allowlist_rejection',
  /** Explicit override flag set by caller */
  FLAG_OVERRIDE: 'flag_override',
  /** Severe hopelessness or emotional collapse language */
  SEVERE_HOPELESSNESS: 'severe_hopelessness',
  /** Major shutdown / breakdown language */
  SHUTDOWN_BREAKDOWN: 'shutdown_breakdown',
  /** Extreme catastrophic / irreversibility language */
  CATASTROPHIC_LANGUAGE: 'catastrophic_language',
  /** High-distress language where exploratory therapy should slow down */
  HIGH_DISTRESS: 'high_distress',
});

// ─── High-distress language patterns ─────────────────────────────────────────
//
// These patterns detect HIGH DISTRESS that warrants the safety-mode
// structured response set.  They are DISTINCT from the existing crisis
// detector patterns (crisisDetector.jsx) which handle hard stops.
// These patterns activate the structured safety-mode behavior in the
// upgraded path — they do NOT replace the existing hard-stop stack.
//
// Normalization: messages are lower-cased before matching.  Accented
// characters are NOT normalized here; the patterns use case-insensitive
// flags and cover common variants.
//
// Each pattern entry has: { pattern: RegExp, category: string }

/** @type {Array<{ pattern: RegExp, category: string }>} */
export const SAFETY_TRIGGER_PATTERNS = Object.freeze([
  // ── Severe hopelessness ──────────────────────────────────────────────────
  { pattern: /\bnothing\s+(will|can|ever)\s+get\s+better\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bno\s+(hope|point|reason)\s+(left|anymore|at\s+all)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bhopeless(ness)?\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bcan'?t\s+see\s+(a\s+)?way\s+(out|forward|through)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\blife\s+(is\s+)?(not\s+)?worth\s+(living|it)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bwhat'?s\s+the\s+point\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bnever\s+(going\s+to\s+)?(be\s+)?(okay|fine|better|happy)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bnothing\s+(matters|helps|works)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },

  // ── Major shutdown / breakdown ───────────────────────────────────────────
  { pattern: /\bshutting\s+down\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcomplete(ly)?\s+(broken|numb|empty|lost)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bfalling\s+apart\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bbreaking\s+down\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcollaps(e|ing|ed)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcan'?t\s+(function|cope|go\s+on|face)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\btotally\s+(lost|numb|empty|broken)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bgiven\s+up\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },

  // ── Extreme catastrophic / irreversibility ───────────────────────────────
  { pattern: /\beverything\s+is\s+(ruined|destroyed|over|hopeless)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bmy\s+life\s+is\s+(ruined|over|destroyed)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bno\s+way\s+back\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\birreversible\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bnever\s+(recover|be\s+okay|be\s+normal|be\s+the\s+same)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bthis\s+is\s+(the\s+end|all\s+over)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },

  // ── High-distress (general) — exploratory therapy should slow ────────────
  { pattern: /\boverwhelm(ed|ing)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bcan'?t\s+(breathe|think|move)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bfeel(ing)?\s+(so\s+)?(out\s+of\s+control|uncontrollable)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bpanic(king|ked)?\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bscreaming\s+inside\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bcan'?t\s+stop\s+crying\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },

  // ── Spanish ───────────────────────────────────────────────────────────────
  { pattern: /(?:^|[\s,.;:!?])(?:nada\s+(?:va\s+a|puede|podrá)\s+mejorar|no\s+(?:queda|hay)\s+esperanza|sin\s+esperanza|no\s+veo\s+(?:una\s+)?salida|la\s+vida\s+no\s+vale\s+la\s+pena)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /(?:^|[\s,.;:!?])(?:me\s+estoy\s+derrumbando|completamente\s+rot[oa]|no\s+puedo\s+(?:funcionar|afrontarlo|seguir)|me\s+he\s+rendido)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /(?:^|[\s,.;:!?])(?:todo\s+está\s+(?:arruinado|destruido|perdido)|mi\s+vida\s+está\s+(?:arruinada|destruida)|no\s+hay\s+vuelta\s+atrás|irreversible|nunca\s+me\s+recuperaré)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /(?:^|[\s,.;:!?])(?:abrumad[oa]|no\s+puedo\s+(?:respirar|pensar|moverme)|fuera\s+de\s+control|pánico|no\s+puedo\s+dejar\s+de\s+llorar)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },

  // ── French ────────────────────────────────────────────────────────────────
  { pattern: /(?:^|[\s,.;:!?])(?:rien\s+ne\s+s’améliorera|rien\s+ne\s+s'ameliorera|aucun\s+espoir|sans\s+espoir|je\s+ne\s+vois\s+pas\s+d’issue|je\s+ne\s+vois\s+pas\s+d'issue|la\s+vie\s+ne\s+vaut\s+pas\s+la\s+peine)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /(?:^|[\s,.;:!?])(?:je\s+m’effondre|je\s+m'effondre|complètement\s+bris[ée]|je\s+ne\s+peux\s+pas\s+(?:fonctionner|faire\s+face|continuer)|j’ai\s+abandonné|j'ai\s+abandonné)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /(?:^|[\s,.;:!?])(?:tout\s+est\s+(?:ruiné|détruit|fini)|ma\s+vie\s+est\s+(?:ruinée|détruite)|aucun\s+retour\s+en\s+arrière|irréversible|je\s+ne\s+m’en\s+remettrai\s+jamais|je\s+ne\s+m'en\s+remettrai\s+jamais)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /(?:^|[\s,.;:!?])(?:submerg[ée]|débord[ée]|je\s+ne\s+peux\s+pas\s+(?:respirer|penser|bouger)|hors\s+de\s+contrôle|panique|je\s+n’arrête\s+pas\s+de\s+pleurer|je\s+n'arrête\s+pas\s+de\s+pleurer)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },

  // ── German ────────────────────────────────────────────────────────────────
  { pattern: /(?:^|[\s,.;:!?])(?:nichts\s+wird\s+besser|keine\s+hoffnung|hoffnungslos|ich\s+sehe\s+keinen\s+ausweg|das\s+leben\s+ist\s+nicht\s+lebenswert)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /(?:^|[\s,.;:!?])(?:ich\s+breche\s+zusammen|völlig\s+gebrochen|ich\s+kann\s+nicht\s+(?:funktionieren|damit\s+umgehen|weitermachen)|ich\s+habe\s+aufgegeben)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /(?:^|[\s,.;:!?])(?:alles\s+ist\s+(?:ruiniert|zerstört|vorbei)|mein\s+leben\s+ist\s+(?:ruiniert|zerstört)|es\s+gibt\s+keinen\s+weg\s+zurück|irreversibel|ich\s+werde\s+mich\s+nie\s+erholen)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /(?:^|[\s,.;:!?])(?:überwältigt|ich\s+kann\s+nicht\s+(?:atmen|denken|mich\s+bewegen)|außer\s+kontrolle|panik|ich\s+kann\s+nicht\s+aufhören\s+zu\s+weinen)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },

  // ── Italian ───────────────────────────────────────────────────────────────
  { pattern: /(?:^|[\s,.;:!?])(?:niente\s+migliorerà|nessuna\s+speranza|senza\s+speranza|non\s+vedo\s+(?:una\s+)?via\s+d’uscita|non\s+vedo\s+(?:una\s+)?via\s+d'uscita|la\s+vita\s+non\s+vale\s+la\s+pena)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /(?:^|[\s,.;:!?])(?:sto\s+crollando|completamente\s+distrutt[oa]|non\s+riesco\s+a\s+(?:funzionare|farvi\s+fronte|andare\s+avanti)|ho\s+rinunciato)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /(?:^|[\s,.;:!?])(?:tutto\s+è\s+(?:rovinato|distrutto|finito)|la\s+mia\s+vita\s+è\s+(?:rovinata|distrutta)|non\s+c’è\s+modo\s+di\s+tornare\s+indietro|non\s+c'è\s+modo\s+di\s+tornare\s+indietro|irreversibile|non\s+mi\s+riprenderò\s+mai)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /(?:^|[\s,.;:!?])(?:sopraffatt[oa]|non\s+riesco\s+a\s+(?:respirare|pensare|muovermi)|fuori\s+controllo|panico|non\s+riesco\s+a\s+smettere\s+di\s+piangere)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },

  // ── Portuguese ────────────────────────────────────────────────────────────
  { pattern: /(?:^|[\s,.;:!?])(?:nada\s+vai\s+melhorar|sem\s+esperança|não\s+vejo\s+(?:uma\s+)?saída|a\s+vida\s+não\s+vale\s+a\s+pena)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /(?:^|[\s,.;:!?])(?:estou\s+desmoronando|completamente\s+quebrad[oa]|não\s+consigo\s+(?:funcionar|lidar\s+com\s+isso|continuar)|desisti)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /(?:^|[\s,.;:!?])(?:tudo\s+está\s+(?:arruinado|destruído|acabado)|minha\s+vida\s+está\s+(?:arruinada|destruída)|não\s+há\s+volta|irreversível|nunca\s+vou\s+me\s+recuperar)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /(?:^|[\s,.;:!?])(?:sobrecarregad[oa]|não\s+consigo\s+(?:respirar|pensar|me\s+mover)|fora\s+de\s+controle|pânico|não\s+consigo\s+parar\s+de\s+chorar)(?=$|[\s,.;:!?])/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
]);

// ─── Safety mode instructions ─────────────────────────────────────────────────

/**
 * Instruction text injected into the upgraded session context when safety
 * mode is active.
 *
 * These instructions constrain the V5 upgraded therapist's behavior to a
 * shorter, more structured, and risk-aware response mode.  They are additive
 * to the existing session context — they do NOT replace any existing safety
 * filter, crisis handler, or risk panel behavior.
 *
 * IMPORTANT: These instructions are only ever injected into the V5 upgraded
 * path (safety_mode_enabled === true in the wiring).  The default therapist
 * path (CBT_THERAPIST_WIRING_HYBRID) is completely unaffected.
 *
 * @type {string}
 */
export const SAFETY_MODE_INSTRUCTIONS = [
  '=== SAFETY MODE — STAGE 2 PHASE 7 ===',
  '',
  'This session has entered safety mode. The following behavioral constraints',
  'are active for this response and must be honored alongside all existing',
  'clinical and safety guidelines:',
  '',
  'RESPONSE CONSTRAINTS',
  '1. Keep responses shorter and more focused than normal.',
  '2. Ask only ONE question per response when asking a question.',
  '3. Use a direct, grounding tone. Avoid exploratory or freeform breadth.',
  '4. If relevant, explicitly distinguish between:',
  '   - What the person is FEELING (emotion)',
  '   - What they are THINKING about what happened (interpretation)',
  '   - What they believe about themselves or the world (belief)',
  '   - What they are doing or considering doing (behavior)',
  '   - Any signal of immediate risk to safety (risk)',
  '5. Do NOT deep-dive or expand the topic while high distress is unresolved.',
  '6. Do NOT present this application as emergency care.',
  '7. Do NOT fabricate confidence about risk level.',
  '8. All existing constraints remain fully in force:',
  '   - No diagnosis, no medication advice, no self-harm instructions.',
  '   - No romantic dependency patterns.',
  '   - If the existing crisis stack detects a hard-stop condition, it takes',
  '     full precedence over this safety mode.',
  '',
  '=== END SAFETY MODE CONSTRAINTS ===',
].join('\n');

// ─── Fail-closed sentinel value ───────────────────────────────────────────────

/**
 * Canonical fail-closed result for safety mode determination.
 *
 * When mode determination fails for any reason (invalid input, unexpected
 * exception, etc.), callers must treat this as the result.  Defaulting to
 * safety_mode: true is the fail-closed contract.
 *
 * @type {Readonly<SafetyModeResult>}
 */
export const SAFETY_MODE_FAIL_CLOSED_RESULT = Object.freeze({
  safety_mode: true,
  trigger: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
  category: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
  pattern_match: false,
  fail_closed: true,
});

// ─── Core determination function ─────────────────────────────────────────────

/**
 * @typedef {object} SafetyModeSignals
 * @property {boolean} [crisis_signal]           - Crisis signal from existing stack
 * @property {boolean} [low_retrieval_confidence] - Low retrieval confidence from Phase 5
 * @property {boolean} [allowlist_rejection]      - Allowlist rejection from Phase 6
 * @property {boolean} [flag_override]            - Explicit override flag from caller
 * @property {string}  [message_text]             - User message text (optional; used
 *                                                  for pattern matching; NOT stored)
 */

/**
 * @typedef {object} SafetyModeResult
 * @property {boolean}      safety_mode   - Whether safety mode should be active
 * @property {string|null}  trigger       - The trigger category that activated safety mode
 * @property {string|null}  category      - Same as trigger (alias for clarity)
 * @property {boolean}      pattern_match - Whether activation was via text pattern match
 * @property {boolean}      [fail_closed] - Present and true only on fail-closed path
 */

/**
 * Determines whether safety mode should be active for the current turn.
 *
 * Evaluates the provided signals in order:
 *   1. crisis_signal              → safety mode ON  (CRISIS_SIGNAL)
 *   2. low_retrieval_confidence   → safety mode ON  (LOW_RETRIEVAL_CONFIDENCE)
 *   3. allowlist_rejection        → safety mode ON  (ALLOWLIST_REJECTION)
 *   4. flag_override              → safety mode ON  (FLAG_OVERRIDE)
 *   5. message_text pattern match → safety mode ON  (matched category)
 *   6. No conditions met          → safety mode OFF
 *
 * Fail-closed: if an unexpected exception occurs during determination, the
 * caller should treat the result as SAFETY_MODE_FAIL_CLOSED_RESULT.  This
 * function itself does NOT throw — it returns SAFETY_MODE_FAIL_CLOSED_RESULT
 * internally on exception.
 *
 * PRIVACY: message_text is used only for in-memory pattern matching and is
 * never stored, logged, or persisted by this function.
 *
 * @param {SafetyModeSignals} signals - The safety evaluation signals
 * @returns {SafetyModeResult} The resolved safety mode result
 */
export function determineSafetyMode(signals) {
  try {
    if (!signals || typeof signals !== 'object') {
      return SAFETY_MODE_FAIL_CLOSED_RESULT;
    }

    // ── Signal 1: Crisis signal from existing stack ──────────────────────
    if (signals.crisis_signal === true) {
      return {
        safety_mode: true,
        trigger: SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL,
        category: SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL,
        pattern_match: false,
      };
    }

    // ── Signal 2: Low retrieval confidence (Phase 5) ─────────────────────
    if (signals.low_retrieval_confidence === true) {
      return {
        safety_mode: true,
        trigger: SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE,
        category: SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE,
        pattern_match: false,
      };
    }

    // ── Signal 3: Allowlist rejection (Phase 6) ───────────────────────────
    if (signals.allowlist_rejection === true) {
      return {
        safety_mode: true,
        trigger: SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION,
        category: SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION,
        pattern_match: false,
      };
    }

    // ── Signal 4: Explicit flag override ─────────────────────────────────
    if (signals.flag_override === true) {
      return {
        safety_mode: true,
        trigger: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
        category: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
        pattern_match: false,
      };
    }

    // ── Signal 5: Message text pattern matching ───────────────────────────
    if (typeof signals.message_text === 'string' && signals.message_text.trim()) {
      const text = signals.message_text;
      for (const { pattern, category } of SAFETY_TRIGGER_PATTERNS) {
        if (pattern.test(text)) {
          return {
            safety_mode: true,
            trigger: category,
            category,
            pattern_match: true,
          };
        }
      }
    }

    // ── No conditions met — safety mode off ──────────────────────────────
    return {
      safety_mode: false,
      trigger: null,
      category: null,
      pattern_match: false,
    };
  } catch (_e) {
    // Fail-closed: unexpected exception → default to safety mode
    return SAFETY_MODE_FAIL_CLOSED_RESULT;
  }
}

// ─── Safety precedence order ──────────────────────────────────────────────────

/**
 * Explicit, deterministic precedence order for the safety and crisis systems
 * operating in the upgraded therapist path.
 *
 * Layer 1 (regex crisis detector) and Layer 2 (LLM crisis detector) are both
 * HARD_STOP authoritative — they return immediately when triggered and prevent
 * the message from reaching the agent.  They are implemented in Chat.jsx and
 * are completely independent of the upgraded safety mode.
 *
 * Layer 3 (upgraded safety mode) only executes after Layers 1 and 2 have
 * passed.  It CONSTRAINS_ONLY — it modifies the instruction context for the
 * LLM but does NOT stop or redirect the message.
 *
 * Layer 4 (post-LLM safety filter) runs on the agent's OUTPUT, not the input.
 * It is always active regardless of upgrade state.
 *
 * This constant is the source of truth for precedence and must be preserved
 * in all future changes.
 *
 * @type {ReadonlyArray<Readonly<object>>}
 */
export const SAFETY_PRECEDENCE_ORDER = Object.freeze([
  Object.freeze({
    layer: 1,
    name: 'CRISIS_DETECTOR_REGEX',
    description: 'Regex-based crisis detection (detectCrisisWithReason) — hard-stop, authoritative',
    authority: 'HARD_STOP',
    location: 'Chat.jsx — Layer 1',
    overrides: 'all lower layers',
    affects_default_path: true,
  }),
  Object.freeze({
    layer: 2,
    name: 'CRISIS_DETECTOR_LLM',
    description: 'LLM-based enhanced crisis detection (enhancedCrisisDetector) — hard-stop, authoritative',
    authority: 'HARD_STOP',
    location: 'Chat.jsx — Layer 2',
    overrides: 'layers 3 and 4',
    affects_default_path: true,
  }),
  Object.freeze({
    layer: 3,
    name: 'UPGRADED_SAFETY_MODE',
    description: 'Phase 7 per-turn safety mode (evaluateRuntimeSafetyMode / buildRuntimeSafetySupplement) — V5 path only',
    authority: 'CONSTRAIN_ONLY',
    location: 'Chat.jsx — Layer 3 (V5 path only, flag-gated)',
    active_when: 'safety_mode_enabled === true in ACTIVE_CBT_THERAPIST_WIRING',
    overridden_by: 'Layers 1 and 2 (HARD_STOP layers are authoritative)',
    affects_default_path: false,
  }),
  Object.freeze({
    layer: 4,
    name: 'POST_LLM_SAFETY_FILTER',
    description: 'Post-LLM output safety filter (postLlmSafetyFilter) — always active, sanitizes agent output',
    authority: 'OUTPUT_FILTER',
    location: 'functions/postLlmSafetyFilter.ts',
    overridden_by: 'Not applicable — operates on output after LLM generation',
    affects_default_path: true,
  }),
]);

// ─── Per-turn runtime safety mode evaluator ───────────────────────────────────

/**
 * Evaluates safety mode entry conditions from the current turn's message text
 * only (no session-level signals).
 *
 * This is the per-turn runtime evaluator, distinct from determineSafetyMode()
 * which also accepts session-level signals (crisis_signal, low_retrieval_confidence,
 * allowlist_rejection, flag_override) used at session-start.
 *
 * The per-turn evaluator uses ONLY message_text pattern matching, which is the
 * only runtime signal available from actual user conversation content.
 *
 * This function is called per-turn in the V5 upgraded path (flag-gated) AFTER
 * the existing HARD_STOP crisis layers (Layer 1 regex and Layer 2 LLM detectors)
 * have passed.  It never runs in the default therapist path.
 *
 * Fail-closed: empty, null, or non-string input returns safety_mode: false
 * (not fail-closed like the session-start evaluator, because a missing message
 * text at per-turn time just means no distress signal was detected).
 *
 * PRIVACY: messageText is used only for in-memory pattern matching and is
 * never stored, logged, or persisted by this function.
 *
 * @param {string|null|undefined} messageText - The user's message for this turn
 * @returns {SafetyModeResult} The resolved safety mode result for this turn
 */
export function evaluateRuntimeSafetyMode(messageText) {
  try {
    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      // No message text → safety mode off for this turn (not fail-closed)
      return {
        safety_mode: false,
        trigger: null,
        category: null,
        pattern_match: false,
      };
    }
    // Delegate to determineSafetyMode with only the message_text signal
    // (no session-level signals — those are session-start only)
    return determineSafetyMode({ message_text: messageText });
  } catch (_e) {
    // Fail-closed on unexpected exception
    return SAFETY_MODE_FAIL_CLOSED_RESULT;
  }
}

// ─── Context builder ─────────────────────────────────────────────────────────

/**
 * Returns the safety mode instruction string when safety mode is active,
 * or null when safety mode is off.
 *
 * This is the gating function for Phase 7 runtime injection.  It is called
 * by workflowContextInjector.js for the V5 path only.
 *
 * @param {SafetyModeResult} safetyResult - Result from determineSafetyMode()
 * @returns {string|null} SAFETY_MODE_INSTRUCTIONS when active; null otherwise
 */
export function getSafetyModeContext(safetyResult) {
  if (safetyResult && safetyResult.safety_mode === true) {
    return SAFETY_MODE_INSTRUCTIONS;
  }
  return null;
}

/**
 * Returns the safety mode instruction string when the supplied wiring has
 * safety_mode_enabled set to true AND the safetyResult signals active mode.
 *
 * For all wirings without safety_mode_enabled === true (which includes HYBRID,
 * V1, V2, V3, V4, and any unrecognised config), this function returns null —
 * the current therapist path is completely unchanged.
 *
 * @param {object} wiring - The active therapist wiring config object
 * @param {SafetyModeResult} safetyResult - Result from determineSafetyMode()
 * @returns {string|null} SAFETY_MODE_INSTRUCTIONS for V5 when active; null otherwise
 */
export function getSafetyModeContextForWiring(wiring, safetyResult) {
  if (wiring && wiring.safety_mode_enabled === true) {
    return getSafetyModeContext(safetyResult);
  }
  return null;
}
