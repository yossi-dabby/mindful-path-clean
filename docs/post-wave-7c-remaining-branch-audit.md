# Post-Wave-7C Remaining Branch Audit

> **AUDIT ONLY** — No branches were deleted, archived, or modified during this audit.
> Generated: 2026-06-10

## Background

| Phase | Description | Branches Removed |
|-------|-------------|-----------------|
| Waves 1–6 | Direct-delete safe-merged branches | 243 |
| Wave 7A | Archive + delete abandoned WIP Copilot branches (batch 1) | 25 |
| Wave 7B | Archive + delete abandoned WIP Copilot branches (batch 2) | 50 |
| Wave 7C | Archive + delete abandoned WIP Copilot branches (batch 3) | 12 |
| **Total removed** | | **330** |

All 87 audit-classified abandoned WIP Copilot branches from Waves 7A–7C have been archived and deleted.
This audit covers the **180 branches** that remain after all prior cleanup waves.

---

## Phase 1 — Repository State (as of 2026-06-10)

| Item | Value |
|------|-------|
| Remote branch count | 180 |
| Wave 7A/7B/7C archive tags | 87 |
| Open PRs | 0 |
| Closed PRs scanned | 790 (552 merged, 238 closed-without-merge) |
| Default branch | main |
| Protected/special branches | main, staging-fresh |
| Current working branch | copilot/audit-remaining-branches |
| All Wave 7A–7C branches absent | ✅ Yes (87 archive tags confirmed) |
| Repository checkout clean | ✅ Yes |

---

## Phase 2 — Classification Summary

| Category | Count | Next Wave Candidate |
|----------|-------|---------------------|
| KEEP_PROTECTED_OR_SPECIAL | 2 | No |
| KEEP_OPEN_OR_ACTIVE | 1 | No |
| DIRECT_DELETE_SAFE_MERGED | 15 | ✅ Wave 8 (low risk) |
| ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_OLDER_THAN_90D | 40 | ✅ Wave 8 (low risk) |
| ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D | 81 | ⚠️ Wave 9+ (medium risk) |
| REVIEW_NO_PR_STALE | 2 | ⚠️ Needs individual review |
| REVIEW_NO_PR_RECENT | 21 | ⚠️ Needs individual review |
| REVIEW_RECENT_CLOSED_PR | 9 | ⚠️ Needs individual review |
| REVIEW_DEPLOYMENT_OR_WORKFLOW_REFERENCED | 4 | ⚠️ Needs individual review |
| OWNER_REVIEW_REQUIRED | 4 | 🛑 Owner must decide |
| DO_NOT_TOUCH | 1 | 🛑 Do not touch |
| **Total** | **180** | |

### Safest Next Reduction Path

**Wave 8 candidates (55 branches, low risk):**
- 15 branches with confirmed merged PRs → direct delete
- 40 branches with closed-without-merge PRs older than 90 days → archive then delete

**Wave 9 candidates (81 branches, medium risk):**
- 81 branches with closed-without-merge PRs 30–90 days old → archive then delete (after Wave 8)

**Requires review before any action (36 branches):**
- 21 branches with no PR history, recent commits
- 9 branches with recently closed PRs (< 30 days)
- 4 deployment/workflow-referenced branches
- 2 branches with no PR history, stale commits

**Do not touch (6 branches):**
- 4 branches requiring owner review (contain AI/Chat logic, no PR)
- 1 revert branch (DO_NOT_TOUCH)
- 2 protected/special + 1 active PR branch

---

## Phase 3 — Full Branch Inventory

### 1. KEEP_PROTECTED_OR_SPECIAL (2 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `staging-fresh` | 58 | 2026-04-13 | PR#578 closed-no-merge age=58d | KEEP — protected/special branch |
| `main` | 0 | 2026-06-10 | PR#681 closed-no-merge age=43d | KEEP — protected/special branch |

### 2. KEEP_OPEN_OR_ACTIVE (1 branch)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/audit-remaining-branches` | 0 | 2026-06-10 | no PR | KEEP — current active audit PR branch |

