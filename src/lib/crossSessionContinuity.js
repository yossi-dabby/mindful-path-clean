/**
 * @file src/lib/crossSessionContinuity.js
 *
 * Phase 3 Deep Personalization — Cross-Session Continuity Layer
 *
 * Reads structured therapist memory records (written by writeTherapistMemory)
 * from the CompanionMemory entity and builds a concise cross-session continuity
 * context block for injection into the session-start payload.
 *
 * PURPOSE
 * -------
 * The continuity block surfaces the longitudinal clinical picture across
 * sessions: recurring patterns, open follow-up tasks, prior interventions,
 * and any active risk flags.  This allows the therapist agent to greet the
 * user with session-to-session awareness rather than as a blank-slate chatbot.
 *
 * PRIVACY CONTRACT
 * ----------------
 * - Only structured summary fields are read — never raw transcripts.
 * - Records are filtered to therapist_session memory_type and the internal
 *   therapist_memory_version marker (isTherapistMemoryRecord).
 * - CompanionMemory is a private per-user entity and is never indexed in
 *   shared retrieval pipelines (ai-agent-access-policy.md).
 * - The output block is injected only into the per-user session-start payload.
 *   It is never stored, logged, or returned to the client directly.
 *
 * FAIL-CLOSED CONTRACT
 * --------------------
 * All exported functions return empty string (or empty arrays) on any error.
 * Session start is never blocked by a continuity read failure.
 *
 * ACTIVATION
 * ----------
 * This module is inert when imported.  Its functions are only called from
 * buildV7SessionStartContentAsync() in workflowContextInjector.js, which is
 * itself only called when wiring.continuity_layer_enabled === true (V7 path).
 * Both THERAPIST_UPGRADE_ENABLED and THERAPIST_UPGRADE_CONTINUITY_ENABLED must
 * be true.  Both flags default to false.
 *
 * This file contains no Deno APIs and no runtime side effects.  It is safe to
 * import in Vitest unit tests.
 *
 * See problem statement — Phase 3 Deep Personalization, Continuity, Formulation Quality.
 */

import {
  isTherapistMemoryRecord,
  THERAPIST_MEMORY_TYPE,
} from './therapistMemoryModel.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum number of prior therapist memory records read for the continuity block.
 * Bounded to prevent over-loading the context window with historical data.
 * @type {number}
 */
export const CONTINUITY_MAX_PRIOR_SESSIONS = 3;

/**
 * Maximum characters injected per continuity string field.
 * @type {number}
 */
export const CONTINUITY_INJECT_MAX_CHARS = 120;

// Match the sanitized backend summary bound; 200 characters can drop the outcome.
export const CONTINUITY_RECENT_SUMMARY_MAX_CHARS = 2000;

/**
 * Maximum items injected per continuity array field.
 * @type {number}
 */
export const CONTINUITY_MAX_ITEMS_PER_FIELD = 4;

/**
 * Minimum character length of session_summary to count toward the richness score.
 * Records whose session_summary is shorter than this are considered to have no
 * meaningful summary for scoring purposes.
 * @type {number}
 */
export const CONTINUITY_MIN_SESSION_SUMMARY_LENGTH = 10;

/**
 * Minimum richness score for a therapist memory record to be considered "useful"
 * for continuity injection.  Records scoring below this threshold are treated as
 * thin/generic and are only included as a fallback when no useful records exist.
 *
 * Score breakdown (see scoreTherapistMemoryRecord):
 *   risk_flags present       → +4 (always clinically relevant)
 *   follow_up_tasks present  → +3 (open action items = high continuity value)
 *   core_patterns present    → +3 (recurring patterns = high continuity value)
 *   working_hypotheses       → +2
 *   interventions_used       → +2
 *   meaningful summary       → +2 (≥ CONTINUITY_MIN_SESSION_SUMMARY_LENGTH chars)
 *
 * A threshold of 1 suppresses only completely empty records (no clinical
 * content whatsoever).  Any record with at least one non-trivial field passes.
 * @type {number}
 */
export const CONTINUITY_MIN_USEFUL_SCORE = 1;

// ─── Helper utilities ─────────────────────────────────────────────────────────

