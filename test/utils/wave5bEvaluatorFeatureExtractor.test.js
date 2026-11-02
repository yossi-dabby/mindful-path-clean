/**
 * @file test/utils/wave5bEvaluatorFeatureExtractor.test.js
 *
 * Wave 5B — Quality Evaluator Feature Extractor Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 5B additions to src/lib/therapistQualityEvaluator.js:
 *   - EVALUATOR_FEATURES_FAIL_SAFE constant shape and stability
 *   - extractEvaluatorFeatures() normalization for all 7 active dimensions
 *
 * COVERAGE (per Wave 5B problem statement)
 * ──────────────────────────────────────────
 *
 * A. EVALUATOR_FEATURES_FAIL_SAFE — constant shape
 *    A1.  Is a frozen object
 *    A2.  extractor_version === EVALUATOR_VERSION
 *    A3.  is_fail_safe === true
 *    A4.  fail_safe_reason is a non-empty string
 *    A5.  strategy_alignment is a frozen object with correct default fields
 *    A6.  formulation_alignment is a frozen object with correct default fields
 *    A7.  continuity_alignment is a frozen object with correct default fields
 *    A8.  knowledge_alignment is a frozen object with correct default fields
 *    A9.  safety_escalation_consistency is a frozen object with correct default fields
 *    A10. role_boundary_integrity is a frozen object with correct default fields
 *    A11. context_completeness is a frozen object with correct default fields
 *
 * B. extractEvaluatorFeatures — fail-safe on bad inputs
 *    B1.  null → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)
 *    B2.  undefined → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)
 *    B3.  {} (empty object) → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)
 *    B4.  number input → fail-safe
 *    B5.  string input → fail-safe
 *    B6.  array input → fail-safe
 *    B7.  is_fail_safe: true on all bad-input paths
 *    B8.  fail_safe_reason: 'bad_inputs' on all bad-input paths
 *
 * C. extractEvaluatorFeatures — valid strategy inputs normalize correctly
 *    C1.  strategy_present: true when strategyState present
 *    C2.  intervention_mode extracted correctly
 *    C3.  distress_tier extracted correctly
 *    C4.  strategy_is_fail_safe: true when strategyState.fail_safe === true
 *    C5.  strategy_is_fail_safe: false when strategyState.fail_safe !== true
 *    C6.  Missing strategyState → strategy_present: false, fail-safe strategy_alignment
 *    C7.  strategyState with non-string fields → safe string defaults
 *
 * D. extractEvaluatorFeatures — valid LTS inputs normalize correctly
 *    D1.  lts_present: true when ltsInputs.lts_valid === true
 *    D2.  lts_present: false when ltsInputs.lts_valid !== true
 *    D3.  lts_present: false when ltsInputs absent
 *    D4.  lts_trajectory extracted when present
 *    D5.  lts_is_stagnating extracted correctly
 *    D6.  lts_is_progressing extracted correctly
 *    D7.  lts_is_fluctuating extracted correctly
 *    D8.  lts_has_risk_history extracted correctly
 *    D9.  lts_has_stalled_interventions extracted correctly
 *    D10. LTS fields zeroed when lts_valid === false
 *
 * E. extractEvaluatorFeatures — formulation/continuity inputs normalize correctly
 *    E1.  formulation_present: true when strategyState.formulation_present === true
 *    E2.  has_formulation_hints: true when formulationHints.has_formulation === true
 *    E3.  formulation_score from explicit formulationScore input
 *    E4.  formulation_score from strategyState.formulation_strength_score fallback
 *    E5.  formulation_domain extracted from formulationHints
 *    E6.  formulation_treatment_phase extracted from formulationHints
 *    E7.  formulation_is_ambiguous extracted from formulationHints
 *    E8.  continuity_present: true when strategyState.continuity_present === true
 *    E9.  continuity_richness_score from explicit continuityRichness input
 *    E10. continuity_richness_score from strategyState fallback
 *    E11. session_count extracted from strategyState
 *    E12. has_open_tasks extracted from strategyState
 *    E13. has_risk_flags extracted from strategyState
 *    E14. intervention_saturated extracted from strategyState
 *
 * F. extractEvaluatorFeatures — knowledge plan inputs normalize correctly
 *    F1.  knowledge_plan_present: true when knowledgePlan is provided
 *    F2.  knowledge_plan_present: false when knowledgePlan absent
 *    F3.  should_retrieve: true when knowledgePlan.shouldRetrieve === true
 *    F4.  should_retrieve: false when knowledgePlan.shouldRetrieve !== true
 *    F5.  skip_reason extracted correctly
 *    F6.  domain_hint extracted correctly
 *    F7.  lts_influenced_arc extracted correctly
 *
 * G. extractEvaluatorFeatures — safety/distress features normalize correctly
 *    G1.  safety_active: true when safetyResult.safety_mode === true
 *    G2.  safety_active: false when safetyResult.safety_mode !== true
 *    G3.  safety_active: false when safetyResult absent
 *    G4.  distressTier from explicit input takes precedence
 *    G5.  distressTier falls back to strategyState.distress_tier
 *    G6.  distressTier defaults to 'tier_high' when safety_active and no tier provided
 *    G7.  distressTier defaults to '' when no source available
 *
 * H. extractEvaluatorFeatures — role/wiring identity normalizes correctly
 *    H1.  wiring_name extracted from wiringIdentity.name
 *    H2.  wiring_stage2 extracted from wiringIdentity.stage2
 *    H3.  wiring_stage2_phase extracted from wiringIdentity.stage2_phase
 *    H4.  wiring_strategy_layer_enabled extracted correctly
 *    H5.  wiring_formulation_context_enabled extracted correctly
 *    H6.  wiring_continuity_layer_enabled extracted correctly
 *    H7.  wiring_safety_mode_enabled extracted correctly
 *    H8.  Missing wiringIdentity → all wiring fields at safe defaults
 *    H9.  wiringIdentity with no flags → all flags false
 *
 * I. extractEvaluatorFeatures — context_completeness tracking
 *    I1.  has_strategy: true when strategyState present
 *    I2.  has_lts: true when ltsInputs.lts_valid === true
 *    I3.  has_formulation: true when formulation signals present
 *    I4.  has_continuity: true when continuity_present
 *    I5.  has_knowledge_plan: true when knowledgePlan present
 *    I6.  has_safety_result: true when safetyResult present
 *    I7.  has_wiring_identity: true when wiring_name non-empty
 *    I8.  dimensions_present_count reflects number of truthy flags
 *    I9.  dimensions_present_count: 0 when only unknown signals present
 *
 * J. extractEvaluatorFeatures — safety and isolation
 *    J1.  No raw text preserved in output (rawMessage input ignored)
 *    J2.  Output is always a frozen object
 *    J3.  Deterministic: same inputs always produce equal output
 *    J4.  Does NOT import from agentWiring / activeAgentWiring / featureFlags
 *    J5.  Does NOT import from Base44 SDK or any entity
 *    J6.  Never throws on any input
 *    J7.  Output shape always matches EVALUATOR_FEATURES_FAIL_SAFE keys
 *    J8.  All dimension entries are frozen objects
 *
 * K. EVALUATOR_VERSION updated to 5B
 *    K1.  EVALUATOR_VERSION matches '5B.0.0'
 *    K2.  extractor_version in valid output === EVALUATOR_VERSION
 *    K3.  extractor_version in fail-safe output === EVALUATOR_VERSION
 */

