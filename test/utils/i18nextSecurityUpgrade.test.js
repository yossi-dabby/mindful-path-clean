// @vitest-environment jsdom
import { afterAll, describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { execFileSync } from 'node:child_process';
import i18n from '../../src/components/i18n/i18nConfig.jsx';
import { APP_LANGUAGE_STORAGE_KEY } from '../../src/components/i18n/appLocale.js';

const languages = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

function NavigationLabel() {
  const { t } = useTranslation();
  return React.createElement('span', null, t('sidebar.home.name'));
}

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('i18next security upgrade — actual app initialization and React integration', () => {
  for (const language of languages) {
    it(`switches to ${language}, renders translations, interpolates counts and updates direction`, async () => {
      await i18n.changeLanguage(language);
      expect(i18n.resolvedLanguage).toBe(language);
      expect(document.documentElement.lang).toBe(language);
      expect(document.documentElement.dir).toBe(language === 'he' ? 'rtl' : 'ltr');
      expect(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe(language);

      for (const key of ['sidebar.home.name', 'sidebar.chat.name', 'daily_check_in.title']) {
        const expected = i18n.getResource(language, 'translation', key);
        expect(expected).toEqual(expect.any(String));
        expect(expected.length).toBeGreaterThan(0);
        expect(i18n.t(key)).toBe(expected);
      }
      expect(i18n.t('journal_ui.cards.images_plural', { count: 2 })).toContain('2');
      expect(i18n.t('journal_ui.cards.images_plural', { count: 2 })).not.toContain('{{');
      const expectedMarkup = renderToStaticMarkup(
        React.createElement('span', null, i18n.getResource(language, 'translation', 'sidebar.home.name'))
      );
      expect(renderToStaticMarkup(React.createElement(NavigationLabel))).toBe(expectedMarkup);
    });
  }

  it('uses English for unsupported or inherited-property language codes', async () => {
    for (const language of ['not-a-language', 'hasOwnProperty', 'toString']) {
      await i18n.changeLanguage(language);
      expect(i18n.resolvedLanguage).toBe('en');
      expect(i18n.t('sidebar.home.name')).toBe(i18n.getResource('en', 'translation', 'sidebar.home.name'));
    }
  });

  it('keeps intentional empty strings and the app missing-key fallback', () => {
    expect(i18n.options.returnEmptyString).toBe(true);
    expect(i18n.t('security_test.nonexistent_label')).toBe('Nonexistent Label');
  });
});

describe('i18next advisory regressions in an isolated process', () => {
  it('does not corrupt inherited built-ins while merging resource bundles', () => {
    const script = `
      import assert from 'node:assert/strict';
      import { createInstance } from 'i18next';
      const instance = createInstance();
      await instance.init({ lng: 'en', resources: { en: { translation: {} } } });
      const original = Object.prototype.hasOwnProperty.call;
      instance.addResourceBundle('en', 'translation', { hasOwnProperty: { call: 'corrupted' } }, true, true);
      assert.equal(Object.prototype.hasOwnProperty.call, original);
      assert.equal(Object.prototype.hasOwnProperty.call({}, 'missing'), false);
      process.stdout.write('passed');
    `;
    expect(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })).toBe('passed');
  });

  it('keeps user text inside nested translation options as literal data', () => {
    const script = `
      import assert from 'node:assert/strict';
      import { createInstance } from 'i18next';
      const instance = createInstance();
      await instance.init({
        lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false },
        resources: {
          en: { translation: { title: '$t(greeting, { "name": "{{userName}}" })', greeting: 'Hello {{name}}' } },
          de: { translation: { greeting: 'Wrong language' } }
        }
      });
      const userName = '1", "lng": "de';
      assert.equal(instance.t('title', { userName }), 'Hello ' + userName);
      process.stdout.write('passed');
    `;
    expect(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })).toBe('passed');
  });
});
