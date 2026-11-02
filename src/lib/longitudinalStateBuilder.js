/**
 * @file src/lib/longitudinalStateBuilder.js
 *
 * Therapist Upgrade — Wave 3A — Longitudinal Therapeutic State Builder (Scaffold)
 *
 * PURPOSE
 * -------
 * Pure deterministic builder that produces a LongitudinalTherapeuticState (LTS)
 * object from bounded, structured session records.  No LLM calls, no entity
 * access, no async work, no side effects.  All outputs are derived exclusively
 * from the explicit input arguments passed to buildLongitudinalState().
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module imports ONLY from therapistMemoryModel.js (LTS schema constants)
 * and nothing else.  It does NOT import from agentWiring, activeAgentWiring,
 * featureFlags, workflowContextInjector, any entity definition, or any other
 * app module.  It is a standalone, self-contained pure library.
 *
 * This module is NOT wired into any runtime session path in this PR.
 * No Chat.jsx, no buildV*SessionStartContentAsync, no agent wiring changes,
 * no write path, no read path.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Null / missing / malformed inputs → safe empty/default LTS record.
 * - Never reads raw transcript or message content.
 * - Never calls LLMs.
 * - Never performs async work.
 * - Never accesses entities directly.
 * - Never mutates input objects.
 * - All arrays in the output are hard-capped to LTS_ARRAY_MAX entries.
 * - All string values in the output are hard-capped to LTS_STRING_MAX_CHARS.
 * - helpful_interventions and stalled_interventions are conservative heuristic
 *   signals only — they do not imply causal certainty.
 * - Every public function is wrapped in try/catch; errors return fail-safe defaults.
 *
 * DESIGN NOTES
 * ------------
 * Session records are expected to be plain objects matching the shape produced
 * by the existing therapist summarization pipeline (therapistMemoryModel.js schema).
 * The builder reads only the following fields from each session record:
 *   - core_patterns   (string[])
 *   - follow_up_tasks (string[])
 *   - interventions_used (string[])
 *   - risk_flags      (string[])
 *   - session_date    (string)
 *   - goals_referenced (string[])
 *
 * Goal records are expected to have an `id` field (string).
 * The formulation record, if present, is used only as a boolean existence signal.
 *
 * Source of truth: Wave 3A problem statement (Longitudinal Therapeutic State scaffold)
 */

import {
  LTS_VERSION,
  LTS_MEMORY_TYPE,
  LTS_ARRAY_MAX,
  LTS_STRING_MAX_CHARS,
  LTS_MIN_SESSIONS_FOR_SIGNALS,
  LTS_RECURRING_PATTERN_MIN_COUNT,
  LTS_PERSISTENT_TASK_MIN_COUNT,
  LTS_PROGRESSING_MIN_CLEAN_SESSIONS,
  LTS_STAGNATING_MIN_REPEATED_BLOCKERS,
  LTS_TRAJECTORIES,
  createEmptyLTSRecord,
} from './therapistMemoryModel.js';

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Version of the longitudinal state builder.
 *
 * @type {string}
 */
export const LTS_BUILDER_VERSION = '1.0.0';

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Truncates a string to LTS_STRING_MAX_CHARS if needed.
 * Returns '' for any non-string input.
 *
 * @param {unknown} val
 * @returns {string}
 */
function _truncateString(val) {
  if (typeof val !== 'string') return '';
  return val.slice(0, LTS_STRING_MAX_CHARS);
}

/**
 * Returns a bounded, deduplicated, sorted copy of a string array.
 * - Filters out non-string, empty, or whitespace-only values.
 * - Truncates each entry to LTS_STRING_MAX_CHARS.
 * - Removes duplicates (case-sensitive).
 * - Sorts deterministically (locale-insensitive ASCII order).
 * - Caps to LTS_ARRAY_MAX entries (takes first N after sort).
 *
 * @param {unknown[]} arr
 * @returns {string[]}
 */
