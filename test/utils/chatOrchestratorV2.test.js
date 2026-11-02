/**
 * @file test/utils/chatOrchestratorV2.test.js
 *
 * Phase 1 — Integration-style tests for the canonical V2 turn coordinator.
 *
 * Tests use the actual exported coordinator (no implementation duplication).
 * All test data is synthetic — no real user content, PII, or clinical material.
 *
 * Coverage matrix:
 *   1. Normal one-turn flow — pending → sent → generating → completed
 *   2. Two rapid user sends — second is queued, drained after first completes
 *   3. Subscription response while loading (reconcile during generating state)
 *   4. Polling and subscription deliver duplicate — dedup guard
 *   5. Hydration snapshot during generation
 *   6. Stale response arriving after a newer turn
 *   7. Polling timeout followed by late subscription recovery
 *   8. One user turn → exactly one assistant response committed
 *   9. One assistant response → exactly one feedback identity
 *  10. Flag off → exact Phase 0 legacy behavior (shouldSuppressSubscriptionEventWhileLoading)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  createTurnRecord,
  generateClientRequestId,
  advanceTurnStatus,
  buildV2DebugDiagnostic,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';
import { shouldSuppressSubscriptionEventWhileLoading } from '../../src/lib/chatRuntimeLifecycle.js';
import { isChatOrchestratorV2Enabled } from '../../src/lib/featureFlags.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-test-001';

function makeUserMsg(id = 'u1') {
  return { role: 'user', id, content: '[test user message]' };
}

function makeAssistantMsg(id = 'a1', createdAt = '2026-08-03T00:00:00.000Z') {
  return { role: 'assistant', id, created_at: createdAt, content: '[test assistant response]' };
}

function makeSnapshot(userMsgs, assistantMsgs) {
  return [...userMsgs, ...assistantMsgs];
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 1 V2 turn coordinator — normal one-turn flow', () => {
  it('advances through pending → sent → generating → completed', () => {
    const coord = createChatOrchestratorV2();

    // Register send — creates active turn in pending state.
    const { turn, queued } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    expect(queued).toBe(false);
    expect(turn).not.toBeNull();
    expect(turn.status).toBe(TURN_STATUS.PENDING);
    expect(typeof turn.client_request_id).toBe('string');
    expect(turn.client_request_id).toMatch(/^crid-/);

    // Record user message id after SDK call.
    coord.recordUserMessageId(turn.client_request_id, 'msg-123');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.SENT);
    expect(coord.getActiveTurn().user_message_id).toBe('msg-123');

    // Mark generating on first poll.
    coord.markGenerating(turn.client_request_id);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Reconcile a snapshot containing an assistant response.
    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(typeof result.committed_response_key).toBe('string');
    expect(typeof result.feedback_identity).toBe('string');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });
});

describe('Phase 1 V2 turn coordinator — two rapid user sends', () => {
  it('queues second send when first is active; drains queue after first completes', async () => {
    const coord = createChatOrchestratorV2();
    const executed = [];
    const executeSend2 = vi.fn(async () => { executed.push('send2'); });

    // First send — active.
    const { turn: turn1, queued: q1 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => { executed.push('send1'); },
    });
    expect(q1).toBe(false);
    expect(coord.getPendingTurnCount()).toBe(0);

    // Second send — should be queued.
    const { turn: turn2, queued: q2 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: executeSend2,
    });
    expect(q2).toBe(true);
    expect(turn2).toBeNull();
    expect(coord.getPendingTurnCount()).toBe(1);

    // First turn completes — reconcile commits the response.
    coord.markGenerating(turn1.client_request_id);
    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    expect(result.accepted).toBe(true);

    // reconcileSnapshot returns the drainQueue result as _nextQueuedSend.
    expect(typeof result._nextQueuedSend).toBe('function');
    expect(coord.getPendingTurnCount()).toBe(0);

    // Caller drains the queue.
    await result._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
    expect(executed).toContain('send2');
  });
});

describe('Phase 1 V2 turn coordinator — subscription while loading (generating)', () => {
  it('accepts a subscription snapshot while the turn is in generating state', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(result.delivery_source).toBe('subscription');
  });
});

describe('Phase 1 V2 turn coordinator — polling and subscription duplicate', () => {
  it('deduplicates the same assistant response from polling and subscription', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);

    // First delivery — polling commits the response.
    const r1 = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    expect(r1.accepted).toBe(true);
    expect(r1.response_correlated).toBe(true);

    // Second delivery — subscription delivers the same response.
    const r2 = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(r2.accepted).toBe(true);
    expect(r2.response_deduplicated).toBe(true);
    expect(r2.response_correlated).toBe(false);
    // Committed response key is still tracked.
    expect(r2.committed_response_key).toBe(r1.committed_response_key);
  });
});

describe('Phase 1 V2 turn coordinator — hydration during generation', () => {
  it('accepts a hydration snapshot while generating and commits the response', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot(
      [makeUserMsg('u1')],
      [makeAssistantMsg('a-hydrate', '2026-08-03T01:00:00.000Z')],
    );
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'hydration' });
    expect(result.accepted).toBe(true);
    expect(result.delivery_source).toBe('hydration');
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });
});

describe('Phase 1 V2 turn coordinator — stale response after a newer turn', () => {
  it('rejects a shorter snapshot as stale after a newer turn has committed a longer snapshot', () => {
    const coord = createChatOrchestratorV2();
    const { turn: turn1 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn1.client_request_id);

    // First turn commits 2 messages.
    const snapshot1 = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);
    coord.reconcileSnapshot({ snapshot: snapshot1, deliverySource: 'polling' });

    // Register second turn.
    const { turn: turn2 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn2.client_request_id);

    // Now deliver a snapshot shorter than the baseline — should be rejected.
    const staleSnapshot = [makeUserMsg('u1')]; // only 1 message
    const result = coord.reconcileSnapshot({ snapshot: staleSnapshot, deliverySource: 'polling' });
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('snapshot_shorter_than_baseline');
  });
});

describe('Phase 1 V2 turn coordinator — polling timeout + late subscription recovery', () => {
  it('timeout leaves turn in timed_out (recoverable) state; late subscription commits response', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    // Polling exhausted — mark timed out.
    const diag = coord.markTimedOut(turn.client_request_id);
    expect(diag.polling_exhausted).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.TIMED_OUT);

    // Late subscription arrives — reconcile should still commit the response.
    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a-late')]);
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });
});

describe('Phase 1 V2 turn coordinator — one turn → exactly one response', () => {
  it('commits at most one assistant response per turn', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);

    // First reconcile commits.
    const r1 = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    expect(r1.response_correlated).toBe(true);

    // Second reconcile with a different assistant message — should be rejected (turn_already_completed).
    const snapshot2 = makeSnapshot(
      [makeUserMsg('u1')],
      [makeAssistantMsg('a1'), makeAssistantMsg('a2', '2026-08-03T02:00:00.000Z')],
    );
    const r2 = coord.reconcileSnapshot({ snapshot: snapshot2, deliverySource: 'polling' });
    // The turn is already COMPLETED. A new unique response key hits the
    // turn_already_completed guard → accepted=false, response_correlated=false.
    expect(r2.accepted).toBe(false);
    expect(r2.rejected_reason).toBe('turn_already_completed');
    expect(r2.response_correlated).toBe(false);
  });
});

describe('Phase 1 V2 turn coordinator — two-phase lifecycle gating', () => {
  it('keeps the turn open after raw correlation until a later visible final snapshot commits', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const rawSnapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a-raw')]);
    const rawResult = coord.reconcileSnapshot({
      snapshot: rawSnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: false,
      rejectionReason: 'non_final_subscription_snapshot',
    });

    expect(rawResult.accepted).toBe(false);
    expect(rawResult.rejected_reason).toBe('visible_update_rejected');
    expect(rawResult.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    const finalSnapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a-final', '2026-08-03T03:00:00.000Z')]);
    const finalResult = coord.reconcileSnapshot({
      snapshot: finalSnapshot,
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });

    expect(finalResult.accepted).toBe(true);
    expect(finalResult.response_correlated).toBe(true);
    expect(finalResult.completion_terminal_reason).toBe('visible_terminal_result_committed');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });

  it('returns turn_already_completed only after a visible commit, never after raw correlation alone', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const rawSnapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a-raw')]);
    const rawResult = coord.reconcileSnapshot({
      snapshot: rawSnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: false,
      rejectionReason: 'non_final_subscription_snapshot',
    });
    expect(rawResult.rejected_reason).not.toBe('turn_already_completed');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    const visibleSnapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a-visible', '2026-08-03T04:00:00.000Z')]);
    const visibleCommit = coord.reconcileSnapshot({
      snapshot: visibleSnapshot,
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(visibleCommit.accepted).toBe(true);

    const duplicateAfterCommit = coord.reconcileSnapshot({
      snapshot: makeSnapshot(
        [makeUserMsg('u1')],
        [
          makeAssistantMsg('a-visible', '2026-08-03T04:00:00.000Z'),
          makeAssistantMsg('a-too-late', '2026-08-03T05:00:00.000Z'),
        ],
      ),
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(duplicateAfterCommit.accepted).toBe(false);
    expect(duplicateAfterCommit.rejected_reason).toBe('turn_already_completed');
  });
});

describe('Phase 1 V2 turn coordinator — one response → exactly one feedback identity', () => {
  it('produces exactly one feedback identity per committed assistant response', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot([makeUserMsg('u1')], [makeAssistantMsg('a1')]);
    const r1 = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    const feedbackId1 = coord.getFeedbackIdentity(turn.client_request_id);
    expect(typeof feedbackId1).toBe('string');
    expect(feedbackId1).toBe(r1.feedback_identity);

    // Duplicate delivery must not create a second feedback identity.
    const r2 = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(r2.response_deduplicated).toBe(true);
    const feedbackId2 = coord.getFeedbackIdentity(turn.client_request_id);
    expect(feedbackId2).toBe(feedbackId1);
  });
});

describe('Phase 1 V2 turn coordinator — flag off → Phase 0 legacy behavior', () => {
  it('VITE_CHAT_ORCHESTRATOR_V2_ENABLED defaults to false; Phase 0 suppression behavior unchanged', () => {
    // Flag must be false (default) in test environment.
    const v2Enabled = isChatOrchestratorV2Enabled();
    expect(v2Enabled).toBe(false);

    // Phase 0 subscription suppression behavior is unchanged.
    expect(shouldSuppressSubscriptionEventWhileLoading(true)).toBe(true);
    expect(shouldSuppressSubscriptionEventWhileLoading(false)).toBe(false);
  });
});

// ─── Unit: primitives and helpers ──────────────────────────────────────────────

describe('Phase 1 V2 helpers', () => {
  it('generateClientRequestId returns a crid-prefixed string', () => {
    const id = generateClientRequestId();
    expect(id).toMatch(/^crid-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('createTurnRecord produces a pending record with all required fields', () => {
    const rec = createTurnRecord({ conversationId: 'c-1' });
    expect(rec.status).toBe(TURN_STATUS.PENDING);
    expect(rec.conversation_id).toBe('c-1');
    expect(typeof rec.client_request_id).toBe('string');
    expect(typeof rec.created_at).toBe('string');
    expect(rec.committed_response_key).toBeNull();
    expect(rec.feedback_identity).toBeNull();
  });

  it('advanceTurnStatus is a pure function; does not mutate the original record', () => {
    const orig = createTurnRecord({ conversationId: 'c-1' });
    const advanced = advanceTurnStatus(orig, TURN_STATUS.SENT);
    expect(advanced.status).toBe(TURN_STATUS.SENT);
    expect(orig.status).toBe(TURN_STATUS.PENDING);
    expect(advanced).not.toBe(orig);
  });

  it('advanceTurnStatus ignores invalid transitions from terminal states', () => {
    const orig = createTurnRecord({ conversationId: 'c-1' });
    const completed = { ...orig, status: TURN_STATUS.COMPLETED };
    const result = advanceTurnStatus(completed, TURN_STATUS.PENDING);
    expect(result.status).toBe(TURN_STATUS.COMPLETED);
  });

  it('buildV2DebugDiagnostic includes only safe enumerable fields', () => {
    const diag = buildV2DebugDiagnostic({
      orchestrator_version: 'v2',
      client_request_id: 'crid-abc-123',
      generation_id: null,
      turn_status: 'completed',
      pending_turn_count: 0,
      delivery_source: 'polling',
      snapshot_accepted: true,
      snapshot_rejected_reason: 'no_active_turn',
      response_correlated: true,
      response_deduplicated: false,
      polling_exhausted: false,
      late_response_recovered: false,
    });
    expect(diag.orchestrator_version).toBe('v2');
    expect(diag.client_request_id).toBe('crid-abc-123');
    expect(diag.generation_id).toBeNull();
    expect(diag.turn_status).toBe('completed');
    expect(diag.pending_turn_count).toBe(0);
    expect(diag.snapshot_accepted).toBe(true);
    expect(diag.response_correlated).toBe(true);
    expect(diag.late_response_recovered).toBe(false);
    // Must not include user content, clinical data, or message text.
    expect('content' in diag).toBe(false);
    expect('message' in diag).toBe(false);
    expect('assistant_message' in diag).toBe(false);
  });

  it('getDiagnosticState returns privacy-safe coordinator state', () => {
    const coord = createChatOrchestratorV2();
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    const state = coord.getDiagnosticState();
    expect(state.orchestrator_version).toBe('v2');
    expect(typeof state.client_request_id).toBe('string');
    expect(state.turn_status).toBe(TURN_STATUS.PENDING);
    expect(state.pending_turn_count).toBe(0);
    expect('content' in state).toBe(false);
  });

  it('reset clears active turn and queue', () => {
    const coord = createChatOrchestratorV2();
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} }); // queued
    expect(coord.getPendingTurnCount()).toBe(1);
    coord.reset();
    expect(coord.getActiveTurn()).toBeNull();
    expect(coord.getPendingTurnCount()).toBe(0);
  });
});


describe('Phase 3 response policy scoping', () => {
  it('restores bounded policy state on reload', () => {
    const storage = new Map();
    globalThis.window = {
      sessionStorage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: (k) => storage.delete(k),
      },
    };
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.attachResponsePolicy(turn.client_request_id, {
      policy_version: 'response_policy_v1',
      policy_available: true,
      action_permitted: false,
      intervention_mode: 'structured_exploration',
      safety_override_required: false,
      reason_codes: ['action_not_permitted'],
      conversation_id: CONV_ID,
      client_request_id: turn.client_request_id,
      status: 'pending',
    });
    coord.persistActiveForReload(CONV_ID);
    const restored = createChatOrchestratorV2();
    const active = restored.restoreAfterReload(CONV_ID);
    expect(active.response_policy.policy_version).toBe('response_policy_v1');
    expect(active.response_policy.reason_codes).toEqual(['action_not_permitted']);
    delete globalThis.window;
  });
});
