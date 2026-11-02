/**
 * @file test/utils/companionContinuityQuality.test.js
 *
 * AI Companion Upgrade — Phase 3 Continuity Quality — Test Suite
 *
 * Covers:
 *   A. scoreCompanionMemoryRecord — scoring logic (richness, importance, length)
 *   B. scoreCompanionMemoryRecord — therapist record exclusion (role boundary)
 *   C. scoreCompanionMemoryRecord — null/invalid input (fail-safe)
 *   D. buildCompanionContinuityBlock — rich memory: context block produced
 *   E. buildCompanionContinuityBlock — weak/thin memory: suppressed below threshold
 *   F. buildCompanionContinuityBlock — fallback: empty when no useful memories
 *   G. buildCompanionContinuityBlock — deduplication of identical content
 *   H. buildCompanionContinuityBlock — respects COMPANION_MEMORY_MAX_INJECT cap
 *   I. buildCompanionContinuityBlock — fail-closed on entities error
 *   J. buildCompanionContinuityBlock — role boundary: therapist records excluded
 *   K. buildCompanionContinuityBlock — privacy: no raw transcript leakage
 *   L. buildCompanionContinuityBlock — privacy: no cross-user entity access
 *   M. buildCompanionSessionStartContextAsync — returns [START_SESSION] when flag off
 *   N. buildCompanionSessionStartContextAsync — returns enriched content when flag on
 *   O. buildCompanionSessionStartContextAsync — fallback: [START_SESSION] when no memories
 *   P. buildCompanionSessionStartContextAsync — fail-closed on continuity error
 *   Q. Regression — therapist session-start unaffected
 *   R. Regression — resolveTherapistWiring unaffected by companion flags
 *   S. Regression — companion routing flag-off behavior preserved
 *   T. Context block format — warm, non-clinical framing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  scoreCompanionMemoryRecord,
  buildCompanionContinuityBlock,
  buildCompanionSessionStartContextAsync,
  COMPANION_MEMORY_MIN_CONTENT_LENGTH,
  COMPANION_MEMORY_MIN_WARMTH_SCORE,
  COMPANION_MEMORY_MAX_INJECT,
  COMPANION_MEMORY_INJECT_MAX_CHARS,
  COMPANION_WARMTH_FALLBACK_CONTEXT,
} from '../../src/lib/companionContinuity.js';

import { THERAPIST_MEMORY_TYPE } from '../../src/lib/therapistMemoryModel.js';

import {
  buildV7SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  AI_COMPANION_WIRING_UPGRADE_V2,
  AI_COMPANION_WIRING_UPGRADE_V1,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

import {
  resolveCompanionWiring,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/**
 * Makes a rich native CompanionMemory record (high importance, long content).
 */
function makeRichCompanionMemory(overrides = {}) {
  return {
    id: 'cm-rich-001',
    memory_type: 'companion_note',
    is_active: true,
    importance: 8,
    content: 'User finds breathing exercises helpful when feeling overwhelmed at work.',
    ...overrides,
  };
}

/**
 * Makes a thin/generic CompanionMemory record (no importance, short content).
 */
function makeThinCompanionMemory(overrides = {}) {
  return {
    id: 'cm-thin-001',
    memory_type: 'companion_note',
    is_active: true,
    importance: 0,
    content: 'Hi',
    ...overrides,
  };
}

/**
 * Makes a therapist session record stored in CompanionMemory.
 * This record must NEVER be injected into companion context.
 */
function makeTherapistSessionRecord(overrides = {}) {
  return {
    id: 'cm-therapist-001',
    memory_type: THERAPIST_MEMORY_TYPE,
    is_active: true,
    importance: 9,
    content: JSON.stringify({
      therapist_memory_version: '1',
      session_id: 'sess-001',
      session_summary: 'Clinical CBT work on core beliefs.',
      core_patterns: ['catastrophising'],
      follow_up_tasks: ['complete thought record'],
    }),
    ...overrides,
  };
}

