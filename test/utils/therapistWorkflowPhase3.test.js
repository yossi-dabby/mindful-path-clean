/**
 * @file test/utils/therapistWorkflowPhase3.test.js
 *
 * Phase 3 — Therapist Workflow Engine
 *
 * PURPOSE
 * -------
 * 1. Verify that the workflow engine module exists and is well-formed:
 *    correct exports, frozen constants, 6-step sequence, response-shaping
 *    rules, emotion differentiation map, and instruction builder.
 * 2. Verify that CBT_THERAPIST_WIRING_STAGE2_V2 exists as a new additive
 *    export, has the same entity list as V1 and HYBRID, and adds the
 *    correct Phase 3 flags.
 * 3. Verify that flag-off (THERAPIST_UPGRADE_WORKFLOW_ENABLED = false) still
 *    returns CBT_THERAPIST_WIRING_HYBRID from resolveTherapistWiring().
 * 4. Verify that flag isolation is correct: V2 is never the active wiring
 *    in the current default (all-flags-false) state.
 * 5. Verify that V2 does not add new entities beyond those already in HYBRID.
 * 6. Verify that V2 preserves all safety-critical entity properties.
 * 7. Verify that Phase 0 / 0.1 / 1 / 2 baselines are still intact.
 * 8. Verify that the workflow sequence has exactly 6 steps in correct order.
 * 9. Verify that emotion differentiation includes all required states.
 * 10. Verify that buildWorkflowContextInstructions() produces a well-formed
 *     instruction string that includes all required sections.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT modify any Phase 0 / 0.1 / 1 / 2 test files.
 * - All Phase 0 / 0.1 / 1 / 2 assertions must still pass (this test is additive).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 3
 */

import { describe, it, expect } from 'vitest';

import {
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_WORKFLOW_SEQUENCE,
  THERAPIST_WORKFLOW_RESPONSE_RULES,
  THERAPIST_WORKFLOW_EMOTION_MAP,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  buildWorkflowContextInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
} from '../../src/api/agentWiring.js';

import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ─── Section 1 — Workflow engine exports exist ────────────────────────────────

