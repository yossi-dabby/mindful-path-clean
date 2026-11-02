const APP_SPECIFIC_BASE44_HOST_SUFFIX = '.base44.app';
const GENERIC_BASE44_AUTH_HOST = 'base44.app';
const FORWARDED_LOGIN_QUERY_KEYS = new Set([
  'app_id',
  'functions_version',
  'next',
  'nextUrl',
]);

function normalizeOrigin(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return null;

  try {
    return new URL(rawValue).origin;
  } catch {
    return null;
  }
}

function isAppSpecificBase44AuthOrigin(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return false;

  try {
    const { hostname } = new URL(rawValue);
    return hostname.endsWith(APP_SPECIFIC_BASE44_HOST_SUFFIX) && hostname !== GENERIC_BASE44_AUTH_HOST;
  } catch {
    return false;
  }
}

export function resolveSafeReturnUrl(rawValue, currentOrigin) {
  const safeOrigin =
    normalizeOrigin(currentOrigin) ||
    normalizeOrigin(typeof window !== 'undefined' ? window.location.origin : null);
  if (!safeOrigin) return '/';

  const fallback = new URL('/', safeOrigin).toString();
  if (typeof rawValue !== 'string' || !rawValue.trim()) return fallback;

  try {
    const parsed = new URL(rawValue, safeOrigin);
    if (parsed.origin !== safeOrigin) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function resolveAuthBaseUrl(
  env = import.meta.env,
  location = typeof window !== 'undefined' ? window.location : undefined,
) {
  const configuredAuthBase = normalizeOrigin(env?.VITE_BASE44_AUTH_BASE_URL);
  if (isAppSpecificBase44AuthOrigin(configuredAuthBase)) {
    return configuredAuthBase;
  }

  const configuredAppBase = normalizeOrigin(env?.VITE_BASE44_APP_BASE_URL);
  if (isAppSpecificBase44AuthOrigin(configuredAppBase)) {
    return configuredAppBase;
  }

  const currentOrigin = normalizeOrigin(location?.origin);
  if (isAppSpecificBase44AuthOrigin(currentOrigin)) {
    return currentOrigin;
  }

  return null;
}

function setParamIfNotPresent(searchParams, key, value) {
  if (!value || searchParams.get(key)) return;
  searchParams.set(key, value);
}

export function buildExternalLoginUrl(
  {
    env = import.meta.env,
    location = typeof window !== 'undefined' ? window.location : undefined,
    appConfig = {},
  } = {},
) {
  const authBase = resolveAuthBaseUrl(env, location);
  if (!authBase || !location?.origin) return null;

  const externalLoginUrl = new URL('/login', authBase);
  const incoming = new URLSearchParams(location.search || '');

  incoming.forEach((value, key) => {
    if (!FORWARDED_LOGIN_QUERY_KEYS.has(key)) return;
    externalLoginUrl.searchParams.set(key, value);
  });

  const requestedReturn =
    incoming.get('returnUrl') ||
    incoming.get('from_url') ||
    incoming.get('next') ||
    incoming.get('nextUrl');
  const safeReturnUrl = resolveSafeReturnUrl(requestedReturn, location.origin);
  externalLoginUrl.searchParams.set('returnUrl', safeReturnUrl);
  externalLoginUrl.searchParams.set('from_url', safeReturnUrl);

  setParamIfNotPresent(externalLoginUrl.searchParams, 'app_id', appConfig.appId);
  setParamIfNotPresent(externalLoginUrl.searchParams, 'functions_version', appConfig.functionsVersion);

  return externalLoginUrl.toString();
}
