/**
 * @file src/lib/cbtKnowledgeRetrieval.js
 *
 * Therapist Upgrade — Wave 4C — Bounded CBT Curriculum Unit Retrieval
 *
 * PURPOSE
 * -------
 * Provides two focused helpers for the V10 session-start path:
 *
 *   extractFormulationHintsForPlanner(formulationRecord)
 *     Pure function.  Derives the bounded formulationHints object expected by
 *     planCBTKnowledgeRetrieval() from a raw CaseFormulation entity record.
 *     Never throws.  Returns safe defaults when the record is absent or thin.
 *
 *   retrieveBoundedCBTKnowledgeBlock(entities, plan, sessionLanguage)
 *     Async function.  Fetches CBTCurriculumUnit records from the entity store,
 *     applies Wave 4A.2 safety/clinical filters in-memory, hard-caps the result
 *     to CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS, and returns a formatted knowledge
 *     block string (or '' when nothing survives filtering or any step fails).
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module imports ONLY from:
 *   - ./cbtKnowledgePlanner.js   (constants: CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
 *                                             CBT_DISTRESS_FILTERS)
 *   - ./cbtCurriculumUnitSchema.js (constants: CBT_DISTRESS_SUITABILITY)
 * No imports from agentWiring, activeAgentWiring, featureFlags,
 * workflowContextInjector, or any entity definition file.
 * Safe to import in Vitest unit tests without any live SDK dependency.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Every exported function and all private helpers catch all exceptions and
 * return a safe default ('' or an inert object).  Session start is NEVER blocked.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Does NOT infer domain from raw message text.  Reads only the structured
 *   `cbt_domain` field on the CaseFormulation entity record.
 * - Does NOT weaken or bypass any planner gate.  Only called when the planner
 *   has already returned shouldRetrieve: true.
 * - Applies defense-in-depth safety_tag checks even though the planner already
 *   gated on safety/distress state.
 * - Hard-caps at CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS regardless of entity count.
 * - Strips admin_notes and source_chunk_ids before returning units to the
 *   caller (mirrors the backend function).
 * - Does NOT expose private user entities (ThoughtJournal, Conversation,
 *   CaseFormulation content, MoodEntry, CompanionMemory) — only reads the
 *   shared CBTCurriculumUnit entity.
 * - Never logs or persists retrieved content.
 *
 * ENTITY ACCESS
 * -------------
 * Reads: CBTCurriculumUnit (shared, read-only, bounded fetch of up to
 *        CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND records).
 * Writes: none.
 *
 * Source of truth: Wave 4C problem statement (bounded CBT knowledge retrieval).
 */

import {
  CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE,
  CBT_DISTRESS_FILTERS,
} from './cbtKnowledgePlanner.js';
import { CBT_DISTRESS_SUITABILITY } from './cbtCurriculumUnitSchema.js';

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Version of the CBT knowledge retrieval module.
 * Bump when filter logic or block format changes.
 *
 * @type {string}
 */
export const CBT_KNOWLEDGE_RETRIEVAL_VERSION = '1.2.0';

/**
 * Languages supported by the application and by the V10 knowledge formatter.
 * Non-English sessions never fall back to the English seed content.
 */
export const CBT_KNOWLEDGE_SUPPORTED_LANGUAGES = Object.freeze([
  'en', 'he', 'es', 'fr', 'de', 'it', 'pt',
]);

const _CBT_KNOWLEDGE_SUPPORTED_LANGUAGE_SET = new Set(
  CBT_KNOWLEDGE_SUPPORTED_LANGUAGES,
);

