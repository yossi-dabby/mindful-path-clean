import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

describe('coach wizard localization', () => {
  for (const locale of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
    it(`${locale} includes complete Thought Coach and Goal Coach copy`, () => {
      const resource = translations[locale]?.translation;
      expect(resource?.thought_coach?.title).toBeTruthy();
      expect(resource?.thought_coach?.step_details_emotions_label).toBeTruthy();
      expect(resource?.goal_coach_wizard?.title).toBeTruthy();
      expect(resource?.goal_coach_wizard?.smart_relevant_placeholder).toBeTruthy();
    });
  }
});