/**
 * Parses a therapist memory record from a raw CompanionMemory entity record.
 *
 * The content field may be a JSON string (Base44 at-rest) or an already-parsed
 * object (Base44 SDK runtime delivery).  Handles both forms.
 *
 * @param {object} raw - A CompanionMemory entity record.
 * @returns {object|null} Parsed therapist memory record, or null if invalid.
 */
function parseTherapistMemoryFromCompanionRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.memory_type !== THERAPIST_MEMORY_TYPE) return null;

  let parsed = null;
  try {
    if (raw.content && typeof raw.content === 'string') {
      parsed = JSON.parse(raw.content);
    } else if (raw.content && typeof raw.content === 'object') {
      parsed = raw.content;
    }
  } catch {
    return null;
  }

  if (!isTherapistMemoryRecord(parsed)) return null;
  return parsed;
}

function countValidTherapistMemoryRecords(rawRecords) {
  if (!Array.isArray(rawRecords)) return 0;
  let count = 0;
  for (const raw of rawRecords) {
    if (parseTherapistMemoryFromCompanionRecord(raw)) count += 1;
  }
  return count;
}

/**
 * Deduplicates and trims an array of strings.
 * Returns at most CONTINUITY_MAX_ITEMS_PER_FIELD unique non-empty items.
 *
 * @param {string[]} items
 * @returns {string[]}
 */
function dedupeAndTrim(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const t = item.trim().slice(0, CONTINUITY_INJECT_MAX_CHARS);
    if (t && !seen.has(t)) {
      seen.add(t);
      result.push(t);
      if (result.length >= CONTINUITY_MAX_ITEMS_PER_FIELD) break;
    }
  }
  return result;
}

// ─── Record richness scoring ──────────────────────────────────────────────────

/**
 * Returns a numeric richness score for a parsed therapist memory record.
 *
 * Higher score = more clinically useful for continuity injection.
 * Score reflects the presence of structured clinical content across key fields.
 * Records with a score below CONTINUITY_MIN_USEFUL_SCORE are considered
 * thin/generic and are only included when no richer records are available.
 *
 * Scoring rules (additive):
 *   +4  risk_flags is non-empty        (safety-relevant; always high priority)
 *   +3  follow_up_tasks is non-empty   (open action items = strong continuity signal)
 *   +3  core_patterns is non-empty     (recurring patterns = strong continuity signal)
 *   +2  working_hypotheses is non-empty
 *   +2  interventions_used is non-empty
 *   +2  session_summary length ≥ CONTINUITY_MIN_SESSION_SUMMARY_LENGTH chars
 *
 * Returns 0 for null/invalid input (fail-safe).
 *
 * @param {object|null} record - A parsed therapist memory record.
 * @returns {number} Richness score ≥ 0.
 */
export function scoreTherapistMemoryRecord(record) {
  if (!record || typeof record !== 'object') return 0;
  let score = 0;
  if (Array.isArray(record.risk_flags) && record.risk_flags.length > 0) score += 4;
  if (Array.isArray(record.follow_up_tasks) && record.follow_up_tasks.length > 0) score += 3;
  if (Array.isArray(record.core_patterns) && record.core_patterns.length > 0) score += 3;
  if (Array.isArray(record.working_hypotheses) && record.working_hypotheses.length > 0) score += 2;
  if (Array.isArray(record.interventions_used) && record.interventions_used.length > 0) score += 2;
  if (
    typeof record.session_summary === 'string' &&
    record.session_summary.trim().length >= CONTINUITY_MIN_SESSION_SUMMARY_LENGTH
  ) {
    score += 2;
  }
  return score;
}

// ─── Primary export ───────────────────────────────────────────────────────────

/**
 * Reads the last N therapist memory records and builds a structured
 * cross-session continuity summary.
 *
 * Returns a plain object with deduplicated longitudinal fields, or null when:
 *   - entities is absent or malformed
 *   - No therapist memory records exist
 *   - Any read error occurs (fail-closed)
 *
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<{
 *   sessionCount: number,
 *   recurringPatterns: string[],
 *   openFollowUpTasks: string[],
 *   interventionsUsed: string[],
 *   riskFlags: string[],
 *   recentSummary: string,
 * }|null>}
 */
