# Stage 4 — Journal UI audit

Requested scope: Journal, every reachable Journal tool, Dashboard, and the Thought Coach / Chat save bridges. Base: `572a183f1d4accef2554b5ede62024d157198066` after merged #1037. Owner review, merge and publication remain separate steps.

## Coverage

The isolated browser fixtures use synthetic account-scoped records and narrow entity/AI/upload endpoint mocks. They do not write production data or replace public artwork/PDF assets. The page matrix covers English/Hebrew, LTR/RTL, light/dark, and widths 360, 390, 430, 768, 1024, 1280 and 1440. The 768×1024 / 1024×768 cases cover portrait/landscape tablet layouts. Additional palette checks cover ocean, sunset, forest, lavender and minimal in light/dark, EN phone / HE tablet. Flow checks cover both languages at each width, including a shorter viewport for the save actions. Both existing desktop and mobile Playwright projects run these tests.

| Surface | Checks |
| --- | --- |
| Journal list | Empty and populated lists; 40 records; six entry types including session summaries; search, no results, clear, type and multiple tag filters; 24 long tags; card actions; direct entry/summary links and View All |
| Record types | Standard CBT, gratitude, anxiety log, mood journal and personal custom template; actual six-step form for every type; confirmed persistence in the isolated fixture and reload; cancellation without writes |
| CBT form | All six steps, rich text and formatting, emotional intensity, manual/AI-assisted patterns, evidence, balanced thought, back/forward retention, goal picker, tags, image/audio preview/removal, invalid upload, narrow/short layout |
| Save states | Held request, pending controls, no premature success/AI request, simulated 503, preserved draft, retry, exactly one successful record; update and reload |
| Full record | Full untruncated situation, preserved strong/emphasis/list content, remaining sections, practice tasks, partial optional ratings, AI summaries/reflections, result text contrast and exercise/goal links |
| Delete | Browser-owned confirmations: cancel, failed request with retained card and visible error, retry and successful removal for records and session summaries |
| Templates | Four built-ins, all 21 existing catalog names, custom template create/edit/delete, cancel, failed save/delete and retry; built-in customization also covered by the existing Journal suite |
| Reminders | List, create/edit, type/frequency/time/message fields, nested chooser/Escape, save failure/retry, active toggle failure/rollback/retry, delete cancel/confirm |
| AI tools | Prompts error/retry, four cards, regeneration, selection and prefilled form; trends 7/30/90 selection, error/retry, all six result sections and long results; presentation with synthetic AI output |
| Dashboard | 14/30/90/all ranges, exact statistics, missing ratings excluded, chart canvases and active tooltip bounds, theme contrast, numeric direction, empty state and return to Journal |
| PDF | Actual record and summary downloads, PDF headers, localized print headings/taxonomy/date/direction/footer in seven languages, safe literal-text rendering; exported pages rendered for visual inspection |
| Thought Coach | Actual four-step route, retained inputs, long reflection, selected emotions, confirmation, failure/retry, Home destination and saved Journal card |
| Chat save bridge | Journal New Entry retains `/Chat?intent=thought_work`; the actual save-offer component is mounted using the existing isolated Stage 2 fixture; structured extraction response, failed save/retry and resulting Journal card |

## Coverage map and status semantics

“Passed” below means isolated browser assertions passed in the local verification runs listed below. Production writes, physical-device behavior and live agent triggering remain explicitly blocked or untested below. A source-only reachability result is not counted as a browser pass. The local report carries final run totals; repeated runs are not added together as unique coverage. GitHub CI is pending the owner-authorized upload.

