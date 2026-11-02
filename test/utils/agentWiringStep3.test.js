/**
 * Tests for the Step 3 additive-only agent wiring defined in
 * src/api/agentWiring.js.
 *
 * Verifies that both Step 3 wiring configs:
 *   1. Preserve all Step 1 preferred entities unchanged.
 *   2. Preserve all Step 2 allowed entities unchanged.
 *   3. Add the approved non-caution restricted entities with access_level 'restricted'.
 *   4. Place restricted entities at source_order values above all preferred and allowed entities.
 *   5. Apply the required hard guardrail flags (read_only, calibration_only, reference_only,
 *      continuity_check_only) per enforcement spec §D.
 *   6. Pass the full policy validator (mirrors validateAgentPolicy.ts logic).
 *   7. Do not include caution-layer entities (CaseFormulation, Conversation).
 *   8. Do not include any prohibited entities.
 *   9. Do not alter the Step 1 or Step 2 exports.
 */

import { describe, it, expect } from 'vitest';
import {
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
  CBT_THERAPIST_WIRING_STEP_2,
  AI_COMPANION_WIRING_STEP_2,
  CBT_THERAPIST_WIRING_STEP_3,
  AI_COMPANION_WIRING_STEP_3,
} from '../../src/api/agentWiring.js';

// ─── Inline policy validator (mirrors functions/validateAgentPolicy.ts) ────────
// The Deno function file is excluded from vitest; the logic is reproduced here
// so wiring configs stay covered by the project test suite.

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];
const CBT_RESTRICTED = ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation'];
const COMPANION_PROHIBITED = ['ThoughtJournal', 'CoachingSession', 'CaseFormulation'];
const COMPANION_RESTRICTED = ['Goal', 'SessionSummary', 'Conversation'];

function agentKey(name) {
  const n = name.toLowerCase().replace(/[\s-]+/g, '_');
  if (n === 'cbt_therapist') return 'cbt_therapist';
  if (n === 'ai_companion') return 'ai_companion';
  return null;
}

function sourceOrder(toolConfigs, entityName) {
  const tc = toolConfigs.find((t) => t.entity_name === entityName);
  return tc?.source_order ?? Infinity;
}

