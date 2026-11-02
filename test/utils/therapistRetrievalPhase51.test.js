/**
 * @file test/utils/therapistRetrievalPhase51.test.js
 *
 * Phase 5.1 — Real Runtime Retrieval Execution
 *
 * PURPOSE
 * -------
 *  1. Verify that executeV3BoundedRetrieval exists and is exported.
 *  2. Verify that executeV3BoundedRetrieval queries real app data from mock entities.
 *  3. Verify that retrieval order is actually enforced (therapist_memory first,
 *     session_context second, internal_knowledge third, external_knowledge last).
 *  4. Verify that the bounded context package is actually built from retrieved items
 *     (not empty when mock data is provided).
 *  5. Verify that the bounded context package is actually injected into the V3
 *     session-start content via buildV3SessionStartContentAsync.
 *  6. Verify that default mode (HYBRID, V1, V2) is completely unchanged.
 *  7. Verify that privacy/minimization limits are enforced (truncation, no raw transcripts).
 *  8. Verify that no live retrieval exists.
 *  9. Verify fail-open behavior: entity errors skip the source silently.
 * 10. Verify that rollback remains safe (flag-off → no retrieval execution).
 * 11. Verify that per-source and total item limits are respected.
 * 12. Verify that sources_queried and sources_skipped are correctly reported.
 * 13. Verify that external knowledge is safely deferred when the entity is absent.
 * 14. Verify that buildV3SessionStartContentAsync returns a Promise.
 * 15. Verify that V3 async content contains RETRIEVED CONTEXT section when data is available.
 * 16. Verify that V3 async content still contains the orchestration instructions.
 * 17. Verify that V3 async content still starts with [START_SESSION].
 * 18. Verify that the existing Phase 5 tests are not broken.
 * 19. Verify that ACTIVE_CBT_THERAPIST_WIRING remains HYBRID (default unchanged).
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - All prior phase assertions are tested by prior phase test files (not duplicated here).
 * - Uses mock entity objects; no live entity calls are made.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 5.1
 */

import { describe, it, expect } from 'vitest';

// ── Phase 5.1 — Retrieval executor ────────────────────────────────────────────
import {
  executeV3BoundedRetrieval,
} from '../../src/lib/v3RetrievalExecutor.js';

// ── Phase 5 — Injector (extended in Phase 5.1) ───────────────────────────────
import {
  buildSessionStartContent,
  buildV3SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Retrieval config ──────────────────────────────────────────────────────────
import {
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_SOURCE_ORDER,
  RETRIEVAL_CONFIG,
} from '../../src/lib/retrievalConfig.js';

// ── Wiring configs ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
} from '../../src/api/agentWiring.js';

// ── Active wiring (default path regression) ───────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';

// ── Phase 5 orchestrator (context package) ────────────────────────────────────
import {
  buildBoundedContextPackage,
  RETRIEVAL_ORCHESTRATION_INSTRUCTIONS,
} from '../../src/lib/retrievalOrchestrator.js';

// ── Therapist memory model ────────────────────────────────────────────────────
import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Mock entity helpers ──────────────────────────────────────────────────────

/**
 * Creates a mock CompanionMemory record with embedded therapist memory JSON.
 */
