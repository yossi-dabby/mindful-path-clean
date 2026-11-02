/**
 * @file test/utils/phase4ActivationDiagnostics.test.js
 *
 * Phase 4 Production Evaluation — Unified Activation Diagnostics Test Suite
 *
 * PURPOSE
 * -------
 * Verifies getActivationDiagnostics() and logActivationDiagnostics() in
 * featureFlags.js.  These functions provide a single QA checkpoint for the
 * full upgrade activation state of both the Therapist and the AI Companion,
 * covering all 13 upgrade flags in one call.
 *
 * WHAT THIS FILE TESTS
 * --------------------
 * Section 1  — Default: no window → returns null (SSR/Node safety)
 * Section 2  — Window present, ?_s2debug absent → returns null (fail-closed)
 * Section 3  — ?_s2debug=true activates the diagnostic
 * Section 4  — Therapist section: flag resolution, routeHint coverage
 * Section 5  — Companion section: flag resolution, routeHint coverage
 * Section 6  — Role isolation: therapist flags never bleed into companion section
 * Section 7  — Role isolation: companion flags never bleed into therapist section
 * Section 8  — Payload safety: no private user data, no routing side-effects
 * Section 9  — logActivationDiagnostics: console behaviour
 * Section 10 — snapshotTimestamp is a valid ISO string
 * Section 11 — No production-default behavior change (all flags off)
 *
 * WHAT THIS FILE DOES NOT TEST
 * ----------------------------
 * - Any Stage 2 routing or upgrade logic (covered by existing test suites)
 * - Any UI rendering
 * - getStage2DiagnosticPayload / logStage2Diagnostics (covered by stage2Diagnostics.test.js)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  THERAPIST_UPGRADE_FLAGS,
  COMPANION_UPGRADE_FLAGS,
  getActivationDiagnostics,
  logActivationDiagnostics,
} from '../../src/lib/featureFlags.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Stubs window.location for the duration of the callback, then restores.
 */
