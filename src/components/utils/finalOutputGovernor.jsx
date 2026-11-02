/**
 * FINAL USER-VISIBLE RESPONSE GOVERNOR (CP12 + Release Hardening Pack)
 *
 * Components:
 *   A. Final Output Fail-Closed (leakage/meta/tool names → never render → failsafe)
 *   B. Directive-first enforcement (strip ask-back, worksheet drift)
 *   C. No-response fallback (never blank, never stall)
 *   D. Same-prompt stability (routing/worksheet strip)
 *   E. Long-form reflection trap kill switch (HE + EN + secondary languages)
 *   F. Multilingual purity + quality floor (ES/FR/DE/IT/PT)
 *   G. Post-learning compression (no over-explanation after success turn)
 *   HE. Hebrew semantic anti-worksheet REWRITE
 *   EN. CP13-EN English reflection trap REWRITE
 */

import { sanitizeMessageContent } from './messageContentSanitizer';

// ─── Canonical session-language normalizer ────────────────────────────────────

/**
 * Normalises an arbitrary language tag to one of the seven supported ISO codes.
 * Any absent, empty, or unrecognised value falls back to English — never Hebrew.
 *
 * @param {*} lang - Raw value from opts.lang or sessionLanguageRef.current.
 * @returns {'en'|'he'|'es'|'fr'|'de'|'it'|'pt'}
 */
const SUPPORTED_LANG_CODES = new Set(['en', 'he', 'es', 'fr', 'de', 'it', 'pt']);

export function normalizeSessionLanguage(lang) {
  if (typeof lang !== 'string' || !lang.trim()) return 'en';
  const code = lang.trim().toLowerCase().split('-')[0]; // handle e.g. "he-IL"
  return SUPPORTED_LANG_CODES.has(code) ? code : 'en';
}

// ─── Failsafes (all languages) ───────────────────────────────────────────────

const FAILSAFE = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע?',
  en: "I'm here with you. What's on your mind right now?",
  es: 'Estoy aquí contigo. ¿Qué está en tu mente ahora mismo?',
  fr: "Je suis là pour toi. Qu'est-ce qui te préoccupe en ce moment?",
  de: 'Ich bin hier für dich. Was beschäftigt dich gerade?',
  it: 'Sono qui con te. Cosa hai in mente in questo momento?',
  pt: 'Estou aqui com você. O que está em sua mente agora?',
};

function getFailsafe(lang) {
  return FAILSAFE[lang] || FAILSAFE['en'];
}

// ─── Secondary language quality floor (Component F) ──────────────────────────

const SECONDARY_LANG_REWRITES = {
  es: [
    'Da un paso concreto ahora: elige una acción pequeña que puedas completar en los próximos diez minutos.',
    'Escribe en una oración qué es lo que más te pesa ahora mismo. Eso es tu próximo paso.',
    'Haz una respiración lenta y elige una sola cosa que puedas hacer hoy. Hazla.',
  ],
  fr: [
    'Fais une seule chose concrète maintenant — quelque chose que tu peux finir en dix minutes.',
    'Écris en une phrase ce qui te pèse le plus. C\'est ton prochain pas.',
    'Prends une respiration lente et choisis une seule action pour aujourd\'hui. Fais-la.',
  ],
  de: [
    'Mach jetzt einen einzigen konkreten Schritt — etwas, das du in zehn Minuten abschließen kannst.',
    'Schreib in einem Satz auf, was dich gerade am meisten belastet. Das ist dein nächster Schritt.',
    'Atme einmal tief durch und wähle eine einzige Sache für heute. Tu sie.',
  ],
  it: [
    'Fai un solo passo concreto adesso — qualcosa che puoi finire in dieci minuti.',
    'Scrivi in una frase ciò che ti pesa di più in questo momento. È il tuo prossimo passo.',
    'Fai un respiro lento e scegli una sola cosa da fare oggi. Falla.',
  ],
  pt: [
    'Dê um passo concreto agora — algo que você possa concluir em dez minutos.',
    'Escreva em uma frase o que mais te pesa agora. Esse é o seu próximo passo.',
    'Respire fundo e escolha uma única coisa para fazer hoje. Faça isso.',
  ],
};

let _secondaryLangIndex = 0;
function pickSecondaryLangRewrite(lang) {
  const arr = SECONDARY_LANG_REWRITES[lang];
  if (!arr) return getFailsafe(lang);
  const pick = arr[_secondaryLangIndex % arr.length];
  _secondaryLangIndex++;
  return pick;
}

// ─── Language contamination detector (Component F) ───────────────────────────

const LANG_SCRIPT_TESTS = {
  he: /[\u05D0-\u05EA]/,
  ar: /[\u0600-\u06FF]/,
  zh: /[\u4E00-\u9FFF]/,
  ja: /[\u3040-\u30FF]/,
  ru: /[\u0400-\u04FF]/,
};

const LATIN_LANG_MARKERS = {
  es: /\b(el|la|los|las|que|está|con|para|por|una|muy|pero|como|cuando)\b/gi,
  fr: /\b(le|la|les|est|avec|que|pour|dans|sur|une|mais|comme|quand|très)\b/gi,
  de: /\b(der|die|das|ist|und|mit|für|in|auf|ein|aber|wenn|sehr|auch)\b/gi,
  it: /\b(il|la|le|gli|che|è|con|per|una|molto|ma|come|quando|anche)\b/gi,
  pt: /\b(o|a|os|as|que|está|com|para|por|uma|muito|mas|como|quando)\b/gi,
  en: /\b(the|is|are|was|were|and|with|for|you|your|that|this|have|will|can|not)\b/gi,
};

function hasLanguageContamination(text, lang) {
  if (!text || !lang) return false;

  // Script-based: Hebrew in non-Hebrew session or vice versa
  const textHasHebrew = LANG_SCRIPT_TESTS.he.test(text);
  if (lang !== 'he' && textHasHebrew) return true;
  if (lang === 'he' && !textHasHebrew && text.length > 20) {
    // Hebrew session with no Hebrew at all — likely contamination
    const hasLatin = /[a-zA-Z]{3,}/.test(text);
    if (hasLatin && text.replace(/[a-zA-Z\s]/g, '').length < 5) return true;
  }

  // Latin script: detect markers from a DIFFERENT language with high confidence.
  // IMPORTANT: Skip cross-checks between closely-related Romance language pairs
  // (PT↔ES, IT↔ES) — they share so much high-frequency vocabulary that the marker
  // counts are unreliable and will produce false-positive "contamination" signals
  // on genuinely correct output.  The detectLanguage() ordering above is the
  // authoritative disambiguation for these pairs.
  const LATIN_CONTAMINATION_SKIP = new Set(['pt-es', 'es-pt', 'it-es', 'es-it']);
  if (['es', 'fr', 'de', 'it', 'pt', 'en'].includes(lang)) {
    for (const [otherLang, re] of Object.entries(LATIN_LANG_MARKERS)) {
      if (otherLang === lang) continue;
      if (LATIN_CONTAMINATION_SKIP.has(`${lang}-${otherLang}`)) continue;
      const otherMatches = (text.match(re) || []).length;
      const ownMatches = (text.match(LATIN_LANG_MARKERS[lang]) || []).length;
      if (otherMatches >= 5 && otherMatches > ownMatches * 2) return true;
    }
  }

  return false;
}

// ─── Ask-back / worksheet-drift patterns ────────────────────────────────────

