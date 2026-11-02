/**
 * @file src/lib/v3RetrievalExecutor.js
 *
 * Therapist Upgrade — Stage 2 Phase 5.1 — V3 Real Runtime Retrieval Executor
 *
 * This module closes the Phase 5 review gap by providing a real, bounded
 * runtime retrieval execution path for the upgraded V3 therapist path.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * It provides one primary function:
 *
 *   executeV3BoundedRetrieval(entities, config)
 *     Queries real app entity stores in the required internal-first source
 *     order.  Returns an array of RetrievedItem objects ready for
 *     buildBoundedContextPackage().  This is the actual data retrieval that
 *     Phase 5 promised but did not yet execute.
 *
 * RETRIEVAL ORDER
 * ---------------
 * Sources are queried in this exact order (internal-first as required):
 *   1. therapist_memory — CompanionMemory records with the therapist version marker
 *   2. session_context  — active Goal records, then recent SessionSummary records
 *   3. internal_knowledge — Exercise records, then Resource records (bounded sample)
 *   4. external_knowledge — ExternalKnowledgeChunk records (deferred if unavailable)
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Every source level is individually try/caught.  A failure at any source
 * level produces an empty item set for that source and continues to the next.
 * The session-start content is never blocked by retrieval failure.
 *
 * BOUNDED RETRIEVAL
 * -----------------
 * Strict per-source item limits from RETRIEVAL_CONFIG are enforced at fetch
 * time.  Items are also truncated to conservative per-field character limits
 * to prevent large raw text from entering the context window.
 *
 * PRIVACY
 * -------
 * - CompanionMemory is a private per-user entity.  The Base44 SDK already
 *   scopes entity queries to the authenticated user — no additional user
 *   filter is applied in the frontend retrieval path.
 * - Only structured summary fields from therapist memory records are included —
 *   never raw session transcripts or full message histories.
 * - Goal and SessionSummary are per-user structured records.  No PII beyond
 *   what the user has entered in these fields is included.
 * - Internal knowledge (Exercise, Resource) is shared app content — no user
 *   data is included.
 * - External knowledge (ExternalKnowledgeChunk) is app-authored shared
 *   content — no user data is included.
 *
 * EXTERNAL KNOWLEDGE STATUS
 * -------------------------
 * ExternalKnowledgeChunk entity is available (Phase 4.2 created it), but
 * chunks may not yet be populated in production (requires ingestion pipeline
 * run).  If the entity is unavailable or returns empty results, the source
 * is safely skipped.  This is not an error condition.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is ONLY called when wiring.retrieval_orchestration_enabled === true
 * (V3 path).  The check is performed in buildV3SessionStartContentAsync before
 * calling this function.  The default path is completely unaffected.
 *
 * NO LIVE RETRIEVAL
 * -----------------
 * This module contains NO live web retrieval, NO external network calls, and
 * NO allowlist enforcement.  All queries target app-owned Base44 entity stores.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Call this function for any wiring other than V3
 * - Make live API calls beyond the app's own entity APIs
 * - Access or log private user data beyond session-scoped entity reads
 * - Alter the current default therapist path in any way
 * - Override or weaken existing safety filters or crisis handling
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 5.1
 */

import {
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_CONFIG,
} from './retrievalConfig.js';

import {
  isTherapistMemoryRecord,
} from './therapistMemoryModel.js';

import { normalizeAppLocale } from '../components/i18n/appLocale.js';

// ─── Character truncation limits (per item) ───────────────────────────────────

/**
 * Maximum characters for a session summary field within a therapist memory item.
 * Keeps context concise; prevents large text from entering the context window.
 */
const MAX_SESSION_SUMMARY_CHARS = 150;

/**
 * Maximum characters for a session summary record's summary_text field.
 */
const MAX_SUMMARY_TEXT_CHARS = 200;

/**
 * Maximum characters for a CaseFormulation text field (presenting problem,
 * core belief, maintaining cycle).  Kept tight to avoid overloading context.
 */
