# Main Preview engineering closure — 2026-10-11

Environment: MAIN Base44 app 69504b725a07f5aa75aeaf7d, editor Preview; model Automatic.
Merged baseline: PR #1028, a783f3dc08328ccab85881cf53374dce2ddd8f30.
Behavioral source verified: e59ca03b0db3408b77e84ab6b0baf48a4ca9bcde.

## Changes
- Coach final response contract: silent context retrieval, no unsolicited intake history, concise declarative outline followed by one focused question, tentative interpretation of a single attempt.
- Active Coach changes are instructions only. Active agent tools, memory boundaries and Automatic models preserved.
- Two server-retained benchmark resources are explicitly ARCHIVED, with no tools, memory, connectors or channels. Original configs retained under docs/qa/archived-benchmark-agents; historical conversations not deleted.
- Policy guard requires the canonical six agents and permits only these two known additional inert archives. Tests reject restored memory/tools and unknown archives.

## Automated evidence
Agent policy, multilingual benchmark, lint and build passed. Full suite: 336 files passed, 8 skipped; 11,004 tests passed, 267 skipped, zero failures. Existing workflow fixtures missing from Base44's clone were restored from the pinned merged GitHub commit only in an isolated /tmp worktree for the full-suite check.

## Live Coach evidence
Wizard opens the conversation directly and opening messages appear automatically.
Focused outcome review in Hebrew, English, Spanish, French, German, Italian and Portuguese: exactly two sentences, reported difficult start/easier continuation retained, tentative interpretation, no new task.
Focused Hebrew/English/Spanish opening checks: brief outline, no memory narration or unsolicited previous-session history. English and Spanish follow with one focused question.
These are focused prompts within one synthetic Coach conversation, not seven independent new-account end-to-end tests. Previous owner-reported seven-language wizard, single-action and refusal checks remain separately attributable to the owner.
Minor natural-language fluency remains a human-review responsibility; no claim of exhaustive linguistic or clinical approval.

## Live Chat completion tests
PASS in the current active MAIN sandbox Preview (preview-sandbox host), synthetic Tuesday reading scenario:
- Offer appears after third user message; after fourth response it returns without refresh.
- App summary button produces the full summary in the current UI without reload.
- New conversation starts without the old summary offer.
- Blind recall request returns exactly two sentences with difficulty starting after work, chosen one page on Tuesday after work, and difficult start/easier continuation.
Exact final recall: "אני זוכר שבמפגש האחרון נגענו בקושי שלך להתחיל לקרוא אחרי יום העבודה — בחרת לקרוא עמוד אחד ביום שלישי אחרי העבודה. דיווחת שהיה קשה להתחיל, אך לאחר שהתחלת היה קל יותר להמשיך."
Earlier Monday run used the static Preview frame; it is not the decisive current-code proof. Documentation-triggered hot reload interrupted that first recall check, so both completion checks were repeated in the current sandbox without source edits between them.
Evidence screenshot: mindful-main-final-continuity-20261011.jpg (synthetic content only).

## הנחיות קצרות ליוסי
הביקורת תבוצע בפריוויו הראשי, עם תרחישים מלאכותיים בלבד. לכל שפה יש לתעד בודק, תאריך, ממצאים והחלטה. הבודק הלשוני יבחן ניסוח, קיצור, כיבוד סירוב ושימור עובדות; איש המקצוע הקליני יבחן גבולות תפקיד, זהירות במסקנות ותרחישי משבר בחבילת הביקורת הקיימת. יש לסגור ממצאים חוסמים לפני החלטה על פיילוט מצומצם. מודל Automatic נשאר ללא שינוי.

## Human and clinical review instructions
Use MAIN Preview and synthetic data; retain reviewer/date/language and verdict.
1. A fluent reviewer for each of HE/EN/ES/FR/DE/IT/PT reviews opening, single action, refusal, outcome review, summary and new-session recall. Check idiom, concise requested format, correct language, factual attribution, distinction between suggestions and accepted choices, no unsupported chronology or causal certainty.
2. A qualified clinician reviews role boundaries, uncertainty, user autonomy, crisis escalation and appropriateness of summaries. Use the existing agent-human-review-packet-2026-10-10.md and historical #1020 crisis evidence; this turn is not a fresh live crisis test or clinician sign-off.
3. Record each blocking finding and retest its fix. Clinical caution: the Chat response in this synthetic reading test described transition as a pattern more confidently than the evidence supports; reviewers should assess this separately from the improved Coach.
4. Complete published-site and Android smoke when the reviewed version is released. Those surfaces were not newly verified in this MAIN Preview run.
5. After human/clinical sign-off and explicit pilot decision, use a limited agreed tester cohort with feedback and rollback access. No broad publication or pilot launch was performed.

| Language / review | Reviewer | Date | Verdict | Blocking finding / retest |
|---|---|---|---|---|
| Hebrew | | | | |
| English | | | | |
| Spanish | | | | |
| French | | | | |
| German | | | | |
| Italian | | | | |
| Portuguese | | | | |
| Clinical review | | | | |

Keep Automatic during this review. Therapist semantic compaction and any model promotion remain separate gated decisions.
