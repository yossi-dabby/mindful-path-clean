import { additionalLegalCopies } from './legalContentAdditional';

export const LEGAL_EFFECTIVE_DATE = '2026-09-03';
export const LEGAL_CONSENT_VERSION = '2026-09-03';
export const LEGAL_CONTACT_EMAIL = 'support@mindful-path.app';

const en = {
  language: 'en',
  direction: 'ltr',
  common: {
    appName: 'Mindful Path',
    effectiveDateLabel: 'Effective date',
    back: 'Back to Mindful Path',
    privacy: 'Privacy Notice',
    terms: 'Terms of Use',
    contact: 'Contact',
    important: 'Important',
  },
  privacy: {
    title: 'Privacy Notice',
    intro: 'This notice explains what information Mindful Path processes, why it is used, and the choices available to you. Mindful Path is a wellness and self-help service; it is not an emergency or medical treatment service.',
    sections: [
      { title: 'Who is responsible and how to contact us', paragraphs: [
        'The operator of Mindful Path is responsible for the processing described in this notice. Privacy, access, export, correction, and deletion requests can be sent to support@mindful-path.app.',
      ]},
      { title: 'Information we process', bullets: [
        'Account details, such as name, email address, language, preferences, and authentication identifiers.',
        'Wellness content you choose to provide, including mood check-ins, goals, journal entries, exercise progress, and conversations with AI features.',
        'Safety-related signals generated when content may indicate an immediate risk of harm.',
        'Technical and usage information needed for security, reliability, troubleshooting, and fraud prevention.',
        'Subscription status and transaction identifiers. Payment-card details are handled by the relevant app store or payment processor rather than stored directly by Mindful Path.',
      ]},
      { title: 'How and why information is used', bullets: [
        'To provide the features you request and maintain continuity between sessions.',
        'To personalize exercises, recommendations, reminders, and progress views.',
        'To operate safety controls and present appropriate emergency resources.',
        'To secure, maintain, diagnose, and improve the service.',
        'To meet legal obligations and respond to valid legal requests.',
      ]},
      { title: 'AI processing and important limitations', paragraphs: [
        'Content sent to AI features may be processed by Mindful Path infrastructure, Base44 services, and configured AI service providers solely to provide and protect the requested feature. AI output can be incomplete or incorrect and must not be treated as a diagnosis, treatment plan, or emergency instruction.',
        'Use the chat only for information you are comfortable providing. Do not include another person’s confidential information unless you are authorized to do so.',
      ]},
      { title: 'Sharing and international processing', paragraphs: [
        'Information may be processed by service providers that supply hosting, authentication, AI, analytics, support, communications, payments, and security. They are permitted to process information only for the services they provide, subject to applicable contractual and legal safeguards.',
        'Some providers may process information outside your country. Where required, appropriate transfer safeguards should be used.',
        'Mindful Path does not sell personal information.',
      ]},
      { title: 'Retention, export, and deletion', paragraphs: [
        'Retention controls available in Settings are intended to limit how long supported wellness records are kept. Operational backups, security records, transaction records, or information required by law may follow different limited retention periods.',
        'You can request an export or deletion from Settings. Account deletion is intended to remove the account and associated user-owned records. Some deletion operations may take time to propagate through backups and managed service systems.',
      ]},
      { title: 'Your choices and rights', bullets: [
        'Access and export information associated with your account.',
        'Correct account details and selected preferences.',
        'Choose a supported retention period.',
        'Delete wellness history or request deletion of your account.',
        'Object to or restrict certain processing where applicable.',
        'Withdraw consent where processing depends on consent, without affecting earlier lawful processing.',
        'Contact the relevant privacy regulator if you believe your rights were not respected.',
      ]},
      { title: 'Security', paragraphs: [
        'Mindful Path uses access controls, authentication, encrypted network connections, data minimization, and monitoring intended to reduce unauthorized access. No online service can guarantee absolute security.',
      ]},
      { title: 'Age limits', paragraphs: [
        'The AI chat is intended only for adults aged 18 or older. Users under 18 must not use the AI chat. Other wellness tools are not intended for children under 13; users aged 13–17 should use them only with a parent or legal guardian as applicable.',
      ]},
      { title: 'Changes to this notice', paragraphs: [
        'Material changes will be identified by an updated effective date and, when appropriate, an in-app notice. Continued use does not replace consent where new consent is legally required.',
      ]},
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'These Terms govern use of Mindful Path. By using the service, you agree to these Terms and the Privacy Notice.',
    sections: [
      { title: 'Wellness service — not medical care', paragraphs: [
        'Mindful Path provides educational, mindfulness, journaling, and CBT-informed self-help tools. It does not provide diagnosis, psychotherapy, medical treatment, or professional emergency services, and it does not create a therapist–patient relationship.',
      ]},
      { title: 'Emergency situations', paragraphs: [
        'Do not rely on Mindful Path in an emergency. If you may harm yourself or another person, are in immediate danger, or need urgent care, contact local emergency services or a qualified professional now. Safety prompts and resource links may be incomplete or unavailable.',
      ]},
      { title: 'Eligibility and age', paragraphs: [
        'The AI chat is for users aged 18 or older. People under 18 must not use the AI chat. Other wellness tools are not for children under 13; users aged 13–17 should use them only with a parent or legal guardian as applicable.',
      ]},
      { title: 'AI limitations', paragraphs: [
        'AI-generated responses may be inaccurate, repetitive, unsuitable, or incomplete. You remain responsible for decisions you make. Do not delay or replace professional assessment or treatment because of information provided by the service.',
      ]},
      { title: 'Acceptable use', bullets: [
        'Do not attempt to access another person’s account or confidential information.',
        'Do not disrupt, reverse engineer, probe, overload, or bypass the service or its safety controls.',
        'Do not use the service to generate unlawful, abusive, deceptive, or harmful content.',
        'Do not upload content unless you have the right to use it.',
      ]},
      { title: 'Account security', paragraphs: [
        'Keep access to your account and device secure. Notify support promptly if you believe your account has been compromised.',
      ]},
      { title: 'Subscriptions and payments', paragraphs: [
        'Prices, trial terms, renewal, cancellation, and refund rules are shown before purchase and may vary by platform and country. Purchases made through an app store are also governed by that store’s billing terms.',
      ]},
      { title: 'Availability and changes', paragraphs: [
        'Features may change, be suspended, or become unavailable. We aim to preserve user data and provide notice for material changes where reasonably possible, but uninterrupted operation is not guaranteed.',
      ]},
      { title: 'Intellectual property and user content', paragraphs: [
        'Mindful Path and its original software and content remain protected by applicable intellectual-property laws. You retain rights in content you submit and permit its processing only as needed to operate, secure, and improve the service as described in the Privacy Notice.',
      ]},
      { title: 'Responsibility and applicable law', paragraphs: [
        'Nothing in these Terms excludes rights or responsibilities that cannot legally be excluded. Any additional limitations, governing-law terms, and business identity details must be confirmed for the country in which the service is offered.',
      ]},
      { title: 'Contact and updates', paragraphs: [
        'Questions about these Terms can be sent to support@mindful-path.app. Material updates will be identified by a revised effective date and, when appropriate, an in-app notice.',
      ]},
    ],
  },
  consent: {
    title: 'Before we begin',
    description: 'Please review these important limits before using the AI chat.',
    wellnessTitle: 'Self-help support, not professional treatment',
    wellnessBody: 'The AI companion provides wellness and CBT-informed self-help support. It is not a licensed therapist, does not diagnose conditions, and does not replace medical or mental-health care.',
    aiTitle: 'AI can make mistakes',
    aiBody: 'Responses may be incomplete or unsuitable. Use your judgment and seek a qualified professional for clinical decisions.',
    privacyTitle: 'Your messages are processed to provide the chat',
    privacyBody: 'Messages may be processed by Mindful Path, Base44, and configured AI providers. Avoid sharing information you do not want processed.',
    crisisTitle: 'Not for emergencies',
    crisisBody: 'If you may harm yourself or someone else, or are in immediate danger, contact local emergency services or a qualified crisis service now.',
    acknowledgement: 'By continuing, you confirm that you are 18 or older, understand these limits, and agree to the Terms of Use and Privacy Notice.',
    accept: 'I understand and agree',
    leave: 'Not now',
  },
};

const he = {
  language: 'he',
  direction: 'rtl',
  common: {
    appName: 'Mindful Path',
    effectiveDateLabel: 'תאריך תחילה',
    back: 'חזרה ל־Mindful Path',
    privacy: 'הודעת פרטיות',
    terms: 'תנאי שימוש',
    contact: 'יצירת קשר',
    important: 'חשוב',
  },
  privacy: {
    title: 'הודעת פרטיות',
    intro: 'הודעה זו מסבירה איזה מידע Mindful Path מעבדת, לאילו מטרות ובאילו אפשרויות תוכלו לבחור. Mindful Path היא שירות לרווחה נפשית ולעזרה עצמית; היא אינה שירות חירום ואינה שירות רפואי.',
    sections: [
      { title: 'מי אחראי למידע וכיצד פונים אלינו', paragraphs: [
        'מפעיל Mindful Path אחראי לעיבוד המתואר בהודעה זו. בקשות בנושא פרטיות, עיון, ייצוא, תיקון או מחיקה ניתן לשלוח לכתובת support@mindful-path.app.',
      ]},
      { title: 'המידע שאנו מעבדים', bullets: [
        'פרטי חשבון כגון שם, כתובת דוא״ל, שפה, העדפות ומזהי התחברות.',
        'תוכן הקשור לרווחה הנפשית שתבחרו למסור, לרבות דיווחי מצב רוח, מטרות, רשומות יומן, התקדמות בתרגילים ושיחות עם כלי AI.',
        'סימני בטיחות שנוצרים כאשר תוכן עשוי להצביע על סכנה מיידית לפגיעה.',
        'מידע טכני ומידע שימושי הנחוצים לאבטחה, אמינות, טיפול בתקלות ומניעת הונאה.',
        'מצב מנוי ומזהי עסקאות. פרטי כרטיס תשלום מטופלים בידי חנות האפליקציות או ספק התשלום ואינם נשמרים ישירות ב־Mindful Path.',
      ]},
      { title: 'כיצד ומדוע משתמשים במידע', bullets: [
        'כדי לספק את התכונות שביקשתם ולשמור על המשכיות בין מפגשים.',
        'כדי להתאים תרגילים, המלצות, תזכורות ותצוגות התקדמות.',
        'כדי להפעיל אמצעי בטיחות ולהציג משאבי חירום מתאימים.',
        'כדי לאבטח, לתחזק, לאבחן ולשפר את השירות.',
        'כדי לקיים חובות חוקיות ולהשיב לדרישות חוקיות תקפות.',
      ]},
      { title: 'עיבוד באמצעות AI ומגבלות חשובות', paragraphs: [
        'תוכן שנשלח לתכונות AI עשוי להיות מעובד בתשתיות Mindful Path, בשירותי Base44 ובידי ספקי AI שהוגדרו במערכת, וזאת לצורך מתן התכונה המבוקשת והגנתה. תשובות AI עלולות להיות חלקיות או שגויות ואין לראות בהן אבחנה, תוכנית טיפול או הוראות חירום.',
        'השתמשו בצ׳אט רק לגבי מידע שנוח לכם למסור. אין לכלול מידע חסוי של אדם אחר ללא הרשאה מתאימה.',
      ]},
      { title: 'שיתוף ועיבוד מחוץ לישראל', paragraphs: [
        'מידע עשוי להיות מעובד בידי ספקים המספקים אחסון, התחברות, AI, ניתוח שימוש, תמיכה, תקשורת, תשלומים ואבטחה. הם רשאים לעבד מידע רק לצורך השירות שהם מספקים ובכפוף להגנות חוזיות וחוקיות מתאימות.',
        'חלק מהספקים עשויים לעבד מידע מחוץ למדינתכם. כאשר נדרש, יש להשתמש באמצעי הגנה מתאימים להעברת מידע.',
        'Mindful Path אינה מוכרת מידע אישי.',
      ]},
      { title: 'שמירה, ייצוא ומחיקה', paragraphs: [
        'אפשרויות השמירה שבהגדרות נועדו להגביל את משך שמירתן של רשומות רווחה נתמכות. גיבויים תפעוליים, רישומי אבטחה, רישומי עסקאות או מידע שחובה לשמור על פי דין עשויים להישמר לפרקי זמן מוגבלים אחרים.',
        'ניתן לבקש ייצוא או מחיקה דרך ההגדרות. מחיקת חשבון נועדה להסיר את החשבון ואת הרשומות שבבעלות המשתמש. השלמת המחיקה בגיבויים ובמערכות שירות מנוהלות עשויה להימשך זמן.',
      ]},
      { title: 'הבחירות והזכויות שלכם', bullets: [
        'לעיין במידע המשויך לחשבון ולקבל עותק ממנו.',
        'לתקן פרטי חשבון והעדפות נבחרות.',
        'לבחור תקופת שמירה נתמכת.',
        'למחוק היסטוריית רווחה או לבקש מחיקת חשבון.',
        'להתנגד לעיבוד מסוים או לבקש את הגבלתו, כאשר הדין מאפשר זאת.',
        'לבטל הסכמה כאשר העיבוד מבוסס עליה, מבלי לפגוע בעיבוד חוקי שבוצע קודם לכן.',
        'לפנות לרשות המוסמכת להגנת הפרטיות אם לדעתכם זכויותיכם לא כובדו.',
      ]},
      { title: 'אבטחת מידע', paragraphs: [
        'Mindful Path משתמשת באמצעי בקרת גישה, אימות, חיבורי רשת מוצפנים, צמצום מידע וניטור שנועדו להפחית גישה בלתי מורשית. אף שירות מקוון אינו יכול להבטיח אבטחה מוחלטת.',
      ]},
      { title: 'מגבלות גיל', paragraphs: [
        'צ׳אט ה־AI מיועד לבני 18 ומעלה בלבד. משתמשים מתחת לגיל 18 אינם רשאים להשתמש בצ׳אט ה־AI. כלי הרווחה האחרים אינם מיועדים לילדים מתחת לגיל 13; בני 13–17 צריכים להשתמש בהם בליווי הורה או אפוטרופוס חוקי, ככל שנדרש.',
      ]},
      { title: 'שינויים בהודעה', paragraphs: [
        'שינוי מהותי יסומן באמצעות עדכון תאריך התחילה, ובמידת הצורך גם בהודעה בתוך האפליקציה. המשך שימוש אינו מחליף הסכמה חדשה כאשר הדין מחייב לקבלה.',
      ]},
    ],
  },
  terms: {
    title: 'תנאי שימוש',
    intro: 'תנאים אלה מסדירים את השימוש ב־Mindful Path. השימוש בשירות מהווה הסכמה לתנאים אלה ולהודעת הפרטיות.',
    sections: [
      { title: 'שירות לרווחה נפשית — לא טיפול רפואי', paragraphs: [
        'Mindful Path מספקת כלים לימודיים, מיינדפולנס, כתיבה אישית וכלי עזרה עצמית המבוססים על עקרונות CBT. היא אינה מספקת אבחון, פסיכותרפיה, טיפול רפואי או שירותי חירום מקצועיים, ואינה יוצרת יחסי מטפל–מטופל.',
      ]},
      { title: 'מצבי חירום', paragraphs: [
        'אין להסתמך על Mindful Path במקרה חירום. אם אתם עלולים לפגוע בעצמכם או באדם אחר, נמצאים בסכנה מיידית או זקוקים לטיפול דחוף, פנו כעת לשירותי החירום המקומיים או לאיש מקצוע מוסמך. התראות בטיחות וקישורים למשאבים עלולים להיות חלקיים או בלתי זמינים.',
      ]},
      { title: 'זכאות וגיל', paragraphs: [
        'צ׳אט ה־AI מיועד לבני 18 ומעלה. בני פחות מ־18 אינם רשאים להשתמש בצ׳אט ה־AI. כלי הרווחה האחרים אינם מיועדים לילדים מתחת לגיל 13; בני 13–17 צריכים להשתמש בהם בליווי הורה או אפוטרופוס חוקי, ככל שנדרש.',
      ]},
      { title: 'מגבלות ה־AI', paragraphs: [
        'תשובות שנוצרו בידי AI עשויות להיות שגויות, חזרתיות, לא מתאימות או חלקיות. האחריות להחלטות נשארת בידיכם. אין לדחות או להחליף הערכה או טיפול מקצועיים בגלל מידע שהתקבל בשירות.',
      ]},
      { title: 'שימוש מותר', bullets: [
        'אין לנסות לגשת לחשבון או למידע חסוי של אדם אחר.',
        'אין לשבש, לבצע הנדסה לאחור, לסרוק, להעמיס או לעקוף את השירות או את אמצעי הבטיחות שלו.',
        'אין להשתמש בשירות ליצירת תוכן בלתי חוקי, פוגעני, מטעה או מזיק.',
        'אין להעלות תוכן שאינכם מורשים להשתמש בו.',
      ]},
      { title: 'אבטחת החשבון', paragraphs: [
        'שמרו על אבטחת החשבון והמכשיר. הודיעו לתמיכה בהקדם אם אתם סבורים שהחשבון נפרץ.',
      ]},
      { title: 'מנויים ותשלומים', paragraphs: [
        'מחירים, תקופת ניסיון, חידוש, ביטול והחזר כספי מוצגים לפני הרכישה ועשויים להשתנות לפי הפלטפורמה והמדינה. רכישה דרך חנות אפליקציות כפופה גם לתנאי החיוב של אותה חנות.',
      ]},
      { title: 'זמינות ושינויים', paragraphs: [
        'תכונות עשויות להשתנות, להיות מושעות או להפוך לבלתי זמינות. נעשה מאמץ לשמור על נתוני המשתמש ולמסור הודעה על שינויים מהותיים ככל שהדבר סביר, אך אין התחייבות לפעולה רצופה ללא הפרעות.',
      ]},
      { title: 'קניין רוחני ותוכן משתמש', paragraphs: [
        'Mindful Path והתוכנה והתוכן המקוריים שלה מוגנים בדיני הקניין הרוחני. הזכויות בתוכן שאתם מוסרים נשארות בידיכם, ואתם מתירים את עיבודו רק ככל שנדרש להפעלה, לאבטחה ולשיפור השירות כמתואר בהודעת הפרטיות.',
      ]},
      { title: 'אחריות ודין חל', paragraphs: [
        'אין בתנאים אלה כדי לשלול זכויות או אחריות שלא ניתן לשלול על פי דין. מגבלות אחריות נוספות, הדין החל וזהותו המשפטית של מפעיל השירות צריכים להיות מאושרים בהתאם למדינות שבהן יוצע השירות.',
      ]},
      { title: 'יצירת קשר ועדכונים', paragraphs: [
        'שאלות בנושא התנאים ניתן לשלוח ל־support@mindful-path.app. עדכון מהותי יסומן בתאריך תחילה חדש, ובמידת הצורך גם בהודעה בתוך האפליקציה.',
      ]},
    ],
  },
  consent: {
    title: 'לפני שמתחילים',
    description: 'חשוב לקרוא את המגבלות הבאות לפני השימוש בצ׳אט ה־AI.',
    wellnessTitle: 'עזרה עצמית — לא טיפול מקצועי',
    wellnessBody: 'המאמן מבוסס ה־AI מספק תמיכה לרווחה נפשית וכלי עזרה עצמית המבוססים על עקרונות CBT. הוא אינו מטפל מורשה, אינו מאבחן ואינו מחליף טיפול רפואי או נפשי.',
    aiTitle: 'AI עלול לטעות',
    aiBody: 'התשובות עשויות להיות חלקיות או לא מתאימות. יש להפעיל שיקול דעת ולפנות לאיש מקצוע מוסמך לקבלת החלטות קליניות.',
    privacyTitle: 'ההודעות מעובדות לצורך הפעלת הצ׳אט',
    privacyBody: 'הודעות עשויות להיות מעובדות בידי Mindful Path, שירותי Base44 וספקי AI שהוגדרו במערכת. הימנעו ממסירת מידע שאינכם רוצים שיעובד.',
    crisisTitle: 'לא מיועד למצבי חירום',
    crisisBody: 'אם אתם עלולים לפגוע בעצמכם או באדם אחר, או נמצאים בסכנה מיידית, פנו כעת לשירותי החירום המקומיים או לשירות משבר מוסמך.',
    acknowledgement: 'בהמשך אתם מאשרים שגילכם 18 ומעלה, שהבנתם את המגבלות ושאתם מסכימים לתנאי השימוש ולהודעת הפרטיות.',
    accept: 'הבנתי ואני מסכים/ה',
    leave: 'לא עכשיו',
  },
};

const legalCopies = { en, he, ...additionalLegalCopies };

export function getLegalCopy(language) {
  const normalized = String(language || 'en').toLowerCase().split('-')[0];
  return legalCopies[normalized] || en;
}
