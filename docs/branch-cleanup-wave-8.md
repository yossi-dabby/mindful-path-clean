# Branch Cleanup Wave 8

Wave 8 is a mixed low-risk cleanup wave with two separated execution phases.

## Scope

- Direct delete phase: 15 branches from `DIRECT_DELETE_SAFE_MERGED`
- Archive-then-delete phase: 40 branches from `ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_OLDER_THAN_90D`
- Total cap: 55 branches

## Safety guardrails

- Workflow trigger is `workflow_dispatch` only.
- Exact confirmation string is required before execution.
- The direct phase validates all candidates before deleting any branch.
- The archive phase validates all candidates before tagging/deleting any branch.
- Archive phase deletes only after remote archive-tag verification and SHA match.
- Archive phase re-checks branch tip SHA immediately before deletion.
- Each phase is isolated: failed validation blocks deletion in that phase.

## Files

- Workflow: `.github/workflows/branch-cleanup-wave-8.yml`
- Script: `scripts/branch-cleanup-wave-8.mjs`
- Direct approved list: `docs/branch-cleanup-wave-8-direct-approved-list.txt`
- Archive approved list: `docs/branch-cleanup-wave-8-archive-approved-list.txt`
- Report output: `branch-cleanup-wave-8-report.md`

Last updated: 2026-06-10
