/**
 * @file src/lib/caseFormulationInvocation.js
 *
 * V10 Knowledge — Phase 6b — Real runtime invocation of the CaseFormulation
 * structured writer (corrected identity model).
 *
 * IDENTITY CONTRACT
 * -----------------
 * The writer receives distinct identifiers — NONE trusted solely from the
 * client payload beyond what the backend re-verifies:
 *
 *   conversation_id      — active agent conversation id.
 *   source_session_id    — the verified canonical session_instance_id for this
 *                          conversation (derived via continuationSessionResolver
 *                          from stored state, never a message id).  The writer
 *                          stamps every producer's `session_id` from this.
 *   source_message_id     — the verified finalized assistant message id whose
 *                          structured update produced this mutation.  Used by
 *                          the writer for idempotency + update_log evidence;
 *                          NEVER stored/returned/compared as a session id.
 *   source_turn_id       — optional turn id within the session.
 *
 * FINALITY CONTRACT
 * -----------------
 * The writer is invoked ONLY from a FINAL, validated assistant result — never
 * a streaming snapshot, partial response, malformed JSON, render fallback, or
 * client-authored object.  `isFinalAssistantMessage` enforces this at the
 * client lifecycle boundary (the only place message finality is observable).
 * The backend additionally verifies conversation ownership (RLS), session
 * immutability, canonical evidence, and idempotency server-side.
 *
 * PROVENANCE
 * ----------
 * The client NEVER supplies producer session_id or timestamps.  The backend
 * stamps producer.session_id = server-verified source_session_id and ISO
 * timestamps = server `now`.  The client payload's bounded
 * `case_formulation_update` (sanitized by validateAgentOutput to signal-flags
 * only) is revalidated server-side.
 *
 * OBSERVABLE PERSISTENCE
 * ----------------------
 * persistence is an AWAITED, bounded function invocation (not fire-and-forget).
 * The chat stays fail-open on error, but the bounded structural
 * status/error code is observable via the return value (never logs clinical
 * content or PII).
 *
 * FAIL-SAFE
 * ---------
 * Client-side gated by THERAPIST_UPGRADE_KNOWLEDGE_ENABLED (false on Production);
 * the backend function is independently gated by its environment flags and
 * returns 503 gated when disabled.  A failed/503/observable-error result never
 * breaks chat; it simply leaves the formulation un-advanced for this turn.
 *
 * Source of truth: V10 Knowledge Phase 6b problem statement (corrected).
 */

import { isUpgradeEnabled } from './featureFlags.js';
import { sanitizeCaseFormulationUpdateForClient } from './caseFormulationValidator.js';

function _isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Creates the canonical identity stored on one agent conversation.  Failure is
 * deliberately fail-closed: callers must not persist formulation state without
 * a stable, cryptographically generated conversation/session identity.
 */
export function createSessionInstanceId(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  try {
    if (typeof randomUUID !== 'function') return '';
    const value = String(randomUUID()).trim();
    return value ? `sess_${value}` : '';
  } catch {
    return '';
  }
}

/** Returns the stored canonical identity for an agent conversation. */
export function resolveConversationSessionInstanceId(conversation) {
  try {
    const value = conversation?.metadata?.session_instance_id;
    return _isStr(value) ? String(value).trim() : '';
  } catch {
    return '';
  }
}

/**
 * Predicate: does `msg` represent a FINALIZED assistant result suitable for
 * persisting a CaseFormulationUpdate?  Partial/streaming/non-final messages
 * MUST NOT invoke the writer.  This is the client-side lifecycle boundary; the
 * backend additionally verifies canonical evidence/idempotency.
 *
 * @param {object|null|undefined} msg
 * @returns {boolean}
 */
export function isFinalAssistantMessage(msg) {
  if (!msg || typeof msg !== 'object') return false;
  if (msg.role !== 'assistant') return false;
  if (!_isStr(msg.id)) return false;
  const status = typeof msg.status === 'string' ? msg.status.trim().toLowerCase() : '';
  if (['completed', 'final', 'done', 'success'].includes(status)) return true;
  const meta = msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {};
  if (meta.is_final === true || meta.final === true || meta.completed === true) return true;
  if (meta.feedback_finality_verified === true) return true;
  const metaStatus = typeof meta.status === 'string' ? meta.status.trim().toLowerCase() : '';
  if (['completed', 'final', 'done', 'success'].includes(metaStatus)) return true;
  // A prior assistant turn with a finalized marker is treated final.  A bare
  // non-empty content is NOT sufficient by itself — some streaming snapshots
  // carry content before finality.  Require an explicit finality signal.
  return false;
}

/**
 * Builds the writer payload from a validated assistant structured_data object.
 *
 * Requires distinct non-empty conversation_id, source_session_id, and
 * source_message_id.  The updated bounded `case_formulation_update` MUST be
 * present (else null).  source_session_id MUST differ from source_message_id
 * (identity separation).
 *
 * @param {object} validated - The validated assistant structured_data (from
 *   validateAgentOutput). Must contain a bounded `case_formulation_update`.
 * @param {string} conversationId - The active agent conversation id.
 * @param {string} sourceSessionId - The verified canonical session_instance_id.
 * @param {string} sourceMessageId - The verified finalized assistant message id.
 * @param {string} [sourceTurnId] - Optional turn id within the session.
 * @returns {object|null}
 */
