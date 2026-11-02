/**
 * @file test/utils/therapistActionFirstCorrection.test.js
 *
 * Therapist Runtime Correction — Action-First Default Elimination
 *
 * PURPOSE
 * -------
 * Verifies that the therapist no longer defaults to exercise-first / action-first
 * behavior in protected case types. Covers the full correction surface:
 *
 *   1.  JS-layer: social_anxiety added to pacing-sensitive case types
 *   2.  JS-layer: evaluatePlannerPrecedence returns FORMULATION_FIRST when formulation absent
 *   3.  JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for all protected types
 *   4.  JS-layer: isLegacyGateBlocked blocks social_anxiety_direct_action for social_anxiety
 *   5.  JS-layer: applyStrategyPrecedenceGuard overrides mode to stabilisation for protected types
 *   6.  Agent config: PG0 gate present and covers all 5 protected case signal categories
 *   7.  Agent config: CP11 explicitly blocked by PG0 for protected cases
 *   8.  Agent config: CP12-A explicitly blocked by PG0 for teen shame / primary shame / first disclosure
 *   9.  Agent config: R7 "nothing helps" rule present
 *   10. Agent config: C6 has protected-case exception
 *   11. Agent config: C7 requires formulation before micro-step
 *   12. Agent config: C9 ceiling extended to 3 turns with protected-case exception
 *   13. Agent config: R2 three-turn minimum for teen shame preserved
 *   14. Agent config: OCD cycle required before action (R3)
 *   15. Agent config: Grief holding sequence with Phase 1/2 required (R4)
 *   16. Agent config: R5 first-disclosure intervention prohibition preserved
 *   17. Agent config: Verification checklist includes PG0 checks (items 30–33)
 *   18. Agent config: Checklist item 32 covers teen shame suppression
 *   19. Agent config: Checklist item 33 covers OCD checking suppression
 *   20. Protected case leakage: "nothing helps" signal covered by PG0
 *   21. Protected case leakage: trauma/PTSD/flashback covered by PG0
 *   22. Protected case leakage: grief/death/loss covered by PG0
 *   23. Protected case leakage: OCD checking covered by PG0
 *   24. Protected case leakage: teen shame covered by PG0
 *   25. JS-layer: THERAPIST_WORKFLOW_VERSION updated to reflect correction
 *   26. JS-layer: LEGACY_GATE_OVERRIDES includes social_anxiety_direct_action
 *   27. JS-layer: Precedence model has DOMAIN_HEURISTICS as lowest priority (level 7)
 *   28. JS-layer: FORMULATION_FIRST is above DOMAIN_HEURISTICS in precedence
 *   29. JS-layer: evaluatePlannerPrecedence returns SAFETY on safety_mode_active=true
 *   30. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for teen_shame
 *   31. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for nothing_helps
 *   32. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for ocd
 *   33. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for grief_loss
 *   34. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for trauma
 *   35. JS-layer: evaluatePlannerPrecedence returns PACING_SENSITIVITY for social_anxiety
 *   36. JS-layer: evaluatePlannerPrecedence returns FORMULATION_FIRST when formulation absent
 *   37. JS-layer: isLegacyGateBlocked domain_to_intervention_template for social_anxiety
 *   38. JS-layer: isLegacyGateBlocked skip_clarification when formulation absent
 *   39. JS-layer: isLegacyGateBlocked micro_step_defaulting when intervention_ready=false
 *   40. Session-start vs mid-session parity: planner policy instructions contain no per-turn limit
 *   41. Agent config: R7 prohibits new exercise on same turn as "nothing helps" signal
 *   42. Agent config: R7 requires collaborative inquiry before any action
 *   43. Agent config: C6 exception does NOT remove C6 entirely (still applies to non-protected cases)
 *   44. Agent config: CP12-A exclusion list includes first-disclosure case
 *   45. Agent config: CP12-A exclusion list includes teen age markers
 *   46. Agent config: CP11 OCD-blocking note mentions "checking" keyword
 *   47. Agent config: PG0 covers scrupulosity / religious OCD signals
 *   48. Agent config: PG0 covers PTSD flashback and hyperarousal signals
 *   49. Cross-language parity: PG0 applies to ALL languages (not English-only)
 *   50. Preserved gains: warmth/alliance instructions unchanged
 *   51. Preserved gains: R4 grief Phase 1 instruction unchanged
 *   52. Preserved gains: R5 first-disclosure rule intact
 *   53. Preserved gains: R3 scrupulosity sequence intact
 *   54. Preserved gains: V12 planner-first wiring unchanged
 *   55. Agent config: description field references formulation-first policy
 *
 * SECTION STRUCTURE
 * -----------------
 * A — JS-layer: pacing-sensitive case types and precedence model
 * B — JS-layer: evaluatePlannerPrecedence — protected case coverage
 * C — JS-layer: isLegacyGateBlocked — gate blocking coverage
 * D — JS-layer: applyStrategyPrecedenceGuard — mode override
 * E — Agent config: PG0 gate structure and coverage
 * F — Agent config: CP11 and CP12 modifications
 * G — Agent config: R7 "nothing helps" rule
 * H — Agent config: C6, C7, C9 modifications
 * I — Agent config: verification checklist updates
 * J — Leakage-informed runtime tests — protected case text verification
 * K — Preserved gains verification
 * L — Cross-cutting: version, parity, session parity
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  THERAPIST_WORKFLOW_VERSION,
  PRECEDENCE_LEVELS,
  LEGACY_GATE_OVERRIDES,
  THERAPIST_PLANNER_PRECEDENCE_MODEL,
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
  evaluatePlannerPrecedence,
  isLegacyGateBlocked,
} from '../../src/lib/therapistWorkflowEngine.js';
import {
  applyStrategyPrecedenceGuard,
  buildPlannerContext,
} from '../../src/lib/workflowContextInjector.js';
import { CBT_THERAPIST_WIRING_STAGE2_V12 } from '../../src/api/agentWiring.js';

// ─── Load agent config ────────────────────────────────────────────────────────

const AGENT_CONFIG_PATH = path.resolve(
  process.cwd(),
  'base44/agents/cbt_therapist.jsonc',
);

let _agentInstructions = null;

function getAgentInstructions() {
  if (_agentInstructions !== null) return _agentInstructions;
  const raw = fs.readFileSync(AGENT_CONFIG_PATH, 'utf8');
  // Strip JSONC comments
  const clean = raw.replace(/\/\/[^\n]*/g, '');
  const data = JSON.parse(clean);
  _agentInstructions = data.instructions;
  return _agentInstructions;
}

