# Forms Language-First Migration Plan

> **Audit date:** 2026-07-02  
> **Branch:** `copilot/audit-only-plan-therapeutic-forms`  
> **Audited by:** GitHub Copilot (audit-only, no runtime files changed)

---

## 1. Executive Summary

All active therapeutic-form PDFs currently live under an **audience-first** folder tree:

```
public/forms/{audience}/{language}/{category}/...
```

The desired new layout is **language-first**:

```
public/forms/{language}/{audience}/{category}/...
```

This document audits the full scope of the migration: 343 distinct PDF files, 493 generated index entries, 7 registry source files, the generator script, ≈40 test files, 10 manifests with active path fields, and all hardcoded references across the codebase.

**This PR is audit/plan only. No runtime files were moved or changed.**

---

## 2. Current State

| Metric | Value |
|---|---|
| Current HEAD SHA | `11ba599a6d2ec68f0ca322381673d97e45ec81b3` |
| Generated index total | **493** |
| Index — English (`en`) | **241** |
| Index — Hebrew (`he`) | **252** |
| Unique physical PDF files (active roots) | **343** |
| Missing runtime file paths | **0** |
| Stale upload-wrapper runtime paths | **0** |
| Uppercase `/forms/EN` or `/forms/HE` URLs | **0** |

All 493 generated index entries resolve to files on disk. The runtime is clean.

---

## 3. Desired Language-First Target Structure

**Current (audience-first):**
```
public/forms/adolescents/en/cbt-core/
public/forms/adolescents/he/cbt-core/
public/forms/adolescents/en/cbt-specialized/
public/forms/adolescents/he/cbt-specialized/
public/forms/children/en/cbt-core/
public/forms/children/he/cbt-core/
public/forms/children/en/cbt-specialized/
public/forms/children/he/cbt-specialized/
```

**Desired (language-first):**
```
public/forms/en/adolescents/cbt-core/
public/forms/en/adolescents/cbt-specialized/
public/forms/en/children/cbt-core/
public/forms/en/children/cbt-specialized/

public/forms/he/adolescents/cbt-core/
public/forms/he/adolescents/cbt-specialized/
public/forms/he/children/cbt-core/
public/forms/he/children/cbt-specialized/
```

**URL shape change:**
```
# Current
/forms/{audience}/{lang}/{category}/...

# Target
/forms/{lang}/{audience}/{category}/...
```

Expected totals after migration must remain unchanged: **493 entries, en=241, he=252**.

---

## 4. Runtime Inventory by Current Root

| Root | PDFs on disk | Index entries | Unique fileUrls | Intentional fileUrl duplicates |
|---|---|---|---|---|
| `public/forms/adolescents/en/cbt-core` | 31 | 31 | 31 | No |
| `public/forms/adolescents/he/cbt-core` | 36 | 36 | 36 | No |
| `public/forms/adolescents/en/cbt-specialized` | 11 | 11 | 11 | No |
| `public/forms/adolescents/he/cbt-specialized` | 60 | 60 | 60 | No |
| `public/forms/children/en/cbt-core` | 34 | 34 | 34 | No |
| `public/forms/children/he/cbt-core` | 35 | 35 | 35 | No |
| `public/forms/children/en/cbt-specialized` | 15 | 165 | 15 | **Yes** — 15 PDFs × 11 entries each |
| `public/forms/children/he/cbt-specialized` | 121 | 121 | 121 | No |
| **Total** | **343** | **493** | **343** | |

### Notes on intentional duplicates

The 15 PDFs under `public/forms/children/en/cbt-specialized/` each appear in **11 generated index entries**. This is intentional: a single combined-PDF is referenced by one collection card plus multiple worksheet-level entries across different card types. The move is safe for all 15 — the physical file moves once, and all 11 index pointers update in lockstep.

### Manifest coverage

| Root | Referenced by manifest? |
|---|---|
| `adolescents/he/cbt-specialized` | **Yes** — `public/forms/module-01/` through `module-09/` (54 active `file_path` fields) |
| `children/en/cbt-specialized` | **Yes** — `public/forms/manifest.children-cbt-specialized-en.json` (15 active `file_path` fields) |
| `adolescents/en/cbt-core` | No active manifest reference |
| `adolescents/he/cbt-core` | No active manifest reference |
| `children/en/cbt-core` | No active manifest reference |
| `children/he/cbt-core` | No active manifest reference |
| `children/he/cbt-specialized` | No active manifest reference |

