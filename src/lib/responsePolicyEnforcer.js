const RESPONSE_POLICY_HOLDING_RESPONSES = Object.freeze({
  en: "Let’s stay with understanding what is happening for you right now before we decide on any next step. What feels most important about this moment?",
  he: 'בואי נישאר רגע עם ההבנה של מה שקורה לך עכשיו לפני שנחליט על צעד כלשהו. מה הכי חשוב ברגע הזה?',
  es: 'Quedémonos por ahora con comprender lo que te está ocurriendo antes de decidir cualquier paso. ¿Qué se siente más importante en este momento?',
  fr: 'Restons pour l’instant avec la compréhension de ce qui vous arrive avant de décider de la prochaine étape. Qu’est-ce qui vous paraît le plus important en ce moment ?',
  de: 'Bleiben wir zunächst dabei zu verstehen, was gerade bei dir geschieht, bevor wir über einen nächsten Schritt entscheiden. Was fühlt sich in diesem Moment am wichtigsten an?',
  it: 'Restiamo per ora sulla comprensione di ciò che ti sta accadendo prima di decidere qualsiasi passo successivo. Che cosa ti sembra più importante in questo momento?',
  pt: 'Vamos permanecer por enquanto na compreensão do que está acontecendo com você antes de decidir qualquer próximo passo. O que parece mais importante neste momento?',
});

