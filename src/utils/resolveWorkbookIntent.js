/**
 * @file src/utils/resolveWorkbookIntent.js
 *
 * Workbook Routing Intelligence — Phase 10
 *
 * Resolves a Hebrew natural-language user query to the correct therapeutic
 * workbook, applying a keyword-scoring algorithm and routing priority rules.
 *
 * ROUTING PRIORITY (mirrors problem-statement spec)
 * --------------------------------------------------
 * 1. Explicit workbook request (קונטרס / סדרת טפסים / חוברת / …) + keyword match
 *    → prefer matching workbook
 * 2. Broad / multi-topic request (≥2 keywords from same workbook, no explicit trigger)
 *    → prefer matching workbook
 * 3. Narrow specific individual-form request
 *    → return null (let resolveFormIntent handle it)
 * 4. Generic workbook request (explicit trigger, no topic keywords)
 *    → return null; caller should present the full workbook catalogue
 *
 * CONTEXT-AWARE ROUTING (resolveWorkbookIntentWithContext)
 * --------------------------------------------------------
 * When the user's current query is anaphoric ("לזה" / "אחר לזה" / "לאותו נושא")
 * without sufficient topic keywords, the resolver also scores the previous
 * conversation context.  If the previous context points to a workbook and the
 * current query contains an explicit workbook-trigger word, the matching workbook
 * from context is returned.
 *
 * RESPONSE WORDING (getHebrewFormLabel)
 * --------------------------------------
 * Returns the correct Hebrew label for a resolved form based on its category.
 * Workbooks (category: workbook_series) must be labelled "קונטרס טיפולי מלא".
 * Individual worksheets must NOT be labelled as workbooks.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Only returns forms approved in the TherapeuticForms registry.
 * - All resolution goes through resolveFormIntent (which enforces approved: true).
 * - Returns null instead of fabricating anything.
 *
 * This module is designed to be test-importable (no browser globals required).
 */

import { resolveFormIntent } from './resolveFormIntent.js';
import { WORKBOOK_CONTENT_METADATA, WORKBOOK_CONTENT_METADATA_EN, WORKBOOK_CONTENT_METADATA_ES, WORKBOOK_CONTENT_METADATA_FR, WORKBOOK_CONTENT_METADATA_DE, WORKBOOK_CONTENT_METADATA_IT, WORKBOOK_CONTENT_METADATA_PT, WORKBOOK_CONTENT_METADATA_CHILDREN_HE } from './workbookContentMetadata.js';

// ─── Hebrew workbook-trigger language ─────────────────────────────────────────
//
// Explicit Hebrew terms that signal the user wants a full workbook (קונטרס)
// rather than a single worksheet.

const WORKBOOK_TRIGGER_KEYWORDS = [
  'קונטרס',
  'סדרת טפסים',
  'סט טפסים',
  'חוברת',
  'חוברת עבודה',
  'משהו מקיף',
  'לא טופס בודד',
  'כמה טפסים',
  'תהליך שלם',
];

// ─── Score threshold constants ───────────────────────────────────────────────

/** Minimum topic-keyword matches to prefer a workbook WITHOUT an explicit trigger. */
const MULTI_TOPIC_THRESHOLD = 2;

/** Minimum topic-keyword matches when an explicit trigger IS present. */
const EXPLICIT_TRIGGER_THRESHOLD = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the query contains at least one explicit workbook-trigger keyword.
 *
 * @param {string} query
 * @returns {boolean}
 */
function hasExplicitWorkbookTrigger(query) {
  return WORKBOOK_TRIGGER_KEYWORDS.some(kw => query.includes(kw));
}

/**
 * Counts how many of a workbook's topicKeywords appear in the query.
 *
 * @param {string}   query
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreWorkbook(query, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (query.includes(kw)) score++;
  }
  return score;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolves a Hebrew natural-language user query to a therapeutic workbook.
 *
 * Implements the workbook routing priority rules:
 *   - Explicit workbook trigger + ≥1 topic keyword  → return matching workbook
 *   - ≥2 topic keywords from same workbook (multi-topic) → return matching workbook
 *   - No sufficient match → return null
 *
 * When two workbooks tie at the winning score, the first one in
 * WORKBOOK_CONTENT_METADATA (the more foundational workbook) wins.
 *
 * @param {string} query   - The user's natural-language Hebrew query.
 * @param {string} [lang='he'] - Target language for the resolved form.
 * @returns {object|null}  - Generated-file metadata compatible with
 *                           message.metadata.generated_file, or null.
 */
