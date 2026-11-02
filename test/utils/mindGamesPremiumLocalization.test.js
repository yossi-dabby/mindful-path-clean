import { describe, expect, it } from 'vitest';
import { mindGamesPremiumStrings } from '../../src/components/i18n/mindGamesPremiumTranslations';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const requiredKeys = [
  'eyebrow', 'hero_title', 'hero_description', 'games_count', 'explore',
  'all_games_title', 'all_games_subtitle', 'search_placeholder', 'search_aria',
  'clear_search_aria', 'filters_aria', 'results_count', 'no_results_title',
  'no_results_description', 'reset_filters', 'start_game', 'open_game_aria',
  'info_aria', 'second_short', 'minute_short', 'recommendations_loading',
  'recommendations_error', 'retry',
];

describe('premium mind games localisation', () => {
  for (const language of languages) {
    it(`provides a complete premium shell for ${language}`, () => {
      const strings = mindGamesPremiumStrings[language];
      expect(strings).toBeDefined();
      requiredKeys.forEach((key) => {
        expect(strings[key], `${language}:${key}`).toEqual(expect.any(String));
        expect(strings[key].trim(), `${language}:${key}`).not.toBe('');
      });
      ['all', 'CBT', 'DBT', 'ACT', 'focus'].forEach((category) => {
        expect(strings.categories[category], `${language}:categories.${category}`).toEqual(expect.any(String));
      });
    });
  }

  it('keeps the Hebrew shell free of accidental English UI fallbacks', () => {
    const hebrew = mindGamesPremiumStrings.he;
    const visibleHebrewText = requiredKeys
      .filter((key) => !['open_game_aria', 'info_aria'].includes(key))
      .map((key) => hebrew[key])
      .join(' ');
    expect(visibleHebrewText).not.toMatch(/\b(?:Search|Start|Loading|Retry|games|skills)\b/i);
  });
});
