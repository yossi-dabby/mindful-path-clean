/**
 * @file src/lib/caseFormulationValidator.js
 *
 * V10 Knowledge — Phase 6 — Server-side / shared payload validator for the
 * CaseFormulation structured writer.
 *
 * PURPOSE
 * -------
 * Pure, deterministic validation of the structured payload that the
 * `upsertCaseFormulation` backend writer persists.  Shared between:
 *   - the backend function (which duplicates this logic — Deno functions cannot
 *     import browser/Node modules from src/) and
 *   - unit tests (which import this module directly).
 *
 * CONTRACT
 * --------
 * - `cbt_domain` is validated against the EXACT 12-value enum.  Invalid or
 *   unsupported values are OMITTED (returned as `undefined`) — never defaulted to
 *   `general`.
 * - `treatment_phase` is validated against early|middle|late; invalid omitted.
 * - Readiness-signal producer objects (understanding_confirmed, pending_move,
 *   holding_complete) are shape-validated; malformed values are dropped.
 * - Readiness-signal producers are REFUSED unless sufficient canonical
 *   formulation evidence is present (scoreFormulationRecord >=
 *   FORMULATION_MIN_USEFUL_FIELDS) — understanding/consent/holding cannot be
 *   attached to a thin/domain-only formulation.
 * - `rationale_is_clear` cannot be persisted without a move_id + target_ref +
 *   rationale and a valid `ready` flag.
 * - Never throws.  Returns a structured { valid, payload, errors } result.
 *
 * Source of truth: V10 Knowledge Phase 6 problem statement.
 */

export const CASE_FORMULATION_DOMAIN_VALUES = Object.freeze([
  'anxiety',
  'depression',
  'trauma',
  'anger',
  'relationship',
  'ocd',
  'grief',
  'self_esteem',
  'panic',
  'social_anxiety',
  'phobia',
  'general',
]);

export const CASE_FORMULATION_TREATMENT_PHASE_VALUES = Object.freeze(['early', 'middle', 'late']);

export const HIGH_PROTECTION_CASE_TYPES = Object.freeze(['grief_loss', 'trauma', 'first_disclosure']);

const _DOMAIN_SET = new Set(CASE_FORMULATION_DOMAIN_VALUES);
const _PHASE_SET = new Set(CASE_FORMULATION_TREATMENT_PHASE_VALUES);

function _isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function _isBool(v) {
  return typeof v === 'boolean';
}

function _isISODateTime(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.trim());
}

/**
 * Scores 0–4 populated canonical dimensions (mirrors scoreFormulationRecord in
 * workflowContextInjector.js). Kept local to avoid importing app modules.
 *
 * @private
 * @param {object|null} cf
 * @returns {number}
 */
function _scoreCanonical(cf) {
  if (!cf || typeof cf !== 'object') return 0;
  const strMin = (v) => typeof v === 'string' && v.trim().length >= 8;
  const arrNonEmpty = (a, fn) => Array.isArray(a) && a.some(fn);
  const mb = cf.maintaining_behaviors;
  const hasMb = mb && typeof mb === 'object' && ['avoidance', 'safety_behaviors', 'reassurance_seeking']
    .some((k) => Array.isArray(mb[k]) && mb[k].some((s) => typeof s === 'string' && s.trim().length > 0));
  let score = 0;
  if (strMin(cf.presenting_problem) || arrNonEmpty(cf.presenting_themes, (t) => typeof t === 'string' && t.trim().length > 0)) score += 1;
  if (strMin(cf.core_belief) || arrNonEmpty(cf.core_belief_hypotheses, (h) => h && typeof h === 'object' && strMin(h.belief))) score += 1;
  if (strMin(cf.maintaining_cycle) || hasMb) score += 1;
  if (strMin(cf.treatment_goals) || arrNonEmpty(cf.goals, (g) => typeof g === 'string' && g.trim().length > 0)) score += 1;
  return score;
}

const FORMULATION_MIN_USEFUL_FIELDS = 2;

