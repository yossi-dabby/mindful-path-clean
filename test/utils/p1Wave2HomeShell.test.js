import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';
import { applyStageBUiTranslations } from '../../src/components/i18n/stageBUiTranslations.js';

applyStageBUiTranslations(translations);

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const REQUIRED_KEYS = [
  ...['title', 'close', 'intro', 'description', 'generate', 'generating', 'overview', 'outcomes', 'schedule', 'day', 'minutes', 'start', 'reason', 'focus', 'progression', 'error'].map((key) => `ai_practice.${key}`),
  'shell.skip_to_main',
  'shell.main_navigation',
  'shell.sidebar_navigation',
  'shell.additional_navigation',
  'home.oasis_label',
  'gamification.streak.day_streak',
  'gamification.streak.daily_title',
  'gamification.streak.momentum',
  'gamification.streak.on_fire',
  'gamification.streak.current',
  'gamification.streak.best',
  'gamification.streak.days',
  'gamification.streak.seven_days',
  'gamification.streak.week_complete',
  'gamification.streak.check_ins',
  'gamification.streak.journals',
  'gamification.streak.exercises',
  'gamification.badges.badges',
  'gamification.badges.in_progress_count',
  'gamification.badges.earned_badges',
  'gamification.badges.earned_count',
  'gamification.badges.first_badge_prompt',
  'gamification.badges.in_progress',
  'gamification.badges.progress',
  'gamification.badges.rarity.common',
  'gamification.badges.rarity.rare',
  'gamification.badges.rarity.epic',
  'gamification.badges.rarity.legendary'
];

function getByPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

describe('P1 wave 2 — localized home and shared shell', () => {
  for (const language of LANGUAGES) {
    it(`contains every wave 2 key in ${language}`, () => {
      const dictionary = translations[language].translation;
      for (const key of REQUIRED_KEYS) {
        const value = getByPath(dictionary, key);
        expect(value, `${language}.${key}`).toEqual(expect.any(String));
        expect(value.trim(), `${language}.${key}`).not.toBe('');
      }
    });
  }

  it('removes hardcoded English from the home shell and compact cards', () => {
    const files = [
      'src/components/layout/AppContent.jsx',
      'src/components/layout/BottomNav.jsx',
      'src/components/layout/MobileMenu.jsx',
      'src/components/layout/Sidebar.jsx',
      'src/pages/Home.jsx',
      'src/components/gamification/StreakWidget.jsx',
      'src/components/gamification/BadgeDisplay.jsx'
    ];
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');

    for (const phrase of [
      '>Skip to main content<',
      'aria-label="Main navigation"',
      'aria-label="Sidebar navigation"',
      'aria-label="Additional navigation"',
      '>day streak<',
      '>Badges<',
      '>Earned Badges<'
    ]) {
      expect(source).not.toContain(phrase);
    }
  });

  it('uses translated home help labels and safe direction for dynamic badge copy', () => {
    const home = readFileSync('src/pages/Home.jsx', 'utf8');
    const badges = readFileSync('src/components/gamification/BadgeDisplay.jsx', 'utf8');
    const mobileMenu = readFileSync('src/components/layout/MobileMenu.jsx', 'utf8');

    expect(home).toContain("t('home.oasis_label')");
    expect(home).toContain("t('home.aria.view_goal_details')");
    expect(home).toContain("t('home.aria.watch_goals_help_video')");
    expect(home).toContain("t('home.aria.watch_journal_help_video')");
    expect(badges.match(/dir="auto"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(mobileMenu).toContain('<DrawerTitle');
  });
});
