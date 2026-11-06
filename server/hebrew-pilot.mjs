import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ENGLISH_SERIES02_CATALOG_PATH, ENGLISH_SERIES02_TRACKS, ENGLISH_CURRENT_FORM_IDS, assembleEnglishCatalog, canonicalCatalog, ENGLISH_SERIES01_CATALOG_PATH, ENGLISH_CATALOG_PATH, isPilotFileId, SERIES12_CATALOG_PATH, SERIES11_CATALOG_PATH, SERIES10_CATALOG_PATH, SERIES09_CATALOG_PATH, SERIES08_CATALOG_PATH, SERIES07_CATALOG_PATH, SERIES06_CATALOG_PATH, SERIES05_CATALOG_PATH, SERIES04_CATALOG_PATH, SERIES03_CATALOG_PATH, SERIES02_CATALOG_PATH, SERIES01_CATALOG_PATH, P4B_CATALOG_PATH, P4A_CATALOG_PATH, P3_CATALOG_PATH, PILOT_RELEASES, isPilotCatalogPath, validatePilotCatalog } from '../base44/functions/getHebrewFormsPilot/releases.js';

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
  const series07Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-07-catalog.json', privateRoot), 'utf8'));
  const series08Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-08-catalog.json', privateRoot), 'utf8'));
  const series09Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-09-catalog.json', privateRoot), 'utf8'));
  const series10Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-10-catalog.json', privateRoot), 'utf8'));
  const series11Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-11-catalog.json', privateRoot), 'utf8'));
  const series12Catalog = JSON.parse(await readFile(new URL('hebrew-pilot-series-12-catalog.json', privateRoot), 'utf8'));
  const catalogs = { catalog, 'catalog-mood-01': expandedCatalog, [P3_CATALOG_PATH]: p3Catalog, [P4A_CATALOG_PATH]: p4aCatalog, [P4B_CATALOG_PATH]: p4bCatalog, [SERIES01_CATALOG_PATH]: series01Catalog, [SERIES02_CATALOG_PATH]: series02Catalog, [SERIES03_CATALOG_PATH]: series03Catalog, [SERIES04_CATALOG_PATH]: series04Catalog, [SERIES05_CATALOG_PATH]: series05Catalog, [SERIES06_CATALOG_PATH]: series06Catalog, [SERIES07_CATALOG_PATH]: series07Catalog, [SERIES08_CATALOG_PATH]: series08Catalog, [SERIES09_CATALOG_PATH]: series09Catalog, [SERIES10_CATALOG_PATH]: series10Catalog, [SERIES11_CATALOG_PATH]: series11Catalog, [SERIES12_CATALOG_PATH]: series12Catalog };
  for (const [path, release] of Object.entries(catalogs)) {
    if (!await validatePilotCatalog(release, path)) throw new Error('Invalid pilot release');
  }
  const formsRoot = new URL('forms/', privateRoot);
  const filenames = new Set(await readdir(formsRoot));
  const files = new Map();
  for (const form of series12Catalog.forms) {
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
  if (files.size !== PILOT_RELEASES[SERIES12_CATALOG_PATH].count || filenames.size !== files.size) throw new Error('Invalid pilot count');
  const englishCatalog = JSON.parse(await readFile(new URL('english-pilot-mood-03-catalog.json', privateRoot), 'utf8'));
  if (!await validatePilotCatalog(englishCatalog, ENGLISH_CATALOG_PATH)) throw new Error('Invalid English pilot release');
  const englishSeries01Catalog = JSON.parse(await readFile(new URL('english-pilot-series-01-catalog.json', privateRoot), 'utf8'));
  if (!await validatePilotCatalog(englishSeries01Catalog, ENGLISH_SERIES01_CATALOG_PATH)) throw new Error('Invalid English wave release');
  const englishSeries02Index = JSON.parse(await readFile(new URL('english-pilot-series-02-index.json', privateRoot), 'utf8'));
  if (!await validatePilotCatalog(englishSeries02Index, ENGLISH_SERIES02_CATALOG_PATH)) throw new Error('Invalid English index');
  const englishParts = [], englishPartCatalogs = {};
  for (const track of ENGLISH_SERIES02_TRACKS) {
    const path = `${ENGLISH_SERIES02_CATALOG_PATH}-${track}`;
    const part = JSON.parse(await readFile(new URL(`english-pilot-series-02-${track}.json`, privateRoot), 'utf8'));
    if (!await validatePilotCatalog(part, path)) throw new Error('Invalid English catalog part');
    englishParts.push(part); englishPartCatalogs[path] = part;
  }
  const englishSeries02Catalog = assembleEnglishCatalog(englishSeries02Index, englishParts);
  for (const prior of [...englishCatalog.forms, ...englishSeries01Catalog.forms]) {
    const current = englishSeries02Catalog.forms.find(form => form.id === prior.id);
    if (!current || canonicalCatalog(current) !== canonicalCatalog(prior)) throw new Error('Previously installed English form changed');
  }
  const englishRoot = new URL('forms-en/', privateRoot);
  const englishNames = new Set(await readdir(englishRoot));
  const englishFiles = new Map();
  for (const form of englishSeries02Catalog.forms) {
    const source = series12Catalog.forms.find(source => source.id === form.sourceId);
    if (!ENGLISH_CURRENT_FORM_IDS.includes(form.id) || !englishNames.has(`${form.id}.pdf`) ||
        !source || source.sha256 !== form.sourcePdfSha256 || source.contentVersion !== form.sourceVersion ||
        source.age !== form.age || source.track !== form.track || source.unit !== form.unit) throw new Error('Invalid English source link');
    const data = await readFile(new URL(`${form.id}.pdf`, englishRoot));
    if (englishFiles.has(form.id) || data.subarray(0, 5).toString() !== '%PDF-' ||
        data.length !== form.bytes || createHash('sha256').update(data).digest('hex') !== form.sha256) throw new Error('Invalid English pilot asset');
    englishFiles.set(form.id, data);
  }
  if (englishFiles.size !== PILOT_RELEASES[ENGLISH_SERIES02_CATALOG_PATH].count || englishNames.size !== englishFiles.size) throw new Error('Invalid English pilot count');
  const translations = { catalogs: { [ENGLISH_SERIES02_CATALOG_PATH]: englishSeries02Index, ...englishPartCatalogs, [ENGLISH_CATALOG_PATH]: englishCatalog, [ENGLISH_SERIES01_CATALOG_PATH]: englishSeries01Catalog }, files: englishFiles };
  return { translations, englishSeries02Index, englishSeries02Catalog, englishCatalog, englishSeries01Catalog, catalog, expandedCatalog, p3Catalog, p4aCatalog, p4bCatalog, series01Catalog, series02Catalog, series03Catalog, series04Catalog, series05Catalog, series06Catalog, series07Catalog, series08Catalog, series09Catalog, series10Catalog, series11Catalog, series12Catalog, catalogs, files };
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
      const catalog = pilot.catalogs?.[path] || pilot.translations?.catalogs?.[path];
      if (!catalog) return fail(404);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(catalog));
      return true;
    }
    const id = url.pathname.slice(`${PILOT_PREFIX}/files/`.length);
    if (!url.pathname.startsWith(`${PILOT_PREFIX}/files/`) || !isPilotFileId(id)) return fail(404);
    const data = pilot.files.get(id) || pilot.translations?.files.get(id);
    if (!data) return fail(404);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', data.length);
    res.setHeader('Content-Disposition', `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${id}.pdf"`);
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  };
}