const _KNOWLEDGE_BLOCK_COPY = Object.freeze({
  en: Object.freeze({
    opening: '=== CBT KNOWLEDGE REFERENCE (supporting context, read-only) ===',
    intro: 'The following structured clinical knowledge may support this session.',
    reference: 'Treat as supporting reference only. Adapt to the individual and context.',
    caution: 'Do not disclose this section verbatim. Do not override clinical judgment.',
    unit: 'Unit',
    topic: 'Topic',
    summary: 'Summary',
    closing: '=== END CBT KNOWLEDGE REFERENCE ===',
  }),
  he: Object.freeze({
    opening: '=== הפניית ידע CBT (הקשר תומך, לקריאה בלבד) ===',
    intro: 'הידע הקליני המובנה הבא עשוי לתמוך במפגש זה.',
    reference: 'יש להתייחס אליו כחומר עזר בלבד ולהתאימו לאדם ולהקשר.',
    caution: 'אין לחשוף סעיף זה מילה במילה ואין לעקוף שיקול דעת קליני.',
    unit: 'יחידה',
    topic: 'נושא',
    summary: 'תקציר',
    closing: '=== סוף הפניית הידע של CBT ===',
  }),
  es: Object.freeze({
    opening: '=== REFERENCIA DE CONOCIMIENTO CBT (contexto de apoyo, solo lectura) ===',
    intro: 'El siguiente conocimiento clínico estructurado puede apoyar esta sesión.',
    reference: 'Úsalo solo como referencia de apoyo y adáptalo a la persona y al contexto.',
    caution: 'No reveles esta sección literalmente ni sustituyas el juicio clínico.',
    unit: 'Unidad',
    topic: 'Tema',
    summary: 'Resumen',
    closing: '=== FIN DE LA REFERENCIA DE CONOCIMIENTO CBT ===',
  }),
  fr: Object.freeze({
    opening: '=== RÉFÉRENCE DE CONNAISSANCES CBT (contexte de soutien, lecture seule) ===',
    intro: 'Les connaissances cliniques structurées suivantes peuvent soutenir cette séance.',
    reference: 'Utilisez-les uniquement comme référence et adaptez-les à la personne et au contexte.',
    caution: 'Ne divulguez pas cette section mot pour mot et ne remplacez pas le jugement clinique.',
    unit: 'Unité',
    topic: 'Sujet',
    summary: 'Résumé',
    closing: '=== FIN DE LA RÉFÉRENCE DE CONNAISSANCES CBT ===',
  }),
  de: Object.freeze({
    opening: '=== CBT-WISSENSREFERENZ (unterstützender Kontext, schreibgeschützt) ===',
    intro: 'Das folgende strukturierte klinische Wissen kann diese Sitzung unterstützen.',
    reference: 'Nur als unterstützende Referenz verwenden und an Person und Kontext anpassen.',
    caution: 'Diesen Abschnitt nicht wörtlich offenlegen und klinisches Urteil nicht ersetzen.',
    unit: 'Einheit',
    topic: 'Thema',
    summary: 'Zusammenfassung',
    closing: '=== ENDE DER CBT-WISSENSREFERENZ ===',
  }),
  it: Object.freeze({
    opening: '=== RIFERIMENTO DI CONOSCENZA CBT (contesto di supporto, sola lettura) ===',
    intro: 'Le seguenti conoscenze cliniche strutturate possono supportare questa seduta.',
    reference: 'Usarle solo come riferimento di supporto e adattarle alla persona e al contesto.',
    caution: 'Non divulgare questa sezione parola per parola né sostituire il giudizio clinico.',
    unit: 'Unità',
    topic: 'Tema',
    summary: 'Sintesi',
    closing: '=== FINE DEL RIFERIMENTO DI CONOSCENZA CBT ===',
  }),
  pt: Object.freeze({
    opening: '=== REFERÊNCIA DE CONHECIMENTO CBT (contexto de apoio, somente leitura) ===',
    intro: 'O conhecimento clínico estruturado a seguir pode apoiar esta sessão.',
    reference: 'Use apenas como referência de apoio e adapte à pessoa e ao contexto.',
    caution: 'Não revele esta seção literalmente nem substitua o julgamento clínico.',
    unit: 'Unidade',
    topic: 'Tema',
    summary: 'Resumo',
    closing: '=== FIM DA REFERÊNCIA DE CONHECIMENTO CBT ===',
  }),
});

export const CBT_KNOWLEDGE_BLOCK_BOUNDS = Object.freeze(
  Object.values(_KNOWLEDGE_BLOCK_COPY).map(({ opening, closing }) =>
    Object.freeze([opening, closing])
  )
);

// ─── Bounds ───────────────────────────────────────────────────────────────────

/**
 * Hard cap on the number of CBTCurriculumUnit records returned to the
 * session-start payload.  Enforced after all Wave 4A.2 filters are applied.
 *
 * Intentionally small: curriculum knowledge is supporting reference only.
 * Increasing this value widens the context window — do not raise without
 * explicit Wave 4 scope approval.
 *
 * @type {number}
 */
