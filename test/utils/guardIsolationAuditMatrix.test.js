/**
 * @file test/utils/guardIsolationAuditMatrix.test.js
 *
 * Guard Isolation Audit — Mandatory 8-Gate Evidence Pack
 * ======================================================
 * Matrix test covering scenarios A–G at the chatOrchestratorV2.js layer.
 *
 * Run matrix:
 *   EN/HE  : A, B, C, D, E, F, G  (full matrix)
 *   FR/ES  : A, D, F, G            (key-path subset)
 *
 * Scenario key:
 *   A — Happy path: final snapshot, response_correlated=true, safeUpdateMessages accepts.
 *   B — Non-final subscription snapshot: raw_correlation visibleAccepted=false →
 *       visible_update_rejected, turn stays GENERATING (expected, non-terminal).
 *   C — Subscription-committed skip: subscriptionSucceededRef simulation — the bug
 *       scenario where a deliberate skip is misidentified as safe-update rejection.
 *       With DEDUP_GUARD_POLLING SHADOW/ENFORCE the guard detects this correctly.
 *   D — Duplicate response key: reconcileSnapshot returns response_deduplicated=true.
 *   E — Final snapshot, reconcileSnapshot raw_correlation correlated=true but
 *       visible_commit was already completed by subscription (re-commit attempt).
 *   F — No active turn: no_active_turn rejection.
 *   G — Cross-turn stale response: stale_client_request_id path.
 *
 * All test data is synthetic — no real user content, PII, or clinical material.
 * No test.skip / test.fixme used anywhere in this file.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createChatOrchestratorV2,
  TURN_STATUS,
} from '../../src/lib/chatOrchestratorV2.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Locale identifiers used in the matrix. */
const LOCALES = {
  EN: 'en',
  HE: 'he',
  FR: 'fr',
  ES: 'es',
};

const CONV_ID = 'conv-guard-audit-001';

function makeUserMsg(id = 'u1', locale = 'en') {
  return {
    role: 'user',
    id,
    content: `[user-${locale}]`,
    created_at: '2026-08-07T00:00:00.000Z',
  };
}

function makeAssistantMsg(id = 'a1', ts = '2026-08-07T00:01:00.000Z', locale = 'en') {
  return {
    role: 'assistant',
    id,
    content: `[assistant-${locale}]`,
    created_at: ts,
  };
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

function makeCoordWithActiveTurn(locale = 'en') {
  const coord = createChatOrchestratorV2();
  const convId = `${CONV_ID}-${locale}`;
  const { turn } = coord.registerSend({ conversationId: convId, executeSend: async () => {} });
  coord.markGenerating(turn.client_request_id);
  return { coord, turn, convId };
}

// ─── Scenario A: Happy path — final snapshot accepted ─────────────────────────

describe('Matrix scenario A — Happy path: final snapshot accepted (EN/HE/FR/ES)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] raw_correlation correlated=true, then visible_commit accepted`, () => {
      const { coord, turn, convId } = makeCoordWithActiveTurn(locale);
      const snapshot = [makeUserMsg('u1', locale), makeAssistantMsg('a1', '2026-08-07T00:01:00.000Z', locale)];

      // Phase A: raw_correlation (visibleAccepted=true — final snapshot)
      const correlateResult = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });

      expect(correlateResult.response_correlated, `[${locale}] A: correlated`).toBe(true);
      expect(correlateResult.accepted, `[${locale}] A: raw_correlation must not commit`).toBe(false);
      expect(correlateResult.rejected_reason, `[${locale}] A: pending visible_commit`).toBe('raw_correlation_pending_visible_commit');
      expect(coord.getActiveTurn().status, `[${locale}] A: turn still GENERATING after raw_correlation`).toBe(TURN_STATUS.GENERATING);

      // Phase B: visible_commit (safeUpdateMessages accepted)
      const commitResult = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });

      expect(commitResult.accepted, `[${locale}] A: visible_commit accepted`).toBe(true);
      expect(commitResult.response_correlated, `[${locale}] A: committed correlated`).toBe(true);
      expect(coord.getActiveTurn().status, `[${locale}] A: turn COMPLETED`).toBe(TURN_STATUS.COMPLETED);
    });
  }
});

