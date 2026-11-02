/**
 * adminRuntimeDiagnostic
 *
 * Admin-only backend diagnostic function.
 *
 * Returns a boolean-only runtime capability snapshot for the backend flags
 * that govern AI capabilities.  Each flag is evaluated using the EXACT same
 * semantics as the consuming backend function (=== 'true' string match).
 *
 * SAFETY RULES (non-negotiable):
 *   - Returns 403 Forbidden for any non-admin caller.
 *   - Never returns raw env var values, strings, hosts, keys, or credentials.
 *   - Never returns "secret exists" as a proxy for "enabled".
 *   - All booleans are derived exclusively from === 'true' exact string match.
 *   - Does NOT change any flag value, feature flag state, or agent behavior.
 *   - Does NOT enable or disable any backend capability.
 *   - No private user data, entity content, or PII is included.
 *
 * FLAGS REPORTED (backend env vars consumed by actual production functions):
 *   THERAPIST_UPGRADE_MEMORY_ENABLED
 *     → writeTherapistMemory, retrieveTherapistMemory
 *   THERAPIST_UPGRADE_SUMMARIZATION_ENABLED
 *     → generateSessionSummary
 *   THERAPIST_UPGRADE_LONGITUDINAL_ENABLED
 *     → writeLTSSnapshot
 *   THERAPIST_UPGRADE_ENABLED + THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED
 *     → validateTrustedSource, ingestTrustedDocument (both required)
 *   KNOWLEDGE_RETRIEVAL_ENABLED
 *     → retrieveRelevantContent
 *   KNOWLEDGE_INDEX_ENABLED
 *     → upsertKnowledgeIndex
 *
 * CONFIGURED-BUT-UNUSED SECRETS (documented; no new behavior added):
 *   THERAPIST_ADVANCED_MEMORY        — not consumed by any production function
 *   THERAPIST_SESSION_CONTINUITY     — not consumed by any production function
 *   THERAPIST_KNOWLEDGE_EXPANSION    — not consumed by any production function
 *
 * These names are searched in the entire repository and found in no production
 * code path.  This function acknowledges them as "configured_but_unused" but
 * does NOT read their values or create any behavior for them.
 *
 * DIAGNOSTIC VERSION: 1.0.1
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DIAGNOSTIC_VERSION = '1.0.1';

/**
 * Configured-but-unused secret names.
 * These env var names were searched across the entire repository and are NOT
 * consumed by any production code path.  They are acknowledged here for
 * documentation purposes only — no values are read, no behavior is created.
 */
const CONFIGURED_BUT_UNUSED_SECRET_NAMES = [
  'THERAPIST_ADVANCED_MEMORY',
  'THERAPIST_SESSION_CONTINUITY',
  'THERAPIST_KNOWLEDGE_EXPANSION',
];

Deno.serve(async (req) => {
  // ── Admin-only gate (fail-closed) ──────────────────────────────────────────
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 },
    );
  }

  // ── Read backend flags using exact === 'true' semantics ───────────────────
  //
  // Each flag is read using the exact env var name and the exact string
  // comparison used by its consuming backend function.  "Secret exists" is
  // NOT treated as equivalent to enabled.

  const therapist_master_backend_enabled =
    Deno.env.get('THERAPIST_UPGRADE_ENABLED') === 'true';

  const therapist_memory_backend_enabled =
    Deno.env.get('THERAPIST_UPGRADE_MEMORY_ENABLED') === 'true';

  const therapist_summarization_backend_enabled =
    Deno.env.get('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED') === 'true';

  const therapist_longitudinal_backend_enabled =
    Deno.env.get('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED') === 'true';

  // validateTrustedSource and ingestTrustedDocument require BOTH flags to be
  // exactly 'true'.  Either flag alone does not enable ingestion.
  const trusted_ingestion_backend_enabled =
    therapist_master_backend_enabled &&
    Deno.env.get('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED') === 'true';

  // retrieveRelevantContent — KNOWLEDGE_RETRIEVAL_ENABLED must be exactly 'true'.
  const knowledge_retrieval_backend_enabled =
    Deno.env.get('KNOWLEDGE_RETRIEVAL_ENABLED') === 'true';

  // upsertKnowledgeIndex — KNOWLEDGE_INDEX_ENABLED must be exactly 'true'.
  const knowledge_index_backend_enabled =
    Deno.env.get('KNOWLEDGE_INDEX_ENABLED') === 'true';

  // ── Secret UI diagnostic (read-only, three-state, never returns raw value) ───
  //
  // Classifies BASE44_SECRET_UI_DIAGNOSTIC into one of three non-boolean states
  // so the caller can distinguish "set correctly", "set incorrectly", and "absent".
  // The raw env var value is never returned, logged, or included in any output.
  const diagnosticSecretRaw =
    Deno.env.get('BASE44_SECRET_UI_DIAGNOSTIC');

  const base44_secret_ui_diagnostic =
    diagnosticSecretRaw === undefined
      ? 'missing'
      : diagnosticSecretRaw === 'diagnostic_true_2026'
        ? 'exact_match'
        : 'mismatch';

  // ── Snapshot assembly ─────────────────────────────────────────────────────
  const snapshot = {
    // Backend-derived boolean flags (no raw values, no credentials)
    therapist_memory_backend_enabled,
    therapist_summarization_backend_enabled,
    therapist_longitudinal_backend_enabled,
    trusted_ingestion_backend_enabled,
    knowledge_retrieval_backend_enabled,
    knowledge_index_backend_enabled,

    // Obsolete / configured-but-unused secret names (documented, not activated)
    configured_but_unused: CONFIGURED_BUT_UNUSED_SECRET_NAMES,

    // Secret UI diagnostic: three-state classification (never returns raw value)
    base44_secret_ui_diagnostic,

    diagnostic_version: DIAGNOSTIC_VERSION,
    generated_at: new Date().toISOString(),
  };

  return Response.json(snapshot);
});
