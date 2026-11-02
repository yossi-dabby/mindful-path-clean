/**
 * Therapeutic form intent resolver.
 * Uses installed, approved registry metadata only. Retired package aliases and
 * content-specific matching tables are intentionally not retained.
 */
import {
  resolveFormWithLanguage, toGeneratedFileMetadata, ALL_FORMS, SUPPORTED_LANGUAGES,
} from '../data/therapeuticForms/index.js';
import {
  detectFormIntent as detectDeterministicFormIntent,
  resolveFormForAIRequest as resolveDeterministicFormForAIRequest,
  searchFormsForAI,
} from '../data/therapeuticForms/aiFormsAccess.js';
import {
  THERAPEUTIC_FORMS_CONTENT_AVAILABLE, THERAPEUTIC_FORMS_CONTENT_STATUS,
  getTherapeuticFormsAvailabilityCopy,
} from '../data/therapeuticForms/availability.js';

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeLanguageCode(value) {
  const base = normalizeText(value || 'en').split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
}

function buildApprovedIntentMap() {
  const map = {};
  for (const form of ALL_FORMS) {
    if (form?.approved !== true || !form.id) continue;
    for (const value of [form.id, form.slug, ...(Array.isArray(form.intentPhrases) ? form.intentPhrases : [])]) {
      const key = normalizeText(value);
      if (key) map[key] = form.id;
    }
  }
  return Object.freeze(map);
}

export const APPROVED_FORM_INTENT_MAP = buildApprovedIntentMap();
export const FORM_INTENT_MARKER_PATTERN = /\[FORM:([a-z0-9_-]+)(?::([a-z]{2}))?\]/g;

function resolveApprovedFormById(formId, language) {
  const resolved = resolveFormWithLanguage(formId, language);
  return resolved ? toGeneratedFileMetadata(resolved) : null;
}

function detectRequestedAudience(query) {
  if (/\bchildren\b|\bchild\b|\bkids?\b/i.test(query)) return 'children';
  if (/\badolescents?\b|\bteen(?:ager)?s?\b|\byouth\b/i.test(query)) return 'adolescents';
  if (/\bolder adults?\b|\bseniors?\b|\belderly\b/i.test(query)) return 'older_adults';
  if (/\badults?\b/i.test(query)) return 'adults';
  return null;
}

function resolveRegistryContent(query, options = {}) {
  const normalized = normalizeText(query);
  if (!normalized) return null;
  const requestedAudience = detectRequestedAudience(normalized);
  if (options.audience && requestedAudience && requestedAudience !== options.audience) return null;
  const language = normalizeLanguageCode(options.activeLanguage || options.language);
  const matches = searchFormsForAI(query, {
    language,
    audience: options.audience || requestedAudience || undefined,
    category: options.category,
    allowEnglishFallback: false,
  });
  for (const form of matches) {
    if (form?.type === 'stage_group' || form?.language !== language) continue;
    const resolved = resolveApprovedFormById(form.id, language);
    if (resolved) return resolved;
  }
  return null;
}

export function resolveFormIntent(intentOrSlug, lang) {
  if (typeof intentOrSlug !== 'string' || !intentOrSlug.trim()) return null;
  const intent = normalizeText(intentOrSlug);
  const language = normalizeLanguageCode(lang);
  const id = APPROVED_FORM_INTENT_MAP[intent];
  if (id) return resolveApprovedFormById(id, language);
  // Unknown identifiers must never become a nearby form through keyword matching.
  if (intent.startsWith('tf-') || /^[a-z0-9]+(?:[-_][a-z0-9]+){2,}$/.test(intent)) return null;
  return resolveRegistryContent(intentOrSlug, { activeLanguage: language });
}

// Compatibility entry points retain their public signatures and audience/category
// guards. All matching comes from future installed metadata, never old packages.
export function resolveChildrenCBTPremiumFormByContent(_query) { return null; }
export function resolveChildrenCBTSpecializedFormByContent(query, options = {}) {
  return resolveRegistryContent(query, { ...options, audience: 'children', category: 'children_cbt_specialized' });
}
export function resolveChildrenCBTCoreEnglishFormByContent(query, options = {}) {
  if (normalizeLanguageCode(options.activeLanguage) !== 'en') return null;
  return resolveRegistryContent(query, { ...options, audience: 'children', category: 'children_cbt_core' });
}
export function resolveAdolescentsCBTSpecializedFormByContent(_query) { return null; }
export function resolveAdolescentsCBTCoreEnglishFormByContent(query, options = {}) {
  if (normalizeLanguageCode(options.activeLanguage) !== 'en') return null;
  return resolveRegistryContent(query, { ...options, audience: 'adolescents', category: 'adolescents_cbt_core' });
}
export function resolveAdolescentsCBTSpecializedEnglishFormByContent(query, options = {}) {
  if (normalizeLanguageCode(options.activeLanguage) !== 'en') return null;
  return resolveRegistryContent(query, { ...options, audience: 'adolescents', category: 'adolescents_cbt_specialized' });
}
export function resolveSpecializedModuleIdByCode(moduleCode) {
  if (typeof moduleCode !== 'string' && typeof moduleCode !== 'number') return null;
  const code = Number(moduleCode);
  if (!Number.isInteger(code) || code < 1) return null;
  return ALL_FORMS.find(form => form?.approved === true && form.language === 'en' &&
    form.audience === 'adolescents' && form.category === 'adolescents_cbt_specialized' &&
    form.type === 'module_pdf' && Number(form.moduleCode || form.moduleNumber) === code)?.id || null;
}

export function detectFormIntent(userMessage) {
  return detectDeterministicFormIntent(userMessage);
}

export function resolveFormIntentRequest(userMessage, context = {}) {
  const resolved = resolveDeterministicFormForAIRequest(userMessage, context);
  if (THERAPEUTIC_FORMS_CONTENT_AVAILABLE || !resolved?.intent) return resolved;

  const language = context.language || context.activeLanguage || resolved.resolvedLanguage || 'en';
  const copy = getTherapeuticFormsAvailabilityCopy(language);

  return {
    ...resolved,
    matches: [],
    nearestMatches: [],
    generatedFile: null,
    generatedFiles: [],
    responseText: copy.aiMessage,
    contentStatus: THERAPEUTIC_FORMS_CONTENT_STATUS,
    usedFallbackLanguage: false,
    fallbackReason: 'forms_under_revision',
    availableLanguages: [],
  };
}
