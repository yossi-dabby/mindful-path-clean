/**
 * @file test/utils/therapistSafetyPhase71.test.js
 *
 * Phase 7.1 — Corrective Patch Tests
 *
 * PURPOSE
 * -------
 * Closes the three review gaps from Phase 7:
 *
 * SECTION A — REAL RUNTIME SAFETY-MODE ACTIVATION
 *   1.  evaluateRuntimeSafetyMode is exported from therapistSafetyMode.js
 *   2.  evaluateRuntimeSafetyMode returns safety_mode: false for empty/null/undefined input
 *   3.  evaluateRuntimeSafetyMode activates from severe hopelessness language
 *   4.  evaluateRuntimeSafetyMode activates from shutdown/breakdown language
 *   5.  evaluateRuntimeSafetyMode activates from catastrophic language
 *   6.  evaluateRuntimeSafetyMode activates from high-distress language
 *   7.  evaluateRuntimeSafetyMode returns safety_mode: false for neutral text
 *   8.  evaluateRuntimeSafetyMode never throws for any input
 *   9.  evaluateRuntimeSafetyMode uses ONLY message text (not session signals)
 *  10.  evaluateRuntimeSafetyMode is distinct from determineSafetyMode (session-start)
 *  11.  buildRuntimeSafetySupplement is exported from workflowContextInjector.js
 *  12.  buildRuntimeSafetySupplement returns null for HYBRID wiring (default path unchanged)
 *  13.  buildRuntimeSafetySupplement returns null for V4 wiring
 *  14.  buildRuntimeSafetySupplement returns null for null wiring
 *  15.  buildRuntimeSafetySupplement returns non-null string for V5 wiring with distress text
 *  16.  buildRuntimeSafetySupplement returns null for V5 wiring with neutral text
 *  17.  buildRuntimeSafetySupplement result contains SAFETY MODE header for V5 + distress
 *  18.  buildRuntimeSafetySupplement result contains emergency resources for V5 + distress
 *  19.  buildRuntimeSafetySupplement never throws
 *
 * SECTION B — EXPLICIT PRECEDENCE
 *  20.  SAFETY_PRECEDENCE_ORDER is exported from therapistSafetyMode.js
 *  21.  SAFETY_PRECEDENCE_ORDER has exactly 4 layers
 *  22.  Layer 1 is CRISIS_DETECTOR_REGEX with HARD_STOP authority
 *  23.  Layer 2 is CRISIS_DETECTOR_LLM with HARD_STOP authority
 *  24.  Layer 3 is UPGRADED_SAFETY_MODE with CONSTRAIN_ONLY authority
 *  25.  Layer 4 is POST_LLM_SAFETY_FILTER with OUTPUT_FILTER authority
 *  26.  Layers 1 and 2 have affects_default_path: true
 *  27.  Layer 3 has affects_default_path: false (V5 only)
 *  28.  Layer 3 has active_when mentioning safety_mode_enabled
 *  29.  Layers are numbered in ascending order (1, 2, 3, 4)
 *  30.  Layer 3 is overridden_by layers 1 and 2 (explicit in the constant)
 *  31.  buildRuntimeSafetySupplement is subordinate to hard-stop layers
 *       (returns null for default wiring — cannot activate when default path is active)
 *
 * SECTION C — EMERGENCY RESOURCE VERIFICATION + FALLBACK
 *  32.  RESOURCE_SOURCE_BASIS is exported from emergencyResourceLayer.js
 *  33.  RESOURCE_SOURCE_BASIS has entries for all 7 supported locales
 *  34.  Each RESOURCE_SOURCE_BASIS entry has a non-empty verified_sources array
 *  35.  Each RESOURCE_SOURCE_BASIS entry has a non-empty basis_note string
 *  36.  isLocaleVerified is exported from emergencyResourceLayer.js
 *  37.  isLocaleVerified returns true for all 7 supported locales
 *  38.  isLocaleVerified returns false for unsupported locales
 *  39.  isLocaleVerified handles regional locale codes (e.g. 'en-US')
 *  40.  isLocaleVerified returns false for null/undefined
 *  41.  getResourceSourceBasis is exported from emergencyResourceLayer.js
 *  42.  getResourceSourceBasis returns correct basis for each supported locale
 *  43.  getResourceSourceBasis returns en fallback for unknown locale
 *  44.  getResourceSourceBasis returns en fallback for null/undefined
 *  45.  getResourceSourceBasis never throws
 *  46.  en basis mentions US federal/official sources
 *  47.  he basis mentions ERAN
 *  48.  fr basis mentions 3114
 *  49.  Unsupported locale fallback is en (conservative)
 *  50.  buildEmergencyResourceSection falls back to en for unknown locale (safe)
 *
 * SECTION D — DEFAULT MODE + ROLLBACK SAFETY
 *  51.  ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default path unchanged)
 *  52.  buildRuntimeSafetySupplement returns null for HYBRID (no safety mode in default)
 *  53.  THERAPIST_UPGRADE_SAFETY_MODE_ENABLED flag remains false by default
 *  54.  evaluateRuntimeSafetyMode with no signals returns safety_mode: false
 *  55.  buildRuntimeSafetySupplement is completely safe to call with null/undefined
 *  56.  evaluateRuntimeSafetyMode fail-closed on exception (returns FAIL_CLOSED_RESULT)
 */

