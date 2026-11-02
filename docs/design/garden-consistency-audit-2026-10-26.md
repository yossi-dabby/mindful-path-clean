# Garden visual consistency review — 2026-10-26

The screenshots showed a saturated mint sidebar beside a watercolor garden, almost empty tool cards, and an unrelated background inside Home's daily path. This revision keeps the approved garden and brings the surrounding UI into the same visual language.

## Changes

- Sidebar, mobile drawer, bottom navigation and notification button share warm neutral and sage surface tokens. The active destination has a distinct fill, border and indicator.
- Tools has six illustrated choices, short descriptions in all seven supported languages, and a balanced 3/2/1-column desktop/tablet/phone layout. Cards remain complete links with visible keyboard focus.
- Generic Card and CardHeader no longer insert decorative images into every instance. Intentional illustrations remain on the hub and page headers. The obsolete header padding and repeated landscape rules were removed.
- Home's daily choices are separate readable cards with the shared garden visible between them. Its greeting illustration stays in layout instead of being positioned with negative offsets. My Path no longer reserves a blank decorative footer.
- Exercise recommendations, catalog cards and exercise details use quiet card surfaces. The old mint background image and saturated turquoise panel fills were retired; actual exercise thumbnails and media are retained.
- Progress metrics and charts use neutral surfaces, with metric and trend colors retained. Tablet metrics have two columns and the main tabs have enough room for their labels.
- Goals, Videos, Coach and Resources let header actions wrap below the title. The resource guide also stacks its copy and action when the sidebar leaves limited space. Games keeps its header count below the title on tablets. This fixes narrow columns of single letters that passed earlier document-overflow tests.
- Game recommendations stack on narrow tablets, and the game info button reserves space only beside the metadata instead of narrowing the entire title and description.
- The starter-path personalization overlay uses the shared modal material and can scroll on short screens. Journey headers use the route illustration instead of a rectangular duplicate of the garden.

## Review boundaries

This revision changes frontend styling and its CI validation environment, against `main` at `180a7a2348a4fb0a2190695404489b0923ade83d`. No entities, agents, backend functions, authentication configuration, payments or Android version metadata were changed. No site publication, main-branch merge or store upload is part of this branch.

Browser checks use mocked APIs. They verify layouts and interactions with representative data, not live authenticated records or native Android/iOS rendering. Route-width checks cover registered routes and public/account routes; screenshot review covers the main user-facing screens in desktop, tablet and phone layouts, including Hebrew examples. This does not establish visual coverage of every possible account/data state.

## Validation

- Lint and production build passed.
- Unit suite: 336 files passed, 11,004 tests passed; 267 existing skips.
- Broad browser run: 107 cases passed, including 44 route checks at 360/768/1440, seven-language hubs, chat layer regressions, journal/coach overlays and games/journeys/progress/resource flows.
- Final build recheck: 64 browser cases passed across desktop Chrome and the Pixel 5 mobile project. These include the additional tablet word-width checks, the resource guide, game card copy, quiet exercise surfaces, dark mode and the seven-language tools grid.
- Visual matrix: 72 screenshots (18 screens in English and six in Hebrew, each at 390/768/1440), plus 24 final focused screenshots for the last exercise/resource/progress/game corrections. No uncaught page errors or document overflow were reported in those captures.
- Browser download endpoints were unavailable in this sandbox. Local browser checks used Chromium 153 from a temporary serverless browser package; the repository dependency files and Playwright configuration were not changed for this workaround.
- An initial dark-surface assertion sampled a color transition in progress. It now waits for the existing transition to settle; the contrast threshold is unchanged.

## Representative screens

| Screen | Desktop | Tablet | Mobile (Hebrew) |
| --- | --- | --- | --- |
| Tools | [Desktop](garden-consistency/tools-desktop.webp) | [Tablet](garden-consistency/tools-tablet.webp) | [Mobile](garden-consistency/tools-mobile-he.webp) |
| Home | [Desktop](garden-consistency/home-desktop.webp) | — | [Mobile](garden-consistency/home-mobile-he.webp) |
| My Path | — | [Tablet](garden-consistency/my-path-tablet.webp) | — |


Additional tablet corrections: [Resources](garden-consistency/resources-tablet.webp), [Progress](garden-consistency/progress-tablet.webp), [Games](garden-consistency/games-tablet.webp). [Exercises on mobile (Hebrew)](garden-consistency/exercises-mobile-he.webp).

## Follow-up CI and navigation contrast verification

Pinned the Playwright workflow to Ubuntu 24.04 after `ubuntu-latest` selected Ubuntu 26.04, which the installed Playwright 1.58.2 could not prepare. The subsequent GitHub run completed browser installation and passed the critical smoke checks; desktop and mobile each passed 322 cases, with one stale contrast-test selector failing in each.

The contrast test now measures visible navigation text, including active/inactive labels and descriptions, over composited ancestor backgrounds at 390/768/1440 on Settings and Tools. The 4.5:1 threshold is unchanged. This reproduced a 4.16:1 active mobile label before the correction. Navigation text now uses darker palette tokens, and both desktop and mobile contrast checks pass. Representative screenshots were refreshed after the text-color correction.

Local follow-up: 38 of 40 accessibility/garden cases passed in the combined run. Two timed-out cases passed in an isolated serial rerun without changing their assertions or the application. The new contrast assertion passed in both browser projects. See PR #1029 checks for the latest full GitHub run.
