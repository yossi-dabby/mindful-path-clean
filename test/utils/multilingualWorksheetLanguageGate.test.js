/**
 * Multilingual final-authority language gate for therapeutic worksheets.
 */

import { describe, expect, it } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import { checkWorksheetEligibilityGate } from '../../src/lib/worksheetEligibilityGate.js';
import { getTherapeuticFormsPolicyPayload } from '../../src/lib/therapeuticFormsPolicy.js';

const REQUESTS = Object.freeze({
  en: 'Send me this worksheet.',
  he: 'שלח לי את הטופס.',
  es: 'Envíame este formulario.',
  fr: 'Je veux le formulaire.',
  de: 'Ich möchte das Arbeitsblatt.',
  it: 'Voglio il foglio di lavoro.',
  pt: 'Quero o formulário.',
});

const EXPLICIT_ENGLISH_REQUESTS = Object.freeze({
  es: 'Envíame este formulario en inglés.',
  fr: 'Je veux le formulaire en anglais.',
  de: 'Ich möchte das Arbeitsblatt auf Englisch.',
  it: 'Voglio il foglio di lavoro in inglese.',
  pt: 'Quero o formulário em inglês.',
});

const SUPPORTED_LOCALES = Object.freeze(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
const ADDITIONAL_LOCALES = Object.freeze(['es', 'fr', 'de', 'it', 'pt']);
const LOCALES_WITHOUT_INSTALLED_FORMS = Object.freeze(['es', 'fr', 'de', 'it', 'pt']);

function makeAdultForm(language) {
  return {
    id: `adult-form-${language}`,
    form_id: `adult-form-${language}`,
    audience: 'adults',
    language,
  };
}

function check(form, userMessage, sessionLanguage, requestedLanguage = null) {
  return checkWorksheetEligibilityGate(form, {
    userMessage,
    previousAssistantOffer: null,
    currentTurnProhibitsWorksheet: false,
    clinicallyRelevant: true,
    sessionLanguage,
    requestedLanguage,
  });
}

describe('Multilingual worksheet language eligibility gate', () => {
  it('preserves same-language attachment eligibility in every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const result = check(makeAdultForm(locale), REQUESTS[locale], locale);
      expect(result, `same-language form blocked for ${locale}`).toMatchObject({
        allowed: true,
        reason: 'eligible',
      });
    }
  });

  it('blocks English worksheet attachments in the five additional locales', () => {
    for (const locale of ADDITIONAL_LOCALES) {
      const result = check(makeAdultForm('en'), REQUESTS[locale], locale);
      expect(result, `wrong-language form allowed for ${locale}`).toMatchObject({
        allowed: false,
        reason: 'language_incompatible',
        required_language: locale,
        form_language: 'en',
      });
    }
  });

  it('allows an installed English form when English is explicitly requested in the current turn', () => {
    for (const locale of ADDITIONAL_LOCALES) {
      const result = check(makeAdultForm('en'), EXPLICIT_ENGLISH_REQUESTS[locale], locale);
      expect(result, `explicit English request was not honored for ${locale}`).toMatchObject({
        allowed: true,
        reason: 'eligible',
      });
    }
  });

  it('honors an authoritative requestedLanguage supplied by the deterministic route', () => {
    const result = check(
      makeAdultForm('he'),
      'Envíame este formulario.',
      'es',
      'he',
    );
    expect(result).toMatchObject({ allowed: true, reason: 'eligible' });
  });

});