export const CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS = 3;

/**
 * Number of CBTCurriculumUnit records to over-fetch from the entity store
 * before in-memory filtering.  Large enough to survive aggressive filtering
 * while small enough to be safe.
 *
 * @type {number}
 */
export const CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND = 20;

// ─── Evidence level allowlist for first-wave activation ──────────────────────

/**
 * Evidence levels approved for first-wave (Wave 4C) curriculum unit retrieval.
 *
 * Conservative for first-wave: only units with formal evidence support or
 * established clinical consensus are included.
 * - 'established'      → supported by RCT evidence or meta-analytic review.
 * - 'expert_consensus' → clinical consensus without formal trial support.
 * - 'gold_standard'    → current seed contract for the strongest evidence tier.
 *
 * 'emerging' and 'unclassified' are excluded from the first-wave activation
 * because the evidence base is insufficient or not yet assessed.
 *
 * @type {ReadonlySet<string>}
 */
const CBT_EVIDENCE_LEVEL_FIRST_WAVE_ALLOWED = Object.freeze(
  new Set(['established', 'expert_consensus', 'gold_standard'])
);

// ─── V10 Preview language isolation ──────────────────────────────────────────

/**
 * Requires an exact unit/session language match. The explicit `all` value is
 * language-neutral. Missing or malformed language metadata fails closed.
 *
 * @private
 * @param {unknown} languages
 * @param {string} sessionLanguage
 * @returns {boolean}
 */
function _isLanguageMatch(languages, sessionLanguage) {
  if (
    !Array.isArray(languages) ||
    !_CBT_KNOWLEDGE_SUPPORTED_LANGUAGE_SET.has(sessionLanguage)
  ) return false;

  const normalizedLanguages = languages
    .filter(language => typeof language === 'string')
    .map(language => language.trim().toLowerCase())
    .filter(Boolean);

  return (
    normalizedLanguages.includes('all') ||
    normalizedLanguages.includes(sessionLanguage)
  );
}

/**
 * Selects content for the exact session language. English uses the canonical
 * seed fields; every other language requires an explicit non-empty variant.
 * There is deliberately no cross-language fallback.
 *
 * @private
 * @param {object} unit
 * @param {string} sessionLanguage
 * @returns {string}
 */
function _getLocalizedContent(unit, sessionLanguage) {
  if (sessionLanguage === 'en') {
    if (typeof unit.content_summary === 'string' && unit.content_summary.trim()) {
      return unit.content_summary.trim();
    }
    if (typeof unit.content === 'string' && unit.content.trim()) {
      return unit.content.trim();
    }
    return '';
  }

  const variants = unit.language_variants;
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return '';
  const variant = variants[sessionLanguage];
  return typeof variant === 'string' ? variant.trim() : '';
}
// ─── Wave 4D — Unit type preference → entity unit_type mapping ────────────────

/**
 * Maps abstract planner unit type preferences to concrete entity `unit_type`
 * values used in CBTCurriculumUnit records.
 *
 * The planner emits abstract preferences (technique, worksheet, case_example);
 * this module maps them to the bounded set of entity unit_type strings to
 * enable deterministic preference-based ranking after filtering.
 *
 * Mapping rationale:
 *   technique    → 'intervention'       (CBT techniques are intervention units)
 *   worksheet    → 'blocker_resolution'  (structured practice for stagnating arcs)
 *   case_example → 'outcome_interpretation' (closest entity type for consolidation;
 *                  outcome interpretation units present how gains were achieved,
 *                  serving the same clinical role as illustrative case examples
 *                  in late-arc consolidation work)
 *   psychoeducation → 'psychoeducation'  (direct 1:1 match)
 *   any          → '' (no preference; skip ranking)
 *
 * @private
 * @type {Readonly<Record<string, string>>}
 */
const _UNIT_TYPE_PREF_TO_ENTITY_TYPE = Object.freeze({
  technique: 'intervention',
  worksheet: 'blocker_resolution',
  case_example: 'outcome_interpretation',
  psychoeducation: 'psychoeducation',
});

// ─── Formulation hints extractor ─────────────────────────────────────────────

