// Server-only sender for the app's shared business Gmail connection.
// Gmail tokens never leave the backend and are refreshed by Base44.
export const BUSINESS_EMAIL = 'contact@mindful-path.me';

export function normalizeEmailRecipient(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+\/=?^_\x60{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email)) {
    return null;
  }
  return email;
}

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}

function encodeSubject(subject) {
  // RFC 2047 encoded words must be <=75 characters; do not split UTF-8 characters.
  const words = [];
  let chunk = '';
  for (const character of subject) {
    if (new TextEncoder().encode(chunk + character).length > 42) {
      words.push('=?UTF-8?B?' + utf8Base64(chunk) + '?=');
      chunk = '';
    }
    chunk += character;
  }
  if (chunk) words.push('=?UTF-8?B?' + utf8Base64(chunk) + '?=');
  return words.join('\r\n ');
}

export async function sendBusinessEmail(base44, { to, subject, body, html = false }) {
  const recipient = normalizeEmailRecipient(to);
  if (!recipient) throw new Error('Invalid email recipient');
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 512) {
    throw new Error('Invalid email subject');
  }
  if (typeof body !== 'string' || body.length > 100000) {
    throw new Error('Invalid email body');
  }

  const mime = [
    'From: Mindful Path <' + BUSINESS_EMAIL + '>',
    'Reply-To: ' + BUSINESS_EMAIL,
    'To: ' + recipient,
    'Subject: ' + encodeSubject(subject.replace(/[\r\n]+/g, ' ').trim()),
    'MIME-Version: 1.0',
    'Content-Type: ' + (html ? 'text/html' : 'text/plain') + '; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    (utf8Base64(body).match(/.{1,76}/g) || []).join('\r\n'),
  ].join('\r\n');
  const raw = utf8Base64(mime).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

  let accessToken;
  try {
    ({ accessToken } = await base44.asServiceRole.connectors.getConnection('gmail'));
    if (!accessToken) throw new Error('Missing connection');
  } catch {
    throw new Error('Business Gmail connection unavailable');
  }

  let response;
  try {
    // Pin the mailbox, so reconnecting the connector to a different account cannot
    // silently change the sender. No inbox read or delete scopes are needed.
    response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(BUSINESS_EMAIL) + '/messages/send',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    // Never expose an OAuth token, MIME content, or provider response in errors.
    throw new Error('Business Gmail request failed');
  }
  if (!response.ok) throw new Error('Business Gmail rejected the message (HTTP ' + response.status + ')');
  const result = await response.json().catch(() => null);
  if (!result?.id) throw new Error('Business Gmail did not confirm the message');
  return { provider: 'gmail', messageId: result.id };
}
