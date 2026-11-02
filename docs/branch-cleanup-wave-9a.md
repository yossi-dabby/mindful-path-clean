# Branch Cleanup Wave 9A

Wave 9A is a medium-risk archive-then-delete cleanup wave targeting closed-unmerged branches aged 30–90 days.

## Scope

- Archive-then-delete phase: 25 branches from `ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D`
- Total cap: 25 branches
- Age range: 30–90 days (inclusive)
- Branches selected: oldest first (85d → 84d → 80d)

## Background

| Phase | Description | Branches Removed |
|-------|-------------|-----------------|
| Waves 1–6 | Direct-delete safe-merged branches | 243 |
| Wave 7A | Archive + delete abandoned WIP Copilot branches (batch 1) | 25 |
| Wave 7B | Archive + delete abandoned WIP Copilot branches (batch 2) | 50 |
| Wave 7C | Archive + delete abandoned WIP Copilot branches (batch 3) | 12 |
| Wave 8 | Direct-delete + archive-then-delete (55 branches) | 55 |
| **Wave 9A** | **Archive-then-delete closed-unmerged 30–90d (batch 1)** | **25** |

## Safety Guardrails

- Workflow trigger is `workflow_dispatch` only.
- Exact confirmation string is required before execution.
- The script validates all candidates before tagging or deleting any branch.
- Every branch must be classified as `ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D` in the post-Wave-7C audit with age 30–90 days.
- Branches with age >90 days (handled by Wave 8) are rejected.
- Branches with age <30 days are rejected.
- Archive tags are created, pushed, and verified before branch deletion.
- Archive branch SHA is re-checked immediately before each deletion.
- Processing occurs one branch at a time; any failure stops the run.

## Confirmation String

```
CONFIRM_ARCHIVE_AND_DELETE_CLOSED_UNMERGED_30_90D_WAVE_9A
```

## Files

- Workflow: `.github/workflows/branch-cleanup-wave-9a-archive.yml`
- Script: `scripts/branch-cleanup-wave-9a-archive.mjs`
- Approved list: `docs/branch-cleanup-wave-9a-approved-list.txt`
- Report output: `branch-cleanup-wave-9a-report.md`

## Archive Tag Pattern

```
archive/branch-cleanup-wave-9a/YYYYMMDD/<branch-name>
```

## Recovery

If a branch is deleted and needs to be restored:

```bash
git fetch origin --tags
git tag -l "archive/branch-cleanup-wave-9a/*"
git checkout -b <branch-name> <archive-tag>
git push origin <branch-name>
```

Last updated: 2026-06-10
