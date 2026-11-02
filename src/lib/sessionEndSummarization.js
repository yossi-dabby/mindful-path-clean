/**
 * @file src/lib/sessionEndSummarization.js
 *
 * Therapist Upgrade — Phase 2.1 — Real Session-End Invocation Path
 * Extended in Phase 4 — Chat.jsx Conversation Memory Write
 *
 * Phase 2.1 closes two gaps left open by Phase 2:
 *   1. There was no real, bounded session-end invocation path.
 *   2. The generateSessionSummary backend accepted only pre-shaped payloads;
 *      there was no step that derived structured output FROM session/conversation input.
 *
 * Phase 4 closes the Chat.jsx memory-write gap:
 *   3. Chat.jsx free-form therapy conversations had no path to write structured
 *      records to CompanionMemory, so the V7 cross-session continuity block read
 *      empty memory on every session start. Phase 4 adds a lightweight write path
 *      for Chat.jsx conversations, enabling V7 continuity to read prior session
 *      context in future sessions.
 *
 * This module provides:
 *   A. deriveSessionSummaryPayload(session, boundedMessages)
 *      — The ACTUAL summarization step. Takes a CoachingSession entity and a
 *        bounded conversation message window. Extracts structured, clinical data
 *        deterministically (non-LLM) from session metadata and action plan.
 *        Returns a payload matching the Phase 1 therapist-memory contract.
 *
 *   B. triggerSessionEndSummarization(session, messages, invoker)
 *      — The REAL INVOCATION PATH for CoachingSession completions. Checks
 *        isSummarizationEnabled(), derives the summary payload, then calls the
 *        generateSessionSummary backend function via base44.functions.invoke.
 *        Completely non-blocking (fire-and-forget). When flags are off it is
 *        entirely inert.
 *
 *   C. deriveConversationMemoryPayload(conversationId, conversationMeta)   [Phase 4]
 *      — Lightweight counterpart of deriveSessionSummaryPayload for Chat.jsx
 *        free-form therapy conversations. Derives a minimal therapist-memory
 *        record from conversation identity metadata (no message content stored).
 *        Produces a valid record matching the Phase 1 schema; session_summary
 *        is populated when a meaningful intent or name is available.
 *
 *   D. triggerConversationEndSummarization(conversationId, conversationMeta, invoker, entities, runtimeSnapshot, messages)   [Phase 4/Phase 3]
 *      — Promise-returning, gated memory-write trigger for Chat.jsx conversation ends.
 *        Called from Chat.jsx's requestSummary function (the natural
 *        end-of-chat boundary). Gated by the same isSummarizationEnabled() check.
 *        Inert in default mode (flags off). Fail-closed.
 *        When `entities` is provided and THERAPIST_UPGRADE_CONTINUITY_ENABLED is
 *        active, the base payload is enriched with structured Goal and
 *        CaseFormulation data before persistence (Phase 3 enrichment).
 *
 *   E. enrichConversationMemoryPayload(basePayload, entities)   [Phase 3]
 *      — Asynchronously enriches a base Chat.jsx memory payload with structured
 *        data from the Goal and CaseFormulation entities (read-only).
 *        Populates goals_referenced (goal IDs), follow_up_tasks (active goal
 *        titles), and working_hypotheses (from CaseFormulation core_belief).
 *        Fail-closed: any entity read failure returns the unmodified basePayload.
 *        Only called when both isSummarizationEnabled() AND isContinuityEnabled().
 *
 * ACTIVATION
 * ----------
 * Gated by THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (and master
 * THERAPIST_UPGRADE_ENABLED). Both flags default to false.
 * When flags are off, this module is imported safely but all trigger functions
 * return immediately without side effects.
 *
 * SESSION-END BOUNDARY (CoachingSession path)
 * -------------------------------------------
 * triggerSessionEndSummarization is called from CoachingChat.jsx when the
 * session stage transitions to 'completed' via updateStageMutation.onSuccess.
 * This is a real, bounded, explicit session-completion surface — it fires once
 * per stage transition, not on every message. It is non-blocking: the session
 * close UX is unaffected whether summarization succeeds or fails.
 *
 * CONVERSATION-END BOUNDARY (Chat.jsx path)   [Phase 4]
 * -----------------------------------------------------
 * triggerConversationEndSummarization is called from Chat.jsx's requestSummary
 * function — the point where a user explicitly signals the end of a therapy
 * conversation. Automatic switch callers may await it for a bounded period;
 * failures remain non-fatal and the UI proceeds fail-open.
 *
 * BOUNDED INPUT
 * -------------
 * - Only the last SESSION_SUMMARIZATION_MAX_MESSAGES messages are considered.
 * - Chat.jsx sends a character-capped, role-filtered input to the backend only
 *   for transient summarization; the input is never persisted.
 * - Session/conversation metadata is used for structured extraction.
 * - No full transcript is dumped; no raw message content is ever stored.
 *
 * PRIVACY
 * -------
 * - Neither derive function stores raw message content.
 * - The fallback session_summary is built from structured metadata fields.
 * - Raw message content is never written to CompanionMemory.
 * - The output is sanitized through the Phase 2 sanitizeSummaryRecord contract
 *   before any persistence.
 * - Forbidden fields (transcript, messages, etc.) are never included in output.
 *
 * FAIL-SAFE
 * ---------
 * - All errors in all trigger functions are caught.
 * - Summarization failure never propagates to the caller.
 * - The session/conversation UX is independent of these functions.
 *
 * This file contains no Deno APIs and no runtime side effects beyond async
 * functions with caught failures and no module-load side effects. It is safe to import in Vitest unit tests
 * (the base44 dependency is only imported lazily inside the trigger functions).
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 2.1 for CoachingSession context.
 * See Phase 4 for Chat.jsx conversation memory write context.
 */

import { isSummarizationEnabled, resolveRuntimeSummarizationFlag } from './summarizationGate.js';
import { sanitizeSummaryRecord, buildSafeStubRecord, isRawTranscriptContent } from './summarizationGate.js';
import { isUpgradeEnabled } from './featureFlags.js';
import { classifyEntityListResponseShape } from './entityListNormalizer.js';
import {
  isTherapistMemoryRecord,
  isLTSRecord,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
  LTS_TRAJECTORIES,
} from './therapistMemoryModel.js';

