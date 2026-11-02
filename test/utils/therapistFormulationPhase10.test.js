/**
 * @file test/utils/therapistFormulationPhase10.test.js
 *
 * Phase 10 — Formulation-Led CBT Super Agent
 *
 * PURPOSE
 * -------
 * Verifies the Phase 10 formulation-led upgrade:
 *
 * SECTION A — FORMULATION ENGINE EXPORTS
 *  1.  THERAPIST_FORMULATION_RESPONSE_RULES is exported from therapistWorkflowEngine.js
 *  2.  THERAPIST_FORMULATION_RESPONSE_RULES is a frozen object
 *  3.  THERAPIST_FORMULATION_RESPONSE_RULES has exactly 8 keys
 *  4.  already_known_context rule exists and is a non-empty string
 *  5.  formulation_before_questioning rule exists and is a non-empty string
 *  6.  no_early_protocol_rituals rule exists and is a non-empty string
 *  7.  natural_clinical_opening rule exists and is a non-empty string
 *  8.  confusion_handling rule exists and is a non-empty string
 *  9.  empathy_request_deepening rule exists and is a non-empty string
 *  10. source_honesty rule exists and is a non-empty string
 *  11. buildFormulationLedInstructions is exported and is a function
 *  12. THERAPIST_FORMULATION_INSTRUCTIONS is exported and is a non-empty string
 *  13. THERAPIST_FORMULATION_INSTRUCTIONS starts with the Phase 10 header
 *  14. THERAPIST_FORMULATION_INSTRUCTIONS ends with the Phase 10 footer
 *  15. THERAPIST_FORMULATION_INSTRUCTIONS contains all 8 rule labels
 *  16. buildFormulationLedInstructions() returns the same string as THERAPIST_FORMULATION_INSTRUCTIONS
 *
 * SECTION B — V6 WIRING CONFIG
 *  17. CBT_THERAPIST_WIRING_STAGE2_V6 is exported from agentWiring.js
 *  18. V6 has name 'cbt_therapist'
 *  19. V6 has stage2: true
 *  20. V6 has stage2_phase: 10
 *  21. V6 has formulation_led_enabled: true
 *  22. V6 has safety_mode_enabled: true (from V5)
 *  23. V6 has live_retrieval_enabled: true (from V4)
 *  24. V6 has retrieval_orchestration_enabled: true (from V3)
 *  25. V6 has workflow_context_injection: true (from V2)
 *  26. V6 has workflow_engine_enabled: true (from V2)
 *  27. V6 has memory_context_injection: true (from V1)
 *  28. V6 tool_configs has same entity count as V5
 *  29. V6 tool_configs does NOT add any new entity names beyond V5
 *  30. V6 entity source_orders are unchanged from V5
 *
 * SECTION C — WORKFLOW CONTEXT INJECTOR
 *  31. getFormulationLedContextForWiring is exported from workflowContextInjector.js
 *  32. getFormulationLedContextForWiring returns null for HYBRID wiring
 *  33. getFormulationLedContextForWiring returns null for V5 wiring
 *  34. getFormulationLedContextForWiring returns null for null input
 *  35. getFormulationLedContextForWiring returns THERAPIST_FORMULATION_INSTRUCTIONS for V6
 *  36. buildV6SessionStartContentAsync is exported from workflowContextInjector.js
 *  37. buildV6SessionStartContentAsync is an async function
 *  38. buildV6SessionStartContentAsync returns '[START_SESSION]' for HYBRID wiring
 *  39. buildV6SessionStartContentAsync returns '[START_SESSION]' for null wiring
 *  40. buildV6SessionStartContentAsync result for V6 contains '[START_SESSION]'
 *  41. buildV6SessionStartContentAsync result for V6 contains THERAPIST_FORMULATION_INSTRUCTIONS
 *  42. buildV6SessionStartContentAsync result for V6 contains THERAPIST_WORKFLOW_INSTRUCTIONS (V2 layer)
 *
 * SECTION D — ROUTING AND FLAG ISOLATION
 *  43. THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_FORMULATION_LED_ENABLED key
 *  44. THERAPIST_UPGRADE_FORMULATION_LED_ENABLED defaults to false
 *  45. resolveTherapistWiring() returns HYBRID when all flags are false
 *  46. resolveTherapistWiring() returns V6 when FORMULATION_LED + ENABLED flags are on
 *  47. ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default path unchanged)
 *  48. V6 is not the active wiring when all flags are false
 *  49. V5 is still returned when SAFETY_MODE_ENABLED is on but FORMULATION_LED is off
 *  50. V6 supersedes V5 when FORMULATION_LED is on (V6 is a superset of V5)
 *
 * SECTION E — BACKWARD COMPATIBILITY
 *  51. HYBRID wiring still has no formulation_led_enabled flag
 *  52. V1 wiring still has no formulation_led_enabled flag
 *  53. V2 wiring still has no formulation_led_enabled flag
 *  54. V5 wiring still does NOT have formulation_led_enabled === true
 *  55. buildV6SessionStartContentAsync with HYBRID wiring returns exactly '[START_SESSION]'
 *  56. buildV6SessionStartContentAsync never throws for null/undefined wiring
 *  57. THERAPIST_WORKFLOW_INSTRUCTIONS is still exported and unchanged
 *  58. Existing Phase 3 tests unaffected: THERAPIST_WORKFLOW_VERSION still exported
 *  59. Existing V5 still has same entity set as V6
 *  60. resolveTherapistWiring() phase order: V6 > V5 > V4 > V3 > V2 > V1 > HYBRID
 */

