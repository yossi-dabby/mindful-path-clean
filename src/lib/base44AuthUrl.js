const DEFAULT_BASE44_AUTH_BASE_URL =
  'https://mindful-path-75aeaf7d.base44.app';

function normalizeOrigin(value) {
  if (!value) return '';

  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function isBase44HostedOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.base44.app');
  } catch {
    return false;
  }
}

/**
 * Resolve the host used by the Base44 SDK for authentication.
 *
 * Railway serves the SPA and the verified Android callback, but Base44 owns
 * /api/apps/auth/login. A Base44 preview origin may be used directly; every
 * other runtime origin falls back to this app's canonical Base44 host.
 */
export function resolveBase44AuthBaseUrl({
  configuredAuthBaseUrl,
  runtimeOrigin,
} = {}) {
  const configuredOrigin = normalizeOrigin(configuredAuthBaseUrl);
  if (isBase44HostedOrigin(configuredOrigin)) return configuredOrigin;

  const currentOrigin = normalizeOrigin(runtimeOrigin);
  if (isBase44HostedOrigin(currentOrigin)) return currentOrigin;

  return DEFAULT_BASE44_AUTH_BASE_URL;
}

export { DEFAULT_BASE44_AUTH_BASE_URL };
