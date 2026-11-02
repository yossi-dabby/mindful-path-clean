import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_1_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_1
} from '../../src/components/exercises/exerciseContentTranslationsBatch1.js';
import { localizeExercise } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 1', () => {
  it('contains exactly five exercises in all seven supported languages', () => {
    expect(EXERCISE_CONTENT_BATCH_1_IDS).toHaveLength(5);

    for (const id of EXERCISE_CONTENT_BATCH_1_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_1[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps every locale structurally complete and usable by the exercise detail UI', () => {
    for (const id of EXERCISE_CONTENT_BATCH_1_IDS) {
      const expectedStepCount = EXERCISE_CONTENT_TRANSLATIONS_BATCH_1[id].en.steps.length;

      for (const locale of LOCALES) {
        const content = EXERCISE_CONTENT_TRANSLATIONS_BATCH_1[id][locale];
        expect(Object.keys(content).sort()).toEqual([...REQUIRED_FIELDS].sort());
        expect(content.title.trim().length).toBeGreaterThan(2);
        expect(content.description.trim().length).toBeGreaterThan(20);
        expect(content.tags.length).toBeGreaterThanOrEqual(3);
        expect(content.steps).toHaveLength(expectedStepCount);
        expect(content.benefits.length).toBeGreaterThanOrEqual(3);
        expect(content.tips.length).toBeGreaterThanOrEqual(1);

        if (locale !== 'en') {
          expect(content.title).not.toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_1[id].en.title);
          expect(content.description).not.toBe(EXERCISE_CONTENT_TRANSLATIONS_BATCH_1[id].en.description);
        }

        for (const step of content.steps) {
          expect(step.title.trim().length).toBeGreaterThan(1);
          expect(step.description.trim().length).toBeGreaterThan(10);
        }
      }
    }
  });

  it('resolves catalog content without mutating the source exercise', () => {
    const source = {
      id: 'local-grounding-54321',
      title: '5-4-3-2-1 Sensory Grounding',
      description: 'English source',
      language: 'en'
    };

    const localized = localizeExercise(source, 'he');

    expect(localized.title).toBe('קרקוע חושי 5‑4‑3‑2‑1');
    expect(localized.steps).toHaveLength(5);
    expect(localized.content_language).toBe('he');
    expect(localized.localization_available).toBe(true);
    expect(source.title).toBe('5-4-3-2-1 Sensory Grounding');
    expect(source.steps).toBeUndefined();

    for (const locale of LOCALES) {
      const resolved = localizeExercise(source, locale);
      expect(resolved.title).toBe(
        EXERCISE_CONTENT_TRANSLATIONS_BATCH_1['local-grounding-54321'][locale].title
      );
      expect(resolved.content_language).toBe(locale);
    }
  });

  it('lets explicit entity translations override the versioned catalog', () => {
    const localized = localizeExercise({
      id: 'local-grounding-body-scan',
      title: 'Body Scan Awareness',
      language: 'en',
      translations: {
        he: { title: 'כותרת מותאמת ממקור הנתונים' }
      }
    }, 'he');

    expect(localized.title).toBe('כותרת מותאמת ממקור הנתונים');
    expect(localized.description).toBe(
      EXERCISE_CONTENT_TRANSLATIONS_BATCH_1['local-grounding-body-scan'].he.description
    );
  });

  it('uses safer cold-water wording in every language', () => {
    const coldWater = EXERCISE_CONTENT_TRANSLATIONS_BATCH_1['local-grounding-cold-water'];

    for (const locale of LOCALES) {
      expect(coldWater[locale].steps).toHaveLength(5);
      expect(coldWater[locale].tips).toHaveLength(2);
    }

    expect(JSON.stringify(coldWater.en)).not.toMatch(/hold(?:ing)? your breath/i);
    expect(coldWater.en.steps.at(-1).description).toMatch(/stop if/i);
  });
});