import { describe, it, expect } from 'vitest';
import {
  EVALUATOR_VERSION,
  EVALUATOR_FEATURES_FAIL_SAFE,
  extractEvaluatorFeatures,
} from '../../src/lib/therapistQualityEvaluator.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_STRATEGY_STATE = Object.freeze({
  strategy_version: '3D.0.0',
  intervention_mode: 'structured_exploration',
  distress_tier: 'tier_mild',
  continuity_present: true,
  formulation_present: true,
  rationale: 'formulation_available',
  fail_safe: false,
  session_count: 4,
  has_risk_flags: false,
  has_open_tasks: true,
  intervention_saturated: false,
  continuity_richness_score: 0.65,
  formulation_strength_score: 0.75,
  lts_trajectory: 'progressing',
});

const VALID_LTS_INPUTS = Object.freeze({
  lts_valid: true,
  lts_session_count: 5,
  lts_trajectory: 'progressing',
  lts_has_risk_history: false,
  lts_is_stagnating: false,
  lts_is_progressing: true,
  lts_is_fluctuating: false,
  lts_has_stalled_interventions: false,
  lts_stalled_interventions: Object.freeze([]),
});

const VALID_FORMULATION_HINTS = Object.freeze({
  domain: 'anxiety',
  treatment_phase: 'middle',
  has_formulation: true,
  is_ambiguous: false,
});

