import {
  getAssistantIdentityKey,
  selectLatestAssistantResponse,
} from './chatRuntimeLifecycle.js';
import { evaluateAssistantReplyFinality } from './pollingAssistantFinality.js';

const DEFAULT_SESSION_START_FALLBACK_DELAYS = Object.freeze([0, 250, 500, 1000, 2000, 4000, 6000, 8000]);

export function getDefaultSessionStartFallbackLifecycle() {
  return {
    pollDelays: DEFAULT_SESSION_START_FALLBACK_DELAYS,
    maxPollAttempts: DEFAULT_SESSION_START_FALLBACK_DELAYS.length,
  };
}

export function getSessionStartFallbackDelayForAttempt(
  attemptIndex,
  pollDelays = DEFAULT_SESSION_START_FALLBACK_DELAYS
) {
  return pollDelays[Math.min(attemptIndex, pollDelays.length - 1)];
}

function isFinalAssistantMessage(assistantMsg) {
  const statusValue = typeof assistantMsg?.status === 'string'
    ? assistantMsg.status.trim().toLowerCase()
    : '';
  const metadataStatusValue = typeof assistantMsg?.metadata?.status === 'string'
    ? assistantMsg.metadata.status.trim().toLowerCase()
    : '';
  const finalStatuses = new Set(['done', 'completed', 'complete', 'final', 'finished']);
  if (statusValue && finalStatuses.has(statusValue)) return true;
  if (metadataStatusValue && finalStatuses.has(metadataStatusValue)) return true;
  if (assistantMsg?.metadata?.is_final === true) return true;
  if (assistantMsg?.metadata?.final === true) return true;
  if (assistantMsg?.metadata?.completed === true) return true;
  return false;
}

export function hasVisibleAssistantMessage(messages) {
  const latestAssistant = selectLatestAssistantResponse(messages);
  return Boolean(
    latestAssistant &&
    latestAssistant.msg &&
    latestAssistant.msg.role === 'assistant' &&
    typeof latestAssistant.msg.content === 'string' &&
    latestAssistant.msg.content.trim().length > 0
  );
}

export function hasMatchingVisibleAssistantSnapshot(currentMessages, candidateMessages) {
  const currentAssistant = selectLatestAssistantResponse(currentMessages);
  const candidateAssistant = selectLatestAssistantResponse(candidateMessages);

  if (!currentAssistant || !candidateAssistant) return false;

  const currentKey = getAssistantIdentityKey(currentAssistant.msg, currentAssistant.index);
  const candidateKey = getAssistantIdentityKey(candidateAssistant.msg, candidateAssistant.index);
  if (!currentKey || !candidateKey || currentKey !== candidateKey) return false;

  return String(currentAssistant.msg.content || '') === String(candidateAssistant.msg.content || '');
}

