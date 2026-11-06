// Install verified final-wave renders, or audit the complete committed library.
// Earlier English PDFs/catalog entries and every Hebrew source stay immutable.
import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { auditFormSources } from './audit-form-sources.mjs';
import { buildTranslationReviewCatalog } from '../src/lib/formsLocalization.js';
import { canonicalCatalog, validatePilotCatalog, ENGLISH_CURRENT_FORM_IDS, ENGLISH_FINAL_FORM_IDS } from '../base44/functions/getHebrewFormsPilot/releases.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = await json('content/forms-localization/waves/en-series-03.json');
const sources = await auditFormSources();
const previousIndex = await json('server/private/english-pilot-series-02-index.json');
if (!await validatePilotCatalog(previousIndex, 'catalog-en-series-02')) throw new Error('Changed previous index');
const priorForms = [];
for (const spec of previousIndex.parts) {
  const part = await json(`server/private/english-pilot-series-02-${spec.track}.json`);
  if (!await validatePilotCatalog(part, spec.path)) throw new Error('Changed previous catalog');
  priorForms.push(...part.forms);
}
const drafts = [], packetHashes = new Map(), packetById = new Map();
for (const spec of manifest.packets) {
  const bytes = await read(`content/forms-localization/en/${spec.key}.json`);
  const packet = JSON.parse(bytes);
  if (packet.packetKey !== spec.key || packet.unit !== spec.unit || packet.language !== 'en' || packet.forms.length !== spec.count) throw new Error(`Invalid packet: ${spec.key}`);
  for (const form of packet.forms) {
    if (form.unit !== spec.unit || form.track !== spec.track || packetById.has(form.id)) throw new Error('Packet structure mismatch');
    for (const field of ['title', 'unitTitle', 'kindLabel', 'ageLabel', 'audience']) {
      if (typeof form[field] !== 'string' || !form[field].trim() || /[\u0590-\u05ff]/.test(form[field])) throw new Error(`Untranslated metadata: ${form.id}/${field}`);
    }
    packetHashes.set(form.id, hash(bytes)); packetById.set(form.id, spec.key); drafts.push(form);
  }
}
const review = buildTranslationReviewCatalog(sources, drafts, 'en');
const newIds = new Set(ENGLISH_FINAL_FORM_IDS);
if (review.stale.length || review.forms.length !== manifest.newCount || newIds.size !== manifest.newCount || drafts.some(f => !newIds.has(f.id))) throw new Error('Final wave needs source review');
const qaPath = 'content/forms-localization/review/en-series-03-qa.json';
if (process.argv.includes('--install')) {
  const qa = { schemaVersion: 1, wave: manifest.wave, inputHashes: null, forms: [] };
  for (const spec of manifest.packets) {
    const results = await json(`tmp/forms-localization/en/${spec.key}/qa-results.json`);
    if (results.length !== spec.count) throw new Error(`Incomplete render: ${spec.key}`);
    for (const result of results) {
      if (packetById.get(result.id) !== spec.key || result.packetSha256 !== packetHashes.get(result.id)) throw new Error('Stale render');
      if (qa.inputHashes && canonicalCatalog(qa.inputHashes) !== canonicalCatalog(result.inputHashes)) throw new Error('Mixed renderer versions');
      qa.inputHashes = result.inputHashes;
      for (const [path, expected] of Object.entries(result.inputHashes || {})) if (hash(await read(path)) !== expected) throw new Error('Renderer changed after rendering');
      const pdfPath = `tmp/forms-localization/en/${spec.key}/${result.id}.pdf`;
      const pdf = await read(pdfPath);
      if (pdf.length !== result.bytes || hash(pdf) !== result.sha256) throw new Error('Render bytes mismatch');
      await copyFile(new URL(pdfPath, root), new URL(`server/private/forms-en/${result.id}.pdf`, root));
      const { inputHashes: _inputs, ...proof } = result;
      qa.forms.push(proof);
    }
  }
  await writeFile(new URL(qaPath, root), JSON.stringify(qa, null, 2) + '\n');
}
const qa = await json(qaPath);
if (qa.forms.length !== manifest.newCount || new Set(qa.forms.map(f => f.id)).size !== newIds.size || qa.forms.some(f => !newIds.has(f.id))) throw new Error('QA inventory mismatch');
for (const [path, expected] of Object.entries(qa.inputHashes)) if (hash(await read(path)) !== expected) throw new Error(`Stale QA input: ${path}`);
const proofById = new Map(qa.forms.map(f => [f.id, f]));
const forms = [...priorForms];
for (const draft of review.forms) {
  const pdf = await read(`server/private/forms-en/${draft.id}.pdf`), proof = proofById.get(draft.id);
  if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length > 1024 * 1024 || !proof || proof.sha256 !== hash(pdf) || proof.bytes !== pdf.length || proof.packetSha256 !== packetHashes.get(draft.id)) throw new Error(`Stale PDF or translation: ${draft.id}`);
  const { kindLabel, ...metadata } = draft;
  forms.push({ ...metadata, kindCode: draft.kind, kind: kindLabel, status: 'Review draft - not for distribution',
    contentVersion: draft.translationVersion, bytes: pdf.length, sha256: hash(pdf) });
}
for (const form of priorForms) {
  const bytes = await read(`server/private/forms-en/${form.id}.pdf`);
  if (bytes.length !== form.bytes || hash(bytes) !== form.sha256) throw new Error(`Previous PDF changed: ${form.id}`);
}
const files = await readdir(new URL('server/private/forms-en/', root));
if (files.length !== ENGLISH_CURRENT_FORM_IDS.length || files.some(file => !ENGLISH_CURRENT_FORM_IDS.includes(file.slice(0, -4)) || !file.endsWith('.pdf'))) throw new Error('Orphan or missing English file');
const bySource = new Map(forms.map(f => [f.sourceId, f]));
if (bySource.size !== sources.total || forms.length !== manifest.count || sources.forms.some(f => !bySource.has(f.id))) throw new Error('Incomplete final coverage');
const index = { schemaVersion: 1, kind: 'index', version: manifest.version, language: 'en', sourceCatalogVersion: sources.catalogVersion,
  coverage: { available: forms.length, total: sources.total, unavailable: 0 }, ageGroups: previousIndex.ageGroups, parts: [] };
