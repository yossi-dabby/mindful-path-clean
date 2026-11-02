# Therapeutic Forms — Upload Readiness & PR Review Checklist

> **Purpose:** Prevent regressions whenever therapeutic forms assets, registry entries, index data, AI access metadata, or Chat attachment behavior change.
> Use this document for every PR that touches `public/forms/`, `src/data/therapeuticForms/`, `src/generated/therapeutic-forms-index.json`, `scripts/generate-therapeutic-forms-index.mjs`, or any related file listed in Section I below.
> See also: `docs/therapeutic-forms-ingestion.md`, `docs/copilot-pr-workflow.md`.

---

## A. Before Uploading Assets

1. **Choose the canonical folder path.**
   For replacement content, follow the generator-supported pattern:
   `public/forms/{language}/{audience}/{group-or-category}/...`.
   The old audience-first and upload-wrapper paths describe retired content;
   do not recreate them. See `docs/therapeutic-forms-ingestion.md`.
   Do not invent new folder hierarchies without updating this doc.

2. **Avoid temporary folder suffixes for new uploads.**
   Suffixes like `_git` or `_github_upload` are legacy artifacts from early ingestion batches.
   New uploads must use the final canonical path directly.
   Never commit placeholder folders with temporary names.

3. **Verify audience/language/category/module naming before uploading.**
   - Accepted audience values: `children`, `adolescents`, `adults`, `older_adults`, `parents`
   - Accepted language codes: `en`, `he`, `es`, `fr`, `de`, `it`, `pt`
   - Category and module names must match existing values in `src/data/therapeuticForms/categories.js`
   - Add new taxonomy values additively; do not rename existing ones

4. **Decide whether combined PDFs are included.**
   Combined PDFs (one PDF covering multiple worksheets) must be intentional.
   Confirm that `isCombinedPdf: true` will be set in the form metadata.

5. **Confirm no placeholder PDFs.**
   Every uploaded PDF must be the real, final therapeutic content.
   Do not upload placeholder or stub PDFs that are not ready for clinical use.

---

## B. After Uploading Assets

1. **Verify every PDF is expected.**
   Cross-check uploaded files against the manifest or planned registry entries.
   Every file in `public/forms/` should correspond to a registered form.

2. **Verify no orphan PDFs.**
   Run `npm run check:forms-index` — it will detect forms registered in the index that do not have a matching PDF file.
   Manually verify the reverse: no PDF file exists in `public/forms/` without a corresponding registry entry.

3. **Verify file paths are deterministic.**
   File paths in registry entries must be stable, predictable, and not contain environment-specific or temporary names.
   All paths must start with `/forms/` and resolve correctly from the app root.

4. **Verify future naming convention is followed.**
   Document the chosen naming convention in this file or in `docs/therapeutic-forms-ingestion.md` if a new convention is established.

---

## C. Registry / Index Validation

Run the following commands in order after any forms asset or registry change:

### Required (blocking)

```bash
# 1. Regenerate the canonical index from source metadata
npm run generate:forms-index

# 2. Validate the generated index is not stale and passes all checks
npm run check:forms-index

# 3. Run the full unit test suite (includes parity and index validation tests)
npm test

# 4. Build the application
npm run build

# 5. Lint
npm run lint
```

All five commands must pass with zero errors before the PR is eligible for merge.

### Informational (currently non-blocking)

```bash
# Type check — currently fails due to legacy JS/TS debt; non-blocking but useful to monitor
npm run typecheck
```

Do not introduce new TypeScript errors in code you have changed.

### Key tests to verify

- `test/utils/therapeuticFormsGeneratedIndexParity.test.js` — parity between source metadata and generated index
- `test/utils/therapeuticFormsIndexGeneratorValidation.test.js` — structural validation of generated index fields
- Any test in `test/` or `tests/e2e/` that references forms, AI awareness, or Chat attachments

---

## D. Forms Library QA

Verify the following in the browser after any forms asset or UI change:

- [ ] Hebrew forms appear **only** in Hebrew mode (language selector set to `he`)
- [ ] English forms appear **only** in English mode (language selector set to `en`)
- [ ] Audience → Collection → Module/Stage → Worksheet navigation works end-to-end
- [ ] View-mode persistence works (last viewed mode is remembered on reload)
- [ ] Breadcrumb and back-navigation work at every level
- [ ] Combined PDFs are visible where expected (dedicated combined PDF card per stage)
- [ ] No form is labeled with a raw technical ID as its primary label
- [ ] Sorting order is correct: language → audience → category → series → module → worksheet

