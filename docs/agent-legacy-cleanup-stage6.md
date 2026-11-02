# Archived Agent and Legacy Runtime Cleanup — Stage 6

## Current decision

Do not delete any archived Base44 agent yet. Keep `ai_companion` and the three historical CBT
profiles as inert records so historical conversations remain identifiable.

The application runtime mounts exactly two agents: `ai_coach` and `cbt_therapist`.
`ai_companion` is not mounted, has no tools, has memory disabled, and is excluded from the
active benchmark. The three historical therapist profiles have the same archive restrictions.

## Inventory result

A source inventory on 2026-10-09 found 41 files outside the archived agent definitions that
still contain `ai_companion`. They fall into four groups:

| Group | Examples | Action |
|---|---|---|
| Unmounted UI | `src/components/ai/DraggableAiCompanion.jsx` | Remove only after route/import and historical-data checks |
| Compatibility/wiring | `src/api/agentWiring.js`, `src/lib/runtimeCapabilityDiagnostic.js` | Retain until historical conversation and diagnostic migrations are proven |
| Backend/legacy validation | `goldenScenarios`, `validateAgentPolicy`, retention tests | Migrate assertions before removal; never delete blindly |
| Historical tests/docs | upgrade waves, policy documents | Archive or relabel after runtime code is stable |

## Safe cleanup waves

1. Prove no mounted layout, route, button, automation, or backend invocation starts
   `ai_companion`.
2. Add a compatibility fixture for an existing archived conversation and verify that it remains
   readable after each cleanup wave.
3. Remove only unreachable UI code and its exclusive tests in a small PR.
4. Replace legacy policy helpers with the current two-agent policy, then remove their exclusive
   tests in a separate PR.
5. Move historical documentation to an archive without rewriting audit evidence.
6. Keep the Base44 agent record unless Base44 confirms deletion cannot break conversation
   lookup; deletion is not required to complete code cleanup.

Each wave requires Test Suite, Playwright, Base44 preview, web/Android smoke tests, and an
immediate revert path. This document authorizes no deletion by itself.