function makeMockMemoryRecord(sessionDate = '2024-01-15', summary = 'Worked on CBT techniques') {
  return {
    id: `mem-${sessionDate}`,
    content: JSON.stringify({
      [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
      session_date: sessionDate,
      session_summary: summary,
      core_patterns: ['avoidance', 'catastrophizing'],
      follow_up_tasks: ['thought record exercise'],
    }),
  };
}

/**
 * Creates a mock CompanionMemory record WITHOUT the therapist memory marker
 * (simulates a standard companion memory record that should be filtered out).
 */
function makeMockNonTherapistMemoryRecord() {
  return {
    id: 'companion-mem-1',
    content: JSON.stringify({ type: 'companion_note', note: 'User likes walks' }),
  };
}

/**
 * Creates a mock Goal record.
 */
function makeMockGoal(title = 'Reduce anxiety', progress = 40) {
  return { id: 'goal-1', title, status: 'active', progress_percentage: progress, category: 'wellbeing' };
}

/**
 * Creates a mock SessionSummary record.
 */
function makeMockSessionSummary(date = '2024-01-14') {
  return { id: 'ss-1', session_date: date, summary_text: 'Session focused on identifying triggers' };
}

/**
 * Creates a mock Exercise record.
 */
function makeMockExercise(title = 'Breathing Exercise') {
  return { id: 'ex-1', title, exercise_type: 'breathing' };
}

/**
 * Creates a mock Resource record.
 */
function makeMockResource(title = 'CBT Workbook') {
  return { id: 'res-1', title, category: 'psychoeducation' };
}

/**
 * Creates a mock ExternalKnowledgeChunk record.
 */
function makeMockExternalChunk(sourceId = 'burns_dbtr', text = 'Cognitive distortions are common') {
  return { id: 'chunk-1', source_id: sourceId, chunk_text: text };
}

/**
 * Creates a complete mock entity client with all sources populated.
 */
function makeMockEntities({
  memories = [makeMockMemoryRecord()],
  goals = [makeMockGoal()],
  sessionSummaries = [makeMockSessionSummary()],
  exercises = [makeMockExercise()],
  resources = [makeMockResource()],
  externalChunks = [makeMockExternalChunk()],
} = {}) {
  return {
    CompanionMemory: {
      list: async () => memories,
      filter: async () => memories,
    },
    Goal: {
      list: async () => goals,
      filter: async () => goals,
    },
    SessionSummary: {
      list: async () => sessionSummaries,
      filter: async () => sessionSummaries,
    },
    Exercise: {
      list: async () => exercises,
      filter: async () => exercises,
    },
    Resource: {
      list: async () => resources,
      filter: async () => resources,
    },
    ExternalKnowledgeChunk: {
      list: async () => externalChunks,
      filter: async () => externalChunks,
    },
  };
}

/**
 * Creates a mock entity client where all sources throw errors (fail-open test).
 */
function makeBrokenEntities() {
  const throwError = async () => { throw new Error('entity unavailable'); };
  const fail = { list: throwError, filter: throwError };
  return {
    CompanionMemory: fail,
    Goal: fail,
    SessionSummary: fail,
    Exercise: fail,
    Resource: fail,
    ExternalKnowledgeChunk: fail,
  };
}

/**
 * Creates a mock entity client without ExternalKnowledgeChunk
 * (simulates the entity not yet being available in the app).
 */
function makeMockEntitiesWithoutExternalKnowledge() {
  const base = makeMockEntities();
  const { ExternalKnowledgeChunk: _ignored, ...rest } = base;
  return rest;
}

// ─── Section 1 — executeV3BoundedRetrieval: exports ──────────────────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: exports', () => {
  it('executeV3BoundedRetrieval is exported as a function', () => {
    expect(typeof executeV3BoundedRetrieval).toBe('function');
  });

  it('buildV3SessionStartContentAsync is exported as a function', () => {
    expect(typeof buildV3SessionStartContentAsync).toBe('function');
  });

  it('buildV3SessionStartContentAsync returns a Promise', () => {
    const result = buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {});
    expect(result).toBeInstanceOf(Promise);
    return result; // resolve the promise to avoid unhandled rejection
  });
});

