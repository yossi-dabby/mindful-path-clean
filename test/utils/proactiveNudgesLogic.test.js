/**
 * Tests for proactive nudge utility logic (mirrors functions/checkProactiveNudges.ts).
 *
 * That file is a Deno serverless function excluded from vitest. It contains two
 * inline pure utility functions that are reproduced here:
 *   - safeDaysDiff(date1, date2): safe day-difference between two dates (non-negative)
 *   - validateProgress(progress): clamps and validates a progress value to [0, 100]
 *
 * Covers:
 *   - Normal date arithmetic with Date objects and ISO strings
 *   - Negative day difference is clamped to 0 (non-negative guarantee)
 *   - Invalid/NaN/null inputs to safeDaysDiff fall back to 0
 *   - Progress clamping at 0 and 100 boundaries
 *   - Non-numeric and degenerate inputs to validateProgress return 0
 *   - Numeric strings are coerced correctly
 *
 * If the safeDaysDiff or validateProgress logic in functions/checkProactiveNudges.ts
 * changes, update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── MIRRORED LOGIC (from functions/checkProactiveNudges.ts) ─────────────────

const safeDaysDiff = (date1, date2) => {
  const ms1 = date1 instanceof Date ? date1.getTime() : Date.parse(date1);
  const ms2 = date2 instanceof Date ? date2.getTime() : Date.parse(date2);

  if (!Number.isFinite(ms1) || !Number.isFinite(ms2)) {
    return 0;
  }

  const diffMs = ms1 - ms2;
  if (!Number.isFinite(diffMs)) {
    return 0;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Number.isSafeInteger(days) ? Math.max(0, days) : 0;
};

const validateProgress = (progress) => {
  const num = Number(progress);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

// ─── TESTS — safeDaysDiff: normal arithmetic ──────────────────────────────────

describe('proactiveNudgesLogic – safeDaysDiff (normal arithmetic)', () => {
  it('returns correct day count between two Date objects', () => {
    const d1 = new Date('2024-06-20T00:00:00Z');
    const d2 = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(d1, d2)).toBe(5);
  });

  it('returns correct day count between two ISO strings', () => {
    expect(safeDaysDiff('2024-06-22T00:00:00Z', '2024-06-15T00:00:00Z')).toBe(7);
  });

  it('returns 0 when both dates are identical Date objects', () => {
    const d = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(d, d)).toBe(0);
  });

  it('returns 0 when both dates are identical ISO strings', () => {
    expect(safeDaysDiff('2024-06-15T00:00:00Z', '2024-06-15T00:00:00Z')).toBe(0);
  });

  it('handles mixed Date object and ISO string inputs', () => {
    const d1 = new Date('2024-06-20T00:00:00Z');
    const d2 = '2024-06-15T00:00:00Z';
    expect(safeDaysDiff(d1, d2)).toBe(5);
  });

  it('returns 1 for exactly 24 hours apart', () => {
    const d1 = new Date('2024-06-16T00:00:00Z');
    const d2 = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(d1, d2)).toBe(1);
  });

  it('floors partial days (not ceiling)', () => {
    // 1.5 days difference = floor(1.5) = 1
    const d1 = new Date('2024-06-16T12:00:00Z');
    const d2 = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(d1, d2)).toBe(1);
  });
});

// ─── TESTS — safeDaysDiff: non-negative guarantee ────────────────────────────

describe('proactiveNudgesLogic – safeDaysDiff (non-negative guarantee)', () => {
  it('returns 0 when date1 is before date2', () => {
    const d1 = new Date('2024-06-10T00:00:00Z');
    const d2 = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(d1, d2)).toBe(0);
  });

  it('returns 0 (not negative) for a date in the distant past vs. now', () => {
    const past = new Date('2020-01-01T00:00:00Z');
    const future = new Date('2024-06-15T00:00:00Z');
    expect(safeDaysDiff(past, future)).toBe(0);
  });
});

// ─── TESTS — safeDaysDiff: invalid input handling ────────────────────────────

describe('proactiveNudgesLogic – safeDaysDiff (invalid inputs)', () => {
  it('returns 0 when date1 is null', () => {
    expect(safeDaysDiff(null, new Date('2024-06-15T00:00:00Z'))).toBe(0);
  });

  it('returns 0 when date2 is null', () => {
    expect(safeDaysDiff(new Date('2024-06-15T00:00:00Z'), null)).toBe(0);
  });

  it('returns 0 when date1 is undefined', () => {
    expect(safeDaysDiff(undefined, new Date('2024-06-15T00:00:00Z'))).toBe(0);
  });

  it('returns 0 when date2 is undefined', () => {
    expect(safeDaysDiff(new Date('2024-06-15T00:00:00Z'), undefined)).toBe(0);
  });

  it('returns 0 when date1 is an invalid date string', () => {
    expect(safeDaysDiff('not-a-date', new Date('2024-06-15T00:00:00Z'))).toBe(0);
  });

  it('returns 0 when date2 is an invalid date string', () => {
    expect(safeDaysDiff(new Date('2024-06-15T00:00:00Z'), 'not-a-date')).toBe(0);
  });

  it('returns 0 when both inputs are invalid strings', () => {
    expect(safeDaysDiff('bad', 'also-bad')).toBe(0);
  });

  it('returns 0 when date1 is NaN', () => {
    expect(safeDaysDiff(NaN, new Date('2024-06-15T00:00:00Z'))).toBe(0);
  });

  it('returns 0 when both inputs are NaN', () => {
    expect(safeDaysDiff(NaN, NaN)).toBe(0);
  });

  it('always returns an integer', () => {
    const result = safeDaysDiff(new Date('2024-06-20T12:30:00Z'), new Date('2024-06-15T00:00:00Z'));
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ─── TESTS — validateProgress: numeric inputs ────────────────────────────────

describe('proactiveNudgesLogic – validateProgress (numeric inputs)', () => {
  it('returns value unchanged when within [0, 100]', () => {
    expect(validateProgress(50)).toBe(50);
  });

  it('returns 0 for the lower boundary', () => {
    expect(validateProgress(0)).toBe(0);
  });

  it('returns 100 for the upper boundary', () => {
    expect(validateProgress(100)).toBe(100);
  });

  it('clamps values above 100 to 100', () => {
    expect(validateProgress(150)).toBe(100);
  });

  it('clamps 101 to 100', () => {
    expect(validateProgress(101)).toBe(100);
  });

  it('clamps negative values to 0', () => {
    expect(validateProgress(-10)).toBe(0);
  });

  it('clamps -1 to 0', () => {
    expect(validateProgress(-1)).toBe(0);
  });

  it('handles float values within range', () => {
    expect(validateProgress(72.5)).toBe(72.5);
  });

  it('handles float values above 100', () => {
    expect(validateProgress(100.1)).toBe(100);
  });

  it('handles float values below 0', () => {
    expect(validateProgress(-0.1)).toBe(0);
  });
});

// ─── TESTS — validateProgress: non-numeric / degenerate inputs ───────────────

describe('proactiveNudgesLogic – validateProgress (degenerate inputs)', () => {
  it('returns 0 for undefined', () => {
    expect(validateProgress(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(validateProgress(null)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(validateProgress(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(validateProgress(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity', () => {
    expect(validateProgress(-Infinity)).toBe(0);
  });

  it('returns 0 for a non-numeric string', () => {
    expect(validateProgress('not a number')).toBe(0);
  });

  it('coerces a valid numeric string to a number', () => {
    expect(validateProgress('75')).toBe(75);
  });

  it('clamps a numeric string above 100', () => {
    expect(validateProgress('110')).toBe(100);
  });

  it('clamps a negative numeric string to 0', () => {
    expect(validateProgress('-5')).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    // Number('') === 0, which is within range, but expected behavior from Number cast
    expect(validateProgress('')).toBe(0);
  });
});
