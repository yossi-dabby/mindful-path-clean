/**
 * @file test/utils/superCbtAgent.test.js
 *
 * SuperCbtAgent — Scaffold Tests
 *
 * PURPOSE
 * -------
 * Verifies that the SuperCbtAgent scaffold module:
 *   1. Exports all required constants with correct shapes and values.
 *   2. Composes CBT_THERAPIST_WIRING_STAGE2_V5 correctly without mutation.
 *   3. Is completely inert — not referenced by activeAgentWiring.js.
 *   4. Does not affect any existing feature flag, wiring, or routing.
 *   5. Does not alter the default active therapist path.
 *
 * APPROACH
 * --------
 * All tests are deterministic and synchronous.  No live LLM calls, network
 * requests, or Base44 SDK calls are made.  The scaffold is verified by
 * inspecting exported values only.
 *
 * Source of truth: docs/super-agent/README.md
 */

import { describe, it, expect } from 'vitest';

// ── SuperCbtAgent scaffold ────────────────────────────────────────────────────
import {
  SUPER_CBT_AGENT_VERSION,
  SUPER_CBT_AGENT_NAME,
  SUPER_CBT_AGENT_PHASE,
  SUPER_CBT_AGENT_LANGUAGES,
  SUPER_CBT_AGENT_FEATURES,
  SUPER_CBT_AGENT_WIRING,
} from '../../src/lib/superCbtAgent.js';

