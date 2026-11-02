import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { getDefaultPollingLifecycle } from '../../src/lib/chatRuntimeLifecycle.js';
import {
  createSessionStartOpenerFallbackController,
  getDefaultSessionStartFallbackLifecycle,
} from '../../src/lib/sessionStartOpenerFallback.js';

const CHAT_SOURCE = readFileSync(
  resolve('src/pages/Chat.jsx'),
  'utf8'
);

function makeUserMessage() {
  return { role: 'user', id: 'u1', content: '[START_SESSION]' };
}

function makeAssistantMessage(content = 'Welcome to your first session.', overrides = {}) {
  return {
    role: 'assistant',
    id: 'a1',
    content,
    status: 'final',
    ...overrides,
  };
}

function createScheduler() {
  const queue = [];
  return {
    schedule(fn, delay) {
      const entry = { fn, delay, cancelled: false };
      queue.push(entry);
      return entry;
    },
    cancel(entry) {
      if (entry) entry.cancelled = true;
    },
    async runNext() {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry || entry.cancelled) continue;
        await entry.fn();
        return true;
      }
      return false;
    },
    async runAll() {
      while (await this.runNext()) {
        // drain
      }
    },
    pendingCount() {
      return queue.filter((entry) => !entry.cancelled).length;
    },
    delays() {
      return queue.filter((entry) => !entry.cancelled).map((entry) => entry.delay);
    },
  };
}

function createStatefulSafeUpdater(lastConfirmedRef) {
  return vi.fn((messages) => {
    const previous = Array.isArray(lastConfirmedRef.current) ? lastConfirmedRef.current : [];
    const previousAssistant = previous.filter((msg) => msg?.role === 'assistant').pop() || null;
    const nextAssistant = (Array.isArray(messages) ? messages : []).filter((msg) => msg?.role === 'assistant').pop() || null;

    if (
      previousAssistant &&
      nextAssistant &&
      previous.length === messages.length &&
      String(previousAssistant.content) === String(nextAssistant.content)
    ) {
      return false;
    }

    lastConfirmedRef.current = Array.isArray(messages) ? messages.map((msg) => ({ ...msg })) : [];
    return true;
  });
}

function applyAssistantFeedbackFinalityMetadata(msgs, decisionIsFinal) {
  return (Array.isArray(msgs) ? msgs : []).map((msg) => {
    if (!msg || msg.role !== 'assistant') return msg;
    return {
      ...msg,
      metadata: {
        ...(msg.metadata || {}),
        feedback_finality_verified: decisionIsFinal === true,
      },
    };
  });
}

function commitSnapshotLikeSafeUpdateForFeedbackTest({
  incomingMessages,
  finalityDecision,
  suppressFeedback = false,
  forceDuplicateBranch = false,
}) {
  const sanitized = Array.isArray(incomingMessages) ? incomingMessages : [];
  const shouldApplyFeedback = finalityDecision?.isFinal === true && suppressFeedback !== true;
  if (forceDuplicateBranch) {
    const seenContents = new Set();
    const fullyDeduplicated = sanitized.filter((msg) => {
      if (msg?.role !== 'assistant') return true;
      const contentKey = String(msg.content).substring(0, 100);
      if (seenContents.has(contentKey)) return false;
      seenContents.add(contentKey);
      return true;
    });
    return applyAssistantFeedbackFinalityMetadata(fullyDeduplicated, shouldApplyFeedback);
  }
  return applyAssistantFeedbackFinalityMetadata(sanitized, shouldApplyFeedback);
}

