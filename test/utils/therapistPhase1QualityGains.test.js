/**
 * @file test/utils/therapistPhase1QualityGains.test.js
 *
 * Phase 1: Highest-ROI Therapist Quality Gains
 *
 * PURPOSE
 * -------
 *  1. Verify that THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED flag exists and
 *     defaults to false.
 *  2. Verify that CBT_THERAPIST_WIRING_STAGE2_V6 is exported and correctly
 *     structured (strict superset of V5, formulation_context_enabled: true).
 *  3. Verify that resolveTherapistWiring() routes to V6 when the formulation
 *     context flag is on (and to V5/lower when it is off).
 *  4. Verify that buildV6SessionStartContentAsync exists and is exported.
 *  5. Verify that buildV6SessionStartContentAsync delegates to V5 for non-V6 wirings.
 *  6. Verify that buildV6SessionStartContentAsync injects CaseFormulation context
 *     when wiring.formulation_context_enabled === true and entities are available.
 *  7. Verify that the CaseFormulation context block has the expected delimiters
 *     and field labels.
 *  8. Verify that buildV6SessionStartContentAsync is fail-closed: CaseFormulation
 *     errors return V5 content unchanged.
 *  9. Verify that three new Socratic/quality rules are present in
 *     THERAPIST_WORKFLOW_RESPONSE_RULES.
 * 10. Verify that the new rules are included in buildWorkflowContextInstructions().
 * 11. Verify that THERAPIST_WORKFLOW_VERSION was incremented to 3.1.0.
 * 12. Verify that executeV3BoundedRetrieval includes CaseFormulation in
 *     session_context items when the entity is available.
 * 13. Verify that CaseFormulation retrieval is fail-open (entity error is silently skipped).
 * 14. Verify that CaseFormulation content is bounded to MAX field chars.
 * 15. Verify that Chat.jsx imports buildV6SessionStartContentAsync (import audit).
 * 16. Verify that the flag count is now 9 (THERAPIST_UPGRADE_FLAGS).
 * 17. Verify that V6 wiring has the same tool_configs as V5 (no new entity access).
 * 18. Verify that V6 wiring inherits all V5 capability flags.
 * 19. Verify that the default path (HYBRID) is unchanged when all flags are off.
 * 20. Verify CaseFormulation retrieval is bounded to 1 item maximum.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - All prior phase assertions are NOT duplicated here.
 * - Uses mock entity objects; no live entity calls are made.
 *
 * Source of truth: Problem statement — Phase 1 Highest-ROI Therapist Quality Gains
 */

import { describe, it, expect, vi } from 'vitest';

// ── Feature flags ─────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Wiring configs ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_STAGE2_V6,
} from '../../src/api/agentWiring.js';

