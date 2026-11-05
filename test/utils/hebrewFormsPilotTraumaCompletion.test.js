import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadPilot } from '../../server/hebrew-pilot.mjs';

const json = async (path) => JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));

describe('TRAUMA batches 11–12 original review drafts', () => {
  it('preserves 907 records and completes the exact 63 planned files without inferring approval', async () => {
    const pilot = await loadPilot();
    const plan = await json('docs/hebrew-series-stage0/proposed-manifest.json');
    expect(pilot.series12Catalog.forms.slice(0, 907)).toEqual(pilot.series10Catalog.forms);
    let pages = 0;
    for (const [wave, count, previous] of [[11, 934, 907], [12, 970, 934]]) {
      const [source, forms, review] = await Promise.all(['units', 'forms', 'review'].map((name) => json(`content/hebrew-forms/series-${wave}/${name}.json`)));
      const catalog = pilot[`series${wave}Catalog`];
      const planned = plan.forms.filter((form) => form.batch === wave).map((form) => form.id).sort();
      expect(catalog.forms).toHaveLength(count);
      expect(catalog.forms.slice(0, previous)).toEqual(pilot[`series${wave - 1}Catalog`].forms);
      for (const collection of [forms, review.forms, catalog.forms.slice(previous)]) expect(collection.map((form) => form.id).sort()).toEqual(planned);
      expect(new TextEncoder().encode(JSON.stringify(catalog)).length).toBeLessThan(512 * 1024);
      expect(source.planBatch).toBe(wave);
      for (const unit of source.units) {
        expect(unit.manualMappingApproved).toBe(false);
        expect(unit.contentScope).toContain('support_draft_not_manual_or_trauma_processing_instructions');
        expect(unit.fictionalExample).toContain('דוגמה בדויה');
        expect(unit.guideWorkSections[0].title).toContain('TF-CBT');
        expect(unit.guideWorkSections[1].title).toContain('CPT');
        const members = forms.filter((form) => form.unit === unit.code);
        expect(members.map((form) => form.id).sort()).toEqual([
          `MP-${unit.code}-G-ALL-HE`,
          ...['W', 'P'].flatMap((kind) => ['CH', 'TE', 'AD', 'OA'].map((age) => `MP-${unit.code}-${kind}-${age}-HE`)),
        ].sort());
        for (const kind of ['worksheet', 'practice']) {
          expect(Object.keys(unit[kind])).toEqual(['CH', 'TE', 'AD', 'OA']);
          expect(new Set(Object.values(unit[kind]).map(JSON.stringify)).size).toBe(4);
          for (const age of ['CH', 'TE', 'AD', 'OA']) expect(unit[kind][age]).toHaveLength(5);
        }
      }
      for (const form of forms) {
        pages += form.pages;
        expect(form.pages).toBe(form.kind === 'G' ? 4 : 1);
        const record = review.forms.find((item) => item.id === form.id);
        expect(record).toMatchObject({ clinicalReviewer: null, clinicalReviewDate: null, rightsReviewer: null, rightsReviewDate: null, ageAdaptationApproved: false, releaseApproved: false, manualMappingApproved: false });
        const bytes = pilot.files.get(form.id);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        expect(record.technicalQa).toMatchObject({ sha256, blankPdf: true, a4: true, expectedPages: form.pages, renderedPageReview: 'passed', shortFictionalAnswer: form.kind === 'G' ? 'not_applicable' : 'passed', longAnswerPrintBlockedAndExportPreserved: form.kind === 'G' ? 'not_applicable' : 'passed' });
        expect(catalog.forms.find((item) => item.id === form.id)).toMatchObject({ sha256, bytes: bytes.length, status: 'טיוטה לסקירה — לא להפצה' });
        const html = await readFile(new URL(`../../content/hebrew-forms/series-${wave}/forms/${form.id}.html`, import.meta.url), 'utf8');
        expect((html.match(/<article class="sheet/g) || []).length).toBe(form.pages);
        expect(html).toContain('טיוטה לסקירה בלבד - לא להפצה');
      }
    }
    expect(pages).toBe(84);
    expect(pilot.files.size).toBe(970);
    for (const age of ['CH', 'TE', 'AD', 'OA']) {
      const forms = pilot.series12Catalog.forms.filter((form) => form.track === 'trauma' && [age, 'ALL'].includes(form.age));
      expect(new Set(forms.map((form) => form.unit)).size).toBe(8);
      expect(forms).toHaveLength(24);
    }
  });
});
