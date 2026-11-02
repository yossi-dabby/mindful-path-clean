/**
 * @file src/lib/therapistMemoryModel.js
 *
 * Therapist Upgrade — Phase 1 — Structured Therapist Memory Model
 *
 * Defines the schema, constants, and helpers for the structured therapist
 * memory layer.  This is the data contract for all Phase 1 memory operations.
 *
 * STORAGE APPROACH
 * ----------------
 * Therapist memory records are stored in the existing CompanionMemory entity.
 * The THERAPIST_MEMORY_VERSION_KEY acts as a JSON marker embedded in the
 * record's content that distinguishes therapist-structured records from
 * standard companion memory records.  No Base44 entity schema changes are
 * required — the structured data lives inside the existing content field.
 *
 * PRIVACY
 * -------
 * - CompanionMemory is a private per-user entity (never indexed in shared
 *   retrieval pipelines).
 * - Therapist memory records store concise structured summaries only — never
 *   raw session transcripts or full message histories.
 * - No PII beyond what the user has already shared in the session context
 *   should appear in structured memory fields.
 * - The memory layer inherits all existing CompanionMemory privacy boundaries.
 *
 * ACTIVATION
 * ----------
 * This model definition is inert in default mode.  The write and read surfaces
 * that use it are gated behind THERAPIST_UPGRADE_MEMORY_ENABLED (which itself
 * requires the THERAPIST_UPGRADE_ENABLED master gate).  Both flags default to
 * false.  No current default therapist code path references this module.
 *
 * This file contains no Deno APIs and no runtime side effects.  It is safe to
 * import in Vitest unit tests.
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 1 for context.
 */

// ─── Version marker ───────────────────────────────────────────────────────────

/**
 * The JSON key embedded in every therapist memory record.
 * Used by retrieveTherapistMemory to filter CompanionMemory records that
 * belong to the structured therapist memory layer.
 *
 * @type {string}
 */
export const THERAPIST_MEMORY_VERSION_KEY = 'therapist_memory_version';

/**
 * The version string for Phase 1 therapist memory records.
 * Bump this in a later phase if the schema changes in a breaking way.
 *
 * @type {string}
 */
export const THERAPIST_MEMORY_VERSION = '1';

// ─── CompanionMemory write constants ─────────────────────────────────────────

/**
 * The value written to the memory_type field of CompanionMemory when
 * writeTherapistMemory creates a therapist session record.
 *
 * The CompanionMemory entity requires memory_type as a required field.
 * 'therapist_session' identifies these records as therapist-generated
 * clinical summaries and distinguishes them from companion-generated entries.
 *
 * NOTE: Therapist record identification at read time relies on the
 * therapist_memory_version JSON marker inside the content field, NOT on
 * memory_type alone.  memory_type is required by the schema and provides
 * a secondary human-readable label.
 *
 * @type {string}
 */
export const THERAPIST_MEMORY_TYPE = 'therapist_session';

// ─── Schema definition ────────────────────────────────────────────────────────

/**
 * Canonical schema for a structured therapist memory record.
 *
 * Every field is listed with its expected type and default value.
 * All array fields default to empty arrays (not shared references).
 * All string fields default to empty strings.
 *
 * Frozen to prevent accidental mutation.  Use createEmptyTherapistMemoryRecord()
 * to create mutable instances.
 *
 * DESIGN PRINCIPLES
 * - Concise: no raw transcripts, no full session text
 * - Structured: typed arrays and strings only
 * - Privacy-preserving: clinical relevance guides what is stored
 * - Forward-compatible: new fields can be added additively
 *
 * @type {Readonly<{
 *   therapist_memory_version: string,
 *   session_id: string,
 *   session_date: string,
 *   session_summary: string,
 *   core_patterns: string[],
 *   triggers: string[],
 *   automatic_thoughts: string[],
 *   emotions: string[],
 *   urges: string[],
 *   actions: string[],
 *   consequences: string[],
 *   working_hypotheses: string[],
 *   interventions_used: string[],
 *   risk_flags: string[],
 *   safety_plan_notes: string,
 *   follow_up_tasks: string[],
 *   goals_referenced: string[],
 *   last_summarized_date: string,
 * }>}
 */
