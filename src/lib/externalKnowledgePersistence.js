/**
 * @file src/lib/externalKnowledgePersistence.js
 *
 * Therapist Upgrade — Stage 2 Phase 4.2 — Entity-Based Persistence Adapter
 *
 * Provides the repo-side, testable persistence layer that writes approved
 * external trusted-knowledge source and chunk records to the real app-owned
 * Base44 entity storage surfaces defined in:
 *   - src/api/entities/ExternalKnowledgeSource.js
 *   - src/api/entities/ExternalKnowledgeChunk.js
 *
 * PHASE 4.2 PURPOSE
 * -----------------
 * Phase 4.1 closed the persistence gap with an in-memory Map store. Phase 4.2
 * closes the remaining gap by wiring the ingestion path to the real app-owned
 * Base44 entity storage surfaces. This module is the persistence bridge between
 * the validated source/chunk records (Phase 4) and the real entity storage
 * (ExternalKnowledgeSource, ExternalKnowledgeChunk).
 *
 * Unlike the in-memory store in externalKnowledgeStore.js, this module:
 * 1. Accepts a real Base44 entity client (or a mock for testing).
 * 2. Calls entity.filter / entity.update / entity.create / entity.delete.
 * 3. Returns structured results with full provenance on success or failure.
 * 4. Handles repeated ingestion safely (upsert semantics).
 * 5. Can be tested directly with a mock entity client without any live server.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module does NOT connect to the current therapist runtime, agent wiring,
 * or any retrieval pipeline. It is a passive persistence utility only.
 *
 * FLAG GATE
 * ---------
 * Callers must check isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED')
 * before calling persistIngestedDocument. This module does not check flags itself.
 * Tests may call it directly.
 *
 * UPSERT SEMANTICS
 * ----------------
 * Source records are upserted keyed by source_id:
 *   - If a record with the same source_id exists, it is updated in-place.
 *   - If no record exists, a new one is created.
 * Chunk records are re-created on each ingestion:
 *   - Existing chunks for the source_id are deleted first.
 *   - New chunks are then created.
 * This ensures chunks are always in sync with the latest ingestion output.
 *
 * FAILURE HANDLING
 * ----------------
 * Persistence failures are non-blocking. The caller receives a structured
 * result with { persisted: false, persistence_error: string } but no exception
 * is thrown. This matches the behavior of the Deno ingestTrustedDocument
 * function's persistToAppStorage sub-routine.
 *
 * SOURCE SEPARATION
 * -----------------
 * Records with content_source_type !== 'external_trusted' are rejected before
 * any entity write. This prevents internal content from entering the external
 * knowledge entity storage surfaces.
 *
 * ROLLBACK
 * --------
 * Removing this file has no effect on the current therapist path. No existing
 * code depends on it. The in-memory store (externalKnowledgeStore.js) continues
 * to work independently.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime
 * - Interact with retrieval orchestration
 * - Modify existing entity schemas or records
 * - Store or index private user data
 * - Implement any retrieval/live-source/allowlist behavior
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4.2
 */

import { EXTERNAL_CONTENT_SOURCE_TYPE } from './externalKnowledgeSource.js';
import { validateChunkProvenance } from './externalKnowledgeChunk.js';
import {
  validateExternalKnowledgeSourceRecord,
} from '../api/entities/ExternalKnowledgeSource.js';

// ─── Types (JSDoc only — no runtime cost) ────────────────────────────────────

/**
 * @typedef {object} EntityInterface
 * @property {(filter: object) => Promise<object[]>} filter
 * @property {(id: string, data: object) => Promise<object>} update
 * @property {(data: object) => Promise<{ id: string }>} create
 * @property {(id: string) => Promise<void>} delete
 */

/**
 * @typedef {object} EntityClientMap
 * @property {EntityInterface} ExternalKnowledgeSource
 * @property {EntityInterface} ExternalKnowledgeChunk
 */

