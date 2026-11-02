import { describe, it, expect } from 'vitest';
import {
  buildExternalLoginUrl,
  resolveAuthBaseUrl,
  resolveSafeReturnUrl,
} from '../../src/lib/loginBridge.js';

describe('login bridge auth host resolution', () => {
  it('prefers VITE_BASE44_AUTH_BASE_URL over the Railway app URL', () => {
    const authBaseUrl = resolveAuthBaseUrl(
      {
        VITE_BASE44_AUTH_BASE_URL: 'https://mindful-path-75aeaf7d.base44.app',
        VITE_BASE44_APP_BASE_URL: 'https://mindful-path-production-7704.up.railway.app',
      },
      { origin: 'https://mindful-path-production-7704.up.railway.app' },
    );

    expect(authBaseUrl).toBe('https://mindful-path-75aeaf7d.base44.app');
  });

  it('rejects the generic base44.app auth host fallback', () => {
    const authBaseUrl = resolveAuthBaseUrl(
      {
        VITE_BASE44_AUTH_BASE_URL: 'https://base44.app',
        VITE_BASE44_APP_BASE_URL: 'https://mindful-path-production-7704.up.railway.app',
      },
      { origin: 'https://mindful-path-production-7704.up.railway.app' },
    );

    expect(authBaseUrl).toBeNull();
  });
});

describe('login bridge returnUrl safety', () => {
  it('keeps same-origin return URLs on the Railway app host', () => {
    const safeReturnUrl = resolveSafeReturnUrl(
      '/chat?tab=latest',
      'https://mindful-path-production-7704.up.railway.app',
    );

    expect(safeReturnUrl).toBe('https://mindful-path-production-7704.up.railway.app/chat?tab=latest');
  });

  it('falls back to the Railway app origin for cross-origin return URLs', () => {
    const safeReturnUrl = resolveSafeReturnUrl(
      'https://evil.example/steal-session',
      'https://mindful-path-production-7704.up.railway.app',
    );

    expect(safeReturnUrl).toBe('https://mindful-path-production-7704.up.railway.app/');
  });
});

describe('login bridge URL generation', () => {
  it('builds the external login URL on the app-specific Base44 auth host', () => {
    const loginUrl = buildExternalLoginUrl({
      env: {
        VITE_BASE44_AUTH_BASE_URL: 'https://mindful-path-75aeaf7d.base44.app',
        VITE_BASE44_APP_BASE_URL: 'https://mindful-path-production-7704.up.railway.app',
      },
      location: {
        origin: 'https://mindful-path-production-7704.up.railway.app',
        search: '?next=%2Fdashboard%3Ffrom%3Dlogin&functions_version=fv-123&app_id=app-123',
      },
    });

    const parsed = new URL(loginUrl);

    expect(parsed.origin).toBe('https://mindful-path-75aeaf7d.base44.app');
    expect(parsed.pathname).toBe('/login');
    expect(parsed.searchParams.get('app_id')).toBe('app-123');
    expect(parsed.searchParams.get('functions_version')).toBe('fv-123');
    expect(parsed.searchParams.get('next')).toBe('/dashboard?from=login');
    expect(parsed.searchParams.get('returnUrl')).toBe(
      'https://mindful-path-production-7704.up.railway.app/dashboard?from=login',
    );
    expect(parsed.searchParams.get('from_url')).toBe(
      'https://mindful-path-production-7704.up.railway.app/dashboard?from=login',
    );
  });
});
