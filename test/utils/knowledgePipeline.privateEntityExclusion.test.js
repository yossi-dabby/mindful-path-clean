/**
 * RETRIEVAL SAFETY — PRIVATE AND PROHIBITED ENTITY EXCLUSION
 *
 * Asserts that the knowledge retrieval pipeline never allows private user
 * entities or system-prohibited entity types into the effective allowed set,
 * and that mock retrieval results never surface these types even when they
 * are present in the raw mock pool.
 *
 * Prohibited / private entity types tested (full list per enforcement spec):
 *   ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory,
 *   UserDeletedConversations, Subscription, AppNotification, MindGameActivity
 *
 * Mirrors the pure filter/normalization approach used in
 * test/utils/knowledgePipeline.retrievalRegression.test.js — no live provider
 * calls, no real user data, all fixtures are synthetic shared-content examples.
 *
 * If ALLOWED_ENTITY_TYPES or the filter logic change in
 * functions/retrieveRelevantContent.ts, update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── CONSTANTS (mirrors functions/retrieveRelevantContent.ts) ─────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

// All entity types that must never appear in the retrieval pipeline output.
// Source: docs/ai-agent-access-policy.md and enforcement spec §E.
const PROHIBITED_PRIVATE_ENTITY_TYPES = [
  'ThoughtJournal',
  'Conversation',
  'CaseFormulation',
  'MoodEntry',
  'CompanionMemory',
  'UserDeletedConversations',
  'Subscription',
  'AppNotification',
  'MindGameActivity',
];

// ─── FILTER NORMALIZATION (mirrors functions/retrieveRelevantContent.ts) ───────
function normalizeFilters(entity_types, language = 'en', top_k = 5, min_score = 0.0) {
  const effective_entity_types =
    Array.isArray(entity_types) && entity_types.length > 0
      ? entity_types.filter((t) => ALLOWED_ENTITY_TYPES.includes(t))
      : [...ALLOWED_ENTITY_TYPES];
  const effective_language = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'].includes(language)
    ? language
    : 'en';
  const effective_top_k = Math.min(20, Math.max(1, top_k));
  return { entity_types: effective_entity_types, language: effective_language, top_k: effective_top_k, min_score };
}

// ─── MOCK RETRIEVAL FUNCTION ──────────────────────────────────────────────────
// Simulates the retrieval pipeline with pre-defined synthetic results.
// Applies the same filter logic as the production function.
function mockRetrieve(query, filters, mockResults) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query must be a non-empty string');
  }
  const filtered = (mockResults || []).filter(
    (r) =>
      r.score >= filters.min_score &&
      filters.entity_types.includes(r.entity_type) &&
      r.language === filters.language
  );
  return {
    results: filtered,
    total_results: filtered.length,
    query: query.trim(),
    filters_applied: filters,
  };
}

// ─── SYNTHETIC CHUNK FACTORY ──────────────────────────────────────────────────
function makeChunk(overrides = {}) {
  return {
    chunk_id: 'Exercise::ex-001::chunk_0',
    document_id: 'Exercise::ex-001',
    entity_type: 'Exercise',
    record_id: 'ex-001',
    title: 'Box Breathing',
    chunk_text: 'A breathing technique to reduce anxiety.',
    score: 0.85,
    chunk_index: 0,
    language: 'en',
    metadata: {},
    ...overrides,
  };
}

// ─── TESTS — Allow-list integrity ─────────────────────────────────────────────

describe('Allow-list integrity — prohibited types are absent', () => {
  it('ALLOWED_ENTITY_TYPES contains exactly the 4 approved shared-content types', () => {
    expect(ALLOWED_ENTITY_TYPES).toHaveLength(4);
    expect(ALLOWED_ENTITY_TYPES).toContain('Exercise');
    expect(ALLOWED_ENTITY_TYPES).toContain('Resource');
    expect(ALLOWED_ENTITY_TYPES).toContain('JournalTemplate');
    expect(ALLOWED_ENTITY_TYPES).toContain('Psychoeducation');
  });

  for (const prohibitedType of PROHIBITED_PRIVATE_ENTITY_TYPES) {
    it(`ALLOWED_ENTITY_TYPES does not contain "${prohibitedType}"`, () => {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(prohibitedType);
    });
  }
});

// ─── TESTS — normalizeFilters strips prohibited types ─────────────────────────

describe('normalizeFilters — prohibited entity types are stripped from client requests', () => {
  it('requesting each prohibited type individually produces an empty effective entity_types', () => {
    for (const prohibited of PROHIBITED_PRIVATE_ENTITY_TYPES) {
      const { entity_types } = normalizeFilters([prohibited], 'en', 5);
      expect(entity_types).toHaveLength(0);
    }
  });

  it('requesting all prohibited types at once produces an empty effective entity_types', () => {
    const { entity_types } = normalizeFilters(PROHIBITED_PRIVATE_ENTITY_TYPES, 'en', 5);
    expect(entity_types).toHaveLength(0);
  });

  it('mixing prohibited and allowed types strips prohibited ones and keeps allowed ones', () => {
    const mixed = ['ThoughtJournal', 'Exercise', 'CompanionMemory', 'Resource'];
    const { entity_types } = normalizeFilters(mixed, 'en', 5);
    expect(entity_types).not.toContain('ThoughtJournal');
    expect(entity_types).not.toContain('CompanionMemory');
    expect(entity_types).toContain('Exercise');
    expect(entity_types).toContain('Resource');
  });

  it('passing all prohibited types together produces an empty effective list after normalization', () => {
    const { entity_types } = normalizeFilters(PROHIBITED_PRIVATE_ENTITY_TYPES, 'en', 5);
    for (const p of PROHIBITED_PRIVATE_ENTITY_TYPES) {
      expect(entity_types).not.toContain(p);
    }
    expect(entity_types).toHaveLength(0);
  });

  it('empty entity_types request falls back to the full allowed list (not prohibited types)', () => {
    const { entity_types } = normalizeFilters([], 'en', 5);
    expect(entity_types).toEqual(ALLOWED_ENTITY_TYPES);
    for (const prohibited of PROHIBITED_PRIVATE_ENTITY_TYPES) {
      expect(entity_types).not.toContain(prohibited);
    }
  });

  it('null entity_types request falls back to the full allowed list (not prohibited types)', () => {
    const { entity_types } = normalizeFilters(null, 'en', 5);
    expect(entity_types).toEqual(ALLOWED_ENTITY_TYPES);
    for (const prohibited of PROHIBITED_PRIVATE_ENTITY_TYPES) {
      expect(entity_types).not.toContain(prohibited);
    }
  });
});

// ─── TESTS — mockRetrieve never returns prohibited entity types ───────────────

describe('mockRetrieve — results never include prohibited entity types', () => {
  // Build a mixed mock pool containing both safe and prohibited-type chunks.
  const mixedPool = [
    makeChunk({ entity_type: 'Exercise', score: 0.92, chunk_id: 'Exercise::ex-001::chunk_0' }),
    makeChunk({ entity_type: 'ThoughtJournal', score: 0.95, chunk_id: 'ThoughtJournal::tj-001::chunk_0', document_id: 'ThoughtJournal::tj-001', record_id: 'tj-001' }),
    makeChunk({ entity_type: 'Conversation', score: 0.88, chunk_id: 'Conversation::conv-001::chunk_0', document_id: 'Conversation::conv-001', record_id: 'conv-001' }),
    makeChunk({ entity_type: 'CaseFormulation', score: 0.90, chunk_id: 'CaseFormulation::cf-001::chunk_0', document_id: 'CaseFormulation::cf-001', record_id: 'cf-001' }),
    makeChunk({ entity_type: 'MoodEntry', score: 0.87, chunk_id: 'MoodEntry::me-001::chunk_0', document_id: 'MoodEntry::me-001', record_id: 'me-001' }),
    makeChunk({ entity_type: 'CompanionMemory', score: 0.91, chunk_id: 'CompanionMemory::cm-001::chunk_0', document_id: 'CompanionMemory::cm-001', record_id: 'cm-001' }),
    makeChunk({ entity_type: 'UserDeletedConversations', score: 0.80, chunk_id: 'UserDeletedConversations::udc-001::chunk_0', document_id: 'UserDeletedConversations::udc-001', record_id: 'udc-001' }),
    makeChunk({ entity_type: 'Subscription', score: 0.70, chunk_id: 'Subscription::sub-001::chunk_0', document_id: 'Subscription::sub-001', record_id: 'sub-001' }),
    makeChunk({ entity_type: 'AppNotification', score: 0.75, chunk_id: 'AppNotification::an-001::chunk_0', document_id: 'AppNotification::an-001', record_id: 'an-001' }),
    makeChunk({ entity_type: 'MindGameActivity', score: 0.82, chunk_id: 'MindGameActivity::mga-001::chunk_0', document_id: 'MindGameActivity::mga-001', record_id: 'mga-001' }),
    makeChunk({ entity_type: 'Resource', score: 0.88, chunk_id: 'Resource::res-001::chunk_0', document_id: 'Resource::res-001', record_id: 'res-001' }),
  ];

  it('returns no prohibited-type results when using the full allowed filter (default)', () => {
    const filters = normalizeFilters(undefined, 'en', 20, 0.0);
    const response = mockRetrieve('any query', filters, mixedPool);
    for (const result of response.results) {
      expect(PROHIBITED_PRIVATE_ENTITY_TYPES).not.toContain(result.entity_type);
    }
  });

  it('returned results are only from ALLOWED_ENTITY_TYPES', () => {
    const filters = normalizeFilters(undefined, 'en', 20, 0.0);
    const response = mockRetrieve('any query', filters, mixedPool);
    for (const result of response.results) {
      expect(ALLOWED_ENTITY_TYPES).toContain(result.entity_type);
    }
  });

  it('explicitly requesting all prohibited types returns empty results', () => {
    const filters = normalizeFilters(PROHIBITED_PRIVATE_ENTITY_TYPES, 'en', 20, 0.0);
    // All prohibited types are stripped, resulting in empty effective entity_types.
    expect(filters.entity_types).toHaveLength(0);
    const response = mockRetrieve('any query', filters, mixedPool);
    expect(response.results).toHaveLength(0);
  });

  for (const prohibited of PROHIBITED_PRIVATE_ENTITY_TYPES) {
    it(`requesting only "${prohibited}" produces no results even when pool contains it`, () => {
      const filters = normalizeFilters([prohibited], 'en', 5, 0.0);
      expect(filters.entity_types).not.toContain(prohibited);
      const response = mockRetrieve('user data query', filters, mixedPool);
      const hasProhibited = response.results.some((r) => r.entity_type === prohibited);
      expect(hasProhibited).toBe(false);
    });
  }
});

// ─── TESTS — Zero results when pool contains only prohibited types ─────────────

describe('mockRetrieve — returns empty results when pool contains only prohibited types', () => {
  const prohibitedOnlyPool = PROHIBITED_PRIVATE_ENTITY_TYPES.map((t, i) =>
    makeChunk({
      entity_type: t,
      score: 0.95,
      chunk_id: `${t}::rec-${i}::chunk_0`,
      document_id: `${t}::rec-${i}`,
      record_id: `rec-${i}`,
    })
  );

  it('returns empty results for a default (unrestricted) query against a prohibited-only pool', () => {
    const filters = normalizeFilters(undefined, 'en', 20, 0.0);
    const response = mockRetrieve('session notes query', filters, prohibitedOnlyPool);
    expect(response.results).toHaveLength(0);
    expect(response.total_results).toBe(0);
  });

  it('response is structurally valid even when all pool items are prohibited types', () => {
    const filters = normalizeFilters(undefined, 'en', 5, 0.0);
    const response = mockRetrieve('private data query', filters, prohibitedOnlyPool);
    expect(response).toHaveProperty('results');
    expect(response).toHaveProperty('total_results');
    expect(response).toHaveProperty('query');
    expect(response).toHaveProperty('filters_applied');
  });
});