export function resolveWorkbookIntent(query, lang = 'he') {
  if (typeof query !== 'string' || !query.trim()) return null;

  const resolvedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'he';
  if (resolvedLang === 'en') return resolveEnglishWorkbookIntent(query);
  if (resolvedLang === 'es') return resolveSpanishWorkbookIntent(query);
  if (resolvedLang === 'fr') return resolveFrenchWorkbookIntent(query);
  if (resolvedLang === 'de') return resolveGermanWorkbookIntent(query);
  if (resolvedLang === 'it') return resolveItalianWorkbookIntent(query);
  if (resolvedLang === 'pt') return resolvePortugueseWorkbookIntent(query);

  const hasWorkbookTrigger = hasExplicitWorkbookTrigger(query);

  // ── Score every workbook ──────────────────────────────────────────────────
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA) {
    const score = scoreWorkbook(query, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
    // Ties: first in array wins (already assigned, so we don't overwrite on equal)
  }

  // ── Apply routing priority ────────────────────────────────────────────────
  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, resolvedLang);
  }

  // No sufficient topic match — return null.
  // For generic workbook requests (trigger present but no topic keywords), the
  // caller should present the full catalogue rather than guessing a workbook.
  return null;
}

/**
 * Returns the list of workbook-trigger keywords used by the routing algorithm.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS];
}

/**
 * Context-aware workbook resolver.
 *
 * Extends `resolveWorkbookIntent` by also considering the previous conversation
 * context when the current query is anaphoric (e.g. "קונטרס אחר לזה?" / "לאותו
 * נושא" / "יש לך עוד?") and does not itself contain enough topic keywords.
 *
 * Algorithm:
 *   1. Try `resolveWorkbookIntent(currentQuery)`.  If it returns a result, return it.
 *   2. If current query contains an explicit workbook trigger AND a previous context
 *      string is provided, score that context for workbooks.
 *   3. If the previous context scores ≥ EXPLICIT_TRIGGER_THRESHOLD on any workbook,
 *      return that workbook.
 *   4. Return null otherwise.
 *
 * This ensures that "קונטרס אחר לזה?" after a negative-thoughts conversation
 * correctly resolves to adults-cognitive-flexibility-premium-he, while still
 * refusing to guess when there is no prior context or no trigger word.
 *
 * @param {string}      currentQuery     - The user's current message.
 * @param {string|null} [previousContext] - Recent prior conversation text (may be
 *                                          the previous user message, a topic
 *                                          summary, or a concatenated recent
 *                                          window).  Pass null/undefined to skip.
 * @param {string}      [lang='he']       - Target language for the resolved form.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveWorkbookIntentWithContext(currentQuery, previousContext, lang = 'he') {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  const resolvedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'he';
  if (resolvedLang === 'en') return resolveEnglishWorkbookIntentWithContext(currentQuery, previousContext);
  if (resolvedLang === 'es') return resolveSpanishWorkbookIntentWithContext(currentQuery, previousContext);
  if (resolvedLang === 'fr') return resolveFrenchWorkbookIntentWithContext(currentQuery, previousContext);
  if (resolvedLang === 'de') return resolveGermanWorkbookIntentWithContext(currentQuery, previousContext);
  if (resolvedLang === 'it') return resolveItalianWorkbookIntentWithContext(currentQuery, previousContext);
  if (resolvedLang === 'pt') return resolvePortugueseWorkbookIntentWithContext(currentQuery, previousContext);

  // Step 1 — try current query alone (existing logic).
  const directResult = resolveWorkbookIntent(currentQuery, lang);
  if (directResult !== null) return directResult;

  // Step 2 — if the current query has a workbook trigger but no topic match,
  // try to inherit the topic from the previous context.
  const hasCurrentTrigger = hasExplicitWorkbookTrigger(currentQuery);
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  // Step 3 — score the previous context.
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA) {
    const score = scoreWorkbook(previousContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, resolvedLang);
  }

  return null;
}

/**
 * Returns the appropriate Hebrew label for a resolved generated-file metadata
 * object based on its `category` field.
 *
 * The AI must use the label returned by this function when introducing a form
 * to the user — it must NEVER call a workbook "דף עבודה" or "טופס בודד".
 *
 * | category        | label                          |
 * |-----------------|-------------------------------|
 * | workbook_series | 'קונטרס טיפולי מלא'           |
 * | (anything else) | 'דף עבודה'                    |
 *
 * @param {object|null} metadata - Object with at least a `category` string field.
 * @returns {string} Hebrew label.
 */
export function getHebrewFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'דף עבודה';
  if (metadata.category === 'workbook_series') return 'קונטרס טיפולי מלא';
  return 'דף עבודה';
}

// ─── English workbook routing ─────────────────────────────────────────────────

/**
 * English terms that signal the user wants a full workbook rather than
 * a single worksheet.
 */