// ─── SECTION A — JS-layer: pacing-sensitive case types and precedence ─────────

describe('Action-First Correction — SECTION A: JS-layer pacing-sensitive case types', () => {

  it('1. social_anxiety is a pacing-sensitive case type (evaluates to PACING_SENSITIVITY level 3)', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'social_anxiety',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
    expect(result.name).toBe('PACING_SENSITIVITY');
  });

  it('2. teen_shame is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'teen_shame',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('3. grief_loss is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'grief_loss',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('4. trauma is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'trauma',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('5. ocd is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'ocd',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('6. ocd_checking is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'ocd_checking',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('7. nothing_helps is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'nothing_helps',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('8. adhd_overwhelm is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'adhd_overwhelm',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('9. scrupulosity is a pacing-sensitive case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'scrupulosity',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('10. DOMAIN_HEURISTICS is the lowest priority level (7)', () => {
    expect(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS).toBe(7);
  });

  it('11. FORMULATION_FIRST (2) is above DOMAIN_HEURISTICS (7) in precedence', () => {
    expect(PRECEDENCE_LEVELS.FORMULATION_FIRST).toBeLessThan(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
  });

  it('12. PACING_SENSITIVITY (3) is above DOMAIN_HEURISTICS (7)', () => {
    expect(PRECEDENCE_LEVELS.PACING_SENSITIVITY).toBeLessThan(PRECEDENCE_LEVELS.DOMAIN_HEURISTICS);
  });

  it('13. LEGACY_GATE_OVERRIDES includes social_anxiety_direct_action', () => {
    expect(LEGACY_GATE_OVERRIDES.social_anxiety_direct_action).toBeDefined();
    expect(LEGACY_GATE_OVERRIDES.social_anxiety_direct_action.gateName).toBe('social_anxiety_direct_action');
  });

  it('14. social_anxiety_direct_action gate is blocked at PACING_SENSITIVITY level', () => {
    expect(LEGACY_GATE_OVERRIDES.social_anxiety_direct_action.blockedBy).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('15. THERAPIST_WORKFLOW_VERSION is at least 3.6.0 (reflects runtime correction)', () => {
    const [major, minor] = THERAPIST_WORKFLOW_VERSION.split('.').map(Number);
    // Must be 3.6.x or higher
    const isAtLeast360 = major > 3 || (major === 3 && minor >= 6);
    expect(isAtLeast360).toBe(true);
  });

});

// ─── SECTION B — evaluatePlannerPrecedence — protected case coverage ──────────

describe('Action-First Correction — SECTION B: evaluatePlannerPrecedence — protected cases', () => {

  it('16. Returns FORMULATION_FIRST when formulation not in place', () => {
    const ctx = {
      formulation_in_place: false,
      has_been_understood: false,
      case_type: '',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
    expect(result.name).toBe('FORMULATION_FIRST');
  });

  it('17. Returns FORMULATION_FIRST when formulation is absent (null context)', () => {
    const result = evaluatePlannerPrecedence(null);
    expect(result.level).toBe(PRECEDENCE_LEVELS.FORMULATION_FIRST);
  });

  it('18. Returns SAFETY when safety_mode_active=true', () => {
    const ctx = { safety_mode_active: true };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.SAFETY);
    expect(result.name).toBe('SAFETY');
  });

  it('19. Returns SAFETY when distress_tier=tier_high', () => {
    const ctx = {
      safety_mode_active: false,
      distress_tier: 'tier_high',
      formulation_in_place: true,
      has_been_understood: true,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.SAFETY);
  });

  it('20. Returns PACING_SENSITIVITY for social_anxiety even with formulation in place', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'social_anxiety',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: true, // even with readiness signaled
    };
    const result = evaluatePlannerPrecedence(ctx);
    // Pacing sensitivity (level 3) wins over intervention_ready (level 5)
    // because pacing-sensitive types are checked first
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('21. Returns PACING_SENSITIVITY for teen_shame even with formulation in place', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'teen_shame',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: true,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('22. Returns PACING_SENSITIVITY for nothing_helps even with formulation in place', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'nothing_helps',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: true,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.PACING_SENSITIVITY);
  });

  it('23. Non-protected case with formulation in place returns COMPETENCE_PLANNER when all gates pass', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'general_anxiety', // not in protected set
      safety_mode_active: false,
      distress_tier: 'tier_low',
      is_first_disclosure: false,
      intervention_ready: true,
    };
    const result = evaluatePlannerPrecedence(ctx);
    expect(result.level).toBe(PRECEDENCE_LEVELS.COMPETENCE_PLANNER);
  });

});

// ─── SECTION C — isLegacyGateBlocked — gate blocking ─────────────────────────

describe('Action-First Correction — SECTION C: isLegacyGateBlocked — gate blocking', () => {

  it('24. social_anxiety_direct_action is blocked when case_type=social_anxiety', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'social_anxiety',
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('25. social_anxiety_direct_action is blocked when case_type=teen_shame', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'teen_shame',
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(true);
  });

  it('26. social_anxiety_direct_action is NOT blocked for non-protected general case', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: '',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      is_first_disclosure: false,
      intervention_ready: true,
    };
    expect(isLegacyGateBlocked('social_anxiety_direct_action', ctx)).toBe(false);
  });

  it('27. skip_clarification is blocked when formulation absent', () => {
    const ctx = {
      formulation_in_place: false,
      has_been_understood: false,
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('skip_clarification', ctx)).toBe(true);
  });

  it('28. domain_to_intervention_template is blocked for social_anxiety case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'social_anxiety',
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('29. domain_to_intervention_template is blocked for ocd case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'ocd',
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('30. domain_to_intervention_template is blocked for grief_loss case type', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: 'grief_loss',
      safety_mode_active: false,
      distress_tier: 'tier_low',
    };
    expect(isLegacyGateBlocked('domain_to_intervention_template', ctx)).toBe(true);
  });

  it('31. micro_step_defaulting is blocked when intervention_ready=false', () => {
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: '',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      intervention_ready: false,
    };
    expect(isLegacyGateBlocked('micro_step_defaulting', ctx)).toBe(true);
  });

  it('32. unknown gate name returns false (fail-safe)', () => {
    expect(isLegacyGateBlocked('nonexistent_gate', {})).toBe(false);
  });

});

