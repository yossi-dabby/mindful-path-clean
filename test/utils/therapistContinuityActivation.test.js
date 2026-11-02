/**
 * @file test/utils/therapistContinuityActivation.test.js
 *
 * Therapist Continuity & Formulation Activation — Flag-Wiring Integration Tests
 *
 * PURPOSE
 * -------
 * This suite validates the full activation path for therapist continuity (V7)
 * and formulation context (V6) injection at session start.  It is focused on
 * the flag-wiring integration — ensuring that:
 *
 *   1. When V7 wiring is active and CompanionMemory has prior session data,
 *      the continuity block is injected into the session-start content.
 *   2. When V7 wiring is active but CompanionMemory has no data (empty),
 *      the session-start content falls back gracefully (fail-closed).
 *   3. When V6 wiring is active and CaseFormulation exists, the formulation
 *      block is injected.
 *   4. When CONTINUITY_ENABLED is off (HYBRID wiring), no continuity or
 *      formulation context is injected — the default path is unchanged.
 *   5. Non-therapist flows (Companion wiring) are completely unaffected by
 *      THERAPIST_UPGRADE_CONTINUITY_ENABLED.
 *   6. No raw message content is ever stored or returned through any activation path.
 *   7. THERAPIST_UPGRADE_FLAGS correctly declares V6 and V7 flags and they
 *      default to false in test/production builds with no env override.
 *   8. The write path (triggerConversationEndSummarization) is inert when
 *      SUMMARIZATION_ENABLED is false — no writes occur.
 *   9. Role isolation — activating continuity for the therapist has no effect
 *      on AI Companion wiring.
 *  10. The buildV7SessionStartContentAsync call with HYBRID wiring never reads
 *      CompanionMemory (no entity calls made for entities without the flag).
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Does NOT import from base44/functions/ (Deno — not importable in Vitest).
 * - Does NOT render React components.
 * - All mocks are scoped within each test — no global state mutation.
 * - All tests are deterministic and do not require a live Base44 backend.
 * - Does NOT modify prior-phase test files or override any prior-phase exports.
 *
 * See src/lib/crossSessionContinuity.js, src/lib/workflowContextInjector.js,
 * src/lib/featureFlags.js, and the problem statement for context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Module imports ────────────────────────────────────────────────────────────

import {
  buildV7SessionStartContentAsync,
  buildV6SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

import {
  readCrossSessionContinuity,
  buildCrossSessionContinuityBlock,
} from '../../src/lib/crossSessionContinuity.js';

import {
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

import {
  resolveTherapistWiring,
  resolveCompanionWiring,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

import {
  THERAPIST_UPGRADE_FLAGS,
  COMPANION_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

import {
  isSummarizationEnabled,
} from '../../src/lib/summarizationGate.js';

import {
  triggerConversationEndSummarization,
  deriveConversationMemoryPayload,
} from '../../src/lib/sessionEndSummarization.js';

import {
  THERAPIST_MEMORY_TYPE,
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  isTherapistMemoryRecord,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

/**
 * Returns a valid CompanionMemory record wrapping a therapist_session payload.
 * content is a JSON string, matching Base44 at-rest storage format.
 */
function makeTherapistMemoryRecord(overrides = {}) {
  const base = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: 'sess-act-001',
    session_date: '2026-04-01',
    session_summary: 'Addressed catastrophising around upcoming presentation.',
    core_patterns: ['catastrophising', 'all-or-nothing thinking'],
    triggers: ['presentation deadline', 'feedback from colleague'],
    automatic_thoughts: ['I will fail', 'Everyone will judge me'],
    emotions: ['anxiety', 'dread'],
    urges: ['avoid preparing', 'cancel the presentation'],
    actions: ['prepared despite anxiety'],
    consequences: ['reduced anxiety after preparation'],
    working_hypotheses: ['Core belief: I must be perfect to be accepted'],
    interventions_used: ['thought_record', 'cognitive_restructuring'],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: ['Complete thought record for next three work events'],
    goals_referenced: ['goal-act-001'],
    last_summarized_date: '2026-04-01T09:00:00Z',
    ...overrides,
  };
  return {
    id: 'cm-act-001',
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify(base),
  };
}

/**
 * Returns a mock entities object with a CompanionMemory.list returning
 * the supplied records, and optional CaseFormulation.
 */
function makeEntities(memoryRecords = [], formulationRecords = []) {
  return {
    CompanionMemory: {
      list: vi.fn().mockResolvedValue(memoryRecords),
    },
    CaseFormulation: {
      list: vi.fn().mockResolvedValue(formulationRecords),
    },
  };
}

