/**
 * Pure utility functions for mobile audio transcription diagnostics.
 * These helpers collect file metadata, extract backend error reasons, and compose
 * user-facing failure descriptions for mobile voice-to-text flows.
 *
 * No browser APIs are called at import time — all DOM access is deferred to call time.
 * Safe to import in test environments when DOM APIs are mocked or stubbed.
 */

/**
 * Collects diagnostic metadata about an audio draft file for transcription failure reporting.
 * Returns a plain object with no PII — only file metadata and browser canPlayType result.
 * Async to allow future playability checks without blocking callers.
 *
 * @param {File|Blob|null} file
 * @returns {Promise<{name: string, type: string, size: number|null, isZeroBytes: boolean, canPlayType: string|null, ua: string}>}
 */
export async function buildMobileAudioDiagnosticInfo(file) {
  const info = {
    name: typeof file?.name === 'string' ? file.name : '(unknown)',
    type: typeof file?.type === 'string' && file.type ? file.type : '(unknown)',
    size: typeof file?.size === 'number' ? file.size : null,
    isZeroBytes: typeof file?.size === 'number' && file.size === 0,
    canPlayType: null,
    ua: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 200) : '(unknown)',
  };

  try {
    const audioEl = document.createElement('audio');
    if (typeof audioEl.canPlayType === 'function' && info.type !== '(unknown)') {
      const baseMime = info.type.split(';')[0].trim();
      info.canPlayType = audioEl.canPlayType(baseMime) || 'no';
    }
  } catch {
    info.canPlayType = 'error';
  }

  return info;
}

/**
 * Extracts a human-readable reason string from a backend transcription error response.
 * Checks common error shape properties in priority order.
 * Returns null when no actionable reason is detectable.
 *
 * @param {Error|object|null} error
 * @returns {string|null}
 */
export function extractBackendTranscriptionErrorReason(error) {
  if (!error) return null;
  const candidates = [
    error?.data?.error,
    error?.data?.message,
    error?.data?.reason,
    error?.data?.detail,
    error?.message,
  ].filter((v) => typeof v === 'string' && v.trim());

  if (candidates.length === 0) return null;
  const reason = candidates[0].trim();
  return reason.length > 120 ? `${reason.slice(0, 120)}\u2026` : reason;
}

/**
 * Builds a user-facing description for transcription failure toasts on mobile.
 * Includes file metadata, conversion errors, backend error reason, and a suggested action.
 * Only called on mobile; desktop failures use the existing terse messages.
 *
 * @param {{ diagInfo: object|null, backendReason: string|null, conversionError: Error|string|null }} params
 * @returns {string}
 */
export function buildTranscriptionFailureDescription({ diagInfo, backendReason, conversionError }) {
  const parts = [];

  if (diagInfo?.isZeroBytes) {
    parts.push('No audio was captured (0-byte file).');
  } else if (diagInfo?.size != null) {
    const kb = (diagInfo.size / 1024).toFixed(1);
    parts.push(`File: ${diagInfo.type}, ${kb}\u202fKB.`);
  }

  if (diagInfo?.canPlayType === 'no' || diagInfo?.canPlayType === '') {
    parts.push('This format may not be playable on your device.');
  }

  if (conversionError) {
    const msg = typeof conversionError === 'string'
      ? conversionError
      : (conversionError?.message || 'conversion error');
    parts.push(`Conversion error: ${msg.slice(0, 80)}.`);
  }

  if (backendReason) {
    parts.push(`Server: \u201c${backendReason}\u201d.`);
  }

  if (diagInfo?.isZeroBytes) {
    parts.push('Check microphone permissions and speak clearly before stopping.');
  } else {
    parts.push('Try again, or switch to a different browser/app if the issue persists.');
  }

  return parts.join(' ');
}
