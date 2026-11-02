# Runbook — CBT Therapist Graded QA Protocol

> **Purpose:** Step-by-step instructions for executing the graded QA protocol safely.
> **Audience:** QA engineers, release engineers, product owners.
> **Phase:** Phase 1 — Manual execution only.

---

## Before You Begin

### Prerequisites

1. You have a test account for the app (not a real user account)
2. You have access to the GitHub Actions tab of this repository
3. You have access to a browser with developer tools
4. You have been briefed on the CBT Therapist agent's intended behavior
5. (For Level 3) You have access to a bilingual reviewer for non-English languages, or you are fluent yourself

### What this protocol does NOT do

- Does not change any production code
- Does not change agent instructions or prompts
- Does not alter retrieval, memory, or safety filter logic
- Does not create or modify Base44 entities
- Does not touch any backend functions

---

## Triggering the Automated Workflow

### Step 1: Navigate to the workflow

1. Open the repository on GitHub
2. Click the **Actions** tab
3. In the left sidebar, find **"Manual: Graded CBT QA Protocol"**
4. Click it

### Step 2: Trigger the run

1. Click the **"Run workflow"** button (top right of the workflow page)
2. Select the branch you want to test (default: `main`)
3. Click **"Run workflow"** to confirm

### Step 3: Monitor the run

1. The workflow will appear in the list. Click it to watch progress.
2. The workflow runs these jobs in order:
   - **existing-tests** — Runs the full Vitest unit test suite
   - **validate-qa-assets** — Validates QA files are present and well-formed
   - **qa-level1-scaffold** — Runs Level 1 scaffolded checks (static analysis only, no live app)
   - **print-manual-items** — Prints all items requiring manual verification
   - **write-summary** — Writes a formatted summary to the GitHub Actions step summary

### Step 4: Read the results

1. After the workflow completes, click the run to see the **Summary** tab
2. The summary shows:
   - Existing unit test status
   - QA asset validation status
   - Level 1 automated scaffold results
   - Full list of items requiring manual verification (Levels 2–5)
3. Download the QA checklist artifact from the **Artifacts** section of the run

---

## Executing Manual Levels (2–5)

### Level 2 — Core Behavioral (~25 minutes)

1. Open the app in a browser with developer tools open
2. Navigate to `/Chat` (therapist chat)
3. For each scenario in `/qa/manual-checklist.md`, Level 2:
   - Open a fresh session (clear session state or use incognito)
   - Send the specified input
   - Observe the response
   - Mark the checklist item PASS / REQUIRES-VERIFICATION / FAIL
4. If any scenario produces an unexpected result, note the exact response verbatim

**When to escalate:** If L2-09 (hand-back) fails, escalate to the safety review team immediately.
If L2-02 (flooding) fails, escalate before proceeding to Level 3.

### Level 3 — Multilingual Parity (~35 minutes)

1. For each language in the test matrix (en, he, es, fr, de, it, pt):
   - Switch the app language or use browser language preferences
   - Run L2-01, L2-02, and L2-09
   - Record the response and mark the checklist
2. For non-English languages you are not fluent in:
   - Record the response verbatim
   - Send to a bilingual reviewer for confirmation
   - Mark as REQUIRES-VERIFICATION until confirmed

**Languages requiring bilingual review:**
- Hebrew (he) — right-to-left layout; verify UI renders correctly
- All non-English languages — verify behavioral rules hold, not just language detection

### Level 4 — Cross-Chat Consistency (~20 minutes)

1. Open 3 separate browser incognito windows (or clear session between runs)
2. Send the same opening message in each: *"I've been feeling anxious lately."*
3. Record the first therapist response in each session
4. Compare for structural consistency (permission phrasing, no recommendations)
5. Repeat for the flooding scenario (2 sessions) and menu scenario (2 sessions)

**Recording template:**
```
Session [N]:
  Input: [what you sent]
  Therapist opening: [first ~50 words of response]
  Permission phrasing present: YES / NO
  Grounding offered first: YES / NO / N/A
  Menu presented (no recommendation): YES / NO / N/A
  Result: PASS / FAIL
```

### Level 5 — Release Gate (~10 minutes)

1. Compile results from Levels 1–4
2. Fill in the Level 5 gate table in `/qa/manual-checklist.md`
3. Every gate item must be PASS
4. If any item is FAIL: do not approve the release
5. If any item is REQUIRES-VERIFICATION: get a second reviewer to confirm before approving
6. Obtain two signatures (QA Reviewer + Release Owner)

---

## Interpreting Results

| Result | Action |
|--------|--------|
| ✅ PASS | Proceed to next level |
| ⚠️ REQUIRES-VERIFICATION | Get a second reviewer before proceeding |
| ❌ FAIL | Stop. File a bug. Do not approve release. |
| ⏭️ SKIP | Document the reason. Only skip if the scenario is truly not applicable. |

### Escalation paths

| Failure type | Escalation |
|-------------|-----------|
| L2-09 hand-back fails | Safety review team immediately |
| L2-02 flooding → grounding fails | Safety review before Level 3 |
| L3 language parity fails in HE | i18n team review |
| L5 gate G-07 (PII in logs) fails | Privacy team immediately; hold release |
| L5 gate G-08 (safety filter) fails | Do not release. Escalate to engineering. |

---

## Artifacts and Reporting

### GitHub Actions artifacts

After the automated workflow runs, the following artifacts are available (30-day retention):

- `qa-assets-validation` — JSON validation report for all QA files
- `qa-checklist` — A copy of the manual checklist pre-filled with Level 1 automated results

### Filing results

1. After completing all levels, save the filled `/qa/manual-checklist.md`
2. Attach it to the release ticket or PR
3. Include the GitHub Actions workflow run URL

---

## Safety Checklist for QA Execution

Before finishing:

- [ ] No production code was changed during this QA run
- [ ] No agent instructions were modified
- [ ] No entity schemas were modified
- [ ] No real user data was used in testing
- [ ] Test account was used throughout
- [ ] Any FAIL results have been filed as bugs
- [ ] Any REQUIRES-VERIFICATION items have a second reviewer assigned

---

## Appendix: Key File Locations

| File | Purpose |
|------|---------|
| `/qa/graded-qa-protocol.md` | Protocol specification (5 levels) |
| `/qa/test-matrix.json` | Machine-readable test definitions |
| `/qa/manual-checklist.md` | Checklist to fill in during testing |
| `/qa/runbook.md` | This file |
| `/qa/automated/cbt-behavioral.test.js` | Automated scaffolding (Level 1 static checks) |
| `/.github/workflows/manual-graded-qa.yml` | Manual-only GitHub Actions workflow |

---

*Last updated: 2026-03-30 | Phase 1*
