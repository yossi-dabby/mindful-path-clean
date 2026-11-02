/**
 * @file test/utils/wave4bCbtCurriculumUnitSchema.test.js
 *
 * Wave 4A.2 — CBTCurriculumUnit Extended Schema Tests
 * (file named wave4b* because these constants underpin Wave 4B retrieval)
 *
 * PURPOSE
 * -------
 * Validates the Wave 4A.2 schema additions:
 *   - src/lib/cbtCurriculumUnitSchema.js
 *
 * Covers the full schema contract for the five new optional fields added to
 * CBTCurriculumUnit: distress_suitability, intervention_family, evidence_level,
 * treatment_arc_position, and safety_tags.
 *
 * COVERAGE
 * ────────
 *  A.  Module exports the expected public symbols
 *  B.  CBT_CURRICULUM_SCHEMA_VERSION is a non-empty string
 *  C.  CBT_DISTRESS_SUITABILITY is a frozen non-empty object
 *  D.  CBT_DISTRESS_SUITABILITY_VALUES is a frozen Set
 *  E.  CBT_INTERVENTION_FAMILY is a frozen non-empty object
 *  F.  CBT_INTERVENTION_FAMILY_VALUES is a frozen Set
 *  G.  CBT_EVIDENCE_LEVEL is a frozen non-empty object
 *  H.  CBT_EVIDENCE_LEVEL_VALUES is a frozen Set
 *  I.  CBT_TREATMENT_ARC_POSITION is a frozen non-empty object
 *  J.  CBT_TREATMENT_ARC_POSITION_VALUES is a frozen Set
 *  K.  CBT_SAFETY_TAG is a frozen non-empty object
 *  L.  CBT_SAFETY_TAG_VALUES is a frozen Set
 *  M.  validateCBTCurriculumUnitExtendedFields is a function
 *  N.  normalizeCBTCurriculumUnitExtendedFields is a function
 *
 *  --- Backward compatibility (old records without new fields) ---
 *  O.  Old record (no new fields) passes validation
 *  P.  Old record with only required core fields passes validation
 *  Q.  Old record with undefined extended fields passes validation
 *  R.  Old record normalizes to defaults without altering existing fields
 *
 *  --- distress_suitability field ---
 *  S.  Valid value 'any' is accepted
 *  T.  Valid value 'low_only' is accepted
 *  U.  Valid value 'mild_and_below' is accepted
 *  V.  Unknown string value is rejected with error
 *  W.  Absent field is valid (backward compatible)
 *  X.  Default when absent is 'any'
 *
 *  --- intervention_family field ---
 *  Y.  Valid value 'cognitive' is accepted
 *  Z.  Valid value 'behavioral' is accepted
 *  AA. Valid value 'acceptance' is accepted
 *  AB. Valid value 'psychoeducation' is accepted
 *  AC. Valid value 'mixed' is accepted
 *  AD. Valid value 'other' is accepted
 *  AE. Unknown string value is rejected with error
 *  AF. Absent field is valid (backward compatible)
 *  AG. intervention_family has no default (remains absent after normalize)
 *
 *  --- evidence_level field ---
 *  AH. Valid value 'established' is accepted
 *  AI. Valid value 'emerging' is accepted
 *  AJ. Valid value 'expert_consensus' is accepted
 *  AK. Valid value 'unclassified' is accepted
 *  AL. Unknown string value is rejected with error
 *  AM. Absent field is valid (backward compatible)
 *  AN. Default when absent is 'unclassified'
 *
 *  --- treatment_arc_position field ---
 *  AO. Valid value 'early' is accepted
 *  AP. Valid value 'middle' is accepted
 *  AQ. Valid value 'late' is accepted
 *  AR. Valid value 'any' is accepted
 *  AS. Unknown string value is rejected with error
 *  AT. Absent field is valid (backward compatible)
 *  AU. Default when absent is 'any'
 *
 *  --- safety_tags field ---
 *  AV. Empty array is valid
 *  AW. Array with valid single tag is accepted
 *  AX. Array with all valid tags is accepted
 *  AY. All six approved tag values are accepted: not_for_crisis, requires_rapport,
 *      psychoeducation_safe, validated_protocol, not_for_high_distress, exposure_adjacent
 *  AZ. Unknown tag in array is rejected with error
 *  BA. Non-array value is rejected with error
 *  BB. Absent field is valid (backward compatible)
 *  BC. Default when absent is []
 *  BD. safety_tags default is a stable empty array (not the same reference each time)
 *
 *  --- Multiple invalid fields → all errors reported ---
 *  BE. Two invalid fields → two errors reported
 *  BF. errors array is always an array
 *  BG. unknownTags array is always an array
 *
 *  --- valid: boolean ---
 *  BH. valid is true when all present fields are valid
 *  BI. valid is false when any field is invalid
 *
 *  --- Normalizer ---
 *  BJ. normalizer does not mutate the input record
 *  BK. normalizer returns a new object
 *  BL. normalizer applies distress_suitability default when absent
 *  BM. normalizer applies evidence_level default when absent
 *  BN. normalizer applies treatment_arc_position default when absent
 *  BO. normalizer applies safety_tags default when absent
 *  BP. normalizer does NOT override a valid existing value
 *  BQ. normalizer does NOT override an invalid value (validator responsibility)
 *  BR. normalizer preserves all non-extended fields unchanged
 *  BS. normalizer on null returns null (no throw)
 *  BT. normalizer on array returns array unchanged (no throw)
 *
 *  --- No runtime behavior impact ---
 *  BU. No import from agentWiring, activeAgentWiring, workflowContextInjector, featureFlags
 *  BV. No COMPANION_* fields appear in any export or output
 *  BW. No private entity fields in any export or output
 *
 *  --- Enum set completeness ---
 *  BX. CBT_DISTRESS_SUITABILITY has exactly 3 values
 *  BY. CBT_INTERVENTION_FAMILY has exactly 6 values
 *  BZ. CBT_EVIDENCE_LEVEL has exactly 4 values
 *  CA. CBT_TREATMENT_ARC_POSITION has exactly 4 values
 *  CB. CBT_SAFETY_TAG has exactly 6 values
 *
 *  --- Frozen object safety ---
 *  CC. Attempting to mutate CBT_DISTRESS_SUITABILITY throws in strict mode
 *  CD. Attempting to mutate CBT_SAFETY_TAG throws in strict mode
 *
 *  --- Fail-safe: validator never throws ---
 *  CE. Passing null returns valid: false, no throw
 *  CF. Passing undefined returns valid: false, no throw
 *  CG. Passing a number returns valid: false, no throw
 *  CH. Passing a string returns valid: false, no throw
 *  CI. Passing an array returns valid: false, no throw
 *
 * CONSTRAINTS
 * -----------
 * - No feature flags are enabled in these tests.
 * - All tests are synchronous.
 * - No live Base44 backend is required.
 * - No raw user message content appears in any test.
 * - No companion entity access is tested or invoked.
 */