/**
 * Parses and ranks therapist memory records from an already-fetched raw array.
 *
 * This is the shared parse/ranking pass used by both readCrossSessionContinuity
 * and buildCrossSessionContinuityBlockWithDiagnostic.  Accepting pre-fetched raw
 * records allows the caller to perform exactly ONE CompanionMemory.list call and
 * reuse the result for both the strategy engine and the block formatter.
 *
 * @private
 * @param {unknown[]} rawRecords - Raw CompanionMemory records (already fetched)
 * @returns {{
 *   sessionCount: number,
 *   recurringPatterns: string[],
 *   openFollowUpTasks: string[],
 *   interventionsUsed: string[],
 *   riskFlags: string[],
 *   recentSummary: string,
 * }|null} Structured continuity data, or null when no usable records are found.
 */
function _parseContinuityFromRawRecords(rawRecords) {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) return null;

  // Parse all valid therapist memory records from the over-fetched list.
  // Unlike the previous approach (break at CONTINUITY_MAX_PRIOR_SESSIONS),
  // we collect all valid records first so we can score and rank them.
  const allValidRecords = [];
  for (const raw of rawRecords) {
    const parsed = parseTherapistMemoryFromCompanionRecord(raw);
    if (parsed) {
      allValidRecords.push(parsed);
    }
  }

  if (allValidRecords.length === 0) return null;

  // Score each record and separate into useful vs. weak in a single pass.
  // Records are already in recency order (most-recent-first from CompanionMemory.list).
  const { usefulScored, weakScored } = allValidRecords.reduce(
    (acc, record, index) => {
      const score = scoreTherapistMemoryRecord(record);
      const entry = { record, score, index };
      if (score >= CONTINUITY_MIN_USEFUL_SCORE) {
        acc.usefulScored.push(entry);
      } else {
        acc.weakScored.push(entry);
      }
      return acc;
    },
    { usefulScored: [], weakScored: [] },
  );

  // Stage 6 fix — guaranteed recency slot with safety precedence:
  // Always include the most-recent useful session (usefulScored[0], recency index
  // lowest = most recent) so that a streak of high-scoring older sessions cannot
  // displace the current-session context.  Sort only the remaining useful records
  // with risk-bearing records first (safety precedence), then by richness score.
  // This prevents the recency slot from causing historical risk signals to disappear.
  const mostRecentUseful = usefulScored.length > 0 ? usefulScored[0] : null;
  const olderUseful = usefulScored.length > 1 ? usefulScored.slice(1) : [];
  olderUseful.sort((a, b) => {
    const aRisk = Array.isArray(a.record.risk_flags) && a.record.risk_flags.length > 0 ? 1 : 0;
    const bRisk = Array.isArray(b.record.risk_flags) && b.record.risk_flags.length > 0 ? 1 : 0;
    if (bRisk !== aRisk) return bRisk - aRisk; // risk-bearing records always win a slot first
    return b.score - a.score || a.index - b.index;
  });

  const selectedScored = mostRecentUseful ? [mostRecentUseful] : [];
  const richSlots = CONTINUITY_MAX_PRIOR_SESSIONS - selectedScored.length;
  selectedScored.push(...olderUseful.slice(0, richSlots));

  // Supplement with weak records (in recency order) when useful records are scarce.
  if (selectedScored.length < CONTINUITY_MAX_PRIOR_SESSIONS) {
    const weakNeeded = CONTINUITY_MAX_PRIOR_SESSIONS - selectedScored.length;
    selectedScored.push(...weakScored.slice(0, weakNeeded));
  }

  // Re-sort selected set into recency order (most-recent first) for aggregation.
  // This ensures the recentSummary always comes from the most-recent session.
  selectedScored.sort((a, b) => a.index - b.index);
  const memoryRecords = selectedScored.map(r => r.record);

  if (memoryRecords.length === 0) return null;

  // Aggregate fields across sessions (most-recent-first)
  const allPatterns = memoryRecords.flatMap(r => r.core_patterns ?? []);
  const allFollowUps = memoryRecords.flatMap(r => r.follow_up_tasks ?? []);
  const allInterventions = memoryRecords.flatMap(r => r.interventions_used ?? []);
  const allRiskFlags = memoryRecords.flatMap(r => r.risk_flags ?? []);

  // Use the most recent session's summary as the anchor
  const recentSummary = (memoryRecords[0]?.session_summary ?? '').trim().slice(0, CONTINUITY_RECENT_SUMMARY_MAX_CHARS);

  return {
    sessionCount: memoryRecords.length,
    recurringPatterns: dedupeAndTrim(allPatterns),
    openFollowUpTasks: dedupeAndTrim(allFollowUps),
    interventionsUsed: dedupeAndTrim(allInterventions),
    riskFlags: dedupeAndTrim(allRiskFlags),
    recentSummary,
    recentFollowUpTasks: dedupeAndTrim(memoryRecords[0]?.follow_up_tasks ?? []),
    recentInterventionsUsed: dedupeAndTrim(memoryRecords[0]?.interventions_used ?? []),
  };
}