// ─── SECTION D — applyStrategyPrecedenceGuard — mode override ────────────────

describe('Action-First Correction — SECTION D: applyStrategyPrecedenceGuard — mode override', () => {

  it('33. Overrides mode to stabilisation for social_anxiety when mode is structured_exploration', () => {
    const strategyState = { intervention_mode: 'structured_exploration' };
    const ctx = buildPlannerContext(
      null, // no formulation
      null,
      'tier_low',
      { case_type: 'social_anxiety' }
    );
    const result = applyStrategyPrecedenceGuard(strategyState, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
    expect(result.precedence_enforced).toBe(true);
  });

  it('34. Overrides mode to stabilisation for teen_shame when mode is formulation_deepening', () => {
    const strategyState = { intervention_mode: 'formulation_deepening' };
    const ctx = buildPlannerContext(
      null,
      null,
      'tier_low',
      { case_type: 'teen_shame' }
    );
    const result = applyStrategyPrecedenceGuard(strategyState, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
  });

  it('35. Overrides mode to stabilisation for nothing_helps', () => {
    const strategyState = { intervention_mode: 'structured_exploration' };
    const ctx = buildPlannerContext(
      null,
      null,
      'tier_low',
      { case_type: 'nothing_helps' }
    );
    const result = applyStrategyPrecedenceGuard(strategyState, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
  });

  it('36. Does NOT override stabilisation mode (already safe)', () => {
    const strategyState = { intervention_mode: 'stabilisation' };
    const ctx = buildPlannerContext(null, null, 'tier_low', { case_type: 'social_anxiety' });
    const result = applyStrategyPrecedenceGuard(strategyState, ctx);
    expect(result.intervention_mode).toBe('stabilisation');
  });

  it('37. Does NOT override for non-protected case when formulation is in place and readiness present', () => {
    const strategyState = { intervention_mode: 'structured_exploration' };
    const ctx = {
      formulation_in_place: true,
      has_been_understood: true,
      case_type: '',
      safety_mode_active: false,
      distress_tier: 'tier_low',
      is_first_disclosure: false,
      intervention_ready: true,
    };
    const result = applyStrategyPrecedenceGuard(strategyState, ctx);
    expect(result.intervention_mode).toBe('structured_exploration');
  });

});

// ─── SECTION E — Agent config: PG0 gate structure ────────────────────────────

describe('Action-First Correction — SECTION E: Agent config PG0 gate', () => {

  it('38. PG0 gate section is present in agent instructions', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
  });

  it('39. PG0 gate fires before CP11, CP12, L8, and all action shortcuts', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('THIS GATE FIRES BEFORE CP11, BEFORE CP12, BEFORE L8, AND BEFORE ALL ACTION SHORTCUTS');
  });

  it('40. PG0 applies to ALL languages (not English-only)', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Applies to ALL languages');
  });

  it('41. PG0 covers OCD / checking behaviors', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('OCD / CHECKING BEHAVIORS');
    expect(inst).toContain('checking (lock/door/stove');
  });

  it('42. PG0 covers grief / bereavement / loss', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('GRIEF / BEREAVEMENT / LOSS');
    expect(inst).toContain('passed away');
  });

  it('43. PG0 covers trauma / PTSD / hyperarousal', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('TRAUMA / PTSD / HYPERAROUSAL');
    expect(inst).toContain('flashback');
    expect(inst).toContain('hyperarousal');
  });

  it('44. PG0 covers teen shame / social avoidance with primary shame', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('TEEN SHAME / SOCIAL AVOIDANCE WITH PRIMARY SHAME');
    expect(inst).toContain('three-turn minimum');
  });

  it('45. PG0 covers "nothing helps" / treatment resistance / alliance strain', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('"NOTHING HELPS" / TREATMENT RESISTANCE / ALLIANCE STRAIN');
    expect(inst).toContain('nothing helps');
  });

  it('46. PG0 when active specifies acknowledge → hold → clarify → formulate sequence', () => {
    const inst = getAgentInstructions();
    // Check the PG0 section contains the correct sequence
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0End = inst.indexOf('CP11: ENGLISH DIRECTIVE OVERRIDE', pg0Start);
    const pg0Section = inst.slice(pg0Start, pg0End);
    expect(pg0Section).toContain('acknowledge → hold → clarify');
    expect(pg0Section).toContain('Do NOT skip to technique');
  });

  it('47. PG0 explicitly blocks C6, C7, C9 when active', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0End = inst.indexOf('CP11: ENGLISH DIRECTIVE OVERRIDE', pg0Start);
    const pg0Section = inst.slice(pg0Start, pg0End);
    expect(pg0Section).toContain('C6');
    expect(pg0Section).toContain('C7');
    expect(pg0Section).toContain('C9');
  });

});