const MAX_FORMULATION_FIELD_CHARS = 120;

/**
 * Maximum characters for an external knowledge chunk's text.
 */
const MAX_CHUNK_TEXT_CHARS = 250;

// ─── Retrieval over-fetch multiplier ─────────────────────────────────────────

/**
 * Multiplier applied when fetching CompanionMemory records for therapist
 * memory filtering.  We fetch more raw records than the target limit because
 * CompanionMemory contains both therapist-typed records (those with the
 * THERAPIST_MEMORY_VERSION_KEY marker) and standard companion memory records.
 * The multiplier ensures we have enough candidates after filtering.
 */
const MEMORY_OVERFETCH_MULTIPLIER = 5;

// ─── Source limit allocation ratios ──────────────────────────────────────────

/**
 * Fraction of the session_context item limit allocated to Goal records.
 * The remaining fraction goes to SessionSummary records.
 * Goals have higher clinical relevance for session continuity.
 */
const GOAL_ALLOCATION_RATIO = 0.5;

/**
 * Fraction of the internal_knowledge item limit allocated to Exercise records.
 * The remaining fraction goes to Resource records.
 * Exercises are the primary internal knowledge source for CBT interventions.
 */
const EXERCISE_ALLOCATION_RATIO = 0.5;

// ─── Source 1 — therapist_memory ─────────────────────────────────────────────

/**
 * Fetches structured therapist memory items from CompanionMemory.
 *
 * Reads CompanionMemory records for the authenticated user, filters for
 * records that carry the Phase 1 therapist memory version marker, and
 * converts each valid record into a concise structured context item.
 *
 * Privacy: Only structured summary fields are included.  Raw session text
 * is never passed through.  CompanionMemory is private per-user.
 *
 * @param {object} entities - Base44 entity client map
 * @param {number} limit    - Maximum number of items to return
 * @returns {Promise<object[]>} Array of RetrievedItem objects
 */
async function fetchTherapistMemoryItems(entities, limit) {
  const items = [];
  try {
    // Fetch more raw records than limit to account for non-therapist records.
    // CompanionMemory is private per-user; SDK scopes to the current user.
    const rawRecords = await entities.CompanionMemory.list('-created_date', limit * MEMORY_OVERFETCH_MULTIPLIER);
    if (!Array.isArray(rawRecords)) return items;

    for (const raw of rawRecords) {
      if (items.length >= limit) break;
      if (!raw || !raw.content) continue;

      let parsed;
      try {
        parsed = JSON.parse(raw.content);
      } catch {
        continue; // Skip unparseable records
      }

      if (!isTherapistMemoryRecord(parsed)) continue;

      // Build a concise, structured summary — no raw transcripts
      const parts = [];
      if (parsed.session_date) {
        parts.push(`session: ${parsed.session_date}`);
      }
      if (parsed.session_summary && typeof parsed.session_summary === 'string') {
        parts.push(parsed.session_summary.trim().slice(0, MAX_SESSION_SUMMARY_CHARS));
      }
      if (Array.isArray(parsed.core_patterns) && parsed.core_patterns.length > 0) {
        parts.push(`patterns: ${parsed.core_patterns.slice(0, 3).join(', ')}`);
      }
      if (Array.isArray(parsed.follow_up_tasks) && parsed.follow_up_tasks.length > 0) {
        parts.push(`follow_ups: ${parsed.follow_up_tasks.slice(0, 2).join('; ')}`);
      }

      const content = parts.join(' | ').trim();
      if (!content) continue;

      items.push({
        source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
        content,
        entity_name: 'CompanionMemory',
      });
    }
  } catch {
    // Fail-open: entity access failure for this source — return what we have
  }
  return items;
}

// ─── Source 2 — session_context ──────────────────────────────────────────────

