import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import {
  getAllTherapeuticForms,
  listFormsForAI,
  searchFormsForAI,
  resolveFormForAIRequest,
  resolveFormByIdOrSlug,
  createGeneratedFileFromResolvedForm,
  getAvailableFormGroups,
  getFormsRegistryStats,
  detectFormIntent,
} from '../../src/data/therapeuticForms/index.js';

describe('aiFormsAccess deterministic registry stats', () => {
  it('reports an empty installed catalog and empty language/audience/category stats', () => {
    expect(getAllTherapeuticForms()).toEqual([]);
    const stats = getFormsRegistryStats();
    expect(stats.total).toBe(0);
    expect(stats.byLanguage).toEqual({});
    expect(stats.byAudience).toEqual({});
    expect(stats.byCategory).toEqual({});
    expect(getAvailableFormGroups().examples).toEqual([]);
  });

  it('keeps all approved generated-index forms available through AI-facing list by language', () => {
    const allApproved = getAllTherapeuticForms().filter((form) => form?.approved === true);
    const expectedEn = allApproved.filter((form) => form.language === 'en').length;
    const expectedHe = allApproved.filter((form) => form.language === 'he').length;
    const expectedEnIds = new Set(allApproved.filter((form) => form.language === 'en').map((form) => form.id));
    const expectedHeIds = new Set(allApproved.filter((form) => form.language === 'he').map((form) => form.id));

    const listedEn = listFormsForAI({ language: 'en', allowEnglishFallback: false });
    const listedHe = listFormsForAI({ language: 'he', allowEnglishFallback: false });

    expect(listedEn).toHaveLength(expectedEn);
    expect(listedHe).toHaveLength(expectedHe);
    expect(new Set(listedEn.map((form) => form.id))).toEqual(expectedEnIds);
    expect(new Set(listedHe.map((form) => form.id))).toEqual(expectedHeIds);
  });
});

describe('aiFormsAccess deterministic send + language behavior', () => {

  it('does not invent a single Hebrew full-series PDF when user asks for all stages', () => {
    const resolved = resolveFormForAIRequest('שלח לי את כל השלבים בקובץ אחד', { language: 'he' });
    expect(resolved.generatedFile?.url || '').not.toContain('full');
    expect(resolved.generatedFile?.url || '').not.toContain('series-full');
  });

  it('returns nearest matches when exact match is missing', () => {
    const resolved = resolveFormForAIRequest('send me form for impossible unicorn panic subtype', { language: 'en' });
    expect(Array.isArray(resolved.nearestMatches)).toBe(true);
    expect(resolved.nearestMatches.length).toBeGreaterThanOrEqual(0);
  });

  it('returns a narrowing prompt instead of flooding files for broad "all forms" requests', () => {
    const resolved = resolveFormForAIRequest('send all forms', { language: 'en' });
    expect(resolved.intent?.type).toBe('send_multiple_forms');
    expect(resolved.generatedFiles).toHaveLength(0);
    expect(String(resolved.responseText || '').toLowerCase()).toContain('up to 5');
  });

  it('keeps English session results free of Hebrew adolescents core forms', () => {
    const resolved = resolveFormForAIRequest('send me cbt forms for adolescents', { language: 'en' });
    const allMatches = [
      ...(resolved.generatedFile ? [resolved.generatedFile] : []),
      ...(resolved.nearestMatches || []),
    ];
    for (const match of allMatches) {
      const id = String(match?.form_id || match?.id || '');
      expect(id.startsWith('adolescents-cbt-core-he')).toBe(false);
    }
  });

  it('keeps English session results free of Hebrew children core forms', () => {
    const resolved = resolveFormForAIRequest('send me cbt forms for children', { language: 'en' });
    const allMatches = [
      ...(resolved.generatedFile ? [resolved.generatedFile] : []),
      ...(resolved.nearestMatches || []),
    ];
    for (const match of allMatches) {
      const id = String(match?.form_id || match?.id || '');
      expect(id.startsWith('children-cbt-core-he')).toBe(false);
    }
  });
});

describe('aiFormsAccess deterministic intent + grouping', () => {
  it('detects list and send form intents', () => {
    expect(detectFormIntent('What forms do you have?')?.type).toBe('list_all_forms');
    expect(detectFormIntent('List forms for adolescents')?.type).toBe('list_forms_by_audience');
    expect(detectFormIntent('Send me a form for anger')?.type).toBe('send_best_matching_form');
  });

  it('detects Hebrew multi-form and capability intents', () => {
    expect(detectFormIntent('שלח לי כמה טפסים לילד עם חרדת פרידה')?.type).toBe('send_multiple_forms');
    expect(detectFormIntent('האם אתה יכול לשלוח מספר טפסים במקביל או רק טופס אחד בכל פעם')?.type).toBe('forms_capability_query');
  });

  it('returns accurate multi-form capability response text', () => {
    const he = resolveFormForAIRequest('האם אתה יכול לשלוח מספר טפסים במקביל או רק טופס אחד בכל פעם', { language: 'he' });
    expect(he.generatedFiles).toHaveLength(0);
    expect(he.responseText).toBe('כן. אני יכול לשלוח כמה טפסים יחד, עד 5 טפסים בתגובה אחת. אם יש קובץ מאוחד מתאים, אעדיף לשלוח אותו במקום להציף בכמה קבצים.');

    const en = resolveFormForAIRequest('Can you send multiple forms in parallel or only one at a time?', { language: 'en' });
    expect(en.generatedFiles).toHaveLength(0);
    expect(en.responseText).toBe('Yes. I can send several forms together, up to 5 forms in one response. If a combined module PDF exists, I will prefer that instead of sending many separate files.');
  });

});
