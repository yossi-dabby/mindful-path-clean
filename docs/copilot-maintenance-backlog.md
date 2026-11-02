# Copilot Maintenance Backlog — Mindful Path CBT App

> **Stage 7 — Final Copilot Documentation Phase**
> This document classifies future maintenance work by priority.
> Each item links to the technical debt register where applicable.
> No runtime behavior was changed in creating this document.

---

## How to Use This Backlog

Work items are grouped into four priority tiers.
Before acting on any item:
1. Read the recommended lane in `docs/copilot-task-lanes.md`.
2. Check whether human approval is required.
3. Open a small, focused PR — one logical change per PR.
4. Fill out the PR template at `.github/pull_request_template.md` before merging.

---

## Priority Tier 1 — MUST FIX / HIGH PRIORITY

These items address safety, security, or production risk. They should be resolved in the near term.

---

### MB-01 — Audit Stripe Webhook Signature Validation

| Field | Value |
|---|---|
| **Why it matters** | `functions/stripeWebhook.ts` handles live payment events. Without Stripe signature validation, spoofed webhook events could trigger subscription changes. This is a security-critical gap. |
| **Impacted paths** | `functions/stripeWebhook.ts` |
| **Relates to** | TD-22 |
| **Suggested PR size** | Small |
| **Required validation** | Human security review of live function; Copilot must not modify payment code |
| **Required approval** | Repository owner + security reviewer |
| **Safe Copilot lane** | **Human review only — not a Copilot task** |
| **Change type** | Human audit required; documentation only via Copilot |

---

### MB-02 — Add Regression Tests for Crisis Detection Logic

| Field | Value |
|---|---|
| **Why it matters** | `functions/enhancedCrisisDetector.ts` is safety-critical. Users in crisis depend on it functioning correctly. A regression in this function could cause missed escalations for vulnerable users. |
| **Impacted paths** | `functions/enhancedCrisisDetector.ts`, `test/` |
| **Relates to** | TD-09 |
| **Suggested PR size** | Small |
| **Required validation** | `npm test` must pass; two human reviewers must verify tests reflect live crisis logic |
| **Required approval** | Two reviewers — Lane 6 mandatory |
| **Safe Copilot lane** | Lane 6 — Safety-Critical (Copilot drafts stubs; human validates) |
| **Change type** | Test-only |

---

### MB-03 — Audit Private Entity Data Flow

| Field | Value |
|---|---|
| **Why it matters** | The policy prohibiting cross-user access to private entities (`ThoughtJournal`, `Conversation`, `CaseFormulation`, `MoodEntry`, `CompanionMemory`, `UserDeletedConversations`) must be verified against actual live wiring. A gap here is a privacy violation risk. |
| **Impacted paths** | `src/api/agentWiring.js`, `src/api/activeAgentWiring.js`, `functions/retrieveRelevantContent.ts`, `docs/` |
| **Relates to** | TD-21 |
| **Suggested PR size** | Small |
| **Required validation** | Owner must verify against live Base44 configuration |
| **Required approval** | Repository owner |
| **Safe Copilot lane** | Lane 1 — Documentation (audit checklist draft only; human verifies) |
| **Change type** | Docs-only via Copilot; human verification required |

---

### MB-04 — Formalize Safety Filter Review Checklist

