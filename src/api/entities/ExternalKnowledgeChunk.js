/**
 * @file src/api/entities/ExternalKnowledgeChunk.js
 *
 * Therapist Upgrade — Stage 2 Phase 4.2 — ExternalKnowledgeChunk Entity Definition
 *
 * This file is the repo-owned, first-class definition of the ExternalKnowledgeChunk
 * storage surface. It defines the complete field schema, field-name constants,
 * and the entity accessor used by the Phase 4.2 persistence adapter.
 *
 * PHASE 4.2 PURPOSE
 * -----------------
 * Phase 4.1 proved that chunk records can be built and stored in the in-process
 * Map store. Phase 4.2 closes the gap by defining ExternalKnowledgeChunk as a
 * real, repo-level Base44 entity — giving chunks a durable, first-class storage
 * surface that:
 *   1. Has a canonical, repo-level schema (field names, types, required flags).
 *   2. Has a typed entity accessor via the Base44 SDK client.
 *   3. Links back to its parent ExternalKnowledgeSource via source_id and
 *      external_source_record_id (the Base44 record ID of the parent source).
 *
 * STORAGE SURFACE
 * ---------------
 * ExternalKnowledgeChunk is a real Base44 entity. Each record stores one
 * atomic text chunk from an approved external trusted-knowledge source, along
 * with full provenance and source-linkage fields. Chunks are ordered by
 * chunk_index within a source and support forward compatibility with the Phase 5+
 * retrieval orchestrator.
 *
 * SOURCE SEPARATION
 * -----------------
 * Every record carries content_source_type = 'external_trusted'. This field
 * is non-overridable (enforced by createChunkRecord in externalKnowledgeChunk.js).
 * It separates chunk records from internal content (Exercise, Resource,
 * JournalTemplate, Psychoeducation), which carry entity_type = one of those names
 * and do NOT carry content_source_type = 'external_trusted'.
 *
 * SOURCE / CHUNK LINKAGE
 * ----------------------
 * - source_id: stable registry identifier of the parent source (e.g. 'who-mhgap-ig-v2').
 * - external_source_record_id: Base44 record ID of the parent ExternalKnowledgeSource
 *   record, populated by the persistence adapter after the source is written.
 * - chunk_index + total_chunks: positional ordering within the source.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This file does NOT connect to the therapist runtime, agent wiring, or any
 * retrieval pipeline. It is a passive schema-and-accessor definition only.
 *
 * ROLLBACK
 * --------
 * Removing this file has no effect on the current therapist path. The in-memory
 * chunk store (externalKnowledgeStore.js) continues to work independently.
 *
 * What this file must NOT do:
 * - Modify any existing entity
 * - Connect to agent wiring or retrieval
 * - Store or index private user data
 * - Alter current therapist behavior
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4.2
 */

// ─── Entity name ──────────────────────────────────────────────────────────────

/**
 * Canonical Base44 entity name for the external trusted-knowledge chunk surface.
 * This must match the entity name registered in the Base44 admin panel.
 *
 * @type {string}
 */
export const EXTERNAL_KNOWLEDGE_CHUNK_ENTITY_NAME = 'ExternalKnowledgeChunk';

// ─── Field name constants ─────────────────────────────────────────────────────

/**
 * Canonical field names for ExternalKnowledgeChunk records.
 * Use these constants instead of raw strings throughout the persistence adapter
 * and tests to avoid silent typo regressions.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EXTERNAL_KNOWLEDGE_CHUNK_FIELDS = Object.freeze({
  /** Unique chunk identifier (e.g. 'who-mhgap-ig-v2::chunk_0'). */
  CHUNK_ID:                  'chunk_id',
  /** Stable registry identifier of the parent source (e.g. 'who-mhgap-ig-v2'). */
  SOURCE_ID:                 'source_id',
  /** Base44 record ID of the parent ExternalKnowledgeSource record. */
  EXTERNAL_SOURCE_RECORD_ID: 'external_source_record_id',
  /** Canonical URL of the source document. */
  SOURCE_URL:                'source_url',
  /** Human-readable title of the source document. */
  SOURCE_TITLE:              'source_title',
  /** Publishing organization or authority. */
  PUBLISHER:                 'publisher',
  /** Registered domain of the publisher. */
  DOMAIN:                    'domain',
  /** ISO-8601 timestamp of when the source was retrieved. */
  RETRIEVAL_DATE:            'retrieval_date',
  /** 0-based positional index of this chunk within the source. */
  CHUNK_INDEX:               'chunk_index',
  /** Total number of chunks produced from this source. */
  TOTAL_CHUNKS:              'total_chunks',
  /** Plain-text content of this chunk. */
  CHUNK_TEXT:                'chunk_text',
  /** Character count of chunk_text. */
  CHARACTER_COUNT:           'character_count',
  /** Source separation marker — always 'external_trusted'. */
  CONTENT_SOURCE_TYPE:       'content_source_type',
  /** Entity type marker for forward-compatibility with retrieval orchestrator. */
  ENTITY_TYPE:               'entity_type',
  /** BCP-47 language tag (default: 'en'). */
  LANGUAGE:                  'language',
  /** Ingestion schema version (default: 1). */
  VERSION:                   'version',
  /** Arbitrary structured metadata (default: {}). */
  METADATA:                  'metadata',
});

