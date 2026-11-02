import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * @file base44/functions/upsertCaseFormulation/entry.ts
 *
 * V10 Knowledge — Phase 6b — Secure server-side CaseFormulation writer
 * (corrected identity model).
 *
 * IDENTITY CONTRACT
 * -----------------
 * The writer receives — and re-verifies — distinct identifiers:
 *   conversation_id      — active agent conversation id.
 *   source_session_id    — the canonical session_instance_id for this
 *                          conversation.  Stamps every producer's
 *                          `session_id` (NEVER a message id).  Once a record
 *                          for conversation_id exists, its session_instance_id
 *                          is LOCKED: a subsequent write whose source_session_id
 *                          differs is REJECTED (403) — the session cannot be
 *                          reassigned by any client payload.
 *   source_message_id    — verified finalized assistant message id.  Used for
 *                          idempotency (update_log evidence) — never stored,
 *                          returned, or compared as a session id.
 *   source_turn_id       — optional turn id within the session.
 *   case_formulation_update — bounded agent-emitted update (signal flags only;
 *                          client may not supply session_id/timestamps).
 *
 * SERVER-SIDE VERIFICATION (never trusted solely from client)
 * ----------------------------------------------------------
 *   - Authenticated user via base44.auth.me() (the app user, RLS owner).
 *   - Existing CaseFormulation record is read under authenticated RLS
 *     (CaseFormulation.create/read/update/delete = created_by user email).
 *     A record the user does not own can never be returned, so only the
 *     user's own formulation is mutated.  For a NEW conversation the record
 *     is created under the user's own email (RLS create) — cross-user write
 *     is impossible.
 *   - session_instance_id immutability (see above) — checked against the
 *     persisted record, never the client claim.
 *   - Canonical formulation evidence (score >= 2) required before any
 *     readiness producer is accepted.
 *   - Idempotency: an update_log entry whose evidence === source_message_id
 *     makes the write a no-op (returns `upserted: 'idempotent'`).
 *   - Stale-producer ordering: server `now` stamps timestamps; producers with
 *     a different session_id are superseded by the incoming (verified) event.
 *
 * PLATFORM LIMITATION (reported, not papered over)
 * -----------------------------------------------
 * Base44's backend SDK does not expose an agent-conversation/message read API
 * (verified: no existing backend function reads agent messages server-side).
 * The writer therefore CANNOT re-verify, server-side, that `source_message_id`
 * corresponds to a real finalized assistant message belonging to this
 * conversation.  To stay fail-closed per the Phase 6b correction:
 *   - Producer acceptance is gated by canonical formulation evidence (no thin
 *     records can mint readiness).
 *   - The session_instance_id immutability lock binds all writes for a
 *     conversation to ONE canonical session.
 *   - Message finality is enforced at the CLIENT lifecycle boundary
 *     (caseFormulationInvocation.isFinalAssistantMessage), which is the only
 *     place finality is observable in this platform.  The writer records
 *     source_message_id for idempotency/evidence and does not trust a
 *     client-claimed "final" marker.
 * This limitation is documented in the 503-gated status payload so it is
 * observable, and the canonical-evidence + immutability gates keep the
 * producer-state surface fail-closed regardless.
 *
 * ACTIVATION (server-side, runtime-authority aware — mirrors
 * retrieveTherapistMemory / writeTherapistMemory)
 * ------------------------------------------------
 * When THERAPIST_RUNTIME_APPLY_ENABLED === 'true': requires BOTH
 *   VITE_THERAPIST_UPGRADE_ENABLED === 'true' and
 *   VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED === 'true'.
 * Otherwise (legacy gate): requires BOTH
 *   THERAPIST_UPGRADE_ENABLED === 'true' and
 *   THERAPIST_UPGRADE_KNOWLEDGE_ENABLED === 'true'.
 * A client "flag enabled" claim is NEVER trusted — the gate is env-only.
 * When the gate is closed, the writer reports the exact blocker (named env
 * vars) and stays fail-closed (503, gated: true).  It never silently remains
 * permanently disabled without reporting.
 *
 * FAIL-SAFE
 * ---------
 * Write failures return a structured error (success: false) with a bounded
 * status code.  No clinical content is logged.
 *
 * OUTPUT (bounded, observable, no PII)
 * ------------------------------------
 * { success: true,  id, upserted: 'created'|'updated'|'idempotent' }
 * { success: false, error, status_code, [gated:true, flag_status], [errors] }
 */

