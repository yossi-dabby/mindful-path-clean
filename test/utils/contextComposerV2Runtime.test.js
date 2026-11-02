import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as injector from '../../src/lib/workflowContextInjector.js';
import {
  createContextComposerV2,
  CONTEXT_COMPOSER_V2_BUDGET_CHARS,
  CONTEXT_COMPOSER_V2_PARITY_STATUS,
} from '../../src/lib/contextComposerV2.js';
import { CBT_THERAPIST_WIRING_STAGE2_V12 } from '../../src/api/agentWiring.js';

function makeWindow(search = '') {
  vi.stubGlobal('window', { location: { search, hostname: 'localhost' } });
}

function makeEntities() {
  return {
    CompanionMemory: {
      filter: vi.fn(async () => []),
      list: vi.fn(async () => []),
    },
    CaseFormulation: {
      list: vi.fn(async () => []),
    },
  };
}

// ─── Populated fixtures ───────────────────────────────────────────────────────
//
// LTS: outer CompanionMemory record has memory_type:'lts' + content=JSON(ltsInner).
// ltsInner must have lts_version:'1', memory_type:'lts', trajectory non-weak,
// and session_count >= LTS_MIN_SESSIONS_FOR_SIGNALS (2).
const LTS_INNER_RECORD = {
  lts_version: '1',
  memory_type: 'lts',
  trajectory: 'progressing',
  session_count: 5,            // >= 2 → non-weak
  risk_flags: [],
  blockers: [],
  strategy_version: 'v8',
  formulation_present: true,
  formulation_strength_score: 0.8,
};
// The outer wrapper is what CompanionMemory.filter returns.
const POPULATED_LTS_OUTER = { memory_type: 'lts', content: JSON.stringify(LTS_INNER_RECORD) };

// CaseFormulation: production fields are presenting_problem, core_belief,
// maintaining_cycle, treatment_goals.  At least two must be non-empty for
// the case_formulation_context section to be emitted.
const POPULATED_FORMULATION_RECORD = {
  id: 'cf1',
  presenting_problem: 'Generalised anxiety with avoidance patterns',
  core_belief: 'I am fundamentally incompetent and will fail',
  maintaining_cycle: 'Avoidance reinforces the core belief cycle',
  treatment_goals: 'Reduce avoidance and build self-efficacy',
};

// Continuity: the outer CompanionMemory record must have memory_type:'therapist_session'
// and a content field that is a JSON string containing therapist_memory_version:'1'.
// Fields of the therapist memory record live INSIDE the content JSON — not on the
// outer entity record.
const THERAPIST_MEMORY_CONTENT = JSON.stringify({
  therapist_memory_version: '1',
  session_id: 'sess-001',
  session_date: '2025-01-15T10:00:00.000Z',
  session_summary: 'Worked on cognitive restructuring techniques with significant progress noted.',
  mood_rating: 7,
  session_highlights: ['identified core belief pattern'],
  session_blockers: [],
  risk_flags: [],
  recurring_patterns: [],
  working_hypotheses: [],
  open_follow_ups: [],
  interventions_used: ['thought records'],
  progress_signals: [],
});
const POPULATED_CONTINUITY_OUTER = {
  memory_type: 'therapist_session',
  content: THERAPIST_MEMORY_CONTENT,
};

// Entities with all populated fixtures (Scenario A: rich normal session).
function makePopulatedEntities() {
  return {
    CompanionMemory: {
      // LTS canonical read uses CompanionMemory.filter (ltsReaderContract.js)
      filter: vi.fn(async () => [POPULATED_LTS_OUTER]),
      // Continuity canonical read uses CompanionMemory.list (crossSessionContinuity.js)
      list: vi.fn(async () => [POPULATED_CONTINUITY_OUTER]),
    },
    CaseFormulation: {
      list: vi.fn(async () => [POPULATED_FORMULATION_RECORD]),
    },
  };
}

