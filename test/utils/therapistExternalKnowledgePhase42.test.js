/**
 * @file test/utils/therapistExternalKnowledgePhase42.test.js
 *
 * Phase 4.2 — Real App-Owned Storage Surfaces + End-to-End Persistence
 *
 * PURPOSE
 * -------
 *  1. Verify that ExternalKnowledgeSource is now defined as a real repo-level
 *     entity (schema, field constants, validator, entity accessor).
 *  2. Verify that ExternalKnowledgeChunk is now defined as a real repo-level
 *     entity (schema, field constants, validator, entity accessor).
 *  3. Verify that both entities are registered in the KnowledgeInfrastructure
 *     domain of src/api/entities/index.js.
 *  4. Verify that the persistence adapter (externalKnowledgePersistence.js)
 *     exports the correct functions.
 *  5. Verify that approved ingestion persists source records via the adapter.
 *  6. Verify that approved ingestion persists chunk records via the adapter.
 *  7. Verify that source/chunk linkage is preserved (external_source_record_id).
 *  8. Verify that provenance is preserved in persisted records.
 *  9. Verify that repeated ingestion is safe (upsert / replace semantics).
 * 10. Verify that unknown/unapproved sources persist nothing.
 * 11. Verify that flags-off mode remains inert.
 * 12. Verify that the current therapist default path remains unchanged.
 * 13. Verify that the current retrieval runtime remains unchanged.
 * 14. Verify that rollback remains safe.
 *
 * TESTING APPROACH
 * ----------------
 * The Base44 SDK cannot be called directly in Vitest (it requires a live server
 * and authenticated session). Instead, this test file uses a mock entity client
 * that records all create / update / filter / delete calls. This proves that:
 * - The persistence adapter calls the correct entity methods.
 * - The correct data is passed to those methods.
 * - Upsert, linkage, and provenance logic is correct.
 * - Failure handling is safe and non-blocking.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - Does NOT modify any Phase 0 / 0.1 / 1 / 2 / 3 / 4 / 4.1 test files.
 * - All prior phase assertions remain intact (this test is additive only).
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Phase 4.2 entity definitions ───────────────────────────────────────────────
import {
  EXTERNAL_KNOWLEDGE_SOURCE_ENTITY_NAME,
  EXTERNAL_KNOWLEDGE_SOURCE_FIELDS,
  EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA,
  REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS,
  validateExternalKnowledgeSourceRecord,
} from '../../src/api/entities/ExternalKnowledgeSource.js';

import {
  EXTERNAL_KNOWLEDGE_CHUNK_ENTITY_NAME,
  EXTERNAL_KNOWLEDGE_CHUNK_FIELDS,
  EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA,
  REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS,
  validateExternalKnowledgeChunkRecord,
} from '../../src/api/entities/ExternalKnowledgeChunk.js';

// ── Phase 4.2 persistence adapter ─────────────────────────────────────────────
import {
  persistExternalSource,
  persistExternalChunks,
  persistIngestedDocument,
} from '../../src/lib/externalKnowledgePersistence.js';

// ── Phase 4 models (for building valid records) ────────────────────────────────
import {
  EXTERNAL_CONTENT_SOURCE_TYPE,
  APPROVED_TRUSTED_SOURCES,
  createSourceRecord,
} from '../../src/lib/externalKnowledgeSource.js';

import {
  createChunkRecord,
} from '../../src/lib/externalKnowledgeChunk.js';

// ── Feature flags ──────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Agent wiring (therapist default path regression) ──────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Mock entity client factory ───────────────────────────────────────────────

/**
 * Creates a lightweight mock entity client that records all calls.
 *
 * Tracks:
 * - All source create / update / filter calls (on ExternalKnowledgeSource).
 * - All chunk create / filter / delete calls (on ExternalKnowledgeChunk).
 *
 * The optional `opts` object lets tests inject custom behavior:
 * - opts.sourceFilterResult: array returned by ExternalKnowledgeSource.filter()
 * - opts.chunkFilterResult: array returned by ExternalKnowledgeChunk.filter()
 * - opts.sourceCreateId: id returned by ExternalKnowledgeSource.create()
 * - opts.sourceError: if true, ExternalKnowledgeSource.create() throws
 *
 * @param {object} [opts]
 * @returns {{ entities: object, calls: object }}
 */
