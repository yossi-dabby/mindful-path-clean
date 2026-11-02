## ⚠️ Branch Target Check
<!-- STOP — confirm the base branch before opening this PR -->
- [ ] This PR targets **`main`** — all PRs now target `main` directly (the Git `staging` branch has been retired)

> See `CONTRIBUTING.md` and `docs/copilot-pr-workflow.md` (Section 0) for the full branch policy.

---

## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
<!-- Mark the relevant option with an 'x' -->
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Other (please describe)

## Assumptions Made
<!-- Document every assumption you made about how a function, entity, or agent works -->
<!-- If you assumed something you could not directly verify, write it here -->

## Safety Impact
<!-- Answer each question; if any answer is Yes, a human reviewer must sign off before merge -->
- Does this change affect any safety-critical file (`postLlmSafetyFilter`, `sanitizeAgentOutput`, `sanitizeConversation`, `backfillKnowledgeIndex`, `agentWiring`)? **Yes / No**
- Does this change expand retrieval scope (add an entity to any pipeline)? **Yes / No**
- Does this change affect private user entity access (`ThoughtJournal`, `Conversation`, `CaseFormulation`, `MoodEntry`, `CompanionMemory`, `UserDeletedConversations`)? **Yes / No**
- Does this change alter agent tool access or agent boundaries? **Yes / No**
- Does this change affect any UI, route, layout, or navigation? **Yes / No**
- Does this change modify any Base44 entity schema? **Yes / No**

## Testing Checklist
<!-- Mark completed items with an 'x' -->
- [ ] Unit tests pass locally (`npm test`)
- [ ] E2E tests pass locally (`npm run test:e2e`)
- [ ] Lint checks pass (`npm run lint`)
- [ ] Type checks pass (`npm run typecheck`) — **informational; currently non-blocking** (see `docs/typecheck-debt-baseline.md`)
- [ ] Build succeeds (`npm run build`)

## E2E Testing
<!-- For E2E test instructions, see the "Running E2E Tests" section in README.md -->
- [ ] E2E tests have been reviewed/updated for this change
- [ ] Tests pass with default configuration (Vite preview server)
- [ ] Tests pass against custom BASE_URL (if applicable)

## Assertion Quality Reviewer Checklist
<!-- Complete this section when this PR adds, modifies, or removes any E2E or unit test assertion. Otherwise delete it. -->
- [ ] Did this PR weaken any existing assertion? If yes, is the reason documented with artifact evidence?
- [ ] Does each new or modified assertion still prove the intended behavior (not just text presence)?
- [ ] Did this PR replace behavior validation (DOM state, data-testid, attribute) with text-only validation?
- [ ] Did this PR add `test.skip` or `test.fixme` to any committed test?
- [ ] Does the PR description still accurately reflect the final diff?

> **Reminder:** A failing test is a signal — fix the root cause, not the assertion.
> See `docs/copilot-pr-workflow.md` §12 for the full Playwright / E2E guardrails.

## Human Review Required
<!-- Check all that apply; checked items require a human reviewer to sign off -->
- [ ] This PR modifies a safety-critical backend function
- [ ] This PR modifies entity schemas or agent wiring
- [ ] This PR expands retrieval or indexing scope
- [ ] This PR touches more than one high-scrutiny path
- [ ] I am uncertain about the safety impact of this change

<!-- If any box above is checked AND the change touches a safety-filter file, complete docs/safety-filter-review-checklist.md before requesting review -->

## Therapeutic Forms Changes
<!-- Complete this section only if this PR changes forms assets, registry, index, AI access, Chat attachments, or Forms Library behavior. Otherwise delete this section. -->
- [ ] This PR changes therapeutic forms assets, registry, index, AI access, Chat attachments, or Forms Library behavior.
- [ ] I completed the checklist in `docs/therapeutic-forms-upload-readiness.md`.
- [ ] I ran `npm run generate:forms-index` and `npm run check:forms-index` — both pass.
- [ ] I verified no orphan or missing PDFs in `public/forms/`.
- [ ] I verified language gating (Hebrew forms only in Hebrew mode; English only in English mode).
- [ ] I verified AI awareness if forms or AI access changed.
- [ ] I verified Open vs Download if attachment behavior changed.
- [ ] I did not weaken assertions or skip tests.
- [ ] PR description matches the actual final diff.

> **Reminder:** Do not use parity exclusions to hide missing registrations. Fix the registration, or document the intentional unregistered asset with explicit evidence.

---

## Additional Notes
<!-- Any additional context, screenshots, or information -->
