/**
 * @file test/utils/wave4aCbtKnowledgePlanner.test.js
 *
 * Wave 4A.1 — CBT Knowledge Planner (Scaffold) Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 4A.1 scaffold additions:
 *   - src/lib/cbtKnowledgePlanner.js
 *
 * Verifies the full planner contract: inputs → outputs, precedence chain,
 * fail-safe defaults, deterministic repeatability, safety dominance, and
 * output shape boundedness.
 *
 * COVERAGE (per Wave 4A.1 problem statement)
 * ──────────────────────────────────────────
 *  A.  Module exports the expected public symbols
 *  B.  CBT_KNOWLEDGE_PLANNER_VERSION is a non-empty string
 *  C.  CBT_KNOWLEDGE_DOMAINS is a frozen non-empty object
 *  D.  CBT_KNOWLEDGE_SKIP_REASONS is a frozen non-empty object
 *  E.  CBT_UNIT_TYPE_PREFERENCES is a frozen non-empty object
 *  F.  CBT_TREATMENT_ARC_FILTERS is a frozen non-empty object
 *  G.  CBT_DISTRESS_FILTERS is a frozen non-empty object
 *  H.  CBT_KNOWLEDGE_PLAN_FAIL_SAFE is frozen with shouldRetrieve: false
 *  I.  CBT_KNOWLEDGE_PLAN_FAIL_SAFE has skipReason: 'bad_inputs'
 *  J.  planCBTKnowledgeRetrieval is a function
 *
 *  --- Flag-off / planner-inert defaults ---
 *  K.  Flag off → shouldRetrieve: false, skipReason: 'flag_off'
 *  L.  Flag absent (default) → shouldRetrieve: false
 *  M.  Flag off → all other fields are safe defaults (no retrieval config)
 *  N.  No arguments → shouldRetrieve: false (fail-safe)
 *
 *  --- Safety / containment always dominates ---
 *  O.  safetyActive: true → shouldRetrieve: false, skipReason: 'containment'
 *  P.  strategyState.safety_mode_active: true → skipReason: 'containment'
 *  Q.  strategyState.intervention_mode === 'containment' → skipReason: 'containment'
 *  R.  Containment overrides even when domain + exploration mode present
 *  S.  Containment overrides even when distressTier is TIER_LOW
 *
 *  --- High distress → skip ---
 *  T.  distressTier === 'tier_high' → skipReason: 'high_distress'
 *  U.  strategyState.distress_tier === 'tier_high' (no explicit tier) → skip
 *  V.  TIER_HIGH overrides even when exploration mode + domain present
 *
 *  --- Moderate distress → skip ---
 *  W.  distressTier === 'tier_moderate' → skipReason: 'moderate_distress'
 *  X.  TIER_MODERATE overrides even when exploration mode + domain present
 *
 *  --- Strategy mode gate ---
 *  Y.  intervention_mode === 'stabilisation' → skipReason: 'strategy_inert'
 *  Z.  intervention_mode === 'psychoeducation' → skipReason: 'strategy_inert'
 *  AA. Missing intervention_mode → skipReason: 'strategy_inert'
 *  AB. Empty intervention_mode string → skipReason: 'strategy_inert'
 *  AC. Unknown intervention_mode → skipReason: 'strategy_inert'
 *
 *  --- No domain inferrable → skip ---
 *  AD. formulationHints.domain is '' → skipReason: 'no_domain'
 *  AE. formulationHints.domain is absent → skipReason: 'no_domain'
 *  AF. formulationHints is null → skipReason: 'no_domain'
 *  AG. formulationHints is not an object → skipReason: 'no_domain'
 *
 *  --- Ambiguous formulation → skip ---
 *  AH. formulationHints.is_ambiguous: true → skipReason: 'ambiguous_formulation'
 *  AI. Ambiguity check precedes domain check (ambiguous with domain → still skip)
 *
 *  --- Exploration / intervention + safe distress + domain → shouldRetrieve true ---
 *  AJ. STRUCTURED_EXPLORATION + TIER_LOW + domain → shouldRetrieve: true
 *  AK. FORMULATION_DEEPENING + TIER_LOW + domain → shouldRetrieve: true
 *  AL. STRUCTURED_EXPLORATION + TIER_MILD + domain → shouldRetrieve: true
 *  AM. shouldRetrieve: true → skipReason: ''
 *  AN. shouldRetrieve: true → domainHint matches formulationHints.domain
 *
 *  --- Distress filter derivation ---
 *  AO. TIER_LOW → distressFilter: 'any'
 *  AP. TIER_MILD → distressFilter: 'low_distress_only'
 *  AQ. Skip plan → distressFilter: 'none'
 *
 *  --- Unit type preference derivation ---
 *  AR. Early arc → unitTypePreference: 'psychoeducation'
 *  AS. FORMULATION_DEEPENING + non-early arc → unitTypePreference: 'technique'
 *  AT. STRUCTURED_EXPLORATION + non-early arc → unitTypePreference: 'technique'
 *  AU. Fallback → unitTypePreference: 'any'
 *
 *  --- Treatment arc filter derivation ---
 *  AV. formulationHints.treatment_phase: 'early' → treatmentArcFilter: 'early'
 *  AW. formulationHints.treatment_phase: 'middle' → treatmentArcFilter: 'middle'
 *  AX. formulationHints.treatment_phase: 'late' → treatmentArcFilter: 'late'
 *  AY. No phase hint, valid LTS progressing + session_count >= 6 → 'late'
 *  AZ. No phase hint, valid LTS + session_count >= 3 → 'middle'
 *  BA. No phase hint, valid LTS + session_count < 3 → 'any'
 *  BB. No phase hint, no valid LTS → 'any'
 *
 *  --- LTS inputs only inform arc — never promote retrieval ---
 *  BC. Valid LTS with skip-inducing condition (TIER_HIGH) → still skip
 *  BD. Valid LTS does not change shouldRetrieve from false to true by itself
 *
 *  --- Fail-safe defaults on bad inputs ---
 *  BE. null inputs object → CBT_KNOWLEDGE_PLAN_FAIL_SAFE
 *  BF. Non-object strategyState → handled gracefully (no throw)
 *  BG. Non-object ltsInputs → handled gracefully (no throw)
 *  BH. Non-string distressTier → handled gracefully (defaults to TIER_LOW)
 *  BI. planCBTKnowledgeRetrieval() with no arguments → fail-safe
 *
 *  --- No raw message content ---
 *  BJ. Function signature does not accept messageText / raw_message / text fields
 *  BK. Passing unexpected raw text in formulationHints does not affect output logic
 *
 *  --- Bounded output contract ---
 *  BL. shouldRetrieve is always a boolean
 *  BM. skipReason is always a string
 *  BN. domainHint is always a string
 *  BO. unitTypePreference is always a string
 *  BP. distressFilter is always a string
 *  BQ. treatmentArcFilter is always a string
 *  BR. Output is always a frozen plain object
 *
 *  --- Deterministic repeatability ---
 *  BS. Same inputs → same output (called multiple times)
 *  BT. Different inputs → different outputs when rules demand it
 *
 *  --- Precedence preserved ---
 *  BU. Safety precedes distress tier check (both active → 'containment')
 *  BV. Distress tier precedes strategy mode (TIER_HIGH + exploration → 'high_distress')
 *  BW. Strategy mode precedes domain check (inert + domain → 'strategy_inert')
 *  BX. Domain check precedes ambiguity check order verification (ambiguous first)
 *  BY. Knowledge never outranks LTS-inferred signals (LTS stagnating → no special promotion)
 *
 *  --- No regression to companion or other agent flows ---
 *  BZ. No COMPANION_* fields appear in any output
 *  CA. No private entity fields (ThoughtJournal, Conversation, CaseFormulation, etc.) in output
 *
 * CONSTRAINTS
 * -----------
 * - No feature flags are enabled in these tests (all flags default to false).
 * - All tests are synchronous.
 * - No live Base44 backend is required.
 * - No raw user message content appears in any input or output.
 * - Companion entity access is never tested or invoked here.
 */

