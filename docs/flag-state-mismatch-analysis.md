# Therapist Feature-Flag State Mismatch Analysis

**Branch:** staging-fresh  
**Date:** 2026-03-25  
**Files audited:** `src/lib/featureFlags.js`, `src/api/activeAgentWiring.js`, `src/api/agentWiring.js`

---

## A. Exact Explanation of the Mismatch

The previous therapeutic-quality audit concluded that *all `VITE_THERAPIST_UPGRADE_*` flags are effectively off and production is running `CBT_THERAPIST_WIRING_HYBRID`*. That conclusion is **correct for code defaults**, but it is not a statement about actual production behavior.

Because all `VITE_*` variables in this codebase are **Vite build-time replacements** (`import.meta.env.VITE_*`), their values are frozen into the compiled JavaScript bundle at the moment `npm run build` runs. They cannot be read from the environment at runtime.

**The mismatch is therefore caused by cause #1: code-level default analysis that ignores actual Railway env state.**

If Railway has any of the `VITE_THERAPIST_UPGRADE_*` variables set *and a build was triggered after setting them*, the deployed bundle has non-default flag values and the app is running the corresponding wiring path — even though the source code defaults are all `false`.

---

## B. Exact Real Flag Resolution Behavior

### When env vars are absent (build-time defaults)

All flags in `THERAPIST_UPGRADE_FLAGS` evaluate to `false`:

```
THERAPIST_UPGRADE_ENABLED                      → false
THERAPIST_UPGRADE_MEMORY_ENABLED               → false
THERAPIST_UPGRADE_SUMMARIZATION_ENABLED        → false
THERAPIST_UPGRADE_WORKFLOW_ENABLED             → false
THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED    → false
THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED → false
THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED    → false
THERAPIST_UPGRADE_SAFETY_MODE_ENABLED          → false
```

`resolveTherapistWiring()` returns `CBT_THERAPIST_WIRING_HYBRID`.  
`ACTIVE_CBT_THERAPIST_WIRING` is frozen to `CBT_THERAPIST_WIRING_HYBRID` at module load.  
Log event emitted: `route_not_selected { reason: 'master_gate_off', path: 'hybrid' }`.

### When specific env vars are present (build-time, Railway)

The four env vars called out in the problem statement control the following behavior:

| Env var | Required companion | Result |
|---|---|---|
| `VITE_THERAPIST_UPGRADE_ENABLED=true` only | — | Master gate on; routing falls through to HYBRID (no phase flag matched). Log: `route_not_selected { reason: 'no_phase_flag_matched' }`. |
| `VITE_THERAPIST_UPGRADE_ENABLED=true` + `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true` | — | Routes to `CBT_THERAPIST_WIRING_STAGE2_V1` (memory layer). `memory_context_injection: true`. |
| `VITE_THERAPIST_UPGRADE_ENABLED=true` + `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true` (only) | — | Routing falls through to HYBRID (summarization is NOT a routing criterion). However, `isSummarizationEnabled()` returns `true` — session-end summarization IS triggered. Memory injection is NOT active (wiring is HYBRID). |
| `VITE_THERAPIST_UPGRADE_ENABLED=true` + `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true` | — | Routes to `CBT_THERAPIST_WIRING_STAGE2_V2` (workflow engine + memory layer). `workflow_context_injection: true`, `memory_context_injection: true`. **This supersedes V1.** |

**Important:** `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` controls session-end structured summarization only. It does **not** affect the wiring selection in `resolveTherapistWiring()`. Setting it without a wiring-level flag (memory or workflow) enables summarization but leaves wiring as HYBRID.

### Routing precedence in `resolveTherapistWiring()`

When the master gate is on, the first matching phase flag wins (highest phase wins):

```
V5 (safety mode)               ← THERAPIST_UPGRADE_SAFETY_MODE_ENABLED
V4 (live retrieval)            ← THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED
V3 (retrieval orchestration)   ← THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED
V2 (workflow engine)           ← THERAPIST_UPGRADE_WORKFLOW_ENABLED
V1 (memory layer)              ← THERAPIST_UPGRADE_MEMORY_ENABLED
HYBRID (fallback)              ← master on, no phase flag matched
HYBRID (fallback)              ← master off
```

Each higher-numbered version is a superset of all lower-numbered versions.

### URL override (staging/preview only)

`_readStagingRuntimeOverrides()` reads `?_s2=FLAG1,FLAG2,...` from the URL. This path is **host-gated** and only active on `localhost`, `127.0.0.1`, and `*.base44.app`. It is **permanently disabled** on any other hostname (including Railway custom production domains). Railway production must always use `VITE_*` build-time env vars.

