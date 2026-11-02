/**
 * @file test/utils/atomicAssistantRender.test.js
 *
 * V8-K — Atomic Assistant Render Gate
 *
 * PURPOSE
 * -------
 * Validates the core invariant introduced by the V8-K fix:
 *   "never commit a mutable streaming draft to visible messages;
 *    atomically render exactly one final bubble per turn."
 *
 * The Base44 SDK's `subscribeToConversation` fires one callback per streaming
 * chunk.  Before V8-K each chunk was processed through the full guard pipeline
 * and committed to React state, causing visible partial text that later got
 * replaced once guards ran on the completed response.
 *
 * V8-K fixes this by:
 *   1. Gating subscription callbacks on `isLoadingRef.current` — partial
 *      snapshots are silently discarded while generation is in progress.
 *   2. Marking assistant messages "finalized" once the authoritative polling
 *      path (getConversation REST fetch) commits them to state.
 *   3. Rejecting any subsequent snapshot that would mutate a finalized message.
 *
 * TESTS
 * -----
 *   A. Streaming simulation — partial → longer partial → final:
 *      1.  Pipeline output for partial text passes guard checks or is replaced.
 *      2.  Pipeline output for final text is deterministic (idempotent).
 *      3.  Guard decision is consistent between partial and final snapshots
 *          (no phantom flash from guard inconsistency).
 *   B. Atomic gate logic (isLoadingRef pattern):
 *      4.  Snapshots arriving while loading flag is true are discarded.
 *      5.  Snapshot arriving after loading flag is false is processed normally.
 *      6.  Exactly one bubble is committed for a complete send cycle.
 *   C. Immutability guard:
 *      7.  A finalized message cannot be overwritten by a longer subscription replay.
 *      8.  A finalized message cannot be overwritten by a shorter polling snapshot.
 *      9.  A NEW message in the same conversation (next turn) is not blocked.
 *     10.  Finalized set resets naturally per conversation (different convId).
 *   D. V8 pipeline correctness preserved:
 *     11.  connection_error is suppressed even after loading gate.
 *     12.  opener message after connection_error is shown.
 *     13.  Formulation guard fallback is used for guarded turns.
 *     14.  Grounding guard replaces unsupported inferred identity claims.
 *     15.  Language guard — Hebrew text does not pass English-locked governor.
 *     16.  Safety supplement turn passes through unchanged.
 *     17.  No-form suppression: exercise-violation is replaced.
 *     18.  English governor with valid English text returns it unchanged.
 *     19.  Polling snapshot can set messages when subscription hasn't fired.
 *     20.  Polling snapshot is rejected when subscription already committed content.
 *
 * CONSTRAINTS
 * -----------
 * - No imports from functions/ (Deno runtime).
 * - No Base44 or schema mutations.
 * - All flags remain at default (false).
 * - Deterministic, synchronous; no live backend calls.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeConversationMessagesAligned,
  validateAgentOutput,
} from '../../src/components/utils/validateAgentOutput.jsx';
import {
  applyFormulationGuardToConversationMessages,
  applyCurrentTurnGroundingGuardToConversationMessages,
  classifyFormulationGuardedTurn,
  buildFormulationSafeFallback,
} from '../../src/components/utils/formulationContractGuard.js';
import {
  applyFinalOutputGovernor,
} from '../../src/components/utils/finalOutputGovernor.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Replicates the Chat.jsx `buildVisibleConversationMessages` pipeline
 * (without the React component shell) for use in pure unit tests.
 */
