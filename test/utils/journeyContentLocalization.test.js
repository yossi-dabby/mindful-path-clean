import { describe, expect, it } from 'vitest';
import {
  localizeJourney,
  localizeJourneys,
  normalizeJourneyLanguage,
  SUPPORTED_JOURNEY_LANGUAGES,
} from '../../src/components/journeys/journeyContentLocalization';

const fixtures = [
  {
    id: '6982fef0720645ff50b6105e',
    title: '7-Day Anxiety Reduction Challenge',
    description: 'Build practical skills to manage anxiety through CBT, DBT, and ACT techniques.',
    outcomes: Array(4).fill('English outcome'),
    steps: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      title: 'English step',
      description: 'English description',
      reflection_prompt: 'English prompt?',
      game_slug: 'game-' + index,
    })),
  },
  {
    id: '6982fef0720645ff50b61060',
    title: 'Mindful Acceptance Path (ACT)',
    description: "Learn to accept what you can't control and take action on what matters.",
    outcomes: Array(4).fill('English outcome'),
    steps: Array.from({ length: 6 }, (_, index) => ({
      day: index + 1,
      title: 'English step',
      description: 'English description',
      reflection_prompt: 'English prompt?',
      game_slug: 'game-' + index,
    })),
  },
  {
    id: '6982fef0720645ff50b6105f',
    title: '5-Day Distress Tolerance Bootcamp',
    description: 'Master DBT skills to survive crisis moments without making things worse.',
    outcomes: Array(4).fill('English outcome'),
    steps: Array.from({ length: 5 }, (_, index) => ({
      day: index + 1,
      title: 'English step',
      description: 'English description',
      reflection_prompt: 'English prompt?',
      game_slug: 'game-' + index,
    })),
  },
];

describe('journey content localization', () => {
  it('supports exactly the seven product languages and normalizes regional locales', () => {
    expect(SUPPORTED_JOURNEY_LANGUAGES).toEqual(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
    expect(normalizeJourneyLanguage('he-IL')).toBe('he');
    expect(normalizeJourneyLanguage('pt-BR')).toBe('pt');
    expect(normalizeJourneyLanguage('unknown')).toBe('en');
  });

  it.each(SUPPORTED_JOURNEY_LANGUAGES)(
    'returns complete %s content for every existing journey',
    (language) => {
      for (const fixture of fixtures) {
        const localized = localizeJourney(fixture, language);
        expect(localized).not.toBeNull();
        expect(localized.content_language).toBe(language);
        expect(localized.title.trim()).not.toBe('');
        expect(localized.description.trim()).not.toBe('');
        expect(localized.outcomes).toHaveLength(fixture.outcomes.length);
        expect(localized.steps).toHaveLength(fixture.steps.length);

        localized.steps.forEach((step, index) => {
          expect(step.title.trim()).not.toBe('');
          expect(step.description.trim()).not.toBe('');
          expect(step.reflection_prompt.trim()).not.toBe('');
          expect(step.game_slug).toBe(fixture.steps[index].game_slug);
        });

        if (language !== 'en') {
          expect(localized.title).not.toBe(fixture.title);
          expect(localized.description).not.toBe(fixture.description);
          expect(localized.outcomes).not.toContain('English outcome');
          expect(localized.steps.map((step) => step.title)).not.toContain('English step');
        }
      }
    }
  );

  it('never leaks source-language content when a future journey lacks a complete translation', () => {
    const untranslated = {
      id: 'future-journey',
      title: 'English only',
      description: 'English only description',
      outcomes: ['English only outcome'],
      steps: [{ title: 'English step', description: 'English step description' }],
    };

    expect(localizeJourney(untranslated, 'he')).toBeNull();
    expect(localizeJourneys([untranslated], 'he')).toEqual([]);
  });

  it('uses a complete future localization and preserves language-independent game fields', () => {
    const future = {
      id: 'future-journey',
      title: 'English title',
      description: 'English description',
      outcomes: ['English outcome'],
      steps: [{
        day: 1,
        title: 'English step',
        description: 'English step description',
        reflection_prompt: 'English prompt',
        game_slug: 'safe-game',
      }],
      localizations: {
        he: {
          title: 'כותרת בעברית',
          description: 'תיאור בעברית',
          outcomes: ['תוצאה בעברית'],
          steps: [{
            title: 'שלב בעברית',
            description: 'תיאור שלב בעברית',
            reflection_prompt: 'שאלת התבוננות בעברית',
          }],
        },
      },
    };

    const localized = localizeJourney(future, 'he');
    expect(localized.title).toBe('כותרת בעברית');
    expect(localized.steps[0].game_slug).toBe('safe-game');
    expect(localized.steps[0].reflection_prompt).toBe('שאלת התבוננות בעברית');
  });
});
