/**
 * STAGE 2 — KNOWLEDGE BASE FOUNDATION
 * buildContentDocument
 *
 * Normalizes a single shared content entity record into a standardized
 * retrieval-ready document structure. This document format is the input
 * contract for chunkContentDocument and upsertKnowledgeIndex.
 *
 * SCOPE: Works ONLY on the 4 shared content entity types defined in Stage 1.
 * Does NOT touch any user-private records (MoodEntry, ThoughtJournal, Goal, etc.).
 * Does NOT connect to any agent. Does NOT change any app behavior.
 *
 * INPUT:
 *   { entity_type: string, record_id: string }
 *
 * OUTPUT:
 *   { document: object | null, skipped: boolean, reason?: string }
 *
 * BEHAVIOR:
 *   - Admin-only.
 *   - Returns skipped=true for non-active records (draft, archived).
 *   - Pure data normalization — no external calls, no side effects.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// The only entity types this function is permitted to handle.
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

/**
 * Per-entity field maps.
 * primary_text_fields: concatenated into the main text body for embedding.
 * metadata_fields: carried forward as structured metadata on the document.
 * title_field: which field holds the human-readable title.
 */
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

/**
 * Fetch a single record from the allowed content entities using service role.
 */
async function fetchRecord(base44, entity_type, record_id) {
  switch (entity_type) {
    case 'Exercise':
      return (await base44.asServiceRole.entities.Exercise.filter({ id: record_id }))?.[0] ?? null;
    case 'Resource':
      return (await base44.asServiceRole.entities.Resource.filter({ id: record_id }))?.[0] ?? null;
    case 'JournalTemplate':
      return (await base44.asServiceRole.entities.JournalTemplate.filter({ id: record_id }))?.[0] ?? null;
    case 'Psychoeducation':
      return (await base44.asServiceRole.entities.Psychoeducation.filter({ id: record_id }))?.[0] ?? null;
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { entity_type, record_id } = body;

    // Validate entity_type
    if (!entity_type || !ALLOWED_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({
        error: `Invalid entity_type. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // Validate record_id
    if (!record_id || typeof record_id !== 'string') {
      return Response.json({ error: 'record_id must be a non-empty string' }, { status: 400 });
    }

    const record = await fetchRecord(base44, entity_type, record_id);
    if (!record) {
      return Response.json({
        error: `Record not found: ${entity_type} / ${record_id}`,
      }, { status: 404 });
    }

    // Safety gate: only index active records.
    // draft and archived records must not enter the knowledge index.
    if (record.status && record.status !== 'active') {
      return Response.json({
        document: null,
        skipped: true,
        reason: `Record status is '${record.status}'. Only 'active' records are eligible for indexing.`,
      });
    }

    const fieldMap = ENTITY_FIELD_MAP[entity_type];

    // Build the primary text body: concatenate all non-empty primary text fields.
    const primary_text = fieldMap.primary_text_fields
      .map(f => (record[f] && typeof record[f] === 'string' ? record[f].trim() : ''))
      .filter(Boolean)
      .join('\n\n');

    if (!primary_text) {
      return Response.json({
        document: null,
        skipped: true,
        reason: 'No primary text content found. Record may lack instructions, content, or summary.',
      });
    }

    // Extract metadata (only defined, non-null values).
    const metadata = {};
    for (const f of fieldMap.metadata_fields) {
      const val = record[f];
      if (val !== undefined && val !== null && val !== '') {
        metadata[f] = val;
      }
    }

    // The stable document_id format: EntityType::record_id
    // (slug used as secondary stable reference if present)
    const document_id = `${entity_type}::${record_id}`;

    const document = {
      document_id,
      entity_type,
      record_id,
      title: record[fieldMap.title_field] || '',
      slug: record.slug || null,
      primary_text,
      character_count: primary_text.length,
      metadata,
      language: record.language || 'en',
      status: record.status || 'active',
      version: record.version || 1,
      created_at: record.created_date || null,
      updated_at: record.updated_date || null,
    };

    return Response.json({ document, skipped: false });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});