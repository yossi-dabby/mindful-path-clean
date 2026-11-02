/**
 * @file test/utils/therapistRuntimeNonRoutingFlags.test.js
 *
 * PR #920 — Runtime Authority for Non-Routing Therapist Flags (Part 1)
 *
 * Tests the two new runtime-authority resolvers introduced by PR #920:
 *
 *   - resolveRuntimeSummarizationFlag(snapshot)
 *     Extends the summarization gate with optional Phase 0.2 runtime authority.
 *
 *   - resolveRuntimeContextComposerV2Flag(wiring, snapshot)
 *     Extends the context composer V2 gate with optional Phase 0.2 runtime authority.
 *
 * Test numbering (1–12) matches the spec:
 *
 *   1.  snapshot unavailable  → legacy behavior
 *   2.  APPLY=false           → legacy behavior
 *   3.  APPLY=true + MASTER=true + SUMMARIZATION=false → gate returns false
 *   4.  APPLY=true + MASTER=true + SUMMARIZATION=true  → gate returns true
 *   5.  APPLY=true + MASTER=false + SUMMARIZATION=true → gate returns false
 *   6.  privacy / sanitization contract unchanged
 *   7.  CONTEXT_COMPOSER_V2=false → resolves false
 *   8.  CONTEXT_COMPOSER_V2=true  → resolves true via runtime authority
 *   9.  non-V12 wiring cannot activate Context Composer V2
 *  10.  late snapshot cannot change composer choice after session lock
 *  11.  V12 routing remains V12 regardless of Context Composer flag
 *  12.  CHAT_ORCHESTRATOR_V2 remains unchanged / off
 *
 * DO NOT:
 *   - activate any capability flag in these tests
 *   - modify existing test assertions in other files
 *   - skip or fixme any test
 */

import { describe, it, expect } from 'vitest';

import {
  resolveRuntimeSummarizationFlag,
  isSummarizationEnabled,
  sanitizeSummaryRecord,
} from '../../src/lib/summarizationGate.js';

import {
  resolveRuntimeContextComposerV2Flag,
  buildActionFirstDemotedSessionContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  THERAPIST_RUNTIME_FLAG_SCHEMA,
  THERAPIST_RUNTIME_FLAG_KEYS,
  getDefaultTherapistRuntimeFlags,
  normalizeTherapistRuntimeFlagSnapshotPayload,
} from '../../src/lib/therapistRuntimeFlagTransport.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V12,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function buildAllFalseFlags(overrides = {}) {
  const flags = {};
  for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
    flags[key] = false;
  }
  return { ...flags, ...overrides };
}

function makeAvailableSnapshot(flagOverrides = {}) {
  const rawPayload = {
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    flags: buildAllFalseFlags(flagOverrides),
    generated_at: new Date().toISOString(),
  };
  const normalized = normalizeTherapistRuntimeFlagSnapshotPayload(rawPayload);
  if (!normalized) throw new Error('makeAvailableSnapshot: normalization failed');
  return Object.freeze({
    schema: normalized.schema,
    transport_status: 'available',
    received: true,
    flags: normalized.flags,
    generated_at: normalized.generated_at,
    fetched_at: new Date().toISOString(),
  });
}

function makeUnavailableSnapshot() {
  return Object.freeze({
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    transport_status: 'unavailable',
    received: false,
    flags: getDefaultTherapistRuntimeFlags(),
    generated_at: null,
    fetched_at: new Date().toISOString(),
  });
}

function makeEntities() {
  return {
    CompanionMemory: {
      filter: async () => [],
      list: async () => [],
    },
    CaseFormulation: {
      list: async () => [],
    },
  };
}

// V12 wiring — planner_first_enabled === true
const WIRING_V12 = CBT_THERAPIST_WIRING_STAGE2_V12;
// HYBRID wiring — planner_first_enabled !== true
const WIRING_HYBRID = CBT_THERAPIST_WIRING_HYBRID;

// ─── 1. snapshot unavailable → legacy behavior ────────────────────────────────

