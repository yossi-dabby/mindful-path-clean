/**
 * @file src/lib/liveRetrievalAllowlist.js
 *
 * Therapist Upgrade — Stage 2 Phase 6 — Live Retrieval Domain Allowlist
 *
 * This module provides the TECHNICAL enforcement of the live-retrieval domain
 * allowlist for the upgraded therapist path.  Enforcement is code-level, not
 * prompt-level — a URL that fails domain validation is rejected by this module
 * before any network request is attempted, regardless of what any prompt or
 * orchestration instruction says.
 *
 * APPROVED DOMAINS
 * ----------------
 * The following domains (and their exact sub-domains) are approved for live
 * retrieval.  All other domains are rejected.
 *
 *   nimh.nih.gov         — National Institute of Mental Health (US)
 *   nice.org.uk          — National Institute for Health and Care Excellence (UK)
 *   who.int              — World Health Organization
 *   samhsa.gov           — Substance Abuse and Mental Health Services Administration
 *   library.samhsa.gov   — SAMHSA library (sub-domain)
 *   medlineplus.gov      — US National Library of Medicine
 *   healthquality.va.gov — US Veterans Affairs clinical practice guidelines
 *   psychiatry.org       — American Psychiatric Association
 *   cssrs.columbia.edu   — Columbia Suicide Severity Rating Scale
 *
 * FAIL-CLOSED BEHAVIOR
 * --------------------
 * All validation functions in this module are fail-closed:
 *   - A missing, null, or non-string URL returns false (blocked).
 *   - A URL that cannot be parsed returns false (blocked).
 *   - A domain that cannot be verified against the allowlist returns false
 *     (blocked) — ambiguity never results in access.
 *
 * ALLOWLIST ENFORCEMENT IS TECHNICAL
 * ------------------------------------
 * This module provides code-level enforcement.  It is NOT a prompt instruction
 * that the LLM could misinterpret or bypass.  Allowlist validation happens at
 * the JavaScript module level before any external request is made.
 *
 * REJECTION LOGGING
 * -----------------
 * logAllowlistRejection() emits a console.warn for every rejected request.
 * Log entries are structured (object) and include the domain and rejection
 * reason for audit visibility.  No sensitive user data is included in logs.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Make any network requests (pure validation and logging only)
 * - Access any Base44 entities or SDK
 * - Alter the current default therapist path in any way
 * - Be imported by retrievalOrchestrator.js or retrievalConfig.js (isolation)
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 6, Task 6.1
 */

// ─── Phase 6 allowlist version ────────────────────────────────────────────────

/** @type {string} */
export const LIVE_RETRIEVAL_ALLOWLIST_VERSION = '6.0.0';

// ─── Approved domain allowlist ────────────────────────────────────────────────

/**
 * Technically enforced allowlist of domains approved for live retrieval.
 *
 * A URL is approved only when its parsed hostname (lowercased, www-stripped)
 * exactly matches one of these entries, OR is a direct sub-domain of one of
 * these entries (e.g. library.samhsa.gov matches 'samhsa.gov').
 *
 * This list must not be expanded without explicit approval and security review.
 * See docs/therapist-upgrade-stage2-plan.md — Phase 6, Task 6.1.
 *
 * @type {ReadonlyArray<string>}
 */
export const LIVE_RETRIEVAL_ALLOWED_DOMAINS = Object.freeze([
  'nimh.nih.gov',
  'nice.org.uk',
  'who.int',
  'samhsa.gov',
  'library.samhsa.gov',
  'medlineplus.gov',
  'healthquality.va.gov',
  'psychiatry.org',
  'cssrs.columbia.edu',
]);

// ─── Domain extraction ────────────────────────────────────────────────────────

/**
 * Safely extracts the normalised hostname from a URL string.
 *
 * Normalisation:
 *   - Lowercased
 *   - Leading 'www.' stripped
 *
 * Fail-closed: returns null for any malformed, missing, or non-HTTPS URL so
 * that callers never resolve a null to "allowed".
 *
 * @param {string} urlString - The URL to extract the domain from
 * @returns {string|null} Normalised hostname, or null if extraction fails
 */
