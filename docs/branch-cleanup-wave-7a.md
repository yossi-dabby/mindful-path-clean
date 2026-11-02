# Branch Cleanup Wave 7A (Archive Tag + Delete)

> **Status:** Ready for manual dispatch after this PR is merged and approved.
> **Do not run Wave 7A until this PR is merged and approved.**

---

## Purpose

Wave 7A prepares the first **archive-tag-and-delete** cleanup run for abandoned WIP Copilot branches that are older than 90 days.

This wave is intentionally conservative and capped at 25 branches.

---

## Scope

Wave 7A includes only branches that satisfy all of the following:

1. Classified as abandoned WIP Copilot attempts in the audit source
2. Older than 90 days
3. No open pull request
4. Not protected/special/current branch
5. No blocking references in workflows/docs/README/package/deployment files
6. Not already deleted in Waves 1–6

**Approved list path:** `docs/branch-cleanup-wave-7a-approved-list.txt`

---

## Exact Confirmation Input

To run Wave 7A, the operator must type exactly:

```
CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7A
```

Any other value aborts the workflow immediately.

---

## Workflow and Script

- **Workflow:** `.github/workflows/branch-cleanup-wave-7a-archive.yml`
- **Script:** `scripts/branch-cleanup-wave-7a-archive.mjs`
- **Report output:** `branch-cleanup-wave-7a-report.md`
- **Artifact name:** `branch-cleanup-wave-7a-report`

Workflow behavior:

1. Manual dispatch only (`workflow_dispatch`)
2. Fetches all branches and tags
3. Verifies exact confirmation input
4. Runs Wave 7A archive script
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
archive/branch-cleanup-wave-7a/YYYYMMDD/
```

---

## Recovery Procedure

If a branch must be restored after cleanup:

```bash
git fetch origin --tags
git checkout -b RECOVERY_BRANCH TAG_NAME
git push origin RECOVERY_BRANCH
```

Wave 7A report includes per-branch tag metadata needed for recovery.

---

Last updated: 2026-06-10