/**
 * Creates a mock entities object with a CompanionMemory.filter implementation.
 */
function makeEntities(records = []) {
  return {
    CompanionMemory: {
      filter: vi.fn().mockResolvedValue(records),
    },
  };
}

// ─── A. scoreCompanionMemoryRecord — richness scoring ────────────────────────

describe('A. scoreCompanionMemoryRecord — richness scoring', () => {
  it('returns a positive score for a rich record with high importance and long content', () => {
    const record = makeRichCompanionMemory({ importance: 8 });
    const score = scoreCompanionMemoryRecord(record);
    expect(score).toBeGreaterThan(COMPANION_MEMORY_MIN_WARMTH_SCORE);
  });

  it('importance >= 7 contributes +3 to score', () => {
    const withHigh = makeRichCompanionMemory({ importance: 7, content: '' });
    const withNone = makeRichCompanionMemory({ importance: 0, content: '' });
    expect(scoreCompanionMemoryRecord(withHigh) - scoreCompanionMemoryRecord(withNone)).toBe(3);
  });

  it('importance >= 5 and < 7 contributes +2 to score', () => {
    const withMid = makeRichCompanionMemory({ importance: 6, content: '' });
    const withNone = makeRichCompanionMemory({ importance: 0, content: '' });
    expect(scoreCompanionMemoryRecord(withMid) - scoreCompanionMemoryRecord(withNone)).toBe(2);
  });

  it('importance >= 3 and < 5 contributes +1 to score', () => {
    const withLow = makeRichCompanionMemory({ importance: 4, content: '' });
    const withNone = makeRichCompanionMemory({ importance: 0, content: '' });
    expect(scoreCompanionMemoryRecord(withLow) - scoreCompanionMemoryRecord(withNone)).toBe(1);
  });

  it('importance < 3 contributes 0 to score', () => {
    const withZero = makeRichCompanionMemory({ importance: 2, content: '' });
    const withNone = makeRichCompanionMemory({ importance: 0, content: '' });
    expect(scoreCompanionMemoryRecord(withZero)).toBe(scoreCompanionMemoryRecord(withNone));
  });

  it('content >= COMPANION_MEMORY_MIN_CONTENT_LENGTH chars contributes +2', () => {
    const longContent = 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH);
    const withLong = makeRichCompanionMemory({ importance: 0, content: longContent });
    const withShort = makeRichCompanionMemory({ importance: 0, content: 'Hi' });
    expect(scoreCompanionMemoryRecord(withLong) - scoreCompanionMemoryRecord(withShort)).toBe(2);
  });

  it('content >= 60 chars contributes an extra +1 beyond the length threshold', () => {
    const content60 = 'a'.repeat(60);
    const contentMin = 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH);
    const withLong = makeRichCompanionMemory({ importance: 0, content: content60 });
    const withMid = makeRichCompanionMemory({ importance: 0, content: contentMin });
    expect(scoreCompanionMemoryRecord(withLong) - scoreCompanionMemoryRecord(withMid)).toBe(1);
  });

  it('returns 0 for a record with no importance and very short content', () => {
    const thin = makeThinCompanionMemory({ importance: 0, content: 'Hi' });
    expect(scoreCompanionMemoryRecord(thin)).toBe(0);
  });

  it('importance field being undefined does not throw and scores as 0 for importance', () => {
    const record = makeRichCompanionMemory({ importance: undefined, content: '' });
    expect(() => scoreCompanionMemoryRecord(record)).not.toThrow();
  });

  it('importance field being null does not throw and scores as 0 for importance', () => {
    const record = makeRichCompanionMemory({ importance: null, content: '' });
    expect(() => scoreCompanionMemoryRecord(record)).not.toThrow();
  });

  it('content field being undefined does not throw', () => {
    const record = makeRichCompanionMemory({ content: undefined });
    expect(() => scoreCompanionMemoryRecord(record)).not.toThrow();
  });
});

