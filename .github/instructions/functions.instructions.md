---
applyTo: "functions/**"
---

# Copilot Instructions — `functions/` Directory

> These instructions apply to all files under `functions/`.
> This directory contains **production-critical backend functions** that run live on Base44.
> Errors here affect real users of a mental health application.

---

## Risk Level

🔴 **HIGH RISK** — All files in this directory are production-active.

---

## What You May Do Without Explicit Approval

- Add inline code comments that clarify existing logic (do not change the logic itself).
- Add unit tests or integration tests for existing function behavior.
- Add documentation files in `docs/` that reference or explain this code.

---

## What You Must NOT Do Without Explicit Approval

- **Do not change any function logic** — even a refactor that appears cosmetically safe.
- **Do not add, remove, or rename parameters** in any exported function.
- **Do not change return types or response shapes**.
- **Do not change error handling** (loosening error handling in safety functions harms users).
- **Do not import new dependencies** without explicit approval and security review.
- **Do not change the retrieval scope** — do not add new entities to indexing or retrieval pipelines.
- **Do not weaken or remove any sanitization or safety filter rule**.

---

## Special Restrictions by File

| File | Special Rule |
|---|---|
| `postLlmSafetyFilter.ts` | SAFETY-CRITICAL. Do not modify under any circumstance without explicit human approval and a second reviewer. Weakening this filter harms vulnerable users. |
| `sanitizeAgentOutput.ts` | SAFETY-CRITICAL. Same as above. |
| `sanitizeConversation.ts` | SAFETY-CRITICAL. Same as above. |
| `backfillKnowledgeIndex.ts` | INDEXING-CRITICAL. Changes corrupt the knowledge base. Do not modify without explicit approval and a retrieval regression plan. |
| `retentionCleanup.ts` | DESTRUCTIVE. Permanently deletes user data. Do not modify the scope or logic of deletion without explicit approval. |
| `checkProactiveNudges.ts` | USER-FACING. Errors cause misfired nudges reaching real users. Require human review before merge. |

---

## What Must Be Validated Before Merging Any Change Here

1. Explicit written approval from the repository owner.
2. A clear description of what logic changed and why.
3. Unit or integration tests covering the changed logic.
4. A second human reviewer for any safety-critical file.
5. Confirmation that no retrieval scope was expanded.
6. Confirmation that no private user entity (ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory, UserDeletedConversations) is newly accessible.

---

## When to Stop and Ask for Approval

Stop immediately and request approval if:
- You are about to change any logic in this directory.
- You are unsure whether a change is purely cosmetic or affects behavior.
- You are considering adding a new import or dependency.
- A change touches a safety-critical file.

---

> See `docs/copilot-pr-workflow.md` for full PR and review workflow.
> See `docs/copilot-safety-rules.md` for the complete safety rule set.
