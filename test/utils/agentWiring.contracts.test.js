/**
 * AGENT WIRING STABLE CONTRACTS
 *
 * Non-snapshot contract tests that assert invariants on both
 * src/api/agentWiring.js and src/api/activeAgentWiring.js remain intact.
 *
 * These tests are deliberately additive and non-brittle: they check behavioral
 * invariants (prohibited entities absent, restricted entities not preferred,
 * SessionSummary before Conversation) rather than exact counts or shapes, so
 * they survive additive wiring changes without needing to be updated.
 *
 * Invariants checked:
 *   1. All expected named exports exist in both files.
 *   2. No system-prohibited entity appears in any active wiring config.
 *   3. No companion-prohibited entity appears in the AI Companion wiring.
 *   4. Restricted entities (CBT: MoodEntry, CompanionMemory, CaseFormulation,
 *      Conversation; Companion: Goal, SessionSummary, Conversation) are never
 *      marked access_level "preferred".
 *   5. SessionSummary always appears before Conversation (lower source_order)
 *      when both are present, for both agents.
 *   6. ACTIVE_AGENT_WIRINGS map contains exactly "cbt_therapist" and "ai_companion".
 *   7. Each active wiring object has a non-empty name and non-empty tool_configs.
 *
 * Source of truth: docs/ai-agent-enforcement-spec.md, docs/ai-agent-access-policy.md
 */

import { describe, it, expect } from 'vitest';
import {
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
  CBT_THERAPIST_WIRING_STEP_2,
  AI_COMPANION_WIRING_STEP_2,
  CBT_THERAPIST_WIRING_STEP_3,
  AI_COMPANION_WIRING_STEP_3,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_AGENT_WIRINGS,
} from '../../src/api/activeAgentWiring.js';

// ─── POLICY CONSTANTS (mirrors docs/ai-agent-enforcement-spec.md) ─────────────

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

// Additional private user entities that must never appear in shared retrieval.
const PRIVATE_USER_ENTITIES = [
  'ThoughtJournal',  // private to CBT agent only
  'CaseFormulation', // restricted (CBT caution-layer), prohibited for Companion
  'CompanionMemory', // private user entity (restricted for CBT)
  'MoodEntry',       // private user entity (restricted for CBT)
];

// Entities that are restricted for the CBT Therapist: must not be "preferred".
const CBT_RESTRICTED = ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation'];

// Entities that are prohibited entirely for the AI Companion.
const COMPANION_PROHIBITED = ['ThoughtJournal', 'CoachingSession', 'CaseFormulation'];

// Entities restricted for AI Companion: must not be "preferred".
const COMPANION_RESTRICTED = ['Goal', 'SessionSummary', 'Conversation'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function entityNames(wiring) {
  return (wiring?.tool_configs || []).map((tc) => tc.entity_name);
}

function findEntity(wiring, name) {
  return (wiring?.tool_configs || []).find((tc) => tc.entity_name === name);
}

function sourceOrderOf(wiring, name) {
  return findEntity(wiring, name)?.source_order ?? Infinity;
}

// ─── TESTS — Export existence ─────────────────────────────────────────────────

describe('agentWiring.js — all named exports exist', () => {
  it('CBT_THERAPIST_WIRING_STEP_1 is exported and defined', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1).toBeDefined();
  });

  it('AI_COMPANION_WIRING_STEP_1 is exported and defined', () => {
    expect(AI_COMPANION_WIRING_STEP_1).toBeDefined();
  });

  it('CBT_THERAPIST_WIRING_STEP_2 is exported and defined', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2).toBeDefined();
  });

  it('AI_COMPANION_WIRING_STEP_2 is exported and defined', () => {
    expect(AI_COMPANION_WIRING_STEP_2).toBeDefined();
  });

  it('CBT_THERAPIST_WIRING_STEP_3 is exported and defined', () => {
    expect(CBT_THERAPIST_WIRING_STEP_3).toBeDefined();
  });

  it('AI_COMPANION_WIRING_STEP_3 is exported and defined', () => {
    expect(AI_COMPANION_WIRING_STEP_3).toBeDefined();
  });

  it('CBT_THERAPIST_WIRING_HYBRID is exported and defined', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID).toBeDefined();
  });

  it('AI_COMPANION_WIRING_HYBRID is exported and defined', () => {
    expect(AI_COMPANION_WIRING_HYBRID).toBeDefined();
  });
});

describe('activeAgentWiring.js — all named exports exist', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is exported and defined', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBeDefined();
  });

  it('ACTIVE_AI_COMPANION_WIRING is exported and defined', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBeDefined();
  });

  it('ACTIVE_AGENT_WIRINGS is exported and defined', () => {
    expect(ACTIVE_AGENT_WIRINGS).toBeDefined();
  });

  it('ACTIVE_AGENT_WIRINGS has exactly two keys: cbt_therapist and ai_companion', () => {
    const keys = Object.keys(ACTIVE_AGENT_WIRINGS);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('cbt_therapist');
    expect(keys).toContain('ai_companion');
  });
});

