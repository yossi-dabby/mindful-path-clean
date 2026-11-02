import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const THERAPIST_RUNTIME_FLAG_SCHEMA = 'therapist-runtime-flags-v1';

// Capability flags read from VITE_* environment variables (frontend build-time mirrors).
const THERAPIST_RUNTIME_FLAG_ENV_MAP = Object.freeze({
  THERAPIST_UPGRADE_ENABLED: 'VITE_THERAPIST_UPGRADE_ENABLED',
  THERAPIST_UPGRADE_MEMORY_ENABLED: 'VITE_THERAPIST_UPGRADE_MEMORY_ENABLED',
  THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: 'VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED',
  THERAPIST_UPGRADE_WORKFLOW_ENABLED: 'VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED',
  THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED: 'VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
  THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED: 'VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
  THERAPIST_UPGRADE_SAFETY_MODE_ENABLED: 'VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
  THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED: 'VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
  THERAPIST_UPGRADE_FORMULATION_LED_ENABLED: 'VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED',
  THERAPIST_UPGRADE_CONTINUITY_ENABLED: 'VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED',
  THERAPIST_UPGRADE_STRATEGY_ENABLED: 'VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED',
  THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: 'VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
  THERAPIST_UPGRADE_KNOWLEDGE_ENABLED: 'VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
  THERAPIST_UPGRADE_COMPETENCE_ENABLED: 'VITE_THERAPIST_UPGRADE_COMPETENCE_ENABLED',
  THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED: 'VITE_THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
  CONTEXT_COMPOSER_V2_ENABLED: 'VITE_CONTEXT_COMPOSER_V2_ENABLED',
  CHAT_ORCHESTRATOR_V2_ENABLED: 'VITE_CHAT_ORCHESTRATOR_V2_ENABLED',
});

// Phase 0.2A — backend-only control-plane switches.
// These are NOT frontend build-time flags — they MUST NOT use the VITE_ prefix.
// They are read directly from the Deno runtime environment (Base44 Secrets).
// Strict semantics: only the string literal 'true' resolves to true.
const THERAPIST_RUNTIME_CONTROL_PLANE_ENV_MAP = Object.freeze({
  THERAPIST_RUNTIME_APPLY_ENABLED: 'THERAPIST_RUNTIME_APPLY_ENABLED',
});

function toStrictBoolean(rawValue: string | undefined | null): boolean {
  return rawValue === 'true';
}

function buildTherapistRuntimeFlagSnapshot(
  readEnv: (name: string) => string | undefined,
): Readonly<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};
  for (const [flagName, envName] of Object.entries(THERAPIST_RUNTIME_FLAG_ENV_MAP)) {
    flags[flagName] = toStrictBoolean(readEnv(envName));
  }
  // Phase 0.2A — append control-plane switches (independent of VITE_ flags).
  for (const [flagName, envName] of Object.entries(THERAPIST_RUNTIME_CONTROL_PLANE_ENV_MAP)) {
    flags[flagName] = toStrictBoolean(readEnv(envName));
  }
  return Object.freeze(flags);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const flags = buildTherapistRuntimeFlagSnapshot((envName) => Deno.env.get(envName));

  return Response.json({
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    flags,
    generated_at: new Date().toISOString(),
  });
});
