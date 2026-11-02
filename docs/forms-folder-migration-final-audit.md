# Final Therapeutic Forms Folder Migration Audit

## 1. Executive summary
- This report is **audit-only** and documents post-wave migration state on `origin/main`.
- All active runtime therapeutic forms resolve under canonical lowercase runtime paths.
- Runtime index remains at **493** forms (**en: 241, he: 252**).
- No cleanup was executed in this PR.

## 2. Current main SHA
- `origin/main`: `582f7d62849bc42c19e37ac38a24a71e918b10f7`

## 3. Runtime index totals
- Total generated index entries: **493**
- Language counts: **en=241, he=252**
- `fileUrl` prefix violations: **0**
- `filePath` prefix violations: **0**
- Missing filePath targets: **0**
- Missing fileUrl->disk targets: **0**
- Uppercase `/forms/EN` or `/forms/HE` references: **0**
- Old active legacy upload-wrapper runtime references: **0**

## 4. Canonical runtime folder inventory
| Canonical root | PDFs on disk | Runtime index entries | Expected count | Missing files | Stale fileUrl/filePath refs | Manifest refs | Preview refs | Warnings |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `public/forms/adolescents/en/cbt-core/` | 31 | 31 | 31 | 0 | 0 | 0 | 0 | none |
| `public/forms/adolescents/he/cbt-core/` | 36 | 36 | 36 | 0 | 0 | 0 | 0 | none |
| `public/forms/adolescents/en/cbt-specialized/` | 11 | 11 | 11 | 0 | 0 | 0 | 0 | none |
| `public/forms/adolescents/he/cbt-specialized/` | 60 | 60 | 60 | 0 | 0 | 9 | 54 | none |
| `public/forms/children/en/cbt-core/` | 34 | 34 | 34 | 0 | 0 | 5 | 30 | none |
| `public/forms/children/he/cbt-core/` | 35 | 35 | 35 | 0 | 0 | 0 | 0 | none |
| `public/forms/children/en/cbt-specialized/` | 15 | 165 | 165 | 0 | 0 | 1 | 0 | 15 canonical module PDFs intentionally fan out to 165 index cards (1 module + 10 worksheet metadata entries per subcategory). |
| `public/forms/children/he/cbt-specialized/` | 121 | 121 | 121 | 0 | 0 | 0 | 0 | none |

### Intentional duplicate runtime URL groups
All duplicate `fileUrl` groups are the narrow children/en/cbt-specialized module PDF + 10 worksheet-metadata mapping pattern.

