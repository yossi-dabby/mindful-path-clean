import { base44 } from '@/api/base44Client';
import { SERIES06_CATALOG_PATH, SERIES05_CATALOG_PATH, SERIES04_CATALOG_PATH, SERIES03_CATALOG_PATH, SERIES02_CATALOG_PATH, SERIES01_CATALOG_PATH, P4B_CATALOG_PATH, P4A_CATALOG_PATH, EXPANDED_CATALOG_PATH, P3_CATALOG_PATH, isPilotCatalogPath, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

const RAILWAY_ORIGIN = 'https://mindful-path-production-7704.up.railway.app';

const checkAbort = (signal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
};

const requestError = (status, path) => new Error([401, 403].includes(status) ? 'PILOT_AUTH'
  : isPilotCatalogPath(path) && path !== 'catalog' && [400, 404].includes(status) ? 'PILOT_RELEASE_UNAVAILABLE' : 'PILOT_UNAVAILABLE');

export async function requestPilot(path, { signal, download = false } = {}) {
  checkAbort(signal);
  if (!isPilotCatalogPath(path) && !/^files\/(MP-[A-Z0-9-]{1,80}-HE)$/.test(path)) throw new Error('PILOT_INVALID');
  // This host already serves the private API. Keep it independent of Base44's
  // function runtime; Base44's static hosts still use the SDK transport below.
  if (window.location.origin === RAILWAY_ORIGIN) {
    let token;
    try { token = window.localStorage.getItem('base44_access_token'); }
    catch { throw new Error('PILOT_AUTH'); }
    if (!token) throw new Error('PILOT_AUTH');
    let response;
    try {
      response = await fetch(`/api/hebrew-forms-pilot/${path}${download ? '?download=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store', redirect: 'error',
      });
    } catch {
      checkAbort(signal);
      throw new Error('PILOT_UNAVAILABLE');
    }
    checkAbort(signal);
    if (!response.ok) throw requestError(response.status, path);
    return response;
  }
  let data;
  try {
    // The SDK carries the current session and preview/published function version.
    // Same-origin /api routes are not available on Base44's static frontend hosts.
    const response = await base44.functions.invoke('getHebrewFormsPilot', { path, download });
    data = response.data;
  } catch (error) {
    checkAbort(signal);
    throw requestError(error?.response?.status ?? error?.status, path);
  }
  checkAbort(signal);
  if (isPilotCatalogPath(path) && data?.kind === 'catalog') return Response.json(data.catalog);
  if (data?.kind !== 'pdf' || `files/${data.id}` !== path || typeof data.base64 !== 'string' || data.base64.length > 1400000) throw new Error('PILOT_INVALID');
  const bytes = Uint8Array.from(atob(data.base64), (character) => character.charCodeAt(0));
  return new Response(bytes, { headers: { 'Content-Type': 'application/pdf' } });
}

export async function requestPilotCatalog(options = {}) {
  // Preserve installed generations during staggered publication. Validate
  // before returning; a corrupt 200 response must never select an older release.
  for (const path of [SERIES06_CATALOG_PATH, SERIES05_CATALOG_PATH, SERIES04_CATALOG_PATH, SERIES03_CATALOG_PATH, SERIES02_CATALOG_PATH, SERIES01_CATALOG_PATH, P4B_CATALOG_PATH, P4A_CATALOG_PATH, P3_CATALOG_PATH, EXPANDED_CATALOG_PATH, 'catalog']) {
    let response;
    try { response = await requestPilot(path, options); }
    catch (error) {
      if (error.message !== 'PILOT_RELEASE_UNAVAILABLE') throw error;
      continue;
    }
    const catalog = await response.json();
    if (!await validatePilotCatalog(catalog, path)) throw new Error('PILOT_INVALID');
    checkAbort(options.signal);
    return { catalog, expansionPending: path !== SERIES06_CATALOG_PATH };
  }
  throw new Error('PILOT_UNAVAILABLE');
}

export async function requestPilotPdf(form, options = {}) {
  if (!/^MP-[A-Z0-9-]+-HE$/.test(form.id)) throw new Error('PILOT_INVALID');
  const response = await requestPilot(`files/${form.id}`, options);
  if (!response.headers.get('Content-Type')?.startsWith('application/pdf')) throw new Error('PILOT_INVALID');
  const bytes = await response.arrayBuffer();
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  const hash = await window.crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  if (header !== '%PDF-' || bytes.byteLength !== form.bytes || hex !== form.sha256) throw new Error('PILOT_INVALID');
  return new Blob([bytes], { type: 'application/pdf' });
}
