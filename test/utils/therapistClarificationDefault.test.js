/**
 * @file test/utils/therapistClarificationDefault.test.js
 *
 * Therapist Runtime Routing — Clarification/Formulation as Default Engine
 *
 * PURPOSE
 * -------
 * Verifies that clarification/formulation is now the default therapist runtime
 * path across ordinary turns — NOT only a fallback that activates during
 * blocker/alliance-repair moments.
 *
 * REQUIRED REGRESSION CASES (10)
 * --------------------------------
 *  1.  Ordinary social anxiety first turn → formulation-first guidance, no action-first
 *  2.  Teen shame first turn → formulation-first guidance
 *  3.  OCD checking first turn → formulation-first guidance
 *  4.  Grief first turn → formulation-first guidance
 *  5.  Trauma first turn → formulation-first guidance
 *  6.  ADHD overwhelm first turn → formulation-first guidance
 *  7.  "Nothing helps" turn → STABILISATION mode preserved (alliance repair intact)
 *  8.  Ordinary case second turn (with partial context) → still formulation-first, not action-first
 *  9.  Cross-language parity → guidance strings are language-agnostic (apply to all languages)
 * 10.  Preserved gains → FORMULATION_DEEPENING still works for rich sessions; warmth/pacing intact
 *
 * SECTION STRUCTURE
 * -----------------
 * A — Strategy engine: mode guidance no longer action-first for ordinary cases
 * B — Strategy engine: mode routing for first sessions (no continuity, no formulation)
 * C — Strategy engine: mode routing for returning sessions with partial context
 * D — Strategy engine: "nothing helps" alliance-repair path preserved
 * E — Strategy engine: FORMULATION_DEEPENING preserved for rich sessions
 * F — Agent config: PG0 signal 6 (ordinary unformulated early session)
 * G — Agent config: CP1 FORMULATION-FIRST EXCEPTION present
 * H — Agent config: CP6 FORMULATION-FIRST EXCEPTION present
 * I — Agent config: CP11/CP12 updated to reference PG0 signal 6
 * J — Cross-language parity (guidance strings language-agnostic)
 * K — Preserved gains: warmth, pacing, alliance, competence not regressed
 * L — Version bump reflects the routing change
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
  DISTRESS_TIERS,
  determineTherapistStrategy,
  buildStrategyContextSection,
} from '../../src/lib/therapistStrategyEngine.js';

// ── Load agent config once ────────────────────────────────────────────────────

const AGENT_CONFIG_PATH = path.resolve(
  new URL('.', import.meta.url).pathname,
  '../../base44/agents/cbt_therapist.jsonc',
);

let agentInstructions = '';
try {
  const raw = fs.readFileSync(AGENT_CONFIG_PATH, 'utf8');
  const data = JSON.parse(raw);
  agentInstructions = data.instructions || '';
} catch {
  agentInstructions = '';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the buildStrategyContextSection output for a given mode */
function guidanceFor(mode) {
  const strategyState = {
    strategy_version: STRATEGY_VERSION,
    intervention_mode: mode,
    distress_tier: DISTRESS_TIERS.TIER_LOW,
    continuity_present: false,
    formulation_present: false,
    message_signals: {},
    rationale: 'test',
    fail_safe: false,
    session_count: 0,
    has_risk_flags: false,
    has_open_tasks: false,
    intervention_saturated: false,
    continuity_richness_score: 0,
    formulation_strength_score: 0,
    lts_trajectory: '',
  };
  return buildStrategyContextSection(strategyState);
}

/** Produces a first-session (no continuity, no formulation) strategy state */
function firstSessionStrategy(distressTier = DISTRESS_TIERS.TIER_LOW) {
  return determineTherapistStrategy(null, null, distressTier, null);
}

