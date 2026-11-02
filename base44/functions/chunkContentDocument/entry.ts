/**
 * STAGE 2 — KNOWLEDGE BASE FOUNDATION
 * chunkContentDocument
 *
 * Splits a normalized content document (output of buildContentDocument) into
 * an ordered array of retrieval-safe text chunks with inherited metadata.
 *
 * This is a pure transformation function. It makes NO external calls,
 * has NO side effects, and does NOT touch any database records.
 *
 * Chunking strategy:
 *   1. Prefer paragraph boundaries (\n\n).
 *   2. If a paragraph exceeds chunk_size, split at sentence boundaries.
 *   3. If no sentence boundary, split at word boundary.
 *   4. As a last resort, hard-cut at chunk_size.
 *   5. Apply overlap: each chunk begins with the tail of the previous chunk.
 *
 * INPUT:
 *   {
 *     document: object,        // Output of buildContentDocument
 *     chunk_size?: number,     // Max characters per chunk (default: 1000)
 *     chunk_overlap?: number,  // Overlap characters between chunks (default: 100)
 *   }
 *
 * OUTPUT:
 *   {
 *     chunks: [
 *       {
 *         chunk_id: string,       // "${document_id}::chunk_${index}"
 *         document_id: string,
 *         entity_type: string,
 *         record_id: string,
 *         title: string,
 *         chunk_index: number,
 *         text: string,
 *         character_count: number,
 *         metadata: object,       // Inherited from document
 *         language: string,
 *         version: number,
 *         slug: string | null,
 *       }
 *     ],
 *     total_chunks: number,
 *     document_id: string,
 *   }
 *
 * BEHAVIOR: Admin-only. Pure computation — no external calls.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 100;
const MIN_CHUNK_SIZE = 100;
const MAX_CHUNK_SIZE = 4000;

/**
 * Find a good split boundary near `max_pos` within `text`.
 * Prefers: sentence end → word boundary → hard cut.
 */
function findSplitBoundary(text, max_pos) {
  const search_from = Math.floor(max_pos * 0.7);

  // Look backwards for sentence-ending punctuation
  for (let i = max_pos; i >= search_from; i--) {
    if (text[i] === '.' || text[i] === '?' || text[i] === '!') {
      // Make sure this isn't a decimal point (next char is space or end)
      if (i + 1 >= text.length || text[i + 1] === ' ' || text[i + 1] === '\n') {
        return i + 1;
      }
    }
  }

  // Look backwards for word boundary
  for (let i = max_pos; i >= search_from; i--) {
    if (text[i] === ' ' || text[i] === '\n') {
      return i + 1;
    }
  }

  // Hard cut
  return max_pos;
}

/**
 * Split `text` into chunks respecting `chunk_size` and `overlap`.
 * Returns an array of plain strings.
 */
function splitIntoChunks(text, chunk_size, overlap) {
  if (!text || text.length === 0) return [];
  if (text.length <= chunk_size) return [text.trim()];

  const raw_chunks = [];

  // Split by paragraph boundaries first
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  let current = '';

  for (const paragraph of paragraphs) {
    const separator = current.length > 0 ? '\n\n' : '';
    const combined = current + separator + paragraph;

    if (combined.length <= chunk_size) {
      current = combined;
    } else {
      // Flush current if it has content
      if (current.length > 0) {
        raw_chunks.push(current.trim());
        // Start new chunk with overlap from end of flushed chunk
        const overlap_text = current.length > overlap
          ? current.slice(current.length - overlap)
          : current;
        current = overlap_text + '\n\n' + paragraph;
      } else {
        // Paragraph itself exceeds chunk_size — must split it
        current = paragraph;
      }

      // Keep splitting current if it still exceeds chunk_size
      while (current.length > chunk_size) {
        const split_at = findSplitBoundary(current, chunk_size);
        raw_chunks.push(current.slice(0, split_at).trim());
        const overlap_start = Math.max(0, split_at - overlap);
        current = current.slice(overlap_start).trim();
      }
    }
  }

  // Push remaining content
  if (current.trim().length > 0) {
    raw_chunks.push(current.trim());
  }

  return raw_chunks.filter(c => c.length > 0);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { document, chunk_size, chunk_overlap } = body;

    // Validate document
    if (!document || typeof document !== 'object') {
      return Response.json({ error: 'document is required and must be an object' }, { status: 400 });
    }
    if (!document.document_id || !document.primary_text) {
      return Response.json({
        error: 'document must have document_id and primary_text. Use buildContentDocument first.',
      }, { status: 400 });
    }

    // Validate and clamp chunk_size
    const effective_chunk_size = Math.min(
      MAX_CHUNK_SIZE,
      Math.max(MIN_CHUNK_SIZE, chunk_size || DEFAULT_CHUNK_SIZE)
    );
    const effective_overlap = Math.min(
      Math.floor(effective_chunk_size / 2),
      Math.max(0, chunk_overlap ?? DEFAULT_OVERLAP)
    );

    const raw_chunks = splitIntoChunks(
      document.primary_text,
      effective_chunk_size,
      effective_overlap
    );

    const total_chunks = raw_chunks.length;

    const chunks = raw_chunks.map((text, index) => ({
      chunk_id: `${document.document_id}::chunk_${index}`,
      document_id: document.document_id,
      entity_type: document.entity_type,
      record_id: document.record_id,
      title: document.title || '',
      slug: document.slug || null,
      chunk_index: index,
      total_chunks,
      text,
      character_count: text.length,
      metadata: document.metadata || {},
      language: document.language || 'en',
      version: document.version || 1,
    }));

    return Response.json({
      chunks,
      total_chunks,
      document_id: document.document_id,
      chunk_size_used: effective_chunk_size,
      overlap_used: effective_overlap,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});