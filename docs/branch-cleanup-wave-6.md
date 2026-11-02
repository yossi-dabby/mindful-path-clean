# Branch Cleanup Wave 6

> **Status:** Ready for manual dispatch after this PR is merged and approved.
> **Do not run Wave 6 until this PR is merged and approved.**

---

## Purpose

Wave 6 prepares a **direct-safe delete only** cleanup pass. This wave intentionally includes only branches that remain safe after a fresh post-Wave-5 / post-PR-781 re-check and excludes every abandoned, closed-unmerged, stale no-PR, or recent branch pool.

---

## Current Baseline

- **Total deleted before Wave 6:** 235 branches
- **Current branch count before Wave 6:** about 271 remote branches
- **Open pull requests during the refresh:** 0
- **Expected direct-safe candidate ceiling from the audit:** up to 28 branches
- **Final approved Wave 6 count after the fresh re-check:** 8 branches

The approved list is smaller than the audit ceiling because Wave 6 keeps only branches that still satisfy the direct-safe classification, the older-than-14-days rule, and the reference-blocking rules at execution time.

---

## Scope of Wave 6

Wave 6 includes **direct-safe branches only**:

1. Branches that are git-merged into `origin/main`
2. Branches explicitly classified by the audit as PR-merged via squash/rebase

**Approved list path:** `docs/branch-cleanup-wave-6-approved-list.txt`

---

## Explicitly Excluded from Wave 6

Wave 6 does **not** include:

- 87 abandoned WIP Copilot attempts
- 40 closed-unmerged branches older than 90 days
- 83 closed-unmerged branches 30–90 days old
- 11 no-PR stale branches
- recent or likely in-flight branches
- protected or special branches
- `main`
- `staging-fresh`
- cleanup infrastructure or current working branches

Wave 7 must handle archive-tag-and-delete follow-up work for the abandoned WIP set instead of direct deletion.

---

## Exact Confirmation Input

To run Wave 6, the operator must type exactly:

```
CONFIRM_DELETE_DIRECT_SAFE_BRANCHES_WAVE_6
```

Any other value aborts the workflow immediately.

---

## Safety Rules

1. The workflow is `workflow_dispatch` only.
2. The approved list must not be empty and must not exceed 30 entries.
3. `main`, `origin/main`, `staging-fresh`, and `origin/staging-fresh` are always blocked.
4. Empty strings and branch names with dangerous shell characters are blocked.
5. Every listed branch must exist on `origin`.
6. Every listed branch must have no open pull request.
7. Every listed branch must not be the current branch or any protected/special branch.
8. Every listed branch must have no references in workflows, docs, README, package, or deployment config files, except for `docs/branch-cleanup-wave-6-approved-list.txt` itself.
9. Every listed branch must be either git-merged into `origin/main` or explicitly present in the audit-approved PR-merged safe-delete list.
10. The script prints a pre-delete safety table, validates the entire list before any deletion, deletes one branch at a time only after all checks pass, and writes `branch-cleanup-wave-6-report.md`.

---

## How to Run from GitHub Actions

1. Open the repository on GitHub.
2. Go to the **Actions** tab.
3. Select **Branch Cleanup Wave 6**.
4. Click **Run workflow**.
5. In the **confirm** input, type exactly:

   ```
   CONFIRM_DELETE_DIRECT_SAFE_BRANCHES_WAVE_6
   ```

6. Click **Run workflow**.

The workflow will:

- check out the repository
- fetch all remote branches
- verify the exact confirmation input
- run `scripts/branch-cleanup-wave-6.mjs`
- upload `branch-cleanup-wave-6-report.md` as an artifact

---

## Warnings

> ⚠️ **Do not run Wave 6 until this PR is merged and approved.**

> ⚠️ **Wave 7 should be archive-tag-and-delete, not direct delete.**

---

Last updated: 2026-06-10
