/**
 * openFile — safe, browser-native file open helper.
 *
 * Opens a PDF viewer URL in a new browser tab/window.
 * Does NOT use the `download` attribute.
 *
 * Popup-blocker safe: if window.open is blocked (Android Chrome, installed PWA,
 * or popup blockers), falls back to same-tab navigation via window.location.href.
 *
 * Security:
 *  - Only accepts non-empty string URLs; returns early for falsy/non-string values.
 *  - Clears window.opener immediately after a successful open to prevent reverse-tabnabbing.
 *
 * Note: 'noopener'/'noreferrer' are intentionally omitted from window.open features.
 * Per the WHATWG HTML spec, window.open() returns null when those tokens are present,
 * even when the popup opens successfully. Using the return value to detect a blocked
 * popup requires omitting them from the features string.
 *
 * @param {string} url - The URL to open for viewing.
 */
export function openFile(url) {
  if (!url || typeof url !== 'string') return;
  const safeUrl = url.trim();
  if (!safeUrl) return;

  // Try to open in a new tab; fall back to same-tab if the popup is blocked
  // (Android Chrome, installed PWA, and strict popup blockers all block window.open
  // that is triggered outside a direct trusted user gesture or after an async gap).
  // Note: do NOT pass 'noopener'/'noreferrer' as window features — those tokens cause
  // window.open() to return null per spec, making it impossible to distinguish a
  // successfully-opened popup from a blocked one.
  const openedWindow = window.open(safeUrl, '_blank');
  if (!openedWindow) {
    window.location.href = safeUrl;
    return;
  }

  // Keep popup-blocker detection while severing access back to the app.
  try {
    openedWindow.opener = null;
  } catch {
    // Some browsers expose a non-writable opener; navigation still succeeded.
  }
}