function createHarness(overrides = {}) {
  const scheduler = createScheduler();
  const lastConfirmedRef = { current: overrides.lastConfirmedMessages || [] };
  const state = {
    currentConversationId: overrides.currentConversationId || 'conv-first-session',
    mounted: overrides.mounted ?? true,
    sessionLanguage: 'en',
  };

  const fetchConversation = overrides.fetchConversation || vi.fn(async () => ({
    messages: [makeUserMessage(), makeAssistantMessage()],
  }));
  const buildVisibleConversationMessages =
    overrides.buildVisibleConversationMessages ||
    vi.fn((messages) => messages);
  const evaluatePollingAssistantFinality =
    overrides.evaluatePollingAssistantFinality ||
    vi.fn((messages) => {
      const latestAssistant = (messages || []).filter((msg) => msg?.role === 'assistant').pop();
      const isFinal = latestAssistant?.status === 'final' || latestAssistant?.metadata?.is_final === true;
      return { isFinal, reason: isFinal ? 'explicit_final_status' : 'assistant_still_mutating' };
    });
  const safeUpdateMessages = overrides.safeUpdateMessages || createStatefulSafeUpdater(lastConfirmedRef);
  const markAssistantMessagesFinalized = overrides.markAssistantMessagesFinalized || vi.fn();
  const setIsLoading = overrides.setIsLoading || vi.fn();
  const clearLoadingTimeout = overrides.clearLoadingTimeout || vi.fn();
  const emitStabilitySummary = overrides.emitStabilitySummary || vi.fn();
  const onExhausted = overrides.onExhausted || vi.fn();

  const controller = createSessionStartOpenerFallbackController({
    fetchConversation,
    buildVisibleConversationMessages,
    evaluatePollingAssistantFinality,
    safeUpdateMessages,
    markAssistantMessagesFinalized,
    getCurrentConversationId: () => state.currentConversationId,
    getLastConfirmedMessages: () => lastConfirmedRef.current,
    getSessionLanguage: () => state.sessionLanguage,
    isMounted: () => state.mounted,
    setIsLoading,
    clearLoadingTimeout,
    emitStabilitySummary,
    onExhausted,
    schedule: scheduler.schedule.bind(scheduler),
    cancel: scheduler.cancel.bind(scheduler),
    getLifecycle: overrides.getLifecycle || getDefaultSessionStartFallbackLifecycle,
  });

  return {
    controller,
    scheduler,
    state,
    lastConfirmedRef,
    fetchConversation,
    buildVisibleConversationMessages,
    evaluatePollingAssistantFinality,
    safeUpdateMessages,
    markAssistantMessagesFinalized,
    setIsLoading,
    clearLoadingTimeout,
    emitStabilitySummary,
    onExhausted,
  };
}

