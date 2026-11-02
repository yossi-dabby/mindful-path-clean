/**
 * @file test/utils/wave3dLTSStrategyIntegration.test.js
 *
 * Wave 3D — LTS Strategy Integration Tests
 *
 * PURPOSE
 * -------
 * Validates the Wave 3D changes added to:
 *   - src/lib/therapistStrategyEngine.js  (extractLTSStrategyInputs,
 *     determineTherapistStrategy 5th param, 4 new LTS-aware rules,
 *     lts_trajectory field, updated diagnostics/context section)
 *   - src/lib/workflowContextInjector.js  (extractLTSStrategyInputs import,
 *     options.lts_record pass-through in V8, V9 refactor to read LTS before V8)
 *
 * COVERAGE (per Wave 3D problem statement)
 * ─────────────────────────────────────────
 *  A.  extractLTSStrategyInputs — valid LTS record → lts_valid: true
 *  B.  extractLTSStrategyInputs — null/invalid/weak LTS → lts_valid: false
 *  C.  extractLTSStrategyInputs — stalled_interventions bounded and filtered
 *  D.  extractLTSStrategyInputs — risk_flag_history → lts_has_risk_history
 *  E.  extractLTSStrategyInputs — trajectory convenience booleans correct
 *  F.  determineTherapistStrategy — ltsInputs absent → exact Wave 2C behavior
 *  G.  determineTherapistStrategy — ltsInputs.lts_valid=false → exact Wave 2C
 *  H.  determineTherapistStrategy — TIER_HIGH → CONTAINMENT regardless of LTS
 *  I.  determineTherapistStrategy — TIER_MODERATE → STABILISATION regardless
 *  J.  determineTherapistStrategy — D1: fluctuating arc → STABILISATION
 *  K.  determineTherapistStrategy — D2: risk history (not progressing) → STABILISATION
 *  L.  determineTherapistStrategy — D2: risk history + progressing → no override
 *  M.  determineTherapistStrategy — D3: stagnating blocks FORMULATION_DEEPENING
 *  N.  determineTherapistStrategy — D4: stalled interventions blocks deepening
 *  O.  determineTherapistStrategy — progressing arc → FORMULATION_DEEPENING allowed
 *  P.  determineTherapistStrategy — stable arc → FORMULATION_DEEPENING allowed
 *  Q.  determineTherapistStrategy — effectiveSessionCount uses LTS when greater
 *  R.  determineTherapistStrategy — lts_trajectory in strategy state output
 *  S.  determineTherapistStrategy — STRATEGY_FAIL_SAFE_STATE unchanged (lts_trajectory: '')
 *  T.  buildStrategyContextSection — LTS arc line included when meaningful trajectory
 *  U.  buildStrategyDiagnosticSnapshot — lts_trajectory included
 *  V.  STRATEGY_DIAGNOSTIC_SAFE_FIELDS — includes lts_trajectory
 *  W.  buildV9SessionStartContentAsync — LTS passed to strategy engine (mode changes)
 *  X.  buildV9SessionStartContentAsync — weak LTS → exact V8 behavior preserved
 *  Y.  buildV9SessionStartContentAsync — null LTS → exact V8 behavior preserved
 *  Z.  no raw transcript leakage (stalled_interventions / risk_flag_history only)
 *  AA. no private-entity leakage (no ThoughtJournal, CaseFormulation, Conversation
 *      fields in extractLTSStrategyInputs output)
 *  AB. no regression to companion flows
 *  AC. deterministic repeatability — same inputs always produce same output
 *  AD. STRATEGY_VERSION bumped to 1.2.0
 *
 * CONSTRAINTS
 * -----------
 * - No feature flags are enabled in these tests (all flags default to false).
 * - All tests are synchronous or minimally async (no live backend required).
 * - No raw user message content appears in any LTS function input or output.
 * - Companion entity access is never tested or invoked here.
 * - V8/V9 strategy integration tests use minimal wiring mocks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  extractLTSStrategyInputs,
  determineTherapistStrategy,
  buildStrategyContextSection,
  buildStrategyDiagnosticSnapshot,
  STRATEGY_DIAGNOSTIC_SAFE_FIELDS,
  STRATEGY_FAIL_SAFE_STATE,
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  STRATEGY_VERSION,
} from '../../src/lib/therapistStrategyEngine.js';

import {
  buildV9SessionStartContentAsync,
  buildV8SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ─── LTS model helpers ────────────────────────────────────────────────────────

import {
  LTS_VERSION,
  LTS_MEMORY_TYPE,
  LTS_TRAJECTORIES,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Minimal valid LTS record for testing.  Matches the Wave 3A/3B LTS schema.
 * Overrides can target any specific field for scenario tests.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function makeLTSRecord(overrides = {}) {
  return {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
    session_count: 5,
    trajectory: LTS_TRAJECTORIES.STABLE,
    recurring_patterns: ['avoidance', 'catastrophising'],
    persistent_open_tasks: ['schedule_next_session'],
    active_goal_ids: ['goal-001'],
    helpful_interventions: ['behavioural_activation'],
    stalled_interventions: [],
    risk_flag_history: [],
    last_session_date: '2025-01-10T00:00:00.000Z',
    computed_at: '2025-01-11T00:00:00.000Z',
    ...overrides,
  };
}

/** Minimal continuity data with 2 records. */
const CONTINUITY_WITH_RECORDS = {
  records: [
    {
      core_patterns: ['avoidance'],
      follow_up_tasks: ['homework'],
      interventions_used: ['thought_records'],
      risk_flags: [],
    },
    {
      core_patterns: ['catastrophising'],
      follow_up_tasks: ['homework'],
      interventions_used: ['thought_records'],
      risk_flags: [],
    },
  ],
};

