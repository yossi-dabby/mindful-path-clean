import {
  getAllTherapeuticForms,
  getTherapeuticFormsRegistryDiagnostics,
  SUPPORTED_LANGUAGES,
  VALID_AUDIENCE_VALUES,
} from './index.js';

const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);
const VALID_AUDIENCE_SET = new Set(VALID_AUDIENCE_VALUES);

const LANGUAGE_ALIAS_MAP = Object.freeze({
  en: 'en',
  english: 'en',
  inglés: 'en',
  ingles: 'en',
  anglais: 'en',
  englisch: 'en',
  inglese: 'en',
  inglês: 'en',
  he: 'he',
  hebrew: 'he',
  עברית: 'he',
  es: 'es',
  spanish: 'es',
  español: 'es',
  espanol: 'es',
  fr: 'fr',
  french: 'fr',
  français: 'fr',
  francais: 'fr',
  de: 'de',
  german: 'de',
  deutsch: 'de',
  it: 'it',
  italian: 'it',
  italiano: 'it',
  pt: 'pt',
  portuguese: 'pt',
  português: 'pt',
  portugues: 'pt',
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
  'older-adult': 'older_adults',
  older_adults: 'older_adults',
  'older-adults': 'older_adults',
  parent: 'parents',
  parents: 'parents',
});

const FORM_INTENT_PATTERNS = Object.freeze({
  list: /(?:\b(?:what forms|which forms|list forms|forms do you have|show forms|available forms)\b|איזה טפסים|רשימת טפסים|qu[eé]\s+(?:formularios|hojas\s+de\s+trabajo)|lista\s+de\s+(?:formularios|hojas\s+de\s+trabajo)|quels?\s+(?:formulaires|feuilles\s+de\s+travail)|liste\s+des?\s+(?:formulaires|feuilles\s+de\s+travail)|welche\s+(?:formulare|arbeitsblätter|arbeitsblaetter)|liste\s+der\s+(?:formulare|arbeitsblätter|arbeitsblaetter)|quali\s+(?:moduli|fogli\s+di\s+lavoro)|elenco\s+(?:dei|delle)\s+(?:moduli|schede)|quais\s+(?:formulários|formularios|folhas\s+de\s+trabalho)|lista\s+de\s+(?:formulários|formularios|folhas\s+de\s+trabalho))/iu,
  // Keep Latin-script send verbs inside word boundaries. Without the leading
  // boundary, Spanish "dame" also matched inside Portuguese "repetidamente".
  send: /(?:\b(?:send|share|attach|give\s+me|envía(?:me)?|envia(?:me)?|comparte|adjunta|dame|(?:envoie|envoyez)(?:-moi)?|partage|jo(?:ins|ignez)|sende|schick|teile|gib\s+mir|invia(?:mi)?|condividi|allega|dammi|envie(?:-me)?|envia(?:-me)?|compartilhe|anexe|dê-me|de-me)\b|תשלח(?:י)?|שלח(?:י)?|תן\s+לי|תני\s+לי)/iu,
});

const FORM_OBJECT_PATTERN =
  /(?:\b(?:forms?|worksheets?|workbooks?|handouts?)\b|טופס|טפסים|דף\s*עבודה|דפי\s*עבודה|חוברת|formularios?|hojas?\s+de\s+trabajo|cuadernos?|formulaires?|fiches?|feuilles?\s+de\s+travail|cahiers?|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|sched[ae]|formulários?|fichas?|folhas?\s+de\s+trabalho|exercícios?|cadernos?)/iu;

const MODULE_SCOPE_PATTERN =
  /(?:module|stage|מודול|שלב|módulo|modulo|étape|etape|stufe)\s*0?([1-9]|10)\b/iu;

const MULTILINGUAL_MULTI_FORM_REQUEST_PATTERN =
  /(?:varios?|varias?|algunos?|algunas?|todos?|todas?|plusieurs|quelques|tous|toutes|mehrere|einige|alle|diversi|diverse|alcuni|alcune|tutti|tutte|vários?|várias?|alguns?|algumas?)\s+(?:formularios?|hojas?\s+de\s+trabajo|formulaires?|feuilles?\s+de\s+travail|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|formulários?|folhas?\s+de\s+trabalho)/iu;

const MULTI_FORM_CAPABILITY_PATTERN =
  /(?:puedes|puede|peux-tu|pouvez-vous|kannst\s+du|können\s+sie|puoi|può|você\s+pode|podes).{0,80}(?:varios?|varias?|plusieurs|mehrere|diversi|diverse|vários?|várias?).{0,40}(?:formularios?|hojas?\s+de\s+trabajo|formulaires?|feuilles?\s+de\s+travail|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|formulários?|folhas?\s+de\s+trabalho)/iu;

const CATEGORY_SYNONYMS = Object.freeze({
  ocd: ['ocd', 'intrusive thoughts', 'sticky thoughts', 'ritual', 'compulsion'],
  anxiety: ['anxiety', 'fear', 'worry', 'test anxiety', 'performance anxiety', 'separation anxiety'],
  anger: ['anger', 'outburst', 'rage', 'regulation'],
  sleep: ['sleep', 'night', 'bedtime', 'insomnia'],
  psychosomatic: ['stomach ache', 'headache', 'before school', 'body stress', 'somatic'],
  self_esteem: ['self-esteem', 'self esteem', 'not good enough', 'self worth'],
});

const CHILDREN_GROUP_LABELS = Object.freeze([
  'Children CBT Core',
  'Children CBT Specialized',
  'Anxiety & Fears',
  'Behavior & Emotional Regulation',
  'Social Skills & Self-Esteem',
  'OCD & Trauma-Sensitive Coping',
  'Functional & Stress-Related Body Problems',
]);

const ADOLESCENTS_GROUP_LABELS = Object.freeze([
  'Adolescents CBT Core',
  'Adolescents CBT Specialized',
]);