const KNOWLEDGE_FLAG_ENV = 'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED';
const MASTER_FLAG_ENV = 'THERAPIST_UPGRADE_ENABLED';
const VITE_MASTER_ENV = 'VITE_THERAPIST_UPGRADE_ENABLED';
const VITE_KNOWLEDGE_ENV = 'VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED';
const RUNTIME_APPLY_ENV = 'THERAPIST_RUNTIME_APPLY_ENABLED';

const CASE_FORMULATION_DOMAIN_VALUES = Object.freeze([
  'anxiety', 'depression', 'trauma', 'anger', 'relationship', 'ocd',
  'grief', 'self_esteem', 'panic', 'social_anxiety', 'phobia', 'general',
]);
const HIGH_PROTECTION_CASE_TYPES = Object.freeze(['grief_loss', 'trauma', 'first_disclosure']);
const _DOMAIN_SET = new Set(CASE_FORMULATION_DOMAIN_VALUES);
const PRODUCER_KEYS = Object.freeze(['understanding_confirmed', 'pending_move', 'holding_complete']);
const FORMULATION_MIN_USEFUL_FIELDS = 2;

function _isStr(v: unknown): v is string {
  return typeof v === 'string' && (v as string).trim().length > 0;
}
function _isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}
function _isISODateTime(v: unknown): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test((v as string).trim());
}

function _scoreCanonical(cf: Record<string, unknown>): number {
  const strMin = (v: unknown) => typeof v === 'string' && (v as string).trim().length >= 8;
  const arrNonEmpty = (a: unknown, fn: (x: any) => boolean) => Array.isArray(a) && (a as any[]).some(fn);
  const mb: any = cf.maintaining_behaviors;
  const hasMb = mb && typeof mb === 'object' && ['avoidance', 'safety_behaviors', 'reassurance_seeking']
    .some((k) => Array.isArray(mb[k]) && mb[k].some((s: unknown) => typeof s === 'string' && (s as string).trim().length > 0));
  let score = 0;
  if (strMin(cf.presenting_problem) || arrNonEmpty(cf.presenting_themes, (t) => typeof t === 'string' && (t as string).trim().length > 0)) score += 1;
  if (strMin(cf.core_belief) || arrNonEmpty(cf.core_belief_hypotheses, (h: any) => h && typeof h === 'object' && strMin(h.belief))) score += 1;
  if (strMin(cf.maintaining_cycle) || hasMb) score += 1;
  if (strMin(cf.treatment_goals) || arrNonEmpty(cf.goals, (g) => typeof g === 'string' && (g as string).trim().length > 0)) score += 1;
  return score;
}

/**
 * Bounded agent-emitted update shape (signal flags only; no provenance).
 * Mirrors sanitizeCaseFormulationUpdateForClient in src/lib/caseFormulationValidator.js.
 */
function sanitizeCFU(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (r.cbt_domain !== undefined && r.cbt_domain !== null) out.cbt_domain = r.cbt_domain;
  const arrKeys = ['presenting_themes', 'triggers_situations', 'automatic_thought_themes', 'cognitive_distortions_observed', 'strengths_resources', 'goals', 'risk_flags'];
  for (const k of arrKeys) if (Array.isArray(r[k])) out[k] = r[k];
  const mb = r.maintaining_behaviors;
  if (mb && typeof mb === 'object' && !Array.isArray(mb)) out.maintaining_behaviors = mb;
  if (Array.isArray(r.core_belief_hypotheses)) out.core_belief_hypotheses = r.core_belief_hypotheses;
  const uc = r.understanding_confirmed;
  if (uc && typeof uc === 'object' && !Array.isArray(uc)) out.understanding_confirmed = { confirmed: (uc as any).confirmed === true };
  const pm = r.pending_move;
  if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
    out.pending_move = {
      ready: (pm as any).ready === true,
      rationale_clear: (pm as any).rationale_clear === true,
      move_id: typeof (pm as any).move_id === 'string' ? (pm as any).move_id : '',
      target_ref: typeof (pm as any).target_ref === 'string' ? (pm as any).target_ref : '',
      rationale: typeof (pm as any).rationale === 'string' ? (pm as any).rationale : '',
    };
  }
  const hc = r.holding_complete;
  if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
    out.holding_complete = {
      complete: (hc as any).complete === true,
      case_type: typeof (hc as any).case_type === 'string' ? (hc as any).case_type : '',
    };
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

