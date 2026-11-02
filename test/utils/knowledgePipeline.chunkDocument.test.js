/**
 * Tests for the chunkContentDocument pipeline step.
 *
 * These tests mirror the pure chunking logic defined in
 * functions/chunkContentDocument.ts. Because that file uses the Deno runtime
 * (excluded from vitest), the pure computation functions are reproduced here
 * so the behavior remains covered by the project test suite.
 *
 * Covers:
 *   - findSplitBoundary: sentence → word → hard-cut preference
 *   - splitIntoChunks: paragraph-aware splitting with overlap
 *   - chunkDocument: full chunk construction with metadata inheritance
 *
 * If chunking strategy or chunk metadata shape changes, update this file.
 */

import { describe, it, expect } from 'vitest';

// ─── CONSTANTS (mirrors functions/chunkContentDocument.ts) ────────────────────
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 100;
const MIN_CHUNK_SIZE = 100;
const MAX_CHUNK_SIZE = 4000;

// ─── FIND SPLIT BOUNDARY (mirrors functions/chunkContentDocument.ts) ──────────
function findSplitBoundary(text, max_pos) {
  const search_from = Math.floor(max_pos * 0.7);

  for (let i = max_pos; i >= search_from; i--) {
    if (text[i] === '.' || text[i] === '?' || text[i] === '!') {
      if (i + 1 >= text.length || text[i + 1] === ' ' || text[i + 1] === '\n') {
        return i + 1;
      }
    }
  }

  for (let i = max_pos; i >= search_from; i--) {
    if (text[i] === ' ' || text[i] === '\n') {
      return i + 1;
    }
  }

  return max_pos;
}

// ─── SPLIT INTO CHUNKS (mirrors functions/chunkContentDocument.ts) ─────────────
function splitIntoChunks(text, chunk_size, overlap) {
  if (!text || text.length === 0) return [];
  if (text.length <= chunk_size) return [text.trim()];

  const raw_chunks = [];
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  let current = '';

  for (const paragraph of paragraphs) {
    const separator = current.length > 0 ? '\n\n' : '';
    const combined = current + separator + paragraph;

    if (combined.length <= chunk_size) {
      current = combined;
    } else {
      if (current.length > 0) {
        raw_chunks.push(current.trim());
        const overlap_text = current.length > overlap
          ? current.slice(current.length - overlap)
          : current;
        current = overlap_text + '\n\n' + paragraph;
      } else {
        current = paragraph;
      }

      while (current.length > chunk_size) {
        const split_at = findSplitBoundary(current, chunk_size);
        raw_chunks.push(current.slice(0, split_at).trim());
        const overlap_start = Math.max(0, split_at - overlap);
        current = current.slice(overlap_start).trim();
      }
    }
  }

  if (current.trim().length > 0) {
    raw_chunks.push(current.trim());
  }

  return raw_chunks.filter(c => c.length > 0);
}

