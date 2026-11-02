import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';
import { sixStepGoalTranslations } from '../../src/components/i18n/sixStepGoalTranslations.js';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

function flatten(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') {
      flatten(child, path, output);
    } else {
      output[path] = child;
    }
  }
  return output;
}

describe('P1 wave 3 — goals, exercises, and advanced journal flows', () => {
  it('keeps the six-step goal dictionary complete and structurally identical in all languages', () => {
    const expectedKeys = Object.keys(flatten(sixStepGoalTranslations.en)).sort();
    expect(expectedKeys).toHaveLength(103);

    for (const language of LANGUAGES) {
      const dictionary = translations[language].translation.six_step_goal;
      const flattened = flatten(dictionary);
      expect(Object.keys(flattened).sort(), language).toEqual(expectedKeys);

      for (const key of expectedKeys) {
        expect(flattened[key], `${language}.six_step_goal.${key}`).toEqual(expect.any(String));
        expect(flattened[key].trim()).not.toBe('');
      }
    }
  });

  it('resolves every static six-step goal key used by the wizard', () => {
    const source = readFileSync('src/components/goals/SixStepGoalWizard.jsx', 'utf8');
    const usedKeys = [...source.matchAll(/six_step_goal\.([A-Za-z0-9_.]+)/g)]
      .map((match) => match[1])
      .filter((key) => !key.endsWith('.'));
    const english = flatten(sixStepGoalTranslations.en);

    expect(new Set(usedKeys).size).toBe(103);
    for (const key of new Set(usedKeys)) {
      expect(english[key], key).toEqual(expect.any(String));
    }

    expect(source).not.toContain('>Define the Problem<');
    expect(source).not.toContain('>Daily Check-ins<');
    expect(source).not.toContain('>Create Goal<');
  });

  it('keeps the thought coach close label localized without an English fallback', () => {
    const source = readFileSync('src/components/journal/ThoughtCoachWizard.jsx', 'utf8');

    for (const language of LANGUAGES) {
      expect(translations[language].translation.thought_coach.close_aria).toEqual(expect.any(String));
      expect(translations[language].translation.thought_coach.close_aria.trim()).not.toBe('');
    }

    expect(source).toContain("t('thought_coach.close_aria')");
    expect(source).not.toContain("t('thought_coach.close_aria', 'Close')");
  });

  it('keeps the exercise detail flow connected to translated UI and app locale dates', () => {
    const source = readFileSync('src/components/exercises/ExerciseDetail.jsx', 'utf8');

    expect(source).toContain("t('exercise_view.last_practiced'");
    expect(source).toContain('i18n.resolvedLanguage || i18n.language');
    expect(source).toContain("t('exercise_view.mark_complete')");
    expect(source).not.toContain('toLocaleDateString(\'en-US\'');
  });
});