// ─── Base44 function response unwrap helper ───────────────────────────────────

/**
 * Unwraps a Base44 SDK function invoke result.
 *
 * Base44 function responses may be delivered wrapped in a `.data` envelope
 * (e.g. `{ data: { memories: [...] } }`) or as a legacy bare object
 * (e.g. `{ memories: [...] }`).  This helper normalises both forms.
 *
 * - If `result` is a non-null object with a non-null object `result.data`:
 *   returns `result.data`.
 * - Otherwise returns `result` unchanged (legacy / already-unwrapped).
 * - Never throws; safe to call on any value.
 *
 * @param {unknown} result - Raw invoke return value.
 * @returns {unknown} The unwrapped payload or the original value.
 */
export function unwrapBase44FunctionData(result) {
  try {
    if (
      result !== null &&
      typeof result === 'object' &&
      result.data !== null &&
      typeof result.data === 'object'
    ) {
      return result.data;
    }
  } catch {
    // Defensive: never throw.
  }
  return result;
}

// ─── Bounded input constants ──────────────────────────────────────────────────

/**
 * Maximum number of messages included in the summarization input window.
 * Only the last N messages are passed. Prevents large transcript windows.
 *
 * @type {number}
 */
export const SESSION_SUMMARIZATION_MAX_MESSAGES = 40;

export const CONVERSATION_SUMMARY_MAX_TOTAL_CHARS = 12000;
export const CONVERSATION_SUMMARY_MAX_MESSAGE_CHARS = 1500;

const INTERNAL_SUMMARY_INPUT_PATTERN = /^\s*(?:\[START_SESSION\]|\[INTERNAL|User clicked:)/i;
const ACTION_BLOCK_PATTERN = /<actions>[\s\S]*?<\/actions>/gi;

/**
 * Builds bounded, ephemeral input from already-visible Chat.jsx messages.
 * This transport object is never part of the persisted memory record.
 */
export function buildConversationSummaryInput(messages = []) {
  if (!Array.isArray(messages)) return { version: 1, turns: [] };

  const turns = [];
  let remaining = CONVERSATION_SUMMARY_MAX_TOTAL_CHARS;
  const candidates = messages.slice(-SESSION_SUMMARIZATION_MAX_MESSAGES);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = candidates[index];
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) continue;
    if (message.pending || message.isPending || message.streaming || message.isStreaming) continue;
    if (typeof message.content !== 'string') continue;

    let content = message.content.replace(ACTION_BLOCK_PATTERN, '').trim();
    if (!content || INTERNAL_SUMMARY_INPUT_PATTERN.test(content)) continue;
    content = content.slice(0, Math.min(CONVERSATION_SUMMARY_MAX_MESSAGE_CHARS, remaining));
    if (!content) break;

    // Iterate newest-first so a late correction cannot be displaced by the
    // total-character cap, then unshift to restore chronological order.
    turns.unshift({ role: message.role, content });
    remaining -= content.length;
    if (remaining <= 0) break;
  }

  return { version: 1, turns };
}

/**
 * Maximum character length for free-text session metadata fields
 * (current_challenge, desired_outcome) when building session_summary.
 * Prevents accidental storage of very long user-typed text blobs.
 *
 * @type {number}
 */
const MAX_METADATA_FIELD_LENGTH = 300;

// ─── Actual summarization step ────────────────────────────────────────────────

/**
 * Derives a structured therapist-memory summary payload from bounded
 * session/conversation input.
 *
 * THIS IS THE ACTUAL SUMMARIZATION STEP (Phase 2.1 Gap 2).
 *
 * It takes a real CoachingSession entity and a bounded conversation message
 * window, and produces a structured record matching the Phase 1 therapist-memory
 * contract — without requiring a pre-shaped summary payload from the caller.
 *
 * APPROACH (non-LLM, deterministic)
 * - session_summary: constructed from session.focus_area + session.current_challenge
 *   + session.desired_outcome (structured metadata, not raw transcript).
 * - follow_up_tasks: extracted from incomplete action_plan items.
 * - actions: extracted from completed action_plan items.
 * - goals_referenced: extracted from session.related_goals.
 * - interventions_used: derived from session.stage.
 * - All other clinical arrays: empty (not guessable without LLM).
 * - Message window: used to bound input scope; message content is NOT stored.
 *
 * The output is passed through sanitizeSummaryRecord to enforce the Phase 2
 * contract before any downstream use.
 *
 * @param {object} session
 *   A CoachingSession entity. Must have at minimum: { id, stage }.
 *   Optional enrichment: focus_area, current_challenge, desired_outcome,
 *   action_plan, related_goals, created_date.
 * @param {Array} [messages=[]]
 *   Conversation messages from the session (bounded to SESSION_SUMMARIZATION_MAX_MESSAGES).
 *   Message content is NOT stored in the output — only the window size is used.
 * @returns {object}
 *   A sanitized summary record matching the Phase 1 therapist-memory schema.
 *   Returns buildSafeStubRecord() if the session argument is invalid.
 */