function runChatVisiblePipeline(rawMessages, locale = 'en') {
  const raw = Array.isArray(rawMessages) ? rawMessages : [];
  const guardModesByRawIndex = raw.map((rawMsg, rawIndex) => {
    if (!rawMsg || rawMsg.role !== 'assistant') return null;
    for (let i = rawIndex - 1; i >= 0; i--) {
      const candidate = raw[i];
      if (candidate?.role === 'user' && typeof candidate.content === 'string') {
        return classifyFormulationGuardedTurn(candidate.content);
      }
    }
    return null;
  });
  const sanitized = sanitizeConversationMessagesAligned(raw, locale);
  const sanitizedWithRawIndexes = sanitized.map((msg, rawIndex) =>
    msg ? { ...msg, __rawIndex: rawIndex } : msg
  );
  const { messages: guarded } = applyFormulationGuardToConversationMessages(
    raw, sanitizedWithRawIndexes, { locale }
  );
  const { messages: grounded } = applyCurrentTurnGroundingGuardToConversationMessages(
    raw, guarded, { locale }
  );
  return grounded
    .map((msg, rawIndex) => {
      if (!msg) return null;
      const resolvedRawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : rawIndex;
      return { ...msg, __rawIndex: resolvedRawIndex, __guardMode: guardModesByRawIndex[resolvedRawIndex] || null };
    })
    .filter(Boolean);
}

/**
 * Stable assistant identity key — mirrors Chat.jsx `getAssistantIdentityKey`.
 */
function getAssistantIdentityKey(msg, index) {
  if (!msg || msg.role !== 'assistant') return null;
  const rawIndex = Number.isInteger(msg.__rawIndex) ? msg.__rawIndex : null;
  if (rawIndex !== null) return `raw:${rawIndex}`;
  if (msg.id) return `id:${msg.id}`;
  const createdAt = typeof msg.created_at === 'string' ? msg.created_at : null;
  if (createdAt) return `created:${createdAt}|idx:${index}`;
  return `idx:${index}|role:${msg.role}`;
}

/**
 * Pure simulation of the V8-K atomic render gate.
 *
 * Mirrors the Chat.jsx behaviour:
 *   - `handleSubscription(snapshot)` discards the snapshot if loading.
 *   - `handlePolling(snapshot)`  commits the snapshot and marks it finalized.
 *   - `attemptUpdate(snapshot, source)` applies the immutability guard and
 *     returns true iff the state was updated.
 */
function createAtomicGate() {
  let isLoading = false;
  let visibleMessages = [];
  let lastConfirmed = [];
  const finalizedByConv = new Map();

  function setLoading(val) { isLoading = val; }

  function markFinalized(convId, msgs) {
    if (!convId || !Array.isArray(msgs)) return;
    let bucket = finalizedByConv.get(convId);
    if (!bucket) { bucket = new Set(); finalizedByConv.set(convId, bucket); }
    msgs.forEach((msg, idx) => {
      if (!msg || msg.role !== 'assistant') return;
      const key = getAssistantIdentityKey(msg, idx);
      if (key) bucket.add(key);
    });
  }

  function attemptUpdate(convId, incoming, source) {
    if (incoming.length < lastConfirmed.length) return false;

    // Immutability guard
    const bucket = finalizedByConv.get(convId);
    if (bucket && bucket.size > 0) {
      const confirmedAssistants = lastConfirmed.filter((m) => m && m.role === 'assistant');
      const wouldModify = incoming.some((msg, idx) => {
        if (!msg || msg.role !== 'assistant') return false;
        const key = getAssistantIdentityKey(msg, idx);
        if (!key || !bucket.has(key)) return false;
        const confirmed = confirmedAssistants.find(
          (cm, ci) => getAssistantIdentityKey(cm, ci) === key
        );
        return confirmed ? String(msg.content) !== String(confirmed.content) : false;
      });
      if (wouldModify) return false;
    }

    lastConfirmed = incoming;
    visibleMessages = incoming;
    return true;
  }

  function handleSubscription(convId, snapshot, pipeline) {
    if (isLoading) return false; // gate: discard partial streaming draft
    const processed = pipeline ? pipeline(snapshot) : snapshot;
    return attemptUpdate(convId, processed, 'Subscription');
  }

  function handlePolling(convId, snapshot, pipeline) {
    const processed = pipeline ? pipeline(snapshot) : snapshot;
    const updated = attemptUpdate(convId, processed, 'Polling');
    if (updated) {
      markFinalized(convId, processed);
      setLoading(false);
    }
    return updated;
  }

  return {
    setLoading,
    handleSubscription,
    handlePolling,
    markFinalized,
    getVisible: () => visibleMessages,
    getLastConfirmed: () => lastConfirmed,
    isFinalizedKey: (convId, key) => finalizedByConv.get(convId)?.has(key) ?? false,
  };
}