// ── Existing wiring (to verify no mutation) ───────────────────────────────────
import {
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ── Active routing (to verify super agent is NOT wired) ───────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_AGENT_WIRINGS,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ── Feature flags (to verify all remain false) ────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ─── Section 1 — Module exports exist ────────────────────────────────────────

describe('SuperCbtAgent scaffold — exports exist', () => {
  it('SUPER_CBT_AGENT_VERSION is exported', () => {
    expect(SUPER_CBT_AGENT_VERSION).toBeDefined();
  });

  it('SUPER_CBT_AGENT_NAME is exported', () => {
    expect(SUPER_CBT_AGENT_NAME).toBeDefined();
  });

  it('SUPER_CBT_AGENT_PHASE is exported', () => {
    expect(SUPER_CBT_AGENT_PHASE).toBeDefined();
  });

  it('SUPER_CBT_AGENT_LANGUAGES is exported', () => {
    expect(SUPER_CBT_AGENT_LANGUAGES).toBeDefined();
  });

  it('SUPER_CBT_AGENT_FEATURES is exported', () => {
    expect(SUPER_CBT_AGENT_FEATURES).toBeDefined();
  });

  it('SUPER_CBT_AGENT_WIRING is exported', () => {
    expect(SUPER_CBT_AGENT_WIRING).toBeDefined();
  });
});

// ─── Section 2 — Version and identity ────────────────────────────────────────

describe('SuperCbtAgent scaffold — version and identity', () => {
  it('SUPER_CBT_AGENT_VERSION is a non-empty string', () => {
    expect(typeof SUPER_CBT_AGENT_VERSION).toBe('string');
    expect(SUPER_CBT_AGENT_VERSION.length).toBeGreaterThan(0);
  });

  it('SUPER_CBT_AGENT_VERSION matches semver pattern', () => {
    expect(SUPER_CBT_AGENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('SUPER_CBT_AGENT_NAME is "cbt_therapist"', () => {
    expect(SUPER_CBT_AGENT_NAME).toBe('cbt_therapist');
  });

  it('SUPER_CBT_AGENT_PHASE starts with "super."', () => {
    expect(SUPER_CBT_AGENT_PHASE).toMatch(/^super\./);
  });
});

// ─── Section 3 — Languages ────────────────────────────────────────────────────

describe('SuperCbtAgent scaffold — supported languages', () => {
  it('SUPER_CBT_AGENT_LANGUAGES is a frozen array', () => {
    expect(Array.isArray(SUPER_CBT_AGENT_LANGUAGES)).toBe(true);
    expect(Object.isFrozen(SUPER_CBT_AGENT_LANGUAGES)).toBe(true);
  });

  it('SUPER_CBT_AGENT_LANGUAGES contains all 7 app languages', () => {
    expect(SUPER_CBT_AGENT_LANGUAGES).toHaveLength(7);
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('en');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('he');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('es');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('fr');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('de');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('it');
    expect(SUPER_CBT_AGENT_LANGUAGES).toContain('pt');
  });
});

// ─── Section 4 — Feature descriptor ──────────────────────────────────────────

describe('SuperCbtAgent scaffold — feature descriptor shape', () => {
  it('SUPER_CBT_AGENT_FEATURES is a frozen object', () => {
    expect(typeof SUPER_CBT_AGENT_FEATURES).toBe('object');
    expect(Object.isFrozen(SUPER_CBT_AGENT_FEATURES)).toBe(true);
  });

  it('SUPER_CBT_AGENT_FEATURES has multilingual_cbt capability', () => {
    expect(SUPER_CBT_AGENT_FEATURES.multilingual_cbt).toBeDefined();
    expect(SUPER_CBT_AGENT_FEATURES.multilingual_cbt.status).toBe('planned');
    expect(Array.isArray(SUPER_CBT_AGENT_FEATURES.multilingual_cbt.languages)).toBe(true);
    expect(SUPER_CBT_AGENT_FEATURES.multilingual_cbt.languages).toHaveLength(7);
  });

  it('SUPER_CBT_AGENT_FEATURES has protocol_selection capability', () => {
    expect(SUPER_CBT_AGENT_FEATURES.protocol_selection).toBeDefined();
    expect(SUPER_CBT_AGENT_FEATURES.protocol_selection.status).toBe('planned');
  });

  it('SUPER_CBT_AGENT_FEATURES has cross_session_continuity capability', () => {
    expect(SUPER_CBT_AGENT_FEATURES.cross_session_continuity).toBeDefined();
    expect(SUPER_CBT_AGENT_FEATURES.cross_session_continuity.status).toBe('planned');
  });

  it('SUPER_CBT_AGENT_FEATURES has advanced_workflow_orchestration capability', () => {
    expect(SUPER_CBT_AGENT_FEATURES.advanced_workflow_orchestration).toBeDefined();
    expect(SUPER_CBT_AGENT_FEATURES.advanced_workflow_orchestration.status).toBe('planned');
  });

  it('all SUPER_CBT_AGENT_FEATURES entries have a description string', () => {
    for (const [key, feature] of Object.entries(SUPER_CBT_AGENT_FEATURES)) {
      expect(
        typeof feature.description,
        `Feature "${key}" must have a description string`
      ).toBe('string');
      expect(
        feature.description.length,
        `Feature "${key}" description must be non-empty`
      ).toBeGreaterThan(0);
    }
  });
});

// ─── Section 5 — Wiring composition ──────────────────────────────────────────

describe('SuperCbtAgent scaffold — wiring composition from V5', () => {
  it('SUPER_CBT_AGENT_WIRING is a non-null object', () => {
    expect(typeof SUPER_CBT_AGENT_WIRING).toBe('object');
    expect(SUPER_CBT_AGENT_WIRING).not.toBeNull();
  });

  it('SUPER_CBT_AGENT_WIRING is a different object from CBT_THERAPIST_WIRING_STAGE2_V5', () => {
    expect(SUPER_CBT_AGENT_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V5);
  });

  it('SUPER_CBT_AGENT_WIRING inherits agent name "cbt_therapist" from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.name).toBe('cbt_therapist');
  });

  it('SUPER_CBT_AGENT_WIRING inherits stage2: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.stage2).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits memory_context_injection: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.memory_context_injection).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits workflow_engine_enabled: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.workflow_engine_enabled).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits retrieval_orchestration_enabled: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.retrieval_orchestration_enabled).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits live_retrieval_enabled: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.live_retrieval_enabled).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits safety_mode_enabled: true from V5', () => {
    expect(SUPER_CBT_AGENT_WIRING.safety_mode_enabled).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING inherits tool_configs array from V5', () => {
    expect(Array.isArray(SUPER_CBT_AGENT_WIRING.tool_configs)).toBe(true);
    expect(SUPER_CBT_AGENT_WIRING.tool_configs).toBe(CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs);
  });

  it('SUPER_CBT_AGENT_WIRING has super_agent: true', () => {
    expect(SUPER_CBT_AGENT_WIRING.super_agent).toBe(true);
  });

  it('SUPER_CBT_AGENT_WIRING has super_agent_phase matching SUPER_CBT_AGENT_PHASE', () => {
    expect(SUPER_CBT_AGENT_WIRING.super_agent_phase).toBe(SUPER_CBT_AGENT_PHASE);
  });

  it('SUPER_CBT_AGENT_WIRING has super_agent_version matching SUPER_CBT_AGENT_VERSION', () => {
    expect(SUPER_CBT_AGENT_WIRING.super_agent_version).toBe(SUPER_CBT_AGENT_VERSION);
  });
});

// ─── Section 6 — Planned capabilities are all false (scaffold state) ──────────

describe('SuperCbtAgent scaffold — planned capabilities default to false', () => {
  it('multilingual_context_enabled is false (not yet activated)', () => {
    expect(SUPER_CBT_AGENT_WIRING.multilingual_context_enabled).toBe(false);
  });

  it('protocol_selection_enabled is false (not yet activated)', () => {
    expect(SUPER_CBT_AGENT_WIRING.protocol_selection_enabled).toBe(false);
  });

  it('cross_session_continuity_enabled is false (not yet activated)', () => {
    expect(SUPER_CBT_AGENT_WIRING.cross_session_continuity_enabled).toBe(false);
  });
});

// ─── Section 7 — V5 is not mutated ───────────────────────────────────────────

describe('SuperCbtAgent scaffold — V5 wiring is not mutated', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V5 does not have super_agent field', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.super_agent).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V5 does not have super_agent_phase field', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.super_agent_phase).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V5 does not have super_agent_version field', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.super_agent_version).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V5 does not have multilingual_context_enabled field', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.multilingual_context_enabled).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V5 name is still "cbt_therapist"', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.name).toBe('cbt_therapist');
  });
});

