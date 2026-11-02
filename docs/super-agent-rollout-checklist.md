# SuperCbtAgent — Post-Merge Rollout Checklist

> **Status: SCAFFOLD ONLY — NOT YET ACTIVATED**
> This checklist governs the safe, gradual rollout of the SuperCbtAgent
> after all scaffold, i18n, logic, and test PRs have been reviewed and merged.
>
> Complete every item in order. Do NOT skip items. Each phase must be signed
> off before the next begins.

---

## Who Must Approve Each Phase

| Phase | Approver Required |
|-------|-------------------|
| Phase 0 — Pre-activation validation | Repository owner |
| Phase 1 — Staging activation | Repository owner + one engineer reviewer |
| Phase 2 — Canary rollout | Repository owner |
| Phase 3 — Gradual ramp | Repository owner + data/safety reviewer |
| Phase 4 — Full activation | Repository owner + two reviewers |
| Rollback (any phase) | Repository owner (unilateral, immediate) |

---

## Phase 0 — Pre-Activation Validation (Before Any Flag Is Enabled)

### Code and Test Completeness

- [ ] All six super agent tasks (Tasks 1–6) have separate reviewed and merged PRs.
- [ ] `npm test` passes with **zero failures** (all unit tests, including super agent tests).
- [ ] `npm run lint` passes with **zero errors**.
- [ ] `npm run build` succeeds without warnings.
- [ ] `npm run test:e2e` passes — including `super-cbt-agent.spec.ts` in English and Hebrew.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] No existing test has been removed, skipped, or weakened.

### Safety and Security Review

- [ ] `docs/copilot-safety-rules.md` reviewed — no rule has been violated.
- [ ] `docs/ai-agent-access-policy.md` reviewed — no entity access was expanded.
- [ ] Private user entities are NOT indexed or retrievable at a shared level:
  - [ ] `ThoughtJournal` ✅ not touched
  - [ ] `Conversation` ✅ not touched
  - [ ] `CaseFormulation` ✅ not touched
  - [ ] `MoodEntry` ✅ not touched
  - [ ] `CompanionMemory` ✅ not touched
  - [ ] `UserDeletedConversations` ✅ not touched
- [ ] `functions/postLlmSafetyFilter.ts` has not been modified.
- [ ] `functions/sanitizeAgentOutput.ts` has not been modified.
- [ ] `functions/sanitizeConversation.ts` has not been modified.
- [ ] `src/api/agentWiring.js` has not been modified.
- [ ] `src/api/activeAgentWiring.js` has not been modified (super agent is still inactive).
- [ ] No secrets, tokens, or credentials are present in any new file.

### i18n Completeness

- [ ] All 7 languages have non-empty `chat.super_cbt_agent` keys: `en`, `he`, `es`, `fr`, `de`, `it`, `pt`.
- [ ] `test/utils/superCbtAgentI18n.test.js` passes (74 tests covering all 7 languages).
- [ ] `npm run test:e2e` passes the Hebrew (he) language suite in `super-cbt-agent.spec.ts`.

### Documentation

- [ ] `docs/super-agent/README.md` reflects the current scaffold status accurately.
- [ ] `docs/super-agent/architecture.md` is up to date.
- [ ] `docs/i18n-super-agent.md` documents all new i18n keys.
- [ ] This checklist (`docs/super-agent-rollout-checklist.md`) has been reviewed and signed off.

---

## Phase 1 — Staging Activation (Staging Environment Only)

> Enable the super agent in a **non-production** staging environment to verify
> end-to-end behavior with real API calls before any production traffic.

### Feature Gating

- [ ] `VITE_SUPER_CBT_AGENT_ENABLED=true` is set ONLY in the staging environment configuration.
- [ ] No production environment variable has been changed.
- [ ] The super agent routing branch has been added to `resolveTherapistWiring()` in
  `activeAgentWiring.js` in a separate reviewed PR — NOT in this checklist's scope.
- [ ] The routing branch is double-gated:
  - [ ] Master upgrade gate (`VITE_THERAPIST_UPGRADE_ENABLED`) must also be `true`
  - [ ] Super agent gate (`VITE_SUPER_CBT_AGENT_ENABLED`) must be `true`
  - [ ] Both defaults remain `false` in source code

### Staging Smoke Tests

- [ ] App boots without console errors in staging (all 7 languages).
- [ ] Super agent indicator (if any) is visible only when the flag is enabled.
- [ ] Crisis detection panel activates correctly in a test Hebrew session.
- [ ] Emergency resources section is correct for Hebrew (`he`) locale.
- [ ] Safety mode activates and displays correctly in Hebrew.
- [ ] Session preamble is generated correctly in English and Hebrew.
- [ ] Existing therapist session behavior is unchanged when `SUPER_CBT_AGENT_ENABLED=false`.

### Telemetry Baseline

- [ ] Baseline metrics captured in staging (before super agent activation):
  - [ ] Session start rate
  - [ ] Session completion rate
  - [ ] Crisis detection trigger rate
  - [ ] Average session length
- [ ] Post-activation metrics captured in staging for comparison.
- [ ] No unexpected increase in error rates observed in staging logs.
- [ ] No unexpected increase in crisis detection triggers observed.

### Fallback Verification

- [ ] Manually set `VITE_SUPER_CBT_AGENT_ENABLED=false` in staging — app reverts to
  standard V5 therapist behavior with zero errors.
- [ ] `isSuperAgentEnabled()` returns `false` immediately after env var is unset and
  the app is rebuilt.
- [ ] Existing session summaries and memory entries are unaffected by the flag change.

---

## Phase 2 — Canary Rollout (≤5% of Production Traffic)

> Enable for a small, monitored subset of production users to detect any
> real-world regressions before wider rollout.

