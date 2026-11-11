// Portable helper; copies are checked for byte parity in tests. Never send
// file paths, keys or signed links in ordinary user responses or logs.
export const OPEN_STATES = ['requested', 'submitted', 'confirmed'];
export const deletionError = (code, status = 503) => Object.assign(new Error(code), { code, status, safe: true });
const LIMIT = 1000;
const privateUri = value => typeof value === 'string' && /^(?:mp\/)?private\//.test(value) && value.length <= 2048 && !/[\r\n\x00]/.test(value);
export async function ownedAttachments(client, userId) {
  const all = [];
  for (let offset = 0; offset <= LIMIT; offset += 100) {
    const rows = await client.asServiceRole.entities.PrivateAttachment.filter({ owner_user_id: userId }, 'created_date', 100, offset);
    if (!Array.isArray(rows) || rows.some(row => row.owner_user_id !== userId || !row.id)) throw deletionError('FILES_UNAVAILABLE');
    all.push(...rows);
    if (all.length > LIMIT) throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
    if (rows.length < 100) return all;
  }
  throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
}
export async function openDeletionRequests(client, userId) {
  const rows = await client.asServiceRole.entities.FileDeletionRequest.filter({ subject_user_id: userId }, '-created_date', 101);
  if (!Array.isArray(rows) || rows.length > 100 || rows.some(row => row.subject_user_id !== userId || !row.id)) throw deletionError('FILES_UNAVAILABLE');
  return rows.filter(row => OPEN_STATES.includes(row.status));
}
export async function assertNoFileDeletion(client, userId) {
  if ((await openDeletionRequests(client, userId)).length) throw deletionError('FILE_DELETION_PENDING', 403);
}
export function collectManifest(rows) {
  const uris = new Set();
  let incomplete = false;
  for (const row of rows) {
    if (row.status === 'uploading' || (!row.file_uri && row.status !== 'references_cleared')) incomplete = true;
    for (const key of ['file_uri', 'superseded_file_uri']) {
      if (row[key]) {
        if (!privateUri(row[key])) throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
        uris.add(row[key]);
      }
    }
  }
  return { file_uris: [...uris].sort(), attachment_ids: rows.map(row => row.id).sort(), incomplete };
}
export async function manifestHash(manifest) {
  const value = JSON.stringify([manifest.attachment_ids, manifest.file_uris, manifest.incomplete]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function requestFileDeletion(client, user, now = () => new Date().toISOString()) {
  const entity = client.asServiceRole.entities.FileDeletionRequest;
  const open = await openDeletionRequests(client, user.id);
  if (open.length > 1) throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
  const attachments = await ownedAttachments(client, user.id);
  if (!open.length && attachments.every(row => row.status === 'references_cleared')) return null;
  const manifest = collectManifest(attachments);
  let request = open[0];
  if (!request) {
    request = await entity.create({ subject_user_id: user.id, subject_email: user.email,
      requested_at: now(), status: 'requested', file_uris: manifest.file_uris,
      attachment_ids: manifest.attachment_ids, manifest_hash: await manifestHash(manifest),
      incomplete: manifest.incomplete, coverage: 'managed_private_attachments_only' });
    if (!request?.id) throw deletionError('FILES_UNAVAILABLE');
  }
  // The durable queue exists BEFORE invalidating links or deleting any records.
  // In-flight uploads stay marked uploading so operators cannot confirm an
  // incomplete manifest. Their returned URI must still be recorded.
  for (const row of attachments) {
    if (row.status === 'active') await client.asServiceRole.entities.PrivateAttachment.update(row.id, { status: 'deletion_pending' });
  }
  const check = await openDeletionRequests(client, user.id);
  if (check.length !== 1 || check[0].id !== request.id) throw deletionError('MANUAL_REVIEW_REQUIRED', 409);
  return request;
}
export function publicDeletionStatus(row) {
  return { id: row.id, status: row.status, requested_at: row.requested_at,
    file_count: row.file_uris?.length || 0, incomplete: row.incomplete === true,
    coverage: 'managed_private_attachments_only' };
}
