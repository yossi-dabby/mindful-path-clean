import { describe, expect, it } from 'vitest';

import {
  THERAPEUTIC_FORMS_CONTENT_AVAILABLE,
  THERAPEUTIC_FORMS_CONTENT_STATUS,
  getTherapeuticFormsAvailabilityCopy,
} from '../../src/data/therapeuticForms/availability.js';
import generatedFormsIndex from '../../src/generated/therapeutic-forms-index.json';
import {
  ALL_FORMS,
  THERAPEUTIC_FORMS_CATALOG,
  getTherapeuticFormsForAI,
} from '../../src/data/therapeuticForms/index.js';
import { resolveFormIntentRequest } from '../../src/utils/resolveFormIntent.js';

describe('therapeutic forms under-revision mode', () => {
  it('keeps localized status copy for every supported application language', () => {
    for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
      const copy = getTherapeuticFormsAvailabilityCopy(language);
      expect(copy.title).toBeTruthy();
      expect(copy.message).toBeTruthy();
      expect(copy.aiMessage).toBeTruthy();
    }
  });

  it('keeps both installed and standby catalogs empty after content retirement', () => {
    expect(THERAPEUTIC_FORMS_CONTENT_AVAILABLE).toBe(false);
    expect(THERAPEUTIC_FORMS_CONTENT_STATUS).toBe('under_revision');
    expect(THERAPEUTIC_FORMS_CATALOG).toHaveLength(0);
    expect(ALL_FORMS).toHaveLength(0);
    expect(generatedFormsIndex).toEqual([]);
    expect(getTherapeuticFormsForAI()).toEqual([]);

    for (const entry of THERAPEUTIC_FORMS_CATALOG) {
      expect(entry.approved).toBe(false);
      expect(entry.contentStatus).toBe('under_revision');
      expect(entry.fileUrl).toBeUndefined();
      expect(entry.filePath).toBeUndefined();
      expect(entry.file_url).toBeUndefined();
      expect(entry.file_path).toBeUndefined();
      expect(entry.languages).toBeUndefined();
    }
  });

  it('never attaches or exposes a form file in any supported language while content is under review', () => {
    const requests = {
      en: 'Please send me a CBT worksheet for a teenager',
      he: 'שלח לי בבקשה טופס CBT למתבגר',
      es: 'Envíame una hoja de trabajo de TCC para adolescentes',
      fr: 'Envoyez-moi une fiche TCC pour adolescent',
      de: 'Bitte sende mir ein CBT-Arbeitsblatt für Jugendliche',
      it: 'Inviami una scheda CBT per adolescenti',
      pt: 'Envie uma ficha de TCC para adolescentes',
    };

    for (const [language, request] of Object.entries(requests)) {
      const result = resolveFormIntentRequest(request, { language, audience: 'adolescents' });

      expect(result.intent).toBeTruthy();
      expect(result.contentStatus).toBe('under_revision');
      expect(result.generatedFile).toBeNull();
      expect(result.generatedFiles).toEqual([]);
      expect(result.matches).toEqual([]);
      expect(result.responseText).toBe(getTherapeuticFormsAvailabilityCopy(language).aiMessage);
    }
  });
});
