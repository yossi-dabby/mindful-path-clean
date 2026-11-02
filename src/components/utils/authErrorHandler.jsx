/**
 * Minimal Auth Error Detection and Handling
 * 
 * SAFETY: Additive utility, detects auth errors using ONLY proven error properties.
 * Based on code evidence: errors have .message, .name, .stack properties.
 * 
 * NO ASSUMPTIONS about error.status or error.code (not found in current codebase).
 */

// Last time auth error was shown (for rate limiting)
let lastAuthErrorTimestamp = 0;
const AUTH_ERROR_COOLDOWN_MS = 60000; // 60 seconds

/**
 * Detect if an error is auth-related
 * Uses ONLY proven properties: error.message, error.name
 * 
 * @param {Error} error - The error object
 * @returns {boolean} - True if likely an auth error
 */
export function isAuthError(error) {
  if (!error) return false;

  // Check error.message for auth-related keywords (proven to exist in code)
  const message = error.message || '';
  const name = error.name || '';
  
  const authKeywords = [
    'unauthorized',
    '401',
    'authentication',
    'session expired',
    'not authenticated',
    'auth',
    'token'
  ];

  const messageLower = message.toLowerCase();
  const nameLower = name.toLowerCase();
  
  return authKeywords.some(keyword => 
    messageLower.includes(keyword) || nameLower.includes(keyword)
  );
}

/**
 * Check if we should show auth error UI (rate limiting)
 */
export function shouldShowAuthError() {
  const now = Date.now();
  if (now - lastAuthErrorTimestamp < AUTH_ERROR_COOLDOWN_MS) {
    return false; // Too soon, don't spam
  }
  lastAuthErrorTimestamp = now;
  return true;
}

/**
 * Reset auth error cooldown (for testing or manual reset)
 */
export function resetAuthErrorCooldown() {
  lastAuthErrorTimestamp = 0;
}

/**
 * Get user-friendly auth error message
 */
export function getAuthErrorMessage(error) {
  if (isAuthError(error)) {
    return 'Your session has expired. Please sign in again to continue.';
  }
  return error?.message || 'An error occurred. Please try again.';
}