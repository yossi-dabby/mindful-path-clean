/**
 * Tests for the hybrid agent wiring defined in src/api/agentWiring.js.
 *
 * Validates that both hybrid wiring configs:
 *   1. Preserve all V1 (Steps 1–3) entities with source priority intact.
 *   2. Place caution-layer entities below every V1 source.
 *   3. Never mark Conversation as preferred.
 *   4. Never configure CaseFormulation as unrestricted.
 *   5. Keep CaseFormulation prohibited for AI Companion (no clinical reasoning).
 *   6. Pass the full policy validator including hybrid caution checks.
 *   7. Leave all Step 1, Step 2, and Step 3 exports unchanged (regression guard).
 *
 * Source of truth: docs/ai-agent-hybrid-model.md, docs/ai-agent-enforcement-spec.md
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

// ─── Inline policy validator (mirrors functions/validateAgentPolicy.ts) ────────
// Includes both V1 checks (Checks 1–10) and hybrid caution checks (H1–H3).

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];
const CBT_RESTRICTED = ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation'];
const COMPANION_PROHIBITED = ['ThoughtJournal', 'CoachingSession', 'CaseFormulation'];
const COMPANION_RESTRICTED = ['Goal', 'SessionSummary', 'Conversation'];
const CAUTION_LAYER_ENTITIES = ['CaseFormulation', 'Conversation'];

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

  // Check 1: System-prohibited entities blocked for all agents
  for (const tc of toolConfigs) {
    if (SYSTEM_PROHIBITED.includes(tc.entity_name)) {
      violations.push(
        `Agent "${agentName}" includes system-prohibited entity "${tc.entity_name}" ` +
          `(must be absent from all tool access lists per enforcement spec §E).`
      );
    }
  }

  if (key === 'cbt_therapist') {
    // Check 2: Restricted entities must not be marked preferred
    for (const tc of toolConfigs) {
      if (CBT_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(
          `CBT Therapist: "${tc.entity_name}" is a restricted entity and must not be ` +
            `marked "preferred" (enforcement spec §F — CBT Therapist).`
        );
      }
    }

    // Check 3: Conversation must not appear before SessionSummary
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

    // Check 6: Restricted entities must not be marked preferred
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

    // Check 8: CompanionMemory must not be flagged for clinical reasoning
    const cm = toolConfigs.find((t) => t.entity_name === 'CompanionMemory');
    if (cm && cm.use_for_clinical_reasoning === true) {
      violations.push(
        `AI Companion: "CompanionMemory" must not be used for clinical reasoning. ` +
          `It drives personalization and tone only (enforcement spec §F — AI Companion).`
      );
    }
  }

  if (key !== null) {
    // Check 10: CaseFormulation must not be unrestricted for either agent
    const cf = toolConfigs.find((t) => t.entity_name === 'CaseFormulation');
    if (cf && cf.unrestricted === true && key !== 'cbt_therapist') {
      violations.push(
        `Agent "${agentName}": "CaseFormulation" must not be configured as unrestricted ` +
          `(enforcement spec §F — Both agents).`
      );
    }

    // ── Hybrid caution-layer checks ──────────────────────────────────────────
    const cautionEntities = toolConfigs.filter((t) => t.caution_layer === true);
    const v1Entities = toolConfigs.filter((t) => !t.caution_layer);

    // Check H1: Caution-layer entities must be lower priority than all V1 sources
    if (cautionEntities.length > 0 && v1Entities.length > 0) {
      const maxV1Order = Math.max(...v1Entities.map((t) => t.source_order ?? 0));
      for (const ct of cautionEntities) {
        if ((ct.source_order ?? Infinity) <= maxV1Order) {
          violations.push(
            `Agent "${agentName}": caution-layer entity "${ct.entity_name}" ` +
              `(source_order ${ct.source_order}) must be lower priority than all V1 sources ` +
              `(max V1 source_order: ${maxV1Order}) — hybrid model guardrail.`
          );
        }
      }
    }

    // Check H2: Conversation must never be marked preferred
    const convEntry = toolConfigs.find((t) => t.entity_name === 'Conversation');
    if (convEntry && convEntry.access_level === 'preferred') {
      violations.push(
        `Agent "${agentName}": "Conversation" must never be marked "preferred" — ` +
          `hybrid model requires Conversation to be secondary-only (caution layer).`
      );
    }

    // Check H3: Caution-layer entities must not be marked preferred
    for (const ct of cautionEntities) {
      if (ct.access_level === 'preferred') {
        violations.push(
          `Agent "${agentName}": caution-layer entity "${ct.entity_name}" must not be ` +
            `marked "preferred" — caution-layer sources are secondary augmentation only.`
        );
      }
    }
  }

  return { valid: violations.length === 0, agent: key, violations };
}

function entityNames(wiring) {
  return (wiring?.tool_configs || []).map((tc) => tc.entity_name);
}

function findEntity(wiring, name) {
  return (wiring?.tool_configs || []).find((tc) => tc.entity_name === name);
}

// ─── CBT Therapist Hybrid — policy compliance ─────────────────────────────────

describe('Hybrid — CBT Therapist passes policy validation', () => {
  it('passes the full policy validator including hybrid caution checks', () => {
    const result = validateAgentPolicy(CBT_THERAPIST_WIRING_HYBRID);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('agent name resolves to cbt_therapist', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_HYBRID).agent).toBe('cbt_therapist');
  });
});

// ─── CBT Therapist Hybrid — entity count ─────────────────────────────────────

describe('Hybrid — CBT Therapist entity count', () => {
  it('has exactly twelve entities (ten V1 + two caution-layer)', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.tool_configs).toHaveLength(12);
  });
});

// ─── CBT Therapist Hybrid — V1 source priority intact ────────────────────────

describe('Hybrid — CBT Therapist V1 source priority is intact', () => {
  const v1Expected = [
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

  for (const { entity_name, access_level, source_order: order } of v1Expected) {
    it(`"${entity_name}" — access_level: ${access_level}, source_order: ${order} (unchanged from V1)`, () => {
      const entity = findEntity(CBT_THERAPIST_WIRING_HYBRID, entity_name);
      expect(entity, `${entity_name} should be present`).toBeDefined();
      expect(entity.access_level).toBe(access_level);
      expect(entity.source_order).toBe(order);
    });
  }
});

// ─── CBT Therapist Hybrid — caution-layer source ordering ────────────────────

describe('Hybrid — CBT Therapist caution-layer sources are lower priority than all V1 sources', () => {
  const maxV1SourceOrder = 11; // MoodEntry at 11 is the last V1 entity

  it('CaseFormulation source_order is above max V1 source_order', () => {
    const entity = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(entity).toBeDefined();
    expect(entity.source_order).toBeGreaterThan(maxV1SourceOrder);
  });

  it('Conversation source_order is above max V1 source_order', () => {
    const entity = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(entity).toBeDefined();
    expect(entity.source_order).toBeGreaterThan(maxV1SourceOrder);
  });

  it('Conversation source_order is above CaseFormulation source_order (Conversation is last resort)', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(conv.source_order).toBeGreaterThan(cf.source_order);
  });

  it('caution-layer entities all have source_order greater than every V1 entity', () => {
    const cautionEntities = CBT_THERAPIST_WIRING_HYBRID.tool_configs.filter(
      (t) => t.caution_layer === true
    );
    const v1Entities = CBT_THERAPIST_WIRING_HYBRID.tool_configs.filter(
      (t) => !t.caution_layer
    );
    const maxV1 = Math.max(...v1Entities.map((t) => t.source_order));
    for (const ct of cautionEntities) {
      expect(ct.source_order).toBeGreaterThan(maxV1);
    }
  });

  it('entities are listed in ascending source_order', () => {
    const orders = CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((tc) => tc.source_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

// ─── CBT Therapist Hybrid — Conversation never preferred ─────────────────────

describe('Hybrid — CBT Therapist: Conversation is never preferred', () => {
  it('Conversation access_level is not "preferred"', () => {
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(conv).toBeDefined();
    expect(conv.access_level).not.toBe('preferred');
  });

  it('Conversation access_level is "restricted" (secondary augmentation only)', () => {
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(conv.access_level).toBe('restricted');
  });

  it('Conversation has secondary_only: true', () => {
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(conv.secondary_only).toBe(true);
  });

  it('Conversation has caution_layer: true', () => {
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    expect(conv.caution_layer).toBe(true);
  });

  it('Conversation appears after SessionSummary in source order', () => {
    const conv = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation');
    const summary = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'SessionSummary');
    expect(conv.source_order).toBeGreaterThan(summary.source_order);
  });
});

// ─── CBT Therapist Hybrid — CaseFormulation is never unrestricted ─────────────

describe('Hybrid — CBT Therapist: CaseFormulation is never unrestricted', () => {
  it('CaseFormulation access_level is "restricted" (not preferred or allowed)', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(cf).toBeDefined();
    expect(cf.access_level).toBe('restricted');
  });

  it('CaseFormulation has unrestricted: false', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(cf.unrestricted).toBe(false);
  });

  it('CaseFormulation has read_only: true (non-dominant context)', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(cf.read_only).toBe(true);
  });

  it('CaseFormulation has secondary_only: true', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(cf.secondary_only).toBe(true);
  });

  it('CaseFormulation has caution_layer: true', () => {
    const cf = findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation');
    expect(cf.caution_layer).toBe(true);
  });
});

// ─── CBT Therapist Hybrid — system-prohibited entity exclusion ────────────────

describe('Hybrid — CBT Therapist excludes all system-prohibited entities', () => {
  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(CBT_THERAPIST_WIRING_HYBRID)).not.toContain(name);
    });
  }
});

// ─── AI Companion Hybrid — policy compliance ──────────────────────────────────

describe('Hybrid — AI Companion passes policy validation', () => {
  it('passes the full policy validator including hybrid caution checks', () => {
    const result = validateAgentPolicy(AI_COMPANION_WIRING_HYBRID);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('agent name resolves to ai_companion', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_HYBRID).agent).toBe('ai_companion');
  });
});

// ─── AI Companion Hybrid — entity count ──────────────────────────────────────

describe('Hybrid — AI Companion entity count', () => {
  it('has exactly nine entities (eight V1 + one caution-layer)', () => {
    expect(AI_COMPANION_WIRING_HYBRID.tool_configs).toHaveLength(9);
  });
});

// ─── AI Companion Hybrid — V1 source priority intact ─────────────────────────

describe('Hybrid — AI Companion V1 source priority is intact', () => {
  const v1Expected = [
    { entity_name: 'CompanionMemory', access_level: 'preferred',  source_order: 1 },
    { entity_name: 'MoodEntry',       access_level: 'preferred',  source_order: 2 },
    { entity_name: 'Exercise',        access_level: 'allowed',    source_order: 3 },
    { entity_name: 'Resource',        access_level: 'allowed',    source_order: 4 },
    { entity_name: 'AudioContent',    access_level: 'allowed',    source_order: 5 },
    { entity_name: 'Journey',         access_level: 'allowed',    source_order: 6 },
    { entity_name: 'Goal',            access_level: 'restricted', source_order: 7 },
    { entity_name: 'SessionSummary',  access_level: 'restricted', source_order: 8 },
  ];

  for (const { entity_name, access_level, source_order: order } of v1Expected) {
    it(`"${entity_name}" — access_level: ${access_level}, source_order: ${order} (unchanged from V1)`, () => {
      const entity = findEntity(AI_COMPANION_WIRING_HYBRID, entity_name);
      expect(entity, `${entity_name} should be present`).toBeDefined();
      expect(entity.access_level).toBe(access_level);
      expect(entity.source_order).toBe(order);
    });
  }
});

// ─── AI Companion Hybrid — caution-layer source ordering ─────────────────────

describe('Hybrid — AI Companion caution-layer sources are lower priority than all V1 sources', () => {
  const maxV1SourceOrder = 8; // SessionSummary at 8 is the last V1 entity

  it('Conversation source_order is above max V1 source_order', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    expect(conv).toBeDefined();
    expect(conv.source_order).toBeGreaterThan(maxV1SourceOrder);
  });

  it('caution-layer entities all have source_order greater than every V1 entity', () => {
    const cautionEntities = AI_COMPANION_WIRING_HYBRID.tool_configs.filter(
      (t) => t.caution_layer === true
    );
    const v1Entities = AI_COMPANION_WIRING_HYBRID.tool_configs.filter(
      (t) => !t.caution_layer
    );
    const maxV1 = Math.max(...v1Entities.map((t) => t.source_order));
    for (const ct of cautionEntities) {
      expect(ct.source_order).toBeGreaterThan(maxV1);
    }
  });

  it('entities are listed in ascending source_order', () => {
    const orders = AI_COMPANION_WIRING_HYBRID.tool_configs.map((tc) => tc.source_order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

// ─── AI Companion Hybrid — Conversation never preferred ──────────────────────

describe('Hybrid — AI Companion: Conversation is never preferred', () => {
  it('Conversation access_level is not "preferred"', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    expect(conv).toBeDefined();
    expect(conv.access_level).not.toBe('preferred');
  });

  it('Conversation access_level is "restricted" (secondary augmentation only)', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    expect(conv.access_level).toBe('restricted');
  });

  it('Conversation has secondary_only: true', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    expect(conv.secondary_only).toBe(true);
  });

  it('Conversation has caution_layer: true', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    expect(conv.caution_layer).toBe(true);
  });

  it('Conversation appears after SessionSummary (CompanionMemory/MoodEntry remain preferred)', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    const summary = findEntity(AI_COMPANION_WIRING_HYBRID, 'SessionSummary');
    expect(conv.source_order).toBeGreaterThan(summary.source_order);
  });

  it('Conversation appears after CompanionMemory', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    const cm = findEntity(AI_COMPANION_WIRING_HYBRID, 'CompanionMemory');
    expect(conv.source_order).toBeGreaterThan(cm.source_order);
  });

  it('Conversation appears after MoodEntry', () => {
    const conv = findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation');
    const mood = findEntity(AI_COMPANION_WIRING_HYBRID, 'MoodEntry');
    expect(conv.source_order).toBeGreaterThan(mood.source_order);
  });
});

// ─── AI Companion Hybrid — CaseFormulation remains prohibited ─────────────────

describe('Hybrid — AI Companion: CaseFormulation is not used for clinical reasoning (remains prohibited)', () => {
  it('does not include CaseFormulation (remains prohibited per enforcement spec §E)', () => {
    expect(entityNames(AI_COMPANION_WIRING_HYBRID)).not.toContain('CaseFormulation');
  });

  it('policy validator rejects AI Companion with CaseFormulation', () => {
    const invalid = {
      name: 'ai_companion',
      tool_configs: [
        ...AI_COMPANION_WIRING_HYBRID.tool_configs,
        { entity_name: 'CaseFormulation', access_level: 'restricted', source_order: 99 },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('CaseFormulation'))).toBe(true);
  });
});

// ─── AI Companion Hybrid — CompanionMemory remains non-clinical ───────────────

describe('Hybrid — AI Companion: CompanionMemory remains non-clinical', () => {
  it('CompanionMemory has use_for_clinical_reasoning: false', () => {
    const cm = findEntity(AI_COMPANION_WIRING_HYBRID, 'CompanionMemory');
    expect(cm?.use_for_clinical_reasoning).toBe(false);
  });

  it('CompanionMemory is still source_order 1 (highest priority)', () => {
    const cm = findEntity(AI_COMPANION_WIRING_HYBRID, 'CompanionMemory');
    expect(cm?.source_order).toBe(1);
  });
});

// ─── AI Companion Hybrid — system and companion-prohibited entity exclusion ───

describe('Hybrid — AI Companion excludes all system-prohibited entities', () => {
  for (const name of SYSTEM_PROHIBITED) {
    it(`does not include system-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_HYBRID)).not.toContain(name);
    });
  }
});

describe('Hybrid — AI Companion excludes companion-prohibited entities', () => {
  for (const name of COMPANION_PROHIBITED) {
    it(`does not include companion-prohibited entity "${name}"`, () => {
      expect(entityNames(AI_COMPANION_WIRING_HYBRID)).not.toContain(name);
    });
  }
});

// ─── Hybrid validator checks — Check H1 (caution priority order) ──────────────

describe('Hybrid validator — H1: caution entity before V1 entity is rejected', () => {
  it('CBT: caution entity at source_order 1 (before all V1) fails validation', () => {
    const invalid = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary',  access_level: 'preferred',  source_order: 2 },
        { entity_name: 'ThoughtJournal',  access_level: 'preferred',  source_order: 3 },
        {
          entity_name: 'Conversation',
          access_level: 'restricted',
          source_order: 1, // violates: before all V1 sources
          caution_layer: true,
          secondary_only: true,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('caution-layer entity'))).toBe(true);
  });

  it('Companion: caution entity at source_order 1 (before CompanionMemory) fails validation', () => {
    const invalid = {
      name: 'ai_companion',
      tool_configs: [
        {
          entity_name: 'CompanionMemory',
          access_level: 'preferred',
          source_order: 2,
          use_for_clinical_reasoning: false,
        },
        { entity_name: 'MoodEntry', access_level: 'preferred', source_order: 3 },
        {
          entity_name: 'Conversation',
          access_level: 'restricted',
          source_order: 1, // violates: before all V1 sources
          caution_layer: true,
          secondary_only: true,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('caution-layer entity'))).toBe(true);
  });
});

// ─── Hybrid validator checks — Check H2 (Conversation never preferred) ────────

describe('Hybrid validator — H2: Conversation marked preferred is rejected', () => {
  it('CBT: Conversation with access_level "preferred" fails validation', () => {
    const invalid = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 2 },
        {
          entity_name: 'Conversation',
          access_level: 'preferred', // violates H2 and Check 2
          source_order: 99,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Conversation'))).toBe(true);
  });

  it('Companion: Conversation with access_level "preferred" fails validation', () => {
    const invalid = {
      name: 'ai_companion',
      tool_configs: [
        {
          entity_name: 'CompanionMemory',
          access_level: 'preferred',
          source_order: 1,
          use_for_clinical_reasoning: false,
        },
        { entity_name: 'MoodEntry', access_level: 'preferred', source_order: 2 },
        {
          entity_name: 'Conversation',
          access_level: 'preferred', // violates H2 and Check 6
          source_order: 99,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Conversation'))).toBe(true);
  });
});

// ─── Hybrid validator checks — Check H3 (caution entity never preferred) ──────

describe('Hybrid validator — H3: caution-layer entity marked preferred is rejected', () => {
  it('CBT: CaseFormulation with caution_layer:true and access_level "preferred" fails', () => {
    const invalid = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 2 },
        {
          entity_name: 'CaseFormulation',
          access_level: 'preferred', // violates H3 (and Check 2)
          source_order: 99,
          caution_layer: true,
          unrestricted: false,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('CaseFormulation'))).toBe(true);
  });
});

// ─── Hybrid validator checks — CaseFormulation unrestricted always rejected ───

describe('Hybrid validator — CaseFormulation unrestricted is always rejected', () => {
  it('CBT: CaseFormulation with unrestricted:true fails validation (Check 4)', () => {
    const invalid = {
      name: 'cbt_therapist',
      tool_configs: [
        { entity_name: 'SessionSummary', access_level: 'preferred', source_order: 2 },
        {
          entity_name: 'CaseFormulation',
          access_level: 'restricted',
          source_order: 99,
          unrestricted: true, // violates Check 4
          caution_layer: true,
        },
      ],
    };
    const result = validateAgentPolicy(invalid);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('CaseFormulation'))).toBe(true);
  });
});

// ─── Regression: all V1 Step 1–3 exports are unchanged ───────────────────────

describe('Hybrid — V1 Step 1 exports are unaltered (regression guard)', () => {
  it('CBT Therapist Step 1 still has exactly four entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1.tool_configs).toHaveLength(4);
  });

  it('AI Companion Step 1 still has exactly two entities', () => {
    expect(AI_COMPANION_WIRING_STEP_1.tool_configs).toHaveLength(2);
  });

  it('CBT Step 1 still passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_1).valid).toBe(true);
  });

  it('AI Companion Step 1 still passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_1).valid).toBe(true);
  });
});

describe('Hybrid — V1 Step 2 exports are unaltered (regression guard)', () => {
  it('CBT Therapist Step 2 still has exactly eight entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2.tool_configs).toHaveLength(8);
  });

  it('AI Companion Step 2 still has exactly six entities', () => {
    expect(AI_COMPANION_WIRING_STEP_2.tool_configs).toHaveLength(6);
  });

  it('CBT Step 2 still passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_2).valid).toBe(true);
  });

  it('AI Companion Step 2 still passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_2).valid).toBe(true);
  });
});

describe('Hybrid — V1 Step 3 exports are unaltered (regression guard)', () => {
  it('CBT Therapist Step 3 still has exactly ten entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_3.tool_configs).toHaveLength(10);
  });

  it('AI Companion Step 3 still has exactly eight entities', () => {
    expect(AI_COMPANION_WIRING_STEP_3.tool_configs).toHaveLength(8);
  });

  it('CBT Step 3 still passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_3).valid).toBe(true);
  });

  it('AI Companion Step 3 still passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_3).valid).toBe(true);
  });

  it('CBT Step 3 does not contain caution-layer entities (V1 baseline is caution-free)', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).not.toContain('CaseFormulation');
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).not.toContain('Conversation');
  });

  it('AI Companion Step 3 does not contain caution-layer entities (V1 baseline is caution-free)', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_3)).not.toContain('Conversation');
    expect(entityNames(AI_COMPANION_WIRING_STEP_3)).not.toContain('CaseFormulation');
  });
});

// ─── Cross-agent: both hybrid configs exclude all system-prohibited entities ──

describe('Hybrid — all hybrid configs exclude system-prohibited entities', () => {
  const ALL_HYBRID = [
    ['CBT_THERAPIST_WIRING_HYBRID', CBT_THERAPIST_WIRING_HYBRID],
    ['AI_COMPANION_WIRING_HYBRID',  AI_COMPANION_WIRING_HYBRID],
  ];

  for (const [exportName, config] of ALL_HYBRID) {
    for (const prohibited of SYSTEM_PROHIBITED) {
      it(`${exportName} does not include "${prohibited}"`, () => {
        expect(entityNames(config)).not.toContain(prohibited);
      });
    }
  }
});

// ─── Caution-layer entity flags on hybrid configs ─────────────────────────────

describe('Hybrid — all caution-layer entities carry caution_layer: true flag', () => {
  it('CBT CaseFormulation has caution_layer: true', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_HYBRID, 'CaseFormulation')?.caution_layer).toBe(true);
  });

  it('CBT Conversation has caution_layer: true', () => {
    expect(findEntity(CBT_THERAPIST_WIRING_HYBRID, 'Conversation')?.caution_layer).toBe(true);
  });

  it('Companion Conversation has caution_layer: true', () => {
    expect(findEntity(AI_COMPANION_WIRING_HYBRID, 'Conversation')?.caution_layer).toBe(true);
  });
});
