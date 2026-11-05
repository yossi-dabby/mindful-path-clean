import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { formFamilyId } from '../src/lib/formsLocalization.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(resolve(directory, entry.name)) : [resolve(directory, entry.name)]));
  return nested.flat().sort();
}

export async function auditFormSources() {
  const catalog = JSON.parse(await readFile(resolve(root, 'server/private/hebrew-pilot-series-12-catalog.json'), 'utf8'));
  const paths = await walk(resolve(root, 'content/hebrew-forms'));
  const htmlById = new Map();
  for (const path of paths.filter((path) => /\/forms\/MP-[A-Z0-9-]+-HE\.html$/.test(path))) {
    const id = path.split('/').at(-1).slice(0, -5);
    if (htmlById.has(id)) throw new Error(`Duplicate editable source: ${id}`);
    htmlById.set(id, path);
  }
  const dependencyDigests = {};
  for (const [key, files] of Object.entries({
    original: ['original-v02/print_guard.js', 'original-v02/fonts/DejaVuSans.ttf', 'original-v02/fonts/DejaVuSans-Bold.ttf'],
    expansion: ['mood-01/style.css', 'mood-01/print_guard.js', 'mood-01/fonts/DejaVuSans.ttf', 'mood-01/fonts/DejaVuSans-Bold.ttf'],
  })) {
    dependencyDigests[key] = hash(JSON.stringify(await Promise.all(files.map(async (path) => ({
      path, sha256: hash(await readFile(resolve(root, 'content/hebrew-forms', path))),
    })))));
  }
  const forms = [];
  for (const form of catalog.forms) {
    const path = htmlById.get(form.id);
    if (!path) throw new Error(`Missing editable source: ${form.id}`);
    const pdf = await readFile(resolve(root, `server/private/forms/${form.id}.pdf`));
    if (hash(pdf) !== form.sha256 || pdf.length !== form.bytes) throw new Error(`PDF mismatch: ${form.id}`);
    const original = path.includes('/original-v02/');
    forms.push({ id: form.id, familyId: formFamilyId(form.id), age: form.age,
      track: form.track, unit: form.unit, title: form.title,
      contentVersion: form.contentVersion || (original ? '0.2' : null),
      pdfSha256: form.sha256, htmlPath: relative(root, path), htmlSha256: hash(await readFile(path)),
      dependenciesSha256: dependencyDigests[original ? 'original' : 'expansion'] });
    htmlById.delete(form.id);
  }
  if (htmlById.size) throw new Error('Editable sources missing from the canonical catalog');
  return { schemaVersion: 1, catalogVersion: catalog.version, sourceLanguage: 'he',
    total: forms.length, tracks: [...new Set(forms.map((form) => form.track))],
    editable: forms.length, forms };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const map = await auditFormSources();
  const output = resolve(root, 'content/forms-localization/source-map.json');
  // One record per line keeps a 970-form source map reviewable in diffs.
  const { forms, ...header } = map;
  const text = JSON.stringify(header, null, 2).slice(0, -2) + ',\n  "forms": [\n' +
    forms.map((form) => `    ${JSON.stringify(form)}`).join(',\n') + '\n  ]\n}\n';
  if (process.argv.includes('--write')) await writeFile(output, text);
  else if (await readFile(output, 'utf8') !== text) throw new Error('Source map is stale; run audit-form-sources.mjs --write');
  console.log(`${map.total} forms; ${map.editable} editable sources; ${map.tracks.length} tracks; all PDF hashes verified`);
}