function withWindow(search, fn, hostname = 'localhost') {
  vi.stubGlobal('window', {
    location: { search, hostname },
  });
  try {
    return fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ─── Section 1 — No window: returns null ─────────────────────────────────────

describe('Phase 4 Diagnostics — no window (Node/SSR env)', () => {
  it('getActivationDiagnostics returns null when window is absent', () => {
    expect(getActivationDiagnostics()).toBeNull();
  });

  it('logActivationDiagnostics is a no-op when window is absent', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    logActivationDiagnostics();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Section 2 — Gate inactive: returns null ─────────────────────────────────

describe('Phase 4 Diagnostics — gate inactive (_s2debug absent or not "true")', () => {
  it('returns null when search is empty', () => {
    withWindow('', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
  });

  it('returns null when URL has unrelated query params only', () => {
    withWindow('?foo=bar&baz=1', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
  });

  it('returns null when _s2debug is present but not "true"', () => {
    withWindow('?_s2debug=1', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
    withWindow('?_s2debug=yes', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
    withWindow('?_s2debug=', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
  });

  it('logActivationDiagnostics does not write to console when gate is inactive', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    withWindow('?foo=bar', () => {
      logActivationDiagnostics();
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Section 3 — Gate active: returns a non-null payload ─────────────────────

describe('Phase 4 Diagnostics — _s2debug=true activates the diagnostic', () => {
  it('returns a non-null payload when _s2debug=true is present', () => {
    withWindow('?_s2debug=true', () => {
      expect(getActivationDiagnostics()).not.toBeNull();
    });
  });

  it('returns a non-null payload when _s2debug=true is combined with other params', () => {
    withWindow('?_s2debug=true&foo=bar', () => {
      expect(getActivationDiagnostics()).not.toBeNull();
    });
  });

  it('returns a non-null payload when combined with _s2 therapist override flags', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      expect(getActivationDiagnostics()).not.toBeNull();
    });
  });

  it('returns a non-null payload when combined with _c2 companion override flags', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED', () => {
      expect(getActivationDiagnostics()).not.toBeNull();
    });
  });

  it('payload has therapist and companion sections', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p).toHaveProperty('therapist');
      expect(p).toHaveProperty('companion');
    });
  });

  it('payload has top-level hostname, search, isPreviewStagingHost, snapshotTimestamp', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p).toHaveProperty('hostname');
      expect(p).toHaveProperty('search');
      expect(p).toHaveProperty('isPreviewStagingHost');
      expect(p).toHaveProperty('snapshotTimestamp');
    });
  });
});

// ─── Section 4 — Therapist section ───────────────────────────────────────────

describe('Phase 4 Diagnostics — therapist section', () => {
  it('therapist.computedFlags contains every THERAPIST_UPGRADE_FLAGS key', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
        expect(p.therapist.computedFlags).toHaveProperty(flagName);
      }
    });
  });

  it('therapist.computedFlags values are all false by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const [name, value] of Object.entries(p.therapist.computedFlags)) {
        expect(value, `therapist.computedFlags.${name} must be false by default`).toBe(false);
      }
    });
  });

  it('therapist.masterGateOn is false by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.masterGateOn).toBe(false);
    });
  });

  it('therapist.routeHint is HYBRID (master gate off) by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.routeHint).toContain('HYBRID');
      expect(p.therapist.routeHint).toContain('master gate off');
    });
  });

  it('therapist.parsedS2Flags is empty when _s2 is absent', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.parsedS2Flags).toEqual([]);
    });
  });

  it('therapist.parsedS2Flags lists the names from _s2', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.parsedS2Flags).toContain('THERAPIST_UPGRADE_ENABLED');
      expect(p.therapist.parsedS2Flags).toContain('THERAPIST_UPGRADE_MEMORY_ENABLED');
    });
  });

  it('therapist.masterGateOn becomes true when THERAPIST_UPGRADE_ENABLED is in _s2', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.masterGateOn).toBe(true);
    });
  });

  it('routeHint is HYBRID (master on, no phase flag) when only master flag is on', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.routeHint).toContain('HYBRID');
      expect(p.therapist.routeHint).toContain('no phase flag');
    });
  });

  it('routeHint is STAGE2_V1 when memory flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V1');
      },
    );
  });

  it('routeHint is STAGE2_V2 when workflow flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_WORKFLOW_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V2');
      },
    );
  });

  it('routeHint is STAGE2_V3 when retrieval orchestration flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V3');
      },
    );
  });

  it('routeHint is STAGE2_V4 when allowlist wrapper flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V4');
      },
    );
  });

  it('routeHint is STAGE2_V5 when safety mode flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V5');
      },
    );
  });

  it('routeHint is STAGE2_V6 when formulation context flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V6');
      },
    );
  });

  it('routeHint is STAGE2_V7 when continuity flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_CONTINUITY_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.therapist.routeHint).toContain('STAGE2_V7');
      },
    );
  });

  it('routeHint is STAGE2_V7 (highest precedence) when continuity and lower flags are on', () => {
    const flags = [
      'THERAPIST_UPGRADE_ENABLED',
      'THERAPIST_UPGRADE_CONTINUITY_ENABLED',
      'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
      'THERAPIST_UPGRADE_MEMORY_ENABLED',
    ].join(',');
    withWindow(`?_s2debug=true&_s2=${flags}`, () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.routeHint).toContain('STAGE2_V7');
    });
  });
});

// ─── Section 5 — Companion section ───────────────────────────────────────────

