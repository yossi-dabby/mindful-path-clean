const ANDROID_AUTH_CALLBACK_ORIGIN =
  'https://mindful-path-production-7704.up.railway.app';

export const ANDROID_AUTH_CALLBACK_PATH = '/native-auth-callback';
export const ANDROID_AUTH_CALLBACK_URL =
  `${ANDROID_AUTH_CALLBACK_ORIGIN}${ANDROID_AUTH_CALLBACK_PATH}`;

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
    const url = new URL(rawReturnTo, ANDROID_AUTH_CALLBACK_ORIGIN);
    if (url.origin !== ANDROID_AUTH_CALLBACK_ORIGIN) return '/';

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
  { isNativePlatform = false, platform = 'web' } = {},
) {
  if (!isNativePlatform || platform !== 'android') {
    return returnTo;
  }

  const callback = new URL(ANDROID_AUTH_CALLBACK_URL);
  callback.searchParams.set('returnTo', sanitizeNativeReturnTo(returnTo));
  return callback.toString();
}

export function parseAndroidOAuthCallback(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (
      url.origin !== ANDROID_AUTH_CALLBACK_ORIGIN ||
      url.pathname !== ANDROID_AUTH_CALLBACK_PATH
    ) {
      return null;
    }

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const accessToken =
      url.searchParams.get('access_token') ||
      hashParams.get('access_token');

    if (!accessToken) return null;

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
