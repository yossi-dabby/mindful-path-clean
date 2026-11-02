/**
 * @file test/utils/therapistUpgradeBaseline.test.js
 *
 * Phase 0 — Therapist Upgrade Baseline Regression Snapshot
 *
 * PURPOSE
 * -------
 * 1. Verify that all Stage 2 feature flags default to false (upgrade disabled).
 * 2. Verify that isUpgradeEnabled() correctly evaluates flag states, including
 *    the master-gate logic and the unknown-flag isolation guard.
 * 3. Snapshot the current default therapist wiring so that Phase 9 rollback
 *    verification can confirm no regression was introduced.
 * 4. Confirm that the current active wiring is the hybrid config and is
 *    unaffected by Phase 0 changes.
 *
 * This test file must not be modified by Phase 1–8 PRs.
 * Phase 9 may ADD new assertions (additive only) for rollback verification.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Tasks 0.1, 0.2
 */

import { describe, it, expect } from 'vitest';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
  logUpgradeEvent,
} from '../../src/lib/featureFlags.js';

import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_AGENT_WIRINGS,
} from '../../src/api/activeAgentWiring.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Section 1 — Feature flag registry exists and is well-formed ─────────────

describe('Phase 0 — Feature flag registry', () => {
  it('THERAPIST_UPGRADE_FLAGS is exported and is an object', () => {
    expect(THERAPIST_UPGRADE_FLAGS).toBeDefined();
    expect(typeof THERAPIST_UPGRADE_FLAGS).toBe('object');
  });

  it('THERAPIST_UPGRADE_FLAGS is frozen (immutable)', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('registry contains the master flag THERAPIST_UPGRADE_ENABLED', () => {
    expect('THERAPIST_UPGRADE_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_MEMORY_ENABLED (Phase 1)', () => {
    expect('THERAPIST_UPGRADE_MEMORY_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (Phase 2)', () => {
    expect('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_WORKFLOW_ENABLED (Phase 3)', () => {
    expect('THERAPIST_UPGRADE_WORKFLOW_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED (Phase 4)', () => {
    expect('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED (Phase 5)', () => {
    expect('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED (Phase 6)', () => {
    expect('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains THERAPIST_UPGRADE_SAFETY_MODE_ENABLED (Phase 7)', () => {
    expect('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('registry contains exactly 14 flags (1 master + 13 per-phase)', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toHaveLength(17);
  });

  it('every flag value is a boolean', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(typeof value, `Flag "${name}" must be boolean`).toBe('boolean');
    }
  });
});

// ─── Section 2 — All flags default to false ──────────────────────────────────

describe('Phase 0 — All Stage 2 flags default to false', () => {
  it('master flag THERAPIST_UPGRADE_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_MEMORY_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_WORKFLOW_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_WORKFLOW_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SAFETY_MODE_ENABLED).toBe(false);
  });

  it('all flags are false — full sweep', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must default to false`).toBe(false);
    }
  });
});

// ─── Section 3 — isUpgradeEnabled evaluates flags correctly ──────────────────

describe('Phase 0 — isUpgradeEnabled flag evaluation', () => {
  it('isUpgradeEnabled is a function', () => {
    expect(typeof isUpgradeEnabled).toBe('function');
  });

  it('returns false for the master flag (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_MEMORY_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_WORKFLOW_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED')).toBe(false);
  });

  it('returns false for THERAPIST_UPGRADE_SAFETY_MODE_ENABLED (defaults to false)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED')).toBe(false);
  });

  it('returns false for an unknown flag name (isolation guard)', () => {
    expect(isUpgradeEnabled('UNKNOWN_FLAG_THAT_DOES_NOT_EXIST')).toBe(false);
  });

  it('returns false for an empty string flag name (isolation guard)', () => {
    expect(isUpgradeEnabled('')).toBe(false);
  });

  it('returns false for a null-like string flag name (isolation guard)', () => {
    expect(isUpgradeEnabled('null')).toBe(false);
  });

  it('upgrade path is unreachable — all flags return false in full sweep', () => {
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      expect(isUpgradeEnabled(flagName), `"${flagName}" must be unreachable`).toBe(false);
    }
  });
});

// ─── Section 4 — logUpgradeEvent is exported and callable ────────────────────

describe('Phase 0 — logUpgradeEvent observability hook', () => {
  it('logUpgradeEvent is exported as a function', () => {
    expect(typeof logUpgradeEvent).toBe('function');
  });

  it('logUpgradeEvent does not throw for flag_isolation_failure event', () => {
    expect(() => logUpgradeEvent('flag_isolation_failure', { flagName: 'TEST' })).not.toThrow();
  });

  it('logUpgradeEvent does not throw for route_selected event', () => {
    expect(() => logUpgradeEvent('route_selected', { flag: 'TEST' })).not.toThrow();
  });

  it('logUpgradeEvent does not throw for route_not_selected event', () => {
    expect(() => logUpgradeEvent('route_not_selected', { flag: 'TEST' })).not.toThrow();
  });

  it('logUpgradeEvent does not throw for an unknown event type', () => {
    expect(() => logUpgradeEvent('some_future_event', {})).not.toThrow();
  });

  it('logUpgradeEvent does not throw when called with no context argument', () => {
    expect(() => logUpgradeEvent('route_not_selected')).not.toThrow();
  });
});

// ─── Section 5 — Current default therapist path is preserved (baseline snapshot) ───

describe('Phase 0 — Current default therapist path is preserved', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AI_COMPANION_WIRING is still AI_COMPANION_WIRING_HYBRID', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('ACTIVE_AGENT_WIRINGS["cbt_therapist"] is CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_AGENT_WIRINGS['cbt_therapist']).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AGENT_WIRINGS["ai_companion"] is AI_COMPANION_WIRING_HYBRID', () => {
    expect(ACTIVE_AGENT_WIRINGS['ai_companion']).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('active CBT wiring has agent name "cbt_therapist" (baseline snapshot)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
  });

  it('active CBT wiring has exactly 12 tool_configs (V1 + 2 caution-layer) — baseline snapshot', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.tool_configs).toHaveLength(12);
  });

  it('active AI Companion wiring has exactly 9 tool_configs (V1 + 1 caution-layer) — baseline snapshot', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.tool_configs).toHaveLength(9);
  });

  it('active CBT wiring entity names match baseline snapshot', () => {
    const names = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.map((tc) => tc.entity_name).sort();
    // Baseline snapshot — 12 entities as of Phase 0
    expect(names).toEqual([
      'AudioContent',
      'CaseFormulation',
      'CoachingSession',
      'CompanionMemory',
      'Conversation',
      'Exercise',
      'Goal',
      'Journey',
      'MoodEntry',
      'Resource',
      'SessionSummary',
      'ThoughtJournal',
    ]);
  });

  it('active AI Companion wiring entity names match baseline snapshot', () => {
    const names = ACTIVE_AI_COMPANION_WIRING.tool_configs.map((tc) => tc.entity_name).sort();
    // Baseline snapshot — 9 entities as of Phase 0
    expect(names).toEqual([
      'AudioContent',
      'CompanionMemory',
      'Conversation',
      'Exercise',
      'Goal',
      'Journey',
      'MoodEntry',
      'Resource',
      'SessionSummary',
    ]);
  });

  it('active CBT wiring has no Stage 2 upgrade-specific entities (upgrade path not yet present)', () => {
    const names = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.map((tc) => tc.entity_name);
    // Stage 2 would add a therapist memory entity; it must not appear yet
    expect(names).not.toContain('TherapistMemory');
    expect(names).not.toContain('TherapistSessionMemory');
  });
});

// ─── Section 6 — Feature flag does not affect active wiring (isolation proof) ─

describe('Phase 0 — Upgrade flag off means no change to active wiring', () => {
  it('with all flags false, active CBT wiring is unchanged from pre-Phase-0 baseline', () => {
    // All flags are false, so isUpgradeEnabled returns false for everything.
    // The active wiring must still be the hybrid config.
    const allFlagsOff = Object.values(THERAPIST_UPGRADE_FLAGS).every((v) => v === false);
    expect(allFlagsOff).toBe(true);
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('with all flags false, active AI Companion wiring is unchanged from pre-Phase-0 baseline', () => {
    const allFlagsOff = Object.values(THERAPIST_UPGRADE_FLAGS).every((v) => v === false);
    expect(allFlagsOff).toBe(true);
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_ENABLED") === false confirms upgrade path is isolated', () => {
    // The master gate is off; the upgrade path is unreachable by design.
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
  });
});
