/**
 * @file src/lib/retrievalOrchestrator.js
 *
 * Therapist Upgrade — Stage 2 Phase 5 — Retrieval Orchestrator
 *
 * This module is the core deliverable of Phase 5.  It provides:
 *
 *   1. RETRIEVAL_ORCHESTRATION_INSTRUCTIONS  — the pre-built instruction
 *      string injected at session start for the upgraded V3 path.  Tells
 *      the agent the internal-first source ordering and bounding rules.
 *
 *   2. getRetrievalContextForWiring(wiring)  — returns the orchestration
 *      instructions when the wiring has retrieval_orchestration_enabled:
 *      true; null for all other wirings (default path completely unchanged).
 *
 *   3. buildBoundedContextPackage(items, config)  — assembles a bounded,
 *      provenance-tagged context string from an array of retrieved items.
 *      Pure function; no Base44 SDK calls; deterministically testable.
 *
 * RETRIEVAL ORDER
 * ---------------
 * For the upgraded path the retrieval order is:
 *   1. Structured therapist memory (highest priority)
 *   2. Current session context (goals, session summaries)
 *   3. Internal app knowledge (exercises, resources, audio, journeys)
 *   4. Persisted external trusted knowledge (if available; lowest priority)
 *
 * ISOLATION GUARANTEE
 * -------------------
 * Nothing in this module imports from or affects the current default therapist
 * path (CBT_THERAPIST_WIRING_HYBRID).  This module is referenced only by
 * CBT_THERAPIST_WIRING_STAGE2_V3 and the Phase 5 injection branch in
 * workflowContextInjector.js.  When THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED
 * is false (the default), this module is never invoked.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Retrieval failure at any source level must never block session start.
 * buildBoundedContextPackage returns an empty context string when items
 * is empty or every item fails validation.
 *
 * NO LIVE RETRIEVAL
 * -----------------
 * This module contains NO live retrieval, NO network calls, NO Base44 SDK
 * calls, and NO external data access.  It is pure orchestration logic that
 * shapes context assembly and injection.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Alter the default therapist path in any way
 * - Make live API calls or network requests
 * - Bypass existing safety filters or crisis handling
 * - Widen memory capture or summarization behavior
 * - Access private user data beyond existing entity access boundaries
 * - Introduce live web retrieval or allowlist enforcement
 *
 * SAFETY COMPATIBILITY
 * --------------------
 * The injected orchestration instructions are additive context.  They do NOT
 * replace, weaken, or bypass the existing safety stack
 * (postLlmSafetyFilter, sanitizeAgentOutput, sanitizeConversation,
 * enhancedCrisisDetector, risk panel flow).  The instruction text explicitly
 * defers to the existing safety system when any safety signal is present.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 5
 */

import {
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_SOURCE_ORDER,
  RETRIEVAL_CONFIG,
} from './retrievalConfig.js';

// ─── Orchestration version ────────────────────────────────────────────────────

/** @type {string} */
export const RETRIEVAL_ORCHESTRATION_VERSION = '5.0.0';

// ─── Retrieval orchestration instruction builder ──────────────────────────────

/**
 * Builds the retrieval orchestration instruction string for injection into
 * the upgraded therapist session context.
 *
 * This string is appended to the session-start context alongside the
 * workflow instructions (Phase 3).  It tells the agent the prescribed
 * source ordering, bounding rules, and fail-open contract that applies to
 * this session.
 *
 * SAFETY NOTE: The instruction text explicitly states that the existing
 * safety system always takes strict precedence over retrieval behavior,
 * and that retrieval failures must never block a response.
 *
 * @returns {string} The retrieval orchestration instruction string
 */
