// The illustrated package was removed at the owner's request. Generic future
// ingestion and resolver behavior is covered by therapeuticFormsFutureContent.test.js.
import { describe, it, expect } from 'vitest';
import * as slot from '../../src/data/therapeuticForms/forms.adolescents.cbt-specialized.en.js';

describe('retired package compatibility: forms.adolescents.cbt-specialized.en.js', () => {
  it('keeps every collection export empty and frozen', () => {
    const collections = Object.entries(slot).filter(([name]) => name.startsWith('FORMS_'));
    expect(collections.length).toBeGreaterThan(0);
    for (const [, collection] of collections) {
      expect(collection).toEqual([]);
      expect(Object.isFrozen(collection)).toBe(true);
    }
  });
  it('keeps metadata exports free of retired files and content', () => {
    for (const [name, value] of Object.entries(slot)) {
      if (name.endsWith('_MANIFEST')) {
        expect(value.forms).toEqual([]);
        expect(value.modules).toEqual([]);
      }
      if (name.endsWith('_STATS')) expect(value.totalCount).toBe(0);
      if (name.endsWith('_LOOKUP')) expect(value).toEqual({});
    }
    expect(JSON.stringify(slot)).not.toMatch(/\.pdf|fileUrl|filePath|clinicalKeywords|aiMatchingSummary/);
  });
});
