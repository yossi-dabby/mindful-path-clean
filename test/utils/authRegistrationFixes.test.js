/**
 * test/utils/authRegistrationFixes.test.js
 *
 * Regression tests for the three production fixes applied to resolve:
 *   1. Email registration loop (updateMe via raw fetch returned 405 → wizard re-appeared)
 *   2. Google/OAuth blank screen (checkAuth fired before session cookie was committed → loop)
 *   3. WelcomeWizard onboarding loop on slow server (onComplete not called until server response)
 *
 * Fix 1 (base44Client.js): updateMe now uses base44.entities.User.update(me.id, data)
 *   instead of raw fetch, so the SDK's own auth session is used.
 *
 * Fix 2 (AuthContext.jsx): checkAuth retries once after 800ms on 401/403 before
 *   treating the session as unauthenticated.
 *
 * Fix 3 (WelcomeWizard.jsx): onComplete() is called in onMutate (optimistically),
 *   and sessionStorage is written immediately so the wizard never reappears even if
 *   the server is slow.
 *
 * Tests here exercise the pure decision logic mirrored from each fix so they can
 * run in the Node test environment (no browser or React needed).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Fix 4 – custom auth has exactly one login layer', () => {
  const authContextSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/AuthContext.jsx'),
    'utf8',
  );
  const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.jsx'), 'utf8');

  it('never invokes the legacy hosted login from AuthContext', () => {
    expect(authContextSource).not.toContain('redirectToLogin(');
    expect(authContextSource).not.toContain('authRedirectGuard');
  });

  it('leaves unauthenticated routing to the single in-app /login page', () => {
    expect(appSource).toContain('<Navigate to="/login" replace />');
    expect(authContextSource).toContain('if (status === 401 || status === 403)');
    expect(authContextSource).toContain('setIsAuthenticated(false)');
  });
});

// ─── Fix 1: updateMe via SDK entity update ────────────────────────────────────
// Pure logic: the override calls base44.auth.me() then base44.entities.User.update()
// instead of raw fetch. We verify the call sequence and that the correct data flows.

describe('Fix 1 – updateMe SDK override', () => {
  it('calls auth.me() then entities.User.update() with the correct user id and data', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUpdated = { ...mockUser, onboarding_completed: true };

    const mockBase44 = {
      auth: {
        me: vi.fn().mockResolvedValue(mockUser),
      },
      entities: {
        User: {
          update: vi.fn().mockResolvedValue(mockUpdated),
        },
      },
    };

    // Reproduce the override exactly as written in base44Client.js
    const updateMe = async (data) => {
      const me = await mockBase44.auth.me();
      return mockBase44.entities.User.update(me.id, data);
    };

    const data = { onboarding_completed: true, focus_areas: ['stress'] };
    const result = await updateMe(data);

    expect(mockBase44.auth.me).toHaveBeenCalledOnce();
    expect(mockBase44.entities.User.update).toHaveBeenCalledWith('user-123', data);
    expect(result).toEqual(mockUpdated);
  });

  it('propagates errors from auth.me() without masking them', async () => {
    const authError = new Error('SDK auth failure');
    const mockBase44 = {
      auth: { me: vi.fn().mockRejectedValue(authError) },
      entities: { User: { update: vi.fn() } },
    };

    const updateMe = async (data) => {
      const me = await mockBase44.auth.me();
      return mockBase44.entities.User.update(me.id, data);
    };

    await expect(updateMe({ onboarding_completed: true })).rejects.toThrow('SDK auth failure');
    expect(mockBase44.entities.User.update).not.toHaveBeenCalled();
  });
});

// ─── Fix 2: checkAuth OAuth retry ────────────────────────────────────────────
// Pure logic: on a 401 or 403 with retryCount < 1, retry once after 800ms.
// Any other status code does NOT trigger a retry.

describe('Fix 2 – checkAuth OAuth retry logic', () => {
  /**
   * Mirror of the retry guard in AuthContext.jsx:
   *   if ((status === 401 || status === 403) && retryCount < 1) { ... retry ... }
   */
  function shouldRetry(status, retryCount) {
    return (status === 401 || status === 403) && retryCount < 1;
  }

  describe('should retry', () => {
    it('retries on 401 when retryCount is 0', () => {
      expect(shouldRetry(401, 0)).toBe(true);
    });

    it('retries on 403 when retryCount is 0', () => {
      expect(shouldRetry(403, 0)).toBe(true);
    });
  });

  describe('should NOT retry', () => {
    it('does not retry on 401 when retryCount is already 1', () => {
      expect(shouldRetry(401, 1)).toBe(false);
    });

    it('does not retry on 403 when retryCount is already 1', () => {
      expect(shouldRetry(403, 1)).toBe(false);
    });

    it('does not retry on 404 (unrelated server error)', () => {
      expect(shouldRetry(404, 0)).toBe(false);
    });

    it('does not retry on 500', () => {
      expect(shouldRetry(500, 0)).toBe(false);
    });

    it('does not retry when status is undefined', () => {
      expect(shouldRetry(undefined, 0)).toBe(false);
    });
  });

  it('retries exactly once and then stops', async () => {
    vi.useFakeTimers();

    const authMeResults = [
      { shouldFail: true, status: 401 },
      { shouldFail: false, user: { id: 'u1' } },
    ];
    let callCount = 0;

    const authMe = vi.fn().mockImplementation(() => {
      const result = authMeResults[callCount++];
      if (result.shouldFail) {
        const err = new Error('Unauthorized');
        err.status = result.status;
        return Promise.reject(err);
      }
      return Promise.resolve(result.user);
    });

    // Reproduce the retry flow from checkAuth
    async function checkAuth(retryCount = 0) {
      try {
        const currentUser = await authMe();
        return { authenticated: true, user: currentUser };
      } catch (error) {
        const status = error?.status || error?.response?.status;
        if ((status === 401 || status === 403) && retryCount < 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
          return checkAuth(retryCount + 1);
        }
        return { authenticated: false, status };
      }
    }

    const resultPromise = checkAuth();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(authMe).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ authenticated: true, user: { id: 'u1' } });

    vi.useRealTimers();
  });

  it('does not retry on a second consecutive 401 (stops after one retry)', async () => {
    vi.useFakeTimers();

    const authMe = vi.fn().mockImplementation(() => {
      const err = new Error('Unauthorized');
      err.status = 401;
      return Promise.reject(err);
    });

    async function checkAuth(retryCount = 0) {
      try {
        const currentUser = await authMe();
        return { authenticated: true, user: currentUser };
      } catch (error) {
        const status = error?.status || error?.response?.status;
        if ((status === 401 || status === 403) && retryCount < 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
          return checkAuth(retryCount + 1);
        }
        return { authenticated: false, status };
      }
    }

    const resultPromise = checkAuth();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(authMe).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ authenticated: false, status: 401 });

    vi.useRealTimers();
  });
});

