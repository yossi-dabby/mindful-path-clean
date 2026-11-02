/**
 * Worksheet Eligibility Gate — shared, language-independent enforcement.
 *
 * INVARIANT (Problem Statement):
 *   A therapeutic worksheet or form may be attached only when ALL of:
 *
 *   1. The user explicitly requested that worksheet/form, or explicitly accepted
 *      a clear offer for it.
 *   2. The intended recipient or target audience is known.
 *   3. Any age-restricted worksheet has explicit compatible age/age-range information;
 *      age must not be inferred from language, topic, writing style, or weak proxies.
 *   4. The worksheet is clinically relevant (responsibility of the resolver; assumed
 *      true if a form was resolved by the approved registry).
 *   5. The current user turn does not prohibit exercises, worksheets, or intervention.
 *   6. The same gate applies identically across Hebrew, English, and every other locale.
 *   7. Safety/crisis behavior retains precedence (handled upstream).
 *
 * ADDITIONAL RULES:
 *   - Offering a worksheet is not consent to attach it.
 *   - Stale consent for one named worksheet must not authorise a different worksheet.
 *   - A current-turn prohibition overrides earlier worksheet interest or consent.
 *
 * This module is designed to be test-importable with no browser globals.
 */

// ─── Audience age ranges ──────────────────────────────────────────────────────
// These are the canonical age ranges for each audience group.
// children: ages 5–11 (worksheets are designated for children up to age 11).
// adolescents: ages 12–17.
// adults: 18+ (no upper bound).
// older_adults: 65+ (no upper bound).
// parents: treated as adults for eligibility purposes.

/** @type {Readonly<Record<string, {age_min: number|null, age_max: number|null}>>} */
export const AUDIENCE_AGE_RANGES = Object.freeze({
  children:    { age_min: 5,  age_max: 11 },
  adolescents: { age_min: 12, age_max: 17 },
  adults:      { age_min: 18, age_max: null },
  older_adults:{ age_min: 65, age_max: null },
  parents:     { age_min: 18, age_max: null },
});

/** Audiences that carry age restrictions and require confirmed audience/age before attachment. */
const AGE_RESTRICTED_AUDIENCES = new Set(['children', 'adolescents']);

const WORKSHEET_LANGUAGE_ALIASES = Object.freeze({
  en: 'en', english: 'en', inglés: 'en', ingles: 'en', anglais: 'en', englisch: 'en', inglese: 'en', inglês: 'en',
  he: 'he', hebrew: 'he', עברית: 'he',
  es: 'es', spanish: 'es', español: 'es', espanol: 'es', espagnol: 'es', spanisch: 'es', spagnolo: 'es', espanhol: 'es',
  fr: 'fr', french: 'fr', français: 'fr', francais: 'fr', französisch: 'fr', francese: 'fr', francês: 'fr',
  de: 'de', german: 'de', deutsch: 'de', alemán: 'de', aleman: 'de', allemand: 'de', tedesco: 'de', alemão: 'de',
  it: 'it', italian: 'it', italiano: 'it', italien: 'it', italienisch: 'it', italien: 'it',
  pt: 'pt', portuguese: 'pt', português: 'pt', portugues: 'pt', portugais: 'pt', portugiesisch: 'pt', portoghese: 'pt',
});

function normalizeWorksheetLanguage(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().toLowerCase().replace('_', '-');
  const primary = normalized.split('-')[0];
  return WORKSHEET_LANGUAGE_ALIASES[normalized] || WORKSHEET_LANGUAGE_ALIASES[primary] || null;
}

