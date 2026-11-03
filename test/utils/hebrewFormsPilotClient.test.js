import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createAppServer } from '../../server/index.mjs';
import { loadPilot } from '../../server/hebrew-pilot.mjs';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/api/base44Client', () => ({ base44: { functions: { invoke } } }));
import { requestPilot, requestPilotPdf } from '../../src/lib/hebrewFormsPilotClient.js';

const railway = 'https://mindful-path-production-7704.up.railway.app';
const realFetch = globalThis.fetch;

describe('pilot host transports with the real private server', () => {
  let server, origin, pilot, token, role;
  beforeAll(async () => {
    pilot = await loadPilot();
    server = await createAppServer({ pilot, verifyAdmin: async (value) => ({ status: value === 'fixture-session' ? role === 'admin' ? 200 : 403 : 401 }) });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  beforeEach(() => {
    token = 'fixture-session'; role = 'admin'; invoke.mockReset();
    // A function outage must not stop Railway's existing authenticated API.
    invoke.mockRejectedValue({ response: { status: 503 } });
    vi.stubGlobal('window', { location: { origin: railway }, crypto: webcrypto, localStorage: { getItem: () => token } });
    vi.stubGlobal('fetch', vi.fn((path, init) => realFetch(`${origin}${path}`, init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the catalog, opens and downloads original PDFs despite a Base44 function outage', async () => {
    expect(await (await requestPilot('catalog')).json()).toEqual(pilot.catalog);
    const form = pilot.catalog.forms[0];
    for (const download of [false, true]) {
      const blob = await requestPilotPdf(form, { download });
      expect(Buffer.from(await blob.arrayBuffer())).toEqual(pilot.files.get(form.id));
    }
    expect(fetch.mock.calls[2][0]).toBe(`/api/hebrew-forms-pilot/files/${form.id}?download=1`);
    expect(fetch.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer fixture-session' }, cache: 'no-store', redirect: 'error' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rechecks current credentials and revoked roles for every direct request', async () => {
    await requestPilot('catalog');
    role = 'user';
    await expect(requestPilot('catalog')).rejects.toThrow('PILOT_AUTH');
    role = 'admin'; token = 'expired-fixture';
    await expect(requestPilotPdf(pilot.catalog.forms[0])).rejects.toThrow('PILOT_AUTH');
    expect(fetch.mock.calls.at(-1)[1].headers.Authorization).toBe('Bearer expired-fixture');
    fetch.mockClear(); token = null;
    await expect(requestPilot('catalog')).rejects.toThrow('PILOT_AUTH');
    expect(fetch).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('keeps Base44 preview/public and lookalike hosts on the SDK without forwarding tokens elsewhere', async () => {
    invoke.mockResolvedValue({ data: { kind: 'catalog', catalog: pilot.catalog } });
    for (const host of ['https://mindful-path-75aeaf7d.base44.app', 'https://preview-sandbox--69504b725a07f5aa75aeaf7d.base44.app', `${railway}.evil.example`]) {
      window.location.origin = host;
      expect(await (await requestPilot('catalog')).json()).toEqual(pilot.catalog);
    }
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
    invoke.mockRejectedValue({ response: { status: 503 } });
    await expect(requestPilot('catalog')).rejects.toThrow('PILOT_UNAVAILABLE');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves cancellation, rejects invalid paths and detects corrupt PDFs on Railway', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(requestPilot('catalog', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    for (const path of ['../private', 'catalog?url=evil', 'https://evil.example']) await expect(requestPilot(path)).rejects.toThrow('PILOT_INVALID');
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(new Response('%PDF-corrupt', { headers: { 'Content-Type': 'application/pdf' } }));
    await expect(requestPilotPdf(pilot.catalog.forms[0])).rejects.toThrow('PILOT_INVALID');
    fetch.mockRejectedValueOnce(new TypeError('network unavailable'));
    await expect(requestPilot('catalog')).rejects.toThrow('PILOT_UNAVAILABLE');
    fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(requestPilot('catalog')).rejects.toThrow('PILOT_UNAVAILABLE');
    expect(invoke).not.toHaveBeenCalled();
  });
});
