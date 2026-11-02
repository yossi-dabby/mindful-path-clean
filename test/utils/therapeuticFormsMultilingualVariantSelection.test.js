import { describe, it, expect, vi } from 'vitest';

const { VARIANT_FORMS_FIXTURE } = vi.hoisted(() => ({
  VARIANT_FORMS_FIXTURE: Object.freeze([
  {
    id: 'children-cbt-specialized-en-4-1',
    slug: 'children-cbt-specialized-en-4-1-ocd',
    title: 'Children OCD Pack',
    approved: true,
    audience: 'children',
    category: 'children_cbt_specialized',
    subcategory: 'OCD',
    language: 'en',
    file_path: 'public/forms/en/children/cbt-specialized/children_cbt_specialized_en_4.1_ocd.pdf',
    logical_form_id: 'children_cbt_specialized_04_01_ocd',
    variant_language: 'en',
    available_languages: ['en', 'he'],
    sibling_variant_ids: ['children-cbt-specialized-he-4-1'],
    source_language: 'en',
    is_language_variant: true,
    variant_group_id: 'children_cbt_specialized_04_01_ocd',
    clinicalKeywords: ['ocd', 'intrusive thoughts', 'ritual'],
    intentPhrases: ['children ocd worksheet', 'send ocd form'],
    languages: {
      en: {
        title: 'Children OCD Pack',
        description: 'English OCD worksheet pack for children.',
        file_url: '/forms/en/children/cbt-specialized/children_cbt_specialized_en_4.1_ocd.pdf',
        file_type: 'pdf',
        file_name: 'children_cbt_specialized_en_4.1_ocd.pdf',
        rtl: false,
      },
    },
  },
  {
    id: 'children-cbt-specialized-he-4-1',
    slug: 'children-cbt-specialized-he-4-1-ocd',
    title: 'ערכת OCD לילדים',
    approved: true,
    audience: 'children',
    category: 'children_cbt_specialized',
    subcategory: 'OCD',
    language: 'he',
    file_path: 'public/forms/he/children/cbt-specialized/children_cbt_specialized_he_4.1_ocd.pdf',
    logical_form_id: 'children_cbt_specialized_04_01_ocd',
    variant_language: 'he',
    available_languages: ['en', 'he'],
    sibling_variant_ids: ['children-cbt-specialized-en-4-1'],
    source_language: 'en',
    is_language_variant: true,
    variant_group_id: 'children_cbt_specialized_04_01_ocd',
    clinicalKeywords: ['ocd', 'מחשבות טורדניות', 'טקסים'],
    intentPhrases: ['טופס ocd לילדים'],
    languages: {
      he: {
        title: 'ערכת OCD לילדים',
        description: 'חוברת עבודה לילדים בנושא OCD.',
        file_url: '/forms/he/children/cbt-specialized/children_cbt_specialized_he_4.1_ocd.pdf',
        file_type: 'pdf',
        file_name: 'children_cbt_specialized_he_4.1_ocd.pdf',
        rtl: true,
      },
    },
  },
  {
    id: 'children-cbt-specialized-en-4-2',
    slug: 'children-cbt-specialized-en-4-2-trauma',
    title: 'Children Trauma-Safe Coping Pack',
    approved: true,
    audience: 'children',
    category: 'children_cbt_specialized',
    subcategory: 'Trauma',
    language: 'en',
    file_path: 'public/forms/en/children/cbt-specialized/children_cbt_specialized_en_4.2_trauma.pdf',
    logical_form_id: 'children_cbt_specialized_04_02_trauma_sensitive_coping',
    variant_language: 'en',
    available_languages: ['en'],
    sibling_variant_ids: [],
    source_language: 'en',
    is_language_variant: false,
    variant_group_id: 'children_cbt_specialized_04_02_trauma_sensitive_coping',
    clinicalKeywords: ['trauma', 'grounding'],
    intentPhrases: ['children trauma worksheet'],
    languages: {
      en: {
        title: 'Children Trauma-Safe Coping Pack',
        description: 'English trauma-safe coping worksheet pack for children.',
        file_url: '/forms/en/children/cbt-specialized/children_cbt_specialized_en_4.2_trauma.pdf',
        file_type: 'pdf',
        file_name: 'children_cbt_specialized_en_4.2_trauma.pdf',
        rtl: false,
      },
    },
  },
  ].map((entry) => Object.freeze(entry))),
}));

vi.mock('../../src/data/therapeuticForms/index.js', () => {
  const diagnostics = {
    total: VARIANT_FORMS_FIXTURE.length,
    byLanguage: { en: 2, he: 1 },
    byAudience: { children: 3 },
    byCategory: { children_cbt_specialized: 3 },
    source: 'fixture',
  };

  return {
    getAllTherapeuticForms: () => VARIANT_FORMS_FIXTURE,
    getTherapeuticFormsRegistryDiagnostics: () => diagnostics,
    SUPPORTED_LANGUAGES: ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'],
    VALID_AUDIENCE_VALUES: new Set(['children', 'adolescents', 'adults', 'older_adults']),
  };
});