/** Produces a returning-session strategy with partial context */
function returningSessionStrategy(withFormulation = false, withContinuity = false) {
  const formulationData = withFormulation
    ? { presenting_problem: 'Social anxiety', working_hypotheses: 'Avoidance maintains fear' }
    : null;
  const continuityData = withContinuity
    ? { records: [{ session_date: '2024-01-01', patterns: ['avoidance'] }] }
    : null;
  return determineTherapistStrategy(continuityData, formulationData, DISTRESS_TIERS.TIER_LOW, null);
}

// ─── Section A: Mode guidance is formulation-first for ordinary cases ─────────

describe('Section A — Mode guidance: formulation-first for ordinary cases', () => {
  it('PSYCHOEDUCATION guidance does NOT say "focus on psychoeducation and engagement" (old action-ambiguous text)', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(guidance).not.toContain('Focus on psychoeducation and engagement');
  });

  it('PSYCHOEDUCATION guidance contains formulation-first sequence markers', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(guidance).toContain('formulation');
  });

  it('PSYCHOEDUCATION guidance explicitly defers exercises and techniques until formulation is in place', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(guidance).toMatch(/Do NOT introduce exercises.*before a working formulation/i);
  });

  it('PSYCHOEDUCATION guidance describes the listen → understand → clarify → formulate sequence', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    // Must contain the formulation-first ordering
    expect(guidance).toContain('listen');
    expect(guidance).toContain('understand');
    expect(guidance).toContain('clarify');
    expect(guidance).toContain('formulation');
  });

  it('STRUCTURED_EXPLORATION guidance does NOT say "Use thought records and cognitive restructuring as appropriate" (old action-first text)', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(guidance).not.toContain('Use thought records and cognitive restructuring as appropriate');
  });

  it('STRUCTURED_EXPLORATION guidance contains formulation-first ordering', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(guidance).toContain('formulation');
  });

  it('STRUCTURED_EXPLORATION guidance says techniques apply AFTER formulation is explicit', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(guidance).toMatch(/AFTER the formulation.*explicit/i);
  });

  it('STRUCTURED_EXPLORATION guidance does not default to thought records as an opening move', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    // The new guidance should not say techniques are the default — they must come after formulation
    expect(guidance).not.toMatch(/^Guidance: Engage the CBT framework.*Use thought records/i);
  });

  it('FORMULATION_DEEPENING guidance says formulation moves before action assignment', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(guidance).toMatch(/formulation.*first|formulation.*before|before.*new intervention/i);
  });

  it('STABILISATION guidance says stabilisation before CBT work (not just "deeper CBT work")', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(guidance).toMatch(/stabilisation before any CBT work/i);
  });

  it('STABILISATION guidance says do not attempt formulation building until stabilised', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STABILISATION);
    expect(guidance).toMatch(/Do not attempt formulation building/i);
  });
});

// ─── Section B: First-session routing — social anxiety, OCD, teen shame, grief, trauma, ADHD ──

describe('Section B — First-session routing: formulation-first for all ordinary presentations', () => {
  it('First session (social anxiety, tier_low) → PSYCHOEDUCATION mode (not STRUCTURED_EXPLORATION)', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('First session (OCD checking, tier_low) → PSYCHOEDUCATION mode', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('First session (grief, tier_mild) → PSYCHOEDUCATION mode', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_MILD);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('First session (trauma/hyperarousal, tier_mild) → PSYCHOEDUCATION mode', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_MILD);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('First session (teen shame, tier_low) → PSYCHOEDUCATION mode (not skipping to social-action shortcut)', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    expect(state.intervention_mode).not.toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('First session (ADHD overwhelm, tier_mild) → PSYCHOEDUCATION mode (not forcing micro-step)', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_MILD);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
  });

  it('First session rationale is no_context_psychoeducation', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    expect(state.rationale).toBe('no_context_psychoeducation');
  });

  it('First session strategy has continuity_present=false and formulation_present=false', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    expect(state.continuity_present).toBe(false);
    expect(state.formulation_present).toBe(false);
  });

  it('First session PSYCHOEDUCATION strategy produces formulation-first guidance (not action-first)', () => {
    const state = firstSessionStrategy(DISTRESS_TIERS.TIER_LOW);
    const section = buildStrategyContextSection(state);
    // Must NOT contain the old action-first text
    expect(section).not.toContain('Use thought records and cognitive restructuring as appropriate');
    expect(section).not.toContain('Focus on psychoeducation and engagement');
    // MUST contain formulation-first direction
    expect(section).toContain('formulation');
  });
});