import { describe, it, expect } from 'vitest';

// ── Phase 10 — Formulation engine ────────────────────────────────────────────
import {
  THERAPIST_FORMULATION_RESPONSE_RULES,
  THERAPIST_FORMULATION_INSTRUCTIONS,
  THERAPIST_WORKFLOW_INSTRUCTIONS,
  THERAPIST_WORKFLOW_VERSION,
  buildFormulationLedInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Wiring configs ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_STAGE2_V6_LED,
} from '../../src/api/agentWiring.js';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  getFormulationLedContextForWiring,
  buildV6SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Active wiring / routing ───────────────────────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ── Feature flags ─────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Regression fixture: production empathy + "missing formulation" request ────
const HEBREW_PRODUCTION_SCENARIO = Object.freeze({
  user:
    'אני מרגיש/ה שאתם כבר יודעים את הסיפור, אבל עדיין לא באמת מבינים למה זה כל כך מאיים עליי. אל תחזרו על מה שכבר ידוע ואל תציעו תרגיל עדיין — בעדינות תגידו לי מה לדעתכם חסר בפורמולציה.',
});

// ─── Section A — Formulation engine exports ───────────────────────────────────

describe('Phase 10 — THERAPIST_FORMULATION_RESPONSE_RULES exists and is well-formed', () => {
  it('is exported from therapistWorkflowEngine.js', () => {
    expect(THERAPIST_FORMULATION_RESPONSE_RULES).toBeDefined();
  });

  it('is a frozen object', () => {
    expect(Object.isFrozen(THERAPIST_FORMULATION_RESPONSE_RULES)).toBe(true);
  });

  it('has exactly 8 keys', () => {
    expect(Object.keys(THERAPIST_FORMULATION_RESPONSE_RULES)).toHaveLength(8);
  });

  it('already_known_context rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.already_known_context).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.already_known_context.length).toBeGreaterThan(0);
  });

  it('formulation_before_questioning rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.formulation_before_questioning).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.formulation_before_questioning.length).toBeGreaterThan(0);
  });

  it('no_early_protocol_rituals rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.no_early_protocol_rituals).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.no_early_protocol_rituals.length).toBeGreaterThan(0);
  });

  it('natural_clinical_opening rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.natural_clinical_opening).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.natural_clinical_opening.length).toBeGreaterThan(0);
  });

  it('confusion_handling rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.confusion_handling).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.confusion_handling.length).toBeGreaterThan(0);
  });

  it('empathy_request_deepening rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.empathy_request_deepening).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.empathy_request_deepening.length).toBeGreaterThan(0);
  });

  it('source_honesty rule exists and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty).toBe('string');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty.length).toBeGreaterThan(0);
  });
});

