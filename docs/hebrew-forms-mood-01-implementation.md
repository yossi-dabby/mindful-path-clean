# MOOD-01 implementation and release handoff

## Implemented scope

The first unit of PR #9 now has nine blank PDF drafts (12 pages), editable offline
HTML sources, local licensed fonts and separate per-variant review records. Four
age-specific worksheets and four practice sheets share one four-page therapist
guide. The original 154 PDF files and catalog records remain unchanged.

The expanded private catalog contains 163 records: the original 154 plus exactly
the nine MOOD-01 IDs. The administrator can select age → MOOD → MOOD-01 → form,
open/download the real PDF and return to the selected list. All other domains in
PR #9 remain planned; no additional MOOD units or final total are invented here.

## Compatibility during publication

`base44/functions/getHebrewFormsPilot/releases.js` is the common version contract
for Railway, the Base44 function and the browser. Canonical SHA-256 pins all catalog
metadata, original IDs and PDF fingerprints, not just a count. Every PDF is still
checked for header, length and SHA-256 when the server loads it and the client opens it.

| Caller | Endpoint | Result |
| --- | --- | --- |
| Existing application/function | `catalog` | Original pinned 0.2 catalog, 154 forms |
| Updated application/function | `catalog-mood-01` | Pinned 0.3-mood-01 catalog, 163 forms |
| Updated app with old function or old Railway server | Expanded request returns 400/404 | Fetch and validate original catalog; display expansion-pending notice |
| Any caller with expired/revoked permission | Either endpoint | Denied, no fallback |
| Wrong digest, metadata, network failure or server error | Expanded endpoint | Fail closed, no fallback |

This allows frontend, function and Railway deployments to arrive in either order
without making the old 154-form library disappear. Existing clients keep their old
endpoint. The Base44 function still verifies the caller and forwards only their
Bearer token to the fixed Railway service. Workers `redirect: manual`, redirect
rejection, response-size bounds and private/no-store headers remain.

## Validation and remaining acceptance

- All nine source layouts pass blank-field, page-count, font and footer checks.
- Short fictional answers fit; long answers are retained and block printing.
- Rendered all 12 PDF pages and inspected their RTL text, margins and page endings.
- PDFs are A4 with no AcroForm fields; one guide is four pages, eight forms one page.
- Release tests reject replacement/duplicate/missing IDs, changed bytes, hashes,
  titles, tracks, age labels and version; verify the original 154 records exactly.
- Real HTTP/proxy tests cover all 163 PDF fingerprints, both catalogs and permission
  denial. Browser tests cover all age variants, real Open/Download, Back, four-page
  guide, partial deployment and corrupt catalog rejection on desktop and mobile.
- Full CI results belong to the PR; do not treat this checklist as an execution log.
- Clinical and rights reviewers have not signed off; see per-form `review.json`.
- Authenticated live acceptance must occur after merge/sync/Publish. Local fixtures
  substitute identity and service location, so they cannot prove the deployed state.

## After human review and green CI

Merge the PR to `main`, allow Railway to deploy, sync Base44 including the sibling
`releases.js` function module, save the function and Publish. The compatibility
behavior above protects the existing package while these complete.

As administrator, check Railway, Base44 preview and published Base44 separately:
the visible release must be 0.3-mood-01 / 163; all four ages must expose W/P plus the
same guide; open/download one new PDF and compare bytes/SHA-256 to its catalog;
verify Back retains the unit. An expansion-pending notice means an old server or
function is still active, not that the new content has been accepted live.

Public/AI availability stays under revision. This implementation does not approve
patient distribution, grant Premium/therapist access, store responses or complete
the remaining roadmap. The next content step is per-age professional review and
gap review before defining further MOOD units or advancing to SELF.