export function deriveSessionSummaryPayload(session, messages = []) {
  // Fail-safe: invalid session → safe stub
  if (!session || typeof session !== 'object') {
    return buildSafeStubRecord('', '');
  }

  const sessionId = typeof session.id === 'string' ? session.id : '';
  const sessionDate =
    typeof session.created_date === 'string'
      ? session.created_date
      : new Date().toISOString();

  // Bound the message window — content is not extracted from messages in the
  // non-LLM path; only the window size matters for privacy bounding.
  const _boundedMessages = Array.isArray(messages)
    ? messages.slice(-SESSION_SUMMARIZATION_MAX_MESSAGES)
    : [];

  // ── session_summary ─────────────────────────────────────────────────────────
  // Built from structured session metadata (not message content).
  // Max 2000 chars enforced downstream by sanitizeSummaryRecord.
  const focusArea = typeof session.focus_area === 'string' ? session.focus_area.trim() : '';
  const challenge =
    typeof session.current_challenge === 'string'
      ? session.current_challenge.trim().slice(0, MAX_METADATA_FIELD_LENGTH)
      : '';
  const outcome =
    typeof session.desired_outcome === 'string'
      ? session.desired_outcome.trim().slice(0, MAX_METADATA_FIELD_LENGTH)
      : '';

  let sessionSummary = '';
  if (focusArea && challenge) {
    sessionSummary = `Session focused on ${focusArea}. Challenge: ${challenge}.`;
    if (outcome) {
      sessionSummary += ` Desired outcome: ${outcome}.`;
    }
  } else if (challenge) {
    sessionSummary = `Challenge addressed: ${challenge}.`;
  } else if (focusArea) {
    sessionSummary = `Session focused on ${focusArea}.`;
  }

  // ── follow_up_tasks (incomplete action_plan items) ──────────────────────────
  const actionPlan = Array.isArray(session.action_plan) ? session.action_plan : [];
  const followUpTasks = actionPlan
    .filter((item) => item && typeof item.title === 'string' && !item.completed)
    .map((item) => item.title.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);

  // ── actions (completed action_plan items) ───────────────────────────────────
  const actions = actionPlan
    .filter((item) => item && typeof item.title === 'string' && item.completed)
    .map((item) => item.title.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);

  // ── goals_referenced ────────────────────────────────────────────────────────
  const goalsReferenced = Array.isArray(session.related_goals)
    ? session.related_goals
        .filter((g) => typeof g === 'string' && g.trim().length > 0)
        .map((g) => g.trim())
        .slice(0, 20)
    : [];

  // ── interventions_used (derived from session stage) ─────────────────────────
  const stage = typeof session.stage === 'string' ? session.stage : '';
  const interventionsUsed =
    stage && stage !== 'completed' && stage.length > 0 ? [stage] : [];

  // ── Build raw payload (will be sanitized through Phase 2 contract) ───────────
  const rawPayload = {
    session_id: sessionId,
    session_date: sessionDate,
    session_summary: sessionSummary,
    core_patterns: [],
    triggers: [],
    automatic_thoughts: [],
    emotions: [],
    urges: [],
    actions,
    consequences: [],
    working_hypotheses: [],
    interventions_used: interventionsUsed,
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: followUpTasks,
    goals_referenced: goalsReferenced,
    last_summarized_date: new Date().toISOString(),
  };

  // Sanitize through the Phase 2 contract (validates all fields, enforces lengths,
  // blocks transcript dumps, enforces version marker).
  const { record } = sanitizeSummaryRecord(rawPayload);
  return record;
}

// ─── Real session-end invocation path ────────────────────────────────────────

/**
 * Triggers session-end summarization non-blockingly.
 *
 * THIS IS THE REAL SESSION-END INVOCATION PATH (Phase 2.1 Gap 1).
 *
 * It is called from CoachingChat.jsx when the session stage transitions to
 * 'completed' (the real session-completion boundary). The call is:
 *   - Gated: checks isSummarizationEnabled() first; returns immediately if false.
 *   - Bounded: passes only session metadata + last N messages.
 *   - Non-blocking: fires-and-forgets via an async IIFE; never throws to caller.
 *   - Safe: all errors are caught; session close UX is unaffected.
 *   - Inert in default mode: when flags are off, this function is a no-op.
 *
 * In default mode (flags off) this function returns synchronously with no
 * side effects — the current therapist path is completely unaffected.
 *
 * @param {object} session - The CoachingSession entity at the completion boundary.
 * @param {Array} [messages=[]] - Conversation messages (bounded to max window).
 * @param {string} [invoker='stage_completed'] - Diagnostic label for the trigger source.
 */
export function triggerSessionEndSummarization(
  session,
  messages = [],
  invoker = 'stage_completed',
) {
  // Gate check: if not enabled, return immediately — entirely inert
  if (!isSummarizationEnabled()) {
    return;
  }

  // Return the task for deterministic tests and diagnostics. Runtime callers
  // intentionally do not await it, so the session-close path remains non-blocking.
  return (async () => {
    try {
      const payload = deriveSessionSummaryPayload(session, messages);

      // Lazy import to avoid any bundler/module cost in default-off mode
      const { base44 } = await import('../api/base44Client.js');

      await base44.functions.invoke('generateSessionSummary', payload);

      // Wave 3B: recompute and upsert the LTS snapshot after the session memory
      // write has succeeded.  Fire-and-forget — failure here never affects the
      // session close path.
      if (isLongitudinalEnabled()) {
        await _fireLTSWrite(base44, invoker);
      }
    } catch (error) {
      // Summarization failure must never propagate to the caller.
      // Session close UX is independent of this function.
      console.warn(
        '[Phase 2.1] Session-end summarization failed (non-fatal) [' + invoker + ']:',
        error instanceof Error ? error.message : String(error),
      );
    }
  })();
}

// ─── Phase 4 — Chat.jsx Conversation Memory Write ────────────────────────────

/**
 * Diagnostic label for the conversation-end summarization trigger source.
 * Exported so that call sites and tests can reference the canonical value.
 *
 * @type {string}
 */
export const CONVERSATION_END_SUMMARY_INVOKER = 'conversation_end';

/**
 * Minimum number of messages a Chat.jsx conversation must contain before a
 * conversation-switch memory write is attempted.
 *
 * Phase 5 — Conversation-Switch Memory Write Trigger.
 *
 * Rationale: the first message in every Chat.jsx session is the internal
 * [START_SESSION] prompt (buildV7SessionStartContentAsync). The second is the
 * agent's opening response. Only from message 3 onward has the user sent at
 * least one real turn. Requiring >= 3 messages therefore filters out sessions
 * that were opened and immediately abandoned before any real exchange occurred,
 * while still writing a record for every session where the user engaged.
 *
 * This constant is exported so that Chat.jsx (which reads `messages` state) and
 * test suites can reference the canonical threshold without hard-coding it.
 *
 * @type {number}
 */
export const CONVERSATION_MIN_MESSAGES_FOR_MEMORY = 3;