### 3. DIRECT_DELETE_SAFE_MERGED (15 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/update-playwright-config` | 146 | 2026-01-14 | PR#57 ✓merged age=146d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/fix-data-sync-issue-goals-page` | 121 | 2026-02-09 | PR#168 ✓merged age=121d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/add-internal-automated-tests-another-one` | 86 | 2026-03-16 | PR#317 closed-no-merge age=86d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/update-repo-workflow-guidance` | 82 | 2026-03-20 | PR#369 closed-no-merge age=80d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/clean-production-audit` | 78 | 2026-03-24 | PR#451 ✓merged age=78d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/audit-phase-3` | 77 | 2026-03-25 | PR#476 ✓merged age=77d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/audit-therapeutic-quality` | 77 | 2026-03-25 | PR#477 ✓merged age=77d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/investigate-production-readiness` | 77 | 2026-03-24 | PR#452 ✓merged age=77d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/rollout-advanced-ai-capabilities` | 77 | 2026-03-25 | PR#466 ✓merged age=77d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/root-cause-audit-production-upgrades` | 77 | 2026-03-25 | PR#479 ✓merged age=77d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/audit-and-refresh-trusted-cbt` | 76 | 2026-03-26 | PR#495 ✓merged age=76d | DIRECT DELETE — merged PR exists, branch is safe to delete |
| `copilot/integrate-hebrew-cbt-worksheets` | 10 | 2026-05-31 | PR#706 ✓merged age=29d | DIRECT DELETE — merged PR confirmed |
| `copilot/cleanup-wave-1-executor` | 0 | 2026-06-09 | PR#773 ✓merged age=0d | DIRECT DELETE — merged PR confirmed |
| `copilot/pr-8-playwright-mock-assertion-hardening` | 0 | 2026-06-09 | PR#769 ✓merged age=0d | DIRECT DELETE — merged PR confirmed |
| `copilot/pr-11-english-language-parity-tests` | 0 | 2026-06-09 | PR#772 ✓merged age=0d | DIRECT DELETE — merged PR confirmed |

