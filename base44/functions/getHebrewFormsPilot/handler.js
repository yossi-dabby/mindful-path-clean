import { requireAccountAccess } from './accountAccessGuard.js';
import { isPilotFileId, isPilotCatalogPath, validatePilotCatalog } from './releases.js';

// Only this app's existing private Railway service may receive the caller's token.
// No service-role credentials, public asset URLs or caller-selected upstreams.
const PILOT_URL = 'https://mindful-path-production-7704.up.railway.app/api/hebrew-forms-pilot';
const APP_ID = '69504b725a07f5aa75aeaf7d';
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff' };
const SAFE_CAUSE_CODES = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED',
  'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_URL',
]);

// Run only after Request construction has failed. These constructors perform
// no network I/O; fixed boolean labels are the only information returned.
function probeRequestOptions(url, options) {
  const { headers, signal, redirect, cache } = options;
  const variants = {
    baseline: {}, headers: { headers }, signal: { signal },
    redirect: { redirect }, cache: { cache },
    withoutHeaders: { signal, redirect, cache },
    withoutSignal: { headers, redirect, cache },
    withoutRedirect: { headers, signal, cache },
    withoutCache: { headers, signal, redirect },
  };
  return Object.fromEntries(Object.entries(variants).map(([name, init]) => {
    try { new Request(url, init); return [name, true]; }
    catch { return [name, false]; }
  }));
}

async function readBounded(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing response body');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error('Response too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function handleHebrewFormsPilot(req, { createClientFromRequest, fetchImpl = fetch, logFailure = (details) => console.warn('hebrew_forms_pilot_failure', details) }) {
  const json = (body, status = 200) => Response.json(body, { status, headers: PRIVATE_HEADERS });
  const fail = (status) => json({ error: status === 401 || status === 403 ? 'PILOT_AUTH' : 'PILOT_UNAVAILABLE' }, status);
  if (req.method !== 'POST') return fail(405);
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer [^\s]{1,8192}$/.test(authorization)) return fail(401);
  if (req.headers.get('Base44-App-Id') !== APP_ID) return fail(403);
  let stage = 'client';
  let requestContext;
  // Emit closed-set categories only. Raw errors, messages, headers, identities,
  // paths and response bodies must never reach logs or client responses.
  const report = (error, upstreamStatus) => {
    try {
      const errorType = ['AbortError', 'TimeoutError', 'TypeError', 'SyntaxError', 'ReferenceError'].includes(error?.name) ? error.name : 'other';
      const causeCode = [error?.cause?.code, error?.code].find((code) => SAFE_CAUSE_CODES.has(code)) || 'unknown';
      // Recognize these runtime compatibility errors without exposing their text.
      const message = typeof error?.message === 'string' ? error.message : '';
      const reason = /^The '?cache'? field on '?RequestInitializerDict'? is not implemented\b/.test(message) || /^Unsupported cache mode:/.test(message)
        ? 'cache_option_unsupported' : 'unknown';
      logFailure({
        diagnosticVersion: 3, stage, errorType, causeCode, reason,
        timeoutAvailable: typeof globalThis.AbortSignal?.timeout === 'function',
        ...(stage === 'request' && requestContext ? { requestChecks: probeRequestOptions(requestContext.url, requestContext.options) } : {}),
        ...(Number.isInteger(upstreamStatus) && upstreamStatus >= 100 && upstreamStatus <= 599 ? { upstreamStatus } : {}),
      });
    }
    catch { /* Diagnostics must not change request behavior. */ }
  };
  try {
    const client = createClientFromRequest(req);
    stage = 'auth';
    let user;
    try { user = await client.auth.me(); }
    catch (error) {
      const status = error?.status ?? error?.response?.status;
      if ([401, 403].includes(status)) return fail(401);
      report(error, status);
      return fail(503);
    }
    if (!user?.id) return fail(403);
    stage = 'account_access';
    try { await requireAccountAccess(client, user, { forms: true }); }
    catch (error) { return fail(error.status || 503); }
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some((key) => !['path', 'download'].includes(key)) ||
        (input.download !== undefined && typeof input.download !== 'boolean')) return fail(400);
    const isCatalog = isPilotCatalogPath(input.path);
    const fileId = typeof input.path === 'string' && input.path.startsWith('files/') ? input.path.slice(6) : '';
    const fileMatch = isPilotFileId(fileId) ? [input.path, fileId] : null;
    if (!isCatalog && !fileMatch) return fail(400);
    stage = 'timeout';
    const signal = AbortSignal.timeout(15000);
    stage = 'request';
    const upstreamUrl = `${PILOT_URL}/${input.path}${input.download ? '?download=1' : ''}`;
    const options = {
      headers: { Authorization: authorization },
      // Workers supports manual/follow, not error. Manual never follows a
      // Location; every 3xx is rejected by the non-OK response guard below.
      signal, redirect: 'manual', cache: 'no-store',
    };
    requestContext = { url: upstreamUrl, options };
    // Local construction only: distinguish Request option validation from fetch.
    // Keep the actual URL/options call unchanged; do not retry or relax options.
    new Request(upstreamUrl, options);
    stage = 'fetch';
    const response = await fetchImpl(upstreamUrl, options);
    stage = 'upstream_response';
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) return fail(response.status);
      report(null, response.status);
      return fail(503);
    }
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.startsWith(isCatalog ? 'application/json' : 'application/pdf')) return fail(502);
    stage = 'read';
    const bytes = await readBounded(response, isCatalog ? 512 * 1024 : 1024 * 1024);
    if (isCatalog) {
      stage = 'catalog';
      const catalog = JSON.parse(new TextDecoder().decode(bytes));
      if (!await validatePilotCatalog(catalog, input.path)) return fail(502);
      return json({ kind: 'catalog', catalog });
    }
    stage = 'pdf';
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return fail(502);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return json({ kind: 'pdf', id: fileMatch[1], base64: btoa(binary) });
  } catch (error) {
    report(error);
    return fail(503);
  }
}