// ─── Phase 3 — Conversation memory payload enrichment ────────────────────────

/**
 * Returns true if the Phase 3 conversation memory enrichment layer is active.
 *
 * Enrichment requires both:
 *   - THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (write path gate)
 *   - THERAPIST_UPGRADE_CONTINUITY_ENABLED (continuity layer gate)
 *
 * Both default to false — enrichment is completely inert unless both are on.
 *
 * @returns {boolean}
 */
export function isContinuityEnrichmentEnabled() {
  return (
    isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED') &&
    isUpgradeEnabled('THERAPIST_UPGRADE_CONTINUITY_ENABLED')
  );
}

/**
 * Resolves whether conversation-memory continuity enrichment is enabled,
 * optionally honouring a runtime flag snapshot.
 *
 * Runtime authority applies when the snapshot is accepted
 * (transport_status=available, received=true, APPLY=true).
 * Under accepted runtime authority enrichment is TRUE only when ALL of:
 *   THERAPIST_RUNTIME_APPLY_ENABLED, THERAPIST_UPGRADE_ENABLED,
 *   THERAPIST_UPGRADE_SUMMARIZATION_ENABLED, THERAPIST_UPGRADE_CONTINUITY_ENABLED
 * are true in the snapshot.  MASTER=false hard-rolls-back enrichment.
 *
 * When runtime authority is unavailable or APPLY is not true, the function
 * preserves the exact legacy isContinuityEnrichmentEnabled() result.
 *
 * No raw message content is affected by this gate.
 *
 * @param {object|null|undefined} snapshot - Runtime flag snapshot (may be absent).
 * @returns {boolean}
 */
export function resolveRuntimeContinuityEnrichmentFlag(snapshot) {
  if (
    snapshot &&
    snapshot.transport_status === 'available' &&
    snapshot.received === true &&
    snapshot.flags &&
    snapshot.flags['THERAPIST_RUNTIME_APPLY_ENABLED'] === true
  ) {
    return (
      snapshot.flags['THERAPIST_UPGRADE_ENABLED'] === true &&
      snapshot.flags['THERAPIST_UPGRADE_SUMMARIZATION_ENABLED'] === true &&
      snapshot.flags['THERAPIST_UPGRADE_CONTINUITY_ENABLED'] === true
    );
  }
  return isContinuityEnrichmentEnabled();
}

/**
 * Maximum number of active Goal records read during enrichment.
 * Bounded to prevent large entity reads from slowing down the write path.
 *
 * @type {number}
 */
export const ENRICHMENT_MAX_GOALS = 5;

/**
 * Maximum character length for a single Goal title used as a follow_up_task.
 *
 * @type {number}
 */
export const ENRICHMENT_GOAL_TITLE_MAX_CHARS = 120;

/**
 * Maximum character length for CaseFormulation string fields used in enrichment.
 *
 * @type {number}
 */
export const ENRICHMENT_FORMULATION_FIELD_MAX_CHARS = 120;

/**
 * Asynchronously enriches a base Chat.jsx memory payload with structured data
 * from the Goal and CaseFormulation entities.
 *
 * Phase 3 Deep Personalization — Conversation Memory Enrichment.
 *
 * The base payload produced by deriveConversationMemoryPayload has empty clinical
 * arrays (core_patterns, follow_up_tasks, goals_referenced, working_hypotheses)
 * because Chat.jsx conversations have no structured session metadata to extract
 * from without reading message content. This function enriches those arrays using
 * two entity reads that are read-only and structurally safe:
 *
 *   1. Goal (active only, max ENRICHMENT_MAX_GOALS):
 *      - goals_referenced ← goal IDs
 *      - follow_up_tasks  ← goal titles (active goals ARE the pending tasks)
 *
 *   2. CaseFormulation (most recent, 1 record):
 *      - working_hypotheses ← core_belief (the core working hypothesis)
 *
 * PRIVACY CONTRACT
 * - Only structured entity fields are read (id, title, status for Goal;
 *   core_belief for CaseFormulation). No message content is accessed.
 * - Goal and CaseFormulation are approved read-only entities in the CBT
 *   Therapist access policy (docs/ai-agent-access-policy.md).
 * - The enriched payload is sanitized through sanitizeSummaryRecord before
 *   any persistence, so field-length and transcript-pattern guards apply.
 *
 * FAIL-CLOSED CONTRACT
 * - Any entity read failure returns the base payload unchanged.
 * - The caller's write path is never blocked by an enrichment failure.
 *
 * ISOLATION GUARANTEE
 * - Only called when isContinuityEnrichmentEnabled() is true.
 * - The companion flow is never affected: this function is only called from
 *   triggerConversationEndSummarization (the therapist-only write path).
 *
 * @param {object} basePayload
 *   The record returned by deriveConversationMemoryPayload. Must not be mutated
 *   by the caller after being passed here.
 * @param {object} entities
 *   Base44 entity client map (base44.entities from Chat.jsx).
 * @returns {Promise<object>}
 *   An enriched copy of basePayload with goals_referenced, follow_up_tasks,
 *   and working_hypotheses populated from entity data where available.
 *   Returns basePayload unchanged on any error.
 */

/**
 * Normalises an entity response from Goal.filter or CaseFormulation.list
 * into a plain array, accepting all four real Base44 response shapes:
 *
 *   - bare array          → returned as-is
 *   - { results: [...] }  → returns .results
 *   - { data: [...] }     → returns .data
 *   - { data: { results: [...] } } → returns .data.results
 *
 * Returns an empty array for any other shape. Never throws.
 *
 * @param {unknown} response
 * @returns {unknown[]}
 */
function _extractEntityArray(response) {
  try {
    if (Array.isArray(response)) return response;
    if (response !== null && typeof response === 'object') {
      const d = response.data;
      if (Array.isArray(d)) return d;
      if (d !== null && typeof d === 'object') {
        if (Array.isArray(d.results)) return d.results;
      }
      if (Array.isArray(response.results)) return response.results;
    }
  } catch {
    // Never throw.
  }
  return [];
}