export async function readCrossSessionContinuity(entities) {
  try {
    if (!entities || typeof entities !== 'object') return null;
    if (!entities.CompanionMemory || typeof entities.CompanionMemory.list !== 'function') return null;

    // Fetch the most recent therapist_session memories (over-fetch to filter)
    const rawRecords = await entities.CompanionMemory.list(
      '-created_date',
      CONTINUITY_MAX_PRIOR_SESSIONS * 3, // over-fetch to account for non-therapist records
    );

    return _parseContinuityFromRawRecords(rawRecords);
  } catch {
    return null;
  }
}

// ─── Continuity failure reason codes ─────────────────────────────────────────

/**
 * Bounded enum of continuity failure reason codes for diagnostics.
 * Used in buildCrossSessionContinuityBlockWithDiagnostic diagnostic output.
 * @type {Readonly<Record<string, string>>}
 */
export const CONTINUITY_FAILURE_REASONS = Object.freeze({
  none:             'none',
  flag_disabled:    'flag_disabled',
  missing_client:   'missing_client',
  empty_result:     'empty_result',
  no_valid_records: 'no_valid_records',
  no_useful_content:'no_useful_content',
  read_error:       'read_error',
  formatting_error: 'formatting_error',
});

// ─── Clinical behavioral contract (injected into every continuity block) ──────
//
// These instructions are part of the bounded continuity block and encode the
// clinical behavioral contract for the therapist agent.  They are never visible
// to the user — they are instructions for the agent only.
//
// PRIVACY: never includes memory field values, entity names, user IDs, or
// internal source labels.