### Pre-Canary Checklist

- [ ] Phase 1 staging results documented and approved by repository owner.
- [ ] Monitoring and alerting configured for:
  - [ ] Error rate increase > 1% → automatic rollback trigger
  - [ ] Crisis detection trigger rate increase > 10% → immediate review
  - [ ] Session completion rate drop > 5% → review before continuing
- [ ] On-call engineer assigned and available for the canary period.
- [ ] Rollback procedure tested and documented (see Rollback section below).

### Canary Activation

- [ ] Feature flag enabled for ≤5% of users via the platform's traffic-splitting mechanism.
- [ ] Language distribution in canary cohort includes at least: `en`, `he`.
- [ ] Canary period minimum: 48 hours before reviewing metrics.

### Canary Monitoring

- [ ] Error rate: no regression vs. baseline.
- [ ] Crisis detection: no unexpected spike.
- [ ] Session completion: within 5% of baseline.
- [ ] User-reported issues: none critical.
- [ ] Hebrew RTL layout: visually correct in production screenshots.
- [ ] Safety mode: triggers and dismisses correctly in both `en` and `he`.

---

## Phase 3 — Gradual Ramp (5% → 25% → 50%)

> Incrementally expand the rollout, pausing at each milestone to review metrics.

### At 25% Rollout

- [ ] Canary metrics reviewed and within acceptable bounds.
- [ ] All language groups (not just `en`, `he`) are sampled in the 25% cohort.
- [ ] Telemetry for all 7 languages reviewed.
- [ ] No new safety or privacy issues identified.
- [ ] Repository owner approval to continue.

### At 50% Rollout

- [ ] 25% metrics reviewed and confirmed stable.
- [ ] Data/safety reviewer sign-off on session quality metrics.
- [ ] i18n coverage confirmed for all 7 languages in production logs.
- [ ] Repository owner approval to continue.

---

## Phase 4 — Full Activation (100%)

> Only after Phases 1–3 are complete and metrics are stable.

### Final Pre-Full-Activation Checklist

- [ ] Phase 3 50% rollout metrics reviewed and approved.
- [ ] Two reviewers (repository owner + one additional) have signed off.
- [ ] All open issues from canary and ramp phases are resolved.
- [ ] Final regression test suite run: `npm test && npm run test:e2e` — all pass.
- [ ] Documentation updated to reflect SuperCbtAgent as the active default:
  - [ ] `docs/super-agent/README.md` status updated from "SCAFFOLD" to "ACTIVE".
  - [ ] `docs/repository-architecture-map.md` updated.
  - [ ] `README.md` updated if applicable.

### Full Activation

- [ ] `VITE_SUPER_CBT_AGENT_ENABLED=true` set in all production environment configurations.
- [ ] Post-activation monitoring period: 72 hours minimum before declaring success.
- [ ] Metrics review at 24h, 48h, and 72h after full activation.

---

## Rollback Procedure

> To be executed by the repository owner at any time, unilaterally, without
> requiring reviewer approval.

### Immediate Rollback (< 5 minutes)

1. Set `VITE_SUPER_CBT_AGENT_ENABLED=false` in the affected environment configuration.
2. Trigger a new build/deployment.
3. Verify `isSuperAgentEnabled()` returns `false` in the running app.
4. Confirm error rates return to pre-activation baseline within 10 minutes.

### Rollback Verification

- [ ] `isSuperAgentEnabled()` returns `false` in production.
- [ ] Error rate returns to pre-activation baseline.
- [ ] Crisis detection rate returns to baseline.
- [ ] Session behavior matches the pre-activation V5 therapist path.
- [ ] No data loss or corruption from the rollback.

### Post-Rollback Actions

- [ ] Root cause analysis documented.
- [ ] Issue filed and linked to this checklist.
- [ ] Fix PRs opened — must follow the same additive, non-breaking approach.
- [ ] Full Phase 0–4 checklist repeated before re-activation.

---

## Telemetry and Observability Requirements

Before any phase beyond Phase 0, the following instrumentation must be in place:

| Metric | Purpose | Alert Threshold |
|--------|---------|----------------|
| `super_agent.session_started` | Tracks super agent session starts | Unexpected drop → investigate |
| `super_agent.preamble_generated` | Preamble was generated (flag on, wiring active) | Unexpected drop → investigate |
| `super_agent.locale_resolved` | Language resolved per session (tag with locale) | Unexpected distribution shift → investigate |
| `super_agent.fallback_used` | Preamble returned '' unexpectedly | Any spike → investigate |
| `therapist.safety_mode_active` | Crisis/safety mode was triggered | Increase > 10% → immediate review |
| `therapist.session_completed` | Session reached a natural end | Drop > 5% → review |

---

## Links and References

- `docs/super-agent/README.md` — Super agent overview and vision
- `docs/super-agent/architecture.md` — Composition and inheritance approach
- `docs/i18n-super-agent.md` — i18n key documentation for all 7 languages
- `docs/analysis-super-agent.md` — Initial agent and i18n analysis
- `docs/copilot-safety-rules.md` — Master safety rules (never relax)
- `docs/ai-agent-access-policy.md` — Agent entity access policy (never expand)
- `src/lib/superCbtAgent.js` — Super agent scaffold module
- `tests/e2e/super-cbt-agent.spec.ts` — E2E tests (en + he)
- `test/utils/superCbtAgent.test.js` — Unit tests: scaffold exports
- `test/utils/superCbtAgentLogic.test.js` — Unit tests: logic and language (en + he)
- `test/utils/superCbtAgentI18n.test.js` — Unit tests: i18n keys (all 7 languages)

---

*Last updated: 2026-04-08 — Task 5 (E2E Testing and Safety Validation) PR*
