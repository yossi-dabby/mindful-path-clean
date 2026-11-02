/**
 * Tests for the policy rules defined in docs/ai-agent-enforcement-spec.md §F.
 *
 * These tests mirror the `validateAgentPolicy` core logic defined in
 * functions/validateAgentPolicy.ts. Because that file is a Deno serverless
 * function (excluded from the vitest run), the pure validation logic is
 * reproduced here so the rules remain covered by the project test suite.
 *
 * If the policy rules in validateAgentPolicy.ts are ever changed, this file
 * must be updated to match.
 */

import { describe, it, expect } from 'vitest';

// ─── Inline policy constants (mirrors functions/validateAgentPolicy.ts) ────────

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

  // Check 1: System-prohibited entities
  for (const tc of toolConfigs) {
    if (SYSTEM_PROHIBITED.includes(tc.entity_name)) {
      violations.push(
        `Agent "${agentName}" includes system-prohibited entity "${tc.entity_name}" ` +
          `(must be absent from all tool access lists per enforcement spec §E).`
      );
    }
  }

  if (key === 'cbt_therapist') {
    // Check 2: Restricted entities must not be preferred
    for (const tc of toolConfigs) {
      if (CBT_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(
          `CBT Therapist: "${tc.entity_name}" is a restricted entity and must not be ` +
            `marked "preferred" (enforcement spec §F — CBT Therapist).`
        );
      }
    }

    // Check 3: Conversation must not precede SessionSummary
    const convOrder = sourceOrder(toolConfigs, 'Conversation');
    const summaryOrder = sourceOrder(toolConfigs, 'SessionSummary');
    if (convOrder !== Infinity && convOrder < summaryOrder) {
      violations.push(
        `CBT Therapist: "Conversation" (source_order ${convOrder}) must not appear ` +
          `before "SessionSummary" (source_order ${summaryOrder}) — ` +
          `SessionSummary is the required default recall source (enforcement spec §F, §C).`
      );
    }

    // Check 4: CaseFormulation must not be unrestricted
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
    // Check 5: Agent-specific prohibited entities
    for (const tc of toolConfigs) {
      if (COMPANION_PROHIBITED.includes(tc.entity_name)) {
        violations.push(
          `AI Companion: "${tc.entity_name}" is prohibited for this agent and must not ` +
            `appear in tool_configs (enforcement spec §E, §B).`
        );
      }
    }

    // Check 6: Restricted entities must not be preferred
    for (const tc of toolConfigs) {
      if (COMPANION_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(
          `AI Companion: "${tc.entity_name}" is a restricted entity and must not be ` +
            `marked "preferred" (enforcement spec §F — AI Companion).`
        );
      }
    }

    // Check 7: Conversation must not precede SessionSummary
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

    // Check 8: CompanionMemory must not be used for clinical reasoning
    const cm = toolConfigs.find((t) => t.entity_name === 'CompanionMemory');
    if (cm && cm.use_for_clinical_reasoning === true) {
      violations.push(
        `AI Companion: "CompanionMemory" must not be used for clinical reasoning. ` +
          `It drives personalization and tone only (enforcement spec §F — AI Companion).`
      );
    }
  }

  // Cross-agent: CaseFormulation must not be unrestricted (non-CBT case)
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

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Minimal valid CBT Therapist config. */
function cbtConfig(extra = []) {
  return {
    name: 'cbt_therapist',
    tool_configs: [
      { entity_name: 'ThoughtJournal', access_level: 'preferred', source_order: 3 },
      { entity_name: 'Goal', access_level: 'preferred', source_order: 4 },
      { entity_name: 'CoachingSession', access_level: 'preferred', source_order: 5 },
      { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 2 },
      { entity_name: 'CompanionMemory', access_level: 'restricted', source_order: 1 },
      ...extra,
    ],
  };
}

