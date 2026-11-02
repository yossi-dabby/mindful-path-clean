/**
 * @file src/lib/formulationRecordSelector.js
 *
 * V10 Knowledge — Phase 6b (Correction 2) — conversation-scoped CaseFormulation
 * record selection for the session-start readiness / context-injection paths.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The previous readBestFormulationRecord / buildFormulationContextBlock read
 * the two most-recent CaseFormulation records WITHOUT filtering by
 * conversation_id and selected the richest one.  That allowed a richer/newer
 * formulation belonging to a DIFFERENT conversation to supply cbt_domain,
 * goals, beliefs, or readiness for this opener — cross-conversation leakage.
 *
 * This module enforces the corrected contract:
 *   - When a verified conversation_id is supplied, candidate records are
 *     filtered by conversation_id BEFORE scoring/selecting.
 *   - Defence-in-depth: when a canonical session_instance_id is supplied, any
 *     candidate whose persisted session_instance_id disagrees is dropped, and
 *     the opener stays FAIL-CLOSED (null / empty block) if none remain.
 *   - Legacy/back-compat: when no conversation_id is supplied the previous
 *     behaviour is preserved (over-fetch-2-and-select-richest).
 *
 * Pure leaf module: no app imports, no side effects.  Used by
 * workflowContextInjector.js (readBestFormulationRecord + buildFormulationContextBlock).
 *
 * Source of truth: V10 Knowledge Phase 6b problem statement (corrected).
 */

function _isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Normalises the raw entity-read response into an array regardless of the
 * envelope shape returned by the Base44 SDK (array, {results:[...]},
 * {data:[...]}, {data:{results:[...]}}).
 *
 * @param {unknown} value
 * @returns {Array<object>}
 */
function _normaliseList(value) {
  try {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const r = /** @type {Record<string, unknown>} */ (value);
      if (Array.isArray(r.results)) return r.results;
      if (Array.isArray(r.data)) return r.data;
      const d = r.data;
      if (d && typeof d === 'object' && Array.isArray(/** @type {any} */ (d).results)) {
        return /** @type {any} */ (d).results;
      }
    }
  } catch {
    // never throw
  }
  return [];
}

/**
 * Selects the single best (richest) CaseFormulation record from a candidate
 * list, applying the session_instance_id defence-in-depth filter.
 *
 * Caller supplies a `scoreFn(record) => number` so this module stays a pure leaf
 * without importing the scorer (tests can inject a stub).
 *
 * @param {Array<object>} formulations
 * @param {string} [sessionInstanceId]
 * @param {(rec: object) => number} [scoreFn]
 * @returns {object|null} The selected record, or null when fail-closed.
 */
export function selectRichestFormulation(formulations, sessionInstanceId, scoreFn) {
  if (!Array.isArray(formulations) || formulations.length === 0) return null;
  const score = typeof scoreFn === 'function' ? scoreFn : () => 0;
  const wantSid = _isStr(sessionInstanceId);
  const filtered = wantSid
    ? formulations.filter((r) => r && (!r.session_instance_id || String(r.session_instance_id).trim() === String(sessionInstanceId).trim()))
    : formulations;
  const candidates = filtered.length > 0 ? filtered : (wantSid ? [] : formulations);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return score(candidates[1]) > score(candidates[0]) ? candidates[1] : candidates[0];
}

/**
 * Reads the CaseFormulation entity (conversation-scoped when a conversation_id
 * is supplied) and returns the single richest matching record, or null when
 * none match (fail-closed).
 *
 * @param {object|null} entities - Base44 entity map (must expose CaseFormulation).
 * @param {string} [conversationId] - Verified active conversation id.
 * @param {string} [sessionInstanceId] - Canonical session_instance_id (defence-in-depth).
 * @param {(rec: object) => number} [scoreFn]
 * @returns {Promise<object|null>}
 */
export async function readBestFormulationRecordForConversation(entities, conversationId, sessionInstanceId, scoreFn) {
  try {
    if (!entities || typeof entities !== 'object' || !entities.CaseFormulation) return null;
    const hasFilter = typeof entities.CaseFormulation.filter === 'function';
    const hasList = typeof entities.CaseFormulation.list === 'function';
    if (!hasFilter && !hasList) return null;
    const hasConvId = _isStr(conversationId);
    let raw;
    if (hasConvId && hasFilter) {
      raw = await entities.CaseFormulation.filter({ conversation_id: String(conversationId).trim() }, '-created_date', 2);
    } else {
      raw = await entities.CaseFormulation.list('-created_date', 2);
    }
    const formulations = _normaliseList(raw);
    return selectRichestFormulation(formulations, sessionInstanceId, scoreFn);
  } catch {
    return null;
  }
}

/**
 * Reads the conversation-scoped formulation candidates (for V6 context-block
 * construction).  Returns an array (possibly empty) — the caller applies its
 * own scoring+selection using scoreFormulationRecord.
 *
 * @param {object|null} entities
 * @param {string} [conversationId]
 * @returns {Promise<Array<object>>}
 */
export async function readFormulationsForContextBlock(entities, conversationId) {
  try {
    if (!entities || typeof entities !== 'object' || !entities.CaseFormulation) return [];
    const hasFilter = typeof entities.CaseFormulation.filter === 'function';
    const hasList = typeof entities.CaseFormulation.list === 'function';
    if (!hasFilter && !hasList) return [];
    const hasConvId = _isStr(conversationId);
    const raw = hasConvId && hasFilter
      ? await entities.CaseFormulation.filter({ conversation_id: String(conversationId).trim() }, '-created_date', 2)
      : await entities.CaseFormulation.list('-created_date', 2);
    return _normaliseList(raw);
  } catch {
    return [];
  }
}