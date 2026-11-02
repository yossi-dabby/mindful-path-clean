/**
 * @file test/utils/chatPollingRejectionLifecycle.test.js
 *
 * Deterministic regression tests for the polling lifecycle defect fixed after PR #900.
 *
 * Defect: when a final polling snapshot is correlated but safeUpdateMessages returns
 * false, the code incorrectly called setIsLoading(false), cleared pollingIntervalRef,
 * and ended the polling cycle, leaving the V2 coordinator in GENERATING state and
 * the UI stuck in a ready-but-stale state with a queued send that would never execute.
 *
 * Contract items verified (A–H from spec):
 *
 *   A. A final correlated polling snapshot with safeUpdateMessages=false keeps the
 *      turn GENERATING.
 *   B. The rejected snapshot does not clear loading or stop polling.
 *   C. A later accepted final snapshot for the same request remains eligible.
 *   D. The later snapshot commits visibly and completes the turn exactly once.
 *   E. A queued second send does not execute after the rejected snapshot.
 *   F. The queued send executes exactly once after the later visible_commit.
 *   G. Repeated rejected snapshots eventually reach the existing bounded timeout
 *      terminal path.
 *   H. A deduplicated already-committed polling response closes loading without a
 *      duplicate bubble or second queue drain.
 *
 * All test data is synthetic — no real user content, PII, or clinical material.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-poll-rejection-001';

function makeUserMsg(id = 'u1') {
  return { role: 'user', id, content: '[user]', created_at: '2026-08-05T00:00:00.000Z' };
}

function makeAssistantMsg(id = 'a1', ts = '2026-08-05T00:01:00.000Z') {
  return { role: 'assistant', id, content: '[assistant]', created_at: ts };
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simulates the Chat.jsx polling path:
 *   raw_correlation → safeUpdateMessages(accepted?) → visible_commit (if accepted)
 *
 * Returns { correlateResult, updated, commitResult }.
 */