import { describe, it, expect } from 'vitest';

// ─── Module under test ────────────────────────────────────────────────────────

import {
  CBT_CURRICULUM_SCHEMA_VERSION,
  CBT_DISTRESS_SUITABILITY,
  CBT_DISTRESS_SUITABILITY_VALUES,
  CBT_DISTRESS_SUITABILITY_DEFAULT,
  CBT_INTERVENTION_FAMILY,
  CBT_INTERVENTION_FAMILY_VALUES,
  CBT_EVIDENCE_LEVEL,
  CBT_EVIDENCE_LEVEL_VALUES,
  CBT_EVIDENCE_LEVEL_DEFAULT,
  CBT_TREATMENT_ARC_POSITION,
  CBT_TREATMENT_ARC_POSITION_VALUES,
  CBT_TREATMENT_ARC_POSITION_DEFAULT,
  CBT_SAFETY_TAG,
  CBT_SAFETY_TAG_VALUES,
  CBT_SAFETY_TAGS_DEFAULT,
  validateCBTCurriculumUnitExtendedFields,
  normalizeCBTCurriculumUnitExtendedFields,
} from '../../src/lib/cbtCurriculumUnitSchema.js';

// ─── Test fixture helpers ─────────────────────────────────────────────────────

/**
 * A minimal old-format CBTCurriculumUnit record — only core required fields,
 * no Wave 4A.2 extended fields.
 */