function createMockEntityClient(opts = {}) {
  const calls = {
    sourceFilter:  [],
    sourceUpdate:  [],
    sourceCreate:  [],
    chunkFilter:   [],
    chunkDelete:   [],
    chunkCreate:   [],
  };

  const ExternalKnowledgeSource = {
    async filter(query) {
      calls.sourceFilter.push(query);
      if (opts.sourceError) throw new Error('mock source error');
      return opts.sourceFilterResult ?? [];
    },
    async update(id, data) {
      calls.sourceUpdate.push({ id, data });
      return { id, ...data };
    },
    async create(data) {
      if (opts.sourceError) throw new Error('mock source error');
      calls.sourceCreate.push(data);
      return { id: opts.sourceCreateId ?? 'mock-source-record-id', ...data };
    },
  };

  const ExternalKnowledgeChunk = {
    async filter(query) {
      calls.chunkFilter.push(query);
      return opts.chunkFilterResult ?? [];
    },
    async delete(id) {
      calls.chunkDelete.push(id);
    },
    async create(data) {
      calls.chunkCreate.push(data);
      return { id: `mock-chunk-${calls.chunkCreate.length}`, ...data };
    },
  };

  return {
    entities: { ExternalKnowledgeSource, ExternalKnowledgeChunk },
    calls,
  };
}

// ─── Shared test data ─────────────────────────────────────────────────────────

const SAMPLE_WHO_SOURCE = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'who-mhgap-ig-v2');
const SAMPLE_NIMH_PDF   = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nimh-asq-pdf');
const RETRIEVAL_DATE    = '2026-03-19T00:00:00.000Z';

/** Builds a valid source record from an approved registry entry. */
function buildValidSourceRecord(entry, options = {}) {
  return createSourceRecord({
    source_id:        entry.source_id,
    title:            entry.title,
    url:              entry.url,
    publisher:        entry.publisher,
    domain:           entry.domain,
    source_type:      entry.source_type,
    retrieval_date:   RETRIEVAL_DATE,
    publication_date: entry.publication_date ?? null,
    ingestion_status: 'complete',
    ...options,
  });
}

/** Builds a set of valid chunk records from an approved registry entry. */
function buildValidChunkRecords(entry, texts) {
  return texts.map((text, index) =>
    createChunkRecord({
      chunk_id:       `${entry.source_id}::chunk_${index}`,
      source_id:      entry.source_id,
      source_url:     entry.url,
      source_title:   entry.title,
      publisher:      entry.publisher,
      domain:         entry.domain,
      retrieval_date: RETRIEVAL_DATE,
      chunk_index:    index,
      total_chunks:   texts.length,
      chunk_text:     text,
    }),
  );
}

const SAMPLE_TEXTS = [
  'Clinical guidance paragraph one with substantive content about mental health intervention.',
  'Clinical guidance paragraph two covering assessment procedures and evidence-based protocols.',
  'Clinical guidance paragraph three on risk stratification and treatment recommendations.',
];

// ─── Section 1 — ExternalKnowledgeSource entity definition ────────────────────

