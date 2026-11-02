/**
 * @file base44/functions/ingestTrustedDocument/entry.ts
 *
 * Therapist Upgrade — Phase 4 — External Trusted Knowledge Ingestion
 *
 * Admin-only function that ingests an approved external trusted-knowledge
 * source into normalized chunk records for later retrieval.
 *
 * FEATURE FLAGS
 * -------------
 * THERAPIST_UPGRADE_ENABLED              — master gate (must be 'true')
 * THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED — phase gate (must be 'true')
 * Both must be 'true' for any ingestion to proceed.
 *
 * SOURCE SEPARATION
 * -----------------
 * All output chunks carry content_source_type = 'external_trusted'.
 * This marker separates external chunks from internal content (Exercise,
 * Resource, JournalTemplate, Psychoeducation) in the knowledge index.
 * The existing internal indexing pipeline (backfillKnowledgeIndex,
 * indexContentRecord) is NOT modified by this function.
 *
 * HTML INGESTION
 * --------------
 * For HTML source_type, the function:
 * 1. Fetches the approved URL with a bounded timeout.
 * 2. Strips structural noise: <script>, <style>, <nav>, <header>, <footer>,
 *    <aside> elements.
 * 3. Prefers <main> or <article> content if present; falls back to <body>.
 * 4. Strips remaining HTML tags to produce clean text.
 * 5. Normalizes whitespace.
 * 6. Chunks the text using paragraph-aware chunking.
 * 7. Preserves full provenance on every chunk.
 *
 * PDF INGESTION — PHASE 4 LIMITATION
 * ------------------------------------
 * Full live PDF binary extraction is not safely available in this Deno
 * environment without external library dependencies. Phase 4 supports PDF
 * sources via the pdf_text path only: the caller provides pre-extracted text
 * via the pre_extracted_text field. The function then normalizes, chunks, and
 * adds provenance as for the HTML path.
 *
 * PDF sources with no pre_extracted_text provided are returned as
 * mode='pdf_unsupported' without error, so they do not block the phase.
 * Full live PDF extraction is deferred to a future phase when a bounded,
 * reliable extraction path is confirmed safe.
 *
 * ISOLATION
 * ---------
 * This function does NOT change the current default therapist path. It is
 * only reachable when both upgrade flags are enabled. It does NOT connect
 * ingested chunks to therapist runtime behavior in any way.
 *
 * INPUT
 * -----
 * {
 *   source_url:           string,   // Must match an approved registry entry
 *   pre_extracted_text?:  string,   // Required for pdf_text path; ignored for HTML
 *   dry_run?:             boolean,  // Validate + normalize without indexing (default: false)
 * }
 *
 * PHASE 4.1 — REAL STORAGE
 * ------------------------
 * In live mode (dry_run=false), approved ingestion now persists source and
 * chunk records to Base44 app storage:
 *   - ExternalKnowledgeSource entity for source records.
 *   - ExternalKnowledgeChunk entity for chunk records.
 * Persistence is attempted after all records are built and validated.
 * Repeated ingestion of the same source_id performs a safe upsert.
 * Persistence failure is non-blocking — the ingestion response is still
 * returned with a persistence_error field describing the failure.
 * Dry-run mode skips persistence entirely (no records written).
 *
 * OUTPUT (success)
 * ----------------
 * {
 *   success: true,
 *   mode: 'live' | 'dry_run' | 'pdf_unsupported',
 *   source: object,         // Source record with full provenance
 *   chunks: object[],       // Chunk records with full provenance
 *   total_chunks: number,
 *   persisted: boolean,              // true when records were written to app storage
 *   source_record_id?: string,       // App storage ID of the persisted source
 *   chunks_persisted?: number,       // Number of chunk records written
 *   persistence_error?: string,      // Set when persistence was attempted but failed
 * }
 *
 * OUTPUT (error / gated)
 * ----------------------
 * { success: false, error: string }                    — validation / fetch error
 * { success: false, error: string, gated: true }       — flag off (HTTP 503)
 * { success: false, error: string, not_approved: true } — source not in registry
 *
 * See docs/therapist-upgrade-stage2-plan.md — Task 4.1
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Feature flag evaluation ──────────────────────────────────────────────────

function isIngestionEnabled(): boolean {
  return (
    Deno.env.get('THERAPIST_UPGRADE_ENABLED') === 'true' &&
    Deno.env.get('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED') === 'true'
  );
}

// ─── Approved source registry ─────────────────────────────────────────────────
// Mirrors src/lib/externalKnowledgeSource.js — APPROVED_TRUSTED_SOURCES.
// Duplicated here because inter-function imports and npm module imports for
// shared front-end lib files are not available in the Deno edge runtime.

const EXTERNAL_CONTENT_SOURCE_TYPE = 'external_trusted';

const EXTERNAL_SOURCE_TYPES = Object.freeze({
  HTML:     'html',
  PDF:      'pdf',
  PDF_TEXT: 'pdf_text',
});

const APPROVED_TRUSTED_SOURCES = Object.freeze([
  Object.freeze({ source_id: 'who-mhgap-ig-v2',       url: 'https://www.who.int/publications/i/item/9789241549790',                                                                                                                   publisher: 'World Health Organization',                                           domain: 'who.int',              source_type: 'html', publication_date: '2016-01-01', title: 'WHO mhGAP Intervention Guide v2.0' }),
  Object.freeze({ source_id: 'nice-depression-ng222',  url: 'https://www.nice.org.uk/guidance/ng222',                                                                                                                                publisher: 'National Institute for Health and Care Excellence',                   domain: 'nice.org.uk',          source_type: 'html', publication_date: '2022-06-29', title: 'NICE Depression in adults: treatment and management' }),
  Object.freeze({ source_id: 'nice-selfharm-ng225',    url: 'https://www.nice.org.uk/guidance/ng225',                                                                                                                                publisher: 'National Institute for Health and Care Excellence',                   domain: 'nice.org.uk',          source_type: 'html', publication_date: '2022-09-07', title: 'NICE Self-harm: assessment, management and preventing recurrence' }),
  Object.freeze({ source_id: 'va-dod-suicide-risk-cpg', url: 'https://www.healthquality.va.gov/guidelines/MH/srb/',                                                                                                                 publisher: 'U.S. Department of Veterans Affairs / Department of Defense',        domain: 'healthquality.va.gov', source_type: 'html', publication_date: '2019-01-01', title: 'VA/DoD Clinical Practice Guideline – Suicide Risk – Provider Summary' }),
  Object.freeze({ source_id: 'samhsa-tip57',           url: 'https://store.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/PEP14-02-00-002',                                                              publisher: 'Substance Abuse and Mental Health Services Administration',          domain: 'store.samhsa.gov',     source_type: 'html', publication_date: '2014-01-01', title: 'SAMHSA TIP 57 Trauma-Informed Care in Behavioral Health Services' }),
  Object.freeze({ source_id: 'nimh-asq-toolkit',       url: 'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials',                                                                                   publisher: 'National Institute of Mental Health',                                domain: 'nimh.nih.gov',         source_type: 'html', publication_date: null,         title: 'NIMH ASQ Toolkit landing page' }),
  Object.freeze({ source_id: 'nimh-asq-pdf',           url: 'https://www.nimh.nih.gov/sites/default/files/documents/research/research-conducted-at-nimh/asq-toolkit-materials/asq-tool/asq_english.pdf',                            publisher: 'National Institute of Mental Health',                                domain: 'nimh.nih.gov',         source_type: 'pdf',  publication_date: null,         title: 'NIMH ASQ screening tool PDF' }),
  Object.freeze({ source_id: 'columbia-cssrs',         url: 'https://cssrs.columbia.edu/the-columbia-scale-c-ssrs/cssrs-for-communities-and-healthcare/',                                                                           publisher: 'Columbia Lighthouse Project',                                        domain: 'cssrs.columbia.edu',   source_type: 'html', publication_date: null,         title: 'Columbia / C-SSRS public screening resources' }),
]);

function lookupApprovedSource(url: string) {
  if (!url) return null;
  const normalized = url.trim().toLowerCase();
  return APPROVED_TRUSTED_SOURCES.find(
    (src) => src.url.toLowerCase() === normalized,
  ) ?? null;
}

// ─── HTML content extraction ──────────────────────────────────────────────────

/**
 * Extracts clean readable text from raw HTML.
 *
 * Strategy:
 * 1. Remove <script>, <style>, <nav>, <header>, <footer>, <aside> blocks.
 * 2. Prefer <main> or <article> content; fall back to full body.
 * 3. Strip remaining HTML tags.
 * 4. Normalize whitespace.
 *
 * This is a bounded regex-based approach that avoids external HTML-parser
 * dependencies in the Deno runtime. It is intentionally conservative — it
 * may leave some navigation fragments in edge cases but will never include
 * script or style content.
 */
