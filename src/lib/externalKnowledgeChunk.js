/**
 * @file src/lib/externalKnowledgeChunk.js
 *
 * Therapist Upgrade — Stage 2 Phase 4 — External Knowledge Chunk Model
 *
 * Defines the shape of external trusted-knowledge chunk records. Chunks are
 * the atomic units stored in the knowledge index for later retrieval.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module contains only model definitions and pure factory/validation
 * helpers. It does NOT interact with the vector store, the Base44 SDK, or
 * the current therapist runtime.
 *
 * SOURCE SEPARATION
 * -----------------
 * All external chunks carry content_source_type = 'external_trusted' (imported
 * from externalKnowledgeSource.js). This field is the primary type-separator
 * between external and internal content at retrieval time.
 *
 * Internal content chunks (from Exercise, Resource, JournalTemplate,
 * Psychoeducation) carry entity_type = one of those entity names and do NOT
 * carry content_source_type = 'external_trusted'. The separation is clean
 * and non-overlapping.
 *
 * PROVENANCE PRESERVATION
 * -----------------------
 * Every chunk record carries enough provenance to support trusted retrieval
 * in future phases. The required fields are defined in
 * REQUIRED_CHUNK_PROVENANCE_FIELDS and validated by validateChunkProvenance().
 *
 * INDEXING COMPATIBILITY
 * ----------------------
 * The chunk record shape is designed to be compatible with the existing
 * internal chunking format (from chunkContentDocument) as far as possible,
 * while adding provenance fields specific to external sources. This ensures
 * that a future retrieval phase can query both internal and external chunks
 * with the same interface.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime
 * - Modify existing entity schemas
 * - Write to any database or vector store
 * - Import from base44/functions/ (Deno code)
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4
 */

import { EXTERNAL_CONTENT_SOURCE_TYPE } from './externalKnowledgeSource.js';

// ─── Required provenance fields ───────────────────────────────────────────────

/**
 * The minimum set of provenance fields that every external chunk record must
 * carry. Used by validateChunkProvenance() to enforce completeness.
 *
 * @type {ReadonlyArray<string>}
 */
export const REQUIRED_CHUNK_PROVENANCE_FIELDS = Object.freeze([
  'chunk_id',
  'source_id',
  'source_url',
  'publisher',
  'domain',
  'retrieval_date',
  'chunk_index',
  'chunk_text',
  'content_source_type',
]);

// ─── Chunk record factory ─────────────────────────────────────────────────────

/**
 * Creates a new external knowledge chunk record with all required provenance
 * and indexing-compatibility fields.
 *
 * The content_source_type field is always set to EXTERNAL_CONTENT_SOURCE_TYPE
 * ('external_trusted') and cannot be overridden. This guarantees type
 * separation between external and internal content at retrieval time.
 *
 * Returns a plain object — no Base44 SDK calls, no side effects.
 *
 * @param {object} fields
 * @returns {object}
 */
export function createChunkRecord(fields = {}) {
  const text = fields.chunk_text ?? '';
  return {
    // ── Identity ─────────────────────────────────────────────────────────────
    chunk_id:           fields.chunk_id           ?? '',
    source_id:          fields.source_id          ?? '',

    // ── Provenance ────────────────────────────────────────────────────────────
    source_url:         fields.source_url         ?? '',
    source_title:       fields.source_title       ?? '',
    publisher:          fields.publisher          ?? '',
    domain:             fields.domain             ?? '',
    retrieval_date:     fields.retrieval_date     ?? new Date().toISOString(),
    publication_date:   fields.publication_date   ?? null,
    // Section or page context (section heading for HTML, page number for PDF)
    section_context:    fields.section_context    ?? null,
    page_number:        fields.page_number        ?? null,

    // ── Chunk content ─────────────────────────────────────────────────────────
    chunk_index:        fields.chunk_index        ?? 0,
    total_chunks:       fields.total_chunks       ?? 1,
    chunk_text:         text,
    character_count:    text.length,

    // ── Source separation marker ──────────────────────────────────────────────
    // This field is intentionally not overridable.
    content_source_type: EXTERNAL_CONTENT_SOURCE_TYPE,

    // ── Indexing compatibility fields ─────────────────────────────────────────
    // Mirrors the shape used by internal chunks for forward compatibility with
    // the retrieval orchestrator (Phase 5+).
    language:           fields.language           ?? 'en',
    version:            fields.version            ?? 1,
    metadata:           fields.metadata           ?? {},
  };
}

// ─── Provenance validator ─────────────────────────────────────────────────────

/**
 * Validates that a chunk record carries all required provenance fields.
 *
 * Returns { valid: true } if the chunk is well-formed.
 * Returns { valid: false, missing: string[] } if any required fields are
 * absent or empty.
 *
 * Also validates that content_source_type is exactly 'external_trusted'.
 *
 * @param {object} chunk
 * @returns {{ valid: boolean, missing?: string[] }}
 */
export function validateChunkProvenance(chunk) {
  if (!chunk || typeof chunk !== 'object') {
    return { valid: false, missing: REQUIRED_CHUNK_PROVENANCE_FIELDS.slice() };
  }

  const missing = REQUIRED_CHUNK_PROVENANCE_FIELDS.filter(
    (field) => chunk[field] === undefined || chunk[field] === null || chunk[field] === '',
  );

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  // Enforce the content_source_type is correct regardless of input.
  if (chunk.content_source_type !== EXTERNAL_CONTENT_SOURCE_TYPE) {
    return { valid: false, missing: ['content_source_type (wrong value)'] };
  }

  return { valid: true };
}