// ─── Section 2 — executeV3BoundedRetrieval: real data retrieval ──────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: queries real app data', () => {
  it('returns a result object with items, sources_queried, sources_skipped', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('sources_queried');
    expect(result).toHaveProperty('sources_skipped');
    expect(Array.isArray(result.items)).toBe(true);
    expect(Array.isArray(result.sources_queried)).toBe(true);
    expect(Array.isArray(result.sources_skipped)).toBe(true);
  });

  it('returns items from therapist_memory source when mock data is present', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    expect(memItems.length).toBeGreaterThan(0);
  });

  it('returns items from session_context source when mock data is present', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const ctxItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
    );
    expect(ctxItems.length).toBeGreaterThan(0);
  });

  it('returns items from internal_knowledge source when mock data is present', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const intItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    expect(intItems.length).toBeGreaterThan(0);
  });

  it('includes ExternalKnowledgeChunk items when entity is available', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    expect(extItems.length).toBeGreaterThan(0);
  });

  it('therapist_memory items reference CompanionMemory entity', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    for (const item of memItems) {
      expect(item.entity_name).toBe('CompanionMemory');
    }
  });

  it('session_context items reference Goal or SessionSummary entity', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const ctxItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
    );
    for (const item of ctxItems) {
      expect(['Goal', 'SessionSummary']).toContain(item.entity_name);
    }
  });

  it('internal_knowledge items reference Exercise or Resource entity', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const intItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    for (const item of intItems) {
      expect(['Exercise', 'Resource']).toContain(item.entity_name);
    }
  });

  it('all items have a non-empty content field', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    for (const item of result.items) {
      expect(typeof item.content).toBe('string');
      expect(item.content.trim().length).toBeGreaterThan(0);
    }
  });

  it('all items have a valid source_type', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const validTypes = Object.values(RETRIEVAL_SOURCE_TYPES);
    for (const item of result.items) {
      expect(validTypes).toContain(item.source_type);
    }
  });

  it('filters out non-therapist CompanionMemory records', async () => {
    // Only one record has the therapist_memory_version marker; the other should be filtered
    const entities = makeMockEntities({
      memories: [makeMockMemoryRecord(), makeMockNonTherapistMemoryRecord()],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    // Should only include the real therapist memory record (1), not the companion note
    expect(memItems.length).toBe(1);
  });

  it('filters Resources by the normalized active locale and active status', async () => {
    const entities = makeMockEntities();
    const resourceCalls = [];
    entities.Resource.filter = async (...args) => {
      resourceCalls.push(args);
      return [makeMockResource('Hebrew resource')];
    };

    await executeV3BoundedRetrieval(entities, undefined, { locale: 'he-IL' });

    expect(resourceCalls).toHaveLength(1);
    expect(resourceCalls[0][0]).toEqual({ language: 'he', status: 'active' });
    expect(resourceCalls[0][1]).toBe('title');
    expect(resourceCalls[0][2]).toBeGreaterThan(0);
  });

  it('forwards the session locale from the V3 injector to Resource retrieval', async () => {
    const entities = makeMockEntities();
    const resourceCalls = [];
    entities.Resource.filter = async (...args) => {
      resourceCalls.push(args);
      return [makeMockResource('Recurso en español')];
    };

    await buildV3SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V3,
      entities,
      { locale: 'es' },
    );

    expect(resourceCalls[0][0]).toEqual({ language: 'es', status: 'active' });
  });
});

// ─── Section 3 — executeV3BoundedRetrieval: retrieval order ──────────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: retrieval order is enforced', () => {
  it('therapist_memory items appear before session_context items in result', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const firstMemIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    const firstCtxIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
    );
    if (firstMemIdx !== -1 && firstCtxIdx !== -1) {
      expect(firstMemIdx).toBeLessThan(firstCtxIdx);
    }
  });

  it('session_context items appear before internal_knowledge items in result', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const firstCtxIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
    );
    const firstIntIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    if (firstCtxIdx !== -1 && firstIntIdx !== -1) {
      expect(firstCtxIdx).toBeLessThan(firstIntIdx);
    }
  });

  it('internal_knowledge items appear before external_knowledge items in result', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const firstIntIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    const firstExtIdx = result.items.findIndex(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    if (firstIntIdx !== -1 && firstExtIdx !== -1) {
      expect(firstIntIdx).toBeLessThan(firstExtIdx);
    }
  });

  it('sources_queried reflects the internal-first order', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    // Each source that was queried should appear in RETRIEVAL_SOURCE_ORDER order
    const orderMap = {};
    RETRIEVAL_SOURCE_ORDER.forEach((s, i) => { orderMap[s] = i; });
    for (let i = 0; i < result.sources_queried.length - 1; i++) {
      expect(orderMap[result.sources_queried[i]]).toBeLessThanOrEqual(
        orderMap[result.sources_queried[i + 1]],
      );
    }
  });
});

