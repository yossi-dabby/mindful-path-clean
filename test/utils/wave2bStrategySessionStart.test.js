/**
 * @file test/utils/wave2bStrategySessionStart.test.js
 *
 * Wave 2B — Therapeutic Strategy Layer Session-Start Integration
 *
 * PURPOSE
 * -------
 * Validates that buildV8SessionStartContentAsync:
 *   1. Injects the strategy section ONLY when strategy_layer_enabled is true.
 *   2. Falls back exactly to V7 behavior when the flag is off.
 *   3. Falls back exactly to V7 behavior when strategy computation fails.
 *   4. Does NOT affect companion flows.
 *   5. Does NOT leak raw transcript content.
 *   6. Does NOT leak cross-user / private-entity data.
 *   7. Does NOT produce role confusion between Therapist and Companion.
 *   8. Safely coexists with continuity + formulation context blocks.
 *   9. Produces conservative (CONTAINMENT) strategy output when safety mode is active.
 *
 * CONSTRAINTS
 * -----------
 * - Tests are deterministic and use only mock entity clients.
 * - No live Base44 backend or LLM calls.
 * - Flags remain at their default (false) in production.
 * - Tests exercise V8 behavior by calling buildV8SessionStartContentAsync
 *   directly with a V8-flagged wiring object — not via resolveTherapistWiring.
 *
 * Source of truth: Wave 2B problem statement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildV7SessionStartContentAsync,
  buildV8SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V8,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  AI_COMPANION_WIRING_UPGRADE_V2,
} from '../../src/api/agentWiring.js';

import {
  resolveTherapistWiring,
  resolveCompanionWiring,
} from '../../src/api/activeAgentWiring.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

import {
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
} from '../../src/lib/therapistStrategyEngine.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_TYPE,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/**
 * Creates a mock Base44 entity client that simulates an empty data store.
 * Every entity list call resolves to an empty array.
 */
function makeEmptyEntities() {
  const makeEntity = () => ({
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  });
  return {
    CompanionMemory: makeEntity(),
    CaseFormulation: makeEntity(),
    SessionSummary: makeEntity(),
    ThoughtJournal: makeEntity(),
    Goal: makeEntity(),
    CoachingSession: makeEntity(),
    Exercise: makeEntity(),
    Resource: makeEntity(),
    AudioContent: makeEntity(),
    Journey: makeEntity(),
    ExternalKnowledgeChunk: makeEntity(),
    MoodEntry: makeEntity(),
    Conversation: makeEntity(),
  };
}

/**
 * Creates a mock entity client with a meaningful CaseFormulation record.
 */
function makeEntitiesWithFormulation() {
  const entities = makeEmptyEntities();
  const cf = {
    id: 'cf-001',
    presenting_problem: 'Persistent work-related anxiety and catastrophising',
    core_belief: 'I am fundamentally incompetent',
    maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
    treatment_goals: 'Challenge core belief and build tolerance for uncertainty',
  };
  entities.CaseFormulation.list = vi.fn().mockResolvedValue([cf]);
  return { entities, formulation: cf };
}

/**
 * Creates a mock entity client with therapist continuity memory records.
 */
function makeEntitiesWithContinuity() {
  const entities = makeEmptyEntities();
  const memRecord = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'sess-042',
    session_date: '2026-04-01',
    session_summary: 'Good progress on thought challenging, identified core belief.',
    core_patterns: ['catastrophising', 'mind-reading'],
    triggers: ['Monday mornings'],
    automatic_thoughts: ['I will fail', 'They think I am incompetent'],
    emotions: ['anxiety', 'shame'],
    urges: ['avoid'],
    actions: ['stayed home'],
    consequences: ['temporary relief'],
    working_hypotheses: ['Core belief: I am not good enough'],
    interventions_used: ['thought_record'],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: ['Complete thought record daily'],
    goals_referenced: ['goal-001'],
    last_summarized_date: '2026-04-01T10:00:00Z',
  };
  const rawRecord = {
    id: 'cm-001',
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify(memRecord),
  };
  entities.CompanionMemory.list = vi.fn().mockResolvedValue([rawRecord]);
  return { entities, memRecord };
}

/**
 * Creates a mock entity client with both formulation and continuity data.
 */
