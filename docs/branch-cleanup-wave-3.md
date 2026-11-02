# Branch Cleanup Wave 3

## Purpose

This document describes the third controlled wave of branch cleanup for the **mindful-path** repository.

Wave 3 deletes up to 50 remote branches that are fully merged into `main`, have no open pull requests, are older than 14 days, and are not referenced in any workflow, documentation, or configuration file. The cleanup is performed by a manually dispatched GitHub Actions workflow with mandatory confirmation input and runtime safety validation.

---

## Wave History

| Wave | PR | Branches Deleted | Status |
|---|---|---|---|
| Wave 1 | #773 | 10 | ✅ Successfully deleted |
| Wave 2 | #775 | 50 | ✅ Successfully deleted |
| Wave 3 | This PR | Up to 50 | ⏳ Pending dispatch |

---

## Wave 3 Approved List

**Path:** `docs/branch-cleanup-wave-3-approved-list.txt`

The list contains 50 branches selected from the post-Wave-2 remote inventory, verified on 2026-06-10:

- All branches exist on `origin`
- All branches are fully merged into `main` (verified via `git branch -r --merged origin/main`)
- No open pull requests (verified via `gh pr list --state open`)
- All branches are older than 14 days (oldest: 2026-01-13, newest: 2026-03-04)
- None are `main`, `staging-fresh`, or the current branch
- None were deleted in Wave 1 or Wave 2

---

## How to Run Wave 3

> ⚠️ **Do not run Wave 3 until this PR is merged and approved.**

1. Navigate to the **Actions** tab in the GitHub repository.
2. Select **Branch Cleanup Wave 3** from the workflow list.
3. Click **Run workflow**.
4. In the confirmation input, type exactly:

   ```
   CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_3
   ```

5. Click **Run workflow** to start.

Any other confirmation value will immediately abort the run without deleting anything.

---

## Exact Confirmation Input

```
CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_3
```

---

## Safety Rules

The Wave 3 script enforces all of the following before any deletion:

1. The approved list must not exceed 50 entries.
2. `main`, `origin/main`, `staging-fresh`, and `origin/staging-fresh` are always protected.
3. Branch names must contain only safe characters (alphanumeric, hyphens, underscores, slashes, dots).
4. Every branch is verified to exist on the remote immediately before deletion.
5. Every branch is verified to be a strict ancestor of `origin/main` (`git merge-base --is-ancestor`).
6. Every branch is verified to have no open pull requests via the GitHub REST API.
7. Every branch is verified to have no references in `.github/workflows/`, `docs/`, `README.md`, `package.json`, `railway.toml`, `vercel.json`, or `netlify.toml` — with the sole exception of `docs/branch-cleanup-wave-3-approved-list.txt` itself.
8. If any PR API call fails, the script aborts immediately without deleting anything.
9. Branches are deleted one at a time only after all pass validation.
10. A report is written to `branch-cleanup-wave-3-report.md` and uploaded as a GitHub Actions artifact.

---

## Workflow Details

- **File:** `.github/workflows/branch-cleanup-wave-3.yml`
- **Trigger:** `workflow_dispatch` only — no automatic triggers
- **Permissions:** `contents: write`, `pull-requests: read`
- **Script:** `scripts/branch-cleanup-wave-3.mjs`
- **Report artifact:** `branch-cleanup-wave-3-report` (retained for 90 days)

---

## Warnings

> ⚠️ **Do not run Wave 3 until this PR is merged and approved by the repository owner.**

> ⚠️ **Wave 4 requires a separate PR and a separate approved list. Do not reuse this list for Wave 4.**