const WORKBOOK_TRIGGER_KEYWORDS_EN = [
  'workbook',
  'booklet',
  'full workbook',
  'complete workbook',
  'workbook set',
  'set of worksheets',
  'series of forms',
  'series of worksheets',
  'full set',
  'more comprehensive',
  'not just a worksheet',
  'not a single worksheet',
  'therapeutic workbook',
  'workbook for this',
  'another workbook for this',
];

/**
 * English terms that signal the user wants an individual worksheet/form
 * rather than a full workbook.
 */
const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_EN = [
  'worksheet',
  'single worksheet',
  'worksheet form',
  'handout',
];

/**
 * Returns true when the English query contains at least one explicit
 * workbook-trigger keyword.
 *
 * @param {string} query
 * @returns {boolean}
 */
function hasExplicitEnglishWorkbookTrigger(query) {
  const lower = query.toLowerCase();
  return WORKBOOK_TRIGGER_KEYWORDS_EN.some(kw => lower.includes(kw));
}

/**
 * Returns true when the English query contains individual-form language
 * (worksheet / handout / single worksheet) but NOT workbook language.
 * Used to preserve individual-form routing priority.
 *
 * @param {string} query
 * @returns {boolean}
 */
function hasIndividualFormTrigger(query) {
  const lower = query.toLowerCase();
  // If the query also has workbook language, workbook wins
  if (hasExplicitEnglishWorkbookTrigger(lower)) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_EN.some(kw => lower.includes(kw));
}

/**
 * Scores an English workbook against the query using its topic keywords.
 *
 * @param {string}   lowerQuery  - Lowercased query.
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreEnglishWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

/**
 * Resolves an English natural-language user query to the correct therapeutic
 * workbook slug, applying the routing priority rules from the problem statement.
 *
 * Routing priority:
 *   1. Individual-form language (worksheet/handout) without workbook trigger
 *      → return null (let resolveFormIntent handle individual forms).
 *   2. Explicit workbook trigger + ≥1 topic keyword → return matching workbook.
 *   3. ≥2 topic keywords from same workbook (multi-topic, no trigger) → return matching workbook.
 *   4. Generic workbook trigger, no topic keywords → return null.
 *   5. No file request → return null (therapeutic conversation, no forced attachment).
 *
 * @param {string} query   - The user's natural-language English query.
 * @returns {object|null}  - Generated-file metadata or null.
 */
export function resolveEnglishWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();

  // Priority 1 — individual-form language without workbook trigger: return null
  // to let the individual-form resolver handle it.
  if (hasIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitEnglishWorkbookTrigger(lowerQuery);

  // Score every English workbook
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_EN) {
    const score = scoreEnglishWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
    // Ties: first in array wins (already assigned, no overwrite on equal)
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'en');
  }

  return null;
}

/**
 * Returns the list of English workbook-trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getEnglishWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_EN];
}

/**
 * Returns the list of English individual-form trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getEnglishIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_EN];
}

/**
 * Context-aware English workbook resolver.
 *
 * Extends `resolveEnglishWorkbookIntent` by also considering the previous
 * conversation context when the current query is anaphoric (e.g.
 * "Do you have a workbook for this?") and does not itself contain enough topic
 * keywords.
 *
 * Algorithm:
 *   1. Try `resolveEnglishWorkbookIntent(currentQuery)`.  Return if result found.
 *   2. If current query has an explicit workbook trigger AND a previous context
 *      string is provided, score that context for workbooks.
 *   3. If the context scores ≥ EXPLICIT_TRIGGER_THRESHOLD on any workbook, return it.
 *   4. Return null otherwise.
 *
 * @param {string}      currentQuery     - The user's current message.
 * @param {string|null} [previousContext] - Recent prior conversation text.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveEnglishWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  // Step 1 — try current query alone.
  const directResult = resolveEnglishWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  // Step 2 — if the current query has a workbook trigger, try inheriting from context.
  const hasCurrentTrigger = hasExplicitEnglishWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_EN) {
    const score = scoreEnglishWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'en');
  }

  return null;
}

/**
 * Returns the appropriate English label for a resolved generated-file metadata
 * object based on its `category` field.
 *
 * | category        | label                        |
 * |-----------------|------------------------------|
 * | workbook_series | 'full therapeutic workbook'  |
 * | (anything else) | 'worksheet'                  |
 *
 * @param {object|null} metadata - Object with at least a `category` string field.
 * @returns {string} English label.
 */
export function getEnglishFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'worksheet';
  if (metadata.category === 'workbook_series') return 'full therapeutic workbook';
  return 'worksheet';
}

// ─── Spanish workbook routing ─────────────────────────────────────────────────

/**
 * Spanish terms that signal the user wants a full workbook (cuaderno) rather
 * than a single worksheet/form.
 */
