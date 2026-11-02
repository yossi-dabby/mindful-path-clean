import { describe, it, expect, vi } from 'vitest';
import { SYNTHETIC_FORMS, SYNTHETIC_FORM_LANGUAGES } from '../../tests/fixtures/therapeutic-forms.synthetic.js';

vi.mock('../../src/generated/therapeutic-forms-index.json', async () => {
  const { SYNTHETIC_FORMS } = await import('../../tests/fixtures/therapeutic-forms.synthetic.js');
  return { default: SYNTHETIC_FORMS };
});
vi.mock('../../src/data/therapeuticForms/availability.js', async importOriginal => ({
  ...await importOriginal(), THERAPEUTIC_FORMS_CONTENT_AVAILABLE: true,
}));

import {
  ALL_FORMS, listFormsForAI, searchFormsForAI, resolveFormWithLanguage,
  getTherapeuticFormsForAI, getFormsRegistryStats,
} from '../../src/data/therapeuticForms/index.js';
import {
  APPROVED_FORM_INTENT_MAP, resolveFormIntent, resolveSpecializedModuleIdByCode,
  resolveChildrenCBTSpecializedFormByContent, resolveAdolescentsCBTCoreEnglishFormByContent,
} from '../../src/utils/resolveFormIntent.js';
import { getTherapeuticFormsPolicyPayload } from '../../src/lib/therapeuticFormsPolicy.js';
import { getFormOpenUrl, getFormDownloadUrl } from '../../src/components/chat/utils/formFileUrls.js';

describe('future approved content uses the retained architecture', () => {
  it('loads only the canonical generated index and derives metadata-based intent aliases', () => {
    expect(ALL_FORMS).toHaveLength(SYNTHETIC_FORMS.length);
    expect(ALL_FORMS.every(form => form.id.startsWith('qa-'))).toBe(true);
    const example = SYNTHETIC_FORMS[0];
    expect(APPROVED_FORM_INTENT_MAP[example.intentPhrases[0]]).toBe(example.id);
    expect(APPROVED_FORM_INTENT_MAP['teen cbt workbook']).toBeUndefined();
  });

  for (const language of SYNTHETIC_FORM_LANGUAGES) {
    it(`lists and resolves exact ${language} content with intact file metadata`, () => {
      const forms = listFormsForAI({ language, allowEnglishFallback: false });
      expect(forms).toHaveLength(8);
      expect(getTherapeuticFormsForAI({ language })).toHaveLength(8);
      for (const form of forms) {
        expect(form.language).toBe(language);
        const resolved = resolveFormIntent(form.id, language);
        expect(resolved.form_id).toBe(form.id);
        expect(resolved.url).toBe(form.fileUrl);
        expect(resolved.language).toBe(language);
        const languageBlock = resolveFormWithLanguage(form.id, language).languageData;
        expect(languageBlock.rtl).toBe(language === 'he');
        const wrongLanguage = language === 'en' ? 'he' : 'en';
        expect(resolveFormIntent(form.id, wrongLanguage)).toBeNull();
      }
    });
    it(`keeps ${language} audience/category search strict`, () => {
      const found = searchFormsForAI('synthetic practice', { language, audience: 'children', category: 'children_cbt_specialized', allowEnglishFallback: false });
      expect(found).toHaveLength(2);
      expect(found.every(form => form.audience === 'children' && form.language === language && form.category === 'children_cbt_specialized')).toBe(true);
    });
  }

  it('keeps the compatibility resolvers tied to current metadata rather than package IDs', () => {
    const child = resolveChildrenCBTSpecializedFormByContent('synthetic practice for a child', { activeLanguage: 'en' });
    expect(child.form_id).toMatch(/^qa-children-specialized-en-/);
    expect(resolveChildrenCBTSpecializedFormByContent('synthetic practice for an adult', { activeLanguage: 'en' })).toBeNull();
    const teen = resolveAdolescentsCBTCoreEnglishFormByContent('synthetic practice for a teen', { activeLanguage: 'en' });
    expect(teen.form_id).toMatch(/^qa-adolescents-core-en-/);
    expect(resolveSpecializedModuleIdByCode('01')).toBe('qa-adolescents-specialized-en-combined');
    expect(resolveSpecializedModuleIdByCode('99')).toBeNull();
    for (const invalid of [null, undefined, {}, Symbol('invalid')]) {
      expect(resolveSpecializedModuleIdByCode(invalid)).toBeNull();
    }
  });

  it('rejects an unknown identifier instead of silently selecting a nearby worksheet', () => {
    expect(resolveFormIntent('retired-synthetic-practice-id', 'en')).toBeNull();
    expect(resolveFormIntent('tf-synthetic-practice', 'en')).toBeNull();
  });

  it('keeps viewer and download actions separate for future content', () => {
    const file = resolveFormIntent('qa-children-core-en-worksheet', 'en');
    expect(getFormOpenUrl(file.url)).toContain('/pdf-viewer?');
    expect(getFormOpenUrl(file.url)).not.toContain('download=1');
    expect(getFormDownloadUrl(file.url)).toContain('download=1');
  });

  it('builds policy and diagnostics from future installed content only', () => {
    expect(getFormsRegistryStats().total).toBe(SYNTHETIC_FORMS.length);
    const payload = getTherapeuticFormsPolicyPayload({ sessionLanguage: 'he' });
    const text = JSON.stringify(payload);
    expect(text).toContain('qa-');
    expect(text).not.toContain('children-cbt-core-en-');
    expect(text).not.toContain('adolescents-cbt-specialized-he-01-04');
  });
});
