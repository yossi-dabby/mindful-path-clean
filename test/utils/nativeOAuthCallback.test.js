import { describe, expect, it } from 'vitest';
import {
  ANDROID_AUTH_CALLBACK_PATH,
  ANDROID_AUTH_CALLBACK_URL,
  buildOAuthReturnTo,
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