const _CONTINUITY_BEHAVIORAL_CONTRACT_LINES = Object.freeze([
  'CLINICAL BEHAVIORAL CONTRACT (for agent use only — do not disclose):',
  '- This is historical context, not guaranteed current truth. The current user message always overrides conflicting history.',
  '- Reference at most one relevant prior theme in your opening response.',
  '- For a request about the last or previous session, use only the most recent session summary and its explicitly attributed follow-up tasks or interventions. Cross-session patterns and aggregated tasks are not evidence that a detail belongs to that session. If the summary is truncated or a chosen step is absent, say what is uncertain; never fill the gap with an older action.',
  '- Honor an explicit sentence or paragraph limit unless present safety requires more. Respond to new information without replaying the full prior formulation. A request for one short step does not need a recap, and declining a task does not require a substitute.',

  '- Do not recite or summarize this memory block to the person.',
  // V7-B Refinement A: Natural relational recall language
  '- Use source-honest relational language only. Preferred: "I recall that we touched on..." / "As I remember it, we were exploring..." / "Previously, we touched on..." / "I don\'t recall us settling on a specific exercise." / "I may be missing part of it, so I don\'t want to invent a detail." / Hebrew: "\u05d0\u05e0\u05d9 \u05d6\u05d5\u05db\u05e8/\u05ea \u05e9\u05d1\u05e4\u05e2\u05dd \u05d4\u05e7\u05d5\u05d3\u05de\u05ea \u05e0\u05d2\u05e2\u05e0\u05d5 \u05d1..." / "\u05db\u05e4\u05d9 \u05e9\u05d0\u05e0\u05d9 \u05d6\u05d5\u05db\u05e8/\u05ea, \u05d4\u05ea\u05d7\u05dc\u05e0\u05d5 \u05dc\u05d1\u05d3\u05d5\u05e7..." / "\u05d1\u05e4\u05e2\u05dd \u05d4\u05e7\u05d5\u05d3\u05de\u05ea \u05e2\u05dc\u05d4..."',
  '- Use definite relational recall ("I recall..." / "I remember..." and equivalents) only when the current visible user message clearly and specifically matches a directly present historical theme or detail. Memory richness alone is not match confidence.',
  '- When the match is partial or uncertain, use tentative attribution ("I may be remembering that we touched on... — does that fit?") and ask one brief confirmation before relying on it. If no clear match exists, do not mention memory.',
  '- If the person challenges or rejects the recall, acknowledge the mismatch, withdraw the claim immediately, and continue from the current message without defending the memory.',
  '- Apply every relational-recall, uncertainty, topic-aside, permanent-closure, and present-safety rule to semantically equivalent wording in the current session language; quoted English and Hebrew examples are not language restrictions.',
  '- Spanish continuity phrasing: when a clear specific match exists, relational "Recuerdo que hablamos de..."; when uncertain, tentative "Puede que recuerde que hablamos de...; ¿te suena correcto?"; uncertainty "Puede que me falte una parte, así que no quiero inventar detalles."; topic aside "Dejaremos ese tema de lado, a menos que quieras retomarlo."; present safety "¿Cómo te sientes ahora y te sientes a salvo en este momento?" Database-like wording such as "Tengo un registro de..." is prohibited.',
  '- French continuity phrasing: relational "Je me souviens que nous avons abordé..."; uncertainty "Il me manque peut-être une partie, donc je ne veux pas inventer de détails."; topic aside "Nous laisserons ce sujet de côté, sauf si vous choisissez d\'y revenir."; present safety "Comment vous sentez-vous maintenant, et vous sentez-vous en sécurité en ce moment ?" Database-like wording such as "J\'ai un dossier indiquant..." is prohibited.',
  '- German continuity phrasing: relational "Ich erinnere mich, dass wir ... angesprochen haben."; uncertainty "Vielleicht fehlt mir ein Teil, deshalb möchte ich kein Detail erfinden."; topic aside "Wir lassen dieses Thema beiseite, sofern Sie nicht darauf zurückkommen möchten."; present safety "Wie fühlen Sie sich gerade, und fühlen Sie sich in diesem Moment sicher?" Database-like wording such as "Ich habe einen Eintrag darüber..." is prohibited.',
  '- Italian continuity phrasing: relational "Ricordo che avevamo accennato a..."; uncertainty "Potrebbe mancarmi una parte, quindi non voglio inventare dettagli."; topic aside "Lasceremo da parte questo tema, a meno che tu non scelga di riprenderlo."; present safety "Come ti senti adesso, e ti senti al sicuro in questo momento?" Database-like wording such as "Ho una registrazione di..." is prohibited.',
  '- Portuguese continuity phrasing: relational "Lembro que falamos sobre..."; uncertainty "Talvez esteja faltando uma parte, então não quero inventar detalhes."; topic aside "Vamos deixar esse tema de lado, a menos que você queira retomá-lo."; present safety "Como você está se sentindo agora e se sente seguro neste momento?" Database-like wording such as "Tenho um registro de..." is prohibited.',
  '- Never say "I know you still..." or assert unsupported certainty about identity, values, or beliefs.',
  '- Never use database-like recall phrasing. Prohibited: "I have a record of...", "I don\'t have a record of...", "The records show...", "According to stored memory...", "The system remembers...", or Hebrew equivalents ("\u05d9\u05e9 \u05dc\u05d9 \u05e8\u05d9\u05e9\u05d5\u05dd \u05e9\u05dc...", "\u05d0\u05d9\u05df \u05dc\u05d9 \u05e8\u05d9\u05e9\u05d5\u05dd \u05e9\u05dc...", "\u05dc\u05e4\u05d9 \u05d4\u05e8\u05e9\u05d5\u05de\u05d5\u05ea...", "\u05dc\u05e4\u05d9 \u05d4\u05d6\u05d9\u05db\u05e8\u05d5\u05df \u05d4\u05e9\u05de\u05d5\u05e8 \u05d1\u05de\u05e2\u05e8\u05db\u05ea...").',
  '- If a detail is missing or uncertain, handle it naturally. Do not invent it. Supply bounded uncertainty language: "I may be missing part of it, so I don\'t want to invent a detail." / "\u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05d7\u05e1\u05e8 \u05dc\u05d9 \u05d7\u05dc\u05e7 \u05de\u05d4\u05ea\u05de\u05d5\u05e0\u05d4, \u05d5\u05dc\u05db\u05df \u05d0\u05d9\u05e0\u05d9 \u05e8\u05d5\u05e6\u05d4 \u05dc\u05d4\u05de\u05e6\u05d9\u05d0 \u05e4\u05e8\u05d8."',
  // V7-B Refinement B: Non-absolute topic closure
  '- If the person indicates that a historical theme is no longer relevant, accept immediately, stay with the current topic, and leave that theme aside unless the person later chooses to return. Non-absolute preferred: "We\'ll leave that theme aside unless you choose to return to it." / "\u05e0\u05e0\u05d9\u05d7 \u05d0\u05ea \u05d4\u05e0\u05d5\u05e9\u05d0 \u05d4\u05d6\u05d4 \u05d1\u05e6\u05d3, \u05d0\u05dc\u05d0 \u05d0\u05dd \u05ea\u05d1\u05d7\u05e8/\u05d9 \u05dc\u05d7\u05d6\u05d5\u05e8 \u05d0\u05dc\u05d9\u05d5."',
  '- Never claim permanent topic closure. Prohibited: "That theme is behind us completely.", "There is nothing to return to.", "That subject is closed permanently.", "We will never discuss it again.", "\u05d4\u05e0\u05d5\u05e9\u05d0 \u05de\u05d0\u05d7\u05d5\u05e8\u05d9\u05e0\u05d5 \u05dc\u05d7\u05dc\u05d5\u05d8\u05d9\u05df.", "\u05d0\u05d9\u05df \u05d9\u05d5\u05ea\u05e8 \u05dc\u05de\u05d4 \u05dc\u05d7\u05d6\u05d5\u05e8.", "\u05d4\u05e0\u05d5\u05e9\u05d0 \u05e0\u05e1\u05d2\u05e8 \u05dc\u05e6\u05de\u05d9\u05ea\u05d5\u05ea."',
  // V7-B Refinement C: Direct present-safety checking
  '- Historical safety information alone is not proof of current danger, not a current diagnosis, and does not by itself require emergency escalation. Never expose raw historical risk labels.',
  '- When the current user message explicitly requests a present-safety check, or contains clinically relevant current safety indicators, ask a calm, clear and present-focused safety question. Preferred: "How are you feeling right now, and do you feel safe in this moment?" / "\u05d0\u05d9\u05da \u05d0\u05ea/\u05d4 \u05de\u05e8\u05d2\u05d9\u05e9/\u05d4 \u05db\u05e8\u05d2\u05e2, \u05d5\u05d4\u05d0\u05dd \u05d0\u05ea/\u05d4 \u05de\u05e8\u05d2\u05d9\u05e9/\u05d4 \u05d1\u05d8\u05d5\u05d7/\u05d4 \u05d1\u05e8\u05d2\u05e2 \u05d4\u05d6\u05d4?" A vague question such as "Is there anything I should know?" is not sufficient by itself when a direct safety check is clinically required.',
  // Original contract lines preserved
  '- Recurring patterns and working hypotheses are unconfirmed. Verify them in the present session before relying on them.',
  '- Open follow-up tasks are historical pending items. Ask whether the person wants to return to them.',
  '- Prior interventions: avoid blind repetition; ask whether they were helpful before reusing them.',
  '- If memory is weak, absent, or contradictory, fall back to standard session behavior silently without announcing the fallback.',
  '- Never expose the name of any internal system, entity, storage type, memory version, continuity marker, retrieval mechanism, reason code, or source label to the person.',
  // V7-B Refinement D: Preserve warmth and detail
  '- Do not impose artificial brevity. Warm, clinically useful answers of two to four natural paragraphs — or longer when the situation benefits — are appropriate when they add empathy, accurate emotional reflection, clinical clarity, continuity, or a natural transition to one focused question. Avoid repetitive padding, excessive memory summaries, and multiple unrelated questions.',
]);