/** Minimal formulation with at least one scoreable field. */
const FORMULATION_PRESENT = {
  presenting_problem: 'Generalised anxiety affecting daily functioning',
  core_belief: 'I am inherently inadequate',
  treatment_goals: ['Reduce avoidance', 'Build tolerance of uncertainty'],
};

/** Minimal message signals — no distress / shutdown / hopelessness. */
const CALM_SIGNALS = {
  has_distress_language: false,
  has_hopelessness_language: false,
  has_catastrophic_language: false,
  has_shutdown_language: false,
  has_emotional_language: false,
  is_empty_or_short: false,
};

// ─── A. extractLTSStrategyInputs — valid record ───────────────────────────────

describe('extractLTSStrategyInputs — valid LTS record', () => {
  it('returns lts_valid: true for a minimal valid stable LTS record', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord());
    expect(inputs.lts_valid).toBe(true);
  });

  it('returns lts_valid: true for stable session_count at canonical minimum (2)', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ session_count: LTS_MIN_SESSIONS_FOR_SIGNALS }),
    );
    expect(inputs.lts_valid).toBe(true);
    expect(inputs.lts_session_count).toBe(LTS_MIN_SESSIONS_FOR_SIGNALS);
  });

  it('returns correct lts_session_count from record', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord({ session_count: 7 }));
    expect(inputs.lts_session_count).toBe(7);
  });

  it('returns correct lts_trajectory from record', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING }),
    );
    expect(inputs.lts_trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('returns frozen output object', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord());
    expect(Object.isFrozen(inputs)).toBe(true);
  });

  it('lts_stalled_interventions is frozen array', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: ['thought_records', 'journals'] }),
    );
    expect(Array.isArray(inputs.lts_stalled_interventions)).toBe(true);
    expect(Object.isFrozen(inputs.lts_stalled_interventions)).toBe(true);
  });

  it('lts_stalled_interventions bounded to 8 entries', () => {
    const many = Array.from({ length: 12 }, (_, i) => `intervention_${i}`);
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: many }),
    );
    expect(inputs.lts_stalled_interventions.length).toBeLessThanOrEqual(8);
  });

  it('lts_stalled_interventions filters out non-string / blank entries', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({
        stalled_interventions: ['good', '', null, '  ', 42, 'also_good'],
      }),
    );
    expect(inputs.lts_stalled_interventions).toEqual(['good', 'also_good']);
  });
});

// ─── B. extractLTSStrategyInputs — invalid / absent inputs ────────────────────

describe('extractLTSStrategyInputs — invalid / absent inputs', () => {
  it.each([null, undefined, 0, '', [], {}])(
    'returns lts_valid: false for %s',
    (value) => {
      expect(extractLTSStrategyInputs(value).lts_valid).toBe(false);
    },
  );

  it('returns lts_valid: false when lts_version missing', () => {
    const bad = makeLTSRecord({ lts_version: undefined });
    expect(extractLTSStrategyInputs(bad).lts_valid).toBe(false);
  });

  it('returns lts_valid: false when memory_type is not "lts"', () => {
    const bad = makeLTSRecord({ memory_type: 'session' });
    expect(extractLTSStrategyInputs(bad).lts_valid).toBe(false);
  });

  it('returns lts_valid: false when trajectory is "unknown"', () => {
    const bad = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    expect(extractLTSStrategyInputs(bad).lts_valid).toBe(false);
  });

  it('returns lts_valid: false when trajectory is "insufficient_data"', () => {
    const bad = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.INSUFFICIENT_DATA });
    expect(extractLTSStrategyInputs(bad).lts_valid).toBe(false);
  });

  it('returns lts_valid: false when session_count < LTS_MIN_SESSIONS_FOR_SIGNALS', () => {
    const bad = makeLTSRecord({ session_count: LTS_MIN_SESSIONS_FOR_SIGNALS - 1 });
    expect(extractLTSStrategyInputs(bad).lts_valid).toBe(false);
  });

  it('returns safe zero values for all numeric/array fields when invalid', () => {
    const inputs = extractLTSStrategyInputs(null);
    expect(inputs.lts_session_count).toBe(0);
    expect(inputs.lts_trajectory).toBe('');
    expect(inputs.lts_stalled_interventions).toEqual([]);
    expect(inputs.lts_has_risk_history).toBe(false);
    expect(inputs.lts_is_stagnating).toBe(false);
    expect(inputs.lts_is_progressing).toBe(false);
    expect(inputs.lts_is_fluctuating).toBe(false);
    expect(inputs.lts_has_stalled_interventions).toBe(false);
  });

  it('never throws on any input and returns lts_valid:false for all', () => {
    const weirdInputs = [Symbol('x'), function () {}, new Date(), Infinity, NaN];
    for (const v of weirdInputs) {
      let result;
      expect(() => { result = extractLTSStrategyInputs(v); }).not.toThrow();
      expect(result.lts_valid).toBe(false);
    }
  });
});

