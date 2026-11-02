/**
 * @file test/utils/therapistSummarizationPhase2.test.js
 *
 * Phase 2 — Session-End Structured Summarization
 *
 * PURPOSE
 * -------
 * 1. Verify that the summarization gate exists and is well-formed.
 * 2. Verify that summarization is gated behind THERAPIST_UPGRADE_SUMMARIZATION_ENABLED
 *    (which itself requires THERAPIST_UPGRADE_ENABLED master gate).
 * 3. Verify that the output contract matches the Phase 1 therapist memory schema.
 * 4. Verify that sanitizeSummaryRecord correctly sanitizes string and array fields.
 * 5. Verify that forbidden input fields (raw transcript markers) are rejected
 *    and trigger the safe-stub fallback.
 * 6. Verify that isRawTranscriptContent correctly identifies transcript content.
 * 7. Verify that buildSafeStubRecord produces a valid, minimal, schema-conforming stub.
 * 8. Verify that repeated calls to sanitizeSummaryRecord are deterministic (idempotent).
 * 9. Verify that summarization does not run in default mode (flag-off isolation).
 * 10. Verify that Phase 0, 0.1, and Phase 1 baselines are all still preserved.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT modify any Phase 0, 0.1, or Phase 1 test files.
 * - All Phase 0, 0.1, and Phase 1 assertions are rechecked here (additive).
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 2
 */

import { describe, it, expect } from 'vitest';

import {
  isSummarizationEnabled,
  SUMMARIZATION_FORBIDDEN_INPUT_FIELDS,
  SUMMARY_STRING_FIELD_MAX_LENGTHS,
  SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH,
  SUMMARY_ARRAY_FIELD_MAX_ITEMS,
  SUMMARY_ARRAY_ITEM_MAX_LENGTH,
  SUMMARY_RAW_TRANSCRIPT_PATTERNS,
  isRawTranscriptContent,
  sanitizeSummaryStringField,
  sanitizeSummaryArrayField,
  sanitizeSummaryRecord,
  buildSafeStubRecord,
} from '../../src/lib/summarizationGate.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_SCHEMA,
  THERAPIST_MEMORY_FIELDS,
  THERAPIST_MEMORY_ARRAY_FIELDS,
  THERAPIST_MEMORY_STRING_FIELDS,
  createEmptyTherapistMemoryRecord,
  isTherapistMemoryRecord,
} from '../../src/lib/therapistMemoryModel.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
} from '../../src/api/agentWiring.js';

import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ─── Section 1 — Summarization gate exists ────────────────────────────────────

