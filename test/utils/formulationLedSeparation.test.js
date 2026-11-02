/**
 * @file test/utils/formulationLedSeparation.test.js
 *
 * Formulation-Led Separation Tests
 *
 * PURPOSE
 * -------
 * Verifies that the "Formulation Context" capability (CaseFormulation context
 * injection) is fully separated from the "Formulation-Led" capability
 * (THERAPIST_FORMULATION_INSTRUCTIONS injection).
 *
 * Tests required by the formulation-led separation problem statement:
 *
 * SCENARIO A — Context flag only (V6 path, no formulation-led):
 *   A1. resolveTherapistWiring selects V6 (not V6-LED) when only
 *       CONTEXT flag is on. (Routing is tested via wiring constants.)
 *   A2. V6 wiring has formulation_context_enabled: true.
 *   A3. V6 wiring has formulation_led_enabled: false.
 *   A4. getFormulationLedContextForWiring returns null for V6 wiring.
 *   A5. buildV6SessionStartContentAsync result does NOT contain
 *       THERAPIST_FORMULATION_INSTRUCTIONS for V6 wiring.
 *
 * SCENARIO B — Context + formulation-led flags (V6-LED path):
 *   B1. V6-LED wiring has formulation_context_enabled: true.
 *   B2. V6-LED wiring has formulation_led_enabled: true.
 *   B3. getFormulationLedContextForWiring returns THERAPIST_FORMULATION_INSTRUCTIONS
 *       for V6-LED wiring.
 *   B4. buildV6SessionStartContentAsync result CONTAINS
 *       THERAPIST_FORMULATION_INSTRUCTIONS for V6-LED wiring.
 *   B5. THERAPIST_FORMULATION_INSTRUCTIONS appears exactly once in V6-LED result
 *       (no duplicate injection).
 *
 * SCENARIO C — Formulation-led flag only (fail-closed, no V6 activation):
 *   C1. V6-LED requires formulation_context_enabled. HYBRID/V1-V5 wirings
 *       do not have it — getFormulationLedContextForWiring returns null.
 *   C2. getFormulationLedContextForWiring with _formulationLedEnabled:true
 *       still returns null when wiring.formulation_context_enabled is absent.
 *
 * SCENARIO D — V7–V12 with formulation-led flag off:
 *   D1. All V7–V12 wirings have formulation_context_enabled: true (prerequisite met).
 *   D2. With _formulationLedEnabled:false override, getFormulationLedContextForWiring
 *       returns null for all V7–V12 wirings.
 *   D3. buildV6SessionStartContentAsync does NOT inject THERAPIST_FORMULATION_INSTRUCTIONS
 *       for V7 wiring when _formulationLedEnabled is false.
 *
 * SCENARIO E — V7–V12 with formulation-led flag on:
 *   E1. With _formulationLedEnabled:true override, getFormulationLedContextForWiring
 *       returns THERAPIST_FORMULATION_INSTRUCTIONS for all V7–V12 wirings.
 *   E2. buildV6SessionStartContentAsync CONTAINS THERAPIST_FORMULATION_INSTRUCTIONS
 *       for V7 wiring when _formulationLedEnabled is true.
 *   E3. No duplicate injection (appears exactly once).
 *
 * SCENARIO F — Runtime diagnostic matches effective behavior:
 *   F1. With V6 wiring + formulation-led flag off:
 *       formulation_led_configured: false
 *       formulation_led_effective: false
 *   F2. With V6-LED wiring:
 *       formulation_led_configured: false (flag is still off in env)
 *       formulation_led_effective: true  (wiring.formulation_led_enabled: true)
 *   F3. Diagnostic snapshot does NOT expose formulation_led_enabled directly.
 *
 * SCENARIO G — No tool_configs or entity access changes:
 *   G1. V6 and V6-LED have identical tool_configs length.
 *   G2. V6 and V6-LED have identical entity names in tool_configs.
 *   G3. V6 and V6-LED have identical source_orders in tool_configs.
 *
 * SCENARIO H — V6-LED exports:
 *   H1. CBT_THERAPIST_WIRING_STAGE2_V6_LED is exported from agentWiring.js.
 *   H2. V6-LED has stage2: true.
 *   H3. V6-LED has stage2_phase: 10.
 *   H4. V6-LED has name: 'cbt_therapist'.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - Uses mock entity objects; no live entity calls are made.
 * - Tests the _formulationLedEnabled DI override to bypass live isUpgradeEnabled().
 */

import { describe, it, expect } from 'vitest';

// ── Wiring configs ─────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_STAGE2_V6_LED,
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V8,
  CBT_THERAPIST_WIRING_STAGE2_V9,
  CBT_THERAPIST_WIRING_STAGE2_V10,
  CBT_THERAPIST_WIRING_STAGE2_V11,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';

