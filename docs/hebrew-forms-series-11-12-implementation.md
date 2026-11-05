# TRAUMA batches 11–12: original draft support materials

Date: 2026-11-05. Baseline: the 907-file OCD implementation in PR #25, commit `81d4c39d4a63c5c12094f8d3bceb6c3316e3c948`. The owner requested the final 63 TRAUMA files and took responsibility for transfer/merge/publication. The owner subsequently confirmed PR #25 was merged, published and verified on the public site at 907 forms / `0.16-series-10`. This change prepares the next reviewable increment; it does not assert a production deployment of 970.

| Batch | Units | New PDFs | New pages | Catalog version | Total PDFs |
| --- | --- | ---: | ---: | --- | ---: |
| 11 | TRAUMA-02–04 | 27 | 36 | `0.17-series-11` | 934 |
| 12 | TRAUMA-05–08 | 36 | 48 | `0.18-series-12` | 970 |

Each unit has one four-page G-ALL clinician guide and eight one-page sheets: W/P for CH, TE, AD and OA. All 63 files are blank A4 review copies. There are 280 original age-specific questions. The pre-existing TRAUMA-01 and all other 907 catalog entries and PDF binaries remain intact. Exact new IDs match batches 11 and 12 of the historical Stage 0 manifest.

## Content and model boundaries

The seven units address shared assessment/planning, understanding responses/support, meaning/formulation, support around clinician-directed trauma work, avoidance/generalization, relationships/beliefs/sharing, and integration/follow-up. Their numbering is not a session schedule.

CH/TE support prompts relate to the proposed TF-CBT pathway; AD/OA support prompts relate to the proposed CPT pathway. Each guide's second page explicitly separates the two models, provides a caregiver-work section and explains W/P use. Its third page provides four distinct age adaptations. Existing guides keep their original generated output. Caregiver suitability, ongoing protection needs, the young person's voice and limits of information sharing are considered throughout the new units, not deferred to unit 7.

TRAUMA-05 does **not** provide trauma-narrative, exposure or independent processing instructions. It records choice, understanding and learning around work separately planned by a qualified clinician. TRAUMA-06 does not infer that a situation is safe or prescribe an exposure hierarchy or dosage. TRAUMA-07 AD/OA explicitly names safety, trust, power/control, esteem and intimacy, but five opening questions are **not** a complete five-domain CPT intervention. No written trauma account is made mandatory. P records an already agreed continuation, not an independent treatment regimen. No copied scale, publisher worksheet or manual text is included.

These 63 files complete the **proposed draft file inventory**, not clinical completion of either trauma model. The selected full manuals have not been accessed or mapped. D01, D05, D06, D07 and D09, and applicable scope/release decisions, remain open. Qualified clinical and age reviewers must determine fidelity, suitability, necessary caregiver materials and whether separate model/age guides or additional deliverables are needed. The 970-file inventory may therefore change after professional review. All reviewer/date fields remain null and clinical, age, rights and release approvals remain false. The historical Stage 0 decision records are unchanged.

Public primary background sources read on 2026-11-05:

- NCTSN: https://www.nctsn.org/interventions/trauma-focused-cognitive-behavioral-therapy
- TF-CBT developers/certification program: https://tfcbt.org/about/
- US VA National Center for PTSD: https://www.ptsd.va.gov/professional/treat/txessentials/cpt_for_ptsd_pro.asp

These overviews inform the distinction between pathways; they are not full manuals, rights clearance or validation of the new Hebrew drafts. The attempt to read NICE NG116 returned HTTP 403, so it is not represented as a reviewed source for this batch.

## Integration and compatibility

Two append-only catalogs retain the 934 and 970 checkpoints. The final compact transport is 462,042 UTF-8 bytes, below the unchanged 524,288-byte bound. Canonical SHA-256 pins:

- `0.17-series-11`: `9d99d240cd502ed924b0b31bc8a6242a6220191461a10545db12c269acfb9adb`
- `0.18-series-12`: `372f57f6667b01c524f1e6f9dbb7e9ac86a50ab683b340681f4c109b297d3230`

The private server loads and validates 970 PDFs. The browser requests series-12 first and falls back through the existing pinned generations only for unsupported-release responses; authorization, corrupt data and server failures remain errors. The unchanged Base44 proxy uses the same pins. Trauma now has eight units for each age, with model/age labels displayed on cards. OCDYC remains child-only.

App delivery remains administrator-only and marked as draft review. No entity, permission, agent, safety-filter, public forms index, AI retrieval or attachment integration changes are included. The GitHub repository is public: app access restrictions do not imply source-repository confidentiality. There are no patient records in these files.

## Validation and handoff

- All 63 PDFs / 84 pages passed blank A4/page-count, embedded-text and layout/footer checks. All 84 rendered PDF pages were visually reviewed.
- Every editable W/P source passed short fictional-answer fit and long-answer print blocking with export preservation.
- Provenance checks cover exact planned IDs, all four ages, nine files per unit, pending approvals and preservation of all 907 previous records/hashes.
- Browser tests cover all 63 new PDFs on desktop/mobile, four-page guide rendering, exact downloaded bytes/hashes, navigation focus and fallback to 907/934 during staggered publication.
- Local test/build results and remote CI state are recorded in the associated PR. Local test fixtures are not authenticated production verification.

For publication after the predecessor: merge the reviewed increment into main, confirm the matching Railway deployment, sync Base44, refresh the `getHebrewFormsPilot` function with the shared release pins, publish, and verify 970 / `0.18-series-12` as an administrator at the public URL. Verify each age has eight trauma units and sample guides/W/P PDFs open and download. Retain draft status until professional approvals are actually recorded. The owner is supervising these publication steps; this document does not claim they occurred.

### Local verification checkpoint

- `npm test`: 362 suites / 11,109 tests passed.
- `npm run lint`, `npm run typecheck:report` and `npm run build`: passed.
- Focused desktop/mobile Playwright run: 146 tests passed, including every new PDF and all older-release fallback checkpoints selected by the run.
- Regenerated all 12 preceding editable-source batches (P4-01/P4-02 and series-01–10): no differences.
- Independently rechecked all 907 preceding PDF byte lengths and SHA-256 values: unchanged.
- Compared the final catalog to all 970 IDs in the proposed manifest: exact membership, none missing.
- PR #25 is now merged as `3570eb6cfaf62fc0d9439fc6da15d0a7e7bd2020`; its tree matches the tested 907-file baseline. This increment is based on that main revision.
- Remote CI and public deployment are separate from these local results; publication remains under the owner's supervision.