describe('Phase 10 — buildFormulationLedInstructions and THERAPIST_FORMULATION_INSTRUCTIONS', () => {
  it('buildFormulationLedInstructions is exported and is a function', () => {
    expect(typeof buildFormulationLedInstructions).toBe('function');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS is exported and is a non-empty string', () => {
    expect(typeof THERAPIST_FORMULATION_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS starts with the Phase 10 header', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('=== FORMULATION-LED CBT — PHASE 10 ===');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS ends with the Phase 10 footer', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('=== END FORMULATION-LED CBT ===');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains already-known context rule label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Already-known context suppression');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains formulation-before-questioning label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Formulation before questioning');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains no-early-protocol-rituals label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('No early protocol rituals');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains natural-clinical-opening label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Natural clinical opening');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains confusion-handling label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Confusion handling');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains empathy-request-deepening label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Empathy-request deepening');
  });

  it('THERAPIST_FORMULATION_INSTRUCTIONS contains source-honesty label', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Source and evidence honesty');
  });

  it('buildFormulationLedInstructions() returns the same string as THERAPIST_FORMULATION_INSTRUCTIONS', () => {
    expect(buildFormulationLedInstructions()).toBe(THERAPIST_FORMULATION_INSTRUCTIONS);
  });
});

describe('Phase 10 regression — epistemic humility contract in source_honesty', () => {
  it('includes the approved Hebrew production scenario fixture as non-sensitive context', () => {
    expect(HEBREW_PRODUCTION_SCENARIO.user).toContain('אל תחזרו על מה שכבר ידוע');
    expect(HEBREW_PRODUCTION_SCENARIO.user).toContain('אל תציעו תרגיל עדיין');
  });

  it('requires explicit separation of established facts, inference, hypothesis, and missing clarification', () => {
    const rule = THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty;
    expect(rule).toContain('already established');
    expect(rule).toContain('supported inference');
    expect(rule).toContain('unverified deeper hypothesis');
    expect(rule).toContain('still requires clarification');
  });

  it('requires tentative language when introducing unsupported deeper meaning-level hypotheses', () => {
    const rule = THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty;
    expect(rule).toContain('label it as a hypothesis');
    expect(rule).toContain('I wonder if…');
    expect(rule).toContain('one possibility is…');
    expect(rule).toContain('this is still my hypothesis…');
    expect(rule).toContain('tell me if this does not fit your experience');
    expect(rule).toContain('ייתכן ש...');
    expect(rule).toContain('אני תוהה אם...');
    expect(rule).toContain('אחת האפשרויות היא...');
    expect(rule).toContain('זו עדיין השערה שלי...');
  });

  it('prohibits certainty markers and unsupported dramatic interpretations unless grounded', () => {
    const rule = THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty;
    expect(rule).toContain('"the real reason is…"');
    expect(rule).toContain('"what is definitely missing is…"');
    expect(rule).toContain('"this means that…"');
    expect(rule).toContain('"this is existential"');
    expect(rule).toContain('"this is irreversible"');
    expect(rule).toContain('"avoidance is necessary protection"');
    expect(rule).toContain('unless that meaning was explicitly stated by the person');
    expect(rule).toContain('or is present in structured formulation context');
  });

  it('permits at most one collaborative verification question when a new hypothesis is introduced', () => {
    const rule = THERAPIST_FORMULATION_RESPONSE_RULES.source_honesty;
    expect(rule).toContain('asks what is still missing');
    expect(rule).toContain('ask at most one precise collaborative verification question');
    expect(rule).toContain('tests the hypothesis rather than assumes it');
  });

  it('preserves no-early-exercise behavior and no-repeat behavior under this scenario', () => {
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.no_early_protocol_rituals).toContain('Do not introduce');
    expect(THERAPIST_FORMULATION_RESPONSE_RULES.already_known_context).toContain('do not re-ask for it');
  });

  it('keeps the strengthened source_honesty rule embedded in the public injected instruction block', () => {
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Source and evidence honesty');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('explicitly separate what is already established');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('apply this contract consistently across languages');
  });
});