---

## E. AI Awareness QA

Verify that the AI agent can locate newly added or modified forms via the following lookup types:

- [ ] **Exact title lookup** — ask the agent for a form by its exact title
- [ ] **Clinical need lookup** — describe a clinical need that the form addresses
- [ ] **Audience lookup** — ask for forms for a specific audience
- [ ] **Language lookup** — ask for forms in a specific language; confirm no language leakage (Hebrew forms not returned for English requests and vice versa)
- [ ] **Module/stage lookup** — ask for forms from a specific module or stage
- [ ] **Multi-form request** — request multiple forms; confirm cap of 5 per response is enforced
- [ ] **No language leakage** — confirm that Hebrew titles/labels do not appear in English responses and vice versa

---

## F. Chat Attachment QA

Verify the following after any change that touches Chat attachment behavior, `GeneratedFileCard`, or `formFileUrls`:

- [ ] **Single form request** — Chat returns a `generated_file` attachment with correct form data
- [ ] **Multi-form request** — Chat returns a `generated_files` attachment; no accidental collapse to a single card
- [ ] **Open button** — routes through `/pdf-viewer` with a sanitized `/forms/*.pdf` path (inline viewer)
- [ ] **Download button** — uses the `?download=1` attachment URL (triggers browser file download)
- [ ] **`data-language` attribute** — `GeneratedFileCard` has the correct `data-language` value for each card
- [ ] **`data-form-id` attribute** — correct form ID is set on each card
- [ ] **`data-is-combined-pdf` attribute** — correct value for combined vs worksheet cards

---

## G. Required CI Gates

The following CI jobs must be **green** before the PR is eligible for merge:

| CI Job | Workflow file | Notes |
|---|---|---|
| Test Suite (Node 20) | `.github/workflows/webpack.yml` | Unit tests + build |
| Test Suite (Node 22) | `.github/workflows/webpack.yml` | Unit tests + build |
| E2E `smoke-production-critical` | `.github/workflows/playwright.yml` | Critical path smoke |
| E2E `web-desktop` | `.github/workflows/playwright.yml` | Full desktop E2E |
| E2E `mobile-390x844` | `.github/workflows/playwright.yml` | Mobile viewport E2E |

**Do not merge a PR with failing CI, even if the failure appears unrelated.** Investigate and fix, or document a clear root cause with evidence that the failure is pre-existing and unrelated to this PR.

---

## H. Manual QA After Deploy

After deploying to staging, verify:

- [ ] Forms Library navigation works on desktop and mobile
- [ ] Chat first-message form request returns the correct form
- [ ] Multi-form Chat request returns the correct forms (up to 5)
- [ ] Open and Download both work from the Forms Library
- [ ] Open and Download both work from a Chat attachment card
- [ ] Language gating is correct (Hebrew forms appear only in Hebrew mode, English only in English mode)

---

## I. Do-Not-Touch List

The following files must **not** be edited casually. Each requires explicit approval and careful review:

| File | Why It Is High Risk |
|---|---|
| `scripts/generate-therapeutic-forms-index.mjs` | Generates the canonical index; changes can corrupt all form registrations |
| `scripts/check-therapeutic-forms-index.mjs` | CI guard for stale index; weakening it removes the primary regression gate |
| `src/generated/therapeutic-forms-index.json` | Generated file — never hand-edit; always regenerate via `npm run generate:forms-index` |
| `src/data/therapeuticForms/index.js` | Root registry loader; changes affect every form lookup in the app |
| `src/data/therapeuticForms/aiFormsAccess.js` | AI-facing deterministic access layer; changes affect AI form recommendations |
| `src/utils/resolveFormIntent.js` | Chat-side form intent resolver; changes affect which forms the AI attaches |
| `src/components/utils/validateAgentOutput.jsx` | Agent output validation and attachment guard; changes affect all Chat form cards |
| `src/pages/Chat.jsx` | Main Chat page; form router context and policy refresh logic live here |
| `src/components/chat/MessageBubble.jsx` | Renders Chat messages including form attachment cards |
| `src/components/chat/GeneratedFileCard.jsx` | Renders individual form cards; changes affect Open/Download behavior and data attributes |
| `src/components/chat/utils/formFileUrls.js` | Constructs Open/Download URLs; changes affect all file URL generation |
| `src/pages/TherapeuticForms.jsx` | Forms Library page; language gating, filtering, and sorting live here |