/** Minimal valid AI Companion config. */
function companionConfig(extra = []) {
  return {
    name: 'ai_companion',
    tool_configs: [
      {
        entity_name: 'CompanionMemory',
        access_level: 'preferred',
        source_order: 1,
        use_for_clinical_reasoning: false,
      },
      { entity_name: 'MoodEntry', access_level: 'preferred', source_order: 2 },
      { entity_name: 'Exercise', access_level: 'allowed', source_order: 3 },
      { entity_name: 'Goal', access_level: 'restricted', source_order: 4 },
      { entity_name: 'SessionSummary', access_level: 'restricted', source_order: 5 },
      ...extra,
    ],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validateAgentPolicy — system-prohibited entities (both agents)', () => {
  it('passes when no prohibited entity is present', () => {
    expect(validateAgentPolicy(cbtConfig()).valid).toBe(true);
  });

  for (const entity of SYSTEM_PROHIBITED) {
    it(`blocks "${entity}" for CBT Therapist`, () => {
      const result = validateAgentPolicy(
        cbtConfig([{ entity_name: entity, access_level: 'allowed' }])
      );
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes(entity))).toBe(true);
    });

    it(`blocks "${entity}" for AI Companion`, () => {
      const result = validateAgentPolicy(
        companionConfig([{ entity_name: entity, access_level: 'allowed' }])
      );
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes(entity))).toBe(true);
    });
  }
});

describe('validateAgentPolicy — CBT Therapist restricted entities cannot be preferred', () => {
  for (const entity of CBT_RESTRICTED) {
    it(`rejects "${entity}" when marked preferred`, () => {
      const result = validateAgentPolicy(
        cbtConfig([{ entity_name: entity, access_level: 'preferred' }])
      );
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes(entity))).toBe(true);
    });

    it(`accepts "${entity}" when marked restricted`, () => {
      const result = validateAgentPolicy(
        cbtConfig([{ entity_name: entity, access_level: 'restricted' }])
      );
      // Only violations about that entity should be absent
      const entityViolations = result.violations.filter((v) => v.includes(entity));
      expect(entityViolations.length).toBe(0);
    });
  }
});

describe('validateAgentPolicy — AI Companion prohibited entities', () => {
  for (const entity of COMPANION_PROHIBITED) {
    it(`blocks "${entity}" for AI Companion`, () => {
      const result = validateAgentPolicy(
        companionConfig([{ entity_name: entity, access_level: 'allowed' }])
      );
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes(entity))).toBe(true);
    });
  }
});

describe('validateAgentPolicy — AI Companion restricted entities cannot be preferred', () => {
  for (const entity of COMPANION_RESTRICTED) {
    it(`rejects "${entity}" when marked preferred`, () => {
      const result = validateAgentPolicy(
        companionConfig([{ entity_name: entity, access_level: 'preferred' }])
      );
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes(entity))).toBe(true);
    });
  }
});

describe('validateAgentPolicy — source order: Conversation vs SessionSummary', () => {
  it('CBT Therapist: rejects Conversation before SessionSummary', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 5 },
        { entity_name: 'Conversation', access_level: 'restricted', source_order: 2 },
      ],
    };
    const result = validateAgentPolicy(config);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Conversation'))).toBe(true);
  });

  it('CBT Therapist: accepts Conversation after SessionSummary', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 2 },
        { entity_name: 'Conversation', access_level: 'restricted', source_order: 9 },
      ],
    };
    const result = validateAgentPolicy(config);
    const orderViolations = result.violations.filter(
      (v) => v.includes('Conversation') && v.includes('SessionSummary')
    );
    expect(orderViolations.length).toBe(0);
  });

  it('CBT Therapist: accepts config without Conversation entry', () => {
    const result = validateAgentPolicy(cbtConfig());
    expect(result.valid).toBe(true);
  });

  it('AI Companion: rejects Conversation before SessionSummary', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        { entity_name: 'CompanionMemory', access_level: 'preferred', source_order: 1 },
        { entity_name: 'SessionSummary', access_level: 'restricted', source_order: 5 },
        { entity_name: 'Conversation', access_level: 'restricted', source_order: 3 },
      ],
    };
    const result = validateAgentPolicy(config);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Conversation'))).toBe(true);
  });

  it('AI Companion: accepts Conversation after SessionSummary', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        { entity_name: 'CompanionMemory', access_level: 'preferred', source_order: 1 },
        { entity_name: 'SessionSummary', access_level: 'restricted', source_order: 5 },
        { entity_name: 'Conversation', access_level: 'restricted', source_order: 6 },
      ],
    };
    const result = validateAgentPolicy(config);
    const orderViolations = result.violations.filter(
      (v) => v.includes('Conversation') && v.includes('SessionSummary')
    );
    expect(orderViolations.length).toBe(0);
  });
});

