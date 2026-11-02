/**
 * DoD6D — Explicit enforcement for "Not for AI Knowledge" entities.
 *
 * Prohibited entities must NEVER appear in any agent's tool_configs.
 * Source of truth: docs/ai-entity-classification.md
 *
 * Usage (HTTP):
 *   POST /validateAgentEntityAccess
 *   Body: { "name": "my_agent", "tool_configs": [...] }
 *   Response 200: { "valid": true, "agent": "my_agent" }
 *   Response 400: { "valid": false, "agent": "my_agent", "violations": [...] }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PROHIBITED_ENTITIES = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

/**
 * Validates a single agent config object.
 * @param {object} agentConfig - must contain at least { name, tool_configs }
 * @returns {{ valid: boolean, agent: string, violations: string[] }}
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

  const agentConfig = await req.json();
  const result = validateAgentConfig(agentConfig);

  if (!result.valid) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result, { status: 200 });
});