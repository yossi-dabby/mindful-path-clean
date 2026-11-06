// Install only verified renders, or audit the committed English wave without mutation.
import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { auditFormSources } from './audit-form-sources.mjs';
import { buildTranslationReviewCatalog } from '../src/lib/formsLocalization.js';
import { canonicalCatalog } from '../base44/functions/getHebrewFormsPilot/releases.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = await json('content/forms-localization/waves/en-series-01.json');
const legacy = await json('server/private/english-pilot-mood-03-catalog.json');
const sources = await auditFormSources();
const drafts = [], packetHashes = new Map();
for (const unit of manifest.units) {
  const bytes = await read(`content/forms-localization/en/${unit}.json`);
  const packet = JSON.parse(bytes);
  if (packet.unit.toLowerCase() !== unit || packet.language !== 'en' || packet.forms.length !== 9) throw new Error(`Invalid packet: ${unit}`);
  for (const form of packet.forms) {
    if (form.unit !== packet.unit || form.track !== unit.split('-')[0]) throw new Error('Packet structure mismatch');
    packetHashes.set(form.id, hash(bytes)); drafts.push(form);
  }
}
const review = buildTranslationReviewCatalog(sources, drafts, 'en');
if (review.stale.length || review.forms.length !== manifest.count) throw new Error('English wave needs source review');
const qaPath = 'content/forms-localization/review/en-series-01-qa.json';
const newIds = new Set(drafts.filter(f => !manifest.preserveUnits.includes(f.unit.toLowerCase())).map(f => f.id));
if (newIds.size !== manifest.newCount) throw new Error('Unexpected new form count');
if (process.argv.includes('--install')) {
  const qa = { schemaVersion: 1, wave: manifest.wave, inputHashes: null, forms: [] };
  for (const unit of manifest.units.filter(unit => !manifest.preserveUnits.includes(unit))) {
    const results = await json(`tmp/forms-localization/en/${unit}/qa-results.json`);
    if (results.length !== 9) throw new Error('Incomplete render');
    for (const result of results) {
      if (!newIds.has(result.id) || result.packetSha256 !== packetHashes.get(result.id)) throw new Error('Stale render');
      if (qa.inputHashes && canonicalCatalog(qa.inputHashes) !== canonicalCatalog(result.inputHashes)) throw new Error('Mixed renderer versions');
      qa.inputHashes = result.inputHashes;
      for (const [path, expected] of Object.entries(qa.inputHashes || {})) if (hash(await read(path)) !== expected) throw new Error('Renderer changed after rendering');
      const pdfPath = `tmp/forms-localization/en/${unit}/${result.id}.pdf`;
      const pdf = await read(pdfPath);
      if (pdf.length !== result.bytes || hash(pdf) !== result.sha256) throw new Error('Render bytes mismatch');
      await copyFile(new URL(pdfPath, root), new URL(`server/private/forms-en/${result.id}.pdf`, root));
      const { inputHashes: _inputs, ...formQa } = result;
      qa.forms.push(formQa);
    }
  }
  await writeFile(new URL(qaPath, root), JSON.stringify(qa, null, 2) + '\n');
}
const qa = await json(qaPath);
if (qa.forms.length !== manifest.newCount || new Set(qa.forms.map(f => f.id)).size !== newIds.size || qa.forms.some(f => !newIds.has(f.id))) throw new Error('QA inventory mismatch');
for (const [path, expected] of Object.entries(qa.inputHashes)) if (hash(await read(path)) !== expected) throw new Error(`Stale QA input: ${path}`);
const qaById = new Map(qa.forms.map(f => [f.id, f]));
const catalog = { version: manifest.version, language: 'en', sourceCatalogVersion: sources.catalogVersion,
  coverage: { available: manifest.count, total: sources.total, unavailable: sources.total - manifest.count }, ageGroups: legacy.ageGroups, forms: [] };
for (const draft of review.forms) {
  const pdf = await read(`server/private/forms-en/${draft.id}.pdf`);
  if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length > 1024 * 1024) throw new Error('Invalid PDF');
  const checksum = hash(pdf), proof = qaById.get(draft.id);
  if (newIds.has(draft.id) && (!proof || proof.sha256 !== checksum || proof.bytes !== pdf.length || proof.packetSha256 !== packetHashes.get(draft.id))) throw new Error(`Stale PDF or translation: ${draft.id}`);
  const form = { ...draft, kindCode: draft.kind, kind: { G: 'Therapist guide', W: 'Worksheet', P: 'Practice sheet' }[draft.kind],
    ageLabel: legacy.ageGroups[draft.age].label, audience: draft.age === 'ALL' ? 'Therapist' : `${legacy.ageGroups[draft.age].label} and therapist`,
    status: 'Review draft - not for distribution', contentVersion: draft.translationVersion, bytes: pdf.length, sha256: checksum };
  const prior = legacy.forms.find(f => f.id === form.id);
  if (prior && canonicalCatalog(prior) !== canonicalCatalog(form)) throw new Error(`Installed pilot changed: ${form.id}`);
  catalog.forms.push(form);
}
const files = await readdir(new URL('server/private/forms-en/', root));
if (files.length !== manifest.count || files.some(file => !drafts.some(f => `${f.id}.pdf` === file))) throw new Error('Orphan or missing English file');
if (Buffer.byteLength(JSON.stringify(catalog)) >= 512 * 1024) throw new Error('Catalog exceeds transport bound; split the next release before enlarging it');
const target = new URL(`server/private/${manifest.catalogFile}`, root), output = JSON.stringify(catalog, null, 2) + '\n';
if (process.argv.includes('--write') || process.argv.includes('--install')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error('English wave catalog is stale');
console.log(`${manifest.count} English drafts; ${manifest.newCount} newly verified PDFs; ${Buffer.byteLength(JSON.stringify(catalog))} catalog bytes; SHA-256 ${hash(canonicalCatalog(catalog))}`);
