/**
 * Tests for the buildDocument / buildContentDocument pipeline step.
 *
 * These tests mirror the pure document-building logic defined in
 * functions/buildContentDocument.ts and functions/backfillKnowledgeIndex.ts.
 * Because those files use the Deno runtime (excluded from vitest), the pure
 * computation functions are reproduced here so the rules remain covered by
 * the project test suite.
 *
 * Also covers flattenForPinecone, which serializes metadata for vector store
 * upserts and is defined in functions/backfillKnowledgeIndex.ts.
 *
 * If the field maps, allow-list, or document-building logic change, this file
 * must be updated to match.
 */

import { describe, it, expect } from 'vitest';

// ─── PRIVATE ENTITY TYPES (must never appear in the allow-list) ───────────────
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

// ─── ALLOWED ENTITY TYPES (mirrors functions/buildContentDocument.ts) ─────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

// ─── ENTITY FIELD MAP (mirrors functions/buildContentDocument.ts) ─────────────
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
    metadata_fields: [
      'name', 'entry_type', 'tags', 'goal_types', 'mood_targets',
      'language', 'status', 'version', 'slug',
    ],
  },
  Psychoeducation: {
    title_field: 'title',
    primary_text_fields: ['summary', 'content', 'when_to_use'],
    metadata_fields: [
      'title', 'category', 'subcategory', 'difficulty', 'tags', 'key_concepts',
      'example_scenarios', 'goal_types', 'mood_targets', 'contraindications',
      'related_exercises', 'related_resources', 'evidence_base', 'source',
      'language', 'status', 'version', 'slug', 'reviewed_by', 'last_reviewed_date',
      'translation_group_id', 'source_record_id', 'source_language', 'variant_language',
      'translation_status', 'clinical_review_status', 'translation_version', 'canonical_status',
    ],
  },
};

// ─── DOCUMENT BUILDER (mirrors functions/buildContentDocument.ts) ─────────────
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

// ─── FLATTEN FOR PINECONE (mirrors functions/backfillKnowledgeIndex.ts) ───────
function flattenForPinecone(obj) {
  const flat = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      flat[k] = v;
    } else if (Array.isArray(v)) {
      flat[k] = v.map(i => (typeof i === 'object' ? JSON.stringify(i) : String(i)));
    } else if (typeof v === 'object') {
      flat[k] = JSON.stringify(v);
    }
  }
  return flat;
}

// ─── TESTS — allow-list ───────────────────────────────────────────────────────

describe('ALLOWED_ENTITY_TYPES allow-list', () => {
  it('contains exactly the 4 approved shared content entity types', () => {
    expect(ALLOWED_ENTITY_TYPES).toHaveLength(4);
    expect(ALLOWED_ENTITY_TYPES).toContain('Exercise');
    expect(ALLOWED_ENTITY_TYPES).toContain('Resource');
    expect(ALLOWED_ENTITY_TYPES).toContain('JournalTemplate');
    expect(ALLOWED_ENTITY_TYPES).toContain('Psychoeducation');
  });

  it('does not include any private user entity types', () => {
    for (const privateType of PRIVATE_ENTITY_TYPES) {
      expect(ALLOWED_ENTITY_TYPES).not.toContain(privateType);
    }
  });

  it('rejects entity types not in the allow-list', () => {
    const invalidTypes = ['Goal', 'User', 'ThoughtJournal', 'MoodEntry', 'CoachingSession'];
    for (const t of invalidTypes) {
      expect(ALLOWED_ENTITY_TYPES.includes(t)).toBe(false);
    }
  });
});

// ─── TESTS — Exercise ─────────────────────────────────────────────────────────

describe('buildDocument — Exercise', () => {
  const record = {
    id: 'ex-001',
    title: 'Box Breathing',
    summary: 'A four-count breathing technique to reduce anxiety.',
    instructions: 'Inhale for 4 counts, hold 4, exhale 4, hold 4.',
    category: 'breathing',
    difficulty: 'beginner',
    language: 'en',
    status: 'active',
    version: 2,
    slug: 'box-breathing',
    tags: ['breathing', 'anxiety'],
  };

  it('produces a document with a stable document_id', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.document_id).toBe('Exercise::ex-001');
  });

  it('includes the entity_type and record_id', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.entity_type).toBe('Exercise');
    expect(doc.record_id).toBe('ex-001');
  });

  it('concatenates primary text fields with double newlines', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.primary_text).toContain('A four-count breathing technique');
    expect(doc.primary_text).toContain('Inhale for 4 counts');
    expect(doc.primary_text).toContain('\n\n');
  });

  it('extracts title from title_field', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.title).toBe('Box Breathing');
  });

  it('preserves slug', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.slug).toBe('box-breathing');
  });

  it('extracts metadata fields correctly', () => {
    const doc = buildDocument('Exercise', 'ex-001', record);
    expect(doc.metadata.category).toBe('breathing');
    expect(doc.metadata.difficulty).toBe('beginner');
    expect(doc.metadata.tags).toEqual(['breathing', 'anxiety']);
  });

  it('does not include null metadata values', () => {
    const sparseRecord = { ...record, contraindications: null, benefits: undefined };
    const doc = buildDocument('Exercise', 'ex-001', sparseRecord);
    expect(doc.metadata).not.toHaveProperty('contraindications');
    expect(doc.metadata).not.toHaveProperty('benefits');
  });

  it('defaults language to "en" when not specified', () => {
    const noLangRecord = { ...record };
    delete noLangRecord.language;
    const doc = buildDocument('Exercise', 'ex-001', noLangRecord);
    expect(doc.language).toBe('en');
  });

  it('defaults version to 1 when not specified', () => {
    const noVersionRecord = { ...record };
    delete noVersionRecord.version;
    const doc = buildDocument('Exercise', 'ex-001', noVersionRecord);
    expect(doc.version).toBe(1);
  });
});

