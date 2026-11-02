/**
 * Tests for validateAgentEntityAccess logic (mirrors functions/validateAgentEntityAccess.ts).
 *
 * That file is a Deno serverless HTTP handler excluded from vitest, so the
 * pure validation logic is reproduced inline below.
 *
 * Covers:
 *   - PROHIBITED_ENTITIES constant (DoD6D – "Not for AI Knowledge")
 *   - validateAgentConfig() returns valid:true for clean configs
 *   - validateAgentConfig() returns valid:false with violations for prohibited entities
 *   - Multiple violations are accumulated
 *   - Agent name defaults to 'unknown' when absent
 *   - Empty tool_configs pass validation
 *   - Case-sensitivity: lowercase variants are NOT prohibited
 *
 * If the PROHIBITED_ENTITIES list or validateAgentConfig logic in
 * functions/validateAgentEntityAccess.ts changes, update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── MIRRORED LOGIC (from functions/validateAgentEntityAccess.ts) ─────────────

const PROHIBITED_ENTITIES = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

/**
 * Mirrors validateAgentConfig() from functions/validateAgentEntityAccess.ts.
 */
function validateAgentConfig(agentConfig) {
  const agentName = agentConfig?.name || 'unknown';
  const toolConfigs = agentConfig?.tool_configs || [];
  const violations = [];

  for (const tc of toolConfigs) {
    if (PROHIBITED_ENTITIES.includes(tc.entity_name)) {
      violations.push(
        `Agent "${agentName}" requests access to prohibited entity "${tc.entity_name}" (classified as "Not for AI Knowledge").`
      );
    }
  }

  return {
    valid: violations.length === 0,
    agent: agentName,
    violations,
  };
}

// ─── TESTS — PROHIBITED_ENTITIES constant ────────────────────────────────────

describe('validateAgentEntityAccess – PROHIBITED_ENTITIES constant', () => {
  it('contains exactly the four DoD6D prohibited entities', () => {
    expect(PROHIBITED_ENTITIES).toHaveLength(4);
  });

  it('includes Subscription', () => {
    expect(PROHIBITED_ENTITIES).toContain('Subscription');
  });

  it('includes UserDeletedConversations', () => {
    expect(PROHIBITED_ENTITIES).toContain('UserDeletedConversations');
  });

  it('includes AppNotification', () => {
    expect(PROHIBITED_ENTITIES).toContain('AppNotification');
  });

  it('includes MindGameActivity', () => {
    expect(PROHIBITED_ENTITIES).toContain('MindGameActivity');
  });
});

// ─── TESTS — validateAgentConfig: valid configs ───────────────────────────────

describe('validateAgentConfig – valid configs', () => {
  it('returns valid:true for an empty tool_configs array', () => {
    const result = validateAgentConfig({ name: 'my_agent', tool_configs: [] });
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.agent).toBe('my_agent');
  });

  it('returns valid:true when tool_configs contains only allowed entities', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'ThoughtJournal', access_level: 'preferred' },
        { entity_name: 'Goal', access_level: 'preferred' },
        { entity_name: 'Exercise', access_level: 'allowed' },
      ],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('returns valid:true for AI Companion with allowed entities', () => {
    const config = {
      name: 'ai_companion',
      tool_configs: [
        { entity_name: 'CompanionMemory', access_level: 'preferred' },
        { entity_name: 'MoodEntry', access_level: 'preferred' },
        { entity_name: 'Exercise', access_level: 'allowed' },
      ],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('returns valid:true for a rich allowed config with many entities', () => {
    const config = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'ThoughtJournal' },
        { entity_name: 'Goal' },
        { entity_name: 'CoachingSession' },
        { entity_name: 'SessionSummary' },
        { entity_name: 'Exercise' },
        { entity_name: 'Resource' },
        { entity_name: 'AudioContent' },
        { entity_name: 'Journey' },
      ],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── TESTS — validateAgentConfig: prohibited entity detection ─────────────────

describe('validateAgentConfig – prohibited entity detection', () => {
  it('returns valid:false when Subscription is in tool_configs', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'Subscription' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('Subscription');
    expect(result.violations[0]).toContain('Not for AI Knowledge');
  });

  it('returns valid:false when UserDeletedConversations is in tool_configs', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'UserDeletedConversations' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('UserDeletedConversations');
  });

  it('returns valid:false when AppNotification is in tool_configs', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'AppNotification' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('AppNotification');
  });

  it('returns valid:false when MindGameActivity is in tool_configs', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'MindGameActivity' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('MindGameActivity');
  });

  it('accumulates multiple violations for multiple prohibited entities', () => {
    const config = {
      name: 'bad_agent',
      tool_configs: [
        { entity_name: 'Subscription' },
        { entity_name: 'AppNotification' },
        { entity_name: 'MindGameActivity' },
      ],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(3);
  });

  it('accumulates all four violations when all prohibited entities are present', () => {
    const config = {
      name: 'very_bad_agent',
      tool_configs: PROHIBITED_ENTITIES.map(e => ({ entity_name: e })),
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(4);
  });

  it('includes the agent name in each violation message', () => {
    const config = {
      name: 'rogue_agent',
      tool_configs: [{ entity_name: 'Subscription' }],
    };
    const result = validateAgentConfig(config);
    expect(result.violations[0]).toContain('"rogue_agent"');
  });

  it('does not generate a violation for an allowed entity mixed with prohibited ones', () => {
    const config = {
      name: 'mixed_agent',
      tool_configs: [
        { entity_name: 'Exercise' },
        { entity_name: 'Subscription' },
        { entity_name: 'Goal' },
      ],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('Subscription');
  });
});

// ─── TESTS — validateAgentConfig: edge cases ─────────────────────────────────

describe('validateAgentConfig – edge cases', () => {
  it('defaults agent name to "unknown" when name is absent', () => {
    const result = validateAgentConfig({ tool_configs: [] });
    expect(result.agent).toBe('unknown');
    expect(result.valid).toBe(true);
  });

  it('defaults to empty tool_configs when tool_configs is absent', () => {
    const result = validateAgentConfig({ name: 'nameless' });
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('handles null agentConfig gracefully', () => {
    const result = validateAgentConfig(null);
    expect(result.agent).toBe('unknown');
    expect(result.valid).toBe(true);
  });

  it('handles undefined agentConfig gracefully', () => {
    const result = validateAgentConfig(undefined);
    expect(result.agent).toBe('unknown');
    expect(result.valid).toBe(true);
  });

  it('is case-sensitive: "subscription" (lowercase) is not prohibited', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'subscription' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(true);
  });

  it('is case-sensitive: "appnotification" (lowercase) is not prohibited', () => {
    const config = {
      name: 'my_agent',
      tool_configs: [{ entity_name: 'appnotification' }],
    };
    const result = validateAgentConfig(config);
    expect(result.valid).toBe(true);
  });

  it('returns the correct agent name in the result', () => {
    const config = { name: 'test_agent_v2', tool_configs: [] };
    const result = validateAgentConfig(config);
    expect(result.agent).toBe('test_agent_v2');
  });

  it('result always contains valid, agent, and violations fields', () => {
    const result = validateAgentConfig({ name: 'any_agent', tool_configs: [] });
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('agent');
    expect(result).toHaveProperty('violations');
  });
});