### 4. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_OLDER_THAN_90D (40 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/audit-vitest-configuration` | 161 | 2025-12-30 | PR#6 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-issues-in-test-folder` | 161 | 2025-12-30 | PR#1 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-numeric-safety-test-errors` | 161 | 2025-12-30 | PR#3 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-test-suite-issues` | 161 | 2025-12-30 | PR#4 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-test-suite-issues-again` | 161 | 2025-12-31 | PR#8 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/improve-inefficient-code` | 161 | 2025-12-30 | PR#2 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/stabilize-test-suite` | 161 | 2025-12-30 | PR#5 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/verify-test-suite-passing` | 161 | 2025-12-30 | PR#7 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-numeric-safety-import-error` | 160 | 2025-12-31 | PR#9 closed-no-merge age=160d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=160d) |
| `copilot/fix-numeric-safety-import-error-again` | 160 | 2026-01-01 | PR#10 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/create-numeric-safety-file` | 158 | 2026-01-03 | PR#11 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-workflows-run-issues` | 158 | 2026-01-03 | PR#12 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/add-numeric-safety-module` | 157 | 2026-01-03 | PR#14 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/add-numeric-safety-module-again` | 157 | 2026-01-03 | PR#15 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/create-numeric-safety-module` | 157 | 2026-01-03 | PR#16 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-delete-icon-in-sessions-list` | 157 | 2026-01-04 | PR#21 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-delete-session-bug` | 157 | 2026-01-04 | PR#18 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-delete-session-bug-again` | 157 | 2026-01-04 | PR#19 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-delete-session-button` | 157 | 2026-01-04 | PR#22 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-numeric-safety-import` | 157 | 2026-01-03 | PR#13 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-sessions-delete-e2e` | 157 | 2026-01-04 | PR#23 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-sessions-delete-e2e-again` | 157 | 2026-01-04 | PR#24 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/fix-trash-icon-interactivity` | 157 | 2026-01-04 | PR#20 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/mobile-first-coach-improvements` | 157 | 2026-01-04 | PR#25 closed-no-merge age=157d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=157d) |
| `copilot/ci-add-playwright-workflow` | 147 | 2026-01-13 | PR#37 closed-no-merge age=147d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=147d) |
| `copilot/add-production-smoke-test-suite` | 123 | 2026-02-07 | PR#158 closed-no-merge age=122d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=122d) |
| `copilot/implement-i18n-for-mind-games` | 115 | 2026-02-15 | PR#179 closed-no-merge age=114d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=114d) |
| `copilot/prepare-app-for-store-submission` | 107 | 2026-02-23 | PR#186 closed-no-merge age=107d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=107d) |
| `copilot/check-fix-performance-issues` | 100 | 2026-03-02 | PR#232 closed-no-merge age=100d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=100d) |
| `copilot/fix-screen-animations-transitions` | 100 | 2026-03-02 | PR#230 closed-no-merge age=100d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=100d) |
| `copilot/add-playwright-test-suite` | 98 | 2026-03-04 | PR#249 closed-no-merge age=97d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=97d) |
| `copilot/diagnose-performance-issue` | 98 | 2026-03-04 | PR#246 closed-no-merge age=98d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=98d) |
| `copilot/fix-api-endpoint-construction` | 98 | 2026-03-04 | PR#250 closed-no-merge age=97d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=97d) |
| `copilot/fix-e2e-pull-refresh-tests` | 98 | 2026-03-04 | PR#247 closed-no-merge age=98d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=98d) |
| `copilot/fix-e2e-test-chat-page` | 98 | 2026-03-03 | PR#243 closed-no-merge age=98d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=98d) |
| `copilot/add-accessibility-tests-community-page` | 97 | 2026-03-04 | PR#256 closed-no-merge age=97d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=97d) |
| `copilot/add-forum-post-card-tests` | 97 | 2026-03-04 | PR#252 closed-no-merge age=97d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=97d) |
| `copilot/clone-and-push-repository` | 97 | 2026-03-05 | PR#259 closed-no-merge age=97d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=97d) |
| `copilot/refactor-mobile-compatibility-issues` | 96 | 2026-03-06 | PR#265 closed-no-merge age=96d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=96d) |
| `copilot/ci-validation-wiring-checks` | 92 | 2026-03-10 | PR#296 closed-no-merge age=92d | ARCHIVE THEN DELETE — closed PR >90d ago (PR age=92d) |