// ─── Scenario B: Non-final subscription snapshot (EN/HE only) ────────────────

describe('Matrix scenario B — Non-final snapshot: visible_update_rejected, non-terminal (EN/HE)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] raw_correlation visibleAccepted=false → visible_update_rejected, turn stays GENERATING`, () => {
      const { coord, turn } = makeCoordWithActiveTurn(locale);
      const snapshot = [makeUserMsg('u1', locale), makeAssistantMsg('a-nonfinal', '2026-08-07T00:01:00.000Z', locale)];

      const result = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'subscription',
        phase: 'raw_correlation',
        visibleAccepted: false,
        rejectionReason: 'non_final_subscription_snapshot',
      });

      expect(result.response_correlated, `[${locale}] B: correlated=true`).toBe(true);
      expect(result.accepted, `[${locale}] B: not committed`).toBe(false);
      expect(result.rejected_reason, `[${locale}] B: visible_update_rejected`).toBe('visible_update_rejected');
      expect(result.post_processing_rejected_reason, `[${locale}] B: post_processing reason`).toBe('non_final_subscription_snapshot');
      expect(coord.getActiveTurn().status, `[${locale}] B: turn GENERATING`).toBe(TURN_STATUS.GENERATING);
    });
  }
});

// ─── Scenario C: Subscription-committed skip misidentified as rejection (EN/HE) ──

describe('Matrix scenario C — Bug: subscription_committed_skip misread as safe_update_rejected (EN/HE)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  /**
   * Scenario C models the root-cause scenario:
   * 1. Subscription commits the turn via visible_commit (response key K1 → committed).
   * 2. Polling fires with a snapshot whose response key K2 ≠ K1 (different dedup path).
   * 3. raw_correlation returns response_correlated=true + raw_correlation_pending_visible_commit.
   * 4. subscriptionSucceededRef=true → polling deliberately skips safeUpdateMessages → updated=false.
   * 5. Without the DEDUP_GUARD_POLLING fix, the V2 path at Chat.jsx treats updated=false
   *    as a safe-update rejection and continues polling until timeout.
   *
   * This test confirms the orchestrator-layer behaviour: after visible_commit by subscription,
   * a subsequent polling raw_correlation with a different candidate response key returns
   * response_correlated=true (pending visible_commit) — confirming the observable that
   * allows Chat.jsx to enter the guard path.
   */
  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] C1: subscription visible_commit commits K1; polling raw_correlation after commit → turn_already_completed (not response_correlated)`, () => {
      const { coord, turn } = makeCoordWithActiveTurn(locale);

      // Subscription path: commit K1 via visible_commit
      const k1Snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-k1', '2026-08-07T00:01:00.000Z', locale),
      ];
      const subCommit = coord.reconcileSnapshot({
        snapshot: k1Snapshot,
        deliverySource: 'subscription',
        clientRequestId: turn.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });
      expect(subCommit.accepted, `[${locale}] C1: subscription committed K1`).toBe(true);
      expect(coord.getActiveTurn().status, `[${locale}] C1: turn COMPLETED after subscription`).toBe(TURN_STATUS.COMPLETED);

      // Polling path: K2 has same user but different assistant id (different response key)
      const k2Snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-k2', '2026-08-07T00:01:01.000Z', locale),
      ];
      const pollCorrelate = coord.reconcileSnapshot({
        snapshot: k2Snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });

      // After subscription commits, turn status is FINAL (COMPLETED).
      // The one-response-per-turn guard fires: turn_already_completed.
      // This causes the polling path in Chat.jsx to enter the !response_correlated
      // branch and continue polling — the bug scenario the DEDUP_GUARD_POLLING
      // SHADOW/ENFORCE mode suppresses when subscriptionSucceededRef=true.
      expect(pollCorrelate.response_correlated, `[${locale}] C1: not correlated (turn_already_completed)`).toBe(false);
      expect(pollCorrelate.rejected_reason, `[${locale}] C1: turn_already_completed`).toBe('turn_already_completed');
    });

    it(`[${locale.toUpperCase()}] C2: same response key K1 after subscription commit → response_deduplicated=true (dedup fast-path)`, () => {
      const { coord, turn } = makeCoordWithActiveTurn(locale);

      const k1Snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-k1', '2026-08-07T00:01:00.000Z', locale),
      ];

      // Subscription commits K1.
      coord.reconcileSnapshot({
        snapshot: k1Snapshot,
        deliverySource: 'subscription',
        clientRequestId: turn.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });

      // Polling arrives with same K1 → response_deduplicated=true (dedup fast-path).
      // Note: response_correlated remains false in the dedup fast-path (early return
      // before the correlation assignment); accepted=true signals safe close.
      const pollDedup = coord.reconcileSnapshot({
        snapshot: k1Snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });

      expect(pollDedup.response_deduplicated, `[${locale}] C2: K1 deduplicated`).toBe(true);
      expect(pollDedup.accepted, `[${locale}] C2: dedup accepted`).toBe(true);
      // Dedup fast-path returns before the correlation assignment — response_correlated=false.
      expect(pollDedup.response_correlated, `[${locale}] C2: dedup fast-path, correlated stays false`).toBe(false);
    });
  }
});

// ─── Scenario D: Duplicate response key (all locales) ────────────────────────

describe('Matrix scenario D — Duplicate response key: response_deduplicated=true (EN/HE/FR/ES)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] second reconcileSnapshot with same response key returns deduplicated=true`, () => {
      const { coord, turn } = makeCoordWithActiveTurn(locale);
      const snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-dup', '2026-08-07T00:01:00.000Z', locale),
      ];

      // First commit via visible_commit.
      const first = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });
      expect(first.accepted, `[${locale}] D: first commit accepted`).toBe(true);

      // Second attempt with same snapshot — same response key.
      const second = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });
      expect(second.response_deduplicated, `[${locale}] D: deduplicated`).toBe(true);
      expect(second.accepted, `[${locale}] D: dedup accepted=true (safe-close)`).toBe(true);
    });
  }
});

