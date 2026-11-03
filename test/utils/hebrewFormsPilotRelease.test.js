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
    for (const [path, catalog] of [['catalog', pilot.catalog], ['catalog-mood-01', pilot.expandedCatalog]]) {
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
});