describe('validateAgentPolicy — CompanionMemory cannot be used for clinical reasoning', () => {
  it('AI Companion: rejects use_for_clinical_reasoning: true on CompanionMemory', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        {
          entity_name: 'CompanionMemory',
          access_level: 'preferred',
          source_order: 1,
          use_for_clinical_reasoning: true,
        },
      ],
    };
    const result = validateAgentPolicy(config);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('CompanionMemory'))).toBe(true);
    expect(result.violations.some((v) => v.includes('clinical reasoning'))).toBe(true);
  });

  it('AI Companion: accepts use_for_clinical_reasoning: false on CompanionMemory', () => {
    const result = validateAgentPolicy(companionConfig());
    expect(result.valid).toBe(true);
  });

  it('AI Companion: accepts CompanionMemory without the flag set', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        { entity_name: 'CompanionMemory', access_level: 'preferred', source_order: 1 },
        { entity_name: 'MoodEntry', access_level: 'preferred', source_order: 2 },
      ],
    };
    const result = validateAgentPolicy(config);
    const cmViolations = result.violations.filter(
      (v) => v.includes('CompanionMemory') && v.includes('clinical reasoning')
    );
    expect(cmViolations.length).toBe(0);
  });
});

describe('validateAgentPolicy — CaseFormulation cannot be unrestricted', () => {
  it('CBT Therapist: rejects CaseFormulation with unrestricted: true', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'CaseFormulation', access_level: 'restricted', unrestricted: true },
      ],
    };
    const result = validateAgentPolicy(config);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('CaseFormulation'))).toBe(true);
    expect(result.violations.some((v) => v.includes('unrestricted'))).toBe(true);
  });

  it('CBT Therapist: accepts CaseFormulation with unrestricted: false', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'CaseFormulation', access_level: 'restricted', unrestricted: false },
      ],
    };
    const result = validateAgentPolicy(config);
    const cfViolations = result.violations.filter((v) => v.includes('CaseFormulation'));
    expect(cfViolations.length).toBe(0);
  });

  it('AI Companion: CaseFormulation is already caught as prohibited', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        { entity_name: 'CaseFormulation', access_level: 'restricted', unrestricted: true },
      ],
    };
    const result = validateAgentPolicy(config);
    expect(result.valid).toBe(false);
    // Both the prohibited check AND the unrestricted check should fire
    expect(result.violations.filter((v) => v.includes('CaseFormulation')).length).toBeGreaterThan(0);
  });
});

describe('validateAgentPolicy — valid baseline configurations pass', () => {
  it('accepts a clean CBT Therapist config', () => {
    expect(validateAgentPolicy(cbtConfig()).valid).toBe(true);
  });

  it('accepts a clean AI Companion config', () => {
    expect(validateAgentPolicy(companionConfig()).valid).toBe(true);
  });

  it('returns agent name in result', () => {
    const result = validateAgentPolicy(cbtConfig());
    expect(result.agent).toBe('cbt_therapist');
  });

  it('returns empty violations array for valid config', () => {
    expect(validateAgentPolicy(cbtConfig()).violations).toEqual([]);
  });

  it('handles missing tool_configs gracefully', () => {
    const result = validateAgentPolicy({ name: 'cbt_therapist' });
    expect(result.agent).toBe('cbt_therapist');
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('handles unknown agent name gracefully', () => {
    const result = validateAgentPolicy({
      name: 'unknown_agent',
      tool_configs: [{ entity_name: 'ThoughtJournal', access_level: 'preferred' }],
    });
    // Only system-prohibited check applies; ThoughtJournal is fine for unknown agent
    expect(result.valid).toBe(true);
  });
});