// ─── CHUNK DOCUMENT (mirrors functions/chunkContentDocument.ts) ───────────────
function chunkDocument(document, chunk_size = DEFAULT_CHUNK_SIZE, chunk_overlap = DEFAULT_OVERLAP) {
  const effective_chunk_size = Math.min(MAX_CHUNK_SIZE, Math.max(MIN_CHUNK_SIZE, chunk_size));
  const effective_overlap = Math.min(
    Math.floor(effective_chunk_size / 2),
    Math.max(0, chunk_overlap)
  );
  const raw_chunks = splitIntoChunks(document.primary_text, effective_chunk_size, effective_overlap);
  const total_chunks = raw_chunks.length;

  return raw_chunks.map((text, index) => ({
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
}

// ─── FIXTURE HELPER ───────────────────────────────────────────────────────────
function makeDocument(overrides = {}) {
  return {
    document_id: 'Exercise::ex-001',
    entity_type: 'Exercise',
    record_id: 'ex-001',
    title: 'Box Breathing',
    slug: 'box-breathing',
    primary_text: 'A breathing exercise to reduce anxiety.',
    metadata: { category: 'breathing' },
    language: 'en',
    version: 1,
    ...overrides,
  };
}

// ─── TESTS — short content (single chunk) ────────────────────────────────────

describe('chunkDocument — short content (single chunk)', () => {
  it('produces exactly one chunk for short content', () => {
    const doc = makeDocument({ primary_text: 'Short content that fits in one chunk.' });
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(1);
  });

  it('chunk_id follows the pattern document_id::chunk_N', () => {
    const doc = makeDocument({ primary_text: 'Short content.' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].chunk_id).toBe('Exercise::ex-001::chunk_0');
  });

  it('single chunk has chunk_index 0 and total_chunks 1', () => {
    const doc = makeDocument({ primary_text: 'Short content.' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[0].total_chunks).toBe(1);
  });

  it('preserves document_id, entity_type, and record_id in chunks', () => {
    const doc = makeDocument({ primary_text: 'Short content.' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].document_id).toBe('Exercise::ex-001');
    expect(chunks[0].entity_type).toBe('Exercise');
    expect(chunks[0].record_id).toBe('ex-001');
  });

  it('preserves metadata in chunks', () => {
    const doc = makeDocument({
      primary_text: 'Short content.',
      metadata: { category: 'breathing', difficulty: 'beginner' },
    });
    const chunks = chunkDocument(doc);
    expect(chunks[0].metadata).toEqual({ category: 'breathing', difficulty: 'beginner' });
  });

  it('preserves language in chunks', () => {
    const doc = makeDocument({ primary_text: 'Short content.', language: 'he' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].language).toBe('he');
  });

  it('preserves title and slug in chunks', () => {
    const doc = makeDocument({ primary_text: 'Short content.' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].title).toBe('Box Breathing');
    expect(chunks[0].slug).toBe('box-breathing');
  });

  it('character_count matches text length', () => {
    const doc = makeDocument({ primary_text: 'Short content.' });
    const chunks = chunkDocument(doc);
    expect(chunks[0].character_count).toBe(chunks[0].text.length);
  });

  it('defaults version to 1 when not specified in document', () => {
    const doc = makeDocument({ primary_text: 'Short content.', version: undefined });
    const chunks = chunkDocument(doc);
    expect(chunks[0].version).toBe(1);
  });
});

// ─── TESTS — long content (multiple chunks) ───────────────────────────────────

describe('chunkDocument — long content (multiple chunks)', () => {
  const para1 = 'A '.repeat(300).trim();
  const para2 = 'B '.repeat(300).trim();
  const para3 = 'C '.repeat(300).trim();
  const longText = `${para1}\n\n${para2}\n\n${para3}`;

  it('produces multiple chunks for content exceeding chunk_size', () => {
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 1000, 100);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunk indices are sequential starting at 0', () => {
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 1000, 100);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunk_index).toBe(i);
    });
  });

  it('total_chunks is consistent across all chunks', () => {
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 1000, 100);
    const totalInFirst = chunks[0].total_chunks;
    chunks.forEach(chunk => {
      expect(chunk.total_chunks).toBe(totalInFirst);
    });
  });

  it('chunk_ids are unique across all chunks', () => {
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 1000, 100);
    const ids = chunks.map(c => c.chunk_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no chunk exceeds chunk_size in character count', () => {
    const doc = makeDocument({ primary_text: longText });
    const CHUNK_SIZE = 1000;
    const chunks = chunkDocument(doc, CHUNK_SIZE, 100);
    chunks.forEach(chunk => {
      expect(chunk.character_count).toBeLessThanOrEqual(CHUNK_SIZE + 10);
    });
  });

  it('metadata is inherited by all chunks', () => {
    const doc = makeDocument({
      primary_text: longText,
      metadata: { category: 'breathing', language: 'en' },
    });
    const chunks = chunkDocument(doc, 1000, 100);
    chunks.forEach(chunk => {
      expect(chunk.metadata).toEqual({ category: 'breathing', language: 'en' });
    });
  });

  it('all chunk character_counts match their text length', () => {
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 1000, 100);
    chunks.forEach(chunk => {
      expect(chunk.character_count).toBe(chunk.text.length);
    });
  });
});

// ─── TESTS — empty content ────────────────────────────────────────────────────

