/**
 * @file src/lib/validateBase44Import.js
 *
 * Lightweight validation utility for TrustedCBTChunk Base44 import files.
 *
 * PURPOSE
 * -------
 * Validates that a JSON array is compatible with the Base44 TrustedCBTChunk
 * entity schema before it is pasted into the BulkImport UI at /KnowledgeStudio.
 *
 * Checks performed per record:
 * 1. Missing required fields (title, topic, content).
 * 2. Invalid language (must be one of VALID_LANGUAGES).
 * 3. Invalid priority_score (must be a number 0–10).
 * 4. Non-array tags field.
 * 5. Extra fields not in the Base44 TrustedCBTChunk schema.
 *
 * SCHEMA REFERENCE
 * ----------------
 * Allowed fields (exactly): title, topic, subtopic, population, clinical_goal,
 * content, short_summary, tags, source_name, source_type, license_status,
 * safety_notes, contraindications, language, priority_score, is_active
 *
 * USAGE
 * -----
 * import { validateBase44ImportFile } from '@/lib/validateBase44Import.js';
 * const { valid, errors } = validateBase44ImportFile(jsonArray);
 * if (!valid) { console.error(errors); }
 */

export const VALID_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

export const REQUIRED_FIELDS = ['title', 'topic', 'content'];

/**
 * The complete set of fields allowed by the Base44 TrustedCBTChunk schema.
 * Any field outside this set is considered a non-Base44 field and will cause
 * a validation error.
 */
export const ALLOWED_FIELDS = new Set([
  'title',
  'topic',
  'subtopic',
  'population',
  'clinical_goal',
  'content',
  'short_summary',
  'tags',
  'source_name',
  'source_type',
  'license_status',
  'safety_notes',
  'contraindications',
  'language',
  'priority_score',
  'is_active',
]);

/**
 * Validate a single record against the Base44 TrustedCBTChunk schema.
 *
 * @param {object} record - The record to validate.
 * @param {number} index  - Zero-based record index (for error messages).
 * @returns {{ index: number, errors: string[] }}
 */
export function validateRecord(record, index) {
  const errors = [];

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push('Record must be a plain object');
    return { index, errors };
  }

  // 1. Required fields
  for (const field of REQUIRED_FIELDS) {
    const value = record[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // 2. Language
  if (record.language !== undefined) {
    if (!VALID_LANGUAGES.includes(record.language)) {
      errors.push(
        `Invalid language "${record.language}". Must be one of: ${VALID_LANGUAGES.join(', ')}`
      );
    }
  }

  // 3. priority_score
  if (record.priority_score !== undefined) {
    const score = Number(record.priority_score);
    if (isNaN(score) || score < 0 || score > 10) {
      errors.push(
        `Invalid priority_score "${record.priority_score}". Must be a number between 0 and 10 (inclusive)`
      );
    }
  }

  // 4. tags must be an array if present
  if (record.tags !== undefined && !Array.isArray(record.tags)) {
    errors.push(`"tags" must be an array (got ${typeof record.tags})`);
  }

  // 5. Extra (non-Base44) fields
  const extraFields = Object.keys(record).filter(k => !ALLOWED_FIELDS.has(k));
  if (extraFields.length > 0) {
    errors.push(
      `Extra non-Base44 field(s) found: ${extraFields.map(f => `"${f}"`).join(', ')}. Remove before importing.`
    );
  }

  return { index, errors };
}

/**
 * Validate an entire import-ready array of TrustedCBTChunk records.
 *
 * @param {unknown} data - The parsed JSON value (expected to be an array).
 * @returns {{
 *   valid: boolean,
 *   recordCount: number,
 *   errorCount: number,
 *   errors: Array<{ index: number, errors: string[] }>
 * }}
 */
export function validateBase44ImportFile(data) {
  if (!Array.isArray(data)) {
    return {
      valid: false,
      recordCount: 0,
      errorCount: 1,
      errors: [{ index: -1, errors: ['Top-level value must be a JSON array'] }],
    };
  }

  if (data.length === 0) {
    return {
      valid: false,
      recordCount: 0,
      errorCount: 1,
      errors: [{ index: -1, errors: ['Array must contain at least one record'] }],
    };
  }

  const recordErrors = data.map((record, i) => validateRecord(record, i));
  const withErrors = recordErrors.filter(r => r.errors.length > 0);

  return {
    valid: withErrors.length === 0,
    recordCount: data.length,
    errorCount: withErrors.reduce((sum, r) => sum + r.errors.length, 0),
    errors: withErrors,
  };
}