function _boundedUniqueArray(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const truncated = trimmed.slice(0, LTS_STRING_MAX_CHARS);
    if (seen.has(truncated)) continue;
    seen.add(truncated);
    result.push(truncated);
  }
  result.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return result.slice(0, LTS_ARRAY_MAX);
}

/**
 * Safely extracts a string array field from a session record.
 * Returns [] for any missing or malformed value.
 *
 * @param {object} record
 * @param {string} field
 * @returns {string[]}
 */
function _safeStringArray(record, field) {
  if (!record || typeof record !== 'object') return [];
  const val = record[field];
  if (!Array.isArray(val)) return [];
  return val.filter(v => typeof v === 'string' && v.trim().length > 0);
}

/**
 * Safely extracts a string field from a session record.
 * Returns '' for any missing or malformed value.
 *
 * @param {object} record
 * @param {string} field
 * @returns {string}
 */
function _safeString(record, field) {
  if (!record || typeof record !== 'object') return '';
  const val = record[field];
  return typeof val === 'string' ? val.trim() : '';
}

/**
 * Returns true when a session record is structurally usable.
 * A record is usable if it is a non-null object.  We do not require all
 * fields to be present — missing fields default to empty.
 *
 * @param {unknown} record
 * @returns {boolean}
 */
function _isUsableSessionRecord(record) {
  return record !== null && record !== undefined && typeof record === 'object' && !Array.isArray(record);
}

/**
 * Builds a frequency map (label → count) from an array of string arrays.
 * Each inner array represents one session's values for a field.
 *
 * @param {string[][]} arrays
 * @returns {Map<string, number>}
 */