const WORKBOOK_TRIGGER_KEYWORDS_ES = [
  'cuaderno',
  'cuaderno de trabajo',
  'cuaderno terapéutico',
  'cuaderno completo',
  'manual',
  'libro de trabajo',
  'serie de formularios',
  'serie de hojas',
  'conjunto de hojas',
  'conjunto de formularios',
  'conjunto completo',
  'algo más completo',
  'algo más amplio',
  'no solo una hoja',
  'no una hoja suelta',
  'no solo un formulario',
  'recurso completo',
  'otro cuaderno para esto',
];

/**
 * Spanish terms that signal the user wants an individual worksheet/form
 * rather than a full workbook.
 * Uses specific multi-word patterns to avoid false positives from
 * workbook terms like "formularios personalizados" or "hoja personalizada".
 */
const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_ES = [
  'hoja de trabajo',
  'un formulario',
  'una ficha',
  'una hoja',
  'planilla',
  'recurso breve',
  'ejercicio breve',
];

/**
 * Returns true when the Spanish query contains at least one explicit
 * workbook-trigger keyword.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasExplicitSpanishWorkbookTrigger(lower) {
  return WORKBOOK_TRIGGER_KEYWORDS_ES.some(kw => lower.includes(kw));
}

/**
 * Returns true when the Spanish query contains individual-form language
 * but NOT workbook language.
 * Used to preserve individual-form routing priority.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasSpanishIndividualFormTrigger(lower) {
  if (hasExplicitSpanishWorkbookTrigger(lower)) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_ES.some(kw => lower.includes(kw));
}

/**
 * Scores a Spanish workbook against the query using its topic keywords.
 *
 * @param {string}   lowerQuery  - Lowercased query.
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreSpanishWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

/**
 * Resolves a Spanish natural-language user query to the correct therapeutic
 * workbook slug, applying the routing priority rules from the problem statement.
 *
 * Routing priority:
 *   1. Individual-form language (hoja de trabajo / formulario) without workbook trigger
 *      → return null (let resolveFormIntent handle individual forms).
 *   2. Explicit workbook trigger + ≥1 topic keyword → return matching workbook.
 *   3. ≥2 topic keywords from same workbook (multi-topic, no trigger) → return matching workbook.
 *   4. Generic workbook trigger, no topic keywords → return null.
 *   5. No file request → return null (therapeutic conversation, no forced attachment).
 *
 * @param {string} query   - The user's natural-language Spanish query.
 * @returns {object|null}  - Generated-file metadata or null.
 */
export function resolveSpanishWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();

  // Priority 1 — individual-form language without workbook trigger: return null
  // to let the individual-form resolver handle it.
  if (hasSpanishIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitSpanishWorkbookTrigger(lowerQuery);

  // Score every Spanish workbook
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_ES) {
    const score = scoreSpanishWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
    // Ties: first in array wins (already assigned, no overwrite on equal)
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'es');
  }

  return null;
}

/**
 * Returns the list of Spanish workbook-trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getSpanishWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_ES];
}

/**
 * Returns the list of Spanish individual-form trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getSpanishIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_ES];
}

/**
 * Context-aware Spanish workbook resolver.
 *
 * Extends `resolveSpanishWorkbookIntent` by also considering the previous
 * conversation context when the current query is anaphoric (e.g.
 * "¿Tienes un cuaderno para esto?") and does not itself contain enough topic
 * keywords.
 *
 * Algorithm:
 *   1. Try `resolveSpanishWorkbookIntent(currentQuery)`.  Return if result found.
 *   2. If current query has an explicit workbook trigger AND a previous context
 *      string is provided, score that context for workbooks.
 *   3. If the context scores ≥ EXPLICIT_TRIGGER_THRESHOLD on any workbook, return it.
 *   4. Return null otherwise.
 *
 * @param {string}      currentQuery     - The user's current message.
 * @param {string|null} [previousContext] - Recent prior conversation text.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveSpanishWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  // Step 1 — try current query alone.
  const directResult = resolveSpanishWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  // Step 2 — if the current query has a workbook trigger, try inheriting from context.
  const hasCurrentTrigger = hasExplicitSpanishWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_ES) {
    const score = scoreSpanishWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'es');
  }

  return null;
}

/**
 * Returns the appropriate Spanish label for a resolved generated-file metadata
 * object based on its `category` field.
 *
 * | category        | label                               |
 * |-----------------|-------------------------------------|
 * | workbook_series | 'cuaderno terapéutico completo'     |
 * | (anything else) | 'hoja de trabajo'                   |
 *
 * @param {object|null} metadata - Object with at least a `category` string field.
 * @returns {string} Spanish label.
 */
export function getSpanishFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'hoja de trabajo';
  if (metadata.category === 'workbook_series') return 'cuaderno terapéutico completo';
  return 'hoja de trabajo';
}

