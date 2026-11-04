# Hebrew continuation series — batch 4 implementation

This batch extends the 550-form release verified by the project owner after PR 21 with 90 original blank draft PDFs: SLEEP-02–06 and CHANGE-02–06. Catalog `0.10-series-04`, at `catalog-series-04`, contains 640 PDFs. Each of ten units includes a four-page shared clinician guide and one-page W/P variants for CH, TE, AD and OA: 120 new pages. New PDF payload: 2,206,816 bytes (2.21 MB decimal).

## Content and limits

SLEEP continues through conditions for rest, a flexible evening routine, worry/arousal, daytime functioning/support, and maintaining useful adaptations while seeking further assessment. CHANGE covers changing reactions/needs, identity/roles, memory/meaning by choice, routines/relationships, and significant dates/continued support. Guides include purpose, limits, reuse of existing material, a fictional example, discussion questions, anticipated difficulties, age/companion adaptations, practice and reflection.

The [authored source](../content/hebrew-forms/series-04/README.md) contains 400 distinct age-specific questions. NHS and Child Bereavement UK pages supply background; no source worksheet or proprietary translation was reproduced. These drafts are neither a complete CBT-I program nor a prolonged-grief or trauma-processing protocol. They do not prescribe sleep restriction, medication changes, grief stages, a deadline for grief or compulsory disclosure/rituals. Clinical/rights reviewers and dates remain null; approvals remain false. Terms of use and technical validation do not change those statuses.

## Release behavior

All eight previous catalogs, their pins and 550 PDF binaries remain unchanged. The new catalog appends 90 records and is selected first by the client. Unsupported 400/404 endpoints fall back through previous pinned releases; authentication, network, server and integrity errors still stop the request. Canonical catalog SHA-256: `f2363efdb1485e965eeb1d73a8d845657d6cfc354b4b0353e4ba8bea392a9dcf`. The compact catalog is 298,638 bytes, below the unchanged 512 KiB bound.

Server startup verifies all nine catalogs and 640 PDF hashes. Administrator authorization, private/no-store responses and file byte/hash checks remain in place. Assets remain outside the public/AI forms registry. Warning text, terms, title and back navigation are unchanged.

## Validation

- Exact Stage 0 batch 4 membership: ten units, 90 IDs, 120 pages and 400 distinct prompts.
- All 90 sources passed layout/font/footer checks; all 80 W/P sheets passed short fictional-answer and long-answer print/export checks.
- Structural checks covered all PDFs (A4, expected page count, no populated fields, annotations or opening actions). All 120 pages were rendered with Poppler and visually inspected, with full-size child, older-adult and guide checks.
- Production build, lint and typecheck passed. Repository test totals and browser execution results are recorded in the PR and its CI checks.
- Browser coverage increases from 245 to 297 cases per desktop/mobile project (594 total), including each new age variant/guide, byte-exact downloads, focus/back navigation, prior releases, authorization and integrity failures.

The pilot CI job budget increases from 15 to 20 minutes to accommodate 90 additional render checks and 52 additional browser cases per project. The previous desktop job took about 14 minutes 40 seconds. Individual browser test timeouts remain 30 seconds; no assertions, integrity checks or permission checks were removed or relaxed.

## Publication and continuation

This batch is not yet merged, published or verified live. After merge, allow Railway deployment, sync/save the Base44 function and publish as in prior batches. In authenticated preview and published sessions verify 640 forms, version `0.10-series-04`, six units in both SLEEP/CHANGE, a new W/P sheet and four-page guide, downloaded bytes/hash, back navigation and the existing warning/terms link. Fixture tests cannot establish the live Base44/Railway transport result.

For rollback, use the prior application release while retaining historical catalogs and assets. Do not delete PDFs or change pins to suppress an integrity mismatch. Batch 5 follows publication and live verification: FAMILY-02–06 and SCREEN-02–06, another 90 proposed PDFs. The remaining 330-form proposal includes unresolved specialist scope and review decisions; 970 is a planning estimate, not a frozen clinical scope.
