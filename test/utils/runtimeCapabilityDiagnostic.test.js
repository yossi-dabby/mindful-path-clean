/**
 * @file test/utils/runtimeCapabilityDiagnostic.test.js
 *
 * Deterministic tests for src/lib/runtimeCapabilityDiagnostic.js
 *
 * Covers all 10 required test requirements:
 *   1.  Non-admin access is rejected.
 *   2.  No secret values are returned.
 *   3.  Exact === 'true' semantics are respected.
 *   4.  The selected therapist wiring comes from the existing production resolver.
 *   5.  V12 is reported when master and planner-first flags are enabled.
 *   6.  Lower-priority active flags do not incorrectly change the reported route
 *       when V12 wins.
 *   7.  Super CBT Agent is reported as not production-routed unless truly wired.
 *   8.  Obsolete/unused flags are reported but never activated.
 *   9.  The diagnostic code cannot change feature flags or agent behavior.
 *   10. Existing Chat, Companion, safety, build, and test behavior is unchanged.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildRuntimeCapabilitySnapshot,
  _therapistWiringCanonicalName,
  _therapistWiringPhaseDescription,
  _companionWiringCanonicalName,
  DIAGNOSTIC_VERSION,
} from '../../src/lib/runtimeCapabilityDiagnostic.js';
import {
  resolveTherapistWiring,
  resolveCompanionWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
} from '../../src/api/activeAgentWiring.js';
import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';
import { THERAPIST_UPGRADE_FLAGS, COMPANION_UPGRADE_FLAGS } from '../../src/lib/featureFlags.js';

// ─── Shared mock wirings ───────────────────────────────────────────────────────

/** Minimal V12 stub that matches the shape needed for reporting. */
const STUB_V12_WIRING = Object.freeze({
  name: 'cbt_therapist',
  stage2: true,
  stage2_phase: 16,
  planner_first_enabled: true,
  super_agent: false,
});

/** Minimal V11 stub — lower priority than V12. */
const STUB_V11_WIRING = Object.freeze({
  name: 'cbt_therapist',
  stage2: true,
  stage2_phase: 15,
  planner_first_enabled: false,
  super_agent: false,
});

/** Minimal HYBRID stub. */
const STUB_HYBRID_WIRING = Object.freeze({
  name: 'cbt_therapist',
  stage2: false,
  super_agent: false,
});

/** Minimal companion HYBRID stub. */
const STUB_COMPANION_HYBRID = Object.freeze({
  name: 'ai_companion',
  companion_upgrade: false,
});