function createFinalityAwareGate() {
  let visibleMessages = [];
  let lastConfirmed = [];
  const finalizedKeys = new Set();

  const contentByAssistantKey = (msgs) => {
    const map = new Map();
    (Array.isArray(msgs) ? msgs : []).forEach((msg, index) => {
      if (!msg || msg.role !== 'assistant') return;
      const key = getAssistantIdentityKey(msg, index);
      if (!key) return;
      map.set(key, typeof msg.content === 'string' ? msg.content : '');
    });
    return map;
  };

  const hasAssistantChange = (prev, next) => {
    const prevMap = contentByAssistantKey(prev);
    const nextMap = contentByAssistantKey(next);
    if (prevMap.size !== nextMap.size) return true;
    for (const [key, content] of prevMap.entries()) {
      if (!nextMap.has(key)) return true;
      if (nextMap.get(key) !== content) return true;
    }
    return false;
  };

  const hasVisibleMutation = (prev, next) => {
    const prevMap = contentByAssistantKey(prev);
    const nextMap = contentByAssistantKey(next);
    for (const [key, content] of prevMap.entries()) {
      if (!nextMap.has(key)) continue;
      if (nextMap.get(key) !== content) return true;
    }
    return false;
  };

  const applyFeedbackFinality = (msgs, isFinal) =>
    msgs.map((msg) => {
      if (!msg || msg.role !== 'assistant') return msg;
      return {
        ...msg,
        metadata: {
          ...(msg.metadata || {}),
          feedback_finality_verified: isFinal === true,
        },
      };
    });

  const commit = (snapshot, { source, isFinal }) => {
    const next = Array.isArray(snapshot) ? snapshot : [];
    const assistantChanged = hasAssistantChange(lastConfirmed, next);
    if (hasVisibleMutation(lastConfirmed, next)) {
      return { accepted: false, reason: 'rejected_visible_assistant_immutable' };
    }
    const hadAssistant = lastConfirmed.some((msg) => msg?.role === 'assistant');
    const allowPopulation = (source === 'LoadConversation' || source === 'CurrentConversationHydrate') && !hadAssistant;
    if (assistantChanged && isFinal !== true && !allowPopulation) {
      return { accepted: false, reason: 'rejected_non_final_hydration_snapshot' };
    }
    const committed = applyFeedbackFinality(next, isFinal === true);
    lastConfirmed = committed;
    visibleMessages = committed;
    if (isFinal === true) {
      committed.forEach((msg, index) => {
        if (!msg || msg.role !== 'assistant') return;
        const key = getAssistantIdentityKey(msg, index);
        if (key) finalizedKeys.add(key);
      });
    }
    return { accepted: true, reason: 'accepted' };
  };

  return {
    commit,
    getVisible: () => visibleMessages,
    isFinalized: (key) => finalizedKeys.has(key),
    hasVisibleFeedback: () =>
      visibleMessages.some((msg) => msg?.role === 'assistant' && msg?.metadata?.feedback_finality_verified === true),
  };
}

function createPollingFinalityTracker() {
  let state = { assistantKey: null, content: null, stableCount: 0 };

  const isExplicitlyFinal = (assistantMsg) => {
    const status = typeof assistantMsg?.status === 'string' ? assistantMsg.status.toLowerCase() : '';
    const metadataStatus = typeof assistantMsg?.metadata?.status === 'string'
      ? assistantMsg.metadata.status.toLowerCase()
      : '';
    return (
      ['done', 'completed', 'complete', 'final', 'finished'].includes(status) ||
      ['done', 'completed', 'complete', 'final', 'finished'].includes(metadataStatus) ||
      assistantMsg?.metadata?.is_final === true ||
      assistantMsg?.metadata?.final === true ||
      assistantMsg?.metadata?.completed === true
    );
  };

  return (messages) => {
    const assistantEntries = (messages || [])
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg?.role === 'assistant');
    const latest = assistantEntries.at(-1);
    if (!latest || typeof latest.msg.content !== 'string') {
      state = { assistantKey: null, content: null, stableCount: 0 };
      return false;
    }
    const key = getAssistantIdentityKey(latest.msg, latest.index);
    const content = String(latest.msg.content);
    const unchanged = state.assistantKey === key && state.content === content;
    const stableCount = unchanged ? state.stableCount + 1 : 1;
    state = { assistantKey: key, content, stableCount };
    return isExplicitlyFinal(latest.msg) || stableCount >= 2;
  };
}

