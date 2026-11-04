import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const readJson = async (path) => JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));

describe('series-04 authored source and review provenance', () => {
  it('produces exactly the planned fourth batch with matching source, catalog, bytes and pending approvals', async () => {
    const [plan, source, forms, review, catalog] = await Promise.all([
      readJson('docs/hebrew-series-stage0/proposed-manifest.json'),
      readJson('content/hebrew-forms/series-04/units.json'),
      readJson('content/hebrew-forms/series-04/forms.json'),
      readJson('content/hebrew-forms/series-04/review.json'),
      readJson('server/private/hebrew-pilot-series-04-catalog.json'),
    ]);
    const plannedIds = plan.forms.filter((f) => f.batch === 4).map((f) => f.id).sort();
    expect(forms.map((f) => f.id).sort()).toEqual(plannedIds);
    expect(review.forms.map((f) => f.id).sort()).toEqual(plannedIds);
    expect(forms.reduce((sum, f) => sum + f.pages, 0)).toBe(120);
    expect(source.units).toHaveLength(10);
    expect(source.planBatch).toBe(4);
    const prompts = source.units.flatMap((unit) => ['worksheet', 'practice'].flatMap((kind) => Object.values(unit[kind]).flat()));
    expect(new Set(prompts).size).toBe(400);
    for (const unit of source.units) {
      expect(unit.fictionalExample).toContain('דוגמה בדויה');
      expect(unit.difficulties.length).toBeGreaterThan(40);
      for (const kind of ['worksheet', 'practice']) {
        for (const age of ['CH', 'TE', 'AD', 'OA']) expect(unit[kind][age]).toHaveLength(5);
        expect(new Set(Object.values(unit[kind]).map((prompts) => JSON.stringify(prompts))).size).toBe(4);
      }
    }
    for (const form of forms) {
      const record = review.forms.find((f) => f.id === form.id);
      expect(record).toMatchObject({ clinicalReviewer: null, clinicalReviewDate: null, rightsReviewer: null, rightsReviewDate: null, ageAdaptationApproved: false, releaseApproved: false });
      const bytes = await readFile(new URL(`../../server/private/forms/${form.id}.pdf`, import.meta.url));
      const hash = createHash('sha256').update(bytes).digest('hex');
      expect(record.technicalQa.sha256).toBe(hash);
      expect(catalog.forms.find((f) => f.id === form.id)).toMatchObject({ sha256: hash, bytes: bytes.length, status: 'טיוטה לסקירה — לא להפצה' });
      const html = await readFile(new URL(`../../content/hebrew-forms/series-04/forms/${form.id}.html`, import.meta.url), 'utf8');
      expect((html.match(/<article class="sheet/g) || []).length).toBe(form.pages);
      expect(html).toContain('טיוטה לסקירה בלבד - לא להפצה');
      expect(html).not.toMatch(/<textarea[^>]*>[^<]+<\/textarea>/);
    }
  });
});
