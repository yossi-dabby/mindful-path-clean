export const SUPPORTED_APP_LOCALES = Object.freeze([
  'en',
  'he',
  'es',
  'fr',
  'de',
  'it',
  'pt'
]);

export const DEFAULT_APP_LOCALE = 'en';
export const APP_LANGUAGE_STORAGE_KEY = 'language';

export const APP_LOCALE_TO_BCP47 = Object.freeze({
  en: 'en',
  he: 'he-IL',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt-BR'
});

function getDefaultStorage() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
  } catch (_) {
    return undefined;
  }
}

function getDefaultDocument() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.document : undefined;
  } catch (_) {
    return undefined;
  }
}

export function normalizeAppLocale(value, fallback = null) {
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  const baseLanguage = normalized.split('-')[0];

  return SUPPORTED_APP_LOCALES.includes(baseLanguage) ? baseLanguage : fallback;
}

export function readStoredAppLocale(storage = getDefaultStorage()) {
  try {
    return normalizeAppLocale(storage?.getItem(APP_LANGUAGE_STORAGE_KEY));
  } catch (_) {
    return null;
  }
}

export function resolveAppLocale({
  profileLocale,
  sessionLocale,
  storedLocale,
  currentLocale
} = {}) {
  return (
    normalizeAppLocale(profileLocale) ||
    normalizeAppLocale(sessionLocale) ||
    normalizeAppLocale(storedLocale) ||
    normalizeAppLocale(currentLocale) ||
    DEFAULT_APP_LOCALE
  );
}

export function resolveInitialAppLocale(storage = getDefaultStorage()) {
  return resolveAppLocale({ storedLocale: readStoredAppLocale(storage) });
}

export function getCurrentAppLocale(i18nInstance, storage = getDefaultStorage()) {
  return resolveAppLocale({
    currentLocale: i18nInstance?.resolvedLanguage || i18nInstance?.language,
    storedLocale: readStoredAppLocale(storage)
  });
}

export function getAppFormattingLocale(locale) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);
  return APP_LOCALE_TO_BCP47[normalized];
}

export function persistAppLocale(locale, storage = getDefaultStorage()) {
  const normalized = normalizeAppLocale(locale);
  if (!normalized) return null;

  try {
    storage?.setItem(APP_LANGUAGE_STORAGE_KEY, normalized);
  } catch (_) {
    // Storage can be unavailable in private browsing or restricted webviews.
  }

  return normalized;
}

export function applyAppLocaleToDocument(locale, doc = getDefaultDocument()) {
  const normalized = normalizeAppLocale(locale, DEFAULT_APP_LOCALE);

  if (doc?.documentElement) {
    doc.documentElement.lang = normalized;
    doc.documentElement.dir = normalized === 'he' ? 'rtl' : 'ltr';
  }

  return normalized;
}

export function applyAppLocaleSideEffects(
  locale,
  { storage = getDefaultStorage(), doc = getDefaultDocument() } = {}
) {
  const normalized = persistAppLocale(locale, storage) || DEFAULT_APP_LOCALE;
  applyAppLocaleToDocument(normalized, doc);
  return normalized;
}

export async function changeAppLocale(
  i18nInstance,
  locale,
  { storage = getDefaultStorage(), doc = getDefaultDocument() } = {}
) {
  const normalized = normalizeAppLocale(locale);
  if (!normalized) return null;

  if (i18nInstance?.language !== normalized) {
    await i18nInstance?.changeLanguage?.(normalized);
  }

  // Keep this explicit as well as the i18next languageChanged listener so
  // callers remain correct with test doubles and during early app bootstrap.
  applyAppLocaleSideEffects(normalized, { storage, doc });
  return normalized;
}
