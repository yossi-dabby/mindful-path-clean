/**
 * @file test/meta/wave2eV8Readiness.test.js
 *
 * Wave 2E — V8 Therapeutic Strategy Activation Readiness Hardening
 *
 * PURPOSE
 * -------
 * Validates the Wave 2E production-readiness hardening of the V8 therapeutic
 * strategy layer.  These tests exercise only PRESERVED, additive behavior and
 * never enable any feature flag by default.  They confirm:
 *
 *   1. ROUTING — the diagnostic route hint and runtime capability snapshot
 *      report the V8 (strategy) wiring with correct precedence relative to
 *      V7 and V9+.
 *   2. CURRENT MESSAGE — the genuine current user message reaches the strategy
 *      calculation via options.message_text, an empty session start invents no
 *      distress, and raw message text never appears in strategy output or in
 *      the diagnostic snapshot.
 *   3. HISTORICAL SAFETY — historical risk context is treated as historical
 *      only: it never causes containment, never raises the current distress
 *      tier, and never drives a deeper/more active treatment posture.  Current
 *      distress still governs containment / stabilisation.
 *   4. STRATEGY / ACTION — response posture (intervention mode) is separate from
 *      action permission (action_permitted).  Posture is not authorised to act
 *      unless readiness is genuinely confirmed.
 *   5. LANGUAGE — deterministic English AND Hebrew message-signal parity, with
 *      negation resistance.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT enable any feature flag; all flags remain at default (false).
 * - Does NOT import from functions/ (Deno runtime code).
 * - Does NOT publish Base44 or mutate any schema.
 * - Tests are deterministic and use only mock entity clients.
 *
 * Source of truth: V8-A Therapeutic Strategy Layer readiness hardening spec.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  MESSAGE_SIGNAL_KEYS,
  extractMessageSignals,
  scoreDistressTier,
  determineTherapistStrategy,
  buildStrategyContextSection,
  buildStrategyDiagnosticSnapshot,
  extractLTSStrategyInputs,
} from '../../src/lib/therapistStrategyEngine.js';

import {
  buildPlannerContext,
  applyStrategyPrecedenceGuard,
  buildV7SessionStartContentAsync,
  buildV8SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  getStage2DiagnosticPayload,
  getActivationDiagnostics,
} from '../../src/lib/featureFlags.js';

import {
  buildRuntimeCapabilitySnapshot,
} from '../../src/lib/runtimeCapabilityDiagnostic.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V8,
} from '../../src/api/agentWiring.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stubs window.location with the given search and hostname (localhost qualifies
 * as a preview/staging host, so the ?_s2= override is honoured).
 */
