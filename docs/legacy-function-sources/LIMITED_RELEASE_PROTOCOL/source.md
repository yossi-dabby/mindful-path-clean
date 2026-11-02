<!-- Original entry.ts content preserved 2026-08-09T19:01:04.377Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# CBT Therapist — Limited Release Protocol
## Version: 1.0 | Status: Active | Baseline: Release Candidate (post CP11 patch)

---

## 1. BASELINE DECLARATION

The current therapist behavior (agents/cbt_therapist) as of the CP11 patch is the **release-candidate baseline**.
No behavior changes are permitted during Limited Release unless the regression threshold below is crossed.

Primary monitored languages: **English, Hebrew**
Secondary monitored languages: Spanish, French, German (monitoring scope only — not blockers unless repeated)

---

## 2. REGRESSION LOG TEMPLATE

Log every observed regression immediately in the `RegressionLog` entity with these fields:

| Field | What to record |
|---|---|
| **date** | Session date |
| **language** | en / he / es / fr / de / other |
| **scenario_type** | partial_completion / worry_overthinking / avoidance / panic / social_anxiety / sleep_anxiety / work_task / driving_anxiety / continuity_return / session_opener / other |
| **user_prompt** | Paste the exact user message |
| **model_reply** | Paste the exact model reply |
| **regression_category** | See categories below |
| **severity** | low / medium / high |
| **repeated_regression** | yes/no — is this the 2nd+ independent confirmed instance? |
| **notes** | Reviewer context, related prior log ID, or mitigation note |

### Regression Categories
- `hand-back / ask-back` — agent asked the user to define, describe, identify, or explain before acting
- `gather-info-first` — agent deferred action to gather context first
- `continuity contamination` — prior session topic bled into current session without explicit topic keyword
- `domain contamination` — action, example, or step belonged to a different domain than the current message
- `permission phrasing` — agent sought permission before acting ("would you like to...", "shall we...")
- `ending with a question` — response ended with a question instead of a concrete action
- `panic too long / not immediate` — panic response contained theory or delay before grounding
- `social anxiety too theory-heavy` — social response was explanation-heavy without a direct action
- `partial completion drift` — partial completion response asked for context instead of giving default micro-step
- `worry not action-first` — worry response postponed action or handed selection back to user
- `internal leakage` — field names, level labels, JSON, routing text, or curriculum IDs appeared in output
- `other` — document clearly in notes

---

## 3. DECISION RULES

### MONITOR ONLY
**Condition:** Single instance of a regression, any category, any severity.
**Action:** Log it. Do not change behavior. Do not alert.

### MICRO-FIX ELIGIBLE
**Condition:** 2 or more **independent** confirmed instances of the **same regression_category + scenario_type** combination, in the same primary monitored language (en or he).
**Action:** Flag for review. Draft one targeted micro-fix scoped to that exact path only. No broad rewrites.

### SAFE TO CONTINUE
**Condition:** Zero repeated regressions across 20+ logged sessions in primary languages.
**Action:** Document and proceed to next release stage.

### HOLD — ESCALATE
**Condition:** Any single instance of `internal leakage` (severity: high), or any crisis/safety path failure.
**Action:** Immediate review. Do not wait for repetition threshold.

---

## 4. WHAT IS NOT A REGRESSION

The following are expected and do not require logging:
- Agent asks ONE short clarifying question when no real-world object is present in the message and CP11 conditions are not met
- Hebrew response contains slightly different phrasing from English equivalent (multilingual adaptation is expected)
- Response is 3–4 sentences instead of 1–2 when additional clinical context is present
- Continuity opener used correctly after all 6 gate conditions pass

---

## 5. MICRO-FIX SCOPE RULES

When a micro-fix is triggered:
1. Fix **only** the exact path confirmed by the repeated regression (e.g. "worry + English + action-first")
2. Do **not** modify: panic path, sleep anxiety, Hebrew behavior, continuity architecture, or any non-regressed path
3. Do **not** add new layers
4. Document the fix against the RegressionLog record IDs that triggered it
5. Mark `fix_triggered: true` on the triggering log records

---

## 6. RELEASE PHASES

| Phase | Trigger | Monitoring |
|---|---|---|
| **Limited Release** (current) | CP11 patch complete | All sessions logged manually or sampled |
| **Expanded Release** | 0 repeated regressions across 20+ sessions | Sampling only, monthly review |
| **General Availability** | 0 repeated regressions across 50+ sessions | Automated drift monitoring only |

---

## 7. QUICK REFERENCE — WHAT TO LOG, WHAT TO SKIP

**Log:**
- Any response that asks for more context when CP11 should have fired
- Any response that ends with a question
- Any response that references a prior domain not named in the current message
- Any response that uses a permission phrase
- Any response that shows internal labels or JSON

**Skip:**
- Any response that gives a correct direct action
- Any response that uses the continuity opener correctly
- Any response where the agent asks one clarification because the message had no object or task signal