export function buildUpsertPayload(validated, conversationId, sourceSessionId, sourceMessageId, sourceTurnId) {
  if (!validated || typeof validated !== 'object' || Array.isArray(validated)) return null;
  if (!_isStr(conversationId) || !_isStr(sourceSessionId) || !_isStr(sourceMessageId)) return null;
  // Identity separation: a message id must never be used as a session id.
  if (String(sourceSessionId).trim() === String(sourceMessageId).trim()) return null;
  const cfu = sanitizeCaseFormulationUpdateForClient(validated.case_formulation_update);
  if (!cfu) return null;
  const payload = {
    conversation_id: String(conversationId).trim(),
    source_session_id: String(sourceSessionId).trim(),
    source_message_id: String(sourceMessageId).trim(),
    case_formulation_update: cfu,
  };
  if (_isStr(sourceTurnId)) payload.source_turn_id = String(sourceTurnId).trim();
  return payload;
}

/**
 * Bounded persistence status code returned to the chat so the result is
 * observable without logging clinical content.
 *   'persisted'            — writer accepted and persisted.
 *   'gated'                — writer disabled (flag off); chat unaffected.
 *   'rejected'             — writer refused the payload (auth/identity/shape).
 *   'error'                — writer/backend error; chat stays fail-open.
 *   'skipped_no_payload'   — caller passed nothing persistable.
 */
export async function persistCaseFormulationUpdate(base44, payload) {
  try {
    if (!isUpgradeEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED')) return { status: 'gated' };
    if (!payload || !_isStr(payload.conversation_id) || !_isStr(payload.source_session_id) || !_isStr(payload.source_message_id)) {
      return { status: 'skipped_no_payload' };
    }
    if (!base44 || typeof base44.functions?.invoke !== 'function') return { status: 'error' };
    const res = await base44.functions.invoke('upsertCaseFormulation', payload);
    const data = res && res.data !== undefined ? res.data : res;
    const ok = data && (data.success === true || data.upserted === 'created' || data.upserted === 'updated' || data.upserted === 'idempotent');
    if (ok) return { status: 'persisted', upserted: data.upserted || 'updated' };
    if (data && (data.gated === true)) return { status: 'gated' };
    if (data && data.error === 'idempotent') return { status: 'persisted', upserted: 'idempotent' };
    return { status: 'rejected', error: data?.error || 'rejected' };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Scans a confirmed message snapshot for FINALIZED assistant turns carrying a
 * bounded `case_formulation_update`, and persists any not already persisted
 * (deduped by source_message_id).  Intended to be called by Chat.jsx right
 * after an assistant message is marked final.
 *
 * Only final assistant messages (isFinalAssistantMessage) are considered —
 * partial/streaming/non-final messages are skipped.  Returns an observable
 * bounded summary of per-message results (never clinical content).
 *
 * @param {object} base44
 * @param {string} conversationId
 * @param {string} sourceSessionId
 * @param {Array<object>} messages
 * @param {Set<string>} persistedIdsRef - Mutable Set of already-persisted message ids.
 * @returns {Promise<{ persisted: number, failed: number, attempted: number }>}
 */
export async function maybePersistCaseFormulationUpdatesForMessages(base44, conversationId, sourceSessionId, messages, persistedIdsRef) {
  const summary = { persisted: 0, failed: 0, attempted: 0 };
  try {
    if (!isUpgradeEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED')) return summary;
    if (!_isStr(conversationId) || !_isStr(sourceSessionId) || !Array.isArray(messages) || !(persistedIdsRef instanceof Set)) {
      return summary;
    }
    // A committed snapshot contains the whole conversation.  Persist only the
    // newest eligible finalized assistant turn.  Replaying every historical
    // update newest-to-oldest could let an old turn overwrite the current
    // formulation after a reload or subscription reconnect.
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (!isFinalAssistantMessage(msg)) continue;
      const sd = msg.metadata && msg.metadata.structured_data;
      if (!sd || typeof sd !== 'object') continue;
      const payload = buildUpsertPayload(sd, conversationId, sourceSessionId, msg.id, msg.metadata?.source_turn_id);
      if (!payload) continue;
      // The newest eligible update is authoritative for a full snapshot. If
      // it was already handled, stop here rather than walking backward and
      // replaying an older formulation update on a reconnect/re-subscription.
      if (persistedIdsRef.has(msg.id)) break;
      persistedIdsRef.add(msg.id);
      summary.attempted += 1;
      const result = await persistCaseFormulationUpdate(base44, payload);
      if (result.status === 'persisted') summary.persisted += 1;
      else if (result.status === 'error' || result.status === 'rejected') summary.failed += 1;
      break;
    }
  } catch {
    // Fail-safe: never surface writer errors in the chat path.
  }
  return summary;
}
