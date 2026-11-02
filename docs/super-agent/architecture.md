# SuperCbtAgent — Architecture and Composition Approach

> **Status: SCAFFOLD ONLY — NOT ACTIVE**  
> This document describes the planned composition approach for the SuperCbtAgent.  
> No production code is changed by the scaffold PR.

---

## Design Principle: Composition, Not Replacement

The SuperCbtAgent does **not** replace the existing CBT Therapist.  
It **composes** the highest existing upgrade phase (Stage 2 V5) and layers
new capabilities on top as additive, flag-gated features.

This follows the same pattern used throughout Stage 2 (Phases 1–7):
- Each phase adds flags and capabilities to the previous version
- The entity access matrix is inherited and never shrunk
- All existing safety constraints propagate unchanged
- A single rollback switch (the master gate) disables the entire upgrade path

---

## Composition Chain

```
CBT_THERAPIST_WIRING_HYBRID          ← current default (always active)
  └─ CBT_THERAPIST_WIRING_STAGE2_V1  ← Phase 1: memory context injection
       └─ CBT_THERAPIST_WIRING_STAGE2_V2  ← Phase 3: workflow engine
            └─ CBT_THERAPIST_WIRING_STAGE2_V3  ← Phase 5: retrieval orchestration
                 └─ CBT_THERAPIST_WIRING_STAGE2_V4  ← Phase 6: live retrieval
                      └─ CBT_THERAPIST_WIRING_STAGE2_V5  ← Phase 7: safety mode
                           └─ SUPER_CBT_AGENT_WIRING       ← Scaffold (this PR, inactive)
```

`SUPER_CBT_AGENT_WIRING` spreads all fields from V5 and adds:

| New field | Value | Meaning |
|-----------|-------|---------|
| `super_agent` | `true` | Marker: this is a super agent config |
| `super_agent_phase` | `'super.1'` | Phase identifier (beyond Stage 2 phases 1–7) |
| `super_agent_version` | `'0.1.0'` | Semver scaffold version |
| `multilingual_context_enabled` | `false` | Task 3 capability gate (inactive) |
| `protocol_selection_enabled` | `false` | Task 4 capability gate (inactive) |
| `cross_session_continuity_enabled` | `false` | Task 4 capability gate (inactive) |

All other fields (`name`, `stage2`, `stage2_phase`, `memory_context_injection`,
`workflow_engine_enabled`, `workflow_context_injection`, `retrieval_orchestration_enabled`,
`live_retrieval_enabled`, `safety_mode_enabled`, `tool_configs`) are inherited from V5
and are **not changed**.

---

## Entity Access — Identical to V5

No new entity is added to the super agent wiring at scaffold time.
The entity access matrix is inherited from V5:

| Entity | Access Level | Notes |
|--------|-------------|-------|
| SessionSummary | preferred | source_order 2 |
| ThoughtJournal | preferred | source_order 3 |
| Goal | preferred | source_order 4 |
| CoachingSession | preferred | source_order 5 |
| Exercise | allowed | source_order 6 |
| Resource | allowed | source_order 7 |
| AudioContent | allowed | source_order 8 |
| Journey | allowed | source_order 9 |
| CompanionMemory | restricted | source_order 10, read_only |
| MoodEntry | restricted | source_order 11, calibration_only |
| CaseFormulation | restricted | source_order 12, caution_layer, read_only |
| Conversation | restricted | source_order 13, caution_layer, secondary_only |
| ExternalKnowledgeChunk | restricted | source_order 14, external_trusted |

Future phases may add new entity gates — this will require explicit approval per
[`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md).

---

## Routing Architecture

### Current State (Scaffold PR)

```
resolveTherapistWiring()
  │
  ├─ THERAPIST_UPGRADE_ENABLED? ──── false ──→ CBT_THERAPIST_WIRING_HYBRID  (default)
  │
  └─ true → (existing V1–V5 branches only)
              SUPER_CBT_AGENT_WIRING is NOT in this chain yet
```

### Future State (After Task 4 — activation PR)

```
resolveTherapistWiring()
  │
  ├─ THERAPIST_UPGRADE_ENABLED? ──── false ──→ CBT_THERAPIST_WIRING_HYBRID  (default)
  │
  └─ true
       ├─ SUPER_CBT_AGENT_ENABLED? ── true ──→ SUPER_CBT_AGENT_WIRING  (super agent)
       ├─ THERAPIST_UPGRADE_SAFETY_MODE_ENABLED? ─→ V5
       ├─ THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED? ─→ V4
       ├─ THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED? ─→ V3
       ├─ THERAPIST_UPGRADE_WORKFLOW_ENABLED? ─→ V2
       ├─ THERAPIST_UPGRADE_MEMORY_ENABLED? ─→ V1
       └─ (no phase flag) ─→ CBT_THERAPIST_WIRING_HYBRID
```

The super agent branch is placed **first** (highest priority) when enabled, because it
is a strict superset of all lower phases.

---

## Feature Flag Design (Future — Task 4)

When the super agent flag is added in Task 4, it will follow the existing pattern:

```javascript
// In featureFlags.js (Task 4, not this PR):
SUPER_CBT_AGENT_ENABLED:
  import.meta.env?.VITE_SUPER_CBT_AGENT_ENABLED === 'true',
```

Activation rules:
- `THERAPIST_UPGRADE_ENABLED` (master gate) **and** `SUPER_CBT_AGENT_ENABLED` must both be `true`
- Both default to `false`
- Setting `THERAPIST_UPGRADE_ENABLED=false` is a single-switch rollback for the entire upgrade path,
  including the super agent

---

## Multilingual Architecture (Future — Task 3)

All language-aware content will route through the existing i18n layer:

```
User locale  →  i18n key resolution  →  buildSuperAgentSessionStartContent()
                (translations.jsx)       (future: workflowContextInjector.js)
```

Key principles:
- All 7 languages must be present before the feature is activated
- Missing translations fall back to `en` (never produce empty strings)
- Emergency resources remain locale-aware (existing `emergencyResourceLayer.js` is reused)

---

## Safety Inheritance

The super agent path **inherits** all safety layers from V5:

| Layer | Inherited from | Notes |
|-------|---------------|-------|
| Crisis detection (`detectCrisisWithReason`) | Shared — all paths | Not changed |
| Output sanitization (`validateAgentOutput`) | Shared — all paths | Not changed |
| Backend safety filter (`postLlmSafetyFilter`) | Shared — all paths | Not changed |
| Safety mode (`therapistSafetyMode.js`) | V5 | Inherited, not removed |
| Emergency resource layer | V5 | Inherited, not removed |

No safety layer is weakened, removed, or bypassed at any point in the super agent path.

---

## Files Introduced in This PR

| File | Role |
|------|------|
| `src/lib/superCbtAgent.js` | Scaffold module (wiring config + feature descriptor) |
| `test/utils/superCbtAgent.test.js` | Inertia and regression tests |
| `docs/super-agent/README.md` | Overview and roadmap |
| `docs/super-agent/architecture.md` | This file |

**No existing file is modified.**

---

*Last updated: 2026-04-08 — Task 2 scaffold PR*