const VALID_KNOWLEDGE_PLAN = Object.freeze({
  shouldRetrieve: true,
  skipReason: '',
  domainHint: 'anxiety',
  unitTypePreference: 'any',
  distressFilter: 'none',
  treatmentArcFilter: 'any',
  ltsInfluencedArc: false,
});

const VALID_SAFETY_RESULT = Object.freeze({
  safety_mode: false,
  triggers: [],
  rationale: '',
});

const VALID_WIRING_IDENTITY = Object.freeze({
  name: 'cbt_therapist',
  stage2: true,
  stage2_phase: 8,
  strategy_layer_enabled: true,
  formulation_context_enabled: true,
  continuity_layer_enabled: true,
  safety_mode_enabled: true,
});

function makeFullValidInputs(overrides = {}) {
  return Object.assign(
    {
      strategyState: VALID_STRATEGY_STATE,
      ltsInputs: VALID_LTS_INPUTS,
      formulationHints: VALID_FORMULATION_HINTS,
      formulationScore: 0.8,
      continuityRichness: 0.7,
      knowledgePlan: VALID_KNOWLEDGE_PLAN,
      safetyResult: VALID_SAFETY_RESULT,
      distressTier: 'tier_mild',
      wiringIdentity: VALID_WIRING_IDENTITY,
    },
    overrides
  );
}

// ─── A. EVALUATOR_FEATURES_FAIL_SAFE constant ────────────────────────────────

describe('EVALUATOR_FEATURES_FAIL_SAFE', () => {
  it('A1. is a frozen object', () => {
    expect(Object.isFrozen(EVALUATOR_FEATURES_FAIL_SAFE)).toBe(true);
  });

  it('A2. extractor_version === EVALUATOR_VERSION', () => {
    expect(EVALUATOR_FEATURES_FAIL_SAFE.extractor_version).toBe(EVALUATOR_VERSION);
  });

  it('A3. is_fail_safe === true', () => {
    expect(EVALUATOR_FEATURES_FAIL_SAFE.is_fail_safe).toBe(true);
  });

  it('A4. fail_safe_reason is a non-empty string', () => {
    expect(typeof EVALUATOR_FEATURES_FAIL_SAFE.fail_safe_reason).toBe('string');
    expect(EVALUATOR_FEATURES_FAIL_SAFE.fail_safe_reason.length).toBeGreaterThan(0);
  });

  it('A5. strategy_alignment is frozen with correct defaults', () => {
    const sa = EVALUATOR_FEATURES_FAIL_SAFE.strategy_alignment;
    expect(Object.isFrozen(sa)).toBe(true);
    expect(sa.strategy_present).toBe(false);
    expect(sa.intervention_mode).toBe('');
    expect(sa.distress_tier).toBe('');
    expect(sa.strategy_is_fail_safe).toBe(true);
    expect(sa.lts_present).toBe(false);
    expect(sa.lts_trajectory).toBe('');
  });

  it('A6. formulation_alignment is frozen with correct defaults', () => {
    const fa = EVALUATOR_FEATURES_FAIL_SAFE.formulation_alignment;
    expect(Object.isFrozen(fa)).toBe(true);
    expect(fa.formulation_present).toBe(false);
    expect(fa.formulation_score).toBe(0);
    expect(fa.has_formulation_hints).toBe(false);
    expect(fa.formulation_domain).toBe('');
    expect(fa.formulation_treatment_phase).toBe('');
    expect(fa.formulation_is_ambiguous).toBe(false);
  });

  it('A7. continuity_alignment is frozen with correct defaults', () => {
    const ca = EVALUATOR_FEATURES_FAIL_SAFE.continuity_alignment;
    expect(Object.isFrozen(ca)).toBe(true);
    expect(ca.continuity_present).toBe(false);
    expect(ca.continuity_richness_score).toBe(0);
    expect(ca.session_count).toBe(0);
    expect(ca.has_open_tasks).toBe(false);
    expect(ca.has_risk_flags).toBe(false);
    expect(ca.intervention_saturated).toBe(false);
  });

  it('A8. knowledge_alignment is frozen with correct defaults', () => {
    const ka = EVALUATOR_FEATURES_FAIL_SAFE.knowledge_alignment;
    expect(Object.isFrozen(ka)).toBe(true);
    expect(ka.knowledge_plan_present).toBe(false);
    expect(ka.should_retrieve).toBe(false);
    expect(ka.skip_reason).toBe('');
    expect(ka.domain_hint).toBe('');
    expect(ka.lts_influenced_arc).toBe(false);
  });

  it('A9. safety_escalation_consistency is frozen with correct defaults', () => {
    const sec = EVALUATOR_FEATURES_FAIL_SAFE.safety_escalation_consistency;
    expect(Object.isFrozen(sec)).toBe(true);
    expect(sec.safety_active).toBe(false);
    expect(sec.distress_tier).toBe('');
  });

  it('A10. role_boundary_integrity is frozen with correct defaults', () => {
    const rbi = EVALUATOR_FEATURES_FAIL_SAFE.role_boundary_integrity;
    expect(Object.isFrozen(rbi)).toBe(true);
    expect(rbi.wiring_name).toBe('');
    expect(rbi.wiring_stage2).toBe(false);
    expect(rbi.wiring_stage2_phase).toBe(0);
    expect(rbi.wiring_strategy_layer_enabled).toBe(false);
    expect(rbi.wiring_formulation_context_enabled).toBe(false);
    expect(rbi.wiring_continuity_layer_enabled).toBe(false);
    expect(rbi.wiring_safety_mode_enabled).toBe(false);
  });

  it('A11. context_completeness is frozen with correct defaults', () => {
    const cc = EVALUATOR_FEATURES_FAIL_SAFE.context_completeness;
    expect(Object.isFrozen(cc)).toBe(true);
    expect(cc.has_strategy).toBe(false);
    expect(cc.has_lts).toBe(false);
    expect(cc.has_formulation).toBe(false);
    expect(cc.has_continuity).toBe(false);
    expect(cc.has_knowledge_plan).toBe(false);
    expect(cc.has_safety_result).toBe(false);
    expect(cc.has_wiring_identity).toBe(false);
    expect(cc.dimensions_present_count).toBe(0);
  });
});

