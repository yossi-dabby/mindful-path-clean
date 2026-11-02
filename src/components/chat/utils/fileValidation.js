export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv']);
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/csv',
]);

function getExtension(name = '') {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

export function validateChatAttachment(file) {
  if (!file) return { valid: false, reason: 'missing' };
  if (Number(file.size) > MAX_CHAT_ATTACHMENT_BYTES) {
    return { valid: false, reason: 'too_large' };
  }

  const mimeType = String(file.type || '').toLowerCase();
  const extension = getExtension(file.name);
  const supported = ALLOWED_MIME_TYPES.has(mimeType) || ALLOWED_EXTENSIONS.has(extension);
  if (!supported) return { valid: false, reason: 'unsupported' };

  return { valid: true, reason: null };
}
