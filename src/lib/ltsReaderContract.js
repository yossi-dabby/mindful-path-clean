/**
 * @file src/lib/ltsReaderContract.js
 *
 * Phase 4.1 — LTS Reader Contract (leaf module)
 *
 * This is a LEAF module.  It has NO circular dependencies.
 *
 * It was extracted from workflowContextInjector.js to break the circular
 * dependency introduced in Phase 4:
 *
 *   canonicalTherapistMemoryReader → workflowContextInjector (for LTS read)
 *   workflowContextInjector → canonicalTherapistMemoryReader (for canonical adapter)
 *
 * Both workflowContextInjector.js and canonicalTherapistMemoryReader.js now import
 * from this leaf module.  No logic is duplicated — this module IS the single
 * implementation.
 *
 * EXPORTS
 * -------
 *   LTS_SNAPSHOT_OVERFETCH_BOUND   — max CompanionMemory records to fetch for LTS search
 *   LTS_READ_RESULTS               — bounded enum of read-result classifications
 *   isLTSWeak                      — returns true when an LTS record is too weak to inject
 *   readLTSSnapshotWithDiagnostic  — canonical single LTS read (CompanionMemory.filter)
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - No imports from workflowContextInjector.js or canonicalTherapistMemoryReader.js.
 * - Only imports from therapistMemoryModel.js (leaf; no further deps on this chain).
 * - readLTSSnapshotWithDiagnostic uses CompanionMemory.filter (not .list) so LTS reads
 *   are counted separately from continuity reads (CompanionMemory.list).
 * - Fail-open: any error returns a safe fallback; session start is never blocked.
 *
 * @module ltsReaderContract
 */

import {
  isLTSRecord,
  LTS_MEMORY_TYPE,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
  LTS_TRAJECTORIES,
} from './therapistMemoryModel.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum number of CompanionMemory records to over-fetch when searching for the
 * canonical LTS snapshot.  Small enough to be safe; large enough to find the LTS
 * among recently written records even if a few session records were written
 * between the LTS upsert and the next session start.
 *
 * @type {number}
 */
export const LTS_SNAPSHOT_OVERFETCH_BOUND = 15;

// ─── LTS read-result enum ─────────────────────────────────────────────────────

/**
 * Bounded LTS read-result enum for diagnostics.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const LTS_READ_RESULTS = Object.freeze({
  valid: 'valid',
  weak: 'weak',
  absent_or_invalid: 'absent_or_invalid',
  read_error: 'read_error',
});

// ─── isLTSWeak ────────────────────────────────────────────────────────────────

/**
 * Returns true when the given LTS record is too weak or immature to be worth
 * injecting into the session-start context.
 *
 * Suppression criteria (any one is sufficient to suppress):
 *   1. The record is null, not an object, or fails isLTSRecord() — not a valid LTS.
 *   2. trajectory is 'unknown' — LTS was not computed or is a schema default.
 *   3. trajectory is 'insufficient_data' — too few sessions to derive signals.
 *   4. session_count < LTS_MIN_SESSIONS_FOR_SIGNALS — belt-and-suspenders check.
 *
 * @param {unknown} ltsRecord - Any value; the parsed LTS record to evaluate.
 * @returns {boolean} true when the record should be suppressed.
 */
export function isLTSWeak(ltsRecord) {
  if (!isLTSRecord(ltsRecord)) return true;
  const trajectory = ltsRecord.trajectory;
  if (trajectory === LTS_TRAJECTORIES.UNKNOWN) return true;
  if (trajectory === LTS_TRAJECTORIES.INSUFFICIENT_DATA) return true;
  const sessionCount = typeof ltsRecord.session_count === 'number' ? ltsRecord.session_count : 0;
  if (sessionCount < LTS_MIN_SESSIONS_FOR_SIGNALS) return true;
  return false;
}

// ─── readLTSSnapshotWithDiagnostic ────────────────────────────────────────────

/**
 * Reads the single canonical LTS snapshot from CompanionMemory.
 *
 * Fetches up to LTS_SNAPSHOT_OVERFETCH_BOUND CompanionMemory records (newest
 * first) using CompanionMemory.filter, parses each record's content, and returns
 * the first valid LTS record found (i.e. the most recently stored one).
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Returns a read_error result on any error (missing entities, empty list, parse
 * failure, etc.).  Callers must treat null ltsRecord as "no LTS available".
 *
 * PRIVACY
 * -------
 * - CompanionMemory is a private per-user entity — no cross-user access.
 * - Only records whose content passes isLTSRecord() are returned.
 * - No raw transcript content is read or returned — LTS records are structured
 *   signal aggregates only (Wave 3A/3B schema).
 *
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<{
 *   ltsRecord: object|null,
 *   diagnostic: {
 *     lts_valid: boolean,
 *     read_result: string,
 *   },
 * }>} Parsed LTS record + bounded read_result classification
 */
export async function readLTSSnapshotWithDiagnostic(entities) {
  const makeResult = (ltsRecord, read_result) => Object.freeze({
    ltsRecord,
    diagnostic: Object.freeze({
      lts_valid: read_result === LTS_READ_RESULTS.valid,
      read_result,
    }),
  });

  try {
    if (!entities || typeof entities !== 'object') {
      return makeResult(null, LTS_READ_RESULTS.read_error);
    }
    if (!entities.CompanionMemory) {
      return makeResult(null, LTS_READ_RESULTS.read_error);
    }

    let rawRecords;
    try {
      if (typeof entities.CompanionMemory.filter === 'function') {
        rawRecords = await entities.CompanionMemory.filter(
          { memory_type: LTS_MEMORY_TYPE },
          '-created_date',
          LTS_SNAPSHOT_OVERFETCH_BOUND,
        );
      } else if (typeof entities.CompanionMemory.list === 'function') {
        rawRecords = await entities.CompanionMemory.list(
          '-created_date',
          LTS_SNAPSHOT_OVERFETCH_BOUND,
        );
      } else {
        return makeResult(null, LTS_READ_RESULTS.read_error);
      }
    } catch {
      return makeResult(null, LTS_READ_RESULTS.read_error);
    }
    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      return makeResult(null, LTS_READ_RESULTS.absent_or_invalid);
    }

    for (const raw of rawRecords) {
      if (!raw || typeof raw !== 'object') continue;
      // Quick pre-filter: only bother parsing records whose outer memory_type is 'lts'.
      if (raw.memory_type !== LTS_MEMORY_TYPE) continue;

      let parsed = null;
      try {
        if (raw.content && typeof raw.content === 'string') {
          parsed = JSON.parse(raw.content);
        } else if (raw.content && typeof raw.content === 'object') {
          parsed = raw.content;
        }
      } catch {
        continue;
      }

      if (isLTSRecord(parsed)) {
        return makeResult(
          parsed,
          isLTSWeak(parsed)
            ? LTS_READ_RESULTS.weak
            : LTS_READ_RESULTS.valid,
        );
      }
    }

    return makeResult(null, LTS_READ_RESULTS.absent_or_invalid);
  } catch {
    return makeResult(null, LTS_READ_RESULTS.read_error);
  }
}
