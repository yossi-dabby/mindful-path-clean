# Copilot Ongoing Operating Model — Mindful Path CBT App

> **Stage 7 — Final Copilot Documentation Phase**
> This document defines how future GitHub Copilot work should proceed after the 7-stage setup is complete.
> The 7-stage Copilot Git setup is complete.
> No runtime behavior was changed in creating this document.

---

## Part A — How the 7-Stage Setup Is Complete

The following Copilot infrastructure has been established across Stages 1–7:

| Stage | What Was Delivered |
|---|---|
| Stage 1 | Structured content entities defined (Base44 runtime) |
| Stage 2 | Backend knowledge indexing implemented |
| Stage 3 | Live indexing deployed |
| Stage 4 | Live retrieval deployed |
| Stage 5 | Retrieval-enabled agents wired |
| Stage 6 | Production hardening, safety filters, PR guardrails, task lanes |
| Stage 7 | Technical debt register, maintenance backlog, ongoing operating model |

The repository now has:
- ✅ Master Copilot instructions at `.github/copilot-instructions.md`
- ✅ Repository architecture map at `docs/repository-architecture-map.md`
- ✅ Safety rules at `docs/copilot-safety-rules.md`
- ✅ Agent access policy at `docs/ai-agent-access-policy.md`
- ✅ Task lane definitions at `docs/copilot-task-lanes.md`
- ✅ PR workflow at `docs/copilot-pr-workflow.md`
- ✅ Task invocation guide at `docs/copilot-task-invocation-guide.md`
- ✅ Technical debt register at `docs/technical-debt-register.md`
- ✅ Maintenance backlog at `docs/copilot-maintenance-backlog.md`
- ✅ This ongoing operating model

**From this point forward, all future work proceeds through small, PR-based increments using the operating model described below.**

---

## Part B — How Future Work Should Start

Every new Copilot task must begin with the same five-step pre-flight check:

### Step 1 — Read the Source-of-Truth Files

Before opening any PR, read:
1. `.github/copilot-instructions.md` — master instructions
2. `docs/copilot-safety-rules.md` — what may and may not be changed
3. `docs/copilot-task-lanes.md` — which lane applies to the task
4. `docs/copilot-task-invocation-guide.md` — how to invoke the right lane
5. `docs/repository-architecture-map.md` — what exists and where

**Do not skip step 1.** These files are the source of truth.

### Step 2 — Classify the Task into a Single Lane

| If the task involves... | Use lane... |
|---|---|
| Adding or updating docs only | Lane 1 — Documentation |
| Adding tests, fixtures, or mocks only | Lane 2 — Test / Regression |
| Adding pure utility functions or i18n keys | Lane 3 — Frontend Utility |
| Adding CI steps, logging, or hardening | Lane 4 — Review / Hardening |
| Fixing a UI bug or adding a new component | Lane 5 — UI (approval required) |
| Modifying safety filters or agent wiring | Lane 6 — Safety-Critical (two reviewers) |

**If the task spans more than one lane, split it into multiple PRs.**

### Step 3 — Confirm Approval Requirements

| Lane | Approval Required |
|---|---|
| 1 — Documentation | No |
| 2 — Test / Regression | No (tests only) |
| 3 — Frontend Utility | No |
| 4 — Review / Hardening | Recommended |
| 5 — UI | **Yes — explicit approval required before starting** |
| 6 — Safety-Critical | **Yes — mandatory, two reviewers** |

**Never start Lane 5 or Lane 6 work without explicit written approval from the repository owner.**

### Step 4 — Open a Small, Focused PR

- One logical change per PR.
- Small PRs only — no bundling of unrelated changes.
- Fill out the PR template at `.github/pull_request_template.md` completely.
- Document all assumptions in the PR description.
- Reference the relevant backlog item (`MB-XX`) or debt item (`TD-XX`) if applicable.

### Step 5 — Validate Before Merging

Run all required checks for the lane before requesting merge:

