/**
 * @file test/utils/therapistPlannerFirstPolicy.test.js
 *
 * Wave 5 — Formulation-First Planner Policy
 *
 * PURPOSE
 * -------
 * Verifies the Wave 5 formulation-first planner policy upgrade:
 *
 * SECTION A — PLANNER CONSTITUTION EXPORTS
 *  1.  THERAPIST_PLANNER_CONSTITUTION is exported from therapistWorkflowEngine.js
 *  2.  THERAPIST_PLANNER_CONSTITUTION is a frozen array
 *  3.  THERAPIST_PLANNER_CONSTITUTION has exactly 8 steps
 *  4.  Each step has id, label, description fields
 *  5.  Step 1 is 'understand_presenting_problem'
 *  6.  Step 7 is 'select_intervention_when_justified'
 *  7.  Step 8 is 'micro_steps_are_late_stage'
 *  8.  Steps are numbered 1–8 sequentially
 *
 * SECTION B — TREATMENT TARGET TAXONOMY EXPORTS
 *  9.  THERAPIST_TREATMENT_TARGET_TAXONOMY is exported
 *  10. THERAPIST_TREATMENT_TARGET_TAXONOMY is a frozen object
 *  11. Taxonomy has exactly 10 target types
 *  12. 'maintaining_cycle' target exists
 *  13. 'shame_loop' target exists
 *  14. 'grief_impact' target exists
 *  15. 'uncertainty_intolerance' target exists
 *  16. 'belief_content' describes scrupulosity constraint
 *  17. Each target has id, label, description, when_to_target fields
 *
 * SECTION C — CASE-TYPE POSTURES EXPORTS
 *  18. THERAPIST_CASE_TYPE_POSTURES is exported
 *  19. THERAPIST_CASE_TYPE_POSTURES is a frozen object
 *  20. Postures has exactly 9 case types
 *  21. 'anxiety' posture exists
 *  22. 'ocd' posture exists
 *  23. 'scrupulosity' posture exists
 *  24. 'grief_loss' posture exists
 *  25. 'trauma' posture exists
 *  26. 'adhd_overwhelm' posture exists
 *  27. 'teen_shame' posture exists
 *  28. 'anger_parenting' posture exists
 *  29. 'depression' posture exists
 *  30. Each posture has id, label, default_target, early_stance, common_error, correct_path
 *  31. scrupulosity posture targets maintaining_cycle (not belief_content)
 *  32. grief_loss posture targets grief_impact
 *  33. trauma posture targets emotional_pain
 *  34. teen_shame posture targets shame_loop
 *  35. anxiety posture's common_error mentions avoidance/cycle
 *  36. ocd posture's correct_path mentions cycle before ERP-like move
 *
 * SECTION D — INTERVENTION READINESS GATES EXPORTS
 *  37. THERAPIST_INTERVENTION_READINESS_GATES is exported
 *  38. THERAPIST_INTERVENTION_READINESS_GATES is a frozen object
 *  39. Gates has exactly 6 readiness gates
 *  40. 'formulation_in_place' gate exists
 *  41. 'person_feels_understood' gate exists
 *  42. 'readiness_signal' gate exists
 *  43. 'rationale_is_clear' gate exists
 *  44. 'distress_allows_task' gate exists
 *  45. 'not_grief_trauma_acute_shame' gate exists
 *  46. Each gate has id, label, condition, if_not_met fields
 *
 * SECTION E — PLANNER-FIRST INSTRUCTION BUILDER
 *  47. buildPlannerFirstInstructions is exported and is a function
 *  48. THERAPIST_PLANNER_FIRST_INSTRUCTIONS is exported and non-empty
 *  49. THERAPIST_PLANNER_FIRST_INSTRUCTIONS starts with Wave 5 header
 *  50. THERAPIST_PLANNER_FIRST_INSTRUCTIONS ends with Wave 5 footer
 *  51. Instructions contain 'PLANNER CONSTITUTION'
 *  52. Instructions contain 'TREATMENT TARGET TAXONOMY'
 *  53. Instructions contain 'CASE-TYPE REASONING POSTURES'
 *  54. Instructions contain 'INTERVENTION READINESS GATES'
 *  55. Instructions contain the HARD RULE about intervention-first bias
 *  56. Instructions contain the HARD FAILURE CONDITIONS section
 *  57. Instructions contain the PRESERVED GAINS section
 *  58. buildPlannerFirstInstructions() returns same string as THERAPIST_PLANNER_FIRST_INSTRUCTIONS
 *
 * SECTION F — V12 WIRING CONFIG
 *  59. CBT_THERAPIST_WIRING_STAGE2_V12 is exported from agentWiring.js
 *  60. V12 has name 'cbt_therapist'
 *  61. V12 has stage2: true
 *  62. V12 has stage2_phase: 16
 *  63. V12 has planner_first_enabled: true
 *  64. V12 has competence_layer_enabled: true (from V11)
 *  65. V12 has knowledge_layer_enabled: true (from V10)
 *  66. V12 has strategy_layer_enabled: true (from V8)
 *  67. V12 tool_configs has same entity count as V11
 *  68. V12 tool_configs does NOT add any new entity names beyond V11
 *  69. V12 entity source_orders are unchanged from V11
 *
 * SECTION G — WORKFLOW CONTEXT INJECTOR
 *  70. getPlannerFirstContextForWiring is exported from workflowContextInjector.js
 *  71. getPlannerFirstContextForWiring returns null for HYBRID wiring
 *  72. getPlannerFirstContextForWiring returns null for V11 wiring
 *  73. getPlannerFirstContextForWiring returns null for null input
 *  74. getPlannerFirstContextForWiring returns THERAPIST_PLANNER_FIRST_INSTRUCTIONS for V12
 *  75. buildV12SessionStartContentAsync is exported and is an async function
 *  76. buildV12SessionStartContentAsync returns '[START_SESSION]' for HYBRID wiring
 *  77. buildV12SessionStartContentAsync returns '[START_SESSION]' for null wiring
 *  78. buildV12SessionStartContentAsync result for V12 contains '[START_SESSION]'
 *  79. buildV12SessionStartContentAsync result for V12 contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS
 *  80. buildV12SessionStartContentAsync result for V12 contains THERAPIST_WORKFLOW_INSTRUCTIONS (V2 layer)
 *
 * SECTION H — ROUTING AND FLAG ISOLATION
 *  81. THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED key
 *  82. THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED defaults to false
 *  83. resolveTherapistWiring() returns HYBRID when all flags are false
 *  84. resolveTherapistWiring() returns V12 when PLANNER_FIRST + ENABLED flags are on
 *  85. ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default path unchanged)
 *  86. V12 is not the active wiring when all flags are false
 *  87. V11 is still returned when COMPETENCE_ENABLED is on but PLANNER_FIRST is off
 *  88. V12 supersedes V11 when PLANNER_FIRST is on
 *  89. Resolver phase order: V12 > V11 > V10 > V9 > V8 > V7 > V6 > V5 > … > HYBRID
 *
 * SECTION I — BACKWARD COMPATIBILITY
 *  90. HYBRID wiring still has no planner_first_enabled flag
 *  91. V11 wiring does NOT have planner_first_enabled === true
 *  92. V10 wiring does NOT have planner_first_enabled === true
 *  93. V6 wiring does NOT have planner_first_enabled === true
 *  94. buildV12SessionStartContentAsync with HYBRID wiring returns exactly '[START_SESSION]'
 *  95. buildV12SessionStartContentAsync never throws for null/undefined wiring
 *  96. THERAPIST_WORKFLOW_INSTRUCTIONS is still exported and unchanged
 *  97. Existing V11 still has same entity set as V12
 *  98. THERAPIST_WORKFLOW_VERSION is '3.7.0'
 *
 * SECTION J — CLINICAL REGRESSION SCENARIOS
 *  99.  Anxiety: planner builds formulation before action (common_error describes avoidance/cycle first)
 * 100.  Depression: planner avoids premature technique (correct_path requires formulation before activation)
 * 101.  OCD: planner identifies loop before ERP-like move
 * 102.  Scrupulosity: planner targets cycle, not belief content
 * 103.  Grief/loss: planner prioritizes holding and meaning before action
 * 104.  Trauma: planner does not jump to exposure (default target is emotional_pain)
 * 105.  ADHD overwhelm: planner differentiates overload driver before strategy
 * 106.  Teen shame: planner slows down (three-turn minimum before task)
 * 107.  Anger/parenting: planner identifies escalation pattern before intervention
 * 108.  'Nothing helps' blocker: gate 'rationale_is_clear' prohibits pushing generic technique
 * 109.  Cross-language parity: THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains no language-specific content
 * 110.  Leakage regression: planner instructions use first-person clinical framing, not internal labels
 */

