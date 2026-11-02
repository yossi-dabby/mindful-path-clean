# Copilot Repository Handoff — Mindful Path CBT App

> **Quick-start guide for GitHub Copilot agents beginning work in this repository.**
> Read this first, then consult the files listed below.
> This document is additive and does not change any existing application logic.

---

## Where to Start Reading

1. **`.github/copilot-instructions.md`** — Master instructions. Read fully before generating any code.
2. **`docs/copilot-safety-rules.md`** — What Copilot may and may not change. Quick reference.
3. **`docs/repository-architecture-map.md`** — Full architecture snapshot, safe edit zones, dependency flow, production-critical file list, and future work lanes.
4. **`docs/ai-agent-access-policy.md`** — Source of truth for which entities each agent may access.

---

## Source-of-Truth Files (Read-Only)

| File | What It Governs |
|---|---|
| `src/api/entities/index.js` | Base44 entity schemas — never modify casually |
| `src/api/agentWiring.js` | Agent entity wiring — never modify without approval |
| `src/api/activeAgentWiring.js` | Live agent wiring — never modify without approval |
| `docs/ai-agent-access-policy.md` | Agent entity access policy |
| `docs/ai-agent-enforcement-spec.md` | Detailed wiring enforcement rules |
| `docs/ai-entity-classification.md` | Entity classification (Private / Shared / Restricted) |

---

## Files That Must Not Be Changed Casually

| File or Path | Why |
|---|---|
| `functions/postLlmSafetyFilter.ts` | Safety-critical — weakening it puts users at risk |
| `functions/sanitizeAgentOutput.ts` | Safety-critical — weakening it puts users at risk |
| `functions/sanitizeConversation.ts` | Safety-critical — weakening it puts users at risk |
| `functions/enhancedCrisisDetector.ts` | Safety-critical — crisis detection |
| `functions/backfillKnowledgeIndex.ts` | Live knowledge index backfill |
| `functions/retrieveRelevantContent.ts` | Live knowledge retrieval that feeds agents |
| `src/api/entities/index.js` | Live entity schemas |
| `src/components/layout/AppContent.jsx` | Scroll container — see overflow-x-clip rule |
| `src/Layout.jsx` | Main layout shell |
| `src/App.jsx` | Root router and auth loading |

---

## Private User Entities — Never Cross-Index

These entities belong to individual users and must **never** be indexed,
retrieved at a shared level, or exposed cross-user:

```
ThoughtJournal · Conversation · CaseFormulation
MoodEntry · CompanionMemory · UserDeletedConversations
```

---

## Key Conventions to Remember

| Convention | Rule |
|---|---|
| Scroll container | `overflow-x-clip` (NOT `overflow-x-hidden`), `height:100dvh` |
| Full-screen pages | `fixed inset-0 flex flex-col`, `height:100dvh; overflow:hidden` |
| Page root wrappers | `min-h-dvh` (NOT `min-h-screen`) |
| i18n | Add new keys in **all 7 languages**: en, he, es, fr, de, it, pt |
| Entity schemas | Never add, rename, or remove fields without explicit approval |
| Agent boundaries | CBT Therapist = structured clinical; Companion = emotional support — roles must not merge |

---

## How to Run Checks Before a PR

```bash
npm run lint          # Zero errors required
npm test              # All unit tests must pass
npm run build         # Build must succeed
npm run test:e2e      # E2E tests must pass (requires running app)
```

---

## Architecture in One Paragraph

The app is a React + Vite SPA powered by Base44 as the backend runtime.
Two AI agents — the **CBT Therapist** and the **AI Companion** — are wired to
Base44 entities via `agentWiring.js` and `activeAgentWiring.js`.
A knowledge index (vector store via openai_pinecone) provides retrieval-augmented
generation, built and maintained by the pipeline in `functions/` (build → chunk → upsert → retrieve).
Safety filters (`postLlmSafetyFilter`, `sanitizeAgentOutput`, `sanitizeConversation`,
`enhancedCrisisDetector`) wrap every agent response.
The frontend renders inside a single scroll container (`#app-scroll-container` in `AppContent.jsx`).
All UI strings live in `src/components/i18n/translations.jsx` (7 languages).
Unit tests run via Vitest (`test/`); E2E tests run via Playwright (`tests/`).

---

*This handoff file is additive documentation only.*
*No existing application behavior was changed in creating this file.*
