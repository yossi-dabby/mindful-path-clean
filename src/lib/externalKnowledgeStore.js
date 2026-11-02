/**
 * @file src/lib/externalKnowledgeStore.js
 *
 * Therapist Upgrade — Stage 2 Phase 4.1 — External Knowledge Storage
 *
 * Provides the real storage surface for external trusted-knowledge source
 * records and chunk records. This module is the authoritative in-process
 * store for Phase 4.1.
 *
 * PHASE 4.1 GAP CLOSED
 * --------------------
 * Phase 4 ingestion normalised and returned source + chunk records but did
 * not persist them. Phase 4.1 closes this gap by providing a real storage
 * layer that persisted records can be written to and read from.
 *
 * STORAGE ARCHITECTURE
 * --------------------
 * The in-memory Map store in this module is the testable storage surface for
 * Phase 4.1. The Deno ingestion function (`ingestTrustedDocument/entry.ts`)
 * additionally writes to Base44 entities (ExternalKnowledgeSource and
 * ExternalKnowledgeChunk) for durable persistence when those entities are
 * available in the Base44 admin. This module provides the same storage
 * interface, deduplication, and provenance logic that the Deno function uses.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module does NOT interact with the current therapist runtime, agent
 * wiring, or any retrieval pipeline. It is a passive storage utility.
 * The flag gate lives at the ingestion call site — this module is storage-only.
 *
 * SOURCE SEPARATION
 * -----------------
 * Storage is rejected unless content_source_type === 'external_trusted'.
 * External records are never mixed with internal app-authored content.
 *
 * DEDUPLICATION
 * -------------
 * - Sources are keyed by source_id. Repeated storage of the same source_id
 *   overwrites the record (safe upsert). The original stored_at timestamp is
 *   preserved; last_updated_at is updated.
 * - Chunks are keyed by chunk_id. Same upsert behavior.
 * - Both operations are idempotent and safe to repeat.
 *
 * PROVENANCE INTEGRITY
 * --------------------
 * Chunks are validated via validateChunkProvenance before storage. Any chunk
 * that fails provenance validation is rejected (not stored), and the caller
 * receives a structured error list.
 *
 * SOURCE / CHUNK LINKAGE
 * ----------------------
 * Every stored chunk carries the source_id of its parent source record.
 * findStoredChunksBySourceId retrieves all chunks belonging to a source and
 * returns them ordered by chunk_index.
 *
 * FLAG GATE
 * ---------
 * The flag gate (THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED) lives at the
 * ingestion call site, not here. These functions are pure storage utilities.
 * Tests may call them directly. Callers must check the flag before invoking
 * the ingestion path.
 *
 * ROLLBACK
 * --------
 * Setting THERAPIST_UPGRADE_ENABLED to false prevents the ingestion path from
 * being reached, keeping the store empty. clearExternalKnowledgeStore() resets
 * the store for test isolation.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime
 * - Interact with retrieval orchestration
 * - Modify existing entity schemas
 * - Store or index private user data
 * - Write to any vector store or knowledge index
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4.1
 */

import { EXTERNAL_CONTENT_SOURCE_TYPE } from './externalKnowledgeSource.js';
import { validateChunkProvenance } from './externalKnowledgeChunk.js';

// ─── In-memory stores ─────────────────────────────────────────────────────────
// Maps keyed by source_id and chunk_id respectively.
// These provide the stable storage surface for Phase 4.1.
// In the Deno ingestion function, Base44 entity writes provide durable storage.

/** @type {Map<string, object>} */
const _sourceStore = new Map();

/** @type {Map<string, object>} */
const _chunkStore = new Map();

// ─── Source storage ───────────────────────────────────────────────────────────

/**
 * Stores an external trusted knowledge source record.
 *
 * Requirements:
 * - source_id must be a non-empty string.
 * - content_source_type must be 'external_trusted'.
 * - Repeated calls with the same source_id perform a safe upsert (update).
 * - The original stored_at timestamp is preserved on update.
 * - Records that fail the content_source_type check are rejected.
 *
 * @param {object} sourceRecord - A source record from createSourceRecord() or equivalent.
 * @returns {{ stored: boolean, updated: boolean, source_id?: string, reason?: string }}
 */
