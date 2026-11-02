# גל 3 — דוח הרחבת חבילת הפיילוט לחמש שפות

תאריך: 2026-09-07  
אפליקציה: Mindful Path  
Base44 App ID: `69504b725a07f5aa75aeaf7d`

## תוצאה

- נוצרו 100 גרסאות מתורגמות חדשות בחמש שפות.
- `Psychoeducation`: 50 רשומות — 10 לכל שפה.
- `TrustedCBTChunk`: 50 רשומות — 10 לכל שפה.
- שפות היעד: ספרדית `es`, צרפתית `fr`, גרמנית `de`, איטלקית `it` ופורטוגזית `pt`.
- כל רשומה מקושרת למקור האנגלי באמצעות `source_record_id` ולמשפחת התרגום באמצעות `translation_group_id`.
- כל הרשומות מסומנות `source_language: en` ו-`variant_language` זהה לשפת היעד.
- לא שונו רשומות המקור באנגלית, הרשומות בעברית או תוכן Production קיים.

## מטריצת היקף

| שפה | Psychoeducation | Trusted CBT | סה״כ | מצב |
|---|---:|---:|---:|---|
| ספרדית (`es`) | 10 | 10 | 20 | draft / pending / inactive |
| צרפתית (`fr`) | 10 | 10 | 20 | draft / pending / inactive |
| גרמנית (`de`) | 10 | 10 | 20 | draft / pending / inactive |
| איטלקית (`it`) | 10 | 10 | 20 | draft / pending / inactive |
| פורטוגזית (`pt`) | 10 | 10 | 20 | draft / pending / inactive |
| **סה״כ** | **50** | **50** | **100** | **לא זמין למשתמשים** |

## חבילת Psychoeducation

אותן עשר יחידות פיילוט הורחבו לכל שפה:

1. Avoidance and Short-Term Relief
2. Behavioral Activation Basics
3. Cognitive Distortions
4. Grounding: What It Is and When It Helps
5. Rumination vs Reflection
6. Self-Compassion Under Stress
7. Shame vs Guilt
8. Sleep, Stress, and the Brain
9. The Anxiety Cycle
10. Worry vs Problem Solving

כל גרסה כוללת כותרת, Summary, Content, Key concepts, Example scenarios, Tags, Goal types, Mood targets, When to use ו-Contraindications בשפת היעד. שדות `source`, `evidence_base` והסיווג הטכני נשמרו מרשומת המקור. מערכי הקשרים לתרגילים ולמשאבים נשארו ריקים עד לאישור ותכנון קישורים.

## חבילת Trusted CBT

אותן עשר קבוצות המקור הפתוחות מגל 2 הורחבו לכל שפה:

1. `trusted-cbt-open::cbt-model`
2. `trusted-cbt-open::thinking-patterns`
3. `trusted-cbt-open::decatastrophising`
4. `trusted-cbt-open::thought-record`
5. `trusted-cbt-open::case-map`
6. `trusted-cbt-open::socratic-questions`
7. `trusted-cbt-open::coping-choice`
8. `trusted-cbt-open::sleep-architecture`
9. `trusted-cbt-open::stress-response`
10. `trusted-cbt-open::emotion-acceptance`

בכל גרסה נשמרו `source_name`, `source_type`, `license_status` וייחוס המקור האנגלי. שדות Safety notes ו-Contraindications הותאמו לשפת היעד. הרשומות המוגנות הקיימות של Beck Institute, Guilford ומקורות מותאמים אחרים לא שימשו כמקור ולא שונו.

## בקרות סטטוס ובטיחות

- כל 50 רשומות Psychoeducation הן `status: draft`.
- כל 50 רשומות Trusted CBT הן `is_active: false`.
- כל 100 הרשומות הן `translation_status: draft`.
- כל 100 הרשומות הן `clinical_review_status: pending`.
- `reviewed_by` ו-`last_reviewed_date` לא מולאו באופן מלאכותי.
- לא הופעל fallback שקט לאנגלית.
- לא בוצעה הפעלה, פרסום או אישור קליני.

## אימות נתונים רוחבי

| בדיקה | תוצאה |
|---|---:|
| רשומות Psychoeducation | 50 |
| רשומות Trusted CBT | 50 |
| רשומות חסרות/לא תקינות בשדות החובה שנבדקו | 0 |
| כפילויות של translation group באותה שפה | 0 |
| רשומות Psychoeducation שאינן draft | 0 |
| רשומות Trusted CBT פעילות | 0 |
| אי-התאמות בין language ל-variant_language | 0 |
| קישורי מקור חסרים | 0 |

## נקודות שחזור

נשמר Checkpoint לאחר כל שער שפה:

1. Spanish pilot drafts
2. French pilot drafts
3. German pilot drafts
4. Italian pilot drafts
5. Portuguese pilot drafts

## שער שחרור

אין להפעיל אף אחת מ-100 הרשומות לפני:

1. בדיקה לשונית אנושית נפרדת לכל שפה.
2. בדיקה קלינית ובטיחותית לכל יחידה.
3. אימות רישוי וייחוס בתצוגה למשתמש.
4. מילוי Reviewer ותאריך בדיקה על ידי בודק שביצע את הסקירה בפועל.
5. שינוי סטטוס ל-`approved` רק לאחר האישור.
6. אימות אחזור לפי locale מדויק וללא fallback לאנגלית.
7. הפעלה מדורגת של רשומה אחת בכל פעם.

## בדיקות ריפו

לפי הנחיית הפרויקט, לא הורצו E2E או Test Suite מקומיים. בוצעו רק `git diff --check` ו-build של Production.