// ─── French workbook routing ──────────────────────────────────────────────────

/**
 * French terms that signal the user wants a full workbook (cahier) rather
 * than a single worksheet/form.
 */
const WORKBOOK_TRIGGER_KEYWORDS_FR = [
  'cahier',
  'cahier de travail',
  'cahier thérapeutique',
  'cahier complet',
  'livret',
  'manuel',
  'workbook',
  'série de fiches',
  'série de formulaires',
  'ensemble de fiches',
  'ensemble de formulaires',
  'dossier complet',
  'quelque chose de plus complet',
  'quelque chose de plus approfondi',
  'plus complet',
  'plus approfondi',
  'pas seulement une fiche',
  'pas une fiche seule',
  'pas seulement un formulaire',
  'ressource complète',
  'un autre cahier pour ça',
  'un cahier pour ça',
];

/**
 * French terms that signal the user wants an individual worksheet/form
 * rather than a full workbook.
 * Uses specific patterns to avoid false positives from workbook terms
 * like "fiches personnalisées" or "fiche vierge".
 */
const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_FR = [
  'une fiche',
  'un formulaire',
  'feuille de travail',
  'fiche de travail',
  'un exercice',
  'une page',
  'une feuille',
  'ressource courte',
  'outil court',
  'fiche individuelle',
  'formulaire individuel',
];

/**
 * Returns true when the French query contains at least one explicit
 * workbook-trigger keyword.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasExplicitFrenchWorkbookTrigger(lower) {
  return WORKBOOK_TRIGGER_KEYWORDS_FR.some(kw => lower.includes(kw));
}

/**
 * Returns true when the French query contains individual-form language
 * but NOT workbook language.
 * Used to preserve individual-form routing priority.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasFrenchIndividualFormTrigger(lower) {
  if (hasExplicitFrenchWorkbookTrigger(lower)) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_FR.some(kw => lower.includes(kw));
}

/**
 * Scores a French workbook against the query using its topic keywords.
 *
 * @param {string}   lowerQuery  - Lowercased query.
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreFrenchWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

/**
 * Resolves a French natural-language user query to the correct therapeutic
 * workbook slug, applying the routing priority rules from the problem statement.
 *
 * Routing priority:
 *   1. Individual-form language (fiche / formulaire) without workbook trigger
 *      → return null (let resolveFormIntent handle individual forms).
 *   2. Explicit workbook trigger + ≥1 topic keyword → return matching workbook.
 *   3. ≥2 topic keywords from same workbook (multi-topic, no trigger) → return matching workbook.
 *   4. Generic workbook trigger, no topic keywords → return null.
 *   5. No file request → return null (therapeutic conversation, no forced attachment).
 *
 * @param {string} query   - The user's natural-language French query.
 * @returns {object|null}  - Generated-file metadata or null.
 */
export function resolveFrenchWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();

  // Priority 1 — individual-form language without workbook trigger: return null
  // to let the individual-form resolver handle it.
  if (hasFrenchIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitFrenchWorkbookTrigger(lowerQuery);

  // Score every French workbook
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_FR) {
    const score = scoreFrenchWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
    // Ties: first in array wins (already assigned, no overwrite on equal)
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'fr');
  }

  return null;
}

/**
 * Returns the list of French workbook-trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getFrenchWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_FR];
}

/**
 * Returns the list of French individual-form trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getFrenchIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_FR];
}

/**
 * Context-aware French workbook resolver.
 *
 * Extends `resolveFrenchWorkbookIntent` by also considering the previous
 * conversation context when the current query is anaphoric (e.g.
 * "Est-ce que tu as un cahier pour ça ?") and does not itself contain enough
 * topic keywords.
 *
 * Algorithm:
 *   1. Try `resolveFrenchWorkbookIntent(currentQuery)`.  Return if result found.
 *   2. If current query has an explicit workbook trigger AND a previous context
 *      string is provided, score that context for workbooks.
 *   3. If the context scores ≥ EXPLICIT_TRIGGER_THRESHOLD on any workbook, return it.
 *   4. Return null otherwise.
 *
 * @param {string}      currentQuery     - The user's current message.
 * @param {string|null} [previousContext] - Recent prior conversation text.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveFrenchWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  // Step 1 — try current query alone.
  const directResult = resolveFrenchWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  // Step 2 — if the current query has a workbook trigger, try inheriting from context.
  const hasCurrentTrigger = hasExplicitFrenchWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_FR) {
    const score = scoreFrenchWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'fr');
  }

  return null;
}

/**
 * Returns the appropriate French label for a resolved generated-file metadata
 * object based on its `category` field.
 *
 * | category        | label                               |
 * |-----------------|-------------------------------------|
 * | workbook_series | 'cahier thérapeutique complet'      |
 * | (anything else) | 'fiche de travail'                  |
 *
 * @param {object|null} metadata - Object with at least a `category` string field.
 * @returns {string} French label.
 */
