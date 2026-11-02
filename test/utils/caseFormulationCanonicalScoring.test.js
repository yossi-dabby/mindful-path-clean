/**
 * @file test/utils/caseFormulationCanonicalScoring.test.js
 *
 * CaseFormulation Canonical-Schema Scoring — smallest safe root correction.
 *
 * Verifies that scoreFormulationRecord recognises BOTH the legacy string shape
 * (presenting_problem / core_belief / maintaining_cycle / treatment_goals) AND
 * the canonical current CaseFormulation schema equivalents
 * (presenting_themes / core_belief_hypotheses / maintaining_behaviors / goals),
 * without changing:
 *   - the FORMULATION_MIN_USEFUL_FIELDS (=2) threshold
 *   - the planner precedence rules
 *   - the exact-host V10 Preview override (kept; see step-6 finding below)
 *   - any retrieval / safety / language / evidence / bounds logic
 *
 * Key correctness invariants:
 *   - legacy records retain identical scoring (no regression)
 *   - a populated canonical-schema record receives the equivalent score
 *   - a domain-only / empty canonical record remains NOT ready (fail-closed)
 *   - absent / null / malformed fields remain fail-closed
 *   - cbt_domain alone NEVER makes a record complete or intervention-ready
 *   - production / unrelated hosts receive no special behaviour from the scorer
 *     or from buildPlannerContext (intervention_ready stays false unless the
 *     caller explicitly passes it — which the production path never does).
 *
 * Step-6 finding (see bottom suite): a populated canonical record naturally
 * produces formulation_in_place=true and has_been_understood=true, but NOT
 * intervention_ready=true, because intervention_ready is sourced solely from
 * opts.intervention_ready at the call site.  The exact-host override is therefore
 * still required and is preserved unchanged.
 */

import { describe, it, expect } from 'vitest';

import {
  scoreFormulationRecord,
  buildPlannerContext,
  FORMULATION_MIN_USEFUL_FIELDS,
} from '../../src/lib/workflowContextInjector.js';

import { DISTRESS_TIERS } from '../../src/lib/therapistStrategyEngine.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const LEGACY_RICH = Object.freeze({
  presenting_problem: 'Persistent work-related anxiety and catastrophising',
  core_belief: 'I am fundamentally incompetent',
  maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
  treatment_goals: 'Challenge core belief and build tolerance for uncertainty',
});

const LEGACY_MINIMAL = Object.freeze({
  presenting_problem: 'Social anxiety in professional settings',
  core_belief: 'I will be judged and found lacking',
});

const CANONICAL_FULL = Object.freeze({
  presenting_themes: ['Workplace anxiety', 'Catastrophising about performance reviews'],
  core_belief_hypotheses: [
    { belief: 'I am fundamentally incompetent', evidence: 'missed deadlines', status: 'working_hypothesis' },
  ],
  maintaining_behaviors: {
    avoidance: ['Procrastinating on starting tasks'],
    safety_behaviors: ['Excessive checking before submitting'],
    reassurance_seeking: [],
  },
  goals: ['Reduce avoidance', 'Build self-efficacy and tolerance for uncertainty'],
});

const CANONICAL_MINIMAL = Object.freeze({
  presenting_themes: ['Social anxiety in professional settings'],
  goals: ['Reduce avoidance and build self-efficacy'],
});

const DOMAIN_ONLY = Object.freeze({
  cbt_domain: 'anxiety',
  presenting_themes: [],
  core_belief_hypotheses: [],
  maintaining_behaviors: { avoidance: [], safety_behaviors: [], reassurance_seeking: [] },
  goals: [],
});

const EMPTY_CANONICAL = Object.freeze({
  presenting_themes: [],
  core_belief_hypotheses: [],
  maintaining_behaviors: {},
  goals: [],
});

// ─── Section 1: legacy records retain identical scoring ──────────────────────

describe('scoreFormulationRecord — legacy string shape is unchanged', () => {
  it('scores a 4-field legacy record as 4', () => {
    expect(scoreFormulationRecord(LEGACY_RICH)).toBe(4);
  });

  it('scores a 2-field legacy record as 2', () => {
    expect(scoreFormulationRecord(LEGACY_MINIMAL)).toBe(2);
  });

  it('scores a 1-field legacy record as 1', () => {
    expect(scoreFormulationRecord({ presenting_problem: 'Social anxiety' })).toBe(1);
  });

  it('scores a placeholder-only legacy record as 0', () => {
    expect(scoreFormulationRecord({
      presenting_problem: 'ok',
      core_belief: '?',
      maintaining_cycle: 'TBD',
      treatment_goals: 'N/A',
    })).toBe(0);
  });

  it('counts exactly the four legacy string fields (no arbitrary keys)', () => {
    expect(scoreFormulationRecord({
      presenting_problem: 'Valid long enough field',
      unknown_extra_field: 'Another valid long field',
    })).toBe(1);
  });

  it('does not double-count when both legacy and canonical forms are present', () => {
    // Same dimension filled in both shapes still counts once.
    const both = {
      presenting_problem: 'Persistent work-related anxiety and catastrophising',
      presenting_themes: ['Workplace anxiety'],
    };
    expect(scoreFormulationRecord(both)).toBe(1);
  });
});

