# English forms review pilot — MOOD-03

PR 28 completed source parity and the offline English draft review packet. This follow-up connects those nine PDFs to the existing administrator library. It does not complete the translation of all 970 forms.

## Available content

- English catalog: `catalog-en-mood-03`, version `0.1-en-mood-03`.
- Four worksheets and four practice sheets: children, adolescents, adults, older adults.
- One shared, four-page therapist guide; each age route shows its two forms plus this guide.
- Coverage: 9 of 970 source forms; 961 English forms remain unavailable.
- The nine PDF files total 232,827 bytes. They are copied byte-for-byte from the PR 28 reviewed render, with selectable text and embedded fonts.
- Translation remains **draft**; clinical and rights reviews remain **pending**, without a named reviewer or review date. No clinical approval is implied.
- Hebrew remains 970 forms, 17 tracks, version `0.18-series-12`. OCDYC remains child-only.

## Behavior and boundaries

Select English in the application and open Tools → CBT worksheets while signed in as an administrator. Navigate age → mood → MOOD-03. The page explicitly reports the available and untranslated counts. Open uses the same HiDPI PDF reader, fullscreen zoom and touch controls as Hebrew; Download saves the original English PDF.

Catalogs are loaded only for the selected language. An unavailable or corrupt English endpoint never falls back to Hebrew. Spanish, French, German, Italian and Portuguese display a localized unavailable message and make no review-library requests. Switching language resets navigation, aborts active work and revokes the previous preview URL; late responses cannot reopen it.

Both the Node API and Base44 proxy recheck administrator access. English file IDs are limited to the nine pinned IDs. Catalog fingerprints, PDF sizes and PDF SHA-256 checks are enforced. The existing endpoint/function names remain unchanged for deployed Hebrew clients. PDFs stay under `server/private/forms-en/`, outside `public/` and the frontend bundle; they download on demand. There is no new public registry, AI retrieval, agent access, user entity, or schema change. The repository itself is public under the owner's existing approval.

## Validation and release

- `node scripts/audit-form-sources.mjs` checks all 970 editable sources and source fingerprints.
- `node scripts/build-english-pilot.mjs` verifies deterministic English catalog metadata against the source map and committed PDFs; `--write` is only for intentional catalog updates. Update the release pin if the catalog changes.
- `npx vitest run test/utils/englishFormsPilot.test.js` exercises the real Node and Base44 handler transports, every English PDF, auth revocation, language isolation and corruption handling.
- `npx playwright test --config english-pilot.playwright.config.ts` covers compiled-app navigation, all nine downloads, full-screen rendering, all age routes, live language changes, pending-response cancellation, missing translations and regular-user gating on desktop, tablet and mobile Chromium profiles.
- Existing Hebrew transport/release and PDF reader suites continue to cover Hebrew compatibility and touch gestures.

Publish the Node/private-asset release and the updated Base44 function and frontend through the established owner workflow. During a staggered release, an older server reports English unavailable; Hebrew retains its existing release fallback behavior. No merge or production publication is performed by this change.

After owner publication, verify English as admin on the public site: nine-form coverage, each age route, Open, fullscreen/zoom, Download; switch to Hebrew (970), then an untranslated language. Verify a regular user still cannot access review content. Check both the Base44 and Railway hosts if both are in use.

The former browser assertion that **English** must be unavailable now checks **Spanish**, which remains unavailable. New English tests prove its allowed behavior and preserve the no-request assertion for regular users and all five unsupported languages.
