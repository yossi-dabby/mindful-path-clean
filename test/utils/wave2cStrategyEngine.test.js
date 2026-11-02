/**
 * @file test/utils/wave2cStrategyEngine.test.js
 *
 * Wave 2C — Therapeutic Strategy Engine Quality Improvements
 *
 * PURPOSE
 * -------
 * Validates the Wave 2C improvements to determineTherapistStrategy():
 *   1. scoreContinuityRichness() — new scoring function for continuity richness.
 *   2. scoreFormulationStrength() — new scoring function for formulation quality.
 *   3. Richer continuity → changes strategy choice appropriately.
 *   4. Repeated intervention saturation changes strategy choice.
 *   5. First-session safe defaults (regression check).
 *   6. Strong formulation + low distress path.
 *   7. Elevated distress / risk flag path.
 *   8. Ambiguous inputs → conservative result.
 *   9. Deterministic repeatability.
 *  10. No regression to existing Wave 2A / Wave 2B integration assumptions.
 *  11. New TherapistStrategyState enrichment fields.
 *  12. buildStrategyContextSection updated output (WAVE 2C header, context signals).
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import any runtime modules (agentWiring, featureFlags, Chat, etc.).
 * - Does NOT enable any feature flags.
 * - All flags remain at their default (false) state.
 * - Tests are pure and deterministic — no async, no network.
 *
 * Source of truth: Wave 2C problem statement.
 */

import { describe, it, expect } from 'vitest';

import {
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  MESSAGE_SIGNAL_KEYS,
  STRATEGY_FAIL_SAFE_STATE,
  CONTINUITY_RICHNESS_THRESHOLDS,
  FORMULATION_STRENGTH_THRESHOLDS,
  extractMessageSignals,
  scoreDistressTier,
  scoreContinuityRichness,
  scoreFormulationStrength,
  determineTherapistStrategy,
  buildStrategyContextSection,
} from '../../src/lib/therapistStrategyEngine.js';

// ─── Section 1 — New Wave 2C exports ─────────────────────────────────────────

describe('Wave 2C — New exports exist and have correct shapes', () => {
  it('CONTINUITY_RICHNESS_THRESHOLDS is exported as a frozen object', () => {
    expect(typeof CONTINUITY_RICHNESS_THRESHOLDS).toBe('object');
    expect(Object.isFrozen(CONTINUITY_RICHNESS_THRESHOLDS)).toBe(true);
  });

  it('CONTINUITY_RICHNESS_THRESHOLDS has MINIMAL, MODERATE, RICH keys', () => {
    expect(typeof CONTINUITY_RICHNESS_THRESHOLDS.MINIMAL).toBe('number');
    expect(typeof CONTINUITY_RICHNESS_THRESHOLDS.MODERATE).toBe('number');
    expect(typeof CONTINUITY_RICHNESS_THRESHOLDS.RICH).toBe('number');
  });

  it('CONTINUITY_RICHNESS_THRESHOLDS values are ascending', () => {
    expect(CONTINUITY_RICHNESS_THRESHOLDS.MINIMAL).toBeLessThan(
      CONTINUITY_RICHNESS_THRESHOLDS.MODERATE,
    );
    expect(CONTINUITY_RICHNESS_THRESHOLDS.MODERATE).toBeLessThan(
      CONTINUITY_RICHNESS_THRESHOLDS.RICH,
    );
  });

  it('FORMULATION_STRENGTH_THRESHOLDS is exported as a frozen object', () => {
    expect(typeof FORMULATION_STRENGTH_THRESHOLDS).toBe('object');
    expect(Object.isFrozen(FORMULATION_STRENGTH_THRESHOLDS)).toBe(true);
  });

  it('FORMULATION_STRENGTH_THRESHOLDS has THIN, MODERATE, STRONG keys', () => {
    expect(typeof FORMULATION_STRENGTH_THRESHOLDS.THIN).toBe('number');
    expect(typeof FORMULATION_STRENGTH_THRESHOLDS.MODERATE).toBe('number');
    expect(typeof FORMULATION_STRENGTH_THRESHOLDS.STRONG).toBe('number');
  });

  it('FORMULATION_STRENGTH_THRESHOLDS values are ascending', () => {
    expect(FORMULATION_STRENGTH_THRESHOLDS.THIN).toBeLessThan(
      FORMULATION_STRENGTH_THRESHOLDS.MODERATE,
    );
    expect(FORMULATION_STRENGTH_THRESHOLDS.MODERATE).toBeLessThan(
      FORMULATION_STRENGTH_THRESHOLDS.STRONG,
    );
  });

  it('scoreContinuityRichness is exported as a function', () => {
    expect(typeof scoreContinuityRichness).toBe('function');
  });

  it('scoreFormulationStrength is exported as a function', () => {
    expect(typeof scoreFormulationStrength).toBe('function');
  });

  it('STRATEGY_VERSION is 1.3.0 (clarification-default routing change)', () => {
    expect(STRATEGY_VERSION).toBe('1.3.0');
  });
});

