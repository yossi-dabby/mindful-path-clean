import { detectCrisisLanguage } from '../components/utils/crisisDetector.js';

const EXACTLY_ONE_ACTION_PATTERNS = Object.freeze([
  /\bexactly\s+(?:one|1)\s+(?:(?:concrete|physical|practical|small|single)\s+)?(?:action|step)\b/i,
  /\b(?:one|1)\s+(?:(?:concrete|physical|practical|small|single)\s+)?(?:action|step)\s+only\b/i,
  /(?:פעולה|צעד)\s+(?:[א-ת]+\s+){0,3}?(?:אחת|אחד)\s+בלבד/u,
  /בדיוק\s+(?:פעולה|צעד)\s+(?:[א-ת]+\s+){0,3}?(?:אחת|אחד)/u,
  /\bexactamente\s+(?:una\s+(?:sola\s+)?acción|un\s+(?:solo\s+)?paso)\b/iu,
  /\b(?:solo|solamente|únicamente)\s+(?:una\s+acción|un\s+paso)\b/iu,
  /\bexactement\s+(?:une\s+(?:seule\s+)?(?:action|étape)|un\s+seul\s+pas)\b/iu,
  /\b(?:une\s+seule\s+(?:action|étape)|un\s+seul\s+pas)\b/iu,
  /\bgenau\s+(?:eine\s+(?:einzige\s+)?(?:handlung|aktion)|einen\s+(?:einzigen\s+)?schritt)\b/iu,
  /\bnur\s+(?:eine\s+(?:handlung|aktion)|einen\s+schritt)\b/iu,
  /\besattamente\s+(?:una\s+(?:sola\s+)?azione|un\s+(?:solo\s+)?passo)\b/iu,
  /\b(?:una\s+sola\s+azione|un\s+solo\s+passo)\b/iu,
  /\bexatamente\s+(?:uma\s+(?:única\s+)?ação|um\s+(?:único\s+)?passo)\b/iu,
  /\b(?:apenas|somente)\s+(?:uma\s+ação|um\s+passo)\b/iu,
]);

const EN_ACTION_VERBS = Object.freeze([
  'choose', 'select', 'decide', 'stand', 'walk', 'go', 'open', 'close', 'put',
  'place', 'write', 'send', 'read', 'take', 'set', 'start', 'do', 'pick',
  'prepare', 'make', 'call', 'contact', 'schedule', 'breathe', 'look', 'move',
  'turn', 'hold', 'notice', 'sit', 'get', 'return',
]);

const HE_ACTION_VERBS = Object.freeze([
  'בחר', 'בחרי', 'קום', 'קומי', 'לך', 'לכי', 'הולך', 'הולכת', 'פתח', 'פתחי',
  'סגור', 'סגרי', 'הנח', 'הניחי', 'שים', 'שימי', 'כתוב', 'כתבי', 'שלח',
  'שלחי', 'קרא', 'קראי', 'עשה', 'עשי', 'סדר', 'סדרי', 'הכן', 'הכיני',
  'נשום', 'נשמי', 'עמוד', 'עמדי', 'שב', 'שבי', 'קח', 'קחי', 'החזר',
  'החזירי', 'התקשר', 'התקשרי',
]);

const ES_ACTION_VERBS = Object.freeze([
  'elige', 'selecciona', 'decide', 'levántate', 'ponte', 'camina', 've', 'abre',
  'cierra', 'pon', 'coloca', 'escribe', 'envía', 'lee', 'toma', 'ajusta', 'empieza',
  'comienza', 'haz', 'escoge', 'prepara', 'llama', 'contacta', 'programa', 'respira',
  'mira', 'mueve', 'gira', 'sostén', 'nota', 'siéntate', 'vuelve',
]);

const FR_ACTION_VERBS = Object.freeze([
  'choisissez', 'choisis', 'sélectionnez', 'sélectionne', 'décidez', 'décide',
  'levez-vous', 'lève-toi', 'marchez', 'marche', 'allez', 'va', 'ouvrez', 'ouvre',
  'fermez', 'ferme', 'posez', 'pose', 'placez', 'place', 'écrivez', 'écris',
  'envoyez', 'envoie', 'lisez', 'lis', 'prenez', 'prends', 'commencez', 'commence',
  'faites', 'fais', 'préparez', 'prépare', 'appelez', 'appelle', 'contactez',
  'contacte', 'planifiez', 'planifie', 'respirez', 'respire', 'regardez', 'regarde',
  'bougez', 'bouge', 'tournez', 'tourne', 'tenez', 'tiens', 'remarquez', 'remarque',
  'asseyez-vous', 'assieds-toi', 'revenez', 'reviens',
]);

