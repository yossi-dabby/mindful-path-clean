# Forms Folder Structure Audit (AUDIT ONLY)

## 1. Executive summary

- Scope: read-only audit of therapeutic form assets and path references.
- No files were moved, renamed, deleted, or modified outside this report.
- `public/forms` currently contains **376 PDFs**, **0 PNGs**, **12 manifests**, **16 markdown/readme files**, and **51 folders** (including root).
- Generated runtime index currently references **343 unique `/forms/...` files**.
- Found **33 orphan-looking PDFs** under legacy English specialized subfolders (not in registry/index/manifest/tests/docs/scripts).
- Lowercase language codes (`en`, `he`) are the active runtime convention; uppercase `EN`/`HE` is not safe without broad code and reference updates.

## 2. Current folder map

Top-level under `public/forms` (PDF counts):

| Folder | PDFs |
|---|---:|
| `adolescents` | 42 |
| `adolescents_cbt_core_he_series_1` | 6 |
| `adolescents_cbt_core_he_series_2` | 6 |
| `adolescents_cbt_core_he_series_3` | 6 |
| `adolescents_cbt_core_he_series_4` | 6 |
| `adolescents_cbt_core_he_series_5_git` | 6 |
| `adolescents_cbt_core_he_series_6_git` | 6 |
| `children` | 34 |
| `children_cbt_core_he_module_01_github_upload` | 7 |
| `children_cbt_core_he_module_02_github_upload` | 7 |
| `children_cbt_core_he_module_03_github_upload` | 7 |
| `children_cbt_core_he_module_04_github_upload` | 7 |
| `children_cbt_core_he_module_05_github_upload` | 7 |
| `children_cbt_specialized_en_1` | 5 |
| `children_cbt_specialized_en_2` | 3 |
| `children_cbt_specialized_en_2.1_anger` | 11 |
| `children_cbt_specialized_en_2.2_odd` | 11 |
| `children_cbt_specialized_en_3` | 2 |
| `children_cbt_specialized_en_4` | 2 |
| `children_cbt_specialized_en_5` | 3 |
| `children_cbt_specialized_en_5.2_psychosomatic_complaints` | 11 |
| `children_cbt_specialized_he_01_01_separation_anxiety_github_upload` | 11 |
| `children_cbt_specialized_he_01_02_specific_phobias_github_upload` | 11 |
| `children_cbt_specialized_he_01_03_specific_phobias_github_upload` | 11 |
| `children_cbt_specialized_he_01_04_specific_phobias_github_upload` | 11 |
| `children_cbt_specialized_he_01_05_specific_phobias_github_upload` | 11 |
| `children_cbt_specialized_he_2.3__impulsivity` | 11 |
| `children_cbt_specialized_he_3.1_low_self_esteem` | 11 |
| `children_cbt_specialized_he_4.1_ocd` | 11 |
| `children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd` | 11 |
| `children_cbt_specialized_he_5.1_sleep_problems` | 11 |
| `children_cbt_specialized_he_5.3_enuresis_stress_support` | 11 |
| `module-01` | 6 |
| `module-02` | 6 |
| `module-03` | 6 |
| `module-04` | 6 |
| `module-05` | 6 |
| `module-06` | 6 |
| `module-07` | 6 |
| `module-08` | 6 |
| `module-09` | 6 |
| `module_10` | 6 |

Key outside upload-wrapper tree:

- `public/children_cbt_core_en`
- `public/children_cbt_core_en/children_cbt_core_en_stage1_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage2_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage3_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage4_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage5_git_upload`

## 3. Current asset counts

| Location | PDFs | PNGs | Manifests | READMEs/MD |
|---|---:|---:|---:|---:|
| `public/forms` | 376 | 0 | 12 | 16 |
| `public` (all) | 410 | 3 | 18 | 21 |

## 4. Current registry/reference map

Primary runtime/reference sources:

- `src/data/therapeuticForms/*.js` (curated registry URLs)
- `src/generated/therapeutic-forms-index.json` (runtime aggregated index)
- `scripts/generate-therapeutic-forms-index.mjs` (expects `/forms/{audience}/{lang}/{category}/...` as canonical fallback)
- Manifest files under `public/forms/**/manifest*.json` and `public/children_cbt_core_en/**/manifest*.json`
- Tests/docs/scripts referencing `/forms/...` URLs

- Registry unique `/forms/...` references: **205**
- Generated index unique `/forms/...` references: **343**
- Manifest item unique file references: **99**

## 5. Collection classification table

### Runtime collections (from generated index)