---

## C. Whether Railway Env Alone Is Sufficient

**Yes**, Railway build-time env vars are sufficient to activate any upgrade path without code changes, with one condition:

> **A new build must be triggered after setting the env vars.** Setting vars in Railway after the build has no effect until the next build.

The specific env vars that control client-side routing (the only ones that affect `resolveTherapistWiring()`) are:

```
VITE_THERAPIST_UPGRADE_ENABLED=true            (master gate — required for all phases)
VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true     (Phase 1 — V1 wiring)
VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true  (Phase 2 — session-end summarization only, not wiring)
VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true   (Phase 3 — V2 wiring, supersedes V1)
```

Server-side Deno function env vars (separate from Railway client build):
```
THERAPIST_UPGRADE_MEMORY_ENABLED=true          (Deno: enables writeTherapistMemory)
THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true   (Deno: enables generateSessionSummary)
```

---

## D. Whether Any Code Change Is Needed

**Yes — one small observability fix was needed.**

The previous code had an ambiguity in the log events emitted by `resolveTherapistWiring()` when the HYBRID fallback is returned. Both fallback paths (master gate off, and master gate on but no phase matched) emitted events that were not clearly distinguishable in observability output:

**Before (ambiguous):**
```js
// master gate on, no phase matched:
logUpgradeEvent('route_not_selected', {
  flag: 'THERAPIST_UPGRADE_ENABLED',
  path: 'current_default_fallback',   // ← different naming
  phase: '0.1',
});

// master gate off:
logUpgradeEvent('route_not_selected', {
  flag: 'THERAPIST_UPGRADE_ENABLED',
  // ← no path field
  phase: '0.1',
});
```

When diagnosing the production mismatch from analytics/log output, it was impossible to tell from these events alone whether HYBRID was returned because (a) the build has all flags off, or (b) the master gate is on but no phase flag was matched.

**After (unambiguous):**
```js
// master gate on, no phase matched:
logUpgradeEvent('route_not_selected', {
  flag: 'THERAPIST_UPGRADE_ENABLED',
  path: 'hybrid',
  reason: 'no_phase_flag_matched',
  phase: '0.1',
});

// master gate off:
logUpgradeEvent('route_not_selected', {
  flag: 'THERAPIST_UPGRADE_ENABLED',
  path: 'hybrid',
  reason: 'master_gate_off',
  phase: '0.1',
});
```

Both events now include a consistent `path: 'hybrid'` and a `reason` field that unambiguously identifies which scenario caused the HYBRID fallback.

This is the only code change needed. All routing behavior is unchanged.

---

## E. Files Changed

- `src/api/activeAgentWiring.js` — log event fields in `resolveTherapistWiring()` fallback paths

---

## F. Exact Diff

```diff
-    logUpgradeEvent('route_not_selected', {
-      flag: 'THERAPIST_UPGRADE_ENABLED',
-      path: 'current_default_fallback',
-      phase: '0.1',
-    });
+    logUpgradeEvent('route_not_selected', {
+      flag: 'THERAPIST_UPGRADE_ENABLED',
+      path: 'hybrid',
+      reason: 'no_phase_flag_matched',
+      phase: '0.1',
+    });
     return CBT_THERAPIST_WIRING_HYBRID;
   }

-  logUpgradeEvent('route_not_selected', {
-    flag: 'THERAPIST_UPGRADE_ENABLED',
-    phase: '0.1',
-  });
+  logUpgradeEvent('route_not_selected', {
+    flag: 'THERAPIST_UPGRADE_ENABLED',
+    path: 'hybrid',
+    reason: 'master_gate_off',
+    phase: '0.1',
+  });
   return CBT_THERAPIST_WIRING_HYBRID;
```

---

## G. PR Base

This PR targets **`staging-fresh`** as required.

---

## H. Conflict Status

- No conflicts with `staging-fresh` (merge was clean).
- No conflicts with `main` (the changed file is not modified on main relative to the merge base).

---

## I. E2E Test Status

The code change alters only the `properties` object passed to `logUpgradeEvent()`. It does not change any routing behavior, wiring selection, or visible UI behavior. All existing tests pass (3,188 tests). E2E tests are unaffected because:

1. No routing behavior changed.
2. `ACTIVE_CBT_THERAPIST_WIRING` still evaluates to `CBT_THERAPIST_WIRING_HYBRID` in CI (no env vars set).
3. E2E tests run against the default HYBRID path.
