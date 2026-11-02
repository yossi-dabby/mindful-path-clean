/**
 * @file src/lib/externalKnowledgeSource.js
 *
 * Therapist Upgrade — Stage 2 Phase 4 — External Knowledge Source Model
 *
 * Defines the shape of external trusted-knowledge source records and the
 * approved source registry. This module is the single source of truth for
 * which external sources are permitted in the Phase 4 ingestion pipeline.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module contains only model definitions and approved-source registry
 * data. It does NOT fetch data, trigger indexing, modify any database, or
 * interact with the current therapist runtime in any way.
 *
 * FLAG GATE
 * ---------
 * Callers must check isUpgradeEnabled('THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED')
 * before invoking any ingestion operation. This module itself is passive — it
 * does not check flags. The flag gate lives at the ingestion call site.
 *
 * SOURCE SEPARATION
 * -----------------
 * External trusted-knowledge sources are completely separate from the existing
 * internal shared content entities (Exercise, Resource, JournalTemplate,
 * Psychoeducation). The EXTERNAL_CONTENT_SOURCE_TYPE marker ensures chunk
 * records can always be distinguished from internal content at retrieval time.
 *
 * APPROVED SOURCE LIST
 * --------------------
 * Only the 8 sources in APPROVED_TRUSTED_SOURCES are permitted in Phase 4.
 * Do not add sources without explicit approval.
 *
 * What this module must NOT do:
 * - Connect to the therapist runtime
 * - Modify existing entity schemas
 * - Trigger any live fetch or indexing operation
 * - Add sources beyond the Phase 4 approved list
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 4
 */

// ─── Source type enum ─────────────────────────────────────────────────────────

/**
 * Source document type.
 * @type {Readonly<Record<string, string>>}
 */
export const EXTERNAL_SOURCE_TYPES = Object.freeze({
  /** Full HTML page to be fetched and parsed. */
  HTML: 'html',
  /** PDF document — requires live PDF extraction. */
  PDF: 'pdf',
  /**
   * PDF source with pre-extracted text provided by the caller.
   * This is the safe Phase 4 PDF path. Full live PDF extraction is not
   * yet implemented — see PDF ingestion limitation notes in
   * base44/functions/ingestTrustedDocument/entry.ts.
   */
  PDF_TEXT: 'pdf_text',
});

// ─── Ingestion status enum ────────────────────────────────────────────────────

/**
 * Ingestion pipeline status for a source record.
 * @type {Readonly<Record<string, string>>}
 */
export const EXTERNAL_INGESTION_STATUS = Object.freeze({
  PENDING:     'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETE:    'complete',
  FAILED:      'failed',
  SKIPPED:     'skipped',
});

// ─── Source record status enum ────────────────────────────────────────────────

/**
 * Lifecycle status of an external source record.
 * @type {Readonly<Record<string, string>>}
 */
export const EXTERNAL_SOURCE_STATUS = Object.freeze({
  ACTIVE:     'active',
  DEPRECATED: 'deprecated',
  ERROR:      'error',
});

// ─── Content source type marker ───────────────────────────────────────────────

/**
 * Marker that identifies external trusted-knowledge chunks in the index.
 *
 * All chunks produced by the Phase 4 ingestion pipeline carry this marker,
 * ensuring they can be distinguished from internal shared content at retrieval
 * time (where internal content carries entity_type = 'Exercise', 'Resource',
 * 'JournalTemplate', or 'Psychoeducation').
 *
 * This constant is embedded in every chunk record's metadata. It is the
 * primary source-separation guard between external and internal content.
 *
 * @type {string}
 */
export const EXTERNAL_CONTENT_SOURCE_TYPE = 'external_trusted';

// ─── Approved trusted source registry ────────────────────────────────────────

/**
 * The complete approved source registry for Phase 4.
 *
 * Only these 8 sources may be ingested in this phase. Do not add additional
 * sources without explicit approval.
 *
 * Each entry includes:
 *   source_id        — Stable identifier for this source
 *   title            — Human-readable source title
 *   url              — Canonical source URL (required for HTML sources)
 *   publisher        — Organization that published the source
 *   domain           — Publisher domain used for URL matching
 *   source_type      — One of EXTERNAL_SOURCE_TYPES
 *   publication_date — Known publication/update date, or null if unknown
 *   approved         — Always true for approved registry entries
 *
 * @type {ReadonlyArray<Readonly<object>>}
 */