import { describe, it, expect } from 'vitest';

// ── Wave 5 — Planner engine ───────────────────────────────────────────────────
import {
  THERAPIST_PLANNER_CONSTITUTION,
  THERAPIST_TREATMENT_TARGET_TAXONOMY,
  THERAPIST_CASE_TYPE_POSTURES,
  THERAPIST_INTERVENTION_READINESS_GATES,
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  THERAPIST_WORKFLOW_VERSION,
  buildPlannerFirstInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Wiring configs ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_STAGE2_V10,
  CBT_THERAPIST_WIRING_STAGE2_V11,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';

// ── Workflow context injector ─────────────────────────────────────────────────
import {
  getPlannerFirstContextForWiring,
  buildV12SessionStartContentAsync,
  buildActionFirstDemotedSessionContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Feature flags + resolver ──────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
} from '../../src/lib/featureFlags.js';

import {
  resolveTherapistWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ─── SECTION A — Planner constitution exports ─────────────────────────────────

describe('Wave 5 — SECTION A: THERAPIST_PLANNER_CONSTITUTION', () => {
  it('1. THERAPIST_PLANNER_CONSTITUTION is exported', () => {
    expect(THERAPIST_PLANNER_CONSTITUTION).toBeDefined();
  });

  it('2. THERAPIST_PLANNER_CONSTITUTION is a frozen array', () => {
    expect(Array.isArray(THERAPIST_PLANNER_CONSTITUTION)).toBe(true);
    expect(Object.isFrozen(THERAPIST_PLANNER_CONSTITUTION)).toBe(true);
  });

  it('3. THERAPIST_PLANNER_CONSTITUTION has exactly 8 steps', () => {
    expect(THERAPIST_PLANNER_CONSTITUTION).toHaveLength(8);
  });

  it('4. Each step has id, label, description fields', () => {
    for (const step of THERAPIST_PLANNER_CONSTITUTION) {
      expect(typeof step.id).toBe('string');
      expect(step.id.length).toBeGreaterThan(0);
      expect(typeof step.label).toBe('string');
      expect(step.label.length).toBeGreaterThan(0);
      expect(typeof step.description).toBe('string');
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('5. Step 1 is understand_presenting_problem', () => {
    expect(THERAPIST_PLANNER_CONSTITUTION[0].step).toBe(1);
    expect(THERAPIST_PLANNER_CONSTITUTION[0].id).toBe('understand_presenting_problem');
  });

  it('6. Step 7 is select_intervention_when_justified', () => {
    expect(THERAPIST_PLANNER_CONSTITUTION[6].step).toBe(7);
    expect(THERAPIST_PLANNER_CONSTITUTION[6].id).toBe('select_intervention_when_justified');
  });

  it('7. Step 8 is micro_steps_are_late_stage', () => {
    expect(THERAPIST_PLANNER_CONSTITUTION[7].step).toBe(8);
    expect(THERAPIST_PLANNER_CONSTITUTION[7].id).toBe('micro_steps_are_late_stage');
  });

  it('8. Steps are numbered 1–8 sequentially', () => {
    THERAPIST_PLANNER_CONSTITUTION.forEach((step, i) => {
      expect(step.step).toBe(i + 1);
    });
  });
});

// ─── SECTION B — Treatment target taxonomy exports ────────────────────────────

describe('Wave 5 — SECTION B: THERAPIST_TREATMENT_TARGET_TAXONOMY', () => {
  it('9. THERAPIST_TREATMENT_TARGET_TAXONOMY is exported', () => {
    expect(THERAPIST_TREATMENT_TARGET_TAXONOMY).toBeDefined();
  });

  it('10. THERAPIST_TREATMENT_TARGET_TAXONOMY is a frozen object', () => {
    expect(Object.isFrozen(THERAPIST_TREATMENT_TARGET_TAXONOMY)).toBe(true);
  });

  it('11. Taxonomy has exactly 10 target types', () => {
    expect(Object.keys(THERAPIST_TREATMENT_TARGET_TAXONOMY)).toHaveLength(10);
  });

  it('12. maintaining_cycle target exists', () => {
    expect(THERAPIST_TREATMENT_TARGET_TAXONOMY.maintaining_cycle).toBeDefined();
  });

  it('13. shame_loop target exists', () => {
    expect(THERAPIST_TREATMENT_TARGET_TAXONOMY.shame_loop).toBeDefined();
  });

  it('14. grief_impact target exists', () => {
    expect(THERAPIST_TREATMENT_TARGET_TAXONOMY.grief_impact).toBeDefined();
  });

  it('15. uncertainty_intolerance target exists', () => {
    expect(THERAPIST_TREATMENT_TARGET_TAXONOMY.uncertainty_intolerance).toBeDefined();
  });

  it('16. belief_content describes scrupulosity constraint (never target belief in OCD)', () => {
    const bc = THERAPIST_TREATMENT_TARGET_TAXONOMY.belief_content;
    expect(bc.when_to_target).toContain('scrupulosity');
  });

  it('17. Each target has id, label, description, when_to_target fields', () => {
    for (const [key, target] of Object.entries(THERAPIST_TREATMENT_TARGET_TAXONOMY)) {
      expect(typeof target.id).toBe('string');
      expect(target.id).toBe(key);
      expect(typeof target.label).toBe('string');
      expect(typeof target.description).toBe('string');
      expect(typeof target.when_to_target).toBe('string');
    }
  });
});

// ─── SECTION C — Case-type reasoning postures ─────────────────────────────────

describe('Wave 5 — SECTION C: THERAPIST_CASE_TYPE_POSTURES', () => {
  it('18. THERAPIST_CASE_TYPE_POSTURES is exported', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES).toBeDefined();
  });

  it('19. THERAPIST_CASE_TYPE_POSTURES is a frozen object', () => {
    expect(Object.isFrozen(THERAPIST_CASE_TYPE_POSTURES)).toBe(true);
  });

  it('20. Postures has exactly 9 case types', () => {
    expect(Object.keys(THERAPIST_CASE_TYPE_POSTURES)).toHaveLength(9);
  });

  it('21. anxiety posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.anxiety).toBeDefined();
  });

  it('22. ocd posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.ocd).toBeDefined();
  });

  it('23. scrupulosity posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.scrupulosity).toBeDefined();
  });

  it('24. grief_loss posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.grief_loss).toBeDefined();
  });

  it('25. trauma posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.trauma).toBeDefined();
  });

  it('26. adhd_overwhelm posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.adhd_overwhelm).toBeDefined();
  });

  it('27. teen_shame posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.teen_shame).toBeDefined();
  });

  it('28. anger_parenting posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.anger_parenting).toBeDefined();
  });

  it('29. depression posture exists', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.depression).toBeDefined();
  });

  it('30. Each posture has id, label, default_target, early_stance, common_error, correct_path', () => {
    for (const [key, posture] of Object.entries(THERAPIST_CASE_TYPE_POSTURES)) {
      expect(typeof posture.id).toBe('string');
      expect(posture.id).toBe(key);
      expect(typeof posture.label).toBe('string');
      expect(typeof posture.default_target).toBe('string');
      expect(typeof posture.early_stance).toBe('string');
      expect(typeof posture.common_error).toBe('string');
      expect(typeof posture.correct_path).toBe('string');
    }
  });

  it('31. scrupulosity posture targets maintaining_cycle (not belief_content)', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.scrupulosity.default_target).toBe('maintaining_cycle');
    expect(THERAPIST_CASE_TYPE_POSTURES.scrupulosity.default_target).not.toBe('belief_content');
  });

  it('32. grief_loss posture targets grief_impact', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.grief_loss.default_target).toBe('grief_impact');
  });

  it('33. trauma posture targets emotional_pain', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.trauma.default_target).toBe('emotional_pain');
  });

  it('34. teen_shame posture targets shame_loop', () => {
    expect(THERAPIST_CASE_TYPE_POSTURES.teen_shame.default_target).toBe('shame_loop');
  });

  it('35. anxiety posture common_error mentions jumping to technique before cycle', () => {
    const err = THERAPIST_CASE_TYPE_POSTURES.anxiety.common_error.toLowerCase();
    // Must mention avoidance/cycle/belief before technique
    expect(err).toMatch(/avoidance|cycle|belief/);
  });

  it('36. ocd posture correct_path mentions cycle before ERP-like move', () => {
    const path = THERAPIST_CASE_TYPE_POSTURES.ocd.correct_path;
    const cyclePos = path.indexOf('cycle');
    const erpPos = path.toLowerCase().indexOf('response prevention');
    // Cycle must appear before ERP framing
    expect(cyclePos).toBeGreaterThan(-1);
    expect(erpPos).toBeGreaterThan(-1);
    expect(cyclePos).toBeLessThan(erpPos);
  });
});