/**
 * Validates a full upsert payload with server-stamped provenance.
 * Mirrors validateWriterPayload / validateCaseFormulationPayload in
 * src/lib/caseFormulationValidator.js (kept in sync — Deno cannot import src/).
 */
function validateStampedPayload(
  conversationId: string,
  sourceSessionId: string,
  sourceMessageId: string,
  cfu: Record<string, unknown> | null,
  now: string,
): { valid: boolean; payload: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    session_instance_id: sourceSessionId, // locked on the record
    source_last_message_id: sourceMessageId,
  };
  if (!cfu) {
    // No bounded update — still a valid upsert if canonical fields are present
    // in an existing record (handled by merge).  Here there is nothing to write.
    return { valid: false, payload, errors: ['case_formulation_update is required'] };
  }

  if (cfu.cbt_domain !== undefined && cfu.cbt_domain !== null) {
    if (_isStr(cfu.cbt_domain) && _DOMAIN_SET.has((cfu.cbt_domain as string).trim())) {
      payload.cbt_domain = (cfu.cbt_domain as string).trim();
    } else {
      errors.push('cbt_domain omitted: value is not one of the allowed 12 enum values');
    }
  }
  const arrKeys = ['presenting_themes', 'triggers_situations', 'automatic_thought_themes', 'cognitive_distortions_observed', 'strengths_resources', 'goals', 'risk_flags'];
  for (const k of arrKeys) {
    if (Array.isArray(cfu[k])) {
      payload[k] = (cfu[k] as unknown[]).filter((x) => typeof x === 'string' && (x as string).trim().length > 0);
    }
  }
  const rawMb: any = cfu.maintaining_behaviors;
  if (rawMb && typeof rawMb === 'object' && !Array.isArray(rawMb)) {
    const mb: Record<string, string[]> = {};
    for (const k of ['avoidance', 'safety_behaviors', 'reassurance_seeking']) {
      if (Array.isArray(rawMb[k])) mb[k] = rawMb[k].filter((x: unknown) => typeof x === 'string' && (x as string).trim().length > 0);
    }
    payload.maintaining_behaviors = mb;
  }
  if (Array.isArray(cfu.core_belief_hypotheses)) {
    payload.core_belief_hypotheses = (cfu.core_belief_hypotheses as any[])
      .filter((h) => h && typeof h === 'object' && _isStr(h.belief))
      .map((h) => ({
        belief: String(h.belief).trim(),
        evidence: typeof h.evidence === 'string' ? h.evidence : '',
        status: ['working_hypothesis', 'supported', 'revised'].includes(h.status) ? h.status : 'working_hypothesis',
      }));
  }

  // Canonical evidence required before any producer is accepted.
  const formedForScore: Record<string, unknown> = { ...payload };
  const hasCanon = _scoreCanonical(formedForScore) >= FORMULATION_MIN_USEFUL_FIELDS;

  const uc: any = cfu.understanding_confirmed;
  if (uc !== undefined && uc !== null) {
    if (uc && typeof uc === 'object' && !Array.isArray(uc)) {
      if (!hasCanon) errors.push('understanding_confirmed refused: insufficient canonical formulation evidence');
      else if (_isBool(uc.confirmed)) {
        payload.understanding_confirmed = {
          confirmed: uc.confirmed === true,
          session_id: sourceSessionId,
          turn_id: '',
          confirmed_at: now,
        };
      } else errors.push('understanding_confirmed omitted: invalid shape');
    } else errors.push('understanding_confirmed omitted: not an object');
  }

  const pm: any = cfu.pending_move;
  if (pm !== undefined && pm !== null) {
    if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
      if (!hasCanon) errors.push('pending_move refused: insufficient canonical formulation evidence');
      else {
        const sanitized: Record<string, unknown> = {
          ready: pm.ready === true,
          rationale_clear: pm.rationale_clear === true,
          move_id: _isStr(pm.move_id) ? String(pm.move_id).trim() : '',
          target_ref: _isStr(pm.target_ref) ? String(pm.target_ref).trim() : '',
          rationale: _isStr(pm.rationale) ? String(pm.rationale).trim() : '',
          session_id: sourceSessionId,
          set_at: now,
        };
        if (sanitized.rationale_clear === true && !(sanitized.move_id && sanitized.target_ref && sanitized.rationale)) {
          errors.push('pending_move.rationale_clear refused: requires move_id, target_ref, and rationale');
          sanitized.rationale_clear = false;
        }
        payload.pending_move = sanitized;
      }
    } else errors.push('pending_move omitted: not an object');
  }

  const hc: any = cfu.holding_complete;
  if (hc !== undefined && hc !== null) {
    if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
      if (!hasCanon) errors.push('holding_complete refused: insufficient canonical formulation evidence');
      else if (_isBool(hc.complete)) {
        const caseType = _isStr(hc.case_type) ? String(hc.case_type).trim() : '';
        if (caseType && !HIGH_PROTECTION_CASE_TYPES.includes(caseType)) {
          errors.push('holding_complete omitted: case_type is not a HIGH-protection type');
        } else {
          payload.holding_complete = {
            complete: hc.complete === true,
            session_id: sourceSessionId,
            case_type: caseType,
            completed_at: now,
          };
        }
      } else errors.push('holding_complete omitted: invalid shape');
    } else errors.push('holding_complete omitted: not an object');
  }

  return { valid: errors.length === 0, payload, errors };
}