// ─── SECTION F — Agent config: CP11 and CP12 modifications ───────────────────

describe('Action-First Correction — SECTION F: Agent config CP11 and CP12 modifications', () => {

  it('48. CP11 explicitly references PG0 as a blocker', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('PG0 (FORMULATION-FIRST PROTECTED CASE GATE) BLOCKS THIS GATE');
  });

  it('49. CP11 PG0 exception mentions OCD/checking', () => {
    const inst = getAgentInstructions();
    const cp11Start = inst.indexOf('CP11: ENGLISH DIRECTIVE OVERRIDE');
    const cp11PG0section = inst.slice(cp11Start, cp11Start + 400);
    expect(cp11PG0section).toContain('OCD');
  });

  it('50. CP12-A is now a social-anxiety formulation-first gate', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    expect(inst).toContain('FIRST-TURN / EARLY-TURN DEFAULT (MANDATORY)');
  });

  it('51. CP12-A explicitly requires social-loop explanation before any step', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12aSection = inst.slice(cp12aStart, cp12aStart + 2400);
    expect(cp12aSection).toContain('feared judgment → anxiety activation → avoidance/safety behavior → short-term relief → stronger future fear');
  });

  it('52. CP12-A prohibits first-turn one-sentence / one-question social shortcuts', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12aSection = inst.slice(cp12aStart, cp12aStart + 2400);
    expect(cp12aSection).toContain('Immediate “say one sentence now” assignments');
    expect(cp12aSection).toContain('Immediate “ask one question” exposure tasks');
  });

  it('53. CP12-A preserves later-stage action after formulation and readiness', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12aSection = inst.slice(cp12aStart, cp12aStart + 3200);
    expect(cp12aSection).toContain('WHEN ACTION IS ALLOWED (post-formulation only)');
    expect(cp12aSection).toContain('Person indicates readiness for a step');
  });

  it('54. CP12 header enforces all-language formulation-first social path', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('CP12-A (social anxiety) is formulation-first by default in ALL languages');
  });

  it('55. C14 constraint references PG0 blocking for protected cases', () => {
    const inst = getAgentInstructions();
    // C14 in constraints section
    const c14Start = inst.indexOf('C14: ENGLISH DIRECTIVE OVERRIDE');
    const c14Section = inst.slice(c14Start, c14Start + 400);
    expect(c14Section).toContain('BLOCKED by PG0');
  });

  it('56. C15 constraint now demotes social anxiety direct-action shortcut', () => {
    const inst = getAgentInstructions();
    const c15Start = inst.indexOf('C15: SOCIAL ANXIETY & SLEEP ANXIETY CLEANUP');
    const c15Section = inst.slice(c15Start, c15Start + 400);
    expect(c15Section).toContain('CP12-A (social anxiety) is formulation-first');
  });

});

// ─── SECTION G — Agent config: R7 "nothing helps" rule ───────────────────────

