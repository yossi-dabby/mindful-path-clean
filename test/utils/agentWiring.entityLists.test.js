/**
 * Entity-list regression guard for src/api/agentWiring.js.
 *
 * These tests act as "snapshot" guards: they will fail if the entity lists
 * in any wiring config change unexpectedly.  The expected arrays are
 * hardcoded from the current (committed) state of agentWiring.js.
 *
 * One describe block per exported config, each asserting deep equality
 * between tool_configs.map(tc => tc.entity_name) and the committed list.
 *
 * No production code is modified; no external services are called.
 */

import { describe, it, expect } from 'vitest';
import {
  CBT_THERAPIST_WIRING_STEP_1,
  AI_COMPANION_WIRING_STEP_1,
  CBT_THERAPIST_WIRING_STEP_2,
  AI_COMPANION_WIRING_STEP_2,
  CBT_THERAPIST_WIRING_STEP_3,
  AI_COMPANION_WIRING_STEP_3,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function entityNames(wiring) {
  return (wiring?.tool_configs || []).map((tc) => tc.entity_name);
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

describe('CBT_THERAPIST_WIRING_STEP_1 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_1)).toEqual([
      'SessionSummary',
      'ThoughtJournal',
      'Goal',
      'CoachingSession',
    ]);
  });
});

describe('AI_COMPANION_WIRING_STEP_1 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_1)).toEqual([
      'CompanionMemory',
      'MoodEntry',
    ]);
  });
});

// ─── Step 2 ───────────────────────────────────────────────────────────────────

describe('CBT_THERAPIST_WIRING_STEP_2 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_2)).toEqual([
      'SessionSummary',
      'ThoughtJournal',
      'Goal',
      'CoachingSession',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
    ]);
  });
});

describe('AI_COMPANION_WIRING_STEP_2 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_2)).toEqual([
      'CompanionMemory',
      'MoodEntry',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
    ]);
  });
});

// ─── Step 3 ───────────────────────────────────────────────────────────────────

describe('CBT_THERAPIST_WIRING_STEP_3 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_STEP_3)).toEqual([
      'SessionSummary',
      'ThoughtJournal',
      'Goal',
      'CoachingSession',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
      'CompanionMemory',
      'MoodEntry',
    ]);
  });
});

describe('AI_COMPANION_WIRING_STEP_3 — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(AI_COMPANION_WIRING_STEP_3)).toEqual([
      'CompanionMemory',
      'MoodEntry',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
      'Goal',
      'SessionSummary',
    ]);
  });
});

// ─── Hybrid ───────────────────────────────────────────────────────────────────

describe('CBT_THERAPIST_WIRING_HYBRID — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(CBT_THERAPIST_WIRING_HYBRID)).toEqual([
      'SessionSummary',
      'ThoughtJournal',
      'Goal',
      'CoachingSession',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
      'CompanionMemory',
      'MoodEntry',
      'CaseFormulation',
      'Conversation',
    ]);
  });
});

describe('AI_COMPANION_WIRING_HYBRID — entity list regression guard', () => {
  it('contains exactly the committed entity list in order', () => {
    expect(entityNames(AI_COMPANION_WIRING_HYBRID)).toEqual([
      'CompanionMemory',
      'MoodEntry',
      'Exercise',
      'Resource',
      'AudioContent',
      'Journey',
      'Goal',
      'SessionSummary',
      'Conversation',
    ]);
  });
});