function extractHtmlText(html: string): string {
  let text = html;

  // Remove entire script and style blocks (including content).
  // Use [^>]* before > in closing tags to match variants like </script > or </style anything>.
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // Remove structural noise elements (including their content)
  text = text.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ');
  text = text.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ');

  // Try to extract <main> or <article> content first
  const mainMatch = text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const articleMatch = text.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch) text = mainMatch[1];
  else if (articleMatch) text = articleMatch[1];

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities.
  // &amp; is decoded last to avoid double-unescaping (e.g. &amp;lt; → &lt; → <).
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, '&');

  // Normalize whitespace: collapse runs of spaces/tabs, preserve paragraph breaks
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

// ─── Text chunking ────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP    = 100;

/**
 * Finds a good split boundary near max_pos within text.
 * Prefers sentence end → word boundary → hard cut.
 */
function findSplitBoundary(text: string, maxPos: number): number {
  const searchFrom = Math.floor(maxPos * 0.7);
  for (let i = maxPos; i >= searchFrom; i--) {
    if (text[i] === '.' || text[i] === '?' || text[i] === '!') {
      if (i + 1 >= text.length || text[i + 1] === ' ' || text[i + 1] === '\n') {
        return i + 1;
      }
    }
  }
  for (let i = maxPos; i >= searchFrom; i--) {
    if (text[i] === ' ' || text[i] === '\n') return i + 1;
  }
  return maxPos;
}