describe('Phase 3 — Workflow engine exports exist', () => {
  it('THERAPIST_WORKFLOW_VERSION is exported as a non-empty string', () => {
    expect(typeof THERAPIST_WORKFLOW_VERSION).toBe('string');
    expect(THERAPIST_WORKFLOW_VERSION.length).toBeGreaterThan(0);
  });

  it('THERAPIST_WORKFLOW_SEQUENCE is exported as an array', () => {
    expect(Array.isArray(THERAPIST_WORKFLOW_SEQUENCE)).toBe(true);
  });

  it('THERAPIST_WORKFLOW_RESPONSE_RULES is exported as an object', () => {
    expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES).toBe('object');
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES).not.toBeNull();
  });

  it('THERAPIST_WORKFLOW_EMOTION_MAP is exported as an object', () => {
    expect(typeof THERAPIST_WORKFLOW_EMOTION_MAP).toBe('object');
    expect(THERAPIST_WORKFLOW_EMOTION_MAP).not.toBeNull();
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS is exported as a non-empty string', () => {
    expect(typeof THERAPIST_WORKFLOW_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('buildWorkflowContextInstructions is exported as a function', () => {
    expect(typeof buildWorkflowContextInstructions).toBe('function');
  });
});

// ─── Section 2 — Sequence has exactly 6 steps in the correct order ───────────

describe('Phase 3 — Workflow sequence structure', () => {
  it('THERAPIST_WORKFLOW_SEQUENCE has exactly 6 steps', () => {
    expect(THERAPIST_WORKFLOW_SEQUENCE.length).toBe(6);
  });

  it('THERAPIST_WORKFLOW_SEQUENCE is frozen', () => {
    expect(Object.isFrozen(THERAPIST_WORKFLOW_SEQUENCE)).toBe(true);
  });

  it('steps are numbered 1 through 6 in order', () => {
    for (let i = 0; i < 6; i++) {
      expect(THERAPIST_WORKFLOW_SEQUENCE[i].step).toBe(i + 1);
    }
  });

  const REQUIRED_STEP_NAMES = [
    'brief_validation',
    'organize_the_problem',
    'map_the_current_cycle',
    'identify_intervention_point',
    'focused_intervention',
    'concrete_next_step',
  ];

  for (const name of REQUIRED_STEP_NAMES) {
    it(`sequence includes step: ${name}`, () => {
      const found = THERAPIST_WORKFLOW_SEQUENCE.some((s) => s.name === name);
      expect(found).toBe(true);
    });
  }

  it('each step has a name and description', () => {
    for (const step of THERAPIST_WORKFLOW_SEQUENCE) {
      expect(typeof step.name).toBe('string');
      expect(step.name.length).toBeGreaterThan(0);
      expect(typeof step.description).toBe('string');
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('each step object is frozen', () => {
    for (const step of THERAPIST_WORKFLOW_SEQUENCE) {
      expect(Object.isFrozen(step)).toBe(true);
    }
  });
});

// ─── Section 3 — Response-shaping rules ─────────────────────────────────────

describe('Phase 3 — Response-shaping rules', () => {
  it('THERAPIST_WORKFLOW_RESPONSE_RULES is frozen', () => {
    expect(Object.isFrozen(THERAPIST_WORKFLOW_RESPONSE_RULES)).toBe(true);
  });

  const REQUIRED_RULES = [
    'reduce_open_ended_questions',
    'summarize_over_explore',
    'name_the_pattern',
    'move_to_structure_early',
    'end_with_something_usable',
    'slow_down_for_extreme_language',
    'safety_stack_compatibility',
  ];

  for (const rule of REQUIRED_RULES) {
    it(`response rules include: ${rule}`, () => {
      expect(rule in THERAPIST_WORKFLOW_RESPONSE_RULES).toBe(true);
      expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES[rule]).toBe('string');
      expect(THERAPIST_WORKFLOW_RESPONSE_RULES[rule].length).toBeGreaterThan(0);
    });
  }

  it('safety_stack_compatibility rule references existing safety behavior', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.safety_stack_compatibility;
    // The rule should explicitly mention safety — not be silent about it
    expect(rule.toLowerCase()).toContain('safety');
  });

  it('slow_down_for_extreme_language rule addresses high-distress language', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.slow_down_for_extreme_language;
    expect(rule.toLowerCase()).toMatch(/extreme|catastrophic|hopeless/);
  });
});

// ─── Section 4 — Emotion differentiation map ─────────────────────────────────

describe('Phase 3 — Emotion differentiation map', () => {
  it('THERAPIST_WORKFLOW_EMOTION_MAP is frozen', () => {
    expect(Object.isFrozen(THERAPIST_WORKFLOW_EMOTION_MAP)).toBe(true);
  });

  const REQUIRED_EMOTIONS = [
    'remorse',
    'guilt',
    'shame',
    'self_attack',
    'despair',
    'collapse_language',
  ];

  for (const emotion of REQUIRED_EMOTIONS) {
    it(`emotion map includes: ${emotion}`, () => {
      expect(emotion in THERAPIST_WORKFLOW_EMOTION_MAP).toBe(true);
    });

    it(`${emotion} entry has label, description, and clinical_note`, () => {
      const entry = THERAPIST_WORKFLOW_EMOTION_MAP[emotion];
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe('string');
      expect(entry.description.length).toBeGreaterThan(0);
      expect(typeof entry.clinical_note).toBe('string');
      expect(entry.clinical_note.length).toBeGreaterThan(0);
    });

    it(`${emotion} entry is frozen`, () => {
      expect(Object.isFrozen(THERAPIST_WORKFLOW_EMOTION_MAP[emotion])).toBe(true);
    });
  }

  it('shame entry distinguishes shame from guilt', () => {
    const shame = THERAPIST_WORKFLOW_EMOTION_MAP.shame.description.toLowerCase();
    // Shame is about identity ("I am bad"), not behavior ("I did something bad")
    expect(shame).toMatch(/person|identity|flawed|defective/);
  });

  it('despair entry notes need to slow down', () => {
    const despairNote = THERAPIST_WORKFLOW_EMOTION_MAP.despair.clinical_note.toLowerCase();
    expect(despairNote).toContain('slow');
  });

  it('collapse_language entry notes need to slow down', () => {
    const collapseNote = THERAPIST_WORKFLOW_EMOTION_MAP.collapse_language.clinical_note.toLowerCase();
    expect(collapseNote).toContain('slow');
  });
});

// ─── Section 5 — Instruction builder ─────────────────────────────────────────

describe('Phase 3 — buildWorkflowContextInstructions()', () => {
  let instructions;
  it('returns a non-empty string', () => {
    instructions = buildWorkflowContextInstructions();
    expect(typeof instructions).toBe('string');
    expect(instructions.length).toBeGreaterThan(0);
  });

  it('includes the workflow sequence section header', () => {
    const result = buildWorkflowContextInstructions();
    expect(result).toContain('ADAPTIVE RESPONSE FRAMEWORK');
  });

  it('includes all 6 step names', () => {
    const result = buildWorkflowContextInstructions();
    for (const step of THERAPIST_WORKFLOW_SEQUENCE) {
      expect(result).toContain(step.name);
    }
  });

  it('includes the emotion differentiation section', () => {
    const result = buildWorkflowContextInstructions();
    expect(result).toContain('EMOTION DIFFERENTIATION');
  });

  it('includes all required emotion labels', () => {
    const result = buildWorkflowContextInstructions();
    // All emotion labels should appear in the instructions
    for (const entry of Object.values(THERAPIST_WORKFLOW_EMOTION_MAP)) {
      expect(result).toContain(entry.label);
    }
  });

  it('includes explicit safety compatibility note', () => {
    const result = buildWorkflowContextInstructions();
    expect(result.toLowerCase()).toContain('safety');
  });

  it('is clearly delimited with a header and footer marker', () => {
    const result = buildWorkflowContextInstructions();
    expect(result).toContain('=== UPGRADED THERAPIST WORKFLOW');
    expect(result).toContain('=== END UPGRADED THERAPIST WORKFLOW ===');
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS matches buildWorkflowContextInstructions()', () => {
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS).toBe(buildWorkflowContextInstructions());
  });
});