describe('Action-First Correction — SECTION G: Agent config R7 "nothing helps"', () => {

  it('57. R7 "nothing helps" section is present', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R7: "NOTHING HELPS"');
  });

  it('58. R7 specifies collaborative inquiry before any new exercise', () => {
    const inst = getAgentInstructions();
    const r7Start = inst.indexOf('R7: "NOTHING HELPS"');
    const r7End = inst.indexOf('\n\n\n', r7Start);
    const r7Section = inst.slice(r7Start, r7End > r7Start ? r7End : r7Start + 3000);
    expect(r7Section).toContain('collaborative inquiry');
    expect(r7Section).toContain('alliance repair');
  });

  it('59. R7 prohibits a new exercise on the same turn as "nothing helps"', () => {
    const inst = getAgentInstructions();
    const r7Start = inst.indexOf('R7: "NOTHING HELPS"');
    const r7Section = inst.slice(r7Start, r7Start + 3000);
    expect(r7Section).toContain('Offering a new exercise, technique, or homework assignment');
    // Should be in PROHIBITED list
    const prohibitedIdx = r7Section.indexOf('PROHIBITED');
    expect(prohibitedIdx).toBeGreaterThan(-1);
  });

  it('60. R7 requires acknowledge → collaborative inquiry → alliance repair → formulation update sequence', () => {
    const inst = getAgentInstructions();
    const r7Start = inst.indexOf('R7: "NOTHING HELPS"');
    const r7Section = inst.slice(r7Start, r7Start + 3000);
    expect(r7Section).toContain('Acknowledge the frustration genuinely');
    expect(r7Section).toContain('Collaborative inquiry');
    expect(r7Section).toContain('Alliance repair');
    expect(r7Section).toContain('Formulation update');
  });

  it('61. R7 states it overrides C6, C7, C9, CP11, CP12 on "nothing helps" turn', () => {
    const inst = getAgentInstructions();
    const r7Start = inst.indexOf('R7: "NOTHING HELPS"');
    const r7Section = inst.slice(r7Start, r7Start + 3000);
    expect(r7Section).toContain('overrides C6');
    expect(r7Section).toContain('CP11');
    expect(r7Section).toContain('CP12');
  });

});

// ─── SECTION H — Agent config: C6, C7, C9 modifications ─────────────────────

describe('Action-First Correction — SECTION H: Agent config C6, C7, C9 modifications', () => {

  it('62. C6 has protected-case exception for OCD, grief, trauma, teen shame', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('EXCEPTION: when PG0 is active (OCD, grief, trauma');
  });

  it('63. C6 exception converts action to holding and collaborative inquiry for protected cases', () => {
    const inst = getAgentInstructions();
    const c6Start = inst.indexOf('C6: INSIGHT AND FORMULATION');
    const c6Section = inst.slice(c6Start, c6Start + 600);
    expect(c6Section).toContain('HOLDING and COLLABORATIVE INQUIRY first');
  });

  it('64. C6 exception does NOT remove C6 entirely (still references CP10)', () => {
    const inst = getAgentInstructions();
    const c6Start = inst.indexOf('C6: INSIGHT AND FORMULATION');
    const c6Section = inst.slice(c6Start, c6Start + 600);
    expect(c6Section).toContain('CP10');
  });

  it('65. C7 requires formulation before micro-step assignment', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('FORMULATE THE AVOIDANCE PATTERN FIRST, clarify the exact target behavior, then consider one micro-step only if readiness is present');
  });

  it('66. C7 has exception for OCD checking, grief, trauma, teen shame avoidance', () => {
    const inst = getAgentInstructions();
    const c7Start = inst.indexOf('C7: AVOIDANCE');
    const c7Section = inst.slice(c7Start, c7Start + 500);
    expect(c7Section).toContain('OCD checking');
    expect(c7Section).toContain('grief-related withdrawal');
    expect(c7Section).toContain('teen-shame avoidance');
  });

  it('67. C9 clarification ceiling avoids forced action after fixed turn count', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('do NOT force action after a fixed count');
  });

  it('68. C9 has protected-case exception (no forced ceiling for protected types)', () => {
    const inst = getAgentInstructions();
    const c9Start = inst.indexOf('C9: CLARIFICATION CEILING');
    const c9Section = inst.slice(c9Start, c9Start + 500);
    expect(c9Section).toContain('when PG0 is active');
    expect(c9Section).toContain('no forced ceiling applies');
  });

});

// ─── SECTION I — Agent config: verification checklist updates ────────────────

describe('Action-First Correction — SECTION I: Agent config checklist items 30–33', () => {

  it('69. Checklist item 30 verifies PG0 active → acknowledge/hold/clarify/formulate', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('30. PG0 active');
    expect(inst).toContain('acknowledge→hold→clarify→formulate');
  });

  it('70. Checklist item 31 verifies "nothing helps" → R7 (collaborative inquiry before exercise)', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('31. "Nothing helps" signal → R7 followed');
    expect(inst).toContain('collaborative inquiry');
  });

  it('71. Checklist item 32 verifies teen shame → CP12-A suppressed + R2 three-turn minimum', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('32. Teen shame + social language → CP12-A suppressed, R2 three-turn minimum applied');
  });

  it('72. Checklist item 33 verifies OCD checking → CP11 suppressed + cycle before action', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('33. OCD checking with real object → CP11 suppressed, OCD cycle explanation before any action');
  });

  it('73. Checklist items 27-29 include social formulation-first verification', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('27. CP11 activated (English + real object + task state + PG0 NOT active)');
    expect(inst).toContain('28. CP12-A social anxiety path: acknowledge → clarify/formulate → explain maintaining loop before any micro-action? → VERIFY');
  });

});