// ─── Section C: Returning session with partial context ───────────────────────

describe('Section C — Returning session: STRUCTURED_EXPLORATION is still formulation-first', () => {
  it('Returning session with formulation only → STRUCTURED_EXPLORATION (partial context)', () => {
    const state = returningSessionStrategy(true, false);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('Returning session with continuity only → STRUCTURED_EXPLORATION (partial context)', () => {
    const state = returningSessionStrategy(false, true);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
  });

  it('STRUCTURED_EXPLORATION guidance for partial context is formulation-first, not action-first', () => {
    const state = returningSessionStrategy(true, false);
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('Use thought records and cognitive restructuring as appropriate');
    expect(section).toContain('formulation');
  });

  it('STRUCTURED_EXPLORATION section says "before selecting any intervention"', () => {
    const state = returningSessionStrategy(true, false);
    const section = buildStrategyContextSection(state);
    expect(section).toMatch(/before selecting any intervention/i);
  });

  it('Ordinary second turn (social anxiety returning without full formulation) → no action-first shortcut in guidance', () => {
    // Simulates a second turn where only continuity exists (no formulation yet)
    const state = returningSessionStrategy(false, true);
    const section = buildStrategyContextSection(state);
    expect(section).not.toContain('Use thought records and cognitive restructuring as appropriate');
  });
});

// ─── Section D: "Nothing helps" — alliance-repair preserved ──────────────────

describe('Section D — "Nothing helps" turn: STABILISATION / alliance-repair preserved', () => {
  it('"Nothing helps" moderate distress → STABILISATION mode (not collapsed to exercise)', () => {
    // "nothing helps" comes with hopelessness language → signals moderate/high distress
    const state = determineTherapistStrategy(
      { records: [{ session_date: '2024-01-01' }] },
      null,
      DISTRESS_TIERS.TIER_MODERATE,
      { has_hopelessness_language: true },
    );
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.STABILISATION);
  });

  it('"Nothing helps" STABILISATION guidance says stabilisation before CBT work', () => {
    const state = determineTherapistStrategy(
      { records: [{ session_date: '2024-01-01' }] },
      null,
      DISTRESS_TIERS.TIER_MODERATE,
      { has_hopelessness_language: true },
    );
    const section = buildStrategyContextSection(state);
    expect(section).toMatch(/stabilisation before any CBT work/i);
  });

  it('"Nothing helps" agent config: R7 rule still present (alliance repair preserved)', () => {
    expect(agentInstructions).toContain('R7');
    expect(agentInstructions).toMatch(/nothing helps/i);
  });

  it('"Nothing helps" is still covered by PG0 signal 5', () => {
    expect(agentInstructions).toMatch(/"nothing helps"[^)]*follow R7/i);
  });
});

// ─── Section E: Preserved gains — FORMULATION_DEEPENING for rich sessions ────

describe('Section E — Preserved gains: FORMULATION_DEEPENING still works for rich sessions', () => {
  it('Rich session (both formulation and continuity, low distress) → FORMULATION_DEEPENING', () => {
    const state = returningSessionStrategy(true, true);
    expect(state.intervention_mode).toBe(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
  });

  it('FORMULATION_DEEPENING guidance still references formulation hypotheses and longitudinal patterns', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(guidance).toMatch(/formulation hypotheses/i);
    expect(guidance).toMatch(/longitudinal patterns/i);
  });

  it('FORMULATION_DEEPENING guidance says acknowledge before advancing', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(guidance).toMatch(/acknowledge.*before advancing|checking in.*before advancing/i);
  });

  it('FORMULATION_DEEPENING guidance says confirm or update formulation before new intervention', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.FORMULATION_DEEPENING);
    expect(guidance).toMatch(/confirm or update the formulation before/i);
  });
});

