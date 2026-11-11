import { accountAccessResult } from '../helpers/accountAccessFixture.js';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { handlePrivateAttachment, MAX_FILE_BYTES } from '../../base44/functions/uploadAttachment/handler.js';
import { handleExtractPdfText } from '../../base44/functions/extractPdfText/handler.js';
import { resolvePrivateAttachment, uploadPrivateAttachment } from '../../src/lib/privateAttachments.js';
import { serializeAttachmentMetadataMarker, sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';

const ID = 'a12345678901234567890123';
const REF = `mp-private:${ID}`;
const URI = 'private/app/user/worksheet.pdf';
const SIGNED_URL = 'https://files.example.test/worksheet.pdf?signature=temporary';
const USER = { id: 'user-a', email: 'a@example.test' };
const fixture = (user = USER) => {
  const record = { id: ID, owner_user_id: USER.id, owner_email: USER.email, name: 'worksheet.pdf', mime_type: 'application/pdf', size_bytes: 4, file_uri: URI, status: 'active', encryption_version: 1, encryption_key: btoa('e'.repeat(32)).replace(/=+$/, ''), encryption_iv: btoa('i'.repeat(12)), signing_key: btoa('s'.repeat(32)).replace(/=+$/, '') };
  const records = { create: vi.fn(async (data) => ({ id: ID, ...data })), update: vi.fn(async () => ({})), filter: vi.fn(async () => [record]) };
  const core = { UploadPrivateFile: vi.fn(async () => ({ file_uri: URI })), CreateFileSignedUrl: vi.fn(async () => ({ signed_url: SIGNED_URL })), UploadFile: vi.fn(), ExtractDataFromUploadedFile: vi.fn(async () => ({ output: { full_text: 'Example text', page_count: 1 } })) };
  const client = { auth: { me: vi.fn(async () => user) }, asServiceRole: { entities: { PrivateAttachment: records, FileDeletionRequest: { filter: vi.fn(async () => []) } }, integrations: { Core: core } }, integrations: { Core: core }, functions: { invoke: vi.fn(async name => name === 'accountAccess' ? accountAccessResult(user) : ({ data: { file_ref: REF, file_url: SIGNED_URL, mime_type: 'application/pdf' } })) } };
  const deps = { createClientFromRequest: () => client, fetchFile: vi.fn(async () => new Response(new Uint8Array(4))) };
  return { client, record, records, core, deps };
};
const jsonRequest = (body) => new Request('https://app.example.test/uploadAttachment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const resolveRequest = (extra = {}) => jsonRequest({ action: 'resolve', file_ref: REF, ...extra });
function uploadRequest({ size = 4, type = 'application/pdf', name = 'worksheet.pdf' } = {}) {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(size)], name, { type }));
  form.set('owner_user_id', 'forged-owner');
  return new Request('https://app.example.test/uploadAttachment', { method: 'POST', body: form });
}

