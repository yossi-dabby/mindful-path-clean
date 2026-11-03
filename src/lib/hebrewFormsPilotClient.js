const PREFIX = '/api/hebrew-forms-pilot';

export async function requestPilot(path, { signal, download = false } = {}) {
  const token = window.localStorage.getItem('base44_access_token');
  if (!token) throw new Error('PILOT_AUTH');
  const response = await fetch(`${PREFIX}/${path}${download ? '?download=1' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'PILOT_AUTH' : 'PILOT_UNAVAILABLE');
  return response;
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
