/**
 * @file test/utils/companionRoutingConsistency.test.js
 *
 * Companion Routing Consistency — test suite.
 *
 * Verifies that ACTIVE_AI_COMPANION_WIRING (with its tool_configs) is the
 * single, consistent wiring source used across ALL companion entry points,
 * including the CoachingSessionWizard which previously bypassed tool_configs.
 *
 * Covers:
 *   A. All companion wiring configs export a non-empty tool_configs array
 *   B. ACTIVE_AI_COMPANION_WIRING.tool_configs is always safe to forward
 *   C. resolveCompanionWiring() defaults to HYBRID when all flags are off
 *   D. V2 (continuity) routing — shape and flag coverage
 *   E. Entity policy compliance — no prohibited entities in any companion wiring
 *   F. Role isolation — companion wiring never resembles therapist wiring
 *   G. No memory leakage — private user entities excluded from all companion configs
 *   H. Regression — therapist wiring unaffected by companion upgrade flags
 */

import { describe, it, expect } from 'vitest';
import {
  AI_COMPANION_WIRING_HYBRID,
  AI_COMPANION_WIRING_UPGRADE_V1,
  AI_COMPANION_WIRING_UPGRADE_V2,
} from '../../src/api/agentWiring.js';
import {
  resolveCompanionWiring,
  resolveTherapistWiring,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

// Entities the companion must never access (policy / privacy rules)
const COMPANION_PROHIBITED = [
  'ThoughtJournal',
  'CoachingSession',
  'CaseFormulation',
];

// Private user entities that must never appear in shared retrieval pipelines
const PRIVATE_USER_ENTITIES = [
  'ThoughtJournal',
  'Conversation',   // allowed only under caution_layer / secondary_only
  'CaseFormulation',
  'UserDeletedConversations',
];

function entityNames(wiring) {
  return wiring.tool_configs.map((tc) => tc.entity_name);
}

// ─── A. All companion wiring configs export a non-empty tool_configs array ───

describe('A. All companion wiring configs export a non-empty tool_configs array', () => {
  const ALL_COMPANION_WIRINGS = [
    ['AI_COMPANION_WIRING_HYBRID', AI_COMPANION_WIRING_HYBRID],
    ['AI_COMPANION_WIRING_UPGRADE_V1', AI_COMPANION_WIRING_UPGRADE_V1],
    ['AI_COMPANION_WIRING_UPGRADE_V2', AI_COMPANION_WIRING_UPGRADE_V2],
  ];

  for (const [label, wiring] of ALL_COMPANION_WIRINGS) {
    it(`${label} has a tool_configs array`, () => {
      expect(Array.isArray(wiring.tool_configs)).toBe(true);
    });

    it(`${label} tool_configs is non-empty`, () => {
      expect(wiring.tool_configs.length).toBeGreaterThan(0);
    });

    it(`${label} name is "ai_companion"`, () => {
      expect(wiring.name).toBe('ai_companion');
    });
  }
});

// ─── B. ACTIVE_AI_COMPANION_WIRING.tool_configs is always safe to forward ────

describe('B. ACTIVE_AI_COMPANION_WIRING.tool_configs safe for all entry points', () => {
  it('ACTIVE_AI_COMPANION_WIRING has a tool_configs array', () => {
    expect(Array.isArray(ACTIVE_AI_COMPANION_WIRING.tool_configs)).toBe(true);
  });

  it('ACTIVE_AI_COMPANION_WIRING.tool_configs is non-empty', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.tool_configs.length).toBeGreaterThan(0);
  });

  it('ACTIVE_AI_COMPANION_WIRING.name is "ai_companion"', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.name).toBe('ai_companion');
  });

  it('all tool_configs entries have entity_name and access_level', () => {
    for (const tc of ACTIVE_AI_COMPANION_WIRING.tool_configs) {
      expect(typeof tc.entity_name).toBe('string');
      expect(tc.entity_name.length).toBeGreaterThan(0);
      expect(typeof tc.access_level).toBe('string');
    }
  });

  it('tool_configs can be JSON-serialised (safe to pass over API boundary)', () => {
    expect(() => JSON.stringify(ACTIVE_AI_COMPANION_WIRING.tool_configs)).not.toThrow();
  });

  it('all three companion wiring configs produce serialisable tool_configs', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      expect(() => JSON.stringify(wiring.tool_configs)).not.toThrow();
    }
  });
});

