import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_3A_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A
} from '../../src/components/exercises/exerciseContentTranslationsBatch3A.js';
import { localizeExercise, localizeExerciseCollection } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 3A', () => {
  it('contains five behavioral activation exercises in all seven locales', () => {
    expect(EXERCISE_CONTENT_BATCH_3A_IDS).toEqual([
      'local-behavioral-activity-scheduling',
      'local-behavioral-experiment',
      'local-behavioral-opposite-action',
      'local-behavioral-values-action',
      'local-behavioral-pleasure-mastery'
    ]);

    for (const id of EXERCISE_CONTENT_BATCH_3A_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps every localized detail page complete and structurally aligned', () => {
    for (const id of EXERCISE_CONTENT_BATCH_3A_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A[id];
      const expectedStepCount = translations.en.steps.length;

      for (const locale of LOCALES) {
        const localized = translations[locale];
        expect(Object.keys(localized).sort()).toEqual([...REQUIRED_FIELDS].sort());
        expect(localized.title.trim().length).toBeGreaterThan(2);
        expect(localized.description.trim().length).toBeGreaterThan(20);
        expect(localized.tags.length).toBeGreaterThanOrEqual(4);
        expect(localized.steps).toHaveLength(expectedStepCount);
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

  it('resolves all five exercises in every supported locale without mutating source records', () => {
    for (const id of EXERCISE_CONTENT_BATCH_3A_IDS) {
      const source = { id, title: 'English source', language: 'en' };
      for (const locale of LOCALES) {
        const localized = localizeExercise(source, locale);
        expect(localized.title).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A[id][locale].title);
        expect(localized.steps).toHaveLength(EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A[id].en.steps.length);
        expect(localized.detailed_steps).toHaveLength(localized.steps.length);
        expect(localized.content_language).toBe(locale);
      }
      expect(source.steps).toBeUndefined();
    }
  });

  it('matches and deduplicates an API record by canonical English title', () => {
    const source = {
      id: 'api-behavioral-values-42',
      title: 'Values-Aligned Action',
      category: 'cbt_behavioral',
      language: 'en',
      completed_count: 4,
      instructions: 'English-only instructions'
    };

    const localized = localizeExercise(source, 'he');
    expect(localized.title).toBe('פעולה בהתאם לערכים');
    expect(localized.instructions).toContain('1. בחירת ערך:');

    const collection = localizeExerciseCollection([
      {
        id: 'local-behavioral-values-action',
        title: 'Values-Aligned Action',
        category: 'behavioral_activation',
        language: 'en'
      },
      source
    ], 'he');

    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-behavioral-values-42');
    expect(collection[0].title).toBe('פעולה בהתאם לערכים');
  });

  it('deduplicates a title variant when its explicit localized title matches the catalog', () => {
    const collection = localizeExerciseCollection([
      {
        id: 'local-behavioral-experiment',
        title: 'Behavioral Experiment',
        category: 'behavioral_activation',
        language: 'en'
      },
      {
        id: 'api-behavioral-experiment-variant',
        title: 'Behavioral Experiment Practice',
        category: 'cbt_experiment',
        language: 'en',
        translations: { he: { title: 'ניסוי התנהגותי' } }
      }
    ], 'he');

    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-behavioral-experiment-variant');
    expect(collection[0].title).toBe('ניסוי התנהגותי');
  });

  it('keeps Hebrew scales, safety guidance, and non-judgmental wording explicit', () => {
    const catalog = EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A;
    expect(catalog['local-behavioral-activity-scheduling'].he.steps[1].description).toContain('0 ל־10');
    expect(catalog['local-behavioral-experiment'].he.tips.join(' ')).toContain('לסכן');
    expect(catalog['local-behavioral-opposite-action'].he.tips.join(' ')).toContain('סכנה');
    expect(catalog['local-behavioral-values-action'].he.tips.join(' ')).toContain('לא לשלוט');
    expect(catalog['local-behavioral-pleasure-mastery'].he.tips.join(' ')).toContain('לא את מה');
  });
});