| Audience | Language | Collection | Entries | Unique files | Modules | Worksheet identifiers | Combined PDFs | Preview refs | Manifest refs | Current path roots | Complete? | Recommended target path |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| adolescents | en | adolescents_cbt_core | 31 | 31 | 6 | 30 | 1 | 0 | 0 | `/forms/adolescents/en/core` | Yes | `public/forms/adolescents/en/cbt-core/` |
| adolescents | en | adolescents_cbt_specialized | 11 | 11 | 10 | 10 | 11 | 0 | 0 | `/forms/adolescents/en/cbt-specialized` | Yes | `public/forms/adolescents/en/cbt-specialized/` |
| adolescents | he | adolescents_cbt_core | 36 | 36 | 6 | 36 | 6 | 0 | 0 | `/forms/adolescents_cbt_core_he_series_1`<br>`/forms/adolescents_cbt_core_he_series_2`<br>`/forms/adolescents_cbt_core_he_series_3`<br>`/forms/adolescents_cbt_core_he_series_4`<br>`/forms/adolescents_cbt_core_he_series_5_git`<br>`/forms/adolescents_cbt_core_he_series_6_git` | Yes | `public/forms/adolescents/he/cbt-core/` |
| adolescents | he | adolescents_cbt_specialized | 60 | 60 | 10 | 60 | 0 | 0 | 0 | `(n/a)` | Yes | `public/forms/adolescents/he/cbt-specialized/` |
| children | en | children_cbt_core | 34 | 34 | 5 | 30 | 4 | 30 | 5 | `/forms/children/en/cbt-core` | Yes | `public/forms/children/en/cbt-core/` |
| children | en | children_cbt_specialized | 165 | 15 | 5 | 165 | 15 | 0 | 1 | `(n/a)` | Yes | `public/forms/children/en/cbt-specialized/` |
| children | he | children_cbt_core | 35 | 35 | 5 | 30 | 5 | 0 | 0 | `(n/a)` | Yes | `public/forms/children/he/cbt-core/` |
| children | he | children_cbt_specialized | 121 | 121 | 5 | 121 | 11 | 0 | 0 | `(n/a)` | Yes | `public/forms/children/he/cbt-specialized/` |

### Filesystem collections (folder reality)

| Audience (inferred) | Language (inferred) | Collection type | PDF count | Current folder paths |
|---|---|---|---:|---|
| adolescents | en | cbt-specialized | 11 | `adolescents` |
| adolescents | en | core | 31 | `adolescents` |
| adolescents | he | legacy-module-root | 60 | `module-01`, `module-02`, `module-03`, `module-04`, `module-05`, `module-06`, `module-07`, `module-08`, `module-09`, `module_10` |
| adolescents | he | legacy-series-root | 36 | `adolescents_cbt_core_he_series_1`, `adolescents_cbt_core_he_series_2`, `adolescents_cbt_core_he_series_3`, `adolescents_cbt_core_he_series_4`, `adolescents_cbt_core_he_series_5_git`, `adolescents_cbt_core_he_series_6_git` |
| children | en | cbt-core | 34 | `children` |
| children | en | legacy-specialized-root | 48 | `children_cbt_specialized_en_1`, `children_cbt_specialized_en_2`, `children_cbt_specialized_en_2.1_anger`, `children_cbt_specialized_en_2.2_odd`, `children_cbt_specialized_en_3`, `children_cbt_specialized_en_4`, `children_cbt_specialized_en_5`, `children_cbt_specialized_en_5.2_psychosomatic_complaints` |
| children | he | legacy-module-root | 35 | `children_cbt_core_he_module_01_github_upload`, `children_cbt_core_he_module_02_github_upload`, `children_cbt_core_he_module_03_github_upload`, `children_cbt_core_he_module_04_github_upload`, `children_cbt_core_he_module_05_github_upload` |
| children | he | legacy-specialized-root | 121 | `children_cbt_specialized_he_01_01_separation_anxiety_github_upload`, `children_cbt_specialized_he_01_02_specific_phobias_github_upload`, `children_cbt_specialized_he_01_03_specific_phobias_github_upload`, `children_cbt_specialized_he_01_04_specific_phobias_github_upload`, `children_cbt_specialized_he_01_05_specific_phobias_github_upload`, `children_cbt_specialized_he_2.3__impulsivity`, `children_cbt_specialized_he_3.1_low_self_esteem`, `children_cbt_specialized_he_4.1_ocd`, `children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd`, `children_cbt_specialized_he_5.1_sleep_problems`, `children_cbt_specialized_he_5.3_enuresis_stress_support` |

## 6. Orphan/legacy upload folders

Legacy/upload-wrapper folders under `public/forms` with PDFs:

