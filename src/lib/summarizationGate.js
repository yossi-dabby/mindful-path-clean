/**
 * @file src/lib/summarizationGate.js
 *
 * Therapist Upgrade — Phase 2 — Session-End Structured Summarization Gate
 *
 * This module provides:
 *   1. The JS-side gate check for Phase 2 summarization.
 *   2. The output contract definition (mirrors Phase 1 memory schema).
 *   3. Sanitization helpers for summary string and array fields.
 *   4. A minimal safe stub builder for failure fallback.
 *
 * ACTIVATION
 * ----------
 * Gated by THERAPIST_UPGRADE_SUMMARIZATION_ENABLED (and the master
 * THERAPIST_UPGRADE_ENABLED gate). Both flags default to false.
 * When flags are off, summarization is completely inert — no writes occur.
 *
 * PRIVACY
 * -------
 * - Summarization NEVER accepts raw transcripts, message histories, or raw
 *   session text. Forbidden field names are rejected unconditionally.
 * - Only structured, clinically relevant data may be stored.
 * - String fields that match raw-transcript patterns are cleared to '' before
 *   persistence — they are never stored as-received.
 *
 * FAIL-SAFE
 * ---------
 * Summarization failure must not break the current user flow.
 * Use buildSafeStubRecord() to produce a minimal safe record when
 * summarization cannot complete safely. The stub contains only identity
 * fields and empty clinical arrays — no sensitive content.
 *
 * This file contains no Deno APIs and no runtime side effects. It is safe to
 * import in Vitest unit tests.
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 2 for context.
 */

import { isUpgradeEnabled } from './featureFlags.js';

import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_ARRAY_FIELDS,
  THERAPIST_MEMORY_STRING_FIELDS,
} from './therapistMemoryModel.js';

// ─── Gate ─────────────────────────────────────────────────────────────────────

/**
 * Returns true if Phase 2 session-end summarization is enabled.
 *
 * Requires both the master flag (THERAPIST_UPGRADE_ENABLED) and the Phase 2
 * flag (THERAPIST_UPGRADE_SUMMARIZATION_ENABLED) to be true.
 *
 * When false, no summarization path should execute and no writes should occur.
 *
 * @returns {boolean}
 */
export function isSummarizationEnabled() {
  return isUpgradeEnabled('THERAPIST_UPGRADE_SUMMARIZATION_ENABLED');
}

// ─── Runtime authority resolver ───────────────────────────────────────────────

/**
 * Resolves whether summarization is enabled, optionally honouring a runtime
 * flag snapshot delivered by the Phase 0.2 transport layer.
 *
 * Runtime authority applies only when ALL of the following are true:
 *   1. A snapshot object is supplied.
 *   2. `snapshot.transport_status === 'available'` and `snapshot.received === true`.
 *   3. `snapshot.flags.THERAPIST_RUNTIME_APPLY_ENABLED === true`.
 *   4. `snapshot.flags.THERAPIST_UPGRADE_ENABLED === true`.
 *
 * When those conditions are met the runtime value of
 * `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` is honoured only when the runtime
 * master gate remains true. In every other case the legacy
 * `isSummarizationEnabled()` result is preserved unchanged.
 *
 * Passing `null` or `undefined` is safe: the function returns the legacy value.
 *
 * @param {object|null|undefined} snapshot - The runtime flag snapshot (may be
 *   absent when called from contexts that have no snapshot).
 * @returns {boolean}
 */
export function resolveRuntimeSummarizationFlag(snapshot) {
  if (
    snapshot &&
    snapshot.transport_status === 'available' &&
    snapshot.received === true &&
    snapshot.flags &&
    snapshot.flags['THERAPIST_RUNTIME_APPLY_ENABLED'] === true
  ) {
    return (
      snapshot.flags['THERAPIST_UPGRADE_ENABLED'] === true &&
      snapshot.flags['THERAPIST_UPGRADE_SUMMARIZATION_ENABLED'] === true
    );
  }
  return isSummarizationEnabled();
}

// ─── Forbidden input fields ───────────────────────────────────────────────────

/**
 * Field names that are NEVER allowed in a summarization request.
 *
 * These represent raw transcript or conversation-history patterns. Any input
 * object containing these keys triggers the safe-stub fallback — the forbidden
 * fields are dropped and a minimal safe record is stored instead.
 *
 * @type {ReadonlySet<string>}
 */
