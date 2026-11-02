import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_4A_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A
} from '../../src/components/exercises/exerciseContentTranslationsBatch4A.js';
import { localizeExercise, localizeExerciseCollection } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 4A', () => {
  it('contains the planned seven exposure and sleep exercises in all locales', () => {
    expect(EXERCISE_CONTENT_BATCH_4A_IDS).toEqual([
      'local-exposure-fear-hierarchy',
      'local-exposure-systematic-desensitization',
      'local-exposure-imaginal',
      'local-exposure-interoceptive',
      'local-exposure-social',
      'local-sleep-stimulus-control',
      'local-sleep-restriction'
    ]);
    for (const id of EXERCISE_CONTENT_BATCH_4A_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps complete aligned localized content', () => {
    for (const id of EXERCISE_CONTENT_BATCH_4A_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A[id];
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
        if (locale !== 'en') expect(localized.title).not.toBe(translations.en.title);
      }
    }
  });

  it('resolves by id and canonical API title through the central mechanism', () => {
    for (const id of EXERCISE_CONTENT_BATCH_4A_IDS) {
      for (const locale of LOCALES) {
        const expected = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A[id][locale];
        const localized = localizeExercise({ id, title: 'English source', language: 'en' }, locale);
        expect(localized.title).toBe(expected.title);
        expect(localized.steps).toHaveLength(expected.steps.length);
        expect(localized.content_language).toBe(locale);
      }
    }
    const collection = localizeExerciseCollection([
      { id: 'local-sleep-stimulus-control', title: 'Stimulus Control', category: 'sleep', language: 'en' },
      { id: 'api-sleep-1', title: 'Stimulus Control', category: 'sleep', language: 'en', favorite: true }
    ], 'he');
    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-sleep-1');
    expect(collection[0].title).toBe('שליטה בגירויים');
  });

  it('contains explicit safety protections for higher-risk practices in every locale', () => {
    for (const locale of LOCALES) {
      const interoceptive = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A['local-exposure-interoceptive'][locale];
      const sleepRestriction = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A['local-sleep-restriction'][locale];
      expect(interoceptive.tips.join(' ').length).toBeGreaterThan(80);
      expect(sleepRestriction.tips.join(' ').length).toBeGreaterThan(100);
    }
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A['local-exposure-interoceptive'].en.tips.join(' ')).toContain('never restrict breathing');
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A['local-sleep-restriction'].he.tips.join(' ')).toContain('אין לנהוג');
  });
});