### 5. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D (81 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/add-e2e-tests-and-ci-improvements` | 85 | 2026-03-16 | PR#323 closed-no-merge age=85d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=85d) |
| `copilot/fix-lucide-inventory-workflow` | 85 | 2026-03-17 | PR#327 closed-no-merge age=85d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=85d) |
| `copilot/fix-spa-navigation-offline-error` | 85 | 2026-03-16 | PR#324 closed-no-merge age=85d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=85d) |
| `copilot/fix-create-post-heading-visibility` | 84 | 2026-03-18 | PR#329 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-e2e-tests-android-back-button` | 84 | 2026-03-18 | PR#337 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-e2e-tests-button-locators` | 84 | 2026-03-18 | PR#333 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-forum-post-form-ui-issues` | 84 | 2026-03-18 | PR#335 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-post-button-visibility` | 84 | 2026-03-18 | PR#330 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-pull-to-refresh-indicator` | 84 | 2026-03-18 | PR#332 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-ui-element-selections` | 84 | 2026-03-18 | PR#331 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/update-app-for-compliance` | 84 | 2026-03-18 | PR#336 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/update-delete-account-feature` | 84 | 2026-03-18 | PR#334 closed-no-merge age=84d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=84d) |
| `copilot/fix-auth-redirect-loop-staging` | 80 | 2026-03-22 | PR#415 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-branch-conflicts` | 80 | 2026-03-21 | PR#379 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/fix-e2e-test-chat-page-log-url` | 80 | 2026-03-22 | PR#416 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-home-setup-completion-flow-again` | 80 | 2026-03-22 | PR#404 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-home-setup-completion-flow-again-again` | 80 | 2026-03-22 | PR#405 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-home-setup-completion-flow-again-again-again` | 80 | 2026-03-22 | PR#406 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-railway-auth-flow-staging` | 80 | 2026-03-22 | PR#413 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-shared-client-routing` | 80 | 2026-03-22 | PR#409 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-white-screen-error-another-one` | 80 | 2026-03-22 | PR#395 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/harden-runtime-paths` | 80 | 2026-03-22 | PR#383 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/implement-shared-layer-fix-again` | 80 | 2026-03-22 | PR#391 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/investigate-runtime-data-integration` | 80 | 2026-03-22 | PR#389 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/stability-sweep-runtime-issues` | 80 | 2026-03-22 | PR#386 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/stabilize-runtime-behavior` | 80 | 2026-03-21 | PR#376 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/stabilize-runtime-behavior-again` | 80 | 2026-03-22 | PR#380 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/verify-fix-shared-appid-resolution` | 80 | 2026-03-22 | PR#399 closed-no-merge age=80d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=80d) |
| `copilot/fix-404-app-logs-endpoint` | 79 | 2026-03-22 | PR#432 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-base44-appid-fallback` | 79 | 2026-03-22 | PR#421 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-base44-appid-fallback-again` | 79 | 2026-03-22 | PR#422 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-base44-appid-fallback-again-again` | 79 | 2026-03-22 | PR#423 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-base44-appid-fallback-conflicts` | 79 | 2026-03-22 | PR#424 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-e2e-test-chat-page-404` | 79 | 2026-03-22 | PR#417 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-null-app-id-in-api-url` | 79 | 2026-03-22 | PR#427 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-screenshot-issues` | 79 | 2026-03-22 | PR#426 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-staging-branch-issues` | 79 | 2026-03-23 | PR#434 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/fix-undefined-app-id-error` | 79 | 2026-03-22 | PR#431 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/resolve-conflicts-fix-null-app-id-in-api-url` | 79 | 2026-03-22 | PR#428 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/resolve-staging-merge-issues` | 79 | 2026-03-22 | PR#430 closed-no-merge age=79d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=79d) |
| `copilot/update-staging-add-base44-url` | 79 | 2026-03-23 | PR#436 closed-no-merge age=78d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=78d) |
| `copilot/fix-registration-issue` | 78 | 2026-03-24 | PR#446 closed-no-merge age=78d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=78d) |
| `copilot/add-temp-diagnostics-bootstrap-failure` | 77 | 2026-03-24 | PR#457 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/commit-last-pr-again` | 77 | 2026-03-25 | PR#469 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/fix-ai-coach-agent-wiring` | 77 | 2026-03-25 | PR#462 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/fix-ai-coach-agent-wiring-again` | 77 | 2026-03-25 | PR#463 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/fix-ai-coach-agent-wiring-another-one` | 77 | 2026-03-25 | PR#464 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/phase-3-audit-recommendation` | 77 | 2026-03-25 | PR#475 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/reapply-phase-2-chat-stall-fix` | 77 | 2026-03-25 | PR#470 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/reapply-phase-2-chat-stall-fix-again` | 77 | 2026-03-25 | PR#471 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/reapply-phase-2-chat-stall-fix-again-again` | 77 | 2026-03-25 | PR#472 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/reapply-phase-2-chat-stall-fix-another-one` | 77 | 2026-03-25 | PR#473 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/resolve-conflicts-production-readiness` | 77 | 2026-03-24 | PR#454 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/verify-harden-ai-production-flow` | 77 | 2026-03-25 | PR#461 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/452-resolve-conflicts-between-copilot-and-staging` | 77 | 2026-03-24 | PR#453 closed-no-merge age=77d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=77d) |
| `copilot/fix-duplicate-function-definition` | 76 | 2026-03-26 | PR#488 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/fix-first-message-loss-therapist` | 76 | 2026-03-25 | PR#481 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/fix-first-message-loss-therapist-again` | 76 | 2026-03-25 | PR#482 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/fix-therapist-worksheet-bot-behavior` | 76 | 2026-03-26 | PR#487 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/normalize-trusted-cbt-batch-1-schema` | 76 | 2026-03-26 | PR#493 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/resolve-merge-conflicts-again` | 76 | 2026-03-26 | PR#489 closed-no-merge age=76d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=76d) |
| `copilot/audit-and-refresh-import-file-again` | 75 | 2026-03-26 | PR#497 closed-no-merge age=75d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=75d) |
| `copilot/create-batch-3-json` | 75 | 2026-03-27 | PR#507 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/create-trusted-cbt-batch-3` | 75 | 2026-03-27 | PR#508 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/update-trusted-cbt-chunk-import-files` | 75 | 2026-03-26 | PR#503 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/update-trusted-cbt-smoke-import` | 75 | 2026-03-26 | PR#499 closed-no-merge age=75d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=75d) |
| `copilot/update-trusted-cbt-smoke-import-again` | 75 | 2026-03-26 | PR#500 closed-no-merge age=75d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=75d) |
| `copilot/update-trusted-cbt-smoke-import-ui` | 75 | 2026-03-26 | PR#501 closed-no-merge age=75d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=75d) |
| `copilot/audit-store-readiness` | 73 | 2026-03-29 | PR#510 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/fix-pull-to-refresh-indicator-again` | 73 | 2026-03-29 | PR#516 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/verify-coaching-chat-patch` | 73 | 2026-03-29 | PR#512 closed-no-merge age=73d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=73d) |
| `copilot/fix-chat-smoke-test-again` | 64 | 2026-04-06 | PR#524 closed-no-merge age=64d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=64d) |
| `copilot/fix-e2e-test-post-request` | 64 | 2026-04-06 | PR#522 closed-no-merge age=64d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=64d) |
| `copilot/update-playwright-test-helpers` | 64 | 2026-04-06 | PR#523 closed-no-merge age=64d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=64d) |
| `copilot/audit-test-helpers-e2e-integration` | 62 | 2026-04-09 | PR#533 closed-no-merge age=61d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=61d) |
| `copilot/enable-ai-agent-actions` | 62 | 2026-04-09 | PR#532 closed-no-merge age=61d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=61d) |
| `copilot/stage-7-library-search-filter-cleanup` | 54 | 2026-04-17 | PR#605 closed-no-merge age=52d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=52d) |
| `copilot/fix-empty-cbt-therapist-instructions` | 51 | 2026-04-19 | PR#618 closed-no-merge age=51d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=51d) |
| `copilot/fix-test-assertion-errors` | 51 | 2026-04-19 | PR#617 closed-no-merge age=51d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=51d) |
| `copilot/update-file-attachment-handling` | 51 | 2026-04-19 | PR#619 closed-no-merge age=51d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=51d) |
| `copilot/mobile-only-backend-transcription` | 47 | 2026-04-24 | PR#666 closed-no-merge age=45d | ARCHIVE THEN DELETE — closed PR 30-90d ago (PR age=45d) |

