# Incident Regression Checklist — Chat Rendering

Use this checklist when investigating or reproducing chat rendering or output safety incidents.

---

## Incident Categories

### A. Malformed Markdown in Assistant Messages

**Symptoms**: Stray `**` characters, broken bold spans, bullet list items not rendering as a list, extra blank lines.

**Diagnostic steps**:
1. Capture the raw assistant message content before rendering (add temporary `console.log` before the `normalizeAssistantMarkdown` call in `MessageBubble.jsx`)
2. Run the raw content through `normalizeAssistantMarkdown` manually and compare
3. Check if the malformed token survived the normalization (add a new rule if needed)
4. Check `test/utils/chatMarkdownNormalization.test.js` — add a failing test that reproduces the issue before fixing

**Relevant files**:
- `src/components/utils/normalizeAssistantMarkdown.js`
- `test/utils/chatMarkdownNormalization.test.js`

---

### B. Internal Reasoning Text Visible in UI

**Symptoms**: User sees meta-analysis text ("The user is expressing…"), policy phrases ("Relevant Constitution principles…"), planning text ("I need to respond…"), or any non-therapeutic content that appears to be internal LLM narration.

**Diagnostic steps**:
1. Capture the exact verbatim text that appeared
2. Check if it matches any existing pattern in `FORBIDDEN_INLINE_PATTERNS` or `FORBIDDEN_PATTERNS` in `messageContentSanitizer.jsx`
3. If no pattern matches: add the pattern, add a test in `test/utils/chatLeakagePatternExpansion.test.js`
4. Check `hasReasoningLeakage()` — verify it detects the new pattern (it checks both arrays)
5. Check if the leak was in `finalOutputGovernor.jsx` pipeline stage or bypassed it entirely
6. Check browser console for `[FinalOutputGovernor] Leakage suppressed` — absence means the governor did not fire

**Relevant files**:
- `src/components/utils/messageContentSanitizer.jsx`
- `src/components/utils/finalOutputGovernor.jsx`
- `test/utils/chatLeakagePatternExpansion.test.js`
- `test/utils/internalTextLeakageBoundary.test.js`

**Escalation**: If the leak originates from the backend (not caught by `postLlmSafetyFilter.ts`), escalate to the backend team. Do not modify backend functions without explicit approval.

---

### C. RTL/LTR Wrapping Defects

**Symptoms**: Hebrew text overlaps with English terms, text clips at container boundary, horizontal scroll appears, mixed-script lines break at wrong positions.

**Diagnostic steps**:
1. Inspect the DOM: verify `dir="auto"` is present on the `<p>` (user messages) and the ReactMarkdown wrapper div (assistant messages)
2. Verify the outer bubble has `dir="rtl"` in Hebrew locale
3. Check if `overflow-x-hidden` was added to any ancestor — this breaks iOS scroll and can cause visual clipping
4. Check if `overflow-wrap:anywhere` / `break-words` classes are present on the content element
5. Test on both desktop and mobile viewport sizes

**Relevant files**:
- `src/components/chat/MessageBubble.jsx` (dir strategy + overflow classes)
- `docs/chat-rendering-rules.md` (reference)

---

### D. Form Card Count Mismatch

**Symptoms**: User requested N forms, fewer than N cards rendered, no explanation shown.

**Diagnostic steps**:
1. Check `message.metadata.generated_files` — this is the source array for rendered form cards
2. Verify the backend returned the expected count (may be a backend issue)
3. If count is correct in metadata but fewer cards rendered: check `MessageBubble.jsx` card rendering loop
4. If count is wrong at source: backend issue — escalate; do not modify agent wiring without approval
5. The `chat.forms.shortfall_notice` i18n key is available for displaying a localized shortfall message if a calling component has the request count

---

## Regression Test Protocol

Before marking an incident as resolved:

1. **Write a failing test** that reproduces the exact issue (unit or E2E)
2. **Fix the issue** (smallest possible change)
3. **Confirm the test passes** with the fix
4. **Run the full test suite**: `npm test` — all 189+ test files must pass
5. **Add the test to the relevant regression file** (see table below)
6. **Document in this file** if the incident reveals a new pattern category

| Incident type | Add regression test to |
|---|---|
| Markdown malformed | `test/utils/chatMarkdownNormalization.test.js` |
| Reasoning leakage | `test/utils/chatLeakagePatternExpansion.test.js` |
| Leakage boundary | `test/utils/internalTextLeakageBoundary.test.js` |
| i18n missing key | `test/utils/translations.test.js` |
| Form count | `test/utils/therapeuticForms*.test.js` |

---

## Related Documentation

- `docs/chat-rendering-rules.md` — RTL/LTR and overflow wrapping rules
- `docs/assistant-output-safety-constraints.md` — Output safety pipeline and leakage patterns
- `docs/multilingual-qa-checklist.md` — QA checklist for all 7 locales
- `docs/ai-agent-access-policy.md` — Agent entity access policy (read-only)
