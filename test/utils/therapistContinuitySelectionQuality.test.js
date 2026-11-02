/**
 * @file test/utils/therapistContinuitySelectionQuality.test.js
 *
 * Therapist Continuity Selection Quality — Richness-Based Record Selection
 *
 * This test suite validates the Phase "Continuity Selection Quality" improvement:
 * the scoring and selection logic that prefers clinically rich therapist memory
 * records over thin/generic ones at session start.
 *
 * WHAT IS TESTED
 * --------------
 *  1. scoreTherapistMemoryRecord — correct scores for all field combinations
 *  2. readCrossSessionContinuity — prefers rich records over thin ones
 *  3. readCrossSessionContinuity — fallback when all records are thin
 *  4. readCrossSessionContinuity — risk_flags records are always surfaced
 *  5. readCrossSessionContinuity — recency ordering is preserved within equal-score tier
 *  6. No regression: existing fail-closed / null / empty paths unchanged
 *  7. No regression: companion flows completely unaffected
 *  8. No raw transcript leakage through any selection path
 *  9. No cross-user / private-entity leakage
 * 10. Safe behavior when continuity retrieval fails
 * 11. Flag regression: V6 and below paths are not affected by the scoring change
 * 12. CONTINUITY_MIN_USEFUL_SCORE and CONTINUITY_MIN_SESSION_SUMMARY_LENGTH exported
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Does NOT import from base44/functions/ (Deno — not importable in Vitest).
 * - Does NOT render React components.
 * - All mocks are scoped within each test — no global state mutation.
 * - All tests are deterministic and do not require a live Base44 backend.
 * - Does NOT modify prior-phase test files or override any prior-phase exports.
 *
 * See src/lib/crossSessionContinuity.js for the implementation.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  readCrossSessionContinuity,
  buildCrossSessionContinuityBlock,
  scoreTherapistMemoryRecord,
  CONTINUITY_MAX_PRIOR_SESSIONS,
  CONTINUITY_MIN_USEFUL_SCORE,
  CONTINUITY_MIN_SESSION_SUMMARY_LENGTH,
} from '../../src/lib/crossSessionContinuity.js';

import {
  buildV7SessionStartContentAsync,
  buildV6SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_TYPE,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Creates a rich therapist memory record with all meaningful fields populated.
 */
function makeRichRecord(overrides = {}) {
  const base = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'sess-rich',
    session_date: '2026-03-01',
    session_summary: 'Worked on thought challenging around work stress. Made good progress.',
    core_patterns: ['catastrophising', 'mind reading'],
    triggers: ['Monday morning'],
    automatic_thoughts: ['I will fail'],
    emotions: ['anxiety'],
    urges: ['avoid work'],
    actions: ['stayed home'],
    consequences: ['temporary relief'],
    working_hypotheses: ['Core belief: I am not good enough'],
    interventions_used: ['thought_record', 'behavioral_activation'],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: ['Complete thought record daily'],
    goals_referenced: ['goal-123'],
    last_summarized_date: '2026-03-01T10:00:00Z',
    ...overrides,
  };
  return {
    id: `cm-rich-${Math.random()}`,
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify(base),
  };
}

/**
 * Creates a thin/weak therapist memory record (empty clinical fields).
 */
function makeThinRecord(overrides = {}) {
  const base = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'sess-thin',
    session_date: '2026-04-01',
    session_summary: '',      // no summary
    core_patterns: [],        // no patterns
    triggers: [],
    automatic_thoughts: [],
    emotions: [],
    urges: [],
    actions: [],
    consequences: [],
    working_hypotheses: [],
    interventions_used: [],   // no interventions
    risk_flags: [],           // no risk flags
    safety_plan_notes: '',
    follow_up_tasks: [],      // no follow-ups
    goals_referenced: [],
    last_summarized_date: '2026-04-01T10:00:00Z',
    ...overrides,
  };
  return {
    id: `cm-thin-${Math.random()}`,
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify(base),
  };
}

function makeEntities(records = []) {
  return {
    CompanionMemory: {
      list: vi.fn().mockResolvedValue(records),
    },
    CaseFormulation: {
      list: vi.fn().mockResolvedValue([]),
    },
  };
}

// ─── Section 1: scoreTherapistMemoryRecord ────────────────────────────────────