export const MAX_GENERATED_FILES_PER_RESPONSE = 5;
export const MAX_MODEL_CANDIDATE_FORMS = 8;
const MULTI_FORM_CAPABILITY_RESPONSE_HE = 'כן. אני יכול לשלוח כמה טפסים יחד, עד 5 טפסים בתגובה אחת. אם יש קובץ מאוחד מתאים, אעדיף לשלוח אותו במקום להציף בכמה קבצים.';
const MULTI_FORM_CAPABILITY_RESPONSE_EN = 'Yes. I can send several forms together, up to 5 forms in one response. If a combined module PDF exists, I will prefer that instead of sending many separate files.';
const ADDITIONAL_LOCALE_FORM_RESPONSES = Object.freeze({
  es: Object.freeze({
    capability: 'Sí. Puedo enviar varios formularios juntos, hasta 5 por respuesta.',
    noExactList: 'No encontré formularios instalados que coincidan con el idioma y el público solicitados.',
    noExactSearch: 'No encontré una coincidencia exacta entre los formularios instalados.',
    noExactSend: 'No encontré todavía un formulario compatible que pueda adjuntar.',
    broad: 'La colección es muy amplia. Indica un tema, módulo o público para limitar la selección a un máximo de 5 formularios.',
  }),
  fr: Object.freeze({
    capability: 'Oui. Je peux envoyer plusieurs formulaires ensemble, jusqu’à 5 par réponse.',
    noExactList: 'Je n’ai trouvé aucun formulaire installé correspondant à la langue et au public demandés.',
    noExactSearch: 'Je n’ai trouvé aucune correspondance exacte parmi les formulaires installés.',
    noExactSend: 'Je n’ai pas encore trouvé de formulaire compatible à joindre.',
    broad: 'La collection est très vaste. Indiquez un thème, un module ou un public afin de limiter la sélection à 5 formulaires.',
  }),
  de: Object.freeze({
    capability: 'Ja. Ich kann mehrere Formulare zusammen senden, bis zu 5 pro Antwort.',
    noExactList: 'Ich habe keine installierten Formulare gefunden, die zur gewünschten Sprache und Zielgruppe passen.',
    noExactSearch: 'Ich habe unter den installierten Formularen keine genaue Übereinstimmung gefunden.',
    noExactSend: 'Ich habe noch kein passendes Formular zum Anhängen gefunden.',
    broad: 'Die Sammlung ist sehr groß. Nenne ein Thema, Modul oder eine Zielgruppe, um die Auswahl auf höchstens 5 Formulare einzugrenzen.',
  }),
  it: Object.freeze({
    capability: 'Sì. Posso inviare più moduli insieme, fino a 5 per risposta.',
    noExactList: 'Non ho trovato moduli installati che corrispondano alla lingua e al pubblico richiesti.',
    noExactSearch: 'Non ho trovato una corrispondenza esatta tra i moduli installati.',
    noExactSend: 'Non ho ancora trovato un modulo compatibile da allegare.',
    broad: 'La raccolta è molto ampia. Indica un argomento, un modulo o un pubblico per limitare la selezione a un massimo di 5 moduli.',
  }),
  pt: Object.freeze({
    capability: 'Sim. Posso enviar vários formulários juntos, até 5 por resposta.',
    noExactList: 'Não encontrei formulários instalados que correspondam ao idioma e ao público solicitados.',
    noExactSearch: 'Não encontrei uma correspondência exata entre os formulários instalados.',
    noExactSend: 'Ainda não encontrei um formulário compatível para anexar.',
    broad: 'A coleção é muito ampla. Indique um tema, módulo ou público para limitar a seleção a no máximo 5 formulários.',
  }),
});
const ENGLISH_MULTI_FORM_REQUEST_PATTERN = /\b(all forms|all worksheets|several forms|multiple forms|few forms|several worksheets|multiple worksheets)\b/i;
const NUMERIC_MULTI_FORM_REQUEST_PATTERN = /\b\d{1,2}\s*(?:forms?|worksheets?|טפסים|דפי\s*עבודה|formularios?|hojas?\s+de\s+trabajo|formulaires?|feuilles?\s+de\s+travail|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|formulários?|folhas?\s+de\s+trabalho)\b/iu;
const HEBREW_MULTI_FORM_REQUEST_PATTERN = /(?:כמה|מספר)\s*(טפסים|דפים|דפי\s*עבודה)|כל\s*(הטפסים|שלב|מודול)|שלח(?:י)?\s*לי\s*כמה\s*טפסים|שלח(?:י)?\s*לי\s*מספר\s*טפסים|תן(?:י)?\s*לי\s*כמה\s*טפסים|אני\s*צריך\s*כמה\s*טפסים|כמה\s*דפים\s*שמתאימים|מספר\s*דפי\s*עבודה/i;

const NUMBER_WORD_MAP = Object.freeze({
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
});

function normalizeText(value) {
  // Intentional fail-soft normalization for search/indexing paths:
  // non-string/null values are treated as empty text, so candidate scanning
  // remains total-order deterministic without runtime throws.
  return String(value || '').toLowerCase().trim();
}

function normalizeLanguage(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const lower = value.trim().toLowerCase();
  const aliased = LANGUAGE_ALIAS_MAP[lower] || lower.split('-')[0];
  return SUPPORTED_LANGUAGE_SET.has(aliased) ? aliased : null;
}

function normalizeAudience(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = AUDIENCE_ALIAS_MAP[value.trim().toLowerCase()] || value.trim().toLowerCase();
  return VALID_AUDIENCE_SET.has(normalized) ? normalized : null;
}

function getVariantGroupKey(form) {
  if (!form || typeof form !== 'object') return null;
  return normalizeText(form.logical_form_id || form.variant_group_id || form.id) || null;
}

function dedupeFormsById(forms) {
  const seen = new Set();
  const output = [];
  for (const form of forms) {
    const id = normalizeText(form?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(form);
  }
  return output;
}

function extractRequestedLanguage(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (/\b(?:english|inglés|ingles|anglais|englisch|inglese|inglês)\b/u.test(normalized) || /באנגלית|אנגלית/.test(normalized)) return 'en';
  if (/\bhebrew\b/.test(normalized) || /עברית/.test(normalized)) return 'he';
  if (/\b(?:spanish|español|espanol)\b/u.test(normalized)) return 'es';
  if (/\b(?:french|français|francais)\b/u.test(normalized)) return 'fr';
  if (/\b(?:german|deutsch)\b/u.test(normalized)) return 'de';
  if (/\b(?:italian|italiano)\b/u.test(normalized)) return 'it';
  if (/\b(?:portuguese|português|portugues)\b/u.test(normalized)) return 'pt';
  return null;
}

function extractRequestedAudience(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (/\b(?:children|child|kids|kid|niños?|niñas?|enfants?|kinder|kind|bambin[ioae]|crianças?|crianca|criancas)\b/u.test(normalized) || /ילד|ילדים/.test(normalized)) return 'children';
  if (/\b(?:adolescents?|teens?|teenagers?|adolescentes?|jugendliche|adolescenti)\b/u.test(normalized) || /מתבגר|מתבגרים/.test(normalized)) return 'adolescents';
  if (/\b(?:adults?|adultes?|erwachsene|adulti)\b/u.test(normalized)) return 'adults';
  return null;
}

function extractRequestedCount(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const digitMatch = normalized.match(/\b(\d{1,2})\b/);
  if (digitMatch) return Number(digitMatch[1]);

  for (const [word, count] of Object.entries(NUMBER_WORD_MAP)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) return count;
  }

  if (/\b(?:several|few|multiple|some|כמה|מספר|varios?|varias?|algunos?|algunas?|plusieurs|quelques|mehrere|einige|diversi|diverse|alcuni|alcune|vários?|várias?|alguns?|algumas?)\b/iu.test(normalized)) return 3;
  if (/\b(?:all|every|כול|כל|todos?|todas?|tous|toutes|alle|tutti|tutte)\b/iu.test(normalized)) return MAX_GENERATED_FILES_PER_RESPONSE;
  return null;
}

