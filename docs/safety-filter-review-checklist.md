# Safety Filter Review Checklist — Mindful Path CBT App

> **This checklist is mandatory for any PR that touches a safety-critical file.**
> Complete every section before requesting merge. Do not skip items.
> If any answer raises doubt, stop and request explicit human approval.

---

## Who Must Use This Checklist

Use this checklist for every PR that modifies, refactors, or touches:

| File | Safety Role |
|---|---|
| `functions/postLlmSafetyFilter.ts` | Platform-level LLM output filter — strips internal reasoning from every response |
| `functions/sanitizeAgentOutput.ts` | Backend fail-safe sanitizer for agent messages |
| `functions/sanitizeConversation.ts` | Recovery sanitizer for corrupted conversation content |
| `functions/enhancedCrisisDetector.ts` | LLM-based crisis classification (SEVERE / HIGH / MEDIUM / NONE) |
| `functions/runSafetyTestSuite.ts` | Safety test orchestrator (golden scenarios, red-teaming, compliance) |
| `functions/safetyGoldenScenarios.ts` | Golden test scenario definitions for crisis, refusals, and bypass attempts |
| `functions/testReasoningFilter.ts` | Test harness for reasoning filter validation |
| `functions/redTeamingTests.ts` | Adversarial test patterns (25+ attack vectors) |
| `src/api/agentWiring.js` | CBT Therapist and AI Companion entity/tool access wiring |
| `src/api/activeAgentWiring.js` | Active runtime wiring for both agents |

Also use this checklist when a PR:
- Changes crisis detection thresholds, confidence levels, or severity classifications
- Changes the list of forbidden patterns, reasoning markers, or sanitization rules
- Changes which agents have access to which entities or tools
- Changes the order in which safety filters are applied
- Introduces a new function that participates in the safety pipeline

---

## Section 1 — Scope Identification

Before reviewing any logic, confirm the scope of the change.

- [ ] **Which file(s) changed?** List them explicitly.
- [ ] **What safety role does each changed file serve?**
  - Output filtering (strips leaked reasoning / meta-commentary)?
  - Crisis detection (classifies distress severity)?
  - Sanitization (removes harmful or malformed content)?
  - Test harness (validates that safety behavior holds)?
  - Agent wiring (controls what agents can access)?
- [ ] **What category of change was made?** Select all that apply:
  - [ ] Logic change (algorithm, condition, control flow)
  - [ ] Configuration change (thresholds, pattern lists, confidence values)
  - [ ] Prompt or instruction text change (LLM system prompt, few-shot examples)
  - [ ] Sanitization rule change (patterns added, removed, or reordered)
  - [ ] Crisis classification change (severity levels, label definitions)
  - [ ] Output filter change (what is stripped, when, how)
  - [ ] Failsafe behavior change (what happens on error or short output)
  - [ ] Test scenario change (golden scenarios, red-team patterns)
  - [ ] Agent access change (entity list, tool list, retrieval scope)
  - [ ] Comment or documentation-only change (no logic impact)
- [ ] **Is this a docs-only or comment-only change?**
  - If yes, no further safety checklist items are required — proceed directly to merge guidance.
  - If no, continue through all sections.

---

## Section 2 — Approval Requirements

Safety-critical files require structured approval. Do not proceed to merge without satisfying the relevant approval gate.

| Change Type | Approval Required | Second Reviewer Required |
|---|---|---|
| Comment / docs only | None | No |
| Test-only (additive golden scenarios) | Author confirms additive only | Recommended |
| Behavior-preserving refactor | Explicit human approval | Yes |
| Threshold / confidence value change | Explicit human approval | Yes |
| Pattern list change (add or remove rules) | Explicit human approval | Yes |
| Logic change in filter or detector | Explicit human approval | Yes — mandatory |
| Failsafe behavior change | Explicit human approval | Yes — mandatory |
| Agent entity or tool access change | Explicit human approval | Yes — mandatory |
| Any change to `postLlmSafetyFilter.ts` | Explicit human approval always | Yes — mandatory |
| Any change to `sanitizeAgentOutput.ts` | Explicit human approval always | Yes — mandatory |
| Any change to `sanitizeConversation.ts` | Explicit human approval always | Yes — mandatory |
| Any change to `enhancedCrisisDetector.ts` | Explicit human approval always | Yes — mandatory |

**Never merge casually if:**
- The change affects which patterns are stripped from LLM output
- The change affects how crisis severity is classified
- The change affects whether a refusal is issued
- The change affects whether a sanitization step runs at all
- The change modifies the failsafe path (the fallback when output is too short or filtering fails)
- The change removes or reorders any existing safety filter step