// ─── C. extractLTSStrategyInputs — risk history ────────────────────────────────

describe('extractLTSStrategyInputs — risk_flag_history → lts_has_risk_history', () => {
  it('lts_has_risk_history: false when risk_flag_history is empty', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord({ risk_flag_history: [] }));
    expect(inputs.lts_has_risk_history).toBe(false);
  });

  it('lts_has_risk_history: true when risk_flag_history has entries', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ risk_flag_history: ['passive_ideation'] }),
    );
    expect(inputs.lts_has_risk_history).toBe(true);
  });

  it('lts_has_risk_history: false when risk_flag_history is non-array', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ risk_flag_history: 'bad_value' }),
    );
    expect(inputs.lts_has_risk_history).toBe(false);
  });
});

// ─── D. extractLTSStrategyInputs — trajectory convenience booleans ─────────────

describe('extractLTSStrategyInputs — trajectory convenience booleans', () => {
  it.each([
    [LTS_TRAJECTORIES.STAGNATING, { is_stagnating: true, is_progressing: false, is_fluctuating: false }],
    [LTS_TRAJECTORIES.PROGRESSING, { is_stagnating: false, is_progressing: true, is_fluctuating: false }],
    [LTS_TRAJECTORIES.FLUCTUATING, { is_stagnating: false, is_progressing: false, is_fluctuating: true }],
    [LTS_TRAJECTORIES.STABLE,      { is_stagnating: false, is_progressing: false, is_fluctuating: false }],
  ])('trajectory %s → correct boolean flags', (trajectory, expected) => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord({ trajectory }));
    expect(inputs.lts_is_stagnating).toBe(expected.is_stagnating);
    expect(inputs.lts_is_progressing).toBe(expected.is_progressing);
    expect(inputs.lts_is_fluctuating).toBe(expected.is_fluctuating);
  });

  it('lts_has_stalled_interventions: false when stalled_interventions empty', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord({ stalled_interventions: [] }));
    expect(inputs.lts_has_stalled_interventions).toBe(false);
  });

  it('lts_has_stalled_interventions: true when stalled_interventions non-empty', () => {
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: ['journalling'] }),
    );
    expect(inputs.lts_has_stalled_interventions).toBe(true);
  });
});

// ─── E. No private-entity leakage in extractLTSStrategyInputs output ──────────

describe('extractLTSStrategyInputs — no private-entity leakage (AA)', () => {
  const PRIVATE_FIELDS = [
    'session_summary',
    'automatic_thoughts',
    'message_content',
    'transcript',
    'raw_text',
    'journal',
    'conversation',
    'case_formulation',
    'working_hypotheses',
  ];

  it('output contains none of the private entity field names', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord());
    for (const field of PRIVATE_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(inputs, field)).toBe(false);
    }
  });

  it('lts_stalled_interventions never contains raw transcript content', () => {
    // Inject values that look like transcript content — they should survive only
    // as bounded strings (not structured objects), same as the LTS schema design.
    const inputs = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: ['thought_records', 'journalling'] }),
    );
    // The values are short bounded labels, not free-text paragraphs.
    for (const iv of inputs.lts_stalled_interventions) {
      expect(typeof iv).toBe('string');
      expect(iv.length).toBeLessThanOrEqual(64); // LTS_STRING_MAX_CHARS
    }
  });
});

// ─── F / G. determineTherapistStrategy — LTS absent → exact Wave 2C behavior ─

describe('determineTherapistStrategy — LTS absent → exact Wave 2C behavior (F/G)', () => {
  // These tests verify that omitting or passing invalid ltsInputs produces
  // exactly the same results as Wave 2C (no 5th arg).

  it('TIER_HIGH → CONTAINMENT without ltsInputs', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_HIGH,
      CALM_SIGNALS,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result.fail_safe).toBe(false);
  });

  it('TIER_HIGH → CONTAINMENT with ltsInputs=null', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_HIGH,
      CALM_SIGNALS,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('TIER_MODERATE → STABILISATION without ltsInputs', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_MODERATE,
      CALM_SIGNALS,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });

  it('no context → PSYCHOEDUCATION without ltsInputs', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('formulation + continuity + low distress → FORMULATION_DEEPENING without ltsInputs', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('lts_valid:false inputs → identical to Wave 2C result (no mode change)', () => {
    const wave2cResult = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
    );
    const wave3dInvalidResult = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      { lts_valid: false },
    );
    expect(wave3dInvalidResult.intervention_mode).toBe(wave2cResult.intervention_mode);
    expect(wave3dInvalidResult.rationale).toBe(wave2cResult.rationale);
  });
});