// ─── TESTS — Resource ─────────────────────────────────────────────────────────

describe('buildDocument — Resource', () => {
  const record = {
    id: 'res-001',
    title: 'Understanding CBT',
    summary: 'An introduction to cognitive behavioral therapy.',
    content: 'CBT helps you identify and change unhelpful thought patterns.',
    language: 'en',
    status: 'active',
    version: 1,
    slug: 'understanding-cbt',
    category: 'psychoeducation',
    type: 'article',
  };

  it('uses "title" as the title field for Resource', () => {
    const doc = buildDocument('Resource', 'res-001', record);
    expect(doc.title).toBe('Understanding CBT');
  });

  it('builds primary_text from summary and content', () => {
    const doc = buildDocument('Resource', 'res-001', record);
    expect(doc.primary_text).toContain('An introduction');
    expect(doc.primary_text).toContain('CBT helps you');
  });

  it('document_id uses entity_type::record_id format', () => {
    const doc = buildDocument('Resource', 'res-001', record);
    expect(doc.document_id).toBe('Resource::res-001');
  });
});

// ─── TESTS — JournalTemplate ──────────────────────────────────────────────────

describe('buildDocument — JournalTemplate', () => {
  const record = {
    id: 'jt-001',
    name: 'Morning Gratitude',
    summary: 'Reflect on three things you are grateful for.',
    guidance_text: 'Start each day with gratitude to set a positive tone.',
    language: 'en',
    status: 'active',
    version: 1,
    slug: 'morning-gratitude',
    entry_type: 'gratitude',
  };

  it('uses "name" as the title field for JournalTemplate', () => {
    const doc = buildDocument('JournalTemplate', 'jt-001', record);
    expect(doc.title).toBe('Morning Gratitude');
  });

  it('builds primary_text from summary and guidance_text', () => {
    const doc = buildDocument('JournalTemplate', 'jt-001', record);
    expect(doc.primary_text).toContain('Reflect on three things');
    expect(doc.primary_text).toContain('Start each day');
  });
});

// ─── TESTS — Psychoeducation ──────────────────────────────────────────────────

describe('buildDocument — Psychoeducation', () => {
  const record = {
    id: 'psy-001',
    title: 'What is Cognitive Distortion?',
    summary: 'Cognitive distortions are irrational thought patterns.',
    content: 'Examples include all-or-nothing thinking and catastrophizing.',
    language: 'en',
    status: 'active',
    version: 1,
    slug: 'cognitive-distortions',
    category: 'cognition',
    key_concepts: ['distortion', 'cognitive'],
  };

  it('builds document for Psychoeducation with summary and content', () => {
    const doc = buildDocument('Psychoeducation', 'psy-001', record);
    expect(doc.primary_text).toContain('irrational thought patterns');
    expect(doc.primary_text).toContain('all-or-nothing thinking');
  });

  it('document_id uses entity_type::record_id format', () => {
    const doc = buildDocument('Psychoeducation', 'psy-001', record);
    expect(doc.document_id).toBe('Psychoeducation::psy-001');
  });
});

// ─── TESTS — edge cases ───────────────────────────────────────────────────────

