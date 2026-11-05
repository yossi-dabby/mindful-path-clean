// Shared localization contract. No catalog/PDF imports and no language fallback.
export const FORM_LANGUAGES = Object.freeze(['he', 'en', 'es', 'fr', 'de', 'it', 'pt']);
const FORM_ID = /^MP-[A-Z0-9]+(?:-[A-Z0-9]+)*-(CH|TE|AD|OA|ALL)-(HE|EN|ES|FR|DE|IT|PT)$/;

export function formLanguage(locale) {
  if (typeof locale !== 'string') return null;
  const language = locale.toLowerCase().split('-')[0];
  return FORM_LANGUAGES.includes(language) ? language : null;
}

export function formDirection(locale) {
  const language = formLanguage(locale);
  if (!language) throw new Error('Unsupported forms language');
  return language === 'he' ? 'rtl' : 'ltr';
}

export function formFamilyId(id) {
  if (typeof id !== 'string' || !FORM_ID.test(id)) throw new Error('Invalid form ID');
  return id.slice(0, -3);
}

export function formVariantId(id, locale) {
  const language = formLanguage(locale);
  if (!language) throw new Error('Unsupported forms language');
  return `${formFamilyId(id)}-${language.toUpperCase()}`;
}

// A translation is linked to one exact source, including PDF, editable HTML,
// and rendering dependencies. Content changes require a fresh translation review.
export function translationState(source, translation, locale) {
  const language = formLanguage(locale);
  if (!language) throw new Error('Unsupported forms language');
  if (!translation) return 'unavailable';
  if (translation.language !== language || translation.id !== formVariantId(source.id, language) ||
      translation.sourceId !== source.id || translation.age !== source.age ||
      translation.track !== source.track || translation.unit !== source.unit) {
    throw new Error('Translation identity or structure mismatch');
  }
  if (translation.sourceVersion !== source.contentVersion ||
      translation.sourcePdfSha256 !== source.pdfSha256 ||
      translation.sourceHtmlSha256 !== source.htmlSha256 ||
      translation.sourceDependenciesSha256 !== source.dependenciesSha256) return 'stale';
  if (translation.review?.translation !== 'draft' || translation.review?.clinical !== 'pending' ||
      translation.review?.rights !== 'pending' || !translation.translationVersion) {
    throw new Error('Expected explicit translation draft review state');
  }
  return 'draft';
}

// Offline review catalog only. Missing or stale versions never borrow Hebrew
// content. This does not register a runtime release or grant public access.
export function buildTranslationReviewCatalog(sourceMap, translations, locale) {
  const language = formLanguage(locale);
  if (!language || language === 'he') throw new Error('Expected a translation language');
  const sourceById = new Map(sourceMap.forms.map((source) => [source.id, source]));
  const bySource = new Map();
  for (const translation of translations) {
    if (!sourceById.has(translation.sourceId) || bySource.has(translation.sourceId)) {
      throw new Error('Unknown or duplicate source');
    }
    bySource.set(translation.sourceId, translation);
  }
  const forms = [], unavailable = [], stale = [];
  for (const source of sourceMap.forms) {
    const translation = bySource.get(source.id);
    const state = translationState(source, translation, language);
    if (state === 'draft') forms.push(translation);
    else (state === 'stale' ? stale : unavailable).push(formVariantId(source.id, language));
  }
  return { schemaVersion: 1, sourceCatalogVersion: sourceMap.catalogVersion,
    language, direction: formDirection(language), access: 'offline-review-only',
    totalSourceForms: sourceMap.forms.length, forms, unavailable, stale };
}