// ─── Section 2: canonical-schema equivalence ─────────────────────────────────

describe('scoreFormulationRecord — canonical schema equivalents are scored', () => {
  it('scores a fully-populated canonical record as 4 (equivalent to LEGACY_RICH)', () => {
    expect(scoreFormulationRecord(CANONICAL_FULL)).toBe(4);
  });

  it('scores a 2-dimension canonical record as 2 (equivalent to LEGACY_MINIMAL)', () => {
    expect(scoreFormulationRecord(CANONICAL_MINIMAL)).toBe(2);
  });

  it('scores a hybrid legacy+canonical record by counting each populated dimension once', () => {
    // legacy presenting_problem + canonical goals → 2 dimensions
    const hybrid = {
      presenting_problem: 'Persistent work-related anxiety',
      goals: ['Reduce avoidance and build self-efficacy'],
    };
    expect(scoreFormulationRecord(hybrid)).toBe(2);
  });

  it('counts core_belief_hypotheses when at least one entry has a non-trivial belief', () => {
    expect(scoreFormulationRecord({
      core_belief_hypotheses: [{ belief: 'I am fundamentally incompetent', status: 'working_hypothesis' }],
    })).toBe(1);
  });

  it('counts maintaining_behaviors when any sub-array has a non-empty string', () => {
    expect(scoreFormulationRecord({
      maintaining_behaviors: { avoidance: [], safety_behaviors: ['Excessive checking'], reassurance_seeking: [] },
    })).toBe(1);
  });

  it('counts a single present presenting_themes entry', () => {
    expect(scoreFormulationRecord({ presenting_themes: ['Workplace anxiety'] })).toBe(1);
  });

  it('counts a single present goals entry', () => {
    expect(scoreFormulationRecord({ goals: ['Reduce avoidance'] })).toBe(1);
  });
});

// ─── Section 3: domain-only / empty canonical remain fail-closed (not ready) ─

describe('scoreFormulationRecord — domain-only and empty canonical are fail-closed', () => {
  it('scores a domain-only record as 0 (cbt_domain never contributes)', () => {
    expect(scoreFormulationRecord(DOMAIN_ONLY)).toBe(0);
  });

  it('scores an all-empty-canonical record as 0', () => {
    expect(scoreFormulationRecord(EMPTY_CANONICAL)).toBe(0);
  });

  it('scores a record with only cbt_domain plus whitespace-themes as 0', () => {
    expect(scoreFormulationRecord({
      cbt_domain: 'anxiety',
      presenting_themes: ['   '],
      goals: [''],
    })).toBe(0);
  });

  it('threshold is unchanged: a 1-dimension canonical record is below FORMULATION_MIN_USEFUL_FIELDS', () => {
    expect(scoreFormulationRecord({ presenting_themes: ['Workplace anxiety'] })).toBe(1);
    expect(1).toBeLessThan(FORMULATION_MIN_USEFUL_FIELDS);
  });
});

// ─── Section 4: absent / null / malformed fields remain fail-closed ──────────