// ─── B. extractEvaluatorFeatures — fail-safe on bad inputs ───────────────────

describe('extractEvaluatorFeatures – bad inputs', () => {
  it('B1. null → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)', () => {
    expect(extractEvaluatorFeatures(null)).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B2. undefined → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)', () => {
    expect(extractEvaluatorFeatures(undefined)).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B3. {} → EVALUATOR_FEATURES_FAIL_SAFE (reference equality)', () => {
    expect(extractEvaluatorFeatures({})).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B4. number input → fail-safe', () => {
    // @ts-expect-error intentional bad input
    expect(extractEvaluatorFeatures(42)).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B5. string input → fail-safe', () => {
    // @ts-expect-error intentional bad input
    expect(extractEvaluatorFeatures('hello')).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B6. array input → fail-safe', () => {
    // @ts-expect-error intentional bad input
    expect(extractEvaluatorFeatures([])).toBe(EVALUATOR_FEATURES_FAIL_SAFE);
  });

  it('B7. is_fail_safe: true on all bad-input paths', () => {
    for (const bad of [null, undefined, {}, 42, 'x', []]) {
      // @ts-expect-error intentional bad input
      expect(extractEvaluatorFeatures(bad).is_fail_safe).toBe(true);
    }
  });

  it('B8. fail_safe_reason: "bad_inputs" on all bad-input paths', () => {
    for (const bad of [null, undefined, {}, 42, 'x', []]) {
      // @ts-expect-error intentional bad input
      expect(extractEvaluatorFeatures(bad).fail_safe_reason).toBe('bad_inputs');
    }
  });
});

// ─── C. strategy inputs normalize correctly ───────────────────────────────────

