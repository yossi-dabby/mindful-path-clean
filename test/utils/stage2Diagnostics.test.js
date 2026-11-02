/**
 * @file test/utils/stage2Diagnostics.test.js
 *
 * Stage 2 Diagnostic Surface — Verification Tests
 *
 * PURPOSE
 * -------
 * Verifies the temporary, preview-only diagnostic surface added to
 * featureFlags.js to make Stage 2 flag evaluation observable at runtime on
 * Base44 preview without changing any Stage 2 behavior.
 *
 * WHAT THIS FILE TESTS
 * --------------------
 * Section 1  — Default: no window → getStage2DiagnosticPayload returns null
 * Section 2  — Window present but no _s2debug=true → returns null (fail-closed)
 * Section 3  — _s2debug=true present → payload is returned
 * Section 4  — Payload field correctness (hostname, search, flags, routeHint)
 * Section 5  — Gate works on any host (not restricted to preview hosts)
 * Section 6  — logStage2Diagnostics is a no-op by default; writes to console when active
 *
 * WHAT THIS FILE DOES NOT TEST
 * ----------------------------
 * - Any Stage 2 routing or upgrade logic (unchanged)
 * - Any UI rendering
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  THERAPIST_UPGRADE_FLAGS,
  V10_KNOWLEDGE_PRODUCTION_HOST,
  getStage2DiagnosticPayload,
  logStage2Diagnostics,
} from '../../src/lib/featureFlags.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Stubs window.location with the given search string and hostname for the
 * duration of a test.
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

describe('Stage 2 Diagnostics — no window (Node/SSR env)', () => {
  it('returns null when window is absent', () => {
    expect(getStage2DiagnosticPayload()).toBeNull();
  });

  it('logStage2Diagnostics is a no-op when window is absent', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    logStage2Diagnostics();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Section 2 — Window present but _s2debug not set: returns null ────────────

describe('Stage 2 Diagnostics — window present, _s2debug gate inactive', () => {
  it('returns null when search is empty', () => {
    withWindow('', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
  });

  it('returns null when URL has unrelated query params only', () => {
    withWindow('?foo=bar&baz=1', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
  });

  it('returns null when _s2debug is present but not "true"', () => {
    withWindow('?_s2debug=1', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
    withWindow('?_s2debug=yes', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
    withWindow('?_s2debug=', () => {
      expect(getStage2DiagnosticPayload()).toBeNull();
    });
  });

  it('logStage2Diagnostics does not write to console when gate is inactive', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
    withWindow('?foo=bar', () => {
      logStage2Diagnostics();
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Section 3 — _s2debug=true present: payload is returned ──────────────────

describe('Stage 2 Diagnostics — _s2debug=true activates the diagnostic', () => {
  it('returns a non-null payload when _s2debug=true is present', () => {
    withWindow('?_s2debug=true', () => {
      expect(getStage2DiagnosticPayload()).not.toBeNull();
    });
  });

  it('returns a non-null payload when _s2debug=true is combined with other params', () => {
    withWindow('?_s2debug=true&foo=bar', () => {
      expect(getStage2DiagnosticPayload()).not.toBeNull();
    });
  });

  it('returns a non-null payload when _s2debug=true is combined with _s2 override flags', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      expect(getStage2DiagnosticPayload()).not.toBeNull();
    });
  });

  it('logStage2Diagnostics writes to console.group when _s2debug=true', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    withWindow('?_s2debug=true', () => {
      logStage2Diagnostics();
    });
    expect(groupSpy).toHaveBeenCalledOnce();
    expect(groupEndSpy).toHaveBeenCalledOnce();
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
    console.log.mockRestore?.();
  });
});

// ─── Section 4 — Payload field correctness ───────────────────────────────────

describe('Stage 2 Diagnostics — payload field correctness', () => {
  it('reports the exact V10-only route on the pinned Base44 Production host', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.isPreviewStagingHost).toBe(false);
      expect(p.parsedS2Flags).toEqual([]);
      expect(p.masterGateOn).toBe(true);
      expect(p.routeHint).toBe('STAGE2_V10 (knowledge retrieval)');
      expect(p.computedFlags.THERAPIST_UPGRADE_ENABLED).toBe(true);
      expect(p.computedFlags.THERAPIST_UPGRADE_STRATEGY_ENABLED).toBe(true);
      expect(p.computedFlags.THERAPIST_UPGRADE_LONGITUDINAL_ENABLED).toBe(true);
      expect(p.computedFlags.THERAPIST_UPGRADE_KNOWLEDGE_ENABLED).toBe(true);
      expect(p.computedFlags.THERAPIST_UPGRADE_COMPETENCE_ENABLED).toBe(false);
      expect(p.computedFlags.THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED).toBe(false);
    }, V10_KNOWLEDGE_PRODUCTION_HOST);
  });

  it('hostname reflects window.location.hostname', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.hostname).toBe('localhost');
    }, 'localhost');
  });

  it('search reflects window.location.search', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.search).toBe('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED');
    });
  });

  it('isPreviewStagingHost is true for localhost', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.isPreviewStagingHost).toBe(true);
    }, 'localhost');
  });

  it('isPreviewStagingHost is true for an exact configured preview host', () => {
    vi.stubEnv('VITE_STAGE2_RUNTIME_OVERRIDE_HOSTS', 'myapp.base44.app');
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.isPreviewStagingHost).toBe(true);
    }, 'myapp.base44.app');
  });

  it('isPreviewStagingHost is false for a production-looking host', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.isPreviewStagingHost).toBe(false);
    }, 'app.myproduct.com');
  });

  it('parsedS2Flags is an empty array when _s2 is absent', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.parsedS2Flags).toEqual([]);
    });
  });

  it('parsedS2Flags lists the flag names present in _s2', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.parsedS2Flags).toContain('THERAPIST_UPGRADE_ENABLED');
      expect(p.parsedS2Flags).toContain('THERAPIST_UPGRADE_MEMORY_ENABLED');
    });
  });

  it('computedFlags contains every Stage 2 flag key', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
        expect(p.computedFlags).toHaveProperty(flagName);
      }
    });
  });

  it('computedFlags reports false for all flags by default (no _s2, no env vars)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      for (const [name, value] of Object.entries(p.computedFlags)) {
        expect(value, `computedFlags.${name} must be false by default`).toBe(false);
      }
    });
  });

  it('computedFlags reports true for THERAPIST_UPGRADE_ENABLED when it is in _s2', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.computedFlags['THERAPIST_UPGRADE_ENABLED']).toBe(true);
    });
  });

  it('masterGateOn is false by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.masterGateOn).toBe(false);
    });
  });

  it('masterGateOn is true when THERAPIST_UPGRADE_ENABLED is in _s2', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.masterGateOn).toBe(true);
    });
  });

  it('routeHint is HYBRID when master gate is off', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.routeHint).toContain('HYBRID');
      expect(p.routeHint).toContain('master gate off');
    });
  });

  it('routeHint is HYBRID (master on, no phase flag matched) when master is on but no phase flag', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.routeHint).toContain('HYBRID');
      expect(p.routeHint).toContain('no phase flag');
    });
  });

  it('routeHint is STAGE2_V1 when memory flag is in _s2 with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED',
      () => {
        const p = getStage2DiagnosticPayload();
        expect(p.routeHint).toContain('STAGE2_V1');
      },
    );
  });

  it('routeHint is STAGE2_V2 when workflow flag is in _s2 with master', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_WORKFLOW_ENABLED',
      () => {
        const p = getStage2DiagnosticPayload();
        expect(p.routeHint).toContain('STAGE2_V2');
      },
    );
  });

  it('routeHint is STAGE2_V5 when safety mode flag is in _s2 with master', () => {
    const allHighFlags = [
      'THERAPIST_UPGRADE_ENABLED',
      'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
    ].join(',');
    withWindow(`?_s2debug=true&_s2=${allHighFlags}`, () => {
      const p = getStage2DiagnosticPayload();
      expect(p.routeHint).toContain('STAGE2_V5');
    });
  });
});

// ─── Section 5 — Gate works on any host ──────────────────────────────────────

describe('Stage 2 Diagnostics — _s2debug gate is host-agnostic', () => {
  it('returns a payload on a production-looking host when _s2debug=true', () => {
    // Diagnostics are informational only — they do not change routing.
    // The whole point is to observe what hostname the frontend sees, so
    // the gate must NOT be restricted to preview hosts.
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).not.toBeNull();
      expect(p.hostname).toBe('app.myproduct.com');
      expect(p.isPreviewStagingHost).toBe(false);
    }, 'app.myproduct.com');
  });

  it('on a production host, computedFlags are all false (no _s2 override)', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      for (const [name, value] of Object.entries(p.computedFlags)) {
        expect(value, `${name} must be false on production host without _s2`).toBe(false);
      }
    }, 'app.myproduct.com');
  });

  it('on a production host, _s2 flags in the URL still show in parsedS2Flags', () => {
    // parsedS2Flags reports what the URL contains — not what was accepted.
    // computedFlags will still be false because the host is production.
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p.parsedS2Flags).toContain('THERAPIST_UPGRADE_ENABLED');
      // But the computed flag is false because the host is not a preview host.
      expect(p.computedFlags['THERAPIST_UPGRADE_ENABLED']).toBe(false);
    }, 'app.myproduct.com');
  });

  it('returns a payload on an unknown host — aids in diagnosing Base44 host detection', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).not.toBeNull();
      expect(p.hostname).toBe('unknown-preview-host.example.io');
      expect(p.isPreviewStagingHost).toBe(false);
    }, 'unknown-preview-host.example.io');
  });
});

// ─── Section 6 — getStage2DiagnosticPayload does not change flag state ────────

describe('Stage 2 Diagnostics — diagnostic does not mutate flag state', () => {
  it('THERAPIST_UPGRADE_FLAGS remains frozen after getStage2DiagnosticPayload()', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      getStage2DiagnosticPayload();
      expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
    });
  });

  it('THERAPIST_UPGRADE_FLAGS values remain false even when diagnostic payload is active', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED', () => {
      getStage2DiagnosticPayload();
      // The build-time flag must still be false — only isUpgradeEnabled() is true.
      expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
    });
  });
});
