import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { handleAccountAccess, AGE_POLICY_VERSION } from '../../base44/functions/accountAccess/handler.js';
import { requireAccountAccess } from '../../base44/functions/accountAccess/guard.js';
import { createAdminVerifier } from '../../server/hebrew-pilot.mjs';

const A = { id: 'adult-a', email: 'a@example.test', role: 'user' };
const B = { id: 'adult-b', email: 'b@example.test', role: 'user' };
const ADMIN = { id: 'admin', email: 'admin@example.test', role: 'admin' };
const date = '2026-11-11T10:00:00.000Z';
const record = (user, extra = {}) => ({ id: `record-${user.id}`, subject_user_id: user.id, adult_status: 'confirmed', policy_version: AGE_POLICY_VERSION, attested_at: date, attestation_language: 'en', forms_review_allowed: false, ...extra });
const status = (user, extra = {}) => ({ schema_version: 1, user_id: user.id, policy_version: AGE_POLICY_VERSION, adult_status: 'confirmed', eligible: true, forms_review_allowed: false, ...extra });
function fixture(user = A, initial = []) {
  const rows = structuredClone(initial);
  const entity = {
    filter: vi.fn(async query => rows.filter(row => row.subject_user_id === query.subject_user_id).slice(0, 2)),
    create: vi.fn(async values => { const row = { id: `row-${rows.length}`, ...values }; rows.push(row); return row; }),
    update: vi.fn(async (id, values) => Object.assign(rows.find(row => row.id === id), values)),
  };
  const accounts = structuredClone([A, B, ADMIN]);
  const users = { filter: vi.fn(async ({ email }) => accounts.filter(candidate => candidate.email === email)),
    get: vi.fn(async id => accounts.find(candidate => candidate.id === id)),
    update: vi.fn(async (id, values) => Object.assign(accounts.find(candidate => candidate.id === id), values)) };
  const client = { auth: { me: vi.fn(async () => user) }, asServiceRole: { entities: { AccountAccess: entity, User: users } } };
  const request = (input = { action: 'status' }, method = 'POST') => new Request('https://app.test/accountAccess', {
    method, ...(method === 'POST' ? { body: typeof input === 'string' ? input : JSON.stringify(input) } : {}),
  });
  const call = (input, method) => handleAccountAccess(request(input, method), { createClientFromRequest: () => client, now: () => date });
  return { rows, entity, users, client, call, request };
}
const attest = (adult = true) => ({ action: 'attest', adult, policy_version: AGE_POLICY_VERSION, language: 'he' });

