/**
 * @file src/lib/trustedCBTChunk.js
 *
 * TrustedCBTChunk — Model constants, factory, and validation helpers.
 *
 * PURPOSE
 * -------
 * TrustedCBTChunk records are a specialised subset of ExternalKnowledgeChunk
 * records that carry CBT-specific metadata fields alongside the standard
 * provenance fields. They are designed to be stored in the ExternalKnowledgeChunk
 * entity surface (content_source_type = 'external_trusted',
 * entity_type = 'TrustedCBTChunk') and retrieved by the Phase 5+ retrieval
 * orchestrator for CBT technique guidance.
 *
 * SCHEMA RELATIONSHIP
 * -------------------
 * A TrustedCBTChunk record is a valid ExternalKnowledgeChunk record — it carries
 * all required ExternalKnowledgeChunk fields — plus three optional CBT-specific
 * fields: cbt_topic, technique, and evidence_level. Validation helpers in this
 * module enforce both layers.
 *
 * CBT-SPECIFIC FIELDS
 * -------------------
 * cbt_topic     — CBT technique domain (e.g. 'cognitive_restructuring').
 * technique     — Specific CBT technique name (e.g. 'thought records').
 * evidence_level — Evidence strength: 'high', 'moderate', or 'low'.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module contains only model definitions and pure factory/validation
 * helpers. It does NOT interact with the Base44 SDK, the vector store, or
 * the current therapist runtime.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime or agent wiring
 * - Modify existing entity schemas
 * - Write to any database or vector store
 * - Import from base44/functions/ (Deno code)
 */

import { EXTERNAL_CONTENT_SOURCE_TYPE } from './externalKnowledgeSource.js';

// ─── Entity type marker ───────────────────────────────────────────────────────

/**
 * entity_type value that marks a chunk as a TrustedCBTChunk.
 * Used by the retrieval orchestrator to filter CBT chunks at query time.
 *
 * @type {string}
 */
export const TRUSTED_CBT_CHUNK_ENTITY_TYPE = 'TrustedCBTChunk';

// ─── CBT topic enum ───────────────────────────────────────────────────────────

/**
 * Approved CBT topic areas for TrustedCBTChunk records.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_TOPICS = Object.freeze({
  COGNITIVE_RESTRUCTURING: 'cognitive_restructuring',
  BEHAVIORAL_ACTIVATION:   'behavioral_activation',
  EXPOSURE_THERAPY:        'exposure_therapy',
  PSYCHOEDUCATION:         'psychoeducation',
  PROBLEM_SOLVING:         'problem_solving',
  RELAXATION:              'relaxation',
  SAFETY_PLANNING:         'safety_planning',
  ASSESSMENT:              'assessment',
  MINDFULNESS:             'mindfulness',
  TRAUMA_INFORMED:         'trauma_informed',
});

// ─── Evidence level enum ──────────────────────────────────────────────────────

/**
 * Evidence strength levels for TrustedCBTChunk records.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EVIDENCE_LEVELS = Object.freeze({
  HIGH:     'high',
  MODERATE: 'moderate',
  LOW:      'low',
});

// ─── Field name constants ─────────────────────────────────────────────────────

/**
 * Canonical field names for TrustedCBTChunk records.
 * Includes all ExternalKnowledgeChunk fields plus CBT-specific extensions.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TRUSTED_CBT_CHUNK_FIELDS = Object.freeze({
  // ── Inherited from ExternalKnowledgeChunk ──────────────────────────────────
  CHUNK_ID:                  'chunk_id',
  SOURCE_ID:                 'source_id',
  EXTERNAL_SOURCE_RECORD_ID: 'external_source_record_id',
  SOURCE_URL:                'source_url',
  SOURCE_TITLE:              'source_title',
  PUBLISHER:                 'publisher',
  DOMAIN:                    'domain',
  RETRIEVAL_DATE:            'retrieval_date',
  CHUNK_INDEX:               'chunk_index',
  TOTAL_CHUNKS:              'total_chunks',
  CHUNK_TEXT:                'chunk_text',
  CHARACTER_COUNT:           'character_count',
  CONTENT_SOURCE_TYPE:       'content_source_type',
  ENTITY_TYPE:               'entity_type',
  LANGUAGE:                  'language',
  VERSION:                   'version',
  METADATA:                  'metadata',
  // ── CBT-specific extensions ────────────────────────────────────────────────
  /** CBT technique domain — one of CBT_TOPICS values. */
  CBT_TOPIC:                 'cbt_topic',
  /** Specific CBT technique name (free-form, e.g. 'thought records'). */
  TECHNIQUE:                 'technique',
  /** Evidence strength — one of EVIDENCE_LEVELS values. */
  EVIDENCE_LEVEL:            'evidence_level',
});

