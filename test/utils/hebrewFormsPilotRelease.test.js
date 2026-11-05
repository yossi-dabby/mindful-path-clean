import { beforeAll, describe, expect, it } from 'vitest';
import { loadPilot } from '../../server/hebrew-pilot.mjs';
import { canonicalCatalog, validatePilotCatalog } from '../../base44/functions/getHebrewFormsPilot/releases.js';

describe('pinned Hebrew catalog releases', () => {
  let pilot;
  beforeAll(async () => { pilot = await loadPilot(); });

  it('preserves every original record/hash and adds exactly the nine planned variants', () => {
    expect(pilot.catalog.forms).toHaveLength(154);
    expect(pilot.expandedCatalog.forms).toHaveLength(163);
    expect(pilot.expandedCatalog.forms.slice(0, 154)).toEqual(pilot.catalog.forms);
    const additions = pilot.expandedCatalog.forms.slice(154);
    expect(additions.map((f) => f.id).sort()).toEqual([
      'MP-MOOD-01-G-ALL-HE', ...['P', 'W'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-MOOD-01-${kind}-${age}-HE`)),
    ].sort());
    expect(additions.filter((f) => f.age === 'ALL')).toHaveLength(1);
    expect(additions.every((f) => f.track === 'mood' && f.unit === 'MOOD-01' && f.contentVersion === '0.1')).toBe(true);
  });

  it('accepts only the pinned release, including metadata, membership and file fingerprints', async () => {
    for (const [path, catalog] of Object.entries(pilot.catalogs)) {
      expect(await validatePilotCatalog(catalog, path)).toBe(true);
      const mutations = [
        (c) => { c.version = 'arbitrary'; },
        (c) => { c.forms.pop(); },
        (c) => { c.forms[1] = c.forms[0]; },
        (c) => { c.forms[0].id = 'MP-UNKNOWN-HE'; },
        (c) => { c.forms[0].sha256 = '0'.repeat(64); },
        (c) => { c.forms[0].bytes++; },
        (c) => { c.forms[0].title = 'Changed title'; },
        (c) => { c.forms[0].track = 'other'; },
        (c) => { c.ageGroups.CH.label = 'Wrong age'; },
      ];
      for (const mutate of mutations) {
        const altered = structuredClone(catalog); mutate(altered);
        expect(await validatePilotCatalog(altered, path)).toBe(false);
      }
    }
    expect(await validatePilotCatalog(pilot.expandedCatalog, 'catalog')).toBe(false);
    expect(await validatePilotCatalog(pilot.catalog, 'catalog-mood-01')).toBe(false);
    expect(await validatePilotCatalog(pilot.catalog, '__proto__')).toBe(false);
    expect(canonicalCatalog({ b: 1, a: [2, 1] })).toBe(canonicalCatalog({ a: [2, 1], b: 1 }));
  });

  it('preserves all 163 installed records and adds exactly six complete age-adapted units', async () => {
    expect(pilot.p3Catalog.forms).toHaveLength(217);
    expect(pilot.p3Catalog.forms.slice(0, 163)).toEqual(pilot.expandedCatalog.forms);
    const additions = pilot.p3Catalog.forms.slice(163);
    const units = ['MOOD-02', 'SELF-01', 'PERF-01', 'REG-01', 'EXEC-01', 'SOC-01'];
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['P', 'W'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    for (const unit of units) {
      const forms = additions.filter((f) => f.unit === unit);
      expect(forms).toHaveLength(9);
      expect(forms.filter((f) => f.age === 'ALL')).toHaveLength(1);
      expect(forms.every((f) => f.track === unit.split('-')[0].toLowerCase() && f.contentVersion === '0.1')).toBe(true);
    }
    for (const [path, catalog] of Object.entries(pilot.catalogs)) {
      for (const otherPath of Object.keys(pilot.catalogs).filter((p) => p !== path)) {
        expect(await validatePilotCatalog(catalog, otherPath)).toBe(false);
      }
    }
    // Fits the unchanged Base44 bounded reader with ample headroom.
    expect(new TextEncoder().encode(JSON.stringify(pilot.p3Catalog)).length).toBeLessThan(512 * 1024);
  });
  it('pins p4-01: preserves 217 records and adds four complete units', () => {
    expect(pilot.p4aCatalog.forms).toHaveLength(253);
    expect(pilot.p4aCatalog.forms.slice(0, 217)).toEqual(pilot.p3Catalog.forms);
    const units = ["SLEEP-01", "CHANGE-01", "FAMILY-01", "SCREEN-01"];
    const additions = pilot.p4aCatalog.forms.slice(217);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status.includes('לא להפצה'))).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.p4aCatalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins p4-02: preserves 253 records and adds four complete units', () => {
    expect(pilot.p4bCatalog.forms).toHaveLength(289);
    expect(pilot.p4bCatalog.forms.slice(0, 253)).toEqual(pilot.p4aCatalog.forms);
    const units = ["SHAME-01", "MEANING-01", "OCD-01", "TRAUMA-01"];
    const additions = pilot.p4bCatalog.forms.slice(253);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status.includes('לא להפצה'))).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.p4bCatalog)).length).toBeLessThan(512 * 1024);
  });

  it('keeps specialized preparation distinct and child age limits explicit', () => {
    const forms = pilot.p4bCatalog.forms;
    for (const unit of ['OCD-01', 'TRAUMA-01']) {
      const preparation = forms.filter((f) => f.unit === unit && f.id.includes('-P-'));
      expect(preparation).toHaveLength(4);
      expect(preparation.every((f) => f.kind === 'הכנה לפגישה')).toBe(true);
    }
    expect(forms.filter((f) => f.unit === 'OCD-01' && f.age === 'CH').every((f) => f.ageLabel.includes('8 עד 11'))).toBe(true);
    expect(forms.filter((f) => f.unit === 'FAMILY-01' && ['AD', 'OA'].includes(f.age)).every((f) => f.audience.includes('מלווה'))).toBe(true);
  });

  it('pins series-01: preserves all 289 installed records and adds the nine planned continuation units', () => {
    expect(pilot.series01Catalog.forms).toHaveLength(370);
    expect(pilot.series01Catalog.forms.slice(0, 289)).toEqual(pilot.p4bCatalog.forms);
    const units = ['MOOD-03', 'MOOD-04', 'MOOD-05', 'MOOD-06', 'SELF-02', 'SELF-03', 'SELF-04', 'SELF-05', 'SELF-06'];
    const additions = pilot.series01Catalog.forms.slice(289);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series01Catalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins series-02: preserves 370 installed records and adds the ten planned units', () => {
    expect(pilot.series02Catalog.forms).toHaveLength(460);
    expect(pilot.series02Catalog.forms.slice(0, 370)).toEqual(pilot.series01Catalog.forms);
    const units = ['PERF-02', 'PERF-03', 'PERF-04', 'PERF-05', 'PERF-06', 'REG-02', 'REG-03', 'REG-04', 'REG-05', 'REG-06'];
    const additions = pilot.series02Catalog.forms.slice(370);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series02Catalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins series-03: preserves 460 installed records and adds the ten planned units', () => {
    expect(pilot.series03Catalog.forms).toHaveLength(550);
    expect(pilot.series03Catalog.forms.slice(0, 460)).toEqual(pilot.series02Catalog.forms);
    const units = ['EXEC-02', 'EXEC-03', 'EXEC-04', 'EXEC-05', 'EXEC-06', 'SOC-02', 'SOC-03', 'SOC-04', 'SOC-05', 'SOC-06'];
    const additions = pilot.series03Catalog.forms.slice(460);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series03Catalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins series-04: preserves 550 installed records and adds the ten planned units', () => {
    expect(pilot.series04Catalog.forms).toHaveLength(640);
    expect(pilot.series04Catalog.forms.slice(0, 550)).toEqual(pilot.series03Catalog.forms);
    const units = ['SLEEP-02', 'SLEEP-03', 'SLEEP-04', 'SLEEP-05', 'SLEEP-06', 'CHANGE-02', 'CHANGE-03', 'CHANGE-04', 'CHANGE-05', 'CHANGE-06'];
    const additions = pilot.series04Catalog.forms.slice(550);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series04Catalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins series-06: preserves 730 installed records and adds the ten planned units', () => {
    expect(pilot.series06Catalog.forms).toHaveLength(820);
    expect(pilot.series06Catalog.forms.slice(0, 730)).toEqual(pilot.series05Catalog.forms);
    const units = ['SHAME-02', 'SHAME-03', 'SHAME-04', 'SHAME-05', 'SHAME-06', 'MEANING-02', 'MEANING-03', 'MEANING-04', 'MEANING-05', 'MEANING-06'];
    const additions = pilot.series06Catalog.forms.slice(730);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series06Catalog)).length).toBeLessThan(512 * 1024);
  });

  it('pins series-05: preserves 640 installed records and adds the ten planned units', () => {
    expect(pilot.series05Catalog.forms).toHaveLength(730);
    expect(pilot.series05Catalog.forms.slice(0, 640)).toEqual(pilot.series04Catalog.forms);
    const units = ['FAMILY-02', 'FAMILY-03', 'FAMILY-04', 'FAMILY-05', 'FAMILY-06', 'SCREEN-02', 'SCREEN-03', 'SCREEN-04', 'SCREEN-05', 'SCREEN-06'];
    const additions = pilot.series05Catalog.forms.slice(640);
    expect(additions.map((f) => f.id).sort()).toEqual(units.flatMap((unit) => [
      `MP-${unit}-G-ALL-HE`, ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit}-${kind}-${age}-HE`)),
    ]).sort());
    expect(additions.every((f) => f.contentVersion === '0.1' && f.status === 'טיוטה לסקירה — לא להפצה')).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(pilot.series05Catalog)).length).toBeLessThan(512 * 1024);
  });

});