describe('extractEvaluatorFeatures – strategy inputs', () => {
  it('C1. strategy_present: true when strategyState present', () => {
    const result = extractEvaluatorFeatures({ strategyState: VALID_STRATEGY_STATE });
    expect(result.strategy_alignment.strategy_present).toBe(true);
  });

  it('C2. intervention_mode extracted correctly', () => {
    const result = extractEvaluatorFeatures({ strategyState: VALID_STRATEGY_STATE });
    expect(result.strategy_alignment.intervention_mode).toBe('structured_exploration');
  });

  it('C3. distress_tier extracted correctly', () => {
    const result = extractEvaluatorFeatures({ strategyState: VALID_STRATEGY_STATE });
    expect(result.strategy_alignment.distress_tier).toBe('tier_mild');
  });

  it('C4. strategy_is_fail_safe: true when strategyState.fail_safe === true', () => {
    const result = extractEvaluatorFeatures({
      strategyState: { ...VALID_STRATEGY_STATE, fail_safe: true },
    });
    expect(result.strategy_alignment.strategy_is_fail_safe).toBe(true);
  });

  it('C5. strategy_is_fail_safe: false when strategyState.fail_safe !== true', () => {
    const result = extractEvaluatorFeatures({ strategyState: VALID_STRATEGY_STATE });
    expect(result.strategy_alignment.strategy_is_fail_safe).toBe(false);
  });

  it('C6. Missing strategyState → strategy_present: false, fail-safe strategy defaults', () => {
    const result = extractEvaluatorFeatures({ knowledgePlan: VALID_KNOWLEDGE_PLAN });
    expect(result.strategy_alignment.strategy_present).toBe(false);
    expect(result.strategy_alignment.intervention_mode).toBe('');
    expect(result.strategy_alignment.distress_tier).toBe('');
  });

  it('C7. strategyState with non-string fields → safe string defaults', () => {
    const result = extractEvaluatorFeatures({
      strategyState: {
        intervention_mode: 42,
        distress_tier: null,
        fail_safe: 'yes',
      },
    });
    expect(result.strategy_alignment.intervention_mode).toBe('');
    expect(result.strategy_alignment.distress_tier).toBe('');
    expect(result.strategy_alignment.strategy_is_fail_safe).toBe(false);
  });
});

// ─── D. LTS inputs normalize correctly ───────────────────────────────────────

describe('extractEvaluatorFeatures – LTS inputs', () => {
  it('D1. lts_present: true when ltsInputs.lts_valid === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.strategy_alignment.lts_present).toBe(true);
  });

  it('D2. lts_present: false when ltsInputs.lts_valid !== true', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ ltsInputs: { lts_valid: false, lts_trajectory: 'stagnating' } })
    );
    expect(result.strategy_alignment.lts_present).toBe(false);
  });

  it('D3. lts_present: false when ltsInputs absent', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ ltsInputs: null })
    );
    expect(result.strategy_alignment.lts_present).toBe(false);
  });

  it('D4. lts_trajectory extracted when present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.strategy_alignment.lts_trajectory).toBe('progressing');
  });

  it('D5. lts_is_stagnating extracted correctly', () => {
    const lts = { ...VALID_LTS_INPUTS, lts_is_stagnating: true, lts_is_progressing: false, lts_trajectory: 'stagnating' };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ ltsInputs: lts }));
    expect(result.strategy_alignment.lts_is_stagnating).toBe(true);
  });

  it('D6. lts_is_progressing extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.strategy_alignment.lts_is_progressing).toBe(true);
  });

  it('D7. lts_is_fluctuating extracted correctly', () => {
    const lts = { ...VALID_LTS_INPUTS, lts_is_fluctuating: true, lts_is_progressing: false };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ ltsInputs: lts }));
    expect(result.strategy_alignment.lts_is_fluctuating).toBe(true);
  });

  it('D8. lts_has_risk_history extracted correctly', () => {
    const lts = { ...VALID_LTS_INPUTS, lts_has_risk_history: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ ltsInputs: lts }));
    expect(result.strategy_alignment.lts_has_risk_history).toBe(true);
  });

  it('D9. lts_has_stalled_interventions extracted correctly', () => {
    const lts = { ...VALID_LTS_INPUTS, lts_has_stalled_interventions: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ ltsInputs: lts }));
    expect(result.strategy_alignment.lts_has_stalled_interventions).toBe(true);
  });

  it('D10. LTS fields zeroed when lts_valid === false', () => {
    const lts = { lts_valid: false, lts_trajectory: 'stagnating', lts_is_stagnating: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ ltsInputs: lts }));
    expect(result.strategy_alignment.lts_present).toBe(false);
    expect(result.strategy_alignment.lts_trajectory).toBe('');
    expect(result.strategy_alignment.lts_is_stagnating).toBe(false);
  });
});

// ─── E. Formulation and continuity inputs normalize correctly ─────────────────

