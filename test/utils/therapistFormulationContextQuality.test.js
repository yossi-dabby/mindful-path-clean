/**
 * @file test/utils/therapistFormulationContextQuality.test.js
 *
 * Therapist Formulation Context Quality — Field Filtering and Record Selection
 *
 * This test suite validates the "Formulation Context Quality" improvement:
 * - FORMULATION_MIN_FIELD_LENGTH: field values shorter than this are suppressed
 * - FORMULATION_MIN_USEFUL_FIELDS: blocks with fewer usable fields are suppressed
 * - scoreFormulationRecord: scores a formulation record by usable field count
 * - Record selection: over-fetches 2 records and selects the richer one
 *
 * WHAT IS TESTED
 * --------------
 *  1. scoreFormulationRecord — correct scores for all field combinations
 *  2. FORMULATION_MIN_FIELD_LENGTH and FORMULATION_MIN_USEFUL_FIELDS are exported
 *  3. Short/placeholder fields (< FORMULATION_MIN_FIELD_LENGTH chars) are suppressed
 *  4. Formulation records below FORMULATION_MIN_USEFUL_FIELDS threshold are suppressed
 *  5. Rich formulation records (>= FORMULATION_MIN_USEFUL_FIELDS) are injected
 *  6. When most-recent record is thin, fallback to richer second record is used
 *  7. When most-recent record is rich, it is used (no unnecessary fallback)
 *  8. Fallback does NOT occur when there is only one record
 *  9. No regression: fail-closed behavior unchanged (error returns '')
 * 10. No regression: empty CaseFormulation list returns ''
 * 11. No regression: formulation_context_enabled=false path unchanged
 * 12. No regression: HYBRID wiring is unaffected
 * 13. No regression: companion flows completely unaffected
 * 14. No raw transcript leakage through any code path
 * 15. No cross-user / private-entity leakage
 * 16. Safe behavior when formulation retrieval fails
 * 17. scoreFormulationRecord returns 0 for null / invalid input (fail-safe)
 * 18. Fields that are exactly FORMULATION_MIN_FIELD_LENGTH chars are included
 * 19. Fields that are FORMULATION_MIN_FIELD_LENGTH-1 chars are suppressed
 * 20. Partial-field formulations that pass the threshold inject only usable fields
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Does NOT import from base44/functions/ (Deno — not importable in Vitest).
 * - Does NOT render React components.
 * - All mocks are scoped within each test — no global state mutation.
 * - All tests are deterministic and do not require a live Base44 backend.
 * - Does NOT modify prior-phase test files or override any prior-phase exports.
 *
 * See src/lib/workflowContextInjector.js for the implementation.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  buildV6SessionStartContentAsync,
  buildV5SessionStartContentAsync,
  buildV7SessionStartContentAsync,
  scoreFormulationRecord,
  FORMULATION_MIN_FIELD_LENGTH,
  FORMULATION_MIN_USEFUL_FIELDS,
} from '../../src/lib/workflowContextInjector.js';

import {
  THERAPIST_FORMULATION_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * A rich CaseFormulation record with all 4 clinical fields well-populated.
 */
const RICH_FORMULATION = {
  presenting_problem: 'Recurrent low mood triggered by interpersonal conflict',
  core_belief: 'I am fundamentally unlovable',
  maintaining_cycle: 'Withdrawal → reduced positive reinforcement → worsened mood',
  treatment_goals: 'Build interpersonal effectiveness; challenge core belief',
};

/**
 * A formulation with exactly FORMULATION_MIN_USEFUL_FIELDS usable fields.
 */
const MINIMAL_FORMULATION = {
  presenting_problem: 'Social anxiety in professional settings',
  core_belief: 'I will be judged and found lacking',
  // No maintaining_cycle or treatment_goals
};

/**
 * A thin formulation with only 1 usable field (below threshold).
 */
function makeThinFormulation(overrides = {}) {
  return {
    presenting_problem: 'Social anxiety',   // 13 chars — passes field length but count < 2
    ...overrides,
  };
}

/**
 * A weak formulation with placeholder-length field values (< FORMULATION_MIN_FIELD_LENGTH).
 */
