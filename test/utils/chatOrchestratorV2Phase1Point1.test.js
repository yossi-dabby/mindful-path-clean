import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceTurnStatus,
  buildV2DebugDiagnostic,
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';
import { shouldSuppressSubscriptionEventWhileLoading } from '../../src/lib/chatRuntimeLifecycle.js';
import { isChatOrchestratorV2Enabled } from '../../src/lib/featureFlags.js';

const CONV_ID = 'conv-phase1-001';

function makeUserMsg(id = 'u1') {
  return { role: 'user', id, content: '[user]' };
}

function makeAssistantMsg(id = 'a1', createdAt = '2026-08-04T00:00:00.000Z') {
  return { role: 'assistant', id, content: '[assistant]', created_at: createdAt };
}

function makeSnapshot(...msgs) {
  return msgs;
}

function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => { store.set(key, value); }),
    removeItem: vi.fn((key) => { store.delete(key); }),
    clear: vi.fn(() => store.clear()),
  };
}

describe('Chat Orchestrator V2 Phase 1.1', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('V2 activation proof — flag getter returns boolean and coordinator is created', () => {
    expect(typeof isChatOrchestratorV2Enabled()).toBe('boolean');
    expect(createChatOrchestratorV2()).toBeTruthy();
  });

  it('initializeBaseline does NOT clear an active generating turn', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.initializeBaseline(makeSnapshot(makeUserMsg('u-hist'), makeAssistantMsg('a-hist')));
    expect(coord.getActiveTurn()?.client_request_id).toBe(turn.client_request_id);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);
  });

  it('resetForConversationChange clears coordinator state', () => {
    const coord = createChatOrchestratorV2();
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.resetForConversationChange();
    expect(coord.getActiveTurn()).toBeNull();
    expect(coord.getPendingTurnCount()).toBe(0);
  });

  it('reload while generation pending restores pending state', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.persistActiveForReload(CONV_ID);

    const restored = createChatOrchestratorV2();
    const active = restored.restoreAfterReload(CONV_ID);
    expect(active?.client_request_id).toBe(turn.client_request_id);
    expect(active?.status).toBe(TURN_STATUS.PENDING);
  });

  it('response arrives during reload and reconcileSnapshot commits', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markTimedOut(turn.client_request_id);
    coord.persistActiveForReload(CONV_ID);

    const restored = createChatOrchestratorV2();
    restored.restoreAfterReload(CONV_ID);
    const result = restored.reconcileSnapshot({
      snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()),
      deliverySource: 'hydration',
    });
    expect(result.accepted).toBe(true);
    expect(result.restored_after_reload).toBe(true);
  });

  it('timed_out + new send starts immediately and stale old response is rejected', () => {
    const coord = createChatOrchestratorV2();
    const executeNew = vi.fn(async () => {});
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markTimedOut(turn.client_request_id);
    const nextSend = coord.registerSend({ conversationId: CONV_ID, executeSend: executeNew });
    expect(nextSend.queued).toBe(false);
    expect(nextSend.turn).toBeTruthy();
    coord.markGenerating(nextSend.turn.client_request_id);

    const result = coord.reconcileSnapshot({
      snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()),
      deliverySource: 'subscription',
      clientRequestId: turn.client_request_id,
    });
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('stale_previous_turn_response');
    expect(result.stale_client_request_id).toBe(turn.client_request_id);
    expect(result.active_client_request_id).toBe(nextSend.turn.client_request_id);
    expect(result._nextQueuedSend).toBeUndefined();
    expect(executeNew).not.toHaveBeenCalled();
  });

  it('polling success path is accepted', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    const result = coord.reconcileSnapshot({ snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()), deliverySource: 'polling' });
    expect(result.accepted).toBe(true);
  });

  it('polling error path markFailed returns next drain item', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    const next = coord.markFailed(turn.client_request_id);
    expect(next).not.toBeNull();
    expect(typeof next.executeSend).toBe('function');
  });

  it('public API has no _drainQueue method', () => {
    const coord = createChatOrchestratorV2();
    expect('_drainQueue' in coord).toBe(false);
  });

  it('one response and one feedback identity per turn', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    const result = coord.reconcileSnapshot({ snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()), deliverySource: 'polling' });
    expect(coord.getFeedbackIdentity(turn.client_request_id)).toBe(result.feedback_identity);
    const dup = coord.reconcileSnapshot({ snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()), deliverySource: 'subscription' });
    expect(dup.response_deduplicated).toBe(true);
    expect(coord.getFeedbackIdentity(turn.client_request_id)).toBe(result.feedback_identity);
  });

  it('exact flag-off parity for shouldSuppressSubscriptionEventWhileLoading is preserved', () => {
    expect(shouldSuppressSubscriptionEventWhileLoading(true)).toBe(true);
    expect(shouldSuppressSubscriptionEventWhileLoading(false)).toBe(false);
  });

  it('late_response_recovered=true only when pre-reconcile state was timed_out', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    const normal = coord.reconcileSnapshot({ snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()), deliverySource: 'polling' });
    expect(normal.late_response_recovered).toBe(false);
  });

  it('restored_after_reload=true when turn was restored from sessionStorage', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.persistActiveForReload(CONV_ID);
    const restored = createChatOrchestratorV2();
    restored.restoreAfterReload(CONV_ID);
    const result = restored.reconcileSnapshot({ snapshot: makeSnapshot(makeUserMsg(), makeAssistantMsg()), deliverySource: 'polling' });
    expect(result.restored_after_reload).toBe(true);
  });

  it('TIMED_OUT + markFailed transitions to FAILED', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markTimedOut(turn.client_request_id);
    coord.markFailed(turn.client_request_id);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.FAILED);
  });

  it('abandoned turn releases queue', async () => {
    const coord = createChatOrchestratorV2();
    const executeQueued = vi.fn(async () => {});
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeQueued });
    const next = coord.abandon(turn.client_request_id);
    expect(coord.getActiveTurn()?.client_request_id).toBe(next.turn.client_request_id);
    await next.executeSend();
    expect(executeQueued).toHaveBeenCalledOnce();
  });

  it('buildV2DebugDiagnostic includes new recovery fields and v2_enabled', () => {
    const diag = buildV2DebugDiagnostic({
      orchestrator_version: 'v2',
      v2_enabled: true,
      restored_after_reload: true,
      recovery_result: 'restored_and_committed',
    });
    expect(diag.v2_enabled).toBe(true);
    expect(diag.restored_after_reload).toBe(true);
    expect(diag.recovery_result).toBe('restored_and_committed');
  });

  it('advanceTurnStatus allows timed_out to advance to completed/failed/abandoned', () => {
    const turn = { status: TURN_STATUS.TIMED_OUT };
    expect(advanceTurnStatus(turn, TURN_STATUS.COMPLETED).status).toBe(TURN_STATUS.COMPLETED);
    expect(advanceTurnStatus(turn, TURN_STATUS.FAILED).status).toBe(TURN_STATUS.FAILED);
    expect(advanceTurnStatus(turn, TURN_STATUS.ABANDONED).status).toBe(TURN_STATUS.ABANDONED);
  });
});
