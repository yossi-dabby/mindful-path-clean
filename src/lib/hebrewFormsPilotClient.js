import { base44 } from '@/api/base44Client';

const checkAbort = (signal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
};

export async function requestPilot(path, { signal, download = false } = {}) {
  checkAbort(signal);
  let data;
  try {
    // The SDK carries the current session and preview/published function version.
    // Same-origin /api routes are not available on Base44's static frontend hosts.
    const response = await base44.functions.invoke('getHebrewFormsPilot', { path, download });
    data = response.data;
  } catch (error) {
    checkAbort(signal);
    throw new Error([401, 403].includes(error?.response?.status ?? error?.status) ? 'PILOT_AUTH' : 'PILOT_UNAVAILABLE');
  }
  checkAbort(signal);
  if (path === 'catalog' && data?.kind === 'catalog') return Response.json(data.catalog);
  if (data?.kind !== 'pdf' || `files/${data.id}` !== path || typeof data.base64 !== 'string' || data.base64.length > 1400000) throw new Error('PILOT_INVALID');
  const bytes = Uint8Array.from(atob(data.base64), (character) => character.charCodeAt(0));
  return new Response(bytes, { headers: { 'Content-Type': 'application/pdf' } });
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
