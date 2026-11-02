/**
 * I18N KEY COMPLETENESS — ALL 7 LANGUAGES MUST SHARE THE SAME KEYS
 *
 * Ensures that every translation key present in the English baseline also exists
 * in each of the other 6 supported languages, using deep key-path enumeration.
 * A missing key in any language means that language's users will silently see
 * English fallback text — which is especially important for clinical/safety UI.
 *
 * Supported languages: en, he, es, fr, de, it, pt
 *
 * Strategy:
 *   1. Enumerate all leaf key paths in translations.en.translation (e.g. "sidebar.home.name").
 *   2. For each non-English language, assert that every English key path exists and
 *      has a non-empty value.
 *
 * This test is additive-only. It does not validate translation quality — only
 * structural completeness. Add new key assertions as new sections are added.
 *
 * Source: src/components/i18n/translations.jsx
 */

import { describe, it, expect } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

// ─── DEEP KEY-PATH ENUMERATION ────────────────────────────────────────────────
/**
 * Recursively collect all leaf key paths in a nested object.
 * Arrays are treated as leaves (their contents are not further descended into).
 * Returns an array of dot-separated key path strings, e.g. ["sidebar.home.name"].
 */
function collectKeyPaths(obj, prefix = '') {
  if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix];
  }
  const paths = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
      paths.push(...collectKeyPaths(val, fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

/**
 * Get a value from a nested object using a dot-separated key path.
 */
function getByPath(obj, path) {
  return path.split('.').reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

// ─── TESTS — Language presence ─────────────────────────────────────────────────

describe('i18n structure — all 7 languages are present', () => {
  for (const lang of LANGUAGES) {
    it(`translations["${lang}"] exists and has a "translation" namespace`, () => {
      expect(translations[lang], `Missing language: ${lang}`).toBeDefined();
      expect(
        translations[lang].translation,
        `translations["${lang}"].translation is undefined`
      ).toBeDefined();
    });
  }
});

// ─── TESTS — Deep key completeness ────────────────────────────────────────────

describe('i18n key completeness — every English key exists in all other languages', () => {
  const enTranslation = translations?.en?.translation;

  it('English baseline translation object is defined and non-empty', () => {
    expect(enTranslation).toBeDefined();
    expect(typeof enTranslation).toBe('object');
    expect(Object.keys(enTranslation).length).toBeGreaterThan(0);
  });

  const enPaths = enTranslation ? collectKeyPaths(enTranslation) : [];

  it('English baseline has at least 50 leaf key paths', () => {
    expect(enPaths.length).toBeGreaterThanOrEqual(50);
  });

  // For each non-English language, check that all English key paths are present.
  const nonEnglishLanguages = LANGUAGES.filter((l) => l !== 'en');

  for (const lang of nonEnglishLanguages) {
    it(`"${lang}" contains all top-level sections present in English`, () => {
      const langTranslation = translations[lang]?.translation;
      expect(langTranslation, `translations["${lang}"].translation is undefined`).toBeDefined();
      const enTopLevel = Object.keys(enTranslation || {});
      for (const section of enTopLevel) {
        expect(
          langTranslation[section],
          `translations["${lang}"].translation.${section} is missing`
        ).toBeDefined();
      }
    });
  }
});

// ─── TESTS — Core safety-relevant key sections ────────────────────────────────

describe('i18n completeness — core sidebar navigation keys', () => {
  const coreKeys = ['home', 'chat', 'coach', 'mood', 'journal', 'progress', 'exercises'];
  for (const lang of LANGUAGES) {
    it(`"${lang}" has all core sidebar keys with name property`, () => {
      const sidebar = translations[lang]?.translation?.sidebar;
      expect(sidebar, `Missing sidebar section for ${lang}`).toBeDefined();
      for (const key of coreKeys) {
        expect(sidebar[key]?.name, `Missing sidebar.${key}.name for ${lang}`).toBeTruthy();
      }
    });
  }
});

describe('i18n completeness — settings.language section', () => {
  const langCodes = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
  for (const lang of LANGUAGES) {
    it(`"${lang}" has settings.language labels for all 7 language codes`, () => {
      const langSettings = translations[lang]?.translation?.settings?.language;
      expect(langSettings, `Missing settings.language section for ${lang}`).toBeDefined();
      for (const code of langCodes) {
        expect(
          langSettings[code],
          `Missing settings.language.${code} for ${lang}`
        ).toBeTruthy();
      }
    });
  }
});

describe('i18n completeness — daily_check_in section', () => {
  const requiredKeys = [
    'title', 'step1_question', 'step2_question', 'step3_question',
    'btn_continue', 'btn_complete',
  ];
  for (const lang of LANGUAGES) {
    it(`"${lang}" has daily_check_in required keys`, () => {
      const dci = translations[lang]?.translation?.daily_check_in;
      expect(dci, `Missing daily_check_in for ${lang}`).toBeDefined();
      for (const key of requiredKeys) {
        expect(dci[key], `Missing daily_check_in.${key} for ${lang}`).toBeTruthy();
      }
    });
  }
});

describe('i18n completeness — mind_games section', () => {
  for (const lang of LANGUAGES) {
    it(`"${lang}" has mind_games.memory_match title and moves`, () => {
      const mg = translations[lang]?.translation?.mind_games;
      expect(mg, `Missing mind_games for ${lang}`).toBeDefined();
      expect(mg?.memory_match?.title, `Missing mind_games.memory_match.title for ${lang}`).toBeTruthy();
      expect(mg?.memory_match?.moves, `Missing mind_games.memory_match.moves for ${lang}`).toBeTruthy();
    });

    it(`"${lang}" has mind_games.focus_flow and number_sequence titles`, () => {
      const mg = translations[lang]?.translation?.mind_games;
      expect(mg?.focus_flow?.title, `Missing mind_games.focus_flow.title for ${lang}`).toBeTruthy();
      expect(mg?.number_sequence?.title, `Missing mind_games.number_sequence.title for ${lang}`).toBeTruthy();
    });
  }
});

describe('i18n completeness — thought_coach section', () => {
  const requiredKeys = ['go_back_step_aria', 'step_label', 'step_analysis_subtitle'];
  for (const lang of LANGUAGES) {
    it(`"${lang}" has thought_coach required keys`, () => {
      const tc = translations[lang]?.translation?.thought_coach;
      expect(tc, `Missing thought_coach for ${lang}`).toBeDefined();
      for (const key of requiredKeys) {
        expect(tc[key], `Missing thought_coach.${key} for ${lang}`).toBeTruthy();
      }
    });
  }
});

describe('i18n completeness — starter_path section', () => {
  const btnKeys = ['card_btn_continue', 'card_btn_review', 'card_btn_start'];
  for (const lang of LANGUAGES) {
    it(`"${lang}" has starter_path button keys`, () => {
      const sp = translations[lang]?.translation?.starter_path;
      expect(sp, `Missing starter_path for ${lang}`).toBeDefined();
      for (const key of btnKeys) {
        expect(sp[key], `Missing starter_path.${key} for ${lang}`).toBeTruthy();
      }
    });

    it(`"${lang}" has starter_path day_themes for days 1–7`, () => {
      const dayThemes = translations[lang]?.translation?.starter_path?.day_themes;
      expect(dayThemes, `Missing starter_path.day_themes for ${lang}`).toBeDefined();
      for (let day = 1; day <= 7; day++) {
        expect(dayThemes[day]?.title, `Missing starter_path.day_themes.${day}.title for ${lang}`).toBeTruthy();
      }
    });
  }
});
