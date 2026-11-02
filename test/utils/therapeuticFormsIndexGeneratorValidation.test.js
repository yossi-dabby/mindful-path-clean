import { describe, it, expect } from 'vitest';
import { applyVariantMetadata, validateEntries } from '../../scripts/generate-therapeutic-forms-index.mjs';

const VALID_FILE_PATH = 'public/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf';

function buildEntry(overrides = {}) {
  return {
    id: 'fixture-form-en-1',
    title: 'Fixture Form',
    language: 'en',
    audience: 'adolescents',
    category: 'adolescents_cbt_core',
    filePath: VALID_FILE_PATH,
    file_path: VALID_FILE_PATH,
    therapeuticGoal: 'Support structured CBT practice.',
    whenToUse: 'Use when a teen asks for a CBT worksheet.',
    clinicalKeywords: ['cbt', 'teen'],
    collectionId: 'adolescents-cbt-core-en',
    collectionType: 'core',
    cardType: 'worksheet',
    clinicalDomain: 'general_cbt',
    displayOrder: 1_001_004,
    parentId: 'adolescents-cbt-core-en-stage-01',
    isCombinedPdf: false,
    ...overrides,
  };
}

describe('therapeutic forms index generator validation', () => {
  it('accepts a valid entry', () => {
    expect(() => validateEntries([buildEntry()], { fileExists: () => true })).not.toThrow();
  });

  it('fails on duplicate IDs', () => {
    const a = buildEntry({ id: 'duplicate-id' });
    const b = buildEntry({ id: 'duplicate-id', filePath: 'public/forms/en/adolescents/cbt-core/stage-01/01-01-what-is-going-on-for-me-right-now.pdf', file_path: 'public/forms/en/adolescents/cbt-core/stage-01/01-01-what-is-going-on-for-me-right-now.pdf' });
    expect(() => validateEntries([a, b])).toThrow(/Duplicate therapeutic form id: duplicate-id/);
  });

  it('fails on missing file paths', () => {
    const broken = buildEntry({
      id: 'missing-file',
      filePath: 'public/forms/en/adolescents/cbt-core/does-not-exist.pdf',
      file_path: 'public/forms/en/adolescents/cbt-core/does-not-exist.pdf',
    });
    expect(() => validateEntries([broken])).toThrow(/references missing file path/);
  });

  it('fails on missing language, audience, and category', () => {
    const broken = buildEntry({ id: 'missing-required-fields', language: '', audience: '', category: '' });
    expect(() => validateEntries([broken])).toThrow(/missing language/);
    expect(() => validateEntries([broken])).toThrow(/missing audience/);
    expect(() => validateEntries([broken])).toThrow(/missing category/);
  });

  it('fails on unsupported language code', () => {
    const broken = buildEntry({ id: 'unsupported-lang', language: 'ru' });
    expect(() => validateEntries([broken])).toThrow(/unsupported language code: ru/);
  });

  it('fails on invalid audience value', () => {
    const broken = buildEntry({ id: 'invalid-audience', audience: 'teens' });
    expect(() => validateEntries([broken])).toThrow(/invalid audience value: teens/);
  });

  it('accepts additive multilingual variant metadata fields', () => {
    const multilingual = buildEntry({
      id: 'children-cbt-specialized-en-4-1',
      logical_form_id: 'children_cbt_specialized_04_01_ocd',
      variant_language: 'en',
      available_languages: ['en', 'he'],
      sibling_variant_ids: ['children-cbt-specialized-he-4-1'],
      source_language: 'en',
      is_language_variant: true,
      variant_group_id: 'children_cbt_specialized_04_01_ocd',
    });
    expect(() => validateEntries([multilingual], { fileExists: () => true })).not.toThrow();
  });

  it('accepts Hebrew children core entry metadata shape used by generated registry', () => {
    const hebrewChildren = buildEntry({
      id: 'children-cbt-core-he-2-3',
      language: 'he',
      audience: 'children',
      category: 'children_cbt_core',
      filePath: 'public/forms/he/children/cbt-core/stage-02/children_cbt_core_he_2.3.pdf',
      file_path: 'public/forms/he/children/cbt-core/stage-02/children_cbt_core_he_2.3.pdf',
      logical_form_id: 'children_cbt_core_02_03',
      variant_language: 'he',
      available_languages: ['he'],
      sibling_variant_ids: [],
      source_language: 'he',
      is_language_variant: true,
      variant_group_id: 'children_cbt_core_02_03',
      clinicalKeywords: ['מחשבות מלחיצות', 'טופס CBT לילדים'],
      title: 'מחשבות דאגה',
      description: 'זיהוי מחשבות דאגה ובחירת דרכי התמודדות פשוטות לילדים.',
      therapeuticGoal: 'להפחית הצפה של דאגות ולבנות תגובה מאוזנת.',
      whenToUse: 'כשילד/ה עסוק/ה בדאגות לגבי טעויות, בית ספר או מצבים חברתיים.',
    });
    expect(() => validateEntries([hebrewChildren], { fileExists: () => true })).not.toThrow();
  });

  it('preserves multilingual fields when applying variant metadata', () => {
    const base = buildEntry({ id: 'preserve-variant-metadata' });
    const withVariant = applyVariantMetadata(base, {
      logical_form_id: 'children_cbt_specialized_04_01_ocd',
      variant_language: 'en',
      available_languages: ['en', 'he'],
      sibling_variant_ids: ['children-cbt-specialized-he-4-1'],
      source_language: 'en',
      is_language_variant: true,
      variant_group_id: 'children_cbt_specialized_04_01_ocd',
    });

    expect(withVariant.logical_form_id).toBe('children_cbt_specialized_04_01_ocd');
    expect(withVariant.variant_language).toBe('en');
    expect(withVariant.available_languages).toEqual(['en', 'he']);
    expect(withVariant.sibling_variant_ids).toEqual(['children-cbt-specialized-he-4-1']);
    expect(withVariant.source_language).toBe('en');
    expect(withVariant.is_language_variant).toBe(true);
    expect(withVariant.variant_group_id).toBe('children_cbt_specialized_04_01_ocd');
  });

  it('fails when variant_language does not match entry language', () => {
    const broken = buildEntry({
      id: 'variant-lang-mismatch',
      language: 'en',
      variant_language: 'he',
    });
    expect(() => validateEntries([broken])).toThrow(/variant_language "he" that does not match language "en"/);
  });

  it('fails when available_languages includes unsupported code', () => {
    const broken = buildEntry({
      id: 'invalid-available-languages',
      available_languages: ['en', 'ru'],
    });
    expect(() => validateEntries([broken])).toThrow(/unsupported available_languages value: ru/);
  });

  it('fails when sibling_variant_ids is not an array', () => {
    const broken = buildEntry({
      id: 'invalid-sibling-ids',
      sibling_variant_ids: 'children-cbt-specialized-he-4-1',
    });
    expect(() => validateEntries([broken])).toThrow(/sibling_variant_ids must be an array/);
  });

  it('fails when AI matching metadata is missing', () => {
    const broken = buildEntry({
      id: 'missing-ai-metadata',
      therapeuticGoal: '',
      whenToUse: '',
      clinicalKeywords: [],
      keywords: [],
      aiMatchingSummary: '',
      ai_matching_summary: '',
    });
    expect(() => validateEntries([broken])).toThrow(/missing AI matching metadata/);
  });

  it('fails when required hierarchy metadata fields are missing', () => {
    const broken = buildEntry({
      id: 'missing-hierarchy',
      collectionId: null,
      collectionType: null,
      cardType: null,
      displayOrder: null,
      isCombinedPdf: null,
    });
    let thrown;
    try {
      validateEntries([broken]);
    } catch (error) {
      thrown = String(error?.message || '');
    }
    expect(thrown).toMatch(/missing collectionId/);
    expect(thrown).toMatch(/invalid collectionType/);
    expect(thrown).toMatch(/invalid cardType/);
    expect(thrown).toMatch(/missing numeric displayOrder/);
    expect(thrown).toMatch(/missing boolean isCombinedPdf/);
  });

  it('fails when individual worksheet is not mapped to worksheet cardType', () => {
    const broken = buildEntry({
      id: 'invalid-card-type-mapping',
      type: 'individual_worksheet',
      cardType: 'combined_pdf',
    });
    expect(() => validateEntries([broken])).toThrow(/individual_worksheet must map to cardType "worksheet"/);
  });

  it('fails when module and stage combined pdf entries are not marked as combined', () => {
    const brokenModule = buildEntry({
      id: 'invalid-module-combined',
      type: 'module_pdf',
      cardType: 'combined_pdf',
      isCombinedPdf: false,
    });
    const brokenStage = buildEntry({
      id: 'invalid-stage-combined',
      type: 'stage_combined_pdf',
      cardType: 'combined_pdf',
      isCombinedPdf: false,
    });
    expect(() => validateEntries([brokenModule])).toThrow(/module_pdf must set isCombinedPdf=true/);
    expect(() => validateEntries([brokenStage])).toThrow(/stage_combined_pdf must set isCombinedPdf=true/);
  });
});
