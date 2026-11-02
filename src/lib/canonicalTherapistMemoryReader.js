/**
 * @file src/lib/canonicalTherapistMemoryReader.js
 *
 * Phase 4 — Canonical Therapist Memory Adapter
 *
 * Provides ONE canonical read orchestration per session-start operation that
 * combines the LTS snapshot and the cross-session continuity reads into a
 * single bounded, immutable result object.
 *
 * DESIGN
 * ------
 * This module is a thin adapter.  It does NOT re-implement LTS validity
 * logic, continuity parsing, privacy filtering, or selection/ranking.
 * It calls the existing canonical readers:
 *   - readLTSSnapshotWithDiagnostic  (from workflowContextInjector.js)
 *   - buildCrossSessionContinuityBlockWithDiagnostic (from crossSessionContinuity.js)
 *
 * LTS SEMANTICS (exact, as required by Phase 4 spec)
 * ---------------------------------------------------
 *   valid record:                    valid=true, warming_up=false, read_result="valid"
 *   weak record, session_count===1:  valid=false, warming_up=true,  read_result="weak"
 *   other weak record:               valid=false, warming_up=false, read_result="weak"
 *   no usable record:                valid=false, warming_up=false, read_result="absent_or_invalid"
 *   read failure:                    valid=false, warming_up=false, read_result="read_error"
 *
 * LTS and continuity are independent memory types.  An absent or warming-up
 * LTS record combined with available continuity sessions is a valid, expected
 * state and must NOT be treated as a contradiction.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * - Any error in either read path returns a safe fallback for that source only.
 * - An error in continuity does NOT affect the LTS result, and vice versa.
 * - The combined result is always returned — session start is never blocked.
 *
 * PRIVACY
 * -------
 * - CompanionMemory is a private per-user entity.
 * - No raw transcript, session text, user quotes, or PII is returned.
 * - The result contains only bounded structural signals.
 *
 * DIAGNOSTIC SAFETY
 * -----------------
 * - Never logs records, summaries, themes, user text, assistant text, or raw
 *   memory content.
 * - The canonical_memory_reader_used flag is always present in diagnostics.
 *
 * @module canonicalTherapistMemoryReader
 */

import {
  readLTSSnapshotWithDiagnostic,
  isLTSWeak,
  LTS_READ_RESULTS,
} from './ltsReaderContract.js';

import {
  buildCrossSessionContinuityBlockWithDiagnostic,
  CONTINUITY_FAILURE_REASONS,
} from './crossSessionContinuity.js';

// ─── LTS warming-up detection ─────────────────────────────────────────────────

/**
 * Returns true when an LTS record is present but immature: it is a valid LTS
 * record, it is classified as weak, and it has exactly 1 session processed.
 *
 * The warming-up distinction exists so callers can surface appropriate feedback
 * ("we're still learning your patterns") rather than a generic "no data" state.
 *
 * @param {object|null} ltsRecord - The parsed LTS record (may be null).
 * @param {string} readResult - One of LTS_READ_RESULTS values.
 * @returns {boolean} true when the record is weak and has exactly 1 session.
 */
export function isLTSWarmingUp(ltsRecord, readResult) {
  if (readResult !== LTS_READ_RESULTS.weak) return false;
  if (!ltsRecord || typeof ltsRecord !== 'object') return false;
  return typeof ltsRecord.session_count === 'number' && ltsRecord.session_count === 1;
}

// ─── Safe continuity fallback ─────────────────────────────────────────────────

/**
 * Returns a safe fallback continuity result when the continuity read fails
 * entirely (exception or missing client).
 *
 * @returns {{ sessions: number, block: string, diagnostic: object }}
 */
function _continuitySafeFallback() {
  return {
    sessions: 0,
    block: '',
    data: null,
    diagnostic: {
      memory_read_attempted: false,
      valid_therapist_memory_record_count: 0,
      selected_prior_session_count: 0,
      recurring_pattern_count: 0,
      working_hypothesis_count: 0,
      open_follow_up_count: 0,
      prior_intervention_count: 0,
      historical_risk_signal_count: 0,
      continuity_block_emitted: false,
      continuity_fail_safe: true,
      continuity_failure_reason_code: CONTINUITY_FAILURE_REASONS.read_error,
    },
  };
}

// ─── Main canonical read ──────────────────────────────────────────────────────

/**
 * Reads both the LTS snapshot and the cross-session continuity data in a single
 * canonical orchestration.
 *
 * This is the ONE authorized entry point for session-start memory reads.  The
 * result is immutable and must be passed through the delegate chain rather than
 * re-reading either source.
 *
 * RESULT SHAPE
 * ------------
 * {
 *   lts: {
 *     valid: boolean,           // true only when read_result === 'valid'
 *     record: object|null,      // the parsed LTS record (null when absent/error)
 *     read_result: string,      // one of LTS_READ_RESULTS values
 *     warming_up: boolean,      // true when weak AND session_count === 1
 *     session_count: number,    // ltsRecord.session_count or 0
 *   },
 *   continuity: {
 *     sessions: number,         // selected_prior_session_count from diagnostic
 *     block: string,            // formatted continuity block (may be '')
 *     diagnostic: object,       // full buildCrossSessionContinuityBlockWithDiagnostic diagnostic
 *     data: object|null,        // structured continuity data for strategy engine (memory-only)
 *   },
 * }
 *
 * NOTE: continuity.data is the internal structured continuity result from the
 * parse/ranking pass.  It is for in-memory use by the strategy engine only.
 * It must never be logged, persisted, or included in any diagnostic output.
 *
 * @param {object} entities - Base44 entity client map (must include CompanionMemory)
 * @returns {Promise<Readonly<{ lts: object, continuity: object }>>}
 */
