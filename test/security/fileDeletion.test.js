import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { handleFileDeletion } from '../../base44/functions/fileDeletion/handler.js';
import { assertNoFileDeletion, requestFileDeletion } from '../../base44/functions/fileDeletion/queue.js';
import { hasUnmanagedAttachments } from '../../base44/functions/deleteMyAccount/legacyFiles.js';
const USER = { id: 'user-a', email: 'a@example.test', role: 'user' };
const ADMIN = { id: 'admin', email: 'admin@example.test', role: 'admin' };
const URI = 'mp/private/app/a/new.bin';
const OLD = 'private/app/a/old.pdf';
function fixture() {
  let user = USER;
  const files = [{ id: 'file-a', owner_user_id: USER.id, owner_email: USER.email, name: 'sensitive.pdf', status: 'active', file_uri: URI, superseded_file_uri: OLD, encryption_key: 'secret-key', signing_key: 'secret-signature' }];
  const queue = [];
  function api(rows) {
    return {
      filter: vi.fn(async (query, _sort, limit = 100, offset = 0) => rows.filter(row => Object.entries(query).every(([key, value]) => row[key] === value)).slice(offset, offset + limit)),
      list: vi.fn(async (_sort, limit = 50, offset = 0) => rows.slice(offset, offset + limit)),
      get: vi.fn(async id => structuredClone(rows.find(row => row.id === id))),
      create: vi.fn(async values => { const row = { id: `request-${rows.length}`, ...structuredClone(values) }; rows.push(row); return structuredClone(row); }),
      update: vi.fn(async (id, values) => Object.assign(rows.find(row => row.id === id), structuredClone(values))),
    };
  }
  const attachments = api(files); const requests = api(queue);
  const client = { auth: { me: vi.fn(async () => user) }, asServiceRole: { entities: { PrivateAttachment: attachments, FileDeletionRequest: requests } },
    functions: { invoke: vi.fn(async () => ({ data: { schema_version: 1, policy_version: '2026-11-11', user_id: user.id, adult_status: 'confirmed', eligible: true } })) } };
  const call = input => handleFileDeletion(new Request('https://app.test/fileDeletion', { method: 'POST', body: JSON.stringify(input) }), { createClientFromRequest: () => client, now: () => '2026-11-11T12:00:00.000Z' });
  const request = () => call({ action: 'request' });
  const exportManifest = () => call({ action: 'export', request_id: queue[0].id });
  return { files, queue, attachments, requests, client, call, request, exportManifest, setUser: value => { user = value; } };
}
async function submitted(f) {
  await f.request(); f.setUser(ADMIN);
  const exported = await (await f.exportManifest()).json();
  const input = { request_id: exported.request_id, manifest_hash: exported.manifest_hash, ticket_reference: 'ticket-123' };
  expect((await f.call({ action: 'submitted', ...input })).status).toBe(200);
  return input;
}
describe('support-assisted private-file erasure', () => {
  it('persists both ciphertext and legacy paths before invalidating links; repeat requests are idempotent', async () => {
    const f = fixture();
    expect((await f.request()).status).toBe(200);
    expect(f.queue[0].file_uris).toEqual([URI, OLD].sort());
    expect(f.files[0].status).toBe('deletion_pending');
    expect(f.requests.create.mock.invocationCallOrder[0]).toBeLessThan(f.attachments.update.mock.invocationCallOrder[0]);
    expect((await f.request()).status).toBe(200);
    expect(f.requests.create).toHaveBeenCalledTimes(1);
    await expect(assertNoFileDeletion(f.client, USER.id)).rejects.toMatchObject({ status: 403 });
  });
  it('returns only the requesting user status, without paths, keys, filenames or another account', async () => {
    const f = fixture(); await f.request();
    const text = await (await f.call({ action: 'status' })).text();
    expect(text).not.toMatch(/private\/|secret|sensitive|subject_email/);
    f.setUser({ id: 'b', email: 'b@example.test', role: 'user' });
    expect(await (await f.call({ action: 'status' })).json()).toEqual({ requests: [] });
  });
  it('denies anonymous users and forged ownership/action fields without reading files', async () => {
    const f = fixture(); f.setUser(null);
    expect((await f.request()).status).toBe(401);
    expect(f.attachments.filter).not.toHaveBeenCalled();
    f.setUser(USER);
    expect((await f.call({ action: 'request', subject_user_id: 'b' })).status).toBe(400);
    expect(f.attachments.filter).not.toHaveBeenCalled();
  });
  it.each(['list', 'export', 'submitted', 'confirm', 'clear_references'])('denies ordinary callers the %s operator action', async action => {
    const f = fixture(); await f.request();
    expect((await f.call({ action, ...(action === 'list' ? {} : { request_id: f.queue[0].id }) })).status).toBe(403);
    expect(f.requests.get).not.toHaveBeenCalled();
  });
  it('permits privacy requests without requiring adult eligibility but requires it for admin operations', async () => {
    const f = fixture(); f.client.functions.invoke.mockRejectedValue(new Error('age missing'));
    expect((await f.request()).status).toBe(200);
    f.setUser(ADMIN);
    expect((await f.call({ action: 'list' })).status).toBe(503);
  });
  it('requires submission and exact written confirmation before clearing any references', async () => {
    const f = fixture(); const input = await submitted(f);
    expect((await f.call({ action: 'clear_references', request_id: input.request_id, manifest_hash: input.manifest_hash })).status).toBe(409);
    expect((await f.call({ action: 'confirm', ...input, all_files_confirmed: false })).status).toBe(409);
    expect((await f.call({ action: 'confirm', ...input, all_files_confirmed: true, ticket_reference: 'wrong-ticket' })).status).toBe(409);
    expect(f.files[0].file_uri).toBe(URI);
    expect((await f.call({ action: 'confirm', ...input, all_files_confirmed: true })).status).toBe(200);
    expect(f.files[0].file_uri).toBe(URI);
    expect((await f.call({ action: 'clear_references', request_id: input.request_id, manifest_hash: input.manifest_hash })).status).toBe(200);
    expect(f.files[0]).toMatchObject({ file_uri: '', superseded_file_uri: '', encryption_key: '', signing_key: '', owner_email: '', name: '', status: 'references_cleared' });
    expect(f.queue[0]).toMatchObject({ status: 'references_cleared', file_uris: [], subject_email: '' });
  });
  it('invalidates an exported manifest when an in-flight upload later adds a URI', async () => {
    const f = fixture(); const input = await submitted(f);
    f.files.push({ id: 'late', owner_user_id: USER.id, status: 'active', file_uri: 'private/app/a/late.bin' });
    expect((await f.call({ action: 'confirm', ...input, all_files_confirmed: true })).status).toBe(409);
    const updated = await (await f.exportManifest()).json();
    expect(updated.manifest.file_uris).toContain('private/app/a/late.bin');
    expect(updated.manifest_hash).not.toBe(input.manifest_hash);
    expect(f.queue[0].status).toBe('requested');
    expect(f.files[0].file_uri).toBe(URI);
  });
  it('blocks confirmation of uploads without a stored URI or of disappeared source rows', async () => {
    const f = fixture(); f.files.push({ id: 'uploading', owner_user_id: USER.id, status: 'uploading' });
    await f.request(); f.setUser(ADMIN);
    const data = await (await f.exportManifest()).json();
    expect(data.incomplete).toBe(true);
    expect((await f.call({ action: 'submitted', request_id: data.request_id, manifest_hash: data.manifest_hash, ticket_reference: 'ticket-123' })).status).toBe(409);
    f.files.splice(0);
    expect((await (await f.exportManifest()).json()).incomplete).toBe(true);
  });
  it('fails closed on foreign filter results, duplicate queues and persistence errors', async () => {
    const f = fixture(); f.attachments.filter.mockResolvedValue([{ id: 'b', owner_user_id: 'other' }]);
    expect((await f.request()).status).toBe(503); expect(f.requests.create).not.toHaveBeenCalled();
    const g = fixture(); g.requests.create.mockRejectedValue(new Error('private/path'));
    const response = await g.request(); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private/path'); expect(g.attachments.update).not.toHaveBeenCalled();
    const h = fixture(); await h.request(); h.queue.push({ ...h.queue[0], id: 'duplicate' });
    expect((await h.request()).status).toBe(409);
  });
  it('can retry partially scrubbed references without requiring a new storage confirmation', async () => {
    const f = fixture(); const input = await submitted(f);
    await f.call({ action: 'confirm', ...input, all_files_confirmed: true });
    f.requests.update.mockRejectedValueOnce(new Error('temporary'));
    const clear = { action: 'clear_references', request_id: input.request_id, manifest_hash: input.manifest_hash };
    expect((await f.call(clear)).status).toBe(503);
    expect(f.queue[0].file_uris).toContain(URI);
    expect((await f.call(clear)).status).toBe(200);
  });
  it('does not create empty requests when no files exist', async () => {
    const f = fixture(); f.files.splice(0);
    expect(await requestFileDeletion(f.client, USER)).toBe(null);
    expect(f.requests.create).not.toHaveBeenCalled();
  });
  it('retains older unmanaged upload references for manual inventory', () => {
    expect(hasUnmanagedAttachments({ images: ['https://old.example.test/file.pdf'] })).toBe(true);
    expect(hasUnmanagedAttachments({ messages: [{ attachments: [{ file_uri: 'private/old/object' }] }] })).toBe(true);
    expect(hasUnmanagedAttachments({ attachments: [{ file_ref: 'mp-private:a12345678901234567890123', file_url: 'https://signed.example.test/' }] })).toBe(false);
    expect(hasUnmanagedAttachments({ situation: 'ordinary text', images: [] })).toBe(false);
  });
  it('packages the same queue helper with every deployed consumer', () => {
    const canonical = readFileSync('base44/functions/fileDeletion/queue.js', 'utf8');
    for (const name of ['deleteMyAccount','uploadAttachment']) expect(readFileSync(`base44/functions/${name}/fileDeletionQueue.js`, 'utf8')).toBe(canonical);
    expect(readFileSync('base44/functions/fileDeletion/accountAccessGuard.js', 'utf8')).toBe(readFileSync('base44/functions/accountAccess/guard.js', 'utf8'));
  });
});
