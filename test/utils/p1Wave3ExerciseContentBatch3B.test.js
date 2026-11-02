import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_3B_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B
} from '../../src/components/exercises/exerciseContentTranslationsBatch3B.js';
import { localizeExercise, localizeExerciseCollection } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 3B', () => {
  it('contains five mindfulness-based emotion-regulation exercises in all seven locales', () => {
    expect(EXERCISE_CONTENT_BATCH_3B_IDS).toEqual([
      'local-mindfulness-present-moment',
      'local-mindfulness-loving-kindness',
      'local-mindfulness-urge-surfing',
      'local-mindfulness-leaves-stream',
      'local-mindfulness-mindful-eating'
    ]);

    for (const id of EXERCISE_CONTENT_BATCH_3B_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps complete aligned content for every exercise and locale', () => {
    for (const id of EXERCISE_CONTENT_BATCH_3B_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B[id];
      const expectedSteps = translations.en.steps.length;

      for (const locale of LOCALES) {
        const localized = translations[locale];
        expect(Object.keys(localized).sort()).toEqual([...REQUIRED_FIELDS].sort());
        expect(localized.title.trim().length).toBeGreaterThan(2);
        expect(localized.description.trim().length).toBeGreaterThan(20);
        expect(localized.tags.length).toBeGreaterThanOrEqual(4);
        expect(localized.steps).toHaveLength(expectedSteps);
        expect(localized.benefits).toHaveLength(3);
        expect(localized.tips.length).toBeGreaterThanOrEqual(2);

        for (const step of localized.steps) {
          expect(step.title.trim().length).toBeGreaterThan(1);
          expect(step.description.trim().length).toBeGreaterThan(10);
        }

        if (locale !== 'en') {
          expect(localized.title).not.toBe(translations.en.title);
          expect(localized.description).not.toBe(translations.en.description);
        }
      }
    }
  });

  it('resolves every entry through the central localization mechanism', () => {
    for (const id of EXERCISE_CONTENT_BATCH_3B_IDS) {
      const source = { id, title: 'English source', language: 'en' };
      for (const locale of LOCALES) {
        const localized = localizeExercise(source, locale);
        const expected = EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B[id][locale];
        expect(localized.title).toBe(expected.title);
        expect(localized.steps).toHaveLength(expected.steps.length);
        expect(localized.detailed_steps).toHaveLength(expected.steps.length);
        expect(localized.instructions).toContain(`1. ${expected.steps[0].title}:`);
        expect(localized.content_language).toBe(locale);
      }
    }
  });

  it('matches API records by canonical title and removes the local duplicate', () => {
    const apiRecord = {
      id: 'api-urge-surfing-81',
      title: 'Urge Surfing',
      category: 'emotion_regulation',
      language: 'en',
      favorite: true
    };

    const collection = localizeExerciseCollection([
      {
        id: 'local-mindfulness-urge-surfing',
        title: 'Urge Surfing',
        category: 'mindfulness',
        language: 'en'
      },
      apiRecord
    ], 'he');

    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-urge-surfing-81');
    expect(collection[0].title).toBe('גלישת דחף');
    expect(collection[0].favorite).toBe(true);
  });

  it('includes explicit Hebrew grounding and safety guidance where clinically relevant', () => {
    const catalog = EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B;
    expect(catalog['local-mindfulness-present-moment'].he.tips.join(' ')).toContain('עיניים פתוחות');
    expect(catalog['local-mindfulness-loving-kindness'].he.tips.join(' ')).toContain('דלגו');
    expect(catalog['local-mindfulness-urge-surfing'].he.tips.join(' ')).toContain('שירותי חירום');
    expect(catalog['local-mindfulness-leaves-stream'].he.tips.join(' ')).toContain('לא לרוקן');
    expect(catalog['local-mindfulness-mindful-eating'].he.tips.join(' ')).toContain('הפרעת אכילה');
  });
});