| fileUrl | entries | sample IDs |
|---|---:|---|
| `/forms/children/en/cbt-specialized/module-01/children_cbt_specialized_en_01_01_separation_anxiety_full.pdf` | 11 | children-cbt-specialized-en-1-1-1, children-cbt-specialized-en-1-1-10, children-cbt-specialized-en-1-1-2 … |
| `/forms/children/en/cbt-specialized/module-01/children_cbt_specialized_en_01_02_specific_phobias_full.pdf` | 11 | children-cbt-specialized-en-1-2-1, children-cbt-specialized-en-1-2-10, children-cbt-specialized-en-1-2-2 … |
| `/forms/children/en/cbt-specialized/module-01/children_cbt_specialized_en_01_03_specific_phobias_full.pdf` | 11 | children-cbt-specialized-en-1-3-1, children-cbt-specialized-en-1-3-10, children-cbt-specialized-en-1-3-2 … |
| `/forms/children/en/cbt-specialized/module-01/children_cbt_specialized_en_01_04_specific_phobias_full.pdf` | 11 | children-cbt-specialized-en-1-4-1, children-cbt-specialized-en-1-4-10, children-cbt-specialized-en-1-4-2 … |
| `/forms/children/en/cbt-specialized/module-01/children_cbt_specialized_en_01_05_specific_phobias_full.pdf` | 11 | children-cbt-specialized-en-1-5-1, children-cbt-specialized-en-1-5-10, children-cbt-specialized-en-1-5-2 … |
| `/forms/children/en/cbt-specialized/module-02/children_cbt_specialized_en_2.1_anger.pdf` | 11 | children-cbt-specialized-en-2-1-1, children-cbt-specialized-en-2-1-10, children-cbt-specialized-en-2-1-2 … |
| `/forms/children/en/cbt-specialized/module-02/children_cbt_specialized_en_2.2_odd.pdf` | 11 | children-cbt-specialized-en-2-2-1, children-cbt-specialized-en-2-2-10, children-cbt-specialized-en-2-2-2 … |
| `/forms/children/en/cbt-specialized/module-02/children_cbt_specialized_en_2.3_impulsivity.pdf` | 11 | children-cbt-specialized-en-2-3-1, children-cbt-specialized-en-2-3-10, children-cbt-specialized-en-2-3-2 … |
| `/forms/children/en/cbt-specialized/module-03/children_cbt_specialized_en_3.1_low_self_esteem.pdf` | 11 | children-cbt-specialized-en-3-1-1, children-cbt-specialized-en-3-1-10, children-cbt-specialized-en-3-1-2 … |
| `/forms/children/en/cbt-specialized/module-03/children_cbt_specialized_en_3.2_social_difficulties.pdf` | 11 | children-cbt-specialized-en-3-2-1, children-cbt-specialized-en-3-2-10, children-cbt-specialized-en-3-2-2 … |
| `/forms/children/en/cbt-specialized/module-04/children_cbt_specialized_en_4.1_ocd.pdf` | 11 | children-cbt-specialized-en-4-1-1, children-cbt-specialized-en-4-1-10, children-cbt-specialized-en-4-1-2 … |
| `/forms/children/en/cbt-specialized/module-04/children_cbt_specialized_en_4.2_trauma_sensitive_coping_ptsd.pdf` | 11 | children-cbt-specialized-en-4-2-1, children-cbt-specialized-en-4-2-10, children-cbt-specialized-en-4-2-2 … |
| `/forms/children/en/cbt-specialized/module-05/children_cbt_specialized_en_5.1_sleep_problems.pdf` | 11 | children-cbt-specialized-en-5-1-1, children-cbt-specialized-en-5-1-10, children-cbt-specialized-en-5-1-2 … |
| `/forms/children/en/cbt-specialized/module-05/children_cbt_specialized_en_5.2_psychosomatic_complaints.pdf` | 11 | children-cbt-specialized-en-5-2-1, children-cbt-specialized-en-5-2-10, children-cbt-specialized-en-5-2-2 … |
| `/forms/children/en/cbt-specialized/module-05/children_cbt_specialized_en_5.3_enuresis_encopresis_stress_support.pdf` | 11 | children-cbt-specialized-en-5-3-1, children-cbt-specialized-en-5-3-10, children-cbt-specialized-en-5-3-2 … |

## 5. Legacy leftover inventory (non-canonical under `public/forms`)
Counts by risk: **SAFE_CANDIDATE=33, KEEP=27, REVIEW_REQUIRED=2, DO_NOT_DELETE=12**

| Path | Type | Runtime registry ref | Generated index ref | Manifest ref | Tests ref | Docs ref | Safe to delete later | Deletion risk | Class |
|---|---|---|---|---|---|---|---|---|---|
| `public/forms/adolescents/en/core` | directory | no | no | no | tests/e2e/therapeutic-forms-awareness.spec.ts | docs/forms-folder-structure-audit.md | owner-review-needed | REVIEW_REQUIRED | H |
| `public/forms/adolescents/en/core/README.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/adolescents/en/core/SOURCE_INVENTORY.md` | md | no | no | no | no | no | owner-review-needed | REVIEW_REQUIRED | H |
| `public/forms/children_cbt_core_he_module_01_github_upload` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_core_he_module_01_github_upload/README_HE.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_core_he_module_02_github_upload` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_core_he_module_02_github_upload/manifest.children-cbt-core-he-module-02.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/children_cbt_core_he_module_02_github_upload/README_HE.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_core_he_module_03_github_upload` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_core_he_module_03_github_upload/README_HE.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_core_he_module_04_github_upload` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_core_he_module_04_github_upload/README_HE.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_specialized_en_2.1_anger` | directory | no | no | no | test/utils/therapeuticFormsGeneratedIndexParity.test.js | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.1.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.10.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.2.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.3.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.4.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.5.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.6.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.7.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.8.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.9.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_full.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd` | directory | no | no | no | test/utils/therapeuticFormsGeneratedIndexParity.test.js | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.1.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.10.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.2.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.3.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.4.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.5.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.6.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.7.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.8.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.9.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_full.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints` | directory | no | no | no | test/utils/therapeuticFormsGeneratedIndexParity.test.js | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.1.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.10.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.2.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.3.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.4.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.5.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.6.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.7.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.8.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.9.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_combined.pdf` | pdf | no | no | no | no | docs/forms-folder-structure-audit.md | yes-if-confirmed-unregistered | SAFE_CANDIDATE | D |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/manifest.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/QA.txt` | txt | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/README_HE.md` | md | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/target_path.txt` | txt | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/README.txt` | txt | no | no | no | no | no | possibly-after-owner-approval | KEEP | C |
| `public/forms/manifest.children-cbt-specialized-en.json` | json | yes | no | no | no | no | no | DO_NOT_DELETE | G |
| `public/forms/module-01` | directory | no | no | no | tests/e2e/forms-open-download.spec.ts<br>tests/e2e/therapeutic-forms-awareness.spec.ts | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-01/manifest.adolescents-cbt-specialized-he.module-01.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-02` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-02/manifest.adolescents-cbt-specialized-he.module-02.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-03` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-03/manifest.adolescents-cbt-specialized-he.module-03.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-04` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-04/manifest.adolescents-cbt-specialized-he.module-04.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-05` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-05/manifest.adolescents-cbt-specialized-he.module-05.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-06` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-06/manifest.adolescents-cbt-specialized-he.module-06.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-07` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-07/manifest.adolescents-cbt-specialized-he.module-07.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-08` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-08/manifest.adolescents-cbt-specialized-he.module-08.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |
| `public/forms/module-09` | directory | no | no | no | no | docs/forms-folder-structure-audit.md | possibly-after-owner-approval | KEEP | A |
| `public/forms/module-09/manifest.adolescents-cbt-specialized-he.module-09.json` | json | no | no | no | no | no | no | DO_NOT_DELETE | B |