function extractExplicitWorksheetLanguage(userMessage) {
  if (typeof userMessage !== 'string' || !userMessage.trim()) return null;
  const text = userMessage.toLowerCase();
  const languagePatterns = [
    ['en', /\b(?:english|inglés|ingles|anglais|englisch|inglese|inglês)\b/i],
    ['he', /\b(?:hebrew)\b|עברית/i],
    ['es', /\b(?:spanish|español|espanol|espagnol|spanisch|spagnolo|espanhol)\b/i],
    ['fr', /\b(?:french|français|francais|französisch|francese|francês)\b/i],
    ['de', /\b(?:german|deutsch|alemán|aleman|allemand|tedesco|alemão)\b/i],
    ['it', /\b(?:italian|italiano|italien|italienisch)\b/i],
    ['pt', /\b(?:portuguese|português|portugues|portugais|portugiesisch|portoghese)\b/i],
  ];
  for (const [language, pattern] of languagePatterns) {
    if (pattern.test(text)) return language;
  }
  return null;
}

// ─── Explicit request detection ────────────────────────────────────────────────
// Multi-signal: explicit send verbs (EN+HE+ES+FR+DE+IT+PT), explicit need/want,
// or a short affirmative following a prior message that mentioned worksheets/forms.

/**
 * Verbs and phrases that unambiguously signal a user wants a form sent to them.
 * Intentionally does NOT include bare "worksheet"/"form" mentions without request context.
 */
