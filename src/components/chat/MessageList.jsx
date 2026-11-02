import React from 'react';
import MessageBubble from './MessageBubble';
import { getMessageRenderKey } from './utils/messageRenderKey';

/**
 * Renders the list of chat messages for the active therapist chat runtime.
 *
 * Stage 1 runtime-path lock:
 * Active therapist-chat message-list renderer for pages/Chat.jsx (/Chat route).
 */
export default function MessageList({ messages, visibleCount, conversationId, sessionLanguage }) {
  const allRenderableMessages = messages
    .filter((m) => m && isRenderableChatRole(m.role) && (m.content || hasUserAttachment(m)));
  const visibleMessages = allRenderableMessages
    .slice(Math.max(0, allRenderableMessages.length - visibleCount));
  const totalAssistantCount = allRenderableMessages
    .filter((message) => message.role === 'assistant').length;
  const latestVisibleAssistantIndex = (() => {
    for (let index = visibleMessages.length - 1; index >= 0; index--) {
      if (visibleMessages[index]?.role === 'assistant') return index;
    }
    return -1;
  })();
  const shouldRequestFeedback =
    totalAssistantCount === 1 || (totalAssistantCount > 0 && totalAssistantCount % 3 === 0);

  const renderedMessages = visibleMessages
    .map((message, index, arr) => {
      const prevMsg = arr[index - 1];
      const messageIndex = Number.isInteger(message?.__rawIndex) ? message.__rawIndex : index;
      const prevUserMessage =
        message.role === 'assistant' && prevMsg?.role === 'user'
          ? prevMsg?.content
          : undefined;
      return (
        <MessageBubble
          key={getMessageRenderKey(message, index, conversationId)}
          message={message}
          conversationId={conversationId}
          messageIndex={messageIndex}
          agentName="cbt_therapist"
          context="chat"
          userMessage={prevUserMessage}
          sessionLanguage={sessionLanguage}
          showFeedback={
            message.role === 'assistant' &&
            index === latestVisibleAssistantIndex &&
            shouldRequestFeedback
          }
        />
      );
    });

  return <div role="log" aria-live="polite" aria-relevant="additions text" aria-atomic="false">{renderedMessages}</div>;
}

function isRenderableChatRole(role) {
  return role === 'user' || role === 'assistant';
}

function hasUserAttachment(message) {
  if (!message || message.role !== 'user') return false;
  const attachment =
    (message.metadata?.attachment && typeof message.metadata.attachment === 'object'
      ? message.metadata.attachment
      : null) ||
    (message.attachment && typeof message.attachment === 'object'
      ? message.attachment
      : null);
  return !!attachment;
}
