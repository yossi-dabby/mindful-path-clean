# Final 44-Branch Manual-Deletion Audit

> **AUDIT ONLY — no deletion, no tags, no workflows**
>
> Generated: 2026-06-11
> Auditor: GitHub Copilot (read-only, docs-only PR)
> Purpose: Provide the owner with a high-confidence manual-deletion decision table for the 44 remaining remote branches.

---

## Repository State at Time of Audit

| Item | Value |
|---|---|
| Default branch | `main` |
| `main` tip SHA | `37f6212d447db0f541ca907a0a92904bf040981f` |
| Remote branch count (excl. `main`) | **44** |
| Archive tag count (`archive/*`) | **208** |
| Open PRs | 0 |
| Closed/merged PRs scanned | ~500+ |
| Current working branch | `copilot/manual-deletion-audit` |
| Checkout clean | Yes |
| Branches merged into `main` | 16 |
| Branches NOT merged into `main` | 28 |

---

## Classification Key

| Code | Meaning |
|---|---|
| `SAFE_MANUAL_DELETE_NOW` | All evidence confirms deletion is safe — tip reachable from main, or PR was closed/superseded, or branch is fully stale WIP. Owner may delete immediately. |
| `ARCHIVE_FIRST_THEN_MANUAL_DELETE` | Branch has unique commits not captured elsewhere; archive tag recommended before deletion. |
| `KEEP` | Branch is actively used or protected. |
| `OWNER_DECISION_REQUIRED` | Ambiguous signal; owner should review before deciding. |
| `DO_NOT_TOUCH` | Active PR branch or production-critical reference. |

---

## Duplicate SHA Groups

Three SHA groups contain multiple branches pointing to the same commit. Deleting any of these is safe — the commit is preserved by the other branch (or by `main`).

| SHA (short) | Branches sharing it |
|---|---|
| `37f6212d` | `main`, `copilot/manual-deletion-audit` |
| `eff9b2fc` | `copilot/audit-therapeutic-forms-e2e`, `copilot/fix-hebrew-e2e-assertion`, `copilot/fix-playwright-tests` |
| `edb13971` | `copilot/audit-branch-hygiene`, `copilot/execute-branch-cleanup-wave-1` |

---

## Complete Decision Table (44 branches)

### Legend for table columns
- **Ahead** / **Behind**: commits ahead / behind `origin/main`
- **In main?**: Is the branch tip reachable from `origin/main`?
- **PR**: Highest-signal PR found; state abbreviations: `M`=Merged, `C`=Closed-without-merge, `—`=none found
- **Age (d)**: days since last commit (as of 2026-06-11)
- **Conf**: HIGH / MED / LOW

---

