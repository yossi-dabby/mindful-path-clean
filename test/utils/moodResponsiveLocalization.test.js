import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyMoodUiTranslations } from '../../src/components/i18n/moodUiTranslations.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Mood production UX safeguards', () => {
  it('installs the complete Mood UI pack for all seven supported languages', () => {
    const translations = Object.fromEntries(
      languages.map((language) => [language, { translation: { mood_tracker: { page_title: language } } }])
    );

    applyMoodUiTranslations(translations);

    for (const language of languages) {
      const mood = translations[language].translation.mood_tracker;
      expect(mood.page_title).toBe(language);
      expect(mood.loading).toBeTruthy();
      expect(mood.calendar.title).toBeTruthy();
      expect(mood.form.dialog_description).toBeTruthy();
      expect(mood.insights.recommendations).toBeTruthy();
      expect(mood.taxonomy.emotions.overwhelmed).toBeTruthy();
      expect(mood.taxonomy.triggers.social_media).toBeTruthy();
      expect(mood.taxonomy.activities.outdoor_activities).toBeTruthy();
    }
  });

  it('applies the Mood pack during i18n bootstrap', () => {
    const source = read('src/components/i18n/i18nConfig.jsx');
    expect(source).toContain("import { applyMoodUiTranslations } from './moodUiTranslations'");
    expect(source).toContain('applyMoodUiTranslations(translations)');
  });

  it('loads only the authenticated users entries and exposes recovery states', () => {
    const source = read('src/pages/MoodTracker.jsx');
    expect(source).toContain("queryKey: ['moodEntries', user?.email, dateRange]");
    expect(source).toContain("filter({ created_by: user.email }, '-date', dateRange * 2)");
    expect(source).toContain("t('mood_tracker.load_error')");
    expect(source).toContain('refetchMood');
    expect(source).not.toContain('MoodEntry.list(');
  });

  it('uses local calendar dates and keeps all form controls accessible', () => {
    const page = read('src/pages/MoodTracker.jsx');
    const form = read('src/components/mood/DetailedMoodForm.jsx');
    expect(page).toContain('getLocalDateKey()');
    expect(form).toContain('role="dialog"');
    expect(form).toContain('aria-modal="true"');
    expect(form).toContain('aria-pressed={formData.mood === mood.value}');
    expect(form).toContain("setQueriesData({ queryKey: ['moodEntries'] }");
    expect(form).toContain('toMoodPayload');
    expect(form).not.toContain("toISOString().split('T')[0]");
  });

  it('localises calendar, taxonomy and AI output without legacy English UI', () => {
    const calendar = read('src/components/mood/MoodCalendar.jsx');
    const form = read('src/components/mood/DetailedMoodForm.jsx');
    const insights = read('src/components/mood/MoodInsights.jsx');
    expect(calendar).toContain("t('mood_tracker.calendar.title')");
    expect(calendar).toContain('DATE_FNS_LOCALES');
    expect(form).toContain("taxonomyLabel('emotions', emotion)");
    expect(insights).toContain('Write every user-visible field exclusively');
    expect(insights).toContain("t('mood_tracker.insights.error')");
    for (const legacy of ['Mood Calendar', 'Total Entries', 'Get AI-Powered Insights', 'Key Mood Triggers', 'Generate Insights']) {
      expect(`${calendar}\n${insights}`).not.toContain(legacy);
    }
  });

  it('provides responsive navigation, charts and modal controls', () => {
    const page = read('src/pages/MoodTracker.jsx');
    const trend = read('src/components/mood/MoodTrendChart.jsx');
    const triggers = read('src/components/mood/TriggerAnalysis.jsx');
    const form = read('src/components/mood/DetailedMoodForm.jsx');
    expect(page).toContain('grid-cols-3');
    expect(page).toContain('sm:inline-grid sm:w-auto');
    // The entire canvas now fits the viewport instead of requiring a 500–620px
    // nested horizontal scroller; path-stage3-flows checks the rendered bounds.
    expect(trend).toContain('ResponsiveContainer');
    expect(trend).not.toContain('min-w-[620px]');
    expect(triggers).toContain('ResponsiveContainer');
    expect(triggers).not.toContain('min-w-[500px]');
    expect(form).toContain('min(92dvh, 900px)');
    expect(form).toContain("env(safe-area-inset-bottom, 0px)");
  });
});