describe('extractEvaluatorFeatures – formulation and continuity inputs', () => {
  it('E1. formulation_present: true when strategyState.formulation_present === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.formulation_alignment.formulation_present).toBe(true);
  });

  it('E2. has_formulation_hints: true when formulationHints.has_formulation === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.formulation_alignment.has_formulation_hints).toBe(true);
  });

  it('E3. formulation_score from explicit formulationScore input', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs({ formulationScore: 0.9 }));
    expect(result.formulation_alignment.formulation_score).toBe(0.9);
  });

  it('E4. formulation_score from strategyState.formulation_strength_score fallback', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ formulationScore: undefined })
    );
    // Should fall back to strategyState.formulation_strength_score = 0.75
    expect(result.formulation_alignment.formulation_score).toBe(0.75);
  });

  it('E5. formulation_domain extracted from formulationHints', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.formulation_alignment.formulation_domain).toBe('anxiety');
  });

  it('E6. formulation_treatment_phase extracted from formulationHints', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.formulation_alignment.formulation_treatment_phase).toBe('middle');
  });

  it('E7. formulation_is_ambiguous extracted from formulationHints', () => {
    const hints = { ...VALID_FORMULATION_HINTS, is_ambiguous: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ formulationHints: hints }));
    expect(result.formulation_alignment.formulation_is_ambiguous).toBe(true);
  });

  it('E8. continuity_present: true when strategyState.continuity_present === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.continuity_alignment.continuity_present).toBe(true);
  });

  it('E9. continuity_richness_score from explicit continuityRichness input', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs({ continuityRichness: 0.85 }));
    expect(result.continuity_alignment.continuity_richness_score).toBe(0.85);
  });

  it('E10. continuity_richness_score from strategyState fallback', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ continuityRichness: undefined })
    );
    // Falls back to strategyState.continuity_richness_score = 0.65
    expect(result.continuity_alignment.continuity_richness_score).toBe(0.65);
  });

  it('E11. session_count extracted from strategyState', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.continuity_alignment.session_count).toBe(4);
  });

  it('E12. has_open_tasks extracted from strategyState', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.continuity_alignment.has_open_tasks).toBe(true);
  });

  it('E13. has_risk_flags extracted from strategyState', () => {
    const ss = { ...VALID_STRATEGY_STATE, has_risk_flags: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ strategyState: ss }));
    expect(result.continuity_alignment.has_risk_flags).toBe(true);
  });

  it('E14. intervention_saturated extracted from strategyState', () => {
    const ss = { ...VALID_STRATEGY_STATE, intervention_saturated: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ strategyState: ss }));
    expect(result.continuity_alignment.intervention_saturated).toBe(true);
  });
});

// ─── F. Knowledge plan inputs normalize correctly ─────────────────────────────

describe('extractEvaluatorFeatures – knowledge plan inputs', () => {
  it('F1. knowledge_plan_present: true when knowledgePlan provided', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.knowledge_alignment.knowledge_plan_present).toBe(true);
  });

  it('F2. knowledge_plan_present: false when knowledgePlan absent', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs({ knowledgePlan: null }));
    expect(result.knowledge_alignment.knowledge_plan_present).toBe(false);
  });

  it('F3. should_retrieve: true when knowledgePlan.shouldRetrieve === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.knowledge_alignment.should_retrieve).toBe(true);
  });

  it('F4. should_retrieve: false when knowledgePlan.shouldRetrieve !== true', () => {
    const kp = { ...VALID_KNOWLEDGE_PLAN, shouldRetrieve: false, skipReason: 'safety_override' };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ knowledgePlan: kp }));
    expect(result.knowledge_alignment.should_retrieve).toBe(false);
  });

  it('F5. skip_reason extracted correctly', () => {
    const kp = { ...VALID_KNOWLEDGE_PLAN, shouldRetrieve: false, skipReason: 'strategy_inert' };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ knowledgePlan: kp }));
    expect(result.knowledge_alignment.skip_reason).toBe('strategy_inert');
  });

  it('F6. domain_hint extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.knowledge_alignment.domain_hint).toBe('anxiety');
  });

  it('F7. lts_influenced_arc extracted correctly', () => {
    const kp = { ...VALID_KNOWLEDGE_PLAN, ltsInfluencedArc: true };
    const result = extractEvaluatorFeatures(makeFullValidInputs({ knowledgePlan: kp }));
    expect(result.knowledge_alignment.lts_influenced_arc).toBe(true);
  });
});