/**
 * Validates a raw upsertCaseFormulation payload.
 *
 * @param {object|null|undefined} raw
 * @returns {{valid: boolean, payload: object, errors: string[]}}
 *   `payload` is the sanitized, validated object safe to persist (fields with
 *   invalid values are omitted).  `valid` is true when conversation_id is a
 *   non-empty string (the only required field).  `errors` lists every rejection
 *   reason (never includes raw user text).
 */
export function validateCaseFormulationPayload(raw) {
  const errors = [];
  const payload = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, payload, errors: ['payload must be an object'] };
  }

  // conversation_id is the only required field.
  if (!_isStr(raw.conversation_id)) {
    errors.push('conversation_id is required and must be a non-empty string');
  } else {
    payload.conversation_id = String(raw.conversation_id).trim();
  }

  // cbt_domain: exact 12-value enum; invalid/unsupported OMITTED (not defaulted).
  if (raw.cbt_domain !== undefined && raw.cbt_domain !== null) {
    if (_isStr(raw.cbt_domain) && _DOMAIN_SET.has(raw.cbt_domain.trim())) {
      payload.cbt_domain = raw.cbt_domain.trim();
    } else {
      errors.push('cbt_domain omitted: value is not one of the allowed 12 enum values');
      // omit — do not default to 'general'
    }
  }

  // treatment_phase: early|middle|late; invalid omitted.
  if (raw.treatment_phase !== undefined && raw.treatment_phase !== null) {
    if (_isStr(raw.treatment_phase) && _PHASE_SET.has(raw.treatment_phase.trim())) {
      payload.treatment_phase = raw.treatment_phase.trim();
    } else {
      errors.push('treatment_phase omitted: value is not early|middle|late');
    }
  }

  // Canonical formulation content fields are passed through (string arrays).
  const stringArrays = [
    'presenting_themes',
    'triggers_situations',
    'automatic_thought_themes',
    'cognitive_distortions_observed',
    'strengths_resources',
    'goals',
    'risk_flags',
  ];
  for (const key of stringArrays) {
    if (Array.isArray(raw[key])) {
      payload[key] = raw[key].filter((x) => typeof x === 'string' && x.trim().length > 0);
    }
  }
  if (raw.maintaining_behaviors && typeof raw.maintaining_behaviors === 'object' && !Array.isArray(raw.maintaining_behaviors)) {
    const mb = {};
    for (const k of ['avoidance', 'safety_behaviors', 'reassurance_seeking']) {
      if (Array.isArray(raw.maintaining_behaviors[k])) {
        mb[k] = raw.maintaining_behaviors[k].filter((x) => typeof x === 'string' && x.trim().length > 0);
      }
    }
    payload.maintaining_behaviors = mb;
  }
  if (Array.isArray(raw.core_belief_hypotheses)) {
    payload.core_belief_hypotheses = raw.core_belief_hypotheses
      .filter((h) => h && typeof h === 'object' && _isStr(h.belief))
      .map((h) => ({
        belief: String(h.belief).trim(),
        evidence: typeof h.evidence === 'string' ? h.evidence : '',
        status: ['working_hypothesis', 'supported', 'revised'].includes(h.status) ? h.status : 'working_hypothesis',
      }));
  }

  // Readiness producers are REFUSED without sufficient canonical evidence.
  const canonicalScore = _scoreCanonical({ ...raw, ...payload });
  const hasCanonicalEvidence = canonicalScore >= FORMULATION_MIN_USEFUL_FIELDS;

  // understanding_confirmed
  const uc = raw.understanding_confirmed;
  if (uc !== undefined && uc !== null) {
    if (uc && typeof uc === 'object' && !Array.isArray(uc)) {
      if (!hasCanonicalEvidence) {
        errors.push('understanding_confirmed refused: insufficient canonical formulation evidence');
      } else if (_isBool(uc.confirmed) && _isStr(uc.session_id) && _isISODateTime(uc.confirmed_at)) {
        payload.understanding_confirmed = {
          confirmed: uc.confirmed === true,
          session_id: String(uc.session_id).trim(),
          turn_id: _isStr(uc.turn_id) ? String(uc.turn_id).trim() : '',
          confirmed_at: String(uc.confirmed_at).trim(),
        };
      } else {
        errors.push('understanding_confirmed omitted: invalid shape (requires confirmed:boolean, session_id:string, confirmed_at:ISO date-time)');
      }
    } else {
      errors.push('understanding_confirmed omitted: not an object');
    }
  }

  // pending_move (readiness + rationale)
  const pm = raw.pending_move;
  if (pm !== undefined && pm !== null) {
    if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
      if (!hasCanonicalEvidence) {
        errors.push('pending_move refused: insufficient canonical formulation evidence');
      } else if (_isStr(pm.session_id) && _isISODateTime(pm.set_at)) {
        const sanitized = {
          ready: pm.ready === true,
          rationale_clear: pm.rationale_clear === true,
          move_id: _isStr(pm.move_id) ? String(pm.move_id).trim() : '',
          target_ref: _isStr(pm.target_ref) ? String(pm.target_ref).trim() : '',
          rationale: _isStr(pm.rationale) ? String(pm.rationale).trim() : '',
          session_id: String(pm.session_id).trim(),
          set_at: String(pm.set_at).trim(),
        };
        // rationale_clear cannot be persisted without move_id + target_ref + rationale.
        if (sanitized.rationale_clear && !(sanitized.move_id && sanitized.target_ref && sanitized.rationale)) {
          errors.push('pending_move.rationale_clear refused: requires move_id, target_ref, and rationale');
          sanitized.rationale_clear = false;
        }
        payload.pending_move = sanitized;
      } else {
        errors.push('pending_move omitted: invalid shape (requires session_id:string, set_at:ISO date-time)');
      }
    } else {
      errors.push('pending_move omitted: not an object');
    }
  }

  // holding_complete
  const hc = raw.holding_complete;
  if (hc !== undefined && hc !== null) {
    if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
      if (!hasCanonicalEvidence) {
        errors.push('holding_complete refused: insufficient canonical formulation evidence');
      } else if (_isBool(hc.complete) && _isStr(hc.session_id) && _isISODateTime(hc.completed_at)) {
        const caseType = _isStr(hc.case_type) ? String(hc.case_type).trim() : '';
        // holding_complete is only meaningful for HIGH-protection case types.
        if (caseType && !HIGH_PROTECTION_CASE_TYPES.includes(caseType)) {
          errors.push('holding_complete omitted: case_type is not a HIGH-protection type');
        } else {
          payload.holding_complete = {
            complete: hc.complete === true,
            session_id: String(hc.session_id).trim(),
            case_type: caseType,
            completed_at: String(hc.completed_at).trim(),
          };
        }
      } else {
        errors.push('holding_complete omitted: invalid shape (requires complete:boolean, session_id:string, completed_at:ISO date-time)');
      }
    } else {
      errors.push('holding_complete omitted: not an object');
    }
  }

  if (_isISODateTime(raw.last_updated)) payload.last_updated = String(raw.last_updated).trim();

  const valid = errors.filter((e) => e.includes('conversation_id')).length === 0 && _isStr(raw.conversation_id);
  return { valid, payload, errors };
}

