# GitHub Copilot Instructions — Mindful Path CBT App

> **This file provides repository-wide guidance for GitHub Copilot.**
> Read it fully before suggesting or generating any code for this repository.

---

## 0. Branch Policy (Main Only)

- **All PRs target `main`.** There is no intermediate branch.
- **The Git `staging` branch has been retired.** Do not create, recreate, target, or require it.
- **Changes reach `main` through reviewed PRs** with required CI validation (lint, unit tests, build, E2E) and human review.
- **Follow-up corrections must update the same branch and PR** unless the owner explicitly requests a new PR.

---

## 1. What This App Is

**Mindful Path** is a production-sensitive cognitive behavioral therapy (CBT) application. It serves real users with mental health needs. The app is partially live and operationally active.

The backend runtime is powered by **Base44**. The frontend is a **React + Vite** single-page application. AI agents (CBT Therapist and AI Companion) are wired to Base44 entities and knowledge retrieval pipelines.

Errors in this codebase can affect vulnerable users. Work with exceptional care.

---

## 2. Core Safety Principles

### 2.1 All Changes Must Be Additive and Backward-Compatible

- Do **not** silently remove fields, rename entities, or restructure schemas.
- Do **not** make breaking changes to existing APIs, routes, or component interfaces.
- Unless explicitly requested: assume all existing behavior is correct and must be preserved.
- When in doubt, choose the safest additive option.

### 2.2 No Secret Exposure

- Do **not** hardcode API keys, tokens, secrets, or credentials anywhere in the codebase.
- Do **not** log sensitive values to the console.
- Do **not** expose secrets through environment variables that would be bundled into client-side code.
- All secrets must remain in the Base44 runtime environment or secure `.env` files that are gitignored.

### 2.3 No Silent Schema Changes

- Do **not** add, remove, or rename fields on Base44 entities without explicit approval.
- Do **not** change entity relationships without explicit approval.
- Treat `src/api/entities/` as read-only unless explicitly instructed otherwise.

---

## 3. What Copilot May NOT Change Without Explicit Approval

| Area | Rule |
|---|---|
| **Base44 entities** | No field changes, no schema mutations, no relationship changes |
| **Agent instructions / prompts** | No changes to CBT Therapist or AI Companion prompts or tool configs |
| **Retrieval wiring** | No expansion of retrieval scope beyond approved shared content entities |
| **Indexing behavior** | No changes to `functions/backfillKnowledgeIndex.ts` or live indexing logic |
| **Backend functions** | No logic changes to `functions/` unless explicitly requested |
| **Automations** | No changes to Base44 automations or scheduled jobs |
| **Secrets / env values** | No changes to `.env`, secrets, or environment configuration |
| **UI / routes** | No changes to pages, routes, layouts, navigation, or styling unless explicitly requested |
| **`ai_companion` behavior** | Treat as frozen unless explicitly requested to change |
| **Therapist role boundaries** | The CBT Therapist must remain a structured clinical agent; do not expand its emotional support role |
| **Private user entity indexing** | Never index or retrieve private user entities (ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory) in shared retrieval pipelines |
| **Agent tool expansion** | Do not add tools to any agent unless explicitly requested |

---

## 4. What Copilot May Change Safely

- Adding new utility functions that are pure and have no side effects
- Adding unit tests for existing logic
- Fixing bugs in frontend UI components when explicitly requested
- Adding i18n translation keys (must be added in **all 7 languages**: en, he, es, fr, de, it, pt)
- Adding new pages or components when explicitly requested, following existing conventions
- Improving documentation in `docs/`
- Updating `README.md` and other markdown files
- Adding Playwright or Vitest tests that exercise approved behavior

---

## 5. Repository Structure

```
mindful-path/
├── .github/
│   ├── copilot-instructions.md     ← THIS FILE
│   ├── pull_request_template.md
│   └── workflows/
│       ├── playwright.yml          ← E2E CI workflow
│       └── webpack.yml             ← Build CI workflow
├── docs/
│   ├── copilot-safety-rules.md     ← Safety summary for Copilot
│   ├── ai-agent-access-policy.md  ← Agent entity access policy (READ ONLY)
│   ├── ai-entity-classification.md
│   ├── ai-agent-content-mapping.md
│   ├── ai-agent-decision-matrix.md
│   ├── ai-agent-enforcement-spec.md
│   ├── ai-agent-hybrid-model.md
│   ├── ai-agent-policy-validator-checks.md
│   └── data-model.md
├── functions/                      ← Base44 backend functions (PRODUCTION-CRITICAL)
│   ├── backfillKnowledgeIndex.ts   ← Knowledge index backfill (DO NOT MODIFY without approval)
│   ├── checkProactiveNudges.ts     ← Proactive nudge logic
│   ├── postLlmSafetyFilter.ts      ← LLM output safety filter (SAFETY-CRITICAL)
│   ├── retentionCleanup.ts         ← Data retention cleanup
│   ├── sanitizeAgentOutput.ts      ← Agent output sanitization (SAFETY-CRITICAL)
│   └── sanitizeConversation.ts     ← Conversation sanitization (SAFETY-CRITICAL)
├── src/
│   ├── api/
│   │   ├── entities/               ← Base44 entity definitions (DO NOT MODIFY schemas)
│   │   ├── agentWiring.js          ← Agent wiring (DO NOT MODIFY without approval)
│   │   ├── activeAgentWiring.js    ← Active agent wiring (DO NOT MODIFY without approval)
│   │   └── base44Client.js         ← Base44 SDK client
│   ├── components/
│   │   ├── i18n/translations.jsx   ← All UI strings (7 languages; update all when adding keys)
│   │   └── layout/AppContent.jsx   ← Main scroll container (overflow-x-clip pattern)
│   ├── pages/                      ← Route-level page components
│   ├── hooks/                      ← React hooks
│   ├── lib/                        ← Utility libraries
│   └── utils/                      ← Utility functions
└── tests/
    ├── e2e/                        ← Playwright end-to-end tests
    └── android/                    ← Android-specific Playwright tests
```

