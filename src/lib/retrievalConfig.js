/**
 * @file src/lib/retrievalConfig.js
 *
 * Therapist Upgrade — Stage 2 Phase 5 — Retrieval Orchestration Configuration
 *
 * Defines the configurable constants and source-type registry for the
 * Phase 5 retrieval orchestrator.  All thresholds and bounds are stored here —
 * never hard-coded in the orchestrator itself.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is pure configuration data.  It has no runtime side effects,
 * no Base44 SDK calls, and no imports from the current default therapist path.
 * Safe to import in Vitest unit tests.
 *
 * FLAG GATE
 * ---------
 * This config is read only when the THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED
 * flag is on (checked at call sites by the orchestrator and injector).
 *
 * BOUNDING PHILOSOPHY
 * -------------------
 * Bounds are conservative by design.  The goal is minimum-sufficient context,
 * not maximum available context.  Each bound can be tightened or loosened here
 * without touching the orchestrator logic.
 *
 * ROLLBACK
 * --------
 * Removing or ignoring this file has no effect on the current default therapist
 * path.  No existing code depends on this module.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 5, Task 5.2
 */

// ─── Source type constants ────────────────────────────────────────────────────

/**
 * Identifiers for each logical retrieval source type in the upgraded path.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const RETRIEVAL_SOURCE_TYPES = Object.freeze({
  /**
   * Structured therapist memory records stored in CompanionMemory with the
   * THERAPIST_MEMORY_VERSION_KEY marker.  Highest priority — represents the
   * therapist's accumulated understanding of this user across sessions.
   */
  THERAPIST_MEMORY: 'therapist_memory',

  /**
   * Current structured session records: unresolved goals, active
   * CoachingSession state, and recent SessionSummary records.  These anchor
   * each response to the user's current clinical focus.
   */
  SESSION_CONTEXT: 'session_context',

  /**
   * App-authored internal knowledge: Exercise, Resource, AudioContent, Journey.
   * Grounding responses in proven internal content is preferred over generating
   * ungrounded suggestions.
   */
  INTERNAL_KNOWLEDGE: 'internal_knowledge',

  /**
   * Persisted external trusted knowledge from Phase 4 (ExternalKnowledgeChunk
   * records stored inside the app).  Consulted only when internal knowledge
   * does not provide sufficient grounding.  Always clearly separated from
   * internal content via the content_source_type === 'external_trusted' marker.
   */
  EXTERNAL_KNOWLEDGE: 'external_knowledge',
});

// ─── Retrieval source order ───────────────────────────────────────────────────

/**
 * The prescribed internal-first retrieval order for the upgraded therapist path.
 *
 * Sources are consulted in this order.  Each source may return zero items
 * without blocking subsequent sources (fail-open at every level).
 *
 * This order must NOT be changed without updating the Phase 5 plan and tests.
 *
 * @type {ReadonlyArray<string>}
 */
export const RETRIEVAL_SOURCE_ORDER = Object.freeze([
  RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,   // 1 — structured prior-session memory
  RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,    // 2 — current goals / session records
  RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE, // 3 — app-authored content
  RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE, // 4 — persisted external trusted knowledge
]);

// ─── Retrieval bounds configuration ──────────────────────────────────────────

/**
 * All configurable retrieval bounds and thresholds for the upgraded path.
 *
 * Conservative defaults ensure minimum-sufficient context.  Increasing any
 * bound here widens what the agent may receive — do not increase without
 * explicit review.
 *
 * @type {Readonly<Record<string, number>>}
 */
export const RETRIEVAL_CONFIG = Object.freeze({
  /**
   * Confidence threshold for internal retrieval sufficiency.
   *
   * When the aggregate confidence of internal sources (therapist_memory +
   * session_context + internal_knowledge) meets or exceeds this threshold,
   * the external_knowledge source is not consulted.
   *
   * Default is conservative (0.7) — prefers internal content and falls back
   * to external only when internal retrieval is clearly insufficient.
   *
   * Range: 0.0 (always consult external) – 1.0 (never consult external).
   */
  INTERNAL_CONFIDENCE_THRESHOLD: 0.7,

  /**
   * Maximum number of therapist memory records to include in the context
   * package.  Memory records are concise structured summaries; 3 is sufficient
   * for continuity without over-loading the context window.
   */
  MAX_THERAPIST_MEMORY_ITEMS: 3,

  /**
   * Maximum number of current session context items (goals, session summaries,
   * coaching session state) to include.
   */
  MAX_SESSION_CONTEXT_ITEMS: 2,

  /**
   * Maximum number of internal app knowledge items (exercises, resources,
   * audio, journeys) to include.
   */
  MAX_INTERNAL_KNOWLEDGE_ITEMS: 3,

  /**
   * Maximum number of external trusted knowledge chunks to include.
   * Kept low (2) because external chunks are supplemental only.
   */
  MAX_EXTERNAL_KNOWLEDGE_ITEMS: 2,

  /**
   * Hard cap on the total number of items across all sources.
   * Prevents over-fetching even if per-source bounds are generous.
   */
  MAX_TOTAL_CONTEXT_ITEMS: 8,

  /**
   * Maximum number of live knowledge items from Phase 6 live retrieval.
   * Kept very low (2) — live content is supplemental, not primary.
   * Phase 6 addition.
   */
  MAX_LIVE_KNOWLEDGE_ITEMS: 2,

  /**
   * Minimum number of items that must be returned from internal sources
   * (therapist_memory + session_context + internal_knowledge) before the
   * Phase 6 live retrieval step is skipped.
   *
   * When internal sources return at least this many items, internal context
   * is considered sufficient and live retrieval is not invoked.
   * Phase 6 addition.
   */
  INTERNAL_SUFFICIENCY_MIN_ITEMS: 3,
});
