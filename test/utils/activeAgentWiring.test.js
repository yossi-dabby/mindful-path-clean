/**
 * Smoke tests for src/api/activeAgentWiring.js.
 *
 * Confirms that:
 *   1. The runtime selection points to the hybrid wiring for both agents.
 *   2. CBT Therapist uses CBT_THERAPIST_WIRING_HYBRID.
 *   3. AI Companion uses AI_COMPANION_WIRING_HYBRID.
 *   4. All V1 exports (Steps 1–3) still exist and are unchanged.
 *   5. All policy / validator checks pass for the active wiring.
 *
 * Source of truth: docs/ai-agent-hybrid-model.md, docs/ai-agent-enforcement-spec.md
 */

import { describe, it, expect } from 'vitest';
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_AGENT_WIRINGS,
} from '../../src/api/activeAgentWiring.js';
import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
  CBT_THERAPIST_WIRING_STEP_2,
  AI_COMPANION_WIRING_STEP_2,
  CBT_THERAPIST_WIRING_STEP_3,
  AI_COMPANION_WIRING_STEP_3,
} from '../../src/api/agentWiring.js';

// ─── Inline policy validator (mirrors functions/validateAgentPolicy.ts) ────────
// Includes V1 checks (1–10) and hybrid caution checks (H1–H3).

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
  const n = (name || '').toLowerCase().replace(/[\s-]+/g, '_');
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
      violations.push(`"${tc.entity_name}" is system-prohibited.`);
    }
  }

  if (key === 'cbt_therapist') {
    for (const tc of toolConfigs) {
      if (CBT_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(`CBT: "${tc.entity_name}" must not be preferred.`);
      }
    }
    const convOrder = sourceOrder(toolConfigs, 'Conversation');
    const summaryOrder = sourceOrder(toolConfigs, 'SessionSummary');
    if (convOrder !== Infinity && convOrder < summaryOrder) {
      violations.push(`CBT: Conversation must not precede SessionSummary.`);
    }
    const cf = toolConfigs.find((t) => t.entity_name === 'CaseFormulation');
    if (cf && cf.unrestricted === true) {
      violations.push(`CBT: CaseFormulation must not be unrestricted.`);
    }
  }

  if (key === 'ai_companion') {
    for (const tc of toolConfigs) {
      if (COMPANION_PROHIBITED.includes(tc.entity_name)) {
        violations.push(`AI Companion: "${tc.entity_name}" is prohibited.`);
      }
    }
    for (const tc of toolConfigs) {
      if (COMPANION_RESTRICTED.includes(tc.entity_name) && tc.access_level === 'preferred') {
        violations.push(`AI Companion: "${tc.entity_name}" must not be preferred.`);
      }
    }
    const convOrder = sourceOrder(toolConfigs, 'Conversation');
    const summaryOrder = sourceOrder(toolConfigs, 'SessionSummary');
    if (convOrder !== Infinity && convOrder < summaryOrder) {
      violations.push(`AI Companion: Conversation must not precede SessionSummary.`);
    }
    const cm = toolConfigs.find((t) => t.entity_name === 'CompanionMemory');
    if (cm && cm.use_for_clinical_reasoning === true) {
      violations.push(`AI Companion: CompanionMemory must not be used for clinical reasoning.`);
    }
  }

  if (key !== null) {
    const cautionEntities = toolConfigs.filter((t) => t.caution_layer === true);
    const v1Entities = toolConfigs.filter((t) => !t.caution_layer);
    if (cautionEntities.length > 0 && v1Entities.length > 0) {
      const maxV1Order = Math.max(...v1Entities.map((t) => t.source_order ?? 0));
      for (const ct of cautionEntities) {
        if ((ct.source_order ?? Infinity) <= maxV1Order) {
          violations.push(
            `"${ct.entity_name}" caution-layer entity must be below all V1 sources (H1).`
          );
        }
      }
    }
    const convEntry = toolConfigs.find((t) => t.entity_name === 'Conversation');
    if (convEntry && convEntry.access_level === 'preferred') {
      violations.push(`Conversation must never be preferred (H2).`);
    }
    for (const ct of cautionEntities) {
      if (ct.access_level === 'preferred') {
        violations.push(`Caution-layer "${ct.entity_name}" must not be preferred (H3).`);
      }
    }
  }

  return { valid: violations.length === 0, agent: key, violations };
}

// ─── Runtime selection — CBT Therapist ───────────────────────────────────────

describe('Active wiring — CBT Therapist is the hybrid export', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is the same object as CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AGENT_WIRINGS["cbt_therapist"] is the same object as CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_AGENT_WIRINGS['cbt_therapist']).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('active CBT wiring has agent name "cbt_therapist"', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
  });

  it('active CBT wiring has twelve entities (V1 + two caution-layer)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.tool_configs).toHaveLength(12);
  });

  it('active CBT wiring includes CaseFormulation (caution-layer)', () => {
    const names = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.map((tc) => tc.entity_name);
    expect(names).toContain('CaseFormulation');
  });

  it('active CBT wiring includes Conversation (caution-layer)', () => {
    const names = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.map((tc) => tc.entity_name);
    expect(names).toContain('Conversation');
  });
});

// ─── Runtime selection — AI Companion ────────────────────────────────────────