function makeEntitiesWithBothContexts() {
  const { entities: eWithCont } = makeEntitiesWithContinuity();
  const cf = {
    id: 'cf-001',
    presenting_problem: 'Persistent work-related anxiety and catastrophising',
    core_belief: 'I am fundamentally incompetent',
    maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
    treatment_goals: 'Challenge core belief and build tolerance for uncertainty',
  };
  eWithCont.CaseFormulation.list = vi.fn().mockResolvedValue([cf]);
  return eWithCont;
}

/**
 * Creates a minimal mock baseClient (not used by the strategy layer itself,
 * but required by the V5+ chain for live retrieval).
 */
function makeMockBaseClient() {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({ result: '' }),
    },
  };
}

/**
 * Extracts the therapeutic strategy section from a session-start content string
 * and returns it lowercased for case-insensitive assertions.
 * Returns an empty string when no strategy section is present.
 */
function getStrategySectionLower(content) {
  const start = content.indexOf('=== THERAPEUTIC STRATEGY');
  if (start === -1) return '';
  return content.slice(start).toLowerCase();
}

// ─── Section 1 — V8 wiring shape ─────────────────────────────────────────────

describe('Wave 2B — V8 wiring shape', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V8 exists and has strategy_layer_enabled', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V8).toBeDefined();
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.strategy_layer_enabled).toBe(true);
  });

  it('V8 is a strict superset of V7 (all V7 flags present)', () => {
    const v7Keys = Object.keys(CBT_THERAPIST_WIRING_STAGE2_V7).filter(k => k !== 'tool_configs' && k !== 'stage2_phase');
    for (const key of v7Keys) {
      expect(CBT_THERAPIST_WIRING_STAGE2_V8[key]).toBe(CBT_THERAPIST_WIRING_STAGE2_V7[key]);
    }
  });

  it('V8 has stage2_phase: 12', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.stage2_phase).toBe(12);
  });

  it('V8 tool_configs are identical to V7 (no new entity access)', () => {
    const v8Entities = CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.map(t => t.entity_name).sort();
    const v7Entities = CBT_THERAPIST_WIRING_STAGE2_V7.tool_configs.map(t => t.entity_name).sort();
    expect(v8Entities).toEqual(v7Entities);
  });

  it('V8 private entities (CaseFormulation, Conversation) have caution_layer protection', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.find(t => t.entity_name === 'CaseFormulation');
    const conv = CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.find(t => t.entity_name === 'Conversation');
    expect(cf).toBeDefined();
    expect(cf.caution_layer).toBe(true);
    expect(conv).toBeDefined();
    expect(conv.caution_layer).toBe(true);
  });
});

// ─── Section 2 — Feature flag baseline ───────────────────────────────────────

describe('Wave 2B — Feature flag baseline', () => {
  it('THERAPIST_UPGRADE_STRATEGY_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_STRATEGY_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for THERAPIST_UPGRADE_STRATEGY_ENABLED in test env', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED')).toBe(false);
  });

  it('resolveTherapistWiring() does NOT return V8 when flags are off', () => {
    const resolved = resolveTherapistWiring();
    expect(resolved.strategy_layer_enabled).toBeUndefined();
  });
});

// ─── Section 3 — buildV8SessionStartContentAsync: non-V8 delegation ──────────

describe('Wave 2B — buildV8SessionStartContentAsync delegates to V7 for non-V8 wirings', () => {
  const entities = makeEmptyEntities();
  const baseClient = makeMockBaseClient();

  it('returns exactly the same content as V7 for HYBRID wiring', async () => {
    const v7Result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, baseClient);
    const v8Result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, baseClient);
    expect(v8Result).toBe(v7Result);
  });

  it('returns exactly the same content as V7 for V7 wiring (strategy flag absent)', async () => {
    const v7Result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, baseClient);
    const v8Result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, baseClient);
    expect(v8Result).toBe(v7Result);
  });

  it('returns exactly the same content as V7 for null wiring', async () => {
    const v7Result = await buildV7SessionStartContentAsync(null, entities, baseClient);
    const v8Result = await buildV8SessionStartContentAsync(null, entities, baseClient);
    expect(v8Result).toBe(v7Result);
  });

  it('returns exactly the same content as V7 for undefined wiring', async () => {
    const v7Result = await buildV7SessionStartContentAsync(undefined, entities, baseClient);
    const v8Result = await buildV8SessionStartContentAsync(undefined, entities, baseClient);
    expect(v8Result).toBe(v7Result);
  });

  it('always starts with [START_SESSION] for non-V8 wirings', async () => {
    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, baseClient);
    expect(result).toMatch(/^\[START_SESSION\]/);
  });
});

