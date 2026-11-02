import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { FORMS_ADOLESCENTS_CBT_CORE_EN } from '../src/data/therapeuticForms/forms.adolescents.cbt-core.en.js';
import { FORMS_ADOLESCENTS_CBT_CORE_HE } from '../src/data/therapeuticForms/forms.adolescents.cbt-core.he.js';
import { FORMS_ADOLESCENTS_CBT_SPECIALIZED_EN } from '../src/data/therapeuticForms/forms.adolescents.cbt-specialized.en.js';
import { FORMS_ADOLESCENTS_CBT_SPECIALIZED_HE } from '../src/data/therapeuticForms/forms.adolescents.cbt-specialized.he.js';
import { FORMS_CHILDREN_CBT_CORE_EN } from '../src/data/therapeuticForms/forms.children.cbt-core.en.js';
import { FORMS_CHILDREN_CBT_CORE_HE } from '../src/data/therapeuticForms/forms.children.cbt-core.he.js';
import { FORMS_CHILDREN_CBT_SPECIALIZED } from '../src/data/therapeuticForms/forms.children.cbt-specialized.js';
import { FORMS_CHILDREN_CBT_SPECIALIZED_HE } from '../src/data/therapeuticForms/forms.children.cbt-specialized.he.js';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_FILE = path.join(ROOT, 'src/generated/therapeutic-forms-index.json');
const CONTENT_STATUS_FILE = path.join(ROOT, 'src/data/therapeuticForms/content-status.json');
const FORMS_INDEX_PILOT_VARIANTS = process.env.FORMS_INDEX_PILOT_VARIANTS === 'true';

const KNOWN_AUDIENCES = new Set(['children', 'adolescents', 'adults', 'older_adults', 'parents']);

/** Canonical age ranges per audience, mirrored in src/lib/worksheetEligibilityGate.js. */
const AUDIENCE_AGE_RANGES = Object.freeze({
  children:    { age_min: 5,  age_max: 11 },
  adolescents: { age_min: 12, age_max: 17 },
  adults:      { age_min: 18, age_max: null },
  older_adults:{ age_min: 65, age_max: null },
  parents:     { age_min: 18, age_max: null },
});
const SUPPORTED_FORM_LANGUAGES = new Set(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);
const KNOWN_CATEGORIES = new Set([
  'children_cbt_core',
  'children_cbt_specialized',
  'adolescents_cbt_core',
  'adolescents_cbt_specialized',
  'workbook_series',
  'coping_tools',
  'thought_records',
]);
const COLLECTION_TYPE_VALUES = new Set(['core', 'specialized', 'unknown']);
const CARD_TYPE_VALUES = new Set(['collection', 'module', 'worksheet', 'combined_pdf', 'workbook_package']);
const CLINICAL_DOMAIN_VALUES = new Set([
  'anxiety',
  'mood',
  'self_image',
  'social',
  'anger_impulsivity',
  'ocd',
  'adhd',
  'body_sleep_stress',
  'trauma',
  'parents',
  'general_cbt',
  'emotion_regulation',
  'thoughts',
  'behavior',
  'planning',
  'unknown',
]);

function walk(dirPath) {
  const output = [];
  if (!fs.existsSync(dirPath)) return output;

  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolute = path.join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      output.push(...walk(absolute));
      continue;
    }
    output.push(absolute);
  }

  return output;
}