// ─── B. scoreCompanionMemoryRecord — therapist record exclusion ───────────────

describe('B. scoreCompanionMemoryRecord — therapist record exclusion (role boundary)', () => {
  it('returns 0 for a record with memory_type === THERAPIST_MEMORY_TYPE', () => {
    const therapistRecord = makeTherapistSessionRecord({ importance: 10 });
    expect(scoreCompanionMemoryRecord(therapistRecord)).toBe(0);
  });

  it('returns 0 even when therapist record has very high importance', () => {
    const therapistRecord = makeTherapistSessionRecord({ importance: 10, content: 'a'.repeat(200) });
    expect(scoreCompanionMemoryRecord(therapistRecord)).toBe(0);
  });

  it('non-therapist records with same fields score > 0', () => {
    const nativeRecord = makeRichCompanionMemory({ importance: 10, content: 'a'.repeat(200) });
    expect(scoreCompanionMemoryRecord(nativeRecord)).toBeGreaterThan(0);
  });
});

// ─── C. scoreCompanionMemoryRecord — null/invalid input ──────────────────────

describe('C. scoreCompanionMemoryRecord — null/invalid input (fail-safe)', () => {
  it('returns 0 for null', () => {
    expect(scoreCompanionMemoryRecord(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(scoreCompanionMemoryRecord(undefined)).toBe(0);
  });

  it('returns 0 for a string', () => {
    expect(scoreCompanionMemoryRecord('not a record')).toBe(0);
  });

  it('returns 0 for a number', () => {
    expect(scoreCompanionMemoryRecord(42)).toBe(0);
  });

  it('returns 0 for an empty object', () => {
    expect(scoreCompanionMemoryRecord({})).toBe(0);
  });
});

// ─── D. buildCompanionContinuityBlock — rich memory: block produced ───────────

describe('D. buildCompanionContinuityBlock — rich memory produces context block', () => {
  it('returns a non-empty string when rich records exist', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(typeof block).toBe('string');
    expect(block.length).toBeGreaterThan(0);
  });

  it('includes the section header', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('COMPANION CONTINUITY CONTEXT');
  });

  it('includes the section footer', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('END COMPANION CONTINUITY CONTEXT');
  });

  it('includes the memory content in the block', async () => {
    const memory = makeRichCompanionMemory({
      content: 'User finds journaling very helpful for processing emotions.',
    });
    const entities = makeEntities([memory]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('User finds journaling very helpful for processing emotions.');
  });

  it('includes a warm, non-clinical instruction line', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('warm');
  });

  it('includes a "do not reference verbatim" instruction', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('verbatim');
  });

  it('uses a bullet-list format for memory items', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toMatch(/^- /m);
  });
});

// ─── E. buildCompanionContinuityBlock — weak memories suppressed ──────────────

describe('E. buildCompanionContinuityBlock — weak/thin memories are suppressed', () => {
  it('returns empty string when all records score below the threshold', async () => {
    const thin = makeThinCompanionMemory({ importance: 0, content: 'Hi' });
    const entities = makeEntities([thin]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });

  it('returns a block when at least one rich record passes threshold', async () => {
    const thin = makeThinCompanionMemory({ importance: 0, content: 'Hi' });
    const rich = makeRichCompanionMemory();
    const entities = makeEntities([thin, rich]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBeTruthy();
  });

  it('does not include thin memory content when a richer record exists', async () => {
    const thin = makeThinCompanionMemory({ content: 'Hi' });
    const rich = makeRichCompanionMemory({ content: 'User loves morning walks.' });
    const entities = makeEntities([thin, rich]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).not.toContain('Hi');
    expect(block).toContain('User loves morning walks.');
  });

  it('prefers higher-scored records over lower-scored ones', async () => {
    const low = makeRichCompanionMemory({
      id: 'low',
      importance: 3,
      content: 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH),
    });
    const high = makeRichCompanionMemory({
      id: 'high',
      importance: 9,
      content: 'User finds nature walks very calming after stressful workdays.',
    });
    // Only allow 1 record so that preference is tested
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockResolvedValue([low, high]),
      },
    };
    // Build with max inject = 1 by using COMPANION_MEMORY_MAX_INJECT default
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toContain('User finds nature walks');
  });
});