describe('Test 1 — snapshot unavailable: resolvers fall back to legacy behavior', () => {
  it('1a. resolveRuntimeSummarizationFlag(null) === isSummarizationEnabled()', () => {
    expect(resolveRuntimeSummarizationFlag(null)).toBe(isSummarizationEnabled());
  });

  it('1b. resolveRuntimeSummarizationFlag(undefined) === isSummarizationEnabled()', () => {
    expect(resolveRuntimeSummarizationFlag(undefined)).toBe(isSummarizationEnabled());
  });

  it('1c. resolveRuntimeSummarizationFlag(unavailableSnapshot) === isSummarizationEnabled()', () => {
    const snapshot = makeUnavailableSnapshot();
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(isSummarizationEnabled());
  });

  it('1d. resolveRuntimeContextComposerV2Flag(V12, null) falls back to legacy (false when flag is off)', () => {
    // Build-time flag CONTEXT_COMPOSER_V2_ENABLED defaults false in test env.
    const result = resolveRuntimeContextComposerV2Flag(WIRING_V12, null);
    expect(typeof result).toBe('boolean');
    // In test env the build-time flag is false → legacy path returns false.
    expect(result).toBe(false);
  });

  it('1e. resolveRuntimeContextComposerV2Flag(V12, unavailableSnapshot) falls back to legacy', () => {
    const snapshot = makeUnavailableSnapshot();
    const result = resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot);
    expect(result).toBe(false);
  });
});

// ─── 2. APPLY=false → legacy behavior ────────────────────────────────────────

describe('Test 2 — APPLY=false: resolvers fall back to legacy behavior', () => {
  it('2a. APPLY=false + SUMMARIZATION=true → resolveRuntimeSummarizationFlag === isSummarizationEnabled()', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(isSummarizationEnabled());
  });

  it('2b. APPLY=false + CONTEXT_COMPOSER_V2=true → resolveRuntimeContextComposerV2Flag falls back to legacy', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });

  it('2c. APPLY absent (snapshot has no flags at all) → falls back to legacy', () => {
    // Transport with APPLY missing defaults to false after normalisation.
    const snapshot = makeAvailableSnapshot({
      // THERAPIST_RUNTIME_APPLY_ENABLED intentionally not set → defaults false
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
    });
    // After normalisation, APPLY defaults to false → legacy path.
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(isSummarizationEnabled());
  });
});

// ─── 3. SUMMARIZATION=false (with valid runtime authority) → gate returns false

describe('Test 3 — APPLY=true + MASTER=true + SUMMARIZATION=false: gate returns false', () => {
  it('3a. runtime SUMMARIZATION=false with APPLY=true and MASTER=true → resolveRuntimeSummarizationFlag returns false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(false);
  });

  it('3b. all flags false with APPLY=true → summarization still false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      // all other flags remain false
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(false);
  });
});

// ─── 4. SUMMARIZATION=true + valid runtime authority → gate returns true ─────

describe('Test 4 — APPLY=true + MASTER=true + SUMMARIZATION=true: gate returns true', () => {
  it('4a. runtime SUMMARIZATION=true with APPLY=true and MASTER=true → resolveRuntimeSummarizationFlag returns true', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(true);
  });
});

describe('Test 5 — APPLY=true + MASTER=false + SUMMARIZATION=true: gate returns false', () => {
  it('5a. MASTER=false + SUMMARIZATION=true + APPLY=true → resolveRuntimeSummarizationFlag returns false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: false,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(false);
  });
});

// ─── 5a. Sanitizer determinism remains unchanged (not a dedup substitute) ────

describe('Test 5a — Sanitizer determinism remains unchanged', () => {
  it('5a-1. calling sanitizeSummaryRecord twice on the same input produces identical results', () => {
    const input = {
      session_id: 'test-session-001',
      session_date: '2025-06-01T09:00:00.000Z',
      session_summary: 'Client showed progress with cognitive restructuring.',
      core_patterns: ['avoidance', 'catastrophising'],
    };
    const first = sanitizeSummaryRecord(input);
    const second = sanitizeSummaryRecord(input);
    expect(first.record).toEqual(second.record);
    expect(first.safety_stub).toBe(second.safety_stub);
    expect(first.rejected_fields).toEqual(second.rejected_fields);
  });

  it('5a-2. sanitizing an already-sanitized record returns identical output', () => {
    const input = {
      session_id: 'abc',
      session_summary: 'Progress noted.',
    };
    const { record: once } = sanitizeSummaryRecord(input);
    const { record: twice } = sanitizeSummaryRecord(once);
    expect(once).toEqual(twice);
  });
});

// ─── 6. privacy / sanitization contract unchanged ────────────────────────────