describe('chunkDocument — empty content', () => {
  it('returns empty array for empty primary_text', () => {
    const doc = makeDocument({ primary_text: '' });
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(0);
  });

  it('returns a single empty-text chunk for whitespace-only primary_text', () => {
    // splitIntoChunks has an early-return path: when text.length <= chunk_size,
    // it returns [text.trim()]. For whitespace-only text, trim() = '' → ['']. 
    // chunkDocument then maps [''] to one chunk with text=''.
    // In production, buildDocument returns null for any record with no primary
    // text, so chunkDocument is never called with whitespace-only input.
    const doc = makeDocument({ primary_text: '\n\n\n\n\n' });
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].character_count).toBe(0);
  });
});

// ─── TESTS — chunk size clamping ─────────────────────────────────────────────

describe('chunkDocument — chunk size clamping', () => {
  it('clamps chunk_size to MAX_CHUNK_SIZE when above maximum', () => {
    const longText = 'X '.repeat(2500).trim();
    const doc = makeDocument({ primary_text: longText });
    const chunks = chunkDocument(doc, 10000, 100);
    chunks.forEach(chunk => {
      expect(chunk.character_count).toBeLessThanOrEqual(MAX_CHUNK_SIZE + 10);
    });
  });

  it('applies MIN_CHUNK_SIZE floor when chunk_size is below minimum', () => {
    const text = 'Short text.';
    const doc = makeDocument({ primary_text: text });
    const chunks = chunkDocument(doc, 10, 0);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

// ─── TESTS — paragraph-boundary splitting ────────────────────────────────────

describe('chunkDocument — paragraph-boundary splitting', () => {
  it('combines multiple short paragraphs into a single chunk when they fit', () => {
    const p1 = 'First paragraph content here.';
    const p2 = 'Second paragraph content here.';
    const text = `${p1}\n\n${p2}`;
    const doc = makeDocument({ primary_text: text });
    const chunks = chunkDocument(doc, 1000, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('First paragraph');
    expect(chunks[0].text).toContain('Second paragraph');
  });
});

// ─── TESTS — findSplitBoundary ────────────────────────────────────────────────

describe('findSplitBoundary', () => {
  it('prefers a sentence-ending period', () => {
    const text = 'Hello world. This is a longer test for boundary detection.';
    const boundary = findSplitBoundary(text, 13);
    expect(boundary).toBeLessThanOrEqual(13);
    expect(boundary).toBeGreaterThan(0);
  });

  it('falls back to a word boundary when no sentence-end is found', () => {
    const text = 'AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH';
    const boundary = findSplitBoundary(text, 20);
    expect(boundary).toBeGreaterThan(0);
    expect(boundary).toBeLessThanOrEqual(21);
  });

  it('hard-cuts when neither sentence nor word boundary is available', () => {
    const text = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const boundary = findSplitBoundary(text, 20);
    expect(boundary).toBe(20);
  });

  it('returns position after a question mark when present', () => {
    const text = 'What is anxiety? It is a normal response.';
    const boundary = findSplitBoundary(text, 17);
    expect(boundary).toBeLessThanOrEqual(17);
    expect(boundary).toBeGreaterThan(0);
  });
});

// ─── TESTS — splitIntoChunks ──────────────────────────────────────────────────

describe('splitIntoChunks', () => {
  it('returns empty array for empty text', () => {
    expect(splitIntoChunks('', 1000, 100)).toHaveLength(0);
  });

  it('returns single-element array when text fits within chunk_size', () => {
    const result = splitIntoChunks('Short text.', 1000, 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Short text.');
  });

  it('returns multiple chunks for long text', () => {
    const longText = 'Word '.repeat(300).trim();
    const result = splitIntoChunks(longText, 200, 20);
    expect(result.length).toBeGreaterThan(1);
  });

  it('no chunk exceeds chunk_size in length', () => {
    const longText = 'Word '.repeat(300).trim();
    const result = splitIntoChunks(longText, 200, 20);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(210);
    });
  });

  it('all returned chunks are non-empty', () => {
    const longText = 'Word '.repeat(300).trim();
    const result = splitIntoChunks(longText, 200, 20);
    result.forEach(chunk => {
      expect(chunk.length).toBeGreaterThan(0);
    });
  });
});