// ─── Schema definition ────────────────────────────────────────────────────────

/**
 * Canonical schema for TrustedCBTChunk records.
 *
 * Each entry describes:
 * - type: JS type of the field value.
 * - required: whether the field must be present and non-empty.
 * - constantValue: (optional) the only value this field may ever hold.
 * - allowedValues: (optional) set of permitted values.
 * - description: human-readable field purpose.
 *
 * @type {Readonly<Record<string, object>>}
 */
export const TRUSTED_CBT_CHUNK_SCHEMA = Object.freeze({
  chunk_id: {
    type: 'string',
    required: true,
    description: 'Unique chunk identifier (e.g. "trusted-cbt::who-mhgap-ig-v2::chunk_0")',
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
    description: 'Plain-text CBT content of this chunk',
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
    required: true,
    constantValue: TRUSTED_CBT_CHUNK_ENTITY_TYPE,
    description: 'Entity type marker — always "TrustedCBTChunk"',
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
  // ── CBT-specific fields ────────────────────────────────────────────────────
  cbt_topic: {
    type: 'string',
    required: false,
    allowedValues: Object.values(CBT_TOPICS),
    description: 'CBT technique domain — one of the CBT_TOPICS values',
  },
  technique: {
    type: 'string',
    required: false,
    description: 'Specific CBT technique name (e.g. "thought records")',
  },
  evidence_level: {
    type: 'string',
    required: false,
    allowedValues: Object.values(EVIDENCE_LEVELS),
    description: 'Evidence strength — "high", "moderate", or "low"',
  },
});

/**
 * Required fields — the minimum set that must be present and non-empty in
 * every valid TrustedCBTChunk record.
 *
 * @type {ReadonlyArray<string>}
 */
export const REQUIRED_TRUSTED_CBT_CHUNK_FIELDS = Object.freeze(
  Object.entries(TRUSTED_CBT_CHUNK_SCHEMA)
    .filter(([, def]) => def.required)
    .map(([field]) => field),
);

// ─── Chunk record factory ─────────────────────────────────────────────────────

/**
 * Creates a new TrustedCBTChunk record with all required provenance fields
 * and CBT-specific extension fields.
 *
 * The content_source_type field is always set to 'external_trusted' and cannot
 * be overridden. The entity_type field is always set to 'TrustedCBTChunk'.
 *
 * Returns a plain object — no Base44 SDK calls, no side effects.
 *
 * @param {object} fields
 * @returns {object}
 */
export function createTrustedCBTChunkRecord(fields = {}) {
  const text = fields.chunk_text ?? '';
  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    chunk_id:                  fields.chunk_id                  ?? '',
    source_id:                 fields.source_id                 ?? '',
    external_source_record_id: fields.external_source_record_id ?? null,

    // ── Provenance ────────────────────────────────────────────────────────────
    source_url:                fields.source_url                ?? '',
    source_title:              fields.source_title              ?? '',
    publisher:                 fields.publisher                 ?? '',
    domain:                    fields.domain                    ?? '',
    retrieval_date:            fields.retrieval_date            ?? new Date().toISOString(),

    // ── Chunk content ─────────────────────────────────────────────────────────
    chunk_index:               fields.chunk_index               ?? 0,
    total_chunks:              fields.total_chunks              ?? 1,
    chunk_text:                text,
    character_count:           text.length,

    // ── Source separation and entity type markers ─────────────────────────────
    // These fields are intentionally not overridable.
    content_source_type:       EXTERNAL_CONTENT_SOURCE_TYPE,
    entity_type:               TRUSTED_CBT_CHUNK_ENTITY_TYPE,

    // ── Indexing compatibility fields ─────────────────────────────────────────
    language:                  fields.language                  ?? 'en',
    version:                   fields.version                   ?? 1,
    metadata:                  fields.metadata                  ?? {},

    // ── CBT-specific extension fields ─────────────────────────────────────────
    cbt_topic:                 fields.cbt_topic                 ?? null,
    technique:                 fields.technique                 ?? null,
    evidence_level:            fields.evidence_level            ?? null,
  };
}

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Validates a plain-object record against the TrustedCBTChunk schema.
 *
 * Checks:
 * 1. All required fields are present and non-empty.
 * 2. content_source_type is exactly 'external_trusted'.
 * 3. entity_type is exactly 'TrustedCBTChunk'.
 * 4. chunk_index is a non-negative integer.
 * 5. cbt_topic, if present, is one of the approved CBT_TOPICS values.
 * 6. evidence_level, if present, is one of the approved EVIDENCE_LEVELS values.
 *
 * Returns { valid: true } on success, or
 * { valid: false, missing: string[], invalid: string[] } on failure.
 *
 * @param {object} record
 * @returns {{ valid: boolean, missing?: string[], invalid?: string[] }}
 */