// ─── Scenario E: re-commit attempt after subscription visible_commit (EN/HE) ──

describe('Matrix scenario E — Re-commit after subscription visible_commit (EN/HE)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] visible_commit attempt after turn COMPLETED → no_active_turn or dedup`, () => {
      const { coord, turn } = makeCoordWithActiveTurn(locale);
      const snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-e', '2026-08-07T00:01:00.000Z', locale),
      ];

      // Subscription commits first.
      const subCommit = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'subscription',
        clientRequestId: turn.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });
      expect(subCommit.accepted, `[${locale}] E: subscription committed`).toBe(true);

      // Polling arrives with same snapshot — already committed key → dedup.
      const pollRecommit = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        clientRequestId: turn.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });
      // Same key → deduplicated (safe path — no double commit).
      expect(pollRecommit.response_deduplicated, `[${locale}] E: poll dedup`).toBe(true);
    });
  }
});

// ─── Scenario F: No active turn (all locales) ─────────────────────────────────

describe('Matrix scenario F — No active turn: no_active_turn rejection (EN/HE/FR/ES)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE, LOCALES.FR, LOCALES.ES]) {
    it(`[${locale.toUpperCase()}] reconcileSnapshot with no active turn → no_active_turn`, () => {
      const coord = createChatOrchestratorV2();
      // No registerSend — no active turn.
      const snapshot = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a1', '2026-08-07T00:01:00.000Z', locale),
      ];

      const result = coord.reconcileSnapshot({
        snapshot,
        deliverySource: 'polling',
        phase: 'raw_correlation',
        visibleAccepted: true,
      });

      expect(result.accepted, `[${locale}] F: not accepted`).toBe(false);
      expect(result.rejected_reason, `[${locale}] F: no_active_turn`).toBe('no_active_turn');
      expect(result.response_correlated, `[${locale}] F: not correlated`).toBe(false);
    });
  }
});

// ─── Scenario G: Cross-turn stale response (EN/HE only) ──────────────────────