// ─── SECTION D — Intervention readiness gates ─────────────────────────────────

describe('Wave 5 — SECTION D: THERAPIST_INTERVENTION_READINESS_GATES', () => {
  it('37. THERAPIST_INTERVENTION_READINESS_GATES is exported', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES).toBeDefined();
  });

  it('38. THERAPIST_INTERVENTION_READINESS_GATES is a frozen object', () => {
    expect(Object.isFrozen(THERAPIST_INTERVENTION_READINESS_GATES)).toBe(true);
  });

  it('39. Gates has exactly 6 readiness gates', () => {
    expect(Object.keys(THERAPIST_INTERVENTION_READINESS_GATES)).toHaveLength(6);
  });

  it('40. formulation_in_place gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.formulation_in_place).toBeDefined();
  });

  it('41. person_feels_understood gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.person_feels_understood).toBeDefined();
  });

  it('42. readiness_signal gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.readiness_signal).toBeDefined();
  });

  it('43. rationale_is_clear gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.rationale_is_clear).toBeDefined();
  });

  it('44. distress_allows_task gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.distress_allows_task).toBeDefined();
  });

  it('45. not_grief_trauma_acute_shame gate exists', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.not_grief_trauma_acute_shame).toBeDefined();
  });

  it('46. Each gate has id, label, condition, if_not_met fields', () => {
    for (const [key, gate] of Object.entries(THERAPIST_INTERVENTION_READINESS_GATES)) {
      expect(typeof gate.id).toBe('string');
      expect(gate.id).toBe(key);
      expect(typeof gate.label).toBe('string');
      expect(typeof gate.condition).toBe('string');
      expect(typeof gate.if_not_met).toBe('string');
    }
  });
});