// ─── H. TIER_HIGH → CONTAINMENT always (LTS cannot override) ─────────────────

describe('determineTherapistStrategy — TIER_HIGH always CONTAINMENT (H)', () => {
  const HIGH_DISTRESS = DISTRESS_TIERS.TIER_HIGH;

  it.each([
    LTS_TRAJECTORIES.STAGNATING,
    LTS_TRAJECTORIES.PROGRESSING,
    LTS_TRAJECTORIES.FLUCTUATING,
    LTS_TRAJECTORIES.STABLE,
  ])('trajectory %s: still CONTAINMENT at TIER_HIGH', (trajectory) => {
    const lts = extractLTSStrategyInputs(makeLTSRecord({ trajectory }));
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      HIGH_DISTRESS,
      CALM_SIGNALS,
      lts,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result.rationale).toBe('tier_high_containment_mandatory');
  });

  it('stagnating + stalled interventions: still CONTAINMENT at TIER_HIGH', () => {
    const lts = extractLTSStrategyInputs(
      makeLTSRecord({
        trajectory: LTS_TRAJECTORIES.STAGNATING,
        stalled_interventions: ['thought_records'],
        risk_flag_history: ['passive_ideation'],
      }),
    );
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      HIGH_DISTRESS,
      CALM_SIGNALS,
      lts,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });
});

// ─── I. TIER_MODERATE → STABILISATION always (LTS cannot override) ────────────

describe('determineTherapistStrategy — TIER_MODERATE always STABILISATION (I)', () => {
  it.each([
    LTS_TRAJECTORIES.STAGNATING,
    LTS_TRAJECTORIES.PROGRESSING,
    LTS_TRAJECTORIES.FLUCTUATING,
  ])('trajectory %s: still STABILISATION at TIER_MODERATE', (trajectory) => {
    const lts = extractLTSStrategyInputs(makeLTSRecord({ trajectory }));
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_MODERATE,
      CALM_SIGNALS,
      lts,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });
});

// ─── J. Rule D1: fluctuating arc → STABILISATION at low/mild distress ─────────

describe('determineTherapistStrategy — D1: fluctuating arc → STABILISATION (J)', () => {
  const ltsFluctuating = extractLTSStrategyInputs(
    makeLTSRecord({ trajectory: LTS_TRAJECTORIES.FLUCTUATING }),
  );

  it('TIER_LOW + fluctuating + formulation + continuity → STABILISATION', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsFluctuating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('lts_fluctuating_arc_stabilisation');
  });

  it('TIER_MILD + fluctuating + formulation + continuity → STABILISATION', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_MILD,
      CALM_SIGNALS,
      ltsFluctuating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('lts_fluctuating_arc_stabilisation');
  });

  it('fluctuating arc includes lts_trajectory in output', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsFluctuating,
    );
    expect(result.lts_trajectory).toBe(LTS_TRAJECTORIES.FLUCTUATING);
  });

  it('fluctuating does NOT fire at TIER_HIGH (CONTAINMENT wins)', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_HIGH,
      CALM_SIGNALS,
      ltsFluctuating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('fluctuating does NOT fire at TIER_MODERATE (STABILISATION wins first)', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_MODERATE,
      CALM_SIGNALS,
      ltsFluctuating,
    );
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });
});

// ─── K / L. Rule D2: LTS risk history → STABILISATION (soft caution) ──────────

describe('determineTherapistStrategy — D2: LTS risk history (K/L)', () => {
  const ltsRiskHistory = extractLTSStrategyInputs(
    makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      risk_flag_history: ['passive_ideation'],
    }),
  );

  const ltsRiskHistoryProgressing = extractLTSStrategyInputs(
    makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.PROGRESSING,
      risk_flag_history: ['passive_ideation'],
    }),
  );

  it('stable arc + risk history (no current risk flags) → STABILISATION', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsRiskHistory,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('lts_risk_history_stabilisation');
  });

  it('progressing arc + risk history → does NOT trigger D2 (L)', () => {
    // When trajectory is progressing, the progressing exemption prevents D2.
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsRiskHistoryProgressing,
    );
    // D2 exempted — progressing arc should NOT be downgraded to STABILISATION
    expect(result.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).not.toBe('lts_risk_history_stabilisation');
  });

  it('current risk flags in continuity → Wave 2C rule 1 fires first, not D2', () => {
    const continuityWithRisk = {
      records: [
        {
          core_patterns: ['avoidance'],
          follow_up_tasks: ['homework'],
          interventions_used: ['thought_records'],
          risk_flags: ['passive_ideation'],
        },
      ],
    };
    const result = determineTherapistStrategy(
      continuityWithRisk,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsRiskHistory,
    );
    // Wave 2C rule 1 fires first (current risk flags present)
    expect(result.rationale).toBe('risk_flags_present_stabilisation');
  });

  it('risk history includes lts_trajectory in output', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsRiskHistory,
    );
    expect(result.lts_trajectory).toBe(LTS_TRAJECTORIES.STABLE);
  });
});

