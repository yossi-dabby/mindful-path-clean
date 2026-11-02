export function claimConversationMemoryWrite(writeTracker, conversationId) {
  if (!(writeTracker instanceof Set)) return false;
  if (typeof conversationId !== 'string' || conversationId.length === 0) return false;
  if (writeTracker.has(conversationId)) return false;
  writeTracker.add(conversationId);
  return true;
}

export const CONVERSATION_MEMORY_WRITE_MAX_ATTEMPTS = 2;
export const CONVERSATION_MEMORY_WRITE_WAIT_MS = 6000;

function isSuccessfulWriteResult(result) {
  if (result === true) return true;
  return Boolean(result && typeof result === 'object' && result.success === true);
}

/**
 * Waits for the write only up to a fixed bound. A timed-out write is not
 * cancelled; it may still finish and update the shared tracker.
 */
export async function waitForConversationMemoryWrite(
  writePromise,
  timeoutMs = CONVERSATION_MEMORY_WRITE_WAIT_MS,
) {
  if (!writePromise || typeof writePromise.then !== 'function') {
    return writePromise === true;
  }

  const boundedTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : CONVERSATION_MEMORY_WRITE_WAIT_MS;
  let timeoutId;
  try {
    return await Promise.race([
      Promise.resolve(writePromise).then(Boolean, () => false),
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(false), boundedTimeout);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Claims a conversation ID and invokes the supplied summarization trigger once.
 *
 * Returns true only when the write was actually triggered. Returns false when
 * the conversation was already claimed, the threshold gate is not satisfied, or
 * the supplied trigger is not callable.
 */
export function triggerConversationMemoryWriteOnce({
  writeTracker,
  conversationId,
  conversationMeta = {},
  messages,
  minMessages = 0,
  trigger,
  invoker,
  entities = null,
  runtimeSnapshot = null,
}) {
  if (minMessages > 0) {
    if (!Array.isArray(messages) || messages.length < minMessages) return false;
  }

  if (typeof trigger !== 'function') return false;

  // Backward-compatible path for legacy callers. Runtime Chat.jsx uses a Map
  // so the state reflects the persistence result instead of the trigger call.
  if (writeTracker instanceof Set) {
    if (!claimConversationMemoryWrite(writeTracker, conversationId)) return false;
    trigger(
      conversationId,
      conversationMeta || {},
      invoker,
      entities,
      runtimeSnapshot,
      messages,
    );
    return true;
  }

  if (!(writeTracker instanceof Map)) return false;
  if (typeof conversationId !== 'string' || conversationId.length === 0) return false;

  const existing = writeTracker.get(conversationId);
  if (existing?.state === 'succeeded') return Promise.resolve(true);
  if (existing?.state === 'pending' && existing.promise) return existing.promise;
  if (
    existing?.state === 'failed' &&
    existing.attempts >= CONVERSATION_MEMORY_WRITE_MAX_ATTEMPTS
  ) {
    return Promise.resolve(false);
  }

  const startingAttempts = Number.isInteger(existing?.attempts) ? existing.attempts : 0;
  const run = async () => {
    let attempts = startingAttempts;
    while (attempts < CONVERSATION_MEMORY_WRITE_MAX_ATTEMPTS) {
      attempts += 1;
      try {
        const result = await trigger(
          conversationId,
          conversationMeta || {},
          invoker,
          entities,
          runtimeSnapshot,
          messages,
        );
        if (isSuccessfulWriteResult(result)) {
          writeTracker.set(conversationId, { state: 'succeeded', attempts });
          return true;
        }
      } catch {
        // One bounded retry is permitted; never log conversation content.
      }
    }

    writeTracker.set(conversationId, { state: 'failed', attempts });
    return false;
  };

  const promise = run();
  writeTracker.set(conversationId, {
    state: 'pending',
    attempts: startingAttempts,
    promise,
  });
  return promise;
}