// ─── TESTS — Wiring object structure ─────────────────────────────────────────

describe('active wiring objects — structural integrity', () => {
  const wirings = [
    { label: 'ACTIVE_CBT_THERAPIST_WIRING', wiring: ACTIVE_CBT_THERAPIST_WIRING, expectedName: 'cbt_therapist' },
    { label: 'ACTIVE_AI_COMPANION_WIRING', wiring: ACTIVE_AI_COMPANION_WIRING, expectedName: 'ai_companion' },
  ];

  for (const { label, wiring, expectedName } of wirings) {
    it(`${label} has a non-empty name field equal to "${expectedName}"`, () => {
      expect(wiring.name).toBe(expectedName);
    });

    it(`${label} has a non-empty tool_configs array`, () => {
      expect(Array.isArray(wiring.tool_configs)).toBe(true);
      expect(wiring.tool_configs.length).toBeGreaterThan(0);
    });

    it(`${label} — every tool_config entry has entity_name, access_level, and source_order`, () => {
      for (const tc of wiring.tool_configs) {
        expect(tc.entity_name, 'entity_name missing').toBeTruthy();
        expect(tc.access_level, `access_level missing for ${tc.entity_name}`).toBeTruthy();
        expect(typeof tc.source_order, `source_order missing for ${tc.entity_name}`).toBe('number');
      }
    });
  }
});

// ─── TESTS — System-prohibited entities absent ────────────────────────────────

describe('active wiring — no system-prohibited entities present', () => {
  const allActiveWirings = [
    { label: 'CBT Therapist (active)', wiring: ACTIVE_CBT_THERAPIST_WIRING },
    { label: 'AI Companion (active)', wiring: ACTIVE_AI_COMPANION_WIRING },
  ];

  for (const { label, wiring } of allActiveWirings) {
    for (const prohibited of SYSTEM_PROHIBITED) {
      it(`${label} does not include system-prohibited entity "${prohibited}"`, () => {
        expect(entityNames(wiring)).not.toContain(prohibited);
      });
    }
  }
});

// ─── TESTS — Companion-prohibited entities absent from AI Companion ───────────

describe('AI Companion active wiring — companion-prohibited entities absent', () => {
  for (const prohibited of COMPANION_PROHIBITED) {
    it(`AI Companion active wiring does not include companion-prohibited entity "${prohibited}"`, () => {
      expect(entityNames(ACTIVE_AI_COMPANION_WIRING)).not.toContain(prohibited);
    });
  }
});

// ─── TESTS — Restricted entities are not marked "preferred" ──────────────────

describe('CBT Therapist active wiring — restricted entities are not preferred', () => {
  for (const restricted of CBT_RESTRICTED) {
    it(`CBT restricted entity "${restricted}" is not marked access_level "preferred"`, () => {
      const entity = findEntity(ACTIVE_CBT_THERAPIST_WIRING, restricted);
      if (entity) {
        expect(entity.access_level).not.toBe('preferred');
      }
      // If the entity is absent entirely, the constraint is trivially satisfied.
    });
  }
});

describe('AI Companion active wiring — restricted entities are not preferred', () => {
  for (const restricted of COMPANION_RESTRICTED) {
    it(`Companion restricted entity "${restricted}" is not marked access_level "preferred"`, () => {
      const entity = findEntity(ACTIVE_AI_COMPANION_WIRING, restricted);
      if (entity) {
        expect(entity.access_level).not.toBe('preferred');
      }
    });
  }
});

// ─── TESTS — Conversation must never be preferred (any wiring) ───────────────

describe('Conversation must never be marked "preferred" in any wiring', () => {
  const allWirings = [
    { label: 'CBT Step 3', wiring: CBT_THERAPIST_WIRING_STEP_3 },
    { label: 'CBT Hybrid', wiring: CBT_THERAPIST_WIRING_HYBRID },
    { label: 'AI Companion Step 3', wiring: AI_COMPANION_WIRING_STEP_3 },
    { label: 'AI Companion Hybrid', wiring: AI_COMPANION_WIRING_HYBRID },
    { label: 'Active CBT', wiring: ACTIVE_CBT_THERAPIST_WIRING },
    { label: 'Active AI Companion', wiring: ACTIVE_AI_COMPANION_WIRING },
  ];

  for (const { label, wiring } of allWirings) {
    it(`${label}: Conversation is not marked "preferred"`, () => {
      const conv = findEntity(wiring, 'Conversation');
      if (conv) {
        expect(conv.access_level).not.toBe('preferred');
      }
    });
  }
});