export function buildRetrievalOrchestrationInstructions() {
  const sourceDescriptions = [
    `  1. ${RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY} (HIGHEST PRIORITY)\n` +
    '     Structured prior-session memory records. Use to maintain continuity\n' +
    '     across sessions. Memory records contain identified patterns, action\n' +
    '     items, and session themes from prior sessions.',

    `  2. ${RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT}\n` +
    '     Current active goals, recent session summaries, and active coaching\n' +
    '     session state. Use to anchor each response to the user\'s current\n' +
    '     clinical focus.',

    `  3. ${RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE}\n` +
    '     App-authored exercises, resources, audio content, and journey steps.\n' +
    '     Ground suggestions and interventions in proven internal content\n' +
    '     before generating ungrounded suggestions.',

    `  4. ${RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE} (LOWEST PRIORITY)\n` +
    '     Clinically-validated reference material from pre-approved sources\n' +
    '     stored inside the app. Consult only when internal knowledge does not\n' +
    '     provide sufficient grounding. External content is always clearly\n' +
    '     distinguishable from internal content and user-specific context.',
  ].join('\n\n');

  const maxItems = [
    `  ${RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY}: max ${RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS} items`,
    `  ${RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT}: max ${RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS} items`,
    `  ${RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE}: max ${RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS} items`,
    `  ${RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE}: max ${RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS} items`,
    `  Total across all sources: max ${RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS} items`,
  ].join('\n');

  return [
    '=== RETRIEVAL ORCHESTRATION — STAGE 2 PHASE 5 ===',
    '',
    'This session is operating under the Stage 2 upgraded retrieval orchestration.',
    'When generating each response, consult available context in the following',
    'internal-first priority order:',
    '',
    sourceDescriptions,
    '',
    '--- BOUNDING RULES ---',
    '',
    maxItems,
    '',
    'Retrieve the minimum slice needed for each response.',
    'Do not load full histories when a small slice is sufficient.',
    'When sources conflict, prefer structured memory and current session records.',
    '',
    '--- CONFIDENCE THRESHOLD ---',
    '',
    `Internal confidence threshold: ${RETRIEVAL_CONFIG.INTERNAL_CONFIDENCE_THRESHOLD}`,
    'When internal sources (memory + session context + internal knowledge) provide',
    'sufficient grounding, do not consult external knowledge.',
    '',
    '--- RETRIEVAL FAILURES ARE NON-BLOCKING ---',
    '',
    'If context at any priority level is unavailable or empty, move to the next',
    'source level. Response generation must never be blocked by retrieval failure.',
    'When no relevant context is found at any level, proceed with clinical reasoning.',
    '',
    '--- SAFETY TAKES STRICT PRECEDENCE ---',
    '',
    'Retrieval orchestration does not modify, bypass, or replace any existing',
    'safety behavior (crisis detection, risk panel, safety filters, sanitization).',
    'When any safety signal is present, defer entirely to the existing safety system.',
    'Do not attempt to follow the retrieval ordering when a safety signal is active.',
    '',
    '=== END RETRIEVAL ORCHESTRATION ===',
  ].join('\n');
}

/**
 * Pre-built retrieval orchestration instructions string.
 *
 * Frozen at module load to ensure consistent injection across all sessions
 * in the upgraded path.  The content is identical to calling
 * buildRetrievalOrchestrationInstructions() directly.
 *
 * @type {string}
 */
export const RETRIEVAL_ORCHESTRATION_INSTRUCTIONS = buildRetrievalOrchestrationInstructions();

// ─── Wiring-aware context accessor ───────────────────────────────────────────

/**
 * Returns the retrieval orchestration instructions string when the supplied
 * wiring has the retrieval_orchestration_enabled flag set to true.
 *
 * This is the gating function for Phase 5 runtime injection.  It reads
 * the wiring's own flag rather than evaluating the feature-flag registry
 * directly, so that the injection decision is always consistent with the
 * wiring that was already resolved by resolveTherapistWiring().
 *
 * For all wirings without retrieval_orchestration_enabled === true (which
 * includes HYBRID, V1, V2, and any unrecognised config), this function
 * returns null — the current therapist path is completely unchanged.
 *
 * @param {object} wiring - The active therapist wiring config object
 * @returns {string|null} RETRIEVAL_ORCHESTRATION_INSTRUCTIONS when the wiring
 *   has retrieval_orchestration_enabled === true; null otherwise.
 */
export function getRetrievalContextForWiring(wiring) {
  if (wiring && wiring.retrieval_orchestration_enabled === true) {
    return RETRIEVAL_ORCHESTRATION_INSTRUCTIONS;
  }
  return null;
}

