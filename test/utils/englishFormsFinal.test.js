import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ENGLISH_CURRENT_FORM_IDS, ENGLISH_FINAL_FORM_IDS, ENGLISH_SERIES03_CATALOG_PATH,
  ENGLISH_SERIES03_TRACKS, assembleEnglishCatalog, validatePilotCatalog, isPilotFileId } from '../../base44/functions/getHebrewFormsPilot/releases.js';

const read = path => readFile(new URL(`../../${path}`, import.meta.url));
const json = async path => JSON.parse(await read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const index = await json('server/private/english-pilot-series-03-index.json');
const parts = await Promise.all(ENGLISH_SERIES03_TRACKS.map(track => json(`server/private/english-pilot-series-03-${track}.json`)));
const catalog = assembleEnglishCatalog(index, parts);

describe('Complete English source-linked review library', () => {
  it('covers every Hebrew source exactly once and retains all 648 previously published entries', async () => {
    const source = await json('content/forms-localization/source-map.json');
    expect(await validatePilotCatalog(index, ENGLISH_SERIES03_CATALOG_PATH)).toBe(true);
    expect(catalog.coverage).toEqual({ available: 970, total: 970, unavailable: 0 });
    expect(catalog.forms.map(f => f.id).sort()).toEqual([...ENGLISH_CURRENT_FORM_IDS].sort());
    expect(catalog.forms.map(f => f.sourceId).sort()).toEqual(source.forms.map(f => f.id).sort());
    expect(new Set(catalog.forms.map(f => f.sourceId)).size).toBe(970);
    expect(parts).toHaveLength(17);
    for (let i = 0; i < parts.length; i++) {
      expect(await validatePilotCatalog(parts[i], index.parts[i].path)).toBe(true);
      expect(Buffer.byteLength(JSON.stringify(parts[i]))).toBe(index.parts[i].bytes);
      expect(index.parts[i].bytes).toBeLessThan(512 * 1024);
    }
    const previous = await json('server/private/english-pilot-series-02-index.json');
    for (const spec of previous.parts) {
      const part = await json(`server/private/english-pilot-series-02-${spec.track}.json`);
      for (const prior of part.forms) expect(catalog.forms.find(f => f.id === prior.id)).toEqual(prior);
    }
  });

  it('preserves shared forms, shorter Core units and the child-only 6–7 pathway without fabricated variants', () => {
    const count = track => catalog.forms.filter(f => f.track === track).length;
    expect(['shared', 'core', 'anxiety', 'ocd', 'trauma'].map(count)).toEqual([36, 64, 54, 96, 72]);
    for (const unit of ['CORE-01', 'CORE-08']) {
      expect(catalog.forms.filter(f => f.unit === unit).map(f => `${f.kindCode}-${f.age}`).sort())
        .toEqual(['G-ALL', 'P-AD', 'P-CH', 'P-OA', 'P-TE']);
      expect(isPilotFileId(`MP-${unit}-W-CH-EN`)).toBe(false);
    }
    const young = catalog.forms.filter(f => f.unit.startsWith('OCDYC-'));
    expect(young).toHaveLength(24);
    expect(new Set(young.map(f => f.age))).toEqual(new Set(['CH']));
    for (const form of young) expect(`${form.ageLabel} ${form.audience}`).toContain('6–7');
    for (const age of ['TE', 'AD', 'OA', 'ALL']) expect(isPilotFileId(`MP-OCDYC-01-G-${age}-EN`)).toBe(false);
    expect(catalog.forms.filter(f => f.track === 'shared').map(f => f.unitTitle))
      .toEqual(expect.arrayContaining(['Getting started', 'Assessment', 'Sessions and follow-up']));
    for (const form of catalog.forms) for (const field of ['title', 'unitTitle', 'kind', 'ageLabel', 'audience']) {
      expect(form[field]).not.toMatch(/[\u0590-\u05ff]/);
    }
  });

  it('binds 322 new PDFs and 436 A4 pages to source fingerprints and rendering proofs', async () => {
    const manifest = await json('content/forms-localization/waves/en-series-03.json');
    const source = await json('content/forms-localization/source-map.json');
    const qa = await json('content/forms-localization/review/en-series-03-qa.json');
    expect(manifest.packets).toHaveLength(41);
    expect(qa.forms).toHaveLength(322);
    expect(qa.forms.map(f => f.id).sort()).toEqual([...ENGLISH_FINAL_FORM_IDS].sort());
    expect(qa.forms.reduce((sum, f) => sum + f.pages, 0)).toBe(436);
    for (const [path, expected] of Object.entries(qa.inputHashes)) expect(hash(await read(path))).toBe(expected);
    for (const spec of manifest.packets) {
      const bytes = await read(`content/forms-localization/en/${spec.key}.json`), packet = JSON.parse(bytes);
      expect(packet.forms).toHaveLength(spec.count);
      for (const value of Object.values(packet.strings)) expect(value).not.toMatch(/[\u0590-\u05ff]/);
      for (const draft of packet.forms) {
        const original = source.forms.find(f => f.id === draft.sourceId), form = catalog.forms.find(f => f.id === draft.id);
        expect(form).toMatchObject({ sourceVersion: original.contentVersion, sourcePdfSha256: original.pdfSha256,
          sourceHtmlSha256: original.htmlSha256, sourceDependenciesSha256: original.dependenciesSha256,
          age: original.age, unit: original.unit, track: original.track,
          review: { translation: 'draft', clinical: 'pending', rights: 'pending', reviewer: null, reviewedAt: null } });
        const pdf = await read(`server/private/forms-en/${form.id}.pdf`);
        expect(hash(pdf)).toBe(form.sha256); expect(pdf.length).toBe(form.bytes);
        expect(qa.forms.find(f => f.id === form.id)).toMatchObject({ sha256: form.sha256, bytes: form.bytes,
          sourceId: form.sourceId, packetSha256: hash(bytes), pages: draft.kind === 'G' ? 4 : 1 });
      }
    }
    expect(execFileSync(process.execPath, ['scripts/build-english-final.mjs'], { encoding: 'utf8' })).toContain('970/970 English drafts; 322 new verified PDFs; 648 prior entries/PDFs preserved');
  });

  it('rejects mixed releases, missing/duplicate parts, tampering and invented child-age variants', async () => {
    const corrupt = structuredClone(parts[0]); corrupt.forms[0].title += '!';
    expect(await validatePilotCatalog(corrupt, index.parts[0].path)).toBe(false);
    const mutations = [
      (_i, p) => p.pop(),
      (_i, p) => { p[1] = p[0]; },
      i => { i.version = '0.3-en-series-02'; },
      i => { i.coverage.unavailable = 1; },
      i => { i.parts[0].bytes = 512 * 1024; },
      (i, p) => { p[0].forms[0].id = 'MP-OCDYC-01-G-ALL-EN'; i.parts[0].bytes = Buffer.byteLength(JSON.stringify(p[0])); },
      (i, p) => { p[0].forms[1].sourceId = p[0].forms[0].sourceId; i.parts[0].bytes = Buffer.byteLength(JSON.stringify(p[0])); },
    ];
    for (const mutate of mutations) {
      const i = structuredClone(index), p = structuredClone(parts); mutate(i, p);
      expect(() => assembleEnglishCatalog(i, p)).toThrow('PILOT_INVALID');
    }
  });
});