// ─── TESTS — SessionSummary precedes Conversation (ordering invariant) ────────

describe('Ordering invariant — SessionSummary must precede Conversation when both are present', () => {
  const wiringsWithBoth = [
    { label: 'CBT Therapist Hybrid', wiring: CBT_THERAPIST_WIRING_HYBRID },
    { label: 'AI Companion Hybrid', wiring: AI_COMPANION_WIRING_HYBRID },
    { label: 'Active CBT Therapist', wiring: ACTIVE_CBT_THERAPIST_WIRING },
    { label: 'Active AI Companion', wiring: ACTIVE_AI_COMPANION_WIRING },
  ];

  for (const { label, wiring } of wiringsWithBoth) {
    it(`${label}: SessionSummary source_order < Conversation source_order when both present`, () => {
      const hasConversation = entityNames(wiring).includes('Conversation');
      const hasSessionSummary = entityNames(wiring).includes('SessionSummary');

      if (hasConversation && hasSessionSummary) {
        const summaryOrder = sourceOrderOf(wiring, 'SessionSummary');
        const convOrder = sourceOrderOf(wiring, 'Conversation');
        expect(summaryOrder).toBeLessThan(convOrder);
      }
      // If one or both are absent, the constraint doesn't apply.
    });
  }
});

// ─── TESTS — CaseFormulation must never be unrestricted ──────────────────────

describe('CaseFormulation must never be configured as unrestricted', () => {
  const allActiveWirings = [
    { label: 'Active CBT Therapist', wiring: ACTIVE_CBT_THERAPIST_WIRING },
    { label: 'Active AI Companion', wiring: ACTIVE_AI_COMPANION_WIRING },
  ];

  for (const { label, wiring } of allActiveWirings) {
    it(`${label}: CaseFormulation.unrestricted is not true`, () => {
      const cf = findEntity(wiring, 'CaseFormulation');
      if (cf) {
        expect(cf.unrestricted).not.toBe(true);
      }
    });
  }
});

// ─── TESTS — ACTIVE_AGENT_WIRINGS map integrity ───────────────────────────────

describe('ACTIVE_AGENT_WIRINGS map — runtime lookup integrity', () => {
  it('ACTIVE_AGENT_WIRINGS["cbt_therapist"] is the same object as ACTIVE_CBT_THERAPIST_WIRING', () => {
    expect(ACTIVE_AGENT_WIRINGS['cbt_therapist']).toBe(ACTIVE_CBT_THERAPIST_WIRING);
  });

  it('ACTIVE_AGENT_WIRINGS["ai_companion"] is the same object as ACTIVE_AI_COMPANION_WIRING', () => {
    expect(ACTIVE_AGENT_WIRINGS['ai_companion']).toBe(ACTIVE_AI_COMPANION_WIRING);
  });

  it('ACTIVE_AGENT_WIRINGS has no extra keys beyond the two expected agents', () => {
    const unexpectedKeys = Object.keys(ACTIVE_AGENT_WIRINGS).filter(
      (k) => k !== 'cbt_therapist' && k !== 'ai_companion'
    );
    expect(unexpectedKeys).toHaveLength(0);
  });
});

// ─── TESTS — All step wirings pass basic integrity checks ─────────────────────

describe('All step wirings — basic structural integrity', () => {
  const allStepWirings = [
    { label: 'CBT Step 1', wiring: CBT_THERAPIST_WIRING_STEP_1 },
    { label: 'AI Companion Step 1', wiring: AI_COMPANION_WIRING_STEP_1 },
    { label: 'CBT Step 2', wiring: CBT_THERAPIST_WIRING_STEP_2 },
    { label: 'AI Companion Step 2', wiring: AI_COMPANION_WIRING_STEP_2 },
    { label: 'CBT Step 3', wiring: CBT_THERAPIST_WIRING_STEP_3 },
    { label: 'AI Companion Step 3', wiring: AI_COMPANION_WIRING_STEP_3 },
    { label: 'CBT Hybrid', wiring: CBT_THERAPIST_WIRING_HYBRID },
    { label: 'AI Companion Hybrid', wiring: AI_COMPANION_WIRING_HYBRID },
  ];

  for (const { label, wiring } of allStepWirings) {
    it(`${label}: has a name and non-empty tool_configs`, () => {
      expect(wiring.name).toBeTruthy();
      expect(Array.isArray(wiring.tool_configs)).toBe(true);
      expect(wiring.tool_configs.length).toBeGreaterThan(0);
    });

    it(`${label}: no system-prohibited entities present`, () => {
      for (const prohibited of SYSTEM_PROHIBITED) {
        expect(entityNames(wiring)).not.toContain(prohibited);
      }
    });
  }
});
