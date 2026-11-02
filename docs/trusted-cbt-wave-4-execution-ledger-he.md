# גל 4 — Ledger לביצוע הרחבה מדורגת של Trusted CBT

תאריך: 2026-09-07  
אפליקציה: Mindful Path  
Base44 App ID: `69504b725a07f5aa75aeaf7d`  
סטטוס: שער 4.0 וחבילות 4.1–4.6 הושלמו; חבילות 4.7–4.8 מופו ונעצרו כדין בשער קליני מוגבר.

## 1. שער 4.0 — תיחום היתרה

תמונת המצב לפני הפעולה:

- 127 רשומות מקור באנגלית.
- 109 רשומות Legacy ייחודיות שנותרו לאחר הכפילויות הזהות וה-Canary.
- 10 קבוצות Legacy חפפו לעשרת מקורות הפיילוט הפתוחים של גל 2.
- היקף גל 4 לאחר הסרת החפיפה: 99 יחידות מקור.

פעולות שבוצעו:

- 10 קבוצות Legacy שחפפו לפיילוט סומנו `canonical_status: duplicate` ו-`translation_status: excluded`.
- `is_active` לא שונה; אין שינוי בהתנהגות ה-Production הקיימת.
- נשמר Checkpoint לפני הפעולה.
- לא נמחקה אף רשומה.

## 2. חבילה 4.1 — מנה פתוחה ראשונה

נוצרו חמישה מקורות אנגליים קנוניים חדשים בסיכון נמוך יחסית:

| # | קבוצת תרגום | מזהה מקור אנגלי | נושא |
|---:|---|---|---|
| 1 | `trusted-cbt-open::activity-planning-low-mood` | `6a9ea3ab667902ab5cddb87b` | תכנון פעילות ומצב רוח ירוד |
| 2 | `trusted-cbt-open::graded-task-planning` | `6a9ea3ab667902ab5cddb87c` | תכנון משימות מדורג |
| 3 | `trusted-cbt-open::practical-problem-solving` | `6a9ea3ab667902ab5cddb87d` | פתרון בעיות מעשי |
| 4 | `trusted-cbt-open::worry-time-action-plan` | `6a9ea3ab667902ab5cddb87e` | זמן דאגה ותוכנית פעולה |
| 5 | `trusted-cbt-open::sleep-habits-insomnia` | `6a9ea3ab667902ab5cddb87f` | הרגלי שינה ונדודי שינה |

לכל מקור נוצרו גרסאות טיוטה בשש שפות:

| שפה | מקורות/גרסאות | סטטוס |
|---|---:|---|
| אנגלית `en` | 5 | source / pending / inactive |
| עברית `he` | 5 | draft / pending / inactive |
| ספרדית `es` | 5 | draft / pending / inactive |
| צרפתית `fr` | 5 | draft / pending / inactive |
| גרמנית `de` | 5 | draft / pending / inactive |
| איטלקית `it` | 5 | draft / pending / inactive |
| פורטוגזית `pt` | 5 | draft / pending / inactive |
| **סה״כ** | **35** | **לא זמין לאחזור חי** |

## 3. מקור ורישוי בחבילה 4.1

החומר נוסח מחדש כעיבוד של מידע ציבורי המותר לשימוש תחת Open Government Licence v3.0:

- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/
- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/problem-solving/
- https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-worries/
- https://www.nhs.uk/conditions/insomnia/
- https://www.nhs.uk/our-policies/terms-and-conditions/

בכל רשומת מקור נשמר נוסח הייחוס: `Contains public sector information licensed under the Open Government Licence v3.0.`

התרגומים והעיבודים אינם מוצגים כאילו קיבלו אישור קליני של NHS ואינם מרמזים על חסות או תמיכה.

## 4. החלפת מקורות Legacy בחבילה 4.1

חמש רשומות Legacy מקבילות סומנו `duplicate/excluded` לתהליך התרגום:

1. Behavioural Activation: Activity Monitoring
2. Graded Task Assignment for Depression
3. Problem-Solving Therapy Basics
4. Worry and Generalised Anxiety: Intolerance of Uncertainty
5. Sleep Hygiene and Cognitive Factors in Insomnia