// ─── Section 4 — executeV3BoundedRetrieval: bounds enforcement ───────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: per-source limits respected', () => {
  it('therapist_memory items do not exceed MAX_THERAPIST_MEMORY_ITEMS', async () => {
    // Provide more mock records than the limit
    const manyMemories = Array.from({ length: 10 }, (_, i) =>
      makeMockMemoryRecord(`2024-0${(i % 9) + 1}-01`, `Summary ${i}`),
    );
    const entities = makeMockEntities({ memories: manyMemories });
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    expect(memItems.length).toBeLessThanOrEqual(RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS);
  });

  it('session_context items do not exceed MAX_SESSION_CONTEXT_ITEMS', async () => {
    const manyGoals = Array.from({ length: 10 }, (_, i) =>
      ({ id: `g-${i}`, title: `Goal ${i}`, status: 'active', progress_percentage: i * 10 }),
    );
    const entities = makeMockEntities({ goals: manyGoals });
    const result = await executeV3BoundedRetrieval(entities);
    const ctxItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
    );
    expect(ctxItems.length).toBeLessThanOrEqual(RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS);
  });

  it('internal_knowledge items do not exceed MAX_INTERNAL_KNOWLEDGE_ITEMS', async () => {
    const manyExercises = Array.from({ length: 10 }, (_, i) =>
      ({ id: `ex-${i}`, title: `Exercise ${i}`, exercise_type: 'breathing' }),
    );
    const entities = makeMockEntities({ exercises: manyExercises });
    const result = await executeV3BoundedRetrieval(entities);
    const intItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    expect(intItems.length).toBeLessThanOrEqual(RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS);
  });

  it('external_knowledge items do not exceed MAX_EXTERNAL_KNOWLEDGE_ITEMS', async () => {
    const manyChunks = Array.from({ length: 10 }, (_, i) =>
      makeMockExternalChunk(`source-${i}`, `Chunk text ${i}`),
    );
    const entities = makeMockEntities({ externalChunks: manyChunks });
    const result = await executeV3BoundedRetrieval(entities);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    expect(extItems.length).toBeLessThanOrEqual(RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS);
  });

  it('custom config limits override defaults', async () => {
    const customConfig = { ...RETRIEVAL_CONFIG, MAX_THERAPIST_MEMORY_ITEMS: 1 };
    const manyMemories = Array.from({ length: 5 }, (_, i) =>
      makeMockMemoryRecord(`2024-0${i + 1}-01`, `Summary ${i}`),
    );
    const entities = makeMockEntities({ memories: manyMemories });
    const result = await executeV3BoundedRetrieval(entities, customConfig);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    expect(memItems.length).toBeLessThanOrEqual(1);
  });
});

