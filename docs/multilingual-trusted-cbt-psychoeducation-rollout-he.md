# חבילה 5 — תוכנית הרחבה מדורגת ל־Trusted CBT ול־Psychoeducation

**תאריך:** 2026-09-07  
**אפליקציה:** Mindful Path  
**Base44 App ID:** `69504b725a07f5aa75aeaf7d`  
**סטטוס:** חבילה 5 הושלמה כתוכנית ביצועית; לא בוצעו תרגומים, שינויי Schema, שינויי נתונים או הפעלת תוכן.

## 1. מטרת החבילה

בניית תוכנית בטוחה ומדורגת להרחבת מאגרי `TrustedCBTChunk` ו־`Psychoeducation` מאנגלית לשש השפות הנוספות הנתמכות:

- עברית — `he`
- ספרדית — `es`
- צרפתית — `fr`
- גרמנית — `de`
- איטלקית — `it`
- פורטוגזית — `pt`

ההרחבה תתבצע ללא fallback שקט לאנגלית וללא הפעלת תוכן מתורגם לפני בדיקת איכות, בטיחות ורישוי.

## 2. תמונת מצב מאומתת

### 2.1 Trusted CBT

| מדד | מצב |
|---|---:|
| סך רשומות | 117 |
| שפה אנגלית | 117 |
| רשומות פעילות | 116 |
| רשומת Canary לא פעילה | 1 |
| רשומות ייחודיות לחלוטין, כולל Canary | 110 |
| רשומות טיפוליות פעילות ייחודיות לחלוטין | 109 |
| קבוצות כותרת חוזרת | 27 |
| קבוצות כפילות זהה לחלוטין | 4 |
| רשומות עודפות בכפילויות הזהות | 7 |
| `license_status: adapted` | 112 |
| `license_status: open` | 4 |
| `license_status: original` | 1 — Canary בלבד |
| ללא `safety_notes` | 78 |
| ללא `contraindications` | 58 |

התפלגות מרכזית לפי נושא:

| נושא | רשומות |
|---|---:|
| Anxiety | 35 |
| Depression | 14 |
| Trauma | 10 |
| Relationships | 9 |
| Emotion regulation | 7 |
| Stress | 5 |
| Self-esteem | 5 |
| Sleep | 4 |
| יתר הנושאים | 28 |
| Canary test | 1 |

### 2.2 Psychoeducation

| מדד | מצב |
|---|---:|
| סך רשומות | 10 |
| שפה אנגלית | 10 |
| פעילות | 10 |
| Beginner | 7 |
| Intermediate | 3 |
| מקור ו־Evidence base מלאים | 10 |
| Contraindications מלאים | 10 |
| `reviewed_by` חסר | 10 |
| `last_reviewed_date` חסר | 10 |
| `related_exercises` ריק | 10 |
| `related_resources` ריק | 10 |
| Slugs כפולים | 0 |

עשר יחידות המקור:

1. Behavioral Activation Basics
2. Sleep, Stress, and the Brain
3. The Anxiety Cycle
4. Grounding: What It Is and When It Helps
5. Worry vs Problem Solving
6. Avoidance and Short-Term Relief
7. Self-Compassion Under Stress
8. Shame vs Guilt
9. Cognitive Distortions
10. Rumination vs Reflection

## 3. ממצאים החוסמים תרגום מיידי

### 3.1 כפילויות ב־Trusted CBT

ארבע קבוצות זהות לחלוטין יוצרות שבע רשומות עודפות:

| כותרת | מספר עותקים |
|---|---:|
| OCD: ERP Hierarchy Construction | 2 |
| Identifying Catastrophising Thoughts | 3 |
| Behavioural Activation for Low Mood | 3 |
| Panic Disorder Psychoeducation | 3 |

בנוסף קיימות 23 קבוצות נוספות בעלות אותה כותרת אך תוכן שונה. הן אינן מיועדות למחיקה אוטומטית: נדרשת החלטה עריכתית אם למזג, לשנות כותרת או לשמר כיחידות נפרדות.

### 3.2 רישוי

112 מתוך 117 רשומות Trusted CBT מסומנות `adapted`. סימון זה אינו מהווה לבדו אישור משפטי להפצה או לתרגום. אין לתרגם או לפרסם רשומה לפני אימות תנאי השימוש במקור.

ארבע הרשומות המסומנות `open`:

- Postnatal Depression: CBT Formulation
- Psychoeducation on Sleep Architecture
- Sleep Hygiene and Cognitive Factors in Insomnia
- Exposure and Response Prevention Overview