הרשומות לא נמחקו ולא הושבתו ב-Production. מטרת הסימון היא למנוע תרגום כפול או תרגום של נוסח שמקורו מוגן או לא מתועד דיו.

## 5. אימות חבילה 4.1

| בדיקה | תוצאה |
|---|---:|
| מספר הרשומות הצפוי | 35 |
| מספר הרשומות בפועל | 35 |
| חמש רשומות בכל אחת משבע השפות | עבר |
| source_record_id תקין | 35/35 |
| translation_group_id ייחודי בכל שפה | 35/35 |
| Safety notes מלאים | 35/35 |
| Contraindications מלאים | 35/35 |
| כפילויות שפה-קבוצה | 0 |
| רשומות פעילות | 0 |
| אישור קליני מלאכותי | 0 |

נשמר Checkpoint לאחר כל שער שפה.

## 6. יתרת גל 4 לאחר חבילה 4.1

| מדד | יתרה |
|---|---:|
| מקורות Legacy שנותרו בתור | 94 |
| Canonical | 48 |
| Review required | 46 |
| Adapted / רישוי לא מספיק לתרגום | 92 |
| Open אך דורש בדיקת תחולה ותנאים | 2 |
| חסר Safety notes | 62 |
| חסר Contraindications | 43 |

התפלגות נושאים:

| נושא | מקורות |
|---|---:|
| Anxiety | 24 |
| Trauma | 10 |
| Depression | 9 |
| Relationships | 9 |
| Emotion regulation | 6 |
| Self-esteem | 5 |
| Behavior change | 3 |
| Eating disorders | 3 |
| Grief | 3 |
| Health anxiety | 3 |
| ADHD | 2 |
| Addiction | 2 |
| Anger | 2 |
| Bipolar disorder | 2 |
| Chronic pain | 2 |
| Perfectionism | 2 |
| Relapse prevention | 2 |
| Sleep | 2 |
| Stress | 2 |
| Crisis | 1 |

## 7. חלוקת יתרת גל 4 לחבילות

כל חבילה מוגבלת לעד 15 מקורות. לפני תרגום, כל מקור חייב לקבל מקור פתוח/הרשאה מתועדת, מקור קנוני יחיד, Safety notes ו-Contraindications.

| חבילה | תחום | תקרה |
|---|---|---:|
| 4.2 | דיכאון, לחץ ושינה שאינם רגישים | 13 |
| 4.3 | ויסות רגשי, שינוי התנהגותי, פרפקציוניזם וערך עצמי | 15 |
| 4.4 | יחסים, יתרת ערך עצמי וכעס | 12 |
| 4.5 | חרדה כללית ופאניקה ללא חשיפה | 15 |
| 4.6 | ADHD, אבל, כאב כרוני, חרדת בריאות ומניעת הישנות | 12 |
| 4.7 | חשיפה וחרדה מורכבת — רק לאחר שער קליני מוגבר | עד 15 |
| 4.8 | טראומה, התמכרות, הפרעות אכילה, דו-קוטביות ומשבר — אחרונים בלבד | יתרה |

## 8. תהליך קבוע לכל חבילה

1. בחירת עד 15 קבוצות מקור.
2. הכרעה קנונית ונטרול כפילויות.
3. אימות זכות עיבוד ותרגום.
4. השלמת Safety notes ו-Contraindications.
5. יצירת מקור אנגלי פתוח וקנוני לא פעיל בעת הצורך.
6. יצירת טיוטות בסדר: עברית, ספרדית, צרפתית, גרמנית, איטלקית, פורטוגזית.
7. בדיקת שפה, קישורי מקור, ייחודיות וסטטוס.
8. Checkpoint לאחר כל שפה.
9. שמירה כ-`draft/pending/inactive`.
10. הפעלה רק לאחר בדיקה לשונית וקלינית אנושית.

## 9. תנאי בטיחות מחייבים

- אין fallback שקט לאנגלית.
- אין תרגום של מקור `adapted` ללא הרשאה מתועדת או החלפתו במקור פתוח.
- אין מילוי `reviewed_by` או תאריך סקירה ללא בדיקה אנושית בפועל.
- אין הפעלה אוטומטית של מקור או תרגום.
- אין תרגום מקביל של שתי שפות באותו שער.
- תוכני חשיפה, טראומה, הפרעות אכילה, התמכרות, דו-קוטביות ומשבר נשארים לסוף ומחייבים שער קליני מוגבר.