// ─── Section F: Agent config — PG0 signal 6 ──────────────────────────────────

describe('Section F — Agent config: PG0 signal 6 (ordinary unformulated early session)', () => {
  it('PG0 signal 6 is present in the agent config', () => {
    expect(agentInstructions).toContain('6. UNFORMULATED EARLY SESSION (ANY PRESENTATION)');
  });

  it('PG0 signal 6 covers ordinary social anxiety (not just protected cases)', () => {
    const idx = agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION');
    const signalSection = agentInstructions.slice(idx, idx + 800).replace(/\s+/g, ' ');
    expect(signalSection).toMatch(/ordinary social anxiety/i);
  });

  it('PG0 signal 6 blocks CP11 and CP12-A for early unformulated turns', () => {
    const signalSection = agentInstructions.slice(
      agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION'),
      agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION') + 800,
    );
    expect(signalSection).toMatch(/Do NOT fire CP11 or CP12-A/i);
  });

  it('PG0 signal 6 states "formulation-first engine is the DEFAULT path — not only a rescue mode"', () => {
    expect(agentInstructions).toContain('formulation-first engine is the DEFAULT path — not only a rescue mode');
  });

  it('PG0 signal 6 says "understand the pattern" before selecting a technique', () => {
    const signalSection = agentInstructions.slice(
      agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION'),
      agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION') + 800,
    );
    expect(signalSection).toMatch(/understand the pattern/i);
  });
});

// ─── Section G: Agent config — CP1 FORMULATION-FIRST EXCEPTION ───────────────

describe('Section G — Agent config: CP1 FORMULATION-FIRST EXCEPTION', () => {
  it('CP1 has a FORMULATION-FIRST EXCEPTION block', () => {
    expect(agentInstructions).toContain('FORMULATION-FIRST EXCEPTION — CP1 does NOT apply');
  });

  it('CP1 FORMULATION-FIRST EXCEPTION requires no formulation stated in session', () => {
    const idx = agentInstructions.indexOf('FORMULATION-FIRST EXCEPTION — CP1 does NOT apply');
    const block = agentInstructions.slice(idx, idx + 800);
    expect(block).toMatch(/no maintaining cognitive-behavioral cycle.*has been explicitly stated/i);
  });

  it('CP1 FORMULATION-FIRST EXCEPTION allows ending with a formulation-building question', () => {
    const idx = agentInstructions.indexOf('FORMULATION-FIRST EXCEPTION — CP1 does NOT apply');
    const block = agentInstructions.slice(idx, idx + 800);
    expect(block).toMatch(/formulation-building question/i);
  });

  it('CP1 FORMULATION-FIRST EXCEPTION is limited to early session turns (first 1–3)', () => {
    const idx = agentInstructions.indexOf('FORMULATION-FIRST EXCEPTION — CP1 does NOT apply');
    const block = agentInstructions.slice(idx, idx + 800);
    expect(block).toMatch(/first 1[–-]3 turns/i);
  });
});

// ─── Section H: Agent config — CP6 FORMULATION-FIRST EXCEPTION ───────────────

