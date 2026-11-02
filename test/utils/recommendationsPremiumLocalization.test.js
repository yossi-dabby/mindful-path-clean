import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations';
import { applyRecommendationsUiTranslations } from '../../src/components/i18n/recommendationsUiTranslations';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const requiredPaths = [
  'recommendations.premium.modal_description',
  'recommendations.premium.open_aria',
  'recommendations.premium.close_aria',
  'recommendations.premium.loading_title',
  'recommendations.premium.loading_description',
  'recommendations.premium.feed_subtitle',
  'recommendations.premium.refresh_aria',
  'recommendations.premium.insights_label',
  'recommendations.premium.why_now',
  'recommendations.premium.best_match',
  'recommendations.premium.type_exercise',
  'recommendations.premium.type_resource',
  'recommendations.premium.type_video',
  'recommendations.premium.type_journal_prompt',
  'recommendations.premium.data_error_title',
  'recommendations.premium.generation_error_title',
  'recommendations.premium.empty_title',
  'recommendations.premium.try_again',
  'recommendations.premium.starter_exercise_title',
  'recommendations.premium.starter_reflection_title'
];

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

describe('Premium home recommendations localisation', () => {
  applyRecommendationsUiTranslations(translations);

  for (const language of languages) {
    it(`provides every recommendations key for ${language}`, () => {
      const dictionary = translations[language]?.translation;
      for (const path of requiredPaths) {
        const value = readPath(dictionary, path);
        expect(value, `Missing ${language}:${path}`).toEqual(expect.any(String));
        expect(value.trim(), `Empty ${language}:${path}`).not.toBe('');
      }
    });
  }

  it('keeps the Hebrew recommendation shell free of English fallbacks', () => {
    const hebrew = translations.he.translation;
    for (const path of requiredPaths) {
      expect(readPath(hebrew, path), path).not.toMatch(/\b(?:Recommended|Refresh|Insights|Priority|Close|Try)\b/i);
    }
  });
});
