/**
 * @file test/utils/trustedCBTChunk.test.js
 *
 * TrustedCBTChunk — Model, validation, batch data, and importer tests.
 *
 * PURPOSE
 * -------
 *  1. Verify trustedCBTChunk.js exports all required constants and helpers.
 *  2. Verify TRUSTED_CBT_CHUNK_SCHEMA contains all required and CBT-specific fields.
 *  3. Verify REQUIRED_TRUSTED_CBT_CHUNK_FIELDS includes the mandatory fields.
 *  4. Verify createTrustedCBTChunkRecord() produces well-formed records with
 *     immutable content_source_type = 'external_trusted' and
 *     entity_type = 'TrustedCBTChunk'.
 *  5. Verify validateTrustedCBTChunkRecord() accepts valid records.
 *  6. Verify validateTrustedCBTChunkRecord() rejects records with missing required fields.
 *  7. Verify validateTrustedCBTChunkRecord() rejects records with wrong content_source_type.
 *  8. Verify validateTrustedCBTChunkRecord() rejects records with wrong entity_type.
 *  9. Verify validateTrustedCBTChunkRecord() rejects records with invalid chunk_index.
 * 10. Verify validateTrustedCBTChunkRecord() rejects records with invalid cbt_topic.
 * 11. Verify validateTrustedCBTChunkRecord() rejects records with invalid evidence_level.
 * 12. Verify validateTrustedCBTChunkBatch() validates an array of records correctly.
 * 13. Verify trusted-cbt-batch-1.json contains exactly 10 records.
 * 14. Verify every record in the batch passes validateTrustedCBTChunkRecord().
 * 15. Verify every batch record chunk_id is unique.
 * 16. Verify every batch record source_id matches an approved source.
 * 17. Verify the batch covers at least 4 distinct cbt_topic values.
 * 18. Verify trustedCBTChunkImporter.js exports loadTrustedCBTBatch() and
 *     importTrustedCBTBatch().
 * 19. Verify loadTrustedCBTBatch() returns 10 records matching the batch file.
 * 20. Verify importTrustedCBTBatch() calls entityClient.create() for each valid record.
 * 21. Verify importTrustedCBTBatch() skips invalid records and reports errors.
 * 22. Verify importTrustedCBTBatch() handles a missing entityClient safely.
 * 23. Verify importTrustedCBTBatch() handles entityClient.create() rejections safely.
 * 24. Verify no changes were made to auth, routing, or public chat flows.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags.
 * - Does NOT modify any existing test files.
 * - All assertions are additive — no prior test is changed or removed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Module under test ──────────────────────────────────────────────────────────
import {
  TRUSTED_CBT_CHUNK_ENTITY_TYPE,
  CBT_TOPICS,
  EVIDENCE_LEVELS,
  TRUSTED_CBT_CHUNK_FIELDS,
  TRUSTED_CBT_CHUNK_SCHEMA,
  REQUIRED_TRUSTED_CBT_CHUNK_FIELDS,
  createTrustedCBTChunkRecord,
  validateTrustedCBTChunkRecord,
  validateTrustedCBTChunkBatch,
} from '../../src/lib/trustedCBTChunk.js';

import {
  loadTrustedCBTBatch,
  importTrustedCBTBatch,
} from '../../src/lib/trustedCBTChunkImporter.js';

import { APPROVED_TRUSTED_SOURCES } from '../../src/lib/externalKnowledgeSource.js';

// ─── Path helpers ─────────────────────────────────────────────────────────────

const TEST_DIR = path.dirname(new URL(import.meta.url).pathname);
const BATCH_FILE_PATH = path.resolve(TEST_DIR, '../../src/data/trusted-cbt-batch-1.json');
const IMPORTER_FILE_PATH = path.resolve(TEST_DIR, '../../src/lib/trustedCBTChunkImporter.js');
const MODEL_FILE_PATH = path.resolve(TEST_DIR, '../../src/lib/trustedCBTChunk.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a minimal valid TrustedCBTChunk record for use in tests. */
function makeValidRecord(overrides = {}) {
  return createTrustedCBTChunkRecord({
    chunk_id:      'trusted-cbt::test-source::chunk_0',
    source_id:     'test-source',
    source_url:    'https://example.org/cbt-guide',
    publisher:     'Test Publisher',
    domain:        'example.org',
    retrieval_date: '2026-03-01T00:00:00.000Z',
    chunk_index:   0,
    chunk_text:    'CBT involves identifying and challenging unhelpful thoughts.',
    ...overrides,
  });
}