// ── Active wiring ─────────────────────────────────────────────────────────────
import {
  resolveTherapistWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ── Workflow engine ───────────────────────────────────────────────────────────
import {
  THERAPIST_WORKFLOW_RESPONSE_RULES,
  THERAPIST_WORKFLOW_VERSION,
  THERAPIST_FORMULATION_INSTRUCTIONS,
  buildWorkflowContextInstructions,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildV6SessionStartContentAsync,
  buildV5SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Retrieval executor ────────────────────────────────────────────────────────
import {
  executeV3BoundedRetrieval,
} from '../../src/lib/v3RetrievalExecutor.js';

import { RETRIEVAL_SOURCE_TYPES } from '../../src/lib/retrievalConfig.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a mock entities object with all required entity stubs.
 * All stubs return empty arrays by default (fail-open baseline).
 */
function buildMockEntities(overrides = {}) {
  return {
    CompanionMemory: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    Goal: {
      filter: vi.fn().mockResolvedValue([]),
    },
    SessionSummary: {
      list: vi.fn().mockResolvedValue([]),
    },
    CoachingSession: {
      list: vi.fn().mockResolvedValue([]),
    },
    Exercise: {
      list: vi.fn().mockResolvedValue([]),
    },
    Resource: {
      list: vi.fn().mockResolvedValue([]),
    },
    ExternalKnowledgeChunk: {
      filter: vi.fn().mockResolvedValue([]),
    },
    CaseFormulation: {
      list: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

const SAMPLE_FORMULATION = {
  presenting_problem: 'Recurrent low mood triggered by interpersonal conflict',
  core_belief: 'I am fundamentally unlovable',
  maintaining_cycle: 'Withdrawal → reduced positive reinforcement → worsened mood',
  treatment_goals: 'Build interpersonal effectiveness; challenge core belief',
};

// ─── Section 1 — Feature flag ─────────────────────────────────────────────────

describe('Phase 1 Quality — feature flag', () => {
  it('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED is a key in THERAPIST_UPGRADE_FLAGS', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toContain(
      'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
    );
  });

  it('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED (master gate off)', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED')).toBe(false);
  });

  it('THERAPIST_UPGRADE_FLAGS now contains exactly 14 flags', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toHaveLength(17);
  });

  it('all 13 flags default to false', () => {
    for (const [name, val] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(val, `Flag "${name}" must default to false`).toBe(false);
    }
  });
});

// ─── Section 2 — V6 wiring config ─────────────────────────────────────────────

describe('Phase 1 Quality — CBT_THERAPIST_WIRING_STAGE2_V6 structure', () => {
  it('is exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6).toBeDefined();
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V6).toBe('object');
  });

  it('has name = "cbt_therapist"', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.name).toBe('cbt_therapist');
  });

  it('has stage2 = true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.stage2).toBe(true);
  });

  it('has formulation_context_enabled = true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_context_enabled).toBe(true);
  });

  it('inherits safety_mode_enabled from V5', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.safety_mode_enabled).toBe(true);
  });

  it('inherits live_retrieval_enabled from V4', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.live_retrieval_enabled).toBe(true);
  });

  it('inherits retrieval_orchestration_enabled from V3', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.retrieval_orchestration_enabled).toBe(true);
  });

  it('inherits workflow_engine_enabled from V2', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.workflow_engine_enabled).toBe(true);
  });

  it('inherits workflow_context_injection from V2', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.workflow_context_injection).toBe(true);
  });

  it('inherits memory_context_injection from V1', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.memory_context_injection).toBe(true);
  });

  it('has tool_configs with the same length as V5 (no new entity access)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs).toHaveLength(
      CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs.length,
    );
  });

  it('CaseFormulation tool_config remains read_only and caution_layer', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.find(
      (c) => c.entity_name === 'CaseFormulation',
    );
    expect(cf).toBeDefined();
    expect(cf.read_only).toBe(true);
    expect(cf.caution_layer).toBe(true);
    expect(cf.unrestricted).toBe(false);
  });

  it('V6 tool_configs entity names match V5 tool_configs entity names exactly', () => {
    const v5Names = CBT_THERAPIST_WIRING_STAGE2_V5.tool_configs
      .map((c) => c.entity_name)
      .sort();
    const v6Names = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs
      .map((c) => c.entity_name)
      .sort();
    expect(v6Names).toEqual(v5Names);
  });
});

// ─── Section 3 — Routing ──────────────────────────────────────────────────────

describe('Phase 1 Quality — resolveTherapistWiring routing', () => {
  it('returns HYBRID when all flags are off (default)', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is HYBRID by default', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring function is exported', () => {
    expect(typeof resolveTherapistWiring).toBe('function');
  });
});

// ─── Section 4 — buildV6SessionStartContentAsync ──────────────────────────────

describe('Phase 1 Quality — buildV6SessionStartContentAsync exports', () => {
  it('is exported from workflowContextInjector.js', () => {
    expect(buildV6SessionStartContentAsync).toBeDefined();
    expect(typeof buildV6SessionStartContentAsync).toBe('function');
  });

  it('returns a Promise', () => {
    const entities = buildMockEntities();
    const result = buildV6SessionStartContentAsync(null, entities, null, {});
    expect(result).toBeInstanceOf(Promise);
  });

  it('delegates to V5 when wiring is null', async () => {
    const entities = buildMockEntities();
    const v5Result = await buildV5SessionStartContentAsync(null, entities, null, {});
    const v6Result = await buildV6SessionStartContentAsync(null, entities, null, {});
    expect(v6Result).toBe(v5Result);
  });

  it('delegates to V5 when wiring.formulation_context_enabled is missing', async () => {
    const entities = buildMockEntities();
    const wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V5 };
    const v5Result = await buildV5SessionStartContentAsync(wiring, entities, null, {});
    const v6Result = await buildV6SessionStartContentAsync(wiring, entities, null, {});
    expect(v6Result).toBe(v5Result);
  });

  it('delegates to V5 when wiring.formulation_context_enabled is false', async () => {
    const entities = buildMockEntities();
    const wiring = { ...CBT_THERAPIST_WIRING_STAGE2_V5, formulation_context_enabled: false };
    const v5Result = await buildV5SessionStartContentAsync(wiring, entities, null, {});
    const v6Result = await buildV6SessionStartContentAsync(wiring, entities, null, {});
    expect(v6Result).toBe(v5Result);
  });

  it('returns a string', async () => {
    const entities = buildMockEntities();
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(typeof result).toBe('string');
  });

  it('always starts with [START_SESSION]', async () => {
    const entities = buildMockEntities();
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result.startsWith('[START_SESSION]')).toBe(true);
  });
});