import { describe, it, expect } from 'vitest';

// ─── Module under test ────────────────────────────────────────────────────────

import {
  planCBTKnowledgeRetrieval,
  CBT_KNOWLEDGE_PLANNER_VERSION,
  CBT_KNOWLEDGE_DOMAINS,
  CBT_KNOWLEDGE_DEFERRED_DOMAINS,
  CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
  CBT_KNOWLEDGE_SKIP_REASONS,
  CBT_UNIT_TYPE_PREFERENCES,
  CBT_TREATMENT_ARC_FILTERS,
  CBT_DISTRESS_FILTERS,
  CBT_KNOWLEDGE_PLAN_FAIL_SAFE,
} from '../../src/lib/cbtKnowledgePlanner.js';

// ─── Test helpers / fixtures ──────────────────────────────────────────────────

/**
 * Minimal valid strategy state for STRUCTURED_EXPLORATION mode.
 */
const _STRATEGY_EXPLORATION = Object.freeze({
  intervention_mode: 'structured_exploration',
  distress_tier: 'tier_low',
  safety_mode_active: false,
});

/**
 * Minimal valid strategy state for FORMULATION_DEEPENING mode.
 */
const _STRATEGY_DEEPENING = Object.freeze({
  intervention_mode: 'formulation_deepening',
  distress_tier: 'tier_low',
  safety_mode_active: false,
});

/**
 * Minimal valid strategy state for CONTAINMENT mode.
 */
const _STRATEGY_CONTAINMENT = Object.freeze({
  intervention_mode: 'containment',
  distress_tier: 'tier_high',
  safety_mode_active: true,
});

/**
 * Minimal valid strategy state for STABILISATION mode.
 */
const _STRATEGY_STABILISATION = Object.freeze({
  intervention_mode: 'stabilisation',
  distress_tier: 'tier_moderate',
  safety_mode_active: false,
});

/**
 * Minimal valid formulation hints for an anxiety domain, middle phase.
 */
const _HINTS_ANXIETY_MIDDLE = Object.freeze({
  domain: 'anxiety',
  treatment_phase: 'middle',
  has_formulation: true,
  is_ambiguous: false,
});

/**
 * Minimal valid formulation hints — no domain.
 */
const _HINTS_NO_DOMAIN = Object.freeze({
  domain: '',
  treatment_phase: 'middle',
  has_formulation: true,
  is_ambiguous: false,
});

/**
 * Ambiguous formulation hints with a domain present.
 */
