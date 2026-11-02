> ⚠️ **ARCHIVED HISTORICAL REFERENCE** — The Git `staging` branch described in this document has been retired. All PRs now target `main` directly. **Do not follow the staging-branch instructions in this file.**

---

# Staging Deployment Guide

> **Status: Preparation only.**
> Stage 2 flags are NOT enabled. App behavior is unchanged.
> This document describes how an external staging deployment must be configured
> so that Stage 2 flag enablement can be validated safely outside Base44 preview.

---

## 1. Branch Strategy

| Branch    | Purpose                                           | Base44 status         |
|-----------|---------------------------------------------------|-----------------------|
| `main`    | Stable production branch — Base44 source of truth | Active (do not touch) |
| `staging` | Rollout-validation branch — external staging only  | Separate from Base44  |

**Key rule:** `staging` is intentionally separate from `main`. Changes merged to
`staging` do not affect Base44 production until they are explicitly merged to `main`.

---

## 2. Platform

This app is a **Vite + React SPA** backed by the **Base44 SDK**. There is no
server-side runtime. The build output is a static bundle served from any static
hosting provider.

No specific deployment platform is prescribed. The build and serve commands are:

```bash
# Production-style build (set env vars before running)
npm run build

# Preview the built bundle locally
npm run preview          # serves on http://localhost:4173
```

---

## 3. Required Environment Variables — Staging

All `VITE_*` variables are **build-time only**. They must be set in the build
environment (CI secrets, platform build settings) **before** `npm run build`
runs. They are baked into the static bundle at build time and cannot be changed
at runtime without a rebuild.

### 3.1 Core App Variables (Required)

| Variable                       | Type        | Description                                                  | Staging value         |
|-------------------------------|-------------|--------------------------------------------------------------|-----------------------|
| `VITE_BASE44_APP_ID`           | Build-time  | Base44 application identifier. Must match the staging app.  | Set to staging app ID |
| `VITE_BASE44_FUNCTIONS_VERSION`| Build-time  | Base44 functions version to use.                            | Omit or set explicitly |
| `BASE44_APP_ID`                | Build-time  | Fallback if `VITE_BASE44_APP_ID` is absent.                 | Set to staging app ID |
| `BASE44_FUNCTIONS_VERSION`     | Build-time  | Fallback if `VITE_BASE44_FUNCTIONS_VERSION` is absent.      | Omit or set explicitly |

### 3.2 Stage 2 Feature Flag Variables (Frontend, Build-time)

All flags default to `false` when the variable is absent or any value other than
`'true'`. The current default therapist path is always active when all flags are
`false`.

> **Do NOT enable any of these flags until Phase 9 exit criteria are met.**
> See `docs/therapist-upgrade-stage2-plan.md §Phase 9`.

| Variable                                                  | Phase            | Description                                          | Staging default |
|-----------------------------------------------------------|------------------|------------------------------------------------------|-----------------|
| `VITE_THERAPIST_UPGRADE_ENABLED`                          | Gate             | Master rollback switch for all Stage 2 behavior      | `false`         |
| `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED`                   | 1                | Structured therapist memory layer                    | `false`         |
| `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED`            | 2                | Session-end structured summarization (client gate)   | `false`         |
| `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED`                 | 3                | Therapist workflow engine                            | `false`         |
| `VITE_THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED`        | 4                | External trusted knowledge ingestion                 | `false`         |
| `VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED`  | 5                | Internal-first retrieval orchestration               | `false`         |
| `VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED`        | 6                | Live retrieval allowlist wrapper                     | `false`         |
| `VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED`              | 7                | Safety mode + emergency resource layer               | `false`         |
| `VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED`      | Phase 1 Quality  | Case formulation context injection at session start (V6 wiring) | `false` |
| `VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED`               | Phase 3 Deep     | Cross-session memory continuity injection at session start (V7 wiring, superset of V6) | `false` |
| `VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED`                 | Wave 2B          | Therapeutic Strategy Layer — V8 route prerequisite. Required together with the master gate before V8+ can activate. | `false` |
| `VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED`             | Wave 3C / V9     | Longitudinal Therapeutic State (LTS) write + read path. With master + strategy + longitudinal flags on, V9 reads the latest valid LTS at session start, passes bounded signals into the strategy engine, and injects the bounded LTS context block. Weak, missing, invalid, or unreadable LTS preserves exact V8 behavior. Requires `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` plus matching backend secrets for the write path. | `false` |
| `VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED`                | Wave 4A scaffold | CBT Knowledge Planner scaffold — gates the pure deterministic planner contract (`src/lib/cbtKnowledgePlanner.js`). **Frontend VITE env only. No backend secret required. No runtime retrieval, no schema changes, no Chat.jsx changes. Zero effect on any live session.** | `false` |
| `VITE_QUALITY_EVALUATOR_ENABLED`                          | Wave 5A scaffold | Quality Evaluator scaffold — gates the pure deterministic evaluator contract (`src/lib/therapistQualityEvaluator.js`). **Isolated registry (QUALITY_EVALUATOR_FLAGS), NOT part of THERAPIST_UPGRADE_FLAGS or COMPANION_UPGRADE_FLAGS. Frontend VITE env only. No runtime wiring, no session-start changes, no diagnostics emission, no Chat.jsx changes. Zero effect on any live session.** | `false` |

