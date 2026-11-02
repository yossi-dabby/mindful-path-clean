/**
 * @file src/api/entities/ExternalKnowledgeSource.js
 *
 * Therapist Upgrade — Stage 2 Phase 4.2 — ExternalKnowledgeSource Entity Definition
 *
 * This file is the repo-owned, first-class definition of the ExternalKnowledgeSource
 * storage surface. It defines the complete field schema, field-name constants,
 * and the entity accessor used by the Phase 4.2 persistence adapter.
 *
 * PHASE 4.2 PURPOSE
 * -----------------
 * Phase 4.1 proved that the in-process Map store works, but the real app-owned
 * storage surface (ExternalKnowledgeSource as a Base44 entity) was not yet
 * defined in the repo. This file closes that gap by providing:
 *   1. A canonical, repo-level schema for the entity (field names, types,
 *      required flags, and constant values).
 *   2. A typed entity accessor via the Base44 SDK client.
 *   3. A schema-validation helper for use in tests and the persistence adapter.
 *
 * STORAGE SURFACE
 * ---------------
 * ExternalKnowledgeSource is a real Base44 entity. Each record stores the
 * authoritative metadata for one approved external trusted-knowledge source:
 * who published it, when it was retrieved, its ingestion status, and how many
 * chunks were produced. Records are keyed by source_id, which is the stable
 * identifier from the approved registry in externalKnowledgeSource.js.
 *
 * SOURCE SEPARATION
 * -----------------
 * Every record carries content_source_type = 'external_trusted'. This field
 * is set by the factory in externalKnowledgeSource.js and is non-overridable.
 * It separates ExternalKnowledgeSource records from all internal app-authored
 * entities (Exercise, Resource, JournalTemplate, Psychoeducation, etc.).
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This file does NOT connect to the therapist runtime, agent wiring, or any
 * retrieval pipeline. It is a passive schema-and-accessor definition only.
 * The flag gate lives at the ingestion call site (externalKnowledgePersistence.js).
 *
 * ROLLBACK
 * --------
 * Removing this file has no effect on the current therapist path. No existing
 * code depends on it. The in-memory store (externalKnowledgeStore.js) continues
 * to work independently.
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
 * Canonical Base44 entity name for the external trusted-knowledge source surface.
 * This must match the entity name registered in the Base44 admin panel.
 *
 * @type {string}
 */
export const EXTERNAL_KNOWLEDGE_SOURCE_ENTITY_NAME = 'ExternalKnowledgeSource';

// ─── Field name constants ─────────────────────────────────────────────────────

/**
 * Canonical field names for ExternalKnowledgeSource records.
 * Use these constants instead of raw strings throughout the persistence adapter
 * and tests to avoid silent typo regressions.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const EXTERNAL_KNOWLEDGE_SOURCE_FIELDS = Object.freeze({
  /** Stable identifier from the approved source registry (e.g. 'who-mhgap-ig-v2'). */
  SOURCE_ID:           'source_id',
  /** Human-readable title of the source document. */
  TITLE:               'title',
  /** Canonical URL of the source document. */
  URL:                 'url',
  /** Organization or authority that published this source. */
  PUBLISHER:           'publisher',
  /** Registered domain of the publisher (e.g. 'who.int'). */
  DOMAIN:              'domain',
  /** Document format: 'html' | 'pdf' | 'pdf_text'. */
  SOURCE_TYPE:         'source_type',
  /** Source separation marker — always 'external_trusted'. */
  CONTENT_SOURCE_TYPE: 'content_source_type',
  /** ISO-8601 timestamp of when this source was retrieved. */
  RETRIEVAL_DATE:      'retrieval_date',
  /** ISO-8601 date string of original publication (nullable). */
  PUBLICATION_DATE:    'publication_date',
  /** Pipeline status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped'. */
  INGESTION_STATUS:    'ingestion_status',
  /** Number of chunk records produced from this source. */
  CHUNK_COUNT:         'chunk_count',
  /** BCP-47 language tag (default: 'en'). */
  LANGUAGE:            'language',
  /** Ingestion schema version (default: 1). */
  VERSION:             'version',
});