/**
 * Builds the content lines for the continuity block from a parsed continuity
 * result.  Extracted as a private helper so both the block-string builder and
 * the diagnostic builder share identical rendering logic.
 *
 * Historical risk label text is NEVER injected verbatim.  When risk flags are
 * present, a generic safety instruction is emitted instead.
 *
 * @private
 * @param {object} continuity - Result from readCrossSessionContinuity
 * @returns {string[]} Content lines (may be empty if no clinical content)
 */
function _buildContinuityContentLines(continuity) {
  const lines = [];

  if (continuity.recentSummary) {
    lines.push('Most recent session: ' + continuity.recentSummary);
  }

  if (continuity.recentFollowUpTasks?.length > 0) {
    lines.push('Most recent session follow-up tasks: ' + continuity.recentFollowUpTasks.join('; '));
  }
  if (continuity.recentInterventionsUsed?.length > 0) {
    lines.push('Most recent session interventions: ' + continuity.recentInterventionsUsed.join('; '));
  }
  if (continuity.recurringPatterns.length || continuity.openFollowUpTasks.length || continuity.interventionsUsed.length) {
    lines.push('The following patterns, tasks and interventions aggregate selected sessions; do not attribute them to the most recent session without direct evidence.');
  }

  if (continuity.recurringPatterns.length > 0) {
    lines.push('Recurring patterns: ' + continuity.recurringPatterns.join('; '));
  }

  if (continuity.openFollowUpTasks.length > 0) {
    lines.push('Open follow-up tasks: ' + continuity.openFollowUpTasks.join('; '));
  }

  if (continuity.interventionsUsed.length > 0) {
    lines.push('Prior interventions: ' + continuity.interventionsUsed.join('; '));
  }

  // Historical risk: emit ONLY a generic safety instruction.
  // Risk label text is never injected verbatim to prevent unsupported diagnosis
  // or inappropriate certainty about current risk from historical data.
  if (continuity.riskFlags.length > 0) {
    lines.push(
      'Historical safety context: one or more prior sessions contained safety-relevant information. ' +
      'Conduct a present-session safety check when clinically relevant. ' +
      'Do not diagnose or assume current risk from historical data alone.',
    );
  }

  return lines;
}

