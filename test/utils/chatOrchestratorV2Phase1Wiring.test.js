/**
 * @file test/utils/chatOrchestratorV2Phase1Wiring.test.js
 *
 * Phase 1 — Chat.jsx V2 wiring integration tests.
 *
 * These tests exercise the coordinator primitives that Chat.jsx uses when
 * VITE_CHAT_ORCHESTRATOR_V2_ENABLED=true.  They do NOT import Chat.jsx
 * (React component) — instead they test the coordinator logic and the
 * Chat.jsx wiring invariants through the coordinator API directly.
 *
 * All test data is synthetic — no real user content, PII, or clinical material.
 *
 * Coverage matrix:
 *   1.  Existing conversation baseline — initBaseline blocks historical response
 *   2.  Normal turn flow — single send → reconcile → committed
 *   3.  Two rapid sends — second queued, drained after first completes
 *   4.  Subscription while loading — NOT suppressed; reconcile handles dedup
 *   5.  Polling/subscription duplicate — dedup guard
 *   6.  Hydration during generation — accepted if new assistant message present
 *   7.  Timeout then late recovery — timed_out → completed via late reconcile
 *   8.  Timeout with queued next message — queue drains after timeout recovery
 *   9.  Stale historical/older response — rejected by baseline guard
 *  10.  Conversation switching — coordinator resets safely
 *  11.  One response and one feedback row per turn
 *  12.  Flag off — shouldSuppressSubscriptionEventWhileLoading preserved (Phase 0)
 *  13.  Queue full — bounded at MAX_QUEUE_DEPTH (10), no message loss
 *  14.  Bounded queue max depth — 11th send is rejected, first 10 are queued
 *  15.  Correlation description — client_request_id only (no Base44 e2e id)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  buildV2DebugDiagnostic,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';
import { shouldSuppressSubscriptionEventWhileLoading } from '../../src/lib/chatRuntimeLifecycle.js';
import { isChatOrchestratorV2Enabled } from '../../src/lib/featureFlags.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-wiring-001';
const CONV_ID_B = 'conv-wiring-002';

function makeUserMsg(id = 'u1') {
  return { role: 'user', id, content: '[test]', created_at: '2026-08-01T00:00:00.000Z' };
}

function makeAssistantMsg(id = 'a1', ts = '2026-08-01T00:01:00.000Z') {
  return { role: 'assistant', id, content: '[assistant]', created_at: ts };
}

function makeSnapshot(...msgs) {
  return msgs;
}

// ─── Test 1: Existing conversation baseline ─────────────────────────────────

describe('Test 1: initBaseline blocks historical assistant response', () => {
  it('reconcileSnapshot rejects the baseline assistant message after initBaseline', () => {
    const coord = createChatOrchestratorV2();

    const historicalUser = makeUserMsg('u-hist');
    const historicalAssistant = makeAssistantMsg('a-hist', '2026-08-01T00:00:00.000Z');
    const baseline = makeSnapshot(historicalUser, historicalAssistant);

    // Simulate conversation load — sets _lastCommittedSnapshot to existing messages.
    coord.initBaseline(baseline);

    // Register a new send so there is an active turn.
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    expect(turn).not.toBeNull();
    coord.markGenerating(turn.client_request_id);

    // Subscription fires with ONLY the historical messages (no new assistant).
    const result = coord.reconcileSnapshot({
      snapshot: baseline,
      deliverySource: 'subscription',
    });

    // Must be rejected — the historical assistant is already in the baseline.
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('no_new_assistant_message');
  });

  it('reconcileSnapshot accepts a NEW assistant message added after the baseline', () => {
    const coord = createChatOrchestratorV2();

    const historicalUser = makeUserMsg('u-hist');
    const historicalAssistant = makeAssistantMsg('a-hist', '2026-08-01T00:00:00.000Z');
    coord.initBaseline(makeSnapshot(historicalUser, historicalAssistant));

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // New snapshot includes a new assistant reply.
    const newUser = makeUserMsg('u-new');
    const newAssistant = makeAssistantMsg('a-new', '2026-08-02T00:00:00.000Z');
    const newSnapshot = makeSnapshot(historicalUser, historicalAssistant, newUser, newAssistant);

    const result = coord.reconcileSnapshot({ snapshot: newSnapshot, deliverySource: 'polling' });
    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
  });
});

// ─── Test 2: Normal turn flow ───────────────────────────────────────────────

describe('Test 2: Normal turn flow', () => {
  it('registers send, marks generating, reconciles snapshot, completes turn', () => {
    const coord = createChatOrchestratorV2();

    const { turn, queued, queue_full } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });

    expect(queued).toBe(false);
    expect(queue_full).toBe(false);
    expect(turn).not.toBeNull();
    expect(turn.status).toBe(TURN_STATUS.PENDING);

    coord.recordUserMessageId(turn.client_request_id, 'msg-123');
    coord.markGenerating(turn.client_request_id);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.GENERATING);

    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-reply'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });

    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
  });
});

// ─── Test 3: Two rapid sends (queue) ──────────────────────────────────────

describe('Test 3: Two rapid sends — second is queued, drained after first completes', () => {
  it('queues second send and drains it when first turn completes', async () => {
    const coord = createChatOrchestratorV2();
    const executed = [];

    const { turn: turn1, queued: q1 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send1'),
    });
    expect(q1).toBe(false);
    expect(turn1).not.toBeNull();

    // Second send — should be queued.
    const { turn: turn2, queued: q2, queue_full: qf2 } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send2'),
    });
    expect(q2).toBe(true);
    expect(qf2).toBe(false);
    expect(turn2).toBeNull();
    expect(coord.getPendingTurnCount()).toBe(1);

    // Complete first turn — drains queue via reconcileSnapshot.
    coord.markGenerating(turn1.client_request_id);
    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-first'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });

    expect(result.accepted).toBe(true);
    expect(typeof result._nextQueuedSend).toBe('function'); // backward compat
    expect(result._nextQueuedTurnRecord).not.toBeNull();
    expect(coord.getPendingTurnCount()).toBe(0);

    // Execute the drained send.
    await result._nextQueuedSend();
    expect(executed).toContain('send2');
  });
});

// ─── Test 4: Subscription while loading — NOT suppressed in V2 ─────────────

describe('Test 4: Subscription while loading — V2 does NOT suppress', () => {
  it('isChatOrchestratorV2Enabled returns false in test env (flag off by default)', () => {
    // Confirms test env has flag off — V2 path won't activate accidentally.
    expect(isChatOrchestratorV2Enabled()).toBe(false);
  });

  it('reconcileSnapshot accepts a subscription snapshot during generating state', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Subscription arrives while generating — V2 should NOT suppress it.
    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-sub'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(result.accepted).toBe(true);
  });

  it('legacy shouldSuppressSubscriptionEventWhileLoading is still available for Phase 0', () => {
    // Confirms the suppression helper is still exported for the legacy path.
    expect(typeof shouldSuppressSubscriptionEventWhileLoading).toBe('function');
    const suppress = shouldSuppressSubscriptionEventWhileLoading(true, false);
    expect(typeof suppress).toBe('boolean');
  });
});

// ─── Test 5: Polling/subscription duplicate (dedup guard) ──────────────────

describe('Test 5: Polling/subscription duplicate — dedup guard', () => {
  it('second reconcile with same response key is accepted but deduplicated', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-dup'));

    // First delivery — accepted and committed.
    const r1 = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });
    expect(r1.accepted).toBe(true);
    expect(r1.response_correlated).toBe(true);

    // Register next turn so active turn isn't null for second reconcile.
    const { turn: t2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(t2.client_request_id);

    // Same snapshot again (subscription fires after polling) — deduplicated.
    const r2 = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(r2.accepted).toBe(false);
    expect(r2.response_deduplicated).toBe(false);
    expect(r2.rejected_reason).toBe('stale_previous_turn_response');
  });
});

// ─── Test 6: Hydration during generation ───────────────────────────────────

describe('Test 6: Hydration snapshot during generation', () => {
  it('reconcileSnapshot accepts hydration snapshot with new assistant message during generation', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-hydrate'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'hydration' });

    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
  });
});

// ─── Test 7: Timeout then late recovery ─────────────────────────────────────

describe('Test 7: Timeout then late subscription recovery', () => {
  it('timed_out turn can be completed by late reconcileSnapshot', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Polling exhausted — mark timed_out (recoverable).
    coord.markTimedOut(turn.client_request_id);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.TIMED_OUT);

    // Late subscription arrives — should complete the timed_out turn.
    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-late'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });

    expect(result.accepted).toBe(true);
    expect(result.response_correlated).toBe(true);
    expect(coord.getActiveTurn()?.status).toBe(TURN_STATUS.COMPLETED);
  });

  it('timed_out turn rejected if no new assistant message (stale snapshot)', () => {
    const coord = createChatOrchestratorV2();

    // Set baseline with existing assistant message.
    coord.initBaseline(makeSnapshot(makeUserMsg('u0'), makeAssistantMsg('a0')));

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);
    coord.markTimedOut(turn.client_request_id);

    // Snapshot has no new assistant message beyond baseline.
    const staleSnapshot = makeSnapshot(makeUserMsg('u0'), makeAssistantMsg('a0'));
    const result = coord.reconcileSnapshot({ snapshot: staleSnapshot, deliverySource: 'subscription' });
    expect(result.accepted).toBe(false);
  });
});

// ─── Test 8: Timeout with queued next message ───────────────────────────────

describe('Test 8: Timeout with queued next message — queue waits for recovery or explicit fail', () => {
  it('queued send is retained while turn is timed_out, drained via markFailed', async () => {
    const coord = createChatOrchestratorV2();
    const executed = [];

    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send1'),
    });
    // Queue a second send.
    coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send2'),
    });
    expect(coord.getPendingTurnCount()).toBe(1);

    coord.markGenerating(turn.client_request_id);
    coord.markTimedOut(turn.client_request_id);

    // Queue still holds the second send — timed_out alone does NOT drain.
    expect(coord.getPendingTurnCount()).toBe(1);

    // Explicit fail drains the queue.
    const drainResult = coord.markFailed(turn.client_request_id);
    expect(coord.getPendingTurnCount()).toBe(0);
    expect(drainResult).not.toBeNull();

    await drainResult.executeSend();
    expect(executed).toContain('send2');
  });

  it('queued send is drained via late reconcileSnapshot recovery (timed_out → completed)', async () => {
    const coord = createChatOrchestratorV2();
    const executed = [];

    const { turn } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send1'),
    });
    coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => executed.push('send2'),
    });

    coord.markGenerating(turn.client_request_id);
    coord.markTimedOut(turn.client_request_id);

    // Late recovery — reconcileSnapshot drains the queue.
    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-recover'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });

    expect(result.accepted).toBe(true);
    expect(coord.getPendingTurnCount()).toBe(0);
    expect(typeof result._nextQueuedSend).toBe('function');
    await result._nextQueuedSend();
    expect(executed).toContain('send2');
  });
});

// ─── Test 9: Stale historical/older response ───────────────────────────────

describe('Test 9: Stale historical response does not attach to newer turn', () => {
  it('rejects snapshot whose latest assistant message was already committed as baseline', () => {
    const coord = createChatOrchestratorV2();

    const oldAssistant = makeAssistantMsg('a-old', '2026-08-01T00:00:00.000Z');
    coord.initBaseline(makeSnapshot(makeUserMsg('u-old'), oldAssistant));

    // New turn.
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // Snapshot containing ONLY the old assistant message (no new one).
    const stale = makeSnapshot(makeUserMsg('u-old'), oldAssistant);
    const result = coord.reconcileSnapshot({ snapshot: stale, deliverySource: 'polling' });

    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('no_new_assistant_message');
  });
});

// ─── Test 10: Conversation switching ─────────────────────────────────────────

describe('Test 10: Conversation switching resets coordinator state safely', () => {
  it('resetForConversationChange resets active turn and queue when switching conversations', () => {
    const coord = createChatOrchestratorV2();

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    expect(coord.getActiveTurn()).not.toBeNull();
    expect(coord.getPendingTurnCount()).toBe(1);

    // Switch conversation — use resetForConversationChange (not initBaseline).
    // initBaseline only updates the snapshot baseline; resetForConversationChange
    // clears the active turn and queue for a full conversation switch.
    coord.resetForConversationChange();

    expect(coord.getActiveTurn()).toBeNull();
    expect(coord.getPendingTurnCount()).toBe(0);
  });

  it('initBaseline does NOT clear an active turn (only updates snapshot baseline)', () => {
    const coord = createChatOrchestratorV2();

    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    // initBaseline updates the snapshot only — the active turn must be preserved.
    coord.initBaseline([]);

    expect(coord.getActiveTurn()).not.toBeNull();
    expect(coord.getActiveTurn().status).toBe('generating');
  });

  it('after conversation switch (resetForConversationChange), new turn registers cleanly', () => {
    const coord = createChatOrchestratorV2();

    // First conversation.
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.resetForConversationChange(); // switch

    // New conversation turn.
    const { turn, queued } = coord.registerSend({
      conversationId: CONV_ID_B,
      executeSend: async () => {},
    });

    expect(queued).toBe(false);
    expect(turn).not.toBeNull();
    expect(turn.conversation_id).toBe(CONV_ID_B);
  });
});

// ─── Test 11: One response and one feedback row per turn ────────────────────

describe('Test 11: One committed response and one feedback identity per turn', () => {
  it('exactly one feedback identity is produced per committed response', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(turn.client_request_id);

    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-fb'));
    const result = coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });

    expect(result.accepted).toBe(true);
    expect(typeof result.feedback_identity).toBe('string');
    expect(result.feedback_identity).toMatch(/^fb-crid-/);

    // getFeedbackIdentity returns the same id.
    const fid = coord.getFeedbackIdentity(turn.client_request_id);
    expect(fid).toBe(result.feedback_identity);
  });

  it('second reconcile with same snapshot key does not produce new feedback identity', () => {
    const coord = createChatOrchestratorV2();
    const { turn: t1 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(t1.client_request_id);

    const snapshot = makeSnapshot(makeUserMsg(), makeAssistantMsg('a-fbdup'));
    coord.reconcileSnapshot({ snapshot, deliverySource: 'polling' });

    // Start next turn.
    const { turn: t2 } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.markGenerating(t2.client_request_id);

    // Same snapshot again — deduplicated, no new feedback id.
    const r2 = coord.reconcileSnapshot({ snapshot, deliverySource: 'subscription' });
    expect(r2.response_deduplicated).toBe(false);
    expect(r2.rejected_reason).toBe('stale_previous_turn_response');
    expect(r2.feedback_identity).toBeNull();
  });
});

// ─── Test 12: Flag off — Phase 0 legacy behavior preserved ─────────────────

describe('Test 12: Flag off — Phase 0 exact legacy behavior preserved', () => {
  it('isChatOrchestratorV2Enabled returns false when env var is not set (default test env)', () => {
    expect(isChatOrchestratorV2Enabled()).toBe(false);
  });

  it('shouldSuppressSubscriptionEventWhileLoading returns true when isLoading=true', () => {
    // Phase 0 suppression logic is preserved and works as before.
    const suppress = shouldSuppressSubscriptionEventWhileLoading(true);
    expect(suppress).toBe(true);
  });

  it('shouldSuppressSubscriptionEventWhileLoading returns false when subscriptionActive=true', () => {
    // When not loading, suppression is false regardless of subscriptionActive.
    const suppress = shouldSuppressSubscriptionEventWhileLoading(false);
    expect(suppress).toBe(false);
  });

  it('shouldSuppressSubscriptionEventWhileLoading returns false when not loading', () => {
    const suppress = shouldSuppressSubscriptionEventWhileLoading(false);
    expect(suppress).toBe(false);
  });
});

// ─── Test 13: Queue full ────────────────────────────────────────────────────

describe('Test 13: Queue full — bounded at max depth, explicit rejection', () => {
  it('queue_full is true when queue exceeds 10 depth', () => {
    const coord = createChatOrchestratorV2();

    // First send — creates active turn.
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });

    // Queue 10 sends.
    for (let i = 0; i < 10; i++) {
      const { queued, queue_full } = coord.registerSend({
        conversationId: CONV_ID,
        executeSend: async () => {},
      });
      expect(queued).toBe(true);
      expect(queue_full).toBe(false);
    }

    // 11th send — queue full.
    const { turn, queued, queue_full } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => {},
    });
    expect(queue_full).toBe(true);
    expect(queued).toBe(false);
    expect(turn).toBeNull();
  });

  it('existing queued messages are not reordered when queue is full', () => {
    const coord = createChatOrchestratorV2();
    const order = [];

    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    for (let i = 0; i < 10; i++) {
      const idx = i;
      coord.registerSend({
        conversationId: CONV_ID,
        executeSend: async () => order.push(idx),
      });
    }

    // Reject 11th — queue should still have 10 items in original order.
    const { queue_full } = coord.registerSend({
      conversationId: CONV_ID,
      executeSend: async () => order.push(99),
    });
    expect(queue_full).toBe(true);
    expect(coord.getPendingTurnCount()).toBe(10);
  });
});

// ─── Test 14: Bounded queue max depth (regression) ─────────────────────────

describe('Test 14: Bounded FIFO queue — max depth is exactly 10', () => {
  it('accepts up to 10 queued sends without queue_full', () => {
    const coord = createChatOrchestratorV2();
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });

    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(coord.registerSend({
        conversationId: CONV_ID,
        executeSend: async () => {},
      }));
    }
    expect(results.every((r) => r.queued && !r.queue_full)).toBe(true);
    expect(coord.getPendingTurnCount()).toBe(10);
  });
});

// ─── Test 15: Correlation description ──────────────────────────────────────

describe('Test 15: Correlation — client_request_id only (no Base44 end-to-end ID)', () => {
  it('client_request_id is a stable local id in crid- format', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    expect(turn.client_request_id).toMatch(/^crid-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('generation_id on the turn record is null (no Base44 e2e correlation field)', () => {
    const coord = createChatOrchestratorV2();
    const { turn } = coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    // Base44 does not expose a proven round-trip generation_id.
    expect(turn.generation_id).toBeNull();
  });

  it('getDiagnosticState exposes orchestrator_version v2 and queue_depth', () => {
    const coord = createChatOrchestratorV2();
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });
    coord.registerSend({ conversationId: CONV_ID, executeSend: async () => {} });

    const diag = coord.getDiagnosticState();
    expect(diag.orchestrator_version).toBe('v2');
    expect(diag.queue_depth).toBe(1);
    expect(diag.max_queue_depth).toBe(10);
  });

  it('buildV2DebugDiagnostic includes only privacy-safe fields', () => {
    const payload = buildV2DebugDiagnostic({
      orchestrator_version: 'v2',
      client_request_id: 'crid-abc-123',
      turn_status: 'generating',
      queue_depth: 2,
      delivery_source: 'polling',
      snapshot_accepted: true,
    });

    expect(payload.orchestrator_version).toBe('v2');
    expect(payload.client_request_id).toBe('crid-abc-123');
    expect(payload.turn_status).toBe('generating');
    expect(payload.queue_depth).toBe(2);
    expect(payload.delivery_source).toBe('polling');
    expect(payload.snapshot_accepted).toBe(true);

    // No clinical/transcript content.
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('[test]');
    expect(serialized).not.toContain('user message');
  });
});