/**
 * Correction 2 — server-owned readiness signals are recomputed server-side and
 * never trusted from the client payload.  Returns the bounded list of signals
 * that were forced to their safe (false) value because no server-authoritative
 * source was available to confirm them.
 *
 * rationale_is_clear is recomputed from the STORED formulation target: the
 * pending_move.target_ref must bind to an entry in goals[] or to a
 * core_belief_hypotheses[].belief of the effective formulation.  The client
 * `rationale_clear` claim is never trusted to mint the signal.
 *
 * holding_complete has no trusted safety/containment state machine reachable
 * from this backend writer (Base44 exposes no server-side agent-safety-state
 * read API), so the client `complete` flag is never trusted; the signal is
 * persisted as false and classified as blocked so the canary is observable.
 */
function enforceServerOwnedSignals(
  payload: Record<string, unknown>,
  formulationForBinding: Record<string, unknown> | null,
): string[] {
  const blocked: string[] = [];
  const pm: any = payload.pending_move;
  if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
    if (pm.rationale_clear === true) {
      const targetRef = typeof pm.target_ref === 'string' ? String(pm.target_ref).trim() : '';
      if (!_targetBoundToFormulation(targetRef, formulationForBinding)) {
        pm.rationale_clear = false;
        blocked.push('rationale_is_clear');
      }
    }
  }
  const hc: any = payload.holding_complete;
  if (hc && typeof hc === 'object' && !Array.isArray(hc)) {
    if (hc.complete === true) {
      hc.complete = false;
      blocked.push('holding_complete');
    }
  }
  return blocked;
}

function _targetBoundToFormulation(targetRef: string, formulation: Record<string, unknown> | null): boolean {
  if (!targetRef || !formulation || typeof formulation !== 'object') return false;
  const goals = Array.isArray((formulation as any).goals) ? (formulation as any).goals : [];
  for (const g of goals) {
    if (typeof g === 'string' && g.trim() === targetRef) return true;
  }
  const cbh = Array.isArray((formulation as any).core_belief_hypotheses) ? (formulation as any).core_belief_hypotheses : [];
  for (const h of cbh) {
    if (h && typeof h === 'object' && typeof h.belief === 'string' && String(h.belief).trim() === targetRef) return true;
  }
  return false;
}

