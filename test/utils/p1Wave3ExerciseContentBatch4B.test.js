import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CONTENT_BATCH_4B_IDS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B
} from '../../src/components/exercises/exerciseContentTranslationsBatch4B.js';
import { localizeExercise, localizeExerciseCollection } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const FIELDS = ['title', 'description', 'tags', 'steps', 'benefits', 'tips'];

describe('P1 wave 3 exercise content batch 4B', () => {
  it('contains the planned seven sleep and relationship exercises in all locales', () => {
    expect(EXERCISE_CONTENT_BATCH_4B_IDS).toEqual([
      'local-sleep-hygiene',
      'local-sleep-progressive-relaxation',
      'local-sleep-worry-time',
      'local-relationship-active-listening',
      'local-relationship-assertive-communication',
      'local-relationship-conflict-resolution',
      'local-relationship-boundary-setting'
    ]);
    for (const id of EXERCISE_CONTENT_BATCH_4B_IDS) {
      expect(Object.keys(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B[id]).sort()).toEqual([...LOCALES].sort());
    }
  });

  it('keeps complete aligned localized content', () => {
    for (const id of EXERCISE_CONTENT_BATCH_4B_IDS) {
      const translations = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B[id];
      const expectedSteps = translations.en.steps.length;
      for (const locale of LOCALES) {
        const localized = translations[locale];
        expect(Object.keys(localized).sort()).toEqual([...FIELDS].sort());
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
    for (const id of EXERCISE_CONTENT_BATCH_4B_IDS) {
      for (const locale of LOCALES) {
        const expected = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B[id][locale];
        const localized = localizeExercise({ id, title: 'English source', language: 'en' }, locale);
        expect(localized.title).toBe(expected.title);
        expect(localized.steps).toHaveLength(expected.steps.length);
        expect(localized.content_language).toBe(locale);
      }
    }
    const collection = localizeExerciseCollection([
      { id: 'local-relationship-active-listening', title: 'Active Listening Practice', category: 'relationships', language: 'en' },
      { id: 'api-listening-1', title: 'Active Listening Practice', category: 'relationships', language: 'en', favorite: true }
    ], 'he');
    expect(collection).toHaveLength(1);
    expect(collection[0].id).toBe('api-listening-1');
    expect(collection[0].title).toBe('תרגול הקשבה פעילה');
  });

  it('keeps explicit abuse and immediate-danger safeguards in every locale', () => {
    for (const locale of LOCALES) {
      const conflict = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B['local-relationship-conflict-resolution'][locale];
      const boundary = EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B['local-relationship-boundary-setting'][locale];
      expect(conflict.tips.join(' ').length).toBeGreaterThan(100);
      expect(boundary.tips.join(' ').length).toBeGreaterThan(90);
    }
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B['local-relationship-conflict-resolution'].he.tips.join(' ')).toContain('סכנה מיידית');
    expect(EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B['local-relationship-boundary-setting'].en.tips.join(' ')).toContain('safety plan');
  });
});