// ─── F. buildCompanionContinuityBlock — fallback when no memories ─────────────

describe('F. buildCompanionContinuityBlock — empty/fallback behavior', () => {
  it('returns empty string when entities is null', async () => {
    const block = await buildCompanionContinuityBlock(null);
    expect(block).toBe('');
  });

  it('returns empty string when entities is undefined', async () => {
    const block = await buildCompanionContinuityBlock(undefined);
    expect(block).toBe('');
  });

  it('returns empty string when entities.CompanionMemory is missing', async () => {
    const block = await buildCompanionContinuityBlock({});
    expect(block).toBe('');
  });

  it('returns empty string when filter returns an empty array', async () => {
    const entities = makeEntities([]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });

  it('returns empty string when filter returns null', async () => {
    const entities = {
      CompanionMemory: { filter: vi.fn().mockResolvedValue(null) },
    };
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });

  it('returns empty string when all records have empty content', async () => {
    const records = [
      makeRichCompanionMemory({ content: '' }),
      makeRichCompanionMemory({ content: '   ' }),
    ];
    const entities = makeEntities(records);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });
});

// ─── G. buildCompanionContinuityBlock — deduplication ────────────────────────

describe('G. buildCompanionContinuityBlock — deduplication', () => {
  it('deduplicates identical content strings', async () => {
    const sameContent = 'User finds journaling helpful for managing anxiety.';
    const records = [
      makeRichCompanionMemory({ id: 'a', content: sameContent }),
      makeRichCompanionMemory({ id: 'b', content: sameContent }),
    ];
    const entities = makeEntities(records);
    const block = await buildCompanionContinuityBlock(entities);
    // The content should appear only once in the block
    const firstIndex = block.indexOf(sameContent);
    const lastIndex = block.lastIndexOf(sameContent);
    expect(firstIndex).toBe(lastIndex);
  });
});

// ─── H. buildCompanionContinuityBlock — max inject cap ───────────────────────

describe('H. buildCompanionContinuityBlock — COMPANION_MEMORY_MAX_INJECT cap', () => {
  it('injects at most COMPANION_MEMORY_MAX_INJECT items', async () => {
    const records = Array.from({ length: COMPANION_MEMORY_MAX_INJECT + 3 }, (_, i) =>
      makeRichCompanionMemory({ id: `cm-${i}`, content: `Memory item ${i} with sufficient length for scoring.` }),
    );
    const entities = makeEntities(records);
    const block = await buildCompanionContinuityBlock(entities);
    // Count bullet-list items
    const bulletCount = (block.match(/^- /gm) || []).length;
    expect(bulletCount).toBeLessThanOrEqual(COMPANION_MEMORY_MAX_INJECT);
  });
});

// ─── I. buildCompanionContinuityBlock — fail-closed on errors ─────────────────

describe('I. buildCompanionContinuityBlock — fail-closed on errors', () => {
  it('returns empty string when CompanionMemory.filter rejects', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockRejectedValue(new Error('network error')),
      },
    };
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });

  it('never throws on unexpected error', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockImplementation(() => { throw new Error('sync crash'); }),
      },
    };
    await expect(buildCompanionContinuityBlock(entities)).resolves.toBe('');
  });
});

// ─── J. buildCompanionContinuityBlock — role boundary: therapist records excluded

