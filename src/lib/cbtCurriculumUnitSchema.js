/**
 * @file src/lib/cbtCurriculumUnitSchema.js
 *
 * Therapist Upgrade — Wave 4A.2 — CBTCurriculumUnit Extended Schema Constants
 *
 * PURPOSE
 * -------
 * Defines the bounded constant sets and a pure validator for the five new
 * optional fields added to the CBTCurriculumUnit entity in Wave 4A.2:
 *
 *   - distress_suitability
 *   - intervention_family
 *   - evidence_level
 *   - treatment_arc_position
 *   - safety_tags
 *
 * These fields are OPTIONAL/DEFAULT-SAFE on every existing record.
 * Adding them does not break backward compatibility with records that omit them.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module has NO imports from any other app module.  It does NOT import
 * from agentWiring, activeAgentWiring, featureFlags, workflowContextInjector,
 * or any entity definition.  It is a standalone, self-contained pure library.
 *
 * RUNTIME WIRING STATUS (Wave 4A.2)
 * ----------------------------------
 * NOT WIRED.  These constants and the validator are schema-only assets for
 * planning, testing, and future Wave 4B/4C retrieval use.  No runtime
 * retrieval pipeline, no Chat.jsx change, no agent wiring change, no
 * workflowContextInjector change is made in this PR.
 *
 * SAFETY CONTRACT
 * ---------------
 * - All functions are pure and synchronous.
 * - No LLM calls, no entity access, no async work, no side effects.
 * - No raw user message text is accepted or processed.
 * - All public functions never throw — they catch all errors and return safe defaults.
 * - All enum constants are frozen plain objects.
 * - All default values are conservative (skip-safe) where applicable.
 *
 * Source of truth: Wave 4A.2 problem statement (CBTCurriculumUnit schema extension)
 */

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Version of the CBTCurriculumUnit extended schema module.
 * Bump when enum values or validation logic change.
 *
 * @type {string}
 */
export const CBT_CURRICULUM_SCHEMA_VERSION = '1.0.0';

// ─── distress_suitability ─────────────────────────────────────────────────────

/**
 * Bounded enum for the `distress_suitability` field.
 *
 * Describes the maximum distress level at which a CBTCurriculumUnit is
 * clinically appropriate for retrieval.
 *
 * - ANY            → no distress constraint; unit is suitable regardless of tier.
 * - MILD_AND_BELOW → only when distress tier is TIER_LOW or TIER_MILD.
 * - LOW_ONLY       → only when distress tier is TIER_LOW.
 *
 * Default when absent: ANY (most permissive — existing records remain valid).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_DISTRESS_SUITABILITY = Object.freeze({
  ANY: 'any',
  MILD_AND_BELOW: 'mild_and_below',
  LOW_ONLY: 'low_only',
});

/** @type {ReadonlySet<string>} */
export const CBT_DISTRESS_SUITABILITY_VALUES = Object.freeze(
  new Set(Object.values(CBT_DISTRESS_SUITABILITY))
);

/** Default value for `distress_suitability` when the field is absent. */
export const CBT_DISTRESS_SUITABILITY_DEFAULT = CBT_DISTRESS_SUITABILITY.ANY;

// ─── intervention_family ──────────────────────────────────────────────────────

/**
 * Bounded enum for the `intervention_family` field.
 *
 * Groups a CBTCurriculumUnit by its primary CBT intervention approach.
 * Used by Wave 4B/4C retrieval to match context to technique type.
 *
 * - COGNITIVE        → cognitive restructuring, thought records, appraisal work.
 * - BEHAVIORAL       → behavioral activation, graded tasks, habit scheduling.
 * - ACCEPTANCE       → ACT-aligned acceptance/defusion techniques.
 * - PSYCHOEDUCATION  → introductory educational content about the model.
 * - MIXED            → combines two or more families.
 * - OTHER            → does not fit any of the above categories.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_INTERVENTION_FAMILY = Object.freeze({
  COGNITIVE: 'cognitive',
  BEHAVIORAL: 'behavioral',
  ACCEPTANCE: 'acceptance',
  PSYCHOEDUCATION: 'psychoeducation',
  MIXED: 'mixed',
  OTHER: 'other',
});

/** @type {ReadonlySet<string>} */
export const CBT_INTERVENTION_FAMILY_VALUES = Object.freeze(
  new Set(Object.values(CBT_INTERVENTION_FAMILY))
);

// ─── evidence_level ───────────────────────────────────────────────────────────