/**
 * @typedef {Object} FormulationHintsForPlanner
 * @property {string}  domain           — CBT domain from formulationRecord.cbt_domain; '' if absent.
 * @property {string}  treatment_phase  — Treatment phase from formulationRecord.treatment_phase; '' if absent.
 * @property {boolean} has_formulation  — True when a CaseFormulation record exists.
 * @property {boolean} is_ambiguous     — True when the formulation is thin/ambiguous.
 */

/**
 * Derives the bounded formulationHints object for planCBTKnowledgeRetrieval()
 * from a raw CaseFormulation entity record.
 *
 * DESIGN CONSTRAINTS
 * ------------------
 * - Reads ONLY the structured `cbt_domain` and `treatment_phase` fields.
 * - Does NOT parse or analyse free-text fields (presenting_problem, core_belief,
 *   etc.) to infer domain — that would violate the no-raw-text rule.
 * - When `cbt_domain` is absent, domain is '' → planner returns NO_DOMAIN skip.
 * - When `treatment_phase` is absent, '' is returned → arc inferred from LTS/default.
 * - `is_ambiguous` is false by default; NO_DOMAIN skip handles the absent-domain case.
 *
 * FAIL-OPEN: never throws; returns safe defaults on any error.
 *
 * @param {object|null} formulationRecord - CaseFormulation entity record (may be null).
 * @returns {FormulationHintsForPlanner}
 */
export function extractFormulationHintsForPlanner(formulationRecord) {
  try {
    if (!formulationRecord || typeof formulationRecord !== 'object' || Array.isArray(formulationRecord)) {
      return { domain: '', treatment_phase: '', has_formulation: false, is_ambiguous: false };
    }

    const domain = typeof formulationRecord.cbt_domain === 'string'
      ? formulationRecord.cbt_domain.trim()
      : '';

    const treatment_phase = typeof formulationRecord.treatment_phase === 'string'
      ? formulationRecord.treatment_phase.trim()
      : '';

    // is_ambiguous: false — when domain is present the planner proceeds;
    // when domain is absent the planner correctly returns NO_DOMAIN skip.
    // We never set is_ambiguous=true here to avoid double-blocking.
    return {
      domain,
      treatment_phase,
      has_formulation: true,
      is_ambiguous: false,
    };
  } catch {
    return { domain: '', treatment_phase: '', has_formulation: false, is_ambiguous: false };
  }
}

// ─── Private filter helpers ───────────────────────────────────────────────────

/**
 * Returns true when a unit's distress_suitability is compatible with the
 * planner's distressFilter.
 *
 * Mapping:
 *   planFilter 'any'              → all known suitability values accepted (TIER_LOW)
 *   planFilter 'low_distress_only'→ 'any', 'mild_and_below', and
 *                                   'not_in_crisis' accepted (TIER_MILD);
 *                                   'low_only' excluded (requires TIER_LOW)
 *   planFilter 'none'             → nothing accepted (should never be reached; planner skips)
 *
 * @private
 * @param {string} distressSuitability - Unit's distress_suitability value (default 'any').
 * @param {string} planFilter          - Planner's distressFilter output.
 * @returns {boolean}
 */
function _isDistressSuitable(distressSuitability, planFilter) {
  const isKnownSuitability = (
    distressSuitability === CBT_DISTRESS_SUITABILITY.ANY ||
    distressSuitability === CBT_DISTRESS_SUITABILITY.MILD_AND_BELOW ||
    distressSuitability === CBT_DISTRESS_SUITABILITY.LOW_ONLY ||
    distressSuitability === 'not_in_crisis'
  );

  if (!isKnownSuitability) return false;

  if (planFilter === CBT_DISTRESS_FILTERS.ANY) {
    return true;
  }

  if (planFilter === CBT_DISTRESS_FILTERS.LOW_DISTRESS_ONLY) {
    return (
      distressSuitability === CBT_DISTRESS_SUITABILITY.ANY ||
      distressSuitability === CBT_DISTRESS_SUITABILITY.MILD_AND_BELOW ||
      distressSuitability === 'not_in_crisis'
    );
  }

  return false;
}

/**
 * Returns true when a unit's treatment_arc_position is compatible with the
 * planner's treatmentArcFilter.
 *
 * Matching rules:
 *   - planFilter 'any'   → accept all arc positions.
 *   - unitArc 'any'      → arc-agnostic unit; accepted for any planFilter.
 *   - Otherwise          → exact match required.
 *
 * @private
 * @param {string} unitArc   - Unit's treatment_arc_position value (default 'any').
 * @param {string} planArc   - Planner's treatmentArcFilter output.
 * @returns {boolean}
 */
