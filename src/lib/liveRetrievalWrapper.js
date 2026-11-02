/**
 * @file src/lib/liveRetrievalWrapper.js
 *
 * Therapist Upgrade — Stage 2 Phase 6 — Live Retrieval Wrapper
 *
 * This module is the ONLY permitted path for live retrieval in the upgraded
 * (V4) therapist path.  It enforces the technical domain allowlist, normalises
 * returned live content into a bounded safe format, preserves provenance, and
 * fails closed whenever any validation step cannot be confirmed.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * 1. Accepts a bounded live retrieval request (URL + optional query context).
 * 2. Validates the request against the technical allowlist (liveRetrievalAllowlist.js).
 * 3. If the domain is not on the allowlist — return empty result + log rejection.
 * 4. If the domain is on the allowlist — attempt to invoke the backend
 *    fetchLiveResource function via base44.functions.invoke.
 * 5. Normalize and bound the returned content into a safe context item.
 * 6. Return a structured LiveRetrievalResult (always, never throws).
 *
 * FAIL-CLOSED BEHAVIOR
 * --------------------
 * Every failure path returns { items: [], blocked: true, reason: '...' } —
 * never an exception.  The therapist session continues with internal sources
 * only when live retrieval is blocked or unavailable.
 *
 * Conditions that trigger fail-closed:
 *   - Missing or invalid request
 *   - Missing or non-HTTPS URL
 *   - Domain not on allowlist
 *   - Backend function unavailable or errored
 *   - Returned content exceeds bounds or is empty
 *   - Any unexpected error during execution
 *
 * ALLOWLIST ENFORCEMENT IS TECHNICAL
 * ------------------------------------
 * Domain enforcement uses validateLiveRetrievalRequest() from
 * liveRetrievalAllowlist.js — code-level validation, not prompt instruction.
 *
 * INTERNAL-FIRST ORDERING PRESERVED
 * ----------------------------------
 * Live retrieval is a fallback step ONLY.  It is invoked after internal sources
 * (therapist_memory, session_context, internal_knowledge, external_knowledge)
 * have been queried and found insufficient.  Sufficiency is determined by a
 * concrete item-count threshold (RETRIEVAL_CONFIG.INTERNAL_SUFFICIENCY_MIN_ITEMS).
 *
 * PROVENANCE PRESERVATION
 * -----------------------
 * Every live context item carries:
 *   source_type: 'live_knowledge'
 *   source_id:   the validated URL
 *   entity_name: the approved domain
 *
 * PRIVACY / DATA MINIMISATION
 * ---------------------------
 * - Live content is bounded to MAX_LIVE_KNOWLEDGE_ITEMS items.
 * - Each item text is truncated to MAX_LIVE_CONTENT_CHARS characters.
 * - Raw webpage dumps are never stored or injected.
 * - No live content is written to any entity store in Phase 6.
 *
 * PHASE 6 INSTRUCTION STRING
 * ---------------------------
 * LIVE_RETRIEVAL_POLICY_INSTRUCTIONS is the instruction text injected into the
 * V4 session-start content.  It explains to the agent that Phase 6 adds a
 * live retrieval step 5 that is:
 *   - Gated by policy
 *   - Only invoked when internal sources are insufficient
 *   - Strictly bounded to the allowlisted wrapper
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is imported ONLY by workflowContextInjector.js and
 * v4RetrievalExecutor.js.  It is never imported by retrievalOrchestrator.js
 * or retrievalConfig.js (which are Phase 5 modules with a NO LIVE RETRIEVAL
 * contract).
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Bypass the allowlist under any condition
 * - Access any entity outside the allowlist
 * - Store live content as long-term memory (Phase 6 scope)
 * - Alter the default therapist path
 * - Widen memory capture or summarization behavior
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 6, Task 6.2
 */

import {
  validateLiveRetrievalRequest,
  logAllowlistRejection,
} from './liveRetrievalAllowlist.js';

import { RETRIEVAL_CONFIG } from './retrievalConfig.js';

// ─── Phase 6 live knowledge source type constant ──────────────────────────────

/**
 * Source type identifier for Phase 6 live retrieved content.
 *
 * Defined here (not in retrievalConfig.js / RETRIEVAL_SOURCE_TYPES) to
 * preserve the Phase 5 isolation contract: RETRIEVAL_SOURCE_TYPES and
 * RETRIEVAL_SOURCE_ORDER only cover internal-first sources 1–4.
 * Live retrieval (source 5) is handled exclusively by Phase 6 modules.
 *
 * @type {string}
 */