// ─── Fix 3: WelcomeWizard optimistic onComplete ───────────────────────────────
// Pure logic: onMutate writes to sessionStorage immediately and calls onComplete()
// before the server responds, so the user is not stuck in the wizard.

describe('Fix 3 – WelcomeWizard optimistic onboarding completion', () => {
  let mockSessionStorage;

  beforeEach(() => {
    // Set up a minimal sessionStorage mock for the Node environment
    const store = {};
    mockSessionStorage = {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Mirror of the onMutate callback in WelcomeWizard.jsx:
   *
   *   onMutate: () => {
   *     try {
   *       const prev = JSON.parse(sessionStorage.getItem('user_prefs_loaded') || '{}');
   *       sessionStorage.setItem('user_prefs_loaded', JSON.stringify({ ...prev, onboarding_completed: true }));
   *     } catch (_) {}
   *     onComplete();
   *   }
   */
  function createOnMutate(sessionStorage, onComplete) {
    return () => {
      try {
        const prev = JSON.parse(sessionStorage.getItem('user_prefs_loaded') || '{}');
        sessionStorage.setItem(
          'user_prefs_loaded',
          JSON.stringify({ ...prev, onboarding_completed: true }),
        );
      } catch (_) {
        // Intentionally silent: sessionStorage is a best-effort optimistic cache.
        // If writing fails (e.g., private/incognito mode, storage quota), onComplete()
        // still fires so the user is never stuck in the wizard.
      }
      onComplete();
    };
  }

  it('calls onComplete() immediately in onMutate before the server responds', () => {
    const onComplete = vi.fn();
    const onMutate = createOnMutate(mockSessionStorage, onComplete);

    onMutate();

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('writes onboarding_completed:true to sessionStorage in onMutate', () => {
    const onComplete = vi.fn();
    const onMutate = createOnMutate(mockSessionStorage, onComplete);

    onMutate();

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'user_prefs_loaded',
      expect.stringContaining('"onboarding_completed":true'),
    );
  });

  it('preserves existing sessionStorage keys when writing onboarding_completed', () => {
    const onComplete = vi.fn();
    mockSessionStorage.getItem.mockReturnValue(JSON.stringify({ some_other_key: 'value' }));

    const onMutate = createOnMutate(mockSessionStorage, onComplete);
    onMutate();

    const written = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
    expect(written.onboarding_completed).toBe(true);
    expect(written.some_other_key).toBe('value');
  });

  it('still calls onComplete even if sessionStorage.getItem throws', () => {
    const onComplete = vi.fn();
    mockSessionStorage.getItem.mockImplementation(() => { throw new Error('storage error'); });

    const onMutate = createOnMutate(mockSessionStorage, onComplete);

    // Should NOT throw even though sessionStorage throws
    expect(() => onMutate()).not.toThrow();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('still calls onComplete even if sessionStorage contains invalid JSON', () => {
    const onComplete = vi.fn();
    mockSessionStorage.getItem.mockReturnValue('NOT_VALID_JSON');

    const onMutate = createOnMutate(mockSessionStorage, onComplete);

    expect(() => onMutate()).not.toThrow();
    expect(onComplete).toHaveBeenCalledOnce();
  });
});


describe('Fix 5 – email login completes the custom-auth navigation', () => {
  const loginSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/Login.jsx'),
    'utf8',
  );

  it('requires the SDK access token before completing sign-in', () => {
    expect(loginSource).toContain(
      'const loginResult = await base44.auth.loginViaEmailPassword(email.trim(), password)',
    );
    expect(loginSource).toContain('if (!loginResult?.access_token)');
  });

  it('navigates through the bounded same-origin return target after sign-in', () => {
    expect(loginSource).toContain('window.location.replace(safeReturnTo())');
    expect(loginSource).not.toContain('Do not add a manual redirect');
  });
});