| Screen → child | State | Viewports | Language / theme | Evidence / status |
| --- | --- | --- | --- | --- |
| Journal / Dashboard / Thought Coach → page shell | Populated / partial records, responsive charts | All seven requested widths | EN+HE × light+dark | `journal-stage4-audit`; passed locally |
| Journal → shared cards / Templates | Five additional palettes | 390×768, 1024×768 | EN+HE × light+dark | `journal-stage4-audit`; passed locally |
| Journal → list / full card / filters | 40 records, 24 long tags, mixed rich text, no search results | 360 / 768 / 1440 | EN+HE; phone dark, tablet/desktop light | `journal-stage4-entries` |
| Journal → manual form → steps 1–6 | Five types; cancel, rich formatting, images/audio, narrow reduced height, linked goal | 360 / 768 / 1440, height down to 420 | EN+HE; phone dark, others light | `journal-stage4-types` |
| Journal → shared manual form / generated results / tools | Complementary light-phone / dark-tablet/desktop flow, all six CBT steps, result text contrast, nested chooser | 360 / 768 / 1440 | EN+HE; complements the main functional suites to cover both modes | `journal-stage4-theme-flows` |
| Journal → manual form → save | Held request, 503, retained draft, retry, reload, one successful record | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-save` |
| Journal → card / summary actions | Edit, native cancel/confirm, failed deletion/retry, actual PDF download, direct links | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-actions` |
| Journal → four tools / nested chooser | Tab containment, opener return, Escape/selection return from nested picker | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-dialogs` |
| Journal → Templates / Reminders / Prompts / Trends | CRUD, failures/retry, toggle rollback, catalog, generated long results | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-tools` |
| Journal / Dashboard → data / summary | Pending load, 503, retry, pending AI, failed regeneration retaining old summary | 360 / 768 / 1440 | EN+HE; phone/desktop dark, tablet light | `journal-stage4-loading` |
| Dashboard → ranges / statistics / tooltip | 14/30/90/all, missing values, exact paired statistics, tooltip bounds, empty and back | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-dashboard` |
| Thought Coach / actual Chat save component → Journal | Four steps, retained fields, failed save/retry, resulting record | 360 / 768 / 1440 | EN+HE; phone dark, others light | `journal-stage4-bridges` |
| Journal → PDF print content | Localized titles, taxonomy, direction, escaping, missing ratings | Printable A4; actual downloads in actions suite | Seven languages; paper export | `journalExportHtml` unit + exported-page visual inspection |
| Published Journal / tools → empty introductions | Read-only access | Available desktop browser | Prior live observations below | Observed on pre-publication build; **not final live verification** |
| Legacy source-only components | `ThoughtCoachWizard`, `JournalAutoRun`, `JournalInsightsPanel`: no current incoming route/usage found | Source reachability only | N/A | **Not applicable to reachable UI coverage; not counted as visited** |
| Therapeutic Forms library (Stage 5) | Existing `under_revision` / standby | Not enabled | N/A | **Unavailable by owner instruction; not counted as passed** |
| Live Chat agent → save offer | Actual conversational offer triggering | Live service | Requires designated QA account | **Not verified** by component fixture |
| Published mutations / native phone/tablet | Persistence, keyboard, rotation, download/audio integration | Physical devices | EN+HE light/dark | **Pending publication and device checks** |

## Findings addressed

- Focused entry/summary links follow router location changes. View All → browser Back restores the focused record, and Forward returns to the full list; the previous one-time query parsing left the list inconsistent with the address.
- Loading queries no longer seed an empty list as successfully loaded data. Journal and Dashboard retain a loading indicator until the initial request resolves; failed requests expose an announced, readable error and retry. Summary regeneration exposes its failure while retaining the prior summary, and pending/error colors follow the active theme.
- Five Journal overlays use the existing focus-managed `PremiumDialog`. They contain keyboard focus, restore it to a stable opening control and keep the header and body within the viewport. A template/prompt selection returns focus to its main Journal opener after the intermediate tool unmounts.
- Quill fields are associated with their visible labels. Formatting buttons have localized names in all seven languages, themed glyphs and touch-sized controls. Editor setup waits for the portal-mounted card; each step resets the body scroll.
- Mobile card actions wait for the menu's close/focus lifecycle before opening an editor or native confirmation. This avoids overlapping pointer/focus locks. Other uses of `MoreActions` retain their default behavior.
- New records no longer show “Entry saved” or start saved-entry AI suggestions before the server confirms the write. Optimistic cache updates use the account-scoped query key, and errors restore snapshots while keeping the draft available.
- Failed record/summary deletion remains visible and retryable. Optimistically unmounting the card previously discarded the card's mutation error state; the existing summary toast also had no mounted Sonner outlet in the tested app. The confirmed-delete flow keeps inline error feedback in the card.
- Dashboard charts fit the available width instead of requiring 500–560px canvases. Axes, legends and tooltip text use the current theme. Active tooltips are bounded inside the chart rather than extending beyond a small phone screen.
- Missing optional ratings remain missing instead of being converted to measured zero. Explicit numeric zero remains a recorded value. Paired statistics and card badges use the same presentation helper.
- Expanding a record now displays the full formatted situation. The previous full-record view still clamped that field to two lines. The new HTML sink uses the form's existing sanitization policy.
- AI result panels and practice suggestions use theme surfaces instead of pastel/white panels with near-white text. Normal-text contrast checks cover the result data, not only empty/loading views.
- The public exercise catalog uses placeholder data while loading. Its previous fresh empty initial data prevented the matching Browse Exercises link from appearing. Private AI-context queries and prompts are unchanged.
- Long tags wrap in cards/forms and filters; attachment removal is available on touch without hovering. Audio uploads have an actual preview/removal control, and removing then reselecting the same file works.
- Session summaries have an explicit list filter. Print exports use the selected application language, date locale and document direction; old exports retained hard-coded English headings. User-entered content is rendered as escaped text, including literal angle brackets and URLs.

## Reproduction and priority

| ID / severity | Location and steps | Before → expected / corrected behavior |
| --- | --- | --- |
| J01 / High | Templates → Use → complete form → hold or fail POST | “Entry saved” and AI calls occurred before acknowledgement → remain pending; preserve draft on failure; one confirmed record after retry |
| J02 / High | Open each Journal tool, Tab repeatedly, Escape | Focus escaped into the background → contained focus and return to the opening control |
| J03 / High | Reminders → Create → Frequency → Escape or choose Weekly | Closing nested picker could strand focus on body → return to Frequency, keep parent open, Tab remains inside |
| J04 / Medium | Phone → entry More actions → Edit / Delete | Menu close lifecycle competed with modal/confirmation → complete menu dismissal before action and restore stable opener |
| J05 / Medium | Record or summary → Delete → fail DELETE | Optimistic removal unmounted the local error → retain visible card/error and allow retry |
| J06 / Medium | Narrow Dashboard with populated records → hover chart | Forced 500–560px charts/tooltip extended past available width → responsive canvas and bounded tooltip |
| J07 / Medium | Dashboard and record card with null ratings | Missing value became zero and affected aggregates → exclude missing values; preserve explicitly recorded numeric zero |
| J08 / Medium | Full record with a long formatted situation | Expanded situation remained clamped → full sanitized rich text is readable |
| J09 / Medium | Dark AI results / pending summary / errors | Fixed pastel surfaces or dark text lost contrast → theme surfaces and readable foreground; measured normal-text contrast ≥4.5 |
| J10 / Medium | Six-step form → Quill toolbar / screen reader | Unnamed small format buttons, unassociated editors → localized names, 44px controls and visible-label association |
| J11 / Medium | Form step 5 → attach image/audio → remove and reselect | Removal depended on hover; audio had no preview/removal → visible controls, audio preview, same-file reselection; save waits for upload |
| J12 / Medium | Slow initial Journal/Dashboard request; failed summary regeneration | Empty list could appear loaded; regeneration failure was hidden behind old summary → explicit loading/error/retry, retain existing summary |
| J13 / Low | 24 long tags; session-summary filter; export in HE | Overflow and missing filter; fixed English print headings → wrapping, summary filter, localized print content/direction |
| J14 / Medium | Open `/Journal?summary=…` → View All → browser Back / Forward | URL changed but focused list did not → router-aware query parsing restores the matching view, with exact card counts asserted |

## Live observations and limits

Earlier Stage 4 live inspection used the owner's **admin account**, rather than the approved disposable QA user. That inspection was read-only: empty Journal, templates and the 21-item catalog, the blank CBT form's first step, empty reminders and its blank create form, AI prompt/trend introduction, empty Dashboard and the return link. No records, reminders, exports, AI generations or emails were created on that account.

The live form/tool overlays left focus on the background page; the live Quill toolbar had unnamed buttons. These observations support the isolated before/after regressions. Saved records, mutations, AI results and failure states in this report are isolated-fixture evidence, not production persistence evidence.

New Entry currently starts Chat thought work. Direct manual forms are reached from templates, AI prompts and editing; that product behavior is preserved. All five manual types currently use the same established six-step form. No additional clinical flows were invented.

`ThoughtCoachWizard`, `JournalAutoRun` and `JournalInsightsPanel` exist in source but have no incoming usage found from the current routes. They are not claimed as visited subpages. The Chat test covers the actual save component and entity bridge; it does not prove that a live agent emits the save offer at the correct conversational point.

## Local verification and release boundary

Initial locally verified implementation revision: `9735f241302d409e148f5796978414433fd89dd4`. The subsequent CI follow-up is described below; use the PR head/checks for the final revision.

- Full local Stage 4 / existing Journal / Coach regression run: **242 passed**, no skips or flakes.
- Final affected actions, dialogs and complementary theme flows: **36 passed**. This includes the new Back/Forward assertions and normal-text contrast checks in generated result bodies. Twenty-four cases overlap the broad run; the union is **254 distinct passing browser cases**, not 278 unique cases.
- Full final-source unit suite: **11,041 passed; 267 existing skips** across 343 passing files and 8 skipped files.
- Final-source lint, typecheck and production build passed. Build used a non-production test app ID. Existing Browserslist/Quill deprecation notices remain; no dependency changes are bundled.
- Comparative visual captures: main after #1037 versus the Stage 4 changes, EN/light and HE/dark at 360/768/1440. Both 6-case capture runs passed; settled chart frames, form placeholder alignment and sample PDFs were visually inspected.
- New history assertions reproduced the defect before the router fix. The complementary light form results measured 4.36:1 before strengthening the generated body copy. The threshold remains ≥4.5:1.
- A complementary picker test initially sent the parent Escape while the closed Vaul drawer was still mounted and held focus. The inspected DOM showed the parent still aria-hidden. It now requires the picker to be hidden and focus to return to Frequency before the unchanged single-Escape parent-dismissal assertion. The explicit nested-Escape/focus checks remain.

### Initial CI follow-up

The first desktop matrix reported 655 passed, 188 existing skips and two failures in the selected-emotion contrast assertion. The downloadable artifact contained only the dev-server log: the screenshot artifact upload failed because an existing Stage 3 Progress screenshot name included a Radix ID containing colons. The filename now replaces non-portable characters; its assertions and test coverage are unchanged.

A local diagnostic recorded active `color` / `background-color` transitions after selecting the emotion. The intermediate Hebrew frame measured 1.12:1, while the final light and dark states passed the unchanged 4.5:1 assertion. The production fix changes both emotion and distortion chips from `transition` to `transition-shadow`, so text and background change together. Immediate before/after diagnostics passed in EN/dark and HE/light after the fix, with no active color transitions. No contrast threshold, assertion, retry count or skip was changed. The Journal test helper still delegates to the original contrast assertion without an animation wait.

The initial full mobile matrix passed: 657 passed, 188 existing skips. After the production correction, a clean local 16-case run passed with no skips/retries: the two originally affected theme combinations plus Progress screenshot portability flows, across both Playwright projects and repeated twice. Final-source unit tests again passed (11,041 passed / 267 existing skips), along with lint, typecheck and build. The immediate-transition diagnostics are additional targeted evidence, not extra unique cases in the 254-case coverage total above.

### Mobile Escape follow-up

The first mobile attempt of run 5053 was canceled at the 30-minute job budget. A later full rerun completed with 656 passed, 188 existing skips and one failure: `Stage 3 progress and mood tabs he/1440` in the mobile project. The downloaded failure snapshot retained the Mood dialog with focus on the Low mood button after a single Escape. The screenshot artifact upload now succeeds after the filename correction above.

Six unmodified local repeats passed, so the natural CI timing was not reproduced locally. A controlled test then suppressed only document-level capture listeners for Escape, leaving the real keyboard event and React dialog handlers intact. It failed before the fix at the same dialog-dismissal assertion. `DetailedMoodForm` now opts into the existing `PremiumDialog` local Escape handling; focus containment, one-Escape dismissal, focus restoration and no entity writes pass even with the document listener unavailable. Other dialogs' default behavior and the original failing assertion are unchanged.

The final focused regression run passed **40/40** with no skips or retries: existing Progress/Mood flows at all three representative widths plus the controlled Escape cases, in both Playwright projects and repeated twice. These cross-stage regression runs are separate from the 254-case Journal coverage count. The CI job budget is now 40 minutes to accommodate the full unchanged suite, setup and artifact upload; no test timeout, assertion, retry or skip was loosened. Final-source validation also passed again: 11,041 unit tests with 267 existing skips, lint, typecheck and production build.

**GitHub handoff:** on 2026-10-29 the owner explicitly authorized publishing these changes to a test branch in the public `yossi-dabby/mindful-path` repository and opening a PR to `main`. Local validation above is separate from GitHub CI; consult the PR checks for remote results. Merge and app publication remain owner actions.

The Therapeutic Forms library remains `under_revision`, on standby as the owner requested. Its catalog/content status, installed-files activation and download availability were not enabled by this work.

Screenshots and downloaded fixture PDFs are test artifacts. No new skip/fixme or forced click is added. Existing source-contract assertions were updated to match the focus-managed dialog and responsive chart implementation; behavior is covered by the expanded browser tests.

After owner merge/publication, recheck the deployed Journal with the designated QA user. Physical phone/tablet keyboards, rotation, browser download handling and native audio playback remain device checks; viewport resizing does not prove those behaviors.

**Stage 1 item 9 remains OPEN:** the deferred live save/network failure and retry is not closed by the mocked Journal tests. The separate Stage 2 live consent/conversation work also remains separate.

Last updated: 2026-10-29.
