import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── entityListNormalizer tests ──────────────────────────────────────────────

// The module uses import.meta.env.DEV; provide a minimal stub so it can be
// imported outside of a Vite build context.
vi.stubGlobal('import', {
  meta: { env: { DEV: false } },
});

import { normalizeEntityList } from '../../src/lib/entityListNormalizer.js';

describe('normalizeEntityList', () => {
  it('returns a bare array unchanged', () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(normalizeEntityList(arr)).toBe(arr);
  });

  it('extracts results from a paginated envelope', () => {
    const results = [{ id: 'a' }, { id: 'b' }];
    const envelope = { count: 2, results };
    expect(normalizeEntityList(envelope)).toBe(results);
  });

  it('returns [] for null', () => {
    expect(normalizeEntityList(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(normalizeEntityList(undefined)).toEqual([]);
  });

  it('returns [] for a plain object without results', () => {
    expect(normalizeEntityList({ count: 0 })).toEqual([]);
  });

  it('returns [] when results is not an array', () => {
    expect(normalizeEntityList({ count: 1, results: 'oops' })).toEqual([]);
  });

  it('returns [] for a number', () => {
    expect(normalizeEntityList(42)).toEqual([]);
  });

  it('returns [] for an empty string', () => {
    expect(normalizeEntityList('')).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(normalizeEntityList([])).toEqual([]);
  });

  it('handles an envelope with an empty results array', () => {
    expect(normalizeEntityList({ count: 0, results: [] })).toEqual([]);
  });
});

describe('normalizeEntityList – falsy-but-valid values', () => {
  it('returns [] for an empty string (falsy but defined)', () => {
    expect(normalizeEntityList('')).toEqual([]);
  });

  it('returns [] for an envelope with count 0 and empty results', () => {
    expect(normalizeEntityList({ count: 0, results: [] })).toEqual([]);
  });

  it('extracts results from an envelope with count 1', () => {
    expect(normalizeEntityList({ count: 1, results: [{ id: 'x' }] }))
      .toEqual([{ id: 'x' }]);
  });
});
