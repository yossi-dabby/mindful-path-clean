# Technical Debt Register — Mindful Path CBT App

> **Stage 7 — Final Copilot Documentation Phase**
> This document identifies currently known or reasonably discoverable technical debt in the repository.
> It is grounded in the actual codebase and existing documentation.
> No runtime behavior was changed in creating this document.

---

## How to Use This Register

Each item below represents a known gap, risk, or deferred decision in the codebase.
Items are grouped by category and include:
- **Risk level** — 🟢 Low · 🟡 Medium-Low · 🟠 Medium · 🔴 High
- **Urgency** — Immediate / Short-term / Long-term / Deferred
- **Copilot suitable?** — Whether Copilot can safely tackle this without human escalation
- **Recommended lane** — Which task lane from `docs/copilot-task-lanes.md` applies

When acting on any item, check the recommended lane first.
Human approval is required for any item marked **Requires Approval: Yes**.

---

## 1. Retrieval / Indexing Maintenance

### TD-01 — Knowledge Index Evaluation Coverage

| Field | Value |
|---|---|
| **Short title** | Retrieval quality not continuously monitored |
| **Description** | `functions/goldenScenarios.ts` and `functions/evaluateKnowledgeIndex.ts` exist but there is no CI gate that runs retrieval evaluation on every PR. Retrieval quality may silently degrade after content changes. |
| **Affected paths** | `functions/goldenScenarios.ts`, `functions/evaluateKnowledgeIndex.ts`, `.github/workflows/` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — CI changes require review |
| **Copilot suitable** | Partially — Copilot can draft the workflow step; human must review and approve |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

### TD-02 — Backfill Script Not Idempotent by Documentation

| Field | Value |
|---|---|
| **Short title** | `backfillKnowledgeIndex.ts` idempotency undocumented |
| **Description** | The backfill script's behavior on re-runs is not documented. If it is not idempotent, duplicate entries in the knowledge index could affect retrieval quality. |
| **Affected paths** | `functions/backfillKnowledgeIndex.ts`, `docs/` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — any documentation about this function requires owner validation |
| **Copilot suitable** | No — this requires reading live Base44 behavior; documentation only after owner clarifies |
| **Recommended lane** | Lane 1 — Documentation (after owner confirms behavior) |

---

### TD-03 — No Alerting on Indexing Failure

| Field | Value |
|---|---|
| **Short title** | Silent failure mode in indexing pipeline |
| **Description** | If `indexContentRecord.ts` or `upsertKnowledgeIndex.ts` fail, there is no observable alert or notification beyond what Base44 logs. The app may serve stale or incomplete knowledge to agents without surfacing the failure. |
| **Affected paths** | `functions/indexContentRecord.ts`, `functions/upsertKnowledgeIndex.ts` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — adding alerting may require Base44 configuration |
| **Copilot suitable** | No — requires Base44 environment access |
| **Recommended lane** | Lane 4 — Review / Hardening (documentation of gap only) |

---

## 2. Test Coverage Gaps

### TD-04 — Safety Filter Functions Lack Unit Test Coverage

| Field | Value |
|---|---|
| **Short title** | `postLlmSafetyFilter.ts` and `sanitizeAgentOutput.ts` are not unit-tested in CI |
| **Description** | The safety-critical functions in `functions/` are exercised only by `functions/safetyGoldenScenarios.ts` and `functions/runSafetyTestSuite.ts`. There are no Vitest unit tests in `test/` targeting these functions. A regression in sanitization logic may not be caught before merge. |
| **Affected paths** | `functions/postLlmSafetyFilter.ts`, `functions/sanitizeAgentOutput.ts`, `functions/sanitizeConversation.ts`, `test/` |
| **Risk level** | 🔴 High |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — safety-critical path; tests must be reviewed before merge |
| **Copilot suitable** | Partially — Copilot can draft test stubs; human must verify they reflect live logic |
| **Recommended lane** | Lane 6 — Safety-Critical (two reviewers required) |

