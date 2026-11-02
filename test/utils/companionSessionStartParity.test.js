/**
 * @file test/utils/companionSessionStartParity.test.js
 *
 * Companion Session-Start Parity + Warmth Fallback — test suite.
 *
 * Validates:
 *   A. buildCompanionSessionStartContextAsync — basic behavior
 *   B. Scoring: scoreCompanionMemory
 *   C. Warmth fallback — weak / empty memory with continuity_enabled
 *   D. No-fallback when continuity NOT enabled (flags off)
 *   E. Parity: the same function is imported by all three entry-point modules
 *   F. Role isolation: companion context never injects therapist content
 *   G. Privacy: no raw transcript leakage; no cross-user / private-entity leakage
 *   H. Safe behavior when companion continuity retrieval fails
 *   I. No regression: therapist flows unaffected
 *   J. Scored selection: higher-importance records win; low-quality records filtered
 *   K. Constants are stable and within safe ranges
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scoreCompanionMemory,
  buildCompanionSessionStartContextAsync,
  COMPANION_MEMORY_MIN_CONTENT_LENGTH,
  COMPANION_MEMORY_MAX_FETCH,
  COMPANION_MEMORY_MAX_INJECT,
  COMPANION_WARMTH_FALLBACK_CONTEXT,
} from '../../src/lib/companionContinuity.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMemory(content, importance = 1, is_active = true) {
  return { content, importance, is_active };
}

function makeEntities(memories) {
  return {
    CompanionMemory: {
      filter: vi.fn().mockResolvedValue(memories),
    },
  };
}

function makeWiringWithContinuity(enabled = true) {
  return { continuity_enabled: enabled };
}

// ─── A. buildCompanionSessionStartContextAsync — basic behavior ───────────────

describe('A. buildCompanionSessionStartContextAsync — basic behavior', () => {
  it('returns a non-empty string when useful memories exist', async () => {
    const entities = makeEntities([makeMemory('Feeling better about work lately', 2)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes "[User Context from Previous Sessions]" header when memories are present', async () => {
    const entities = makeEntities([makeMemory('Has been working on sleep habits', 3)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toContain('[User Context from Previous Sessions]');
  });

  it('includes memory content lines prefixed with "- "', async () => {
    const entities = makeEntities([makeMemory('Practicing mindfulness daily', 2)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toContain('- Practicing mindfulness daily');
  });

  it('returns empty string when memories array is empty and continuity is not enabled', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toBe('');
  });

  it('trims whitespace from memory content lines', async () => {
    const entities = makeEntities([makeMemory('  Some padded content here  ', 1)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toContain('- Some padded content here');
    expect(result).not.toContain('-   Some padded content');
  });
});

// ─── B. scoreCompanionMemory ──────────────────────────────────────────────────

describe('B. scoreCompanionMemory', () => {
  it('returns 0 for null', () => {
    expect(scoreCompanionMemory(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(scoreCompanionMemory(undefined)).toBe(0);
  });

  it('returns 0 for non-object', () => {
    expect(scoreCompanionMemory('string')).toBe(0);
    expect(scoreCompanionMemory(42)).toBe(0);
  });

  it('returns 0 for missing content', () => {
    expect(scoreCompanionMemory({})).toBe(0);
  });

  it('returns 0 for content shorter than COMPANION_MEMORY_MIN_CONTENT_LENGTH', () => {
    const short = 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH - 1);
    expect(scoreCompanionMemory({ content: short })).toBe(0);
  });

  it('returns 0 for content exactly at COMPANION_MEMORY_MIN_CONTENT_LENGTH - 1 chars', () => {
    const content = 'x'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH - 1);
    expect(scoreCompanionMemory({ content })).toBe(0);
  });

  it('returns > 0 for content at exactly COMPANION_MEMORY_MIN_CONTENT_LENGTH chars', () => {
    const content = 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH);
    expect(scoreCompanionMemory({ content })).toBeGreaterThan(0);
  });

  it('base score is 1 for meaningful content with no importance', () => {
    expect(scoreCompanionMemory({ content: 'Some meaningful memory text here' })).toBe(1);
  });

  it('adds importance to base score when importance is positive number', () => {
    const record = makeMemory('Some meaningful memory text here', 5);
    expect(scoreCompanionMemory(record)).toBe(6); // 1 base + 5 importance
  });

  it('does not add importance when importance is 0', () => {
    const record = makeMemory('Some meaningful memory text here', 0);
    expect(scoreCompanionMemory(record)).toBe(1);
  });

  it('does not add importance when importance is negative', () => {
    const record = makeMemory('Some meaningful memory text here', -3);
    expect(scoreCompanionMemory(record)).toBe(1);
  });

  it('does not add importance when importance is non-numeric', () => {
    const record = { content: 'Some meaningful memory text here', importance: 'high' };
    expect(scoreCompanionMemory(record)).toBe(1);
  });

  it('trims content before length check', () => {
    // Content with lots of whitespace padding should be trimmed before check
    const paddedShort = '  ' + 'a'.repeat(COMPANION_MEMORY_MIN_CONTENT_LENGTH - 1) + '  ';
    expect(scoreCompanionMemory({ content: paddedShort })).toBe(0);
  });
});

// ─── C. Warmth fallback — weak / empty memory with continuity_enabled ─────────

describe('C. Warmth fallback — weak/empty memory with continuity_enabled=true', () => {
  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when no memories and continuity is enabled', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(true));
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });

  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when all memories score 0 and continuity is enabled', async () => {
    const entities = makeEntities([
      makeMemory('short', 0),
      { content: null },
      makeMemory('x', 0),
    ]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(true));
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });

  it('COMPANION_WARMTH_FALLBACK_CONTEXT is a non-empty string', () => {
    expect(typeof COMPANION_WARMTH_FALLBACK_CONTEXT).toBe('string');
    expect(COMPANION_WARMTH_FALLBACK_CONTEXT.length).toBeGreaterThan(20);
  });

  it('COMPANION_WARMTH_FALLBACK_CONTEXT contains expected key warmth phrases', () => {
    // Verify the actual constant value matches its intent (warm, welcoming, non-clinical)
    const lc = COMPANION_WARMTH_FALLBACK_CONTEXT.toLowerCase();
    expect(lc).toContain('greet');
    expect(lc).toContain('warm');
    expect(lc).toContain('mind');
  });

  it('COMPANION_WARMTH_FALLBACK_CONTEXT does not contain clinical/therapist content', () => {
    const clinical = ['diagnosis', 'CBT', 'formulation', 'clinical', 'therapy', 'therapist'];
    for (const term of clinical) {
      expect(COMPANION_WARMTH_FALLBACK_CONTEXT.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it('COMPANION_WARMTH_FALLBACK_CONTEXT contains warm/welcoming language', () => {
    // Should contain at least one warmth indicator
    const warmWords = ['warm', 'welcome', 'greet', 'mind', 'feel'];
    const lc = COMPANION_WARMTH_FALLBACK_CONTEXT.toLowerCase();
    const found = warmWords.some((w) => lc.includes(w));
    expect(found).toBe(true);
  });

  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when entity client is null and continuity is enabled', async () => {
    const result = await buildCompanionSessionStartContextAsync(null, makeWiringWithContinuity(true));
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });

  it('returns COMPANION_WARMTH_FALLBACK_CONTEXT when entity client lacks CompanionMemory and continuity is enabled', async () => {
    const result = await buildCompanionSessionStartContextAsync({}, makeWiringWithContinuity(true));
    expect(result).toBe(COMPANION_WARMTH_FALLBACK_CONTEXT);
  });
});

// ─── D. No-fallback when continuity NOT enabled (flags off) ───────────────────

describe('D. No-fallback when continuity NOT enabled (flags off)', () => {
  it('returns empty string for empty memories when continuity_enabled is false', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toBe('');
  });

  it('returns empty string for all-thin memories when continuity_enabled is false', async () => {
    const entities = makeEntities([makeMemory('x', 0)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toBe('');
  });

  it('returns empty string when wiring is null and memories are empty', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, null);
    expect(result).toBe('');
  });

  it('returns empty string when wiring is undefined and memories are empty', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, undefined);
    expect(result).toBe('');
  });

  it('returns empty string when continuity_enabled is absent (undefined) and memories are empty', async () => {
    const entities = makeEntities([]);
    const result = await buildCompanionSessionStartContextAsync(entities, {});
    expect(result).toBe('');
  });
});

// ─── E. Parity: shared function exported from companionContinuity.js ──────────

describe('E. Parity: shared module exports are usable by all entry points', () => {
  it('buildCompanionSessionStartContextAsync is a function', () => {
    expect(typeof buildCompanionSessionStartContextAsync).toBe('function');
  });

  it('buildCompanionSessionStartContextAsync returns a Promise', () => {
    const result = buildCompanionSessionStartContextAsync(null, null);
    expect(result).toBeInstanceOf(Promise);
    return result; // ensure it resolves
  });

  it('AiCompanion.jsx imports buildCompanionSessionStartContextAsync', async () => {
    // Verify the import exists at module level by reading the source
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../../src/components/ai/AiCompanion.jsx', import.meta.url),
      'utf8',
    );
    expect(src).toContain("from '@/lib/companionContinuity.js'");
    expect(src).toContain('buildCompanionSessionStartContextAsync');
  });

  it('DraggableAiCompanion.jsx imports buildCompanionSessionStartContextAsync', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../../src/components/ai/DraggableAiCompanion.jsx', import.meta.url),
      'utf8',
    );
    expect(src).toContain("from '@/lib/companionContinuity.js'");
    expect(src).toContain('buildCompanionSessionStartContextAsync');
  });

  it('CoachingSessionWizard.jsx imports buildCompanionSessionStartContextAsync', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(
      new URL('../../src/components/coaching/CoachingSessionWizard.jsx', import.meta.url),
      'utf8',
    );
    expect(src).toContain("from '@/lib/companionContinuity.js'");
    expect(src).toContain('buildCompanionSessionStartContextAsync');
  });

  it('all three entry points pass memory_context to createConversation metadata', async () => {
    const fs = await import('fs');
    const files = [
      '../../src/components/ai/AiCompanion.jsx',
      '../../src/components/ai/DraggableAiCompanion.jsx',
      '../../src/components/coaching/CoachingSessionWizard.jsx',
    ];
    for (const filePath of files) {
      const src = fs.readFileSync(new URL(filePath, import.meta.url), 'utf8');
      expect(src).toContain('memory_context');
    }
  });
});

// ─── F. Role isolation: no therapist content injected into companion context ──

describe('F. Role isolation: companion context does not inject therapist content', () => {
  it('context block header is companion-appropriate, not therapist-framing', async () => {
    const entities = makeEntities([makeMemory('User mentioned feeling anxious lately', 2)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toContain('[User Context from Previous Sessions]');
    // Must NOT use therapist clinical framing
    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
    expect(result).not.toContain('clinical');
    expect(result).not.toContain('formulation');
  });

  it('does not include CBT/clinical directives in companion context', async () => {
    const entities = makeEntities([makeMemory('Working on anxiety management', 2)]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(true));
    const clinical = ['cbt', 'formulation', 'working_hypotheses', 'interventions_used', 'risk_flags'];
    for (const term of clinical) {
      expect(result.toLowerCase()).not.toContain(term);
    }
  });

  it('buildCompanionSessionStartContextAsync is not exported from workflowContextInjector', async () => {
    const wci = await import('../../src/lib/workflowContextInjector.js');
    expect(wci.buildCompanionSessionStartContextAsync).toBeUndefined();
  });

  it('buildCompanionSessionStartContextAsync IS exported from companionContinuity.js', async () => {
    const cc = await import('../../src/lib/companionContinuity.js');
    expect(typeof cc.buildCompanionSessionStartContextAsync).toBe('function');
  });

  it('COMPANION_WARMTH_FALLBACK_CONTEXT does not contain therapist-specific terminology', () => {
    const therapistTerms = ['therapist', 'cbt', 'formulation', 'clinical', 'hypothesis', 'intervention'];
    const lc = COMPANION_WARMTH_FALLBACK_CONTEXT.toLowerCase();
    for (const term of therapistTerms) {
      expect(lc).not.toContain(term);
    }
  });
});

// ─── G. Privacy: no raw transcript leakage; no private-entity leakage ─────────

describe('G. Privacy: no raw transcript leakage; no private-entity leakage', () => {
  it('does not include raw transcript markers in output', async () => {
    const entities = makeEntities([
      makeMemory('User was feeling stressed about work', 2),
    ]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(true));
    const transcriptMarkers = ['user_message', 'assistant_message', 'role:', '"content"', '"messages"'];
    for (const marker of transcriptMarkers) {
      expect(result).not.toContain(marker);
    }
  });

  it('filter call is scoped to CompanionMemory only (no ThoughtJournal, Conversation, etc.)', async () => {
    const entities = makeEntities([makeMemory('Some memory', 1)]);
    await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    // Only CompanionMemory.filter should have been called
    expect(entities.CompanionMemory.filter).toHaveBeenCalledTimes(1);
    // No other entity should be present or called
    expect(entities.ThoughtJournal).toBeUndefined();
    expect(entities.Conversation).toBeUndefined();
    expect(entities.CaseFormulation).toBeUndefined();
  });

  it('filters only active memories (is_active: true)', async () => {
    const entities = makeEntities([makeMemory('Active memory', 2)]);
    await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(entities.CompanionMemory.filter).toHaveBeenCalledWith(
      { is_active: true },
      '-importance',
      expect.any(Number),
    );
  });

  it('output never exceeds COMPANION_MEMORY_MAX_INJECT memory lines', async () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      makeMemory(`Memory line number ${i + 1} about user behavior`, i + 1),
    );
    const entities = makeEntities(memories);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    const lines = result.split('\n').filter((l) => l.startsWith('- '));
    expect(lines.length).toBeLessThanOrEqual(COMPANION_MEMORY_MAX_INJECT);
  });
});

// ─── H. Safe behavior when companion continuity retrieval fails ───────────────

describe('H. Safe behavior when retrieval fails', () => {
  it('returns empty string when CompanionMemory.filter throws and continuity is disabled', async () => {
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    };
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toBe('');
  });

  it('returns empty string when CompanionMemory.filter throws and continuity is enabled', async () => {
    // Fail-closed: throw → empty string even with continuity on
    const entities = {
      CompanionMemory: {
        filter: vi.fn().mockRejectedValue(new Error('Timeout')),
      },
    };
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(true));
    expect(result).toBe('');
  });

  it('returns empty string when entities is null regardless of wiring', async () => {
    const resultOff = await buildCompanionSessionStartContextAsync(null, makeWiringWithContinuity(false));
    expect(resultOff).toBe('');
  });

  it('returns empty string when entities has no CompanionMemory property and continuity is disabled', async () => {
    const result = await buildCompanionSessionStartContextAsync({}, makeWiringWithContinuity(false));
    expect(result).toBe('');
  });

  it('does not throw under any input combination', async () => {
    const cases = [
      [null, null],
      [undefined, undefined],
      [{}, {}],
      [null, makeWiringWithContinuity(true)],
      [makeEntities([]), makeWiringWithContinuity(true)],
      [makeEntities([null, undefined, {}, makeMemory('ok content here', 1)]), makeWiringWithContinuity(true)],
    ];
    for (const [entities, wiring] of cases) {
      await expect(
        buildCompanionSessionStartContextAsync(entities, wiring),
      ).resolves.not.toThrow();
    }
  });
});

// ─── I. No regression: therapist flows unaffected ────────────────────────────

describe('I. No regression: therapist flows unaffected', () => {
  it('buildV7SessionStartContentAsync is not affected by companion changes', async () => {
    const wci = await import('../../src/lib/workflowContextInjector.js');
    expect(typeof wci.buildV7SessionStartContentAsync).toBe('function');
  });

  it('crossSessionContinuity.buildCrossSessionContinuityBlock is still exported', async () => {
    const csc = await import('../../src/lib/crossSessionContinuity.js');
    expect(typeof csc.buildCrossSessionContinuityBlock).toBe('function');
  });

  it('THERAPIST_UPGRADE_FLAGS are unrelated to companion context builder', async () => {
    const { THERAPIST_UPGRADE_FLAGS } = await import('../../src/lib/featureFlags.js');
    // Companion context builder must not import featureFlags or depend on therapist flags.
    // (It is acceptable for doc comments to reference therapist flag names for documentation.)
    const src = (await import('fs')).readFileSync(
      new URL('../../src/lib/companionContinuity.js', import.meta.url),
      'utf8',
    );
    // Must not contain an import from featureFlags
    expect(src).not.toMatch(/import[^;]+from\s+['"].*featureFlags/);
    // Must not reference therapist upgrade flags in code (outside of comments)
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toContain('THERAPIST_UPGRADE');
    // Therapist flags should still exist and be frozen
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });
});

// ─── J. Scored selection quality ─────────────────────────────────────────────

describe('J. Scored selection — higher-importance wins; thin records filtered', () => {
  it('selects higher-scored memories over lower-scored ones', async () => {
    const entities = makeEntities([
      makeMemory('Low importance memory about walking', 1),
      makeMemory('High importance memory about sleep and stress management', 10),
      makeMemory('Medium importance memory about goals', 3),
    ]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    // High importance line should appear before low importance
    const highIdx = result.indexOf('High importance memory');
    const lowIdx = result.indexOf('Low importance memory');
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(lowIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeLessThan(lowIdx);
  });

  it('filters out records with content too short to be useful', async () => {
    const entities = makeEntities([
      makeMemory('x', 5),          // too short, score 0
      makeMemory('Meaningful memory content about the person', 2),
    ]);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    expect(result).toContain('Meaningful memory content');
    expect(result).not.toContain('- x');
  });

  it('returns only COMPANION_MEMORY_MAX_INJECT memories max', async () => {
    const memories = Array.from({ length: COMPANION_MEMORY_MAX_INJECT + 4 }, (_, i) =>
      makeMemory(`This is memory number ${i} and has enough content`, i + 1),
    );
    const entities = makeEntities(memories);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    const lines = result.split('\n').filter((l) => l.startsWith('- '));
    expect(lines.length).toBe(COMPANION_MEMORY_MAX_INJECT);
  });

  it('includes all memories when count is below COMPANION_MEMORY_MAX_INJECT', async () => {
    const count = COMPANION_MEMORY_MAX_INJECT - 1;
    const memories = Array.from({ length: count }, (_, i) =>
      makeMemory(`Memory entry number ${i} with sufficient content`, i + 1),
    );
    const entities = makeEntities(memories);
    const result = await buildCompanionSessionStartContextAsync(entities, makeWiringWithContinuity(false));
    const lines = result.split('\n').filter((l) => l.startsWith('- '));
    expect(lines.length).toBe(count);
  });
});

// ─── K. Constants are stable and within safe ranges ──────────────────────────

describe('K. Constants are stable and within safe ranges', () => {
  it('COMPANION_MEMORY_MIN_CONTENT_LENGTH is a positive integer', () => {
    expect(Number.isInteger(COMPANION_MEMORY_MIN_CONTENT_LENGTH)).toBe(true);
    expect(COMPANION_MEMORY_MIN_CONTENT_LENGTH).toBeGreaterThan(0);
  });

  it('COMPANION_MEMORY_MAX_FETCH >= COMPANION_MEMORY_MAX_INJECT', () => {
    expect(COMPANION_MEMORY_MAX_FETCH).toBeGreaterThanOrEqual(COMPANION_MEMORY_MAX_INJECT);
  });

  it('COMPANION_MEMORY_MAX_INJECT is between 1 and 20', () => {
    expect(COMPANION_MEMORY_MAX_INJECT).toBeGreaterThanOrEqual(1);
    expect(COMPANION_MEMORY_MAX_INJECT).toBeLessThanOrEqual(20);
  });

  it('COMPANION_MEMORY_MAX_FETCH is between 1 and 50', () => {
    expect(COMPANION_MEMORY_MAX_FETCH).toBeGreaterThanOrEqual(1);
    expect(COMPANION_MEMORY_MAX_FETCH).toBeLessThanOrEqual(50);
  });
});