/**
 * Fetches session context items from active Goal records and recent
 * SessionSummary records.
 *
 * Goals are queried first (higher clinical relevance for continuity).
 * SessionSummary records are queried second if the item limit allows.
 *
 * Both are per-user structured records — no cross-user access.
 *
 * @param {object} entities - Base44 entity client map
 * @param {number} limit    - Maximum number of items to return
 * @returns {Promise<object[]>} Array of RetrievedItem objects
 */
async function fetchSessionContextItems(entities, limit) {
  const items = [];
  let count = 0;

  // Active goals — highest clinical relevance in session context
  try {
    const goalLimit = Math.max(1, Math.ceil(limit * GOAL_ALLOCATION_RATIO));
    const goals = await entities.Goal.filter({ status: 'active' }, '-created_date', goalLimit);
    if (Array.isArray(goals)) {
      for (const goal of goals) {
        if (count >= limit) break;

        const parts = [];
        const title = goal.title || goal.name;
        if (title) parts.push(title);
        if (goal.progress_percentage != null) {
          parts.push(`progress: ${goal.progress_percentage}%`);
        }
        if (goal.category) parts.push(`category: ${goal.category}`);

        const content = parts.join(', ').trim();
        if (!content) continue;

        items.push({
          source_type: RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
          content,
          entity_name: 'Goal',
        });
        count++;
      }
    }
  } catch {
    // Fail-open: goals unavailable — continue to SessionSummary
  }

  // Recent session summaries — continuity context
  try {
    if (count < limit) {
      const summaryLimit = limit - count;
      const summaries = await entities.SessionSummary.list('-session_date', summaryLimit + 1);
      if (Array.isArray(summaries)) {
        for (const summary of summaries) {
          if (count >= limit) break;

          const parts = [];
          if (summary.session_date) parts.push(`date: ${summary.session_date}`);
          if (summary.summary_text && typeof summary.summary_text === 'string') {
            parts.push(summary.summary_text.trim().slice(0, MAX_SUMMARY_TEXT_CHARS));
          }

          const content = parts.join(' | ').trim();
          if (!content) continue;

          items.push({
            source_type: RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
            content,
            entity_name: 'SessionSummary',
          });
          count++;
        }
      }
    }
  } catch {
    // Fail-open: session summaries unavailable
  }

  // CaseFormulation — longitudinal clinical frame (Phase 1 Quality Gains)
  // Read-only, caution layer.  Bounded to 1 item.  Fail-open.
  // Only consulted when item slots remain after Goals and SessionSummary.
  try {
    if (count < limit) {
      const formulations = await entities.CaseFormulation.list('-created_date', 1);
      if (Array.isArray(formulations) && formulations.length > 0) {
        const cf = formulations[0];
        const parts = [];
        if (cf.presenting_problem && typeof cf.presenting_problem === 'string') {
          parts.push('presenting: ' + cf.presenting_problem.trim().slice(0, MAX_FORMULATION_FIELD_CHARS));
        }
        if (cf.core_belief && typeof cf.core_belief === 'string') {
          parts.push('core belief: ' + cf.core_belief.trim().slice(0, MAX_FORMULATION_FIELD_CHARS));
        }
        if (cf.maintaining_cycle && typeof cf.maintaining_cycle === 'string') {
          parts.push('maintaining cycle: ' + cf.maintaining_cycle.trim().slice(0, MAX_FORMULATION_FIELD_CHARS));
        }
        if (cf.treatment_goals && typeof cf.treatment_goals === 'string') {
          parts.push('treatment goals: ' + cf.treatment_goals.trim().slice(0, MAX_FORMULATION_FIELD_CHARS));
        }

        const content = parts.join(' | ').trim();
        if (content) {
          items.push({
            source_type: RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT,
            content,
            entity_name: 'CaseFormulation',
          });
          count++;
        }
      }
    }
  } catch {
    // Fail-open: CaseFormulation unavailable — continue without it
  }

  return items;
}

// ─── Source 3 — internal_knowledge ───────────────────────────────────────────

