import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FORM_LANGUAGES, formLanguage, formDirection, formFamilyId, formVariantId,
  translationState, buildTranslationReviewCatalog } from '../../src/lib/formsLocalization.js';
import { auditFormSources } from '../../scripts/audit-form-sources.mjs';

const map = JSON.parse(await readFile(new URL('../../content/forms-localization/source-map.json', import.meta.url), 'utf8'));
const packet = JSON.parse(await readFile(new URL('../../content/forms-localization/en/mood-03.json', import.meta.url), 'utf8'));
const form = packet.forms.find(form => form.age === 'CH' && form.kind === 'W');
const source = map.forms.find(source => source.id === form.sourceId);

describe('multilingual readiness: actual source inventory', () => {
  it('resolves every installed PDF to an editable source and verifies its bytes', async () => {
    expect(await auditFormSources()).toEqual(map);
    expect(map.total).toBe(970);
    expect(map.editable).toBe(970);
    expect(map.tracks).toHaveLength(17);
    expect(map.forms.filter(form => form.htmlPath.includes('/original-v02/'))).toHaveLength(154);
    expect(map.forms.every(form => form.contentVersion)).toBe(true);
  });

  it('retains byte-for-byte provenance for the recovered source files', async () => {
    const root = new URL('../../content/hebrew-forms/original-v02/', import.meta.url);
    const provenance = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
    expect(provenance.files.filter(file => file.path.endsWith('.html'))).toHaveLength(154);
    for (const file of provenance.files) {
      expect(createHash('sha256').update(await readFile(new URL(file.path, root))).digest('hex')).toBe(file.sha256);
    }
  });

  it('keeps one stable identity per form across 7 languages without inventing age variants', () => {
    const all = map.forms.flatMap(source => FORM_LANGUAGES.map(language => formVariantId(source.id, language)));
    expect(new Set(all).size).toBe(6790);
    expect(new Set(map.forms.map(form => form.familyId)).size).toBe(970);
    const childrenOnly = map.forms.filter(form => form.id.startsWith('MP-OCDYC-'));
    expect(childrenOnly).toHaveLength(24);
    expect(childrenOnly.every(form => form.age === 'CH')).toBe(true);
    expect(childrenOnly.flatMap(form => FORM_LANGUAGES.map(language => formVariantId(form.id, language)))
      .every(id => /-CH-[A-Z]{2}$/.test(id))).toBe(true);
  });
});

describe('strict language and direction selection', () => {
  it.each(FORM_LANGUAGES)('supports %s without changing the family identity', language => {
    const id = formVariantId(source.id, language);
    expect(formFamilyId(id)).toBe(source.familyId);
    expect(id.endsWith(`-${language.toUpperCase()}`)).toBe(true);
    expect(formDirection(language)).toBe(language === 'he' ? 'rtl' : 'ltr');
  });
  it('accepts regional language tags and never substitutes a different language', () => {
    expect(formLanguage('pt-BR')).toBe('pt');
    expect(formLanguage('en-GB')).toBe('en');
    expect(formLanguage('he-IL')).toBe('he');
    for (const unsupported of ['ar', 'unknown', '', null, 123]) {
      expect(formLanguage(unsupported)).toBe(null);
      expect(() => formVariantId(source.id, unsupported)).toThrow();
    }
    expect(() => formFamilyId('../MP-MOOD-03-W-CH-HE')).toThrow();
  });
});

describe('translation linkage, freshness and unavailable versions', () => {
  it('keeps the full source count and identifies exactly the 9 English drafts', () => {
    const catalog = buildTranslationReviewCatalog(map, packet.forms, 'en');
    expect(catalog.forms).toHaveLength(9);
    expect(catalog.unavailable).toHaveLength(961);
    expect(catalog.stale).toEqual([]);
    expect(catalog.access).toBe('offline-review-only');
    expect(catalog.forms.every(form => form.language === 'en' && form.id.endsWith('-EN'))).toBe(true);
    expect(new Set(packet.forms.map(form => form.age))).toEqual(new Set(['ALL', 'CH', 'TE', 'AD', 'OA']));
    expect(packet.forms.filter(form => form.kind === 'W')).toHaveLength(4);
    expect(packet.forms.filter(form => form.kind === 'P')).toHaveLength(4);
    expect(packet.forms.filter(form => form.kind === 'G')).toHaveLength(1);
  });

  it.each(['es', 'fr', 'de', 'it', 'pt'])('%s remains explicitly unavailable, without Hebrew/English fallback', language => {
    const catalog = buildTranslationReviewCatalog(map, [], language);
    expect(catalog.forms).toEqual([]);
    expect(catalog.unavailable).toHaveLength(970);
    expect(catalog.unavailable.every(id => id.endsWith(`-${language.toUpperCase()}`))).toBe(true);
    expect(() => buildTranslationReviewCatalog(map, packet.forms, language)).toThrow();
  });

  it.each(['contentVersion', 'pdfSha256', 'htmlSha256', 'dependenciesSha256'])('a changed %s makes the translation stale', field => {
    const changed = { ...source, [field]: 'changed' };
    expect(translationState(changed, form, 'en')).toBe('stale');
    const catalog = buildTranslationReviewCatalog({ ...map, forms: [changed] }, [form], 'en');
    expect(catalog.forms).toEqual([]);
    expect(catalog.stale).toEqual([form.id]);
  });

  it.each(['id', 'sourceId', 'language', 'age', 'unit', 'track'])('rejects a mismatched %s', field => {
    expect(() => translationState(source, { ...form, [field]: 'wrong' }, 'en')).toThrow();
  });

  it('rejects unknown and duplicate source mappings', () => {
    expect(() => buildTranslationReviewCatalog(map, [form, form], 'en')).toThrow();
    expect(() => buildTranslationReviewCatalog(map, [{ ...form, sourceId: 'MP-MISSING-W-CH-HE' }], 'en')).toThrow();
  });

  it('does not turn draft content or automated QA into clinical approval', () => {
    for (const translation of packet.forms) {
      expect(translation.review).toEqual({ translation: 'draft', clinical: 'pending', rights: 'pending', reviewer: null, reviewedAt: null });
      expect(translationState(map.forms.find(source => source.id === translation.sourceId), translation, 'en')).toBe('draft');
    }
    expect(() => translationState(source, { ...form, review: { ...form.review, clinical: 'approved' } }, 'en')).toThrow();
  });
});
