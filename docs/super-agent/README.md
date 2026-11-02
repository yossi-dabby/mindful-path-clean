# SuperCbtAgent — Overview and Roadmap

> **Status: SCAFFOLD ONLY — NOT ACTIVE**  
> No user traffic routes to this code. All capabilities are planned/inactive.  
> Activation requires explicit human approval and separate reviewed PRs.

---

## What Is the SuperCbtAgent?

The SuperCbtAgent is a planned opt-in upgrade path for the existing CBT Therapist agent
(`cbt_therapist`) that aims to provide:

- **Full multilingual CBT** in all 7 app languages: `en`, `he`, `es`, `fr`, `de`, `it`, `pt`
- **Dynamic CBT sub-protocol selection** (standard CBT, ACT-informed, DBT-skills, MBSR-adjacent, or schema-focused)
- **Super-session longitudinal context** spanning multiple prior sessions
- **Extended workflow orchestration** building on the Phase 3 workflow engine

It is **not** a new agent. It is an upgrade path for the same `cbt_therapist` agent,
composed on top of the existing Stage 2 V5 wiring.

---

## Safety Rules

The SuperCbtAgent follows all existing safety constraints without exception:

| Rule | Status |
|------|--------|
| All existing safety filters remain authoritative | ✅ Enforced |
| Crisis detection / risk panel / safety mode are unchanged | ✅ Enforced |
| No new entity access at scaffold time | ✅ Enforced |
| No changes to any existing wiring, flag, or routing | ✅ Enforced |
| Feature-flag gated, double-gated (master + super flag) | ✅ Planned |
| All changes additive and opt-in only | ✅ Enforced |

> See [`docs/copilot-safety-rules.md`](../copilot-safety-rules.md) for the master safety rule set.

---

## Capability Roadmap

| Capability | Task | Status |
|------------|------|--------|
| Multilingual CBT (all 7 languages) | Task 3 — i18n pass | 🔵 Planned |
| Dynamic protocol selection | Task 4 — Features + Language | 🔵 Planned |
| Super-session continuity | Task 4 — Features + Language | 🔵 Planned |
| Advanced workflow orchestration | Task 4 — Features + Language | 🔵 Planned |
| E2E tests (EN + 1 other language) | Task 5 — E2E validation | 🔵 Planned |
| Activation docs + guide | Task 6 — Docs | ✅ Done |

---

## Current State (Tasks 1–6 Complete)

All six super agent tasks have been delivered in separate PRs:

| Task | Content | Status |
|------|---------|--------|
| Task 1 | Repository inventory (`docs/analysis-super-agent.md`) | ✅ Merged |
| Task 2 | Scaffold module (`src/lib/superCbtAgent.js`) | ✅ Merged |
| Task 3 | i18n keys for all 7 languages | ✅ Merged |
| Task 4 | Logic: locale resolution, i18n string resolution, session preamble | ✅ Merged |
| Task 5 | E2E tests (`tests/e2e/super-cbt-agent.spec.ts`) | ✅ Merged |
| Task 6 | Activation guide, FAQ, onboarding docs | ✅ This PR |

**No existing file was modified beyond updating this status table.**

---

## Activation Plan (Future PRs)

Activation must follow this exact sequence:

1. **Task 3 — i18n pass (separate PR)**  
   Add all 7-language translation keys for any new SuperCbtAgent prompts and UI text.  
   No keys may be removed or altered — only additive.

2. **Task 4 — Features + Language integration (separate PR)**  
   Implement SuperCbtAgent logic. Add `SUPER_CBT_AGENT_ENABLED` to `featureFlags.js`.  
   Add the routing branch in `resolveTherapistWiring()`.  
   All logic must be opt-in (flag defaults to `false`).

3. **Task 5 — E2E tests (separate PR)**  
   Add Playwright / Vitest tests covering English + at least one other language.  
   All existing tests must continue to pass.

4. **Task 6 — Docs + activation guide (separate PR)**  
   Update this file and add step-by-step activation and monitoring guide.

5. **Activation (requires explicit human approval)**  
   Enable flags only after all tasks are complete, all tests pass, and a human
   reviewer has signed off.

---

## Key Files

| File | Role |
|------|------|
| `src/lib/superCbtAgent.js` | Scaffold module + logic (Tasks 2 and 4) |
| `test/utils/superCbtAgent.test.js` | Scaffold inertia and regression tests |
| `test/utils/superCbtAgentLogic.test.js` | Logic, locale, and preamble tests |
| `test/utils/superCbtAgentI18n.test.js` | i18n completeness tests (all 7 languages) |
| `tests/e2e/super-cbt-agent.spec.ts` | E2E tests (en + he) |
| `src/api/agentWiring.js` | All wiring configs (read-only; super agent not yet added here) |
| `src/api/activeAgentWiring.js` | Runtime routing (super agent branch pending Task 4 activation PR) |
| `src/lib/featureFlags.js` | Feature flag registry (super agent flag is in `src/lib/superCbtAgent.js`) |
| `src/components/i18n/translations.jsx` | i18n layer (extended in Task 3) |

---

## Related Documents

- [`docs/analysis-super-agent.md`](../analysis-super-agent.md) — Full repo inventory (Task 1 output)
- [`docs/super-agent/architecture.md`](./architecture.md) — Composition approach
- [`docs/super-agent/activation-guide.md`](./activation-guide.md) — Step-by-step enable, test, and monitor guide
- [`docs/super-agent/faq.md`](./faq.md) — Frequently asked questions
- [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) — Phase-gate rollout checklist
- [`docs/i18n-super-agent.md`](../i18n-super-agent.md) — i18n key documentation (all 7 languages)
- [`docs/therapist-upgrade-stage2-plan.md`](../therapist-upgrade-stage2-plan.md) — Stage 2 plan
- [`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md) — Agent entity access policy
- [`docs/copilot-safety-rules.md`](../copilot-safety-rules.md) — Safety rules

---

*Last updated: 2026-04-08 — Task 6 (Docs and Activation Guide) PR*
