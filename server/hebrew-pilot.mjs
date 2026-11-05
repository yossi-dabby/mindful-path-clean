import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SERIES06_CATALOG_PATH, SERIES05_CATALOG_PATH, SERIES04_CATALOG_PATH, SERIES03_CATALOG_PATH, SERIES02_CATALOG_PATH, SERIES01_CATALOG_PATH, P4B_CATALOG_PATH, P4A_CATALOG_PATH, P3_CATALOG_PATH, PILOT_RELEASES, isPilotCatalogPath, validatePilotCatalog } from '../base44/functions/getHebrewFormsPilot/releases.js';

export const PILOT_PREFIX = '/api/hebrew-forms-pilot';
const privateRoot = new URL('./private/', import.meta.url);

export async function loadPilot() {
  const catalog = JSON.parse(await readFile(new URL('hebrew-pilot-catalog.json', privateRoot), 'utf8'));
  const expandedCatalog = JSON.parse(await readFile(new URL('hebrew-pilot-mood-catalog.json', privateRoot), 'utf8'));
  const p3Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-p3-catalog.json', privateRoot), 'utf8'));
  const p4aCatalog = JSON.parse(await readFile(new URL('hebrew-pilot-p4-01-catalog.json', privateRoot), 'utf8'));
  const p4bCatalog = JSON.parse(await readFile(new URL('hebrew-pilot-p4-02-catalog.json', privateRoot), 'utf8'));
  const series01Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-01-catalog.json', privateRoot), 'utf8'));
  const series02Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-02-catalog.json', privateRoot), 'utf8'));
  const series03Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-03-catalog.json', privateRoot), 'utf8'));
  const series04Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-04-catalog.json', privateRoot), 'utf8'));
  const series05Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-05-catalog.json', privateRoot), 'utf8'));
  const series06Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-06-catalog.json', privateRoot), 'utf8'));
  const catalogs = { catalog, 'catalog-mood-01': expandedCatalog, [P3_CATALOG_PATH]: p3Catalog, [P4A_CATALOG_PATH]: p4aCatalog, [P4B_CATALOG_PATH]: p4bCatalog, [SERIES01_CATALOG_PATH]: series01Catalog, [SERIES02_CATALOG_PATH]: series02Catalog, [SERIES03_CATALOG_PATH]: series03Catalog, [SERIES04_CATALOG_PATH]: series04Catalog, [SERIES05_CATALOG_PATH]: series05Catalog, [SERIES06_CATALOG_PATH]: series06Catalog };
  for (const [path, release] of Object.entries(catalogs)) {
    if (!await validatePilotCatalog(release, path)) throw new Error('Invalid pilot release');
  }
  const formsRoot = new URL('forms/', privateRoot);
  const filenames = new Set(await readdir(formsRoot));
  const files = new Map();
  for (const form of series06Catalog.forms) {
    if (!/^MP-[A-Z0-9-]+-HE$/.test(form.id) || !filenames.has(`${form.id}.pdf`)) {
      throw new Error('Invalid Hebrew pilot asset');
    }
    const data = await readFile(new URL(`${form.id}.pdf`, formsRoot));
    if (files.has(form.id) || !data.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
        data.length !== form.bytes || createHash('sha256').update(data).digest('hex') !== form.sha256) {
      throw new Error('Invalid Hebrew pilot asset');
    }
    files.set(form.id, data);
  }
  if (files.size !== PILOT_RELEASES[SERIES06_CATALOG_PATH].count || filenames.size !== files.size) throw new Error('Invalid pilot count');
  return { catalog, expandedCatalog, p3Catalog, p4aCatalog, p4bCatalog, series01Catalog, series02Catalog, series03Catalog, series04Catalog, series05Catalog, series06Catalog, catalogs, files };
}

// Match the installed Base44 SDK auth.me endpoint. The app ID is server-owned;
// never accept an app, role, user ID, upstream URL or token from query parameters.
export function createAdminVerifier(appId, fetchImpl = fetch) {
  return async (token) => {
    if (!/^[a-f0-9]{24}$/i.test(appId || '')) return { status: 503 };
    try {
      const response = await fetchImpl(`https://base44.app/api/apps/${appId}/entities/User/me`, {
        headers: { Authorization: `Bearer ${token}`, 'X-App-Id': appId },
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) return { status: 401 };
      if (!response.ok) return { status: 503 };
      const user = await response.json();
      return { status: user?.id && user.role === 'admin' ? 200 : 403 };
    } catch {
      return { status: 503 };
    }
  };
}

export function createPilotHandler({ pilot, verifyAdmin }) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== PILOT_PREFIX && !url.pathname.startsWith(`${PILOT_PREFIX}/`)) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const fail = (status) => { res.writeHead(status); res.end(); return true; };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return fail(405);
    }
    const match = /^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization || '');
    if (!match) return fail(401);
    const access = await verifyAdmin(match[1]);
    if (access.status !== 200) return fail(access.status);
    const path = url.pathname.slice(`${PILOT_PREFIX}/`.length);
    if (isPilotCatalogPath(path)) {
      const catalog = pilot.catalogs?.[path];
      if (!catalog) return fail(404);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(catalog));
      return true;
    }
    const id = url.pathname.slice(`${PILOT_PREFIX}/files/`.length);
    if (!url.pathname.startsWith(`${PILOT_PREFIX}/files/`) || !/^MP-[A-Z0-9-]+-HE$/.test(id)) return fail(404);
    const data = pilot.files.get(id);
    if (!data) return fail(404);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', data.length);
    res.setHeader('Content-Disposition', `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${id}.pdf"`);
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  };
}