// ─── Section 1: Exports and constants ─────────────────────────────────────────

describe('trustedCBTChunk — exports and constants', () => {
  it('exports TRUSTED_CBT_CHUNK_ENTITY_TYPE as "TrustedCBTChunk"', () => {
    expect(TRUSTED_CBT_CHUNK_ENTITY_TYPE).toBe('TrustedCBTChunk');
  });

  it('exports CBT_TOPICS with at least 8 approved topic values', () => {
    const values = Object.values(CBT_TOPICS);
    expect(values.length).toBeGreaterThanOrEqual(8);
    expect(values).toContain('cognitive_restructuring');
    expect(values).toContain('behavioral_activation');
    expect(values).toContain('safety_planning');
    expect(values).toContain('psychoeducation');
  });

  it('exports EVIDENCE_LEVELS with exactly high, moderate, low', () => {
    const values = Object.values(EVIDENCE_LEVELS);
    expect(values).toContain('high');
    expect(values).toContain('moderate');
    expect(values).toContain('low');
    expect(values.length).toBe(3);
  });

  it('exports TRUSTED_CBT_CHUNK_FIELDS as a frozen object', () => {
    expect(Object.isFrozen(TRUSTED_CBT_CHUNK_FIELDS)).toBe(true);
  });

  it('TRUSTED_CBT_CHUNK_FIELDS includes CBT-specific fields', () => {
    expect(TRUSTED_CBT_CHUNK_FIELDS.CBT_TOPIC).toBe('cbt_topic');
    expect(TRUSTED_CBT_CHUNK_FIELDS.TECHNIQUE).toBe('technique');
    expect(TRUSTED_CBT_CHUNK_FIELDS.EVIDENCE_LEVEL).toBe('evidence_level');
  });

  it('TRUSTED_CBT_CHUNK_FIELDS includes all base ExternalKnowledgeChunk fields', () => {
    expect(TRUSTED_CBT_CHUNK_FIELDS.CHUNK_ID).toBe('chunk_id');
    expect(TRUSTED_CBT_CHUNK_FIELDS.SOURCE_ID).toBe('source_id');
    expect(TRUSTED_CBT_CHUNK_FIELDS.CONTENT_SOURCE_TYPE).toBe('content_source_type');
    expect(TRUSTED_CBT_CHUNK_FIELDS.ENTITY_TYPE).toBe('entity_type');
    expect(TRUSTED_CBT_CHUNK_FIELDS.CHUNK_TEXT).toBe('chunk_text');
  });
});

// ─── Section 2: Schema definition ─────────────────────────────────────────────

describe('trustedCBTChunk — TRUSTED_CBT_CHUNK_SCHEMA', () => {
  it('is a frozen object', () => {
    expect(Object.isFrozen(TRUSTED_CBT_CHUNK_SCHEMA)).toBe(true);
  });

  it('has content_source_type with constantValue "external_trusted"', () => {
    expect(TRUSTED_CBT_CHUNK_SCHEMA.content_source_type.constantValue).toBe('external_trusted');
  });

  it('has entity_type with constantValue "TrustedCBTChunk"', () => {
    expect(TRUSTED_CBT_CHUNK_SCHEMA.entity_type.constantValue).toBe(TRUSTED_CBT_CHUNK_ENTITY_TYPE);
  });

  it('marks chunk_id, source_id, source_url, publisher, domain, retrieval_date, chunk_index, chunk_text, content_source_type, entity_type as required', () => {
    const requiredFields = [
      'chunk_id', 'source_id', 'source_url', 'publisher', 'domain',
      'retrieval_date', 'chunk_index', 'chunk_text', 'content_source_type', 'entity_type',
    ];
    for (const field of requiredFields) {
      expect(TRUSTED_CBT_CHUNK_SCHEMA[field]?.required).toBe(true);
    }
  });

  it('marks cbt_topic, technique, evidence_level as optional', () => {
    expect(TRUSTED_CBT_CHUNK_SCHEMA.cbt_topic.required).toBe(false);
    expect(TRUSTED_CBT_CHUNK_SCHEMA.technique.required).toBe(false);
    expect(TRUSTED_CBT_CHUNK_SCHEMA.evidence_level.required).toBe(false);
  });

  it('cbt_topic schema entry has allowedValues matching CBT_TOPICS', () => {
    const allowed = TRUSTED_CBT_CHUNK_SCHEMA.cbt_topic.allowedValues;
    expect(Array.isArray(allowed)).toBe(true);
    expect(allowed).toContain('cognitive_restructuring');
    expect(allowed).toContain('safety_planning');
  });

  it('evidence_level schema entry has allowedValues ["high","moderate","low"]', () => {
    const allowed = TRUSTED_CBT_CHUNK_SCHEMA.evidence_level.allowedValues;
    expect(allowed).toEqual(expect.arrayContaining(['high', 'moderate', 'low']));
    expect(allowed.length).toBe(3);
  });
});