function _isArcMatch(unitArc, planArc) {
  if (planArc === 'any') return true;
  if (unitArc === 'any') return true;
  return unitArc === planArc;
}

/**
 * Returns true when a single CBTCurriculumUnit is eligible for first-wave
 * Wave 4C retrieval given the current plan.
 *
 * Filters applied (all must pass):
 *   1. runtime_eligible_first_wave !== false
 *   2. unit language exactly matches sessionLanguage, or includes `all`
 *   3. planner_domain or unambiguous legacy cbt_domain matches plan.domainHint
 *   4. evidence_level is in CBT_EVIDENCE_LEVEL_FIRST_WAVE_ALLOWED
 *   5. distress_suitability is compatible with plan.distressFilter
 *   6. safety_tags is absent or an empty array
 *   7. treatment_arc_position is compatible with plan.treatmentArcFilter
 *
 * @private
 * @param {object} unit - A CBTCurriculumUnit entity record.
 * @param {object} plan - Output of planCBTKnowledgeRetrieval().
 * @param {string} sessionLanguage - Normalized exact session language.
 * @returns {boolean}
 */
function _isUnitEligible(unit, plan, sessionLanguage) {
  // 1. runtime_eligible_first_wave: explicitly false → exclude
  if (unit.runtime_eligible_first_wave === false) return false;

  // 2. Exact language match; missing or mismatched language fails closed.
  if (!_isLanguageMatch(unit.languages, sessionLanguage)) return false;

  // 2b. Non-English content must exist for the exact session language.
  // `languages: ['all']` never authorizes an English fallback.
  if (!_getLocalizedContent(unit, sessionLanguage)) return false;

  // 3. Prefer the seed contract while retaining unambiguous legacy support.
  const plannerDomain = typeof unit.planner_domain === 'string'
    ? unit.planner_domain.trim()
    : '';
  const legacyDomain = typeof unit.cbt_domain === 'string'
    ? unit.cbt_domain.trim()
    : '';

  if (plannerDomain && legacyDomain && plannerDomain !== legacyDomain) {
    return false;
  }

  const unitDomain = plannerDomain || legacyDomain;
  if (unitDomain !== plan.domainHint) return false;

  // 4. Evidence level: must be in the Preview allowlist.
  const evidenceLevel = typeof unit.evidence_level === 'string'
    ? unit.evidence_level.trim()
    : 'unclassified';
  if (!CBT_EVIDENCE_LEVEL_FIRST_WAVE_ALLOWED.has(evidenceLevel)) return false;

  // 5. Distress suitability
  const distressSuitability = typeof unit.distress_suitability === 'string'
    ? unit.distress_suitability.trim()
    : CBT_DISTRESS_SUITABILITY.ANY;
  if (!_isDistressSuitable(distressSuitability, plan.distressFilter)) return false;

  // 6. Conservative Preview policy: any safety tag excludes the unit.
  if (unit.safety_tags != null && !Array.isArray(unit.safety_tags)) return false;

  const safetyTags = Array.isArray(unit.safety_tags) ? unit.safety_tags : [];
  if (safetyTags.length > 0) return false;

  // 7. Treatment arc position
  const arcPosition = typeof unit.treatment_arc_position === 'string'
    ? unit.treatment_arc_position
    : 'any';
  if (!_isArcMatch(arcPosition, plan.treatmentArcFilter)) return false;

  return true;
}

// ─── Wave 4D — Unit type preference ranking ───────────────────────────────────

/**
 * Returns a copy of the eligible units array ranked by the planner's
 * unitTypePreference signal, using the _UNIT_TYPE_PREF_TO_ENTITY_TYPE mapping.
 *
 * Ranking order (first = preferred):
 *   1. Units whose entity unit_type matches the mapped preference.
 *   2. Units with no unit_type or unit_type 'any' (arc-agnostic filler).
 *   3. All remaining units.
 *
 * Within each group, the original priority_score-based order is preserved.
 * When unitTypePreference is 'any', the original order is returned unchanged.
 *
 * This is a soft-preference ranking only — all returned units have already
 * passed every Wave 4A.2 eligibility filter.  The cap (CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS)
 * is applied AFTER ranking, so preferred units are more likely to be included.
 *
 * FAIL-OPEN: returns units unchanged on any error.
 *
 * @private
 * @param {object[]} units             - Eligible CBTCurriculumUnit records.
 * @param {string}   unitTypePreference - Planner output (one of CBT_UNIT_TYPE_PREFERENCES).
 * @returns {object[]} Ranked copy of the input array.
 */