- `adolescents_cbt_core_he_series_1` (6 PDFs)
- `adolescents_cbt_core_he_series_2` (6 PDFs)
- `adolescents_cbt_core_he_series_3` (6 PDFs)
- `adolescents_cbt_core_he_series_4` (6 PDFs)
- `adolescents_cbt_core_he_series_5_git` (6 PDFs)
- `adolescents_cbt_core_he_series_6_git` (6 PDFs)
- `children_cbt_core_he_module_01_github_upload` (7 PDFs)
- `children_cbt_core_he_module_02_github_upload` (7 PDFs)
- `children_cbt_core_he_module_03_github_upload` (7 PDFs)
- `children_cbt_core_he_module_04_github_upload` (7 PDFs)
- `children_cbt_core_he_module_05_github_upload` (7 PDFs)
- `children_cbt_specialized_en_1` (5 PDFs)
- `children_cbt_specialized_en_2` (3 PDFs)
- `children_cbt_specialized_en_2.1_anger` (11 PDFs)
- `children_cbt_specialized_en_2.2_odd` (11 PDFs)
- `children_cbt_specialized_en_3` (2 PDFs)
- `children_cbt_specialized_en_4` (2 PDFs)
- `children_cbt_specialized_en_5` (3 PDFs)
- `children_cbt_specialized_en_5.2_psychosomatic_complaints` (11 PDFs)
- `children_cbt_specialized_he_01_01_separation_anxiety_github_upload` (11 PDFs)
- `children_cbt_specialized_he_01_02_specific_phobias_github_upload` (11 PDFs)
- `children_cbt_specialized_he_01_03_specific_phobias_github_upload` (11 PDFs)
- `children_cbt_specialized_he_01_04_specific_phobias_github_upload` (11 PDFs)
- `children_cbt_specialized_he_01_05_specific_phobias_github_upload` (11 PDFs)
- `children_cbt_specialized_he_2.3__impulsivity` (11 PDFs)
- `children_cbt_specialized_he_3.1_low_self_esteem` (11 PDFs)
- `children_cbt_specialized_he_4.1_ocd` (11 PDFs)
- `children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd` (11 PDFs)
- `children_cbt_specialized_he_5.1_sleep_problems` (11 PDFs)
- `children_cbt_specialized_he_5.3_enuresis_stress_support` (11 PDFs)
- `module-01` (6 PDFs)
- `module-02` (6 PDFs)
- `module-03` (6 PDFs)
- `module-04` (6 PDFs)
- `module-05` (6 PDFs)
- `module-06` (6 PDFs)
- `module-07` (6 PDFs)
- `module-08` (6 PDFs)
- `module-09` (6 PDFs)
- `module_10` (6 PDFs)

Outside `public/forms` upload-wrapper folders:

- `public/children_cbt_core_en/children_cbt_core_en_stage1_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage2_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage3_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage4_git_upload`
- `public/children_cbt_core_en/children_cbt_core_en_stage5_git_upload`

Duplicate-looking PDFs by content hash between `public/forms` and `public/children_cbt_core_en/**`: **34** (all children CBT core EN assets).

## 7. Active runtime folders

Runtime-active path roots (based on generated index + registries):

- `public/forms/adolescents`
- `public/forms/adolescents_cbt_core_he_series_1`
- `public/forms/adolescents_cbt_core_he_series_2`
- `public/forms/adolescents_cbt_core_he_series_3`
- `public/forms/adolescents_cbt_core_he_series_4`
- `public/forms/adolescents_cbt_core_he_series_5_git`
- `public/forms/adolescents_cbt_core_he_series_6_git`
- `public/forms/children`
- `public/forms/children_cbt_core_he_module_01_github_upload`
- `public/forms/children_cbt_core_he_module_02_github_upload`
- `public/forms/children_cbt_core_he_module_03_github_upload`
- `public/forms/children_cbt_core_he_module_04_github_upload`
- `public/forms/children_cbt_core_he_module_05_github_upload`
- `public/forms/children_cbt_specialized_en_1`
- `public/forms/children_cbt_specialized_en_2`
- `public/forms/children_cbt_specialized_en_3`
- `public/forms/children_cbt_specialized_en_4`
- `public/forms/children_cbt_specialized_en_5`
- `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload`
- `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload`
- `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload`
- `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload`
- `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload`
- `public/forms/children_cbt_specialized_he_2.3__impulsivity`
- `public/forms/children_cbt_specialized_he_3.1_low_self_esteem`
- `public/forms/children_cbt_specialized_he_4.1_ocd`
- `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd`
- `public/forms/children_cbt_specialized_he_5.1_sleep_problems`
- `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support`
- `public/forms/module-01`
- `public/forms/module-02`
- `public/forms/module-03`
- `public/forms/module-04`
- `public/forms/module-05`
- `public/forms/module-06`
- `public/forms/module-07`
- `public/forms/module-08`
- `public/forms/module-09`
- `public/forms/module_10`

Orphan-like folder roots (not in generated index/registry/manifest): `public/forms/children_cbt_specialized_en_2.1_anger`, `public/forms/children_cbt_specialized_en_2.2_odd`, `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints`.

## 8. Path convention analysis

