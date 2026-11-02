---
applyTo: "docs/**"
---

# Copilot Instructions — `docs/` Directory

> These instructions apply to all files under `docs/`.
> This directory contains **repository policy documents, architecture maps, and Copilot guidance files**.
> Changes here affect how future Copilot work is governed — handle with care.

---

## Risk Level

🟢 **LOW RISK** — Documentation changes do not alter runtime behavior.
However, incorrect or contradictory documentation can mislead future contributors and Copilot agents.

---

## What You May Do Without Explicit Approval

- Add new documentation files that describe existing behavior accurately.
- Update existing documentation to reflect approved changes (after those changes are merged).
- Add inline clarifications that improve readability without changing meaning.
- Add new sections to architecture maps, safety guides, or workflow documents — as long as they are additive.
- Add diagrams, tables, or examples that illustrate existing patterns.

---

## What You Must NOT Do Without Explicit Approval

- **Do not remove or replace existing policy documents.**
- **Do not contradict `.github/copilot-instructions.md` or `docs/copilot-safety-rules.md`.**
- **Do not describe runtime behavior that has not been approved or implemented.**
- **Do not change the boundaries, approval rules, or forbidden paths** defined in lane documents.
- **Do not add placeholder or stub documentation** that isn't accurate or verified.
- **Do not claim that a stage, feature, or behavior is complete** unless it has been explicitly confirmed.

---

## Key Files — Handle With Extra Care

| File | Why It Matters |
|---|---|
| `docs/copilot-safety-rules.md` | Governs all Copilot work in this repo; must not be weakened |
| `docs/copilot-task-lanes.md` | Defines lane boundaries; changes require Stage 6 review |
| `docs/copilot-task-invocation-guide.md` | Governs how Copilot is invoked; changes require Stage 6 review |
| `docs/copilot-pr-workflow.md` | PR workflow rules; must not be weakened |
| `docs/repository-architecture-map.md` | Architecture snapshot; must reflect actual code state |
| `docs/ai-agent-access-policy.md` | Agent entity access rules; must not be relaxed |

---

## Documentation Accuracy Rules

1. If you describe a file path, verify it exists before publishing.
2. If you describe a function signature, verify it matches the actual code.
3. If you describe an entity field, verify it exists in `src/api/entities/`.
4. If you describe agent behavior, verify it matches `src/api/agentWiring.js`.
5. If you are uncertain, mark the content with `<!-- verify against code before merge -->`.

---

## Formatting Conventions

- Use Markdown headings, tables, and code blocks consistently with existing docs.
- Use risk-level emoji: 🟢 Low, 🟡 Medium-Low, 🟠 Medium, 🔴 High.
- Add a "Last updated" note at the bottom of any document you create or significantly update.
- Do not use HTML in markdown files unless strictly necessary.

---

## What Must Be Validated Before Merging Any Documentation Change

1. No existing policy is contradicted or removed.
2. No described behavior conflicts with the actual codebase.
3. Human spot-check that the new content is accurate and adds value.

---

> See `docs/copilot-task-lanes.md` for the Documentation Lane definition (Lane 1).
> See `docs/copilot-task-invocation-guide.md` for how to invoke this lane.
> See `.github/copilot-instructions.md` for the master Copilot instruction set.
