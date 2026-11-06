import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ENGLISH_SERIES01_FORM_IDS, ENGLISH_SERIES01_CATALOG_PATH, isPilotFileId, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

const read = path => readFile(new URL(`../../${path}`, import.meta.url));
const json = async path => JSON.parse(await read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

describe('English series 01 inventory and source/render provenance', () => {
  it('binds 270 drafts to 30 complete units and preserves all nine published English files', async () => {
    const catalog = await json('server/private/english-pilot-series-01-catalog.json');
    const legacy = await json('server/private/english-pilot-mood-03-catalog.json');
    const manifest = await json('content/forms-localization/waves/en-series-01.json');
    const qa = await json('content/forms-localization/review/en-series-01-qa.json');
    expect(await validatePilotCatalog(catalog, ENGLISH_SERIES01_CATALOG_PATH)).toBe(true);
    expect(catalog.coverage).toEqual({ available: 270, total: 970, unavailable: 700 });
    expect(Buffer.byteLength(JSON.stringify(catalog))).toBeLessThan(512 * 1024);
    expect(new Set(ENGLISH_SERIES01_FORM_IDS).size).toBe(270);
    expect(catalog.forms.map(f => f.id).sort()).toEqual([...ENGLISH_SERIES01_FORM_IDS].sort());
    expect(manifest.units).toHaveLength(30);
    expect(qa.forms).toHaveLength(261);
    expect(qa.forms.reduce((sum, f) => sum + f.pages, 0)).toBe(348);
    for (const [path, expected] of Object.entries(qa.inputHashes)) expect(hash(await read(path))).toBe(expected);
    for (const unit of manifest.units) {
      const bytes = await read(`content/forms-localization/en/${unit}.json`);
      const packet = JSON.parse(bytes);
      const forms = catalog.forms.filter(f => f.unit.toLowerCase() === unit);
      expect(forms.map(f => `${f.kindCode}-${f.age}`).sort()).toEqual(['G-ALL', 'W-CH', 'W-TE', 'W-AD', 'W-OA', 'P-CH', 'P-TE', 'P-AD', 'P-OA'].sort());
      for (const value of Object.values(packet.strings)) expect(value).not.toMatch(/[\u0590-\u05ff]/);
      for (const form of forms) {
        expect(form.review).toEqual({ translation: 'draft', clinical: 'pending', rights: 'pending', reviewer: null, reviewedAt: null });
        const pdf = await read(`server/private/forms-en/${form.id}.pdf`);
        expect(hash(pdf)).toBe(form.sha256); expect(pdf.length).toBe(form.bytes);
        const old = legacy.forms.find(f => f.id === form.id);
        if (old) expect(form).toEqual(old);
        else expect(qa.forms.find(f => f.id === form.id)).toMatchObject({ sha256: form.sha256, bytes: form.bytes, sourceId: form.sourceId, packetSha256: hash(bytes), pages: form.kindCode === 'G' ? 4 : 1 });
      }
    }
    const names = await readdir(new URL('../../server/private/forms-en/', import.meta.url));
    expect(names.sort()).toEqual(catalog.forms.map(f => `${f.id}.pdf`).sort());
    for (const id of ['MP-SOC-01-W-CH-EN', 'MP-EXEC-07-W-CH-EN', 'MP-EXEC-01-W-ALL-EN', '../MP-EXEC-01-W-CH-EN']) expect(isPilotFileId(id)).toBe(false);
  });

  it('reconstructs the release only from current source fingerprints and verified renders', () => {
    expect(execFileSync(process.execPath, ['scripts/build-english-wave.mjs'], { encoding: 'utf8' })).toContain('270 English drafts; 261 newly verified PDFs');
  });
});