function extractRequestedModuleNumber(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const match = normalized.match(MODULE_SCOPE_PATTERN);
  if (!match) return null;
  return Number(match[1]);
}

function requestsModuleOrStageScope(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return MODULE_SCOPE_PATTERN.test(normalized);
}

function requestsManyForms(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return (
    ENGLISH_MULTI_FORM_REQUEST_PATTERN.test(normalized) ||
    NUMERIC_MULTI_FORM_REQUEST_PATTERN.test(normalized) ||
    HEBREW_MULTI_FORM_REQUEST_PATTERN.test(normalized) ||
    MULTILINGUAL_MULTI_FORM_REQUEST_PATTERN.test(normalized)
  );
}

function asksMultiFormCapability(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return (
    /(?:\bcan you\b|\bare you able\b|\bdo you support\b|האם\s*את(?:ה|)\s*יכול|אפשר)\s*(?:.*?)(?:send|share|attach|לשלוח|לשלח)\s*(?:.*?)(?:multiple|several|כמה|מספר)\s*(?:forms|worksheets|טפסים|דפי\s*עבודה)/i.test(normalized) ||
    /(?:רק\s*טופס\s*אחד|only\s*one\s*form\s*at\s*a\s*time|one\s*form\s*at\s*a\s*time)/i.test(normalized) ||
    MULTI_FORM_CAPABILITY_PATTERN.test(normalized)
  );
}

function isBroadAllFormsRequest(intent) {
  const raw = normalizeText(intent?.rawQuery || intent?.query || '');
  if (!raw) return false;
  const asksAll = /\b(?:all forms|all worksheets)\b|כל\s*הטפסים|(?:todos?|todas?|tous|toutes|alle|tutti|tutte)\s+(?:formularios?|hojas?\s+de\s+trabajo|formulaires?|feuilles?\s+de\s+travail|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|formulários?|folhas?\s+de\s+trabalho)/iu.test(raw);
  const hasScope = MODULE_SCOPE_PATTERN.test(raw) || /\b(?:children|child|kids|adolescents|teens|anxiety|ocd|anger|sleep|niños?|niñas?|enfants?|kinder|jugendliche|bambin[ioae]|crianças?|adolescentes?|ansiedad|anxiété|angst|ansia|ansiedade)\b|(?:מודול|שלב|ילד|ילדים|מתבגר|מתבגרים|חרדה|כעס|שינה|היפרדות)/iu.test(raw);
  return asksAll && !hasScope;
}

function getCombinedForms(forms) {
  return forms.filter((form) => form?.isCombinedPdf === true || form?.cardType === 'combined_pdf' || form?.type === 'module_pdf' || form?.type === 'stage_combined_pdf' || form?.type === 'workbook_package');
}

function limitGeneratedFiles(files, requestedCount) {
  const maxRequested = Number.isFinite(requestedCount) ? Math.max(1, requestedCount) : MAX_GENERATED_FILES_PER_RESPONSE;
  const cappedCount = Math.min(MAX_GENERATED_FILES_PER_RESPONSE, maxRequested);
  return dedupeFormsById(files).slice(0, cappedCount);
}

function getDefaultLanguage(language) {
  return normalizeLanguage(language) || 'en';
}

function getMultiFormCapabilityResponse(language) {
  const normalized = getDefaultLanguage(language);
  if (normalized === 'he') return MULTI_FORM_CAPABILITY_RESPONSE_HE;
  return ADDITIONAL_LOCALE_FORM_RESPONSES[normalized]?.capability || MULTI_FORM_CAPABILITY_RESPONSE_EN;
}

function flattenFormFields(form) {
  return [
    form?.id,
    form?.slug,
    form?.title,
    form?.displayTitle,
    form?.worksheetNumber,
    form?.worksheet_number,
    form?.audience,
    form?.language,
    form?.category,
    form?.mainCategory,
    form?.clinicalGroup,
    form?.subcategory,
    form?.moduleTitle,
    form?.module_title,
    form?.therapeuticGoal,
    form?.therapeutic_goal,
    form?.whenToUse,
    form?.when_to_use,
    form?.aiMatchingSummary,
    form?.ai_matching_summary,
    form?.safetyNotes,
    form?.safety_notes,
    form?.filePath,
    form?.file_path,
    form?.fileUrl,
    ...(Array.isArray(form?.keywords) ? form.keywords : []),
    ...(Array.isArray(form?.clinicalKeywords) ? form.clinicalKeywords : []),
    ...(Array.isArray(form?.intentPhrases) ? form.intentPhrases : []),
    ...(Array.isArray(form?.secondaryCategories) ? form.secondaryCategories : []),
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value))
    .join(' ');
}

function scoreFormMatch(form, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;
  const haystack = flattenFormFields(form);
  if (!haystack) return 0;

  let score = 0;
  if (haystack.includes(normalizedQuery)) score += 180;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  for (const term of terms) {
    if (term.length <= 1) continue;
    if (haystack.includes(term)) score += 20;
  }

  for (const synonyms of Object.values(CATEGORY_SYNONYMS)) {
    if (synonyms.some((token) => normalizedQuery.includes(token))) {
      if (synonyms.some((token) => haystack.includes(token))) score += 35;
    }
  }

  const stageMatch = normalizedQuery.match(/(?:stage|שלב)\s*([1-9])/i);
  const requestedStage = stageMatch ? Number(stageMatch[1]) : null;
  const formStage = Number(form?.stageNumber ?? form?.moduleNumber ?? NaN);
  if (Number.isFinite(requestedStage) && Number.isFinite(formStage)) {
    if (requestedStage === formStage) score += 120;
    else score -= 25;
  }

  return score;
}

