import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createAppServer } from '../../server/index.mjs';
import { loadPilot } from '../../server/hebrew-pilot.mjs';
import { handleHebrewFormsPilot } from '../../base44/functions/getHebrewFormsPilot/handler.js';
import { ENGLISH_CATALOG_PATH, ENGLISH_SERIES01_CATALOG_PATH, ENGLISH_SERIES03_CATALOG_PATH, ENGLISH_SERIES02_CATALOG_PATH, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke } } }));
import { requestPilotCatalog, requestPilotPdf } from '../../src/lib/hebrewFormsPilotClient.js';

const realFetch = globalThis.fetch;
const railway = 'https://mindful-path-production-7704.up.railway.app';
const appId = '69504b725a07f5aa75aeaf7d';

describe('English pilot through real private server and Base44 proxy', () => {
  let pilot, server, origin, role, token;
  beforeAll(async () => {
    pilot = await loadPilot();
    server = await createAppServer({ pilot, verifyAdmin: async value => ({ status: value === 'fixture-session' ? role === 'admin' ? 200 : 403 : 401 }) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  beforeEach(() => {
    role = 'admin'; token = 'fixture-session'; invoke.mockReset();
    vi.stubGlobal('window', { location: { origin: railway }, crypto: webcrypto, localStorage: { getItem: () => token } });
    vi.stubGlobal('fetch', vi.fn((path, init) => realFetch(`${origin}${path}`, init)));
    invoke.mockImplementation(async (_name, body) => {
      const response = await handleHebrewFormsPilot(new Request('https://app.example/function', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Base44-App-Id': appId, Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
      }), {
        createClientFromRequest: () => ({ auth: { me: async () => token === 'fixture-session' ? { id: 'fixture-user', role } : null } }),
        fetchImpl: (url, init) => realFetch(`${origin}${new URL(url).pathname}${new URL(url).search}`, init),
        logFailure: () => {},
      });
      if (!response.ok) throw { response: { status: response.status } };
      return { data: await response.json() };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('pins nine source-linked drafts independently from all 970 Hebrew forms', async () => {
    expect(pilot.files.size).toBe(970);
    expect(pilot.translations.files.size).toBe(970);
    const catalog = pilot.englishCatalog;
    expect(await validatePilotCatalog(catalog, ENGLISH_CATALOG_PATH)).toBe(true);
    expect(await validatePilotCatalog(pilot.series12Catalog, ENGLISH_CATALOG_PATH)).toBe(false);
    expect(catalog.coverage).toEqual({ available: 9, total: 970, unavailable: 961 });
    expect(catalog.forms.map(f => f.kindCode).sort()).toEqual(['G', 'P', 'P', 'P', 'P', 'W', 'W', 'W', 'W']);
    for (const form of catalog.forms) {
      const source = pilot.series12Catalog.forms.find(f => f.id === form.sourceId);
      expect(form).toMatchObject({ sourcePdfSha256: source.sha256, sourceVersion: source.contentVersion,
        age: source.age, track: source.track, unit: source.unit, language: 'en',
        review: { translation: 'draft', clinical: 'pending', rights: 'pending', reviewer: null, reviewedAt: null } });
      expect(form.status).toContain('not for distribution');
    }
    const tampered = structuredClone(catalog); tampered.forms[0].title += '!';
    expect(await validatePilotCatalog(tampered, ENGLISH_CATALOG_PATH)).toBe(false);
  });

  for (const host of [railway, 'https://mindful-path-75aeaf7d.base44.app']) {
    it(`serves every English PDF byte-for-byte and rechecks authorization on ${host}`, async () => {
      window.location.origin = host;
      const result = await requestPilotCatalog({ language: 'en' });
      expect(result).toEqual({ catalog: pilot.englishSeries03Catalog, expansionPending: false });
      // Bound concurrency while checking every open/download. Sequential HTTP keep-alive
      // delays would otherwise make this 30-times-larger inventory exceed the test budget.
      for (let offset = 0; offset < result.catalog.forms.length; offset += 8) {
        await Promise.all(result.catalog.forms.slice(offset, offset + 8).flatMap(form => [false, true].map(async download => {
          const pdf = await requestPilotPdf(form, { language: 'en', download });
          expect(Buffer.from(await pdf.arrayBuffer()).equals(pilot.translations.files.get(form.id))).toBe(true);
        })));
      }
      role = 'user';
      await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow('PILOT_AUTH');
      await expect(requestPilotPdf(result.catalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_AUTH');
      role = 'admin'; token = 'expired';
      await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow('PILOT_AUTH');
    }, 30000);

    it(`uses the previous 648-form split release during staggered publication on ${host}`, async () => {
      window.location.origin = host;
      for (const status of [400, 404]) {
        if (host === railway) fetch.mockResolvedValueOnce(new Response(null, { status }));
        else invoke.mockRejectedValueOnce({ response: { status } });
        expect(await requestPilotCatalog({ language: 'en' })).toEqual({ catalog: pilot.englishSeries02Catalog, expansionPending: true });
      }
    });

    it(`uses the previous 270-form English fallback during staggered publication on ${host}`, async () => {
      window.location.origin = host;
      for (const status of [400, 404]) {
        for (let root = 0; root < 2; root++) {
          if (host === railway) fetch.mockResolvedValueOnce(new Response(null, { status }));
          else invoke.mockRejectedValueOnce({ response: { status } });
        }
        expect(await requestPilotCatalog({ language: 'en' })).toEqual({ catalog: pilot.englishSeries01Catalog, expansionPending: true });
      }
    });

    it(`retains the nine-form fallback if all three newer English roots are absent on ${host}`, async () => {
      window.location.origin = host;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (host === railway) fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
        else invoke.mockRejectedValueOnce({ response: { status: 404 } });
      }
      expect(await requestPilotCatalog({ language: 'en' })).toEqual({ catalog: pilot.englishCatalog, expansionPending: true });
    });

    it(`fails closed on unavailable, unauthorized, mixed or corrupt parts on ${host}`, async () => {
      window.location.origin = host;
      const direct = host === railway;
      for (const failure of [400, 404, 401, 403, 503, 'corrupt', 'mixed', 'hebrew', 'network']) {
        const requested = [];
        const respond = async path => {
          requested.push(path);
          let catalog = structuredClone(pilot.translations.catalogs[path]);
          if (path === pilot.englishSeries03Index.parts[1].path) {
            if (typeof failure === 'number') {
              if (direct) return new Response(null, { status: failure });
              throw { response: { status: failure } };
            }
            if (failure === 'network') throw new TypeError('offline');
            if (failure === 'corrupt') catalog.forms[0].title += '!';
            if (failure === 'mixed') catalog.version = '0.2-en-series-01';
            if (failure === 'hebrew') catalog = pilot.series12Catalog;
          }
          return direct ? Response.json(catalog) : { data: { kind: 'catalog', catalog } };
        };
        if (direct) fetch.mockImplementation(path => respond(path.split('/').pop()));
        else invoke.mockImplementation((_name, body) => respond(body.path));
        await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow(
          [401, 403].includes(failure) ? 'PILOT_AUTH' : ['corrupt', 'mixed', 'hebrew'].includes(failure) ? 'PILOT_INVALID' : 'PILOT_UNAVAILABLE');
        expect(requested).toEqual([ENGLISH_SERIES03_CATALOG_PATH, ...pilot.englishSeries03Index.parts.slice(0, 3).map(p => p.path)]);
      }
    });

    it(`bounds catalog loading to three concurrent parts and rejects late canceled batches on ${host}`, async () => {
      window.location.origin = host;
      const direct = host === railway;
      let active = 0, maxActive = 0, started = 0, release, ready;
      const gate = new Promise(resolve => { release = resolve; });
      const batchStarted = new Promise(resolve => { ready = resolve; });
      const respond = async path => {
        if (path !== ENGLISH_SERIES03_CATALOG_PATH) {
          active++; started++; maxActive = Math.max(maxActive, active);
          if (started === 3) ready();
          await gate;
          active--;
        }
        const catalog = pilot.translations.catalogs[path];
        return direct ? Response.json(catalog) : { data: { kind: 'catalog', catalog } };
      };
      if (direct) fetch.mockImplementation(path => respond(path.split('/').pop()));
      else invoke.mockImplementation((_name, body) => respond(body.path));
      const request = requestPilotCatalog({ language: 'en' });
      await batchStarted;
      expect(started).toBe(3);
      release();
      expect((await request).catalog.forms).toHaveLength(970);
      expect(maxActive).toBe(3); expect(started).toBe(17);
      for (const cancelAt of [-1, 0, 2, 17]) {
        const controller = new AbortController(), requested = [];
        const canceledResponse = async path => {
          requested.push(path);
          if (requested.length === cancelAt + 1) controller.abort();
          const catalog = pilot.translations.catalogs[path];
          return direct ? Response.json(catalog) : { data: { kind: 'catalog', catalog } };
        };
        if (direct) fetch.mockImplementation(path => canceledResponse(path.split('/').pop()));
        else invoke.mockImplementation((_name, body) => canceledResponse(body.path));
        if (cancelAt === -1) controller.abort();
        await expect(requestPilotCatalog({ language: 'en', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
        expect(requested.length).toBe(cancelAt + 1);
      }
    });

    it(`never falls back across languages after missing/corrupt/error responses on ${host}`, async () => {
      window.location.origin = host;
      const direct = host === railway;
      for (const failure of [400, 404, 401, 403, 503, 'corrupt', 'hebrew', 'network']) {
        fetch.mockClear(); invoke.mockClear();
        if (typeof failure === 'number') {
          for (let attempt = 0; attempt < ([400, 404].includes(failure) ? 4 : 1); attempt++) {
            if (direct) fetch.mockResolvedValueOnce(new Response(null, { status: failure }));
            else invoke.mockRejectedValueOnce({ response: { status: failure } });
          }
        } else if (failure === 'network') (direct ? fetch : invoke).mockRejectedValueOnce(new TypeError('offline'));
        else {
          const catalog = structuredClone(failure === 'hebrew' ? pilot.series12Catalog : pilot.englishSeries01Catalog);
          if (failure === 'corrupt') catalog.forms[0].sha256 = '0'.repeat(64);
          if (direct) fetch.mockResolvedValueOnce(Response.json(catalog));
          else invoke.mockResolvedValueOnce({ data: { kind: 'catalog', catalog } });
        }
        await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow(
          [400, 404].includes(failure) ? 'PILOT_TRANSLATION_UNAVAILABLE' : [401, 403].includes(failure) ? 'PILOT_AUTH' : ['corrupt', 'hebrew'].includes(failure) ? 'PILOT_INVALID' : 'PILOT_UNAVAILABLE');
        const requested = direct ? fetch.mock.calls.map(call => call[0].split('/').pop()) : invoke.mock.calls.map(call => call[1].path);
        expect(requested).toEqual([400, 404].includes(failure) ? [ENGLISH_SERIES03_CATALOG_PATH, ENGLISH_SERIES02_CATALOG_PATH, ENGLISH_SERIES01_CATALOG_PATH, ENGLISH_CATALOG_PATH] : [ENGLISH_SERIES03_CATALOG_PATH]);
      }
    });
  }

  it('rejects missing translations and cross-language file requests before networking', async () => {
    for (const language of ['es', 'fr', 'de', 'it', 'pt']) await expect(requestPilotCatalog({ language })).rejects.toThrow('PILOT_TRANSLATION_UNAVAILABLE');
    await expect(requestPilotPdf(pilot.englishCatalog.forms[0], { language: 'he' })).rejects.toThrow('PILOT_INVALID');
    await expect(requestPilotPdf(pilot.series12Catalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    await expect(requestPilotPdf({ id: 'MP-UNKNOWN-01-W-CH-EN' }, { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    expect(fetch).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects corrupt English PDFs and late SDK catalogs after cancellation', async () => {
    fetch.mockResolvedValueOnce(new Response('%PDF-corrupt', { headers: { 'Content-Type': 'application/pdf' } }));
    await expect(requestPilotPdf(pilot.englishCatalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    window.location.origin = 'https://mindful-path-75aeaf7d.base44.app';
    const controller = new AbortController();
    invoke.mockImplementationOnce(async () => { controller.abort(); return { data: { kind: 'catalog', catalog: pilot.englishSeries01Catalog } }; });
    await expect(requestPilotCatalog({ language: 'en', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not expose static English assets or accept forged-role/query credentials', async () => {
    for (const path of ['/server/private/forms-en/MP-MOOD-03-W-CH-EN.pdf', '/server/private/english-pilot-mood-03-catalog.json']) {
      expect((await realFetch(`${origin}${path}`)).status).toBe(404);
    }
    for (const path of [ENGLISH_CATALOG_PATH, ...pilot.englishCatalog.forms.map(f => `files/${f.id}`)]) {
      expect((await realFetch(`${origin}/api/hebrew-forms-pilot/${path}?token=fixture-session&role=admin`, { headers: { 'X-User-Role': 'admin' } })).status).toBe(401);
    }
    expect((await realFetch(`${origin}/api/hebrew-forms-pilot/files/MP-UNKNOWN-01-W-CH-EN`, { headers: { Authorization: 'Bearer fixture-session' } })).status).toBe(404);
  });
});
