# English forms review library — series 02

The administrator library grows from 270 to **648 English forms**, version `0.3-en-series-02`. This wave adds 378 PDFs and 42 editable translation packets. All 270 previously published English PDFs, translation packets and catalog entries are preserved byte-for-byte. Hebrew remains 970 forms across 17 tracks, version `0.18-series-12`; OCDYC remains child-only.

## Content and size

| Tracks | Units per track | New forms | Cumulative forms |
| --- | --- | ---: | ---: |
| Existing: MOOD, SELF, PERF, REG, EXEC | 01–06 | 0 | 270 |
| Social relationships (SOC) | 01–06 | 54 | 324 |
| Sleep (SLEEP) | 01–06 | 54 | 378 |
| Change and loss (CHANGE) | 01–06 | 54 | 432 |
| Family relationships (FAMILY) | 01–06 | 54 | 486 |
| Digital habits (SCREEN) | 01–06 | 54 | 540 |
| Shame and responsibility (SHAME) | 01–06 | 54 | 594 |
| Meaning and values (MEANING) | 01–06 | 54 | 648 |

Each unit has one shared four-page therapist guide and one worksheet and practice sheet for each of children, adolescents, adults and older adults. Age routes show their two forms plus the shared guide. The new PDFs contain **504 A4 pages**. FAMILY adult versions retain their explicit supporting-family role; age alone does not imply parenthood or authority.

All 648 English PDFs total **16,942,682 bytes (16.94 MB)** and remain in `server/private/forms-en/`, outside the frontend/mobile bundle, and are downloaded on demand. The compact root index is approximately 3 KB; the twelve metadata parts total approximately 601 KB, with the largest approximately 51 KB. Each response remains below the unchanged **512 KiB** transport limit. This is metadata splitting, not lazy track loading: the client loads all twelve parts in batches of at most three and displays the library only when the complete release has been verified.

Translation is **draft** and AI-assisted; clinical and rights reviews remain **pending**, with no named reviewer or review date. Technical verification does not constitute clinical approval. Repository content is public under the owner's existing approval.

## Behavior and compatibility

As an administrator, select English → Tools → CBT worksheets → age → track → unit. Coverage is 648/970, with 322 unavailable. Open uses the existing HiDPI reader, fullscreen zoom and touch controls; Download returns the original English PDF. No new viewer or font-size reduction is introduced.

The root endpoint is `catalog-en-series-02`; parts are `catalog-en-series-02-{track}`. Every index and part has an independently pinned SHA-256 digest in the dependency-free shared release contract. Assembly checks the exact track order, part size, release/source versions, counts, unique IDs and source links. Node validates the full release and every PDF on startup. Node and the Base44 proxy recheck administrator access for each request.

If the new root returns 400 or 404 during staggered publication, the client tries the existing 270-form `catalog-en-series-01`, then the original nine-form `catalog-en-mood-03`, and shows the pending-expansion notice. Both older endpoints remain unchanged for older deployed clients. Once the new index exists, a missing or corrupt part is an error: the client never shows a partial library or silently falls back to an older release. Authorization, network and integrity failures stop loading. English never falls back to Hebrew.

Spanish, French, German, Italian and Portuguese remain unavailable and make no review-library requests. Language switching resets navigation, aborts active work and revokes previews; late catalog parts or PDFs cannot reopen English content. The English file allowlist contains exactly 648 IDs. Public forms registration, AI retrieval, agent boundaries, private user entities and schemas are unchanged.

## Reproducibility and checks

- `node scripts/audit-form-sources.mjs`: validates all 970 editable Hebrew sources and fingerprints.
- `node scripts/build-english-pilot.mjs`: audits the unchanged original nine-form release.
- `node scripts/build-english-wave.mjs`: audits the unchanged 270-form series 01, including its 261 original rendering proofs. The shared English directory is checked against the current complete 648-ID allowlist.
- `node scripts/render-english-wave.mjs --wave=series-02 --screenshots`: renders only the 42 new packets with two worker processes. Checks A4 page count, source writing-field dimensions and section order, LTR, loaded fonts, text bounds, footer clearance, blank fields, fictional filling, long-answer print protection and downloaded-answer completeness. It does not install runtime files or overwrite the existing 270 PDFs.
- `node scripts/build-english-wave.mjs --wave=series-02 --install`: installs only current verified renders and records 378 per-PDF proofs in `content/forms-localization/review/en-series-02-qa.json`. Writes the twelve catalogs, root index and generated fingerprint block in `releases.js`.
- `node scripts/build-english-wave.mjs --wave=series-02`: read-only audit of source freshness, packet/renderer provenance, PDF bytes and hashes, previous-release equality, exact inventory, deterministic metadata and per-response transport bounds. `--write` rewrites metadata only after the same checks pass.
- `npx vitest run test/utils/formsLocalization.test.js test/utils/englishFormsPilot.test.js test/utils/englishFormsWave.test.js test/utils/englishFormsWave02.test.js`: source and rendering provenance, both real transports, every PDF open/download, authorization revocation, corrupt/mixed/missing parts, bounded loading, cancellation, and both English fallback generations.
- `npx playwright test --config english-pilot.playwright.config.ts`: original nine downloads, all age routes, high-DPI zoom, language changes, late PDF/part cancellation, unavailable/partial releases, both staged fallbacks and regular-user gating on desktop, tablet and mobile Chromium profiles.
- `npx playwright test --config english-wave.playwright.config.ts --project=reader-desktop`: all 72 units, opening and checking worksheet, practice and guide downloads against source bytes (216 distinct PDFs).
- `npx playwright test --config english-wave.playwright.config.ts --project=reader-tablet --project=reader-mobile --grep representative`: all twelve tracks on both smaller profiles, including four-page guides and horizontal overflow checks.

Local inspection also checks selectable English text, absence of untranslated Hebrew, actual PDF page counts and A4 dimensions for all 378 new PDFs. Visual samples cover all 42 new units, with full-size checks of dense guide pages. CI rerenders the original nine PDFs, all 261 series-01 additions and all 378 series-02 additions, retaining screenshots and QA results for seven days. CI time budgets are expanded for the additional renders and 96 unit-navigation cases; existing checks remain enabled.

The former five-track/270-form default expectations become twelve-track/648-form expectations. Dedicated fallback tests still prove both 270-form and nine-form behavior. No test is skipped and no existing protection is weakened.

## Publication and public verification

The owner merges and publishes the Node/private assets, Base44 function with its shared release pins, and frontend. This PR does not merge or publish production. Publish the complete server release together: a new index without its parts must fail closed. During staged deployment, older English endpoints remain available to older clients, and new clients can fall back only while the new index is absent.

After publication, verify as admin: version `0.3-en-series-02`, 648/970 coverage, twelve tracks and six units each, all age routes, Open/fullscreen/zoom/Download, Hebrew still 970, other languages unavailable, and regular users denied. Verify Base44 and Railway hosts if both are used.

## Final English wave

The owner's requested two-wave division of the 700 forms remaining after PR 30 is:

| Wave | Scope | New forms | Cumulative English forms |
| --- | --- | ---: | ---: |
| Series 02 (this release) | SOC, SLEEP, CHANGE, FAMILY, SCREEN, SHAME, MEANING | 378 | 648 |
| Final (planned) | Shared 36, core 64, anxiety 54, OCD 96, trauma 72 | 322 | 970 |

The final 322 are planned, not completed translations. Their different unit structures and child-only OCDYC route must remain intact. The same source-linked translation and QA process can later support the other five target languages; this release does not claim to complete all seven languages.