export function getFrenchFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'fiche de travail';
  if (metadata.category === 'workbook_series') return 'cahier thérapeutique complet';
  return 'fiche de travail';
}

// ─── German workbook routing ──────────────────────────────────────────────────

/**
 * German terms that signal the user wants a full workbook (Arbeitsheft) rather
 * than a single worksheet/form.
 */
const WORKBOOK_TRIGGER_KEYWORDS_DE = [
  'arbeitsheft',
  'heft',
  'therapieheft',
  'therapeutisches arbeitsheft',
  'vollständiges arbeitsheft',
  'workbook',
  'arbeitsmappe',
  'mappe',
  'handbuch',
  'vollständiges set',
  'formularserie',
  'reihe von arbeitsblättern',
  'sammlung von arbeitsblättern',
  'mehrere arbeitsblätter',
  'etwas umfassenderes',
  'etwas ausführlicheres',
  'umfassender',
  'ausführlicher',
  'nicht nur ein arbeitsblatt',
  'nicht nur ein formular',
  'nicht nur eine vorlage',
  'vollständige ressource',
  'ein anderes arbeitsheft dazu',
  'ein arbeitsheft dazu',
];

/**
 * German terms that signal the user wants an individual worksheet/form
 * rather than a full workbook.
 * Uses specific patterns to avoid false positives from workbook terms
 * like "persönliche Formulare" or "leeres Formular".
 */
const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_DE = [
  'arbeitsblatt',
  'blatt',
  'übungsblatt',
  'einzelnes arbeitsblatt',
  'einzelnes formular',
  'einzelne vorlage',
  'kurze übung',
  'kurze ressource',
  'eine seite',
  'ein formular',
  'eine vorlage',
];

/**
 * Returns true when the German query contains at least one explicit
 * workbook-trigger keyword.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasExplicitGermanWorkbookTrigger(lower) {
  return WORKBOOK_TRIGGER_KEYWORDS_DE.some(kw => lower.includes(kw));
}

/**
 * Returns true when the German query contains individual-form language
 * but NOT workbook language.
 * Used to preserve individual-form routing priority.
 *
 * @param {string} lower - Lowercased query.
 * @returns {boolean}
 */
function hasGermanIndividualFormTrigger(lower) {
  if (hasExplicitGermanWorkbookTrigger(lower)) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_DE.some(kw => lower.includes(kw));
}

/**
 * Scores a German workbook against the query using its topic keywords.
 *
 * @param {string}   lowerQuery  - Lowercased query.
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreGermanWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

/**
 * Resolves a German natural-language user query to the correct therapeutic
 * workbook slug, applying the routing priority rules from the problem statement.
 *
 * Routing priority:
 *   1. Individual-form language (Arbeitsblatt / Formular) without workbook trigger
 *      → return null (let resolveFormIntent handle individual forms).
 *   2. Explicit workbook trigger + ≥1 topic keyword → return matching workbook.
 *   3. ≥2 topic keywords from same workbook (multi-topic, no trigger) → return matching workbook.
 *   4. Generic workbook trigger, no topic keywords → return null.
 *   5. No file request → return null (therapeutic conversation, no forced attachment).
 *
 * @param {string} query   - The user's natural-language German query.
 * @returns {object|null}  - Generated-file metadata or null.
 */
export function resolveGermanWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();

  // Priority 1 — individual-form language without workbook trigger: return null
  // to let the individual-form resolver handle it.
  if (hasGermanIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitGermanWorkbookTrigger(lowerQuery);

  // Score every German workbook
  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_DE) {
    const score = scoreGermanWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
    // Ties: first in array wins (already assigned, no overwrite on equal)
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'de');
  }

  return null;
}

/**
 * Returns the list of German workbook-trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getGermanWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_DE];
}

/**
 * Returns the list of German individual-form trigger keywords.
 * Exported for testing.
 *
 * @returns {string[]}
 */
export function getGermanIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_DE];
}