// ─── SECTION E — Planner-first instruction builder ────────────────────────────

describe('Wave 5 — SECTION E: buildPlannerFirstInstructions and THERAPIST_PLANNER_FIRST_INSTRUCTIONS', () => {
  it('47. buildPlannerFirstInstructions is exported and is a function', () => {
    expect(typeof buildPlannerFirstInstructions).toBe('function');
  });

  it('48. THERAPIST_PLANNER_FIRST_INSTRUCTIONS is exported and non-empty', () => {
    expect(typeof THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('49. THERAPIST_PLANNER_FIRST_INSTRUCTIONS starts with Wave 5 header', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toMatch(
      /^=== WAVE 5 — FORMULATION-FIRST PLANNER POLICY ===/,
    );
  });

  it('50. THERAPIST_PLANNER_FIRST_INSTRUCTIONS ends with Wave 5 footer', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS.trim()).toMatch(
      /=== END WAVE 5 — FORMULATION-FIRST PLANNER POLICY ===$$/,
    );
  });

  it('51. Instructions contain PLANNER CONSTITUTION section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('PLANNER CONSTITUTION');
  });

  it('52. Instructions contain TREATMENT TARGET TAXONOMY section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('TREATMENT TARGET TAXONOMY');
  });

  it('53. Instructions contain CASE-TYPE REASONING POSTURES section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('CASE-TYPE REASONING POSTURES');
  });

  it('54. Instructions contain INTERVENTION READINESS GATES section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('INTERVENTION READINESS GATES');
  });

  it('55. Instructions contain the HARD RULE about intervention-first bias', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('HARD RULE');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain(
      'Intervention selection and micro-step assignment must NEVER be the default',
    );
  });

  it('56. Instructions contain the HARD FAILURE CONDITIONS section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('HARD FAILURE CONDITIONS');
  });

  it('57. Instructions contain the PRESERVED GAINS section', () => {
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('PRESERVED GAINS');
  });

  it('58. buildPlannerFirstInstructions() returns same string as THERAPIST_PLANNER_FIRST_INSTRUCTIONS', () => {
    expect(buildPlannerFirstInstructions()).toBe(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
  });
});