import {
  resolveFormByIdOrSlug,
  resolveFormForAIRequest,
  createGeneratedFileFromResolvedForm,
  searchFormsForAI,
} from '../../src/data/therapeuticForms/aiFormsAccess.js';

describe('therapeutic forms multilingual variant selection (fixture)', () => {
  it('returns English variant when active language is en', () => {
    const resolved = resolveFormByIdOrSlug('children_cbt_specialized_04_01_ocd', {
      activeLanguage: 'en',
    });
    expect(resolved?.form?.id).toBe('children-cbt-specialized-en-4-1');
    expect(resolved?.resolvedLanguage).toBe('en');
  });

  it('returns Hebrew variant when active language is he and variant exists', () => {
    const resolved = resolveFormByIdOrSlug('children_cbt_specialized_04_01_ocd', {
      activeLanguage: 'he',
    });
    expect(resolved?.form?.id).toBe('children-cbt-specialized-he-4-1');
    expect(resolved?.resolvedLanguage).toBe('he');
  });

  it('prefers explicit English request even from Hebrew session', () => {
    const resolved = resolveFormByIdOrSlug('children_cbt_specialized_04_01_ocd', {
      activeLanguage: 'he',
      language: 'en',
    });
    expect(resolved?.form?.id).toBe('children-cbt-specialized-en-4-1');
    expect(resolved?.resolvedLanguage).toBe('en');
  });

  it('falls back safely when requested language variant is missing and returns available_languages', () => {
    const resolved = resolveFormByIdOrSlug('children_cbt_specialized_04_02_trauma_sensitive_coping', {
      activeLanguage: 'he',
      allowEnglishFallback: true,
    });
    expect(resolved?.form?.id).toBe('children-cbt-specialized-en-4-2');
    expect(resolved?.usedFallbackLanguage).toBe(true);
    expect(resolved?.fallbackReason).toBe('no_same_language_forms');
    expect(resolved?.availableLanguages).toEqual(['en']);
  });

  it('search by therapeutic need finds the logical OCD group in active language', () => {
    const matches = searchFormsForAI('ocd intrusive thoughts', { activeLanguage: 'he' });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].logical_form_id).toBe('children_cbt_specialized_04_01_ocd');
    expect(matches[0].language).toBe('he');
  });

  it('resolver chooses active-language variant for send_best_matching_form and keeps metadata shape', () => {
    const resolved = resolveFormForAIRequest('תשלח לי טופס לילדים בנושא OCD', {
      language: 'he',
      audience: 'children',
    });

    expect(resolved.generatedFile).toBeTruthy();
    expect(resolved.generatedFile.language).toBe('he');
    expect(resolved.generatedFile.url).toBe('/forms/he/children/cbt-specialized/children_cbt_specialized_he_4.1_ocd.pdf');
    expect(resolved.generatedFile.logical_form_id).toBe('children_cbt_specialized_04_01_ocd');
    expect(resolved.generatedFile.available_languages).toEqual(['en', 'he']);
  });

  it('resolver keeps explicit English choice in Hebrew session', () => {
    const resolved = resolveFormForAIRequest('Send me an English children OCD form', {
      language: 'he',
      audience: 'children',
    });
    expect(resolved.generatedFile).toBeTruthy();
    expect(resolved.generatedFile.language).toBe('en');
  });

  it('send_specific_form missing-language path returns available language guidance, not technical failure', () => {
    const resolved = resolveFormForAIRequest('send children_cbt_specialized_04_02_trauma_sensitive_coping', {
      language: 'he',
      audience: 'children',
    });
    expect(typeof resolved.responseText).toBe('string');
    expect(resolved.responseText.toLowerCase()).not.toContain('technical issue');
    expect(resolved.generatedFile ?? null).toBeNull();
    expect(Array.isArray(resolved.availableLanguages)).toBe(true);
    expect(['no_same_language_forms', null]).toContain(resolved.fallbackReason ?? null);
  });

  it('generated_file metadata uses selected variant path and additive variant-link fields', () => {
    const resolved = resolveFormByIdOrSlug('children_cbt_specialized_04_01_ocd', {
      activeLanguage: 'he',
    });
    const generated = createGeneratedFileFromResolvedForm(resolved);
    expect(generated?.url).toBe('/forms/he/children/cbt-specialized/children_cbt_specialized_he_4.1_ocd.pdf');
    expect(generated?.logical_form_id).toBe('children_cbt_specialized_04_01_ocd');
    expect(generated?.variant_language).toBe('he');
    expect(generated?.available_languages).toEqual(['en', 'he']);
  });
});