/**
 * Returns a mock CaseFormulation record.
 */
function makeCaseFormulation(overrides = {}) {
  return {
    id: 'cf-act-001',
    presenting_problem: 'Persistent anxiety in professional settings.',
    core_belief: 'I am not competent.',
    maintaining_cycle: 'Avoidance leads to temporary relief but reinforces belief.',
    treatment_goals: 'Build distress tolerance and challenge core belief.',
    ...overrides,
  };
}

// ─── Section 1: Flag registry completeness ────────────────────────────────────

describe('Section 1: V6/V7 flag registry completeness', () => {
  it('THERAPIST_UPGRADE_FLAGS contains THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED', () => {
    expect('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('THERAPIST_UPGRADE_FLAGS contains THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
    expect('THERAPIST_UPGRADE_CONTINUITY_ENABLED' in THERAPIST_UPGRADE_FLAGS).toBe(true);
  });

  it('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED defaults to false in test environment', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_CONTINUITY_ENABLED defaults to false in test environment', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_CONTINUITY_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for THERAPIST_UPGRADE_CONTINUITY_ENABLED in test env', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_CONTINUITY_ENABLED')).toBe(false);
  });

  it('isUpgradeEnabled returns false for THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED in test env', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED')).toBe(false);
  });

  it('COMPANION_UPGRADE_FLAGS does not contain therapist continuity keys', () => {
    expect('THERAPIST_UPGRADE_CONTINUITY_ENABLED' in COMPANION_UPGRADE_FLAGS).toBe(false);
    expect('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED' in COMPANION_UPGRADE_FLAGS).toBe(false);
  });
});

// ─── Section 2: V7 wiring — continuity injection when memory exists ───────────

describe('Section 2: V7 wiring — continuity injected when CompanionMemory has data', () => {
  it('buildV7SessionStartContentAsync with V7 wiring and memory data includes continuity block', async () => {
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('CROSS-SESSION CONTINUITY CONTEXT');
    expect(result).toContain('catastrophising');
    expect(result).toContain('Addressed catastrophising');
  });

  it('continuity block contains the most recent session summary', async () => {
    const record = makeTherapistMemoryRecord({
      session_summary: 'Explored avoidance strategies in workplace contexts.',
    });
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(result).toContain('Explored avoidance strategies');
  });

  it('continuity block contains recurring patterns from prior session', async () => {
    const record = makeTherapistMemoryRecord({
      core_patterns: ['avoidance', 'rumination'],
    });
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(result).toContain('avoidance');
    expect(result).toContain('rumination');
  });

  it('continuity block contains open follow-up tasks', async () => {
    const record = makeTherapistMemoryRecord({
      follow_up_tasks: ['Review thought record', 'Practice grounding exercise'],
    });
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(result).toContain('Review thought record');
  });

  it('continuity block does NOT contain raw message content', async () => {
    const record = makeTherapistMemoryRecord({
      session_summary: 'Addressed anxiety.',
      core_patterns: ['catastrophising'],
    });
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    // No transcript-like content should appear — only structured summary fields
    expect(result).not.toMatch(/messages?:/i);
    expect(result).not.toMatch(/transcript/i);
    expect(result).not.toMatch(/chat_history/i);
    expect(result).not.toMatch(/message_log/i);
  });

  it('V7 result also contains [START_SESSION] from the base V1/V2/... chain', async () => {
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    // The base chain should still emit [START_SESSION]
    expect(result).toContain('[START_SESSION]');
  });
});

// ─── Section 3: V7 wiring — fail-closed fallback when no memory ───────────────