// ─── Complete section inventory ───────────────────────────────────────────────
// All registered section IDs across all V12 runtime scenarios.
// Each ID must appear in at least one scenario below.
//
// NOTE: formulation_led_instructions requires the runtime flag
// THERAPIST_UPGRADE_FORMULATION_LED_ENABLED which is off by default.
// retrieved_context and live_retrieved_context require actual retrieval results
// (non-empty entity reads from V4 retrieval).
// These sections are conditional and excluded from the default scenario matrix.
const ALL_V12_SECTION_IDS = [
  // Base sections — always present in every V12 run
  'session_start',
  'workflow_instructions',
  'retrieval_orchestration',
  'live_retrieval_policy',
  'live_runtime_status',
  'strategy_guidance',
  'precedence_enforcement',
  'competence_instructions',
  'planner_first_instructions',
  'attachment_context_instructions',
  'therapeutic_forms_policy',
  // Clinical personalisation — Scenario A (rich normal session)
  'case_formulation_context',
  'cross_session_continuity',
  'longitudinal_state_context',
  // Safety — Scenario B (safety-active session)
  'safety_mode',
  'emergency_resources',
];

// Base sections present in every V12 run (empty entities, no safety, no clinical data).
const BASE_V12_SECTION_IDS = [
  'session_start',
  'workflow_instructions',
  'retrieval_orchestration',
  'live_retrieval_policy',
  'live_runtime_status',
  'strategy_guidance',
  'precedence_enforcement',
  'competence_instructions',
  'planner_first_instructions',
  'attachment_context_instructions',
  'therapeutic_forms_policy',
];