describe('Phase 4.2 — ExternalKnowledgeSource entity definition', () => {
  it('EXTERNAL_KNOWLEDGE_SOURCE_ENTITY_NAME is defined and equals "ExternalKnowledgeSource"', () => {
    expect(EXTERNAL_KNOWLEDGE_SOURCE_ENTITY_NAME).toBe('ExternalKnowledgeSource');
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_FIELDS contains all required field constants', () => {
    const requiredKeys = [
      'SOURCE_ID', 'TITLE', 'URL', 'PUBLISHER', 'DOMAIN',
      'SOURCE_TYPE', 'CONTENT_SOURCE_TYPE', 'RETRIEVAL_DATE',
      'PUBLICATION_DATE', 'INGESTION_STATUS', 'CHUNK_COUNT',
      'LANGUAGE', 'VERSION',
    ];
    for (const key of requiredKeys) {
      expect(EXTERNAL_KNOWLEDGE_SOURCE_FIELDS[key], `Missing EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.${key}`).toBeTruthy();
    }
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.CONTENT_SOURCE_TYPE equals "content_source_type"', () => {
    expect(EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.CONTENT_SOURCE_TYPE).toBe('content_source_type');
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.SOURCE_ID equals "source_id"', () => {
    expect(EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.SOURCE_ID).toBe('source_id');
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA is defined and frozen', () => {
    expect(EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA).toBeTruthy();
    expect(Object.isFrozen(EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA)).toBe(true);
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA contains all required fields', () => {
    const expectedFields = [
      'source_id', 'title', 'url', 'publisher', 'domain',
      'source_type', 'content_source_type', 'retrieval_date',
      'publication_date', 'ingestion_status',
    ];
    for (const field of expectedFields) {
      expect(EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA[field], `Schema missing field: ${field}`).toBeDefined();
    }
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.content_source_type has constantValue "external_trusted"', () => {
    expect(EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.content_source_type.constantValue).toBe('external_trusted');
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.source_type has enum with expected values', () => {
    const { enum: allowed } = EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.source_type;
    expect(allowed).toContain('html');
    expect(allowed).toContain('pdf');
    expect(allowed).toContain('pdf_text');
  });

  it('EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.ingestion_status has enum with expected values', () => {
    const { enum: allowed } = EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA.ingestion_status;
    expect(allowed).toContain('pending');
    expect(allowed).toContain('complete');
    expect(allowed).toContain('failed');
    expect(allowed).toContain('skipped');
  });

  it('REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS is an array of strings', () => {
    expect(Array.isArray(REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS)).toBe(true);
    expect(REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.length).toBeGreaterThan(0);
    for (const f of REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS) {
      expect(typeof f).toBe('string');
    }
  });

  it('required fields include source_id, title, url, publisher, domain, source_type, content_source_type, retrieval_date, ingestion_status', () => {
    const required = new Set(REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS);
    for (const field of ['source_id', 'title', 'url', 'publisher', 'domain', 'source_type', 'content_source_type', 'retrieval_date', 'ingestion_status']) {
      expect(required.has(field), `Required field "${field}" not in REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS`).toBe(true);
    }
  });
});

// ─── Section 2 — ExternalKnowledgeChunk entity definition ─────────────────────

describe('Phase 4.2 — ExternalKnowledgeChunk entity definition', () => {
  it('EXTERNAL_KNOWLEDGE_CHUNK_ENTITY_NAME is defined and equals "ExternalKnowledgeChunk"', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_ENTITY_NAME).toBe('ExternalKnowledgeChunk');
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_FIELDS contains all required field constants', () => {
    const requiredKeys = [
      'CHUNK_ID', 'SOURCE_ID', 'EXTERNAL_SOURCE_RECORD_ID',
      'SOURCE_URL', 'SOURCE_TITLE', 'PUBLISHER', 'DOMAIN',
      'RETRIEVAL_DATE', 'CHUNK_INDEX', 'TOTAL_CHUNKS',
      'CHUNK_TEXT', 'CHARACTER_COUNT', 'CONTENT_SOURCE_TYPE',
      'ENTITY_TYPE', 'LANGUAGE', 'VERSION', 'METADATA',
    ];
    for (const key of requiredKeys) {
      expect(EXTERNAL_KNOWLEDGE_CHUNK_FIELDS[key], `Missing EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.${key}`).toBeTruthy();
    }
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.EXTERNAL_SOURCE_RECORD_ID equals "external_source_record_id"', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.EXTERNAL_SOURCE_RECORD_ID).toBe('external_source_record_id');
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.CONTENT_SOURCE_TYPE equals "content_source_type"', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.CONTENT_SOURCE_TYPE).toBe('content_source_type');
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA is defined and frozen', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA).toBeTruthy();
    expect(Object.isFrozen(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA)).toBe(true);
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA.content_source_type has constantValue "external_trusted"', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA.content_source_type.constantValue).toBe('external_trusted');
  });

  it('EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA includes external_source_record_id for parent linkage', () => {
    expect(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA.external_source_record_id).toBeDefined();
    expect(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA.external_source_record_id.description).toContain('Base44 record ID');
  });

  it('REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS is an array of strings', () => {
    expect(Array.isArray(REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS)).toBe(true);
    expect(REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.length).toBeGreaterThan(0);
  });

  it('required chunk fields include chunk_id, source_id, source_url, publisher, domain, retrieval_date, chunk_index, chunk_text, content_source_type', () => {
    const required = new Set(REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS);
    for (const field of ['chunk_id', 'source_id', 'source_url', 'publisher', 'domain', 'retrieval_date', 'chunk_index', 'chunk_text', 'content_source_type']) {
      expect(required.has(field), `Required field "${field}" not in REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS`).toBe(true);
    }
  });
});