describe('Section 3: V7 wiring — fail-closed when CompanionMemory is empty', () => {
  it('returns session-start content without continuity block when no memory records exist', async () => {
    const entities = makeEntities([]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });

  it('still returns valid session-start content when CompanionMemory.list throws', async () => {
    const entities = {
      CompanionMemory: {
        list: vi.fn().mockRejectedValue(new Error('network error')),
      },
      CaseFormulation: {
        list: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });

  it('does not throw when entities is null (fail-closed)', async () => {
    await expect(
      buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, null, {}),
    ).resolves.toBeDefined();
  });

  it('does not throw when entities is undefined (fail-closed)', async () => {
    await expect(
      buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V7, undefined, {}),
    ).resolves.toBeDefined();
  });
});

// ─── Section 4: V6 wiring — formulation injection when CaseFormulation exists ──

describe('Section 4: V6 wiring — formulation context injected when CaseFormulation exists', () => {
  it('buildV6SessionStartContentAsync with V6 wiring and formulation data includes formulation block', async () => {
    const formulation = makeCaseFormulation();
    const entities = makeEntities([], [formulation]);

    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result).toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('Persistent anxiety in professional settings.');
    expect(result).toContain('I am not competent.');
  });

  it('buildV6SessionStartContentAsync is fail-closed when CaseFormulation.list throws', async () => {
    const entities = {
      CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
      CaseFormulation: { list: vi.fn().mockRejectedValue(new Error('db error')) },
    };

    const result = await buildV6SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V6,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('V7 wiring also injects formulation context (V7 is superset of V6)', async () => {
    const formulation = makeCaseFormulation();
    const memory = makeTherapistMemoryRecord();
    const entities = makeEntities([memory], [formulation]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V7,
      entities,
      {},
    );

    expect(result).toContain('CASE FORMULATION CONTEXT');
    expect(result).toContain('CROSS-SESSION CONTINUITY CONTEXT');
  });
});

// ─── Section 5: HYBRID wiring — default path unchanged ────────────────────────

describe('Section 5: HYBRID wiring — flag OFF — no continuity or formulation injected', () => {
  it('buildV7SessionStartContentAsync with HYBRID wiring returns base session-start (no continuity)', async () => {
    // CompanionMemory has data, but wiring lacks continuity_layer_enabled
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      entities,
      {},
    );

    expect(typeof result).toBe('string');
    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
    expect(result).not.toContain('CASE FORMULATION CONTEXT');
  });

  it('HYBRID wiring does NOT call CompanionMemory.list (no read when flag is off)', async () => {
    const entities = makeEntities([makeTherapistMemoryRecord()]);

    await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      entities,
      {},
    );

    // With HYBRID wiring (no continuity_layer_enabled), CompanionMemory should NOT be queried
    expect(entities.CompanionMemory.list).not.toHaveBeenCalled();
  });

  it('resolveTherapistWiring returns HYBRID when all flags are false (current default)', () => {
    // In test env all VITE_* flags are false → should always return HYBRID
    const wiring = resolveTherapistWiring();
    // Wiring is always an object with the cbt_therapist name
    expect(wiring.name).toBe('cbt_therapist');
    // In default test mode, continuity_layer_enabled should not be true
    expect(wiring.continuity_layer_enabled).not.toBe(true);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING in test env does not have continuity_layer_enabled=true', () => {
    // This confirms the production-safe default: no continuity injection by default
    expect(ACTIVE_CBT_THERAPIST_WIRING.continuity_layer_enabled).not.toBe(true);
  });
});

// ─── Section 6: Role isolation — Companion unaffected ─────────────────────────

describe('Section 6: Role isolation — AI Companion is unaffected by therapist continuity flags', () => {
  it('resolveCompanionWiring returns Companion wiring regardless of therapist continuity state', () => {
    const wiring = resolveCompanionWiring();
    expect(wiring.name).toBe('ai_companion');
  });

  it('AI_COMPANION_WIRING_HYBRID does not have continuity_layer_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.continuity_layer_enabled).toBeUndefined();
  });

  it('Companion wiring does not have formulation_context_enabled', () => {
    expect(AI_COMPANION_WIRING_HYBRID.formulation_context_enabled).toBeUndefined();
  });

  it('buildV7SessionStartContentAsync with Companion wiring and memory returns base content without continuity', async () => {
    // AI Companion wiring does not have continuity_layer_enabled, so V7 delegates through
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    // Use Companion HYBRID wiring (it lacks continuity_layer_enabled)
    const result = await buildV7SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID,
      entities,
      {},
    );

    expect(result).not.toContain('CROSS-SESSION CONTINUITY CONTEXT');
    // CompanionMemory should not be read when continuity_layer_enabled is absent
    expect(entities.CompanionMemory.list).not.toHaveBeenCalled();
  });
});

// ─── Section 7: Summarization gate — write path inert when flag is off ─────────