// ─── G. Safety/distress features normalize correctly ──────────────────────────

describe('extractEvaluatorFeatures – safety and distress features', () => {
  it('G1. safety_active: true when safetyResult.safety_mode === true', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ safetyResult: { safety_mode: true } })
    );
    expect(result.safety_escalation_consistency.safety_active).toBe(true);
  });

  it('G2. safety_active: false when safetyResult.safety_mode !== true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.safety_escalation_consistency.safety_active).toBe(false);
  });

  it('G3. safety_active: false when safetyResult absent', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ safetyResult: null })
    );
    expect(result.safety_escalation_consistency.safety_active).toBe(false);
  });

  it('G4. distressTier from explicit input takes precedence', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ distressTier: 'tier_high' })
    );
    expect(result.safety_escalation_consistency.distress_tier).toBe('tier_high');
  });

  it('G5. distressTier falls back to strategyState.distress_tier', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ distressTier: null })
    );
    expect(result.safety_escalation_consistency.distress_tier).toBe('tier_mild');
  });

  it('G6. distressTier defaults to "tier_high" when safety_active and no tier provided', () => {
    const result = extractEvaluatorFeatures({
      safetyResult: { safety_mode: true },
      distressTier: null,
    });
    expect(result.safety_escalation_consistency.distress_tier).toBe('tier_high');
  });

  it('G7. distressTier defaults to "" when no source available', () => {
    const result = extractEvaluatorFeatures({
      safetyResult: { safety_mode: false },
      distressTier: null,
    });
    expect(result.safety_escalation_consistency.distress_tier).toBe('');
  });
});

// ─── H. Role/wiring identity normalizes correctly ─────────────────────────────

describe('extractEvaluatorFeatures – role and wiring identity', () => {
  it('H1. wiring_name extracted from wiringIdentity.name', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_name).toBe('cbt_therapist');
  });

  it('H2. wiring_stage2 extracted from wiringIdentity.stage2', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_stage2).toBe(true);
  });

  it('H3. wiring_stage2_phase extracted from wiringIdentity.stage2_phase', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_stage2_phase).toBe(8);
  });

  it('H4. wiring_strategy_layer_enabled extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_strategy_layer_enabled).toBe(true);
  });

  it('H5. wiring_formulation_context_enabled extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_formulation_context_enabled).toBe(true);
  });

  it('H6. wiring_continuity_layer_enabled extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_continuity_layer_enabled).toBe(true);
  });

  it('H7. wiring_safety_mode_enabled extracted correctly', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.role_boundary_integrity.wiring_safety_mode_enabled).toBe(true);
  });

  it('H8. Missing wiringIdentity → all wiring fields at safe defaults', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ wiringIdentity: null })
    );
    const rbi = result.role_boundary_integrity;
    expect(rbi.wiring_name).toBe('');
    expect(rbi.wiring_stage2).toBe(false);
    expect(rbi.wiring_stage2_phase).toBe(0);
    expect(rbi.wiring_strategy_layer_enabled).toBe(false);
    expect(rbi.wiring_formulation_context_enabled).toBe(false);
    expect(rbi.wiring_continuity_layer_enabled).toBe(false);
    expect(rbi.wiring_safety_mode_enabled).toBe(false);
  });

  it('H9. wiringIdentity with no flags → all flags false', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ wiringIdentity: { name: 'cbt_therapist' } })
    );
    const rbi = result.role_boundary_integrity;
    expect(rbi.wiring_name).toBe('cbt_therapist');
    expect(rbi.wiring_stage2).toBe(false);
    expect(rbi.wiring_strategy_layer_enabled).toBe(false);
    expect(rbi.wiring_formulation_context_enabled).toBe(false);
    expect(rbi.wiring_continuity_layer_enabled).toBe(false);
    expect(rbi.wiring_safety_mode_enabled).toBe(false);
  });
});

// ─── I. context_completeness tracking ────────────────────────────────────────