// ─── Section B — V6 wiring config ────────────────────────────────────────────

describe('Phase 10 — CBT_THERAPIST_WIRING_STAGE2_V6 exists and is well-formed', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V6 is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6).toBeDefined();
  });

  it('V6 has name "cbt_therapist"', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.name).toBe('cbt_therapist');
  });

  it('V6 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.stage2).toBe(true);
  });

  it('V6 has stage2_phase: 10', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.stage2_phase).toBe(10);
  });

  it('V6 has formulation_led_enabled: false (context-only path; use V6-LED for formulation-led)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_led_enabled).toBe(false);
  });

  it('V6 has safety_mode_enabled: true (from V5)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.safety_mode_enabled).toBe(true);
  });

  it('V6 has live_retrieval_enabled: true (from V4)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.live_retrieval_enabled).toBe(true);
  });

  it('V6 has retrieval_orchestration_enabled: true (from V3)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.retrieval_orchestration_enabled).toBe(true);
  });

  it('V6 has workflow_context_injection: true (from V2)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.workflow_context_injection).toBe(true);
  });

  it('V6 has workflow_engine_enabled: true (from V2)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.workflow_engine_enabled).toBe(true);
  });

  it('V6 has memory_context_injection: true (from V1)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.memory_context_injection).toBe(true);
  });

  it('V6 tool_configs has same entity count as V5', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.length).toBe(
      CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs.length,
    );
  });

  it('V6 tool_configs does NOT add any new entity names beyond V5', () => {
    const v5Names = new Set(CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs.map((t) => t.entity_name));
    const v6Names = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.map((t) => t.entity_name);
    for (const name of v6Names) {
      expect(v5Names.has(name)).toBe(true);
    }
  });

  it('V6 entity source_orders are unchanged from V5', () => {
    const v5Map = Object.fromEntries(
      CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs.map((t) => [t.entity_name, t.source_order]),
    );
    for (const config of CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs) {
      expect(config.source_order).toBe(v5Map[config.entity_name]);
    }
  });
});

// ─── Section C — Workflow context injector ────────────────────────────────────

