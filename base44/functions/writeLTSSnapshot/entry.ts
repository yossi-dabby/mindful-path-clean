import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * @file base44/functions/writeLTSSnapshot/entry.ts
 *
 * Therapist Upgrade — Wave 3B — Longitudinal Therapeutic State (LTS) Upsert
 *
 * Accepts a pre-built LTS record from the client-side Wave 3B write path and
 * upserts it into CompanionMemory as the single canonical LTS snapshot for the
 * authenticated user.
 *
 * UPSERT SEMANTICS ("latest valid wins")
 * ----------------------------------------
 * 1. Fetches the user's CompanionMemory records (bounded, newest-first).
 * 2. Finds the first record whose parsed content carries `memory_type='lts'`.
 * 3. If found  → updates that record's content with the new LTS JSON.
 * 4. If not found → creates a new CompanionMemory record.
 *
 * No old LTS records are deleted.  "Latest valid wins" is enforced at read
 * time (Wave 3C) by always taking the most recently created/updated record.
 *
 * ACTIVATION
 * ----------
 * Gated by THERAPIST_UPGRADE_LONGITUDINAL_ENABLED environment variable.
 * Returns 503 when the flag is not 'true'.  The Wave 3B client-side trigger
 * also requires THERAPIST_UPGRADE_SUMMARIZATION_ENABLED to be true before
 * invoking this function.
 *
 * PRIVACY
 * -------
 * - Only structured LTS signals are stored — never raw transcript content,
 *   user quotes, or session messages.
 * - CompanionMemory is a private per-user entity — no cross-user access.
 * - Record identification uses lts_version + memory_type markers only.
 * - The input record is validated against the LTS schema before storage.
 *
 * FAIL-SAFE
 * ---------
 * Write failures return a structured error response (success: false).
 * The caller (Wave 3B fire-and-forget trigger) discards errors non-blockingly.
 * The session memory write that preceded this call is never affected.
 *
 * INPUT (JSON body — the LTS record produced by buildLongitudinalState)
 * -----------------------------------------------------------------------
 * {
 *   lts_version:          string,   // Must equal '1'
 *   memory_type:          string,   // Must equal 'lts'
 *   session_count:        number,
 *   trajectory:           string,
 *   recurring_patterns:   string[],
 *   persistent_open_tasks: string[],
 *   active_goal_ids:      string[],
 *   helpful_interventions: string[],
 *   stalled_interventions: string[],
 *   risk_flag_history:    string[],
 *   last_session_date:    string,
 *   computed_at:          string,
 * }
 *
 * OUTPUT
 * ------
 * { success: true,  id: string, upserted: 'created' | 'updated' }
 * { success: false, error: string }
 * { success: false, error: string, gated: true }   — flag off (HTTP 503)
 * { success: false, error: string, invalid: true }  — bad input (HTTP 400)
 *
 * See Wave 3B problem statement for full context.
 */

// ─── LTS schema constants (mirrors src/lib/therapistMemoryModel.js LTS_* exports) ─
// Duplicated here because Deno functions cannot import browser/Node modules from src/.
// Keep in sync with therapistMemoryModel.js.

const LTS_VERSION = '1';
const LTS_MEMORY_TYPE = 'lts';
const LTS_FLAG_ENV = 'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED';

const LTS_ALLOWED_ARRAY_FIELDS: string[] = [
  'recurring_patterns',
  'persistent_open_tasks',
  'active_goal_ids',
  'helpful_interventions',
  'stalled_interventions',
  'risk_flag_history',
];

const LTS_ALLOWED_STRING_FIELDS: string[] = [
  'trajectory',
  'last_session_date',
  'computed_at',
];

const LTS_ARRAY_MAX = 8;
const LTS_STRING_MAX_CHARS = 64;
const LTS_TRAJECTORY_VALUES = new Set([
  'unknown',
  'insufficient_data',
  'progressing',
  'stable',
  'stagnating',
  'fluctuating',
]);

/**
 * How many CompanionMemory records to scan when looking for an existing LTS
 * record to update.  Small bound — LTS records are rare (at most one per user
 * in steady state).
 */
const LTS_UPSERT_SCAN_LIMIT = 10;

// ─── Input sanitizer ─────────────────────────────────────────────────────────

/**
 * Validates and sanitizes the incoming LTS record.
 *
 * Returns `null` if the record is not a valid LTS record (missing version or
 * memory_type markers).  Valid records are sanitized: array fields are capped
 * to LTS_ARRAY_MAX; string fields are truncated to LTS_STRING_MAX_CHARS;
 * trajectory must be a recognised value or defaults to 'unknown'; session_count
 * must be a non-negative integer.
 *
 * @param input - Raw request body (any shape)
 * @returns Sanitized LTS record or null if invalid.
 */