### 6. REVIEW_NO_PR_STALE (2 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/fix-e2e-smoke-test-issues` | 121 | 2026-02-09 | no PR | REVIEW — no PR, stale (121d old) |
| `copilot/fix-goals-usequery-definition` | 121 | 2026-02-09 | no PR | REVIEW — no PR, stale (121d old) |

### 7. REVIEW_NO_PR_RECENT (21 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `chore/lucide-inventory-reports` | 85 | 2026-03-17 | no PR | REVIEW — chore branch, no PR prefix |
| `copilot/2394-audit-repair-test-infra` | 62 | 2026-04-09 | no PR | REVIEW — no PR, recent (62d old) |
| `copilot/diagnostic-attachment-runtime-probe` | 52 | 2026-04-19 | no PR | REVIEW — no PR, recent (52d old) |
| `copilot/fix-android-transcription-path-selection` | 48 | 2026-04-23 | no PR | REVIEW — no PR, recent (48d old) |
| `copilot/add-hebrew-adolescent-cbt-worksheets` | 28 | 2026-05-13 | no PR | REVIEW — no PR, recent (28d old) |
| `copilot/audit-therapeutic-forms-library` | 9 | 2026-06-01 | no PR | REVIEW — no PR, recent (9d old) |
| `copilot/fix-ai-therapeutic-forms-awareness` | 3 | 2026-06-07 | no PR | REVIEW — no PR, recent (3d old) |
| `copilot/audit-therapeutic-forms-e2e` | 2 | 2026-06-07 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/clean-therapeutic-forms-awareness` | 2 | 2026-06-08 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/fix-hebrew-e2e-assertion` | 2 | 2026-06-07 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/fix-playwright-tests` | 2 | 2026-06-07 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/fix-therapeutic-forms-e2e-tests` | 2 | 2026-06-07 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/therapeutic-forms-awareness-e2e` | 2 | 2026-06-08 | no PR | REVIEW — no PR, recent (2d old) |
| `copilot/audit-branch-hygiene` | 0 | 2026-06-09 | no PR | REVIEW — branch cleanup infrastructure branch |
| `copilot/branch-cleanup-wave-1-verification` | 0 | 2026-06-10 | no PR | REVIEW — branch cleanup infrastructure branch |
| `copilot/branch-cleanup-wave-4-verification` | 0 | 2026-06-10 | no PR | REVIEW — branch cleanup infrastructure branch |
| `copilot/cleanup-wave-7a-verification` | 0 | 2026-06-10 | no PR | REVIEW — branch cleanup infrastructure branch |
| `copilot/copilotprepare-branch-cleanup-wave-6` | 0 | 2026-06-10 | no PR | REVIEW — branch cleanup infrastructure branch |
| `copilot/execute-branch-cleanup-wave-1` | 0 | 2026-06-09 | no PR | REVIEW — no PR, recent (0d old) |
| `copilot/fix-archive-delete-abandoned-branches` | 0 | 2026-06-10 | PR#787 closed-no-merge age=0d | REVIEW — branch cleanup infrastructure branch |
| `copilot/fix-archive-delete-abandoned-wip-branches-wave-7b` | 0 | 2026-06-10 | PR#788 closed-no-merge age=0d | REVIEW — branch cleanup infrastructure branch |

### 8. REVIEW_RECENT_CLOSED_PR (9 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/add-english-cbt-core-series-1` | 27 | 2026-05-14 | PR#709 closed-no-merge age=27d | REVIEW — closed PR recently (PR age=27d) |
| `copilot/fix-english-adolescent-cbt-integration` | 24 | 2026-05-17 | PR#713 closed-no-merge age=24d | REVIEW — closed PR recently (PR age=24d) |
| `copilot/fix-global-forms-access` | 17 | 2026-05-24 | PR#731 closed-no-merge age=17d | REVIEW — closed PR recently (PR age=17d) |
| `copilot/implement-deterministic-forms-tooling` | 17 | 2026-05-24 | PR#732 closed-no-merge age=17d | REVIEW — closed PR recently (PR age=17d) |
| `copilot/fix-ai-chat-issues` | 3 | 2026-06-07 | PR#750 closed-no-merge age=3d | REVIEW — closed PR recently (PR age=3d) |
| `copilot/fix-therapeutic-forms-awareness-regression` | 3 | 2026-06-07 | PR#753 closed-no-merge age=2d | REVIEW — closed PR recently (PR age=2d) |
| `copilot/add-playwright-e2e-coverage` | 2 | 2026-06-08 | PR#756 closed-no-merge age=2d | REVIEW — closed PR recently (PR age=2d) |
| `copilot/fix-e2e-mobile-job-failure` | 2 | 2026-06-08 | PR#759 closed-no-merge age=2d | REVIEW — closed PR recently (PR age=2d) |
| `copilot/fixplaywright-e2e-tests-80055313775` | 2 | 2026-06-08 | PR#757 closed-no-merge age=2d | REVIEW — closed PR recently (PR age=2d) |

