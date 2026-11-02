/**
 * STAGE 3 — LIVE KNOWLEDGE INDEX WIRING
 * retrieveRelevantContent
 *
 * Accepts a natural-language query and returns the most relevant content
 * chunks from the knowledge index. Filters by entity_types, language, top_k.
 *
 * STAGE 3 CHANGES vs STAGE 2:
 *   - Added KNOWLEDGE_RETRIEVAL_ENABLED feature flag (must be 'true' for live retrieval).
 *   - Implemented real provider logic for 'openai_pinecone'.
 *   - cohere_weaviate and openai_qdrant remain documented stubs.
 *   - All Stage 2 no-op and dry_run behavior preserved unchanged.
 *
 * CRITICAL: This function is NOT connected to any agent tool_config in Stage 3.
 * It is backend-only. Agent wiring happens in Stage 4.
 *
 * FEATURE FLAGS:
 *   KNOWLEDGE_RETRIEVAL_ENABLED — must be 'true' to enable live retrieval
 *
 * PROVIDER CONFIG:
 *   KNOWLEDGE_PROVIDER, KNOWLEDGE_EMBEDDING_KEY, KNOWLEDGE_INDEX_KEY,
 *   KNOWLEDGE_INDEX_HOST, KNOWLEDGE_INDEX_NAME
 *
 * INPUT:
 *   { query, entity_types?, language?, top_k?, min_score?, dry_run? }
 *
 * OUTPUT:
 *   { results, total_results, query, mode, provider, filters_applied }
 *
 * BEHAVIOR: Requires authentication. Safe no-op when flag disabled or provider unconfigured.
 * NOT connected to any agent.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

// ─── FEATURE FLAG ─────────────────────────────────────────────────────────────
function isRetrievalEnabled() {
  return Deno.env.get('KNOWLEDGE_RETRIEVAL_ENABLED') === 'true';
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

// ─── PROVIDER: GENERATE QUERY EMBEDDING ───────────────────────────────────────
// Uses the same model as upsertKnowledgeIndex (text-embedding-3-small) for
// consistent vector space alignment.
async function generateQueryEmbedding(text, config) {
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

  // cohere_weaviate — not yet implemented.
  throw new Error(`Provider '${config.provider}' query embedding is not yet implemented.`);
}

// ─── PROVIDER: SEARCH VECTORS (PINECONE) ──────────────────────────────────────
// Queries the Pinecone index and maps matches to the standard result format.
async function searchVectors(query_embedding, filters, top_k, config) {
  if (config.provider === 'openai_pinecone') {
    const pinecone_filter = {
      entity_type: { '$in': filters.entity_types },
      language: { '$eq': filters.language },
    };

    const res = await fetch(`${config.index_host}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': config.index_key,
      },
      body: JSON.stringify({
        vector: query_embedding,
        topK: top_k,
        includeMetadata: true,
        filter: pinecone_filter,
        namespace: config.index_name,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinecone query failed (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();

    return (data.matches || []).map(match => ({
      chunk_id: match.id,
      document_id: match.metadata?.document_id || '',
      entity_type: match.metadata?.entity_type || '',
      record_id: match.metadata?.record_id || '',
      title: match.metadata?.title || '',
      slug: match.metadata?.slug || null,
      chunk_text: match.metadata?.text || '',
      score: match.score || 0,
      chunk_index: match.metadata?.chunk_index ?? 0,
      language: match.metadata?.language || 'en',
      metadata: match.metadata || {},
    }));
  }

  if (config.provider === 'openai_qdrant') {
    // openai_qdrant: POST ${config.index_host}/collections/${config.index_name}/points/search
    //   body: { vector: [...], limit: top_k, with_payload: true, filter: {...} }
    // Not yet implemented in Stage 3.
    throw new Error(`Provider 'openai_qdrant' search is not yet implemented. Implement in Stage 4.`);
  }

  // cohere_weaviate — not yet implemented.
  throw new Error(`Provider '${config.provider}' search is not yet implemented.`);
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const t0 = Date.now();
    const base44 = createClientFromRequest(req);

    // Requires authentication — any authenticated user.
    // Admin is NOT required: this function will be callable by agents (any user)
    // once connected in Stage 4.
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      query,
      entity_types,
      language = 'en',
      top_k,
      min_score = 0.0,
      dry_run = false,
    } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return Response.json({ error: 'query must be a non-empty string' }, { status: 400 });
    }

    // Normalize filters
    const effective_entity_types = Array.isArray(entity_types) && entity_types.length > 0
      ? entity_types.filter(t => ALLOWED_ENTITY_TYPES.includes(t))
      : [...ALLOWED_ENTITY_TYPES];
    if (effective_entity_types.length === 0) {
      return Response.json({
        error: `entity_types contains no valid values. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      }, { status: 400 });
    }
    const effective_language = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    const effective_top_k = Math.min(MAX_TOP_K, Math.max(1, top_k || DEFAULT_TOP_K));
    const filters_applied = {
      entity_types: effective_entity_types,
      language: effective_language,
      top_k: effective_top_k,
      min_score,
    };

    // ── DRY RUN ────────────────────────────────────────────────────────────────
    if (dry_run) {
      return Response.json({
        results: [],
        total_results: 0,
        query: query.trim(),
        mode: 'dry_run',
        provider: getProviderConfig()?.provider || null,
        filters_applied,
        retrieval_enabled: isRetrievalEnabled(),
        schema: {
          result_fields: [
            'chunk_id', 'document_id', 'entity_type', 'record_id',
            'title', 'slug', 'chunk_text', 'score', 'chunk_index',
            'language', 'metadata',
          ],
          note: 'Dry run complete. Set dry_run=false with KNOWLEDGE_RETRIEVAL_ENABLED=true and a configured provider to retrieve live results.',
        },
      });
    }

    // ── FEATURE FLAG CHECK ─────────────────────────────────────────────────────
    // Returns no_op (not an error) — safe for future agent calls before Stage 4 wiring.
    if (!isRetrievalEnabled()) {
      return Response.json({
        results: [],
        total_results: 0,
        query: query.trim(),
        mode: 'no_op',
        provider: null,
        filters_applied,
        note: `No-op: KNOWLEDGE_RETRIEVAL_ENABLED is not set to 'true'. Set this flag and ensure content is indexed to enable live retrieval.`,
      });
    }

    // ── PROVIDER CONFIG CHECK ──────────────────────────────────────────────────
    const config = getProviderConfig();
    if (!config) {
      return Response.json({
        results: [],
        total_results: 0,
        query: query.trim(),
        mode: 'no_op',
        provider: null,
        filters_applied,
        note: 'No-op: KNOWLEDGE_PROVIDER, KNOWLEDGE_EMBEDDING_KEY, or KNOWLEDGE_INDEX_KEY are not configured.',
      });
    }

    // ── LIVE RETRIEVAL ─────────────────────────────────────────────────────────
    const query_embedding = await generateQueryEmbedding(query.trim(), config);
    const raw_results = await searchVectors(query_embedding, filters_applied, effective_top_k, config);
    const filtered_results = raw_results.filter(r => r.score >= min_score);

    const ms = Date.now() - t0;
    const no_results = filtered_results.length === 0;
    const top_score = filtered_results.length > 0 ? filtered_results[0].score?.toFixed(3) : null;
    console.log(`[KB:RETRIEVE] results=${filtered_results.length} top_score=${top_score ?? 'none'} lang=${effective_language} top_k=${effective_top_k} no_result=${no_results} ms=${ms}`);
    if (no_results) {
      console.log(`[KB:RETRIEVE:NO_RESULT] entity_types=${effective_entity_types.join(',')} min_score=${min_score} ms=${ms}`);
    }

    return Response.json({
      results: filtered_results,
      total_results: filtered_results.length,
      query: query.trim(),
      mode: 'live',
      provider: config.provider,
      filters_applied,
    });

  } catch (error) {
    console.error(`[KB:RETRIEVE:ERROR] ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});