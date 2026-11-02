# Copilot Safety Rules — Mindful Path CBT App

> **Internal reference for contributors and Copilot-assisted PRs.**
> This document summarizes what GitHub Copilot may and may not change in this repository.
> See `.github/copilot-instructions.md` for the full guidance set.

---

## What Copilot May Change Safely

| Area | Notes |
|---|---|
| Pure utility functions | No side effects, no entity access |
| Unit tests (Vitest) | For existing approved logic |
| E2E tests (Playwright) | For approved user flows |
| Documentation in `docs/` | Additive only; no removal of existing policy docs |
| `README.md` and markdown files | Additive updates only |
| New UI components | Only when explicitly requested; must follow existing conventions |
| i18n keys in `translations.jsx` | Must be added in **all 7 languages** |
| New pages | Only when explicitly requested; must not break existing routes |
| Bug fixes in frontend components | Only when explicitly requested |

---

## What Copilot Must NOT Change Without Explicit Approval

| Area | Reason |
|---|---|
| **Base44 entity schemas** (`src/api/entities/`) | Schema changes break the live runtime |
| **Agent wiring** (`src/api/agentWiring.js`, `activeAgentWiring.js`) | Wiring changes alter live AI behavior |
| **Agent prompts or tool configs** | Changes alter clinical or companion agent behavior |
| **Retrieval scope** | Must not index or retrieve private user entities |
| **`functions/backfillKnowledgeIndex.ts`** | Live indexing — breaks knowledge base if changed |
| **`functions/postLlmSafetyFilter.ts`** | Safety-critical — must not be weakened |
| **`functions/sanitizeAgentOutput.ts`** | Safety-critical — must not be weakened |
| **`functions/sanitizeConversation.ts`** | Safety-critical — must not be weakened |
| **Base44 automations** | Automated jobs are live and production-active |
| **Secrets / `.env` values** | Must never be exposed or changed |
| **Existing routes / navigation** | Route changes break existing user flows |
| **Existing layouts and styling** | UI consistency must be preserved |
| **`ai_companion` behavior** | Frozen unless explicitly requested |
| **Therapist role boundaries** | Clinical agent must remain clinically bounded |

---

## Private User Entities — Never Index or Retrieve Across Users

The following entities are private to individual users and must **never** appear in shared retrieval pipelines:

- `ThoughtJournal`
- `Conversation`
- `CaseFormulation`
- `MoodEntry`
- `CompanionMemory`
- `UserDeletedConversations`

---

## How to Work in Small PRs

1. **One logical change per PR.** If you find yourself touching unrelated files, split into multiple PRs.
2. **Describe the change clearly.** Use the PR template at `.github/pull_request_template.md`.
3. **Document all assumptions.** If you assumed something about how a function or entity works, write it down.
4. **Keep diffs reviewable.** Do not reformat unrelated code in the same PR.
5. **Reference the issue or task** that motivated the change.

---

## What Must Be Tested Before Merge

| Check | Command | Must Pass |
|---|---|---|
| Lint | `npm run lint` | Zero errors |
| Unit tests | `npm test` | All tests pass (44+ tests) |
| Build | `npm run build` | No errors or warnings |
| E2E tests | `npm run test:e2e` | All tests pass |
| Type check | `npm run typecheck` | No errors |

For any change to `functions/`:
- Describe the expected behavior change in the PR
- Propose or add corresponding unit or integration tests
- Have a second reviewer check safety-critical files
- For safety-filter files specifically, complete the full checklist at `docs/safety-filter-review-checklist.md`

---

## Stage 1–7 Base44 Implementation — Already Established

The following Base44 implementation stages are complete and production-active. Treat them as the source of truth:

| Stage | What Was Done |
|---|---|
| Stage 1 | Structured content entities defined |
| Stage 2 | Backend knowledge indexing implemented |
| Stage 3 | Live indexing deployed |
| Stage 4 | Live retrieval deployed |
| Stage 5 | Retrieval-enabled agents wired |
| Stage 6 | Production hardening applied |
| Stage 7 | (Active operational state) |

Do not attempt to re-implement, re-wire, or redesign any of these stages.

---

## If You Are Unsure

- **Stop. Do not proceed.**
- Document what you are uncertain about in the PR description or as a comment.
- Request explicit approval from the repository owner before making the change.
- Choose the safest additive option if you must proceed before getting approval.

---

> For full details, see `.github/copilot-instructions.md`.
