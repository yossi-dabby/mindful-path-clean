/**
 * @file test/utils/therapistPlannerHierarchy.test.js
 *
 * Therapist Planner Hierarchy — Precedence Model Regression Tests
 *
 * Validates that the therapist planner hierarchy is correctly enforced and
 * that legacy direct-action gates do NOT override higher-priority rules.
 *
 * REQUIRED PRECEDENCE ORDER (highest → lowest):
 *   1. Safety containment
 *   2. Formulation-first
 *   3. Teen/shame/grief/scrupulosity/trauma pacing rules
 *   4. First-disclosure holding rules
 *   5. Intervention readiness gates
 *   6. Competence/planner layers
 *   7. Domain-specific direct-action heuristics (LAST, lowest priority)
 *
 * REGRESSION CASES (12):
 *   1.  Social anxiety — old direct-action gate no longer dominates
 *   2.  Teen social shame — teen sensitivity outranks social-action gate
 *   3.  OCD checking — formulation must precede ERP-like move
 *   4.  Scrupulosity — cycle/process must outrank behavioral suggestion
 *   5.  Grief/loss — holding must outrank behavioral activation
 *   6.  Trauma — stabilization must outrank exposure logic
 *   7.  ADHD overwhelm — overload understanding must precede action
 *   8.  "Nothing helps" — clarification must outrank intervention
 *   9.  First-disclosure — no-task rule must win
 *  10.  Mid-session language switch — hierarchy remains intact
 *  11.  Leakage-informed regression — planner no longer emits legacy shortcut reasoning
 *  12.  Preserved-gains tests — warmth/pacing/alliance/competence don't regress
 *
 * SECTION F — Runtime call-site enforcement tests (added in enforcement pass):
 *  Prove that applyStrategyPrecedenceGuard (wired into V8/V10 in
 *  workflowContextInjector.js) actually overrides strategy modes at call-site
 *  level — not just that the utility functions return the right values.
 */

import { describe, it, expect } from 'vitest';

import {
  PRECEDENCE_LEVELS,
  LEGACY_GATE_OVERRIDES,
  THERAPIST_PLANNER_PRECEDENCE_MODEL,
  evaluatePlannerPrecedence,
  isLegacyGateBlocked,
} from '../../src/lib/therapistWorkflowEngine.js';

import {
  FORMULATION_FIRST_GATES,
  INTERVENTION_READINESS_CHECKLIST,
  PROTECTED_CASE_TYPES,
  getCaseProtectionLevel,
  checkInterventionReadiness,
} from '../../src/lib/cbtKnowledgePlanner.js';

import {
  buildPlannerContext,
  applyStrategyPrecedenceGuard,
  buildPrecedenceEnforcementBlock,
  scoreFormulationRecord,
  FORMULATION_MIN_USEFUL_FIELDS,
} from '../../src/lib/workflowContextInjector.js';

import {
  determineTherapistStrategy,
  STRATEGY_INTERVENTION_MODES,
} from '../../src/lib/therapistStrategyEngine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fully-ready context (all gates passed, no pacing-sensitive case type) */
const fullyReadyCtx = Object.freeze({
  safety_mode_active: false,
  distress_tier: 'tier_low',
  formulation_in_place: true,
  has_been_understood: true,
  case_type: 'anxiety',
  is_first_disclosure: false,
  intervention_ready: true,
  readiness_signal: true,
  rationale_is_clear: true,
  distress_allows_task: true,
  person_feels_understood: true,
});

/** Minimal unready context — no formulation yet */
const unreadyCtx = Object.freeze({
  formulation_in_place: false,
  has_been_understood: false,
});

// ─── Section A: PRECEDENCE_LEVELS exports ────────────────────────────────────