// ─── C. resolveCompanionWiring() defaults to HYBRID when flags are off ────────

describe('C. resolveCompanionWiring() defaults to HYBRID (all flags off)', () => {
  it('returns AI_COMPANION_WIRING_HYBRID when all flags are off', () => {
    expect(resolveCompanionWiring()).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('result has name "ai_companion"', () => {
    expect(resolveCompanionWiring().name).toBe('ai_companion');
  });

  it('result has tool_configs array', () => {
    expect(Array.isArray(resolveCompanionWiring().tool_configs)).toBe(true);
  });

  it('ACTIVE_AI_COMPANION_WIRING equals AI_COMPANION_WIRING_HYBRID by default', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('does not have companion_upgrade flag when HYBRID is active', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.companion_upgrade).toBeUndefined();
  });

  it('does not have warmth_enabled when HYBRID is active', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.warmth_enabled).toBeUndefined();
  });

  it('does not have continuity_enabled when HYBRID is active', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.continuity_enabled).toBeUndefined();
  });
});

// ─── D. V2 (continuity) wiring — shape and flag coverage ─────────────────────

describe('D. AI_COMPANION_WIRING_UPGRADE_V2 shape and continuity flags', () => {
  it('has continuity_enabled: true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.continuity_enabled).toBe(true);
  });

  it('has warmth_enabled: true (inherits from V1)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.warmth_enabled).toBe(true);
  });

  it('has companion_upgrade: true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.companion_upgrade).toBe(true);
  });

  it('has companion_upgrade_phase: 3', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.companion_upgrade_phase).toBe(3);
  });

  it('V2 companion_upgrade_phase is greater than V1', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.companion_upgrade_phase).toBeGreaterThan(
      AI_COMPANION_WIRING_UPGRADE_V1.companion_upgrade_phase,
    );
  });

  it('V2 does not have stage2 flag (not a therapist upgrade)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.stage2).toBeUndefined();
  });

  it('V2 does not have memory_context_injection (therapist-only flag)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.memory_context_injection).toBeUndefined();
  });

  it('V2 does not have workflow_engine_enabled (therapist-only flag)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.workflow_engine_enabled).toBeUndefined();
  });

  it('V2 includes CompanionMemory at source_order 1', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.find(
      (t) => t.entity_name === 'CompanionMemory',
    );
    expect(tc).toBeDefined();
    expect(tc.source_order).toBe(1);
  });

  it('V2 includes MoodEntry at source_order 2', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.find(
      (t) => t.entity_name === 'MoodEntry',
    );
    expect(tc).toBeDefined();
    expect(tc.source_order).toBe(2);
  });

  it('V2 includes SessionSummary with continuity_check_only: true', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.find(
      (t) => t.entity_name === 'SessionSummary',
    );
    expect(tc).toBeDefined();
    expect(tc.continuity_check_only).toBe(true);
  });

  it('V2 tool_configs has the same entity set as V1', () => {
    const v1Names = new Set(AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.map((t) => t.entity_name));
    const v2Names = new Set(AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.map((t) => t.entity_name));
    expect([...v1Names].sort()).toEqual([...v2Names].sort());
  });
});

// ─── E. Entity policy compliance — no prohibited entities ─────────────────────

describe('E. Entity policy: prohibited entities absent from all companion wirings', () => {
  const ALL = [
    ['HYBRID', AI_COMPANION_WIRING_HYBRID],
    ['UPGRADE_V1', AI_COMPANION_WIRING_UPGRADE_V1],
    ['UPGRADE_V2', AI_COMPANION_WIRING_UPGRADE_V2],
  ];

  for (const [label, wiring] of ALL) {
    for (const entity of SYSTEM_PROHIBITED) {
      it(`${label} does not include system-prohibited entity: ${entity}`, () => {
        expect(entityNames(wiring)).not.toContain(entity);
      });
    }

    for (const entity of COMPANION_PROHIBITED) {
      it(`${label} does not include companion-prohibited entity: ${entity}`, () => {
        expect(entityNames(wiring)).not.toContain(entity);
      });
    }
  }
});

// ─── F. Role isolation — companion wiring never resembles therapist wiring ────

