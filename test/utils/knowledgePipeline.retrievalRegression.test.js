/**
 * RETRIEVAL REGRESSION PACK
 *
 * Curated regression tests for the knowledge retrieval pipeline behavior.
 * Uses synthetic query categories and a mocked retrieval function — no live
 * provider calls are made.
 *
 * Query categories tested:
 *   1. Exercise relevance — queries that should retrieve Exercise entities
 *   2. Psychoeducation relevance — queries for educational content
 *   3. No-result noise queries — queries that match nothing in the index
 *   4. Crisis exclusion — private/medical entity types must not be retrievable
 *   5. Medical/diagnostic exclusion — disallowed entity types are filtered out
 *   6. Low-confidence score filtering — min_score threshold behavior
 *   7. Language filter behavior — results must match the requested language
 *
 * No real provider credentials are used.
 * No private user data (ThoughtJournal, MoodEntry, etc.) appears in any fixture.
 * All fixture data uses safe synthetic shared-content examples only.
 */

import { describe, it, expect } from 'vitest';

// ─── CONSTANTS (mirrors functions/retrieveRelevantContent.ts) ─────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

// ─── FILTER NORMALIZATION (mirrors functions/retrieveRelevantContent.ts) ───────
function normalizeFilters(entity_types, language, top_k, min_score = 0.0) {
  const effective_entity_types = Array.isArray(entity_types) && entity_types.length > 0
    ? entity_types.filter(t => ALLOWED_ENTITY_TYPES.includes(t))
    : [...ALLOWED_ENTITY_TYPES];
  const effective_language = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const effective_top_k = Math.min(MAX_TOP_K, Math.max(1, top_k || DEFAULT_TOP_K));
  return { entity_types: effective_entity_types, language: effective_language, top_k: effective_top_k, min_score };
}

// ─── MOCK RETRIEVAL FUNCTION ──────────────────────────────────────────────────
// Simulates the retrieval pipeline with pre-defined synthetic results.
// Applies the same filter logic as the production function without any I/O.
function mockRetrieve(query, filters, mockResults) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query must be a non-empty string');
  }
  const filtered = (mockResults || []).filter(r =>
    r.score >= filters.min_score &&
    filters.entity_types.includes(r.entity_type) &&
    r.language === filters.language
  );
  return {
    results: filtered,
    total_results: filtered.length,
    query: query.trim(),
    mode: 'live',
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
    slug: 'box-breathing',
    chunk_text: 'A breathing technique to reduce anxiety and calm the nervous system.',
    score: 0.88,
    chunk_index: 0,
    language: 'en',
    metadata: { category: 'breathing', difficulty: 'beginner' },
    ...overrides,
  };
}

// ─── REGRESSION FIXTURES ──────────────────────────────────────────────────────

// Category 1: Exercise results
const EXERCISE_RESULTS = [
  makeChunk({
    score: 0.92, chunk_id: 'Exercise::ex-001::chunk_0', record_id: 'ex-001',
    title: 'Box Breathing', entity_type: 'Exercise',
    chunk_text: 'Inhale for 4 counts, hold for 4, exhale for 4, hold for 4.',
  }),
  makeChunk({
    score: 0.85, chunk_id: 'Exercise::ex-002::chunk_0', document_id: 'Exercise::ex-002',
    record_id: 'ex-002', title: 'Progressive Muscle Relaxation', entity_type: 'Exercise',
    chunk_text: 'Systematically tense and release each muscle group to relieve physical tension.',
  }),
  makeChunk({
    score: 0.78, chunk_id: 'Exercise::ex-003::chunk_0', document_id: 'Exercise::ex-003',
    record_id: 'ex-003', title: '5-4-3-2-1 Grounding', entity_type: 'Exercise',
    chunk_text: 'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
  }),
];

// Category 2: Psychoeducation results
const PSYCHOEDUCATION_RESULTS = [
  makeChunk({
    score: 0.90, chunk_id: 'Psychoeducation::psy-001::chunk_0',
    document_id: 'Psychoeducation::psy-001', record_id: 'psy-001',
    title: 'What are Cognitive Distortions?', entity_type: 'Psychoeducation',
    chunk_text: 'Cognitive distortions are patterns of inaccurate or exaggerated thinking that can worsen mood.',
    metadata: { category: 'cognition' },
  }),
  makeChunk({
    score: 0.83, chunk_id: 'Psychoeducation::psy-002::chunk_0',
    document_id: 'Psychoeducation::psy-002', record_id: 'psy-002',
    title: 'Understanding Anxiety', entity_type: 'Psychoeducation',
    chunk_text: 'Anxiety is a normal human response to perceived threat, but it can become overwhelming.',
    metadata: { category: 'anxiety' },
  }),
];