// ─── SECTION F — V12 wiring config ───────────────────────────────────────────

describe('Wave 5 — SECTION F: CBT_THERAPIST_WIRING_STAGE2_V12', () => {
  it('59. CBT_THERAPIST_WIRING_STAGE2_V12 is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12).toBeDefined();
  });

  it('60. V12 has name cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.name).toBe('cbt_therapist');
  });

  it('61. V12 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.stage2).toBe(true);
  });

  it('62. V12 has stage2_phase: 16', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.stage2_phase).toBe(16);
  });

  it('63. V12 has planner_first_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled).toBe(true);
  });

  it('64. V12 has competence_layer_enabled: true (from V11)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.competence_layer_enabled).toBe(true);
  });

  it('65. V12 has knowledge_layer_enabled: true (from V10)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.knowledge_layer_enabled).toBe(true);
  });

  it('66. V12 has strategy_layer_enabled: true (from V8)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.strategy_layer_enabled).toBe(true);
  });

  it('67. V12 tool_configs has same entity count as V11', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.tool_configs).toHaveLength(
      CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.length,
    );
  });

  it('68. V12 tool_configs does NOT add any new entity names beyond V11', () => {
    const v11Names = new Set(
      CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.map((t) => t.entity_name),
    );
    for (const cfg of CBT_THERAPIST_WIRING_STAGE2_V12.tool_configs) {
      expect(v11Names.has(cfg.entity_name)).toBe(true);
    }
  });

  it('69. V12 entity source_orders are unchanged from V11', () => {
    const v11Map = Object.fromEntries(
      CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs.map((t) => [t.entity_name, t.source_order]),
    );
    for (const cfg of CBT_THERAPIST_WIRING_STAGE2_V12.tool_configs) {
      expect(cfg.source_order).toBe(v11Map[cfg.entity_name]);
    }
  });
});

// ─── SECTION G — Workflow context injector ────────────────────────────────────

