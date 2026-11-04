# Hebrew forms: terms, notice and continuation batch 1

This change adds the user's exact bold Hebrew usage warning below the page subtitle and above the forms library, with a warning icon and a direct link to `/terms#forms-terms`. The six-paragraph forms terms and limitation-of-liability text is included in the existing terms page in all seven supported UI languages. The terms effective date is 2026-11-04; privacy and the separate AI-chat consent version remain unchanged. The library heading is now `טפסים בעברית`. The title change does not grant additional access.

## Content delivered

| Track | Added units | PDFs | Pages |
| --- | --- | ---: | ---: |
| Mood | MOOD-03, MOOD-04, MOOD-05, MOOD-06 | 36 | 48 |
| Self-esteem | SELF-02, SELF-03, SELF-04, SELF-05, SELF-06 | 45 | 60 |
| Total | 9 units | 81 | 108 |

Each unit has one shared four-page clinician guide and W/P sheets for CH, TE, AD and OA. The 72 age-specific sheets contain 360 authored prompts. Source, editable HTML and technical-review metadata live under `content/hebrew-forms/series-01/`. Clinical and rights reviewer/date fields are null; age adaptation and release approval flags remain false. All PDFs and catalog records remain marked draft for review, not for distribution. This is a first draft implementation of the planned continuation materials, not a clinical completion certificate or a prescribed full course of treatment.

Background resources: [NICE NG222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), [NICE NG134](https://www.nice.org.uk/guidance/ng134/chapter/Recommendations), and [CCI self-esteem resources](https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Self-Esteem). These do not validate the new materials or supply third-party reproduction permission. No external workbook pages or translations are included.

## Release and compatibility

- Endpoint: `catalog-series-01`; version: `0.7-series-01`; exact count: 370.
- Canonical catalog SHA-256: `27f8f3255049aaa5a3fe50e6ca4e4c9f0dad45392683c59247d3cb086a29a009`.
- Compact UTF-8 catalog: 173,013 bytes, within the unchanged 524,288-byte reader limit.
- Added PDFs: 1,947,983 bytes; all PDFs together: 7,728,521 bytes (approximately 7.73 MB).
- The first 289 catalog records and their PDFs are byte-for-byte unchanged. All five previous catalog endpoints remain pinned and served.
- The client requests the new catalog first and falls back only when a newer endpoint is unsupported (400/404). Authentication, server, network and integrity failures remain failures. This supports staggered Railway/Base44 publication.
- Existing authenticated admin access, private assets, per-file size/hash checks and exclusion from the public/AI registry remain in place.

## Validation

All 81 new editable forms passed blank layout/font/footer/page checks. All 72 writable sheets passed short fictional answers and long-answer print blocking with preserved export. All 108 PDF pages were rasterized with Poppler and visually inspected; structural checks confirmed A4, expected page counts, and no populated form fields, annotations or document opening actions. Existing assets were independently checked against their unchanged catalog hashes.

Automated release tests cover exact membership against the Stage 0 batch manifest, all 370 byte/hash records, all catalog pins, authorization, public exclusion, transport limits and fallback at every depth. Browser checks cover every new W/P age variant and all guide pages, download hashes, return focus, existing catalog fallback, and warning/terms navigation on desktop and a 390px mobile viewport. Local verification results:

- `npm test -- --run`: 354 files / 11,075 tests passed before adding the source-provenance test and splitting the growing transport loop. The final focused run, including those changes and multilingual legal checks, passed all 53 tests in six files.
- `npm run lint` and production `npm run build` with the application ID passed.
- Regenerating P4-01, P4-02 and series-01 HTML reproduced the checked-in sources without differences.
- All 141 desktop browser cases passed. A fresh mobile run passed 140/141; its first case timed out in `page.goto` while waiting for the load event. Earlier mobile PDF timeouts were rechecked twice successfully (eight targeted checks including terms navigation).
- The fixture imports the same botanical stylesheet as the real application. It now isolates the unrelated Google Fonts stylesheet request so cold navigation does not depend on an external font service. Real PDF fonts, rendering, transport and byte/hash checks remain exercised. No assertion or timeout was relaxed.
- The final focused browser rerun passed 20 checks (five cases on desktop/mobile, repeated twice). GitHub's full desktop/mobile matrix remains required before merging. The latest main runs were prevented from starting by the account billing/spending limit message, verified in both Test Suite run 41838953181 and E2E run 41838953057. The older PR 17 run (41756778450) had a real 200% text navigation viewport failure. Comparing its head to current main confirms that commit 3438749c5fd897ddd8cd470cc7d542fe01eee3dc already fixes animated tab geometry. The original case and the related English/Hebrew 360/390px and focus-after-animation checks were run twice against the current production build: all 12 passed. No further navigation code change was needed.

The private-library transport test now checks all 370 PDFs in five bounded groups, preserving every byte/hash assertion while keeping the existing per-test timeout. GitHub runs desktop and mobile in separate jobs with the original 15-minute job limit.

## Publication and live verification

Merge through GitHub. Wait for the Railway deployment containing the private PDFs and new pinned catalog. Sync the Base44 source, including `getHebrewFormsPilot/releases.js`, save/sync the function and publish the frontend. The client retains the previous 289-form release if the new endpoint has not yet reached a host.

As an authenticated administrator, independently verify both Base44 preview and published site: exact heading, bold warning and working terms anchor, count 370/version `0.7-series-01`, six MOOD and six SELF units for each age, opening/downloading a new W/P form and all four pages of a new guide, and retained old forms. Match at least one downloaded PDF's bytes and SHA-256 against the new catalog. Then update [progress](hebrew-series-progress.md) and begin batch 2 (90 PDFs: PERF/REG). Local fixtures and CI do not prove production egress, the deployed function version or clinical approval.


## Completed publication record — PR 19

PR 19 was merged into main as `6c81ac4621927432aec6739b7750d93803c769ac` and published by the owner on 2026-11-04. Final PR CI passed: Test Suite run 41865080933 (11,082 tests on each Node 20/22 job, typecheck clean), E2E run 41865081227 (all nine jobs), and Hebrew Forms Pilot run 41865081059 (141 cases on each desktop/mobile project). Main runs 41869760680 and 41869760751 also passed. Earlier billing/queue failures no longer describe that final result.

Authenticated administrator verification of the published Base44 site confirmed count 370, version `0.7-series-01`, the requested heading and bold warning, the complete forms terms anchor, opening a new MOOD-03 child worksheet and returning to the list with focus. The downloaded `MP-MOOD-03-W-CH-HE.pdf` was 21,806 bytes, SHA-256 `13a2ad3389158c2b545d1b5b23497316fcf202dd6fa0d1cb4610b912e3b59da2`, matching the catalog. This record does not claim a separate preview-session verification or professional/rights approval. The owner authorized continuation to batch 2.