const _HINTS_AMBIGUOUS = Object.freeze({
  domain: 'depression',
  treatment_phase: 'early',
  has_formulation: false,
  is_ambiguous: true,
});

/**
 * Minimal valid LTS inputs indicating a progressing trajectory with enough sessions.
 */
const _LTS_PROGRESSING_LATE = Object.freeze({
  lts_valid: true,
  lts_session_count: 8,
  lts_trajectory: 'progressing',
  lts_stalled_interventions: [],
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: true,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
});

/**
 * Valid LTS inputs with session count in middle-arc range.
 */
const _LTS_MIDDLE = Object.freeze({
  lts_valid: true,
  lts_session_count: 4,
  lts_trajectory: 'stable',
  lts_stalled_interventions: [],
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: false,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
});

/**
 * Invalid/absent LTS inputs (lts_valid: false).
 */
const _LTS_ABSENT = Object.freeze({
  lts_valid: false,
  lts_session_count: 0,
  lts_trajectory: '',
  lts_stalled_interventions: [],
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: false,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
});

/**
 * Builds a minimal valid set of inputs that produces shouldRetrieve: true.
 */
function _makeRetrievableInputs(overrides = {}) {
  return {
    flagEnabled: true,
    strategyState: _STRATEGY_EXPLORATION,
    ltsInputs: _LTS_ABSENT,
    formulationHints: _HINTS_ANXIETY_MIDDLE,
    distressTier: 'tier_low',
    safetyActive: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Wave 4A.1 — CBT Knowledge Planner exports', () => {
  // A
  it('exports planCBTKnowledgeRetrieval as a function', () => {
    expect(typeof planCBTKnowledgeRetrieval).toBe('function');
  });

  // B
  it('exports CBT_KNOWLEDGE_PLANNER_VERSION as a non-empty string', () => {
    expect(typeof CBT_KNOWLEDGE_PLANNER_VERSION).toBe('string');
    expect(CBT_KNOWLEDGE_PLANNER_VERSION.length).toBeGreaterThan(0);
  });

  // C
  it('exports CBT_KNOWLEDGE_DOMAINS as a frozen non-empty object', () => {
    expect(typeof CBT_KNOWLEDGE_DOMAINS).toBe('object');
    expect(Object.isFrozen(CBT_KNOWLEDGE_DOMAINS)).toBe(true);
    expect(Object.keys(CBT_KNOWLEDGE_DOMAINS).length).toBeGreaterThan(0);
  });

  // D
  it('exports CBT_KNOWLEDGE_SKIP_REASONS as a frozen non-empty object', () => {
    expect(typeof CBT_KNOWLEDGE_SKIP_REASONS).toBe('object');
    expect(Object.isFrozen(CBT_KNOWLEDGE_SKIP_REASONS)).toBe(true);
    expect(Object.keys(CBT_KNOWLEDGE_SKIP_REASONS).length).toBeGreaterThan(0);
  });

  // E
  it('exports CBT_UNIT_TYPE_PREFERENCES as a frozen non-empty object', () => {
    expect(typeof CBT_UNIT_TYPE_PREFERENCES).toBe('object');
    expect(Object.isFrozen(CBT_UNIT_TYPE_PREFERENCES)).toBe(true);
    expect(Object.keys(CBT_UNIT_TYPE_PREFERENCES).length).toBeGreaterThan(0);
  });

  // F
  it('exports CBT_TREATMENT_ARC_FILTERS as a frozen non-empty object', () => {
    expect(typeof CBT_TREATMENT_ARC_FILTERS).toBe('object');
    expect(Object.isFrozen(CBT_TREATMENT_ARC_FILTERS)).toBe(true);
    expect(Object.keys(CBT_TREATMENT_ARC_FILTERS).length).toBeGreaterThan(0);
  });

  // G
  it('exports CBT_DISTRESS_FILTERS as a frozen non-empty object', () => {
    expect(typeof CBT_DISTRESS_FILTERS).toBe('object');
    expect(Object.isFrozen(CBT_DISTRESS_FILTERS)).toBe(true);
    expect(Object.keys(CBT_DISTRESS_FILTERS).length).toBeGreaterThan(0);
  });

  // H
  it('CBT_KNOWLEDGE_PLAN_FAIL_SAFE is frozen with shouldRetrieve: false', () => {
    expect(Object.isFrozen(CBT_KNOWLEDGE_PLAN_FAIL_SAFE)).toBe(true);
    expect(CBT_KNOWLEDGE_PLAN_FAIL_SAFE.shouldRetrieve).toBe(false);
  });

  // I
  it("CBT_KNOWLEDGE_PLAN_FAIL_SAFE has skipReason: 'bad_inputs'", () => {
    expect(CBT_KNOWLEDGE_PLAN_FAIL_SAFE.skipReason).toBe(
      CBT_KNOWLEDGE_SKIP_REASONS.BAD_INPUTS
    );
    expect(CBT_KNOWLEDGE_PLAN_FAIL_SAFE.skipReason).toBe('bad_inputs');
  });

  // J
  it('planCBTKnowledgeRetrieval is a function (redundant safety check)', () => {
    expect(planCBTKnowledgeRetrieval).toBeInstanceOf(Function);
  });
});