describe('account-bound age and review permissions', () => {
  it('denies anonymous requests before accessing eligibility or reading personal input', async () => {
    const f = fixture(null);
    expect((await f.call(attest())).status).toBe(401);
    expect(f.entity.filter).not.toHaveBeenCalled();
    expect(f.entity.create).not.toHaveBeenCalled();
  });
  it('defaults an existing OAuth/email account to pending, with no forms grant', async () => {
    const f = fixture({ ...A, age_verified: true, forms_review_allowed: true });
    const response = await f.call();
    expect(await response.json()).toEqual(status(A, { adult_status: 'pending', eligible: false }));
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(f.entity.create).not.toHaveBeenCalled();
  });
  it('binds the declaration to auth.me and the server clock, and persists across sessions', async () => {
    const f = fixture();
    expect(await (await f.call(attest())).json()).toEqual(status(A));
    expect(f.rows[0]).toMatchObject({ subject_user_id: A.id, attested_at: date, attestation_language: 'he', forms_review_allowed: false });
    expect(f.rows[0]).not.toHaveProperty('email');
    expect(await (await f.call()).json()).toEqual(status(A));
    await f.call(attest());
    expect(f.entity.create).toHaveBeenCalledTimes(1);
    expect(f.entity.update).not.toHaveBeenCalled();
  });
  it.each(['user_id', 'subject_user_id', 'role', 'forms_review_allowed', 'attested_at'])('rejects a forged %s rather than trusting it', async (field) => {
    const f = fixture();
    expect((await f.call({ ...attest(), [field]: 'forged' })).status).toBe(400);
    expect(f.entity.create).not.toHaveBeenCalled();
  });
  it.each([{ adult: 'true' }, { policy_version: 'old' }, { language: 'unknown' }])('rejects malformed or stale declarations %j', async (extra) => {
    expect((await fixture().call({ ...attest(), ...extra })).status).toBe(400);
  });
  it('keeps an under-18 declaration restricted across sessions and rejects self-reset', async () => {
    const f = fixture();
    const expected = status(A, { adult_status: 'declined', eligible: false });
    expect(await (await f.call(attest(false))).json()).toEqual(expected);
    expect((await f.call(attest(true))).status).toBe(403);
    expect(await (await f.call()).json()).toEqual(expected);
    expect(f.entity.update).not.toHaveBeenCalled();
  });
  it('does not transfer account A age confirmation or grant to account B', async () => {
    const f = fixture(B, [record(A, { forms_review_allowed: true })]);
    expect(await (await f.call()).json()).toEqual(status(B, { adult_status: 'pending', eligible: false }));
  });
  it('fails closed on duplicate or misfiltered records and database errors', async () => {
    const f = fixture(A, [record(A), record(A, { id: 'duplicate' })]);
    expect((await f.call()).status).toBe(503);
    f.entity.filter.mockResolvedValue([record(B)]);
    expect((await f.call()).status).toBe(503);
    f.entity.filter.mockRejectedValue(new Error('private database data'));
    const response = await f.call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ACCESS_UNAVAILABLE' });
  });
  it('fails closed if concurrent first declarations produce duplicates', async () => {
    const f = fixture();
    f.entity.create.mockImplementation(async values => {
      f.rows.push({ id: 'first', ...values }, { id: 'second', ...values });
    });
    expect((await f.call(attest())).status).toBe(503);
    expect((await f.call()).status).toBe(503);
  });
  it.each(['lookup', 'grant_forms', 'revoke_forms'])('denies ordinary users the %s operation', async action => {
    const f = fixture(A, [record(A)]);
    expect((await f.call({ action, email: B.email, ...(action === 'lookup' ? {} : { user_id: B.id }) })).status).toBe(403);
    expect(f.users.filter).not.toHaveBeenCalled();
  });
  it('requires the administrator to attest too', async () => {
    expect((await fixture(ADMIN).call({ action: 'lookup', email: A.email })).status).toBe(403);
  });
  it('grants and revokes only forms review, without changing the target platform role', async () => {
    const f = fixture(ADMIN, [record(ADMIN), record(A), record(B)]);
    expect((await (await f.call({ action: 'lookup', email: A.email })).json()).forms_review_allowed).toBe(false);
    expect((await (await f.call({ action: 'grant_forms', email: A.email, user_id: A.id })).json()).forms_review_allowed).toBe(true);
    expect(f.rows.find(row => row.subject_user_id === A.id)).toMatchObject({ forms_updated_at: date, forms_updated_by: ADMIN.id });
    expect(f.rows.find(row => row.subject_user_id === B.id).forms_review_allowed).toBe(false);
    f.client.auth.me.mockResolvedValue(A);
    expect((await (await f.call()).json()).forms_review_allowed).toBe(true);
    f.client.auth.me.mockResolvedValue(ADMIN);
    expect((await (await f.call({ action: 'revoke_forms', email: A.email, user_id: A.id })).json()).forms_review_allowed).toBe(false);
    f.client.auth.me.mockResolvedValue(A);
    expect((await (await f.call()).json()).forms_review_allowed).toBe(false);
    expect(A.role).toBe('user');
  });
  it('prevents grants to an unconfirmed account and a different identity than the one reviewed', async () => {
    const f = fixture(ADMIN, [record(ADMIN)]);
    expect((await f.call({ action: 'grant_forms', email: A.email, user_id: A.id })).status).toBe(409);
    expect((await f.call({ action: 'grant_forms', email: A.email, user_id: B.id })).status).toBe(409);
    expect(f.entity.update).not.toHaveBeenCalled();
  });
  it('does not expose users to unbounded listing and validates exact identity results', async () => {
    const f = fixture(ADMIN, [record(ADMIN)]);
    expect((await f.call({ action: 'lookup', email: '' })).status).toBe(400);
    f.users.filter.mockResolvedValue([B]);
    expect((await f.call({ action: 'lookup', email: A.email })).status).toBe(404);
    f.users.filter.mockResolvedValue([A, A]);
    expect((await f.call({ action: 'lookup', email: A.email })).status).toBe(404);
  });
  it('bounds requests and rejects invalid methods/JSON', async () => {
    const f = fixture();
    expect((await f.call({}, 'GET')).status).toBe(405);
    expect((await f.call('{')).status).toBe(400);
    expect((await f.call('x'.repeat(4097))).status).toBe(413);
  });
  it('uses service-only predicates instead of provider-unsupported create/update false', () => {
    const schema = JSON.parse(readFileSync('base44/entities/AccountAccess.jsonc', 'utf8'));
    for (const operation of ['create', 'read', 'update', 'delete']) {
      expect(schema.rls[operation]).toEqual({ $and: [{ user_condition: { role: 'admin' } }, { user_condition: { role: 'user' } }] });
    }
  });
});

