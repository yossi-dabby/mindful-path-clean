import { describe, expect, it, vi } from 'vitest';
import {
  APP_LANGUAGE_STORAGE_KEY,
  DEFAULT_APP_LOCALE,
  SUPPORTED_APP_LOCALES,
  applyAppLocaleSideEffects,
  changeAppLocale,
  getAppFormattingLocale,
  getCurrentAppLocale,
  normalizeAppLocale,
  readStoredAppLocale,
  resolveAppLocale,
  resolveInitialAppLocale
} from '../../src/components/i18n/appLocale.js';

function createMemoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: vi.fn((key) => key === APP_LANGUAGE_STORAGE_KEY ? value : null),
    setItem: vi.fn((key, nextValue) => {
      if (key === APP_LANGUAGE_STORAGE_KEY) value = nextValue;
    })
  };
}

function createDocumentStub() {
  return { documentElement: { lang: '', dir: '' } };
}

describe('appLocale — supported locale normalization', () => {
  it('keeps all seven supported application locales', () => {
    expect(SUPPORTED_APP_LOCALES).toEqual(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
    for (const locale of SUPPORTED_APP_LOCALES) {
      expect(normalizeAppLocale(locale)).toBe(locale);
    }
  });

  it('normalizes regional locale codes without adding new app languages', () => {
    expect(normalizeAppLocale('he-IL')).toBe('he');
    expect(normalizeAppLocale('pt_BR')).toBe('pt');
    expect(normalizeAppLocale('FR-fr')).toBe('fr');
    expect(normalizeAppLocale('ar')).toBeNull();
  });
});

describe('appLocale — deterministic precedence', () => {
  it('uses profile, then session, then stored, then current, then English', () => {
    expect(resolveAppLocale({
      profileLocale: 'he',
      sessionLocale: 'fr',
      storedLocale: 'de',
      currentLocale: 'it'
    })).toBe('he');

    expect(resolveAppLocale({
      sessionLocale: 'fr',
      storedLocale: 'de',
      currentLocale: 'it'
    })).toBe('fr');

    expect(resolveAppLocale({ storedLocale: 'de', currentLocale: 'it' })).toBe('de');
    expect(resolveAppLocale({ currentLocale: 'it' })).toBe('it');
    expect(resolveAppLocale()).toBe(DEFAULT_APP_LOCALE);
  });

  it('ignores unsupported values instead of persisting them', () => {
    expect(resolveAppLocale({ profileLocale: 'ar', storedLocale: 'es' })).toBe('es');
    expect(resolveAppLocale({ profileLocale: 'unknown' })).toBe('en');
  });
});

describe('appLocale — storage and document side effects', () => {
  it('uses the stored supported locale during bootstrap', () => {
    const storage = createMemoryStorage('he-IL');
    expect(readStoredAppLocale(storage)).toBe('he');
    expect(resolveInitialAppLocale(storage)).toBe('he');
  });

  it('updates storage, html lang and direction together', () => {
    const storage = createMemoryStorage();
    const doc = createDocumentStub();

    expect(applyAppLocaleSideEffects('he-IL', { storage, doc })).toBe('he');
    expect(storage.setItem).toHaveBeenCalledWith(APP_LANGUAGE_STORAGE_KEY, 'he');
    expect(doc.documentElement.lang).toBe('he');
    expect(doc.documentElement.dir).toBe('rtl');

    applyAppLocaleSideEffects('fr', { storage, doc });
    expect(doc.documentElement.lang).toBe('fr');
    expect(doc.documentElement.dir).toBe('ltr');
  });
});

describe('appLocale — i18next compatibility layer', () => {
  it('changes i18next through the canonical path without changing behavior', async () => {
    const storage = createMemoryStorage('en');
    const doc = createDocumentStub();
    const i18n = {
      language: 'en',
      resolvedLanguage: 'en',
      changeLanguage: vi.fn(async function changeLanguage(locale) {
        this.language = locale;
        this.resolvedLanguage = locale;
      })
    };

    await expect(changeAppLocale(i18n, 'he-IL', { storage, doc })).resolves.toBe('he');
    expect(i18n.changeLanguage).toHaveBeenCalledWith('he');
    expect(getCurrentAppLocale(i18n, storage)).toBe('he');
    expect(doc.documentElement.dir).toBe('rtl');
  });

  it('exposes stable formatting locales for dates, numbers and units', () => {
    expect(getAppFormattingLocale('he')).toBe('he-IL');
    expect(getAppFormattingLocale('pt')).toBe('pt-BR');
    expect(getAppFormattingLocale('unsupported')).toBe('en');
  });
});