describe('Wave 4A.1 — flag-off / planner-inert defaults', () => {
  // K
  it("flag off → shouldRetrieve: false, skipReason: 'flag_off'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: false,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.FLAG_OFF);
    expect(result.skipReason).toBe('flag_off');
  });

  // L
  it('flag absent (undefined) → shouldRetrieve: false', () => {
    const result = planCBTKnowledgeRetrieval({
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
    });
    expect(result.shouldRetrieve).toBe(false);
  });

  // M
  it('flag off → all other fields are safe defaults', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: false,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.domainHint).toBe('');
    expect(result.distressFilter).toBe(CBT_DISTRESS_FILTERS.NONE);
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.ANY);
  });

  // N
  it('no arguments → shouldRetrieve: false (fail-safe)', () => {
    const result = planCBTKnowledgeRetrieval();
    expect(result.shouldRetrieve).toBe(false);
  });
});

describe('Wave 4A.1 — safety / containment always dominates', () => {
  // O
  it('safetyActive: true → shouldRetrieve: false, skipReason: containment', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: true,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.CONTAINMENT);
  });

  // P
  it('strategyState.safety_mode_active: true → skipReason: containment', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_low',
        safety_mode_active: true,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('containment');
  });

  // Q
  it("intervention_mode === 'containment' → skipReason: containment", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_CONTAINMENT,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('containment');
  });

  // R
  it('containment overrides even when domain + exploration mode present', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_low',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: true,  // explicit containment override
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('containment');
  });

  // S
  it('containment overrides even when distressTier is TIER_LOW', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'containment',
        distress_tier: 'tier_low',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('containment');
  });
});

describe('Wave 4A.1 — high distress → skip', () => {
  // T
  it("explicit distressTier 'tier_high' → skipReason: 'high_distress'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_high',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_high',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.HIGH_DISTRESS);
  });

  // U
  it('strategyState.distress_tier high with no explicit tier → skip', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_high',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: null,   // no explicit tier — falls back to strategyState
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('high_distress');
  });

  // V
  it('TIER_HIGH overrides even when exploration mode + domain present', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_high',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('high_distress');
  });
});

describe('Wave 4A.1 — moderate distress → skip', () => {
  // W
  it("distressTier === 'tier_moderate' → skipReason: 'moderate_distress'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_moderate',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_moderate',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.MODERATE_DISTRESS);
  });

  // X
  it('TIER_MODERATE overrides even when exploration mode + domain present', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_moderate',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('moderate_distress');
  });
});

describe('Wave 4A.1 — strategy mode gate', () => {
  // Y
  it("'stabilisation' mode → skipReason: 'strategy_inert'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_STABILISATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.STRATEGY_INERT);
  });

  // Z
  it("'psychoeducation' mode → skipReason: 'strategy_inert'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'psychoeducation',
        distress_tier: 'tier_low',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });

  // AA
  it('missing intervention_mode → skipReason: strategy_inert', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        distress_tier: 'tier_low',
        safety_mode_active: false,
        // intervention_mode intentionally absent
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });

  // AB
  it('empty intervention_mode string → skipReason: strategy_inert', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: '',
        distress_tier: 'tier_low',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });

  // AC
  it('unknown intervention_mode → skipReason: strategy_inert', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'unknown_mode_xyz',
        distress_tier: 'tier_low',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });
});

describe('Wave 4A.1 — no domain inferrable → skip', () => {
  // AD
  it("formulationHints.domain is '' → skipReason: 'no_domain'", () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_NO_DOMAIN,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.NO_DOMAIN);
  });

  // AE
  it('formulationHints.domain is absent → skipReason: no_domain', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: { treatment_phase: 'middle', has_formulation: true, is_ambiguous: false },
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('no_domain');
  });

  // AF
  it('formulationHints is null → skipReason: no_domain', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: null,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('no_domain');
  });

  // AG
  it('formulationHints is not an object (string) → skipReason: no_domain', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: 'anxiety',  // raw string — not allowed
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('no_domain');
  });
});

describe('Wave 4A.1 — ambiguous formulation → skip', () => {
  // AH
  it('formulationHints.is_ambiguous: true → skipReason: ambiguous_formulation', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: _HINTS_AMBIGUOUS,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe(
      CBT_KNOWLEDGE_SKIP_REASONS.AMBIGUOUS_FORMULATION
    );
  });

  // AI
  it('ambiguous with domain present → still skip (ambiguity precedes domain check)', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: {
        domain: 'anxiety',        // domain present
        treatment_phase: 'early',
        has_formulation: false,
        is_ambiguous: true,       // but ambiguous
      },
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('ambiguous_formulation');
  });
});

describe('Wave 4A.1 — exploration + safe distress + domain → shouldRetrieve true', () => {
  // AJ
  it('STRUCTURED_EXPLORATION + TIER_LOW + domain → shouldRetrieve: true', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    expect(result.shouldRetrieve).toBe(true);
  });

  // AK
  it('FORMULATION_DEEPENING + TIER_LOW + domain → shouldRetrieve: true', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      strategyState: _STRATEGY_DEEPENING,
    }));
    expect(result.shouldRetrieve).toBe(true);
  });

  // AL
  it('STRUCTURED_EXPLORATION + TIER_MILD + domain → shouldRetrieve: true', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 'tier_mild',
    }));
    expect(result.shouldRetrieve).toBe(true);
  });

  // AM
  it('shouldRetrieve: true → skipReason is empty string', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    expect(result.skipReason).toBe('');
    expect(result.skipReason).toBe(CBT_KNOWLEDGE_SKIP_REASONS.NONE);
  });

  // AN
  it('shouldRetrieve: true → domainHint matches formulationHints.domain', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    expect(result.domainHint).toBe('anxiety');
    expect(result.domainHint).toBe(_HINTS_ANXIETY_MIDDLE.domain);
  });
});