function buildGateStatus(readEnv: (n: string) => string | undefined): {
  enabled: boolean;
  checked: string[];
  missing: string[];
  mode: string;
} {
  const mode = readEnv(RUNTIME_APPLY_ENV) === 'true' ? 'runtime_authority' : 'legacy';
  const checked: string[] = [];
  const missing: string[] = [];
  if (mode === 'runtime_authority') {
    const m = readEnv(VITE_MASTER_ENV);
    const k = readEnv(VITE_KNOWLEDGE_ENV);
    checked.push(VITE_MASTER_ENV, VITE_KNOWLEDGE_ENV, RUNTIME_APPLY_ENV);
    if (m !== 'true') missing.push(VITE_MASTER_ENV);
    if (k !== 'true') missing.push(VITE_KNOWLEDGE_ENV);
    return { enabled: m === 'true' && k === 'true', checked, missing, mode };
  }
  const m = readEnv(MASTER_FLAG_ENV);
  const k = readEnv(KNOWLEDGE_FLAG_ENV);
  checked.push(MASTER_FLAG_ENV, KNOWLEDGE_FLAG_ENV);
  if (m !== 'true') missing.push(MASTER_FLAG_ENV);
  if (k !== 'true') missing.push(KNOWLEDGE_FLAG_ENV);
  return { enabled: m === 'true' && k === 'true', checked, missing, mode };
}

function appendUpdateLog(existingLog: unknown, date: string, evidence: string): object[] {
  const log = Array.isArray(existingLog) ? (existingLog as object[]) : [];
  const entry = { date, change: 'case_formulation_update', evidence };
  // Bound the log to avoid unbounded growth.
  const next = [...log, entry];
  return next.slice(-25);
}

