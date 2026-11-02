/**
 * @file src/components/utils/formulationContractGuard.js
 *
 * Deterministic Formulation-Led Response Contract Guard
 * Phase 2–8 implementation.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * • Identifies "guarded turns": assistant responses where the immediately
 *   preceding persisted role=user message contains a complete
 *   === FORMULATION DEEPENING — THIS TURN ONLY === block or a complete
 *   === FORMULATION CONTRACT CORRECTION — NEXT TURN ONLY === block.
 * • Evaluates guarded assistant responses against a bounded clinical contract.
 * • Replaces violating responses with a deterministic safe fallback before the
 *   message reaches UI state.
 * • Builds a next-turn correction block that neutralizes the violating response
 *   from subsequent agent context.
 * • Safety Mode always supersedes formulation guarding.
 *
 * WHAT THIS MODULE MUST NEVER DO
 * --------------------------------
 * • Call Base44 or any external service.
 * • Mutate its inputs.
 * • Log raw user or assistant text.
 * • Write memory, entities, or analytics.
 * • Use an LLM, fuzzy matching, sentiment analysis, or translation services.
 * • Return raw matched text in reason codes.
 *
 * REASON CODES
 * ------------
 * prohibited_certainty_phrase
 * unsupported_deeper_claim_without_tentative_marker
 * missing_verification_question
 * multiple_questions
 * exercise_proposed_when_blocked
 * internal_instruction_leak
 * conclusion_drawn_when_explicitly_blocked
 * unsupported_current_turn_grounding_claim
 * clinical_overreach_certainty
 * diagnostic_uncertainty_escalation
 *
 * LOCALE SUPPORT
 * --------------
 * Hebrew, English, Spanish, French, German, Italian, and Portuguese.
 */

// ─── Internal marker bounds ────────────────────────────────────────────────────

/** Start marker for the FORMULATION DEEPENING agent-only block. */
const FD_START = '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===';
/** End marker for the FORMULATION DEEPENING agent-only block. */
const FD_END = '=== END FORMULATION DEEPENING ===';

/** Start marker for the SAFETY MODE agent-only block. */
const SM_START = '=== SAFETY MODE \u2014 STAGE 2 PHASE 7 ===';
/** End marker for the SAFETY MODE agent-only block. */
const SM_END = '=== END SAFETY MODE CONSTRAINTS ===';

/** Start marker for the FORMULATION CONTRACT CORRECTION block. */
export const FORMULATION_CORRECTION_START =
  '=== FORMULATION CONTRACT CORRECTION \u2014 NEXT TURN ONLY ===';
/** End marker for the FORMULATION CONTRACT CORRECTION block. */
export const FORMULATION_CORRECTION_END =
  '=== END FORMULATION CONTRACT CORRECTION ===';

/** Start marker for the CURRENT-TURN GROUNDING CORRECTION block. */
export const CURRENT_TURN_GROUNDING_CORRECTION_START =
  '=== CURRENT-TURN GROUNDING CORRECTION — NEXT TURN ONLY ===';
/** End marker for the CURRENT-TURN GROUNDING CORRECTION block. */
export const CURRENT_TURN_GROUNDING_CORRECTION_END =
  '=== END CURRENT-TURN GROUNDING CORRECTION ===';

const INITIAL_FORMULATION_GUARD_MODE = 'initial_formulation';
const CORRECTION_FOLLOWUP_GUARD_MODE = 'correction_followup';

// ─── Exact fallback texts (immutable) ─────────────────────────────────────────

/**
 * Hebrew fallback — exact production text, contains exactly one question mark.
 */
const HEBREW_FALLBACK =
  '\u05E9\u05D5\u05DE\u05E2 \u05D0\u05D5\u05EA\u05DA. \u05DE\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D1\u05E8\u05D5\u05E8 \u05D4\u05D5\u05D0 \u05E9\u05D4\u05DE\u05E6\u05D1 \u05E0\u05D7\u05D5\u05D5\u05D4 \u05DB\u05DE\u05D0\u05D9\u05D9\u05DD; \u05DE\u05D4 \u05E9\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0\n\u05D9\u05D3\u05D5\u05E2 \u05D4\u05D5\u05D0 \u05D0\u05D9\u05D6\u05D5 \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D0\u05D9\u05E9\u05D9\u05EA \u05D0\u05EA\u05D4 \u05DE\u05D9\u05D9\u05D7\u05E1 \u05DC\u05D0\u05E4\u05E9\u05E8\u05D5\u05EA \u05E9\u05D4\u05EA\u05D5\u05E6\u05D0\u05D4 \u05DC\u05D0 \u05EA\u05D4\u05D9\u05D4\n\u05DE\u05E1\u05E4\u05D9\u05E7 \u05D8\u05D5\u05D1\u05D4. \u05D0\u05E0\u05D9 \u05DC\u05D0 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05D4\u05DE\u05E6\u05D9\u05D0 \u05D0\u05EA \u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05D6\u05D0\u05EA \u05D1\u05DE\u05E7\u05D5\u05DE\u05DA. \u05DB\u05E9\u05D0\u05EA\u05D4\n\u05DE\u05D3\u05DE\u05D9\u05D9\u05DF \u05EA\u05D5\u05E6\u05D0\u05D4 \u05E9\u05D0\u05D9\u05E0\u05D4 \u05DE\u05E1\u05E4\u05D9\u05E7\u05EA \u05D8\u05D5\u05D1\u05D4, \u05DE\u05D4 \u05D4\u05D3\u05D1\u05E8 \u05D4\u05E7\u05E9\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05E9\u05D6\u05D4 \u05D4\u05D9\u05D4 \u05D0\u05D5\u05DE\u05E8\n\u05E2\u05DC\u05D9\u05DA?';

/**
 * English fallback — exact production text, contains exactly one question mark.
 */
const ENGLISH_FALLBACK =
  'I hear that something important is still missing from our understanding.\nWhat remains unknown is the personal meaning you attach to the possibility\nthat the result may not be good enough. I do not want to invent that meaning\nfor you. When you imagine that outcome, what would be the hardest thing it\nmight say about you?';

const HEBREW_CONTINUATION_FALLBACK =
  'אני שומע שהחלק הקשה ביותר הוא המחשבה "אני לא מספיק טוב".\nמה שכבר ברור הוא שהמחשבה הזאת מכאיבה; מה שעדיין לא ברור הוא אם\nהיא מופיעה בעיקר סביב ביצועים ומשימות או משקפת משהו רחב יותר,\nואני לא רוצה לקבוע זאת בלי לבדוק איתך. האם המחשבה הזאת עולה\nבעיקר כשאתה נדרש להוכיח יכולת, או גם במצבים אחרים?';

const ENGLISH_CONTINUATION_FALLBACK =
  'I hear that the hardest part is the thought, "I am not good enough." What is\nalready clear is that this thought is painful; what remains unclear is whether\nit appears mainly around performance and tasks or reflects something broader,\nand I do not want to decide that without checking with you. Does this thought\ncome up mainly when you have to prove your ability, or in other situations\ntoo?';

const HEBREW_CURRENT_TURN_GROUNDING_FALLBACK =
  'אין עדיין מספיק מידע כדי לקבוע מה גורם למתח הזה. מה הדבר הראשון שעובר לך בראש או בגוף ברגע שבו המתח מתחיל?';

const ENGLISH_CURRENT_TURN_GROUNDING_FALLBACK =
  'There is not yet enough information to determine what is causing this tension. What is the first thing that goes through your mind or body at the moment the tension starts?';

const HEBREW_CLINICAL_OVERREACH_FALLBACK =
  'ייתכן שהימנעות והקלה מיידית ממלאות כאן תפקיד, אבל עדיין אין מספיק מידע לקבוע שזה כל המנגנון או שמדובר בבחירה מודעת בלבד. לפני שמסיקים מסקנה, כדאי לבדוק אירוע אחד ממשי ולשקול גם הסברים נוספים. תרצה לבחור דוגמה אחת מהשבוע?';

const ENGLISH_CLINICAL_OVERREACH_FALLBACK =
  'Avoidance and immediate relief may be part of the pattern, but there is not enough information to conclude that this is the whole mechanism or simply a conscious choice. Before drawing a conclusion, it would help to examine one concrete event and consider other explanations too. Would you like to choose one example from this week?';

const FORMULATION_FALLBACKS = Object.freeze({
  he: HEBREW_FALLBACK,
  en: ENGLISH_FALLBACK,
  es: 'Escucho que todavía falta algo importante en nuestra comprensión. Lo que sigue sin saberse es el significado personal que atribuyes a la posibilidad de que el resultado no sea lo bastante bueno. No quiero inventar ese significado por ti. Cuando imaginas ese resultado, ¿qué sería lo más difícil que podría decir sobre ti?',
  fr: 'J’entends qu’il manque encore quelque chose d’important à notre compréhension. Ce qui reste inconnu, c’est le sens personnel que vous attribuez à la possibilité que le résultat ne soit pas assez bon. Je ne veux pas inventer ce sens à votre place. Lorsque vous imaginez ce résultat, quelle serait la chose la plus difficile qu’il pourrait dire de vous ?',
  de: 'Ich höre, dass in unserem Verständnis noch etwas Wichtiges fehlt. Noch unbekannt ist, welche persönliche Bedeutung du der Möglichkeit beimisst, dass das Ergebnis nicht gut genug sein könnte. Ich möchte diese Bedeutung nicht an deiner Stelle erfinden. Wenn du dir dieses Ergebnis vorstellst, was wäre das Schwierigste, das es über dich aussagen könnte?',
  it: 'Sento che manca ancora qualcosa di importante nella nostra comprensione. Ciò che resta sconosciuto è il significato personale che attribuisci alla possibilità che il risultato non sia abbastanza buono. Non voglio inventare quel significato al posto tuo. Quando immagini quel risultato, quale sarebbe la cosa più difficile che potrebbe dire di te?',
  pt: 'Percebo que ainda falta algo importante em nossa compreensão. O que permanece desconhecido é o significado pessoal que você atribui à possibilidade de o resultado não ser bom o suficiente. Não quero inventar esse significado por você. Quando imagina esse resultado, qual seria a coisa mais difícil que ele poderia dizer sobre você?',
});

const FORMULATION_CONTINUATION_FALLBACKS = Object.freeze({
  he: HEBREW_CONTINUATION_FALLBACK,
  en: ENGLISH_CONTINUATION_FALLBACK,
  es: 'Escucho que la parte más difícil es el pensamiento «no soy lo bastante bueno». Ya está claro que este pensamiento duele; lo que aún no está claro es si aparece principalmente en torno al rendimiento y las tareas o si refleja algo más amplio, y no quiero decidirlo sin comprobarlo contigo. ¿Este pensamiento aparece principalmente cuando tienes que demostrar tu capacidad o también en otras situaciones?',
  fr: 'J’entends que la partie la plus difficile est la pensée « je ne suis pas assez bon ». Il est déjà clair que cette pensée est douloureuse ; ce qui reste incertain, c’est si elle apparaît surtout autour des performances et des tâches ou si elle reflète quelque chose de plus large, et je ne veux pas en décider sans le vérifier avec vous. Cette pensée apparaît-elle surtout lorsque vous devez prouver vos capacités, ou également dans d’autres situations ?',
  de: 'Ich höre, dass der schwierigste Teil der Gedanke „Ich bin nicht gut genug“ ist. Klar ist bereits, dass dieser Gedanke schmerzhaft ist; noch unklar ist, ob er vor allem bei Leistung und Aufgaben auftritt oder etwas Umfassenderes widerspiegelt, und ich möchte das nicht entscheiden, ohne es mit dir zu prüfen. Taucht dieser Gedanke hauptsächlich auf, wenn du deine Fähigkeiten beweisen musst, oder auch in anderen Situationen?',
  it: 'Sento che la parte più difficile è il pensiero «non sono abbastanza bravo». È già chiaro che questo pensiero fa male; ciò che non è ancora chiaro è se compaia soprattutto in relazione alle prestazioni e ai compiti o se rifletta qualcosa di più ampio, e non voglio deciderlo senza verificarlo con te. Questo pensiero emerge soprattutto quando devi dimostrare le tue capacità, oppure anche in altre situazioni?',
  pt: 'Percebo que a parte mais difícil é o pensamento “não sou bom o suficiente”. Já está claro que esse pensamento é doloroso; o que ainda não está claro é se ele aparece principalmente em situações de desempenho e tarefas ou se reflete algo mais amplo, e não quero decidir isso sem verificar com você. Esse pensamento surge principalmente quando você precisa provar sua capacidade ou também em outras situações?',
});

