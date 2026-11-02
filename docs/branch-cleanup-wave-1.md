# Branch Cleanup Wave 1

> **Status:** Ready for manual dispatch. No branches have been deleted by this PR.

---

## Background

A read-only branch hygiene audit of this repository identified **243 branches** classified as `SAFE_DELETE_MERGED`. A direct deletion attempt through the GitHub Copilot integration failed with:

```
403 Resource not accessible by integration
```

This is expected: the Copilot integration token does not have `contents:write` permission. A repository-owned GitHub Actions workflow running with `GITHUB_TOKEN` _does_ have this permission, making it the safe and correct mechanism for branch cleanup.

---

## Why `workflow_dispatch` Only

The cleanup workflow is intentionally **not** triggered by push, pull request, or schedule. It must be:

1. **Reviewed** — a human reads this document and the approved list before running.
2. **Explicitly confirmed** — the operator types an exact confirmation string at dispatch time.
3. **One-off** — it does not run again automatically after merge.

---

## Approved Wave 1 Strategy

Wave 1 is intentionally small and conservative. It targets **10 branches** that the audit classified as `SAFE_DELETE_MERGED`. Each branch must independently pass all safety checks immediately before deletion — the workflow does not rely solely on the earlier audit result.

The full approved list is committed at:

```
docs/branch-cleanup-wave-1-approved-list.txt
```

If you need to delete additional branches, create a separate PR with a **Wave 2** list and a corresponding workflow run. Do not modify the Wave 1 list retroactively.

---

## Safety Rules

Every branch is checked for **all** of the following immediately before deletion:

| Rule | Detail |
|---|---|
| Remote exists | `git ls-remote --exit-code --heads origin <branch>` |
| Fully merged | `git merge-base --is-ancestor origin/<branch> origin/main` |
| No open PRs | `GET /repos/{owner}/{repo}/pulls?head={owner}:{branch}&state=open` |
| Not protected | Branch name must not be `main`, `origin/main`, `staging-fresh`, or `origin/staging-fresh` |
| Not current branch | HEAD is checked; current branch is never deleted |
| No dangerous chars | Only `[a-zA-Z0-9\-_/.]` are allowed in branch names |
| Not referenced | `git grep` across `.github/workflows/`, `docs/`, `README*`, `package.json`, `railway.toml`, `vercel.json`, `netlify.toml` |
| List size | Approved list must not exceed 50 entries |

If **any** check fails, the script aborts immediately and no further branches are deleted.

> Note: `docs/branch-cleanup-wave-1-approved-list.txt` is intentionally excluded from the reference scan because it is the canonical deletion manifest. Any matching branch reference in any other scanned file still blocks deletion, and a rerun after this fix should delete only branches that continue to pass every runtime safety check.

---

## How to Run the Workflow

1. Navigate to the repository on GitHub.
2. Click the **Actions** tab.
3. Select **Branch Cleanup Wave 1** in the left sidebar.
4. Click **Run workflow**.
5. In the **confirm** input field, type exactly:
   ```
   CONFIRM_DELETE_SAFE_MERGED_BRANCHES
   ```
6. Click **Run workflow**.

The workflow will:
- Fetch all remote branches.
- Validate the confirmation input (any typo aborts immediately).
- Run `scripts/branch-cleanup-wave-1.mjs` which performs all safety checks.
- Delete only the branches that pass every check.
- Upload a full report as a workflow artifact.

---

## This Workflow Is Not Automatic and Not Recurring

- It runs **only** when manually dispatched by a human with appropriate repository permissions.
- It does **not** run after merge, on schedule, or on push.
- Running it again after all Wave 1 branches are deleted will produce a "branch not found" skip for each entry in the list — no harm done.

---

## Only Approved List Branches Can Be Deleted

The script reads `docs/branch-cleanup-wave-1-approved-list.txt` at runtime and processes only the branches listed there. It is **not** possible to delete an arbitrary branch by dispatching this workflow — the branch must be in the committed approved list.

---

## Inspecting the Artifact Report

After the workflow run completes:

1. Click the workflow run in the **Actions** tab.
2. Scroll to the **Artifacts** section at the bottom of the run summary.
3. Download **branch-cleanup-wave-1-report**.
4. Open `branch-cleanup-wave-1-report.md`.

The report includes:
- Start and end timestamps
- Repository name
- Summary table (requested / deleted / skipped / failed)
- Safety confirmation checklist
- Per-branch action and notes

---

## Wave 2

If additional branches need to be cleaned up after Wave 1:

1. Create a new PR.
2. Add a new approved list file (e.g. `docs/branch-cleanup-wave-2-approved-list.txt`).
3. Add a corresponding workflow (e.g. `.github/workflows/branch-cleanup-wave-2.yml`) that references the new list.
4. Follow the same review and dispatch process.

Do **not** append branches to this Wave 1 list or re-use this workflow for a different batch.

Last updated: 2026-06-10