### Preview coverage

No preview PNG paths (`preview_path`) reference the audience-first roots. The manifest safety test confirms all preview paths either resolve or are flagged as legacy-wrapper metadata.

---

## 5. Proposed Target Mapping — Sample per Root

The full transformation is mechanical: swap `segments[2]` (language) and `segments[1]` (audience) in every path.

```
# Pattern
public/forms/{audience}/{lang}/{category}/.../{file}.pdf
→
public/forms/{lang}/{audience}/{category}/.../{file}.pdf

# fileUrl pattern
/forms/{audience}/{lang}/{category}/.../{file}.pdf
→
/forms/{lang}/{audience}/{category}/.../{file}.pdf
```

| Root | Sample current filePath | Proposed new filePath |
|---|---|---|
| adolescents/en/cbt-core | `public/forms/adolescents/en/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf` | `public/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf` |
| adolescents/he/cbt-core | `public/forms/adolescents/he/cbt-core/stage-01/adolescents_cbt_core_he_1_1.pdf` | `public/forms/he/adolescents/cbt-core/stage-01/adolescents_cbt_core_he_1_1.pdf` |
| adolescents/en/cbt-specialized | `public/forms/adolescents/en/cbt-specialized/...full_series....pdf` | `public/forms/en/adolescents/cbt-specialized/...full_series....pdf` |
| adolescents/he/cbt-specialized | `public/forms/adolescents/he/cbt-specialized/module-01/...01_01.pdf` | `public/forms/he/adolescents/cbt-specialized/module-01/...01_01.pdf` |
| children/en/cbt-core | `public/forms/children/en/cbt-core/stage-01/children_cbt_core_en_01_01.pdf` | `public/forms/en/children/cbt-core/stage-01/children_cbt_core_en_01_01.pdf` |
| children/he/cbt-core | `public/forms/children/he/cbt-core/stage-01/children_cbt_core_he_1.1.pdf` | `public/forms/he/children/cbt-core/stage-01/children_cbt_core_he_1.1.pdf` |
| children/en/cbt-specialized | `public/forms/children/en/cbt-specialized/module-01/...separation_anxiety_full.pdf` | `public/forms/en/children/cbt-specialized/module-01/...separation_anxiety_full.pdf` |
| children/he/cbt-specialized | `public/forms/children/he/cbt-specialized/module-01/subcategory-01-01/1.1.1.pdf` | `public/forms/he/children/cbt-specialized/module-01/subcategory-01-01/1.1.1.pdf` |

**Expected move count: 343 physical files.**  
Expected index count after regeneration: **493** (unchanged).  
Expected en: **241**, he: **252** (unchanged).

---

## 6. Generator Impact Analysis

**File:** `scripts/generate-therapeutic-forms-index.mjs`

### Functions requiring changes

#### `inferAudienceAndLanguage(fileUrl)` — lines 101–109

Current hardcoded assumption:

```js
// /forms/{audience}/{lang}/{category}/...
const audience = segments[1] || 'adults';
const language = segments[2] || 'en';
```

After migration segments[1] will be language and segments[2] will be audience. This function **must** be updated to support language-first:

```js
// /forms/{lang}/{audience}/{category}/...
const language = segments[1] || 'en';
const audience = segments[2] || 'adults';
```

#### `inferCategory(audience, categorySegment)` — lines 113–122

This function accepts `audience` and `categorySegment`. Its logic is correct but depends on `audience` being accurate. Once `inferAudienceAndLanguage` returns correct values under the new layout, `inferCategory` will work unchanged.

#### File-walk audience guard — lines 343–347

```js
// Skip files whose path structure doesn't start with a known audience segment.
const rawAudienceSegment = fileUrl.split('/').filter(Boolean)[1] || '';
if (!KNOWN_AUDIENCES.has(rawAudienceSegment)) continue;
```

Under the new layout `segments[1]` will be a language code (e.g. `en`, `he`), not an audience. This guard **will incorrectly skip all language-first paths**. It must be updated to check `segments[2]` (the new audience position) instead.

#### `resolveCollectionTag(entry)` — lines 460–474

Uses `audience` and `language` from the entry — no path parsing. Unaffected by path shape change.

#### Curated registry pipeline — lines 233–325