function validateAgentPolicy(agentConfig) {
  const agentName = agentConfig?.name || 'unknown';
  const toolConfigs = agentConfig?.tool_configs || [];
  const violations = [];
  const key = agentKey(agentName);

  for (const tc of toolConfigs) {
    if (SYSTEM_PROHIBITED.includes(tc.entity_name)) {
      violations.push(
        `Agent "${agentName}" includes system-prohibited entity "${tc.entity_name}" ` +
          `(must be absent from all tool access lists per enforcement spec §E).`
      );
    }
  }

  if (key === 'cbt_therapist') {
    for (const tc of toolConfigs) {
      if (CBT_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(
          `CBT Therapist: "${tc.entity_name}" is a restricted entity and must not be ` +
            `marked "preferred" (enforcement spec §F — CBT Therapist).`
        );
      }
    }
    const convOrder = sourceOrder(toolConfigs, 'Conversation');
    const summaryOrder = sourceOrder(toolConfigs, 'SessionSummary');
    if (convOrder !== Infinity && convOrder < summaryOrder) {
      violations.push(
        `CBT Therapist: "Conversation" (source_order ${convOrder}) must not appear ` +
          `before "SessionSummary" (source_order ${summaryOrder}) — ` +
          `SessionSummary is the required default recall source (enforcement spec §F, §C).`
      );
    }
    const cf = toolConfigs.find((t) => t.entity_name === 'CaseFormulation');
    if (cf && cf.unrestricted === true) {
      violations.push(
        `CBT Therapist: "CaseFormulation" must not be configured as unrestricted. ` +
          `It is a restricted entity requiring read-only, clinical-review-gated access ` +
          `(enforcement spec §F, §D).`
      );
    }
  }

  if (key === 'ai_companion') {
    for (const tc of toolConfigs) {
      if (COMPANION_PROHIBITED.includes(tc.entity_name)) {
        violations.push(
          `AI Companion: "${tc.entity_name}" is prohibited for this agent and must not ` +
            `appear in tool_configs (enforcement spec §E, §B).`
        );
      }
    }
    for (const tc of toolConfigs) {
      if (COMPANION_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(
          `AI Companion: "${tc.entity_name}" is a restricted entity and must not be ` +
            `marked "preferred" (enforcement spec §F — AI Companion).`
        );
      }
    }
    const convOrder = sourceOrder(toolConfigs, 'Conversation');
    const summaryOrder = sourceOrder(toolConfigs, 'SessionSummary');
    if (convOrder !== Infinity && convOrder < summaryOrder) {
      violations.push(
        `AI Companion: "Conversation" (source_order ${convOrder}) must not appear ` +
          `before "SessionSummary" (source_order ${summaryOrder}) — ` +
          `Conversation may only be loaded when SessionSummary is insufficient ` +
          `(enforcement spec §F, §C).`
      );
    }
    const cm = toolConfigs.find((t) => t.entity_name === 'CompanionMemory');
    if (cm && cm.use_for_clinical_reasoning === true) {
      violations.push(
        `AI Companion: "CompanionMemory" must not be used for clinical reasoning. ` +
          `It drives personalization and tone only (enforcement spec §F — AI Companion).`
      );
    }
  }

  if (key !== null && key !== 'cbt_therapist') {
    const cf = toolConfigs.find((t) => t.entity_name === 'CaseFormulation');
    if (cf && cf.unrestricted === true) {
      violations.push(
        `Agent "${agentName}": "CaseFormulation" must not be configured as unrestricted ` +
          `(enforcement spec §F — Both agents).`
      );
    }
  }

  return { valid: violations.length === 0, agent: agentName, violations };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entityNames(wiring) {
  return wiring.tool_configs.map((tc) => tc.entity_name);
}

function findEntity(wiring, name) {
  return wiring.tool_configs.find((tc) => tc.entity_name === name);
}

// ─── Entity groups ────────────────────────────────────────────────────────────

const SHARED_ENTITIES = ['Exercise', 'Resource', 'AudioContent', 'Journey'];

const CBT_STEP3_RESTRICTED = ['CompanionMemory', 'MoodEntry'];
const COMPANION_STEP3_RESTRICTED = ['Goal', 'SessionSummary'];

// ─── Guard: Step 1 and Step 2 exports are unchanged ──────────────────────────

describe('Step 1 exports are unmodified by Step 3 additions', () => {
  it('CBT Therapist Step 1 still contains exactly four entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1.tool_configs).toHaveLength(4);
  });

  it('AI Companion Step 1 still contains exactly two entities', () => {
    expect(AI_COMPANION_WIRING_STEP_1.tool_configs).toHaveLength(2);
  });

  it('CBT Therapist Step 1 still passes policy validation', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('AI Companion Step 1 still passes policy validation', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_STEP_1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe('Step 2 exports are unmodified by Step 3 additions', () => {
  it('CBT Therapist Step 2 still contains exactly eight entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2.tool_configs).toHaveLength(8);
  });

  it('AI Companion Step 2 still contains exactly six entities', () => {
    expect(AI_COMPANION_WIRING_STEP_2.tool_configs).toHaveLength(6);
  });

  it('CBT Therapist Step 2 still passes policy validation', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_2);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('AI Companion Step 2 still passes policy validation', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_STEP_2);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

// ─── CBT Therapist — Step 3 wiring ───────────────────────────────────────────

describe('CBT Therapist — Step 3 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_3);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to cbt_therapist', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_3).agent).toBe('cbt_therapist');
  });
});

describe('CBT Therapist — Step 3 wiring contains ten entities total', () => {
  it('contains exactly ten entities (four preferred + four allowed + two restricted)', () => {
    expect(CBT_THERAPIST_WIRING_STEP_3.tool_configs).toHaveLength(10);
  });
});

describe('CBT Therapist — Step 3 wiring preserves Step 1 preferred entities unchanged', () => {
  for (const [name, order] of [
    ['SessionSummary', 2],
    ['ThoughtJournal', 3],
    ['Goal', 4],
    ['CoachingSession', 5],
  ]) {
    it(`still includes "${name}" as preferred with source_order ${order}`, () => {
      const entity = findEntity(CBT_THERAPIST_WIRING_STEP_3, name);
      expect(entity).toBeDefined();
      expect(entity.access_level).toBe('preferred');
      expect(entity.source_order).toBe(order);
    });
  }
});

describe('CBT Therapist — Step 3 wiring preserves Step 2 allowed entities unchanged', () => {
  for (const [name, order] of [
    ['Exercise', 6],
    ['Resource', 7],
    ['AudioContent', 8],
    ['Journey', 9],
  ]) {
    it(`still includes "${name}" as allowed with source_order ${order}`, () => {
      const entity = findEntity(CBT_THERAPIST_WIRING_STEP_3, name);
      expect(entity).toBeDefined();
      expect(entity.access_level).toBe('allowed');
      expect(entity.source_order).toBe(order);
    });
  }
});

