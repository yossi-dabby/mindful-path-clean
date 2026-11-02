# AI Runtime Capability Diagnostic

**Version:** 1.0.0  
**Scope:** Read-only, admin-only diagnostic for CBT Therapist and AI Companion runtime state.  
**Status:** Diagnostic only — no therapeutic behavior, prompts, safety logic, or production routing is affected.

---

## Purpose

This diagnostic provides a reliable way for an authenticated admin to determine which AI capabilities are **actually active at runtime**, rather than inferring activation merely from whether environment variables are configured.

A configured secret (environment variable) is **not** the same as an enabled runtime capability. Each backend function reads its specific environment variable and applies an exact `=== 'true'` string check. This diagnostic applies identical semantics.

---

## Files Inspected

| File | Description |
|------|-------------|
| `src/lib/featureFlags.js` | All flag registries: `THERAPIST_UPGRADE_FLAGS` (16), `COMPANION_UPGRADE_FLAGS` (3), `QUALITY_EVALUATOR_FLAGS` (1). Exports `isUpgradeEnabled()`, `isCompanionUpgradeEnabled()`. |
| `src/api/activeAgentWiring.js` | `resolveTherapistWiring()` (14-step priority routing, V1→V12) and `resolveCompanionWiring()` (3-step routing). `ACTIVE_CBT_THERAPIST_WIRING` and `ACTIVE_AI_COMPANION_WIRING` are computed at module load. |
| `src/api/agentWiring.js` | All wiring constants. V12 (`CBT_THERAPIST_WIRING_STAGE2_V12`): `stage2_phase=16`, `planner_first_enabled=true`. HYBRID has no `stage2` fields. |
| `src/lib/workflowContextInjector.js` | `buildActionFirstDemotedSessionContentAsync` applies planner-first instructions universally to all wiring paths in Chat. |
| `src/lib/superCbtAgent.js` | `SUPER_CBT_AGENT_FLAGS.SUPER_CBT_AGENT_ENABLED` reads `VITE_SUPER_CBT_AGENT_ENABLED`. `SUPER_CBT_AGENT_WIRING` is **not** imported in `activeAgentWiring.js`; `resolveTherapistWiring()` has no routing branch for it. |
| `base44/functions/adminFeatureFlags/entry.ts` | Existing admin backend covers only 3 flags. Uses `=== 'true' \|\| === '1'` semantics (differs from new diagnostic). |
| `base44/functions/writeTherapistMemory/entry.ts` | Consumes `THERAPIST_UPGRADE_MEMORY_ENABLED` with `=== 'true'`. |
| `base44/functions/retrieveTherapistMemory/entry.ts` | Consumes `THERAPIST_UPGRADE_MEMORY_ENABLED` with `=== 'true'`. |
| `base44/functions/generateSessionSummary/entry.ts` | Consumes `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` with `=== 'true'`. |
| `base44/functions/writeLTSSnapshot/entry.ts` | Consumes `THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` with `=== 'true'`. |
| `base44/functions/validateTrustedSource/entry.ts` | Requires BOTH `THERAPIST_UPGRADE_ENABLED` AND `THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` `=== 'true'`. |
| `base44/functions/ingestTrustedDocument/entry.ts` | Same compound check as above. |
| `base44/functions/retrieveRelevantContent/entry.ts` | Consumes `KNOWLEDGE_RETRIEVAL_ENABLED` with `=== 'true'`. |
| `base44/functions/upsertKnowledgeIndex/entry.ts` | Consumes `KNOWLEDGE_INDEX_ENABLED` with `=== 'true'`. |
| `src/pages/AdminFeatureFlags.jsx` | Admin page at `/AdminFeatureFlags`. Now includes the `AiRuntimeCapabilitiesPanel`. |
| `src/components/admin/AiRuntimeCapabilitiesPanel.jsx` | **New.** Read-only admin panel. Fails closed for non-admin. |
| `src/lib/runtimeCapabilityDiagnostic.js` | **New.** Frontend snapshot builder. Uses existing resolvers and flag evaluators via DI. Returns frozen object. |
| `base44/functions/adminRuntimeDiagnostic/entry.ts` | **New.** Backend Deno function. Enforces admin gate (403). Returns boolean flags only. |
| `test/utils/runtimeCapabilityDiagnostic.test.js` | **New.** 48 deterministic tests covering all 10 required test requirements. |

---

## Frontend Flags Consumed

All flags are evaluated via `isUpgradeEnabled(flagName)` which reads `import.meta.env?.VITE_<FLAG_NAME>` and checks `=== 'true'`.

### Therapist Upgrade Flags (`THERAPIST_UPGRADE_FLAGS`)

