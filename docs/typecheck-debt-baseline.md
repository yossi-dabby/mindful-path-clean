# Typecheck Debt Baseline — Mindful Path CBT App

> **Status as of PR-10 (2026-06-09):** Informational and non-blocking.
>
> Typecheck is currently informational and non-blocking. Do not block releases
> on it until the baseline is materially reduced and hot paths are clean.

---

## 1. Current Typecheck Status

| Metric | Value |
|---|---|
| Command | `npm run typecheck` |
| Exit code | **2 (failing)** |
| Total errors | **2432** |
| Affected files | **224** |
| Is a CI gate? | **No — informational only** |
| Last measured | 2026-06-09 (PR-10 baseline audit) |

Running the audit:

```bash
npm run typecheck         # fails with exit 2; output is informational
npm run typecheck:report  # always exits 0; prints error summary
```

---

## 2. Top Error Categories

| TS Code | Count | Meaning | Primary Cause |
|---|---|---|---|
| TS2322 | 1460 | Type assignment mismatch | JSX prop typing — Framer Motion `MotionStyle`, shadcn/radix component refs |
| TS2339 | 483 | Property does not exist | `import.meta.env` not typed, Base44 SDK types incomplete |
| TS2559 | 139 | No type overlap | JSX spread/generic mismatches |
| TS2741 | 93 | Missing required properties | Partially-typed JSX props |
| TS2345 | 71 | Argument not assignable | Callback/event handler type gaps |
| TS18047 | 67 | Possibly null/undefined | Missing null guards in JS files |
| TS2698 | 19 | Spread on non-object type | Spread patterns in form/data utilities |
| Others | ~100 | Misc | See full output via `npm run typecheck:report` |

The dominant category (TS2322, 60% of all errors) is JSX prop typing in
Framer Motion and shadcn/radix-ui components. These are third-party integration
patterns that require targeted type annotations, not mass refactoring.

---

## 3. Top Affected Directories

| Directory | ~Errors | Notes |
|---|---|---|
| `src/components/goals/` | 286 | Complex wizard and form components |
| `src/components/experiential_games/` | 175 | Game UI with Framer Motion |
| `src/components/journal/` | 163 | Rich editor integrations |
| `src/components/home/` | 137 | Dashboard / personalized feed |
| `src/components/knowledge/` | 113 | Admin/coach knowledge tools |
| `src/components/coaching/` | 102 | Session management |
| `src/components/mood/` | 83 | Mood tracking components |
| `src/components/chat/` | 75 | **High-risk — do not mass-edit** |
| `src/components/exercises/` | 72 | Exercise content display |
| `src/components/community/` | 72 | Community feed |
| `src/components/utils/` | 70 | AI data normalizer, validators |
| `src/pages/` | 576 | Route-level pages |

Files outside `jsconfig.json` `include` scope but pulled in by imports:

- `src/api/base44Client.js` — Base44 SDK, not directly editable for type fixes
- `src/lib/*.js` — 15 utility library files
- `src/data/therapeuticForms/index.js` — Generated forms data
- `src/utils/*.js` — 2 audio utility files

---

## 4. Top Files by Error Count

| File | ~Errors | Risk Level |
|---|---|---|
| `src/components/utils/aiDataNormalizer.jsx` | 55 | 🔴 High — AI data path |
| `src/pages/Community.jsx` | 49 | 🟠 Medium |
| `src/pages/Chat.jsx` | 48 | 🔴 High — core Chat path |
| `src/components/knowledge/ChunkForm.jsx` | 48 | 🟠 Medium |
| `src/components/goals/GoalCoachWizard.jsx` | 48 | 🟠 Medium |
| `src/pages/AdvancedAnalytics.jsx` | 43 | 🟡 Lower |
| `src/components/coaching/PersonalizedInsights.jsx` | 43 | 🟠 Medium |
| `src/components/home/PersonalizedContentFeed.jsx` | 41 | 🟠 Medium |
| `src/components/goals/GoalForm.jsx` | 41 | 🟠 Medium |
| `src/pages/ExerciseView.jsx` | 39 | 🟡 Lower |

---

## 5. Why Typecheck Is Not a Hard CI Gate

1. **Legacy debt volume.** 2432 errors accumulated during rapid development.
   Forcing a hard gate would block all PRs immediately.

2. **Third-party typing gaps.** The majority of errors (TS2322) stem from
   Framer Motion and shadcn/radix-ui component typing patterns that require
   targeted, component-by-component annotation work — not a quick fix.

3. **High-risk runtime files.** `Chat.jsx`, `aiDataNormalizer.jsx`,
   `validateAgentOutput.jsx`, and the AI wiring files contain the errors with
   the highest fix cost and the highest regression risk. Mass-editing these
   would destabilize production behavior.