export const LIVE_KNOWLEDGE_SOURCE_TYPE = 'live_knowledge';

// ─── Phase 6 live retrieval version ──────────────────────────────────────────

/** @type {string} */
export const LIVE_RETRIEVAL_WRAPPER_VERSION = '6.0.0';

// ─── Content bounds ───────────────────────────────────────────────────────────

/**
 * Maximum characters for a single live retrieved content snippet.
 * Prevents large raw web content from entering the context window.
 */
const MAX_LIVE_CONTENT_CHARS = 300;

// ─── Phase 6 orchestration instruction string ─────────────────────────────────

/**
 * Phase 6 live retrieval policy instruction text.
 *
 * This string is injected into the V4 session-start content alongside the
 * Phase 5 retrieval orchestration instructions.  It tells the agent about
 * the Phase 6 live retrieval step (step 5) and its policy constraints.
 *
 * Specifically: live retrieval is policy-gated, only runs when internal
 * sources are insufficient, and is strictly restricted to the allowlisted
 * wrapper.
 *
 * NOTE: This string is intentionally kept in this module (not in
 * retrievalOrchestrator.js) to preserve the Phase 5 isolation contract:
 * retrievalOrchestrator.js must NOT reference live retrieval.
 *
 * @type {string}
 */
export const LIVE_RETRIEVAL_POLICY_INSTRUCTIONS = [
  '=== LIVE RETRIEVAL POLICY — STAGE 2 PHASE 6 ===',
  '',
  'This session is operating under the Stage 2 Phase 6 live retrieval policy.',
  'A fifth retrieval source is available under strict conditions:',
  '',
  '  5. live_knowledge (LOWEST PRIORITY — POLICY-GATED)',
  '     Bounded snippets from clinically trusted external sources.',
  '     This source is consulted ONLY when internal sources (steps 1–4)',
  '     do not provide sufficient clinical grounding for the response.',
  '     All live retrieval is routed through a technical allowlist wrapper.',
  '     If the wrapper cannot verify the source, no live content is used.',
  '',
  '--- LIVE RETRIEVAL POLICY CONSTRAINTS ---',
  '',
  '- Live retrieval is a fallback of last resort — internal sources are always preferred.',
  '- Live content is always clearly labeled with its source domain and URL.',
  '- If live retrieval is unavailable or blocked, proceed with internal sources only.',
  '- Live retrieval failure must never block a response.',
  '- Live context is bounded: content is short extracted passages, not raw web pages.',
  '',
  '--- SAFETY TAKES STRICT PRECEDENCE ---',
  '',
  'Live retrieval does not modify, bypass, or replace any existing safety behavior.',
  'When any safety signal is present, defer entirely to the existing safety system.',
  '',
  '=== END LIVE RETRIEVAL POLICY ===',
].join('\n');

// ─── Live retrieval result type ───────────────────────────────────────────────

/**
 * @typedef {object} LiveRetrievalResult
 * @property {object[]} items     - Array of RetrievedItem objects (may be empty).
 * @property {boolean}  blocked   - Whether the request was blocked by policy.
 * @property {string}   reason    - Why the request was blocked or succeeded.
 * @property {string|null} domain - The domain that was (or was not) queried.
 */

// ─── Backend function invocation ─────────────────────────────────────────────

/**
 * Invokes the fetchLiveResource backend function via base44.functions.invoke.
 *
 * Returns the raw backend response object, or null if the call fails or the
 * client is unavailable.  Fail-closed: any error returns null.
 *
 * @param {object} baseClient   - The base44 client (must have .functions.invoke)
 * @param {string} url          - The validated HTTPS URL to fetch
 * @param {string} [query]      - Optional query context for relevance filtering
 * @returns {Promise<object|null>}
 */
async function invokeBackendLiveFetch(baseClient, url, query) {
  if (!baseClient || typeof baseClient.functions?.invoke !== 'function') {
    return null;
  }
  try {
    const result = await baseClient.functions.invoke('fetchLiveResource', {
      url,
      query: query || '',
    });
    return result ?? null;
  } catch {
    // Backend invocation failure — fail closed, return null
    return null;
  }
}

// ─── Content normalizer ───────────────────────────────────────────────────────