/**
 * Fetches internal knowledge items from Exercise and Resource records.
 *
 * Exercise records are queried first, then Resource records if the item
 * limit allows.  This gives the therapist a bounded view of available
 * app-authored content to ground suggestions and interventions.
 *
 * These are shared app-authored content entities — no user data included.
 *
 * @param {object} entities - Base44 entity client map
 * @param {number} limit    - Maximum number of items to return
 * @returns {Promise<object[]>} Array of RetrievedItem objects
 */
async function fetchInternalKnowledgeItems(entities, limit, resourceLanguage) {
  const items = [];
  let count = 0;

  // Exercises — primary internal knowledge source for CBT therapist
  try {
    const exerciseLimit = Math.max(1, Math.ceil(limit * EXERCISE_ALLOCATION_RATIO));
    const exercises = await entities.Exercise.list('title', exerciseLimit + 1);
    if (Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (count >= limit) break;

        const parts = [];
        const title = ex.title || ex.name;
        if (title) parts.push(title);
        const exerciseType = ex.exercise_type || ex.type;
        if (exerciseType) parts.push(`type: ${exerciseType}`);

        const content = parts.join(', ').trim();
        if (!content) continue;

        items.push({
          source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
          content,
          entity_name: 'Exercise',
        });
        count++;
      }
    }
  } catch {
    // Fail-open: exercises unavailable — continue to Resources
  }

  // Resources — secondary internal knowledge source
  try {
    if (count < limit) {
      const resourceLimit = limit - count + 1;
      const resources = await entities.Resource.filter(
        { language: resourceLanguage, status: 'active' },
        'title',
        resourceLimit,
      );
      if (Array.isArray(resources)) {
        for (const res of resources) {
          if (count >= limit) break;

          const parts = [];
          const title = res.title || res.name;
          if (title) parts.push(title);
          if (res.category) parts.push(`category: ${res.category}`);

          const content = parts.join(', ').trim();
          if (!content) continue;

          items.push({
            source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
            content,
            entity_name: 'Resource',
          });
          count++;
        }
      }
    }
  } catch {
    // Fail-open: resources unavailable
  }

  return items;
}

// ─── Source 4 — external_knowledge ───────────────────────────────────────────

/**
 * Fetches external trusted knowledge items from ExternalKnowledgeChunk records.
 *
 * This source is consulted last (lowest priority).  If the entity is not
 * available or returns no results, it is safely skipped — this is expected
 * when no external knowledge has been ingested via the ingestion pipeline.
 *
 * NOTE: ExternalKnowledgeChunk entity storage surfaces exist (Phase 4.2)
 * but may contain no records in production yet.  Empty results are safe.
 *
 * ExternalKnowledgeChunk is app-authored shared content — no user data.
 *
 * @param {object} entities - Base44 entity client map
 * @param {number} limit    - Maximum number of items to return
 * @returns {Promise<object[]>} Array of RetrievedItem objects
 */
async function fetchExternalKnowledgeItems(entities, limit) {
  const items = [];
  try {
    // Guard: entity may not be available
    if (!entities.ExternalKnowledgeChunk) return items;

    const chunks = await entities.ExternalKnowledgeChunk.list('source_id', limit + 1);
    if (!Array.isArray(chunks)) return items;

    for (const chunk of chunks) {
      if (items.length >= limit) break;

      // Support both 'chunk_text' (Phase 4 schema) and 'content' (generic fallback)
      const text = (chunk.chunk_text || chunk.content || '').trim();
      if (!text) continue;

      items.push({
        source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
        content: text.slice(0, MAX_CHUNK_TEXT_CHARS),
        entity_name: 'ExternalKnowledgeChunk',
        source_id: chunk.source_id || 'unknown',
      });
    }
  } catch {
    // External knowledge not safely available — skip silently.
    // This is expected when no external knowledge has been ingested.
  }
  return items;
}

// ─── Primary export ───────────────────────────────────────────────────────────

/**
 * @typedef {object} V3RetrievalResult
 * @property {object[]}  items            - Array of RetrievedItem objects for buildBoundedContextPackage.
 * @property {string[]}  sources_queried  - Source type names that were successfully queried.
 * @property {string[]}  sources_skipped  - Source type names that were skipped due to failure.
 */