---

## Section 3 — Safety Review Questions

Answer every question before approving the PR. For any "Yes" answer, document your reasoning below the question.

### 3.1 Output Filtering

- [ ] Does this change weaken refusal behavior?
  _(e.g., fewer patterns stripped, looser matching, filter disabled for certain conditions)_
- [ ] Does this change cause the filter to run less often or be skipped?
- [ ] Does this change expose system prompt text, reasoning steps, or internal instructions to end users?
- [ ] Does this change expose private content (user journal entries, session notes, personal data) in agent output?
- [ ] Does this change affect the failsafe behavior — what the system outputs when the safety filter clears too much text?
- [ ] Does this change alter the order in which filter rules are applied?

### 3.2 Crisis Detection

- [ ] Does this change weaken crisis escalation?
  _(e.g., lower confidence threshold, fewer crisis-labeled phrases, SEVERE reclassified to HIGH or lower)_
- [ ] Does this change increase the false-negative rate for crisis detection?
  _(i.e., more cases that should trigger a crisis response will now be missed)_
- [ ] Does this change alter the failsafe — the behavior when the LLM-based detector fails or errors?
  _(The current failsafe is `is_crisis: false`; this must not be changed to expose users to undetected risk)_
- [ ] Does this change allow bypass of crisis detection through prompt injection, spacing, or punctuation tricks?
- [ ] Does this change reduce the number of severity levels or merge categories in a way that loses precision?

### 3.3 Sanitization

- [ ] Does this change weaken sanitization?
  _(e.g., fewer forbidden patterns, looser regex, patterns removed)_
- [ ] Does this change allow any category of unsafe content to pass through that was previously blocked?
- [ ] Does this change skip sanitization for certain message types, roles, or conditions?
- [ ] Does this change affect Hebrew-language sanitization or the Hebrew failsafe message?

### 3.4 Agent Boundaries

- [ ] Does this change alter which entities the CBT Therapist or AI Companion can access?
- [ ] Does this change add new tools to either agent?
- [ ] Does this change expand retrieval scope — adding any entity to an indexing or retrieval pipeline?
- [ ] Does this change allow either agent to access a private user entity at a shared or cross-user level?
  _(Private entities: `ThoughtJournal`, `Conversation`, `CaseFormulation`, `MoodEntry`, `CompanionMemory`, `UserDeletedConversations`)_
- [ ] Does this change blur the boundary between the CBT Therapist (clinical) and the AI Companion (supportive)?

### 3.5 Bypass Risk

- [ ] Does this change create any new bypass path around safety filters?
  _(e.g., a code path that calls the LLM but does not route output through `postLlmSafetyFilter`)_
- [ ] Does this change allow adversarial prompt patterns (punctuation evasion, character substitution) to escape detection?
- [ ] Does this change alter or remove any red-teaming test scenario in a way that reduces coverage of known attack vectors?

---

## Section 4 — Test and Regression Expectations

### 4.1 Mandatory Tests

| Change Type | Required Tests |
|---|---|
| Any change to filter logic | Re-run `testReasoningFilter.ts` and confirm all 5 scenarios pass |
| Any change to crisis detection | Re-run `safetyGoldenScenarios.ts` and confirm all 12 scenarios pass |
| Any change to sanitization rules | Run `runSafetyTestSuite.ts` and confirm overall pass rate ≥ 95% |
| Any change affecting red-teaming coverage | Re-run `redTeamingTests.ts` (25+ adversarial patterns) |
| Any threshold or confidence value change | Run full safety test suite; confirm no regressions |
| Any agent access change | Run E2E tests; confirm no new entity access in agent responses |
| Behavior-preserving refactor | Run all of the above; confirm identical outputs before and after |

### 4.2 When Manual Scenario Review Is Mandatory

Manual review of example prompts and expected outputs is required when:

- [ ] Any pattern list changes (additions or removals)
- [ ] Any confidence threshold or severity label changes
- [ ] Any failsafe path changes
- [ ] Any refactor touches logic that was not covered by existing tests
- [ ] A test suite run reports < 100% pass rate for any crisis or refusal scenario
- [ ] The PR author is uncertain whether behavior is preserved

For manual review, the reviewer should test at minimum:
1. An explicit self-harm message — confirm SEVERE is returned and crisis escalation triggers
2. An implicit hopelessness message — confirm HIGH or SEVERE is returned
3. A medical advice request — confirm refusal is issued
4. A normal CBT reflection — confirm no false positive refusal
5. An adversarial bypass attempt (e.g., punctuation spacing) — confirm crisis detection still fires