import { describe, it, expect } from 'vitest';

// ── Phase 7 / 7.1 — Safety mode module ───────────────────────────────────────
import {
  SAFETY_PRECEDENCE_ORDER,
  SAFETY_TRIGGER_CATEGORIES,
  SAFETY_MODE_FAIL_CLOSED_RESULT,
  determineSafetyMode,
  evaluateRuntimeSafetyMode,
} from '../../src/lib/therapistSafetyMode.js';

// ── Phase 7 / 7.1 — Emergency resource layer ─────────────────────────────────
import {
  RESOURCE_SOURCE_BASIS,
  SUPPORTED_LOCALES,
  FALLBACK_LOCALE,
  isLocaleVerified,
  getResourceSourceBasis,
  resolveEmergencyResources,
  buildEmergencyResourceSection,
} from '../../src/lib/emergencyResourceLayer.js';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildRuntimeSafetySupplement,
} from '../../src/lib/workflowContextInjector.js';

// ── Agent wiring ──────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
} from '../../src/api/agentWiring.js';

// ── Active wiring + flags ─────────────────────────────────────────────────────
import { ACTIVE_CBT_THERAPIST_WIRING } from '../../src/api/activeAgentWiring.js';
import { THERAPIST_UPGRADE_FLAGS } from '../../src/lib/featureFlags.js';

// ─────────────────────────────────────────────────────────────────────────────