export const APPROVED_TRUSTED_SOURCES = Object.freeze([
  Object.freeze({
    source_id:        'who-mhgap-ig-v2',
    title:            'WHO mhGAP Intervention Guide v2.0',
    url:              'https://www.who.int/publications/i/item/9789241549790',
    publisher:        'World Health Organization',
    domain:           'who.int',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: '2016-01-01',
    approved:         true,
  }),
  Object.freeze({
    source_id:        'nice-depression-ng222',
    title:            'NICE Depression in adults: treatment and management',
    url:              'https://www.nice.org.uk/guidance/ng222',
    publisher:        'National Institute for Health and Care Excellence',
    domain:           'nice.org.uk',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: '2022-06-29',
    approved:         true,
  }),
  Object.freeze({
    source_id:        'nice-selfharm-ng225',
    title:            'NICE Self-harm: assessment, management and preventing recurrence',
    url:              'https://www.nice.org.uk/guidance/ng225',
    publisher:        'National Institute for Health and Care Excellence',
    domain:           'nice.org.uk',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: '2022-09-07',
    approved:         true,
  }),
  Object.freeze({
    source_id:        'va-dod-suicide-risk-cpg',
    title:            'VA/DoD Clinical Practice Guideline – Suicide Risk – Provider Summary',
    url:              'https://www.healthquality.va.gov/guidelines/MH/srb/',
    publisher:        'U.S. Department of Veterans Affairs / Department of Defense',
    domain:           'healthquality.va.gov',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: '2019-01-01',
    approved:         true,
  }),
  Object.freeze({
    source_id:        'samhsa-tip57',
    title:            'SAMHSA TIP 57 Trauma-Informed Care in Behavioral Health Services',
    url:              'https://store.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/PEP14-02-00-002',
    publisher:        'Substance Abuse and Mental Health Services Administration',
    domain:           'store.samhsa.gov',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: '2014-01-01',
    approved:         true,
  }),
  Object.freeze({
    source_id:        'nimh-asq-toolkit',
    title:            'NIMH ASQ Toolkit landing page',
    url:              'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials',
    publisher:        'National Institute of Mental Health',
    domain:           'nimh.nih.gov',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: null,
    approved:         true,
  }),
  Object.freeze({
    source_id:        'nimh-asq-pdf',
    title:            'NIMH ASQ screening tool PDF',
    url:              'https://www.nimh.nih.gov/sites/default/files/documents/research/research-conducted-at-nimh/asq-toolkit-materials/asq-tool/asq_english.pdf',
    publisher:        'National Institute of Mental Health',
    domain:           'nimh.nih.gov',
    source_type:      EXTERNAL_SOURCE_TYPES.PDF,
    publication_date: null,
    approved:         true,
  }),
  Object.freeze({
    source_id:        'columbia-cssrs',
    title:            'Columbia / C-SSRS public screening resources',
    url:              'https://cssrs.columbia.edu/the-columbia-scale-c-ssrs/cssrs-for-communities-and-healthcare/',
    publisher:        'Columbia Lighthouse Project',
    domain:           'cssrs.columbia.edu',
    source_type:      EXTERNAL_SOURCE_TYPES.HTML,
    publication_date: null,
    approved:         true,
  }),
]);

// ─── Approved source lookup helpers ──────────────────────────────────────────

/**
 * Looks up the approved source entry matching a given URL (case-insensitive,
 * trimmed).
 *
 * Returns the matching approved source record if found, or null if the URL
 * is not in the approved source registry.
 *
 * @param {string} url
 * @returns {Readonly<object> | null}
 */
export function lookupApprovedSource(url) {
  if (!url || typeof url !== 'string') return null;
  const normalizedUrl = url.trim().toLowerCase();
  return APPROVED_TRUSTED_SOURCES.find(
    (src) => src.url.toLowerCase() === normalizedUrl,
  ) ?? null;
}

/**
 * Returns true if and only if the given URL matches an entry in the approved
 * source registry. Unknown or untrusted URLs always return false.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isApprovedSourceUrl(url) {
  return lookupApprovedSource(url) !== null;
}

// ─── Source record factory ────────────────────────────────────────────────────

/**
 * Creates a new external source record with all required provenance fields.
 *
 * Callers should supply at minimum: source_id, title, url, publisher, domain,
 * source_type. All other fields default to safe sentinel values.
 *
 * The content_source_type field is always set to EXTERNAL_CONTENT_SOURCE_TYPE
 * ('external_trusted') and cannot be overridden.
 *
 * Returns a plain object — no Base44 SDK calls, no side effects.
 *
 * @param {object} fields
 * @returns {object}
 */
export function createSourceRecord(fields = {}) {
  const now = new Date().toISOString();
  return {
    source_id:          fields.source_id          ?? '',
    title:              fields.title              ?? '',
    url:                fields.url                ?? '',
    publisher:          fields.publisher          ?? '',
    domain:             fields.domain             ?? '',
    source_type:        fields.source_type        ?? EXTERNAL_SOURCE_TYPES.HTML,
    retrieval_date:     fields.retrieval_date     ?? now,
    publication_date:   fields.publication_date   ?? null,
    status:             fields.status             ?? EXTERNAL_SOURCE_STATUS.ACTIVE,
    ingestion_status:   fields.ingestion_status   ?? EXTERNAL_INGESTION_STATUS.PENDING,
    error_state:        fields.error_state        ?? null,
    source_fingerprint: fields.source_fingerprint ?? null,
    // Always 'external_trusted' — never overridable
    content_source_type: EXTERNAL_CONTENT_SOURCE_TYPE,
  };
}