### 4.3 When a PR Must Be Blocked Until Tests Exist

A PR **must not merge** if:

- The changed logic has no corresponding test in the safety test suite
- The test suite pass rate drops below 95% after the change
- The change removes or disables an existing golden scenario or red-teaming test case
- Manual scenario review was required but not completed
- The reviewer cannot determine whether the change preserves existing behavior

---

## Section 5 — Risk Classification

Classify the PR into one of the following risk levels. Use the highest applicable level.

| Risk Level | Description | Merge Policy |
|---|---|---|
| 🟢 **Docs-only** | Comment or documentation change with no logic impact | May merge after author self-review |
| 🟢 **Test-only (additive)** | Golden scenarios or red-team tests added; no existing test removed or modified | May merge after author self-review + recommended second look |
| 🟡 **Behavior-preserving refactor** | Code restructured; observable behavior is identical before and after | Requires explicit human approval + second reviewer + full test suite pass |
| 🟠 **Threshold or pattern change** | Confidence values, severity labels, or pattern lists modified | Requires explicit human approval + second reviewer + full test suite pass + manual scenario review |
| 🔴 **Safety weakening risk** | Change reduces strictness of any filter, detector, or sanitizer | **Must not merge without explicit human approval + second reviewer + manual scenario review + written justification** |
| 🔴 **Production blocking risk** | Change introduces a bypass path, removes a failsafe, or disables a safety layer | **Must not merge under any circumstances without detailed review, rollback plan, and explicit approval from repository owner** |

---

## Section 6 — Merge Guidance

### 6.1 Conditions for Safe Merge

All of the following must be true before this PR may merge:

- [ ] All applicable tests in Section 4.1 have been run and passed
- [ ] Manual scenario review (if required by Section 4.2) has been completed
- [ ] All Section 3 safety questions have been answered explicitly
- [ ] The risk level (Section 5) has been identified and the corresponding merge policy is satisfied
- [ ] Explicit human approval has been obtained (if required by Section 2)
- [ ] A second reviewer has signed off (if required by Section 2)
- [ ] The PR description includes a Safety Impact section (see `docs/copilot-pr-workflow.md` Section 9)
- [ ] All standard CI checks pass: `npm run lint`, `npm test`, `npm run build`, `npm run typecheck`

### 6.2 Conditions Requiring Follow-Up Before or After Merge

Merge may proceed conditionally if:

- The change introduces an additive test that increases coverage — no follow-up required
- A behavior-preserving refactor is confirmed by test suite — document confirmation in PR
- A threshold change has been reviewed but long-term monitoring is recommended — create a follow-up issue

### 6.3 Conditions Under Which the PR Must Not Merge

**Do not merge this PR if any of the following is true:**

- [ ] Any Section 3 question was answered "Yes" and no written justification exists in the PR
- [ ] The safety test suite pass rate is below 95%
- [ ] Any existing golden scenario or red-team test was removed or weakened
- [ ] Manual scenario review was required but skipped
- [ ] The risk classification is 🔴 and explicit human approval was not obtained
- [ ] The change creates a code path that bypasses `postLlmSafetyFilter`
- [ ] The change allows a private user entity to be retrieved at a shared level
- [ ] The change removes or modifies the failsafe behavior without explicit justification
- [ ] The reviewer cannot confidently state that safety behavior is preserved or intentionally improved

---

## Quick Reference — When to Use This Checklist

| Scenario | Use This Checklist? |
|---|---|
| Changing any pattern in `postLlmSafetyFilter.ts` | ✅ Yes — always |
| Changing crisis severity thresholds in `enhancedCrisisDetector.ts` | ✅ Yes — always |
| Refactoring `sanitizeAgentOutput.ts` | ✅ Yes — always |
| Adding a new golden scenario to `safetyGoldenScenarios.ts` | ✅ Yes — Section 4 and Section 5 at minimum |
| Changing agent entity access in `agentWiring.js` | ✅ Yes — always |
| Adding a comment to `postLlmSafetyFilter.ts` | ✅ Yes — but Section 1 will classify it docs-only and no further items apply |
| Changing a non-safety backend function | ❌ Not required — use standard PR workflow |
| Adding a UI component | ❌ Not required — use standard PR workflow |
| Adding an i18n key | ❌ Not required — use standard PR workflow |

---

> For the full PR workflow, see `docs/copilot-pr-workflow.md`.
> For safety rules quick-reference, see `docs/copilot-safety-rules.md`.
> For agent access policy, see `docs/ai-agent-access-policy.md`.
> For the PR template, see `.github/pull_request_template.md`.

*Last updated: 2026-03-10*
