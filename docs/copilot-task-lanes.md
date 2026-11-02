# Copilot Task Lanes — Mindful Path CBT App

> **Stage 6 — Safe Task Lane Definitions**
> This document formalizes the safe Copilot work lanes for this repository.
> Each lane has explicit boundaries, forbidden paths, required validation, and approval rules.
> See `docs/copilot-task-invocation-guide.md` for how to invoke each lane in practice.

---

## Overview

All future Copilot work in this repository must be routed to one of the lanes defined here.
If a proposed task does not fit cleanly into a single lane, it must be escalated to human review before proceeding.

| Lane | Name | Risk | Approval Required |
|---|---|---|---|
| 1 | Documentation Lane | 🟢 Low | No |
| 2 | Test / Regression Lane | 🟡 Medium-Low | No (tests only) |
| 3 | Frontend Utility Lane | 🟡 Medium-Low | No (pure utilities and i18n only) |
| 4 | Review / Hardening Lane | 🟠 Medium | Recommended |
| 5 | UI Lane | 🟠 Medium | **Yes — explicit approval required** |
| 6 | Safety-Critical Lane | 🔴 High | **Yes — mandatory, two reviewers** |

---

## Lane 1: Documentation Lane 🟢

**Safe for Copilot without additional approval.**

### Purpose
Add or improve documentation without touching any runtime code.

### Allowed Paths
```
docs/**
README.md
SMOKE.md
TRANSLATION_STATUS.md
*.md (root-level markdown only)
```

### Forbidden Paths
```
src/
functions/
tests/
.github/workflows/
src/api/
```

### What Copilot May Do
- Add or update files in `docs/`
- Update `README.md` and other root-level markdown files
- Add inline comments to non-critical files that clarify existing logic
- Update architecture maps, workflow diagrams, safety rules, and handoff guides

### What Copilot Must NOT Do
- Remove or contradict existing policy documents
- Describe runtime behavior that does not exist
- Add instructions that conflict with `.github/copilot-instructions.md`
- Commit placeholder or stub documentation that isn't accurate

### Required Validation
- Human spot-check that no existing policy is contradicted
- No lint or build validation required for docs-only changes

### Assumptions to Document
- Any architectural assumptions in new docs must be verified against actual code
- If uncertain about a behavior, mark it with `<!-- verify against code before merge -->`

### Maps to
Architecture Map Lane A.

---

## Lane 2: Test / Regression Lane 🟡

**Safe for Copilot with test-aware review.**

### Purpose
Add tests, fixtures, mocks, and regression scenarios without changing runtime behavior.

### Allowed Paths
```
tests/e2e/**
tests/android/**
test/utils/**
functions/goldenScenarios.ts         (additive only)
functions/safetyGoldenScenarios.ts   (additive only)
```

### Forbidden Paths
```
src/api/
functions/postLlmSafetyFilter.ts
functions/sanitizeAgentOutput.ts
functions/sanitizeConversation.ts
functions/backfillKnowledgeIndex.ts
functions/retentionCleanup.ts
```

### What Copilot May Do
- Add new Vitest unit tests in `test/utils/`
- Add new Playwright E2E specs in `tests/e2e/`
- Add new Playwright Android specs in `tests/android/`
- Add golden retrieval scenarios to `functions/goldenScenarios.ts` (additive only)
- Add safety test cases to `functions/safetyGoldenScenarios.ts` (additive only)
- Add test fixtures, mocks, and test helpers

### What Copilot Must NOT Do
- Remove, weaken, or skip existing tests
- Modify test helpers in a way that changes how existing tests pass
- Add tests that require schema changes or new entities
- Mock safety filters in a way that bypasses their logic in production code

### Required Validation
- `npm test` — all unit tests must pass
- `npm run test:e2e` — E2E tests must pass (if E2E specs modified)
- Confirm new tests are not flaky before merge

### Assumptions to Document
- What behavior the new test is exercising
- Whether the test is unit, integration, or E2E
- Whether mock data reflects real entity shape

### Maps to
Architecture Map Lane B.

---

## Lane 3: Frontend Utility Lane 🟡

**Safe for Copilot with unit test coverage.**

### Purpose
Add pure utility functions, i18n keys, and UI component primitives without touching routing, layout, or business logic.