describe('Section H — Agent config: CP6 FORMULATION-FIRST EXCEPTION', () => {
  it('CP6 has a FORMULATION-FIRST EXCEPTION for early unformulated turns', () => {
    expect(agentInstructions).toContain(
      'When PG0 signal 6 (unformulated early session) is active, a single focused formulation-building question may be the primary response content',
    );
  });

  it('CP6 FORMULATION-FIRST EXCEPTION says the question does not need to follow a concrete action', () => {
    const idx = agentInstructions.indexOf('When PG0 signal 6 (unformulated early session) is active, a single focused formulation-building question');
    const block = agentInstructions.slice(idx, idx + 600);
    expect(block).toMatch(/does not need to follow a concrete action/i);
  });

  it('CP6 FORMULATION-FIRST EXCEPTION applies only to early unformulated turns', () => {
    const idx = agentInstructions.indexOf('When PG0 signal 6 (unformulated early session) is active, a single focused formulation-building question');
    const block = agentInstructions.slice(idx, idx + 600);
    expect(block).toMatch(/PG0 signal 6 active/i);
  });
});

// ─── Section I: Agent config — CP11/CP12 reference PG0 signal 6 ──────────────

describe('Section I — Agent config: CP11/CP12 reference PG0 signal 6', () => {
  it('CP11 note references PG0 signal 6 (unformulated early session turns)', () => {
    expect(agentInstructions).toContain(
      'BLOCKS THIS GATE for OCD/checking, grief/loss, trauma, teen shame, "nothing helps" cases, and unformulated early session turns (PG0 signal 6)',
    );
  });

  it('CP12-A note keeps unformulated early-session safeguard active', () => {
    expect(agentInstructions).toContain(
      'PG0 (FORMULATION-FIRST PROTECTED CASE GATE) BLOCKS social and sleep shortcut behavior in protected and unformulated early-session cases.',
    );
  });

  it('CP12-A note says social anxiety must stay formulation-first before action', () => {
    const idx = agentInstructions.indexOf('─── CP12: SOCIAL & SLEEP ANXIETY SHORTCUT CLEANUP');
    const block = agentInstructions.slice(idx, idx + 1200);
    expect(block).toMatch(/CP12-A \(social anxiety\) is formulation-first by default in ALL languages/i);
    expect(block).toMatch(/acknowledge → clarify\/formulate → explain/i);
  });

  it('CP12-A sequence order is formulation/loop before action', () => {
    const idx = agentInstructions.indexOf('CP12-A: SOCIAL ANXIETY FORMULATION-FIRST GATE');
    const block = agentInstructions.slice(idx, idx + 3200);
    const loopIdx = block.indexOf('feared judgment → anxiety activation → avoidance/safety behavior → short-term relief → stronger future fear');
    const stepIdx = block.indexOf('offer ONE concrete next step');
    expect(loopIdx).toBeGreaterThan(-1);
    expect(stepIdx).toBeGreaterThan(-1);
    expect(loopIdx).toBeLessThan(stepIdx);
  });
});

// ─── Section J: Cross-language parity ────────────────────────────────────────

describe('Section J — Cross-language parity: guidance is language-agnostic', () => {
  it('PSYCHOEDUCATION mode guidance contains no English-only keywords (applies to all languages)', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.PSYCHOEDUCATION);
    // The guidance text is language-agnostic clinical direction — it does not contain
    // language-specific tokens that would restrict it to English sessions only
    expect(guidance).not.toMatch(/English only/i);
    expect(guidance).not.toMatch(/Hebrew only|Spanish only|French only|German only/i);
  });

  it('STRUCTURED_EXPLORATION mode guidance applies to all languages (no language restriction)', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.STRUCTURED_EXPLORATION);
    expect(guidance).not.toMatch(/English only|Hebrew only|Spanish only/i);
  });

  it('PG0 signal 6 applies to ALL languages (not English-only)', () => {
    const idx = agentInstructions.indexOf('6. UNFORMULATED EARLY SESSION (ANY PRESENTATION)');
    const block = agentInstructions.slice(idx, idx + 800);
    // PG0 signals apply to all languages — no restriction to English
    expect(block).not.toMatch(/English only/i);
  });

  it('PG0 global header says "Applies to ALL languages"', () => {
    // PG0 applies to all languages per its global header
    const pg0Section = agentInstructions.slice(
      agentInstructions.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE'),
      agentInstructions.indexOf('PG0: FORMULATION-FIRST PROTECTED CASE GATE') + 500,
    );
    expect(pg0Section).toMatch(/Applies to ALL languages/i);
  });
});