// ─── Section 2 — scoreContinuityRichness ─────────────────────────────────────

describe('Wave 2C — scoreContinuityRichness', () => {
  it('null → 0', () => {
    expect(scoreContinuityRichness(null)).toBe(0);
  });

  it('undefined → 0', () => {
    expect(scoreContinuityRichness(undefined)).toBe(0);
  });

  it('empty records array → 0', () => {
    expect(scoreContinuityRichness({ records: [] })).toBe(0);
  });

  it('1 session, no tasks, no patterns, no risk → MINIMAL (= 2)', () => {
    const result = scoreContinuityRichness({
      records: [{ session_summary: 'First session' }],
    });
    expect(result).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.MINIMAL);
    expect(result).toBeLessThan(CONTINUITY_RICHNESS_THRESHOLDS.MODERATE);
  });

  it('2 sessions → score >= MODERATE', () => {
    const result = scoreContinuityRichness({
      records: [
        { session_summary: 'Session 1' },
        { session_summary: 'Session 2' },
      ],
    });
    expect(result).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.MODERATE);
  });

  it('1 session + open follow-up tasks → score >= MODERATE (tasks are heavily weighted)', () => {
    const result = scoreContinuityRichness({
      records: [{ session_summary: 'Session 1', follow_up_tasks: ['Task A'] }],
    });
    expect(result).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.MODERATE);
  });

  it('2 sessions + follow-up tasks + patterns → score >= RICH', () => {
    const result = scoreContinuityRichness({
      records: [
        {
          session_summary: 'Session 1',
          core_patterns: ['avoidance'],
          follow_up_tasks: ['homework'],
        },
        {
          session_summary: 'Session 2',
          interventions_used: ['thought_record'],
        },
      ],
    });
    expect(result).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.RICH);
  });

  it('risk flags present → increases score by at least 2', () => {
    const withoutRisk = scoreContinuityRichness({
      records: [{ session_summary: 'Session' }],
    });
    const withRisk = scoreContinuityRichness({
      records: [{ session_summary: 'Session', risk_flags: ['suicidal_ideation'] }],
    });
    expect(withRisk).toBeGreaterThanOrEqual(withoutRisk + 2);
  });

  it('aggregated shape (sessionCount) → score matches records shape equivalent', () => {
    const aggregatedResult = scoreContinuityRichness({
      sessionCount: 2,
      recurringPatterns: ['avoidance'],
      openFollowUpTasks: ['task'],
      interventionsUsed: ['thought_record'],
      riskFlags: [],
    });
    expect(aggregatedResult).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.RICH);
  });

  it('aggregated shape with risk flags → score includes risk bonus', () => {
    const withRisk = scoreContinuityRichness({
      sessionCount: 1,
      recurringPatterns: [],
      openFollowUpTasks: [],
      interventionsUsed: [],
      riskFlags: ['self_harm'],
    });
    expect(withRisk).toBeGreaterThanOrEqual(CONTINUITY_RICHNESS_THRESHOLDS.MODERATE);
  });

  it('never throws for arbitrary inputs', () => {
    expect(() => scoreContinuityRichness(42)).not.toThrow();
    expect(() => scoreContinuityRichness('bad')).not.toThrow();
    expect(() => scoreContinuityRichness({})).not.toThrow();
  });

  it('is deterministic for same input', () => {
    const input = {
      records: [{ session_summary: 'x', follow_up_tasks: ['t'], core_patterns: ['p'] }],
    };
    expect(scoreContinuityRichness(input)).toBe(scoreContinuityRichness(input));
  });
});

// ─── Section 3 — scoreFormulationStrength ────────────────────────────────────

