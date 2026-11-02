import { resolveRuntimeContextComposerV2Selection } from './workflowContextInjector.js';

/**
 * Session-local lock for Context Composer V2 selection.
 *
 * Locks one resolved boolean per therapist conversation/session ID.
 * Late runtime snapshot changes cannot mutate an already-locked session choice.
 */
export function createContextComposerV2SessionSelectionController({
  resolveSelection = resolveRuntimeContextComposerV2Selection,
} = {}) {
  const _lockedBySessionId = new Map();

  return {
    /**
     * Resolves and locks a session selection on first call for that session.
     * Subsequent calls for the same session return the original locked value.
     */
    lockAndGet({ sessionId, wiring, snapshot } = {}) {
      if (typeof sessionId !== 'string' || sessionId.trim() === '') {
        throw new Error('contextComposerV2SessionSelectionController.lockAndGet: sessionId is required');
      }

      if (_lockedBySessionId.has(sessionId)) {
        return _lockedBySessionId.get(sessionId);
      }

      const resolved = resolveSelection(wiring, snapshot);
      if (!resolved || typeof resolved !== 'object') {
        throw new Error('contextComposerV2SessionSelectionController.lockAndGet: resolveSelection returned invalid result');
      }
      const locked = Object.freeze({
        context_composer_v2_effective: resolved.enabled === true,
        context_composer_v2_selection_locked: true,
        context_composer_v2_selection_reason:
          typeof resolved.reason === 'string' && resolved.reason
            ? resolved.reason
            : 'legacy_fallback',
      });
      _lockedBySessionId.set(sessionId, locked);
      return locked;
    },

    /** Returns the locked selection for a session, or null when not yet locked. */
    getSelection(sessionId) {
      if (typeof sessionId !== 'string' || sessionId.trim() === '') return null;
      return _lockedBySessionId.get(sessionId) || null;
    },
  };
}