// Category 3: No-result placeholder (empty index scenario)
const NO_RESULTS = [];

// Category 6: Low-confidence results
const LOW_CONFIDENCE_RESULTS = [
  makeChunk({ score: 0.95, chunk_id: 'Exercise::ex-001::chunk_0' }),
  makeChunk({ score: 0.72, chunk_id: 'Exercise::ex-002::chunk_0', document_id: 'Exercise::ex-002', record_id: 'ex-002' }),
  makeChunk({ score: 0.58, chunk_id: 'Exercise::ex-003::chunk_0', document_id: 'Exercise::ex-003', record_id: 'ex-003' }),
  makeChunk({ score: 0.41, chunk_id: 'Exercise::ex-004::chunk_0', document_id: 'Exercise::ex-004', record_id: 'ex-004' }),
  makeChunk({ score: 0.22, chunk_id: 'Exercise::ex-005::chunk_0', document_id: 'Exercise::ex-005', record_id: 'ex-005' }),
];

// Category 7: Multi-language results
const MULTI_LANG_RESULTS = [
  makeChunk({ score: 0.90, language: 'en', chunk_id: 'Exercise::ex-001::chunk_0' }),
  makeChunk({ score: 0.88, language: 'he', chunk_id: 'Exercise::ex-002::chunk_0', document_id: 'Exercise::ex-002', record_id: 'ex-002' }),
  makeChunk({ score: 0.85, language: 'es', chunk_id: 'Exercise::ex-003::chunk_0', document_id: 'Exercise::ex-003', record_id: 'ex-003' }),
  makeChunk({ score: 0.82, language: 'fr', chunk_id: 'Exercise::ex-004::chunk_0', document_id: 'Exercise::ex-004', record_id: 'ex-004' }),
  makeChunk({ score: 0.79, language: 'de', chunk_id: 'Exercise::ex-005::chunk_0', document_id: 'Exercise::ex-005', record_id: 'ex-005' }),
];

// ─── TESTS — Category 1: Exercise relevance ───────────────────────────────────

describe('Query Category 1: Exercise relevance', () => {
  const filters = normalizeFilters(['Exercise'], 'en', 5, 0.5);

  it('retrieves exercise results for a breathing query', () => {
    const response = mockRetrieve('breathing exercises for anxiety', filters, EXERCISE_RESULTS);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every(r => r.entity_type === 'Exercise')).toBe(true);
  });

  it('all returned results are above min_score', () => {
    const response = mockRetrieve('breathing exercises for anxiety', filters, EXERCISE_RESULTS);
    expect(response.results.every(r => r.score >= 0.5)).toBe(true);
  });

  it('results contain all required retrieval fields', () => {
    const response = mockRetrieve('breathing exercises for anxiety', filters, EXERCISE_RESULTS);
    for (const r of response.results) {
      expect(r).toHaveProperty('chunk_id');
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('chunk_text');
      expect(r).toHaveProperty('score');
      expect(r).toHaveProperty('language');
      expect(r).toHaveProperty('entity_type');
      expect(r).toHaveProperty('metadata');
    }
  });

  it('results pre-sorted by descending score remain in order', () => {
    const sorted = [...EXERCISE_RESULTS].sort((a, b) => b.score - a.score);
    const response = mockRetrieve('breathing exercises', filters, sorted);
    for (let i = 1; i < response.results.length; i++) {
      expect(response.results[i].score).toBeLessThanOrEqual(response.results[i - 1].score);
    }
  });

  it('response includes query and mode fields', () => {
    const response = mockRetrieve('breathing exercises', filters, EXERCISE_RESULTS);
    expect(response.query).toBe('breathing exercises');
    expect(response.mode).toBe('live');
  });
});

// ─── TESTS — Category 2: Psychoeducation relevance ───────────────────────────