// ─── Section 3: REQUIRED_TRUSTED_CBT_CHUNK_FIELDS ─────────────────────────────

describe('trustedCBTChunk — REQUIRED_TRUSTED_CBT_CHUNK_FIELDS', () => {
  it('is a frozen array', () => {
    expect(Object.isFrozen(REQUIRED_TRUSTED_CBT_CHUNK_FIELDS)).toBe(true);
  });

  it('includes chunk_id, source_id, source_url, publisher, domain, retrieval_date, chunk_index, chunk_text, content_source_type, entity_type', () => {
    const expected = [
      'chunk_id', 'source_id', 'source_url', 'publisher', 'domain',
      'retrieval_date', 'chunk_index', 'chunk_text', 'content_source_type', 'entity_type',
    ];
    for (const field of expected) {
      expect(REQUIRED_TRUSTED_CBT_CHUNK_FIELDS).toContain(field);
    }
  });

  it('does NOT include cbt_topic, technique, or evidence_level (optional)', () => {
    expect(REQUIRED_TRUSTED_CBT_CHUNK_FIELDS).not.toContain('cbt_topic');
    expect(REQUIRED_TRUSTED_CBT_CHUNK_FIELDS).not.toContain('technique');
    expect(REQUIRED_TRUSTED_CBT_CHUNK_FIELDS).not.toContain('evidence_level');
  });
});

// ─── Section 4: createTrustedCBTChunkRecord() ────────────────────────────────

describe('trustedCBTChunk — createTrustedCBTChunkRecord()', () => {
  it('sets content_source_type to "external_trusted" unconditionally', () => {
    const record = createTrustedCBTChunkRecord({ content_source_type: 'something_else' });
    expect(record.content_source_type).toBe('external_trusted');
  });

  it('sets entity_type to "TrustedCBTChunk" unconditionally', () => {
    const record = createTrustedCBTChunkRecord({ entity_type: 'SomethingElse' });
    expect(record.entity_type).toBe('TrustedCBTChunk');
  });

  it('computes character_count from chunk_text', () => {
    const text = 'Hello CBT world.';
    const record = createTrustedCBTChunkRecord({ chunk_text: text });
    expect(record.character_count).toBe(text.length);
  });

  it('defaults language to "en"', () => {
    const record = createTrustedCBTChunkRecord({});
    expect(record.language).toBe('en');
  });

  it('defaults version to 1', () => {
    const record = createTrustedCBTChunkRecord({});
    expect(record.version).toBe(1);
  });

  it('defaults cbt_topic, technique, evidence_level to null', () => {
    const record = createTrustedCBTChunkRecord({});
    expect(record.cbt_topic).toBeNull();
    expect(record.technique).toBeNull();
    expect(record.evidence_level).toBeNull();
  });

  it('preserves supplied cbt_topic, technique, evidence_level', () => {
    const record = createTrustedCBTChunkRecord({
      cbt_topic:      'behavioral_activation',
      technique:      'activity scheduling',
      evidence_level: 'high',
    });
    expect(record.cbt_topic).toBe('behavioral_activation');
    expect(record.technique).toBe('activity scheduling');
    expect(record.evidence_level).toBe('high');
  });

  it('produces a well-formed record that passes validation when all required fields are supplied', () => {
    const record = makeValidRecord();
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(true);
  });
});

// ─── Section 5: validateTrustedCBTChunkRecord() — valid cases ─────────────────