describe('Wave 2C — scoreFormulationStrength', () => {
  it('null → 0', () => {
    expect(scoreFormulationStrength(null)).toBe(0);
  });

  it('undefined → 0', () => {
    expect(scoreFormulationStrength(undefined)).toBe(0);
  });

  it('empty object → 0', () => {
    expect(scoreFormulationStrength({})).toBe(0);
  });

  it('all-null fields → 0', () => {
    expect(scoreFormulationStrength({ presenting_problem: null, core_belief: null })).toBe(0);
  });

  it('1 non-empty field (>= 8 chars) → score >= THIN', () => {
    const result = scoreFormulationStrength({ working_hypotheses: 'Schema work ongoing' });
    expect(result).toBeGreaterThanOrEqual(FORMULATION_STRENGTH_THRESHOLDS.THIN);
    expect(result).toBeLessThan(FORMULATION_STRENGTH_THRESHOLDS.MODERATE);
  });

  it('short string (< 8 chars) → not counted', () => {
    expect(scoreFormulationStrength({ presenting_problem: 'ok' })).toBe(0);
  });

  it('2 non-empty fields → score >= MODERATE', () => {
    const result = scoreFormulationStrength({
      presenting_problem: 'Persistent anxiety and catastrophising',
      core_belief: 'I am fundamentally incompetent',
    });
    expect(result).toBeGreaterThanOrEqual(FORMULATION_STRENGTH_THRESHOLDS.MODERATE);
  });

  it('3 non-empty fields → score >= STRONG', () => {
    const result = scoreFormulationStrength({
      presenting_problem: 'Persistent anxiety and catastrophising',
      core_belief: 'I am fundamentally incompetent',
      maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
    });
    expect(result).toBeGreaterThanOrEqual(FORMULATION_STRENGTH_THRESHOLDS.STRONG);
  });

  it('4-field full formulation → score = 4', () => {
    const result = scoreFormulationStrength({
      presenting_problem: 'Persistent work-related anxiety',
      core_belief: 'I am fundamentally incompetent',
      maintaining_cycle: 'Avoidance → missed deadlines',
      treatment_goals: 'Challenge core belief and build tolerance',
    });
    expect(result).toBe(4);
  });

  it('working_hypotheses as non-empty string → counts as 1 field', () => {
    const result = scoreFormulationStrength({
      working_hypotheses: 'Abandonment schema active',
    });
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('working_hypotheses as non-empty array → counts as 1 field', () => {
    const result = scoreFormulationStrength({
      working_hypotheses: ['schema1', 'schema2'],
    });
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('empty array → not counted', () => {
    expect(scoreFormulationStrength({ working_hypotheses: [] })).toBe(0);
  });

  it('never throws for arbitrary inputs', () => {
    expect(() => scoreFormulationStrength(42)).not.toThrow();
    expect(() => scoreFormulationStrength('bad')).not.toThrow();
    expect(() => scoreFormulationStrength([])).not.toThrow();
  });

  it('is deterministic for same input', () => {
    const input = { presenting_problem: 'Anxiety', core_belief: 'I am not good enough' };
    expect(scoreFormulationStrength(input)).toBe(scoreFormulationStrength(input));
  });
});

// ─── Section 4 — Risk flags in continuity → STABILISATION ────────────────────

describe('Wave 2C — Risk flags in continuity → STABILISATION for low/mild distress', () => {
  it('continuity with risk_flags + TIER_LOW → STABILISATION', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Explored self-harm ideation',
            risk_flags: ['self_harm_ideation'],
            follow_up_tasks: [],
          },
        ],
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.has_risk_flags).toBe(true);
  });

  it('continuity with risk_flags + TIER_MILD → STABILISATION', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Some context',
            risk_flags: ['passive_suicidal_ideation'],
          },
        ],
      },
      { working_hypotheses: 'Depression schema' },
      DISTRESS_TIERS.TIER_MILD,
      extractMessageSignals('I have been feeling a bit sad lately.'),
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('risk_flags_present_stabilisation');
  });

  it('risk flags in continuity + formulation + low distress → STABILISATION (overrides deepening)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Prior content',
            risk_flags: ['suicidal_ideation'],
          },
        ],
      },
      {
        presenting_problem: 'Persistent anxiety and depression',
        core_belief: 'I am a burden to others',
        maintaining_cycle: 'Withdrawal → isolation → confirmation',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.has_risk_flags).toBe(true);
    expect(result.rationale).toBe('risk_flags_present_stabilisation');
  });

  it('TIER_HIGH with risk flags → still CONTAINMENT (safety contract unbroken)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Crisis session',
            risk_flags: ['active_self_harm'],
          },
        ],
      },
      null,
      DISTRESS_TIERS.TIER_HIGH,
      extractMessageSignals('I feel completely hopeless and cannot go on.'),
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('continuity WITHOUT risk flags + TIER_LOW → does NOT produce STABILISATION via this rule', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Explored schemas',
            risk_flags: [],
          },
        ],
      },
      { working_hypotheses: 'Perfectionism core belief' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    // Should NOT be STABILISATION (risk rule did not fire)
    expect(result.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('aggregated shape with riskFlags active → STABILISATION', () => {
    const result = determineTherapistStrategy(
      {
        sessionCount: 2,
        recurringPatterns: ['avoidance'],
        openFollowUpTasks: [],
        interventionsUsed: ['thought_record'],
        riskFlags: ['passive_suicidal_ideation'],
        recentSummary: 'Recent session content',
      },
      { working_hypotheses: 'Abandonment schema' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.has_risk_flags).toBe(true);
  });
});

// ─── Section 5 — Intervention saturation → STRUCTURED_EXPLORATION ─────────────

describe('Wave 2C — Intervention saturation → STRUCTURED_EXPLORATION', () => {
  it('3 sessions + 1 unique intervention + formulation → STRUCTURED_EXPLORATION (not deepening)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          { session_summary: 'Session 1', interventions_used: ['thought_record'] },
          { session_summary: 'Session 2', interventions_used: ['thought_record'] },
          { session_summary: 'Session 3', interventions_used: ['thought_record'] },
        ],
      },
      {
        presenting_problem: 'Work-related anxiety and catastrophising',
        core_belief: 'I am fundamentally incompetent',
        maintaining_cycle: 'Avoidance → deadlines → confirmation',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.intervention_saturated).toBe(true);
    expect(result.rationale).toBe('intervention_saturated_structured_exploration');
  });

  it('2 sessions + 1 unique intervention + formulation → still FORMULATION_DEEPENING (not yet saturated)', () => {
    // Saturation requires >= 3 sessions to avoid false positives
    const result = determineTherapistStrategy(
      {
        records: [
          { session_summary: 'Session 1', interventions_used: ['thought_record'] },
          { session_summary: 'Session 2', interventions_used: ['thought_record'] },
        ],
      },
      { working_hypotheses: 'Perfectionism schema present' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.intervention_saturated).toBe(false);
  });

  it('3 sessions + 2 unique interventions → NOT saturated (variety present)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          { session_summary: 'Session 1', interventions_used: ['thought_record'] },
          { session_summary: 'Session 2', interventions_used: ['behavioural_activation'] },
          { session_summary: 'Session 3', interventions_used: ['thought_record'] },
        ],
      },
      { working_hypotheses: 'Perfectionism schema' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    // Multiple unique interventions → not saturated → deepening is appropriate
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.intervention_saturated).toBe(false);
  });

  it('3 sessions + single intervention + NO formulation → NOT affected by saturation rule (no formulation)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          { session_summary: 'Session 1', interventions_used: ['thought_record'] },
          { session_summary: 'Session 2', interventions_used: ['thought_record'] },
          { session_summary: 'Session 3', interventions_used: ['thought_record'] },
        ],
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    // Saturation rule only fires when both formulation AND continuity present
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    // Mode is the same but rationale differs — it's via the partial-context path
    expect(result.intervention_saturated).toBe(false);
  });

  it('aggregated shape: sessionCount=3, interventionsUsed=[1 unique] → saturated', () => {
    const result = determineTherapistStrategy(
      {
        sessionCount: 3,
        recurringPatterns: ['avoidance'],
        openFollowUpTasks: [],
        interventionsUsed: ['thought_record'],
        riskFlags: [],
        recentSummary: 'Recent session',
      },
      {
        presenting_problem: 'Chronic anxiety',
        core_belief: 'I am not capable',
        maintaining_cycle: 'Avoidance → confirmation',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.intervention_saturated).toBe(true);
  });
});

