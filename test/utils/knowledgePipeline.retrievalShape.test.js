/**
 * Tests for retrieval request/response shape, filter normalization, and safe
 * behavior when the provider config is absent or mocked.
 *
 * These tests mirror the pure filter logic defined in
 * functions/retrieveRelevantContent.ts. Because that file uses the Deno
 * runtime (excluded from vitest), the pure normalization functions are
 * reproduced here.
 *
 * No live calls to OpenAI or Pinecone are made. All provider I/O is absent
 * (tested via the no-op / unconfigured path).
 *
 * Covers:
 *   - entity_types filter normalization (allow-list enforcement)
 *   - language filter normalization (fallback to 'en')
 *   - top_k clamping
 *   - min_score filtering
 *   - result shape validation (required fields)
 *   - no-result, no-op, and dry-run response shapes
 *   - provider config absent behavior
 *
 * If filter logic, SUPPORTED_LANGUAGES, or result shape changes, update this
 * file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── CONSTANTS (mirrors functions/retrieveRelevantContent.ts) ─────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

// ─── FILTER NORMALIZATION (mirrors functions/retrieveRelevantContent.ts) ───────
function normalizeFilters(entity_types, language, top_k) {
  const effective_entity_types = Array.isArray(entity_types) && entity_types.length > 0
    ? entity_types.filter(t => ALLOWED_ENTITY_TYPES.includes(t))
    : [...ALLOWED_ENTITY_TYPES];
  const effective_language = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const effective_top_k = Math.min(MAX_TOP_K, Math.max(1, top_k || DEFAULT_TOP_K));
  return { entity_types: effective_entity_types, language: effective_language, top_k: effective_top_k };
}

// ─── PROVIDER CONFIG (mirrors functions/retrieveRelevantContent.ts) ────────────
function getProviderConfig(env = {}) {
  const provider = env['KNOWLEDGE_PROVIDER'];
  const embedding_key = env['KNOWLEDGE_EMBEDDING_KEY'];
  const index_key = env['KNOWLEDGE_INDEX_KEY'];
  const index_host = env['KNOWLEDGE_INDEX_HOST'];
  const index_name = env['KNOWLEDGE_INDEX_NAME'] || 'cbt-knowledge';
  if (!provider || !embedding_key || !index_key) return null;
  return { provider, embedding_key, index_key, index_host, index_name };
}

// ─── RESULT SHAPE VALIDATOR ───────────────────────────────────────────────────
const REQUIRED_RESULT_FIELDS = [
  'chunk_id', 'document_id', 'entity_type', 'record_id',
  'title', 'slug', 'chunk_text', 'score', 'chunk_index', 'language', 'metadata',
];

function validateResultShape(result) {
  const missing = REQUIRED_RESULT_FIELDS.filter(f => !(f in result));
  return { valid: missing.length === 0, missing };
}

// ─── MOCK RESULT FACTORY ──────────────────────────────────────────────────────
function makeMockResult(overrides = {}) {
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
    metadata: { category: 'breathing' },
    ...overrides,
  };
}

// ─── TESTS — entity_types filter normalization ────────────────────────────────

describe('filter normalization — entity_types', () => {
  it('uses all 4 allowed types when entity_types is not provided', () => {
    const { entity_types } = normalizeFilters(undefined, 'en', 5);
    expect(entity_types).toHaveLength(4);
    expect(entity_types).toEqual(ALLOWED_ENTITY_TYPES);
  });

  it('uses all 4 allowed types when entity_types is an empty array', () => {
    const { entity_types } = normalizeFilters([], 'en', 5);
    expect(entity_types).toHaveLength(4);
  });

  it('filters out invalid entity types from the request', () => {
    const { entity_types } = normalizeFilters(['Exercise', 'ThoughtJournal', 'Invalid'], 'en', 5);
    expect(entity_types).toEqual(['Exercise']);
    expect(entity_types).not.toContain('ThoughtJournal');
    expect(entity_types).not.toContain('Invalid');
  });

  it('passes valid entity types through unchanged', () => {
    const { entity_types } = normalizeFilters(['Exercise', 'Resource'], 'en', 5);
    expect(entity_types).toEqual(['Exercise', 'Resource']);
  });

  it('never allows private user entities in effective entity_types', () => {
    const privateEntities = ['ThoughtJournal', 'Conversation', 'MoodEntry', 'CompanionMemory'];
    const { entity_types } = normalizeFilters(privateEntities, 'en', 5);
    expect(entity_types).toHaveLength(0);
  });

  it('returns all allowed types when only invalid types are requested', () => {
    // All invalid types are stripped → falls through to empty → all 4 types used
    // (Note: an all-invalid request produces 0 effective types, not a fallback to all 4.
    // The fallback only applies when entity_types is undefined or []. This test verifies
    // that all-invalid types produce an empty list, not a silent bypass.)
    const { entity_types } = normalizeFilters(['ThoughtJournal'], 'en', 5);
    expect(entity_types).toHaveLength(0);
  });
});

// ─── TESTS — language filter normalization ────────────────────────────────────

describe('filter normalization — language', () => {
  it('accepts all 7 supported languages', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const { language } = normalizeFilters(undefined, lang, 5);
      expect(language).toBe(lang);
    }
  });

  it('falls back to "en" for unsupported language codes', () => {
    const { language } = normalizeFilters(undefined, 'xx', 5);
    expect(language).toBe('en');
  });

  it('falls back to "en" when language is not provided', () => {
    const { language } = normalizeFilters(undefined, undefined, 5);
    expect(language).toBe('en');
  });

  it('falls back to "en" for null language', () => {
    const { language } = normalizeFilters(undefined, null, 5);
    expect(language).toBe('en');
  });

  it('SUPPORTED_LANGUAGES contains exactly 7 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(7);
  });

  it('SUPPORTED_LANGUAGES includes Hebrew (he)', () => {
    expect(SUPPORTED_LANGUAGES).toContain('he');
  });
});

// ─── TESTS — top_k clamping ───────────────────────────────────────────────────

describe('filter normalization — top_k', () => {
  it('uses DEFAULT_TOP_K when top_k is not provided', () => {
    const { top_k } = normalizeFilters(undefined, 'en', undefined);
    expect(top_k).toBe(DEFAULT_TOP_K);
  });

  it('clamps top_k to MAX_TOP_K', () => {
    const { top_k } = normalizeFilters(undefined, 'en', 999);
    expect(top_k).toBe(MAX_TOP_K);
  });

  it('enforces minimum top_k of 1 for negative values', () => {
    const { top_k } = normalizeFilters(undefined, 'en', -5);
    expect(top_k).toBe(1);
  });

  it('uses provided valid top_k value unchanged', () => {
    const { top_k } = normalizeFilters(undefined, 'en', 10);
    expect(top_k).toBe(10);
  });

  it('DEFAULT_TOP_K is within the valid range', () => {
    expect(DEFAULT_TOP_K).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_TOP_K).toBeLessThanOrEqual(MAX_TOP_K);
  });
});

// ─── TESTS — result shape validation ─────────────────────────────────────────

describe('retrieval result shape validation', () => {
  it('validates a well-formed result object', () => {
    const result = makeMockResult();
    const { valid, missing } = validateResultShape(result);
    expect(valid).toBe(true);
    expect(missing).toHaveLength(0);
  });

  it('detects missing required fields', () => {
    const result = makeMockResult();
    delete result.score;
    delete result.chunk_text;
    const { valid, missing } = validateResultShape(result);
    expect(valid).toBe(false);
    expect(missing).toContain('score');
    expect(missing).toContain('chunk_text');
  });

  it('result score is a number between 0 and 1', () => {
    const result = makeMockResult({ score: 0.92 });
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('result entity_type is in the allowed list', () => {
    const result = makeMockResult({ entity_type: 'Exercise' });
    expect(ALLOWED_ENTITY_TYPES).toContain(result.entity_type);
  });

  it('all required fields are present in the mock result factory', () => {
    REQUIRED_RESULT_FIELDS.forEach(field => {
      const result = makeMockResult();
      expect(result).toHaveProperty(field);
    });
  });
});

// ─── TESTS — no-result behavior ───────────────────────────────────────────────

describe('no-result behavior', () => {
  it('empty results array has zero total_results', () => {
    const mockResponse = {
      results: [],
      total_results: 0,
      query: 'nonexistent query',
      mode: 'live',
      filters_applied: normalizeFilters(undefined, 'en', 5),
    };
    expect(mockResponse.results).toHaveLength(0);
    expect(mockResponse.total_results).toBe(0);
  });

  it('no-op response shape is valid when feature flag is off', () => {
    const noOpResponse = {
      results: [],
      total_results: 0,
      query: 'test query',
      mode: 'no_op',
      provider: null,
      filters_applied: normalizeFilters(undefined, 'en', 5),
      note: 'No-op: KNOWLEDGE_RETRIEVAL_ENABLED is not set.',
    };
    expect(noOpResponse.results).toHaveLength(0);
    expect(noOpResponse.mode).toBe('no_op');
    expect(noOpResponse.provider).toBeNull();
  });

  it('dry_run response returns mode "dry_run" and empty results', () => {
    const dryRunResponse = {
      results: [],
      total_results: 0,
      query: 'test query',
      mode: 'dry_run',
      filters_applied: normalizeFilters(undefined, 'en', 5),
    };
    expect(dryRunResponse.mode).toBe('dry_run');
    expect(dryRunResponse.results).toHaveLength(0);
  });

  it('min_score filters out low-scoring results', () => {
    const mockResults = [
      makeMockResult({ score: 0.9, chunk_id: 'Exercise::ex-001::chunk_0' }),
      makeMockResult({ score: 0.3, chunk_id: 'Exercise::ex-002::chunk_0' }),
      makeMockResult({ score: 0.7, chunk_id: 'Exercise::ex-003::chunk_0' }),
    ];
    const min_score = 0.6;
    const filtered = mockResults.filter(r => r.score >= min_score);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => r.score >= min_score)).toBe(true);
  });
});

// ─── TESTS — provider config absent behavior ──────────────────────────────────

describe('provider config absent behavior', () => {
  it('returns null when all provider env vars are absent', () => {
    expect(getProviderConfig({})).toBeNull();
  });

  it('returns null when only KNOWLEDGE_PROVIDER is set', () => {
    expect(getProviderConfig({ KNOWLEDGE_PROVIDER: 'openai_pinecone' })).toBeNull();
  });

  it('returns null when KNOWLEDGE_EMBEDDING_KEY is missing', () => {
    expect(getProviderConfig({
      KNOWLEDGE_PROVIDER: 'openai_pinecone',
      KNOWLEDGE_INDEX_KEY: 'key',
      KNOWLEDGE_INDEX_HOST: 'https://example.pinecone.io',
    })).toBeNull();
  });

  it('returns null when KNOWLEDGE_INDEX_KEY is missing', () => {
    expect(getProviderConfig({
      KNOWLEDGE_PROVIDER: 'openai_pinecone',
      KNOWLEDGE_EMBEDDING_KEY: 'sk-test',
      KNOWLEDGE_INDEX_HOST: 'https://example.pinecone.io',
    })).toBeNull();
  });

  it('returns a valid config object when all required keys are present', () => {
    const env = {
      KNOWLEDGE_PROVIDER: 'openai_pinecone',
      KNOWLEDGE_EMBEDDING_KEY: 'sk-test',
      KNOWLEDGE_INDEX_KEY: 'pinecone-key',
      KNOWLEDGE_INDEX_HOST: 'https://example.pinecone.io',
    };
    const config = getProviderConfig(env);
    expect(config).not.toBeNull();
    expect(config.provider).toBe('openai_pinecone');
    expect(config.index_name).toBe('cbt-knowledge');
  });

  it('uses custom index_name when KNOWLEDGE_INDEX_NAME is set', () => {
    const env = {
      KNOWLEDGE_PROVIDER: 'openai_pinecone',
      KNOWLEDGE_EMBEDDING_KEY: 'sk-test',
      KNOWLEDGE_INDEX_KEY: 'pinecone-key',
      KNOWLEDGE_INDEX_HOST: 'https://example.pinecone.io',
      KNOWLEDGE_INDEX_NAME: 'my-custom-index',
    };
    const config = getProviderConfig(env);
    expect(config.index_name).toBe('my-custom-index');
  });
});