- Code uses lowercase language identifiers (`en`, `he`) (`src/data/therapeuticForms/categories.js`).
- Generator fallback parser assumes `/forms/{audience}/{lang}/{category}/...` (`scripts/generate-therapeutic-forms-index.mjs`, `inferAudienceAndLanguage`).
- Fallback explicitly skips non-audience roots like `/forms/module-01/...` unless curated registry already provides them.
- Validation enforces `filePath` under `public/forms/`.
- Current real folder structure is mixed: audience-first canonical for some English collections, plus many legacy roots and module wrappers.

## 9. Option A: audience-first lowercase (`public/forms/{audience}/{lang}/{collection}/...`)

Pros:
- Aligns with existing generator assumptions and many existing URLs.
- Minimizes resolver/index/test/doc churn.
- Keeps lowercase language convention already enforced by filtering and registries.

Cons:
- Not language-first organizationally.

Risk: 🟡 Medium-Low for staged migration, 🔴 High if done in one bulk move.

## 10. Option B: language-first (`public/forms/{lang}/{audience}/{collection}/...`)

Impact required before any move:
- Update every `fileUrl`/`file_path` in curated registries.
- Update generator assumptions (audience/lang segment parsing).
- Regenerate and validate `src/generated/therapeutic-forms-index.json`.
- Update manifest `file_path` and `preview_path` values to new canonical paths.
- Update tests and docs with hardcoded `/forms/...` paths.
- Re-verify Open vs Download URLs, AI awareness, language gating, and Forms Library rendering.

Uppercase `EN/HE` evaluation:
- **Not safe currently**. Runtime paths and filters use lowercase; URLs are case-sensitive on many hosts.
- Uppercase would require complete registry/index/manifest/test rewrite and strict redirect strategy (currently prohibited).

Risk: 🔴 High.

## 11. Option C: hybrid transition (recommended migration shape)

Keep current runtime paths active until each collection is migrated and validated.

1. Freeze current runtime references as baseline.
2. Add path-existence + URL-contract tests first.
3. Move one collection at a time.
4. Update registries/manifests/index in same PR as each move.
5. Keep legacy folders in place until zero references are proven.
6. Delete legacy folders only in dedicated cleanup PRs.

Risk: 🟡 Medium when staged; avoids 🔴 bulk migration risk.

## 12. Recommended canonical structure

Recommendation: **Option A** (audience-first, lowercase language).

- Language folders: use **lowercase `en`/`he`** only.
- First segment after `/forms`: keep **audience** (`children`, `adolescents`).
- Collection segment: `cbt-core` / `cbt-specialized`.
- Keep module directories deterministic: `module-01` … `module-10` under collection root for specialized sets.
- Keep individual worksheet naming stable; do not change IDs unless registry migration explicitly handles it.
- Place combined PDFs either directly in collection root or in `combined/` consistently; pick one per collection and enforce by manifest + tests.

## 13. Exact proposed target folder tree

```text
public/forms/
  adolescents/
    en/
      cbt-core/
        module-01/ ... module-06/
      cbt-specialized/
        module-01/ ... module-10/
    he/
      cbt-core/
        module-01/ ... module-06/
      cbt-specialized/
        module-01/ ... module-10/
  children/
    en/
      cbt-core/
        module-01/ ... module-05/
      cbt-specialized/
        module-01/ ... module-05/
    he/
      cbt-core/
        module-01/ ... module-05/
      cbt-specialized/
        module-01/ ... module-05/
```

Module naming recommendation: always zero-padded `module-01`, `module-02`, … `module-10` (replace legacy `module_10` during migration stage, not now).

## 14. Required changes for future migration (not implemented)

Must be prepared before any moves:
- Registry updates in `src/data/therapeuticForms/*.js` for each moved URL.
- Generator update in `scripts/generate-therapeutic-forms-index.mjs` if path shape changes.
- Regenerate `src/generated/therapeutic-forms-index.json` and pass `check:forms-index`.
- Manifest rewrites: `file_path`, `preview_path`, `github_path`, `combined_pdf_path`.
- Update tests with hardcoded paths (`test/utils/*therapeuticForms*.test.js`, `tests/e2e/forms-open-download.spec.ts`, etc.).
- Docs updates (`docs/therapeutic-forms-*.md`) where path examples are embedded.
- Add automated path-existence and orphan/duplicate detection tests before first move PR.
- Preserve legacy filename spellings during migration (for example the existing `yourcbttrapist_...` assets) until a dedicated rename + reference-update PR is approved.

## 15. Migration phases

Stage 0 — Audit only (this document).

Stage 1 — Add migration safety tests:
- registered `fileUrl`/`filePath` existence checks
- generated index path validity
- Open vs Download behavior checks
- language-gating regression checks
- duplicate/orphan detection checks

Stage 2 — Pilot one small collection (recommended: children/en/cbt-specialized module subset already in root folders).

Stage 3 — Migrate remaining English collections one collection per PR.

Stage 4 — Migrate Hebrew collections one collection per PR, preserving RTL metadata and AI fields.

