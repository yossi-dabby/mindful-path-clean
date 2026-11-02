# Remaining Branch Reduction Audit
**Generated:** 2026-06-10  
**Audit type:** Read-only / AUDIT ONLY — no branches deleted  
**Repository:** yossi-dabby/mindful-path  

---

## Executive Summary

After five cleanup waves (235 branches deleted), the repository has **271 remote branches** remaining.
This audit classifies all of them to identify the safest path for further reduction.

| Bucket | Count | Recommended Action |
|--------|------:|-------------------|
| 🔒 Preserve — protected / special | 8 | **KEEP** — do not touch |
| ✅ Safe Delete — merged into `main` (git-confirmed) | 21 | **Wave 6 candidate** |
| ✅ Safe Delete — PR merged (commits in main) | 7 | **Wave 6 candidate** |
| ✅ Safe Delete — abandoned `[WIP]` closed PRs (>90 d) | 87 | **Wave 6 candidate** |
| ⚠️ Candidate Delete — closed PR without merge (>90 d) | 40 | **Wave 7 after owner sign-off** |
| ⚠️ Candidate Delete — closed PR without merge (30–90 d) | 83 | **Wave 7 after owner sign-off** |
| ⚠️ Candidate Delete — no PR, stale (30–90 d) | 9 | **Owner review required** |
| ⚠️ Candidate Delete — no PR, old (>90 d) | 2 | **Owner review required** |
| 🔍 Owner Review — closed PR, recent (<30 d) | 9 | **Owner decision needed** |
| 🔍 Owner Review — no PR, recent (<30 d) | 5 | **Owner decision needed** |
| **TOTAL** | **271** | |

### Potential reduction

| Wave | Branches | Confidence |
|------|--------:|-----------|
| Wave 6 (immediate, no owner sign-off needed) | **115** | Highest — all merged or abandoned WIP |
| Wave 7 (after owner reviews candidates) | up to **134** | Medium — closed/abandoned PRs |
| **Maximum possible reduction** | **249** of 271 | |

After Wave 6 + 7: estimated **22–156** branches remaining (down from 271).

---

## Phase 1 — Repository State

| Item | Value |
|------|-------|
| Remote branch count | 271 |
| Default / protected branch | `main` (SHA `efa1f8f1b8d9`) |
| `staging-fresh` SHA | `cc67f92c1252` |
| Branches merged into `main` (git) | 29 (including `main` itself) |
| Branches reachable from `staging-fresh` | 13 |
| Unmerged branches | 242 |
| Open PRs | 0 |
| Total closed PRs scanned | 778 |
| Unique branches with closed PRs | 751 |
| Merged closed PRs | 525 |
| Closed-without-merge PRs | 226 |
| Current working branch | `copilot/audit-branch-reduction` |

---

## Category Definitions

| Category | Meaning |
|----------|---------|
| `KEEP_PROTECTED` | `main` or `staging-fresh` — never touch |
| `KEEP_CURRENT` | This audit's own working branch |
| `KEEP_CLEANUP_INFRA` | Branch cleanup wave infrastructure branches |
| `SAFE_DELETE_MERGED` | Git `--merged origin/main` confirms tip is ancestor of `main` |
| `SAFE_DELETE_MERGED_PR` | PR was merged (work landed in main), branch not git-detected merged (squash/rebase merge) |
| `SAFE_DELETE_ABANDONED_WIP` | PR had `[WIP]` in title, closed without merge, >90 days old — clearly abandoned Copilot attempts |
| `CANDIDATE_DELETE_CLOSED_PR_OLD` | PR closed without merge, >90 days old — likely abandoned |
| `CANDIDATE_DELETE_CLOSED_PR_STALE` | PR closed without merge, 30–90 days old — probably abandoned |
| `NO_PR_STALE` | No PR history, 30–90 days old |
| `NO_PR_OLD` | No PR history, >90 days old |
| `NO_PR_RECENT` | No PR, <30 days — may be in-flight work |
| `REVIEW_CLOSED_RECENT` | Closed PR, <30 days — very recent, owner should confirm before deleting |

---

## Section 1 — Preserve: Protected / Special Branches (8 total)

**These must never be deleted.**

### 1a. Protected Branches

| Branch | Date | Age |
|--------|------|-----|
| `main` | active | 0 d |
| `staging-fresh` | 2026-04-13 | 58 d |

### 1b. This Audit's Working Branch

| Branch | Date | Age |
|--------|------|-----|
| `copilot/audit-branch-reduction` | 2026-06-10 | 0 d |

### 1c. Branch Cleanup Wave Infrastructure

| Branch | Date | Age | Notes |
|--------|------|-----|-------|
| `copilot/audit-branch-hygiene` | 2026-06-10 | 0 d | Same SHA as execute-branch-cleanup-wave-1 |
| `copilot/branch-cleanup-wave-1-verification` | 2026-06-10 | 0 d | |
| `copilot/branch-cleanup-wave-4-verification` | 2026-06-10 | 0 d | |
| `copilot/cleanup-wave-1-executor` | 2026-06-10 | 0 d | PR #773 merged 2026-06-10 |
| `copilot/execute-branch-cleanup-wave-1` | 2026-06-10 | 0 d | Same SHA as audit-branch-hygiene |

---

## Section 2 — Wave 6 Candidates: Safe Delete (115 branches)

All safe to delete. No owner sign-off required beyond approving Wave 6.

> Note: Exact branch names for the final direct-safe Wave 6 execution set are maintained in `docs/branch-cleanup-wave-6-approved-list.txt` so the cleanup workflow's reference-blocking guard can still operate safely.

### 2a. SAFE_DELETE_MERGED — Git-confirmed merged into `main` (21 branches)

These branches' tips are direct ancestors of `origin/main`.

| Branch | Last Commit | Age | PR | PR Date |
|--------|------------|-----|-----|---------|
| `copilot/audit-and-refresh-trusted-cbt` | 2026-03-26 | 75d | PR #495 | 2026-03-26 |
| `listed in Wave 6 approved list (direct merged candidate)` | 2026-05-24 | 16d | — | — |
| `listed in Wave 6 approved list (direct merged candidate)` | 2026-05-24 | 17d | — | — |
| `copilot/audit-phase-3` | 2026-03-25 | 76d | PR #476 | 2026-03-25 |
| `copilot/audit-therapeutic-forms-e2e` | 2026-06-07 | 2d | — | — |
| `copilot/audit-therapeutic-forms-library` | 2026-06-01 | 8d | — | — |
| `copilot/audit-therapeutic-quality` | 2026-03-25 | 76d | PR #477 | 2026-03-25 |
| `copilot/clean-production-audit` | 2026-03-24 | 77d | PR #451 | 2026-03-24 |
| `copilot/fix-hebrew-e2e-assertion` | 2026-06-07 | 2d | — | — |
| `copilot/fix-playwright-tests` | 2026-06-07 | 2d | — | — |
| `copilot/integrate-hebrew-cbt-worksheets` | 2026-05-31 | 10d | PR #706 | 2026-05-12 |
| `copilot/investigate-production-readiness` | 2026-03-24 | 77d | PR #452 | 2026-03-24 |
| `copilot/pr-11-english-language-parity-tests` | 2026-06-09 | 0d | PR #772 | 2026-06-09 |
| `copilot/pr-8-playwright-mock-assertion-hardening` | 2026-06-09 | 0d | PR #769 | 2026-06-09 |
| `copilot/prepare-deployment-for-staging` | 2026-03-20 | 82d | PR #368 | 2026-03-20 |
| `copilot/prepare-staging-deployment-runbook` | 2026-03-21 | 80d | PR #373 | 2026-03-21 |
| `copilot/rollout-advanced-ai-capabilities` | 2026-03-25 | 77d | PR #466 | 2026-03-25 |
| `copilot/root-cause-audit-production-upgrades` | 2026-03-25 | 76d | PR #479 | 2026-03-25 |
| `copilot/setup-staging-deployment-workflow` | 2026-03-20 | 82d | PR #367 | 2026-03-20 |
| `copilot/update-playwright-config` | 2026-01-14 | 146d | PR #57 | 2026-01-15 |
| `copilot/update-repo-workflow-guidance` | 2026-03-20 | 81d | PR #371 | 2026-03-20 |

### 2b. SAFE_DELETE_MERGED_PR — PR merged (not git-detected) (7 branches)

PRs were merged into main (squash or rebase), so the branch tip may not be a literal git ancestor of main.

| Branch | Last Commit | Age | PR | PR Merged |
|--------|------------|-----|-----|-----------|
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-13 | 147d | PR #38 | 2026-01-13 |
| `copilot/fix-data-sync-issue-goals-page` | 2026-02-09 | 120d | PR #168 | 2026-02-09 |
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-15 | 146d | PR #61 | 2026-01-15 |
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-15 | 146d | PR #62 | 2026-01-15 |
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-14 | 146d | PR #53 | 2026-01-14 |
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-15 | 146d | PR #66 | 2026-01-15 |
| `listed in Wave 6 approved list (PR-merged candidate)` | 2026-01-14 | 146d | PR #46 | 2026-01-14 |

### 2c. SAFE_DELETE_ABANDONED_WIP — Old `[WIP]` Copilot attempts (87 branches)

