/**
 * V1 Final QA — agent wiring baseline (src/api/agentWiring.js).
 *
 * This file is the definitive close-of-V1 validation.  It confirms that
 * the Step 3 exports for both agents are the canonical V1 baseline and that:
 *
 *   1. Every entity in both agents has the correct source_order (full order).
 *   2. Both agents pass the full policy validator.
 *   3. Caution-layer entities (CaseFormulation, Conversation) are absent
 *      from all V1 exports — they are deferred to a later release.
 *   4. All system-prohibited entities (Subscription, UserDeletedConversations,
 *      AppNotification, MindGameActivity) are absent from all V1 exports.
 *   5. Step 1 and Step 2 exports are unchanged (no regression from Step 3).
 *
 * Source of truth: docs/ai-agent-enforcement-spec.md §B, §C, §D, §E, §F and
 *                  docs/ai-agent-content-mapping.md §H (V1 Final Baseline).
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

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];
const CBT_RESTRICTED = ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation'];
const COMPANION_PROHIBITED = ['ThoughtJournal', 'CoachingSession', 'CaseFormulation'];
const COMPANION_RESTRICTED = ['Goal', 'SessionSummary', 'Conversation'];

// Caution-layer entities kept out of V1 for all agents.
const CAUTION_LAYER = ['CaseFormulation', 'Conversation'];

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
          `AI Companion: "${tc.entity_name}" is prohibited for the AI Companion ` +
            `(enforcement spec §F — AI Companion).`
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
    const cmOrder = sourceOrder(toolConfigs, 'CompanionMemory');
    if (cmOrder !== Infinity && cmOrder !== 1) {
      violations.push(
        `AI Companion: "CompanionMemory" must be source_order 1 — it must always be ` +
          `read first (enforcement spec §C — AI Companion).`
      );
    }
    const cm = toolConfigs.find((t) => t.entity_name === 'CompanionMemory');
    if (cm && cm.use_for_clinical_reasoning !== false) {
      violations.push(
        `AI Companion: "CompanionMemory" must have use_for_clinical_reasoning: false ` +
          `(enforcement spec §F — AI Companion).`
      );
    }
  }

  return { valid: violations.length === 0, violations, agent: key };
}

function entityNames(wiring) {
  return (wiring?.tool_configs || []).map((tc) => tc.entity_name);
}

function findEntity(wiring, name) {
  return (wiring?.tool_configs || []).find((tc) => tc.entity_name === name);
}

// ─── V1 canonical baseline: Step 3 is the final export for both agents ────────

// These are the V1 canonical configs.
const CBT_V1 = CBT_THERAPIST_WIRING_STEP_3;
const COMPANION_V1 = AI_COMPANION_WIRING_STEP_3;

// ─── CBT Therapist — V1 Final policy compliance ───────────────────────────────

describe('V1 Final — CBT Therapist passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(CBT_V1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to cbt_therapist', () => {
    expect(validateAgentPolicy(CBT_V1).agent).toBe('cbt_therapist');
  });
});

// ─── CBT Therapist — V1 Final entity count ────────────────────────────────────

describe('V1 Final — CBT Therapist contains exactly ten entities', () => {
  it('has exactly ten entities (four preferred + four allowed + two restricted)', () => {
    expect(CBT_V1.tool_configs).toHaveLength(10);
  });
});

// ─── CBT Therapist — V1 Final full source order ───────────────────────────────

describe('V1 Final — CBT Therapist complete source order', () => {
  const expected = [
    { entity_name: 'SessionSummary',  access_level: 'preferred',  source_order: 2 },
    { entity_name: 'ThoughtJournal',  access_level: 'preferred',  source_order: 3 },
    { entity_name: 'Goal',            access_level: 'preferred',  source_order: 4 },
    { entity_name: 'CoachingSession', access_level: 'preferred',  source_order: 5 },
    { entity_name: 'Exercise',        access_level: 'allowed',    source_order: 6 },
    { entity_name: 'Resource',        access_level: 'allowed',    source_order: 7 },
    { entity_name: 'AudioContent',    access_level: 'allowed',    source_order: 8 },
    { entity_name: 'Journey',         access_level: 'allowed',    source_order: 9 },
    { entity_name: 'CompanionMemory', access_level: 'restricted', source_order: 10 },
    { entity_name: 'MoodEntry',       access_level: 'restricted', source_order: 11 },
  ];

  for (const { entity_name, access_level, source_order: order } of expected) {
    it(`"${entity_name}" — access_level: ${access_level}, source_order: ${order}`, () => {
      const entity = findEntity(CBT_V1, entity_name);
      expect(entity, `${entity_name} should be present`).toBeDefined();
      expect(entity.access_level).toBe(access_level);
      expect(entity.source_order).toBe(order);
    });
  }

  it('entities are listed in ascending source_order', () => {
    const orders = CBT_V1.tool_configs.map((tc) => tc.source_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

// ─── CBT Therapist — V1 Final restricted entity guardrails ────────────────────

describe('V1 Final — CBT Therapist restricted entity guardrails', () => {
  it('CompanionMemory has read_only: true (must not write or overwrite entries per §D)', () => {
    expect(findEntity(CBT_V1, 'CompanionMemory')?.read_only).toBe(true);
  });

  it('MoodEntry has calibration_only: true (session-tone calibration only per §D)', () => {
    expect(findEntity(CBT_V1, 'MoodEntry')?.calibration_only).toBe(true);
  });
});

// ─── CBT Therapist — V1 Final caution and prohibited entity absence ───────────

describe('V1 Final — CBT Therapist excludes caution-layer entities (deferred)', () => {
  for (const name of CAUTION_LAYER) {
    it(`does not include caution-layer entity "${name}"`, () => {
      expect(entityNames(CBT_V1)).not.toContain(name);
    });
  }
});

describe('V1 Final — CBT Therapist excludes all system-prohibited entities', () => {
  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(CBT_V1)).not.toContain(name);
    });
  }
});

// ─── AI Companion — V1 Final policy compliance ────────────────────────────────

describe('V1 Final — AI Companion passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(COMPANION_V1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to ai_companion', () => {
    expect(validateAgentPolicy(COMPANION_V1).agent).toBe('ai_companion');
  });
});

// ─── AI Companion — V1 Final entity count ─────────────────────────────────────

describe('V1 Final — AI Companion contains exactly eight entities', () => {
  it('has exactly eight entities (two preferred + four allowed + two restricted)', () => {
    expect(COMPANION_V1.tool_configs).toHaveLength(8);
  });
});

// ─── AI Companion — V1 Final full source order ────────────────────────────────

describe('V1 Final — AI Companion complete source order', () => {
  const expected = [
    { entity_name: 'CompanionMemory', access_level: 'preferred',  source_order: 1 },
    { entity_name: 'MoodEntry',       access_level: 'preferred',  source_order: 2 },
    { entity_name: 'Exercise',        access_level: 'allowed',    source_order: 3 },
    { entity_name: 'Resource',        access_level: 'allowed',    source_order: 4 },
    { entity_name: 'AudioContent',    access_level: 'allowed',    source_order: 5 },
    { entity_name: 'Journey',         access_level: 'allowed',    source_order: 6 },
    { entity_name: 'Goal',            access_level: 'restricted', source_order: 7 },
    { entity_name: 'SessionSummary',  access_level: 'restricted', source_order: 8 },
  ];

  for (const { entity_name, access_level, source_order: order } of expected) {
    it(`"${entity_name}" — access_level: ${access_level}, source_order: ${order}`, () => {
      const entity = findEntity(COMPANION_V1, entity_name);
      expect(entity, `${entity_name} should be present`).toBeDefined();
      expect(entity.access_level).toBe(access_level);
      expect(entity.source_order).toBe(order);
    });
  }

  it('entities are listed in ascending source_order', () => {
    const orders = COMPANION_V1.tool_configs.map((tc) => tc.source_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

// ─── AI Companion — V1 Final special flags ────────────────────────────────────

describe('V1 Final — AI Companion special flags', () => {
  it('CompanionMemory has use_for_clinical_reasoning: false (non-clinical per §F)', () => {
    expect(findEntity(COMPANION_V1, 'CompanionMemory')?.use_for_clinical_reasoning).toBe(false);
  });

  it('CompanionMemory is loaded at source_order 1 — always first (per §C)', () => {
    expect(findEntity(COMPANION_V1, 'CompanionMemory')?.source_order).toBe(1);
  });
});

// ─── AI Companion — V1 Final restricted entity guardrails ─────────────────────

describe('V1 Final — AI Companion restricted entity guardrails', () => {
  it('Goal has reference_only: true (encouragement reference only; must not set or evaluate goals per §D)', () => {
    expect(findEntity(COMPANION_V1, 'Goal')?.reference_only).toBe(true);
  });

  it('SessionSummary has continuity_check_only: true (avoid repeating resolved topics only per §D)', () => {
    expect(findEntity(COMPANION_V1, 'SessionSummary')?.continuity_check_only).toBe(true);
  });
});

// ─── AI Companion — V1 Final caution and prohibited entity absence ─────────────

describe('V1 Final — AI Companion excludes caution-layer entity "Conversation" (deferred)', () => {
  it('does not include Conversation', () => {
    expect(entityNames(COMPANION_V1)).not.toContain('Conversation');
  });
});

describe('V1 Final — AI Companion excludes companion-prohibited entities', () => {
  for (const name of COMPANION_PROHIBITED) {
    it(`does not include companion-prohibited entity "${name}"`, () => {
      expect(entityNames(COMPANION_V1)).not.toContain(name);
    });
  }
});

describe('V1 Final — AI Companion excludes all system-prohibited entities', () => {
  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(COMPANION_V1)).not.toContain(name);
    });
  }
});

// ─── Cross-agent: all V1 exports exclude every prohibited entity ───────────────

describe('V1 Final — all exported wiring configs exclude system-prohibited entities', () => {
  const ALL_V1_EXPORTS = [
    ['CBT_THERAPIST_WIRING_STEP_1', CBT_THERAPIST_WIRING_STEP_1],
    ['AI_COMPANION_WIRING_STEP_1',  AI_COMPANION_WIRING_STEP_1],
    ['CBT_THERAPIST_WIRING_STEP_2', CBT_THERAPIST_WIRING_STEP_2],
    ['AI_COMPANION_WIRING_STEP_2',  AI_COMPANION_WIRING_STEP_2],
    ['CBT_THERAPIST_WIRING_STEP_3', CBT_THERAPIST_WIRING_STEP_3],
    ['AI_COMPANION_WIRING_STEP_3',  AI_COMPANION_WIRING_STEP_3],
  ];

  for (const [exportName, config] of ALL_V1_EXPORTS) {
    for (const prohibited of SYSTEM_PROHIBITED) {
      it(`${exportName} does not include "${prohibited}"`, () => {
        expect(entityNames(config)).not.toContain(prohibited);
      });
    }
  }
});

// ─── Cross-agent: all V1 exports exclude caution-layer entities ───────────────

describe('V1 Final — all exported wiring configs exclude caution-layer entities', () => {
  const ALL_V1_EXPORTS = [
    ['CBT_THERAPIST_WIRING_STEP_1', CBT_THERAPIST_WIRING_STEP_1],
    ['AI_COMPANION_WIRING_STEP_1',  AI_COMPANION_WIRING_STEP_1],
    ['CBT_THERAPIST_WIRING_STEP_2', CBT_THERAPIST_WIRING_STEP_2],
    ['AI_COMPANION_WIRING_STEP_2',  AI_COMPANION_WIRING_STEP_2],
    ['CBT_THERAPIST_WIRING_STEP_3', CBT_THERAPIST_WIRING_STEP_3],
    ['AI_COMPANION_WIRING_STEP_3',  AI_COMPANION_WIRING_STEP_3],
  ];

  for (const [exportName, config] of ALL_V1_EXPORTS) {
    for (const caution of CAUTION_LAYER) {
      it(`${exportName} does not include caution-layer entity "${caution}"`, () => {
        expect(entityNames(config)).not.toContain(caution);
      });
    }
  }
});

// ─── Step 3 is the V1 canonical baseline ─────────────────────────────────────

describe('V1 Final — Step 3 is the canonical V1 baseline (identity checks)', () => {
  it('CBT_THERAPIST_WIRING_STEP_3 is the CBT Therapist V1 canonical config', () => {
    expect(CBT_V1).toBe(CBT_THERAPIST_WIRING_STEP_3);
  });

  it('AI_COMPANION_WIRING_STEP_3 is the AI Companion V1 canonical config', () => {
    expect(COMPANION_V1).toBe(AI_COMPANION_WIRING_STEP_3);
  });
});

// ─── Regression: earlier step exports are not mutated by Step 3 ───────────────

describe('V1 Final — Step 1 exports are unaltered (regression guard)', () => {
  it('CBT Therapist Step 1 still has exactly four entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1.tool_configs).toHaveLength(4);
  });

  it('AI Companion Step 1 still has exactly two entities', () => {
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

describe('V1 Final — Step 2 exports are unaltered (regression guard)', () => {
  it('CBT Therapist Step 2 still has exactly eight entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2.tool_configs).toHaveLength(8);
  });

  it('AI Companion Step 2 still has exactly six entities', () => {
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
