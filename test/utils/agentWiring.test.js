/**
 * Tests for the first-pass additive-only agent wiring defined in
 * src/api/agentWiring.js.
 *
 * Verifies that both exported wiring configs:
 *   1. Contain exactly the entities approved for Step 1.
 *   2. Use the correct access_level for each entity (Preferred only).
 *   3. Follow the approved source order from docs/ai-agent-enforcement-spec.md §C.
 *   4. Pass the full policy validator (mirrors validateAgentPolicy.ts logic).
 *   5. Do not include any restricted, caution-layer, or prohibited entities.
 */

import { describe, it, expect } from 'vitest';
import {
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
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

// ─── CBT Therapist — Step 1 wiring ───────────────────────────────────────────

describe('CBT Therapist — Step 1 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to cbt_therapist', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_1).agent).toBe('cbt_therapist');
  });
});

describe('CBT Therapist — Step 1 wiring entity presence', () => {
  it('includes ThoughtJournal', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).toContain('ThoughtJournal');
  });

  it('includes Goal', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).toContain('Goal');
  });

  it('includes CoachingSession', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).toContain('CoachingSession');
  });

  it('includes SessionSummary', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).toContain('SessionSummary');
  });

  it('contains exactly four entities in Step 1', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1.tool_configs).toHaveLength(4);
  });
});

describe('CBT Therapist — Step 1 wiring access levels', () => {
  for (const name of ['ThoughtJournal', 'Goal', 'CoachingSession', 'SessionSummary']) {
    it(`"${name}" is marked preferred`, () => {
      expect(findEntity(CBT_THERAPIST_WIRING_STEP_1, name)?.access_level).toBe('preferred');
    });
  }
});

describe('CBT Therapist — Step 1 wiring source order', () => {
  it('SessionSummary has source_order 2', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_1, 'SessionSummary')?.source_order).toBe(2);
  });

  it('ThoughtJournal has source_order 3', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_1, 'ThoughtJournal')?.source_order).toBe(3);
  });

  it('Goal has source_order 4', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_1, 'Goal')?.source_order).toBe(4);
  });

  it('CoachingSession has source_order 5', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_STEP_1, 'CoachingSession')?.source_order).toBe(5);
  });
});

describe('CBT Therapist — Step 1 wiring excludes restricted and prohibited entities', () => {
  for (const name of ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation']) {
    it(`does not include restricted entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).not.toContain(name);
    });
  }
});

// ─── AI Companion — Step 1 wiring ────────────────────────────────────────────

describe('AI Companion — Step 1 wiring passes policy validation', () => {
  it('passes the full policy validator', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_STEP_1);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('agent name resolves to ai_companion', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_1).agent).toBe('ai_companion');
  });
});

describe('AI Companion — Step 1 wiring entity presence', () => {
  it('includes CompanionMemory', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_1)).toContain('CompanionMemory');
  });

  it('includes MoodEntry', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_1)).toContain('MoodEntry');
  });

  it('contains exactly two entities in Step 1', () => {
    expect(AI_COMPANION_WIRING_STEP_1.tool_configs).toHaveLength(2);
  });
});

describe('AI Companion — Step 1 wiring access levels', () => {
  it('CompanionMemory is marked preferred', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_1, 'CompanionMemory')?.access_level).toBe(
      'preferred'
    );
  });

  it('MoodEntry is marked preferred', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_1, 'MoodEntry')?.access_level).toBe('preferred');
  });
});

describe('AI Companion — Step 1 wiring source order', () => {
  it('CompanionMemory has source_order 1 (loaded first)', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_1, 'CompanionMemory')?.source_order).toBe(1);
  });

  it('MoodEntry has source_order 2 (loaded second)', () => {
    expect(findEntity(AI_COMPANION_WIRING_STEP_1, 'MoodEntry')?.source_order).toBe(2);
  });

  it('CompanionMemory is loaded before MoodEntry', () => {
    const cmOrder = findEntity(AI_COMPANION_WIRING_STEP_1, 'CompanionMemory')?.source_order;
    const meOrder = findEntity(AI_COMPANION_WIRING_STEP_1, 'MoodEntry')?.source_order;
    expect(cmOrder).toBeLessThan(meOrder);
  });
});

describe('AI Companion — Step 1 wiring CompanionMemory clinical reasoning guard', () => {
  it('CompanionMemory has use_for_clinical_reasoning: false', () => {
    expect(
      findEntity(AI_COMPANION_WIRING_STEP_1, 'CompanionMemory')?.use_for_clinical_reasoning
    ).toBe(false);
  });
});

describe('AI Companion — Step 1 wiring excludes restricted and prohibited entities', () => {
  for (const name of COMPANION_PROHIBITED) {
    it(`does not include companion-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_1)).not.toContain(name);
    });
  }

  for (const name of COMPANION_RESTRICTED) {
    it(`does not include companion-restricted entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_1)).not.toContain(name);
    });
  }

  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_STEP_1)).not.toContain(name);
    });
  }
});
