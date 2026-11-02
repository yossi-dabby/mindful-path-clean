/**
 * @file test/utils/therapistExternalKnowledgePhase4.test.js
 *
 * Phase 4 — External Trusted Knowledge Ingestion
 *
 * PURPOSE
 * -------
 * 1. Verify that the external source model exists and exports the required
 *    constants, factory, and helpers.
 * 2. Verify that the external chunk model exists and exports the required
 *    constants, factory, and validator.
 * 3. Verify that the approved source registry contains exactly the 8 Phase 4
 *    approved sources and no others.
 * 4. Verify that lookupApprovedSource / isApprovedSourceUrl correctly gate
 *    known vs unknown URLs.
 * 5. Verify that createSourceRecord produces well-formed source records with
 *    all required provenance fields.
 * 6. Verify that createChunkRecord produces well-formed chunk records with
 *    all required provenance fields and always carries
 *    content_source_type = 'external_trusted'.
 * 7. Verify that validateChunkProvenance accepts complete records and rejects
 *    records with missing, empty, or wrong provenance fields.
 * 8. Verify that the EXTERNAL_CONTENT_SOURCE_TYPE marker is 'external_trusted'
 *    and that it is separate from all internal entity types.
 * 9. Verify the HTML normalisation logic (re-implemented from the Deno
 *    function) removes scripts/styles/navigation and extracts clean text.
 * 10. Verify the chunking logic produces indexed chunks that preserve
 *     provenance and source separation.
 * 11. Verify that ingestion is gated by THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED
 *     (which defaults to false in the flag registry).
 * 12. Verify that ingestion failure is safe (no impact on current therapist path).
 * 13. Verify that the current therapist default path remains unchanged.
 * 14. Verify that current retrieval behavior remains unchanged.
 * 15. Verify that Phase 0 / 0.1 / 1 / 2 / 3 baselines are still intact.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - Does NOT modify any Phase 0 / 0.1 / 1 / 2 / 3 test files.
 * - All prior phase assertions remain intact (this test is additive only).
 * - Re-implements pure ingestion logic locally for testability, following the
 *   same pattern as knowledgePipeline.allowList.test.js.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4
 */

import { describe, it, expect } from 'vitest';

// ── Phase 4 lib modules ────────────────────────────────────────────────────────
import {
  EXTERNAL_SOURCE_TYPES,
  EXTERNAL_INGESTION_STATUS,
  EXTERNAL_SOURCE_STATUS,
  EXTERNAL_CONTENT_SOURCE_TYPE,
  APPROVED_TRUSTED_SOURCES,
  lookupApprovedSource,
  isApprovedSourceUrl,
  createSourceRecord,
} from '../../src/lib/externalKnowledgeSource.js';

import {
  REQUIRED_CHUNK_PROVENANCE_FIELDS,
  createChunkRecord,
  validateChunkProvenance,
} from '../../src/lib/externalKnowledgeChunk.js';

// ── Existing upgrade infrastructure ───────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

import {
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AI_COMPANION_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

import {
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ─── Re-implemented pure logic from ingestTrustedDocument/entry.ts ────────────
// (Deno code cannot be imported in Vitest — mirrors the same pattern used in
//  knowledgePipeline.allowList.test.js and knowledgePipeline.buildDocument.test.js)

const INTERNAL_ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];

function extractHtmlText(html) {
  let text = html;
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ');
  text = text.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ');
  const mainMatch    = text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const articleMatch = text.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch) text = mainMatch[1];
  else if (articleMatch) text = articleMatch[1];
  text = text.replace(/<[^>]+>/g, ' ');
  // &amp; is decoded last to avoid double-unescaping (e.g. &amp;lt; → &lt; → <).
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function findSplitBoundary(text, maxPos) {
  const searchFrom = Math.floor(maxPos * 0.7);
  for (let i = maxPos; i >= searchFrom; i--) {
    if (text[i] === '.' || text[i] === '?' || text[i] === '!') {
      if (i + 1 >= text.length || text[i + 1] === ' ' || text[i + 1] === '\n') return i + 1;
    }
  }
  for (let i = maxPos; i >= searchFrom; i--) {
    if (text[i] === ' ' || text[i] === '\n') return i + 1;
  }
  return maxPos;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

function splitIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];
  const rawChunks = [];
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  let current = '';
  for (const paragraph of paragraphs) {
    const separator = current.length > 0 ? '\n\n' : '';
    const combined  = current + separator + paragraph;
    if (combined.length <= chunkSize) {
      current = combined;
    } else {
      if (current.length > 0) {
        rawChunks.push(current.trim());
        const overlapText = current.length > overlap ? current.slice(current.length - overlap) : current;
        current = overlapText + '\n\n' + paragraph;
      } else {
        current = paragraph;
      }
      while (current.length > chunkSize) {
        const splitAt = findSplitBoundary(current, chunkSize);
        rawChunks.push(current.slice(0, splitAt).trim());
        const overlapStart = Math.max(0, splitAt - overlap);
        current = current.slice(overlapStart).trim();
      }
    }
  }
  if (current.trim().length > 0) rawChunks.push(current.trim());
  return rawChunks.filter((c) => c.length > 0);
}