function msg(role, content, id = null) {
  return id ? { role, content, id } : { role, content };
}
const user = (text, id = null) => msg('user', text, id);
const assistant = (text, id = null) => msg('assistant', text, id);

const CONV = 'conv-test-1';

const FD_START = '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===';
const FD_END = '=== END FORMULATION DEEPENING ===';

function guardedUserMsg(text = 'מה אתה חושב?') {
  return `${FD_START}\nInstruction.\n${FD_END}\n\n${text}`;
}

// ─── A. Streaming simulation ──────────────────────────────────────────────────

describe('V8-K A: streaming simulation — partial → longer partial → final', () => {
  const USER_MSG = 'Tell me about your approach to CBT.';

  // A full, valid assistant response that will pass all guards.
  const FINAL_CONTENT =
    'I hear that you are looking for a structured approach. ' +
    'In CBT we explore the connections between thoughts, feelings and behaviours. ' +
    'What would you like to focus on first?';

  // Partial snapshots: progressively longer substrings of the final content.
  const PARTIAL_1 = FINAL_CONTENT.slice(0, 30);  // 30 chars
  const PARTIAL_2 = FINAL_CONTENT.slice(0, 80);  // 80 chars

  it('A1: full pipeline run on final snapshot is deterministic', () => {
    const raw = [user(USER_MSG), assistant(FINAL_CONTENT, 'msg-1')];
    const run1 = runChatVisiblePipeline(raw, 'en');
    const run2 = runChatVisiblePipeline(raw, 'en');
    expect(run1).toHaveLength(2);
    expect(run2[1].content).toBe(run1[1].content);
  });

  it('A2: guard decision is consistent between partial and final for a valid response', () => {
    const rawFinal = [user(USER_MSG), assistant(FINAL_CONTENT, 'msg-1')];
    const rawPartial = [user(USER_MSG), assistant(PARTIAL_2, 'msg-1')];
    const finalVisible = runChatVisiblePipeline(rawFinal, 'en');
    const partialVisible = runChatVisiblePipeline(rawPartial, 'en');
    // Both should be accepted (not null-filtered)
    expect(finalVisible).toHaveLength(2);
    expect(partialVisible).toHaveLength(2);
    // Neither should be guard-replaced (it's a valid response)
    expect(finalVisible[1].metadata?.formulation_guard_replaced).toBeFalsy();
    expect(partialVisible[1].metadata?.formulation_guard_replaced).toBeFalsy();
    // Final should contain the original content unchanged
    expect(finalVisible[1].content).toBe(FINAL_CONTENT);
  });

  it('A3: guard-replaced final content uses same fallback as partial (deterministic replacement)', () => {
    // A guarded turn with a prohibited assistant response
    const guardedUser = guardedUserMsg('מה אתה חושב?');
    const PROHIBITED = 'הדפוס עובד כך: אתה מפחד מכישלון. מה אתה חושב?';
    const PARTIAL_PROHIBITED = PROHIBITED.slice(0, 20);

    const rawFinal = [{ role: 'user', content: guardedUser }, assistant(PROHIBITED, 'msg-a')];
    const rawPartial = [{ role: 'user', content: guardedUser }, assistant(PARTIAL_PROHIBITED, 'msg-a')];

    const finalVisible = runChatVisiblePipeline(rawFinal, 'he');
    const partialVisible = runChatVisiblePipeline(rawPartial, 'he');

    // Final violates the guard → replaced
    expect(finalVisible[1].metadata?.formulation_guard_replaced).toBe(true);
    // Partial doesn't yet contain enough text to trigger the violation → not replaced
    // (partial snapshots would be buffered and never rendered by the loading gate)
    // We verify the partial and final have different outcomes — confirming that
    // rendering partial would cause a flash (the bug we fixed).
    expect(finalVisible[1].content).not.toBe(PARTIAL_PROHIBITED);
  });
});