export const THERAPIST_MEMORY_SCHEMA = Object.freeze({
  /** Version marker — always THERAPIST_MEMORY_VERSION ('1'). */
  [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,

  /** ID of the CoachingSession this memory was derived from. */
  session_id: '',

  /** ISO 8601 date string of the session. */
  session_date: '',

  /** Brief, clinically relevant session summary. Not a transcript. */
  session_summary: '',

  /** Recurring cognitive or behavioral patterns identified this session. */
  core_patterns: [],

  /** Identified situational, emotional, or interpersonal triggers. */
  triggers: [],

  /** Automatic thoughts surfaced during the session. */
  automatic_thoughts: [],

  /** Emotions the client identified or the therapist observed. */
  emotions: [],

  /** Urges (behavioral impulses) noted during the session. */
  urges: [],

  /** Behavioral actions discussed or planned. */
  actions: [],

  /** Consequences of behaviors or thought patterns discussed. */
  consequences: [],

  /** Working hypotheses about the client's core beliefs or patterns. */
  working_hypotheses: [],

  /** CBT interventions used in this session (e.g. 'thought_record', 'exposure'). */
  interventions_used: [],

  /**
   * Risk flags raised during the session.
   * E.g. ['passive_ideation', 'self_harm_mention'].
   * Must not contain raw quotes — only clinical classification labels.
   */
  risk_flags: [],

  /**
   * Brief notes related to the safety plan.
   * No raw user quotes — clinical notes only.
   */
  safety_plan_notes: '',

  /** Action items or tasks for the next session. */
  follow_up_tasks: [],

  /** IDs of Goal records referenced during the session. */
  goals_referenced: [],

  /** ISO 8601 date when this memory record was last summarized or updated. */
  last_summarized_date: '',
});

// ─── Field registry ───────────────────────────────────────────────────────────

/**
 * The set of all valid top-level keys in a therapist memory record.
 * Used for validation and schema-integrity checks.
 *
 * @type {ReadonlySet<string>}
 */
export const THERAPIST_MEMORY_FIELDS = Object.freeze(
  new Set(Object.keys(THERAPIST_MEMORY_SCHEMA))
);

/**
 * Field names whose values must be arrays of strings.
 * @type {ReadonlyArray<string>}
 */
export const THERAPIST_MEMORY_ARRAY_FIELDS = Object.freeze([
  'core_patterns',
  'triggers',
  'automatic_thoughts',
  'emotions',
  'urges',
  'actions',
  'consequences',
  'working_hypotheses',
  'interventions_used',
  'risk_flags',
  'follow_up_tasks',
  'goals_referenced',
]);

/**
 * Field names whose values must be strings.
 * @type {ReadonlyArray<string>}
 */
export const THERAPIST_MEMORY_STRING_FIELDS = Object.freeze([
  THERAPIST_MEMORY_VERSION_KEY,
  'session_id',
  'session_date',
  'session_summary',
  'safety_plan_notes',
  'last_summarized_date',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a new empty therapist memory record.
 *
 * Array fields are fresh empty arrays (not shared with the schema).
 * String fields are set to their schema defaults.
 * The version marker is always set to THERAPIST_MEMORY_VERSION.
 *
 * @returns {object} A plain mutable object matching the therapist memory schema.
 */
export function createEmptyTherapistMemoryRecord() {
  const record = {};
  for (const [key, value] of Object.entries(THERAPIST_MEMORY_SCHEMA)) {
    record[key] = Array.isArray(value) ? [] : value;
  }
  return record;
}

/**
 * Returns true if the given value is a therapist memory record.
 *
 * A therapist memory record is any plain object whose top-level
 * THERAPIST_MEMORY_VERSION_KEY equals THERAPIST_MEMORY_VERSION.
 *
 * Used by retrieveTherapistMemory to filter CompanionMemory records that
 * belong to the structured therapist memory layer from those that belong to
 * the standard companion memory layer.
 *
 * @param {unknown} record - Any value.
 * @returns {boolean}
 */
export function isTherapistMemoryRecord(record) {
  if (record === null || typeof record !== 'object') {
    return false;
  }
  return record[THERAPIST_MEMORY_VERSION_KEY] === THERAPIST_MEMORY_VERSION;
}

// ─── Wave 3A — Longitudinal Therapeutic State (LTS) ──────────────────────────
//
// Additive scaffold only.  No read path, no write path, no session-start wiring.
// The LTS schema helpers and builder live here + in longitudinalStateBuilder.js.
// Nothing in the existing runtime references these exports.
//
// PRIVACY
// -------
// LTS records are derived from structured session records only.  The builder
// must never receive or store raw transcript content, user quotes, or any
// free-text that has not been pre-classified into a bounded label.
//
// ACTIVATION
// ----------
// These exports are inert in the default runtime.  Integration with any write
// or read path is explicitly out of scope for Wave 3A and will require a
// separate approval-gated PR.

/**
 * The JSON key embedded in every LTS record.
 * Analogous to THERAPIST_MEMORY_VERSION_KEY for the LTS layer.
 *
 * @type {string}
 */
export const LTS_MEMORY_TYPE = 'lts';

/**
 * The version string for Wave 3A LTS records.
 *
 * @type {string}
 */
export const LTS_VERSION = '1';

/**
 * Hard cap: maximum number of entries in any LTS array field.
 * Prevents unbounded growth even when many sessions are processed.
 *
 * @type {number}
 */
export const LTS_ARRAY_MAX = 8;

/**
 * Hard cap: maximum character length of any LTS string field value
 * (excluding the version marker).
 *
 * @type {number}
 */
export const LTS_STRING_MAX_CHARS = 64;

/**
 * Minimum number of session records required before any non-default LTS
 * signal is populated.  Below this threshold the builder returns a safe
 * early/insufficient-data record.
 *
 * @type {number}
 */
export const LTS_MIN_SESSIONS_FOR_SIGNALS = 2;

/**
 * Minimum number of sessions in which a pattern must appear before it is
 * promoted to recurring_patterns.
 *
 * @type {number}
 */
export const LTS_RECURRING_PATTERN_MIN_COUNT = 2;

/**
 * Minimum number of sessions in which a follow-up task must remain open
 * before it is added to persistent_open_tasks.
 *
 * @type {number}
 */
export const LTS_PERSISTENT_TASK_MIN_COUNT = 2;

/**
 * Minimum number of consecutive sessions with no risk_flags required before
 * the trajectory can be set to 'progressing'.
 *
 * @type {number}
 */
export const LTS_PROGRESSING_MIN_CLEAN_SESSIONS = 3;

/**
 * Minimum number of sessions with a repeated blocker label required to set
 * trajectory to 'stagnating'.
 *
 * @type {number}
 */
export const LTS_STAGNATING_MIN_REPEATED_BLOCKERS = 2;

/**
 * Canonical schema/shape for a Longitudinal Therapeutic State record.
 *
 * FIELD DESIGN CONSTRAINTS (enforced by the builder)
 * --------------------------------------------------
 * - Every string field is bounded to LTS_STRING_MAX_CHARS characters.
 * - Every array field is hard-capped to LTS_ARRAY_MAX entries.
 * - No free-text paragraphs.
 * - No raw user quotes.
 * - No diagnosis or prognosis fields.
 * - Operational signals only.
 * - Deterministic, empty-safe defaults.
 *
 * Frozen to prevent accidental mutation.  Use createEmptyLTSRecord() for
 * mutable instances.
 *
 * @type {Readonly<object>}
 */
export const LTS_SCHEMA = Object.freeze({
  /**
   * Version marker — always LTS_VERSION ('1').
   * Used by isLTSRecord() for identification.
   */
  lts_version: LTS_VERSION,

  /**
   * Memory type tag.  Always LTS_MEMORY_TYPE ('lts').
   */
  memory_type: LTS_MEMORY_TYPE,

  /**
   * Total number of session records processed to produce this LTS.
   * @type {number}
   */
  session_count: 0,

  /**
   * Bounded trajectory label.
   * One of: 'unknown' | 'insufficient_data' | 'progressing' |
   *         'stable' | 'stagnating' | 'fluctuating'
   * @type {string}
   */
  trajectory: 'unknown',

  /**
   * Patterns that appear in at least LTS_RECURRING_PATTERN_MIN_COUNT sessions.
   * Bounded array of short labels (no free-text quotes).
   * @type {string[]}
   */
  recurring_patterns: [],

  /**
   * Follow-up tasks that appear open across at least
   * LTS_PERSISTENT_TASK_MIN_COUNT sessions.
   * Bounded array of short labels.
   * @type {string[]}
   */
  persistent_open_tasks: [],

  /**
   * Goal IDs that appear in at least LTS_RECURRING_PATTERN_MIN_COUNT sessions.
   * @type {string[]}
   */
  active_goal_ids: [],

  /**
   * Interventions that co-occur with sessions that had no risk_flags and
   * positive follow-up task completion.  Conservative heuristic only.
   * These are OPERATIONAL SIGNALS — do not imply causal certainty.
   * Bounded array of short labels.
   * @type {string[]}
   */
  helpful_interventions: [],

  /**
   * Interventions that appear in sessions where risk_flags or blockers
   * recur across consecutive sessions.  Conservative heuristic only.
   * These are OPERATIONAL SIGNALS — do not imply causal certainty.
   * Bounded array of short labels.
   * @type {string[]}
   */
  stalled_interventions: [],

  /**
   * Unique risk flag labels seen across all sessions.
   * Bounded array of classification labels (no user quotes).
   * @type {string[]}
   */
  risk_flag_history: [],

  /**
   * ISO 8601 date of the most recent session processed.
   * @type {string}
   */
  last_session_date: '',

  /**
   * ISO 8601 date when this LTS record was computed.
   * @type {string}
   */
  computed_at: '',
});

/**
 * The set of all valid top-level keys in an LTS record.
 *
 * @type {ReadonlySet<string>}
 */
export const LTS_FIELDS = Object.freeze(new Set(Object.keys(LTS_SCHEMA)));

/**
 * Field names whose values must be arrays of strings in an LTS record.
 *
 * @type {ReadonlyArray<string>}
 */
export const LTS_ARRAY_FIELDS = Object.freeze([
  'recurring_patterns',
  'persistent_open_tasks',
  'active_goal_ids',
  'helpful_interventions',
  'stalled_interventions',
  'risk_flag_history',
]);

/**
 * Field names whose values must be strings in an LTS record.
 *
 * @type {ReadonlyArray<string>}
 */
export const LTS_STRING_FIELDS = Object.freeze([
  'lts_version',
  'memory_type',
  'trajectory',
  'last_session_date',
  'computed_at',
]);

/**
 * Approved bounded set of trajectory values.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const LTS_TRAJECTORIES = Object.freeze({
  /** Default — LTS has not been computed or trajectory is indeterminate. */
  UNKNOWN: 'unknown',
  /** Too few sessions to derive a meaningful trajectory. */
  INSUFFICIENT_DATA: 'insufficient_data',
  /** Risk flags are decreasing and sessions are completing with fewer blockers. */
  PROGRESSING: 'progressing',
  /** Consistent engagement with no strong deterioration or improvement signal. */
  STABLE: 'stable',
  /** Repeated blockers and/or consistent risk flags across multiple sessions. */
  STAGNATING: 'stagnating',
  /** Mixed signals — some sessions improving, some with elevated risk. */
  FLUCTUATING: 'fluctuating',
});

/**
 * Creates a new empty LTS record.
 *
 * Array fields are fresh empty arrays (never shared with the schema).
 * Numeric fields are set to their schema defaults.
 * The version marker and memory_type are always set correctly.
 *
 * @returns {object} A plain mutable object matching the LTS schema.
 */
export function createEmptyLTSRecord() {
  const record = {};
  for (const [key, value] of Object.entries(LTS_SCHEMA)) {
    if (Array.isArray(value)) {
      record[key] = [];
    } else if (typeof value === 'number') {
      record[key] = value;
    } else {
      record[key] = value;
    }
  }
  return record;
}

/**
 * Returns true if the given value is a valid LTS record.
 *
 * An LTS record is any plain object whose `lts_version` equals LTS_VERSION
 * and whose `memory_type` equals LTS_MEMORY_TYPE.
 *
 * @param {unknown} record - Any value.
 * @returns {boolean}
 */
export function isLTSRecord(record) {
  if (record === null || typeof record !== 'object') {
    return false;
  }
  return (
    record.lts_version === LTS_VERSION &&
    record.memory_type === LTS_MEMORY_TYPE
  );
}
