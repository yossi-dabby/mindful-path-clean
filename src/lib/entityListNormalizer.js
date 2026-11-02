/**
 * entityListNormalizer.js
 *
 * Shared utility for normalizing Base44 entity list/filter API responses.
 *
 * Root cause: when VITE_BASE44_APP_ID is missing at build time, requests are
 * sent to /api/apps/null/... which can return paginated envelopes
 * { count: N, results: [...] } instead of bare arrays.  Pages that call
 * .filter() on the response then crash at runtime.
 *
 * Usage: imported by base44Client.js to patch entity list/filter methods.
 */

/**
 * Converts a Base44 entity list/filter response to a bare array.
 *
 * @param {*} data - Raw response from entity.list() or entity.filter()
 * @param {{ entityName?: string, method?: string, diagnosticKey?: string }} [context]
 * @returns {Array} Always returns an array — never null/undefined/object.
 */
export function classifyEntityListResponseShape(data) {
  try {
    if (Array.isArray(data)) return 'array';
    if (data === null || data === undefined) return 'empty';
    if (typeof data !== 'object') return 'unsupported';

    if (Array.isArray(data.results)) return 'results_envelope';
    if (Array.isArray(data.data)) return 'data_array_envelope';
    if (
      data.data !== null &&
      typeof data.data === 'object' &&
      Array.isArray(data.data.results)
    ) {
      return 'data_results_envelope';
    }
    return 'unsupported';
  } catch {
    return 'error';
  }
}

function _isS2DebugEnabled() {
  try {
    if (typeof window === 'undefined') return false;
    const search = window.location?.search ?? '';
    if (!search) return false;
    return new URLSearchParams(search).get('_s2debug') === 'true';
  } catch {
    return false;
  }
}

function _emitShapeDiagnostic(shape, context) {
  try {
    if (!_isS2DebugEnabled()) return;
    if (!context || typeof context !== 'object') return;
    if (typeof context.diagnosticKey !== 'string' || !context.diagnosticKey) return;
    console.log(`${context.diagnosticKey}      :`, shape);
  } catch {
    // Diagnostic emission must never propagate.
  }
}

export function normalizeEntityList(data, context) {
  const shape = classifyEntityListResponseShape(data);
  _emitShapeDiagnostic(shape, context);

  // Happy path: already a bare array.
  if (shape === 'array') return data;

  // Envelope: { results: [...] }
  if (shape === 'results_envelope') return data.results;

  // Envelope: { data: [...] }
  if (shape === 'data_array_envelope') return data.data;

  // Envelope: { data: { results: [...] } }
  if (shape === 'data_results_envelope') return data.data.results;

  // Unexpected shape — warn in development so the root cause is obvious.
  if (import.meta.env?.DEV && shape === 'unsupported') {
    console.warn(
      '[entityListNormalizer] Unexpected entity list response shape; returning []:',
      typeof data,
      data
    );
  }

  return [];
}