// ── Context injector ───────────────────────────────────────────────────────────
import {
  getFormulationLedContextForWiring,
  buildV6SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Formulation instructions constant ─────────────────────────────────────────
import {
  THERAPIST_FORMULATION_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Runtime diagnostic ─────────────────────────────────────────────────────────
import {
  buildRuntimeCapabilitySnapshot,
} from '../../src/lib/runtimeCapabilityDiagnostic.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const HIGHER_WIRINGS = [
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V8,
  CBT_THERAPIST_WIRING_STAGE2_V9,
  CBT_THERAPIST_WIRING_STAGE2_V10,
  CBT_THERAPIST_WIRING_STAGE2_V11,
  CBT_THERAPIST_WIRING_STAGE2_V12,
];

// ─── Scenario A — Context flag only (V6 path, no formulation-led) ─────────────

describe('Formulation-Led Separation — Scenario A: Context-only (V6)', () => {
  it('A2: V6 wiring has formulation_context_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_context_enabled).toBe(true);
  });

  it('A3: V6 wiring has formulation_led_enabled: false', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_led_enabled).toBe(false);
  });

  it('A4: getFormulationLedContextForWiring returns null for V6 (flag off in env)', () => {
    // Runtime flag is false by default; V6.formulation_led_enabled is false.
    // Using _formulationLedEnabled: false to make test deterministic.
    expect(
      getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6, { _formulationLedEnabled: false }),
    ).toBeNull();
  });

  it('A5: buildV6SessionStartContentAsync does NOT inject THERAPIST_FORMULATION_INSTRUCTIONS for V6 (flag off)', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      {},
      null,
      { _formulationLedEnabled: false },
    );
    expect(result).not.toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('A5b: V6 result still contains [START_SESSION]', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      {},
      null,
      { _formulationLedEnabled: false },
    );
    expect(result).toContain('[START_SESSION]');
  });
});

// ─── Scenario B — Context + formulation-led (V6-LED path) ────────────────────

describe('Formulation-Led Separation — Scenario B: Context + formulation-led (V6-LED)', () => {
  it('B1: V6-LED wiring has formulation_context_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.formulation_context_enabled).toBe(true);
  });

  it('B2: V6-LED wiring has formulation_led_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.formulation_led_enabled).toBe(true);
  });

  it('B3: getFormulationLedContextForWiring returns THERAPIST_FORMULATION_INSTRUCTIONS for V6-LED', () => {
    // V6-LED has formulation_led_enabled: true — always injects regardless of runtime flag.
    expect(getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V6_LED)).toBe(
      THERAPIST_FORMULATION_INSTRUCTIONS,
    );
  });

  it('B4: buildV6SessionStartContentAsync CONTAINS THERAPIST_FORMULATION_INSTRUCTIONS for V6-LED', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6_LED,
      {},
      null,
    );
    expect(result).toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('B5: THERAPIST_FORMULATION_INSTRUCTIONS appears exactly once in V6-LED result (no duplicate)', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6_LED,
      {},
      null,
    );
    const header = '=== FORMULATION-LED CBT — PHASE 10 ===';
    const count = result.split(header).length - 1;
    expect(count).toBe(1);
  });
});

// ─── Scenario C — Formulation-led flag only (fail-closed) ─────────────────────

describe('Formulation-Led Separation — Scenario C: Formulation-led flag only (fail-closed)', () => {
  it('C1a: getFormulationLedContextForWiring returns null for HYBRID wiring even with override:true', () => {
    expect(
      getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_HYBRID, { _formulationLedEnabled: true }),
    ).toBeNull();
  });

  it('C1b: getFormulationLedContextForWiring returns null for V5 wiring even with override:true', () => {
    expect(
      getFormulationLedContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V5, { _formulationLedEnabled: true }),
    ).toBeNull();
  });

  it('C2: getFormulationLedContextForWiring returns null when wiring.formulation_context_enabled is absent', () => {
    const wiringWithoutContext = { name: 'cbt_therapist', stage2: true };
    expect(
      getFormulationLedContextForWiring(wiringWithoutContext, { _formulationLedEnabled: true }),
    ).toBeNull();
  });

  it('C3: getFormulationLedContextForWiring returns null for null wiring', () => {
    expect(
      getFormulationLedContextForWiring(null, { _formulationLedEnabled: true }),
    ).toBeNull();
  });
});

// ─── Scenario D — V7–V12 with formulation-led flag off ────────────────────────

describe('Formulation-Led Separation — Scenario D: V7–V12 with formulation-led flag off', () => {
  it('D1: all V7–V12 wirings have formulation_context_enabled: true', () => {
    for (const [i, wiring] of HIGHER_WIRINGS.entries()) {
      expect(wiring.formulation_context_enabled, `HIGHER_WIRINGS[${i}] (stage2_phase ${wiring.stage2_phase}) should have formulation_context_enabled`).toBe(true);
    }
  });

  it('D2: getFormulationLedContextForWiring returns null for all V7–V12 wirings when flag is off', () => {
    for (const [i, wiring] of HIGHER_WIRINGS.entries()) {
      expect(
        getFormulationLedContextForWiring(wiring, { _formulationLedEnabled: false }),
        `HIGHER_WIRINGS[${i}] (stage2_phase ${wiring.stage2_phase}) should return null when flag off`,
      ).toBeNull();
    }
  });

  it('D3: buildV6SessionStartContentAsync does NOT inject formulation-led for V7 wiring when flag is off', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      {},
      null,
      { _formulationLedEnabled: false },
    );
    expect(result).not.toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });
});

