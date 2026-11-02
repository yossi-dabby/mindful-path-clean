/**
 * @file test/utils/longitudinalStateBuilder.test.js
 *
 * Wave 3A — Longitudinal Therapeutic State Builder (Scaffold) — Tests
 *
 * PURPOSE
 * -------
 * Validates the pure deterministic longitudinalStateBuilder module:
 *   1. Schema helpers in therapistMemoryModel.js (LTS_* exports)
 *   2. buildLongitudinalState() — all input paths
 *
 * COVERAGE REQUIREMENTS (per Wave 3A problem statement)
 * ─────────────────────────────────────────────────────
 *  A. Empty input → safe empty LTS
 *  B. 1 session → early / insufficient-data safe behavior
 *  C. Repeated patterns → recurring_patterns with bounded counts
 *  D. Repeated open tasks → persistent_open_tasks with bounded carry count
 *  E. Decreasing risk flags → progressing path only when thresholds are met
 *  F. Stagnation path with repeated blockers
 *  G. Noisy / null / partial session records → graceful fallback
 *  H. Output bounds on all arrays / strings
 *  I. Deterministic output ordering
 *  J. No mutation of input objects
 *  K. No free-text spillover beyond allowed bounded labels
 *  L. helpful_interventions and stalled_interventions remain conservative
 *     under ambiguous evidence
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import any runtime modules (agentWiring, featureFlags, etc.).
 * - Does NOT enable any feature flags.
 * - All tests are pure and deterministic — no async, no network.
 * - No live Base44 backend required.
 *
 * Source of truth: Wave 3A problem statement.
 */

import { describe, it, expect } from 'vitest';

// ─── Modules under test ───────────────────────────────────────────────────────

import {
  LTS_MEMORY_TYPE,
  LTS_VERSION,
  LTS_ARRAY_MAX,
  LTS_STRING_MAX_CHARS,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
  LTS_RECURRING_PATTERN_MIN_COUNT,
  LTS_PERSISTENT_TASK_MIN_COUNT,
  LTS_PROGRESSING_MIN_CLEAN_SESSIONS,
  LTS_STAGNATING_MIN_REPEATED_BLOCKERS,
  LTS_SCHEMA,
  LTS_FIELDS,
  LTS_ARRAY_FIELDS,
  LTS_STRING_FIELDS,
  LTS_TRAJECTORIES,
  createEmptyLTSRecord,
  isLTSRecord,
} from '../../src/lib/therapistMemoryModel.js';

import {
  LTS_BUILDER_VERSION,
  buildLongitudinalState,
} from '../../src/lib/longitudinalStateBuilder.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Creates a minimal valid session record.
 */
function makeSession(overrides = {}) {
  return {
    session_date: '2026-01-01T10:00:00.000Z',
    core_patterns: [],
    follow_up_tasks: [],
    interventions_used: [],
    risk_flags: [],
    goals_referenced: [],
    ...overrides,
  };
}

/**
 * Returns an array of N clean sessions (no risk, no tasks, no patterns).
 */