export async function enrichConversationMemoryPayload(basePayload, entities) {
  try {
    if (!basePayload || typeof basePayload !== 'object') return basePayload;
    if (!entities || typeof entities !== 'object') return basePayload;

    // Start with a shallow copy so the base record is never mutated.
    const enriched = { ...basePayload };

    // s2debug tracking (no private content emitted).
    let _s2GoalResult = 'empty';
    let _s2GoalCount = 0;
    let _s2GoalResponseShape = 'empty';
    let _s2FormulationResult = 'empty';

    // ── 1. Goal enrichment ─────────────────────────────────────────────────────
    // Read active goals (bounded to ENRICHMENT_MAX_GOALS).
    // goals_referenced: goal IDs (existing schema field for goal identity).
    // follow_up_tasks: goal titles as actionable continuity tasks.
    try {
      if (entities.Goal && typeof entities.Goal.filter === 'function') {
        const goalResponse = await entities.Goal.filter(
          { status: 'active' },
          '-created_date',
          ENRICHMENT_MAX_GOALS,
        );
        _s2GoalResponseShape = classifyEntityListResponseShape(goalResponse);
        const activeGoals = _extractEntityArray(goalResponse);
        _s2GoalResult = activeGoals.length > 0 ? 'success' : 'empty';
        _s2GoalCount = activeGoals.length;
        if (activeGoals.length > 0) {
          const goalIds = [];
          const followUpTasks = [];
          for (const goal of activeGoals) {
            if (!goal || typeof goal !== 'object') continue;
            const id = typeof goal.id === 'string' ? goal.id.trim() : '';
            const title =
              typeof goal.title === 'string'
                ? goal.title.trim().slice(0, ENRICHMENT_GOAL_TITLE_MAX_CHARS)
                : '';
            if (id) goalIds.push(id);
            // Only add a title that is non-empty and does not look like raw transcript.
            if (title && !isRawTranscriptContent(title)) followUpTasks.push(title);
          }
          if (goalIds.length > 0) enriched.goals_referenced = goalIds;
          if (followUpTasks.length > 0) enriched.follow_up_tasks = followUpTasks;
        }
      }
    } catch {
      _s2GoalResult = 'error';
      _s2GoalResponseShape = 'error';
      // Goal read failed — leave goals_referenced and follow_up_tasks as-is.
    }

    // ── 2. CaseFormulation enrichment ─────────────────────────────────────────
    // Read most recent formulation (bounded to 1 record).
    // working_hypotheses: core_belief field (the core clinical hypothesis).
    try {
      if (
        entities.CaseFormulation &&
        typeof entities.CaseFormulation.list === 'function'
      ) {
        const formulationResponse = await entities.CaseFormulation.list('-created_date', 1);
        const formulations = _extractEntityArray(formulationResponse);
        _s2FormulationResult = formulations.length > 0 ? 'success' : 'empty';
        if (formulations.length > 0) {
          const cf = formulations[0];
          if (cf && typeof cf === 'object') {
            const coreBelief =
              typeof cf.core_belief === 'string'
                ? cf.core_belief.trim().slice(0, ENRICHMENT_FORMULATION_FIELD_MAX_CHARS)
                : '';
            if (coreBelief) {
              enriched.working_hypotheses = [coreBelief];
            }
          }
        }
      }
    } catch {
      _s2FormulationResult = 'error';
      // Formulation read failed — leave working_hypotheses as-is.
    }

    if (_isS2DebugEnabled()) {
      try {
        console.group('[_s2debug] client enrichment');
        console.log('client_goal_read_result       :', _s2GoalResult);
        console.log('client_goal_count             :', _s2GoalCount);
        console.log('client_goal_response_shape    :', _s2GoalResponseShape);
        console.log('client_formulation_read_result:', _s2FormulationResult);
        console.groupEnd();
      } catch {
        // Diagnostic emission must never propagate.
      }
    }

    return enriched;
  } catch {
    // Any unexpected error: return the base payload unchanged (fail-closed).
    return basePayload;
  }
}

/**
 * Maximum character length for a conversation name/intent used as session_summary.
 * Matches the existing MAX_METADATA_FIELD_LENGTH used by deriveSessionSummaryPayload.
 *
 * @type {number}
 */
const CONVERSATION_META_MAX_CHARS = 300;

/**
 * Pattern that matches a generic auto-generated conversation name ("Session N")
 * that carries no useful context for the continuity block.
 * Matching names are excluded from session_summary to avoid writing empty context.
 *
 * @type {RegExp}
 */
const GENERIC_SESSION_NAME_PATTERN = /^Session\s+\d+$/i;

/**
 * Derives a minimal therapist-memory payload from Chat.jsx free-form
 * conversation metadata.
 *
 * Phase 4 — Chat.jsx Conversation Memory Write.
 *
 * This is the lightweight counterpart of deriveSessionSummaryPayload for the
 * Chat.jsx free-form therapy interface. It cannot extract clinical data from
 * message content (privacy rule: no transcript storage), so all clinical arrays
 * are empty. The session_summary is populated only when the conversation carries
 * a meaningful intent or a non-generic name.
 *
 * PRIVACY CONTRACT
 * No message content is read or stored. The record is derived solely from
 * conversation identity metadata: conversationId and conversationMeta.
 * All fields pass through sanitizeSummaryRecord before any downstream use.
 *
 * FAIL-SAFE
 * Returns buildSafeStubRecord('', '') on any unexpected error.
 *
 * @param {string} conversationId - The Base44 conversation ID.
 * @param {object} [conversationMeta={}]
 *   The conversation's metadata object (e.g. conversation.metadata from the
 *   Base44 agents API). Expected optional fields:
 *     - intent {string} — The intent parameter used when the conversation was
 *       created (e.g. 'anxiety management', 'sleep issues').
 *     - name  {string} — The display name of the conversation
 *       (e.g. 'Anxiety session', 'Session 3').
 * @returns {object}
 *   A sanitized summary record matching the Phase 1 therapist-memory schema.
 *   Returns buildSafeStubRecord() if the conversationId argument is invalid.
 */
