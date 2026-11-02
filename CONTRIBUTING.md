# Contributing to Mindful Path

> This is a production-sensitive CBT application serving real users.
> Please read this document fully before opening any pull request.

---

## Branch Policy — Main Only

**All PRs must target `main`.** The Git `staging` branch has been retired and must not be recreated or targeted.

| Branch | Role |
|---|---|
| `main` | Stable, Base44-connected production branch. All PRs target here directly. |

### Rules

1. **Target `main`** for all work — there is no intermediate branch.
2. **Changes reach `main` through reviewed PRs with required CI validation** (lint, unit tests, build, E2E).
3. **Do not create, recreate, target, or require the `staging` Git branch.**
4. **Follow-up corrections to an open PR must update the same PR** unless the owner explicitly requests a separate PR.

---

## Safety Rules (Short Version)

- Do not modify `functions/postLlmSafetyFilter.ts`, `functions/sanitizeAgentOutput.ts`, or `functions/sanitizeConversation.ts` without explicit written approval.
- Do not modify `src/api/entities/` (entity schemas) without explicit written approval.
- Do not modify `src/api/agentWiring.js` or `src/api/activeAgentWiring.js` without explicit written approval.
- Do not expand retrieval scope or add private user entities to any shared pipeline.
- Do not commit secrets, credentials, or API keys.

For the full safety rule set, see `docs/copilot-safety-rules.md`.

---

## Before Opening a PR

1. Confirm your PR targets **`main`**.
2. Run `npm run lint` — zero errors required.
3. Run `npm test` — all tests must pass.
4. Run `npm run build` — build must succeed.
5. Fill out the PR template completely (`.github/pull_request_template.md`).

---

## Further Reading

- `docs/base44-preview-only-reentry-guardrails.md` — Recovery Stage 4 guardrails (GitHub source-of-truth + Base44 preview-only)
- `.github/copilot-instructions.md` — master Copilot instruction set
- `docs/copilot-pr-workflow.md` — full PR and review workflow (including branch policy)
- `docs/copilot-safety-rules.md` — safety rules quick reference
- `docs/ai-agent-access-policy.md` — agent entity access policy
