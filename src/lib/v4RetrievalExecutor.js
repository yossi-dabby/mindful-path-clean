/**
 * @file src/lib/v4RetrievalExecutor.js
 *
 * Therapist Upgrade — Stage 2 Phase 6 — V4 Real Runtime Retrieval Executor
 *
 * This module is the Phase 6 extension of the V3 retrieval executor.  It adds
 * Step 5 — live trusted retrieval via the allowlisted wrapper — as a
 * conditional fallback after the four internal sources from Phase 5.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * It provides one primary function:
 *
 *   executeV4BoundedRetrieval(entities, baseClient, config)
 *     1. Executes V3 retrieval (sources 1–4: therapist_memory, session_context,
 *        internal_knowledge, external_knowledge) by delegating to
 *        executeV3BoundedRetrieval.
 *     2. Checks internal sufficiency: if internal sources returned at least
 *        RETRIEVAL_CONFIG.INTERNAL_SUFFICIENCY_MIN_ITEMS items from sources
 *        1–3 combined, live retrieval is skipped.
 *     3. If internal sources are insufficient AND live retrieval is policy-
 *        allowed AND a base44 client is available, invokes executeLiveRetrieval
 *        via the technical allowlist wrapper for each approved URL in the
 *        session's live retrieval context.
 *     4. Returns a combined V4RetrievalResult that includes all items from
 *        sources 1–5, with live items clearly typed as 'live_knowledge'.
 *
 * RETRIEVAL ORDER (Phase 6)
 * -------------------------
 * Sources are queried in this exact order:
 *   1. therapist_memory   (from V3)
 *   2. session_context    (from V3)
 *   3. internal_knowledge (from V3)
 *   4. external_knowledge (from V3)
 *   5. live_knowledge     (Phase 6 addition — conditional, allowlisted only)
 *
 * INTERNAL-FIRST ORDERING PRESERVED
 * ----------------------------------
 * Live retrieval (step 5) is invoked ONLY when:
 *   (a) internal sources (1–3) returned fewer than INTERNAL_SUFFICIENCY_MIN_ITEMS;
 *   (b) the THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED flag is active (checked
 *       at the wiring level by the caller — this executor only receives options.liveRetrievalAllowed);
 *   (c) a live retrieval URL has been provided via options.liveRetrievalUrl.
 *
 * FAIL-CLOSED CONTRACT
 * --------------------
 * Any failure in steps 1–4 is handled by executeV3BoundedRetrieval (fail-open
 * for those sources).  For step 5 (live), failure returns no live items —
 * never throws.  The session start is never blocked by any retrieval failure.
 *
 * BOUNDED RETRIEVAL
 * -----------------
 * Live items are bounded to RETRIEVAL_CONFIG.MAX_LIVE_KNOWLEDGE_ITEMS.
 * Per-source limits from Phase 5 are unchanged.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is ONLY called when wiring.live_retrieval_enabled === true
 * (V4 path).  The check is performed in buildV4SessionStartContentAsync.
 * The V3 path and all prior paths are completely unaffected.
 *
 * PRIVACY
 * -------
 * Live content is bounded, provenance-labeled, and never stored as long-term
 * memory in Phase 6.  No user data is included in the live retrieval request
 * beyond the allowlisted URL and an optional bounded query.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Call live retrieval for any wiring other than V4
 * - Bypass the allowlist wrapper
 * - Store live content in any entity store in Phase 6
 * - Alter the current default therapist path in any way
 * - Override or weaken existing safety filters or crisis handling
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 6
 */

import { executeV3BoundedRetrieval } from './v3RetrievalExecutor.js';
import { executeLiveRetrieval, LIVE_KNOWLEDGE_SOURCE_TYPE } from './liveRetrievalWrapper.js';
import {
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_CONFIG,
} from './retrievalConfig.js';

// ─── Live retrieval version ───────────────────────────────────────────────────

/** @type {string} */
export const V4_RETRIEVAL_EXECUTOR_VERSION = '6.0.0';

// ─── Internal sufficiency check ───────────────────────────────────────────────

/**
 * Determines whether internal sources returned sufficient context to skip
 * live retrieval.
 *
 * "Internal" for this purpose means sources 1–3:
 *   - therapist_memory
 *   - session_context
 *   - internal_knowledge
 *
 * External knowledge (source 4) is NOT counted toward internal sufficiency
 * because it is itself a fallback; its absence does not alone indicate that
 * live retrieval is needed.
 *
 * @param {object[]} items  - All items from V3 retrieval
 * @param {object} config   - Retrieval config (checked for INTERNAL_SUFFICIENCY_MIN_ITEMS)
 * @returns {boolean} true when internal context is sufficient (live retrieval should be skipped)
 */
function isInternalContextSufficient(items, config) {
  if (!Array.isArray(items)) return true; // No items means nothing to count — assume sufficient to avoid live call on empty
  const threshold = (config?.INTERNAL_SUFFICIENCY_MIN_ITEMS) ?? RETRIEVAL_CONFIG.INTERNAL_SUFFICIENCY_MIN_ITEMS;

  const internalCount = items.filter((item) => {
    if (!item || !item.source_type) return false;
    return (
      item.source_type === RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY ||
      item.source_type === RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT ||
      item.source_type === RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE
    );
  }).length;

  return internalCount >= threshold;
}

// ─── Primary export ───────────────────────────────────────────────────────────

