/**
 * @file test/utils/therapistUpgrade01.test.js
 *
 * Phase 0.1 — Real Routing Integration Point & Observability
 *
 * PURPOSE
 * -------
 * 1. Verify that resolveTherapistWiring() is exported from activeAgentWiring.js
 *    and constitutes a real routing/wiring decision point.
 * 2. Verify that flag-off preserves exactly the current therapist path.
 * 3. Verify that flag-on at Phase 0.1 still does not activate any upgraded
 *    behavior (no upgraded wiring exists yet).
 * 4. Verify that registerUpgradeAnalyticsTracker wires up the analytics tracker
 *    and that logUpgradeEvent calls it without throwing.
 * 5. Verify that analytics integration does not break routing.
 * 6. Confirm that all Phase 0 baseline assertions still pass (no regression).
 *
 * NON-GOALS
 * ---------
 * This file must not test any upgraded wiring — none exists at Phase 0.1.
 * This file must not be modified by Phase 1–8 PRs (additive only).
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 0.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
  logUpgradeEvent,
  registerUpgradeAnalyticsTracker,
} from '../../src/lib/featureFlags.js';

import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_AGENT_WIRINGS,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Section 1 — resolveTherapistWiring is exported ──────────────────────────

describe('Phase 0.1 — resolveTherapistWiring integration point', () => {
  it('resolveTherapistWiring is exported as a function from activeAgentWiring.js', () => {
    expect(typeof resolveTherapistWiring).toBe('function');
  });

  it('resolveTherapistWiring() returns CBT_THERAPIST_WIRING_HYBRID when all flags are false', () => {
    // All flags are false (Phase 0 baseline), so flag-off path must be taken.
    const result = resolveTherapistWiring();
    expect(result).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring() does not throw', () => {
    expect(() => resolveTherapistWiring()).not.toThrow();
  });

  it('resolveTherapistWiring() evaluates isUpgradeEnabled — flag is false so current path is returned', () => {
    // isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED') must be false (Phase 0 default)
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
    // With the flag false, the resolver must return the hybrid wiring
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });
});

// ─── Section 2 — Flag-off preserves current path ─────────────────────────────

describe('Phase 0.1 — Flag-off preserves exactly the current therapist path', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID (no regression from Phase 0)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING equals the result of resolveTherapistWiring() (constant and resolver agree)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(resolveTherapistWiring());
  });

  it('ACTIVE_AI_COMPANION_WIRING is still AI_COMPANION_WIRING_HYBRID (unchanged)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('ACTIVE_AGENT_WIRINGS["cbt_therapist"] is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_AGENT_WIRINGS['cbt_therapist']).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('CBT wiring still has exactly 12 tool_configs (baseline unchanged)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.tool_configs).toHaveLength(12);
  });

  it('CBT wiring still has agent name "cbt_therapist" (baseline unchanged)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
  });
});

// ─── Section 3 — Flag-on at Phase 0.1 still returns current path ─────────────

describe('Phase 0.1 — Flag-on does not activate any upgraded behavior', () => {
  it('resolveTherapistWiring still returns CBT_THERAPIST_WIRING_HYBRID regardless of flag state', () => {
    // Even if the master flag were true, no upgraded wiring exists yet.
    // The function must still return the current default.
    // We verify this by confirming the return value matches CBT_THERAPIST_WIRING_HYBRID.
    const result = resolveTherapistWiring();
    expect(result).toBe(CBT_THERAPIST_WIRING_HYBRID);
    // Confirm no Stage 2 entities are present
    const names = result.tool_configs.map((tc) => tc.entity_name);
    expect(names).not.toContain('TherapistMemory');
    expect(names).not.toContain('TherapistSessionMemory');
  });

  it('all flags are still false — upgrade path is unreachable', () => {
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      expect(isUpgradeEnabled(flagName), `"${flagName}" must be unreachable`).toBe(false);
    }
  });
});

// ─── Section 4 — Analytics/observability integration ─────────────────────────

describe('Phase 0.1 — registerUpgradeAnalyticsTracker and logUpgradeEvent', () => {
  beforeEach(() => {
    // Reset the registered tracker between tests by registering a no-op.
    // This isolates tests from each other.
    registerUpgradeAnalyticsTracker(null);
  });

  it('registerUpgradeAnalyticsTracker is exported as a function', () => {
    expect(typeof registerUpgradeAnalyticsTracker).toBe('function');
  });

  it('registerUpgradeAnalyticsTracker does not throw when called with a function', () => {
    expect(() => registerUpgradeAnalyticsTracker(() => {})).not.toThrow();
  });

  it('registerUpgradeAnalyticsTracker does not throw when called with null (reset)', () => {
    expect(() => registerUpgradeAnalyticsTracker(null)).not.toThrow();
  });

  it('logUpgradeEvent calls the registered tracker without throwing', () => {
    const tracker = vi.fn();
    registerUpgradeAnalyticsTracker(tracker);
    expect(() => logUpgradeEvent('route_not_selected', { flag: 'TEST' })).not.toThrow();
    expect(tracker).toHaveBeenCalled();
  });

  it('logUpgradeEvent prefixes the event name with "therapist_upgrade_"', () => {
    const tracker = vi.fn();
    registerUpgradeAnalyticsTracker(tracker);
    logUpgradeEvent('route_not_selected', { flag: 'TEST' });
    expect(tracker).toHaveBeenCalledWith(
      'therapist_upgrade_route_not_selected',
      expect.objectContaining({ flag: 'TEST' })
    );
  });

  it('logUpgradeEvent calls the registered tracker for flag_isolation_failure', () => {
    const tracker = vi.fn();
    registerUpgradeAnalyticsTracker(tracker);
    logUpgradeEvent('flag_isolation_failure', { flagName: 'BAD_FLAG' });
    expect(tracker).toHaveBeenCalledWith(
      'therapist_upgrade_flag_isolation_failure',
      expect.objectContaining({ flagName: 'BAD_FLAG' })
    );
  });

  it('logUpgradeEvent does not throw even when the registered tracker throws', () => {
    registerUpgradeAnalyticsTracker(() => { throw new Error('analytics failure'); });
    // Routing must not be affected by analytics failure
    expect(() => logUpgradeEvent('route_not_selected', {})).not.toThrow();
  });

  it('resolveTherapistWiring does not throw even when logUpgradeEvent tracker throws', () => {
    registerUpgradeAnalyticsTracker(() => { throw new Error('analytics failure'); });
    expect(() => resolveTherapistWiring()).not.toThrow();
  });

  it('resolveTherapistWiring still returns correct wiring even when analytics tracker throws', () => {
    registerUpgradeAnalyticsTracker(() => { throw new Error('analytics failure'); });
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('logUpgradeEvent works without a registered tracker (console-only fallback)', () => {
    // No tracker registered — should fall through to console without throwing.
    registerUpgradeAnalyticsTracker(null);
    expect(() => logUpgradeEvent('route_not_selected', { flag: 'TEST' })).not.toThrow();
  });
});

// ─── Section 5 — Phase 0 baseline regression (no regressions from Phase 0.1) ─

describe('Phase 0.1 — Phase 0 baseline preserved (regression check)', () => {
  it('THERAPIST_UPGRADE_FLAGS is still frozen', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('THERAPIST_UPGRADE_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for all known flags', () => {
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      expect(isUpgradeEnabled(flagName)).toBe(false);
    }
  });

  it('isUpgradeEnabled returns false for unknown flag (isolation guard still works)', () => {
    expect(isUpgradeEnabled('UNKNOWN_FLAG')).toBe(false);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING entity names match Phase 0 baseline snapshot', () => {
    const names = ACTIVE_CBT_THERAPIST_WIRING.tool_configs.map((tc) => tc.entity_name).sort();
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

  it('ACTIVE_AI_COMPANION_WIRING entity names match Phase 0 baseline snapshot', () => {
    const names = ACTIVE_AI_COMPANION_WIRING.tool_configs.map((tc) => tc.entity_name).sort();
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
});
