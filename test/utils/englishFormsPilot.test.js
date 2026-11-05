import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createAppServer } from '../../server/index.mjs';
import { loadPilot } from '../../server/hebrew-pilot.mjs';
import { handleHebrewFormsPilot } from '../../base44/functions/getHebrewFormsPilot/handler.js';
import { ENGLISH_CATALOG_PATH, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

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
    expect(pilot.translations.files.size).toBe(9);
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
      expect(result).toEqual({ catalog: pilot.englishCatalog, expansionPending: false });
      for (const form of result.catalog.forms) for (const download of [false, true]) {
        const pdf = await requestPilotPdf(form, { language: 'en', download });
        expect(Buffer.from(await pdf.arrayBuffer())).toEqual(pilot.translations.files.get(form.id));
      }
      role = 'user';
      await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow('PILOT_AUTH');
      await expect(requestPilotPdf(result.catalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_AUTH');
      role = 'admin'; token = 'expired';
      await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow('PILOT_AUTH');
    });

    it(`never falls back across languages after missing/corrupt/error responses on ${host}`, async () => {
      window.location.origin = host;
      const direct = host === railway;
      for (const failure of [400, 404, 401, 403, 503, 'corrupt', 'hebrew', 'network']) {
        fetch.mockClear(); invoke.mockClear();
        if (typeof failure === 'number') {
          if (direct) fetch.mockResolvedValueOnce(new Response(null, { status: failure }));
          else invoke.mockRejectedValueOnce({ response: { status: failure } });
        } else if (failure === 'network') (direct ? fetch : invoke).mockRejectedValueOnce(new TypeError('offline'));
        else {
          const catalog = structuredClone(failure === 'hebrew' ? pilot.series12Catalog : pilot.englishCatalog);
          if (failure === 'corrupt') catalog.forms[0].sha256 = '0'.repeat(64);
          if (direct) fetch.mockResolvedValueOnce(Response.json(catalog));
          else invoke.mockResolvedValueOnce({ data: { kind: 'catalog', catalog } });
        }
        await expect(requestPilotCatalog({ language: 'en' })).rejects.toThrow(
          [400, 404].includes(failure) ? 'PILOT_TRANSLATION_UNAVAILABLE' : [401, 403].includes(failure) ? 'PILOT_AUTH' : ['corrupt', 'hebrew'].includes(failure) ? 'PILOT_INVALID' : 'PILOT_UNAVAILABLE');
        expect(direct ? fetch : invoke).toHaveBeenCalledTimes(1);
        expect(direct ? fetch.mock.calls[0][0] : invoke.mock.calls[0][1].path).toBe(direct ? `/api/hebrew-forms-pilot/${ENGLISH_CATALOG_PATH}` : ENGLISH_CATALOG_PATH);
      }
    });
  }

  it('rejects missing translations and cross-language file requests before networking', async () => {
    for (const language of ['es', 'fr', 'de', 'it', 'pt']) await expect(requestPilotCatalog({ language })).rejects.toThrow('PILOT_TRANSLATION_UNAVAILABLE');
    await expect(requestPilotPdf(pilot.englishCatalog.forms[0], { language: 'he' })).rejects.toThrow('PILOT_INVALID');
    await expect(requestPilotPdf(pilot.series12Catalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    await expect(requestPilotPdf({ id: 'MP-MOOD-04-W-CH-EN' }, { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    expect(fetch).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects corrupt English PDFs and late SDK catalogs after cancellation', async () => {
    fetch.mockResolvedValueOnce(new Response('%PDF-corrupt', { headers: { 'Content-Type': 'application/pdf' } }));
    await expect(requestPilotPdf(pilot.englishCatalog.forms[0], { language: 'en' })).rejects.toThrow('PILOT_INVALID');
    window.location.origin = 'https://mindful-path-75aeaf7d.base44.app';
    const controller = new AbortController();
    invoke.mockImplementationOnce(async () => { controller.abort(); return { data: { kind: 'catalog', catalog: pilot.englishCatalog } }; });
    await expect(requestPilotCatalog({ language: 'en', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not expose static English assets or accept forged-role/query credentials', async () => {
    for (const path of ['/server/private/forms-en/MP-MOOD-03-W-CH-EN.pdf', '/server/private/english-pilot-mood-03-catalog.json']) {
      expect((await realFetch(`${origin}${path}`)).status).toBe(404);
    }
    for (const path of [ENGLISH_CATALOG_PATH, ...pilot.englishCatalog.forms.map(f => `files/${f.id}`)]) {
      expect((await realFetch(`${origin}/api/hebrew-forms-pilot/${path}?token=fixture-session&role=admin`, { headers: { 'X-User-Role': 'admin' } })).status).toBe(401);
    }
    expect((await realFetch(`${origin}/api/hebrew-forms-pilot/files/MP-MOOD-04-W-CH-EN`, { headers: { Authorization: 'Bearer fixture-session' } })).status).toBe(404);
  });
});