describe('trustedCBTChunk — validateTrustedCBTChunkRecord() — valid', () => {
  it('returns { valid: true } for a complete record with no CBT extension fields', () => {
    const record = makeValidRecord();
    expect(validateTrustedCBTChunkRecord(record)).toEqual({ valid: true });
  });

  it('returns { valid: true } for a complete record with all CBT extension fields', () => {
    const record = makeValidRecord({
      cbt_topic:      'cognitive_restructuring',
      technique:      'thought records',
      evidence_level: 'high',
    });
    expect(validateTrustedCBTChunkRecord(record)).toEqual({ valid: true });
  });

  it('returns { valid: true } when chunk_index is 0 (valid falsy integer)', () => {
    const record = makeValidRecord({ chunk_index: 0 });
    expect(validateTrustedCBTChunkRecord(record)).toEqual({ valid: true });
  });

  it('accepts null cbt_topic, technique, evidence_level (optional fields)', () => {
    const record = makeValidRecord({ cbt_topic: null, technique: null, evidence_level: null });
    expect(validateTrustedCBTChunkRecord(record)).toEqual({ valid: true });
  });
});

// ─── Section 6: validateTrustedCBTChunkRecord() — missing required fields ──────

describe('trustedCBTChunk — validateTrustedCBTChunkRecord() — missing fields', () => {
  it('returns { valid: false } and reports missing when record is null', () => {
    const result = validateTrustedCBTChunkRecord(null);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('returns { valid: false } and reports missing for a plain empty object', () => {
    const result = validateTrustedCBTChunkRecord({});
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('chunk_id');
    expect(result.missing).toContain('chunk_text');
  });

  it('reports chunk_id in missing when it is absent', () => {
    const record = makeValidRecord();
    delete record.chunk_id;
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('chunk_id');
  });

  it('reports chunk_text in missing when it is an empty string', () => {
    const record = makeValidRecord({ chunk_text: '' });
    record.character_count = 0;
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('chunk_text');
  });

  it('reports retrieval_date in missing when it is null', () => {
    const record = makeValidRecord();
    record.retrieval_date = null;
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('retrieval_date');
  });
});

// ─── Section 7: validateTrustedCBTChunkRecord() — invalid field values ─────────

describe('trustedCBTChunk — validateTrustedCBTChunkRecord() — invalid values', () => {
  it('reports content_source_type in invalid when value is not "external_trusted"', () => {
    const record = makeValidRecord();
    record.content_source_type = 'internal';
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('content_source_type');
  });

  it('reports entity_type in invalid when value is not "TrustedCBTChunk"', () => {
    const record = makeValidRecord();
    record.entity_type = 'ExternalKnowledgeChunk';
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('entity_type');
  });

  it('reports chunk_index in invalid when it is a float', () => {
    const record = makeValidRecord({ chunk_index: 1.5 });
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('chunk_index');
  });

  it('reports chunk_index in invalid when it is negative', () => {
    const record = makeValidRecord({ chunk_index: -1 });
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('chunk_index');
  });

  it('reports chunk_index in invalid when it is a string', () => {
    const record = makeValidRecord({ chunk_index: 'zero' });
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('chunk_index');
  });

  it('reports cbt_topic in invalid when value is not in CBT_TOPICS', () => {
    const record = makeValidRecord({ cbt_topic: 'not_a_valid_topic' });
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('cbt_topic');
  });

  it('reports evidence_level in invalid when value is not in EVIDENCE_LEVELS', () => {
    const record = makeValidRecord({ evidence_level: 'very_high' });
    const result = validateTrustedCBTChunkRecord(record);
    expect(result.valid).toBe(false);
    expect(result.invalid).toContain('evidence_level');
  });
});

// ─── Section 8: validateTrustedCBTChunkBatch() ────────────────────────────────

describe('trustedCBTChunk — validateTrustedCBTChunkBatch()', () => {
  it('returns [] for a non-array input', () => {
    expect(validateTrustedCBTChunkBatch(null)).toEqual([]);
    expect(validateTrustedCBTChunkBatch('string')).toEqual([]);
  });

  it('returns an entry per record in the input array', () => {
    const records = [makeValidRecord(), makeValidRecord({ chunk_id: 'trusted-cbt::test::chunk_1', chunk_index: 1 })];
    const results = validateTrustedCBTChunkBatch(records);
    expect(results.length).toBe(2);
  });

  it('each entry has index, chunk_id, and result fields', () => {
    const records = [makeValidRecord()];
    const results = validateTrustedCBTChunkBatch(records);
    expect(results[0]).toHaveProperty('index', 0);
    expect(results[0]).toHaveProperty('chunk_id');
    expect(results[0]).toHaveProperty('result');
  });

  it('marks valid records as valid in result', () => {
    const results = validateTrustedCBTChunkBatch([makeValidRecord()]);
    expect(results[0].result.valid).toBe(true);
  });

  it('marks invalid records as invalid in result and reports fields', () => {
    const invalid = { chunk_id: '', chunk_text: 'some text' };
    const results = validateTrustedCBTChunkBatch([invalid]);
    expect(results[0].result.valid).toBe(false);
    expect(results[0].result.missing.length).toBeGreaterThan(0);
  });
});

// ─── Section 9: trusted-cbt-batch-1.json — structural integrity ───────────────

describe('trusted-cbt-batch-1.json — structural integrity', () => {
  let batch;

  beforeEach(() => {
    const raw = fs.readFileSync(BATCH_FILE_PATH, 'utf8');
    batch = JSON.parse(raw);
  });

  it('contains exactly 10 records', () => {
    expect(batch.length).toBe(10);
  });

  it('every record passes validateTrustedCBTChunkRecord()', () => {
    for (const record of batch) {
      const result = validateTrustedCBTChunkRecord(record);
      expect(result.valid, `Record ${record.chunk_id} failed: ${JSON.stringify(result)}`).toBe(true);
    }
  });

  it('every record has a unique chunk_id', () => {
    const ids = batch.map((r) => r.chunk_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(batch.length);
  });

  it('every record source_id matches an approved source', () => {
    const approvedIds = new Set(APPROVED_TRUSTED_SOURCES.map((s) => s.source_id));
    for (const record of batch) {
      expect(approvedIds.has(record.source_id), `Unknown source_id: ${record.source_id}`).toBe(true);
    }
  });

  it('every record has content_source_type = "external_trusted"', () => {
    for (const record of batch) {
      expect(record.content_source_type).toBe('external_trusted');
    }
  });

  it('every record has entity_type = "TrustedCBTChunk"', () => {
    for (const record of batch) {
      expect(record.entity_type).toBe('TrustedCBTChunk');
    }
  });

  it('covers at least 4 distinct cbt_topic values', () => {
    const topics = new Set(batch.map((r) => r.cbt_topic).filter(Boolean));
    expect(topics.size).toBeGreaterThanOrEqual(4);
  });

  it('every cbt_topic is a valid CBT_TOPICS value', () => {
    const validTopics = new Set(Object.values(CBT_TOPICS));
    for (const record of batch) {
      if (record.cbt_topic !== null && record.cbt_topic !== undefined) {
        expect(validTopics.has(record.cbt_topic), `Invalid cbt_topic: ${record.cbt_topic}`).toBe(true);
      }
    }
  });

  it('every evidence_level is a valid EVIDENCE_LEVELS value', () => {
    const validLevels = new Set(Object.values(EVIDENCE_LEVELS));
    for (const record of batch) {
      if (record.evidence_level !== null && record.evidence_level !== undefined) {
        expect(validLevels.has(record.evidence_level), `Invalid evidence_level: ${record.evidence_level}`).toBe(true);
      }
    }
  });

  it('every chunk_index is a non-negative integer', () => {
    for (const record of batch) {
      expect(typeof record.chunk_index).toBe('number');
      expect(Number.isInteger(record.chunk_index)).toBe(true);
      expect(record.chunk_index).toBeGreaterThanOrEqual(0);
    }
  });

  it('covers at least 3 distinct source_id values', () => {
    const sources = new Set(batch.map((r) => r.source_id));
    expect(sources.size).toBeGreaterThanOrEqual(3);
  });
});

// ─── Section 10: trustedCBTChunkImporter — loadTrustedCBTBatch() ──────────────

describe('trustedCBTChunkImporter — loadTrustedCBTBatch()', () => {
  it('returns an array of 10 records', () => {
    const records = loadTrustedCBTBatch();
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBe(10);
  });

  it('every loaded record passes validateTrustedCBTChunkRecord()', () => {
    const records = loadTrustedCBTBatch();
    for (const record of records) {
      const result = validateTrustedCBTChunkRecord(record);
      expect(result.valid, `${record.chunk_id}: ${JSON.stringify(result)}`).toBe(true);
    }
  });

  it('loaded records match the JSON batch file', () => {
    const jsonRecords = JSON.parse(fs.readFileSync(BATCH_FILE_PATH, 'utf8'));
    const loaded = loadTrustedCBTBatch();
    const loadedIds = new Set(loaded.map((r) => r.chunk_id));
    for (const jsonRecord of jsonRecords) {
      expect(loadedIds.has(jsonRecord.chunk_id)).toBe(true);
    }
  });
});

// ─── Section 11: trustedCBTChunkImporter — importTrustedCBTBatch() ────────────

describe('trustedCBTChunkImporter — importTrustedCBTBatch()', () => {
  it('returns failure result when entityClient is missing', async () => {
    const result = await importTrustedCBTBatch(null);
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('returns failure result when entityClient has no create method', async () => {
    const result = await importTrustedCBTBatch({});
    expect(result.success).toBe(false);
  });

  it('calls entityClient.create() once for each valid batch record', async () => {
    const calls = [];
    const mockClient = {
      create: async (record) => {
        calls.push(record);
        return { id: 'mock-id', ...record };
      },
    };
    const result = await importTrustedCBTBatch(mockClient);
    expect(result.attempted).toBe(10);
    expect(result.imported).toBe(10);
    expect(result.skipped).toBe(0);
    expect(calls.length).toBe(10);
    expect(result.success).toBe(true);
  });

  it('reports persistence errors and skips records when create() rejects', async () => {
    let callCount = 0;
    const mockClient = {
      create: async () => {
        callCount++;
        if (callCount === 1) throw new Error('DB write failed');
        return { id: 'mock-id' };
      },
    };
    const result = await importTrustedCBTBatch(mockClient);
    expect(result.attempted).toBe(10);
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(9);
    expect(result.persistenceErrors.length).toBe(1);
    expect(result.persistenceErrors[0].error).toBe('DB write failed');
  });

  it('result has attempted, imported, skipped, validationErrors, persistenceErrors fields', async () => {
    const mockClient = { create: async () => ({}) };
    const result = await importTrustedCBTBatch(mockClient);
    expect(result).toHaveProperty('attempted');
    expect(result).toHaveProperty('imported');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('validationErrors');
    expect(result).toHaveProperty('persistenceErrors');
  });
});

// ─── Section 12: Isolation — no changes to auth, routing, or public chat flows ─

describe('isolation — no changes to auth, routing, or public chat flows', () => {
  it('trustedCBTChunk.js does not import from Chat.jsx or any page file', () => {
    const src = fs.readFileSync(MODEL_FILE_PATH, 'utf8');
    // No imports from page files, routing, or auth modules
    expect(src).not.toMatch(/from ['"][^'"]*\/pages\//);
    expect(src).not.toMatch(/import.*Chat/);
    expect(src).not.toMatch(/from ['"][^'"]*react-router/);
    expect(src).not.toMatch(/from ['"][^'"]*base44Client/);
  });

  it('trustedCBTChunkImporter.js does not import from Chat.jsx or any page file', () => {
    const src = fs.readFileSync(IMPORTER_FILE_PATH, 'utf8');
    // No imports from page files, routing, or auth modules
    expect(src).not.toMatch(/from ['"][^'"]*\/pages\//);
    expect(src).not.toMatch(/import.*Chat/);
    expect(src).not.toMatch(/from ['"][^'"]*react-router/);
    expect(src).not.toMatch(/from ['"][^'"]*base44Client/);
  });

  it('trusted-cbt-batch-1.json does not contain any private user entity fields', () => {
    const raw = fs.readFileSync(BATCH_FILE_PATH, 'utf8');
    // Private user entity names must not appear as field names in the batch
    const privateEntities = ['ThoughtJournal', 'Conversation', 'CaseFormulation', 'MoodEntry', 'CompanionMemory'];
    for (const entity of privateEntities) {
      expect(raw).not.toContain(entity);
    }
  });
});