export async function readCanonicalTherapistMemory(entities) {
  // ── LTS read (fail-open: any error produces read_error classification) ──────
  let ltsRecord = null;
  let ltsReadResult = LTS_READ_RESULTS.read_error;
  try {
    const result = await readLTSSnapshotWithDiagnostic(entities);
    ltsRecord = result?.ltsRecord ?? null;
    ltsReadResult = result?.diagnostic?.read_result ?? LTS_READ_RESULTS.read_error;
  } catch {
    ltsRecord = null;
    ltsReadResult = LTS_READ_RESULTS.read_error;
  }

  const ltsSessionCount =
    ltsRecord && typeof ltsRecord.session_count === 'number'
      ? ltsRecord.session_count
      : 0;

  const ltsValid = ltsReadResult === LTS_READ_RESULTS.valid;
  const ltsWarmingUp = isLTSWarmingUp(ltsRecord, ltsReadResult);

  // ── Continuity read (fail-open: any error returns safe fallback) ────────────
  // Independent of LTS: an LTS error must not suppress the continuity read.
  // buildCrossSessionContinuityBlockWithDiagnostic now returns continuityData
  // (the structured parse result) alongside the block and diagnostic, so the
  // strategy engine can reuse it without a second CompanionMemory.list call.
  let continuityResult = _continuitySafeFallback();
  try {
    const { block, diagnostic, continuityData } = await buildCrossSessionContinuityBlockWithDiagnostic(entities);
    continuityResult = {
      sessions: diagnostic?.selected_prior_session_count ?? 0,
      block: block ?? '',
      diagnostic: diagnostic ?? _continuitySafeFallback().diagnostic,
      data: continuityData ?? null,
    };
  } catch {
    continuityResult = _continuitySafeFallback();
  }

  // ── Assemble immutable result ────────────────────────────────────────────────
  return Object.freeze({
    lts: Object.freeze({
      valid: ltsValid,
      record: ltsRecord,
      read_result: ltsReadResult,
      warming_up: ltsWarmingUp,
      session_count: ltsSessionCount,
    }),
    continuity: Object.freeze({
      sessions: continuityResult.sessions,
      block: continuityResult.block,
      diagnostic: Object.freeze(continuityResult.diagnostic),
      // data is the internal structured continuity result for the strategy engine.
      // Memory-only: never logged, persisted or included in diagnostics.
      data: continuityResult.data ?? null,
    }),
  });
}

// ─── Diagnostic snapshot ──────────────────────────────────────────────────────

/**
 * Builds a safe, bounded diagnostic snapshot from a canonical memory result.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Never includes records, summaries, themes, user text, assistant text, or
 *   raw memory content.
 * - Only bounded structural signals (booleans, numbers, bounded strings) are
 *   returned.
 * - canonical_memory_reader_used is always true in this snapshot (it is only
 *   produced by this module and only when the canonical reader was actually used).
 * - Fail-safe: any error returns a safe all-false / zero snapshot.
 *
 * @param {object|null} canonicalResult - Result from readCanonicalTherapistMemory
 * @returns {Readonly<object>} Bounded diagnostic snapshot
 */
export function buildCanonicalMemoryDiagnosticSnapshot(canonicalResult) {
  try {
    if (!canonicalResult || typeof canonicalResult !== 'object') {
      return Object.freeze({
        lts_valid: false,
        lts_read_result: LTS_READ_RESULTS.read_error,
        lts_warming_up: false,
        lts_session_count: 0,
        continuity_session_count: 0,
        continuity_read_result: CONTINUITY_FAILURE_REASONS.read_error,
        canonical_memory_reader_used: true,
      });
    }

    const lts = canonicalResult.lts ?? {};
    const continuity = canonicalResult.continuity ?? {};
    const contDiag = continuity.diagnostic ?? {};

    return Object.freeze({
      lts_valid: lts.valid === true,
      lts_read_result: typeof lts.read_result === 'string'
        ? lts.read_result
        : LTS_READ_RESULTS.read_error,
      lts_warming_up: lts.warming_up === true,
      lts_session_count: typeof lts.session_count === 'number' ? lts.session_count : 0,
      continuity_session_count: typeof continuity.sessions === 'number' ? continuity.sessions : 0,
      continuity_read_result: typeof contDiag.continuity_failure_reason_code === 'string'
        ? contDiag.continuity_failure_reason_code
        : CONTINUITY_FAILURE_REASONS.none,
      canonical_memory_reader_used: true,
    });
  } catch {
    return Object.freeze({
      lts_valid: false,
      lts_read_result: LTS_READ_RESULTS.read_error,
      lts_warming_up: false,
      lts_session_count: 0,
      continuity_session_count: 0,
      continuity_read_result: CONTINUITY_FAILURE_REASONS.read_error,
      canonical_memory_reader_used: true,
    });
  }
}
