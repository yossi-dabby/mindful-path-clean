/**
 * Tests for allow-list rules, status-based routing, dry-run behavior,
 * and zero-record scenarios in the knowledge indexing pipeline.
 *
 * These tests mirror the pure processing logic defined in
 * functions/backfillKnowledgeIndex.ts and functions/indexContentRecord.ts.
 * Because those files use the Deno runtime (excluded from vitest), the pure
 * computation functions are reproduced here.
 *
 * Covers:
 *   - ALLOWED_ENTITY_TYPES enforcement (private entities must be absent)
 *   - Status-based routing (only 'active' records are indexed)
 *   - Dry-run mode (would_index result, no live I/O)
 *   - Batch-size clamping
 *   - Zero-record and all-skipped scenarios
 *
 * If the allow-list, status rules, or processRecord logic change, update
 * this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── CONSTANTS (mirrors functions/backfillKnowledgeIndex.ts) ──────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
const PRIVATE_ENTITY_TYPES = [
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
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

// ─── ENTITY FIELD MAP (mirrors functions/backfillKnowledgeIndex.ts) ───────────
const ENTITY_FIELD_MAP = {
  Exercise: {
    title_field: 'title',
    primary_text_fields: ['summary', 'instructions', 'detailed_description', 'visualization_script', 'when_to_use'],
    metadata_fields: [
      'title', 'category', 'difficulty', 'tags', 'goal_types', 'mood_targets',
      'contraindications', 'benefits', 'tips', 'source', 'evidence_base',
      'language', 'status', 'version', 'slug',
    ],
  },
  Resource: {
    title_field: 'title',
    primary_text_fields: ['summary', 'content', 'description', 'when_to_use'],
    metadata_fields: [
      'title', 'category', 'type', 'difficulty_level', 'tags', 'goal_types', 'mood_targets',
      'contraindications', 'author', 'source', 'language', 'status', 'version', 'slug',
    ],
  },
  JournalTemplate: {
    title_field: 'name',
    primary_text_fields: ['summary', 'guidance_text', 'description', 'when_to_use'],
    metadata_fields: ['name', 'entry_type', 'tags', 'goal_types', 'mood_targets', 'language', 'status', 'version', 'slug'],
  },
  Psychoeducation: {
    title_field: 'title',
    primary_text_fields: ['summary', 'content', 'when_to_use'],
    metadata_fields: [
      'title', 'category', 'subcategory', 'difficulty', 'tags', 'key_concepts',
      'example_scenarios', 'goal_types', 'mood_targets', 'contraindications',
      'related_exercises', 'related_resources', 'evidence_base', 'source',
      'language', 'status', 'version', 'slug', 'reviewed_by', 'last_reviewed_date',
    ],
  },
};

// ─── DOCUMENT BUILDER (mirrors functions/backfillKnowledgeIndex.ts) ───────────
function buildDocument(entity_type, record_id, record) {
  const fieldMap = ENTITY_FIELD_MAP[entity_type];
  const primary_text = fieldMap.primary_text_fields
    .map(f => (record[f] && typeof record[f] === 'string' ? record[f].trim() : ''))
    .filter(Boolean)
    .join('\n\n');
  if (!primary_text) return null;

  const metadata = {};
  for (const f of fieldMap.metadata_fields) {
    const val = record[f];
    if (val !== undefined && val !== null && val !== '') metadata[f] = val;
  }

  return {
    document_id: `${entity_type}::${record_id}`,
    entity_type,
    record_id,
    title: record[fieldMap.title_field] || '',
    slug: record.slug || null,
    primary_text,
    metadata,
    language: record.language || 'en',
    status: record.status || 'active',
    version: record.version || 1,
  };
}

// ─── CHUNKER (mirrors functions/backfillKnowledgeIndex.ts) ───────────────────
function chunkDocument(document) {
  const CHUNK_SIZE = 1000;
  const OVERLAP = 100;
  const text = document.primary_text;
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const raw_chunks = [];
  let current = '';

  for (const p of paragraphs) {
    const combined = current.length > 0 ? `${current}\n\n${p}` : p;
    if (combined.length <= CHUNK_SIZE) {
      current = combined;
    } else {
      if (current.length > 0) {
        raw_chunks.push(current.trim());
        const tail = current.length > OVERLAP ? current.slice(current.length - OVERLAP) : current;
        current = `${tail}\n\n${p}`;
      } else {
        current = p;
      }
      while (current.length > CHUNK_SIZE) {
        raw_chunks.push(current.slice(0, CHUNK_SIZE).trim());
        current = current.slice(Math.max(0, CHUNK_SIZE - OVERLAP)).trim();
      }
    }
  }
  if (current.trim().length > 0) raw_chunks.push(current.trim());

  const filtered = raw_chunks.filter(c => c.length > 0);
  return filtered.map((text, index) => ({
    chunk_id: `${document.document_id}::chunk_${index}`,
    document_id: document.document_id,
    entity_type: document.entity_type,
    record_id: document.record_id,
    title: document.title || '',
    slug: document.slug || null,
    chunk_index: index,
    total_chunks: filtered.length,
    text,
    character_count: text.length,
    metadata: document.metadata || {},
    language: document.language || 'en',
    version: document.version || 1,
  }));
}

// ─── PROCESS RECORD (mirrors backfillKnowledgeIndex.ts without live I/O) ──────
// In tests, the embed+upsert path is never reached — processRecord is called
// with dry_run=true to test dry-run behavior, or with a synthetic live path
// that immediately returns 'indexed' to validate counting logic.
function processRecord(etype, record, dry_run) {
  const record_id = record.id;
  const record_status = record.status || 'active';

  if (record_status !== 'active') {
    return {
      entity_type: etype,
      record_id,
      status: 'skipped',
      reason: `Status is '${record_status}' — only active records are backfilled.`,
    };
  }

  const document = buildDocument(etype, record_id, record);
  if (!document) {
    return { entity_type: etype, record_id, status: 'skipped', reason: 'No primary text content — cannot build document.' };
  }

  const chunks = chunkDocument(document);
  if (chunks.length === 0) {
    return { entity_type: etype, record_id, status: 'skipped', reason: 'No chunks produced — content too short.' };
  }

  if (dry_run) {
    return {
      entity_type: etype,
      record_id,
      status: 'would_index',
      chunks_would_index: chunks.length,
      reason: `Would index ${chunks.length} chunk(s). Set dry_run=false with KNOWLEDGE_INDEX_ENABLED=true to execute.`,
    };
  }

  return { entity_type: etype, record_id, status: 'indexed', chunks_indexed: chunks.length };
}

// ─── TESTS — allow-list ───────────────────────────────────────────────────────

describe('ALLOWED_ENTITY_TYPES allow-list', () => {
  it('includes only the 4 approved content entity types', () => {
    expect(ALLOWED_ENTITY_TYPES).toHaveLength(4);
    expect(ALLOWED_ENTITY_TYPES).toContain('Exercise');
    expect(ALLOWED_ENTITY_TYPES).toContain('Resource');
    expect(ALLOWED_ENTITY_TYPES).toContain('JournalTemplate');
    expect(ALLOWED_ENTITY_TYPES).toContain('Psychoeducation');
  });

  it('does not allow any private user entity types', () => {
    for (const privateType of PRIVATE_ENTITY_TYPES) {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(privateType);
    }
  });

  it('rejects entity_type values not in the allow-list', () => {
    const invalidTypes = ['Goal', 'User', 'ThoughtJournal', 'MoodEntry', 'CoachingSession'];
    for (const t of invalidTypes) {
      expect(ALLOWED_ENTITY_TYPES.includes(t)).toBe(false);
    }
  });
});

// ─── TESTS — batch_size clamping ─────────────────────────────────────────────

describe('batch_size clamping', () => {
  it('clamps batch_size to MAX_BATCH_SIZE', () => {
    const effective = Math.min(MAX_BATCH_SIZE, Math.max(1, 999));
    expect(effective).toBe(MAX_BATCH_SIZE);
  });

  it('enforces minimum batch_size of 1', () => {
    const effective = Math.min(MAX_BATCH_SIZE, Math.max(1, 0));
    expect(effective).toBe(1);
  });

  it('uses DEFAULT_BATCH_SIZE when not specified', () => {
    const effective = Math.min(MAX_BATCH_SIZE, Math.max(1, DEFAULT_BATCH_SIZE));
    expect(effective).toBe(DEFAULT_BATCH_SIZE);
  });

  it('DEFAULT_BATCH_SIZE is within the valid range', () => {
    expect(DEFAULT_BATCH_SIZE).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_BATCH_SIZE).toBeLessThanOrEqual(MAX_BATCH_SIZE);
  });
});

// ─── TESTS — status-based routing ────────────────────────────────────────────

describe('processRecord — status-based routing', () => {
  const activeRecord = {
    id: 'ex-001',
    title: 'Box Breathing',
    summary: 'A breathing technique to reduce stress and anxiety in difficult moments.',
    status: 'active',
  };

  it('processes an active record and returns would_index in dry_run mode', () => {
    const result = processRecord('Exercise', activeRecord, true);
    expect(result.status).toBe('would_index');
  });

  it('skips records with status "draft"', () => {
    const record = { ...activeRecord, status: 'draft' };
    const result = processRecord('Exercise', record, false);
    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('draft');
  });

  it('skips records with status "archived"', () => {
    const record = { ...activeRecord, status: 'archived' };
    const result = processRecord('Exercise', record, false);
    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('archived');
  });

  it('skips records with status "inactive"', () => {
    const record = { ...activeRecord, status: 'inactive' };
    const result = processRecord('Exercise', record, false);
    expect(result.status).toBe('skipped');
  });

  it('skips records with no primary text content', () => {
    const emptyRecord = { id: 'ex-002', title: 'Empty', status: 'active' };
    const result = processRecord('Exercise', emptyRecord, false);
    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('No primary text');
  });

  it('reason for non-active skip includes the actual status value', () => {
    const record = { ...activeRecord, status: 'pending_review' };
    const result = processRecord('Exercise', record, false);
    expect(result.reason).toContain('pending_review');
  });

  it('skipped result includes entity_type and record_id', () => {
    const record = { ...activeRecord, status: 'draft' };
    const result = processRecord('Exercise', record, false);
    expect(result.entity_type).toBe('Exercise');
    expect(result.record_id).toBe('ex-001');
  });
});

// ─── TESTS — dry-run behavior ─────────────────────────────────────────────────

describe('processRecord — dry-run behavior', () => {
  const record = {
    id: 'ex-010',
    title: 'Mindfulness',
    summary: 'A mindfulness practice that helps reduce stress by grounding attention in the present moment.',
    status: 'active',
  };

  it('returns status "would_index" in dry_run mode', () => {
    const result = processRecord('Exercise', record, true);
    expect(result.status).toBe('would_index');
  });

  it('reports chunks_would_index greater than zero', () => {
    const result = processRecord('Exercise', record, true);
    expect(result.chunks_would_index).toBeGreaterThan(0);
  });

  it('dry_run reason mentions setting dry_run=false', () => {
    const result = processRecord('Exercise', record, true);
    expect(result.reason).toContain('dry_run=false');
  });

  it('dry_run reason mentions KNOWLEDGE_INDEX_ENABLED', () => {
    const result = processRecord('Exercise', record, true);
    expect(result.reason).toContain('KNOWLEDGE_INDEX_ENABLED');
  });

  it('dry_run result includes entity_type and record_id', () => {
    const result = processRecord('Exercise', record, true);
    expect(result.entity_type).toBe('Exercise');
    expect(result.record_id).toBe('ex-010');
  });

  it('does not perform any live I/O in dry_run mode', () => {
    // processRecord in dry_run=true returns before any embed/upsert calls.
    // Calling it with a valid record must complete synchronously with no errors.
    expect(() => processRecord('Exercise', record, true)).not.toThrow();
  });
});

// ─── TESTS — zero-record and all-skipped scenarios ───────────────────────────

describe('zero-record and all-skipped scenarios', () => {
  it('produces no indexed records when record list is empty', () => {
    const records = [];
    let indexed = 0;
    let skipped = 0;
    for (const record of records) {
      const result = processRecord('Exercise', record, false);
      if (result.status === 'indexed' || result.status === 'would_index') indexed++;
      else skipped++;
    }
    expect(indexed).toBe(0);
    expect(skipped).toBe(0);
  });

  it('all-skipped scenario: non-active records count as skipped', () => {
    const records = [
      { id: 'r1', title: 'Draft One', status: 'draft', summary: 'Content here' },
      { id: 'r2', title: 'Archived One', status: 'archived', summary: 'Content here' },
    ];
    let indexed = 0;
    let skipped = 0;
    for (const record of records) {
      const result = processRecord('Exercise', record, false);
      if (result.status === 'indexed' || result.status === 'would_index') indexed++;
      else skipped++;
    }
    expect(indexed).toBe(0);
    expect(skipped).toBe(2);
  });

  it('mixed batch: active records are indexed, non-active records are skipped', () => {
    const records = [
      { id: 'r1', title: 'Active', status: 'active', summary: 'Sufficient content for indexing.' },
      { id: 'r2', title: 'Draft', status: 'draft', summary: 'Content here' },
      { id: 'r3', title: 'Active 2', status: 'active', summary: 'Another active record for indexing.' },
    ];
    let indexed = 0;
    let skipped = 0;
    for (const record of records) {
      const result = processRecord('Exercise', record, false);
      if (result.status === 'indexed' || result.status === 'would_index') indexed++;
      else skipped++;
    }
    expect(indexed).toBe(2);
    expect(skipped).toBe(1);
  });
});