const SEND_VERB_PATTERN =
  /(?:\b(?:send|share|attach|give\s+me|please\s+send|i(?:'d)?\s+like\s+(?:the|a|an|that)|i\s+want\s+(?:the|a|an|that)|i\s+need\s+(?:the|a|an|that)|looking\s+for|provide|show\s+me\s+(?:the|a|an)|request(?:ing)?)\b|תשלח(?:י)?|שלח(?:י)?|תן\s+לי|תני\s+לי|בקשה(?:\s+ל)?|אני\s+(?:צריך|רוצה|מבקש)\s+(?:את\s+)?(?:הטופס|הדף|הטפסים|דף|טופס)|envía(?:me)?|comparte|adjunta|quiero\s+(?:el|la|los|las|un[ao]?)\s+(?:formulario|hoja|taller)|envoie(?:r)?|partager|joindre|je\s+veux\s+(?:le|la|les|un[e]?)\s+(?:formulaire|feuille|atelier)|senden|schicken|teilen|ich\s+möchte\s+(?:das|die|den|ein[e]?)\s+(?:formular|arbeitsblatt)|invia(?:mi)?|condividi|allega|voglio\s+(?:il|la|le|un[ao]?)\s+(?:modulo|foglio|scheda)|envia(?:r)?|compartilhar|anexar|quero\s+(?:o|a|os|as|um[a]?)\s+(?:formulário|folha|caderno))/i;

/**
 * Form/worksheet object terms, across all supported languages.
 * Includes plurals and implicit stage/module/series references that
 * unambiguously refer to a form bundle.
 * Used together with SEND_VERB_PATTERN.
 *
 * Hebrew notes:
 *   - "טופס" (singular form) uses vav: ט-ו-פ-ס; plural "טפסים" drops the vav.
 *   - "דף עבודה" (worksheet) uses final-pe (ף); "דפי עבודה" uses regular pe (פ).
 *   Both forms must be matched explicitly.
 */
const FORM_OBJECT_PATTERN =
  /\b(?:forms?|worksheets?|workbooks?|pdfs?|handouts?|module\s*\d+|stage\s*\d+|series)\b|(?:טופס|טפסים|הטופס|הטפסים)|דף\s*עבודה|דפי\s*עבודה|חוברת|שלב\s*\d+|מודול\s*\d*|סדרה\b|formularios?|hojas?\s+de\s+trabajo|cuadernos?|formulaires?|feuilles?\s+de\s+travail|formulars?|arbeitsbl(?:att|ätter?|aetter?)|moduli?|fogli(?:o)?\s+di\s+lavoro|formulários?|folhas?\s+de\s+trabalho|cadernos?/i;

/**
 * Short affirmative responses that signal acceptance of an earlier offer.
 */
const SHORT_AFFIRMATIVE_PATTERN =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|alright|go\s+ahead|please|please\s+do|please\s+send|please\s+share|that\s+(?:would\s+be\s+)?(?:great|good|helpful|perfect|fine)|sounds\s+good|sounds\s+great|i(?:'d|\s+would)\s+(?:like|appreciate|love)\s+that|send\s+it|attach\s+it|go\s+for\s+it|yes\s+please|אישור|כן|בבקשה|כן\s+בבקשה|שלח|sí|claro|oui|ja|sì|sim|por\s+favor)\.?$/i;

/**
 * Returns true when the user message contains an explicit request for a worksheet/form.
 *
 * "Explicit request" means:
 *   a) A send/request/need verb is present AND a form object is mentioned, OR
 *   b) The message is a short affirmative acceptance AND a *prior assistant message*
 *      offered a form (anaphoric acceptance of a proven assistant offer).
 *
 * Note: `previousAssistantOffer` must be text from an assistant turn, not user messages.
 * A generic earlier user-side worksheet mention is insufficient (see invariant rule 1).
 *
 * This function is language-independent: it tests both EN and HE patterns.
 *
 * @param {string|null} userMessage            - The current user turn text.
 * @param {string|null} previousAssistantOffer - Text of the immediately preceding assistant
 *                                               message that offered or mentioned a form.
 * @returns {boolean}
 */
export function hasExplicitWorksheetRequest(userMessage, previousAssistantOffer) {
  if (!userMessage || typeof userMessage !== 'string') return false;
  const msg = userMessage.trim();
  if (!msg) return false;

  // (a) Explicit send verb + form object in current message
  if (SEND_VERB_PATTERN.test(msg) && FORM_OBJECT_PATTERN.test(msg)) return true;

  // (b) Short affirmative + ASSISTANT offered a form in the preceding turn.
  // Acceptance is only valid when the assistant has already offered the exact form.
  if (SHORT_AFFIRMATIVE_PATTERN.test(msg)) {
    if (typeof previousAssistantOffer === 'string' && FORM_OBJECT_PATTERN.test(previousAssistantOffer)) {
      return true;
    }
  }

  return false;
}

// ─── Audience compatibility ────────────────────────────────────────────────────

/**
 * Returns true when the form's stated audience is age-restricted and requires
 * explicit confirmation before attachment.
 *
 * @param {string|undefined|null} formAudience
 * @returns {boolean}
 */
export function isAgeRestrictedAudience(formAudience) {
  return typeof formAudience === 'string' && AGE_RESTRICTED_AUDIENCES.has(formAudience);
}

// Minor audience set — children and adolescents are both minors.
const MINOR_AUDIENCES = new Set(['children', 'adolescents']);
// Adult audience set — these are incompatible with minor-targeted forms.
const ADULT_AUDIENCES = new Set(['adults', 'older_adults', 'parents']);

/**
 * Returns true when the confirmed recipient audience is compatible with the
 * form's stated audience.
 *
 * Compatibility rules:
 *   - Exact same audience is always compatible.
 *   - Children (5–11) and adolescents (12–17) are DISTINCT age groups and are
 *     NOT interchangeable. Numeric age checks are the only path to cross-group
 *     compatibility (i.e., a form for 5–11 cannot be given to a 12-year-old).
 *   - A minor audience (children or adolescents) is incompatible with an adult form.
 *   - An adult audience is incompatible with a minor (children/adolescents) form.
 *
 * @param {string} formAudience       - The form's audience field.
 * @param {string} confirmedAudience  - The audience extracted from the user's message.
 * @returns {boolean}
 */
export function isAudienceCompatible(formAudience, confirmedAudience) {
  if (!formAudience || !confirmedAudience) return false;
  if (formAudience === confirmedAudience) return true;
  const formIsMinor = MINOR_AUDIENCES.has(formAudience);
  const formIsAdult = ADULT_AUDIENCES.has(formAudience);
  const confirmedIsMinor = MINOR_AUDIENCES.has(confirmedAudience);
  const confirmedIsAdult = ADULT_AUDIENCES.has(confirmedAudience);
  // Block cross-group mismatch between minor and adult
  if (formIsMinor && confirmedIsAdult) return false;
  if (formIsAdult && confirmedIsMinor) return false;
  // Within the minor group: children ↔ adolescents are NOT interchangeable.
  // They serve distinct age windows (5–11 vs 12–17) with different clinical norms.
  // A numeric age check (above) is the correct vehicle for cross-minor compatibility.
  if (formIsMinor && confirmedIsMinor) return false;
  // Same adult sub-group (e.g., adults ↔ older_adults / parents): compatible
  return true;
}

// ─── Age extraction ────────────────────────────────────────────────────────────

/**
 * Extracts a numeric recipient age from natural-language text.
 * Handles patterns like "my 9-year-old", "age 10", "הוא בן 8", "aged 12".
 * Returns null when no age is found.
 *
 * @param {string|null} text
 * @returns {number|null}
 */
export function extractRecipientAge(text) {
  if (!text || typeof text !== 'string') return null;
  // EN: "9-year-old", "9 year old", "9yo", "age 9", "aged 9"
  let m = text.match(/\b(\d{1,2})[\s-]?(?:year(?:s)?[\s-]?old|yo\b)/i);
  if (m) return Number(m[1]);
  m = text.match(/\bage[d]?\s+(\d{1,2})\b/i);
  if (m) return Number(m[1]);
  // HE: "בן 9", "בת 9", "בגיל 9"
  m = text.match(/(?:בן|בת|בגיל)\s+(\d{1,2})\b/);
  if (m) return Number(m[1]);
  return null;
}

// ─── Audience extraction (re-export wrapper) ──────────────────────────────────
// Wraps the audience extraction from aiFormsAccess without creating a circular import.
// Supports the same subset of audiences that appear in AUDIENCE_AGE_RANGES.

const AUDIENCE_EXTRACTION_MAP = Object.freeze([
  { audiences: ['children'],    patterns: [/\b(?:child(?:ren)?|kid(?:s)?)\b/i, /ילד|ילדים/] },
  { audiences: ['adolescents'], patterns: [/\b(?:adolescents?|teens?|teenager(?:s)?)\b/i, /מתבגר|מתבגרים/] },
  { audiences: ['adults'],      patterns: [/\badults?\b/i, /מבוגר|מבוגרים/] },
  { audiences: ['older_adults'],patterns: [/\bolder\s+adults?\b/i, /קשיש|קשישים/] },
  { audiences: ['parents'],     patterns: [/\bparents?\b/i, /הורה|הורים/] },
]);

/**
 * Extracts the intended recipient audience from natural-language text.
 * Returns null when no audience can be inferred.
 *
 * @param {string|null} text
 * @returns {string|null}
 */
export function extractConfirmedAudience(text) {
  if (!text || typeof text !== 'string') return null;
  for (const { audiences, patterns } of AUDIENCE_EXTRACTION_MAP) {
    for (const p of patterns) {
      if (p.test(text)) return audiences[0];
    }
  }
  return null;
}

/**
 * Derives a canonical audience value from a known numeric age using the
 * canonical AUDIENCE_AGE_RANGES boundaries.
 * This is used to confirm audience when an explicit age is given but no
 * audience word (child/teen/adult) appears in the message.
 *
 * @param {number} age
 * @returns {string|null}
 */
function deriveAudienceFromAge(age) {
  if (typeof age !== 'number' || !Number.isFinite(age)) return null;
  if (age >= AUDIENCE_AGE_RANGES.children.age_min && age <= AUDIENCE_AGE_RANGES.children.age_max) return 'children';
  if (age >= AUDIENCE_AGE_RANGES.adolescents.age_min && age <= AUDIENCE_AGE_RANGES.adolescents.age_max) return 'adolescents';
  if (age >= AUDIENCE_AGE_RANGES.older_adults.age_min) return 'older_adults';
  if (age >= AUDIENCE_AGE_RANGES.adults.age_min) return 'adults';
  return null;
}

// ─── Main eligibility gate ────────────────────────────────────────────────────

/**
 * Checks whether a resolved worksheet may be attached based on the eligibility
 * invariant described in the module header.
 *
 * @param {object|null} form  - Resolved form metadata (from the therapeutic forms registry).
 *   Expected fields: { audience, age_max?, age_min?, form_id?, id?, slug? }
 * @param {object} context
 *   @param {string|null}  context.userMessage                    - Current user turn.
 *   @param {string|null}  [context.previousAssistantOffer]        - Text of the immediately
 *                                                                    preceding assistant message
 *                                                                    that offered/mentioned a form.
 *                                                                    Required for short-affirmative
 *                                                                    acceptance; user-side messages
 *                                                                    do not count.
 *   @param {string|null}  [context.confirmedAudience]             - Explicitly confirmed recipient audience.
 *                                                                    Derived from userMessage when not provided.
 *   @param {number|null}  [context.recipientAge]                  - Explicitly known recipient age.
 *                                                                    Derived from userMessage when not provided.
 *   @param {boolean}      [context.currentTurnProhibitsWorksheet] - True when current turn has explicit no-form suppression.
 *   @param {string|null}  [context.consentedFormId]               - Specific form ID consented to in a prior offer, if any.
 *   @param {boolean}      [context.clinicallyRelevant]            - True when the resolver/registry has provided
 *                                                                    authoritative evidence that this form is relevant
 *                                                                    to the current clinical goal/domain. Defaults to
 *                                                                    false (fail closed) when not supplied.
 *
 * @returns {{ allowed: boolean, reason: string }}
 */
export function checkWorksheetEligibilityGate(form, context = {}) {
  const safeContext = context && typeof context === 'object' ? context : {};
  const {
    userMessage = null,
    previousAssistantOffer = null,
    currentTurnProhibitsWorksheet = false,
    consentedFormId = null,
    clinicallyRelevant = false,
  } = safeContext;

  // Derive audience and age from message when not passed explicitly
  let confirmedAudience =
    safeContext.confirmedAudience !== undefined
      ? safeContext.confirmedAudience
      : extractConfirmedAudience(userMessage);

  const recipientAge =
    safeContext.recipientAge !== undefined
      ? safeContext.recipientAge
      : extractRecipientAge(userMessage);

  // When audience is not explicitly mentioned but an explicit age is given,
  // derive the audience from the canonical age ranges.
  // This covers "for my 9-year-old" (→ children) without relying on weak proxies.
  if (!confirmedAudience && typeof recipientAge === 'number') {
    confirmedAudience = deriveAudienceFromAge(recipientAge);
  }

  // Rule 5 / Rule 9: Current-turn prohibition overrides everything, including earlier consent.
  if (currentTurnProhibitsWorksheet) {
    return { allowed: false, reason: 'current_turn_prohibits_worksheet' };
  }

  // Rule 1: Worksheet attachment requires explicit user request in this turn.
  // Short affirmatives are only valid when the immediately preceding ASSISTANT message
  // offered the exact form (previousAssistantOffer). User-side prior mentions are insufficient.
  if (!hasExplicitWorksheetRequest(userMessage, previousAssistantOffer)) {
    return { allowed: false, reason: 'no_explicit_request' };
  }

  // Rule 4: Clinical relevance must be evidenced by the resolver/registry for the
  // current clinical goal/domain. Fail closed when not explicitly confirmed.
  if (!clinicallyRelevant) {
    return { allowed: false, reason: 'clinical_relevance_unconfirmed' };
  }

  // Rule 10: The attachment language must match either the language explicitly
  // requested in the current turn or, when none was requested, the active
  // session language. This is the final authority for both deterministic routes
  // and model-emitted [FORM:...] markers.
  const sessionLanguage = normalizeWorksheetLanguage(safeContext.sessionLanguage);
  const requestedLanguage =
    normalizeWorksheetLanguage(safeContext.requestedLanguage) ||
    extractExplicitWorksheetLanguage(userMessage);
  const requiredLanguage = requestedLanguage || sessionLanguage;
  const formLanguage = normalizeWorksheetLanguage(form?.language || form?.form_language);
  if (requiredLanguage && formLanguage && formLanguage !== requiredLanguage) {
    return {
      allowed: false,
      reason: 'language_incompatible',
      required_language: requiredLanguage,
      form_language: formLanguage,
    };
  }

  // Rules 2 + 3 + 4: For age-restricted forms the recipient audience must be known
  // and age-compatible. Fail closed when eligibility cannot be confirmed.
  if (form && isAgeRestrictedAudience(form.audience)) {
    // Children forms (age_max: 11) require:
    //   1. Confirmed children audience, AND
    //   2. Explicit numeric age within the children range.
    // Exact form-title knowledge is NOT a substitute for age confirmation.
    if (form.audience === 'children') {
      if (!confirmedAudience) {
        return {
          allowed: false,
          reason: 'age_restricted_unknown_audience',
          shouldAskClarification: true,
        };
      }
      if (!isAudienceCompatible(form.audience, confirmedAudience)) {
        return { allowed: false, reason: 'audience_incompatible' };
      }
      // Children forms require an explicit numeric age — audience label alone is not enough
      // because children and adolescents span different numeric windows and the age boundary
      // (≤ 11) is clinically meaningful.
      if (typeof recipientAge !== 'number') {
        return {
          allowed: false,
          reason: 'age_restricted_unknown_age',
          shouldAskClarification: true,
        };
      }
    } else {
      // For other age-restricted audiences (adolescents): only block when the
      // user has EXPLICITLY mentioned an incompatible audience.
      if (confirmedAudience && !isAudienceCompatible(form.audience, confirmedAudience)) {
        return { allowed: false, reason: 'audience_incompatible' };
      }
    }

    // For all age-restricted forms: when recipient age is known, check the age range.
    // Age range comes from (in priority order):
    //   1. Explicit age_max / age_min on the form object itself.
    //   2. Canonical AUDIENCE_AGE_RANGES lookup.
    if (typeof recipientAge === 'number') {
      const formAgeMax =
        typeof form.age_max === 'number'
          ? form.age_max
          : (AUDIENCE_AGE_RANGES[form.audience]?.age_max ?? null);
      const formAgeMin =
        typeof form.age_min === 'number'
          ? form.age_min
          : (AUDIENCE_AGE_RANGES[form.audience]?.age_min ?? null);

      if (typeof formAgeMax === 'number' && recipientAge > formAgeMax) {
        return { allowed: false, reason: 'recipient_age_exceeds_form_maximum', age_max: formAgeMax };
      }
      if (typeof formAgeMin === 'number' && recipientAge < formAgeMin) {
        return { allowed: false, reason: 'recipient_age_below_form_minimum', age_min: formAgeMin };
      }
    }
  }

  // Rule 8: Stale consent prevention.
  // Earlier consent for a specific named worksheet must not authorise a different one.
  if (consentedFormId != null && form) {
    const formId   = form.form_id || form.id || null;
    const formSlug = form.form_slug || form.slug || null;
    if (formId !== consentedFormId && formSlug !== consentedFormId) {
      return { allowed: false, reason: 'stale_consent_different_form' };
    }
  }

  return { allowed: true, reason: 'eligible' };
}

/**
 * Convenience wrapper: returns true when the given form should be blocked
 * by the eligibility gate.  Never throws.
 *
 * @param {object|null} form
 * @param {object}      context  — same shape as checkWorksheetEligibilityGate context.
 * @returns {boolean}
 */
export function isWorksheetBlockedByGate(form, context = {}) {
  if (!form) return false; // no form to gate
  try {
    return !checkWorksheetEligibilityGate(form, context).allowed;
  } catch {
    // Fail closed: if the gate itself throws, block the attachment.
    return true;
  }
}