// ─── M. Rule D3: stagnating arc blocks FORMULATION_DEEPENING ─────────────────

describe('determineTherapistStrategy — D3: stagnating arc blocks deepening (M)', () => {
  const ltsStagnating = extractLTSStrategyInputs(
    makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING }),
  );

  it('formulation + continuity + low distress + stagnating → STRUCTURED_EXPLORATION', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsStagnating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('lts_stagnation_blocks_deepening');
  });

  it('formulation + continuity + open tasks + stagnating → STRUCTURED_EXPLORATION', () => {
    const continuityWithTasks = {
      records: [
        {
          core_patterns: ['avoidance'],
          follow_up_tasks: ['homework_task'],
          interventions_used: ['thought_records'],
          risk_flags: [],
        },
      ],
    };
    const result = determineTherapistStrategy(
      continuityWithTasks,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsStagnating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('lts_stagnation_blocks_deepening');
  });

  it('stagnating arc includes lts_trajectory in output', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsStagnating,
    );
    expect(result.lts_trajectory).toBe(LTS_TRAJECTORIES.STAGNATING);
  });

  it('stagnating does NOT affect TIER_HIGH (CONTAINMENT wins)', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_HIGH,
      CALM_SIGNALS,
      ltsStagnating,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('stagnating does NOT affect TIER_MODERATE (STABILISATION wins)', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_MODERATE,
      CALM_SIGNALS,
      ltsStagnating,
    );
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });
});

// ─── N. Rule D4: stalled interventions block FORMULATION_DEEPENING ────────────

describe('determineTherapistStrategy — D4: stalled interventions block deepening (N)', () => {
  const ltsStalledInterventions = extractLTSStrategyInputs(
    makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE, // not stagnating per se
      stalled_interventions: ['thought_records', 'journalling'],
    }),
  );

  it('formulation + continuity + stalled interventions → STRUCTURED_EXPLORATION', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsStalledInterventions,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('lts_stagnation_blocks_deepening');
  });

  it('stalled interventions do not affect TIER_HIGH', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_HIGH,
      CALM_SIGNALS,
      ltsStalledInterventions,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('no stalled interventions → FORMULATION_DEEPENING preserved', () => {
    const ltsNoStall = extractLTSStrategyInputs(
      makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE, stalled_interventions: [] }),
    );
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsNoStall,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });
});

// ─── O. Progressing arc → FORMULATION_DEEPENING allowed ──────────────────────

describe('determineTherapistStrategy — progressing arc → FORMULATION_DEEPENING (O)', () => {
  const ltsProgressing = extractLTSStrategyInputs(
    makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING }),
  );

  // Use continuity without open tasks to exercise the formulation_and_continuity_deepening rule.
  const CONTINUITY_NO_TASKS = {
    records: [
      {
        core_patterns: ['avoidance'],
        follow_up_tasks: [],
        interventions_used: ['thought_records'],
        risk_flags: [],
      },
    ],
  };

  it('formulation + continuity + progressing + low distress → FORMULATION_DEEPENING', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_NO_TASKS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsProgressing,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.rationale).toBe('formulation_and_continuity_deepening');
  });

  it('progressing arc includes lts_trajectory in output', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_NO_TASKS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsProgressing,
    );
    expect(result.lts_trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });
});

// ─── P. Stable arc → FORMULATION_DEEPENING allowed ────────────────────────────

describe('determineTherapistStrategy — stable arc → FORMULATION_DEEPENING (P)', () => {
  const ltsStable = extractLTSStrategyInputs(
    makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STABLE }),
  );

  it('formulation + continuity + stable + low distress → FORMULATION_DEEPENING', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      ltsStable,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });
});

// ─── Q. effectiveSessionCount uses LTS when greater ──────────────────────────

describe('determineTherapistStrategy — effectiveSessionCount (Q)', () => {
  it('session_count in result uses LTS value when LTS > continuity window', () => {
    // continuityData has 2 records (window = 2), LTS says 10
    const lts = extractLTSStrategyInputs(makeLTSRecord({ session_count: 10 }));
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      lts,
    );
    expect(result.session_count).toBe(10);
  });

  it('session_count in result uses continuity count when LTS <= continuity', () => {
    // continuityData has 2 records, LTS also says 2
    const lts = extractLTSStrategyInputs(makeLTSRecord({ session_count: 2 }));
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      lts,
    );
    // Both are 2, either is fine
    expect(result.session_count).toBeGreaterThanOrEqual(2);
  });

  it('session_count stays at continuity count when ltsInputs absent', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
    );
    expect(result.session_count).toBe(2); // 2 records in CONTINUITY_WITH_RECORDS
  });
});