describe('Query Category 2: Psychoeducation relevance', () => {
  const filters = normalizeFilters(['Psychoeducation'], 'en', 5, 0.5);

  it('retrieves psychoeducation content for a cognitive distortions query', () => {
    const response = mockRetrieve('what are cognitive distortions', filters, PSYCHOEDUCATION_RESULTS);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every(r => r.entity_type === 'Psychoeducation')).toBe(true);
  });

  it('does not return Exercise results when filtered to Psychoeducation only', () => {
    const combined = [...EXERCISE_RESULTS, ...PSYCHOEDUCATION_RESULTS];
    const response = mockRetrieve('cognitive distortions', filters, combined);
    expect(response.results.every(r => r.entity_type === 'Psychoeducation')).toBe(true);
    expect(response.results.some(r => r.entity_type === 'Exercise')).toBe(false);
  });

  it('results include relevant chunk_text content', () => {
    const response = mockRetrieve('cognitive distortions and anxiety', filters, PSYCHOEDUCATION_RESULTS);
    expect(response.results.length).toBeGreaterThan(0);
    response.results.forEach(r => {
      expect(typeof r.chunk_text).toBe('string');
      expect(r.chunk_text.length).toBeGreaterThan(0);
    });
  });
});

// ─── TESTS — Category 3: No-result noise queries ──────────────────────────────

describe('Query Category 3: No-result noise queries', () => {
  const filters = normalizeFilters(undefined, 'en', 5, 0.7);

  it('returns empty results for a query with no matching records', () => {
    const response = mockRetrieve('asdfjklqwerzxcvbnm', filters, NO_RESULTS);
    expect(response.results).toHaveLength(0);
    expect(response.total_results).toBe(0);
  });

  it('response is structurally valid even when no results are found', () => {
    const response = mockRetrieve('completely unrelated gibberish query', filters, NO_RESULTS);
    expect(response).toHaveProperty('results');
    expect(response).toHaveProperty('total_results');
    expect(response).toHaveProperty('query');
    expect(response).toHaveProperty('mode');
    expect(response).toHaveProperty('filters_applied');
  });

  it('high min_score filters out low-scoring results producing an empty set', () => {
    const lowScoreResults = [
      makeChunk({ score: 0.30, chunk_id: 'Exercise::ex-001::chunk_0' }),
      makeChunk({ score: 0.45, chunk_id: 'Exercise::ex-002::chunk_0', document_id: 'Exercise::ex-002', record_id: 'ex-002' }),
    ];
    const highScoreFilter = normalizeFilters(undefined, 'en', 5, 0.7);
    const response = mockRetrieve('breathing', highScoreFilter, lowScoreResults);
    expect(response.results).toHaveLength(0);
  });
});

// ─── TESTS — Category 4: Crisis exclusion ────────────────────────────────────

describe('Query Category 4: Crisis exclusion — no crisis or medical entities indexed', () => {
  // The knowledge index only contains 4 approved shared content entity types.
  // Crisis protocols, medication guides, hotline numbers, and clinical
  // emergency procedures are NOT in the allow-list and cannot be retrieved.

  it('crisis-related entity types are not in the allowed list', () => {
    const crisisTypes = ['CrisisProtocol', 'EmergencyContact', 'HotlineRecord'];
    for (const t of crisisTypes) {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(t);
    }
  });

  it('private user entities are not in the allowed list', () => {
    const privateTypes = ['ThoughtJournal', 'MoodEntry', 'Conversation', 'CompanionMemory'];
    for (const t of privateTypes) {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(t);
    }
  });

  it('a crisis-keyword query against an empty index returns no results', () => {
    const filters = normalizeFilters(undefined, 'en', 5, 0.0);
    const response = mockRetrieve('suicide prevention hotline number', filters, NO_RESULTS);
    expect(response.results).toHaveLength(0);
  });

  it('entity_type filter strips any non-approved types from the client request', () => {
    const requestedTypes = ['CrisisProtocol', 'MedicalRecord', 'Exercise'];
    const { entity_types } = normalizeFilters(requestedTypes, 'en', 5);
    expect(entity_types).toEqual(['Exercise']);
    expect(entity_types).not.toContain('CrisisProtocol');
    expect(entity_types).not.toContain('MedicalRecord');
  });

  it('all-private entity request produces an empty effective entity_types list', () => {
    const { entity_types } = normalizeFilters(['ThoughtJournal', 'CaseFormulation'], 'en', 5);
    expect(entity_types).toHaveLength(0);
  });
});

// ─── TESTS — Category 5: Medical/diagnostic exclusion ────────────────────────