const DE_ACTION_VERBS = Object.freeze([
  'wähle', 'wählen sie', 'entscheide', 'entscheiden sie', 'steh auf', 'stehen sie auf',
  'geh', 'gehen sie', 'öffne', 'öffnen sie', 'schließe', 'schließen sie', 'lege',
  'legen sie', 'platziere', 'platzieren sie', 'schreib', 'schreibe', 'schreiben sie',
  'sende', 'senden sie', 'lies', 'lesen sie', 'nimm', 'nehmen sie', 'stelle',
  'stellen sie', 'beginne', 'beginnen sie', 'mach', 'machen sie', 'bereite',
  'bereiten sie', 'ruf', 'rufe', 'rufen sie', 'kontaktiere', 'kontaktieren sie',
  'plane', 'planen sie', 'atme', 'atmen sie', 'schau', 'schauen sie', 'bewege',
  'bewegen sie', 'drehe', 'drehen sie', 'halte', 'halten sie', 'bemerke',
  'bemerken sie', 'setz dich', 'setzen sie sich', 'kehre zurück', 'kehren sie zurück',
]);

const IT_ACTION_VERBS = Object.freeze([
  'scegli', 'seleziona', 'decidi', 'alzati', 'cammina', 'vai', 'apri', 'chiudi',
  'metti', 'posiziona', 'scrivi', 'invia', 'leggi', 'prendi', 'imposta', 'inizia',
  'comincia', 'fai', 'prepara', 'chiama', 'contatta', 'programma', 'respira',
  'guarda', 'muovi', 'gira', 'tieni', 'nota', 'siediti', 'torna',
]);

const PT_ACTION_VERBS = Object.freeze([
  'escolha', 'selecione', 'decida', 'levante-se', 'caminhe', 'vá', 'abra', 'feche',
  'ponha', 'coloque', 'escreva', 'envie', 'leia', 'pegue', 'ajuste', 'comece',
  'inicie', 'faça', 'prepare', 'ligue', 'contacte', 'contate', 'agende', 'respire',
  'olhe', 'mova', 'vire', 'segure', 'note', 'sente-se', 'volte',
]);

const ACTION_VERBS_BY_LOCALE = Object.freeze({
  en: EN_ACTION_VERBS,
  he: HE_ACTION_VERBS,
  es: ES_ACTION_VERBS,
  fr: FR_ACTION_VERBS,
  de: DE_ACTION_VERBS,
  it: IT_ACTION_VERBS,
  pt: PT_ACTION_VERBS,
});

const ACTION_PREFIX_BY_LOCALE = Object.freeze({
  en: '(?:please\\s+)?',
  he: '(?:נא\\s+|עכשיו\\s+)?',
  es: '(?:(?:por favor|ahora)\\s+)?',
  fr: '(?:(?:s[’\']il vous plaît|maintenant)\\s+)?',
  de: '(?:(?:bitte|jetzt)\\s+)?',
  it: '(?:(?:per favore|ora|adesso)\\s+)?',
  pt: '(?:(?:por favor|agora)\\s+)?',
});

const CONNECTORS_BY_LOCALE = Object.freeze({
  en: ['and then', 'then', 'and'],
  he: [],
  es: ['y luego', 'luego', 'y'],
  fr: ['et puis', 'puis', 'et'],
  de: ['und dann', 'dann', 'und'],
  it: ['e poi', 'poi', 'e'],
  pt: ['e depois', 'depois', 'e'],
});

const ACTION_START_BY_LOCALE = Object.freeze(Object.fromEntries(
  Object.entries(ACTION_VERBS_BY_LOCALE).map(([locale, verbs]) => [
    locale,
    new RegExp(
      `^${ACTION_PREFIX_BY_LOCALE[locale]}(?:${verbs.join('|')})(?=\\s|$|[-–—])`,
      locale === 'he' ? 'u' : 'iu',
    ),
  ]),
));

const HE_VAV_ACTION_SPLIT = new RegExp(
  `\\s+ו(?=(?:${HE_ACTION_VERBS.join('|')})(?:\\s|$))`,
  'u',
);

function normalizeLocale(locale) {
  const language = typeof locale === 'string'
    ? locale.trim().toLowerCase().split(/[-_]/)[0]
    : 'en';
  return Object.prototype.hasOwnProperty.call(ACTION_VERBS_BY_LOCALE, language)
    ? language
    : 'en';
}