const _OLD_RECORD = Object.freeze({
  unit_type: 'concept',
  title: 'Cognitive Model Overview',
  clinical_topic: 'general',
  when_to_use: 'When client has no prior CBT exposure',
  clinical_purpose: 'Introduce the cognitive model',
  content: 'Thoughts, feelings, and behaviours are interconnected.',
  agent_usage_rules: 'Paraphrase; do not quote verbatim.',
});

/**
 * A record with all five new extended fields set to valid values.
 */
const _FULL_EXTENDED_RECORD = Object.freeze({
  ..._OLD_RECORD,
  distress_suitability: 'any',
  intervention_family: 'psychoeducation',
  evidence_level: 'established',
  treatment_arc_position: 'early',
  safety_tags: ['psychoeducation_safe', 'validated_protocol'],
});

// ─── A. Module exports ────────────────────────────────────────────────────────

describe('A. Module exports the expected public symbols', () => {
  it('exports CBT_CURRICULUM_SCHEMA_VERSION', () => {
    expect(CBT_CURRICULUM_SCHEMA_VERSION).toBeDefined();
  });

  it('exports CBT_DISTRESS_SUITABILITY', () => {
    expect(CBT_DISTRESS_SUITABILITY).toBeDefined();
  });

  it('exports CBT_DISTRESS_SUITABILITY_VALUES', () => {
    expect(CBT_DISTRESS_SUITABILITY_VALUES).toBeDefined();
  });

  it('exports CBT_INTERVENTION_FAMILY', () => {
    expect(CBT_INTERVENTION_FAMILY).toBeDefined();
  });

  it('exports CBT_INTERVENTION_FAMILY_VALUES', () => {
    expect(CBT_INTERVENTION_FAMILY_VALUES).toBeDefined();
  });

  it('exports CBT_EVIDENCE_LEVEL', () => {
    expect(CBT_EVIDENCE_LEVEL).toBeDefined();
  });

  it('exports CBT_EVIDENCE_LEVEL_VALUES', () => {
    expect(CBT_EVIDENCE_LEVEL_VALUES).toBeDefined();
  });

  it('exports CBT_TREATMENT_ARC_POSITION', () => {
    expect(CBT_TREATMENT_ARC_POSITION).toBeDefined();
  });

  it('exports CBT_TREATMENT_ARC_POSITION_VALUES', () => {
    expect(CBT_TREATMENT_ARC_POSITION_VALUES).toBeDefined();
  });

  it('exports CBT_SAFETY_TAG', () => {
    expect(CBT_SAFETY_TAG).toBeDefined();
  });

  it('exports CBT_SAFETY_TAG_VALUES', () => {
    expect(CBT_SAFETY_TAG_VALUES).toBeDefined();
  });

  it('exports validateCBTCurriculumUnitExtendedFields as a function', () => {
    expect(typeof validateCBTCurriculumUnitExtendedFields).toBe('function');
  });

  it('exports normalizeCBTCurriculumUnitExtendedFields as a function', () => {
    expect(typeof normalizeCBTCurriculumUnitExtendedFields).toBe('function');
  });
});

// ─── B. Version ───────────────────────────────────────────────────────────────

describe('B. CBT_CURRICULUM_SCHEMA_VERSION is a non-empty string', () => {
  it('is a string', () => {
    expect(typeof CBT_CURRICULUM_SCHEMA_VERSION).toBe('string');
  });

  it('is non-empty', () => {
    expect(CBT_CURRICULUM_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

// ─── C–L. Constant shapes ─────────────────────────────────────────────────────

describe('C. CBT_DISTRESS_SUITABILITY is a frozen non-empty object', () => {
  it('is an object', () => {
    expect(typeof CBT_DISTRESS_SUITABILITY).toBe('object');
    expect(CBT_DISTRESS_SUITABILITY).not.toBeNull();
  });

  it('is non-empty', () => {
    expect(Object.keys(CBT_DISTRESS_SUITABILITY).length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_DISTRESS_SUITABILITY)).toBe(true);
  });
});

describe('D. CBT_DISTRESS_SUITABILITY_VALUES is a frozen Set', () => {
  it('is a Set', () => {
    expect(CBT_DISTRESS_SUITABILITY_VALUES).toBeInstanceOf(Set);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_DISTRESS_SUITABILITY_VALUES)).toBe(true);
  });

  it('is non-empty', () => {
    expect(CBT_DISTRESS_SUITABILITY_VALUES.size).toBeGreaterThan(0);
  });
});

describe('E. CBT_INTERVENTION_FAMILY is a frozen non-empty object', () => {
  it('is an object', () => {
    expect(typeof CBT_INTERVENTION_FAMILY).toBe('object');
    expect(CBT_INTERVENTION_FAMILY).not.toBeNull();
  });

  it('is non-empty', () => {
    expect(Object.keys(CBT_INTERVENTION_FAMILY).length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_INTERVENTION_FAMILY)).toBe(true);
  });
});

describe('F. CBT_INTERVENTION_FAMILY_VALUES is a frozen Set', () => {
  it('is a Set', () => {
    expect(CBT_INTERVENTION_FAMILY_VALUES).toBeInstanceOf(Set);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_INTERVENTION_FAMILY_VALUES)).toBe(true);
  });
});

