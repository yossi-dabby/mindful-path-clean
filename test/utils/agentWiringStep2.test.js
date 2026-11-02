/**
 * Tests for the Step 2 additive-only agent wiring defined in
 * src/api/agentWiring.js.
 *
 * Verifies that both Step 2 wiring configs:
 *   1. Include exactly the Step 1 preferred entities, unchanged.
 *   2. Add the four Allowed shared entities (Exercise, Resource, AudioContent, Journey).
 *   3. Mark shared entities as 'allowed', not 'preferred'.
 *   4. Place shared entities at lower source_order than all preferred entities.
 *   5. Pass the full policy validator (mirrors validateAgentPolicy.ts logic).
 *   6. Do not include any restricted, caution-layer, or prohibited entities.
 *   7. Do not alter the Step 1 exports.
 */

import { describe, it, expect } from 'vitest';
import {
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
  CBT_THERAPIST_WIRING_STEP_2,
  AI_COMPANION_WIRING_STEP_2,
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

// ─── Shared entity names (Step 2 additions) ───────────────────────────────────

const SHARED_ENTITIES = ['Exercise', 'Resource', 'AudioContent', 'Journey'];

// ─── Guard: Step 1 exports are unchanged ─────────────────────────────────────

describe('Step 1 exports are unmodified by Step 2 additions', () => {
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

// ─── CBT Therapist — Step 2 wiring ───────────────────────────────────────────

describe('CBT Therapist — Step 2 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_2);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to cbt_therapist', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_2).agent).toBe('cbt_therapist');
  });
});

describe('CBT Therapist — Step 2 wiring contains eight entities total', () => {
  it('contains exactly eight entities (four preferred + four allowed)', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2.tool_configs).toHaveLength(8);
  });
});

describe('CBT Therapist — Step 2 wiring preserves Step 1 preferred entities unchanged', () => {
  for (const [name, order] of [
    ['SessionSummary', 2],
    ['ThoughtJournal', 3],
    ['Goal', 4],
    ['CoachingSession', 5],
  ]) {
    it(`still includes "${name}" as preferred with source_order ${order}`, () => {
      const entity = findEntity(CBT_THERAPIST_WIRING_STEP_2, name);
      expect(entity).toBeDefined();
      expect(entity.access_level).toBe('preferred');
      expect(entity.source_order).toBe(order);
    });
  }
});

describe('CBT Therapist — Step 2 wiring shared entity presence', () => {
  for (const name of SHARED_ENTITIES) {
    it(`includes shared entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_2)).toContain(name);
    });
  }
});

describe('CBT Therapist — Step 2 wiring shared entity access level', () => {
  for (const name of SHARED_ENTITIES) {
    it(`"${name}" is marked allowed (not preferred)`, () => {
      expect(findEntity(CBT_THERAPIST_WIRING_STEP_2, name)?.access_level).toBe('allowed');
    });
  }
});

describe('CBT Therapist — Step 2 wiring shared entity source order', () => {
  it('Exercise has source_order 6', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_2, 'Exercise')?.source_order).toBe(6);
  });

  it('Resource has source_order 7', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_2, 'Resource')?.source_order).toBe(7);
  });

  it('AudioContent has source_order 8', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_2, 'AudioContent')?.source_order).toBe(8);
  });

  it('Journey has source_order 9', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_2, 'Journey')?.source_order).toBe(9);
  });
});

describe('CBT Therapist — Step 2 wiring shared entities are lower priority than preferred', () => {
  const highestPreferredOrder = 5; // CoachingSession

  for (const name of SHARED_ENTITIES) {
    it(`"${name}" source_order is higher than the highest preferred entity (${highestPreferredOrder})`, () => {
      const order = findEntity(CBT_THERAPIST_WIRING_STEP_2, name)?.source_order;
      expect(order).toBeGreaterThan(highestPreferredOrder);
    });
  }
});

describe('CBT Therapist — Step 2 wiring excludes restricted and prohibited entities', () => {
  for (const name of ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation']) {
    it(`does not include restricted entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_2)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_2)).not.toContain(name);
    });
  }
});

