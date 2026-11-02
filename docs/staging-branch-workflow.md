> ⚠️ **ARCHIVED HISTORICAL REFERENCE** — The Git `staging` branch described in this document has been retired. All PRs now target `main` directly. **Do not follow the staging-branch instructions in this file.**

---

# Staging Branch Workflow

## Branch Responsibilities

| Branch | Purpose | Who Uses It |
|--------|---------|-------------|
| `main` | Stable production branch — Base44 runtime reads from here | Base44 platform, production deployment |
| `staging` | Rollout-validation branch — external staging deployment targets this | QA, pre-production review |

### `main` — Stable / Base44 branch

- Base44 reads entity schemas, agent wiring, and backend functions from `main`.
- **Do not push directly to `main`.** All changes must go through a PR that has passed staging validation.
- `main` is always deployable. It must never be in a broken state.

### `staging` — Rollout-validation branch

- External staging deployment connects to `staging`, not to `main`.
- All proposed changes are merged to `staging` first and validated there.
- After staging validation passes, a PR is opened from `staging` → `main`.
- Stage 2 flags (and any new feature flags) must **remain disabled by default** on both branches.

---

## Environment Separation

External staging deployment must use **staging-specific secrets** that are separate from production secrets.

- Production secrets (Base44 API keys, billing keys, auth credentials) must never be used in the staging environment.
- Staging secrets are stored in the GitHub repository's `staging` environment (or equivalent secret store), not in `main`-targeted environments.
- Never commit secrets, tokens, or credentials to any branch.

---

## Merge Discipline

Changes flow in one direction only:

```
feature branch → staging (validate) → main (promote)
```

1. Open a PR targeting `staging`.
2. CI must pass on `staging` (unit tests + E2E smoke tests).
3. Manual validation on the external staging deployment must pass.
4. Open a second PR from `staging` → `main` only after step 3 confirms green.
5. **Do not merge to `main` if staging validation has not passed.**

---

## Rollback Discipline

- **On `staging`:** Revert the offending commit or PR on `staging`. Re-deploy staging. Re-validate.
- **On `main`:** If a bad commit reaches `main`, open an emergency revert PR immediately. Do not hotfix forward on `main` unless the revert is impossible.
- Base44 entity schema changes are irreversible once live — always validate schema-adjacent work on `staging` first.
- Keep the `staging` branch within a small number of commits ahead of `main` to minimize rollback scope.

---

## What Must Never Change Without Explicit Approval

The following are frozen on both `staging` and `main` unless explicitly approved:

- `src/api/entities/` — Base44 entity schemas
- `src/api/agentWiring.js` and `src/api/activeAgentWiring.js` — agent wiring
- `functions/postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, `sanitizeConversation.ts` — safety-critical functions
- Any Stage 2 feature flag (must remain `false` by default on all branches)

---

## CI Workflows

Both `.github/workflows/playwright.yml` (E2E tests) and `.github/workflows/webpack.yml` (unit tests + build) run on push/PR to `main`, `master`, `develop`, and **`staging`**.

All CI checks must pass on `staging` before a `staging → main` PR is opened.

---

*Last updated: 2026-03-20*
