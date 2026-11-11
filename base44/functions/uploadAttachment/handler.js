import { requireAccountAccess } from './accountAccessGuard.js';
import { assertNoFileDeletion } from './fileDeletionQueue.js';
// Storage holds ciphertext. Only this function can decrypt an owned attachment
// using an expiring capability; the provider's signing API cannot grant plaintext.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 300;
const AGE_POLICY_VERSION = '2026-11-11';
// Base44's current storage returns mp/private/...; older objects use private/....
// Accept only these private namespaces, never a public URL or a caller-supplied URI.
const PRIVATE_URI = /^(?:mp\/)?private\//;
const MAX_REQUEST_BYTES = Math.ceil(MAX_FILE_BYTES * 4 / 3) + 65536;
const REFERENCE = /^mp-private:([a-f0-9]{24})$/i;
const TYPES = new Set([
  'application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg',
  'image/jpg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/mp4',
  'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'video/webm',
]);
const EXTENSIONS = { 'application/pdf': 'pdf', 'text/plain': 'txt', 'text/csv': 'csv', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'video/webm': 'webm' };
const HEADERS = {
  'Cache-Control': 'private, no-store', Vary: 'Authorization',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};
function fail(status, message) {
  return Object.assign(new Error(message), { status, safe: true });
}
function json(body, status = 200) { return Response.json(body, { status, headers: HEADERS }); }

function safeAttachmentName(value) {
  const name = typeof value === 'string' && value ? value : 'attachment';
  // Replace lone surrogates from older records before URI encoding, and truncate
  // by Unicode code point so a supplementary character is never split in half.
  const wellFormed = new TextDecoder().decode(new TextEncoder().encode(name));
  return Array.from(wellFormed.replace(/[\x00-\x1f\x7f/\\]/g, '_')).slice(0, 160).join('');
}

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