describe('CBT Therapist — Step 3 wiring restricted entity presence', () => {
  for (const name of CBT_STEP3_RESTRICTED) {
    it(`includes restricted entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).toContain(name);
    });
  }
});

describe('CBT Therapist — Step 3 wiring restricted entity access level', () => {
  for (const name of CBT_STEP3_RESTRICTED) {
    it(`"${name}" is marked restricted (not preferred or allowed)`, () => {
      expect(findEntity(CBT_THERAPIST_WIRING_STEP_3, name)?.access_level).toBe('restricted');
    });
  }
});

describe('CBT Therapist — Step 3 wiring restricted entity source order', () => {
  it('CompanionMemory has source_order 10', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_3, 'CompanionMemory')?.source_order).toBe(10);
  });

  it('MoodEntry has source_order 11', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_3, 'MoodEntry')?.source_order).toBe(11);
  });
});

describe('CBT Therapist — Step 3 restricted entities are lower priority than preferred entities', () => {
  const highestPreferredOrder = 5; // CoachingSession

  for (const name of CBT_STEP3_RESTRICTED) {
    it(`"${name}" source_order is higher than the highest preferred entity (${highestPreferredOrder})`, () => {
      const order = findEntity(CBT_THERAPIST_WIRING_STEP_3, name)?.source_order;
      expect(order).toBeGreaterThan(highestPreferredOrder);
    });
  }
});

describe('CBT Therapist — Step 3 restricted entities are lower priority than allowed entities', () => {
  const highestAllowedOrder = 9; // Journey

  for (const name of CBT_STEP3_RESTRICTED) {
    it(`"${name}" source_order is higher than the highest allowed entity (${highestAllowedOrder})`, () => {
      const order = findEntity(CBT_THERAPIST_WIRING_STEP_3, name)?.source_order;
      expect(order).toBeGreaterThan(highestAllowedOrder);
    });
  }
});

describe('CBT Therapist — Step 3 restricted entity order within the restricted layer', () => {
  it('CompanionMemory is loaded before MoodEntry (per enforcement spec §C)', () => {
    const cmOrder = findEntity(CBT_THERAPIST_WIRING_STEP_3, 'CompanionMemory')?.source_order;
    const meOrder = findEntity(CBT_THERAPIST_WIRING_STEP_3, 'MoodEntry')?.source_order;
    expect(cmOrder).toBeLessThan(meOrder);
  });
});

describe('CBT Therapist — Step 3 restricted entity guardrails', () => {
  it('CompanionMemory has read_only: true (must not write or overwrite entries per §D)', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_3, 'CompanionMemory')?.read_only).toBe(true);
  });

  it('MoodEntry has calibration_only: true (session-tone calibration only per §D)', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_3, 'MoodEntry')?.calibration_only).toBe(true);
  });
});

describe('CBT Therapist — Step 3 wiring excludes caution-layer and prohibited entities', () => {
  for (const name of ['CaseFormulation', 'Conversation']) {
    it(`does not include caution-layer entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).not.toContain(name);
    });
  }
});

// ─── AI Companion — Step 3 wiring ────────────────────────────────────────────

describe('AI Companion — Step 3 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_STEP_3);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to ai_companion', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_3).agent).toBe('ai_companion');
  });
});

describe('AI Companion — Step 3 wiring contains eight entities total', () => {
  it('contains exactly eight entities (two preferred + four allowed + two restricted)', () => {
    expect(AI_COMPANION_WIRING_STEP_3.tool_configs).toHaveLength(8);
  });
});

describe('AI Companion — Step 3 wiring preserves Step 1 preferred entities unchanged', () => {
  it('still includes CompanionMemory as preferred with source_order 1', () => {
    const entity = findEntity(AI_COMPANION_WIRING_STEP_3, 'CompanionMemory');
    expect(entity).toBeDefined();
    expect(entity.access_level).toBe('preferred');
    expect(entity.source_order).toBe(1);
  });

  it('CompanionMemory still has use_for_clinical_reasoning: false', () => {
    expect(
      findEntity(AI_COMPANION_WIRING_STEP_3, 'CompanionMemory')?.use_for_clinical_reasoning
    ).toBe(false);
  });

  it('still includes MoodEntry as preferred with source_order 2', () => {
    const entity = findEntity(AI_COMPANION_WIRING_STEP_3, 'MoodEntry');
    expect(entity).toBeDefined();
    expect(entity.access_level).toBe('preferred');
    expect(entity.source_order).toBe(2);
  });

  it('CompanionMemory is still loaded before MoodEntry', () => {
    const cmOrder = findEntity(AI_COMPANION_WIRING_STEP_3, 'CompanionMemory')?.source_order;
    const meOrder = findEntity(AI_COMPANION_WIRING_STEP_3, 'MoodEntry')?.source_order;
    expect(cmOrder).toBeLessThan(meOrder);
  });
});