---

### TD-05 — E2E Tests Do Not Cover Agent Response Paths

| Field | Value |
|---|---|
| **Short title** | Playwright E2E tests do not assert on agent response quality |
| **Description** | The existing E2E tests in `tests/e2e/` cover navigation and UI flows. There are no E2E tests that assert on the semantic content or safety compliance of agent responses in the CBT Therapist or AI Companion flows. |
| **Affected paths** | `tests/e2e/`, `functions/safetyGoldenScenarios.ts` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Long-term |
| **Requires human approval** | Recommended — E2E tests touching agent behavior need human review |
| **Copilot suitable** | Partially — structural E2E tests (UI flow only) safe; semantic assertions require human review |
| **Recommended lane** | Lane 2 — Test / Regression |

---

### TD-06 — Android E2E Test Coverage Limited

| Field | Value |
|---|---|
| **Short title** | Android Playwright tests cover only a subset of flows |
| **Description** | `tests/android/` contains Playwright Android specs, but they may not cover all user flows available in the web tests under `tests/e2e/`. Android-specific scroll and interaction behavior is not fully regression-tested. |
| **Affected paths** | `tests/android/`, `playwright.android.config.ts` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Long-term |
| **Requires human approval** | No (additive tests only) |
| **Copilot suitable** | Yes — additive Android specs following existing patterns |
| **Recommended lane** | Lane 2 — Test / Regression |

---

### TD-07 — i18n Completeness Not Enforced in CI

| Field | Value |
|---|---|
| **Short title** | No CI gate enforcing all 7 language keys are present |
| **Description** | `test/utils/translations.test.js` checks translation coverage but this test may not run as a hard gate in CI for every PR. Missing keys in non-English languages silently fall back to English, which may not be acceptable for RTL (Hebrew) users. |
| **Affected paths** | `test/utils/translations.test.js`, `.github/workflows/`, `src/components/i18n/translations.jsx` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Short-term |
| **Requires human approval** | Recommended — CI workflow changes require review |
| **Copilot suitable** | Yes — adding test gate to CI workflow |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

## 3. Safety-Critical Review Burden

### TD-08 — Safety Filter Review Process Not Formalized