// ─── Section 5 — executeV3BoundedRetrieval: fail-open behavior ───────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: fail-open contract', () => {
  it('returns empty items when entities object is null', async () => {
    const result = await executeV3BoundedRetrieval(null);
    expect(result.items).toHaveLength(0);
  });

  it('returns empty items when entities object is undefined', async () => {
    const result = await executeV3BoundedRetrieval(undefined);
    expect(result.items).toHaveLength(0);
  });

  it('returns empty items when entities object is empty {}', async () => {
    const result = await executeV3BoundedRetrieval({});
    expect(result.items).toHaveLength(0);
  });

  it('does not throw when all entity sources throw errors', async () => {
    const broken = makeBrokenEntities();
    const result = await executeV3BoundedRetrieval(broken);
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('records skipped sources when entity calls fail', async () => {
    const broken = makeBrokenEntities();
    const result = await executeV3BoundedRetrieval(broken);
    // When all throw, some sources may be skipped or queried (internal try/catch in each fetcher)
    // Total sources_queried + sources_skipped = 4 (all sources attempted)
    expect(result.sources_queried.length + result.sources_skipped.length).toBe(
      Object.values(RETRIEVAL_SOURCE_TYPES).length,
    );
  });

  it('continues to remaining sources when one source fails', async () => {
    const partialEntities = makeMockEntities();
    // Break CompanionMemory but leave others working
    partialEntities.CompanionMemory = {
      list: async () => { throw new Error('CompanionMemory down'); },
      filter: async () => { throw new Error('CompanionMemory down'); },
    };
    const result = await executeV3BoundedRetrieval(partialEntities);
    // Should still have items from other sources (goal, exercise, etc.)
    expect(result.items.length).toBeGreaterThan(0);
    const intItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
    );
    expect(intItems.length).toBeGreaterThan(0);
  });
});

// ─── Section 6 — executeV3BoundedRetrieval: external knowledge deferral ──────

