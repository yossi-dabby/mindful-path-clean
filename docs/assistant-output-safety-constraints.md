# Assistant Output Safety Constraints

This document describes the client-side output safety pipeline for assistant (AI therapist / AI companion) messages and the constraints that must be preserved.

---

## 1. Overview

The app has two layers of output safety:
1. **Backend**: Base44 runtime safety filters (do not modify without explicit approval)
2. **Client-side**: `messageContentSanitizer.jsx` + `finalOutputGovernor.jsx`

This document covers the **client-side** layer only.

---

## 2. Leakage Pattern Categories

Internal reasoning text must never appear in user-visible chat output. Two arrays govern detection:

### `FORBIDDEN_PATTERNS` (line-start patterns)
Match at the beginning of a line. Examples:
- `THOUGHT:`, `PLAN:`, `REASONING:`, `INTERNAL:`, `SYSTEM:`, `CONTEXT:`
- `[THINKING]`, `[REASONING]`, `[ANALYSIS]`

### `FORBIDDEN_INLINE_PATTERNS` (anywhere on the line)
Match anywhere within a line. Categories include:

| Category | Example patterns |
|---|---|
| Meta-analysis | "The user is expressing…", "The user is describing…", "The user appears to be…" |
| Policy narration | "Relevant Constitution principles…", "Following protocol…", "As per my guidelines…" |
| Internal planning | "I need to respond with…", "I should generate…", "I will now provide…" |
| Meta-commentary | "This is a therapeutic response", "This response addresses…" |
| Output announcements | "Here is my response:", "My response to this is:" |
| Scoring/labels | "[Severity:", "[Risk level:" |

---

## 3. Sanitization Behavior

`sanitizeMessageContent(text)` filters lines containing any forbidden pattern:
- Lines matching `FORBIDDEN_PATTERNS` are removed
- Lines matching `FORBIDDEN_INLINE_PATTERNS` are removed
- Blank lines resulting from removal are collapsed

`hasReasoningLeakage(text)` detects if the **full message** contains any forbidden pattern (checks **both** arrays). Used to decide whether to show a failsafe fallback.

---

## 4. Failsafe Behavior

When `hasReasoningLeakage()` returns `true` for the full assistant message (meaning the entire message is problematic, not just a fragment), `applyFinalOutputGovernor()` replaces the message with a safe, localized fallback.

Failsafe strings are defined for all 7 supported languages in `finalOutputGovernor.jsx` and in `translations.jsx` under `chat.output_safety.leakage_suppressed`.

A console warning is emitted (non-PII) when suppression occurs, to support QA:
```
[FinalOutputGovernor] Leakage suppressed — showing safe fallback.
```

---

## 5. Safety-Critical Files

These files must not be modified without explicit approval and extra scrutiny:

| File | Role |
|---|---|
| `src/components/utils/messageContentSanitizer.jsx` | Client-side leakage sanitizer |
| `src/components/utils/finalOutputGovernor.jsx` | CP12 output governor — last defense before render |
| `src/api/agentWiring.js` | Agent wiring (backend boundary) |
| `src/api/activeAgentWiring.js` | Active agent wiring |
| `functions/postLlmSafetyFilter.ts` | Backend LLM safety filter |
| `functions/sanitizeAgentOutput.ts` | Backend agent output sanitizer |
| `functions/sanitizeConversation.ts` | Backend conversation sanitizer |

---

## 6. What Must NOT Change Without Approval

- Agent system prompts or instruction text
- Retrieval scope for either agent
- The list of private user entities (ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory, UserDeletedConversations) — these must never be indexed or retrieved in shared pipelines
- The two-agent boundary (CBT Therapist vs AI Companion)

---

## 7. Adding New Leakage Patterns

To add a new forbidden pattern:
1. Add to `FORBIDDEN_INLINE_PATTERNS` in `messageContentSanitizer.jsx` (regex, case-insensitive)
2. Add a corresponding test in `test/utils/chatLeakagePatternExpansion.test.js`
3. Confirm `hasReasoningLeakage` still correctly detects the pattern (it checks both arrays)
4. Run `npm test` to confirm no regressions