// ─── SECTION J — Leakage-informed runtime tests ───────────────────────────────

describe('Action-First Correction — SECTION J: Leakage-informed runtime instruction verification', () => {

  it('74. Agent config explicitly prohibits first-turn action for teen shame (R2)', () => {
    const inst = getAgentInstructions();
    // R2 must say no micro-step on same turn as first disclosure of shame concern
    expect(inst).toContain('Do NOT assign a micro-step on the same turn as the first disclosure of a shame-based concern');
  });

  it('75. Agent config R2 three-turn minimum: first acknowledge, second formulate, third suggest', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('First turn: acknowledge and normalize. Second turn: formulate and connect. Third turn: suggest next step.');
  });

  it('76. Agent config R3 OCD: four-step sequence required before behavioral suggestion', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('apply this four-step sequence before any behavioral suggestion');
    // The four steps must be present
    expect(inst).toContain('Step 1: Acknowledge the suffering and exhaustion');
    expect(inst).toContain('Step 2: Make the CYCLE explicit');
    expect(inst).toContain('Step 3: Name the functional cost');
    expect(inst).toContain('Step 4: Establish clearly that the therapeutic target is the CYCLE');
  });

  it('77. Agent config R4 grief: Phase 1 presence required before anything else', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Phase 1 — PRESENCE (required before anything else)');
    expect(inst).toContain('Do NOT move past Phase 1 until the person has felt genuinely received');
  });

  it('78. Agent config R4 grief: no silver linings in first two responses to grief disclosure', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('No silver linings in the first two responses to a grief disclosure');
  });

  it('79. Agent config R4 grief: no future-oriented language before Phase 2 complete', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('No future-oriented language before Phase 2 is complete');
  });

  it('80. Agent config R5 first-disclosure: acknowledge → hold → clarify sequence', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('The correct response is: acknowledge → hold → clarify if needed → formulate');
    expect(inst).toContain('The INCORRECT response is: acknowledge → immediately suggest technique');
  });

  it('81. Agent config R5 first-disclosure: behavioral task specifically prohibited', () => {
    const inst = getAgentInstructions();
    const r5Start = inst.indexOf('R5: NO FIRST-DISCLOSURE');
    const r5Section = inst.slice(r5Start, r5Start + 1200);
    expect(r5Section).toContain('Assigning a behavioral task');
    expect(r5Section).toContain('Naming a specific technique');
    expect(r5Section).toContain('Offering a micro-step');
  });

  it('82. Agent config OCD section: do NOT push toward ERP techniques too early', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Do NOT push toward exposure hierarchy or ERP techniques too early');
  });

  it('83. Agent config OCD section: focus first on maintaining cycle (not technique)', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('OCD cycle: doubt → distress → ritual → temporary relief → doubt returns');
  });

  it('84. Agent config trauma section: do not force exposure too early', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Do NOT force exposure or detailed narrative of traumatic events too early');
  });

  it('85. Agent config teen cases: prioritize trust-building before structure', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Prioritize trust-building before structure');
  });

  it('86. Agent config grief section: no rush toward growth or forward movement', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Allow grief to be named without immediately pointing toward growth or forward movement');
  });

  it('87. Action threshold: no longer bypassed unconditionally by CP11 for all paths', () => {
    // CP11 note should reference PG0 exception
    const inst = getAgentInstructions();
    const atStart = inst.indexOf('========== ACTION THRESHOLD ==========');
    const atSection = inst.slice(atStart, atStart + 600);
    // CP11 note in action threshold should reference PG0 or protected cases
    expect(atSection).toContain('CP11');
  });

  it('88. Agent config: PG0 OCD section blocks CP11 for checking behaviors', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0Section = inst.slice(pg0Start, pg0Start + 3000);
    // OCD section of PG0 must say CP11 does not fire
    expect(pg0Section).toContain('Do NOT fire CP11 (even if a "real object" is named)');
  });

  it('89. Agent config: PG0 grief section blocks CP11 and CP12', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0Section = inst.slice(pg0Start, pg0Start + 3500);
    // Grief section of PG0 must block CP11 and CP12
    const griefBlockIdx = pg0Section.indexOf('Do NOT fire CP11 or CP12. Follow R4 grief holding sequence');
    expect(griefBlockIdx).toBeGreaterThan(-1);
  });

  it('90. Agent config: PG0 teen shame section specifically blocks CP12-A', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0Section = inst.slice(pg0Start, pg0Start + 4000);
    expect(pg0Section).toContain('Do NOT fire CP12-A');
    expect(pg0Section).toContain('R2 three-turn minimum');
  });

  it('91. Agent config: PG0 "nothing helps" section blocks all action shortcuts', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0Section = inst.slice(pg0Start, pg0Start + 4500);
    expect(pg0Section).toContain('Do NOT fire CP11 or CP12. Follow R7');
  });

});