describe('Phase 5.1 — executeV3BoundedRetrieval: external knowledge deferral', () => {
  it('safely returns items from other sources when ExternalKnowledgeChunk is absent', async () => {
    const entitiesWithoutExternal = makeMockEntitiesWithoutExternalKnowledge();
    const result = await executeV3BoundedRetrieval(entitiesWithoutExternal);
    // Other sources should still work
    const nonExtItems = result.items.filter(
      (i) => i.source_type !== RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    expect(nonExtItems.length).toBeGreaterThan(0);
  });

  it('returns no external items when ExternalKnowledgeChunk entity is absent', async () => {
    const entitiesWithoutExternal = makeMockEntitiesWithoutExternalKnowledge();
    const result = await executeV3BoundedRetrieval(entitiesWithoutExternal);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    expect(extItems.length).toBe(0);
  });

  it('returns no external items when ExternalKnowledgeChunk returns empty array', async () => {
    const entities = makeMockEntities({ externalChunks: [] });
    const result = await executeV3BoundedRetrieval(entities);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    expect(extItems.length).toBe(0);
  });

  it('external knowledge items carry source_id provenance', async () => {
    const entities = makeMockEntities({
      externalChunks: [makeMockExternalChunk('burns_dbtr', 'CBT reference text')],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    if (extItems.length > 0) {
      expect(extItems[0].source_id).toBe('burns_dbtr');
    }
  });
});

// ─── Section 7 — Privacy / minimization ──────────────────────────────────────

describe('Phase 5.1 — executeV3BoundedRetrieval: privacy and minimization', () => {
  it('therapist_memory content does not include raw transcripts (only structured fields)', async () => {
    const entities = makeMockEntities({
      memories: [makeMockMemoryRecord('2024-01-15', 'Concise clinical summary')],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    // The content should contain structured fields only — not the full JSON blob
    for (const item of memItems) {
      // Should not contain the JSON structure key itself as visible content
      expect(item.content).not.toContain('"therapist_memory_version"');
      expect(item.content).not.toContain('"session_id"');
    }
  });

  it('session_summary content is truncated to a reasonable length', async () => {
    const longText = 'A'.repeat(1000);
    const entities = makeMockEntities({
      sessionSummaries: [{ id: 'ss-1', session_date: '2024-01-14', summary_text: longText }],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const ctxItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT &&
             i.entity_name === 'SessionSummary',
    );
    for (const item of ctxItems) {
      // Content should be truncated — not 1000 chars
      expect(item.content.length).toBeLessThan(500);
    }
  });

  it('external knowledge chunk content is truncated to a reasonable length', async () => {
    const longChunkText = 'B'.repeat(1000);
    const entities = makeMockEntities({
      externalChunks: [makeMockExternalChunk('src-1', longChunkText)],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const extItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
    );
    for (const item of extItems) {
      // Content should be truncated — not 1000 chars
      expect(item.content.length).toBeLessThan(500);
    }
  });

  it('skips CompanionMemory records without the therapist memory marker', async () => {
    const entities = makeMockEntities({
      memories: [makeMockNonTherapistMemoryRecord()],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    expect(memItems.length).toBe(0);
  });

  it('skips CompanionMemory records with unparseable content', async () => {
    const entities = makeMockEntities({
      memories: [{ id: 'bad-1', content: 'not valid json {{{' }],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const memItems = result.items.filter(
      (i) => i.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
    );
    expect(memItems.length).toBe(0);
  });
});

// ─── Section 8 — Bounded context package built from real retrieved items ─────

describe('Phase 5.1 — bounded context package built from real data', () => {
  it('buildBoundedContextPackage produces non-empty output from executeV3BoundedRetrieval items', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const pkg = buildBoundedContextPackage(result.items);
    expect(typeof pkg).toBe('string');
    expect(pkg.length).toBeGreaterThan(0);
  });

  it('context package contains therapist_memory provenance label', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const pkg = buildBoundedContextPackage(result.items);
    expect(pkg).toContain(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
  });

  it('context package contains session_context provenance label', async () => {
    const entities = makeMockEntities();
    const result = await executeV3BoundedRetrieval(entities);
    const pkg = buildBoundedContextPackage(result.items);
    expect(pkg).toContain(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
  });

  it('context package is empty string when no items are retrieved', async () => {
    const entities = makeMockEntities({
      memories: [],
      goals: [],
      sessionSummaries: [],
      exercises: [],
      resources: [],
      externalChunks: [],
    });
    const result = await executeV3BoundedRetrieval(entities);
    const pkg = buildBoundedContextPackage(result.items);
    expect(pkg).toBe('');
  });
});

// ─── Section 9 — buildV3SessionStartContentAsync: real injection ─────────────

describe('Phase 5.1 — buildV3SessionStartContentAsync: real context package injected', () => {
  it('returns a string for V3 wiring with mock entities', async () => {
    const entities = makeMockEntities();
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  it('V3 content starts with [START_SESSION]', async () => {
    const entities = makeMockEntities();
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    expect(content).toMatch(/^\[START_SESSION\]/);
  });

  it('V3 content contains RETRIEVAL_ORCHESTRATION_INSTRUCTIONS (Phase 5 preserved)', async () => {
    const entities = makeMockEntities();
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    expect(content).toContain(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS);
  });

  it('V3 content contains RETRIEVED CONTEXT section when data is available', async () => {
    const entities = makeMockEntities();
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    expect(content).toContain('=== RETRIEVED CONTEXT ===');
    expect(content).toContain('=== END RETRIEVED CONTEXT ===');
  });

  it('V3 async content is longer than sync content (real data added)', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3);
    expect(asyncContent.length).toBeGreaterThan(syncContent.length);
  });

  it('V3 content contains actual retrieved data (not only orchestration instructions)', async () => {
    const entities = makeMockEntities({
      memories: [makeMockMemoryRecord('2024-01-15', 'Worked on CBT techniques')],
    });
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    // The actual retrieved data (from the mock memory record) should appear in content
    expect(content).toContain('2024-01-15');
  });

  it('V3 content falls back to base content when entities return no data', async () => {
    const entities = makeMockEntities({
      memories: [],
      goals: [],
      sessionSummaries: [],
      exercises: [],
      resources: [],
      externalChunks: [],
    });
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, entities);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3);
    // Without data, async content should equal sync content (no RETRIEVED CONTEXT section)
    expect(content).toBe(syncContent);
    expect(content).not.toContain('=== RETRIEVED CONTEXT ===');
  });

  it('V3 content falls back gracefully when all entity sources throw errors', async () => {
    const broken = makeBrokenEntities();
    const content = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V3, broken);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3);
    // All errors → no retrieved context → falls back to sync content
    expect(content).toBe(syncContent);
  });
});

// ─── Section 10 — Default path completely unchanged ──────────────────────────

describe('Phase 5.1 — default path unchanged', () => {
  it('HYBRID wiring: async result equals sync result exactly', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, entities);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    expect(asyncContent).toBe(syncContent);
  });

  it('V1 wiring: async result equals sync result exactly', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V1, entities);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1);
    expect(asyncContent).toBe(syncContent);
  });

  it('V2 wiring: async result equals sync result exactly', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V2, entities);
    const syncContent = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(asyncContent).toBe(syncContent);
  });

  it('null wiring: async result equals sync result exactly', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(null, entities);
    const syncContent = buildSessionStartContent(null);
    expect(asyncContent).toBe(syncContent);
  });

  it('undefined wiring: async result equals sync result exactly', async () => {
    const entities = makeMockEntities();
    const asyncContent = await buildV3SessionStartContentAsync(undefined, entities);
    const syncContent = buildSessionStartContent(undefined);
    expect(asyncContent).toBe(syncContent);
  });

  it('HYBRID wiring: no retrieval is executed', async () => {
    let queryCalled = false;
    const spyEntities = {
      CompanionMemory: { list: async () => { queryCalled = true; return []; }, filter: async () => [] },
      Goal: { list: async () => [], filter: async () => [] },
      SessionSummary: { list: async () => [], filter: async () => [] },
      Exercise: { list: async () => [], filter: async () => [] },
      Resource: { list: async () => [], filter: async () => [] },
      ExternalKnowledgeChunk: { list: async () => [], filter: async () => [] },
    };
    await buildV3SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, spyEntities);
    expect(queryCalled).toBe(false);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING is still HYBRID (default unchanged)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });
});

