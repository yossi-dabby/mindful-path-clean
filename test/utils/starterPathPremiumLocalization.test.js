import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations';
import { applyStarterPathUiTranslations } from '../../src/components/i18n/starterPathUiTranslations';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const requiredPaths = [
  'starter_path.premium.badge',
  'starter_path.premium.panel_label',
  'starter_path.premium.heading_new',
  'starter_path.premium.heading_continue',
  'starter_path.premium.heading_completed',
  'starter_path.premium.description_new',
  'starter_path.premium.description_continue',
  'starter_path.premium.description_completed',
  'starter_path.premium.progress_label',
  'starter_path.premium.watch_intro',
  'starter_path.premium.expand_aria',
  'starter_path.premium.collapse_aria',
  'starter_path.premium.reset_button',
  'starter_path.premium.reset_title',
  'starter_path.premium.reset_description',
  'starter_path.premium.reset_cancel',
  'starter_path.premium.reset_confirm',
  'starter_path.premium.reset_success',
  'starter_path.premium.reset_error'
];

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

describe('Starter path premium localisation', () => {
  applyStarterPathUiTranslations(translations);

  for (const language of languages) {
    it('provides every starter path premium key for ' + language, () => {
      const dictionary = translations[language]?.translation;
      for (const path of requiredPaths) {
        const value = readPath(dictionary, path);
        expect(value, 'Missing ' + language + ':' + path).toEqual(expect.any(String));
        expect(value.trim(), 'Empty ' + language + ':' + path).not.toBe('');
      }
    });
  }

  it('keeps the reset warning fully localised in Hebrew', () => {
    const hebrew = translations.he.translation;
    expect(readPath(hebrew, 'starter_path.premium.reset_title')).not.toMatch(/[A-Za-z]{4,}/);
    expect(readPath(hebrew, 'starter_path.premium.reset_description')).not.toMatch(/[A-Za-z]{4,}/);
  });
});