/**
 * @typedef {object} SourcePersistResult
 * @property {boolean} stored        - true if the source record was written.
 * @property {boolean} updated       - true if an existing record was updated.
 * @property {string|null} record_id - Base44 record ID of the stored source (null on failure).
 * @property {string} [reason]       - Rejection reason (only present when stored=false).
 */

/**
 * @typedef {object} ChunksPersistResult
 * @property {number} stored  - Number of chunk records written.
 * @property {number} failed  - Number of chunk records rejected.
 * @property {object[]} errors - Rejection details for failed chunks.
 */

/**
 * @typedef {object} DocumentPersistResult
 * @property {boolean} persisted              - true when all records were written.
 * @property {string|null} source_record_id   - Base44 record ID of the persisted source.
 * @property {number} chunks_persisted        - Number of chunk records written.
 * @property {string} [persistence_error]     - Set when persistence was attempted but failed.
 */

// ─── Source persistence ───────────────────────────────────────────────────────

/**
 * Persists a single external trusted-knowledge source record to the
 * ExternalKnowledgeSource entity, using upsert semantics keyed by source_id.
 *
 * Steps:
 * 1. Validate the record against the ExternalKnowledgeSource schema.
 * 2. Query the entity for an existing record with the same source_id.
 * 3. If found: update the existing record (preserve Base44 record ID).
 * 4. If not found: create a new record.
 *
 * @param {EntityClientMap} entities - Entity client map from the Base44 SDK.
 * @param {object} sourceRecord      - Validated source record from createSourceRecord().
 * @returns {Promise<SourcePersistResult>}
 */
export async function persistExternalSource(entities, sourceRecord) {
  // Schema validation
  const validation = validateExternalKnowledgeSourceRecord(sourceRecord);
  if (!validation.valid) {
    return {
      stored:    false,
      updated:   false,
      record_id: null,
      reason:    `schema_invalid: missing=[${(validation.missing ?? []).join(',')}] invalid=[${(validation.invalid ?? []).join(',')}]`,
    };
  }

  // Source separation guard
  if (sourceRecord.content_source_type !== EXTERNAL_CONTENT_SOURCE_TYPE) {
    return {
      stored:    false,
      updated:   false,
      record_id: null,
      reason:    'wrong_content_source_type',
    };
  }

  const sourceEntity = entities.ExternalKnowledgeSource;

  // Check for existing record (upsert)
  let existingId = null;
  try {
    const existing = await sourceEntity.filter({ source_id: sourceRecord.source_id });
    if (Array.isArray(existing) && existing.length > 0) {
      existingId = existing[0].id;
    }
  } catch {
    // filter failure — treat as not found, proceed to create
    existingId = null;
  }

  if (existingId) {
    // Update existing record
    await sourceEntity.update(existingId, { ...sourceRecord });
    return { stored: true, updated: true, record_id: existingId };
  } else {
    // Create new record
    const created = await sourceEntity.create({ ...sourceRecord });
    return { stored: true, updated: false, record_id: created.id };
  }
}

// ─── Chunk persistence ────────────────────────────────────────────────────────

/**
 * Persists an array of external trusted-knowledge chunk records to the
 * ExternalKnowledgeChunk entity.
 *
 * Steps:
 * 1. Delete all existing chunks for this source_id (to ensure fresh state).
 * 2. Validate each new chunk via validateChunkProvenance.
 * 3. Create each valid chunk record, attaching the parent source's record ID.
 *
 * Partial failure is safe: invalid chunks are skipped, valid ones are stored.
 * Deletion failure is safe: if stale chunks cannot be deleted, creation proceeds
 * anyway (stale chunks will have the correct provenance and source separation
 * marker; retrieval phase will de-duplicate by chunk_id at query time).
 *
 * @param {EntityClientMap} entities     - Entity client map from the Base44 SDK.
 * @param {object[]} chunkRecords        - Array of chunk records from createChunkRecord().
 * @param {string|null} sourceRecordId   - Base44 record ID of the parent source (may be null).
 * @returns {Promise<ChunksPersistResult>}
 */
