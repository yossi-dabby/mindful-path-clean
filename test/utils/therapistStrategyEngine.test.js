/**
 * @file test/utils/therapistStrategyEngine.test.js
 *
 * Wave 2A — Therapeutic Strategy Layer Scaffold
 *
 * PURPOSE
 * -------
 * Comprehensive pure tests for src/lib/therapistStrategyEngine.js.
 * All tests are deterministic and have no side effects.  No imports from
 * agentWiring, featureFlags, or any entity definition.
 *
 * TEST COVERAGE REQUIRED (from Wave 2A problem statement)
 * --------------------------------------------------------
 *  1.  All supported intervention modes are reachable.
 *  2.  Distress tier boundaries (LOW, MILD, MODERATE, HIGH).
 *  3.  Safety-mode-active → containment-oriented result.
 *  4.  Empty continuity / first-session safe defaults.
 *  5.  Rich continuity behavior.
 *  6.  Formulation present vs absent.
 *  7.  Ambiguous inputs → conservative default.
 *  8.  No continuity + no formulation → safe middle mode (PSYCHOEDUCATION / STABILISATION).
 *  9.  buildStrategyContextSection output structure.
 * 10.  Deterministic repeatability (same input → same output).
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import any runtime modules (agentWiring, featureFlags, Chat, etc.).
 * - Does NOT enable any feature flags.
 * - All flags remain at their default (false) state — this module is scaffold-only.
 * - Does NOT test runtime injection (no V8 wiring, no Chat, no activeAgentWiring).
 *
 * Source of truth: Wave 2A problem statement.
 */

import { describe, it, expect } from 'vitest';

import {
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  MESSAGE_SIGNAL_KEYS,
  STRATEGY_FAIL_SAFE_STATE,
  extractMessageSignals,
  scoreDistressTier,
  determineTherapistStrategy,
  buildStrategyContextSection,
} from '../../src/lib/therapistStrategyEngine.js';

// ─── Section 1 — Module exports ───────────────────────────────────────────────

