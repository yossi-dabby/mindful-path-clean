/**
 * @file src/lib/readinessSignalReader.js
 *
 * V10 Knowledge — Phase 6 — Structured runtime readiness-signal reader.
 *
 * PURPOSE
 * -------
 * Pure, deterministic, self-contained reader that derives the four L5
 * intervention-readiness detector values from OPTIONAL structured producer
 * fields persisted on a CaseFormulation record:
 *
 *   has_been_understood  ← understanding_confirmed       (alliance/session-bound)
 *   readiness_signal     ← pending_move.ready             (move-bound)
 *   rationale_is_clear   ← pending_move (move+target+rationale, bound to formulation)
 *   holding_complete     ← holding_complete               (safety/containment event)
 *
 * WHY A READER (NOT opts)
 * -----------------------
 * V10 retrieval runs at session-start. A readiness/consent/move signal produced
 * only after the opener cannot satisfy the opener's readiness gate unless it was
 * safely persisted from an EARLIER interaction. These four signals are therefore
 * read from persisted structured state (the CaseFormulation record written by the
 * upsertCaseFormulation backend writer), never inferred from formulation
 * richness, message count, session age, or raw text.
 *
 * STALENESS GUARD
 * ---------------
 * Every producer field carries a provenance `session_id`. A signal is treated as
 * current ONLY when that provenance session_id matches the
 * `continuation_session_id` supplied by the live runtime caller (the prior
 * session explicitly being continued at this opener). At a fresh opener with no
 * continuation, EVERY signal stays false — this is the fail-closed behaviour that
 * keeps V10 retrieval from promoting on stale evidence.
 *
 * DESIGN CONTRACT (non-negotiable)
 * --------------------------------
 * - Pure, synchronous, deterministic. Same inputs always produce the same output.
 * - No LLM calls, no entity access, no side effects, no network.
 * - No raw message text is accepted or analysed.
 * - Absent / malformed / stale / mismatched signals ALWAYS remain false.
 * - Never throws — returns all-false on any error.
 * - `rationale_is_clear` additionally requires the move's `target_ref` to be bound
 *   to an existing formulation goal or core-belief hypothesis (rejects unbound or
 *   mismatched targets).
 *
 * Source of truth: V10 Knowledge Phase 6 problem statement.
 */

/**
 * @typedef {Object} ReadinessSignals
 * @property {boolean} has_been_understood
 * @property {boolean} readiness_signal
 * @property {boolean} rationale_is_clear
 * @property {boolean} holding_complete
 */

const _FALSE_RESULT = Object.freeze({
  has_been_understood: false,
  readiness_signal: false,
  rationale_is_clear: false,
  holding_complete: false,
});

function _isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function _isNonEmptyStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Returns true when `targetRef` is bound to an existing canonical formulation goal
 * or core-belief hypothesis on the supplied record.
 *
 * A move bound to a target that is not present in the formulation is rejected
 * (rationale_is_clear stays false) — this enforces the "maps to a canonical
 * formulation goal or treatment target" contract.
 *
 * @private
 * @param {string} targetRef
 * @param {object} rec
 * @returns {boolean}
 */
function _targetRefBoundToFormulation(targetRef, rec) {
  if (!_isNonEmptyStr(targetRef)) return false;
  const goals = Array.isArray(rec.goals) ? rec.goals : [];
  if (goals.some((g) => typeof g === 'string' && g.trim() === targetRef.trim())) return true;
  const hypotheses = Array.isArray(rec.core_belief_hypotheses) ? rec.core_belief_hypotheses : [];
  return hypotheses.some(
    (h) => h && typeof h === 'object' && typeof h.belief === 'string' && h.belief.trim() === targetRef.trim(),
  );
}

/**
 * Derives the four L5 readiness detector values from a CaseFormulation record and
 * the current session continuation context.
 *
 * @param {object|null|undefined} formulationRecord - CaseFormulation entity record.
 * @param {object|null|undefined} sessionContext - Runtime continuation context.
 * @param {string} [sessionContext.continuation_session_id] - The prior session id
 *   explicitly being continued at this opener. Absent/empty => every signal false.
 * @returns {ReadinessSignals}
 */
export function extractReadinessSignals(formulationRecord, sessionContext) {
  try {
    const rec = formulationRecord && typeof formulationRecord === 'object' && !Array.isArray(formulationRecord)
      ? formulationRecord
      : null;
    if (!rec) return _FALSE_RESULT;
    const ctx = sessionContext && typeof sessionContext === 'object' && !Array.isArray(sessionContext)
      ? sessionContext
      : {};
    const continuationSessionId = typeof ctx.continuation_session_id === 'string'
      ? ctx.continuation_session_id.trim()
      : '';
    if (!continuationSessionId) return _FALSE_RESULT;

    let has_been_understood = false;
    let readiness_signal = false;
    let rationale_is_clear = false;
    let holding_complete = false;

    // has_been_understood: structured confirmation, provenance session must match continuation.
    const uc = rec.understanding_confirmed;
    if (uc && typeof uc === 'object' && !Array.isArray(uc)) {
      if (uc.confirmed === true && _isStr(uc.session_id) && uc.session_id.trim() === continuationSessionId) {
        has_been_understood = true;
      }
    }

    // readiness_signal + rationale_is_clear: move-bound, provenance session must match.
    const pm = rec.pending_move;
    if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
      if (_isStr(pm.session_id) && pm.session_id.trim() === continuationSessionId) {
        if (pm.ready === true) {
          readiness_signal = true;
        }
        // rationale_is_clear requires: ready, rationale_clear, move_id, target_ref
        // bound to the formulation, and a non-empty rationale.
        if (
          pm.ready === true &&
          pm.rationale_clear === true &&
          _isNonEmptyStr(pm.move_id) &&
          _isNonEmptyStr(pm.rationale) &&
          _targetRefBoundToFormulation(pm.target_ref, rec)
        ) {
          rationale_is_clear = true;
        }
      }
    }

    // holding_complete: from the structured safety/containment event, provenance
    // session must match continuation.
    const hc = rec.holding_complete;
    if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
      if (hc.complete === true && _isStr(hc.session_id) && hc.session_id.trim() === continuationSessionId) {
        holding_complete = true;
      }
    }

    return Object.freeze({
      has_been_understood,
      readiness_signal,
      rationale_is_clear,
      holding_complete,
    });
  } catch {
    return _FALSE_RESULT;
  }
}

export { _targetRefBoundToFormulation as targetRefBoundToFormulation };