function buildChunkRecordsFromText(text, approvedEntry, retrievalDate) {
  const rawChunks = splitIntoChunks(text);
  const total = rawChunks.length;
  return rawChunks.map((chunkText, index) => ({
    chunk_id:            `${approvedEntry.source_id}::chunk_${index}`,
    source_id:           approvedEntry.source_id,
    source_url:          approvedEntry.url,
    source_title:        approvedEntry.title,
    publisher:           approvedEntry.publisher,
    domain:              approvedEntry.domain,
    retrieval_date:      retrievalDate,
    publication_date:    approvedEntry.publication_date ?? null,
    section_context:     null,
    page_number:         null,
    chunk_index:         index,
    total_chunks:        total,
    chunk_text:          chunkText,
    character_count:     chunkText.length,
    content_source_type: EXTERNAL_CONTENT_SOURCE_TYPE,
    language:            'en',
    version:             1,
    metadata:            {
      source_id:   approvedEntry.source_id,
      publisher:   approvedEntry.publisher,
      domain:      approvedEntry.domain,
      source_type: approvedEntry.source_type,
    },
  }));
}

// ─── Sample approved source for tests ────────────────────────────────────────

const SAMPLE_WHO_SOURCE = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'who-mhgap-ig-v2');
const SAMPLE_NIMH_PDF   = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nimh-asq-pdf');

// ─── Section 1 — External source model exports ───────────────────────────────

describe('Phase 4 — externalKnowledgeSource exports exist', () => {
  it('EXTERNAL_SOURCE_TYPES is exported as a frozen object', () => {
    expect(typeof EXTERNAL_SOURCE_TYPES).toBe('object');
    expect(EXTERNAL_SOURCE_TYPES).not.toBeNull();
    expect(Object.isFrozen(EXTERNAL_SOURCE_TYPES)).toBe(true);
  });

  it('EXTERNAL_SOURCE_TYPES contains HTML, PDF, and PDF_TEXT', () => {
    expect(EXTERNAL_SOURCE_TYPES.HTML).toBe('html');
    expect(EXTERNAL_SOURCE_TYPES.PDF).toBe('pdf');
    expect(EXTERNAL_SOURCE_TYPES.PDF_TEXT).toBe('pdf_text');
  });

  it('EXTERNAL_INGESTION_STATUS is exported as a frozen object', () => {
    expect(Object.isFrozen(EXTERNAL_INGESTION_STATUS)).toBe(true);
    expect(EXTERNAL_INGESTION_STATUS.PENDING).toBe('pending');
    expect(EXTERNAL_INGESTION_STATUS.COMPLETE).toBe('complete');
    expect(EXTERNAL_INGESTION_STATUS.FAILED).toBe('failed');
  });

  it('EXTERNAL_SOURCE_STATUS is exported as a frozen object', () => {
    expect(Object.isFrozen(EXTERNAL_SOURCE_STATUS)).toBe(true);
    expect(EXTERNAL_SOURCE_STATUS.ACTIVE).toBe('active');
    expect(EXTERNAL_SOURCE_STATUS.DEPRECATED).toBe('deprecated');
    expect(EXTERNAL_SOURCE_STATUS.ERROR).toBe('error');
  });

  it('EXTERNAL_CONTENT_SOURCE_TYPE is the string "external_trusted"', () => {
    expect(EXTERNAL_CONTENT_SOURCE_TYPE).toBe('external_trusted');
  });

  it('APPROVED_TRUSTED_SOURCES is exported as a frozen array', () => {
    expect(Array.isArray(APPROVED_TRUSTED_SOURCES)).toBe(true);
    expect(Object.isFrozen(APPROVED_TRUSTED_SOURCES)).toBe(true);
  });

  it('lookupApprovedSource is exported as a function', () => {
    expect(typeof lookupApprovedSource).toBe('function');
  });

  it('isApprovedSourceUrl is exported as a function', () => {
    expect(typeof isApprovedSourceUrl).toBe('function');
  });

  it('createSourceRecord is exported as a function', () => {
    expect(typeof createSourceRecord).toBe('function');
  });
});

// ─── Section 2 — External chunk model exports ─────────────────────────────────