function _rankByUnitTypePreference(units, unitTypePreference) {
  try {
    if (!Array.isArray(units)) return units;
    // 'any' preference means no ranking — return original order.
    if (!unitTypePreference || unitTypePreference === 'any') return units;

    const mappedEntityType = _UNIT_TYPE_PREF_TO_ENTITY_TYPE[unitTypePreference] ?? null;
    // No mapping found → return original order (safe default).
    if (!mappedEntityType) return units;

    const preferred = [];
    const neutral = [];
    const other = [];

    for (const unit of units) {
      const uType = typeof unit.unit_type === 'string' ? unit.unit_type : '';
      if (uType === mappedEntityType) {
        preferred.push(unit);
      } else if (!uType || uType === 'any') {
        neutral.push(unit);
      } else {
        other.push(unit);
      }
    }

    return [...preferred, ...neutral, ...other];
  } catch {
    return units;
  }
}

// ─── Knowledge block formatter ────────────────────────────────────────────────

/**
 * Formats a bounded array of CBTCurriculumUnit records into a clearly
 * delimited knowledge block string for session-start context injection.
 *
 * BLOCK FORMAT
 * ------------
 *   === CBT KNOWLEDGE REFERENCE (supporting context, read-only) ===
 *   <header>
 *
 *   [1] <title>
 *       Topic: <clinical_topic>
 *       Summary: <content_summary or content fallback (≤ 300 chars)>
 *
 *   [2] ...
 *   === END CBT KNOWLEDGE REFERENCE ===
 *
 * OMISSIONS
 * ---------
 * - admin_notes and source_chunk_ids are never included (stripped upstream).
 * - content_summary is preferred; content is used only when the summary is blank.
 * - The selected text is truncated at 300 characters to avoid bloat.
 * - If a unit has no title, a numeric placeholder is used.
 *
 * FAIL-OPEN: returns '' on any error.
 *
 * @private
 * @param {object[]} units - Array of eligible CBTCurriculumUnit records.
 * @param {string} sessionLanguage - Exact supported session language.
 * @returns {string} Formatted block, or '' when units is empty.
 */
