import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wave3Batch3Translations } from '../../src/components/i18n/wave3Batch3Translations.js';
import {
  hasExerciseLocale,
  localizeExercise,
  localizeExerciseCollection
} from '../../src/components/exercises/exerciseLocalization.js';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

function flatten(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

describe('P1 wave 3 batch 3 — active goals and exercise localization', () => {
  it('keeps the new goal and exercise dictionaries complete in all seven languages', () => {
    const expected = Object.keys(flatten(wave3Batch3Translations.en)).sort();
    expect(expected.length).toBeGreaterThan(70);

    for (const language of LANGUAGES) {
      const dictionary = flatten(wave3Batch3Translations[language]);
      expect(Object.keys(dictionary).sort(), language).toEqual(expected);
      for (const key of expected) {
        expect(dictionary[key], `${language}.${key}`).toEqual(expect.any(String));
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  });

  it('removes hard-coded active goal and exercise-list UI copy', () => {
    const goalForm = readFileSync('src/components/goals/GoalForm.jsx', 'utf8');
    const goalCard = readFileSync('src/components/goals/GoalCard.jsx', 'utf8');
    const quickStart = readFileSync('src/components/exercises/QuickStartPanel.jsx', 'utf8');
    const library = readFileSync('src/components/exercises/ExerciseLibrary.jsx', 'utf8');

    expect(goalForm).toContain("t('goals.form.create_title')");
    expect(goalForm).toContain("t('goals.form.ai_prompt_intro')");
    expect(goalForm).not.toContain('>Basic Info<');
    expect(goalForm).not.toContain('>Generate Goal Suggestions<');
    expect(goalCard).toContain("t('goals.card.progress')");
    expect(goalCard).toContain('Intl.DateTimeFormat(appLocale');
    expect(goalCard).not.toContain('>Progress ');
    expect(goalCard).not.toContain('>Tasks:<');
    expect(quickStart).not.toContain('>Quick Start<');
    expect(library).not.toContain("'Remove from favorites'");
  });

  it('resolves nested, flat-field, and language-record exercise content safely', () => {
    const nested = {
      id: 'nested',
      title: 'English title',
      language: 'en',
      translations: {
        he: {
          title: 'כותרת בעברית',
          description: 'תיאור בעברית',
          detailed_steps: [{ title: 'צעד', description: 'הנחיה' }]
        }
      }
    };
    const localized = localizeExercise(nested, 'he-IL');
    expect(localized.title).toBe('כותרת בעברית');
    expect(localized.description).toBe('תיאור בעברית');
    expect(localized.content_language).toBe('he');
    expect(localized.localization_available).toBe(true);
    expect(hasExerciseLocale(nested, 'he')).toBe(true);

    const flat = localizeExercise({
      id: 'flat',
      title: 'English',
      language: 'en',
      title_es: 'Español',
      description_es: 'Descripción'
    }, 'es');
    expect(flat.title).toBe('Español');
    expect(flat.description).toBe('Descripción');

    const chosen = localizeExerciseCollection([
      { id: 'en-id', slug: 'same', title: 'English', language: 'en' },
      { id: 'he-id', slug: 'same', title: 'עברית', language: 'he' }
    ], 'he');
    expect(chosen).toHaveLength(1);
    expect(chosen[0].title).toBe('עברית');
  });
});