4. **The app is stable.** Lint, unit tests (8180 passing), build, and Playwright
   E2E all pass. The typecheck errors do not reflect runtime instability.

5. **Generated files.** Some errors originate in files that are generated or
   managed by Base44. Manual type edits to those files would be overwritten or
   could break the runtime contract.

---

## 6. Why Mass-Fixing Is Unsafe

- **Chat and AI paths are safety-critical.** `Chat.jsx`,
  `src/components/utils/aiDataNormalizer.jsx`, `src/lib/therapistStrategyEngine.js`,
  and the agent wiring files must not be edited without explicit approval.
- **Framer Motion prop fixes require per-component testing.** Adding type
  assertions or casts to animation props can alter rendered behavior.
- **Implicit `any` removal changes semantics.** In JS files with `checkJs`,
  removing implicit `any` may require adding JSDoc annotations that change
  how TypeScript interprets downstream code.
- **Generated files must not be manually edited.** Files under `src/generated/`
  and Base44 entity definitions under `src/api/entities/` are auto-generated
  or runtime-managed.
- **Mass reformatting obscures the real diff.** Large type-only PRs are hard
  to review safely in a production-sensitive app.

---

## 7. Safe Staged Reduction Strategy

Type debt should be reduced incrementally, in isolated, reviewable PRs:

1. **One category or one directory per PR** — not random multi-file fixes.
2. **Low-risk files first** — docs, test utilities, pure helpers.
3. **High-risk paths last** — Chat, AI normalizer, agent wiring, safety filters.
4. **Each PR must pass full CI** — lint, unit tests, build, E2E.
5. **No fixes in `src/api/entities/`** — those require schema review.
6. **No fixes in `functions/`** — those require human approval.
7. **Re-measure after each PR** and update the baseline numbers in this doc.

---

## 8. No-Growth Policy

These rules apply to all future PRs:

1. **New files should introduce zero avoidable typecheck errors.** If a new
   file is added under the `jsconfig.json` include scope, it should not add
   new TS errors unless there is an explicit documented reason.

2. **Files touched for feature work should not increase the error count** in
   that file when reasonable. If you edit a file that already has type errors,
   do not add more.

3. **High-risk runtime files should not be edited just to satisfy typecheck.**
   Do not make changes to `Chat.jsx`, AI wiring, safety filters, or agent
   utilities solely to reduce type error count.

4. **Type fixes should be isolated in small PRs.** Do not mix type fixes with
   feature work or bug fixes.

5. **Generated files must not be manually edited for typecheck.**
   `src/generated/therapeutic-forms-index.json` and `src/api/entities/` are
   out of scope for manual type edits.

6. **Tests may be improved gradually.** Do not rewrite test files broadly to
   fix type errors — small, targeted improvements are fine.

7. **Type cleanup should be grouped by category or directory.** Do not make
   random multi-file type fixes in a single PR.

8. **JSDoc additions to excluded files (`src/lib/`, `src/api/`) require review.**
   These files are currently outside the explicit include scope but are still
   checked because they are imported. Changes there affect the broader type
   surface.

---

## 9. How to Update the Baseline Responsibly

After any PR that intentionally reduces typecheck errors:

1. Run `npm run typecheck:report` and note the new error count.
2. Update the **Current Typecheck Status** table at the top of this document.
3. Update the **Top Affected Directories** and **Top Files** tables if the
   distribution has changed significantly.
4. Commit the updated doc in the same PR that made the type fixes.
5. Note in the PR description: "Typecheck baseline updated: X → Y errors."

---

## 10. Criteria for Making Typecheck a Hard CI Gate

Do not convert typecheck to a blocking CI gate until **all** of the following
are true:

- [ ] Total error count is below 100 (from current 2432)
- [ ] All errors in `src/pages/Chat.jsx` are resolved
- [ ] All errors in `src/components/utils/aiDataNormalizer.jsx` are resolved
- [ ] All errors in `src/components/chat/` are resolved
- [ ] All errors in files that are in the `jsconfig.json` include scope are resolved
- [ ] `import.meta.env` typing is resolved (either via `vite/client` types or JSDoc)
- [ ] The Base44 SDK type gaps are documented and resolved or suppressed with intent
- [ ] The error count has been stable (not growing) for at least 3 PRs
- [ ] A human reviewer has confirmed the gate is safe to enable

---

## 11. Staged Burn-Down Roadmap

### Stage 0 — Baseline and report only *(this PR)*