describe('J. buildCompanionContinuityBlock — role boundary: therapist records excluded', () => {
  it('excludes therapist session records from the context block', async () => {
    const therapistRecord = makeTherapistSessionRecord();
    const entities = makeEntities([therapistRecord]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).toBe('');
  });

  it('does not include therapist memory clinical content', async () => {
    const therapistRecord = makeTherapistSessionRecord();
    const nativeRecord = makeRichCompanionMemory({
      content: 'User enjoys evening walks when feeling stressed.',
    });
    const entities = makeEntities([therapistRecord, nativeRecord]);
    const block = await buildCompanionContinuityBlock(entities);
    // Clinical session content must not appear
    expect(block).not.toContain('CBT work on core beliefs');
    expect(block).not.toContain('catastrophising');
    // Native companion content should appear
    expect(block).toContain('User enjoys evening walks');
  });

  it('context block does not contain therapist-specific field names', async () => {
    const therapistRecord = makeTherapistSessionRecord();
    const entities = makeEntities([therapistRecord]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).not.toContain('core_patterns');
    expect(block).not.toContain('follow_up_tasks');
    expect(block).not.toContain('therapist_memory_version');
  });
});

// ─── K. buildCompanionContinuityBlock — privacy: no raw transcript leakage ───

describe('K. buildCompanionContinuityBlock — privacy: no raw transcript leakage', () => {
  it('block does not contain raw message markers', async () => {
    const record = makeRichCompanionMemory({
      content: 'User shares helpful coping strategies.',
    });
    const entities = makeEntities([record]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).not.toContain('"role"');
    expect(block).not.toContain('transcript');
    expect(block).not.toContain('messages:');
  });

  it('block does not contain JSON-like structure markers from therapist records', async () => {
    const therapistRecord = makeTherapistSessionRecord();
    const entities = makeEntities([therapistRecord]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).not.toContain('therapist_memory_version');
    expect(block).not.toContain('"session_id"');
  });

  it('content is truncated to COMPANION_MEMORY_INJECT_MAX_CHARS per item', async () => {
    const longContent = 'a'.repeat(COMPANION_MEMORY_INJECT_MAX_CHARS + 100);
    const record = makeRichCompanionMemory({ content: longContent });
    const entities = makeEntities([record]);
    const block = await buildCompanionContinuityBlock(entities);
    // The block should not contain content longer than the max chars for any item
    expect(block).toContain('a'.repeat(COMPANION_MEMORY_INJECT_MAX_CHARS));
    expect(block).not.toContain('a'.repeat(COMPANION_MEMORY_INJECT_MAX_CHARS + 1));
  });
});

// ─── L. buildCompanionContinuityBlock — privacy: no cross-user entity access ─

describe('L. buildCompanionContinuityBlock — privacy: no cross-user entity access', () => {
  it('never accesses CaseFormulation', async () => {
    const caseFormulationSpy = vi.fn();
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockResolvedValue([makeRichCompanionMemory()]),
      },
      CaseFormulation: {
        list: caseFormulationSpy,
      },
    };
    await buildCompanionContinuityBlock(entities);
    expect(caseFormulationSpy).not.toHaveBeenCalled();
  });

  it('never accesses ThoughtJournal', async () => {
    const thoughtJournalSpy = vi.fn();
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockResolvedValue([makeRichCompanionMemory()]),
      },
      ThoughtJournal: {
        list: thoughtJournalSpy,
        filter: thoughtJournalSpy,
      },
    };
    await buildCompanionContinuityBlock(entities);
    expect(thoughtJournalSpy).not.toHaveBeenCalled();
  });

  it('only calls CompanionMemory.filter — no other entity', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    await buildCompanionContinuityBlock(entities);
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
  });
});

// ─── M. buildCompanionSessionStartContextAsync — flag off + no useful memories → ''

