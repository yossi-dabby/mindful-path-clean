import { describe, expect, it } from 'vitest';
import { createPageUrl } from '../../src/utils/index.js';

describe('createPageUrl navigation security', () => {
  it('creates local application routes and preserves query strings', () => {
    expect(createPageUrl('Home')).toBe('/Home');
    expect(createPageUrl('Therapeutic Forms', 'view=compact')).toBe('/Therapeutic-Forms?view=compact');
    expect(createPageUrl('Goals', '?goal=123')).toBe('/Goals?goal=123');
  });

  it.each([
    '//evil.example',
    String.raw`\\evil.example`,
    String.raw`/\\evil.example`,
    'Home/../../outside',
    'Home?redirect=//evil.example',
    'Home#//evil.example',
    '',
  ])('rejects unsafe route name %s', (routeName) => {
    expect(createPageUrl(routeName)).toBe('/');
  });
});