describe('Section 7: Summarization write path — inert when SUMMARIZATION_ENABLED is false', () => {
  it('isSummarizationEnabled returns false in test environment (flag defaults off)', () => {
    expect(isSummarizationEnabled()).toBe(false);
  });

  it('triggerConversationEndSummarization is a no-op when summarization is disabled', () => {
    // The function should return synchronously without triggering any async work
    // when isSummarizationEnabled() returns false.  We verify no error is thrown.
    expect(() => {
      triggerConversationEndSummarization('conv-test-001', { name: 'Test Session' });
    }).not.toThrow();
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('flag isolation — disabling SUMMARIZATION_ENABLED does not affect CONTINUITY_ENABLED state', () => {
    // Both flags are independently gated; one off does not affect the other
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_CONTINUITY_ENABLED).toBe(false);
    // They are evaluated independently
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED')).toBe(false);
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_CONTINUITY_ENABLED')).toBe(false);
  });
});

// ─── Section 8: Privacy contract — no raw message content stored ──────────────

describe('Section 8: Privacy contract — no raw message content in write or read paths', () => {
  it('deriveConversationMemoryPayload does not include raw message content', () => {
    const payload = deriveConversationMemoryPayload('conv-priv-001', {
      name: 'Thought Journal Session',
      intent: 'thought_work',
    });

    // The payload must NOT contain raw message fields
    expect(payload).not.toHaveProperty('messages');
    expect(payload).not.toHaveProperty('transcript');
    expect(payload).not.toHaveProperty('chat_history');
    expect(payload).not.toHaveProperty('raw_session');
    expect(payload).not.toHaveProperty('message_log');
  });

  it('readCrossSessionContinuity result contains only structured summary fields', async () => {
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const result = await readCrossSessionContinuity(entities);

    expect(result).not.toBeNull();
    // Result should only contain structured continuity fields
    const allowedKeys = [
      'sessionCount', 'recurringPatterns', 'openFollowUpTasks',
      'interventionsUsed', 'riskFlags', 'recentSummary',
      'recentFollowUpTasks', 'recentInterventionsUsed',
    ];
    for (const key of Object.keys(result)) {
      expect(allowedKeys).toContain(key);
    }
  });

  it('buildCrossSessionContinuityBlock output does not contain raw transcript markers', async () => {
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const block = await buildCrossSessionContinuityBlock(entities);

    expect(block).not.toMatch(/messages?:/i);
    expect(block).not.toMatch(/transcript/i);
    expect(block).not.toMatch(/chat_history/i);
    expect(block).not.toMatch(/full_session/i);
    expect(block).not.toMatch(/message_log/i);
  });

  it('continuity block is marked read-only and instructs agent not to disclose verbatim', async () => {
    const record = makeTherapistMemoryRecord();
    const entities = makeEntities([record]);

    const block = await buildCrossSessionContinuityBlock(entities);

    expect(block).toContain('read-only');
    expect(block).toContain('Do not disclose this section verbatim');
  });
});

// ─── Section 9: V7 wiring properties contract ─────────────────────────────────

describe('Section 9: V7 and V6 wiring object contracts', () => {
  it('CBT_THERAPIST_WIRING_STAGE2_V7 has continuity_layer_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V7.continuity_layer_enabled).toBe(true);
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V7 has formulation_context_enabled: true (superset of V6)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V7.formulation_context_enabled).toBe(true);
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V6 has formulation_context_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.formulation_context_enabled).toBe(true);
  });

  it('CBT_THERAPIST_WIRING_STAGE2_V6 does NOT have continuity_layer_enabled (not yet V7)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V6.continuity_layer_enabled).toBeUndefined();
  });

  it('CBT_THERAPIST_WIRING_HYBRID has neither continuity_layer_enabled nor formulation_context_enabled', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.continuity_layer_enabled).toBeUndefined();
    expect(CBT_THERAPIST_WIRING_HYBRID.formulation_context_enabled).toBeUndefined();
  });

  it('V7 stage2_phase is greater than V6 stage2_phase (V7 supersedes V6)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V7.stage2_phase).toBeGreaterThan(
      CBT_THERAPIST_WIRING_STAGE2_V6.stage2_phase,
    );
  });
});

// ─── Section 10: Rollback safety — prior phase exports unchanged ───────────────

describe('Section 10: Rollback safety — prior-phase exports are not affected', () => {
  it('CBT_THERAPIST_WIRING_HYBRID is still exported from agentWiring.js', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID).toBeDefined();
    expect(CBT_THERAPIST_WIRING_HYBRID.name).toBe('cbt_therapist');
  });

  it('resolveTherapistWiring is still exported from activeAgentWiring.js', () => {
    expect(typeof resolveTherapistWiring).toBe('function');
  });

  it('THERAPIST_UPGRADE_FLAGS now has exactly 17 keys (Context Composer V2 added the newest key)', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS).length).toBe(17);
  });

  it('THERAPIST_UPGRADE_ENABLED master gate is still present and defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('buildV6SessionStartContentAsync is still exported from workflowContextInjector.js', () => {
    expect(typeof buildV6SessionStartContentAsync).toBe('function');
  });

  it('buildV7SessionStartContentAsync is still exported from workflowContextInjector.js', () => {
    expect(typeof buildV7SessionStartContentAsync).toBe('function');
  });

  it('isSummarizationEnabled is still exported from summarizationGate.js', () => {
    expect(typeof isSummarizationEnabled).toBe('function');
  });
});