// ─── Phase 6b — writer (provenance-stamping) contract ─────────────────────────
//
// The live runtime caller (Chat.jsx) supplies a bounded `case_formulation_update`
// object that contains canonical content and *signal flags only* — it MUST NOT
// supply session ids or timestamps.  The backend writer stamps provenance
// (`session_id` = the verified finalized assistant message id; timestamps = the
// server `now`) so that producers can never be forged by client/model output.
//
// `sanitizeCaseFormulationUpdateForClient` is used by validateAgentOutput to
// bound the optional `case_formulation_update` field on the validated structured
// object — every key outside the allowlist is dropped before the metadata is
// stored, and producer objects carry only signal flags (no provenance).

export const CASE_FORMULATION_CONTENT_KEYS = Object.freeze([
  'presenting_themes',
  'triggers_situations',
  'automatic_thought_themes',
  'cognitive_distortions_observed',
  'strengths_resources',
  'goals',
  'risk_flags',
]);
export const CASE_FORMULATION_SCALAR_KEYS = Object.freeze(['cbt_domain', 'treatment_phase']);
export const CASE_FORMULATION_OBJECT_KEYS = Object.freeze(['maintaining_behaviors', 'core_belief_hypotheses']);
export const CASE_FORMULATION_PRODUCER_KEYS = Object.freeze([
  'understanding_confirmed',
  'pending_move',
  'holding_complete',
]);