describe('G. CBT_EVIDENCE_LEVEL is a frozen non-empty object', () => {
  it('is an object', () => {
    expect(typeof CBT_EVIDENCE_LEVEL).toBe('object');
  });

  it('is non-empty', () => {
    expect(Object.keys(CBT_EVIDENCE_LEVEL).length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_EVIDENCE_LEVEL)).toBe(true);
  });
});

describe('H. CBT_EVIDENCE_LEVEL_VALUES is a frozen Set', () => {
  it('is a Set', () => {
    expect(CBT_EVIDENCE_LEVEL_VALUES).toBeInstanceOf(Set);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_EVIDENCE_LEVEL_VALUES)).toBe(true);
  });
});

describe('I. CBT_TREATMENT_ARC_POSITION is a frozen non-empty object', () => {
  it('is an object', () => {
    expect(typeof CBT_TREATMENT_ARC_POSITION).toBe('object');
  });

  it('is non-empty', () => {
    expect(Object.keys(CBT_TREATMENT_ARC_POSITION).length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_TREATMENT_ARC_POSITION)).toBe(true);
  });
});

describe('J. CBT_TREATMENT_ARC_POSITION_VALUES is a frozen Set', () => {
  it('is a Set', () => {
    expect(CBT_TREATMENT_ARC_POSITION_VALUES).toBeInstanceOf(Set);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_TREATMENT_ARC_POSITION_VALUES)).toBe(true);
  });
});

describe('K. CBT_SAFETY_TAG is a frozen non-empty object', () => {
  it('is an object', () => {
    expect(typeof CBT_SAFETY_TAG).toBe('object');
  });

  it('is non-empty', () => {
    expect(Object.keys(CBT_SAFETY_TAG).length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_SAFETY_TAG)).toBe(true);
  });
});

describe('L. CBT_SAFETY_TAG_VALUES is a frozen Set', () => {
  it('is a Set', () => {
    expect(CBT_SAFETY_TAG_VALUES).toBeInstanceOf(Set);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CBT_SAFETY_TAG_VALUES)).toBe(true);
  });
});

// ─── O–R. Backward compatibility ─────────────────────────────────────────────