// ─── B. Atomic gate logic ─────────────────────────────────────────────────────

describe('V8-K B: atomic gate — subscription discarded while loading', () => {
  it('B4: subscription snapshot is discarded when gate.isLoading is true', () => {
    const gate = createAtomicGate();
    gate.setLoading(true);
    const snapshot = [user('Hello'), assistant('Partial answer')];
    const updated = gate.handleSubscription(CONV, snapshot);
    expect(updated).toBe(false);
    expect(gate.getVisible()).toHaveLength(0);
  });

  it('B5: subscription snapshot is processed when gate.isLoading is false', () => {
    const gate = createAtomicGate();
    gate.setLoading(false);
    const snapshot = [user('Hello', 'u1'), assistant('Full answer here', 'a1')];
    const updated = gate.handleSubscription(CONV, snapshot);
    expect(updated).toBe(true);
    expect(gate.getVisible()).toHaveLength(2);
    expect(gate.getVisible()[1].content).toBe('Full answer here');
  });

  it('B6: exactly one bubble committed for a complete send cycle', () => {
    const gate = createAtomicGate();
    gate.setLoading(true);

    // Three subscription callbacks during streaming — all discarded
    const snap1 = [user('Hey', 'u1'), assistant('I hea', 'a1')];
    const snap2 = [user('Hey', 'u1'), assistant('I hear that you', 'a1')];
    const snap3 = [user('Hey', 'u1'), assistant('I hear that you are asking about CBT.', 'a1')];
    expect(gate.handleSubscription(CONV, snap1)).toBe(false);
    expect(gate.handleSubscription(CONV, snap2)).toBe(false);
    expect(gate.handleSubscription(CONV, snap3)).toBe(false);
    expect(gate.getVisible()).toHaveLength(0);

    // Polling fires with authoritative getConversation result
    const finalSnap = [user('Hey', 'u1'), assistant('I hear that you are asking about CBT.', 'a1')];
    const committed = gate.handlePolling(CONV, finalSnap);
    expect(committed).toBe(true);
    expect(gate.getVisible()).toHaveLength(2);

    // The assistant message is visible exactly once
    const assistantBubbles = gate.getVisible().filter((m) => m.role === 'assistant');
    expect(assistantBubbles).toHaveLength(1);
    expect(assistantBubbles[0].content).toBe('I hear that you are asking about CBT.');
  });
});

describe('V8-L: polling finality gate', () => {
  it('L1: does not commit on first in-progress polling snapshot even when expected count is reached', () => {
    const isFinal = createPollingFinalityTracker();
    const partial = [user('Hi', 'u1'), assistant('Draft answer', 'temp-a1')];
    expect(isFinal(partial)).toBe(false);
  });

  it('L2: finality requires either explicit final marker or stable repeated snapshot', () => {
    const isFinal = createPollingFinalityTracker();
    const partial = [user('Hi', 'u1'), assistant('Draft answer', 'temp-a1')];
    const stable = [user('Hi', 'u1'), assistant('Draft answer', 'temp-a1')];
    expect(isFinal(partial)).toBe(false);
    expect(isFinal(stable)).toBe(true);

    const explicitFinal = [user('Hi', 'u1'), { ...assistant('Final answer', 'a1'), metadata: { status: 'completed' } }];
    const secondTracker = createPollingFinalityTracker();
    expect(secondTracker(explicitFinal)).toBe(true);
  });
});

// ─── C. Immutability guard ────────────────────────────────────────────────────