/**
 * Executes real bounded retrieval against the app's entity stores for the
 * V3 upgraded therapist path.
 *
 * This is the Phase 5.1 runtime retrieval execution function.  It replaces
 * the Phase 5 gap where retrieval instructions were injected but no actual
 * retrieval occurred.  This function actually queries real app data.
 *
 * Sources are queried in the required internal-first order:
 *   1. therapist_memory (CompanionMemory — highest priority)
 *   2. session_context  (Goal + SessionSummary)
 *   3. internal_knowledge (Exercise + Resource)
 *   4. external_knowledge (ExternalKnowledgeChunk — deferred if unavailable)
 *
 * Each source is individually try/caught — failure at any level skips that
 * source and continues.  The session start is never blocked.
 *
 * The returned items are ready for buildBoundedContextPackage() from
 * retrievalOrchestrator.js, which enforces final per-source and total limits.
 *
 * PRIVACY: Only per-user structured fields (not raw transcripts) are included.
 * Shared app content (Exercise, Resource, ExternalKnowledgeChunk) contains no
 * user data.  CompanionMemory, Goal, and SessionSummary are scoped to the
 * authenticated user by the Base44 SDK.
 *
 * NO LIVE RETRIEVAL: All queries target app-owned entity stores only.
 *
 * @param {object} entities      - Base44 entity client map (e.g. base44.entities)
 * @param {object} [config]      - Retrieval config override (defaults to RETRIEVAL_CONFIG)
 * @param {object} [options]     - Runtime options
 * @param {string} [options.locale] - App locale used to isolate Resource retrieval
 * @returns {Promise<V3RetrievalResult>}
 */
export async function executeV3BoundedRetrieval(entities, config = RETRIEVAL_CONFIG, options = {}) {
  if (!entities || typeof entities !== 'object') {
    return {
      items: [],
      sources_queried: [],
      sources_skipped: Object.values(RETRIEVAL_SOURCE_TYPES),
    };
  }

  const safeConfig = config && typeof config === 'object' ? config : RETRIEVAL_CONFIG;
  const resourceLanguage = normalizeAppLocale(options?.locale, 'en');
  const memLimit  = safeConfig.MAX_THERAPIST_MEMORY_ITEMS   ?? RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS;
  const ctxLimit  = safeConfig.MAX_SESSION_CONTEXT_ITEMS    ?? RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS;
  const intLimit  = safeConfig.MAX_INTERNAL_KNOWLEDGE_ITEMS ?? RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS;
  const extLimit  = safeConfig.MAX_EXTERNAL_KNOWLEDGE_ITEMS ?? RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS;

  const allItems = [];
  const sources_queried = [];
  const sources_skipped = [];

  // ── Source 1: therapist_memory ────────────────────────────────────────────
  try {
    const memItems = await fetchTherapistMemoryItems(entities, memLimit);
    allItems.push(...memItems);
    sources_queried.push(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
  } catch {
    sources_skipped.push(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
  }

  // ── Source 2: session_context ─────────────────────────────────────────────
  try {
    const ctxItems = await fetchSessionContextItems(entities, ctxLimit);
    allItems.push(...ctxItems);
    sources_queried.push(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
  } catch {
    sources_skipped.push(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
  }

  // ── Source 3: internal_knowledge ──────────────────────────────────────────
  try {
    const intItems = await fetchInternalKnowledgeItems(entities, intLimit, resourceLanguage);
    allItems.push(...intItems);
    sources_queried.push(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE);
  } catch {
    sources_skipped.push(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE);
  }

  // ── Source 4: external_knowledge (deferred if unavailable) ───────────────
  try {
    const extItems = await fetchExternalKnowledgeItems(entities, extLimit);
    allItems.push(...extItems);
    sources_queried.push(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
  } catch {
    sources_skipped.push(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
  }

  return { items: allItems, sources_queried, sources_skipped };
}
