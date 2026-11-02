<!-- Original entry.ts content preserved 2026-08-09T19:01:04.391Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# CHAT STABILITY TEST RUNBOOK

## OBJECTIVE
Prove Chat UI is 10/10 stable: 0 flashes, 0 duplicates, 0 parse errors, 0 stuck thinking.

---

## TEST 1: WEB (30 CONSECUTIVE SENDS)

### Setup
1. Open Chrome/Firefox → Chat page
2. Open DevTools Console (F12)
3. Open DevTools → Rendering → Enable "Paint flashing" and "Layout Shift Regions"

### Procedure
1. Send 30 messages: "test 1", "test 2", etc.
2. After each send:
   - Watch for green paint flashes (indicates UI repaint)
   - Watch for blue layout shift regions (indicates layout instability)
   - Ensure "Thinking..." disappears within 10s
3. After 30 sends, run in console:
   ```javascript
   window.printChatStabilityReport()
   ```

### PASS Criteria
- ✅ No green paint flashes on message bubbles during assistant response
- ✅ No blue layout shift regions during send cycle
- ✅ No duplicate assistant bubbles
- ✅ No "?" or empty assistant bubbles
- ✅ Console shows: `Web sends: 30/30 PASS`
- ✅ Console shows: `Parse errors: PASS (0)`
- ✅ Console shows: `Duplicates occurred: PASS (0)`
- ✅ Console shows: `Placeholder became message: PASS (0)`
- ✅ Console shows: `Thinking >10s: PASS (0)`

### What to Capture
- Screenshot of final `[CHAT STABILITY REPORT]` in console
- Note any failures

---

## TEST 2: MOBILE (15 CONSECUTIVE SENDS)

### Setup
1. DevTools → Device Toolbar → iPhone 12 Pro (375x667)
2. Open Console
3. Enable Paint flashing and Layout Shift Regions

### Procedure
1. Send 15 messages
2. Same checks as Web test
3. After 15 sends, run:
   ```javascript
   window.printChatStabilityReport()
   ```

### PASS Criteria
- Same as Web, but: `Mobile sends: 15/15 PASS`

---

## TEST 3: PLAYWRIGHT E2E

### Command
```bash
npx playwright test functions/smoke.web.spec.js --headed
```

### Expected Output
```
✓ Chat page loads and is ready
✓ Can send a message
✓ Receives response without errors
✓ No duplicate assistant bubbles
✓ No JSON in UI

5 passed (15s)
```

### If Failures
- Capture screenshots from `test-results/`
- Report which test failed and error message

---

## MANUAL VERIFICATION CHECKLIST

After running all tests, verify:

- [ ] Console shows ZERO lines like: `[Agent Validation] Parse error: ... is not valid JSON`
- [ ] Console shows ZERO lines like: `[Sanitize] Failed to extract from JSON-like content`
- [ ] No red error stack traces in console during normal operation
- [ ] No green paint flashes observed (DevTools Rendering)
- [ ] No blue layout shifts observed (DevTools Rendering)
- [ ] No "?" bubbles ever appeared
- [ ] No duplicate assistant bubbles
- [ ] "Thinking..." always disappears within 10s

---

## INSTRUMENTATION COUNTER REFERENCE

After running `window.printChatStabilityReport()`, you'll see:

```
[CHAT STABILITY REPORT]
Web sends: X/30 PASS/FAIL
Mobile sends: X/15 PASS/FAIL
UI flashes detected: PASS/FAIL
Parse errors: PASS/FAIL (X)
Duplicates occurred: PASS/FAIL (X)
Placeholder became message: PASS/FAIL (X)
Thinking >10s: PASS/FAIL (X)
```

**PASS VALUES (all must be 0):**
- Parse errors: 0
- Duplicates occurred: 0
- Placeholder became message: 0
- Thinking >10s: 0

**Informational counters:**
- PARSE_ATTEMPTS - How many JSON parse attempts
- PARSE_SKIPPED_NOT_JSON - Plain text (Hebrew/English) correctly skipped
- SANITIZE_EXTRACT_OK - Successful extractions from fenced JSON
- HARD_GATE_BLOCKED_OBJECT - Objects blocked from rendering
- HARD_GATE_BLOCKED_JSON_STRING - JSON strings blocked
- HARD_GATE_FALSE_POSITIVE_PREVENTED - Plain text with "assistant_message" keyword allowed
- REFETCH_TRIGGERED - Refetches triggered by unsafe content

---

## REPORT FORMAT

Provide:
1. Web test: 30/30 PASS + screenshot
2. Mobile test: 15/15 PASS + screenshot
3. Playwright: Pass/fail count + any errors
4. Manual verification: All checkboxes checked
5. Final stability report output

Example:
```
✅ Web: 30/30 PASS
✅ Mobile: 15/15 PASS
✅ Playwright: 5/5 PASS
✅ Manual: All verified
✅ Final report shows all PASS

GATE CLEARED ✓
``