/**
 * @typedef {object} V4RetrievalResult
 * @property {object[]}  items              - All RetrievedItem objects (sources 1–5).
 * @property {string[]}  sources_queried    - Source type names successfully queried.
 * @property {string[]}  sources_skipped    - Source type names skipped due to failure.
 * @property {boolean}   live_attempted     - Whether live retrieval was attempted.
 * @property {boolean}   live_skipped       - Whether live retrieval was skipped.
 * @property {string}    live_skip_reason   - Why live retrieval was skipped (if applicable).
 * @property {boolean}   live_blocked       - Whether live retrieval was blocked by allowlist.
 */

/**
 * Executes real bounded retrieval against the app's entity stores (sources 1–4)
 * plus optional live retrieval (source 5) for the V4 upgraded therapist path.
 *
 * RETRIEVAL ORDER:
 *   1. therapist_memory  — via executeV3BoundedRetrieval
 *   2. session_context   — via executeV3BoundedRetrieval
 *   3. internal_knowledge — via executeV3BoundedRetrieval
 *   4. external_knowledge — via executeV3BoundedRetrieval
 *   5. live_knowledge    — via executeLiveRetrieval (conditional)
 *
 * Conditions for live retrieval invocation (ALL must be true):
 *   (a) options.liveRetrievalAllowed === true
 *   (b) A baseClient with functions.invoke is available
 *   (c) options.liveRetrievalUrl is a non-empty string
 *   (d) Internal sources (1–3) returned fewer than INTERNAL_SUFFICIENCY_MIN_ITEMS
 *
 * @param {object} entities                - Base44 entity client map
 * @param {object | null} baseClient       - Full base44 client (for functions.invoke)
 * @param {object} [options]               - Options for V4-specific behavior
 * @param {boolean} [options.liveRetrievalAllowed=false] - Whether live retrieval is allowed by flags
 * @param {string} [options.liveRetrievalUrl]            - URL to query for live retrieval
 * @param {string} [options.liveRetrievalQuery]          - Optional query context
 * @param {string} [options.locale]                      - App locale used to isolate Resource retrieval
 * @param {object} [config]                - Retrieval config override
 * @returns {Promise<V4RetrievalResult>}
 */
export async function executeV4BoundedRetrieval(
  entities,
  baseClient,
  options = {},
  config = RETRIEVAL_CONFIG,
) {
  const safeConfig = (config && typeof config === 'object') ? config : RETRIEVAL_CONFIG;

  // ── Step 1–4: Execute V3 retrieval (unchanged internal-first sources) ──────
  let v3Result;
  try {
    v3Result = await executeV3BoundedRetrieval(entities, safeConfig, {
      locale: options.locale,
    });
  } catch {
    // V3 entirely failed — return empty V4 result with no live retrieval
    return {
      items: [],
      sources_queried: [],
      sources_skipped: Object.values(RETRIEVAL_SOURCE_TYPES),
      live_attempted: false,
      live_skipped: true,
      live_skip_reason: 'v3_failed',
      live_blocked: false,
    };
  }

  const baseResult = {
    items: [...(v3Result.items ?? [])],
    sources_queried: [...(v3Result.sources_queried ?? [])],
    sources_skipped: [...(v3Result.sources_skipped ?? [])],
    live_attempted: false,
    live_skipped: false,
    live_skip_reason: '',
    live_blocked: false,
  };

  // ── Step 5: Live retrieval (conditional — internal-first ordering preserved) ─

  // (a) Policy flag gate
  if (!options.liveRetrievalAllowed) {
    return { ...baseResult, live_skipped: true, live_skip_reason: 'flag_off' };
  }

  // (b) Live retrieval URL must be present
  if (!options.liveRetrievalUrl || typeof options.liveRetrievalUrl !== 'string') {
    return { ...baseResult, live_skipped: true, live_skip_reason: 'no_url' };
  }

  // (c) Base client must be available (needed to invoke backend function)
  if (!baseClient || typeof baseClient.functions?.invoke !== 'function') {
    return { ...baseResult, live_skipped: true, live_skip_reason: 'no_client' };
  }

  // (d) Internal sufficiency check — skip live if internal sources are sufficient
  if (isInternalContextSufficient(baseResult.items, safeConfig)) {
    return {
      ...baseResult,
      live_skipped: true,
      live_skip_reason: 'internal_sufficient',
    };
  }

  // All conditions satisfied — attempt live retrieval via the allowlist wrapper
  baseResult.live_attempted = true;

  let liveResult;
  try {
    liveResult = await executeLiveRetrieval(
      {
        url: options.liveRetrievalUrl,
        query: options.liveRetrievalQuery || '',
      },
      baseClient,
    );
  } catch {
    // Unexpected failure in live retrieval — fail closed, session continues
    return {
      ...baseResult,
      live_skipped: false,
      live_blocked: true,
      live_skip_reason: 'live_retrieval_error',
    };
  }

  if (liveResult.blocked) {
    return {
      ...baseResult,
      live_blocked: true,
      live_skip_reason: liveResult.reason ?? 'blocked',
    };
  }

  // Append live items (bounded by MAX_LIVE_KNOWLEDGE_ITEMS)
  const maxLive = safeConfig.MAX_LIVE_KNOWLEDGE_ITEMS ?? RETRIEVAL_CONFIG.MAX_LIVE_KNOWLEDGE_ITEMS;
  const liveItems = (liveResult.items ?? []).slice(0, maxLive);

  if (liveItems.length > 0) {
    baseResult.items.push(...liveItems);
    baseResult.sources_queried.push(LIVE_KNOWLEDGE_SOURCE_TYPE);
  }

  return {
    ...baseResult,
    live_skipped: false,
    live_blocked: false,
    live_skip_reason: liveItems.length > 0 ? '' : 'no_live_content',
  };
}
