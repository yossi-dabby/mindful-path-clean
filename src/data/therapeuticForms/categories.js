/**
 * TherapeuticForms — Taxonomy
 *
 * Defines the stable audience-group and therapeutic-category taxonomies
 * used across the TherapeuticForms library.
 *
 * These values are used as enum-like identifiers throughout the library.
 * Do not rename or remove entries without updating all dependent code.
 */

// ─── Audience Groups ──────────────────────────────────────────────────────────

/**
 * Primary audience taxonomy.
 * Every form in the library belongs to exactly one audience group.
 */
export const AUDIENCE_GROUPS = [
  {
    value: 'children',
    /** User-facing Hebrew label */
    label_he: 'ילדים',
    label_en: 'Children',
    /** Canonical age range for eligibility gate (inclusive). age_max: 11 per clinical spec. */
    age_min: 5,
    age_max: 11,
  },
  {
    value: 'adolescents',
    label_he: 'מתבגרים',
    label_en: 'Adolescents',
    age_min: 12,
    age_max: 17,
  },
  {
    value: 'adults',
    label_he: 'מבוגרים',
    label_en: 'Adults',
    age_min: 18,
    age_max: null,
  },
  {
    value: 'older_adults',
    label_he: 'קשישים',
    label_en: 'Older Adults',
    age_min: 65,
    age_max: null,
  },
];

/** Set of valid audience group values for fast lookup. */
export const VALID_AUDIENCE_VALUES = new Set(AUDIENCE_GROUPS.map(a => a.value));

// ─── Therapeutic Categories ───────────────────────────────────────────────────

/**
 * Therapeutic category taxonomy.
 * Categories are neutral and non-alarming.
 * Do not add a "crisis_forms" category — crisis handling follows separate app safety flows.
 */
export const THERAPEUTIC_CATEGORIES = [
  { value: 'thought_records',         label_en: 'Thought Records' },
  { value: 'cognitive_distortions',   label_en: 'Cognitive Distortions' },
  { value: 'emotional_regulation',    label_en: 'Emotional Regulation' },
  { value: 'behavioral_activation',   label_en: 'Behavioral Activation' },
  { value: 'anxiety_tools',           label_en: 'Anxiety Tools' },
  { value: 'depression_tools',        label_en: 'Depression Tools' },
  { value: 'anger_management',        label_en: 'Anger Management' },
  { value: 'social_skills',           label_en: 'Social Skills' },
  { value: 'sleep',                   label_en: 'Sleep' },
  { value: 'goals_and_values',        label_en: 'Goals & Values' },
  { value: 'parent_guidance',         label_en: 'Parent Guidance' },
  { value: 'caregiver_support',       label_en: 'Caregiver Support' },
  { value: 'coping_tools',            label_en: 'Coping Tools' },
  { value: 'weekly_practice',         label_en: 'Weekly Practice' },
  { value: 'reflection_journal',      label_en: 'Reflection Journal' },
  { value: 'workbook_series',         label_en: 'Therapeutic Workbooks' },
  { value: 'children_cbt_process',    label_en: 'Children CBT Process' },
  { value: 'children_cbt_core',       label_en: 'Children CBT Core' },
  { value: 'children_cbt_specialized', label_en: 'Children CBT Specialized' },
  { value: 'adolescents_cbt_core',    label_en: 'Adolescent CBT Core' },
  { value: 'adolescents_cbt_specialized', label_en: 'Adolescent CBT Specialized' },
];

/** Set of valid category values for fast lookup. */
export const VALID_CATEGORY_VALUES = new Set(THERAPEUTIC_CATEGORIES.map(c => c.value));

// ─── Supported Languages ──────────────────────────────────────────────────────

/** All languages supported by the TherapeuticForms library. */
export const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

/** Languages that use right-to-left text direction. */
export const RTL_LANGUAGES = new Set(['he']);