function splitSentences(text) {
  return String(text || '')
    .match(/[^.!?\n]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

function stripLeadingConnector(clause, locale) {
  const connectors = CONNECTORS_BY_LOCALE[locale] || CONNECTORS_BY_LOCALE.en;
  const connectorPattern = connectors.length > 0
    ? new RegExp(`^(?:${connectors.join('|')})\\s+`, 'iu')
    : null;
  const withoutConnector = connectorPattern
    ? String(clause || '').replace(connectorPattern, '')
    : String(clause || '');
  return withoutConnector.replace(/^ו(?=[א-ת])/u, '').trim();
}

function splitActionClauses(sentence, locale) {
  const connectors = CONNECTORS_BY_LOCALE[locale] || CONNECTORS_BY_LOCALE.en;
  const separator = connectors.length > 0
    ? new RegExp(`\\s*(?:,|;)\\s*|\\s+(?:${connectors.join('|')})\\s+`, 'iu')
    : /\s*(?:,|;)\s*/u;
  return String(sentence || '')
    .split(separator)
    .flatMap((clause) => clause.split(HE_VAV_ACTION_SPLIT))
    .map((clause) => stripLeadingConnector(clause, locale))
    .filter(Boolean);
}

function isActionClause(clause, locale) {
  const normalized = stripLeadingConnector(clause, locale);
  return ACTION_START_BY_LOCALE[locale].test(normalized);
}

function ensureTerminalPunctuation(text, fallbackPunctuation = '.') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}${fallbackPunctuation}`;
}

export function hasCurrentTurnExactlyOneActionConstraint(userContent) {
  const visible = typeof userContent === 'string' ? userContent : '';
  return EXACTLY_ONE_ACTION_PATTERNS.some((pattern) => pattern.test(visible));
}

export function evaluateAtomicActionOutput({
  userContent,
  assistantContent,
  locale = 'en',
} = {}) {
  const normalizedLocale = normalizeLocale(locale);
  const currentTurnConstraint = hasCurrentTurnExactlyOneActionConstraint(userContent);
  const safetyPrecedence = detectCrisisLanguage(userContent || '');

  if (!currentTurnConstraint || safetyPrecedence) {
    return {
      active: false,
      safetyPrecedence,
      actionClauseCount: 0,
      violation: false,
      sentences: splitSentences(assistantContent),
    };
  }

  const sentences = splitSentences(assistantContent);
  const sentenceRecords = sentences.map((sentence) => {
    const clauses = splitActionClauses(sentence, normalizedLocale);
    const actionClauses = clauses.filter((clause) => isActionClause(clause, normalizedLocale));
    return { sentence, clauses, actionClauses };
  });
  const actionClauseCount = sentenceRecords.reduce(
    (count, record) => count + record.actionClauses.length,
    0,
  );

  return {
    active: true,
    safetyPrecedence: false,
    actionClauseCount,
    violation: actionClauseCount > 1,
    sentences,
    sentenceRecords,
  };
}

export function enforceAtomicActionOutput({
  userContent,
  assistantContent,
  metadata,
  locale = 'en',
} = {}) {
  const canonicalContent = typeof assistantContent === 'string' ? assistantContent : '';
  const evaluation = evaluateAtomicActionOutput({ userContent, assistantContent: canonicalContent, locale });
  const nextMetadata = { ...(metadata || {}) };
  const diagnostics = {
    active: evaluation.active,
    safety_precedence: evaluation.safetyPrecedence,
    action_clause_count: evaluation.actionClauseCount,
    violation_detected: evaluation.violation,
    replacement_applied: false,
  };

  if (!evaluation.violation) {
    return { content: canonicalContent, metadata: nextMetadata, diagnostics };
  }

  const actionRecords = evaluation.sentenceRecords
    .map((record, index) => ({ ...record, index }))
    .filter((record) => record.actionClauses.length > 0);
  const firstActionSentenceIndex = actionRecords[0].index;
  const lastActionClause = actionRecords.at(-1).actionClauses.at(-1);
  const originalFirstActionSentence = evaluation.sentences[firstActionSentenceIndex] || '';
  const punctuation = originalFirstActionSentence.match(/[.!?]$/)?.[0] || '.';
  const normalizedAtomicClause = normalizeLocale(locale) === 'he'
    ? lastActionClause
    : `${lastActionClause.charAt(0).toLocaleUpperCase(normalizeLocale(locale))}${lastActionClause.slice(1)}`;
  const atomicSentence = ensureTerminalPunctuation(normalizedAtomicClause, punctuation);

  const content = evaluation.sentences
    .map((sentence, index) => {
      const record = evaluation.sentenceRecords[index];
      if (index === firstActionSentenceIndex) return atomicSentence;
      if (record.actionClauses.length > 0) return null;
      return sentence;
    })
    .filter(Boolean)
    .join(' ')
    .trim();

  diagnostics.replacement_applied = content.length > 0 && content !== canonicalContent;
  nextMetadata.explicit_output_shape_guard = diagnostics;

  return {
    content: content || canonicalContent,
    metadata: nextMetadata,
    diagnostics,
  };
}

export function applyAtomicActionGuardToConversationMessages(
  visibleUserMessages,
  finalMessages,
  options = {},
) {
  const visible = Array.isArray(visibleUserMessages) ? visibleUserMessages : [];
  const final = Array.isArray(finalMessages) ? finalMessages : [];
  const locale = options.locale || 'en';

  return final.map((message, finalIndex) => {
    if (!message || message.role !== 'assistant' || typeof message.content !== 'string') {
      return message;
    }

    const rawIndex = Number.isInteger(message.__rawIndex) ? message.__rawIndex : finalIndex;
    let precedingUser = null;
    for (let index = rawIndex - 1; index >= 0; index -= 1) {
      if (visible[index]?.role === 'user' && typeof visible[index]?.content === 'string') {
        precedingUser = visible[index];
        break;
      }
    }
    if (!precedingUser) return message;

    const enforced = enforceAtomicActionOutput({
      userContent: precedingUser.content,
      assistantContent: message.content,
      metadata: message.metadata,
      locale,
    });

    return {
      ...message,
      content: enforced.content,
      metadata: enforced.metadata,
    };
  });
}