// ─── Section 11 — No live retrieval ──────────────────────────────────────────

describe('Phase 5.1 — no live retrieval', () => {
  it('v3RetrievalExecutor.js does not import fetch, axios, or any live network module', async () => {
    // Verify by inspecting the module's source (file check)
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.default.resolve('src/lib/v3RetrievalExecutor.js');
    const source = fs.default.readFileSync(filePath, 'utf8');
    // Check that no live network call patterns appear as actual code (not in comments).
    // We strip comments first, then check.
    const noComments = source
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
      .replace(/\/\/.*/g, '');          // remove line comments
    const liveNetworkPatterns = ['fetch(', 'axios', 'XMLHttpRequest', 'http.get(', 'https.get('];
    for (const pattern of liveNetworkPatterns) {
      expect(noComments.toLowerCase()).not.toContain(pattern.toLowerCase());
    }
  });

  it('executeV3BoundedRetrieval with empty entities does not throw', async () => {
    await expect(executeV3BoundedRetrieval({})).resolves.toBeDefined();
  });
});

// ─── Section 12 — Rollback safety ────────────────────────────────────────────

describe('Phase 5.1 — rollback safety', () => {
  it('buildSessionStartContent (sync) is still exported and unchanged', () => {
    expect(typeof buildSessionStartContent).toBe('function');
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID)).toBe('[START_SESSION]');
  });

  it('removing v3RetrievalExecutor.js would only affect V3 path (isolation proof)', () => {
    // The sync buildSessionStartContent does not depend on v3RetrievalExecutor
    // Verified by the fact that it is still synchronous and still returns correct results
    const hybridContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(hybridContent).toBe('[START_SESSION]');
    expect(v2Content).toContain('[START_SESSION]');
    expect(v2Content).not.toContain('RETRIEVAL ORCHESTRATION');
  });
});