function withWindow(search, fn, hostname = 'localhost') {
  vi.stubGlobal('window', { location: { search, hostname } });
  try {
    return fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

/**
 * Creates a mock Base44 entity client that simulates an empty data store.
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

function makeMockBaseClient() {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({ result: '' }),
    },
  };
}

/** A rich, usable CaseFormulation fixture. */
const RICH_FORMULATION = Object.freeze({
  presenting_problem: 'Persistent work-related anxiety and catastrophising',
  core_belief: 'I am fundamentally incompetent',
  maintaining_cycle: 'Avoidance → missed deadlines → confirmation of belief',
  treatment_goals: 'Challenge core belief and build tolerance for uncertainty',
});

/** Continuity records with NO risk flags. */
const CONTINUITY_NO_RISK = Object.freeze({
  records: [
    { session_summary: 'Session 1', core_patterns: ['catastrophising'], risk_flags: [], follow_up_tasks: [] },
    { session_summary: 'Session 2', core_patterns: ['mind-reading'], risk_flags: [], follow_up_tasks: [] },
  ],
});

/** Continuity records WITH historical risk flags. */
const CONTINUITY_WITH_RISK = Object.freeze({
  records: [
    { session_summary: 'Session 1', risk_flags: ['self_harm_ideation'], follow_up_tasks: [] },
    { session_summary: 'Session 2', risk_flags: ['passive_suicidal_ideation'], follow_up_tasks: [] },
  ],
});

const NEUTRAL_SIGNALS = Object.freeze(extractMessageSignals('Just checking in about my week.'));

afterEach(() => {
  vi.unstubAllGlobals();
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTING
// ══════════════════════════════════════════════════════════════════════════════

describe('Wave 2E — Routing precedence and diagnostics', () => {
  it('master gate off + strategy on → HYBRID (no upgrade path)', () => {
    withWindow('?_s2debug=true&_s2=THERAPIST_UPGRADE_STRATEGY_ENABLED', () => {
      const p = getStage2DiagnosticPayload();
      expect(p).not.toBeNull();
      expect(p.routeHint).toBe('HYBRID (master gate off)');
    });
  });

  it('master + strategy (V9–V12 off) → STAGE2_V8 (strategy)', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_STRATEGY_ENABLED',
      () => {
        const p = getStage2DiagnosticPayload();
        expect(p.routeHint).toBe('STAGE2_V8 (strategy)');
      },
    );
  });

  it('strategy off + continuity on → STAGE2_V7 (continuity)', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_CONTINUITY_ENABLED',
      () => {
        const p = getStage2DiagnosticPayload();
        expect(p.routeHint).toBe('STAGE2_V7 (continuity)');
      },
    );
  });

  it('V9 (strategy + longitudinal) retains precedence over V8', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_STRATEGY_ENABLED,THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
      () => {
        const p = getStage2DiagnosticPayload();
        expect(p.routeHint).toBe('STAGE2_V9 (LTS injection)');
      },
    );
  });

  it('activation diagnostics therapist route hint reports V8', () => {
    withWindow(
      '?_s2debug=true&_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_STRATEGY_ENABLED',
      () => {
        const p = getActivationDiagnostics();
        expect(p).not.toBeNull();
        expect(p.therapist.routeHint).toBe('STAGE2_V8 (strategy)');
      },
    );
  });

  it('runtime capability snapshot reports the V8 wiring', () => {
    const snap = buildRuntimeCapabilitySnapshot({
      getTherapistWiring: () => CBT_THERAPIST_WIRING_STAGE2_V8,
    });
    expect(snap.selected_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V8');
  });

  it('diagnostics never expose feature flags as enabled by default', () => {
    withWindow('?_s2debug=true', () => {
      const p = getStage2DiagnosticPayload();
      // No _s2 override → every computed flag is false (production default).
      for (const value of Object.values(p.computedFlags)) {
        expect(value).toBe(false);
      }
      expect(p.masterGateOn).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CURRENT MESSAGE PLUMBING
// ══════════════════════════════════════════════════════════════════════════════

describe('Wave 2E — Current message reaches strategy calculation', () => {
  const wiring = CBT_THERAPIST_WIRING_STAGE2_V8;

  it('a genuine distressed current message shapes the strategy posture', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();
    const section = await buildV8SessionStartContentAsync(wiring, entities, baseClient, {
      message_text: 'I feel completely hopeless and nothing will ever get better',
    });
    // Current high-distress message → CONTAINMENT posture.
    expect(section).toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(section).toContain(DISTRESS_TIERS.TIER_HIGH);
  });

  it('an empty session start invents no current distress', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();
    const section = await buildV8SessionStartContentAsync(wiring, entities, baseClient, {
      message_text: '',
    });
    // No message, no context → warm psychoeducation at low tier, not containment.
    expect(section).toContain(DISTRESS_TIERS.TIER_LOW);
    expect(section).not.toContain(DISTRESS_TIERS.TIER_HIGH);
    expect(section).not.toContain(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('raw current message text never appears in the strategy section', async () => {
    const entities = makeEmptyEntities();
    const baseClient = makeMockBaseClient();
    const secret = 'my neighbour Jane at 42 Elm Street';
    const section = await buildV8SessionStartContentAsync(wiring, entities, baseClient, {
      message_text: `I feel anxious about ${secret}`,
    });
    expect(section).not.toContain(secret);
    expect(section).not.toContain('Jane');
    expect(section).not.toContain('Elm Street');
  });

  it('raw current message text never appears in the diagnostic snapshot', () => {
    const secret = 'confidential phrase unique-token-9271';
    const signals = extractMessageSignals(`I am overwhelmed ${secret}`);
    const state = determineTherapistStrategy(null, null, DISTRESS_TIERS.TIER_MODERATE, signals);
    const snap = buildStrategyDiagnosticSnapshot(state);
    const serialised = JSON.stringify(snap);
    expect(serialised).not.toContain(secret);
    expect(serialised).not.toContain('unique-token-9271');
    // message_signals are deliberately omitted from the snapshot.
    expect(snap).not.toHaveProperty('message_signals');
  });

  it('empty message extracts no distress signals', () => {
    const signals = extractMessageSignals('');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_DISTRESS_LANGUAGE]).toBe(false);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(false);
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_EMOTIONAL_LANGUAGE]).toBe(false);
    expect(scoreDistressTier(null, signals)).toBe(DISTRESS_TIERS.TIER_LOW);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// HISTORICAL SAFETY SEMANTICS
// ══════════════════════════════════════════════════════════════════════════════

describe('Wave 2E — Historical safety context is historical only', () => {
  it('historical risk alone does not cause containment', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('historical risk yields a conservative (not deeper) posture', () => {
    // Continuity risk + formulation + low distress → STABILISATION, never a
    // deeper FORMULATION_DEEPENING posture driven by historical risk richness.
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(state.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('historical risk does not raise the current distress tier', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.distress_tier).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('longitudinal risk history with a progressing arc does not force stabilisation', () => {
    // LTS risk history but progressing arc + no current continuity risk +
    // formulation + low distress → FORMULATION_DEEPENING (D2 guard exempts
    // progressing clients).  History alone does not downgrade the posture.
    const ltsInputs = extractLTSStrategyInputs({
      lts_version: '1',
      memory_type: 'lts',
      session_count: 6,
      trajectory: 'progressing',
      risk_flag_history: ['past_flag'],
    });
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
      ltsInputs,
    );
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(state.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('diagnostic snapshot exposes no raw risk labels', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const snap = buildStrategyDiagnosticSnapshot(state);
    const serialised = JSON.stringify(snap);
    expect(serialised).not.toContain('self_harm_ideation');
    expect(serialised).not.toContain('passive_suicidal_ideation');
    // Historical context is surfaced only as a bounded boolean.
    expect(typeof snap.historical_safety_context_present).toBe('boolean');
    expect(snap.historical_safety_context_present).toBe(true);
  });

  it('context section never describes historical risk as currently active', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_WITH_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const section = buildStrategyContextSection(state);
    // Must NOT assert bare "Risk flags: active".
    expect(/Risk flags\s*:\s*active\b/i.test(section)).toBe(false);
    // Must include the historical-only framing and the non-inference reminder.
    expect(section).toContain('historical context only');
    expect(section).toContain('Historical safety context is present');
  });

  it('current crisis still causes containment', () => {
    const signals = extractMessageSignals('everything is ruined, my life is over, no way back');
    const tier = scoreDistressTier(null, signals);
    const state = determineTherapistStrategy(CONTINUITY_WITH_RISK, RICH_FORMULATION, tier, signals);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
  });

  it('current moderate distress causes stabilisation', () => {
    const signals = extractMessageSignals('I feel so overwhelmed and panicking right now');
    const tier = scoreDistressTier(null, signals);
    expect(tier).toBe(DISTRESS_TIERS.TIER_MODERATE);
    const state = determineTherapistStrategy(null, null, tier, signals);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// STRATEGY / ACTION SEPARATION
// ══════════════════════════════════════════════════════════════════════════════

describe('Wave 2E — Response posture is separate from action permission', () => {
  it('partial context can remain structured exploration with action blocked', () => {
    // Continuity only (no formulation, no open tasks) → STRUCTURED_EXPLORATION.
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      null,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    // The pure engine never authorises a concrete action on its own.
    const snap = buildStrategyDiagnosticSnapshot(state);
    expect(snap.action_permitted).toBe(false);
  });

  it('formulation + continuity can remain formulation deepening with action blocked', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    const snap = buildStrategyDiagnosticSnapshot(state);
    expect(snap.action_permitted).toBe(false);
  });

  it('an unauthorised action does not downgrade the deepening posture', () => {
    // Posture (formulation_deepening) stands even though action is not permitted;
    // the engine does not force stabilisation merely to block an action.
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    expect(state.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(buildStrategyDiagnosticSnapshot(state).action_permitted).toBe(false);
  });

  it('confirmed readiness can permit one appropriate action', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const ctx = buildPlannerContext(RICH_FORMULATION, null, DISTRESS_TIERS.TIER_LOW, {
      has_been_understood: true,
      readiness_signal: true,
      rationale_is_clear: true,
    });
    const guarded = applyStrategyPrecedenceGuard(state, ctx);
    expect(guarded.action_permitted).toBe(true);
    // Posture is preserved (an action-capable mode remains).
    expect(guarded.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('an unready session keeps action blocked', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const ctx = buildPlannerContext(RICH_FORMULATION, null, DISTRESS_TIERS.TIER_LOW, {
      has_been_understood: true,
      intervention_ready: false,
    });
    const guarded = applyStrategyPrecedenceGuard(state, ctx);
    expect(guarded.action_permitted).toBe(false);
  });

  it('the section frames a blocked action as holding / reflection only', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('holding');
  });

  it('a theme the user set aside is not revived by the usage contract', () => {
    const state = determineTherapistStrategy(
      CONTINUITY_NO_RISK,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    const section = buildStrategyContextSection(state);
    expect(section).toContain('set aside must not be revived');
  });

  it('a saturated prior intervention is not automatically repeated', () => {
    const saturated = {
      records: [
        { session_summary: 's1', interventions_used: ['thought_record'], core_patterns: ['x'], risk_flags: [], follow_up_tasks: [] },
        { session_summary: 's2', interventions_used: ['thought_record'], risk_flags: [], follow_up_tasks: [] },
        { session_summary: 's3', interventions_used: ['thought_record'], risk_flags: [], follow_up_tasks: [] },
      ],
    };
    const state = determineTherapistStrategy(
      saturated,
      RICH_FORMULATION,
      DISTRESS_TIERS.TIER_LOW,
      NEUTRAL_SIGNALS,
    );
    // Repetition is broken by moving to structured exploration for variety.
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(state.intervention_saturated).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SIGNAL PARITY (ENGLISH / HEBREW)
// ══════════════════════════════════════════════════════════════════════════════

describe('Wave 2E — English/Hebrew signal parity and negation resistance', () => {
  const tierOf = (text) => scoreDistressTier(null, extractMessageSignals(text));

  it('neutral English and Hebrew → low', () => {
    expect(tierOf('Just wanted to check in about scheduling.')).toBe(DISTRESS_TIERS.TIER_LOW);
    expect(tierOf('רק רציתי לעדכן לגבי הפגישה הבאה')).toBe(DISTRESS_TIERS.TIER_LOW);
  });

  it('ordinary emotional English and Hebrew → mild', () => {
    expect(tierOf('I feel sad and a bit stressed today.')).toBe(DISTRESS_TIERS.TIER_MILD);
    expect(tierOf('אני מרגיש עצוב ולחוץ')).toBe(DISTRESS_TIERS.TIER_MILD);
  });

  it('elevated (non-severe) Hebrew distress → moderate', () => {
    expect(tierOf('אני מוצף ולא מצליח לחשוב')).toBe(DISTRESS_TIERS.TIER_MODERATE);
  });

  it('clear hopelessness English and Hebrew → high', () => {
    expect(tierOf('There is no hope left at all and nothing will ever get better.')).toBe(
      DISTRESS_TIERS.TIER_HIGH,
    );
    expect(tierOf('אין שום תקווה ושום דבר לא ישתפר')).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('shutdown / collapse English and Hebrew → high', () => {
    expect(tierOf('I am completely broken and falling apart.')).toBe(DISTRESS_TIERS.TIER_HIGH);
    expect(tierOf('אני מתפרק ולא מסוגל לתפקד')).toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('obvious Hebrew negation is handled (not hopelessness)', () => {
    const signals = extractMessageSignals('אני לא מרגיש חסר תקווה');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(false);
    // Still ordinary emotional language → mild, never high.
    expect(scoreDistressTier(null, signals)).not.toBe(DISTRESS_TIERS.TIER_HIGH);
  });

  it('affirmed Hebrew hopelessness is detected', () => {
    const signals = extractMessageSignals('אני חסר תקווה');
    expect(signals[MESSAGE_SIGNAL_KEYS.HAS_HOPELESSNESS_LANGUAGE]).toBe(true);
    expect(scoreDistressTier(null, signals)).toBe(DISTRESS_TIERS.TIER_HIGH);
  });
});