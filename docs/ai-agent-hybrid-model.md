# AI Agent Hybrid Source Model

**Status**: Active  
**Applies to**: CBT Therapist, AI Companion  
**Source of truth**: `docs/ai-agent-enforcement-spec.md`, `docs/ai-agent-access-policy.md`

---

## A. Hybrid Model Principle

The hybrid model adds caution-layer entities as **guarded secondary augmentation** on top of the V1 baseline.

V1 (Steps 1–3) is the default and primary operating layer. It remains unchanged.  
Caution-layer entities are wired in only as controlled secondary augmentation:

- **V1 sources load first** — preferred, allowed, and non-caution restricted entities are always higher priority.
- **Caution-layer sources load last** — they can only supplement, never replace, a V1 source.
- **Caution-layer access is explicit** — every caution entity carries `caution_layer: true` in its config.
- **No caution entity may ever be preferred** — `access_level` for caution entities is always `'restricted'`.
- **Conversation is never primary** — it carries `secondary_only: true` for both agents.
- **CaseFormulation is never unrestricted** — it carries `unrestricted: false, read_only: true` for CBT Therapist and remains prohibited for AI Companion.

---

## B. Caution-Layer Entities Added

### CBT Therapist (`CBT_THERAPIST_WIRING_HYBRID`)

| Entity | source_order | access_level | Guardrails |
|--------|:---:|:---:|---|
| CaseFormulation | 12 | restricted | `read_only: true`, `unrestricted: false`, `secondary_only: true`, `caution_layer: true` |
| Conversation    | 13 | restricted | `secondary_only: true`, `caution_layer: true` |

Both are placed above the maximum V1 source_order (11 — MoodEntry), ensuring they load only after every V1 source.

### AI Companion (`AI_COMPANION_WIRING_HYBRID`)

| Entity | source_order | access_level | Guardrails |
|--------|:---:|:---:|---|
| Conversation | 9 | restricted | `secondary_only: true`, `caution_layer: true` |

Placed above the maximum V1 source_order (8 — SessionSummary).

> **CaseFormulation is not added for AI Companion.** It remains prohibited per enforcement spec §E and `COMPANION_PROHIBITED`. AI Companion must not use CaseFormulation for any purpose, including clinical reasoning.

---

## C. Exact Guardrails

### Validator enforcement (functions/validateAgentPolicy.ts)

Three hybrid checks extend the existing 10-check V1 validator:

| Check | Rule |
|-------|------|
| **H1** | Any entity flagged `caution_layer: true` must have a `source_order` greater than the maximum `source_order` of all V1 (non-caution) entities in the same config. |
| **H2** | `Conversation` must never have `access_level: 'preferred'` for any agent. |
| **H3** | Any entity flagged `caution_layer: true` must not have `access_level: 'preferred'`. |

These checks apply whenever the agent name is known (`cbt_therapist` or `ai_companion`). All existing V1 checks (1–10) continue to apply unchanged.

### Per-entity guardrails

| Entity | Agent | Guardrail flags |
|--------|-------|-----------------|
| CaseFormulation | CBT Therapist | `access_level: 'restricted'`, `read_only: true`, `unrestricted: false`, `secondary_only: true`, `caution_layer: true` |
| Conversation | CBT Therapist | `access_level: 'restricted'`, `secondary_only: true`, `caution_layer: true` |
| Conversation | AI Companion | `access_level: 'restricted'`, `secondary_only: true`, `caution_layer: true` |

---

## D. What Remains Prohibited

The following entities are unchanged and remain prohibited:

### System-prohibited (both agents, permanently)
- `Subscription`
- `UserDeletedConversations`
- `AppNotification`
- `MindGameActivity`

### AI Companion agent-specific prohibitions (unchanged)
- `ThoughtJournal`
- `CoachingSession`
- `CaseFormulation` — **remains prohibited for AI Companion in the hybrid model**

### Policy invariants that the hybrid model does not relax
- `Conversation` must never be preferred (for either agent).
- `CaseFormulation` must never be unrestricted (for either agent).
- `CompanionMemory` must not be used for clinical reasoning by AI Companion.
- `SessionSummary` must always precede `Conversation` in source order (for both agents).
- Caution-layer entities must always be at lower priority than all V1 sources.

---

## E. Export Reference

| Export | Agent | Entities | Notes |
|--------|-------|:---:|-------|
| `CBT_THERAPIST_WIRING_STEP_3` | CBT Therapist | 10 | V1 canonical baseline — unchanged |
| `AI_COMPANION_WIRING_STEP_3`  | AI Companion  | 8  | V1 canonical baseline — unchanged |
| `CBT_THERAPIST_WIRING_HYBRID` | CBT Therapist | 12 | V1 + CaseFormulation (12) + Conversation (13) |
| `AI_COMPANION_WIRING_HYBRID`  | AI Companion  | 9  | V1 + Conversation (9) |

All V1 step exports (Steps 1, 2, 3) are unmodified by the hybrid wiring.

---

## F. Rollback to V1

The active wiring selection lives in **`src/api/activeAgentWiring.js`**.

To revert both agents to the V1 (Step 3) baseline, change the two imports in that file:

```js
// Replace:
import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_HYBRID,
} from './agentWiring.js';

// With:
import {
  CBT_THERAPIST_WIRING_STEP_3 as CBT_THERAPIST_WIRING_HYBRID,
  AI_COMPANION_WIRING_STEP_3  as AI_COMPANION_WIRING_HYBRID,
} from './agentWiring.js';
```

No other files need to change. All hybrid exports remain in `agentWiring.js` and can be re-activated at any time.