export const SUMMARIZATION_FORBIDDEN_INPUT_FIELDS = Object.freeze(
  new Set([
    'messages',
    'transcript',
    'raw_session',
    'conversation_history',
    'full_session',
    'chat_history',
    'message_log',
    'session_log',
  ])
);

// ─── Max lengths for string fields ───────────────────────────────────────────

/**
 * Maximum character lengths for named string fields in a summary record.
 * Prevents accidental storage of large text blobs in structured fields.
 *
 * @type {Readonly<Record<string, number>>}
 */
export const SUMMARY_STRING_FIELD_MAX_LENGTHS = Object.freeze({
  session_summary: 2000,
  safety_plan_notes: 1000,
  session_id: 256,
  session_date: 64,
  last_summarized_date: 64,
});

/**
 * Default max length for string fields not in SUMMARY_STRING_FIELD_MAX_LENGTHS.
 * @type {number}
 */
export const SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH = 500;

/**
 * Maximum number of items retained in an array field.
 * @type {number}
 */
export const SUMMARY_ARRAY_FIELD_MAX_ITEMS = 20;

/**
 * Maximum character length for each item in an array field.
 * @type {number}
 */
export const SUMMARY_ARRAY_ITEM_MAX_LENGTH = 500;

// ─── Raw transcript detection ─────────────────────────────────────────────────

/**
 * Patterns that indicate a string value contains raw conversation or transcript
 * content rather than structured clinical notes.
 *
 * If any of these patterns match, the string is considered a raw transcript dump
 * and is cleared to '' (never stored as-received).
 *
 * @type {ReadonlyArray<RegExp>}
 */
export const SUMMARY_RAW_TRANSCRIPT_PATTERNS = Object.freeze([
  // Dialogue format markers
  /^\s*(?:User|Patient|Client|Therapist|Assistant|AI|System)\s*:/m,
  // Numbered dialogue lines
  /^\s*\d+\.\s+(?:User|Patient|Client|Therapist)\s*:/m,
  // Timestamp markers typical in chat logs
  /\[\d{1,2}:\d{2}(?::\d{2})?\]/,
]);

/**
 * Returns true if the given string appears to be a raw transcript or
 * conversation dump rather than a structured clinical note.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isRawTranscriptContent(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  return SUMMARY_RAW_TRANSCRIPT_PATTERNS.some((pattern) => pattern.test(value));
}

// ─── String field sanitizer ───────────────────────────────────────────────────

/**
 * Sanitizes a single string field value for storage in a summary record.
 *
 * Rules:
 *   - Non-string values → returns ''.
 *   - Raw transcript content → returns '' (privacy rule: no transcript dumps).
 *   - Trims leading/trailing whitespace.
 *   - Truncates to the max length for the field name.
 *
 * @param {unknown} value - The raw field value.
 * @param {string} fieldName - The field name (used to look up the max length).
 * @returns {string} A sanitized string, safe for storage.
 */
export function sanitizeSummaryStringField(value, fieldName) {
  if (typeof value !== 'string') {
    return '';
  }
  if (isRawTranscriptContent(value)) {
    return '';
  }
  const maxLength =
    SUMMARY_STRING_FIELD_MAX_LENGTHS[fieldName] ?? SUMMARY_STRING_FIELD_DEFAULT_MAX_LENGTH;
  return value.trim().slice(0, maxLength);
}

// ─── Array field sanitizer ────────────────────────────────────────────────────

/**
 * Sanitizes a single array field value for storage in a summary record.
 *
 * Rules:
 *   - Non-array values → returns [].
 *   - Non-string items → dropped.
 *   - Items that look like raw transcript content → dropped.
 *   - Items are trimmed and truncated to SUMMARY_ARRAY_ITEM_MAX_LENGTH.
 *   - Array is truncated to SUMMARY_ARRAY_FIELD_MAX_ITEMS.
 *
 * @param {unknown} value - The raw field value.
 * @returns {string[]} A sanitized array of strings, safe for storage.
 */
export function sanitizeSummaryArrayField(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const sanitized = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    if (isRawTranscriptContent(item)) continue;
    const trimmed = item.trim().slice(0, SUMMARY_ARRAY_ITEM_MAX_LENGTH);
    if (trimmed.length > 0) {
      sanitized.push(trimmed);
    }
    if (sanitized.length >= SUMMARY_ARRAY_FIELD_MAX_ITEMS) break;
  }
  return sanitized;
}