// ─── AI Companion — Step 2 wiring ────────────────────────────────────────────

describe('AI Companion — Step 2 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_STEP_2);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to ai_companion', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_2).agent).toBe('ai_companion');
  });
});

describe('AI Companion — Step 2 wiring contains six entities total', () => {
  it('contains exactly six entities (two preferred + four allowed)', () => {
    expect(AI_COMPANION_WIRING_STEP_2.tool_configs).toHaveLength(6);
  });
});

describe('AI Companion — Step 2 wiring preserves Step 1 preferred entities unchanged', () => {
  it('still includes CompanionMemory as preferred with source_order 1', () => {
    const entity = findEntity(AI_COMPANION_WIRING_STEP_2, 'CompanionMemory');
    expect(entity).toBeDefined();
    expect(entity.access_level).toBe('preferred');
    expect(entity.source_order).toBe(1);
  });

  it('CompanionMemory still has use_for_clinical_reasoning: false', () => {
    expect(
      findEntity(AI_COMPANION_WIRING_STEP_2, 'CompanionMemory')?.use_for_clinical_reasoning
    ).toBe(false);
  });

  it('still includes MoodEntry as preferred with source_order 2', () => {
    const entity = findEntity(AI_COMPANION_WIRING_STEP_2, 'MoodEntry');
    expect(entity).toBeDefined();
    expect(entity.access_level).toBe('preferred');
    expect(entity.source_order).toBe(2);
  });

  it('CompanionMemory is still loaded before MoodEntry', () => {
    const cmOrder = findEntity(AI_COMPANION_WIRING_STEP_2, 'CompanionMemory')?.source_order;
    const meOrder = findEntity(AI_COMPANION_WIRING_STEP_2, 'MoodEntry')?.source_order;
    expect(cmOrder).toBeLessThan(meOrder);
  });
});

describe('AI Companion — Step 2 wiring shared entity presence', () => {
  for (const name of SHARED_ENTITIES) {
    it(`includes shared entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_2)).toContain(name);
    });
  }
});

describe('AI Companion — Step 2 wiring shared entity access level', () => {
  for (const name of SHARED_ENTITIES) {
    it(`"${name}" is marked allowed (not preferred)`, () => {
      expect(findEntity(AI_COMPANION_WIRING_STEP_2, name)?.access_level).toBe('allowed');
    });
  }
});

describe('AI Companion — Step 2 wiring shared entity source order', () => {
  it('Exercise has source_order 3', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_2, 'Exercise')?.source_order).toBe(3);
  });

  it('Resource has source_order 4', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_2, 'Resource')?.source_order).toBe(4);
  });

  it('AudioContent has source_order 5', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_2, 'AudioContent')?.source_order).toBe(5);
  });

  it('Journey has source_order 6', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_2, 'Journey')?.source_order).toBe(6);
  });
});

describe('AI Companion — Step 2 wiring shared entities are lower priority than preferred', () => {
  const highestPreferredOrder = 2; // MoodEntry

  for (const name of SHARED_ENTITIES) {
    it(`"${name}" source_order is higher than the highest preferred entity (${highestPreferredOrder})`, () => {
      const order = findEntity(AI_COMPANION_WIRING_STEP_2, name)?.source_order;
      expect(order).toBeGreaterThan(highestPreferredOrder);
    });
  }
});

describe('AI Companion — Step 2 wiring excludes restricted and prohibited entities', () => {
  for (const name of COMPANION_PROHIBITED) {
    it(`does not include companion-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_2)).not.toContain(name);
    });
  }

  for (const name of COMPANION_RESTRICTED) {
    it(`does not include companion-restricted entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_2)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_2)).not.toContain(name);
    });
  }
});