### 9. REVIEW_DEPLOYMENT_OR_WORKFLOW_REFERENCED (4 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/prepare-deployment-for-staging` | 82 | 2026-03-20 | PR#366 closed-no-merge age=82d | REVIEW — deployment/workflow referenced branch |
| `copilot/setup-staging-deployment-workflow` | 82 | 2026-03-20 | PR#365 closed-no-merge age=82d | REVIEW — deployment/workflow referenced branch |
| `copilot/prepare-staging-deployment-runbook` | 81 | 2026-03-21 | PR#372 closed-no-merge age=80d | REVIEW — deployment/workflow referenced branch |
| `copilot/prepare-merge-from-staging-to-main` | 58 | 2026-04-13 | PR#574 closed-no-merge age=58d | REVIEW — deployment/workflow referenced branch |

### 10. OWNER_REVIEW_REQUIRED (4 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `copilot/fix-phase2-chat-stall` | 77 | 2026-03-25 | no PR | OWNER REVIEW — no PR, contains AI/Chat logic changes, age=77d |
| `copilot/phase2-chat-stall-fix-main` | 77 | 2026-03-25 | no PR | OWNER REVIEW — no PR, contains AI/Chat logic changes, age=77d |
| `copilot/fix-super-cbt-agent-enablement` | 62 | 2026-04-09 | no PR | OWNER REVIEW — no PR, contains AI/Chat logic changes, age=62d |
| `copilot/implement-ai-agents-upgrade` | 62 | 2026-04-09 | no PR | OWNER REVIEW — no PR, contains AI/Chat logic changes, age=62d |