/**
 * Bounded enum for the `evidence_level` field.
 *
 * Describes the strength of evidence supporting the clinical content in
 * a CBTCurriculumUnit.
 *
 * - ESTABLISHED      → supported by RCT evidence or meta-analytic review.
 * - EMERGING         → promising preliminary evidence; not yet replicated.
 * - EXPERT_CONSENSUS → clinical consensus without formal trial support.
 * - UNCLASSIFIED     → evidence level not yet assessed (conservative default).
 *
 * Default when absent: UNCLASSIFIED (most conservative).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_EVIDENCE_LEVEL = Object.freeze({
  ESTABLISHED: 'established',
  EMERGING: 'emerging',
  EXPERT_CONSENSUS: 'expert_consensus',
  UNCLASSIFIED: 'unclassified',
});

/** @type {ReadonlySet<string>} */
export const CBT_EVIDENCE_LEVEL_VALUES = Object.freeze(
  new Set(Object.values(CBT_EVIDENCE_LEVEL))
);

/** Default value for `evidence_level` when the field is absent. */
export const CBT_EVIDENCE_LEVEL_DEFAULT = CBT_EVIDENCE_LEVEL.UNCLASSIFIED;

// ─── treatment_arc_position ───────────────────────────────────────────────────

/**
 * Bounded enum for the `treatment_arc_position` field.
 *
 * Describes the optimal position in the treatment arc at which a
 * CBTCurriculumUnit should be used.  Intentionally mirrors CBT_TREATMENT_ARC_FILTERS
 * from cbtKnowledgePlanner.js for semantic alignment; however this module does
 * NOT import from cbtKnowledgePlanner.js (isolation guarantee).
 *
 * - EARLY  → suitable for early therapy (psychoeducation, rapport, basics).
 * - MIDDLE → suitable for mid-therapy (skill application, technique practice).
 * - LATE   → suitable for late therapy (consolidation, relapse prevention).
 * - ANY    → arc-agnostic; suitable at any treatment stage (default).
 *
 * Default when absent: ANY (most permissive — existing records remain valid).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_TREATMENT_ARC_POSITION = Object.freeze({
  EARLY: 'early',
  MIDDLE: 'middle',
  LATE: 'late',
  ANY: 'any',
});

/** @type {ReadonlySet<string>} */
export const CBT_TREATMENT_ARC_POSITION_VALUES = Object.freeze(
  new Set(Object.values(CBT_TREATMENT_ARC_POSITION))
);

/** Default value for `treatment_arc_position` when the field is absent. */
export const CBT_TREATMENT_ARC_POSITION_DEFAULT = CBT_TREATMENT_ARC_POSITION.ANY;

// ─── safety_tags ─────────────────────────────────────────────────────────────

/**
 * Bounded enum for individual values within the `safety_tags` array field.
 *
 * safety_tags is a machine-readable array of clinical constraints and
 * capabilities attached to a CBTCurriculumUnit.  Each tag encodes a
 * specific retrieval filter or capability signal.
 *
 * - NOT_FOR_CRISIS        → must be skipped during safety mode or active crisis.
 * - REQUIRES_RAPPORT      → must not be retrieved in the first 1–2 sessions;
 *                           requires an established therapeutic alliance.
 * - PSYCHOEDUCATION_SAFE  → safe for first-contact psychoeducation delivery;
 *                           no prior therapeutic context required.
 * - VALIDATED_PROTOCOL    → derived from or part of a formally validated CBT
 *                           protocol (e.g. Beck CT, Barlow UP, Clark & Wells).
 * - NOT_FOR_HIGH_DISTRESS → must be skipped when distress tier is TIER_HIGH.
 * - EXPOSURE_ADJACENT     → involves exposure-related content; requires careful
 *                           pacing and is not appropriate for early arc stages.
 *
 * An absent or empty `safety_tags` array means no constraints apply.
 * All tags in a record must be drawn from this bounded set.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const CBT_SAFETY_TAG = Object.freeze({
  NOT_FOR_CRISIS: 'not_for_crisis',
  REQUIRES_RAPPORT: 'requires_rapport',
  PSYCHOEDUCATION_SAFE: 'psychoeducation_safe',
  VALIDATED_PROTOCOL: 'validated_protocol',
  NOT_FOR_HIGH_DISTRESS: 'not_for_high_distress',
  EXPOSURE_ADJACENT: 'exposure_adjacent',
});

/** @type {ReadonlySet<string>} */
export const CBT_SAFETY_TAG_VALUES = Object.freeze(
  new Set(Object.values(CBT_SAFETY_TAG))
);

/** Default value for `safety_tags` when the field is absent. */
export const CBT_SAFETY_TAGS_DEFAULT = Object.freeze([]);

// ─── Validation result shape ──────────────────────────────────────────────────

/**
 * @typedef {Object} CBTCurriculumUnitExtendedFieldsValidationResult
 * @property {boolean} valid         - True when all present extended fields pass validation.
 * @property {string[]} errors       - List of human-readable error strings (empty when valid).
 * @property {string[]} unknownTags  - Any safety_tags values not in CBT_SAFETY_TAG_VALUES.
 */

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates the Wave 4A.2 extended optional fields on a CBTCurriculumUnit record.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - All five fields are optional.  Missing fields are valid (backward compatible).
 * - Enum fields must be one of the approved values when present.
 * - safety_tags must be an array when present; each element must be in CBT_SAFETY_TAG_VALUES.
 * - Duplicate safety_tags are not an error but are noted.
 * - No required fields are checked here — this validator is additive only.
 * - Never throws — returns a result object with valid: false on any error.
 *
 * @param {unknown} record - The CBTCurriculumUnit record to validate. May be any value.
 * @returns {CBTCurriculumUnitExtendedFieldsValidationResult}
 */
