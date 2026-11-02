const CONTENT_PREVIEW_LENGTH = 48;

export function getMessageRenderKey(message, index, conversationId) {
  const convKey = conversationId || 'no-conversation';
  const roleKey = typeof message?.role === 'string' ? message.role : 'unknown';
  const idKey = typeof message?.id === 'string' && message.id ? `id:${message.id}` : null;
  if (idKey) return `${convKey}:${idKey}`;

  const createdKey =
    typeof message?.created_at === 'string' && message.created_at
      ? message.created_at
      : typeof message?.created_date === 'string' && message.created_date
        ? message.created_date
        : null;
  const attachmentUrl =
    (typeof message?.metadata?.attachment?.url === 'string' && message.metadata.attachment.url) ||
    (typeof message?.attachment?.url === 'string' && message.attachment.url) ||
    '';
  const contentPreview =
    typeof message?.content === 'string' && message.content
      ? message.content.slice(0, CONTENT_PREVIEW_LENGTH)
      : 'no-content';

  if (createdKey) return `${convKey}:ts:${createdKey}:${roleKey}:${attachmentUrl}:${index}`;
  return `${convKey}:idx:${index}:${roleKey}:${attachmentUrl}:${contentPreview}`;
}
