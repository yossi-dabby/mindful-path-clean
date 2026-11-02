---
applyTo: "src/api/**"
---

# Copilot Instructions — `src/api/` Directory

> These instructions apply to all files under `src/api/`.
> This directory contains **entity schemas, agent wiring, and the Base44 SDK client** — all production-critical.
> Changes here alter live AI agent behavior and the live data model.

---

## Risk Level

🔴 **HIGH RISK** — All files in this directory are production-active.

---

## What You May Do Without Explicit Approval

- Read files to understand how entities, agents, or the client are structured.
- Add inline comments that document existing behavior (do not change behavior).
- Reference entity field names or wiring patterns in documentation.

---

## What You Must NOT Do Without Explicit Approval

### `src/api/entities/`
- **Do not add, remove, or rename any field** on any Base44 entity.
- **Do not change any field type, relationship, or default value**.
- **Do not add or remove entity files**.
- **Do not restructure the schema in any way** — even a rename that seems safe will break the live runtime.
- Treat this directory as **read-only** unless you have explicit written approval from the repository owner.

### `src/api/agentWiring.js` and `src/api/activeAgentWiring.js`
- **Do not change which entities agents have access to**.
- **Do not add new tools or capabilities to any agent**.
- **Do not change the retrieval configuration** (scope, depth, entity list).
- **Do not alter the CBT Therapist or AI Companion wiring** in any way.
- Both files are **frozen** unless you have explicit written approval.

### `src/api/base44Client.js`
- **Do not change authentication, token handling, or SDK configuration**.
- **Do not add logging that could expose credentials or user data**.
- This file is **read-only** unless you have explicit written approval.

---

## Private User Entities — Absolute Rule

The following entities must **never** be added to a shared retrieval pipeline, indexing job, or cross-user query:

- `ThoughtJournal`
- `Conversation`
- `CaseFormulation`
- `MoodEntry`
- `CompanionMemory`
- `UserDeletedConversations`

If any proposed change would cause any of these entities to be retrievable at a shared or cross-user level, **stop immediately and do not proceed**.

---

## What Must Be Validated Before Merging Any Change Here

1. Explicit written approval from the repository owner.
2. A clear description of what changed in the schema or wiring and why.
3. Confirmation that no private user entity access was expanded.
4. Confirmation that agent tool access was not expanded.
5. A human reviewer who understands the Base44 runtime must sign off.

---

## When to Stop and Ask for Approval

Stop immediately and request approval if:
- You are about to edit any file in `src/api/entities/`.
- You are about to change `agentWiring.js` or `activeAgentWiring.js`.
- You are adding a new entity to any retrieval or wiring configuration.
- You are unsure whether a change is read-only or behavior-altering.

---

> See `docs/copilot-pr-workflow.md` for full PR and review workflow.
> See `docs/ai-agent-access-policy.md` for the complete agent access policy table.
> See `docs/copilot-safety-rules.md` for the complete safety rule set.