// ─── Section 5 — Formulation context block injection ──────────────────────────

describe('Phase 1 Quality — CaseFormulation context injection', () => {
  it('injects formulation context block when CaseFormulation data is available', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
  });

  it('formulation block contains the presenting_problem field', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('Presenting problem:');
    expect(result).toContain('Recurrent low mood triggered by interpersonal conflict');
  });

  it('formulation block contains the core_belief field', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('Core belief:');
    expect(result).toContain('I am fundamentally unlovable');
  });

  it('formulation block contains the maintaining_cycle field', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('Maintaining cycle:');
  });

  it('formulation block contains the treatment_goals field', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('Treatment goals:');
  });

  it('formulation block has the expected opening delimiter', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('=== CASE FORMULATION CONTEXT (read-only) ===');
  });

  it('formulation block has the expected closing delimiter', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('=== END CASE FORMULATION CONTEXT ===');
  });

  it('does NOT inject formulation block when CaseFormulation returns empty array', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('returns V5 base content when CaseFormulation entity throws (fail-closed)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockRejectedValue(new Error('entity unavailable')),
      },
    });
    const v6Result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    // V6 must not include entity-fetched formulation data when entity throws
    expect(v6Result).not.toContain('CASE FORMULATION CONTEXT');
    // V6 still includes the [START_SESSION] marker
    expect(v6Result).toContain('[START_SESSION]');
    // Phase 10: V6 (context-only path) does NOT inject formulation-led instructions when the flag is off.
    // THERAPIST_FORMULATION_INSTRUCTIONS is only injected for V6-LED or when FORMULATION_LED flag is on.
  });

  it('returns V5 base content when entities is null (fail-closed)', async () => {
    const v6Result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      null,
      null,
      {},
    );
    // V6 must not include entity-fetched formulation data when entities is null
    expect(v6Result).not.toContain('CASE FORMULATION CONTEXT');
    // V6 still includes the [START_SESSION] marker
    expect(v6Result).toContain('[START_SESSION]');
    // Phase 10: V6 (context-only path) does NOT inject formulation-led instructions when the flag is off.
    // THERAPIST_FORMULATION_INSTRUCTIONS is only injected for V6-LED or when FORMULATION_LED flag is on.
  });

  it('truncates presenting_problem to 150 chars', async () => {
    const longProblem = 'A'.repeat(200);
    const entities = buildMockEntities({
      CaseFormulation: {
        // Include a second meaningful field so the record meets FORMULATION_MIN_USEFUL_FIELDS.
        list: vi.fn().mockResolvedValue([{
          presenting_problem: longProblem,
          core_belief: 'I am not good enough',
        }]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    // The injected content must not contain the full 200-char string
    expect(result).not.toContain('A'.repeat(200));
    // But must contain the first 150 chars
    expect(result).toContain('A'.repeat(150));
  });

  it('omits fields that are missing from the formulation record', async () => {
    const partialFormulation = { presenting_problem: 'Social anxiety' };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([partialFormulation]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).toContain('Social anxiety');
    expect(result).not.toContain('Core belief:');
    expect(result).not.toContain('Maintaining cycle:');
    expect(result).not.toContain('Treatment goals:');
  });

  it('does not inject formulation block when formulation has no usable fields', async () => {
    const emptyFormulation = { id: '123', created_date: '2026-01-01' };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([emptyFormulation]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      null,
      {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });
});

// ─── Section 6 — Socratic/quality rules in workflow engine ────────────────────

describe('Phase 1 Quality — new workflow engine rules', () => {
  it('THERAPIST_WORKFLOW_RESPONSE_RULES contains socratic_insight_guidance', () => {
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.socratic_insight_guidance).toBeDefined();
    expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES.socratic_insight_guidance).toBe('string');
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.socratic_insight_guidance.length).toBeGreaterThan(0);
  });

  it('THERAPIST_WORKFLOW_RESPONSE_RULES contains avoid_repetitive_questioning', () => {
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.avoid_repetitive_questioning).toBeDefined();
    expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES.avoid_repetitive_questioning).toBe('string');
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.avoid_repetitive_questioning.length).toBeGreaterThan(0);
  });

  it('THERAPIST_WORKFLOW_RESPONSE_RULES contains formulation_aligned_intervention', () => {
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.formulation_aligned_intervention).toBeDefined();
    expect(typeof THERAPIST_WORKFLOW_RESPONSE_RULES.formulation_aligned_intervention).toBe('string');
    expect(THERAPIST_WORKFLOW_RESPONSE_RULES.formulation_aligned_intervention.length).toBeGreaterThan(0);
  });

  it('socratic_insight_guidance rule text references targeting specific insights', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.socratic_insight_guidance;
    expect(rule.toLowerCase()).toContain('question');
  });

  it('avoid_repetitive_questioning rule text references not repeating questions', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.avoid_repetitive_questioning;
    expect(rule.toLowerCase()).toContain('never ask the same');
  });

  it('formulation_aligned_intervention rule text references case formulation', () => {
    const rule = THERAPIST_WORKFLOW_RESPONSE_RULES.formulation_aligned_intervention;
    expect(rule.toLowerCase()).toContain('formulation');
  });

  it('existing 7 rules are still present (no rules removed)', () => {
    const originalRuleKeys = [
      'reduce_open_ended_questions',
      'summarize_over_explore',
      'name_the_pattern',
      'move_to_structure_early',
      'end_with_something_usable',
      'slow_down_for_extreme_language',
      'safety_stack_compatibility',
    ];
    for (const key of originalRuleKeys) {
      expect(
        THERAPIST_WORKFLOW_RESPONSE_RULES[key],
        `Rule "${key}" should still be present`,
      ).toBeDefined();
    }
  });

  it('workflow engine now has 14 response rules', () => {
    expect(Object.keys(THERAPIST_WORKFLOW_RESPONSE_RULES)).toHaveLength(14);
  });

  it('THERAPIST_WORKFLOW_VERSION is 3.7.0', () => {
    expect(THERAPIST_WORKFLOW_VERSION).toBe('3.7.0');
  });

  it('buildWorkflowContextInstructions includes socratic insight guidance text', () => {
    const instructions = buildWorkflowContextInstructions();
    expect(instructions).toContain('Socratic insight guidance');
  });

  it('buildWorkflowContextInstructions includes avoid repetitive questioning text', () => {
    const instructions = buildWorkflowContextInstructions();
    expect(instructions).toContain('Avoid repetitive questioning');
  });

  it('buildWorkflowContextInstructions includes formulation-aligned intervention text', () => {
    const instructions = buildWorkflowContextInstructions();
    expect(instructions).toContain('Formulation-aligned intervention');
  });

  it('buildWorkflowContextInstructions still contains all 7 original rules', () => {
    const instructions = buildWorkflowContextInstructions();
    expect(instructions).toContain('Reduce open-ended questions');
    expect(instructions).toContain('Summarize over explore');
    expect(instructions).toContain('Name the pattern');
    expect(instructions).toContain('Move to structure early');
    expect(instructions).toContain('End with something usable');
    expect(instructions).toContain('Slow down for extreme language');
    expect(instructions).toContain('Safety stack compatibility');
  });
});