// ─── Section 6 — Returning user + open follow-up tasks ───────────────────────

describe('Wave 2C — Returning user + open follow-up tasks enriches strategy', () => {
  it('continuity + open tasks + formulation → FORMULATION_DEEPENING with enriched rationale', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Explored abandonment schema',
            core_patterns: ['avoidance'],
            follow_up_tasks: ['Complete daily thought record'],
          },
        ],
      },
      {
        presenting_problem: 'Persistent anxiety and social withdrawal',
        core_belief: 'I am fundamentally unlovable',
        maintaining_cycle: 'Withdrawal → confirmation of belief',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.rationale).toBe('returning_user_open_tasks_formulation_deepening');
    expect(result.has_open_tasks).toBe(true);
  });

  it('continuity + open tasks + NO formulation → STRUCTURED_EXPLORATION with open-tasks rationale', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Discussed work stress',
            follow_up_tasks: ['Monitor anxiety triggers this week'],
          },
        ],
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('open_tasks_continuity_structured');
    expect(result.has_open_tasks).toBe(true);
  });

  it('continuity + NO open tasks + formulation → standard deepening rationale (not open-tasks variant)', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Explored schemas, no pending tasks',
          },
        ],
      },
      { working_hypotheses: 'Core belief: I am not good enough' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.rationale).toBe('formulation_and_continuity_deepening');
    expect(result.has_open_tasks).toBe(false);
  });

  it('continuity + NO open tasks + NO formulation → partial-context rationale (not open-tasks variant)', () => {
    const result = determineTherapistStrategy(
      {
        records: [{ session_summary: 'Discussed work stress' }],
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('partial_context_structured_exploration');
    expect(result.has_open_tasks).toBe(false);
  });

  it('aggregated shape with open follow-up tasks → open-tasks rationale', () => {
    const result = determineTherapistStrategy(
      {
        sessionCount: 1,
        recurringPatterns: [],
        openFollowUpTasks: ['Practice grounding technique'],
        interventionsUsed: [],
        riskFlags: [],
        recentSummary: 'Good session',
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.has_open_tasks).toBe(true);
    expect(result.rationale).toBe('open_tasks_continuity_structured');
  });
});

// ─── Section 7 — First-session safe defaults (Wave 2A regression) ─────────────

describe('Wave 2C — First-session safe defaults (no regression)', () => {
  it('null continuity + null formulation + TIER_LOW → PSYCHOEDUCATION (unchanged)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(result.rationale).toBe('no_context_psychoeducation');
    expect(result.session_count).toBe(0);
  });

  it('empty records + null formulation + TIER_LOW → PSYCHOEDUCATION (unchanged)', () => {
    const result = determineTherapistStrategy({ records: [] }, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('first session has_risk_flags=false, has_open_tasks=false on PSYCHOEDUCATION result', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.has_risk_flags).toBe(false);
    expect(result.has_open_tasks).toBe(false);
  });

  it('TIER_HIGH on first session → CONTAINMENT (safety contract unbroken)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('TIER_MODERATE on first session → STABILISATION (unchanged)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MODERATE, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });
});