export function storeExternalSource(sourceRecord) {
  if (!sourceRecord || typeof sourceRecord !== 'object') {
    return { stored: false, updated: false, reason: 'invalid_record' };
  }

  const sourceId = sourceRecord.source_id;
  if (!sourceId || typeof sourceId !== 'string' || sourceId.trim() === '') {
    return { stored: false, updated: false, reason: 'missing_source_id' };
  }

  // Source separation guard: only 'external_trusted' records are accepted.
  if (sourceRecord.content_source_type !== EXTERNAL_CONTENT_SOURCE_TYPE) {
    return { stored: false, updated: false, reason: 'wrong_content_source_type' };
  }

  const now = new Date().toISOString();
  const isUpdate = _sourceStore.has(sourceId);

  // Preserve the original stored_at timestamp on repeat ingestion.
  const existing = isUpdate ? _sourceStore.get(sourceId) : null;
  _sourceStore.set(sourceId, {
    ...sourceRecord,
    _stored_at:      existing?._stored_at ?? now,
    _last_updated_at: now,
  });

  return { stored: true, updated: isUpdate, source_id: sourceId };
}

/**
 * Retrieves a stored source record by source_id.
 *
 * @param {string} sourceId
 * @returns {object | null} The stored source record, or null if not found.
 */
export function findStoredSource(sourceId) {
  if (!sourceId || typeof sourceId !== 'string') return null;
  return _sourceStore.get(sourceId) ?? null;
}

// ─── Chunk storage ────────────────────────────────────────────────────────────

/**
 * Stores an array of external trusted knowledge chunk records.
 *
 * Requirements:
 * - Each chunk is validated via validateChunkProvenance before storage.
 * - Chunks that fail validation are rejected (not stored).
 * - Repeated calls with the same chunk_id perform a safe upsert.
 * - Partial failure (some chunks invalid) does not corrupt stored chunks.
 * - An empty array input stores nothing and returns { stored: 0, failed: 0 }.
 *
 * @param {object[]} chunkRecords - Array of chunk records from createChunkRecord() or equivalent.
 * @returns {{ stored: number, failed: number, errors: object[] }}
 */
export function storeExternalChunks(chunkRecords) {
  if (!Array.isArray(chunkRecords)) {
    return { stored: 0, failed: 0, errors: [{ reason: 'input_not_array' }] };
  }
  if (chunkRecords.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  const now = new Date().toISOString();
  let stored = 0;
  let failed = 0;
  const errors = [];

  for (const chunk of chunkRecords) {
    // Validate provenance (includes content_source_type check).
    const validation = validateChunkProvenance(chunk);
    if (!validation.valid) {
      failed++;
      errors.push({
        chunk_id: chunk?.chunk_id ?? null,
        reason:   'provenance_invalid',
        missing:  validation.missing,
      });
      continue;
    }

    const chunkId   = chunk.chunk_id;
    const isUpdate  = _chunkStore.has(chunkId);
    const existing  = isUpdate ? _chunkStore.get(chunkId) : null;

    _chunkStore.set(chunkId, {
      ...chunk,
      _stored_at:       existing?._stored_at ?? now,
      _last_updated_at: now,
    });
    stored++;
  }

  return { stored, failed, errors };
}

/**
 * Retrieves all stored chunks belonging to a given source_id, ordered by
 * chunk_index ascending.
 *
 * @param {string} sourceId
 * @returns {object[]} Ordered array of chunk records (may be empty).
 */
export function findStoredChunksBySourceId(sourceId) {
  if (!sourceId || typeof sourceId !== 'string') return [];
  const results = [];
  for (const chunk of _chunkStore.values()) {
    if (chunk.source_id === sourceId) {
      results.push(chunk);
    }
  }
  return results.sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

/**
 * Returns the number of source records currently in the store.
 *
 * @returns {number}
 */
export function getStoredSourceCount() {
  return _sourceStore.size;
}

/**
 * Returns the number of chunk records currently in the store.
 *
 * @returns {number}
 */
export function getStoredChunkCount() {
  return _chunkStore.size;
}

// ─── Test-only utility ────────────────────────────────────────────────────────

/**
 * Clears all source and chunk records from the in-memory store.
 *
 * ONLY for use in test teardown. Must never be called in production code.
 *
 * @returns {void}
 */
export function clearExternalKnowledgeStore() {
  _sourceStore.clear();
  _chunkStore.clear();
}
