# Branch Cleanup Wave 5

> **Status:** Ready for manual dispatch after this PR is merged and approved.
> **Do not run Wave 5 until this PR is merged and approved.**

---

## Purpose

Wave 5 continues the controlled branch-cleanup process established in Waves 1–4. Because Waves 2, 3, and 4 each completed with 50 successful deletions and zero failures or skips, Wave 5 increases the per-wave cap from 50 to **75 branches**.

The 2026-06-10 inventory found **75 remote branches** that qualified as `SAFE_DELETE_MERGED` after applying all Wave 5 safety rules. These are the oldest freshly verified merged branches that were not already deleted in a previous wave.

---

## Wave History

| Wave | Branches Deleted | Status |
|---|---|---|
| Wave 1 | 10 | ✅ Successfully deleted |
| Wave 2 | 50 | ✅ Successfully deleted |
| Wave 3 | 50 | ✅ Successfully deleted |
| Wave 4 | 50 | ✅ Successfully deleted |
| **Total deleted before Wave 5** | **160** | ✅ Confirmed |

---

## Why the Cap Increased to 75

Waves 2, 3, and 4 each deleted exactly 50 branches with zero skipped or failed deletions. This consistent track record justifies a controlled increase to 75 for Wave 5. The cap will not exceed 75 in this wave.

---

## Wave 5 Approved List

**Path:** `docs/branch-cleanup-wave-5-approved-list.txt`

The approved list contains **75 branches** selected from the post-Wave-4 inventory:

- 334 remote heads on `origin`
- 77 remote branches merged into `origin/main` and older than 14 days that were not already deleted in Waves 1–4
- 0 open pull requests in the repository
- The 75 oldest qualifying branches were selected

---

## Exact Confirmation Input

To run Wave 5, the operator must type exactly:

```
CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_5
```

Any other value aborts the workflow immediately.

---

## Safety Rules

Wave 5 keeps the same safety rules as the earlier cleanup waves, with one intentional change: the per-wave cap is raised to 75.

1. The workflow is `workflow_dispatch` only.
2. The approved list must not exceed 75 entries.
3. `main`, `origin/main`, `staging-fresh`, and `origin/staging-fresh` are always blocked.
4. Empty strings and branch names with dangerous shell characters are blocked.
5. Every listed branch must exist on `origin`.
6. Every listed branch must be fully merged into `origin/main`.
7. Every listed branch must have no open pull request.
8. Every listed branch must not be the current branch or any protected/special branch.
9. Every listed branch must have no references in workflows, docs, README, package, or deployment config files, except for `docs/branch-cleanup-wave-5-approved-list.txt` itself.
10. The script prints a pre-delete safety table, deletes one branch at a time only after validation passes, and writes `branch-cleanup-wave-5-report.md`.

---

## How to Run from GitHub Actions

1. Open the repository on GitHub.
2. Go to the **Actions** tab.
3. Select **Branch Cleanup Wave 5**.
4. Click **Run workflow**.
5. In the **confirm** input, type exactly:

   ```
   CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_5
   ```

6. Click **Run workflow**.

The workflow will:

- check out the repository
- fetch remote branches
- verify the exact confirmation input
- run `scripts/branch-cleanup-wave-5.mjs`
- upload `branch-cleanup-wave-5-report.md` as an artifact

---

## Warnings

> ⚠️ **Do not run Wave 5 until this PR is merged and approved.**

> ⚠️ **Wave 6 requires a separate PR and a separate approved list if more cleanup remains.**

---

Last updated: 2026-06-10
