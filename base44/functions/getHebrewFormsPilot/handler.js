// Only this app's existing private Railway service may receive the caller's token.
// No service-role credentials, public asset URLs or caller-selected upstreams.
const PILOT_URL = 'https://mindful-path-production-7704.up.railway.app/api/hebrew-forms-pilot';
const APP_ID = '69504b725a07f5aa75aeaf7d';
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff' };

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

export async function handleHebrewFormsPilot(req, { createClientFromRequest, fetchImpl = fetch }) {
  const json = (body, status = 200) => Response.json(body, { status, headers: PRIVATE_HEADERS });
  const fail = (status) => json({ error: status === 401 || status === 403 ? 'PILOT_AUTH' : 'PILOT_UNAVAILABLE' }, status);
  if (req.method !== 'POST') return fail(405);
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer [^\s]{1,8192}$/.test(authorization)) return fail(401);
  if (req.headers.get('Base44-App-Id') !== APP_ID) return fail(403);
  try {
    const client = createClientFromRequest(req);
    let user;
    try { user = await client.auth.me(); }
    catch (error) {
      return fail([401, 403].includes(error?.status ?? error?.response?.status) ? 401 : 503);
    }
    if (!user?.id || user.role !== 'admin') return fail(403);
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some((key) => !['path', 'download'].includes(key)) ||
        (input.download !== undefined && typeof input.download !== 'boolean')) return fail(400);
    const isCatalog = input.path === 'catalog';
    const fileMatch = typeof input.path === 'string' && /^files\/(MP-[A-Z0-9-]{1,80}-HE)$/.exec(input.path);
    if (!isCatalog && !fileMatch) return fail(400);
    const response = await fetchImpl(`${PILOT_URL}/${input.path}${input.download ? '?download=1' : ''}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) return fail([401, 403, 404].includes(response.status) ? response.status : 503);
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.startsWith(isCatalog ? 'application/json' : 'application/pdf')) return fail(502);
    const bytes = await readBounded(response, isCatalog ? 512 * 1024 : 1024 * 1024);
    if (isCatalog) {
      const catalog = JSON.parse(new TextDecoder().decode(bytes));
      if (catalog.language !== 'he' || !Array.isArray(catalog.forms) || catalog.forms.length !== 154) return fail(502);
      return json({ kind: 'catalog', catalog });
    }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return fail(502);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return json({ kind: 'pdf', id: fileMatch[1], base64: btoa(binary) });
  } catch {
    return fail(503);
  }
}