function getAvailableLanguagesForForms(forms) {
  const languages = new Set();
  for (const form of forms || []) {
    const normalized = normalizeLanguage(form?.language);
    if (normalized) languages.add(normalized);
  }
  return Array.from(languages).sort();
}

function rankResolvedCandidate(form, normalizedInput) {
  if (!form) return 0;
  const normalizedId = normalizeText(form.id);
  const normalizedSlug = normalizeText(form.slug);
  if (normalizedId === normalizedInput || normalizedSlug === normalizedInput) return 3;
  const normalizedLogicalId = normalizeText(form.logical_form_id);
  const normalizedVariantGroup = normalizeText(form.variant_group_id);
  if (normalizedLogicalId === normalizedInput || normalizedVariantGroup === normalizedInput) return 2;
  return 1;
}

function buildLanguageSelection(forms, requestedLanguage, activeLanguage, allowEnglishFallback = true) {
  const strictLanguage = normalizeLanguage(requestedLanguage);
  if (strictLanguage) {
    return {
      forms: forms.filter((form) => form?.language === strictLanguage),
      resolvedLanguage: strictLanguage,
      usedFallback: false,
      fallbackReason: null,
    };
  }

  const normalizedActive = getDefaultLanguage(activeLanguage);
  const activeMatches = forms.filter((form) => form?.language === normalizedActive);
  if (activeMatches.length > 0) {
    return {
      forms: activeMatches,
      resolvedLanguage: normalizedActive,
      usedFallback: false,
      fallbackReason: null,
    };
  }

  if (allowEnglishFallback) {
    const englishMatches = forms.filter((form) => form?.language === 'en');
    if (englishMatches.length > 0) {
      return {
        forms: englishMatches,
        resolvedLanguage: 'en',
        usedFallback: true,
        fallbackReason: normalizedActive === 'en' ? null : 'no_same_language_forms',
      };
    }
  }

  return {
    forms: [],
    resolvedLanguage: normalizedActive,
    usedFallback: false,
    fallbackReason: null,
  };
}

export function listFormsForAI(filters = {}) {
  const allForms = getAllTherapeuticForms();
  const approvedForms = allForms.filter((form) => form?.approved === true);

  const audience = normalizeAudience(filters.audience);
  const category = typeof filters.category === 'string' ? filters.category.trim() : null;
  const subcategory = typeof filters.subcategory === 'string' ? filters.subcategory.trim() : null;
  const languageSelection = buildLanguageSelection(
    approvedForms,
    filters.language,
    filters.activeLanguage || filters.language,
    filters.allowEnglishFallback !== false
  );

  return languageSelection.forms.filter((form) => {
    if (audience && form?.audience !== audience) return false;
    if (category && String(form?.category || '').toLowerCase() !== category.toLowerCase()) return false;
    if (subcategory && String(form?.subcategory || '').toLowerCase() !== subcategory.toLowerCase()) return false;
    return true;
  });
}