/**
 * Splits text into chunks using paragraph-aware chunking with overlap.
 * Mirrors the logic in chunkContentDocument/entry.ts.
 */
function splitIntoChunks(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): string[] {
  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const rawChunks: string[] = [];
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
        const overlapText = current.length > overlap
          ? current.slice(current.length - overlap)
          : current;
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

// ─── Source + chunk record builders ──────────────────────────────────────────

function buildSourceRecord(
  approvedEntry: Record<string, unknown>,
  retrievalDate: string,
  chunkCount = 0,
) {
  const sourceStatus = approvedEntry.source_status ?? 'active';
  const sourceId = typeof approvedEntry.source_id === 'string' ? approvedEntry.source_id : '';
  const sourceUrl = typeof approvedEntry.url === 'string' ? approvedEntry.url : '';

  return {
    source_id:           approvedEntry.source_id,
    title:               approvedEntry.title,
    url:                 approvedEntry.url,
    publisher:           approvedEntry.publisher,
    domain:              approvedEntry.domain,
    source_type:         approvedEntry.source_type,
    retrieval_date:      retrievalDate,
    publication_date:    approvedEntry.publication_date ?? null,
    source_status:       sourceStatus,
    status:              approvedEntry.status ?? sourceStatus,
    ingestion_status:    approvedEntry.ingestion_status ?? 'complete',
    error_state:         approvedEntry.error_state ?? null,
    source_fingerprint:  approvedEntry.source_fingerprint ?? (sourceId && sourceUrl ? `${sourceId}::${sourceUrl}` : null),
    content_source_type: EXTERNAL_CONTENT_SOURCE_TYPE,
    chunk_count:         chunkCount,
    language:            'en',
    version:             1,
  };
}

function buildChunkRecords(
  rawChunks: string[],
  approvedEntry: Record<string, unknown>,
  retrievalDate: string,
): object[] {
  const total = rawChunks.length;
  return rawChunks.map((text, index) => ({
    chunk_id:                  `${approvedEntry.source_id}::chunk_${index}`,
    source_id:                 approvedEntry.source_id,
    source_url:                approvedEntry.url,
    source_title:              approvedEntry.title,
    publisher:                 approvedEntry.publisher,
    domain:                    approvedEntry.domain,
    retrieval_date:            retrievalDate,
    publication_date:          approvedEntry.publication_date ?? null,
    section_context:           null,
    page_number:               null,
    chunk_index:               index,
    total_chunks:              total,
    chunk_text:                text,
    character_count:           text.length,
    content_source_type:       EXTERNAL_CONTENT_SOURCE_TYPE,
    entity_type:               'ExternalKnowledgeChunk',
    language:                  'en',
    version:                   1,
    metadata:                  {
      source_id:   approvedEntry.source_id,
      publisher:   approvedEntry.publisher,
      domain:      approvedEntry.domain,
      source_type: approvedEntry.source_type,
    },
  }));
}

// ─── Phase 4.1 — Persistence to app storage ──────────────────────────────────

/**
 * Minimal type alias for Base44 SDK entity operations used in this function.
 * The SDK client's entity map is typed as `any` in the Deno environment, so
 * we use a local type alias to keep the persistence code readable.
 */
type EntityMap = Record<string, {
  filter:  (query: Record<string, unknown>) => Promise<Array<{ id: string }>>;
  create:  (data:  Record<string, unknown>) => Promise<{ id: string }>;
  update:  (id: string, data: Record<string, unknown>) => Promise<void>;
  delete:  (id: string) => Promise<void>;
}>;

/**
 * Persists an ingested source record and its chunk records to Base44 app
 * storage (ExternalKnowledgeSource and ExternalKnowledgeChunk entities).
 *
 * This function is the real-storage write path for Phase 4.1. It is called
 * only in live mode (dry_run=false) after all records are built and validated.
 *
 * DEDUPLICATION
 * -------------
 * Before creating a new source record, this function queries the
 * ExternalKnowledgeSource entity to check whether a record with the same
 * source_id already exists. If found, the existing record is updated (upsert).
 * This makes repeated ingestion of the same approved source safe and
 * idempotent.
 *
 * CHUNK PERSISTENCE
 * -----------------
 * Each chunk is created as a new ExternalKnowledgeChunk record carrying a
 * reference to the source record's app storage ID (external_source_record_id).
 * Existing chunks for the same source are deleted before re-inserting, so
 * repeated ingestion replaces stale chunks cleanly without accumulation.
 *
 * FAILURE HANDLING
 * ----------------
 * Any persistence failure is caught and returned as a structured result.
 * The caller (request handler) returns the ingestion response regardless of
 * whether persistence succeeded, so storage failure is non-blocking.
 *
 * ISOLATION
 * ---------
 * This function writes only to ExternalKnowledgeSource and ExternalKnowledgeChunk.
 * It does NOT modify any existing entity, index, or retrieval pipeline.
 *
 * @param base44Client - Authenticated Base44 SDK client from the request.
 * @param source       - Source record built by buildSourceRecord().
 * @param chunks       - Chunk records built by buildChunkRecords().
 * @returns Persistence result with stored IDs and counts, or an error description.
 */
async function persistToAppStorage(
  base44Client: ReturnType<typeof createClientFromRequest>,
  source: Record<string, unknown>,
  chunks: object[],
): Promise<{
  persisted: boolean;
  source_record_id: string | null;
  chunks_persisted: number;
  persistence_error?: string;
}> {
  const entities = base44Client.entities as EntityMap;

  try {
    // ── Step 1: Upsert source record ─────────────────────────────────────────
    let storedSourceId: string | null = null;

    // Check for an existing record with the same source_id to support safe
    // repeated ingestion (deduplication by source_id).
    let existingSourceId: string | null = null;
    try {
      const existingSources = await entities.ExternalKnowledgeSource.filter({ source_id: source.source_id });
      if (Array.isArray(existingSources) && existingSources.length > 0) {
        existingSourceId = existingSources[0].id;
      }
    } catch (_queryErr) {
      // Entity may not exist in app yet — proceed to create.
    }

    if (existingSourceId) {
      // Update existing source record (upsert).
      await entities.ExternalKnowledgeSource.update(existingSourceId, {
        ...source,
        last_ingested_at: new Date().toISOString(),
      });
      storedSourceId = existingSourceId;
    } else {
      // Create new source record.
      const created = await entities.ExternalKnowledgeSource.create({
        ...source,
        last_ingested_at: new Date().toISOString(),
      });
      storedSourceId = created.id;
    }

    // ── Step 2: Replace chunk records for this source ────────────────────────
    // Delete any existing chunks for this source_id to avoid stale accumulation
    // on repeated ingestion.
    try {
      const existingChunks = await entities.ExternalKnowledgeChunk.filter({ source_id: source.source_id });
      if (Array.isArray(existingChunks) && existingChunks.length > 0) {
        for (const existing of existingChunks) {
          await entities.ExternalKnowledgeChunk.delete(existing.id);
        }
      }
    } catch (_deleteErr) {
      // If deletion fails, proceed to create — stale chunks are acceptable;
      // they carry the correct provenance and source separation marker.
    }

    // ── Step 3: Create new chunk records ─────────────────────────────────────
    let chunksPersisted = 0;
    for (const chunk of chunks) {
      await (base44Client.entities as Record<string, {
        create: (data: Record<string, unknown>) => Promise<{ id: string }>;
      }>).ExternalKnowledgeChunk.create({
        ...(chunk as Record<string, unknown>),
        external_source_record_id: storedSourceId,
      });
      chunksPersisted++;
    }

    return { persisted: true, source_record_id: storedSourceId, chunks_persisted: chunksPersisted };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[ingestTrustedDocument] Persistence to app storage failed (non-blocking):', err);
    return { persisted: false, source_record_id: null, chunks_persisted: 0, persistence_error: message };
  }
}

// ─── Request handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    // ── Admin gate ─────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ── Feature flag gate ──────────────────────────────────────────────────
    if (!isIngestionEnabled()) {
      return Response.json(
        {
          success: false,
          error:   'Ingestion is not enabled. Set THERAPIST_UPGRADE_ENABLED=true and THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED=true to enable.',
          gated:   true,
        },
        { status: 503 },
      );
    }

    // ── Parse and validate input ───────────────────────────────────────────
    const body = await req.json();
    const {
      source_url,
      pre_extracted_text,
      dry_run = false,
    } = body ?? {};

    if (!source_url || typeof source_url !== 'string') {
      return Response.json(
        { success: false, error: 'source_url is required and must be a string.' },
        { status: 400 },
      );
    }

    // ── Approved source validation ─────────────────────────────────────────
    const approvedEntry = lookupApprovedSource(source_url);
    if (!approvedEntry) {
      return Response.json(
        {
          success:      false,
          error:        `Source URL is not in the approved registry: ${source_url}`,
          not_approved: true,
        },
        { status: 400 },
      );
    }

    const retrievalDate = new Date().toISOString();

    // ── PDF source handling ────────────────────────────────────────────────
    if (approvedEntry.source_type === EXTERNAL_SOURCE_TYPES.PDF) {
      if (!pre_extracted_text || typeof pre_extracted_text !== 'string' || pre_extracted_text.trim() === '') {
        // Safe fallback: PDF without pre-extracted text is noted as unsupported
        // in Phase 4. Full live PDF extraction is deferred to a future phase.
        return Response.json({
          success:      true,
          mode:         'pdf_unsupported',
          source:       buildSourceRecord({ ...approvedEntry, ingestion_status: 'skipped' } as Record<string, unknown>, retrievalDate, 0),
          chunks:       [],
          total_chunks: 0,
          note:         'PDF binary extraction is not yet available in Phase 4. Provide pre_extracted_text to ingest this source.',
        });
      }
      // PDF with pre-extracted text — treat as text input
      const cleanText = pre_extracted_text.trim();
      const rawChunks = splitIntoChunks(cleanText);

      if (rawChunks.length === 0) {
        return Response.json(
          { success: false, error: 'pre_extracted_text produced no usable chunks after normalization.' },
          { status: 400 },
        );
      }

      const source = buildSourceRecord(approvedEntry as Record<string, unknown>, retrievalDate, rawChunks.length);
      const chunks = buildChunkRecords(rawChunks, approvedEntry as Record<string, unknown>, retrievalDate);

      // ── Phase 4.1: Persist to app storage (live mode only) ──────────────
      let pdfPersistResult: Awaited<ReturnType<typeof persistToAppStorage>> | null = null;
      if (!dry_run) {
        pdfPersistResult = await persistToAppStorage(base44, source, chunks);
      }

      return Response.json({
        success:      true,
        mode:         dry_run ? 'dry_run' : 'live',
        source,
        chunks:       dry_run ? [] : chunks,
        chunks_would_index: dry_run ? chunks.length : undefined,
        total_chunks: dry_run ? 0 : chunks.length,
        dry_run_would_index: dry_run ? chunks.length : undefined,
        ...(pdfPersistResult ?? {}),
      });
    }

    // ── HTML source ingestion ──────────────────────────────────────────────
    // Fetch with a bounded timeout to avoid hanging indefinitely.
    const controller  = new AbortController();
    const timeoutId   = setTimeout(() => controller.abort(), 15_000);

    let rawHtml: string;
    try {
      const response = await fetch(approvedEntry.url as string, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MindfulPath-KnowledgeIngestion/1.0 (admin-only; non-commercial; research)' },
      });
      if (!response.ok) {
        return Response.json(
          { success: false, error: `Fetch failed: HTTP ${response.status} for ${approvedEntry.url}` },
          { status: 502 },
        );
      }
      rawHtml = await response.text();
    } catch (fetchErr: unknown) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return Response.json(
        { success: false, error: `Fetch error: ${message}` },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const cleanText = extractHtmlText(rawHtml);
    if (!cleanText || cleanText.length < 50) {
      return Response.json(
        { success: false, error: 'HTML extraction produced insufficient text content.' },
        { status: 422 },
      );
    }

    const rawChunks = splitIntoChunks(cleanText);
    if (rawChunks.length === 0) {
      return Response.json(
        { success: false, error: 'Chunking produced no usable chunks from extracted text.' },
        { status: 422 },
      );
    }

    const source = buildSourceRecord(approvedEntry as Record<string, unknown>, retrievalDate, rawChunks.length);
    const chunks = buildChunkRecords(rawChunks, approvedEntry as Record<string, unknown>, retrievalDate);

    // ── Phase 4.1: Persist to app storage (live mode only) ────────────────
    let htmlPersistResult: Awaited<ReturnType<typeof persistToAppStorage>> | null = null;
    if (!dry_run) {
      htmlPersistResult = await persistToAppStorage(base44, source, chunks);
    }

    return Response.json({
      success:      true,
      mode:         dry_run ? 'dry_run' : 'live',
      source,
      chunks:       dry_run ? [] : chunks,
      total_chunks: dry_run ? 0 : chunks.length,
      dry_run_would_index: dry_run ? chunks.length : undefined,
      ...(htmlPersistResult ?? {}),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});