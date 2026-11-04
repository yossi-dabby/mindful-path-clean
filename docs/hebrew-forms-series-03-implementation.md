# Hebrew continuation series — batch 3 implementation

This batch extends the 460-form release verified by the project owner after PR 20 with 90 original blank draft PDFs: EXEC-02–06 and SOC-02–06. The result is 550 PDFs in catalog `0.9-series-03`, served at `catalog-series-03`. Each of the ten units has a four-page shared clinician guide and separate one-page W/P sheets for CH, TE, AD and OA: 120 new pages. New PDF payload: 2,186,551 bytes (2.19 MB decimal).

## Scope and content

EXEC continues from the existing first unit through task breakdown/time, environmental supports/reminders, emotion and avoidance, persistence/adjustment, and a supported independent routine. SOC continues through listening/checking interpretations, requests/refusal/negotiation, disagreement, initiating/maintaining relationships, and applying learning across relationships. Each guide includes purpose, selection and limits, references to existing material, a fictional example, five discussion prompts, anticipated difficulties, age/caregiver adaptations, practice guidance, reflection and background sources.

The authored source is [series-03](../content/hebrew-forms/series-03/README.md). Its 400 questions distinguish ages and unit purposes; it does not reproduce or translate a proprietary workbook. NICE, NHS inform and CCI provide background, not validation of all age variants or authorization to reproduce their worksheets. No full OCD or trauma treatment sequence is added. Clinical/rights review fields remain unassigned and approvals false. Terms of use do not change those statuses.

## Release behavior

All seven prior catalogs, their pins and 460 PDF binaries remain unchanged. The new catalog appends 90 records and is selected first by the client. A 400/404 unsupported endpoint falls back through previous releases, including the verified 460-form release; authentication, network, server and integrity errors still stop the request. Canonical catalog SHA-256: `2161a1405dcf80f1c844542fd29e7f054711df8db6d3ad04b49a904f7d850d91`. The compact catalog is 257,331 bytes, below the unchanged 512 KiB transport bound.

Railway validates every catalog and all 550 file hashes at startup. Both request routes retain per-request administrator authorization, private/no-store responses and PDF byte/hash checks. Assets stay outside the public/AI forms registry. Existing warning text, terms, title and back-navigation behavior are preserved.

## Validation and publication

- Exact membership matches Stage 0 batch 3: ten units, 90 IDs and 120 pages.
- All 90 editable sources passed blank layout, font and footer checks; all 80 W/P sheets passed short fictional-answer and long-answer print/export checks.
- PDF structural checks and visual inspection covered all 120 rendered pages; representative pages were also read at full size.
- Full repository suite: 357 files / 11,091 tests passed, including all 550 PDFs through the Base44-compatible handler. Lint and typecheck passed.
- Production build passed with the configured Base44 app ID.
- The browser suite covers 245 cases per desktop/mobile project: all new age variants and guides, exact downloaded bytes/hashes, back navigation, existing units, permission/error behavior, and fallback through all prior releases. Final execution results are recorded in the pull request and its CI checks.

This implementation is not yet merged, published or verified on the live app. After merge, allow Railway to deploy, sync/save the Base44 function and publish the app as in previous batches. In authenticated preview and published sessions, verify version `0.9-series-03`, count 550, both six-unit EXEC/SOC lists, a new W/P sheet and four-page guide, exact downloaded PDF bytes/hash, back navigation and the existing warning/terms link. Local fixtures cannot establish the live Base44/Railway transport result.

For rollback, use the prior application release while keeping historical catalogs/assets available. Do not delete private PDFs or change existing pins to make a mismatch pass. Batch 4 (SLEEP-02–06 and CHANGE-02–06, 90 proposed PDFs) follows publication and live verification of this batch.