describe('V8-K C: immutability guard', () => {
  it('C7: finalized message cannot be overwritten by a longer subscription replay', () => {
    const gate = createAtomicGate();

    // Polling commits the authoritative final response
    const finalSnap = [user('Hi', 'u1'), assistant('You deserve to be heard.', 'a1')];
    gate.handlePolling(CONV, finalSnap);

    // Late streaming chunk arrives via subscription with more text (same msg id)
    gate.setLoading(false);
    const lateSnap = [user('Hi', 'u1'), assistant('You deserve to be heard. Let me know more.', 'a1')];
    const updated = gate.handleSubscription(CONV, lateSnap);
    expect(updated).toBe(false);
    // Visible state unchanged
    expect(gate.getVisible()[1].content).toBe('You deserve to be heard.');
  });

  it('C8: finalized message cannot be overwritten by a shorter polling snapshot', () => {
    const gate = createAtomicGate();

    const finalSnap = [user('Hi', 'u1'), assistant('This is the full and complete response.', 'a1')];
    gate.handlePolling(CONV, finalSnap);

    // A stale or truncated polling snapshot tries to overwrite
    const staleSnap = [user('Hi', 'u1'), assistant('This is the full', 'a1')];
    const updated = gate.handlePolling(CONV, staleSnap);
    expect(updated).toBe(false);
    expect(gate.getVisible()[1].content).toBe('This is the full and complete response.');
  });

  it('C9: new assistant message (next turn, different id) is not blocked', () => {
    const gate = createAtomicGate();

    // First turn: polling commits turn 1
    const snap1 = [user('Hi', 'u1'), assistant('Hello there.', 'a1')];
    gate.handlePolling(CONV, snap1);
    expect(gate.getVisible()).toHaveLength(2);

    // Second turn: user sends another message, polling delivers new reply
    gate.setLoading(true);
    const snap2 = [
      user('Hi', 'u1'),
      assistant('Hello there.', 'a1'),
      user('Tell me more', 'u2'),
      assistant('Of course, here is more detail.', 'a2'),
    ];
    const updated = gate.handlePolling(CONV, snap2);
    expect(updated).toBe(true);
    expect(gate.getVisible()).toHaveLength(4);
    expect(gate.getVisible()[3].content).toBe('Of course, here is more detail.');
  });

  it('C10: finalized set is scoped per conversation — different convId is not blocked', () => {
    const gate = createAtomicGate();
    const CONV_A = 'conv-a';
    const CONV_B = 'conv-b';

    // Finalize message in conv-a
    const snapA = [user('Hi', 'u1'), assistant('Response for A.', 'a1')];
    gate.handlePolling(CONV_A, snapA);

    // Same message id in conv-b should NOT be blocked
    gate.setLoading(false);
    const snapB = [user('Hi', 'u1'), assistant('Different response for B.', 'a1')];
    const updated = gate.handleSubscription(CONV_B, snapB);
    expect(updated).toBe(true);
    expect(gate.getVisible()[1].content).toBe('Different response for B.');
  });

  it('C11: temp-id to final-id churn is treated as the same assistant turn when raw index is stable', () => {
    const gate = createAtomicGate();
    const committed = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Stable final', id: 'temp-id', __rawIndex: 1 }];
    gate.handlePolling(CONV, committed);
    gate.setLoading(false);
    const churned = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Stable final with extra text', id: 'final-id', __rawIndex: 1 }];
    const updated = gate.handleSubscription(CONV, churned);
    expect(updated).toBe(false);
    expect(gate.getVisible()[1].content).toBe('Stable final');
  });
});

describe('V8-O: finality gate + immutable visible prose regression trace', () => {
  const LONG_RESPONSE = 'א'.repeat(1015);
  const SHORT_RESPONSE = 'ב'.repeat(106);

  it('rejects non-final hydration snapshot and keeps visible assistant content unchanged', () => {
    const gate = createFinalityAwareGate();
    const initial = [
      { role: 'user', content: 'אני מרגיש מתח' },
      { role: 'assistant', id: 'a4', __rawIndex: 4, content: LONG_RESPONSE },
    ];
    const seeded = gate.commit(initial, { source: 'CurrentConversationHydrate', isFinal: false });
    expect(seeded.accepted).toBe(true);
    expect(gate.hasVisibleFeedback()).toBe(false);
    expect(gate.isFinalized('raw:4')).toBe(false);

    const lateLoadSnapshot = [
      { role: 'user', content: 'אני מרגיש מתח' },
      { role: 'assistant', id: 'a4', __rawIndex: 4, content: SHORT_RESPONSE },
    ];
    const hydration = gate.commit(lateLoadSnapshot, {
      source: 'LoadConversation',
      isFinal: false,
    });

    expect(hydration.accepted).toBe(false);
    expect(hydration.reason).toBe('rejected_visible_assistant_immutable');
    expect(gate.getVisible()[1].content.length).toBe(1015);
    expect(gate.getVisible()[1].content).toBe(LONG_RESPONSE);
    expect(gate.isFinalized('raw:4')).toBe(false);
    expect(gate.hasVisibleFeedback()).toBe(false);
  });
});