**Scope:** Audit, document, add `npm run typecheck:report` script. No code changes.
**Risk:** None.
**Validation:** `npm run typecheck:report` exits 0; all other CI passes.
**Acceptance:** Baseline documented; `typecheck:report` runs without error.
**Do not touch:** Any source file.

---

### Stage 1 — Low-risk docs/scripts/test typing cleanup

**Scope:** Type errors in `test/` files, `scripts/` files, and pure utility
helpers with no production path (`src/utils/`, `src/hooks/`).
**Risk:** Low — no production runtime code.
**Validation:** `npm test`, `npm run lint`, `npm run build` all pass.
**Acceptance:** Error count measurably reduced; no test regressions.
**Do not touch:** `src/pages/Chat.jsx`, `src/components/chat/`,
`src/components/utils/aiDataNormalizer.jsx`, agent wiring, safety filters.

---

### Stage 2 — Generated / index / tooling boundaries

**Scope:** Address errors from files outside the `jsconfig.json` include scope
that are pulled in by imports — particularly `src/lib/` utilities that have
simple, low-risk type gaps (null guards, missing return types).
Address `import.meta.env` typing by adding a `vite/client` reference or JSDoc.
**Risk:** Low-medium — `src/lib/` files are runtime code but mostly pure utilities.
**Validation:** `npm test`, `npm run build`, `npm run typecheck:report`.
**Acceptance:** `src/lib/` errors reduced; `src/api/base44Client.js` env typing resolved.
**Do not touch:** `src/lib/therapistStrategyEngine.js`,
`src/lib/workflowContextInjector.js`, `src/lib/therapistSafetyMode.js` — these
are high-risk and require human review.

---

### Stage 3 — Therapeutic forms data layer typing

**Scope:** Address errors in `src/data/therapeuticForms/` and related form
components. These are data-layer files with well-defined contracts.
**Risk:** Medium — forms data layer powers the therapeutic forms library; E2E
tests must pass.
**Validation:** `npm run generate:forms-index`, `npm run check:forms-index`,
`npm test`, `npm run test:e2e`.
**Acceptance:** Forms data layer errors resolved; generated index unchanged.
**Do not touch:** `src/generated/therapeutic-forms-index.json` (generated),
`src/api/entities/` (schema-managed).

---

### Stage 4 — Chat attachment and AI access typing

**Scope:** Address type errors in `src/components/chat/` (non-routing components)
and `src/utils/` files related to chat utilities.
**Risk:** High — Chat is a core production path; requires human review.
**Validation:** Full Playwright E2E suite; `npm test`; human review required.
**Acceptance:** Chat component errors reduced; no change to Chat routing or AI
access behavior.
**Do not touch:** `src/pages/Chat.jsx` (Stage 5), AI wiring files,
`validateAgentOutput.jsx`.

---

### Stage 5 — High-risk UI/runtime files with targeted tests

**Scope:** Address errors in `src/pages/Chat.jsx`,
`src/components/utils/aiDataNormalizer.jsx`,
`src/components/utils/validateAgentOutput.jsx`, and the high-scrutiny `src/lib/`
therapy utilities.
**Risk:** Very high — these files directly affect production AI behavior and
user-facing clinical features. Each fix must be independently tested.
**Validation:** Full Playwright E2E, unit tests, human review, explicit approval.
**Acceptance:** Hot path errors resolved; no behavioral regression; human sign-off.
**Do not touch:** Agent wiring, safety filter functions — those remain off-limits.

---

### Stage 6 — Convert typecheck to soft CI signal

**Scope:** Add `npm run typecheck` as a non-blocking CI step with a recorded
artifact. Configure an error budget threshold (e.g., fail if count exceeds the
previous baseline).
**Risk:** Low — CI step exits 0; does not block merge.
**Validation:** CI passes; artifact is visible; error count is measurable per run.
**Acceptance:** Typecheck output is visible in every CI run as an artifact.

---

### Stage 7 — Convert typecheck to hard CI gate

**Scope:** Enable typecheck as a required CI check only after all criteria in
Section 10 are satisfied.
**Risk:** Low if criteria are met; high if rushed.
**Validation:** All criteria in Section 10 confirmed; human sign-off.
**Acceptance:** `npm run typecheck` exits 0 on every PR.

---

## 12. Running the Typecheck Report

```bash
# Informational — always exits 0
npm run typecheck:report

# Raw typecheck — exits 2 (failing) — informational only
npm run typecheck

# Manual error count (requires tsc output)
npm run typecheck 2>&1 | grep "^Found"
```

---

*This document was created in PR-10 of the stabilization sprint.
Update the baseline table (Section 1) after any PR that intentionally reduces
typecheck errors.*
