import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppServer } from '../../server/index.mjs';
import { createAdminVerifier, loadPilot } from '../../server/hebrew-pilot.mjs';
import { ALL_FORMS } from '../../src/data/therapeuticForms/index.js';

describe('Hebrew review pilot HTTP boundary', () => {
  let server, origin, directory, pilot;
  let role = 'admin';
  beforeAll(async () => {
    pilot = await loadPilot();
    directory = await mkdtemp(join(tmpdir(), 'mindful-pilot-'));
    await writeFile(join(directory, 'index.html'), '<html>SPA</html>');
    server = await createAppServer({ pilot, distRoot: directory, verifyAdmin: async (token) => ({ status: token === 'test-session' ? role === 'admin' ? 200 : 403 : 401 }) });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const request = (path, init = {}) => fetch(`${origin}${path}`, init);
  const auth = { Authorization: 'Bearer test-session' };

  it('has exactly 154 original IDs, 18 shared files and no public/AI registrations', () => {
    expect(pilot.catalog.forms).toHaveLength(154);
    expect(pilot.files.size).toBe(289);
    expect(pilot.catalog.forms.filter((f) => f.age === 'ALL')).toHaveLength(18);
    for (const age of ['CH', 'TE', 'AD', 'OA']) expect(pilot.catalog.forms.filter((f) => f.age === age)).toHaveLength(34);
    for (const form of pilot.p4bCatalog.forms) {
      expect(ALL_FORMS.find((entry) => entry.id === form.id)).toBeUndefined();
      expect(form.status).toContain('לא להפצה');
    }
  });
  it('rejects missing, query-string, forged-role and invalid credentials for both metadata and files', async () => {
    for (const path of ['/catalog', '/catalog-mood-01', '/catalog-p4-01', '/catalog-p4-02', '/catalog-p3-01', `/files/${pilot.catalog.forms[0].id}`, '/files/MP-MOOD-01-W-CH-HE', '/files/MP-SELF-01-W-CH-HE']) {
      for (const init of [{}, { headers: { 'X-User-Role': 'admin' } }, { headers: { Authorization: 'Bearer invalid' } }]) {
        expect((await request(`/api/hebrew-forms-pilot${path}?token=test-session&role=admin`, init)).status).toBe(401);
      }
    }
  });
  it('denies a normal/premium user and rechecks an existing session after admin removal', async () => {
    expect((await request('/api/hebrew-forms-pilot/catalog', { headers: auth })).status).toBe(200);
    role = 'premium';
    try {
      expect((await request('/api/hebrew-forms-pilot/catalog-p4-02', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/files/MP-SHAME-01-W-CH-HE', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/catalog-p4-01', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/files/MP-SLEEP-01-W-CH-HE', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/catalog', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/catalog-mood-01', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/catalog-p3-01', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/files/MP-SELF-01-W-CH-HE', { headers: auth })).status).toBe(403);
      expect((await request('/api/hebrew-forms-pilot/files/MP-MOOD-01-W-CH-HE', { headers: auth })).status).toBe(403);
      expect((await request(`/api/hebrew-forms-pilot/files/${pilot.catalog.forms[0].id}`, { headers: auth })).status).toBe(403);
    } finally { role = 'admin'; }
  });
  it('serves every source PDF byte-for-byte only after authorization', async () => {
    for (const form of pilot.p4bCatalog.forms) {
      const response = await request(`/api/hebrew-forms-pilot/files/${form.id}`, { headers: auth });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toBe(`inline; filename="${form.id}.pdf"`);
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(bytes.length).toBe(form.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
    }
  });
  it('serves each pinned catalog independently for clients deployed at different times', async () => {
    for (const [path, catalog] of Object.entries(pilot.catalogs)) {
      const response = await request(`/api/hebrew-forms-pilot/${path}`, { headers: auth });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(await response.json()).toEqual(catalog);
      const head = await request(`/api/hebrew-forms-pilot/${path}`, { method: 'HEAD', headers: auth });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    }
  });
  it('distinguishes download and HEAD, and does not allow writes or arbitrary IDs', async () => {
    const path = `/api/hebrew-forms-pilot/files/${pilot.catalog.forms[0].id}`;
    const download = await request(`${path}?download=1`, { headers: auth });
    expect(download.headers.get('content-disposition')).toMatch(/^attachment;/);
    const head = await request(path, { method: 'HEAD', headers: auth });
    expect(head.status).toBe(200); expect(await head.text()).toBe('');
    expect((await request(path, { method: 'POST', headers: auth })).status).toBe(405);
    expect((await request('/api/hebrew-forms-pilot/files/MP-UNKNOWN-HE', { headers: auth })).status).toBe(404);
    expect((await request('/api/hebrew-forms-pilot/files/%2e%2e%2fprivate', { headers: auth })).status).toBe(404);
  });
  it('keeps private/source paths inaccessible and preserves SPA routes and security headers', async () => {
    for (const path of [`/server/private/forms/${pilot.catalog.forms[0].id}.pdf`, '/server/private/forms/', '/server/private/hebrew-pilot-p4-01-catalog.json', '/content/hebrew-forms/p4-01/forms/MP-SLEEP-01-W-CH-HE.html', '/server/private/hebrew-pilot-p4-02-catalog.json', '/content/hebrew-forms/p4-02/forms/MP-SHAME-01-W-CH-HE.html', '/server/private/hebrew-pilot-catalog.json', '/server/private/hebrew-pilot-mood-catalog.json', '/content/hebrew-forms/mood-01/forms/MP-MOOD-01-W-CH-HE.html', '/src/pages/TherapeuticForms.jsx', '/api/unknown']) {
      expect((await request(path)).status).toBe(404);
    }
    const response = await request('/Tools');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('SPA');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });
});

describe('Base44 administrator verification', () => {
  const appId = '69504b725a07f5aa75aeaf7d';
  it('verifies against the fixed app and forwards only bearer authentication', async () => {
    let calledUrl, calledOptions;
    const verify = createAdminVerifier(appId, async (url, options) => {
      calledUrl = url; calledOptions = options;
      return Response.json({ id: 'fixture-admin', role: 'admin' });
    });
    expect(await verify('fixture-token')).toEqual({ status: 200 });
    expect(calledUrl).toBe(`https://base44.app/api/apps/${appId}/entities/User/me`);
    expect(calledOptions.headers.Authorization).toBe('Bearer fixture-token');
    expect(calledOptions.redirect).toBe('error');
  });
  it('fails closed on invalid config, missing ID, premium, expired auth, upstream errors and timeout', async () => {
    expect(await createAdminVerifier('bad', () => { throw new Error('not called'); })('token')).toEqual({ status: 503 });
    for (const [response, status] of [[Response.json({ role: 'admin' }), 403], [Response.json({ id: 'user', role: 'premium' }), 403], [new Response(null, { status: 401 }), 401], [new Response(null, { status: 403 }), 401], [new Response(null, { status: 500 }), 503]]) {
      expect(await createAdminVerifier(appId, async () => response)('token')).toEqual({ status });
    }
    expect(await createAdminVerifier(appId, async () => { throw new Error('timeout'); })('token')).toEqual({ status: 503 });
  });
});