describe('F. Role isolation: companion vs. therapist wiring boundaries', () => {
  it('AI_COMPANION_WIRING_HYBRID.name is "ai_companion", not "cbt_therapist"', () => {
    expect(AI_COMPANION_WIRING_HYBRID.name).toBe('ai_companion');
  });

  it('AI_COMPANION_WIRING_UPGRADE_V1.name is "ai_companion"', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.name).toBe('ai_companion');
  });

  it('AI_COMPANION_WIRING_UPGRADE_V2.name is "ai_companion"', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.name).toBe('ai_companion');
  });

  it('ACTIVE_AI_COMPANION_WIRING.name differs from ACTIVE_CBT_THERAPIST_WIRING.name', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.name).not.toBe(ACTIVE_CBT_THERAPIST_WIRING.name);
  });

  it('companion wirings do not include ThoughtJournal (therapist-only entity)', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      expect(entityNames(wiring)).not.toContain('ThoughtJournal');
    }
  });

  it('companion wirings do not include CaseFormulation (therapist-only entity)', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      expect(entityNames(wiring)).not.toContain('CaseFormulation');
    }
  });

  it('companion wirings do not include CoachingSession entity', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      expect(entityNames(wiring)).not.toContain('CoachingSession');
    }
  });
});

// ─── G. No memory leakage — private user entities excluded ───────────────────

describe('G. No unsafe memory leakage: private user entities excluded or caution-gated', () => {
  const PRIVATE_NON_CONVERSATION = PRIVATE_USER_ENTITIES.filter((e) => e !== 'Conversation');

  for (const entity of PRIVATE_NON_CONVERSATION) {
    it(`AI_COMPANION_WIRING_HYBRID excludes private entity: ${entity}`, () => {
      expect(entityNames(AI_COMPANION_WIRING_HYBRID)).not.toContain(entity);
    });

    it(`AI_COMPANION_WIRING_UPGRADE_V1 excludes private entity: ${entity}`, () => {
      expect(entityNames(AI_COMPANION_WIRING_UPGRADE_V1)).not.toContain(entity);
    });

    it(`AI_COMPANION_WIRING_UPGRADE_V2 excludes private entity: ${entity}`, () => {
      expect(entityNames(AI_COMPANION_WIRING_UPGRADE_V2)).not.toContain(entity);
    });
  }

  it('Conversation in HYBRID is caution-gated (secondary_only + caution_layer)', () => {
    const tc = AI_COMPANION_WIRING_HYBRID.tool_configs.find(
      (t) => t.entity_name === 'Conversation',
    );
    // Conversation may or may not be present; if present it must be caution-gated
    if (tc) {
      expect(tc.secondary_only).toBe(true);
      expect(tc.caution_layer).toBe(true);
    }
  });

  it('Conversation in UPGRADE_V2 is caution-gated (secondary_only + caution_layer)', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.find(
      (t) => t.entity_name === 'Conversation',
    );
    if (tc) {
      expect(tc.secondary_only).toBe(true);
      expect(tc.caution_layer).toBe(true);
    }
  });

  it('CompanionMemory use_for_clinical_reasoning is false in all companion wirings', () => {
    for (const wiring of [
      AI_COMPANION_WIRING_HYBRID,
      AI_COMPANION_WIRING_UPGRADE_V1,
      AI_COMPANION_WIRING_UPGRADE_V2,
    ]) {
      const tc = wiring.tool_configs.find((t) => t.entity_name === 'CompanionMemory');
      if (tc && 'use_for_clinical_reasoning' in tc) {
        expect(tc.use_for_clinical_reasoning).toBe(false);
      }
    }
  });
});

// ─── H. Regression — therapist wiring unaffected by companion upgrade ─────────

describe('H. Regression: therapist wiring is unaffected by companion upgrade flags', () => {
  it('resolveTherapistWiring() returns wiring with name "cbt_therapist"', () => {
    expect(resolveTherapistWiring().name).toBe('cbt_therapist');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING.name is "cbt_therapist"', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have companion_upgrade flag', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.companion_upgrade).toBeUndefined();
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have warmth_enabled flag', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.warmth_enabled).toBeUndefined();
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have continuity_enabled (companion flag)', () => {
    // continuity_enabled on companion wiring is companion-scoped; therapist wiring
    // uses a different continuity mechanism (V7 / continuity_layer_enabled)
    expect(ACTIVE_CBT_THERAPIST_WIRING.continuity_enabled).toBeUndefined();
  });

  it('therapist wiring does not include CompanionMemory as a preferred entity', () => {
    const tc = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.find(
      (t) => t.entity_name === 'CompanionMemory' && t.access_level === 'preferred',
    );
    expect(tc).toBeUndefined();
  });
});
