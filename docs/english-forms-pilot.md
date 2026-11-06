# English forms review library — series 01

The English administrator library grows from 9 to **270 forms**. This wave adds 261 PDFs and 29 editable translation packets. MOOD-03's nine previously published PDFs and catalog entries are preserved byte-for-byte. Hebrew remains 970 forms across 17 tracks, version `0.18-series-12`; OCDYC remains child-only.

## Content and size

| Track | Units | English forms |
| --- | --- | ---: |
| Mood (MOOD) | 01–06 | 54 |
| Self-worth (SELF) | 01–06 | 54 |
| Perfectionism (PERF) | 01–06 | 54 |
| Emotion regulation (REG) | 01–06 | 54 |
| Executive functioning (EXEC) | 01–06 | 54 |

Each unit has one shared four-page therapist guide and one worksheet and practice sheet for each of children, adolescents, adults and older adults. Age routes show their two forms plus the shared guide. The 261 new PDFs contain 348 A4 pages. All 270 English PDFs total **7,041,550 bytes (7.04 MB)**; the compact runtime catalog is 249,829 bytes. PDFs stay in `server/private/forms-en/`, outside the frontend/mobile bundle, and download on demand.

The release is `catalog-en-series-01`, version `0.2-en-series-01`, with coverage 270/970 and 700 unavailable. The old `catalog-en-mood-03` endpoint remains pinned to its original nine forms. Translation is **draft**, clinical and rights reviews are **pending**, with no named reviewer or review date. The content has not received clinical approval.

## Behavior and boundaries

As an administrator, select English → Tools → CBT worksheets → age → track → unit. Open uses the existing HiDPI reader, fullscreen zoom and touch controls; Download returns the original English PDF. No new PDF viewer or font-size reduction is introduced.

If the new English endpoint returns 400 or 404 during staggered publication, the client tries the existing nine-form English release and shows the pending-expansion notice. Authorization, network and integrity failures stop immediately. English never falls back to Hebrew. Spanish, French, German, Italian and Portuguese remain unavailable and make no review-library requests. Language switching resets navigation, aborts active work and revokes previews; late responses cannot reopen them.

Node and the Base44 proxy recheck administrator access. Only the 270 explicitly pinned English IDs are accepted. Catalog fingerprints, PDF sizes and SHA-256 checks remain enforced. There are no changes to the public forms registry, AI retrieval, agent boundaries, user entities or schemas. Repository content is public under the owner's existing approval.

## Reproducibility and checks

- `node scripts/audit-form-sources.mjs`: all 970 editable Hebrew sources and fingerprints.
- `node scripts/build-english-pilot.mjs`: the original nine-form release stays unchanged.
- `node scripts/render-english-wave.mjs --screenshots`: renders the 29 new packets with two worker processes. Checks A4 page count, source writing-field dimensions and section order, LTR, loaded fonts, text bounds, footer clearance, blank fields, fictional filling, long-answer print guard and downloaded-answer completeness. This does not install runtime files.
- `node scripts/build-english-wave.mjs --install`: installs only renders whose packet and renderer/style/print-guard fingerprints match current inputs; records 261 per-PDF proofs in `content/forms-localization/review/en-series-01-qa.json`. The existing nine PDFs are never overwritten.
- `node scripts/build-english-wave.mjs`: read-only audit of all source links, packet/render provenance, PDF hashes, legacy equality, exact file inventory, deterministic catalog and transport size bound. `--write` rewrites catalog metadata only after these checks pass.
- `npx vitest run test/utils/formsLocalization.test.js test/utils/englishFormsPilot.test.js test/utils/englishFormsWave.test.js`: source freshness, inventory, both real transports, every PDF open/download, authorization revocation, corruption, cancellation and same-language fallback.
- `npx playwright test --config english-pilot.playwright.config.ts`: original nine downloads, age routes, high-DPI zoom, language changes, cancellation, unavailable releases, staged-release fallback and regular-user gating in desktop, tablet and mobile Chromium profiles.
- `npx playwright test --config english-wave.playwright.config.ts --project=reader-desktop`: all 30 units, opening and byte-checking worksheet, practice and guide downloads (90 distinct PDFs).
- `npx playwright test --config english-wave.playwright.config.ts --project=reader-tablet --project=reader-mobile --grep representative`: all five tracks on both smaller profiles, including four-page guides and horizontal overflow checks.

Local PDF inspection additionally checks selectable English text, absence of untranslated Hebrew, actual PDF page count and A4 size for all 261 new files. Visual review samples cover every new unit, with full-size checks of dense guide pages. Clinical/rights review remains separate and pending. CI rerenders all new forms and retains screenshots and QA results for seven days.

The prior one-track/one-unit/nine-form expectations are updated to five tracks/six units/270 forms. Dedicated fallback tests retain the original one-track/one-unit/nine-form expectations. Assertions are not skipped or weakened.

## Publication and public verification

The owner merges and publishes the Node/private assets, Base44 function (including shared release pins), and frontend. This PR does not merge or publish production. During staged deployment the old English catalog remains available to old clients; new clients can use the same-language fallback.

After publication, verify as admin: 270/970 coverage; five tracks; six units in each; all age routes; Open, fullscreen/zoom and Download; Hebrew still 970; another language unavailable; regular users denied. Verify both Base44 and Railway hosts if both are used.

## Remaining English waves

| Wave | Scope | New forms | Cumulative English forms |
| --- | --- | ---: | ---: |
| Series 01 (this release) | MOOD, SELF, PERF, REG, EXEC | 261 | 270 |
| Next | SOC, SLEEP, CHANGE, FAMILY, SCREEN | 270 | 540 |
| Following | SHAME, MEANING, OCD, TRAUMA | 276 | 816 |
| Final | Original shared/core/anxiety content | 154 | 970 |

These are planned scopes, not completed translations. Before the next cumulative release, implement catalog splitting if needed: the existing 512 KiB transport limit must remain intact. The builder deliberately fails above this bound. The same source-linked packet and QA workflow can then be reused for the remaining five target languages; this wave does not claim to complete all seven languages.
