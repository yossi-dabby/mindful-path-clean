# Copilot Task Invocation Guide — Mindful Path CBT App

> **Stage 6 — Safe Task Invocation Reference**
> This guide explains which task lane to use, how to write effective prompts, what to avoid, and when to escalate.
> See `docs/copilot-task-lanes.md` for the full lane definitions with boundaries and approval rules.

---

## Before You Start Any Copilot Task

1. **Read the lane boundaries** in `docs/copilot-task-lanes.md` for the lane you're about to use.
2. **Confirm the task fits a single lane.** If it spans multiple lanes, split it into multiple PRs.
3. **Check if approval is required.** Lanes 5 and 6 always require explicit human approval before Copilot starts.
4. **Use the PR template** at `.github/pull_request_template.md`. Fill it out before merging.

---

## Which Lane to Use

### Use Lane 1 (Documentation) when:
- Adding or updating a file under `docs/`
- Updating `README.md`, `SMOKE.md`, or other root-level markdown
- Adding or clarifying inline comments in non-critical files
- Documenting a new pattern, convention, or decision

**Example prompt:**
```
Using the Documentation Lane only, add a new section to docs/repository-architecture-map.md
that explains the scroll container pattern. Do not touch any source files.
Confirm all changes are additive and do not contradict existing policies.
```

---

### Use Lane 2 (Test / Regression) when:
- Writing a new Vitest unit test for an existing function
- Writing a new Playwright E2E spec for an approved user flow
- Adding golden retrieval scenarios (additive only)
- Adding safety test fixtures

**Example prompt:**
```
Using the Test / Regression Lane only, add a Vitest unit test for the
numericSafety utility in src/utils/numericSafety.js.
Do not modify any runtime code. Only add new test cases.
Run npm test and confirm all tests pass before finishing.
```

---

### Use Lane 3 (Frontend Utility) when:
- Adding a pure utility function with no side effects
- Adding translation keys (must cover all 7 languages)
- Adding a new shadcn/ui component primitive
- Extending breathing exercise data

**Example prompt:**
```
Using the Frontend Utility Lane only, add a new i18n key called "session.title"
to src/components/i18n/translations.jsx.
Add the key in all 7 languages: en, he, es, fr, de, it, pt.
Do not remove or modify any existing keys.
Run npm test and confirm the translations test passes.
```

---

### Use Lane 4 (Review / Hardening) when:
- Adding a CI step to an existing workflow
- Adding a new path-specific Copilot instruction file
- Adding observability or logging to a non-safety-critical code path
- Adding additive validation rules

**Example prompt:**
```
Using the Review / Hardening Lane only, add a new CI step to .github/workflows/webpack.yml
that runs npm run lint and fails the build if there are any lint errors.
Do not change any other CI steps or validation gates.
```

**Note:** Always get a human to review workflow changes before merging.

---

### Use Lane 5 (UI) when — AND ONLY after explicit human approval:
- An explicit request has been made to fix a UI bug
- An explicit request has been made to add a new page or component
- An explicit request has been made to fix a scroll or layout issue

**Example prompt (after approval is confirmed):**
```
Using the UI Lane only, and with explicit approval from [approver name] on [date],
fix the scroll issue on the Home page where the content overflows the scroll container.
Preserve the existing scroll pattern: #app-scroll-container uses overflow-x-clip
and overflow-y-auto. Do not add overflow-x-hidden. Use min-h-dvh not min-h-screen.
Run npm run lint, npm test, npm run build, and npm run test:e2e before finishing.
```

**Stop immediately if:**
- There is no explicit approval on record
- The fix requires changing `src/App.jsx`, `src/Layout.jsx`, or routing logic
- The fix requires touching `src/api/` or `functions/`

---

### Use Lane 6 (Safety-Critical) when — AND ONLY with mandatory approval and two reviewers:
- Strengthening a safety filter (never weakening)
- Adding a new sanitization check (never removing an existing one)
- Reviewing safety-critical code (read-only review preferred)

**Example prompt (after approval + two reviewers confirmed):**
```
Using the Safety-Critical Lane only, with explicit approval from [approver name] on [date]
and sign-off from reviewers [reviewer 1] and [reviewer 2]:
Add a new check to functions/sanitizeAgentOutput.ts that strips any output containing
a phone number pattern. Do not remove or modify any existing sanitization rules.
Add a unit test for the new check. Confirm the test passes with npm test.
Describe the behavior change explicitly in the PR description.
```

**Stop immediately if:**
- There are fewer than two human reviewers confirmed
- The change would loosen any existing safety constraint
- The function signature or output contract would change

---

## Prompt Style Guidelines

### Always Include
- Which lane you're using (e.g., "Using the Documentation Lane only...")
- What the change is and why
- What files must NOT be touched
- Which validation commands to run
- Confirmation that changes are additive

### Always Exclude
- Vague or open-ended requests ("improve the codebase")
- Cross-lane requests ("update the docs and add a test and fix the UI")
- Requests that imply entity schema or agent wiring changes
- Requests to change automations, secrets, or `.env` values

### Safety Phrasing
Include one or more of these phrases in every prompt:
- "Do not modify any existing runtime code"
- "Changes must be additive only"
- "Do not remove any existing [tests / keys / rules]"
- "Confirm no production behavior was changed"

---

## What NOT to Ask Copilot Without Explicit Approval

The following requests must never be made without explicit human approval:

| Forbidden Request | Why |
|---|---|
| "Update the entity schema for [entity]" | Breaks live Base44 runtime |
| "Change the agent wiring to add [entity]" | Alters live AI agent behavior |
| "Expand retrieval to include [private entity]" | Exposes private user data |
| "Update the agent prompt to [behavior]" | Changes clinical or companion AI behavior |
| "Change the automation to [behavior]" | Alters production scheduled jobs |
| "Update the `.env` or secret for [key]" | Security risk |
| "Remove the safety filter for [pattern]" | Harms vulnerable users |
| "Skip the [test/lint/build] step" | Removes quality gates |
| "Refactor the entire [directory]" | Unfocused, high-risk |
| "Update the UI layout or scroll container" | Requires Lane 5 approval |

---

## When to Escalate to Human Review

Stop and escalate to a human reviewer when:

1. The task does not fit cleanly into a single lane
2. The task touches more than one lane boundary
3. The task involves any of the forbidden request types listed above
4. The task would add a new entity, change a schema, or alter agent wiring
5. The task involves safety-critical files (`postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, `sanitizeConversation.ts`)
6. The task is ambiguous and you are unsure which lane applies
7. The task requires understanding private user data behavior
8. The task changes the CI pipeline in a way that could bypass quality gates
9. A change you are making would require a schema or retrieval change to be correct
10. A reviewer has flagged a concern you cannot resolve without context you don't have

**When escalating:** Stop, document the situation in the PR description, and explicitly request human review before proceeding.

---

## How to Keep PRs Narrow

1. **One lane per PR.** Documentation changes go in one PR; test changes go in another.
2. **One logical change per PR.** If you're fixing two unrelated bugs, use two PRs.
3. **Avoid reformatting.** Do not reformat code unrelated to the change. This makes diffs hard to review.
4. **Reference the issue.** Every PR should reference the task or issue that motivated it.
5. **Fill out the PR template.** The template at `.github/pull_request_template.md` is required.
6. **Document your assumptions.** If you assumed something about how a function works, write it in the PR description.
7. **Confirm validation in the PR.** State explicitly that `npm run lint`, `npm test`, and `npm run build` passed.

---

## Validation Checklist Before Merge

| Check | Command | Required For |
|---|---|---|
| Lint | `npm run lint` | All code changes (Lanes 2–6) |
| Unit tests | `npm test` | All code changes |
| Build | `npm run build` | All code changes |
| E2E tests | `npm run test:e2e` | Lane 5 (UI) and Lane 6 (Safety) |
| Type check | `npm run typecheck` | All TypeScript changes |
| Human review | — | Lanes 4, 5, 6 |
| Second reviewer | — | Lane 6 only |

Documentation-only changes (Lane 1) do not require build or test validation,
but do require a human spot-check to confirm no existing policy is contradicted.

---

## Path-Specific Instruction Files

The repository includes automatic Copilot instruction files for high-risk paths.
These files are applied automatically when Copilot works on files in those paths:

| File | Applies To | Purpose |
|---|---|---|
| `.github/instructions/functions.instructions.md` | `functions/**` | Backend safety and approval rules |
| `.github/instructions/src-api.instructions.md` | `src/api/**` | Entity and agent wiring freeze rules |
| `.github/instructions/docs.instructions.md` | `docs/**` | Documentation lane safety rules |
| `.github/instructions/tests.instructions.md` | `tests/**` and `test/**` | Test lane safety rules |

These instruction files reinforce the lane boundaries automatically for each path.

---

## Lane Decision Flowchart

```
Start: What kind of task is this?
│
├── Only touches docs/ or markdown files?
│   └── Lane 1: Documentation (no approval needed)
│
├── Only adds tests, fixtures, or golden scenarios?
│   └── Lane 2: Test / Regression (no approval needed)
│
├── Only adds pure utilities, i18n keys, or UI primitives?
│   └── Lane 3: Frontend Utility (no approval needed)
│
├── Only adds CI steps, instruction files, or observability?
│   └── Lane 4: Review / Hardening (human review recommended)
│
├── Touches pages, components, layout, or routing?
│   ├── Do you have explicit human approval?
│   │   ├── Yes → Lane 5: UI (proceed carefully)
│   │   └── No → STOP. Request approval first.
│
├── Touches safety filters, agent wiring, or entity schemas?
│   ├── Do you have explicit approval AND two reviewers?
│   │   ├── Yes → Lane 6: Safety-Critical (proceed very carefully)
│   │   └── No → STOP. Request approval + reviewers first.
│
└── Does not fit any lane above?
    └── STOP. Do not proceed. Escalate to human review.
```

---

## Custom Agent Equivalents

This repository does not use a separate custom chat agent format.
Instead, path-specific instruction files (`.github/instructions/*.instructions.md`) serve the equivalent role:
they automatically apply role-specific safety rules and guidance whenever Copilot works on files in those paths.

| Agent Role | Equivalent Mechanism |
|---|---|
| `docs-guardian` | Lane 1 boundaries + `.github/instructions/docs.instructions.md` |
| `regression-guardian` | Lane 2 boundaries + `.github/instructions/tests.instructions.md` |
| `backend-knowledge-reviewer` | Lane 4 boundaries + `.github/instructions/functions.instructions.md` |
| `safety-review-assistant` | Lane 6 boundaries + `.github/instructions/src-api.instructions.md` + `.github/instructions/functions.instructions.md` |

When invoking Copilot for any of these roles, explicitly state the lane in the prompt
and confirm that the path-specific instruction file applies.

---

*Last updated: Stage 6 — Safe Task Invocation Guide (additive documentation only).*
*No existing application behavior was changed in creating this document.*
