import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createAppServer } from '../../server/index.mjs';
import { loadPilot } from '../../server/hebrew-pilot.mjs';
import { handleHebrewFormsPilot } from '../../base44/functions/getHebrewFormsPilot/handler.js';

const appId = '69504b725a07f5aa75aeaf7d';
const user = { id: 'fixture-admin', role: 'admin' };
const request = (body = { path: 'catalog' }, headers = {}, method = 'POST') => new Request('https://app.example/functions/getHebrewFormsPilot', {
  method, headers: { 'Content-Type': 'application/json', 'Base44-App-Id': appId, Authorization: 'Bearer fixture-session', ...headers },
  ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
});
const client = (me = user) => () => ({ auth: { me: async () => me } });

describe('Base44 pilot proxy authorization and transport', () => {
  it('reports the failing stage without credentials, identities or raw exception details', async () => {
    const privateError = Object.assign(new TypeError('secret token and user email'), { status: 502, config: { headers: { Authorization: 'Bearer never-log' } } });
    for (const [stage, dependencies] of [
      ['client', { createClientFromRequest: () => { throw privateError; } }],
      ['auth', { createClientFromRequest: () => ({ auth: { me: async () => { throw privateError; } } }) }],
      ['upstream', { createClientFromRequest: client(), fetchImpl: async () => { throw privateError; } }],
      ['read', { createClientFromRequest: client(), fetchImpl: async () => new Response(new ReadableStream({ start(controller) { controller.error(privateError); } }), { headers: { 'Content-Type': 'application/json' } }) }],
      ['catalog', { createClientFromRequest: client(), fetchImpl: async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }) }],
    ]) {
      const logFailure = vi.fn();
      const response = await handleHebrewFormsPilot(request(), { ...dependencies, logFailure });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
      expect(logFailure).toHaveBeenCalledTimes(1);
      expect(logFailure).toHaveBeenCalledWith({ stage, errorType: stage === 'catalog' ? 'SyntaxError' : 'TypeError', ...(stage === 'auth' ? { upstreamStatus: 502 } : {}) });
    }
    const logFailure = vi.fn();
    await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl: async () => new Response('private upstream body', { status: 504 }), logFailure });
    expect(logFailure).toHaveBeenCalledTimes(1);
    expect(logFailure).toHaveBeenCalledWith({ stage: 'upstream', errorType: 'other', upstreamStatus: 504 });
    expect((await handleHebrewFormsPilot(request(), { createClientFromRequest: () => { throw privateError; }, logFailure: () => { throw privateError; } })).status).toBe(503);
  });

  it('denies missing auth, other apps, ordinary/premium users and stale administrator roles before fetching assets', async () => {
    const fetchImpl = vi.fn();
    for (const [req, me, status] of [
      [request({}, { Authorization: '' }), user, 401],
      [request({}, { 'Base44-App-Id': 'another-app' }), user, 403],
      [request(), { id: 'regular', role: 'user' }, 403],
      [request(), { id: 'premium', role: 'premium' }, 403],
      [request(), { role: 'admin' }, 403],
    ]) expect((await handleHebrewFormsPilot(req, { createClientFromRequest: client(me), fetchImpl })).status).toBe(status);
    let currentRole = 'admin';
    const dependencies = { createClientFromRequest: () => ({ auth: { me: async () => ({ id: 'same-user', role: currentRole }) } }), fetchImpl };
    currentRole = 'user';
    expect((await handleHebrewFormsPilot(request(), dependencies)).status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('preserves auth errors and fails closed on identity-provider outages', async () => {
    for (const [upstreamStatus, expected] of [[401, 401], [403, 401], [429, 503], [500, 503]]) {
      const fetchImpl = vi.fn();
      const response = await handleHebrewFormsPilot(request(), {
        createClientFromRequest: () => ({ auth: { me: async () => { throw { status: upstreamStatus }; } } }), fetchImpl,
      });
      expect(response.status).toBe(expected);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it('rejects arbitrary destinations, traversal, unknown fields and malformed input', async () => {
    const fetchImpl = vi.fn();
    for (const body of ['{', [], {}, { path: '../private' }, { path: 'files/../../etc/passwd' }, { path: 'https://evil.example' }, { path: 'catalog', url: 'https://evil.example' }, { path: 'catalog', download: 'yes' }]) {
      expect((await handleHebrewFormsPilot(request(body), { createClientFromRequest: client(), fetchImpl })).status).toBe(400);
    }
    expect((await handleHebrewFormsPilot(request(null, {}, 'GET'), { createClientFromRequest: client(), fetchImpl })).status).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('forwards only bearer auth to the fixed private service with redirects disabled', async () => {
    const fetchImpl = vi.fn(async () => new Response('%PDF-fixture', { headers: { 'Content-Type': 'application/pdf' } }));
    const response = await handleHebrewFormsPilot(request({ path: 'files/MP-BASE-B00-ALL-HE', download: true }, { 'Base44-Service-Authorization': 'Bearer never-forward', Cookie: 'never-forward' }), { createClientFromRequest: client(), fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://mindful-path-production-7704.up.railway.app/api/hebrew-forms-pilot/files/MP-BASE-B00-ALL-HE?download=1');
    expect(init.headers).toEqual({ Authorization: 'Bearer fixture-session' });
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Authorization');
    expect(Buffer.from((await response.json()).base64, 'base64').toString()).toBe('%PDF-fixture');
  });

  it('rejects wrong MIME, oversized payloads, invalid catalogs and upstream failures without disclosing their body', async () => {
    const cases = [
      ['catalog', new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), 502],
      ['catalog', Response.json({ language: 'he', forms: [] }), 502],
      ['files/MP-BASE-B00-ALL-HE', new Response('not pdf', { headers: { 'Content-Type': 'application/pdf' } }), 502],
      ['files/MP-BASE-B00-ALL-HE', new Response(new Uint8Array(1024 * 1024 + 1), { headers: { 'Content-Type': 'application/pdf' } }), 503],
      ['catalog', new Response('private error', { status: 401 }), 401],
      ['catalog', new Response('private error', { status: 403 }), 403],
      ['catalog', new Response('private error', { status: 500 }), 503],
    ];
    for (const [path, upstream, expected] of cases) {
      const response = await handleHebrewFormsPilot(request({ path }), { createClientFromRequest: client(), fetchImpl: async () => upstream });
      expect(response.status).toBe(expected);
      expect(await response.text()).not.toContain('private error');
    }
    expect((await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl: async () => { throw new Error('redirect or timeout'); } })).status).toBe(503);
  });
});

describe('Base44 proxy to the real private PDF server', () => {
  let server, origin, pilot, role = 'admin';
  beforeAll(async () => {
    pilot = await loadPilot();
    server = await createAppServer({ pilot, verifyAdmin: async (token) => ({ status: token === 'fixture-session' && role === 'admin' ? 200 : 403 }) });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  const dependencies = () => ({ createClientFromRequest: client(), fetchImpl: (url, init) => fetch(`${origin}${new URL(url).pathname}${new URL(url).search}`, init) });

  it('returns the catalog and all 154 PDFs byte-for-byte through the Base44 transport', async () => {
    const catalog = await (await handleHebrewFormsPilot(request(), dependencies())).json();
    expect(catalog.kind).toBe('catalog');
    expect(catalog.catalog).toEqual(pilot.catalog);
    for (const form of pilot.catalog.forms) {
      const response = await handleHebrewFormsPilot(request({ path: `files/${form.id}` }), dependencies());
      expect(response.status).toBe(200);
      const data = await response.json();
      const bytes = Buffer.from(data.base64, 'base64');
      expect(data.id).toBe(form.id);
      expect(bytes.length).toBe(form.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
    }
  });

  it('retains Railway permission checks even after Base44 admits the request', async () => {
    role = 'user';
    try { expect((await handleHebrewFormsPilot(request(), dependencies())).status).toBe(403); }
    finally { role = 'admin'; }
  });
});