export function validateTrustedCBTChunkRecord(record) {
  if (!record || typeof record !== 'object') {
    return {
      valid: false,
      missing: REQUIRED_TRUSTED_CBT_CHUNK_FIELDS.slice(),
      invalid: [],
    };
  }

  const missing = REQUIRED_TRUSTED_CBT_CHUNK_FIELDS.filter((field) => {
    const val = record[field];
    // chunk_index = 0 is valid (falsy but not empty)
    if (field === 'chunk_index') return val === undefined || val === null || val === '';
    return val === undefined || val === null || val === '';
  });

  const invalid = [];

  // Source separation guard
  if (record.content_source_type !== EXTERNAL_CONTENT_SOURCE_TYPE) {
    invalid.push('content_source_type');
  }

  // Entity type guard
  if (record.entity_type !== TRUSTED_CBT_CHUNK_ENTITY_TYPE) {
    invalid.push('entity_type');
  }

  // chunk_index must be a non-negative integer
  if (record.chunk_index !== undefined && record.chunk_index !== null && record.chunk_index !== '') {
    if (
      typeof record.chunk_index !== 'number' ||
      !Number.isInteger(record.chunk_index) ||
      record.chunk_index < 0
    ) {
      invalid.push('chunk_index');
    }
  }

  // cbt_topic must be an approved value when present
  if (record.cbt_topic !== undefined && record.cbt_topic !== null) {
    if (!Object.values(CBT_TOPICS).includes(record.cbt_topic)) {
      invalid.push('cbt_topic');
    }
  }

  // evidence_level must be an approved value when present
  if (record.evidence_level !== undefined && record.evidence_level !== null) {
    if (!Object.values(EVIDENCE_LEVELS).includes(record.evidence_level)) {
      invalid.push('evidence_level');
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { valid: false, missing, invalid };
  }
  return { valid: true };
}

/**
 * Validates all records in an array, returning a per-record result array.
 *
 * Each result entry is:
 *   { index: number, chunk_id: string, result: ValidationResult }
 *
 * @param {object[]} records
 * @returns {Array<{ index: number, chunk_id: string, result: object }>}
 */
export function validateTrustedCBTChunkBatch(records) {
  if (!Array.isArray(records)) {
    return [];
  }
  return records.map((record, index) => ({
    index,
    chunk_id: record?.chunk_id ?? '',
    result: validateTrustedCBTChunkRecord(record),
  }));
}