Class legend: A=legacy metadata/docs folder, B=legacy manifest, C=README/QA/target_path, D=unregistered/orphan PDF, E=missing preview artifact, F=tracked empty folder, G=suspicious runtime referenced leftover, H=owner review needed.
Note: classes E/F are retained in the taxonomy for completeness; no tracked leftovers matched those classes in this audit snapshot.

## 6. Manifest audit
Scope audited: `public/forms/**` and `public/children_cbt_core_en/**`.

| Manifest path | Collection | Canonical path refs | Legacy path refs | PDF refs | PNG refs | Missing PDFs | Missing PNGs | Pre-existing missing preview warnings | Metadata-only warnings | Cleanup later recommended |
|---|---|---|---|---:|---:|---:|---:|---|---|---|
| `public/children_cbt_core_en/children_cbt_core_en_stage1_git_upload/public/forms/children/en/cbt-core/manifest.children-cbt-core-en.stage1.json` | children-cbt-core-en.stage1 | yes | no | 6 | 6 | 0 | 6 | yes | yes | yes |
| `public/children_cbt_core_en/children_cbt_core_en_stage2_git_upload/manifest.children-cbt-core-en.stage2.json` | children-cbt-core-en.stage2 | yes | no | 6 | 6 | 0 | 6 | yes | yes | yes |
| `public/children_cbt_core_en/children_cbt_core_en_stage3_git_upload/manifest.children-cbt-core-en.stage3.json` | children-cbt-core-en.stage3 | yes | no | 6 | 6 | 0 | 6 | yes | yes | yes |
| `public/children_cbt_core_en/children_cbt_core_en_stage4_git_upload/manifest.children-cbt-core-en.stage4.fixed.json` | children-cbt-core-en.stage4.fixed | yes | no | 6 | 6 | 0 | 6 | yes | yes | yes |
| `public/children_cbt_core_en/children_cbt_core_en_stage5_git_upload/manifest.children-cbt-core-en.stage5.fixed.json` | children-cbt-core-en.stage5.fixed | yes | no | 6 | 6 | 0 | 6 | yes | yes | yes |
| `public/forms/children_cbt_core_he_module_02_github_upload/manifest.children-cbt-core-he-module-02.json` | children-cbt-core-he-module-02 | no | no | 6 | 6 | 6 | 6 | yes | no | yes |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/manifest.json` | children-cbt-specialized-he-01-02-specific-phobias | no | no | 11 | 0 | 11 | 0 | no | no | no |
| `public/forms/manifest.children-cbt-specialized-en.json` | children-cbt-specialized-en | yes | no | 15 | 0 | 15 | 0 | no | no | no |
| `public/forms/module-01/manifest.adolescents-cbt-specialized-he.module-01.json` | adolescents-cbt-specialized-he.module-01 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-02/manifest.adolescents-cbt-specialized-he.module-02.json` | adolescents-cbt-specialized-he.module-02 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-03/manifest.adolescents-cbt-specialized-he.module-03.json` | adolescents-cbt-specialized-he.module-03 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-04/manifest.adolescents-cbt-specialized-he.module-04.json` | adolescents-cbt-specialized-he.module-04 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-05/manifest.adolescents-cbt-specialized-he.module-05.json` | adolescents-cbt-specialized-he.module-05 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-06/manifest.adolescents-cbt-specialized-he.module-06.json` | adolescents-cbt-specialized-he.module-06 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-07/manifest.adolescents-cbt-specialized-he.module-07.json` | adolescents-cbt-specialized-he.module-07 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-08/manifest.adolescents-cbt-specialized-he.module-08.json` | adolescents-cbt-specialized-he.module-08 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |
| `public/forms/module-09/manifest.adolescents-cbt-specialized-he.module-09.json` | adolescents-cbt-specialized-he.module-09 | yes | no | 7 | 6 | 7 | 6 | yes | no | yes |