describe('Query Category 5: Medical and diagnostic entity exclusion', () => {
  it('medical entity types are excluded from the allow-list', () => {
    const medicalTypes = ['DiagnosticCriteria', 'Medication', 'ClinicalProtocol', 'DSMCriteria'];
    for (const t of medicalTypes) {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(t);
    }
  });

  it('diagnostic entity types requested by a client are silently filtered to empty', () => {
    const { entity_types } = normalizeFilters(['DiagnosticCriteria', 'Medication'], 'en', 5);
    expect(entity_types).toHaveLength(0);
  });

  it('a diagnostic query against an empty index returns no results', () => {
    const filters = normalizeFilters(undefined, 'en', 5, 0.0);
    const response = mockRetrieve('DSM-5 diagnostic criteria for major depression', filters, NO_RESULTS);
    expect(response.results).toHaveLength(0);
  });
});

// ─── TESTS — Category 6: Low-confidence score filtering ───────────────────────

describe('Query Category 6: Low-confidence score filtering', () => {
  it('min_score=0.0 returns all results', () => {
    const filters = normalizeFilters(undefined, 'en', 10, 0.0);
    const response = mockRetrieve('anxiety techniques', filters, LOW_CONFIDENCE_RESULTS);
    expect(response.results).toHaveLength(LOW_CONFIDENCE_RESULTS.length);
  });

  it('min_score=0.5 filters out results below threshold', () => {
    const filters = normalizeFilters(undefined, 'en', 10, 0.5);
    const response = mockRetrieve('anxiety techniques', filters, LOW_CONFIDENCE_RESULTS);
    expect(response.results.every(r => r.score >= 0.5)).toBe(true);
    expect(response.results).toHaveLength(3); // 0.95, 0.72, 0.58
  });

  it('min_score=0.9 returns only high-confidence results', () => {
    const filters = normalizeFilters(undefined, 'en', 10, 0.9);
    const response = mockRetrieve('anxiety techniques', filters, LOW_CONFIDENCE_RESULTS);
    expect(response.results.every(r => r.score >= 0.9)).toBe(true);
    expect(response.results).toHaveLength(1); // only 0.95
  });

  it('min_score=1.0 returns no results when no perfect-score matches exist', () => {
    const filters = normalizeFilters(undefined, 'en', 10, 1.0);
    const response = mockRetrieve('anxiety techniques', filters, LOW_CONFIDENCE_RESULTS);
    expect(response.results).toHaveLength(0);
  });

  it('filtered result count equals total_results', () => {
    const filters = normalizeFilters(undefined, 'en', 10, 0.5);
    const response = mockRetrieve('anxiety techniques', filters, LOW_CONFIDENCE_RESULTS);
    expect(response.results.length).toBe(response.total_results);
  });
});

// ─── TESTS — Category 7: Language filter behavior ─────────────────────────────

describe('Query Category 7: Language filter behavior', () => {
  it('language filter returns only matching language results', () => {
    const filters = normalizeFilters(undefined, 'he', 5, 0.0);
    const response = mockRetrieve('תרגיל נשימה', filters, MULTI_LANG_RESULTS);
    expect(response.results.every(r => r.language === 'he')).toBe(true);
    expect(response.results).toHaveLength(1);
  });

  it('unsupported language code falls back to "en" and returns English results', () => {
    const filters = normalizeFilters(undefined, 'xx', 5, 0.0);
    expect(filters.language).toBe('en');
    const response = mockRetrieve('breathing', filters, MULTI_LANG_RESULTS);
    expect(response.results.every(r => r.language === 'en')).toBe(true);
  });

  it('each supported language returns only its own results', () => {
    const langResultCounts = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const filters = normalizeFilters(undefined, lang, 5, 0.0);
      const response = mockRetrieve('breathing', filters, MULTI_LANG_RESULTS);
      langResultCounts[lang] = response.results.length;
      expect(response.results.every(r => r.language === lang)).toBe(true);
    }
    // Each language that has fixtures returns exactly 1 result
    expect(langResultCounts['en']).toBe(1);
    expect(langResultCounts['he']).toBe(1);
    expect(langResultCounts['es']).toBe(1);
    expect(langResultCounts['fr']).toBe(1);
  });

  it('all 7 supported languages are normalized correctly', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const filters = normalizeFilters(undefined, lang, 5, 0.0);
      expect(filters.language).toBe(lang);
    }
  });
});