/**
 * Bounds an agent-emitted `case_formulation_update` to an explicit allowlist.
 * Producer objects are reduced to signal flags only — provenance (session_id,
 * timestamps) is stripped; the backend writer re-stamps it from verified state.
 *
 * Returns the bounded object, or null when the input is absent/empty.
 *
 * @param {unknown} raw
 * @returns {object|null}
 */
export function sanitizeCaseFormulationUpdateForClient(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const k of CASE_FORMULATION_SCALAR_KEYS) {
    if (raw[k] !== undefined && raw[k] !== null) out[k] = raw[k];
  }
  for (const k of CASE_FORMULATION_CONTENT_KEYS) {
    if (Array.isArray(raw[k])) out[k] = raw[k];
  }
  for (const k of CASE_FORMULATION_OBJECT_KEYS) {
    if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) out[k] = raw[k];
  }
  if (Array.isArray(raw.core_belief_hypotheses)) out.core_belief_hypotheses = raw.core_belief_hypotheses;
  const uc = raw.understanding_confirmed;
  if (uc && typeof uc === 'object' && !Array.isArray(uc)) {
    out.understanding_confirmed = { confirmed: uc.confirmed === true };
  }
  const pm = raw.pending_move;
  if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
    out.pending_move = {
      ready: pm.ready === true,
      rationale_clear: pm.rationale_clear === true,
      move_id: typeof pm.move_id === 'string' ? pm.move_id : '',
      target_ref: typeof pm.target_ref === 'string' ? pm.target_ref : '',
      rationale: typeof pm.rationale === 'string' ? pm.rationale : '',
    };
  }
  const hc = raw.holding_complete;
  if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
    out.holding_complete = { complete: hc.complete === true, case_type: typeof hc.case_type === 'string' ? hc.case_type : '' };
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

/**
 * Validates a writer payload where provenance is supplied by the server (not the
 * client).  Stamps `session_id` = source_session_id and ISO timestamps onto every
 * producer, while source_message_id remains separate idempotency evidence, then
 * delegates to validateCaseFormulationPayload for shape/canonical validation.
 *
 * @param {object} clientPayload - { conversation_id, case_formulation_update? | ...fields }
 * @param {{ source_session_id: string, source_message_id: string, nowMs?: number }} provenance
 * @returns {{ valid: boolean, payload: object, errors: string[] }}
 */