## 7. Registry reference audit (`src/data/therapeuticForms/`)
Search patterns: `/forms/module-`, `/forms/module_`, `/forms/adolescents_cbt_`, `/forms/children_cbt_`, `public/forms/module-`, `public/forms/module_`, `public/forms/adolescents_cbt_`, `public/forms/children_cbt_`, `/forms/EN`, `/forms/HE`.

| File | Match | Classification |
|---|---|---|
| `src/data/therapeuticForms/forms.adolescents.cbt-specialized.he.js` | `/forms/module-` | expected docs/history only |
| `src/data/therapeuticForms/forms.adolescents.cbt-specialized.he.js` | `public/forms/module-` | expected docs/history only |

Result: only a historical source-comment reference remains; no active runtime fileUrl/filePath uses legacy upload-wrapper roots, no uppercase EN/HE runtime URL segments, and active runtime registry paths stay lowercase canonical.

Language metadata audit:
- Hebrew entries remain `he` with `rtl: true`.
- English entries remain `en` with `rtl: false`.
- No cross-language fallback leakage found in targeted safety tests.

## 8. Test / allowlist audit
Audited files:
- `test/utils/therapeuticFormsAssetPathSafety.test.js`
- `test/utils/therapeuticFormsManifestPathSafety.test.js`
- `test/utils/therapeuticFormsGeneratedIndexSafety.test.js`
- `test/utils/therapeuticFormsFolderMigrationReadiness.test.js`
- `test/utils/therapeuticFormsIndexGeneratorValidation.test.js`
- `test/utils/therapeuticFormsChildrenCBTSpecialized.test.js`
- `test/utils/therapeuticFormsChildrenCBTSpecializedHebrew.test.js`

Findings:
- No `test.skip`/`test.fixme` found in therapeutic forms utility tests.
- No assertion weakening introduced in this PR (docs-only).
- Duplicate URL allowlist remains explicit and collection-scoped in asset safety test.
- Manifest missing preview handling remains warning-scoped for legacy wrapper manifests only.
- Tests continue enforcing canonical `/forms/` and `public/forms/` prefixes, file existence, generated index freshness, lowercase EN/HE guards, and canonical runtime path safety.

## 9. Missing preview warnings summary
- Total missing preview references observed: **90**
- Manifests with missing previews: **15**
- Manifests with metadata-only warning profile: **5**
- These are treated as pre-existing warnings (not blockers) under legacy wrapper manifest policy.

## 10. Validation command results
| Command | Result |
|---|---|
| `npx vitest run test/utils/therapeuticFormsAssetPathSafety.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsManifestPathSafety.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsGeneratedIndexSafety.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsFolderMigrationReadiness.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsIndexGeneratorValidation.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsChildrenCBTSpecialized.test.js` | ✅ pass |
| `npx vitest run test/utils/therapeuticFormsChildrenCBTSpecializedHebrew.test.js` | ✅ pass |
| `npm run lint` | ✅ pass |
| `npm test` | ✅ pass |
| `npm run build` | ✅ pass |
| `npm run generate:forms-index` | ✅ pass |
| `npm run check:forms-index` | ✅ pass |

## 11. Cleanup plan (not executed)
### 11.1 SAFE_CANDIDATE cleanup items
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.1.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.10.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.2.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.3.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.4.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.5.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.6.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.7.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.8.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.9.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_full.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.1.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.10.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.2.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.3.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.4.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.5.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.6.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.7.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.8.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.9.pdf` (D)
- `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_full.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.1.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.10.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.2.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.3.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.4.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.5.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.6.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.7.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.8.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.9.pdf` (D)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_combined.pdf` (D)