export function extractDomain(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }
  try {
    const parsed = new URL(urlString);
    // Only HTTPS URLs are acceptable for live retrieval
    if (parsed.protocol !== 'https:') {
      return null;
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    // Reject empty or clearly invalid hostnames
    if (!hostname || hostname.length < 3 || !hostname.includes('.')) {
      return null;
    }
    return hostname;
  } catch {
    // URL parsing failed — fail closed
    return null;
  }
}

// ─── Technical allowlist enforcement ─────────────────────────────────────────

/**
 * Technically enforces whether a URL is on the approved live-retrieval domain
 * allowlist.
 *
 * A URL is approved when ALL of the following are true:
 *   1. The URL is a non-empty string.
 *   2. The URL can be parsed as a valid HTTPS URL.
 *   3. The extracted hostname (lowercased, www-stripped) exactly matches an
 *      entry in LIVE_RETRIEVAL_ALLOWED_DOMAINS, OR is a sub-domain of an
 *      entry (e.g. library.samhsa.gov matches 'samhsa.gov').
 *
 * Any ambiguity (missing URL, parse failure, subdomain mismatch) returns false.
 * This function never throws.
 *
 * @param {string} urlString - The URL to check
 * @returns {boolean} true only when the URL's domain is on the approved allowlist
 */
export function isAllowedDomain(urlString) {
  const domain = extractDomain(urlString);
  if (!domain) {
    return false;
  }
  return LIVE_RETRIEVAL_ALLOWED_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith('.' + allowed),
  );
}

// ─── Request validation ───────────────────────────────────────────────────────

/**
 * @typedef {object} AllowlistValidationResult
 * @property {boolean} allowed        - Whether the request is on the allowlist.
 * @property {string}  reason         - Human-readable reason for the decision.
 * @property {string|null} domain     - Extracted domain (null if extraction failed).
 * @property {string|null} normalizedUrl - The original URL if approved, null otherwise.
 */

/**
 * Validates a live retrieval request against the technical allowlist.
 *
 * Returns a structured result rather than throwing, so callers can handle
 * blocked requests gracefully (return empty result, not an error).
 *
 * Fail-closed: any missing, malformed, or non-allowlisted request returns
 * { allowed: false } — never a false positive.
 *
 * @param {{ url?: string } | null | undefined} request - The retrieval request
 * @returns {AllowlistValidationResult}
 */
export function validateLiveRetrievalRequest(request) {
  if (!request || typeof request !== 'object') {
    return {
      allowed: false,
      reason: 'missing_request',
      domain: null,
      normalizedUrl: null,
    };
  }

  const { url } = request;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      allowed: false,
      reason: 'missing_url',
      domain: null,
      normalizedUrl: null,
    };
  }

  const domain = extractDomain(url);
  if (!domain) {
    return {
      allowed: false,
      reason: 'unparseable_or_non_https_url',
      domain: null,
      normalizedUrl: null,
    };
  }

  const allowed = LIVE_RETRIEVAL_ALLOWED_DOMAINS.some(
    (a) => domain === a || domain.endsWith('.' + a),
  );

  if (!allowed) {
    return {
      allowed: false,
      reason: 'domain_not_allowlisted',
      domain,
      normalizedUrl: null,
    };
  }

  return {
    allowed: true,
    reason: 'allowlisted',
    domain,
    normalizedUrl: url.trim(),
  };
}

// ─── Rejection logging ────────────────────────────────────────────────────────

/**
 * Logs an allowlist rejection safely.
 *
 * Emits a structured console.warn.  No user PII is included — only the domain
 * (or null) and the rejection reason.  Logging failure must never propagate.
 *
 * @param {{ url?: string } | null | undefined} request - The rejected request
 * @param {string} reason - The rejection reason
 */
export function logAllowlistRejection(request, reason) {
  try {
    const domain = request && typeof request.url === 'string'
      ? extractDomain(request.url)
      : null;
    console.warn('[LiveRetrievalAllowlist] Rejection —', {
      phase: 6,
      reason,
      domain: domain ?? 'unknown',
    });
  } catch {
    // Logging must never throw
  }
}
