import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EXERCISE_LEGACY_TITLE_IDS,
  EXERCISE_LEGACY_TITLE_TRANSLATIONS
} from '../../src/components/exercises/exerciseLegacyTitleTranslations.js';
import { localizeExercise } from '../../src/components/exercises/exerciseLocalization.js';

const LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('exercise preview localization and responsive fixes', () => {
  it('localizes the three legacy API titles in all seven locales', () => {
    expect(EXERCISE_LEGACY_TITLE_IDS).toEqual([
      'legacy-calm-center',
      'legacy-sleep-body-scan',
      'legacy-behavioral-activation-scheduling'
    ]);

    for (const id of EXERCISE_LEGACY_TITLE_IDS) {
      const translations = EXERCISE_LEGACY_TITLE_TRANSLATIONS[id];
      expect(Object.keys(translations).sort()).toEqual([...LOCALES].sort());
      for (const locale of LOCALES) {
        expect(translations[locale].title.trim().length).toBeGreaterThan(3);
        if (locale !== 'en') expect(translations[locale].title).not.toBe(translations.en.title);
      }
    }
  });

  it('resolves legacy API records by their canonical English titles', () => {
    const cases = [
      ['Calm & Center', 'רוגע ומיקוד'],
      ['Sleep Body Scan', 'סריקת גוף לשינה'],
      ['Behavioral Activation Scheduling', 'תכנון הפעלה התנהגותית']
    ];

    for (const [sourceTitle, expectedTitle] of cases) {
      const localized = localizeExercise({
        id: `api-${sourceTitle.toLowerCase().replace(/[^a-z]+/g, '-')}`,
        title: sourceTitle,
        language: 'en'
      }, 'he');

      expect(localized.title).toBe(expectedTitle);
      expect(localized.content_language).toBe('he');
    }
  });

  it('keeps the tablet title intact and the active category visible after resize', () => {
    const source = readFileSync(new URL('../../src/pages/Exercises.jsx', import.meta.url), 'utf8');

    const header = readFileSync(new URL('../../src/components/ui/LibraryPageHeader.jsx', import.meta.url), 'utf8');
    expect(source).toContain('<LibraryPageHeader');
    expect(header).toContain('lg:flex-row lg:items-center');
    // The shared header wraps long translated titles instead of clipping them.
    // home-stage1-completion.spec.ts also checks actual page bounds in 3 sizes.
    expect(header).toContain('min-w-0 break-words text-2xl');
    expect(source).toContain('new ResizeObserver(keepActiveCategoryVisible)');
    expect(source).toContain('const resizeTarget = categoryScrollerRef.current');
    expect(source).toContain('ref={categoryScrollerRef}');
    expect(source).toContain('dir="ltr"');
    expect(source).toContain('scroller.scrollTo({ left: Math.max(0, centeredOffset)');
    expect(source).toContain("window.addEventListener('resize', keepActiveCategoryVisible)");
    expect(source).toContain("scrollbarWidth: 'thin'");
    expect(source).toContain('bg-gradient-to-r from-teal-100');
    expect(source).toContain('bg-gradient-to-l from-teal-100');
  });

  it('opens breathing directly from the category tab without duplicate cards', () => {
    const source = readFileSync(new URL('../../src/pages/Exercises.jsx', import.meta.url), 'utf8');

    expect(source).toContain('onValueChange={handleCategoryChange}');
    expect(source).toContain("if (category === 'breathing')");
    expect(source).toContain('setShowBreathingTool(true)');
    expect(source).toContain('onClose={closeBreathingTool}');
    expect(source).toContain('onComplete={closeBreathingTool}');
    expect(source).not.toContain('Interactive Breathing Tool Card');
    expect(source).not.toContain("t('breathing_tool.card_title')");
    expect(source).not.toContain("t('breathing_tool.open_tool')");
  });

  it('keeps breathing settings localized without hard-coded English units', () => {
    const toolSource = readFileSync(new URL('../../src/components/exercises/InteractiveBreathingTool.jsx', import.meta.url), 'utf8');
    const translationsSource = readFileSync(new URL('../../src/components/i18n/translations.jsx', import.meta.url), 'utf8');

    expect(toolSource).toContain("t('breathing_tool.controls.stage')");
    expect(toolSource).toContain("duration_value', { min: exercise.minMinutes }");
    expect(toolSource).toContain("duration_value', { min: exercise.maxMinutes }");
    expect(toolSource).not.toContain('{exercise.minMinutes}m');
    expect(toolSource).not.toContain('{exercise.maxMinutes}m');
    expect(translationsSource).toContain('stage: "שלב"');
    expect(translationsSource).toContain('get_ready: "התכוננו..."');
  });
});