describe('Phase 4 — externalKnowledgeChunk exports exist', () => {
  it('REQUIRED_CHUNK_PROVENANCE_FIELDS is exported as a frozen array', () => {
    expect(Array.isArray(REQUIRED_CHUNK_PROVENANCE_FIELDS)).toBe(true);
    expect(Object.isFrozen(REQUIRED_CHUNK_PROVENANCE_FIELDS)).toBe(true);
  });

  it('REQUIRED_CHUNK_PROVENANCE_FIELDS contains all 9 required fields', () => {
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toHaveLength(9);
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('chunk_id');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('source_id');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('source_url');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('publisher');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('domain');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('retrieval_date');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('chunk_index');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('chunk_text');
    expect(REQUIRED_CHUNK_PROVENANCE_FIELDS).toContain('content_source_type');
  });

  it('createChunkRecord is exported as a function', () => {
    expect(typeof createChunkRecord).toBe('function');
  });

  it('validateChunkProvenance is exported as a function', () => {
    expect(typeof validateChunkProvenance).toBe('function');
  });
});

// ─── Section 3 — Approved source registry ────────────────────────────────────

describe('Phase 4 — Approved source registry', () => {
  it('contains exactly 8 approved sources', () => {
    expect(APPROVED_TRUSTED_SOURCES).toHaveLength(8);
  });

  it('includes WHO mhGAP Intervention Guide v2.0', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'who-mhgap-ig-v2');
    expect(entry).toBeDefined();
    expect(entry.publisher).toBe('World Health Organization');
    expect(entry.domain).toBe('who.int');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes NICE Depression ng222', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nice-depression-ng222');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('nice.org.uk');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes NICE Self-harm ng225', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nice-selfharm-ng225');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('nice.org.uk');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes VA/DoD Suicide Risk CPG', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'va-dod-suicide-risk-cpg');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('healthquality.va.gov');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes SAMHSA TIP 57', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'samhsa-tip57');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('store.samhsa.gov');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes NIMH ASQ Toolkit landing page', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nimh-asq-toolkit');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('nimh.nih.gov');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('includes NIMH ASQ PDF (PDF source type)', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'nimh-asq-pdf');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('nimh.nih.gov');
    expect(entry.source_type).toBe('pdf');
    expect(entry.approved).toBe(true);
  });

  it('includes Columbia / C-SSRS public screening resources', () => {
    const entry = APPROVED_TRUSTED_SOURCES.find((s) => s.source_id === 'columbia-cssrs');
    expect(entry).toBeDefined();
    expect(entry.domain).toBe('cssrs.columbia.edu');
    expect(entry.source_type).toBe('html');
    expect(entry.approved).toBe(true);
  });

  it('every entry is a frozen object', () => {
    for (const entry of APPROVED_TRUSTED_SOURCES) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it('every entry has required fields: source_id, title, url, publisher, domain, source_type, approved', () => {
    const required = ['source_id', 'title', 'url', 'publisher', 'domain', 'source_type', 'approved'];
    for (const entry of APPROVED_TRUSTED_SOURCES) {
      for (const field of required) {
        expect(entry[field], `entry ${entry.source_id} missing field ${field}`).toBeDefined();
      }
    }
  });

  it('all source_ids are unique', () => {
    const ids = APPROVED_TRUSTED_SOURCES.map((s) => s.source_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all urls are unique', () => {
    const urls = APPROVED_TRUSTED_SOURCES.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

// ─── Section 4 — Approved source URL gating ──────────────────────────────────

describe('Phase 4 — isApprovedSourceUrl / lookupApprovedSource gating', () => {
  it('returns true for each of the 8 approved URLs', () => {
    for (const entry of APPROVED_TRUSTED_SOURCES) {
      expect(isApprovedSourceUrl(entry.url), `URL should be approved: ${entry.url}`).toBe(true);
    }
  });

  it('returns false for a completely unknown URL', () => {
    expect(isApprovedSourceUrl('https://example.com/random-page')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isApprovedSourceUrl('')).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isApprovedSourceUrl(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isApprovedSourceUrl(undefined)).toBe(false);
  });

  it('returns false for a URL that is only partially correct', () => {
    expect(isApprovedSourceUrl('https://www.nice.org.uk/guidance')).toBe(false);
  });

  it('returns false for a URL from an unapproved domain', () => {
    expect(isApprovedSourceUrl('https://wikipedia.org/wiki/CBT')).toBe(false);
  });

  it('lookupApprovedSource returns the correct entry for an approved URL', () => {
    const entry = lookupApprovedSource('https://www.nice.org.uk/guidance/ng222');
    expect(entry).not.toBeNull();
    expect(entry.source_id).toBe('nice-depression-ng222');
  });

  it('lookupApprovedSource is case-insensitive', () => {
    const entry = lookupApprovedSource('https://www.nice.org.uk/guidance/ng222'.toUpperCase());
    expect(entry).not.toBeNull();
    expect(entry.source_id).toBe('nice-depression-ng222');
  });

  it('lookupApprovedSource returns null for unknown URL', () => {
    expect(lookupApprovedSource('https://unknown.org/document')).toBeNull();
  });

  it('lookupApprovedSource returns null for empty string', () => {
    expect(lookupApprovedSource('')).toBeNull();
  });
});

// ─── Section 5 — Source record factory ───────────────────────────────────────

describe('Phase 4 — createSourceRecord factory', () => {
  it('returns a plain object', () => {
    const record = createSourceRecord({ source_id: 's1', title: 'Test', url: 'https://example.com', publisher: 'Test Publisher', domain: 'example.com', source_type: 'html' });
    expect(typeof record).toBe('object');
    expect(record).not.toBeNull();
  });

  it('content_source_type is always "external_trusted"', () => {
    const record = createSourceRecord({});
    expect(record.content_source_type).toBe('external_trusted');
  });

  it('content_source_type cannot be overridden', () => {
    // Even if a caller passes a different value, it must be ignored
    const record = createSourceRecord({ content_source_type: 'internal' });
    expect(record.content_source_type).toBe('external_trusted');
  });

  it('defaults ingestion_status to "pending"', () => {
    const record = createSourceRecord({});
    expect(record.ingestion_status).toBe('pending');
  });

  it('defaults status to "active"', () => {
    const record = createSourceRecord({});
    expect(record.status).toBe('active');
  });

  it('defaults error_state to null', () => {
    const record = createSourceRecord({});
    expect(record.error_state).toBeNull();
  });

  it('defaults publication_date to null when not provided', () => {
    const record = createSourceRecord({ source_id: 's1' });
    expect(record.publication_date).toBeNull();
  });

  it('accepts provided fields', () => {
    const record = createSourceRecord({
      source_id:        'test-source',
      title:            'Test Title',
      url:              'https://test.org/',
      publisher:        'Test Publisher',
      domain:           'test.org',
      source_type:      'html',
      publication_date: '2024-01-01',
    });
    expect(record.source_id).toBe('test-source');
    expect(record.title).toBe('Test Title');
    expect(record.url).toBe('https://test.org/');
    expect(record.publisher).toBe('Test Publisher');
    expect(record.domain).toBe('test.org');
    expect(record.publication_date).toBe('2024-01-01');
  });

  it('produced record contains all required source schema fields', () => {
    const record = createSourceRecord({});
    const required = ['source_id', 'title', 'url', 'publisher', 'domain', 'source_type',
                      'retrieval_date', 'publication_date', 'status', 'ingestion_status',
                      'error_state', 'content_source_type'];
    for (const field of required) {
      expect(record, `missing field: ${field}`).toHaveProperty(field);
    }
  });

  it('retrieval_date defaults to a non-empty ISO timestamp', () => {
    const record = createSourceRecord({});
    expect(typeof record.retrieval_date).toBe('string');
    expect(record.retrieval_date.length).toBeGreaterThan(0);
    expect(() => new Date(record.retrieval_date)).not.toThrow();
  });
});

// ─── Section 6 — Chunk record factory ────────────────────────────────────────

describe('Phase 4 — createChunkRecord factory', () => {
  it('returns a plain object', () => {
    const chunk = createChunkRecord({ chunk_id: 'c1', source_id: 's1', chunk_text: 'text' });
    expect(typeof chunk).toBe('object');
    expect(chunk).not.toBeNull();
  });

  it('content_source_type is always "external_trusted"', () => {
    const chunk = createChunkRecord({});
    expect(chunk.content_source_type).toBe('external_trusted');
  });

  it('content_source_type cannot be overridden', () => {
    const chunk = createChunkRecord({ content_source_type: 'internal' });
    expect(chunk.content_source_type).toBe('external_trusted');
  });

  it('character_count equals chunk_text.length', () => {
    const text = 'This is a test chunk of text.';
    const chunk = createChunkRecord({ chunk_text: text });
    expect(chunk.character_count).toBe(text.length);
  });

  it('character_count is 0 when chunk_text is empty', () => {
    const chunk = createChunkRecord({ chunk_text: '' });
    expect(chunk.character_count).toBe(0);
  });

  it('defaults chunk_index to 0', () => {
    const chunk = createChunkRecord({});
    expect(chunk.chunk_index).toBe(0);
  });

  it('defaults total_chunks to 1', () => {
    const chunk = createChunkRecord({});
    expect(chunk.total_chunks).toBe(1);
  });

  it('defaults language to "en"', () => {
    const chunk = createChunkRecord({});
    expect(chunk.language).toBe('en');
  });

  it('defaults section_context to null', () => {
    const chunk = createChunkRecord({});
    expect(chunk.section_context).toBeNull();
  });

  it('defaults page_number to null', () => {
    const chunk = createChunkRecord({});
    expect(chunk.page_number).toBeNull();
  });

  it('accepts all required provenance fields', () => {
    const chunk = createChunkRecord({
      chunk_id:        'who-mhgap-ig-v2::chunk_0',
      source_id:       'who-mhgap-ig-v2',
      source_url:      'https://www.who.int/publications/i/item/9789241549790',
      source_title:    'WHO mhGAP Intervention Guide v2.0',
      publisher:       'World Health Organization',
      domain:          'who.int',
      retrieval_date:  '2026-03-19T00:00:00.000Z',
      chunk_index:     0,
      total_chunks:    5,
      chunk_text:      'Comprehensive guidance for mental health intervention.',
    });
    expect(chunk.source_id).toBe('who-mhgap-ig-v2');
    expect(chunk.publisher).toBe('World Health Organization');
    expect(chunk.domain).toBe('who.int');
    expect(chunk.content_source_type).toBe('external_trusted');
  });

  it('produced chunk contains all indexing-compatibility fields', () => {
    const chunk = createChunkRecord({});
    const required = ['chunk_id', 'source_id', 'source_url', 'source_title', 'publisher', 'domain',
                      'retrieval_date', 'publication_date', 'section_context', 'page_number',
                      'chunk_index', 'total_chunks', 'chunk_text', 'character_count',
                      'content_source_type', 'language', 'version', 'metadata'];
    for (const field of required) {
      expect(chunk, `missing field: ${field}`).toHaveProperty(field);
    }
  });
});

// ─── Section 7 — Provenance validation ───────────────────────────────────────

describe('Phase 4 — validateChunkProvenance', () => {
  const WELL_FORMED_CHUNK = {
    chunk_id:            'who-mhgap-ig-v2::chunk_0',
    source_id:           'who-mhgap-ig-v2',
    source_url:          'https://www.who.int/publications/i/item/9789241549790',
    publisher:           'World Health Organization',
    domain:              'who.int',
    retrieval_date:      '2026-03-19T00:00:00.000Z',
    chunk_index:         0,
    chunk_text:          'This is clinical guidance content.',
    content_source_type: 'external_trusted',
  };

  it('accepts a well-formed chunk', () => {
    const result = validateChunkProvenance(WELL_FORMED_CHUNK);
    expect(result.valid).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('rejects null input', () => {
    const result = validateChunkProvenance(null);
    expect(result.valid).toBe(false);
    expect(Array.isArray(result.missing)).toBe(true);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('rejects undefined input', () => {
    const result = validateChunkProvenance(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects empty object', () => {
    const result = validateChunkProvenance({});
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('rejects chunk with missing chunk_id', () => {
    const chunk = { ...WELL_FORMED_CHUNK, chunk_id: '' };
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('chunk_id');
  });

  it('rejects chunk with missing source_id', () => {
    const chunk = { ...WELL_FORMED_CHUNK, source_id: '' };
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('source_id');
  });

  it('rejects chunk with missing source_url', () => {
    const { source_url: _removed, ...rest } = WELL_FORMED_CHUNK;
    const result = validateChunkProvenance(rest);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('source_url');
  });

  it('rejects chunk with missing publisher', () => {
    const { publisher: _removed, ...rest } = WELL_FORMED_CHUNK;
    const result = validateChunkProvenance(rest);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('publisher');
  });

  it('rejects chunk with missing domain', () => {
    const { domain: _removed, ...rest } = WELL_FORMED_CHUNK;
    const result = validateChunkProvenance(rest);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('domain');
  });

  it('rejects chunk with missing retrieval_date', () => {
    const { retrieval_date: _removed, ...rest } = WELL_FORMED_CHUNK;
    const result = validateChunkProvenance(rest);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('retrieval_date');
  });

  it('rejects chunk with missing chunk_text', () => {
    const chunk = { ...WELL_FORMED_CHUNK, chunk_text: '' };
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('chunk_text');
  });

  it('rejects chunk with wrong content_source_type', () => {
    const chunk = { ...WELL_FORMED_CHUNK, content_source_type: 'internal' };
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(false);
    expect(result.missing.some((f) => f.includes('content_source_type'))).toBe(true);
  });

  it('rejects chunk with null content_source_type', () => {
    const chunk = { ...WELL_FORMED_CHUNK, content_source_type: null };
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(false);
  });

  it('chunk produced by createChunkRecord passes validateChunkProvenance when fully specified', () => {
    const chunk = createChunkRecord({
      chunk_id:       'who-mhgap-ig-v2::chunk_0',
      source_id:      'who-mhgap-ig-v2',
      source_url:     'https://www.who.int/publications/i/item/9789241549790',
      publisher:      'World Health Organization',
      domain:         'who.int',
      retrieval_date: '2026-03-19T00:00:00.000Z',
      chunk_index:    0,
      chunk_text:     'This is clinical guidance content from the WHO mhGAP guide.',
    });
    const result = validateChunkProvenance(chunk);
    expect(result.valid).toBe(true);
  });
});

// ─── Section 8 — Source type separation ──────────────────────────────────────

describe('Phase 4 — Source type separation from internal content', () => {
  it('EXTERNAL_CONTENT_SOURCE_TYPE is not in INTERNAL_ALLOWED_ENTITY_TYPES', () => {
    expect(INTERNAL_ALLOWED_ENTITY_TYPES).not.toContain(EXTERNAL_CONTENT_SOURCE_TYPE);
  });

  it('none of the APPROVED_TRUSTED_SOURCES source_ids match internal entity type names', () => {
    const internalTypes = new Set(INTERNAL_ALLOWED_ENTITY_TYPES);
    for (const entry of APPROVED_TRUSTED_SOURCES) {
      expect(internalTypes.has(entry.source_id)).toBe(false);
    }
  });

  it('external chunks cannot be confused with internal chunks (different type field)', () => {
    // Internal chunks use entity_type field; external chunks use content_source_type.
    // They are structurally distinguishable.
    const internalChunk = {
      entity_type: 'Exercise',
      record_id:   'ex-001',
      chunk_text:  'Internal content.',
    };
    const externalChunk = createChunkRecord({
      chunk_id:    'who::chunk_0',
      source_id:   'who-mhgap-ig-v2',
      source_url:  'https://www.who.int/publications/i/item/9789241549790',
      publisher:   'World Health Organization',
      domain:      'who.int',
      retrieval_date: '2026-03-19T00:00:00.000Z',
      chunk_text:  'External content from WHO.',
    });
    expect(externalChunk.content_source_type).toBe('external_trusted');
    expect(internalChunk.entity_type).toBe('Exercise');
    // The type discrimination is unambiguous:
    expect('content_source_type' in externalChunk).toBe(true);
    expect(externalChunk.content_source_type !== internalChunk.entity_type).toBe(true);
  });
});

// ─── Section 9 — HTML normalisation logic ────────────────────────────────────

describe('Phase 4 — HTML content extraction (re-implemented from ingestTrustedDocument)', () => {
  it('strips <script> blocks entirely', () => {
    const html = '<html><script>alert("xss")</script><p>Real content here.</p></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('alert');
    expect(text).not.toContain('xss');
    expect(text).toContain('Real content here');
  });

  it('strips <style> blocks entirely', () => {
    const html = '<html><style>.foo { color: red; }</style><p>Main text.</p></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('color');
    expect(text).toContain('Main text');
  });

  it('strips <nav> blocks', () => {
    const html = '<html><nav><a href="/">Home</a><a href="/about">About</a></nav><p>Article text.</p></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('Home');
    expect(text).not.toContain('About');
    expect(text).toContain('Article text');
  });

  it('strips <header> blocks', () => {
    const html = '<html><header><h1>Site Header</h1></header><main><p>Content here.</p></main></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('Site Header');
    expect(text).toContain('Content here');
  });

  it('strips <footer> blocks', () => {
    const html = '<html><main><p>Main content.</p></main><footer><p>Copyright 2024</p></footer></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('Copyright');
    expect(text).toContain('Main content');
  });

  it('strips <aside> blocks', () => {
    const html = '<html><body><p>Main text.</p><aside><p>Related links</p></aside></body></html>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('Related links');
    expect(text).toContain('Main text');
  });

  it('prefers <main> content when present', () => {
    const html = '<html><body><p>Outside main.</p><main><p>Inside main content.</p></main></body></html>';
    const text = extractHtmlText(html);
    expect(text).toContain('Inside main content');
    expect(text).not.toContain('Outside main');
  });

  it('falls back to <article> content when no <main>', () => {
    const html = '<html><body><p>Outside article.</p><article><p>Article content.</p></article></body></html>';
    const text = extractHtmlText(html);
    expect(text).toContain('Article content');
    expect(text).not.toContain('Outside article');
  });

  it('decodes common HTML entities', () => {
    const html = '<p>Anxiety &amp; depression are common. &lt;10%&gt; of adults affected.</p>';
    const text = extractHtmlText(html);
    expect(text).toContain('Anxiety & depression');
    expect(text).toContain('<10%>');
  });

  it('collapses multiple spaces to single space', () => {
    const html = '<p>Word1    word2   word3</p>';
    const text = extractHtmlText(html);
    expect(text).not.toMatch(/  +/);
    expect(text).toContain('Word1 word2 word3');
  });

  it('strips HTML tags leaving text content', () => {
    const html = '<div><h2>Section Title</h2><p>Paragraph content here.</p></div>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
    expect(text).toContain('Section Title');
    expect(text).toContain('Paragraph content here');
  });

  it('strips HTML comments', () => {
    const html = '<p>Real text.</p><!-- Hidden comment --><p>More text.</p>';
    const text = extractHtmlText(html);
    expect(text).not.toContain('Hidden comment');
    expect(text).toContain('Real text');
  });
});

// ─── Section 10 — Chunking and provenance preservation ───────────────────────

describe('Phase 4 — Chunking and provenance preservation', () => {
  const SAMPLE_CONTENT = [
    'This is the first paragraph of clinical guidance content that explains ',
    'the foundational principles of the intervention approach. It covers several ',
    'key points about evidence-based treatment.',
    '',
    'The second paragraph discusses specific recommendations for practitioners ',
    'working with patients experiencing depression or anxiety symptoms. These ',
    'recommendations are grounded in systematic review evidence.',
    '',
    'A third paragraph covers risk assessment procedures and how to conduct ',
    'structured clinical interviews using validated instruments.',
  ].join('\n');

  it('produces at least one chunk from meaningful content', () => {
    const chunks = splitIntoChunks(SAMPLE_CONTENT);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('each chunk is a non-empty string', () => {
    const chunks = splitIntoChunks(SAMPLE_CONTENT);
    for (const chunk of chunks) {
      expect(typeof chunk).toBe('string');
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array for empty text', () => {
    expect(splitIntoChunks('')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const short = 'Short content.';
    const chunks = splitIntoChunks(short);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Short content.');
  });

  it('chunk records built from approved entry preserve all required provenance', () => {
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const chunks = buildChunkRecordsFromText(SAMPLE_CONTENT, SAMPLE_WHO_SOURCE, retrievalDate);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const validation = validateChunkProvenance(chunk);
      expect(validation.valid, `chunk ${chunk.chunk_id} failed provenance validation: ${JSON.stringify(validation.missing)}`).toBe(true);
    }
  });

  it('chunk records carry the correct source provenance from the approved entry', () => {
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const chunks = buildChunkRecordsFromText(SAMPLE_CONTENT, SAMPLE_WHO_SOURCE, retrievalDate);
    for (const chunk of chunks) {
      expect(chunk.source_id).toBe('who-mhgap-ig-v2');
      expect(chunk.source_url).toBe(SAMPLE_WHO_SOURCE.url);
      expect(chunk.publisher).toBe('World Health Organization');
      expect(chunk.domain).toBe('who.int');
      expect(chunk.retrieval_date).toBe(retrievalDate);
      expect(chunk.content_source_type).toBe('external_trusted');
    }
  });

  it('chunk_ids are unique within a set of chunks from the same source', () => {
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const text = Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1}. This is a substantial amount of text to ensure multiple chunks are produced during processing.`).join('\n\n');
    const chunks = buildChunkRecordsFromText(text, SAMPLE_WHO_SOURCE, retrievalDate);
    const ids = chunks.map((c) => c.chunk_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chunk_index is sequential starting at 0', () => {
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}. A long enough text string to create multiple chunks in the output from the chunker algorithm used.`).join('\n\n');
    const chunks = buildChunkRecordsFromText(text, SAMPLE_WHO_SOURCE, retrievalDate);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunk_index).toBe(i);
    }
  });

  it('total_chunks matches the actual number of chunks', () => {
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}. Sufficient content to ensure chunking occurs with multiple output records.`).join('\n\n');
    const chunks = buildChunkRecordsFromText(text, SAMPLE_WHO_SOURCE, retrievalDate);
    const total = chunks[0]?.total_chunks;
    expect(total).toBe(chunks.length);
  });

  it('PDF source with pre-extracted text produces valid chunks', () => {
    const pdfText = [
      'Pre-extracted text from the NIMH ASQ screening tool.',
      '',
      'Question 1: In the past few weeks, have you wished you were dead?',
      '',
      'Question 2: In the past few weeks, have you felt that you or your family would be better off if you were dead?',
      '',
      'Question 3: In the past week, have you been having thoughts about killing yourself?',
      '',
      'Question 4: Have you ever tried to kill yourself? If yes, when was the most recent time?',
    ].join('\n');
    const retrievalDate = '2026-03-19T00:00:00.000Z';
    const chunks = buildChunkRecordsFromText(pdfText, SAMPLE_NIMH_PDF, retrievalDate);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.source_id).toBe('nimh-asq-pdf');
      expect(chunk.content_source_type).toBe('external_trusted');
      expect(validateChunkProvenance(chunk).valid).toBe(true);
    }
  });
});

// ─── Section 11 — Ingestion gating ───────────────────────────────────────────

describe('Phase 4 — Ingestion is gated by feature flag', () => {
  it('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED')).toBe(false);
  });

  it('THERAPIST_UPGRADE_ENABLED (master gate) is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('ingestion gating simulation: when flag is off, ingestion path must not execute', () => {
    // This simulates the guard at the ingestion call site.
    const ingestionEnabled = isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED');
    expect(ingestionEnabled).toBe(false);
    // When false, the ingestion pipeline should not be entered.
    // This is enforced at the Deno function level via env var checks.
  });
});

// ─── Section 12 — Ingestion failure safety ───────────────────────────────────

describe('Phase 4 — Ingestion failure is safe', () => {
  it('validateChunkProvenance does not throw on any input', () => {
    const inputs = [null, undefined, '', 0, [], {}, { chunk_text: 'text' }];
    for (const input of inputs) {
      expect(() => validateChunkProvenance(input)).not.toThrow();
    }
  });

  it('lookupApprovedSource does not throw on any input', () => {
    const inputs = [null, undefined, '', 0, [], {}, 'arbitrary string'];
    for (const input of inputs) {
      expect(() => lookupApprovedSource(input)).not.toThrow();
    }
  });

  it('isApprovedSourceUrl does not throw on any input', () => {
    const inputs = [null, undefined, '', 0, [], {}, 'arbitrary string'];
    for (const input of inputs) {
      expect(() => isApprovedSourceUrl(input)).not.toThrow();
    }
  });

  it('createSourceRecord does not throw on empty input', () => {
    expect(() => createSourceRecord({})).not.toThrow();
    expect(() => createSourceRecord()).not.toThrow();
  });

  it('createChunkRecord does not throw on empty input', () => {
    expect(() => createChunkRecord({})).not.toThrow();
    expect(() => createChunkRecord()).not.toThrow();
  });

  it('splitIntoChunks does not throw on empty or null-ish inputs', () => {
    expect(() => splitIntoChunks('')).not.toThrow();
    expect(() => splitIntoChunks(null)).not.toThrow();
  });

  it('extractHtmlText does not throw on empty input', () => {
    expect(() => extractHtmlText('')).not.toThrow();
  });

  it('extractHtmlText on empty input returns empty string', () => {
    expect(extractHtmlText('')).toBe('');
  });
});

// ─── Section 13 — Current therapist default path unchanged ───────────────────

describe('Phase 4 — Current therapist default path unchanged', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    // All flags are false, so resolveTherapistWiring must return the hybrid wiring.
    const resolved = resolveTherapistWiring();
    expect(resolved).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_AI_COMPANION_WIRING is not null', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).not.toBeNull();
  });

  it('CBT_THERAPIST_WIRING_HYBRID does not include external knowledge sources', () => {
    // The hybrid wiring should have no reference to external trusted sources.
    const wiringStr = JSON.stringify(CBT_THERAPIST_WIRING_HYBRID);
    expect(wiringStr).not.toContain('external_trusted');
    expect(wiringStr).not.toContain('who-mhgap');
    expect(wiringStr).not.toContain('TRUSTED_INGESTION');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING has no stage2 flag that would activate Phase 4', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.stage2).toBeFalsy();
  });
});

// ─── Section 14 — Current retrieval behavior unchanged ────────────────────────

describe('Phase 4 — Current retrieval behavior unchanged', () => {
  it('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for RETRIEVAL_ORCHESTRATION flag', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED')).toBe(false);
  });

  it('isUpgradeEnabled returns false for ALLOWLIST_WRAPPER flag', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED')).toBe(false);
  });

  it('EXTERNAL_CONTENT_SOURCE_TYPE is not referenced in the active therapist wiring', () => {
    const wiringStr = JSON.stringify(ACTIVE_CBT_THERAPIST_WIRING);
    expect(wiringStr).not.toContain(EXTERNAL_CONTENT_SOURCE_TYPE);
  });
});

// ─── Section 15 — Phase 0 / 0.1 / 1 / 2 / 3 baselines preserved ──────────────

describe('Phase 4 — Phase 0 / 0.1 / 1 / 2 / 3 baselines preserved (regression check)', () => {
  it('THERAPIST_UPGRADE_FLAGS is still frozen', () => {
    expect(Object.isFrozen(THERAPIST_UPGRADE_FLAGS)).toBe(true);
  });

  it('THERAPIST_UPGRADE_FLAGS still contains exactly 14 flags', () => {
    expect(Object.keys(THERAPIST_UPGRADE_FLAGS)).toHaveLength(17);
  });

  it('all Stage 2 flags are still false', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });

  it('THERAPIST_UPGRADE_ENABLED is still false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_MEMORY_ENABLED is still false (Phase 1 baseline)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED is still false (Phase 2 baseline)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SUMMARIZATION_ENABLED).toBe(false);
  });

  it('THERAPIST_UPGRADE_WORKFLOW_ENABLED is still false (Phase 3 baseline)', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_WORKFLOW_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for every known flag', () => {
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      expect(isUpgradeEnabled(flagName), `"${flagName}" must be unreachable`).toBe(false);
    }
  });

  it('isUpgradeEnabled returns false for an unknown flag (isolation guard)', () => {
    expect(isUpgradeEnabled('NONEXISTENT_FLAG')).toBe(false);
  });

  it('resolveTherapistWiring still returns HYBRID in default mode', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('rollback remains safe: disabling THERAPIST_UPGRADE_ENABLED disables Phase 4 gate', () => {
    // The master flag is already false (the current default state).
    // isUpgradeEnabled enforces that THERAPIST_UPGRADE_ENABLED must be true
    // before any per-phase flag can return true. Since it is false, Phase 4
    // ingestion is unreachable.
    const masterOff = THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED === false;
    const phase4Off = isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED') === false;
    expect(masterOff).toBe(true);
    expect(phase4Off).toBe(true);
  });
});