| Flag Key | Env Var | Diagnostic Field |
|----------|---------|-----------------|
| `THERAPIST_UPGRADE_ENABLED` | `VITE_THERAPIST_UPGRADE_ENABLED` | `therapist_master_enabled` |
| `THERAPIST_UPGRADE_WORKFLOW_ENABLED` | `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED` | `workflow_enabled` |
| `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | `VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | `retrieval_orchestration_enabled` |
| `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | `VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | `live_retrieval_enabled` |
| `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | `VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | `safety_mode_enabled` |
| `THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED` | `VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED` | `formulation_context_enabled` |
| `THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` | `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` | `formulation_led_enabled` |
| `THERAPIST_UPGRADE_CONTINUITY_ENABLED` | `VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED` | `continuity_layer_enabled` |
| `THERAPIST_UPGRADE_STRATEGY_ENABLED` | `VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED` | `strategy_layer_enabled` |
| `THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | `VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | `longitudinal_layer_enabled` |
| `THERAPIST_UPGRADE_KNOWLEDGE_ENABLED` | `VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED` | `knowledge_layer_enabled` |
| `THERAPIST_UPGRADE_COMPETENCE_ENABLED` | `VITE_THERAPIST_UPGRADE_COMPETENCE_ENABLED` | `competence_layer_enabled` |
| `THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED` | `VITE_THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED` | `planner_first_enabled` |

Wiring-derived fields (not directly from flags):
- `selected_therapist_wiring` — canonical export name of the resolved wiring (e.g. `CBT_THERAPIST_WIRING_STAGE2_V12`)
- `selected_therapist_stage` — `stage2` or `hybrid`
- `selected_therapist_phase` — human-readable phase description (e.g. `wave5_planner_first`)
- `action_first_demotion_present` — `true` if resolved wiring has `planner_first_enabled === true` (i.e., V12 is selected)

### Companion Upgrade Flags (`COMPANION_UPGRADE_FLAGS`)

| Flag Key | Env Var | Diagnostic Field |
|----------|---------|-----------------|
| `COMPANION_UPGRADE_ENABLED` | `VITE_COMPANION_UPGRADE_ENABLED` | `companion_master_enabled` |
| `COMPANION_UPGRADE_WARMTH_ENABLED` | `VITE_COMPANION_UPGRADE_WARMTH_ENABLED` | `companion_warmth_enabled` |
| `COMPANION_UPGRADE_CONTINUITY_ENABLED` | `VITE_COMPANION_UPGRADE_CONTINUITY_ENABLED` | `companion_continuity_enabled` |

Wiring-derived field:
- `selected_companion_wiring` — canonical export name of the resolved companion wiring

### Super CBT Agent Flags

| Flag Key | Env Var | Diagnostic Field |
|----------|---------|-----------------|
| `SUPER_CBT_AGENT_ENABLED` | `VITE_SUPER_CBT_AGENT_ENABLED` | `super_cbt_flag_configured` |