const IMPERATIVE_PATTERNS = Object.freeze([
  { code: 'direct_imperative_en', pattern: /\b(?:try|you should|please|start|write|practice|call|contact|schedule|send)\b/i },
  { code: 'direct_imperative_he', pattern: /(?:כדאי|נסה|נסי|עשה|עשי|שלח|שלחי|תקבע|תקבעי|כתוב|כתבי|תרגל|תרגלי)/ },
  { code: 'direct_imperative_es', pattern: /(?:^|[^\p{L}])(?:intenta|prueba|deberías|empieza|comienza|escribe|practica|llama|contacta|programa|envía)(?=$|[^\p{L}])/iu },
  { code: 'direct_imperative_fr', pattern: /(?:^|[^\p{L}])(?:essayez|essaie|vous devriez|tu devrais|commencez|commence|écrivez|écris|pratiquez|pratique|appelez|appelle|contactez|contacte|planifiez|planifie|envoyez|envoie)(?=$|[^\p{L}])/iu },
  { code: 'direct_imperative_de', pattern: /(?:^|[^\p{L}])(?:versuch|versuche|du solltest|sie sollten|beginne|beginnen sie|starte|starten sie|schreib|schreibe|schreiben sie|übe|üben sie|ruf|rufe|rufen sie|kontaktiere|kontaktieren sie|plane|planen sie|sende|senden sie)(?=$|[^\p{L}])/iu },
  { code: 'direct_imperative_it', pattern: /(?:^|[^\p{L}])(?:prova|dovresti|inizia|comincia|scrivi|pratica|chiama|contatta|programma|invia)(?=$|[^\p{L}])/iu },
  { code: 'direct_imperative_pt', pattern: /(?:^|[^\p{L}])(?:tente|você deveria|você deve|comece|inicie|escreva|pratique|ligue|contacte|contate|agende|envie)(?=$|[^\p{L}])/iu },
  { code: 'homework_marker', pattern: /(?:homework|assignment|for this week|between now and next time|tarea(?: para casa)?|para esta semana|de aquí a la próxima vez|devoirs?|pour cette semaine|d['’]ici la prochaine fois|hausaufgabe|aufgabe für diese woche|bis zum nächsten mal|compito|per questa settimana|da qui alla prossima volta|tarefa(?: de casa)?|até a próxima vez)/iu },
  { code: 'behavioral_experiment', pattern: /(?:behavioral experiment|experimento conductual|experimento comportamental|expérience comportementale|verhaltensexperiment|esperimento comportamentale)/iu },
  { code: 'exposure_instruction', pattern: /(?:\bexposure\b|ejercicio de exposición|exercice d['’]exposition|expositionsübung|esercizio di esposizione|exercício de exposição)/iu },
  { code: 'breathing_grounding', pattern: /(?:breathing exercise|grounding technique|take three breaths|ejercicio de respiración|técnica de anclaje|haz tres respiraciones|exercice de respiration|technique d['’]ancrage|prenez trois respirations|atemübung|erdungstechnik|atme dreimal|esercizio di respirazione|tecnica di radicamento|fai tre respiri|exercício de respiração|técnica de ancoragem|faça três respirações|5-4-3-2-1)/iu },
  { code: 'step_by_step_plan', pattern: /(?:step 1|first[, ]+then|follow these steps|paso 1|primero[, ]+luego|sigue estos pasos|étape 1|d['’]abord[, ]+puis|suivez ces étapes|schritt 1|zuerst[, ]+dann|folge diesen schritten|passo 1|prima[, ]+poi|segui questi passaggi|primeiro[, ]+depois|siga estes passos)/iu },
  { code: 'form_marker', pattern: /\[FORM:[^\]]+\]/i },
]);

const ALLOWLIST_PATTERNS = Object.freeze([
  /\?\s*$/,
  /\b(?:it sounds|I hear|maybe|perhaps|could it be|might be|we can explore)\b/i,
  /(?:נשמע|אולי|יכול להיות|אפשר לבדוק|מה את חושבת|מה אתה חושב)/,
  /(?:parece que|te escucho|quizá|tal vez|podría ser|podemos explorar)/iu,
  /(?:il semble|je vous entends|peut-être|pourrait-il|nous pouvons explorer)/iu,
  /(?:es klingt|ich höre|vielleicht|könnte es sein|wir können erkunden)/iu,
  /(?:sembra che|ti ascolto|forse|potrebbe essere|possiamo esplorare)/iu,
  /(?:parece que|estou ouvindo|talvez|poderia ser|podemos explorar)/iu,
  /\b(?:if you are in immediate danger|call emergency services|reach out to a crisis line)\b/i,
  /(?:אם את בסכנה מיידית|אם אתה בסכנה מיידית|פנה מיד לעזרה דחופה|התקשר לשירותי החירום)/,
  /(?:si estás en peligro inmediato|llama a los servicios de emergencia|contacta con una línea de crisis)/iu,
  /(?:si vous êtes en danger immédiat|appelez les services d['’]urgence|contactez une ligne de crise)/iu,
  /(?:wenn sie in unmittelbarer gefahr sind|rufen sie den notdienst|wenden sie sich an eine krisenhilfe)/iu,
  /(?:se sei in pericolo immediato|chiama i servizi di emergenza|contatta una linea di crisi)/iu,
  /(?:se você estiver em perigo imediato|ligue para os serviços de emergência|contate uma linha de crise)/iu,
]);

function normalizeLocale(locale) {
  const language = typeof locale === 'string'
    ? locale.trim().toLowerCase().split(/[-_]/)[0]
    : 'en';
  return Object.prototype.hasOwnProperty.call(RESPONSE_POLICY_HOLDING_RESPONSES, language)
    ? language
    : 'en';
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?\n])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function isAllowedSentence(sentence) {
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(sentence));
}

function detectViolation(content) {
  const sentences = splitSentences(content);
  const reasonCodes = [];
  for (const sentence of sentences) {
    if (isAllowedSentence(sentence)) continue;
    for (const rule of IMPERATIVE_PATTERNS) {
      if (rule.pattern.test(sentence)) {
        reasonCodes.push(rule.code);
      }
    }
  }
  return Array.from(new Set(reasonCodes)).slice(0, 8);
}

export function enforceResponsePolicy({ content, metadata, policy, locale = 'en' } = {}) {
  const normalizedLocale = normalizeLocale(locale);
  const canonicalContent = typeof content === 'string' ? content : '';
  const nextMetadata = { ...(metadata || {}) };
  const diagnostics = {
    response_policy_version: typeof policy?.policy_version === 'string' ? policy.policy_version : 'response_policy_v1',
    policy_available: policy?.policy_available === true,
    action_permitted: policy?.action_permitted === true,
    safety_override_required: policy?.safety_override_required === true,
    policy_scope_match: policy?.scope_match !== false,
    policy_enforced: false,
    violation_detected: false,
    violation_reason_codes: [],
    replacement_applied: false,
    duplicate_enforcement_blocked: policy?.status === 'completed',
  };

  if (!policy || policy.policy_available === false) {
    return { content: canonicalContent, metadata: nextMetadata, diagnostics, enforced: false, replaced: false };
  }

  if (policy.scope_match === false || policy.status === 'completed' || policy.status === 'abandoned') {
    return { content: canonicalContent, metadata: nextMetadata, diagnostics, enforced: false, replaced: false };
  }

  if (policy.action_permitted === true || policy.safety_override_required === true) {
    diagnostics.policy_enforced = true;
    return { content: canonicalContent, metadata: nextMetadata, diagnostics, enforced: true, replaced: false };
  }

  const reasonCodes = detectViolation(canonicalContent);
  diagnostics.policy_enforced = true;
  diagnostics.violation_detected = reasonCodes.length > 0;
  diagnostics.violation_reason_codes = reasonCodes;

  if (reasonCodes.length === 0) {
    return { content: canonicalContent, metadata: nextMetadata, diagnostics, enforced: true, replaced: false };
  }

  delete nextMetadata.generated_file;
  delete nextMetadata.generated_files;
  if (nextMetadata.structured_data && typeof nextMetadata.structured_data === 'object') {
    nextMetadata.structured_data = {
      ...nextMetadata.structured_data,
      homework: [],
      assistant_message: RESPONSE_POLICY_HOLDING_RESPONSES[normalizedLocale],
    };
  }

  diagnostics.replacement_applied = true;
  return {
    content: RESPONSE_POLICY_HOLDING_RESPONSES[normalizedLocale],
    metadata: nextMetadata,
    diagnostics,
    enforced: true,
    replaced: true,
  };
}