function sanitizeLTSRecord(
  input: Record<string, unknown>,
): Record<string, unknown> | null {
  // Must carry the correct version and type markers.
  if (
    typeof input['lts_version'] !== 'string' ||
    input['lts_version'] !== LTS_VERSION
  ) {
    return null;
  }
  if (
    typeof input['memory_type'] !== 'string' ||
    input['memory_type'] !== LTS_MEMORY_TYPE
  ) {
    return null;
  }

  const record: Record<string, unknown> = {
    lts_version: LTS_VERSION,
    memory_type: LTS_MEMORY_TYPE,
  };

  // session_count: non-negative integer.
  const rawCount = input['session_count'];
  record['session_count'] =
    typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0
      ? Math.floor(rawCount)
      : 0;

  // trajectory: must be a recognised bounded value.
  const rawTrajectory = input['trajectory'];
  record['trajectory'] =
    typeof rawTrajectory === 'string' && LTS_TRAJECTORY_VALUES.has(rawTrajectory)
      ? rawTrajectory
      : 'unknown';

  // String fields: bounded to LTS_STRING_MAX_CHARS.
  for (const field of LTS_ALLOWED_STRING_FIELDS) {
    if (field === 'trajectory') continue; // handled above
    const val = input[field];
    record[field] =
      typeof val === 'string' ? val.trim().slice(0, LTS_STRING_MAX_CHARS) : '';
  }

  // Array fields: keep only string items, cap to LTS_ARRAY_MAX.
  for (const field of LTS_ALLOWED_ARRAY_FIELDS) {
    const val = input[field];
    if (Array.isArray(val)) {
      const filtered: string[] = [];
      for (const item of val) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim().slice(0, LTS_STRING_MAX_CHARS);
        if (trimmed.length > 0) {
          filtered.push(trimmed);
        }
        if (filtered.length >= LTS_ARRAY_MAX) break;
      }
      record[field] = filtered;
    } else {
      record[field] = [];
    }
  }

  return record;
}

// ─── Runtime-authority gate ───────────────────────────────────────────────────

/**
 * Returns true when the LTS write gate is open.
 *
 * When THERAPIST_RUNTIME_APPLY_ENABLED === 'true' (runtime-authority mode),
 * requires ALL of VITE_THERAPIST_UPGRADE_ENABLED,
 * VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED, and
 * VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED to be exactly 'true'.
 *
 * Otherwise preserves the exact legacy gate:
 * THERAPIST_UPGRADE_LONGITUDINAL_ENABLED === 'true'.
 */
function isWriteLTSSnapshotEnabled(
  readEnv: (name: string) => string | undefined,
): boolean {
  if (readEnv('THERAPIST_RUNTIME_APPLY_ENABLED') === 'true') {
    return (
      readEnv('VITE_THERAPIST_UPGRADE_ENABLED') === 'true' &&
      readEnv('VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED') === 'true' &&
      readEnv('VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED') === 'true'
    );
  }
  return readEnv('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED') === 'true';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── Gate: runtime-authority-aware LTS write gate ───────────────────────────
  const flagEnabled = isWriteLTSSnapshotEnabled((name) => Deno.env.get(name));
  if (!flagEnabled) {
    return Response.json(
      {
        success: false,
        error:
          'LTS write path is not enabled (THERAPIST_UPGRADE_LONGITUDINAL_ENABLED is off).',
        gated: true,
      },
      { status: 503 },
    );
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse and validate input ──────────────────────────────────────────────
    let rawInput: Record<string, unknown>;
    try {
      rawInput = await req.json();
    } catch (_parseError) {
      return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const ltsRecord = sanitizeLTSRecord(rawInput);
    if (!ltsRecord) {
      return Response.json(
        {
          success: false,
          error:
            'Invalid LTS record: missing or incorrect lts_version / memory_type markers.',
          invalid: true,
        },
        { status: 400 },
      );
    }

    // ── Find existing LTS record for this user ────────────────────────────────
    // Scan only the user's existing outer memory_type='lts' records so an older
    // canonical snapshot is still found even after many newer therapist_session
    // writes. This preserves the one-snapshot-per-user upsert contract.
    let existingLTSId: string | null = null;
    try {
      const rawRecords = await base44.entities.CompanionMemory.filter(
        { created_by: user.email, memory_type: LTS_MEMORY_TYPE },
        '-created_date',
        LTS_UPSERT_SCAN_LIMIT,
      );
      for (const raw of rawRecords) {
        if (!raw?.content) continue;
        try {
          let parsed: unknown;
          if (typeof raw.content === 'string') {
            parsed = JSON.parse(raw.content);
          } else {
            parsed = raw.content;
          }
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            (parsed as Record<string, unknown>)['memory_type'] === LTS_MEMORY_TYPE &&
            (parsed as Record<string, unknown>)['lts_version'] === LTS_VERSION
          ) {
            existingLTSId = raw.id;
            break;
          }
        } catch (parseError) {
          // Skip unparseable records — log to aid debugging if records become malformed.
          const msg = parseError instanceof Error ? parseError.message : String(parseError);
          console.warn('[writeLTSSnapshot] Skipping unparseable CompanionMemory record:', msg);
          continue;
        }
      }
    } catch (_fetchError) {
      // If the scan fails, fall through to create a new record.
      // Prefer create over aborting the whole write.
      existingLTSId = null;
    }

    // ── Upsert the LTS record ─────────────────────────────────────────────────
    const contentString = JSON.stringify(ltsRecord);

    if (existingLTSId) {
      // Update the existing LTS record.
      await base44.entities.CompanionMemory.update(existingLTSId, {
        content: contentString,
      });
      return Response.json({
        success: true,
        id: existingLTSId,
        upserted: 'updated',
      });
    } else {
      // Create a new LTS record.
      const created = await base44.entities.CompanionMemory.create({
        memory_type: LTS_MEMORY_TYPE,
        content: contentString,
      });
      return Response.json({
        success: true,
        id: created.id,
        upserted: 'created',
      });
    }
  } catch (error) {
    // ── Fail-safe ─────────────────────────────────────────────────────────────
    // Write failures must not propagate to the session-close caller.
    const message = error instanceof Error ? error.message : String(error);
    console.error('[writeLTSSnapshot] Write failed:', message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