### Allowed Paths
```
src/lib/utils.js
src/utils/numericSafety.js
src/components/ui/**        (shadcn/ui variants and primitives only)
src/components/exercises/breathingExercisesData.js
src/components/i18n/translations.jsx   (new keys only, all 7 languages)
```

### Forbidden Paths
```
src/api/
src/pages/
src/components/layout/
src/App.jsx
src/Layout.jsx
functions/
```

### What Copilot May Do
- Add pure utility functions with no side effects to `src/lib/utils.js`
- Add pure helpers to `src/utils/numericSafety.js`
- Add new shadcn/ui component variants to `src/components/ui/`
- Extend breathing exercise data in `breathingExercisesData.js`
- Add new i18n translation keys (all 7 languages: en, he, es, fr, de, it, pt)

### What Copilot Must NOT Do
- Introduce side effects, entity access, or runtime state mutations
- Add translation keys without covering all 7 languages
- Remove or rename existing translation keys
- Change any existing utility function signature

### Required Validation
- `npm test` — all unit tests must pass
- `npm run lint` — must produce zero errors
- `npm run build` — build must succeed

### Assumptions to Document
- For i18n: confirm all 7 languages have been updated
- For utilities: confirm the function is pure and has no side effects
- For UI components: confirm they follow existing shadcn/ui patterns

### Maps to
Architecture Map Lanes C and D.

---

## Lane 4: Review / Hardening Lane 🟠

**Recommended to have human review before merge.**

### Purpose
Add logging, observability, CI improvements, and code quality hardening without changing product behavior.

### Allowed Paths
```
.github/workflows/**        (CI configuration only, no secret changes)
.github/instructions/**     (additive path-specific guidance only)
docs/**
functions/validateAgentPolicy.ts   (additive validation rules only)
```

### Forbidden Paths
```
src/api/agentWiring.js
src/api/activeAgentWiring.js
src/api/entities/
functions/postLlmSafetyFilter.ts
functions/sanitizeAgentOutput.ts
functions/sanitizeConversation.ts
functions/backfillKnowledgeIndex.ts
functions/retentionCleanup.ts
.env
secrets
```

### What Copilot May Do
- Add or update CI validation steps in `.github/workflows/`
- Add observability or logging to non-safety-critical code paths
- Add additive validation rules to `validateAgentPolicy.ts` (append-only)
- Add new path-specific Copilot instruction files in `.github/instructions/`
- Add documentation for validation and observability patterns

### What Copilot Must NOT Do
- Change product behavior as a side effect of hardening
- Add logging that could expose private user data or secrets
- Weaken any existing validation or CI gate
- Change the behavior of safety-critical functions

### Required Validation
- `npm run lint` — zero errors
- `npm test` — all tests must pass
- CI workflow must execute successfully after changes
- Human review of any CI changes before merge

### When Human Approval Is Mandatory
- Any change that modifies existing CI gates or validation logic
- Any change that affects secret handling or environment variables

### Maps to
Architecture Map Lane F (partial — additive only).

---

## Lane 5: UI Lane 🟠

**Explicit human approval required before Copilot proceeds.**

### Purpose
Fix bugs in existing UI, add new pages or components, fix scroll/layout issues — when explicitly requested by a human.

### Allowed Paths (when approved)
```
src/pages/**
src/components/**        (excluding src/components/layout/ unless explicitly approved)
src/hooks/**
src/components/i18n/translations.jsx
```

### Forbidden Paths (without separate approval)
```
src/App.jsx              (routing changes need extra approval)
src/Layout.jsx           (layout shell changes need extra approval)
src/components/layout/AppContent.jsx
src/api/
functions/
```

### What Copilot May Do (with explicit approval)
- Fix bugs in existing UI components
- Add new page components when explicitly requested
- Fix scroll or layout issues while preserving existing scroll patterns
- Add responsive design improvements

### What Copilot Must NOT Do
- Add `overflow-x-hidden` to any page wrapper (breaks iOS WKWebView scroll)
- Add nested scroll containers inside `#app-scroll-container`
- Use `min-h-screen` instead of `min-h-dvh` for page root wrappers
- Change routes, navigation, or app shell structure without separate approval
- Change `src/api/agentWiring.js` or `src/api/activeAgentWiring.js`

### Required Validation
- `npm run lint` — zero errors
- `npm test` — all tests pass
- `npm run build` — no build errors or warnings
- `npm run test:e2e` — E2E tests pass
- Human visual review of any scroll or layout changes

