# Branch Cleanup Wave 2

> **Status:** Ready for manual dispatch after this PR is merged and approved.
> **Do not run Wave 2 until this PR is merged and approved.**

---

## Purpose

Wave 2 continues the controlled branch hygiene cleanup that began with Wave 1. It targets **50 additional branches** that are fully merged into `main`, have no open PRs, and are older than 14 days.

Wave 2 uses the same safety philosophy and tooling as Wave 1: a manually-dispatched GitHub Actions workflow, an exact-match confirmation string, per-branch runtime safety checks, and a full artifact report.

---

## Wave 1 Confirmation

Branch Cleanup Wave 1 completed successfully and deleted **10 branches**:

| Branch |
|---|
| `copilot/featmobile-coach-content-depth` |
| `copilot/featmobile-coach-content-depth-again` |
| `copilot/featmobile-coach-header-cta-fab` |
| `copilot/improve-coach-screen-mobile-copy` |
| `feat/mobile-coach-header-cta-fab` |
| `copilot/add-ci-playwright-integration` |
| `add-playwright-workflow` |
| `copilot/add-e2e-test-documentation` |
| `copilot/add-playwright-e2e-tests` |
| `copilot/add-playwright-e2e-tests-again` |

None of these 10 branches are included in the Wave 2 list.

---

## Wave 2 Approved List

The full approved list is committed at:

```
docs/branch-cleanup-wave-2-approved-list.txt
```

It contains **50 branches** — the 50 oldest SAFE_DELETE_MERGED candidates from the post-Wave-1 inventory, verified on 2026-06-10.

---

## Confirmation Input

To run Wave 2, you must type the following **exact string** in the workflow dispatch form:

```
CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_2
```

Any other value (including the Wave 1 string) will abort the run immediately.

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

> Note: `docs/branch-cleanup-wave-2-approved-list.txt` is intentionally excluded from the reference scan because it is the canonical deletion manifest. Any matching branch reference in any other scanned file still blocks deletion.

---

## How to Run from GitHub Actions

1. Navigate to the repository on GitHub.
2. Click the **Actions** tab.
3. Select **Branch Cleanup Wave 2** in the left sidebar.
4. Click **Run workflow**.
5. In the **confirm** input field, type exactly:
   ```
   CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_2
   ```
6. Click **Run workflow**.

The workflow will:
- Fetch all remote branches.
- Validate the confirmation input (any typo aborts immediately).
- Run `scripts/branch-cleanup-wave-2.mjs` which performs all safety checks.
- Delete only the branches that pass every check.
- Upload a full report as a workflow artifact.

---

## ⚠️ Warning: Do Not Run Before Merge

**Do not run Wave 2 until this PR is merged and approved.**

Running the workflow before this PR is merged means the approved list and script are not yet on `main`, which may produce unexpected behavior.

---

## ⚠️ Warning: Wave 3 Requires a Separate PR

**Wave 3 requires a separate PR and list.**

Do not modify the Wave 2 approved list to add more branches. If additional branches need to be cleaned up after Wave 2, create a new PR with:

- `docs/branch-cleanup-wave-3-approved-list.txt`
- `.github/workflows/branch-cleanup-wave-3.yml`
- `scripts/branch-cleanup-wave-3.mjs`

---

## Inspecting the Artifact Report

After the workflow run completes:

1. Click the workflow run in the **Actions** tab.
2. Scroll to the **Artifacts** section at the bottom of the run summary.
3. Download **branch-cleanup-wave-2-report**.
4. Open `branch-cleanup-wave-2-report.md`.

The report includes:
- Start and end timestamps
- Repository name
- Summary table (requested / deleted / skipped / failed)
- Safety confirmation checklist
- Per-branch action and notes

---

Last updated: 2026-06-10