// ─── Section 8 — Super agent is NOT in active routing ─────────────────────────

describe('SuperCbtAgent scaffold — not wired into active routing', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is not SUPER_CBT_AGENT_WIRING', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(SUPER_CBT_AGENT_WIRING);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have super_agent: true', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.super_agent).not.toBe(true);
  });

  it('ACTIVE_AGENT_WIRINGS["cbt_therapist"] is not SUPER_CBT_AGENT_WIRING', () => {
    expect(ACTIVE_AGENT_WIRINGS['cbt_therapist']).not.toBe(SUPER_CBT_AGENT_WIRING);
  });

  it('resolveTherapistWiring() does not return SUPER_CBT_AGENT_WIRING', () => {
    expect(resolveTherapistWiring()).not.toBe(SUPER_CBT_AGENT_WIRING);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is CBT_THERAPIST_WIRING_HYBRID (default path)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });
});

// ─── Section 9 — All feature flags remain false ───────────────────────────────

describe('SuperCbtAgent scaffold — feature flags unchanged', () => {
  it('THERAPIST_UPGRADE_FLAGS is still frozen', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('all Stage 2 flags are still false after scaffold import', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });

  it('isUpgradeEnabled returns false for all flags after scaffold import', () => {
    for (const flag of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      if (flag === 'THERAPIST_UPGRADE_ENABLED') continue;
      expect(isUpgradeEnabled(flag), `isUpgradeEnabled("${flag}") must still be false`).toBe(false);
    }
  });

  it('THERAPIST_UPGRADE_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });
});

// ─── Section 10 — Default active companion wiring is unchanged ────────────────

describe('SuperCbtAgent scaffold — AI Companion default path unchanged', () => {
  it('ACTIVE_AI_COMPANION_WIRING is defined', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBeDefined();
  });

  it('ACTIVE_AI_COMPANION_WIRING does not have super_agent: true', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.super_agent).not.toBe(true);
  });
});
