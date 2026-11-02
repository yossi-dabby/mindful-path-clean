import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const PANEL_KEYS = [
  'bell_aria',
  'new_count',
  'mark_all_read',
  'empty_title',
  'empty_message',
  'delete_aria'
];
const AGE_GATE_KEYS = [
  'title',
  'message',
  'teen_support_heading',
  'teen_support.counselor',
  'teen_support.teen_line',
  'teen_support.crisis_text_line',
  'confirm_button',
  'decline_button'
];

function getByPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

describe('P1 multilingual shared UI', () => {
  for (const language of LANGUAGES) {
    it(`has complete notification and age-gate copy in ${language}`, () => {
      const dictionary = translations[language].translation;

      for (const key of PANEL_KEYS) {
        expect(getByPath(dictionary, `settings.notifications.panel.${key}`)).toEqual(expect.any(String));
        expect(getByPath(dictionary, `settings.notifications.panel.${key}`).trim()).not.toBe('');
      }

      for (const key of AGE_GATE_KEYS) {
        expect(getByPath(dictionary, `age_gate.${key}`)).toEqual(expect.any(String));
        expect(getByPath(dictionary, `age_gate.${key}`).trim()).not.toBe('');
      }
    });
  }

  it('connects NotificationBell to the central locale and localized date formats', () => {
    const source = readFileSync('src/components/notifications/NotificationBell.jsx', 'utf8');

    expect(source).toContain('getCurrentAppLocale(i18n)');
    expect(source).toContain('DATE_FNS_LOCALES');
    expect(source).toContain("t('settings.notifications.panel.empty_title')");
    expect(source).toContain('locale: dateLocale');
    expect(source).toContain('dir="auto"');
    expect(source).not.toContain('>All caught up!</p>');
    expect(source).not.toContain('aria-label="Notifications"');
  });

  it('connects AgeGateModal to translations and exposes dialog semantics', () => {
    const source = readFileSync('src/components/utils/AgeGateModal.jsx', 'utf8');

    expect(source).toContain("t('age_gate.title')");
    expect(source).toContain("t('age_gate.confirm_button')");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="age-gate-title"');
    expect(source).toContain('aria-describedby="age-gate-description"');
    expect(source).not.toContain('Age Verification Required');
    expect(source).not.toContain("I'm 18 or Older");
  });
});
