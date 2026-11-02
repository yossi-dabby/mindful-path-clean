/**
 * @file test/utils/chatOrchestratorV2TwoPhase.test.js
 *
 * Deterministic tests proving the corrected two-phase lifecycle contract
 * introduced by PRs #898/#899 and fixed by the raw-correlation fall-through patch.
 *
 * Contract requirements verified:
 *   1. raw_correlation with visibleAccepted=false does not complete the turn
 *   2. raw_correlation with visibleAccepted=true also does not complete the turn
 *   3. raw_correlation never drains a queued send
 *   4. visible_commit after accepted safe-update completes exactly once
 *   5. safe-update rejection followed by a later final snapshot remains eligible
 *   6. queued send executes only after visible_commit
 *   7. polling final snapshot does not complete during raw correlation
 *   8. rejected hydration does not complete the active turn
 *   9. accepted final hydration may complete the active turn
 *  10. deduplicated committed subscription snapshot closes loading without
 *      a second bubble (response_deduplicated=true, no commit attempted)
 *
 * All test data is synthetic — no real user content, PII, or clinical material.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-two-phase-001';

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

// ─── Test 1: raw_correlation with visibleAccepted=false does not complete ─────

describe('Two-phase contract: raw_correlation never completes the turn', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('raw_correlation with visibleAccepted=false: turn stays generating, not completed', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-raw')];
    const result = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: false,
      rejectionReason: 'non_final_subscription_snapshot',
    });

    expect(result.response_correlated).toBe(true);
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('visible_update_rejected');
    expect(result.feedback_identity).toBeNull();
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    expect(coord.getActiveTurn().committed_response_key).toBeNull();
  });

  // ─── Test 2: raw_correlation with visibleAccepted=true also does not complete

  it('raw_correlation with visibleAccepted=true: turn stays generating, not completed', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-raw-accepted')];
    const result = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });

    // Even when visibleAccepted=true, raw_correlation must NOT commit.
    expect(result.response_correlated).toBe(true);
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('raw_correlation_pending_visible_commit');
    expect(result.feedback_identity).toBeNull();
    expect(result._nextQueuedSend).toBeUndefined();
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
    expect(coord.getActiveTurn().committed_response_key).toBeNull();
  });

  // ─── Test 3: raw_correlation never drains a queued send ──────────────────────

  it('raw_correlation never drains a queued send regardless of visibleAccepted', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    // Queue a second send.
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });
    expect(coord.getPendingTurnCount()).toBe(1);

    // raw_correlation with visibleAccepted=true must not drain the queue.
    const snapshot = [makeUserMsg(), makeAssistantMsg('a-raw-q')];
    const rawResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });

    expect(rawResult._nextQueuedSend).toBeUndefined();
    expect(coord.getPendingTurnCount()).toBe(1);
    expect(executeSend2).not.toHaveBeenCalled();
  });

  // ─── Test 4: visible_commit after accepted safe-update completes exactly once ─

  it('visible_commit completes the turn exactly once after raw_correlation + accepted update', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-commit')];

    // Phase A: raw correlation.
    const rawResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(rawResult.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Phase B: visible_commit (simulating safeUpdateMessages accepting).
    const commitResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commitResult.accepted).toBe(true);
    expect(commitResult.response_correlated).toBe(true);
    expect(typeof commitResult.feedback_identity).toBe('string');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);

    // A second visible_commit with the same key must be deduplicated.
    const dupeResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'visible_commit',
      visibleAccepted: true,
    });
    expect(dupeResult.response_deduplicated).toBe(true);
  });

  // ─── Test 5: safe-update rejection leaves turn eligible for later snapshot ────

  it('rejected visible update leaves the turn open; a later final snapshot can commit', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const earlySnapshot = [makeUserMsg(), makeAssistantMsg('a-early', '2026-08-05T00:01:00.000Z')];

    // Phase A raw correlation on early (non-final) subscription snapshot.
    const rawEarly = coord.reconcileSnapshot({
      snapshot: earlySnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: false,
      rejectionReason: 'non_final_subscription_snapshot',
    });
    expect(rawEarly.response_correlated).toBe(true);
    expect(rawEarly.accepted).toBe(false);
    // Turn is still open.
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Later final snapshot arrives — raw_correlation then visible_commit.
    const finalSnapshot = [makeUserMsg(), makeAssistantMsg('a-final', '2026-08-05T00:02:00.000Z')];
    const rawFinal = coord.reconcileSnapshot({
      snapshot: finalSnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(rawFinal.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING); // still open

    const commitFinal = coord.reconcileSnapshot({
      snapshot: finalSnapshot,
      deliverySource: 'subscription',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commitFinal.accepted).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });

  // ─── Test 6: queued send executes only after visible_commit ──────────────────

  it('queued send is only executed after visible_commit, not after raw_correlation', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });
    expect(coord.getPendingTurnCount()).toBe(1);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-q-exec')];

    // raw_correlation — must not drain.
    coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(executeSend2).not.toHaveBeenCalled();
    expect(coord.getPendingTurnCount()).toBe(1);

    // visible_commit — should drain.
    const commitResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(typeof commitResult._nextQueuedSend).toBe('function');
    expect(coord.getPendingTurnCount()).toBe(0);

    await commitResult._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
  });

  // ─── Test 7: polling final snapshot does not complete during raw_correlation ──

  it('polling final snapshot: raw_correlation returns correlated=true but does not complete', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-poll-final')];
    const rawResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true, // pollFinality.isFinal=true
    });

    expect(rawResult.response_correlated).toBe(true);
    expect(rawResult.accepted).toBe(false);
    // Turn must still be generating — visible_commit has not been called.
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
  });

  // ─── Test 8: rejected hydration does not complete the active turn ─────────────

  it('visible_commit on a non-final hydration (not accepted) does not complete the turn', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Simulate hydration when safeUpdateMessages returned false (hydrated=false).
    // Chat.jsx only calls visible_commit when hydrated===true AND hydrateFinality.isFinal===true.
    // This test verifies that if visible_commit were called without that guard,
    // the orchestrator itself would still reject a snapshot identical to the baseline.
    const baselineSnapshot = [makeUserMsg('u-h'), makeAssistantMsg('a-existing', '2026-08-04T00:00:00.000Z')];
    coord.initializeBaseline(baselineSnapshot);

    // Attempt to reconcile the same snapshot — should be rejected as no_new_assistant_message.
    const reconcile = coord.reconcileSnapshot({
      snapshot: baselineSnapshot,
      deliverySource: 'hydration',
      phase: 'visible_commit',
      visibleAccepted: true,
    });
    expect(reconcile.accepted).toBe(false);
    expect(reconcile.rejected_reason).toBe('no_new_assistant_message');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);
  });

  // ─── Test 9: accepted final hydration may complete the active turn ────────────

  it('visible_commit on final hydration with new assistant message completes the turn', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Initialize baseline with just user messages (no prior assistant).
    coord.initializeBaseline([makeUserMsg('u-h')]);

    const hydrateSnapshot = [makeUserMsg('u-h'), makeAssistantMsg('a-hydrated', '2026-08-05T01:00:00.000Z')];
    const reconcile = coord.reconcileSnapshot({
      snapshot: hydrateSnapshot,
      deliverySource: 'hydration',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });

    expect(reconcile.accepted).toBe(true);
    expect(reconcile.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });

  // ─── Test 10: deduped subscription snapshot signals closing loading ───────────

  it('deduplicated committed subscription snapshot returns response_deduplicated=true without re-committing', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-dedup')];

    // First delivery — commits the response via visible_commit.
    coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);

    // Second delivery of the same snapshot — raw_correlation detects dedup.
    const dupeResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });

    expect(dupeResult.response_deduplicated).toBe(true);
    expect(dupeResult.accepted).toBe(true);
    // No feedback identity re-issued, no _nextQueuedSend on dedup path.
    expect(dupeResult.feedback_identity).toBeNull();
    expect(dupeResult._nextQueuedSend).toBeUndefined();
  });
});

// ─── Chat.jsx active-caller regression: coordinator wiring invariants ──────────

describe('Chat.jsx active-caller regression: coordinator wiring invariants', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  it('subscription: non-final snapshot → raw_correlation correlated but not committed; final snapshot → committed after visible_commit', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Simulate the Chat.jsx subscription handler for a non-final snapshot.
    // subscriptionFinality.isFinal === false → visibleAccepted=false
    const nonFinalSnapshot = [makeUserMsg(), makeAssistantMsg('a-non-final', '2026-08-05T00:01:00.000Z')];
    const rawNonFinal = coord.reconcileSnapshot({
      snapshot: nonFinalSnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: false,
      rejectionReason: 'non_final_subscription_snapshot',
    });
    // Correlated but not committed; turn remains open.
    expect(rawNonFinal.response_correlated).toBe(true);
    expect(rawNonFinal.accepted).toBe(false);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Per Chat.jsx contract: because !subscriptionFinality.isFinal, safeUpdateMessages
    // is NOT called here. We simulate that by not calling visible_commit.

    // Later: final snapshot arrives.
    // subscriptionFinality.isFinal === true → visibleAccepted=true
    const finalSnapshot = [makeUserMsg(), makeAssistantMsg('a-final', '2026-08-05T00:02:00.000Z')];
    const rawFinal = coord.reconcileSnapshot({
      snapshot: finalSnapshot,
      deliverySource: 'subscription',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(rawFinal.response_correlated).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING); // still open

    // safeUpdateMessages accepts → visible_commit.
    const commit = coord.reconcileSnapshot({
      snapshot: finalSnapshot,
      deliverySource: 'subscription',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commit.accepted).toBe(true);
    expect(commit.completion_terminal_reason).toBe('visible_terminal_result_committed');
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });

  it('polling: raw_correlation with isFinal=true still does not commit; visible_commit after safeUpdateMessages does', async () => {
    const coord = createChatOrchestratorV2();
    const executeSend2 = vi.fn(async () => {});
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.registerSend({ conversationId: CONV_ID, executeSend: executeSend2 });

    const snapshot = [makeUserMsg(), makeAssistantMsg('a-poll')];

    // Phase A: polling raw_correlation (pollFinality.isFinal=true → visibleAccepted=true).
    const rawResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    expect(rawResult.response_correlated).toBe(true);
    expect(rawResult.accepted).toBe(false);
    expect(rawResult._nextQueuedSend).toBeUndefined();
    expect(executeSend2).not.toHaveBeenCalled();
    expect(coord.getPendingTurnCount()).toBe(1);

    // Phase B: safeUpdateMessages accepted → visible_commit.
    const commitResult = coord.reconcileSnapshot({
      snapshot,
      deliverySource: 'polling',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(commitResult.accepted).toBe(true);
    // After visible_commit drains the queue, getActiveTurn() returns the next
    // queued turn (status=pending), not the completed one — that's by design.
    expect(commitResult.completion_terminal_reason).toBe('visible_terminal_result_committed');

    // Queue drains only now.
    expect(typeof commitResult._nextQueuedSend).toBe('function');
    await commitResult._nextQueuedSend();
    expect(executeSend2).toHaveBeenCalledOnce();
  });

  it('hydration: visible_commit only called when hydrated=true AND hydrateFinality.isFinal=true', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Simulate hydrated=false (safeUpdateMessages rejected) — Chat.jsx must not call visible_commit.
    // The test verifies that if a caller skips visible_commit, the turn stays open.
    // (This mirrors the Chat.jsx guard: if (activeTurn && hydrated && hydrateFinality.isFinal))
    const hydrateSnapshot = [makeUserMsg(), makeAssistantMsg('a-h', '2026-08-05T01:00:00.000Z')];

    // No visible_commit call when hydrated=false.
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.GENERATING);

    // Now simulate hydrated=true AND isFinal=true.
    coord.initializeBaseline([makeUserMsg()]); // no prior assistant
    const reconcile = coord.reconcileSnapshot({
      snapshot: hydrateSnapshot,
      deliverySource: 'hydration',
      phase: 'visible_commit',
      visibleAccepted: true,
      terminalReason: 'visible_terminal_result_committed',
    });
    expect(reconcile.accepted).toBe(true);
    expect(coord.getActiveTurn().status).toBe(TURN_STATUS.COMPLETED);
  });
});
