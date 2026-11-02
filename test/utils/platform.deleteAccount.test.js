/**
 * platform.deleteAccount — unit tests
 *
 * Verifies that deleteAccount():
 *   1. Calls the deleteMyAccount backend function exactly once.
 *   2. Clears the React Query cache on success.
 *   3. Clears sessionStorage on success.
 *   4. Performs logout (auth token cleanup + redirect) on success.
 *   5. Does NOT log the user out on failure.
 *   6. Re-throws the backend error so the caller can handle it.
 *
 * The module imports Capacitor and the Base44 client which rely on browser
 * globals and environment variables, so all external dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Environment stubs required before module import ────────────────────────
vi.stubGlobal('import', { meta: { env: { DEV: false } } });

// Minimal localStorage stub
const localStorageData = {};
vi.stubGlobal('localStorage', {
  getItem:    (k)      => localStorageData[k] ?? null,
  setItem:    (k, v)   => { localStorageData[k] = String(v); },
  removeItem: (k)      => { delete localStorageData[k]; },
  clear:      ()       => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); },
});

// Minimal sessionStorage stub
const sessionStorageClearSpy = vi.fn();
const sessionStorageData = {};
vi.stubGlobal('sessionStorage', {
  getItem:    (k)      => sessionStorageData[k] ?? null,
  setItem:    (k, v)   => { sessionStorageData[k] = String(v); },
  removeItem: (k)      => { delete sessionStorageData[k]; },
  clear:      sessionStorageClearSpy,
});

// window.location.href stub
let locationHref = 'http://localhost/';
vi.stubGlobal('window', {
  location: {
    get href() { return locationHref; },
    set href(v) { locationHref = v; },
  },
  navigator: {},
});

// ── Module mocks ───────────────────────────────────────────────────────────
// NOTE: vi.mock factories are hoisted to the top of the file by Vitest.
// Do NOT reference variables declared below the vi.mock call inside a factory.
// Use vi.fn() directly inside the factory; retrieve the mock references
// after the import via the mocked module object.

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: { logout: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@/lib/query-client', () => ({
  queryClientInstance: { clear: vi.fn() },
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { deleteAccount } from '../../src/lib/platform.js';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('platform.deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationHref = 'http://localhost/';
    sessionStorageClearSpy.mockClear();
    Object.keys(sessionStorageData).forEach(k => delete sessionStorageData[k]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls base44.functions.invoke("deleteMyAccount") exactly once on success', async () => {
    base44.functions.invoke.mockResolvedValueOnce({ data: { success: true } });
    await deleteAccount();
    expect(base44.functions.invoke).toHaveBeenCalledTimes(1);
    expect(base44.functions.invoke).toHaveBeenCalledWith('deleteMyAccount', {});
  });

  it('clears the React Query cache on success', async () => {
    base44.functions.invoke.mockResolvedValueOnce({ data: { success: true } });
    await deleteAccount();
    expect(queryClientInstance.clear).toHaveBeenCalledTimes(1);
  });

  it('clears sessionStorage on success', async () => {
    base44.functions.invoke.mockResolvedValueOnce({ data: { success: true } });
    await deleteAccount();
    expect(sessionStorageClearSpy).toHaveBeenCalled();
  });

  it('calls base44.auth.logout (web logout path) on success', async () => {
    base44.functions.invoke.mockResolvedValueOnce({ data: { success: true } });
    await deleteAccount();
    expect(base44.auth.logout).toHaveBeenCalledTimes(1);
  });

  it('throws when backend returns an error', async () => {
    const backendError = new Error('Account not found');
    base44.functions.invoke.mockRejectedValueOnce(backendError);
    await expect(deleteAccount()).rejects.toThrow('Account not found');
  });

  it('does NOT clear the query cache when the backend call fails', async () => {
    base44.functions.invoke.mockRejectedValueOnce(new Error('Network error'));
    await expect(deleteAccount()).rejects.toThrow();
    expect(queryClientInstance.clear).not.toHaveBeenCalled();
  });

  it('does NOT call logout when the backend call fails', async () => {
    base44.functions.invoke.mockRejectedValueOnce(new Error('Network error'));
    await expect(deleteAccount()).rejects.toThrow();
    expect(base44.auth.logout).not.toHaveBeenCalled();
  });

  it('does NOT clear sessionStorage when the backend call fails', async () => {
    base44.functions.invoke.mockRejectedValueOnce(new Error('Network error'));
    await expect(deleteAccount()).rejects.toThrow();
    expect(sessionStorageClearSpy).not.toHaveBeenCalled();
  });
});