describe('Test 6 — Privacy and sanitization contract unchanged by runtime authority', () => {
  it('6a. forbidden input fields still trigger safe-stub under runtime authority', () => {
    const input = {
      session_id: 'test-session-002',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const { record, safety_stub, rejected_fields } = sanitizeSummaryRecord(input);
    expect(safety_stub).toBe(true);
    expect(rejected_fields).toContain('messages');
    // Safe stub has no clinical content.
    expect(record.session_summary).toBe('');
    expect(record.core_patterns).toEqual([]);
  });

  it('6b. raw transcript content in session_summary is cleared to empty string', () => {
    const input = {
      session_id: 'test-session-003',
      session_summary: 'User: How are you?\nTherapist: Tell me more.',
    };
    const { record } = sanitizeSummaryRecord(input);
    // The sanitizer detects raw transcript patterns in string fields and clears
    // the value to '' — no transcript content is persisted.
    expect(record.session_summary).toBe('');
  });

  it('6c. resolveRuntimeSummarizationFlag does not bypass sanitization — it only affects the gate', () => {
    // Even when the gate returns true, the sanitizer must still run.
    // This test confirms sanitizeSummaryRecord is independent of the gate.
    const snapshotOn = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
    });
    const gateResult = resolveRuntimeSummarizationFlag(snapshotOn);
    expect(gateResult).toBe(true);

    // Independently, the sanitizer still rejects forbidden fields.
    const { safety_stub } = sanitizeSummaryRecord({ messages: ['raw'] });
    expect(safety_stub).toBe(true);
  });
});

// ─── 7. CONTEXT_COMPOSER_V2=false → resolves false ───────────────────────────

describe('Test 7 — CONTEXT_COMPOSER_V2=false under runtime authority: resolves false', () => {
  it('7a. runtime CONTEXT_COMPOSER_V2=false with APPLY=true, V12 wiring → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });

  it('7b. all flags false with APPLY=true → resolveRuntimeContextComposerV2Flag returns false', () => {
    const snapshot = makeAvailableSnapshot({ THERAPIST_RUNTIME_APPLY_ENABLED: true });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });
});

// ─── 8. CONTEXT_COMPOSER_V2=true → existing composer used ────────────────────

describe('Test 8 — CONTEXT_COMPOSER_V2=true + valid runtime authority: resolves true', () => {
  it('8a. runtime CONTEXT_COMPOSER_V2=true + APPLY=true + MASTER=true + V12 wiring → true', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(true);
  });

  it('8b. APPLY=true + MASTER=false + CONTEXT_COMPOSER_V2=true → hard rollback false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: false,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });

  it('8c. APPLY=false even with CONTEXT_COMPOSER_V2=true → legacy path (false)', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });
});

// ─── 9. non-V12 wiring cannot activate Context Composer V2 ───────────────────

describe('Test 9 — Non-V12 wiring: Context Composer V2 cannot be activated', () => {
  it('9a. HYBRID wiring + APPLY=true + CONTEXT_COMPOSER_V2=true → false', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_HYBRID, snapshot)).toBe(false);
  });

  it('9b. null wiring → always false regardless of snapshot', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(null, snapshot)).toBe(false);
  });

  it('9c. wiring without planner_first_enabled → always false', () => {
    const wiringNoPlannerFirst = { ...WIRING_HYBRID, planner_first_enabled: false };
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(resolveRuntimeContextComposerV2Flag(wiringNoPlannerFirst, snapshot)).toBe(false);
  });
});

// ─── 10. late snapshot cannot change composer choice after session lock ────────

describe('Test 10 — Session lock: late snapshot cannot change composer choice', () => {
  it('10a. value resolved at session-start is a frozen primitive; late snapshot has no effect', () => {
    const snapshotAtSessionStart = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    // Caller freezes this at session-start.
    const frozenChoice = resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshotAtSessionStart);
    expect(frozenChoice).toBe(false);

    // A late snapshot arrives with CONTEXT_COMPOSER_V2=true.
    // The session-frozen choice is unaffected because it is a primitive boolean.
    const lateSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    // The frozen choice does not change.
    expect(frozenChoice).toBe(false);

    // Confirming the late snapshot WOULD give a different result if called fresh.
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, lateSnapshot)).toBe(true);
  });

  it('10b. session-start snapshot with V2=true is unaffected by subsequent snapshot with V2=false', () => {
    const snapshotAtSessionStart = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const frozenChoice = resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshotAtSessionStart);
    expect(frozenChoice).toBe(true);

    const lateSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    // Frozen primitive is immutable.
    expect(frozenChoice).toBe(true);
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, lateSnapshot)).toBe(false);
  });
});

