import { accountAccessResult } from '../helpers/accountAccessFixture.js';
import { describe, it, expect, vi } from 'vitest';
import { handlePrivateAttachment } from '../../base44/functions/uploadAttachment/handler.js';
import { encryptAttachment, decryptAttachment, createAccessToken, verifyAccessToken } from '../../base44/functions/uploadAttachment/handler.js';

const ID = 'a12345678901234567890123';
const NOW = Date.parse('2026-11-09T20:00:00Z');
const USER = { id: 'owner-a', email: 'a@example.test' };
const POLICY = '2026-11-11';
const TEXT = 'Synthetic private-file verification. No personal information.';
const bytes = new TextEncoder().encode(TEXT);
const metadata = () => ({ id: ID, owner_user_id: USER.id, name: 'example.txt', mime_type: 'text/plain', size_bytes: bytes.length, status: 'active' });

async function environment() {
  let user = USER; let now = NOW; let row; const storage = new Map();
  const core = {
    UploadPrivateFile: vi.fn(async ({ file }) => {
      const uri = `mp/private/test/${storage.size}.bin`;
      storage.set(uri, await file.arrayBuffer()); return { file_uri: uri };
    }),
    CreateFileSignedUrl: vi.fn(async ({ file_uri }) => ({ signed_url: `https://storage.example.test/${encodeURIComponent(file_uri)}` })),
  };
  const records = {
    create: vi.fn(async (data) => { row = { id: ID, ...data }; return row; }),
    update: vi.fn(async (_id, data) => { row = { ...row, ...data }; return row; }),
    // Deliberately ignores filters: the handler must re-check every boundary.
    filter: vi.fn(async () => row ? [row] : []),
  };
  const owner = { ...USER, mp_adult_policy: POLICY, mp_account_deletion_pending: false };
  const access = { id: 'access-a', subject_user_id: USER.id, adult_status: 'confirmed', policy_version: POLICY, attested_at: new Date(NOW).toISOString() };
  const client = { functions: { invoke: async () => accountAccessResult(user) }, auth: { me: async () => user }, integrations: { Core: core }, asServiceRole: { entities: {
    PrivateAttachment: records, FileDeletionRequest: { filter: vi.fn(async () => []) },
    User: { get: vi.fn(async () => owner) }, AccountAccess: { filter: vi.fn(async () => [access]) },
  }, integrations: { Core: core } } };
  const deps = { createClientFromRequest: () => client, now: () => now, fetchFile: vi.fn(async url => new Response(storage.get(decodeURIComponent(new URL(url).pathname.slice(1))))), downloadBase: 'https://app.example.test/functions/uploadAttachment' };
  const post = (body) => handlePrivateAttachment(new Request('https://app.example.test/functions/uploadAttachment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), deps);
  const uploaded = await post({ file_base64: btoa(TEXT), file_name: 'example.txt', file_type: 'text/plain' });
  expect(uploaded.status).toBe(200); const result = await uploaded.json();
  return { client, result, core, records, deps, post, storage, row: () => row, setRow: value => { row = value; }, setUser: value => { user = value; }, setTime: value => { now = value; }, get: (url = result.file_url, init) => handlePrivateAttachment(new Request(url, init), deps) };
}

describe('encrypted attachment storage', () => {
  it('round-trips bytes using AES-GCM and creates distinct keys and IVs per file', async () => {
    const row = metadata(); const one = await encryptAttachment(bytes, row); const two = await encryptAttachment(bytes, row);
    expect(one.fields.encryption_key).not.toBe(two.fields.encryption_key);
    expect(one.fields.encryption_iv).not.toBe(two.fields.encryption_iv);
    expect(one.fields.signing_key).not.toBe(one.fields.encryption_key);
    expect(new Uint8Array(one.ciphertext)).not.toEqual(bytes);
    expect(new Uint8Array(await decryptAttachment(one.ciphertext, { ...row, ...one.fields }))).toEqual(bytes);
  });
  it.each(['owner_user_id', 'id', 'mime_type', 'size_bytes'])('authenticates metadata %s along with the content', async (field) => {
    const row = metadata(); const encrypted = await encryptAttachment(bytes, row);
    const altered = { ...row, ...encrypted.fields, [field]: field === 'size_bytes' ? 1 : 'changed' };
    await expect(decryptAttachment(encrypted.ciphertext, altered)).rejects.toThrow();
  });
  it('rejects modified ciphertext and wrong encryption keys', async () => {
    const row = metadata(); const one = await encryptAttachment(bytes, row); const two = await encryptAttachment(bytes, row);
    const altered = new Uint8Array(one.ciphertext).slice(); altered[0] ^= 1;
    await expect(decryptAttachment(altered, { ...row, ...one.fields })).rejects.toThrow();
    await expect(decryptAttachment(one.ciphertext, { ...row, ...one.fields, encryption_key: two.fields.encryption_key })).rejects.toThrow();
  });
  it('limits access to five minutes and rejects edited times, signatures, IDs and owners', async () => {
    const row = { ...metadata(), ...(await encryptAttachment(bytes, metadata())).fields };
    const token = await createAccessToken(row, NOW);
    expect(await verifyAccessToken(row, token, NOW + 299999)).toBe(true);
    expect(await verifyAccessToken(row, token, NOW + 300000)).toBe(false);
    expect(await verifyAccessToken(row, token, NOW - 6000)).toBe(false);
    expect(await verifyAccessToken({ ...row, id: 'other' }, token, NOW)).toBe(false);
    expect(await verifyAccessToken({ ...row, owner_user_id: 'other' }, token, NOW)).toBe(false);
    const parts = token.split('.'); parts[1] = String(Number(parts[1]) + 300);
    expect(await verifyAccessToken(row, parts.join('.'), NOW)).toBe(false);
    expect(await verifyAccessToken(row, token.slice(0, -8) + 'aaaaaaaa', NOW)).toBe(false);
  });
});

describe('real cryptography through upload and download handlers', () => {
  it.each(['GET', 'HEAD'])('revokes an existing %s capability on declined source despite a stale positive projection', async method => {
    const e = await environment();
    expect((await e.get()).status).toBe(200);
    e.deps.fetchFile.mockClear(); e.core.CreateFileSignedUrl.mockClear();
    const source = (await e.client.asServiceRole.entities.AccountAccess.filter())[0];
    e.client.asServiceRole.entities.AccountAccess.filter.mockResolvedValue([{ ...source, adult_status: 'declined' }]);
    const denied = await e.get(undefined, { method });
    expect(denied.status).toBe(403);
    expect(await denied.text()).not.toContain(TEXT);
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
    expect(e.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each([
    ['disabled owner', { disabled: true }], ['foreign owner', { id: 'other' }],
    ['missing policy', { mp_adult_policy: undefined }], ['expired policy', { mp_adult_policy: 'old' }],
    ['deleting owner', { mp_account_deletion_pending: true }], ['missing deletion latch', { mp_account_deletion_pending: undefined }],
  ])('denies an issued link for %s', async (_name, change) => {
    const e = await environment(); const users = e.client.asServiceRole.entities.User;
    users.get.mockResolvedValue({ ...await users.get(USER.id), ...change });
    expect((await e.get()).status).toBe(403);
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
  });
  it.each(['missing', 'duplicate', 'foreign', 'pending', 'expired', 'unattested', 'invalid'])('denies %s access source', async state => {
    const e = await environment(); const source = e.client.asServiceRole.entities.AccountAccess;
    const row = (await source.filter())[0];
    const cases = { missing: [], duplicate: [row, { ...row, id: 'duplicate' }], foreign: [{ ...row, subject_user_id: 'other' }],
      pending: [{ ...row, adult_status: 'pending' }], expired: [{ ...row, policy_version: 'old' }], unattested: [{ ...row, attested_at: '' }], invalid: null };
    source.filter.mockResolvedValue(cases[state]);
    expect((await e.get()).status).toBe(403);
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
  });
  it('denies a missing owner and fails closed without disclosing provider errors', async () => {
    const e = await environment();
    e.client.asServiceRole.entities.User.get.mockRejectedValue({ status: 404 });
    expect((await e.get()).status).toBe(403);
    e.client.asServiceRole.entities.User.get.mockRejectedValue(new Error('private/provider-secret'));
    const unavailable = await e.get();
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain('provider-secret');
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
  });
  it.each(['age', 'deletion'])('rechecks %s revocation during the storage fetch before releasing bytes', async reason => {
    const e = await environment(); const fetchStored = e.deps.fetchFile.getMockImplementation();
    e.deps.fetchFile.mockImplementation(async (...args) => {
      if (reason === 'age') e.client.asServiceRole.entities.AccountAccess.filter.mockResolvedValue([]);
      else e.client.asServiceRole.entities.FileDeletionRequest.filter.mockResolvedValue([{ id: 'request-a', subject_user_id: USER.id, status: 'requested' }]);
      return fetchStored(...args);
    });
    const response = await e.get();
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(TEXT);
    expect(e.deps.fetchFile).toHaveBeenCalledTimes(1);
  });
  it('checks the capability owner without requiring a browser session or refreshing their grant', async () => {
    const e = await environment(); e.setUser(null);
    expect(await (await e.get()).text()).toBe(TEXT);
    expect(e.client.asServiceRole.entities.User.get).toHaveBeenCalledWith(USER.id);
    expect(e.client.asServiceRole.entities.AccountAccess.filter).toHaveBeenCalledWith({ subject_user_id: USER.id }, '-created_date', 2);
  });
  it('rejects an already issued capability once a deletion request is recorded', async () => {
    const e = await environment();
    expect((await e.get()).status).toBe(200);
    e.client.asServiceRole.entities.FileDeletionRequest.filter.mockResolvedValue([{ id: 'request-a', subject_user_id: USER.id, status: 'requested' }]);
    // The row deliberately remains active to exercise an in-flight activation race.
    expect(e.row().status).toBe('active');
    expect((await e.get()).status).toBe(403);
    expect((await e.post({ action: 'resolve', file_ref: e.result.file_ref })).status).toBe(403);
  });
  it('uploads and opens a filename with an emoji at the truncation boundary', async () => {
    const e = await environment();
    const name = 'a'.repeat(159) + '😀.txt';
    const uploaded = await e.post({ file_base64: btoa(TEXT), file_name: name, file_type: 'text/plain' });
    expect(uploaded.status).toBe(200);
    const file = await uploaded.json();
    expect(file.name).toBe('a'.repeat(159) + '😀');
    const opened = await e.get(file.file_url);
    expect(opened.status).toBe(200);
    expect(await opened.text()).toBe(TEXT);
    expect(opened.headers.get('content-disposition')).toContain(encodeURIComponent(file.name));
  });
  it.each(['\ud83d', '\ude00'])('reopens older records containing a lone surrogate', async (surrogate) => {
    const e = await environment();
    e.setRow({ ...e.row(), name: 'old-' + surrogate });
    for (const method of ['GET', 'HEAD']) {
      const opened = await e.get(undefined, { method });
      expect(opened.status).toBe(200);
      expect(opened.headers.get('content-disposition')).toContain('old-%EF%BF%BD');
      expect(await opened.text()).toBe(method === 'HEAD' ? '' : TEXT);
    }
  });
  it('returns plaintext only via its proxy; a freshly signed provider object contains only ciphertext', async () => {
    const e = await environment(); const record = e.row();
    const downloaded = await e.get(); expect(downloaded.status).toBe(200); expect(await downloaded.text()).toBe(TEXT);
    expect(downloaded.headers.get('cache-control')).toContain('no-store');
    expect(downloaded.headers.get('referrer-policy')).toBe('no-referrer');
    expect(downloaded.headers.get('content-type')).toBe('text/plain');
    expect(e.result.file_url).not.toContain('private/test');
    expect(JSON.stringify(e.result)).not.toMatch(/encryption_key|signing_key|file_uri/);
    const providerSigned = await e.core.CreateFileSignedUrl({ file_uri: record.file_uri });
    const providerBytes = await (await e.deps.fetchFile(providerSigned.signed_url)).arrayBuffer();
    expect(new TextDecoder().decode(providerBytes)).not.toContain(TEXT);
    expect(providerBytes.byteLength).toBe(bytes.length + 16);
  });
  it('allows owner renewal after expiry but denies another ordinary user and anonymous renewal', async () => {
    const e = await environment(); e.setTime(NOW + 300000);
    expect((await e.get()).status).toBe(403);
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
    e.setUser({ id: 'user-b', email: 'b@example.test' });
    expect((await e.post({ action: 'resolve', file_ref: e.result.file_ref })).status).toBe(404);
    e.setUser(null); expect((await e.post({ action: 'resolve', file_ref: e.result.file_ref })).status).toBe(401);
    e.setUser(USER); const renewed = await e.post({ action: 'resolve', file_ref: e.result.file_ref });
    expect(renewed.status).toBe(200); const link = (await renewed.json()).file_url;
    expect(link).not.toBe(e.result.file_url); expect(await (await e.get(link)).text()).toBe(TEXT);
    expect((await e.get()).status).toBe(403);
  });
  it('requires a valid capability even when called by an authenticated app user', async () => {
    const e = await environment();
    expect((await e.get('https://app.example.test/functions/uploadAttachment')).status).toBe(401);
    const url = new URL(e.result.file_url); url.searchParams.set('token', 'forged');
    expect((await e.get(url)).status).toBe(403); expect(e.deps.fetchFile).not.toHaveBeenCalled();
  });
  it('revokes outstanding links when the attachment is marked for deletion', async () => {
    const e = await environment(); e.setRow({ ...e.row(), status: 'deletion_pending' });
    expect((await e.get()).status).toBe(403); expect(e.deps.fetchFile).not.toHaveBeenCalled();
  });
  it('supports audio/PDF byte ranges and HEAD without redirecting to provider storage', async () => {
    const e = await environment(); const response = await e.get(undefined, { headers: { Range: 'bytes=0-8' } });
    expect(response.status).toBe(206); expect(await response.text()).toBe(TEXT.slice(0, 9));
    expect(response.headers.get('content-range')).toBe(`bytes 0-8/${bytes.length}`);
    expect(response.headers.get('location')).toBeNull();
    const head = await e.get(undefined, { method: 'HEAD' }); expect(head.status).toBe(200); expect(await head.text()).toBe('');
  });
  it.each(['bytes=9999-', 'bytes=0-2,4-6', 'bytes=-0', 'bytes=-'])('rejects invalid range %s', async (range) => {
    const e = await environment(); expect((await e.get(undefined, { headers: { Range: range } })).status).toBe(416);
  });
  it('fails closed on corruption, truncation and oversized provider responses', async () => {
    const e = await environment(); const uri = e.row().file_uri; const original = new Uint8Array(e.storage.get(uri));
    for (const corrupted of [original.slice(1), new Uint8Array(original.length + 1), original.map((b, i) => i === 0 ? b ^ 1 : b)]) {
      e.storage.set(uri, corrupted); const response = await e.get(); expect(response.status).toBe(503);
      expect(await response.text()).not.toMatch(/private\/test|encryption|signing|Synthetic/);
    }
  });
  it('migrates an owned legacy file and preserves the old URI for confirmed provider deletion', async () => {
    const e = await environment(); const legacy = { ...metadata(), file_uri: 'private/legacy/example.txt' };
    e.setRow(legacy); e.storage.set(legacy.file_uri, bytes);
    e.setUser({ id: 'user-b', email: 'b@example.test' });
    expect((await e.post({ action: 'resolve', file_ref: e.result.file_ref })).status).toBe(404);
    expect(e.deps.fetchFile).not.toHaveBeenCalled();
    e.setUser(USER); const response = await e.post({ action: 'resolve', file_ref: e.result.file_ref });
    expect(response.status).toBe(200); const result = await response.json();
    expect(e.row().encryption_version).toBe(1); expect(e.row().superseded_file_uri).toBe(legacy.file_uri);
    expect(e.row().file_uri).not.toBe(legacy.file_uri); expect(result.file_ref).toBe(e.result.file_ref);
    expect(await (await e.get(result.file_url)).text()).toBe(TEXT);
  });
});