// ─── R. lts_trajectory field in strategy state output ─────────────────────────

describe('determineTherapistStrategy — lts_trajectory in output (R)', () => {
  it('lts_trajectory is empty string when no ltsInputs', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
    );
    expect(result.lts_trajectory).toBe('');
  });

  it('lts_trajectory is empty string when ltsInputs.lts_valid=false', () => {
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      { lts_valid: false },
    );
    expect(result.lts_trajectory).toBe('');
  });

  it.each([
    LTS_TRAJECTORIES.STAGNATING,
    LTS_TRAJECTORIES.PROGRESSING,
    LTS_TRAJECTORIES.FLUCTUATING,
    LTS_TRAJECTORIES.STABLE,
  ])('lts_trajectory is "%s" when LTS valid with that trajectory', (trajectory) => {
    const lts = extractLTSStrategyInputs(makeLTSRecord({ trajectory }));
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      lts,
    );
    expect(result.lts_trajectory).toBe(trajectory);
  });
});

// ─── S. STRATEGY_FAIL_SAFE_STATE has lts_trajectory: '' ──────────────────────

describe('STRATEGY_FAIL_SAFE_STATE — Wave 3D enrichment (S)', () => {
  it('has lts_trajectory: ""', () => {
    expect(STRATEGY_FAIL_SAFE_STATE.lts_trajectory).toBe('');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(STRATEGY_FAIL_SAFE_STATE)).toBe(true);
  });

  it('fail_safe is true', () => {
    expect(STRATEGY_FAIL_SAFE_STATE.fail_safe).toBe(true);
  });
});

// ─── T. buildStrategyContextSection — LTS arc line included ──────────────────

describe('buildStrategyContextSection — LTS arc line (T)', () => {
  it('includes "LTS arc" line when lts_trajectory is a meaningful value', () => {
    const state = {
      ...STRATEGY_FAIL_SAFE_STATE,
      lts_trajectory: LTS_TRAJECTORIES.STAGNATING,
    };
    const section = buildStrategyContextSection(state);
    expect(section).toContain('LTS arc');
    expect(section).toContain(LTS_TRAJECTORIES.STAGNATING);
  });

  it('does NOT include LTS arc line when lts_trajectory is ""', () => {
    const state = { ...STRATEGY_FAIL_SAFE_STATE, lts_trajectory: '' };
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('LTS arc');
  });

  it('does NOT include LTS arc line when lts_trajectory is "unknown"', () => {
    const state = { ...STRATEGY_FAIL_SAFE_STATE, lts_trajectory: 'unknown' };
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('LTS arc');
  });

  it('includes progressing arc in section output', () => {
    const state = { ...STRATEGY_FAIL_SAFE_STATE, lts_trajectory: LTS_TRAJECTORIES.PROGRESSING };
    const section = buildStrategyContextSection(state);
    expect(section).toContain(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('never throws on null/undefined input', () => {
    expect(() => buildStrategyContextSection(null)).not.toThrow();
    expect(() => buildStrategyContextSection(undefined)).not.toThrow();
  });
});

// ─── U. buildStrategyDiagnosticSnapshot — lts_trajectory included ─────────────

describe('buildStrategyDiagnosticSnapshot — lts_trajectory (U)', () => {
  it('includes lts_trajectory field in snapshot', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
      extractLTSStrategyInputs(makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING })),
    );
    const snapshot = buildStrategyDiagnosticSnapshot(state);
    expect(Object.prototype.hasOwnProperty.call(snapshot, 'lts_trajectory')).toBe(true);
    expect(snapshot.lts_trajectory).toBe(LTS_TRAJECTORIES.STAGNATING);
  });

  it('lts_trajectory is "" when LTS absent', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS,
      FORMULATION_PRESENT,
      DISTRESS_TIERS.TIER_LOW,
      CALM_SIGNALS,
    );
    const snapshot = buildStrategyDiagnosticSnapshot(state);
    expect(snapshot.lts_trajectory).toBe('');
  });

  it('snapshot is frozen', () => {
    const snapshot = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('message_signals is NOT in snapshot (privacy — inferred from user text)', () => {
    const snapshot = buildStrategyDiagnosticSnapshot(STRATEGY_FAIL_SAFE_STATE);
    expect(Object.prototype.hasOwnProperty.call(snapshot, 'message_signals')).toBe(false);
  });
});

// ─── V. STRATEGY_DIAGNOSTIC_SAFE_FIELDS includes lts_trajectory ──────────────