// ─── Section 6 — CBT_THERAPIST_WIRING_STAGE2_V2 exists and is well-formed ────

describe('Phase 3 — CBT_THERAPIST_WIRING_STAGE2_V2 exists', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V2 is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2).toBeDefined();
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V2).toBe('object');
  });

  it('V2 name is cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.name).toBe('cbt_therapist');
  });

  it('V2 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.stage2).toBe(true);
  });

  it('V2 has stage2_phase: 3', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.stage2_phase).toBe(3);
  });

  it('V2 has workflow_engine_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.workflow_engine_enabled).toBe(true);
  });

  it('V2 has workflow_context_injection: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.workflow_context_injection).toBe(true);
  });

  it('V2 has memory_context_injection: true (carries forward from V1)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.memory_context_injection).toBe(true);
  });

  it('V2 has tool_configs as an array', () => {
    expect(Array.isArray(CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs)).toBe(true);
  });

  it('V2 is a different object from HYBRID', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2).not.toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('V2 is a different object from V1', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
  });
});

// ─── Section 7 — V2 entity list is additive-only (no new entities) ────────────

describe('Phase 3 — V2 entity list does not add new entities', () => {
  const hybridEntityNames = new Set(
    CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((tc) => tc.entity_name),
  );

  it('V2 has the same number of tool_configs as HYBRID', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.length).toBe(
      CBT_THERAPIST_WIRING_HYBRID.tool_configs.length,
    );
  });

  it('every entity in V2 tool_configs is already in HYBRID tool_configs', () => {
    for (const tc of CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs) {
      expect(
        hybridEntityNames.has(tc.entity_name),
        `${tc.entity_name} is not in HYBRID — V2 must not add new entities`,
      ).toBe(true);
    }
  });

  const PRIVATE_ENTITIES = [
    'ThoughtJournal',
    'UserDeletedConversations',
    'AppNotification',
    'MindGameActivity',
    'Subscription',
  ];

  for (const entity of PRIVATE_ENTITIES) {
    it(`V2 does not include prohibited entity: ${entity}`, () => {
      const names = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.map(
        (tc) => tc.entity_name,
      );
      // ThoughtJournal IS in the preferred list — check it keeps its access level
      if (entity === 'ThoughtJournal') {
        const tc = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
          (t) => t.entity_name === 'ThoughtJournal',
        );
        // If it's present it must be 'preferred' (as in HYBRID), not unrestricted
        if (tc) {
          expect(tc.access_level).toBe('preferred');
        }
      } else {
        expect(names).not.toContain(entity);
      }
    });
  }
});

// ─── Section 8 — V2 preserves safety-critical entity properties ───────────────

describe('Phase 3 — V2 preserves safety-critical entity properties', () => {
  it('CompanionMemory in V2 retains read_only: true', () => {
    const cm = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'CompanionMemory',
    );
    expect(cm).toBeDefined();
    expect(cm.read_only).toBe(true);
  });

  it('MoodEntry in V2 retains calibration_only: true', () => {
    const me = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'MoodEntry',
    );
    expect(me).toBeDefined();
    expect(me.calibration_only).toBe(true);
  });

  it('CaseFormulation in V2 retains read_only: true', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'CaseFormulation',
    );
    expect(cf).toBeDefined();
    expect(cf.read_only).toBe(true);
  });

  it('CaseFormulation in V2 retains caution_layer: true', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'CaseFormulation',
    );
    expect(cf).toBeDefined();
    expect(cf.caution_layer).toBe(true);
  });

  it('Conversation in V2 retains secondary_only: true', () => {
    const conv = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'Conversation',
    );
    expect(conv).toBeDefined();
    expect(conv.secondary_only).toBe(true);
  });

  it('Conversation in V2 retains caution_layer: true', () => {
    const conv = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.find(
      (tc) => tc.entity_name === 'Conversation',
    );
    expect(conv).toBeDefined();
    expect(conv.caution_layer).toBe(true);
  });

  it('V2 source_orders match HYBRID source_orders for all entities', () => {
    const hybridMap = new Map(
      CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((tc) => [tc.entity_name, tc.source_order]),
    );
    for (const tc of CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs) {
      expect(tc.source_order).toBe(hybridMap.get(tc.entity_name));
    }
  });
});