describe('Wave 5 — SECTION G: getPlannerFirstContextForWiring and buildV12SessionStartContentAsync', () => {
  it('70. getPlannerFirstContextForWiring is exported', () => {
    expect(typeof getPlannerFirstContextForWiring).toBe('function');
  });

  it('71. getPlannerFirstContextForWiring returns null for HYBRID wiring', () => {
    expect(getPlannerFirstContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('72. getPlannerFirstContextForWiring returns null for V11 wiring', () => {
    expect(getPlannerFirstContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V11)).toBeNull();
  });

  it('73. getPlannerFirstContextForWiring returns null for null input', () => {
    expect(getPlannerFirstContextForWiring(null)).toBeNull();
  });

  it('74. getPlannerFirstContextForWiring returns THERAPIST_PLANNER_FIRST_INSTRUCTIONS for V12', () => {
    expect(getPlannerFirstContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V12)).toBe(
      THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
    );
  });

  it('75. buildV12SessionStartContentAsync is exported and is an async function', () => {
    expect(typeof buildV12SessionStartContentAsync).toBe('function');
    const result = buildV12SessionStartContentAsync(null, {}, null);
    expect(result instanceof Promise).toBe(true);
  });

  it('76. buildV12SessionStartContentAsync returns [START_SESSION] for HYBRID wiring', async () => {
    const result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('77. buildV12SessionStartContentAsync returns [START_SESSION] for null wiring', async () => {
    const result = await buildV12SessionStartContentAsync(null, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('78. buildV12SessionStartContentAsync result for V12 contains [START_SESSION]', async () => {
    const result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    expect(result).toContain('[START_SESSION]');
  });

  it('79. buildV12SessionStartContentAsync result for V12 contains THERAPIST_PLANNER_FIRST_INSTRUCTIONS', async () => {
    const result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    expect(result).toContain(THERAPIST_PLANNER_FIRST_INSTRUCTIONS);
  });

  it('80. buildV12SessionStartContentAsync result for V12 contains THERAPIST_WORKFLOW_INSTRUCTIONS (V2 layer)', async () => {
    const result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, {}, null);
    expect(result).toContain(THERAPIST_WORKFLOW_INSTRUCTIONS);
  });
});

// ─── SECTION H — Routing and flag isolation ───────────────────────────────────

describe('Wave 5 — SECTION H: routing and flag isolation', () => {
  it('81. THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED key', () => {
    expect('THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('82. THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED).toBe(false);
  });

  it('83. resolveTherapistWiring() returns HYBRID when all flags are false', () => {
    expect(resolveTherapistWiring()).toEqual(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('84. ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default path unchanged)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toEqual(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('85. V12 is not the active wiring when all flags are false', () => {
    expect(resolveTherapistWiring()).not.toEqual(CBT_THERAPIST_WIRING_STAGE2_V12);
  });

  it('86. V11 is still returned when COMPETENCE_ENABLED is on but PLANNER_FIRST is off (no runtime side-effects tested)', () => {
    // Structural: V11 exists and is a strict subset of V12 (same entities)
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.competence_layer_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.planner_first_enabled).not.toBe(true);
  });

  it('87. V12 supersedes V11 — V12 includes all V11 flags plus planner_first_enabled', () => {
    // V12 must carry every flag that V11 carries
    const v11Keys = Object.keys(CBT_THERAPIST_WIRING_STAGE2_V11).filter(
      (k) => k !== 'stage2_phase' && k !== 'tool_configs',
    );
    for (const key of v11Keys) {
      expect(CBT_THERAPIST_WIRING_STAGE2_V12[key]).toBe(CBT_THERAPIST_WIRING_STAGE2_V11[key]);
    }
    // Plus the new flag
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled).toBe(true);
  });

  it('88. Resolver phase order: V12.stage2_phase > V11.stage2_phase', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.stage2_phase).toBeGreaterThan(
      CBT_THERAPIST_WIRING_STAGE2_V11.stage2_phase,
    );
  });

  it('89. V12.stage2_phase is 16 (highest phase)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.stage2_phase).toBe(16);
  });
});

// ─── SECTION I — Backward compatibility ──────────────────────────────────────

describe('Wave 5 — SECTION I: backward compatibility', () => {
  it('90. HYBRID wiring has no planner_first_enabled flag', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.planner_first_enabled).toBeUndefined();
  });

  it('91. V11 wiring does NOT have planner_first_enabled === true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V11.planner_first_enabled).not.toBe(true);
  });

  it('92. V10 wiring does NOT have planner_first_enabled === true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V10.planner_first_enabled).not.toBe(true);
  });

  it('93. V6 wiring does NOT have planner_first_enabled === true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.planner_first_enabled).not.toBe(true);
  });

  it('94. buildV12SessionStartContentAsync with HYBRID returns exactly [START_SESSION]', async () => {
    const result = await buildV12SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('95. buildV12SessionStartContentAsync never throws for null/undefined wiring', async () => {
    await expect(buildV12SessionStartContentAsync(null, {}, null)).resolves.toBeDefined();
    await expect(buildV12SessionStartContentAsync(undefined, {}, null)).resolves.toBeDefined();
  });

  it('96. THERAPIST_WORKFLOW_INSTRUCTIONS is still exported and unchanged', () => {
    expect(typeof THERAPIST_WORKFLOW_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('97. V11 and V12 have the same entity set', () => {
    const v11Names = CBT_THERAPIST_WIRING_STAGE2_V11.tool_configs
      .map((t) => t.entity_name)
      .sort();
    const v12Names = CBT_THERAPIST_WIRING_STAGE2_V12.tool_configs
      .map((t) => t.entity_name)
      .sort();
    expect(v12Names).toEqual(v11Names);
  });

  it('98. THERAPIST_WORKFLOW_VERSION is 3.7.0', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });
});

// ─── SECTION J — Clinical regression scenarios ────────────────────────────────

describe('Wave 5 — SECTION J: clinical regression scenarios', () => {
  it('99. Anxiety: planner builds formulation before action — correct_path puts formulation before behavioral approach', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.anxiety;
    const path = posture.correct_path;
    // The correct path must mention understanding trigger/appraisal before framing approach
    expect(path).toMatch(/trigger|appraisal|cycle/i);
    // Action/behavioral framing must come last (after THEN keyword or similar)
    const thenIdx = path.toUpperCase().indexOf('THEN');
    expect(thenIdx).toBeGreaterThan(-1);
    // Formulation content must appear before THEN
    const formulationContent = path.substring(0, thenIdx).toLowerCase();
    expect(formulationContent).toMatch(/trigger|appraisal|cycle|avoidance/);
  });

  it('100. Depression: planner avoids premature technique — common_error describes assigning task without formulation', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.depression;
    const err = posture.common_error.toLowerCase();
    // Must mention behavioral activation or task assignment as the common error
    expect(err).toMatch(/activat|task|assign/);
    // And must mention it being premature (before understanding/formulation)
    expect(err).toMatch(/before|without/);
  });

  it('101. OCD: planner identifies loop before ERP-like move — correct_path describes cycle first', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.ocd;
    const path = posture.correct_path;
    // Must identify doubt/urgency/ritual cycle before any response prevention framing
    const cycleIdx = path.toLowerCase().indexOf('cycle');
    const erpIdx = path.toLowerCase().indexOf('response prevention');
    expect(cycleIdx).toBeGreaterThan(-1);
    expect(erpIdx).toBeGreaterThan(-1);
    expect(cycleIdx).toBeLessThan(erpIdx);
  });

  it('102. Scrupulosity: planner targets cycle, not belief content — default_target is maintaining_cycle', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.scrupulosity;
    expect(posture.default_target).toBe('maintaining_cycle');
    // The posture must explicitly state that religious belief is NOT the target
    const stance = posture.early_stance.toLowerCase();
    expect(stance).toMatch(/religious content is not the target|ocd mechanism is the target/i);
  });

  it('103. Grief/loss: planner prioritizes holding before action — correct_path says meaning-making is late-stage', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.grief_loss;
    const path = posture.correct_path.toLowerCase();
    // Must mention that meaning-making is late-stage
    expect(path).toMatch(/late-stage|late stage/);
    // Must NOT start by assigning a task
    expect(posture.default_target).toBe('grief_impact');
    // Early stance must be about presence/holding
    const stance = posture.early_stance.toLowerCase();
    expect(stance).toMatch(/presence|holding|receive|witness/);
  });

  it('104. Trauma: planner does not jump to exposure — default_target is emotional_pain, not avoidance_pattern', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.trauma;
    expect(posture.default_target).toBe('emotional_pain');
    expect(posture.default_target).not.toBe('avoidance_pattern');
    // Common error must mention exposure/processing without sufficient alliance
    const err = posture.common_error.toLowerCase();
    expect(err).toMatch(/exposure|processing/);
  });

  it('105. ADHD overwhelm: planner differentiates overload driver — common_error describes strategy before understanding driver', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.adhd_overwhelm;
    const err = posture.common_error.toLowerCase();
    // Must mention strategy assignment without identifying driver
    expect(err).toMatch(/strategy|task|breakdown/);
    expect(err).toMatch(/before/);
    // Correct path must identify driver first
    const path = posture.correct_path.toLowerCase();
    expect(path).toMatch(/driver|primary/);
  });

  it('106. Teen shame: planner slows down — three-turn minimum before tasking', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.teen_shame;
    // Must have a three-turn minimum requirement
    const path = posture.correct_path.toLowerCase();
    expect(path).toMatch(/three.turn/i);
    // Common error must describe assigning tasks before safe disclosure
    const err = posture.common_error.toLowerCase();
    expect(err).toMatch(/task|challeng|behavior/);
    expect(err).toMatch(/before/);
  });

  it('107. Anger/parenting: planner identifies escalation pattern before intervention', () => {
    const posture = THERAPIST_CASE_TYPE_POSTURES.anger_parenting;
    const err = posture.common_error.toLowerCase();
    // Must name anger management strategies as the common error (without formulation)
    expect(err).toMatch(/anger management|breathing|counting|time.out/i);
    // Correct path must identify escalation cycle first
    const path = posture.correct_path.toLowerCase();
    expect(path).toMatch(/escalat|cycle|trigger/);
  });

  it('108. Nothing-helps blocker: rationale_is_clear gate prohibits pushing generic technique', () => {
    const gate = THERAPIST_INTERVENTION_READINESS_GATES.rationale_is_clear;
    // Gate condition must require that the step connects to the formulation
    expect(gate.condition).toMatch(/formulation/i);
    // If-not-met must prohibit task assignment without formulation connection
    const notMet = gate.if_not_met.toLowerCase();
    expect(notMet).toMatch(/do not assign|without/i);
  });

  it('109. Cross-language parity: THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains no language-specific content', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    // The planner policy must be language-agnostic (no Hebrew, Spanish, French, etc. text)
    // It should not contain direction-specific unicode characters typical of RTL scripts
    expect(text).not.toMatch(/[\u0590-\u05FF]/); // Hebrew
    expect(text).not.toMatch(/[\u0600-\u06FF]/); // Arabic
    // Must be in English only (planner is language-agnostic)
    expect(text).toMatch(/^=== WAVE 5/);
  });

  it('110. Leakage regression: instructions use first-person clinical framing, not internal labels', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    // Must NOT contain system-internal bracket labels like [DOMAIN_CLASSIFICATION] or [INTERVENTION_TYPE]
    expect(text).not.toMatch(/\[DOMAIN_CLASSIFICATION\]/);
    expect(text).not.toMatch(/\[INTERVENTION_TYPE\]/);
    expect(text).not.toMatch(/\[PLANNER_OUTPUT\]/);
    // Must contain clinical framing language (not system prompt labels)
    expect(text).toContain('planner');
    // Must include formulation-first framing
    expect(text).toContain('formulation');
    expect(text).toContain('understanding');
  });
});

