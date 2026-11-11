import { requestFileDeletion } from '../../base44/functions/deleteMyAccount/fileDeletionQueue.js';
import { checkLegacyReferences } from '../../base44/functions/deleteMyAccount/legacyFiles.js';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function handlerFor(name, client) {
  const source = readFileSync(`base44/functions/${name}/entry.ts`, 'utf8').replace(/^import .*;\n/gm, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  let handler;
  new Function('Deno', 'createClientFromRequest', 'requestFileDeletion', 'checkLegacyReferences', js)({ serve: fn => { handler = fn; } }, () => client, requestFileDeletion, checkLegacyReferences);
  return handler;
}
function setup(rows = [{ id: 'own-row', subject_user_id: 'adult-a', adult_status: 'confirmed', policy_version: '2026-11-11', forms_review_allowed: true, forms_updated_by: 'private-admin-id' }]) {
  const empty = { filter: vi.fn(async () => []), delete: vi.fn() };
  const account = { filter: vi.fn(async () => rows), delete: vi.fn(async () => {}) };
  const user = { delete: vi.fn(async () => {}), update: vi.fn(async () => ({})) };
  const client = {
    auth: { me: async () => ({ id: 'adult-a', email: 'a@example.test', role: 'user' }) },
    agents: { getConversations: async () => [] },
    asServiceRole: { entities: new Proxy({}, { get: (_target, name) => name === 'AccountAccess' ? account : name === 'User' ? user : empty }) },
  };
  return { account, user, client };
}
const request = () => new Request('https://app.test/function', { method: 'POST', body: '{}' });

describe('age/permission records in existing account lifecycle handlers', () => {
  it('exports self-owned declarations and grants without leaking grantor or service metadata', async () => {
    const f = setup();
    const response = await handlerFor('exportMyData', f.client)(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.entities.AccountAccess).toEqual([{ adult_status: 'confirmed', policy_version: '2026-11-11', forms_review_allowed: true }]);
    expect(f.account.filter).toHaveBeenCalledWith({ subject_user_id: 'adult-a' }, 'created_date', 500, 0);
    expect(body.integrity.complete).toBe(true);
    expect(JSON.stringify(body)).not.toContain('private-admin-id');
  });
  it('does not export another user if a provider ignores the filter', async () => {
    const f = setup([{ id: 'foreign', subject_user_id: 'adult-b' }]);
    const body = await (await handlerFor('exportMyData', f.client)(request())).json();
    expect(body.data.entities.AccountAccess).toEqual([]);
    expect(body.integrity.complete).toBe(false);
  });
  it('deletes the service-owned row before the platform account', async () => {
    const f = setup();
    const response = await handlerFor('deleteMyAccount', f.client)(request());
    expect(response.status).toBe(200);
    expect(f.account.filter).toHaveBeenCalledWith({ subject_user_id: 'adult-a' }, 'created_date', 100, 0);
    expect(f.account.delete).toHaveBeenCalledWith('own-row');
    expect(f.account.delete.mock.invocationCallOrder[0]).toBeLessThan(f.user.delete.mock.invocationCallOrder[0]);
  });
  it('stops account deletion if the row is foreign or its removal fails', async () => {
    const f = setup([{ id: 'foreign', subject_user_id: 'adult-b' }]);
    expect((await handlerFor('deleteMyAccount', f.client)(request())).status).toBe(500);
    expect(f.account.delete).not.toHaveBeenCalled();
    expect(f.user.delete).not.toHaveBeenCalled();
    f.account.filter.mockResolvedValue([{ id: 'own', subject_user_id: 'adult-a' }]);
    f.account.delete.mockRejectedValue(new Error('storage unavailable'));
    expect((await handlerFor('deleteMyAccount', f.client)(request())).status).toBe(500);
    expect(f.user.delete).not.toHaveBeenCalled();
  });
});

describe('account deletion retains support-assisted storage evidence', () => {
  it('records current and superseded file paths before removing the account, without deleting attachment rows', async () => {
    const f = setup();
    const files = [{ id: 'file-a', owner_user_id: 'adult-a', status: 'active', file_uri: 'private/synthetic/current.bin', superseded_file_uri: 'private/synthetic/old.pdf' }];
    const queue = [];
    const attachments = { filter: vi.fn(async () => files), update: vi.fn(async (id, data) => Object.assign(files.find(row => row.id === id), data)), delete: vi.fn() };
    const requests = { filter: vi.fn(async () => queue), create: vi.fn(async data => { const row = { id: 'request-a', ...data }; queue.push(row); return row; }), delete: vi.fn() };
    f.client.asServiceRole.entities = new Proxy(f.client.asServiceRole.entities, { get: (target, name) => name === 'PrivateAttachment' ? attachments : name === 'FileDeletionRequest' ? requests : target[name] });
    const response = await handlerFor('deleteMyAccount', f.client)(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accountDeleted: true, fileDeletionPending: true, fileDeletionRequestId: 'request-a', providerConversationErasure: 'unconfirmed' });
    expect(queue[0].file_uris).toEqual(['private/synthetic/current.bin', 'private/synthetic/old.pdf']);
    expect(requests.create.mock.invocationCallOrder[0]).toBeLessThan(f.user.delete.mock.invocationCallOrder[0]);
    expect(f.user.update).toHaveBeenCalledWith('adult-a', { mp_account_deletion_pending: true, mp_adult_policy: '' });
    expect(attachments.delete).not.toHaveBeenCalled(); expect(requests.delete).not.toHaveBeenCalled();
    expect(files[0].file_uri).toBe('private/synthetic/current.bin');
  });
  it('does not discard older unmanaged upload references or start account removal', async () => {
    const f = setup();
    const legacy = { filter: vi.fn(async () => [{ id: 'goal-a', created_by: 'a@example.test', attachments: [{ file_url: 'https://old.example.test/synthetic.pdf' }] }]), delete: vi.fn() };
    f.client.asServiceRole.entities = new Proxy(f.client.asServiceRole.entities, { get: (target, name) => name === 'Goal' ? legacy : target[name] });
    expect((await handlerFor('deleteMyAccount', f.client)(request())).status).toBe(500);
    expect(legacy.delete).not.toHaveBeenCalled(); expect(f.user.update).not.toHaveBeenCalled(); expect(f.user.delete).not.toHaveBeenCalled();
  });
});