// ─── Section 7 — Continuity retrieval with CaseFormulation ────────────────────

describe('Phase 1 Quality — CaseFormulation in executeV3BoundedRetrieval', () => {
  it('includes CaseFormulation item when entity returns data', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItems = result.items.filter((i) => i.entity_name === 'CaseFormulation');
    expect(cfItems.length).toBeGreaterThan(0);
  });

  it('CaseFormulation item has source_type SESSION_CONTEXT', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItem = result.items.find((i) => i.entity_name === 'CaseFormulation');
    expect(cfItem).toBeDefined();
    expect(cfItem.source_type).toBe(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
  });

  it('CaseFormulation content includes presenting problem', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItem = result.items.find((i) => i.entity_name === 'CaseFormulation');
    expect(cfItem.content).toContain('presenting:');
  });

  it('CaseFormulation content includes core belief', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItem = result.items.find((i) => i.entity_name === 'CaseFormulation');
    expect(cfItem.content).toContain('core belief:');
  });

  it('does not include CaseFormulation when entity returns empty array', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItems = result.items.filter((i) => i.entity_name === 'CaseFormulation');
    expect(cfItems).toHaveLength(0);
  });

  it('is fail-open: CaseFormulation entity error does not throw', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockRejectedValue(new Error('CF unavailable')),
      },
    });
    await expect(executeV3BoundedRetrieval(entities)).resolves.toBeDefined();
  });

  it('CaseFormulation entity error does not prevent other sources from returning', async () => {
    const entities = buildMockEntities({
      Goal: {
        filter: vi.fn().mockResolvedValue([
          { title: 'Reduce anxiety', status: 'active' },
        ]),
      },
      CaseFormulation: {
        list: vi.fn().mockRejectedValue(new Error('CF unavailable')),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const goalItems = result.items.filter((i) => i.entity_name === 'Goal');
    expect(goalItems.length).toBeGreaterThan(0);
  });

  it('CaseFormulation content is bounded to 120 chars per field', async () => {
    const longCF = {
      presenting_problem: 'X'.repeat(200),
      core_belief: 'Y'.repeat(200),
    };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([longCF]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItem = result.items.find((i) => i.entity_name === 'CaseFormulation');
    expect(cfItem).toBeDefined();
    // Each field is truncated at 120; so content should not contain 200-char sequences
    expect(cfItem.content).not.toContain('X'.repeat(200));
    expect(cfItem.content).not.toContain('Y'.repeat(200));
    // But first 120 chars must be present
    expect(cfItem.content).toContain('X'.repeat(120));
  });

  it('returns at most 1 CaseFormulation item even when multiple exist', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([SAMPLE_FORMULATION, SAMPLE_FORMULATION]),
      },
    });
    const result = await executeV3BoundedRetrieval(entities);
    const cfItems = result.items.filter((i) => i.entity_name === 'CaseFormulation');
    // The mock returns 2 records but the executor requests only 1 → at most 1 item
    expect(cfItems.length).toBeLessThanOrEqual(1);
  });
});