Reads `fileUrl` from registry objects and does **not** call `inferAudienceAndLanguage`. The pipeline trusts `form.audience` and `form.language` from the registry definition. Unaffected by path shape, but registry `fileUrl` values must be updated.

### Recommended generator approach

**Recommendation: dual-shape support during migration, then enforce language-first.**

Rationale: moving all 343 PDFs and updating all registries in a single PR while simultaneously changing the generator creates a large blast radius. A safer sequence is:

1. **PR 1 (generator + tests):** Add dual-shape support to `inferAudienceAndLanguage` and the audience guard. Accept both `/forms/{audience}/{lang}/…` and `/forms/{lang}/{audience}/…`. Update the relevant generator tests. Merge to `staging`, validate 493/241/252.
2. **PR 2 (move files + registries + index + tests):** Move all 343 PDFs, update all 7 registry files, regenerate index, update all tests and manifests. Merge to `staging`, validate 493/241/252.
3. **PR 3 (remove dual-shape):** Remove the audience-first branch from `inferAudienceAndLanguage` and the guard. Merge after staging validation confirms no audience-first paths remain.

---

## 7. Registry Impact Analysis

**Directory:** `src/data/therapeuticForms/`

### Files requiring URL updates in the migration PR

| Registry file | Old-path references | Nature of change |
|---|---|---|
| `forms.adolescents.cbt-core.en.js` | 1 explicit fileUrl + `ADOLESCENTS_CBT_CORE_EN_PACKAGE_FILE_URL` constant | Update constant + explicit series URL |
| `forms.adolescents.cbt-core.he.js` | 6 `STAGE_BASE_PATHS` entries (stage-01 through stage-06) | Update all 6 base path strings |
| `forms.adolescents.cbt-specialized.he.js` | **120 explicit fileUrls** (60 PDFs × worksheets+combined) | Bulk path swap |
| `forms.children.cbt-core.en.js` | `CHILDREN_CBT_CORE_EN_BASE_URL` constant (derived URLs) | Update base constant |
| `forms.children.cbt-core.he.js` | Base URL pattern constant | Update base constant |
| `forms.children.cbt-specialized.js` | **15 explicit fileUrls** | Bulk path swap |
| `forms.children.cbt-specialized.he.js` | **121 explicit fileUrls** | Bulk path swap |

**Files with zero old-path references (no change needed):**
`forms.adolescents.cbt-specialized.en.js`, `forms.adolescents.cbt-specialized.js`, `forms.adolescents.js`, `forms.adults.js`, `forms.children.cbt-premium.js`, `forms.children.js`, `forms.olderAdults.js`

### Path fields requiring updates per registry

- `fileUrl` — primary runtime URL (all 7 files above)
- `file_url` inside `languages.{lang}` blocks — mirrors `fileUrl` (all 7 files above)
- `STAGE_BASE_PATHS` / `CHILDREN_CBT_CORE_EN_BASE_URL` / `ADOLESCENTS_CBT_CORE_EN_PACKAGE_FILE_URL` — base path constants (3 files)
- `combinedFileUrl` / package file URL fields — follow base constant patterns (adolescents/en/cbt-core)
- `filePath` — derived as `public${fileUrl}` by the generator; registries do not store `filePath` directly, so no separate update needed

### Approximate line-change scope

| File | Estimated lines changed |
|---|---|
| `forms.adolescents.cbt-core.en.js` | ~10 |
| `forms.adolescents.cbt-core.he.js` | ~8 |
| `forms.adolescents.cbt-specialized.he.js` | ~130 |
| `forms.children.cbt-core.en.js` | ~5 |
| `forms.children.cbt-core.he.js` | ~5 |
| `forms.children.cbt-specialized.js` | ~30 |
| `forms.children.cbt-specialized.he.js` | ~130 |
| **Total** | **~318 lines** |

---

## 8. Test Impact Analysis

### Safety and index tests (highest priority)