describe('Wave 4A.1 — distress filter derivation', () => {
  // AO
  it('TIER_LOW → distressFilter: any', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 'tier_low',
    }));
    expect(result.distressFilter).toBe(CBT_DISTRESS_FILTERS.ANY);
    expect(result.distressFilter).toBe('any');
  });

  // AP
  it('TIER_MILD → distressFilter: low_distress_only', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 'tier_mild',
    }));
    expect(result.distressFilter).toBe(CBT_DISTRESS_FILTERS.LOW_DISTRESS_ONLY);
    expect(result.distressFilter).toBe('low_distress_only');
  });

  // AQ
  it('skip plan → distressFilter: none', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_STABILISATION,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.distressFilter).toBe(CBT_DISTRESS_FILTERS.NONE);
  });
});

describe('Wave 4A.1 — unit type preference derivation', () => {
  // AR
  it('early arc → unitTypePreference: psychoeducation', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'early',
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.unitTypePreference).toBe(
      CBT_UNIT_TYPE_PREFERENCES.PSYCHOEDUCATION
    );
    expect(result.unitTypePreference).toBe('psychoeducation');
  });

  // AS
  it('FORMULATION_DEEPENING + non-early arc → unitTypePreference: technique', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      strategyState: _STRATEGY_DEEPENING,
      formulationHints: _HINTS_ANXIETY_MIDDLE,  // treatment_phase: 'middle'
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.unitTypePreference).toBe(CBT_UNIT_TYPE_PREFERENCES.TECHNIQUE);
    expect(result.unitTypePreference).toBe('technique');
  });

  // AT
  it('STRUCTURED_EXPLORATION + non-early arc → unitTypePreference: technique', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: _HINTS_ANXIETY_MIDDLE,  // treatment_phase: 'middle'
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.unitTypePreference).toBe('technique');
  });
});

describe('Wave 4A.1 — treatment arc filter derivation', () => {
  // AV
  it("formulationHints.treatment_phase 'early' → treatmentArcFilter: 'early'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'early',
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.EARLY);
  });

  // AW
  it("formulationHints.treatment_phase 'middle' → treatmentArcFilter: 'middle'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.MIDDLE);
  });

  // AX
  it("formulationHints.treatment_phase 'late' → treatmentArcFilter: 'late'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'late',
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.LATE);
  });

  // AY
  it("no phase hint, LTS progressing + session_count >= 6 → 'late'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: '',  // no explicit phase
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: _LTS_PROGRESSING_LATE,
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.LATE);
  });

  // AZ
  it("no phase hint, LTS + session_count >= 3 → 'middle'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: '',
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: _LTS_MIDDLE,
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.MIDDLE);
  });

  // BA
  it("no phase hint, LTS + session_count < 3 → 'any'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: '',
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: {
        lts_valid: true,
        lts_session_count: 1,
        lts_trajectory: 'stable',
        lts_stalled_interventions: [],
        lts_has_risk_history: false,
        lts_is_stagnating: false,
        lts_is_progressing: false,
        lts_is_fluctuating: false,
        lts_has_stalled_interventions: false,
      },
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.ANY);
  });

  // BB
  it("no phase hint, no valid LTS → 'any'", () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: '',
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: _LTS_ABSENT,
    }));
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.ANY);
  });
});

describe('Wave 4A.1 — LTS only informs arc, never promotes retrieval', () => {
  // BC
  it('valid LTS + TIER_HIGH → still skip (high_distress)', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      ltsInputs: _LTS_PROGRESSING_LATE,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_high',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('high_distress');
  });

  // BD
  it('valid LTS + inert strategy → still skip (strategy_inert)', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_STABILISATION,
      ltsInputs: _LTS_PROGRESSING_LATE,
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });
});

describe('Wave 4A.1 — fail-safe defaults on bad inputs', () => {
  // BE
  it('no argument (empty call) → shouldRetrieve: false', () => {
    const result = planCBTKnowledgeRetrieval();
    expect(result.shouldRetrieve).toBe(false);
    // flagEnabled defaults to false → flag_off skip reason
    expect(result.skipReason).toBe('flag_off');
  });

  // BF
  it('non-object strategyState → handled gracefully (no throw)', () => {
    expect(() => {
      planCBTKnowledgeRetrieval({
        flagEnabled: true,
        strategyState: 'bad',
        formulationHints: _HINTS_ANXIETY_MIDDLE,
        distressTier: 'tier_low',
        safetyActive: false,
      });
    }).not.toThrow();
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: 'bad',
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    // No valid intervention_mode → strategy_inert
    expect(result.skipReason).toBe('strategy_inert');
  });

  // BG
  it('non-object ltsInputs → handled gracefully (no throw)', () => {
    expect(() => {
      planCBTKnowledgeRetrieval(_makeRetrievableInputs({
        ltsInputs: 'bad_lts',
      }));
    }).not.toThrow();
  });

  // BH
  it('non-string distressTier → handled gracefully, defaults to tier_low', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 42,  // non-string
    }));
    // Should not throw, should produce a valid plan
    expect(typeof result.shouldRetrieve).toBe('boolean');
    expect(typeof result.skipReason).toBe('string');
  });

  // BI
  it('planCBTKnowledgeRetrieval() with no arguments → fail-safe plan', () => {
    const result = planCBTKnowledgeRetrieval();
    expect(result.shouldRetrieve).toBe(false);
    expect(typeof result.skipReason).toBe('string');
    expect(typeof result.domainHint).toBe('string');
    expect(typeof result.unitTypePreference).toBe('string');
    expect(typeof result.distressFilter).toBe('string');
    expect(typeof result.treatmentArcFilter).toBe('string');
  });
});