export function deriveConversationMemoryPayload(conversationId, conversationMeta = {}) {
  try {
    const sessionId = typeof conversationId === 'string' ? conversationId.trim() : '';
    const sessionDate = new Date().toISOString();

    // ── session_summary ─────────────────────────────────────────────────────
    // Derived from conversation identity metadata only — no message content.
    // Prefer intent (explicit topic) over name (may be generic "Session N").
    const intent =
      typeof conversationMeta?.intent === 'string'
        ? conversationMeta.intent.trim().slice(0, CONVERSATION_META_MAX_CHARS)
        : '';

    const name =
      typeof conversationMeta?.name === 'string'
        ? conversationMeta.name.trim().slice(0, CONVERSATION_META_MAX_CHARS)
        : '';

    let sessionSummary = '';
    if (intent) {
      sessionSummary = `Session focused on: ${intent}.`;
    } else if (name && !GENERIC_SESSION_NAME_PATTERN.test(name)) {
      // Use name only when it's meaningful (not the auto-generated "Session N").
      sessionSummary = `Session: ${name}.`;
    }
    // If neither intent nor a meaningful name is present, session_summary stays ''.
    // An empty summary is safe — the record still establishes a session timestamp
    // and conversationId in CompanionMemory, providing minimal continuity signal.

    // ── Build raw payload (all clinical arrays empty — no content extraction) ─
    const rawPayload = {
      session_id: sessionId,
      session_date: sessionDate,
      session_summary: sessionSummary,
      core_patterns: [],
      triggers: [],
      automatic_thoughts: [],
      emotions: [],
      urges: [],
      actions: [],
      consequences: [],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
      safety_plan_notes: '',
      follow_up_tasks: [],
      goals_referenced: [],
      last_summarized_date: sessionDate,
    };

    // Sanitize through the Phase 2 contract (validates all fields, enforces
    // lengths, blocks transcript dumps, enforces version marker).
    const { record } = sanitizeSummaryRecord(rawPayload);
    return record;
  } catch {
    // Fail-safe: return a minimal valid stub on any unexpected error.
    return buildSafeStubRecord('', '');
  }
}

/**
 * Triggers a promise-returning memory write for a Chat.jsx free-form therapy
 * conversation end.
 *
 * Phase 4 — Chat.jsx Conversation Memory Write.
 *
 * Called from Chat.jsx's requestSummary function — the explicit end-of-chat
 * boundary where a user signals they want a session summary. This is a
 * natural, deliberate session-completion surface that fires at most once per
 * conversation (since users typically request summaries once per session).
 *
 * The call is:
 *   - Gated: checks isSummarizationEnabled() first; returns immediately if false.
 *   - Bounded by callers: switch paths may wait briefly before continuity read.
 *   - Safe: all errors are caught; the summary request UX is unaffected.
 *   - Inert in default mode: when flags are off, this function is a no-op.
 *   - Privacy-preserving: bounded messages are transient input and never stored.
 *
 * WHY THIS MATTERS (Phase 4 gap closure)
 * Chat.jsx's V7 session-start path (buildV7SessionStartContentAsync) reads
 * CompanionMemory for cross-session continuity, but Chat.jsx conversations
 * previously had no path to write to CompanionMemory. This function closes
 * that gap: once a user requests a session summary, a minimal memory record is
 * written, giving V7 something to read in future sessions.
 *
 * Phase 3 Deep Personalization extends this write path:
 * When `entities` is provided AND isContinuityEnrichmentEnabled() is true,
 * the base payload is enriched with Goal + CaseFormulation data before persistence.
 * The enrichment is fail-closed: any read failure leaves the base payload intact.
 *
 * @param {string} conversationId - The Base44 conversation ID.
 * @param {object} [conversationMeta={}] - The conversation's metadata object.
 * @param {string} [invoker=CONVERSATION_END_SUMMARY_INVOKER] - Diagnostic label.
 * @param {object} [entities=null]
 *   Optional Base44 entity client map (base44.entities from Chat.jsx).
 *   When provided and isContinuityEnrichmentEnabled() is true, the payload is
 *   enriched with Goal and CaseFormulation data before persistence.
 */