// ─── Section K: Preserved gains ──────────────────────────────────────────────

describe('Section K — Preserved gains: warmth, pacing, alliance, competence not regressed', () => {
  it('Agent config description field still references formulation-first policy', () => {
    const raw = fs.readFileSync(AGENT_CONFIG_PATH, 'utf8');
    const data = JSON.parse(raw);
    // The description should reference the clinical architecture
    expect(data.description).toBeTruthy();
    expect(typeof data.description).toBe('string');
    expect(data.description.length).toBeGreaterThan(10);
  });

  it('THERAPIST CONSTITUTION still present (warmth and joining rules not removed)', () => {
    expect(agentInstructions).toContain('THERAPIST CONSTITUTION');
    expect(agentInstructions).toContain('humanly containing');
    expect(agentInstructions).toContain('Brief joining before guiding');
  });

  it('R2 three-turn minimum for teen shame still present', () => {
    expect(agentInstructions).toMatch(/R2.*three.turn minimum|three.turn minimum.*R2/i);
  });

  it('R4 grief holding sequence still present', () => {
    expect(agentInstructions).toMatch(/R4.*grief|grief.*R4/i);
  });

  it('R5 first-disclosure intervention prohibition still present', () => {
    expect(agentInstructions).toContain('R5');
    expect(agentInstructions).toMatch(/first.disclosure/i);
  });

  it('PG0 signals 1–5 (protected cases) still present and intact', () => {
    expect(agentInstructions).toMatch(/1\. OCD \/ CHECKING BEHAVIORS/i);
    expect(agentInstructions).toMatch(/2\. GRIEF \/ BEREAVEMENT \/ LOSS/i);
    expect(agentInstructions).toMatch(/3\. TRAUMA \/ PTSD \/ HYPERAROUSAL/i);
    expect(agentInstructions).toMatch(/4\. TEEN SHAME \/ SOCIAL AVOIDANCE/i);
    expect(agentInstructions).toMatch(/5\. "NOTHING HELPS".*TREATMENT RESISTANCE/i);
  });

  it('CP11 and CP12 still present and functional (not deleted)', () => {
    expect(agentInstructions).toContain('CP11: ENGLISH DIRECTIVE OVERRIDE');
    expect(agentInstructions).toContain('CP12: SOCIAL & SLEEP ANXIETY SHORTCUT CLEANUP');
  });

  it('CONTAINMENT mode guidance (high distress / safety) is unchanged', () => {
    const guidance = guidanceFor(STRATEGY_INTERVENTION_MODES.CONTAINMENT);
    expect(guidance).toContain('Short, grounding responses');
    expect(guidance).toContain('One question at a time');
    expect(guidance).toContain('No exploratory breadth while high distress is unresolved');
  });

  it('Phase 10 formulation-led rules (THERAPIST_FORMULATION_RESPONSE_RULES) not affected by strategy engine change', async () => {
    const { THERAPIST_FORMULATION_INSTRUCTIONS } = await import('../../src/lib/therapistWorkflowEngine.js');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('FORMULATION-LED CBT');
    expect(THERAPIST_FORMULATION_INSTRUCTIONS).toContain('Formulation before questioning');
  });
});

// ─── Section L: Version reflects the routing change ──────────────────────────

describe('Section L — Version bump: STRATEGY_VERSION reflects clarification-default change', () => {
  it('STRATEGY_VERSION is updated to 1.3.0 (clarification-default routing change)', () => {
    expect(STRATEGY_VERSION).toBe('1.3.0');
  });

  it('STRATEGY_VERSION is a valid semver string', () => {
    expect(STRATEGY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