> **Flag dependency for continuity read path:**
> `VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED` activates the **read** path (session-start injection from CompanionMemory).
> For that data to exist, `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` must also be enabled (and the matching
> backend Base44 secret — see Section 3.4) so that memory write operations can populate CompanionMemory.
> Enabling only the read flag without the write flag is safe (fail-closed: no data → empty block), but the
> therapist will have no prior session context to inject until at least one write has completed.

> **Phase 3 enrichment (conversation memory write enrichment):**
> When _both_ `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` and `VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED`
> are `true`, Chat.jsx session-end memory writes are automatically enriched with active Goal records
> (→ `goals_referenced`, `follow_up_tasks`) and the most recent CaseFormulation (→ `working_hypotheses`)
> before persistence. This produces richer cross-session continuity context for the next session start.
> No additional flag is required — the enrichment reuses the two existing flags.
> Enrichment is fail-closed: any entity read failure leaves the base payload unchanged.

> **Wave 3C / V9 — LTS write + read path:**
> `VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` is the V9 flag, but V9 activates only when ALL of the following
> frontend flags are true together: `VITE_THERAPIST_UPGRADE_ENABLED`,
> `VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED`, and `VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED`.
> `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` remains the write-path prerequisite because the structured
> session memory write must succeed before the fire-and-forget LTS recompute can run.
> When active, V9 does two additive things:
> 1. After each successful structured session-memory write, it recomputes and upserts one canonical per-user
>    LTS snapshot (`writeLTSSnapshot`).
> 2. At the next session start, it reads the latest valid LTS snapshot, passes only bounded approved signals to
>    the strategy engine, and injects a bounded LTS context block.
>
> The matching backend secrets (`THERAPIST_UPGRADE_LONGITUDINAL_ENABLED=true`,
> `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true`, and `THERAPIST_UPGRADE_MEMORY_ENABLED=true`) must also be set in
> Base44 Application Secrets for the full write/recompute chain to succeed. If the read fails, no valid LTS exists,
> or the LTS is weak (`trajectory=unknown|insufficient_data` or `session_count` below threshold), V9 fails open to
> exact V8 behavior.

> **Wave 4A — CBT Knowledge Planner scaffold:**
> `VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED` gates the pure deterministic CBT knowledge planner
> (`src/lib/cbtKnowledgePlanner.js`). This is a **frontend VITE env only** flag — no backend Base44
> secret is required and no Deno function is called by this scaffold.
> Enabling this flag in isolation has **zero effect** on any live session, agent, user-facing behavior,
> entity schema, or retrieval pipeline. The planner is a standalone pure library with no imports.
> Runtime retrieval wiring is deferred to Wave 4B+.
>
> **Wave 4A.2 — Domain scope alignment (first-wave runtime gate):**
> `CBT_KNOWLEDGE_DOMAINS` is the full planning registry (12 domains).
> `CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE` is the authoritative gate for Wave 4B retrieval wiring
> — it contains only the 8 first-wave safe domains: anxiety, depression, self_esteem, grief, panic,
> social_anxiety, phobia, general.
> `CBT_KNOWLEDGE_DEFERRED_DOMAINS` explicitly names the 4 higher-risk / specialised domains deferred to
> Wave 4C+: trauma (trauma-informed CBT), anger (risk-assessment complexity), relationship (interpersonal
> CBT protocol), ocd (ERP required). Any Wave 4B retrieval wiring layer **must** check
> `CBT_KNOWLEDGE_RUNTIME_ALLOWED_DOMAINS_FIRST_WAVE` before activating retrieval for a given domain.
> No schema changes, no runtime wiring changes, no Chat.jsx changes are made in this pass.

### 3.3 Build Behavior Variables (CI/CD)

