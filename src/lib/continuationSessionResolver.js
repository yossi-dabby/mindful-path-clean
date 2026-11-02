/**
 * @file src/lib/continuationSessionResolver.js
 *
 * V10 Knowledge — Phase 6b — Verified continuation-session derivation
 * (corrected identity model).
 *
 * PURPOSE
 * -------
 * Pure, synchronous helper that derives the `continuation_session_id` passed
 * into the V10 session-start planner context from VERIFIED stored state
 * (a CaseFormulation record for the active conversation_id and/or the agent
 * conversation's metadata).
 *
 * IDENTITY CONTRACT (non-negotiable)
 * ---------------------------------
 * These five identifiers are STRICTLY SEPARATE and must never be interchanged:
 *
 *   conversation_id      — the agent conversation id (whole conversation).
 *   session_instance_id — canonical therapy/session-instance id.  Generated
 *                          once per agent conversation at creation (stored in
 *                          conversation metadata), persisted on the first
 *                          formulation write, LOCKED thereafter.  This is the
 *                          value returned here.
 *   source_message_id    — a finalized assistant message id; used by the
 *                          writer for idempotency/evidence, NOT as a session id.
 *   source_turn_id       — optional turn id within a session.
 *   move_id / target_ref — a selected intervention / formulation target.
 *
 * A message id MUST NEVER be stored, returned, or compared as a session id.
 * This module therefore reads ONLY the canonical session_instance_id — from a
 * matching CaseFormulation record (preferred) or from verified conversation
 * metadata — never from a message id.
 *
 * FAIL-CLOSED
 * -----------
 * A fresh or verified-to-have-no-prior-session opener yields ''.  The reader
 * (extractReadinessSignals) then returns all-false and V10 retrieval stays
 * fail-closed regardless of any persisted evidence.
 *
 * CROSS-CONVERSATION ISOLATION
 * ---------------------------
 * `continuation_session_id` is bound to the ACTIVE conversation's
 * session_instance_id.  readBestFormulationRecord (workflowContextInjector)
 * filters candidate CaseFormulation records by conversation_id, so a richer/
 * newer formulation belonging to a DIFFERENT conversation can never supply
 * cbt_domain, goals, beliefs, or readiness for this opener.  This resolver
 * additionally guarantees the value never comes from a message id.
 *
 * Source of truth: V10 Knowledge Phase 6b problem statement (corrected).
 */

function _isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Derives the continuation session id from verified stored state.
 *
 * Caller passes BOTH the candidate CaseFormulation record for the active
 * conversation_id (already filtered by conversation_id upstream) AND the
 * active conversation's verified metadata.  The two must agree; disagreements
 * leave the result fail-closed ('').
 *
 * @param {object|null|undefined} formulationRecord
 *   A CaseFormulation record already filtered to the active conversation_id,
 *   or null when no same-conversation formulation exists yet.
 * @param {object|null|undefined} conversationMetadata
 *   The active agent conversation's verified metadata object.  May carry
 *   `session_instance_id` (set at creation).  Optional.
 * @returns {string} The canonical session_instance_id, or '' when none is
 *   verified (fresh opener / no prior session / cross-conversation mismatch).
 */
export function deriveContinuationSessionId(formulationRecord, conversationMetadata) {
  try {
    const rec = formulationRecord && typeof formulationRecord === 'object' && !Array.isArray(formulationRecord)
      ? formulationRecord
      : null;
    const meta = conversationMetadata && typeof conversationMetadata === 'object' && !Array.isArray(conversationMetadata)
      ? conversationMetadata
      : null;

    const recordSid = rec && _isStr(rec.session_instance_id) ? String(rec.session_instance_id).trim() : '';
    const metaSid = meta && _isStr(meta.session_instance_id) ? String(meta.session_instance_id).trim() : '';

    // Defence-in-depth: when both are present and they disagree, the record may
    // belong to a different session than the active conversation.  Fail-closed.
    if (recordSid && metaSid && recordSid !== metaSid) return '';

    // Prefer the record's persisted (locked) session_instance_id; fall back to
    // the verified conversation metadata value; else '' (fresh / no prior).
    return recordSid || metaSid || '';
  } catch {
    return '';
  }
}

/**
 * Predicate used by callers/tests to assert that a value is NOT a message id
 * masquerading as a session id.  Purely structural — this helper exists so the
 * identity contract is explicit and testable: any derivation that would return
 * a raw message id here MUST be rejected by tests as an identity violation.
 *
 * @param {string} sid
 * @param {string} [sourceMessageId]
 * @returns {boolean}
 */
export function isContinuationSessionIdValid(sid, sourceMessageId) {
  if (!_isStr(sid)) return false;
  if (_isStr(sourceMessageId) && sid.trim() === String(sourceMessageId).trim()) return false;
  return true;
}