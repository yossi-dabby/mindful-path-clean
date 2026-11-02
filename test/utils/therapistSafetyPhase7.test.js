/**
 * @file test/utils/therapistSafetyPhase7.test.js
 *
 * Phase 7 — Safety Mode + Emergency Resource Layer
 *
 * PURPOSE
 * -------
 *  1.  Verify that therapistSafetyMode.js exports the required constants and
 *      functions.
 *  2.  Verify SAFETY_MODE_VERSION is a non-empty string.
 *  3.  Verify SAFETY_TRIGGER_CATEGORIES contains all required category keys.
 *  4.  Verify SAFETY_TRIGGER_PATTERNS is a non-empty frozen array.
 *  5.  Verify SAFETY_MODE_INSTRUCTIONS is a non-empty string mentioning Phase 7.
 *  6.  Verify SAFETY_MODE_FAIL_CLOSED_RESULT has safety_mode: true and
 *      fail_closed: true.
 *  7.  Verify determineSafetyMode returns safety_mode: true for crisis_signal.
 *  8.  Verify determineSafetyMode returns safety_mode: true for
 *      low_retrieval_confidence.
 *  9.  Verify determineSafetyMode returns safety_mode: true for allowlist_rejection.
 * 10.  Verify determineSafetyMode returns safety_mode: true for flag_override.
 * 11.  Verify determineSafetyMode returns safety_mode: true for severe hopelessness
 *      language via pattern match.
 * 12.  Verify determineSafetyMode returns safety_mode: true for shutdown/breakdown
 *      language via pattern match.
 * 13.  Verify determineSafetyMode returns safety_mode: true for catastrophic
 *      language via pattern match.
 * 14.  Verify determineSafetyMode returns safety_mode: true for high-distress
 *      language via pattern match.
 * 15.  Verify determineSafetyMode returns safety_mode: false for neutral text.
 * 16.  Verify determineSafetyMode returns FAIL_CLOSED_RESULT for null input.
 * 17.  Verify determineSafetyMode never throws (always returns a result).
 * 18.  Verify getSafetyModeContext returns SAFETY_MODE_INSTRUCTIONS when
 *      safety_mode is true.
 * 19.  Verify getSafetyModeContext returns null when safety_mode is false.
 * 20.  Verify getSafetyModeContextForWiring returns null for non-V5 wirings.
 * 21.  Verify getSafetyModeContextForWiring returns SAFETY_MODE_INSTRUCTIONS
 *      for V5 wiring when safety mode is active.
 * 22.  Verify emergencyResourceLayer.js exports the required constants and
 *      functions.
 * 23.  Verify EMERGENCY_RESOURCE_LAYER_VERSION is a non-empty string.
 * 24.  Verify SUPPORTED_LOCALES contains all 7 app locales.
 * 25.  Verify resolveEmergencyResources returns correct set for each supported
 *      locale.
 * 26.  Verify resolveEmergencyResources falls back to 'en' for unknown locale.
 * 27.  Verify resolveEmergencyResources falls back to 'en' for null input.
 * 28.  Verify resolveEmergencyResources handles regional locale codes (e.g. 'en-US').
 * 29.  Verify resolveEmergencyResources never throws.
 * 30.  Verify buildEmergencyResourceSection returns a non-empty string for
 *      each supported locale.
 * 31.  Verify buildEmergencyResourceSection includes Phase 7 header.
 * 32.  Verify buildEmergencyResourceSection includes at least one contact entry.
 * 33.  Verify buildEmergencyResourceSection returns a safe fallback for unknown
 *      locale (non-empty).
 * 34.  Verify buildEmergencyResourceSection never throws.
 * 35.  Verify CBT_THERAPIST_WIRING_STAGE2_V5 exists in agentWiring.js.
 * 36.  Verify CBT_THERAPIST_WIRING_STAGE2_V5 has stage2_phase: 7.
 * 37.  Verify CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true.
 * 38.  Verify CBT_THERAPIST_WIRING_STAGE2_V5 has live_retrieval_enabled: true
 *      (preserves V4 flags).
 * 39.  Verify V5 entity tool_configs are identical to V4 (no new entity access).
 * 40.  Verify THERAPIST_UPGRADE_SAFETY_MODE_ENABLED flag is still false (off by
 *      default, production-safe).
 * 41.  Verify ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID.
 * 42.  Verify resolveTherapistWiring returns HYBRID when all flags are off.
 * 43.  Verify resolveTherapistWiring evaluates the Phase 7 flag BEFORE Phase 6.
 * 44.  Verify buildV5SessionStartContentAsync exports are present.
 * 45.  Verify buildV5SessionStartContentAsync for HYBRID returns exactly
 *      '[START_SESSION]' (default path unchanged).
 * 46.  Verify buildV5SessionStartContentAsync for V4 returns same as
 *      buildV4SessionStartContentAsync (no safety mode context for V4).
 * 47.  Verify buildV5SessionStartContentAsync for V5 with no safety signals
 *      returns content WITHOUT SAFETY_MODE_INSTRUCTIONS.
 * 48.  Verify buildV5SessionStartContentAsync for V5 with crisis_signal returns
 *      content WITH SAFETY_MODE_INSTRUCTIONS.
 * 49.  Verify buildV5SessionStartContentAsync for V5 with crisis_signal includes
 *      emergency resource section.
 * 50.  Verify buildV5SessionStartContentAsync for V5 with crisis_signal starts
 *      with '[START_SESSION]'.
 * 51.  Verify safety mode does NOT appear in V4 content (isolation check).
 * 52.  Verify safety mode does NOT appear in V3 content (isolation check).
 * 53.  Verify safety mode does NOT appear in HYBRID content (isolation check).
 * 54.  Verify SAFETY_MODE_INSTRUCTIONS mentions "one question" behavior.
 * 55.  Verify SAFETY_MODE_INSTRUCTIONS mentions explicit emotion/interpretation/
 *      belief/behavior/risk separation.
 * 56.  Verify fail-closed: determineSafetyMode with low_retrieval_confidence
 *      returns category LOW_RETRIEVAL_CONFIDENCE.
 * 57.  Verify fail-closed: determineSafetyMode with allowlist_rejection returns
 *      category ALLOWLIST_REJECTION.
 * 58.  Verify en resource set contains at least 2 contacts including an
 *      international option.
 * 59.  Verify he resource set contains ERAN (1201) contact.
 * 60.  Verify each locale resource set has a non-empty disclaimer.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Phase 7 — Safety mode module ──────────────────────────────────────────────
import {
  SAFETY_MODE_VERSION,
  SAFETY_TRIGGER_CATEGORIES,
  SAFETY_TRIGGER_PATTERNS,
  SAFETY_MODE_INSTRUCTIONS,
  SAFETY_MODE_FAIL_CLOSED_RESULT,
  determineSafetyMode,
  getSafetyModeContext,
  getSafetyModeContextForWiring,
} from '../../src/lib/therapistSafetyMode.js';

// ── Phase 7 — Emergency resource layer ───────────────────────────────────────
import {
  EMERGENCY_RESOURCE_LAYER_VERSION,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  VERIFIED_EMERGENCY_RESOURCES,
  resolveEmergencyResources,
  buildEmergencyResourceSection,
} from '../../src/lib/emergencyResourceLayer.js';

// ── Agent wiring ──────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
} from '../../src/api/agentWiring.js';

// ── Active wiring ─────────────────────────────────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ── Feature flags ─────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildV5SessionStartContentAsync,
  buildV4SessionStartContentAsync,
  buildSessionStartContent,
} from '../../src/lib/workflowContextInjector.js';

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Safety Mode Module (therapistSafetyMode.js)', () => {

  // 1. Module exports
  it('1. exports the required constants and functions', () => {
    expect(SAFETY_MODE_VERSION).toBeDefined();
    expect(SAFETY_TRIGGER_CATEGORIES).toBeDefined();
    expect(SAFETY_TRIGGER_PATTERNS).toBeDefined();
    expect(SAFETY_MODE_INSTRUCTIONS).toBeDefined();
    expect(SAFETY_MODE_FAIL_CLOSED_RESULT).toBeDefined();
    expect(typeof determineSafetyMode).toBe('function');
    expect(typeof getSafetyModeContext).toBe('function');
    expect(typeof getSafetyModeContextForWiring).toBe('function');
  });

  // 2. Version
  it('2. SAFETY_MODE_VERSION is a non-empty string', () => {
    expect(typeof SAFETY_MODE_VERSION).toBe('string');
    expect(SAFETY_MODE_VERSION.trim().length).toBeGreaterThan(0);
  });

  // 3. Trigger categories
  it('3. SAFETY_TRIGGER_CATEGORIES contains all required keys', () => {
    const required = [
      'CRISIS_SIGNAL',
      'LOW_RETRIEVAL_CONFIDENCE',
      'ALLOWLIST_REJECTION',
      'FLAG_OVERRIDE',
      'SEVERE_HOPELESSNESS',
      'SHUTDOWN_BREAKDOWN',
      'CATASTROPHIC_LANGUAGE',
      'HIGH_DISTRESS',
    ];
    for (const key of required) {
      expect(SAFETY_TRIGGER_CATEGORIES).toHaveProperty(key);
      expect(typeof SAFETY_TRIGGER_CATEGORIES[key]).toBe('string');
    }
  });

  // 4. Patterns
  it('4. SAFETY_TRIGGER_PATTERNS is a non-empty array', () => {
    expect(Array.isArray(SAFETY_TRIGGER_PATTERNS)).toBe(true);
    expect(SAFETY_TRIGGER_PATTERNS.length).toBeGreaterThan(0);
    for (const entry of SAFETY_TRIGGER_PATTERNS) {
      expect(entry).toHaveProperty('pattern');
      expect(entry.pattern).toBeInstanceOf(RegExp);
      expect(entry).toHaveProperty('category');
    }
  });

  // 5. Instructions string
  it('5. SAFETY_MODE_INSTRUCTIONS is a non-empty string mentioning Phase 7', () => {
    expect(typeof SAFETY_MODE_INSTRUCTIONS).toBe('string');
    expect(SAFETY_MODE_INSTRUCTIONS.trim().length).toBeGreaterThan(50);
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/phase\s*7/i);
  });

  // 6. Fail-closed sentinel
  it('6. SAFETY_MODE_FAIL_CLOSED_RESULT has safety_mode: true and fail_closed: true', () => {
    expect(SAFETY_MODE_FAIL_CLOSED_RESULT.safety_mode).toBe(true);
    expect(SAFETY_MODE_FAIL_CLOSED_RESULT.fail_closed).toBe(true);
  });

  // 7. crisis_signal trigger
  it('7. determineSafetyMode returns safety_mode: true for crisis_signal', () => {
    const result = determineSafetyMode({ crisis_signal: true });
    expect(result.safety_mode).toBe(true);
    expect(result.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL);
    expect(result.pattern_match).toBe(false);
  });

  // 8. low_retrieval_confidence trigger
  it('8. determineSafetyMode returns safety_mode: true for low_retrieval_confidence', () => {
    const result = determineSafetyMode({ low_retrieval_confidence: true });
    expect(result.safety_mode).toBe(true);
    expect(result.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE);
  });

  // 9. allowlist_rejection trigger
  it('9. determineSafetyMode returns safety_mode: true for allowlist_rejection', () => {
    const result = determineSafetyMode({ allowlist_rejection: true });
    expect(result.safety_mode).toBe(true);
    expect(result.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION);
  });

  // 10. flag_override trigger
  it('10. determineSafetyMode returns safety_mode: true for flag_override', () => {
    const result = determineSafetyMode({ flag_override: true });
    expect(result.safety_mode).toBe(true);
    expect(result.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE);
  });

  // 11. Severe hopelessness pattern
  it('11. determineSafetyMode activates for severe hopelessness language', () => {
    const inputs = [
      'I feel hopeless',
      'Nothing will get better',
      "I can't see a way forward",
      "What's the point of any of this",
      'Nothing matters anymore',
    ];
    for (const text of inputs) {
      const result = determineSafetyMode({ message_text: text });
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 12. Shutdown/breakdown pattern
  it('12. determineSafetyMode activates for shutdown/breakdown language', () => {
    const inputs = [
      "I'm completely broken",
      "I'm falling apart",
      "I'm collapsing",
      "I'm breaking down",
      "I've given up",
    ];
    for (const text of inputs) {
      const result = determineSafetyMode({ message_text: text });
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 13. Catastrophic language pattern
  it('13. determineSafetyMode activates for catastrophic language', () => {
    const inputs = [
      "Everything is ruined",
      "My life is over",
      "There's no way back",
      "I'll never recover from this",
    ];
    for (const text of inputs) {
      const result = determineSafetyMode({ message_text: text });
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 14. High distress pattern
  it('14. determineSafetyMode activates for high-distress language', () => {
    const inputs = [
      "I'm completely overwhelmed",
      "I can't breathe",
      "I'm panicking",
      "I can't stop crying",
    ];
    for (const text of inputs) {
      const result = determineSafetyMode({ message_text: text });
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 15. Neutral text — no activation
  it('15. determineSafetyMode returns safety_mode: false for neutral text', () => {
    const inputs = [
      "I had a good day today",
      "I want to work on my goals",
      "I'm feeling a bit stressed about work",
      "Can we talk about anxiety management?",
    ];
    for (const text of inputs) {
      const result = determineSafetyMode({ message_text: text });
      expect(result.safety_mode).toBe(false);
      expect(result.trigger).toBeNull();
    }
  });

  // 16. Null input — fail-closed
  it('16. determineSafetyMode returns fail-closed result for null input', () => {
    const result = determineSafetyMode(null);
    expect(result.safety_mode).toBe(true);
    expect(result.fail_closed).toBe(true);
  });

  // 17. Never throws
  it('17. determineSafetyMode never throws for any input', () => {
    const inputs = [null, undefined, {}, 0, '', { message_text: null }, { crisis_signal: 'yes' }];
    for (const input of inputs) {
      expect(() => determineSafetyMode(input)).not.toThrow();
    }
  });

  // 18. getSafetyModeContext returns instructions when active
  it('18. getSafetyModeContext returns SAFETY_MODE_INSTRUCTIONS when safety_mode is true', () => {
    const result = getSafetyModeContext({ safety_mode: true });
    expect(result).toBe(SAFETY_MODE_INSTRUCTIONS);
  });

  // 19. getSafetyModeContext returns null when inactive
  it('19. getSafetyModeContext returns null when safety_mode is false', () => {
    expect(getSafetyModeContext({ safety_mode: false })).toBeNull();
    expect(getSafetyModeContext(null)).toBeNull();
    expect(getSafetyModeContext(undefined)).toBeNull();
  });

  // 20. getSafetyModeContextForWiring gating — non-V5 wirings
  it('20. getSafetyModeContextForWiring returns null for non-V5 wirings', () => {
    const activeResult = { safety_mode: true, trigger: 'crisis_signal', category: 'crisis_signal', pattern_match: false };
    const nonV5Wirings = [
      CBT_THERAPIST_WIRING_HYBRID,
      CBT_THERAPIST_WIRING_STAGE2_V1,
      CBT_THERAPIST_WIRING_STAGE2_V2,
      CBT_THERAPIST_WIRING_STAGE2_V3,
      CBT_THERAPIST_WIRING_STAGE2_V4,
      null,
      undefined,
      {},
    ];
    for (const wiring of nonV5Wirings) {
      expect(getSafetyModeContextForWiring(wiring, activeResult)).toBeNull();
    }
  });

  // 21. getSafetyModeContextForWiring returns instructions for V5 when active
  it('21. getSafetyModeContextForWiring returns SAFETY_MODE_INSTRUCTIONS for V5 when active', () => {
    const activeResult = { safety_mode: true, trigger: 'crisis_signal', category: 'crisis_signal', pattern_match: false };
    const result = getSafetyModeContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V5, activeResult);
    expect(result).toBe(SAFETY_MODE_INSTRUCTIONS);
  });

  // 54. One-question behavior in instructions
  it('54. SAFETY_MODE_INSTRUCTIONS mentions one-question-at-a-time behavior', () => {
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/one\s+(question|focused)/i);
  });

  // 55. Emotion/interpretation separation in instructions
  it('55. SAFETY_MODE_INSTRUCTIONS mentions emotion/interpretation/belief/behavior/risk', () => {
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/emotion/i);
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/interpretation/i);
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/belief/i);
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/behavior/i);
    expect(SAFETY_MODE_INSTRUCTIONS).toMatch(/risk/i);
  });

  // 56. LOW_RETRIEVAL_CONFIDENCE category
  it('56. determineSafetyMode with low_retrieval_confidence returns correct category', () => {
    const result = determineSafetyMode({ low_retrieval_confidence: true });
    expect(result.category).toBe(SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE);
  });

  // 57. ALLOWLIST_REJECTION category
  it('57. determineSafetyMode with allowlist_rejection returns correct category', () => {
    const result = determineSafetyMode({ allowlist_rejection: true });
    expect(result.category).toBe(SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Emergency Resource Layer (emergencyResourceLayer.js)', () => {

  const ALL_LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

  // 22. Module exports
  it('22. exports the required constants and functions', () => {
    expect(EMERGENCY_RESOURCE_LAYER_VERSION).toBeDefined();
    expect(FALLBACK_LOCALE).toBeDefined();
    expect(SUPPORTED_LOCALES).toBeDefined();
    expect(VERIFIED_EMERGENCY_RESOURCES).toBeDefined();
    expect(typeof resolveEmergencyResources).toBe('function');
    expect(typeof buildEmergencyResourceSection).toBe('function');
  });

  // 23. Version
  it('23. EMERGENCY_RESOURCE_LAYER_VERSION is a non-empty string', () => {
    expect(typeof EMERGENCY_RESOURCE_LAYER_VERSION).toBe('string');
    expect(EMERGENCY_RESOURCE_LAYER_VERSION.trim().length).toBeGreaterThan(0);
  });

  // 24. All 7 app locales in SUPPORTED_LOCALES
  it('24. SUPPORTED_LOCALES contains all 7 app locales', () => {
    for (const locale of ALL_LOCALES) {
      expect(SUPPORTED_LOCALES.has(locale)).toBe(true);
    }
  });

  // 25. resolveEmergencyResources returns correct set for each locale
  it('25. resolveEmergencyResources returns correct set for each supported locale', () => {
    for (const locale of ALL_LOCALES) {
      const resources = resolveEmergencyResources(locale);
      expect(resources).toBeDefined();
      expect(resources.locale).toBe(locale);
      expect(Array.isArray(resources.contacts)).toBe(true);
      expect(resources.contacts.length).toBeGreaterThan(0);
      expect(typeof resources.disclaimer).toBe('string');
      expect(resources.disclaimer.trim().length).toBeGreaterThan(0);
    }
  });

  // 26. Unknown locale → en fallback
  it('26. resolveEmergencyResources falls back to en for unknown locale', () => {
    const resources = resolveEmergencyResources('xx');
    expect(resources.locale).toBe('en');
  });

  // 27. Null input → en fallback
  it('27. resolveEmergencyResources falls back to en for null input', () => {
    expect(resolveEmergencyResources(null).locale).toBe('en');
    expect(resolveEmergencyResources(undefined).locale).toBe('en');
    expect(resolveEmergencyResources('').locale).toBe('en');
  });

  // 28. Regional locale codes
  it('28. resolveEmergencyResources handles regional locale codes', () => {
    expect(resolveEmergencyResources('en-US').locale).toBe('en');
    expect(resolveEmergencyResources('he-IL').locale).toBe('he');
    expect(resolveEmergencyResources('fr-FR').locale).toBe('fr');
    expect(resolveEmergencyResources('de-DE').locale).toBe('de');
  });

  // 29. Never throws
  it('29. resolveEmergencyResources never throws', () => {
    const inputs = [null, undefined, '', 0, {}, 'xx-UNKNOWN', 'ZZ', 'en-US'];
    for (const input of inputs) {
      expect(() => resolveEmergencyResources(input)).not.toThrow();
    }
  });

  // 30. buildEmergencyResourceSection non-empty for all locales
  it('30. buildEmergencyResourceSection returns non-empty string for each supported locale', () => {
    for (const locale of ALL_LOCALES) {
      const section = buildEmergencyResourceSection(locale);
      expect(typeof section).toBe('string');
      expect(section.trim().length).toBeGreaterThan(50);
    }
  });

  // 31. Phase 7 header in section
  it('31. buildEmergencyResourceSection includes Phase 7 header', () => {
    const section = buildEmergencyResourceSection('en');
    expect(section).toMatch(/phase\s*7/i);
  });

  // 32. At least one contact entry
  it('32. buildEmergencyResourceSection includes at least one contact entry', () => {
    for (const locale of ALL_LOCALES) {
      const section = buildEmergencyResourceSection(locale);
      expect(section).toMatch(/•/);
    }
  });

  // 33. Safe fallback for unknown locale
  it('33. buildEmergencyResourceSection returns safe non-empty fallback for unknown locale', () => {
    const section = buildEmergencyResourceSection('unknown-locale-xyz');
    expect(typeof section).toBe('string');
    expect(section.trim().length).toBeGreaterThan(50);
  });

  // 34. Never throws
  it('34. buildEmergencyResourceSection never throws', () => {
    const inputs = [null, undefined, '', 'xx', 'en-US', 0, {}];
    for (const input of inputs) {
      expect(() => buildEmergencyResourceSection(input)).not.toThrow();
    }
  });

  // 58. en resource set has international option
  it('58. en resource set contains at least 2 contacts including an international option', () => {
    const resources = resolveEmergencyResources('en');
    expect(resources.contacts.length).toBeGreaterThanOrEqual(2);
    const hasInternational = resources.contacts.some(
      (c) => c.label.toLowerCase().includes('international') ||
              c.value.toLowerCase().includes('befrienders') ||
              c.value.toLowerCase().includes('iasp')
    );
    expect(hasInternational).toBe(true);
  });

  // 59. he resource set has ERAN 1201
  it('59. he resource set contains ERAN (1201) contact', () => {
    const resources = resolveEmergencyResources('he');
    const eran = resources.contacts.find((c) => c.value === '1201');
    expect(eran).toBeDefined();
  });

  // 60. Each locale has non-empty disclaimer
  it('60. each locale resource set has a non-empty disclaimer', () => {
    for (const locale of ALL_LOCALES) {
      const resources = resolveEmergencyResources(locale);
      expect(typeof resources.disclaimer).toBe('string');
      expect(resources.disclaimer.trim().length).toBeGreaterThan(10);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — V5 Wiring Config (agentWiring.js)', () => {

  // 35. V5 exists
  it('35. CBT_THERAPIST_WIRING_STAGE2_V5 exists', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5).toBeDefined();
  });

  // 36. stage2_phase: 7
  it('36. CBT_THERAPIST_WIRING_STAGE2_V5 has stage2_phase: 7', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.stage2_phase).toBe(7);
  });

  // 37. safety_mode_enabled: true
  it('37. CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.safety_mode_enabled).toBe(true);
  });

  // 38. live_retrieval_enabled preserved from V4
  it('38. CBT_THERAPIST_WIRING_STAGE2_V5 has live_retrieval_enabled: true (from V4)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.live_retrieval_enabled).toBe(true);
  });

  // 39. Entity tool_configs identical to V4
  it('39. V5 entity tool_configs are identical to V4', () => {
    const v4Names = CBT_THERAPIST_WIRING_STAGE2_V4.tool_configs.map((tc) => tc.entity_name).sort();
    const v5Names = CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs.map((tc) => tc.entity_name).sort();
    expect(v5Names).toEqual(v4Names);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Feature Flags and Routing', () => {

  // 40. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED is false (off by default)
  it('40. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED flag is false by default', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SAFETY_MODE_ENABLED).toBe(false);
  });

  // 41. ACTIVE_CBT_THERAPIST_WIRING is still HYBRID
  it('41. ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 42. resolveTherapistWiring returns HYBRID when all flags off
  it('42. resolveTherapistWiring returns HYBRID when all flags are off', () => {
    const wiring = resolveTherapistWiring();
    expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 43. Phase 7 is evaluated before Phase 6 in resolveTherapistWiring
  it('43. resolveTherapistWiring has SAFETY_MODE_ENABLED evaluated before ALLOWLIST_WRAPPER_ENABLED', () => {
    const { activeAgentWiring } = (() => {
      // Read the source code to verify order
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.resolve('src/api/activeAgentWiring.js'),
        'utf8'
      );
      return { activeAgentWiring: src };
    })();
    const safetyPos = activeAgentWiring.indexOf('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED');
    const allowlistPos = activeAgentWiring.indexOf('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED');
    expect(safetyPos).toBeGreaterThan(-1);
    expect(allowlistPos).toBeGreaterThan(-1);
    expect(safetyPos).toBeLessThan(allowlistPos);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — buildV5SessionStartContentAsync (workflowContextInjector.js)', () => {

  // 44. Exports present
  it('44. buildV5SessionStartContentAsync is exported from workflowContextInjector', () => {
    expect(typeof buildV5SessionStartContentAsync).toBe('function');
  });

  // 45. HYBRID — returns exactly '[START_SESSION]'
  it('45. buildV5SessionStartContentAsync for HYBRID returns exactly [START_SESSION]', async () => {
    const content = await buildV5SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(content).toBe('[START_SESSION]');
  });

  // 46. V4 — same as buildV4SessionStartContentAsync
  it('46. buildV5SessionStartContentAsync for V4 matches buildV4SessionStartContentAsync', async () => {
    const v5Content = await buildV5SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V4, {}, null);
    const v4Content = await buildV4SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V4, {}, null);
    expect(v5Content).toBe(v4Content);
  });

  // 47. V5 with no safety signals — no safety mode in content
  it('47. buildV5SessionStartContentAsync for V5 with no safety signals excludes SAFETY_MODE_INSTRUCTIONS', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      {},
      null,
      { crisis_signal: false, message_text: 'I had a good day' },
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 48. V5 with crisis_signal — safety mode instructions present
  it('48. buildV5SessionStartContentAsync for V5 with crisis_signal includes SAFETY_MODE_INSTRUCTIONS', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      {},
      null,
      { crisis_signal: true },
    );
    expect(content).toContain('SAFETY MODE');
    expect(content).toMatch(/phase.*7/i);
  });

  // 49. V5 with crisis_signal — emergency resources present
  it('49. buildV5SessionStartContentAsync for V5 with crisis_signal includes emergency resources', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      {},
      null,
      { crisis_signal: true, locale: 'en' },
    );
    expect(content).toContain('EMERGENCY RESOURCES');
  });

  // 50. V5 with crisis_signal — starts with [START_SESSION]
  it('50. buildV5SessionStartContentAsync for V5 with crisis_signal starts with [START_SESSION]', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      {},
      null,
      { crisis_signal: true },
    );
    expect(content.startsWith('[START_SESSION]')).toBe(true);
  });

  // 51. V4 isolation — no safety mode in V4 content
  it('51. safety mode does NOT appear in V4 content (isolation)', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      {},
      null,
      { crisis_signal: true },
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 52. V3 isolation — no safety mode in V3 content
  it('52. safety mode does NOT appear in V3 content (isolation)', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V3,
      {},
      null,
      { crisis_signal: true },
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 53. HYBRID isolation — no safety mode in HYBRID content
  it('53. safety mode does NOT appear in HYBRID content (isolation)', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      {},
      null,
      { crisis_signal: true },
    );
    expect(content).not.toContain('SAFETY MODE');
  });
});