describe('buildDocument — edge cases', () => {
  it('returns null when no primary text fields have content', () => {
    const record = { id: 'ex-002', title: 'No Content Exercise', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-002', record);
    expect(doc).toBeNull();
  });

  it('returns null when all primary text fields are empty strings', () => {
    const record = { id: 'ex-003', title: 'Empty', summary: '', instructions: '  ', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-003', record);
    expect(doc).toBeNull();
  });

  it('trims whitespace from primary text fields before joining', () => {
    const record = { id: 'ex-004', title: 'Trimmed', summary: '  Hello world  ', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-004', record);
    expect(doc.primary_text).toBe('Hello world');
  });

  it('sets slug to null when record has no slug', () => {
    const record = { id: 'ex-005', title: 'No Slug', summary: 'Some content here', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-005', record);
    expect(doc.slug).toBeNull();
  });

  it('handles non-string primary text field values gracefully', () => {
    const record = { id: 'ex-006', title: 'Mixed', summary: 42, instructions: 'Real instructions', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-006', record);
    expect(doc.primary_text).toBe('Real instructions');
  });

  it('does not include empty-string metadata values', () => {
    const record = { id: 'ex-007', title: 'Sparse', summary: 'Content here', category: '', status: 'active' };
    const doc = buildDocument('Exercise', 'ex-007', record);
    expect(doc.metadata).not.toHaveProperty('category');
  });

  it('sets status to "active" as default when not specified', () => {
    const record = { id: 'ex-008', title: 'No Status', summary: 'Content here' };
    const doc = buildDocument('Exercise', 'ex-008', record);
    expect(doc.status).toBe('active');
  });
});

// ─── TESTS — no private field leakage ────────────────────────────────────────

describe('buildDocument — no private field leakage', () => {
  it('does not include private or user-identifying fields in metadata', () => {
    const record = {
      id: 'ex-009',
      title: 'Privacy Test',
      summary: 'Content',
      user_id: 'user-123',
      email: 'user@example.com',
      session_id: 'sess-abc',
      status: 'active',
    };
    const doc = buildDocument('Exercise', 'ex-009', record);
    expect(doc.metadata).not.toHaveProperty('user_id');
    expect(doc.metadata).not.toHaveProperty('email');
    expect(doc.metadata).not.toHaveProperty('session_id');
  });

  it('metadata only contains fields listed in ENTITY_FIELD_MAP.metadata_fields', () => {
    const record = {
      id: 'ex-010',
      title: 'Field Whitelist Test',
      summary: 'Content',
      category: 'breathing',
      arbitrary_field: 'should not appear',
      user_email: 'should not appear',
      status: 'active',
    };
    const doc = buildDocument('Exercise', 'ex-010', record);
    const allowedMetadataFields = ENTITY_FIELD_MAP.Exercise.metadata_fields;
    for (const key of Object.keys(doc.metadata)) {
      expect(allowedMetadataFields).toContain(key);
    }
  });
});

// ─── TESTS — flattenForPinecone ───────────────────────────────────────────────

describe('flattenForPinecone — primitive values', () => {
  it('passes string values through unchanged', () => {
    const flat = flattenForPinecone({ title: 'Box Breathing' });
    expect(flat.title).toBe('Box Breathing');
  });

  it('passes number values through unchanged', () => {
    const flat = flattenForPinecone({ version: 2 });
    expect(flat.version).toBe(2);
  });

  it('passes boolean values through unchanged', () => {
    const flat = flattenForPinecone({ is_active: true });
    expect(flat.is_active).toBe(true);
  });
});

describe('flattenForPinecone — null and undefined exclusion', () => {
  it('excludes null values', () => {
    const flat = flattenForPinecone({ slug: null, title: 'Test' });
    expect(flat).not.toHaveProperty('slug');
    expect(flat.title).toBe('Test');
  });

  it('excludes undefined values', () => {
    const flat = flattenForPinecone({ category: undefined, title: 'Test' });
    expect(flat).not.toHaveProperty('category');
  });

  it('returns empty object for empty input', () => {
    expect(flattenForPinecone({})).toEqual({});
  });

  it('returns empty object for null input', () => {
    expect(flattenForPinecone(null)).toEqual({});
  });
});

describe('flattenForPinecone — array values', () => {
  it('converts string arrays to string arrays', () => {
    const flat = flattenForPinecone({ tags: ['breathing', 'anxiety'] });
    expect(flat.tags).toEqual(['breathing', 'anxiety']);
  });

  it('converts number arrays to string arrays', () => {
    const flat = flattenForPinecone({ versions: [1, 2, 3] });
    expect(flat.versions).toEqual(['1', '2', '3']);
  });

  it('serializes object elements in arrays to JSON strings', () => {
    const flat = flattenForPinecone({ items: [{ name: 'test' }] });
    expect(flat.items[0]).toBe('{"name":"test"}');
  });
});

describe('flattenForPinecone — nested objects', () => {
  it('serializes nested objects to JSON strings', () => {
    const flat = flattenForPinecone({ config: { key: 'value', num: 42 } });
    expect(typeof flat.config).toBe('string');
    const parsed = JSON.parse(flat.config);
    expect(parsed.key).toBe('value');
    expect(parsed.num).toBe(42);
  });
});

describe('flattenForPinecone — realistic metadata round-trip', () => {
  it('handles a typical chunk metadata object correctly', () => {
    const metadata = {
      title: 'Box Breathing',
      category: 'breathing',
      difficulty: 'beginner',
      version: 1,
      tags: ['anxiety', 'stress'],
      is_published: true,
      nested_config: { key: 'val' },
      empty_field: null,
      undefined_field: undefined,
    };
    const flat = flattenForPinecone(metadata);
    expect(flat.title).toBe('Box Breathing');
    expect(flat.category).toBe('breathing');
    expect(flat.version).toBe(1);
    expect(flat.tags).toEqual(['anxiety', 'stress']);
    expect(flat.is_published).toBe(true);
    expect(typeof flat.nested_config).toBe('string');
    expect(flat).not.toHaveProperty('empty_field');
    expect(flat).not.toHaveProperty('undefined_field');
  });
});