async function readStoredBytes(client, record, fetchFile, encrypted) {
  if (!PRIVATE_URI.test(record.file_uri || '') || !Number.isSafeInteger(record.size_bytes) || record.size_bytes < 1 || record.size_bytes > MAX_FILE_BYTES) throw fail(503, 'Private file is unavailable');
  const signed = await client.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: record.file_uri, expires_in: SIGNED_URL_SECONDS,
  });
  if (!/^https:\/\//.test(signed?.signed_url || '')) throw fail(503, 'Private file is unavailable');
  const response = await fetchFile(signed.signed_url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
  if (!response.ok || !response.body) throw fail(503, 'Private file is unavailable');
  const expected = record.size_bytes + (encrypted ? 16 : 0);
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > expected) { await reader.cancel(); throw fail(503, 'Private file is unavailable'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (length !== expected) throw fail(503, 'Private file is unavailable');
  return new Blob(chunks).arrayBuffer();
}

async function storeEncrypted(client, records, record, bytes, legacy = false) {
  const { ciphertext, fields } = await encryptAttachment(bytes, record);
  // Neither the original name nor MIME type is disclosed to the storage layer.
  const file = new File([ciphertext], `${crypto.randomUUID()}.bin`, { type: 'application/octet-stream' });
  const uploaded = await client.integrations.Core.UploadPrivateFile({ file });
  const uri = uploaded?.file_uri;
  if (typeof uri !== 'string' || !PRIVATE_URI.test(uri)) throw fail(503, 'Private upload failed');
  const update = { ...fields, file_uri: uri, status: 'uploading', ...(legacy ? { superseded_file_uri: record.file_uri } : {}) };
  try { await records.update(record.id, update); }
  catch { await records.update(record.id, update); }
  try {
    // Preserve the URI even if deletion/age revocation happened during upload.
    await assertNoFileDeletion(client, record.owner_user_id);
    await requireAccountAccess(client, { id: record.owner_user_id });
    await records.update(record.id, { status: 'active' });
  } catch (error) {
    await records.update(record.id, { status: 'deletion_pending' });
    throw error;
  }
  return { ...record, ...update, status: 'active' };
}

async function signedResult(record, downloadBase, now) {
  if (record.encryption_version !== 1 || !PRIVATE_URI.test(record.file_uri || '')) throw fail(503, 'Private file is unavailable');
  if (!EXTENSIONS[record.mime_type]) throw fail(503, 'Private file is unavailable');
  const url = new URL(downloadBase.replace('{id}', record.id).replace('{ext}', EXTENSIONS[record.mime_type]));
  if (url.protocol !== 'https:') throw fail(503, 'Private file is unavailable');
  url.searchParams.set('attachment', record.id);
  url.searchParams.set('token', await createAccessToken(record, now()));
  return {
    file_ref: `mp-private:${record.id}`, file_url: url.href, name: record.name,
    mime_type: record.mime_type, size_bytes: record.size_bytes, expires_in: SIGNED_URL_SECONDS,
  };
}

async function assertDownloadAccess(client, ownerId) {
  if (typeof ownerId !== 'string' || !ownerId) throw fail(403, 'Access link is unavailable');
  const entities = client.asServiceRole.entities;
  // A capability has no caller session. Read its owner's current source and
  // locked projection directly; never refresh an older grant while downloading.
  const [owner, access] = await Promise.all([
    entities.User.get(ownerId).catch(error => {
      if ((error?.status ?? error?.response?.status) === 404) return null;
      throw error;
    }),
    entities.AccountAccess.filter({ subject_user_id: ownerId }, '-created_date', 2),
    assertNoFileDeletion(client, ownerId),
  ]);
  if (owner?.id !== ownerId || owner.disabled === true ||
      owner.mp_adult_policy !== AGE_POLICY_VERSION || owner.mp_account_deletion_pending !== false ||
      !Array.isArray(access) || access.length !== 1 || !access[0]?.id ||
      access[0].subject_user_id !== ownerId || access[0].policy_version !== AGE_POLICY_VERSION ||
      access[0].adult_status !== 'confirmed' || !access[0].attested_at) {
    throw fail(403, 'Access link is unavailable');
  }
}

async function download(req, client, fetchFile, now) {
  const url = new URL(req.url); const id = url.searchParams.get('attachment');
  if (!/^[a-f0-9]{24}$/i.test(id || '') || !url.searchParams.get('token')) throw fail(401, 'Unauthorized');
  const matches = await client.asServiceRole.entities.PrivateAttachment.filter({ id, status: 'active' }, '-created_date', 1);
  const record = matches?.[0];
  if (!record || record.id !== id || record.status !== 'active' || record.encryption_version !== 1 || !TYPES.has(record.mime_type) || !await verifyAccessToken(record, url.searchParams.get('token'), now())) throw fail(403, 'Access link is invalid or expired');
  await assertDownloadAccess(client, record.owner_user_id);
  const ciphertext = await readStoredBytes(client, record, fetchFile, true);
  const bytes = new Uint8Array(await decryptAttachment(ciphertext, record));
  if (bytes.length !== record.size_bytes) throw fail(503, 'Private file is unavailable');
  // Storage may be slow. Recheck after fetching/decrypting, before releasing
  // bytes or HEAD metadata if access was revoked while the request was in flight.
  await assertDownloadAccess(client, record.owner_user_id);
  let start = 0; let end = bytes.length - 1; let status = 200;
  const headers = { ...HEADERS, 'Content-Type': record.mime_type, 'Accept-Ranges': 'bytes', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': `inline; filename="attachment"; filename*=UTF-8''${encodeURIComponent(safeAttachmentName(record.name)).replaceAll("'", '%27')}` };
  const range = req.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]) || range.length > 80) return new Response(null, { status: 416, headers: { ...HEADERS, 'Content-Range': `bytes */${bytes.length}` } });
    start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start < 0 || start >= bytes.length) return new Response(null, { status: 416, headers: { ...HEADERS, 'Content-Range': `bytes */${bytes.length}` } });
    status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
  }
  headers['Content-Length'] = String(end - start + 1);
  return new Response(req.method === 'HEAD' ? null : bytes.slice(start, end + 1), { status, headers });
}

