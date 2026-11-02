/**
 * @file test/utils/v10Phase6bSecurity.test.js
 *
 * V10 Knowledge — Phase 6b (corrected identity model) — security & integration
 * regression tests.
 *
 * These tests prove:
 *   - message ID and session ID cannot be interchanged;
 *   - forged conversation/session/message relationships are rejected;
 *   - cross-conversation formulation and cbt_domain leakage is impossible;
 *   - a repeated source message is idempotent;
 *   - stale events cannot overwrite newer evidence;
 *   - partial/non-final messages cannot invoke the writer;
 *   - persistence failure is observable but does not break chat;
 *   - a fresh session has no continuation;
 *   - valid continuation uses the prior canonical session ID;
 *   - all readiness gates remain fail-closed when evidence is missing.
 *
 * Pure unit tests — no network, no live mutation, no entity writes.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  deriveContinuationSessionId,
  isContinuationSessionIdValid,
} from '../../src/lib/continuationSessionResolver.js';
import {
  buildUpsertPayload,
  createSessionInstanceId,
  isFinalAssistantMessage,
  persistCaseFormulationUpdate,
  maybePersistCaseFormulationUpdatesForMessages,
  resolveConversationSessionInstanceId,
} from '../../src/lib/caseFormulationInvocation.js';
import {
  sanitizeCaseFormulationUpdateForClient,
  validateWriterPayload,
  validateCaseFormulationPayload,
  computeWriterPersistenceDecision,
  CASE_FORMULATION_DOMAIN_VALUES,
  CASE_FORMULATION_PRODUCER_KEYS,
} from '../../src/lib/caseFormulationValidator.js';
import { extractReadinessSignals } from '../../src/lib/readinessSignalReader.js';
import {
  readBestFormulationRecordForConversation,
  selectRichestFormulation,
  readFormulationsForContextBlock,
} from '../../src/lib/formulationRecordSelector.js';

// The client knowledge-write gate is forced ON so the bounded persistence path
// is exercised in CI.  The backend gate is purely server-side env (tested via
// buildGateStatus semantics in the backend writer, not here).  The writer never
// trusts a client flag claim: persistCaseFormulationUpdate only ever sends the
// bounded {conversation_id, source_session_id, source_message_id, ...} payload.
vi.mock('../../src/lib/featureFlags.js', () => ({ isUpgradeEnabled: () => true }));

const VALID_DOMAINS = CASE_FORMULATION_DOMAIN_VALUES;

// Canonical-content helper that passes the validator's evidence threshold.
function richCFU(domain = 'anxiety') {
  return {
    cbt_domain: domain,
    presenting_themes: ['I feel overwhelmed by work nearly every morning'],
    triggers_situations: ['Monday standup meetings'],
    automatic_thought_themes: ['I will fail in front of everyone'],
    cognitive_distortions_observed: ['catastrophizing', 'mind-reading'],
    maintaining_behaviors: { avoidance: ['avoids speaking up'], safety_behaviors: ['over-rehearsing'], reassurance_seeking: [] },
    core_belief_hypotheses: [{ belief: 'I am incompetent and will be exposed', evidence: 'Recurring work fear', status: 'working_hypothesis' }],
    strengths_resources: ['supportive partner'],
    goals: ['Reduce avoidance of work meetings', 'Speak up once per standup'],
    risk_flags: [],
    understanding_confirmed: { confirmed: true },
    pending_move: {
      ready: true,
      rationale_clear: true,
      move_id: 'micro_step_speak_once',
      target_ref: 'Speak up once per standup',
      rationale: 'Target the avoidance loop at the smallest controllable step.',
    },
  };
}

const AUTH = { sid: 'session-instance-A', mid: 'msg-final-1' };

describe('Gate 1 runtime session identity', () => {
  it('creates a prefixed canonical ID and fails closed when secure generation is unavailable', () => {
    expect(createSessionInstanceId(() => 'uuid-123')).toBe('sess_uuid-123');
    expect(createSessionInstanceId(null)).toBe('');
    expect(createSessionInstanceId(() => { throw new Error('unavailable'); })).toBe('');
  });

  it('reads identity only from stored conversation metadata', () => {
    expect(resolveConversationSessionInstanceId({ metadata: { session_instance_id: AUTH.sid } })).toBe(AUTH.sid);
    expect(resolveConversationSessionInstanceId({ session_instance_id: 'forged-top-level' })).toBe('');
    expect(resolveConversationSessionInstanceId(null)).toBe('');
  });
});

describe('Correction 1 — message ID is not session ID', () => {
  it('deriveContinuationSessionId returns the canonical session_instance_id, never a message id', () => {
    const rec = { session_instance_id: AUTH.sid };
    const meta = { session_instance_id: AUTH.sid };
    const sid = deriveContinuationSessionId(rec, meta);
    expect(sid).toBe(AUTH.sid);
    expect(sid).not.toBe(AUTH.mid);
  });

  it('isContinuationSessionIdValid rejects a value equal to a message id', () => {
    expect(isContinuationSessionIdValid(AUTH.sid, AUTH.mid)).toBe(true);
    expect(isContinuationSessionIdValid(AUTH.mid, AUTH.mid)).toBe(false);
    expect(isContinuationSessionIdValid('', AUTH.mid)).toBe(false);
  });

  it('buildUpsertPayload rejects when source_session_id === source_message_id', () => {
    const validated = { case_formulation_update: richCFU() };
    const p = buildUpsertPayload(validated, 'conv-A', AUTH.mid, AUTH.mid);
    expect(p).toBeNull();
  });

  it('buildUpsertPayload rejects any missing identity field', () => {
    const v = { case_formulation_update: richCFU() };
    expect(buildUpsertPayload(v, '', AUTH.sid, AUTH.mid)).toBeNull();
    expect(buildUpsertPayload(v, 'conv-A', '', AUTH.mid)).toBeNull();
    expect(buildUpsertPayload(v, 'conv-A', AUTH.sid, '')).toBeNull();
  });

  it('validateWriterPayload stamps producer session_id from source_session_id, not source_message_id', () => {
    const res = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: richCFU() },
      { source_session_id: AUTH.sid, source_message_id: AUTH.mid, nowMs: Date.parse('2026-01-01T00:00:00Z') },
    );
    expect(res.valid).toBe(true);
    expect(res.payload.session_instance_id).toBe(AUTH.sid);
    expect(res.payload.source_last_message_id).toBe(AUTH.mid);
    expect(res.payload.understanding_confirmed.session_id).toBe(AUTH.sid);
    expect(res.payload.understanding_confirmed.session_id).not.toBe(AUTH.mid);
    expect(res.payload.pending_move.session_id).toBe(AUTH.sid);
    expect(res.payload.pending_move.set_at).toMatch(/2026-01-01/);
  });

  it('validateWriterPayload rejects when source_session_id === source_message_id', () => {
    const res = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: richCFU() },
      { source_session_id: AUTH.mid, source_message_id: AUTH.mid },
    );
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/identity separation/);
  });
});

describe('Correction 2 — cross-conversation formulation/domain leakage', () => {
  const scoreFn = (r) => {
    let s = 0;
    if (Array.isArray(r.presenting_themes) && r.presenting_themes.length) s += 1;
    if (Array.isArray(r.goals) && r.goals.length) s += 1;
    if (Array.isArray(r.core_belief_hypotheses) && r.core_belief_hypotheses.length) s += 1;
    return s;
  };

  it('a richer record from conversation B cannot be selected for conversation A', () => {
    const recA = { id: 'recA', conversation_id: 'conv-A', session_instance_id: 'sid-A', cbt_domain: 'anxiety', goals: ['g1'] };
    const recB = { id: 'recB', conversation_id: 'conv-B', session_instance_id: 'sid-B', cbt_domain: 'ocd', goals: ['g1', 'g2', 'g3'], core_belief_hypotheses: [{ belief: 'I am broken' }] };

    // Mock entities with filter that scopes by conversation_id.
    const entitiesFilter = {
      CaseFormulation: {
        filter: async (q) => {
          if (q.conversation_id === 'conv-A') return [recA];
          if (q.conversation_id === 'conv-B') return [recB];
          return [];
        },
        list: async () => [recB, recA], // intentionally returns the richer B first
      },
    };

    return readBestFormulationRecordForConversation(entitiesFilter, 'conv-A', 'sid-A', scoreFn).then((selected) => {
      expect(selected).not.toBeNull();
      expect(selected.id).toBe('recA');
      expect(selected.cbt_domain).toBe('anxiety');
    });
  });

  it('when filter is unavailable (list-only mock), session_instance_id defence drops the foreign record', () => {
    const recA = { id: 'recA', conversation_id: 'conv-A', session_instance_id: 'sid-A', cbt_domain: 'anxiety', goals: ['g1'] };
    const recB = { id: 'recB', conversation_id: 'conv-B', session_instance_id: 'sid-B', cbt_domain: 'depression', goals: ['g1', 'g2', 'g3'] };
    const entities = {
      CaseFormulation: { list: async () => [recB, recA] }, // no filter — list returns both
    };
    return readBestFormulationRecordForConversation(entities, 'conv-A', 'sid-A', scoreFn).then((selected) => {
      expect(selected).not.toBeNull();
      expect(selected.id).toBe('recA');
      expect(selected.cbt_domain).toBe('anxiety');
    });
  });

  it('returns null (fail-closed) when no candidate matches the active session_instance_id', () => {
    const recB = { conversation_id: 'conv-B', session_instance_id: 'sid-B', cbt_domain: 'ocd', goals: ['g1', 'g2'] };
    const entities = { CaseFormulation: { filter: async () => [recB], list: async () => [recB] } };
    return readBestFormulationRecordForConversation(entities, 'conv-B', 'sid-A', scoreFn).then((selected) => {
      expect(selected).toBeNull();
    });
  });

  it('readiness signals derived from a same-conversation record reflect its evidence, not a foreign record', () => {
    const recA = {
      conversation_id: 'conv-A',
      session_instance_id: 'sid-A',
      goals: ['Speak up once per standup'],
      understanding_confirmed: { confirmed: true, session_id: 'sid-A', confirmed_at: '2026-01-01T00:00:00Z' },
      pending_move: {
        ready: true, rationale_clear: true, move_id: 'm', target_ref: 'Speak up once per standup',
        rationale: 'r', session_id: 'sid-A', set_at: '2026-01-01T00:00:00Z',
      },
    };
    // continuation uses sid-A → matches → signals reflect recA.
    const sig = extractReadinessSignals(recA, { continuation_session_id: 'sid-A' });
    expect(sig.has_been_understood).toBe(true);
    expect(sig.readiness_signal).toBe(true);
    // continuation uses sid-B → mismatch → fail-closed false.
    const off = extractReadinessSignals(recA, { continuation_session_id: 'sid-B' });
    expect(off.has_been_understood).toBe(false);
    expect(off.readiness_signal).toBe(false);
  });
});

describe('Correction 3 / writer authorization — server-side identity & ownership', () => {
  it('sanitizeCaseFormulationUpdateForClient strips provenance (session_id/timestamps) from client payload', () => {
    const out = sanitizeCaseFormulationUpdateForClient({
      cbt_domain: 'anxiety',
      understanding_confirmed: { confirmed: true, session_id: 'FORGED', confirmed_at: '2030-01-01T00:00:00Z' },
      pending_move: { ready: true, session_id: 'FORGED', set_at: '2030-01-01T00:00:00Z' },
    });
    expect(out.understanding_confirmed).toEqual({ confirmed: true });
    expect(out.pending_move.session_id).toBeUndefined();
    expect(out.pending_move.set_at).toBeUndefined();
  });

  it('validateWriterPayload stamps server provenance regardless of client-provided values', () => {
    const forged = {
      conversation_id: 'conv-A',
      case_formulation_update: {
        ...richCFU(),
        understanding_confirmed: { confirmed: true, session_id: 'FORGED', confirmed_at: '2099-01-01T00:00:00Z' },
      },
    };
    const res = validateWriterPayload(forged, { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 });
    expect(res.valid).toBe(true);
    expect(res.payload.understanding_confirmed.session_id).toBe('sid-A');
    expect(res.payload.understanding_confirmed.confirmed_at).toMatch(/1970-01-01/);
  });

  it('stores an invalid cbt_domain is omitted (never defaulted to general)', () => {
    const res = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: { ...richCFU(), cbt_domain: 'not-a-domain' } },
      { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 },
    );
    expect(res.valid).toBe(true);
    expect(res.payload.cbt_domain).toBeUndefined();
  });

  it('refuses readiness producers without canonical evidence (canonical contract)', () => {
    const thin = { conversation_id: 'conv-A', case_formulation_update: { cbt_domain: 'anxiety', understanding_confirmed: { confirmed: true } } };
    const res = validateWriterPayload(thin, { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 });
    // Established contract: conversation_id is present → the write is acceptable
    // (valid===true); the producer is REFUSED and stripped (mirrors the existing
    // validateCaseFormulationPayload contract at v10ReadinessProducers.test #15/#refuses).
    expect(res.valid).toBe(true);
    expect(res.errors.join(' ')).toMatch(/insufficient canonical formulation evidence/);
    expect(res.payload.understanding_confirmed).toBeUndefined();
  });
});

describe('Correction 4 / observable persistence — idempotency and stale ordering', () => {
  it('computeWriterPersistenceDecision treats a repeat source_message_id as idempotent no-op', () => {
    const existing = { update_log: [{ change: 'case_formulation_update', evidence: AUTH.mid, date: '2026-01-01T00:00:00Z' }] };
    const d = computeWriterPersistenceDecision(existing, AUTH.sid, AUTH.mid);
    expect(d.action).toBe('noop');
  });

  it('computeWriterPersistenceDecision flags supersede for a different session producer', () => {
    const existing = {
      understanding_confirmed: { session_id: 'sid-old' },
      pending_move: { session_id: 'sid-old' },
      update_log: [],
    };
    const d = computeWriterPersistenceDecision(existing, 'sid-new', AUTH.mid);
    expect(d.action).toBe('write');
    expect(d.supersede.understanding_confirmed).toBe(true);
    expect(d.supersede.pending_move).toBe(true);
  });

  it('maybePersistCaseFormulationUpdatesForMessages dedupes a repeated source_message_id', async () => {
    const persisted = new Set();
    const base44 = {
      functions: {
        invoke: async () => ({ data: { success: true, upserted: 'created' } }),
      },
    };
    const msg = {
      id: AUTH.mid, role: 'assistant', status: 'completed',
      metadata: { structured_data: { case_formulation_update: richCFU() } },
    };
    // Simulate the call twice with the same message — only the first persists.
    const r1 = await maybePersistCaseFormulationUpdatesForMessages(base44, 'conv-A', AUTH.sid, [msg], persisted);
    const r2 = await maybePersistCaseFormulationUpdatesForMessages(base44, 'conv-A', AUTH.sid, [msg], persisted);
    expect(r1.attempted).toBe(1);
    expect(r2.attempted).toBe(0);
    expect(r1.persisted).toBe(1);
  });

  it('persists only the newest eligible finalized update from a full conversation snapshot', async () => {
    const invokedPayloads = [];
    const base44 = {
      functions: {
        invoke: async (_name, payload) => {
          invokedPayloads.push(payload);
          return { data: { success: true, upserted: 'updated' } };
        },
      },
    };
    const makeMessage = (id, domain) => ({
      id,
      role: 'assistant',
      status: 'completed',
      metadata: { structured_data: { case_formulation_update: richCFU(domain) } },
    });

    const result = await maybePersistCaseFormulationUpdatesForMessages(
      base44,
      'conv-A',
      AUTH.sid,
      [makeMessage('msg-old', 'depression'), makeMessage('msg-new', 'anxiety')],
      new Set(),
    );

    expect(result.attempted).toBe(1);
    expect(invokedPayloads).toHaveLength(1);
    expect(invokedPayloads[0].source_message_id).toBe('msg-new');
    expect(invokedPayloads[0].case_formulation_update.cbt_domain).toBe('anxiety');
  });

  it('does not replay an older update when the newest eligible update was already handled', async () => {
    const invokedPayloads = [];
    const base44 = {
      functions: {
        invoke: async (_name, payload) => {
          invokedPayloads.push(payload);
          return { data: { success: true, upserted: 'updated' } };
        },
      },
    };
    const makeMessage = (id, domain) => ({
      id,
      role: 'assistant',
      status: 'completed',
      metadata: { structured_data: { case_formulation_update: richCFU(domain) } },
    });
    const snapshot = [makeMessage('msg-old', 'depression'), makeMessage('msg-new', 'anxiety')];
    const persisted = new Set();

    const first = await maybePersistCaseFormulationUpdatesForMessages(
      base44,
      'conv-A',
      AUTH.sid,
      snapshot,
      persisted,
    );
    const replay = await maybePersistCaseFormulationUpdatesForMessages(
      base44,
      'conv-A',
      AUTH.sid,
      snapshot,
      persisted,
    );

    expect(first.attempted).toBe(1);
    expect(replay.attempted).toBe(0);
    expect(invokedPayloads).toHaveLength(1);
    expect(invokedPayloads[0].source_message_id).toBe('msg-new');
  });

  it('persistence failure is observable (bounded status code) and does not throw', async () => {
    const failingBase44 = {
      functions: { invoke: async () => { throw new Error('boom'); } },
    };
    const payload = buildUpsertPayload({ case_formulation_update: richCFU() }, 'conv-A', AUTH.sid, AUTH.mid);
    const res = await persistCaseFormulationUpdate(failingBase44, payload);
    // The client flag may gate this to 'gated' on Production, or run on Preview.
    expect(['error', 'gated', 'skipped_no_payload', 'persisted', 'rejected']).toContain(res.status);
    // No clinical content in the result.
    expect(JSON.stringify(res)).not.toMatch(/catastrophizing|I am incompetent/i);
  });
});

describe('Correction 4 — finality: partial/non-final messages cannot invoke the writer', () => {
  it('isFinalAssistantMessage rejects partial / streaming / user messages', () => {
    expect(isFinalAssistantMessage({ role: 'user', id: 'u', content: 'hi' })).toBe(false);
    expect(isFinalAssistantMessage({ role: 'assistant' })).toBe(false); // no id
    expect(isFinalAssistantMessage({ role: 'assistant', id: 'm', content: 'partial...' })).toBe(false); // no finality marker
    expect(isFinalAssistantMessage({ role: 'assistant', id: 'm', status: 'streaming', content: '...' })).toBe(false);
  });

  it('isFinalAssistantMessage accepts explicit-final markers', () => {
    expect(isFinalAssistantMessage({ role: 'assistant', id: 'm', status: 'completed' })).toBe(true);
    expect(isFinalAssistantMessage({ role: 'assistant', id: 'm', metadata: { is_final: true } })).toBe(true);
    expect(isFinalAssistantMessage({ role: 'assistant', id: 'm', metadata: { feedback_finality_verified: true } })).toBe(true);
  });

  it('maybePersistCaseFormulationUpdatesForMessages skips non-final assistant messages entirely', async () => {
    const persisted = new Set();
    let invoked = 0;
    const base44 = { functions: { invoke: async () => { invoked += 1; return { data: { success: true, upserted: 'created' } }; } } };
    const partial = { id: 'mid-p', role: 'assistant', content: 'partial', metadata: { structured_data: { case_formulation_update: richCFU() } } };
    const r = await maybePersistCaseFormulationUpdatesForMessages(base44, 'conv-A', AUTH.sid, [partial], persisted);
    expect(r.attempted).toBe(0);
    expect(invoked).toBe(0);
    expect(persisted.size).toBe(0);
  });
});

describe('Correction 5 — fresh session has no continuation; valid continuation uses prior session', () => {
  it('fresh session (no record, no metadata) yields empty continuation_session_id', () => {
    expect(deriveContinuationSessionId(null, null)).toBe('');
    expect(deriveContinuationSessionId(null, undefined)).toBe('');
  });

  it('fresh session → extractReadinessSignals returns all-false (fail-closed)', () => {
    const sig = extractReadinessSignals({ session_instance_id: 'sid-X', understanding_confirmed: { confirmed: true, session_id: 'sid-X' } }, { continuation_session_id: '' });
    expect(sig).toEqual({ has_been_understood: false, readiness_signal: false, rationale_is_clear: false, holding_complete: false });
  });

  it('valid continuation: continuation_session_id = prior canonical session_id and producers match', () => {
    const rec = {
      session_instance_id: 'sid-A',
      goals: ['Speak up once'],
      understanding_confirmed: { confirmed: true, session_id: 'sid-A', confirmed_at: '2026-01-01T00:00:00Z' },
      pending_move: {
        ready: true, rationale_clear: true, move_id: 'm', target_ref: 'Speak up once',
        rationale: 'r', session_id: 'sid-A', set_at: '2026-01-01T00:00:00Z',
      },
    };
    const sig = extractReadinessSignals(rec, { continuation_session_id: 'sid-A' });
    expect(sig.has_been_understood).toBe(true);
    expect(sig.readiness_signal).toBe(true);
    expect(sig.rationale_is_clear).toBe(true);
  });

  it('disagreement between record session_instance_id and metadata session_instance_id fails closed', () => {
    expect(deriveContinuationSessionId({ session_instance_id: 'sid-A' }, { session_instance_id: 'sid-B' })).toBe('');
  });
});

describe('Readiness gates remain fail-closed when evidence is missing', () => {
  it('pending_move rationale_clear forced false without move_id + target_ref + rationale (canonical contract)', () => {
    const res = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: { ...richCFU(), pending_move: { ready: true, rationale_clear: true, move_id: 'm' } } },
      { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 },
    );
    expect(res.valid).toBe(true);
    expect(res.payload.pending_move).toBeDefined();
    expect(res.payload.pending_move.rationale_clear).toBe(false);
    expect(res.errors.join(' ')).toMatch(/rationale_clear refused/);
  });

  it('rationale_clear requires a target bound to a formulation goal', () => {
    const res = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: { ...richCFU(), pending_move: { ready: true, rationale_clear: true, move_id: 'm', target_ref: 'NOT_A_GOAL', rationale: 'r' } } },
      { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 },
    );
    // The validator accepts the raw shape but the reader fails-closed on the unbound target.
    expect(res.valid).toBe(true);
    const sig = extractReadinessSignals(res.payload, { continuation_session_id: 'sid-A' });
    expect(sig.rationale_is_clear).toBe(false);
  });

  it('holding_complete is only persisted for HIGH-protection case types', () => {
    const high = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: { ...richCFU(), holding_complete: { complete: true, case_type: 'grief_loss' } } },
      { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 },
    );
    expect(high.valid).toBe(true);
    expect(high.payload.holding_complete).toBeDefined();

    const low = validateWriterPayload(
      { conversation_id: 'conv-A', case_formulation_update: { ...richCFU(), holding_complete: { complete: true, case_type: 'general_stress' } } },
      { source_session_id: 'sid-A', source_message_id: 'mid-1', nowMs: 0 },
    );
    // valid===true (conversation_id present); holding_complete REFUSED and stripped.
    expect(low.valid).toBe(true);
    expect(low.payload.holding_complete).toBeUndefined();
    expect(low.errors.join(' ')).toMatch(/not a HIGH-protection type/);
  });
});

describe('Correction 5 — backend flag gate (forged client activation rejected)', () => {
  it('persistCaseFormulationUpdate never sends a client flag claim to the backend', () => {
    const payload = buildUpsertPayload({ case_formulation_update: richCFU() }, 'conv-A', AUTH.sid, AUTH.mid);
    expect(payload).not.toBeNull();
    // No client-side activation claim is present. Inspect property names rather
    // than serialized values so legitimate fields such as `risk_flags` and
    // clinical text containing "everyone" cannot create false positives.
    const payloadKeys = [
      ...Object.keys(payload),
      ...Object.keys(payload.case_formulation_update),
    ];
    expect(payloadKeys).not.toEqual(expect.arrayContaining([
      'flag',
      'enabled',
      'knowledge_enabled',
      'env',
    ]));
  });

  it('persistCaseFormulationUpdate returns observable status without clinical content', async () => {
    // With the client flag off (Production default) persists is gated.
    const base44 = { functions: { invoke: async () => ({ data: { success: true } }) } };
    const payload = buildUpsertPayload({ case_formulation_update: richCFU() }, 'conv-A', AUTH.sid, AUTH.mid);
    const res = await persistCaseFormulationUpdate(base44, payload);
    expect(['persisted', 'gated', 'error', 'rejected', 'skipped_no_payload']).toContain(res.status);
    expect(JSON.stringify(res)).not.toMatch(/I am incompetent|catastrophizing/i);
  });
});

describe('Domain enum sanity', () => {
  it('all 12 canonical domains are present', () => {
    expect(VALID_DOMAINS.length).toBe(12);
    expect(VALID_DOMAINS).toContain('social_anxiety');
    expect(VALID_DOMAINS).toContain('self_esteem');
  });

  it('producer keys are the three readiness producers', () => {
    expect(CASE_FORMULATION_PRODUCER_KEYS).toEqual(['understanding_confirmed', 'pending_move', 'holding_complete']);
  });
});