---

## J. Test & Assertion Guardrails

These rules apply to all PRs, not just forms-related ones:

1. **Do not weaken assertions to make CI pass.**
   A failing test is a signal. Fix the root cause, not the assertion.

2. **Do not replace behavior tests with text-only checks.**
   Tests must verify that the correct component rendered or the correct action occurred — not just that some text appears on screen.

3. **Do not rely only on echoed user text.**
   Form-router-enriched prompts may not render a user bubble in Chat.
   Wait for `POST /messages` and input reset instead of asserting echoed user text visibility.

4. **Inspect Playwright artifacts before changing E2E tests.**
   When an E2E test fails in CI, download the artifacts (screenshots, trace, error context) before modifying the test.
   Understand what actually happened; do not adjust timeouts or selectors blindly.

5. **Route mocks must be specific.**
   Mock only the specific API routes and responses your test requires.
   Do not broadly mock static assets or entire API namespaces.

6. **Do not broadly mock static assets.**
   PDF files and form assets must resolve correctly in tests.
   Broad static mocking hides missing-asset regressions.

7. **CI Playwright is authoritative.**
   When the local browser install is unavailable, CI Playwright results are the ground truth.
   Do not mark a test as passing locally if it fails in CI.

8. **Update PR descriptions after implementation changes.**
   If the implementation diverges from what was originally described in the PR, update the PR description before requesting review.
   A PR description that does not match the actual diff misleads reviewers.

9. **Do not use parity exclusions to hide missing registrations.**
   The parity test exclusion list in `test/utils/therapeuticFormsGeneratedIndexParity.test.js` exists for genuinely unregistered assets with a documented reason.
   Do not add a new exclusion to pass the test. Fix the registration, or explain the intentional unregistered asset with explicit evidence in the PR description.

10. **Do not skip, delete, or mark tests as `fixme`.**
    Every skipped or deleted test is a regression gate removed. If a test is flaky, fix the flakiness.

---

## L. New-Language Parity Requirements

Every new language added to the forms library must include its own parity checks
before any upload PR is merged. The English parity suite (`test/utils/therapeuticFormsEnglishParity.test.js`
and `tests/e2e/forms-library-english-parity.spec.ts`) established in PR-11 is the
reference implementation.

For each new language, the following must be covered:

- **Generated index language coverage** — all forms carry the correct `language` code;
  count in the generated index is > 0; every form has `id`, `title`, `fileUrl`, `audience`,
  `category`, `collectionId`.
- **Forms Library language gating** — the new language's collection labels appear in
  that language's locale; no other language's labels bleed through.
- **AI exact-title lookup** — representative titles from the generated index resolve
  back to the correct form through `searchFormsForAI`.
- **AI clinical-need lookup** — common clinical queries (anxiety, OCD, anger, sleep,
  self-esteem) surface forms in the new language only; no cross-language leakage.
- **Multi-form generated_files behaviour** — multi-form requests return only the new
  language's files; `generated_file` equals the first `generated_files` item;
  `MAX_GENERATED_FILES_PER_RESPONSE` cap is respected.
- **Open/Download card behaviour** — generated file cards carry `data-language` equal
  to the new language code; Open and Download controls remain distinct; the correct
  PDF URL is used (no substitution from another language).
- **RTL/LTR layout checks** — if the language is RTL (e.g. Arabic, Hebrew), include
  overflow and directionality assertions matching the Hebrew layout E2E spec
  (`tests/e2e/forms-library-hebrew-layout.spec.ts`); if LTR, verify no accidental
  RTL document direction is set.

Do not build parity checks for a future language in the same PR as form uploads
for that language. Always add parity tests first (a "readiness" PR), then upload.

---

## K. Quick Pre-Merge Checklist

Before opening a forms-related PR for review, confirm:

- [ ] `npm run generate:forms-index` — passes
- [ ] `npm run check:forms-index` — passes
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — succeeds
- [ ] `npm run lint` — zero errors
- [ ] No orphan PDFs in `public/forms/`
- [ ] No missing PDF assets for registered forms
- [ ] Hebrew forms only appear in Hebrew mode
- [ ] English forms only appear in English mode
- [ ] AI can locate newly added forms (if AI awareness changed)
- [ ] Open and Download both work (if attachment behavior changed)
- [ ] CI is green before requesting review
- [ ] PR description matches the actual final diff
- [ ] No parity exclusions added to hide missing registrations
- [ ] No assertions weakened or tests skipped