גם ברשומות אלה נדרשת בדיקה שהמקור המסוים מתיר עיבוד ותרגום.

### 3.3 בדיקה קלינית

- לכל עשר רשומות Psychoeducation חסרים שם הבודק הקליני ותאריך הבדיקה.
- ב־Trusted CBT חסרות הערות בטיחות ב־78 רשומות והתוויות נגד ב־58 רשומות.
- תוכני משבר, טראומה, חשיפה, הפרעות אכילה, דו־קוטביות, התמכרות וסיכון אובדני אינם מתאימים לפיילוט הראשון.

### 3.4 בידוד שפה

- `Psychoeducation` משולב באינדקס הידע עם metadata של שפה, ומנגנון `retrieveRelevantContent` מסנן בשאילתת Pinecone לפי התאמה מדויקת לשפה.
- `retrieveTrustedCBTContent` שולף כרגע את כל הרשומות הפעילות באמצעות `{ is_active: true }` בלבד.
- לפני יצירת גרסה מתורגמת אחת של Trusted CBT חובה להוסיף קבלת locale וסינון מדויק באמצעות `{ is_active: true, language: locale }`.
- כאשר אין תוכן בשפה המבוקשת יש להחזיר רשימה ריקה או Empty State מתורגם. אין להחזיר תוכן אנגלי אוטומטית.

## 4. החלטת הביצוע

1. אין לתרגם את כל 127 הרשומות במקביל.
2. אין לתרגם כפילויות לפני ניקוי ויצירת מקור קנוני.
3. שפת הפיילוט הראשונה תהיה עברית, משום שניתן לבצע בה בדיקת איכות ישירה ומדויקת.
4. הפיילוט יתחיל ב־Psychoeducation ורק לאחר אישורו יעבור ל־Trusted CBT.
5. כל גרסה חדשה תיווצר כ־`draft` או `is_active: false`.
6. הפעלה תתבצע לפי רשומה ולפי שפה בלבד.
7. הרחבה לשפה נוספת תתבצע רק לאחר אישור איכות השפה הקודמת.
8. תוכן רגיש יידחה לגלים המאוחרים ויחייב אישור קליני נפרד.

## 5. שלבי הביצוע

### שער 0 — ניקוי והכנת ארכיטקטורה

1. להסיר או לאחד את שבע הרשומות העודפות הזהות.
2. לבדוק את 23 קבוצות הכותרת בעלות גרסאות התוכן השונות.
3. להחריג לצמיתות מתרגום את `Canary Retrieval Test`.
4. לקבוע מזהה מקור קנוני לכל יחידת תוכן.
5. להוסיף לשתי הישויות שדות קשר בין גרסאות:
   - `translation_group_id`
   - `source_record_id`
   - `source_language`
   - `variant_language`
   - `translation_status`
   - `clinical_review_status`
   - `translation_version`
6. להשלים סינון שפה מדויק ב־`retrieveTrustedCBTContent`.
7. להוסיף בדיקות נגד ערבוב שפות ונגד fallback לאנגלית.

**תנאי מעבר:** מקור קנוני יחיד, רישוי מתועד, נתיב שליפה מבודד שפה ובדיקות Git ירוקות.

### גל 1 — פיילוט Psychoeducation בעברית

היקף: 10 יחידות.

סדר עבודה לכל יחידה:

1. תרגום כותרת, Summary, Content, Key concepts, Examples, Tags, Goal types, Mood targets, When to use ו־Contraindications.
2. שמירת מקור, Evidence base ו־Slug קנוני.
3. יצירת Slug עברי־טכני ייחודי עם סיומת `-he`.
4. קישור לגרסת המקור האנגלית.
5. בדיקת נאמנות למקור.
6. בדיקת עברית טבעית וברורה.
7. בדיקת בטיחות קלינית.
8. השלמת `reviewed_by` ו־`last_reviewed_date`.
9. שמירה כ־draft.
10. הפעלה מדורגת של יחידה אחת בכל פעם.

**תנאי מעבר:** 10/10 מאושרות לשונית וקלינית, ללא ערבוב שפה וללא fallback.

### גל 2 — פיילוט Trusted CBT בעברית

היקף: 10 יחידות מקור קנוניות בסיכון נמוך יחסית:

1. Psychoeducation: The CBT Model Overview
2. Psychoeducation on Cognitive Distortions
3. Cognitive Restructuring: Decatastrophising
4. Cognitive Restructuring: Thought Records
5. CBT Case Formulation
6. Socratic Questioning in CBT
7. Coping Strategies: Problem-Focused vs Emotion-Focused
8. Psychoeducation on Sleep Architecture
9. Psychoeducation on the Stress Response
10. Acceptance of Emotions: The Emotion Regulation Framework

הכללה ברשימה אינה אישור לפרסום. כל יחידה חייבת לעבור בדיקת רישוי ובדיקה קלינית לפני תרגום והפעלה.

**תנאי מעבר:** 10/10 מאושרות, Retrieval Preview מחזיר רק עברית, וכל בדיקות Git ירוקות.

### גל 3 — שכפול חבילת הפיילוט לשפות הנוספות

לאחר אישור שתי חבילות הפיילוט בעברית, מתרגמים את אותן 20 יחידות לפי הסדר:

1. ספרדית
2. צרפתית
3. גרמנית
4. איטלקית
5. פורטוגזית

כל שפה היא שער עצמאי. אין להתחיל שתי שפות במקביל לפני אישור תהליך ה־QA.

### גל 4 — הרחבת Trusted CBT

לאחר אישור גל 3:

1. מיון המקורות הקנוניים הנותרים לפי נושא, סיכון, רישוי ו־priority.
2. עבודה במנות של עד 15 יחידות מקור.
3. סדר נושאים מומלץ:
   - יסודות CBT ועיוותי חשיבה
   - דיכאון והפעלה התנהגותית
   - לחץ, שינה וויסות רגשי
   - יחסים, אסרטיביות וערך עצמי
   - חרדה כללית ופאניקה ללא תרגילי חשיפה
   - ADHD, אבל וכאב כרוני
   - חשיפה, OCD והפרעות אכילה
   - טראומה, התמכרות, דו־קוטביות ומשבר — אחרונים בלבד
4. השלמת שפה אחת לכל מנה לפני מעבר לשפה הבאה.

## 6. מטריצת שערי אישור

| שער | חובה |
|---|---|
| מקור | רשומת מקור אנגלית קנונית אחת |
| כפילות | אין כפילות זהה ואין כותרת עמומה |
| רישוי | זכות שימוש ועיבוד מתועדת |
| שפה | כל השדות הטקסטואליים בשפת היעד |
| בטיחות | Safety notes ו־Contraindications מלאים |
| קליני | Reviewer ותאריך בדיקה |
| קשרים | קישור מקור ו־translation group |
| סטטוס | Draft/Inactive עד אישור |
| שליפה | התאמה מדויקת ל־locale |
| fallback | אין fallback שקט לאנגלית |
| Git | Test Suite ו־E2E ירוקים לפני מיזוג או הפעלה |

## 7. חלוקת עבודה

### Codex

- מיפוי נתונים וכפילויות.
- הכנת רשימות מנות ומזהי מקור.
- שינויי Schema ושליפת שפה לאחר אישור מפורש.
- יצירת בדיקות הגנה ותיעוד.

### Base44

- ניהול הישויות והרשומות.
- יצירת גרסאות כ־draft/inactive.
- Retrieval Preview והפעלה מדורגת.
- Checkpoint לפני ואחרי כל מנה.

### GitHub Copilot

- טיפול בכשלי Test Suite ו־E2E ב־Git.
- סקירת PR והצעות תיקון ממוקדות.
- אימות שאין שינוי לא מכוון ב־auth, routing, forms או safety.

### יוסי

- אישור איכות הפיילוט בעברית.
- אישור מעבר בין שפות ובין גלים.
- אישור כל הרחבה לתוכן רגיש.

## 8. היקף עתידי משוער

לאחר הסרת הכפילויות הזהות והחרגת ה־Canary קיימות לכל היותר:

- 109 יחידות Trusted CBT פעילות וייחודיות לחלוטין.
- 10 יחידות Psychoeducation.
- עד 119 יחידות מקור קנוניות לפני מיזוג אפשרי של גרסאות בעלות אותה כותרת.
- עד 714 גרסאות תרגום לשש שפות נוספות.

המספר הסופי צפוי לרדת לאחר ההכרעה ב־23 קבוצות הכותרת החוזרות.

## 9. תוצאת חבילה 5

חבילה 5 מספקת סדר ביצוע מלא ומונעת התחלה מסוכנת של תרגום המוני. לא שונו תוכני Production, לא נוצרו תרגומים, לא הופעלו רשומות, לא שונה Schema ולא שונה קוד Runtime. השלב הבא המותר הוא שער 0 בלבד, ורק לאחר אישור מפורש.