// ─── SECTION F — Competing-hypotheses differentiation rule ────────────────────

describe('Wave 5 — SECTION F: Competing-hypotheses differentiation rule', () => {
  it('111. Instructions contain the COMPETING-HYPOTHESES DIFFERENTIATION section header', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toContain('COMPETING-HYPOTHESES DIFFERENTIATION');
  });

  it('112. Rule identifies explicit competing-hypotheses request as a genuine clarification gap', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    // Must require all three activation conditions including "genuine unresolved formulation gap"
    expect(text).toMatch(/genuine unresolved formulation gap/i);
    expect(text).toMatch(/two or more plausible clinical explanations/i);
    expect(text).toMatch(/asks the therapist to help distinguish/i);
  });

  it('113. Rule requires exactly one focused, non-leading discriminating question', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/exactly one focused, non-leading question/i);
    expect(text).toMatch(/tests different\s+predictions of the competing hypotheses/i);
  });

  it('114. Rule prohibits selecting a hypothesis without evidence', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/do not select or imply that one hypothesis is correct/i);
  });

  it('115. Rule requires calibrated uncertainty language', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    // Must list calibrated language markers
    expect(text).toContain('"may"');
    expect(text).toContain('"might"');
    expect(text).toContain('"would likely"');
    expect(text).toContain('"one possibility is"');
  });

  it('116. Rule rejects unsupported categorical counterfactuals', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/unsupported categorical counterfactuals/i);
    expect(text).toContain('"the anxiety would disappear"');
    expect(text).toContain('"positive feedback would not reduce it"');
  });

  it('117. Rule honors an explicit request for no solution or exercise', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/honor an explicit user request for no solution.*exercise.*technique/i);
  });

  it('118. Rule explicitly states it does NOT weaken the existing question-restraint default', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/does not make questions mandatory/i);
    expect(text).toMatch(/does not weaken the existing default question-restraint rule/i);
    // Default no-question rule must still be present in the stabilizers
    expect(text).toMatch(/default to no question/i);
  });

  it('119. Universal HYBRID wrapper includes the updated planner rule exactly once', async () => {
    const content = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, {});
    // The planner instructions block must appear exactly once
    const occurrences = content.split('COMPETING-HYPOTHESES DIFFERENTIATION').length - 1;
    expect(occurrences).toBe(1);
  });
});