export function triggerConversationEndSummarization(
  conversationId,
  conversationMeta = {},
  invoker = CONVERSATION_END_SUMMARY_INVOKER,
  entities = null,
  runtimeSnapshot = null,
  messages = [],
) {
  // Gate check: runtime snapshot authority overrides build-time flag when the
  // snapshot is available and THERAPIST_RUNTIME_APPLY_ENABLED is true.
  // Callers that do not supply a snapshot receive the exact legacy behavior.
  if (!resolveRuntimeSummarizationFlag(runtimeSnapshot)) {
    return;
  }

  // Return the promise so switch callers can wait for a bounded period before
  // starting the next session's continuity read.
  return (async () => {
    try {
      let memoryPayload = deriveConversationMemoryPayload(conversationId, conversationMeta);

      // Phase 3 enrichment: Goal + CaseFormulation data (fail-closed).
      // Only runs when both summarization AND continuity flags are active.
      const _continuityEnabled = entities
        ? resolveRuntimeContinuityEnrichmentFlag(runtimeSnapshot)
        : false;
      if (entities && _continuityEnabled) {
        try {
          memoryPayload = await enrichConversationMemoryPayload(memoryPayload, entities);
        } catch {
          // Enrichment failure: continue with base payload.
        }
      }
      if (_isS2DebugEnabled()) {
        try {
          console.group('[_s2debug] memory-write pipeline');
          console.log('continuity_runtime_enabled    :', _continuityEnabled);
          console.groupEnd();
        } catch {
          // Diagnostic emission must never propagate.
        }
      }

      // Sanitize the (possibly enriched) payload before persistence.
      const { record } = sanitizeSummaryRecord(memoryPayload);

      // Lazy import to avoid any bundler/module cost in default-off mode
      const { base44 } = await import('../api/base44Client.js');

      const summaryInput = buildConversationSummaryInput(messages);
      const summaryRaw = await base44.functions.invoke('generateSessionSummary', {
        ...record,
        ...(summaryInput.turns.length > 0 ? { summary_input: summaryInput } : {}),
      });
      const summaryResult = unwrapBase44FunctionData(summaryRaw);

      if (!summaryResult || summaryResult.success !== true) return false;

      // Wave 3B: only recompute and upsert the LTS snapshot when the summary
      // write did NOT explicitly fail (success !== false).  If the invoke threw,
      // the outer catch handles it.  Fire-and-forget — failure never affects
      // the Chat.jsx requestSummary path.
      if (
        resolveRuntimeLongitudinalFlag(runtimeSnapshot) &&
        summaryResult.success === true
      ) {
        _fireLTSWrite(base44, invoker);
      }
      return true;
    } catch (error) {
      // Summarization failure must never propagate to the caller.
      // Chat.jsx requestSummary UX is independent of this function.
      console.warn(
        '[Phase 3] Conversation-end summarization failed (non-fatal) [' + invoker + ']:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  })();
}

// ─── Wave 3B — Longitudinal Therapeutic State (LTS) write path ───────────────

/**
 * Maximum number of therapist session records fetched for LTS recomputation.
 *
 * The LTS builder is already bounded internally; this cap limits the network
 * payload from retrieveTherapistMemory to a predictable size.
 *
 * @type {number}
 */
export const LTS_SESSION_RECORDS_FETCH_CAP = 20;

/**
 * Diagnostic label for the LTS write trigger invoker.
 *
 * @type {string}
 */
export const LTS_WRITE_INVOKER = 'lts_write_after_session_memory';

const _LTS_WRITE_DIAGNOSTIC_RESULTS = Object.freeze({
  CREATED: 'created',
  UPDATED: 'updated',
  WRITE_ERROR: 'write_error',
});

function _isS2DebugEnabled() {
  try {
    if (typeof window === 'undefined') return false;
    const search = window.location?.search ?? '';
    if (!search) return false;
    const params = new URLSearchParams(search);
    return params.get('_s2debug') === 'true';
  } catch {
    return false;
  }
}

function _emitLTSWriteDiagnosticIfEnabled(writeResult, ltsSnapshot, ltsValid) {
  try {
    if (!_isS2DebugEnabled()) return;
    const valid =
      typeof ltsValid === 'boolean'
        ? ltsValid
        : isLTSValidForDiagnostics(ltsSnapshot);
    const sessionCount =
      ltsSnapshot && typeof ltsSnapshot.session_count === 'number'
        ? ltsSnapshot.session_count
        : 0;
    const trajectory =
      ltsSnapshot && typeof ltsSnapshot.trajectory === 'string'
        ? ltsSnapshot.trajectory
        : '';

    console.group('[Wave 3B] LTS write diagnostic');
    console.log('write_result             :', writeResult);
    console.log('lts_valid                :', valid);
    console.log('lts_session_count        :', sessionCount);
    console.log('lts_trajectory           :', trajectory);
    console.groupEnd();
  } catch {
    // Diagnostic emission must never propagate.
  }
}

/**
 * Bounded enum for LTS write-result diagnostics.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const LTS_WRITE_RESULTS = Object.freeze({
  created: 'created',
  updated: 'updated',
  write_error: 'write_error',
});

/**
 * Returns true when an LTS record is valid for Wave 3B/3C diagnostics.
 * Canonical contract:
 *   - isLTSRecord(record) is true
 *   - session_count >= LTS_MIN_SESSIONS_FOR_SIGNALS
 *   - trajectory is not weak ('unknown' / 'insufficient_data')
 *
 * @param {unknown} ltsRecord
 * @returns {boolean}
 */
export function isLTSValidForDiagnostics(ltsRecord) {
  if (!isLTSRecord(ltsRecord)) return false;
  const trajectory = ltsRecord.trajectory;
  if (trajectory === LTS_TRAJECTORIES.UNKNOWN) return false;
  if (trajectory === LTS_TRAJECTORIES.INSUFFICIENT_DATA) return false;
  const sessionCount =
    typeof ltsRecord.session_count === 'number' ? ltsRecord.session_count : 0;
  if (sessionCount < LTS_MIN_SESSIONS_FOR_SIGNALS) return false;
  return true;
}

/**
 * Classifies the writeLTSSnapshot invoke response into the bounded write-result
 * contract used by diagnostics.
 *
 * @param {unknown} writeResult
 * @returns {'created'|'updated'|'write_error'}
 */
export function classifyLTSWriteResult(writeResult) {
  if (
    writeResult &&
    typeof writeResult === 'object' &&
    writeResult.success === true &&
    writeResult.upserted === 'created'
  ) {
    return LTS_WRITE_RESULTS.created;
  }
  if (
    writeResult &&
    typeof writeResult === 'object' &&
    writeResult.success === true &&
    writeResult.upserted === 'updated'
  ) {
    return LTS_WRITE_RESULTS.updated;
  }
  return LTS_WRITE_RESULTS.write_error;
}

/**
 * Invokes writeLTSSnapshot and returns bounded write-result diagnostics.
 * Never throws; failure is classified as write_error.
 *
 * @param {object} base44
 * @param {object} ltsSnapshot
 * @returns {Promise<{ lts_valid: boolean, write_result: 'created'|'updated'|'write_error' }>}
 */
export async function invokeLTSSnapshotWriteWithDiagnostic(base44, ltsSnapshot) {
  try {
    const rawResult = await base44.functions.invoke('writeLTSSnapshot', ltsSnapshot);
    const writeResult = unwrapBase44FunctionData(rawResult);
    return Object.freeze({
      lts_valid: isLTSValidForDiagnostics(ltsSnapshot),
      write_result: classifyLTSWriteResult(writeResult),
    });
  } catch {
    return Object.freeze({
      lts_valid: isLTSValidForDiagnostics(ltsSnapshot),
      write_result: LTS_WRITE_RESULTS.write_error,
    });
  }
}

/**
 * Returns true if the Wave 3B LTS write path is active.
 *
 * Requires both:
 *   - THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (session memory write gate)
 *   - THERAPIST_UPGRADE_LONGITUDINAL_ENABLED  (LTS write gate)
 *
 * Both default to false — the LTS write path is completely inert unless both
 * are on.
 *
 * @returns {boolean}
 */
export function isLongitudinalEnabled() {
  return (
    isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED') &&
    isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')
  );
}

/**
 * Resolves whether the Wave 3B LTS write path is enabled, optionally
 * honouring a runtime flag snapshot.
 *
 * Runtime authority applies when the snapshot is accepted
 * (transport_status=available, received=true, APPLY=true).
 * Under accepted runtime authority LTS write is TRUE only when ALL of:
 *   THERAPIST_RUNTIME_APPLY_ENABLED, THERAPIST_UPGRADE_ENABLED,
 *   THERAPIST_UPGRADE_SUMMARIZATION_ENABLED, THERAPIST_UPGRADE_LONGITUDINAL_ENABLED
 * are true in the snapshot.
 *
 * When runtime authority is unavailable or APPLY is not true, the function
 * preserves the exact legacy isLongitudinalEnabled() result.
 * The fire-and-forget UX is not changed by this gate.
 *
 * @param {object|null|undefined} snapshot - Runtime flag snapshot (may be absent).
 * @returns {boolean}
 */
export function resolveRuntimeLongitudinalFlag(snapshot) {
  if (
    snapshot &&
    snapshot.transport_status === 'available' &&
    snapshot.received === true &&
    snapshot.flags &&
    snapshot.flags['THERAPIST_RUNTIME_APPLY_ENABLED'] === true
  ) {
    return (
      snapshot.flags['THERAPIST_UPGRADE_ENABLED'] === true &&
      snapshot.flags['THERAPIST_UPGRADE_SUMMARIZATION_ENABLED'] === true &&
      snapshot.flags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'] === true
    );
  }
  return isLongitudinalEnabled();
}

/**
 * Fires and forgets the LTS recompute-and-upsert step.
 *
 * This is the Wave 3B inner LTS write helper.  It must ONLY be called after
 * a successful therapist session memory write (i.e. after a successful
 * `generateSessionSummary` invocation resolves without throwing).
 *
 * Steps:
 *   1. Invokes retrieveTherapistMemory to fetch the bounded set of prior
 *      session records (capped at LTS_SESSION_RECORDS_FETCH_CAP).
 *   2. Filters returned records to therapist session records only.
 *   3. Calls buildLongitudinalState() to recompute the LTS.
 *   4. Invokes writeLTSSnapshot to upsert the new LTS snapshot.
 *
 * FAIL-CLOSED CONTRACT
 * - Any error at any step is caught and logged as a non-fatal warning.
 * - The caller's session memory write result is NEVER affected.
 * - No raw message content is read or written.
 * - No cross-user entity access: retrieval is per-user via auth.
 *
 * GATE
 * - isLongitudinalEnabled() must be true before calling this function.
 * - Callers must check the gate before invoking.
 *
 * @param {object} base44 - The Base44 SDK client instance.
 * @param {string} [invoker='lts_write_after_session_memory'] - Diagnostic label.
 * @private
 */
function _fireLTSWrite(base44, invoker = LTS_WRITE_INVOKER) {
  // Runtime callers remain fire-and-forget; returning the task makes completion
  // observable to deterministic tests and diagnostics.
  return (async () => {
    let ltsSnapshot = null;
    try {
      // 1. Fetch bounded session records from CompanionMemory.
      const memRaw = await base44.functions.invoke('retrieveTherapistMemory', {});
      const memResult = unwrapBase44FunctionData(memRaw);

      // 2. Extract and filter to therapist session records only.
      //    Cap to LTS_SESSION_RECORDS_FETCH_CAP before passing to the builder.
      const rawMemories = Array.isArray(memResult?.memories) ? memResult.memories : [];
      const sessionRecords = rawMemories
        .filter((r) => isTherapistMemoryRecord(r))
        .slice(0, LTS_SESSION_RECORDS_FETCH_CAP);

      // retrieveTherapistMemory returns newest-first; buildLongitudinalState
      // assumes oldest-first.  Reverse into a new array — never mutate the
      // API response array.
      const oldestFirstSessionRecords = sessionRecords.slice().reverse();

      // 3. Build the LTS (pure, deterministic, no side effects).
      //    Lazy import — only loads if the flag path is actually reached.
      const { buildLongitudinalState } = await import('./longitudinalStateBuilder.js');
      ltsSnapshot = buildLongitudinalState(oldestFirstSessionRecords, [], null);

      // 4. Upsert the LTS snapshot via the writeLTSSnapshot backend function.
      //    Failure remains non-blocking (diagnostic classification is bounded).
      const diagResult = await invokeLTSSnapshotWriteWithDiagnostic(base44, ltsSnapshot);
      _emitLTSWriteDiagnosticIfEnabled(
        diagResult.write_result,
        ltsSnapshot,
        diagResult.lts_valid,
      );
      if (_isS2DebugEnabled()) {
        try {
          const wasWrapped =
            memRaw !== null &&
            typeof memRaw === 'object' &&
            memRaw.data !== null &&
            typeof memRaw.data === 'object';
          console.group('[_s2debug] LTS pipeline');
          console.log('lts_memory_response_wrapped   :', wasWrapped);
          console.log('lts_retrieved_memory_count    :', rawMemories.length);
          console.log('lts_therapist_session_count   :', sessionRecords.length);
          console.log('lts_input_order_oldest_first  :', true);
          console.log('lts_write_result              :', diagResult.write_result);
          console.groupEnd();
        } catch {
          // Diagnostic emission must never propagate.
        }
      }
    } catch (error) {
      _emitLTSWriteDiagnosticIfEnabled(
        _LTS_WRITE_DIAGNOSTIC_RESULTS.WRITE_ERROR,
        ltsSnapshot,
        isLTSValidForDiagnostics(ltsSnapshot),
      );
      // LTS write failure must never propagate to or affect the session memory write.
      console.warn(
        '[Wave 3B] LTS snapshot write failed (non-fatal) [' + invoker + ']:',
        error instanceof Error ? error.message : String(error),
      );
    }
  })();
}
