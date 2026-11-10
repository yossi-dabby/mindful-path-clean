import { evaluateAssistantReplyFinality } from './pollingAssistantFinality.js';
import { TURN_STATUS } from './chatOrchestratorV2.js';

// An idle refresh has its own bounded stability state. It must not borrow the
// active send's polling state or publish a changing, status-less reply.
export async function readRefreshSnapshot({ read, prepare, isCurrent, hasAssistantChanges, getAssistantKey, isExplicitlyFinal }) {
  let stability = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!isCurrent()) return null;
    const conversation = await read();
    if (!isCurrent()) return null;
    const messages = prepare(conversation.messages || []);
    const result = evaluateAssistantReplyFinality(messages, stability, { getAssistantKey, isExplicitlyFinal });
    stability = result.nextState;
    if (result.finality.isFinal || !hasAssistantChanges(messages)) {
      return { conversation, messages, finality: result.finality };
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!isCurrent()) return null;
  throw new Error('Conversation reply is not stable yet');
}

// Keep the same correlation -> visible acceptance -> commit order as polling.
// A recovered timed-out turn must release its already-authorized queued send.
export function commitRefreshedSnapshot({ messages, finality, coordinator, startingTurnId, commit }) {
  const activeTurn = coordinator?.getActiveTurn();
  const pending = activeTurn && [TURN_STATUS.PENDING, TURN_STATUS.SENT, TURN_STATUS.GENERATING, TURN_STATUS.TIMED_OUT].includes(activeTurn.status);
  let candidate = messages;
  if (pending) {
    if (!finality.isFinal) return { updated: false, nextQueuedSend: null };
    const correlation = coordinator.reconcileSnapshot({
      snapshot: messages,
      clientRequestId: activeTurn.client_request_id,
      startingTurnId,
      deliverySource: 'refresh',
      phase: 'raw_correlation',
      visibleAccepted: true,
    });
    if (!correlation.response_correlated || correlation.response_deduplicated) {
      return { updated: false, nextQueuedSend: null };
    }
    candidate = correlation._deduplicatedSnapshot || messages;
  }
  const updated = commit(candidate, { pollFinality: finality });
  if (!updated || !pending) return { updated, nextQueuedSend: null };
  const result = coordinator.reconcileSnapshot({
    snapshot: candidate,
    clientRequestId: activeTurn.client_request_id,
    startingTurnId,
    deliverySource: 'refresh',
    phase: 'visible_commit',
    visibleAccepted: true,
    terminalReason: 'visible_terminal_result_committed',
  });
  return { updated, nextQueuedSend: result.accepted ? result._nextQueuedSend : null };
}
