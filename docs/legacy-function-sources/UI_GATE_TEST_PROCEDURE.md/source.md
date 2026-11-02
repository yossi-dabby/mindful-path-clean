<!-- Original entry.ts content preserved 2026-08-09T19:01:04.396Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# UI GATE TEST PROCEDURE
**Objective:** Verify 0 JSON flashes, 0 duplicate bubbles, no stuck thinking

---

## TEST 1: WEB STRESS TEST (100 consecutive sends)

### Setup:
1. Open Chrome/Firefox browser
2. Navigate to your app Chat page
3. Open Developer Console (F12)
4. Clear console

### Procedure:
1. Send 100 messages consecutively (can be same message: "test 1", "test 2", etc.)
2. After each send:
   - Watch for ANY "{" or JSON-like flash in the message bubble area
   - Watch for duplicate assistant response bubbles
   - Ensure "Thinking..." disappears within 10 seconds
3. Every 10 seconds, check console for `[UI STABILITY REPORT]`

### Pass Criteria:
- ✓ 0 visual flashes of JSON/braces/code in message bubbles
- ✓ 0 duplicate assistant bubbles (only 1 assistant bubble per user message)
- ✓ No "Thinking..." stuck beyond 10 seconds
- ✓ Console instrumentation shows:
  - `DUPLICATE_OCCURRED: 0` ✓ PASS
  - `CONTRACT_VIOLATIONS: 0` (ideal) or low number
  - `RENDER_BLOCKED_NON_STRING: 0` (ideal, means platform fixed it)
  - `RENDER_BLOCKED_JSON_LIKE: 0` (ideal, means platform fixed it)

### How to Record:
- Take screenshots of:
  1. Final console `[UI STABILITY REPORT]`
  2. Chat UI showing 100 message pairs (user + assistant)
- Report: "Web 100/100 PASS" or "Web FAIL at message #X: [describe issue]"

---

## TEST 2: MOBILE PREVIEW STRESS TEST (30 consecutive sends)

### Setup:
1. Open browser in mobile viewport (DevTools → Device Toolbar → iPhone 12 Pro)
2. Navigate to Chat page
3. Open console

### Procedure:
1. Send 30 messages consecutively
2. Same checks as Test 1

### Pass Criteria:
- Same as Test 1, adjusted for 30 messages
- Mobile-specific: no layout shifts, no input area jumping

### How to Record:
- Screenshots of final instrumentation + UI
- Report: "Mobile 30/30 PASS" or "Mobile FAIL at #X: [issue]"

---

## TEST 3: SPECIFIC SCENARIOS

### Scenario A: Protocol Session (Homework Assignment)
1. Start new conversation
2. Send: "I'm feeling anxious about work"
3. Follow agent prompts until homework is assigned
4. Check: No JSON flash when homework appears
5. Check: Only 1 assistant bubble per agent turn

### Scenario B: Rapid Fire (Spam Test)
1. Start new conversation
2. Type "test" and hit Enter repeatedly 10 times as fast as possible
3. Check: No duplicate bubbles, no stuck thinking

### Scenario C: Page Reload During Response
1. Send a message
2. While "Thinking..." is showing, reload the page
3. Check: Conversation loads correctly, no duplicate messages

### Pass Criteria:
- All scenarios: 0 flashes, 0 duplicates, no stuck states

---

## INSTRUMENTATION COUNTER REFERENCE

Open console during tests. Every 10 seconds you'll see:

```
═══════════════════════════════════════════════════
[UI STABILITY REPORT]
───────────────────────────────────────────────────
✓ Contract Enforcement:
  • Objects blocked: X          [Lower is better, 0 = platform fixed]
  • JSON strings blocked: X     [Lower is better, 0 = platform fixed]
  • Contract violations detected: X
✓ Duplicate Prevention:
  • Duplicates blocked: X
  • Duplicates occurred: 0 ✓ PASS   [MUST BE ZERO]
✓ State Updates:
  • Safe updates: X
  • Total messages processed: X
═══════════════════════════════════════════════════
```

**PASSING VALUES:**
- `DUPLICATE_OCCURRED: 0` ← MANDATORY (must be exactly 0)
- `CONTRACT_VIOLATIONS: 0` ← IDEAL (means platform is compliant)
- `RENDER_BLOCKED_NON_STRING: 0` ← IDEAL (means no objects in content)
- `RENDER_BLOCKED_JSON_LIKE: 0` ← IDEAL (means no JSON strings in content)

**If CONTRACT_VIOLATIONS > 0:**
- This means objects/JSON are still reaching content field
- Client-side extraction is working, but platform needs fixing
- Report the number to Base44 platform team

---

## PLAYWRIGHT E2E CHECKLIST

**(You must run this separately if you have Playwright tests)**

Required tests that must PASS:
1. `smoke.web.spec.js` or equivalent basic chat flow test
2. Test: Send message → receive response → no errors
3. Test: Send 10 messages → verify 10 user + 10 assistant bubbles (no duplicates)
4. Test: Check for JSON/brace text in assistant bubbles (should be 0 matches)

How to run:
```bash
npm run test:e2e
# or
npx playwright test
```

Expected output:
```
✓ Chat page loads
✓ Can send messages
✓ Receives responses
✓ No duplicate bubbles
✓ No JSON in UI
```

Paste the output summary showing pass/fail counts.

---

## WHAT TO REPORT BACK

Provide:
1. **Web Stress Test:** "100/100 PASS" + screenshot of final instrumentation
2. **Mobile Stress Test:** "30/30 PASS" + screenshot
3. **Specific Scenarios:** "All PASS" or "Scenario X FAIL: [description]"
4. **Instrumentation Snapshot:** Final counter values
5. **Playwright E2E:** Test run output (if available)

**Example Report:**
```
✓ Web: 100/100 PASS
✓ Mobile: 30/30 PASS
✓ Scenarios: All PASS
✓ Instrumentation:
  - DUPLICATE_OCCURRED: 0 ✓
  - CONTRACT_VIOLATIONS: 0 ✓
  - RENDER_BLOCKED_NON_STRING: 0 ✓
✓ Playwright: Not run (manual testing only)

GATE CLEARED ✓
```

---

## KNOWN LIMITATIONS

**Current Implementation:**
- Client-side extraction is the LAST LINE OF DEFENSE
- Platform may still send objects in message.content (contract violation)
- Client blocks rendering but ideally platform should fix this

**What "PASS" means:**
- User never sees JSON/braces/duplicates (UI stable)
- DUPLICATE_OCCURRED = 0 (no duplicate bubbles)
- Client successfully enforces contract even if platform violates it

**Future improvement:**
- Platform-level fix so objects never reach content field
- Then CONTRACT_VIOLATIONS will drop to 0