export function validateWriterPayload(clientPayload, provenance) {
  // Identity contract (Phase 6b correction): producer session_id is stamped
  // from the verified canonical `source_session_id` (session_instance_id),
  // NEVER from source_message_id.  source_message_id is separately required
  // for idempotency/evidence, and MUST NOT equal source_session_id.
  const stampErrors = [];
  if (!clientPayload || typeof clientPayload !== 'object' || Array.isArray(clientPayload)) {
    return { valid: false, payload: {}, errors: ['clientPayload must be an object'] };
  }
  if (!_isStr(clientPayload.conversation_id)) stampErrors.push('conversation_id is required and must be a non-empty string');
  if (!provenance || !_isStr(provenance.source_session_id)) {
    stampErrors.push('source_session_id is required and must be a non-empty string');
  }
  if (!provenance || !_isStr(provenance.source_message_id)) {
    stampErrors.push('source_message_id is required and must be a non-empty string');
  }
  if (
    provenance && _isStr(provenance.source_session_id) && _isStr(provenance.source_message_id)
    && String(provenance.source_session_id).trim() === String(provenance.source_message_id).trim()
  ) {
    stampErrors.push('source_session_id must not equal source_message_id (identity separation)');
  }
  const now = provenance && Number.isFinite(provenance.nowMs)
    ? new Date(provenance.nowMs).toISOString()
    : new Date().toISOString();
  const sourceSessionId = provenance && _isStr(provenance.source_session_id) ? String(provenance.source_session_id).trim() : '';
  const sourceMessageId = provenance && _isStr(provenance.source_message_id) ? String(provenance.source_message_id).trim() : '';
  const cfu = sanitizeCaseFormulationUpdateForClient(clientPayload.case_formulation_update ?? clientPayload) || {};
  const formed = {
    conversation_id: _isStr(clientPayload.conversation_id) ? String(clientPayload.conversation_id).trim() : '',
    session_instance_id: sourceSessionId,
    source_last_message_id: sourceMessageId,
    ...cfu,
  };
  if (formed.understanding_confirmed) {
    formed.understanding_confirmed = { ...formed.understanding_confirmed, session_id: sourceSessionId, confirmed_at: now };
  }
  if (formed.pending_move) {
    formed.pending_move = { ...formed.pending_move, session_id: sourceSessionId, set_at: now };
  }
  if (formed.holding_complete) {
    formed.holding_complete = { ...formed.holding_complete, session_id: sourceSessionId, completed_at: now };
  }
  const inner = validateCaseFormulationPayload(formed);
  const payload = {
    ...inner.payload,
    session_instance_id: sourceSessionId,
    source_last_message_id: sourceMessageId,
  };
  return { valid: inner.valid && stampErrors.length === 0, payload, errors: [...stampErrors, ...inner.errors] };
}

/**
 * Computes the persistence decision for a writer call given an existing record.
 *
 *  - Idempotent no-op when an update_log entry for this source_message_id already
 *    exists (the same finalized assistant message is being replayed).  Returns
 *    { action: 'noop' } so the writer can short-circuit without rewriting state.
 *  - Stale-producer guard: an existing producer whose session_id differs from
 *    the incoming source_message_id is only overwritten by a NEWER event.  Since
 *    the writer stamps `now` on every accepted event and replays are caught by
 *    the idempotency check, the incoming event is treated as newer than any
 *    existing producer with a different session_id — the existing producer is
 *    superseded.  This helper does NOT mutate records; it returns `supersede` flags
 *    so the writer can merge producers deterministically.
 *
 * @param {object|null} existing
 * @param {string} sourceMessageId
 * @returns {{ action: 'noop'|'write', supersede: object }}
 */
export function computeWriterPersistenceDecision(existing, sourceSessionId, sourceMessageId) {
  // Phase 6b (corrected): idempotency uses the verified source_message_id (update_log
  // evidence); supersede compares the producer's session_id (a session_instance_id)
  // against the incoming source_session_id — never a message id.  A message id
  // must never be stored or compared as a session id.
  const supersede = { understanding_confirmed: false, pending_move: false, holding_complete: false };
  if (!existing || typeof existing !== 'object') return { action: 'write', supersede };
  const sId = _isStr(sourceSessionId) ? String(sourceSessionId).trim() : '';
  const mId = _isStr(sourceMessageId) ? String(sourceMessageId).trim() : '';
  const log = Array.isArray(existing.update_log) ? existing.update_log : [];
  const alreadyLogged = log.some(
    (e) => e && typeof e === 'object' && e.change === 'case_formulation_update' && String(e.evidence || '') === mId,
  );
  if (alreadyLogged) return { action: 'noop', supersede };
  for (const k of CASE_FORMULATION_PRODUCER_KEYS) {
    const p = existing[k];
    if (p && typeof p === 'object' && !Array.isArray(p) && _isStr(p.session_id) && p.session_id.trim() !== sId) {
      supersede[k] = true;
    }
  }
  return { action: 'write', supersede };
}
