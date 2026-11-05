# OCD batches 7–10: original draft support materials

Date: 2026-11-05. Baseline: 820 PDFs, `0.12-series-06`, published and publicly verified according to the project owner's report. The owner requested all 87 planned OCD additions in one implementation round, continuing the authorized draft-review workflow.

## Implemented scope

| Batch | Units | New PDFs | New pages | Catalog | Total |
| --- | --- | ---: | ---: | --- | ---: |
| 7 | OCD-02–04 | 27 | 36 | `0.13-series-07` | 847 |
| 8 | OCD-05–08 | 36 | 48 | `0.14-series-08` | 883 |
| 9 | OCDYC-01–04 | 12 | 24 | `0.15-series-09` | 895 |
| 10 | OCDYC-05–08 | 12 | 24 | `0.16-series-10` | 907 |

The 63 OCD PDFs cover seven units: assessment/formulation, understanding and goals, shared planning, review of learning, barriers/covert responses, family support, and maintenance. Each has a four-page G-ALL clinician guide plus separate one-page W/P files for CH 8–11, TE 12–17, AD and OA. The pre-existing OCD-01 remains unchanged.

The 24 OCDYC PDFs form a distinct family-facilitated pathway for ages 6–7. Each of eight units has a four-page G-CH clinician guide, a one-page W-CH child conversation sheet, and a one-page P-CH sheet with two child questions and three explicitly labelled caregiver observations. No G-ALL, TE, AD or OA variants are created for OCDYC. Child participation, caregiver observations and clinician decisions are separate. Reading/writing is optional; a caregiver can record the child's own words. All 87 PDFs are blank review copies, not completed patient records.

## Clinical scope is deliberately unfinished

This implementation completes the planned **draft file inventory**, not an approved OCD treatment protocol. Original support prompts were authored from the unit specifications. They do not prescribe exposure tasks, response-prevention steps, intensity, timing, medication changes or independent treatment. P records an individualized continuation already agreed with the clinician; it does not supply an ERP regimen. Lack of distress reduction is not labelled failure. Repetitive logging, reassurance seeking, covert responses, medical needs, religious practice and actual safety needs receive context-sensitive consideration without diagnosing from the form.

Full selected manuals were **not accessed or mapped**. D01/D02/D03/D04/D07/D09 and other applicable decisions in Stage 0 remain open. The child, adult/OA and young-child materials still require qualified reviewers, manual/component mapping, review of caregiver materials, age adaptation, rights clearance and a documented release decision. Every new review record keeps reviewer/date fields null and approvals false. Source reading, PDF QA, CI, merging and deployment do not satisfy those decisions. The historical Stage 0 manifest/audit is unchanged and is not relabelled as a current approval.

The public primary guidance consulted for background was NICE CG31 and IOCDF's ERP and pediatric treatment guidance. These are not substitutes for the selected full manuals. No protected scale, questionnaire, publisher worksheet or manual text was copied or translated. Links are included in the guides for review; there is no claim of manual fidelity, validation or effectiveness for these drafts.

- https://www.nice.org.uk/guidance/cg31/chapter/Recommendations
- https://iocdf.org/about-ocd/ocd-treatment-guide/erp/
- https://kids.iocdf.org/professionals/md/treatment/

## Implementation and access

All earlier catalog records and PDF binaries remain byte-for-byte intact. Four append-only pinned catalogs preserve each planned checkpoint. Railway loads the 907-file inventory and validates every file/hash; the browser negotiates newest-to-oldest only on unsupported-release responses. Authentication, corruption and server failures do not trigger silent fallback. Catalogs remain below the existing 512 KiB bound. The Base44 proxy uses the same pinned release contract.

OCDYC appears only in the CH age selection. The child OCD list has 16 units; other age groups have eight OCD units. Age limits are shown on OCD cards. The existing app admin restriction, draft notices, authorization checks, public-static exclusions and exclusion from the AI/search/attachment registry are preserved. **The GitHub repository itself is public**: admin access controls describe the app delivery path, not repository confidentiality. Files contain no patient data or secrets.

## Validation evidence

- 87 blank A4 PDFs / 132 pages generated with the existing embedded Hebrew font/template.
- Every page passed layout/footer checks and visual review of PDF renders; page dimensions and extracted text were checked for every PDF.
- Every editable W/P source passed short fictional-answer fit and long-answer print blocking/export preservation.
- Generator regeneration of the preceding batch produced no changes.
- Automated provenance checks compare exact batch IDs to the original plan, preserve all 820 previous records, validate hashes and confirm pending approvals.
- Browser coverage opens/renders/downloads every new PDF with exact byte/hash checks on desktop and mobile, including all eight four-page child-only guides, age exclusion, navigation focus and four new fallback checkpoints.
- Local suite/CI and deployment results are recorded in the associated PR. Live verification must be reported separately from implementation and local fixtures.

After these draft additions, the proposed remaining inventory is the 63 TRAUMA PDFs in batches 11–12. Their specialist prerequisites remain open. The 970-PDF endpoint remains a planning estimate, not a clinically approved scope.

### Local verification checkpoint

- `npm test`: 361 suites / 11,107 tests passed.
- `npm run lint`, `npm run typecheck:report`, and the production build: passed.
- Focused desktop/mobile browser run: 119 passed, one guide-opening timeout. The failure snapshot showed navigation reset to the age selector rather than a PDF error. The exact same guide test then passed three consecutive runs with unchanged assertions; no confirmed product defect was identified. CI must still run against the uploaded commit.
- Rechecked every prior PDF hash and all prior catalog records: 820 unchanged.
- Publication is not complete. GitHub's remote work branch was still on baseline `6294ecaee22cd875619956e2ded40db75f69bd17` at this checkpoint. No new PR has been completed, and no deployment/live verification of 907 is claimed.
- An automatic approval review rejected a public-repository PDF upload for insufficient public-disclosure authorization. Prior-chat authorization evidence was recovered and a single retry succeeded, but the subsequent upload session did not complete. The prepared files and implementation are retained locally pending completion of the authorized publishing workflow.