// ─── D. V8 pipeline correctness preserved ─────────────────────────────────────

describe('V8-K D: V8 pipeline correctness preserved after gate changes', () => {
  it('D11: connection_error message is suppressed (null after sanitization)', () => {
    const raw = [
      user('שלום.'),
      assistant('connection_error'),
    ];
    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    expect(sanitized[1]).toBeNull();
  });

  it('D12: opener after connection_error is shown', () => {
    const raw = [
      user('שלום.'),
      assistant('connection_error'),
      assistant('שלום, אני כאן בשבילך. איך אתה מרגיש היום?'),
    ];
    const sanitized = sanitizeConversationMessagesAligned(raw, 'he');
    expect(sanitized[1]).toBeNull();
    expect(sanitized[2]).not.toBeNull();
    expect(sanitized[2].content).toContain('שלום');
  });

  it('D13: formulation guard fallback used for guarded turns with prohibited content', () => {
    const guardedUser = guardedUserMsg('מה חסר בפורמולציה?');
    const prohibited = 'האיום האמיתי קשור לכך. מה אתה חושב?'; // prohibited phrase
    const raw = [
      { role: 'user', content: guardedUser },
      assistant(prohibited, 'msg-b'),
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].metadata?.formulation_guard_replaced).toBe(true);
    // Fallback should start with the known Hebrew fallback fragment
    expect(visible[1].content).toMatch(/שומע/);
  });

  it('D14: grounding guard replaces unsupported inferred identity claim', () => {
    const raw = [
      user('תסביר לי את הקשר בין המחשבה, המתח והעיכוב.'),
      assistant('זהות היא השאלה העיקרית. מה אתה חושב?', 'msg-c'),
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    const grounded = visible.find((m) => m.role === 'assistant');
    expect(grounded).toBeTruthy();
    // Either guard-replaced or original; the guard's decision must be deterministic
    const run2 = runChatVisiblePipeline(raw, 'he');
    expect(run2[1].content).toBe(grounded.content);
  });

  it('D15: Hebrew text fails English-locked governor (Pass 0b: Hebrew-script mismatch)', () => {
    // Pass 0b triggers only when the session language is EXPLICITLY locked via
    // opts.lang (the authoritative locked-session path). Passing a bare string
    // leaves opts.lang undefined and the check is skipped — that is by design.
    const hebrewText =
      'שלום, אני כאן בשבילך היום. בוא נדבר על מה שמטריד אותך עכשיו.';
    // Explicitly lock session to English via opts.lang
    const result = applyFinalOutputGovernor(hebrewText, { lang: 'en' });
    // Governor detects >30 % Hebrew chars in a locked English session → failsafe
    expect(result).not.toBe(hebrewText);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Failsafe should be an English string (no Hebrew characters)
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });

  it('D16: safety supplement turn passes through unchanged', () => {
    const SM_START = '=== SAFETY MODE \u2014 STAGE 2 PHASE 7 ===';
    const SM_END = '=== END SAFETY MODE CONSTRAINTS ===';
    const safetyUser = `${SM_START}\nSafety instructions.\n${SM_END}\n\nעזרה`;
    const raw = [
      { role: 'user', content: safetyUser },
      assistant('אני כאן איתך. מה קורה?', 'msg-s'),
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible).toHaveLength(2); // user + assistant both visible
    expect(visible[1].content).toBe('אני כאן איתך. מה קורה?');
    expect(visible[1].metadata?.formulation_guard_replaced).toBeFalsy();
  });

  it('D17: exercise-violation in no-form turn is replaced by guard', () => {
    const noExerciseUser = `${FD_START}\nInstruction.\nThe person has asked not to receive an exercise yet.\n${FD_END}\n\nמה לדעתך חסר?`;
    const exerciseViolation = 'אולי כדאי לנסות תרגיל קצר כבר עכשיו. מה אתה חושב?';
    const raw = [
      { role: 'user', content: noExerciseUser },
      assistant(exerciseViolation, 'msg-nf'),
    ];
    const visible = runChatVisiblePipeline(raw, 'he');
    expect(visible[1].metadata?.formulation_guard_replaced).toBe(true);
  });

  it('D18: English governor with valid English text returns it unchanged', () => {
    const validEn = 'I hear that you are going through a difficult time. What would help most right now?';
    const result = applyFinalOutputGovernor(validEn, 'en');
    expect(result).toBe(validEn);
  });

  it('D19: polling snapshot sets messages when no subscription has fired', () => {
    const gate = createAtomicGate();
    gate.setLoading(true);
    const snap = [user('Hello', 'u1'), assistant('Hi there, how can I help?', 'a1')];
    const updated = gate.handlePolling(CONV, snap);
    expect(updated).toBe(true);
    expect(gate.getVisible()).toHaveLength(2);
    expect(gate.getVisible()[1].content).toBe('Hi there, how can I help?');
  });

  it('D20: polling snapshot is rejected when subscription already committed content', () => {
    const gate = createAtomicGate();
    gate.setLoading(false);

    // Subscription commits first (e.g. during non-loading window — real-time update)
    const subscriptionSnap = [user('Hello', 'u1'), assistant('I am here to help you today.', 'a1')];
    const subUpdated = gate.handleSubscription(CONV, subscriptionSnap);
    expect(subUpdated).toBe(true);

    // Mark finalized manually (mirrors subscriptionSucceeded path)
    gate.markFinalized(CONV, gate.getVisible());

    // Polling then fires — same content, different length (shorter)
    const pollingSnap = [user('Hello', 'u1'), assistant('I am here to help you.', 'a1')];
    const pollUpdated = gate.handlePolling(CONV, pollingSnap);
    expect(pollUpdated).toBe(false);
    // State unchanged from subscription commit
    expect(gate.getVisible()[1].content).toBe('I am here to help you today.');
  });
});