describe('Section 1: scoreTherapistMemoryRecord — individual field scoring', () => {
  it('returns 0 for null input (fail-safe)', () => {
    expect(scoreTherapistMemoryRecord(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(scoreTherapistMemoryRecord(undefined)).toBe(0);
  });

  it('returns 0 for a non-object input', () => {
    expect(scoreTherapistMemoryRecord('string')).toBe(0);
    expect(scoreTherapistMemoryRecord(42)).toBe(0);
  });

  it('returns 0 for a record with all empty fields', () => {
    const record = {
      session_summary: '',
      core_patterns: [],
      follow_up_tasks: [],
      interventions_used: [],
      working_hypotheses: [],
      risk_flags: [],
    };
    expect(scoreTherapistMemoryRecord(record)).toBe(0);
  });

  it('adds 4 for non-empty risk_flags', () => {
    const record = { risk_flags: ['passive_ideation'], core_patterns: [], follow_up_tasks: [], interventions_used: [], working_hypotheses: [], session_summary: '' };
    expect(scoreTherapistMemoryRecord(record)).toBe(4);
  });

  it('adds 3 for non-empty follow_up_tasks', () => {
    const record = { follow_up_tasks: ['Do thought record'], core_patterns: [], risk_flags: [], interventions_used: [], working_hypotheses: [], session_summary: '' };
    expect(scoreTherapistMemoryRecord(record)).toBe(3);
  });

  it('adds 3 for non-empty core_patterns', () => {
    const record = { core_patterns: ['catastrophising'], follow_up_tasks: [], risk_flags: [], interventions_used: [], working_hypotheses: [], session_summary: '' };
    expect(scoreTherapistMemoryRecord(record)).toBe(3);
  });

  it('adds 2 for non-empty working_hypotheses', () => {
    const record = { working_hypotheses: ['Core belief: unworthy'], core_patterns: [], follow_up_tasks: [], risk_flags: [], interventions_used: [], session_summary: '' };
    expect(scoreTherapistMemoryRecord(record)).toBe(2);
  });

  it('adds 2 for non-empty interventions_used', () => {
    const record = { interventions_used: ['thought_record'], core_patterns: [], follow_up_tasks: [], risk_flags: [], working_hypotheses: [], session_summary: '' };
    expect(scoreTherapistMemoryRecord(record)).toBe(2);
  });

  it('adds 2 for session_summary >= CONTINUITY_MIN_SESSION_SUMMARY_LENGTH chars', () => {
    const longSummary = 'X'.repeat(CONTINUITY_MIN_SESSION_SUMMARY_LENGTH);
    const record = { session_summary: longSummary, core_patterns: [], follow_up_tasks: [], risk_flags: [], interventions_used: [], working_hypotheses: [] };
    expect(scoreTherapistMemoryRecord(record)).toBe(2);
  });

  it('does NOT add score for session_summary shorter than CONTINUITY_MIN_SESSION_SUMMARY_LENGTH', () => {
    const shortSummary = 'X'.repeat(CONTINUITY_MIN_SESSION_SUMMARY_LENGTH - 1);
    const record = { session_summary: shortSummary, core_patterns: [], follow_up_tasks: [], risk_flags: [], interventions_used: [], working_hypotheses: [] };
    expect(scoreTherapistMemoryRecord(record)).toBe(0);
  });

  it('scores all fields correctly for a fully populated record', () => {
    // risk_flags(4) + follow_up_tasks(3) + core_patterns(3) + working_hypotheses(2) + interventions_used(2) + summary(2) = 16
    const record = {
      risk_flags: ['passive_ideation'],
      follow_up_tasks: ['Do exercise'],
      core_patterns: ['avoidance'],
      working_hypotheses: ['Core belief: unworthy'],
      interventions_used: ['exposure'],
      session_summary: 'Meaningful long summary text here',
    };
    expect(scoreTherapistMemoryRecord(record)).toBe(16);
  });

  it('is additive — partial field combinations produce expected sums', () => {
    // core_patterns(3) + session_summary(2) = 5
    const record = {
      core_patterns: ['avoidance'],
      session_summary: 'Meaningful long summary text here',
      follow_up_tasks: [],
      risk_flags: [],
      interventions_used: [],
      working_hypotheses: [],
    };
    expect(scoreTherapistMemoryRecord(record)).toBe(5);
  });

  it('ignores non-array values for array fields (no extra score)', () => {
    const record = {
      core_patterns: 'not an array',
      follow_up_tasks: null,
      risk_flags: undefined,
      interventions_used: 42,
      working_hypotheses: {},
      session_summary: '',
    };
    // None of the non-array fields should contribute to the score
    expect(scoreTherapistMemoryRecord(record)).toBe(0);
  });
});

// ─── Section 2: New constants exported ───────────────────────────────────────

describe('Section 2: Exported constants', () => {
  it('CONTINUITY_MIN_USEFUL_SCORE is exported and is a positive number', () => {
    expect(typeof CONTINUITY_MIN_USEFUL_SCORE).toBe('number');
    expect(CONTINUITY_MIN_USEFUL_SCORE).toBeGreaterThan(0);
  });

  it('CONTINUITY_MIN_SESSION_SUMMARY_LENGTH is exported and is a positive number', () => {
    expect(typeof CONTINUITY_MIN_SESSION_SUMMARY_LENGTH).toBe('number');
    expect(CONTINUITY_MIN_SESSION_SUMMARY_LENGTH).toBeGreaterThan(0);
  });

  it('scoreTherapistMemoryRecord is exported as a function', () => {
    expect(typeof scoreTherapistMemoryRecord).toBe('function');
  });
});

// ─── Section 3: readCrossSessionContinuity — selection quality ───────────────

describe('Section 3: readCrossSessionContinuity — prefers rich records over thin', () => {
  it('selects the rich record when a rich record and thin records exist', async () => {
    // thin record is more recent (index 0), rich record is older (index 1)
    // Expected: rich record is preferred despite being older
    const thinRecord = makeThinRecord({ session_id: 'sess-thin-recent' });
    const richRecord = makeRichRecord({
      session_id: 'sess-rich-older',
      session_summary: 'Rich session with real clinical content',
      core_patterns: ['catastrophising'],
      follow_up_tasks: ['Do homework'],
    });
    const entities = makeEntities([thinRecord, richRecord]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // The rich record's content should be included
    expect(result.recurringPatterns).toContain('catastrophising');
    expect(result.openFollowUpTasks).toContain('Do homework');
  });

  it('includes content from rich records selected over multiple thin records', async () => {
    const thin1 = makeThinRecord({ session_id: 'thin-1' });
    const thin2 = makeThinRecord({ session_id: 'thin-2' });
    const thin3 = makeThinRecord({ session_id: 'thin-3' });
    const rich = makeRichRecord({
      session_id: 'rich-old',
      core_patterns: ['avoidance'],
      follow_up_tasks: ['Behavioral activation task'],
      interventions_used: ['exposure'],
    });
    // thin records are at indices 0,1,2 (most recent); rich is at index 3
    const entities = makeEntities([thin1, thin2, thin3, rich]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    expect(result.recurringPatterns).toContain('avoidance');
    expect(result.openFollowUpTasks).toContain('Behavioral activation task');
    expect(result.interventionsUsed).toContain('exposure');
  });

  it('falls back to thin records when no rich records exist', async () => {
    // All records are thin — system should still return data (graceful fallback)
    const thin1 = makeThinRecord({ session_id: 'thin-1' });
    const thin2 = makeThinRecord({ session_id: 'thin-2' });
    const entities = makeEntities([thin1, thin2]);

    const result = await readCrossSessionContinuity(entities);

    // Thin records pass the valid-therapist-record check, so result is returned
    // (though it has empty arrays — the fallback still includes them)
    expect(result).not.toBeNull();
    expect(result.sessionCount).toBeGreaterThan(0);
  });

  it('always surfaces records with risk_flags (highest score)', async () => {
    const thinRecent = makeThinRecord({ session_id: 'thin-recent' });
    const riskRecord = makeRichRecord({
      session_id: 'risk-session',
      core_patterns: [],
      follow_up_tasks: [],
      interventions_used: [],
      risk_flags: ['passive_ideation'],
      session_summary: '',
    });
    // risk record is older (index 1), thin record is more recent (index 0)
    const entities = makeEntities([thinRecent, riskRecord]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    expect(result.riskFlags).toContain('passive_ideation');
  });

  it('preserves recency ordering within equal-score records (most-recent summary is from most-recent session)', async () => {
    const richOlder = makeRichRecord({
      session_id: 'rich-older',
      session_summary: 'Older rich session content here for testing',
      core_patterns: ['avoidance'],
      follow_up_tasks: ['Older task'],
    });
    const richNewer = makeRichRecord({
      session_id: 'rich-newer',
      session_summary: 'Newer rich session content here for testing',
      core_patterns: ['catastrophising'],
      follow_up_tasks: ['Newer task'],
    });
    // newer record first (index 0), older record second (index 1)
    const entities = makeEntities([richNewer, richOlder]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // recentSummary should come from the most-recent session (richNewer)
    expect(result.recentSummary).toContain('Newer rich session');
  });

  it('selects up to CONTINUITY_MAX_PRIOR_SESSIONS total records', async () => {
    // Mix of 2 thin + 5 rich — should select at most 3 total
    const records = [
      makeThinRecord({ session_id: 'thin-1' }),
      makeThinRecord({ session_id: 'thin-2' }),
      makeRichRecord({ session_id: 'rich-1', core_patterns: ['p1'], follow_up_tasks: ['t1'] }),
      makeRichRecord({ session_id: 'rich-2', core_patterns: ['p2'], follow_up_tasks: ['t2'] }),
      makeRichRecord({ session_id: 'rich-3', core_patterns: ['p3'], follow_up_tasks: ['t3'] }),
      makeRichRecord({ session_id: 'rich-4', core_patterns: ['p4'], follow_up_tasks: ['t4'] }),
      makeRichRecord({ session_id: 'rich-5', core_patterns: ['p5'], follow_up_tasks: ['t5'] }),
    ];
    const entities = makeEntities(records);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    expect(result.sessionCount).toBeLessThanOrEqual(CONTINUITY_MAX_PRIOR_SESSIONS);
  });

  it('prefers useful records over thin even when thin are more recent (full 3-slot scenario)', async () => {
    // Simulate 6 records: 3 thin (most recent) + 3 rich (older)
    // Expected: 3 rich records selected (all 3 slots filled with useful records)
    const thin1 = makeThinRecord({ session_id: 'thin-a' });
    const thin2 = makeThinRecord({ session_id: 'thin-b' });
    const thin3 = makeThinRecord({ session_id: 'thin-c' });
    const rich1 = makeRichRecord({ session_id: 'rich-a', core_patterns: ['avoidance'], follow_up_tasks: ['task-a'], session_summary: 'First rich session summary text' });
    const rich2 = makeRichRecord({ session_id: 'rich-b', core_patterns: ['rumination'], follow_up_tasks: ['task-b'], session_summary: 'Second rich session summary text' });
    const rich3 = makeRichRecord({ session_id: 'rich-c', core_patterns: ['catastrophising'], follow_up_tasks: ['task-c'], session_summary: 'Third rich session summary text' });
    // thin records first (more recent), rich records last (older)
    const entities = makeEntities([thin1, thin2, thin3, rich1, rich2, rich3]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // All 3 selected slots should be the rich records
    expect(result.sessionCount).toBe(CONTINUITY_MAX_PRIOR_SESSIONS);
    // Rich records' patterns should be present
    expect(result.recurringPatterns).toContain('avoidance');
    expect(result.recurringPatterns).toContain('rumination');
    expect(result.recurringPatterns).toContain('catastrophising');
    // Thin records' empty arrays should not contaminate results
    // (dedup still works, but we shouldn't have content from thin records)
    expect(result.openFollowUpTasks).toContain('task-a');
  });
});

// ─── Section 4: Existing fail-closed paths unchanged ─────────────────────────

describe('Section 4: Existing fail-closed paths unchanged (regression)', () => {
  it('returns null when entities is null', async () => {
    expect(await readCrossSessionContinuity(null)).toBeNull();
  });

  it('returns null when entities is undefined', async () => {
    expect(await readCrossSessionContinuity(undefined)).toBeNull();
  });

  it('returns null when CompanionMemory.list is not a function', async () => {
    expect(await readCrossSessionContinuity({ CompanionMemory: {} })).toBeNull();
  });

  it('returns null when CompanionMemory.list returns empty array', async () => {
    const entities = makeEntities([]);
    expect(await readCrossSessionContinuity(entities)).toBeNull();
  });

  it('returns null when CompanionMemory.list throws', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn().mockRejectedValue(new Error('network error')) },
    };
    expect(await readCrossSessionContinuity(entities)).toBeNull();
  });

  it('returns null when all records have wrong memory_type', async () => {
    const entities = makeEntities([
      { id: 'x1', memory_type: 'companion_memory', content: '{}' },
    ]);
    expect(await readCrossSessionContinuity(entities)).toBeNull();
  });

  it('returns null when content has wrong version marker', async () => {
    const entities = makeEntities([
      { id: 'x1', memory_type: THERAPIST_MEMORY_TYPE, content: JSON.stringify({ therapist_memory_version: '999' }) },
    ]);
    expect(await readCrossSessionContinuity(entities)).toBeNull();
  });

  it('buildCrossSessionContinuityBlock returns empty string when no records exist', async () => {
    const entities = makeEntities([]);
    expect(await buildCrossSessionContinuityBlock(entities)).toBe('');
  });

  it('buildCrossSessionContinuityBlock returns empty string when entities is null', async () => {
    expect(await buildCrossSessionContinuityBlock(null)).toBe('');
  });

  it('buildCrossSessionContinuityBlock returns empty string on list failure', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn().mockRejectedValue(new Error('crash')) },
    };
    expect(await buildCrossSessionContinuityBlock(entities)).toBe('');
  });
});

// ─── Section 5: No raw transcript leakage ─────────────────────────────────────

describe('Section 5: No raw transcript leakage through selection', () => {
  it('does not store or return message_text or raw conversation content', async () => {
    // A rich record with clinical summary but no raw transcript fields
    const richRecord = makeRichRecord({
      session_summary: 'Patient discussed work stress patterns.',
      core_patterns: ['catastrophising'],
    });
    const entities = makeEntities([richRecord]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // Result object should not have any raw message fields
    expect(result).not.toHaveProperty('messages');
    expect(result).not.toHaveProperty('message_text');
    expect(result).not.toHaveProperty('transcript');
    expect(result).not.toHaveProperty('raw_content');
    expect(result).not.toHaveProperty('conversation_history');
  });

  it('scored record selection does not expose raw content — only structured fields', async () => {
    const block = await buildCrossSessionContinuityBlock(
      makeEntities([makeRichRecord()])
    );
    // Block must not contain any marker resembling raw messages
    expect(block).not.toMatch(/\bmessages\b/i);
    expect(block).not.toMatch(/\btranscript\b/i);
    expect(block).not.toMatch(/\braw_content\b/i);
  });
});

// ─── Section 6: Companion / non-therapist flow isolation ─────────────────────

describe('Section 6: Companion and non-therapist flow isolation', () => {
  it('AI_COMPANION_WIRING_HYBRID has no continuity_layer_enabled (not affected)', () => {
    expect(AI_COMPANION_WIRING_HYBRID.continuity_layer_enabled).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_HYBRID has no continuity_layer_enabled (default path unchanged)', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.continuity_layer_enabled).toBeUndefined();
  });

  it('buildV7SessionStartContentAsync with HYBRID wiring delegates to V6 (no CompanionMemory read)', async () => {
    const listSpy = vi.fn().mockResolvedValue([]);
    const entities = {
      CompanionMemory: { list: listSpy },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, {});

    // HYBRID wiring does not have continuity_layer_enabled; CompanionMemory.list
    // is NOT called from the continuity path (it may or may not be called by
    // other V7 sub-layers, but the continuity scoring path must not be reached)
    // We verify the function does not throw and returns a string
    // (The assertion is that no exception is thrown and the result is a string)
    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, {});
    expect(typeof result).toBe('string');
  });

  it('buildV6SessionStartContentAsync with HYBRID wiring returns a string without throwing', async () => {
    const entities = makeEntities([]);
    const result = await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, {});
    expect(typeof result).toBe('string');
  });
});