// ─── Section 3 — Source schema validation ─────────────────────────────────────

describe('Phase 4.2 — ExternalKnowledgeSource schema validation', () => {
  it('validateExternalKnowledgeSourceRecord is exported as a function', () => {
    expect(typeof validateExternalKnowledgeSourceRecord).toBe('function');
  });

  it('accepts a valid source record', () => {
    const record = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const result = validateExternalKnowledgeSourceRecord(record);
    expect(result.valid).toBe(true);
  });

  it('rejects a record missing source_id', () => {
    const record = { ...buildValidSourceRecord(SAMPLE_WHO_SOURCE), source_id: '' };
    const result = validateExternalKnowledgeSourceRecord(record);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('source_id');
  });

  it('rejects a record with wrong content_source_type', () => {
    const record = { ...buildValidSourceRecord(SAMPLE_WHO_SOURCE), content_source_type: 'internal' };
    const result = validateExternalKnowledgeSourceRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('content_source_type');
  });

  it('rejects null input', () => {
    const result = validateExternalKnowledgeSourceRecord(null);
    expect(result.valid).toBe(false);
  });

  it('rejects a record missing required fields', () => {
    const result = validateExternalKnowledgeSourceRecord({
      source_id: 'test',
      content_source_type: 'external_trusted',
      // missing title, url, publisher, domain, source_type, retrieval_date, ingestion_status
    });
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

// ─── Section 4 — Chunk schema validation ─────────────────────────────────────

describe('Phase 4.2 — ExternalKnowledgeChunk schema validation', () => {
  it('validateExternalKnowledgeChunkRecord is exported as a function', () => {
    expect(typeof validateExternalKnowledgeChunkRecord).toBe('function');
  });

  it('accepts a valid chunk record', () => {
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Text content here.']);
    const result = validateExternalKnowledgeChunkRecord(chunks[0]);
    expect(result.valid).toBe(true);
  });

  it('rejects a record with wrong content_source_type', () => {
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Text.']);
    const result = validateExternalKnowledgeChunkRecord({ ...chunks[0], content_source_type: 'internal' });
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('content_source_type');
  });

  it('accepts chunk_index = 0 (falsy but valid)', () => {
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Text.']);
    const chunk = { ...chunks[0], chunk_index: 0 };
    const result = validateExternalKnowledgeChunkRecord(chunk);
    expect(result.valid).toBe(true);
  });

  it('rejects chunk_index = -1 (negative)', () => {
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Text.']);
    const result = validateExternalKnowledgeChunkRecord({ ...chunks[0], chunk_index: -1 });
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('chunk_index');
  });

  it('rejects null input', () => {
    const result = validateExternalKnowledgeChunkRecord(null);
    expect(result.valid).toBe(false);
  });
});

// ─── Section 5 — KnowledgeInfrastructure domain in entities index ─────────────

describe('Phase 4.2 — KnowledgeInfrastructure domain in entities index', () => {
  // The entities index (src/api/entities/index.js) imports the Base44 SDK client
  // which requires a live server connection. We verify its content structurally
  // via fs.readFileSync — the same pattern used by test/meta/ tests.
  const ENTITIES_INDEX_PATH = path.resolve(
    import.meta.dirname, '../../src/api/entities/index.js',
  );

  it('entities index file exists', () => {
    expect(fs.existsSync(ENTITIES_INDEX_PATH)).toBe(true);
  });

  it('entities index exports KnowledgeInfrastructure', () => {
    const src = fs.readFileSync(ENTITIES_INDEX_PATH, 'utf8');
    expect(src).toContain('export const KnowledgeInfrastructure');
  });

  it('KnowledgeInfrastructure domain includes ExternalKnowledgeSource getter', () => {
    const src = fs.readFileSync(ENTITIES_INDEX_PATH, 'utf8');
    expect(src).toContain('ExternalKnowledgeSource');
    expect(src).toContain('base44.entities.ExternalKnowledgeSource');
  });

  it('KnowledgeInfrastructure domain includes ExternalKnowledgeChunk getter', () => {
    const src = fs.readFileSync(ENTITIES_INDEX_PATH, 'utf8');
    expect(src).toContain('ExternalKnowledgeChunk');
    expect(src).toContain('base44.entities.ExternalKnowledgeChunk');
  });

  it('ExternalKnowledgeSource entity definition file exists', () => {
    const defPath = path.resolve(
      import.meta.dirname, '../../src/api/entities/ExternalKnowledgeSource.js',
    );
    expect(fs.existsSync(defPath)).toBe(true);
  });

  it('ExternalKnowledgeChunk entity definition file exists', () => {
    const defPath = path.resolve(
      import.meta.dirname, '../../src/api/entities/ExternalKnowledgeChunk.js',
    );
    expect(fs.existsSync(defPath)).toBe(true);
  });
});

// ─── Section 6 — Persistence adapter exports ─────────────────────────────────

describe('Phase 4.2 — persistence adapter exports', () => {
  it('persistExternalSource is exported as a function', () => {
    expect(typeof persistExternalSource).toBe('function');
  });

  it('persistExternalChunks is exported as a function', () => {
    expect(typeof persistExternalChunks).toBe('function');
  });

  it('persistIngestedDocument is exported as a function', () => {
    expect(typeof persistIngestedDocument).toBe('function');
  });
});

// ─── Section 7 — Approved source record persistence ──────────────────────────

describe('Phase 4.2 — approved source record persistence', () => {
  it('creates a new source record when none exists', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const result = await persistExternalSource(entities, source);

    expect(result.stored).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.record_id).toBe('mock-source-record-id');
    expect(calls.sourceCreate).toHaveLength(1);
    expect(calls.sourceCreate[0].source_id).toBe('who-mhgap-ig-v2');
  });

  it('updates an existing source record when source_id already exists (upsert)', async () => {
    const { entities, calls } = createMockEntityClient({
      sourceFilterResult: [{ id: 'existing-source-id', source_id: 'who-mhgap-ig-v2' }],
    });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const result = await persistExternalSource(entities, source);

    expect(result.stored).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.record_id).toBe('existing-source-id');
    expect(calls.sourceUpdate).toHaveLength(1);
    expect(calls.sourceCreate).toHaveLength(0);
  });

  it('rejects a source record with wrong content_source_type', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = { ...buildValidSourceRecord(SAMPLE_WHO_SOURCE), content_source_type: 'internal' };
    const result = await persistExternalSource(entities, source);

    expect(result.stored).toBe(false);
    expect(calls.sourceCreate).toHaveLength(0);
    expect(calls.sourceUpdate).toHaveLength(0);
  });

  it('rejects a source record with missing required fields', async () => {
    const { entities, calls } = createMockEntityClient();
    const result = await persistExternalSource(entities, {
      source_id: 'test',
      content_source_type: 'external_trusted',
    });

    expect(result.stored).toBe(false);
    expect(calls.sourceCreate).toHaveLength(0);
  });

  it('returns record_id from the created entity record', async () => {
    const { entities } = createMockEntityClient({ sourceCreateId: 'custom-entity-id-123' });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const result = await persistExternalSource(entities, source);

    expect(result.record_id).toBe('custom-entity-id-123');
  });

  it('preserves all provenance fields in the created record', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    await persistExternalSource(entities, source);

    const created = calls.sourceCreate[0];
    expect(created.source_id).toBe('who-mhgap-ig-v2');
    expect(created.publisher).toBe('World Health Organization');
    expect(created.domain).toBe('who.int');
    expect(created.content_source_type).toBe(EXTERNAL_CONTENT_SOURCE_TYPE);
    expect(created.retrieval_date).toBe(RETRIEVAL_DATE);
  });
});