Deno.serve(async (req) => {
  const gate = buildGateStatus((n) => Deno.env.get(n));
  if (!gate.enabled) {
    // Report the exact blocker and stay fail-closed.  Never silently disabled.
    return Response.json(
      {
        success: false,
        error: 'V10 knowledge write is not enabled.',
        gated: true,
        status_code: 'gate_closed',
        flag_status: { mode: gate.mode, checked: gate.checked, missing: gate.missing },
        limitation: 'Base44 backend SDK does not expose an agent-conversation/message read API; message-belonging/finality is enforced at the client lifecycle boundary; conversation ownership + session immutability + canonical evidence + idempotency are enforced server-side.',
      },
      { status: 503 },
    );
  }
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized', status_code: 'unauthorized' }, { status: 401 });
    }
    let rawInput: Record<string, unknown>;
    try {
      rawInput = await req.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid JSON body.', status_code: 'bad_json' }, { status: 400 });
    }

    // Identity contract — distinct, required.
    const conversationId = _isStr(rawInput.conversation_id) ? String(rawInput.conversation_id).trim() : '';
    const sourceSessionId = _isStr(rawInput.source_session_id) ? String(rawInput.source_session_id).trim() : '';
    const sourceMessageId = _isStr(rawInput.source_message_id) ? String(rawInput.source_message_id).trim() : '';
    const sourceTurnId = _isStr(rawInput.source_turn_id) ? String(rawInput.source_turn_id).trim() : '';
    if (!conversationId || !sourceSessionId || !sourceMessageId) {
      return Response.json({ success: false, error: 'conversation_id, source_session_id, and source_message_id are all required and must be non-empty.', status_code: 'missing_identity', errors: ['invalid id (conversation_id/source_session_id/source_message_id)'] }, { status: 400 });
    }
    // Identity separation: a message id must never be used as a session id.
    if (sourceSessionId === sourceMessageId) {
      return Response.json({ success: false, error: 'source_session_id must not equal source_message_id (identity separation).', status_code: 'identity_collision' }, { status: 400 });
    }
    const cfu = sanitizeCFU(rawInput.case_formulation_update);
    if (!cfu) {
      return Response.json({ success: false, error: 'case_formulation_update is required.', status_code: 'no_update', errors: ['case_formulation_update required'] }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { valid, payload, errors } = validateStampedPayload(conversationId, sourceSessionId, sourceMessageId, cfu, now);
    if (!valid) {
      return Response.json({ success: false, error: 'Invalid payload', errors, status_code: 'invalid_payload' }, { status: 400 });
    }

    // Read the existing record under authenticated RLS (user-scoped).
    let existing: Record<string, unknown> | null = null;
    try {
      const listFn = typeof base44.entities.CaseFormulation.filter === 'function' ? 'filter' : 'list';
      const result = listFn === 'filter'
        ? await base44.entities.CaseFormulation.filter({ conversation_id: conversationId }, '-created_date', 1)
        : await base44.entities.CaseFormulation.list('-created_date', 1);
      const items = Array.isArray(result) ? result : (result && Array.isArray((result as any).results) ? (result as any).results : []);
      if (items.length > 0 && items[0] && typeof items[0] === 'object') {
        existing = items[0] as Record<string, unknown>;
      }
    } catch (fetchErr) {
      const m = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('[upsertCaseFormulation] Existing-record read failed:', m);
      return Response.json({ success: false, error: 'Existing record read failed.', status_code: 'read_error' }, { status: 500 });
    }

    // CONVERSATION OWNERSHIP + SESSION IMMUTABILITY (re-verified server-side).
    if (existing) {
      // Ownership is RLS-enforced: a record returned here belongs to this user.
      const existingSid = _isStr(existing.session_instance_id) ? String(existing.session_instance_id).trim() : '';
      if (existingSid && existingSid !== sourceSessionId) {
        // The conversation's session_instance_id is LOCKED.  A client claim of a
        // different session cannot reassign it.  This blocks cross-session
        // (cross-conversation) contamination of the formulation writer.
        return Response.json({ success: false, error: 'session_instance_id is immutable on this record; source_session_id does not match.', status_code: 'session_mismatch' }, { status: 403 });
      }
      // Idempotency: replay of an already-logged finalized message → no-op.
      const log = Array.isArray(existing.update_log) ? (existing.update_log as Array<Record<string, unknown>>) : [];
      const alreadyLogged = log.some((e) => e && typeof e === 'object' && e.change === 'case_formulation_update' && String(e.evidence || '') === sourceMessageId);
      if (alreadyLogged) {
        return Response.json({ success: true, id: existing.id, upserted: 'idempotent', status_code: 'idempotent' });
      }
      // Merge: canonical content last-wins; producers supplant older (the
      // incoming event is verified newer via the server `now` stamp on set_at).
      const merged: Record<string, unknown> = { ...existing, ...payload, conversation_id: conversationId };
      merged.session_instance_id = existingSid || sourceSessionId;
      merged.source_last_message_id = sourceMessageId;
      merged.last_updated = now;
      merged.update_log = appendUpdateLog(existing.update_log, now, sourceMessageId);
      // Correction 2: enforce server-owned readiness signals against the stored
      // formulation (merged includes existing goals/beliefs + this payload).
      const blocked = enforceServerOwnedSignals(merged, merged);
      try {
        const updated = await base44.entities.CaseFormulation.update(existing.id as string, merged);
        return Response.json({ success: true, id: (updated && updated.id) || existing.id, upserted: 'updated', status_code: 'updated', blocked_signals: blocked });
      } catch (writeErr) {
        const m = writeErr instanceof Error ? writeErr.message : String(writeErr);
        return Response.json({ success: false, error: m, status_code: 'write_error' }, { status: 500 });
      }
    }

    // NEW record: created under the user's own email (RLS create).  The
    // session_instance_id is stamped from the verified source_session_id and
    // locked for all future writes to this conversation_id.
    const record: Record<string, unknown> = {
      ...payload,
      conversation_id: conversationId,
      session_instance_id: sourceSessionId,
      source_last_message_id: sourceMessageId,
      last_updated: now,
      update_log: appendUpdateLog([], now, sourceMessageId),
    };
    if (sourceTurnId) record.source_turn_id = sourceTurnId;
    // Correction 2: enforce server-owned readiness signals against the
    // formulation being created (its own goals/beliefs).
    const blocked = enforceServerOwnedSignals(record, record);
    try {
      const created = await base44.entities.CaseFormulation.create(record);
      return Response.json({ success: true, id: created && created.id, upserted: 'created', status_code: 'created', blocked_signals: blocked });
    } catch (writeErr) {
      const m = writeErr instanceof Error ? writeErr.message : String(writeErr);
      return Response.json({ success: false, error: m, status_code: 'write_error' }, { status: 500 });
    }
  } catch (error) {
    const m = error instanceof Error ? error.message : String(error);
    console.error('[upsertCaseFormulation] Unexpected error:', m);
    return Response.json({ success: false, error: m, status_code: 'internal_error' }, { status: 500 });
  }
});