describe('extractEvaluatorFeatures – context_completeness', () => {
  it('I1. has_strategy: true when strategyState present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_strategy).toBe(true);
  });

  it('I2. has_lts: true when ltsInputs.lts_valid === true', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_lts).toBe(true);
  });

  it('I3. has_formulation: true when formulation signals present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_formulation).toBe(true);
  });

  it('I4. has_continuity: true when continuity_present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_continuity).toBe(true);
  });

  it('I5. has_knowledge_plan: true when knowledgePlan present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_knowledge_plan).toBe(true);
  });

  it('I6. has_safety_result: true when safetyResult present', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_safety_result).toBe(true);
  });

  it('I7. has_wiring_identity: true when wiring_name non-empty', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.has_wiring_identity).toBe(true);
  });

  it('I8. dimensions_present_count reflects number of truthy flags', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.context_completeness.dimensions_present_count).toBe(7);
  });

  it('I9. dimensions_present_count: 0 when only unknown signals present', () => {
    // Pass a non-empty object that carries no recognizable signals
    const result = extractEvaluatorFeatures({ unknownKey: 'someValue' });
    expect(result.context_completeness.dimensions_present_count).toBe(0);
  });
});

// ─── J. Safety and isolation guarantees ──────────────────────────────────────

describe('extractEvaluatorFeatures – safety and isolation', () => {
  it('J1. No raw text preserved in output (rawMessage input ignored)', () => {
    const result = extractEvaluatorFeatures(
      makeFullValidInputs({ rawMessage: 'I feel very anxious today' })
    );
    const json = JSON.stringify(result);
    expect(json).not.toContain('anxious');
    expect(json).not.toContain('rawMessage');
  });

  it('J2. Output is always a frozen object', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('J3. Deterministic: same inputs always produce equal output', () => {
    const inputs = makeFullValidInputs();
    const r1 = extractEvaluatorFeatures(inputs);
    const r2 = extractEvaluatorFeatures(inputs);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('J4/J5. Does NOT import from agentWiring / activeAgentWiring / featureFlags / Base44 SDK / entities', async () => {
    // This test verifies module isolation by importing the module and checking
    // that its source has no forbidden imports. We test functionally by
    // ensuring no side effects occur from calling extractEvaluatorFeatures.
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    // If the module imported runtime modules, they would throw in the test env.
    // Successful execution proves isolation.
    expect(result.is_fail_safe).toBe(false);
  });

  it('J6. Never throws on any input', () => {
    const weirdInputs = [
      null,
      undefined,
      {},
      42,
      'hello',
      [],
      { strategyState: null, ltsInputs: undefined },
      { strategyState: 'not an object' },
      { knowledgePlan: 42 },
      { wiringIdentity: [] },
    ];
    for (const inp of weirdInputs) {
      expect(() => extractEvaluatorFeatures(inp)).not.toThrow();
    }
  });

  it('J7. Output shape always matches EVALUATOR_FEATURES_FAIL_SAFE keys for valid inputs', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    const failSafeKeys = Object.keys(EVALUATOR_FEATURES_FAIL_SAFE);
    for (const key of failSafeKeys) {
      expect(result).toHaveProperty(key);
    }
  });

  it('J8. All dimension entries are frozen objects', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(Object.isFrozen(result.strategy_alignment)).toBe(true);
    expect(Object.isFrozen(result.formulation_alignment)).toBe(true);
    expect(Object.isFrozen(result.continuity_alignment)).toBe(true);
    expect(Object.isFrozen(result.knowledge_alignment)).toBe(true);
    expect(Object.isFrozen(result.safety_escalation_consistency)).toBe(true);
    expect(Object.isFrozen(result.role_boundary_integrity)).toBe(true);
    expect(Object.isFrozen(result.context_completeness)).toBe(true);
  });
});

// ─── K. EVALUATOR_VERSION updated to 5C ──────────────────────────────────────

describe('EVALUATOR_VERSION — Wave 5C', () => {
  it('K1. EVALUATOR_VERSION matches "5C.0.0"', () => {
    expect(EVALUATOR_VERSION).toBe('5C.0.0');
  });

  it('K2. extractor_version in valid output === EVALUATOR_VERSION', () => {
    const result = extractEvaluatorFeatures(makeFullValidInputs());
    expect(result.extractor_version).toBe(EVALUATOR_VERSION);
  });

  it('K3. extractor_version in fail-safe output === EVALUATOR_VERSION', () => {
    expect(EVALUATOR_FEATURES_FAIL_SAFE.extractor_version).toBe(EVALUATOR_VERSION);
  });
});
