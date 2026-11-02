/**
 * STAGE 3 — LIVE KNOWLEDGE INDEX WIRING
 * upsertKnowledgeIndex
 *
 * Accepts an array of content chunks (output of chunkContentDocument) and
 * sends them to the configured external knowledge index (vector database).
 *
 * STAGE 3 CHANGES vs STAGE 2:
 *   - Added KNOWLEDGE_INDEX_ENABLED feature flag (must be 'true' to index).
 *   - Implemented real provider logic for 'openai_pinecone'.
 *   - cohere_weaviate and openai_qdrant remain documented stubs.
 *   - All Stage 2 no-op and dry_run behavior preserved unchanged.
 *
 * FEATURE FLAGS (environment variables):
 *   KNOWLEDGE_INDEX_ENABLED    — must be 'true' to allow live indexing (default: disabled)
 *
 * PROVIDER CONFIG (environment variables):
 *   KNOWLEDGE_PROVIDER         — 'openai_pinecone' (live) | 'cohere_weaviate' | 'openai_qdrant' (stubs)
 *   KNOWLEDGE_EMBEDDING_KEY    — OpenAI API key (for openai_pinecone / openai_qdrant)
 *   KNOWLEDGE_INDEX_KEY        — Pinecone API key
 *   KNOWLEDGE_INDEX_HOST       — Pinecone index host URL (e.g. https://my-index-xyz.svc.pinecone.io)
 *   KNOWLEDGE_INDEX_NAME       — Pinecone namespace (default: 'cbt-knowledge')
 *
 * INPUT:
 *   { chunks: array, dry_run?: boolean }
 *
 * OUTPUT:
 *   { success, mode, provider, indexed_count, skipped_count, errors, summary }
 *
 * BEHAVIOR: Admin-only. Safe no-op if flag disabled or provider unconfigured.
 * NOT connected to any agent.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

// ─── FEATURE FLAG ─────────────────────────────────────────────────────────────
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
  if (!provider || !embedding_key || !index_key) return null;
  return { provider, embedding_key, index_key, index_host, index_name };
}

// ─── PINECONE METADATA FLATTENER ──────────────────────────────────────────────
// Pinecone metadata values must be: string | number | boolean | string[]
// Nested objects and mixed arrays are JSON-stringified to comply.
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

// ─── CHUNK VALIDATION ─────────────────────────────────────────────────────────
function validateChunk(chunk) {
  const required = ['chunk_id', 'document_id', 'entity_type', 'record_id', 'text', 'language'];
  for (const field of required) {
    if (!chunk[field]) return `Missing required field: ${field}`;
  }
  if (typeof chunk.text !== 'string' || chunk.text.trim().length === 0) {
    return 'chunk.text must be a non-empty string';
  }
  // Safety: only allow shared content entity types
  if (!ALLOWED_ENTITY_TYPES.includes(chunk.entity_type)) {
    return `entity_type '${chunk.entity_type}' is not an allowed content entity.`;
  }
  return null;
}

// ─── PROVIDER: GENERATE EMBEDDING ────────────────────────────────────────────
// Returns float[] (vector).
async function generateEmbedding(text, config) {
  if (config.provider === 'openai_pinecone' || config.provider === 'openai_qdrant') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.embedding_key}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI embedding failed (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.data[0].embedding;
  }

  // cohere_weaviate — not yet implemented in Stage 3.
  // To implement: POST https://api.cohere.ai/v1/embed
  //   model: 'embed-multilingual-v3.0', texts: [text]
  throw new Error(`Provider '${config.provider}' embedding is not yet implemented. Implement cohere_weaviate in Stage 4.`);
}

// ─── PROVIDER: UPSERT VECTOR (PINECONE) ───────────────────────────────────────
async function upsertVector(chunk, embedding, config) {
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
      // Store first 2000 chars of text for display in retrieval results.
      // Full text is not stored in metadata to stay within Pinecone's 40KB limit.
      text: chunk.text.slice(0, 2000),
    });

    const res = await fetch(`${config.index_host}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': config.index_key,
      },
      body: JSON.stringify({
        vectors: [{ id: chunk.chunk_id, values: embedding, metadata }],
        namespace: config.index_name,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinecone upsert failed (${res.status}): ${err.slice(0, 200)}`);
    }
    return;
  }

  if (config.provider === 'openai_qdrant') {
    // openai_qdrant — Qdrant requires UUID-format IDs.
    // To implement: PUT ${config.index_host}/collections/${config.index_name}/points
    // Requires mapping chunk_id string → UUID. Not yet implemented in Stage 3.
    throw new Error(`Provider 'openai_qdrant' upsert is not yet implemented. Implement in Stage 4.`);
  }

  // cohere_weaviate — not yet implemented.
  throw new Error(`Provider '${config.provider}' upsert is not yet implemented.`);
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
    const { chunks, dry_run = false } = body;

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return Response.json({ error: 'chunks must be a non-empty array' }, { status: 400 });
    }

    // Validate all chunks before doing any work
    const validation_errors = [];
    for (let i = 0; i < chunks.length; i++) {
      const err = validateChunk(chunks[i]);
      if (err) validation_errors.push(`Chunk ${i}: ${err}`);
    }
    if (validation_errors.length > 0) {
      return Response.json({ success: false, mode: 'validation_error', errors: validation_errors }, { status: 400 });
    }

    // ── FEATURE FLAG CHECK ─────────────────────────────────────────────────────
    if (!isIndexEnabled()) {
      return Response.json({
        success: true,
        mode: 'no_op',
        provider: null,
        indexed_count: 0,
        skipped_count: chunks.length,
        errors: [],
        summary: `No-op: KNOWLEDGE_INDEX_ENABLED is not set to 'true'. ${chunks.length} chunks validated but not indexed. Set KNOWLEDGE_INDEX_ENABLED=true to enable live indexing.`,
        chunks_validated: chunks.length,
      });
    }

    // ── PROVIDER CONFIG CHECK ──────────────────────────────────────────────────
    const config = getProviderConfig();
    if (!config) {
      return Response.json({
        success: true,
        mode: 'no_op',
        provider: null,
        indexed_count: 0,
        skipped_count: chunks.length,
        errors: [],
        summary: `No-op: KNOWLEDGE_PROVIDER, KNOWLEDGE_EMBEDDING_KEY, or KNOWLEDGE_INDEX_KEY are not configured. ${chunks.length} chunks validated but not indexed.`,
        chunks_validated: chunks.length,
        chunk_ids_preview: chunks.slice(0, 3).map(c => c.chunk_id),
      });
    }

    // ── DRY RUN ────────────────────────────────────────────────────────────────
    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        provider: config.provider,
        indexed_count: 0,
        skipped_count: chunks.length,
        errors: [],
        summary: `Dry run: ${chunks.length} chunks validated. Provider '${config.provider}' configured. No data sent. Set dry_run=false to execute.`,
        chunks_validated: chunks.length,
      });
    }

    // ── LIVE INDEXING ──────────────────────────────────────────────────────────
    const errors = [];
    let indexed_count = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.text, config);
        await upsertVector(chunk, embedding, config);
        indexed_count++;
      } catch (err) {
        errors.push(`${chunk.chunk_id}: ${err.message}`);
      }
    }

    return Response.json({
      success: errors.length === 0,
      mode: 'live',
      provider: config.provider,
      indexed_count,
      skipped_count: chunks.length - indexed_count,
      errors,
      summary: `Indexed ${indexed_count}/${chunks.length} chunks via provider '${config.provider}'.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});