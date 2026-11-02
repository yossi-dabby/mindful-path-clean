/**
 * @file base44/functions/validateTrustedSource/entry.ts
 *
 * Therapist Upgrade — Phase 4 — Trusted Source Provenance Validation
 *
 * Validates source metadata before ingestion is allowed to proceed.
 *
 * This function acts as the pre-ingestion gate. It checks that a proposed
 * source URL and its metadata meet the provenance requirements for Phase 4
 * ingestion: the URL must be in the approved registry, all required metadata
 * fields must be present, and the source must not be a private user entity.
 *
 * FEATURE FLAGS
 * -------------
 * THERAPIST_UPGRADE_ENABLED                    — master gate (must be 'true')
 * THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED  — phase gate (must be 'true')
 * Both must be 'true' for validation to proceed.
 *
 * ISOLATION
 * ---------
 * This function is read-only — it performs no writes, no fetches, and has no
 * side effects. It validates the proposed ingestion metadata only.
 *
 * INPUT
 * -----
 * {
 *   source_url:     string,   // URL to validate against approved registry
 *   source_type?:   string,   // Expected source type (optional — validated if provided)
 *   publisher?:     string,   // Expected publisher (optional — validated if provided)
 * }
 *
 * OUTPUT (valid)
 * --------------
 * {
 *   valid: true,
 *   approved_entry: object,   // The matching approved registry entry
 * }
 *
 * OUTPUT (invalid)
 * ----------------
 * {
 *   valid: false,
 *   rejection_reason: string,
 *   rejection_code:   string,   // UNKNOWN_SOURCE | MISSING_FIELD | TYPE_MISMATCH | PUBLISHER_MISMATCH
 * }
 *
 * OUTPUT (gated)
 * --------------
 * { success: false, error: string, gated: true }   — HTTP 503
 *
 * See docs/therapist-upgrade-stage2-plan.md — Task 4.2
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

const APPROVED_TRUSTED_SOURCES = Object.freeze([
  Object.freeze({ source_id: 'who-mhgap-ig-v2',        url: 'https://www.who.int/publications/i/item/9789241549790',                                                                                                                   publisher: 'World Health Organization',                                           domain: 'who.int',              source_type: 'html', title: 'WHO mhGAP Intervention Guide v2.0' }),
  Object.freeze({ source_id: 'nice-depression-ng222',   url: 'https://www.nice.org.uk/guidance/ng222',                                                                                                                                publisher: 'National Institute for Health and Care Excellence',                   domain: 'nice.org.uk',          source_type: 'html', title: 'NICE Depression in adults: treatment and management' }),
  Object.freeze({ source_id: 'nice-selfharm-ng225',     url: 'https://www.nice.org.uk/guidance/ng225',                                                                                                                                publisher: 'National Institute for Health and Care Excellence',                   domain: 'nice.org.uk',          source_type: 'html', title: 'NICE Self-harm: assessment, management and preventing recurrence' }),
  Object.freeze({ source_id: 'va-dod-suicide-risk-cpg', url: 'https://www.healthquality.va.gov/guidelines/MH/srb/',                                                                                                                 publisher: 'U.S. Department of Veterans Affairs / Department of Defense',        domain: 'healthquality.va.gov', source_type: 'html', title: 'VA/DoD Clinical Practice Guideline – Suicide Risk – Provider Summary' }),
  Object.freeze({ source_id: 'samhsa-tip57',            url: 'https://store.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/PEP14-02-00-002',                                                              publisher: 'Substance Abuse and Mental Health Services Administration',          domain: 'store.samhsa.gov',     source_type: 'html', title: 'SAMHSA TIP 57 Trauma-Informed Care in Behavioral Health Services' }),
  Object.freeze({ source_id: 'nimh-asq-toolkit',        url: 'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials',                                                                                   publisher: 'National Institute of Mental Health',                                domain: 'nimh.nih.gov',         source_type: 'html', title: 'NIMH ASQ Toolkit landing page' }),
  Object.freeze({ source_id: 'nimh-asq-pdf',            url: 'https://www.nimh.nih.gov/sites/default/files/documents/research/research-conducted-at-nimh/asq-toolkit-materials/asq-tool/asq_english.pdf',                            publisher: 'National Institute of Mental Health',                                domain: 'nimh.nih.gov',         source_type: 'pdf',  title: 'NIMH ASQ screening tool PDF' }),
  Object.freeze({ source_id: 'columbia-cssrs',          url: 'https://cssrs.columbia.edu/the-columbia-scale-c-ssrs/cssrs-for-communities-and-healthcare/',                                                                           publisher: 'Columbia Lighthouse Project',                                        domain: 'cssrs.columbia.edu',   source_type: 'html', title: 'Columbia / C-SSRS public screening resources' }),
]);

function lookupApprovedSource(url: string) {
  if (!url) return null;
  const normalized = url.trim().toLowerCase();
  return APPROVED_TRUSTED_SOURCES.find(
    (src) => src.url.toLowerCase() === normalized,
  ) ?? null;
}

// ─── Rejection codes ──────────────────────────────────────────────────────────

const REJECTION_CODES = Object.freeze({
  UNKNOWN_SOURCE:     'UNKNOWN_SOURCE',
  MISSING_FIELD:      'MISSING_FIELD',
  TYPE_MISMATCH:      'TYPE_MISMATCH',
  PUBLISHER_MISMATCH: 'PUBLISHER_MISMATCH',
});

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

    // ── Parse input ────────────────────────────────────────────────────────
    const body = await req.json();
    const { source_url, source_type, publisher } = body ?? {};

    if (!source_url || typeof source_url !== 'string') {
      return Response.json(
        {
          valid:            false,
          rejection_reason: 'source_url is required and must be a string.',
          rejection_code:   REJECTION_CODES.MISSING_FIELD,
        },
        { status: 400 },
      );
    }

    // ── Approved source lookup ─────────────────────────────────────────────
    const approvedEntry = lookupApprovedSource(source_url);
    if (!approvedEntry) {
      return Response.json({
        valid:            false,
        rejection_reason: `Source URL is not in the approved registry: ${source_url}. Only the 8 Phase 4 approved sources may be ingested.`,
        rejection_code:   REJECTION_CODES.UNKNOWN_SOURCE,
      });
    }

    // ── Optional source_type validation ───────────────────────────────────
    if (source_type !== undefined && source_type !== approvedEntry.source_type) {
      return Response.json({
        valid:            false,
        rejection_reason: `source_type mismatch: provided '${source_type}' but registry expects '${approvedEntry.source_type}' for this source.`,
        rejection_code:   REJECTION_CODES.TYPE_MISMATCH,
      });
    }

    // ── Optional publisher validation ─────────────────────────────────────
    if (publisher !== undefined && publisher !== approvedEntry.publisher) {
      return Response.json({
        valid:            false,
        rejection_reason: `publisher mismatch: provided '${publisher}' but registry expects '${approvedEntry.publisher}' for this source.`,
        rejection_code:   REJECTION_CODES.PUBLISHER_MISMATCH,
      });
    }

    // ── All checks passed ─────────────────────────────────────────────────
    return Response.json({
      valid:          true,
      approved_entry: approvedEntry,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