function toPublicUrl(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const normalized = filePath.replace(/\\/g, '/').trim();
  if (!normalized) return null;

  if (normalized.startsWith('/forms/')) return normalized;
  if (normalized.startsWith('public/')) return `/${normalized.slice('public/'.length)}`;

  const abs = path.isAbsolute(normalized) ? normalized : path.resolve(ROOT, normalized);
  const publicPrefix = `${PUBLIC_DIR.replace(/\\/g, '/')}/`;
  const absNormalized = abs.replace(/\\/g, '/');
  if (!absNormalized.startsWith(publicPrefix)) return null;
  return `/${absNormalized.slice(publicPrefix.length)}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function titleFromFileName(fileName) {
  const base = String(fileName || '').replace(/\.pdf$/i, '');
  if (!base) return 'Therapeutic Form';
  return base
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferAudienceAndLanguage(fileUrl) {
  const segments = String(fileUrl || '').split('/').filter(Boolean);
  // /forms/{lang}/{audience}/{category}/...
  const language = segments[1] || 'en';
  const audience = segments[2] || 'adults';
  return {
    audience: KNOWN_AUDIENCES.has(audience) ? audience : 'adults',
    language,
    categorySegment: segments[3] || '',
  };
}

function inferCategory(audience, categorySegment) {
  const segment = String(categorySegment || '').toLowerCase();

  if (audience === 'children' && segment.includes('cbt-core')) return 'children_cbt_core';
  if (audience === 'adolescents' && (segment === 'core' || segment.includes('cbt-core'))) return 'adolescents_cbt_core';
  if (audience === 'adolescents' && segment.includes('specialized')) return 'adolescents_cbt_specialized';

  return 'workbook_series';
}

function normalizeFormCategory(formCategory, audience, fallbackSegment) {
  const candidate = String(formCategory || '').trim();
  if (KNOWN_CATEGORIES.has(candidate)) return candidate;
  return inferCategory(audience, fallbackSegment || candidate);
}

function toStringOrNull(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function toBooleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return null;
  const normalized = values
    .map((value) => toStringOrNull(value))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function extractVariantMetadata(raw = {}) {
  return {
    logical_form_id: toStringOrNull(raw.logical_form_id),
    variant_language: normalizeLanguageCode(raw.variant_language) || toStringOrNull(raw.variant_language),
    available_languages: normalizeStringArray(raw.available_languages),
    sibling_variant_ids: normalizeStringArray(raw.sibling_variant_ids),
    source_language: normalizeLanguageCode(raw.source_language) || toStringOrNull(raw.source_language),
    is_language_variant: toBooleanOrNull(raw.is_language_variant),
    variant_group_id: toStringOrNull(raw.variant_group_id),
  };
}

function withVariantMetadata(entry, variantMetadata) {
  if (!variantMetadata || typeof variantMetadata !== 'object') return entry;
  const next = { ...entry };
  if (variantMetadata.logical_form_id) next.logical_form_id = variantMetadata.logical_form_id;
  if (variantMetadata.variant_language) next.variant_language = variantMetadata.variant_language;
  if (Array.isArray(variantMetadata.available_languages)) next.available_languages = variantMetadata.available_languages;
  if (Array.isArray(variantMetadata.sibling_variant_ids)) next.sibling_variant_ids = variantMetadata.sibling_variant_ids;
  if (variantMetadata.source_language) next.source_language = variantMetadata.source_language;
  if (typeof variantMetadata.is_language_variant === 'boolean') next.is_language_variant = variantMetadata.is_language_variant;
  if (variantMetadata.variant_group_id) next.variant_group_id = variantMetadata.variant_group_id;
  return next;
}

export function applyVariantMetadata(entry, rawVariantMetadata = {}) {
  return withVariantMetadata(entry, extractVariantMetadata(rawVariantMetadata));
}

function extractManifestItems() {
  const allFiles = walk(PUBLIC_DIR);
  const manifestFiles = allFiles.filter((f) => /manifest.*\.json$/i.test(path.basename(f)));

  const byFileUrl = new Map();

  for (const manifestFile of manifestFiles) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch {
      continue;
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    for (const item of items) {
      const fileUrl = toPublicUrl(item?.file_path);
      if (!fileUrl || !fileUrl.startsWith('/forms/')) continue;

      byFileUrl.set(fileUrl, {
        worksheet_number: item?.worksheet_number || null,
        module_number: item?.module_number ?? null,
        module_title: item?.module_title_en || null,
        therapeutic_goal: item?.therapeutic_goal || null,
        when_to_use: item?.when_to_use || null,
        keywords: Array.isArray(item?.keywords_en) ? item.keywords_en : [],
        ai_matching_summary: item?.ai_matching_summary || null,
        safety_notes: item?.safety_notes || null,
        preview_path: toPublicUrl(item?.preview_path),
        source_manifest: path.relative(ROOT, manifestFile).replace(/\\/g, '/'),
        title_en: item?.title_en || null,
        audience: item?.audience || null,
        language: item?.language || null,
        category: item?.category || null,
        variantMetadata: extractVariantMetadata({
          logical_form_id: item?.logical_form_id ?? parsed?.logical_form_id,
          variant_language: item?.variant_language ?? parsed?.variant_language,
          available_languages: item?.available_languages ?? parsed?.available_languages,
          sibling_variant_ids: item?.sibling_variant_ids ?? parsed?.sibling_variant_ids,
          source_language: item?.source_language ?? parsed?.source_language,
          is_language_variant: item?.is_language_variant ?? parsed?.is_language_variant,
          variant_group_id: item?.variant_group_id ?? parsed?.variant_group_id,
        }),
      });
    }
  }

  return byFileUrl;
}

function resolveFileUrlFromForm(form, languageCode) {
  const langBlock = form?.languages?.[languageCode];
  if (langBlock?.file_url) return String(langBlock.file_url).trim();
  if (form?.fileUrl) return String(form.fileUrl).trim();
  return null;
}

function buildCuratedEntries(manifestByFileUrl) {
  const curatedForms = [
    ...FORMS_ADOLESCENTS_CBT_CORE_EN,
    ...FORMS_ADOLESCENTS_CBT_CORE_HE,
    ...FORMS_ADOLESCENTS_CBT_SPECIALIZED_EN,
    ...FORMS_ADOLESCENTS_CBT_SPECIALIZED_HE,
    ...FORMS_CHILDREN_CBT_CORE_EN,
    ...FORMS_CHILDREN_CBT_CORE_HE,
    ...FORMS_CHILDREN_CBT_SPECIALIZED,
    ...FORMS_CHILDREN_CBT_SPECIALIZED_HE,
  ].filter((form) => form?.approved === true);

  const entries = [];

  for (const form of curatedForms) {
    const languageCodes = Object.keys(form.languages || {});
    if (languageCodes.length === 0) continue;

    for (const language of languageCodes) {
      const fileUrl = resolveFileUrlFromForm(form, language);
      if (!fileUrl) continue;

      const fileName = path.basename(fileUrl);
      const manifestMeta = manifestByFileUrl.get(fileUrl) || {};
      const normalizedCategory = normalizeFormCategory(form.category, form.audience, form.category);

      const baseEntry = {
        id: form.id,
        slug: form.slug || form.id,
        parentSeriesId: form.parentSeriesId || null,
        type: form.type || 'pdf_asset',
        approved: true,

        title: form.languages?.[language]?.title || form.title || manifestMeta.title_en || titleFromFileName(fileName),
        description: form.languages?.[language]?.description || form.description || null,

        language,
        audience: form.audience || manifestMeta.audience || 'adults',
        category: normalizedCategory,
        subcategory: form.series || form.stageTitle || form.moduleCode || null,
        secondaryCategories: Array.isArray(form.secondaryCategories) ? form.secondaryCategories : [],

        worksheetNumber: form.formNumber || manifestMeta.worksheet_number || null,
        formNumber: form.formNumber || manifestMeta.worksheet_number || null,
        stageNumber: form.stageNumber ?? form.moduleNumber ?? manifestMeta.module_number ?? null,
        moduleNumber: form.moduleNumber ?? manifestMeta.module_number ?? null,
        moduleCode: form.moduleCode || null,
        moduleTitle: form.moduleTitle || form.stageTitle || manifestMeta.module_title || null,
        stageTitle: form.stageTitle || null,
        pageNumberInWorkbook: form.pageNumberInWorkbook ?? null,
        series: form.series || null,

        therapeuticGoal: form.therapeuticGoal || manifestMeta.therapeutic_goal || null,
        whenToUse: form.whenToUse || manifestMeta.when_to_use || null,
        clinicalKeywords: Array.isArray(form.clinicalKeywords) ? form.clinicalKeywords : manifestMeta.keywords || [],
        intentPhrases: Array.isArray(form.intentPhrases) ? form.intentPhrases : [],
        notFor: Array.isArray(form.notFor) ? form.notFor : [],
        aiMatchingSummary: form.aiMatchingSummary || manifestMeta.ai_matching_summary || null,
        safetyNotes: form.safetyNotes || manifestMeta.safety_notes || null,

        fileUrl,
        filePath: `public${fileUrl}`,
        previewPath: manifestMeta.preview_path || null,
        sourceManifest: manifestMeta.source_manifest || null,
        aiMetadataQuality: (form.therapeuticGoal || form.whenToUse || (Array.isArray(form.clinicalKeywords) && form.clinicalKeywords.length > 0)) ? 'rich' : 'limited',

        languages: form.languages,

        // Canonical normalized fields (snake_case)
        worksheet_number: form.formNumber || manifestMeta.worksheet_number || null,
        module_number: form.moduleNumber ?? manifestMeta.module_number ?? null,
        module_title: form.moduleTitle || form.stageTitle || manifestMeta.module_title || null,
        therapeutic_goal: form.therapeuticGoal || manifestMeta.therapeutic_goal || null,
        when_to_use: form.whenToUse || manifestMeta.when_to_use || null,
        keywords: Array.isArray(form.clinicalKeywords) ? form.clinicalKeywords : manifestMeta.keywords || [],
        ai_matching_summary: form.aiMatchingSummary || manifestMeta.ai_matching_summary || null,
        safety_notes: form.safetyNotes || manifestMeta.safety_notes || null,
        file_path: `public${fileUrl}`,
        preview_path: manifestMeta.preview_path || null,
        source_manifest: manifestMeta.source_manifest || null,
      };

      const variantMetadata = extractVariantMetadata({
        logical_form_id: form.logical_form_id ?? manifestMeta?.variantMetadata?.logical_form_id,
        variant_language: form.variant_language ?? manifestMeta?.variantMetadata?.variant_language,
        available_languages: form.available_languages ?? manifestMeta?.variantMetadata?.available_languages,
        sibling_variant_ids: form.sibling_variant_ids ?? manifestMeta?.variantMetadata?.sibling_variant_ids,
        source_language: form.source_language ?? manifestMeta?.variantMetadata?.source_language,
        is_language_variant: form.is_language_variant ?? manifestMeta?.variantMetadata?.is_language_variant,
        variant_group_id: form.variant_group_id ?? manifestMeta?.variantMetadata?.variant_group_id,
      });

      entries.push(withVariantMetadata(baseEntry, variantMetadata));
    }
  }

  return entries;
}

function buildFallbackEntries(existingByFileUrl, manifestByFileUrl) {
  const files = walk(path.join(PUBLIC_DIR, 'forms'))
    .filter((f) => f.toLowerCase().endsWith('.pdf'));

  const entries = [];

  for (const filePath of files) {
    const fileUrl = toPublicUrl(filePath);
    if (!fileUrl) continue;
    if (existingByFileUrl.has(fileUrl)) continue;

    // Skip files whose path structure doesn't match language-first audience roots.
    // Paths like /forms/module-01/ don't follow the expected /forms/{lang}/{audience}/...
    // convention and belong to curated registries — if not already registered, skip silently.
    const rawSegments = fileUrl.split('/').filter(Boolean);
    const rawLanguageSegment = rawSegments[1] || '';
    const rawAudienceSegment = rawSegments[2] || '';
    if (!SUPPORTED_FORM_LANGUAGES.has(rawLanguageSegment) || !KNOWN_AUDIENCES.has(rawAudienceSegment)) continue;

    const manifestMeta = manifestByFileUrl.get(fileUrl) || {};
    const { audience, language, categorySegment } = inferAudienceAndLanguage(fileUrl);
    const category = normalizeFormCategory(manifestMeta.category, audience, categorySegment);

    const fileName = path.basename(fileUrl);
    const title = manifestMeta.title_en || titleFromFileName(fileName);
    const id = slugify(`${audience}-${language}-${fileName.replace(/\.pdf$/i, '')}`);

    const baseEntry = {
      id,
      slug: id,
      parentSeriesId: null,
      type: 'pdf_asset',
      approved: true,

      title,
      description: null,

      language,
      audience,
      category,
      subcategory: categorySegment || null,
      secondaryCategories: ['workbook_series'],

      worksheetNumber: manifestMeta.worksheet_number || null,
      formNumber: manifestMeta.worksheet_number || null,
      stageNumber: manifestMeta.module_number || null,
      moduleNumber: manifestMeta.module_number || null,
      moduleCode: null,
      moduleTitle: manifestMeta.module_title || null,
      stageTitle: manifestMeta.module_title || null,
      pageNumberInWorkbook: null,
      series: null,

      therapeuticGoal: manifestMeta.therapeutic_goal || null,
      whenToUse: manifestMeta.when_to_use || null,
      clinicalKeywords: Array.isArray(manifestMeta.keywords) ? manifestMeta.keywords : [],
      intentPhrases: [],
      notFor: [],
      aiMatchingSummary: manifestMeta.ai_matching_summary || null,
      safetyNotes: manifestMeta.safety_notes || null,

      fileUrl,
      filePath: `public${fileUrl}`,
      previewPath: manifestMeta.preview_path || null,
      sourceManifest: manifestMeta.source_manifest || null,
      aiMetadataQuality: (manifestMeta.therapeutic_goal || manifestMeta.when_to_use || (manifestMeta.keywords || []).length > 0)
        ? 'manifest'
        : 'limited',

      languages: {
        [language]: {
          title,
          description: null,
          file_url: fileUrl,
          file_type: 'pdf',
          file_name: fileName,
          rtl: language === 'he',
        },
      },

      worksheet_number: manifestMeta.worksheet_number || null,
      module_number: manifestMeta.module_number || null,
      module_title: manifestMeta.module_title || null,
      therapeutic_goal: manifestMeta.therapeutic_goal || null,
      when_to_use: manifestMeta.when_to_use || null,
      keywords: Array.isArray(manifestMeta.keywords) ? manifestMeta.keywords : [],
      ai_matching_summary: manifestMeta.ai_matching_summary || null,
      safety_notes: manifestMeta.safety_notes || null,
      file_path: `public${fileUrl}`,
      preview_path: manifestMeta.preview_path || null,
      source_manifest: manifestMeta.source_manifest || null,
    };

    entries.push(withVariantMetadata(baseEntry, manifestMeta.variantMetadata));
  }

  return entries;
}

function normalizeLanguageCode(language) {
  if (typeof language !== 'string' || !language.trim()) return null;
  const normalized = language.trim().toLowerCase();
  const base = normalized.split('-')[0];
  return SUPPORTED_FORM_LANGUAGES.has(base) ? base : null;
}

function hasAIMatchingMetadata(entry) {
  const summary = String(entry?.ai_matching_summary || entry?.aiMatchingSummary || '').trim();
  const goal = String(entry?.therapeutic_goal || entry?.therapeuticGoal || '').trim();
  const whenToUse = String(entry?.when_to_use || entry?.whenToUse || '').trim();
  const keywords = Array.isArray(entry?.keywords)
    ? entry.keywords
    : (Array.isArray(entry?.clinicalKeywords) ? entry.clinicalKeywords : []);
  return Boolean(summary || goal || whenToUse || keywords.length > 0);
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractNumberParts(value) {
  const matches = String(value || '').match(/\d+/g);
  if (!matches) return [];
  return matches
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

function inferCollectionId(entry) {
  const audience = toStringOrNull(entry?.audience);
  const language = normalizeLanguageCode(entry?.language) || toStringOrNull(entry?.language);
  const category = toStringOrNull(entry?.category);
  const parentSeriesId = toStringOrNull(entry?.parentSeriesId);
  const series = toStringOrNull(entry?.series);
  const sourceManifest = toStringOrNull(entry?.sourceManifest || entry?.source_manifest);

  if (audience === 'children' && category === 'children_cbt_core' && language) return `children-cbt-core-${language}`;
  if (audience === 'adolescents' && category === 'adolescents_cbt_core' && language) return `adolescents-cbt-core-${language}`;
  if (audience === 'children' && category === 'children_cbt_specialized' && language) return `children-cbt-specialized-${language}`;
  if (audience === 'adolescents' && category === 'adolescents_cbt_specialized' && language) return `adolescents-cbt-specialized-${language}`;

  if (parentSeriesId && /cbt-core|cbt-specialized/.test(parentSeriesId)) return parentSeriesId;
  if (series && /cbt core/i.test(series) && audience && language) return `${audience}-cbt-core-${language}`;
  if (series && /cbt specialized/i.test(series) && audience && language) return `${audience}-cbt-specialized-${language}`;
  if (sourceManifest && sourceManifest.includes('children-cbt-specialized-en')) return 'children-cbt-specialized-en';

  return 'unknown';
}

function inferCollectionType(entry, collectionId) {
  const haystack = [
    entry?.category,
    entry?.series,
    entry?.parentSeriesId,
    collectionId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('cbt-core') || haystack.includes('cbt_core')) return 'core';
  if (haystack.includes('specialized')) return 'specialized';
  return 'unknown';
}

function inferCardType(entry) {
  const type = String(entry?.type || '').trim().toLowerCase();
  if (type === 'individual_worksheet') return 'worksheet';
  if (type === 'stage_group') return 'module';
  if (type === 'workbook_package') return 'workbook_package';
  if (type === 'stage_combined_pdf') return 'combined_pdf';
  if (type === 'module_pdf') return 'combined_pdf';
  return 'module';
}

function inferClinicalDomain(entry, collectionType) {
  const category = String(entry?.category || '').toLowerCase();
  if (collectionType === 'core' || category.includes('_cbt_core')) {
    return 'general_cbt';
  }

  const content = [
    entry?.moduleTitle,
    entry?.stageTitle,
    entry?.series,
    entry?.category,
    ...(Array.isArray(entry?.secondaryCategories) ? entry.secondaryCategories : []),
    ...(Array.isArray(entry?.clinicalKeywords) ? entry.clinicalKeywords : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bparent|family|caregiver\b/.test(content)) return 'parents';
  if (/\btrauma|ptsd|grounding|safe coping\b/.test(content)) return 'trauma';
  if (/\badhd|attention|executive\b/.test(content)) return 'adhd';
  if (/\bocd|intrusive|ritual\b/.test(content)) return 'ocd';
  if (/\banger|impulsiv|outburst\b/.test(content)) return 'anger_impulsivity';
  if (/\bself-esteem|self esteem|identity|self-worth\b/.test(content)) return 'self_image';
  if (/\bsocial|friend|belonging|peer|conflict\b/.test(content)) return 'social';
  if (/\bmood|depress|energy|motivation\b/.test(content)) return 'mood';
  if (/\banxiety|fear|worry|phobia|stress\b/.test(content)) return 'anxiety';
  if (/\bsleep|body|psychosomatic|somatic|enuresis|encopresis\b/.test(content)) return 'body_sleep_stress';
  if (/\bemotion|regulation|calm|coping\b/.test(content)) return 'emotion_regulation';
  if (/\bthought|belief|cognitive\b/.test(content)) return 'thoughts';
  if (/\bbehavior|avoidance|activation\b/.test(content)) return 'behavior';
  if (/\bplan|planning|weekly|tracking\b/.test(content)) return 'planning';
  return 'unknown';
}

function inferDisplayOrder(entry, cardType) {
  const formParts = extractNumberParts(entry?.formNumber || entry?.worksheetNumber);
  const moduleOrStage = toFiniteNumber(entry?.moduleNumber)
    ?? toFiniteNumber(entry?.stageNumber)
    ?? formParts[0]
    ?? 0;
  const subOrder = formParts[1] ?? toFiniteNumber(entry?.pageNumberInWorkbook) ?? 0;
  const leafOrder = formParts[2] ?? 0;
  const cardRank = {
    collection: 0,
    workbook_package: 1,
    module: 2,
    combined_pdf: 3,
    worksheet: 4,
  }[cardType] ?? 9;

  return (moduleOrStage * 1_000_000) + (subOrder * 1_000) + (leafOrder * 10) + cardRank;
}

function inferGroupingKey(entry, cardType) {
  const parts = extractNumberParts(entry?.formNumber || entry?.worksheetNumber);
  const moduleCodeParts = extractNumberParts(entry?.moduleCode);

  if (cardType === 'worksheet' && parts.length >= 3) {
    return `${parts[0]}.${parts[1]}`;
  }

  if (moduleCodeParts.length >= 2) {
    return `${moduleCodeParts[0]}.${moduleCodeParts[1]}`;
  }

  if (parts.length >= 2) {
    return cardType === 'worksheet' ? String(parts[0]) : `${parts[0]}.${parts[1]}`;
  }

  if (parts.length >= 1) {
    return String(parts[0]);
  }

  const moduleOrStage = toFiniteNumber(entry?.moduleNumber) ?? toFiniteNumber(entry?.stageNumber);
  if (moduleOrStage != null) return String(moduleOrStage);
  return null;
}

function formatGroupingKeyForId(groupingKey) {
  return String(groupingKey || '')
    .split('.')
    .filter(Boolean)
    .map((part) => {
      const number = Number(part);
      if (Number.isFinite(number)) return String(number).padStart(2, '0');
      return slugify(part);
    })
    .join('-');
}

function buildLocalizedDisplay(entry) {
  if (!entry?.languages || typeof entry.languages !== 'object') return null;
  const localized = {};

  for (const [languageCode, languageBlock] of Object.entries(entry.languages)) {
    if (!languageBlock || typeof languageBlock !== 'object') continue;
    const title = toStringOrNull(languageBlock.title) || toStringOrNull(entry.title);
    const description = toStringOrNull(languageBlock.description) || toStringOrNull(entry.description);
    const moduleTitle = toStringOrNull(entry.moduleTitle);
    const stageTitle = toStringOrNull(entry.stageTitle);
    const display = {};
    if (title) display.title = title;
    if (description) display.description = description;
    if (moduleTitle) display.moduleTitle = moduleTitle;
    if (stageTitle) display.stageTitle = stageTitle;
    if (Object.keys(display).length > 0) {
      localized[languageCode] = display;
    }
  }

  return Object.keys(localized).length > 0 ? localized : null;
}

function enrichHierarchyMetadata(entries) {
  const withBaseMetadata = entries.map((entry) => {
    const collectionId = inferCollectionId(entry);
    const collectionType = inferCollectionType(entry, collectionId);
    const cardType = inferCardType(entry);
    const clinicalDomain = inferClinicalDomain(entry, collectionType);
    const displayOrder = inferDisplayOrder(entry, cardType);
    const isCombinedPdf = ['module_pdf', 'stage_combined_pdf', 'workbook_package'].includes(entry?.type);
    const localizedDisplay = buildLocalizedDisplay(entry);

    // Attach canonical age range from AUDIENCE_AGE_RANGES so the eligibility
    // gate can compare recipientAge without a separate lookup.
    const audienceAgeRange = AUDIENCE_AGE_RANGES[entry.audience] || null;
    const ageRangeFields = audienceAgeRange
      ? { age_min: audienceAgeRange.age_min, age_max: audienceAgeRange.age_max }
      : {};

    return {
      ...entry,
      collectionId,
      collectionType,
      cardType,
      clinicalDomain,
      displayOrder,
      isCombinedPdf,
      ...ageRangeFields,
      ...(localizedDisplay ? { localizedDisplay } : {}),
    };
  });

  const parentLookup = new Map();
  for (const entry of withBaseMetadata) {
    if (entry.cardType !== 'module' && entry.cardType !== 'combined_pdf') continue;
    const groupingKey = inferGroupingKey(entry, entry.cardType);
    if (!groupingKey || entry.collectionId === 'unknown') continue;
    const key = `${entry.collectionId}::${groupingKey}`;
    if (!parentLookup.has(key)) {
      parentLookup.set(key, entry.id);
    }
  }

  return withBaseMetadata.map((entry) => {
    if (entry.cardType !== 'worksheet') {
      return { ...entry, parentId: null };
    }

    const groupingKey = inferGroupingKey(entry, entry.cardType);
    const key = groupingKey ? `${entry.collectionId}::${groupingKey}` : null;
    const resolvedParentId = key ? parentLookup.get(key) : null;
    if (resolvedParentId) {
      return { ...entry, parentId: resolvedParentId };
    }

    if (!groupingKey || entry.collectionId === 'unknown') {
      return { ...entry, parentId: null };
    }

    const parentLabel = entry.collectionType === 'core' ? 'stage' : 'module';
    const normalizedGroup = formatGroupingKeyForId(groupingKey);
    return {
      ...entry,
      parentId: `${entry.collectionId}-${parentLabel}-${normalizedGroup}`,
    };
  });
}

export function validateEntries(entries, { fileExists = fs.existsSync } = {}) {
  const seenIds = new Set();
  const allIds = new Set(
    entries
      .map((entry) => toStringOrNull(entry?.id))
      .filter(Boolean)
  );
  const errors = [];

  for (const entry of entries) {
    if (!entry?.id) {
      errors.push('Entry missing id');
      continue;
    }
    if (seenIds.has(entry.id)) errors.push(`Duplicate therapeutic form id: ${entry.id}`);
    seenIds.add(entry.id);

    if (!entry.language) {
      errors.push(`Entry ${entry.id} missing language`);
    } else if (!normalizeLanguageCode(entry.language)) {
      errors.push(`Entry ${entry.id} has unsupported language code: ${entry.language}`);
    }
    if (entry.variant_language != null) {
      const normalizedVariantLanguage = normalizeLanguageCode(entry.variant_language);
      if (!normalizedVariantLanguage) {
        errors.push(`Entry ${entry.id} has unsupported variant_language code: ${entry.variant_language}`);
      } else if (normalizedVariantLanguage !== normalizeLanguageCode(entry.language)) {
        errors.push(`Entry ${entry.id} has variant_language "${entry.variant_language}" that does not match language "${entry.language}"`);
      }
    }
    if (entry.source_language != null && !normalizeLanguageCode(entry.source_language)) {
      errors.push(`Entry ${entry.id} has unsupported source_language code: ${entry.source_language}`);
    }
    if (entry.available_languages != null) {
      if (!Array.isArray(entry.available_languages)) {
        errors.push(`Entry ${entry.id} available_languages must be an array when provided`);
      } else {
        for (const language of entry.available_languages) {
          if (!normalizeLanguageCode(language)) {
            errors.push(`Entry ${entry.id} has unsupported available_languages value: ${language}`);
          }
        }
      }
    }
    if (entry.sibling_variant_ids != null) {
      if (!Array.isArray(entry.sibling_variant_ids)) {
        errors.push(`Entry ${entry.id} sibling_variant_ids must be an array when provided`);
      } else {
        const missingSiblings = entry.sibling_variant_ids.filter((siblingId) => !allIds.has(siblingId));
        if (missingSiblings.length > 0) {
          const warningMessage = `Entry ${entry.id} sibling_variant_ids reference missing IDs: ${missingSiblings.join(', ')}`;
          if (FORMS_INDEX_PILOT_VARIANTS) {
            console.warn(`[forms-index][pilot] ${warningMessage}`);
          } else {
            console.warn(`[forms-index] ${warningMessage}`);
          }
        }
      }
    }
    if (entry.is_language_variant != null && typeof entry.is_language_variant !== 'boolean') {
      errors.push(`Entry ${entry.id} is_language_variant must be a boolean when provided`);
    }
    if (entry.logical_form_id != null && (typeof entry.logical_form_id !== 'string' || !entry.logical_form_id.trim())) {
      errors.push(`Entry ${entry.id} logical_form_id must be a non-empty string when provided`);
    }
    if (entry.variant_group_id != null && (typeof entry.variant_group_id !== 'string' || !entry.variant_group_id.trim())) {
      errors.push(`Entry ${entry.id} variant_group_id must be a non-empty string when provided`);
    }
    if (!entry.audience) {
      errors.push(`Entry ${entry.id} missing audience`);
    } else if (!KNOWN_AUDIENCES.has(entry.audience)) {
      errors.push(`Entry ${entry.id} has invalid audience value: ${entry.audience}`);
    }
    if (!entry.category) errors.push(`Entry ${entry.id} missing category`);
    if (!entry.collectionId || typeof entry.collectionId !== 'string') {
      errors.push(`Entry ${entry.id} missing collectionId`);
    }
    if (!entry.collectionType || !COLLECTION_TYPE_VALUES.has(entry.collectionType)) {
      errors.push(`Entry ${entry.id} has invalid collectionType: ${entry.collectionType}`);
    }
    if (!entry.cardType || !CARD_TYPE_VALUES.has(entry.cardType)) {
      errors.push(`Entry ${entry.id} has invalid cardType: ${entry.cardType}`);
    }
    if (!entry.clinicalDomain || !CLINICAL_DOMAIN_VALUES.has(entry.clinicalDomain)) {
      errors.push(`Entry ${entry.id} has invalid clinicalDomain: ${entry.clinicalDomain}`);
    }
    if (typeof entry.displayOrder !== 'number' || !Number.isFinite(entry.displayOrder)) {
      errors.push(`Entry ${entry.id} missing numeric displayOrder`);
    }
    if (typeof entry.isCombinedPdf !== 'boolean') {
      errors.push(`Entry ${entry.id} missing boolean isCombinedPdf`);
    }
    if (entry.parentId != null && (typeof entry.parentId !== 'string' || !entry.parentId.trim())) {
      errors.push(`Entry ${entry.id} has invalid parentId value`);
    }
    if (entry.type === 'individual_worksheet' && entry.cardType !== 'worksheet') {
      errors.push(`Entry ${entry.id} individual_worksheet must map to cardType "worksheet"`);
    }
    if (entry.type === 'stage_combined_pdf' && entry.isCombinedPdf !== true) {
      errors.push(`Entry ${entry.id} stage_combined_pdf must set isCombinedPdf=true`);
    }
    if (entry.type === 'module_pdf' && entry.isCombinedPdf !== true) {
      errors.push(`Entry ${entry.id} module_pdf must set isCombinedPdf=true`);
    }
    if (entry.type === 'workbook_package' && entry.isCombinedPdf !== true) {
      errors.push(`Entry ${entry.id} workbook_package must set isCombinedPdf=true`);
    }
    if (!hasAIMatchingMetadata(entry)) {
      errors.push(`Entry ${entry.id} missing AI matching metadata (ai_matching_summary/therapeutic_goal/when_to_use/keywords)`);
    }

    const filePath = entry.filePath || entry.file_path;
    if (!filePath) {
      errors.push(`Entry ${entry.id} missing file path`);
      continue;
    }
    if (!String(filePath).startsWith('public/forms/')) {
      errors.push(`Entry ${entry.id} file path must be under public/forms: ${filePath}`);
      continue;
    }

    const absolute = path.join(ROOT, filePath);
    if (!fileExists(absolute, filePath)) {
      errors.push(`Entry ${entry.id} references missing file path: ${filePath}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Therapeutic forms index validation failed:\n${errors.join('\n')}`);
  }
}

function main() {
  const contentStatus = JSON.parse(fs.readFileSync(CONTENT_STATUS_FILE, 'utf8'));
  if (contentStatus.contentAvailable !== true) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, '[]\n', 'utf8');
    console.log(`[forms-index] content status is "${contentStatus.status || 'unavailable'}"; generated an empty installed-files index`);
    return;
  }

  const manifestByFileUrl = extractManifestItems();

  const curatedEntries = buildCuratedEntries(manifestByFileUrl);
  const byFileUrl = new Map(curatedEntries.map((entry) => [entry.fileUrl, entry]));

  const fallbackEntries = buildFallbackEntries(byFileUrl, manifestByFileUrl);

  const allEntries = enrichHierarchyMetadata([...curatedEntries, ...fallbackEntries])
    .sort((a, b) => {
      const byLang = String(a.language).localeCompare(String(b.language));
      if (byLang !== 0) return byLang;
      const byAudience = String(a.audience).localeCompare(String(b.audience));
      if (byAudience !== 0) return byAudience;
      const byCategory = String(a.category).localeCompare(String(b.category));
      if (byCategory !== 0) return byCategory;
      return String(a.id).localeCompare(String(b.id));
    });

  validateEntries(allEntries);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(allEntries, null, 2)}\n`, 'utf8');

  const countsByLanguage = allEntries.reduce((acc, form) => {
    acc[form.language] = (acc[form.language] || 0) + 1;
    return acc;
  }, {});

  const countsByAudience = allEntries.reduce((acc, form) => {
    acc[form.audience] = (acc[form.audience] || 0) + 1;
    return acc;
  }, {});

  console.log('[forms-index] generated:', OUTPUT_FILE);
  console.log('[forms-index] total forms:', allEntries.length);
  console.log('[forms-index] by language:', countsByLanguage);
  console.log('[forms-index] by audience:', countsByAudience);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main();
}
