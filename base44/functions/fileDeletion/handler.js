import { requireAccountAccess } from './accountAccessGuard.js';
import { deletionError, ownedAttachments, openDeletionRequests, collectManifest, manifestHash, requestFileDeletion, publicDeletionStatus } from './queue.js';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
async function inputFor(req) {
  const reader = req.body?.getReader();
  if (!reader) throw deletionError('INVALID_REQUEST', 400);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw deletionError('INVALID_REQUEST', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let data;
  try { data = JSON.parse(await new Blob(chunks).text()); } catch { throw deletionError('INVALID_REQUEST', 400); }
  const allowed = { request: ['action'], status: ['action'], list: ['action', 'offset'],
    export: ['action', 'request_id'], submitted: ['action', 'request_id', 'manifest_hash', 'ticket_reference'],
    confirm: ['action', 'request_id', 'manifest_hash', 'ticket_reference', 'all_files_confirmed'],
    clear_references: ['action', 'request_id', 'manifest_hash'] };
  if (!data || Array.isArray(data) || !allowed[data.action] || Object.keys(data).some(key => !allowed[data.action].includes(key))) throw deletionError('INVALID_REQUEST', 400);
  return data;
}
async function currentManifest(client, request) {
  const rows = await ownedAttachments(client, request.subject_user_id);
  const manifest = collectManifest(rows);
  // Never lose paths already preserved in the queue even if a row disappears.
  manifest.file_uris = [...new Set([...(request.file_uris || []), ...manifest.file_uris])].sort();
  manifest.attachment_ids = [...new Set([...(request.attachment_ids || []), ...manifest.attachment_ids])].sort();
  if ((request.attachment_ids || []).some(id => !rows.some(row => row.id === id))) manifest.incomplete = true;
  return { rows, manifest, hash: await manifestHash(manifest) };
}
export async function handleFileDeletion(req, { createClientFromRequest, now = () => new Date().toISOString() }) {
  const reply = (data, status = 200) => Response.json(data, { status, headers });
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const client = createClientFromRequest(req);
    let user;
    try { user = await client.auth.me(); } catch { throw deletionError('UNAUTHORIZED', 401); }
    if (!user?.id || !user.email || user.disabled === true) throw deletionError('UNAUTHORIZED', 401);
    const input = await inputFor(req);
    const entity = client.asServiceRole.entities.FileDeletionRequest;
    // Privacy rights do not depend on an adult declaration.
    if (input.action === 'request') {
      const request = await requestFileDeletion(client, user, now);
      return reply(request ? publicDeletionStatus(request) : { status: 'nothing_to_delete', file_count: 0 });
    }
    if (input.action === 'status') {
      const rows = await entity.filter({ subject_user_id: user.id }, '-created_date', 100);
      if (!Array.isArray(rows) || rows.some(row => row.subject_user_id !== user.id)) throw deletionError('FILES_UNAVAILABLE');
      return reply({ requests: rows.map(publicDeletionStatus) });
    }
    if (user.role !== 'admin') throw deletionError('FORBIDDEN', 403);
    await requireAccountAccess(client, user);
    if (input.action === 'list') {
      const offset = input.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw deletionError('INVALID_REQUEST', 400);
      const rows = await entity.list('-created_date', 50, offset);
      return reply({ requests: rows.map(row => ({ ...publicDeletionStatus(row), subject_email: row.subject_email })), next_offset: rows.length === 50 ? offset + 50 : null });
    }
    if (typeof input.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.request_id)) throw deletionError('INVALID_REQUEST', 400);
    const request = await entity.get(input.request_id);
    if (!request || request.id !== input.request_id || !request.subject_user_id) throw deletionError('NOT_FOUND', 404);
    if (request.status === 'references_cleared') throw deletionError('ALREADY_CLEARED', 409);
    const open = await openDeletionRequests(client, request.subject_user_id);
    if (open.length !== 1 || open[0].id !== request.id) throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
    const { rows, manifest, hash } = await currentManifest(client, request);
    if (input.action === 'export') {
      const changed = request.manifest_hash !== hash;
      await entity.update(request.id, { ...manifest, manifest_hash: hash,
        ...(changed ? { status: 'requested', confirmed_at: '', confirmed_by: '', ticket_reference: '' } : {}) });
      return reply({ request_id: request.id, manifest_hash: hash, incomplete: manifest.incomplete,
        status: changed ? 'requested' : request.status,
        manifest: { app_name: 'Mindful Path', app_id: '69504b725a07f5aa75aeaf7d', request_id: request.id,
          file_uris: manifest.file_uris, coverage: 'managed_private_attachments_only' } });
    }
    if (manifest.incomplete) throw deletionError('UPLOAD_OR_REVIEW_PENDING', 409);
    if (input.manifest_hash !== hash || request.manifest_hash !== hash) throw deletionError('MANIFEST_CHANGED', 409);
    if (input.action === 'submitted' || input.action === 'confirm') {
      if (typeof input.ticket_reference !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ._:#/-]{2,159}$/.test(input.ticket_reference)) throw deletionError('INVALID_REQUEST', 400);
      if (input.action === 'submitted') {
        if (request.status !== 'requested') throw deletionError('INVALID_STATE', 409);
        await entity.update(request.id, { status: 'submitted', submitted_at: now(), ticket_reference: input.ticket_reference });
        return reply({ id: request.id, status: 'submitted' });
      }
      if (request.status !== 'submitted' || input.all_files_confirmed !== true || request.ticket_reference !== input.ticket_reference) throw deletionError('SUPPORT_CONFIRMATION_REQUIRED', 409);
      await entity.update(request.id, { status: 'confirmed', confirmed_at: now(), confirmed_by: user.id });
      return reply({ id: request.id, status: 'confirmed' });
    }
    if (request.status !== 'confirmed' || !request.confirmed_at || !request.confirmed_by) throw deletionError('SUPPORT_CONFIRMATION_REQUIRED', 409);
    // Scrub identifiers and encryption material, rather than relying on a
    // possibly soft-delete API. A failed write leaves the queue open for retry.
    for (const row of rows) {
      await client.asServiceRole.entities.PrivateAttachment.update(row.id, {
        status: 'references_cleared', file_uri: '', superseded_file_uri: '', name: '', owner_email: '',
        encryption_key: '', encryption_iv: '', signing_key: '',
      });
    }
    await entity.update(request.id, { status: 'references_cleared', cleared_at: now(), file_uris: [], attachment_ids: [],
      subject_email: '', manifest_hash: '', incomplete: false });
    return reply({ id: request.id, status: 'references_cleared', provider_conversation_erasure: 'unconfirmed' });
  } catch (error) {
    const allowed = ['INVALID_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'FILES_UNAVAILABLE', 'MANUAL_REVIEW_REQUIRED', 'UPLOAD_OR_REVIEW_PENDING', 'MANIFEST_CHANGED', 'INVALID_STATE', 'SUPPORT_CONFIRMATION_REQUIRED', 'ALREADY_CLEARED'];
    return reply({ error: allowed.includes(error?.code) ? error.code : 'FILES_UNAVAILABLE' }, allowed.includes(error?.code) ? error.status : 503);
  }
}