---

## 6. Build, Test, and Validation Commands

```bash
# Development server
npm run dev

# Production build
npm run build          # or: ./node_modules/.bin/vite build

# Unit tests (Vitest) — all 44+ tests must pass
npm test

# Lint (ESLint)
npm run lint

# Type check
npm run typecheck

# E2E tests (Playwright)
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Before Merging Any PR:
1. `npm run lint` — must produce zero errors
2. `npm test` — all unit tests must pass
3. `npm run build` — build must succeed without warnings
4. `npm run test:e2e` — E2E tests must pass (requires running app)
5. For backend changes: describe expected behavior changes explicitly in the PR

---

## 7. AI Agent Boundaries

The app has **two AI agents**. Their boundaries are fixed and must not be crossed:

### CBT Therapist
- Structured, clinically-oriented agent
- Has access to: ThoughtJournal, Goal, CoachingSession, SessionSummary, Exercise, Resource, AudioContent, Journey
- Restricted access to: MoodEntry (contextual only), CompanionMemory (read-only), CaseFormulation (read-only), Conversation (minimum window)
- Prohibited from: Subscription, UserDeletedConversations, AppNotification, MindGameActivity

### AI Companion
- Supportive, emotionally-present agent
- Has access to: CompanionMemory, MoodEntry, Exercise, Resource, AudioContent, Journey
- Restricted access to: Goal (encouragement only), SessionSummary (continuity only), Conversation (minimum window)
- Prohibited from: ThoughtJournal, CoachingSession, CaseFormulation, Subscription, UserDeletedConversations, AppNotification, MindGameActivity

> See `docs/ai-agent-access-policy.md` for the full policy table.
> **Never expand retrieval scope beyond the approved shared content entities without explicit approval.**

---

## 8. Stage 1–7 Base44 Work Is the Source of Truth

The following Base44 stages have already been implemented and are production-active:

1. Structured content entities
2. Backend knowledge indexing/retrieval
3. Live indexing
4. Live retrieval
5. Retrieval-enabled agents
6. Production hardening

Treat all existing Base44 entity schemas, wiring, retrieval behavior, and agent configurations as the established source of truth. Do not reverse-engineer, rewrite, or second-guess them. Work with and around them, not against them.

---

## 9. Private User Data Rules

The following are private user entities and must **never** be indexed, retrieved, or exposed in shared retrieval pipelines:

- `ThoughtJournal`
- `Conversation`
- `CaseFormulation`
- `MoodEntry`
- `CompanionMemory`
- `UserDeletedConversations`

If a proposed change would cause any of these to be indexed or retrievable at a shared or cross-user level, reject it outright.

---

## 10. PR and Code Review Guidance

- **Prefer small PRs.** One logical change per PR. Avoid bundling unrelated changes.
- **Prefer reviewable diffs.** Make diffs easy to read and understand. Avoid reformatting unrelated code.
- **Always document assumptions.** If you make an assumption about behavior or intent, document it in the PR description.
- **Always propose tests for backend changes.** If you change a function in `functions/`, propose or add corresponding tests.
- **Safety-critical files require extra scrutiny:**
  - `functions/postLlmSafetyFilter.ts`
  - `functions/sanitizeAgentOutput.ts`
  - `functions/sanitizeConversation.ts`
  - `src/api/agentWiring.js`
  - `src/api/activeAgentWiring.js`
- **Always check the PR template** at `.github/pull_request_template.md` and fill it out completely.

---

## 11. Scroll Container and Viewport Conventions

The app uses specific scroll and viewport patterns that must be preserved:

- `#app-scroll-container` uses `overflow-x-clip` (NOT `overflow-x-hidden`) + `overflow-y-auto` + `height:100dvh`
- Full-screen wizard/chat pages use `fixed inset-0 flex flex-col` with `height:100dvh; overflow:hidden`
- Use `min-h-dvh` (NOT `min-h-screen`) for page root wrappers
- Do **not** add `overflow-x-hidden` to page wrappers (creates a BFC that breaks iOS scroll)
- Do **not** add nested scroll containers inside `#app-scroll-container`

---

## 12. i18n Conventions

- All UI strings live in `src/components/i18n/translations.jsx`
- Supported languages: **en, he, es, fr, de, it, pt** (7 total)
- When adding any new string, add the key in **all 7 language sections**
- i18n falls back to English for missing keys, but missing keys in non-English languages should not be left empty

---

## 13. What to Do If Uncertain

If a proposed change:
- Could affect retrieval behavior → **stop and ask for explicit approval**
- Could expose private user data → **stop and reject it**
- Could change agent behavior → **stop and ask for explicit approval**
- Could break existing routes or navigation → **stop and ask for explicit approval**
- Changes a schema or entity → **stop and ask for explicit approval**

When in doubt, choose the **safest additive option** and document your reasoning in the PR.