// ─── Section 8 — Strong formulation + low distress ───────────────────────────

describe('Wave 2C — Strong formulation + low distress', () => {
  it('strong formulation (3 fields) + continuity + TIER_LOW → FORMULATION_DEEPENING', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior session' }] },
      {
        presenting_problem: 'Persistent anxiety and catastrophising at work',
        core_belief: 'I am fundamentally incompetent and will be found out',
        maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.formulation_strength_score).toBeGreaterThanOrEqual(
      FORMULATION_STRENGTH_THRESHOLDS.STRONG,
    );
  });

  it('thin formulation (1 field) + no continuity → STRUCTURED_EXPLORATION (not deepening)', () => {
    const result = determineTherapistStrategy(
      null,
      { working_hypotheses: 'Some hypothesis' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.formulation_strength_score).toBeLessThan(FORMULATION_STRENGTH_THRESHOLDS.STRONG);
  });

  it('formulation_strength_score reflects field count accurately', () => {
    const thin = determineTherapistStrategy(
      null,
      { working_hypotheses: 'Single field only' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const strong = determineTherapistStrategy(
      null,
      {
        presenting_problem: 'Work-related anxiety',
        core_belief: 'I am incompetent',
        maintaining_cycle: 'Avoidance cycle',
        treatment_goals: 'Challenge core belief',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(strong.formulation_strength_score).toBeGreaterThan(thin.formulation_strength_score);
  });

  it('strong formulation + no continuity + TIER_MILD → STRUCTURED_EXPLORATION (needs continuity for deepening)', () => {
    // Even with a strong formulation, without prior sessions there is no
    // longitudinal context to "deepen into" — structured exploration is safe.
    const result = determineTherapistStrategy(
      null,
      {
        presenting_problem: 'Persistent anxiety and catastrophising',
        core_belief: 'I am fundamentally incompetent',
        maintaining_cycle: 'Avoidance → confirmation of belief',
        treatment_goals: 'Challenge core belief',
      },
      DISTRESS_TIERS.TIER_MILD,
      extractMessageSignals('I have been feeling quite worried lately.'),
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.formulation_present).toBe(true);
    expect(result.continuity_present).toBe(false);
  });
});

// ─── Section 9 — Elevated distress / risk flag path ──────────────────────────

describe('Wave 2C — Elevated distress / risk flag path', () => {
  it('TIER_HIGH always → CONTAINMENT regardless of continuity or formulation', () => {
    const result = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'Rich prior session',
            risk_flags: ['self_harm_ideation'],
            follow_up_tasks: ['Task'],
            interventions_used: ['thought_record'],
          },
        ],
      },
      {
        presenting_problem: 'Persistent anxiety',
        core_belief: 'I am fundamentally incompetent',
        maintaining_cycle: 'Avoidance → confirmation',
      },
      DISTRESS_TIERS.TIER_HIGH,
      extractMessageSignals('I feel completely hopeless and cannot go on.'),
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result.rationale).toBe('tier_high_containment_mandatory');
  });

  it('TIER_HIGH produces has_risk_flags=true when continuity has risk flags', () => {
    const result = determineTherapistStrategy(
      {
        records: [{ session_summary: 'Session', risk_flags: ['suicidal_ideation'] }],
      },
      null,
      DISTRESS_TIERS.TIER_HIGH,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result.has_risk_flags).toBe(true);
  });

  it('TIER_MODERATE → STABILISATION (unchanged, safety context preserved)', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior session' }] },
      { working_hypotheses: 'Schema present' },
      DISTRESS_TIERS.TIER_MODERATE,
      extractMessageSignals('I am overwhelmed today.'),
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });

  it('safety_mode: true from safetyResult → CONTAINMENT end-to-end', () => {
    const ms = extractMessageSignals('Everything is fine today.');
    const tier = scoreDistressTier({ safety_mode: true }, ms);
    const result = determineTherapistStrategy(null, null, tier, ms);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });
});

