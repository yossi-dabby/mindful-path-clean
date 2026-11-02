import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * @file base44/functions/fetchLiveResource/entry.ts
 *
 * Therapist Upgrade — Phase 6 — Live Resource Fetch Function
 *
 * Fetches a bounded, normalised content snippet from a technically allowlisted
 * external URL for the upgraded (V4) therapist path.
 *
 * This Deno function is the ONLY backend path for live retrieval in the
 * upgraded therapist path.  It applies a second layer of domain allowlist
 * enforcement (defense in depth), fetches the resource with a strict timeout,
 * extracts a short bounded text snippet, and returns it as structured output.
 *
 * ALLOWLIST ENFORCEMENT (DEFENSE IN DEPTH)
 * -----------------------------------------
 * The domain allowlist is enforced here in addition to the frontend wrapper
 * (liveRetrievalWrapper.js).  Even if the frontend wrapper were bypassed, this
 * function would independently reject any domain not on the approved list.
 *
 * FAIL-CLOSED BEHAVIOR
 * --------------------
 * - Flag off → { blocked: true, reason: 'flag_off' } (HTTP 200, no error)
 * - Missing or invalid URL → { blocked: true, reason: 'missing_url' }
 * - Domain not on allowlist → { blocked: true, reason: 'domain_not_allowlisted' }
 * - Fetch timeout (5 seconds) → { content: '', error: 'fetch_timeout' }
 * - Fetch error → { content: '', error: '...' }
 * - Non-200 response → { content: '', error: 'bad_response_status' }
 * - Empty response body → { content: '', error: 'empty_body' }
 *
 * BOUNDED OUTPUT
 * --------------
 * Content is extracted as plain text and truncated to MAX_CONTENT_CHARS (400).
 * HTML tags are stripped.  No raw page dump is ever returned.
 *
 * PROVENANCE PRESERVATION
 * -----------------------
 * Every successful response includes the validated url and domain so the
 * calling code can construct provenance labels.
 *
 * PRIVACY / DATA MINIMISATION
 * ---------------------------
 * - No user data is included in the outbound fetch request.
 * - The query parameter is only used for context filtering (not forwarded in
 *   the URL unless explicitly in the supplied URL itself).
 * - No user data is stored as a result of a live fetch.
 *
 * OUTPUT (always HTTP 200)
 * -------
 * {
 *   content:  string,        // Bounded text snippet (empty on failure)
 *   url:      string,        // The validated URL that was (or was not) fetched
 *   domain:   string,        // The approved domain
 *   blocked?: boolean,       // Present when the request was blocked by policy
 *   error?:   string,        // Present when fetch failed
 *   reason?:  string,        // Present when blocked
 * }
 *
 * FLAG GATE
 * ---------
 * Gated by THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED environment variable.
 * When the flag is not 'true', all requests are rejected with { blocked: true }.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 6, Task 6.2
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const FLAG_ENV = 'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED';
const FETCH_TIMEOUT_MS = 5000;
const MAX_CONTENT_CHARS = 400;

/**
 * Approved domain allowlist — identical to the frontend allowlist in
 * liveRetrievalAllowlist.js.  Must be kept in sync.
 */
const ALLOWED_DOMAINS: ReadonlyArray<string> = [
  'nimh.nih.gov',
  'nice.org.uk',
  'who.int',
  'samhsa.gov',
  'library.samhsa.gov',
  'medlineplus.gov',
  'healthquality.va.gov',
  'psychiatry.org',
  'cssrs.columbia.edu',
];

// ─── Domain extraction ────────────────────────────────────────────────────────

function extractDomain(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname || !hostname.includes('.')) return null;
    return hostname;
  } catch {
    return null;
  }
}

function isAllowedDomain(urlString: string): { allowed: boolean; domain: string | null } {
  const domain = extractDomain(urlString);
  if (!domain) return { allowed: false, domain: null };
  const allowed = ALLOWED_DOMAINS.some((a) => domain === a || domain.endsWith('.' + a));
  return { allowed, domain };
}

// ─── HTML stripper ────────────────────────────────────────────────────────────

/** Strips HTML tags and normalises whitespace from a raw HTML string. */
function stripHtml(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── Gate: THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED must be 'true' ──────
  const flagEnabled = Deno.env.get(FLAG_ENV) === 'true';
  if (!flagEnabled) {
    return Response.json({
      content: '',
      url: '',
      domain: null,
      blocked: true,
      reason: 'flag_off',
    });
  }

  // ── Auth check: require authenticated session ─────────────────────────────
  let user: { email?: string } | null = null;
  try {
    const base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch {
    // Auth failure — fail closed
    return Response.json({
      content: '',
      url: '',
      domain: null,
      blocked: true,
      reason: 'auth_required',
    });
  }

  if (!user) {
    return Response.json({
      content: '',
      url: '',
      domain: null,
      blocked: true,
      reason: 'auth_required',
    });
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: { url?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({
      content: '',
      url: '',
      domain: null,
      blocked: true,
      reason: 'invalid_request_body',
    });
  }

  const urlStr = typeof body?.url === 'string' ? body.url.trim() : '';

  if (!urlStr) {
    return Response.json({
      content: '',
      url: '',
      domain: null,
      blocked: true,
      reason: 'missing_url',
    });
  }

  // ── Allowlist enforcement (defense in depth) ──────────────────────────────
  const { allowed, domain } = isAllowedDomain(urlStr);

  if (!allowed) {
    console.warn('[fetchLiveResource] Allowlist rejection —', {
      domain: domain ?? 'unknown',
      reason: 'domain_not_allowlisted',
    });
    return Response.json({
      content: '',
      url: urlStr,
      domain: domain ?? null,
      blocked: true,
      reason: 'domain_not_allowlisted',
    });
  }

  // ── Fetch with timeout ────────────────────────────────────────────────────
  let responseText: string;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': 'MindfulPath-ClinicalBot/1.0 (therapeutic-content-retrieval)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json({
        content: '',
        url: urlStr,
        domain: domain!,
        error: `bad_response_status:${response.status}`,
      });
    }

    const rawBody = await response.text();
    if (!rawBody || !rawBody.trim()) {
      return Response.json({
        content: '',
        url: urlStr,
        domain: domain!,
        error: 'empty_body',
      });
    }

    responseText = rawBody;
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    const isTimeout = message.includes('abort') || message.includes('timed out');
    return Response.json({
      content: '',
      url: urlStr,
      domain: domain!,
      error: isTimeout ? 'fetch_timeout' : `fetch_error:${message.slice(0, 80)}`,
    });
  }

  // ── Extract bounded text snippet ──────────────────────────────────────────
  const stripped = stripHtml(responseText);
  const bounded = stripped.slice(0, MAX_CONTENT_CHARS);

  if (!bounded.trim()) {
    return Response.json({
      content: '',
      url: urlStr,
      domain: domain!,
      error: 'no_text_content',
    });
  }

  return Response.json({
    content: bounded,
    url: urlStr,
    domain: domain!,
  });
});
