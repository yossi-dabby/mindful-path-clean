/**
 * validateAgentPolicy — Additive enforcement of the AI Agent Enforcement Spec.
 *
 * Validates agent configurations against the policy defined in
 * docs/ai-agent-enforcement-spec.md (Section F). This is an additive-only
 * validator: it never modifies runtime behaviour for working agents.
 *
 * Supported agent names (case-insensitive):
 *   "cbt_therapist"   or  "CBT Therapist"
 *   "ai_companion"    or  "AI Companion"
 *
 * Usage (HTTP):
 *   POST /validateAgentPolicy
 *   Body: {
 *     "name": "cbt_therapist",
 *     "tool_configs": [
 *       {
 *         "entity_name": "ThoughtJournal",
 *         "access_level": "preferred",   // "preferred"|"allowed"|"restricted"
 *         "source_order": 3,             // 1-based integer; omit if not ordered
 *         "use_for_clinical_reasoning": false   // CompanionMemory only
 *       },
 *       ...
 *     ]
 *   }
 *   Response 200: { "valid": true,  "agent": "<name>", "violations": [] }
 *   Response 400: { "valid": false, "agent": "<name>", "violations": ["..."] }
 *
 * Source of truth: docs/ai-agent-enforcement-spec.md
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Policy constants ────────────────────────────────────────────────────────

/** Entities that must never appear in any agent's tool_configs. */
const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

/** Entities whose access_level must never be "preferred" for CBT Therapist. */
const CBT_RESTRICTED = ['MoodEntry', 'CompanionMemory', 'CaseFormulation', 'Conversation'];

/** Entities that are prohibited for the AI Companion (beyond the four above). */
const COMPANION_PROHIBITED = ['ThoughtJournal', 'CoachingSession', 'CaseFormulation'];

/** Entities whose access_level must never be "preferred" for AI Companion. */
const COMPANION_RESTRICTED = ['Goal', 'SessionSummary', 'Conversation'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise an agent name to a canonical key. */
function agentKey(name: string): 'cbt_therapist' | 'ai_companion' | null {
  const n = name.toLowerCase().replace(/[\s-]+/g, '_');
  if (n === 'cbt_therapist') return 'cbt_therapist';
  if (n === 'ai_companion') return 'ai_companion';
  return null;
}

/**
 * Look up the source_order for a named entity in a tool_configs array.
 * Returns Infinity when the entity is absent (not loaded).
 */
function sourceOrder(toolConfigs: ToolConfig[], entityName: string): number {
  const tc = toolConfigs.find((t) => t.entity_name === entityName);
  return tc?.source_order ?? Infinity;
}

interface ToolConfig {
  entity_name: string;
  access_level?: string;
  source_order?: number;
  use_for_clinical_reasoning?: boolean;
  unrestricted?: boolean;
  caution_layer?: boolean;
  secondary_only?: boolean;
  read_only?: boolean;
  calibration_only?: boolean;
  reference_only?: boolean;
  continuity_check_only?: boolean;
}

interface AgentConfig {
  name?: string;
  tool_configs?: ToolConfig[];
}

// ─── Validation logic ─────────────────────────────────────────────────────────

/**
 * Core validator — pure function, no I/O.
 *
 * @param agentConfig  Raw parsed request body.
 * @returns            Result object with `valid`, `agent`, and `violations`.
 */
export function validateAgentPolicy(agentConfig: AgentConfig): {
  valid: boolean;
  agent: string;
  violations: string[];
} {
  const agentName = agentConfig?.name || 'unknown';
  const toolConfigs: ToolConfig[] = agentConfig?.tool_configs || [];
  const violations: string[] = [];

  const key = agentKey(agentName);

  // ── Check 1: System-prohibited entities blocked for all agents ──────────────
  for (const tc of toolConfigs) {
    if (SYSTEM_PROHIBITED.includes(tc.entity_name)) {
      violations.push(
        `Agent "${agentName}" includes system-prohibited entity "${tc.entity_name}" ` +
          `(must be absent from all tool access lists per enforcement spec §E).`
      );
    }
  }

  // ── Agent-specific checks ───────────────────────────────────────────────────
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

    // Check 3: Conversation must not appear before SessionSummary in source order
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
    // Check 5: Agent-specific prohibited entities for AI Companion
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

    // Check 7: Conversation must not be preferred over SessionSummary in source order
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

  // ── Cross-agent checks (apply when agent is known) ──────────────────────────
  if (key !== null) {
    // Check 9: Conversation must not be preferred over SessionSummary (both agents)
    //          Already covered per-agent above; re-state for unknown/both case.

    // Check 10: CaseFormulation must not be unrestricted for either agent
    const cf = toolConfigs.find((t) => t.entity_name === 'CaseFormulation');
    if (cf && cf.unrestricted === true && key !== 'cbt_therapist') {
      // cbt_therapist case already handled above
      violations.push(
        `Agent "${agentName}": "CaseFormulation" must not be configured as unrestricted ` +
          `(enforcement spec §F — Both agents).`
      );
    }

    // ── Hybrid caution-layer checks ──────────────────────────────────────────
    const cautionEntities = toolConfigs.filter((t) => t.caution_layer === true);
    const v1Entities = toolConfigs.filter((t) => !t.caution_layer);

    // Check H1: Caution-layer entities must be lower priority than all V1 sources.
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

    // Check H2: Conversation must never be marked preferred.
    const convEntry = toolConfigs.find((t) => t.entity_name === 'Conversation');
    if (convEntry && convEntry.access_level === 'preferred') {
      violations.push(
        `Agent "${agentName}": "Conversation" must never be marked "preferred" — ` +
          `hybrid model requires Conversation to be secondary-only (caution layer).`
      );
    }

    // Check H3: Any caution-layer entity must not be marked preferred.
    for (const ct of cautionEntities) {
      if (ct.access_level === 'preferred') {
        violations.push(
          `Agent "${agentName}": caution-layer entity "${ct.entity_name}" must not be ` +
            `marked "preferred" — caution-layer sources are secondary augmentation only.`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    agent: agentName,
    violations,
  };
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  // Require authenticated user — any role may run validation.
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agentConfig: AgentConfig = await req.json();
  const result = validateAgentPolicy(agentConfig);

  return Response.json(result, { status: result.valid ? 200 : 400 });
});