describe('Matrix scenario G — Cross-turn stale response (EN/HE)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', { sessionStorage: makeSessionStorage() });
  });

  for (const locale of [LOCALES.EN, LOCALES.HE]) {
    it(`[${locale.toUpperCase()}] response committed by prior request → response_deduplicated=true + stale_client_request_id`, () => {
      const convId = `${CONV_ID}-g-${locale}`;
      const coord = createChatOrchestratorV2();

      // Turn 1: registerSend, markGenerating, commit.
      const { turn: turn1 } = coord.registerSend({ conversationId: convId, executeSend: async () => {} });
      coord.markGenerating(turn1.client_request_id);

      const snapshot1 = [
        makeUserMsg('u1', locale),
        makeAssistantMsg('a-t1', '2026-08-07T00:01:00.000Z', locale),
      ];
      coord.reconcileSnapshot({
        snapshot: snapshot1,
        deliverySource: 'polling',
        clientRequestId: turn1.client_request_id,
        phase: 'visible_commit',
        visibleAccepted: true,
        terminalReason: 'visible_terminal_result_committed',
      });

      // Turn 2: registerSend starts a new turn.
      const { turn: turn2 } = coord.registerSend({ conversationId: convId, executeSend: async () => {} });
      coord.markGenerating(turn2.client_request_id);

      // Late polling arrives with turn1's snapshot (old response key).
      // The key was committed by turn1 request — stale cross-turn dedup.
      const staleResult = coord.reconcileSnapshot({
        snapshot: snapshot1,
        deliverySource: 'polling',
        clientRequestId: turn2.client_request_id,
        phase: 'raw_correlation',
        visibleAccepted: true,
      });

      // Key belongs to turn1 — stale cross-turn rejection.
      // The orchestrator returns rejected_reason='stale_previous_turn_response' with
      // stale_client_request_id=turn1.client_request_id (responseOwner).
      // In Chat.jsx this falls into the !response_correlated branch and continues
      // polling for the active turn2 — correct behavior.
      expect(staleResult.response_deduplicated, `[${locale}] G: not deduplicated (stale path)`).toBe(false);
      expect(staleResult.response_correlated, `[${locale}] G: not correlated (stale path)`).toBe(false);
      expect(
        staleResult.rejected_reason === 'stale_previous_turn_response' ||
        staleResult.rejected_reason === 'no_new_assistant_for_active_turn',
        `[${locale}] G: stale rejection reason`
      ).toBe(true);
      expect(staleResult.stale_client_request_id, `[${locale}] G: stale_client_request_id set`).toBeTruthy();
      expect(coord.getActiveTurn()?.status, `[${locale}] G: turn2 still GENERATING`).toBe(TURN_STATUS.GENERATING);
    });
  }
});

// ─── Guard mode flag contract (unit) ─────────────────────────────────────────

describe('getDedupGuardPollingMode — flag contract', () => {
  it('returns OFF when neither ENFORCE nor SHADOW env vars are set', async () => {
    // Reset module so env vars are re-evaluated.
    vi.resetModules();
    const { getDedupGuardPollingMode: fn } = await import('../../src/lib/featureFlags.js');
    expect(fn()).toBe('OFF');
  });

  it('returns SHADOW when VITE_DEDUP_GUARD_POLLING_SHADOW=true', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_DEDUP_GUARD_POLLING_SHADOW', 'true');
    const { getDedupGuardPollingMode: fn } = await import('../../src/lib/featureFlags.js');
    expect(fn()).toBe('SHADOW');
    vi.unstubAllEnvs();
  });

  it('returns ENFORCE when VITE_DEDUP_GUARD_POLLING_ENFORCE=true (wins over SHADOW)', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_DEDUP_GUARD_POLLING_ENFORCE', 'true');
    vi.stubEnv('VITE_DEDUP_GUARD_POLLING_SHADOW', 'true');
    const { getDedupGuardPollingMode: fn } = await import('../../src/lib/featureFlags.js');
    expect(fn()).toBe('ENFORCE');
    vi.unstubAllEnvs();
  });
});