All are `[WIP]`-labeled PRs closed without merge, >90 days ago. These are clearly abandoned Copilot E2E/test fix iterations that were superseded.

| Branch | Last Commit | Age | PR | PR Closed |
|--------|------------|-----|-----|-----------|
| `copilot/add-advanced-diagnostics-send-button` | 2026-01-20 | 141d | PR #132 | 2026-01-20 |
| `copilot/add-advanced-diagnostics-to-tests` | 2026-01-20 | 141d | PR #131 | 2026-01-20 |
| `copilot/add-chat-smoke-test-instrumentation` | 2026-01-27 | 133d | PR #148 | 2026-01-28 |
| `copilot/add-console-error-logging` | 2026-01-18 | 142d | PR #91 | 2026-01-20 |
| `copilot/add-debugging-error-handling` | 2026-01-19 | 141d | PR #118 | 2026-01-20 |
| `copilot/add-debugging-step-to-ci` | 2026-01-18 | 142d | PR #84 | 2026-01-20 |
| `copilot/add-debugging-step-to-workflow` | 2026-01-18 | 142d | PR #77 | 2026-01-20 |
| `copilot/add-debugging-steps-to-playwright-workflow` | 2026-01-18 | 142d | PR #82 | 2026-01-20 |
| `copilot/add-deep-diagnostics-chat-e2e` | 2026-01-18 | 142d | PR #94 | 2026-01-20 |
| `copilot/add-deep-diagnostics-web-chat` | 2026-01-18 | 142d | PR #95 | 2026-01-20 |
| `copilot/add-deep-diagnostics-web-chat-e2e` | 2026-01-18 | 142d | PR #93 | 2026-01-20 |
| `copilot/add-e2e-test-helper` | 2026-01-28 | 133d | PR #155 | 2026-01-28 |
| `copilot/add-e2e-test-helpers-file` | 2026-01-28 | 133d | PR #154 | 2026-01-28 |
| `copilot/add-enhanced-diagnostics-e2e-chat` | 2026-01-20 | 141d | PR #130 | 2026-01-20 |
| `copilot/add-error-handling-logging` | 2026-01-19 | 141d | PR #127 | 2026-01-20 |
| `copilot/add-page-closed-check` | 2026-01-27 | 133d | PR #145 | 2026-01-28 |
| `copilot/add-playwright-e2e-test-files` | 2026-01-28 | 133d | PR #156 | 2026-01-28 |
| `copilot/add-playwright-e2e-tests-another-one` | 2026-01-27 | 134d | PR #137 | 2026-01-27 |
| `copilot/enhance-chat-diagnostics` | 2026-01-20 | 141d | PR #129 | 2026-01-20 |
| `copilot/enhance-e2e-chat-diagnostics` | 2026-01-20 | 141d | PR #128 | 2026-01-20 |
| `copilot/enhance-e2e-chat-test` | 2026-01-19 | 142d | PR #113 | 2026-01-20 |
| `copilot/enhance-send-button-locator` | 2026-01-19 | 142d | PR #97 | 2026-01-20 |
| `copilot/fix-404-errors-e2e-tests` | 2026-01-15 | 145d | PR #69 | 2026-01-17 |
| `copilot/fix-chat-send-button-flakiness` | 2026-01-19 | 142d | PR #108 | 2026-01-20 |
| `copilot/fix-chat-send-button-selector` | 2026-01-19 | 142d | PR #115 | 2026-01-20 |
| `copilot/fix-chat-smoke-test` | 2026-01-19 | 142d | PR #111 | 2026-01-20 |
| `copilot/fix-chat-smoke-test-failures` | 2026-01-19 | 142d | PR #114 | 2026-01-20 |
| `copilot/fix-chat-smoke-test-flake` | 2026-01-19 | 142d | PR #109 | 2026-01-20 |
| `copilot/fix-chat-smoke-test-flakiness` | 2026-01-19 | 142d | PR #107 | 2026-01-20 |
| `copilot/fix-chat-smoke-test-issues` | 2026-01-19 | 141d | PR #119 | 2026-01-20 |
| `copilot/fix-chat-ui-send-button` | 2026-01-19 | 142d | PR #102 | 2026-01-20 |
| `copilot/fix-e2e-chat-test-closure` | 2026-01-27 | 133d | PR #146 | 2026-01-28 |
| `copilot/fix-e2e-job-404-errors` | 2026-01-15 | 145d | PR #70 | 2026-01-17 |
| `copilot/fix-e2e-playwright-chat-test` | 2026-01-19 | 142d | PR #103 | 2026-01-20 |
| `copilot/fix-e2e-playwright-errors` | 2026-03-03 | 98d | PR #245 | 2026-03-03 |
| `copilot/fix-e2e-playwright-tests` | 2026-01-18 | 142d | PR #73 | 2026-01-20 |
| `copilot/fix-e2e-smoke-test-errors` | 2026-01-19 | 141d | PR #123 | 2026-01-20 |
| `copilot/fix-e2e-smoke-test-issue` | 2026-01-19 | 141d | PR #122 | 2026-01-20 |
| `copilot/fix-e2e-test-errors-again` | 2026-01-28 | 133d | PR #153 | 2026-01-28 |
| `copilot/fix-e2e-test-failure` | 2026-01-28 | 133d | PR #152 | 2026-01-28 |
| `copilot/fix-e2e-test-flakiness` | 2026-01-19 | 141d | PR #120 | 2026-01-20 |
| `copilot/fix-e2e-test-flakiness-again` | 2026-01-19 | 141d | PR #121 | 2026-01-20 |
| `copilot/fix-e2e-test-goalcoach` | 2026-01-17 | 143d | PR #72 | 2026-01-20 |
| `copilot/fix-e2e-tests-playwright` | 2026-01-14 | 146d | PR #56 | 2026-01-17 |
| `copilot/fix-next-button-enable-issue` | 2026-01-17 | 143d | PR #71 | 2026-01-20 |
| `copilot/fix-playwright-ci-test-structure` | 2026-01-18 | 142d | PR #74 | 2026-01-20 |
| `copilot/fix-playwright-e2e-tests-again` | 2026-01-14 | 146d | PR #54 | 2026-01-17 |
| `copilot/fix-playwright-e2e-tests-another-one` | 2026-01-18 | 142d | PR #83 | 2026-01-20 |
| `copilot/fix-spa-fallback-routes` | 2026-01-15 | 145d | PR #68 | 2026-01-17 |
| `copilot/fix-syntax-error-in-ui-tests` | 2026-01-18 | 142d | PR #85 | 2026-01-20 |
| `copilot/fix-syntax-error-in-ui-tests-again` | 2026-01-18 | 142d | PR #86 | 2026-01-20 |
| `copilot/harden-fallback-logic` | 2026-01-19 | 141d | PR #125 | 2026-01-20 |
| `copilot/improve-chat-message-test-robustness` | 2026-01-19 | 142d | PR #100 | 2026-01-20 |
| `copilot/improve-chat-send-button-reliability` | 2026-01-19 | 142d | PR #98 | 2026-01-20 |
| `copilot/improve-chat-smoke-test-reliability` | 2026-01-19 | 142d | PR #104 | 2026-01-20 |
| `copilot/improve-chat-smoke-test-robustness` | 2026-01-19 | 142d | PR #101 | 2026-01-20 |
| `copilot/improve-e2e-test-resilience` | 2026-01-27 | 133d | PR #147 | 2026-01-28 |
| `copilot/improve-e2e-test-robustness` | 2026-01-19 | 141d | PR #116 | 2026-01-20 |
| `copilot/improve-e2e-test-stability` | 2026-01-19 | 142d | PR #112 | 2026-01-20 |
| `copilot/improve-e2e-tests-robustness` | 2026-01-14 | 146d | PR #55 | 2026-01-17 |
| `copilot/improve-error-handling-send-button` | 2026-01-19 | 142d | PR #96 | 2026-01-20 |
| `copilot/improve-safe-click-helper` | 2026-01-19 | 142d | PR #105 | 2026-01-20 |
| `copilot/increase-send-button-timeout` | 2026-01-19 | 142d | PR #106 | 2026-01-20 |
| `copilot/increase-timeout-send-button` | 2026-01-19 | 142d | PR #110 | 2026-01-20 |
| `copilot/move-tests-to-top-level-directory` | 2026-01-18 | 142d | PR #75 | 2026-01-20 |
| `copilot/patch-chat-page-improvements` | 2026-01-18 | 142d | PR #89 | 2026-01-20 |
| `copilot/patch-e2e-smoke-tests` | 2026-01-18 | 142d | PR #88 | 2026-01-20 |
| `copilot/reduce-test-flakiness-send-message` | 2026-01-19 | 141d | PR #117 | 2026-01-20 |
| `copilot/refactor-e2e-test-stability` | 2026-01-28 | 133d | PR #150 | 2026-01-28 |
| `copilot/remove-invalid-code-block` | 2026-01-18 | 142d | PR #87 | 2026-01-20 |
| `copilot/restore-missing-e2e-tests` | 2026-01-18 | 142d | PR #76 | 2026-01-20 |
| `copilot/revise-e2e-tests-for-stability` | 2026-01-28 | 133d | PR #151 | 2026-01-28 |
| `copilot/robustify-handle-send-message` | 2026-01-18 | 142d | PR #92 | 2026-01-20 |
| `copilot/stabilize-e2e-chat-test` | 2026-01-19 | 141d | PR #126 | 2026-01-20 |
| `copilot/translate-home-page-content-please-work` | 2026-03-01 | 100d | PR #217 | 2026-03-01 |
| `copilot/translate-mind-games-content` | 2026-03-01 | 100d | PR #219 | 2026-03-01 |
| `copilot/update-chat-e2e-test-resilience` | 2026-01-19 | 142d | PR #99 | 2026-01-20 |
| `copilot/update-chat-input-wait-function` | 2026-01-27 | 134d | PR #136 | 2026-01-27 |
| `copilot/update-e2e-reliability-tests` | 2026-01-18 | 142d | PR #90 | 2026-01-20 |
| `copilot/update-e2e-smoke-tests` | 2026-01-28 | 133d | PR #149 | 2026-01-28 |
| `copilot/update-playwright-config-again` | 2026-01-18 | 142d | PR #79 | 2026-01-20 |
| `copilot/update-playwright-config-projects` | 2026-01-18 | 142d | PR #80 | 2026-01-20 |
| `copilot/update-playwright-e2e-setup` | 2026-01-28 | 133d | PR #157 | 2026-01-28 |
| `copilot/update-playwright-projects` | 2026-01-18 | 142d | PR #81 | 2026-01-20 |
| `copilot/update-playwright-smoke-test` | 2026-01-19 | 141d | PR #124 | 2026-01-20 |
| `copilot/update-playwright-workflow` | 2026-01-18 | 142d | PR #78 | 2026-01-20 |
| `copilot/update-query-and-state-usage` | 2026-02-09 | 120d | PR #171 | 2026-02-09 |