/**
 * Context-aware German workbook resolver.
 *
 * Extends `resolveGermanWorkbookIntent` by also considering the previous
 * conversation context when the current query is anaphoric (e.g.
 * "Hast du ein Arbeitsheft dazu?") and does not itself contain enough
 * topic keywords.
 *
 * Algorithm:
 *   1. Try `resolveGermanWorkbookIntent(currentQuery)`.  Return if result found.
 *   2. If current query has an explicit workbook trigger AND a previous context
 *      string is provided, score that context for workbooks.
 *   3. If the context scores ≥ EXPLICIT_TRIGGER_THRESHOLD on any workbook, return it.
 *   4. Return null otherwise.
 *
 * @param {string}      currentQuery     - The user's current message.
 * @param {string|null} [previousContext] - Recent prior conversation text.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveGermanWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  // Step 1 — try current query alone.
  const directResult = resolveGermanWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  // Step 2 — if the current query has a workbook trigger, try inheriting from context.
  const hasCurrentTrigger = hasExplicitGermanWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_DE) {
    const score = scoreGermanWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'de');
  }

  return null;
}

/**
 * Returns the appropriate German label for a resolved generated-file metadata
 * object based on its `category` field.
 *
 * | category        | label                                      |
 * |-----------------|--------------------------------------------|
 * | workbook_series | 'vollständiges therapeutisches Arbeitsheft' |
 * | (anything else) | 'Arbeitsblatt'                             |
 *
 * @param {object|null} metadata - Object with at least a `category` string field.
 * @returns {string} German label.
 */
export function getGermanFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'Arbeitsblatt';
  if (metadata.category === 'workbook_series') return 'vollständiges therapeutisches Arbeitsheft';
  return 'Arbeitsblatt';
}

// ─── Italian workbook routing ─────────────────────────────────────────────────

const WORKBOOK_TRIGGER_KEYWORDS_IT = [
  'quaderno',
  'quaderno di lavoro',
  'quaderno terapeutico',
  'quaderno completo',
  'manuale',
  'workbook',
  'raccolta di schede',
  'serie di schede',
  'serie di moduli',
  'insieme di schede',
  'insieme di moduli',
  'set completo',
  'qualcosa di più completo',
  'qualcosa di più approfondito',
  'più completo',
  'più approfondito',
  'non solo una scheda',
  'non una scheda singola',
  'non solo un modulo',
  'risorsa completa',
  'un altro quaderno per questo',
  'un quaderno per questo',
];

const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_IT = [
  'foglio di lavoro',
  'risorsa breve',
  'strumento breve',
  'scheda singola',
  'modulo singolo',
  'una scheda',
  'un modulo',
  'un foglio',
  'una pagina',
  'un esercizio',
];

function hasExplicitItalianWorkbookTrigger(lower) {
  return WORKBOOK_TRIGGER_KEYWORDS_IT.some(kw => lower.includes(kw));
}

function hasItalianIndividualFormTrigger(lower) {
  if (hasExplicitItalianWorkbookTrigger(lower)) return false;
  if (lower.includes('moduli personalizzati') || lower.includes('modulo personalizzato')) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_IT.some(kw => lower.includes(kw));
}

function scoreItalianWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

export function resolveItalianWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();
  if (hasItalianIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitItalianWorkbookTrigger(lowerQuery);

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_IT) {
    const score = scoreItalianWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'it');
  }

  return null;
}

export function getItalianWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_IT];
}

export function getItalianIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_IT];
}

export function resolveItalianWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  const directResult = resolveItalianWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  const hasCurrentTrigger = hasExplicitItalianWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_IT) {
    const score = scoreItalianWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'it');
  }

  return null;
}

export function getItalianFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'scheda';
  if (metadata.category === 'workbook_series') return 'quaderno terapeutico completo';
  return 'scheda';
}

// ─── Portuguese workbook routing ───────────────────────────────────────────────

const WORKBOOK_TRIGGER_KEYWORDS_PT = [
  'caderno',
  'caderno de trabalho',
  'caderno terapêutico',
  'caderno completo',
  'manual',
  'workbook',
  'apostila',
  'série de fichas',
  'série de formulários',
  'conjunto de fichas',
  'conjunto de formulários',
  'conjunto completo',
  'algo mais completo',
  'algo mais aprofundado',
  'mais completo',
  'mais aprofundado',
  'não só uma ficha',
  'não uma ficha avulsa',
  'não só um formulário',
  'recurso completo',
  'outro caderno para isso',
  'um caderno para isso',
];

const INDIVIDUAL_FORM_TRIGGER_KEYWORDS_PT = [
  'ficha',
  'formulário',
  'folha de trabalho',
  'exercício',
  'página',
  'folha',
  'recurso breve',
  'ferramenta breve',
  'ficha individual',
  'formulário individual',
  'uma ficha',
  'um formulário',
];

function hasExplicitPortugueseWorkbookTrigger(lower) {
  return WORKBOOK_TRIGGER_KEYWORDS_PT.some(kw => lower.includes(kw));
}

function hasPortugueseIndividualFormTrigger(lower) {
  if (hasExplicitPortugueseWorkbookTrigger(lower)) return false;
  if (lower.includes('formulários personalizados') || lower.includes('formulário personalizado')) return false;
  return INDIVIDUAL_FORM_TRIGGER_KEYWORDS_PT.some(kw => lower.includes(kw));
}

