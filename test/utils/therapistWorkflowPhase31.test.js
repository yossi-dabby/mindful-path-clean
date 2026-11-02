/**
 * @file test/utils/therapistWorkflowPhase31.test.js
 *
 * Phase 3.1 — Workflow Context Injector (real runtime injection)
 *
 * PURPOSE
 * -------
 * 1. Verify that workflowContextInjector.js exists and exports the required
 *    functions: getWorkflowContextForWiring and buildSessionStartContent.
 * 2. Verify that getWorkflowContextForWiring returns null (no injection) for
 *    all default-path wirings (HYBRID, V1, null, undefined).
 * 3. Verify that getWorkflowContextForWiring returns THERAPIST_WORKFLOW_INSTRUCTIONS
 *    for the V2 wiring (workflow_context_injection === true).
 * 4. Verify that buildSessionStartContent returns exactly '[START_SESSION]'
 *    for all default-path wirings — current behavior preserved.
 * 5. Verify that buildSessionStartContent returns content that includes both
 *    '[START_SESSION]' and the workflow instructions for the V2 wiring.
 * 6. Verify that the V2 session-start content is structurally different from
 *    the default session-start content — proof that the upgraded path now
 *    carries the workflow structure into the runtime therapist flow.
 * 7. Verify that the workflow instructions injected into V2 are the canonical
 *    THERAPIST_WORKFLOW_INSTRUCTIONS — not a stale copy or partial subset.
 * 8. Verify that V2 injection content includes all required workflow sections
 *    (ADAPTIVE RESPONSE FRAMEWORK, RESPONSE-SHAPING RULES, EMOTION DIFFERENTIATION).
 * 9. Verify that safety-profile routing (resolveTherapistWiring) is unchanged.
 * 10. Verify Phase 3 baselines are still intact (additive only).
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - Does NOT modify any Phase 0 / 0.1 / 1 / 2 / 3 test files.
 * - All Phase 0 / 0.1 / 1 / 2 / 3 assertions remain intact (additive only).
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 3.1
 */

import { describe, it, expect } from 'vitest';

import {
  getWorkflowContextForWiring,
  buildSessionStartContent,
} from '../../src/lib/workflowContextInjector.js';

import {
  THERAPIST_WORKFLOW_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
} from '../../src/api/agentWiring.js';

import {
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ─── Section 1 — Injector exports exist ──────────────────────────────────────

describe('Phase 3.1 — workflowContextInjector exports', () => {
  it('getWorkflowContextForWiring is exported as a function', () => {
    expect(typeof getWorkflowContextForWiring).toBe('function');
  });

  it('buildSessionStartContent is exported as a function', () => {
    expect(typeof buildSessionStartContent).toBe('function');
  });
});

// ─── Section 2 — Default path: no injection ──────────────────────────────────

describe('Phase 3.1 — Default path: getWorkflowContextForWiring returns null', () => {
  it('returns null for CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(getWorkflowContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('returns null for CBT_THERAPIST_WIRING_STAGE2_V1', () => {
    expect(getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V1)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getWorkflowContextForWiring(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getWorkflowContextForWiring(undefined)).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(getWorkflowContextForWiring({})).toBeNull();
  });

  it('returns null when workflow_context_injection is false', () => {
    expect(getWorkflowContextForWiring({ workflow_context_injection: false })).toBeNull();
  });
});

// ─── Section 3 — Upgraded path: injection is live ────────────────────────────

describe('Phase 3.1 — Upgraded V2 path: getWorkflowContextForWiring returns instructions', () => {
  it('returns a non-null value for CBT_THERAPIST_WIRING_STAGE2_V2', () => {
    expect(getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2)).not.toBeNull();
  });

  it('returns the canonical THERAPIST_WORKFLOW_INSTRUCTIONS for V2', () => {
    expect(getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2)).toBe(
      THERAPIST_WORKFLOW_INSTRUCTIONS,
    );
  });

  it('returns a non-empty string for V2', () => {
    const result = getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns the same result when workflow_context_injection is explicitly true', () => {
    const syntheticV2 = { workflow_context_injection: true };
    expect(getWorkflowContextForWiring(syntheticV2)).toBe(THERAPIST_WORKFLOW_INSTRUCTIONS);
  });
});

// ─── Section 4 — Default path: buildSessionStartContent unchanged ─────────────

