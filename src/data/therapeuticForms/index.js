/**
 * TherapeuticForms — Public Index
 *
 * The single entry point for the TherapeuticForms library.
 *
 * Exports:
 *   - Taxonomy: AUDIENCE_GROUPS, THERAPEUTIC_CATEGORIES, SUPPORTED_LANGUAGES, RTL_LANGUAGES
 *   - Registry: ALL_FORMS (aggregated, read-only)
 *   - Resolver: all resolver utility functions
 *
 * Usage:
 *   import { listFormsByAudience, resolveFormWithLanguage } from '@/data/therapeuticForms';
 */

import GENERATED_THERAPEUTIC_FORMS_INDEX from '../../generated/therapeutic-forms-index.json';
import { SUPPORTED_LANGUAGES, VALID_AUDIENCE_VALUES } from './categories.js';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from './availability.js';

// ─── Taxonomy ─────────────────────────────────────────────────────────────────
export {
  AUDIENCE_GROUPS,
  THERAPEUTIC_CATEGORIES,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  VALID_AUDIENCE_VALUES,
  VALID_CATEGORY_VALUES,
} from './categories.js';

// ─── Per-audience form registries ─────────────────────────────────────────────
export { FORMS_CHILDREN }              from './forms.children.js';
export { FORMS_CHILDREN_CBT_PREMIUM }  from './forms.children.cbt-premium.js';
export { FORMS_CHILDREN_CBT_SPECIALIZED } from './forms.children.cbt-specialized.js';
export { FORMS_CHILDREN_CBT_SPECIALIZED_HE } from './forms.children.cbt-specialized.he.js';
export { FORMS_CHILDREN_CBT_CORE_EN } from './forms.children.cbt-core.en.js';
export { FORMS_CHILDREN_CBT_CORE_HE } from './forms.children.cbt-core.he.js';
export { FORMS_ADOLESCENTS }           from './forms.adolescents.js';
export { FORMS_ADOLESCENTS_CBT_CORE_EN } from './forms.adolescents.cbt-core.en.js';
export { FORMS_ADOLESCENTS_CBT_CORE_HE } from './forms.adolescents.cbt-core.he.js';
export { FORMS_ADOLESCENTS_CBT_SPECIALIZED }  from './forms.adolescents.cbt-specialized.js';
export { FORMS_ADOLESCENTS_CBT_SPECIALIZED_EN } from './forms.adolescents.cbt-specialized.en.js';
export { FORMS_ADOLESCENTS_CBT_SPECIALIZED_HE } from './forms.adolescents.cbt-specialized.he.js';
export { FORMS_ADULTS }                from './forms.adults.js';
export { FORMS_OLDER_ADULTS }          from './forms.olderAdults.js';

// ─── Aggregated registry ──────────────────────────────────────────────────────

function buildCanonicalRegistry(forms) {
  const byId = new Map();
  for (const form of forms) {
    if (!form?.id) continue;
    if (byId.has(form.id)) {
      if (import.meta.env?.DEV) {
        console.warn(`[TherapeuticForms] Duplicate form id in canonical registry ignored: ${form.id}`);
      }
      continue;
    }
    byId.set(form.id, form);
  }
  return Object.freeze(Array.from(byId.values()));
}

/**
 * The complete, aggregated therapeutic forms registry.
 * This is the single source of truth consumed by the resolver.
 *
 * Adding new forms: add approved PDF assets and manifest metadata, then
 * regenerate the canonical index. Retired per-package exports stay empty.
 *
 * @type {readonly object[]}
 */
// Compatibility seam: no retired or metadata-only catalog is retained.
export const THERAPEUTIC_FORMS_CATALOG = Object.freeze([]);

export const ALL_FORMS = buildCanonicalRegistry([
  // Future approved content is discovered from the canonical installed-files index.
  ...GENERATED_THERAPEUTIC_FORMS_INDEX,
]);