describe('independent server access guards', () => {
  it('denies missing age, wrong identity/version and missing explicit forms grant', async () => {
    const invoke = vi.fn(); const client = { functions: { invoke } };
    for (const [access, expectedStatus] of [
      [status(A, { eligible: false, adult_status: 'pending' }), 403],
      [status(B), 503], [status(A, { policy_version: 'old' }), 503],
      [status(A), 403],
    ]) {
      invoke.mockResolvedValue({ data: access });
      await expect(requireAccountAccess(client, A, { forms: true })).rejects.toMatchObject({ status: expectedStatus });
    }
    invoke.mockResolvedValue({ data: status(A, { forms_review_allowed: true }) });
    await expect(requireAccountAccess(client, A, { forms: true })).resolves.toMatchObject({ user_id: A.id });
    expect(invoke).toHaveBeenLastCalledWith('accountAccess', { action: 'status' });
    invoke.mockRejectedValue(new Error('network'));
    await expect(requireAccountAccess(client, A)).rejects.toMatchObject({ status: 503 });
  });
  it('protects direct Railway requests and rechecks revocation on the next request', async () => {
    let allowed = true;
    const fetchImpl = vi.fn(async url => url.endsWith('/User/me') ? Response.json(A) : Response.json(status(A, { forms_review_allowed: allowed })));
    const verify = createAdminVerifier('69504b725a07f5aa75aeaf7d', fetchImpl);
    expect(await verify('synthetic-token')).toEqual({ status: 200 });
    allowed = false;
    expect(await verify('synthetic-token')).toEqual({ status: 403 });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
  it('keeps every portable function copy identical and invokes it after identity resolution', () => {
    const canonical = readFileSync('base44/functions/accountAccess/guard.js', 'utf8');
    for (const name of ['uploadAttachment', 'extractPdfText', 'generateTherapeuticPdf', 'transcribeMobileAudio', 'getHebrewFormsPilot']) {
      expect(readFileSync(`base44/functions/${name}/accountAccessGuard.js`, 'utf8')).toBe(canonical);
      const path = ['generateTherapeuticPdf', 'transcribeMobileAudio'].includes(name) ? 'entry.ts' : 'handler.js';
      const source = readFileSync(`base44/functions/${name}/${path}`, 'utf8');
      expect(source.indexOf('await requireAccountAccess')).toBeGreaterThan(source.indexOf('await ', source.indexOf('try {')));
      expect(source).toContain("from './accountAccessGuard.js'");
    }
    for (const file of ['src/pages/Chat.jsx', 'src/components/ai/DraggableAiCompanion.jsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('age_verified');
      expect(source).not.toContain('navigator.webdriver');
    }
  });
});

describe('locked record-access projection', () => {
  it('initializes an existing confirmed account without another age declaration', async () => {
    const f = fixture(A, [record(A)]);
    expect((await f.call()).status).toBe(200);
    expect(f.users.update).toHaveBeenCalledWith(A.id, { mp_adult_policy: AGE_POLICY_VERSION, mp_account_deletion_pending: false });
  });
  it('revokes stale grants when the declaration is missing or declined', async () => {
    for (const records of [[], [record(A, { adult_status: 'declined' })]]) {
      const f = fixture(A, records); const user = await f.users.get(A.id);
      Object.assign(user, { mp_adult_policy: AGE_POLICY_VERSION, mp_account_deletion_pending: false });
      expect((await (await f.call()).json()).eligible).toBe(false);
      expect(user.mp_adult_policy).toBe('');
    }
  });
  it('never restores record access while account deletion is pending', async () => {
    const f = fixture(A, [record(A)]); const user = await f.users.get(A.id);
    Object.assign(user, { mp_adult_policy: '', mp_account_deletion_pending: true });
    expect((await (await f.call()).json()).eligible).toBe(false);
    expect(f.users.update).not.toHaveBeenCalled();
  });
  it('fails entry closed when the server cannot persist the projection', async () => {
    const f = fixture(A, [record(A)]);
    f.users.update.mockRejectedValue(new Error('private details'));
    const result = await f.call(); expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: 'ACCESS_UNAVAILABLE' });
  });
});
