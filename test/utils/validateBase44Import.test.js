/**
 * @file test/utils/validateBase44Import.test.js
 *
 * Tests for src/lib/validateBase44Import.js
 *
 * Validates the import compatibility checker for TrustedCBTChunk Base44 import
 * files used with the /KnowledgeStudio BulkImport flow.
 *
 * Covers:
 * - validateRecord: required fields, language, priority_score, tags, extra fields
 * - validateBase44ImportFile: top-level shape, empty array, batch files
 * - Integration: full batch and smoke files pass validation without errors
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  VALID_LANGUAGES,
  REQUIRED_FIELDS,
  ALLOWED_FIELDS,
  validateRecord,
  validateBase44ImportFile,
} from '../../src/lib/validateBase44Import.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minimalRecord(overrides = {}) {
  return {
    title: 'Test Chunk',
    topic: 'anxiety',
    content: 'This is the content.',
    ...overrides,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('VALID_LANGUAGES', () => {
  it('contains exactly the 7 supported languages', () => {
    expect(VALID_LANGUAGES).toEqual(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
  });
});

describe('REQUIRED_FIELDS', () => {
  it('requires title, topic, and content', () => {
    expect(REQUIRED_FIELDS).toEqual(expect.arrayContaining(['title', 'topic', 'content']));
    expect(REQUIRED_FIELDS).toHaveLength(3);
  });
});

describe('ALLOWED_FIELDS', () => {
  it('contains all 16 Base44 TrustedCBTChunk fields', () => {
    const expected = [
      'title', 'topic', 'subtopic', 'population', 'clinical_goal',
      'content', 'short_summary', 'tags', 'source_name', 'source_type',
      'license_status', 'safety_notes', 'contraindications',
      'language', 'priority_score', 'is_active',
    ];
    for (const field of expected) {
      expect(ALLOWED_FIELDS.has(field), `ALLOWED_FIELDS should contain "${field}"`).toBe(true);
    }
    expect(ALLOWED_FIELDS.size).toBe(16);
  });

  it('does NOT contain non-Base44 fields', () => {
    const nonBase44 = ['entity_type', 'content_source_type', 'chunk_index', 'evidence_level', 'id', '_id'];
    for (const field of nonBase44) {
      expect(ALLOWED_FIELDS.has(field), `ALLOWED_FIELDS must not contain "${field}"`).toBe(false);
    }
  });
});

// ─── validateRecord ───────────────────────────────────────────────────────────

describe('validateRecord — required fields', () => {
  it('passes a minimal valid record', () => {
    const { errors } = validateRecord(minimalRecord(), 0);
    expect(errors).toHaveLength(0);
  });

  it('fails when title is missing', () => {
    const { errors } = validateRecord(minimalRecord({ title: '' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"title"')]));
  });

  it('fails when topic is missing', () => {
    const { errors } = validateRecord(minimalRecord({ topic: undefined }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"topic"')]));
  });

  it('fails when content is missing', () => {
    const { errors } = validateRecord(minimalRecord({ content: '   ' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"content"')]));
  });

  it('fails when all required fields are absent', () => {
    const { errors } = validateRecord({}, 0);
    expect(errors).toHaveLength(3);
  });

  it('returns an error when record is not an object', () => {
    const { errors } = validateRecord('not an object', 0);
    expect(errors).toHaveLength(1);
  });

  it('returns an error when record is an array', () => {
    const { errors } = validateRecord([], 0);
    expect(errors).toHaveLength(1);
  });
});

describe('validateRecord — language', () => {
  it('passes when language is a valid code', () => {
    for (const lang of VALID_LANGUAGES) {
      const { errors } = validateRecord(minimalRecord({ language: lang }), 0);
      expect(errors, `language "${lang}" should pass`).toHaveLength(0);
    }
  });

  it('fails when language is invalid', () => {
    const { errors } = validateRecord(minimalRecord({ language: 'xx' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('Invalid language')]));
  });

  it('fails when language is an empty string', () => {
    const { errors } = validateRecord(minimalRecord({ language: '' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('Invalid language')]));
  });

  it('passes when language is omitted (optional field)', () => {
    const rec = minimalRecord();
    delete rec.language;
    const { errors } = validateRecord(rec, 0);
    expect(errors).toHaveLength(0);
  });
});

describe('validateRecord — priority_score', () => {
  it('passes for valid scores 0 through 10', () => {
    for (const score of [0, 1, 5, 9, 10]) {
      const { errors } = validateRecord(minimalRecord({ priority_score: score }), 0);
      expect(errors, `priority_score ${score} should pass`).toHaveLength(0);
    }
  });

  it('fails for score greater than 10', () => {
    const { errors } = validateRecord(minimalRecord({ priority_score: 11 }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('priority_score')]));
  });

  it('fails for negative score', () => {
    const { errors } = validateRecord(minimalRecord({ priority_score: -1 }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('priority_score')]));
  });

  it('fails for a non-numeric string score', () => {
    const { errors } = validateRecord(minimalRecord({ priority_score: 'high' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('priority_score')]));
  });

  it('passes when priority_score is omitted', () => {
    const rec = minimalRecord();
    delete rec.priority_score;
    const { errors } = validateRecord(rec, 0);
    expect(errors).toHaveLength(0);
  });
});

describe('validateRecord — tags', () => {
  it('passes when tags is an array', () => {
    const { errors } = validateRecord(minimalRecord({ tags: ['anxiety', 'panic'] }), 0);
    expect(errors).toHaveLength(0);
  });

  it('passes when tags is an empty array', () => {
    const { errors } = validateRecord(minimalRecord({ tags: [] }), 0);
    expect(errors).toHaveLength(0);
  });

  it('fails when tags is a string', () => {
    const { errors } = validateRecord(minimalRecord({ tags: 'anxiety, panic' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"tags" must be an array')]));
  });

  it('fails when tags is an object', () => {
    const { errors } = validateRecord(minimalRecord({ tags: { a: 1 } }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"tags" must be an array')]));
  });

  it('passes when tags is omitted', () => {
    const rec = minimalRecord();
    delete rec.tags;
    const { errors } = validateRecord(rec, 0);
    expect(errors).toHaveLength(0);
  });
});

describe('validateRecord — extra non-Base44 fields', () => {
  it('fails when entity_type is present', () => {
    const { errors } = validateRecord(minimalRecord({ entity_type: 'TrustedCBTChunk' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"entity_type"')]));
  });

  it('fails when content_source_type is present', () => {
    const { errors } = validateRecord(minimalRecord({ content_source_type: 'external_trusted' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"content_source_type"')]));
  });

  it('fails when chunk_index is present', () => {
    const { errors } = validateRecord(minimalRecord({ chunk_index: 0 }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"chunk_index"')]));
  });

  it('fails when evidence_level is present', () => {
    const { errors } = validateRecord(minimalRecord({ evidence_level: 'high' }), 0);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('"evidence_level"')]));
  });

  it('fails when multiple extra fields are present', () => {
    const { errors } = validateRecord(
      minimalRecord({ entity_type: 'X', chunk_index: 1, _id: 'abc' }),
      0
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"entity_type"');
    expect(errors[0]).toContain('"chunk_index"');
    expect(errors[0]).toContain('"_id"');
  });

  it('passes when all fields are in ALLOWED_FIELDS', () => {
    const full = {
      title: 'Full record',
      topic: 'anxiety',
      subtopic: 'grounding',
      population: 'adults',
      clinical_goal: 'Reduce anxiety',
      content: 'This is the content.',
      short_summary: 'A summary.',
      tags: ['anxiety'],
      source_name: 'Test Source',
      source_type: 'adapted',
      license_status: 'open',
      safety_notes: 'None',
      contraindications: 'None',
      language: 'en',
      priority_score: 7,
      is_active: false,
    };
    const { errors } = validateRecord(full, 0);
    expect(errors).toHaveLength(0);
  });
});

// ─── validateBase44ImportFile ─────────────────────────────────────────────────

describe('validateBase44ImportFile — top-level shape', () => {
  it('fails when input is not an array', () => {
    const result = validateBase44ImportFile({ title: 'not an array' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].errors[0]).toContain('JSON array');
  });

  it('fails when input is null', () => {
    const result = validateBase44ImportFile(null);
    expect(result.valid).toBe(false);
  });

  it('fails when input is an empty array', () => {
    const result = validateBase44ImportFile([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].errors[0]).toContain('at least one record');
  });

  it('passes a single valid record', () => {
    const result = validateBase44ImportFile([minimalRecord()]);
    expect(result.valid).toBe(true);
    expect(result.recordCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports the correct record count', () => {
    const records = [minimalRecord(), minimalRecord({ title: 'B' }), minimalRecord({ title: 'C' })];
    const result = validateBase44ImportFile(records);
    expect(result.recordCount).toBe(3);
  });

  it('returns valid=false when any record has errors', () => {
    const records = [minimalRecord(), { title: '', topic: '', content: '' }];
    const result = validateBase44ImportFile(records);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
  });
});

// ─── Integration: actual batch files ─────────────────────────────────────────

describe('trusted-cbt-batch-1.base44.json — integration', () => {
  it('parses without error and contains 10 records', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(10);
  });

  it('passes full Base44 schema validation (no errors)', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    const result = validateBase44ImportFile(data);
    if (!result.valid) {
      const summary = result.errors
        .map(r => `Record ${r.index}: ${r.errors.join('; ')}`)
        .join('\n');
      throw new Error(`Batch file failed validation:\n${summary}`);
    }
    expect(result.valid).toBe(true);
  });

  it('has is_active = false on every record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    const active = data.filter(r => r.is_active !== false);
    expect(active).toHaveLength(0);
  });

  it('has no non-Base44 fields on any record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    for (const [i, record] of data.entries()) {
      const extra = Object.keys(record).filter(k => !ALLOWED_FIELDS.has(k));
      expect(extra, `Record ${i} has extra fields: ${extra.join(', ')}`).toHaveLength(0);
    }
  });

  it('has array tags on every record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    for (const [i, record] of data.entries()) {
      expect(Array.isArray(record.tags), `Record ${i} tags must be array`).toBe(true);
    }
  });

  it('has valid priority_score on every record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    for (const [i, record] of data.entries()) {
      const score = Number(record.priority_score);
      expect(isNaN(score) || score < 0 || score > 10,
        `Record ${i} has invalid priority_score: ${record.priority_score}`
      ).toBe(false);
    }
  });

  it('has valid language on every record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    for (const [i, record] of data.entries()) {
      expect(VALID_LANGUAGES, `Record ${i} has invalid language: ${record.language}`)
        .toContain(record.language);
    }
  });
});

describe('trusted-cbt-batch-1.smoke.base44.json — integration', () => {
  it('parses without error and contains exactly 3 records', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.smoke.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(3);
  });

  it('passes full Base44 schema validation (no errors)', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.smoke.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    const result = validateBase44ImportFile(data);
    if (!result.valid) {
      const summary = result.errors
        .map(r => `Record ${r.index}: ${r.errors.join('; ')}`)
        .join('\n');
      throw new Error(`Smoke file failed validation:\n${summary}`);
    }
    expect(result.valid).toBe(true);
  });

  it('smoke file records are identical to first 3 records of the full batch', () => {
    const full = JSON.parse(readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.base44.json'), 'utf-8'));
    const smoke = JSON.parse(readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.smoke.base44.json'), 'utf-8'));
    expect(smoke).toEqual(full.slice(0, 3));
  });

  it('has is_active = false on every smoke record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.smoke.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(data.filter(r => r.is_active !== false)).toHaveLength(0);
  });

  it('has no non-Base44 fields on any smoke record', () => {
    const raw = readFileSync(resolve(ROOT, 'src/data/trusted-cbt-batch-1.smoke.base44.json'), 'utf-8');
    const data = JSON.parse(raw);
    for (const [i, record] of data.entries()) {
      const extra = Object.keys(record).filter(k => !ALLOWED_FIELDS.has(k));
      expect(extra, `Smoke record ${i} has extra fields: ${extra.join(', ')}`).toHaveLength(0);
    }
  });
});
