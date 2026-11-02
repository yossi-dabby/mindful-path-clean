import { LEGAL_CONSENT_VERSION } from '../components/legal/legalContent.js';

export const CHAT_CONSENT_ACCEPTED_KEY = 'chat_consent_accepted';
export const CHAT_CONSENT_VERSION_KEY = 'chat_consent_version';
export const CHAT_CONSENT_USER_KEY = 'chat_consent_user_id';
export const CHAT_CONSENT_DOCUMENT = 'ai_chat_terms_and_privacy';

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function hasCurrentChatConsent(storage, userId) {
  const target = resolveStorage(storage);
  if (!target || !userId) return false;

  return target.getItem(CHAT_CONSENT_ACCEPTED_KEY) === 'true'
    && target.getItem(CHAT_CONSENT_VERSION_KEY) === LEGAL_CONSENT_VERSION
    && target.getItem(CHAT_CONSENT_USER_KEY) === String(userId);
}

export function persistCurrentChatConsent(storage, userId) {
  const target = resolveStorage(storage);
  if (!target || !userId) return;

  target.setItem(CHAT_CONSENT_ACCEPTED_KEY, 'true');
  target.setItem(CHAT_CONSENT_VERSION_KEY, LEGAL_CONSENT_VERSION);
  target.setItem(CHAT_CONSENT_USER_KEY, String(userId));
}

export async function resolveCurrentChatConsent(base44Client, storage) {
  const user = await base44Client.auth.me();
  if (!user?.id) return false;

  if (hasCurrentChatConsent(storage, user.id)) return true;

  const records = await base44Client.entities.ConsentRecord.filter(
    {
      document: CHAT_CONSENT_DOCUMENT,
      version: LEGAL_CONSENT_VERSION
    },
    '-accepted_at',
    1,
    0
  );

  if (!Array.isArray(records) || records.length === 0) return false;

  persistCurrentChatConsent(storage, user.id);
  return true;
}