describe('O–R. Backward compatibility — old records without new fields', () => {
  it('O. Old record (no new fields) passes validation', () => {
    const result = validateCBTCurriculumUnitExtendedFields(_OLD_RECORD);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('P. Record with only required core fields passes validation', () => {
    const minimal = {
      unit_type: 'intervention',
      title: 'Grounding exercise',
      clinical_topic: 'grounding',
      when_to_use: 'During acute anxiety',
      clinical_purpose: 'Reduce arousal',
      content: 'Focus on 5 senses.',
      agent_usage_rules: 'Paraphrase.',
    };
    const result = validateCBTCurriculumUnitExtendedFields(minimal);
    expect(result.valid).toBe(true);
  });

  it('Q. Record with undefined extended fields passes validation', () => {
    const record = {
      ..._OLD_RECORD,
      distress_suitability: undefined,
      intervention_family: undefined,
      evidence_level: undefined,
      treatment_arc_position: undefined,
      safety_tags: undefined,
    };
    const result = validateCBTCurriculumUnitExtendedFields(record);
    expect(result.valid).toBe(true);
  });

  it('R. Old record normalizes to defaults without altering existing fields', () => {
    const normalized = normalizeCBTCurriculumUnitExtendedFields(_OLD_RECORD);
    // All original fields preserved
    expect(normalized.unit_type).toBe(_OLD_RECORD.unit_type);
    expect(normalized.title).toBe(_OLD_RECORD.title);
    expect(normalized.content).toBe(_OLD_RECORD.content);
    // Defaults applied
    expect(normalized.distress_suitability).toBe('any');
    expect(normalized.evidence_level).toBe('unclassified');
    expect(normalized.treatment_arc_position).toBe('any');
    expect(normalized.safety_tags).toEqual([]);
  });
});

// ─── S–X. distress_suitability ───────────────────────────────────────────────

describe('S–X. distress_suitability field', () => {
  it('S. Valid value "any" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ distress_suitability: 'any' });
    expect(r.valid).toBe(true);
  });

  it('T. Valid value "low_only" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ distress_suitability: 'low_only' });
    expect(r.valid).toBe(true);
  });

  it('U. Valid value "mild_and_below" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ distress_suitability: 'mild_and_below' });
    expect(r.valid).toBe(true);
  });

  it('V. Unknown string value is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ distress_suitability: 'high_distress_ok' });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain('distress_suitability');
  });

  it('W. Absent field is valid (backward compatible)', () => {
    const r = validateCBTCurriculumUnitExtendedFields({});
    expect(r.valid).toBe(true);
  });

  it('X. Default when absent is "any"', () => {
    expect(CBT_DISTRESS_SUITABILITY_DEFAULT).toBe('any');
  });
});

// ─── Y–AG. intervention_family ───────────────────────────────────────────────

describe('Y–AG. intervention_family field', () => {
  it.each([
    ['Y', 'cognitive'],
    ['Z', 'behavioral'],
    ['AA', 'acceptance'],
    ['AB', 'psychoeducation'],
    ['AC', 'mixed'],
    ['AD', 'other'],
  ])('%s. Valid value "%s" is accepted', (_label, value) => {
    const r = validateCBTCurriculumUnitExtendedFields({ intervention_family: value });
    expect(r.valid).toBe(true);
  });

  it('AE. Unknown string value is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ intervention_family: 'somatic' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('intervention_family');
  });

  it('AF. Absent field is valid (backward compatible)', () => {
    const r = validateCBTCurriculumUnitExtendedFields({});
    expect(r.valid).toBe(true);
  });

  it('AG. intervention_family has no default — remains absent after normalize when not present', () => {
    const record = { title: 'test' };
    const normalized = normalizeCBTCurriculumUnitExtendedFields(record);
    expect('intervention_family' in normalized).toBe(false);
  });
});

// ─── AH–AN. evidence_level ───────────────────────────────────────────────────

describe('AH–AN. evidence_level field', () => {
  it('AH. Valid value "established" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ evidence_level: 'established' });
    expect(r.valid).toBe(true);
  });

  it('AI. Valid value "emerging" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ evidence_level: 'emerging' });
    expect(r.valid).toBe(true);
  });

  it('AJ. Valid value "expert_consensus" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ evidence_level: 'expert_consensus' });
    expect(r.valid).toBe(true);
  });

  it('AK. Valid value "unclassified" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ evidence_level: 'unclassified' });
    expect(r.valid).toBe(true);
  });

  it('AL. Unknown string value is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ evidence_level: 'rct_level_1' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('evidence_level');
  });

  it('AM. Absent field is valid (backward compatible)', () => {
    const r = validateCBTCurriculumUnitExtendedFields({});
    expect(r.valid).toBe(true);
  });

  it('AN. Default when absent is "unclassified"', () => {
    expect(CBT_EVIDENCE_LEVEL_DEFAULT).toBe('unclassified');
  });
});

// ─── AO–AU. treatment_arc_position ───────────────────────────────────────────

