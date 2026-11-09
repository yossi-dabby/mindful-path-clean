// Personal files are private objects. Only this authenticated function can map
// an opaque reference to a short-lived URL after checking its recorded owner.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 300;
const MAX_REQUEST_BYTES = Math.ceil(MAX_FILE_BYTES * 4 / 3) + 65536;
const REFERENCE = /^mp-private:([a-f0-9]{24})$/i;
const TYPES = new Set([
  'application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg',
  'image/jpg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/mp4',
  'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'video/webm',
]);
const HEADERS = {
  'Cache-Control': 'private, no-store', Vary: 'Authorization',
  'X-Content-Type-Options': 'nosniff',
};
function fail(status, message) {
  return Object.assign(new Error(message), { status, safe: true });
}
function json(body, status = 200) { return Response.json(body, { status, headers: HEADERS }); }

async function readBody(req) {
  if (Number(req.headers.get('content-length')) > MAX_REQUEST_BYTES) throw fail(413, 'File is too large');
  const reader = req.body?.getReader();
  if (!reader) throw fail(400, 'No file provided');
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw fail(413, 'File is too large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Blob(chunks);
  const contentType = req.headers.get('content-type') || '';
  if (contentType.startsWith('multipart/form-data')) {
    try {
      const form = await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
      return { file: form.get('file') };
    } catch { throw fail(400, 'Invalid upload'); }
  }
  let data;
  try { data = JSON.parse(await body.text()); } catch { throw fail(400, 'Invalid request'); }
  if (!data || typeof data !== 'object') throw fail(400, 'Invalid request');
  if (data.action === 'resolve') return data;
  if (typeof data.file_base64 !== 'string' || typeof data.file_name !== 'string' || typeof data.file_type !== 'string') {
    throw fail(400, 'No file provided');
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(data.file_base64), (c) => c.charCodeAt(0)); }
  catch { throw fail(400, 'Invalid upload'); }
  return { file: new File([bytes], data.file_name, { type: data.file_type }) };
}

async function signedResult(client, record) {
  if (!record?.id || !/^private\//.test(record.file_uri || '')) throw fail(503, 'Private file is unavailable');
  const signed = await client.integrations.Core.CreateFileSignedUrl({
    file_uri: record.file_uri, expires_in: SIGNED_URL_SECONDS,
  });
  const url = signed?.signed_url;
  if (typeof url !== 'string' || !url.startsWith('https://')) throw fail(503, 'Private file is unavailable');
  return {
    file_ref: `mp-private:${record.id}`, file_url: url, name: record.name,
    mime_type: record.mime_type, size_bytes: record.size_bytes, expires_in: SIGNED_URL_SECONDS,
  };
}

export async function handlePrivateAttachment(req, { createClientFromRequest }) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const client = createClientFromRequest(req);
    let user;
    try { user = await client.auth.me(); }
    catch (error) {
      if ([401, 403].includes(error?.status || error?.response?.status)) throw fail(401, 'Unauthorized');
      throw error;
    }
    if (!user?.id || !user?.email) throw fail(401, 'Unauthorized');
    const data = await readBody(req);
    const records = client.asServiceRole.entities.PrivateAttachment;

    if (data.action === 'resolve') {
      const id = typeof data.file_ref === 'string' ? REFERENCE.exec(data.file_ref)?.[1] : null;
      if (!id) throw fail(400, 'An owned file reference is required');
      const matches = await records.filter({ id, owner_user_id: user.id, status: 'active' }, '-created_date', 1);
      const record = matches?.[0];
      // Check again even if a provider ignores a filter. Admins cannot bypass ownership.
      if (!record || record.id !== id || record.owner_user_id !== user.id || record.status !== 'active') {
        throw fail(404, 'File not found');
      }
      return json(await signedResult(client, record));
    }

    const file = data.file;
    if (!(file instanceof Blob) || !file.size) throw fail(400, 'No file provided');
    if (file.size > MAX_FILE_BYTES) throw fail(413, 'File is too large');
    const mimeType = file.type.split(';')[0].trim().toLowerCase();
    if (!TYPES.has(mimeType)) throw fail(415, 'Unsupported file type');
    const name = (file.name || 'attachment').replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 160);
    const record = await records.create({
      owner_user_id: user.id, owner_email: user.email, name, mime_type: mimeType,
      size_bytes: file.size, status: 'uploading',
    });
    if (!REFERENCE.test(`mp-private:${record?.id}`)) throw fail(503, 'Private file is unavailable');
    const uploaded = await client.integrations.Core.UploadPrivateFile({ file });
    const uri = uploaded?.file_uri;
    if (typeof uri !== 'string' || !uri.startsWith('private/')) throw fail(503, 'Private upload failed');
    const update = { file_uri: uri, status: 'active' };
    try { await records.update(record.id, update); }
    catch { await records.update(record.id, update); }
    return json(await signedResult(client, { ...record, ...update }));
  } catch (error) {
    // Provider errors may contain storage links or user data. Never return them.
    return json({ error: error?.safe ? error.message : 'Private file service is unavailable' }, error?.safe ? error.status : 503);
  }
}
