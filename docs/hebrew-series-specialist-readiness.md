> Update 2026-11-05: all 150 specialist draft files are now implemented, including the final 63 TRAUMA files. Full manual mapping, clinical/age review, caregiver-material decisions and rights approval remain open. See [TRAUMA implementation scope](hebrew-forms-series-11-12-implementation.md).

> Update 2026-11-05: the owner requested all OCD batches together. The 87 original support draft files are now implemented; full manual mapping and clinical/rights decisions below remain unresolved. This document retains the specialist readiness requirements. See [implementation scope](hebrew-forms-series-07-10-implementation.md).

# Specialist review requirements: 150 draft PDFs

After general batches 1–6, the implemented catalog contains 820 forms. The remaining 150 planned IDs are retained in the historical Stage 0 manifest; no substitute generic PDFs or empty catalog entries are added to claim completion. The proposed total of 970 remains conditional on the specialist mapping and companion-material decisions.

| Batch | Units | Proposed PDFs | Decisions that must be resolved |
| --- | --- | ---: | --- |
| 7 | OCD02–04 | 27 | D01, D02, D03, D07, D09 |
| 8 | OCD05–08 | 36 | Same OCD mapping and age-specific review |
| 9 | OCDYC-01–04, ages 6–7 | 12 | D01, D04, D07, D09 |
| 10 | OCDYC-05–08, ages 6–7 | 12 | Same separate child/caregiver mapping |
| 11 | TRAUMA-02–04 | 27 | D01, D05, D06, D07, D09 |
| 12 | TRAUMA-05–08 | 36 | Same trauma mapping and age-specific review |
| Total | 22 units across three specialist series | 150 | D10 validates each release; D11 freezes scope only after the content decisions |

Decision IDs refer to [Stage 0 decisions](hebrew-series-stage0/decisions.json). That file is an unresolved historical decision register, not a record of approvals granted by this release.

## Concrete inputs needed

1. Name qualified OCD/ERP and trauma reviewers, their relevant age-group expertise, and who can approve age adaptation. Record names and actual review dates only when review occurs.
2. Select exact full manual titles, editions and age ranges: OCD ages 8–11/12–17 and adults/older adults; a separate family-based young-child OCD manual for ages 6–7; TF-CBT for children/adolescents with a reviewed PRACTICE mapping; and adult CPT including its belief-domain mapping and older-adult adaptations. A background page or preparation worksheet is not a full manual. The 6–14 workbook does not establish suitability for ages 15–17.
3. Map each proposed unit and age variant to a manual component, intended use, prerequisites, limits, caregiver role and necessary companion material. The Stage 0 plan explicitly defers specialized ERP authoring until this mapping is reviewed.
4. Record the rights basis per source: original writing grounded in concepts, or the actual permission/license for any reproduced or adapted material. Do not infer permission from public availability or terms of use.
5. Confirm whether caregiver guides, assessment material or other companions change the proposed counts. Freeze a new implementation manifest only after this review, preserving the original Stage 0 snapshot.

No reviewed manual mapping, named reviewer decision or rights clearance resolving these requirements was found in the available project record. The owner's authorization covers implementation, PRs, merges, deployment and verification; it does not supply missing professional decisions. Existing generic preparation forms OCD01 and TRAUMA-01 remain available with their existing draft limits.

## Ready implementation path once inputs exist

For each batch, author original age-specific sources against the reviewed mapping, generate blank HTML/PDFs and per-form review metadata, and append a pinned catalog without altering previous files. Verify exact manifest membership, A4/page count, embedded Hebrew rendering, blank fields, short/long answer behavior, hashes, administrator-only transport, older-release fallbacks and desktop/mobile navigation. Merge after passing checks, deploy Railway, sync and redeploy the Base44 function, publish, and perform authenticated live catalog/PDF verification before marking the batch deployed. Record clinical approval independently of technical deployment.

The release transport now supports 17 pinned generations. Later releases must keep checking the 512 KiB catalog limit rather than silently increasing or bypassing it. The latest 970-form compact catalog is 462,042 bytes.
