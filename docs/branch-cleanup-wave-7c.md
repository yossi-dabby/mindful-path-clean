# Branch Cleanup Wave 7C (Archive Tag + Delete)

> **Status:** Ready for manual dispatch after this PR is merged and approved.
> **Do not run Wave 7C until this PR is merged and approved.**
> **Wave 7C is the final abandoned-WIP archive wave.**

---

## Purpose

Wave 7C is the **final** archive-tag-and-delete cleanup wave for abandoned WIP Copilot branches.
It covers the 12 remaining abandoned WIP Copilot attempts not archived by Wave 7A or Wave 7B.

Wave 7A completed successfully (25/25) and Wave 7B completed successfully (50/50), covering 75 of
the 87 abandoned WIP Copilot branches identified in the post-Wave-5 audit. Wave 7C completes the
final 12.

---

## Scope

Wave 7C includes only branches that satisfy all of the following:

1. Classified as abandoned WIP Copilot attempts in the audit source
2. Older than 90 days (all selected branches are ≥ 98 days old)
3. No open pull request
4. Not protected/special/current branch
5. No blocking references in workflows/docs/README/package/deployment files
6. Not already deleted in Waves 1–6 or archived/deleted in Wave 7A or Wave 7B

**Approved list path:** `docs/branch-cleanup-wave-7c-approved-list.txt`

**Branch count:** 12 (all remaining abandoned WIP Copilot attempts from the audit)

---

## Exact Confirmation Input

To run Wave 7C, the operator must type exactly:

```
CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7C
```

Any other value aborts the workflow immediately.

---

## Workflow and Script

- **Workflow:** `.github/workflows/branch-cleanup-wave-7c-archive.yml`
- **Script:** `scripts/branch-cleanup-wave-7c-archive.mjs`
- **Report output:** `branch-cleanup-wave-7c-report.md`
- **Artifact name:** `branch-cleanup-wave-7c-report`

Workflow behavior:

1. Manual dispatch only (`workflow_dispatch`)
2. Fetches all branches and tags
3. Verifies exact confirmation input
4. Runs Wave 7C archive script
5. Uploads report artifact

---

## Archive Safety Guarantees

For each approved branch, the script performs:

1. Pre-validation checks (existence, open PR, protected/special/current, references, audit classification)
2. Resolve original branch tip SHA
3. Create annotated archive tag
4. Push archive tag to origin
5. Verify remote tag exists
6. Verify remote tag points to exact original SHA
7. Delete branch only after tag verification succeeds
8. Process one branch at a time
9. Stop immediately on verification failure

Archive tag naming prefix:

```
archive/branch-cleanup-wave-7c/YYYYMMDD/
```

---

## Recovery Procedure

If a branch must be restored after cleanup:

```bash
git fetch origin --tags
git checkout -b RECOVERY_BRANCH TAG_NAME
git push origin RECOVERY_BRANCH
```

Wave 7C report includes per-branch tag metadata needed for recovery.

---

## Cumulative Cleanup Progress

| Wave | Strategy | Branches | Status |
|---|---|---|---|
| Wave 1 | Direct-safe delete | 10 | ✅ Completed |
| Wave 2 | Direct-safe delete | 50 | ✅ Completed |
| Wave 3 | Direct-safe delete | 50 | ✅ Completed |
| Wave 4 | Direct-safe delete | 50 | ✅ Completed |
| Wave 5 | Direct-safe delete | 75 | ✅ Completed |
| Wave 6 | Direct-safe delete | 8 | ✅ Completed |
| Wave 7A | Archive tag + delete | 25 | ✅ Completed |
| Wave 7B | Archive tag + delete | 50 | ✅ Completed |
| Wave 7C | Archive tag + delete | 12 | ⏳ Ready to dispatch |
| **Total deleted** | | **330** | |

Wave 7C is the **final** abandoned-WIP archive wave. After dispatch, all 87 abandoned WIP Copilot
branches identified in the post-Wave-5 audit will have been archived and deleted.

---

Last updated: 2026-06-10