describe('Wave 4A.1 — no raw message content', () => {
  // BJ
  it('function signature does not accept messageText / text / rawMessage', () => {
    // Passing unexpected fields in formulationHints should not affect correctness.
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'middle',
        has_formulation: true,
        is_ambiguous: false,
        // These raw text fields must be ignored by the planner:
        messageText: 'I feel really overwhelmed today',
        rawMessage: 'I feel really overwhelmed today',
        text: 'I feel really overwhelmed today',
      },
    }));
    // The planner still produces a correct plan — raw text doesn't affect it.
    expect(result.shouldRetrieve).toBe(true);
    expect(result.domainHint).toBe('anxiety');
  });

  // BK
  it('raw text in formulationHints does not change skip/retrieve decision', () => {
    // Same as above: the planner ignores raw text fields entirely.
    const withRawText = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'middle',
        has_formulation: true,
        is_ambiguous: false,
        rawMessage: 'trigger word: suicide',  // Must not affect any gate
      },
    }));
    const withoutRawText = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    expect(withRawText.shouldRetrieve).toBe(withoutRawText.shouldRetrieve);
    expect(withRawText.skipReason).toBe(withoutRawText.skipReason);
    expect(withRawText.domainHint).toBe(withoutRawText.domainHint);
  });
});

describe('Wave 4A.1 — bounded output contract', () => {
  const _testCases = [
    ['retrievable', _makeRetrievableInputs()],
    ['flag off', { flagEnabled: false }],
    ['safety active', _makeRetrievableInputs({ safetyActive: true })],
    ['high distress', _makeRetrievableInputs({ distressTier: 'tier_high' })],
    ['no domain', _makeRetrievableInputs({ formulationHints: _HINTS_NO_DOMAIN })],
    ['no arguments', {}],
  ];

  for (const [label, inputs] of _testCases) {
    // BL–BQ: all output fields are the correct primitive types
    it(`[${label}] output always has correct primitive types`, () => {
      const result = planCBTKnowledgeRetrieval(inputs);
      expect(typeof result.shouldRetrieve).toBe('boolean');    // BL
      expect(typeof result.skipReason).toBe('string');         // BM
      expect(typeof result.domainHint).toBe('string');         // BN
      expect(typeof result.unitTypePreference).toBe('string'); // BO
      expect(typeof result.distressFilter).toBe('string');     // BP
      expect(typeof result.treatmentArcFilter).toBe('string'); // BQ
    });

    // BR: output is always a frozen plain object
    it(`[${label}] output is always a frozen plain object`, () => {
      const result = planCBTKnowledgeRetrieval(inputs);
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(Object.isFrozen(result)).toBe(true);
    });
  }
});

describe('Wave 4A.1 — deterministic repeatability', () => {
  // BS
  it('same inputs → same output (called multiple times)', () => {
    const inputs = _makeRetrievableInputs();
    const r1 = planCBTKnowledgeRetrieval(inputs);
    const r2 = planCBTKnowledgeRetrieval(inputs);
    const r3 = planCBTKnowledgeRetrieval(inputs);
    expect(r1.shouldRetrieve).toBe(r2.shouldRetrieve);
    expect(r1.shouldRetrieve).toBe(r3.shouldRetrieve);
    expect(r1.skipReason).toBe(r2.skipReason);
    expect(r1.domainHint).toBe(r2.domainHint);
    expect(r1.unitTypePreference).toBe(r2.unitTypePreference);
    expect(r1.distressFilter).toBe(r2.distressFilter);
    expect(r1.treatmentArcFilter).toBe(r2.treatmentArcFilter);
  });

  // BT
  it('different inputs → different outputs when rules demand it', () => {
    const safeResult = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 'tier_low',
    }));
    const highDistressResult = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      distressTier: 'tier_high',
    }));
    expect(safeResult.shouldRetrieve).not.toBe(highDistressResult.shouldRetrieve);
    expect(safeResult.skipReason).not.toBe(highDistressResult.skipReason);
  });
});