describe('Phase 4 Diagnostics — companion section', () => {
  it('companion.computedFlags contains every COMPANION_UPGRADE_FLAGS key', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const flagName of Object.keys(COMPANION_UPGRADE_FLAGS)) {
        expect(p.companion.computedFlags).toHaveProperty(flagName);
      }
    });
  });

  it('companion.computedFlags values are all false by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const [name, value] of Object.entries(p.companion.computedFlags)) {
        expect(value, `companion.computedFlags.${name} must be false by default`).toBe(false);
      }
    });
  });

  it('companion.masterGateOn is false by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.masterGateOn).toBe(false);
    });
  });

  it('companion.routeHint is HYBRID (master gate off) by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.routeHint).toContain('HYBRID');
      expect(p.companion.routeHint).toContain('master gate off');
    });
  });

  it('companion.parsedC2Flags is empty when _c2 is absent', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.parsedC2Flags).toEqual([]);
    });
  });

  it('companion.parsedC2Flags lists the names from _c2', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_WARMTH_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.parsedC2Flags).toContain('COMPANION_UPGRADE_ENABLED');
      expect(p.companion.parsedC2Flags).toContain('COMPANION_UPGRADE_WARMTH_ENABLED');
    });
  });

  it('companion.masterGateOn becomes true when COMPANION_UPGRADE_ENABLED is in _c2', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.masterGateOn).toBe(true);
    });
  });

  it('companion.routeHint is HYBRID (master on, no phase flag) when only master is on', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.routeHint).toContain('HYBRID');
      expect(p.companion.routeHint).toContain('no phase flag');
    });
  });

  it('companion.routeHint is UPGRADE_V1 when warmth flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_WARMTH_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.companion.routeHint).toContain('UPGRADE_V1');
      },
    );
  });

  it('companion.routeHint is UPGRADE_V2 when continuity flag is on with master', () => {
    withWindow(
      '?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_CONTINUITY_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.companion.routeHint).toContain('UPGRADE_V2');
      },
    );
  });

  it('companion.routeHint is UPGRADE_V2 (highest precedence) when continuity and warmth are on', () => {
    withWindow(
      '?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_CONTINUITY_ENABLED,COMPANION_UPGRADE_WARMTH_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p.companion.routeHint).toContain('UPGRADE_V2');
      },
    );
  });
});

// ─── Section 6 — Role isolation: therapist flags never bleed into companion ───

describe('Phase 4 Diagnostics — role isolation (therapist → companion)', () => {
  it('companion.computedFlags has no THERAPIST_UPGRADE_* keys', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const key of Object.keys(p.companion.computedFlags)) {
        expect(key.startsWith('THERAPIST_'), `key "${key}" must not be a therapist flag`).toBe(false);
      }
    });
  });

  it('enabling therapist flags does not affect companion.masterGateOn', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.masterGateOn).toBe(false);
    });
  });

  it('enabling therapist flags does not affect companion.routeHint', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.routeHint).toContain('HYBRID');
      expect(p.companion.routeHint).toContain('master gate off');
    });
  });

  it('companion.parsedC2Flags is empty even when _s2 therapist flags are present', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.companion.parsedC2Flags).toEqual([]);
    });
  });
});

// ─── Section 7 — Role isolation: companion flags never bleed into therapist ───

describe('Phase 4 Diagnostics — role isolation (companion → therapist)', () => {
  it('therapist.computedFlags has no COMPANION_UPGRADE_* keys', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const key of Object.keys(p.therapist.computedFlags)) {
        expect(key.startsWith('COMPANION_'), `key "${key}" must not be a companion flag`).toBe(false);
      }
    });
  });

  it('enabling companion flags does not affect therapist.masterGateOn', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_CONTINUITY_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.masterGateOn).toBe(false);
    });
  });

  it('enabling companion flags does not affect therapist.routeHint', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED,COMPANION_UPGRADE_CONTINUITY_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.routeHint).toContain('HYBRID');
      expect(p.therapist.routeHint).toContain('master gate off');
    });
  });

  it('therapist.parsedS2Flags is empty even when _c2 companion flags are present', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.parsedS2Flags).toEqual([]);
    });
  });
});

// ─── Section 8 — Payload safety ──────────────────────────────────────────────

describe('Phase 4 Diagnostics — payload safety', () => {
  it('payload does not contain any property named after private user entities', () => {
    const PRIVATE_ENTITIES = [
      'ThoughtJournal', 'Conversation', 'CaseFormulation',
      'MoodEntry', 'CompanionMemory', 'UserDeletedConversations',
    ];
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      const payloadStr = JSON.stringify(p);
      for (const entity of PRIVATE_ENTITIES) {
        expect(payloadStr, `payload must not reference ${entity}`).not.toContain(entity);
      }
    });
  });

  it('calling getActivationDiagnostics does not mutate THERAPIST_UPGRADE_FLAGS', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      getActivationDiagnostics();
      expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
      expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
    });
  });

  it('calling getActivationDiagnostics does not mutate COMPANION_UPGRADE_FLAGS', () => {
    withWindow('?_s2debug=true&_c2=COMPANION_UPGRADE_ENABLED', () => {
      getActivationDiagnostics();
      expect(Object.isFrozen(COMPANION_UPGRADE_FLAGS)).toBe(true);
      expect(COMPANION_UPGRADE_FLAGS.COMPANION_UPGRADE_ENABLED).toBe(false);
    });
  });

  it('getActivationDiagnostics does not throw on any host', () => {
    ['localhost', '127.0.0.1', 'myapp.base44.app', 'app.myproduct.com'].forEach(hostname => {
      expect(() => {
        withWindow('?_s2debug=true', () => getActivationDiagnostics(), hostname);
      }).not.toThrow();
    });
  });

  it('isPreviewStagingHost is true for recognised staging hosts', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.isPreviewStagingHost).toBe(true);
    }, 'localhost');
    vi.stubEnv('VITE_STAGE2_RUNTIME_OVERRIDE_HOSTS', 'myapp.base44.app');
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.isPreviewStagingHost).toBe(true);
    }, 'myapp.base44.app');
  });

  it('isPreviewStagingHost is false for production-looking hosts', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.isPreviewStagingHost).toBe(false);
    }, 'app.myproduct.com');
  });
});