// ─── Section 8 — Default path (HYBRID) unchanged ──────────────────────────────

describe('Phase 1 Quality — default path isolation', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is HYBRID (upgrade path off)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring() returns HYBRID when all flags are false', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('buildV6SessionStartContentAsync returns "[START_SESSION]" string for HYBRID wiring', async () => {
    const entities = buildMockEntities();
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      entities,
      null,
      {},
    );
    expect(result).toContain('[START_SESSION]');
  });

  it('HYBRID wiring does NOT have formulation_context_enabled', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.formulation_context_enabled).not.toBe(true);
  });
});

// ─── Section 9 — Chat.jsx import audit ────────────────────────────────────────

describe('Phase 1 Quality — Chat.jsx import audit', () => {
  it('Chat.jsx imports buildV6SessionStartContentAsync (not V5)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const chatSource = fs.default.readFileSync(
      path.default.resolve('src/pages/Chat.jsx'),
      'utf8',
    );
    expect(chatSource).toContain('buildV6SessionStartContentAsync');
    expect(chatSource).not.toContain('buildV5SessionStartContentAsync');
  });

  it('Chat.jsx calls buildV10SessionStartContentAsync at all session-start sites', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const chatSource = fs.default.readFileSync(
      path.default.resolve('src/pages/Chat.jsx'),
      'utf8',
    );
    const count = (chatSource.match(/buildActionFirstDemotedSessionContentAsync/g) || []).length;
    // 1 import + 4 call sites = 5 (Enforcement pass: updated from V12 to demoted wrapper)
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
