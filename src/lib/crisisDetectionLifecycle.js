/**
 * Keeps asynchronous crisis checks scoped to the chat turn that started them.
 * A newer send or conversation switch invalidates every older result.
 */
export function createCrisisDetectionLifecycle() {
  let generation = 0;

  return Object.freeze({
    begin(conversationId) {
      generation += 1;
      return Object.freeze({
        generation,
        conversationId: conversationId || null,
      });
    },

    invalidate() {
      generation += 1;
      return generation;
    },

    isCurrent(request, conversationId) {
      return Boolean(
        request
        && request.generation === generation
        && request.conversationId === (conversationId || null),
      );
    },
  });
}

/**
 * Clear only the submitted draft. If the user edited or replaced it while the
 * Layer 2 check was pending, preserve the newer draft verbatim.
 */
export function clearSubmittedDraftIfUnchanged(currentDraft, submittedDraft) {
  return currentDraft === submittedDraft ? '' : currentDraft;
}