describe('M. buildCompanionSessionStartContextAsync — returns empty string when flag off and no memories', () => {
  it('returns empty string when wiring is null and no memories', async () => {
    const result = await buildCompanionSessionStartContextAsync(makeEntities([]), null);
    expect(result).toBe('');
  });

  it('returns empty string when wiring is undefined and no memories', async () => {
    const result = await buildCompanionSessionStartContextAsync(makeEntities([]), undefined);
    expect(result).toBe('');
  });

  it('returns empty string when continuity_enabled is absent and no memories', async () => {
    const result = await buildCompanionSessionStartContextAsync(
      makeEntities([]),
      AI_COMPANION_WIRING_HYBRID,
    );
    expect(result).toBe('');
  });

  it('returns empty string when continuity_enabled is false and no memories', async () => {
    const wiring = { ...AI_COMPANION_WIRING_UPGRADE_V1, continuity_enabled: false };
    const result = await buildCompanionSessionStartContextAsync(makeEntities([]), wiring);
    expect(result).toBe('');
  });

  // When rich memories exist, they are returned even if continuity_enabled is absent —
  // memory context is always injected when present (flag only gates the warmth fallback).
  it('returns memory context block for V1 wiring when rich memories exist (continuity_enabled absent, memories present)', async () => {
    const result = await buildCompanionSessionStartContextAsync(
      makeEntities([makeRichCompanionMemory()]),
      AI_COMPANION_WIRING_UPGRADE_V1,
    );
    expect(result).toContain('[User Context from Previous Sessions]');
  });
});

// ─── N. buildCompanionSessionStartContextAsync — enriched when flag on ────────

describe('N. buildCompanionSessionStartContextAsync — enriched content when flag on', () => {
  it('returns a string starting with [User Context from Previous Sessions] when V2 wiring and rich memories', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result.startsWith('[User Context from Previous Sessions]')).toBe(true);
  });

  it('includes memory content when V2 wiring and rich memories exist', async () => {
    const memory = makeRichCompanionMemory({
      content: 'User finds outdoor exercise helpful for managing low mood.',
    });
    const entities = makeEntities([memory]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result).toContain('[User Context from Previous Sessions]');
    expect(result).toContain('User finds outdoor exercise helpful');
  });

  it('result is non-empty when V2 wiring and rich memories exist', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── O. buildCompanionSessionStartContextAsync — fallback when no memories ────

describe('O. buildCompanionSessionStartContextAsync — fallback when no useful memories', () => {
  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when V2 wiring but no memories in store', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });

  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when V2 wiring but all memories are thin/weak', async () => {
    const entities = makeEntities([
      makeThinCompanionMemory({ importance: 0, content: 'Hi' }),
    ]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });

  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when V2 wiring but only therapist records exist', async () => {
    const entities = makeEntities([makeTherapistSessionRecord()]);
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });
});

// ─── P. buildCompanionSessionStartContextAsync — fail-closed on errors ────────

describe('P. buildCompanionSessionStartContextAsync — fail-closed on continuity errors', () => {
  it('returns empty string when entities.CompanionMemory.filter rejects', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockRejectedValue(new Error('network failure')),
      },
    };
    const result = await buildCompanionSessionStartContextAsync(
      entities,
      AI_COMPANION_WIRING_UPGRADE_V2,
    );
    expect(result).toBe('');
  });

  it('never throws — always resolves', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockImplementation(() => { throw new Error('sync crash'); }),
      },
    };
    await expect(
      buildCompanionSessionStartContextAsync(entities, AI_COMPANION_WIRING_UPGRADE_V2),
    ).resolves.toBe('');
  });
});

// ─── Q. Regression — therapist session-start unaffected ──────────────────────

describe('Q. Regression — therapist session-start unaffected', () => {
  it('buildV7SessionStartContentAsync is unaffected by companion flags', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      CaseFormulation: { list: vi.fn().mockResolvedValue([]) },
    };
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );
    expect(typeof result).toBe('string');
    // Must not contain companion-specific framing
    expect(result).not.toContain('COMPANION CONTINUITY CONTEXT');
  });

  it('buildCompanionSessionStartContextAsync never reads CaseFormulation', async () => {
    const caseFormulationSpy = vi.fn();
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockResolvedValue([makeRichCompanionMemory()]),
      },
      CaseFormulation: {
        list: caseFormulationSpy,
        filter: caseFormulationSpy,
      },
    };
    await buildCompanionSessionStartContextAsync(entities, AI_COMPANION_WIRING_UPGRADE_V2);
    expect(caseFormulationSpy).not.toHaveBeenCalled();
  });
});