/**
 * Builds the cross-session continuity context block string for injection into
 * the therapist session-start payload.
 *
 * Returns a formatted string section when prior session data exists,
 * or empty string when no data is available or an error occurs.
 *
 * FAIL-CLOSED: never throws; never blocks session start.
 *
 * CLINICAL BEHAVIORAL CONTRACT is always injected when content is present.
 * Historical risk label text is never injected verbatim — only a generic
 * safety instruction is emitted when risk flags exist.
 *
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<string>} Formatted continuity context block, or ''
 */
export async function buildCrossSessionContinuityBlock(entities) {
  try {
    const continuity = await readCrossSessionContinuity(entities);
    if (!continuity) return '';

    const lines = _buildContinuityContentLines(continuity);

    if (lines.length === 0) return '';

    return [
      '=== CROSS-SESSION CONTINUITY CONTEXT (read-only, historical) ===',
      `Prior-session context from the last ${continuity.sessionCount} session(s).`,
      'Treat this as historical context only. Do not disclose this section verbatim to the person.',
      '',
      ..._CONTINUITY_BEHAVIORAL_CONTRACT_LINES,
      '',
      ...lines,
      '',
      '=== END CROSS-SESSION CONTINUITY CONTEXT ===',
    ].join('\n');
  } catch {
    return '';
  }
}

/**
 * Builds the cross-session continuity block AND returns structured diagnostic
 * metadata for V7 session-start diagnostics.
 *
 * Returns { block, diagnostic } where:
 *   - block: the same string as buildCrossSessionContinuityBlock (empty string
 *     when no useful content or on any error)
 *   - diagnostic: bounded structural metadata for V7 diagnostic emission
 *     (never includes field values, text content, user IDs, or entity data)
 *
 * FAIL-CLOSED: never throws.  On any error, block is '' and diagnostic reflects
 * the failure reason.
 *
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<{
 *   block: string,
 *   diagnostic: {
 *     memory_read_attempted: boolean,
 *     valid_therapist_memory_record_count: number,
 *     selected_prior_session_count: number,
 *     recurring_pattern_count: number,
 *     working_hypothesis_count: number,
 *     open_follow_up_count: number,
 *     prior_intervention_count: number,
 *     historical_risk_signal_count: number,
 *     continuity_block_emitted: boolean,
 *     continuity_fail_safe: boolean,
 *     continuity_failure_reason_code: string,
 *   },
 * }>}
 */