const ASK_BACK_LINE_PATTERNS = [
  // English ask-back
  /what do you think\??$/i,
  /what are your thoughts\??$/i,
  /does (?:this|that) feel (?:possible|manageable|right|okay)\??$/i,
  /does (?:this|that) sound (?:possible|manageable|right|okay)\??$/i,
  /would you (?:like|be willing) to try\??$/i,
  /which (?:option|one) feels (?:right|best|most right)\??$/i,
  /what would (?:feel|be) most helpful\??$/i,
  /(?:it's|it is) (?:really )?up to you\.?$/i,
  /would (?:it be okay|you be open) (?:if|to)\b/i,
  /how does that sound\??$/i,
  /where (?:would you like|should we) (?:start|begin)\??$/i,
  /what (?:would you like|do you want) to (?:work on|focus on)\??$/i,
  /(?:shall|should) we\b.*\?$/i,
  /can you (?:tell me more|describe|walk me through|share more)\b/i,
  /tell me more about\b/i,
  /help me understand\b/i,
  /what (?:specific|exactly)\b.*\?$/i,
  /what (?:were you|happened|made you)\b.*\?$/i,

  // Worksheet openers
  /^evidence[- ]for\s*:/i,
  /^evidence[- ]against\s*:/i,
  /^automatic thought\s*:/i,
  /^balanced thought\s*:/i,
  /^situation\s*:/i,
  /rate your belief\b/i,
  /on a scale of \d/i,
  /how strongly do you believe\b/i,
  /belief rating\b/i,

  // Hebrew ask-back
  /מה (?:את|אתה) חושב(?:ת)?\??$/,
  /האם זה (?:מרגיש|נראה) (?:אפשרי|ניהולי|נכון)\??$/,
  /האם תרצ(?:ה|י) לנסות\??$/,
  /מה הייתה מעדיפ(?:ה|)?\??$/,
  /זה תלוי בך\.?$/,
  /תספר(?:י)? לי יותר\b/,
  /מה בדיוק\b.*\?$/,
  /מה הכי (?:יעזור|ירגיש נכון)\??$/,
  /מאיפה (?:כדאי|נתחיל)\??$/,

  // Spanish ask-back
  /qué (?:te parece|piensas|opinas)\??$/i,
  /te (?:gustaría|animas a) intentar\??$/i,
  /depende de ti\.?$/i,
  /por dónde (?:quieres|vamos a) empezar\??$/i,
  /qué (?:crees|sientes|preferirías)\??$/i,

  // French ask-back
  /qu['']est-ce que tu en penses\??$/i,
  /c['']est toi qui décides\.?$/i,
  /par où (?:veux-tu|on) commencer\??$/i,
  /qu['']est-ce qui te semblerait le plus (?:utile|adapté|juste)\??$/i,

  // German ask-back
  /was denkst du\??$/i,
  /das liegt bei dir\.?$/i,
  /wo (?:sollen|willst du) (?:wir )?anfangen\??$/i,
  /was (?:wäre|würde) dir am (?:meisten|besten) helfen\??$/i,

  // Italian ask-back
  /cosa ne pensi\??$/i,
  /dipende da te\.?$/i,
  /da dove (?:vuoi|vogliamo) cominciare\??$/i,

  // Portuguese ask-back
  /o que (?:você acha|pensa)\??$/i,
  /depende de você\.?$/i,
  /por onde (?:quer|vamos) começar\??$/i,
];

// ─── Session-type routing compression patterns ───────────────────────────────

const WORKSHEET_BLOCK_PATTERNS = [
  /^evidence[- ]for\s*:/im,
  /^evidence[- ]against\s*:/im,
  /^automatic thought\s*:/im,
  /^balanced thought\s*:/im,
  /^belief rating\s*:/im,
  /^situation\s*:\s+/im,
];

const ROUTING_COMPRESSION_PATTERNS = [
  /\bThis (?:is a|looks like|seems like) (?:a |an )?(?:WORK_TASK|DRIVING|SOCIAL|WORRY|SLEEP|PANIC|EXAM|GENERAL|MOOD) (?:domain|scenario|session|path)\b/i,
  /\bI(?:'ll| will) (?:route|classify|apply|use) (?:the |this )?(?:WORK_TASK|DRIVING|SOCIAL|WORRY|SLEEP|PANIC)/i,
  /\b(?:LOCKED_DOMAIN|LOCKED DOMAIN)\s*[:=]\s*\[?\w+\]?/i,
  /\bDomain\s*[:=]\s*\[?\w+\]?/i,
];

// ─── Hebrew semantic anti-worksheet system ───────────────────────────────────

const HE_LONGTERM_NEXT_STEP_SIGNALS = [
  /(?:מה\s+השלב\s+הבא|שלב\s+הבא\s+הוא|הצעד\s+הבא)/,
  /(?:לאורך\s+זמן|לטווח\s+(?:ארוך|רחוק)|בטווח\s+(?:הארוך|הרחוק))/,
  /(?:כלי\s+(?:קבוע|יומיומי|קבועים)|להמשיך\s+(?:לאורך|מעבר|הלאה))/,
];

const HE_LONGTERM_HOMEWORK_BANS = [
  /(?:רשום|רשמי|תרשום|תרשמי)\s+(?:במשך\s+(?:כמה|\d+)\s+(?:ימים|שבועות))/,
  /(?:התאריך\s+(?:וה)?(?:שעה|זמן)|שעה\s+(?:וה)?תאריך)/,
  /(?:מה\s+עשית\s+(?:באותו|ברגע|לפני))/,
  /(?:(?:מה|כמה)\s+(?:הייתה|הייתה\s+ה)(?:רמת|עוצמת|רמה\s+של))/,
  /(?:יומן\s+(?:תסמינים|מעקב|רגשות|כאב|לחץ|חרדה))/,
  /(?:לתעד|תיעוד)\s+(?:כל|את\s+ה)\s*(?:תסמין|תסמינים|פרק|פרקים)/,
  /(?:טבלה|תבנית|טופס)\s+(?:מעקב|ניטור|יומי)/,
  /(?:לשים\s+לב\s+ל)(?:תדירות|כמות|רמה|עוצמה)\s+(?:ואז\s+)?(?:לרשום|לתעד|לסמן)/,
  /(?:סולם|סקאלה|דירוג)\s+(?:של|עוצמה|תסמינים)/,
  /(?:\d+\s*-\s*\d+|אפס\s+עד\s+עשר?)\s+(?:כדי\s+)?(?:לדרג|למדוד|לבדוק)/,
];

const HE_WORKSHEET_SEMANTIC_SIGNALS = [
  /\d{1,3}\s*[-–]\s*\d{1,3}/,
  /(?:דרג|דרגי|ציון|אחוז|מ-?\d+\s+עד\s+\d+)/,
  /(?:כמה\s+(?:אתה|את)\s+(?:מאמינ|מרגיש))/,
  /(?:רמת\s+(?:האמונה|הביטחון|החרדה|הלחץ))/,
  /(?:על\s+סקלה\s+של)/,
  /(?:ראיות\s+(?:בעד|נגד|לכך|לטובת))/,
  /(?:מה\s+(?:הראיות|העדויות|הסיבות|הסיבה))/,
  /(?:מה\s+(?:מצביע|מלמד|מוכיח))/,
  /(?:ראיה\s+ש)/,
  /(?:(?:רשום|כתוב|תעד)\s+(?:בכל\s+פעם|כל\s+פעם\s+ש|מתי\s+ש))/,
  /(?:(?:שעה|מתי|מה\s+קרה\s+לפני)\s*[\/,]\s*(?:שעה|מה\s+קרה|איפה\s+בגוף))/,
  /(?:יומן\s+(?:מעקב|רגשות|מחשבות|לחץ))/,
  /(?:מעקב\s+(?:עצמי|יומי|שבועי))/,
  /(?:ניטור\s+(?:עצמי|מחשבות))/,
  /(?:לאורך\s+(?:שבוע|שבועיים|חודש)\s+(?:הבא|הקרוב))/,
  /(?:בימים|בשבועות|בחודשים)\s+(?:הבאים|הקרובים)/,
  /(?:להמשיך\s+(?:לשים\s+לב|להתבונן|לעקוב|לפתח))/,
  /(?:לשים\s+לב\s+(?:מתי|לאיך|לכך\s+ש|כש))/,
  /(?:אפשרות\s+(?:א|ב|ג|1|2|3))/,
  /(?:^[1-3]\.\s+(?:לנשום|לרשום|לעשות|לנסות|לבחן))/m,
  /(?:בוא\s+(?:נבין|נמפה|נזהה|נבדוק|נחקור)\s+(?:את\s+)?ה(?:דפוס|מחשבה|רגשות|קשר|מתי))/,
  /(?:מה\s+(?:הטריגר|הגורם|קרה\s+לפני|קדם\s+ל))/,
  /(?:איזה\s+(?:מחשבה\s+אוטומטית|דפוס\s+חשיבה))/,
  /\?[\s\u200f]*$/,
];

const HE_EMAIL_SIGNALS = /(?:מייל|אימייל|תיבת\s+(?:הדואר|דואר)|הודעה\s+(?:שלא\s+)?(?:ענית|השבת|טיפלת)|לא\s+(?:הגבת|ענית|השבת))/;
const HE_DISAPPROVAL_SIGNALS = /(?:למה\s+לא\s+(?:ענית|חזרת|הגבת)|מה\s+יגידו|מה\s+(?:יחשבו|יאמרו|ידעו)|אכזב|אכזבתי|כישלת|כישלון|לא\s+מספיק|(?:לא\s+)?עמדתי\s+בציפיות)/;
const HE_DISTRESS_SIGNALS = /(?:כובד|כבדות|לחץ|חרדה|מחנק|חזה|גוף|נשימה|עייפות|ריקנות|כאב|פחד)/;

const HE_EMAIL_REWRITES = [
  'בפעם הבאה שהלחץ סביב המיילים עולה, פתח מייל אחד בלבד ובדוק אם הוא באמת דורש מענה מיידי. עצור אחרי מייל אחד.',
  'בחר עכשיו מייל אחד שממתין. קרא אותו בלבד ובדוק: האם הוא דחוף כרגע? סיים בתשובה של משפט אחד או בדחייה מודעת ל-30 דקות.',
  'פתח את תיבת הדואר ובחר מייל אחד בלבד לטפל בו עכשיו. אחד, לא יותר. שאר המיילים יחכו.',
];

const HE_DISAPPROVAL_REWRITES = [
  'רשום עכשיו משפט אחד בלבד: "יש מיילים שמחכים, וזה לא אומר שאני נכשל." ואז פתח מייל אחד בלבד וענה עליו.',
  'קח 60 שניות ועשה בדיקת מציאות אחת: אנשים שלא מגיבים מיד לעיתים קרובות מגיבים מאוחר יותר בלי שאף אחד שם לב. שלח מייל אחד עכשיו בלי להתנצל.',
  'בפעם הבאה שהמחשבה "למה לא חזרתי" עולה, עשה פעולה אחת בלבד: שלח מייל קצר עם "אחזור אליך בקרוב." זה מספיק.',
];

const HE_DISTRESS_REWRITES = [
  'שים יד על החזה, קח שלוש נשימות איטיות לבטן. אחרי הנשימה השלישית, בחר פעולה אחת קטנה לעשות עכשיו.',
  'עצור לרגע, הנח את הידיים, וקח נשימה אחת ארוכה. אחר כך, כתוב דבר אחד בלבד שאתה יכול לעשות בעשר הדקות הקרובות.',
  'שים לב לאיפה הכובד יושב בגוף. נשום לתוכו פעמיים. ואז בחר פעולה אחת קטנה שאפשר לסיים בפחות מחמש דקות.',
];

const HE_LONGTERM_DISTRESS_REWRITES = [
  'בפעם הבאה שהמועקה עולה, עצור לדקה אחת ועשה שוב את אותו תרגיל קרקוע לפני שאתה ממשיך במה שעשית. זה הצעד הבא להיום.',
  'הצעד הבא הוא לשמור את תרגיל הקרקוע הזה ככלי קבוע: בפעם הבאה שהמועקה מתחילה, השתמש בו מיד לפני כל ניסיון להבין למה זה קורה.',
  'בחר היום רגע אחד שבו אתה בודק את הגוף שלך לדקה בלי לשנות כלום — רק לשים לב לנשימה ולמתח בכתפיים. עצור אחרי דקה.',
];

const HE_POST_LEARNING_REWRITES = [
  'טוב — עשה עוד חזרה אחת על אותו צעד היום, באותו מצב. חיזוק, לא ניתוח.',
  'ההתקדמות אמיתית. הצעד הבא הוא חזרה אחת קטנה על מה שעבד — לא תוכנית גדולה יותר.',
  'בנה על זה ידי לעשות את אותה פעולה עוד פעם אחת השבוע. חזרה אחת. עצור שם.',
];

const HE_POST_LEARNING_SIGNALS = /(?:האמונה.{0,15}(?:עלתה|ירדה|השתנתה|עלה)|עזר\s+(?:קצת|מעט|לי)|הרגשת(?:י|\s+)(?:טוב\s+יותר|פחות|שיפור|הקלה)|זה\s+(?:עבד|עזר|הצליח)|ניסיתי\s+(?:את\s+ז|ו|ה)|עשיתי\s+(?:את\s+ז|ו|ה)|השלמתי\s+|פחות\s+(?:חרדה|לחץ|דאגה)\s+מ|\d+%|(?:עלייה|ירידה)\s*(?:ל|ב)\s*\d|הקלה\s+(?:שה|ש|כ|לאחר)|קפיצה\s+בדופק|עדכון\s+שגרתי)/;

const HE_POST_LEARNING_EMAIL_REWRITES = [
  'יפה. פתח עכשיו עוד מייל אחד בלבד ובדוק אם גם שם המציאות פחות מאיימת מהתחזית. עצור אחרי מייל אחד.',
  'הצעד הבא הוא לחזור על אותו מהלך עם מייל אחד נוסף בלבד. סיים אחרי שבדקת מייל אחד.',
  'פתח מייל אחד נוסף ובדוק: האם גם שם הפחד לפני ואחרי שונה? עצור אחרי מייל אחד.',
];

let _heRewriteIndex = 0;
function pickHeRewrite(arr) {
  const pick = arr[_heRewriteIndex % arr.length];
  _heRewriteIndex++;
  return pick;
}

function detectHebrewLongtermHomeworkDrift(text) {
  const asksForNext = HE_LONGTERM_NEXT_STEP_SIGNALS.some(p => p.test(text));
  if (!asksForNext) return false;
  return HE_LONGTERM_HOMEWORK_BANS.some(p => p.test(text));
}

function detectHebrewWorksheetDriftSemantic(text) {
  let signalCount = 0;
  for (const pattern of HE_WORKSHEET_SEMANTIC_SIGNALS) {
    // Skip the trailing-question-mark pattern (last entry) — it is too broad
    // and fires on any Hebrew response that ends with a legitimate question.
    if (pattern.source === '\\?[\\s\\u200f]*$') continue;
    if (pattern.test(text)) {
      signalCount++;
      if (signalCount >= 3) return true; // raised from 2 → 3
    }
  }
  return false;
}

function classifyHebrewContext(text) {
  if (detectHebrewLongtermHomeworkDrift(text)) return 'longterm_distress';
  if (HE_LONGTERM_NEXT_STEP_SIGNALS.some(p => p.test(text))) return 'longterm_distress';
  if (HE_POST_LEARNING_SIGNALS.test(text)) {
    if (HE_EMAIL_SIGNALS.test(text)) return 'post_learning_email';
    return 'post_learning';
  }
  if (HE_EMAIL_SIGNALS.test(text)) return 'email';
  if (HE_DISAPPROVAL_SIGNALS.test(text)) return 'disapproval';
  if (HE_DISTRESS_SIGNALS.test(text)) return 'distress';
  return 'distress';
}

function applyHebrewSemanticAntiWorksheet(text) {
  if (!detectHebrewWorksheetDriftSemantic(text)) return text;
  console.warn('[CP12-HE] Semantic worksheet drift — directive rewrite');
  const context = classifyHebrewContext(text);
  if (context === 'longterm_distress') return pickHeRewrite(HE_LONGTERM_DISTRESS_REWRITES);
  if (context === 'post_learning_email') return pickHeRewrite(HE_POST_LEARNING_EMAIL_REWRITES);
  if (context === 'post_learning') return pickHeRewrite(HE_POST_LEARNING_REWRITES);
  if (context === 'email') return pickHeRewrite(HE_EMAIL_REWRITES);
  if (context === 'disapproval') return pickHeRewrite(HE_DISAPPROVAL_REWRITES);
  return pickHeRewrite(HE_DISTRESS_REWRITES);
}

// ─── English CP13-EN reflection trap system ──────────────────────────────────

const EN_REFLECTION_TRAP_SIGNALS = [
  /for the next (few|\d+) days?,?\s+(write|note|record|track|log)/i,
  /over the next (week|few days?|couple of days?)/i,
  /keep a (log|journal|record|diary|note)/i,
  /track (this|that|it|your|the) (over|for|across)/i,
  /daily (log|record|tracking|check.in)/i,
  /notice (when|how|what|if) (it|this|the feeling|anxiety|that feeling).{0,40}(comes? up|happen|occur|trigger|arise)/i,
  /(observe|monitor|watch for) (the )?(pattern|trigger|sensation|feeling|moment when)/i,
  /mood (entry|log|tracking|journal|record)/i,
  /how (often|frequently) (this|it|that|the feeling|these) (happens?|occurs?|comes? up|hits?)/i,
  /evidence (for|against|that supports|that contradicts)/i,
  /what (is the )?evidence (for|against|that)/i,
  /evidence-based thought/i,
  /evidence (column|list|side)/i,
  /balanced (thought|perspective|view|alternative)/i,
  /more balanced (thought|way of thinking|view)/i,
  /alternative (thought|perspective|interpretation)/i,
  /reframe (the thought|that thought|this thought)/i,
  /rate (your|this|that) belief/i,
  /on a scale of (0|1) (to|-) (10|100)/i,
  /belief rating/i,
  /how strongly do you believe/i,
  /rate (the|your) (thought|feeling|emotion|belief) (from|on|between)/i,
  /(all.or.nothing|catastrophi[sz]|overgenerali[sz]|mind reading|fortune.telling|personali[sz]|should.statement|magnif|minimiz|emotional reasoning|labeling|mental filter)/i,
  /cognitive distortion/i,
  /thinking (error|pattern|trap|style)/i,
  /distorted (thinking|thought|pattern)/i,
  /should.statement/i,
  /(the word |using )("should"|'should'|should)/i,
  /replace.{0,20}"should"/i,
  /challenge.{0,30}should/i,
  /map (out|the) (pattern|cycle|triggers)/i,
  /identify (the )?triggers? (for|of|behind)/i,
  /automatic thought (record|worksheet|log)/i,
  /thought (record|diary|log|worksheet)/i,
  /name (the |your )?(exact |specific |automatic )?thought/i,
  /what (is|was) (the |your )?automatic thought/i,
  /can you (name|identify|describe|tell me) (the |your |what|which)/i,
  /let.s (explore|understand|unpack|look at) (that|this|why|what)/i,
  /tell me more about (that|this|what|how|why)/i,
];

// ─── Secondary language worksheet / reflection-trap signals (Component F) ────

const SECONDARY_LANG_WORKSHEET_SIGNALS = {
  es: [
    /evidencia\s+(?:a\s+favor|en\s+contra)/i,
    /pensamiento\s+(?:autom[aá]tico|equilibrado|alternativo)/i,
    /distorsi[oó]n\s+cognitiva/i,
    /reestructuraci[oó]n\s+cognitiva/i,
    /en\s+una\s+escala\s+del?\s+\d/i,
    /nivel\s+de\s+creencia/i,
    /di(?:a|á)rio\s+de\s+(?:pensamientos|emociones|estado|[aá]nimo|seguimiento)/i,
    /registro\s+de\s+pensamientos/i,
    /tarea\s+(?:para\s+casa|de\s+casa|conductual)/i,
    /mapa\s+(?:del|de)\s+(?:patr[oó]n|ciclo)/i,
    /identifica(?:r|mos)\s+(?:el\s+)?pensamiento\s+autom[aá]tico/i,
  ],
  fr: [
    /preuves?\s+(?:pour|contre)/i,
    /pens[eé]e\s+automatique/i,
    /distorsion\s+cognitive/i,
    /restructuration\s+cognitive/i,
    /sur\s+une\s+[eé]chelle\s+de\s+\d/i,
    /niveau\s+de\s+croyance/i,
    /journal\s+(?:de\s+pens[eé]es|[eé]motionnel|d'humeur|de\s+suivi)/i,
    /registre\s+de\s+pens[eé]es/i,
    /t[âa]che\s+(?:comportementale|[àa]\s+faire)/i,
    /pens[eé]e\s+(?:[eé]quilibr[eé]e|alternative)/i,
    /identifier\s+(?:la\s+)?pens[eé]e\s+automatique/i,
  ],
  de: [
    /Beweise?\s+(?:daf[üu]r|dagegen)/i,
    /automatischer?\s+Gedanke/i,
    /kognitive\s+Verzerrung/i,
    /kognitive\s+Umstrukturierung/i,
    /auf\s+einer\s+Skala\s+von\s+\d/i,
    /[Üü]berzeugungsst[äa]rke/i,
    /Tagebuch\s+(?:der\s+Gedanken|der\s+Emotionen|der\s+Stimmung)/i,
    /Gedankenprotokoll/i,
    /ausgewogener?\s+Gedanke/i,
    /alternativer?\s+Gedanke/i,
    /Hausaufgabe/i,
    /automatischen\s+Gedanken\s+identifizieren/i,
  ],
  it: [
    /prove?\s+a\s+favore/i,
    /prove?\s+contro/i,
    /pensiero\s+automatico/i,
    /distorsione\s+cognitiva/i,
    /ristrutturazione\s+cognitiva/i,
    /su\s+una\s+scala\s+da\s+\d/i,
    /livello\s+di\s+credenza/i,
    /diario\s+(?:dei\s+pensieri|delle\s+emozioni|dell'umore)/i,
    /pensiero\s+(?:equilibrato|alternativo)/i,
    /identificare\s+il\s+pensiero\s+automatico/i,
  ],
  pt: [
    /evid[eê]ncias?\s+a\s+favor/i,
    /evid[eê]ncias?\s+contra/i,
    /pensamento\s+autom[aá]tico/i,
    /distor[cç][aã]o\s+cognitiva/i,
    /reestrutura[cç][aã]o\s+cognitiva/i,
    /em\s+uma\s+escala\s+de\s+\d/i,
    /n[ií]vel\s+de\s+cren[cç]a/i,
    /di[aá]rio\s+(?:de\s+pensamentos|emocional|de\s+humor|de\s+acompanhamento)/i,
    /pensamento\s+(?:equilibrado|alternativo)/i,
    /identificar\s+o\s+pensamento\s+autom[aá]tico/i,
  ],
};

function countSecondaryLangWorksheetSignals(text, lang) {
  const signals = SECONDARY_LANG_WORKSHEET_SIGNALS[lang];
  if (!signals) return 0;
  let count = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) count++;
  }
  return count;
}

// ─── Secondary language social-anxiety / exploration-first signals (Component F) ─

const SECONDARY_LANG_SOCIAL_ANXIETY_SIGNALS = {
  es: [
    /\b(vamos\s+a\s+explorar|exploremos)\b/i,
    /\bprimero[,\s]+(entend(?:er|amos)|comprender|identif(?:icar|iquemos))\b/i,
    /\bes\s+importante\s+(entender|explorar|identificar|analizar)\b/i,
    /\bla\s+ansiedad\s+social\s+(surge|ocurre|aparece|es\s+causada|viene|est[aá]\s+relacionada)\b/i,
    /\b(cu[eé]ntame|expl[ií]came|descr[ií]beme)\s+(m[aá]s|un\s+poco)\s+(sobre|acerca)\b/i,
    /\bantes\s+de\s+(nada|empezar)[,\s]+(me\s+gustar[ií]a|quisiera)\s+(entender|saber)\b/i,
    /\b(entendamos|comprendamos)\s+(primero|juntos|mejor)\s+(por\s+qu[eé]|qu[eé]|c[oó]mo)\b/i,
  ],
  fr: [
    /\b(explorons|allons\s+explorer|nous\s+allons\s+explorer)\b/i,
    /\bd'abord[,\s]+(comprenons|essayons\s+de\s+comprendre|il\s+(?:faut|est\s+important\s+de)\s+comprendre)\b/i,
    /\bil\s+est\s+important\s+(?:de|d['\u2019])(explorer|comprendre|identifier|analyser)\b/i,
    /\bl['\u2019]anxi[eé]t[eé]\s+sociale\s+(survient|appara[iî]t|se\s+manifeste|est\s+li[eé]e|provient)\b/i,
    /\b(dis-moi|explique-moi|raconte-moi)\s+(plus|davantage)\s+(sur|[àa]\s+propos)\b/i,
    /\bavant\s+(?:tout|de\s+commencer)[,\s]+j['\u2019]aimerais\s+(comprendre|savoir)\b/i,
    /\b(comprenons|essayons\s+de\s+comprendre)\s+(ensemble|d'abord|pourquoi|ce\s+qui)\b/i,
  ],
  de: [
    /\b(lass\s+uns\s+erkunden|erkunden\s+wir|wir\s+(?:k[oö]nnen|sollten)\s+erkunden)\b/i,
    /\bzuerst[,\s]+(lass\s+uns\s+|m[uü]ssen\s+wir\s+)?(verstehen|herausfinden|identifizieren)\b/i,
    /\bes\s+ist\s+wichtig[,\s]+(zu\s+)?(verstehen|erkunden|identifizieren|analysieren)\b/i,
    /\bsoziale\s+Angst\s+(entsteht|tritt\s+auf|kommt\s+(?:von|aus)|h[aä]ngt\s+zusammen)\b/i,
    /\b(erz[aä]hl\s+mir|erkl[aä]re\s+mir|beschreib\s+mir)\s+mehr\s+([uü]ber|dazu)\b/i,
    /\bbevor\s+wir\s+(weitermachen|beginnen)[,\s]+(?:w[uü]rde\s+ich|m[oö]chte\s+ich)\s+(verstehen|wissen)\b/i,
    /\b(verstehen\s+wir|versuchen\s+wir\s+zu\s+verstehen)\s+(zun[aä]chst|gemeinsam|warum|was)\b/i,
  ],
  it: [
    /\b(esploriamo|andiamo\s+a\s+esplorare)\b/i,
    /\bprima\s+(?:di\s+tutto[,\s]+|di\s+procedere[,\s]+)?(capiamo|cerchiamo\s+di\s+capire|identifichiamo)\b/i,
    /\b[eè]\s+importante\s+(capire|esplorare|identificare|analizzare)\b/i,
    /\bl['\u2019]ansia\s+sociale\s+(nasce|sorge|si\s+manifesta|[eè]\s+legata|deriva)\b/i,
    /\b(raccontami|spiegami|descrivimi)\s+(?:di\s+)?pi[uù]\s+(di|su|riguardo)\b/i,
    /\bprima\s+di\s+(tutto|procedere|andare\s+avanti)[,\s]+(?:vorrei|voglio)\s+(capire|sapere)\b/i,
    /\b(capiamo|cerchiamo\s+di\s+capire)\s+(insieme|prima|perch[eé]|cosa|come)\b/i,
  ],
  pt: [
    /\b(vamos\s+explorar|exploremos)\b/i,
    /\bprimeiro[,\s]+(vamos\s+|precisamos\s+)?(entender|compreender|identificar)\b/i,
    /\b[eé]\s+importante\s+(entender|explorar|identificar|analisar|compreender)\b/i,
    /\ba\s+ansiedade\s+social\s+(surge|ocorre|aparece|[eé]\s+causada|vem\s+de|est[aá]\s+relacionada)\b/i,
    /\b(me\s+conte|me\s+explique|me\s+descreva)\s+mais\s+(sobre|acerca)\b/i,
    /\bantes\s+de\s+(tudo|come[cç]ar)[,\s]+(?:eu\s+gostaria|gostaria)\s+(entender|saber)\b/i,
    /\b(entendamos|vamos\s+entender|precisamos\s+entender)\s+(juntos|primeiro|por\s+que|o\s+que)\b/i,
  ],
};

function countSecondaryLangSocialAnxietySignals(text, lang) {
  const signals = SECONDARY_LANG_SOCIAL_ANXIETY_SIGNALS[lang];
  if (!signals) return 0;
  let count = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) count++;
  }
  return count;
}

const EN_POST_LEARNING_SIGNALS = /(belief.{0,10}(rose|went up|increased|went from|changed)|helped a bit|felt better|worked a little|it worked|that helped|more confident|less anxious than|less worried than|did (the|it|that)|completed (it|the)|followed (through|up)|tried (it|that|the)|\d+%|relief (after|when|once)|belief (rose|climbed|increased|jumped))/i;

const EN_EMAIL_SIGNALS = /(email|inbox|reply|message|boss|professor|manager|colleague|unread|unanswered)/i;
const EN_DISAPPROVAL_SIGNALS = /(disappoint|let.{0,5}(them|him|her|people|everyone) down|what (will|would|do) (they|people|everyone) think|judg(e|ing|ment)|fail(ed|ing|ure)|not good enough|expectations|letting people|gotten back (to me|to you|to them)|why haven.t (you|I) (replied|gotten|responded)|why didn.t (you|I)|haven.t replied|late (reply|response|getting back)|behind on (emails?|messages?|replies?)|fear of (disappointing|letting|what))/i;
const EN_HEAVINESS_SIGNALS = /(heaviness|heavy|weight (in|on|around)|tightness|chest|body|breathing|numb|hollow|empty|exhausted|drained|overwhelm)/i;

const EN_EMAIL_REWRITES = [
  'Open one email now — just one — and write the first sentence of a reply. Done when that sentence exists.',
  'Pick the email that feels most overdue. Open it. Write two sentences. Close the tab.',
  'Open your inbox now and handle one email only: either reply in one sentence or mark it for a specific time tomorrow. Stop after one.',
];
const EN_DISAPPROVAL_REWRITES = [
  "Choose one non-urgent email and delay your reply by 30 minutes. Start the timer now. Done when it's running.",
  "Send one short holding reply: \"Got it, I'll get back to you soon.\" Stop after sending that one line.",
  'Pick one email you\'ve been avoiding. Open it. Either reply in one sentence or mark it for a specific time tomorrow. Stop after one.',
];
const EN_HEAVINESS_REWRITES = [
  'Place one hand on your chest. Take three slow breaths into your belly. After the third, pick one small thing you can do in the next ten minutes.',
  'Stop for a moment. Notice where the heaviness sits in your body. Breathe toward it twice. Then choose one action — small enough to finish before you next eat or drink anything.',
  'Name the one thing that feels most stuck right now. Write it down in one sentence. That sentence is your next action target.',
];
const EN_LONGTERM_REWRITES = [
  'The next step is to use the same grounding move the next time this feeling starts — before trying to understand it. One repetition, not a new plan.',
  "Next time this comes up, use what already worked today. One repeat of the same step. That's the assignment.",
  'Do the same thing you just did, one more time this week, in the same situation. Repetition before expansion.',
];
const EN_POST_LEARNING_REWRITES = [
  'Good — now do one more repetition of that same step today, in the same situation. Reinforcement, not analysis.',
  'That progress is real. The next move is one small repeat of what just worked — not a bigger plan.',
  'Build on that by doing the same action one more time this week. One repeat. Stop there.',
];
const EN_GENERIC_REWRITES = [
  "The next step is one small, concrete action on this — not a plan, not a worksheet. Pick the single smallest thing you can do today and do it.",
  'Pick one thing from what you just shared that you can act on in the next hour. One thing only. Do that.',
  'Take one concrete step on this today — something that creates a real-world trace. Write it, send it, or do it.',
];

let _enRewriteIndex = 0;
function pickEnRewrite(arr) {
  const pick = arr[_enRewriteIndex % arr.length];
  _enRewriteIndex++;
  return pick;
}

function countEnReflectionTrapSignals(text) {
  let count = 0;
  for (const pattern of EN_REFLECTION_TRAP_SIGNALS) {
    if (pattern.test(text)) count++;
  }
  // NOTE: do NOT add extra weight for question marks — therapeutic responses
  // legitimately contain questions as part of guided clinical work.
  return count;
}

function classifyEnglishContext(text) {
  if (/(next step|long.term|over time|going forward|from here|what now|what next|where do (we|I) go|what should (I|we) do now)/i.test(text)) return 'longterm';
  if (EN_POST_LEARNING_SIGNALS.test(text)) return 'post_learning';
  if (EN_EMAIL_SIGNALS.test(text)) return 'email';
  if (EN_DISAPPROVAL_SIGNALS.test(text)) return 'disapproval';
  if (EN_HEAVINESS_SIGNALS.test(text)) return 'heaviness';
  return 'generic';
}

function applyEnglishReflectionTrapPass(text) {
  const signalCount = countEnReflectionTrapSignals(text);
  // Raised from 2 → 5: a clinically-correct therapeutic response naturally
  // contains 2-4 of these patterns (evidence, balanced thought, notice when,
  // etc.). Firing at 2 was replacing entire good answers with canned rewrites.
  if (signalCount < 5) return text;
  console.warn('[CP13-EN] Reflection trap (' + signalCount + ' signals) — directive rewrite');
  const context = classifyEnglishContext(text);
  if (context === 'longterm') return pickEnRewrite(EN_LONGTERM_REWRITES);
  if (context === 'post_learning') return pickEnRewrite(EN_POST_LEARNING_REWRITES);
  if (context === 'email') return pickEnRewrite(EN_EMAIL_REWRITES);
  if (context === 'disapproval') return pickEnRewrite(EN_DISAPPROVAL_REWRITES);
  if (context === 'heaviness') return pickEnRewrite(EN_HEAVINESS_REWRITES);
  return pickEnRewrite(EN_GENERIC_REWRITES);
}

// ─── Post-learning compression (Component G) ─────────────────────────────────

const POST_LEARNING_SIGNALS_MULTILANG = [
  /(belief.{0,10}(rose|went up|increased|changed)|helped a bit|felt better|worked a little|it worked|that helped|more confident|less anxious|less worried|did (the|it|that)|completed (it|the)|followed (through|up)|tried (it|that|the)|\d+%|relief (after|when|once))/i,
  /(?:האמונה.{0,15}(?:עלתה|ירדה|השתנתה)|עזר\s+(?:קצת|מעט|לי)|הרגשתי\s+(?:טוב\s+יותר|שיפור|הקלה)|זה\s+(?:עבד|עזר)|ניסיתי|עשיתי|השלמתי|\d+%)/,
  /(funcionó|mejoró|me\s+ayudó|me\s+siento\s+mejor|lo\s+intenté|lo\s+hice|sí\s+pude|\d+%)/i,
  /(a\s+marché|m'a\s+aidé|je\s+me\s+sens\s+mieux|j'ai\s+essayé|j'ai\s+fait|\d+%)/i,
  /(hat\s+geholfen|fühle\s+mich\s+besser|habe\s+(?:es\s+)?versucht|habe\s+(?:es\s+)?gemacht|\d+%)/i,
  /(ha\s+funzionato|mi\s+ha\s+aiutato|mi\s+sento\s+meglio|ho\s+provato|l'ho\s+fatto|\d+%)/i,
  /(funcionou|me\s+ajudou|me\s+sinto\s+melhor|tentei|fiz|\d+%)/i,
];

function isPostLearningTurn(text) {
  return POST_LEARNING_SIGNALS_MULTILANG.some(p => p.test(text));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect the language of a text string.
 *
 * ORDERING RULES — must be strictly observed:
 *   1. Hebrew: script-level check first (unambiguous).
 *   2. German: umlauts (ä/ö/ü/ß) are unambiguous; fallback to paired keywords.
 *   3. Italian (pre-gate): anche/sono/questo are all-ASCII and absent from Spanish/PT.
 *      Must be checked BEFORE the extended-Latin gate so Italian text with no
 *      accented characters (e.g. "Sono qui con te.") is correctly identified.
 *   4. Extended-Latin gate (any accented char present):
 *      4a. French: je/nous/vous are absent from ES/PT/IT.
 *      4b. Italian: accented-char markers (però, perché) as a supplement.
 *      4c. Portuguese: MUST be checked before Spanish.  PT shares high-frequency
 *          words (que/está/para/por/como) with Spanish, so checking Spanish first
 *          causes all Portuguese responses to be misidentified as Spanish.
 *          PT-exclusive markers: você/também/não/são/então/isso/esse.
 *          JS \b word boundary does not work with non-ASCII chars (ê, ã, etc.);
 *          leading \b only is used where the word ends in a non-ASCII character.
 *      4d. Spanish: checked last.  Add 'estoy' (all-ASCII, appears in failsafe)
 *          so that the Spanish failsafe itself is correctly detected.
 *   5. Broader fallbacks for accented text with no exclusive markers.
 *   6. Default: English.
 */
export function detectLanguage(text) {
  if (!text) return 'en';

  // 1. Hebrew — Unicode script block (unambiguous)
  if (/[\u05D0-\u05EA]/.test(text)) return 'he';

  // 2. German — umlauts (ä/ö/ü/ß) are diagnostic; fallback to paired ASCII keywords
  if (/[äöüßÄÖÜ]/.test(text)) return 'de';
  if (/\b(der|die|das)\b/i.test(text) && /\b(und|f[üu]r|aber|auch|nicht)\b/i.test(text)) return 'de';

  // 3. Italian (pre-gate) — anche/sono/questo/questa are all-ASCII and absent from
  //    Spanish and Portuguese.  Must run before the extended-Latin gate because
  //    Italian therapy text often contains no accented characters at all.
  if (/\b(anche|sono|questo|questa|quello)\b/i.test(text)) return 'it';

  if (/[\u00C0-\u024F\u00A0-\u00FF]/.test(text)) {
    // 4a. French — je/nous/vous are absent from Spanish/Portuguese/Italian
    //     très ends in ASCII 's' so \b after 's' works correctly.
    //     c'est / j'ai: use .est/.ai to tolerate both straight and curly apostrophe.
    if (/\b(je|nous|vous)\b/i.test(text)) return 'fr';
    if (/\btr[eè]s\b/i.test(text) || /\bc.est\b/i.test(text) || /\bj.ai\b/i.test(text)) return 'fr';

    // 4b. Italian (extended-Latin supplement) — però/perché end in non-ASCII chars;
    //     JS \b fails after them so use pattern without trailing \b.
    if (/per[oò]/i.test(text) || /perch[eé]/i.test(text)) return 'it';

    // 4c. Portuguese — BEFORE Spanish.
    //     JS \b fails after non-ASCII chars (ê, ã).  Strategy per marker:
    //       \bvoc[eê]  — leading \b only; 'você' is unique enough without trailing \b
    //       tamb[eé]m  — 'm' at end is ASCII so \b works: /\btamb[eé]m\b/
    //       n[aã]o, s[aã]o, ent[aã]o — trailing 'o' is ASCII \w → \b after 'o' works
    //       isso, esse, essa, nosso, nossa — all-ASCII, normal \b ✓
    //     Additional PT-only all-ASCII markers (absent from Spanish):
    //       tudo, aqui, agora, fazer, poder, muito, nosso, mesmo, ainda, sempre
    //       combined with at least one other PT marker for disambiguation.
    if (
      /\bvoc[eê]/i.test(text) ||
      /\btamb[eé]m\b/i.test(text) ||
      /\bn[aã]o\b/i.test(text) ||
      /\bs[aã]o\b/i.test(text) ||
      /\bent[aã]o\b/i.test(text) ||
      /\bisso\b/i.test(text) ||
      /\besse\b/i.test(text) ||
      /\bessa\b/i.test(text) ||
      /\bnosso\b/i.test(text) ||
      /\bnossa\b/i.test(text) ||
      // PT-only ASCII pairs: 'tudo' + 'fazer', 'aqui' + 'agora', 'ainda' + 'sempre'
      (/\btudo\b/i.test(text) && /\bfazer\b/i.test(text)) ||
      (/\bainda\b/i.test(text) && /\bsempre\b/i.test(text)) ||
      (/\bprecisa\b/i.test(text) && /\bpoder\b/i.test(text))
    ) return 'pt';

    // 4d. Spanish — last among Romance languages.
    //     'estoy' is all-ASCII and present in the Spanish failsafe text.
    //     'está' ends in 'á' (non-ASCII); trailing \b unreliable — match without it.
    //     'aquí' ends in 'í' (non-ASCII); same approach.
    if (
      /\b(el|la|los|las|que|con|para|pero|estoy|muy|tienes?|vamos)\b/i.test(text) ||
      /\best[aá](?=[\s.,!?;:\u00BF\u00A1]|$)/i.test(text)
    ) return 'es';

    // 5. Broader fallbacks for accented text with no exclusive markers
    if (/\b(avec|une|mais|dans|sur|chez)\b/i.test(text)) return 'fr';
    if (/\b(della|dello|degli|alla|nelle)\b/i.test(text)) return 'it';
    if (/\bcom\b/i.test(text) && /\b(uma|muito|mas|aqui|agora)\b/i.test(text)) return 'pt';
  }

  return 'en';
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
}

function isAskBackLine(line) {
  const trimmed = line.trim();
  return ASK_BACK_LINE_PATTERNS.some(p => p.test(trimmed));
}

function hasWorksheetDrift(text) {
  return WORKSHEET_BLOCK_PATTERNS.some(p => p.test(text));
}

function stripTrailingAskBack(text) {
  const lines = text.split('\n');
  let i = lines.length - 1;
  let stripped = false;
  while (i >= 0) {
    const line = lines[i].trim();
    if (!line) { i--; continue; }
    if (isAskBackLine(line)) {
      console.warn('[CP12-B] Stripped ask-back line:', line.substring(0, 80));
      lines.splice(i, 1);
      stripped = true;
      i--;
    } else {
      break;
    }
  }
  if (!stripped) return text;
  return lines.join('\n').trim();
}

function stripWorksheetBlocks(text) {
  const lines = text.split('\n');
  const cleaned = lines.filter(line => {
    const trimmed = line.trim();
    if (WORKSHEET_BLOCK_PATTERNS.some(p => p.test(trimmed))) {
      console.warn('[CP12-D] Stripped worksheet line:', trimmed.substring(0, 80));
      return false;
    }
    return true;
  });
  return cleaned.join('\n').trim();
}

function stripRoutingLeakage(text) {
  const lines = text.split('\n');
  const cleaned = lines.filter(line => {
    if (ROUTING_COMPRESSION_PATTERNS.some(p => p.test(line))) {
      console.warn('[CP12-D] Stripped routing leakage:', line.substring(0, 80));
      return false;
    }
    return true;
  });
  return cleaned.join('\n').trim();
}

// ─── Locale quality corrections ──────────────────────────────────────────────

/**
 * Applies narrowly-scoped, deterministic corrections for verified output
 * defects. This must never paraphrase clinical content.
 */
export function applyLocaleQualityCorrections(text, lang) {
  if (typeof text !== 'string') return text;
  if (lang === 'de') {
    return text.replace(/\bWörgen\b/g, 'Worten');
  }
  return text;
}

// ─── Main Governor ───────────────────────────────────────────────────────────

/**
 * Apply the Final Output Governor (CP12 + Release Hardening Pack).
 *
 * @param {string} text - Raw assistant message content
 * @param {object} opts
 * @param {string} [opts.lang] - ISO language code locked at session start. AUTHORITATIVE — never auto-detected when provided.
 * @param {string} [opts.userMessage] - The triggering user message (for G: post-learning compression)
 * @returns {string} - Governed, user-safe content
 */
export function applyFinalOutputGovernor(text, opts = {}) {
  // Normalise the caller-supplied session language before any use.
  // An absent, empty, or unrecognised value fails safely to English — never Hebrew.
  const rawLang = opts.lang;
  const normalizedLang = rawLang !== undefined ? normalizeSessionLanguage(rawLang) : undefined;

  if (!text || typeof text !== 'string') return getFailsafe(normalizedLang || 'en');

  let result = text;
  // CRITICAL: normalizedLang is the session-locked language (set at conversation start).
  // It is AUTHORITATIVE. detectLanguage() is ONLY used as last-resort when no
  // session language is known. UI locale must NEVER be passed here as opts.lang.
  const lang = normalizedLang || detectLanguage(result);

  // Pass 0a: Language contamination check (Component F)
  // ONLY run contamination detection when the session language was NOT explicitly
  // provided. When opts.lang is set (locked at conversation start), the session
  // language is authoritative and content-based detection is unreliable — especially
  // for Romance languages (PT/IT/ES) that share high-frequency vocabulary.
  // Running contamination detection on known-language sessions was the root cause
  // of Portuguese and Italian sessions being misidentified as Spanish.
  if (!opts.preserveCoachingResponse && normalizedLang === undefined && hasLanguageContamination(result, lang)) {
    console.warn('[CP12-F] Language contamination detected for lang:', lang);
    if (SECONDARY_LANG_REWRITES[lang]) return pickSecondaryLangRewrite(lang);
    return getFailsafe(lang);
  }

  // Pass 0b: Hebrew-script mismatch for locked non-Hebrew sessions.
  // When the session language is explicitly locked to a Latin-script language and
  // the response is predominantly Hebrew, the agent ignored the language directive.
  // Hebrew and Latin scripts are mutually exclusive so this check is reliable.
  // The 30 % threshold prevents triggering on a valid response that contains only
  // a short Hebrew quotation or proper name.
  if (normalizedLang !== undefined && normalizedLang !== 'he') {
    const heChars = (result.match(/[\u05D0-\u05EA]/g) || []).length;
    const nonSpaceChars = result.replace(/\s/g, '').length;
    if (nonSpaceChars > 0 && heChars / nonSpaceChars > 0.3) {
      console.warn('[CP12-F] Hebrew script in locked non-Hebrew session — failsafe');
      return getFailsafe(normalizedLang);
    }
  }

  // Pass 1: Leakage sanitization — Component A
  result = sanitizeMessageContent(result, lang);
  if (!result || result.length < 3) {
    console.error('[CP12-A] Empty after leakage sanitization — failsafe');
    return getFailsafe(lang);
  }

  // Pass 2: Routing leakage phrases — Component D
  result = stripRoutingLeakage(result);
  if (!result || result.length < 3) {
    console.error('[CP12-D] Empty after routing strip — failsafe');
    return getFailsafe(lang);
  }

  // Coaching permits discussion and outcome review without a directive rewrite.
  // Leakage sanitization and routing removal above still apply.
  if (opts.preserveCoachingResponse) return applyLocaleQualityCorrections(result.trim(), lang);

  // Pass 3: Generic worksheet block strip — Component E
  if (hasWorksheetDrift(result)) {
    result = stripWorksheetBlocks(result);
  }
  if (!result || result.length < 3) {
    console.error('[CP12-D] Empty after worksheet strip — failsafe');
    return getFailsafe(lang);
  }

  // Pass 3b: Hebrew semantic anti-worksheet REWRITE — Component E (HE)
  if (lang === 'he') {
    result = applyHebrewSemanticAntiWorksheet(result);
    if (!result || result.length < 3) return getFailsafe('he');
  }

  // Pass 3c: Secondary language worksheet / reflection-trap — Component F
  // Threshold raised from 2→4: a clinically-correct therapeutic response in PT/IT/FR/DE/ES
  // naturally contains 2-3 of these patterns. Firing at 2 was replacing entire valid answers
  // with canned rewrites in the correct language — and if lang was mis-detected as 'es'
  // (root cause of the repeated Spanish fallback bug), the rewrite would be in Spanish.
  // Only fire when there are 4+ clear worksheet signals — a threshold that legitimate
  // therapeutic responses cannot reach.
  if (['es', 'fr', 'de', 'it', 'pt'].includes(lang)) {
    const enSignalCount = countEnReflectionTrapSignals(result);
    const nativeSignalCount = countSecondaryLangWorksheetSignals(result, lang);
    const signalCount = enSignalCount + nativeSignalCount;
    if (signalCount >= 4) {
      console.warn('[CP12-F] Secondary lang worksheet/reflection trap (' + lang + ') enSignals=' + enSignalCount + ' nativeSignals=' + nativeSignalCount + ' — directive rewrite');
      result = pickSecondaryLangRewrite(lang);
      if (!result || result.length < 3) return getFailsafe(lang);
    }
  }

  // Pass 3c-SA: Secondary language social-anxiety / exploration-first — DISABLED
  // This pass was firing on normal therapeutic Portuguese/Italian/French responses
  // (e.g. "Vamos explorar isso juntos" = "Let's explore this together" — a standard
  // therapeutic opener) and replacing them with Spanish fallback lines.
  // Root cause: the SA signal patterns match common therapeutic vocabulary in ALL
  // Romance languages, making false positives inevitable at threshold=2.
  // Resolution: the session language directive injected at conversation start
  // already instructs the agent to stay in the session language. Client-side
  // social-anxiety detection is redundant and harmful for non-English sessions.

  // Pass 3d: English reflection trap REWRITE — Component E (EN)
  if (lang === 'en') {
    result = applyEnglishReflectionTrapPass(result);
    if (!result || result.length < 3) return getFailsafe('en');
  }

  // Pass 4: Trailing ask-back strip — Component B
  result = stripTrailingAskBack(result);
  if (!result || result.length < 3) {
    console.error('[CP12-B] Empty after ask-back strip — failsafe');
    return getFailsafe(lang);
  }

  // Pass 4b: Post-learning compression guard — Component G
  // DISABLED: truncating good multi-paragraph answers to 2 sentences was a
  // direct cause of the "collapses to short response" bug. The agent
  // instructions already enforce directive brevity in post-learning turns.
  // Keeping the log so it's detectable if re-enabled.

  // Pass 5: Pure-question check — Component B
  const trimmed = result.trim();
  const sentences = splitSentences(trimmed);
  if (sentences.length === 1 && /\?$/.test(trimmed)) {
    console.error('[CP12-B] Response is only a question — failsafe');
    return getFailsafe(lang);
  }

  // Pass 5b: No-response failsafe — Component C
  if (!trimmed || trimmed.length < 5) {
    console.error('[CP12-C] Output too short — failsafe');
    return getFailsafe(lang);
  }

  return applyLocaleQualityCorrections(result.trim(), lang);
}

/**
 * Check if text passes CP12 without modifying it.
 * Returns { passes: boolean, violations: string[] }
 */
export function auditCP12(text) {
  if (!text || typeof text !== 'string') return { passes: false, violations: ['empty'] };

  const violations = [];
  const lang = detectLanguage(text);

  if (hasLanguageContamination(text, lang)) violations.push('language-contamination');
  if (ROUTING_COMPRESSION_PATTERNS.some(p => p.test(text))) violations.push('routing-leakage');
  if (hasWorksheetDrift(text)) violations.push('worksheet-drift');
  if (lang === 'he' && detectHebrewWorksheetDriftSemantic(text)) violations.push('hebrew-semantic-worksheet-drift');
  if (['es', 'fr', 'de', 'it', 'pt'].includes(lang) && (countEnReflectionTrapSignals(text) + countSecondaryLangWorksheetSignals(text, lang)) >= 4) violations.push('secondary-lang-reflection-trap');
  // social-anxiety-exploration audit removed — pass disabled (see Pass 3c-SA comment above)

  const lines = text.split('\n');
  const lastLine = [...lines].reverse().find(l => l.trim());
  if (lastLine && isAskBackLine(lastLine)) violations.push('trailing-ask-back');

  const sentences = splitSentences(text.trim());
  if (sentences.length === 1 && /\?$/.test(text.trim())) violations.push('pure-question');

  return { passes: violations.length === 0, violations };
}