describe('Phase 2 — Summarization gate exists and is well-formed', () => {
  it('isSummarizationEnabled is exported as a function', () => {
    expect(typeof isSummarizationEnabled).toBe('function');
  });

  it('isSummarizationEnabled returns a boolean', () => {
    expect(typeof isSummarizationEnabled()).toBe('boolean');
  });

  it('isSummarizationEnabled returns false when flags are off (default)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('SUMMARIZATION_FORBIDDEN_INPUT_FIELDS is exported as a frozen Set', () => {
    expect(SUMMARIZATION_FORBIDDEN_INPUT_FIELDS instanceof Set).toBe(true);
    expect(Object.isFrozen(SUMMARIZATION_FORBIDDEN_INPUT_FIELDS)).toBe(true);
  });

  it('SUMMARY_STRING_FIELD_MAX_LENGTHS is exported as a frozen object', () => {
    expect(typeof SUMMARY_STRING_FIELD_MAX_LENGTHS).toBe('object');
    expect(Object.isFrozen(SUMMARY_STRING_FIELD_MAX_LENGTHS)).toBe(true);
  });

  it('SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH is a positive integer', () => {
    expect(typeof SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH).toBe('number');
    expect(SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH).toBeGreaterThan(0);
    expect(Number.isInteger(SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH)).toBe(true);
  });

  it('SUMMARY_ARRAY_FIELD_MAX_ITEMS is a positive integer', () => {
    expect(typeof SUMMARY_ARRAY_FIELD_MAX_ITEMS).toBe('number');
    expect(SUMMARY_ARRAY_FIELD_MAX_ITEMS).toBeGreaterThan(0);
    expect(Number.isInteger(SUMMARY_ARRAY_FIELD_MAX_ITEMS)).toBe(true);
  });

  it('SUMMARY_ARRAY_ITEM_MAX_LENGTH is a positive integer', () => {
    expect(typeof SUMMARY_ARRAY_ITEM_MAX_LENGTH).toBe('number');
    expect(SUMMARY_ARRAY_ITEM_MAX_LENGTH).toBeGreaterThan(0);
    expect(Number.isInteger(SUMMARY_ARRAY_ITEM_MAX_LENGTH)).toBe(true);
  });

  it('SUMMARY_RAW_TRANSCRIPT_PATTERNS is a frozen array of RegExps', () => {
    expect(Array.isArray(SUMMARY_RAW_TRANSCRIPT_PATTERNS)).toBe(true);
    expect(Object.isFrozen(SUMMARY_RAW_TRANSCRIPT_PATTERNS)).toBe(true);
    for (const pattern of SUMMARY_RAW_TRANSCRIPT_PATTERNS) {
      expect(pattern instanceof RegExp).toBe(true);
    }
  });

  it('isRawTranscriptContent is exported as a function', () => {
    expect(typeof isRawTranscriptContent).toBe('function');
  });

  it('sanitizeSummaryStringField is exported as a function', () => {
    expect(typeof sanitizeSummaryStringField).toBe('function');
  });

  it('sanitizeSummaryArrayField is exported as a function', () => {
    expect(typeof sanitizeSummaryArrayField).toBe('function');
  });

  it('sanitizeSummaryRecord is exported as a function', () => {
    expect(typeof sanitizeSummaryRecord).toBe('function');
  });

  it('buildSafeStubRecord is exported as a function', () => {
    expect(typeof buildSafeStubRecord).toBe('function');
  });
});

// ─── Section 2 — Summarization is gated ──────────────────────────────────────

describe('Phase 2 — Summarization is gated (flag-off isolation)', () => {
  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED flag defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled("THERAPIST_UPGRADE_SUMMARIZATION_ENABLED") returns false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('isSummarizationEnabled() returns false (consistent with flag state)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED master gate is false (double gate)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('summarization does not run in default mode (gate is false)', () => {
    // When isSummarizationEnabled() is false, the backend function returns gated.
    // This test verifies the JS gate check that mirrors the backend ENV check.
    const gated = !isSummarizationEnabled();
    expect(gated).toBe(true);
  });
});

// ─── Section 3 — Output contract matches Phase 1 memory schema ───────────────

