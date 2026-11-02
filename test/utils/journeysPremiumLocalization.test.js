import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const premiumKeys = [
  'eyebrow', 'hero_description', 'back_aria', 'summary_aria',
  'stat_available', 'stat_active', 'stat_completed', 'loading',
  'load_error_title', 'load_error_description', 'retry', 'start_error',
  'starting', 'empty_available_description', 'empty_active_description',
  'empty_completed_description', 'gentle_pace', 'card_badge', 'explore',
  'detail_eyebrow', 'roadmap_description', 'steps_count',
];

describe('premium journeys localization', () => {
  for (const language of languages) {
    it('provides the complete journey experience for ' + language, () => {
      const journeys = translations[language]?.translation?.journeys;
      expect(journeys).toBeDefined();
      premiumKeys.forEach((key) => {
        expect(journeys.premium[key], language + ':journeys.premium.' + key).toEqual(expect.any(String));
        expect(journeys.premium[key].trim()).not.toBe('');
      });
      ['anxiety', 'depression', 'stress', 'distress_tolerance', 'emotion_regulation', 'mindfulness', 'other'].forEach((key) => {
        expect(journeys.categories[key], language + ':journeys.categories.' + key).toEqual(expect.any(String));
      });
      ['beginner', 'intermediate', 'advanced'].forEach((key) => {
        expect(journeys.difficulties[key], language + ':journeys.difficulties.' + key).toEqual(expect.any(String));
      });
      ['level', 'paused', 'continue_journey', 'details_aria'].forEach((key) => {
        expect(journeys.card[key], language + ':journeys.card.' + key).toEqual(expect.any(String));
      });
      ['current_step', 'locked_step', 'completed_step', 'reflection_hint', 'save_error', 'close_aria'].forEach((key) => {
        expect(journeys.detail[key], language + ':journeys.detail.' + key).toEqual(expect.any(String));
      });
    });
  }

  it('keeps technical category and difficulty identifiers out of Hebrew labels', () => {
    const journeys = translations.he.translation.journeys;
    const visibleLabels = [
      ...Object.values(journeys.categories),
      ...Object.values(journeys.difficulties),
      ...Object.values(journeys.card),
    ].join(' ');
    expect(visibleLabels).not.toMatch(/\b(?:anxiety|depression|distress_tolerance|emotion_regulation|beginner|intermediate|advanced)\b/);
  });
});