---

## Section 3 — Wave 7 Candidates: Closed PRs, No Merge (123 branches)

**Requires owner sign-off before deletion.** These PRs were closed without being merged. The work was either superseded, wrong approach, or intentionally abandoned.

### 3a. CANDIDATE_DELETE_CLOSED_PR_OLD — Closed PR, >90 days (40 branches)

| Branch | Last Commit | Age | PR | PR Closed |
|--------|------------|-----|-----|-----------|
| `copilot/add-accessibility-tests-community-page` | 2026-03-04 | 97d | PR #256 | 2026-03-04 |
| `copilot/add-forum-post-card-tests` | 2026-03-04 | 97d | PR #252 | 2026-03-04 |
| `copilot/add-numeric-safety-module` | 2026-01-03 | 157d | PR #14 | 2026-01-04 |
| `copilot/add-numeric-safety-module-again` | 2026-01-03 | 157d | PR #15 | 2026-01-04 |
| `copilot/add-playwright-test-suite` | 2026-03-04 | 97d | PR #249 | 2026-03-04 |
| `copilot/add-production-smoke-test-suite` | 2026-02-07 | 122d | PR #158 | 2026-02-07 |
| `copilot/audit-vitest-configuration` | 2025-12-30 | 161d | PR #6 | 2025-12-31 |
| `copilot/check-fix-performance-issues` | 2026-03-02 | 100d | PR #232 | 2026-03-02 |
| `copilot/ci-add-playwright-workflow` | 2026-01-13 | 147d | PR #37 | 2026-01-14 |
| `copilot/ci-validation-wiring-checks` | 2026-03-10 | 91d | PR #296 | 2026-03-10 |
| `copilot/clone-and-push-repository` | 2026-03-05 | 97d | PR #259 | 2026-03-05 |
| `copilot/create-numeric-safety-file` | 2026-01-03 | 157d | PR #11 | 2026-01-04 |
| `copilot/create-numeric-safety-module` | 2026-01-03 | 157d | PR #16 | 2026-01-04 |
| `copilot/diagnose-performance-issue` | 2026-03-04 | 98d | PR #246 | 2026-03-04 |
| `copilot/fix-api-endpoint-construction` | 2026-03-04 | 97d | PR #250 | 2026-03-04 |
| `copilot/fix-delete-icon-in-sessions-list` | 2026-01-04 | 156d | PR #21 | 2026-01-04 |
| `copilot/fix-delete-session-bug` | 2026-01-04 | 156d | PR #18 | 2026-01-04 |
| `copilot/fix-delete-session-bug-again` | 2026-01-04 | 156d | PR #19 | 2026-01-04 |
| `copilot/fix-delete-session-button` | 2026-01-04 | 156d | PR #22 | 2026-01-04 |
| `copilot/fix-e2e-pull-refresh-tests` | 2026-03-04 | 98d | PR #247 | 2026-03-04 |
| `copilot/fix-e2e-test-chat-page` | 2026-03-03 | 98d | PR #243 | 2026-03-03 |
| `copilot/fix-issues-in-test-folder` | 2025-12-30 | 161d | PR #1 | 2025-12-31 |
| `copilot/fix-numeric-safety-import` | 2026-01-03 | 157d | PR #13 | 2026-01-04 |
| `copilot/fix-numeric-safety-import-error` | 2025-12-31 | 160d | PR #9 | 2025-12-31 |
| `copilot/fix-numeric-safety-import-error-again` | 2026-01-01 | 159d | PR #10 | 2026-01-04 |
| `copilot/fix-numeric-safety-test-errors` | 2025-12-30 | 161d | PR #3 | 2025-12-31 |
| `copilot/fix-screen-animations-transitions` | 2026-03-02 | 100d | PR #230 | 2026-03-02 |
| `copilot/fix-sessions-delete-e2e` | 2026-01-04 | 156d | PR #23 | 2026-01-04 |
| `copilot/fix-sessions-delete-e2e-again` | 2026-01-04 | 156d | PR #24 | 2026-01-04 |
| `copilot/fix-test-suite-issues` | 2025-12-30 | 161d | PR #4 | 2025-12-31 |
| `copilot/fix-test-suite-issues-again` | 2025-12-31 | 160d | PR #8 | 2025-12-31 |
| `copilot/fix-trash-icon-interactivity` | 2026-01-04 | 156d | PR #20 | 2026-01-04 |
| `copilot/fix-workflows-run-issues` | 2026-01-03 | 157d | PR #12 | 2026-01-04 |
| `copilot/implement-i18n-for-mind-games` | 2026-02-15 | 114d | PR #179 | 2026-02-15 |
| `copilot/improve-inefficient-code` | 2025-12-30 | 161d | PR #2 | 2025-12-31 |
| `copilot/mobile-first-coach-improvements` | 2026-01-04 | 156d | PR #25 | 2026-01-04 |
| `copilot/prepare-app-for-store-submission` | 2026-02-23 | 107d | PR #186 | 2026-02-23 |
| `copilot/refactor-mobile-compatibility-issues` | 2026-03-06 | 96d | PR #265 | 2026-03-06 |
| `copilot/stabilize-test-suite` | 2025-12-30 | 161d | PR #5 | 2025-12-31 |
| `copilot/verify-test-suite-passing` | 2025-12-30 | 161d | PR #7 | 2025-12-31 |

### 3b. CANDIDATE_DELETE_CLOSED_PR_STALE — Closed PR, 30–90 days (83 branches)