describe('private attachment ownership boundary', () => {
  it('blocks uploads, fresh links and extraction before data access when age is missing', async () => {
    const f = fixture();
    f.client.functions.invoke.mockResolvedValue({ data: {
      ...accountAccessResult(USER).data, eligible: false, adult_status: 'pending',
    } });
    expect((await handlePrivateAttachment(uploadRequest(), f.deps)).status).toBe(403);
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(403);
    expect((await handleExtractPdfText(jsonRequest({ file_ref: REF }), f.deps)).status).toBe(403);
    expect(f.records.create).not.toHaveBeenCalled();
    expect(f.records.filter).not.toHaveBeenCalled();
    expect(f.core.UploadPrivateFile).not.toHaveBeenCalled();
    expect(f.core.ExtractDataFromUploadedFile).not.toHaveBeenCalled();
  });

  it('retains an uploaded URI but denies activation when deletion begins during storage', async () => {
    const f = fixture();
    f.core.UploadPrivateFile.mockImplementation(async () => {
      f.client.asServiceRole.entities.FileDeletionRequest.filter.mockResolvedValue([{ id: 'request-a', subject_user_id: USER.id, status: 'requested' }]);
      return { file_uri: URI };
    });
    expect((await handlePrivateAttachment(uploadRequest(), f.deps)).status).toBe(403);
    expect(f.records.update).toHaveBeenCalledWith(ID, expect.objectContaining({ file_uri: URI, status: 'uploading' }));
    expect(f.records.update).toHaveBeenCalledWith(ID, { status: 'deletion_pending' });
    expect(f.records.update).not.toHaveBeenCalledWith(ID, { status: 'active' });
  });

  it('denies anonymous requests before reading files or accessing storage', async () => {
    const f = fixture(null);
    for (const request of [uploadRequest(), resolveRequest()]) {
      expect((await handlePrivateAttachment(request, f.deps)).status).toBe(401);
    }
    expect(f.records.create).not.toHaveBeenCalled();
    expect(f.records.filter).not.toHaveBeenCalled();
    expect(f.core.UploadPrivateFile).not.toHaveBeenCalled();
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it('stores only a private object and assigns ownership from the authenticated account', async () => {
    const f = fixture();
    const response = await handlePrivateAttachment(uploadRequest(), f.deps);
    expect(response.status).toBe(200);
    expect(f.records.create).toHaveBeenCalledWith(expect.objectContaining({ owner_user_id: USER.id, owner_email: USER.email, status: 'uploading', size_bytes: 4 }));
    expect(f.records.update).toHaveBeenCalledWith(ID, expect.objectContaining({ file_uri: URI, status: 'uploading', encryption_version: 1 }));
    expect(f.records.update).toHaveBeenCalledWith(ID, { status: 'active' });
    expect(f.core.UploadPrivateFile).toHaveBeenCalledTimes(1);
    expect(f.core.UploadFile).not.toHaveBeenCalled();
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
    const data = await response.json();
    expect(data).toMatchObject({ file_ref: REF, expires_in: 300 });
    expect(data).not.toHaveProperty('file_uri');
    expect(data.file_url).toContain('/api/private-attachments/');
    expect(new URL(data.file_url).pathname).toMatch(/\/attachment\.pdf$/);
    expect(JSON.stringify(data)).not.toMatch(/encryption_key|signing_key|storage/);
    const stored = f.core.UploadPrivateFile.mock.calls[0][0].file;
    expect(stored.type).toBe('application/octet-stream');
    expect(stored.name).toMatch(/\.bin$/);
    expect(stored.size).toBe(20);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('signs an owned reference and ignores caller-supplied storage URI and owner fields', async () => {
    const f = fixture();
    const response = await handlePrivateAttachment(resolveRequest({ file_uri: 'private/other-user/secret.pdf', owner_user_id: 'other-user' }), f.deps);
    expect(response.status).toBe(200);
    expect(f.records.filter).toHaveBeenCalledWith({ id: ID, owner_user_id: USER.id, status: 'active' }, '-created_date', 1);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each(['private/app/user/test.png', 'mp/private/app/user/test.png'])('uploads and reopens the provider private namespace %s', async (uri) => {
    const f = fixture();
    f.core.UploadPrivateFile.mockResolvedValue({ file_uri: uri });
    expect((await handlePrivateAttachment(uploadRequest(), f.deps)).status).toBe(200);
    expect(f.records.update).toHaveBeenCalledWith(ID, expect.objectContaining({ file_uri: uri, status: 'uploading', encryption_version: 1 }));
    expect(f.records.update).toHaveBeenCalledWith(ID, { status: 'active' });
    f.records.filter.mockResolvedValue([{ ...f.record, file_uri: uri }]);
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(200);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each(['public/app/test.png', 'mp/public/app/test.png', 'https://files.example.test/public.png'])('rejects the non-private provider result %s', async (uri) => {
    const f = fixture();
    f.core.UploadPrivateFile.mockResolvedValue({ file_uri: uri });
    expect((await handlePrivateAttachment(uploadRequest(), f.deps)).status).toBe(503);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each(['user', 'admin'])('denies another owner even when the caller is %s and the provider ignores its filter', async (role) => {
    const f = fixture({ id: 'user-b', email: 'b@example.test', role });
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(404);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each(['uploading', 'deletion_pending'])('denies an attachment in %s state', async (status) => {
    const f = fixture(); f.record.status = status;
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(404);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it('denies a missing or mismatched record', async () => {
    const f = fixture(); f.records.filter.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...f.record, id: 'b12345678901234567890123' }]);
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(404);
    expect((await handlePrivateAttachment(resolveRequest(), f.deps)).status).toBe(404);
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it.each([URI, SIGNED_URL, '../file', '', null])('rejects a raw storage value or invalid reference: %s', async (file_ref) => {
    const f = fixture();
    expect((await handlePrivateAttachment(resolveRequest({ file_ref }), f.deps)).status).toBe(400);
    expect(f.records.filter).not.toHaveBeenCalled();
  });
  it.each([[0, 'application/pdf', 400], [MAX_FILE_BYTES + 1, 'application/pdf', 413], [10, 'text/html', 415]])('rejects size %s / MIME %s before storage', async (size, type, expected) => {
    const f = fixture();
    expect((await handlePrivateAttachment(uploadRequest({ size, type }), f.deps)).status).toBe(expected);
    expect(f.core.UploadPrivateFile).not.toHaveBeenCalled();
    expect(f.records.create).not.toHaveBeenCalled();
  });
  it('bounds actual request bytes even without Content-Length', async () => {
    const f = fixture();
    const request = new Request('https://app.example.test', { method: 'POST', body: new Uint8Array(MAX_FILE_BYTES * 2) });
    expect(request.headers.get('content-length')).toBeNull();
    expect((await handlePrivateAttachment(request, f.deps)).status).toBe(413);
    expect(f.records.create).not.toHaveBeenCalled();
  });
  it('preserves legacy base64 upload transport but returns a private reference', async () => {
    const f = fixture();
    const response = await handlePrivateAttachment(jsonRequest({ file_base64: btoa('test'), file_name: 'note.txt', file_type: 'text/plain' }), f.deps);
    expect(response.status).toBe(200);
    expect((await response.json()).file_ref).toBe(REF);
    expect(f.core.UploadFile).not.toHaveBeenCalled();
  });
  it('fails closed on storage or metadata failure, without public fallback or sensitive error content', async () => {
    const f = fixture(); f.core.UploadPrivateFile.mockRejectedValue(new Error(`secret ${URI} ${SIGNED_URL}`));
    const response = await handlePrivateAttachment(uploadRequest(), f.deps);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/secret|private\/|signature/);
    expect(f.core.UploadFile).not.toHaveBeenCalled();
    expect(f.core.CreateFileSignedUrl).not.toHaveBeenCalled();
    const g = fixture(); g.records.update.mockRejectedValue(new Error('storage failure'));
    expect((await handlePrivateAttachment(uploadRequest(), g.deps)).status).toBe(503);
    expect(g.records.update).toHaveBeenCalledTimes(2);
    expect(g.core.CreateFileSignedUrl).not.toHaveBeenCalled();
  });
  it('retries a transient metadata failure before issuing access', async () => {
    const f = fixture(); f.records.update.mockRejectedValueOnce(new Error('transient'));
    expect((await handlePrivateAttachment(uploadRequest(), f.deps)).status).toBe(200);
    expect(f.records.update).toHaveBeenCalledTimes(3);
    expect(f.records.update).toHaveBeenNthCalledWith(3, ID, { status: 'active' });
  });
  it('does not expose provider storage paths through public, ordinary or admin entity access', () => {
    const schema = JSON.parse(readFileSync(new URL('../../base44/entities/PrivateAttachment.jsonc', import.meta.url), 'utf8'));
    // Base44 does not enforce boolean false for create/update. Mutually
    // exclusive role predicates deny every client; service-role code bypasses RLS.
    const denyClientWrite = { $and: [{ user_condition: { role: 'admin' } }, { user_condition: { role: 'user' } }] };
    expect(schema.rls).toEqual({ create: denyClientWrite, read: false, update: denyClientWrite, delete: false });
  });
});

describe('private attachment consumers', () => {
  it('forwards a real file to the authenticated function, without a public upload fallback', async () => {
    const f = fixture(); const file = new File(['test'], 'note.txt', { type: 'text/plain' });
    expect((await uploadPrivateAttachment(f.client, file)).file_ref).toBe(REF);
    expect(f.client.functions.invoke).toHaveBeenCalledWith('uploadAttachment', { file });
    f.client.functions.invoke.mockRejectedValue(new Error('unavailable'));
    await expect(uploadPrivateAttachment(f.client, file)).rejects.toThrow('unavailable');
    expect(f.core.UploadFile).not.toHaveBeenCalled();
  });
  it('rejects a resolution response for a different reference', async () => {
    const f = fixture(); f.client.functions.invoke.mockResolvedValue({ data: { file_ref: 'mp-private:b12345678901234567890123', file_url: SIGNED_URL } });
    await expect(resolvePrivateAttachment(f.client, REF)).rejects.toThrow('mismatch');
  });
  it('preserves the stable attachment reference through chat sanitization and reload', () => {
    const attachment = { type: 'pdf', url: REF, name: 'worksheet.pdf' };
    const message = { id: 'message-a', role: 'user', content: `My example\n${serializeAttachmentMetadataMarker(attachment)}` };
    expect(sanitizeConversationMessages([message])[0].metadata.attachment).toEqual(attachment);
  });
  it('extracts only after owner-checked resolution with the caller token', async () => {
    const f = fixture();
    const response = await handleExtractPdfText(jsonRequest({ file_ref: REF, file_url: 'https://attacker.example/public/user-a/doc.pdf' }), f.deps);
    expect(response.status).toBe(200);
    expect(f.client.functions.invoke).toHaveBeenCalledWith('uploadAttachment', { action: 'resolve', file_ref: REF });
    expect(f.core.ExtractDataFromUploadedFile).toHaveBeenCalledWith(expect.objectContaining({ file_url: SIGNED_URL }));
    expect(await response.json()).toMatchObject({ success: true, text: 'Example text' });
  });
  it('never extracts a foreign file or a supplied public URL', async () => {
    const f = fixture(); f.client.functions.invoke.mockImplementation(async name => { if (name === 'accountAccess') return accountAccessResult(USER); throw { response: { status: 404 } }; });
    expect((await handleExtractPdfText(jsonRequest({ file_ref: REF }), f.deps)).status).toBe(404);
    expect((await handleExtractPdfText(jsonRequest({ file_url: 'https://attacker.example/public/user-a/doc.pdf' }), f.deps)).status).toBe(400);
    expect(f.core.ExtractDataFromUploadedFile).not.toHaveBeenCalled();
  });
  it('does not retain a public upload path in personal-file consumers', () => {
    for (const path of ['src/pages/Chat.jsx', 'src/components/journal/ThoughtRecordForm.jsx', 'base44/functions/generateTherapeuticPdf/entry.ts']) {
      const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
      expect(source).not.toContain('Core.UploadFile(');
    }
  });
});
