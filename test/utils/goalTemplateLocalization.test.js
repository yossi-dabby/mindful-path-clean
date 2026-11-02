import { describe, expect, it } from 'vitest';
import { SUPPORTED_APP_LOCALES } from '../../src/components/i18n/appLocale.js';
import {
  GOAL_TEMPLATE_CATALOG,
  GOAL_TEMPLATE_IDS,
  GOAL_TEMPLATE_UI_COPY,
  hasCompleteGoalTemplateTranslations,
  localizeGoalTemplate,
  resolveGoalTemplateId
} from '../../src/components/goals/goalTemplateLocalization.js';

const LIVE_TEMPLATE_TITLES = [
  'Build a Daily Exercise Habit',
  'Improve Sleep Quality',
  'Reduce Social Anxiety',
  'Practice Daily Gratitude',
  'Develop Better Study Habits',
  'Build Stronger Friendships',
  'Overcome Procrastination',
  'Learn to Manage Anger'
];

const SMART_KEYS = ['specific', 'measurable', 'achievable', 'relevant', 'time_bound'];

describe('goal template localization — seven-language coverage', () => {
  it('covers exactly the application locales and every active template', () => {
    expect(Object.keys(GOAL_TEMPLATE_CATALOG)).toEqual(SUPPORTED_APP_LOCALES);
    expect(Object.keys(GOAL_TEMPLATE_UI_COPY)).toEqual(SUPPORTED_APP_LOCALES);
    expect(hasCompleteGoalTemplateTranslations()).toBe(true);

    for (const locale of SUPPORTED_APP_LOCALES) {
      expect(Object.keys(GOAL_TEMPLATE_CATALOG[locale])).toEqual(GOAL_TEMPLATE_IDS);
    }
  });

  it.each(SUPPORTED_APP_LOCALES)('contains complete content for %s', (locale) => {
    for (const id of GOAL_TEMPLATE_IDS) {
      const template = GOAL_TEMPLATE_CATALOG[locale][id];
      expect(template.title).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.motivation).toBeTruthy();
      expect(Object.keys(template.smart_criteria)).toEqual(SMART_KEYS);
      expect(Object.values(template.smart_criteria).every(Boolean)).toBe(true);
      expect(template.milestones).toHaveLength(4);
      expect(template.milestones.every(({ title, description }) => title && description)).toBe(true);
    }
  });

  it('maps every active Base44 record title to a stable translation key', () => {
    expect(LIVE_TEMPLATE_TITLES.map((title) => resolveGoalTemplateId({ title }))).toEqual(
      expect.arrayContaining(GOAL_TEMPLATE_IDS)
    );
    expect(new Set(LIVE_TEMPLATE_TITLES.map((title) => resolveGoalTemplateId({ title })).filter(Boolean)).size)
      .toBe(GOAL_TEMPLATE_IDS.length);
  });

  it.each(SUPPORTED_APP_LOCALES.filter((locale) => locale !== 'en'))(
    'replaces all user-entered goal fields in %s instead of leaking English',
    (locale) => {
      for (const title of LIVE_TEMPLATE_TITLES) {
        const source = {
          title,
          description: 'English source description',
          motivation: 'English source motivation',
          smart_criteria: Object.fromEntries(SMART_KEYS.map((key) => [key, 'English source criterion'])),
          milestones: Array.from({ length: 4 }, () => ({
            title: 'English source milestone',
            description: 'English source milestone description'
          })),
          tips: ['English source tip']
        };

        const localized = localizeGoalTemplate(source, locale);
        expect(localized.localization_missing).toBe(false);
        expect(localized.title).not.toBe(source.title);
        expect(localized.description).not.toBe(source.description);
        expect(localized.motivation).not.toBe(source.motivation);
        expect(Object.values(localized.smart_criteria)).not.toContain('English source criterion');
        expect(localized.milestones.flatMap(({ title: milestoneTitle, description }) => [milestoneTitle, description]))
          .not.toContain('English source milestone');
        expect(localized.tips).toEqual([]);
      }
    }
  );

  it('normalizes regional Portuguese and flags unknown non-English templates', () => {
    expect(localizeGoalTemplate({ title: LIVE_TEMPLATE_TITLES[0] }, 'pt-BR').title)
      .toBe(GOAL_TEMPLATE_CATALOG.pt.daily_exercise.title);
    expect(localizeGoalTemplate({ title: 'Future untranslated template' }, 'he').localization_missing)
      .toBe(true);
  });
});
