/**
 * STAGE 3 — LIVE KNOWLEDGE INDEX WIRING
 * indexContentRecord
 *
 * Orchestration pipeline for indexing or removing a single shared content
 * record from the knowledge index. Handles the full lifecycle:
 *   create  → build document → chunk → embed → upsert
 *   update  → if active: re-index; if draft/archived: remove from index
 *   delete  → remove from index
 *
 * This function is designed to be called from BOTH:
 *   1. Entity automations (no user auth — automation payload format)
 *   2. Direct admin calls (admin auth — direct call payload format)
 *
 * AUTH HANDLING:
 *   - Direct admin calls: validated via base44.auth.me() → role === 'admin'
 *   - Automation calls:   detected by presence of body.event.entity_name;
 *                         trusted by the Base44 automation system.
 *
 * SCOPE: Only processes Exercise, Resource, JournalTemplate, Psychoeducation.
 *        Never processes private user records.
 *
 * FEATURE FLAG:
 *   KNOWLEDGE_INDEX_ENABLED — must be 'true' for live indexing/deletion
 *
 * INPUT (direct admin call):
 *   { entity_type: string, record_id: string, dry_run?: boolean }
 *
 * INPUT (automation payload):
 *   {
 *     event: { type: 'create'|'update'|'delete', entity_name: string, entity_id: string },
 *     data: object | null,
 *     old_data: object | null,
 *     payload_too_large?: boolean,
 *   }
 *
 * OUTPUT:
 *   {
 *     success: boolean,
 *     action: 'indexed' | 'removed' | 'skipped' | 'no_op',
 *     entity_type: string,
 *     record_id: string,
 *     document_id: string,
 *     chunks_indexed?: number,
 *     mode: 'live' | 'dry_run' | 'no_op',
 *     reason?: string,
 *     errors: string[],
 *   }
 *
 * BEHAVIOR: Safe no-op if feature flag disabled or provider unconfigured.
 * NOT connected to any agent.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

// ─── FIELD MAPS (inlined from buildContentDocument) ───────────────────────────
// Defines which fields are used for primary text (embedded) vs metadata.
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

// ─── FEATURE FLAG & CONFIG ────────────────────────────────────────────────────
function isIndexEnabled() {
  return Deno.env.get('KNOWLEDGE_INDEX_ENABLED') === 'true';
}

function getProviderConfig() {
  const provider = Deno.env.get('KNOWLEDGE_PROVIDER');
  const embedding_key = Deno.env.get('KNOWLEDGE_EMBEDDING_KEY');
  const index_key = Deno.env.get('KNOWLEDGE_INDEX_KEY');
  const index_host = Deno.env.get('KNOWLEDGE_INDEX_HOST');
  const index_name = Deno.env.get('KNOWLEDGE_INDEX_NAME') || 'cbt-knowledge';
  if (!provider || !embedding_key || !index_key) return null;
  return { provider, embedding_key, index_key, index_host, index_name };
}

// ─── RECORD FETCHER ───────────────────────────────────────────────────────────
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

// ─── DOCUMENT BUILDER (inlined from buildContentDocument) ─────────────────────
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

// ─── CHUNKER (simplified inline version) ──────────────────────────────────────
// Paragraph-based split with max 1000 char chunks and 100 char overlap.
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

// ─── PROVIDER: EMBED + UPSERT ─────────────────────────────────────────────────
async function embedAndUpsertChunk(chunk, config) {
  // Generate embedding
  let embedding;
  if (config.provider === 'openai_pinecone' || config.provider === 'openai_qdrant') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.embedding_key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: chunk.text }),
    });
    if (!res.ok) throw new Error(`OpenAI embedding failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    embedding = data.data[0].embedding;
  } else {
    throw new Error(`Provider '${config.provider}' embedding not yet implemented.`);
  }

  // Upsert to vector index
  if (config.provider === 'openai_pinecone') {
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
    const res = await fetch(`${config.index_host}/vectors/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': config.index_key },
      body: JSON.stringify({
        vectors: [{ id: chunk.chunk_id, values: embedding, metadata }],
        namespace: config.index_name,
      }),
    });
    if (!res.ok) throw new Error(`Pinecone upsert failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  } else {
    throw new Error(`Provider '${config.provider}' upsert not yet implemented.`);
  }
}

// ─── PROVIDER: DELETE ─────────────────────────────────────────────────────────
async function deleteDocumentFromIndex(document_id, config) {
  if (config.provider === 'openai_pinecone') {
    const res = await fetch(`${config.index_host}/vectors/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': config.index_key },
      body: JSON.stringify({
        filter: { document_id: { '$eq': document_id } },
        namespace: config.index_name,
      }),
    });
    if (!res.ok) throw new Error(`Pinecone delete failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  } else {
    throw new Error(`Provider '${config.provider}' deletion not yet implemented.`);
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const t0 = Date.now();
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── AUTH: direct admin call vs automation call ─────────────────────────────
    const isAutomationCall = body?.event?.entity_name !== undefined;
    if (!isAutomationCall) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // ── PARSE PAYLOAD (normalize automation vs direct call) ────────────────────
    let entity_type, record_id, event_type, dry_run;

    if (isAutomationCall) {
      const event = body.event || {};
      entity_type = event.entity_name;    // e.g. 'Exercise'
      record_id = event.entity_id;
      event_type = event.type;            // 'create' | 'update' | 'delete'
      dry_run = false;
    } else {
      entity_type = body.entity_type;
      record_id = body.record_id;
      event_type = body.event_type || 'upsert'; // direct calls default to upsert
      dry_run = body.dry_run === true;
    }

    // ── ALLOW-LIST CHECK ───────────────────────────────────────────────────────
    if (!entity_type || !ALLOWED_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({
        success: true,
        action: 'skipped',
        entity_type,
        record_id,
        document_id: null,
        mode: 'no_op',
        reason: `entity_type '${entity_type}' is not in the allowed content entity list. Private user records are never indexed.`,
        errors: [],
      });
    }

    if (!record_id) {
      return Response.json({ error: 'record_id is required' }, { status: 400 });
    }

    const document_id = `${entity_type}::${record_id}`;

    // ── FEATURE FLAG CHECK ─────────────────────────────────────────────────────
    if (!isIndexEnabled()) {
      return Response.json({
        success: true,
        action: 'no_op',
        entity_type,
        record_id,
        document_id,
        mode: 'no_op',
        reason: `KNOWLEDGE_INDEX_ENABLED is not set to 'true'. No action taken for ${document_id}.`,
        errors: [],
      });
    }

    // ── DELETE EVENTS ──────────────────────────────────────────────────────────
    if (event_type === 'delete') {
      if (dry_run) {
        return Response.json({ success: true, action: 'removed', entity_type, record_id, document_id, mode: 'dry_run', errors: [] });
      }
      const config = getProviderConfig();
      if (!config) {
        return Response.json({ success: true, action: 'no_op', entity_type, record_id, document_id, mode: 'no_op', reason: 'Provider not configured.', errors: [] });
      }
      await deleteDocumentFromIndex(document_id, config);
      console.log(`[KB:INDEX] action=removed entity_type=${entity_type} record_id=${record_id} ms=${Date.now() - t0}`);
      return Response.json({ success: true, action: 'removed', entity_type, record_id, document_id, mode: 'live', errors: [] });
    }

    // ── FETCH RECORD ───────────────────────────────────────────────────────────
    // For update/create/direct calls, we need the current record state.
    let record;
    if (isAutomationCall && body.data && !body.payload_too_large) {
      record = body.data;  // use automation-provided data (avoids extra fetch)
    } else {
      record = await fetchRecord(base44, entity_type, record_id);
    }

    if (!record) {
      return Response.json({ success: true, action: 'skipped', entity_type, record_id, document_id, mode: 'no_op', reason: 'Record not found.', errors: [] });
    }

    // ── STATUS-BASED ROUTING ───────────────────────────────────────────────────
    const record_status = record.status || 'active';

    // If status is draft or archived → remove from index (may have been indexed before)
    if (record_status === 'draft' || record_status === 'archived') {
      if (dry_run) {
        return Response.json({ success: true, action: 'removed', entity_type, record_id, document_id, mode: 'dry_run', reason: `Status is '${record_status}' — removing from index.`, errors: [] });
      }
      const config = getProviderConfig();
      if (!config) {
        return Response.json({ success: true, action: 'no_op', entity_type, record_id, document_id, mode: 'no_op', reason: 'Provider not configured.', errors: [] });
      }
      await deleteDocumentFromIndex(document_id, config);
      console.log(`[KB:INDEX] action=removed_inactive entity_type=${entity_type} record_id=${record_id} status=${record_status} ms=${Date.now() - t0}`);
      return Response.json({ success: true, action: 'removed', entity_type, record_id, document_id, mode: 'live', reason: `Status is '${record_status}' — removed from index.`, errors: [] });
    }

    // Only 'active' records get indexed
    if (record_status !== 'active') {
      return Response.json({ success: true, action: 'skipped', entity_type, record_id, document_id, mode: 'no_op', reason: `Unknown status '${record_status}'. Only 'active' records are indexed.`, errors: [] });
    }

    // ── BUILD DOCUMENT ─────────────────────────────────────────────────────────
    const document = buildDocument(entity_type, record_id, record);
    if (!document) {
      return Response.json({ success: true, action: 'skipped', entity_type, record_id, document_id, mode: 'no_op', reason: 'No primary text content found — cannot build document.', errors: [] });
    }

    // ── CHUNK DOCUMENT ─────────────────────────────────────────────────────────
    const chunks = chunkDocument(document);
    if (chunks.length === 0) {
      return Response.json({ success: true, action: 'skipped', entity_type, record_id, document_id, mode: 'no_op', reason: 'No chunks produced — content may be too short.', errors: [] });
    }

    // ── DRY RUN ────────────────────────────────────────────────────────────────
    if (dry_run) {
      return Response.json({
        success: true,
        action: 'indexed',
        entity_type,
        record_id,
        document_id,
        chunks_indexed: chunks.length,
        mode: 'dry_run',
        reason: `Would index ${chunks.length} chunks. Set dry_run=false to execute.`,
        errors: [],
      });
    }

    // ── PROVIDER CONFIG ────────────────────────────────────────────────────────
    const config = getProviderConfig();
    if (!config) {
      return Response.json({ success: true, action: 'no_op', entity_type, record_id, document_id, mode: 'no_op', reason: 'Provider not configured.', errors: [] });
    }

    // ── EMBED + UPSERT ALL CHUNKS ──────────────────────────────────────────────
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

    const ms = Date.now() - t0;
    const success = errors.length === 0;
    if (success) {
      console.log(`[KB:INDEX] action=indexed entity_type=${entity_type} record_id=${record_id} chunks=${indexed} ms=${ms}`);
    } else {
      console.error(`[KB:INDEX:ERROR] action=partial entity_type=${entity_type} record_id=${record_id} chunks_ok=${indexed} chunks_failed=${errors.length} ms=${ms}`);
    }

    return Response.json({
      success,
      action: 'indexed',
      entity_type,
      record_id,
      document_id,
      chunks_indexed: indexed,
      chunks_total: chunks.length,
      mode: 'live',
      errors,
    });

  } catch (error) {
    console.error(`[KB:INDEX:FATAL] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});