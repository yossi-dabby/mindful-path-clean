# English forms review library — complete English catalog (series 03)

The administrator library now contains **970 of 970 English forms**, version `0.4-en-series-03`. This final wave adds **322 PDFs and 41 editable translation packets**. The 648 previously published English PDFs, packets and catalog entries remain unchanged. All 970 Hebrew sources and PDFs remain unchanged, across 17 tracks, version `0.18-series-12`.

## Final wave content

| Track | Source structure retained | New forms |
| --- | --- | ---: |
| Shared | Getting started, assessment, sessions and follow-up | 36 |
| Core | CORE-01–08; CORE-01 and CORE-08 have a guide and four practice sheets | 64 |
| Anxiety | ANX-01–06, nine forms per unit | 54 |
| OCD | OCD-01–08, nine forms per unit; OCDYC-01–08, three child-only forms per unit | 96 |
| Trauma | TRAUMA-01–08, nine forms per unit | 72 |
| **Total additions** | **41 packets; 436 A4 pages** | **322** |

Normal nine-form units contain a four-page therapist guide and a worksheet and practice sheet for each of children, adolescents, adults and older adults. Shared forms retain their original audience and age mappings. CORE-01 and CORE-08 do not acquire invented worksheets. All 24 OCDYC files remain restricted to children aged 6–7, including the child-specific guides. Trauma's separate child/adolescent and adult/older-adult pathways and professional-review limitations remain explicit.

The complete English collection has 113 translation packets and 970 PDFs totaling **25,646,779 bytes (25.65 MB)**. PDFs remain in `server/private/forms-en/`, outside the frontend/mobile bundle, and are downloaded on demand. The root index references 17 metadata parts; the largest is **91,452 bytes**, below the unchanged **512 KiB** response limit. The client loads all parts in batches of at most three and displays the library only after the complete release is verified.

Translation is **draft** and AI-assisted; clinical and rights reviews remain **pending**, with no named reviewer or review date. Completing the English inventory is not clinical approval. Repository publication of PDFs and translation sources has the owner's authorization. No real client information is included.

## Behavior and compatibility

As an administrator, select English → Tools → CBT worksheets → age → track → unit. Coverage is **970/970, zero untranslated forms**. Shared unit names display in English while preserving internal source identity. Open uses the existing HiDPI reader, fullscreen zoom and touch controls; Download returns the original English PDF. Source field dimensions and font sizes are preserved.

The root endpoint is `catalog-en-series-03`; parts are `catalog-en-series-03-{track}`. Each index and part has an independently pinned SHA-256 digest in the shared release contract. Assembly checks exact track order, part size, versions, counts, unique IDs and source links. Node validates the release and every PDF on startup. Both Node and the Base44 proxy recheck administrator access for each request.

Only an absent root (400 or 404) permits staged fallback: **970 → 648 → 270 → 9**. The three older endpoints and their published entries remain intact. Older releases show the pending-expansion notice. Once an index exists, a missing or corrupt part is an error; no partial library or silent fallback is shown. Authorization, network and integrity failures stop loading. English never falls back to Hebrew.

Spanish, French, German, Italian and Portuguese remain unavailable and make no review-library requests. Language changes reset navigation, abort active work and revoke previews; late responses cannot reopen English content. The English allowlist contains exactly 970 IDs. Public forms registration, AI retrieval, agent boundaries, private user entities and schemas are unchanged.

## Reproducibility and checks

- `node scripts/audit-form-sources.mjs`: checks all 970 Hebrew source fingerprints.
- `node scripts/build-english-pilot.mjs`, `node scripts/build-english-wave.mjs`, and `node scripts/build-english-wave.mjs --wave=series-02`: audit all three preserved English releases and their provenance.
- `node scripts/render-english-final.mjs --screenshots`: renders the 41 final packets with two workers. Handles both original inline-style templates and later external-style templates. Checks A4 page counts, source writing-field dimensions and section order, LTR, loaded fonts, text bounds, footer clearance, blank fields, fictional filling, long-answer print protection and answer-download completeness. Does not install runtime files or overwrite old PDFs.
- `node scripts/build-english-final.mjs --install`: installs only verified final renders and writes 322 proofs to `content/forms-localization/review/en-series-03-qa.json`, plus 17 catalogs, the root index and release fingerprints.
- `node scripts/build-english-final.mjs`: read-only audit of source freshness, packet/renderer provenance, PDF bytes and hashes, previous-release equality, exact inventory, deterministic metadata and response bounds. `--write` regenerates metadata only after the same checks.
- `npm test`: includes source parity, complete 970-file transport checks, authorization, release integrity, fallback, bounded loading and cancellation tests.
- `npx playwright test --config english-pilot.playwright.config.ts`: reader controls, language isolation, original nine downloads, age routes, all three fallback generations, partial releases, late responses and regular-user denial on desktop, tablet and mobile Chromium profiles.
- `npx playwright test --config english-wave.playwright.config.ts --project=reader-desktop`: all 72 preserved units; worksheet, practice and guide downloads checked against source bytes. Tablet/mobile use `--grep representative` to cover all twelve preserved tracks.
- `npx playwright test --config english-final.playwright.config.ts --project=reader-desktop`: all 41 final units, opening and byte-checking every form for the selected age, including shared forms, short core units, young-child guides and four-page guides. Explicit tests exclude OCDYC from adolescent/adult/older-adult routes. Tablet/mobile use `--grep representative` for all five new tracks and exceptional unit structures.

Independent PDF inspection verifies selectable English text, absence of untranslated Hebrew, page counts and A4 sizes across all 322 additions (436 pages). Visual PDF samples include dense guide pages, older-adult worksheets, shared assessment and young-child practice sheets. CI retains all previous render and UI checks, adds final-wave checks, and uploads rendered review artifacts for seven days. Original rendering scripts and styles remain unchanged so the 648 earlier proofs remain valid.

## Publication and public verification

The owner merges and publishes the Node/private assets, Base44 function with its shared release pins, and frontend. This PR does not merge or publish production. Publish the complete server release together: a new index without its parts must fail closed. Older endpoints remain available during staged deployment.

After publication, verify as admin: version `0.4-en-series-03`, 970/970 English coverage, 17 tracks, all age routes, child-only OCDYC, short core units, Open/fullscreen/zoom/Download, Hebrew still 970, other languages unavailable, and regular users denied. Verify each hosting path used by the application.

The owner's requested two-wave completion after PR 30 is now implemented: series 02 added 378 forms (648 cumulative), and series 03 adds the final 322 (970 cumulative). Professional review remains a separate pending step; this release does not claim completion of the other five target languages.