function _formatKnowledgeBlock(units, sessionLanguage) {
  try {
    if (!Array.isArray(units) || units.length === 0) return '';

    const copy = _KNOWLEDGE_BLOCK_COPY[sessionLanguage];
    if (!copy) return '';

    const lines = [
      copy.opening,
      copy.intro,
      copy.reference,
      copy.caution,
      '',
    ];

    units.forEach((unit, idx) => {
      const num = idx + 1;
      const isEnglish = sessionLanguage === 'en';
      const title = isEnglish && typeof unit.title === 'string' && unit.title.trim()
        ? unit.title.trim()
        : `${copy.unit} ${num}`;
      const topic = isEnglish && typeof unit.clinical_topic === 'string' && unit.clinical_topic.trim()
        ? unit.clinical_topic.trim()
        : '';
      const summary = _getLocalizedContent(unit, sessionLanguage).slice(0, 300);

      lines.push(`[${num}] ${title}`);
      if (topic) lines.push(`    ${copy.topic}: ${topic}`);
      if (summary) lines.push(`    ${copy.summary}: ${summary}`);
      lines.push('');
    });

    lines.push(copy.closing);
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ─── Private: strip sensitive fields before use ───────────────────────────────

/**
 * Returns a copy of the unit with admin-only fields removed.
 * Mirrors the backend retrieveCurriculumUnit function's sanitization.
 *
 * @private
 * @param {object} unit - Raw CBTCurriculumUnit record.
 * @returns {object} Sanitized copy.
 */
function _sanitizeUnit(unit) {
  try {
    // eslint-disable-next-line no-unused-vars
    const { admin_notes, source_chunk_ids, ...safe } = unit;
    return safe;
  } catch {
    return unit;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches a bounded set of CBTCurriculumUnit records that match the given
 * retrieval plan and returns a formatted knowledge block string.
 *
 * FLOW
 * ----
 *   1. Guard: plan must indicate shouldRetrieve: true.
 *   2. Guard: plan.domainHint must be in the first-wave allowed domain set.
 *   3. Guard: entity access must be available.
 *   4. Fetch: over-fetch active units (up to CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND).
 *   5. Filter: apply Wave 4A.2 filters in-memory via _isUnitEligible().
 *   6. Cap: hard-cap at CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS.
 *   7. Sanitize: strip admin_notes and source_chunk_ids.
 *   8. Format: build and return the knowledge block string.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Returns '' on any error at any step.  Never throws.  Session start is never blocked.
 *
 * PRIVACY
 * -------
 * - Only reads the shared CBTCurriculumUnit entity (non-private, therapist content).
 * - Does NOT read ThoughtJournal, Conversation, CaseFormulation body, MoodEntry,
 *   or CompanionMemory records — private user data is never accessed here.
 *
 * @param {object} entities - Base44 entity client map (from workflowContextInjector).
 * @param {object} plan     - Output of planCBTKnowledgeRetrieval() with shouldRetrieve: true.
 * @param {string} sessionLanguage - Exact language required for retrieval.
 * @param {object|null} functionsClient - Authenticated Base44 functions client.
 * @returns {Promise<string>} Formatted knowledge block string, or '' when empty/error.
 */
export async function retrieveBoundedCBTKnowledgeBlock(entities, plan, sessionLanguage, functionsClient = null) {
  try {
    // Guard 1: plan must say shouldRetrieve
    if (!plan || plan.shouldRetrieve !== true) return '';

    // Guard 2: session language is mandatory and normalized once.
    const normalizedSessionLanguage = typeof sessionLanguage === 'string'
      ? sessionLanguage.trim().toLowerCase()
      : '';
    if (!normalizedSessionLanguage) return '';

    // Guard 3: domain must be in the first-wave allowed set
    if (!CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE.has(plan.domainHint)) return '';

    // Guard 4: prefer the authenticated server read path. The entity fallback
    // remains for deterministic tests and non-production adapters only.
    const entityClient = entities?.CBTCurriculumUnit;
    const canInvokeServer = typeof functionsClient?.invoke === 'function';
    if (!canInvokeServer && !entityClient) return '';

    // Step 4: Over-fetch active units from the entity store
    let rawUnits = [];
    try {
      if (canInvokeServer) {
        const response = await functionsClient.invoke('retrieveCurriculumUnit', {
          planner_domain: plan.domainHint,
          language: normalizedSessionLanguage,
          limit: CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND,
        });
        const payload = response?.data ?? response;
        rawUnits = Array.isArray(payload?.units) ? payload.units : [];
      } else if (typeof entityClient?.filter === 'function') {
        rawUnits = await entityClient.filter(
          { is_active: true },
          '-priority_score',
          CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND
        );
      } else if (typeof entityClient?.list === 'function') {
        // Fallback: list all and filter is_active in-memory
        const all = await entityClient.list('-priority_score', CBT_KNOWLEDGE_RETRIEVAL_OVERFETCH_BOUND);
        rawUnits = Array.isArray(all) ? all.filter(u => u && u.is_active !== false) : [];
      }
    } catch {
      return '';
    }

    if (!Array.isArray(rawUnits) || rawUnits.length === 0) return '';

    // Step 5: Apply Wave 4A.2 filters in-memory
    const eligible = rawUnits.filter(u => u && typeof u === 'object' && _isUnitEligible(u, plan, normalizedSessionLanguage));
    if (eligible.length === 0) return '';

    // Step 5b (Wave 4D): Rank by unit type preference before capping.
    // Preferred unit_type units rise to the top so the hard cap favours them.
    // Ranking is deterministic; within each rank group the priority_score order is preserved.
    const ranked = _rankByUnitTypePreference(eligible, plan.unitTypePreference);

    // Step 6: Hard cap
    const capped = ranked.slice(0, CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS);

    // Step 7: Sanitize
    const sanitized = capped.map(_sanitizeUnit);

    // Step 8: Format and return
    return _formatKnowledgeBlock(sanitized, normalizedSessionLanguage);
  } catch {
    return '';
  }
}