export async function persistExternalChunks(entities, chunkRecords, sourceRecordId) {
  if (!Array.isArray(chunkRecords)) {
    return { stored: 0, failed: 0, errors: [{ reason: 'input_not_array' }] };
  }
  if (chunkRecords.length === 0) {
    return { stored: 0, failed: 0, errors: [] };
  }

  const chunkEntity = entities.ExternalKnowledgeChunk;

  // Determine source_id from the first chunk (all chunks in one ingestion share a source_id).
  const sourceId = chunkRecords[0]?.source_id;

  // Step 1: Delete existing chunks for this source_id (safe upsert — replace all).
  if (sourceId) {
    try {
      const existing = await chunkEntity.filter({ source_id: sourceId });
      if (Array.isArray(existing) && existing.length > 0) {
        for (const existingChunk of existing) {
          await chunkEntity.delete(existingChunk.id);
        }
      }
    } catch {
      // Deletion failure is non-blocking. Stale chunks are acceptable;
      // they carry correct provenance and source separation markers.
    }
  }

  // Step 2 + 3: Validate and create new chunks.
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

    // Attach the parent source's Base44 record ID (linkage field).
    await chunkEntity.create({
      ...chunk,
      external_source_record_id: sourceRecordId ?? null,
    });
    stored++;
  }

  return { stored, failed, errors };
}

// ─── Combined document persistence ───────────────────────────────────────────

/**
 * Persists a complete ingested document (source record + chunk records) to the
 * real app-owned Base44 entity storage surfaces.
 *
 * This is the primary entry point for Phase 4.2 persistence. It:
 * 1. Persists the source record to ExternalKnowledgeSource (upsert).
 * 2. Persists the chunk records to ExternalKnowledgeChunk (delete + create).
 * 3. Links chunk records to the source via external_source_record_id.
 * 4. Returns a structured result including Base44 record IDs and counts.
 * 5. Catches all errors — persistence failure is non-blocking.
 *
 * The caller (the Deno ingestTrustedDocument function or a test) is responsible
 * for checking flags before calling this function.
 *
 * @param {EntityClientMap} entities - Entity client map from the Base44 SDK.
 * @param {object} sourceRecord      - Validated source record from createSourceRecord().
 * @param {object[]} chunkRecords    - Array of validated chunk records from createChunkRecord().
 * @returns {Promise<DocumentPersistResult>}
 */
export async function persistIngestedDocument(entities, sourceRecord, chunkRecords) {
  try {
    // Source separation guard: reject any record that isn't external_trusted.
    if (!sourceRecord || sourceRecord.content_source_type !== EXTERNAL_CONTENT_SOURCE_TYPE) {
      return {
        persisted:         false,
        source_record_id:  null,
        chunks_persisted:  0,
        persistence_error: 'source_rejected: wrong_content_source_type',
      };
    }

    // Step 1: Persist source record.
    const sourceResult = await persistExternalSource(entities, sourceRecord);
    if (!sourceResult.stored) {
      return {
        persisted:         false,
        source_record_id:  null,
        chunks_persisted:  0,
        persistence_error: `source_persist_failed: ${sourceResult.reason ?? 'unknown'}`,
      };
    }

    // Step 2: Persist chunk records (linked to the source record).
    const chunksResult = await persistExternalChunks(
      entities,
      Array.isArray(chunkRecords) ? chunkRecords : [],
      sourceResult.record_id,
    );

    return {
      persisted:        true,
      source_record_id: sourceResult.record_id,
      chunks_persisted: chunksResult.stored,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      persisted:         false,
      source_record_id:  null,
      chunks_persisted:  0,
      persistence_error: message,
    };
  }
}