describe('Wave 2A — Module exports exist', () => {
  it('STRATEGY_VERSION is exported as a non-empty string', () => {
    expect(typeof STRATEGY_VERSION).toBe('string');
    expect(STRATEGY_VERSION.length).toBeGreaterThan(0);
  });

  it('STRATEGY_INTERVENTION_MODES is a frozen object with all required modes', () => {
    expect(typeof STRATEGY_INTERVENTION_MODES).toBe('object');
    expect(STRATEGY_INTERVENTION_MODES).not.toBeNull();
    expect(Object.isFrozen(STRATEGY_INTERVENTION_MODES)).toBe(true);
    expect(typeof STRATEGY_INTERVENTION_MODES.CONTAINMENT).toBe('string');
    expect(typeof STRATEGY_INTERVENTION_MODES.STABILISATION).toBe('string');
    expect(typeof STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION).toBe('string');
    expect(typeof STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING).toBe('string');
    expect(typeof STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION).toBe('string');
  });

  it('DISTRESS_TIERS is a frozen object with all tier values', () => {
    expect(typeof DISTRESS_TIERS).toBe('object');
    expect(Object.isFrozen(DISTRESS_TIERS)).toBe(true);
    expect(typeof DISTRESS_TIERS.TIER_LOW).toBe('string');
    expect(typeof DISTRESS_TIERS.TIER_MILD).toBe('string');
    expect(typeof DISTRESS_TIERS.TIER_MODERATE).toBe('string');
    expect(typeof DISTRESS_TIERS.TIER_HIGH).toBe('string');
  });

  it('MESSAGE_SIGNAL_KEYS is a frozen object with all signal keys', () => {
    expect(typeof MESSAGE_SIGNAL_KEYS).toBe('object');
    expect(Object.isFrozen(MESSAGE_SIGNAL_KEYS)).toBe(true);
    expect(typeof MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE).toBe('string');
    expect(typeof MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE).toBe('string');
    expect(typeof MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE).toBe('string');
    expect(typeof MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE).toBe('string');
    expect(typeof MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE).toBe('string');
    expect(typeof MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT).toBe('string');
  });

  it('STRATEGY_FAIL_SAFE_STATE is a frozen object with required fields', () => {
    expect(typeof STRATEGY_FAIL_SAFE_STATE).toBe('object');
    expect(Object.isFrozen(STRATEGY_FAIL_SAFE_STATE)).toBe(true);
    expect(STRATEGY_FAIL_SAFE_STATE.strategy_version).toBe(STRATEGY_VERSION);
    expect(STRATEGY_FAIL_SAFE_STATE.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(STRATEGY_FAIL_SAFE_STATE.fail_safe).toBe(true);
  });

  it('extractMessageSignals is exported as a function', () => {
    expect(typeof extractMessageSignals).toBe('function');
  });

  it('scoreDistressTier is exported as a function', () => {
    expect(typeof scoreDistressTier).toBe('function');
  });

  it('determineTherapistStrategy is exported as a function', () => {
    expect(typeof determineTherapistStrategy).toBe('function');
  });

  it('buildStrategyContextSection is exported as a function', () => {
    expect(typeof buildStrategyContextSection).toBe('function');
  });
});

// ─── Section 2 — STRATEGY_INTERVENTION_MODES values ──────────────────────────

describe('Wave 2A — Intervention mode string values', () => {
  it('CONTAINMENT has the expected string value', () => {
    expect(STRATEGY_INTERVENTION_MODES.CONTAINMENT).toBe('containment');
  });

  it('STABILISATION has the expected string value', () => {
    expect(STRATEGY_INTERVENTION_MODES.STABILISATION).toBe('stabilisation');
  });

  it('STRUCTURED_EXPLORATION has the expected string value', () => {
    expect(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION).toBe('structured_exploration');
  });

  it('FORMULATION_DEEPENING has the expected string value', () => {
    expect(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING).toBe('formulation_deepening');
  });

  it('PSYCHOEDUCATION has the expected string value', () => {
    expect(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION).toBe('psychoeducation');
  });

  it('intervention mode set has exactly 5 modes (bounded set)', () => {
    expect(Object.keys(STRATEGY_INTERVENTION_MODES)).toHaveLength(5);
  });
});

// ─── Section 3 — extractMessageSignals ───────────────────────────────────────

describe('Wave 2A — extractMessageSignals', () => {
  it('returns a complete frozen signals object', () => {
    const signals = extractMessageSignals('Hello, I am feeling fine today.');
    expect(typeof signals).toBe('object');
    expect(Object.isFrozen(signals)).toBe(true);
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe('boolean');
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe('boolean');
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]).toBe('boolean');
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]).toBe('boolean');
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]).toBe('boolean');
    expect(typeof signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe('boolean');
  });

  it('null input → is_empty_or_short=true, all distress signals false', () => {
    const signals = extractMessageSignals(null);
    expect(signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe(true);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
  });

  it('undefined input → is_empty_or_short=true', () => {
    const signals = extractMessageSignals(undefined);
    expect(signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe(true);
  });

  it('empty string → is_empty_or_short=true', () => {
    const signals = extractMessageSignals('');
    expect(signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe(true);
  });

  it('short string (< threshold) → is_empty_or_short=true', () => {
    const signals = extractMessageSignals('hi');
    expect(signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe(true);
  });

  it('long neutral message → is_empty_or_short=false', () => {
    const signals = extractMessageSignals('Today was a fairly normal and productive day for me.');
    expect(signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe(false);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(false);
  });

  it('hopelessness language → has_hopelessness_language=true', () => {
    const signals = extractMessageSignals('I feel hopeless and nothing will ever get better.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(true);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
  });

  it('catastrophic language → has_catastrophic_language=true', () => {
    const signals = extractMessageSignals('Everything is ruined, my life is over, there is no way back.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]).toBe(true);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
  });

  it('shutdown/breakdown language → has_shutdown_language=true', () => {
    const signals = extractMessageSignals('I am completely broken and falling apart, I cannot cope.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]).toBe(true);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
  });

  it('high-distress language → has_distress_language=true (via general distress pattern)', () => {
    const signals = extractMessageSignals('I am so overwhelmed right now, I cannot breathe.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
  });

  it('emotional but not distress language → has_emotional_language=true, has_distress_language=false', () => {
    const signals = extractMessageSignals('I have been feeling a bit sad and anxious about work lately.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]).toBe(true);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
  });

  it('panic/loss-of-control language → has_distress_language=true', () => {
    const signals = extractMessageSignals('I was panicking and totally out of control yesterday.');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
  });

  it('never throws for arbitrary string inputs', () => {
    expect(() => extractMessageSignals('a'.repeat(10000))).not.toThrow();
    expect(() => extractMessageSignals(123)).not.toThrow();
    expect(() => extractMessageSignals({})).not.toThrow();
  });
});

// ─── Section 4 — scoreDistressTier ───────────────────────────────────────────

describe('Wave 2A — scoreDistressTier', () => {
  it('null safety result + null signals → TIER_LOW', () => {
    expect(scoreDistressTier(null, null)).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('empty safety result + empty signals → TIER_LOW', () => {
    expect(scoreDistressTier({}, {})).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('safety_mode: true → TIER_HIGH (overrides all)', () => {
    expect(scoreDistressTier({ safety_mode: true }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('crisis_signal trigger → TIER_HIGH', () => {
    expect(scoreDistressTier({ triggers: ['crisis_signal'] }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('severe_hopelessness trigger → TIER_HIGH', () => {
    expect(scoreDistressTier({ triggers: ['severe_hopelessness'] }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('shutdown_breakdown trigger → TIER_HIGH', () => {
    expect(scoreDistressTier({ triggers: ['shutdown_breakdown'] }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('catastrophic_language trigger → TIER_HIGH', () => {
    expect(scoreDistressTier({ triggers: ['catastrophic_language'] }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('flag_override trigger → TIER_HIGH', () => {
    expect(scoreDistressTier({ triggers: ['flag_override'] }, {})).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('hopelessness message signal → TIER_HIGH', () => {
    const ms = extractMessageSignals('I feel hopeless and nothing will ever get better.');
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('catastrophic message signal → TIER_HIGH', () => {
    const ms = extractMessageSignals('Everything is ruined, my life is over.');
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('shutdown message signal → TIER_HIGH', () => {
    const ms = extractMessageSignals('I am completely broken and falling apart.');
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('low_retrieval_confidence trigger (no safety_mode) → TIER_MODERATE', () => {
    expect(scoreDistressTier({ triggers: ['low_retrieval_confidence'] }, {})).toBe(DISTRESS_TIERS.TIER_MODERATE);
  });

  it('allowlist_rejection trigger (no safety_mode) → TIER_MODERATE', () => {
    expect(scoreDistressTier({ triggers: ['allowlist_rejection'] }, {})).toBe(DISTRESS_TIERS.TIER_MODERATE);
  });

  it('general high-distress language signal (no hard triggers) → TIER_MODERATE', () => {
    const ms = extractMessageSignals('I am so overwhelmed right now and cannot breathe.');
    // has_distress_language=true but no hopelessness/catastrophic/shutdown
    expect(ms[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(true);
    expect(ms[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(false);
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_MODERATE);
  });

  it('emotional language only (no distress) → TIER_MILD', () => {
    const ms = extractMessageSignals('I have been feeling sad and worried about work lately.');
    expect(ms[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]).toBe(true);
    expect(ms[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_MILD);
  });

  it('neutral long message → TIER_LOW', () => {
    const ms = extractMessageSignals('Today was a fine and ordinary day, nothing special happened.');
    expect(scoreDistressTier({}, ms)).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('safety_mode true overrides low-distress message signals → TIER_HIGH', () => {
    const ms = extractMessageSignals('Today was fine.');
    expect(scoreDistressTier({ safety_mode: true }, ms)).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('never throws for arbitrary inputs', () => {
    expect(() => scoreDistressTier(null, null)).not.toThrow();
    expect(() => scoreDistressTier('bad', 'input')).not.toThrow();
    expect(() => scoreDistressTier(123, undefined)).not.toThrow();
  });
});

// ─── Section 5 — determineTherapistStrategy: all modes reachable ──────────────

describe('Wave 2A — determineTherapistStrategy: all intervention modes reachable', () => {
  // ── CONTAINMENT ──────────────────────────────────────────────────────────────
  it('CONTAINMENT: safety_mode active → containment (with continuity)', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior session content' }] },
      { working_hypotheses: 'Some hypothesis' },
      DISTRESS_TIERS.TIER_HIGH,
      extractMessageSignals('I feel hopeless and nothing will ever get better.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('CONTAINMENT: TIER_HIGH with no continuity, no formulation', () => {
    const result = determineTherapistStrategy(
      null,
      null,
      DISTRESS_TIERS.TIER_HIGH,
      extractMessageSignals('Everything is ruined and I cannot go on.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('CONTAINMENT: TIER_HIGH rationale is tier_high_containment_mandatory', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.rationale).toBe('tier_high_containment_mandatory');
  });

  // ── STABILISATION ────────────────────────────────────────────────────────────
  it('STABILISATION: TIER_MODERATE → stabilisation', () => {
    const result = determineTherapistStrategy(
      { records: [] },
      null,
      DISTRESS_TIERS.TIER_MODERATE,
      extractMessageSignals('I am overwhelmed today.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('STABILISATION: fail-safe state uses stabilisation', () => {
    expect(STRATEGY_FAIL_SAFE_STATE.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  // ── PSYCHOEDUCATION ───────────────────────────────────────────────────────────
  it('PSYCHOEDUCATION: no continuity + no formulation + TIER_LOW → psychoeducation', () => {
    const result = determineTherapistStrategy(
      null,
      null,
      DISTRESS_TIERS.TIER_LOW,
      extractMessageSignals('I am here to start therapy.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('PSYCHOEDUCATION: empty records array + no formulation + TIER_MILD → psychoeducation', () => {
    const result = determineTherapistStrategy(
      { records: [] },
      null,
      DISTRESS_TIERS.TIER_MILD,
      extractMessageSignals('I am feeling a bit sad today and want to start working on it.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('PSYCHOEDUCATION: rationale is no_context_psychoeducation', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.rationale).toBe('no_context_psychoeducation');
  });

  // ── STRUCTURED_EXPLORATION ────────────────────────────────────────────────────
  it('STRUCTURED_EXPLORATION: continuity present, no formulation, TIER_LOW → structured exploration', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Discussed anxiety about work' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      extractMessageSignals('Today I want to continue working on my anxiety.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('STRUCTURED_EXPLORATION: no continuity + formulation present + TIER_MILD → structured exploration', () => {
    const result = determineTherapistStrategy(
      null,
      { working_hypotheses: 'Core schema of worthlessness' },
      DISTRESS_TIERS.TIER_MILD,
      extractMessageSignals('I have been feeling quite sad and anxious lately.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('STRUCTURED_EXPLORATION: rationale is partial_context_structured_exploration', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Discussed work stress' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.rationale).toBe('partial_context_structured_exploration');
  });

  // ── FORMULATION_DEEPENING ─────────────────────────────────────────────────────
  it('FORMULATION_DEEPENING: continuity + formulation + TIER_LOW → formulation deepening', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Explored core schemas' }] },
      { working_hypotheses: 'Abandonment schema active' },
      DISTRESS_TIERS.TIER_LOW,
      extractMessageSignals('I want to keep working on the patterns we identified.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('FORMULATION_DEEPENING: continuity + formulation + TIER_MILD → formulation deepening', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Explored negative automatic thoughts' }] },
      { working_hypotheses: 'Perfectionism and self-criticism' },
      DISTRESS_TIERS.TIER_MILD,
      extractMessageSignals('I have been feeling a bit worried about my performance.')
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('FORMULATION_DEEPENING: rationale is formulation_and_continuity_deepening', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Explored schemas' }] },
      { working_hypotheses: 'Core belief: I am unlovable' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.rationale).toBe('formulation_and_continuity_deepening');
  });
});

// ─── Section 6 — Safety-mode-active → containment-oriented result ─────────────

describe('Wave 2A — Safety mode active → containment mandatory', () => {
  it('TIER_HIGH always produces CONTAINMENT regardless of rich context', () => {
    const richContinuity = { records: [{ session_summary: 'Rich prior session' }] };
    const richFormulation = { working_hypotheses: 'Strong formulation present' };
    const result = determineTherapistStrategy(richContinuity, richFormulation, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('TIER_HIGH with null inputs still produces CONTAINMENT', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('Derived TIER_HIGH from safety_mode in safetyResult → CONTAINMENT', () => {
    const safetyResult = { safety_mode: true };
    const ms = extractMessageSignals('I am fine today actually.');
    const tier = scoreDistressTier(safetyResult, ms);
    expect(tier).toBe(DISTRESS_TIERS.TIER_HIGH);
    const result = determineTherapistStrategy(null, null, tier, ms);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('strategy state from CONTAINMENT has distress_tier TIER_HIGH', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.distress_tier).toBe(DISTRESS_TIERS.TIER_HIGH);
  });
});

// ─── Section 7 — First-session / empty continuity safe defaults ───────────────

describe('Wave 2A — First-session / empty continuity safe defaults', () => {
  it('null continuity + null formulation + TIER_LOW → PSYCHOEDUCATION', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(result.continuity_present).toBe(false);
    expect(result.formulation_present).toBe(false);
  });

  it('empty records array + null formulation → PSYCHOEDUCATION', () => {
    const result = determineTherapistStrategy({ records: [] }, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(result.continuity_present).toBe(false);
  });

  it('empty continuity object {} + null formulation → PSYCHOEDUCATION (no meaningful fields)', () => {
    // An empty object has no fields → no continuity context
    const result = determineTherapistStrategy({}, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('TIER_MODERATE on first session → STABILISATION (not psychoeducation)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MODERATE, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('first-session TIER_HIGH → CONTAINMENT (safety always wins)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });
});

// ─── Section 8 — Rich continuity behavior ────────────────────────────────────

describe('Wave 2A — Rich continuity behavior', () => {
  const richContinuity = {
    records: [
      { session_summary: 'Explored abandonment schema', core_patterns: ['avoidance'], follow_up_tasks: ['homework 1'] },
      { session_summary: 'Continued schema work', interventions_used: ['thought records'] },
    ],
  };

  it('rich continuity + no formulation + TIER_LOW → STRUCTURED_EXPLORATION', () => {
    const result = determineTherapistStrategy(richContinuity, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.continuity_present).toBe(true);
    expect(result.formulation_present).toBe(false);
  });

  it('rich continuity + formulation + TIER_LOW → FORMULATION_DEEPENING', () => {
    const result = determineTherapistStrategy(
      richContinuity,
      { working_hypotheses: 'Core abandonment schema' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.continuity_present).toBe(true);
    expect(result.formulation_present).toBe(true);
  });

  it('rich continuity + formulation + TIER_MODERATE → STABILISATION (not deepening)', () => {
    const result = determineTherapistStrategy(
      richContinuity,
      { working_hypotheses: 'Core abandonment schema' },
      DISTRESS_TIERS.TIER_MODERATE,
      null
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('rich continuity + formulation + TIER_HIGH → CONTAINMENT (safety wins)', () => {
    const result = determineTherapistStrategy(
      richContinuity,
      { working_hypotheses: 'Core abandonment schema' },
      DISTRESS_TIERS.TIER_HIGH,
      null
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });
});

// ─── Section 9 — Formulation present vs absent ────────────────────────────────

describe('Wave 2A — Formulation present vs absent', () => {
  it('formulation absent + no continuity → PSYCHOEDUCATION', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.formulation_present).toBe(false);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('formulation absent with continuity → STRUCTURED_EXPLORATION', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Session happened' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.formulation_present).toBe(false);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('formulation present (empty object) treated as absent', () => {
    const result = determineTherapistStrategy(null, {}, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.formulation_present).toBe(false);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('formulation present with single non-empty field → formulation_present=true', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior context' }] },
      { working_hypotheses: 'Some hypothesis text' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.formulation_present).toBe(true);
  });

  it('formulation with null values only → treated as absent', () => {
    const result = determineTherapistStrategy(
      null,
      { working_hypotheses: null, core_beliefs: null },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.formulation_present).toBe(false);
  });

  it('formulation present + no continuity + TIER_LOW → STRUCTURED_EXPLORATION (not deepening)', () => {
    const result = determineTherapistStrategy(
      null,
      { working_hypotheses: 'Perfectionism schema' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.formulation_present).toBe(true);
    expect(result.continuity_present).toBe(false);
  });
});

// ─── Section 10 — Ambiguous inputs → conservative default ─────────────────────

describe('Wave 2A — Ambiguous inputs → conservative defaults', () => {
  it('all null inputs → safe state (no throw, no containment unless tier forces it)', () => {
    expect(() => determineTherapistStrategy(null, null, null, null)).not.toThrow();
    const result = determineTherapistStrategy(null, null, null, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('invalid tier string → treated as TIER_LOW (conservative)', () => {
    const result = determineTherapistStrategy(null, null, 'INVALID_TIER', null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('non-object continuity (string) → treated as no continuity', () => {
    const result = determineTherapistStrategy('bad_value', null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.continuity_present).toBe(false);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('non-object formulation (number) → treated as no formulation', () => {
    const result = determineTherapistStrategy(null, 42, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.formulation_present).toBe(false);
  });

  it('non-object message signals → normalised to empty signals', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, 'bad_signals');
    expect(result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
  });

  it('deeply nested invalid tier → no throw, defaults to psychoeducation', () => {
    const result = determineTherapistStrategy(null, null, undefined, undefined);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });
});

// ─── Section 11 — No continuity + no formulation → safe middle mode ───────────

describe('Wave 2A — No continuity + no formulation → safe mode', () => {
  it('no continuity, no formulation, TIER_LOW → PSYCHOEDUCATION', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('no continuity, no formulation, TIER_MILD → PSYCHOEDUCATION', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MILD, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('no continuity, no formulation, TIER_MODERATE → STABILISATION (not psychoeducation)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MODERATE, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('state has fail_safe=false (it is a valid strategy state, not error state)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.fail_safe).toBe(false);
  });
});

// ─── Section 12 — buildStrategyContextSection output structure ────────────────

describe('Wave 2A — buildStrategyContextSection output structure', () => {
  it('returns a non-empty string', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(typeof section).toBe('string');
    expect(section.length).toBeGreaterThan(0);
  });

  it('includes the THERAPEUTIC STRATEGY header', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('THERAPEUTIC STRATEGY');
  });

  it('includes the strategy version', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain(STRATEGY_VERSION);
  });

  it('includes the intervention mode', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain(state.intervention_mode);
  });

  it('includes the distress tier', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain(state.distress_tier);
  });

  it('includes continuity presence indicator', () => {
    const stateNo = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const sectionNo = buildStrategyContextSection(stateNo);
    expect(sectionNo).toContain('no');

    const stateYes = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior' }] },
      { working_hypotheses: 'x' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    const sectionYes = buildStrategyContextSection(stateYes);
    expect(sectionYes).toContain('yes');
  });

  it('includes a guidance sentence', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Guidance:');
  });

  it('CONTAINMENT section contains grounding guidance', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('grounding');
  });

  it('PSYCHOEDUCATION section contains psychoeducation guidance', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('psychoeducation');
  });

  it('includes END THERAPEUTIC STRATEGY footer', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('END THERAPEUTIC STRATEGY');
  });

  it('null input → returns safe fallback string (no throw)', () => {
    expect(() => buildStrategyContextSection(null)).not.toThrow();
    const section = buildStrategyContextSection(null);
    expect(typeof section).toBe('string');
    expect(section.length).toBeGreaterThan(0);
  });

  it('undefined input → returns safe fallback string', () => {
    expect(() => buildStrategyContextSection(undefined)).not.toThrow();
    const section = buildStrategyContextSection(undefined);
    expect(typeof section).toBe('string');
    expect(section.length).toBeGreaterThan(0);
  });
});

// ─── Section 13 — TherapistStrategyState shape ────────────────────────────────

describe('Wave 2A — TherapistStrategyState shape', () => {
  it('result has strategy_version matching STRATEGY_VERSION', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.strategy_version).toBe(STRATEGY_VERSION);
  });

  it('result has all required fields', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(typeof result.strategy_version).toBe('string');
    expect(typeof result.intervention_mode).toBe('string');
    expect(typeof result.distress_tier).toBe('string');
    expect(typeof result.continuity_present).toBe('boolean');
    expect(typeof result.formulation_present).toBe('boolean');
    expect(typeof result.message_signals).toBe('object');
    expect(typeof result.rationale).toBe('string');
    expect(typeof result.fail_safe).toBe('boolean');
  });

  it('result is frozen (immutable)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('message_signals in result has all six signal keys', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe('boolean');
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe('boolean');
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_CATASTROPHIC_LANGUAGE]).toBe('boolean');
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]).toBe('boolean');
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]).toBe('boolean');
    expect(typeof result.message_signals[MESSAGE_SIGNAL_KEYS.IS_EMPTY_OR_SHORT]).toBe('boolean');
  });

  it('fail_safe is false for normally-determined states', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.fail_safe).toBe(false);
  });
});

// ─── Section 14 — Deterministic repeatability ─────────────────────────────────

describe('Wave 2A — Deterministic repeatability', () => {
  it('same input always produces same intervention_mode (CONTAINMENT)', () => {
    const inputs = [null, null, DISTRESS_TIERS.TIER_HIGH, null];
    const r1 = determineTherapistStrategy(...inputs);
    const r2 = determineTherapistStrategy(...inputs);
    const r3 = determineTherapistStrategy(...inputs);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r2.intervention_mode).toBe(r3.intervention_mode);
  });

  it('same input always produces same intervention_mode (FORMULATION_DEEPENING)', () => {
    const continuity = { records: [{ session_summary: 'Explored schemas' }] };
    const formulation = { working_hypotheses: 'Core belief present' };
    const r1 = determineTherapistStrategy(continuity, formulation, DISTRESS_TIERS.TIER_LOW, null);
    const r2 = determineTherapistStrategy(continuity, formulation, DISTRESS_TIERS.TIER_LOW, null);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r1.rationale).toBe(r2.rationale);
  });

  it('same message text always produces same signals', () => {
    const text = 'I am feeling completely broken and falling apart right now.';
    const s1 = extractMessageSignals(text);
    const s2 = extractMessageSignals(text);
    expect(s1[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]).toBe(s2[MESSAGE_SIGNAL_KEYS.HAS_SHUTDOWN_LANGUAGE]);
    expect(s1[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(s2[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]);
  });

  it('same safetyResult + signals always produces same distress tier', () => {
    const sr = { triggers: ['crisis_signal'] };
    const ms = extractMessageSignals('Normal message.');
    const t1 = scoreDistressTier(sr, ms);
    const t2 = scoreDistressTier(sr, ms);
    const t3 = scoreDistressTier(sr, ms);
    expect(t1).toBe(t2);
    expect(t2).toBe(t3);
  });

  it('buildStrategyContextSection is deterministic for same input', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior context' }] },
      { working_hypotheses: 'Some hypothesis' },
      DISTRESS_TIERS.TIER_LOW,
      null
    );
    const s1 = buildStrategyContextSection(state);
    const s2 = buildStrategyContextSection(state);
    expect(s1).toBe(s2);
  });
});

// ─── Section 15 — Full pipeline integration (end-to-end deterministic) ────────

describe('Wave 2A — Full pipeline: extract → score → determine → build (no throw)', () => {
  it('crisis message → CONTAINMENT end-to-end', () => {
    const messageText = 'I feel hopeless, nothing will ever get better and I cannot go on.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({ safety_mode: true }, ms);
    const state = determineTherapistStrategy(null, null, tier, ms);
    const section = buildStrategyContextSection(state);

    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(section).toContain('containment');
    expect(section).toContain('Guidance:');
  });

  it('first session neutral message → PSYCHOEDUCATION end-to-end', () => {
    const messageText = 'Hi, I am here to start working on my anxiety with CBT.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const state = determineTherapistStrategy(null, null, tier, ms);
    const section = buildStrategyContextSection(state);

    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(section).toContain('psychoeducation');
  });

  it('rich-context sad message → STABILISATION end-to-end (moderate distress)', () => {
    const messageText = 'I am so overwhelmed with everything, I cannot even think straight.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const richContinuity = { records: [{ session_summary: 'Prior session' }] };
    const richFormulation = { working_hypotheses: 'Schema' };
    const state = determineTherapistStrategy(richContinuity, richFormulation, tier, ms);
    const section = buildStrategyContextSection(state);

    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(section).toContain('stabilisation');
  });

  it('returning client with formulation, mild emotion → FORMULATION_DEEPENING end-to-end', () => {
    const messageText = 'I have been feeling a bit worried about my progress.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'Explored schemas' }] },
      { working_hypotheses: 'Perfectionism core belief' },
      tier,
      ms
    );
    const section = buildStrategyContextSection(state);

    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(section).toContain('formulation_deepening');
  });
});

// ─── Section 16 — Scaffold isolation check ────────────────────────────────────

describe('Wave 2A — Scaffold isolation: module has no runtime side effects', () => {
  it('can be imported without touching featureFlags or agentWiring', () => {
    // The fact that we can test this module independently confirms isolation.
    expect(typeof STRATEGY_VERSION).toBe('string');
    expect(typeof STRATEGY_INTERVENTION_MODES).toBe('object');
  });

  it('STRATEGY_VERSION follows semver major.minor.patch format', () => {
    expect(STRATEGY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('all intervention mode values are lowercase strings with no spaces', () => {
    for (const [, value] of Object.entries(STRATEGY_INTERVENTION_MODES)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(value.toLowerCase());
      expect(value).not.toContain(' ');
    }
  });

  it('all distress tier values are lowercase strings matching tier_ prefix', () => {
    for (const [, value] of Object.entries(DISTRESS_TIERS)) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^tier_/);
    }
  });
});