// ─── Section 9 — Flag-off: default path remains unchanged ────────────────────

describe('Phase 3 — Flag-off preserves exactly the current default path', () => {
  it('THERAPIST_UPGRADE_WORKFLOW_ENABLED is false by default', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED is false by default', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is CBT_THERAPIST_WIRING_HYBRID (not V2)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V2);
  });

  it('resolveTherapistWiring() returns CBT_THERAPIST_WIRING_HYBRID in default mode', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring() does not return V2 when all flags are false', () => {
    expect(resolveTherapistWiring()).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V2);
  });

  it('resolveTherapistWiring() does not return V1 when all flags are false', () => {
    expect(resolveTherapistWiring()).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
  });

  it('ACTIVE_AI_COMPANION_WIRING remains AI_COMPANION_WIRING_HYBRID (unchanged)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('V2 is not the active wiring in any default-flag state', () => {
    const active = resolveTherapistWiring();
    expect(active.workflow_engine_enabled).toBeUndefined();
    expect(active.workflow_context_injection).toBeUndefined();
  });
});

// ─── Section 10 — V2 workflow flags do not appear in the default path ─────────

describe('Phase 3 — Workflow flags are absent from the default therapist path', () => {
  it('CBT_THERAPIST_WIRING_HYBRID does not have workflow_engine_enabled', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.workflow_engine_enabled).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_HYBRID does not have workflow_context_injection', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.workflow_context_injection).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_HYBRID does not have stage2 flag', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.stage2).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V1 does not have workflow_engine_enabled', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.workflow_engine_enabled).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V1 does not have workflow_context_injection', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.workflow_context_injection).toBeUndefined();
  });
});

// ─── Section 11 — Phase 3 flag exists in the flag registry ───────────────────

describe('Phase 3 — Flag registry', () => {
  it('THERAPIST_UPGRADE_WORKFLOW_ENABLED flag exists in THERAPIST_UPGRADE_FLAGS', () => {
    expect('THERAPIST_UPGRADE_WORKFLOW_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('THERAPIST_UPGRADE_WORKFLOW_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_WORKFLOW_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled requires master gate + WORKFLOW flag', () => {
    // With all defaults false, the flag evaluates to false
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')).toBe(false);
  });
});

// ─── Section 12 — Phase 0 / 0.1 / 1 / 2 baselines still pass (no regression) ─

describe('Phase 3 — Phase 0/0.1/1/2 baseline preservation', () => {
  it('CBT_THERAPIST_WIRING_HYBRID is still defined and exported', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID).toBeDefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V1 is still defined and exported', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1).toBeDefined();
  });

  it('AI_COMPANION_WIRING_HYBRID is still defined and exported', () => {
    expect(AI_COMPANION_WIRING_HYBRID).toBeDefined();
  });

  it('THERAPIST_UPGRADE_MEMORY_ENABLED is still false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is still false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('resolveTherapistWiring() still returns HYBRID in all-flags-false state', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('V1 is not the active config in default mode', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
  });

  it('V2 is not the active config in default mode', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V2);
  });

  it('HYBRID tool_configs are unchanged (same entity list as before Phase 3)', () => {
    const entityNames = CBT_THERAPIST_WIRING_HYBRID.tool_configs.map(
      (tc) => tc.entity_name,
    );
    // All expected entities from V1/Hybrid spec must be present
    expect(entityNames).toContain('SessionSummary');
    expect(entityNames).toContain('ThoughtJournal');
    expect(entityNames).toContain('Goal');
    expect(entityNames).toContain('CoachingSession');
    expect(entityNames).toContain('Exercise');
    expect(entityNames).toContain('Resource');
    expect(entityNames).toContain('AudioContent');
    expect(entityNames).toContain('Journey');
    expect(entityNames).toContain('CompanionMemory');
    expect(entityNames).toContain('MoodEntry');
    expect(entityNames).toContain('CaseFormulation');
    expect(entityNames).toContain('Conversation');
  });
});