| Field | Value |
|---|---|
| **Short title** | No documented checklist for reviewing safety filter PRs |
| **Description** | When a PR touches `postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, or `sanitizeConversation.ts`, reviewers must currently rely on reading the full file. There is no formal pre-merge safety checklist for these paths. |
| **Affected paths** | `docs/`, `functions/postLlmSafetyFilter.ts`, `functions/sanitizeAgentOutput.ts`, `functions/sanitizeConversation.ts` |
| **Risk level** | 🔴 High |
| **Urgency** | Short-term |
| **Requires human approval** | Yes |
| **Copilot suitable** | Yes (docs only) — Copilot can draft a reviewer checklist document |
| **Recommended lane** | Lane 1 — Documentation |

---

### TD-09 — Crisis Detection Logic Not Continuously Tested

| Field | Value |
|---|---|
| **Short title** | `enhancedCrisisDetector.ts` not covered by automated regression |
| **Description** | The crisis detection function is safety-critical but its test coverage is not visible in the standard test infrastructure (`test/` or `npm test`). Changes to this function may go undetected. |
| **Affected paths** | `functions/enhancedCrisisDetector.ts`, `test/` |
| **Risk level** | 🔴 High |
| **Urgency** | Immediate |
| **Requires human approval** | Yes — two reviewers required for safety-critical path |
| **Copilot suitable** | Partially — Copilot can draft test stubs; human must validate |
| **Recommended lane** | Lane 6 — Safety-Critical |

---

## 4. Documentation Gaps

### TD-10 — Retrieval Pipeline Not Fully Documented End-to-End

| Field | Value |
|---|---|
| **Short title** | No single document traces content from creation to agent delivery |
| **Description** | The knowledge pipeline spans `buildContentDocument.ts` → `chunkContentDocument.ts` → `upsertKnowledgeIndex.ts` → `retrieveRelevantContent.ts` → agent wiring. No single document maps all these steps with data flow, failure modes, and monitoring expectations. |
| **Affected paths** | `docs/repository-architecture-map.md`, `functions/`, `docs/` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Long-term |
| **Requires human approval** | No — documentation only |
| **Copilot suitable** | Yes |
| **Recommended lane** | Lane 1 — Documentation |

---

### TD-11 — No Runbook for Data Retention Cleanup

| Field | Value |
|---|---|
| **Short title** | `retentionCleanup.ts` behavior not documented for operators |
| **Description** | `functions/retentionCleanup.ts` permanently deletes user data. There is no operator runbook describing what it deletes, when it runs, how to verify execution, and how to recover from errors. |
| **Affected paths** | `functions/retentionCleanup.ts`, `docs/` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — content must be confirmed by owner |
| **Copilot suitable** | Partially — Copilot can draft a runbook skeleton; owner must fill in live behavior |
| **Recommended lane** | Lane 1 — Documentation |

---

### TD-12 — No Architecture Decision Record (ADR) for Scroll Container Pattern

| Field | Value |
|---|---|
| **Short title** | `overflow-x-clip` decision not captured in an ADR |
| **Description** | The `overflow-x-clip` vs `overflow-x-hidden` decision is critical for iOS/WKWebView compatibility but is only explained inline in `AppContent.jsx` and briefly in `docs/mobile-overflow-audit.md`. There is no ADR capturing the problem, alternatives considered, and final decision. |
| **Affected paths** | `docs/mobile-overflow-audit.md`, `src/components/layout/AppContent.jsx` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Long-term |
| **Requires human approval** | No — documentation only |
| **Copilot suitable** | Yes |
| **Recommended lane** | Lane 1 — Documentation |

---

## 5. CI / Validation Gaps

### TD-13 — No Build Health Badge in README

| Field | Value |
|---|---|
| **Short title** | CI status not surfaced in `README.md` |
| **Description** | The `README.md` does not include CI status badges for the Playwright or Webpack CI workflows. Contributors cannot quickly assess whether the repo is in a healthy state. |
| **Affected paths** | `README.md`, `.github/workflows/` |
| **Risk level** | 🟢 Low |
| **Urgency** | Long-term |
| **Requires human approval** | No |
| **Copilot suitable** | Yes |
| **Recommended lane** | Lane 1 — Documentation |

---

### TD-14 — Type Checking Not in CI Workflow

| Field | Value |
|---|---|
| **Short title** | `npm run typecheck` not verified in CI |
| **Description** | `jsconfig.json` exists and `npm run typecheck` is documented as a pre-merge step, but it is unclear whether type checking runs in CI on every PR. Type errors may be introduced without being caught automatically. |
| **Affected paths** | `.github/workflows/`, `jsconfig.json` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Short-term |
| **Requires human approval** | Recommended |
| **Copilot suitable** | Yes — additive CI step |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

## 6. Repo Workflow / Process Debt

### TD-15 — No Branch Protection Rules Documented

| Field | Value |
|---|---|
| **Short title** | Branch protection configuration not documented |
| **Description** | It is unclear from the repository documentation whether main branch protection rules are in place (e.g., required CI passing, required reviewer count, no force push). This is important for a production-sensitive app. |
| **Affected paths** | `docs/copilot-pr-workflow.md`, GitHub repository settings |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — requires GitHub admin access |
| **Copilot suitable** | Partially — can document expected settings; must be applied by a human admin |
| **Recommended lane** | Lane 1 — Documentation |

---

### TD-16 — PR Template Not Enforced Automatically

| Field | Value |
|---|---|
| **Short title** | PR template exists but completion is not enforced |
| **Description** | `.github/pull_request_template.md` provides a structured PR format, but there is no automated check (e.g., a GitHub Action or required fields) that enforces it. PRs may be merged with incomplete descriptions. |
| **Affected paths** | `.github/pull_request_template.md`, `.github/workflows/` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Long-term |
| **Requires human approval** | Recommended |
| **Copilot suitable** | Yes — additive CI lint step |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

## 7. Observability / Evaluation Debt

### TD-17 — No Agent Response Quality Dashboard

| Field | Value |
|---|---|
| **Short title** | Agent response quality is not continuously tracked |
| **Description** | `functions/evaluateKnowledgeIndex.ts` and `functions/logProtocolMetrics.ts` exist, but there is no dashboard or persistent record of agent response quality over time. It is not possible to observe whether agent quality is trending up or down. |
| **Affected paths** | `functions/evaluateKnowledgeIndex.ts`, `functions/logProtocolMetrics.ts` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Long-term |
| **Requires human approval** | Yes — requires Base44 observability configuration |
| **Copilot suitable** | No — requires backend/Base44 environment access |
| **Recommended lane** | Lane 4 — Review / Hardening (documentation of gap only) |

---

### TD-18 — Red-Team and Compliance Reports Not Scheduled

| Field | Value |
|---|---|
| **Short title** | `redTeamingTests.ts` and `generateComplianceReport.ts` not on a schedule |
| **Description** | Files like `functions/redTeamingTests.ts` and `functions/generateComplianceReport.ts` exist but there is no documented schedule or CI integration for running them. Red-team and compliance checks may only be run on demand. |
| **Affected paths** | `functions/redTeamingTests.ts`, `functions/generateComplianceReport.ts` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — scheduling requires Base44 or GitHub Actions configuration |
| **Copilot suitable** | Partially — CI workflow step drafting is within scope; scheduling in Base44 requires owner |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

## 8. UI Debt (Requires Explicit Approval)

### TD-19 — Scroll Container Audit Not Automated

| Field | Value |
|---|---|
| **Short title** | No automated check that `overflow-x-hidden` is never used on page wrappers |
| **Description** | `docs/mobile-overflow-audit.md` documents the `overflow-x-clip` rule, but there is no ESLint rule or CI check that prevents `overflow-x-hidden` from being accidentally introduced in `src/pages/` or `src/components/`. |
| **Affected paths** | `eslint.config.js`, `src/pages/`, `src/components/` |
| **Risk level** | 🟡 Medium-Low |
| **Urgency** | Long-term |
| **Requires human approval** | Recommended |
| **Copilot suitable** | Yes — ESLint custom rule or grep-based CI step |
| **Recommended lane** | Lane 4 — Review / Hardening |

---

### TD-20 — No Visual Regression Tests for Layout Changes

| Field | Value |
|---|---|
| **Short title** | Layout and scroll changes are only manually verified |
| **Description** | Changes to `AppContent.jsx`, `Layout.jsx`, or page-level components are validated by human visual review only. There are no visual snapshot tests or automated layout regression tests. |
| **Affected paths** | `src/components/layout/`, `src/Layout.jsx`, `tests/e2e/` |
| **Risk level** | 🟠 Medium |
| **Urgency** | Long-term |
| **Requires human approval** | Yes — UI lane |
| **Copilot suitable** | Partially — Playwright screenshot comparison scaffolding can be drafted |
| **Recommended lane** | Lane 5 — UI (with explicit approval) |

---

## 9. Security / Privacy Review Debt

### TD-21 — No Documented Data Flow Audit for Private Entities

| Field | Value |
|---|---|
| **Short title** | Private user entity data flow not audited end-to-end |
| **Description** | The private entity prohibition is documented in policy (`docs/ai-entity-classification.md`, `docs/ai-agent-access-policy.md`). However, there is no documented audit trail confirming that `ThoughtJournal`, `Conversation`, `CaseFormulation`, `MoodEntry`, `CompanionMemory`, and `UserDeletedConversations` are not retrievable via any current code path. |
| **Affected paths** | `src/api/agentWiring.js`, `src/api/activeAgentWiring.js`, `functions/retrieveRelevantContent.ts`, `docs/` |
| **Risk level** | 🔴 High |
| **Urgency** | Short-term |
| **Requires human approval** | Yes — requires owner review of live wiring |
| **Copilot suitable** | Partially — Copilot can document the audit checklist; human must verify against live Base44 config |
| **Recommended lane** | Lane 1 — Documentation (audit checklist) + human verification |

---

### TD-22 — Stripe Webhook Handler Not Audited

| Field | Value |
|---|---|
| **Short title** | `stripeWebhook.ts` signature validation not documented |
| **Description** | `functions/stripeWebhook.ts` handles payment webhooks. It is not clear from repository documentation whether Stripe webhook signature validation is implemented and tested. Absent validation, the endpoint could be vulnerable to spoofed webhook events. |
| **Affected paths** | `functions/stripeWebhook.ts` |
| **Risk level** | 🔴 High |
| **Urgency** | Immediate |
| **Requires human approval** | Yes — security-sensitive |
| **Copilot suitable** | No — requires owner to verify live Stripe configuration; Copilot must not modify payment code |
| **Recommended lane** | Human review only — not a Copilot task |

---

## Summary Table

| ID | Title | Risk | Urgency | Copilot Suitable | Lane |
|---|---|---|---|---|---|
| TD-01 | Retrieval evaluation not in CI | 🟠 Medium | Short-term | Partially | 4 |
| TD-02 | Backfill idempotency undocumented | 🟠 Medium | Short-term | No | 1 |
| TD-03 | No alerting on indexing failure | 🟠 Medium | Short-term | No | 4 |
| TD-04 | Safety filters lack unit tests | 🔴 High | Short-term | Partially | 6 |
| TD-05 | E2E tests don't cover agent responses | 🟠 Medium | Long-term | Partially | 2 |
| TD-06 | Android E2E coverage limited | 🟡 Medium-Low | Long-term | Yes | 2 |
| TD-07 | i18n completeness not in CI | 🟡 Medium-Low | Short-term | Yes | 4 |
| TD-08 | Safety filter review not formalized | 🔴 High | Short-term | Yes (docs only) | 1 |
| TD-09 | Crisis detector not regression-tested | 🔴 High | Immediate | Partially | 6 |
| TD-10 | Retrieval pipeline not documented E2E | 🟡 Medium-Low | Long-term | Yes | 1 |
| TD-11 | No runbook for retention cleanup | 🟠 Medium | Short-term | Partially | 1 |
| TD-12 | No ADR for scroll container pattern | 🟡 Medium-Low | Long-term | Yes | 1 |
| TD-13 | No CI badge in README | 🟢 Low | Long-term | Yes | 1 |
| TD-14 | Typecheck not in CI | 🟡 Medium-Low | Short-term | Yes | 4 |
| TD-15 | Branch protection not documented | 🟠 Medium | Short-term | Partially | 1 |
| TD-16 | PR template not enforced | 🟡 Medium-Low | Long-term | Yes | 4 |
| TD-17 | No agent quality dashboard | 🟠 Medium | Long-term | No | 4 |
| TD-18 | Red-team tests not scheduled | 🟠 Medium | Short-term | Partially | 4 |
| TD-19 | No automated scroll rule check | 🟡 Medium-Low | Long-term | Yes | 4 |
| TD-20 | No visual regression tests | 🟠 Medium | Long-term | Partially | 5 |
| TD-21 | Private entity data flow not audited | 🔴 High | Short-term | Partially | 1 |
| TD-22 | Stripe webhook not audited | 🔴 High | Immediate | No | Human only |

---

*Last updated: Stage 7 — Technical Debt Register (additive documentation only).*
*No existing application behavior was changed in creating this document.*