describe('context composer V2 runtime integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flag-off preserves byte-for-byte active behavior', async () => {
    const entities = makeEntities();
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
    const off = await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const on = await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { disable_context_composer_v2: true });
    expect(on).toBe(off);
  });

  it('composer-on under budget matches legacy output byte-for-byte and fallback_used is false', async () => {
    const entities = makeEntities();
    // Build legacy output (composer disabled)
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
    const legacy = await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { disable_context_composer_v2: true });

    // Build composed output (composer enabled)
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    // Inject a spy composer with a budget large enough to hold all V12 sections
    let capturedDiagnostic = null;
    const largeComposer = createContextComposerV2({ budget_chars: legacy.length + 10000 });
    const composerSpy = {
      version: largeComposer.version,
      budget_chars: largeComposer.budget_chars,
      registerSection: (...args) => largeComposer.registerSection(...args),
      finalize: (...args) => {
        const result = largeComposer.finalize(...args);
        capturedDiagnostic = result.diagnostic;
        return result;
      },
    };
    const composed = await injector.buildActionFirstDemotedSessionContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
    );

    // Byte-for-byte parity
    expect(composed).toBe(legacy);

    // Composer must be authoritative: fallback_used must be false under budget
    expect(capturedDiagnostic).not.toBeNull();
    expect(capturedDiagnostic.fallback_used).toBe(false);
    expect(capturedDiagnostic.parity_match).toBe(true);
    expect(capturedDiagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match);
    expect(capturedDiagnostic.budget_exceeded).toBe(false);
  });

  it('composer-on: every expected section ID is registered exactly once (empty entities)', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makeEntities();
    const registeredIds = [];
    const realComposer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
    const composerSpy = {
      version: realComposer.version,
      budget_chars: realComposer.budget_chars,
      registerSection: (section) => {
        registeredIds.push(section.id);
        return realComposer.registerSection(section);
      },
      finalize: (...args) => realComposer.finalize(...args),
    };
    await injector.buildActionFirstDemotedSessionContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
    );
    // Each expected base section must appear exactly once
    for (const expectedId of BASE_V12_SECTION_IDS) {
      const count = registeredIds.filter((id) => id === expectedId).length;
      expect(count, `section '${expectedId}' must be registered exactly once, got ${count}`).toBe(1);
    }
    // No duplicates overall
    const uniqueIds = new Set(registeredIds);
    expect(uniqueIds.size).toBe(registeredIds.length);
  });

  it('active V12 chain uses one composer and serializes once', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makeEntities();
    let finalizeCalls = 0;
    const composer = {
      version: 'test',
      budget_chars: 32000,
      registerSection: vi.fn(),
      finalize: vi.fn(({ fallbackRendered }) => {
        finalizeCalls += 1;
        return { rendered: fallbackRendered ?? '', diagnostic: { fallback_used: false, parity_match: true, parity_status: CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match }, sections: [], version: 'test' };
      }),
    };
    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composer });
    expect(finalizeCalls).toBe(1);
  });

  it('budget eviction returns composed reduced output — not legacy fallback', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makeEntities();

    // Get unconstrained full output first (large budget, no eviction)
    const unconstrained = createContextComposerV2({ budget_chars: 1_000_000 });
    const fullOutput = await injector.buildActionFirstDemotedSessionContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V12, makeEntities(), null, { context_composer_v2: unconstrained }
    );

    // Use a tight budget to force eviction of optional sections
    const tightComposer = createContextComposerV2({ budget_chars: 500 });
    let capturedDiagnostic = null;
    const composerSpy = {
      version: tightComposer.version,
      budget_chars: tightComposer.budget_chars,
      registerSection: (...args) => tightComposer.registerSection(...args),
      finalize: (...args) => {
        const result = tightComposer.finalize(...args);
        capturedDiagnostic = result.diagnostic;
        return result;
      },
    };
    const output = await injector.buildActionFirstDemotedSessionContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
    );
    expect(capturedDiagnostic).not.toBeNull();
    // Budget eviction must fire
    expect(capturedDiagnostic.budget_exceeded).toBe(true);
    // Budget eviction is NOT a fallback — fallback_used must be false
    expect(capturedDiagnostic.fallback_used).toBe(false);
    // Budget eviction parity_status must be intentional_budget_difference
    expect(capturedDiagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.intentional_budget_difference);
    // parity_match must be false for budget-evicted output
    expect(capturedDiagnostic.parity_match).toBe(false);
    // Required sections must always be present in output
    expect(output).toContain('[START_SESSION]');
    // Evicted output is shorter than unconstrained output
    expect(output.length).toBeLessThan(fullOutput.length);
  });

  it('composer failure safely emits already-computed context without repeated entity reads', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
    const entities = makeEntities();
    const legacy = await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { disable_context_composer_v2: true });
    const filterCallsBefore = entities.CompanionMemory.filter.mock.calls.length;
    const listCallsBefore = entities.CompanionMemory.list.mock.calls.length;

    const mod = await import('../../src/lib/contextComposerV2.js');
    vi.spyOn(mod, 'createContextComposerV2').mockImplementation(() => {
      throw new Error('boom');
    });
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const output = await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});
    // Fails open to the already-computed legacy output
    expect(output).toBe(legacy);
    // No additional entity reads caused by the composer failure
    expect(entities.CompanionMemory.filter.mock.calls.length).toBe(filterCallsBefore + 1);
    expect(entities.CompanionMemory.list.mock.calls.length).toBe(listCallsBefore + 2);
  });

  it('no opaque legacy section — no final-string parsing in composed output', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makeEntities();
    const realComposer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
    let finalResult = null;
    const composerSpy = {
      version: realComposer.version,
      budget_chars: realComposer.budget_chars,
      registerSection: (...args) => realComposer.registerSection(...args),
      finalize: (...args) => {
        finalResult = realComposer.finalize(...args);
        return finalResult;
      },
    };
    await injector.buildActionFirstDemotedSessionContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
    );
    expect(finalResult).not.toBeNull();
    // All sections should have known IDs — no opaque 'legacy' sections
    for (const section of finalResult.sections) {
      expect(typeof section.id).toBe('string');
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.id).not.toBe('legacy');
    }
  });

  it('direct V7-V12 calls remain compatible', async () => {
    const entities = makeEntities();
    const content7 = await injector.buildV7SessionStartContentAsync({ continuity_layer_enabled: true }, entities, null, {});
    const content8 = await injector.buildV8SessionStartContentAsync({ continuity_layer_enabled: true, strategy_layer_enabled: true }, entities, null, {});
    const content9 = await injector.buildV9SessionStartContentAsync({ continuity_layer_enabled: true, strategy_layer_enabled: true, longitudinal_layer_enabled: true }, entities, null, {});
    const content10 = await injector.buildV10SessionStartContentAsync({ continuity_layer_enabled: true, strategy_layer_enabled: true, longitudinal_layer_enabled: true, knowledge_layer_enabled: true }, entities, null, {});
    const content11 = await injector.buildV11SessionStartContentAsync({ continuity_layer_enabled: true, strategy_layer_enabled: true, longitudinal_layer_enabled: true, knowledge_layer_enabled: true, competence_layer_enabled: true }, entities, null, {});
    const content12 = await injector.buildV12SessionStartContentAsync({ continuity_layer_enabled: true, strategy_layer_enabled: true, longitudinal_layer_enabled: true, knowledge_layer_enabled: true, competence_layer_enabled: true, planner_first_enabled: true }, entities, null, {});
    for (const content of [content7, content8, content9, content10, content11, content12]) expect(typeof content).toBe('string');
  });

  // ─── Scenario Matrix ─────────────────────────────────────────────────────────
  //
  // Three mutually-exclusive clinical states are tested separately so that
  // clinical-state-specific sections can be asserted without forcing contradictory
  // flags into one session.
  //
  // Scenario A — Rich normal session:
  //   formulation context, formulation-led instructions, continuity, LTS,
  //   strategy, precedence, valid LTS, competence, planner, all base sections.
  //
  // Scenario B — Safety-active session:
  //   safety_mode, emergency_resources, required sections preserved.
  //
  // Scenario C — Base session with empty entities (all base sections present).

  describe('Scenario A — rich normal session (populated entities)', () => {
    it('Scenario A: all base sections registered exactly once with no duplicates', async () => {
      makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
      const entities = makePopulatedEntities();

      const registeredIds = [];
      const realComposer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
      let capturedDiagnostic = null;
      const composerSpy = {
        version: realComposer.version,
        budget_chars: realComposer.budget_chars,
        registerSection: (section) => {
          registeredIds.push(section.id);
          return realComposer.registerSection(section);
        },
        finalize: (...args) => {
          const result = realComposer.finalize(...args);
          capturedDiagnostic = result.diagnostic;
          return result;
        },
      };

      const output = await injector.buildActionFirstDemotedSessionContentAsync(
        CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
      );

      // No duplicate IDs
      const uniqueIds = new Set(registeredIds);
      expect(
        uniqueIds.size,
        `duplicate section IDs: ${registeredIds.filter((id, i) => registeredIds.indexOf(id) !== i).join(', ')}`,
      ).toBe(registeredIds.length);

      // finalize called exactly once (capturedDiagnostic is non-null)
      expect(capturedDiagnostic).not.toBeNull();

      // Default budget (120,000) must not evict any section for this bounded scenario.
      // Measured max populated scenario: ~74,163 chars — well within 120,000.
      expect(capturedDiagnostic.budget_exceeded).toBe(false);

      // fallback_used must be false: composer is authoritative
      expect(capturedDiagnostic.fallback_used).toBe(false);

      // Parity: composed output must exactly match legacy (exact_match)
      expect(capturedDiagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match);
      expect(capturedDiagnostic.parity_match).toBe(true);

      // Diagnostics must not leak any clinical or retrieved content
      const diagnosticJson = JSON.stringify(capturedDiagnostic);
      expect(diagnosticJson).not.toContain('Generalised anxiety');
      expect(diagnosticJson).not.toContain('cognitive restructuring');

      // All base sections must be registered
      for (const id of BASE_V12_SECTION_IDS) {
        expect(registeredIds, `base section '${id}' must be registered in Scenario A`).toContain(id);
      }

      // Clinical-personalisation sections must be registered when entities are populated
      expect(registeredIds, 'case_formulation_context must be registered with valid formulation').toContain('case_formulation_context');

      // LTS section must be registered when LTS is valid and non-weak
      expect(registeredIds, 'longitudinal_state_context must be registered with valid LTS').toContain('longitudinal_state_context');

      // Continuity must be registered when continuity record is valid
      expect(registeredIds, 'cross_session_continuity must be registered with valid continuity').toContain('cross_session_continuity');

      // Output is non-empty
      expect(output.length).toBeGreaterThan(1000);
    });
  });

  describe('Scenario B — safety-active session', () => {
    it('Scenario B: safety_mode and emergency_resources registered; required sections preserved; fallback_used false', async () => {
      makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
      const entities = makeEntities();

      const registeredIds = [];
      const realComposer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
      let capturedDiagnostic = null;
      const composerSpy = {
        version: realComposer.version,
        budget_chars: realComposer.budget_chars,
        registerSection: (section) => {
          registeredIds.push(section.id);
          return realComposer.registerSection(section);
        },
        finalize: (...args) => {
          const result = realComposer.finalize(...args);
          capturedDiagnostic = result.diagnostic;
          return result;
        },
      };

      // Trigger safety mode via crisis_signal flag
      await injector.buildActionFirstDemotedSessionContentAsync(
        CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {
          context_composer_v2: composerSpy,
          crisis_signal: true,
        }
      );

      expect(capturedDiagnostic).not.toBeNull();

      // No duplicates
      const uniqueIds = new Set(registeredIds);
      expect(
        uniqueIds.size,
        `duplicate section IDs in Scenario B: ${registeredIds.filter((id, i) => registeredIds.indexOf(id) !== i).join(', ')}`,
      ).toBe(registeredIds.length);

      // Safety sections must be registered
      expect(registeredIds, 'safety_mode must be registered in safety-active session').toContain('safety_mode');
      expect(registeredIds, 'emergency_resources must be registered in safety-active session').toContain('emergency_resources');

      // All base sections must still be present
      for (const id of BASE_V12_SECTION_IDS) {
        expect(registeredIds, `required base section '${id}' must survive in Scenario B`).toContain(id);
      }

      // Default budget must not evict any section in safety scenario
      expect(capturedDiagnostic.budget_exceeded).toBe(false);

      // fallback_used must be false
      expect(capturedDiagnostic.fallback_used).toBe(false);
    });
  });

  describe('Scenario C — base session (empty entities, all base sections present)', () => {
    it('Scenario C: all base section IDs registered exactly once under default budget', async () => {
      makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
      const entities = makeEntities();

      const registeredIds = [];
      const realComposer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
      let capturedDiagnostic = null;
      const composerSpy = {
        version: realComposer.version,
        budget_chars: realComposer.budget_chars,
        registerSection: (section) => {
          registeredIds.push(section.id);
          return realComposer.registerSection(section);
        },
        finalize: (...args) => {
          const result = realComposer.finalize(...args);
          capturedDiagnostic = result.diagnostic;
          return result;
        },
      };

      await injector.buildActionFirstDemotedSessionContentAsync(
        CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, { context_composer_v2: composerSpy }
      );

      expect(capturedDiagnostic).not.toBeNull();

      // No duplicates
      const uniqueIds = new Set(registeredIds);
      expect(uniqueIds.size).toBe(registeredIds.length);

      // All base sections registered exactly once
      for (const id of BASE_V12_SECTION_IDS) {
        const count = registeredIds.filter((x) => x === id).length;
        expect(count, `section '${id}' must be registered exactly once in Scenario C, got ${count}`).toBe(1);
      }

      // Empty-entities measured output is ~69,731 chars — well within 120,000
      expect(capturedDiagnostic.budget_exceeded).toBe(false);
      expect(capturedDiagnostic.fallback_used).toBe(false);
    });
  });

  // ─── Cross-scenario section coverage ─────────────────────────────────────────
  // Assert that every section in ALL_V12_SECTION_IDS is emitted in at least
  // one scenario.  This catches new sections that are added to the injector
  // without being listed in the inventory above.

  it('cross-scenario: every section in ALL_V12_SECTION_IDS is covered by at least one scenario', async () => {
    // Scenario A (rich normal — formulation + LTS + continuity)
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const idsA = [];
    const composerA = {
      version: '2.0.0',
      budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS,
      registerSection: (s) => { idsA.push(s.id); },
      finalize: ({ fallbackRendered }) => ({ rendered: fallbackRendered ?? '', diagnostic: { fallback_used: false, parity_match: true, parity_status: CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match, budget_exceeded: false }, sections: [], version: '2.0.0' }),
    };
    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, makePopulatedEntities(), null, { context_composer_v2: composerA });

    // Scenario B (safety-active)
    const idsB = [];
    const composerB = {
      version: '2.0.0',
      budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS,
      registerSection: (s) => { idsB.push(s.id); },
      finalize: ({ fallbackRendered }) => ({ rendered: fallbackRendered ?? '', diagnostic: { fallback_used: false, parity_match: true, parity_status: CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match, budget_exceeded: false }, sections: [], version: '2.0.0' }),
    };
    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, makeEntities(), null, { context_composer_v2: composerB, crisis_signal: true });

    const allCovered = new Set([...idsA, ...idsB]);

    for (const id of ALL_V12_SECTION_IDS) {
      expect(allCovered, `section '${id}' must be emitted in at least one scenario`).toContain(id);
    }
  });

  // ─── Memory reads by purpose (purpose-specific spy contracts) ────────────────
  //
  // These tests prove memory read purpose separately using distinguishable spy
  // contracts:
  //   - LTS read: CompanionMemory.filter (ltsReaderContract.js — always uses filter)
  //   - Continuity read: CompanionMemory.list (crossSessionContinuity.js — always uses list)
  //
  // No aggregate count is used to infer purpose.

  it('memory reads by purpose: LTS canonical filter called exactly once per session start', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makePopulatedEntities();

    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});

    // The LTS canonical reader (ltsReaderContract.readLTSSnapshotWithDiagnostic)
    // uses CompanionMemory.filter exactly once per session-start chain.
    // A second call would indicate the canonical result is not being reused.
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
  });

  it('memory reads by purpose: continuity canonical list called at most twice per session start', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makePopulatedEntities();

    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});

    // Two separate callers of CompanionMemory.list exist in the V12 chain:
    //   1. buildCrossSessionContinuityBlockWithDiagnostic — builds the continuity block
    //   2. readCrossSessionContinuity — reads structured data for the strategy engine
    // Both are distinct purposes (block rendering vs strategy input).
    // A third call would indicate an unintended duplicate read.
    const listCallCount = entities.CompanionMemory.list.mock.calls.length;
    expect(
      listCallCount,
      `continuity list must be called at most twice (block + strategy), got ${listCallCount}`,
    ).toBeLessThanOrEqual(2);
  });

  it('memory reads by purpose: no duplicate LTS filter call (canonical LTS is reused)', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makePopulatedEntities();

    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});

    // filter must be called exactly once — the canonical result is threaded through
    // the delegate chain via options.canonical_memory_result so sub-calls never
    // re-read the LTS snapshot.
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
  });

  it('memory reads by purpose: empty entities has same purposeful read pattern', async () => {
    makeWindow('?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED,CONTEXT_COMPOSER_V2_ENABLED');
    const entities = makeEntities();

    await injector.buildActionFirstDemotedSessionContentAsync(CBT_THERAPIST_WIRING_STAGE2_V12, entities, null, {});

    // LTS canonical filter: exactly one call regardless of data
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);

    // Continuity list: at most two calls (block + strategy reader)
    const listCallCount = entities.CompanionMemory.list.mock.calls.length;
    expect(listCallCount, `expected at most 2 CompanionMemory.list calls, got ${listCallCount}`).toBeLessThanOrEqual(2);
  });
});