// ─── Entity schema definition ─────────────────────────────────────────────────

/**
 * Canonical schema for ExternalKnowledgeChunk records.
 *
 * Each entry describes:
 * - type: JS type of the field value.
 * - required: whether the field must be present and non-empty.
 * - constantValue: (optional) the only value this field may ever hold.
 * - description: human-readable field purpose.
 *
 * This schema is used by validateExternalKnowledgeChunkRecord() below and by
 * Phase 4.2 tests to verify structural completeness.
 *
 * @type {Readonly<Record<string, object>>}
 */
export const EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA = Object.freeze({
  chunk_id: {
    type: 'string',
    required: true,
    description: 'Unique chunk identifier',
  },
  source_id: {
    type: 'string',
    required: true,
    description: 'Stable registry identifier of the parent source',
  },
  external_source_record_id: {
    type: 'string',
    required: false,
    description: 'Base44 record ID of the parent ExternalKnowledgeSource record',
  },
  source_url: {
    type: 'string',
    required: true,
    description: 'Canonical URL of the source document',
  },
  source_title: {
    type: 'string',
    required: false,
    description: 'Human-readable title of the source document',
  },
  publisher: {
    type: 'string',
    required: true,
    description: 'Publishing organization or authority',
  },
  domain: {
    type: 'string',
    required: true,
    description: 'Registered domain of the publisher',
  },
  retrieval_date: {
    type: 'string',
    required: true,
    description: 'ISO-8601 timestamp of when this source was retrieved',
  },
  chunk_index: {
    type: 'number',
    required: true,
    description: '0-based positional index of this chunk within the source',
  },
  total_chunks: {
    type: 'number',
    required: false,
    description: 'Total number of chunks produced from this source',
  },
  chunk_text: {
    type: 'string',
    required: true,
    description: 'Plain-text content of this chunk',
  },
  character_count: {
    type: 'number',
    required: false,
    description: 'Character count of chunk_text',
  },
  content_source_type: {
    type: 'string',
    required: true,
    constantValue: 'external_trusted',
    description: 'Source separation marker — always "external_trusted"',
  },
  entity_type: {
    type: 'string',
    required: false,
    description: 'Entity type marker for retrieval orchestrator compatibility',
  },
  language: {
    type: 'string',
    required: false,
    description: 'BCP-47 language tag (default "en")',
  },
  version: {
    type: 'number',
    required: false,
    description: 'Ingestion schema version (default 1)',
  },
  metadata: {
    type: 'object',
    required: false,
    description: 'Arbitrary structured metadata',
  },
});

/**
 * Required fields — the minimum set that must be present and non-empty in
 * every valid ExternalKnowledgeChunk record.
 *
 * @type {ReadonlyArray<string>}
 */
export const REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS = Object.freeze(
  Object.entries(EXTERNAL_KNOWLEDGE_CHUNK_SCHEMA)
    .filter(([, def]) => def.required)
    .map(([field]) => field),
);

// ─── Schema validation helper ─────────────────────────────────────────────────

/**
 * Validates a plain-object record against the ExternalKnowledgeChunk schema.
 *
 * Checks:
 * 1. All required fields are present and non-empty.
 * 2. content_source_type is exactly 'external_trusted'.
 * 3. chunk_index is a non-negative integer.
 *
 * Returns { valid: true } on success, or
 * { valid: false, missing: string[], invalid: string[] } on failure.
 *
 * @param {object} record
 * @returns {{ valid: boolean, missing?: string[], invalid?: string[] }}
 */
export function validateExternalKnowledgeChunkRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, missing: REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.slice(), invalid: [] };
  }

  const missing = REQUIRED_EXTERNAL_KNOWLEDGE_CHUNK_FIELDS.filter(
    (field) => {
      const val = record[field];
      // chunk_index = 0 is valid (falsy but not empty)
      if (field === 'chunk_index') return val === undefined || val === null || val === '';
      return val === undefined || val === null || val === '';
    },
  );

  const invalid = [];

  // Source separation guard
  if (record.content_source_type !== 'external_trusted') {
    invalid.push('content_source_type');
  }

  // chunk_index must be a non-negative integer
  if (record.chunk_index !== undefined && record.chunk_index !== null) {
    if (typeof record.chunk_index !== 'number' || !Number.isInteger(record.chunk_index) || record.chunk_index < 0) {
      invalid.push('chunk_index');
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { valid: false, missing, invalid };
  }
  return { valid: true };
}

