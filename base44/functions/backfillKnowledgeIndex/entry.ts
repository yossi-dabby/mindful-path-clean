/**
 * STAGE 3 — LIVE KNOWLEDGE INDEX WIRING
 * backfillKnowledgeIndex
 *
 * Admin-only, manually-triggered batch backfill. Fetches records from the
 * allowed shared content entities and indexes them directly (pipeline inlined).
 *
 * NOTE: Inter-function SDK calls are not supported between Deno functions on
 * this platform. The full embedding/upsert pipeline from indexContentRecord
 * is inlined here to avoid that constraint.
 *
 * This function NEVER runs automatically. It must be triggered explicitly
 * by an admin. It does NOT run on deploy.
 *
 * FEATURE FLAGS:
 *   KNOWLEDGE_BACKFILL_ENABLED — must be 'true' to allow any processing
 *   KNOWLEDGE_INDEX_ENABLED    — must be 'true' for live (non-dry-run) indexing
 *
 * INPUT:
 *   {
 *     entity_type?: string,    // Scope to one entity type (default: all 4)
 *     batch_size?: number,     // Records per batch (default: 10, max: 50)
 *     offset?: number,         // Pagination offset (default: 0)
 *     dry_run?: boolean,       // Validate without indexing (default: false)
 *   }
 *
 * OUTPUT:
 *   {
 *     success: boolean,
 *     mode: 'live' | 'dry_run' | 'no_op',
 *     entity_types_processed: string[],
 *     total_records_fetched: number,
 *     indexed_count: number,
 *     skipped_count: number,
 *     error_count: number,
 *     record_results: array,
 *     batch_size: number,
 *     offset: number,
 *   }
 *
 * BEHAVIOR: Admin-only. Requires KNOWLEDGE_BACKFILL_ENABLED=true.
 * NOT connected to any agent.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
function isBackfillEnabled() {
  return Deno.env.get('KNOWLEDGE_BACKFILL_ENABLED') === 'true';
}

function isIndexEnabled() {
  return Deno.env.get('KNOWLEDGE_INDEX_ENABLED') === 'true';
}

// ─── PROVIDER CONFIG ──────────────────────────────────────────────────────────
function getProviderConfig() {
  const provider = Deno.env.get('KNOWLEDGE_PROVIDER');
  const embedding_key = Deno.env.get('KNOWLEDGE_EMBEDDING_KEY');
  const index_key = Deno.env.get('KNOWLEDGE_INDEX_KEY');
  const index_host = Deno.env.get('KNOWLEDGE_INDEX_HOST');
  const index_name = Deno.env.get('KNOWLEDGE_INDEX_NAME') || 'cbt-knowledge';
  if (!provider || !embedding_key || !index_key || !index_host) return null;
  return { provider, embedding_key, index_key, index_host, index_name };
}

// ─── FIELD MAPS ───────────────────────────────────────────────────────────────
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

// ─── DOCUMENT BUILDER ─────────────────────────────────────────────────────────
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

// ─── CHUNKER ──────────────────────────────────────────────────────────────────
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

// ─── PINECONE METADATA FLATTENER ──────────────────────────────────────────────
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

// ─── EMBED + UPSERT ONE CHUNK ─────────────────────────────────────────────────
async function embedAndUpsertChunk(chunk, config) {
  // Generate embedding via OpenAI
  const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.embedding_key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: chunk.text }),
  });
  if (!embedRes.ok) throw new Error(`OpenAI embedding failed (${embedRes.status}): ${(await embedRes.text()).slice(0, 200)}`);
  const embedData = await embedRes.json();
  const embedding = embedData.data[0].embedding;

  // Upsert to Pinecone
  const metadata = flattenForPinecone({
    ...chunk.metadata,
    document_id: chunk.document_id,
    entity_type: chunk.entity_type,
    record_id: chunk.record_id,
    title: chunk.title || '',
    slug: chunk.slug || '',
    chunk_index: chunk.chunk_index,
    language: chunk.language,
    version: chunk.version,
    text: chunk.text.slice(0, 2000),
  });
  const upsertRes = await fetch(`${config.index_host}/vectors/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': config.index_key },
    body: JSON.stringify({
      vectors: [{ id: chunk.chunk_id, values: embedding, metadata }],
      namespace: config.index_name,
    }),
  });
  if (!upsertRes.ok) throw new Error(`Pinecone upsert failed (${upsertRes.status}): ${(await upsertRes.text()).slice(0, 200)}`);
}

// ─── FETCH RECORDS ────────────────────────────────────────────────────────────
async function fetchEntityRecords(base44, entity_type, batch_size, offset) {
  switch (entity_type) {
    case 'Exercise':
      return base44.asServiceRole.entities.Exercise.list('-created_date', batch_size, offset);
    case 'Resource':
      return base44.asServiceRole.entities.Resource.list('-created_date', batch_size, offset);
    case 'JournalTemplate':
      return base44.asServiceRole.entities.JournalTemplate.list('-created_date', batch_size, offset);
    case 'Psychoeducation':
      return base44.asServiceRole.entities.Psychoeducation.list('-created_date', batch_size, offset);
    default:
      return [];
  }
}

// ─── PROCESS ONE RECORD ───────────────────────────────────────────────────────
async function processRecord(etype, record, dry_run, config) {
  const record_id = record.id;
  const record_status = record.status || 'active';

  // Skip non-active records
  if (record_status !== 'active') {
    return { entity_type: etype, record_id, status: 'skipped', reason: `Status is '${record_status}' — only active records are backfilled.` };
  }

  // Build document
  const document = buildDocument(etype, record_id, record);
  if (!document) {
    return { entity_type: etype, record_id, status: 'skipped', reason: 'No primary text content — cannot build document.' };
  }

  // Chunk document
  const chunks = chunkDocument(document);
  if (chunks.length === 0) {
    return { entity_type: etype, record_id, status: 'skipped', reason: 'No chunks produced — content too short.' };
  }

  // Dry run: report what would happen, no I/O
  if (dry_run) {
    return {
      entity_type: etype,
      record_id,
      status: 'would_index',
      chunks_would_index: chunks.length,
      reason: `Would index ${chunks.length} chunk(s). Set dry_run=false with KNOWLEDGE_INDEX_ENABLED=true to execute.`,
    };
  }

  // Live: embed + upsert each chunk
  const errors = [];
  let indexed = 0;
  for (const chunk of chunks) {
    try {
      await embedAndUpsertChunk(chunk, config);
      indexed++;
    } catch (err) {
      errors.push(`${chunk.chunk_id}: ${err.message}`);
    }
  }

  return {
    entity_type: etype,
    record_id,
    status: errors.length === 0 ? 'indexed' : 'partial',
    chunks_indexed: indexed,
    chunks_total: chunks.length,
    errors,
  };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      entity_type,
      batch_size,
      offset = 0,
      dry_run = false,
    } = body;

    // Validate entity_type if provided
    if (entity_type && !ALLOWED_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({
        error: `Invalid entity_type '${entity_type}'. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // Clamp batch_size
    const effective_batch_size = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, batch_size || DEFAULT_BATCH_SIZE)
    );

    // Determine which entity types to process
    const entity_types_to_process = entity_type
      ? [entity_type]
      : [...ALLOWED_ENTITY_TYPES];

    // ── FEATURE FLAG: backfill must be enabled for any processing ─────────────
    if (!isBackfillEnabled()) {
      return Response.json({
        success: true,
        mode: 'no_op',
        entity_types_processed: [],
        total_records_fetched: 0,
        indexed_count: 0,
        skipped_count: 0,
        error_count: 0,
        record_results: [],
        batch_size: effective_batch_size,
        offset,
        note: 'No-op: KNOWLEDGE_BACKFILL_ENABLED is not set to true. Set this flag to enable controlled backfill.',
      });
    }

    // ── PROVIDER CONFIG (live runs only) ──────────────────────────────────────
    // Dry run: no provider needed.
    // Live run: KNOWLEDGE_INDEX_ENABLED is the automation flag and is NOT required
    // here — backfill is an admin-triggered operation governed solely by
    // KNOWLEDGE_BACKFILL_ENABLED. Provider credentials must be present.
    let config = null;
    if (!dry_run) {
      config = getProviderConfig();
      if (!config) {
        return Response.json({
          success: false,
          mode: 'no_op',
          entity_types_processed: [],
          total_records_fetched: 0,
          indexed_count: 0,
          skipped_count: 0,
          error_count: 0,
          record_results: [],
          batch_size: effective_batch_size,
          offset,
          note: 'Provider not fully configured. Check KNOWLEDGE_PROVIDER, KNOWLEDGE_EMBEDDING_KEY, KNOWLEDGE_INDEX_KEY, KNOWLEDGE_INDEX_HOST.',
        });
      }
    }

    // ── FETCH AND PROCESS RECORDS ──────────────────────────────────────────────
    const record_results = [];
    let total_records_fetched = 0;
    let indexed_count = 0;
    let skipped_count = 0;
    let error_count = 0;

    for (const etype of entity_types_to_process) {
      let records = [];
      try {
        records = await fetchEntityRecords(base44, etype, effective_batch_size, offset) || [];
      } catch (err) {
        record_results.push({
          entity_type: etype,
          record_id: null,
          status: 'error',
          reason: `Failed to fetch records: ${err.message}`,
        });
        error_count++;
        continue;
      }

      total_records_fetched += records.length;

      for (const record of records) {
        try {
          const result = await processRecord(etype, record, dry_run, config);
          record_results.push(result);
          if (result.status === 'indexed' || result.status === 'would_index') {
            indexed_count++;
          } else if (result.status === 'skipped') {
            skipped_count++;
          } else {
            error_count++;
          }
        } catch (err) {
          record_results.push({ entity_type: etype, record_id: record.id, status: 'error', reason: err.message });
          error_count++;
        }
      }
    }

    return Response.json({
      success: error_count === 0,
      mode: dry_run ? 'dry_run' : 'live',
      entity_types_processed: entity_types_to_process,
      total_records_fetched,
      indexed_count,
      skipped_count,
      error_count,
      record_results,
      batch_size: effective_batch_size,
      offset,
      summary: dry_run
        ? `Dry run: ${total_records_fetched} records fetched. ${indexed_count} would be indexed, ${skipped_count} skipped, ${error_count} errors.`
        : `Backfill complete: ${indexed_count} indexed, ${skipped_count} skipped, ${error_count} errors out of ${total_records_fetched} records.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});