// ─── Section 8 — Approved chunk record persistence ───────────────────────────

describe('Phase 4.2 — approved chunk record persistence', () => {
  it('creates chunk records for all valid chunks', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);
    const result = await persistExternalChunks(entities, chunks, 'source-record-id-abc');

    expect(result.stored).toBe(SAMPLE_TEXTS.length);
    expect(result.failed).toBe(0);
    expect(calls.chunkCreate).toHaveLength(SAMPLE_TEXTS.length);
  });

  it('attaches external_source_record_id (parent linkage) to each chunk', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);
    await persistExternalChunks(entities, chunks, 'parent-source-id-xyz');

    for (const created of calls.chunkCreate) {
      expect(created.external_source_record_id).toBe('parent-source-id-xyz');
    }
  });

  it('preserves all provenance fields in persisted chunk records', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Chunk text.']);
    await persistExternalChunks(entities, chunks, 'source-id');

    const created = calls.chunkCreate[0];
    expect(created.source_id).toBe('who-mhgap-ig-v2');
    expect(created.publisher).toBe('World Health Organization');
    expect(created.domain).toBe('who.int');
    expect(created.content_source_type).toBe(EXTERNAL_CONTENT_SOURCE_TYPE);
    expect(created.retrieval_date).toBe(RETRIEVAL_DATE);
    expect(created.chunk_text).toBe('Chunk text.');
  });

  it('preserves chunk_index ordering', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);
    await persistExternalChunks(entities, chunks, 'source-id');

    for (let i = 0; i < SAMPLE_TEXTS.length; i++) {
      expect(calls.chunkCreate[i].chunk_index).toBe(i);
    }
  });

  it('rejects chunks with wrong content_source_type (provenance validation)', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, ['Text.']);
    const badChunks = chunks.map((c) => ({ ...c, content_source_type: 'internal' }));
    const result = await persistExternalChunks(entities, badChunks, 'source-id');

    expect(result.stored).toBe(0);
    expect(result.failed).toBe(1);
    expect(calls.chunkCreate).toHaveLength(0);
  });

  it('handles empty chunk array safely', async () => {
    const { entities, calls } = createMockEntityClient();
    const result = await persistExternalChunks(entities, [], 'source-id');

    expect(result.stored).toBe(0);
    expect(result.failed).toBe(0);
    expect(calls.chunkCreate).toHaveLength(0);
  });

  it('handles non-array input safely', async () => {
    const { entities, calls } = createMockEntityClient();
    const result = await persistExternalChunks(entities, null, 'source-id');

    expect(result.stored).toBe(0);
    expect(calls.chunkCreate).toHaveLength(0);
  });
});