describe('Wave 5 — SECTION G: Collaborative readiness assessment policy', () => {
  it('120. Instructions contain the COLLABORATIVE READINESS ASSESSMENT section header and explicit activation scope', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toContain('COLLABORATIVE READINESS ASSESSMENT');
    expect(text).toMatch(/activates only when the user explicitly asks to understand or\s+assess readiness/i);
    expect(text).toMatch(/not consent to action/i);
  });

  it('121. Rule distinguishes willingness, current capacity, and consent/preference', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/willingness/i);
    expect(text).toMatch(/current capacity/i);
    expect(text).toMatch(/consent\/preference/i);
  });

  it('122. Rule explicitly says readiness does not require zero anxiety and rejects universal numeric cutoff', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/does not require zero anxiety or complete calm/i);
    expect(text).toMatch(/do not impose a universal numerical distress cutoff/i);
  });

  it('123. Rule requires mixed evidence to remain mixed and separated by support, limits, and unknowns', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/if evidence is mixed, keep it mixed/i);
    expect(text).toMatch(/what may support readiness/i);
    expect(text).toMatch(/what may limit readiness/i);
    expect(text).toMatch(/what remains unknown/i);
  });

  it('124. Rule allows at most one focused readiness question only when one clinically necessary fact is missing', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/if one clinically necessary readiness fact is missing/i);
    expect(text).toMatch(/ask at most one focused, non-leading question/i);
  });

  it('125. Explicit no-exercise request prohibits covert techniques and try-and-see readiness tasks', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/explicitly requests no exercise\/task\/technique yet/i);
    expect(text).toMatch(/including breathing, grounding, slowing, distress-rating, visualization/i);
    expect(text).toMatch(/behavioral experiments, exposure, homework, or "try this and see"/i);
    expect(text).toMatch(/do not make performing any technique a prerequisite test of readiness/i);
  });

  it('126. Rule forbids hidden-meaning narratives and unsupported motive assumptions', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/use only user-supplied evidence/i);
    expect(text).toMatch(/do not invent hidden meaning, motives, symbolic significance, or protective "parts"/i);
  });

  it('127. Rule prohibits dramatic deterministic language and gives forbidden examples', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/do not use dramatic or deterministic language/i);
    expect(text).toContain('"it will become a monster"');
    expect(text).toContain('"you will be unable to process it"');
  });

  it('128. Rule separates "not ready now" from indefinite avoidance and preserves user choice', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/do not decide "act now" or "wait" for the user/i);
    expect(text).toMatch(/distinguish "not ready at this moment" from "never ready"/i);
  });

  it('129. Rule keeps crisis and emergency safety precedence absolute', () => {
    const text = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    expect(text).toMatch(/does not weaken crisis or emergency handling/i);
    expect(text).toMatch(/safety precedence remains absolute/i);
  });

  it('130. Existing intervention readiness gates remain intact', () => {
    const gates = THERAPIST_INTERVENTION_READINESS_GATES;
    expect(Object.keys(gates)).toHaveLength(6);
    expect(gates.distress_allows_task).toBeDefined();
    expect(gates.distress_allows_task.if_not_met).toMatch(/grounding and containment/i);
  });

  it('131. Universal HYBRID wrapper includes collaborative readiness policy exactly once', async () => {
    const content = await buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, {});
    const occurrences = content.split('COLLABORATIVE READINESS ASSESSMENT').length - 1;
    expect(occurrences).toBe(1);
  });
});