// ─── Full record sanitizer ────────────────────────────────────────────────────

/**
 * Validates and sanitizes a raw summary input object into a safe record
 * matching the Phase 1 therapist memory schema.
 *
 * Behaviour:
 *   - Unknown / forbidden field names are rejected and recorded.
 *   - If any forbidden field is present in the input, safety_stub is set to
 *     true and buildSafeStubRecord is used instead of the submitted data.
 *   - String fields are sanitized via sanitizeSummaryStringField.
 *   - Array fields are sanitized via sanitizeSummaryArrayField.
 *   - The version marker is always set to the current version.
 *
 * @param {unknown} rawRecord - The raw input object (any shape).
 * @returns {{
 *   record: object,
 *   sanitized_fields: string[],
 *   rejected_fields: string[],
 *   safety_stub: boolean,
 * }}
 */
export function sanitizeSummaryRecord(rawRecord) {
  if (rawRecord === null || typeof rawRecord !== 'object') {
    rawRecord = {};
  }

  // Check for forbidden input fields.
  const rejected_fields = [];
  for (const key of Object.keys(rawRecord)) {
    if (SUMMARIZATION_FORBIDDEN_INPUT_FIELDS.has(key)) {
      rejected_fields.push(key);
    }
  }

  // If forbidden fields were present, use the safe stub.
  if (rejected_fields.length > 0) {
    const sessionId =
      typeof rawRecord.session_id === 'string' ? rawRecord.session_id.slice(0, 256) : '';
    const sessionDate =
      typeof rawRecord.session_date === 'string' ? rawRecord.session_date.slice(0, 64) : '';
    return {
      record: buildSafeStubRecord(sessionId, sessionDate),
      sanitized_fields: [],
      rejected_fields,
      safety_stub: true,
    };
  }

  const record = {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
  };
  const sanitized_fields = [];

  for (const field of THERAPIST_MEMORY_STRING_FIELDS) {
    if (field === THERAPIST_MEMORY_VERSION_KEY) continue;
    const raw = rawRecord[field];
    const sanitized = sanitizeSummaryStringField(raw, field);
    record[field] = sanitized;
    if (raw !== sanitized) {
      sanitized_fields.push(field);
    }
  }

  for (const field of THERAPIST_MEMORY_ARRAY_FIELDS) {
    const raw = rawRecord[field];
    const sanitized = sanitizeSummaryArrayField(raw);
    record[field] = sanitized;
    if (
      !Array.isArray(raw) ||
      raw.length !== sanitized.length ||
      raw.some((item, i) => item !== sanitized[i])
    ) {
      sanitized_fields.push(field);
    }
  }

  // Safety guard: if session_summary looks like a raw transcript, use safe stub.
  const summaryValue = record['session_summary'];
  if (typeof summaryValue === 'string' && isRawTranscriptContent(summaryValue)) {
    const sessionId = typeof record['session_id'] === 'string' ? record['session_id'] : '';
    const sessionDate = typeof record['session_date'] === 'string' ? record['session_date'] : '';
    return {
      record: buildSafeStubRecord(sessionId, sessionDate),
      sanitized_fields,
      rejected_fields,
      safety_stub: true,
    };
  }

  return { record, sanitized_fields, rejected_fields, safety_stub: false };
}

// ─── Minimal safe stub builder ────────────────────────────────────────────────

/**
 * Builds a minimal safe stub record for use when summarization fails safety
 * checks or encounters an unrecoverable error.
 *
 * The stub contains only the version marker, session identity fields, and
 * the current timestamp as last_summarized_date. All clinical fields are
 * empty/empty-array defaults.
 *
 * This stub is always safe to persist — it carries no clinical content,
 * no transcript data, and no sensitive user information.
 *
 * @param {string} [sessionId=''] - The CoachingSession ID.
 * @param {string} [sessionDate=''] - The session date (ISO 8601).
 * @returns {object} A minimal safe summary stub matching the Phase 1 schema.
 */
export function buildSafeStubRecord(sessionId = '', sessionDate = '') {
  return {
    [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
    session_id: typeof sessionId === 'string' ? sessionId.slice(0, 256) : '',
    session_date: typeof sessionDate === 'string' ? sessionDate.slice(0, 64) : '',
    session_summary: '',
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
    last_summarized_date: new Date().toISOString(),
  };
}