export function searchFormsForAI(query, filters = {}) {
  const normalizedQuery = normalizeText(query);
  const candidates = listFormsForAI(filters);
  if (!normalizedQuery) return candidates.slice(0, 20);

  return candidates
    .map((form) => ({ form, score: scoreFormMatch(form, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.form);
}

export function resolveFormByIdOrSlug(formId, options = {}) {
  const normalizedInput = String(formId || '').trim();
  if (!normalizedInput) return null;

  const requestedLanguage = normalizeLanguage(options.language);
  const allForms = getAllTherapeuticForms().filter((form) => form?.approved === true);
  const normalizedLookupInput = normalizeText(normalizedInput);
  const byIdOrSlug = allForms.filter((form) => {
    const id = normalizeText(form?.id);
    const slug = normalizeText(form?.slug);
    const logicalFormId = normalizeText(form?.logical_form_id);
    const variantGroupId = normalizeText(form?.variant_group_id);
    return (
      id === normalizedLookupInput ||
      slug === normalizedLookupInput ||
      logicalFormId === normalizedLookupInput ||
      variantGroupId === normalizedLookupInput
    );
  });
  if (byIdOrSlug.length === 0) return null;

  const variantGroupKeys = new Set(
    byIdOrSlug
      .map((form) => getVariantGroupKey(form))
      .filter(Boolean)
  );
  const variantCandidates = variantGroupKeys.size > 0
    ? allForms.filter((form) => variantGroupKeys.has(getVariantGroupKey(form)))
    : byIdOrSlug;
  const candidates = dedupeFormsById([...byIdOrSlug, ...variantCandidates]);

  const languageSelection = buildLanguageSelection(
    candidates,
    requestedLanguage,
    options.activeLanguage || options.language,
    options.allowEnglishFallback !== false
  );
  const resolved = languageSelection.forms
    .slice()
    .sort((a, b) => rankResolvedCandidate(b, normalizedLookupInput) - rankResolvedCandidate(a, normalizedLookupInput))[0] || null;
  if (!resolved) return null;

  return {
    form: resolved,
    resolvedLanguage: languageSelection.resolvedLanguage,
    usedFallbackLanguage: languageSelection.usedFallback,
    fallbackReason: languageSelection.fallbackReason,
    availableLanguages: getAvailableLanguagesForForms(candidates),
  };
}

export function createGeneratedFileFromResolvedForm(resolvedFormInput) {
  const normalizeResolvedInput = (input) => {
    if (input?.form) return input;
    return { form: input, resolvedLanguage: input?.language || 'en' };
  };
  const payload = normalizeResolvedInput(resolvedFormInput);
  const form = payload?.form;
  if (!form) return null;

  const language = normalizeLanguage(payload?.resolvedLanguage) || normalizeLanguage(form?.language) || 'en';
  const languageBlock = form?.languages?.[language] || form?.languages?.en || null;
  const url = languageBlock?.file_url || form?.fileUrl || null;
  if (!url) return null;

  const fileName = languageBlock?.file_name || String(url).split('/').pop() || `${form.id || 'worksheet'}.pdf`;
  const title = languageBlock?.title || form?.title || form?.id || 'Therapeutic Form';

  return {
    id: form.id,
    type: 'pdf',
    title,
    fileName,
    name: fileName,
    url,
    file_path: form.file_path || form.filePath || null,
    mime_type: 'application/pdf',
    audience: form.audience || null,
    language,
    category: form.category || null,
    subcategory: form.subcategory || null,
    source: 'therapeutic_forms_registry',
    form_id: form.id || null,
    form_slug: form.slug || null,
    logical_form_id: form.logical_form_id || null,
    variant_language: form.variant_language || language,
    available_languages: Array.isArray(payload?.availableLanguages)
      ? payload.availableLanguages
      : (Array.isArray(form.available_languages) ? form.available_languages : getAvailableLanguagesForForms([form])),
    sibling_variant_ids: Array.isArray(form.sibling_variant_ids) ? form.sibling_variant_ids : [],
    source_language: form.source_language || null,
    is_language_variant: form.is_language_variant === true,
    variant_group_id: form.variant_group_id || null,
    created_at: new Date().toISOString(),
  };
}

export function getAvailableFormGroups(filters = {}) {
  const forms = listFormsForAI(filters);
  const languages = new Set();
  const audiences = new Set();
  const categories = new Set();
  const subcategories = new Set();

  for (const form of forms) {
    if (form?.language) languages.add(form.language);
    if (form?.audience) audiences.add(form.audience);
    if (form?.category) categories.add(form.category);
    if (form?.subcategory) subcategories.add(form.subcategory);
  }

  return {
    total: forms.length,
    languages: Array.from(languages).sort(),
    audiences: Array.from(audiences).sort(),
    categories: Array.from(categories).sort(),
    subcategories: Array.from(subcategories).sort(),
    audienceGroups: {
      children: CHILDREN_GROUP_LABELS,
      adolescents: ADOLESCENTS_GROUP_LABELS,
    },
    examples: forms.slice(0, 5).map((form) => ({
      id: form.id,
      title: form.title || form.languages?.[form.language || 'en']?.title || form.id,
      audience: form.audience,
      language: form.language,
      category: form.category,
    })),
  };
}

export function getFormsRegistryStats() {
  const diagnostics = getTherapeuticFormsRegistryDiagnostics(getAllTherapeuticForms());
  return {
    total: diagnostics.total,
    byLanguage: diagnostics.byLanguage,
    byAudience: diagnostics.byAudience,
    byCategory: diagnostics.byCategory,
    source: diagnostics.source,
  };
}

/**
 * Returns true when the current user turn explicitly suppresses delivery of a
 * therapeutic form, worksheet, exercise, or homework.
 *
 * Rules:
 *  - An explicit replacement introduced by "instead", "but send", or "במקום"
 *    cancels the suppression so the request remains positive.
 *  - Only the current turn is examined; the result must not be persisted.
 *  - Positive requests such as "Please attach a worksheet" are never suppressed.
 *  - Unrelated negations such as "I do not want to wait; send me the worksheet"
 *    are not suppressed because the form object and the negation are in separate
 *    clauses.
 *  - Hebrew cross-line continuation: "ואל תציע\nאו תצרף תרגיל/טופס" is suppressed
 *    even though the negation verb and form objects span a line break, because
 *    "אל תציע" followed by "או תצרף" in the same message unambiguously continues
 *    the same prohibition.
 */
export function hasExplicitFormSuppressionIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const norm = String(text).toLowerCase().trim();
  if (!norm) return false;

  // An explicit replacement instruction cancels suppression in the same message.
  if (/\binstead\b/.test(norm) || /\bbut\s+send\b/.test(norm) || /במקום/.test(norm)) {
    return false;
  }

  // Form object terms — English
  const FORM_OBJ_EN =
    /\b(?:forms?|therapeutic\s+forms?|worksheets?|exercises?|homework|workbooks?|structured\s+exercises?|handouts?)\b/i;
  // Form object terms — Hebrew
  const FORM_OBJ_HE =
    /(?:טפסים|טופס(?:\s+טיפולי)?|דף\s*עבודה|דפי\s*עבודה|תרגילים|תרגיל|שיעורי\s+בית|חוברת|קובץ\s+עבודה)/;
  // Form object terms — Spanish, French, German, Italian, and Portuguese.
  const FORM_OBJ_ADDITIONAL =
    /(?:formularios?|hojas?\s+de\s+trabajo|cuadernos?|formulaires?|feuilles?\s+de\s+travail|cahiers?|formulare?|arbeitsbl(?:att|ätter?|aetter?)|modul[oi]|fogli(?:o)?\s+di\s+lavoro|sched[ae]|formulários?|folhas?\s+de\s+trabalho|fichas?\s+de\s+trabalho|exercícios?|cadernos?)/iu;

  // Hebrew cross-line continuation pattern:
  // "ואל תציע\nאו תצרף <form-object>" — the negation verb and the form objects
  // span a line break with a Hebrew conjunction continuation ("או" = "or").
  // Test the whole message (not per-clause) to catch this pattern.
  if (
    /(?:^|\s)(?:ו)?אל\s+(?:תציע|תשלח|תצרף)/.test(norm) &&
    FORM_OBJ_HE.test(norm)
  ) {
    return true;
  }

  // Split into clauses on sentence-ending punctuation and line breaks.
  // Commas are intentionally NOT used as clause separators so that a comma list
  // such as "exercise, worksheet, form" stays together in one clause.
  const clauses = norm.split(/[;.?!\n]+/).map(s => s.trim()).filter(Boolean);

  for (const clause of clauses) {
    // Both a form object AND a suppression construction must appear in the same
    // clause. This prevents "I do not want to wait; send me the worksheet" from
    // being suppressed: the negation is in the first clause, the form object is
    // only in the second clause.
    if (!FORM_OBJ_EN.test(clause) && !FORM_OBJ_HE.test(clause) && !FORM_OBJ_ADDITIONAL.test(clause)) continue;

    const hasSuppression =
      // English: "don't" / "do not" / "please don't" / "please do not"
      /\b(?:don'?t|do\s+not|please\s+don'?t|please\s+do\s+not)\b/.test(clause) ||
      // English: "I do not want" / "I don't want"
      /\b(?:i\s+)?(?:don'?t|do\s+not)\s+want\b/.test(clause) ||
      // English: "not asking for"
      /\bnot\s+asking\s+for\b/.test(clause) ||
      // English: "no <form-object>" — "no" immediately precedes the form term
      /\bno\s+(?:(?:more|any|further|additional)\s+)?(?:forms?|worksheets?|exercises?|homework|workbooks?|handouts?)\b/i.test(clause) ||
      // English: "without <form-object>"
      /\bwithout\s+(?:\w+\s+){0,3}(?:forms?|worksheets?|exercises?|homework|workbooks?|handouts?)\b/i.test(clause) ||
      // Hebrew: אל תציע / אל תשלח / אל תצרף (within-clause)
      /אל\s+(?:תציע|תשלח|תצרף)/.test(clause) ||
      // Hebrew: לא רוצה / לא מבקש
      /לא\s+(?:רוצה|מבקש)/.test(clause) ||
      // Hebrew: בלי (without)
      /(?:^|\s)בלי(?:\s|$)/.test(clause) ||
      // Hebrew: לא עכשיו / לא כרגע
      /לא\s+(?:עכשיו|כרגע)/.test(clause) ||
      // Spanish: no envíes/adjuntes/ofrezcas; sin/ningún formulario.
      /\bno\s+(?:me\s+)?(?:envíes|envies|adjuntes|compartas|ofrezcas|propongas)\b/iu.test(clause) ||
      /\b(?:sin|ning[uú]n(?:a)?)\b/iu.test(clause) ||
      // French: ne ... pas; sans/aucun formulaire.
      /\bne\b.{0,60}\b(?:pas|plus)\b/iu.test(clause) ||
      /\b(?:sans|aucun(?:e)?)\b/iu.test(clause) ||
      // German: kein Formular / ohne Arbeitsblatt.
      /\b(?:kein(?:e[nsr]?)?|ohne)\b/iu.test(clause) ||
      // Italian: non inviare/allegare/proporre; senza/nessun modulo.
      /\bnon\s+(?:inviare|inviarmi|invia|allegare|allega|proporre|proponi|condividere)\b/iu.test(clause) ||
      /\b(?:senza|nessun(?:a|o)?)\b/iu.test(clause) ||
      // Portuguese: não envie/anexe/ofereça; sem/nenhum formulário.
      /\bnão\s+(?:me\s+)?(?:envie|envia|anexe|anexa|compartilhe|ofereça|proponha)\b/iu.test(clause) ||
      /\bnão\s+(?:quero|gostaria|pretendo)\b/iu.test(clause) ||
      /\b(?:sem|nenhum(?:a)?)\b/iu.test(clause);

    if (hasSuppression) return true;
  }

  return false;
}

const EXPLICIT_FORM_REQUEST_ACTION_PATTERN =
  /(?:\b(?:show|open|download|find|search\s+for|look\s+for|need|want|choose|recommend|provide)\b|(?:תראה|תראי|הצג|הציגי|פתח|פתחי|הורד|הורידי|מצא|מצאי|חפש|חפשי|צריך|צריכה|רוצה|רוצה\s+לקבל|בחר|בחרי|המלץ|המליצי|צרף|צרפי)|(?:mu[eé]strame|necesito|quiero|busca|encuentra)|(?:montre-moi|j['’]ai\s+besoin|je\s+veux|cherche|trouve)|(?:zeig|brauche|möchte|suche|finde)|(?:mostra|ho\s+bisogno|voglio|cerca|trova)|(?:mostre|preciso|quero|procure|encontre))/iu;

const EXPLICIT_FORM_REQUEST_QUESTION_PATTERN =
  /(?:\b(?:what|which|where|can\s+you|could\s+you|do\s+you\s+have)\b.{0,80}(?:forms?|worksheets?|workbooks?|handouts?)\b|(?:איזה|אילו|איפה|האם\s+יש|יש\s+לך|אפשר).{0,80}(?:טופס|טפסים|דף\s*עבודה|דפי\s*עבודה|חוברת)|(?:qu[eé]|cu[aá]l|d[oó]nde|puedes).{0,80}(?:formularios?|hojas?\s+de\s+trabajo|cuadernos?)|(?:quel|quelle|où|pouvez-vous).{0,80}(?:formulaires?|feuilles?\s+de\s+travail|cahiers?)|(?:welche|wo|kannst\s+du).{0,80}(?:formulare?|arbeitsbl(?:att|ätter?|aetter?))|(?:quale|quali|dove|puoi).{0,80}(?:modul[oi]|fogli(?:o)?\s+di\s+lavoro|sched[ae])|(?:qual|quais|onde|pode).{0,80}(?:formulários?|folhas?\s+de\s+trabalho|fichas?\s+de\s+trabalho))/iu;

const DIRECT_FORM_NOUN_PHRASE_PATTERN =
  /^(?:please\s+|בבקשה\s+)?(?:a\s+|an\s+|the\s+)?(?:therapeutic\s+)?(?:form|worksheet|workbook|handout)\b|^(?:בבקשה\s+)?(?:טופס|טפסים|דף\s*עבודה|דפי\s*עבודה|חוברת)\b/iu;

/**
 * Returns true only when the current turn explicitly asks to access the forms
 * library. Merely mentioning CBT, therapy, sessions, tools, prior homework, or
 * having used a worksheet in the past is not a forms request.
 */
export function hasExplicitFormAccessRequest(userMessage) {
  const text = normalizeText(userMessage);
  if (!text || hasExplicitFormSuppressionIntent(userMessage)) return false;

  if (FORM_INTENT_PATTERNS.list.test(text) || asksMultiFormCapability(text)) {
    return true;
  }

  const formObjectMatch = text.match(FORM_OBJECT_PATTERN);
  const sendActionMatch = text.match(FORM_INTENT_PATTERNS.send);
  const accessActionMatch = text.match(EXPLICIT_FORM_REQUEST_ACTION_PATTERN);
  const explicitIdMatch = text.match(/\b[a-z0-9]+(?:[_-][a-z0-9]+){2,}\b/i);
  const hasFormObject = !!formObjectMatch;
  const formObjectIndex = formObjectMatch?.index ?? -1;
  const hasNearbySendAction =
    !!sendActionMatch &&
    Math.abs((sendActionMatch.index ?? -1) - formObjectIndex) <= 100;
  const hasForwardAccessAction =
    !!accessActionMatch &&
    (accessActionMatch.index ?? -1) <= formObjectIndex &&
    formObjectIndex - (accessActionMatch.index ?? -1) <= 100;
  const hasExplicitAction = hasNearbySendAction || hasForwardAccessAction;
  const hasExplicitIdRequest =
    !!explicitIdMatch &&
    !!sendActionMatch &&
    (sendActionMatch.index ?? -1) <= (explicitIdMatch.index ?? -1) &&
    (explicitIdMatch.index ?? -1) - (sendActionMatch.index ?? -1) <= 120;
  const hasExplicitQuestion = EXPLICIT_FORM_REQUEST_QUESTION_PATTERN.test(text);
  const isDirectNounPhrase =
    text.length <= 160 && DIRECT_FORM_NOUN_PHRASE_PATTERN.test(text);
  const hasRequestedModule =
    MODULE_SCOPE_PATTERN.test(text) &&
    (hasExplicitAction || /(?:קובץ\s*מאוחד|כל\s*שלב)/u.test(text));

  return (hasFormObject && (hasExplicitAction || hasExplicitQuestion || isDirectNounPhrase)) ||
    hasExplicitIdRequest ||
    hasRequestedModule;
}

export function detectFormIntent(userMessage) {
  const text = normalizeText(userMessage);
  if (!text) return null;

  // Guard: explicit suppression of form delivery in the current turn → no intent.
  if (hasExplicitFormSuppressionIntent(userMessage)) return null;

  // A forms notice/attachment is allowed only for an explicit current-turn
  // request. Clinical discussion that merely mentions CBT or prior tools must
  // continue normally without the forms-library policy taking over.
  if (!hasExplicitFormAccessRequest(userMessage)) return null;

  const requestedAudience = extractRequestedAudience(text);
  const requestedLanguage = extractRequestedLanguage(text);
  const asksList = FORM_INTENT_PATTERNS.list.test(text);
  const asksSend = FORM_INTENT_PATTERNS.send.test(text)
    || FORM_OBJECT_PATTERN.test(text)
    || MODULE_SCOPE_PATTERN.test(text)
    || /קובץ\s*מאוחד|כל\s*שלב/.test(text);
  const mentionsCategory = /(?:\b(?:category|group|groups|categoría|categoria|catégorie|categorie|kategorie|categoria)\b|קטגור)/iu.test(text);
  const explicitIdMatch = text.match(/\b([a-z0-9]+(?:[_-][a-z0-9]+){2,})\b/);
  const requestedCount = extractRequestedCount(text);
  const requestedModuleNumber = extractRequestedModuleNumber(text);
  const asksMany = requestsManyForms(text);
  const asksModuleScope = requestsModuleOrStageScope(text);
  const asksMultiCapability = asksMultiFormCapability(text);

  if (asksList && !requestedAudience && !requestedLanguage && !mentionsCategory) {
    return { type: 'list_all_forms', audience: null, language: requestedLanguage, query: text };
  }
  if (asksList && requestedAudience) {
    return { type: 'list_forms_by_audience', audience: requestedAudience, language: requestedLanguage, query: text };
  }
  if (asksList && requestedLanguage) {
    return { type: 'list_forms_by_language', audience: requestedAudience, language: requestedLanguage, query: text };
  }
  if (asksList && mentionsCategory) {
    return { type: 'list_forms_by_category', audience: requestedAudience, language: requestedLanguage, query: text };
  }
  if (asksMultiCapability) {
    return {
      type: 'forms_capability_query',
      audience: requestedAudience,
      language: requestedLanguage,
      query: text,
      rawQuery: text,
    };
  }
  if (asksSend && explicitIdMatch && FORM_INTENT_PATTERNS.send.test(text)) {
    return { type: 'send_specific_form', audience: requestedAudience, language: requestedLanguage, query: explicitIdMatch[1], rawQuery: text };
  }
  if (asksSend && asksModuleScope) {
    return {
      type: 'send_module_forms',
      audience: requestedAudience,
      language: requestedLanguage,
      query: text,
      requestedCount,
      requestedModuleNumber,
      rawQuery: text,
    };
  }
  if (asksSend && asksMany) {
    return {
      type: 'send_multiple_forms',
      audience: requestedAudience,
      language: requestedLanguage,
      query: text,
      requestedCount,
      rawQuery: text,
    };
  }
  if (asksSend) {
    return { type: 'send_best_matching_form', audience: requestedAudience, language: requestedLanguage, query: text };
  }
  if (FORM_OBJECT_PATTERN.test(text)) {
    return { type: 'search_forms_by_need', audience: requestedAudience, language: requestedLanguage, query: text };
  }

  return null;
}

function formatNearestMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return '';
  return matches
    .slice(0, 3)
    .map((form) => `- ${form.title || form.id} (${form.audience}, ${form.language}, ${form.category})`)
    .join('\n');
}

export function resolveFormForAIRequest(userMessage, context = {}) {
  const intent = detectFormIntent(userMessage);
  const stats = getFormsRegistryStats();
  if (!intent) {
    return {
      intent: null,
      stats,
      matches: [],
      nearestMatches: [],
      generatedFile: null,
      generatedFiles: [],
      maxGeneratedFiles: MAX_GENERATED_FILES_PER_RESPONSE,
      responseText: null
    };
  }

  const activeLanguage = getDefaultLanguage(context.language || context.activeLanguage);
  const requestedLanguage = intent.language || extractRequestedLanguage(userMessage);
  const filters = {
    audience: intent.audience || context.audience || null,
    activeLanguage,
    language: requestedLanguage,
    allowEnglishFallback: requestedLanguage === 'en' || activeLanguage === 'en',
  };

  if (intent.type === 'send_specific_form') {
    const resolved = resolveFormByIdOrSlug(intent.query, filters);
    const generatedFile = resolved ? createGeneratedFileFromResolvedForm(resolved) : null;
    const availableLanguages = resolved?.availableLanguages || [];
    const availableLanguagesText = availableLanguages.join(', ') || 'none';
    return {
      intent,
      stats,
      matches: resolved?.form ? [resolved.form] : [],
      nearestMatches: [],
      generatedFile,
      generatedFiles: generatedFile ? [generatedFile] : [],
      maxGeneratedFiles: MAX_GENERATED_FILES_PER_RESPONSE,
      resolvedLanguage: resolved?.resolvedLanguage || activeLanguage,
      responseText: generatedFile
        ? `I found a matching worksheet and attached it.`
        : `I couldn't find that exact form ID for this language. Available languages for nearby variants: ${availableLanguagesText}. I can search by audience, category, or therapeutic goal.`,
      usedFallbackLanguage: resolved?.usedFallbackLanguage === true,
      fallbackReason: resolved?.fallbackReason || null,
      availableLanguages,
    };
  }

  const matches = searchFormsForAI(intent.query || userMessage, filters);
  const nearestMatches = matches.slice(0, 5);
  const modelCandidates = matches.slice(0, MAX_MODEL_CANDIDATE_FORMS);
  const best = nearestMatches[0] || null;
  let generatedFile = intent.type === 'send_best_matching_form' && best
    ? createGeneratedFileFromResolvedForm(best)
    : null;
  let generatedFiles = generatedFile ? [generatedFile] : [];

  if (intent.type === 'forms_capability_query') {
    const capabilityText = getMultiFormCapabilityResponse(activeLanguage);
    return {
      intent,
      stats,
      matches: modelCandidates,
      nearestMatches,
      generatedFile: null,
      generatedFiles: [],
      maxGeneratedFiles: MAX_GENERATED_FILES_PER_RESPONSE,
      resolvedLanguage: activeLanguage,
      responseText: capabilityText,
      usedFallbackLanguage: false,
      fallbackReason: null,
      availableLanguages: getAvailableLanguagesForForms(nearestMatches),
    };
  }

  if (intent.type === 'send_multiple_forms' || intent.type === 'send_module_forms') {
    let multiCandidates = matches;

    if (intent.type === 'send_module_forms' && Number.isFinite(intent.requestedModuleNumber)) {
      const moduleNumber = Number(intent.requestedModuleNumber);
      const moduleScoped = matches.filter((form) =>
        Number(form?.moduleNumber ?? form?.module_number ?? form?.stageNumber) === moduleNumber
      );
      if (moduleScoped.length > 0) {
        multiCandidates = moduleScoped;
      }
    }

    const combinedCandidates = getCombinedForms(multiCandidates);
    const prefersAllScope = /\b(?:all|כול|כל|todos?|todas?|tous|toutes|alle|tutti|tutte)\b/iu.test(intent.rawQuery || '');
    const explicitlyWantsWorksheets = FORM_OBJECT_PATTERN.test(intent.rawQuery || '');
    const worksheetOnlyCandidates = explicitlyWantsWorksheets
      ? multiCandidates.filter((form) => !combinedCandidates.includes(form))
      : multiCandidates;
    const preferredCandidates = prefersAllScope && combinedCandidates.length > 0
      ? combinedCandidates
      : (worksheetOnlyCandidates.length > 0 ? worksheetOnlyCandidates : multiCandidates);

    if (intent.type === 'send_multiple_forms' && isBroadAllFormsRequest(intent)) {
      generatedFiles = [];
      generatedFile = null;
    } else if (intent.type === 'send_module_forms' && combinedCandidates.length > 0) {
      const preferredCombined = combinedCandidates[0];
      generatedFiles = preferredCombined
        ? [createGeneratedFileFromResolvedForm(preferredCombined)].filter(Boolean)
        : [];
      generatedFile = generatedFiles[0] || null;
    } else {
      const selectedForms = limitGeneratedFiles(preferredCandidates, intent.requestedCount);
      generatedFiles = selectedForms
        .map((form) => createGeneratedFileFromResolvedForm(form))
        .filter(Boolean);
      generatedFile = generatedFiles[0] || null;
    }
  }

  const groups = getAvailableFormGroups(filters);
  const localizedFormsCopy = ADDITIONAL_LOCALE_FORM_RESPONSES[activeLanguage] || null;
  const languagesText = groups.languages.length > 0 ? groups.languages.join(', ') : 'none';
  const categoriesText = groups.categories.length > 0 ? groups.categories.join(', ') : 'none';
  const hasSameLanguageForms = groups.languages.includes(activeLanguage);
  const fallbackNote = requestedLanguage === 'en' || activeLanguage === 'en'
    ? ''
    : (hasSameLanguageForms ? '' : `\nI currently found available worksheets in: ${languagesText}.`);

  const listText = groups.total === 0 && localizedFormsCopy
    ? localizedFormsCopy.noExactList
    : [
        `I found ${groups.total} approved forms in this scope.`,
        `Languages: ${languagesText}.`,
        `Audiences: ${groups.audiences.join(', ') || 'none'}.`,
        `Categories: ${categoriesText}.`,
        groups.examples.length > 0 ? `Examples:\n${groups.examples.map((example) => `- ${example.title} (${example.audience}, ${example.category})`).join('\n')}` : '',
        fallbackNote,
      ]
        .filter(Boolean)
        .join('\n');

  const searchText = best
    ? `I found a close match: ${best.title || best.id} (${best.audience}, ${best.language}, ${best.category}).`
    : (localizedFormsCopy?.noExactSearch || `I couldn't find an exact match. Nearby installed options:\n${formatNearestMatches(nearestMatches) || '- none found'}`);

  const sendText = generatedFile
    ? (generatedFile.language !== activeLanguage && !requestedLanguage
      ? `I found a worksheet match and attached it in ${generatedFile.language.toUpperCase()}. Available languages in this scope: ${languagesText}. If you prefer a different language, tell me which one.`
      : generatedFiles.length > 1
        ? `I found ${generatedFiles.length} matching forms and attached them. I can send up to ${MAX_GENERATED_FILES_PER_RESPONSE} at a time.`
        : 'I found a matching worksheet and attached it.')
    : (
      intent.type === 'send_multiple_forms' && isBroadAllFormsRequest(intent)
        ? (localizedFormsCopy?.broad || 'The forms collection is very large, so I won’t send dozens at once. Tell me a topic, module, or audience and I can send up to 5 of the most relevant forms.')
        : (localizedFormsCopy?.noExactSend || `I couldn't find an exact sendable match yet. Here are nearby options:\n${formatNearestMatches(nearestMatches) || '- none found'}`)
    );

  const responseByIntent = {
    list_all_forms: listText,
    list_forms_by_audience: listText,
    list_forms_by_language: listText,
    list_forms_by_category: listText,
    search_forms_by_need: searchText,
    send_best_matching_form: sendText,
    send_multiple_forms: sendText,
    send_module_forms: sendText,
    forms_capability_query: getMultiFormCapabilityResponse(activeLanguage),
  };

  return {
    intent,
    stats,
    matches: modelCandidates,
    nearestMatches,
    generatedFile,
    generatedFiles,
    maxGeneratedFiles: MAX_GENERATED_FILES_PER_RESPONSE,
    resolvedLanguage: generatedFile?.language || best?.language || activeLanguage,
    responseText: responseByIntent[intent.type] || searchText,
    usedFallbackLanguage: Boolean(generatedFile && generatedFile.language !== activeLanguage && !requestedLanguage),
    fallbackReason: generatedFile && generatedFile.language !== activeLanguage && !requestedLanguage ? 'no_same_language_forms' : null,
    availableLanguages: generatedFile?.available_languages || getAvailableLanguagesForForms(nearestMatches),
  };
}