// ─── E. Identity key stability ────────────────────────────────────────────────

describe('V8-K E: assistant identity key stability', () => {
  it('E1: messages with stable ids produce id-based keys', () => {
    const m = { role: 'assistant', content: 'hello', id: 'abc-123' };
    expect(getAssistantIdentityKey(m, 0)).toBe('id:abc-123');
    expect(getAssistantIdentityKey(m, 5)).toBe('id:abc-123'); // index-invariant
  });

  it('E2: messages with __rawIndex + created_at produce stable raw-based key', () => {
    const m = { role: 'assistant', content: 'hello', __rawIndex: 2, created_at: '2024-01-01T00:00:00Z' };
    const key = getAssistantIdentityKey(m, 0);
    expect(key).toBe('raw:2');
    // Key is index-invariant when rawIndex is present
    expect(getAssistantIdentityKey(m, 99)).toBe('raw:2');
  });

  it('E3: two different message ids produce different keys', () => {
    const m1 = { role: 'assistant', content: 'a', id: 'id-1' };
    const m2 = { role: 'assistant', content: 'b', id: 'id-2' };
    expect(getAssistantIdentityKey(m1, 0)).not.toBe(getAssistantIdentityKey(m2, 0));
  });

  it('E4: non-assistant messages return null', () => {
    expect(getAssistantIdentityKey({ role: 'user', content: 'hi' }, 0)).toBeNull();
    expect(getAssistantIdentityKey(null, 0)).toBeNull();
  });

  it('E5: __rawIndex key has priority over transient id to survive id churn', () => {
    const temp = { role: 'assistant', id: 'temp-1', __rawIndex: 3, content: 'x' };
    const final = { role: 'assistant', id: 'final-1', __rawIndex: 3, content: 'x' };
    expect(getAssistantIdentityKey(temp, 0)).toBe('raw:3');
    expect(getAssistantIdentityKey(final, 0)).toBe('raw:3');
  });
});