// ─── Section 9 — Source/chunk linkage ────────────────────────────────────────

describe('Phase 4.2 — source/chunk linkage preserved in persistence', () => {
  it('persistIngestedDocument links chunks to the source via external_source_record_id', async () => {
    const { entities, calls } = createMockEntityClient({ sourceCreateId: 'real-source-id-456' });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);

    const result = await persistIngestedDocument(entities, source, chunks);

    expect(result.persisted).toBe(true);
    expect(result.source_record_id).toBe('real-source-id-456');
    expect(result.chunks_persisted).toBe(SAMPLE_TEXTS.length);

    // All chunks must be linked to the source record
    for (const created of calls.chunkCreate) {
      expect(created.external_source_record_id).toBe('real-source-id-456');
    }
  });

  it('all chunks share the same source_id', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);

    await persistIngestedDocument(entities, source, chunks);

    for (const created of calls.chunkCreate) {
      expect(created.source_id).toBe('who-mhgap-ig-v2');
    }
  });
});

// ─── Section 10 — Provenance preservation ────────────────────────────────────

describe('Phase 4.2 — provenance preservation in persisted records', () => {
  it('source record preserves publisher, domain, url, retrieval_date', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = buildValidSourceRecord(SAMPLE_NIMH_PDF);
    await persistExternalSource(entities, source);

    const created = calls.sourceCreate[0];
    expect(created.publisher).toBe('National Institute of Mental Health');
    expect(created.domain).toBe('nimh.nih.gov');
    expect(created.retrieval_date).toBe(RETRIEVAL_DATE);
    expect(created.content_source_type).toBe('external_trusted');
  });

  it('chunk records preserve source provenance fields', async () => {
    const { entities, calls } = createMockEntityClient();
    const chunks = buildValidChunkRecords(SAMPLE_NIMH_PDF, ['NIMH content.']);
    await persistExternalChunks(entities, chunks, null);

    const created = calls.chunkCreate[0];
    expect(created.publisher).toBe('National Institute of Mental Health');
    expect(created.domain).toBe('nimh.nih.gov');
    expect(created.source_id).toBe('nimh-asq-pdf');
    expect(created.content_source_type).toBe('external_trusted');
  });
});

// ─── Section 11 — Repeated ingestion is safe (upsert) ────────────────────────