describe('Phase 3.1 — Default path: buildSessionStartContent returns [START_SESSION]', () => {
  it('returns exactly "[START_SESSION]" for CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for CBT_THERAPIST_WIRING_STAGE2_V1', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for null input', () => {
    expect(buildSessionStartContent(null)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for undefined input', () => {
    expect(buildSessionStartContent(undefined)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for the resolved default wiring (all flags false)', () => {
    const defaultWiring = resolveTherapistWiring();
    expect(buildSessionStartContent(defaultWiring)).toBe('[START_SESSION]');
  });
});

// ─── Section 5 — Upgraded path: buildSessionStartContent carries workflow ─────

describe('Phase 3.1 — Upgraded V2 path: buildSessionStartContent includes workflow context', () => {
  const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);

  it('V2 content starts with "[START_SESSION]"', () => {
    expect(v2Content.startsWith('[START_SESSION]')).toBe(true);
  });

  it('V2 content is longer than the default "[START_SESSION]"', () => {
    expect(v2Content.length).toBeGreaterThan('[START_SESSION]'.length);
  });

  it('V2 content includes the workflow header sentinel', () => {
    expect(v2Content).toContain('=== UPGRADED THERAPIST WORKFLOW');
  });

  it('V2 content includes the workflow footer sentinel', () => {
    expect(v2Content).toContain('=== END UPGRADED THERAPIST WORKFLOW ===');
  });

  it('V2 content includes the ADAPTIVE RESPONSE FRAMEWORK section', () => {
    expect(v2Content).toContain('--- ADAPTIVE RESPONSE FRAMEWORK ---');
  });

  it('V2 content includes the RESPONSE-SHAPING RULES section', () => {
    expect(v2Content).toContain('--- RESPONSE-SHAPING RULES ---');
  });

  it('V2 content includes the EMOTION DIFFERENTIATION section', () => {
    expect(v2Content).toContain('--- EMOTION DIFFERENTIATION ---');
  });

  it('V2 content includes the canonical THERAPIST_WORKFLOW_INSTRUCTIONS verbatim', () => {
    expect(v2Content).toContain(THERAPIST_WORKFLOW_INSTRUCTIONS);
  });
});

// ─── Section 6 — Proof of effect: upgraded path differs from default ──────────

describe('Phase 3.1 — Proof of effect: V2 session-start differs from default', () => {
  it('V2 session-start content differs from HYBRID session-start content', () => {
    const defaultContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(v2Content).not.toBe(defaultContent);
  });

  it('V2 session-start content differs from V1 session-start content', () => {
    const v1Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1);
    const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(v2Content).not.toBe(v1Content);
  });

  it('default session-start content does not contain workflow instructions', () => {
    const defaultContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    expect(defaultContent).not.toContain('UPGRADED THERAPIST WORKFLOW');
  });

  it('V1 session-start content does not contain workflow instructions', () => {
    const v1Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1);
    expect(v1Content).not.toContain('UPGRADED THERAPIST WORKFLOW');
  });

  it('resolved default wiring session-start is identical to HYBRID content', () => {
    const defaultWiring = resolveTherapistWiring();
    const resolvedContent = buildSessionStartContent(defaultWiring);
    const hybridContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    expect(resolvedContent).toBe(hybridContent);
  });
});

// ─── Section 7 — Injection content quality ───────────────────────────────────

describe('Phase 3.1 — Injected content quality checks', () => {
  const injected = getWorkflowContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2);

  it('injected content includes all 6 workflow steps by name', () => {
    const REQUIRED_STEP_NAMES = [
      'brief_validation',
      'organize_the_problem',
      'map_the_current_cycle',
      'identify_intervention_point',
      'focused_intervention',
      'concrete_next_step',
    ];
    for (const name of REQUIRED_STEP_NAMES) {
      expect(injected).toContain(name);
    }
  });

  it('injected content includes safety stack compatibility rule', () => {
    expect(injected).toContain('Safety stack compatibility');
  });

  it('injected content includes all required emotion differentiation labels', () => {
    const REQUIRED_EMOTIONS = ['remorse', 'guilt', 'shame', 'self-attack', 'despair', 'collapse language'];
    for (const emotion of REQUIRED_EMOTIONS) {
      expect(injected).toContain(emotion);
    }
  });

  it('injected content is identical to THERAPIST_WORKFLOW_INSTRUCTIONS (not a partial copy)', () => {
    expect(injected).toBe(THERAPIST_WORKFLOW_INSTRUCTIONS);
  });
});

// ─── Section 8 — Safety-profile routing unchanged ────────────────────────────

describe('Phase 3.1 — Safety-profile routing remains unchanged', () => {
  it('resolveTherapistWiring() still returns HYBRID when all flags are false', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('HYBRID wiring does not have workflow_context_injection', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.workflow_context_injection).toBeUndefined();
  });

  it('V2 wiring has workflow_context_injection: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.workflow_context_injection).toBe(true);
  });

  it('V1 wiring does not have workflow_context_injection', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V1.workflow_context_injection).toBeUndefined();
  });
});

// ─── Section 9 — Phase 3 baselines still intact ──────────────────────────────

describe('Phase 3.1 — Phase 3 baselines are preserved (additive only)', () => {
  it('THERAPIST_WORKFLOW_INSTRUCTIONS is a non-empty string', () => {
    expect(typeof THERAPIST_WORKFLOW_INSTRUCTIONS).toBe('string');
    expect(THERAPIST_WORKFLOW_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('V2 wiring has workflow_engine_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.workflow_engine_enabled).toBe(true);
  });

  it('V2 wiring has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.stage2).toBe(true);
  });

  it('V2 wiring has memory_context_injection: true (carry-forward from V1)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V2.memory_context_injection).toBe(true);
  });
});