See [Super CBT Agent section](#super-cbt-agent) below.

---

## Backend Flags Consumed

All flags use exact `=== 'true'` string semantics (matching their consuming functions).

| Env Var | Consuming Function(s) | Diagnostic Field |
|---------|----------------------|-----------------|
| `THERAPIST_UPGRADE_MEMORY_ENABLED` | `writeTherapistMemory`, `retrieveTherapistMemory` | `therapist_memory_backend_enabled` |
| `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` | `generateSessionSummary` | `therapist_summarization_backend_enabled` |
| `THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | `writeLTSSnapshot` | `therapist_longitudinal_backend_enabled` |
| `THERAPIST_UPGRADE_ENABLED` + `THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` | `validateTrustedSource`, `ingestTrustedDocument` | `trusted_ingestion_backend_enabled` |
| `KNOWLEDGE_RETRIEVAL_ENABLED` | `retrieveRelevantContent` | `knowledge_retrieval_backend_enabled` |
| `KNOWLEDGE_INDEX_ENABLED` | `upsertKnowledgeIndex` | `knowledge_index_backend_enabled` |

---

## Configured-but-Unused Secret Names

The following environment variable names were searched across the **entire repository** (all `.ts`, `.js`, `.jsx`, `.jsonc` files) and found in **zero production code paths**:

| Secret Name | Status |
|-------------|--------|
| `THERAPIST_ADVANCED_MEMORY` | `configured_but_unused` |
| `THERAPIST_SESSION_CONTINUITY` | `configured_but_unused` |
| `THERAPIST_KNOWLEDGE_EXPANSION` | `configured_but_unused` |

These names appear in the backend function's `configured_but_unused` response field as documentation. Their values are **never read**. No behavior is created for them. They are not silently mapped to other flags. They must not be deleted from this documentation.

---

## Selected-Route Precedence

`resolveTherapistWiring()` evaluates conditions in this exact order (highest priority first):

1. If `THERAPIST_UPGRADE_ENABLED` is false → **HYBRID** (default)
2. If `THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED` → **V12** (Wave 5 formulation-first planner)
3. If `THERAPIST_UPGRADE_COMPETENCE_ENABLED` → **V11** (Phase 3 competence architecture)
4. If `THERAPIST_UPGRADE_STRATEGY_ENABLED` + `LONGITUDINAL` + `KNOWLEDGE` → **V10** (Wave 4C)
5. If `THERAPIST_UPGRADE_STRATEGY_ENABLED` + `LONGITUDINAL` → **V9** (Wave 3C LTS)
6. If `THERAPIST_UPGRADE_STRATEGY_ENABLED` → **V8** (Wave 2B strategy)
7. If `THERAPIST_UPGRADE_CONTINUITY_ENABLED` → **V7** (Phase 3DP continuity)
8. If `THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` → **V6** (Phase 1Q formulation-led)
9. If `THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED` → **V5** (Phase 7 safety mode proxy)
10. If `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` → **V5** (Phase 7 safety mode)
11. If `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` → **V4** (Phase 6 live retrieval)
12. If `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` → **V3** (Phase 5 retrieval orchestration)
13. If `THERAPIST_UPGRADE_WORKFLOW_ENABLED` → **V2** (Phase 3 workflow engine)
14. Default → **HYBRID**

The diagnostic reports the wiring that **was actually selected** — the resolver is called directly; routing logic is not reimplemented.

`resolveCompanionWiring()` evaluates:
1. If `COMPANION_UPGRADE_ENABLED` + `COMPANION_UPGRADE_CONTINUITY_ENABLED` → **V2** (Phase 3 continuity)
2. If `COMPANION_UPGRADE_ENABLED` + `COMPANION_UPGRADE_WARMTH_ENABLED` → **V1** (Phase 2 warmth)
3. Default → **HYBRID**

---

## Super CBT Agent

`SUPER_CBT_AGENT_WIRING` is defined in `src/lib/superCbtAgent.js` but is **not imported** in `src/api/activeAgentWiring.js`. `resolveTherapistWiring()` contains **no routing branch** for it. The `super_agent: true` marker is present only on `SUPER_CBT_AGENT_WIRING`, which can never be returned by the production resolver in its current state.

The diagnostic distinguishes:
- **`super_cbt_flag_configured`**: Is `VITE_SUPER_CBT_AGENT_ENABLED=true` set in the build environment?
- **`super_cbt_routed_in_production`**: Does the resolved wiring have `super_agent === true`? This is **always `false`** until a separate, explicit activation PR adds the route to `resolveTherapistWiring()`.

The diagnostic does **not** activate the Super CBT Agent.

---

## Configured Secrets ≠ Runtime Activation

This is a critical distinction:

- A Base44 environment variable may be **set** (configured in the dashboard) but still evaluate to `false` if its value is not exactly the string `'true'`.
- A backend function checks `Deno.env.get('FLAG_NAME') === 'true'`. If the variable is set to `'1'`, `'True'`, `'yes'`, or any other value, the flag is **not enabled**.
- The frontend uses `import.meta.env?.VITE_FLAG_NAME === 'true'`. Vite bakes this value at build time; if the build was made with the variable absent or set to a non-`'true'` value, the flag is disabled in that build regardless of the current dashboard setting.
- The existing `adminFeatureFlags` backend function uses `=== 'true' || === '1'` semantics, which differ from the consuming functions. The new diagnostic uses only `=== 'true'` to match the exact semantics of each consuming function.

---

## Rollback Instructions

All changes are **purely additive**. No existing files were modified except:
- `src/pages/AdminFeatureFlags.jsx` — one import and one JSX element added at the end.

To roll back completely:
1. Delete `src/lib/runtimeCapabilityDiagnostic.js`
2. Delete `src/components/admin/AiRuntimeCapabilitiesPanel.jsx`
3. Delete `base44/functions/adminRuntimeDiagnostic/entry.ts`
4. Delete `test/utils/runtimeCapabilityDiagnostic.test.js`
5. Delete this file (`docs/ai-runtime-capability-diagnostic.md`)
6. Revert `src/pages/AdminFeatureFlags.jsx` to remove the `useQuery` import, `const { data: user }` line, and `<AiRuntimeCapabilitiesPanel user={user} />` element, and the `AiRuntimeCapabilitiesPanel` import.

No Base44 entity schemas, agent configurations, safety functions, prompts, or routing behavior was changed. No Base44 deployment step is required for the frontend changes. The new backend function (`adminRuntimeDiagnostic`) must be deployed to Base44 Functions to become active.

---

## Confirmation of Safety

- **No therapeutic behavior changed.** `resolveTherapistWiring()`, `resolveCompanionWiring()`, `postLlmSafetyFilter`, `sanitizeAgentOutput`, `sanitizeConversation`, crisis detection, and emergency resource handling are all unmodified.
- **No feature flags changed.** No flag value, registry, or evaluator was modified.
- **No entity schemas changed.** `src/api/entities/` is unmodified.
- **No agent tool permissions changed.** `src/api/agentWiring.js` is unmodified.
- **No secrets exposed.** All diagnostic fields are boolean or safe string identifiers.
- **Admin-only.** Backend returns 403 for non-admin. Frontend panel returns `null` for non-admin.
- **Fail-closed.** Any error in flag evaluation defaults to `false`. The diagnostic cannot block app startup.
