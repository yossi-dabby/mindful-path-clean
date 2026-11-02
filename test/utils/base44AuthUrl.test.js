import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE44_AUTH_BASE_URL,
  resolveBase44AuthBaseUrl,
} from '../../src/lib/base44AuthUrl.js';

describe('Base44 authentication host', () => {
  it('uses the explicitly configured app-specific Base44 host', () => {
    expect(resolveBase44AuthBaseUrl({
      configuredAuthBaseUrl: 'https://mindful-path-75aeaf7d.base44.app/path',
      runtimeOrigin: 'https://mindful-path-production-7704.up.railway.app',
    })).toBe('https://mindful-path-75aeaf7d.base44.app');
  });

  it('keeps a Base44 preview origin when no host is configured', () => {
    expect(resolveBase44AuthBaseUrl({
      runtimeOrigin: 'https://preview--mindful-path.base44.app/login',
    })).toBe('https://preview--mindful-path.base44.app');
  });

  it('never routes Base44 OAuth to Railway or an invalid configured host', () => {
    expect(resolveBase44AuthBaseUrl({
      configuredAuthBaseUrl: 'https://mindful-path-production-7704.up.railway.app',
      runtimeOrigin: 'https://mindful-path-production-7704.up.railway.app',
    })).toBe(DEFAULT_BASE44_AUTH_BASE_URL);

    expect(resolveBase44AuthBaseUrl({
      configuredAuthBaseUrl: 'not-a-url',
      runtimeOrigin: 'capacitor://localhost',
    })).toBe(DEFAULT_BASE44_AUTH_BASE_URL);
  });
});