describe('AO–AU. treatment_arc_position field', () => {
  it('AO. Valid value "early" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'early' });
    expect(r.valid).toBe(true);
  });

  it('AP. Valid value "middle" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'middle' });
    expect(r.valid).toBe(true);
  });

  it('AQ. Valid value "late" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'late' });
    expect(r.valid).toBe(true);
  });

  it('AR. Valid value "any" is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'any' });
    expect(r.valid).toBe(true);
  });

  it('AS. Unknown string value is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'crisis' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('treatment_arc_position');
  });

  it('AT. Absent field is valid (backward compatible)', () => {
    const r = validateCBTCurriculumUnitExtendedFields({});
    expect(r.valid).toBe(true);
  });

  it('AU. Default when absent is "any"', () => {
    expect(CBT_TREATMENT_ARC_POSITION_DEFAULT).toBe('any');
  });
});

// ─── AV–BD. safety_tags ──────────────────────────────────────────────────────

describe('AV–BD. safety_tags field', () => {
  it('AV. Empty array is valid', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: [] });
    expect(r.valid).toBe(true);
  });

  it('AW. Array with valid single tag is accepted', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: ['not_for_crisis'] });
    expect(r.valid).toBe(true);
  });

  it('AX. Array with all valid tags is accepted', () => {
    const allTags = [...CBT_SAFETY_TAG_VALUES];
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: allTags });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it.each([
    'not_for_crisis',
    'requires_rapport',
    'psychoeducation_safe',
    'validated_protocol',
    'not_for_high_distress',
    'exposure_adjacent',
  ])('AY. Tag "%s" is approved and accepted', (tag) => {
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: [tag] });
    expect(r.valid).toBe(true);
  });

  it('AZ. Unknown tag in array is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: ['crisis_ok', 'not_for_crisis'] });
    expect(r.valid).toBe(false);
    expect(r.unknownTags).toContain('crisis_ok');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('BA. Non-array value is rejected with error', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ safety_tags: 'not_for_crisis' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('safety_tags');
  });

  it('BB. Absent field is valid (backward compatible)', () => {
    const r = validateCBTCurriculumUnitExtendedFields({});
    expect(r.valid).toBe(true);
  });

  it('BC. Default for safety_tags when absent is []', () => {
    expect(CBT_SAFETY_TAGS_DEFAULT).toEqual([]);
  });

  it('BD. Normalizer applies empty array default when safety_tags is absent', () => {
    const normalized = normalizeCBTCurriculumUnitExtendedFields({ title: 'test' });
    expect(normalized.safety_tags).toEqual([]);
  });
});

// ─── BE–BG. Multiple invalid fields ──────────────────────────────────────────