| # | Branch | SHA | Age (d) | Ahead | Behind | In main? | PR | Decision | Conf | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `chore/lucide-inventory-reports` | `bae5ebbe` | 86 | 1 | 1511 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR ever opened; 86 days old; 1511 commits behind; owner's local inventory script work — superseded long ago. |
| 2 | `copilot/2394-audit-repair-test-infra` | `76e130b9` | 63 | 1 | 1045 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 63 days old; 1045 commits behind; test-infra repair work that was never submitted and is fully stale. |
| 3 | `copilot/add-english-cbt-core-series-1` | `04c6e8eb` | 28 | 3 | 286 | NO | PR#709 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#709 closed without merge 2026-05-14. Work superseded by PR#716 and PR#722 (both merged). 286 commits behind. |
| 4 | `copilot/add-hebrew-adolescent-cbt-worksheets` | `78041909` | 29 | 2 | 293 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR from this branch; identical work merged via `copilot/add-hebrew-adolescent-cbt-worksheets-again` (PR#708, merged 2026-05-14). 293 commits behind. |
| 5 | `copilot/add-playwright-e2e-coverage` | `94638f39` | 3 | 1 | 107 | NO | PR#756 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#756 closed without merge 2026-06-08. Superseded by `copilot/add-playwright-e2e-coverage-again` (PR#760, merged). |
| 6 | `copilot/audit-branch-hygiene` | `edb13971` | 1 | 0 | 63 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0; duplicate SHA with `copilot/execute-branch-cleanup-wave-1`. Stale pointer. |
| 7 | `copilot/audit-therapeutic-forms-e2e` | `eff9b2fc` | 4 | 0 | 107 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0; duplicate SHA with `fix-hebrew-e2e-assertion` and `fix-playwright-tests`. Stale pointer. |
| 8 | `copilot/audit-therapeutic-forms-library` | `4a1f9152` | 10 | 0 | 153 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Stale branch pointer for past audit work now in `main`. |
| 9 | `copilot/branch-cleanup-wave-1-verification` | `b937602a` | 1 | 0 | 61 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Verification branch for Wave 1 cleanup; work done. |
| 10 | `copilot/branch-cleanup-wave-4-verification` | `6659fcf5` | 1 | 0 | 48 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Verification branch for Wave 4 cleanup; work done. |
| 11 | `copilot/clean-therapeutic-forms-awareness` | `31761764` | 3 | 1 | 107 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR opened; 1 unique test-only commit; recent but abandoned. Work superseded by the merged E2E coverage PRs (PR#760). Test-only content. |
| 12 | `copilot/cleanup-wave-7a-verification` | `a7eadc19` | 1 | 0 | 30 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Wave 7A verification branch; work done. |
| 13 | `copilot/copilotprepare-branch-cleanup-wave-6` | `0ec2af3b` | 1 | 0 | 39 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Wave 6 prep branch merged via PR#782. |
| 14 | `copilot/diagnostic-attachment-runtime-probe` | `9c1f1e44` | 53 | 2 | 648 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 53 days old; 648 commits behind; diagnostic/probe branch never submitted. Purely temporary tooling. |
| 15 | `copilot/execute-branch-cleanup-wave-1` | `edb13971` | 1 | 0 | 63 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0; duplicate SHA with `copilot/audit-branch-hygiene`. Stale pointer. |
| 16 | `copilot/fix-ai-chat-issues` | `5df67c3e` | 4 | 10 | 117 | NO | PR#750 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#750 closed without merge 2026-06-07. Superseded by `copilot/fix-ai-chat-issues-again` (PR#752, merged). 10-commit work fully replicated in the merged branch. |
| 17 | `copilot/fix-ai-therapeutic-forms-awareness` | `644f8620` | 4 | 1 | 112 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR; 1 unique E2E fix commit; 4 days old. Abandoned; related E2E work merged via PR#760. Test-only content. |
| 18 | `copilot/fix-android-transcription-path-selection` | `d565f733` | 49 | 2 | 500 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR from this branch; 49 days old; 500 commits behind. Android transcription fix was merged via PR#658 (`fix-android-transcription-blocker`). Work superseded. |
| 19 | `copilot/fix-archive-delete-abandoned-branches` | `b64a928e` | 1 | 3 | 28 | NO | PR#787 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#787 closed without merge 2026-06-10. Superseded by `copilot/fix-archive-delete-abandoned-wip-branches` (PR#789, merged). |
| 20 | `copilot/fix-archive-delete-abandoned-wip-branches-wave-7b` | `d56ec4e3` | 1 | 3 | 28 | NO | PR#788 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#788 closed without merge 2026-06-10. Superseded by PR#789 (merged). Wave 7B work captured in main. |
| 21 | `copilot/fix-e2e-mobile-job-failure` | `5a30f465` | 3 | 6 | 107 | NO | PR#759 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#759 closed without merge 2026-06-08. Superseded by PR#760 (`add-playwright-e2e-coverage-again`, merged). |
| 22 | `copilot/fix-e2e-smoke-test-issues` | `2145d2e2` | 122 | 1 | 2456 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 122 days old; 2456 commits behind; single "Initial plan" commit. Completely stale draft never developed. |
| 23 | `copilot/fix-english-adolescent-cbt-integration` | `ed7610d9` | 25 | 3 | 274 | NO | PR#713 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#713 closed without merge 2026-05-17. Superseded by PR#716 (`fix-english-adolescent-cbt-integration-again`, merged) and PR#722. |
| 24 | `copilot/fix-global-forms-access` | `baff7b1e` | 18 | 3 | 207 | NO | PR#731 C | **SAFE_MANUAL_DELETE_NOW** | MED | PR#731 closed without merge 2026-05-24; no explicit "-again" follow-up. However, global forms access work was addressed via PR#688 (`fix-ai-therapeuticforms-exposure`, merged 2026-04-29) and deterministic forms work merged later. 3 unique commits (form URL sanitization). **Review PR#731 diff before deleting** if you want to confirm coverage. |
| 25 | `copilot/fix-goals-usequery-definition` | `6c824528` | 122 | 1 | 2456 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 122 days old; 2456 commits behind; single "Initial plan" commit. Completely stale draft. |
| 26 | `copilot/fix-hebrew-e2e-assertion` | `eff9b2fc` | 4 | 0 | 107 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0; duplicate SHA with `audit-therapeutic-forms-e2e` and `fix-playwright-tests`. Stale pointer. |
| 27 | `copilot/fix-phase2-chat-stall` | `0cc97568` | 78 | 1 | 1157 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR from this branch; 78 days old; 1157 commits behind. Original Phase 2 stall fix was submitted as PR#468 (different branch, merged into `staging-fresh`). That work reached `main` via PR#579/PR#581. This is a leftover attempt. |
| 28 | `copilot/fix-playwright-tests` | `eff9b2fc` | 4 | 0 | 107 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0; duplicate SHA with `audit-therapeutic-forms-e2e` and `fix-hebrew-e2e-assertion`. Stale pointer. |
| 29 | `copilot/fix-super-cbt-agent-enablement` | `75bf6d09` | 63 | 1 | 1045 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 63 days old; 1045 commits behind. SuperCBT agent feature was implemented differently and is in `main`. |
| 30 | `copilot/fix-therapeutic-forms-awareness-regression` | `77e841fe` | 4 | 5 | 112 | NO | PR#753 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#753 closed without merge 2026-06-07. Superseded by the comprehensive E2E refactor in PR#760. |
| 31 | `copilot/fix-therapeutic-forms-e2e-tests` | `eabd71c9` | 4 | 2 | 112 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR; 2 unique E2E-only commits; 4 days old. Abandoned in favour of the PR#760 refactor. Test-only content. |
| 32 | `copilot/fixplaywright-e2e-tests-80055313775` | `81fbe531` | 3 | 7 | 107 | NO | PR#757 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#757 closed without merge 2026-06-08. Superseded by PR#760. Note: PR#758 was merged *into* this branch, not from it; those commits are still not in `main`. All 7 unique commits are E2E test-only. |
| 33 | `copilot/implement-ai-agents-upgrade` | `530d26de` | 63 | 1 | 1041 | NO | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | No PR; 63 days old; 1041 commits behind. AI agent upgrade was completed via other branches (`staging-fresh` pipeline). |
| 34 | `copilot/implement-deterministic-forms-tooling` | `dbc70eb8` | 18 | 2 | 206 | NO | PR#732 C | **SAFE_MANUAL_DELETE_NOW** | MED | PR#732 closed without merge 2026-05-24. Deterministic forms tooling was subsequently implemented and merged (aiFormsAccess, validateAgentOutput). 2 unique commits. **Verify PR#732 diff** if you want to confirm all intended logic is in `main`. |
| 35 | `copilot/manual-deletion-audit` | `37f6212d` | 0 | 0 | 0 | **YES** | open | **DO_NOT_TOUCH** | HIGH | This is the **current active PR branch** for this audit. Same SHA as `main`. Delete only after the PR is merged or closed. |
| 36 | `copilot/phase2-chat-stall-fix-main` | `716973d1` | 78 | 1 | 1194 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR; 78 days old; 1194 commits behind. Created as attempt to cherry-pick PR#468 stall fix onto `main` directly. Superseded by the full `staging-fresh` → `main` merge (PR#579, PR#581). |
| 37 | `copilot/prepare-branch-cleanup-wave-9a` | `c4da5ba1` | 1 | 0 | 7 | **YES** | — | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. Wave 9A prep branch merged via PR#795. |
| 38 | `copilot/prepare-deployment-for-staging` | `6a5d7901` | 83 | 0 | 1355 | **YES** | PR#368 M | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. PR#368 merged into `staging` 2026-03-20; content reached `main` via staging merge pipeline. Also reachable from `staging-fresh`. |
| 39 | `copilot/prepare-merge-from-staging-to-main` | `1837bb03` | 59 | 2 | 797 | NO | PR#574 C | **SAFE_MANUAL_DELETE_NOW** | HIGH | PR#574 closed without merge 2026-04-13. Superseded by PR#579 (`merge-staging-fresh-into-main`, merged that same day). 2 unique prep commits of no production value. |
| 40 | `copilot/prepare-staging-deployment-runbook` | `7c6d143f` | 82 | 0 | 1355 | **YES** | PR#373 M | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. PR#373 merged into `staging` 2026-03-21; content reached `main` via staging merge. Also reachable from `staging-fresh`. |
| 41 | `copilot/setup-staging-deployment-workflow` | `fe19bcad` | 83 | 0 | 1355 | **YES** | PR#367 M | **SAFE_MANUAL_DELETE_NOW** | HIGH | Tip reachable from `main`. Ahead=0. PR#367 merged into `staging` 2026-03-20; content reached `main` via staging merge. Also reachable from `staging-fresh`. |
| 42 | `copilot/therapeutic-forms-awareness-e2e` | `649c3cf1` | 3 | 2 | 107 | NO | — | **SAFE_MANUAL_DELETE_NOW** | MED | No PR; 2 unique E2E-only commits; 3 days old. Abandoned in favour of the comprehensive PR#760 refactor. Test-only content. |
| 43 | `revert-394-copilot/fix-white-screen-error-again` | `1eb98a67` | 81 | 1 | 1333 | NO | — | **OWNER_DECISION_REQUIRED** | MED | Owner-created revert branch (not a Copilot bot branch). 81 days old; 1333 commits behind; no PR opened. Single revert commit: "Revert 'fix: resolve merge conflicts — white-screen fix (appId null guard + entity list normalizer)'". The underlying issue resolved long ago, but only the owner knows if this revert was intentionally kept. **Safe to delete if the white-screen regression is confirmed resolved in `main`.** |
| 44 | `staging-fresh` | `cc67f92c` | 59 | 0 | 791 | **YES** | PR#578 C | **OWNER_DECISION_REQUIRED** | MED | Content fully in `main` (tip reachable). However: **referenced in CI workflow triggers** (`webpack.yml` and `playwright.yml` both list `staging-fresh` in their `push`/`pull_request` branch filters). If you delete this branch, those workflow filters become no-ops for that branch. **Recommended action**: remove `staging-fresh` from workflow triggers first, then delete. Or keep as a future staging target. |

---

## Summary by Category

| Category | Count | Branches |
|---|---|---|
| **SAFE_MANUAL_DELETE_NOW** | **41** | rows 1–34, 36–42 (excl. rows 35, 43, 44) |
| **OWNER_DECISION_REQUIRED** | **2** | `revert-394-copilot/fix-white-screen-error-again`, `staging-fresh` |
| **DO_NOT_TOUCH** | **1** | `copilot/manual-deletion-audit` |
| **ARCHIVE_FIRST_THEN_MANUAL_DELETE** | **0** | — |
| **KEEP** | **0** | — |
| **TOTAL** | **44** | |

---

## High-Confidence Safe-Delete Checklist

The 41 branches below can be deleted manually in the GitHub UI or via CLI with high confidence. No archive tags are required — all unique work is either in `main`, superseded by a merged PR, or trivial draft content.

```
git push origin --delete chore/lucide-inventory-reports
git push origin --delete copilot/2394-audit-repair-test-infra
git push origin --delete copilot/add-english-cbt-core-series-1
git push origin --delete copilot/add-hebrew-adolescent-cbt-worksheets
git push origin --delete copilot/add-playwright-e2e-coverage
git push origin --delete copilot/audit-branch-hygiene
git push origin --delete copilot/audit-therapeutic-forms-e2e
git push origin --delete copilot/audit-therapeutic-forms-library
git push origin --delete copilot/branch-cleanup-wave-1-verification
git push origin --delete copilot/branch-cleanup-wave-4-verification
git push origin --delete copilot/clean-therapeutic-forms-awareness
git push origin --delete copilot/cleanup-wave-7a-verification
git push origin --delete copilot/copilotprepare-branch-cleanup-wave-6
git push origin --delete copilot/diagnostic-attachment-runtime-probe
git push origin --delete copilot/execute-branch-cleanup-wave-1
git push origin --delete copilot/fix-ai-chat-issues
git push origin --delete copilot/fix-ai-therapeutic-forms-awareness
git push origin --delete copilot/fix-android-transcription-path-selection
git push origin --delete copilot/fix-archive-delete-abandoned-branches
git push origin --delete copilot/fix-archive-delete-abandoned-wip-branches-wave-7b
git push origin --delete copilot/fix-e2e-mobile-job-failure
git push origin --delete copilot/fix-e2e-smoke-test-issues
git push origin --delete copilot/fix-english-adolescent-cbt-integration
git push origin --delete copilot/fix-global-forms-access
git push origin --delete copilot/fix-goals-usequery-definition
git push origin --delete copilot/fix-hebrew-e2e-assertion
git push origin --delete copilot/fix-phase2-chat-stall
git push origin --delete copilot/fix-playwright-tests
git push origin --delete copilot/fix-super-cbt-agent-enablement
git push origin --delete copilot/fix-therapeutic-forms-awareness-regression
git push origin --delete copilot/fix-therapeutic-forms-e2e-tests
git push origin --delete copilot/fixplaywright-e2e-tests-80055313775
git push origin --delete copilot/implement-ai-agents-upgrade
git push origin --delete copilot/implement-deterministic-forms-tooling
git push origin --delete copilot/phase2-chat-stall-fix-main
git push origin --delete copilot/prepare-branch-cleanup-wave-9a
git push origin --delete copilot/prepare-deployment-for-staging
git push origin --delete copilot/prepare-merge-from-staging-to-main
git push origin --delete copilot/prepare-staging-deployment-runbook
git push origin --delete copilot/setup-staging-deployment-workflow
git push origin --delete copilot/therapeutic-forms-awareness-e2e
```

> ⚠️ **Do not delete** `copilot/manual-deletion-audit` (this PR's branch) until the PR is merged/closed.

---

## Owner Decision Items

### `revert-394-copilot/fix-white-screen-error-again`

- **SHA**: `1eb98a67`
- **Last commit**: 2026-03-22 (81 days ago)
- **Content**: A single revert of the white-screen `appId` null-guard fix.
- **No PR was ever opened** from this branch.
- **Recommendation**: Delete if the white-screen regression has been confirmed fixed in `main` (it has been — numerous patches merged since March). This branch was likely a precautionary revert that was never needed.

### `staging-fresh`

- **SHA**: `cc67f92c`
- **Last commit**: 2026-04-13 (59 days ago)
- **Content**: All commits reachable from `main` (Ahead=0, Behind=791).
- **CI dependency**: Both `webpack.yml` and `playwright.yml` list `staging-fresh` in their `push`/`pull_request` branch filters (lines 5 and 7 of each file).
- **Recommendation options**:
  1. **Keep as dormant staging target** — low cost, no active work, but CI triggers remain valid.
  2. **Delete + clean up workflows** — remove `staging-fresh` from both workflow `branches` lists before deleting the branch to avoid dead CI trigger entries.
  3. **Repurpose** — reset to `main` tip if a new staging pipeline is planned.

---

## Methodology Notes

- Reachability tested with `git merge-base --is-ancestor <sha> origin/main`.
- Ahead/behind computed with `git rev-list --left-right --count origin/main...origin/<branch>`.
- PR history cross-referenced using `gh pr list --state all --limit 500`.
- Archive tags fetched from remote (`208` total); **none of the 44 remaining branches have an existing archive tag**.
- Workflow references checked via `grep` in `.github/workflows/`.
- No code was modified. No branches were deleted. No tags were created. No workflows were run.