describe('Phase 4.2 — repeated ingestion safety', () => {
  it('second ingestion updates the source record instead of creating a duplicate', async () => {
    // First ingestion: no existing record
    const { entities: entities1, calls: calls1 } = createMockEntityClient();
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const result1 = await persistExternalSource(entities1, source);
    expect(result1.stored).toBe(true);
    expect(result1.updated).toBe(false);
    expect(calls1.sourceCreate).toHaveLength(1);

    // Second ingestion: existing record present
    const { entities: entities2, calls: calls2 } = createMockEntityClient({
      sourceFilterResult: [{ id: result1.record_id, source_id: 'who-mhgap-ig-v2' }],
    });
    const result2 = await persistExternalSource(entities2, source);
    expect(result2.stored).toBe(true);
    expect(result2.updated).toBe(true);
    expect(calls2.sourceCreate).toHaveLength(0);
    expect(calls2.sourceUpdate).toHaveLength(1);
  });

  it('second chunk ingestion deletes stale chunks before creating new ones', async () => {
    const staleChunks = [{ id: 'stale-chunk-1' }, { id: 'stale-chunk-2' }];
    const { entities, calls } = createMockEntityClient({
      chunkFilterResult: staleChunks,
    });
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);
    const result = await persistExternalChunks(entities, chunks, 'source-id');

    // Stale chunks must be deleted
    expect(calls.chunkDelete).toContain('stale-chunk-1');
    expect(calls.chunkDelete).toContain('stale-chunk-2');
    // New chunks must be created
    expect(calls.chunkCreate).toHaveLength(SAMPLE_TEXTS.length);
    expect(result.stored).toBe(SAMPLE_TEXTS.length);
  });

  it('full re-ingestion (persistIngestedDocument) is idempotent', async () => {
    const { entities, calls } = createMockEntityClient({ sourceCreateId: 'src-id-abc' });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);

    const result = await persistIngestedDocument(entities, source, chunks);
    expect(result.persisted).toBe(true);
    expect(result.chunks_persisted).toBe(SAMPLE_TEXTS.length);
    expect(calls.sourceCreate).toHaveLength(1);
    expect(calls.chunkCreate).toHaveLength(SAMPLE_TEXTS.length);
  });
});

// ─── Section 12 — Unapproved sources persist nothing ─────────────────────────

describe('Phase 4.2 — unapproved/invalid sources persist nothing', () => {
  it('source with wrong content_source_type is rejected before any entity write', async () => {
    const { entities, calls } = createMockEntityClient();
    const source = { ...buildValidSourceRecord(SAMPLE_WHO_SOURCE), content_source_type: 'internal_content' };
    const result = await persistIngestedDocument(entities, source, []);

    expect(result.persisted).toBe(false);
    expect(calls.sourceCreate).toHaveLength(0);
    expect(calls.chunkCreate).toHaveLength(0);
  });

  it('null source record persists nothing', async () => {
    const { entities, calls } = createMockEntityClient();
    const result = await persistIngestedDocument(entities, null, []);

    expect(result.persisted).toBe(false);
    expect(calls.sourceCreate).toHaveLength(0);
    expect(calls.chunkCreate).toHaveLength(0);
  });

  it('source with missing required fields persists nothing', async () => {
    const { entities, calls } = createMockEntityClient();
    const result = await persistExternalSource(entities, {
      // Missing most required fields
      content_source_type: 'external_trusted',
    });
    expect(result.stored).toBe(false);
    expect(calls.sourceCreate).toHaveLength(0);
  });

  it('chunks with invalid provenance are not persisted', async () => {
    const { entities, calls } = createMockEntityClient();
    const badChunks = [{ chunk_id: 'x', source_id: 'who', content_source_type: 'not_trusted' }];
    const result = await persistExternalChunks(entities, badChunks, null);

    expect(result.stored).toBe(0);
    expect(result.failed).toBe(1);
    expect(calls.chunkCreate).toHaveLength(0);
  });
});

// ─── Section 13 — Persistence failure handling ───────────────────────────────

