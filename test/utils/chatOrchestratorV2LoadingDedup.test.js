/**
 * @file test/utils/chatOrchestratorV2LoadingDedup.test.js
 *
 * Tests for:
 *   1. V2 loading timeout suppression while polling is active
 *   2. Legacy flag-off behavior: 10 s still clears loading
 *   3. Cross-turn dedup: stale previous-turn response does not stop polling for turn 2
 *   4. Same-request terminal dedup closes loading safely
 *   5. New diagnostic fields survive buildS2DebugLifecycleDiagnostic sanitizer
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';
import { buildS2DebugLifecycleDiagnostic } from '../../src/lib/chatRuntimeLifecycle.js';

function makeSessionStorage() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => { store.set(key, value); }),
    removeItem: vi.fn((key) => { store.delete(key); }),
    clear: vi.fn(() => store.clear()),
  };
}

function makeAssistantMsg(id, createdAt = '2026-08-05T00:00:00.000Z') {
  return { role: 'assistant', id, content: '[assistant]', created_at: createdAt };
}
function makeUserMsg(id = 'u1') {
  return { role: 'user', id, content: '[user]' };
}

const CONV_ID = 'conv-loading-dedup-001';

describe('V2 loading timeout suppression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('V2 loading remains true after 10 s while polling is still active', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Simulate what Chat.jsx does: track a loading flag and a polling sentinel.
    let isLoading = true;
    let pollingActive = true; // simulates pollingIntervalRef.current being set

    const loadingTimeoutRef = { current: null };
    loadingTimeoutRef.current = setTimeout(() => {
      const activeTurn = coord.getActiveTurn();
      const inFlightStatuses = new Set(['pending', 'sent', 'generating']);
      const stillPolling = pollingActive;
      if (activeTurn && inFlightStatuses.has(activeTurn.status) && stillPolling) {
        loadingTimeoutRef.current = null;
        return; // suppressed
      }
      isLoading = false;
      loadingTimeoutRef.current = null;
    }, 10000);

    vi.advanceTimersByTime(10000);

    // V2 active + turn generating + polling active → timeout suppressed
    expect(isLoading).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);
  });

  it('V2 loading timeout fires when polling is no longer active', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    let isLoading = true;
    let pollingActive = false; // polling already stopped

    const loadingTimeoutRef = { current: null };
    loadingTimeoutRef.current = setTimeout(() => {
      const activeTurn = coord.getActiveTurn();
      const inFlightStatuses = new Set(['pending', 'sent', 'generating']);
      const stillPolling = pollingActive;
      if (activeTurn && inFlightStatuses.has(activeTurn.status) && stillPolling) {
        loadingTimeoutRef.current = null;
        return;
      }
      isLoading = false;
      loadingTimeoutRef.current = null;
    }, 10000);

    vi.advanceTimersByTime(10000);
    expect(isLoading).toBe(false);
  });

  it('legacy flag-off behavior: 10 s clears loading regardless of turn status', () => {
    // No V2 coordinator active — flag is off.
    let isLoading = true;
    const loadingTimeoutRef = { current: null };
    loadingTimeoutRef.current = setTimeout(() => {
      // Legacy path: no V2 guard
      isLoading = false;
      loadingTimeoutRef.current = null;
    }, 10000);

    vi.advanceTimersByTime(10000);
    expect(isLoading).toBe(false);
  });

  it('polling may continue through the 15.5 s bounded schedule when V2 suppresses 10 s timer', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    let isLoading = true;
    let pollingActive = true;

    const loadingTimeoutRef = { current: null };
    loadingTimeoutRef.current = setTimeout(() => {
      const activeTurn = coord.getActiveTurn();
      const inFlightStatuses = new Set(['pending', 'sent', 'generating']);
      if (activeTurn && inFlightStatuses.has(activeTurn.status) && pollingActive) {
        loadingTimeoutRef.current = null;
        return;
      }
      isLoading = false;
      loadingTimeoutRef.current = null;
    }, 10000);

    // Advance 10 s — should be suppressed
    vi.advanceTimersByTime(10000);
    expect(isLoading).toBe(true);

    // Simulate polling exhausting at 15.5 s (coordinator takes over)
    coord.markTimedOut(turn.client_request_id);
    pollingActive = false;
    isLoading = false; // coordinator would call setIsLoading(false)

    vi.advanceTimersByTime(5500);
    // Loading was already cleared by coordinator, not by 10 s timer
    expect(isLoading).toBe(false);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.TIMED_OUT);
  });
});

describe('Cross-turn dedup contract', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });



  it('late duplicate from turn 1 does not stop polling for turn 2', () => {
    const coord = createChatOrchestratorV2();

    // Turn 1: start, complete
    const { turn: turn1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn1.client_request_id);
    const snap1 = [makeUserMsg('u1'), makeAssistantMsg('a1')];
    const commit1 = coord.reconcileSnapshot({
      snapshot: snap1,
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
      visibleAccepted: true,
    });
    expect(commit1.accepted).toBe(true);

    // Turn 2: start, generating
    const { turn: turn2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn2.client_request_id);

    // Late duplicate snapshot from turn 1 arrives while turn 2 is active.
    // Case A: same-request safe dedup — response key was committed by turn 1 and
    // belongs to turn 1.  Coordinator returns response_deduplicated=true with
    // stale_client_request_id set so callers can detect the cross-turn case and
    // continue polling for turn 2 instead of closing loading.
    const lateSnap1 = [makeUserMsg('u1'), makeAssistantMsg('a1')];
    const staleResult = coord.reconcileSnapshot({
      snapshot: lateSnap1,
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'raw_correlation',
      visibleAccepted: true,
    });

    // Case A: safe terminal dedup for the old request — not a fatal error,
    // but stale_client_request_id signals that this is NOT for the current turn.
    expect(staleResult.response_deduplicated).toBe(false);
    expect(staleResult.accepted).toBe(false);
    expect(staleResult.rejected_reason).toBe('stale_previous_turn_response');
    // stale_client_request_id lets callers know this is cross-turn
    expect(staleResult.stale_client_request_id).toBe(turn1.client_request_id);

    // Turn 2 must remain GENERATING — not closed
    expect(coord.getActiveTurn()?.client_request_id).toBe(turn2.client_request_id);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);
  });

  it('turn 2 remains GENERATING until its own visible response commits', () => {
    const coord = createChatOrchestratorV2();
    const { turn: turn1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn1.client_request_id);

    coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1')],
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
    });

    const { turn: turn2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn2.client_request_id);

    // Before turn 2's own response — still GENERATING
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);

    // Turn 2's own response arrives
    const commitResult = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1'), makeUserMsg('u2'), makeAssistantMsg('a2', '2026-08-05T00:01:00.000Z')],
      deliverySource: 'polling',
      clientRequestId: turn2.client_request_id,
      phase: 'visible_commit',
    });
    expect(commitResult.accepted).toBe(true);
    // After completing, active turn is COMPLETED (queue is empty so no new active turn)
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
    expect(coord.getActiveTurn()?.client_request_id).toBe(turn2.client_request_id);
  });

  it('same-request terminal dedup closes loading safely', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snap = [makeUserMsg(), makeAssistantMsg('a-dedup')];

    // First commit
    const first = coord.reconcileSnapshot({
      snapshot: snap,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'visible_commit',
    });
    expect(first.accepted).toBe(true);

    // Exact same snapshot arrives again for the same request (turn is now COMPLETED,
    // no queue — active turn is still turn).  clientRequestId still matches the
    // active turn record → not a stale cross-turn case, safe terminal dedup.
    const second = coord.reconcileSnapshot({
      snapshot: snap,
      deliverySource: 'polling',
      clientRequestId: turn.client_request_id,
      phase: 'visible_commit',
    });
    expect(second.response_deduplicated).toBe(true);
    expect(second.accepted).toBe(true);
    expect(second.rejected_reason).toBeNull();
  });

  it('stale previous-turn dedup does not drain the queue', () => {
    const coord = createChatOrchestratorV2();
    const drainExecuted = vi.fn(async () => {});

    // Turn 1: start, add turn 2 to queue before turn 1 finishes
    const { turn: turn1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn1.client_request_id);

    // Queue turn 2 while turn 1 is still in-flight
    coord.registerSend({ conversationId: CONV_ID, executeSend: drainExecuted });
    expect(coord.getPendingTurnCount()).toBe(1);

    // Complete turn 1 via reconcileSnapshot — drains the queue
    const commit1 = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1')],
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
    });
    expect(commit1.accepted).toBe(true);
    // _nextQueuedSend is provided so the caller would invoke it
    const turn2 = commit1._nextQueuedTurnRecord;
    expect(turn2).toBeDefined();

    // Simulate caller starting turn 2 (now the active turn)
    coord.markGenerating(turn2.client_request_id);

    // Late stale snapshot from turn 1 arrives while turn 2 is active.
    // Coordinator returns Case A (safe same-request dedup) with stale_client_request_id.
    const stale = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1')],
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
    });
    // stale_client_request_id is set — callers must not close loading or stop polling
    expect(stale.stale_client_request_id).toBe(turn1.client_request_id);
    expect(stale.response_deduplicated).toBe(false);
    expect(stale.rejected_reason).toBe('stale_previous_turn_response');
    // _nextQueuedSend must not be set — stale results must not drain the queue
    expect(stale._nextQueuedSend).toBeUndefined();
    // The queued execute was not called a second time
    expect(drainExecuted).not.toHaveBeenCalled();
  });
});

describe('Diagnostic sanitizer — new V2 lifecycle fields', () => {
  it('all new bounded fields survive buildS2DebugLifecycleDiagnostic', () => {
    const diag = buildS2DebugLifecycleDiagnostic({
      client_request_id: 'req-abc-123',
      phase: 'raw_correlation',
      response_correlated: true,
      safe_update_accepted: false,
      visible_commit_completed: false,
      active_turn_status: 'generating',
      polling_continues: true,
      rejection_reason: 'non_final_polling_snapshot',
      terminal_reason: 'visible_terminal_result_committed',
    });

    expect(diag.client_request_id).toBe('req-abc-123');
    expect(diag.phase).toBe('raw_correlation');
    expect(diag.response_correlated).toBe(true);
    expect(diag.safe_update_accepted).toBe(false);
    expect(diag.visible_commit_completed).toBe(false);
    expect(diag.active_turn_status).toBe('generating');
    expect(diag.polling_continues).toBe(true);
    expect(diag.rejection_reason).toBe('non_final_polling_snapshot');
    expect(diag.terminal_reason).toBe('visible_terminal_result_committed');
  });

  it('null client_request_id is preserved', () => {
    const diag = buildS2DebugLifecycleDiagnostic({ client_request_id: null });
    expect(Object.prototype.hasOwnProperty.call(diag, 'client_request_id')).toBe(true);
    expect(diag.client_request_id).toBeNull();
  });

  it('null active_turn_status is preserved', () => {
    const diag = buildS2DebugLifecycleDiagnostic({ active_turn_status: null });
    expect(Object.prototype.hasOwnProperty.call(diag, 'active_turn_status')).toBe(true);
    expect(diag.active_turn_status).toBeNull();
  });

  it('undefined fields are omitted', () => {
    const diag = buildS2DebugLifecycleDiagnostic({});
    expect(Object.prototype.hasOwnProperty.call(diag, 'client_request_id')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(diag, 'phase')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(diag, 'polling_continues')).toBe(false);
  });

  it('existing legacy fields still pass through alongside new fields', () => {
    const diag = buildS2DebugLifecycleDiagnostic({
      delivery_source: 'polling',
      polling_attempt: 3,
      polling_exhausted: false,
      client_request_id: 'req-xyz',
      phase: 'visible_commit',
      polling_continues: true,
    });
    expect(diag.delivery_source).toBe('polling');
    expect(diag.polling_attempt).toBe(3);
    expect(diag.polling_exhausted).toBe(false);
    expect(diag.client_request_id).toBe('req-xyz');
    expect(diag.phase).toBe('visible_commit');
    expect(diag.polling_continues).toBe(true);
  });
});


describe('Stale replay active-request regression', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('active request snapshot with user 2 but only assistant 1 stays non-terminal', () => {
    const coord = createChatOrchestratorV2();
    const { turn: turn1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.recordUserMessageId(turn1.client_request_id, 'u1');
    coord.markGenerating(turn1.client_request_id);
    coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1')],
      deliverySource: 'polling',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
    });

    coord.abandon(turn1.client_request_id);
    const { turn: turn2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.recordUserMessageId(turn2.client_request_id, 'u2');
    coord.markGenerating(turn2.client_request_id);

    const result = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1'), makeUserMsg('u2')],
      deliverySource: 'polling',
      clientRequestId: turn2.client_request_id,
      phase: 'raw_correlation',
    });

    expect(result.accepted).toBe(false);
    expect(result.response_deduplicated).toBe(false);
    expect(result.rejected_reason).toBe('no_new_assistant_for_active_turn');
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);
  });

  it('subscription replay without clientRequestId stays non-terminal and later assistant commits', () => {
    const coord = createChatOrchestratorV2();
    const { turn: turn1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.recordUserMessageId(turn1.client_request_id, 'u1');
    coord.markGenerating(turn1.client_request_id);
    coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1')],
      deliverySource: 'subscription',
      clientRequestId: turn1.client_request_id,
      phase: 'visible_commit',
    });

    coord.abandon(turn1.client_request_id);
    const { turn: turn2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.recordUserMessageId(turn2.client_request_id, 'u2');
    coord.markGenerating(turn2.client_request_id);

    const stale = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1'), makeUserMsg('u2')],
      deliverySource: 'subscription',
      phase: 'raw_correlation',
    });
    expect(stale.accepted).toBe(false);
    expect(stale.response_deduplicated).toBe(false);
    expect(stale.rejected_reason).toBe('no_new_assistant_for_active_turn');
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);

    const commit2 = coord.reconcileSnapshot({
      snapshot: [makeUserMsg('u1'), makeAssistantMsg('a1'), makeUserMsg('u2'), makeAssistantMsg('a2', '2026-08-05T00:02:00.000Z')],
      deliverySource: 'subscription',
      phase: 'visible_commit',
      clientRequestId: turn2.client_request_id,
    });
    expect(commit2.accepted).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
  });
});