export function createSessionStartOpenerFallbackController(options) {
  const {
    fetchConversation,
    buildVisibleConversationMessages,
    evaluatePollingAssistantFinality: injectedEvaluatePollingAssistantFinality = null,
    safeUpdateMessages,
    getCurrentConversationId,
    getLastConfirmedMessages,
    getSessionLanguage,
    isMounted,
    setIsLoading,
    clearLoadingTimeout = () => {},
    emitStabilitySummary = () => {},
    onExhausted = () => {},
    schedule = (fn, delay) => setTimeout(fn, delay),
    cancel = (timerId) => clearTimeout(timerId),
    getLifecycle = getDefaultSessionStartFallbackLifecycle,
  } = options;

  let state = {
    runId: 0,
    active: false,
    conversationId: null,
    timerId: null,
    attempts: 0,
  };
  let fallbackFinalityState = {
    assistantKey: null,
    content: null,
    stableCount: 0,
  };

  const evaluateFallbackPollingAssistantFinality = (messages) => {
    const result = evaluateAssistantReplyFinality(messages, fallbackFinalityState, {
      getAssistantKey: getAssistantIdentityKey,
      isExplicitlyFinal: isFinalAssistantMessage,
    });
    fallbackFinalityState = result.nextState;
    return result.finality;
  };
  const evaluatePollingAssistantFinality =
    typeof injectedEvaluatePollingAssistantFinality === 'function'
      ? injectedEvaluatePollingAssistantFinality
      : evaluateFallbackPollingAssistantFinality;

  const callOnExhausted = (payload) => {
    try {
      onExhausted(payload);
    } catch (error) {
      console.warn('[SessionStartFallback] Local opener fallback failed:', error);
    }
  };

  const clearTimer = () => {
    if (state.timerId !== null) {
      cancel(state.timerId);
      state.timerId = null;
    }
  };

  const stop = (reason = 'stopped', stopOptions = {}) => {
    const {
      clearLoading = false,
      clearLoadingTimeout: shouldClearLoadingTimeout = false,
      emitSummary = false,
    } = stopOptions;

    clearTimer();

    if (shouldClearLoadingTimeout) {
      clearLoadingTimeout();
    }
    if (clearLoading && isMounted()) {
      setIsLoading(false);
    }
    if (emitSummary) {
      emitStabilitySummary();
    }

    state = {
      ...state,
      active: false,
      conversationId: null,
      timerId: null,
      attempts: 0,
    };
    fallbackFinalityState = {
      assistantKey: null,
      content: null,
      stableCount: 0,
    };

    return reason;
  };

  const isInScope = (conversationId, runId) => (
    state.active === true &&
    state.runId === runId &&
    state.conversationId === conversationId &&
    isMounted() === true &&
    getCurrentConversationId() === conversationId
  );

  const scheduleAttempt = (runId, conversationId, attemptIndex, lifecycle) => {
    if (!isInScope(conversationId, runId)) {
      stop('scope_lost', { clearLoadingTimeout: true });
      return;
    }

    const delay = getSessionStartFallbackDelayForAttempt(attemptIndex, lifecycle.pollDelays);
    clearTimer();
    state.timerId = schedule(
      () => executeAttempt(runId, conversationId, attemptIndex, lifecycle),
      delay
    );
  };

  const executeAttempt = async (runId, conversationId, attemptIndex, lifecycle) => {
    if (!isInScope(conversationId, runId)) {
      stop('scope_lost', { clearLoadingTimeout: true });
      return;
    }

    state.attempts = attemptIndex + 1;

    if (hasVisibleAssistantMessage(getLastConfirmedMessages())) {
      stop('already_visible', {
        clearLoading: true,
        clearLoadingTimeout: true,
      });
      return;
    }

    try {
      const conversation = await fetchConversation(conversationId);
      if (!isInScope(conversationId, runId)) {
        stop('scope_lost', { clearLoadingTimeout: true });
        return;
      }

      const visibleMessages = buildVisibleConversationMessages(
        conversation?.messages || [],
        getSessionLanguage()
      );
      const pollFinality = evaluatePollingAssistantFinality(visibleMessages);

      if (hasVisibleAssistantMessage(visibleMessages) && pollFinality.isFinal === true) {
        const updated = safeUpdateMessages(visibleMessages, 'SessionStartFallback', {
          pollFinality,
          suppressFeedback: true,
        });

        if (updated) {
          stop('visible_commit', {
            clearLoading: true,
            clearLoadingTimeout: true,
            emitSummary: true,
          });
          return;
        }

        if (hasMatchingVisibleAssistantSnapshot(getLastConfirmedMessages(), visibleMessages)) {
          stop('already_visible', {
            clearLoading: true,
            clearLoadingTimeout: true,
          });
          return;
        }
      }

      if (state.attempts >= lifecycle.maxPollAttempts) {
        callOnExhausted({ conversationId, reason: 'timeout' });
        stop('timeout', {
          clearLoading: true,
          clearLoadingTimeout: true,
          emitSummary: true,
        });
        return;
      }

      scheduleAttempt(runId, conversationId, attemptIndex + 1, lifecycle);
    } catch (error) {
      callOnExhausted({ conversationId, reason: 'error', error });
      stop('error', {
        clearLoading: true,
        clearLoadingTimeout: true,
        emitSummary: true,
      });
    }
  };

  const start = (conversationId) => {
    if (!conversationId) return;
    const lifecycle = getLifecycle();
    const nextRunId = state.runId + 1;
    stop('restart');
    state = {
      runId: nextRunId,
      active: true,
      conversationId,
      timerId: null,
      attempts: 0,
    };
    scheduleAttempt(nextRunId, conversationId, 0, lifecycle);
  };

  return {
    start,
    stop,
    getState: () => ({ ...state }),
  };
}