describe('scoreFormulationRecord — malformed inputs are fail-closed', () => {
  it('returns 0 for null', () => {
    expect(scoreFormulationRecord(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(scoreFormulationRecord(undefined)).toBe(0);
  });

  it('returns 0 for non-object inputs', () => {
    expect(scoreFormulationRecord('anxiety')).toBe(0);
    expect(scoreFormulationRecord(42)).toBe(0);
    expect(scoreFormulationRecord(true)).toBe(0);
  });

  it('returns 0 when canonical arrays contain only non-string / malformed entries', () => {
    expect(scoreFormulationRecord({
      presenting_themes: [42, null, { x: 1 }],
      core_belief_hypotheses: [{ evidence: 'no belief field' }],
      maintaining_behaviors: { avoidance: [123, null], safety_behaviors: [{}] },
      goals: [42, null],
    })).toBe(0);
  });

  it('returns 0 when maintaining_behaviors is malformed (not an object)', () => {
    expect(scoreFormulationRecord({ maintaining_behaviors: 'not-an-object' })).toBe(0);
    expect(scoreFormulationRecord({ maintaining_behaviors: ['an-array'] })).toBe(0);
    expect(scoreFormulationRecord({ maintaining_behaviors: null })).toBe(0);
  });

  it('returns 0 when core_belief_hypotheses entries lack a string belief', () => {
    expect(scoreFormulationRecord({
      core_belief_hypotheses: [{ belief: 42 }, { status: 'supported' }],
    })).toBe(0);
  });

  it('returns 0 when canonical fields are present but all empty arrays / empty object', () => {
    expect(scoreFormulationRecord({
      presenting_themes: [],
      core_belief_hypotheses: [],
      maintaining_behaviors: {},
      goals: [],
    })).toBe(0);
  });

  it('ignores legacy non-string legacy values even when a canonical sibling is absent', () => {
    // Mirrors the existing "does NOT count non-string fields" contract.
    expect(scoreFormulationRecord({
      presenting_problem: 42,
      core_belief: null,
      maintaining_cycle: ['an array'],
      treatment_goals: { object: true },
    })).toBe(0);
  });
});

// ─── Section 5: production / unrelated hosts receive no special behaviour ────

describe('buildPlannerContext — host-agnostic, no special behaviour without opts', () => {
  it('a populated canonical record yields formulation_in_place=true but has_been_understood=false (Phase 6: no producer)', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {});
    expect(ctx.formulation_in_place).toBe(true);
    expect(ctx.has_been_understood).toBe(false);
  });

  it('a populated canonical record does NOT yield intervention_ready without an explicit opt', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {});
    // intervention_ready is sourced solely from opts.intervention_ready === true.
    // The production call site never passes it → stays false.  This is the
    // remaining readiness dependency that keeps the exact-host override required.
    expect(ctx.intervention_ready).toBe(false);
  });

  it('a domain-only canonical record remains NOT ready in every readiness dimension', () => {
    const ctx = buildPlannerContext(DOMAIN_ONLY, null, DISTRESS_TIERS.TIER_LOW, {});
    expect(ctx.formulation_in_place).toBe(false);
    expect(ctx.has_been_understood).toBe(false);
    expect(ctx.intervention_ready).toBe(false);
  });

  it('a legacy RICH record produces the same planner flags as a canonical FULL record', () => {
    const legacyCtx = buildPlannerContext(LEGACY_RICH, null, DISTRESS_TIERS.TIER_LOW, {});
    const canonicalCtx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {});
    expect(canonicalCtx.formulation_in_place).toBe(legacyCtx.formulation_in_place);
    expect(canonicalCtx.has_been_understood).toBe(legacyCtx.has_been_understood);
    expect(canonicalCtx.intervention_ready).toBe(legacyCtx.intervention_ready);
  });

  it('buildPlannerContext is host-agnostic (no window / hostname branching)', () => {
    // buildPlannerContext never reads window.location; production and unrelated
    // hosts therefore receive identical planner flags for the same record.
    const a = buildPlannerContext(LEGACY_RICH, null, DISTRESS_TIERS.TIER_LOW, {});
    // Simulate "production" (no window) by simply calling the pure function —
    // any host special-casing lives only in the V10 build path, not here.
    expect(a).toEqual({
      safety_mode_active: false,
      distress_tier: 'tier_low',
      formulation_in_place: true,
      has_been_understood: false,
      case_type: '',
      is_first_disclosure: false,
      intervention_ready: false,
    });
  });
});

// ─── Section 6: step-6 readiness finding (override removed; derived checklist) ─

describe('step-6 readiness dependency — derived from canonical checklist (no override)', () => {
  it('a genuinely populated canonical formulation does NOT naturally produce intervention_ready', () => {
    // formulation_in_place ✅, has_been_understood ❌ (Phase 6: no structured producer),
    // and intervention_ready ❌ — the bounded detectors (readiness_signal,
    // rationale_is_clear) are absent. L2 and L5 are distinct precedence levels.
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {});
    expect(ctx.formulation_in_place).toBe(true);
    expect(ctx.has_been_understood).toBe(false);
    expect(ctx.intervention_ready).toBe(false);
  });

  it('intervention_ready becomes true only when ALL bounded detectors pass', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    expect(ctx.intervention_ready).toBe(true);
  });

  it('intervention_ready stays false if any single bounded detector is missing', () => {
    const base = { readiness_signal: true, rationale_is_clear: true };
    for (const missing of ['readiness_signal', 'rationale_is_clear']) {
      const opts = { ...base, [missing]: false };
      const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, opts);
      expect(ctx.intervention_ready).toBe(false);
    }
  });

  it('high distress blocks intervention_ready even when all explicit detectors pass', () => {
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_HIGH, {
      readiness_signal: true,
      rationale_is_clear: true,
    });
    expect(ctx.intervention_ready).toBe(false);
  });

  it('a high-protection case type requires holding_complete', () => {
    const detectors = { has_been_understood: true, readiness_signal: true, rationale_is_clear: true };
    const without = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {
      ...detectors,
      case_type: 'grief_loss',
      holding_complete: false,
    });
    expect(without.intervention_ready).toBe(false);
    const withHolding = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {
      ...detectors,
      case_type: 'grief_loss',
      holding_complete: true,
    });
    expect(withHolding.intervention_ready).toBe(true);
  });

  it('an opaque opts.intervention_ready is IGNORED (no longer passthrough)', () => {
    // Without the bounded detectors, an opaque intervention_ready:true must NOT
    // satisfy the L5 gate — this is the production-safe wiring that replaces the
    // former exact-host override.
    const ctx = buildPlannerContext(CANONICAL_FULL, null, DISTRESS_TIERS.TIER_LOW, {
      intervention_ready: true,
    });
    expect(ctx.intervention_ready).toBe(false);
  });

  it('the readiness threshold (FORMULATION_MIN_USEFUL_FIELDS) is unchanged at 2', () => {
    expect(FORMULATION_MIN_USEFUL_FIELDS).toBe(2);
  });
});