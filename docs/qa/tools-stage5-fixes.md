# Stage 5 Tools fixes

Baseline: `fe8faf62271f4e13413fd205859afbbcbf44a1bc` (Journal PR #1038).

This change addresses the 13 findings from the October 29 Tools audit. It keeps
Therapeutic Forms in `under_revision` and preserves existing routes, schemas,
backend functions, clinical prompts, safety filters and user data access.

| Finding | Result | Regression coverage |
| --- | --- | --- |
| T01 Expansion cannot finish | Completion and clean restart | All four EN/HE and light/dark game flows |
| T02 Exercise View narrow header/tabs | Header and actions use separate rows on narrow content; tabs use readable rows | Seven viewport widths, all five tabs, mixed long text |
| T03 Game instructions dark contrast | Theme foregrounds and primary action foreground | All 29 info dialogs, EN/HE, light/dark |
| T04 Value Compass choice contrast | Theme surfaces and explicit foreground; selected state | Dark choice contrast and full game flow |
| T05 Escaping keyboard focus | Accessible modal shells for Community, ThoughtCoach/GoalCoach and Coach wizard | Tab, Shift+Tab, Escape, opener restoration and nested category drawers |
| T06 Feed horizontal overflow | Shrinkable heading layout and RTL back arrow | Seven widths, EN/HE, light/dark |
| T07 English-only UI copy | New interface copy in all seven supported languages | Key/interpolation parity and actual EN/HE flows |
| T08 Silent playlist creation failure | Localized alert, retained draft, retry and pending guard | Simulated 503 then one successful create |
| T09 Loading failures look empty/missing | Separate loading, empty, missing ID and transport errors | Delayed GET, 503 and successful retry; playlist/coach load states |
| T10 Lost game opener focus | Remember actual opening control, including info-to-play transition | Every game closes to its opener; keyboard-only and info bridge |
| T11 Indistinguishable memory cards | Unique numbered names, hidden/revealed/matched state | No hidden identities exposed; complete game and restart |
| T12 Small difficulty controls | Minimum 44px targets, localized labels, pressed state | Measured bounds and accessible names |
| T13 Additional text contrast | Theme-aware benefits, tips, feed filters, media actions and community stats | Computed text contrast on visible states |

Additional gaps closed: video title/category search, category filtering, no-result
feedback, unavailable audio/video messages and retry, playlist membership loading
and rollback feedback, and real synthetic WAV/WebM playback/completion/download
checks in Chromium. Playlist and Community editing actions absent from the
existing interface remain not applicable; no new server contracts are invented.

## Running the coverage

```sh
npm ci
npm run lint
npm run typecheck
npm test
VITE_BASE44_APP_ID=test-app-id npm run build
npx playwright test -c stage5.playwright.config.ts
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:5185 npx playwright test -c stage5.shared.playwright.config.ts
```

The standard desktop/mobile Playwright matrix also imports the focused Stage 5
regressions from `tests/e2e/tools-stage5-regressions.spec.ts`. For an externally
installed browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` on the isolated runners.
`STAGE5_ARTIFACT_ROOT`, `STAGE5_EVIDENCE_DIR` and `STAGE5_RUN` control evidence
locations without committing generated screenshots into the repository.

The browser fixtures use synthetic users and mocked entity/AI responses, while
public UI assets and the small WAV/WebM fixtures resolve as real files. A passed
observation collector records that it ran; explicit layout, contrast, focus,
error/retry and mutation assertions provide the corresponding regression gates.
The report keeps observations and functional success separate.

Physical software keyboards, actual device rotation/touch, native iOS media,
screen-reader operation, production persistence and live AI quality remain
separate checks. Earlier live-only follow-ups from Stages 1/2 remain open. No
personal account writes were performed to close them using fixtures.