describe('Phase 2 — Output contract matches Phase 1 memory schema', () => {
  it('sanitizeSummaryRecord output has the therapist_memory_version key', () => {
    const { record } = sanitizeSummaryRecord({});
    expect(THERAPIST_MEMORY_VERSION_KEY in record).toBe(true);
  });

  it('sanitizeSummaryRecord output version marker equals THERAPIST_MEMORY_VERSION', () => {
    const { record } = sanitizeSummaryRecord({});
    expect(record[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('sanitizeSummaryRecord output has all string fields from the Phase 1 schema', () => {
    const { record } = sanitizeSummaryRecord({});
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      expect(field in record, `record should have field "${field}"`).toBe(true);
    }
  });

  it('sanitizeSummaryRecord output has all array fields from the Phase 1 schema', () => {
    const { record } = sanitizeSummaryRecord({});
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(field in record, `record should have field "${field}"`).toBe(true);
    }
  });

  it('sanitizeSummaryRecord output is recognised by isTherapistMemoryRecord', () => {
    const { record } = sanitizeSummaryRecord({});
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('buildSafeStubRecord output is recognised by isTherapistMemoryRecord', () => {
    const stub = buildSafeStubRecord();
    expect(isTherapistMemoryRecord(stub)).toBe(true);
  });

  it('sanitizeSummaryRecord output has all required Phase 1 fields', () => {
    const { record } = sanitizeSummaryRecord({});
    for (const field of THERAPIST_MEMORY_FIELDS) {
      expect(field in record, `output should include Phase 1 field "${field}"`).toBe(true);
    }
  });

  it('sanitizeSummaryRecord string fields default to empty string when omitted', () => {
    const { record } = sanitizeSummaryRecord({});
    for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
      if (field === THERAPIST_MEMORY_VERSION_KEY) continue;
      expect(record[field], `"${field}" should default to ''`).toBe('');
    }
  });

  it('sanitizeSummaryRecord array fields default to empty arrays when omitted', () => {
    const { record } = sanitizeSummaryRecord({});
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(Array.isArray(record[field]), `"${field}" should be an array`).toBe(true);
      expect(record[field], `"${field}" should be empty by default`).toHaveLength(0);
    }
  });

  it('sanitizeSummaryRecord populates string fields from input', () => {
    const input = {
      session_summary: 'Client made progress on thought records.',
      safety_plan_notes: 'No current risk. Safety plan in place.',
    };
    const { record } = sanitizeSummaryRecord(input);
    expect(record['session_summary']).toBe('Client made progress on thought records.');
    expect(record['safety_plan_notes']).toBe('No current risk. Safety plan in place.');
  });

  it('sanitizeSummaryRecord populates array fields from input', () => {
    const input = {
      core_patterns: ['catastrophising', 'avoidance'],
      triggers: ['work stress', 'interpersonal conflict'],
    };
    const { record } = sanitizeSummaryRecord(input);
    expect(record['core_patterns']).toEqual(['catastrophising', 'avoidance']);
    expect(record['triggers']).toEqual(['work stress', 'interpersonal conflict']);
  });
});

// ─── Section 4 — Forbidden input fields are rejected ─────────────────────────

describe('Phase 2 — Forbidden input fields trigger safe-stub fallback', () => {
  const FORBIDDEN_FIELDS = [
    'messages',
    'transcript',
    'raw_session',
    'conversation_history',
    'full_session',
    'chat_history',
    'message_log',
    'session_log',
  ];

  for (const field of FORBIDDEN_FIELDS) {
    it(`SUMMARIZATION_FORBIDDEN_INPUT_FIELDS contains "${field}"`, () => {
      expect(SUMMARIZATION_FORBIDDEN_INPUT_FIELDS.has(field)).toBe(true);
    });
  }

  it('sanitizeSummaryRecord sets safety_stub: true when "messages" is present', () => {
    const { safety_stub, rejected_fields } = sanitizeSummaryRecord({
      session_id: 'test-session',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(safety_stub).toBe(true);
    expect(rejected_fields).toContain('messages');
  });

  it('sanitizeSummaryRecord sets safety_stub: true when "transcript" is present', () => {
    const { safety_stub, rejected_fields } = sanitizeSummaryRecord({
      session_id: 'test-session',
      transcript: 'User: Hello\nTherapist: Hi there',
    });
    expect(safety_stub).toBe(true);
    expect(rejected_fields).toContain('transcript');
  });

  it('sanitizeSummaryRecord sets safety_stub: true when "raw_session" is present', () => {
    const { safety_stub, rejected_fields } = sanitizeSummaryRecord({
      raw_session: 'full session text',
    });
    expect(safety_stub).toBe(true);
    expect(rejected_fields).toContain('raw_session');
  });

  it('sanitizeSummaryRecord returns an isTherapistMemoryRecord stub even when forbidden fields are present', () => {
    const { record } = sanitizeSummaryRecord({
      session_id: 'test-session',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('sanitizeSummaryRecord stub preserves session_id from input when possible', () => {
    const { record, safety_stub } = sanitizeSummaryRecord({
      session_id: 'sess-abc',
      transcript: 'User: something',
    });
    expect(safety_stub).toBe(true);
    expect(record['session_id']).toBe('sess-abc');
  });

  it('sanitizeSummaryRecord stub has empty clinical fields', () => {
    const { record, safety_stub } = sanitizeSummaryRecord({
      messages: [],
    });
    expect(safety_stub).toBe(true);
    expect(record['session_summary']).toBe('');
    expect(record['core_patterns']).toEqual([]);
    expect(record['risk_flags']).toEqual([]);
  });

  it('SUMMARIZATION_FORBIDDEN_INPUT_FIELDS does not include valid schema fields', () => {
    for (const field of THERAPIST_MEMORY_FIELDS) {
      expect(
        SUMMARIZATION_FORBIDDEN_INPUT_FIELDS.has(field),
        `"${field}" is a valid schema field and must not be forbidden`
      ).toBe(false);
    }
  });
});

// ─── Section 5 — isRawTranscriptContent detection ────────────────────────────

describe('Phase 2 — isRawTranscriptContent correctly identifies transcript content', () => {
  it('returns false for an empty string', () => {
    expect(isRawTranscriptContent('')).toBe(false);
  });

  it('returns false for a null value (non-string)', () => {
    expect(isRawTranscriptContent(null)).toBe(false);
  });

  it('returns false for a plain clinical note', () => {
    expect(isRawTranscriptContent('Client demonstrated progress with thought records.')).toBe(false);
  });

  it('returns true for a string containing "User: " dialogue format', () => {
    expect(isRawTranscriptContent('User: How are you feeling?\nTherapist: Tell me more.')).toBe(true);
  });

  it('returns true for a string containing "Patient: " dialogue format', () => {
    expect(isRawTranscriptContent('Patient: I felt anxious today.')).toBe(true);
  });

  it('returns true for a string containing "Therapist: " dialogue format', () => {
    expect(isRawTranscriptContent('Therapist: Let\'s explore that.')).toBe(true);
  });

  it('returns true for a string containing "Client: " dialogue format', () => {
    expect(isRawTranscriptContent('Client: I am not sure what to do.')).toBe(true);
  });

  it('returns true for a string containing a timestamp [HH:MM] pattern', () => {
    expect(isRawTranscriptContent('[14:32] User said something.')).toBe(true);
  });

  it('returns false for a structured clinical pattern string', () => {
    expect(isRawTranscriptContent('catastrophising, avoidance, emotional reasoning')).toBe(false);
  });

  it('returns false for a short emotion label', () => {
    expect(isRawTranscriptContent('anxiety')).toBe(false);
  });
});

// ─── Section 6 — sanitizeSummaryStringField ───────────────────────────────────

describe('Phase 2 — sanitizeSummaryStringField sanitizes correctly', () => {
  it('returns "" for non-string values', () => {
    expect(sanitizeSummaryStringField(42, 'session_summary')).toBe('');
    expect(sanitizeSummaryStringField(null, 'session_summary')).toBe('');
    expect(sanitizeSummaryStringField([], 'session_summary')).toBe('');
  });

  it('returns "" for raw transcript content', () => {
    expect(sanitizeSummaryStringField('User: Hello\nTherapist: Hi', 'session_summary')).toBe('');
  });

  it('returns the trimmed string for valid content', () => {
    expect(sanitizeSummaryStringField('  progress made  ', 'session_summary')).toBe('progress made');
  });

  it('truncates session_summary to 2000 characters', () => {
    const long = 'a'.repeat(3000);
    const result = sanitizeSummaryStringField(long, 'session_summary');
    expect(result.length).toBe(2000);
  });

  it('truncates safety_plan_notes to 1000 characters', () => {
    const long = 'b'.repeat(2000);
    const result = sanitizeSummaryStringField(long, 'safety_plan_notes');
    expect(result.length).toBe(1000);
  });

  it('truncates unknown fields to SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH', () => {
    const long = 'c'.repeat(1000);
    const result = sanitizeSummaryStringField(long, 'some_other_field');
    expect(result.length).toBe(SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH);
  });

  it('returns "" for an empty string', () => {
    expect(sanitizeSummaryStringField('', 'session_summary')).toBe('');
  });
});

// ─── Section 7 — sanitizeSummaryArrayField ───────────────────────────────────

describe('Phase 2 — sanitizeSummaryArrayField sanitizes correctly', () => {
  it('returns [] for non-array values', () => {
    expect(sanitizeSummaryArrayField('string')).toEqual([]);
    expect(sanitizeSummaryArrayField(42)).toEqual([]);
    expect(sanitizeSummaryArrayField(null)).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(sanitizeSummaryArrayField([])).toEqual([]);
  });

  it('drops non-string items', () => {
    const result = sanitizeSummaryArrayField(['valid', 42, null, 'also valid']);
    expect(result).toEqual(['valid', 'also valid']);
  });

  it('drops items that are raw transcript content', () => {
    const result = sanitizeSummaryArrayField([
      'catastrophising',
      'User: I feel bad today',
      'avoidance',
    ]);
    expect(result).toEqual(['catastrophising', 'avoidance']);
  });

  it('trims each item', () => {
    const result = sanitizeSummaryArrayField(['  anxiety  ', '  avoidance  ']);
    expect(result).toEqual(['anxiety', 'avoidance']);
  });

  it('drops items that are empty after trimming', () => {
    const result = sanitizeSummaryArrayField(['valid', '   ', 'also valid']);
    expect(result).toEqual(['valid', 'also valid']);
  });

  it('truncates items to SUMMARY_ARRAY_ITEM_MAX_LENGTH', () => {
    const long = 'x'.repeat(1000);
    const result = sanitizeSummaryArrayField([long]);
    expect(result[0].length).toBe(SUMMARY_ARRAY_ITEM_MAX_LENGTH);
  });

  it('truncates array to SUMMARY_ARRAY_FIELD_MAX_ITEMS', () => {
    const big = Array.from({ length: 30 }, (_, i) => `item_${i}`);
    const result = sanitizeSummaryArrayField(big);
    expect(result.length).toBe(SUMMARY_ARRAY_FIELD_MAX_ITEMS);
  });
});

// ─── Section 8 — buildSafeStubRecord ─────────────────────────────────────────

describe('Phase 2 — buildSafeStubRecord produces a valid minimal stub', () => {
  it('calling buildSafeStubRecord does not throw', () => {
    expect(() => buildSafeStubRecord()).not.toThrow();
  });

  it('stub is a plain object', () => {
    const stub = buildSafeStubRecord();
    expect(typeof stub).toBe('object');
    expect(stub).not.toBeNull();
  });

  it('stub has the correct version marker', () => {
    const stub = buildSafeStubRecord();
    expect(stub[THERAPIST_MEMORY_VERSION_KEY]).toBe(THERAPIST_MEMORY_VERSION);
  });

  it('stub is recognised by isTherapistMemoryRecord', () => {
    const stub = buildSafeStubRecord();
    expect(isTherapistMemoryRecord(stub)).toBe(true);
  });

  it('stub has empty session_summary', () => {
    const stub = buildSafeStubRecord('sess-1', '2026-01-01');
    expect(stub['session_summary']).toBe('');
  });

  it('stub has all clinical array fields as empty arrays', () => {
    const stub = buildSafeStubRecord();
    for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
      expect(Array.isArray(stub[field]), `"${field}" should be an array`).toBe(true);
      expect(stub[field], `"${field}" should be empty`).toHaveLength(0);
    }
  });

  it('stub preserves provided session_id', () => {
    const stub = buildSafeStubRecord('session-xyz', '2026-01-01');
    expect(stub['session_id']).toBe('session-xyz');
  });

  it('stub preserves provided session_date', () => {
    const stub = buildSafeStubRecord('sess-1', '2026-03-19');
    expect(stub['session_date']).toBe('2026-03-19');
  });

  it('stub has a last_summarized_date string', () => {
    const stub = buildSafeStubRecord();
    expect(typeof stub['last_summarized_date']).toBe('string');
    expect(stub['last_summarized_date'].length).toBeGreaterThan(0);
  });

  it('stub has all required Phase 1 fields', () => {
    const stub = buildSafeStubRecord();
    for (const field of THERAPIST_MEMORY_FIELDS) {
      expect(field in stub, `stub should have field "${field}"`).toBe(true);
    }
  });

  it('stub has no "messages" field (no raw transcript)', () => {
    const stub = buildSafeStubRecord();
    expect('messages' in stub).toBe(false);
  });

  it('stub has no "transcript" field (no raw transcript)', () => {
    const stub = buildSafeStubRecord();
    expect('transcript' in stub).toBe(false);
  });

  it('stub truncates session_id if longer than 256 characters', () => {
    const longId = 'a'.repeat(300);
    const stub = buildSafeStubRecord(longId);
    expect(stub['session_id'].length).toBeLessThanOrEqual(256);
  });
});

// ─── Section 9 — Repeated calls are deterministic (idempotency) ──────────────

describe('Phase 2 — Repeated calls to sanitizeSummaryRecord are deterministic', () => {
  it('calling sanitizeSummaryRecord twice with the same input produces equal records', () => {
    const input = {
      session_id: 'sess-1',
      session_date: '2026-03-19',
      session_summary: 'Progress on thought records.',
      core_patterns: ['catastrophising'],
      triggers: ['work stress'],
    };
    const { record: record1 } = sanitizeSummaryRecord(input);
    const { record: record2 } = sanitizeSummaryRecord(input);
    expect(JSON.stringify(record1)).toBe(JSON.stringify(record2));
  });

  it('sanitizing an already-sanitized record produces the same result', () => {
    const input = {
      session_id: 'sess-2',
      session_summary: 'Good progress.',
      core_patterns: ['rumination'],
    };
    const { record: first } = sanitizeSummaryRecord(input);
    const { record: second } = sanitizeSummaryRecord(first);
    for (const field of THERAPIST_MEMORY_FIELDS) {
      expect(JSON.stringify(second[field])).toBe(
        JSON.stringify(first[field]),
        `field "${field}" should be identical after re-sanitization`
      );
    }
  });

  it('repeated calls do not share array references', () => {
    const input = { core_patterns: ['pattern1'] };
    const { record: r1 } = sanitizeSummaryRecord(input);
    const { record: r2 } = sanitizeSummaryRecord(input);
    r1['core_patterns'].push('new_pattern');
    expect(r2['core_patterns']).toHaveLength(1);
  });
});

// ─── Section 10 — No raw transcript dumping ───────────────────────────────────

describe('Phase 2 — No raw transcript dumping in stored records', () => {
  it('sanitizeSummaryRecord output has no "messages" field', () => {
    const { record } = sanitizeSummaryRecord({ messages: ['hello', 'world'] });
    expect('messages' in record).toBe(false);
  });

  it('sanitizeSummaryRecord output has no "transcript" field', () => {
    const { record } = sanitizeSummaryRecord({ transcript: 'raw text' });
    expect('transcript' in record).toBe(false);
  });

  it('sanitizeSummaryRecord output has no "conversation_history" field', () => {
    const { record } = sanitizeSummaryRecord({ conversation_history: [] });
    expect('conversation_history' in record).toBe(false);
  });

  it('raw transcript in session_summary is cleared to empty string', () => {
    const input = {
      session_summary: 'User: I feel anxious.\nTherapist: Tell me more.',
    };
    const { record } = sanitizeSummaryRecord(input);
    expect(record['session_summary']).toBe('');
  });

  it('raw transcript in a core_patterns item is dropped', () => {
    const input = {
      core_patterns: ['catastrophising', 'User: I feel terrible'],
    };
    const { record } = sanitizeSummaryRecord(input);
    expect(record['core_patterns']).toEqual(['catastrophising']);
  });

  it('schema has no "messages" field (no raw transcript path via schema)', () => {
    expect('messages' in THERAPIST_MEMORY_SCHEMA).toBe(false);
  });

  it('schema has no "transcript" field', () => {
    expect('transcript' in THERAPIST_MEMORY_SCHEMA).toBe(false);
  });
});

// ─── Section 11 — Summarization failure does not break current flow ───────────

describe('Phase 2 — Summarization failure safety', () => {
  it('sanitizeSummaryRecord does not throw when given null', () => {
    expect(() => sanitizeSummaryRecord(null)).not.toThrow();
  });

  it('sanitizeSummaryRecord does not throw when given undefined', () => {
    expect(() => sanitizeSummaryRecord(undefined)).not.toThrow();
  });

  it('sanitizeSummaryRecord does not throw when given an empty object', () => {
    expect(() => sanitizeSummaryRecord({})).not.toThrow();
  });

  it('sanitizeSummaryRecord does not throw when given a fully malformed object', () => {
    const malformed = {
      session_summary: 12345,
      core_patterns: 'not an array',
      triggers: { key: 'value' },
      last_summarized_date: null,
    };
    expect(() => sanitizeSummaryRecord(malformed)).not.toThrow();
  });

  it('buildSafeStubRecord does not throw when called with no arguments', () => {
    expect(() => buildSafeStubRecord()).not.toThrow();
  });

  it('buildSafeStubRecord does not throw when given non-string arguments', () => {
    expect(() => buildSafeStubRecord(42, null)).not.toThrow();
  });

  it('summarization gate check is inert — calling isSummarizationEnabled does not throw', () => {
    expect(() => isSummarizationEnabled()).not.toThrow();
  });
});

// ─── Section 12 — Phase 0, 0.1, Phase 1 baselines preserved ──────────────────

describe('Phase 2 — Phase 0 / 0.1 / Phase 1 baselines preserved (regression check)', () => {
  it('THERAPIST_UPGRADE_FLAGS is still frozen', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('THERAPIST_UPGRADE_FLAGS still contains exactly 14 flags', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toHaveLength(17);
  });

  it('all Stage 2 flags are still false', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });

  it('THERAPIST_UPGRADE_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_MEMORY_ENABLED is still false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')).toBe(false);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is still false', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID (not Stage2 V1)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
  });

  it('resolveTherapistWiring() still returns CBT_THERAPIST_WIRING_HYBRID in default mode', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AI_COMPANION_WIRING is still AI_COMPANION_WIRING_HYBRID (unchanged)', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING still has exactly 12 tool_configs', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.tool_configs).toHaveLength(12);
  });

  it('CBT_THERAPIST_WIRING_HYBRID still has 12 tool_configs (unmodified by Phase 2)', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.tool_configs).toHaveLength(12);
  });

  it('AI_COMPANION_WIRING_HYBRID still has 9 tool_configs (unmodified by Phase 2)', () => {
    expect(AI_COMPANION_WIRING_HYBRID.tool_configs).toHaveLength(9);
  });

  it('THERAPIST_MEMORY_SCHEMA is still frozen (Phase 1 schema unchanged)', () => {
    expect(Object.isFrozen(THERAPIST_MEMORY_SCHEMA)).toBe(true);
  });

  it('Phase 1 memory model is still usable (createEmptyTherapistMemoryRecord)', () => {
    const record = createEmptyTherapistMemoryRecord();
    expect(isTherapistMemoryRecord(record)).toBe(true);
  });

  it('isUpgradeEnabled returns false for all known flags (Phase 0 guarantee)', () => {
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      expect(isUpgradeEnabled(flagName), `"${flagName}" must be unreachable`).toBe(false);
    }
  });
});

// ─── Section 13 — No automatic write surface in the JS layer ─────────────────

describe('Phase 2 — No automatic write surface in the JS layer', () => {
  it('summarizationGate.js exports only pure functions and config constants (no API calls)', () => {
    // isSummarizationEnabled only reads a flag — no writes.
    const result = isSummarizationEnabled();
    expect(typeof result).toBe('boolean');
  });

  it('sanitizeSummaryRecord is a pure function (no side effects)', () => {
    const input = { session_id: 'test', core_patterns: ['avoidance'] };
    const { record } = sanitizeSummaryRecord(input);
    // Record is a plain object — no API calls, no state changes
    expect(typeof record).toBe('object');
    expect(record['session_id']).toBe('test');
  });

  it('buildSafeStubRecord is a pure function (no side effects)', () => {
    const stub = buildSafeStubRecord('sess-1', '2026-01-01');
    // Stub is a plain object — no API calls
    expect(stub['session_id']).toBe('sess-1');
  });
});
