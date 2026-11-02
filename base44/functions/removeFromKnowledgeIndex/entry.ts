/**
 * STAGE 3 — LIVE KNOWLEDGE INDEX WIRING
 * removeFromKnowledgeIndex
 *
 * Removes all indexed chunks for a given content record from the external
 * knowledge index when a record is deleted or archived.
 *
 * STAGE 3 CHANGES vs STAGE 2:
 *   - Added KNOWLEDGE_INDEX_ENABLED feature flag (must be 'true' to delete).
 *   - Implemented real provider logic for 'openai_pinecone'.
 *   - cohere_weaviate and openai_qdrant remain documented stubs.
 *   - All Stage 2 no-op and dry_run behavior preserved unchanged.
 *
 * FEATURE FLAGS:
 *   KNOWLEDGE_INDEX_ENABLED    — must be 'true' for live deletion
 *
 * PROVIDER CONFIG:
 *   KNOWLEDGE_PROVIDER, KNOWLEDGE_INDEX_KEY, KNOWLEDGE_INDEX_HOST, KNOWLEDGE_INDEX_NAME
 *
 * INPUT:
 *   { document_id: string, entity_type?: string, record_id?: string, dry_run?: boolean }
 *
 * OUTPUT:
 *   { success, mode, provider, document_id, deleted_count, errors, summary }
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
  const index_key = Deno.env.get('KNOWLEDGE_INDEX_KEY');
  const index_host = Deno.env.get('KNOWLEDGE_INDEX_HOST');
  const index_name = Deno.env.get('KNOWLEDGE_INDEX_NAME') || 'cbt-knowledge';
  if (!provider || !index_key) return null;
  return { provider, index_key, index_host, index_name };
}

// ─── PROVIDER: DELETE VECTORS BY DOCUMENT ID (PINECONE) ───────────────────────
// Deletes all vectors in the namespace whose metadata.document_id == document_id.
// Returns the number of vectors deleted (Pinecone does not return a count; returns 0).
async function deleteVectorsByDocumentId(document_id, config) {
  if (config.provider === 'openai_pinecone') {
    const res = await fetch(`${config.index_host}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': config.index_key,
      },
      body: JSON.stringify({
        filter: { document_id: { '$eq': document_id } },
        namespace: config.index_name,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinecone delete failed (${res.status}): ${err.slice(0, 200)}`);
    }
    // Pinecone delete response is {} on success; does not include a deleted count.
    return 0;
  }

  if (config.provider === 'openai_qdrant') {
    // openai_qdrant: DELETE by payload filter
    // POST ${config.index_host}/collections/${config.index_name}/points/delete
    //   body: { filter: { must: [{ key: 'document_id', match: { value: document_id } }] } }
    // Not yet implemented in Stage 3.
    throw new Error(`Provider 'openai_qdrant' deletion is not yet implemented. Implement in Stage 4.`);
  }

  // cohere_weaviate: DELETE WHERE document_id = document_id — not yet implemented.
  throw new Error(`Provider '${config.provider}' deletion is not yet implemented.`);
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
    const { document_id, entity_type, record_id, dry_run = false } = body;

    // Validate document_id
    if (!document_id || typeof document_id !== 'string') {
      return Response.json({ error: 'document_id is required. Format: "EntityType::record_id"' }, { status: 400 });
    }
    if (!document_id.includes('::')) {
      return Response.json({ error: 'document_id format invalid. Expected: "EntityType::record_id"' }, { status: 400 });
    }

    // Safety: reject non-content entity types
    const [id_entity_type] = document_id.split('::');
    if (!ALLOWED_ENTITY_TYPES.includes(id_entity_type)) {
      return Response.json({
        error: `document_id references a non-content entity type: '${id_entity_type}'. Only shared content entities are permitted.`,
      }, { status: 400 });
    }
    if (entity_type && !ALLOWED_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({ error: `Invalid entity_type. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}` }, { status: 400 });
    }

    // ── FEATURE FLAG CHECK ─────────────────────────────────────────────────────
    if (!isIndexEnabled()) {
      return Response.json({
        success: true,
        mode: 'no_op',
        provider: null,
        document_id,
        deleted_count: 0,
        errors: [],
        summary: `No-op: KNOWLEDGE_INDEX_ENABLED is not set to 'true'. No deletion attempted for '${document_id}'.`,
      });
    }

    // ── PROVIDER CONFIG CHECK ──────────────────────────────────────────────────
    const config = getProviderConfig();
    if (!config) {
      return Response.json({
        success: true,
        mode: 'no_op',
        provider: null,
        document_id,
        deleted_count: 0,
        errors: [],
        summary: `No-op: KNOWLEDGE_PROVIDER or KNOWLEDGE_INDEX_KEY are not configured. No deletion attempted for '${document_id}'.`,
      });
    }

    // ── DRY RUN ────────────────────────────────────────────────────────────────
    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        provider: config.provider,
        document_id,
        deleted_count: 0,
        errors: [],
        summary: `Dry run: Would delete all vectors for '${document_id}' from provider '${config.provider}'. Set dry_run=false to execute.`,
      });
    }

    // ── LIVE DELETE ────────────────────────────────────────────────────────────
    let deleted_count = 0;
    const errors = [];

    try {
      deleted_count = await deleteVectorsByDocumentId(document_id, config);
    } catch (err) {
      errors.push(err.message);
    }

    return Response.json({
      success: errors.length === 0,
      mode: 'live',
      provider: config.provider,
      document_id,
      deleted_count,
      errors,
      summary: errors.length === 0
        ? `Deletion request sent for document '${document_id}' via provider '${config.provider}'.`
        : `Deletion attempted for '${document_id}' with errors.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});