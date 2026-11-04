# Hebrew continuation series — batch 2 implementation

This batch extends the verified 370-form release with 90 original blank draft PDFs: PERF-02–06 and REG-02–06. The result is 460 PDFs in catalog `0.8-series-02`, served at `catalog-series-02`. Each of the ten units has a four-page shared clinician guide and separate one-page W/P sheets for CH, TE, AD and OA: 120 new pages. New PDF payload: 2,180,387 bytes (2.18 MB decimal).

## Scope and content

PERF continues from the existing first unit through standards/costs, fear of mistakes, a planned low-risk flexibility experiment, starting/checking/finishing, and maintenance. REG continues through emotion/need/context, response options, expression and boundaries, repair after conflict, and maintenance. Each guide includes purpose, selection and limits, references to existing material, a fictional example, five discussion prompts, anticipated difficulties, age/caregiver adaptations, practice guidance, reflection and background sources.

The authored source is [series-02](../content/hebrew-forms/series-02/README.md). Its 400 questions distinguish ages and unit purposes; it does not reproduce or translate a proprietary workbook. CCI and NHS information pages provide background, not validation of all age variants or authorization to reproduce their worksheets. No full OCD or trauma treatment sequence is added. Clinical/rights review fields remain unassigned and approvals false. Terms of use do not change those statuses.

## Release behavior

All six prior catalogs, their pins and 370 PDF binaries remain unchanged. The new catalog appends 90 records and is selected first by the client. A 400/404 unsupported endpoint falls back through the previous releases, including the verified 370-form release; authentication, network, server and integrity errors still stop the request. Canonical catalog SHA-256: `f3323fdd4ff058bfbc98db5857481383a2bb84b6bc5d99eae5a1313af9f92f1f`. The compact catalog is 215,312 bytes, below the unchanged 512 KiB transport bound.

Railway validates every catalog and all 460 file hashes at startup. Both request routes retain per-request administrator authorization, private/no-store responses and existing PDF byte/hash checks. Assets stay outside the public/AI forms registry. Existing warning text, terms, title and back-navigation behavior are preserved. Build support for optional fictional-example/difficulties sections leaves generated older HTML unchanged.

## Validation and publication

- Exact membership matches Stage 0 batch 2: ten units, 90 IDs and 120 pages.
- All 90 editable sources passed blank layout, font and footer checks; all 80 W/P sheets passed short fictional-answer and long-answer print/export checks.
- PDF structural checks and visual inspection covered all 120 rendered pages; representative pages were also read at full size.
- 48 focused release, transport, permission, provenance and integrity tests passed, including all 460 PDFs through the Base44-compatible handler.
- Full repository suite: 356 files / 11,087 tests passed. Lint and typecheck passed.
- The 193 browser cases per desktop/mobile project are being completed before PR handoff; results will be recorded here.

This implementation is not yet merged, published or verified on the live app. After merge, allow Railway to deploy, sync/save the Base44 function and publish the app as in previous batches. In authenticated preview and published sessions, verify version `0.8-series-02`, count 460, both six-unit PERF/REG lists, a new W/P sheet and four-page guide, exact downloaded PDF bytes/hash, back navigation and the existing warning/terms link. Local fixtures cannot establish the live Base44/Railway transport result.

For rollback, use the prior application release while keeping historical catalogs/assets available. Do not delete private PDFs or change existing pins to make a mismatch pass. Batch 3 (EXEC-02–06 and SOC-02–06, 90 proposed PDFs) follows publication and live verification of this batch.