describe('BE–BG. Multiple invalid fields → all errors reported', () => {
  it('BE. Two invalid fields → two or more errors reported', () => {
    const r = validateCBTCurriculumUnitExtendedFields({
      distress_suitability: 'very_high',
      evidence_level: 'gold_standard',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('BF. errors array is always an array', () => {
    const r1 = validateCBTCurriculumUnitExtendedFields(_OLD_RECORD);
    const r2 = validateCBTCurriculumUnitExtendedFields({ distress_suitability: 'bad' });
    expect(Array.isArray(r1.errors)).toBe(true);
    expect(Array.isArray(r2.errors)).toBe(true);
  });

  it('BG. unknownTags array is always an array', () => {
    const r1 = validateCBTCurriculumUnitExtendedFields(_OLD_RECORD);
    const r2 = validateCBTCurriculumUnitExtendedFields({ safety_tags: ['bad_tag'] });
    expect(Array.isArray(r1.unknownTags)).toBe(true);
    expect(Array.isArray(r2.unknownTags)).toBe(true);
  });
});

// ─── BH–BI. valid boolean ─────────────────────────────────────────────────────

describe('BH–BI. valid is a boolean', () => {
  it('BH. valid is true when all present fields are valid', () => {
    const r = validateCBTCurriculumUnitExtendedFields(_FULL_EXTENDED_RECORD);
    expect(r.valid).toBe(true);
  });

  it('BI. valid is false when any field is invalid', () => {
    const r = validateCBTCurriculumUnitExtendedFields({ treatment_arc_position: 'never' });
    expect(r.valid).toBe(false);
  });
});

// ─── BJ–BT. Normalizer behavior ──────────────────────────────────────────────

describe('BJ–BT. Normalizer', () => {
  it('BJ. normalizer does not mutate the input record', () => {
    const input = { ..._OLD_RECORD };
    const inputCopy = { ..._OLD_RECORD };
    normalizeCBTCurriculumUnitExtendedFields(input);
    expect(input).toEqual(inputCopy);
  });

  it('BK. normalizer returns a new object', () => {
    const input = { ..._OLD_RECORD };
    const result = normalizeCBTCurriculumUnitExtendedFields(input);
    expect(result).not.toBe(input);
  });

  it('BL. normalizer applies distress_suitability default when absent', () => {
    const result = normalizeCBTCurriculumUnitExtendedFields({ title: 'x' });
    expect(result.distress_suitability).toBe('any');
  });

  it('BM. normalizer applies evidence_level default when absent', () => {
    const result = normalizeCBTCurriculumUnitExtendedFields({ title: 'x' });
    expect(result.evidence_level).toBe('unclassified');
  });

  it('BN. normalizer applies treatment_arc_position default when absent', () => {
    const result = normalizeCBTCurriculumUnitExtendedFields({ title: 'x' });
    expect(result.treatment_arc_position).toBe('any');
  });

  it('BO. normalizer applies safety_tags default when absent', () => {
    const result = normalizeCBTCurriculumUnitExtendedFields({ title: 'x' });
    expect(result.safety_tags).toEqual([]);
  });

  it('BP. normalizer does NOT override a valid existing value', () => {
    const input = {
      distress_suitability: 'low_only',
      evidence_level: 'established',
      treatment_arc_position: 'late',
      safety_tags: ['requires_rapport'],
    };
    const result = normalizeCBTCurriculumUnitExtendedFields(input);
    expect(result.distress_suitability).toBe('low_only');
    expect(result.evidence_level).toBe('established');
    expect(result.treatment_arc_position).toBe('late');
    expect(result.safety_tags).toEqual(['requires_rapport']);
  });

  it('BQ. normalizer does NOT override an invalid value (validator responsibility)', () => {
    const input = { distress_suitability: 'invalid_value' };
    const result = normalizeCBTCurriculumUnitExtendedFields(input);
    expect(result.distress_suitability).toBe('invalid_value');
  });

  it('BR. normalizer preserves all non-extended fields unchanged', () => {
    const result = normalizeCBTCurriculumUnitExtendedFields(_OLD_RECORD);
    expect(result.unit_type).toBe(_OLD_RECORD.unit_type);
    expect(result.title).toBe(_OLD_RECORD.title);
    expect(result.clinical_topic).toBe(_OLD_RECORD.clinical_topic);
    expect(result.when_to_use).toBe(_OLD_RECORD.when_to_use);
    expect(result.clinical_purpose).toBe(_OLD_RECORD.clinical_purpose);
    expect(result.content).toBe(_OLD_RECORD.content);
    expect(result.agent_usage_rules).toBe(_OLD_RECORD.agent_usage_rules);
  });

  it('BS. normalizer on null returns null (no throw)', () => {
    expect(() => normalizeCBTCurriculumUnitExtendedFields(null)).not.toThrow();
    expect(normalizeCBTCurriculumUnitExtendedFields(null)).toBeNull();
  });

  it('BT. normalizer on array returns array unchanged (no throw)', () => {
    const arr = ['a', 'b'];
    expect(() => normalizeCBTCurriculumUnitExtendedFields(arr)).not.toThrow();
    expect(normalizeCBTCurriculumUnitExtendedFields(arr)).toBe(arr);
  });
});

// ─── BU–BW. No runtime behavior impact ───────────────────────────────────────

describe('BU–BW. No runtime behavior impact', () => {
  it('BU. No COMPANION_ prefix in any exported constant key or value', () => {
    const allExports = {
      ...CBT_DISTRESS_SUITABILITY,
      ...CBT_INTERVENTION_FAMILY,
      ...CBT_EVIDENCE_LEVEL,
      ...CBT_TREATMENT_ARC_POSITION,
      ...CBT_SAFETY_TAG,
    };
    for (const [key, val] of Object.entries(allExports)) {
      expect(key).not.toMatch(/companion/i);
      expect(String(val)).not.toMatch(/companion/i);
    }
  });

  it('BV. No private entity field names appear in any export value', () => {
    const privateFields = [
      'ThoughtJournal', 'Conversation', 'CaseFormulation',
      'MoodEntry', 'CompanionMemory', 'UserDeletedConversations',
    ];
    const allValues = [
      ...Object.values(CBT_DISTRESS_SUITABILITY),
      ...Object.values(CBT_INTERVENTION_FAMILY),
      ...Object.values(CBT_EVIDENCE_LEVEL),
      ...Object.values(CBT_TREATMENT_ARC_POSITION),
      ...Object.values(CBT_SAFETY_TAG),
    ];
    for (const val of allValues) {
      for (const priv of privateFields) {
        expect(val).not.toContain(priv);
      }
    }
  });

  it('BW. Validation result contains no private entity field names', () => {
    const result = validateCBTCurriculumUnitExtendedFields(_FULL_EXTENDED_RECORD);
    const resultStr = JSON.stringify(result);
    const privateFields = [
      'ThoughtJournal', 'Conversation', 'CaseFormulation',
      'MoodEntry', 'CompanionMemory',
    ];
    for (const priv of privateFields) {
      expect(resultStr).not.toContain(priv);
    }
  });
});

// ─── BX–CB. Enum set completeness ────────────────────────────────────────────

describe('BX–CB. Enum set completeness', () => {
  it('BX. CBT_DISTRESS_SUITABILITY has exactly 3 values', () => {
    expect(Object.keys(CBT_DISTRESS_SUITABILITY)).toHaveLength(3);
  });

  it('BY. CBT_INTERVENTION_FAMILY has exactly 6 values', () => {
    expect(Object.keys(CBT_INTERVENTION_FAMILY)).toHaveLength(6);
  });

  it('BZ. CBT_EVIDENCE_LEVEL has exactly 4 values', () => {
    expect(Object.keys(CBT_EVIDENCE_LEVEL)).toHaveLength(4);
  });

  it('CA. CBT_TREATMENT_ARC_POSITION has exactly 4 values', () => {
    expect(Object.keys(CBT_TREATMENT_ARC_POSITION)).toHaveLength(4);
  });

  it('CB. CBT_SAFETY_TAG has exactly 6 values', () => {
    expect(Object.keys(CBT_SAFETY_TAG)).toHaveLength(6);
  });
});

// ─── CC–CD. Frozen object safety ─────────────────────────────────────────────

describe('CC–CD. Frozen object safety', () => {
  it('CC. Attempting to mutate CBT_DISTRESS_SUITABILITY fails silently / throws in strict mode', () => {
    expect(() => {
      'use strict';
      CBT_DISTRESS_SUITABILITY.EXTRA = 'extra';
    }).toThrow();
  });

  it('CD. Attempting to mutate CBT_SAFETY_TAG fails silently / throws in strict mode', () => {
    expect(() => {
      'use strict';
      CBT_SAFETY_TAG.EXTRA = 'extra';
    }).toThrow();
  });
});

// ─── CE–CI. Fail-safe: validator never throws ─────────────────────────────────

describe('CE–CI. Fail-safe: validator never throws on bad inputs', () => {
  it('CE. Passing null returns valid: false, no throw', () => {
    expect(() => validateCBTCurriculumUnitExtendedFields(null)).not.toThrow();
    expect(validateCBTCurriculumUnitExtendedFields(null).valid).toBe(false);
  });

  it('CF. Passing undefined returns valid: false, no throw', () => {
    expect(() => validateCBTCurriculumUnitExtendedFields(undefined)).not.toThrow();
    expect(validateCBTCurriculumUnitExtendedFields(undefined).valid).toBe(false);
  });

  it('CG. Passing a number returns valid: false, no throw', () => {
    expect(() => validateCBTCurriculumUnitExtendedFields(42)).not.toThrow();
    expect(validateCBTCurriculumUnitExtendedFields(42).valid).toBe(false);
  });

  it('CH. Passing a string returns valid: false, no throw', () => {
    expect(() => validateCBTCurriculumUnitExtendedFields('record')).not.toThrow();
    expect(validateCBTCurriculumUnitExtendedFields('record').valid).toBe(false);
  });

  it('CI. Passing an array returns valid: false, no throw', () => {
    expect(() => validateCBTCurriculumUnitExtendedFields([])).not.toThrow();
    expect(validateCBTCurriculumUnitExtendedFields([]).valid).toBe(false);
  });
});