const writing = process.argv.includes('--install') || process.argv.includes('--write');
async function emit(path, value) {
  const output = JSON.stringify(value, null, 2) + '\n';
  if (Buffer.byteLength(JSON.stringify(value)) >= 512 * 1024) throw new Error('Catalog exceeds unchanged transport bound');
  if (writing) await writeFile(new URL(path, root), output);
  else if (await readFile(new URL(path, root), 'utf8') !== output) throw new Error(`Stale release: ${path}`);
}
const pins = {};
if (canonicalCatalog(manifest.tracks) !== canonicalCatalog(sources.tracks)) throw new Error('Track order mismatch');
for (const track of manifest.tracks) {
  const expected = sources.forms.filter(f => f.track === track);
  const part = { version: manifest.version, language: 'en', sourceCatalogVersion: sources.catalogVersion, track, forms: expected.map(f => bySource.get(f.id)) };
  const path = `${manifest.catalogPath}-${track}`, sha256 = hash(canonicalCatalog(part));
  const bytes = Buffer.byteLength(JSON.stringify(part));
  index.parts.push({ path, track, count: part.forms.length, sha256, bytes });
  pins[path] = { language: 'en', version: manifest.version, count: part.forms.length, track, sha256 };
  await emit(`server/private/english-pilot-series-03-${track}.json`, part);
}
pins[manifest.catalogPath] = { language: 'en', version: manifest.version, count: manifest.count, kind: 'index', sha256: hash(canonicalCatalog(index)) };
await emit(`server/private/${manifest.catalogFile}`, index);
const target = new URL('base44/functions/getHebrewFormsPilot/releases.js', root);
const pattern = /\/\/ BEGIN GENERATED ENGLISH SERIES 03 PINS[\s\S]*?\/\/ END GENERATED ENGLISH SERIES 03 PINS/;
const block = '// BEGIN GENERATED ENGLISH SERIES 03 PINS\nconst ENGLISH_SERIES03_RELEASES = Object.freeze(' + JSON.stringify(pins, null, 2) + ');\n// END GENERATED ENGLISH SERIES 03 PINS';
const code = await readFile(target, 'utf8');
if (!pattern.test(code)) throw new Error('Missing final fingerprint block');
if (writing) await writeFile(target, code.replace(pattern, () => block));
else if (code.match(pattern)[0] !== block) throw new Error('Stale final fingerprints');
console.log(`${forms.length}/${sources.total} English drafts; ${manifest.newCount} new verified PDFs; ${priorForms.length} prior entries/PDFs preserved; ${index.parts.length} pinned catalogs; largest ${Math.max(...index.parts.map(p => p.bytes))} bytes`);
