import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  ALL_FORMS, THERAPEUTIC_FORMS_CATALOG, getAllTherapeuticForms,
  getTherapeuticFormsForAI, getTherapeuticFormsPolicyVersion, listFormsForAI,
  searchFormsForAI, resolveFormByIdOrSlug,
} from '../../src/data/therapeuticForms/index.js';
import { APPROVED_FORM_INTENT_MAP, resolveFormIntent, resolveFormIntentRequest } from '../../src/utils/resolveFormIntent.js';
import * as workbook from '../../src/utils/workbookContentMetadata.js';
import { getTherapeuticFormsPolicyPayload } from '../../src/lib/therapeuticFormsPolicy.js';
import { getTherapeuticFormsAvailabilityCopy } from '../../src/data/therapeuticForms/availability.js';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const retiredIds = ['adolescents-cbt-core-en', 'adolescents-cbt-specialized-en', 'adolescents-cbt-specialized-he-01-04', 'children-cbt-core-en-5-1', 'children_cbt_core_en_05_01', 'children-cbt-specialized-en-4-1'];
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

describe('active legacy-form content is removed', () => {
  it('keeps the canonical and compatibility catalogs empty without logging false errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(ALL_FORMS).toEqual([]);
      expect(THERAPEUTIC_FORMS_CATALOG).toEqual([]);
      expect(getAllTherapeuticForms()).toEqual([]);
      expect(APPROVED_FORM_INTENT_MAP).toEqual({});
      expect(getTherapeuticFormsPolicyVersion()).toMatch(/^forms-0-/);
      expect(error).not.toHaveBeenCalled();
    } finally { error.mockRestore(); }
  });
  it('retains no workbook topic mapping or public upload manifest from the retired collection', () => {
    for (const [name, value] of Object.entries(workbook)) {
      if (name.startsWith('WORKBOOK_CONTENT_METADATA')) expect(value).toEqual([]);
    }
    expect(files('public/forms')).toEqual(['public/forms/README.md']);
    expect(fs.existsSync('public/children_cbt_core_en')).toBe(false);
    expect(fs.existsSync('src/data/therapeuticForms/catalog-under-revision.json')).toBe(false);
  });
  for (const language of languages) {
    it(`cannot list, match or attach any retired form in ${language}`, () => {
      expect(getTherapeuticFormsForAI({ language })).toEqual([]);
      expect(listFormsForAI({ language })).toEqual([]);
      expect(searchFormsForAI('CBT worksheet', { language })).toEqual([]);
      for (const id of retiredIds) {
        expect(resolveFormIntent(id, language)).toBeNull();
        expect(resolveFormByIdOrSlug(id, { language })).toBeNull();
      }
      const route = resolveFormIntentRequest('Please send me a worksheet', { language });
      expect(route.generatedFile).toBeNull();
      expect(route.generatedFiles).toEqual([]);
      expect(route.matches).toEqual([]);
      expect(route.responseText).toBe(getTherapeuticFormsAvailabilityCopy(language).aiMessage);
    });
  }
  it('refreshes AI policy to an empty catalog without concrete old IDs or attachment markers', () => {
    const text = JSON.stringify(getTherapeuticFormsPolicyPayload({ sessionLanguage: 'he' }));
    expect(text).toContain('No therapeutic forms are currently installed/available');
    for (const id of retiredIds) expect(text).not.toContain(id);
    expect(text).not.toMatch(/\[FORM:[a-z0-9_-]+\]/i);
  });
});