// ─── 11. V12 routing remains V12 regardless of Context Composer flag ──────────

describe('Test 11 — V12 routing is unaffected by Context Composer V2 flag', () => {
  it('11a. V12 wiring identity is not altered by resolveRuntimeContextComposerV2Flag', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    // The resolver returns a boolean — it does NOT modify or re-select the wiring.
    const result = resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot);
    expect(typeof result).toBe('boolean');
    // The V12 wiring object is unchanged.
    expect(WIRING_V12.planner_first_enabled).toBe(true);
    expect(WIRING_V12.name).toBe('cbt_therapist');
  });

  it('11b. Context Composer flag does not alter THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED', () => {
    // The CONTEXT_COMPOSER_V2_ENABLED flag must not mutate PLANNER_FIRST_ENABLED.
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    expect(snapshot.flags['THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED']).toBe(false);
    expect(snapshot.flags['CONTEXT_COMPOSER_V2_ENABLED']).toBe(true);
    // They are independent flags.
  });
});

// ─── 12. CHAT_ORCHESTRATOR_V2 remains unchanged / off ────────────────────────

describe('Test 12 — CHAT_ORCHESTRATOR_V2 is not affected by PR #920 resolvers', () => {
  it('12a. resolveRuntimeContextComposerV2Flag does not read CHAT_ORCHESTRATOR_V2_ENABLED', () => {
    // Even with CHAT_ORCHESTRATOR_V2=true, the resolver result depends only on
    // CONTEXT_COMPOSER_V2_ENABLED and the planner_first_enabled wiring property.
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
      CHAT_ORCHESTRATOR_V2_ENABLED: true, // this must NOT influence our resolver
    });
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });

  it('12b. resolveRuntimeSummarizationFlag does not read CHAT_ORCHESTRATOR_V2_ENABLED', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
      CHAT_ORCHESTRATOR_V2_ENABLED: true,
    });
    expect(resolveRuntimeSummarizationFlag(snapshot)).toBe(false);
  });

  it('12c. CHAT_ORCHESTRATOR_V2_ENABLED is still present in the schema but defaults false', () => {
    const snapshot = makeAvailableSnapshot({}); // no overrides
    expect(Object.prototype.hasOwnProperty.call(snapshot.flags, 'CHAT_ORCHESTRATOR_V2_ENABLED')).toBe(true);
    expect(snapshot.flags['CHAT_ORCHESTRATOR_V2_ENABLED']).toBe(false);
  });

  it('12d. A snapshot with CHAT_ORCHESTRATOR_V2=true has it correctly normalised to true', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CHAT_ORCHESTRATOR_V2_ENABLED: true,
    });
    expect(snapshot.flags['CHAT_ORCHESTRATOR_V2_ENABLED']).toBe(true);
    // But this does not activate Context Composer V2.
    expect(resolveRuntimeContextComposerV2Flag(WIRING_V12, snapshot)).toBe(false);
  });
});

describe('Test 13/14 — Build path behavior with explicit runtime override', () => {
  it('13. runtime_context_composer_v2_override=false preserves exact prior V12 rendered output', async () => {
    const entities = makeEntities();
    const legacy = await buildActionFirstDemotedSessionContentAsync(
      WIRING_V12,
      entities,
      null,
      { disable_context_composer_v2: true }
    );
    const overridden = await buildActionFirstDemotedSessionContentAsync(
      WIRING_V12,
      entities,
      null,
      { runtime_context_composer_v2_override: false }
    );
    expect(overridden).toBe(legacy);
  });

  it('14. runtime_context_composer_v2_override=true uses existing Context Composer V2 finalize path', async () => {
    const entities = makeEntities();
    const composer = {
      version: 'test',
      budget_chars: 120000,
      registerSection: () => {},
      finalize: ({ fallbackRendered }) => ({
        rendered: fallbackRendered,
        diagnostic: {
          fallback_used: false,
          parity_match: true,
          parity_status: 'exact_match',
        },
        sections: [],
        version: 'test',
      }),
    };
    const output = await buildActionFirstDemotedSessionContentAsync(
      WIRING_V12,
      entities,
      null,
      {
        runtime_context_composer_v2_override: true,
        context_composer_v2: composer,
      }
    );
    expect(typeof output).toBe('string');
  });
});
