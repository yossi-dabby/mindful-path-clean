const NATIVE_AUTH_CALLBACK_ORIGIN =
  'https://mindful-path-production-7704.up.railway.app';

export const NATIVE_AUTH_CALLBACK_PATH = '/native-auth-callback';
export const NATIVE_AUTH_CALLBACK_URL =
  `${NATIVE_AUTH_CALLBACK_ORIGIN}${NATIVE_AUTH_CALLBACK_PATH}`;
// Keep the Android API stable for existing consumers.
export const ANDROID_AUTH_CALLBACK_PATH = NATIVE_AUTH_CALLBACK_PATH;
export const ANDROID_AUTH_CALLBACK_URL = NATIVE_AUTH_CALLBACK_URL;

const IOS_OAUTH_ATTEMPT_KEY = 'mindfulpath:ios-oauth-attempt';
const IOS_OAUTH_TIMEOUT_MS = 10 * 60 * 1000;

const AUTH_BOOTSTRAP_PARAMS = [
  'access_token',
  'clear_access_token',
  'app_id',
  'app_base_url',
  'functions_version',
  'from_url',
];

export function sanitizeNativeReturnTo(rawReturnTo) {
  if (!rawReturnTo) return '/';

  try {
    const url = new URL(rawReturnTo, NATIVE_AUTH_CALLBACK_ORIGIN);
    if (url.origin !== NATIVE_AUTH_CALLBACK_ORIGIN) return '/';

    for (const param of AUTH_BOOTSTRAP_PARAMS) {
      url.searchParams.delete(param);
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      return '/';
    }

    return path;
  } catch {
    return '/';
  }
}

export function buildOAuthReturnTo(
  returnTo,
  { isNativePlatform = false, platform = 'web', storage, now = Date.now } = {},
) {
  if (!isNativePlatform || !['android', 'ios'].includes(platform)) {
    return returnTo;
  }

  const callback = new URL(NATIVE_AUTH_CALLBACK_URL);
  const destination = sanitizeNativeReturnTo(returnTo);
  callback.searchParams.set('returnTo', destination);
  if (platform === 'ios') {
    // Persist only a short-lived nonce and destination, never an access token.
    // localStorage survives a cold app launch after the system browser returns.
    // getRandomValues also works in WKWebView's custom-scheme context, where
    // secure-context-only APIs such as randomUUID may be unavailable.
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const attemptStorage = storage || globalThis.localStorage;
    attemptStorage.setItem(IOS_OAUTH_ATTEMPT_KEY, JSON.stringify({ state, returnTo: destination, startedAt: now() }));
    callback.searchParams.set('native_state', state);
  }
  return callback.toString();
}

export function parseNativeOAuthCallback(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (
      url.username || url.password ||
      url.origin !== NATIVE_AUTH_CALLBACK_ORIGIN ||
      url.pathname !== ANDROID_AUTH_CALLBACK_PATH
    ) {
      return null;
    }

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const accessToken =
      url.searchParams.get('access_token') ||
      hashParams.get('access_token');

    if (!accessToken?.trim()) return null;

    const returnTo =
      url.searchParams.get('returnTo') ||
      hashParams.get('returnTo') ||
      '/';

    return {
      accessToken,
      returnTo: sanitizeNativeReturnTo(returnTo),
    };
  } catch {
    return null;
  }
}


/**
 * Complete only an iOS sign-in initiated by this installation. A trusted host
 * alone does not prove that a callback belongs to the user's pending sign-in.
 * The provider's own OAuth state remains separate from native_state.
 */
export function completeIOSOAuthCallback(rawUrl, {
  setToken,
  navigate,
  storage = globalThis.localStorage,
  now = Date.now,
}) {
  const callback = parseNativeOAuthCallback(rawUrl);
  if (!callback) return false;

  let pending;
  try {
    pending = JSON.parse(storage.getItem(IOS_OAUTH_ATTEMPT_KEY));
  } catch {
    return false;
  }

  const url = new URL(rawUrl);
  const state = url.searchParams.get('native_state');
  const age = now() - pending?.startedAt;
  if (
    !state || !pending?.state || state !== pending.state ||
    !Number.isFinite(pending?.startedAt) || !Number.isFinite(age) || age < 0 || age > IOS_OAUTH_TIMEOUT_MS
  ) return false;

  // Use the destination stored before leaving the app, not a callback override.
  setToken(callback.accessToken);
  storage.removeItem(IOS_OAUTH_ATTEMPT_KEY);
  navigate(sanitizeNativeReturnTo(pending.returnTo));
  return true;
}

export const parseAndroidOAuthCallback = parseNativeOAuthCallback;
