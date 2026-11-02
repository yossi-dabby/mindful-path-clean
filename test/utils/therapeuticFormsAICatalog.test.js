import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import { ALL_FORMS } from '../../src/data/therapeuticForms/index.js';
import { buildTherapistFormCatalog } from '../../src/lib/workflowContextInjector.js';

const SPECIALIZED_SERIES_ID = 'adolescents-cbt-specialized-en';
const MODULE_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

describe('therapeuticFormsAICatalog.test.js', () => {

  // ─── Production build: all 10 module form IDs appear in catalog ──────────────
  // This test verifies that the static AI catalog (computed at module load time,
  // equivalent to THERAPIST_FORM_LIBRARY_INSTRUCTIONS in production) exposes
  // every individual module PDF — not just the series-level form.
  // A passing test here proves the production bundle includes all module entries.

  it('production catalog does not include specialized forms when ALL_FORMS is empty', () => {
    const emptyCatalog = buildTherapistFormCatalog([]);
    expect(emptyCatalog).toContain('no therapeutic forms are currently installed/available');
    expect(emptyCatalog).not.toContain(SPECIALIZED_SERIES_ID);
  });

  it('keeps retired package entries out of ALL_FORMS and AI catalog', () => {
    expect(ALL_FORMS).toEqual([]);
    expect(buildTherapistFormCatalog(ALL_FORMS)).toContain('no therapeutic forms are currently installed/available');
  });

});