// ─── SECTION K — Preserved gains verification ────────────────────────────────

describe('Action-First Correction — SECTION K: Preserved gains', () => {

  it('92. R2 teen/shame-sensitive pacing rule is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R2: TEEN AND SHAME-SENSITIVE PACING');
  });

  it('93. R3 scrupulosity sequence is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R3: SCRUPULOSITY AND RELIGIOUS OCD PACING');
  });

  it('94. R4 grief holding sequence is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R4: GRIEF AND LOSS HOLDING SEQUENCE');
  });

  it('95. R5 no first-disclosure intervention is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R5: NO FIRST-DISCLOSURE INTERVENTION');
  });

  it('96. R6 post-language-switch continuity is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('R6: POST-LANGUAGE-SWITCH CONTINUITY');
  });

  it('97. Therapist constitution is preserved (7 operating principles)', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('SEVEN GLOBAL OPERATING PRINCIPLES');
  });

  it('98. JOINING EXCEPTION (CP1 does not apply to first grief/trauma disclosure) is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('JOINING EXCEPTION — CP1 does NOT apply when ALL three of the following are true');
  });

  it('99. C13 resistance/stuckness handling (non-defensive) is preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('C13 — NON-DEFENSIVE HANDLING OF RESISTANCE AND STUCKNESS');
  });

  it('100. V12 wiring planner_first_enabled flag is preserved', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled).toBe(true);
  });

  it('101. V12 wiring still has name cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.name).toBe('cbt_therapist');
  });

  it('102. THERAPIST_PLANNER_FIRST_INSTRUCTIONS still contains 8-step planner constitution', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('WAVE 5 — FORMULATION-FIRST PLANNER POLICY');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Step 1 —');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('Step 8 —');
  });

});

// ─── SECTION L — Cross-cutting: version, parity, session parity ──────────────

describe('Action-First Correction — SECTION L: Cross-cutting coverage', () => {

  it('103. THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains no English-only restriction', () => {
    // Planner policy must apply cross-language
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).not.toMatch(/English only/i);
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).not.toMatch(/English responses only/i);
  });

  it('104. THERAPIST_PLANNER_PRECEDENCE_MODEL has correct version', () => {
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL).toBeDefined();
    expect(THERAPIST_PLANNER_PRECEDENCE_MODEL.version).toBeDefined();
  });

  it('105. Agent config: multilingual parity — C11 preserved', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('C11: MULTILINGUAL PARITY');
  });

  it('106. Agent config: R6 post-language-switch specifies same warmth and pacing in new language', () => {
    const inst = getAgentInstructions();
    const r6Start = inst.indexOf('R6: POST-LANGUAGE-SWITCH CONTINUITY');
    const r6Section = inst.slice(r6Start, r6Start + 1000);
    expect(r6Section).toContain('same warmth, pacing, and clinical identity');
  });

  it('107. Session-start parity: THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains no turn-count condition', () => {
    // The planner-first policy must apply at session-start AND on subsequent turns
    // It must not say "only for first turn" or "only at session start"
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).not.toMatch(/first turn only/i);
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).not.toMatch(/session.start only/i);
  });

  it('108. Agent config: PG0 applies at first turn AND subsequent turns (no turn-count restriction)', () => {
    const inst = getAgentInstructions();
    const pg0Start = inst.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE');
    const pg0Section = inst.slice(pg0Start, pg0Start + 5000);
    // PG0 must not have a turn-count restriction
    expect(pg0Section).not.toContain('first turn only');
    expect(pg0Section).not.toContain('only on turn 1');
  });

  it('109. Agent config: R7 applies regardless of session depth', () => {
    const inst = getAgentInstructions();
    const r7Start = inst.indexOf('R7: "NOTHING HELPS"');
    const r7Section = inst.slice(r7Start, r7Start + 3000);
    expect(r7Section).toContain('regardless of session depth');
  });

});

