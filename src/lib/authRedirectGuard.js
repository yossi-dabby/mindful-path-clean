/**
 * Auth redirect loop guard.
 *
 * Prevents the "auth-fail → redirect-to-login → auth-fail" infinite loop that
 * occurs on Railway production when the app domain is not yet registered in
 * Base44's allowed redirect domains. Without this guard, every failed callback
 * causes the app to reload and immediately redirect to login again.
 *
 * Uses sessionStorage to persist the last-redirect timestamp across page loads
 * within a single tab session (sessionStorage is cleared when the tab closes).
 */

export const AUTH_REDIRECT_GUARD_KEY = 'base44_auth_redirect_ts';
export const AUTH_REDIRECT_COOLDOWN_MS = 10000; // 10 seconds

/**
 * Returns true if a redirect to login is allowed (cooldown expired or first
 * redirect). Returns false if we redirected too recently (loop detected).
 *
 * Side-effect: records the current timestamp in sessionStorage when returning
 * true, so subsequent calls within COOLDOWN_MS will return false.
 *
 * @returns {boolean} whether the caller should proceed with the redirect
 */
export function checkAndArmRedirectGuard() {
  try {
    const lastTs = sessionStorage.getItem(AUTH_REDIRECT_GUARD_KEY);
    if (lastTs && Date.now() - parseInt(lastTs, 10) < AUTH_REDIRECT_COOLDOWN_MS) {
      return false; // cooldown active — suppress the redirect
    }
    sessionStorage.setItem(AUTH_REDIRECT_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (e.g. private browsing with strict settings)
    // — allow the redirect so auth still works.
  }
  return true;
}