// ─── Section 10 — Ambiguous inputs → conservative defaults ───────────────────

describe('Wave 2C — Ambiguous inputs → conservative defaults (no regression)', () => {
  it('all null inputs → PSYCHOEDUCATION (unchanged)', () => {
    const result = determineTherapistStrategy(null, null, null, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(result.fail_safe).toBe(false);
  });

  it('invalid tier string → treated as TIER_LOW → PSYCHOEDUCATION (unchanged)', () => {
    const result = determineTherapistStrategy(null, null, 'INVALID_TIER', null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('bad continuityData type → session_count defaults to 0', () => {
    const result = determineTherapistStrategy('bad_value', null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.session_count).toBe(0);
    expect(result.has_risk_flags).toBe(false);
  });

  it('bad formulationData type → formulation_strength_score is 0', () => {
    const result = determineTherapistStrategy(null, 42, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.formulation_strength_score).toBe(0);
  });

  it('never throws for any input combination', () => {
    expect(() => determineTherapistStrategy(null, null, null, null)).not.toThrow();
    expect(() => determineTherapistStrategy({}, {}, 'bad', 'bad')).not.toThrow();
    expect(() => determineTherapistStrategy([], [], undefined, undefined)).not.toThrow();
  });
});

// ─── Section 11 — New TherapistStrategyState enrichment fields ────────────────

describe('Wave 2C — TherapistStrategyState enrichment fields present in all results', () => {
  const ALL_CASES = [
    ['CONTAINMENT', null, null, DISTRESS_TIERS.TIER_HIGH, null],
    ['STABILISATION', null, null, DISTRESS_TIERS.TIER_MODERATE, null],
    ['PSYCHOEDUCATION', null, null, DISTRESS_TIERS.TIER_LOW, null],
    [
      'STRUCTURED_EXPLORATION',
      { records: [{ session_summary: 'x' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    ],
    [
      'FORMULATION_DEEPENING',
      { records: [{ session_summary: 'x' }] },
      { working_hypotheses: 'Schema present' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    ],
  ];

  for (const [label, cont, form, tier, ms] of ALL_CASES) {
    it(`${label}: result has session_count (number)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.session_count).toBe('number');
    });

    it(`${label}: result has has_risk_flags (boolean)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.has_risk_flags).toBe('boolean');
    });

    it(`${label}: result has has_open_tasks (boolean)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.has_open_tasks).toBe('boolean');
    });

    it(`${label}: result has intervention_saturated (boolean)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.intervention_saturated).toBe('boolean');
    });

    it(`${label}: result has continuity_richness_score (number >= 0)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.continuity_richness_score).toBe('number');
      expect(result.continuity_richness_score).toBeGreaterThanOrEqual(0);
    });

    it(`${label}: result has formulation_strength_score (number >= 0)`, () => {
      const result = determineTherapistStrategy(cont, form, tier, ms);
      expect(typeof result.formulation_strength_score).toBe('number');
      expect(result.formulation_strength_score).toBeGreaterThanOrEqual(0);
    });
  }

  it('STRATEGY_FAIL_SAFE_STATE has all new Wave 2C fields', () => {
    expect(typeof STRATEGY_FAIL_SAFE_STATE.session_count).toBe('number');
    expect(typeof STRATEGY_FAIL_SAFE_STATE.has_risk_flags).toBe('boolean');
    expect(typeof STRATEGY_FAIL_SAFE_STATE.has_open_tasks).toBe('boolean');
    expect(typeof STRATEGY_FAIL_SAFE_STATE.intervention_saturated).toBe('boolean');
    expect(typeof STRATEGY_FAIL_SAFE_STATE.continuity_richness_score).toBe('number');
    expect(typeof STRATEGY_FAIL_SAFE_STATE.formulation_strength_score).toBe('number');
  });

  it('result is still frozen (immutable) with new fields', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'x' }] },
      { working_hypotheses: 'Schema' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('continuity_richness_score = 0 when no continuity provided', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.continuity_richness_score).toBe(0);
  });

  it('continuity_richness_score > 0 when continuity has data', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Prior session' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.continuity_richness_score).toBeGreaterThan(0);
  });
});

// ─── Section 12 — buildStrategyContextSection Wave 2C output ─────────────────

describe('Wave 2C — buildStrategyContextSection updated output', () => {
  it('section header contains WAVE 2C (not WAVE 2A)', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('WAVE 2C');
    expect(section).not.toContain('WAVE 2A');
  });

  it('section still contains === THERAPEUTIC STRATEGY (unchanged structure)', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('=== THERAPEUTIC STRATEGY');
    expect(section).toContain('=== END THERAPEUTIC STRATEGY ===');
  });

  it('section still contains Intervention mode, Distress tier, Prior continuity, Formulation active', () => {
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Intervention mode');
    expect(section).toContain('Distress tier');
    expect(section).toContain('Prior continuity');
    expect(section).toContain('Formulation active');
  });

  it('risk flags active → context signals block appears in section', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'Session', risk_flags: ['suicidal_ideation'] }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Risk flags');
    expect(section).toContain('active');
  });

  it('open tasks pending → context signals block appears in section', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'Session', follow_up_tasks: ['Task A'] }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Open tasks');
    expect(section).toContain('pending');
  });

  it('intervention saturated → context signals block appears in section', () => {
    const state = determineTherapistStrategy(
      {
        records: [
          { session_summary: 'S1', interventions_used: ['thought_record'] },
          { session_summary: 'S2', interventions_used: ['thought_record'] },
          { session_summary: 'S3', interventions_used: ['thought_record'] },
        ],
      },
      {
        presenting_problem: 'Anxiety',
        core_belief: 'I am incompetent',
        maintaining_cycle: 'Avoidance cycle',
      },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Intervention sat.');
    expect(section).toContain('flagged');
  });

  it('session count > 0 → Sessions count appears in context signals', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'Session' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('Sessions');
  });

  it('no session context → context signals block absent from section', () => {
    // No continuity, no formulation → session_count=0, no risk flags, no tasks
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('Context signals:');
  });

  it('section does not leak raw content from continuity', () => {
    const state = determineTherapistStrategy(
      {
        records: [
          {
            session_summary: 'SENSITIVE_CONTENT_XYZ',
            risk_flags: ['suicidal_ideation'],
          },
        ],
      },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('SENSITIVE_CONTENT_XYZ');
  });

  it('null state → returns safe fallback string containing WAVE 2C', () => {
    const section = buildStrategyContextSection(null);
    expect(section).toContain('WAVE 2C');
    expect(typeof section).toBe('string');
    expect(section.length).toBeGreaterThan(0);
  });
});

// ─── Section 13 — Deterministic repeatability ────────────────────────────────

describe('Wave 2C — Deterministic repeatability', () => {
  it('scoreContinuityRichness is deterministic for same input', () => {
    const input = {
      records: [{ session_summary: 'x', follow_up_tasks: ['t'], core_patterns: ['p'] }],
    };
    const r1 = scoreContinuityRichness(input);
    const r2 = scoreContinuityRichness(input);
    expect(r1).toBe(r2);
  });

  it('scoreFormulationStrength is deterministic for same input', () => {
    const input = {
      presenting_problem: 'Anxiety',
      core_belief: 'I am not enough',
    };
    const r1 = scoreFormulationStrength(input);
    const r2 = scoreFormulationStrength(input);
    expect(r1).toBe(r2);
  });

  it('determineTherapistStrategy is deterministic for risk-flag path', () => {
    const cont = { records: [{ session_summary: 'x', risk_flags: ['self_harm'] }] };
    const form = { working_hypotheses: 'Abandonment schema' };
    const r1 = determineTherapistStrategy(cont, form, DISTRESS_TIERS.TIER_LOW, null);
    const r2 = determineTherapistStrategy(cont, form, DISTRESS_TIERS.TIER_LOW, null);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r1.rationale).toBe(r2.rationale);
  });

  it('determineTherapistStrategy is deterministic for saturation path', () => {
    const cont = {
      records: [
        { session_summary: 'S1', interventions_used: ['thought_record'] },
        { session_summary: 'S2', interventions_used: ['thought_record'] },
        { session_summary: 'S3', interventions_used: ['thought_record'] },
      ],
    };
    const form = {
      presenting_problem: 'Anxiety',
      core_belief: 'I am incompetent',
      maintaining_cycle: 'Avoidance',
    };
    const r1 = determineTherapistStrategy(cont, form, DISTRESS_TIERS.TIER_LOW, null);
    const r2 = determineTherapistStrategy(cont, form, DISTRESS_TIERS.TIER_LOW, null);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r1.rationale).toBe(r2.rationale);
    expect(r1.intervention_saturated).toBe(r2.intervention_saturated);
  });

  it('buildStrategyContextSection is deterministic for same state', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_summary: 'x', risk_flags: ['r'], follow_up_tasks: ['t'] }] },
      { working_hypotheses: 'Schema' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(buildStrategyContextSection(state)).toBe(buildStrategyContextSection(state));
  });
});

// ─── Section 14 — Wave 2A / 2B no-regression check ───────────────────────────

describe('Wave 2C — No regression to Wave 2A / 2B assumptions', () => {
  it('TIER_HIGH + null inputs → CONTAINMENT (Wave 2A contract)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_HIGH, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result.rationale).toBe('tier_high_containment_mandatory');
  });

  it('TIER_MODERATE + null inputs → STABILISATION (Wave 2A contract)', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MODERATE, null);
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(result.rationale).toBe('tier_moderate_stabilisation');
  });

  it('no continuity + no formulation → PSYCHOEDUCATION rationale unchanged', () => {
    const result = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_LOW, null);
    expect(result.rationale).toBe('no_context_psychoeducation');
  });

  it('continuity only (no tasks, no formulation) → STRUCTURED_EXPLORATION (Wave 2A contract)', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Discussed work stress' }] },
      null,
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.rationale).toBe('partial_context_structured_exploration');
  });

  it('formulation only + no continuity + TIER_LOW → STRUCTURED_EXPLORATION (Wave 2A contract)', () => {
    const result = determineTherapistStrategy(
      null,
      { working_hypotheses: 'Perfectionism schema' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(result.continuity_present).toBe(false);
    expect(result.formulation_present).toBe(true);
  });

  it('formulation + continuity (no tasks, no risk) + TIER_LOW → FORMULATION_DEEPENING rationale unchanged', () => {
    const result = determineTherapistStrategy(
      { records: [{ session_summary: 'Explored schemas' }] },
      { working_hypotheses: 'Core belief: I am unlovable' },
      DISTRESS_TIERS.TIER_LOW,
      null,
    );
    expect(result.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(result.rationale).toBe('formulation_and_continuity_deepening');
  });

  it('STRATEGY_VERSION is now 1.3.0 (clarification-default routing change)', () => {
    expect(STRATEGY_VERSION).toBe('1.3.0');
  });

  it('STRATEGY_FAIL_SAFE_STATE.strategy_version matches STRATEGY_VERSION', () => {
    expect(STRATEGY_FAIL_SAFE_STATE.strategy_version).toBe(STRATEGY_VERSION);
  });

  it('bounded mode set is still exactly 5 modes (no new modes added)', () => {
    expect(Object.keys(STRATEGY_INTERVENTION_MODES)).toHaveLength(5);
  });
});

// ─── Section 15 — Full pipeline integration (end-to-end, Wave 2C) ────────────

describe('Wave 2C — Full pipeline integration', () => {
  it('returning client with risk history + hopeless message → CONTAINMENT (safety first)', () => {
    const messageText = 'I feel hopeless again, nothing will ever change.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const cont = {
      records: [{ session_summary: 'Prior', risk_flags: ['passive_suicidal_ideation'] }],
    };
    const state = determineTherapistStrategy(cont, null, tier, ms);
    // Hopelessness language → TIER_HIGH → CONTAINMENT
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('returning client with open tasks + moderate distress → STABILISATION (stabilise first)', () => {
    const messageText = 'I am so overwhelmed with everything right now.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    // TIER_MODERATE with open tasks still → STABILISATION
    const cont = {
      records: [{ session_summary: 'Prior', follow_up_tasks: ['Task A'] }],
    };
    const state = determineTherapistStrategy(cont, null, tier, ms);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('returning client with risk flags + low distress → STABILISATION (risk-aware)', () => {
    const messageText = 'I feel okay today, just checking in.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const cont = {
      records: [{ session_summary: 'Prior', risk_flags: ['passive_self_harm'] }],
    };
    const state = determineTherapistStrategy(cont, null, tier, ms);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(state.has_risk_flags).toBe(true);
  });

  it('returning client with open tasks + formulation + low distress → FORMULATION_DEEPENING', () => {
    const messageText = 'I want to continue working on the patterns we identified.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const cont = {
      records: [{ session_summary: 'Prior', follow_up_tasks: ['Daily thought record'] }],
    };
    const form = { working_hypotheses: 'Perfectionism core belief actively maintained' };
    const state = determineTherapistStrategy(cont, form, tier, ms);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(state.has_open_tasks).toBe(true);
    const section = buildStrategyContextSection(state);
    expect(section).toContain('WAVE 2C');
    expect(section).toContain('formulation_deepening');
    expect(section).not.toContain('SENSITIVE');
  });

  it('saturated intervention arc → structured exploration end-to-end', () => {
    const messageText = 'I have been continuing to use the thought record every day.';
    const ms = extractMessageSignals(messageText);
    const tier = scoreDistressTier({}, ms);
    const cont = {
      records: [
        { session_summary: 'S1', interventions_used: ['thought_record'] },
        { session_summary: 'S2', interventions_used: ['thought_record'] },
        { session_summary: 'S3', interventions_used: ['thought_record'] },
      ],
    };
    const form = {
      presenting_problem: 'Persistent anxiety',
      core_belief: 'I am not capable',
      maintaining_cycle: 'Avoidance pattern',
    };
    const state = determineTherapistStrategy(cont, form, tier, ms);
    const section = buildStrategyContextSection(state);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(state.intervention_saturated).toBe(true);
    expect(section).toContain('structured_exploration');
    expect(section).toContain('Intervention sat.');
  });
});
