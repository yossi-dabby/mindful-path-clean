import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ENGLISH_CURRENT_FORM_IDS, ENGLISH_SERIES02_FORM_IDS, ENGLISH_SERIES02_CATALOG_PATH, ENGLISH_SERIES02_TRACKS,
  assembleEnglishCatalog, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

const read = path => readFile(new URL(`../../${path}`, import.meta.url));
const json = async path => JSON.parse(await read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const index = await json('server/private/english-pilot-series-02-index.json');
const parts = await Promise.all(ENGLISH_SERIES02_TRACKS.map(track => json(`server/private/english-pilot-series-02-${track}.json`)));

describe('English series 02 complete split release', () => {
  it('pins twelve bounded catalogs and all 648 source-linked forms, preserving the published 270', async () => {
    expect(await validatePilotCatalog(index, ENGLISH_SERIES02_CATALOG_PATH)).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(index))).toBeLessThan(512 * 1024);
    const catalog = assembleEnglishCatalog(index, parts);
    expect(catalog.coverage).toEqual({ available: 648, total: 970, unavailable: 322 });
    expect(catalog.forms.map(f => f.id).sort()).toEqual([...ENGLISH_SERIES02_FORM_IDS].sort());
    const previous = await json('server/private/english-pilot-series-01-catalog.json');
    for (const form of previous.forms) expect(catalog.forms.find(f => f.id === form.id)).toEqual(form);
    for (let i = 0; i < parts.length; i++) {
      expect(await validatePilotCatalog(parts[i], index.parts[i].path)).toBe(true);
      expect(parts[i].forms).toHaveLength(54);
      expect(Buffer.byteLength(JSON.stringify(parts[i]))).toBe(index.parts[i].bytes);
      expect(index.parts[i].bytes).toBeLessThan(512 * 1024);
      expect(new Set(parts[i].forms.map(f => f.unit)).size).toBe(6);
    }
    const names = await readdir(new URL('../../server/private/forms-en/', import.meta.url));
    expect(names.sort()).toEqual(ENGLISH_CURRENT_FORM_IDS.map(id => `${id}.pdf`).sort());
  });

  it('binds all 378 new PDFs and 504 pages to the current editable sources and unchanged renderer', async () => {
    const manifest = await json('content/forms-localization/waves/en-series-02.json');
    const qa = await json('content/forms-localization/review/en-series-02-qa.json');
    const source = await json('server/private/hebrew-pilot-series-12-catalog.json');
    const catalog = assembleEnglishCatalog(index, parts);
    const units = manifest.units.filter(unit => !manifest.preserveUnits.includes(unit));
    expect(units).toHaveLength(42); expect(qa.forms).toHaveLength(378);
    expect(new Set(qa.forms.map(f => f.id)).size).toBe(378);
    expect(qa.forms.reduce((sum, f) => sum + f.pages, 0)).toBe(504);
    for (const [path, expected] of Object.entries(qa.inputHashes)) expect(hash(await read(path))).toBe(expected);
    for (const unit of units) {
      const bytes = await read(`content/forms-localization/en/${unit}.json`), packet = JSON.parse(bytes);
      const forms = catalog.forms.filter(f => f.unit.toLowerCase() === unit);
      expect(forms.map(f => `${f.kindCode}-${f.age}`).sort()).toEqual(['G-ALL', 'P-CH', 'P-TE', 'P-AD', 'P-OA', 'W-CH', 'W-TE', 'W-AD', 'W-OA'].sort());
      for (const value of Object.values(packet.strings)) expect(value).not.toMatch(/[\u0590-\u05ff]/);
      for (const form of forms) {
        const original = source.forms.find(f => f.id === form.sourceId);
        expect(form).toMatchObject({ language: 'en', track: original.track, unit: original.unit, age: original.age,
          sourceVersion: original.contentVersion, sourcePdfSha256: original.sha256,
          review: { translation: 'draft', clinical: 'pending', rights: 'pending', reviewer: null, reviewedAt: null } });
        const pdf = await read(`server/private/forms-en/${form.id}.pdf`);
        expect(hash(pdf)).toBe(form.sha256); expect(pdf.length).toBe(form.bytes);
        expect(qa.forms.find(f => f.id === form.id)).toMatchObject({ sha256: form.sha256, bytes: form.bytes,
          sourceId: form.sourceId, packetSha256: hash(bytes), pages: form.kindCode === 'G' ? 4 : 1 });
      }
    }
    expect(execFileSync(process.execPath, ['scripts/build-english-wave.mjs', '--wave=series-02'], { encoding: 'utf8' }))
      .toContain('648 English drafts; 378 newly verified PDFs; 12 independently pinned catalogs');
  });

  it('rejects tampering, mixed versions, missing or duplicate parts and duplicate source links', async () => {
    const badIndex = structuredClone(index); badIndex.parts[0].sha256 = '0'.repeat(64);
    expect(await validatePilotCatalog(badIndex, ENGLISH_SERIES02_CATALOG_PATH)).toBe(false);
    const tampered = structuredClone(parts[0]); tampered.forms[0].title += '!';
    expect(await validatePilotCatalog(tampered, index.parts[0].path)).toBe(false);
    const mutations = [
      (i, p) => { p.pop(); },
      (i, p) => { p[1] = p[0]; },
      (i, p) => { p[0] = null; },
      i => { i.parts[0] = null; },
      i => { i.coverage.available--; },
      i => { i.coverage.unavailable++; },
      i => { i.parts[0].bytes = 512 * 1024; },
      (i, p) => { p[0].version = '0.2-en-series-01'; },
      (i, p) => { p[0].forms[1] = p[0].forms[0]; i.parts[0].bytes = Buffer.byteLength(JSON.stringify(p[0])); },
      (i, p) => { p[0].forms[1].sourceId = p[0].forms[0].sourceId; i.parts[0].bytes = Buffer.byteLength(JSON.stringify(p[0])); },
    ];
    for (const mutate of mutations) {
      const i = structuredClone(index), p = structuredClone(parts); mutate(i, p);
      expect(() => assembleEnglishCatalog(i, p)).toThrow('PILOT_INVALID');
    }
  });
});