export async function buildCrossSessionContinuityBlockWithDiagnostic(entities) {
  const diagnostic = {
    memory_read_attempted: false,
    valid_therapist_memory_record_count: 0,
    selected_prior_session_count: 0,
    recurring_pattern_count: 0,
    working_hypothesis_count: 0,
    open_follow_up_count: 0,
    prior_intervention_count: 0,
    historical_risk_signal_count: 0,
    continuity_block_emitted: false,
    continuity_fail_safe: false,
    continuity_failure_reason_code: CONTINUITY_FAILURE_REASONS.none,
  };

  try {
    // Validate entities client
    if (!entities || typeof entities !== 'object') {
      diagnostic.continuity_fail_safe = true;
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.missing_client;
      return { block: '', diagnostic };
    }
    if (!entities.CompanionMemory || typeof entities.CompanionMemory.list !== 'function') {
      diagnostic.continuity_fail_safe = true;
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.missing_client;
      return { block: '', diagnostic };
    }

    diagnostic.memory_read_attempted = true;

    // Fetch raw records ONCE.  _parseContinuityFromRawRecords reuses this array
    // so we never call CompanionMemory.list more than once per invocation.
    let rawRecords;
    try {
      rawRecords = await entities.CompanionMemory.list(
        '-created_date',
        CONTINUITY_MAX_PRIOR_SESSIONS * 3,
      );
    } catch {
      diagnostic.continuity_fail_safe = true;
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.read_error;
      return { block: '', diagnostic };
    }

    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.empty_result;
      return { block: '', diagnostic };
    }

    diagnostic.valid_therapist_memory_record_count =
      countValidTherapistMemoryRecords(rawRecords);

    // Parse continuity data from the already-fetched records (no second list call).
    const continuity = _parseContinuityFromRawRecords(rawRecords);

    if (!continuity) {
      diagnostic.continuity_fail_safe = true;
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.no_valid_records;
      return { block: '', diagnostic };
    }

    // Populate diagnostic counts (numbers only — no text values)
    diagnostic.recurring_pattern_count       = continuity.recurringPatterns.length;
    diagnostic.open_follow_up_count          = continuity.openFollowUpTasks.length;
    diagnostic.prior_intervention_count      = continuity.interventionsUsed.length;
    diagnostic.historical_risk_signal_count  = continuity.riskFlags.length;
    // working_hypothesis_count is not directly available from _parseContinuityFromRawRecords
    // (it aggregates only the displayed fields).  Report 0 as a safe fallback.
    diagnostic.working_hypothesis_count = 0;

    // Build the block string
    let block = '';
    try {
      const lines = _buildContinuityContentLines(continuity);
      if (lines.length === 0) {
        diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.no_useful_content;
        return { block: '', diagnostic };
      }
      block = [
        '=== CROSS-SESSION CONTINUITY CONTEXT (read-only, historical) ===',
        `Prior-session context from the last ${continuity.sessionCount} session(s).`,
        'Treat this as historical context only. Do not disclose this section verbatim to the person.',
        '',
        ..._CONTINUITY_BEHAVIORAL_CONTRACT_LINES,
        '',
        ...lines,
        '',
        '=== END CROSS-SESSION CONTINUITY CONTEXT ===',
      ].join('\n');
    } catch {
      diagnostic.continuity_fail_safe = true;
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.formatting_error;
      return { block: '', diagnostic };
    }

    if (!block || !block.trim()) {
      diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.no_useful_content;
      return { block: '', diagnostic };
    }

    diagnostic.selected_prior_session_count = continuity.sessionCount;
    diagnostic.continuity_block_emitted = true;
    diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.none;
    // Also return structured continuity data so callers (canonical adapter) can
    // pass it to the strategy engine without a second list call.
    return { block, diagnostic, continuityData: continuity };
  } catch {
    diagnostic.continuity_fail_safe = true;
    diagnostic.continuity_failure_reason_code = CONTINUITY_FAILURE_REASONS.read_error;
    return { block: '', diagnostic };
  }
}