| Field | Value |
|---|---|
| **Why it matters** | Without a formal pre-merge checklist for `postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, and `sanitizeConversation.ts`, reviewers may miss regressions. A documented checklist reduces human error in review. |
| **Impacted paths** | `docs/`, `functions/postLlmSafetyFilter.ts`, `functions/sanitizeAgentOutput.ts`, `functions/sanitizeConversation.ts` |
| **Relates to** | TD-08 |
| **Suggested PR size** | Small |
| **Required validation** | Human review to confirm the checklist is accurate and complete |
| **Required approval** | Repository owner recommended |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-05 — Add Unit Tests for Safety Filter Functions

| Field | Value |
|---|---|
| **Why it matters** | `postLlmSafetyFilter.ts` and `sanitizeAgentOutput.ts` are production-active safety mechanisms with no Vitest unit tests in `test/`. A regression in these functions could expose users to harmful content. |
| **Impacted paths** | `test/`, `functions/postLlmSafetyFilter.ts`, `functions/sanitizeAgentOutput.ts` |
| **Relates to** | TD-04 |
| **Suggested PR size** | Small |
| **Required validation** | `npm test` must pass; two reviewers must verify tests accurately reflect live filter logic |
| **Required approval** | Two reviewers — Lane 6 mandatory |
| **Safe Copilot lane** | Lane 6 — Safety-Critical |
| **Change type** | Test-only |

---

## Priority Tier 2 — SHOULD IMPROVE / MEDIUM PRIORITY

These items address reliability, observability, and process quality. They should be resolved within the next development cycle.

---

### MB-06 — Document Data Retention Runbook

| Field | Value |
|---|---|
| **Why it matters** | `functions/retentionCleanup.ts` permanently deletes user data. Without a runbook, operators cannot verify execution, understand scope, or recover from failures. |
| **Impacted paths** | `docs/`, `functions/retentionCleanup.ts` |
| **Relates to** | TD-11 |
| **Suggested PR size** | Small |
| **Required validation** | Owner confirms runbook accurately describes live behavior |
| **Required approval** | Repository owner |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-07 — Add Type Checking to CI Workflow

| Field | Value |
|---|---|
| **Why it matters** | `npm run typecheck` is documented as a pre-merge step but may not run in CI. Type errors can be introduced without detection, increasing the chance of runtime bugs. |
| **Impacted paths** | `.github/workflows/` |
| **Relates to** | TD-14 |
| **Suggested PR size** | Small |
| **Required validation** | CI workflow must execute successfully; human review of workflow change |
| **Required approval** | Recommended (human review of CI changes) |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI configuration change |

---

### MB-08 — Add i18n Completeness Gate to CI

| Field | Value |
|---|---|
| **Why it matters** | Missing translation keys in non-English languages silently fall back to English. Hebrew (RTL) users in particular may receive improperly formatted fallback text. |
| **Impacted paths** | `.github/workflows/`, `test/utils/translations.test.js` |
| **Relates to** | TD-07 |
| **Suggested PR size** | Small |
| **Required validation** | CI must fail when any translation key is missing in any of the 7 languages; `npm test` must pass |
| **Required approval** | Recommended |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI configuration change |

---

### MB-09 — Schedule Red-Team and Compliance Report Runs

| Field | Value |
|---|---|
| **Why it matters** | `functions/redTeamingTests.ts` and `functions/generateComplianceReport.ts` exist but are not scheduled. Periodic execution is important for a mental health app to detect safety regressions proactively. |
| **Impacted paths** | `functions/redTeamingTests.ts`, `functions/generateComplianceReport.ts`, `.github/workflows/` |
| **Relates to** | TD-18 |
| **Suggested PR size** | Small |
| **Required validation** | Owner confirms scheduled run does not affect live app behavior |
| **Required approval** | Repository owner |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI / scheduling configuration |

---

### MB-10 — Document Branch Protection Requirements

| Field | Value |
|---|---|
| **Why it matters** | For a production-sensitive mental health app, main branch protection (required CI, required reviewers, no force push) is essential. The current state is undocumented. |
| **Impacted paths** | `docs/copilot-pr-workflow.md` |
| **Relates to** | TD-15 |
| **Suggested PR size** | Small |
| **Required validation** | Human confirms documented settings match actual GitHub repository settings |
| **Required approval** | Repository owner |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-11 — Document Retrieval Pipeline End-to-End

| Field | Value |
|---|---|
| **Why it matters** | The content-to-agent knowledge pipeline spans multiple functions. Without a single reference document, it is difficult to onboard contributors or debug retrieval quality issues. |
| **Impacted paths** | `docs/`, `functions/` |
| **Relates to** | TD-10 |
| **Suggested PR size** | Small |
| **Required validation** | Owner confirms the described pipeline matches live behavior |
| **Required approval** | Recommended |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-12 — Add Retrieval Evaluation to CI

| Field | Value |
|---|---|
| **Why it matters** | Retrieval quality can silently degrade when content entities change. Running `evaluateKnowledgeIndex.ts` golden scenarios in CI would catch regressions early. |
| **Impacted paths** | `.github/workflows/`, `functions/goldenScenarios.ts`, `functions/evaluateKnowledgeIndex.ts` |
| **Relates to** | TD-01 |
| **Suggested PR size** | Medium |
| **Required validation** | CI must not block on transient retrieval variability; human must calibrate pass/fail thresholds |
| **Required approval** | Repository owner |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI configuration change |

---

## Priority Tier 3 — NICE TO HAVE / LOW PRIORITY

These items improve developer experience and long-term maintainability. They can be deferred.

---

### MB-13 — Add CI Status Badges to README

| Field | Value |
|---|---|
| **Why it matters** | Contributors can quickly assess repository health at a glance. |
| **Impacted paths** | `README.md`, `.github/workflows/` |
| **Relates to** | TD-13 |
| **Suggested PR size** | Small |
| **Required validation** | Human confirms badge links point to correct workflows |
| **Required approval** | No |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-14 — Create ADR for Scroll Container Pattern

| Field | Value |
|---|---|
| **Why it matters** | Captures the `overflow-x-clip` decision with full context for future contributors, reducing the chance of the pattern being accidentally reversed. |
| **Impacted paths** | `docs/` |
| **Relates to** | TD-12 |
| **Suggested PR size** | Small |
| **Required validation** | Human confirms ADR accurately reflects the decision |
| **Required approval** | No |
| **Safe Copilot lane** | Lane 1 — Documentation |
| **Change type** | Docs-only |

---

### MB-15 — Add ESLint Rule to Prevent `overflow-x-hidden` on Page Wrappers

| Field | Value |
|---|---|
| **Why it matters** | Automates enforcement of the `overflow-x-clip` rule, preventing accidental regressions in UI components. |
| **Impacted paths** | `eslint.config.js` |
| **Relates to** | TD-19 |
| **Suggested PR size** | Small |
| **Required validation** | `npm run lint` must pass; human confirms rule does not produce false positives |
| **Required approval** | Recommended |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI/linting configuration |

---

### MB-16 — Expand Android E2E Test Coverage

| Field | Value |
|---|---|
| **Why it matters** | Android-specific scroll and interaction behavior is not fully regression-tested. Parity with web E2E tests reduces the chance of mobile-only regressions. |
| **Impacted paths** | `tests/android/`, `playwright.android.config.ts` |
| **Relates to** | TD-06 |
| **Suggested PR size** | Small |
| **Required validation** | `npm run test:e2e` must pass; tests must not be flaky |
| **Required approval** | No |
| **Safe Copilot lane** | Lane 2 — Test / Regression |
| **Change type** | Test-only |

---

### MB-17 — Enforce PR Template Completion in CI

| Field | Value |
|---|---|
| **Why it matters** | Automatically enforcing the PR template reduces the chance of incomplete descriptions reaching production review. |
| **Impacted paths** | `.github/workflows/`, `.github/pull_request_template.md` |
| **Relates to** | TD-16 |
| **Suggested PR size** | Small |
| **Required validation** | CI gate must not block legitimate PRs; human reviews enforcement logic |
| **Required approval** | Recommended |
| **Safe Copilot lane** | Lane 4 — Review / Hardening |
| **Change type** | CI configuration change |

---

## Priority Tier 4 — EXPLICITLY DEFERRED

These items are acknowledged but will not be scheduled until explicitly prioritized by the repository owner.

---

### MB-18 — Visual Regression Testing for Layout Changes

| Field | Value |
|---|---|
| **Why it matters** | Layout and scroll changes are currently validated by manual review only. Visual snapshot tests would catch unintended layout regressions. |
| **Why deferred** | Requires choosing and integrating a visual testing tool; high setup cost relative to current team size. |
| **Impacted paths** | `tests/e2e/`, `src/components/layout/` |
| **Relates to** | TD-20 |
| **Required approval when scheduling** | Yes — UI Lane 5 |
| **Safe Copilot lane** | Lane 5 — UI (with explicit approval when scheduled) |

---

### MB-19 — Agent Response Quality Dashboard

| Field | Value |
|---|---|
| **Why it matters** | Continuous observability of agent response quality is a best practice for AI-driven apps. |
| **Why deferred** | Requires Base44 observability integration and metric design decisions by the owner. |
| **Impacted paths** | `functions/evaluateKnowledgeIndex.ts`, `functions/logProtocolMetrics.ts` |
| **Relates to** | TD-17 |
| **Required approval when scheduling** | Yes |
| **Safe Copilot lane** | Not a Copilot task — requires Base44 configuration |

---

### MB-20 — E2E Tests Asserting on Agent Response Semantics

| Field | Value |
|---|---|
| **Why it matters** | Tests that verify agent response quality (not just UI flow) would provide stronger safety regression coverage. |
| **Why deferred** | Requires stable golden response fixtures and careful mock design to avoid brittleness. |
| **Impacted paths** | `tests/e2e/`, `functions/safetyGoldenScenarios.ts` |
| **Relates to** | TD-05 |
| **Required approval when scheduling** | Recommended |
| **Safe Copilot lane** | Lane 2 — Test / Regression (structural tests only) |

---

## Backlog Summary

| ID | Title | Priority | Lane | Approval |
|---|---|---|---|---|
| MB-01 | Stripe webhook audit | MUST FIX | Human only | Owner + security |
| MB-02 | Crisis detector regression tests | MUST FIX | 6 | Two reviewers |
| MB-03 | Private entity data flow audit | MUST FIX | 1 | Owner |
| MB-04 | Safety filter review checklist | MUST FIX | 1 | Recommended |
| MB-05 | Safety filter unit tests | MUST FIX | 6 | Two reviewers |
| MB-06 | Retention runbook | SHOULD | 1 | Owner |
| MB-07 | Typecheck in CI | SHOULD | 4 | Recommended |
| MB-08 | i18n gate in CI | SHOULD | 4 | Recommended |
| MB-09 | Schedule red-team runs | SHOULD | 4 | Owner |
| MB-10 | Document branch protection | SHOULD | 1 | Owner |
| MB-11 | Retrieval pipeline doc | SHOULD | 1 | Recommended |
| MB-12 | Retrieval evaluation in CI | SHOULD | 4 | Owner |
| MB-13 | CI badges in README | NICE | 1 | No |
| MB-14 | ADR for scroll pattern | NICE | 1 | No |
| MB-15 | ESLint rule for overflow | NICE | 4 | Recommended |
| MB-16 | Android E2E coverage | NICE | 2 | No |
| MB-17 | Enforce PR template | NICE | 4 | Recommended |
| MB-18 | Visual regression tests | DEFERRED | 5 | Yes |
| MB-19 | Agent quality dashboard | DEFERRED | Human only | Yes |
| MB-20 | E2E semantic assertions | DEFERRED | 2 | Recommended |

---

*Last updated: Stage 7 — Prioritized Maintenance Backlog (additive documentation only).*
*No existing application behavior was changed in creating this document.*