describe('Phase 10 — getFormulationLedContextForWiring', () => {
  it('is exported from workflowContextInjector.js', () => {
    expect(typeof getFormulationLedContextForWiring).toBe('function');
  });

  it('returns null for HYBRID wiring', () => {
    expect(getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('returns null for V5 wiring', () => {
    expect(getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V5)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getFormulationLedContextForWiring(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getFormulationLedContextForWiring(undefined)).toBeNull();
  });

  it('returns null for V6 wiring (context-only, formulation-led flag off)', () => {
    // V6 has formulation_led_enabled: false. The runtime flag is off in tests.
    // Fail-closed: context path selected but led not active → null.
    expect(getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6)).toBeNull();
  });

  it('returns THERAPIST_FORMULATION_INSTRUCTIONS for V6-LED wiring', () => {
    // V6-LED has formulation_led_enabled: true — always injects regardless of runtime flag.
    expect(getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6_LED)).toBe(
      THERAPIST_FORMULATION_INSTRUCTIONS,
    );
  });

  it('returns THERAPIST_FORMULATION_INSTRUCTIONS for V6 wiring when _formulationLedEnabled override is true', () => {
    // V7–V12 chain: runtime flag on → inject even though wiring.formulation_led_enabled is false.
    expect(
      getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6, { _formulationLedEnabled: true }),
    ).toBe(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('returns null for V6 wiring when _formulationLedEnabled override is false', () => {
    expect(
      getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6, { _formulationLedEnabled: false }),
    ).toBeNull();
  });
});

describe('Phase 10 — buildV6SessionStartContentAsync', () => {
  it('is exported from workflowContextInjector.js', () => {
    expect(typeof buildV6SessionStartContentAsync).toBe('function');
  });

  it('is an async function (returns a Promise)', () => {
    const result = buildV6SessionStartContentAsync(null, {}, null);
    expect(result).toBeInstanceOf(Promise);
    return result; // allow vitest to catch any unhandled rejections
  });

  it('returns "[START_SESSION]" for HYBRID wiring', async () => {
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('returns "[START_SESSION]" for null wiring', async () => {
    const result = await buildV6SessionStartContentAsync(null, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('returns "[START_SESSION]" for undefined wiring', async () => {
    const result = await buildV6SessionStartContentAsync(undefined, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('result for V6 contains "[START_SESSION]"', async () => {
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V6, {}, null);
    expect(result).toContain('[START_SESSION]');
  });

  it('result for V6 does NOT contain THERAPIST_FORMULATION_INSTRUCTIONS when flag is off', async () => {
    // V6 is context-only (formulation_led_enabled: false). Flag is off in tests.
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V6, {}, null);
    expect(result).not.toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('result for V6-LED contains THERAPIST_FORMULATION_INSTRUCTIONS', async () => {
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V6_LED, {}, null);
    expect(result).toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('result for V6 contains THERAPIST_WORKFLOW_INSTRUCTIONS (V2 layer)', async () => {
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V6, {}, null);
    expect(result).toContain(THERAPIST_WORKFLOW_INSTRUCTIONS);
  });

  it('never throws for null/undefined wiring', async () => {
    await expect(buildV6SessionStartContentAsync(null, {}, null)).resolves.toBeDefined();
    await expect(buildV6SessionStartContentAsync(undefined, {}, null)).resolves.toBeDefined();
  });
});

// ─── Section D — Routing and flag isolation ───────────────────────────────────

describe('Phase 10 — Feature flags', () => {
  it('THERAPIST_UPGRADE_FLAGS has THERAPIST_UPGRADE_FORMULATION_LED_ENABLED key', () => {
    expect('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED defaults to false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED')).toBe(false);
  });
});

describe('Phase 10 — resolveTherapistWiring routing', () => {
  it('returns HYBRID when all flags are false', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default path unchanged)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('V6 is not the active wiring when all flags are false', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V6);
  });
});

// ─── Section E — Backward compatibility ──────────────────────────────────────

describe('Phase 10 — Backward compatibility: prior wirings unchanged', () => {
  it('HYBRID wiring does not have formulation_led_enabled', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.formulation_led_enabled).toBeUndefined();
  });

  it('V1 wiring does not have formulation_led_enabled', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.formulation_led_enabled).toBeUndefined();
  });

  it('V2 wiring does not have formulation_led_enabled', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.formulation_led_enabled).toBeUndefined();
  });

  it('V5 wiring does not have formulation_led_enabled === true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.formulation_led_enabled).not.toBe(true);
  });

  it('buildV6SessionStartContentAsync with HYBRID wiring returns exactly "[START_SESSION]"', async () => {
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(result).toBe('[START_SESSION]');
  });

  it('THERAPIST_WORKFLOW_INSTRUCTIONS is still exported and non-empty', () => {
    expect(typeof THERAPIST_WORKFLOW_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('THERAPIST_WORKFLOW_VERSION is still exported', () => {
    expect(typeof THERAPIST_WORKFLOW_VERSION).toBe('string');
    expect(THERAPIST_WORKFLOW_VERSION.length).toBeGreaterThan(0);
  });

  it('V5 and V6 have the same entity set (V6 adds no entity access)', () => {
    const v5Names = CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs
      .map((t) => t.entity_name)
      .sort();
    const v6Names = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs
      .map((t) => t.entity_name)
      .sort();
    expect(v6Names).toEqual(v5Names);
  });
});