Why safe: currently unregistered/orphan PDFs with no runtime registry/generated-index references; only historical docs mention them.

### 11.2 KEEP items
- `public/forms/adolescents/en/core/README.md` (C)
- `public/forms/children_cbt_core_he_module_01_github_upload` (A)
- `public/forms/children_cbt_core_he_module_01_github_upload/README_HE.md` (C)
- `public/forms/children_cbt_core_he_module_02_github_upload` (A)
- `public/forms/children_cbt_core_he_module_02_github_upload/README_HE.md` (C)
- `public/forms/children_cbt_core_he_module_03_github_upload` (A)
- `public/forms/children_cbt_core_he_module_03_github_upload/README_HE.md` (C)
- `public/forms/children_cbt_core_he_module_04_github_upload` (A)
- `public/forms/children_cbt_core_he_module_04_github_upload/README_HE.md` (C)
- `public/forms/children_cbt_specialized_en_2.1_anger` (A)
- `public/forms/children_cbt_specialized_en_2.2_odd` (A)
- `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints` (A)
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload` (A)
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/QA.txt` (C)
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/README_HE.md` (C)
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/target_path.txt` (C)
- `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support` (A)
- `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/README.txt` (C)
- `public/forms/module-01` (A)
- `public/forms/module-02` (A)
- `public/forms/module-03` (A)
- `public/forms/module-04` (A)
- `public/forms/module-05` (A)
- `public/forms/module-06` (A)
- `public/forms/module-07` (A)
- `public/forms/module-08` (A)
- `public/forms/module-09` (A)

Why keep: legacy metadata/docs containers and migration-history wrappers still used for traceability and audit context.

### 11.3 REVIEW_REQUIRED items
- `public/forms/adolescents/en/core` (H)
- `public/forms/adolescents/en/core/SOURCE_INVENTORY.md` (H)

Why review: ambiguous ownership/intent (e.g., `adolescents/en/core` legacy documentation container) needs maintainer decision before deletion.

### 11.4 DO_NOT_DELETE items
- `public/forms/children_cbt_core_he_module_02_github_upload/manifest.children-cbt-core-he-module-02.json` (B)
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/manifest.json` (B)
- `public/forms/manifest.children-cbt-specialized-en.json` (G)
- `public/forms/module-01/manifest.adolescents-cbt-specialized-he.module-01.json` (B)
- `public/forms/module-02/manifest.adolescents-cbt-specialized-he.module-02.json` (B)
- `public/forms/module-03/manifest.adolescents-cbt-specialized-he.module-03.json` (B)
- `public/forms/module-04/manifest.adolescents-cbt-specialized-he.module-04.json` (B)
- `public/forms/module-05/manifest.adolescents-cbt-specialized-he.module-05.json` (B)
- `public/forms/module-06/manifest.adolescents-cbt-specialized-he.module-06.json` (B)
- `public/forms/module-07/manifest.adolescents-cbt-specialized-he.module-07.json` (B)
- `public/forms/module-08/manifest.adolescents-cbt-specialized-he.module-08.json` (B)
- `public/forms/module-09/manifest.adolescents-cbt-specialized-he.module-09.json` (B)

Why do not delete: manifests and runtime-referenced metadata still tied to safety checks, runtime references, or migration traceability.

### 11.5 Suggested cleanup PR sequence
1. **PR A**: docs/report-only follow-up (this report baseline, owner sign-off checkpoints).
2. **PR B**: remove confirmed orphan PDFs (SAFE_CANDIDATE) after explicit owner approval.
3. **PR C**: remove obsolete manifests/docs only after runtime/tests/docs references are retired.
4. **PR D**: optional preview warning remediation (generate or intentionally retire missing preview paths).
5. **PR E**: final hardening pass for forms-index safety/tests after cleanup waves complete.

## 12. Risk classification table
| Risk level | Count | Meaning |
|---|---:|---|
| SAFE_CANDIDATE | 33 | Appears removable later after explicit owner approval and cleanup PR |
| KEEP | 27 | Retain for legacy metadata/history context currently |
| REVIEW_REQUIRED | 2 | Unclear ownership/intent; requires maintainer decision |
| DO_NOT_DELETE | 12 | Manifest/runtime-linked or otherwise sensitive; keep for now |

## 13. Explicit non-cleanup statement
**No cleanup was performed in this PR.**

## 14. Explicit PR scope statement
**This PR is audit-only.**

---
Last updated: 2026-07-01T13:23:10.409Z