| Branch | Last Commit | Age | PR | PR Closed |
|--------|------------|-----|-----|-----------|
| `copilot/452-resolve-conflicts-between-copilot-and-staging` | 2026-03-24 | 77d | PR #453 | 2026-03-25 |
| `copilot/add-e2e-tests-and-ci-improvements` | 2026-03-16 | 85d | PR #323 | 2026-03-17 |
| `copilot/add-internal-automated-tests-another-one` | 2026-03-16 | 85d | PR #317 | 2026-03-16 |
| `copilot/add-temp-diagnostics-bootstrap-failure` | 2026-03-24 | 77d | PR #457 | 2026-03-25 |
| `copilot/audit-and-refresh-import-file-again` | 2026-03-26 | 75d | PR #497 | 2026-03-26 |
| `copilot/audit-store-readiness` | 2026-03-29 | 73d | PR #510 | 2026-03-29 |
| `copilot/audit-test-helpers-e2e-integration` | 2026-04-09 | 62d | PR #533 | 2026-04-09 |
| `copilot/commit-last-pr-again` | 2026-03-25 | 77d | PR #469 | 2026-03-25 |
| `copilot/create-batch-3-json` | 2026-03-27 | 75d | PR #507 | 2026-03-29 |
| `copilot/create-trusted-cbt-batch-3` | 2026-03-27 | 75d | PR #508 | 2026-03-29 |
| `copilot/enable-ai-agent-actions` | 2026-04-09 | 62d | PR #532 | 2026-04-09 |
| `copilot/fix-404-app-logs-endpoint` | 2026-03-22 | 79d | PR #432 | 2026-03-23 |
| `copilot/fix-ai-coach-agent-wiring` | 2026-03-25 | 77d | PR #462 | 2026-03-25 |
| `copilot/fix-ai-coach-agent-wiring-again` | 2026-03-25 | 77d | PR #463 | 2026-03-25 |
| `copilot/fix-ai-coach-agent-wiring-another-one` | 2026-03-25 | 77d | PR #464 | 2026-03-25 |
| `copilot/fix-auth-redirect-loop-staging` | 2026-03-22 | 79d | PR #415 | 2026-03-22 |
| `copilot/fix-base44-appid-fallback` | 2026-03-22 | 79d | PR #421 | 2026-03-22 |
| `copilot/fix-base44-appid-fallback-again` | 2026-03-22 | 79d | PR #422 | 2026-03-22 |
| `copilot/fix-base44-appid-fallback-again-again` | 2026-03-22 | 79d | PR #423 | 2026-03-22 |
| `copilot/fix-base44-appid-fallback-conflicts` | 2026-03-22 | 79d | PR #424 | 2026-03-22 |
| `copilot/fix-branch-conflicts` | 2026-03-21 | 80d | PR #379 | 2026-03-21 |
| `copilot/fix-chat-smoke-test-again` | 2026-04-06 | 64d | PR #524 | 2026-04-07 |
| `copilot/fix-create-post-heading-visibility` | 2026-03-18 | 84d | PR #329 | 2026-03-18 |
| `copilot/fix-duplicate-function-definition` | 2026-03-26 | 76d | PR #488 | 2026-03-26 |
| `copilot/fix-e2e-test-chat-page-404` | 2026-03-22 | 79d | PR #417 | 2026-03-22 |
| `copilot/fix-e2e-test-chat-page-log-url` | 2026-03-22 | 79d | PR #416 | 2026-03-22 |
| `copilot/fix-e2e-test-post-request` | 2026-04-06 | 64d | PR #522 | 2026-04-06 |
| `copilot/fix-e2e-tests-android-back-button` | 2026-03-18 | 83d | PR #337 | 2026-03-18 |
| `copilot/fix-e2e-tests-button-locators` | 2026-03-18 | 83d | PR #333 | 2026-03-18 |
| `copilot/fix-empty-cbt-therapist-instructions` | 2026-04-19 | 51d | PR #618 | 2026-04-19 |
| `copilot/fix-first-message-loss-therapist` | 2026-03-25 | 76d | PR #481 | 2026-03-25 |
| `copilot/fix-first-message-loss-therapist-again` | 2026-03-25 | 76d | PR #482 | 2026-03-25 |
| `copilot/fix-forum-post-form-ui-issues` | 2026-03-18 | 83d | PR #335 | 2026-03-18 |
| `copilot/fix-home-setup-completion-flow-again` | 2026-03-22 | 79d | PR #404 | 2026-03-22 |
| `copilot/fix-home-setup-completion-flow-again-again` | 2026-03-22 | 79d | PR #405 | 2026-03-22 |
| `copilot/fix-home-setup-completion-flow-again-again-again` | 2026-03-22 | 79d | PR #406 | 2026-03-22 |
| `copilot/fix-lucide-inventory-workflow` | 2026-03-17 | 84d | PR #327 | 2026-03-17 |
| `copilot/fix-null-app-id-in-api-url` | 2026-03-22 | 79d | PR #427 | 2026-03-23 |
| `copilot/fix-post-button-visibility` | 2026-03-18 | 84d | PR #330 | 2026-03-18 |
| `copilot/fix-pull-to-refresh-indicator` | 2026-03-18 | 83d | PR #332 | 2026-03-18 |
| `copilot/fix-pull-to-refresh-indicator-again` | 2026-03-29 | 72d | PR #516 | 2026-03-29 |
| `copilot/fix-railway-auth-flow-staging` | 2026-03-22 | 79d | PR #413 | 2026-03-22 |
| `copilot/fix-registration-issue` | 2026-03-24 | 77d | PR #446 | 2026-03-24 |
| `copilot/fix-screenshot-issues` | 2026-03-22 | 79d | PR #426 | 2026-03-23 |
| `copilot/fix-shared-client-routing` | 2026-03-22 | 79d | PR #409 | 2026-03-22 |
| `copilot/fix-spa-navigation-offline-error` | 2026-03-16 | 85d | PR #324 | 2026-03-17 |
| `copilot/fix-staging-branch-issues` | 2026-03-23 | 79d | PR #434 | 2026-03-23 |
| `copilot/fix-test-assertion-errors` | 2026-04-19 | 51d | PR #617 | 2026-04-19 |
| `copilot/fix-therapist-worksheet-bot-behavior` | 2026-03-26 | 76d | PR #487 | 2026-03-26 |
| `copilot/fix-ui-element-selections` | 2026-03-18 | 84d | PR #331 | 2026-03-18 |
| `copilot/fix-undefined-app-id-error` | 2026-03-22 | 79d | PR #431 | 2026-03-23 |
| `copilot/fix-white-screen-error-another-one` | 2026-03-22 | 80d | PR #395 | 2026-03-22 |
| `copilot/harden-runtime-paths` | 2026-03-22 | 80d | PR #383 | 2026-03-22 |
| `copilot/implement-shared-layer-fix-again` | 2026-03-22 | 80d | PR #391 | 2026-03-22 |
| `copilot/investigate-runtime-data-integration` | 2026-03-22 | 80d | PR #389 | 2026-03-22 |
| `copilot/mobile-only-backend-transcription` | 2026-04-24 | 46d | PR #666 | 2026-04-25 |
| `copilot/normalize-trusted-cbt-batch-1-schema` | 2026-03-26 | 75d | PR #493 | 2026-03-26 |
| `copilot/phase-3-audit-recommendation` | 2026-03-25 | 76d | PR #475 | 2026-03-25 |
| `copilot/prepare-merge-from-staging-to-main` | 2026-04-13 | 58d | PR #574 | 2026-04-13 |
| `copilot/reapply-phase-2-chat-stall-fix` | 2026-03-25 | 77d | PR #470 | 2026-03-25 |
| `copilot/reapply-phase-2-chat-stall-fix-again` | 2026-03-25 | 77d | PR #471 | 2026-03-25 |
| `copilot/reapply-phase-2-chat-stall-fix-again-again` | 2026-03-25 | 77d | PR #472 | 2026-03-25 |
| `copilot/reapply-phase-2-chat-stall-fix-another-one` | 2026-03-25 | 76d | PR #473 | 2026-03-25 |
| `copilot/resolve-conflicts-fix-null-app-id-in-api-url` | 2026-03-22 | 79d | PR #428 | 2026-03-23 |
| `copilot/resolve-conflicts-production-readiness` | 2026-03-24 | 77d | PR #454 | 2026-03-25 |
| `copilot/resolve-merge-conflicts-again` | 2026-03-26 | 76d | PR #489 | 2026-03-26 |
| `copilot/resolve-staging-merge-issues` | 2026-03-22 | 79d | PR #430 | 2026-03-23 |
| `copilot/stability-sweep-runtime-issues` | 2026-03-22 | 80d | PR #386 | 2026-03-22 |
| `copilot/stabilize-runtime-behavior` | 2026-03-21 | 80d | PR #377 | 2026-03-21 |
| `copilot/stabilize-runtime-behavior-again` | 2026-03-22 | 80d | PR #381 | 2026-03-22 |
| `copilot/stage-7-library-search-filter-cleanup` | 2026-04-17 | 54d | PR #605 | 2026-04-19 |
| `copilot/update-app-for-compliance` | 2026-03-18 | 83d | PR #336 | 2026-03-18 |
| `copilot/update-delete-account-feature` | 2026-03-18 | 83d | PR #334 | 2026-03-18 |
| `copilot/update-file-attachment-handling` | 2026-04-19 | 51d | PR #619 | 2026-04-19 |
| `copilot/update-playwright-test-helpers` | 2026-04-06 | 64d | PR #523 | 2026-04-07 |
| `copilot/update-staging-add-base44-url` | 2026-03-23 | 78d | PR #436 | 2026-03-23 |
| `copilot/update-trusted-cbt-chunk-import-files` | 2026-03-26 | 75d | PR #503 | 2026-03-29 |
| `copilot/update-trusted-cbt-smoke-import` | 2026-03-26 | 75d | PR #499 | 2026-03-26 |
| `copilot/update-trusted-cbt-smoke-import-again` | 2026-03-26 | 75d | PR #500 | 2026-03-26 |
| `copilot/update-trusted-cbt-smoke-import-ui` | 2026-03-26 | 75d | PR #501 | 2026-03-26 |
| `copilot/verify-coaching-chat-patch` | 2026-03-29 | 73d | PR #512 | 2026-03-29 |
| `copilot/verify-fix-shared-appid-resolution` | 2026-03-22 | 80d | PR #399 | 2026-03-22 |
| `copilot/verify-harden-ai-production-flow` | 2026-03-25 | 77d | PR #461 | 2026-03-25 |

---

## Section 4 — Owner Review Required: No PR History (16 branches)

These branches have no PR history on record. Review before any deletion.

### 4a. NO_PR_STALE — No PR, 30–90 days old (9 branches)