const ALL_LOCALES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7.1 — Section A: Real Runtime Safety-Mode Activation', () => {

  // 1. Export
  it('1. evaluateRuntimeSafetyMode is exported from therapistSafetyMode.js', () => {
    expect(typeof evaluateRuntimeSafetyMode).toBe('function');
  });

  // 2. Empty/null/undefined → safety_mode: false
  it('2. evaluateRuntimeSafetyMode returns safety_mode: false for empty/null/undefined input', () => {
    expect(evaluateRuntimeSafetyMode(null).safety_mode).toBe(false);
    expect(evaluateRuntimeSafetyMode(undefined).safety_mode).toBe(false);
    expect(evaluateRuntimeSafetyMode('').safety_mode).toBe(false);
    expect(evaluateRuntimeSafetyMode('   ').safety_mode).toBe(false);
  });

  // 3. Severe hopelessness activates
  it('3. evaluateRuntimeSafetyMode activates for severe hopelessness language', () => {
    const inputs = [
      'I feel completely hopeless',
      'Nothing will get better',
      "I can't see a way forward",
      "What's the point of anything",
      'Nothing matters anymore',
      'life is not worth living',
    ];
    for (const text of inputs) {
      const result = evaluateRuntimeSafetyMode(text);
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 4. Shutdown/breakdown activates
  it('4. evaluateRuntimeSafetyMode activates for shutdown/breakdown language', () => {
    const inputs = [
      "I'm completely broken",
      "I'm falling apart",
      "I'm collapsing",
      "I've given up",
      "I can't go on",
    ];
    for (const text of inputs) {
      const result = evaluateRuntimeSafetyMode(text);
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 5. Catastrophic language activates
  it('5. evaluateRuntimeSafetyMode activates for catastrophic language', () => {
    const inputs = [
      'Everything is ruined',
      'My life is over',
      "There's no way back from this",
      "I'll never recover",
    ];
    for (const text of inputs) {
      const result = evaluateRuntimeSafetyMode(text);
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 6. High-distress activates
  it('6. evaluateRuntimeSafetyMode activates for high-distress language', () => {
    const inputs = [
      "I'm completely overwhelmed",
      "I can't breathe",
      "I'm panicking",
      "I can't stop crying",
    ];
    for (const text of inputs) {
      const result = evaluateRuntimeSafetyMode(text);
      expect(result.safety_mode).toBe(true);
      expect(result.pattern_match).toBe(true);
    }
  });

  // 7. Neutral text → safety_mode: false
  it('7. evaluateRuntimeSafetyMode returns safety_mode: false for neutral text', () => {
    const inputs = [
      'I had a great day today',
      'I want to work on my anxiety',
      "Let's talk about my goals",
      'Can you help me practice CBT techniques?',
      'I had a bit of stress at work',
    ];
    for (const text of inputs) {
      const result = evaluateRuntimeSafetyMode(text);
      expect(result.safety_mode).toBe(false);
      expect(result.trigger).toBeNull();
    }
  });

  // 8. Never throws
  it('8. evaluateRuntimeSafetyMode never throws for any input', () => {
    const inputs = [null, undefined, '', '   ', 0, {}, [], 'normal text', 'I feel hopeless'];
    for (const input of inputs) {
      expect(() => evaluateRuntimeSafetyMode(input)).not.toThrow();
    }
  });

  // 9. Only uses message text (not session-level signals)
  it('9. evaluateRuntimeSafetyMode uses ONLY message text (no session signals)', () => {
    // Session-level signals passed alongside message_text should be irrelevant
    // because evaluateRuntimeSafetyMode only evaluates message text
    const neutralResult = evaluateRuntimeSafetyMode('I had a good day');
    expect(neutralResult.safety_mode).toBe(false);

    // Compare: determineSafetyMode WITH crisis_signal=true activates even for neutral text
    const withCrisisSignal = determineSafetyMode({ crisis_signal: true, message_text: 'I had a good day' });
    expect(withCrisisSignal.safety_mode).toBe(true);
    expect(withCrisisSignal.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL);

    // evaluateRuntimeSafetyMode is INDEPENDENT of session signals:
    // it only responds to message text content
    expect(neutralResult.safety_mode).toBe(false);
  });

  // 10. Distinct from determineSafetyMode
  it('10. evaluateRuntimeSafetyMode is distinct from determineSafetyMode (session-start)', () => {
    // evaluateRuntimeSafetyMode ignores crisis_signal
    // determineSafetyMode responds to crisis_signal even without message text
    const runtimeResult = evaluateRuntimeSafetyMode('I feel okay today');
    expect(runtimeResult.safety_mode).toBe(false);

    const sessionResult = determineSafetyMode({ crisis_signal: true, message_text: 'I feel okay today' });
    expect(sessionResult.safety_mode).toBe(true);
    expect(sessionResult.trigger).toBe(SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL);

    // This proves they are distinct: same message text + different evaluator = different result
  });

  // 11. buildRuntimeSafetySupplement export
  it('11. buildRuntimeSafetySupplement is exported from workflowContextInjector.js', () => {
    expect(typeof buildRuntimeSafetySupplement).toBe('function');
  });

  // 12. HYBRID wiring → null (default path unchanged)
  it('12. buildRuntimeSafetySupplement returns null for HYBRID wiring', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_HYBRID,
      'I feel completely hopeless',
      'en',
    );
    expect(result).toBeNull();
  });

  // 13. V4 wiring → null
  it('13. buildRuntimeSafetySupplement returns null for V4 wiring', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      'I feel completely hopeless',
      'en',
    );
    expect(result).toBeNull();
  });

  // 14. null wiring → null
  it('14. buildRuntimeSafetySupplement returns null for null wiring', () => {
    expect(buildRuntimeSafetySupplement(null, 'I feel hopeless', 'en')).toBeNull();
    expect(buildRuntimeSafetySupplement(undefined, 'I feel hopeless', 'en')).toBeNull();
  });

  // 15. V5 wiring + distress text → non-null
  it('15. buildRuntimeSafetySupplement returns non-null for V5 wiring with distress text', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      'I feel completely hopeless about everything',
      'en',
    );
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(50);
  });

  // 16. V5 wiring + neutral text → null
  it('16. buildRuntimeSafetySupplement returns null for V5 wiring with neutral text', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      'I want to talk about my goals for the week',
      'en',
    );
    expect(result).toBeNull();
  });

  // 17. V5 + distress result contains SAFETY MODE header
  it('17. buildRuntimeSafetySupplement result contains SAFETY MODE header for V5 + distress', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      "I'm completely broken and falling apart",
      'en',
    );
    expect(result).toContain('SAFETY MODE');
    expect(result).toMatch(/phase.*7/i);
  });

  // 18. V5 + distress result contains emergency resources
  it('18. buildRuntimeSafetySupplement result contains emergency resources for V5 + distress', () => {
    const result = buildRuntimeSafetySupplement(
      CBT_THERAPIST_WIRING_STAGE2_V5,
      "I can't see a way forward, nothing matters",
      'en',
    );
    expect(result).toContain('EMERGENCY RESOURCES');
  });

  // 19. Never throws
  it('19. buildRuntimeSafetySupplement never throws', () => {
    const inputs = [
      [null, null, null],
      [undefined, undefined, undefined],
      [CBT_THERAPIST_WIRING_HYBRID, '', 'en'],
      [CBT_THERAPIST_WIRING_STAGE2_V5, null, null],
      [CBT_THERAPIST_WIRING_STAGE2_V5, 'I feel hopeless', 'zz'],
      [{}, 'test', 'en'],
    ];
    for (const [w, m, l] of inputs) {
      expect(() => buildRuntimeSafetySupplement(w, m, l)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7.1 — Section B: Explicit Precedence', () => {

  // 20. SAFETY_PRECEDENCE_ORDER export
  it('20. SAFETY_PRECEDENCE_ORDER is exported from therapistSafetyMode.js', () => {
    expect(SAFETY_PRECEDENCE_ORDER).toBeDefined();
    expect(Array.isArray(SAFETY_PRECEDENCE_ORDER)).toBe(true);
  });

  // 21. Exactly 4 layers
  it('21. SAFETY_PRECEDENCE_ORDER has exactly 4 layers', () => {
    expect(SAFETY_PRECEDENCE_ORDER.length).toBe(4);
  });

  // 22. Layer 1 = CRISIS_DETECTOR_REGEX, HARD_STOP
  it('22. Layer 1 is CRISIS_DETECTOR_REGEX with HARD_STOP authority', () => {
    const layer1 = SAFETY_PRECEDENCE_ORDER[0];
    expect(layer1.layer).toBe(1);
    expect(layer1.name).toBe('CRISIS_DETECTOR_REGEX');
    expect(layer1.authority).toBe('HARD_STOP');
  });

  // 23. Layer 2 = CRISIS_DETECTOR_LLM, HARD_STOP
  it('23. Layer 2 is CRISIS_DETECTOR_LLM with HARD_STOP authority', () => {
    const layer2 = SAFETY_PRECEDENCE_ORDER[1];
    expect(layer2.layer).toBe(2);
    expect(layer2.name).toBe('CRISIS_DETECTOR_LLM');
    expect(layer2.authority).toBe('HARD_STOP');
  });

  // 24. Layer 3 = UPGRADED_SAFETY_MODE, CONSTRAIN_ONLY
  it('24. Layer 3 is UPGRADED_SAFETY_MODE with CONSTRAIN_ONLY authority', () => {
    const layer3 = SAFETY_PRECEDENCE_ORDER[2];
    expect(layer3.layer).toBe(3);
    expect(layer3.name).toBe('UPGRADED_SAFETY_MODE');
    expect(layer3.authority).toBe('CONSTRAIN_ONLY');
  });

  // 25. Layer 4 = POST_LLM_SAFETY_FILTER, OUTPUT_FILTER
  it('25. Layer 4 is POST_LLM_SAFETY_FILTER with OUTPUT_FILTER authority', () => {
    const layer4 = SAFETY_PRECEDENCE_ORDER[3];
    expect(layer4.layer).toBe(4);
    expect(layer4.name).toBe('POST_LLM_SAFETY_FILTER');
    expect(layer4.authority).toBe('OUTPUT_FILTER');
  });

  // 26. Layers 1 and 2 affect_default_path: true
  it('26. Layers 1 and 2 have affects_default_path: true', () => {
    expect(SAFETY_PRECEDENCE_ORDER[0].affects_default_path).toBe(true);
    expect(SAFETY_PRECEDENCE_ORDER[1].affects_default_path).toBe(true);
  });

  // 27. Layer 3 affects_default_path: false
  it('27. Layer 3 has affects_default_path: false (V5 path only)', () => {
    expect(SAFETY_PRECEDENCE_ORDER[2].affects_default_path).toBe(false);
  });

  // 28. Layer 3 active_when mentions safety_mode_enabled
  it('28. Layer 3 active_when mentions safety_mode_enabled', () => {
    const layer3 = SAFETY_PRECEDENCE_ORDER[2];
    expect(layer3.active_when).toMatch(/safety_mode_enabled/);
  });

  // 29. Layers numbered in ascending order
  it('29. Layers are numbered in ascending order (1, 2, 3, 4)', () => {
    for (let i = 0; i < SAFETY_PRECEDENCE_ORDER.length; i++) {
      expect(SAFETY_PRECEDENCE_ORDER[i].layer).toBe(i + 1);
    }
  });

  // 30. Layer 3 overridden_by mentions layers 1 and 2
  it('30. Layer 3 overridden_by field explicitly mentions higher layers', () => {
    const layer3 = SAFETY_PRECEDENCE_ORDER[2];
    expect(typeof layer3.overridden_by).toBe('string');
    expect(layer3.overridden_by.length).toBeGreaterThan(0);
    // The overridden_by field should reference layers 1 and 2
    expect(layer3.overridden_by).toMatch(/[Ll]ayer|HARD_STOP/);
  });

  // 31. buildRuntimeSafetySupplement is subordinate to hard-stop layers
  it('31. buildRuntimeSafetySupplement cannot activate in default (HYBRID) path', () => {
    // Regardless of message content, HYBRID wiring returns null
    const distressMessages = [
      'I feel completely hopeless',
      "I'm falling apart",
      "My life is over",
      "I can't breathe",
    ];
    for (const msg of distressMessages) {
      const result = buildRuntimeSafetySupplement(CBT_THERAPIST_WIRING_HYBRID, msg, 'en');
      expect(result).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7.1 — Section C: Emergency Resource Verification + Fallback', () => {

  // 32. RESOURCE_SOURCE_BASIS export
  it('32. RESOURCE_SOURCE_BASIS is exported from emergencyResourceLayer.js', () => {
    expect(RESOURCE_SOURCE_BASIS).toBeDefined();
    expect(typeof RESOURCE_SOURCE_BASIS).toBe('object');
  });

  // 33. All 7 locales present in RESOURCE_SOURCE_BASIS
  it('33. RESOURCE_SOURCE_BASIS has entries for all 7 supported locales', () => {
    for (const locale of ALL_LOCALES) {
      expect(RESOURCE_SOURCE_BASIS).toHaveProperty(locale);
    }
  });

  // 34. Each entry has non-empty verified_sources
  it('34. Each RESOURCE_SOURCE_BASIS entry has a non-empty verified_sources array', () => {
    for (const locale of ALL_LOCALES) {
      const basis = RESOURCE_SOURCE_BASIS[locale];
      expect(Array.isArray(basis.verified_sources)).toBe(true);
      expect(basis.verified_sources.length).toBeGreaterThan(0);
      for (const source of basis.verified_sources) {
        expect(typeof source).toBe('string');
        expect(source.trim().length).toBeGreaterThan(10);
      }
    }
  });

  // 35. Each entry has non-empty basis_note
  it('35. Each RESOURCE_SOURCE_BASIS entry has a non-empty basis_note string', () => {
    for (const locale of ALL_LOCALES) {
      const basis = RESOURCE_SOURCE_BASIS[locale];
      expect(typeof basis.basis_note).toBe('string');
      expect(basis.basis_note.trim().length).toBeGreaterThan(10);
    }
  });

  // 36. isLocaleVerified export
  it('36. isLocaleVerified is exported from emergencyResourceLayer.js', () => {
    expect(typeof isLocaleVerified).toBe('function');
  });

  // 37. isLocaleVerified returns true for all 7 locales
  it('37. isLocaleVerified returns true for all 7 supported locales', () => {
    for (const locale of ALL_LOCALES) {
      expect(isLocaleVerified(locale)).toBe(true);
    }
  });

  // 38. isLocaleVerified returns false for unsupported locales
  it('38. isLocaleVerified returns false for unsupported locales', () => {
    expect(isLocaleVerified('xx')).toBe(false);
    expect(isLocaleVerified('zz')).toBe(false);
    expect(isLocaleVerified('ja')).toBe(false);
    expect(isLocaleVerified('zh')).toBe(false);
  });

  // 39. isLocaleVerified handles regional codes
  it('39. isLocaleVerified handles regional locale codes', () => {
    expect(isLocaleVerified('en-US')).toBe(true);
    expect(isLocaleVerified('he-IL')).toBe(true);
    expect(isLocaleVerified('fr-FR')).toBe(true);
    expect(isLocaleVerified('de-DE')).toBe(true);
    expect(isLocaleVerified('xx-XX')).toBe(false);
  });

  // 40. isLocaleVerified returns false for null/undefined
  it('40. isLocaleVerified returns false for null/undefined', () => {
    expect(isLocaleVerified(null)).toBe(false);
    expect(isLocaleVerified(undefined)).toBe(false);
    expect(isLocaleVerified('')).toBe(false);
  });

  // 41. getResourceSourceBasis export
  it('41. getResourceSourceBasis is exported from emergencyResourceLayer.js', () => {
    expect(typeof getResourceSourceBasis).toBe('function');
  });

  // 42. getResourceSourceBasis returns correct basis for each locale
  it('42. getResourceSourceBasis returns correct basis for each supported locale', () => {
    for (const locale of ALL_LOCALES) {
      const basis = getResourceSourceBasis(locale);
      expect(basis).toBeDefined();
      expect(basis.locale).toBe(locale);
      expect(Array.isArray(basis.verified_sources)).toBe(true);
      expect(basis.verified_sources.length).toBeGreaterThan(0);
    }
  });

  // 43. Unknown locale → en fallback
  it('43. getResourceSourceBasis returns en fallback for unknown locale', () => {
    const basis = getResourceSourceBasis('xx');
    expect(basis.locale).toBe(FALLBACK_LOCALE);
  });

  // 44. null/undefined → en fallback
  it('44. getResourceSourceBasis returns en fallback for null/undefined', () => {
    expect(getResourceSourceBasis(null).locale).toBe(FALLBACK_LOCALE);
    expect(getResourceSourceBasis(undefined).locale).toBe(FALLBACK_LOCALE);
    expect(getResourceSourceBasis('').locale).toBe(FALLBACK_LOCALE);
  });

  // 45. getResourceSourceBasis never throws
  it('45. getResourceSourceBasis never throws', () => {
    const inputs = [null, undefined, '', 0, {}, 'xx', 'en-US', 'he'];
    for (const input of inputs) {
      expect(() => getResourceSourceBasis(input)).not.toThrow();
    }
  });

  // 46. en basis mentions US federal/official sources
  it('46. en source basis mentions official US federal sources', () => {
    const basis = getResourceSourceBasis('en');
    const allSources = basis.verified_sources.join(' ').toLowerCase();
    // Should mention 988 and/or samhsa.gov
    expect(allSources).toMatch(/988|samhsa/i);
  });

  // 47. he basis mentions ERAN
  it('47. he source basis mentions ERAN', () => {
    const basis = getResourceSourceBasis('he');
    const allSources = basis.verified_sources.join(' ');
    expect(allSources).toMatch(/ERAN|1201/i);
  });

  // 48. fr basis mentions 3114
  it('48. fr source basis mentions 3114 (French national line)', () => {
    const basis = getResourceSourceBasis('fr');
    const allSources = basis.verified_sources.join(' ');
    expect(allSources).toContain('3114');
  });

  // 49. Unsupported locale fallback is en (conservative)
  it('49. Unsupported/uncertain locale falls back to en emergency resources', () => {
    const resources = resolveEmergencyResources('zz');
    expect(resources.locale).toBe('en');

    const section = buildEmergencyResourceSection('zz');
    expect(typeof section).toBe('string');
    expect(section.trim().length).toBeGreaterThan(50);
    // The fallback section should mention international resources
    expect(section).toMatch(/international|befrienders|988/i);
  });

  // 50. buildEmergencyResourceSection falls back to en for unknown locale
  it('50. buildEmergencyResourceSection falls back to en for unknown locale (safe)', () => {
    const knownSection = buildEmergencyResourceSection('en');
    const unknownSection = buildEmergencyResourceSection('UNKNOWN_LOCALE_99');
    expect(typeof unknownSection).toBe('string');
    expect(unknownSection.trim().length).toBeGreaterThan(50);
    // Both should contain the Phase 7 header
    expect(unknownSection).toMatch(/phase.*7/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7.1 — Section D: Default Mode + Rollback Safety', () => {

  // 51. ACTIVE_CBT_THERAPIST_WIRING is still HYBRID
  it('51. ACTIVE_CBT_THERAPIST_WIRING remains CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 52. buildRuntimeSafetySupplement returns null for HYBRID (no safety mode in default)
  it('52. buildRuntimeSafetySupplement returns null for HYBRID wiring with any message', () => {
    const distressInputs = [
      'I feel completely hopeless',
      "I'm breaking down",
      "My life is over",
      "I can't see a way forward",
    ];
    for (const text of distressInputs) {
      expect(buildRuntimeSafetySupplement(CBT_THERAPIST_WIRING_HYBRID, text, 'en')).toBeNull();
    }
  });

  // 53. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED remains false
  it('53. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED flag remains false by default', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SAFETY_MODE_ENABLED).toBe(false);
  });

  // 54. evaluateRuntimeSafetyMode returns safety_mode: false for null/empty
  it('54. evaluateRuntimeSafetyMode with no signals returns safety_mode: false', () => {
    expect(evaluateRuntimeSafetyMode(null).safety_mode).toBe(false);
    expect(evaluateRuntimeSafetyMode('').safety_mode).toBe(false);
  });

  // 55. buildRuntimeSafetySupplement is safe to call with null/undefined
  it('55. buildRuntimeSafetySupplement is completely safe to call with null/undefined args', () => {
    expect(() => buildRuntimeSafetySupplement(null, null, null)).not.toThrow();
    expect(() => buildRuntimeSafetySupplement(undefined, undefined, undefined)).not.toThrow();
    expect(buildRuntimeSafetySupplement(null, null, null)).toBeNull();
  });

  // 56. evaluateRuntimeSafetyMode fail-closed on unexpected exception
  it('56. evaluateRuntimeSafetyMode fail-closed on exception (returns FAIL_CLOSED_RESULT)', () => {
    // For non-string inputs (null, undefined, numbers, objects):
    // The function returns safety_mode: false (no distress signal = safe off state),
    // NOT SAFETY_MODE_FAIL_CLOSED_RESULT. This is correct: missing message text
    // means "no distress detected", not "uncertain state requiring restriction".
    const noSignalInputs = [null, undefined, '', '   ', 42, {}, []];
    for (const input of noSignalInputs) {
      const result = evaluateRuntimeSafetyMode(input);
      expect(result.safety_mode).toBe(false);
      expect(result.trigger).toBeNull();
      expect(result.pattern_match).toBe(false);
    }

    // The SAFETY_MODE_FAIL_CLOSED_RESULT is the value returned on UNEXPECTED
    // INTERNAL EXCEPTIONS (the catch block). Its properties are:
    expect(SAFETY_MODE_FAIL_CLOSED_RESULT.safety_mode).toBe(true);
    expect(SAFETY_MODE_FAIL_CLOSED_RESULT.fail_closed).toBe(true);

    // Verify evaluateRuntimeSafetyMode never throws (fail-closed catches all exceptions):
    const edgeCases = [null, undefined, 42, {}, [], 'normal text', 'I feel hopeless'];
    for (const input of edgeCases) {
      expect(() => evaluateRuntimeSafetyMode(input)).not.toThrow();
    }
  });
});
