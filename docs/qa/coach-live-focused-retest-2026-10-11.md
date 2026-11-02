# Coach live QA — 2026-10-11
Environment: Mindful Path QA 6acaa67868bf347e2329540e / editor Preview / Coach.
Code under test: eca70c64eb88e9d60cb43ec5bf3a6f6218a50bc6.
Browser tests executed by Codex through actual wizard and UI. Model remains Automatic. Main app unchanged.

## Focused retest results
- PT: wizard opened chat automatically; opener had conversational outline without multi-day homework. One-step: "Lê um parágrafo de um livro após o trabalho." Refusal: two short sentences, no task. Review: two PT sentences, no new task; causal explanation could be more tentative.
- FR: wizard opened automatically; review remained in French, two sentences, no Spanish fallback or new task. The original rendering substitution was not reproduced. Review still leans toward excluding reading itself; opener called older Thursday example the last occasion without reliable chronology.
- IT: conversational outline, no multi-day notes/observation. One-step: "Leggi una sola pagina del libro che hai scelto." Passed one target action. Opener had two closely related questions instead of one.
- EN: one-step "Read one page of your book right after work." One action, no extra day-selection/setup; 'right' adds unnecessary immediacy and remains minor wording issue. Opener longer than desired, multiple questions.
- ES: resumed after browser reauthentication; wizard opened chat automatically. Short three-item outline, no note-taking or multi-day observation. Final question assumes the user decided not to read; this was not established.

## Assessment
Navigation and opening hydration passed live. Focused French language/rendering failure passed live retest. Separate setup actions and multi-day homework removed in focused IT/ES retests.
Do not mark seven-language quality fully closed: evidence calibration, assumptions, opener length/question count and subtle timing remain documented. DE and HE were not rerun by Codex in this focused browser retest (prior user tests available).
No external human linguistic or clinical signoff claimed. No main promotion performed.