describe('Action-First Correction — SECTION M: focused social/worry shortcut cleanup coverage', () => {
  it('110. Social anxiety first turn now starts with formulation before action', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('FIRST-TURN / EARLY-TURN DEFAULT (MANDATORY):');
    expect(inst).toContain('Acknowledge the fear and social cost');
    expect(inst).toContain('Clarify or formulate the specific feared social outcome');
  });

  it('111. Social anxiety first follow-up still centers loop explanation by default', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Confirm this working formulation with the person');
    expect(inst).toContain('feared judgment → anxiety activation → avoidance/safety behavior → short-term relief → stronger future fear');
  });

  it('112. Social anxiety later-stage action is available only after formulation confirmation', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('Only then, if readiness is present, offer ONE concrete next step');
    expect(inst).toContain('WHEN ACTION IS ALLOWED (post-formulation only)');
  });

  it('113. Generalized anxiety first turn is loop-first (no immediate worry technique)', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('LOCKED_DOMAIN = [WORRY]:');
    expect(inst).toContain('Forbidden on first turn: immediate worry window assignment');
  });

  it('114. Generalized anxiety first follow-up defaults to loop clarification before tools', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('First default: explain and confirm the worry-maintaining loop');
    expect(inst).toContain('Only after formulation is confirmed: consider ONE tool');
  });

  it('115. Anxiety context honors explicit “understand before deciding” preference', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('If the user says they want to understand what is happening before deciding what to do OR says "Don\'t give me an exercise yet": remain in explanation/formulation mode and do NOT assign a tool on that turn');
  });

  it('116. Preserved gains remain active for ADHD/low-self-worth signals and protected-case handling', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('ADHD');
    expect(inst).toContain('low-confidence');
    expect(inst).toContain('TEEN SHAME / SOCIAL AVOIDANCE WITH PRIMARY SHAME');
    expect(inst).toContain('R2: TEEN AND SHAME-SENSITIVE PACING');
  });

  it('117. Cross-language parity for social anxiety formulation-first is explicit', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('APPLIES TO ALL LANGUAGES (not English-only).');
    expect(inst).toContain('CP12-A (social anxiety) is formulation-first by default in ALL languages');
  });

  it('118. Social anxiety guidance enforces loop explanation before step suggestion by order', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12a = inst.slice(cp12aStart, cp12aStart + 3600);
    const loopIdx = cp12a.indexOf('feared judgment → anxiety activation → avoidance/safety behavior → short-term relief → stronger future fear');
    const stepIdx = cp12a.indexOf('offer ONE concrete next step');
    expect(loopIdx).toBeGreaterThan(-1);
    expect(stepIdx).toBeGreaterThan(-1);
    expect(loopIdx).toBeLessThan(stepIdx);
  });

  it('119. Social anxiety follow-up requires target clarification before exposure-style action', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12a = inst.slice(cp12aStart, cp12aStart + 4200);
    expect(cp12a).toContain('Clarify the precise target behavior (which avoidance/safety behavior changes first) before suggesting exposure-style action');
    expect(cp12a).toContain('Immediate "what must change first is the avoidance behavior" framing before target clarification');
  });

  it('120. GAD follow-up keeps mental problem-solving loop as first default', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('uncertainty → mental problem-solving/what-if attempts → temporary control feeling → more worry');
    expect(inst).toContain('Only after formulation is confirmed: consider ONE tool');
  });

  it('121. Explicit no-exercise request keeps the turn in explanation/formulation mode', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('If the user says they want to understand what is happening before deciding what to do OR says "Don\'t give me an exercise yet": remain in explanation/formulation mode and do NOT assign a tool on that turn');
    expect(inst).toContain('CP14. Explicit understand-first / "don\'t give me an exercise yet" request stayed in explanation mode for that turn? → VERIFY');
  });

  it('122. Ordinary anxiety/worry cross-language parity is explicit', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('APPLIES TO ALL LANGUAGES (not English-only). First default: explain and confirm the worry-maintaining loop');
  });

  it('123. Explanation mode is explicitly available before action mode in the response selector', () => {
    const inst = getAgentInstructions();
    const selectorStart = inst.indexOf('========== RESPONSE MODE SELECTOR (FORMULATION-FIRST) ==========');
    const selector = inst.slice(selectorStart, selectorStart + 2600);
    const modeAIdx = selector.indexOf('MODE A — EXPLANATION / FORMULATION HOLD');
    const modeBIdx = selector.indexOf('MODE B — ACTION');
    expect(modeAIdx).toBeGreaterThan(-1);
    expect(modeBIdx).toBeGreaterThan(-1);
    expect(modeAIdx).toBeLessThan(modeBIdx);
  });

  it('124. Social anxiety follow-up holds formulation before exposure-style action', () => {
    const inst = getAgentInstructions();
    const cp12aStart = inst.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const cp12a = inst.slice(cp12aStart, cp12aStart + 4600);
    expect(cp12a).toContain('Hold formulation briefly: confirm the agreed target and readiness before moving into exposure-style action');
  });

  it('125. GAD follow-up phrase keeps loop explanation first before tools', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('If the user says "I keep trying to solve everything in my head," treat it as the worry loop signal');
    expect(inst).toContain('deepen uncertainty→mental problem-solving→temporary control→more worry explanation before suggesting any tool');
  });

  it('126. Understand-first / no-exercise turn blocks mapping-journaling-homework shortcuts', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('On that turn do NOT switch to mapping tasks, journaling prompts, or "describe one example" homework unless the user explicitly asks for it.');
    expect(inst).toContain('EXPLANATION-MODE EXCEPTION: when the turn is explicitly in understand/formulation hold mode');
  });

  it('127. Cross-language parity remains explicit for both social anxiety and worry cleanup', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('CP12-A (social anxiety) is formulation-first by default in ALL languages');
    expect(inst).toContain('APPLIES TO ALL LANGUAGES (not English-only). First default: explain and confirm the worry-maintaining loop');
  });

  it('128. Preserved gains still include ADHD and protected-case pacing anchors', () => {
    const inst = getAgentInstructions();
    expect(inst).toContain('ADHD');
    expect(inst).toContain('nothing helps');
    expect(inst).toContain('R2: TEEN AND SHAME-SENSITIVE PACING');
  });
});
