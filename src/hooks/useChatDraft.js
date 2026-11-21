import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatDraftSession } from '@/lib/chatDraftSession';

/** The auth-bound page remounts when its user changes. Writes are synchronous so
 * navigation immediately after typing cannot outrun a persistence effect.
 */
export function useChatDraft(userId, restoredConversationId = null) {
  const session = useMemo(() => chatDraftSession.forUser(userId), [userId]);
  const [currentConversationId, setConversationState] = useState(
    () => restoredConversationId || session.active(),
  );
  const conversationRef = useRef(currentConversationId);
  const [inputMessage, setInputState] = useState(() => session.read(currentConversationId));
  const inputMessageRef = useRef(inputMessage);

  useEffect(() => {
    session.select(currentConversationId);
  }, [session, currentConversationId]);

  const setInputMessage = useCallback((value) => {
    const next = typeof value === 'function' ? value(inputMessageRef.current) : value;
    inputMessageRef.current = next;
    session.write(conversationRef.current, next);
    setInputState(next);
  }, [session]);

  const setCurrentConversationId = useCallback((value, { carryDraft = false } = {}) => {
    const next = typeof value === 'function' ? value(conversationRef.current) : value;
    if (next === conversationRef.current) return;
    const draft = carryDraft ? inputMessageRef.current : session.read(next);
    if (carryDraft) {
      session.write(conversationRef.current, '');
      session.write(next, draft);
    }
    conversationRef.current = next;
    session.select(next);
    inputMessageRef.current = draft;
    setInputState(draft);
    setConversationState(next);
  }, [session]);

  return {
    currentConversationId, setCurrentConversationId,
    inputMessage, inputMessageRef, setInputMessage,
    forgetConversationDraft: session.forget,
  };
}
