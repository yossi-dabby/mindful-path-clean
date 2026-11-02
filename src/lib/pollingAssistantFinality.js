const RAW_TOOL_CALL_PATTERN = /<\/?(?:tool_calls?|function_calls?)\b|<FUNCTION_CALLS>|<TOOL_CALLS>/i;

export function isToolCallOnlyAssistantContent(content) {
  if (typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed) return false;
  return RAW_TOOL_CALL_PATTERN.test(trimmed);
}

export function evaluateAssistantReplyFinality(messages, previousState, options = {}) {
  const list = Array.isArray(messages) ? messages : [];
  const latestUserIndex = list.reduce(
    (latest, msg, index) => (msg?.role === 'user' ? index : latest),
    -1,
  );
  const assistantEntries = list
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg?.role === 'assistant');
  const latestAssistant = assistantEntries.length > 0
    ? assistantEntries[assistantEntries.length - 1]
    : null;
  const emptyState = { assistantKey: null, content: null, stableCount: 0 };

  if (!latestAssistant || typeof latestAssistant.msg.content !== 'string') {
    return {
      finality: { isFinal: false, reason: 'missing_assistant_message' },
      nextState: emptyState,
    };
  }

  if (latestAssistant.index <= latestUserIndex) {
    return {
      finality: { isFinal: false, reason: 'missing_assistant_after_latest_user' },
      nextState: emptyState,
    };
  }

  const content = String(latestAssistant.msg.content);
  if (!content.trim() || isToolCallOnlyAssistantContent(content)) {
    return {
      finality: { isFinal: false, reason: 'assistant_tool_call_only' },
      nextState: emptyState,
    };
  }

  const getAssistantKey = typeof options.getAssistantKey === 'function'
    ? options.getAssistantKey
    : (_msg, index) => `assistant-index:${index}`;
  const isExplicitlyFinal = typeof options.isExplicitlyFinal === 'function'
    ? options.isExplicitlyFinal
    : () => false;
  const key = getAssistantKey(latestAssistant.msg, latestAssistant.index);
  const prior = previousState && typeof previousState === 'object'
    ? previousState
    : emptyState;
  const unchanged = prior.assistantKey === key && prior.content === content;
  const stableCount = unchanged ? Number(prior.stableCount || 0) + 1 : 1;
  const nextState = { assistantKey: key, content, stableCount };

  if (isExplicitlyFinal(latestAssistant.msg)) {
    return {
      finality: { isFinal: true, reason: 'explicit_final_status' },
      nextState,
    };
  }
  if (stableCount >= 2) {
    return {
      finality: { isFinal: true, reason: 'stable_across_poll_snapshots' },
      nextState,
    };
  }
  return {
    finality: { isFinal: false, reason: 'assistant_still_mutating' },
    nextState,
  };
}