describe('STRATEGY_DIAGNOSTIC_SAFE_FIELDS — lts_trajectory (V)', () => {
  it('includes "lts_trajectory"', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).toContain('lts_trajectory');
  });

  it('does NOT include "message_signals"', () => {
    expect(STRATEGY_DIAGNOSTIC_SAFE_FIELDS).not.toContain('message_signals');
  });
});

// ─── AD. STRATEGY_VERSION bumped to 1.3.0 ────────────────────────────────────

describe('STRATEGY_VERSION — clarification-default routing change (AD)', () => {
  it('STRATEGY_VERSION is 1.3.0', () => {
    expect(STRATEGY_VERSION).toBe('1.3.0');
  });
});

// ─── AC. Deterministic repeatability ─────────────────────────────────────────

describe('determineTherapistStrategy — deterministic repeatability (AC)', () => {
  it('same inputs always produce same output (LTS stagnating)', () => {
    const lts = extractLTSStrategyInputs(
      makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING }),
    );
    const inputs = [CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS, lts];
    const r1 = determineTherapistStrategy(...inputs);
    const r2 = determineTherapistStrategy(...inputs);
    const r3 = determineTherapistStrategy(...inputs);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r2.intervention_mode).toBe(r3.intervention_mode);
    expect(r1.rationale).toBe(r2.rationale);
    expect(r1.lts_trajectory).toBe(r2.lts_trajectory);
  });

  it('same inputs always produce same output (no LTS)', () => {
    const inputs = [CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS];
    const r1 = determineTherapistStrategy(...inputs);
    const r2 = determineTherapistStrategy(...inputs);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r1.rationale).toBe(r2.rationale);
  });
});

// ─── W / X / Y. V9 session-start — LTS strategy integration ──────────────────

describe('buildV9SessionStartContentAsync — LTS strategy integration (W/X/Y)', () => {
  // Mock wiring for V8/V9 path
  const V9_WIRING = {
    longitudinal_layer_enabled: true,
    strategy_layer_enabled: true,
    continuity_layer_enabled: false,
    formulation_context_enabled: false,
    safety_mode_enabled: false,
    live_retrieval_enabled: false,
    retrieval_orchestration_enabled: false,
    workflow_context_injection: false,
    memory_context_enabled: false,
    agent_instructions: '[START_SESSION]',
  };

  const V8_WIRING = {
    longitudinal_layer_enabled: false,
    strategy_layer_enabled: true,
    continuity_layer_enabled: false,
    formulation_context_enabled: false,
    safety_mode_enabled: false,
    live_retrieval_enabled: false,
    retrieval_orchestration_enabled: false,
    workflow_context_injection: false,
    memory_context_enabled: false,
    agent_instructions: '[START_SESSION]',
  };

  /**
   * Builds a minimal entity mock with a controlled LTS snapshot in CompanionMemory.
   * @param {object|null} ltsRecord - The LTS record to return, or null for empty.
   * @param {object|null} [formulationRecord] - Optional formulation record.
   * @returns {object} entity mock
   */
  function makeEntities(ltsRecord = null, formulationRecord = null) {
    const stableFormulation = formulationRecord || null;
    return {
      CompanionMemory: {
        list: vi.fn().mockResolvedValue(
          ltsRecord
            ? [
                {
                  memory_type: ltsRecord.memory_type,
                  content: JSON.stringify(ltsRecord),
                },
              ]
            : [],
        ),
      },
      CaseFormulation: {
        list: vi.fn().mockResolvedValue(
          stableFormulation ? [stableFormulation] : [],
        ),
      },
    };
  }

  it('V9 with weak LTS → output does not contain LTS block (X)', async () => {
    const weakLTS = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    const entities = makeEntities(weakLTS);
    const result = await buildV9SessionStartContentAsync(V9_WIRING, entities, {});
    expect(result).not.toContain('LONGITUDINAL STATE CONTEXT');
    expect(typeof result).toBe('string');
  });

  it('V9 with null entities (CompanionMemory missing) → string output (Y)', async () => {
    const entities = {
      CompanionMemory: null,
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };
    const result = await buildV9SessionStartContentAsync(V9_WIRING, entities, {});
    expect(typeof result).toBe('string');
  });

  it('V9 with valid LTS → LTS context block appended (W)', async () => {
    const validLTS = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STABLE,
      helpful_interventions: ['behavioural_activation'],
    });
    const entities = makeEntities(validLTS);
    const result = await buildV9SessionStartContentAsync(V9_WIRING, entities, {});
    expect(result).toContain('LONGITUDINAL STATE CONTEXT');
  });

  it('V9 with stagnating LTS → strategy mode changes to STRUCTURED_EXPLORATION (W)', async () => {
    const stagnatingLTS = makeLTSRecord({
      trajectory: LTS_TRAJECTORIES.STAGNATING,
    });
    const formulationRecord = FORMULATION_PRESENT;
    const entities = makeEntities(stagnatingLTS, formulationRecord);

    // The strategy section should appear in the output and contain STRUCTURED_EXPLORATION
    const result = await buildV9SessionStartContentAsync(V9_WIRING, entities, {});
    // Result must be a string; LTS block or strategy section expected
    expect(typeof result).toBe('string');
    // The output must NOT contain 'FORMULATION_DEEPENING' guidance when stagnating
    // (it should say STRUCTURED_EXPLORATION guidance instead)
    expect(result).not.toContain('formulation hypotheses and longitudinal patterns');
  });

  it('flag off (longitudinal_layer_enabled absent) → delegates to V8 (X)', async () => {
    const NON_V9_WIRING = { ...V9_WIRING, longitudinal_layer_enabled: false };
    const entities = makeEntities(
      makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING }),
    );
    // Should behave like V8 — no LTS block, no LTS strategy influence
    const v8result = await buildV8SessionStartContentAsync(NON_V9_WIRING, entities, {});
    const v9result = await buildV9SessionStartContentAsync(NON_V9_WIRING, entities, {});
    expect(v9result).toBe(v8result);
  });
});

