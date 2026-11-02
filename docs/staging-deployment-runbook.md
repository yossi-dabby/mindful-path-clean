> ⚠️ **ARCHIVED HISTORICAL REFERENCE** — The Git `staging` branch described in this document has been retired. All PRs now target `main` directly. **Do not follow the staging-branch instructions in this file.**

---

# Staging Deployment Runbook

> **Scope:** External staging deployment preparation only.
> **Do not begin rollout.** Do not enable any Stage 2 flags. Do not change app logic.
> **Base44 / `main` must remain completely untouched throughout this process.**

---

## 1 — Branch

Deploy from the **`staging`** branch only.

```
git checkout staging
git pull origin staging
```

Never deploy from `main` for this process.

---

## 2 — Build

```bash
npm ci
npm run build
```

The compiled output is written to **`dist/`** (Vite default; no custom `outDir` is configured in `vite.config.js`).

Point your hosting provider's publish directory at `dist/`.

---

## 3 — Environment Variables

Copy environment variables from the project's secure secret store into your staging environment.

### Required base variable

| Variable | Purpose |
|---|---|
| `VITE_BASE44_APP_ID` | Base44 application identifier (staging environment value) |

> Use the **staging** value of `VITE_BASE44_APP_ID`, never the production value.

### Stage 2 flags — all must be absent or explicitly `false`

Do **not** set any of the following variables in the initial staging deployment.
Omitting a variable is equivalent to `false`.

| Variable | Initial value |
|---|---|
| `VITE_THERAPIST_UPGRADE_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED` | _(unset — do not add)_ |
| `VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | _(unset — do not add)_ |

When all Stage 2 flags are absent (or `false`), the app routes every session through the current default therapist path (`CBT_THERAPIST_WIRING_HYBRID`). No Stage 2 code is reachable.

See `src/lib/featureFlags.js` for the full flag registry and evaluation rules.

### Backend Base44 secrets — all must be absent or explicitly `false`

These are **not** VITE build-time variables. They are set in the **Base44 Application Secrets** panel
and read by Deno backend functions. They must also be `false` in the initial deployment.

| Secret name | Function | Initial value |
|---|---|---|
| `THERAPIST_UPGRADE_MEMORY_ENABLED` | `retrieveTherapistMemory` | _(unset — `false`)_ |
| `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` | `generateSessionSummary` | _(unset — `false`)_ |
| `THERAPIST_UPGRADE_LONGITUDINAL_ENABLED` | `writeLTSSnapshot` | _(unset — `false`)_ |

> `THERAPIST_UPGRADE_CONTINUITY_ENABLED` and `THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED`
> have **no backend equivalent** — they are frontend-only VITE flags. Do not create backend
> secrets with those names.

---

## 4 — Verify the Deployed App Loads Correctly

### 4a — Smoke tests (automated)

Run the read-only smoke test suite against the deployed staging URL before any rollout:

```bash
BASE_URL=https://<your-staging-url> npm run test:e2e -- --project=smoke-production-critical
```

All smoke tests must pass. These tests verify:
- The app loads and React hydrates correctly.
- The home page renders without errors.
- Basic navigation works (Home → Goals → Home).

### 4b — Flag-state check (manual, ~30 seconds)

Open the staging URL in a browser and append `?_s2debug=true` to the address:

```
https://<your-staging-url>/?_s2debug=true
```

Open the browser developer console. You should see an `[Activation Diagnostics]` group
(Phase 4 unified surface) with output similar to:

```
[Activation Diagnostics] Therapist + Companion upgrade state
  hostname              : <your-staging-url>
  isPreviewStagingHost  : true
  snapshotTimestamp     : 2026-...

  [Therapist]
    computedFlags       : { THERAPIST_UPGRADE_ENABLED: false, ... }
    masterGateOn        : false
    routeHint           : HYBRID (master gate off)

  [Companion]
    computedFlags       : { COMPANION_UPGRADE_ENABLED: false, ... }
    masterGateOn        : false
    routeHint           : HYBRID (master gate off)
```

You will also see the legacy `[S2 Diagnostics]` group (therapist-only, unchanged).

**Every flag in both sections must show `false`.** Both `routeHint` values must
read `HYBRID (master gate off)`.
If any flag shows `true`, stop and recheck the environment variable configuration before continuing.

### 4c — PDF viewer worker MIME QA signal (temporary)

When opening a worksheet PDF in staging/preview, a temporary runtime QA banner may appear:

- **Title:** `PDF viewer deployment issue`
- **Meaning:** the PDF.js worker is likely mis-served (wrong MIME/content-type or worker URL resolution), so this is likely a platform deployment/configuration issue rather than a bad worksheet PDF file.
- **Diagnostics shown in the banner/logs:** worker URL, detected content-type (if available), and viewer build marker.

If this banner appears, treat it as a deployment/platform investigation signal first; do not classify it as worksheet content corruption unless the worker diagnostics are clean.

---

## 5 — How Step 1 (Phase 1 — Memory) Will Later Be Validated in Staging

> This section documents the future validation step only. Do not perform it now.

When the team is ready to validate Phase 1 in staging, use the runtime URL override
(which works only on recognised staging/preview hosts):

```
https://<your-staging-url>/?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED
```

This enables only the master gate and the memory flag at runtime without a new build.
After the validation session, remove the `?_s2=…` parameter to return to default mode.

Validation criteria for Phase 1 are defined in `docs/therapist-upgrade-stage2-plan.md`.

---

## 6 — Base44 / `main` Must Remain Untouched

- The `main` branch and the Base44 production environment must not be modified at any point during this process.
- All changes (env vars, deploys, flag tests) are isolated to the external staging environment connected to the `staging` branch.
- No Base44 entity schemas, automations, or agent configurations should be altered.

---

## 7 — Rollback

If anything is wrong after deploying staging:

1. **Remove all `VITE_THERAPIST_UPGRADE_*` and `VITE_COMPANION_UPGRADE_*` environment variables** from the staging environment (or set every one explicitly to `false`).
2. Trigger a redeploy of the `staging` branch with the clean env configuration.
3. Re-run the smoke tests and the `?_s2debug=true` check to confirm all flags are `false` in both Therapist and Companion sections.
4. **Never touch `main` or the Base44 production environment as a rollback step.** Rollback is always limited to the staging deployment only.

---

## 8 — Checklist

Before declaring staging ready:

- [ ] Deployed from the `staging` branch
- [ ] `npm ci && npm run build` completed without errors
- [ ] Hosting provider publish directory set to `dist/`
- [ ] Staging value of `VITE_BASE44_APP_ID` configured
- [ ] No `VITE_THERAPIST_UPGRADE_*` variable is set (or all are explicitly `false`)
- [ ] Smoke tests passed: `BASE_URL=<staging-url> npm run test:e2e -- --project=smoke-production-critical`
- [ ] `?_s2debug=true` check confirms all flags `false` and both `routeHint` values are `HYBRID (master gate off)` (Therapist + Companion sections)
- [ ] PDF worksheet open flow does not show the temporary `PDF viewer deployment issue` worker MIME banner
- [ ] `main` branch and Base44 production environment are untouched

---

*Last updated: 2026-07-12*