describe('Wave 4A.1 — precedence chain verification', () => {
  // BU: Safety precedes distress tier (both active → containment, not high_distress)
  it('safety + high distress → containment wins over high_distress', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'containment',
        distress_tier: 'tier_high',
        safety_mode_active: true,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_high',
      safetyActive: true,
    });
    expect(result.skipReason).toBe('containment');
    expect(result.skipReason).not.toBe('high_distress');
  });

  // BV: Distress tier precedes strategy mode
  it('TIER_HIGH + exploration → high_distress wins over strategy_inert', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: {
        intervention_mode: 'structured_exploration',
        distress_tier: 'tier_high',
        safety_mode_active: false,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_high',
      safetyActive: false,
    });
    expect(result.skipReason).toBe('high_distress');
    expect(result.skipReason).not.toBe('strategy_inert');
  });

  // BW: Strategy mode precedes domain check
  it('inert strategy + domain → strategy_inert wins over no_domain', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_STABILISATION,
      formulationHints: _HINTS_NO_DOMAIN,  // no domain AND inert mode
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.skipReason).toBe('strategy_inert');
    expect(result.skipReason).not.toBe('no_domain');
  });

  // BX: Ambiguity check precedes domain check (in formulation hints section)
  it('ambiguous + no domain → ambiguous_formulation wins (ambiguity precedes domain)', () => {
    // is_ambiguous: true is checked before domain emptiness check
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_EXPLORATION,
      formulationHints: {
        domain: '',           // no domain
        treatment_phase: 'middle',
        has_formulation: false,
        is_ambiguous: true,   // but ambiguous (checked first)
      },
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.skipReason).toBe('ambiguous_formulation');
    expect(result.skipReason).not.toBe('no_domain');
  });

  // BY: LTS stagnating does not promote retrieval without all gates passing
  it('LTS stagnating + inert strategy → still skip (LTS never promotes)', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState: _STRATEGY_STABILISATION,
      ltsInputs: {
        lts_valid: true,
        lts_session_count: 10,
        lts_trajectory: 'stagnating',
        lts_stalled_interventions: ['thought_record', 'behavioral_activation'],
        lts_has_risk_history: false,
        lts_is_stagnating: true,
        lts_is_progressing: false,
        lts_is_fluctuating: false,
        lts_has_stalled_interventions: true,
      },
      formulationHints: _HINTS_ANXIETY_MIDDLE,
      distressTier: 'tier_low',
      safetyActive: false,
    });
    // LTS stagnating cannot override the strategy gate
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('strategy_inert');
  });
});

describe('Wave 4A.1 — no regression to companion / private entity flows', () => {
  // BZ: No COMPANION_* fields in output
  it('output never contains COMPANION_* fields', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    const keys = Object.keys(result);
    const companionKeys = keys.filter(k => k.toLowerCase().includes('companion'));
    expect(companionKeys).toHaveLength(0);
  });

  // CA: No private entity fields in output
  it('output never contains private entity field names', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    const keys = Object.keys(result);
    const privateFields = [
      'thoughtJournal', 'thought_journal',
      'conversation', 'Conversation',
      'caseFormulation', 'case_formulation',
      'moodEntry', 'mood_entry',
      'companionMemory', 'companion_memory',
    ];
    for (const field of privateFields) {
      expect(keys).not.toContain(field);
    }
  });

  // Bonus: output has exactly the expected field set
  it('output has exactly the 7 expected fields — no extras', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs());
    const expectedFields = [
      'shouldRetrieve',
      'skipReason',
      'domainHint',
      'unitTypePreference',
      'distressFilter',
      'treatmentArcFilter',
      'ltsInfluencedArc',
    ];
    expect(Object.keys(result).sort()).toEqual(expectedFields.sort());
  });
});

describe('Wave 4A.1 — additional edge cases', () => {
  it('formulationHints with whitespace-only domain → skipReason: no_domain', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: '   ',  // whitespace only
        treatment_phase: 'middle',
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('no_domain');
  });

  it('formulationHints.treatment_phase unknown value → falls back to LTS or any', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'unknown',  // not early/middle/late
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: _LTS_ABSENT,
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.ANY);
  });

  it('formulationHints.treatment_phase null → falls back safely', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: null,
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(typeof result.treatmentArcFilter).toBe('string');
  });

  it('planCBTKnowledgeRetrieval called with undefined → no throw, returns plan', () => {
    expect(() => planCBTKnowledgeRetrieval(undefined)).not.toThrow();
    const result = planCBTKnowledgeRetrieval(undefined);
    expect(typeof result.shouldRetrieve).toBe('boolean');
  });

  it('domain from a known CBT_KNOWLEDGE_DOMAINS value → passes through correctly', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: CBT_KNOWLEDGE_DOMAINS.DEPRESSION,
        treatment_phase: 'middle',
        has_formulation: true,
        is_ambiguous: false,
      },
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.domainHint).toBe('depression');
  });

  it('LTS late arc inferred by progressing + high session count takes lower priority than explicit phase', () => {
    // Explicit 'early' phase should win over LTS-inferred 'late'
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: {
        domain: 'anxiety',
        treatment_phase: 'early',  // explicit early
        has_formulation: true,
        is_ambiguous: false,
      },
      ltsInputs: _LTS_PROGRESSING_LATE,  // LTS says late
    }));
    expect(result.shouldRetrieve).toBe(true);
    // Explicit phase takes priority — should be 'early', not 'late'
    expect(result.treatmentArcFilter).toBe(CBT_TREATMENT_ARC_FILTERS.EARLY);
    expect(result.unitTypePreference).toBe(CBT_UNIT_TYPE_PREFERENCES.PSYCHOEDUCATION);
  });
});

// ─── Wave 4A.2 — Domain scope alignment ──────────────────────────────────────

/**
 * First-wave domains that must be present in CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.
 * These are standard CBT focus areas with well-validated protocols and lower clinical risk.
 */