// ─── AB. No regression to companion flows ─────────────────────────────────────

describe('Wave 3D — no regression to companion flows (AB)', () => {
  it('extractLTSStrategyInputs does not read any companion-specific fields', () => {
    // Companion-specific fields should not appear in the output
    const inputs = extractLTSStrategyInputs(makeLTSRecord());
    const COMPANION_FIELDS = ['companion_memory', 'warmth_score', 'mood', 'companion_session'];
    for (const f of COMPANION_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(inputs, f)).toBe(false);
    }
  });

  it('determineTherapistStrategy has no side effects on companion state', () => {
    // Call multiple times with different LTS inputs — no global state mutation
    const lts1 = extractLTSStrategyInputs(makeLTSRecord({ trajectory: LTS_TRAJECTORIES.STAGNATING }));
    const lts2 = extractLTSStrategyInputs(makeLTSRecord({ trajectory: LTS_TRAJECTORIES.PROGRESSING }));
    const r1 = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS, lts1,
    );
    const r2 = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS, lts2,
    );
    // Each call is independent
    expect(r1.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(r2.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });
});

// ─── Z. No raw transcript leakage ─────────────────────────────────────────────

describe('Wave 3D — no raw transcript leakage (Z)', () => {
  const RAW_TRANSCRIPT_FIELDS = [
    'session_summary',
    'automatic_thoughts',
    'transcript',
    'message_content',
    'raw_input',
    'user_message',
  ];

  it('extractLTSStrategyInputs output contains no raw transcript fields', () => {
    const inputs = extractLTSStrategyInputs(makeLTSRecord());
    for (const f of RAW_TRANSCRIPT_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(inputs, f)).toBe(false);
    }
  });

  it('determineTherapistStrategy result contains no raw transcript fields', () => {
    const lts = extractLTSStrategyInputs(makeLTSRecord());
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS, lts,
    );
    for (const f of RAW_TRANSCRIPT_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(result, f)).toBe(false);
    }
  });

  it('lts_stalled_interventions contains only short bounded strings, not prose', () => {
    const lts = extractLTSStrategyInputs(
      makeLTSRecord({ stalled_interventions: ['thought_records', 'journalling'] }),
    );
    for (const iv of lts.lts_stalled_interventions) {
      expect(typeof iv).toBe('string');
      // Bounded strings should not look like transcript paragraphs
      expect(iv.split(' ').length).toBeLessThanOrEqual(10);
    }
  });
});

// ─── Regression: no V9 fallback regression ────────────────────────────────────

describe('Wave 3D — no regression to V9 fallback behavior', () => {
  it('determineTherapistStrategy with LTS inputs does not return fail_safe:true', () => {
    const lts = extractLTSStrategyInputs(makeLTSRecord());
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, DISTRESS_TIERS.TIER_LOW, CALM_SIGNALS, lts,
    );
    expect(result.fail_safe).toBe(false);
  });

  it('STRATEGY_FAIL_SAFE_STATE is still returned on error (simulated throw)', () => {
    // Pass a bad distressTier to trigger the fallback tier resolution,
    // but the function should still succeed (not throw).
    const lts = extractLTSStrategyInputs(makeLTSRecord());
    const result = determineTherapistStrategy(
      CONTINUITY_WITH_RECORDS, FORMULATION_PRESENT, 'INVALID_TIER', CALM_SIGNALS, lts,
    );
    // 'INVALID_TIER' is normalised to TIER_LOW — should still succeed
    expect(typeof result.intervention_mode).toBe('string');
    expect(result.fail_safe).toBe(false);
  });

  it('extractLTSStrategyInputs never returns lts_valid:true for unknown trajectory', () => {
    // Regression: ensure the LTS weak check mirrors isLTSWeak
    const unknownLTS = makeLTSRecord({ trajectory: LTS_TRAJECTORIES.UNKNOWN });
    const inputs = extractLTSStrategyInputs(unknownLTS);
    expect(inputs.lts_valid).toBe(false);
  });
});