// ─── Bounded context package assembler ───────────────────────────────────────

/**
 * @typedef {object} RetrievedItem
 * @property {string} source_type     - One of RETRIEVAL_SOURCE_TYPES values.
 * @property {string} content         - The retrieved text content (concise).
 * @property {string} [entity_name]   - The originating Base44 entity name.
 * @property {string} [source_id]     - Source identifier (for external items).
 * @property {number} [relevance]     - Optional relevance score (0.0–1.0).
 */

/**
 * Assembles a bounded, provenance-tagged context string from an array of
 * retrieved items.
 *
 * This is a pure function with no side effects.  It accepts mock items in
 * tests, enabling deterministic verification of bounding and provenance rules.
 *
 * Bounding behavior:
 * - Items are consumed in RETRIEVAL_SOURCE_ORDER order.
 * - Per-source limits and total item limit are enforced.
 * - Any item without a valid source_type or content is silently skipped.
 * - An empty input array produces an empty string (never an error).
 *
 * Provenance tagging:
 * - Internal items carry the entity_name as provenance.
 * - External items carry the source_id and 'external_trusted' as provenance.
 * - Each item is labeled with its source_type in the output.
 *
 * Privacy rules:
 * - No raw transcript data is included.
 * - External items are always labeled as external.
 * - Private user entity content is passed through unchanged — this function
 *   does not widen access; it only assembles what the caller provides.
 *   The caller is responsible for ensuring only allowed entity data is passed in.
 *
 * @param {RetrievedItem[]} items - Array of retrieved items from all sources.
 * @param {object} [config]       - Override for retrieval bounds (defaults to RETRIEVAL_CONFIG).
 * @returns {string} The assembled bounded context string (empty if no valid items).
 */
export function buildBoundedContextPackage(items, config = RETRIEVAL_CONFIG) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  const maxPerSource = {
    [RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY]:   config.MAX_THERAPIST_MEMORY_ITEMS   ?? RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS,
    [RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT]:    config.MAX_SESSION_CONTEXT_ITEMS    ?? RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS,
    [RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE]: config.MAX_INTERNAL_KNOWLEDGE_ITEMS ?? RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS,
    [RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE]: config.MAX_EXTERNAL_KNOWLEDGE_ITEMS ?? RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS,
  };
  const totalMax = config.MAX_TOTAL_CONTEXT_ITEMS ?? RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS;

  // Bucket items by source_type (maintaining original order within each bucket)
  /** @type {Record<string, RetrievedItem[]>} */
  const buckets = {};
  for (const sourceType of RETRIEVAL_SOURCE_ORDER) {
    buckets[sourceType] = [];
  }
  for (const item of items) {
    if (item && typeof item === 'object' && item.source_type && item.content) {
      const bucket = buckets[item.source_type];
      if (bucket !== undefined) {
        bucket.push(item);
      }
    }
  }

  // Collect bounded items in source order
  const lines = [];
  let totalCount = 0;

  for (const sourceType of RETRIEVAL_SOURCE_ORDER) {
    if (totalCount >= totalMax) break;

    const bucket = buckets[sourceType] ?? [];
    const limit = maxPerSource[sourceType] ?? 0;
    let sourceCount = 0;

    for (const item of bucket) {
      if (totalCount >= totalMax || sourceCount >= limit) break;

      const provenanceTag = item.source_id
        ? `[${sourceType}:${item.source_id}]`
        : item.entity_name
          ? `[${sourceType}:${item.entity_name}]`
          : `[${sourceType}]`;

      lines.push(`${provenanceTag} ${item.content.trim()}`);
      sourceCount++;
      totalCount++;
    }
  }

  return lines.join('\n');
}

// ─── Re-export config for convenience ────────────────────────────────────────

/**
 * Re-export the retrieval source order and config for consumers that need
 * them without importing retrievalConfig.js directly.
 */
export { RETRIEVAL_SOURCE_ORDER, RETRIEVAL_SOURCE_TYPES, RETRIEVAL_CONFIG };