describe('AI Companion — Step 3 wiring preserves Step 2 allowed entities unchanged', () => {
  for (const [name, order] of [
    ['Exercise', 3],
    ['Resource', 4],
    ['AudioContent', 5],
    ['Journey', 6],
  ]) {
    it(`still includes "${name}" as allowed with source_order ${order}`, () => {
      const entity = findEntity(AI_COMPANION_WIRING_STEP_3, name);
      expect(entity).toBeDefined();
      expect(entity.access_level).toBe('allowed');
      expect(entity.source_order).toBe(order);
    });
  }
});

describe('AI Companion — Step 3 wiring restricted entity presence', () => {
  for (const name of COMPANION_STEP3_RESTRICTED) {
    it(`includes restricted entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_3)).toContain(name);
    });
  }
});

describe('AI Companion — Step 3 wiring restricted entity access level', () => {
  for (const name of COMPANION_STEP3_RESTRICTED) {
    it(`"${name}" is marked restricted (not preferred or allowed)`, () => {
      expect(findEntity(AI_COMPANION_WIRING_STEP_3, name)?.access_level).toBe('restricted');
    });
  }
});

describe('AI Companion — Step 3 wiring restricted entity source order', () => {
  it('Goal has source_order 7', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_3, 'Goal')?.source_order).toBe(7);
  });

  it('SessionSummary has source_order 8', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_3, 'SessionSummary')?.source_order).toBe(8);
  });
});

describe('AI Companion — Step 3 restricted entities are lower priority than preferred entities', () => {
  const highestPreferredOrder = 2; // MoodEntry

  for (const name of COMPANION_STEP3_RESTRICTED) {
    it(`"${name}" source_order is higher than the highest preferred entity (${highestPreferredOrder})`, () => {
      const order = findEntity(AI_COMPANION_WIRING_STEP_3, name)?.source_order;
      expect(order).toBeGreaterThan(highestPreferredOrder);
    });
  }
});

describe('AI Companion — Step 3 restricted entities are lower priority than allowed entities', () => {
  const highestAllowedOrder = 6; // Journey

  for (const name of COMPANION_STEP3_RESTRICTED) {
    it(`"${name}" source_order is higher than the highest allowed entity (${highestAllowedOrder})`, () => {
      const order = findEntity(AI_COMPANION_WIRING_STEP_3, name)?.source_order;
      expect(order).toBeGreaterThan(highestAllowedOrder);
    });
  }
});

describe('AI Companion — Step 3 restricted entity order within the restricted layer', () => {
  it('Goal is loaded before SessionSummary (per enforcement spec §C)', () => {
    const goalOrder = findEntity(AI_COMPANION_WIRING_STEP_3, 'Goal')?.source_order;
    const summaryOrder = findEntity(AI_COMPANION_WIRING_STEP_3, 'SessionSummary')?.source_order;
    expect(goalOrder).toBeLessThan(summaryOrder);
  });
});

describe('AI Companion — Step 3 restricted entity guardrails', () => {
  it('Goal has reference_only: true (encouragement reference only; must not set or evaluate goals per §D)', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_3, 'Goal')?.reference_only).toBe(true);
  });

  it('SessionSummary has continuity_check_only: true (avoid repeating resolved topics only per §D)', () => {
    expect(
      findEntity(AI_COMPANION_WIRING_STEP_3, 'SessionSummary')?.continuity_check_only
    ).toBe(true);
  });

  it('Conversation source_order constraint: SessionSummary must precede Conversation if Conversation is added', () => {
    // Conversation is not wired in Step 3; verify SessionSummary is present as the guardrail
    // so any future Conversation addition must come after source_order 8.
    const summaryOrder = findEntity(AI_COMPANION_WIRING_STEP_3, 'SessionSummary')?.source_order;
    expect(summaryOrder).toBeDefined();
    expect(summaryOrder).toBeLessThan(Infinity);
  });
});

describe('AI Companion — Step 3 wiring excludes caution-layer and prohibited entities', () => {
  for (const name of ['Conversation']) {
    it(`does not include caution-layer entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_3)).not.toContain(name);
    });
  }

  for (const name of COMPANION_PROHIBITED) {
    it(`does not include companion-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_3)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_3)).not.toContain(name);
    });
  }
});

// ─── Cross-agent: Step 3 shared content pool still present for both agents ───

describe('Step 3 wiring — shared content pool still present in both agents', () => {
  for (const name of SHARED_ENTITIES) {
    it(`CBT Therapist Step 3 still includes "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).toContain(name);
    });

    it(`AI Companion Step 3 still includes "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_3)).toContain(name);
    });
  }
});
