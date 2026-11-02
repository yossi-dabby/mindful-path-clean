import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * @file base44/functions/retrieveTherapistMemory/entry.ts
 *
 * Therapist Upgrade — Phase 1 — Structured Therapist Memory Read Function
 *
 * Retrieves structured therapist memory records for the authenticated user,
 * filtering only records that carry the Phase 1 version marker.  Returns them
 * as a structured array suitable for future session-start context injection.
 *
 * ACTIVATION
 * ----------
 * Gated by the THERAPIST_UPGRADE_MEMORY_ENABLED environment variable.
 * When the flag is not 'true', returns an empty memory set with gated: true
 * and HTTP 200 (not an error — the session simply starts without context).
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Session start must NEVER be blocked by memory retrieval failure.
 * - If the flag is off → return { memories: [], gated: true } (HTTP 200)
 * - If the entity fetch errors → return { memories: [], error: '...' } (HTTP 200)
 * - If a record cannot be parsed → skip it; continue returning the rest
 * - Any uncaught error → return { memories: [], error: '...' } (HTTP 200)
 * The caller must treat any error or empty result as "start with no context".
 *
 * PRIVACY
 * -------
 * - Reads only the authenticated user's own CompanionMemory records.
 * - Filters records using the version marker so only therapist-structured
 *   records are returned — standard companion memory records are excluded.
 * - No cross-user data access.  CompanionMemory is private per-user.
 *
 * PHASE 1 CONSTRAINT — NOT AUTO-CALLED
 * -------------------------------------
 * This function is NOT wired to any session-start automation in Phase 1.
 * It establishes the read surface and validates the retrieval contract.
 * Active session-start wiring is introduced in a later phase when
 * CBT_THERAPIST_WIRING_STAGE2_V1 becomes the active wiring config.
 *
 * OUTPUT (always HTTP 200)
 * -------
 * {
 *   memories: TherapistMemoryRecord[],  // Parsed and filtered records
 *   count:    number,                   // Length of memories array
 *   source:   'therapist_structured',   // Constant for caller identification
 *   gated?:   true,                     // Present when flag is off
 *   error?:   string,                   // Present when retrieval failed
 * }
 *
 * See docs/therapist-upgrade-stage2-plan.md — Task 1.2 for full context.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const THERAPIST_MEMORY_VERSION_KEY = 'therapist_memory_version';
const THERAPIST_MEMORY_VERSION = '1';
const THERAPIST_MEMORY_FLAG_ENV = 'THERAPIST_UPGRADE_MEMORY_ENABLED';

/**
 * How many raw CompanionMemory records to fetch before filtering.
 * We fetch more than the max to account for non-therapist records.
 */
const FETCH_LIMIT = 50;

/**
 * Maximum number of therapist memory records to return per request.
 *
 * Must be >= LTS_SESSION_RECORDS_FETCH_CAP (currently 20, defined in
 * src/lib/sessionEndSummarization.js) so that the Wave 3B LTS write path
 * actually receives the full intended 20-record build window.
 *
 * FETCH_LIMIT (50) is always larger, so increasing this value does not
 * require any change to the raw CompanionMemory fetch.
 */
const MAX_MEMORIES = 20;

// ─── Structured response constants ───────────────────────────────────────────

const SOURCE = 'therapist_structured';

// ─── Runtime-authority gate ───────────────────────────────────────────────────

/**
 * Returns true when the memory-read gate is open.
 *
 * When THERAPIST_RUNTIME_APPLY_ENABLED === 'true' (runtime-authority mode),
 * requires BOTH VITE_THERAPIST_UPGRADE_ENABLED and
 * VITE_THERAPIST_UPGRADE_MEMORY_ENABLED to be exactly 'true'.
 *
 * Otherwise preserves the exact legacy gate:
 * THERAPIST_UPGRADE_MEMORY_ENABLED === 'true'.
 */
function isRetrieveTherapistMemoryEnabled(
  readEnv: (name: string) => string | undefined,
): boolean {
  if (readEnv('THERAPIST_RUNTIME_APPLY_ENABLED') === 'true') {
    return (
      readEnv('VITE_THERAPIST_UPGRADE_ENABLED') === 'true' &&
      readEnv('VITE_THERAPIST_UPGRADE_MEMORY_ENABLED') === 'true'
    );
  }
  return readEnv('THERAPIST_UPGRADE_MEMORY_ENABLED') === 'true';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── Gate: runtime-authority-aware memory-read gate ─────────────────────────
  // Fail-open: return empty memories (not an error) when gate is closed.
  const flagEnabled = isRetrieveTherapistMemoryEnabled((name) => Deno.env.get(name));
  if (!flagEnabled) {
    return Response.json({
      memories: [],
      count: 0,
      source: SOURCE,
      gated: true,
    });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      // Fail-open for auth failure — return empty with error note
      return Response.json({
        memories: [],
        count: 0,
        source: SOURCE,
        error: 'Unauthorized — session starting with empty memory context.',
      });
    }

    // ── Fetch CompanionMemory records ─────────────────────────────────────────────
    // content is typed as unknown because the Base44 SDK may return JSON-string
    // fields as already-parsed objects at runtime (observed in normalizeAgentMessage
    // and other Deno functions).  The parsing step handles both shapes safely.
    let rawRecords: Array<{ id: string; content?: unknown }> = [];
    try {
      rawRecords = await base44.entities.CompanionMemory.filter(
        { created_by: user.email },
        '-created_date',
        FETCH_LIMIT,
      );
    } catch (fetchError) {
      // Fail-open: entity fetch error — return empty memories
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.warn('[retrieveTherapistMemory] Fetch failed, returning empty context:', message);
      return Response.json({
        memories: [],
        count: 0,
        source: SOURCE,
        error: 'Memory retrieval unavailable — session starting with empty context.',
      });
    }

    // ── Filter and parse therapist-structured records ───────────────────────────────────────────
    const memories: object[] = [];
    for (const raw of rawRecords) {
      if (memories.length >= MAX_MEMORIES) {
        break;
      }
      if (!raw.content) {
        continue;
      }
      try {
        // The Base44 SDK may return the content field as either a JSON string
        // (requires JSON.parse) or as an already-parsed object (SDK auto-parses
        // fields whose stored value is valid JSON).  Handle both shapes so the
        // write→read round-trip succeeds regardless of which form the SDK returns.
        let parsed: unknown;
        if (typeof raw.content === 'string') {
          parsed = JSON.parse(raw.content);
        } else {
          // Already a parsed object — use directly without JSON.parse
          parsed = raw.content;
        }
        // Only include records that carry the Phase 1 version marker
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          (parsed as Record<string, unknown>)[THERAPIST_MEMORY_VERSION_KEY] === THERAPIST_MEMORY_VERSION
        ) {
          // Attach the CompanionMemory record ID for reference (e.g. deduplication)
          memories.push({ ...(parsed as Record<string, unknown>), _memory_id: raw.id });
        }
      } catch (_parseError) {
        // Skip unparseable records — do not block retrieval of valid records
        continue;
      }
    }

    return Response.json({
      memories,
      count: memories.length,
      source: SOURCE,
    });

  } catch (error) {
    // ── Fail-open: any unexpected error must not block session start ───────────
    const message = error instanceof Error ? error.message : String(error);
    console.error('[retrieveTherapistMemory] Unexpected error:', message);
    return Response.json({
      memories: [],
      count: 0,
      source: SOURCE,
      error: `Memory retrieval failed: ${message}`,
    });
  }
});