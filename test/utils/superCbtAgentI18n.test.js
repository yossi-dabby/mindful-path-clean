/**
 * SuperCbtAgent i18n — Key Completeness Tests
 *
 * Verifies that every chat.super_cbt_agent key added for the SuperCbtAgent
 * feature is present and non-empty in all 7 supported app languages.
 *
 * Keys are additive-only — no existing translation keys were modified.
 * All assertions use the same pattern as therapistUpgradePhase8.test.js.
 *
 * Supported languages: en, he, es, fr, de, it, pt
 * Key path: translations[lang].translation.chat.super_cbt_agent.*
 *
 * See docs/i18n-super-agent.md for full key documentation.
 */

import { describe, it, expect } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

const REQUIRED_KEYS = [
  'label',
  'accessible_label',
  'mode_label',
  'protocol_label',
  'status_active',
  'status_inactive',
  'session_intro',
  'multilingual_notice',
];

describe('SuperCbtAgent i18n — chat.super_cbt_agent section exists in all 7 languages', () => {
  for (const lang of LANGUAGES) {
    it(`translations["${lang}"].translation.chat.super_cbt_agent is defined`, () => {
      const section = translations[lang]?.translation?.chat?.super_cbt_agent;
      expect(section, `Missing chat.super_cbt_agent for ${lang}`).toBeDefined();
      expect(typeof section).toBe('object');
    });
  }
});

describe('SuperCbtAgent i18n — all required keys are present and non-empty in all 7 languages', () => {
  for (const lang of LANGUAGES) {
    for (const key of REQUIRED_KEYS) {
      it(`chat.super_cbt_agent.${key} is defined and non-empty for "${lang}"`, () => {
        const value = translations[lang]?.translation?.chat?.super_cbt_agent?.[key];
        expect(value, `Missing chat.super_cbt_agent.${key} for ${lang}`).toBeTruthy();
        expect(typeof value, `chat.super_cbt_agent.${key} must be a string for ${lang}`).toBe('string');
        expect(value.trim().length, `chat.super_cbt_agent.${key} must not be blank for ${lang}`).toBeGreaterThan(0);
      });
    }
  }
});

describe('SuperCbtAgent i18n — English baseline values are correct', () => {
  it('en label is "Super CBT Agent"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.label).toBe('Super CBT Agent');
  });

  it('en accessible_label is "Super CBT Agent is active"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.accessible_label).toBe(
      'Super CBT Agent is active'
    );
  });

  it('en mode_label is "Advanced CBT Mode"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.mode_label).toBe('Advanced CBT Mode');
  });

  it('en protocol_label contains "CBT"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.protocol_label).toContain('CBT');
  });

  it('en status_active is "Active"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.status_active).toBe('Active');
  });

  it('en status_inactive is "Inactive"', () => {
    expect(translations.en?.translation?.chat?.super_cbt_agent?.status_inactive).toBe('Inactive');
  });
});

describe('SuperCbtAgent i18n — Hebrew translation present', () => {
  it('he label is non-empty and contains Hebrew characters', () => {
    const label = translations.he?.translation?.chat?.super_cbt_agent?.label;
    expect(label).toBeTruthy();
    // Hebrew characters are in Unicode range U+0590–U+05FF
    expect(/[\u0590-\u05FF]/.test(label)).toBe(true);
  });
});

describe('SuperCbtAgent i18n — no existing chat keys were mutated', () => {
  it('chat.session_phase_indicator.label is still present in English', () => {
    expect(translations.en?.translation?.chat?.session_phase_indicator?.label).toBe(
      'Structured CBT Session'
    );
  });

  it('chat.safety_mode_indicator.label is still present in English', () => {
    expect(translations.en?.translation?.chat?.safety_mode_indicator?.label).toBe(
      'Enhanced support mode'
    );
  });

  it('chat.session_phase_indicator is unchanged in Hebrew', () => {
    expect(translations.he?.translation?.chat?.session_phase_indicator?.label).toBeTruthy();
  });

  it('chat.safety_mode_indicator is unchanged in Hebrew', () => {
    expect(translations.he?.translation?.chat?.safety_mode_indicator?.label).toBeTruthy();
  });
});