| Variable                      | Type        | Description                                              | Staging value |
|-------------------------------|-------------|----------------------------------------------------------|---------------|
| `CI`                          | Build-time  | Enables sourcemaps and disables minification in CI builds | `true`        |
| `BASE44_LEGACY_SDK_IMPORTS`   | Build-time  | Enable legacy Base44 SDK import paths (default: `false`) | `false`       |

### 3.4 Backend Runtime Secrets (Base44 Application Secrets)

These are **not** VITE build-time variables. They are set in the **Base44 Application Secrets** panel
and are read by Deno backend functions at request time via `Deno.env.get()`.

The frontend `VITE_*` flags gate the client-side trigger; the backend secrets gate the Deno execution.
Both must be `true` for a full memory write to succeed.

| Secret name                              | Read by Deno function            | Purpose                                                   | Local / Preview | Staging | Production |
|------------------------------------------|----------------------------------|-----------------------------------------------------------|-----------------|---------|------------|
| `THERAPIST_UPGRADE_MEMORY_ENABLED`       | `retrieveTherapistMemory`        | Gates per-user structured memory retrieval                | `false`         | `false` | `false`    |
| `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED`| `generateSessionSummary`         | Gates session-end memory write to CompanionMemory         | `false`         | `false` | `false`    |
| `THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | `writeLTSSnapshot`               | Gates LTS upsert write to CompanionMemory (Wave 3B)       | `false`         | `false` | `false`    |

> **Important:** `THERAPIST_UPGRADE_CONTINUITY_ENABLED`, `THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED`,
> and `THERAPIST_UPGRADE_KNOWLEDGE_ENABLED` are **frontend-only** VITE flags.
> They have no backend Deno equivalent. `THERAPIST_UPGRADE_KNOWLEDGE_ENABLED` activates only the
> pure deterministic planner scaffold — no Deno function is required at this stage (Wave 4A.1).
> The V7 read path (`readCrossSessionContinuity`) reads CompanionMemory directly via the entity SDK
> — it does not call a backend function.

> **Wave 5A — Quality Evaluator scaffold:**
> `VITE_QUALITY_EVALUATOR_ENABLED` gates the pure deterministic Quality Evaluator scaffold
> (`src/lib/therapistQualityEvaluator.js`). This flag lives in an **isolated registry**
> (`QUALITY_EVALUATOR_FLAGS`) that is completely separate from `THERAPIST_UPGRADE_FLAGS` and
> `COMPANION_UPGRADE_FLAGS`. Enabling this flag in Wave 5A has **zero effect** on any live
> session: the evaluator is not called from any session-start path, diagnostics path, or rollout
> surface. The scaffold exists to validate the contract before wiring begins in a later wave.
> **Frontend VITE env only. No backend Deno equivalent required. No runtime wiring, no Chat.jsx
> changes, no diagnostics emission, no entity changes.**
> Default: `false`. Keep `false` in all environments until Wave 5B wiring is explicitly approved.

> **Recommended initial values** (all environments): `false` — do not enable until the
> Phase 9 exit criteria described in `docs/therapist-upgrade-stage2-plan.md` are met.

---

## 4. Runtime URL Overrides (Staging / Preview Hosts Only)

The app includes a **safe runtime override layer** for recognised
preview/staging hosts. This allows flags to be enabled without a rebuild,
which is useful for iterative staging validation.

**Recognised hosts where overrides are active:**
- `localhost`
- `127.0.0.1`
- `*.base44.app`
- `base44.app`

**URL override format:**
```
https://<staging-host>/?_s2=FLAG1,FLAG2,...
```

**Example — enable master gate and memory phase on a Base44 staging host:**
```
https://myapp.base44.app/?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED
```

**Safety rules:**
- Unrecognised hosts (including any custom production domain) are **always
  fail-closed** — overrides are silently ignored.
- Overrides can only **enable** flags (set to `true`). They cannot disable a
  flag that was enabled at build time.
- Unknown flag names are silently ignored.

**Diagnostic mode** (shows unified flag evaluation state for both Therapist and Companion in the browser console):
```
https://<staging-host>/?_s2debug=true
```

This opens two console groups:
- `[Activation Diagnostics]` — Phase 4 unified surface covering Therapist (10 flags) + Companion (3 flags), with `routeHint` for each agent.
- `[S2 Diagnostics]` — Legacy therapist-only group (unchanged, retained for compatibility).

> **Note:** If the external staging deployment uses a custom domain that is NOT
> a `*.base44.app` subdomain, URL overrides will not be active on that host.
> In that case, all staging flag enablement must be done via build-time env vars
> (`VITE_THERAPIST_UPGRADE_*`).

---

## 5. How Staging Remains Separate From Base44 / main

1. **Branch isolation:** The `staging` branch is not merged to `main` without
   explicit review. Base44 always pulls from `main`.

2. **App ID isolation:** Use a separate `VITE_BASE44_APP_ID` for the staging
   deployment. Do not point the staging build at the production Base44 app.

3. **Flag defaults:** All Stage 2 flags default to `false` at build time. The
   production build on `main` is unaffected by anything done on `staging`.

4. **CI separation:** GitHub Actions workflows run independently on `staging`
   pushes and PRs. A failing staging CI run does not block `main`.

5. **No runtime routing changes:** The app does not change its Base44 routing
   or auth based on the environment. The only staging-specific behavior is
   flag evaluation.

---

## 6. Stage 2 Verification Steps (How to Validate in Staging)

These steps verify that Stage 2 flag infrastructure is working correctly in the
external staging environment, **without enabling any Stage 2 behavior in
production**.

### Step 1 — Verify flag system is wired (all flags off)

1. Deploy the `staging` branch with all `VITE_THERAPIST_UPGRADE_*` and
   `VITE_COMPANION_UPGRADE_*` vars absent (or explicitly set to `false`).
2. Open the app on the staging host.
3. Add `?_s2debug=true` to the URL.
4. Open the browser console.
5. Confirm the `[Activation Diagnostics]` output shows (Phase 4 unified check):
   - `[Therapist]` section: `masterGateOn: false`, `routeHint: 'HYBRID (master gate off)'`, all flags `false`
   - `[Companion]` section: `masterGateOn: false`, `routeHint: 'HYBRID (master gate off)'`, all flags `false`

### Step 2 — Verify URL override layer (on recognised staging host only)

1. Add `?_s2=THERAPIST_UPGRADE_ENABLED&_s2debug=true` to the staging URL.
2. Confirm the `[Activation Diagnostics]` `[Therapist]` section shows:
   - `masterGateOn: true`
   - `routeHint: 'HYBRID (master gate on, no phase flag matched)'`
   - `THERAPIST_UPGRADE_ENABLED: true` in `computedFlags`
   - All per-phase therapist flags remain `false`
3. Confirm the `[Companion]` section is **unchanged** (all flags still `false`).

### Step 2b — Verify Companion URL override layer

1. Add `?_c2=COMPANION_UPGRADE_ENABLED&_s2debug=true` to the staging URL.
2. Confirm the `[Activation Diagnostics]` `[Companion]` section shows:
   - `masterGateOn: true`
   - `routeHint: 'HYBRID (master gate on, no phase flag matched)'`
   - `COMPANION_UPGRADE_ENABLED: true` in `computedFlags`
3. Confirm the `[Therapist]` section is **unchanged** (all flags still `false`).

### Step 3 — Verify build-time flag injection

1. Rebuild the staging deployment with
   `VITE_THERAPIST_UPGRADE_ENABLED=true` set in the build environment.
2. Add `?_s2debug=true` to the URL (no `_s2` param needed).
3. Confirm in the `[Therapist]` section:
   - `masterGateOn: true`
   - `THERAPIST_UPGRADE_ENABLED: true` in `computedFlags`
4. Confirm the `[Companion]` section remains all `false`.

> **Stop here.** Do not enable per-phase flags until the Phase 9 exit criteria
> in `docs/therapist-upgrade-stage2-plan.md` are confirmed complete.

---

## 7. CI on the staging Branch

The following workflows run automatically on every push to `staging` and on
every pull request targeting `staging`:

| Workflow              | File                                   | What it validates                           |
|-----------------------|----------------------------------------|---------------------------------------------|
| Test Suite            | `.github/workflows/webpack.yml`        | Unit tests + Vite build (Node 20 and 22)    |
| Playwright E2E Tests  | `.github/workflows/playwright.yml`     | Smoke tests + web-desktop + mobile-390x844  |

CI on `staging` is non-blocking for `main`. A failing `staging` CI run does not
prevent merges to `main`.

---

## 8. What Must NOT Be Changed to Enable Staging

The following are **frozen** regardless of staging work. Do not modify them as
part of staging deployment preparation:

- `src/api/entities/` — Base44 entity schemas
- `src/api/agentWiring.js` — Agent wiring configuration
- `src/api/activeAgentWiring.js` — Active agent routing
- `src/api/base44Client.js` — SDK client configuration
- `functions/` — Production backend functions
- Any Stage 2 flag values in `src/lib/featureFlags.js`
- Any therapist prompt or agent instruction

---

*Last updated: 2026-04-12 — Wave 5A Quality Evaluator scaffold added. Stage 2 not enabled.*
