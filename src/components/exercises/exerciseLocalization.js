import { SUPPORTED_APP_LOCALES, normalizeAppLocale } from '../i18n/appLocale.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_1 } from './exerciseContentTranslationsBatch1.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_2 } from './exerciseContentTranslationsBatch2.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A } from './exerciseContentTranslationsBatch3A.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B } from './exerciseContentTranslationsBatch3B.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A } from './exerciseContentTranslationsBatch4A.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B } from './exerciseContentTranslationsBatch4B.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A } from './exerciseContentTranslationsBatch5A.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B } from './exerciseContentTranslationsBatch5B.js';
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_6 } from './exerciseContentTranslationsBatch6.js';
import { EXERCISE_LEGACY_TITLE_TRANSLATIONS } from './exerciseLegacyTitleTranslations.js';

const TRANSLATABLE_FIELDS = [
  'title',
  'description',
  'detailed_description',
  'instructions',
  'detailed_steps',
  'steps',
  'tips',
  'benefits',
  'tags',
  'visualization_script',
  'summary',
  'when_to_use',
  'contraindications',
  'evidence_base'
];

const EXERCISE_CONTENT_CATALOGS = [
  EXERCISE_LEGACY_TITLE_TRANSLATIONS,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_6,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_5B,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_4B,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_4A,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_2,
  EXERCISE_CONTENT_TRANSLATIONS_BATCH_1
];

function findCatalogLocale(exercise, locale) {
  const identity = getExerciseIdentity(exercise);

  for (const catalog of EXERCISE_CONTENT_CATALOGS) {
    const directMatch = catalog[identity];
    if (directMatch?.[locale]) return directMatch[locale];

    const titleMatch = Object.values(catalog).find(
      (translations) => translations.en?.title === exercise?.title
    );
    if (titleMatch?.[locale]) return titleMatch[locale];
  }

  return {};
}

function getLocaleObject(exercise, locale) {
  const catalogLocalized = findCatalogLocale(exercise, locale);
  const containers = [
    exercise?.translations,
    exercise?.localized_content,
    exercise?.localizations
  ];

  for (const container of containers) {
    if (container && typeof container === 'object' && container[locale] && typeof container[locale] === 'object') {
      return { ...catalogLocalized, ...container[locale] };
    }
  }

  const fieldVariant = {};
  for (const field of TRANSLATABLE_FIELDS) {
    const localizedValue = exercise?.[`${field}_${locale}`];
    if (localizedValue !== undefined && localizedValue !== null && localizedValue !== '') {
      fieldVariant[field] = localizedValue;
    }
  }
  return { ...catalogLocalized, ...fieldVariant };
}

export function getExerciseIdentity(exercise) {
  return exercise?.slug || exercise?.translation_key || exercise?.source_id || exercise?.id || exercise?.title;
}

export function localizeExercise(exercise, requestedLocale) {
  if (!exercise || typeof exercise !== 'object') return exercise;

  const locale = normalizeAppLocale(requestedLocale);
  const localized = getLocaleObject(exercise, locale);
  const localizedFields = { ...localized };

  if (Array.isArray(localizedFields.steps) && localizedFields.steps.length > 0) {
    localizedFields.detailed_steps = localizedFields.detailed_steps || localizedFields.steps.map(
      (step, index) => ({ step_number: index + 1, ...step })
    );
    localizedFields.instructions = localizedFields.instructions || localizedFields.steps.map(
      (step, index) => `${index + 1}. ${step.title}: ${step.description}`
    ).join('\n\n');
  }

  const hasLocalizedFields = Object.keys(localizedFields).length > 0;
  const contentLanguage = normalizeAppLocale(exercise.language || 'en');

  // Never let optional source-language prose leak into a translated exercise.
  // Catalog translations intentionally replace the concise content; any absent
  // long-form field is hidden instead of being shown in another language.
  if (hasLocalizedFields && locale !== contentLanguage) {
    [
      'detailed_description',
      'visualization_script',
      'summary',
      'when_to_use',
      'contraindications',
      'evidence_base'
    ].forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(localizedFields, field)) {
        localizedFields[field] = '';
      }
    });
  }

  return {
    ...exercise,
    ...(hasLocalizedFields ? localizedFields : {}),
    content_language: hasLocalizedFields ? locale : contentLanguage,
    localization_available: hasLocalizedFields || contentLanguage === locale || locale === 'en'
  };
}

function getCatalogDeduplicationKey(exercise, localizedExercise, locale) {
  const sourceTitle = String(exercise?.title || '').trim().toLocaleLowerCase('en');
  const localizedTitle = String(localizedExercise?.title || '').trim().toLocaleLowerCase(locale);
  if (!sourceTitle && !localizedTitle) return getExerciseIdentity(exercise);

  const matchesCatalogTitle = EXERCISE_CONTENT_CATALOGS.some((catalog) =>
    Object.values(catalog).some((translations) => {
      const canonicalSourceTitle = String(translations.en?.title || '').trim().toLocaleLowerCase('en');
      const canonicalLocalizedTitle = String(translations[locale]?.title || '').trim().toLocaleLowerCase(locale);
      return canonicalSourceTitle === sourceTitle || canonicalLocalizedTitle === localizedTitle;
    })
  );

  return matchesCatalogTitle
    ? `catalog::${localizedTitle || sourceTitle}`
    : `${String(exercise?.category || '')}::${sourceTitle || localizedTitle}`;
}

export function localizeExerciseCollection(exercises, requestedLocale) {
  const locale = normalizeAppLocale(requestedLocale);
  const source = Array.isArray(exercises) ? exercises : [];
  const localizedByIdentity = new Map();

  for (const exercise of source) {
    const identity = getExerciseIdentity(exercise);
    const language = normalizeAppLocale(exercise?.language || 'en');
    const existing = localizedByIdentity.get(identity);
    const priority = language === locale ? 3 : language === 'en' ? 2 : 1;

    if (!existing || priority > existing.priority) {
      localizedByIdentity.set(identity, { exercise, priority });
    }
  }

  const localizedBySourceTitle = new Map();

  for (const { exercise } of localizedByIdentity.values()) {
    const localizedExercise = localizeExercise(exercise, locale);
    const deduplicationKey = getCatalogDeduplicationKey(exercise, localizedExercise, locale);
    const existing = localizedBySourceTitle.get(deduplicationKey);
    const priority =
      (String(exercise?.id || '').startsWith('local-') ? 0 : 10) +
      (exercise?.favorite ? 2 : 0) +
      (Number(exercise?.completed_count) > 0 ? 1 : 0);

    if (!existing || priority > existing.priority) {
      localizedBySourceTitle.set(deduplicationKey, {
        exercise: localizedExercise,
        priority
      });
    }
  }

  return Array.from(localizedBySourceTitle.values(), ({ exercise }) => exercise);
}

export function hasExerciseLocale(exercise, requestedLocale) {
  const locale = normalizeAppLocale(requestedLocale);
  if (!SUPPORTED_APP_LOCALES.includes(locale)) return false;
  return localizeExercise(exercise, locale)?.localization_available === true;
}

export { TRANSLATABLE_FIELDS };