function _buildFrequencyMap(arrays) {
  const map = new Map();
  for (const arr of arrays) {
    // Use a per-session Set to count each label at most once per session.
    const sessionSeen = new Set();
    for (const label of arr) {
      const key = label.trim().slice(0, LTS_STRING_MAX_CHARS);
      if (!key || sessionSeen.has(key)) continue;
      sessionSeen.add(key);
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return map;
}

/**
 * Returns an entry's value from a frequency map if it meets a minimum count
 * threshold.  Returns a bounded sorted array.
 *
 * @param {Map<string, number>} map
 * @param {number} minCount
 * @returns {string[]}
 */
function _filterByMinCount(map, minCount) {
  const result = [];
  for (const [key, count] of map.entries()) {
    if (count >= minCount) {
      result.push(key);
    }
  }
  result.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return result.slice(0, LTS_ARRAY_MAX);
}

/**
 * Derives the trajectory label from session-level signals.
 *
 * TRAJECTORY RULES (applied in priority order)
 * ─────────────────────────────────────────────
 * 1. If sessionCount < LTS_MIN_SESSIONS_FOR_SIGNALS → 'insufficient_data'
 * 2. If the last LTS_PROGRESSING_MIN_CLEAN_SESSIONS sessions ALL have empty
 *    risk_flags AND carry no repeated blockers → 'progressing'
 * 3. If a blocker label (label in follow_up_tasks that recurs in ≥
 *    LTS_STAGNATING_MIN_REPEATED_BLOCKERS consecutive sessions) is present
 *    in the most recent sessions → 'stagnating'
 * 4. If risk_flags vary (some sessions with flags, some without) → 'fluctuating'
 * 5. If risk_flags are uniformly absent across all sessions → 'stable'
 * 6. Default → 'stable'
 *
 * Conservative bias: when evidence is ambiguous, prefer 'stable' over either
 * extreme.  'progressing' requires a strict clean streak.  'stagnating'
 * requires a strict repeated-blocker streak.
 *
 * @param {object[]} usableRecords - Pre-filtered array of usable session records,
 *   ordered oldest-first.
 * @returns {string}
 */
function _deriveTrajectory(usableRecords) {
  const n = usableRecords.length;
  if (n < LTS_MIN_SESSIONS_FOR_SIGNALS) {
    return LTS_TRAJECTORIES.INSUFFICIENT_DATA;
  }

  // Extract risk flag arrays per session (oldest → newest already ordered).
  const riskFlagsPerSession = usableRecords.map(r => _safeStringArray(r, 'risk_flags'));

  // Check stagnating FIRST: a follow-up task label appears in the last
  // LTS_STAGNATING_MIN_REPEATED_BLOCKERS consecutive sessions.
  // Stagnating takes priority over progressing — stuck tasks are a stronger
  // clinical signal than an absence of risk flags.
  const recentBlockerCount = Math.min(LTS_STAGNATING_MIN_REPEATED_BLOCKERS, n);
  const recentRecords = usableRecords.slice(-recentBlockerCount);
  const recentTaskArrays = recentRecords.map(r => _safeStringArray(r, 'follow_up_tasks'));
  const recentTaskMaps = _buildFrequencyMap(recentTaskArrays);
  const hasRepeatedBlocker = [...recentTaskMaps.values()].some(
    count => count >= LTS_STAGNATING_MIN_REPEATED_BLOCKERS
  );
  if (hasRepeatedBlocker) {
    return LTS_TRAJECTORIES.STAGNATING;
  }

  // Check progressing: last N sessions must all be clean (empty risk_flags).
  const cleanStreak = Math.min(LTS_PROGRESSING_MIN_CLEAN_SESSIONS, n);
  const lastN = riskFlagsPerSession.slice(-cleanStreak);
  const allClean = lastN.every(flags => flags.length === 0);
  if (allClean && n >= LTS_PROGRESSING_MIN_CLEAN_SESSIONS) {
    return LTS_TRAJECTORIES.PROGRESSING;
  }

  // Check fluctuating: some sessions have risk_flags, some don't.
  const sessionsWithRisk = riskFlagsPerSession.filter(f => f.length > 0).length;
  if (sessionsWithRisk > 0 && sessionsWithRisk < n) {
    return LTS_TRAJECTORIES.FLUCTUATING;
  }

  // All sessions have risk flags → stable (not stagnating without repeated blocker).
  // All sessions clean but not enough for progressing threshold → stable.
  return LTS_TRAJECTORIES.STABLE;
}

/**
 * Derives conservative helpful_interventions.
 *
 * HEURISTIC: An intervention is considered "helpful" (operational signal only)
 * when it appears in sessions that have:
 *   - empty risk_flags, AND
 *   - at least one follow-up task completed (indicated by the same task not
 *     reappearing in the next session).
 *
 * Requires at least LTS_MIN_SESSIONS_FOR_SIGNALS sessions to avoid premature
 * labeling.  At least 2 such sessions must show this pattern before an
 * intervention is included.
 *
 * CAUTION: These are NOT causal inferences.  They are bounded operational
 * signals for therapist awareness only.
 *
 * @param {object[]} usableRecords - Ordered oldest-first.
 * @returns {string[]}
 */
function _deriveHelpfulInterventions(usableRecords) {
  const n = usableRecords.length;
  if (n < LTS_MIN_SESSIONS_FOR_SIGNALS) return [];

  // Collect interventions from sessions that had no risk_flags.
  // We further require that the session appeared to have some task completion:
  // check if ANY task from that session is absent from the next session's tasks.
  const helpfulCandidates = new Map(); // intervention → count of qualifying sessions

  for (let i = 0; i < n; i++) {
    const rec = usableRecords[i];
    const riskFlags = _safeStringArray(rec, 'risk_flags');
    if (riskFlags.length > 0) continue; // session had risk — not a positive signal

    const interventions = _safeStringArray(rec, 'interventions_used');
    if (interventions.length === 0) continue;

    // Check task completion signal: at least one task from this session
    // does NOT appear in the next session's tasks (suggests it was closed).
    const myTasks = new Set(_safeStringArray(rec, 'follow_up_tasks'));
    if (myTasks.size === 0) continue; // no tasks → skip (ambiguous)

    let hasCompletedTask = false;
    if (i + 1 < n) {
      const nextTasks = new Set(_safeStringArray(usableRecords[i + 1], 'follow_up_tasks'));
      for (const task of myTasks) {
        if (!nextTasks.has(task)) {
          hasCompletedTask = true;
          break;
        }
      }
    }
    // Also treat the last session as completing tasks if it has no risk flags
    // (we can't look ahead, so we use absence of risk_flags as a proxy).
    if (i === n - 1 && !hasCompletedTask) {
      hasCompletedTask = myTasks.size > 0 && riskFlags.length === 0;
    }

    if (!hasCompletedTask) continue;

    // Credit each intervention in this session.
    for (const iv of interventions) {
      const key = iv.trim().slice(0, LTS_STRING_MAX_CHARS);
      if (!key) continue;
      helpfulCandidates.set(key, (helpfulCandidates.get(key) || 0) + 1);
    }
  }

  // Require at least 2 qualifying sessions to include in the output.
  return _filterByMinCount(helpfulCandidates, 2);
}

/**
 * Derives conservative stalled_interventions.
 *
 * HEURISTIC: An intervention is considered "stalled" (operational signal only)
 * when it appears in sessions that have either:
 *   - non-empty risk_flags, OR
 *   - a follow-up task that recurs in the next session (not resolved).
 *
 * Requires at least LTS_MIN_SESSIONS_FOR_SIGNALS sessions.  At least 2 such
 * sessions must show this pattern before an intervention is included.
 *
 * CAUTION: These are NOT causal inferences.  They are bounded operational
 * signals for therapist awareness only.
 *
 * @param {object[]} usableRecords - Ordered oldest-first.
 * @returns {string[]}
 */
function _deriveStalledInterventions(usableRecords) {
  const n = usableRecords.length;
  if (n < LTS_MIN_SESSIONS_FOR_SIGNALS) return [];

  const stalledCandidates = new Map();

  for (let i = 0; i < n - 1; i++) {
    const rec = usableRecords[i];
    const riskFlags = _safeStringArray(rec, 'risk_flags');
    const interventions = _safeStringArray(rec, 'interventions_used');
    if (interventions.length === 0) continue;

    const myTasks = _safeStringArray(rec, 'follow_up_tasks');
    const nextTasks = new Set(_safeStringArray(usableRecords[i + 1], 'follow_up_tasks'));

    const hasRecurringTask = myTasks.some(t => nextTasks.has(t));
    const hasRisk = riskFlags.length > 0;

    if (!hasRisk && !hasRecurringTask) continue;

    for (const iv of interventions) {
      const key = iv.trim().slice(0, LTS_STRING_MAX_CHARS);
      if (!key) continue;
      stalledCandidates.set(key, (stalledCandidates.get(key) || 0) + 1);
    }
  }

  return _filterByMinCount(stalledCandidates, 2);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a LongitudinalTherapeuticState from structured session records.
 *
 * SIGNATURE
 * ---------
 * buildLongitudinalState(sessionRecords, goalRecords, formulationRecord)
 *
 * PARAMETERS
 * ----------
 * @param {object[]} sessionRecords
 *   Array of structured therapist session memory records (plain objects).
 *   Expected fields per record (all optional — missing fields default to empty):
 *     - core_patterns    : string[]
 *     - follow_up_tasks  : string[]
 *     - interventions_used : string[]
 *     - risk_flags       : string[]
 *     - session_date     : string  (ISO 8601)
 *     - goals_referenced : string[]
 *   Records that are not plain objects are silently skipped.
 *   Records are consumed in the order provided (caller is responsible for
 *   chronological ordering; oldest-first is assumed).
 *
 * @param {object[]} goalRecords
 *   Array of Goal entity records.  Only the `id` field is read.
 *   Null / undefined / non-array inputs are treated as [].
 *
 * @param {object|null} formulationRecord
 *   CaseFormulation entity record (used only as a boolean existence signal).
 *   Null / undefined / non-object inputs are treated as absent.
 *
 * RETURN VALUE
 * ------------
 * @returns {object}
 *   A plain object matching the LTS schema (as produced by createEmptyLTSRecord).
 *   Never throws — returns a safe empty LTS record on any error.
 *   Output is NOT frozen (callers may need to attach metadata).
 *
 * SAFETY CONTRACT
 * ---------------
 * - Does not mutate any input object.
 * - Does not perform async work.
 * - Does not access entities.
 * - Does not call LLMs.
 * - All array outputs are bounded to LTS_ARRAY_MAX.
 * - All string outputs are bounded to LTS_STRING_MAX_CHARS.
 * - helpful_interventions and stalled_interventions are conservative
 *   heuristic signals only — they do not imply causal certainty.
 */
export function buildLongitudinalState(sessionRecords, goalRecords, formulationRecord) {
  try {
    const result = createEmptyLTSRecord();
    result.computed_at = new Date().toISOString();

    // ── 1. Normalise inputs ───────────────────────────────────────────────────

    const rawRecords = Array.isArray(sessionRecords) ? sessionRecords : [];
    const usableRecords = rawRecords.filter(_isUsableSessionRecord);

    // ── 2. Early exit — empty or insufficient input ───────────────────────────

    result.session_count = usableRecords.length;

    if (usableRecords.length === 0) {
      result.trajectory = LTS_TRAJECTORIES.UNKNOWN;
      return result;
    }

    if (usableRecords.length < LTS_MIN_SESSIONS_FOR_SIGNALS) {
      result.trajectory = LTS_TRAJECTORIES.INSUFFICIENT_DATA;
      // Populate last_session_date from the single record if available.
      const dateStr = _safeString(usableRecords[usableRecords.length - 1], 'session_date');
      result.last_session_date = _truncateString(dateStr);
      return result;
    }

    // ── 3. Extract per-session arrays ─────────────────────────────────────────

    const allPatternArrays = usableRecords.map(r => _safeStringArray(r, 'core_patterns'));
    const allTaskArrays = usableRecords.map(r => _safeStringArray(r, 'follow_up_tasks'));
    const allRiskFlagArrays = usableRecords.map(r => _safeStringArray(r, 'risk_flags'));
    const allGoalIdArrays = usableRecords.map(r => _safeStringArray(r, 'goals_referenced'));

    // ── 4. recurring_patterns ─────────────────────────────────────────────────

    result.recurring_patterns = _filterByMinCount(
      _buildFrequencyMap(allPatternArrays),
      LTS_RECURRING_PATTERN_MIN_COUNT
    );

    // ── 5. persistent_open_tasks ──────────────────────────────────────────────

    result.persistent_open_tasks = _filterByMinCount(
      _buildFrequencyMap(allTaskArrays),
      LTS_PERSISTENT_TASK_MIN_COUNT
    );

    // ── 6. active_goal_ids ────────────────────────────────────────────────────
    // Goal IDs that appear in at least LTS_RECURRING_PATTERN_MIN_COUNT sessions.

    result.active_goal_ids = _filterByMinCount(
      _buildFrequencyMap(allGoalIdArrays),
      LTS_RECURRING_PATTERN_MIN_COUNT
    );

    // ── 7. risk_flag_history ──────────────────────────────────────────────────
    // Unique risk flag labels seen across all sessions (bounded, sorted).

    result.risk_flag_history = _boundedUniqueArray(allRiskFlagArrays.flat());

    // ── 8. last_session_date ──────────────────────────────────────────────────

    const lastDate = _safeString(usableRecords[usableRecords.length - 1], 'session_date');
    result.last_session_date = _truncateString(lastDate);

    // ── 9. trajectory ─────────────────────────────────────────────────────────

    result.trajectory = _deriveTrajectory(usableRecords);

    // ── 10. helpful_interventions / stalled_interventions ─────────────────────

    result.helpful_interventions = _deriveHelpfulInterventions(usableRecords);
    result.stalled_interventions = _deriveStalledInterventions(usableRecords);

    return result;
  } catch (_e) {
    // Fail-safe: return a clean empty record.
    const safe = createEmptyLTSRecord();
    safe.trajectory = LTS_TRAJECTORIES.UNKNOWN;
    safe.computed_at = new Date().toISOString();
    return safe;
  }
}