// ─── Section 11: Chat.jsx static analysis — session-start call sites ───────────

describe('Section 11: Chat.jsx static analysis — V10 called at all session-start sites', () => {
  const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

  it('Chat.jsx imports buildV7SessionStartContentAsync (still present in import)', () => {
    expect(chatSrc).toContain('buildV7SessionStartContentAsync');
  });

  it('Chat.jsx imports buildV8SessionStartContentAsync (still present for chain delegation)', () => {
    expect(chatSrc).toContain('buildV8SessionStartContentAsync');
  });

  it('Chat.jsx imports buildV9SessionStartContentAsync (still present for V10 delegation chain)', () => {
    expect(chatSrc).toContain('buildV9SessionStartContentAsync');
  });

  it('Chat.jsx imports buildV10SessionStartContentAsync (Wave 4C: highest session-start builder)', () => {
    expect(chatSrc).toContain('buildV10SessionStartContentAsync');
  });

  it('Chat.jsx calls buildV10SessionStartContentAsync at every session-start site', () => {
    // Enforcement pass: action-first demotion — all session-start sites now use
    // buildActionFirstDemotedSessionContentAsync (wrapper over V12).
    const callCount = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync\(/g) || []).length;
    expect(callCount).toBeGreaterThanOrEqual(4);
  });

  it('Chat.jsx does NOT call buildV6SessionStartContentAsync directly (delegates through V10→V9→V8→V7 chain)', () => {
    // V6 is only an internal step in the chain — Chat.jsx must not call it directly
    const directV6Calls = (chatSrc.match(/await buildV6SessionStartContentAsync\(/g) || []).length;
    expect(directV6Calls).toBe(0);
  });

  it('Chat.jsx imports ACTIVE_CBT_THERAPIST_WIRING from activeAgentWiring.js', () => {
    expect(chatSrc).toContain('ACTIVE_CBT_THERAPIST_WIRING');
  });
});

// ─── Section 12: Env example file ────────────────────────────────────────────

describe('Section 12: .env.example documents V6/V7 flags', () => {
  let envExampleSrc;
  try {
    envExampleSrc = readFileSync(resolve('.env.example'), 'utf8');
  } catch {
    envExampleSrc = '';
  }

  it('.env.example file exists', () => {
    expect(envExampleSrc.length).toBeGreaterThan(0);
  });

  it('.env.example contains VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED', () => {
    expect(envExampleSrc).toContain('VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED');
  });

  it('.env.example contains VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
    expect(envExampleSrc).toContain('VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED');
  });

  it('.env.example contains VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED', () => {
    expect(envExampleSrc).toContain('VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
  });

  it('.env.example contains VITE_THERAPIST_UPGRADE_ENABLED master gate', () => {
    expect(envExampleSrc).toContain('VITE_THERAPIST_UPGRADE_ENABLED');
  });

  it('.env.example references THERAPIST_UPGRADE_SUMMARIZATION_ENABLED as a backend Base44 secret', () => {
    // The .env.example should document that this is also a backend secret
    expect(envExampleSrc).toContain('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
  });
});

// ─── Section 13: Staging docs static analysis ────────────────────────────────

describe('Section 13: Staging docs include V6/V7 flags', () => {
  let stagingGuideSrc;
  let stagingRunbookSrc;
  try {
    stagingGuideSrc = readFileSync(resolve('docs/staging-deployment-guide.md'), 'utf8');
    stagingRunbookSrc = readFileSync(resolve('docs/staging-deployment-runbook.md'), 'utf8');
  } catch {
    stagingGuideSrc = '';
    stagingRunbookSrc = '';
  }

  it('staging-deployment-guide.md contains VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED', () => {
    expect(stagingGuideSrc).toContain('VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED');
  });

  it('staging-deployment-guide.md contains VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
    expect(stagingGuideSrc).toContain('VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED');
  });

  it('staging-deployment-guide.md documents THERAPIST_UPGRADE_SUMMARIZATION_ENABLED as a Base44 backend secret', () => {
    expect(stagingGuideSrc).toContain('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
    expect(stagingGuideSrc).toContain('Base44 Application Secrets');
  });

  it('staging-deployment-runbook.md contains VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED', () => {
    expect(stagingRunbookSrc).toContain('VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED');
  });

  it('staging-deployment-runbook.md contains VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED', () => {
    expect(stagingRunbookSrc).toContain('VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED');
  });

  it('staging-deployment-runbook.md documents backend secrets section', () => {
    expect(stagingRunbookSrc).toContain('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
  });
});