## 10. סטטוס גל 4

- שער 4.0: הושלם.
- חבילה 4.1: הושלמה.
- חבילה 4.2: הושלמה — 5 מקורות פתוחים ו-30 טיוטות תרגום.
- חבילה 4.3: הושלמה — 7 מקורות פתוחים ו-42 טיוטות תרגום.
- חבילה 4.4: הושלמה — 6 מקורות פתוחים ו-36 טיוטות תרגום.
- חבילה 4.5: הושלמה — 3 מקורות פתוחים ו-18 טיוטות תרגום.
- חבילה 4.6: הושלמה — 2 מקורות פתוחים ו-12 טיוטות תרגום.
- חבילה 4.7: מופתה ונעצרה בשער קליני מוגבר; כפילות אחת הוחרגה.
- חבילה 4.8: מופתה ונעצרה בשער קליני סופי; חמש כפילויות הוחרגו.
- יתרת התור: 36 מקורות Legacy הממתינים לבדיקת מקור ולסקירה קלינית אנושית.
- גל 4 כולו אינו מסומן כגמור עד השלמת היתרה או החלטת החרגה מתועדת עבורה.

## 11. דוח חבילה 4.2

הדוח המלא נשמר ב-`docs/trusted-cbt-wave-4-package-4-2-audit-he.md`.

בחבילה 4.2 שש רשומות Legacy הוחרגו מתרגום לאחר שנוצרו להן חלופות פתוחות, ושבע רשומות רגישות הועברו ל-`review_required` לשערים מאוחרים יותר. לא שונה `is_active` של אף אחת מ-13 הרשומות.

## 12. דוח חבילה 4.3

הדוח המלא נשמר ב-`docs/trusted-cbt-wave-4-package-4-3-audit-he.md`.

בחבילה 4.3 נוצרו שבעה מקורות פתוחים ו-42 טיוטות תרגום. 13 רשומות Legacy סומנו `duplicate/excluded` ושבע מתוכן הוחלפו בחלופות פתוחות; שלוש רשומות רגישות נשארו `review_required`. לא שונה `is_active` של רשומות Legacy.

## 13. דוח חבילה 4.4

הדוח המלא נשמר ב-`docs/trusted-cbt-wave-4-package-4-4-audit-he.md`.

בחבילה 4.4 נוצרו שישה מקורות פתוחים ו-36 טיוטות תרגום. תשע רשומות Legacy סומנו `duplicate/excluded`, ושלוש רשומות רגישות נשארו `review_required`. לא שונה `is_active` של רשומות Legacy.

## 14. דוח חבילה 4.5

הדוח המלא נשמר ב-`docs/trusted-cbt-wave-4-package-4-5-audit-he.md`.

בחבילה 4.5 נוצרו שלושה מקורות פתוחים ו-18 טיוטות תרגום. 15 רשומות Legacy לא־חשיפתיות סומנו `duplicate/excluded`; תשע רשומות חשיפה או חרדת ילדים נשארו לשער הקליני המוגבר. לא שונה `is_active` של Legacy.

## 15. דוח חבילה 4.6

הדוח המלא נשמר ב-`docs/trusted-cbt-wave-4-package-4-6-audit-he.md`.

בחבילה 4.6 נוצרו שני מקורות פתוחים ו-12 טיוטות תרגום. תשע רשומות Legacy סומנו `duplicate/excluded`; שלושה מקורות רגישים נשארו `review_required`. לא שונה `is_active` של Legacy.

## 16. שערי חבילות 4.7–4.8

דוחות השער נשמרו ב-`docs/trusted-cbt-wave-4-package-4-7-clinical-gate-he.md` וב-`docs/trusted-cbt-wave-4-package-4-8-clinical-gate-he.md`.

שתי החבילות מופו במלואן. שש כפילויות פנימיות הוחרגו מתרגום, ו-36 מקורות רגישים נותרו לשער אנושי. לא בוצעו תרגום, הפעלה או מילוי מלאכותי של פרטי סוקר.
