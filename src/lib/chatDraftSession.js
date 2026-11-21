/** Text-only drafts live in memory for this signed-in browser session.
 * No localStorage, server writes, attachments or cross-account retention.
 */
export function createChatDraftSession() {
  let owner = null;
  let generation = 0;
  let activeConversationId = null;
  const drafts = new Map();

  const clear = () => {
    drafts.clear();
    activeConversationId = null;
    owner = null;
    generation += 1;
  };

  return {
    clear,
    setOwner(userId) {
      const nextOwner = userId || null;
      if (owner === nextOwner) return;
      clear();
      owner = nextOwner;
    },
    forUser(userId) {
      const leaseGeneration = generation;
      const valid = () => Boolean(userId && userId === owner && leaseGeneration === generation);
      return {
        active: () => valid() ? activeConversationId : null,
        read: (conversationId) => valid() ? drafts.get(conversationId || null) || '' : '',
        select(conversationId) {
          if (valid()) activeConversationId = conversationId || null;
        },
        write(conversationId, text) {
          if (!valid()) return;
          const key = conversationId || null;
          if (text) drafts.set(key, text);
          else drafts.delete(key);
        },
        forget(conversationId) {
          if (!valid()) return;
          drafts.delete(conversationId || null);
          if (activeConversationId === conversationId) activeConversationId = null;
        },
      };
    },
  };
}

export const chatDraftSession = createChatDraftSession();
