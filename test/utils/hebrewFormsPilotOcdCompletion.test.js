import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadPilot } from '../../server/hebrew-pilot.mjs';
const json = async (path) => JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));

describe('OCD batches 7–10 original review drafts', () => {
  it('preserves all 820 records and adds exactly the planned 87 IDs with separate young-child membership', async () => {
    const pilot = await loadPilot();
    const plan = await json('docs/hebrew-series-stage0/proposed-manifest.json');
    expect(pilot.series10Catalog.forms.slice(0, 820)).toEqual(pilot.series06Catalog.forms);
    let totalPages = 0;
    for (const [wave, count, previous] of [[7, 847, 820], [8, 883, 847], [9, 895, 883], [10, 907, 895]]) {
      const key = String(wave).padStart(2, '0');
      const [source, forms, review] = await Promise.all(['units', 'forms', 'review'].map((name) => json(`content/hebrew-forms/series-${key}/${name}.json`)));
      const catalog = pilot[`series${key}Catalog`];
      expect(catalog.forms).toHaveLength(count);
      expect(catalog.forms.slice(0, previous)).toEqual(pilot[`series${String(wave - 1).padStart(2, '0')}Catalog`].forms);
      const planned = plan.forms.filter((f) => f.batch === wave).map((f) => f.id).sort();
      expect(forms.map((f) => f.id).sort()).toEqual(planned);
      expect(catalog.forms.slice(previous).map((f) => f.id).sort()).toEqual(planned);
      expect(review.forms.map((f) => f.id).sort()).toEqual(planned);
      expect(new TextEncoder().encode(JSON.stringify(catalog)).length).toBeLessThan(512 * 1024);
      expect(source.planBatch).toBe(wave);
      for (const unit of source.units) {
        expect(unit.manualMappingApproved).toBe(false);
        expect(unit.contentScope).toContain('support_draft_not_manual_or_erp_instructions');
        expect(unit.fictionalExample).toContain('דוגמה בדויה');
        const ages = wave >= 9 ? ['CH'] : ['CH', 'TE', 'AD', 'OA'];
        for (const kind of ['worksheet', 'practice']) {
          expect(Object.keys(unit[kind])).toEqual(ages);
          for (const age of ages) expect(unit[kind][age]).toHaveLength(5);
          expect(new Set(Object.values(unit[kind]).map(JSON.stringify)).size).toBe(ages.length);
        }
        if (wave >= 9) {
          expect(unit.guideAge).toBe('CH');
          expect(unit.practice.CH.slice(0, 2).every((p) => p.startsWith('לילד:'))).toBe(true);
          expect(unit.practice.CH.slice(2).every((p) => p.startsWith('למלווה:'))).toBe(true);
        }
      }
      for (const form of forms) {
        totalPages += form.pages;
        const record = review.forms.find((f) => f.id === form.id);
        expect(record).toMatchObject({ clinicalReviewer: null, clinicalReviewDate: null, rightsReviewer: null, rightsReviewDate: null, ageAdaptationApproved: false, releaseApproved: false, manualMappingApproved: false });
        const bytes = pilot.files.get(form.id);
        const hash = createHash('sha256').update(bytes).digest('hex');
        expect(record.technicalQa).toMatchObject({ sha256: hash, blankPdf: true, a4: true, expectedPages: form.pages, renderedPageReview: 'passed' });
        expect(catalog.forms.find((f) => f.id === form.id)).toMatchObject({ sha256: hash, bytes: bytes.length, status: 'טיוטה לסקירה — לא להפצה' });
        const html = await readFile(new URL(`../../content/hebrew-forms/series-${key}/forms/${form.id}.html`, import.meta.url), 'utf8');
        expect((html.match(/<article class="sheet/g) || []).length).toBe(form.pages);
        expect(html).toContain('טיוטה לסקירה בלבד - לא להפצה');
        if (wave >= 9) expect(form.age).toBe('CH');
      }
    }
    expect(totalPages).toBe(132);
    const young = pilot.series10Catalog.forms.filter((f) => f.unit.startsWith('OCDYC-'));
    expect(young).toHaveLength(24);
    expect(young.every((f) => f.age === 'CH' && f.ageLabel.includes('6–7'))).toBe(true);
    for (const age of ['TE', 'AD', 'OA']) {
      expect(pilot.series10Catalog.forms.filter((f) => (f.age === age || f.age === 'ALL') && f.unit.startsWith('OCDYC-'))).toEqual([]);
    }
  });
});