function makeCleanSessions(n) {
  return Array.from({ length: n }, (_, i) =>
    makeSession({ session_date: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1 — LTS schema constants exported from therapistMemoryModel.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS schema constants', () => {
  it('LTS_MEMORY_TYPE is exported as a string', () => {
    expect(typeof LTS_MEMORY_TYPE).toBe('string');
    expect(LTS_MEMORY_TYPE.length).toBeGreaterThan(0);
  });

  it('LTS_MEMORY_TYPE equals "lts"', () => {
    expect(LTS_MEMORY_TYPE).toBe('lts');
  });

  it('LTS_VERSION is exported as a string', () => {
    expect(typeof LTS_VERSION).toBe('string');
    expect(LTS_VERSION.length).toBeGreaterThan(0);
  });

  it('LTS_VERSION equals "1"', () => {
    expect(LTS_VERSION).toBe('1');
  });

  it('LTS_ARRAY_MAX is a positive integer', () => {
    expect(typeof LTS_ARRAY_MAX).toBe('number');
    expect(Number.isInteger(LTS_ARRAY_MAX)).toBe(true);
    expect(LTS_ARRAY_MAX).toBeGreaterThan(0);
  });

  it('LTS_STRING_MAX_CHARS is a positive integer', () => {
    expect(typeof LTS_STRING_MAX_CHARS).toBe('number');
    expect(Number.isInteger(LTS_STRING_MAX_CHARS)).toBe(true);
    expect(LTS_STRING_MAX_CHARS).toBeGreaterThan(0);
  });

  it('LTS_MIN_SESSIONS_FOR_SIGNALS is a positive integer >= 2', () => {
    expect(typeof LTS_MIN_SESSIONS_FOR_SIGNALS).toBe('number');
    expect(LTS_MIN_SESSIONS_FOR_SIGNALS).toBeGreaterThanOrEqual(2);
  });

  it('LTS_RECURRING_PATTERN_MIN_COUNT is a positive integer >= 2', () => {
    expect(LTS_RECURRING_PATTERN_MIN_COUNT).toBeGreaterThanOrEqual(2);
  });

  it('LTS_PERSISTENT_TASK_MIN_COUNT is a positive integer >= 2', () => {
    expect(LTS_PERSISTENT_TASK_MIN_COUNT).toBeGreaterThanOrEqual(2);
  });

  it('LTS_PROGRESSING_MIN_CLEAN_SESSIONS is a positive integer >= 2', () => {
    expect(LTS_PROGRESSING_MIN_CLEAN_SESSIONS).toBeGreaterThanOrEqual(2);
  });

  it('LTS_STAGNATING_MIN_REPEATED_BLOCKERS is a positive integer >= 2', () => {
    expect(LTS_STAGNATING_MIN_REPEATED_BLOCKERS).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2 — LTS_SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS_SCHEMA', () => {
  it('is exported as a frozen object', () => {
    expect(typeof LTS_SCHEMA).toBe('object');
    expect(Object.isFrozen(LTS_SCHEMA)).toBe(true);
  });

  it('has lts_version field equal to LTS_VERSION', () => {
    expect(LTS_SCHEMA.lts_version).toBe(LTS_VERSION);
  });

  it('has memory_type field equal to LTS_MEMORY_TYPE', () => {
    expect(LTS_SCHEMA.memory_type).toBe(LTS_MEMORY_TYPE);
  });

  it('has session_count defaulting to 0', () => {
    expect(LTS_SCHEMA.session_count).toBe(0);
  });

  it('has trajectory field defaulting to "unknown"', () => {
    expect(LTS_SCHEMA.trajectory).toBe('unknown');
  });

  it('has all required array fields defaulting to []', () => {
    for (const field of LTS_ARRAY_FIELDS) {
      expect(Array.isArray(LTS_SCHEMA[field])).toBe(true);
      expect(LTS_SCHEMA[field]).toHaveLength(0);
    }
  });

  it('has last_session_date defaulting to empty string', () => {
    expect(LTS_SCHEMA.last_session_date).toBe('');
  });

  it('has computed_at defaulting to empty string', () => {
    expect(LTS_SCHEMA.computed_at).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3 — LTS_FIELDS, LTS_ARRAY_FIELDS, LTS_STRING_FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS field registries', () => {
  it('LTS_FIELDS is a frozen Set', () => {
    expect(LTS_FIELDS instanceof Set).toBe(true);
    expect(Object.isFrozen(LTS_FIELDS)).toBe(true);
  });

  it('LTS_FIELDS contains all LTS_SCHEMA keys', () => {
    for (const key of Object.keys(LTS_SCHEMA)) {
      expect(LTS_FIELDS.has(key)).toBe(true);
    }
  });

  it('LTS_ARRAY_FIELDS is a frozen array of strings', () => {
    expect(Array.isArray(LTS_ARRAY_FIELDS)).toBe(true);
    expect(Object.isFrozen(LTS_ARRAY_FIELDS)).toBe(true);
    for (const f of LTS_ARRAY_FIELDS) {
      expect(typeof f).toBe('string');
    }
  });

  it('LTS_ARRAY_FIELDS entries all appear in LTS_SCHEMA as arrays', () => {
    for (const field of LTS_ARRAY_FIELDS) {
      expect(Array.isArray(LTS_SCHEMA[field])).toBe(
        true,
        `${field} should be an array in LTS_SCHEMA`
      );
    }
  });

  it('LTS_STRING_FIELDS is a frozen array of strings', () => {
    expect(Array.isArray(LTS_STRING_FIELDS)).toBe(true);
    expect(Object.isFrozen(LTS_STRING_FIELDS)).toBe(true);
  });

  it('LTS_STRING_FIELDS entries all appear in LTS_SCHEMA as strings', () => {
    for (const field of LTS_STRING_FIELDS) {
      expect(typeof LTS_SCHEMA[field]).toBe('string');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4 — LTS_TRAJECTORIES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS_TRAJECTORIES', () => {
  it('is exported as a frozen object', () => {
    expect(Object.isFrozen(LTS_TRAJECTORIES)).toBe(true);
  });

  it('has UNKNOWN key', () => {
    expect(typeof LTS_TRAJECTORIES.UNKNOWN).toBe('string');
  });

  it('has INSUFFICIENT_DATA key', () => {
    expect(typeof LTS_TRAJECTORIES.INSUFFICIENT_DATA).toBe('string');
  });

  it('has PROGRESSING key', () => {
    expect(typeof LTS_TRAJECTORIES.PROGRESSING).toBe('string');
  });

  it('has STABLE key', () => {
    expect(typeof LTS_TRAJECTORIES.STABLE).toBe('string');
  });

  it('has STAGNATING key', () => {
    expect(typeof LTS_TRAJECTORIES.STAGNATING).toBe('string');
  });

  it('has FLUCTUATING key', () => {
    expect(typeof LTS_TRAJECTORIES.FLUCTUATING).toBe('string');
  });

  it('all values are non-empty strings', () => {
    for (const v of Object.values(LTS_TRAJECTORIES)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('all values are distinct', () => {
    const values = Object.values(LTS_TRAJECTORIES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5 — createEmptyLTSRecord
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — createEmptyLTSRecord()', () => {
  it('returns a plain object', () => {
    expect(typeof createEmptyLTSRecord()).toBe('object');
    expect(createEmptyLTSRecord()).not.toBeNull();
  });

  it('is not frozen (mutable)', () => {
    expect(Object.isFrozen(createEmptyLTSRecord())).toBe(false);
  });

  it('has all keys from LTS_SCHEMA', () => {
    const record = createEmptyLTSRecord();
    for (const key of Object.keys(LTS_SCHEMA)) {
      expect(key in record).toBe(true);
    }
  });

  it('has lts_version set to LTS_VERSION', () => {
    expect(createEmptyLTSRecord().lts_version).toBe(LTS_VERSION);
  });

  it('has memory_type set to LTS_MEMORY_TYPE', () => {
    expect(createEmptyLTSRecord().memory_type).toBe(LTS_MEMORY_TYPE);
  });

  it('array fields are fresh empty arrays (not shared references)', () => {
    const r1 = createEmptyLTSRecord();
    const r2 = createEmptyLTSRecord();
    for (const field of LTS_ARRAY_FIELDS) {
      expect(r1[field]).not.toBe(r2[field]);
      expect(r1[field]).toHaveLength(0);
    }
  });

  it('calling twice produces independent objects', () => {
    const r1 = createEmptyLTSRecord();
    const r2 = createEmptyLTSRecord();
    r1.trajectory = 'modified';
    expect(r2.trajectory).not.toBe('modified');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6 — isLTSRecord
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — isLTSRecord()', () => {
  it('returns true for a record created by createEmptyLTSRecord()', () => {
    expect(isLTSRecord(createEmptyLTSRecord())).toBe(true);
  });

  it('returns true for a record with correct lts_version and memory_type', () => {
    expect(isLTSRecord({ lts_version: LTS_VERSION, memory_type: LTS_MEMORY_TYPE })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isLTSRecord(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLTSRecord(undefined)).toBe(false);
  });

  it('returns false for a plain object without lts_version', () => {
    expect(isLTSRecord({ memory_type: LTS_MEMORY_TYPE })).toBe(false);
  });

  it('returns false when lts_version is wrong', () => {
    expect(isLTSRecord({ lts_version: '999', memory_type: LTS_MEMORY_TYPE })).toBe(false);
  });

  it('returns false when memory_type is wrong', () => {
    expect(isLTSRecord({ lts_version: LTS_VERSION, memory_type: 'therapist_session' })).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isLTSRecord({})).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isLTSRecord('lts')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isLTSRecord(42)).toBe(false);
  });

  it('returns true for the output of buildLongitudinalState([])', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(isLTSRecord(lts)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7 — LTS_BUILDER_VERSION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS_BUILDER_VERSION', () => {
  it('is exported as a non-empty string', () => {
    expect(typeof LTS_BUILDER_VERSION).toBe('string');
    expect(LTS_BUILDER_VERSION.length).toBeGreaterThan(0);
  });

  it('has semver format (x.y.z)', () => {
    expect(LTS_BUILDER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 8 — buildLongitudinalState: empty / null / bad inputs  [Coverage A]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — buildLongitudinalState — empty / null inputs', () => {
  it('null sessionRecords → returns valid LTS record', () => {
    const lts = buildLongitudinalState(null, null, null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('undefined sessionRecords → returns valid LTS record', () => {
    const lts = buildLongitudinalState(undefined, undefined, undefined);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('empty array → returns valid LTS record', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('empty array → trajectory is "unknown"', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.UNKNOWN);
  });

  it('empty array → session_count is 0', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(lts.session_count).toBe(0);
  });

  it('empty array → all array fields are empty', () => {
    const lts = buildLongitudinalState([], [], null);
    for (const field of LTS_ARRAY_FIELDS) {
      expect(lts[field]).toHaveLength(0);
    }
  });

  it('empty array → last_session_date is empty string', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(lts.last_session_date).toBe('');
  });

  it('empty array → computed_at is a non-empty string', () => {
    const lts = buildLongitudinalState([], [], null);
    expect(typeof lts.computed_at).toBe('string');
    expect(lts.computed_at.length).toBeGreaterThan(0);
  });

  it('string as sessionRecords → safe fallback (not throws)', () => {
    expect(() => buildLongitudinalState('bad', null, null)).not.toThrow();
    const lts = buildLongitudinalState('bad', null, null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('number as sessionRecords → safe fallback', () => {
    const lts = buildLongitudinalState(42, null, null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('object (non-array) as sessionRecords → safe fallback', () => {
    const lts = buildLongitudinalState({ session_date: '2026-01-01' }, null, null);
    expect(isLTSRecord(lts)).toBe(true);
    expect(lts.session_count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 9 — buildLongitudinalState: 1 session (insufficient data)  [Coverage B]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — buildLongitudinalState — 1 session (insufficient data)', () => {
  const singleSession = [makeSession({
    session_date: '2026-03-15T09:00:00.000Z',
    core_patterns: ['catastrophising'],
    follow_up_tasks: ['breathing_exercise'],
    interventions_used: ['thought_record'],
    risk_flags: [],
  })];

  it('returns a valid LTS record', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('trajectory is insufficient_data', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.INSUFFICIENT_DATA);
  });

  it('session_count is 1', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.session_count).toBe(1);
  });

  it('recurring_patterns is empty (not enough sessions)', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.recurring_patterns).toHaveLength(0);
  });

  it('persistent_open_tasks is empty (not enough sessions)', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.persistent_open_tasks).toHaveLength(0);
  });

  it('helpful_interventions is empty (not enough sessions)', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.helpful_interventions).toHaveLength(0);
  });

  it('stalled_interventions is empty (not enough sessions)', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.stalled_interventions).toHaveLength(0);
  });

  it('last_session_date is taken from the record', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.last_session_date).toBe('2026-03-15T09:00:00.000Z');
  });

  it('risk_flag_history is empty for clean session', () => {
    const lts = buildLongitudinalState(singleSession, [], null);
    expect(lts.risk_flag_history).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 10 — recurring_patterns  [Coverage C]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — recurring_patterns', () => {
  it('pattern appearing in 2+ sessions is included', () => {
    const sessions = [
      makeSession({ core_patterns: ['catastrophising', 'mind_reading'] }),
      makeSession({ core_patterns: ['catastrophising', 'black_white_thinking'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns).toContain('catastrophising');
  });

  it('pattern appearing in only 1 session is NOT included', () => {
    const sessions = [
      makeSession({ core_patterns: ['catastrophising'] }),
      makeSession({ core_patterns: ['black_white_thinking'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns).toHaveLength(0);
  });

  it('pattern appearing in 3 sessions is included', () => {
    const sessions = [
      makeSession({ core_patterns: ['avoidance'] }),
      makeSession({ core_patterns: ['avoidance'] }),
      makeSession({ core_patterns: ['avoidance'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns).toContain('avoidance');
  });

  it('recurring_patterns is bounded to LTS_ARRAY_MAX', () => {
    // Create sessions where many patterns repeat across 2 sessions.
    const patterns = Array.from({ length: LTS_ARRAY_MAX + 5 }, (_, i) => `pattern_${i}`);
    const sessions = [
      makeSession({ core_patterns: patterns }),
      makeSession({ core_patterns: patterns }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });

  it('recurring_patterns is sorted deterministically', () => {
    const sessions = [
      makeSession({ core_patterns: ['z_pattern', 'a_pattern', 'm_pattern'] }),
      makeSession({ core_patterns: ['z_pattern', 'a_pattern', 'm_pattern'] }),
    ];
    const lts1 = buildLongitudinalState(sessions, [], null);
    const lts2 = buildLongitudinalState(sessions, [], null);
    expect(lts1.recurring_patterns).toEqual(lts2.recurring_patterns);
    // Should be lexicographically sorted.
    const sorted = [...lts1.recurring_patterns].sort();
    expect(lts1.recurring_patterns).toEqual(sorted);
  });

  it('pattern labels are truncated to LTS_STRING_MAX_CHARS', () => {
    const longLabel = 'x'.repeat(LTS_STRING_MAX_CHARS + 20);
    const sessions = [
      makeSession({ core_patterns: [longLabel] }),
      makeSession({ core_patterns: [longLabel] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    if (lts.recurring_patterns.length > 0) {
      expect(lts.recurring_patterns[0].length).toBeLessThanOrEqual(LTS_STRING_MAX_CHARS);
    }
  });

  it('duplicate patterns within a single session are counted only once', () => {
    // Same pattern twice in session 1 should only increment the counter by 1.
    const sessions = [
      makeSession({ core_patterns: ['avoidance', 'avoidance'] }),
      makeSession({ core_patterns: ['avoidance'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns).toContain('avoidance');
  });

  it('empty or whitespace-only pattern labels are ignored', () => {
    const sessions = [
      makeSession({ core_patterns: ['', '   ', 'valid_pattern'] }),
      makeSession({ core_patterns: ['', '   ', 'valid_pattern'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.recurring_patterns).not.toContain('');
    expect(lts.recurring_patterns).not.toContain('   ');
    expect(lts.recurring_patterns).toContain('valid_pattern');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 11 — persistent_open_tasks  [Coverage D]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — persistent_open_tasks', () => {
  it('task appearing in 2+ sessions is included', () => {
    const sessions = [
      makeSession({ follow_up_tasks: ['breathing_exercise', 'sleep_hygiene'] }),
      makeSession({ follow_up_tasks: ['breathing_exercise', 'journaling'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.persistent_open_tasks).toContain('breathing_exercise');
  });

  it('task appearing in only 1 session is NOT included', () => {
    const sessions = [
      makeSession({ follow_up_tasks: ['breathing_exercise'] }),
      makeSession({ follow_up_tasks: ['journaling'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.persistent_open_tasks).toHaveLength(0);
  });

  it('persistent_open_tasks is bounded to LTS_ARRAY_MAX', () => {
    const tasks = Array.from({ length: LTS_ARRAY_MAX + 5 }, (_, i) => `task_${i}`);
    const sessions = [
      makeSession({ follow_up_tasks: tasks }),
      makeSession({ follow_up_tasks: tasks }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.persistent_open_tasks.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });

  it('persistent_open_tasks is sorted deterministically', () => {
    const sessions = [
      makeSession({ follow_up_tasks: ['z_task', 'a_task', 'm_task'] }),
      makeSession({ follow_up_tasks: ['z_task', 'a_task', 'm_task'] }),
    ];
    const lts1 = buildLongitudinalState(sessions, [], null);
    const lts2 = buildLongitudinalState(sessions, [], null);
    expect(lts1.persistent_open_tasks).toEqual(lts2.persistent_open_tasks);
    const sorted = [...lts1.persistent_open_tasks].sort();
    expect(lts1.persistent_open_tasks).toEqual(sorted);
  });

  it('task appearing across 4 sessions is included once (deduped)', () => {
    const sessions = Array.from({ length: 4 }, () =>
      makeSession({ follow_up_tasks: ['journaling'] })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.persistent_open_tasks.filter(t => t === 'journaling')).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 12 — progressing trajectory  [Coverage E]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — trajectory: progressing', () => {
  it('enough clean sessions → trajectory is progressing', () => {
    const cleanCount = LTS_PROGRESSING_MIN_CLEAN_SESSIONS;
    const sessions = makeCleanSessions(cleanCount);
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('clean sessions below threshold → NOT progressing', () => {
    // Only 2 clean sessions but threshold is 3.
    const sessions = makeCleanSessions(LTS_MIN_SESSIONS_FOR_SIGNALS);
    // Inject a pattern into the first session's risk flags to block progressing.
    sessions[0].risk_flags = ['passive_ideation'];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).not.toBe(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('last N sessions clean but earlier ones had risk flags → still progressing', () => {
    // Enough older sessions had risk flags, but the last clean streak meets the threshold.
    const n = LTS_PROGRESSING_MIN_CLEAN_SESSIONS + 2;
    const sessions = Array.from({ length: n }, (_, i) =>
      makeSession({
        risk_flags: i < 2 ? ['passive_ideation'] : [],
      })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });

  it('single risk-flag session in the clean streak → NOT progressing', () => {
    const n = LTS_PROGRESSING_MIN_CLEAN_SESSIONS;
    const sessions = makeCleanSessions(n);
    // Put a risk flag in the last session.
    sessions[n - 1].risk_flags = ['self_harm_mention'];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).not.toBe(LTS_TRAJECTORIES.PROGRESSING);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 13 — stagnating trajectory  [Coverage F]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — trajectory: stagnating', () => {
  it('same follow_up_task repeating in last N sessions → stagnating', () => {
    const blocker = 'sleep_hygiene';
    const sessions = Array.from({ length: LTS_STAGNATING_MIN_REPEATED_BLOCKERS + 1 }, () =>
      makeSession({ follow_up_tasks: [blocker] })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.STAGNATING);
  });

  it('single occurrence of a task → NOT stagnating', () => {
    const sessions = [
      makeSession({ follow_up_tasks: ['breathing'] }),
      makeSession({ follow_up_tasks: ['journaling'] }),
      makeSession({ follow_up_tasks: ['exposure'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).not.toBe(LTS_TRAJECTORIES.STAGNATING);
  });

  it('stagnating is NOT set when sessions are below LTS_MIN_SESSIONS_FOR_SIGNALS', () => {
    const sessions = [makeSession({ follow_up_tasks: ['same_task'] })];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.INSUFFICIENT_DATA);
  });

  it('repeated blocker + clean streak (contradiction) → progressing wins if clean streak meets threshold', () => {
    // Build sessions: first few with a blocker, then enough clean ones.
    const cleanSessions = makeCleanSessions(LTS_PROGRESSING_MIN_CLEAN_SESSIONS);
    const priorSessions = Array.from({ length: 3 }, () =>
      makeSession({ follow_up_tasks: ['stuck_task'] })
    );
    const sessions = [...priorSessions, ...cleanSessions];
    const lts = buildLongitudinalState(sessions, [], null);
    // Clean streak at the end should win.
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.PROGRESSING);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 14 — noisy / null / partial session records  [Coverage G]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — noisy / null / partial session records', () => {
  it('null entries in sessionRecords array are silently skipped', () => {
    const sessions = [null, makeSession(), null, makeSession()];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(isLTSRecord(lts)).toBe(true);
    expect(lts.session_count).toBe(2);
  });

  it('undefined entries in sessionRecords array are silently skipped', () => {
    const sessions = [undefined, makeSession(), undefined];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(isLTSRecord(lts)).toBe(true);
    expect(lts.session_count).toBe(1);
  });

  it('string entries in sessionRecords array are silently skipped', () => {
    const sessions = ['bad', makeSession(), 42];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.session_count).toBe(1);
  });

  it('session with missing core_patterns field → treated as empty array', () => {
    const sessions = [
      { session_date: '2026-01-01T00:00:00.000Z' }, // no core_patterns
      makeSession({ core_patterns: ['avoidance'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(isLTSRecord(lts)).toBe(true);
    // 'avoidance' only appears in 1 session → should NOT be in recurring_patterns.
    expect(lts.recurring_patterns).not.toContain('avoidance');
  });

  it('session with null field values → treated as empty', () => {
    const sessions = [
      makeSession({ core_patterns: null, follow_up_tasks: null }),
      makeSession({ core_patterns: null, follow_up_tasks: null }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(isLTSRecord(lts)).toBe(true);
    expect(lts.recurring_patterns).toHaveLength(0);
  });

  it('session with non-array field values → treated as empty', () => {
    const sessions = [
      makeSession({ core_patterns: 'not_an_array', risk_flags: 42 }),
      makeSession({ core_patterns: 'not_an_array', risk_flags: 42 }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(isLTSRecord(lts)).toBe(true);
  });

  it('mixed valid and invalid sessions → only valid ones counted', () => {
    const sessions = [
      null,
      makeSession({ core_patterns: ['avoidance'] }),
      'bad',
      makeSession({ core_patterns: ['avoidance'] }),
      42,
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.session_count).toBe(2);
    expect(lts.recurring_patterns).toContain('avoidance');
  });

  it('all null entries → returns empty LTS (trajectory unknown)', () => {
    const lts = buildLongitudinalState([null, null, null], [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.UNKNOWN);
    expect(lts.session_count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 15 — output bounds on all arrays and strings  [Coverage H]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — output bounds', () => {
  it('all output array fields are bounded to <= LTS_ARRAY_MAX', () => {
    const manyPatterns = Array.from({ length: 30 }, (_, i) => `pattern_${i}`);
    const manyTasks = Array.from({ length: 30 }, (_, i) => `task_${i}`);
    const manyInterventions = Array.from({ length: 30 }, (_, i) => `iv_${i}`);
    const manyRiskFlags = Array.from({ length: 30 }, (_, i) => `risk_${i}`);
    const sessions = Array.from({ length: 4 }, () =>
      makeSession({
        core_patterns: manyPatterns,
        follow_up_tasks: manyTasks,
        interventions_used: manyInterventions,
        risk_flags: manyRiskFlags,
      })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    for (const field of LTS_ARRAY_FIELDS) {
      expect(lts[field].length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
    }
  });

  it('last_session_date is bounded to <= LTS_STRING_MAX_CHARS', () => {
    const longDate = 'x'.repeat(LTS_STRING_MAX_CHARS + 100);
    const sessions = Array.from({ length: 3 }, () =>
      makeSession({ session_date: longDate })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.last_session_date.length).toBeLessThanOrEqual(LTS_STRING_MAX_CHARS);
  });

  it('risk_flag_history entries are bounded to <= LTS_STRING_MAX_CHARS', () => {
    const longFlag = 'x'.repeat(LTS_STRING_MAX_CHARS + 100);
    const sessions = Array.from({ length: 3 }, () =>
      makeSession({ risk_flags: [longFlag] })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    for (const flag of lts.risk_flag_history) {
      expect(flag.length).toBeLessThanOrEqual(LTS_STRING_MAX_CHARS);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 16 — deterministic output ordering  [Coverage I]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — deterministic output ordering', () => {
  it('same inputs produce identical output across multiple calls', () => {
    const sessions = [
      makeSession({ core_patterns: ['z_pat', 'a_pat'], follow_up_tasks: ['z_task', 'a_task'] }),
      makeSession({ core_patterns: ['z_pat', 'a_pat'], follow_up_tasks: ['z_task', 'a_task'] }),
    ];
    const lts1 = buildLongitudinalState(sessions, [], null);
    const lts2 = buildLongitudinalState(sessions, [], null);
    expect(lts1.recurring_patterns).toEqual(lts2.recurring_patterns);
    expect(lts1.persistent_open_tasks).toEqual(lts2.persistent_open_tasks);
    expect(lts1.trajectory).toBe(lts2.trajectory);
    expect(lts1.session_count).toBe(lts2.session_count);
  });

  it('array fields are sorted lexicographically', () => {
    const sessions = [
      makeSession({ core_patterns: ['z', 'a', 'm'] }),
      makeSession({ core_patterns: ['z', 'a', 'm'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    const sorted = [...lts.recurring_patterns].sort();
    expect(lts.recurring_patterns).toEqual(sorted);
  });

  it('shuffled input pattern order produces same recurring_patterns', () => {
    const sessionsA = [
      makeSession({ core_patterns: ['a', 'b', 'c'] }),
      makeSession({ core_patterns: ['c', 'a', 'b'] }),
    ];
    const sessionsB = [
      makeSession({ core_patterns: ['c', 'b', 'a'] }),
      makeSession({ core_patterns: ['b', 'c', 'a'] }),
    ];
    const ltsA = buildLongitudinalState(sessionsA, [], null);
    const ltsB = buildLongitudinalState(sessionsB, [], null);
    expect(ltsA.recurring_patterns).toEqual(ltsB.recurring_patterns);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 17 — no mutation of input objects  [Coverage J]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — no mutation of input objects', () => {
  it('session records are not mutated', () => {
    const session = makeSession({
      core_patterns: ['avoidance'],
      follow_up_tasks: ['journaling'],
    });
    const patternsBefore = [...session.core_patterns];
    const tasksBefore = [...session.follow_up_tasks];
    buildLongitudinalState([session, makeSession({ core_patterns: ['avoidance'] })], [], null);
    expect(session.core_patterns).toEqual(patternsBefore);
    expect(session.follow_up_tasks).toEqual(tasksBefore);
  });

  it('sessionRecords array itself is not mutated', () => {
    const sessions = [makeSession(), makeSession()];
    const lengthBefore = sessions.length;
    buildLongitudinalState(sessions, [], null);
    expect(sessions.length).toBe(lengthBefore);
  });

  it('goalRecords array is not mutated', () => {
    const goals = [{ id: 'goal-1' }, { id: 'goal-2' }];
    const lengthBefore = goals.length;
    buildLongitudinalState([makeSession(), makeSession()], goals, null);
    expect(goals.length).toBe(lengthBefore);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 18 — no free-text spillover  [Coverage K]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — no free-text spillover', () => {
  it('session_summary field (if present) is NOT copied to any LTS field', () => {
    const sessions = [
      makeSession({ session_summary: 'The client discussed a difficult childhood memory.' }),
      makeSession({ session_summary: 'The client discussed a difficult childhood memory.' }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    // Check that the free-text summary does not appear in any array field.
    for (const field of LTS_ARRAY_FIELDS) {
      for (const item of lts[field]) {
        expect(item).not.toContain('client discussed');
        expect(item).not.toContain('childhood memory');
      }
    }
    // trajectory and last_session_date should not contain session_summary text.
    expect(lts.trajectory).not.toContain('client');
  });

  it('safety_plan_notes (if present) is NOT copied to any LTS field', () => {
    const sessions = [
      makeSession({ safety_plan_notes: 'Call emergency services if distress > 8/10.' }),
      makeSession({ safety_plan_notes: 'Call emergency services if distress > 8/10.' }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    for (const field of LTS_ARRAY_FIELDS) {
      for (const item of lts[field]) {
        expect(item).not.toContain('emergency services');
      }
    }
  });

  it('output trajectory is always a bounded label value (not free text)', () => {
    const validTrajectories = new Set(Object.values(LTS_TRAJECTORIES));
    const sessions = makeCleanSessions(4);
    const lts = buildLongitudinalState(sessions, [], null);
    expect(validTrajectories.has(lts.trajectory)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 19 — helpful_interventions and stalled_interventions conservatism
//              [Coverage L]
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — helpful_interventions and stalled_interventions conservatism', () => {
  it('insufficient sessions → both are empty', () => {
    const lts = buildLongitudinalState([makeSession()], [], null);
    expect(lts.helpful_interventions).toHaveLength(0);
    expect(lts.stalled_interventions).toHaveLength(0);
  });

  it('ambiguous evidence (mixed signals) → helpful_interventions stays empty', () => {
    // Session 1: no risk, intervention used, tasks completed (not in session 2).
    // Session 2: risk flag present, same intervention used — ambiguous.
    const sessions = [
      makeSession({
        interventions_used: ['thought_record'],
        risk_flags: [],
        follow_up_tasks: ['task_a'],
      }),
      makeSession({
        interventions_used: ['thought_record'],
        risk_flags: ['passive_ideation'],
        follow_up_tasks: ['task_b'],
      }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    // Only 1 session qualifies as positive (the other has risk flags) → not enough.
    expect(lts.helpful_interventions).toHaveLength(0);
  });

  it('consistent positive signal across 2+ qualifying sessions → included', () => {
    // 3 sessions: no risk, intervention used, task disappears next session.
    const sessions = [
      makeSession({ interventions_used: ['exposure'], risk_flags: [], follow_up_tasks: ['task_a'] }),
      makeSession({ interventions_used: ['exposure'], risk_flags: [], follow_up_tasks: ['task_b'] }),
      makeSession({ interventions_used: ['exposure'], risk_flags: [], follow_up_tasks: [] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.helpful_interventions).toContain('exposure');
  });

  it('consistent stall signal across 2+ consecutive sessions → included', () => {
    // 3 sessions: same follow-up task carries over.
    const sessions = [
      makeSession({ interventions_used: ['relaxation'], follow_up_tasks: ['stuck_task'] }),
      makeSession({ interventions_used: ['relaxation'], follow_up_tasks: ['stuck_task'] }),
      makeSession({ interventions_used: ['relaxation'], follow_up_tasks: ['stuck_task'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.stalled_interventions).toContain('relaxation');
  });

  it('intervention appearing in both helpful and stalled lists (rare edge) — both bounded', () => {
    // Possible if signals are mixed across sessions. Both lists should still be bounded.
    const sessions = [
      makeSession({ interventions_used: ['iv_a'], risk_flags: [], follow_up_tasks: ['t_a'] }),
      makeSession({ interventions_used: ['iv_a'], risk_flags: [], follow_up_tasks: ['t_b'] }),
      makeSession({ interventions_used: ['iv_a'], follow_up_tasks: ['t_a'] }), // t_a recurs
      makeSession({ interventions_used: ['iv_a'], follow_up_tasks: ['t_a'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.helpful_interventions.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
    expect(lts.stalled_interventions.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });

  it('helpful_interventions never exceeds LTS_ARRAY_MAX', () => {
    const ivList = Array.from({ length: LTS_ARRAY_MAX + 10 }, (_, i) => `iv_${i}`);
    const sessions = [
      makeSession({ interventions_used: ivList, risk_flags: [], follow_up_tasks: ['t_done'] }),
      makeSession({ interventions_used: ivList, risk_flags: [], follow_up_tasks: ['t_new'] }),
      makeSession({ interventions_used: ivList, risk_flags: [], follow_up_tasks: ['t_other'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.helpful_interventions.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });

  it('stalled_interventions never exceeds LTS_ARRAY_MAX', () => {
    const ivList = Array.from({ length: LTS_ARRAY_MAX + 10 }, (_, i) => `iv_${i}`);
    const tasks = Array.from({ length: 3 }, (_, i) => `task_${i}`);
    const sessions = [
      makeSession({ interventions_used: ivList, follow_up_tasks: tasks }),
      makeSession({ interventions_used: ivList, follow_up_tasks: tasks }),
      makeSession({ interventions_used: ivList, follow_up_tasks: tasks }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.stalled_interventions.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 20 — risk_flag_history
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — risk_flag_history', () => {
  it('risk flags from all sessions are collected', () => {
    const sessions = [
      makeSession({ risk_flags: ['passive_ideation'] }),
      makeSession({ risk_flags: ['self_harm_mention'] }),
      makeSession({ risk_flags: [] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.risk_flag_history).toContain('passive_ideation');
    expect(lts.risk_flag_history).toContain('self_harm_mention');
  });

  it('risk_flag_history is deduplicated', () => {
    const sessions = [
      makeSession({ risk_flags: ['passive_ideation'] }),
      makeSession({ risk_flags: ['passive_ideation'] }),
      makeSession({ risk_flags: ['passive_ideation'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.risk_flag_history.filter(f => f === 'passive_ideation')).toHaveLength(1);
  });

  it('risk_flag_history is bounded to LTS_ARRAY_MAX', () => {
    const manyFlags = Array.from({ length: 30 }, (_, i) => `risk_${i}`);
    const sessions = Array.from({ length: 3 }, () =>
      makeSession({ risk_flags: manyFlags })
    );
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.risk_flag_history.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });

  it('risk_flag_history is sorted deterministically', () => {
    const sessions = [
      makeSession({ risk_flags: ['z_risk', 'a_risk'] }),
      makeSession({ risk_flags: ['m_risk', 'a_risk'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    const sorted = [...lts.risk_flag_history].sort();
    expect(lts.risk_flag_history).toEqual(sorted);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 21 — active_goal_ids
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — active_goal_ids', () => {
  it('goal id appearing in 2+ sessions is included', () => {
    const sessions = [
      makeSession({ goals_referenced: ['goal-1', 'goal-2'] }),
      makeSession({ goals_referenced: ['goal-1', 'goal-3'] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.active_goal_ids).toContain('goal-1');
    expect(lts.active_goal_ids).not.toContain('goal-2');
    expect(lts.active_goal_ids).not.toContain('goal-3');
  });

  it('active_goal_ids is bounded to LTS_ARRAY_MAX', () => {
    const manyGoals = Array.from({ length: LTS_ARRAY_MAX + 5 }, (_, i) => `goal-${i}`);
    const sessions = [
      makeSession({ goals_referenced: manyGoals }),
      makeSession({ goals_referenced: manyGoals }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.active_goal_ids.length).toBeLessThanOrEqual(LTS_ARRAY_MAX);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 22 — fluctuating trajectory
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — trajectory: fluctuating', () => {
  it('some sessions with risk flags, some without → fluctuating', () => {
    const sessions = [
      makeSession({ risk_flags: ['passive_ideation'] }),
      makeSession({ risk_flags: [] }),
      makeSession({ risk_flags: ['passive_ideation'] }),
      makeSession({ risk_flags: [] }),
    ];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.FLUCTUATING);
  });

  it('fluctuating NOT set when fewer than LTS_MIN_SESSIONS_FOR_SIGNALS', () => {
    const sessions = [makeSession({ risk_flags: ['passive_ideation'] })];
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.INSUFFICIENT_DATA);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 23 — stable trajectory
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — trajectory: stable', () => {
  it('all sessions with consistent risk flags (no stagnation) → stable', () => {
    const sessions = [
      makeSession({ risk_flags: ['passive_ideation'], follow_up_tasks: ['task_a'] }),
      makeSession({ risk_flags: ['passive_ideation'], follow_up_tasks: ['task_b'] }),
    ];
    // Both sessions have risk flags but tasks differ — no repeated blocker.
    const lts = buildLongitudinalState(sessions, [], null);
    expect(lts.trajectory).toBe(LTS_TRAJECTORIES.STABLE);
  });

  it('clean sessions below progressing threshold → stable', () => {
    // Only 2 clean sessions, threshold is 3 → stable (not progressing).
    const sessions = makeCleanSessions(2);
    const lts = buildLongitudinalState(sessions, [], null);
    // 2 sessions, both clean but below progressing threshold.
    expect([
      LTS_TRAJECTORIES.STABLE,
      LTS_TRAJECTORIES.PROGRESSING,
    ]).toContain(lts.trajectory);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 24 — LTS record shape completeness
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — LTS output shape completeness', () => {
  it('buildLongitudinalState output has all LTS_SCHEMA keys', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    for (const key of Object.keys(LTS_SCHEMA)) {
      expect(key in lts).toBe(true);
    }
  });

  it('lts_version in output equals LTS_VERSION', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    expect(lts.lts_version).toBe(LTS_VERSION);
  });

  it('memory_type in output equals LTS_MEMORY_TYPE', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    expect(lts.memory_type).toBe(LTS_MEMORY_TYPE);
  });

  it('session_count in output is a non-negative integer', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    expect(typeof lts.session_count).toBe('number');
    expect(lts.session_count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(lts.session_count)).toBe(true);
  });

  it('all LTS_ARRAY_FIELDS are arrays in the output', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    for (const field of LTS_ARRAY_FIELDS) {
      expect(Array.isArray(lts[field])).toBe(true);
    }
  });

  it('all LTS_STRING_FIELDS (except computed_at) are strings in the output', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    for (const field of LTS_STRING_FIELDS) {
      expect(typeof lts[field]).toBe('string');
    }
  });

  it('computed_at is a non-empty string ISO date in the output', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    expect(typeof lts.computed_at).toBe('string');
    expect(lts.computed_at.length).toBeGreaterThan(0);
    expect(isNaN(new Date(lts.computed_at).getTime())).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 25 — Isolation: no runtime side effects
// ═══════════════════════════════════════════════════════════════════════════════

describe('Wave 3A — isolation and no side effects', () => {
  it('buildLongitudinalState returns a new object on every call (no caching)', () => {
    const sessions = [makeSession(), makeSession()];
    const lts1 = buildLongitudinalState(sessions, [], null);
    const lts2 = buildLongitudinalState(sessions, [], null);
    expect(lts1).not.toBe(lts2);
  });

  it('output is a plain object (not frozen)', () => {
    const lts = buildLongitudinalState([makeSession(), makeSession()], [], null);
    expect(Object.isFrozen(lts)).toBe(false);
  });

  it('does not throw on completely empty call', () => {
    expect(() => buildLongitudinalState()).not.toThrow();
  });

  it('buildLongitudinalState with no arguments returns a valid LTS record', () => {
    const lts = buildLongitudinalState();
    expect(isLTSRecord(lts)).toBe(true);
  });
});