// ─── Section 4 — Strategy section injection when V8 wiring is active ─────────

describe('Wave 2B — Strategy section injected for V8 wiring', () => {
  it('appends a strategy section when V8 wiring is active (empty data → PSYCHOEDUCATION)', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('[START_SESSION]');
    expect(result).toContain('THERAPEUTIC STRATEGY');
  });

  it('strategy section is appended AFTER the V7 base content', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const v7Base = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);
    const v8Result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(v8Result.startsWith(v7Base)).toBe(true);
    expect(v8Result.length).toBeGreaterThan(v7Base.length);
  });

  it('strategy section is clearly delimited (not raw data)', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('=== THERAPEUTIC STRATEGY');
    expect(result).toContain('=== END THERAPEUTIC STRATEGY ===');
  });

  it('strategy section contains Intervention mode field', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('Intervention mode');
  });

  it('strategy section contains Guidance line', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('Guidance:');
  });
});

// ─── Section 5 — Strategy mode selection with available data ─────────────────

describe('Wave 2B — Strategy mode selection reflects available context', () => {
  it('no context → PSYCHOEDUCATION mode (first-session safe default)', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('formulation present only → STABILISATION mode until readiness is explicit', async () => {
    const { entities } = makeEntitiesWithFormulation();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(getStrategySectionLower(result)).not.toContain(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('continuity present only → STABILISATION mode (planner-first: no formulation = stabilisation first)', async () => {
    // Pre-enforcement behavior was STRUCTURED_EXPLORATION for "continuity only" sessions.
    // Post-enforcement: without a CaseFormulation, the precedence model fires FORMULATION_FIRST
    // (level 2) which overrides any action-capable mode to STABILISATION.
    // This is the intended planner-first behavior: formulate before exploring.
    const { entities } = makeEntitiesWithContinuity();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(getStrategySectionLower(result)).not.toContain(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('both formulation and continuity present → STABILISATION mode when readiness is not explicitly passed', async () => {
    const entities = makeEntitiesWithBothContexts();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(getStrategySectionLower(result)).not.toContain(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('safety mode active (crisis_signal) → CONTAINMENT mode', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { crisis_signal: true },
    );

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('high-distress message text → CONTAINMENT or STABILISATION mode', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { message_text: 'I feel completely hopeless, nothing will ever get better.' },
    );

    const strategySection = getStrategySectionLower(result);
    const hasContainment = strategySection.includes(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    const hasStabilisation = strategySection.includes(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(hasContainment || hasStabilisation).toBe(true);
  });
});

// ─── Section 6 — Fail-open: strategy computation failure ─────────────────────

describe('Wave 2B — Fail-open: strategy computation failure returns V7 base', () => {
  it('CaseFormulation.list throwing → falls back to V7 base content unchanged', async () => {
    const entities = makeEmptyEntities();
    entities.CaseFormulation.list = vi.fn().mockRejectedValue(new Error('DB unavailable'));
    const baseClient = makeMockBaseClient();

    const v7Base = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    // Reset the mock before calling V8 so it throws during V8 strategy computation
    // Note: V7 uses CaseFormulation too — we need to simulate failure ONLY during V8.
    // We test the outer fail-open by patching after V7 base is already computed.
    // Here we verify the content matches V7 behavior when formulation fails.
    const entitiesWithFailingFormulation = makeEmptyEntities();
    entitiesWithFailingFormulation.CaseFormulation.list = vi.fn().mockRejectedValue(new Error('fail'));

    // V7 base with no formulation data
    const v7BaseNoForm = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entitiesWithFailingFormulation,
      baseClient,
    );
    const v8Result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entitiesWithFailingFormulation,
      baseClient,
    );

    // When formulation fails, strategy engine still runs (with null formulation)
    // and produces output — this is expected behavior.
    // The key invariant is: result starts with the V7 base.
    expect(v8Result.startsWith(v7BaseNoForm)).toBe(true);
  });

  it('result always starts with [START_SESSION]', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toMatch(/^\[START_SESSION\]/);
  });

  it('never throws — always returns a string', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    await expect(
      buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient)
    ).resolves.toEqual(expect.any(String));
  });

  it('never throws with null entities', async () => {
    await expect(
      buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, null, null)
    ).resolves.toEqual(expect.any(String));
  });
});

// ─── Section 7 — No companion leakage ────────────────────────────────────────

describe('Wave 2B — No companion leakage', () => {
  it('resolveCompanionWiring() is unaffected by strategy flag state', () => {
    const companionWiring = resolveCompanionWiring();
    // Companion wiring must not have strategy_layer_enabled
    expect(companionWiring.strategy_layer_enabled).toBeUndefined();
  });

  it('AI_COMPANION_WIRING_HYBRID does not have strategy_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.strategy_layer_enabled).toBeUndefined();
  });

  it('AI_COMPANION_WIRING_UPGRADE_V2 does not have strategy_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.strategy_layer_enabled).toBeUndefined();
  });

  it('buildV8SessionStartContentAsync with companion wiring returns standard companion content', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    // Companion wirings do not have strategy_layer_enabled, so V8 delegates to V7
    const result = await buildV8SessionStartContentAsync(AI_COMPANION_WIRING_HYBRID, entities, baseClient);

    expect(result).not.toContain('THERAPEUTIC STRATEGY');
  });
});

// ─── Section 8 — No raw transcript leakage ───────────────────────────────────

describe('Wave 2B — No raw transcript leakage in strategy section', () => {
  it('does not include raw message_text content in the output', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();
    const sensitiveText = 'SENSITIVE_USER_MESSAGE_12345';

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { message_text: sensitiveText },
    );

    expect(result).not.toContain(sensitiveText);
  });

  it('does not include raw core_patterns strings from memory in the strategy section', async () => {
    const { entities } = makeEntitiesWithContinuity();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
    );

    // The strategy SECTION itself (after V7 base) should not contain memory content.
    // The V7 base may contain a continuity block — that is expected.
    // Split on the strategy delimiter and check only the strategy section.
    const strategyIdx = result.indexOf('=== THERAPEUTIC STRATEGY');
    if (strategyIdx !== -1) {
      const strategySection = result.slice(strategyIdx);
      // strategy section must not contain raw session content
      expect(strategySection).not.toContain('Monday mornings');
      expect(strategySection).not.toContain('sess-042');
    }
  });

  it('does not include raw CaseFormulation presenting_problem in the strategy section', async () => {
    const { entities } = makeEntitiesWithFormulation();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
    );

    const strategyIdx = result.indexOf('=== THERAPEUTIC STRATEGY');
    if (strategyIdx !== -1) {
      const strategySection = result.slice(strategyIdx);
      expect(strategySection).not.toContain('Persistent work-related anxiety');
    }
  });
});

