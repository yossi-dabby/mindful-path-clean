import { describe, it, expect } from 'vitest';
import { resolveAppId } from '../../src/lib/app-params.js';

describe('resolveAppId', () => {
  it('prefers test app id over all other sources', () => {
    expect(resolveAppId({
      testAppId: 'test-app-id',
      viteAppId: 'vite-app-id',
      legacyAppId: 'legacy-app-id',
      queryAppId: 'query-app-id',
      storedAppId: 'stored-app-id',
    })).toBe('test-app-id');
  });

  it('prefers vite app id over query and stored values', () => {
    expect(resolveAppId({
      viteAppId: '69504b725a07f5aa75aeaf7d',
      queryAppId: 'mindful-path-75aeaf7d.base44.app',
      storedAppId: 'mindful-path-75aeaf7d.base44.app',
    })).toBe('69504b725a07f5aa75aeaf7d');
  });

  it('uses legacy env app id when vite app id is absent', () => {
    expect(resolveAppId({
      legacyAppId: 'legacy-app-id',
      queryAppId: 'query-app-id',
      storedAppId: 'stored-app-id',
    })).toBe('legacy-app-id');
  });

  it('uses query app id when env app ids are absent', () => {
    expect(resolveAppId({
      queryAppId: 'query-app-id',
      storedAppId: 'stored-app-id',
    })).toBe('query-app-id');
  });

  it('uses stored app id when no higher-priority source exists', () => {
    expect(resolveAppId({
      storedAppId: 'stored-app-id',
    })).toBe('stored-app-id');
  });

  it('returns null when no source provides an app id', () => {
    expect(resolveAppId({})).toBeNull();
  });
});
