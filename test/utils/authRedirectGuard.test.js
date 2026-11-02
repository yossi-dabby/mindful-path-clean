import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── authRedirectGuard tests ────────────────────────────────────────────────

// Provide import.meta.env stub required by other modules that may load.
vi.stubGlobal('import', {
  meta: { env: { DEV: false } },
});

// Provide a minimal sessionStorage stub (test environment is Node; no browser
// globals are available).
const sessionStorageData = {};
const mockSessionStorage = {
  getItem: (key) => sessionStorageData[key] ?? null,
  setItem: (key, value) => { sessionStorageData[key] = String(value); },
  removeItem: (key) => { delete sessionStorageData[key]; },
  clear: () => { Object.keys(sessionStorageData).forEach((k) => delete sessionStorageData[k]); },
};
vi.stubGlobal('sessionStorage', mockSessionStorage);

import {
  checkAndArmRedirectGuard,
  AUTH_REDIRECT_GUARD_KEY,
  AUTH_REDIRECT_COOLDOWN_MS,
} from '../../src/lib/authRedirectGuard.js';

// ── helpers ───────────────────────────────────────────────────────────────

function clearGuard() {
  sessionStorage.removeItem(AUTH_REDIRECT_GUARD_KEY);
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('checkAndArmRedirectGuard', () => {
  beforeEach(() => {
    clearGuard();
    vi.useRealTimers();
  });

  afterEach(() => {
    clearGuard();
    vi.useRealTimers();
  });

  it('returns true on the first call (no prior redirect)', () => {
    expect(checkAndArmRedirectGuard()).toBe(true);
  });

  it('records the current timestamp in sessionStorage on first call', () => {
    const before = Date.now();
    checkAndArmRedirectGuard();
    const after = Date.now();
    const stored = parseInt(sessionStorage.getItem(AUTH_REDIRECT_GUARD_KEY), 10);
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });

  it('returns false when called a second time within the cooldown window', () => {
    checkAndArmRedirectGuard(); // first call – arms the guard
    expect(checkAndArmRedirectGuard()).toBe(false); // immediate second call – blocked
  });

  it('returns true again after the cooldown window has elapsed', () => {
    vi.useFakeTimers();
    checkAndArmRedirectGuard(); // arm the guard

    // Advance time past the cooldown period
    vi.advanceTimersByTime(AUTH_REDIRECT_COOLDOWN_MS + 1);

    expect(checkAndArmRedirectGuard()).toBe(true);
  });

  it('returns false when called just before the cooldown expires', () => {
    vi.useFakeTimers();
    checkAndArmRedirectGuard(); // arm the guard

    // Advance time to just before the cooldown expires
    vi.advanceTimersByTime(AUTH_REDIRECT_COOLDOWN_MS - 1);

    expect(checkAndArmRedirectGuard()).toBe(false);
  });

  it('returns true when sessionStorage is unavailable (getItem throws)', () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(checkAndArmRedirectGuard()).toBe(true);

    vi.restoreAllMocks();
  });

  it('COOLDOWN_MS is at least 5 seconds (loop-breaking minimum)', () => {
    // This test enforces a minimum lower bound (5 s) rather than the exact
    // implementation value (currently 10 s). The bound documents the
    // loop-breaking requirement; the exact value may increase in future
    // without this test needing to change.
    expect(AUTH_REDIRECT_COOLDOWN_MS).toBeGreaterThanOrEqual(5000);
  });
});