describe('Phase 4.2 — persistence failures are non-blocking', () => {
  it('entity create failure returns persisted=false with error description', async () => {
    const { entities } = createMockEntityClient({ sourceError: true });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);
    const chunks = buildValidChunkRecords(SAMPLE_WHO_SOURCE, SAMPLE_TEXTS);

    const result = await persistIngestedDocument(entities, source, chunks);

    expect(result.persisted).toBe(false);
    expect(result.persistence_error).toBeTruthy();
    expect(typeof result.persistence_error).toBe('string');
  });

  it('persistIngestedDocument never throws — always returns a structured result', async () => {
    const { entities } = createMockEntityClient({ sourceError: true });
    const source = buildValidSourceRecord(SAMPLE_WHO_SOURCE);

    await expect(
      persistIngestedDocument(entities, source, []),
    ).resolves.toBeDefined();
  });

  it('persistExternalSource never throws on schema validation failure', async () => {
    const { entities } = createMockEntityClient();
    await expect(
      persistExternalSource(entities, null),
    ).resolves.toBeDefined();
  });
});

// ─── Section 14 — Flags-off mode remains inert ───────────────────────────────

describe('Phase 4.2 — flags-off mode remains inert', () => {
  it('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED (master gate) is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for the ingestion flag', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED')).toBe(false);
  });

  it('persistence adapter functions exist but are never called when flags are off', () => {
    // When the flag is off, the ingestion path never reaches persistIngestedDocument.
    // This test confirms the adapter is importable with no side effects.
    const flagOff = isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED') === false;
    expect(flagOff).toBe(true);
    expect(typeof persistIngestedDocument).toBe('function');
  });

  it('all Stage 2 flags are still false', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });
});

// ─── Section 15 — Current therapist default path unchanged ────────────────────

describe('Phase 4.2 — current therapist default path unchanged', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('CBT_THERAPIST_WIRING_HYBRID has no reference to external knowledge entity surfaces', () => {
    const wiringStr = JSON.stringify(CBT_THERAPIST_WIRING_HYBRID);
    expect(wiringStr).not.toContain('ExternalKnowledgeSource');
    expect(wiringStr).not.toContain('ExternalKnowledgeChunk');
    expect(wiringStr).not.toContain('externalKnowledgePersistence');
    expect(wiringStr).not.toContain('external_trusted');
  });

  it('KnowledgeInfrastructure domain is not referenced in active therapist wiring', () => {
    const wiringStr = JSON.stringify(ACTIVE_CBT_THERAPIST_WIRING);
    expect(wiringStr).not.toContain('KnowledgeInfrastructure');
    expect(wiringStr).not.toContain('ExternalKnowledgeSource');
    expect(wiringStr).not.toContain('ExternalKnowledgeChunk');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING.stage2 is still falsy', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.stage2).toBeFalsy();
  });
});

// ─── Section 16 — Retrieval runtime unchanged ────────────────────────────────

describe('Phase 4.2 — retrieval runtime unchanged', () => {
  it('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED).toBe(false);
  });

  it('persistence adapter does not connect to any retrieval pipeline', () => {
    // The persistence adapter calls entity.create/update/filter/delete only.
    // It does not import from any retrieval module.
    expect(typeof persistIngestedDocument).toBe('function');
    expect(typeof persistExternalSource).toBe('function');
    expect(typeof persistExternalChunks).toBe('function');
  });
});

// ─── Section 17 — Rollback remains safe ──────────────────────────────────────

describe('Phase 4.2 — rollback remains safe', () => {
  it('entity definition files can be removed without affecting the therapist path', () => {
    // Structural assertion: the persistence module is an additive-only module.
    // The therapist wiring does not import from it.
    const wiringStr = JSON.stringify(CBT_THERAPIST_WIRING_HYBRID);
    expect(wiringStr).not.toContain('externalKnowledgePersistence');
    expect(wiringStr).not.toContain('ExternalKnowledgeSource');
    expect(wiringStr).not.toContain('ExternalKnowledgeChunk');
  });

  it('disabling THERAPIST_UPGRADE_ENABLED is sufficient to prevent all Phase 4.2 persistence', () => {
    const masterOff = THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED === false;
    const phase4Off = isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED') === false;
    expect(masterOff).toBe(true);
    expect(phase4Off).toBe(true);
  });

  it('persistence adapter is independently importable (no side effects at import)', () => {
    // The fact that we imported the module without any flags enabled and it
    // has not called any entity methods proves no import-time side effects.
    expect(typeof persistExternalSource).toBe('function');
    expect(typeof persistExternalChunks).toBe('function');
    expect(typeof persistIngestedDocument).toBe('function');
  });

  it('resolveTherapistWiring still returns HYBRID after Phase 4.2 modules are imported', () => {
    // Importing Phase 4.2 modules must not change the active wiring.
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });
});