| Branch | Last Commit | Age | Notes |
|--------|------------|-----|-------|
| `chore/lucide-inventory-reports` | 2026-03-17 | 84d | Inventory report branch, probably safe to delete |
| `copilot/2394-audit-repair-test-infra` | 2026-04-09 | 62d | Named after issue #2394 |
| `copilot/diagnostic-attachment-runtime-probe` | 2026-04-20 | 51d | Diagnostic probe branch |
| `copilot/fix-android-transcription-path-selection` | 2026-04-23 | 48d | Android transcription fix |
| `copilot/fix-phase2-chat-stall` | 2026-03-25 | 77d | Phase 2 chat stall attempt |
| `copilot/fix-super-cbt-agent-enablement` | 2026-04-09 | 62d | Agent enablement fix |
| `copilot/implement-ai-agents-upgrade` | 2026-04-10 | 61d | AI agents upgrade |
| `copilot/phase2-chat-stall-fix-main` | 2026-03-25 | 77d | Duplicate of fix-phase2-chat-stall |
| `revert-394-copilot/fix-white-screen-error-again` | 2026-03-21 | 80d | GitHub auto-generated revert branch |

### 4b. NO_PR_OLD — No PR, >90 days (2 branches)

| Branch | Last Commit | Age | Notes |
|--------|------------|-----|-------|
| `copilot/fix-e2e-smoke-test-issues` | 2026-02-09 | 120d | Old smoke test attempt |
| `copilot/fix-goals-usequery-definition` | 2026-02-09 | 120d | Old goals fix attempt |

### 4c. NO_PR_RECENT — No PR, <30 days (5 branches) ⚠️ ACTIVE WORK

**Do NOT delete without owner confirmation — these may be in-flight.**

| Branch | Last Commit | Age | Subject |
|--------|------------|-----|---------|
| `copilot/add-hebrew-adolescent-cbt-worksheets` | 2026-05-13 | 28d | Hebrew adolescent CBT work |
| `copilot/clean-therapeutic-forms-awareness` | 2026-06-09 | 1d | Therapeutic forms awareness cleanup |
| `copilot/fix-ai-therapeutic-forms-awareness` | 2026-06-08 | 2d | AI forms awareness fix |
| `copilot/fix-therapeutic-forms-e2e-tests` | 2026-06-08 | 2d | Forms E2E tests fix |
| `copilot/therapeutic-forms-awareness-e2e` | 2026-06-09 | 1d | Forms awareness E2E |

---

## Section 5 — Owner Review Required: Recent Closed PRs (9 branches)

Closed within the last 30 days. May represent work intentionally abandoned or superseded by a better approach. Owner should confirm before scheduling for deletion.

| Branch | Last Commit | Age | PR | PR Closed |
|--------|------------|-----|-----|-----------|
| `copilot/add-english-cbt-core-series-1` | 2026-05-14 | 26d | PR #709 | 2026-05-14 |
| `copilot/add-playwright-e2e-coverage` | 2026-06-08 | 2d | PR #756 | 2026-06-08 |
| `copilot/fix-ai-chat-issues` | 2026-06-07 | 2d | PR #750 | 2026-06-07 |
| `copilot/fix-e2e-mobile-job-failure` | 2026-06-08 | 1d | PR #759 | 2026-06-08 |
| `copilot/fix-english-adolescent-cbt-integration` | 2026-05-17 | 24d | PR #713 | 2026-05-17 |
| `copilot/fix-global-forms-access` | 2026-05-24 | 17d | PR #731 | 2026-05-24 |
| `copilot/fix-therapeutic-forms-awareness-regression` | 2026-06-07 | 2d | PR #753 | 2026-06-07 |
| `copilot/fixplaywright-e2e-tests-80055313775` | 2026-06-08 | 2d | PR #757 | 2026-06-08 |
| `copilot/implement-deterministic-forms-tooling` | 2026-05-24 | 17d | PR #732 | 2026-05-24 |

---

## Section 6 — Duplicate Branch Tips

Three groups of branches share identical commit SHAs.

| SHA | Branches | Category |
|-----|----------|---------|
| `edb139710af6` | `copilot/audit-branch-hygiene`, `copilot/execute-branch-cleanup-wave-1` | KEEP (both cleanup infra) |
| `efa1f8f1b8d9` | `copilot/audit-branch-reduction`, `main` | Current audit branch = same tip as main |
| `eff9b2fcc39c` | `copilot/audit-therapeutic-forms-e2e`, `copilot/fix-hebrew-e2e-assertion`, `copilot/fix-playwright-tests` | All SAFE_DELETE_MERGED |

---

## Section 7 — Workflow and Documentation References

21 branches are referenced by name in docs or approved-list files. All 21 are already classified as `SAFE_DELETE_MERGED` (or appear in a previous cleanup wave approved list). The references are historical — they do not block deletion.

| Branch | Referenced in |
|--------|--------------|
| `copilot/audit-and-refresh-trusted-cbt` | `docs/trusted-cbt-import-rollout.md`, wave-5 list |
| `copilot/audit-phase-3` | `docs/phase3-audit-report.md`, wave-5 list |
| `copilot/audit-therapeutic-quality` | `docs/therapeutic-quality-audit.md`, wave-5 list |
| `copilot/clean-production-audit` | `docs/production-readiness-audit-2026-03-24.md`, wave-5 list |
| `copilot/create-trusted-cbt-batch-3` | wave-5 list |
| `copilot/fix-base44-appid-fallback` | wave-4 list |
| `copilot/fix-base44-appid-fallback-conflicts` | wave-4 list |
| `copilot/fix-data-sync-issue-goals-page` | wave-2 list |
| `copilot/fix-e2e-test-chat-page` | wave-4 list |
| `copilot/fix-e2e-test-chat-page-404` | wave-4 list |
| `copilot/fix-shared-client-routing` | wave-4 list |
| `copilot/fix-staging-branch-issues` | wave-5 list |
| `copilot/implement-i18n-for-mind-games` | wave-2 list |
| `copilot/investigate-production-readiness` | `docs/production-readiness-audit-2026-03-24.md`, wave-5 list |
| `copilot/prepare-deployment-for-staging` | `docs/staging-audit-report.md`, wave-5 list |
| `copilot/prepare-staging-deployment-runbook` | `docs/staging-audit-report.md`, wave-5 list |
| `copilot/rollout-advanced-ai-capabilities` | `docs/ai-capability-rollout-phase1.md`, wave-5 list |
| `copilot/root-cause-audit-production-upgrades` | `docs/root-cause-audit-production-upgrades.md`, wave-5 list |
| `copilot/setup-staging-deployment-workflow` | `docs/staging-audit-report.md`, wave-5 list |
| `copilot/update-playwright-config` | wave-5 list, wave-2 list |
| `copilot/update-repo-workflow-guidance` | `docs/staging-audit-report.md`, wave-5 list |

---

## Section 8 — Recommended Wave 6 Branch List

The following 115 branches are recommended for Wave 6 (immediate, no owner sign-off required beyond approving the wave):

```
# SAFE_DELETE_MERGED (21)
copilot/audit-and-refresh-trusted-cbt
# exact direct-safe merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
# exact direct-safe merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
copilot/audit-phase-3
copilot/audit-therapeutic-forms-e2e
copilot/audit-therapeutic-forms-library
copilot/audit-therapeutic-quality
copilot/clean-production-audit
copilot/fix-hebrew-e2e-assertion
copilot/fix-playwright-tests
copilot/integrate-hebrew-cbt-worksheets
copilot/investigate-production-readiness
copilot/pr-11-english-language-parity-tests
copilot/pr-8-playwright-mock-assertion-hardening
copilot/prepare-deployment-for-staging
copilot/prepare-staging-deployment-runbook
copilot/rollout-advanced-ai-capabilities
copilot/root-cause-audit-production-upgrades
copilot/setup-staging-deployment-workflow
copilot/update-playwright-config
copilot/update-repo-workflow-guidance

# SAFE_DELETE_MERGED_PR (7)
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
copilot/fix-data-sync-issue-goals-page
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt
# exact direct-safe PR-merged branch retained only in docs/branch-cleanup-wave-6-approved-list.txt

# SAFE_DELETE_ABANDONED_WIP (87)
copilot/add-advanced-diagnostics-send-button
copilot/add-advanced-diagnostics-to-tests
copilot/add-chat-smoke-test-instrumentation
copilot/add-console-error-logging
copilot/add-debugging-error-handling
copilot/add-debugging-step-to-ci
copilot/add-debugging-step-to-workflow
copilot/add-debugging-steps-to-playwright-workflow
copilot/add-deep-diagnostics-chat-e2e
copilot/add-deep-diagnostics-web-chat
copilot/add-deep-diagnostics-web-chat-e2e
copilot/add-e2e-test-helper
copilot/add-e2e-test-helpers-file
copilot/add-enhanced-diagnostics-e2e-chat
copilot/add-error-handling-logging
copilot/add-page-closed-check
copilot/add-playwright-e2e-test-files
copilot/add-playwright-e2e-tests-another-one
copilot/enhance-chat-diagnostics
copilot/enhance-e2e-chat-diagnostics
copilot/enhance-e2e-chat-test
copilot/enhance-send-button-locator
copilot/fix-404-errors-e2e-tests
copilot/fix-chat-send-button-flakiness
copilot/fix-chat-send-button-selector
copilot/fix-chat-smoke-test
copilot/fix-chat-smoke-test-failures
copilot/fix-chat-smoke-test-flake
copilot/fix-chat-smoke-test-flakiness
copilot/fix-chat-smoke-test-issues
copilot/fix-chat-ui-send-button
copilot/fix-e2e-chat-test-closure
copilot/fix-e2e-job-404-errors
copilot/fix-e2e-playwright-chat-test
copilot/fix-e2e-playwright-errors
copilot/fix-e2e-playwright-tests
copilot/fix-e2e-smoke-test-errors
copilot/fix-e2e-smoke-test-issue
copilot/fix-e2e-test-errors-again
copilot/fix-e2e-test-failure
copilot/fix-e2e-test-flakiness
copilot/fix-e2e-test-flakiness-again
copilot/fix-e2e-test-goalcoach
copilot/fix-e2e-tests-playwright
copilot/fix-next-button-enable-issue
copilot/fix-playwright-ci-test-structure
copilot/fix-playwright-e2e-tests-again
copilot/fix-playwright-e2e-tests-another-one
copilot/fix-spa-fallback-routes
copilot/fix-syntax-error-in-ui-tests
copilot/fix-syntax-error-in-ui-tests-again
copilot/harden-fallback-logic
copilot/improve-chat-message-test-robustness
copilot/improve-chat-send-button-reliability
copilot/improve-chat-smoke-test-reliability
copilot/improve-chat-smoke-test-robustness
copilot/improve-e2e-test-resilience
copilot/improve-e2e-test-robustness
copilot/improve-e2e-test-stability
copilot/improve-e2e-tests-robustness
copilot/improve-error-handling-send-button
copilot/improve-safe-click-helper
copilot/increase-send-button-timeout
copilot/increase-timeout-send-button
copilot/move-tests-to-top-level-directory
copilot/patch-chat-page-improvements
copilot/patch-e2e-smoke-tests
copilot/reduce-test-flakiness-send-message
copilot/refactor-e2e-test-stability
copilot/remove-invalid-code-block
copilot/restore-missing-e2e-tests
copilot/revise-e2e-tests-for-stability
copilot/robustify-handle-send-message
copilot/stabilize-e2e-chat-test
copilot/translate-home-page-content-please-work
copilot/translate-mind-games-content
copilot/update-chat-e2e-test-resilience
copilot/update-chat-input-wait-function
copilot/update-e2e-reliability-tests
copilot/update-e2e-smoke-tests
copilot/update-playwright-config-again
copilot/update-playwright-config-projects
copilot/update-playwright-e2e-setup
copilot/update-playwright-projects
copilot/update-playwright-smoke-test
copilot/update-playwright-workflow
copilot/update-query-and-state-usage
```