// ─── Section 9 — logActivationDiagnostics console behaviour ──────────────────

describe('Phase 4 Diagnostics — logActivationDiagnostics console output', () => {
  it('writes to console.group when _s2debug=true', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    withWindow('?_s2debug=true', () => {
      logActivationDiagnostics();
    });
    expect(groupSpy).toHaveBeenCalled();
    expect(groupEndSpy).toHaveBeenCalled();
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
    console.log.mockRestore?.();
  });

  it('opens a group labeled [Activation Diagnostics]', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    withWindow('?_s2debug=true', () => {
      logActivationDiagnostics();
    });
    const labels = groupSpy.mock.calls.map(c => c[0]);
    expect(labels.some(l => l.includes('Activation Diagnostics'))).toBe(true);
    groupSpy.mockRestore();
    console.groupEnd.mockRestore?.();
    console.log.mockRestore?.();
  });

  it('does not throw when the diagnostic returns null', () => {
    // No window → diagnostic returns null → logActivationDiagnostics should be a no-op.
    expect(() => logActivationDiagnostics()).not.toThrow();
  });

  it('opens sub-groups for Therapist and Companion', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    withWindow('?_s2debug=true', () => {
      logActivationDiagnostics();
    });
    const labels = groupSpy.mock.calls.map(c => c[0]);
    expect(labels.some(l => l.includes('Therapist'))).toBe(true);
    expect(labels.some(l => l.includes('Companion'))).toBe(true);
    groupSpy.mockRestore();
    console.groupEnd.mockRestore?.();
    console.log.mockRestore?.();
  });
});

// ─── Section 10 — snapshotTimestamp ──────────────────────────────────────────

describe('Phase 4 Diagnostics — snapshotTimestamp', () => {
  it('snapshotTimestamp is a non-empty string', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(typeof p.snapshotTimestamp).toBe('string');
      expect(p.snapshotTimestamp.length).toBeGreaterThan(0);
    });
  });

  it('snapshotTimestamp is a valid ISO 8601 datetime string', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      const d = new Date(p.snapshotTimestamp);
      expect(isNaN(d.getTime())).toBe(false);
    });
  });
});

// ─── Section 11 — No production-default behavior change ──────────────────────

describe('Phase 4 Diagnostics — production-default behavior unchanged', () => {
  it('all therapist computed flags are false with no overrides (production default)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const [name, value] of Object.entries(p.therapist.computedFlags)) {
        expect(value, `therapist.${name} must be false in production-default state`).toBe(false);
      }
    });
  });

  it('all companion computed flags are false with no overrides (production default)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      for (const [name, value] of Object.entries(p.companion.computedFlags)) {
        expect(value, `companion.${name} must be false in production-default state`).toBe(false);
      }
    });
  });

  it('both agents route to HYBRID in production-default state', () => {
    withWindow('?_s2debug=true', () => {
      const p = getActivationDiagnostics();
      expect(p.therapist.routeHint).toContain('HYBRID');
      expect(p.companion.routeHint).toContain('HYBRID');
    });
  });

  it('gate returns null (no-op) when ?_s2debug is absent — no diagnostic overhead in production', () => {
    withWindow('?foo=bar', () => {
      expect(getActivationDiagnostics()).toBeNull();
    });
  });
});