describe('Active wiring — AI Companion is the hybrid export', () => {
  it('ACTIVE_AI_COMPANION_WIRING is the same object as AI_COMPANION_WIRING_HYBRID', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('ACTIVE_AGENT_WIRINGS["ai_companion"] is the same object as AI_COMPANION_WIRING_HYBRID', () => {
    expect(ACTIVE_AGENT_WIRINGS['ai_companion']).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('active AI Companion wiring has agent name "ai_companion"', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.name).toBe('ai_companion');
  });

  it('active AI Companion wiring has nine entities (V1 + one caution-layer)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.tool_configs).toHaveLength(9);
  });

  it('active AI Companion wiring includes Conversation (caution-layer)', () => {
    const names = ACTIVE_AI_COMPANION_WIRING.tool_configs.map((tc) => tc.entity_name);
    expect(names).toContain('Conversation');
  });

  it('active AI Companion wiring does NOT include CaseFormulation (remains prohibited)', () => {
    const names = ACTIVE_AI_COMPANION_WIRING.tool_configs.map((tc) => tc.entity_name);
    expect(names).not.toContain('CaseFormulation');
  });
});

// ─── Policy compliance — active wiring passes validator ──────────────────────

describe('Active wiring — policy / validator checks pass', () => {
  it('active CBT Therapist wiring passes the full policy validator', () => {
    const result = validateAgentPolicy(ACTIVE_CBT_THERAPIST_WIRING);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('active AI Companion wiring passes the full policy validator', () => {
    const result = validateAgentPolicy(ACTIVE_AI_COMPANION_WIRING);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('active CBT Therapist — Conversation is never preferred', () => {
    const conv = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.find(
      (tc) => tc.entity_name === 'Conversation'
    );
    expect(conv?.access_level).not.toBe('preferred');
  });

  it('active AI Companion — Conversation is never preferred', () => {
    const conv = ACTIVE_AI_COMPANION_WIRING.tool_configs.find(
      (tc) => tc.entity_name === 'Conversation'
    );
    expect(conv?.access_level).not.toBe('preferred');
  });

  it('active CBT Therapist — CaseFormulation is never unrestricted', () => {
    const cf = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.find(
      (tc) => tc.entity_name === 'CaseFormulation'
    );
    expect(cf?.unrestricted).not.toBe(true);
  });
});

// ─── V1 exports still exist and are unchanged ─────────────────────────────────

describe('V1 exports — Step 1 still exists and is unchanged', () => {
  it('CBT Therapist Step 1 has exactly four entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_1.tool_configs).toHaveLength(4);
  });

  it('AI Companion Step 1 has exactly two entities', () => {
    expect(AI_COMPANION_WIRING_STEP_1.tool_configs).toHaveLength(2);
  });

  it('CBT Therapist Step 1 passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_1).valid).toBe(true);
  });

  it('AI Companion Step 1 passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_1).valid).toBe(true);
  });
});

describe('V1 exports — Step 2 still exists and is unchanged', () => {
  it('CBT Therapist Step 2 has exactly eight entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_2.tool_configs).toHaveLength(8);
  });

  it('AI Companion Step 2 has exactly six entities', () => {
    expect(AI_COMPANION_WIRING_STEP_2.tool_configs).toHaveLength(6);
  });

  it('CBT Therapist Step 2 passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_2).valid).toBe(true);
  });

  it('AI Companion Step 2 passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_2).valid).toBe(true);
  });
});

describe('V1 exports — Step 3 (canonical V1 baseline) still exists and is unchanged', () => {
  it('CBT Therapist Step 3 has exactly ten entities', () => {
    expect(CBT_THERAPIST_WIRING_STEP_3.tool_configs).toHaveLength(10);
  });

  it('AI Companion Step 3 has exactly eight entities', () => {
    expect(AI_COMPANION_WIRING_STEP_3.tool_configs).toHaveLength(8);
  });

  it('CBT Therapist Step 3 passes policy validation', () => {
    expect(validateAgentPolicy(CBT_THERAPIST_WIRING_STEP_3).valid).toBe(true);
  });

  it('AI Companion Step 3 passes policy validation', () => {
    expect(validateAgentPolicy(AI_COMPANION_WIRING_STEP_3).valid).toBe(true);
  });

  it('CBT Therapist Step 3 does not contain caution-layer entities (V1 baseline is caution-free)', () => {
    const names = CBT_THERAPIST_WIRING_STEP_3.tool_configs.map((tc) => tc.entity_name);
    expect(names).not.toContain('CaseFormulation');
    expect(names).not.toContain('Conversation');
  });

  it('AI Companion Step 3 does not contain caution-layer entities (V1 baseline is caution-free)', () => {
    const names = AI_COMPANION_WIRING_STEP_3.tool_configs.map((tc) => tc.entity_name);
    expect(names).not.toContain('CaseFormulation');
    expect(names).not.toContain('Conversation');
  });
});

// ─── V1 exports are distinct objects from active wiring (rollback-safe) ───────

describe('V1 exports — are distinct from the active hybrid exports', () => {
  it('CBT Step 3 is NOT the same object as the active CBT wiring', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STEP_3);
  });

  it('AI Companion Step 3 is NOT the same object as the active AI Companion wiring', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).not.toBe(AI_COMPANION_WIRING_STEP_3);
  });
});