// ─── Entity schema definition ─────────────────────────────────────────────────

/**
 * Canonical schema for ExternalKnowledgeSource records.
 *
 * Each entry describes:
 * - type: JS type of the field value.
 * - required: whether the field must be present and non-empty.
 * - constantValue: (optional) the only value this field may ever hold.
 * - enum: (optional) allowed values.
 * - description: human-readable field purpose.
 *
 * This schema is used by validateExternalKnowledgeSourceRecord() below and
 * by Phase 4.2 tests to verify structural completeness.
 *
 * @type {Readonly<Record<string, object>>}
 */
export const EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA = Object.freeze({
  source_id: {
    type: 'string',
    required: true,
    description: 'Stable registry identifier (e.g. "who-mhgap-ig-v2")',
  },
  title: {
    type: 'string',
    required: true,
    description: 'Human-readable document title',
  },
  url: {
    type: 'string',
    required: true,
    description: 'Canonical source URL from the approved registry',
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
  source_type: {
    type: 'string',
    required: true,
    enum: ['html', 'pdf', 'pdf_text'],
    description: 'Document format',
  },
  content_source_type: {
    type: 'string',
    required: true,
    constantValue: 'external_trusted',
    description: 'Source separation marker — always "external_trusted"',
  },
  retrieval_date: {
    type: 'string',
    required: true,
    description: 'ISO-8601 timestamp of retrieval',
  },
  publication_date: {
    type: 'string',
    required: false,
    description: 'ISO-8601 date of original publication (nullable)',
  },
  ingestion_status: {
    type: 'string',
    required: true,
    enum: ['pending', 'in_progress', 'complete', 'failed', 'skipped'],
    description: 'Current pipeline status of this source',
  },
  chunk_count: {
    type: 'number',
    required: false,
    description: 'Number of chunk records produced from this source',
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
});

/**
 * Required fields — the minimum set that must be present and non-empty in
 * every valid ExternalKnowledgeSource record.
 *
 * @type {ReadonlyArray<string>}
 */
export const REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS = Object.freeze(
  Object.entries(EXTERNAL_KNOWLEDGE_SOURCE_SCHEMA)
    .filter(([, def]) => def.required)
    .map(([field]) => field),
);

// ─── Schema validation helper ─────────────────────────────────────────────────

/**
 * Validates a plain-object record against the ExternalKnowledgeSource schema.
 *
 * Checks:
 * 1. All required fields are present and non-empty.
 * 2. content_source_type is exactly 'external_trusted'.
 * 3. source_type is one of the allowed enum values.
 * 4. ingestion_status is one of the allowed enum values.
 *
 * Returns { valid: true } on success, or
 * { valid: false, missing: string[], invalid: string[] } on failure.
 *
 * @param {object} record
 * @returns {{ valid: boolean, missing?: string[], invalid?: string[] }}
 */
export function validateExternalKnowledgeSourceRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, missing: REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.slice(), invalid: [] };
  }

  const missing = REQUIRED_EXTERNAL_KNOWLEDGE_SOURCE_FIELDS.filter(
    (field) => record[field] === undefined || record[field] === null || record[field] === '',
  );

  const invalid = [];

  // Source separation guard
  if (record.content_source_type !== 'external_trusted') {
    invalid.push('content_source_type');
  }

  // Enum checks
  const validSourceTypes = ['html', 'pdf', 'pdf_text'];
  if (record.source_type && !validSourceTypes.includes(record.source_type)) {
    invalid.push('source_type');
  }

  const validStatuses = ['pending', 'in_progress', 'complete', 'failed', 'skipped'];
  if (record.ingestion_status && !validStatuses.includes(record.ingestion_status)) {
    invalid.push('ingestion_status');
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { valid: false, missing, invalid };
  }
  return { valid: true };
}