| Test file | Update needed |
|---|---|
| `test/utils/therapeuticFormsFolderMigrationReadiness.test.js` | **Critical.** `CANONICAL_AUDIENCE_FIRST_PATTERN` regex must be replaced with a `CANONICAL_LANGUAGE_FIRST_PATTERN` regex (`^public/forms/{lang}/{audience}/...`). The `classifyRepoPath` function must be updated to accept language-first paths as canonical. |
| `test/utils/therapeuticFormsGeneratedIndexSafety.test.js` | Minor: no hardcoded path assertions; verifies fileUrl starts with `/forms/` and has no uppercase. These checks remain valid after migration. **No change needed.** |
| `test/utils/therapeuticFormsAssetPathSafety.test.js` | Minor: checks for `/forms/children/en/cbt-specialized/module-0[1-5]/` pattern — this regex must be updated to `/forms/en/children/cbt-specialized/module-0[1-5]/`. |
| `test/utils/therapeuticFormsManifestPathSafety.test.js` | Manifest file_path assertions depend on actual manifest file contents; will fail if manifests are updated to new paths. No change until manifests change. |
| `test/utils/therapeuticFormsIndexGeneratorValidation.test.js` | Hardcodes `public/forms/adolescents/en/cbt-core/` and `public/forms/children/he/cbt-core/` path fixtures. Both must be updated to language-first equivalents. |

### Form registry / content tests (bulk update needed)

These files contain hardcoded audience-first path assertions that will fail after file moves:

| Test file | Type of update |
|---|---|
| `test/utils/therapeuticFormsAdolescentsCBTCoreEnglish.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsAdolescentsCBTSpecialized.test.js` | Update expected fileUrl/filePath assertions |
| `test/utils/therapeuticFormsAdolescentsCBTSpecializedEnglish.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTSpecialized.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTSpecializedHebrew.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTPremium.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTPremiumAssets.test.js` | Update expected fileUrl/filePath/combinedFileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTPremiumContent.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChildrenCBTPremiumQA.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsChatIntegration.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsGeneratedIndexParity.test.js` | Update expected path patterns |
| `test/utils/therapeuticFormsMultilingualVariantSelection.test.js` | Update expected fileUrl paths |
| `test/utils/therapeuticFormsPhase1Stabilization.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsPhase4B.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsPhase4C.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsPhase5.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsPolicy.test.js` | Update expected path patterns |
| `test/utils/therapeuticFormsEnglishWorkbooks.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsWorkbooks.test.js` | Update expected fileUrl assertions |
| `test/utils/therapeuticFormsFrench.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsGerman.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsItalian.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsPortuguese.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsSpanish.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsFrenchWorkbooks.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsGermanWorkbooks.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsItalianWorkbooks.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsPortugueseWorkbooks.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticFormsSpanishWorkbooks.test.js` | Update expected fileUrl patterns |
| `test/utils/therapeuticForms.test.js` | Update expected fileUrl assertions |
| `test/utils/openDownloadBehavior.test.js` | Update expected fileUrl assertions |
| `test/utils/generatedFilePdf.test.js` | Update expected filePath assertions |
| `test/utils/generatedFilesContract.test.js` | Update expected filePath assertions |

### E2E specs

| Spec file | Type of update |
|---|---|
| `tests/e2e/therapeutic-forms-awareness.spec.ts` | Line 68: `'/forms/adolescents/en/core/individual/...'` — legacy URL, review whether this test fixture needs updating or remains intentionally legacy |
| `tests/e2e/forms-open-download.spec.ts` | Line 27: `'/forms/module-01/...'` — legacy/legacy-module path, not audience-first; **not affected** by this migration |

**Total test files to update: ~35 unit test files + 1 E2E spec.**

---

## 9. Manifest Impact Analysis

### Manifests with active runtime `file_path` fields

| Manifest | Active `file_path` count | Current path root | Must update in migration PR? |
|---|---|---|---|
| `public/forms/manifest.children-cbt-specialized-en.json` | 15 | `public/forms/children/en/cbt-specialized/…` | **Yes** — all 15 `file_path` values must be updated |
| `public/forms/module-01/manifest.adolescents-cbt-specialized-he.module-01.json` | 6 | `public/forms/adolescents/he/cbt-specialized/module-01/…` | **Yes** — all 6 `file_path` values must be updated |
| `public/forms/module-02/…module-02.json` through `module-09/…module-09.json` | 6 each | `public/forms/adolescents/he/cbt-specialized/module-XX/…` | **Yes** — all 6 × 8 = 48 `file_path` values must be updated |

**Total manifest `file_path` updates: 69 entries across 10 manifest files.**

### Manifests with zero active file_path items (unchanged)

| Manifest | Items | Status |
|---|---|---|
| `public/forms/children_cbt_core_he_module_02_github_upload/manifest.children-cbt-core-he-module-02.json` | 0 | Legacy upload wrapper — no active paths — **leave untouched** |
| `public/forms/children_cbt_specialized_he_01_02_specific_phobias_github_upload/manifest.json` | 0 | Legacy upload wrapper — no active paths — **leave untouched** |

### Relative vs canonical paths

All active manifest `file_path` fields use **absolute repo-relative paths** (e.g. `public/forms/children/en/cbt-specialized/…`). There are no relative path forms. Every `file_path` that references an audience-first path must be updated to the new language-first equivalent.

---

## 10. Hardcoded Reference Audit

### Active runtime assumptions (must update in migration PR)

| Location | Reference | Type |
|---|---|---|
| `src/data/therapeuticForms/forms.adolescents.cbt-core.en.js` | `ADOLESCENTS_CBT_CORE_EN_BASE_URL`, series file URL | Active runtime |
| `src/data/therapeuticForms/forms.adolescents.cbt-core.he.js` | `STAGE_BASE_PATHS[1..6]` | Active runtime |
| `src/data/therapeuticForms/forms.adolescents.cbt-specialized.he.js` | 60 module file URLs | Active runtime |
| `src/data/therapeuticForms/forms.children.cbt-core.en.js` | `CHILDREN_CBT_CORE_EN_BASE_URL` | Active runtime |
| `src/data/therapeuticForms/forms.children.cbt-core.he.js` | base URL constant | Active runtime |
| `src/data/therapeuticForms/forms.children.cbt-specialized.js` | 15 module file URLs | Active runtime |
| `src/data/therapeuticForms/forms.children.cbt-specialized.he.js` | 121 file URLs | Active runtime |
| `scripts/generate-therapeutic-forms-index.mjs` | `inferAudienceAndLanguage`, audience guard | Generator logic |
| 10 manifest `file_path` fields | as above | Active runtime |

### Test fixtures (must update in migration PR)

All ~35 unit test files and 1 E2E spec listed in Section 8.

### Documentation / history only (safe to leave)

| File | Reference | Action |
|---|---|---|
| `docs/forms-folder-migration-final-audit.md` | Old audience-first paths | History doc — leave untouched |
| `docs/forms-folder-structure-audit.md` | Old audience-first paths | History doc — leave untouched |
| `docs/therapeutic-forms-multilingual.md` | Old audience-first paths | History doc — leave untouched |
| `public/forms/adolescents/he/cbt-specialized/module-XX/README_HE.md` | Within old folder | Will be physically moved with the PDF folder tree; content need not change |
| `public/children_cbt_core_en/*/README*.md` | Historical staging descriptions | Outside active forms tree — leave untouched |
| `public/forms/children_cbt_core_he_module_02_github_upload/` | Legacy upload wrapper | Leave untouched |

---

## 11. Old URL Compatibility Risk

### Current routing and link analysis

- No Express/Vite redirect layer maps old `/forms/adolescents/…` URLs to new paths.
- No Next.js `redirects` config (project uses Vite).
- The app serves PDFs as static assets. If a PDF moves, the old URL returns 404.
- No hardcoded deep links to individual PDF files were found in source code (`src/`) except through the registry/generated index. All PDF delivery goes through `fileUrl` fields that are dynamically read from the index.
- The E2E spec `tests/e2e/therapeutic-forms-awareness.spec.ts` line 68 uses a legacy URL `/forms/adolescents/en/core/…` that does not match any current active file and appears to be a known stale fixture.
- The E2E spec `tests/e2e/forms-open-download.spec.ts` uses `/forms/module-01/…` (legacy module path) — unaffected by this migration.

### Risk level

**Medium risk for externally shared/bookmarked URLs.**

Internal risk is **low**: the app resolves all PDF links through the generated index. Once the index is updated and files are moved atomically in the same PR, no internal link will break.

External risk is **medium**: if any user has bookmarked a direct PDF URL (e.g. `/forms/children/en/cbt-specialized/module-01/…`) or if a third-party reference exists to the old path, that URL will 404 after migration with no redirect.

### Recommendation on old URL compatibility

Implement HTTP 301 redirects (Vite `vite.config.js` or Capacitor/server layer) for the 8 root prefixes as part of or immediately after the migration PR. This is a one-time, low-cost mitigation. The redirect pattern is simple and mechanical:

```
/forms/children/en/  →  /forms/en/children/
/forms/children/he/  →  /forms/he/children/
/forms/adolescents/en/  →  /forms/en/adolescents/
/forms/adolescents/he/  →  /forms/he/adolescents/
```

**Do not implement redirects in this PR.**

---

## 12. Recommended Migration Strategy

### Decision: 3-PR split

Audit findings indicate **medium risk** for a single-PR migration:

- 343 files to move
- ~318 registry lines to change across 7 files
- Generator logic changes touching path inference
- ~35 test files with hardcoded path assertions
- 10 manifests with active path fields

A single PR combining generator changes, file moves, registry updates, index regeneration, and test updates would be very large, hard to review safely, and high-risk to roll back.

**Recommended: 3-PR sequence.**

---

## 13. Proposed PR Sequence

### PR 1 — Generator dual-shape support + tests

**Scope:**
- Update `inferAudienceAndLanguage` to detect path shape (audience-first vs language-first) and parse both correctly.
- Update the audience-guard at line 346 to accept both shapes.
- Update `inferCategory` only if the dual-shape change exposes a regression.
- Update `therapeuticFormsIndexGeneratorValidation.test.js` to add language-first path fixtures.
- Update `therapeuticFormsFolderMigrationReadiness.test.js` to accept both `canonical-audience-first` and `canonical-language-first` classifications.
- **Do not** move any PDFs or change any registry URLs.

**Validation:** `npm test`, `npm run build`, `npm run generate:forms-index`, `npm run check:forms-index` — must still emit 493/241/252 (unchanged because no files moved yet).

**Base:** `staging`

---

### PR 2 — Move runtime files + update registries, manifests, index, and tests

**Scope (in strict order):**

1. Move all 343 PDFs from audience-first roots to language-first roots (maintain sub-path structure).
2. Update 7 registry files: replace all audience-first path strings and base-URL constants.
3. Update 10 manifest files: replace all audience-first `file_path` values.
4. Regenerate `src/generated/therapeutic-forms-index.json` via `npm run generate:forms-index`.
5. Update all ~35 unit test files: replace audience-first path fixtures with language-first equivalents.
6. Update `therapeuticFormsFolderMigrationReadiness.test.js`: change `CANONICAL_AUDIENCE_FIRST_PATTERN` to `CANONICAL_LANGUAGE_FIRST_PATTERN`.
7. Update `therapeuticFormsAssetPathSafety.test.js`: update the `children/en/cbt-specialized/module-0[1-5]` URL regex.
8. Update `tests/e2e/therapeutic-forms-awareness.spec.ts` line 68 if that fixture is expected to use an active runtime path.

**Files expected to change:**
- `src/data/therapeuticForms/forms.adolescents.cbt-core.en.js`
- `src/data/therapeuticForms/forms.adolescents.cbt-core.he.js`
- `src/data/therapeuticForms/forms.adolescents.cbt-specialized.he.js`
- `src/data/therapeuticForms/forms.children.cbt-core.en.js`
- `src/data/therapeuticForms/forms.children.cbt-core.he.js`
- `src/data/therapeuticForms/forms.children.cbt-specialized.js`
- `src/data/therapeuticForms/forms.children.cbt-specialized.he.js`
- `src/generated/therapeutic-forms-index.json` (regenerated)
- `public/forms/manifest.children-cbt-specialized-en.json`
- `public/forms/module-01/` through `module-09/` manifests (9 files)
- ~35 test files
- 343 moved PDF files (git mv)

**Expected move count:** 343 files  
**Expected registry line changes:** ~318  
**Expected manifest field changes:** 69  
**Expected test file changes:** ~35 files

**Validation:** `npm test`, `npm run build`, `npm run generate:forms-index`, `npm run check:forms-index`, `npx vitest run test/utils/therapeuticFormsAssetPathSafety.test.js`, `npx vitest run test/utils/therapeuticFormsFolderMigrationReadiness.test.js`, `npx vitest run test/utils/therapeuticFormsGeneratedIndexSafety.test.js`, `npx vitest run test/utils/therapeuticFormsManifestPathSafety.test.js`.

**Base:** `staging`

---

### PR 3 — Remove generator dual-shape support

**Scope:**
- Remove the audience-first branch from `inferAudienceAndLanguage`.
- Remove the dual-shape audience guard; restore to simple language-code check for `segments[1]`.
- Remove any dual-shape test fixtures added in PR 1.

**Condition:** Merge only after PR 2 has been live on staging and validated with zero audience-first paths remaining in the generated index.

**Base:** `staging`

---

## 14. Validation Checklist

Run after each PR before merge:

```bash
npm run lint                          # zero ESLint errors
npm test                              # all unit tests pass
npm run build                         # build must succeed without warnings
npm run generate:forms-index          # regenerate index
npm run check:forms-index             # confirm index not stale

# Forms-specific tests
npx vitest run test/utils/therapeuticFormsAssetPathSafety.test.js
npx vitest run test/utils/therapeuticFormsManifestPathSafety.test.js
npx vitest run test/utils/therapeuticFormsGeneratedIndexSafety.test.js
npx vitest run test/utils/therapeuticFormsFolderMigrationReadiness.test.js
npx vitest run test/utils/therapeuticFormsIndexGeneratorValidation.test.js
```

---

## 15. Post-Merge Verification Checklist

After PR 2 is merged to staging:

- [ ] `src/generated/therapeutic-forms-index.json` total entries = **493**
- [ ] en entries = **241**, he entries = **252**
- [ ] Zero entries with `filePath` starting with `public/forms/children/` or `public/forms/adolescents/`
- [ ] All entries with `filePath` starting with `public/forms/en/` or `public/forms/he/`
- [ ] `find public/forms/children -name "*.pdf" | wc -l` = **0** (all moved)
- [ ] `find public/forms/adolescents -name "*.pdf" | wc -l` = **0** (all moved)
- [ ] `find public/forms/en -name "*.pdf" | wc -l` = **241**
- [ ] `find public/forms/he -name "*.pdf" | wc -l` = **252** (note: 252 + 90 extra for adolescents/he/cbt-core if series PDFs counted separately)
- [ ] `npm run check:forms-index` exits 0 (no stale diff)
- [ ] All unit tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual: open one English form and one Hebrew form in the app on staging — confirm PDF opens
- [ ] Manual: confirm Forms Library page loads without console errors
- [ ] Manual: confirm Chat can suggest a form and the suggested fileUrl resolves

After PR 3 (dual-shape removal):

- [ ] Generator no longer accepts `/forms/{audience}/{lang}/…` paths
- [ ] `npm test` all pass with no audience-first path fixtures remaining
- [ ] `npm run check:forms-index` exits 0

---

## 16. Risks and Mitigations

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| A PDF is missed during the move (git mv error) | Low | High | Verify `find public/forms/{en,he} -name "*.pdf" \| wc -l` = 343 after move |
| Generator dual-shape logic introduces a regression in existing paths | Medium | High | Full test suite + check:forms-index must pass in PR 1 before any file moves |
| Registry base-URL constant update misses a derived URL | Medium | Medium | Run `npm run check:forms-index` after every registry change; stale diff will catch missed entries |
| A manifest `file_path` field is missed | Low | Medium | `therapeuticFormsManifestPathSafety.test.js` validates all manifest file paths exist on disk |
| Old shared/external PDF links break (no redirect) | Medium | Low–Medium | Add server-level prefix redirects in migration PR or immediately after |
| `children/en/cbt-specialized` 15×11 duplicate entries are partially updated | Low | High | The 15 PDFs are each referenced exactly 11 times; if the registry update is complete, all 165 index entries update atomically upon `npm run generate:forms-index` |
| Tests not yet updated block CI after PR 2 | High (certainty) | Medium | Update all ~35 test files in same PR 2 before merging |
| Hebrew RTL metadata broken by move | None | High | RTL is a property of the `language` field, not the path. Language fields do not change in this migration |
| `therapeutic-forms-awareness.spec.ts` line 68 (legacy URL) causes E2E failure | Low | Low | The URL `/forms/adolescents/en/core/…` is not an active file; the test fixture may already be expected to fail and is guarded accordingly |

---

## 17. Statement

**This PR is audit/plan only. No runtime files were moved or changed.**

No PDFs were moved, renamed, or deleted.  
No registry files were edited.  
No manifests were edited.  
No generator code was modified.  
No tests were modified.  
No `src/generated/therapeutic-forms-index.json` was committed as a change.  
Runtime behavior is identical to the pre-PR state.

---

*End of forms-language-first-migration-plan.md*