export async function handlePrivateAttachment(req, { createClientFromRequest, fetchFile = fetch, now = Date.now, downloadBase = 'https://mindful-path-production-7704.up.railway.app/api/private-attachments/{id}/attachment.{ext}' }) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range' } });
  if (!['POST', 'GET', 'HEAD'].includes(req.method)) return json({ error: 'Method not allowed' }, 405);
  try {
    const client = createClientFromRequest(req);
    if (req.method === 'GET' || req.method === 'HEAD') return await download(req, client, fetchFile, now);
    let user;
    try { user = await client.auth.me(); }
    catch (error) {
      if ([401, 403].includes(error?.status || error?.response?.status)) throw fail(401, 'Unauthorized');
      throw error;
    }
    if (!user?.id || !user?.email) throw fail(401, 'Unauthorized');
    await requireAccountAccess(client, user);
    await assertNoFileDeletion(client, user.id);
    const data = await readBody(req);
    const records = client.asServiceRole.entities.PrivateAttachment;

    if (data.action === 'resolve') {
      const id = typeof data.file_ref === 'string' ? REFERENCE.exec(data.file_ref)?.[1] : null;
      if (!id) throw fail(400, 'An owned file reference is required');
      const matches = await records.filter({ id, owner_user_id: user.id, status: 'active' }, '-created_date', 1);
      let record = matches?.[0];
      // Check again even if a provider ignores a filter. Admins cannot bypass ownership.
      if (!record || record.id !== id || record.owner_user_id !== user.id || record.status !== 'active') {
        throw fail(404, 'File not found');
      }
      // Migrate only a file its authenticated owner requested. Retain its old
      // provider identifier for a separate, confirmed Customer Care erasure.
      if (!record.encryption_version) record = await storeEncrypted(client, records, record, await readStoredBytes(client, record, fetchFile, false), true);
      return json(await signedResult(record, downloadBase, now));
    }

    const file = data.file;
    if (!(file instanceof Blob) || !file.size) throw fail(400, 'No file provided');
    if (file.size > MAX_FILE_BYTES) throw fail(413, 'File is too large');
    const mimeType = file.type.split(';')[0].trim().toLowerCase();
    if (!TYPES.has(mimeType)) throw fail(415, 'Unsupported file type');
    const name = safeAttachmentName(file.name);
    const record = await records.create({
      owner_user_id: user.id, owner_email: user.email, name, mime_type: mimeType,
      size_bytes: file.size, status: 'uploading',
    });
    if (!REFERENCE.test(`mp-private:${record?.id}`)) throw fail(503, 'Private file is unavailable');
    const encrypted = await storeEncrypted(client, records, record, await file.arrayBuffer());
    return json(await signedResult(encrypted, downloadBase, now));
  } catch (error) {
    // Provider errors may contain storage links or user data. Never return them.
    return json({ error: error?.safe ? error.message : 'Private file service is unavailable' }, error?.safe ? error.status : 503);
  }
}

// Standard Web Crypto only. Keys stay in the service-role-only attachment row.
// A provider storage URL grants access to ciphertext, never to the clear file.
export const ACCESS_SECONDS = 300;
const encoder = new TextEncoder();
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
function decode(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid key');
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
  if (length && bytes.length !== length) throw new Error('Invalid key length');
  return bytes;
}
const aad = (record) => encoder.encode(JSON.stringify(['mindful-path-file-v1', record.id, record.owner_user_id, record.mime_type, record.size_bytes]));
const random = (length) => crypto.getRandomValues(new Uint8Array(length));

export async function encryptAttachment(bytes, record) {
  const rawKey = random(32);
  const iv = random(12);
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(record), tagLength: 128 }, key, bytes);
  return { ciphertext, fields: { encryption_version: 1, encryption_key: encode(rawKey), encryption_iv: encode(iv), signing_key: encode(random(32)) } };
}

export async function decryptAttachment(ciphertext, record) {
  if (record.encryption_version !== 1) throw new Error('Unsupported file version');
  const key = await crypto.subtle.importKey('raw', decode(record.encryption_key, 32), 'AES-GCM', false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(record.encryption_iv, 12), additionalData: aad(record), tagLength: 128 }, key, ciphertext);
}

async function signingKey(record, usage) {
  return crypto.subtle.importKey('raw', decode(record.signing_key, 32), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}
const tokenData = (record, payload) => encoder.encode(JSON.stringify(['mindful-path-access-v1', record.id, record.owner_user_id, payload]));

export async function createAccessToken(record, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const payload = `${issued}.${issued + ACCESS_SECONDS}.${encode(random(16))}`;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(record, 'sign'), tokenData(record, payload));
  return `${payload}.${encode(signature)}`;
}

export async function verifyAccessToken(record, token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 180) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || !/^\d{10}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1])) return false;
  const issued = Number(parts[0]); const expires = Number(parts[1]); const seconds = Math.floor(now / 1000);
  if (issued > seconds + 5 || expires - issued !== ACCESS_SECONDS || seconds >= expires) return false;
  try {
    decode(parts[2], 16);
    return await crypto.subtle.verify('HMAC', await signingKey(record, 'verify'), decode(parts[3], 32), tokenData(record, parts.slice(0, 3).join('.')));
  } catch { return false; }
}
