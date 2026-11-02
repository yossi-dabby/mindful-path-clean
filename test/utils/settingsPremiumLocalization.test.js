import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations';
import { applySettingsUiTranslations } from '../../src/components/i18n/settingsUiTranslations';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const requiredPaths = [
  'settings_ui.hero_title',
  'settings_ui.hero_subtitle',
  'settings_ui.quick_navigation',
  'settings.notifications.in_app_title',
  'settings.notifications.email_title',
  'settings.notifications.daily_title',
  'settings.notifications.critical_title',
  'mobile_menu.subtitle',
  'mobile_menu.main_section',
  'mobile_menu.more_section',
  'premium.title',
  'premium.start_trial',
  'premium.close_aria'
];

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

describe('Settings premium localisation', () => {
  applySettingsUiTranslations(translations);

  for (const language of languages) {
    it('provides every premium Settings key for ' + language, () => {
      const dictionary = translations[language]?.translation;
      for (const path of requiredPaths) {
        const value = readPath(dictionary, path);
        expect(value, 'Missing ' + language + ':' + path).toEqual(expect.any(String));
        expect(value.trim(), 'Empty ' + language + ':' + path).not.toBe('');
      }
    });
  }

  it('does not leave English notification headings in Hebrew', () => {
    const hebrew = translations.he.translation;
    expect(readPath(hebrew, 'settings.notifications.in_app_title')).not.toBe('In-app notifications');
    expect(readPath(hebrew, 'settings.notifications.email_title')).not.toBe('Email notifications');
  });
});
