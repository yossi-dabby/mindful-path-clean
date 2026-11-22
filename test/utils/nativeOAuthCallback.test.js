import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANDROID_AUTH_CALLBACK_PATH,
  ANDROID_AUTH_CALLBACK_URL,
  buildOAuthReturnTo,
  completeIOSOAuthCallback,
  parseAndroidOAuthCallback,
  sanitizeNativeReturnTo,
} from '../../src/lib/nativeOAuth.js';

describe('Android native OAuth callback', () => {
  it('keeps browser OAuth return paths unchanged', () => {
    expect(buildOAuthReturnTo('/Journal?tab=today')).toBe('/Journal?tab=today');
  });

  it('uses the verified HTTPS app link on Android', () => {
    const result = buildOAuthReturnTo('/Journal?tab=today', {
      isNativePlatform: true,
      platform: 'android',
    });
    const url = new URL(result);

    expect(`${url.origin}${url.pathname}`).toBe(ANDROID_AUTH_CALLBACK_URL);
    expect(url.pathname).toBe(ANDROID_AUTH_CALLBACK_PATH);
    expect(url.searchParams.get('returnTo')).toBe('/Journal?tab=today');
  });

  it('extracts the Base44 token and a safe in-app destination', () => {
    const callback = new URL(ANDROID_AUTH_CALLBACK_URL);
    callback.searchParams.set('returnTo', '/Home?welcome=1');
    callback.searchParams.set('access_token', 'test-token');

    expect(parseAndroidOAuthCallback(callback.toString())).toEqual({
      accessToken: 'test-token',
      returnTo: '/Home?welcome=1',
    });
  });

  it('accepts OAuth tokens returned in the URL fragment', () => {
    const callback =
      `${ANDROID_AUTH_CALLBACK_URL}#access_token=test-token&returnTo=%2FMyPath`;

    expect(parseAndroidOAuthCallback(callback)).toEqual({
      accessToken: 'test-token',
      returnTo: '/MyPath',
    });
  });

  it('rejects unverified hosts, missing tokens, and unsafe destinations', () => {
    expect(
      parseAndroidOAuthCallback(
        'https://evil.example/native-auth-callback?access_token=test-token',
      ),
    ).toBeNull();
    expect(parseAndroidOAuthCallback(ANDROID_AUTH_CALLBACK_URL)).toBeNull();
    expect(sanitizeNativeReturnTo('https://evil.example/phishing')).toBe('/');
    expect(sanitizeNativeReturnTo('//evil.example/phishing')).toBe('/');
  });

  it('removes auth bootstrap parameters before returning to the app', () => {
    expect(
      sanitizeNativeReturnTo(
        '/Home?access_token=leak&app_id=wrong&tab=progress',
      ),
    ).toBe('/Home?tab=progress');
  });
});

describe('iOS native OAuth return', () => {
  let storage, values, setToken, navigate;
  const startedAt = 100_000;
  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    setToken = vi.fn();
    navigate = vi.fn();
  });
  const start = (returnTo = '/Journal?tab=today') => new URL(buildOAuthReturnTo(returnTo, {
    isNativePlatform: true, platform: 'ios', storage, now: () => startedAt,
  }));
  const finish = (url, now = startedAt + 1000) => completeIOSOAuthCallback(String(url), {
    storage, setToken, navigate, now: () => now,
  });

  it('returns through the verified HTTPS domain and consumes the pending sign-in once', () => {
    const url = start();
    expect(url.origin + url.pathname).toBe(ANDROID_AUTH_CALLBACK_URL);
    expect(url.searchParams.get('native_state')).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify([...values])).not.toContain('test-token');
    url.searchParams.set('access_token', 'test-token');
    expect(finish(url)).toBe(true);
    expect(setToken).toHaveBeenCalledWith('test-token');
    expect(navigate).toHaveBeenCalledWith('/Journal?tab=today');
    expect(values.size).toBe(0);
    expect(finish(url)).toBe(false);
    expect(setToken).toHaveBeenCalledTimes(1);
  });

  it('accepts a fragment token after a cold start and ignores a modified destination', () => {
    const url = start('/MyPath?access_token=leak&tab=goals');
    url.searchParams.set('returnTo', 'https://evil.example');
    url.hash = 'access_token=fragment-token';
    // A new storage wrapper sees the same persisted attempt after app restart.
    const restartedStorage = { ...storage };
    expect(completeIOSOAuthCallback(String(url), {
      storage: restartedStorage, setToken, navigate, now: () => startedAt + 1000,
    })).toBe(true);
    expect(setToken).toHaveBeenCalledWith('fragment-token');
    expect(navigate).toHaveBeenCalledWith('/MyPath?tab=goals');
  });

  it.each(['missing-state', 'wrong-state', 'missing-token', 'blank-token', 'wrong-host', 'wrong-path', 'http', 'credentials', 'custom-scheme'])(
    'rejects %s without changing the session or consuming a valid attempt', (kind) => {
      const url = start();
      url.searchParams.set('access_token', 'test-token');
      if (kind === 'missing-state') url.searchParams.delete('native_state');
      if (kind === 'wrong-state') url.searchParams.set('native_state', 'not-this-installation');
      if (kind === 'missing-token') url.searchParams.delete('access_token');
      if (kind === 'blank-token') url.searchParams.set('access_token', ' ');
      if (kind === 'wrong-host') url.hostname = 'evil.example';
      if (kind === 'wrong-path') url.pathname = '/Home';
      if (kind === 'http') url.protocol = 'http:';
      if (kind === 'credentials') url.username = 'attacker';
      const result = finish(kind === 'custom-scheme' ? 'mindfulpath://native-auth-callback?access_token=test-token' : url);
      expect(result).toBe(false);
      expect(setToken).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(values.size).toBe(1);
    });

  it('rejects callbacks without a pending sign-in', () => {
    expect(finish(ANDROID_AUTH_CALLBACK_URL + '?access_token=unsolicited&native_state=random')).toBe(false);
    expect(setToken).not.toHaveBeenCalled();
  });

  it.each([startedAt - 1, startedAt + 10 * 60 * 1000 + 1])('rejects expired or future-dated attempts (%s)', (now) => {
    const url = start();
    url.searchParams.set('access_token', 'test-token');
    expect(finish(url, now)).toBe(false);
    expect(setToken).not.toHaveBeenCalled();
  });

  it('invalidates the old callback when another sign-in starts', () => {
    const old = start();
    old.searchParams.set('access_token', 'old-token');
    const current = start('/Home');
    current.searchParams.set('access_token', 'current-token');
    expect(finish(old)).toBe(false);
    expect(finish(current)).toBe(true);
    expect(setToken).toHaveBeenCalledWith('current-token');
  });

  it('fails closed for unreadable persisted state', () => {
    const url = start();
    url.searchParams.set('access_token', 'test-token');
    storage.getItem = () => '{invalid';
    expect(finish(url)).toBe(false);
    expect(setToken).not.toHaveBeenCalled();
  });

  it('keeps web and unsupported platforms free of native state', () => {
    expect(buildOAuthReturnTo('/Home', { isNativePlatform: false, platform: 'ios', storage })).toBe('/Home');
    expect(buildOAuthReturnTo('/Home', { isNativePlatform: true, platform: 'other', storage })).toBe('/Home');
    expect(values.size).toBe(0);
  });
});