describe('Session-start opener fallback controller', () => {
  it('retrieves and renders the first-session opener when the subscription callback is missed', async () => {
    const harness = createHarness();

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    expect(harness.fetchConversation).toHaveBeenCalledOnce();
    expect(harness.safeUpdateMessages).toHaveBeenCalledOnce();
    expect(harness.safeUpdateMessages.mock.calls[0][1]).toBe('SessionStartFallback');
    expect(harness.safeUpdateMessages.mock.calls[0][2]).toMatchObject({
      pollFinality: { isFinal: true, reason: 'explicit_final_status' },
      suppressFeedback: true,
    });
    expect(harness.markAssistantMessagesFinalized).not.toHaveBeenCalled();
    expect(harness.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(harness.clearLoadingTimeout).toHaveBeenCalled();
    expect(harness.controller.getState().active).toBe(false);
    expect(harness.lastConfirmedRef.current.filter((msg) => msg.role === 'assistant')).toHaveLength(1);
  });

  it('becomes a no-op when the subscription commits the opener before fallback retrieval', async () => {
    const harness = createHarness({
      lastConfirmedMessages: [makeUserMessage(), makeAssistantMessage()],
    });

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    expect(harness.fetchConversation).not.toHaveBeenCalled();
    expect(harness.safeUpdateMessages).not.toHaveBeenCalled();
    expect(harness.markAssistantMessagesFinalized).not.toHaveBeenCalled();
    expect(harness.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(harness.lastConfirmedRef.current.filter((msg) => msg.role === 'assistant')).toHaveLength(1);
  });

  it('commits one opener when fallback wins and a later subscription snapshot matches the same final assistant', async () => {
    const harness = createHarness();

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    const duplicateAccepted = harness.safeUpdateMessages(
      harness.lastConfirmedRef.current,
      'Subscription'
    );

    expect(duplicateAccepted).toBe(false);
    expect(harness.lastConfirmedRef.current.filter((msg) => msg.role === 'assistant')).toHaveLength(1);
    expect(harness.markAssistantMessagesFinalized).not.toHaveBeenCalled();
  });

  it('uses the processed visible final opener and never surfaces stored progress bubbles', async () => {
    const progress = {
      role: 'assistant',
      id: 'a-progress',
      content: 'Thinking…',
      status: 'streaming',
    };
    const final = makeAssistantMessage('Here is the final opener.');
    const buildVisibleConversationMessages = vi.fn((messages) => {
      expect(messages).toEqual([makeUserMessage(), progress, final]);
      return [makeUserMessage(), final];
    });
    const harness = createHarness({
      fetchConversation: vi.fn(async () => ({
        messages: [makeUserMessage(), progress, final],
      })),
      buildVisibleConversationMessages,
    });

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    const committedMessages = harness.safeUpdateMessages.mock.calls[0][0];
    expect(committedMessages).toEqual([makeUserMessage(), final]);
    expect(committedMessages.some((msg) => msg.content === 'Thinking…')).toBe(false);
  });

  it('commits a stable markerless opener with feedback suppression', async () => {
    let finalityChecks = 0;
    const evaluatePollingAssistantFinality = vi.fn(() => {
      finalityChecks += 1;
      if (finalityChecks === 1) {
        return { isFinal: false, reason: 'assistant_still_mutating' };
      }
      return { isFinal: true, reason: 'stable_across_poll_snapshots' };
    });
    const nonExplicitFinalAssistant = makeAssistantMessage('Stable opener without explicit final marker.', {
      status: 'streaming',
      metadata: { is_final: false },
    });
    const harness = createHarness({
      fetchConversation: vi.fn(async () => ({
        messages: [makeUserMessage(), nonExplicitFinalAssistant],
      })),
      evaluatePollingAssistantFinality,
    });

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    expect(harness.fetchConversation).toHaveBeenCalledTimes(2);
    expect(harness.safeUpdateMessages).toHaveBeenCalledTimes(1);
    expect(harness.safeUpdateMessages.mock.calls[0][2]).toMatchObject({
      pollFinality: { isFinal: true, reason: 'stable_across_poll_snapshots' },
      suppressFeedback: true,
    });
  });

  it('ignores a late retrieval result after the user switches conversations', async () => {
    let resolveFetch;
    const fetchConversation = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const harness = createHarness({ fetchConversation });

    harness.controller.start('conv-first-session');
    const attemptPromise = harness.scheduler.runNext();
    harness.state.currentConversationId = 'conv-other';
    resolveFetch({ messages: [makeUserMessage(), makeAssistantMessage()] });
    await attemptPromise;

    expect(harness.safeUpdateMessages).not.toHaveBeenCalled();
    expect(harness.markAssistantMessagesFinalized).not.toHaveBeenCalled();
    expect(harness.controller.getState().active).toBe(false);
  });

  it('ignores a late retrieval result after unmount', async () => {
    let resolveFetch;
    const fetchConversation = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const harness = createHarness({ fetchConversation });

    harness.controller.start('conv-first-session');
    const attemptPromise = harness.scheduler.runNext();
    harness.state.mounted = false;
    resolveFetch({ messages: [makeUserMessage(), makeAssistantMessage()] });
    await attemptPromise;

    expect(harness.safeUpdateMessages).not.toHaveBeenCalled();
    expect(harness.markAssistantMessagesFinalized).not.toHaveBeenCalled();
    expect(harness.controller.getState().active).toBe(false);
  });

  it('clears loading after the bounded timeout when no visible final opener becomes available', async () => {
    const fetchConversation = vi.fn(async () => ({
      messages: [makeUserMessage()],
    }));
    const evaluatePollingAssistantFinality = vi.fn(() => ({
      isFinal: false,
      reason: 'missing_assistant_message',
    }));
    const harness = createHarness({
      fetchConversation,
      evaluatePollingAssistantFinality,
    });

    harness.controller.start('conv-first-session');
    await harness.scheduler.runAll();

    const fallbackLifecycle = getDefaultSessionStartFallbackLifecycle();
    expect(fetchConversation).toHaveBeenCalledTimes(fallbackLifecycle.maxPollAttempts);
    expect(harness.safeUpdateMessages).not.toHaveBeenCalled();
    expect(harness.onExhausted).toHaveBeenCalledOnce();
    expect(harness.onExhausted).toHaveBeenCalledWith({
      conversationId: 'conv-first-session',
      reason: 'timeout',
    });
    expect(harness.setIsLoading).toHaveBeenLastCalledWith(false);
    expect(harness.clearLoadingTimeout).toHaveBeenCalled();
    expect(harness.emitStabilitySummary).toHaveBeenCalledOnce();
    expect(harness.controller.getState().active).toBe(false);
  });
});

describe('Safe-update feedback metadata suppression behavior', () => {
  it('suppresses feedback eligibility on an explicit-final opener commit', () => {
    const committed = commitSnapshotLikeSafeUpdateForFeedbackTest({
      incomingMessages: [makeUserMessage(), makeAssistantMessage('Explicit final opener')],
      finalityDecision: { isFinal: true, reason: 'explicit_final_status' },
      suppressFeedback: true,
      forceDuplicateBranch: false,
    });

    expect(committed[1]?.metadata?.feedback_finality_verified).toBe(false);
  });

  it('suppresses feedback eligibility on a stable markerless opener commit', () => {
    const committed = commitSnapshotLikeSafeUpdateForFeedbackTest({
      incomingMessages: [makeUserMessage(), makeAssistantMessage('Markerless stable opener', { status: 'streaming' })],
      finalityDecision: { isFinal: true, reason: 'stable_across_poll_snapshots' },
      suppressFeedback: true,
      forceDuplicateBranch: false,
    });

    expect(committed[1]?.metadata?.feedback_finality_verified).toBe(false);
  });

  it('keeps ordinary final assistant responses feedback-eligible when suppression is not requested', () => {
    const committed = commitSnapshotLikeSafeUpdateForFeedbackTest({
      incomingMessages: [makeUserMessage(), makeAssistantMessage('Ordinary final assistant response')],
      finalityDecision: { isFinal: true, reason: 'explicit_final_status' },
      suppressFeedback: false,
      forceDuplicateBranch: false,
    });

    expect(committed[1]?.metadata?.feedback_finality_verified).toBe(true);
  });

  it('respects suppression in the duplicate-removal commit branch', () => {
    const committed = commitSnapshotLikeSafeUpdateForFeedbackTest({
      incomingMessages: [
        makeUserMessage(),
        makeAssistantMessage('Duplicate assistant body'),
        makeAssistantMessage('Duplicate assistant body', { id: 'a2' }),
      ],
      finalityDecision: { isFinal: true, reason: 'stable_across_poll_snapshots' },
      suppressFeedback: true,
      forceDuplicateBranch: true,
    });

    const assistants = committed.filter((msg) => msg.role === 'assistant');
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.metadata?.feedback_finality_verified).toBe(false);
  });
});

describe('Session-start opener fallback integration guards', () => {
  it('starts the opener fallback only after the automatic first-session addMessage succeeds', () => {
    const addMessageIndex = CHAT_SOURCE.indexOf('await base44.agents.addMessage(conversation, {');
    const fallbackStartIndex = CHAT_SOURCE.indexOf("sessionStartOpenerFallbackRef.current?.start(conversation.id);");

    expect(addMessageIndex).toBeGreaterThan(-1);
    expect(fallbackStartIndex).toBeGreaterThan(addMessageIndex);
  });

  it('cancels the opener fallback when the user switches conversations', () => {
    expect(CHAT_SOURCE).toContain("sessionStartOpenerFallbackRef.current?.stop('conversation_switch'");
    expect(CHAT_SOURCE).toContain("'SessionStartLocalFallback'");
    expect(CHAT_SOURCE).toContain('local_session_opener_fallback');
  });

  it('leaves ordinary typed-message polling lifecycle unchanged', () => {
    expect(getDefaultPollingLifecycle()).toEqual({
      pollDelays: [500, 1000, 2000, 4000, 6500],
      maxPollAttempts: 5,
    });
    expect(getDefaultSessionStartFallbackLifecycle()).toEqual({
      pollDelays: [0, 250, 500, 1000, 2000, 4000, 6000, 8000],
      maxPollAttempts: 8,
    });
  });
});
