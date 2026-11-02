# גל 4 — דוח ביצוע חבילה 4.2

תאריך: 2026-09-07  
אפליקציה: Mindful Path  
Base44 App ID: `69504b725a07f5aa75aeaf7d`

## תוצאה

חבילה 4.2 הושלמה לאחר תיקון סיווג הבטיחות של רשומות הדיכאון, הלחץ והשינה.

- נוצרו 5 מקורות אנגליים פתוחים וקנוניים.
- נוצרו 30 טיוטות תרגום: 5 בכל אחת מהשפות עברית, ספרדית, צרפתית, גרמנית, איטלקית ופורטוגזית.
- סה״כ נוספו 35 רשומות.
- כולן לא פעילות ובסטטוס קליני `pending`.
- לא שונו סטטוסי `is_active` של רשומות Legacy או Production.
- לא נמחקה אף רשומה.

## המקורות החדשים

| # | קבוצת תרגום | מזהה מקור אנגלי | נושא |
|---:|---|---|---|
| 1 | `trusted-cbt-open::balanced-positive-events-review` | `6a9ea8fc9684ec85151b4bc9` | סקירה מאוזנת של אירועים חיוביים |
| 2 | `trusted-cbt-open::role-transition-adjustment-map` | `6a9ea8fc9684ec85151b4bca` | הסתגלות לשינוי תפקיד |
| 3 | `trusted-cbt-open::repeated-belief-theme-check` | `6a9ea8fc9684ec85151b4bcb` | זיהוי נושאים חוזרים באמונות |
| 4 | `trusted-cbt-open::sleep-cue-reset` | `6a9ea8fc9684ec85151b4bcc` | איפוס עדין של רמזי שינה |
| 5 | `trusted-cbt-open::optional-body-awareness-check` | `6a9ea8fc9684ec85151b4bcd` | מודעות גופנית רשותית ומותאמת־טראומה |

## מטריצת שפות

| שפה | רשומות | סטטוס |
|---|---:|---|
| אנגלית `en` | 5 | source / pending / inactive |
| עברית `he` | 5 | draft / pending / inactive |
| ספרדית `es` | 5 | draft / pending / inactive |
| צרפתית `fr` | 5 | draft / pending / inactive |
| גרמנית `de` | 5 | draft / pending / inactive |
| איטלקית `it` | 5 | draft / pending / inactive |
| פורטוגזית `pt` | 5 | draft / pending / inactive |
| **סה״כ** | **35** | **לא זמין לאחזור חי** |

## תיקון סיווג 13 רשומות החבילה המקורית

הבדיקה הראתה שלא כל 13 הרשומות מתאימות להגדרה "לא רגישות".

### הוחלפו במקורות פתוחים וסומנו duplicate/excluded לתרגום

1. Positive Psychology Interventions: Three Good Things
2. Interpersonal Therapy: Role Transitions
3. Identifying Core Beliefs
4. Stimulus Control for Insomnia
5. Mindfulness-Based Stress Reduction: Body Scan
6. Behavioural Activation for Low Mood — כבר מכוסה גם בחבילה 4.1

הסימון בוצע רק על שש רשומות המקור המדויקות. שתי כפילויות ישנות ולא פעילות של Behavioural Activation נשארו ללא שינוי.

### הועברו לשער קליני מאוחר יותר כ-review_required

1. Meaning-Making in Existential CBT
2. Postnatal Depression: CBT Formulation
3. Mindfulness-Based Cognitive Therapy: Relapse Prevention
4. Interpersonal Therapy: Grief Role
5. Schema Therapy: Early Maladaptive Schemas
6. CBT for Insomnia: Sleep Restriction Therapy
7. Expressive Writing: Pennebaker Protocol

הסיבות כוללות רישוי לא מספק, אבל או משבר לאחר לידה, הפעלת זיכרונות קשים, עבודה עמוקה עם Schema, או התערבות שינה הדורשת השגחה מקצועית.

## מקור ורישוי

המקורות החדשים הם עיבוד של מידע ציבורי תחת Open Government Licence v3.0:

- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-deal-with-change/
- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/
- https://www.nhs.uk/conditions/insomnia/
- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/top-tips-to-improve-your-mental-wellbeing/
- https://www.nhs.uk/our-policies/terms-and-conditions/

בכל מקור נשמר הייחוס הנדרש. התרגום והעיבוד אינם מוצגים כאישור קליני של NHS ואינם מרמזים על חסות.

## אימות

| בדיקה | תוצאה |
|---|---:|
| רשומות צפויות בחבילה | 35 |
| רשומות בפועל | 35 |
| חמש רשומות בכל שפה | עבר |
| source_record_id תקין | 35/35 |
| translation_group_id ייחודי בכל שפה | 35/35 |
| Safety notes מלאים | 35/35 |
| Contraindications מלאים | 35/35 |
| רשומות פגומות | 0 |
| כפילויות שפה-קבוצה | 0 |
| רשומות פעילות בחבילה | 0 |
| שש החרגות Legacy תקינות | 6/6 |
| שבע דחיות review_required תקינות | 7/7 |
| שינוי לא מכוון ב-is_active של 13 הרשומות | 0 |

נשמר Checkpoint לאחר כל שפה.

## יתרת גל 4

| מדד | יתרה |
|---|---:|
| מקורות Legacy שנותרו בתור | 88 |
| Canonical | 35 |
| Review required | 53 |
| Adapted / רישוי לא מספיק | 86 |
| Open הדורש בדיקת תחולה | 2 |
| חסר Safety notes | 57 |
| חסר Contraindications | 42 |

## שער שחרור

אין להפעיל אף רשומה לפני בדיקה לשונית וקלינית אנושית, אימות רישוי, מילוי Reviewer ותאריך אמיתיים ובדיקת אחזור לפי locale מדויק ללא fallback לאנגלית.

לפי הנחיית הפרויקט, לא הורצו E2E או Test Suite מקומיים. בוצעו רק בדיקת תקינות ריפו ו-Production build.