function hashStringFNV1a(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildTherapeuticFormsPolicyVersion(forms) {
  const serialized = forms
    .map((form) => [
      form?.id || '',
      form?.language || '',
      form?.audience || '',
      form?.category || '',
      form?.file_path || form?.filePath || form?.fileUrl || '',
    ].join('|'))
    .sort()
    .join('\n');

  return `forms-${forms.length}-${hashStringFNV1a(serialized)}`;
}

export const THERAPEUTIC_FORMS_POLICY_VERSION = buildTherapeuticFormsPolicyVersion(ALL_FORMS);

const FORM_INDEX_SOURCE_PATH = 'src/generated/therapeutic-forms-index.json';
const SUPPORTED_LANG_SET = new Set(SUPPORTED_LANGUAGES);
const VALID_AUDIENCE_SET = new Set(VALID_AUDIENCE_VALUES);
const LANGUAGE_ALIAS_MAP = Object.freeze({
  english: 'en',
  hebrew: 'he',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
});
const AUDIENCE_ALIAS_MAP = Object.freeze({
  child: 'children',
  children: 'children',
  kid: 'children',
  kids: 'children',
  adolescent: 'adolescents',
  adolescents: 'adolescents',
  teen: 'adolescents',
  teens: 'adolescents',
  teenager: 'adolescents',
  teenagers: 'adolescents',
  adult: 'adults',
  adults: 'adults',
  older_adult: 'older_adults',
  older_adults: 'older_adults',
  'older-adult': 'older_adults',
  'older-adults': 'older_adults',
  parent: 'parents',
  parents: 'parents',
});

function normalizeLanguageFilter(language) {
  if (typeof language !== 'string' || !language.trim()) return null;
  const lower = language.trim().toLowerCase();
  const aliased = LANGUAGE_ALIAS_MAP[lower] || lower;
  const base = aliased.split('-')[0];
  return SUPPORTED_LANG_SET.has(base) ? base : null;
}

function normalizeAudienceFilter(audience) {
  if (typeof audience !== 'string' || !audience.trim()) return null;
  const lower = audience.trim().toLowerCase();
  const normalized = AUDIENCE_ALIAS_MAP[lower] || lower;
  return VALID_AUDIENCE_SET.has(normalized) ? normalized : null;
}

function resolveEnvironmentLabel(environmentOverride) {
  if (typeof environmentOverride === 'string' && environmentOverride.trim()) {
    return environmentOverride.trim();
  }
  return import.meta.env?.MODE || (import.meta.env?.PROD ? 'production' : 'unknown');
}

export function getTherapeuticFormsPolicyVersion() {
  return THERAPEUTIC_FORMS_POLICY_VERSION;
}

export function getAllTherapeuticForms(options = {}) {
  const forms = ALL_FORMS;
  const diagnostics = {
    environment: resolveEnvironmentLabel(options.environment),
    source: FORM_INDEX_SOURCE_PATH,
    generatedIndexImported: Array.isArray(GENERATED_THERAPEUTIC_FORMS_INDEX),
    formsCount: forms.length,
  };

  if (forms.length === 0 && THERAPEUTIC_FORMS_CONTENT_AVAILABLE) {
    console.error('[TherapeuticForms] Canonical registry is empty.', diagnostics);
  }

  return forms;
}

export function getTherapeuticFormsForAI({ language, audience, environment } = {}) {
  const allForms = getAllTherapeuticForms({ environment });
  const normalizedLanguage = normalizeLanguageFilter(language);
  const normalizedAudience = normalizeAudienceFilter(audience);

  const beforeFiltersCount = allForms.length;
  const filtered = allForms.filter((form) => {
    if (form?.approved !== true) return false;
    if (normalizedLanguage && form?.language !== normalizedLanguage) return false;
    if (normalizedAudience && form?.audience !== normalizedAudience) return false;
    return true;
  });

  const aiForms = filtered.map((form) => {
    const languageCode = form.language || normalizedLanguage || 'en';
    const languageBlock = form.languages?.[languageCode] || form.languages?.en || null;
    return {
      id: form.id,
      approved: true,
      title: form.title || languageBlock?.title || form.id,
      localizedTitle: languageBlock?.title || form.title || form.id,
      description: form.description || languageBlock?.description || null,
      localizedDescription: languageBlock?.description || form.description || null,
      audience: form.audience || null,
      language: form.language || null,
      category: form.category || null,
      subcategory: form.subcategory || form.series || form.moduleTitle || null,
      collectionId: form.collectionId || null,
      collectionType: form.collectionType || null,
      module: form.moduleTitle || form.module_title || null,
      stage: form.stageTitle || null,
      topic: form.subcategory || form.moduleTitle || form.module_title || null,
      clinicalDomain: form.clinicalDomain || null,
      therapeuticGoal: form.therapeuticGoal || form.therapeutic_goal || null,
      whenToUse: form.whenToUse || form.when_to_use || null,
      clinicalKeywords: Array.isArray(form.clinicalKeywords) ? form.clinicalKeywords : (Array.isArray(form.keywords) ? form.keywords : []),
      intentPhrases: Array.isArray(form.intentPhrases) ? form.intentPhrases : [],
      notFor: Array.isArray(form.notFor) ? form.notFor : [],
      aiMatchingSummary: form.aiMatchingSummary || form.ai_matching_summary || null,
      safetyNotes: form.safetyNotes || form.safety_notes || null,
      therapeutic_goal: form.therapeutic_goal || form.therapeuticGoal || null,
      when_to_use: form.when_to_use || form.whenToUse || null,
      keywords: Array.isArray(form.keywords) ? form.keywords : (Array.isArray(form.clinicalKeywords) ? form.clinicalKeywords : []),
      ai_matching_summary: form.ai_matching_summary || form.aiMatchingSummary || null,
      safety_notes: form.safety_notes || form.safetyNotes || null,
      file_path: form.file_path || form.filePath || null,
      filePath: form.filePath || form.file_path || null,
      file_url: form.fileUrl || languageBlock?.file_url || null,
      fileUrl: form.fileUrl || languageBlock?.file_url || null,
      type: form.type || null,
      isCombinedPdf: form.isCombinedPdf === true,
      module_number: form.module_number ?? form.moduleNumber ?? null,
      worksheet_number: form.worksheet_number ?? form.worksheetNumber ?? form.formNumber ?? null,
      logical_form_id: form.logical_form_id || null,
      variant_language: form.variant_language || null,
      available_languages: Array.isArray(form.available_languages) ? form.available_languages : [],
      sibling_variant_ids: Array.isArray(form.sibling_variant_ids) ? form.sibling_variant_ids : [],
      source_language: form.source_language || null,
      is_language_variant: form.is_language_variant === true,
      variant_group_id: form.variant_group_id || null,
    };
  });

  const diagnostics = {
    environment: resolveEnvironmentLabel(environment),
    registrySourcePath: FORM_INDEX_SOURCE_PATH,
    generatedIndexImported: Array.isArray(GENERATED_THERAPEUTIC_FORMS_INDEX),
    activeLanguage: normalizedLanguage || null,
    activeAudienceFilter: normalizedAudience || null,
    formsLengthBeforeFilters: beforeFiltersCount,
    formsLengthAfterFilters: aiForms.length,
  };

  if (import.meta.env?.PROD && THERAPEUTIC_FORMS_CONTENT_AVAILABLE && aiForms.length === 0) {
    console.error('[TherapeuticForms][AI] No forms available after filters in production.', diagnostics);
  }

  return aiForms;
}

export function getTherapeuticFormsRegistryDiagnostics(forms = ALL_FORMS) {
  const diagnostics = {
    total: forms.length,
    byLanguage: {},
    byAudience: {},
    byCategory: {},
    source: FORM_INDEX_SOURCE_PATH,
    environment: import.meta.env?.MODE || 'unknown',
    sampleResolvedFilePath: forms[0]?.fileUrl || forms[0]?.languages?.en?.file_url || null,
  };

  for (const form of forms) {
    const language = String(form?.language || 'unknown');
    const audience = String(form?.audience || 'unknown');
    const category = String(form?.category || 'unknown');
    diagnostics.byLanguage[language] = (diagnostics.byLanguage[language] || 0) + 1;
    diagnostics.byAudience[audience] = (diagnostics.byAudience[audience] || 0) + 1;
    diagnostics.byCategory[category] = (diagnostics.byCategory[category] || 0) + 1;
  }

  return diagnostics;
}

// ─── Resolver utilities ───────────────────────────────────────────────────────
export {
  listAudienceGroups,
  listTherapeuticCategories,
  listFormsByAudience,
  listFormsByCategory,
  listFormsByAudienceAndCategory,
  resolveFormById,
  resolveFormWithLanguage,
  toGeneratedFileMetadata,
} from './resolveTherapeuticForms.js';

export {
  listFormsForAI,
  searchFormsForAI,
  resolveFormForAIRequest,
  resolveFormByIdOrSlug,
  createGeneratedFileFromResolvedForm,
  getAvailableFormGroups,
  getFormsRegistryStats,
  detectFormIntent,
  MAX_GENERATED_FILES_PER_RESPONSE,
  MAX_MODEL_CANDIDATE_FORMS,
} from './aiFormsAccess.js';