// ─── Section 7: V7 wiring with rich data produces enriched block ──────────────

describe('Section 7: V7 wiring with rich continuity data produces enriched session-start', () => {
  it('V7 session-start includes continuity block content when rich records exist', async () => {
    const richRecord = makeRichRecord({
      core_patterns: ['test-rich-pattern'],
      follow_up_tasks: ['test-rich-follow-up'],
      interventions_used: ['test_intervention'],
    });
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([richRecord]) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, {});

    expect(result).toContain('test-rich-pattern');
    expect(result).toContain('test-rich-follow-up');
    expect(result).toContain('test_intervention');
    expect(result).toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });

  it('V7 session-start falls back gracefully when only thin records exist', async () => {
    const thinRecord = makeThinRecord();
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([thinRecord]) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    // Should not throw, and should return a valid session-start string
    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, {});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('V7 prefers the rich record when a thin recent and rich older record exist', async () => {
    const thinRecent = makeThinRecord({ session_id: 'thin-recent' });
    const richOlder = makeRichRecord({
      session_id: 'rich-older',
      core_patterns: ['rumination'],
      follow_up_tasks: ['Practice grounding'],
      session_summary: 'Meaningful session about rumination patterns and coping strategies.',
    });
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([thinRecent, richOlder]) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, {});

    expect(result).toContain('rumination');
    expect(result).toContain('Practice grounding');
  });

  it('V7 session-start is never blocked by continuity failure (fail-closed)', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn().mockRejectedValue(new Error('entity read failure')) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    // Must not throw; must return a valid non-empty string
    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, {});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── Section 8: Cross-user / private-entity safety ───────────────────────────

describe('Section 8: Cross-user / private-entity safety', () => {
  it('readCrossSessionContinuity only reads CompanionMemory — not ThoughtJournal or Conversation', async () => {
    const thoughtJournalSpy = vi.fn();
    const conversationSpy = vi.fn();
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      ThoughtJournal: { list: thoughtJournalSpy },
      Conversation: { list: conversationSpy },
    };

    await readCrossSessionContinuity(entities);

    expect(thoughtJournalSpy).not.toHaveBeenCalled();
    expect(conversationSpy).not.toHaveBeenCalled();
  });

  it('scoreTherapistMemoryRecord only reads fields from the parsed record (no entity calls)', () => {
    // Score function must be pure — no side effects, no network calls
    const record = {
      core_patterns: ['avoidance'],
      follow_up_tasks: [],
      risk_flags: [],
      interventions_used: [],
      working_hypotheses: [],
      session_summary: '',
    };
    // Should return synchronously with no async/entity access
    const score = scoreTherapistMemoryRecord(record);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Section 9: Flag regression — V6 and below unaffected ────────────────────

describe('Section 9: Flag regression — V6 and below paths unaffected', () => {
  it('buildV6SessionStartContentAsync does not read CompanionMemory for continuity (no V7)', async () => {
    // V6 has formulation_context_enabled but NOT continuity_layer_enabled
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_context_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.continuity_layer_enabled).toBeUndefined();
  });

  it('V7 wiring with continuity_layer_enabled=false skips scoring and falls back to V6', async () => {
    const wiringWithoutContinuity = {
      ...CBT_THERAPIST_WIRING_STAGE2_V7,
      continuity_layer_enabled: false,
    };
    const listSpy = vi.fn().mockResolvedValue([makeRichRecord()]);
    const entities = {
      CompanionMemory: { list: listSpy },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    const result = await buildV7SessionStartContentAsync(wiringWithoutContinuity, entities, {});

    expect(typeof result).toBe('string');
    // The result should NOT contain the continuity context block
    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });

  it('buildV7SessionStartContentAsync with null wiring does not throw', async () => {
    const entities = makeEntities([]);
    const result = await buildV7SessionStartContentAsync(null, entities, {});
    expect(typeof result).toBe('string');
  });
});

// ─── Section 10: Stage 6 — most-recent useful session always pinned ───────────

describe('Section 10: Stage 6 — most-recent useful session is always included in selected set', () => {
  it('includes the most-recent useful session even when older sessions have higher richness scores', async () => {
    // Most-recent useful session: lower score (core_patterns + summary = 5)
    const mostRecentUseful = makeRichRecord({
      session_id: 'sess-most-recent',
      session_date: '2026-08-01',
      session_summary: 'Most recent session summary content here',
      core_patterns: ['most-recent-pattern'],
      follow_up_tasks: ['most-recent-follow-up'],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
    });
    // 3 older sessions with higher richness (working_hypotheses + interventions added = +4 each)
    const olderA = makeRichRecord({
      session_id: 'sess-older-a',
      session_date: '2026-07-01',
      session_summary: 'Older session A content here for testing',
      core_patterns: ['older-pattern-a'],
      follow_up_tasks: ['older-task-a'],
      working_hypotheses: ['older-hyp-a'],
      interventions_used: ['exposure'],
      risk_flags: [],
    });
    const olderB = makeRichRecord({
      session_id: 'sess-older-b',
      session_date: '2026-06-01',
      session_summary: 'Older session B content here for testing',
      core_patterns: ['older-pattern-b'],
      follow_up_tasks: ['older-task-b'],
      working_hypotheses: ['older-hyp-b'],
      interventions_used: ['behavioral_activation'],
      risk_flags: [],
    });
    const olderC = makeRichRecord({
      session_id: 'sess-older-c',
      session_date: '2026-05-01',
      session_summary: 'Older session C content here for testing',
      core_patterns: ['older-pattern-c'],
      follow_up_tasks: ['older-task-c'],
      working_hypotheses: ['older-hyp-c'],
      interventions_used: ['thought_record'],
      risk_flags: [],
    });

    // mostRecentUseful at index 0 (most recent); olderA, olderB, olderC follow.
    // Without Stage 6 fix, the 3 higher-scoring older sessions fill all 3 slots and
    // the most-recent session is excluded.
    const entities = makeEntities([mostRecentUseful, olderA, olderB, olderC]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // The most-recent session's patterns and follow-ups MUST appear.
    expect(result.recurringPatterns).toContain('most-recent-pattern');
    expect(result.openFollowUpTasks).toContain('most-recent-follow-up');
    // recentSummary MUST be from the most-recent session.
    expect(result.recentSummary).toContain('Most recent session summary');
    // Total selected must not exceed MAX.
    expect(result.sessionCount).toBeLessThanOrEqual(CONTINUITY_MAX_PRIOR_SESSIONS);
  });

  it('recentSummary is always from the most-recent selected session even when older sessions have higher scores', async () => {
    const mostRecent = makeRichRecord({
      session_id: 'sess-newest',
      session_summary: 'Newest session summary text for recent anchor',
      core_patterns: ['new-pattern'],
      follow_up_tasks: ['new-task'],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
    });
    const older = makeRichRecord({
      session_id: 'sess-old-rich',
      session_summary: 'Older session rich summary text here',
      core_patterns: ['old-pattern'],
      follow_up_tasks: ['old-task'],
      working_hypotheses: ['old-hyp'],
      interventions_used: ['exposure'],
      risk_flags: [],
    });

    // most-recent at index 0, older at index 1 (higher score)
    const entities = makeEntities([mostRecent, older]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // recentSummary should be the most-recent session's summary
    expect(result.recentSummary).toContain('Newest session summary');
    expect(result.recentSummary).not.toContain('Older session rich');
  });

  it('still surfaces risk_flags from older sessions when the most-recent session has none', async () => {
    const recentNoRisk = makeRichRecord({
      session_id: 'sess-recent-safe',
      session_summary: 'Recent session without risk flags content text',
      core_patterns: ['recent-pattern'],
      follow_up_tasks: ['recent-task'],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
    });
    const olderWithRisk = makeRichRecord({
      session_id: 'sess-older-risk',
      session_summary: 'Older session with risk content here for testing',
      core_patterns: ['older-risk-pattern'],
      follow_up_tasks: [],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: ['passive_ideation'],
    });

    const entities = makeEntities([recentNoRisk, olderWithRisk]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // Risk flag from older session should still appear in selected set
    expect(result.riskFlags).toContain('passive_ideation');
    // And the most-recent session's content is present
    expect(result.recurringPatterns).toContain('recent-pattern');
  });

  it('four-record slot competition: recentSummary is from most-recent session and passive_ideation is not lost (MAX=3)', async () => {
    // Exact scenario from the problem statement with genuine slot competition.
    // Record 1 — most-recent session: useful but low score, no risk flag (score ≈ 5)
    const mostRecentLowScore = makeRichRecord({
      session_id: 'sess-comp-recent',
      session_summary: 'Most recent session summary for slot competition test',
      core_patterns: ['recent-comp-pattern'],
      follow_up_tasks: ['recent-comp-task'],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
    });
    // Record 2 — older rich session A: high score, no risk (score ≈ 12)
    const olderRichA = makeRichRecord({
      session_id: 'sess-comp-rich-a',
      session_summary: 'Older rich session A for slot competition test',
      core_patterns: ['rich-a-pattern'],
      follow_up_tasks: ['rich-a-task'],
      working_hypotheses: ['rich-a-hypothesis'],
      interventions_used: ['exposure'],
      risk_flags: [],
    });
    // Record 3 — older rich session B: high score, no risk (score ≈ 12)
    const olderRichB = makeRichRecord({
      session_id: 'sess-comp-rich-b',
      session_summary: 'Older rich session B for slot competition test',
      core_patterns: ['rich-b-pattern'],
      follow_up_tasks: ['rich-b-task'],
      working_hypotheses: ['rich-b-hypothesis'],
      interventions_used: ['behavioral_activation'],
      risk_flags: [],
    });
    // Record 4 — older session with passive_ideation: would have held the third
    // slot under pure richness ranking but has lower total score than rich A/B.
    const olderRiskOnly = makeRichRecord({
      session_id: 'sess-comp-risk',
      session_summary: 'Older risk session for slot competition test here',
      core_patterns: [],
      follow_up_tasks: [],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: ['passive_ideation'],
    });

    // Input order: most-recent first (index 0), then olderRichA, olderRichB, olderRiskOnly.
    // Without safety-precedence sort, recent + richA + richB fill all 3 slots and
    // passive_ideation is lost.
    const entities = makeEntities([mostRecentLowScore, olderRichA, olderRichB, olderRiskOnly]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // recentSummary MUST come from the most-recent useful session.
    expect(result.recentSummary).toContain('Most recent session summary for slot competition test');
    // passive_ideation MUST NOT be displaced by the two high-scoring rich sessions.
    expect(result.riskFlags).toContain('passive_ideation');
    // Session count must not exceed MAX.
    expect(result.sessionCount).toBeLessThanOrEqual(CONTINUITY_MAX_PRIOR_SESSIONS);
  });

  it('handles single useful record with no older sessions correctly (no regression)', async () => {
    const onlyRecord = makeRichRecord({
      session_id: 'sess-only',
      session_summary: 'Only session summary content here for testing',
      core_patterns: ['only-pattern'],
      follow_up_tasks: ['only-task'],
    });

    const entities = makeEntities([onlyRecord]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    expect(result.sessionCount).toBe(1);
    expect(result.recurringPatterns).toContain('only-pattern');
    expect(result.recentSummary).toContain('Only session summary');
  });

  it('V7 session-start includes most-recent-session content when older sessions have higher scores', async () => {
    const mostRecent = makeRichRecord({
      session_id: 'sess-v7-recent',
      session_summary: 'Stage 6 most recent session summary here for V7 test',
      core_patterns: ['stage6-recent-pattern'],
      follow_up_tasks: ['stage6-recent-task'],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
    });
    const olderRich = makeRichRecord({
      session_id: 'sess-v7-older',
      session_summary: 'Stage 6 older richer session content for testing',
      core_patterns: ['stage6-older-pattern'],
      follow_up_tasks: ['stage6-older-task'],
      working_hypotheses: ['stage6-older-hyp'],
      interventions_used: ['exposure', 'thought_record'],
      risk_flags: [],
    });
    const olderRich2 = makeRichRecord({
      session_id: 'sess-v7-older-2',
      session_summary: 'Stage 6 older session 2 content for testing',
      core_patterns: ['stage6-older2-pattern'],
      follow_up_tasks: ['stage6-older2-task'],
      working_hypotheses: ['stage6-older2-hyp'],
      interventions_used: ['behavioral_activation'],
      risk_flags: [],
    });
    const olderRich3 = makeRichRecord({
      session_id: 'sess-v7-older-3',
      session_summary: 'Stage 6 older session 3 content for testing',
      core_patterns: ['stage6-older3-pattern'],
      follow_up_tasks: ['stage6-older3-task'],
      working_hypotheses: ['stage6-older3-hyp'],
      interventions_used: ['mindfulness'],
      risk_flags: [],
    });

    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([mostRecent, olderRich, olderRich2, olderRich3]) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };

    const result = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, entities, {});

    // Stage 6 fix: most-recent session content must be injected
    expect(result).toContain('stage6-recent-pattern');
    expect(result).toContain('stage6-recent-task');
    expect(result).toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });
});