describe('PRECEDENCE_LEVELS', () => {
  it('is exported as a frozen object', () => {
    expect(PRECEDENCE_LEVELS).toBeDefined();
    expect(Object.isFrozen(PRECEDENCE_LEVELS)).toBe(true);
  });

  it('has exactly 7 levels', () => {
    expect(Object.keys(PRECEDENCE_LEVELS)).toHaveLength(7);
  });

  it('SAFETY is level 1 (highest priority)', () => {
    expect(PRECEDENCE_LEVELS.SAFETY).toBe(1);
  });

  it('FORMULATION_FIRST is level 2', () => {
    expect(PRECEDENCE_LEVELS.FORMULATION_FIRST).toBe(2);
  });

  it('PACING_SENSITIVITY is level 3', () => {
    expect(PRECEDENCE_LEVELS.PACING_SENSITIVITY).toBe(3);
  });

  it('FIRST_DISCLOSURE is level 4', () => {
    expect(PRECEDENCE_LEVELS.FIRST_DISCLOSURE).toBe(4);
  });

  it('INTERVENTION_READINESS is level 5', () => {
    expect(PRECEDENCE_LEVELS.INTERVENTION_READINESS).toBe(5);
  });

  it('COMPETENCE_PLANNER is level 6', () => {
    expect(PRECEDENCE_LEVELS.COMPETENCE_PLANNER).toBe(6);
  });

  it('DOMAIN_HEURISTICS is level 7 (lowest priority)', () => {
    expect(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS).toBe(7);
  });

  it('SAFETY < FORMULATION_FIRST < PACING_SENSITIVITY < DOMAIN_HEURISTICS (order preserved)', () => {
    expect(PRECEDENCE_LEVELS.SAFETY).toBeLessThan(PRECEDENCE_LEVELS.FORMULATION_FIRST);
    expect(PRECEDENCE_LEVELS.FORMULATION_FIRST).toBeLessThan(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
    expect(PRECEDENCE_LEVELS.PACING_SENSITIVITY).toBeLessThan(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
  });
});

// ─── Section B: LEGACY_GATE_OVERRIDES exports ────────────────────────────────

describe('LEGACY_GATE_OVERRIDES', () => {
  it('is exported as a frozen object', () => {
    expect(LEGACY_GATE_OVERRIDES).toBeDefined();
    expect(Object.isFrozen(LEGACY_GATE_OVERRIDES)).toBe(true);
  });

  it('has exactly 4 legacy gates', () => {
    expect(Object.keys(LEGACY_GATE_OVERRIDES)).toHaveLength(4);
  });

  it('contains micro_step_defaulting gate', () => {
    expect(LEGACY_GATE_OVERRIDES.micro_step_defaulting).toBeDefined();
  });

  it('contains skip_clarification gate', () => {
    expect(LEGACY_GATE_OVERRIDES.skip_clarification).toBeDefined();
  });

  it('contains social_anxiety_direct_action gate', () => {
    expect(LEGACY_GATE_OVERRIDES.social_anxiety_direct_action).toBeDefined();
  });

  it('contains domain_to_intervention_template gate', () => {
    expect(LEGACY_GATE_OVERRIDES.domain_to_intervention_template).toBeDefined();
  });

  it('micro_step_defaulting is blocked by INTERVENTION_READINESS (level 5)', () => {
    expect(LEGACY_GATE_OVERRIDES.micro_step_defaulting.blockedBy).toBe(PRECEDENCE_LEVELS.INTERVENTION_READINESS);
  });

  it('skip_clarification is blocked by FORMULATION_FIRST (level 2)', () => {
    expect(LEGACY_GATE_OVERRIDES.skip_clarification.blockedBy).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('social_anxiety_direct_action is blocked by PACING_SENSITIVITY (level 3)', () => {
    expect(LEGACY_GATE_OVERRIDES.social_anxiety_direct_action.blockedBy).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('domain_to_intervention_template is blocked by PACING_SENSITIVITY (level 3)', () => {
    expect(LEGACY_GATE_OVERRIDES.domain_to_intervention_template.blockedBy).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('each gate has gateName, description, blockedBy, blockedByName', () => {
    for (const gate of Object.values(LEGACY_GATE_OVERRIDES)) {
      expect(typeof gate.gateName).toBe('string');
      expect(typeof gate.description).toBe('string');
      expect(typeof gate.blockedBy).toBe('number');
      expect(typeof gate.blockedByName).toBe('string');
    }
  });
});

// ─── Section C: THERAPIST_PLANNER_PRECEDENCE_MODEL exports ───────────────────

describe('THERAPIST_PLANNER_PRECEDENCE_MODEL', () => {
  it('is exported', () => {
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL).toBeDefined();
  });

  it('is frozen', () => {
    expect(Object.isFrozen(THERAPIST_PLANNER_PRECEDENCE_MODEL)).toBe(true);
  });

  it('has version field', () => {
    expect(typeof THERAPIST_PLANNER_PRECEDENCE_MODEL.version).toBe('string');
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL.version.length).toBeGreaterThan(0);
  });

  it('references PRECEDENCE_LEVELS', () => {
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL.precedence_levels).toBe(PRECEDENCE_LEVELS);
  });

  it('references LEGACY_GATE_OVERRIDES', () => {
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL.legacy_gate_overrides).toBe(LEGACY_GATE_OVERRIDES);
  });
});

// ─── Section D: evaluatePlannerPrecedence ────────────────────────────────────

describe('evaluatePlannerPrecedence', () => {
  it('returns SAFETY when safety_mode_active is true', () => {
    const r = evaluatePlannerPrecedence({ safety_mode_active: true });
    expect(r.level).toBe(PRECEDENCE_LEVELS.SAFETY);
    expect(r.name).toBe('SAFETY');
  });

  it('returns SAFETY when distress_tier is tier_high', () => {
    const r = evaluatePlannerPrecedence({ distress_tier: 'tier_high' });
    expect(r.level).toBe(PRECEDENCE_LEVELS.SAFETY);
  });

  it('returns FORMULATION_FIRST when formulation_in_place is false', () => {
    const r = evaluatePlannerPrecedence({ formulation_in_place: false, has_been_understood: true });
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('returns FORMULATION_FIRST when has_been_understood is false', () => {
    const r = evaluatePlannerPrecedence({ formulation_in_place: true, has_been_understood: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('returns FORMULATION_FIRST for empty context (fail-safe default)', () => {
    const r = evaluatePlannerPrecedence({});
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('returns FORMULATION_FIRST for null context (fail-safe default)', () => {
    const r = evaluatePlannerPrecedence(null);
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('returns PACING_SENSITIVITY for case_type teen_shame', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'teen_shame', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns PACING_SENSITIVITY for case_type grief_loss', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'grief_loss', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns PACING_SENSITIVITY for case_type trauma', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'trauma', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns PACING_SENSITIVITY for case_type scrupulosity', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'scrupulosity', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns PACING_SENSITIVITY for case_type ocd_checking', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'ocd_checking', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns PACING_SENSITIVITY for case_type adhd_overwhelm', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'adhd_overwhelm', intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('returns FIRST_DISCLOSURE when is_first_disclosure is true', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, case_type: 'anxiety', is_first_disclosure: true });
    expect(r.level).toBe(PRECEDENCE_LEVELS.FIRST_DISCLOSURE);
  });

  it('returns INTERVENTION_READINESS when intervention_ready is false (non-pacing case)', () => {
    const r = evaluatePlannerPrecedence({ ...fullyReadyCtx, intervention_ready: false });
    expect(r.level).toBe(PRECEDENCE_LEVELS.INTERVENTION_READINESS);
  });

  it('returns COMPETENCE_PLANNER when all higher gates are passed', () => {
    const r = evaluatePlannerPrecedence(fullyReadyCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.COMPETENCE_PLANNER);
  });

  it('SAFETY outranks FORMULATION_FIRST (level ordering correct)', () => {
    const safety = evaluatePlannerPrecedence({ safety_mode_active: true });
    const formFirst = evaluatePlannerPrecedence({});
    expect(safety.level).toBeLessThan(formFirst.level);
  });

  it('result is frozen', () => {
    expect(Object.isFrozen(evaluatePlannerPrecedence({}))).toBe(true);
  });

  it('returns an object with level, name, reason', () => {
    const r = evaluatePlannerPrecedence({});
    expect(typeof r.level).toBe('number');
    expect(typeof r.name).toBe('string');
    expect(typeof r.reason).toBe('string');
  });
});

// ─── Section E: isLegacyGateBlocked ──────────────────────────────────────────

describe('isLegacyGateBlocked', () => {
  it('returns false for unknown gate name', () => {
    expect(isLegacyGateBlocked('nonexistent_gate', {})).toBe(false);
  });

  it('skip_clarification is blocked when formulation not in place', () => {
    expect(isLegacyGateBlocked('skip_clarification', unreadyCtx)).toBe(true);
  });

  it('skip_clarification is NOT blocked when fully ready (anxiety, non-pacing)', () => {
    expect(isLegacyGateBlocked('skip_clarification', fullyReadyCtx)).toBe(false);
  });

  it('social_anxiety_direct_action is blocked when formulation is incomplete', () => {
    expect(isLegacyGateBlocked('social_anxiety_direct_action', unreadyCtx)).toBe(true);
  });

  it('social_anxiety_direct_action is blocked even with formulation when case_type is social anxiety pacing type', () => {
    // teen_shame is a pacing-sensitive type — triggers level 3 which equals blockedBy 3
    const ctx = { ...fullyReadyCtx, case_type: 'teen_shame', intervention_ready: false };
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('domain_to_intervention_template is blocked when formulation is missing', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', unreadyCtx)).toBe(true);
  });

  it('micro_step_defaulting is blocked when intervention_ready is false', () => {
    const ctx = { ...fullyReadyCtx, case_type: 'anxiety', intervention_ready: false };
    expect(isLegacyGateBlocked('micro_step_defaulting', ctx)).toBe(true);
  });

  it('micro_step_defaulting is NOT blocked when fully ready', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', fullyReadyCtx)).toBe(false);
  });

  it('returns true (fail-closed) for null context on known gate', () => {
    // null context → FORMULATION_FIRST (level 2) ≤ skip_clarification.blockedBy (2) → blocked
    expect(isLegacyGateBlocked('skip_clarification', null)).toBe(true);
  });
});

// ─── Section F: FORMULATION_FIRST_GATES exports ──────────────────────────────

describe('FORMULATION_FIRST_GATES', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(FORMULATION_FIRST_GATES)).toBe(true);
    expect(Object.isFrozen(FORMULATION_FIRST_GATES)).toBe(true);
  });

  it('has exactly 6 gates', () => {
    expect(FORMULATION_FIRST_GATES).toHaveLength(6);
  });

  it('starts with understand_presenting_problem', () => {
    expect(FORMULATION_FIRST_GATES[0]).toBe('understand_presenting_problem');
  });

  it('ends with decide_move_type', () => {
    expect(FORMULATION_FIRST_GATES[FORMULATION_FIRST_GATES.length - 1]).toBe('decide_move_type');
  });

  it('contains build_working_formulation', () => {
    expect(FORMULATION_FIRST_GATES).toContain('build_working_formulation');
  });

  it('contains identify_treatment_target', () => {
    expect(FORMULATION_FIRST_GATES).toContain('identify_treatment_target');
  });
});

// ─── Section G: INTERVENTION_READINESS_CHECKLIST exports ─────────────────────

describe('INTERVENTION_READINESS_CHECKLIST', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(INTERVENTION_READINESS_CHECKLIST)).toBe(true);
    expect(Object.isFrozen(INTERVENTION_READINESS_CHECKLIST)).toBe(true);
  });

  it('has exactly 6 items', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toHaveLength(6);
  });

  it('contains formulation_in_place', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('formulation_in_place');
  });

  it('contains person_feels_understood', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('person_feels_understood');
  });

  it('contains not_grief_trauma_acute_shame', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('not_grief_trauma_acute_shame');
  });
});

// ─── Section H: PROTECTED_CASE_TYPES exports ─────────────────────────────────

describe('PROTECTED_CASE_TYPES', () => {
  it('is exported as a frozen array', () => {
    expect(Array.isArray(PROTECTED_CASE_TYPES)).toBe(true);
    expect(Object.isFrozen(PROTECTED_CASE_TYPES)).toBe(true);
  });

  it('has exactly 8 case types', () => {
    expect(PROTECTED_CASE_TYPES).toHaveLength(8);
  });

  it('includes teen_shame', () => { expect(PROTECTED_CASE_TYPES).toContain('teen_shame'); });
  it('includes grief_loss', () => { expect(PROTECTED_CASE_TYPES).toContain('grief_loss'); });
  it('includes trauma', () => { expect(PROTECTED_CASE_TYPES).toContain('trauma'); });
  it('includes scrupulosity', () => { expect(PROTECTED_CASE_TYPES).toContain('scrupulosity'); });
  it('includes first_disclosure', () => { expect(PROTECTED_CASE_TYPES).toContain('first_disclosure'); });
  it('includes adhd_overwhelm', () => { expect(PROTECTED_CASE_TYPES).toContain('adhd_overwhelm'); });
  it('includes nothing_helps', () => { expect(PROTECTED_CASE_TYPES).toContain('nothing_helps'); });
  it('includes ocd_checking', () => { expect(PROTECTED_CASE_TYPES).toContain('ocd_checking'); });
});

// ─── Section I: getCaseProtectionLevel ───────────────────────────────────────

describe('getCaseProtectionLevel', () => {
  it('returns "high" for grief_loss', () => {
    expect(getCaseProtectionLevel({ case_type: 'grief_loss' })).toBe('high');
  });

  it('returns "high" for trauma', () => {
    expect(getCaseProtectionLevel({ case_type: 'trauma' })).toBe('high');
  });

  it('returns "high" for first_disclosure', () => {
    expect(getCaseProtectionLevel({ case_type: 'first_disclosure' })).toBe('high');
  });

  it('returns "standard" for teen_shame', () => {
    expect(getCaseProtectionLevel({ case_type: 'teen_shame' })).toBe('standard');
  });

  it('returns "standard" for scrupulosity', () => {
    expect(getCaseProtectionLevel({ case_type: 'scrupulosity' })).toBe('standard');
  });

  it('returns "standard" for ocd_checking', () => {
    expect(getCaseProtectionLevel({ case_type: 'ocd_checking' })).toBe('standard');
  });

  it('returns "standard" for adhd_overwhelm', () => {
    expect(getCaseProtectionLevel({ case_type: 'adhd_overwhelm' })).toBe('standard');
  });

  it('returns "standard" for nothing_helps', () => {
    expect(getCaseProtectionLevel({ case_type: 'nothing_helps' })).toBe('standard');
  });

  it('returns "none" for generic anxiety', () => {
    expect(getCaseProtectionLevel({ case_type: 'anxiety' })).toBe('none');
  });

  it('returns "none" for null context', () => {
    expect(getCaseProtectionLevel(null)).toBe('none');
  });

  it('returns "none" for empty context', () => {
    expect(getCaseProtectionLevel({})).toBe('none');
  });

  it('is case-insensitive (GRIEF_LOSS → high)', () => {
    expect(getCaseProtectionLevel({ case_type: 'GRIEF_LOSS' })).toBe('high');
  });
});

// ─── Section J: checkInterventionReadiness ───────────────────────────────────

describe('checkInterventionReadiness', () => {
  const fullCtxForReadiness = Object.freeze({
    formulation_in_place: true,
    person_feels_understood: true,
    readiness_signal: true,
    rationale_is_clear: true,
    distress_allows_task: true,
    case_type: 'anxiety',
  });

  it('returns ready=true when all criteria met (non-protected case)', () => {
    const r = checkInterventionReadiness(fullCtxForReadiness);
    expect(r.ready).toBe(true);
    expect(r.unmetCriteria).toHaveLength(0);
    expect(r.protectionLevel).toBe('none');
  });

  it('returns ready=false when formulation_in_place is false', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, formulation_in_place: false });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('formulation_in_place');
  });

  it('returns ready=false when person_feels_understood is false', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, person_feels_understood: false });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('person_feels_understood');
  });

  it('returns all 5 base criteria as unmet for empty context', () => {
    const r = checkInterventionReadiness({});
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria.length).toBeGreaterThanOrEqual(5);
  });

  it('requires holding_complete for grief_loss case', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, case_type: 'grief_loss' });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
    expect(r.protectionLevel).toBe('high');
  });

  it('requires holding_complete for trauma case', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, case_type: 'trauma' });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
  });

  it('requires holding_complete for first_disclosure case', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, case_type: 'first_disclosure' });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
  });

  it('returns ready=true for grief_loss when holding_complete=true', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, case_type: 'grief_loss', holding_complete: true });
    expect(r.ready).toBe(true);
  });

  it('does NOT require holding_complete for teen_shame (standard protection)', () => {
    const r = checkInterventionReadiness({ ...fullCtxForReadiness, case_type: 'teen_shame' });
    expect(r.ready).toBe(true);
    expect(r.protectionLevel).toBe('standard');
  });

  it('result is frozen', () => {
    const r = checkInterventionReadiness({});
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.unmetCriteria)).toBe(true);
  });

  it('never throws for null context', () => {
    expect(() => checkInterventionReadiness(null)).not.toThrow();
  });

  it('never throws for array context', () => {
    expect(() => checkInterventionReadiness([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 1: Social anxiety — old direct-action gate no longer dominates
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 1: Social anxiety — direct-action gate no longer dominates', () => {
  const socialAnxietyCtx = Object.freeze({
    formulation_in_place: false,
    has_been_understood: false,
    case_type: 'anxiety',
  });

  it('social_anxiety_direct_action gate is blocked when formulation not in place', () => {
    expect(isLegacyGateBlocked('social_anxiety_direct_action', socialAnxietyCtx)).toBe(true);
  });

  it('domain_to_intervention_template gate is blocked for social anxiety without formulation', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', socialAnxietyCtx)).toBe(true);
  });

  it('skip_clarification is blocked for social anxiety without formulation', () => {
    expect(isLegacyGateBlocked('skip_clarification', socialAnxietyCtx)).toBe(true);
  });

  it('planner level is FORMULATION_FIRST (not DOMAIN_HEURISTICS) for social anxiety without formulation', () => {
    const r = evaluatePlannerPrecedence(socialAnxietyCtx);
    expect(r.level).toBeLessThan(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 2: Teen social shame — teen sensitivity outranks social-action gate
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 2: Teen social shame — teen sensitivity outranks social-action gate', () => {
  // Formulation IS in place and person feels understood, but case_type is teen_shame
  const teenShameCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'teen_shame',
    intervention_ready: false,
  });

  it('planner returns PACING_SENSITIVITY for teen_shame even with formulation in place', () => {
    const r = evaluatePlannerPrecedence(teenShameCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('social_anxiety_direct_action gate is blocked for teen_shame (pacing level ≤ blockedBy)', () => {
    expect(isLegacyGateBlocked('social_anxiety_direct_action', teenShameCtx)).toBe(true);
  });

  it('domain_to_intervention_template gate is blocked for teen_shame', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', teenShameCtx)).toBe(true);
  });

  it('getCaseProtectionLevel returns standard for teen_shame', () => {
    expect(getCaseProtectionLevel({ case_type: 'teen_shame' })).toBe('standard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 3: OCD checking — formulation must precede ERP-like move
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 3: OCD checking — formulation must precede ERP-like move', () => {
  const ocdCtx = Object.freeze({
    formulation_in_place: false,
    has_been_understood: false,
    case_type: 'ocd_checking',
  });

  it('planner returns FORMULATION_FIRST for ocd_checking without formulation', () => {
    const r = evaluatePlannerPrecedence(ocdCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('micro_step_defaulting is blocked for ocd_checking without formulation', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', ocdCtx)).toBe(true);
  });

  it('domain_to_intervention_template is blocked for ocd_checking', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', ocdCtx)).toBe(true);
  });

  it('ocd_checking is in PROTECTED_CASE_TYPES', () => {
    expect(PROTECTED_CASE_TYPES).toContain('ocd_checking');
  });

  it('planner returns PACING_SENSITIVITY for ocd_checking when formulation is in place', () => {
    const ctx = { formulation_in_place: true, has_been_understood: true, case_type: 'ocd_checking', intervention_ready: false };
    const r = evaluatePlannerPrecedence(ctx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 4: Scrupulosity — cycle/process outranks behavioral suggestion
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 4: Scrupulosity — cycle/process outranks behavioral suggestion', () => {
  const scrupulosityCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'scrupulosity',
    intervention_ready: false,
  });

  it('planner returns PACING_SENSITIVITY for scrupulosity', () => {
    const r = evaluatePlannerPrecedence(scrupulosityCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('domain_to_intervention_template is blocked for scrupulosity', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', scrupulosityCtx)).toBe(true);
  });

  it('micro_step_defaulting is blocked for scrupulosity (intervention not ready)', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', scrupulosityCtx)).toBe(true);
  });

  it('getCaseProtectionLevel returns standard for scrupulosity', () => {
    expect(getCaseProtectionLevel({ case_type: 'scrupulosity' })).toBe('standard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 5: Grief/loss — holding outranks behavioral activation
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 5: Grief/loss — holding outranks behavioral activation', () => {
  const griefCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'grief_loss',
    intervention_ready: false,
  });

  it('planner returns PACING_SENSITIVITY for grief_loss', () => {
    const r = evaluatePlannerPrecedence(griefCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('getCaseProtectionLevel returns high for grief_loss', () => {
    expect(getCaseProtectionLevel({ case_type: 'grief_loss' })).toBe('high');
  });

  it('checkInterventionReadiness requires holding_complete for grief_loss', () => {
    const r = checkInterventionReadiness({
      formulation_in_place: true, person_feels_understood: true,
      readiness_signal: true, rationale_is_clear: true, distress_allows_task: true,
      case_type: 'grief_loss',
    });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
  });

  it('micro_step_defaulting is blocked for grief_loss before holding complete', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', griefCtx)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 6: Trauma — stabilization outranks exposure logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 6: Trauma — stabilization outranks exposure logic', () => {
  const traumaCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'trauma',
    intervention_ready: false,
  });

  it('planner returns PACING_SENSITIVITY for trauma', () => {
    const r = evaluatePlannerPrecedence(traumaCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('getCaseProtectionLevel returns high for trauma', () => {
    expect(getCaseProtectionLevel({ case_type: 'trauma' })).toBe('high');
  });

  it('checkInterventionReadiness requires holding_complete for trauma', () => {
    const r = checkInterventionReadiness({
      formulation_in_place: true, person_feels_understood: true,
      readiness_signal: true, rationale_is_clear: true, distress_allows_task: true,
      case_type: 'trauma',
    });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
  });

  it('domain_to_intervention_template is blocked for trauma', () => {
    expect(isLegacyGateBlocked('domain_to_intervention_template', traumaCtx)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 7: ADHD overwhelm — overload understanding precedes action
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 7: ADHD overwhelm — understanding must precede action', () => {
  const adhdCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'adhd_overwhelm',
    intervention_ready: false,
  });

  it('planner returns PACING_SENSITIVITY for adhd_overwhelm', () => {
    const r = evaluatePlannerPrecedence(adhdCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('getCaseProtectionLevel returns standard for adhd_overwhelm', () => {
    expect(getCaseProtectionLevel({ case_type: 'adhd_overwhelm' })).toBe('standard');
  });

  it('micro_step_defaulting is blocked for adhd_overwhelm when not ready', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', adhdCtx)).toBe(true);
  });

  it('skip_clarification is blocked for adhd_overwhelm when formulation missing', () => {
    const ctx = { formulation_in_place: false, case_type: 'adhd_overwhelm' };
    expect(isLegacyGateBlocked('skip_clarification', ctx)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 8: "Nothing helps" — clarification outranks intervention
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 8: "Nothing helps" — clarification outranks intervention', () => {
  const nothingHelpsCtxNoForm = Object.freeze({
    formulation_in_place: false,
    has_been_understood: false,
    case_type: 'nothing_helps',
  });
  const nothingHelpsCtxWithForm = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'nothing_helps',
    intervention_ready: false,
  });

  it('planner returns FORMULATION_FIRST when formulation missing (nothing_helps)', () => {
    const r = evaluatePlannerPrecedence(nothingHelpsCtxNoForm);
    expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('planner returns PACING_SENSITIVITY when formulation in place (nothing_helps)', () => {
    const r = evaluatePlannerPrecedence(nothingHelpsCtxWithForm);
    expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('nothing_helps is in PROTECTED_CASE_TYPES', () => {
    expect(PROTECTED_CASE_TYPES).toContain('nothing_helps');
  });

  it('micro_step_defaulting is blocked for nothing_helps when not ready', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', nothingHelpsCtxWithForm)).toBe(true);
  });

  it('getCaseProtectionLevel returns standard for nothing_helps', () => {
    expect(getCaseProtectionLevel({ case_type: 'nothing_helps' })).toBe('standard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 9: First-disclosure — no-task rule must win
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 9: First-disclosure — no-task rule wins', () => {
  const firstDisclosureCtx = Object.freeze({
    formulation_in_place: true,
    has_been_understood: true,
    case_type: 'first_disclosure',
    is_first_disclosure: true,
    intervention_ready: true,
  });

  it('planner returns FIRST_DISCLOSURE for first_disclosure case with is_first_disclosure=true', () => {
    const r = evaluatePlannerPrecedence(firstDisclosureCtx);
    expect(r.level).toBe(PRECEDENCE_LEVELS.FIRST_DISCLOSURE);
  });

  it('micro_step_defaulting is blocked for first_disclosure', () => {
    expect(isLegacyGateBlocked('micro_step_defaulting', firstDisclosureCtx)).toBe(true);
  });

  it('getCaseProtectionLevel returns high for first_disclosure', () => {
    expect(getCaseProtectionLevel({ case_type: 'first_disclosure' })).toBe('high');
  });

  it('checkInterventionReadiness requires holding_complete for first_disclosure', () => {
    const r = checkInterventionReadiness({
      formulation_in_place: true, person_feels_understood: true,
      readiness_signal: true, rationale_is_clear: true, distress_allows_task: true,
      case_type: 'first_disclosure',
    });
    expect(r.ready).toBe(false);
    expect(r.unmetCriteria).toContain('not_grief_trauma_acute_shame');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 10: Mid-session language switch — hierarchy remains intact
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 10: Mid-session language switch — hierarchy remains intact', () => {
  const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

  for (const lang of languages) {
    it(`hierarchy returns FORMULATION_FIRST for unready session in lang=${lang}`, () => {
      const ctx = { formulation_in_place: false, has_been_understood: false, language: lang };
      const r = evaluatePlannerPrecedence(ctx);
      expect(r.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
    });

    it(`skip_clarification is blocked for unready session in lang=${lang}`, () => {
      const ctx = { formulation_in_place: false, has_been_understood: false, language: lang };
      expect(isLegacyGateBlocked('skip_clarification', ctx)).toBe(true);
    });

    it(`pacing-sensitive case_type grief_loss is protected in lang=${lang}`, () => {
      const ctx = { formulation_in_place: true, has_been_understood: true, case_type: 'grief_loss', language: lang };
      const r = evaluatePlannerPrecedence(ctx);
      expect(r.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 11: Leakage-informed — legacy shortcut reasoning patterns blocked
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 11: Leakage-informed — legacy shortcuts are present in model and blocked', () => {
  it('ALL 4 documented legacy gates exist in LEGACY_GATE_OVERRIDES', () => {
    const expected = [
      'micro_step_defaulting',
      'skip_clarification',
      'social_anxiety_direct_action',
      'domain_to_intervention_template',
    ];
    for (const name of expected) {
      expect(LEGACY_GATE_OVERRIDES[name]).toBeDefined();
    }
  });

  it('classify-domain-then-act pattern is represented and blocked (domain_to_intervention_template)', () => {
    // Leaked pattern: classify domain → trigger legacy gate → skip clarification → force action
    // This is modeled as domain_to_intervention_template + skip_clarification
    const earlySessionCtx = { formulation_in_place: false, has_been_understood: false };
    expect(isLegacyGateBlocked('domain_to_intervention_template', earlySessionCtx)).toBe(true);
    expect(isLegacyGateBlocked('skip_clarification', earlySessionCtx)).toBe(true);
  });

  it('micro-step output without formulation pattern is blocked', () => {
    const earlySessionCtx = { formulation_in_place: false, has_been_understood: false };
    expect(isLegacyGateBlocked('micro_step_defaulting', earlySessionCtx)).toBe(true);
  });

  it('social-anxiety-direct-action pattern is blocked when formulation missing', () => {
    const ctx = { formulation_in_place: false, case_type: 'social_anxiety' };
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('PRECEDENCE_LEVELS.DOMAIN_HEURISTICS is the highest number (lowest priority)', () => {
    const allLevels = Object.values(PRECEDENCE_LEVELS);
    expect(Math.max(...allLevels)).toBe(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
  });

  it('PRECEDENCE_LEVELS.SAFETY is the lowest number (highest priority)', () => {
    const allLevels = Object.values(PRECEDENCE_LEVELS);
    expect(Math.min(...allLevels)).toBe(PRECEDENCE_LEVELS.SAFETY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION CASE 12: Preserved-gains — warmth/pacing/alliance/competence
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression 12: Preserved-gains — prior gains are not regressed', () => {
  it('evaluatePlannerPrecedence is a pure function (same input → same output)', () => {
    const ctx = { formulation_in_place: true, has_been_understood: true, case_type: 'anxiety', intervention_ready: false };
    const r1 = evaluatePlannerPrecedence(ctx);
    const r2 = evaluatePlannerPrecedence(ctx);
    expect(r1.level).toBe(r2.level);
    expect(r1.name).toBe(r2.name);
    expect(r1.reason).toBe(r2.reason);
  });

  it('FORMULATION_FIRST_GATES has understand_presenting_problem first (warmth/holding step)', () => {
    expect(FORMULATION_FIRST_GATES[0]).toBe('understand_presenting_problem');
  });

  it('FORMULATION_FIRST_GATES has build_working_formulation (formulation competence)', () => {
    expect(FORMULATION_FIRST_GATES).toContain('build_working_formulation');
  });

  it('INTERVENTION_READINESS_CHECKLIST has person_feels_understood (alliance gate)', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('person_feels_understood');
  });

  it('INTERVENTION_READINESS_CHECKLIST has readiness_signal (pacing gate)', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('readiness_signal');
  });

  it('INTERVENTION_READINESS_CHECKLIST has distress_allows_task (safety/competence gate)', () => {
    expect(INTERVENTION_READINESS_CHECKLIST).toContain('distress_allows_task');
  });

  it('safety beats all other levels (SAFETY=1 < everything else)', () => {
    const others = Object.entries(PRECEDENCE_LEVELS).filter(([k]) => k !== 'SAFETY');
    for (const [, v] of others) {
      expect(PRECEDENCE_LEVELS.SAFETY).toBeLessThan(v);
    }
  });

  it('COMPETENCE_PLANNER (level 6) outranks DOMAIN_HEURISTICS (level 7)', () => {
    expect(PRECEDENCE_LEVELS.COMPETENCE_PLANNER).toBeLessThan(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
  });

  it('isLegacyGateBlocked never throws for any input combination', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => isLegacyGateBlocked('skip_clarification', input)).not.toThrow();
      expect(() => isLegacyGateBlocked('unknown_gate', input)).not.toThrow();
    }
  });

  it('checkInterventionReadiness never throws for any input', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => checkInterventionReadiness(input)).not.toThrow();
    }
  });

  it('getCaseProtectionLevel never throws for any input', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => getCaseProtectionLevel(input)).not.toThrow();
    }
  });

  it('evaluatePlannerPrecedence never throws for any input', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => evaluatePlannerPrecedence(input)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F: Runtime call-site enforcement
//
// These tests prove that applyStrategyPrecedenceGuard (wired into V8/V10
// decision paths in workflowContextInjector.js) ACTUALLY blocks legacy
// shortcuts at the call-site level — not just that the utility functions
// return the right values.
//
// Each test:
//   1. Builds a strategy state using the real determineTherapistStrategy()
//   2. Builds a planner context using buildPlannerContext()
//   3. Passes both through applyStrategyPrecedenceGuard()
//   4. Asserts that action-capable modes (structured_exploration,
//      formulation_deepening) are overridden to stabilisation when a legacy
//      gate is blocked, and that enforcement metadata is correct.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Section F helpers ────────────────────────────────────────────────────────

/**
 * Builds a minimal CaseFormulation record that passes the FORMULATION_MIN_USEFUL_FIELDS
 * threshold so the strategy engine sees a real formulation.
 */
function makeFormulationRecord() {
  return {
    presenting_problem: 'Recurring social anxiety with avoidance of public situations (40+ chars).',
    core_belief: 'I am fundamentally unacceptable to others — they will see through me (40+ chars).',
    maintaining_cycle: 'Avoidance → no disconfirmation → belief strengthened → more avoidance (40+ chars).',
    treatment_goals: 'Reduce avoidance, build tolerance for uncertainty, test threat appraisals (40+ chars).',
  };
}

/**
 * Builds a thin (below-threshold) formulation record so the planner sees no formulation.
 */
function makeThinFormulationRecord() {
  return { presenting_problem: 'short', core_belief: '', maintaining_cycle: null, treatment_goals: undefined };
}

/** Minimal safe-mode result (no safety flags) */
const noSafetyResult = Object.freeze({ safety_mode_active: false });

/** Minimal continuity data representing a returning user with 1 prior session */
const returningUserContinuity = Object.freeze({
  session_count: 1,
  has_open_follow_up_tasks: false,
  has_patterns: false,
  has_risk_flags: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F.1 — buildPlannerContext
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPlannerContext — context builder', () => {
  it('returns a plain object with all required precedence fields', () => {
    const ctx = buildPlannerContext(null, null, null, {});
    expect(typeof ctx).toBe('object');
    expect('safety_mode_active' in ctx).toBe(true);
    expect('distress_tier' in ctx).toBe(true);
    expect('formulation_in_place' in ctx).toBe(true);
    expect('has_been_understood' in ctx).toBe(true);
    expect('case_type' in ctx).toBe(true);
    expect('is_first_disclosure' in ctx).toBe(true);
    expect('intervention_ready' in ctx).toBe(true);
  });

  it('formulation_in_place is true when record has enough usable fields', () => {
    const record = makeFormulationRecord();
    expect(scoreFormulationRecord(record)).toBeGreaterThanOrEqual(FORMULATION_MIN_USEFUL_FIELDS);
    const ctx = buildPlannerContext(record, null, 'tier_low', {});
    expect(ctx.formulation_in_place).toBe(true);
  });

  it('formulation_in_place is false for null record', () => {
    const ctx = buildPlannerContext(null, null, 'tier_low', {});
    expect(ctx.formulation_in_place).toBe(false);
  });

  it('formulation_in_place is false for thin record below threshold', () => {
    const ctx = buildPlannerContext(makeThinFormulationRecord(), null, 'tier_low', {});
    expect(ctx.formulation_in_place).toBe(false);
  });

  it('safety_mode_active propagates from safetyResult', () => {
    const ctx = buildPlannerContext(null, { safety_mode_active: true }, 'tier_low', {});
    expect(ctx.safety_mode_active).toBe(true);
  });

  it('case_type propagates from sessionOptions', () => {
    const ctx = buildPlannerContext(null, null, 'tier_low', { case_type: 'grief_loss' });
    expect(ctx.case_type).toBe('grief_loss');
  });

  it('is_first_disclosure propagates from sessionOptions', () => {
    const ctx = buildPlannerContext(null, null, 'tier_low', { is_first_disclosure: true });
    expect(ctx.is_first_disclosure).toBe(true);
  });

  it('never throws for any input combination', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => buildPlannerContext(input, input, input, input)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F.2 — applyStrategyPrecedenceGuard — core enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('applyStrategyPrecedenceGuard — core enforcement', () => {
  it('returns an object with enforcement metadata fields', () => {
    const raw = determineTherapistStrategy(null, null, 'tier_low', null, null);
    const result = applyStrategyPrecedenceGuard(raw, {});
    expect('precedence_enforced' in result).toBe(true);
    expect('active_precedence_level' in result).toBe(true);
    expect('active_precedence_name' in result).toBe(true);
    expect('precedence_rationale' in result).toBe(true);
    expect('blocked_gates' in result).toBe(true);
  });

  it('does NOT override containment mode (always safe)', () => {
    const raw = { intervention_mode: 'containment' };
    const ctx = buildPlannerContext(null, null, 'tier_low', {});
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('containment');
  });

  it('does NOT override stabilisation mode', () => {
    const raw = { intervention_mode: 'stabilisation' };
    const ctx = buildPlannerContext(null, null, 'tier_low', {});
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
  });

  it('does NOT override psychoeducation mode', () => {
    const raw = { intervention_mode: 'psychoeducation' };
    const ctx = buildPlannerContext(null, null, 'tier_low', {});
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('psychoeducation');
  });

  it('does NOT override structured_exploration when no gate is blocked (fully ready non-pacing case)', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'anxiety',
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('structured_exploration');
    expect(result.precedence_enforced).toBe(false);
  });

  it('overrides structured_exploration to stabilisation when intervention readiness is not met', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'anxiety',
      has_been_understood: true,
      intervention_ready: false,
    });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.active_precedence_name).toBe('INTERVENTION_READINESS');
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.blocked_gates).toContain('micro_step_defaulting');
  });

  it('never throws for any input combination', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => applyStrategyPrecedenceGuard(input, input)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 1:
// Social anxiety — direct-action shortcut blocked by higher-priority rules
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 1: Social anxiety — direct-action shortcut blocked', () => {
  it('social_anxiety_direct_action gate is blocked when formulation is missing', () => {
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', {
      case_type: 'social_anxiety',
    });
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('applyStrategyPrecedenceGuard overrides structured_exploration → stabilisation when formulation missing', () => {
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', { case_type: 'social_anxiety' });
    const raw = { intervention_mode: STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
  });

  it('applyStrategyPrecedenceGuard overrides formulation_deepening → stabilisation when formulation missing', () => {
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', { case_type: 'social_anxiety' });
    const raw = { intervention_mode: STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
  });

  it('full pipeline: determineTherapistStrategy → applyStrategyPrecedenceGuard blocks direct action when formulation missing', () => {
    const rawStrategy = determineTherapistStrategy(null, null, 'tier_low', null, null);
    // No formulation → psychoeducation (safe default already) but test enforcement path
    // with a thin formulation that looks like partial context
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', {
      case_type: 'social_anxiety',
    });
    // social_anxiety_direct_action is blocked by PACING_SENSITIVITY (level 3)
    // But without formulation, FORMULATION_FIRST (level 2) is active, which is higher priority
    // and also blocks skip_clarification and domain_to_intervention_template
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
    const raw = { intervention_mode: 'structured_exploration' };
    const enforced = applyStrategyPrecedenceGuard(raw, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
    expect(enforced.blocked_gates).toContain('skip_clarification');
  });

  it('full pipeline: social_anxiety with formulation is blocked at PACING_SENSITIVITY level', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(
      returningUserContinuity,
      record,
      'tier_low',
      null,
      null,
    );
    // Without enforcement this would be formulation_deepening or structured_exploration
    expect(['structured_exploration', 'formulation_deepening']).toContain(rawStrategy.intervention_mode);

    // social_anxiety IS NOW pacing-sensitive (added to _PACING_SENSITIVE_CASE_TYPES in v3.6.0
    // as part of the action-first runtime correction).
    // With formulation in place + understood, precedence is PACING_SENSITIVITY (level 3),
    // not INTERVENTION_READINESS (level 5).
    // Level 3 IS <= threshold (4), so mode IS overridden to stabilisation.
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'social_anxiety',
      has_been_understood: true,
      // intervention_ready not set → false → micro_step_defaulting also blocked
    });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    // Mode IS overridden to stabilisation (PACING_SENSITIVITY level 3 triggers mode override)
    expect(enforced.intervention_mode).toBe('stabilisation');
    // Precedence is enforced
    expect(enforced.precedence_enforced).toBe(true);
    // The active level is PACING_SENSITIVITY (3)
    expect(enforced.active_precedence_name).toBe('PACING_SENSITIVITY');
    // social_anxiety_direct_action gate is blocked
    expect(enforced.blocked_gates).toContain('social_anxiety_direct_action');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 2:
// Teen social shame — sensitivity outranks social-action gate
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 2: Teen social shame — sensitivity wins over direct-action gate', () => {
  it('social_anxiety_direct_action is blocked for teen_shame even with formulation in place', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'teen_shame',
      has_been_understood: true,
    });
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('applyStrategyPrecedenceGuard overrides formulation_deepening → stabilisation for teen_shame', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'teen_shame',
      has_been_understood: true,
    });
    const raw = { intervention_mode: 'formulation_deepening' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
    expect(result.active_precedence_name).toBe('PACING_SENSITIVITY');
  });

  it('full pipeline: teen_shame does not collapse into action mode', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'teen_shame',
    });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 3:
// OCD checking — formulation must precede ERP-like move
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 3: OCD checking — formulation precedes ERP', () => {
  it('domain_to_intervention_template is blocked for ocd_checking', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'ocd_checking',
    });
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('applyStrategyPrecedenceGuard overrides structured_exploration → stabilisation for ocd_checking', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'ocd_checking' });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
  });

  it('full pipeline: ocd_checking does not collapse into ERP-like action mode', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'ocd_checking' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.blocked_gates).toContain('domain_to_intervention_template');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 4:
// Scrupulosity — cycle/process wins before behavioral suggestion
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 4: Scrupulosity — cycle understanding before suggestion', () => {
  it('social_anxiety_direct_action and domain_to_intervention_template blocked for scrupulosity', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'scrupulosity' });
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('full pipeline: scrupulosity does not collapse into early behavioral suggestion', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    // With has_been_understood: true, scrupulosity triggers PACING_SENSITIVITY level 3
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'scrupulosity',
      has_been_understood: true,
    });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
    expect(enforced.active_precedence_name).toBe('PACING_SENSITIVITY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 5:
// Grief/loss — holding wins before behavioral activation
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 5: Grief/loss — holding wins before activation', () => {
  it('all action gates are blocked for grief_loss', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'grief_loss' });
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
    expect(isLegacyGateBlocked('micro_step_defaulting', ctx)).toBe(true);
  });

  it('full pipeline: grief_loss does not collapse into behavioral activation', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'grief_loss' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
    expect(enforced.blocked_gates.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 6:
// Trauma — stabilization wins before exposure/action
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 6: Trauma — stabilization wins before exposure', () => {
  it('all action gates are blocked for trauma', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'trauma' });
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('full pipeline: trauma does not collapse into exposure or action mode', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'trauma' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 7:
// ADHD overwhelm — understanding wins before micro-step
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 7: ADHD overwhelm — understanding wins before micro-step', () => {
  it('micro_step_defaulting is blocked for adhd_overwhelm even with formulation', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'adhd_overwhelm',
      has_been_understood: true,
    });
    expect(isLegacyGateBlocked('micro_step_defaulting', ctx)).toBe(true);
  });

  it('full pipeline: adhd_overwhelm does not collapse into micro-step assignment', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'adhd_overwhelm' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
    expect(enforced.blocked_gates).toContain('micro_step_defaulting');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 8:
// "Nothing helps" — clarification wins before another intervention
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 8: "Nothing helps" — clarification wins before intervention', () => {
  it('pacing-level action gates are blocked for nothing_helps (with understanding present)', () => {
    const record = makeFormulationRecord();
    // has_been_understood: true → formulation complete → PACING_SENSITIVITY (level 3) active
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'nothing_helps',
      has_been_understood: true,
    });
    // skip_clarification blocked at FORMULATION_FIRST (level 2) → NOT blocked when level is 3
    expect(isLegacyGateBlocked('skip_clarification', ctx)).toBe(false);
    // pacing-level gates ARE blocked
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true); // pacing level active
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true); // pacing level active
  });

  it('full pipeline: nothing_helps does not collapse into another intervention', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'nothing_helps' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 9:
// First disclosure — no-task rule wins in runtime execution
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 9: First disclosure — no-task rule wins', () => {
  it('micro_step_defaulting is blocked for first_disclosure', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'first_disclosure',
      is_first_disclosure: true,
    });
    expect(isLegacyGateBlocked('micro_step_defaulting', ctx)).toBe(true);
  });

  it('applyStrategyPrecedenceGuard enforces stabilisation for first_disclosure with action-capable mode', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'first_disclosure',
      is_first_disclosure: true,
      has_been_understood: true,
    });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
    expect(result.blocked_gates.length).toBeGreaterThan(0);
  });

  it('full pipeline: first_disclosure no-task rule wins', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'first_disclosure',
      is_first_disclosure: true,
    });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.precedence_enforced).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 10:
// Cross-language runtime parity — all 7 languages get same enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 10: Cross-language parity — enforcement equal across all 7 languages', () => {
  const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

  for (const lang of languages) {
    it(`teen_shame action-mode override fires in lang=${lang}`, () => {
      const record = makeFormulationRecord();
      const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
        case_type: 'teen_shame',
        language: lang,
      });
      const raw = { intervention_mode: 'formulation_deepening' };
      const result = applyStrategyPrecedenceGuard(raw, ctx);
      expect(result.intervention_mode).toBe('stabilisation');
      expect(result.precedence_enforced).toBe(true);
    });

    it(`grief_loss action-mode override fires in lang=${lang}`, () => {
      const record = makeFormulationRecord();
      const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
        case_type: 'grief_loss',
        language: lang,
      });
      const raw = { intervention_mode: 'structured_exploration' };
      const result = applyStrategyPrecedenceGuard(raw, ctx);
      expect(result.intervention_mode).toBe('stabilisation');
      expect(result.precedence_enforced).toBe(true);
    });

    it(`unready session skip_clarification blocked in lang=${lang}`, () => {
      const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', { language: lang });
      expect(isLegacyGateBlocked('skip_clarification', ctx)).toBe(true);
      const raw = { intervention_mode: 'structured_exploration' };
      const result = applyStrategyPrecedenceGuard(raw, ctx);
      expect(result.intervention_mode).toBe('stabilisation');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 11:
// Leakage-informed — full pipeline no longer reasons through legacy shortcuts
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 11: Leakage-informed — legacy shortcut sequence is intercepted', () => {
  it('classify-domain-then-act sequence: pacing-sensitive domain routes to stabilisation via enforcement', () => {
    // Simulate: domain=grief_loss (pacing-sensitive) + formulation present + returning user
    // Old leakage path: domain → domain_to_intervention_template → action output
    // New enforced path: domain_to_intervention_template BLOCKED (PACING_SENSITIVITY level 3) → stabilisation
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'grief_loss',
      has_been_understood: true,
    });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(enforced.intervention_mode).toBe('stabilisation');
    expect(enforced.blocked_gates).toContain('social_anxiety_direct_action');
    expect(enforced.blocked_gates).toContain('domain_to_intervention_template');
  });

  it('skip-clarification-then-action sequence is intercepted for unready session', () => {
    // Simulate: no formulation yet + trying to jump to action via skip_clarification
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', { case_type: 'anxiety' });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.blocked_gates).toContain('skip_clarification');
  });

  it('micro-step-without-formulation sequence is intercepted', () => {
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', {});
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.blocked_gates).toContain('micro_step_defaulting');
  });

  it('buildPrecedenceEnforcementBlock produces non-empty text when enforcement fired', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'grief_loss' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    const block = buildPrecedenceEnforcementBlock(enforced);
    expect(typeof block).toBe('string');
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('PRECEDENCE ENFORCEMENT');
    expect(block).toContain('BLOCKED');
  });

  it('buildPrecedenceEnforcementBlock returns empty string when no enforcement fired', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'anxiety',
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    const raw = { intervention_mode: 'structured_exploration', precedence_enforced: false, blocked_gates: [] };
    const block = buildPrecedenceEnforcementBlock(raw);
    expect(block).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME ENFORCEMENT REGRESSION 12:
// Preserved gains — warmth/pacing/alliance/competence no regression
// ─────────────────────────────────────────────────────────────────────────────

describe('Runtime Enforcement 12: Preserved gains — prior gains are not regressed', () => {
  it('fully-ready non-pacing session: structured_exploration is NOT overridden', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'anxiety',
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    const raw = { intervention_mode: 'structured_exploration' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('structured_exploration');
    expect(result.precedence_enforced).toBe(false);
  });

  it('fully-ready non-pacing session: formulation_deepening is NOT overridden', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', {
      case_type: 'depression',
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    const raw = { intervention_mode: 'formulation_deepening' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('formulation_deepening');
    expect(result.precedence_enforced).toBe(false);
  });

  it('applyStrategyPrecedenceGuard is a pure function (same input → same output)', () => {
    const record = makeFormulationRecord();
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'teen_shame' });
    const raw = { intervention_mode: 'formulation_deepening' };
    const r1 = applyStrategyPrecedenceGuard(raw, ctx);
    const r2 = applyStrategyPrecedenceGuard(raw, ctx);
    expect(r1.intervention_mode).toBe(r2.intervention_mode);
    expect(r1.precedence_enforced).toBe(r2.precedence_enforced);
    expect(r1.active_precedence_level).toBe(r2.active_precedence_level);
  });

  it('psychoeducation (first-session safe default) is never changed', () => {
    const ctx = buildPlannerContext(null, noSafetyResult, 'tier_low', {});
    const raw = { intervention_mode: 'psychoeducation' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('psychoeducation');
  });

  it('containment (highest urgency) is never changed', () => {
    const ctx = buildPlannerContext(null, { safety_mode_active: true }, 'tier_high', {});
    const raw = { intervention_mode: 'containment' };
    const result = applyStrategyPrecedenceGuard(raw, ctx);
    expect(result.intervention_mode).toBe('containment');
  });

  it('buildPrecedenceEnforcementBlock never throws for any input', () => {
    const inputs = [null, undefined, {}, [], 'string', 42];
    for (const input of inputs) {
      expect(() => buildPrecedenceEnforcementBlock(input)).not.toThrow();
    }
  });

  it('enforcement metadata includes all required fields on blocked case', () => {
    const record = makeFormulationRecord();
    const rawStrategy = determineTherapistStrategy(returningUserContinuity, record, 'tier_low', null, null);
    const ctx = buildPlannerContext(record, noSafetyResult, 'tier_low', { case_type: 'grief_loss' });
    const enforced = applyStrategyPrecedenceGuard(rawStrategy, ctx);
    expect(typeof enforced.active_precedence_level).toBe('number');
    expect(typeof enforced.active_precedence_name).toBe('string');
    expect(typeof enforced.precedence_rationale).toBe('string');
    expect(Array.isArray(enforced.blocked_gates)).toBe(true);
    expect(enforced.precedence_enforced).toBe(true);
  });
});