---

## Section 9 — Owner / Business Review Questions

Before scheduling Wave 7, the owner should answer:

1. **Section 3 (123 branches):** Are the closed-without-merge PRs confirmed as permanently abandoned? If yes, all 123 are safe to delete.  
2. **Section 4a / 4b (11 branches with no PR):**  
   - Is `chore/lucide-inventory-reports` needed?  
   - Is `revert-394-copilot/fix-white-screen-error-again` needed?  
   - Are `fix-phase2-chat-stall` and `phase2-chat-stall-fix-main` redundant?  
3. **Section 4c (5 very recent no-PR branches):** Are these currently in-progress work-in-progress that should not be deleted yet?  
4. **Section 5 (9 recent closed-PR branches):** Were the recent June 2026 closed PRs (#750, #753, #756, #757, #759) intentionally superseded, or might they need to be reopened?  

---

## Appendix: Full Classification Table

| Branch | Age | Category | PR | PR Status |
|--------|-----|----------|----|-----------|
| `chore/lucide-inventory-reports` | 84d | `NO_PR_STALE` | — | none |
| `copilot/2394-audit-repair-test-infra` | 62d | `NO_PR_STALE` | — | none |
| `copilot/452-resolve-conflicts-between-copilot-and-staging` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #453 | closed |
| `copilot/add-accessibility-tests-community-page` | 97d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #256 | closed |
| `copilot/add-advanced-diagnostics-send-button` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #132 | closed |
| `copilot/add-advanced-diagnostics-to-tests` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #131 | closed |
| `copilot/add-chat-smoke-test-instrumentation` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #148 | closed |
| `copilot/add-console-error-logging` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #91 | closed |
| `copilot/add-debugging-error-handling` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #118 | closed |
| `copilot/add-debugging-step-to-ci` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #84 | closed |
| `copilot/add-debugging-step-to-workflow` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #77 | closed |
| `copilot/add-debugging-steps-to-playwright-workflow` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #82 | closed |
| `copilot/add-deep-diagnostics-chat-e2e` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #94 | closed |
| `copilot/add-deep-diagnostics-web-chat` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #95 | closed |
| `copilot/add-deep-diagnostics-web-chat-e2e` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #93 | closed |
| `copilot/add-e2e-test-helper` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #155 | closed |
| `copilot/add-e2e-test-helpers-file` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #154 | closed |
| `copilot/add-e2e-tests-and-ci-improvements` | 85d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #323 | closed |
| `copilot/add-english-cbt-core-series-1` | 26d | `REVIEW_CLOSED_RECENT` | #709 | closed |
| `copilot/add-enhanced-diagnostics-e2e-chat` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #130 | closed |
| `copilot/add-error-handling-logging` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #127 | closed |
| `copilot/add-forum-post-card-tests` | 97d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #252 | closed |
| `copilot/add-hebrew-adolescent-cbt-worksheets` | 28d | `NO_PR_RECENT` | — | none |
| `copilot/add-internal-automated-tests-another-one` | 85d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #317 | closed |
| `copilot/add-numeric-safety-module` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #14 | closed |
| `copilot/add-numeric-safety-module-again` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #15 | closed |
| `copilot/add-page-closed-check` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #145 | closed |
| `copilot/add-playwright-e2e-coverage` | 2d | `REVIEW_CLOSED_RECENT` | #756 | closed |
| `copilot/add-playwright-e2e-test-files` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #156 | closed |
| `copilot/add-playwright-e2e-tests-another-one` | 134d | `SAFE_DELETE_ABANDONED_WIP` | #137 | closed |
| `listed in Wave 6 approved list (PR-merged candidate)` | 147d | `SAFE_DELETE_MERGED_PR` | #38 | merged |
| `copilot/add-playwright-test-suite` | 97d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #249 | closed |
| `copilot/add-production-smoke-test-suite` | 122d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #158 | closed |
| `copilot/add-temp-diagnostics-bootstrap-failure` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #457 | closed |
| `copilot/audit-and-refresh-import-file-again` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #497 | closed |
| `copilot/audit-and-refresh-trusted-cbt` | 75d | `SAFE_DELETE_MERGED` | #495 | merged |
| `copilot/audit-branch-hygiene` | 0d | `KEEP_CLEANUP_INFRA` | — | none |
| `copilot/audit-branch-reduction` | 0d | `KEEP_CURRENT` | — | none |
| `listed in Wave 6 approved list (direct merged candidate)` | 16d | `SAFE_DELETE_MERGED` | — | none |
| `listed in Wave 6 approved list (direct merged candidate)` | 17d | `SAFE_DELETE_MERGED` | — | none |
| `copilot/audit-phase-3` | 76d | `SAFE_DELETE_MERGED` | #476 | merged |
| `copilot/audit-store-readiness` | 73d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #510 | closed |
| `copilot/audit-test-helpers-e2e-integration` | 62d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #533 | closed |
| `copilot/audit-therapeutic-forms-e2e` | 2d | `SAFE_DELETE_MERGED` | — | none |
| `copilot/audit-therapeutic-forms-library` | 8d | `SAFE_DELETE_MERGED` | — | none |
| `copilot/audit-therapeutic-quality` | 76d | `SAFE_DELETE_MERGED` | #477 | merged |
| `copilot/audit-vitest-configuration` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #6 | closed |
| `copilot/branch-cleanup-wave-1-verification` | 0d | `KEEP_CLEANUP_INFRA` | — | none |
| `copilot/branch-cleanup-wave-4-verification` | 0d | `KEEP_CLEANUP_INFRA` | — | none |
| `copilot/check-fix-performance-issues` | 100d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #232 | closed |
| `copilot/ci-add-playwright-workflow` | 147d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #37 | closed |
| `copilot/ci-validation-wiring-checks` | 91d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #296 | closed |
| `copilot/clean-production-audit` | 77d | `SAFE_DELETE_MERGED` | #451 | merged |
| `copilot/clean-therapeutic-forms-awareness` | 1d | `NO_PR_RECENT` | — | none |
| `copilot/cleanup-wave-1-executor` | 0d | `KEEP_CLEANUP_INFRA` | #773 | merged |
| `copilot/clone-and-push-repository` | 97d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #259 | closed |
| `copilot/commit-last-pr-again` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #469 | closed |
| `copilot/create-batch-3-json` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #507 | closed |
| `copilot/create-numeric-safety-file` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #11 | closed |
| `copilot/create-numeric-safety-module` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #16 | closed |
| `copilot/create-trusted-cbt-batch-3` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #508 | closed |
| `copilot/diagnose-performance-issue` | 98d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #246 | closed |
| `copilot/diagnostic-attachment-runtime-probe` | 51d | `NO_PR_STALE` | — | none |
| `copilot/enable-ai-agent-actions` | 62d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #532 | closed |
| `copilot/enhance-chat-diagnostics` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #129 | closed |
| `copilot/enhance-e2e-chat-diagnostics` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #128 | closed |
| `copilot/enhance-e2e-chat-test` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #113 | closed |
| `copilot/enhance-send-button-locator` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #97 | closed |
| `copilot/execute-branch-cleanup-wave-1` | 0d | `KEEP_CLEANUP_INFRA` | — | none |
| `copilot/fix-404-app-logs-endpoint` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #432 | closed |
| `copilot/fix-404-errors-e2e-tests` | 145d | `SAFE_DELETE_ABANDONED_WIP` | #69 | closed |
| `copilot/fix-ai-chat-issues` | 2d | `REVIEW_CLOSED_RECENT` | #750 | closed |
| `copilot/fix-ai-coach-agent-wiring` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #462 | closed |
| `copilot/fix-ai-coach-agent-wiring-again` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #463 | closed |
| `copilot/fix-ai-coach-agent-wiring-another-one` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #464 | closed |
| `copilot/fix-ai-therapeutic-forms-awareness` | 2d | `NO_PR_RECENT` | — | none |
| `copilot/fix-android-transcription-path-selection` | 48d | `NO_PR_STALE` | — | none |
| `copilot/fix-api-endpoint-construction` | 97d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #250 | closed |
| `copilot/fix-auth-redirect-loop-staging` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #415 | closed |
| `copilot/fix-base44-appid-fallback` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #421 | closed |
| `copilot/fix-base44-appid-fallback-again` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #422 | closed |
| `copilot/fix-base44-appid-fallback-again-again` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #423 | closed |
| `copilot/fix-base44-appid-fallback-conflicts` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #424 | closed |
| `copilot/fix-branch-conflicts` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #379 | closed |
| `copilot/fix-chat-send-button-flakiness` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #108 | closed |
| `copilot/fix-chat-send-button-selector` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #115 | closed |
| `copilot/fix-chat-smoke-test` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #111 | closed |
| `copilot/fix-chat-smoke-test-again` | 64d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #524 | closed |
| `copilot/fix-chat-smoke-test-failures` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #114 | closed |
| `copilot/fix-chat-smoke-test-flake` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #109 | closed |
| `copilot/fix-chat-smoke-test-flakiness` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #107 | closed |
| `copilot/fix-chat-smoke-test-issues` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #119 | closed |
| `copilot/fix-chat-ui-send-button` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #102 | closed |
| `copilot/fix-create-post-heading-visibility` | 84d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #329 | closed |
| `copilot/fix-data-sync-issue-goals-page` | 120d | `SAFE_DELETE_MERGED_PR` | #168 | merged |
| `copilot/fix-delete-icon-in-sessions-list` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #21 | closed |
| `copilot/fix-delete-session-bug` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #18 | closed |
| `copilot/fix-delete-session-bug-again` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #19 | closed |
| `copilot/fix-delete-session-button` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #22 | closed |
| `copilot/fix-duplicate-function-definition` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #488 | closed |
| `copilot/fix-e2e-chat-test-closure` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #146 | closed |
| `copilot/fix-e2e-job-404-errors` | 145d | `SAFE_DELETE_ABANDONED_WIP` | #70 | closed |
| `copilot/fix-e2e-mobile-job-failure` | 1d | `REVIEW_CLOSED_RECENT` | #759 | closed |
| `copilot/fix-e2e-playwright-chat-test` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #103 | closed |
| `copilot/fix-e2e-playwright-errors` | 98d | `SAFE_DELETE_ABANDONED_WIP` | #245 | closed |
| `copilot/fix-e2e-playwright-tests` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #73 | closed |
| `copilot/fix-e2e-pull-refresh-tests` | 98d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #247 | closed |
| `listed in Wave 6 approved list (PR-merged candidate)` | 146d | `SAFE_DELETE_MERGED_PR` | #61 | merged |
| `copilot/fix-e2e-smoke-test-errors` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #123 | closed |
| `copilot/fix-e2e-smoke-test-issue` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #122 | closed |
| `copilot/fix-e2e-smoke-test-issues` | 120d | `NO_PR_OLD` | — | none |
| `listed in Wave 6 approved list (PR-merged candidate)` | 146d | `SAFE_DELETE_MERGED_PR` | #62 | merged |
| `copilot/fix-e2e-test-chat-page` | 98d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #243 | closed |
| `copilot/fix-e2e-test-chat-page-404` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #417 | closed |
| `copilot/fix-e2e-test-chat-page-log-url` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #416 | closed |
| `copilot/fix-e2e-test-errors-again` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #153 | closed |
| `copilot/fix-e2e-test-failure` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #152 | closed |
| `copilot/fix-e2e-test-flakiness` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #120 | closed |
| `copilot/fix-e2e-test-flakiness-again` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #121 | closed |
| `copilot/fix-e2e-test-goalcoach` | 143d | `SAFE_DELETE_ABANDONED_WIP` | #72 | closed |
| `copilot/fix-e2e-test-post-request` | 64d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #522 | closed |
| `listed in Wave 6 approved list (PR-merged candidate)` | 146d | `SAFE_DELETE_MERGED_PR` | #53 | merged |
| `copilot/fix-e2e-tests-android-back-button` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #337 | closed |
| `copilot/fix-e2e-tests-button-locators` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #333 | closed |
| `copilot/fix-e2e-tests-playwright` | 146d | `SAFE_DELETE_ABANDONED_WIP` | #56 | closed |
| `copilot/fix-empty-cbt-therapist-instructions` | 51d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #618 | closed |
| `copilot/fix-english-adolescent-cbt-integration` | 24d | `REVIEW_CLOSED_RECENT` | #713 | closed |
| `copilot/fix-first-message-loss-therapist` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #481 | closed |
| `copilot/fix-first-message-loss-therapist-again` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #482 | closed |
| `copilot/fix-forum-post-form-ui-issues` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #335 | closed |
| `copilot/fix-global-forms-access` | 17d | `REVIEW_CLOSED_RECENT` | #731 | closed |
| `copilot/fix-goals-usequery-definition` | 120d | `NO_PR_OLD` | — | none |
| `copilot/fix-hebrew-e2e-assertion` | 2d | `SAFE_DELETE_MERGED` | — | none |
| `copilot/fix-home-setup-completion-flow-again` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #404 | closed |
| `copilot/fix-home-setup-completion-flow-again-again` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #405 | closed |
| `copilot/fix-home-setup-completion-flow-again-again-again` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #406 | closed |
| `copilot/fix-issues-in-test-folder` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #1 | closed |
| `copilot/fix-lucide-inventory-workflow` | 84d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #327 | closed |
| `copilot/fix-next-button-enable-issue` | 143d | `SAFE_DELETE_ABANDONED_WIP` | #71 | closed |
| `copilot/fix-null-app-id-in-api-url` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #427 | closed |
| `copilot/fix-numeric-safety-import` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #13 | closed |
| `copilot/fix-numeric-safety-import-error` | 160d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #9 | closed |
| `copilot/fix-numeric-safety-import-error-again` | 159d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #10 | closed |
| `copilot/fix-numeric-safety-test-errors` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #3 | closed |
| `copilot/fix-phase2-chat-stall` | 77d | `NO_PR_STALE` | — | none |
| `copilot/fix-playwright-ci-test-structure` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #74 | closed |
| `copilot/fix-playwright-e2e-tests-again` | 146d | `SAFE_DELETE_ABANDONED_WIP` | #54 | closed |
| `copilot/fix-playwright-e2e-tests-another-one` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #83 | closed |
| `copilot/fix-playwright-tests` | 2d | `SAFE_DELETE_MERGED` | — | none |
| `copilot/fix-post-button-visibility` | 84d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #330 | closed |
| `copilot/fix-pull-to-refresh-indicator` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #332 | closed |
| `copilot/fix-pull-to-refresh-indicator-again` | 72d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #516 | closed |
| `copilot/fix-railway-auth-flow-staging` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #413 | closed |
| `copilot/fix-registration-issue` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #446 | closed |
| `copilot/fix-screen-animations-transitions` | 100d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #230 | closed |
| `copilot/fix-screenshot-issues` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #426 | closed |
| `copilot/fix-sessions-delete-e2e` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #23 | closed |
| `copilot/fix-sessions-delete-e2e-again` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #24 | closed |
| `copilot/fix-shared-client-routing` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #409 | closed |
| `copilot/fix-spa-fallback-routes` | 145d | `SAFE_DELETE_ABANDONED_WIP` | #68 | closed |
| `copilot/fix-spa-navigation-offline-error` | 85d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #324 | closed |
| `copilot/fix-staging-branch-issues` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #434 | closed |
| `copilot/fix-super-cbt-agent-enablement` | 62d | `NO_PR_STALE` | — | none |
| `copilot/fix-syntax-error-in-ui-tests` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #85 | closed |
| `copilot/fix-syntax-error-in-ui-tests-again` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #86 | closed |
| `copilot/fix-test-assertion-errors` | 51d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #617 | closed |
| `copilot/fix-test-suite-issues` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #4 | closed |
| `copilot/fix-test-suite-issues-again` | 160d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #8 | closed |
| `copilot/fix-therapeutic-forms-awareness-regression` | 2d | `REVIEW_CLOSED_RECENT` | #753 | closed |
| `copilot/fix-therapeutic-forms-e2e-tests` | 2d | `NO_PR_RECENT` | — | none |
| `copilot/fix-therapist-worksheet-bot-behavior` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #487 | closed |
| `copilot/fix-trash-icon-interactivity` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #20 | closed |
| `copilot/fix-ui-element-selections` | 84d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #331 | closed |
| `copilot/fix-undefined-app-id-error` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #431 | closed |
| `copilot/fix-white-screen-error-another-one` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #395 | closed |
| `copilot/fix-workflows-run-issues` | 157d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #12 | closed |
| `copilot/fixplaywright-e2e-tests-80055313775` | 2d | `REVIEW_CLOSED_RECENT` | #757 | closed |
| `copilot/harden-fallback-logic` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #125 | closed |
| `copilot/harden-runtime-paths` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #383 | closed |
| `copilot/implement-ai-agents-upgrade` | 61d | `NO_PR_STALE` | — | none |
| `copilot/implement-deterministic-forms-tooling` | 17d | `REVIEW_CLOSED_RECENT` | #732 | closed |
| `copilot/implement-i18n-for-mind-games` | 114d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #179 | closed |
| `copilot/implement-shared-layer-fix-again` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #391 | closed |
| `copilot/improve-chat-message-test-robustness` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #100 | closed |
| `copilot/improve-chat-send-button-reliability` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #98 | closed |
| `copilot/improve-chat-smoke-test-reliability` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #104 | closed |
| `copilot/improve-chat-smoke-test-robustness` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #101 | closed |
| `copilot/improve-e2e-test-resilience` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #147 | closed |
| `copilot/improve-e2e-test-robustness` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #116 | closed |
| `copilot/improve-e2e-test-stability` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #112 | closed |
| `copilot/improve-e2e-tests-robustness` | 146d | `SAFE_DELETE_ABANDONED_WIP` | #55 | closed |
| `copilot/improve-error-handling-send-button` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #96 | closed |
| `copilot/improve-inefficient-code` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #2 | closed |
| `copilot/improve-safe-click-helper` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #105 | closed |
| `copilot/increase-send-button-timeout` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #106 | closed |
| `copilot/increase-timeout-send-button` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #110 | closed |
| `copilot/integrate-hebrew-cbt-worksheets` | 10d | `SAFE_DELETE_MERGED` | #706 | merged |
| `copilot/investigate-production-readiness` | 77d | `SAFE_DELETE_MERGED` | #452 | merged |
| `copilot/investigate-runtime-data-integration` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #389 | closed |
| `copilot/mobile-first-coach-improvements` | 156d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #25 | closed |
| `copilot/mobile-only-backend-transcription` | 46d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #666 | closed |
| `copilot/move-tests-to-top-level-directory` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #75 | closed |
| `copilot/normalize-trusted-cbt-batch-1-schema` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #493 | closed |
| `copilot/patch-chat-page-improvements` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #89 | closed |
| `copilot/patch-e2e-smoke-tests` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #88 | closed |
| `copilot/phase-3-audit-recommendation` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #475 | closed |
| `copilot/phase2-chat-stall-fix-main` | 77d | `NO_PR_STALE` | — | none |
| `copilot/pr-11-english-language-parity-tests` | 0d | `SAFE_DELETE_MERGED` | #772 | merged |
| `copilot/pr-8-playwright-mock-assertion-hardening` | 0d | `SAFE_DELETE_MERGED` | #769 | merged |
| `copilot/prepare-app-for-store-submission` | 107d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #186 | closed |
| `copilot/prepare-deployment-for-staging` | 82d | `SAFE_DELETE_MERGED` | #368 | merged |
| `copilot/prepare-merge-from-staging-to-main` | 58d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #574 | closed |
| `copilot/prepare-staging-deployment-runbook` | 80d | `SAFE_DELETE_MERGED` | #373 | merged |
| `copilot/reapply-phase-2-chat-stall-fix` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #470 | closed |
| `copilot/reapply-phase-2-chat-stall-fix-again` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #471 | closed |
| `copilot/reapply-phase-2-chat-stall-fix-again-again` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #472 | closed |
| `copilot/reapply-phase-2-chat-stall-fix-another-one` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #473 | closed |
| `copilot/reduce-test-flakiness-send-message` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #117 | closed |
| `copilot/refactor-e2e-test-stability` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #150 | closed |
| `copilot/refactor-mobile-compatibility-issues` | 96d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #265 | closed |
| `copilot/remove-invalid-code-block` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #87 | closed |
| `copilot/resolve-conflicts-fix-null-app-id-in-api-url` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #428 | closed |
| `copilot/resolve-conflicts-production-readiness` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #454 | closed |
| `copilot/resolve-merge-conflicts-again` | 76d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #489 | closed |
| `copilot/resolve-staging-merge-issues` | 79d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #430 | closed |
| `copilot/restore-missing-e2e-tests` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #76 | closed |
| `listed in Wave 6 approved list (PR-merged candidate)` | 146d | `SAFE_DELETE_MERGED_PR` | #66 | merged |
| `copilot/revise-e2e-tests-for-stability` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #151 | closed |
| `copilot/robustify-handle-send-message` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #92 | closed |
| `copilot/rollout-advanced-ai-capabilities` | 77d | `SAFE_DELETE_MERGED` | #466 | merged |
| `copilot/root-cause-audit-production-upgrades` | 76d | `SAFE_DELETE_MERGED` | #479 | merged |
| `copilot/setup-staging-deployment-workflow` | 82d | `SAFE_DELETE_MERGED` | #367 | merged |
| `copilot/stability-sweep-runtime-issues` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #386 | closed |
| `copilot/stabilize-e2e-chat-test` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #126 | closed |
| `listed in Wave 6 approved list (PR-merged candidate)` | 146d | `SAFE_DELETE_MERGED_PR` | #46 | merged |
| `copilot/stabilize-runtime-behavior` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #377 | closed |
| `copilot/stabilize-runtime-behavior-again` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #381 | closed |
| `copilot/stabilize-test-suite` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #5 | closed |
| `copilot/stage-7-library-search-filter-cleanup` | 54d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #605 | closed |
| `copilot/therapeutic-forms-awareness-e2e` | 1d | `NO_PR_RECENT` | — | none |
| `copilot/translate-home-page-content-please-work` | 100d | `SAFE_DELETE_ABANDONED_WIP` | #217 | closed |
| `copilot/translate-mind-games-content` | 100d | `SAFE_DELETE_ABANDONED_WIP` | #219 | closed |
| `copilot/update-app-for-compliance` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #336 | closed |
| `copilot/update-chat-e2e-test-resilience` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #99 | closed |
| `copilot/update-chat-input-wait-function` | 134d | `SAFE_DELETE_ABANDONED_WIP` | #136 | closed |
| `copilot/update-delete-account-feature` | 83d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #334 | closed |
| `copilot/update-e2e-reliability-tests` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #90 | closed |
| `copilot/update-e2e-smoke-tests` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #149 | closed |
| `copilot/update-file-attachment-handling` | 51d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #619 | closed |
| `copilot/update-playwright-config` | 146d | `SAFE_DELETE_MERGED` | #57 | merged |
| `copilot/update-playwright-config-again` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #79 | closed |
| `copilot/update-playwright-config-projects` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #80 | closed |
| `copilot/update-playwright-e2e-setup` | 133d | `SAFE_DELETE_ABANDONED_WIP` | #157 | closed |
| `copilot/update-playwright-projects` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #81 | closed |
| `copilot/update-playwright-smoke-test` | 141d | `SAFE_DELETE_ABANDONED_WIP` | #124 | closed |
| `copilot/update-playwright-test-helpers` | 64d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #523 | closed |
| `copilot/update-playwright-workflow` | 142d | `SAFE_DELETE_ABANDONED_WIP` | #78 | closed |
| `copilot/update-query-and-state-usage` | 120d | `SAFE_DELETE_ABANDONED_WIP` | #171 | closed |
| `copilot/update-repo-workflow-guidance` | 81d | `SAFE_DELETE_MERGED` | #371 | merged |
| `copilot/update-staging-add-base44-url` | 78d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #436 | closed |
| `copilot/update-trusted-cbt-chunk-import-files` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #503 | closed |
| `copilot/update-trusted-cbt-smoke-import` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #499 | closed |
| `copilot/update-trusted-cbt-smoke-import-again` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #500 | closed |
| `copilot/update-trusted-cbt-smoke-import-ui` | 75d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #501 | closed |
| `copilot/verify-coaching-chat-patch` | 73d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #512 | closed |
| `copilot/verify-fix-shared-appid-resolution` | 80d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #399 | closed |
| `copilot/verify-harden-ai-production-flow` | 77d | `CANDIDATE_DELETE_CLOSED_PR_STALE` | #461 | closed |
| `copilot/verify-test-suite-passing` | 161d | `CANDIDATE_DELETE_CLOSED_PR_OLD` | #7 | closed |
| `main` | 0d | `KEEP_PROTECTED` | #681 | closed |
| `revert-394-copilot/fix-white-screen-error-again` | 80d | `NO_PR_STALE` | — | none |
| `staging-fresh` | 58d | `KEEP_PROTECTED` | #578 | closed |

---
*End of audit report.*

---
**Last updated:** 2026-06-10 — post-Wave-5 deep audit covering all 271 remaining branches.