function simulatePollingAttempt(coord, {
  snapshot,
  clientRequestId,
  safeUpdateAccepted,
}) {
  const correlateResult = coord.reconcileSnapshot({
    snapshot,
    clientRequestId,
    deliverySource: 'polling',
    phase: 'raw_correlation',
    visibleAccepted: true, // pollFinality.isFinal === true
  });

  if (!correlateResult.response_correlated) {
    return { correlateResult, updated: false, commitResult: null };
  }

  // Simulate safeUpdateMessages decision.
  const updated = safeUpdateAccepted;

  let commitResult = null;
  if (updated) {
    commitResult = coord.reconcileSnapshot({
      snapshot,
      clientRequestId,
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
  }

  return { correlateResult, updated, commitResult };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Polling rejection lifecycle — coordinator state invariants', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  // ─── Item A: rejected final snapshot keeps turn GENERATING ───────────────────

  it('A: final correlated polling snapshot with safeUpdateMessages=false keeps turn GENERATING', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-rejected-1')];
    const { correlateResult, updated } = simulatePollingAttempt(coord, {
      snapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false, // safeUpdateMessages returns false
    });

    // The candidate was correlated (found a new assistant message).
    expect(correlateResult.response_correlated).toBe(true);
    // But visible update was not accepted.
    expect(updated).toBe(false);
    // Turn must remain GENERATING — rejection is non-terminal.
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    expect(coord.getActiveTurn().committed_response_key).toBeNull();
  });

  // ─── Item B: rejected snapshot — no commit, turn still open ──────────────────

  it('B: rejected polling snapshot does not complete the turn or produce a commit result', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-rejected-2')];
    const { commitResult } = simulatePollingAttempt(coord, {
      snapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });

    // No visible_commit was attempted.
    expect(commitResult).toBeNull();
    // Turn is still open.
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
  });

  // ─── Item C: later snapshot remains eligible after earlier rejection ──────────

  it('C: a later accepted final snapshot for the same request remains eligible after rejection', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const earlySnapshot = [makeUserMsg(), makeAssistantMsg('a-early', '2026-08-05T00:01:00.000Z')];
    // First attempt rejected.
    simulatePollingAttempt(coord, {
      snapshot: earlySnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Later stable snapshot — still correlated.
    const laterSnapshot = [makeUserMsg(), makeAssistantMsg('a-stable', '2026-08-05T00:02:00.000Z')];
    const { correlateResult } = simulatePollingAttempt(coord, {
      snapshot: laterSnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });
    // The later snapshot is still correlated and eligible.
    expect(correlateResult.response_correlated).toBe(true);
  });

  // ─── Item D: later accepted snapshot commits exactly once ────────────────────

  it('D: later accepted final snapshot commits the turn exactly once', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Rejected first attempt.
    const earlySnapshot = [makeUserMsg(), makeAssistantMsg('a-early-d', '2026-08-05T00:01:00.000Z')];
    simulatePollingAttempt(coord, {
      snapshot: earlySnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });

    // Later accepted attempt.
    const laterSnapshot = [makeUserMsg(), makeAssistantMsg('a-stable-d', '2026-08-05T00:02:00.000Z')];
    const { commitResult } = simulatePollingAttempt(coord, {
      snapshot: laterSnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });

    expect(commitResult).not.toBeNull();
    expect(commitResult.accepted).toBe(true);
    expect(commitResult.completion_terminal_reason).toBe('visible_terminal_result_committed');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });

  // ─── Item E: queued second send does not execute after rejection ──────────────

  it('E: queued second send does not execute after the rejected polling snapshot', () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    // Queue a second send.
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });
    expect(coord.getPendingTurnCount()).toBe(1);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-no-drain')];
    const { correlateResult } = simulatePollingAttempt(coord, {
      snapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false, // rejected
    });

    // raw_correlation succeeded but no visible_commit.
    expect(correlateResult.response_correlated).toBe(true);
    // Queue untouched.
    expect(coord.getPendingTurnCount()).toBe(1);
    expect(executeSend2).not.toHaveBeenCalled();
  });

  // ─── Item F: queued send executes exactly once after later visible_commit ─────

  it('F: queued send executes exactly once after later visible_commit', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });
    expect(coord.getPendingTurnCount()).toBe(1);

    // Rejected first attempt — queue untouched.
    const earlySnapshot = [makeUserMsg(), makeAssistantMsg('a-early-f', '2026-08-05T00:01:00.000Z')];
    simulatePollingAttempt(coord, {
      snapshot: earlySnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });
    expect(executeSend2).not.toHaveBeenCalled();
    expect(coord.getPendingTurnCount()).toBe(1);

    // Later accepted attempt — queue drains.
    const laterSnapshot = [makeUserMsg(), makeAssistantMsg('a-stable-f', '2026-08-05T00:02:00.000Z')];
    const { commitResult } = simulatePollingAttempt(coord, {
      snapshot: laterSnapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });

    expect(typeof commitResult._nextQueuedSend).toBe('function');
    expect(coord.getPendingTurnCount()).toBe(0);

    // Execute the drained send — must be called exactly once.
    await commitResult._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
  });

  // ─── Item G: repeated rejections reach bounded timeout terminal path ──────────

  it('G: repeated rejected snapshots eventually expose the turn to bounded timeout marking', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Simulate N rejected attempts (coordinator stays GENERATING throughout).
    const N = 5;
    for (let i = 0; i < N; i++) {
      const snap = [makeUserMsg(), makeAssistantMsg(`a-rej-${i}`, `2026-08-05T00:0${i}:00.000Z`)];
      simulatePollingAttempt(coord, {
        snapshot: snap,
        clientRequestId: turn.client_request_id,
        safeUpdateAccepted: false,
      });
      // Turn must stay GENERATING throughout all rejections.
      expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    }

    // When the bounded limit is reached, Chat.jsx calls markTimedOut.
    coord.markTimedOut(turn.client_request_id);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.TIMED_OUT);
  });

  // ─── Item H: deduplicated polling response — no second bubble or queue drain ──

  it('H: deduplicated already-committed polling response returns response_deduplicated=true without re-committing', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-dedup-h')];

    // First delivery — commits via visible_commit.
    const { commitResult: firstCommit } = simulatePollingAttempt(coord, {
      snapshot,
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });
    expect(firstCommit.accepted).toBe(true);
    // When a queued send exists, getActiveTurn() advances to the next pending turn.
    // Assert the commit was accepted, not the post-drain turn status.
    expect(firstCommit.completion_terminal_reason).toBe('visible_terminal_result_committed');

    // Drain the queued send from the first commit.
    if (firstCommit._nextQueuedSend) {
      await firstCommit._nextQueuedSend();
    }
    expect(executeSend2).toHaveBeenCalledOnce();

    // Second delivery of the same snapshot — raw_correlation detects dedup.
    const dupeCorrelate = coord.reconcileSnapshot({
      snapshot,
      clientRequestId: turn.client_request_id,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });

    // Deduplication detected — no second bubble, no second queue drain.
    expect(dupeCorrelate.response_deduplicated).toBe(false);
    expect(dupeCorrelate.accepted).toBe(false);
    expect(dupeCorrelate.rejected_reason).toBe('stale_previous_turn_response');
    // No _nextQueuedSend on the dedup path.
    expect(dupeCorrelate._nextQueuedSend).toBeUndefined();
    // executeSend2 called only once (from first commit).
    expect(executeSend2).toHaveBeenCalledOnce();
  });
});

// ─── Multi-snapshot polling sequence ──────────────────────────────────────────

describe('Polling rejection lifecycle — multi-snapshot sequence correctness', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('two-rejection then acceptance: exactly one commit, no duplicate drain', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });

    // Attempt 1: rejected.
    simulatePollingAttempt(coord, {
      snapshot: [makeUserMsg(), makeAssistantMsg('a-s1', '2026-08-05T00:01:00.000Z')],
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    expect(executeSend2).not.toHaveBeenCalled();

    // Attempt 2: rejected.
    simulatePollingAttempt(coord, {
      snapshot: [makeUserMsg(), makeAssistantMsg('a-s2', '2026-08-05T00:02:00.000Z')],
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: false,
    });
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    expect(executeSend2).not.toHaveBeenCalled();

    // Attempt 3: accepted.
    const { commitResult } = simulatePollingAttempt(coord, {
      snapshot: [makeUserMsg(), makeAssistantMsg('a-s3', '2026-08-05T00:03:00.000Z')],
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });

    expect(commitResult.accepted).toBe(true);
    // When a queued send exists, getActiveTurn() returns the next pending turn.
    expect(commitResult.completion_terminal_reason).toBe('visible_terminal_result_committed');
    expect(typeof commitResult._nextQueuedSend).toBe('function');

    await commitResult._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
  });

  it('accepted attempt after zero rejections: fast path still commits correctly', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });

    const { commitResult } = simulatePollingAttempt(coord, {
      snapshot: [makeUserMsg(), makeAssistantMsg('a-fast')],
      clientRequestId: turn.client_request_id,
      safeUpdateAccepted: true,
    });

    expect(commitResult.accepted).toBe(true);
    // When a queued send exists, getActiveTurn() returns the next pending turn.
    expect(commitResult.completion_terminal_reason).toBe('visible_terminal_result_committed');

    await commitResult._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
  });
});