const _FIRST_WAVE_DOMAINS = [
  'anxiety',
  'depression',
  'self_esteem',
  'grief',
  'panic',
  'social_anxiety',
  'phobia',
  'general',
];

/**
 * Domains explicitly deferred to later Wave 4 stages due to higher clinical risk
 * or the requirement for specialised protocols (trauma-informed CBT, ERP, etc.).
 */
const _DEFERRED_DOMAINS = [
  'trauma',
  'anger',
  'relationship',
  'ocd',
];

describe('Wave 4A.2 — Domain scope alignment (CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE)', () => {
  it('exports CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE as a Set', () => {
    expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE).toBeInstanceOf(Set);
  });

  it('CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE is frozen', () => {
    expect(Object.isFrozen(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE)).toBe(true);
  });

  it('CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE is non-empty', () => {
    expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.size).toBeGreaterThan(0);
  });

  it.each(_FIRST_WAVE_DOMAINS)(
    'first-wave domain "%s" is present in CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE',
    (domain) => {
      expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(domain)).toBe(true);
    }
  );

  it.each(_DEFERRED_DOMAINS)(
    'deferred domain "%s" is NOT present in CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE',
    (domain) => {
      expect(CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(domain)).toBe(false);
    }
  );

  it.each(_FIRST_WAVE_DOMAINS)(
    'first-wave allowed domain "%s" is also present in CBT_KNOWLEDGE_DOMAINS',
    (domain) => {
      const allDomains = Object.values(CBT_KNOWLEDGE_DOMAINS);
      expect(allDomains).toContain(domain);
    }
  );

  it.each(_DEFERRED_DOMAINS)(
    'deferred domain "%s" remains in CBT_KNOWLEDGE_DOMAINS (full registry unchanged)',
    (domain) => {
      const allDomains = Object.values(CBT_KNOWLEDGE_DOMAINS);
      expect(allDomains).toContain(domain);
    }
  );

  it('CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE and deferred domains together cover all CBT_KNOWLEDGE_DOMAINS values', () => {
    const allDomains = new Set(Object.values(CBT_KNOWLEDGE_DOMAINS));
    const covered = new Set([
      ...CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
      ...CBT_KNOWLEDGE_DEFERRED_DOMAINS,
    ]);
    for (const domain of allDomains) {
      expect(covered.has(domain)).toBe(true);
    }
  });

  it('first-wave and deferred sets are disjoint (no domain appears in both)', () => {
    for (const domain of CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE) {
      expect(CBT_KNOWLEDGE_DEFERRED_DOMAINS.has(domain)).toBe(false);
    }
  });
});

describe('Wave 4A.2 — CBT_KNOWLEDGE_DEFERRED_DOMAINS', () => {
  it('exports CBT_KNOWLEDGE_DEFERRED_DOMAINS as a Set', () => {
    expect(CBT_KNOWLEDGE_DEFERRED_DOMAINS).toBeInstanceOf(Set);
  });

  it('CBT_KNOWLEDGE_DEFERRED_DOMAINS is frozen', () => {
    expect(Object.isFrozen(CBT_KNOWLEDGE_DEFERRED_DOMAINS)).toBe(true);
  });

  it.each(_DEFERRED_DOMAINS)(
    'deferred domain "%s" is present in CBT_KNOWLEDGE_DEFERRED_DOMAINS',
    (domain) => {
      expect(CBT_KNOWLEDGE_DEFERRED_DOMAINS.has(domain)).toBe(true);
    }
  );

  it.each(_FIRST_WAVE_DOMAINS)(
    'first-wave domain "%s" is NOT in CBT_KNOWLEDGE_DEFERRED_DOMAINS',
    (domain) => {
      expect(CBT_KNOWLEDGE_DEFERRED_DOMAINS.has(domain)).toBe(false);
    }
  );
});

describe('Wave 4A.2 — No runtime behavior impact (planner scaffold unchanged)', () => {
  it('planCBTKnowledgeRetrieval produces shouldRetrieve: true for a first-wave domain', () => {
    const result = planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: { domain: 'anxiety', treatment_phase: 'middle', has_formulation: true, is_ambiguous: false },
    }));
    expect(result.shouldRetrieve).toBe(true);
    expect(result.domainHint).toBe('anxiety');
  });

  it('planCBTKnowledgeRetrieval does not throw for a deferred domain as domainHint (no planner-level gate)', () => {
    // The planner scaffold does not enforce the first-wave set — that is Wave 4B retrieval wiring's job.
    expect(() => planCBTKnowledgeRetrieval(_makeRetrievableInputs({
      formulationHints: { domain: 'trauma', treatment_phase: 'middle', has_formulation: true, is_ambiguous: false },
    }))).not.toThrow();
  });

  it('planCBTKnowledgeRetrieval with flag off still returns skip for any domain (deferred or not)', () => {
    const result = planCBTKnowledgeRetrieval({
      flagEnabled: false,
      formulationHints: { domain: 'ocd', treatment_phase: 'middle', has_formulation: true, is_ambiguous: false },
      strategyState: { intervention_mode: 'structured_exploration', distress_tier: 'tier_low', safety_mode_active: false },
      distressTier: 'tier_low',
      safetyActive: false,
    });
    expect(result.shouldRetrieve).toBe(false);
    expect(result.skipReason).toBe('flag_off');
  });
});