### 11. DO_NOT_TOUCH (1 branch)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| `revert-394-copilot/fix-white-screen-error-again` | 80 | 2026-03-22 | no PR | DO NOT TOUCH — revert branch, may be needed for rollback |

---

## Phase 4 — Risk Assessment and Recommended Wave Plan

### Wave 8 — Direct Delete + Archive Oldest (55 branches)

**Risk:** LOW

| Sub-bucket | Count | Method |
|------------|-------|--------|
| Confirmed merged PR | 15 | Direct delete (no archive needed) |
| Closed-without-merge PR, age > 90 days | 40 | Archive tag then delete |
| **Wave 8 total** | **55** | |

All 55 branches have confirmed PR records, work was either merged or closed more than 90 days ago.
None reference production AI logic, Chat behavior, or forms routing.

### Wave 9 — Archive + Delete 30–90d Closed PRs (81 branches)

**Risk:** MEDIUM

81 branches with closed-without-merge PRs that are 30–90 days old.
Recommended to proceed only after Wave 8 completes and repository state is stable.
Archive tags must be created before deletion.

### Wave 10+ — Review Batches (36 branches)

**Risk:** MEDIUM–HIGH

These branches require individual human review before any action:
- 21 REVIEW_NO_PR_RECENT branches (no PR history, recent commits)
- 9 REVIEW_RECENT_CLOSED_PR branches (PR closed < 30 days)
- 4 REVIEW_DEPLOYMENT_OR_WORKFLOW_REFERENCED branches
- 2 REVIEW_NO_PR_STALE branches (no PR, > 90 days old)

### Never Delete

| Branch | Reason |
|--------|--------|
| `main` | Default production branch |
| `staging-fresh` | Staging reference branch |
| `copilot/audit-remaining-branches` | Active audit PR branch |
| `revert-394-copilot/fix-white-screen-error-again` | Revert branch — owner must review before any action |
| `copilot/fix-phase2-chat-stall` | AI/Chat logic changes, no PR — owner must review |
| `copilot/phase2-chat-stall-fix-main` | AI/Chat logic changes, no PR — owner must review |
| `copilot/implement-ai-agents-upgrade` | AI routing changes, no PR — owner must review |
| `copilot/fix-super-cbt-agent-enablement` | Agent enablement logic, no PR — owner must review |

---

## Appendix — Notes on Classification Method

- **merged PR** = at least one PR with `mergedAt` timestamp exists for this branch in the closed PR list
- **closed-without-merge** = latest PR for this branch is closed but has no `mergedAt`
- **no PR** = branch name not found in any open or closed PR's `headRefName`
- **age in days** = calendar days since the branch tip commit was authored
- **PR age in days** = calendar days since the PR was closed or merged
- Branches with AI/Chat/agent keywords and no PR history were escalated to OWNER_REVIEW_REQUIRED
- Deployment/workflow-prefixed branches were escalated to REVIEW_DEPLOYMENT_OR_WORKFLOW_REFERENCED
- The current working branch (`copilot/audit-remaining-branches`) is classified KEEP_OPEN_OR_ACTIVE
