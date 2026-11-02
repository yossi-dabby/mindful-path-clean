import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_2_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_2
} from '../../src/components/exercises/exerciseContentTranslationsBatch2.js';
import { localizeExercise, localizeExerciseCollection } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 2', () => {
  it('contains five cognitive exercises in every supported language', () => {
    expect(EXERCISE_CONTENT_BATCH_2_IDS).toHaveLength(5);

    for (const id of EXERCISE_CONTENT_BATCH_2_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps the full detail-page structure complete and aligned', () => {
    for (const id of EXERCISE_CONTENT_BATCH_2_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_2[id];
      const expectedStepCount = translations.en.steps.length;
      expect(expectedStepCount).toBe(6);

      for (const locale of LOCALES) {
        const content = translations[locale];
        expect(Object.keys(content).sort()).toEqual([...REQUIRED_FIELDS].sort());
        expect(content.title.trim().length).toBeGreaterThan(2);
        expect(content.description.trim().length).toBeGreaterThan(20);
        expect(content.tags.length).toBeGreaterThanOrEqual(4);
        expect(content.steps).toHaveLength(expectedStepCount);
        expect(content.benefits).toHaveLength(3);
        expect(content.tips.length).toBeGreaterThanOrEqual(1);

        if (locale !== 'en') {
          expect(content.title).not.toBe(translations.en.title);
          expect(content.description).not.toBe(translations.en.description);
        }

        for (const step of content.steps) {
          expect(step.title.trim().length).toBeGreaterThan(1);
          expect(step.description.trim().length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('resolves each catalog entry in all seven languages', () => {
    for (const id of EXERCISE_CONTENT_BATCH_2_IDS) {
      const source = { id, title: 'English source', description: 'English source content', language: 'en' };

      for (const locale of LOCALES) {
        const localized = localizeExercise(source, locale);
        expect(localized.title).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2[id][locale].title);
        expect(localized.description).toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2[id][locale].description);
        expect(localized.steps).toHaveLength(6);
        expect(localized.content_language).toBe(locale);
        expect(localized.localization_available).toBe(true);
      }

      expect(source.title).toBe('English source');
      expect(source.steps).toBeUndefined();
    }
  });

  it('localizes and deduplicates API records that use a different id', () => {
    const localized = localizeExercise({
      id: 'api-record-123',
      title: 'Evidence-Based Reality Testing',
      category: 'cognitive_restructuring',
      language: 'en',
      instructions: 'English instructions',
      detailed_steps: [{ step_number: 1, title: 'English step', description: 'English description' }]
    }, 'he');

    expect(localized.title).toBe('בדיקת מציאות מבוססת ראיות');
    expect(localized.steps).toHaveLength(6);
    expect(localized.detailed_steps).toHaveLength(6);
    expect(localized.detailed_steps[0].title).toBe('זיהוי המחשבה');
    expect(localized.instructions).toContain('1. זיהוי המחשבה:');

    const collection = localizeExerciseCollection([
      {
        id: 'local-cognitive-evidence-testing',
        title: 'Evidence-Based Reality Testing',
        category: 'cognitive_restructuring',
        language: 'en'
      },
      {
        id: 'api-record-123',
        title: 'Evidence-Based Reality Testing',
        category: 'cognitive_restructuring',
        language: 'en',
        completed_count: 3
      }
    ], 'he');

    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-record-123');
    expect(collection[0].title).toBe('בדיקת מציאות מבוססת ראיות');
  });

  it('preserves the priority of explicit entity translations', () => {
    const localized = localizeExercise({
      id: 'local-cognitive-thought-record',
      title: 'Thought Record',
      language: 'en',
      translations: {
        he: { title: 'כותרת מותאמת מרשומת התרגיל' }
      }
    }, 'he');

    expect(localized.title).toBe('כותרת מותאמת מרשומת התרגיל');
    expect(localized.steps).toEqual(
      EXERCISE_CONTENT_TRANSLATIONS_BATCH_2['local-cognitive-thought-record'].he.steps
    );
  });

  it('uses consistent CBT scales and non-judgmental Hebrew wording', () => {
    const he = Object.values(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2).map((entry) => entry.he);
    expect(he.every((entry) => entry.steps.length === 6)).toBe(true);
    expect(JSON.stringify(he)).not.toContain('Cognitive Distortion Detective');
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2['local-cognitive-distortion-detective'].he.tips.join(' ')).toContain('לא כמבקרים');
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_2['local-cognitive-evidence-testing'].he.steps.at(-1).description).toContain('0 ל־100');
  });
});