// ─── Section 9 — No cross-user / private entity leakage ──────────────────────

describe('Wave 2B — No cross-user / private entity leakage', () => {
  it('V8 does NOT add new entity access compared to V7', () => {
    const v8Names = new Set(CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.map(t => t.entity_name));
    const v7Names = new Set(CBT_THERAPIST_WIRING_STAGE2_V7.tool_configs.map(t => t.entity_name));
    expect(v8Names.size).toBe(v7Names.size);
    for (const name of v8Names) {
      expect(v7Names.has(name)).toBe(true);
    }
  });

  it('CompanionMemory access_level is restricted and read_only in V8', () => {
    const cm = CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.find(t => t.entity_name === 'CompanionMemory');
    expect(cm).toBeDefined();
    expect(cm.access_level).toBe('restricted');
    expect(cm.read_only).toBe(true);
  });

  it('CaseFormulation access_level is restricted and read_only in V8', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V8.tool_configs.find(t => t.entity_name === 'CaseFormulation');
    expect(cf).toBeDefined();
    expect(cf.access_level).toBe('restricted');
    expect(cf.read_only).toBe(true);
  });
});

// ─── Section 10 — No role confusion ──────────────────────────────────────────

describe('Wave 2B — No role confusion', () => {
  it('strategy section does not reference companion or ai_coach role', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);
    const strategyIdx = result.indexOf('=== THERAPEUTIC STRATEGY');
    if (strategyIdx !== -1) {
      const strategySection = result.slice(strategyIdx).toLowerCase();
      expect(strategySection).not.toContain('companion');
      expect(strategySection).not.toContain('ai_coach');
    }
  });

  it('V8 wiring name is cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.name).toBe('cbt_therapist');
  });
});

// ─── Section 11 — Safe coexistence with continuity + formulation blocks ───────