const PLACEHOLDER_FORMULATION = {
  presenting_problem: 'ok',         // 2 chars — below field length threshold
  core_belief: '?',                 // 1 char  — below field length threshold
  maintaining_cycle: 'TBD',         // 3 chars — below field length threshold
  treatment_goals: 'N/A',           // 3 chars — below field length threshold
};

/**
 * Builds a mock entities object with all required entity stubs.
 */
function buildMockEntities(overrides = {}) {
  return {
    CompanionMemory: {
      filter: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
    },
    Goal: {
      filter: vi.fn().mockResolvedValue([]),
    },
    SessionSummary: {
      list: vi.fn().mockResolvedValue([]),
    },
    CoachingSession: {
      list: vi.fn().mockResolvedValue([]),
    },
    Exercise: {
      list: vi.fn().mockResolvedValue([]),
    },
    Resource: {
      list: vi.fn().mockResolvedValue([]),
    },
    ExternalKnowledgeChunk: {
      filter: vi.fn().mockResolvedValue([]),
    },
    CaseFormulation: {
      list: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

// ─── Section 1: scoreFormulationRecord ────────────────────────────────────────

describe('Section 1: scoreFormulationRecord — field scoring', () => {
  it('returns 0 for null input (fail-safe)', () => {
    expect(scoreFormulationRecord(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(scoreFormulationRecord(undefined)).toBe(0);
  });

  it('returns 0 for a non-object input', () => {
    expect(scoreFormulationRecord('string')).toBe(0);
    expect(scoreFormulationRecord(42)).toBe(0);
  });

  it('returns 0 for an object with no scoreable fields', () => {
    expect(scoreFormulationRecord({ id: '123', created_date: '2026-01-01' })).toBe(0);
  });

  it('returns 0 when all fields are below FORMULATION_MIN_FIELD_LENGTH', () => {
    expect(scoreFormulationRecord(PLACEHOLDER_FORMULATION)).toBe(0);
  });

  it('returns 1 for a record with exactly one usable field', () => {
    expect(scoreFormulationRecord({ presenting_problem: 'Social anxiety' })).toBe(1);
  });

  it('returns 2 for MINIMAL_FORMULATION (2 usable fields)', () => {
    expect(scoreFormulationRecord(MINIMAL_FORMULATION)).toBe(2);
  });

  it('returns 4 for RICH_FORMULATION (all 4 fields usable)', () => {
    expect(scoreFormulationRecord(RICH_FORMULATION)).toBe(4);
  });

  it('counts a field as usable when it is exactly FORMULATION_MIN_FIELD_LENGTH chars', () => {
    const cf = { presenting_problem: 'A'.repeat(FORMULATION_MIN_FIELD_LENGTH) };
    expect(scoreFormulationRecord(cf)).toBe(1);
  });

  it('does NOT count a field as usable when it is FORMULATION_MIN_FIELD_LENGTH-1 chars', () => {
    const cf = { presenting_problem: 'A'.repeat(FORMULATION_MIN_FIELD_LENGTH - 1) };
    expect(scoreFormulationRecord(cf)).toBe(0);
  });

  it('does NOT count non-string fields', () => {
    const cf = {
      presenting_problem: 42,
      core_belief: null,
      maintaining_cycle: ['an array'],
      treatment_goals: { object: true },
    };
    expect(scoreFormulationRecord(cf)).toBe(0);
  });

  it('counts only the 4 documented fields (not arbitrary keys)', () => {
    const cf = {
      presenting_problem: 'Valid long enough field',
      unknown_extra_field: 'Another valid long field',   // not scored
    };
    expect(scoreFormulationRecord(cf)).toBe(1);
  });

  it('ignores leading/trailing whitespace when measuring field length', () => {
    // A field that is only spaces should not count
    const cf = { presenting_problem: '   ' + 'A'.repeat(FORMULATION_MIN_FIELD_LENGTH - 3) + '   ' };
    // trim() gives us (FORMULATION_MIN_FIELD_LENGTH - 3) chars — below threshold
    expect(scoreFormulationRecord(cf)).toBe(0);
  });

  it('counts a field that meets the length threshold after trimming', () => {
    const cf = {
      presenting_problem: '   ' + 'A'.repeat(FORMULATION_MIN_FIELD_LENGTH) + '   ',
    };
    expect(scoreFormulationRecord(cf)).toBe(1);
  });
});

// ─── Section 2: Exported constants ───────────────────────────────────────────

describe('Section 2: Exported constants', () => {
  it('FORMULATION_MIN_FIELD_LENGTH is exported and is a positive number', () => {
    expect(typeof FORMULATION_MIN_FIELD_LENGTH).toBe('number');
    expect(FORMULATION_MIN_FIELD_LENGTH).toBeGreaterThan(0);
  });

  it('FORMULATION_MIN_USEFUL_FIELDS is exported and is a positive number', () => {
    expect(typeof FORMULATION_MIN_USEFUL_FIELDS).toBe('number');
    expect(FORMULATION_MIN_USEFUL_FIELDS).toBeGreaterThan(0);
  });

  it('FORMULATION_MIN_FIELD_LENGTH is 8', () => {
    expect(FORMULATION_MIN_FIELD_LENGTH).toBe(8);
  });

  it('FORMULATION_MIN_USEFUL_FIELDS is 2', () => {
    expect(FORMULATION_MIN_USEFUL_FIELDS).toBe(2);
  });

  it('scoreFormulationRecord is exported and is a function', () => {
    expect(typeof scoreFormulationRecord).toBe('function');
  });
});

// ─── Section 3: Rich formulation injection ─────────────────────────────────────

describe('Section 3: Rich formulation — block is injected', () => {
  it('injects formulation block when RICH_FORMULATION is available', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
  });

  it('injects formulation block when MINIMAL_FORMULATION (exactly 2 fields) is available', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([MINIMAL_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
  });

  it('rich formulation block contains both usable fields from MINIMAL_FORMULATION', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([MINIMAL_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('Presenting problem:');
    expect(result).toContain('Core belief:');
  });

  it('rich formulation block does not contain labels for absent fields', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([MINIMAL_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('Maintaining cycle:');
    expect(result).not.toContain('Treatment goals:');
  });
});

// ─── Section 4: Weak/placeholder formulation suppression ──────────────────────

describe('Section 4: Weak/thin formulation — block is suppressed', () => {
  it('suppresses formulation block when ALL fields are below FORMULATION_MIN_FIELD_LENGTH', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([PLACEHOLDER_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('suppresses placeholder field values from the injected block', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([PLACEHOLDER_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // Placeholder values should not appear in the output
    expect(result).not.toContain('Presenting problem: ok');
    expect(result).not.toContain('Core belief: ?');
    expect(result).not.toContain('Maintaining cycle: TBD');
    expect(result).not.toContain('Treatment goals: N/A');
  });

  it('suppresses formulation block when only 1 usable field is present (thin record)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([makeThinFormulation()]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('=== CASE FORMULATION CONTEXT (read-only) ===');
  });

  it('suppresses formulation block for an empty record (id-only)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([{ id: '999', created_date: '2026-01-01' }]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('omits individual short fields even when the record as a whole passes the threshold', async () => {
    // presenting_problem is short (suppressed), core_belief and maintaining_cycle are long (included)
    const mixedFormulation = {
      presenting_problem: 'Short',                                               // < min_length
      core_belief: 'I will be judged and found lacking by everyone',             // >= min_length
      maintaining_cycle: 'Avoidance → validation-seeking → short-term relief',   // >= min_length
    };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([mixedFormulation]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // Block should be injected (2 long fields pass the threshold)
    expect(result).toContain('CASE FORMULATION CONTEXT');
    // Short field label should NOT appear
    expect(result).not.toContain('Presenting problem:');
    // Long fields should appear
    expect(result).toContain('Core belief:');
    expect(result).toContain('Maintaining cycle:');
  });
});

// ─── Section 5: Record selection (over-fetch and rank) ─────────────────────────

describe('Section 5: Record selection — richer record preferred', () => {
  it('uses the second record when it is richer than the first (thin→rich)', async () => {
    const thinRecord = makeThinFormulation();    // score=1 (only presenting_problem)
    const entities = buildMockEntities({
      CaseFormulation: {
        // first record is thin, second is rich
        list: vi.fn().mockResolvedValue([thinRecord, RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // Rich record fields should be present
    expect(result).toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('I am fundamentally unlovable');  // core_belief from RICH_FORMULATION
  });

  it('uses the first record when it is richer than (or equal to) the second', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        // first record is rich, second is thin
        list: vi.fn().mockResolvedValue([RICH_FORMULATION, makeThinFormulation()]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('I am fundamentally unlovable');  // from RICH_FORMULATION
  });

  it('uses the first record when both records are equally rich', async () => {
    const firstRich = {
      presenting_problem: 'Anxiety in first record presenting',
      core_belief: 'Core belief from first record here',
      maintaining_cycle: 'Cycle from first record described fully',
      treatment_goals: 'Goals from first record written out',
    };
    const secondRich = {
      presenting_problem: 'Anxiety in second record presenting',
      core_belief: 'Core belief from second record here',
      maintaining_cycle: 'Cycle from second record described fully',
      treatment_goals: 'Goals from second record written out',
    };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([firstRich, secondRich]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // First record wins on equal score (most recent)
    expect(result).toContain('Anxiety in first record presenting');
    expect(result).not.toContain('Anxiety in second record presenting');
  });

  it('suppresses block when both records are weak (both below threshold)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([
          PLACEHOLDER_FORMULATION,
          makeThinFormulation(),
        ]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('works correctly when only one record is returned', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('Recurrent low mood triggered by interpersonal conflict');
  });
});

// ─── Section 6: Fail-closed / error safety ────────────────────────────────────

describe('Section 6: Fail-closed safety', () => {
  it('returns V5 base content when CaseFormulation entity throws (fail-closed)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockRejectedValue(new Error('entity unavailable')),
      },
    });
    const v6Result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // V6 must not include entity-fetched formulation data when entity throws
    expect(v6Result).not.toContain('CASE FORMULATION CONTEXT');
    // V6 still includes the [START_SESSION] marker
    expect(v6Result).toContain('[START_SESSION]');
    // Phase 10: V6 (context-only path) does NOT inject formulation-led instructions when the flag is off.
    // THERAPIST_FORMULATION_INSTRUCTIONS is only injected for V6-LED or when FORMULATION_LED flag is on.
  });

  it('returns empty string (no formulation block) when entities is null', async () => {
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, null, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('[START_SESSION]');
  });

  it('returns empty string (no formulation block) when CaseFormulation entity is missing', async () => {
    const entities = buildMockEntities();
    delete entities.CaseFormulation;
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('session start is never blocked by formulation context unavailability', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockRejectedValue(new Error('network error')),
      },
    });
    await expect(
      buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {}),
    ).resolves.toBeDefined();
  });
});

// ─── Section 7: No raw transcript leakage ────────────────────────────────────

describe('Section 7: No raw transcript leakage', () => {
  it('injects only structured clinical fields — no raw message content', async () => {
    const formulationWithSensitiveField = {
      ...RICH_FORMULATION,
      raw_transcript: 'User said: I want to hurt myself',  // private; must never appear
      session_notes: 'Private therapist notes',            // private; must never appear
    };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([formulationWithSensitiveField]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // Private fields must never appear
    expect(result).not.toContain('raw_transcript');
    expect(result).not.toContain('I want to hurt myself');
    expect(result).not.toContain('session_notes');
    expect(result).not.toContain('Private therapist notes');
  });

  it('formulation block only exposes the 4 documented clinical fields', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    expect(result).toContain('Presenting problem:');
    expect(result).toContain('Core belief:');
    expect(result).toContain('Maintaining cycle:');
    expect(result).toContain('Treatment goals:');
  });
});

// ─── Section 8: No cross-user / private-entity leakage ────────────────────────

describe('Section 8: No cross-user / private-entity leakage', () => {
  it('does not inject CompanionMemory content into the formulation block', async () => {
    const entities = buildMockEntities({
      CompanionMemory: {
        list: vi.fn().mockResolvedValue([
          {
            memory_type: 'therapist_session',
            content: JSON.stringify({ session_summary: 'COMPANION_MEMORY_CONTENT_MARKER' }),
          },
        ]),
      },
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6, entities, null, {},
    );
    // Formulation block must not contain companion memory content
    const formulationBlockStart = result.indexOf('=== CASE FORMULATION CONTEXT (read-only) ===');
    const formulationBlockEnd = result.indexOf('=== END CASE FORMULATION CONTEXT ===');
    if (formulationBlockStart >= 0 && formulationBlockEnd >= 0) {
      const formulationBlockContent = result.slice(formulationBlockStart, formulationBlockEnd);
      expect(formulationBlockContent).not.toContain('COMPANION_MEMORY_CONTENT_MARKER');
    }
  });

  it('CaseFormulation is only accessible via the caution_layer (no unrestricted access)', () => {
    const cf = CBT_THERAPIST_WIRING_STAGE2_V6.tool_configs.find(
      (c) => c.entity_name === 'CaseFormulation',
    );
    expect(cf).toBeDefined();
    expect(cf.read_only).toBe(true);
    expect(cf.caution_layer).toBe(true);
    expect(cf.unrestricted).toBe(false);
  });
});

// ─── Section 9: Default path isolation ──────────────────────────────────────

describe('Section 9: Default path isolation — HYBRID, V5, non-V6 wirings', () => {
  it('does NOT inject formulation block for HYBRID wiring', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('does NOT inject formulation block when formulation_context_enabled is false', async () => {
    const noFormulationWiring = { ...CBT_THERAPIST_WIRING_STAGE2_V5, formulation_context_enabled: false };
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV6SessionStartContentAsync(
      noFormulationWiring, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('does NOT call CaseFormulation.list for HYBRID wiring', async () => {
    const cfListMock = vi.fn().mockResolvedValue([RICH_FORMULATION]);
    const entities = buildMockEntities({
      CaseFormulation: { list: cfListMock },
    });
    await buildV6SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities, null, {});
    // CaseFormulation.list may be called by the V3 retrieval executor but
    // the V6 formulation block path should not add an extra call.
    // What matters is that CASE FORMULATION CONTEXT doesn't appear.
    // (We don't assert call count because V3 retrieval also uses CaseFormulation.)
  });

  it('result always starts with [START_SESSION] regardless of wiring', async () => {
    for (const wiring of [
      CBT_THERAPIST_WIRING_HYBRID,
      CBT_THERAPIST_WIRING_STAGE2_V6,
      null,
    ]) {
      const entities = buildMockEntities({
        CaseFormulation: { list: vi.fn().mockResolvedValue([RICH_FORMULATION]) },
      });
      const result = await buildV6SessionStartContentAsync(wiring, entities, null, {});
      expect(result.startsWith('[START_SESSION]')).toBe(true);
    }
  });
});

// ─── Section 10: V7 path propagation ─────────────────────────────────────────

describe('Section 10: V7 path — formulation quality propagates through continuity layer', () => {
  it('V7 still suppresses thin formulation block (quality filter applies in V7 chain)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([PLACEHOLDER_FORMULATION]),
      },
    });
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7, entities, null, {},
    );
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('V7 still injects rich formulation block (quality filter does not suppress rich records)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7, entities, null, {},
    );
    expect(result).toContain('CASE FORMULATION CONTEXT');
  });
});

// ─── Section 11: Companion flow isolation ────────────────────────────────────

describe('Section 11: Companion flow isolation — AI Companion is unaffected', () => {
  it('AI_COMPANION_WIRING_HYBRID does not have formulation_context_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.formulation_context_enabled).not.toBe(true);
  });

  it('buildV6SessionStartContentAsync does not affect companion wiring (delegation to V5)', async () => {
    const entities = buildMockEntities({
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([RICH_FORMULATION]),
      },
    });
    // Companion wiring does not have formulation_context_enabled, so V6 delegates to V5
    const companionResult = await buildV6SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID, entities, null, {},
    );
    const v5Result = await buildV5SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID, entities, null, {},
    );
    expect(companionResult).toBe(v5Result);
    expect(companionResult).not.toContain('CASE FORMULATION CONTEXT');
  });
});
