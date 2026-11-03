import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
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
const diagnosticDefaults = { diagnosticVersion: 3, causeCode: 'unknown', reason: 'unknown', timeoutAvailable: true };

describe('Base44 pilot proxy authorization and transport', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('reports the failing stage without credentials, identities or raw exception details', async () => {
    const privateError = Object.assign(new TypeError('secret token and user email'), { status: 502, config: { headers: { Authorization: 'Bearer never-log' } } });
    for (const [stage, dependencies] of [
      ['client', { createClientFromRequest: () => { throw privateError; } }],
      ['auth', { createClientFromRequest: () => ({ auth: { me: async () => { throw privateError; } } }) }],
      ['fetch', { createClientFromRequest: client(), fetchImpl: async () => { throw privateError; } }],
      ['read', { createClientFromRequest: client(), fetchImpl: async () => new Response(new ReadableStream({ start(controller) { controller.error(privateError); } }), { headers: { 'Content-Type': 'application/json' } }) }],
      ['catalog', { createClientFromRequest: client(), fetchImpl: async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }) }],
    ]) {
      const logFailure = vi.fn();
      const response = await handleHebrewFormsPilot(request(), { ...dependencies, logFailure });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
      expect(logFailure).toHaveBeenCalledTimes(1);
      expect(logFailure).toHaveBeenCalledWith({ ...diagnosticDefaults, stage, errorType: stage === 'catalog' ? 'SyntaxError' : 'TypeError', ...(stage === 'auth' ? { upstreamStatus: 502 } : {}) });
    }
    const logFailure = vi.fn();
    await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl: async () => new Response('private upstream body', { status: 504 }), logFailure });
    expect(logFailure).toHaveBeenCalledTimes(1);
    expect(logFailure).toHaveBeenCalledWith({ ...diagnosticDefaults, stage: 'upstream_response', errorType: 'other', upstreamStatus: 504 });
    expect((await handleHebrewFormsPilot(request(), { createClientFromRequest: () => { throw privateError; }, logFailure: () => { throw privateError; } })).status).toBe(503);
  });

  it('distinguishes missing timeout support and timeout construction failures without sending a request', async () => {
    const req = request(), fetchImpl = vi.fn(), logFailure = vi.fn();
    vi.stubGlobal('AbortSignal', {});
    expect((await handleHebrewFormsPilot(req, { createClientFromRequest: client(), fetchImpl, logFailure })).status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'timeout', errorType: 'TypeError', timeoutAvailable: false }]]);
    vi.unstubAllGlobals();
    logFailure.mockClear();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => { throw new TypeError('private runtime details'); });
    expect((await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl, logFailure })).status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'timeout', errorType: 'TypeError' }]]);
  });

  it('identifies Request option validation separately and never retries with relaxed options', async () => {
    const req = request(), fetchImpl = vi.fn(), logFailure = vi.fn();
    const NativeRequest = Request;
    vi.stubGlobal('Request', class {
      constructor(url, options = {}) {
        expect(url).toBe('https://mindful-path-production-7704.up.railway.app/api/hebrew-forms-pilot/catalog');
        if ('cache' in options) throw new TypeError("The 'cache' field on 'RequestInitializerDict' is not implemented. private details");
        return new NativeRequest(url, options);
      }
    });
    const response = await handleHebrewFormsPilot(req, { createClientFromRequest: client(), fetchImpl, logFailure });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'request', errorType: 'TypeError', reason: 'cache_option_unsupported', requestChecks: {
      baseline: true, headers: true, signal: true, redirect: true, cache: false,
      withoutHeaders: false, withoutSignal: false, withoutRedirect: false, withoutCache: true,
    } }]]);
  });

  it('distinguishes incompatible signals, option interactions and an unavailable Request constructor without network probes', async () => {
    const NativeRequest = Request;
    const cases = [
      { rejects: (options) => 'signal' in options, expected: { baseline: true, headers: true, signal: false, redirect: true, cache: true, withoutHeaders: false, withoutSignal: true, withoutRedirect: false, withoutCache: false } },
      { rejects: (options) => 'headers' in options && 'signal' in options, expected: { baseline: true, headers: true, signal: true, redirect: true, cache: true, withoutHeaders: true, withoutSignal: true, withoutRedirect: false, withoutCache: false } },
      { rejects: () => true, expected: { baseline: false, headers: false, signal: false, redirect: false, cache: false, withoutHeaders: false, withoutSignal: false, withoutRedirect: false, withoutCache: false } },
    ];
    for (const { rejects, expected } of cases) {
      const req = request(), fetchImpl = vi.fn(), logFailure = vi.fn();
      let constructions = 0;
      vi.stubGlobal('Request', class {
        constructor(url, options = {}) {
          constructions++;
          if (rejects(options)) throw new TypeError(`private-session user@example.test ${url}`);
          return new NativeRequest(url, options);
        }
      });
      try {
        const response = await handleHebrewFormsPilot(req, { createClientFromRequest: client(), fetchImpl, logFailure });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(constructions).toBe(10);
        expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'request', errorType: 'TypeError', requestChecks: expected }]]);
        expect(JSON.stringify(logFailure.mock.calls)).not.toMatch(/private-session|user@example|https:|Authorization/);
      } finally { vi.unstubAllGlobals(); }
    }
  });

  it('never runs the option probes when Request construction succeeds', async () => {
    const req = request(), NativeRequest = Request, logFailure = vi.fn();
    let constructions = 0;
    vi.stubGlobal('Request', class {
      constructor(url, options) { constructions++; return new NativeRequest(url, options); }
    });
    const fetchImpl = vi.fn(async () => { throw new TypeError('private fetch error'); });
    const response = await handleHebrewFormsPilot(req, { createClientFromRequest: client(), fetchImpl, logFailure });
    expect(response.status).toBe(503);
    expect(constructions).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'fetch', errorType: 'TypeError' }]]);
  });

  it('reports only allowlisted direct or nested cause codes, even when exceptions contain secrets', async () => {
    for (const code of ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_URL', 'Bearer private-session', { token: 'private-session' }]) {
      for (const nested of [false, true]) {
        const error = Object.assign(new TypeError('user@example.test private-session'), nested ? { cause: { code } } : { code });
        error.config = { headers: { Authorization: 'Bearer private-session' } };
        const logFailure = vi.fn(), fetchImpl = vi.fn(async () => { throw error; });
        const response = await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl, logFailure });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'fetch', errorType: 'TypeError', causeCode: typeof code === 'string' && code !== 'Bearer private-session' ? code : 'unknown' }]]);
        expect(JSON.stringify(logFailure.mock.calls)).not.toMatch(/private-session|user@example|Authorization/);
      }
    }
  });

  it('classifies runtime cache failures without printing their message or inventing a network cause', async () => {
    const logFailure = vi.fn();
    const error = Object.assign(new TypeError('Unsupported cache mode: private-session'), { cause: { code: 'private-session' } });
    const response = await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl: async () => { throw error; }, logFailure });
    expect(response.status).toBe(503);
    expect(logFailure.mock.calls).toEqual([[{ ...diagnosticDefaults, stage: 'fetch', errorType: 'TypeError', reason: 'cache_option_unsupported' }]]);
    logFailure.mockClear();
    Object.defineProperty(error, 'cause', { get() { throw new Error('private diagnostic details'); } });
    expect((await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl: async () => { throw error; }, logFailure })).status).toBe(503);
    expect(logFailure).not.toHaveBeenCalled();
  });

  it('denies missing auth, other apps, ordinary/premium users and stale administrator roles before fetching assets', async () => {
    const fetchImpl = vi.fn();
    const logFailure = vi.fn();
    for (const [req, me, status] of [
      [request({}, { Authorization: '' }), user, 401],
      [request({}, { 'Base44-App-Id': 'another-app' }), user, 403],
      [request(), { id: 'regular', role: 'user' }, 403],
      [request(), { id: 'premium', role: 'premium' }, 403],
      [request(), { role: 'admin' }, 403],
    ]) expect((await handleHebrewFormsPilot(req, { createClientFromRequest: client(me), fetchImpl, logFailure })).status).toBe(status);
    let currentRole = 'admin';
    const dependencies = { createClientFromRequest: () => ({ auth: { me: async () => ({ id: 'same-user', role: currentRole }) } }), fetchImpl, logFailure };
    currentRole = 'user';
    expect((await handleHebrewFormsPilot(request(), dependencies)).status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logFailure).not.toHaveBeenCalled();
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
    expect(init.redirect).toBe('manual');
    expect(init.cache).toBe('no-store');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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

  it('returns both pinned catalogs and all 163 PDFs byte-for-byte through the Base44 transport', async () => {
    // Match the deployed Workers incompatibility: Node otherwise accepts error.
    const NativeRequest = Request;
    vi.stubGlobal('Request', class {
      constructor(url, options = {}) {
        if (options.redirect === 'error') throw new TypeError('Unsupported redirect mode');
        return new NativeRequest(url, options);
      }
    });
    try {
      const catalog = await (await handleHebrewFormsPilot(request(), dependencies())).json();
      expect(catalog.kind).toBe('catalog');
      expect(catalog.catalog).toEqual(pilot.catalog);
      const expanded = await (await handleHebrewFormsPilot(request({ path: 'catalog-mood-01' }), dependencies())).json();
      expect(expanded.catalog).toEqual(pilot.expandedCatalog);
      for (const form of pilot.expandedCatalog.forms) {
        const response = await handleHebrewFormsPilot(request({ path: `files/${form.id}` }), dependencies());
        expect(response.status).toBe(200);
        const data = await response.json();
        const bytes = Buffer.from(data.base64, 'base64');
        expect(data.id).toBe(form.id);
        expect(bytes.length).toBe(form.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(form.sha256);
      }
    } finally { vi.unstubAllGlobals(); }
  });

  it('retains Railway permission checks even after Base44 admits the request', async () => {
    role = 'user';
    try { expect((await handleHebrewFormsPilot(request(), dependencies())).status).toBe(403); }
    finally { role = 'admin'; }
  });
});

describe('manual redirects keep the session on the fixed service', () => {
  it('rejects all 3xx responses and never contacts same-origin or cross-origin redirect destinations', async () => {
    let status = 302, location = '/destination', sameOriginHits = 0, crossOriginHits = 0;
    const sourceAuths = [];
    const target = createServer((_req, res) => { crossOriginHits++; res.end('must not be requested'); });
    const source = createServer((req, res) => {
      if (req.url === '/destination') { sameOriginHits++; res.end('must not be requested'); return; }
      sourceAuths.push(req.headers.authorization);
      res.writeHead(status, { Location: location });
      res.end('private redirect body');
    });
    await new Promise((resolve) => target.listen(0, '127.0.0.1', resolve));
    await new Promise((resolve) => source.listen(0, '127.0.0.1', resolve));
    const logFailure = vi.fn();
    const fetchImpl = vi.fn((_url, options) => fetch(`http://127.0.0.1:${source.address().port}/redirect`, options));
    try {
      for (const destination of ['/destination', `http://127.0.0.1:${target.address().port}/destination`]) {
        location = destination;
        for (const code of [300, 301, 302, 303, 304, 305, 306, 307, 308, 399]) {
          status = code;
          const response = await handleHebrewFormsPilot(request(), { createClientFromRequest: client(), fetchImpl, logFailure });
          expect(response.status).toBe(503);
          expect(await response.json()).toEqual({ error: 'PILOT_UNAVAILABLE' });
          expect(response.headers.get('Location')).toBeNull();
          expect(response.headers.get('Cache-Control')).toBe('private, no-store');
          expect(logFailure).toHaveBeenLastCalledWith({ ...diagnosticDefaults, stage: 'upstream_response', errorType: 'other', upstreamStatus: code });
        }
      }
      expect(fetchImpl).toHaveBeenCalledTimes(20);
      expect(sourceAuths).toEqual(Array(20).fill('Bearer fixture-session'));
      expect(sameOriginHits).toBe(0);
      expect(crossOriginHits).toBe(0);
      expect(logFailure).toHaveBeenCalledTimes(20);
      expect(JSON.stringify(logFailure.mock.calls)).not.toMatch(/fixture-session|private redirect|destination|http:/);
    } finally {
      source.closeAllConnections(); target.closeAllConnections();
      await Promise.all([new Promise((resolve) => source.close(resolve)), new Promise((resolve) => target.close(resolve))]);
    }
  });
});