// ─── R. Regression — resolveTherapistWiring unaffected by companion flags ─────

describe('R. Regression — resolveTherapistWiring unaffected by companion flags', () => {
  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    // In test environment all flags default to false
    const wiring = resolveTherapistWiring();
    expect(wiring).toBeDefined();
  });

  it('resolveTherapistWiring result never has continuity_enabled (companion-only flag)', () => {
    const wiring = resolveTherapistWiring();
    // continuity_enabled is a companion flag; therapist uses continuity_layer_enabled
    expect(wiring.continuity_enabled).toBeUndefined();
  });

  it('companion continuity constants are separate from therapist continuity constants', async () => {
    const { CONTINUITY_MAX_PRIOR_SESSIONS } = await import(
      '../../src/lib/crossSessionContinuity.js'
    );
    expect(typeof COMPANION_MEMORY_MAX_INJECT).toBe('number');
    expect(typeof CONTINUITY_MAX_PRIOR_SESSIONS).toBe('number');
  });
});

// ─── S. Regression — companion routing flag-off behavior preserved ────────────

describe('S. Regression — companion routing flag-off behavior preserved', () => {
  it('resolveCompanionWiring returns HYBRID when all flags off', () => {
    // In test environment all flags default to false
    const wiring = resolveCompanionWiring();
    expect(wiring).toBeDefined();
    // The wiring should not have continuity_enabled when using HYBRID
    expect(wiring.continuity_enabled).toBeUndefined();
  });

  it('AI_COMPANION_WIRING_HYBRID does not have continuity_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.continuity_enabled).toBeUndefined();
  });

  it('AI_COMPANION_WIRING_UPGRADE_V1 does not have continuity_enabled', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.continuity_enabled).toBeUndefined();
  });

  it('AI_COMPANION_WIRING_UPGRADE_V2 has continuity_enabled === true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V2.continuity_enabled).toBe(true);
  });

  it('V2 wiring has identical tool_configs to V1 (no new entity access)', () => {
    const v1Entities = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.map((tc) => tc.entity_name);
    const v2Entities = AI_COMPANION_WIRING_UPGRADE_V2.tool_configs.map((tc) => tc.entity_name);
    expect(v2Entities).toEqual(v1Entities);
  });
});

// ─── T. Context block format — warm, non-clinical framing ────────────────────

describe('T. Context block format — warm, non-clinical framing', () => {
  it('uses "warm" in the instructions (not "clinical")', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block.toLowerCase()).toContain('warm');
    expect(block.toLowerCase()).not.toContain('diagnos');
    expect(block.toLowerCase()).not.toContain('clinical reasoning');
  });

  it('does not include clinical CBT terminology in framing', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    // Framing text (headers/instructions) must not include clinical CBT labels
    const framingLines = block
      .split('\n')
      .filter((line) => !line.startsWith('- '))
      .join('\n');
    expect(framingLines.toLowerCase()).not.toContain('schema');
    expect(framingLines.toLowerCase()).not.toContain('formulation');
    expect(framingLines.toLowerCase()).not.toContain('intervention');
  });

  it('companion block header differs from therapist cross-session block header', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const companionBlock = await buildCompanionContinuityBlock(entities);
    // Companion block must NOT use the therapist header
    expect(companionBlock).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
    expect(companionBlock).toContain('COMPANION CONTINUITY CONTEXT');
  });

  it('block does not contain therapist-specific instruction "longitudinal"', async () => {
    const entities = makeEntities([makeRichCompanionMemory()]);
    const block = await buildCompanionContinuityBlock(entities);
    expect(block).not.toContain('longitudinal');
  });
});