### When Human Approval Is Mandatory
- Always — this lane requires approval before Copilot starts
- Any routing changes require a second explicit approval
- Layout shell changes (`AppContent.jsx`, `Layout.jsx`) require a second explicit approval

### Assumptions to Document
- Confirm the scroll container pattern is preserved: `overflow-x-clip` not `overflow-x-hidden`
- Confirm `min-h-dvh` not `min-h-screen` is used on page root wrappers
- Confirm no new scroll containers are nested inside `#app-scroll-container`

### Maps to
Architecture Map Lane E.

---

## Lane 6: Safety-Critical Lane 🔴

**Mandatory human approval. Two reviewers required. Small PRs only.**

### Purpose
Strengthen safety filters, sanitization functions, and agent policy validation — only when explicitly approved and with a second reviewer.

### Allowed Paths (only when approved)
```
functions/postLlmSafetyFilter.ts
functions/sanitizeAgentOutput.ts
functions/sanitizeConversation.ts
functions/checkProactiveNudges.ts
src/api/agentWiring.js           (frozen — requires separate schema approval)
src/api/activeAgentWiring.js     (frozen — requires separate schema approval)
```

### Forbidden Actions (at all times)
- Weakening any existing safety rule or filter
- Removing any existing sanitization step
- Expanding retrieval scope to include private user entities
- Changing the output contract of any safety function

### What Copilot May Do (with explicit approval)
- Add new safety rules without removing existing ones
- Add new sanitization checks without changing existing ones
- Add new policy validation rules to `validateAgentPolicy.ts`
- Review safety-critical code and document findings without making changes

### What Copilot Must NOT Do
- Proceed without two human reviewers signed off
- Make changes that loosen any safety constraint
- Change function signatures or output contracts
- Add imports without security review

### Required Validation
- Explicit written approval from repository owner
- Two human reviewers must sign off before merge
- Unit or integration tests covering the changed logic
- `npm test` — all tests pass
- Behavior change must be explicitly described in PR description
- Confirmation that no retrieval scope was expanded

### When Human Approval Is Mandatory
- Always — this lane must never proceed without explicit written approval
- Must include a description of what the change does and why
- Must confirm that no existing safety check was removed or weakened

### Maps to
Architecture Map Lanes F and H (safety subset).

---

## Cross-Lane Rules

These rules apply across all lanes:

1. **One lane per PR.** Do not mix documentation changes with code changes in the same PR.
2. **No private user entity access.** `ThoughtJournal`, `Conversation`, `CaseFormulation`, `MoodEntry`, `CompanionMemory`, and `UserDeletedConversations` must never be added to shared retrieval pipelines in any lane.
3. **Never change Base44 entities.** Entity schemas in `src/api/entities/` are read-only in all lanes.
4. **Never change automations or secrets.** These are production-active and off-limits in all lanes.
5. **Stop and escalate when uncertain.** If a task does not fit cleanly into a single lane, stop and ask for human guidance before proceeding.

---

## Quick Reference

| Task Type | Lane | Approval? |
|---|---|---|
| Add a new doc to `docs/` | 1 — Documentation | No |
| Update architecture map | 1 — Documentation | No |
| Add a Vitest unit test | 2 — Test / Regression | No |
| Add a Playwright E2E test | 2 — Test / Regression | No |
| Add translation keys (all 7 langs) | 3 — Frontend Utility | No |
| Add a pure utility function | 3 — Frontend Utility | No |
| Add a shadcn/ui primitive | 3 — Frontend Utility | No |
| Add a CI validation step | 4 — Review / Hardening | Recommended |
| Add a Copilot instruction file | 4 — Review / Hardening | Recommended |
| Fix a UI bug (requested) | 5 — UI | **Yes** |
| Add a new page (requested) | 5 — UI | **Yes** |
| Fix scroll/layout (requested) | 5 — UI | **Yes** |
| Harden a safety filter | 6 — Safety-Critical | **Yes + 2 reviewers** |
| Change agent wiring | 6 — Safety-Critical | **Yes + 2 reviewers** |
| Change entity schemas | 6 — Safety-Critical | **Yes + schema owner** |
| Change Base44 automations | ❌ Off-limits | **Never via Copilot** |
| Change secrets / `.env` | ❌ Off-limits | **Never via Copilot** |

---

*Last updated: Stage 6 — Safe Task Lane Definitions (additive documentation only).*
*No existing application behavior was changed in creating this document.*
