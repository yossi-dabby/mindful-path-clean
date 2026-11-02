/**
 * @file test/utils/productionPhase1Verification.test.js
 *
 * Production AI Phase 1 — Wiring Verification
 *
 * PURPOSE
 * -------
 * Verifies that Phase 1 (Structured Memory Layer) behaves correctly and safely
 * when activated via environment variables:
 *   VITE_THERAPIST_UPGRADE_ENABLED=true
 *   VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true
 *
 * This test is the authoritative verification that:
 *   A. resolveTherapistWiring() selects CBT_THERAPIST_WIRING_STAGE2_V1
 *      (and only V1) when exactly the two Phase 1 flags are enabled.
 *   B. Session-start content for V1 is exactly '[START_SESSION]' — the same
 *      as HYBRID.  No additional frontend injection occurs for Phase 1; memory
 *      operations are handled server-side via Deno functions.
 *   C. V1 tool_configs (entity list) are identical to HYBRID — no new entity
 *      access is introduced.
 *   D. V1 is correctly superseded by V2/V3/V4/V5 when higher phase flags are
 *      also on (priority chain is enforced).
 *   E. Rollback is instant: disabling either Phase 1 flag restores HYBRID.
 *   F. The default path (all flags off) remains completely unchanged.
 *
 * APPROACH
 * --------
 * Flag-on state is simulated via the staging-only URL override (_s2 query
 * parameter) combined with vi.stubGlobal('window', ...) on a recognised
 * preview/staging host (localhost).  This is the same approach used in
 * stage2RuntimeOverride.test.js.
 *
 * All tests are deterministic.  No live LLM calls, network requests, or
 * Base44 SDK calls are made.
 *
 * WHAT THIS FILE DOES NOT TEST
 * ----------------------------
 * - Server-side Deno functions (writeTherapistMemory / retrieveTherapistMemory)
 *   — those are tested separately and run in the Deno runtime.
 * - E2E conversation flow — verified by Playwright specs.
 * - Build-time env var propagation — verified separately in the CI pipeline.
 *
 * Source of truth: problem_statement — Production AI Phase 1 verification task
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

import {
  resolveTherapistWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
} from '../../src/api/agentWiring.js';

import {
  buildSessionStartContent,
  getWorkflowContextForWiring,
} from '../../src/lib/workflowContextInjector.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stubs window.location with the given search string on localhost, runs fn,
 * then cleans up.  Mirrors the pattern used in stage2RuntimeOverride.test.js.
 */
function withWindowSearch(search, fn, hostname = 'localhost') {
  vi.stubGlobal('window', { location: { search, hostname } });
  try {
    return fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

/** URL param that enables both Phase 1 flags on a preview/staging host. */
const PHASE1_S2_PARAM =
  '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED';

/** URL param that enables master gate only (no per-phase flag). */
const MASTER_ONLY_S2_PARAM = '?_s2=THERAPIST_UPGRADE_ENABLED';

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Section 1 — Phase 1 flags enable V1 wiring resolution ───────────────────

describe('Phase 1 Production — resolveTherapistWiring() selects V1 when flags are on', () => {
  it('returns CBT_THERAPIST_WIRING_STAGE2_V1 when both Phase 1 flags are enabled', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
    });
  });

  it('returns V1 (not HYBRID) when both Phase 1 flags are enabled', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring).not.toBe(CBT_THERAPIST_WIRING_HYBRID);
    });
  });

  it('V1 resolved wiring has name "cbt_therapist"', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring.name).toBe('cbt_therapist');
    });
  });

  it('V1 resolved wiring has stage2: true', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring.stage2).toBe(true);
    });
  });

  it('V1 resolved wiring has stage2_phase: 1', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring.stage2_phase).toBe(1);
    });
  });

  it('V1 resolved wiring has memory_context_injection: true', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring.memory_context_injection).toBe(true);
    });
  });

  it('V1 resolved wiring has a non-empty tool_configs array', () => {
    withWindowSearch(PHASE1_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(Array.isArray(wiring.tool_configs)).toBe(true);
      expect(wiring.tool_configs.length).toBeGreaterThan(0);
    });
  });
});

// ─── Section 2 — V1 entity list unchanged from HYBRID (no new entity access) ──

describe('Phase 1 Production — V1 entity list is identical to HYBRID', () => {
  it('V1 has the same number of tool_configs as HYBRID', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.tool_configs.length).toBe(
      CBT_THERAPIST_WIRING_HYBRID.tool_configs.length,
    );
  });

  it('every entity in HYBRID tool_configs also appears in V1 tool_configs', () => {
    const v1Names = new Set(
      CBT_THERAPIST_WIRING_STAGE2_V1.tool_configs.map((c) => c.entity_name),
    );
    const missing = CBT_THERAPIST_WIRING_HYBRID.tool_configs
      .filter((c) => !v1Names.has(c.entity_name))
      .map((c) => c.entity_name);
    expect(missing).toEqual([]);
  });

  it('V1 does not introduce any new entity not already in HYBRID', () => {
    const hybridNames = new Set(
      CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((c) => c.entity_name),
    );
    const added = CBT_THERAPIST_WIRING_STAGE2_V1.tool_configs
      .filter((c) => !hybridNames.has(c.entity_name))
      .map((c) => c.entity_name);
    // Must be empty: Phase 1 introduces no new entity access
    expect(added).toEqual([]);
  });
});