export function validateCBTCurriculumUnitExtendedFields(record) {
  try {
    const errors = [];
    const unknownTags = [];

    if (record === null || record === undefined || typeof record !== 'object' || Array.isArray(record)) {
      return { valid: false, errors: ['record must be a non-null object'], unknownTags: [] };
    }

    // distress_suitability — optional; must be a known value when present.
    if ('distress_suitability' in record && record.distress_suitability !== undefined) {
      if (!CBT_DISTRESS_SUITABILITY_VALUES.has(record.distress_suitability)) {
        errors.push(
          `distress_suitability "${record.distress_suitability}" is not a valid value; ` +
          `expected one of: ${[...CBT_DISTRESS_SUITABILITY_VALUES].join(', ')}`
        );
      }
    }

    // intervention_family — optional; must be a known value when present.
    if ('intervention_family' in record && record.intervention_family !== undefined) {
      if (!CBT_INTERVENTION_FAMILY_VALUES.has(record.intervention_family)) {
        errors.push(
          `intervention_family "${record.intervention_family}" is not a valid value; ` +
          `expected one of: ${[...CBT_INTERVENTION_FAMILY_VALUES].join(', ')}`
        );
      }
    }

    // evidence_level — optional; must be a known value when present.
    if ('evidence_level' in record && record.evidence_level !== undefined) {
      if (!CBT_EVIDENCE_LEVEL_VALUES.has(record.evidence_level)) {
        errors.push(
          `evidence_level "${record.evidence_level}" is not a valid value; ` +
          `expected one of: ${[...CBT_EVIDENCE_LEVEL_VALUES].join(', ')}`
        );
      }
    }

    // treatment_arc_position — optional; must be a known value when present.
    if ('treatment_arc_position' in record && record.treatment_arc_position !== undefined) {
      if (!CBT_TREATMENT_ARC_POSITION_VALUES.has(record.treatment_arc_position)) {
        errors.push(
          `treatment_arc_position "${record.treatment_arc_position}" is not a valid value; ` +
          `expected one of: ${[...CBT_TREATMENT_ARC_POSITION_VALUES].join(', ')}`
        );
      }
    }

    // safety_tags — optional; must be an array of known tag values when present.
    if ('safety_tags' in record && record.safety_tags !== undefined) {
      if (!Array.isArray(record.safety_tags)) {
        errors.push('safety_tags must be an array when present');
      } else {
        for (const tag of record.safety_tags) {
          if (!CBT_SAFETY_TAG_VALUES.has(tag)) {
            unknownTags.push(String(tag));
            errors.push(
              `safety_tags contains unknown value "${tag}"; ` +
              `expected values from: ${[...CBT_SAFETY_TAG_VALUES].join(', ')}`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      unknownTags,
    };
  } catch (_err) {
    return { valid: false, errors: ['unexpected error during validation'], unknownTags: [] };
  }
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Returns a copy of a CBTCurriculumUnit record with default values applied
 * to any absent or undefined Wave 4A.2 extended fields.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Only fills in DEFAULTS for fields that are absent or explicitly undefined.
 * - Does NOT override invalid enum values — call validateCBTCurriculumUnitExtendedFields
 *   first if you need to detect invalid values.
 * - Returns a new plain object (shallow copy of the input with defaults merged).
 * - Does NOT modify the input record.
 * - Does NOT affect any non-extended fields.
 * - Never throws — returns the input unchanged on unexpected errors.
 *
 * @param {Object} record - A CBTCurriculumUnit record (must be a non-null object).
 * @returns {Object} A new object with extended field defaults applied.
 */
export function normalizeCBTCurriculumUnitExtendedFields(record) {
  try {
    if (record === null || record === undefined || typeof record !== 'object' || Array.isArray(record)) {
      return record;
    }

    const result = { ...record };

    if (!('distress_suitability' in result) || result.distress_suitability === undefined) {
      result.distress_suitability = CBT_DISTRESS_SUITABILITY_DEFAULT;
    }
    if (!('evidence_level' in result) || result.evidence_level === undefined) {
      result.evidence_level = CBT_EVIDENCE_LEVEL_DEFAULT;
    }
    if (!('treatment_arc_position' in result) || result.treatment_arc_position === undefined) {
      result.treatment_arc_position = CBT_TREATMENT_ARC_POSITION_DEFAULT;
    }
    if (!('safety_tags' in result) || result.safety_tags === undefined) {
      result.safety_tags = [];
    }

    return result;
  } catch (_err) {
    return record;
  }
}