/**
 * Normalises raw backend live fetch output into a bounded RetrievedItem.
 *
 * Returns null when:
 *   - result is missing, blocked, or has no content
 *   - content is empty after trimming
 *
 * Truncates content to MAX_LIVE_CONTENT_CHARS.
 * Labels the item with source_type 'live_knowledge' and preserves provenance
 * via source_id (URL) and entity_name (domain).
 *
 * @param {object|null} result - Raw backend response
 * @param {string} url         - The validated URL (for provenance)
 * @param {string} domain      - The approved domain (for provenance)
 * @returns {object|null}      - A RetrievedItem or null
 */
function normalizeLiveResult(result, url, domain) {
  if (!result || typeof result !== 'object') return null;
  if (result.blocked) return null;

  const rawText = (result.content || result.text || '').trim();
  if (!rawText) return null;

  const content = rawText.slice(0, MAX_LIVE_CONTENT_CHARS);

  return {
    source_type: LIVE_KNOWLEDGE_SOURCE_TYPE,
    content,
    source_id: url,
    entity_name: domain,
  };
}

// ─── Primary export ───────────────────────────────────────────────────────────

/**
 * Executes live retrieval for a single bounded request, enforcing the
 * technical domain allowlist and returning a fail-closed result.
 *
 * This is the ONLY permitted path for live retrieval in the upgraded path.
 *
 * Steps:
 *   1. Validate the request against the technical allowlist.
 *      Any failure → { items: [], blocked: true } (logged).
 *   2. If allowlist passes, invoke the backend fetchLiveResource function.
 *      Backend unavailable → { items: [], blocked: false, reason: 'backend_unavailable' }.
 *   3. Normalize returned content into a bounded RetrievedItem.
 *      Empty or invalid content → { items: [], blocked: false, reason: 'no_content' }.
 *   4. Return the bounded item in the result's items array.
 *
 * This function never throws.
 *
 * @param {{ url: string, query?: string } | null} request - The retrieval request
 * @param {object | null} baseClient                       - base44 client
 * @returns {Promise<LiveRetrievalResult>}
 */
export async function executeLiveRetrieval(request, baseClient) {
  // ── Step 1: Technical allowlist validation ────────────────────────────────
  const validation = validateLiveRetrievalRequest(request);

  if (!validation.allowed) {
    logAllowlistRejection(request, validation.reason);
    return {
      items: [],
      blocked: true,
      reason: validation.reason,
      domain: validation.domain,
    };
  }

  const { normalizedUrl, domain } = validation;

  // ── Step 2: Backend invocation ─────────────────────────────────────────────
  let rawResult;
  try {
    rawResult = await invokeBackendLiveFetch(
      baseClient,
      normalizedUrl,
      request?.query || '',
    );
  } catch {
    // Unexpected error in backend invocation — fail closed
    return {
      items: [],
      blocked: false,
      reason: 'backend_invocation_error',
      domain,
    };
  }

  if (!rawResult) {
    return {
      items: [],
      blocked: false,
      reason: 'backend_unavailable',
      domain,
    };
  }

  // ── Step 3: Normalize content ──────────────────────────────────────────────
  const item = normalizeLiveResult(rawResult, normalizedUrl, domain);

  if (!item) {
    return {
      items: [],
      blocked: false,
      reason: 'no_content',
      domain,
    };
  }

  return {
    items: [item],
    blocked: false,
    reason: 'success',
    domain,
  };
}

// ─── Bounded live context section builder ────────────────────────────────────

/**
 * Builds the session-start live context section string from an array of live
 * retrieved items.
 *
 * Returns an empty string when items is empty (so no section is injected).
 * Enforces MAX_LIVE_KNOWLEDGE_ITEMS bound.
 *
 * @param {object[]} items - Live retrieved items
 * @returns {string} Formatted context section, or '' if no valid items
 */
export function buildLiveContextSection(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  const maxItems = RETRIEVAL_CONFIG.MAX_LIVE_KNOWLEDGE_ITEMS ?? 2;
  const bounded = items.slice(0, maxItems).filter(
    (item) => item && item.content && item.source_type === LIVE_KNOWLEDGE_SOURCE_TYPE,
  );

  if (bounded.length === 0) {
    return '';
  }

  const lines = bounded.map((item) => {
    const provenanceTag = item.source_id
      ? `[live_knowledge:${item.source_id}]`
      : `[live_knowledge:${item.entity_name ?? 'unknown'}]`;
    return `${provenanceTag} ${item.content.trim()}`;
  });

  return (
    '=== LIVE RETRIEVED CONTEXT — PHASE 6 ===\n' +
    lines.join('\n') +
    '\n=== END LIVE RETRIEVED CONTEXT ==='
  );
}