// ─── Section 3 — Session-start content stability for V1 ──────────────────────

describe('Phase 1 Production — session-start content for V1 is [START_SESSION]', () => {
  it('buildSessionStartContent(V1) returns exactly "[START_SESSION]"', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1)).toBe('[START_SESSION]');
  });

  it('V1 session-start content is identical to HYBRID session-start content', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1)).toBe(
      buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID),
    );
  });

  it('V1 does not inject workflow instructions (workflow_context_injection is absent)', () => {
    expect(getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V1)).toBeNull();
  });

  it('V1 wiring has no workflow_context_injection flag (Phase 1 is isolated from Phase 3)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.workflow_context_injection).not.toBe(true);
  });

  it('V1 wiring has no retrieval_orchestration_enabled flag (Phase 1 is isolated from Phase 5)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.retrieval_orchestration_enabled).not.toBe(true);
  });

  it('V1 wiring has no live_retrieval_enabled flag (Phase 1 is isolated from Phase 6)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.live_retrieval_enabled).not.toBe(true);
  });

  it('V1 wiring has no safety_mode_enabled flag (Phase 1 is isolated from Phase 7)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.safety_mode_enabled).not.toBe(true);
  });
});

// ─── Section 4 — Wiring priority chain: V1 is superseded by higher phases ────

describe('Phase 1 Production — V1 is superseded by higher phase flags when on', () => {
  it('resolveTherapistWiring() returns V2 (not V1) when Phase 3 flag is also on', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,THERAPIST_UPGRADE_WORKFLOW_ENABLED',
      () => {
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V2);
        expect(wiring).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });

  it('resolveTherapistWiring() returns V3 (not V1) when Phase 5 flag is also on', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,' +
        'THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
      () => {
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V3);
        expect(wiring).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });

  it('resolveTherapistWiring() returns V4 (not V1) when Phase 6 flag is also on', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,' +
        'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
      () => {
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V4);
        expect(wiring).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });

  it('resolveTherapistWiring() returns V5 (not V1) when Phase 7 flag is also on', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,' +
        'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
      () => {
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V5);
        expect(wiring).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });
});

// ─── Section 5 — Rollback guarantee ──────────────────────────────────────────

describe('Phase 1 Production — rollback restores HYBRID instantly', () => {
  it('returns HYBRID when master gate is on but MEMORY flag is off', () => {
    withWindowSearch(MASTER_ONLY_S2_PARAM, () => {
      const wiring = resolveTherapistWiring();
      expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
    });
  });

  it('returns HYBRID when only MEMORY flag is on but master gate is off', () => {
    // MEMORY flag alone cannot enable Phase 1 — master gate must also be on
    withWindowSearch('?_s2=THERAPIST_UPGRADE_MEMORY_ENABLED', () => {
      const wiring = resolveTherapistWiring();
      expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
    });
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_MEMORY_ENABLED") is false when master gate is off', () => {
    withWindowSearch('?_s2=THERAPIST_UPGRADE_MEMORY_ENABLED', () => {
      expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
    });
  });
});

// ─── Section 6 — Default path preservation (all flags off) ───────────────────

describe('Phase 1 Production — default path is unchanged when flags are off', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is CBT_THERAPIST_WIRING_HYBRID in default (flag-off) mode', () => {
    // ACTIVE_CBT_THERAPIST_WIRING is computed at module load time.
    // In the test environment all flags are false, so it must be HYBRID.
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring() returns HYBRID with no window override', () => {
    // No window stub → URL override returns {} → master gate is off → HYBRID
    const wiring = resolveTherapistWiring();
    expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('THERAPIST_UPGRADE_MEMORY_ENABLED is false in default mode', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED is false in default mode', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_MEMORY_ENABLED") is false in default mode', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
  });

  it('buildSessionStartContent(HYBRID) remains "[START_SESSION]" (no Phase 1 side-effects)', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID)).toBe('[START_SESSION]');
  });
});

// ─── Section 7 — Phase 1 flag isolation from other phases ────────────────────

describe('Phase 1 Production — flag isolation: only MEMORY flag reaches V1', () => {
  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED does not affect V1 routing', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,' +
        'THERAPIST_UPGRADE_SUMMARIZATION_ENABLED',
      () => {
        // Summarization flag is Phase 2 — it has no routing effect on V1 path.
        // V2 flag is NOT set, so we stay at V1.
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });

  it('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED does not affect V1 routing', () => {
    withWindowSearch(
      '?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED,' +
        'THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED',
      () => {
        // Trusted ingestion flag is Phase 4 — it has no routing effect.
        // V3 flag is NOT set, so we stay at V1.
        const wiring = resolveTherapistWiring();
        expect(wiring).toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
      },
    );
  });
});