Stage 5 — Clean legacy wrappers only after references are zero and tests pass.

Stage 6 — Final audit: no orphan PDFs, no missing paths, no stale manifests, no duplicate public URLs.

## 16. Risks

🟢 Low:
- docs-only audit
- adding guardrail tests

🟡 Medium:
- moving unreferenced legacy wrapper folders
- moving one pilot collection with full registry/index updates

🔴 High:
- bulk moving all PDFs at once
- changing URL shape globally in one PR
- introducing uppercase `EN/HE` paths
- changing generator assumptions without broad test hardening
- deleting legacy folders before proving zero references

## 17. Do-not-touch list (for migration execution PRs)

- No PDF/PNG content edits.
- No AI behavior/routing changes.
- No language-gating behavior changes.
- No Open/Download behavior changes.
- No manifest/schema field removals.
- No bulk folder deletions before reference proof.

## 18. Suggested next PR after audit

1. Add automated tests for registered path existence, generated index integrity, and orphan detection.
2. Create one draft pilot migration PR for a single small collection with explicit before/after URL map.
3. Run full lint/test/build/e2e and AI awareness checks before merging any move PR.

## Appendix A — Per-asset reference table (all PDFs under `public/forms`)

| Current file path | Public URL | Registry ref | Generated index ref | Manifest ref | Test/doc/script ref | Active runtime asset | Safe to move w/o code change | Required updates if moved |
|---|---|---|---|---|---|---|---|---|
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_full_series_60_forms_web_optimized_under_25mb.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_full_series_60_forms_web_optimized_under_25mb.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_01_anxiety_stress_and_fears.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_01_anxiety_stress_and_fears.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_02_mood_functioning_and_energy.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_02_mood_functioning_and_energy.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_03_self_esteem_and_identity.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_03_self_esteem_and_identity.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_04_friendship_belonging_and_conflict.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_04_friendship_belonging_and_conflict.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_05_anger_impulsivity_and_regulation.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_05_anger_impulsivity_and_regulation.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_06_ocd_intrusive_thoughts_and_new_responses.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_06_ocd_intrusive_thoughts_and_new_responses.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_07_adhd_attention_organization_and_impulsivity.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_07_adhd_attention_organization_and_impulsivity.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_08_body_sleep_and_stress.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_08_body_sleep_and_stress.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_09_trauma_and_safe_coping.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_09_trauma_and_safe_coping.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_10_parents_and_teens.pdf` | `/forms/adolescents/en/cbt-specialized/yourcbttrapist_adolescents_cbt_specialized_en_module_10_parents_and_teens.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/adolescents-cbt-core-series-1-full-en.pdf` | `/forms/adolescents/en/core/adolescents-cbt-core-series-1-full-en.pdf` | yes | yes | no | yes | yes | no | generated index, registry, tests/docs/scripts |
| `public/forms/adolescents/en/core/individual/01-01-what-is-going-on-for-me-right-now.pdf` | `/forms/adolescents/en/core/individual/01-01-what-is-going-on-for-me-right-now.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/adolescents/en/core/individual/01-02-my-body-gives-me-signals.pdf` | `/forms/adolescents/en/core/individual/01-02-my-body-gives-me-signals.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/adolescents/en/core/individual/01-03-what-triggered-me.pdf` | `/forms/adolescents/en/core/individual/01-03-what-triggered-me.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/01-04-thought-feeling-action.pdf` | `/forms/adolescents/en/core/individual/01-04-thought-feeling-action.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/01-05-my-personal-map.pdf` | `/forms/adolescents/en/core/individual/01-05-my-personal-map.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/02-01-what-did-my-mind-say.pdf` | `/forms/adolescents/en/core/individual/02-01-what-did-my-mind-say.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/02-02-thought-or-fact.pdf` | `/forms/adolescents/en/core/individual/02-02-thought-or-fact.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/02-03-which-interpretation-did-i-give-it.pdf` | `/forms/adolescents/en/core/individual/02-03-which-interpretation-did-i-give-it.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/02-04-what-kind-of-thought-is-this.pdf` | `/forms/adolescents/en/core/individual/02-04-what-kind-of-thought-is-this.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/02-05-what-belief-lies-underneath.pdf` | `/forms/adolescents/en/core/individual/02-05-what-belief-lies-underneath.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/03-01-what-is-the-evidence.pdf` | `/forms/adolescents/en/core/individual/03-01-what-is-the-evidence.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/03-02-is-there-another-way-to-see-this.pdf` | `/forms/adolescents/en/core/individual/03-02-is-there-another-way-to-see-this.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/03-03-what-would-i-say-to-a-friend.pdf` | `/forms/adolescents/en/core/individual/03-03-what-would-i-say-to-a-friend.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/03-04-a-more-balanced-thought.pdf` | `/forms/adolescents/en/core/individual/03-04-a-more-balanced-thought.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/03-05-what-do-i-choose-to-think-now.pdf` | `/forms/adolescents/en/core/individual/03-05-what-do-i-choose-to-think-now.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/04-01-choosing-an-action.pdf` | `/forms/adolescents/en/core/individual/04-01-choosing-an-action.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/04-02-creating-a-helpful-thought.pdf` | `/forms/adolescents/en/core/individual/04-02-creating-a-helpful-thought.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/04-03-small-steps.pdf` | `/forms/adolescents/en/core/individual/04-03-small-steps.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/04-04-thinking-beliefs-and-assumptions.pdf` | `/forms/adolescents/en/core/individual/04-04-thinking-beliefs-and-assumptions.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/04-05-balance-and-evaluation.pdf` | `/forms/adolescents/en/core/individual/04-05-balance-and-evaluation.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/05-01-avoidance.pdf` | `/forms/adolescents/en/core/individual/05-01-avoidance.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/05-02-small-steps.pdf` | `/forms/adolescents/en/core/individual/05-02-small-steps.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/05-03-gradual-exposure.pdf` | `/forms/adolescents/en/core/individual/05-03-gradual-exposure.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/05-04-effective-action.pdf` | `/forms/adolescents/en/core/individual/05-04-effective-action.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/05-05-persistence-and-tracking.pdf` | `/forms/adolescents/en/core/individual/05-05-persistence-and-tracking.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/06-01-what-have-i-learned-about-myself.pdf` | `/forms/adolescents/en/core/individual/06-01-what-have-i-learned-about-myself.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/06-02-my-weekly-check-in.pdf` | `/forms/adolescents/en/core/individual/06-02-my-weekly-check-in.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/06-03-strengthening-myself.pdf` | `/forms/adolescents/en/core/individual/06-03-strengthening-myself.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/06-04-when-its-hard-for-me-what-helps-me.pdf` | `/forms/adolescents/en/core/individual/06-04-when-its-hard-for-me-what-helps-me.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents/en/core/individual/06-05-my-road-card.pdf` | `/forms/adolescents/en/core/individual/06-05-my-road-card.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_1.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_2.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_3.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_4.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_4.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_5.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_1_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_series_1_combined.pdf` | `/forms/adolescents_cbt_core_he_series_1/adolescents_cbt_core_he_series_1_combined.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_1.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_2.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_3.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_4.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_5.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_2_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_series_2_git.pdf` | `/forms/adolescents_cbt_core_he_series_2/adolescents_cbt_core_he_series_2_git/adolescents_cbt_core_he_series_2_git.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_1.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_2.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_3.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_4.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_5.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_3_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_series_3_combined.pdf` | `/forms/adolescents_cbt_core_he_series_3/adolescents_cbt_core_he_series_3_git/adolescents_cbt_core_he_series_3_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_1.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_2.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_3.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_4.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_5.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_4_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_series_4_combined.pdf` | `/forms/adolescents_cbt_core_he_series_4/adolescents_cbt_core_he_series_4_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_1.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_2.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_3.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_4.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_5.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_5_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_series_5_combined.pdf` | `/forms/adolescents_cbt_core_he_series_5_git/adolescents_cbt_core_he_series_5_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_1.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_2.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_3.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_4.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_5.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_6_5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_series_6_combined.pdf` | `/forms/adolescents_cbt_core_he_series_6_git/adolescents_cbt_core_he_series_6_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_01.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_01.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_02.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_02.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_03.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_03.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_04.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_04.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_05.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_05.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_01_06.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_01_06.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_01.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_01.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_02.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_02.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_03.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_03.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_04.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_04.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_05.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_05.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_02_06.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_02_06.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_01.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_01.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_02.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_02.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_03.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_03.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_04.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_04.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_05.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_05.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_03_06.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_03_06.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_01.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_01.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_02.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_02.pdf` | no | yes | yes | yes | yes | no | generated index, manifest, tests/docs/scripts |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_03.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_03.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_04.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_04.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_05.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_05.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_04_06.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_04_06.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_01.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_01.pdf` | no | yes | yes | yes | yes | no | generated index, manifest, tests/docs/scripts |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_02.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_02.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_03.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_03.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_04.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_04.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_05.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_05.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_05_06.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_05_06.pdf` | no | yes | yes | no | yes | no | generated index, manifest |
| `public/forms/children/en/cbt-core/children_cbt_core_en_module_01_emotions_and_body.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_module_01_emotions_and_body.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children/en/cbt-core/children_cbt_core_en_module_03_behavior_and_small_steps.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_module_03_behavior_and_small_steps.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children/en/cbt-core/children_cbt_core_en_module_04_regulation_and_calm.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_module_04_regulation_and_calm.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children/en/cbt-core/children_cbt_core_en_module_05_calm_tools_and_personal_plan.fixed.pdf` | `/forms/children/en/cbt-core/children_cbt_core_en_module_05_calm_tools_and_personal_plan.fixed.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.1.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.2.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.3.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.4.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.5.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.6.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_1.6.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_module_01_combined.pdf` | `/forms/children_cbt_core_he_module_01_github_upload/children_cbt_core_he_module_01_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.1.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.2.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.3.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.3.pdf` | no | yes | no | yes | yes | no | generated index, tests/docs/scripts |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.4.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.5.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.6.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_2.6.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_module_02_combined.pdf` | `/forms/children_cbt_core_he_module_02_github_upload/children_cbt_core_he_module_02_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.1.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.2.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.3.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.4.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.5.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.6.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_3.6.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_module_03_combined.pdf` | `/forms/children_cbt_core_he_module_03_github_upload/children_cbt_core_he_module_03_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.1.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.2.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.3.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.4.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.5.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.6.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_4.6.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_module_04_combined.pdf` | `/forms/children_cbt_core_he_module_04_github_upload/children_cbt_core_he_module_04_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.1.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.1.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.2.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.2.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.3.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.3.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.4.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.4.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.5.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.5.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.6.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_5.6.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_module_05_combined.pdf` | `/forms/children_cbt_core_he_module_05_github_upload/children_cbt_core_he_module_05_combined.pdf` | no | yes | no | no | yes | no | generated index |
| `public/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_01_separation_anxiety_full.pdf` | `/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_01_separation_anxiety_full.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_02_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_02_specific_phobias_full.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_03_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_03_specific_phobias_full.pdf` | yes | yes | yes | yes | yes | no | generated index, registry, manifest, tests/docs/scripts |
| `public/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_04_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_04_specific_phobias_full.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_05_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_en_1/children_cbt_specialized_en_01_05_specific_phobias_full.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.1_anger.pdf` | `/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.1_anger.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.2_odd.pdf` | `/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.2_odd.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.3_impulsivity.pdf` | `/forms/children_cbt_specialized_en_2/children_cbt_specialized_en_2.3_impulsivity.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.1.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.1.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.10.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.10.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.2.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.2.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.3.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.3.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.4.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.4.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.5.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.5.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.6.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.6.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.7.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.7.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.8.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.8.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.9.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_2.1.9.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_full.pdf` | `/forms/children_cbt_specialized_en_2.1_anger/children_cbt_specialized_en_2.1_anger_full.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.1.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.1.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.10.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.10.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.2.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.2.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.3.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.3.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.4.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.4.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.5.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.5.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.6.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.6.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.7.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.7.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.8.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.8.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.9.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_2.2.9.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_full.pdf` | `/forms/children_cbt_specialized_en_2.2_odd/children_cbt_specialized_en_2.2_odd_full.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_3/children_cbt_specialized_en_3.1_low_self_esteem.pdf` | `/forms/children_cbt_specialized_en_3/children_cbt_specialized_en_3.1_low_self_esteem.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_3/children_cbt_specialized_en_3.2_social_difficulties.pdf` | `/forms/children_cbt_specialized_en_3/children_cbt_specialized_en_3.2_social_difficulties.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_4/children_cbt_specialized_en_4.1_ocd.pdf` | `/forms/children_cbt_specialized_en_4/children_cbt_specialized_en_4.1_ocd.pdf` | yes | yes | yes | yes | yes | no | generated index, registry, manifest, tests/docs/scripts |
| `public/forms/children_cbt_specialized_en_4/children_cbt_specialized_en_4.2_trauma_sensitive_coping_ptsd.pdf` | `/forms/children_cbt_specialized_en_4/children_cbt_specialized_en_4.2_trauma_sensitive_coping_ptsd.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.1_sleep_problems.pdf` | `/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.1_sleep_problems.pdf` | yes | yes | yes | yes | yes | no | generated index, registry, manifest, tests/docs/scripts |
| `public/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.2_psychosomatic_complaints.pdf` | `/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.2_psychosomatic_complaints.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.3_enuresis_encopresis_stress_support.pdf` | `/forms/children_cbt_specialized_en_5/children_cbt_specialized_en_5.3_enuresis_encopresis_stress_support.pdf` | yes | yes | yes | no | yes | no | generated index, registry, manifest |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.1.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.1.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.10.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.10.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.2.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.2.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.3.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.3.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.4.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.4.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.5.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.5.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.6.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.6.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.7.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.7.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.8.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.8.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.9.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_5.2.9.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_combined.pdf` | `/forms/children_cbt_specialized_en_5.2_psychosomatic_complaints/children_cbt_specialized_en_5.2_psychosomatic_complaints_combined.pdf` | no | no | no | no | no | yes | none |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.1.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.10.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.2.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.3.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.4.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.5.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.6.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.7.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.8.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.9.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/1.1.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/combined.pdf` | `/forms/children_cbt_specialized_he_01_01_separation_anxiety_github_upload/combined.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.1.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.10.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.2.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.3.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.4.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.5.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.6.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.7.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.8.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.9.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/1.2.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/all.pdf` | `/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/all.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_01.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_02.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_03.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_04.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_05.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_06.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_07.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_07.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_08.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_08.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_09.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_09.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_10.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_he_01_03_specific_phobias_github_upload/children_cbt_specialized_he_01_03_specific_phobias_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_01.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_02.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_03.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_04.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_05.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_06.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_07.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_07.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_08.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_08.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_09.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_09.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_10.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_he_01_04_specific_phobias_github_upload/children_cbt_specialized_he_01_04_specific_phobias_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_01.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_02.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_03.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_04.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_05.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_06.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_07.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_07.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_08.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_08.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_09.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_09.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_10.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_specific_phobias_full.pdf` | `/forms/children_cbt_specialized_he_01_05_specific_phobias_github_upload/children_cbt_specialized_he_01_05_specific_phobias_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.1.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.10.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.2.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.3.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.4.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.5.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.6.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.7.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.8.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.9.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_2.3.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_full.pdf` | `/forms/children_cbt_specialized_he_2.3__impulsivity/children_cbt_specialized_he_2.3__impulsivity_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.1.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.10.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.2.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.3.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.4.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.5.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.6.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.7.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.8.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.9.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_3.1.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_full.pdf` | `/forms/children_cbt_specialized_he_3.1_low_self_esteem/children_cbt_specialized_he_3.1_low_self_esteem_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.1.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.10.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.2.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.3.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.4.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.5.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.6.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.7.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.8.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.9.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_4.1.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_full.pdf` | `/forms/children_cbt_specialized_he_4.1_ocd/children_cbt_specialized_he_4.1_ocd_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.1.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.10.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.2.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.3.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.4.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.5.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.6.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.7.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.8.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.9.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_4.2.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_full.pdf` | `/forms/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd/children_cbt_specialized_he_4.2_trauma_sensitive_coping_ptsd_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.1.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.10.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.2.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.3.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.4.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.5.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.6.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.7.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.8.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.9.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_5.1.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_full.pdf` | `/forms/children_cbt_specialized_he_5.1_sleep_problems/children_cbt_specialized_he_5.1_sleep_problems_full.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.1.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.10.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.10.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.2.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.3.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.4.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.5.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.6.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.6.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.7.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.7.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.8.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.8.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.9.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_5.3.9.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_enuresis_encopresis_stress_support_combined.pdf` | `/forms/children_cbt_specialized_he_5.3_enuresis_stress_support/children_cbt_specialized_he_5.3_enuresis_encopresis_stress_support_combined.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_01.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_02.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_03.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_04.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_04.pdf` | yes | yes | no | yes | yes | no | generated index, registry, tests/docs/scripts |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_05.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-01/adolescents_cbt_specialized_he_01_06.pdf` | `/forms/module-01/adolescents_cbt_specialized_he_01_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_01.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_02.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_03.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_04.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_05.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-02/adolescents_cbt_specialized_he_02_06.pdf` | `/forms/module-02/adolescents_cbt_specialized_he_02_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_01.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_02.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_03.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_04.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_05.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-03/adolescents_cbt_specialized_he_03_06.pdf` | `/forms/module-03/adolescents_cbt_specialized_he_03_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_01.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_02.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_03.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_04.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_05.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-04/adolescents_cbt_specialized_he_04_06.pdf` | `/forms/module-04/adolescents_cbt_specialized_he_04_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_01.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_02.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_03.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_04.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_05.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-05/adolescents_cbt_specialized_he_05_06.pdf` | `/forms/module-05/adolescents_cbt_specialized_he_05_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_01.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_02.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_03.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_04.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_05.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-06/adolescents_cbt_specialized_he_06_06.pdf` | `/forms/module-06/adolescents_cbt_specialized_he_06_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_01.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_02.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_03.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_04.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_05.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-07/adolescents_cbt_specialized_he_07_06.pdf` | `/forms/module-07/adolescents_cbt_specialized_he_07_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_01.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_02.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_03.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_04.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_05.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-08/adolescents_cbt_specialized_he_08_06.pdf` | `/forms/module-08/adolescents_cbt_specialized_he_08_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_01.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_01.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_02.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_02.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_03.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_03.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_04.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_04.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_05.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_05.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module-09/adolescents_cbt_specialized_he_09_06.pdf` | `/forms/module-09/adolescents_cbt_specialized_he_09_06.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_1.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_1.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_2.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_2.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_3.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_3.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_4.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_4.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_5.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_5.pdf` | yes | yes | no | no | yes | no | generated index, registry |
| `public/forms/module_10/adolescents_cbt_specialized_he_10_6.pdf` | `/forms/module_10/adolescents_cbt_specialized_he_10_6.pdf` | yes | yes | no | no | yes | no | generated index, registry |

_Last updated: 2026-06-12 12:22 UTC_