const CURRENT_TURN_GROUNDING_FALLBACKS = Object.freeze({
  he: HEBREW_CURRENT_TURN_GROUNDING_FALLBACK,
  en: ENGLISH_CURRENT_TURN_GROUNDING_FALLBACK,
  es: 'Todavía no hay suficiente información para determinar qué está causando esta tensión. ¿Qué es lo primero que pasa por tu mente o por tu cuerpo cuando empieza la tensión?',
  fr: 'Il n’y a pas encore assez d’informations pour déterminer ce qui provoque cette tension. Quelle est la première chose qui vous traverse l’esprit ou le corps au moment où la tension commence ?',
  de: 'Es gibt noch nicht genügend Informationen, um festzustellen, was diese Anspannung verursacht. Was geht dir als Erstes durch den Kopf oder den Körper, wenn die Anspannung beginnt?',
  it: 'Non ci sono ancora informazioni sufficienti per determinare che cosa provochi questa tensione. Qual è la prima cosa che ti passa per la mente o nel corpo quando la tensione inizia?',
  pt: 'Ainda não há informações suficientes para determinar o que está causando essa tensão. Qual é a primeira coisa que passa pela sua mente ou pelo seu corpo quando a tensão começa?',
});

const CLINICAL_OVERREACH_FALLBACKS = Object.freeze({
  he: HEBREW_CLINICAL_OVERREACH_FALLBACK,
  en: ENGLISH_CLINICAL_OVERREACH_FALLBACK,
  es: 'La evitación y el alivio inmediato pueden formar parte del patrón, pero aún no hay información suficiente para concluir que sean todo el mecanismo o una elección plenamente consciente. Antes de concluir, conviene examinar un episodio concreto y considerar otras explicaciones. ¿Quieres elegir un ejemplo de esta semana?',
  fr: 'L’évitement et le soulagement immédiat peuvent faire partie du schéma, mais les informations ne suffisent pas pour conclure qu’ils constituent tout le mécanisme ou un choix pleinement conscient. Avant de conclure, examinons une situation concrète et d’autres explications possibles. Souhaitez-vous choisir un exemple de cette semaine ?',
  de: 'Vermeidung und unmittelbare Erleichterung können Teil des Musters sein, aber es gibt nicht genug Informationen, um daraus den gesamten Mechanismus oder eine rein bewusste Entscheidung abzuleiten. Vor einer Schlussfolgerung sollten wir eine konkrete Situation und weitere Erklärungen prüfen. Möchtest du ein Beispiel aus dieser Woche auswählen?',
  it: 'L’evitamento e il sollievo immediato possono far parte dello schema, ma non ci sono informazioni sufficienti per concludere che siano l’intero meccanismo o una scelta pienamente consapevole. Prima di concludere, esaminiamo un episodio concreto e altre possibili spiegazioni. Vuoi scegliere un esempio di questa settimana?',
  pt: 'A evitação e o alívio imediato podem fazer parte do padrão, mas ainda não há informação suficiente para concluir que sejam todo o mecanismo ou uma escolha plenamente consciente. Antes de concluir, vale examinar uma situação concreta e outras explicações possíveis. Quer escolher um exemplo desta semana?',
});

function _normalizeSupportedLocale(locale) {
  const language = typeof locale === 'string'
    ? locale.trim().toLowerCase().split(/[-_]/)[0]
    : 'en';
  return Object.prototype.hasOwnProperty.call(FORMULATION_FALLBACKS, language)
    ? language
    : 'en';
}

// ─── Phase A: Prohibited certainty phrases ────────────────────────────────────

/**
 * Hebrew certainty/dramatic phrases prohibited unconditionally — even when
 * preceded by ייתכן / אולי / יכול להיות.
 */
const PROHIBITED_PHRASES_HE = [
  '\u05D4\u05D0\u05D9\u05D5\u05DD \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9', // האיום האמיתי
  '\u05D4\u05E1\u05D9\u05D1\u05D4 \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9\u05EA', // הסיבה האמיתית
  '\u05D1\u05D3\u05D9\u05D5\u05E7 \u05D6\u05D4', // בדיוק זה
  '\u05D4\u05D3\u05E4\u05D5\u05E1 \u05E2\u05D5\u05D1\u05D3 \u05DB\u05DA', // הדפוס עובד כך
  '\u05D6\u05D4 \u05DE\u05E1\u05D1\u05D9\u05E8 \u05DC\u05DE\u05D4', // זה מסביר למה
  '\u05D0\u05D2\u05DC\u05D4 \u05DE\u05E9\u05D4\u05D5 \u05E2\u05DC \u05E2\u05E6\u05DE\u05D9 \u05E9\u05DC\u05D0 \u05D0\u05D5\u05DB\u05DC \u05DC\u05E9\u05D0\u05EA', // אגלה משהו על עצמי שלא אוכל לשאת
  '\u05DE\u05E9\u05D4\u05D5 \u05E9\u05DC\u05D0 \u05EA\u05D5\u05DB\u05DC \u05DC\u05E9\u05D0\u05EA', // משהו שלא תוכל לשאת
  '\u05D4\u05E9\u05D0\u05DC\u05D4 \u05DE\u05D9 \u05D0\u05EA\u05D4', // השאלה מי אתה
  '\u05E0\u05D5\u05D2\u05E2 \u05DC\u05E9\u05D0\u05DC\u05D4 \u05DE\u05D9 \u05D0\u05EA\u05D4', // נוגע לשאלה מי אתה
  '\u05DE\u05D4 \u05E9\u05D7\u05E1\u05E8 \u05D1\u05E4\u05D5\u05E8\u05DE\u05D5\u05DC\u05E6\u05D9\u05D4 \u05D4\u05D5\u05D0 \u05D1\u05D3\u05D9\u05D5\u05E7', // מה שחסר בפורמולציה הוא בדיוק
];

/**
 * English certainty/dramatic phrases prohibited unconditionally.
 */
const PROHIBITED_PHRASES_EN = [
  'the real threat',
  'the true reason',
  'this is exactly what is missing',
  'the pattern works like this',
  'this explains why',
  'discover something about yourself you cannot bear',
  'the question of who you are',
];

const PROHIBITED_PHRASES_OTHER = [
  // Spanish
  'la verdadera amenaza', 'la verdadera razón', 'esto es exactamente lo que falta',
  'el patrón funciona así', 'esto explica por qué',
  'descubrir algo sobre ti que no puedes soportar', 'la cuestión de quién eres',
  // French
  'la véritable menace', 'la vraie raison', 'c’est exactement ce qui manque',
  "c'est exactement ce qui manque", 'le schéma fonctionne ainsi',
  'cela explique pourquoi', 'découvrir quelque chose sur vous que vous ne pouvez pas supporter',
  'la question de qui vous êtes',
  // German
  'die wahre bedrohung', 'der wahre grund', 'genau das fehlt',
  'das muster funktioniert so', 'das erklärt, warum',
  'etwas über dich entdecken, das du nicht ertragen kannst', 'die frage, wer du bist',
  // Italian
  'la vera minaccia', 'la vera ragione', 'questo è esattamente ciò che manca',
  'lo schema funziona così', 'questo spiega perché',
  'scoprire qualcosa su di te che non puoi sopportare', 'la questione di chi sei',
  // Portuguese
  'a verdadeira ameaça', 'a verdadeira razão', 'é exatamente isso que falta',
  'o padrão funciona assim', 'isso explica por que',
  'descobrir algo sobre você que não consegue suportar', 'a questão de quem você é',
];

const CLINICAL_OVERREACH_PHRASES_HE = [
  'התמונה מסתדרת לה מלאה',
  'התמונה עכשיו מלאה',
  'זה המנגנון עצמו',
  'הוא נשמר כי אתה מחליט',
  'אתה מחליט — במודע',
  'אתה מחליט במודע',
  'הרף הנמוך למה שנחשב',
  'מעולם לא נתת לעצמך הזדמנות',
  'הטיפול עבד על הסימפטומים',
  'אבל לא על המנגנון שמתחת',
  'הדפוס לא נעלם אלא החליף צורה',
];

const CLINICAL_OVERREACH_PHRASES_EN = [
  'the picture is now complete',
  'this is the mechanism itself',
  'it persists because you choose',
  'you consciously choose',
  'your low threshold for difficulty',
  'you have never given yourself a chance',
  'the treatment worked on the symptoms',
  'but not on the underlying mechanism',
  'the pattern did not disappear; it changed form',
];

const CLINICAL_OVERREACH_PHRASES_OTHER = [
  'la imagen está completa', 'este es el mecanismo en sí',
  'le tableau est complet', 'c’est le mécanisme lui-même', "c'est le mécanisme lui-même",
  'das bild ist vollständig', 'das ist der mechanismus selbst',
  'il quadro è completo', 'questo è il meccanismo stesso',
  'o quadro está completo', 'este é o próprio mecanismo',
];

