/**
 * Therapist outcome review — specific intervention nonresponse calibration.
 *
 * A single bounded step with little or no immediate symptom change is not the
 * same clinical signal as global "nothing helps" hopelessness or alliance
 * strain. These assertions keep the first review turn collaborative, causal-
 * uncertainty aware, and free of a forced replacement exercise.
 */

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const AGENT_CONFIG_PATH = path.resolve(
  process.cwd(),
  'base44/agents/cbt_therapist.jsonc',
);

const agentInstructions = JSON.parse(
  fs.readFileSync(AGENT_CONFIG_PATH, 'utf8'),
).instructions;

function sectionBetween(start, end) {
  const startIndex = agentInstructions.indexOf(start);
  const endIndex = agentInstructions.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid instruction section: ${start} → ${end}`);
  }
  return agentInstructions.slice(startIndex, endIndex);
}

describe('specific intervention nonresponse calibration', () => {
  const r8 = sectionBetween(
    'R8: SPECIFIC INTERVENTION NONRESPONSE / OUTCOME CALIBRATION',
    '========== PHASE 3 COMPETENCE ARCHITECTURE ==========',
  );

  it('defines a cross-language R8 path for one bounded intervention result', () => {
    expect(r8).toContain('Applies to ALL languages');
    expect(r8).toContain('ONE bounded step produced little/no immediate change');
    expect(r8).toContain('This is outcome data, not resistance');
  });

  it('keeps a single unchanged result distinct from global nothing-helps strain', () => {
    const pg0 = sectionBetween(
      'PG0: FORMULATION-FIRST PROTECTED CASE GATE',
      'CP11: ENGLISH DIRECTIVE OVERRIDE',
    );
    expect(pg0).toContain(
      'One bounded step producing little or no immediate change is NOT this signal by itself',
    );
    expect(pg0).toContain(
      'Use R8 unless the person generalizes to overall hopelessness, treatment failure, or alliance strain',
    );
  });

  it('requires known-versus-unknown separation before causal interpretation', () => {
    expect(r8).toContain('Separate known from unknown');
    expect(r8).toContain('one result cannot establish cause');
    expect(r8).toContain('Use tentative hypotheses');
    expect(r8).toContain('PROHIBITED: causal certainty');
  });

  it('distinguishes process targets from immediate symptom outcomes', () => {
    expect(r8).toContain('Distinguish proximal process');
    expect(r8).toContain('immediate symptom change');
    expect(r8).toContain('never redefine success silently after the fact');
  });

  it('calibrates behavioral activation without promising immediate mood change', () => {
    expect(r8).toContain('BEHAVIORAL ACTIVATION:');
    expect(r8).toContain('completion at low energy is process data');
    expect(r8).toContain('one result cannot distinguish these');
    expect(r8).toContain('make immediate mood improvement the only success criterion');
  });

  it('prohibits a forced replacement exercise on the first review turn', () => {
    expect(r8).toContain('not defense or automatic replacement');
    expect(r8).toContain('Give no new exercise on this turn');
    expect(r8).toContain('R8 overrides automatic A→B→C→D→E progression');
  });

  it('permits at most one focused outcome-calibration question', () => {
    expect(r8).toContain('Ask at most ONE focused question');
    expect(r8).toContain('only if it materially changes the decision');
  });

  it('updates L3 so outcome review can hold progression and a new exercise', () => {
    const hierarchy = sectionBetween(
      'L3 OUTCOME REVIEW',
      'L4 BLOCKER RESOLUTION',
    );
    expect(hierarchy).toContain('EXCEPT when R8 specific intervention');
    expect(hierarchy).toContain('hold D/E until the target, expectation, and actual response');
    expect(hierarchy).toContain('do not force a new exercise');
  });

  it('updates no_clear_change to review before repeat/refine/switch', () => {
    const outcomes = sectionBetween(
      '========== STRUCTURED OUTCOME PATTERNS (ALL LANGUAGES) ==========',
      '========== DRIVING ANXIETY — OUTCOME REQUIREMENTS ==========',
    );
    expect(outcomes).toContain('unless R8 is active');
    expect(outcomes).toContain('First review turn: D is provisional/held');
    expect(outcomes).toContain('E is omitted when fit is unclear');
    expect(outcomes).toContain('After collaborative review');
  });

  it('adds a final QA check for causal certainty and symptom-only scoring', () => {
    expect(agentInstructions).toContain(
      'CP15. One bounded intervention produced no immediate change or felt mismatched?',
    );
    expect(agentInstructions).toContain(
      'no causal certainty, no immediate symptom-only success test, and no forced new exercise',
    );
  });

  it('preserves safety precedence', () => {
    expect(r8).toContain('It does not override safety behavior');
  });
});