```bash
npm run lint          # Zero errors required (all lanes with code changes)
npm test              # All 44+ tests must pass (all lanes with code changes)
npm run build         # Build must succeed (all lanes with code changes)
npm run test:e2e      # E2E tests must pass (Lane 2 E2E, Lane 5)
npm run typecheck     # No type errors (Lane 3, Lane 5)
```

---

## Part C — Source-of-Truth Documents

These files must not be contradicted. They govern all Copilot work:

| Document | Governs |
|---|---|
| `.github/copilot-instructions.md` | All Copilot behavior in this repo |
| `docs/copilot-safety-rules.md` | What may and may not be changed |
| `docs/copilot-task-lanes.md` | Lane definitions, boundaries, forbidden paths |
| `docs/ai-agent-access-policy.md` | Which entities each agent may access |
| `docs/ai-agent-enforcement-spec.md` | Detailed agent wiring enforcement rules |
| `docs/ai-entity-classification.md` | Entity classification (Private / Shared / Restricted) |
| `docs/repository-architecture-map.md` | Architecture snapshot and safe edit zones |
| `docs/copilot-pr-workflow.md` | PR process and review requirements |
| `src/api/entities/index.js` | Live Base44 entity schemas — read-only |
| `src/api/agentWiring.js` | Live agent wiring — frozen |
| `src/api/activeAgentWiring.js` | Live agent wiring — frozen |

---

## Part D — When to Stay Docs-Only

Choose docs-only work (Lane 1) when:
- The task is to explain, clarify, or document something that already exists.
- The task involves a gap in understanding, not a gap in code.
- The proposed code change has not yet received explicit human approval.
- The change could affect runtime behavior if implemented incorrectly.
- The task involves a maintenance backlog item that requires owner confirmation before implementation.

When in doubt, write the documentation first and implement later, after the documentation PR is reviewed and approved.

---

## Part E — When to Stay Tests-Only

Choose test-only work (Lane 2) when:
- A code path is documented but lacks test coverage.
- A golden scenario or safety scenario needs to be added to `functions/goldenScenarios.ts` or `functions/safetyGoldenScenarios.ts`.
- An E2E flow is approved and stable but not yet covered by Playwright.
- A Vitest unit test is needed for an existing approved utility function.

**Never weaken, remove, or skip existing tests.** Adding tests is always additive.

---

## Part F — When to Escalate to Human Review

Stop and request explicit human approval immediately when:

| Trigger | Why |
|---|---|
| Any change to `src/api/entities/` | Schema changes break the live Base44 runtime |
| Any change to `agentWiring.js` or `activeAgentWiring.js` | Changes alter live AI agent behavior |
| Any change to `functions/postLlmSafetyFilter.ts` | Safety-critical — weakening harms users |
| Any change to `functions/sanitizeAgentOutput.ts` | Safety-critical — weakening harms users |
| Any change to `functions/sanitizeConversation.ts` | Safety-critical — weakening harms users |
| Any change to `functions/enhancedCrisisDetector.ts` | Safety-critical — crisis detection |
| Any change to `functions/backfillKnowledgeIndex.ts` | Live indexing — changes corrupt knowledge base |
| Any change to `functions/retentionCleanup.ts` | Destructive — permanently deletes user data |
| Any change to `functions/stripeWebhook.ts` | Payment handling — security-critical |
| Any change that expands retrieval scope | Private user data must not be retrievable cross-user |
| Any change to secrets or `.env` | Must never be exposed or changed via Copilot |
| Any task that spans more than one lane | Must be split or escalated |
| Any uncertainty about whether a change is safe | If in doubt, stop |

**The safest path is always to document the question, wait for explicit approval, and then proceed.**

---

## Part G — Paths That Are Never Casual-Edit Zones

The following paths must be treated as read-only unless there is explicit written approval from the repository owner:

```
src/api/entities/           — Live entity schemas
src/api/agentWiring.js      — Live agent wiring
src/api/activeAgentWiring.js — Live agent wiring
functions/postLlmSafetyFilter.ts
functions/sanitizeAgentOutput.ts
functions/sanitizeConversation.ts
functions/enhancedCrisisDetector.ts
functions/backfillKnowledgeIndex.ts
functions/retentionCleanup.ts
functions/stripeWebhook.ts
src/components/layout/AppContent.jsx  — Scroll container (see overflow-x-clip rule)
src/Layout.jsx               — Layout shell
src/App.jsx                  — Root router and auth loading
.env                         — Secrets
```

---

## Part H — How to Keep PRs Small

**Target: One logical change per PR.**

| Instead of... | Do this... |
|---|---|
| Fixing a bug + updating tests + updating docs | Three separate PRs |
| Adding a new feature + adding i18n keys + updating README | Three separate PRs |
| Hardening CI + adding a new test + documenting the test | Two or three separate PRs |
| Touching two different safety-critical functions | Two separate PRs |

**Large PRs are harder to review and more likely to introduce undetected regressions.**

When a proposed change is large:
1. Break it into the smallest independent units.
2. Sequence them so each can be reviewed and merged independently.
3. Document the sequencing in the first PR's description.

---

## Part I — How to Choose the Right Lane (Quick Reference)

```
Is it docs only?                    → Lane 1 — Documentation
Is it tests only?                   → Lane 2 — Test / Regression
Is it pure utilities or i18n?       → Lane 3 — Frontend Utility
Is it CI / logging / hardening?     → Lane 4 — Review / Hardening
Is it UI (approved)?                → Lane 5 — UI (approval required)
Is it safety-critical (approved)?   → Lane 6 — Safety-Critical (2 reviewers)
Does it span multiple lanes?        → Split into multiple PRs
Is it Base44 entities/wiring/secrets? → Stop — escalate to human
Is it a payment or retention function? → Stop — escalate to human
```

---

## Part J — Validation Checklist Before Any PR Merge

Copy this checklist into every PR description:

```markdown
## Pre-Merge Validation

- [ ] Identified the correct task lane from `docs/copilot-task-lanes.md`
- [ ] Confirmed approval requirements for the lane are met
- [ ] `npm run lint` — zero errors
- [ ] `npm test` — all tests pass (if code changed)
- [ ] `npm run build` — no errors (if code changed)
- [ ] `npm run test:e2e` — passes (if E2E or UI changed)
- [ ] No existing tests were removed, skipped, or weakened
- [ ] No private user entities are newly accessible
- [ ] No Base44 entity schemas were changed
- [ ] No agent wiring was changed
- [ ] No secrets were changed or exposed
- [ ] PR description documents all assumptions
- [ ] Change is additive and backward-compatible
```

---

## Part K — How to Continue From Here

**The 7-stage Copilot Git setup is complete.**

Going forward:

1. **Future work proceeds through small PRs only.** No large multi-lane PRs.
2. **The task lanes, validation workflow, and PR guardrails are the operating model.** Use them.
3. **The technical debt register and maintenance backlog are the work queue.** Start with MUST FIX items.
4. **Any future runtime changes must go through the appropriate approval lane.** No exceptions.
5. **Base44 runtime is the source of truth for all entity schemas, agent wiring, and retrieval behavior.** Do not attempt to reverse-engineer or rewrite it.
6. **When uncertain, choose the safest additive option and document the uncertainty in the PR.**
7. **Do not create a Stage 8.** The 7-stage setup is complete. Future work is incremental PR-based development.

### Recommended Order of Next Work

Based on the maintenance backlog:

1. **Immediate** — Address MB-01 (Stripe webhook audit) and MB-02 (crisis detector tests) with human ownership.
2. **Short-term** — Work through MB-03 through MB-05 (privacy audit and safety filter tests).
3. **Medium-term** — Address MB-06 through MB-12 (observability, CI improvements, documentation).
4. **Long-term** — Schedule MB-13 through MB-17 in small, independent PRs.
5. **Deferred** — MB-18 through MB-20 require explicit re-prioritization by the owner.

---

*Last updated: Stage 7 — Ongoing Operating Model (additive documentation only).*
*No existing application behavior was changed in creating this document.*
*The 7-stage Copilot Git setup is complete.*