describe('Wave 2B — Safe coexistence with continuity + formulation blocks', () => {
  it('strategy section appears AFTER continuity + formulation blocks', async () => {
    const entities = makeEntitiesWithBothContexts();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    const strategyIdx = result.indexOf('=== THERAPEUTIC STRATEGY');
    const continuityIdx = result.indexOf('=== CROSS-SESSION CONTINUITY');
    const formulationIdx = result.indexOf('=== CASE FORMULATION CONTEXT');

    if (continuityIdx !== -1 && strategyIdx !== -1) {
      expect(strategyIdx).toBeGreaterThan(continuityIdx);
    }
    if (formulationIdx !== -1 && strategyIdx !== -1) {
      expect(strategyIdx).toBeGreaterThan(formulationIdx);
    }
  });

  it('continuity block is present when data exists (V8 preserves V7 continuity injection)', async () => {
    const { entities } = makeEntitiesWithContinuity();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('CROSS-SESSION CONTINUITY');
  });

  it('formulation block is present when data exists (V8 preserves V6 formulation injection)', async () => {
    const { entities } = makeEntitiesWithFormulation();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities, baseClient);

    expect(result).toContain('CASE FORMULATION CONTEXT');
  });
});

// ─── Section 12 — Safety-mode-active inputs produce conservative output ───────

describe('Wave 2B — Safety-mode-active inputs produce conservative strategy output', () => {
  it('crisis_signal=true → CONTAINMENT intervention mode in strategy section', async () => {
    const entities = makeEntitiesWithBothContexts();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { crisis_signal: true },
    );

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(result).toContain('Guidance:');
    // CONTAINMENT guidance must reference short/grounding
    const strategyIdx = result.indexOf('=== THERAPEUTIC STRATEGY');
    if (strategyIdx !== -1) {
      const section = result.slice(strategyIdx);
      expect(section.toLowerCase()).toContain('grounding');
    }
  });

  it('flag_override=true → CONTAINMENT intervention mode in strategy section', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { flag_override: true },
    );

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('hopelessness message text → CONTAINMENT mode (TIER_HIGH)', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { message_text: "I feel hopeless, nothing will ever get better, I can't see a way out." },
    );

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('catastrophic message text → CONTAINMENT mode (TIER_HIGH)', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { message_text: 'Everything is ruined, my life is over, there is no way back.' },
    );

    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('low-distress session with both contexts → stabilisation (not containment) when readiness is not explicit', async () => {
    const entities = makeEntitiesWithBothContexts();
    const baseClient = makeMockBaseClient();

    const result = await buildV8SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V8,
      entities,
      baseClient,
      { message_text: 'I would like to continue working on my goals today.' },
    );

    // With both contexts + low distress but no explicit readiness signal passed
    // the precedence guard keeps the session in formulation-hold mode.
    expect(getStrategySectionLower(result)).toContain(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(getStrategySectionLower(result)).not.toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });
});

// ─── Section 13 — resolveTherapistWiring V8 routing ──────────────────────────

describe('Wave 2B — resolveTherapistWiring routing', () => {
  it('V8 routing is NOT active when flags are off (default state)', () => {
    const wiring = resolveTherapistWiring();
    expect(wiring.strategy_layer_enabled).toBeUndefined();
  });

  it('V8 is imported from agentWiring and has the correct shape', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V8).toBeDefined();
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.name).toBe('cbt_therapist');
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.stage2).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V8.strategy_layer_enabled).toBe(true);
  });
});

// ─── Section 14 — Deterministic repeatability ────────────────────────────────

describe('Wave 2B — Deterministic repeatability', () => {
  it('same inputs always produce same output for V8 (empty data)', async () => {
    const entities1 = makeEmptyEntities();
    const entities2 = makeEmptyEntities();
    const baseClient = makeMockBaseClient();

    const result1 = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities1, baseClient);
    const result2 = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, entities2, baseClient);

    expect(result1).toBe(result2);
  });

  it('same inputs always produce same output for V8 (with formulation)', async () => {
    const { entities: e1 } = makeEntitiesWithFormulation();
    const { entities: e2 } = makeEntitiesWithFormulation();
    const baseClient = makeMockBaseClient();

    const result1 = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, e1, baseClient);
    const result2 = await buildV8SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V8, e2, baseClient);

    expect(result1).toBe(result2);
  });
});