// ─── Scenario E — V7–V12 with formulation-led flag on ─────────────────────────

describe('Formulation-Led Separation — Scenario E: V7–V12 with formulation-led flag on', () => {
  it('E1: getFormulationLedContextForWiring returns THERAPIST_FORMULATION_INSTRUCTIONS for all V7–V12 when flag is on', () => {
    for (const [i, wiring] of HIGHER_WIRINGS.entries()) {
      expect(
        getFormulationLedContextForWiring(wiring, { _formulationLedEnabled: true }),
        `HIGHER_WIRINGS[${i}] (stage2_phase ${wiring.stage2_phase}) should inject when flag on`,
      ).toBe(THERAPIST_FORMULATION_INSTRUCTIONS);
    }
  });

  it('E2: buildV6SessionStartContentAsync CONTAINS THERAPIST_FORMULATION_INSTRUCTIONS for V7 when flag is on', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      {},
      null,
      { _formulationLedEnabled: true },
    );
    expect(result).toContain(THERAPIST_FORMULATION_INSTRUCTIONS);
  });

  it('E3: THERAPIST_FORMULATION_INSTRUCTIONS appears exactly once in V7 result (no duplicate)', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      {},
      null,
      { _formulationLedEnabled: true },
    );
    const header = '=== FORMULATION-LED CBT — PHASE 10 ===';
    const count = result.split(header).length - 1;
    expect(count).toBe(1);
  });
});

// ─── Scenario F — Runtime diagnostic matches effective behavior ────────────────

describe('Formulation-Led Separation — Scenario F: Diagnostic effective vs configured', () => {
  it('F1: V6 wiring + formulation-led flag off → configured:false, effective:false', () => {
    const snapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V6,
      getFlagValue: () => false,
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    expect(snapshot.formulation_led_configured).toBe(false);
    expect(snapshot.formulation_led_effective).toBe(false);
  });

  it('F2: V6-LED wiring (formulation_led_enabled:true) → effective:true even when env flag is off', () => {
    const snapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V6_LED,
      getFlagValue: () => false,
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    // V6-LED has formulation_led_enabled:true → effective is true regardless of flag
    expect(snapshot.formulation_led_effective).toBe(true);
    // The raw flag is still false in env
    expect(snapshot.formulation_led_configured).toBe(false);
  });

  it('F3: diagnostic snapshot does NOT have formulation_led_enabled property', () => {
    const snapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V6,
      getFlagValue: () => false,
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    expect('formulation_led_enabled' in snapshot).toBe(false);
  });

  it('F4: V6 wiring + formulation-led flag on → configured:true, effective:true', () => {
    const snapshot = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V6,
      getFlagValue: (flag) => flag === 'THERAPIST_UPGRADE_FORMULATION_LED_ENABLED' || flag === 'THERAPIST_UPGRADE_ENABLED',
      getCompanionFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    expect(snapshot.formulation_led_configured).toBe(true);
    expect(snapshot.formulation_led_effective).toBe(true);
  });
});

// ─── Scenario G — No tool_configs or entity access changes ────────────────────

describe('Formulation-Led Separation — Scenario G: V6-LED tool_configs unchanged', () => {
  it('G1: V6 and V6-LED have identical tool_configs length', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.tool_configs.length).toBe(
      CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.length,
    );
  });

  it('G2: V6 and V6-LED have identical entity names in tool_configs', () => {
    const v6Names = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.map((t) => t.entity_name).sort();
    const ledNames = CBT_THERAPIST_WIRING_STAGE2_V6_LED.tool_configs.map((t) => t.entity_name).sort();
    expect(ledNames).toEqual(v6Names);
  });

  it('G3: V6 and V6-LED have identical source_orders in tool_configs', () => {
    const v6Map = Object.fromEntries(
      CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.map((t) => [t.entity_name, t.source_order]),
    );
    for (const config of CBT_THERAPIST_WIRING_STAGE2_V6_LED.tool_configs) {
      expect(config.source_order, `source_order for ${config.entity_name}`).toBe(v6Map[config.entity_name]);
    }
  });
});

// ─── Scenario H — V6-LED exports ──────────────────────────────────────────────

describe('Formulation-Led Separation — Scenario H: V6-LED wiring exports', () => {
  it('H1: CBT_THERAPIST_WIRING_STAGE2_V6_LED is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED).toBeDefined();
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V6_LED).toBe('object');
  });

  it('H2: V6-LED has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.stage2).toBe(true);
  });

  it('H3: V6-LED has stage2_phase: 10', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.stage2_phase).toBe(10);
  });

  it('H4: V6-LED has name: "cbt_therapist"', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6_LED.name).toBe('cbt_therapist');
  });
});