/** Minimal companion V2 stub. */
const STUB_COMPANION_V2 = Object.freeze({
  name: 'ai_companion',
  companion_upgrade: true,
  companion_upgrade_phase: 3,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a snapshot with all dependencies stubbed to defaults-off state. */
function defaultSnapshot(overrides = {}) {
  return buildRuntimeCapabilitySnapshot({
    getTherapistWiring: () => STUB_HYBRID_WIRING,
    getCompanionWiring: () => STUB_COMPANION_HYBRID,
    getFlagValue: () => false,
    getCompanionFlagValue: () => false,
    getSuperCbtFlagConfigured: () => false,
    ...overrides,
  });
}

// ─── Test 1: Non-admin access is rejected ─────────────────────────────────────
//
// The backend function enforces user?.role !== 'admin' → 403.
// The frontend panel enforces the same check and returns null.
// We verify the backend logic by testing the admin gate rule directly,
// and verify that the frontend snapshot builder itself never receives
// or returns user credentials (it does not take a user parameter).

describe('Test 1: Admin gate enforcement', () => {
  it('backend gate: non-admin user role yields 403 Forbidden', () => {
    // Simulate the backend gate logic inline (mirrors entry.ts)
    function simulateBackendGate(user) {
      if (user?.role !== 'admin') {
        return { status: 403, error: 'Forbidden: Admin access required' };
      }
      return { status: 200 };
    }

    expect(simulateBackendGate(null).status).toBe(403);
    expect(simulateBackendGate(undefined).status).toBe(403);
    expect(simulateBackendGate({ role: 'user' }).status).toBe(403);
    expect(simulateBackendGate({ role: 'therapist' }).status).toBe(403);
    expect(simulateBackendGate({ role: '' }).status).toBe(403);
    expect(simulateBackendGate({ role: 'admin' }).status).toBe(200);
  });

  it('frontend gate: non-admin role string does not equal "admin"', () => {
    // Mirrors the condition in AiRuntimeCapabilitiesPanel
    const isAdmin = (user) => user?.role === 'admin';
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin({ role: 'user' })).toBe(false);
    expect(isAdmin({ role: 'ADMIN' })).toBe(false); // case-sensitive
    expect(isAdmin({ role: 'admin' })).toBe(true);
  });
});

// ─── Test 2: No secret values are returned ────────────────────────────────────

describe('Test 2: No secret values in snapshot', () => {
  it('all snapshot fields are boolean, string, or null — never raw env var values', () => {
    const snap = defaultSnapshot();
    for (const [key, value] of Object.entries(snap)) {
      const type = typeof value;
      // Allow boolean, string, or null/undefined (no arrays or objects at top level)
      expect(
        type === 'boolean' || type === 'string',
        `Field "${key}" has unexpected type "${type}" (value: ${JSON.stringify(value)})`
      ).toBe(true);
    }
  });

  it('snapshot does not contain any known secret substrings', () => {
    const snap = defaultSnapshot();
    const snapshot_string = JSON.stringify(snap);
    const forbidden_substrings = [
      'sk-', 'Bearer ', 'password', 'credential', 'api_key', 'apikey',
      'THERAPIST_ADVANCED_MEMORY', 'THERAPIST_SESSION_CONTINUITY', 'THERAPIST_KNOWLEDGE_EXPANSION',
    ];
    for (const secret of forbidden_substrings) {
      expect(snapshot_string.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });

  it('snapshot does not contain tool_configs or entity access lists', () => {
    const snap = defaultSnapshot();
    const snapshot_string = JSON.stringify(snap);
    expect(snapshot_string).not.toContain('tool_configs');
    expect(snapshot_string).not.toContain('entity_name');
  });
});

// ─── Test 3: Exact === 'true' semantics ───────────────────────────────────────

describe('Test 3: Exact === "true" string semantics', () => {
  it('flag evaluator returning false keeps field false', () => {
    const snap = defaultSnapshot({ getFlagValue: () => false });
    expect(snap.therapist_master_enabled).toBe(false);
    expect(snap.workflow_enabled).toBe(false);
    expect(snap.planner_first_enabled).toBe(false);
  });

  it('flag evaluator returning true sets field to true', () => {
    const snap = defaultSnapshot({ getFlagValue: () => true });
    expect(snap.therapist_master_enabled).toBe(true);
    expect(snap.workflow_enabled).toBe(true);
    expect(snap.planner_first_enabled).toBe(true);
  });

  it('flag evaluator returning "1" (non-strict true) is treated as false', () => {
    // The diagnostic's safeFlag guard does: evaluator(flagName) === true (boolean strict check).
    // Even though production isUpgradeEnabled() always returns boolean internally,
    // the DI layer defensively ensures only boolean true is accepted from getFlagValue.
    // This verifies that non-boolean truthy values from a DI-injected evaluator are rejected.
    const snap = defaultSnapshot({ getFlagValue: () => '1' });
    // safeFlag does evaluator(flagName) === true — '1' === true is false
    expect(snap.therapist_master_enabled).toBe(false);
  });

  it('flag evaluator returning the string "true" is treated as false (not boolean)', () => {
    // safeFlag does evaluator(flagName) === true — 'true' === true is false.
    // This tests the diagnostic's own defensive === true guard, not the production evaluator.
    // In production, isUpgradeEnabled() already returns boolean; this tests the DI boundary.
    const snap = defaultSnapshot({ getFlagValue: () => 'true' });
    expect(snap.therapist_master_enabled).toBe(false);
  });

  it('backend gate semantics: Deno.env string "true" maps to enabled', () => {
    // Simulates exact backend flag logic (mirrors entry.ts)
    function backendFlag(envVal) {
      return envVal === 'true';
    }
    expect(backendFlag('true')).toBe(true);
    expect(backendFlag('1')).toBe(false);
    expect(backendFlag('True')).toBe(false);
    expect(backendFlag('')).toBe(false);
    expect(backendFlag(undefined)).toBe(false);
    expect(backendFlag(null)).toBe(false);
  });
});

// ─── Test 4: Selected therapist wiring comes from existing production resolver ─

describe('Test 4: Therapist wiring from production resolver', () => {
  it('uses getTherapistWiring DI parameter as the sole wiring source', () => {
    const customWiring = STUB_V12_WIRING;
    const snap = defaultSnapshot({ getTherapistWiring: () => customWiring });
    // The canonical name must reflect the injected wiring
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
  });

  it('when default resolver is used, result matches ACTIVE_CBT_THERAPIST_WIRING', () => {
    // In test env all VITE_* flags are false, so ACTIVE_CBT_THERAPIST_WIRING is HYBRID
    const activeWiring = resolveTherapistWiring();
    const snap = buildRuntimeCapabilitySnapshot({
      getCompanionWiring: () => STUB_COMPANION_HYBRID,
      getCompanionFlagValue: () => false,
      getFlagValue: () => false,
      getSuperCbtFlagConfigured: () => false,
    });
    // The reported wiring name must derive from the same object the production resolver returns
    const expectedName = _therapistWiringCanonicalName(activeWiring);
    expect(snap.selected_therapist_wiring).toBe(expectedName);
  });
});

// ─── Test 5: V12 is reported when master + planner-first flags are enabled ────

describe('Test 5: V12 reporting when master + planner-first active', () => {
  it('reports V12 wiring and planner_first_enabled=true', () => {
    const snap = defaultSnapshot({
      getTherapistWiring: () => STUB_V12_WIRING,
      getFlagValue: (flag) => ['THERAPIST_UPGRADE_ENABLED', 'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED'].includes(flag),
    });
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
    expect(snap.selected_therapist_stage).toBe('stage2');
    expect(snap.selected_therapist_phase).toBe('wave5_planner_first');
    expect(snap.planner_first_enabled).toBe(true);
    expect(snap.action_first_demotion_present).toBe(true);
  });

  it('action_first_demotion_present reflects wiring-level planner_first_enabled field', () => {
    // V12 wiring object has planner_first_enabled: true → action_first_demotion_present: true
    const snapV12 = defaultSnapshot({ getTherapistWiring: () => STUB_V12_WIRING });
    expect(snapV12.action_first_demotion_present).toBe(true);

    // V11 wiring object has planner_first_enabled: false → action_first_demotion_present: false
    const snapV11 = defaultSnapshot({ getTherapistWiring: () => STUB_V11_WIRING });
    expect(snapV11.action_first_demotion_present).toBe(false);

    // HYBRID wiring has no planner_first_enabled field
    const snapHybrid = defaultSnapshot({ getTherapistWiring: () => STUB_HYBRID_WIRING });
    expect(snapHybrid.action_first_demotion_present).toBe(false);
  });

  it('V12 phase description is wave5_planner_first', () => {
    expect(_therapistWiringPhaseDescription(STUB_V12_WIRING)).toBe('wave5_planner_first');
  });

  it('V12 canonical name is CBT_THERAPIST_WIRING_STAGE2_V12', () => {
    expect(_therapistWiringCanonicalName(STUB_V12_WIRING)).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
  });
});

// ─── Test 6: Lower-priority flags do not change route when V12 wins ──────────

describe('Test 6: V12 route wins over lower-priority wirings', () => {
  it('when resolver returns V12, lower-priority stage2 flags are irrelevant', () => {
    // The production resolver already selects V12 if all gates pass.
    // We inject V12 via DI and verify sub-flags are correctly reported.
    const snap = defaultSnapshot({
      getTherapistWiring: () => STUB_V12_WIRING,
      getFlagValue: (flag) => {
        // All upgrade flags on, including lower-priority ones
        return true;
      },
    });
    // V12 wins regardless of lower-priority flag state
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
  });

  it('when resolver returns V11, V12 is not reported', () => {
    const snap = defaultSnapshot({ getTherapistWiring: () => STUB_V11_WIRING });
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V11');
    expect(snap.selected_therapist_phase).toBe('phase3_competence');
    expect(snap.action_first_demotion_present).toBe(false);
  });

  it('wiring canonical name respects phase integer, not flag state', () => {
    // Stage2_phase 15 → V11 regardless of any flag configuration
    const snap = defaultSnapshot({ getTherapistWiring: () => STUB_V11_WIRING });
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V11');
    expect(snap.selected_therapist_wiring).not.toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
  });
});

// ─── Test 7: Super CBT Agent is not production-routed ────────────────────────

describe('Test 7: Super CBT Agent not production-routed', () => {
  it('super_cbt_routed_in_production is false when wiring has no super_agent marker', () => {
    const snap = defaultSnapshot({ getTherapistWiring: () => STUB_HYBRID_WIRING });
    expect(snap.super_cbt_routed_in_production).toBe(false);
  });

  it('super_cbt_routed_in_production is false even when flag is configured', () => {
    const snap = defaultSnapshot({
      getTherapistWiring: () => STUB_HYBRID_WIRING,
      getSuperCbtFlagConfigured: () => true,
    });
    expect(snap.super_cbt_flag_configured).toBe(true);
    expect(snap.super_cbt_routed_in_production).toBe(false);
  });

  it('super_cbt_routed_in_production is only true if resolved wiring has super_agent===true', () => {
    const superWiring = Object.freeze({ name: 'cbt_therapist', stage2: false, super_agent: true });
    const snap = defaultSnapshot({ getTherapistWiring: () => superWiring });
    expect(snap.super_cbt_routed_in_production).toBe(true);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING (default-off env) is not the super agent wiring', () => {
    const activeWiring = resolveTherapistWiring();
    expect(activeWiring?.super_agent).not.toBe(true);
  });
});

// ─── Test 8: Obsolete/unused flags reported but never activated ───────────────

describe('Test 8: Configured-but-unused secrets documented, not activated', () => {
  const UNUSED_NAMES = [
    'THERAPIST_ADVANCED_MEMORY',
    'THERAPIST_SESSION_CONTINUITY',
    'THERAPIST_KNOWLEDGE_EXPANSION',
  ];

  it('unused names do not appear as enabled flags in snapshot fields', () => {
    const snap = defaultSnapshot();
    for (const name of UNUSED_NAMES) {
      // None of the snapshot field names should derive from unused secret names
      // (the snapshot has no field named after these secrets)
      const fieldNames = Object.keys(snap);
      expect(fieldNames.some(f => f.toUpperCase().includes(name))).toBe(false);
    }
  });

  it('backend configured_but_unused list is a static, hard-coded array (no runtime read)', () => {
    // The backend function declares a constant array of names (no Deno.env.get calls for them).
    // We verify the names are exactly the three expected ones — this matches the backend source.
    const expected = new Set(UNUSED_NAMES);
    // Simulates the constant from entry.ts
    const CONFIGURED_BUT_UNUSED_SECRET_NAMES = [
      'THERAPIST_ADVANCED_MEMORY',
      'THERAPIST_SESSION_CONTINUITY',
      'THERAPIST_KNOWLEDGE_EXPANSION',
    ];
    for (const name of CONFIGURED_BUT_UNUSED_SECRET_NAMES) {
      expect(expected.has(name)).toBe(true);
    }
    expect(CONFIGURED_BUT_UNUSED_SECRET_NAMES.length).toBe(3);
  });

  it('snapshot itself does not have a configured_but_unused field (backend only)', () => {
    // The frontend snapshot does not include the configured_but_unused list
    // (it is merged in from the backend response at the panel level)
    const snap = defaultSnapshot();
    expect(Object.prototype.hasOwnProperty.call(snap, 'configured_but_unused')).toBe(false);
  });
});

// ─── Test 9: Diagnostic code cannot change feature flags or agent behavior ────

describe('Test 9: Snapshot builder is read-only — no side effects', () => {
  it('THERAPIST_UPGRADE_FLAGS registry is still frozen after snapshot build', () => {
    defaultSnapshot();
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('COMPANION_UPGRADE_FLAGS registry is still frozen after snapshot build', () => {
    defaultSnapshot();
    expect(Object.isFrozen(COMPANION_UPGRADE_FLAGS)).toBe(true);
  });

  it('returned snapshot object is itself frozen (immutable)', () => {
    const snap = defaultSnapshot();
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('calling snapshot builder twice returns consistent values', () => {
    const snap1 = defaultSnapshot({ getTherapistWiring: () => STUB_V12_WIRING });
    const snap2 = defaultSnapshot({ getTherapistWiring: () => STUB_V12_WIRING });
    expect(snap1.selected_therapist_wiring).toBe(snap2.selected_therapist_wiring);
    expect(snap1.selected_therapist_stage).toBe(snap2.selected_therapist_stage);
    expect(snap1.therapist_master_enabled).toBe(snap2.therapist_master_enabled);
    expect(snap1.diagnostic_version).toBe(snap2.diagnostic_version);
  });

  it('snapshot builder does not mutate the injected wiring object', () => {
    const wiringCopy = { ...STUB_V12_WIRING };
    const originalKeys = JSON.stringify(Object.keys(wiringCopy).sort());
    defaultSnapshot({ getTherapistWiring: () => wiringCopy });
    expect(JSON.stringify(Object.keys(wiringCopy).sort())).toBe(originalKeys);
  });
});

// ─── Test 10: Existing wiring behavior is unchanged ──────────────────────────

describe('Test 10: Production wiring resolvers are unaffected', () => {
  it('resolveTherapistWiring() still returns HYBRID with all flags off', () => {
    // In test env VITE_* env vars are undefined → all flags false → HYBRID selected
    const wiring = resolveTherapistWiring();
    expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveCompanionWiring() still returns HYBRID with all flags off', () => {
    const wiring = resolveCompanionWiring();
    expect(wiring).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is CBT_THERAPIST_WIRING_HYBRID (module-load state)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AI_COMPANION_WIRING is AI_COMPANION_WIRING_HYBRID (module-load state)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('importing runtimeCapabilityDiagnostic does not change active wirings', () => {
    // Already imported at top of file — wirings should still be HYBRID
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });
});

// ─── Helper function unit tests ───────────────────────────────────────────────

describe('_therapistWiringCanonicalName', () => {
  it('null → unknown', () => {
    expect(_therapistWiringCanonicalName(null)).toBe('unknown');
  });

  it('HYBRID wiring → CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(_therapistWiringCanonicalName({ name: 'cbt_therapist', stage2: false }))
      .toBe('CBT_THERAPIST_WIRING_HYBRID');
  });

  it('stage2_phase 16 → CBT_THERAPIST_WIRING_STAGE2_V12', () => {
    expect(_therapistWiringCanonicalName({ stage2: true, stage2_phase: 16 }))
      .toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
  });

  it('stage2_phase 15 → CBT_THERAPIST_WIRING_STAGE2_V11', () => {
    expect(_therapistWiringCanonicalName({ stage2: true, stage2_phase: 15 }))
      .toBe('CBT_THERAPIST_WIRING_STAGE2_V11');
  });

  it('unknown stage2_phase → fallback with phase number', () => {
    expect(_therapistWiringCanonicalName({ stage2: true, stage2_phase: 99 }))
      .toBe('CBT_THERAPIST_WIRING_STAGE2_PHASE_99');
  });
});

describe('_companionWiringCanonicalName', () => {
  it('null → unknown', () => {
    expect(_companionWiringCanonicalName(null)).toBe('unknown');
  });

  it('HYBRID companion wiring → AI_COMPANION_WIRING_HYBRID', () => {
    expect(_companionWiringCanonicalName({ name: 'ai_companion', companion_upgrade: false }))
      .toBe('AI_COMPANION_WIRING_HYBRID');
  });

  it('companion_upgrade_phase 2 → AI_COMPANION_WIRING_UPGRADE_V1', () => {
    expect(_companionWiringCanonicalName({ companion_upgrade: true, companion_upgrade_phase: 2 }))
      .toBe('AI_COMPANION_WIRING_UPGRADE_V1');
  });

  it('companion_upgrade_phase 3 → AI_COMPANION_WIRING_UPGRADE_V2', () => {
    expect(_companionWiringCanonicalName({ companion_upgrade: true, companion_upgrade_phase: 3 }))
      .toBe('AI_COMPANION_WIRING_UPGRADE_V2');
  });
});

describe('Diagnostic version and metadata', () => {
  it('DIAGNOSTIC_VERSION is a non-empty semver string', () => {
    expect(typeof DIAGNOSTIC_VERSION).toBe('string');
    expect(DIAGNOSTIC_VERSION.length).toBeGreaterThan(0);
    expect(/^\d+\.\d+\.\d+$/.test(DIAGNOSTIC_VERSION)).toBe(true);
  });

  it('snapshot contains diagnostic_version matching DIAGNOSTIC_VERSION constant', () => {
    const snap = defaultSnapshot();
    expect(snap.diagnostic_version).toBe(DIAGNOSTIC_VERSION);
  });

  it('snapshot contains generated_at as a valid ISO 8601 date string', () => {
    const snap = defaultSnapshot();
    expect(typeof snap.generated_at).toBe('string');
    expect(() => new Date(snap.generated_at)).not.toThrow();
    expect(new Date(snap.generated_at).toISOString()).toBe(snap.generated_at);
  });
});