// Semantic families cover paraphrases of the same unsafe clinical move rather
// than relying only on a fixed sentence. Each supported locale has parity for:
// premature closure, totalizing mechanism claims, blame/choice language,
// unsupported exclusion of alternatives, and false job-fit/avoidance binaries.
const CLINICAL_OVERREACH_PATTERNS = [
  // Hebrew
  /(?:זה|זו)\s+בדיוק\s+(?:ה)?מנגנון/u,
  /(?:המעגל|הדפוס|המנגנון)\s+(?:כבר\s+)?(?:ברור|מאושר)/u,
  /זה\s+משנה\s+(?:את\s+)?הכל/u,
  /(?:הנוחות|ההקלה)(?:\s+המיידית)?\s+מנצחת/u,
  /ההימנעות.{0,45}לא\s+נובעת\s+מפחד\s+ספציפי/u,
  /(?:הדחייה|הסיבה).{0,65}(?:לא|אינה)\s+מקצועית\s+אלא\s+הימנעות/u,

  // English
  /this\s+is\s+(?:exactly\s+)?the\s+(?:whole\s+)?mechanism/i,
  /(?:the\s+)?(?:cycle|pattern|mechanism)\s+is\s+(?:now\s+)?(?:clear|confirmed)/i,
  /this\s+changes\s+everything/i,
  /(?:comfort|immediate\s+relief)\s+wins/i,
  /avoidance.{0,55}does\s+not\s+(?:come|stem)\s+from\s+(?:one|a)\s+specific\s+fear/i,
  /(?:rejection|reason).{0,70}not\s+professional.{0,25}(?:but|rather)\s+avoidance/i,

  // Spanish
  /este\s+es\s+exactamente\s+el\s+mecanismo/iu,
  /(?:el\s+)?(?:ciclo|patrón|mecanismo)\s+(?:ya\s+)?está\s+(?:claro|confirmado)/iu,
  /esto\s+lo\s+cambia\s+todo/iu,
  /(?:la\s+comodidad|el\s+alivio\s+inmediato)\s+gana/iu,
  /la\s+evitación.{0,55}no\s+proviene\s+de\s+un\s+miedo\s+específico/iu,
  /(?:rechazo|razón).{0,70}no\s+es\s+profesional.{0,25}sino\s+evitación/iu,

  // French
  /c['’]est\s+exactement\s+le\s+mécanisme/iu,
  /(?:le\s+)?(?:cycle|schéma|mécanisme)\s+est\s+(?:maintenant\s+)?(?:clair|confirmé)/iu,
  /cela\s+change\s+tout/iu,
  /(?:le\s+confort|le\s+soulagement\s+immédiat)\s+l['’]emporte/iu,
  /l['’]évitement.{0,55}ne\s+vient\s+pas\s+d['’]une\s+peur\s+précise/iu,
  /(?:rejet|raison).{0,70}n['’]est\s+pas\s+professionnel.{0,25}mais\s+de\s+l['’]évitement/iu,

  // German
  /das\s+ist\s+genau\s+der\s+mechanismus/iu,
  /(?:der\s+)?(?:kreislauf|muster|mechanismus)\s+ist\s+(?:jetzt\s+)?(?:klar|bestätigt)/iu,
  /das\s+ändert\s+alles/iu,
  /(?:komfort|sofortige\s+erleichterung)\s+gewinnt/iu,
  /vermeidung.{0,55}stammt\s+nicht\s+aus\s+einer\s+bestimmten\s+angst/iu,
  /(?:ablehnung|grund).{0,70}nicht\s+beruflich.{0,25}sondern\s+vermeidung/iu,

  // Italian
  /questo\s+è\s+esattamente\s+il\s+meccanismo/iu,
  /(?:il\s+)?(?:ciclo|schema|meccanismo)\s+è\s+(?:ora\s+)?(?:chiaro|confermato)/iu,
  /questo\s+cambia\s+tutto/iu,
  /(?:il\s+comfort|il\s+sollievo\s+immediato)\s+vince/iu,
  /l['’]evitamento.{0,55}non\s+deriva\s+da\s+una\s+paura\s+specifica/iu,
  /(?:rifiuto|motivo).{0,70}non\s+è\s+professionale.{0,25}ma\s+evitamento/iu,

  // Portuguese
  /este\s+é\s+exatamente\s+o\s+mecanismo/iu,
  /(?:o\s+)?(?:ciclo|padrão|mecanismo)\s+está\s+(?:agora\s+)?(?:claro|confirmado)/iu,
  /isso\s+muda\s+tudo/iu,
  /(?:o\s+conforto|o\s+alívio\s+imediato)\s+vence/iu,
  /a\s+evitação.{0,55}não\s+vem\s+de\s+um\s+medo\s+específico/iu,
  /(?:rejeição|motivo).{0,70}não\s+é\s+profissional.{0,25}mas\s+evitação/iu,
];

function _findClinicalOverreachPhrase(content) {
  if (typeof content !== 'string' || !content.trim()) return null;
  for (const phrase of CLINICAL_OVERREACH_PHRASES_HE) {
    if (content.includes(phrase)) return phrase;
  }
  const lower = content.toLowerCase();
  for (const phrase of [...CLINICAL_OVERREACH_PHRASES_EN, ...CLINICAL_OVERREACH_PHRASES_OTHER]) {
    if (lower.includes(phrase)) return phrase;
  }
  return CLINICAL_OVERREACH_PATTERNS.some((pattern) => pattern.test(content))
    ? 'semantic_overreach_pattern'
    : null;
}

const DIAGNOSTIC_UNCERTAINTY_RULES = Object.freeze([
  Object.freeze({
    diagnosis: /חרדה\s+מוכללת/u,
    uncertainty: /(?:יש\s+סיכוי|אולי|ייתכן|יתכן|כנראה|אפשרות|חשד|משוער|סביר)/u,
  }),
  Object.freeze({
    diagnosis: /generalized\s+anxiety(?:\s+disorder)?/iu,
    uncertainty: /(?:possible|possibly|might|may|suspected|probable|likely|chance)/iu,
  }),
  Object.freeze({
    diagnosis: /ansiedad\s+generalizada/iu,
    uncertainty: /(?:posible|posiblemente|podría|sospecha|sospechado|probable|quizá|tal\s+vez)/iu,
  }),
  Object.freeze({
    diagnosis: /anxiété\s+généralisée/iu,
    uncertainty: /(?:possible|peut-être|pourrait|suspectée?|probable|éventuelle?)/iu,
  }),
  Object.freeze({
    diagnosis: /generalisierte[nr]?\s+angst(?:störung)?/iu,
    uncertainty: /(?:möglich|möglicherweise|könnte|vermutet|wahrscheinlich|verdacht)/iu,
  }),
  Object.freeze({
    diagnosis: /ansia\s+generalizzata/iu,
    uncertainty: /(?:possibile|forse|potrebbe|sospetta|probabile|ipotesi)/iu,
  }),
  Object.freeze({
    diagnosis: /ansiedade\s+generalizada/iu,
    uncertainty: /(?:possível|talvez|poderia|suspeita|provável|hipótese)/iu,
  }),
]);

function _hasDiagnosticUncertaintyEscalation(assistantContent, visibleUserContent) {
  if (typeof assistantContent !== 'string' || typeof visibleUserContent !== 'string') return false;
  return DIAGNOSTIC_UNCERTAINTY_RULES.some(({ diagnosis, uncertainty }) => {
    if (!diagnosis.test(visibleUserContent) || !uncertainty.test(visibleUserContent)) return false;
    if (!diagnosis.test(assistantContent)) return false;
    return !uncertainty.test(assistantContent);
  });
}

const EXPLICIT_CONCLUSION_BLOCKERS_HE = [
  'אל תקבע עדיין מסקנה',
  'בלי לקבוע מסקנה',
  'אל תסיק עדיין מסקנה',
];

const EXPLICIT_CONCLUSION_BLOCKERS_EN = [
  'do not draw a conclusion yet',
  "don't draw a conclusion yet",
  'do not reach a conclusion yet',
  'without drawing a conclusion',
];

const EXPLICIT_CONCLUSION_BLOCKERS_OTHER = [
  'no saques una conclusión todavía', 'sin sacar una conclusión',
  'ne tirez pas encore de conclusion', 'sans tirer de conclusion',
  'ziehe noch keine schlussfolgerung', 'ohne eine schlussfolgerung zu ziehen',
  'non trarre ancora una conclusione', 'senza trarre una conclusione',
  'não tire uma conclusão ainda', 'sem tirar uma conclusão',
];

const BLOCKED_CONCLUSION_PHRASES_HE = [
  'זה המקום שבו כל הדפוס נמצא',
  'זה המקום שבו הדפוס כולו נמצא',
  'זה לא פרפקציוניזם',
  'זה משהו הרבה יותר אישי',
  'זה הפך למקום שבו משהו עליך יכול להיות מוכח',
];

const BLOCKED_CONCLUSION_PHRASES_EN = [
  'this is where the whole pattern lives',
  'this is where this whole pattern lives',
  "that's not perfectionism",
  'that is not perfectionism',
  'this is something much more personal',
  'became a place where something about you could be confirmed',
];

const BLOCKED_CONCLUSION_PHRASES_OTHER = [
  'aquí es donde vive todo el patrón', 'esto no es perfeccionismo',
  'esto es algo mucho más personal', 'se convirtió en un lugar donde algo sobre ti podía confirmarse',
  'c’est là que vit tout le schéma', "c'est là que vit tout le schéma",
  'ce n’est pas du perfectionnisme', "ce n'est pas du perfectionnisme",
  'c’est quelque chose de beaucoup plus personnel', "c'est quelque chose de beaucoup plus personnel",
  'est devenu un endroit où quelque chose sur vous pouvait être confirmé',
  'hier liegt das ganze muster', 'das ist kein perfektionismus',
  'das ist etwas viel persönlicheres', 'wurde zu einem ort, an dem etwas über dich bestätigt werden konnte',
  'è qui che vive l’intero schema', "è qui che vive l'intero schema",
  'questo non è perfezionismo', 'questo è qualcosa di molto più personale',
  'è diventato un luogo in cui qualcosa su di te poteva essere confermato',
  'é aqui que vive todo o padrão', 'isso não é perfeccionismo',
  'isso é algo muito mais pessoal', 'tornou-se um lugar onde algo sobre você poderia ser confirmado',
];

const EXPLICIT_NO_EXERCISE_REQUESTS_HE = [
  'אל תציע לי תרגיל',
  'בלי תרגיל',
  'ללא תרגיל',
  'אל תיתן לי תרגיל',
];

const EXPLICIT_NO_EXERCISE_REQUESTS_EN = [
  'do not give me an exercise',
  "don't give me an exercise",
  'do not suggest an exercise',
  "don't suggest an exercise",
  'no exercise yet',
  'without an exercise',
];

const EXPLICIT_NO_EXERCISE_REQUESTS_OTHER = [
  'no me des un ejercicio', 'no sugieras un ejercicio', 'sin ejercicio todavía', 'sin un ejercicio',
  'ne me donnez pas d’exercice', "ne me donnez pas d'exercice",
  'ne proposez pas d’exercice', "ne proposez pas d'exercice", 'pas encore d’exercice',
  "pas encore d'exercice", 'sans exercice',
  'gib mir keine übung', 'schlagen sie keine übung vor', 'noch keine übung', 'ohne übung',
  'non darmi un esercizio', 'non suggerire un esercizio', 'non ancora un esercizio', 'senza esercizio',
  'não me dê um exercício', 'não sugira um exercício', 'ainda sem exercício', 'sem exercício',
];

// ─── Phase B: Deeper hypothesis indicators ────────────────────────────────────

/**
 * Hebrew identity/value/meaning indicators that trigger deeper hypothesis
 * validation (tentative marker + question required).
 */
const DEEPER_INDICATORS_HE = [
  '\u05E2\u05E8\u05DA', // ערך
  '\u05E2\u05E8\u05DA \u05E2\u05E6\u05DE\u05D9', // ערך עצמי
  '\u05D6\u05D4\u05D5\u05EA', // זהות
  '\u05DB\u05D0\u05D3\u05DD', // כאדם
  '\u05DE\u05D9 \u05D0\u05EA\u05D4', // מי אתה
  '\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D0\u05D9\u05E9\u05D9\u05EA', // משמעות אישית
  '\u05D2\u05D9\u05DC\u05D5\u05D9 \u05E2\u05E6\u05DE\u05D9', // גילוי עצמי
  '\u05D1\u05D5\u05E9\u05D4 \u05E2\u05DE\u05D5\u05E7\u05D4', // בושה עמוקה
  '\u05DC\u05D0 \u05D0\u05D5\u05DB\u05DC \u05DC\u05E9\u05D0\u05EA', // לא אוכל לשאת
  '\u05DC\u05D0 \u05EA\u05D5\u05DB\u05DC \u05DC\u05E9\u05D0\u05EA', // לא תוכל לשאת
];

/**
 * English identity/value/meaning indicators.
 */
const DEEPER_INDICATORS_EN = [
  'self-worth',
  'value as a person',
  'identity',
  'who you are',
  'personal meaning',
  'discover something about yourself',
  'cannot bear',
];

const DEEPER_INDICATORS_OTHER = [
  'autoestima', 'valor como persona', 'identidad', 'quién eres', 'significado personal',
  'descubrir algo sobre ti', 'no puedes soportar',
  'estime de soi', 'valeur en tant que personne', 'identité', 'qui vous êtes',
  'sens personnel', 'découvrir quelque chose sur vous', 'ne pouvez pas supporter',
  'selbstwert', 'wert als mensch', 'identität', 'wer du bist', 'persönliche bedeutung',
  'etwas über dich entdecken', 'nicht ertragen',
  'autostima', 'valore come persona', 'identità', 'chi sei', 'significato personale',
  'scoprire qualcosa su di te', 'non puoi sopportare',
  'valor como pessoa', 'identidade', 'quem você é', 'significado pessoal',
  'descobrir algo sobre você', 'não consegue suportar',
];

// ─── Phase B: Tentative markers ───────────────────────────────────────────────

/**
 * Hebrew tentative markers — at least one required when a deeper hypothesis
 * indicator is present (unless personal meaning is explicitly unknown).
 */
const TENTATIVE_MARKERS_HE = [
  '\u05D9\u05D9\u05EA\u05DB\u05DF', // ייתכן
  '\u05D0\u05E0\u05D9 \u05EA\u05D5\u05D4\u05D4', // אני תוהה
  '\u05D0\u05D7\u05EA \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA', // אחת האפשרויות
  '\u05D6\u05D5 \u05E2\u05D3\u05D9\u05D9\u05DF \u05D4\u05E9\u05E2\u05E8\u05D4', // זו עדיין השערה
  '\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D1\u05E8\u05D5\u05E8', // עדיין לא ברור
  '\u05E6\u05E8\u05D9\u05DA \u05DC\u05D1\u05D3\u05D5\u05E7', // צריך לבדוק
];

/**
 * English tentative markers.
 */
const TENTATIVE_MARKERS_EN = [
  'i wonder whether',
  'one possibility is',
  'this is still a hypothesis',
  'it is not yet clear',
  'may be connected to',
  'needs to be checked',
];

const TENTATIVE_MARKERS_OTHER = [
  'me pregunto si', 'una posibilidad es', 'esto sigue siendo una hipótesis',
  'aún no está claro', 'puede estar relacionado con', 'necesita comprobarse',
  'je me demande si', 'une possibilité est', 'cela reste une hypothèse',
  'ce n’est pas encore clair', "ce n'est pas encore clair", 'peut être lié à', 'doit être vérifié',
  'ich frage mich, ob', 'eine möglichkeit ist', 'dies ist noch eine hypothese',
  'es ist noch unklar', 'könnte damit zusammenhängen', 'muss überprüft werden',
  'mi chiedo se', 'una possibilità è', 'questa è ancora un’ipotesi',
  "questa è ancora un'ipotesi", 'non è ancora chiaro', 'può essere collegato a', 'deve essere verificato',
  'eu me pergunto se', 'uma possibilidade é', 'isso ainda é uma hipótese',
  'ainda não está claro', 'pode estar relacionado a', 'precisa ser verificado',
];

const CURRENT_TURN_TENTATIVE_EXTRA_HE = ['אולי', 'יכול להיות', 'ייתכן'];
const CURRENT_TURN_TENTATIVE_EXTRA_EN = ['maybe', 'perhaps', 'might', 'could it be', 'it may be'];
const CURRENT_TURN_TENTATIVE_EXTRA_OTHER = [
  'quizá', 'tal vez', 'podría', 'puede que',
  'peut-être', 'pourrait', 'il se peut',
  'vielleicht', 'könnte', 'möglicherweise',
  'forse', 'potrebbe', 'può darsi',
  'talvez', 'poderia', 'pode ser que',
];

const CURRENT_TURN_GROUNDING_CLAIM_GROUPS = [
  {
    id: 'causal',
    assistantTerms: [
      'because',
      'this explains',
      'that explains',
      'therefore',
      'that is why',
      'causes',
      'leads to',
      'results in',
      'נובע מ',
      'בגלל ש',
      'לכן',
      'זה מסביר',
      'הסיבה היא',
      'גורם',
      'מוביל',
      'porque', 'esto explica', 'por lo tanto', 'por eso', 'causa', 'lleva a', 'da lugar a',
      'parce que', 'cela explique', 'donc', 'c’est pourquoi', "c'est pourquoi", 'provoque', 'mène à', 'entraîne',
      'weil', 'das erklärt', 'daher', 'deshalb', 'verursacht', 'führt zu', 'ergibt sich aus',
      'perché', 'questo spiega', 'quindi', 'per questo', 'porta a', 'determina',
      'isso explica', 'portanto', 'por isso', 'leva a', 'resulta em',
    ],
    userTerms: [
      'because',
      'בגלל',
      'הסיבה',
      'הקשר בין',
      'מה הקשר',
      'גורמת לי',
      'גורם לי',
      'connection between',
      'what causes',
      'explain the connection',
      'porque', 'causa', 'qué causa', 'relación entre', 'explica la relación',
      'parce que', 'cause', 'qu’est-ce qui provoque', "qu'est-ce qui provoque", 'lien entre', 'explique le lien',
      'weil', 'ursache', 'was verursacht', 'zusammenhang zwischen', 'erkläre den zusammenhang',
      'perché', 'causa', 'che cosa causa', 'relazione tra', 'spiega la relazione',
      'porque', 'causa', 'o que causa', 'relação entre', 'explique a relação',
    ],
  },
  {
    id: 'identity',
    assistantTerms: [
      'identity',
      'who you are',
      'self-worth',
      'value as a person',
      'זהות',
      'ערך עצמי',
      'מי שאתה',
      'מי אתה',
      'identidad', 'quién eres', 'autoestima', 'valor como persona',
      'identité', 'qui vous êtes', 'estime de soi', 'valeur en tant que personne',
      'identität', 'wer du bist', 'selbstwert', 'wert als mensch',
      'identità', 'chi sei', 'autostima', 'valore come persona',
      'identidade', 'quem você é', 'valor como pessoa',
    ],
    userTerms: [
      'identity',
      'who i am',
      'who you are',
      'self-worth',
      'value as a person',
      'זהות',
      'ערך עצמי',
      'מי אני',
      'מי אתה',
      'identidad', 'quién soy', 'quién eres', 'autoestima', 'valor como persona',
      'identité', 'qui je suis', 'qui vous êtes', 'estime de soi', 'valeur en tant que personne',
      'identität', 'wer ich bin', 'wer du bist', 'selbstwert', 'wert als mensch',
      'identità', 'chi sono', 'chi sei', 'autostima', 'valore come persona',
      'identidade', 'quem eu sou', 'quem você é', 'autoestima', 'valor como pessoa',
    ],
  },
  {
    id: 'relationship_meaning',
    assistantTerms: [
      'damage the relationship',
      'harm the relationship',
      'closeness raises the stakes',
      'higher stakes',
      'emotional availability',
      'rejection',
      'relationship',
      'לפגוע בקשר',
      'לפגוע במערכת היחסים',
      'הקשר ייפגע',
      'הקרבה מעלה את המחיר',
      'זמינות רגשית',
      'דחייה',
      'מערכת היחסים',
      'הקשר',
      'dañar la relación', 'la relación se dañará', 'disponibilidad emocional', 'rechazo', 'relación',
      'nuire à la relation', 'la relation sera endommagée', 'disponibilité émotionnelle', 'rejet', 'relation',
      'die beziehung schädigen', 'die beziehung wird beschädigt', 'emotionale verfügbarkeit', 'zurückweisung', 'beziehung',
      'danneggiare la relazione', 'la relazione sarà danneggiata', 'disponibilità emotiva', 'rifiuto', 'relazione',
      'prejudicar o relacionamento', 'o relacionamento será prejudicado', 'disponibilidade emocional', 'rejeição', 'relacionamento',
    ],
    userTerms: [
      'relationship',
      'partner',
      'spouse',
      'marriage',
      'boyfriend',
      'girlfriend',
      'husband',
      'wife',
      'rejection',
      'system of relationship',
      'מערכת יחסים',
      'בן זוג',
      'בת זוג',
      'זוגיות',
      'נישואים',
      'דחייה',
      'הקשר',
      'לפגוע בקשר',
      'relación', 'pareja', 'matrimonio', 'novio', 'novia', 'marido', 'esposa', 'rechazo',
      'relation', 'partenaire', 'couple', 'mariage', 'petit ami', 'petite amie', 'mari', 'femme', 'rejet',
      'beziehung', 'partner', 'partnerin', 'ehe', 'freund', 'freundin', 'ehemann', 'ehefrau', 'zurückweisung',
      'relazione', 'partner', 'coniuge', 'matrimonio', 'fidanzato', 'fidanzata', 'marito', 'moglie', 'rifiuto',
      'relacionamento', 'parceiro', 'parceira', 'casamento', 'namorado', 'namorada', 'marido', 'esposa', 'rejeição',
    ],
  },
  {
    id: 'danger',
    assistantTerms: [
      'you are in danger',
      'there is danger',
      'this is dangerous',
      'real threat',
      'immediate threat',
      'imminent threat',
      'real danger',
      'immediate danger',
      'imminent danger',
      'real risk',
      'you are unsafe',
      'אתה בסכנה',
      'את בסכנה',
      'יש סכנה',
      'זה מסוכן',
      'איום ממשי',
      'איום מיידי',
      'סכנה ממשית',
      'סכנה מיידית',
      'סיכון אמיתי',
      'estás en peligro', 'hay peligro', 'esto es peligroso', 'amenaza real', 'peligro inmediato', 'riesgo real',
      'vous êtes en danger', 'il y a un danger', 'c’est dangereux', "c'est dangereux", 'menace réelle', 'danger immédiat', 'risque réel',
      'du bist in gefahr', 'es besteht gefahr', 'das ist gefährlich', 'reale bedrohung', 'unmittelbare gefahr', 'reales risiko',
      'sei in pericolo', 'c’è pericolo', "c'è pericolo", 'questo è pericoloso', 'minaccia reale', 'pericolo immediato', 'rischio reale',
      'você está em perigo', 'há perigo', 'isso é perigoso', 'ameaça real', 'perigo imediato', 'risco real',
    ],
    userTerms: [
      'danger',
      'threat',
      'unsafe',
      'risk',
      'afraid',
      'fear',
      'סכנה',
      'איום',
      'מסוכן',
      'סיכון',
      'מפחד',
      'פחד',
      'peligro', 'amenaza', 'peligroso', 'riesgo', 'miedo',
      'danger', 'menace', 'dangereux', 'risque', 'peur',
      'gefahr', 'bedrohung', 'gefährlich', 'risiko', 'angst',
      'pericolo', 'minaccia', 'pericoloso', 'rischio', 'paura',
      'perigo', 'ameaça', 'perigoso', 'risco', 'medo',
    ],
  },
  {
    id: 'perfection_correctness',
    assistantTerms: [
      'right response',
      'right answer',
      'perfect',
      'perfection',
      'correctness',
      'good enough',
      'must be right',
      'תגובה נכונה',
      'תשובה נכונה',
      'מושלם',
      'פרפקציוניזם',
      'לא מספיק טוב',
      'חייב להיות נכון',
      'respuesta correcta', 'perfecto', 'perfecta', 'perfección', 'lo bastante bueno', 'debe ser correcto',
      'bonne réponse', 'parfait', 'parfaite', 'perfection', 'assez bon', 'doit être correct',
      'richtige antwort', 'perfekt', 'perfektion', 'gut genug', 'muss richtig sein',
      'risposta giusta', 'perfetto', 'perfetta', 'perfezione', 'abbastanza buono', 'deve essere giusto',
      'resposta certa', 'perfeito', 'perfeita', 'perfeição', 'bom o suficiente', 'tem de estar certo',
    ],
    userTerms: [
      'right response',
      'right answer',
      'perfect',
      'perfection',
      'correct',
      'good enough',
      'תגובה נכונה',
      'תשובה נכונה',
      'מושלם',
      'פרפקציוניזם',
      'לא מספיק טוב',
      'נכון',
      'respuesta correcta', 'perfecto', 'perfecta', 'perfección', 'correcto', 'lo bastante bueno',
      'bonne réponse', 'parfait', 'parfaite', 'perfection', 'correct', 'assez bon',
      'richtige antwort', 'perfekt', 'perfektion', 'richtig', 'gut genug',
      'risposta giusta', 'perfetto', 'perfetta', 'perfezione', 'corretto', 'abbastanza buono',
      'resposta certa', 'perfeito', 'perfeita', 'perfeição', 'correto', 'bom o suficiente',
    ],
  },
  {
    id: 'maintaining_cycle',
    assistantTerms: [
      'maintaining cycle',
      'vicious cycle',
      'cycle',
      'loop',
      'avoidance keeps',
      'avoidance',
      'delay',
      'delaying',
      'pattern lives',
      'דפוס משמר',
      'מעגל',
      'לופ',
      'הדפוס עובד כך',
      'זה משמר',
      'הימנעות משמרת',
      'הימנעות',
      'ciclo', 'bucle', 'patrón', 'evitación', 'aplazamiento', 'comprobación repetida',
      'cycle', 'boucle', 'schéma', 'évitement', 'report', 'vérification répétée',
      'kreislauf', 'schleife', 'muster', 'vermeidung', 'aufschub', 'wiederholtes prüfen',
      'ciclo', 'schema', 'evitamento', 'rinvio', 'controllo ripetuto',
      'ciclo', 'padrão', 'evitação', 'adiamento', 'verificação repetida',
    ],
    userTerms: [
      'cycle',
      'loop',
      'pattern',
      'avoidance',
      'maintain',
      'delay',
      'delays',
      'delayed',
      'repeated checking',
      'checking again',
      'מעגל',
      'לופ',
      'דפוס',
      'הימנעות',
      'משמר',
      'מתעכב',
      'מתעכבת',
      'עיכוב',
      'בדיקה חוזרת',
      'בודק שוב',
      'ciclo', 'bucle', 'patrón', 'evitación', 'aplazar', 'comprobación repetida', 'comprobar de nuevo',
      'cycle', 'boucle', 'schéma', 'évitement', 'reporter', 'vérification répétée', 'vérifier à nouveau',
      'kreislauf', 'schleife', 'muster', 'vermeidung', 'aufschieben', 'wiederholtes prüfen', 'erneut prüfen',
      'ciclo', 'schema', 'evitamento', 'rinviare', 'controllo ripetuto', 'controllare di nuovo',
      'ciclo', 'padrão', 'evitação', 'adiar', 'verificação repetida', 'verificar novamente',
    ],
  },
];

// ─── Phase D: Exercise terms ──────────────────────────────────────────────────

/**
 * Hebrew exercise-related terms to check when the no-exercise clause is active.
 * Entries are checked as substrings — each match triggers a negation test.
 */
const EXERCISE_TERMS_HE = [
  '\u05EA\u05E8\u05D2\u05D9\u05DC', // תרגיל
  '\u05E9\u05D9\u05E2\u05D5\u05E8\u05D9 \u05D1\u05D9\u05EA', // שיעורי בית
  '\u05E0\u05D9\u05E1\u05D5\u05D9 \u05D4\u05EA\u05E0\u05D4\u05D2\u05D5\u05EA\u05D9', // ניסוי התנהגותי
  '\u05E7\u05E8\u05E7\u05D5\u05E2', // קרקוע
  '\u05D3\u05D9\u05E8\u05D5\u05D2', // דירוג
  '\u05E6\u05E2\u05D3 \u05DE\u05E2\u05E9\u05D9', // צעד מעשי
];

/**
 * English exercise-related terms.
 */
const EXERCISE_TERMS_EN = [
  'exercise',
  'homework',
  'behavioral experiment',
  'grounding',
  'rating scale',
  'action step',
];

const EXERCISE_TERMS_OTHER = [
  'ejercicio', 'tarea para casa', 'experimento conductual', 'técnica de anclaje',
  'escala de valoración', 'paso práctico',
  'exercice', 'devoirs', 'expérience comportementale', 'ancrage',
  'échelle d’évaluation', "échelle d'évaluation", 'étape pratique',
  'übung', 'hausaufgabe', 'verhaltensexperiment', 'erdung', 'bewertungsskala', 'handlungsschritt',
  'esercizio', 'compito', 'esperimento comportamentale', 'radicamento',
  'scala di valutazione', 'passo pratico',
  'exercício', 'tarefa de casa', 'experimento comportamental', 'ancoragem',
  'escala de avaliação', 'passo prático',
];

/**
 * Negation phrases that, when found in the 60 characters immediately before an
 * exercise term, indicate the term is being explicitly declined rather than proposed.
 */
const NEGATION_WINDOW_CHARS = 60;
const NEGATION_PHRASES_HE = ['\u05DC\u05D0 ', '\u05DC\u05DC\u05D0 ', '\u05D0\u05D9\u05DF ']; // לא / ללא / אין
const NEGATION_PHRASES_EN = ['no ', 'not ', "won't ", 'will not ', 'without ', "don't ", 'not propose', 'not suggest', 'not offer', 'not provide'];
const NEGATION_PHRASES_OTHER = [
  'sin ', 'no propondré', 'no sugeriré',
  'pas de ', 'sans ', 'ne proposerai pas', 'ne suggérerai pas',
  'keine ', 'nicht ', 'ohne ', 'werde keine ',
  'non ', 'senza ', 'non proporrò', 'non suggerirò',
  'não ', 'sem ', 'não vou propor', 'não vou sugerir',
];

// ─── Phase E: Internal marker substrings ──────────────────────────────────────

/**
 * Exact start-marker substrings that must not appear in assistant output.
 * Presence of any of these indicates an internal instruction leak.
 */
const INTERNAL_MARKER_SUBSTRINGS = [
  FD_START,
  SM_START,
  FORMULATION_CORRECTION_START,
  // Additional bounded internal labels the agent must not expose
  '=== WORKFLOW CONTEXT ===',
  '=== SAFETY MODE',
  '=== EMERGENCY RESOURCES',
  '=== FORMULATION',
  '=== END FORMULATION',
];

// ─── Helper: complete-block presence ─────────────────────────────────────────

/**
 * Returns true when `content` contains a complete bounded block defined by
 * `startMarker` and `endMarker` (both exact strings, \u2014 aware).
 *
 * @param {string} content
 * @param {string} startMarker
 * @param {string} endMarker
 * @returns {boolean}
 */
function _hasCompleteBlock(content, startMarker, endMarker) {
  if (typeof content !== 'string') return false;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return false;
  const endIdx = content.indexOf(endMarker, startIdx + startMarker.length);
  return endIdx !== -1;
}

// ─── Phase 3: Guarded-turn scope detection ────────────────────────────────────

function _stripCompleteBlock(content, startMarker, endMarker) {
  if (typeof content !== 'string' || !content) return content;

  let result = content;
  let startIdx = result.indexOf(startMarker);
  while (startIdx !== -1) {
    const endIdx = result.indexOf(endMarker, startIdx + startMarker.length);
    if (endIdx === -1) break;
    result = `${result.slice(0, startIdx)}${result.slice(endIdx + endMarker.length)}`;
    startIdx = result.indexOf(startMarker);
  }

  return result;
}

function _getVisibleUserContent(rawUserContent) {
  if (typeof rawUserContent !== 'string') return '';

  return _stripCompleteBlock(
    _stripCompleteBlock(
      _stripCompleteBlock(
        _stripCompleteBlock(rawUserContent, FD_START, FD_END),
        FORMULATION_CORRECTION_START,
        FORMULATION_CORRECTION_END
      ),
      CURRENT_TURN_GROUNDING_CORRECTION_START,
      CURRENT_TURN_GROUNDING_CORRECTION_END
    ),
    SM_START,
    SM_END
  ).trim();
}

/**
 * Classifies the raw user message for bounded formulation guarding.
 *
 * Safety Mode always supersedes formulation guarding.
 *
 * @param {string|null|undefined} rawUserContent
 * @returns {'initial_formulation'|'correction_followup'|null}
 */
export function classifyFormulationGuardedTurn(rawUserContent) {
  if (_isSafetyModeTurn(rawUserContent)) return null;
  if (_hasCompleteBlock(rawUserContent, FD_START, FD_END)) {
    return INITIAL_FORMULATION_GUARD_MODE;
  }
  if (_hasCompleteBlock(rawUserContent, FORMULATION_CORRECTION_START, FORMULATION_CORRECTION_END)) {
    return CORRECTION_FOLLOWUP_GUARD_MODE;
  }
  return null;
}

/**
 * Compatibility wrapper for existing callers that only need a boolean.
 *
 * @param {string|null|undefined} rawUserContent
 * @returns {boolean}
 */
export function isGuardedTurn(rawUserContent) {
  return classifyFormulationGuardedTurn(rawUserContent) !== null;
}

/**
 * Returns true when the raw user message content indicates a Safety Mode turn:
 * a complete === SAFETY MODE — STAGE 2 PHASE 7 === block is present.
 *
 * Safety Mode always takes precedence — a Safety Mode turn is NOT a guarded turn.
 *
 * @param {string|null|undefined} rawUserContent
 * @returns {boolean}
 */
function _isSafetyModeTurn(rawUserContent) {
  return _hasCompleteBlock(rawUserContent, SM_START, SM_END);
}

/**
 * Returns true when the FORMULATION DEEPENING block in the raw user message
 * includes the no-exercise clause (rule 7 in _buildFormulationDeepeningInstruction).
 *
 * @param {string|null|undefined} rawUserContent
 * @returns {boolean}
 */
function _hasNoExerciseClause(rawUserContent) {
  if (typeof rawUserContent !== 'string') return false;
  return rawUserContent.includes('The person has asked not to receive an exercise yet');
}

function _hasExplicitNoExerciseRequest(rawUserContent) {
  const visibleUserContent = _getVisibleUserContent(rawUserContent);
  if (!visibleUserContent) return false;

  for (const phrase of EXPLICIT_NO_EXERCISE_REQUESTS_HE) {
    if (visibleUserContent.includes(phrase)) return true;
  }

  const lower = visibleUserContent.toLowerCase();
  for (const phrase of EXPLICIT_NO_EXERCISE_REQUESTS_EN) {
    if (lower.includes(phrase)) return true;
  }
  for (const phrase of EXPLICIT_NO_EXERCISE_REQUESTS_OTHER) {
    if (lower.includes(phrase)) return true;
  }

  return false;
}

function _hasNoExerciseRestriction(rawUserContent, guardMode) {
  if (_hasNoExerciseClause(rawUserContent)) return true;
  return guardMode === CORRECTION_FOLLOWUP_GUARD_MODE && _hasExplicitNoExerciseRequest(rawUserContent);
}

// ─── Phase 4A: Prohibited certainty phrase detection ─────────────────────────

/**
 * Returns true when the assistant content contains a prohibited certainty phrase.
 * The check is unconditional — tentative prefixes do not exempt these phrases.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _hasProhibitedCertaintyPhrase(content) {
  if (typeof content !== 'string') return false;
  // Hebrew: case-sensitive exact substring
  for (const phrase of PROHIBITED_PHRASES_HE) {
    if (content.includes(phrase)) return true;
  }
  // English: case-insensitive
  const lower = content.toLowerCase();
  for (const phrase of PROHIBITED_PHRASES_EN) {
    if (lower.includes(phrase)) return true;
  }
  for (const phrase of PROHIBITED_PHRASES_OTHER) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

// ─── Phase 4B: Deeper hypothesis detection ───────────────────────────────────

/**
 * Returns true when the assistant content contains at least one deeper
 * identity/value/meaning indicator.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _hasDeepHypothesisIndicator(content) {
  if (typeof content !== 'string') return false;
  for (const indicator of DEEPER_INDICATORS_HE) {
    if (content.includes(indicator)) return true;
  }
  const lower = content.toLowerCase();
  for (const indicator of DEEPER_INDICATORS_EN) {
    if (lower.includes(indicator)) return true;
  }
  for (const indicator of DEEPER_INDICATORS_OTHER) {
    if (lower.includes(indicator)) return true;
  }
  return false;
}

/**
 * Returns true when the assistant content contains at least one tentative marker.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _hasAnyTentativeMarker(content) {
  if (typeof content !== 'string') return false;
  for (const marker of TENTATIVE_MARKERS_HE) {
    if (content.includes(marker)) return true;
  }
  const lower = content.toLowerCase();
  for (const marker of TENTATIVE_MARKERS_EN) {
    if (lower.includes(marker)) return true;
  }
  for (const marker of TENTATIVE_MARKERS_OTHER) {
    if (lower.includes(marker)) return true;
  }
  return false;
}

function _hasCurrentTurnTentativeMarker(content) {
  if (_hasAnyTentativeMarker(content)) return true;
  if (typeof content !== 'string') return false;

  for (const marker of CURRENT_TURN_TENTATIVE_EXTRA_HE) {
    if (content.includes(marker)) return true;
  }

  const lower = content.toLowerCase();
  for (const marker of CURRENT_TURN_TENTATIVE_EXTRA_EN) {
    if (lower.includes(marker)) return true;
  }
  for (const marker of CURRENT_TURN_TENTATIVE_EXTRA_OTHER) {
    if (lower.includes(marker)) return true;
  }
  return false;
}

function _findFirstMatchedTerm(content, terms) {
  if (typeof content !== 'string') return null;
  const lower = content.toLowerCase();
  for (const term of terms) {
    const normalized = String(term || '');
    if (!normalized) continue;
    if (content.includes(normalized)) return normalized;
    if (lower.includes(normalized.toLowerCase())) return normalized;
  }
  return null;
}

function _hashDiagnosticText(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function _normalizeSnippet(value, maxLen = 160) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\u200e|\u200f/g, '')
    .trim();
  return normalized.length > maxLen ? normalized.slice(0, maxLen) : normalized;
}

// ─── Current-turn grounding: context-aware helpers ────────────────────────────

/**
 * Splits text into individual sentences on sentence-ending punctuation + whitespace.
 * When no sentence boundary is found the whole text is returned as one element.
 *
 * @param {string} text
 * @returns {string[]}
 */
function _splitSentences(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const parts = text.split(/[.!?]+\s+/);
  return parts.filter(s => s.trim().length > 0);
}

/**
 * Extended negation prefixes used when checking user-supplied content.
 * Only imperative/instructional negations are used to avoid treating
 * negative self-descriptions like "I am not good enough" as un-grounded.
 * Hebrew: אל (imperative don't), בלי (without)
 * English: don't, do not, without — but NOT bare "not" (too broad).
 */
const _USER_NEGATION_PHRASES_HE = ['אל ', 'בלי '];
const _USER_NEGATION_PHRASES_EN = ["don't ", "do not ", 'without '];
const _USER_NEGATION_PHRASES_OTHER = [
  'no ', 'sin ', 'ne ', 'pas ', 'sans ', 'nicht ', 'keine ', 'ohne ',
  'non ', 'senza ', 'não ', 'sem ',
];

function _hasBoundedNegationPhrase(windowBefore, phrase) {
  let idx = windowBefore.indexOf(phrase);
  while (idx !== -1) {
    if (idx === 0 || /[\s,.;:!?()[\]{}"'“”‘’]/u.test(windowBefore[idx - 1])) {
      return true;
    }
    idx = windowBefore.indexOf(phrase, idx + 1);
  }
  return false;
}

function _findAffirmativeUserTerm(content, terms) {
  if (typeof content !== 'string') return null;
  const lower = content.toLowerCase();
  for (const term of terms) {
    const normalized = String(term || '');
    if (!normalized) continue;
    const normLower = normalized.toLowerCase();
    let idx = lower.indexOf(normLower);
    while (idx !== -1) {
      const windowStart = Math.max(0, idx - NEGATION_WINDOW_CHARS);
      const windowBefore = lower.slice(windowStart, idx);
      const negated =
        _USER_NEGATION_PHRASES_HE.some((n) => windowBefore.includes(n)) ||
        _USER_NEGATION_PHRASES_EN.some((n) => windowBefore.includes(n)) ||
        _USER_NEGATION_PHRASES_OTHER.some((n) => _hasBoundedNegationPhrase(windowBefore, n));
      if (!negated) return normalized;
      idx = lower.indexOf(normLower, idx + 1);
    }
  }
  return null;
}

/**
 * Trigger phrases that activate strict grounding mode.
 * When the user explicitly asks for current-information-only analysis, tentative
 * language does not exempt unsupported causal or relational claims.
 */
const STRICT_GROUNDING_TRIGGERS_HE = ['התייחס למה שקורה עכשיו בלבד', 'התייחס רק למה שתיארתי עכשיו'];
const STRICT_GROUNDING_TRIGGERS_EN = ['current information only'];
const STRICT_GROUNDING_TRIGGERS_OTHER = [
  'solo la información actual', 'solo lo que describí ahora',
  'uniquement les informations actuelles', 'seulement ce que j’ai décrit maintenant',
  "seulement ce que j'ai décrit maintenant",
  'nur die aktuellen informationen', 'nur was ich gerade beschrieben habe',
  'solo le informazioni attuali', 'solo ciò che ho descritto ora',
  'apenas as informações atuais', 'apenas o que descrevi agora',
];
const THREAT_APPRAISAL_TERMS_HE = ['הערכת איום', 'תחושת איום', 'המוח מפרש', 'מתפרש כאיום'];
const THREAT_APPRAISAL_TERMS_EN = ['threat appraisal', 'sense of threat', 'brain interprets', 'interprets as threat'];
const CURRENT_TURN_EXPLANATION_TERMS_HE = ['מחשבה', 'מתח', 'לחץ', 'עיכוב', 'התנהגות', 'תגובה', 'הימנעות'];
const CURRENT_TURN_EXPLANATION_TERMS_EN = ['thought', 'tension', 'stress', 'behavior', 'response', 'avoidance', 'delay'];
const HARD_DANGER_CLAIMS_HE = ['אתה בסכנה', 'את בסכנה', 'יש סכנה', 'זה מסוכן', 'איום ממשי', 'איום מיידי', 'סכנה ממשית', 'סכנה מיידית', 'סיכון אמיתי'];
const HARD_DANGER_CLAIMS_EN = [
  'you are in danger',
  'there is danger',
  'this is dangerous',
  'real threat',
  'immediate threat',
  'imminent threat',
  'real danger',
  'immediate danger',
  'imminent danger',
  'real risk',
];

/**
 * Returns true when the raw user content contains a strict-grounding trigger.
 *
 * @param {string|null|undefined} rawUserContent
 * @returns {boolean}
 */
function _isStrictGroundingMode(rawUserContent) {
  const visible = _getVisibleUserContent(rawUserContent);
  if (!visible) return false;
  if (STRICT_GROUNDING_TRIGGERS_HE.some(t => visible.includes(t))) return true;
  const lower = visible.toLowerCase();
  return STRICT_GROUNDING_TRIGGERS_EN.some(t => lower.includes(t)) ||
    STRICT_GROUNDING_TRIGGERS_OTHER.some(t => lower.includes(t));
}

function _hasThreatAppraisalTerminology(sentence, visibleUser) {
  const sentenceLower = String(sentence || '').toLowerCase();
  const userLower = String(visibleUser || '').toLowerCase();
  const hasAppraisalHe = THREAT_APPRAISAL_TERMS_HE.some((term) => sentence.includes(term));
  const hasAppraisalEn = THREAT_APPRAISAL_TERMS_EN.some((term) => sentenceLower.includes(term));
  if (!hasAppraisalHe && !hasAppraisalEn) return false;
  const hasCurrentTurnInSentence =
    CURRENT_TURN_EXPLANATION_TERMS_HE.some((term) => sentence.includes(term)) ||
    CURRENT_TURN_EXPLANATION_TERMS_EN.some((term) => sentenceLower.includes(term));
  const hasCurrentTurnInUser =
    CURRENT_TURN_EXPLANATION_TERMS_HE.some((term) => visibleUser.includes(term)) ||
    CURRENT_TURN_EXPLANATION_TERMS_EN.some((term) => userLower.includes(term));
  if (!hasCurrentTurnInSentence || !hasCurrentTurnInUser) return false;
  const hasHardDangerClaim =
    HARD_DANGER_CLAIMS_HE.some((term) => sentence.includes(term)) ||
    HARD_DANGER_CLAIMS_EN.some((term) => sentenceLower.includes(term));
  return !hasHardDangerClaim;
}

export function evaluateCurrentTurnGroundingContract(assistantContent, rawUserContent) {
  const detailed = evaluateCurrentTurnGroundingContractDetailed(assistantContent, rawUserContent);
  return { pass: detailed.pass, reasonCodes: detailed.reasonCodes };
}

export function evaluateCurrentTurnGroundingContractDetailed(assistantContent, rawUserContent) {
  const visibleUser = _getVisibleUserContent(rawUserContent);
  const strictMode = _isStrictGroundingMode(rawUserContent);
  const correctionBlockDetected = _hasCompleteBlock(
    rawUserContent,
    CURRENT_TURN_GROUNDING_CORRECTION_START,
    CURRENT_TURN_GROUNDING_CORRECTION_END
  );

  if (typeof assistantContent !== 'string' || !assistantContent.trim()) {
    return {
      pass: true,
      reasonCodes: [],
      strictMode,
      visibleUserLength: visibleUser.length,
      visibleUserHash: _hashDiagnosticText(visibleUser),
      sentenceIndex: null,
      matchedClaimGroup: null,
      matchedAssistantTerm: null,
      matchedAffirmativeUserTerm: 'none',
      rejectedSentenceSnippet: null,
      correctionBlockDetected,
    };
  }

  if (_hasDiagnosticUncertaintyEscalation(assistantContent, visibleUser)) {
    return {
      pass: false,
      reasonCodes: ['diagnostic_uncertainty_escalation'],
      strictMode,
      visibleUserLength: visibleUser.length,
      visibleUserHash: _hashDiagnosticText(visibleUser),
      sentenceIndex: null,
      matchedClaimGroup: 'diagnostic_uncertainty',
      matchedAssistantTerm: 'unsupported_diagnostic_certainty',
      matchedAffirmativeUserTerm: 'uncertain_diagnostic_language',
      rejectedSentenceSnippet: null,
      correctionBlockDetected,
    };
  }

  const matchedClinicalOverreach = _findClinicalOverreachPhrase(assistantContent);
  if (matchedClinicalOverreach) {
    return {
      pass: false,
      reasonCodes: ['clinical_overreach_certainty'],
      strictMode,
      visibleUserLength: visibleUser.length,
      visibleUserHash: _hashDiagnosticText(visibleUser),
      sentenceIndex: null,
      matchedClaimGroup: 'clinical_overreach',
      matchedAssistantTerm: 'bounded_overreach_pattern',
      matchedAffirmativeUserTerm: 'not_applicable',
      rejectedSentenceSnippet: null,
      correctionBlockDetected,
    };
  }

  const sentences = _splitSentences(assistantContent);
  for (let groupIndex = 0; groupIndex < CURRENT_TURN_GROUNDING_CLAIM_GROUPS.length; groupIndex++) {
    const group = CURRENT_TURN_GROUNDING_CLAIM_GROUPS[groupIndex];
    const matchedAffirmativeUserTerm = _findAffirmativeUserTerm(visibleUser, group.userTerms);
    if (matchedAffirmativeUserTerm) continue;

    for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex++) {
      const sentence = sentences[sentenceIndex];
      const matchedAssistantTerm = _findFirstMatchedTerm(sentence, group.assistantTerms);
      if (!matchedAssistantTerm) continue;
      if (group.id === 'danger' && _hasThreatAppraisalTerminology(sentence, visibleUser)) continue;
      if (!strictMode && _hasCurrentTurnTentativeMarker(sentence)) continue;
      return {
        pass: false,
        reasonCodes: ['unsupported_current_turn_grounding_claim'],
        strictMode,
        visibleUserLength: visibleUser.length,
        visibleUserHash: _hashDiagnosticText(visibleUser),
        sentenceIndex,
        matchedClaimGroup: group.id,
        matchedAssistantTerm,
        matchedAffirmativeUserTerm: 'none',
        rejectedSentenceSnippet: _normalizeSnippet(sentence, 160),
        correctionBlockDetected,
      };
    }
  }

  return {
    pass: true,
    reasonCodes: [],
    strictMode,
    visibleUserLength: visibleUser.length,
    visibleUserHash: _hashDiagnosticText(visibleUser),
    sentenceIndex: null,
    matchedClaimGroup: null,
    matchedAssistantTerm: null,
    matchedAffirmativeUserTerm: 'none',
    rejectedSentenceSnippet: null,
    correctionBlockDetected,
  };
}

/**
 * Returns true when the content explicitly states that personal meaning is
 * still unknown rather than making a deeper hypothesis.
 * When this is true, tentative language is not required.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _statesPersonalMeaningUnknown(content) {
  if (typeof content !== 'string') return false;
  // Hebrew indicators of acknowledged unknown meaning
  const UNKNOWN_INDICATORS_HE = [
    '\u05DE\u05D4 \u05E9\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2', // מה שעדיין לא ידוע
    '\u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05D0\u05D9\u05E9\u05D9\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF', // המשמעות האישית עדיין
    '\u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2\u05D4 \u05DC\u05D9', // לא ידועה לי
    '\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2\u05D4', // עדיין לא ידועה
  ];
  for (const ind of UNKNOWN_INDICATORS_HE) {
    if (content.includes(ind)) return true;
  }
  const lower = content.toLowerCase();
  const UNKNOWN_INDICATORS_EN = [
    'what remains unknown',
    'personal meaning is still unknown',
    'i do not know the personal meaning',
    'the personal meaning is not yet known',
    'still unknown is',
  ];
  for (const ind of UNKNOWN_INDICATORS_EN) {
    if (lower.includes(ind)) return true;
  }
  const UNKNOWN_INDICATORS_OTHER = [
    'lo que sigue sin saberse', 'el significado personal aún se desconoce',
    'no conozco el significado personal', 'todavía no se conoce el significado personal',
    'ce qui reste inconnu', 'le sens personnel reste inconnu',
    'je ne connais pas le sens personnel', 'le sens personnel n’est pas encore connu',
    "le sens personnel n'est pas encore connu",
    'noch unbekannt ist', 'die persönliche bedeutung ist noch unbekannt',
    'ich kenne die persönliche bedeutung nicht', 'die persönliche bedeutung ist noch nicht bekannt',
    'ciò che resta sconosciuto', 'il significato personale è ancora sconosciuto',
    'non conosco il significato personale', 'il significato personale non è ancora noto',
    'o que permanece desconhecido', 'o significado pessoal ainda é desconhecido',
    'não conheço o significado pessoal', 'o significado pessoal ainda não é conhecido',
  ];
  for (const ind of UNKNOWN_INDICATORS_OTHER) {
    if (lower.includes(ind)) return true;
  }
  return false;
}

// ─── Phase 4C: Question count ─────────────────────────────────────────────────

/**
 * Returns the number of question-mark characters in the content.
 * Bounded count only — no semantic question classification.
 *
 * @param {string} content
 * @returns {number}
 */
function _countQuestions(content) {
  if (typeof content !== 'string') return 0;
  let count = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '?') count++;
  }
  return count;
}

// ─── Phase 4D: Exercise detection ────────────────────────────────────────────

/**
 * Returns true when a term match appears NOT to be negated within the preceding
 * NEGATION_WINDOW_CHARS characters.
 *
 * @param {string} content   Full (lowercased) content
 * @param {number} termIdx   Start index of the matched term
 * @param {string[]} negationPhrases  Negation phrases (already lowercased)
 * @returns {boolean} true → term is an un-negated proposal
 */
function _isTermUnnegated(content, termIdx, negationPhrases) {
  const windowStart = Math.max(0, termIdx - NEGATION_WINDOW_CHARS);
  const window = content.substring(windowStart, termIdx).toLowerCase();
  for (const neg of negationPhrases) {
    if (window.includes(neg)) return false;
  }
  return true;
}

/**
 * Returns true when the assistant content proposes an exercise (un-negated)
 * when the no-exercise clause is active.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _hasExerciseSuggestion(content) {
  if (typeof content !== 'string') return false;
  // Hebrew: case-sensitive (Hebrew script)
  for (const term of EXERCISE_TERMS_HE) {
    let idx = content.indexOf(term);
    while (idx !== -1) {
      if (_isTermUnnegated(content, idx, NEGATION_PHRASES_HE)) return true;
      idx = content.indexOf(term, idx + 1);
    }
  }
  // English: case-insensitive
  const lower = content.toLowerCase();
  for (const term of EXERCISE_TERMS_EN) {
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      if (_isTermUnnegated(lower, idx, NEGATION_PHRASES_EN)) return true;
      idx = lower.indexOf(term, idx + 1);
    }
  }
  for (const term of EXERCISE_TERMS_OTHER) {
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      if (_isTermUnnegated(lower, idx, NEGATION_PHRASES_OTHER)) return true;
      idx = lower.indexOf(term, idx + 1);
    }
  }
  return false;
}

// ─── Phase 4E: Internal content leak detection ───────────────────────────────

/**
 * Returns true when the assistant content contains a complete internal runtime
 * marker that must not be exposed to users.
 *
 * @param {string} content
 * @returns {boolean}
 */
function _hasInternalContentLeak(content) {
  if (typeof content !== 'string') return false;
  for (const marker of INTERNAL_MARKER_SUBSTRINGS) {
    if (content.includes(marker)) return true;
  }
  return false;
}

function _hasExplicitConclusionBlocker(rawUserContent, guardMode) {
  if (guardMode !== CORRECTION_FOLLOWUP_GUARD_MODE) return false;

  const visibleUserContent = _getVisibleUserContent(rawUserContent);
  if (!visibleUserContent) return false;

  for (const phrase of EXPLICIT_CONCLUSION_BLOCKERS_HE) {
    if (visibleUserContent.includes(phrase)) return true;
  }

  const lower = visibleUserContent.toLowerCase();
  for (const phrase of EXPLICIT_CONCLUSION_BLOCKERS_EN) {
    if (lower.includes(phrase)) return true;
  }
  for (const phrase of EXPLICIT_CONCLUSION_BLOCKERS_OTHER) {
    if (lower.includes(phrase)) return true;
  }

  return false;
}

function _hasBlockedConclusionPhrase(content) {
  if (typeof content !== 'string') return false;

  for (const phrase of BLOCKED_CONCLUSION_PHRASES_HE) {
    if (content.includes(phrase)) return true;
  }

  const lower = content.toLowerCase();
  for (const phrase of BLOCKED_CONCLUSION_PHRASES_EN) {
    if (lower.includes(phrase)) return true;
  }
  for (const phrase of BLOCKED_CONCLUSION_PHRASES_OTHER) {
    if (lower.includes(phrase)) return true;
  }

  return false;
}

// ─── Phase 4: Bounded response validation ─────────────────────────────────────

/**
 * Evaluates a guarded assistant response against the Formulation-Led clinical
 * contract.
 *
 * Called ONLY for in-scope guarded turns.
 * For out-of-scope turns, do not call this function.
 *
 * @param {string} assistantContent   The sanitized assistant message text.
 * @param {string} rawUserContent     The raw (pre-strip) originating user message.
 * @param {'initial_formulation'|'correction_followup'} [guardMode='initial_formulation']
 * @returns {{ pass: boolean, reasonCodes: string[] }}
 */
export function evaluateFormulationResponseContract(
  assistantContent,
  rawUserContent,
  guardMode = INITIAL_FORMULATION_GUARD_MODE
) {
  const reasonCodes = [];

  if (typeof assistantContent !== 'string' || !assistantContent.trim()) {
    // Empty/missing content cannot be a valid formulation-led response.
    return { pass: false, reasonCodes: ['missing_verification_question'] };
  }

  // ── Phase 4E: Internal content leak ────────────────────────────────────────
  if (_hasInternalContentLeak(assistantContent)) {
    reasonCodes.push('internal_instruction_leak');
  }

  // ── Phase 4A: Prohibited certainty phrases ──────────────────────────────────
  if (_hasProhibitedCertaintyPhrase(assistantContent)) {
    reasonCodes.push('prohibited_certainty_phrase');
  }

  // ── Phase 4D: No-exercise rule ──────────────────────────────────────────────
  const noExerciseActive = _hasNoExerciseRestriction(rawUserContent, guardMode);
  if (noExerciseActive && _hasExerciseSuggestion(assistantContent)) {
    reasonCodes.push('exercise_proposed_when_blocked');
  }

  // ── Phase 4B + 4C: Deeper hypothesis + tentative marker + question ──────────
  if (
    _hasExplicitConclusionBlocker(rawUserContent, guardMode) &&
    _hasBlockedConclusionPhrase(assistantContent)
  ) {
    reasonCodes.push('conclusion_drawn_when_explicitly_blocked');
  }

  if (_hasDeepHypothesisIndicator(assistantContent)) {
    const hasTentative = _hasAnyTentativeMarker(assistantContent);
    const statesUnknown = _statesPersonalMeaningUnknown(assistantContent);

    if (!hasTentative && !statesUnknown) {
      reasonCodes.push('unsupported_deeper_claim_without_tentative_marker');
    }

    // Question count is required whenever a deeper hypothesis is introduced.
    const qCount = _countQuestions(assistantContent);
    if (qCount === 0) {
      reasonCodes.push('missing_verification_question');
    } else if (qCount > 1) {
      reasonCodes.push('multiple_questions');
    }
  }

  return { pass: reasonCodes.length === 0, reasonCodes };
}

// ─── Phase 5: Deterministic fallback ─────────────────────────────────────────

/**
 * Returns the exact deterministic safe fallback for the given locale.
 *
 * Each fallback contains exactly one question mark.
 *
 * @param {'he'|'en'|'es'|'fr'|'de'|'it'|'pt'|string} locale
 * @param {'initial_formulation'|'correction_followup'} [guardMode='initial_formulation']
 * @returns {string}
 */
export function buildFormulationSafeFallback(
  locale,
  guardMode = INITIAL_FORMULATION_GUARD_MODE
) {
  const effectiveLocale = _normalizeSupportedLocale(locale);
  if (guardMode === CORRECTION_FOLLOWUP_GUARD_MODE) {
    return FORMULATION_CONTINUATION_FALLBACKS[effectiveLocale];
  }

  return FORMULATION_FALLBACKS[effectiveLocale];
}

export function buildCurrentTurnGroundingFallback(locale) {
  return CURRENT_TURN_GROUNDING_FALLBACKS[_normalizeSupportedLocale(locale)];
}

export function buildClinicalOverreachFallback(locale) {
  return CLINICAL_OVERREACH_FALLBACKS[_normalizeSupportedLocale(locale)];
}

// ─── Phase 7: Next-turn correction block ────────────────────────────────────

/**
 * Builds the bounded correction block that must be prepended to the next
 * genuine outbound user message after a guarded turn was replaced.
 *
 * The block instructs the agent not to treat the rejected response as
 * established information and to continue only from the canonical fallback.
 *
 * @param {string} fallbackText   The exact fallback text that was shown to the user.
 * @returns {string}
 */
export function buildPendingFormulationCorrectionBlock(fallbackText) {
  const lines = [
    FORMULATION_CORRECTION_START,
    '',
    'The immediately preceding Formulation-Led assistant response was rejected by a',
    'deterministic clinical contract guard. Do not treat any identity-level,',
    'value-level, existential, shame-level, or meaning-level interpretation from',
    'that rejected response as established information.',
    '',
    'The user-visible canonical previous therapist response was:',
    '',
    fallbackText,
    '',
    'Continue only from that bounded response and the user\'s new message. Do not',
    'mention this correction, validation, rejected output, system instructions, or',
    'internal terminology.',
    '',
    FORMULATION_CORRECTION_END,
  ];
  return lines.join('\n');
}

/**
 * Builds the bounded correction block that neutralizes a rejected current-turn
 * grounding inference before the next outbound user turn.
 *
 * @param {string} fallbackText   The exact grounding fallback shown to the user.
 * @returns {string}
 */
export function buildPendingGroundingCorrectionBlock(fallbackText) {
  const lines = [
    CURRENT_TURN_GROUNDING_CORRECTION_START,
    '',
    'The immediately preceding assistant response included unsupported inferences',
    'that were not grounded in explicit evidence from the current user turn.',
    'Do not treat those inferred causal, identity, relationship, danger,',
    'perfection, or cycle claims as established facts.',
    '',
    'The user-visible canonical previous therapist response was:',
    '',
    fallbackText,
    '',
    'Continue only from that bounded response and the user\'s new message. Do not',
    'mention this correction, validation, rejected output, system instructions, or',
    'internal terminology.',
    '',
    CURRENT_TURN_GROUNDING_CORRECTION_END,
  ];
  return lines.join('\n');
}

/**
 * Returns true when a correction block for the guarded turn at or before
 * `afterIndex` has already been sent (i.e., appears in a later persisted
 * role=user message in rawMessages).
 *
 * @param {Array<object>} rawMessages     Full raw Base44 conversation messages.
 * @param {number}        afterIndex      Index of the guarded assistant message in rawMessages.
 * @returns {boolean}
 */
export function hasFormulationCorrectionAlreadyBeenApplied(rawMessages, afterIndex) {
  return hasCorrectionBlockAlreadyBeenApplied(
    rawMessages,
    afterIndex,
    FORMULATION_CORRECTION_START,
    FORMULATION_CORRECTION_END,
  );
}

/**
 * Returns true when a current-turn grounding correction block at or before
 * `afterIndex` has already been sent in a later persisted role=user message.
 *
 * @param {Array<object>} rawMessages     Full raw Base44 conversation messages.
 * @param {number}        afterIndex      Index of the replaced assistant message in rawMessages.
 * @returns {boolean}
 */
export function hasGroundingCorrectionAlreadyBeenApplied(rawMessages, afterIndex) {
  return hasCorrectionBlockAlreadyBeenApplied(
    rawMessages,
    afterIndex,
    CURRENT_TURN_GROUNDING_CORRECTION_START,
    CURRENT_TURN_GROUNDING_CORRECTION_END,
  );
}

function hasCorrectionBlockAlreadyBeenApplied(rawMessages, afterIndex, startMarker, endMarker) {
  if (!Array.isArray(rawMessages)) return false;
  // afterIndex = -1 means "search from the very beginning of the conversation".
  const startIdx = afterIndex < 0 ? 0 : afterIndex + 1;
  for (let i = startIdx; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    if (
      msg &&
      msg.role === 'user' &&
      typeof msg.content === 'string' &&
      _hasCompleteBlock(msg.content, startMarker, endMarker)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the immediately preceding persisted role=user message in rawMessages
 * before the given index.
 *
 * @param {Array<object>} rawMessages
 * @param {number}        beforeIdx  Index in rawMessages to search before.
 * @returns {object|null}
 */
function _findPrecedingRawUser(rawMessages, beforeIdx) {
  for (let i = beforeIdx - 1; i >= 0; i--) {
    if (rawMessages[i] && rawMessages[i].role === 'user') return rawMessages[i];
  }
  return null;
}

// ─── Phase 6: Centralized guard application ───────────────────────────────────

/**
 * Applies the formulation contract guard to a final processed message array.
 *
 * Steps:
 * 1. For each assistant message in `finalMessages`, use the same array index in
 *    `rawMessages` and find the immediately preceding raw user message.
 * 2. If that user message is a guarded turn, evaluate the assistant content.
 * 3. If the content violates the contract, replace it with the deterministic
 *    fallback. The original message ID, role, created_at, and ordering are
 *    preserved; only `content` and `metadata.formulation_guard_replaced` /
 *    `metadata.formulation_guard_reason_codes` are changed.
 * 4. Track the most recent replaced turn and check whether a correction block
 *    was already sent for it.
 *
 * The function never mutates its inputs.
 * The function is deterministic and idempotent.
 *
 * @param {Array<object>}  rawMessages     Original Base44 messages (full content).
 * @param {Array<object>}  finalMessages   Sanitized + processed messages (raw-index aligned).
 * @param {object}         [options]
 * @param {'he'|'en'|'es'|'fr'|'de'|'it'|'pt'|string} [options.locale='en']  Session locale.
 * @returns {{
 *   messages: Array<object>,
 *   pendingCorrection: { fallbackText: string, locale: string } | null
 * }}
 */
export function applyFormulationGuardToConversationMessages(
  rawMessages,
  finalMessages,
  options
) {
  const locale = (typeof options?.locale === 'string' ? options.locale : 'en');
  const effectiveLocale = _normalizeSupportedLocale(locale);

  if (!Array.isArray(rawMessages) || !Array.isArray(finalMessages)) {
    return { messages: Array.isArray(finalMessages) ? finalMessages : [], pendingCorrection: null };
  }

  const result = [];
  let lastReplacedRawIdx = -1;
  let lastReplacedFallback = null;

  for (let fi = 0; fi < finalMessages.length; fi++) {
    const msg = finalMessages[fi];

    // Only guard assistant messages
    if (!msg || msg.role !== 'assistant' || typeof msg.content !== 'string') {
      result.push(msg);
      continue;
    }

    // Canonical production contract: processed index must match raw index.
    const rawIdx = fi >= 0 && fi < rawMessages.length ? fi : -1;
    const precedingRawUser = rawIdx !== -1 ? _findPrecedingRawUser(rawMessages, rawIdx) : null;

    const rawUserContent = precedingRawUser ? precedingRawUser.content : null;

    const guardMode = rawUserContent !== null
      ? classifyFormulationGuardedTurn(rawUserContent)
      : null;

    if (!guardMode) {
      result.push(msg);
      continue;
    }

    // Already guarded_replaced (idempotency): do not re-evaluate
    if (msg.metadata?.formulation_guard_replaced === true) {
      result.push(msg);
      // Still track as a replaced turn for pending correction logic
      if (rawIdx !== -1) {
        lastReplacedRawIdx = rawIdx;
        lastReplacedFallback = String(msg.content); // content is already the fallback
      }
      continue;
    }

    // Evaluate the assistant response
    const evaluation = evaluateFormulationResponseContract(msg.content, rawUserContent, guardMode);

    if (evaluation.pass) {
      result.push(msg);
      continue;
    }

    // ── Contract violated: replace with deterministic fallback ────────────────
    const fallbackText = buildFormulationSafeFallback(effectiveLocale, guardMode);
    const replacedMsg = {
      ...msg,
      content: fallbackText,
      metadata: {
        ...(msg.metadata || {}),
        formulation_guard_replaced: true,
        formulation_guard_reason_codes: evaluation.reasonCodes,
      },
    };
    result.push(replacedMsg);

    if (rawIdx !== -1) {
      lastReplacedRawIdx = rawIdx;
      lastReplacedFallback = fallbackText;
    }
  }

  // ── Determine pendingCorrection ───────────────────────────────────────────
  let pendingCorrection = null;
  if (lastReplacedRawIdx !== -1 && lastReplacedFallback !== null) {
    const alreadyApplied = hasFormulationCorrectionAlreadyBeenApplied(
      rawMessages,
      lastReplacedRawIdx
    );
    if (!alreadyApplied) {
      pendingCorrection = {
        fallbackText: lastReplacedFallback,
        locale: effectiveLocale,
      };
    }
  }

  return { messages: result, pendingCorrection };
}

/**
 * Applies deterministic current-turn grounding validation using only the
 * immediate preceding user message for each assistant turn.
 *
 * If an unsupported causal/identity/relationship/danger/perfection/cycle claim
 * is presented as known fact, the message is replaced with a localized neutral
 * fallback that keeps uncertainty explicit and asks at most one event-level
 * question.
 *
 * @param {Array<object>} rawMessages
 * @param {Array<object>} finalMessages
 * @param {object} [options]
 * @param {'he'|'en'|'es'|'fr'|'de'|'it'|'pt'|string} [options.locale='en']
 * @returns {{
 *   messages: Array<object>,
 *   pendingCorrection: { fallbackText: string, locale: string } | null
 * }}
 */
export function applyCurrentTurnGroundingGuardToConversationMessages(
  rawMessages,
  finalMessages,
  options
) {
  const locale = (typeof options?.locale === 'string' ? options.locale : 'en');
  const effectiveLocale = _normalizeSupportedLocale(locale);

  if (!Array.isArray(rawMessages) || !Array.isArray(finalMessages)) {
    return {
      messages: Array.isArray(finalMessages) ? finalMessages : [],
      pendingCorrection: null,
    };
  }

  const assistantRawIndices = [];
  if (Array.isArray(rawMessages)) {
    for (let rawIndex = 0; rawIndex < rawMessages.length; rawIndex++) {
      if (rawMessages[rawIndex]?.role === 'assistant') {
        assistantRawIndices.push(rawIndex);
      }
    }
  }

  const result = [];
  let lastReplacedRawIdx = -1;
  let lastReplacedFallback = null;
  for (let fi = 0; fi < finalMessages.length; fi++) {
    const msg = finalMessages[fi];

    if (!msg || msg.role !== 'assistant' || typeof msg.content !== 'string') {
      result.push(msg);
      continue;
    }

    if (msg.metadata?.current_turn_grounding_guard_replaced === true) {
      result.push(msg);
      continue;
    }

    // Skip messages already replaced by the formulation guard — those
    // fallbacks are carefully crafted clinical responses that must not
    // be re-evaluated by the grounding guard.
    if (msg.metadata?.formulation_guard_replaced === true) {
      result.push(msg);
      continue;
    }

    const rawIdx = Number.isInteger(msg?.__rawIndex)
      ? msg.__rawIndex
      : assistantRawIndices.shift() ?? -1;
    const precedingRawUser = rawIdx !== -1 ? _findPrecedingRawUser(rawMessages, rawIdx) : null;
    const rawUserContent = precedingRawUser ? precedingRawUser.content : null;
    const evaluation = evaluateCurrentTurnGroundingContract(msg.content, rawUserContent);

    if (evaluation.pass) {
      result.push(msg);
      continue;
    }

    const needsClinicalHumilityFallback = evaluation.reasonCodes.some((reasonCode) =>
      ['clinical_overreach_certainty', 'diagnostic_uncertainty_escalation'].includes(reasonCode)
    );
    const fallbackText = needsClinicalHumilityFallback
      ? buildClinicalOverreachFallback(effectiveLocale)
      : buildCurrentTurnGroundingFallback(effectiveLocale);
    const replacedMsg = {
      ...msg,
      content: fallbackText,
      metadata: {
        ...(msg.metadata || {}),
        current_turn_grounding_guard_replaced: true,
        current_turn_grounding_guard_reason_codes: evaluation.reasonCodes,
        current_turn_grounding_guard_user_raw_index: rawIdx,
        current_turn_grounding_guard_user_message_id: precedingRawUser?.id || null,
      },
    };
    result.push(replacedMsg);
    if (rawIdx !== -1) {
      lastReplacedRawIdx = rawIdx;
      lastReplacedFallback = fallbackText;
    }
  }

  let pendingCorrection = null;
  if (lastReplacedRawIdx !== -1 && lastReplacedFallback !== null) {
    const alreadyApplied = hasGroundingCorrectionAlreadyBeenApplied(
      rawMessages,
      lastReplacedRawIdx,
    );
    if (!alreadyApplied) {
      pendingCorrection = {
        fallbackText: lastReplacedFallback,
        locale: effectiveLocale,
      };
    }
  }

  return { messages: result, pendingCorrection };
}