function scorePortugueseWorkbook(lowerQuery, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (lowerQuery.includes(kw.toLowerCase())) score++;
  }
  return score;
}

export function resolvePortugueseWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const lowerQuery = query.toLowerCase();
  if (hasPortugueseIndividualFormTrigger(lowerQuery)) return null;

  const hasWorkbookTrigger = hasExplicitPortugueseWorkbookTrigger(lowerQuery);

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_PT) {
    const score = scorePortugueseWorkbook(lowerQuery, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'pt');
  }

  return null;
}

export function getPortugueseWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_PT];
}

export function getPortugueseIndividualFormTriggerKeywords() {
  return [...INDIVIDUAL_FORM_TRIGGER_KEYWORDS_PT];
}

export function resolvePortugueseWorkbookIntentWithContext(currentQuery, previousContext) {
  if (typeof currentQuery !== 'string' || !currentQuery.trim()) return null;

  const directResult = resolvePortugueseWorkbookIntent(currentQuery);
  if (directResult !== null) return directResult;

  const hasCurrentTrigger = hasExplicitPortugueseWorkbookTrigger(currentQuery.toLowerCase());
  if (!hasCurrentTrigger) return null;
  if (typeof previousContext !== 'string' || !previousContext.trim()) return null;

  const lowerContext = previousContext.toLowerCase();

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_PT) {
    const score = scorePortugueseWorkbook(lowerContext, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  if (bestWorkbook && bestScore >= EXPLICIT_TRIGGER_THRESHOLD) {
    return resolveFormIntent(bestWorkbook.slug, 'pt');
  }

  return null;
}

export function getPortugueseFormLabel(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'ficha';
  if (metadata.category === 'workbook_series') return 'caderno terapêutico completo';
  return 'ficha';
}

// ─── Hebrew Children CBT workbook routing ────────────────────────────────────

/**
 * Hebrew trigger keywords that signal the user wants the full children CBT
 * series workbook rather than a single individual worksheet.
 */
const WORKBOOK_TRIGGER_KEYWORDS_CHILDREN_HE = [
  'קונטרס ילדים',
  'חוברת ילדים',
  'סדרת ילדים',
  'סדרת cbt לילדים',
  'כל שלבי הילדים',
  'כל הטפסים לילדים',
  'סט מלא לילדים',
  'חוברת עבודה לילדים',
  'כל הסדרה לילדים',
];

/**
 * Returns true when the query contains at least one children-workbook trigger keyword.
 * @param {string} query
 * @returns {boolean}
 */
function hasExplicitChildrenWorkbookTrigger(query) {
  return WORKBOOK_TRIGGER_KEYWORDS_CHILDREN_HE.some(kw => query.includes(kw));
}

/**
 * Scores the children workbook metadata against the query.
 * @param {string}   query
 * @param {string[]} topicKeywords
 * @returns {number}
 */
function scoreChildrenWorkbook(query, topicKeywords) {
  let score = 0;
  for (const kw of topicKeywords) {
    if (query.includes(kw)) score++;
  }
  return score;
}

/**
 * Resolves a Hebrew natural-language user query to the Hebrew children CBT
 * series workbook (full series), following the workbook routing priority rules.
 *
 * Routing priority:
 *   1. Explicit children-workbook trigger + ≥1 topic keyword → return series
 *   2. ≥2 topic keywords from the series (multi-topic) → return series
 *   3. No sufficient match → return null (individual form resolver handles it)
 *
 * @param {string} query - User's natural-language Hebrew query.
 * @returns {object|null} Generated-file metadata or null.
 */
export function resolveChildrenHeWorkbookIntent(query) {
  if (typeof query !== 'string' || !query.trim()) return null;

  const hasWorkbookTrigger = hasExplicitChildrenWorkbookTrigger(query);

  let bestWorkbook = null;
  let bestScore = 0;

  for (const wb of WORKBOOK_CONTENT_METADATA_CHILDREN_HE) {
    const score = scoreChildrenWorkbook(query, wb.topicKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestWorkbook = wb;
    }
  }

  const threshold = hasWorkbookTrigger
    ? EXPLICIT_TRIGGER_THRESHOLD
    : MULTI_TOPIC_THRESHOLD;

  if (bestWorkbook && bestScore >= threshold) {
    return resolveFormIntent(bestWorkbook.slug, 'he');
  }

  return null;
}

/**
 * Returns the list of Hebrew children workbook-trigger keywords.
 * Exported for testing.
 * @returns {string[]}
 */
export function getChildrenHeWorkbookTriggerKeywords() {
  return [...WORKBOOK_TRIGGER_KEYWORDS_CHILDREN_HE];
}
