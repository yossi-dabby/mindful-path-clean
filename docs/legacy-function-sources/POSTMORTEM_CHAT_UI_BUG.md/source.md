<!-- Original entry.ts content preserved 2026-08-09T19:01:04.380Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# Postmortem: Chat UI Broken by Structured Agent Output

**Date:** 2026-01-28  
**Severity:** P0 (Production-Blocking)  
**Status:** RESOLVED  

---

## Executive Summary

The Chat UI became completely unusable after updating the CBT agent prompt to enforce structured JSON output. Raw JSON fragments and escaped unicode sequences appeared in chat bubbles on both web and mobile, breaking the user experience. The root cause was that the agent's JSON output was being persisted directly into the message `content` field instead of being safely extracted and stored separately.

---

## Timeline

1. **Agent Prompt Updated**: Modified `agents/cbt_therapist.json` to output structured JSON with mandatory fields (homework, emotion_ratings, assistant_message).
2. **UI Broke Immediately**: Chat bubbles displayed raw JSON (e.g., `"s": []`, `\u2019`), escaped sequences, and schema fragments.
3. **Revert Failed**: Reverting the agent prompt did NOT restore the UI, indicating persisted corrupted data in the conversation history.
4. **Investigation**: Identified that historical messages in the database contained raw JSON in the `content` field, which was being rendered directly by MessageBubble.
5. **Fix Applied**: Implemented defensive rendering + sanitization + validation layers.

---

## Root Cause

### Primary Issue
The agent was configured to output structured JSON with this schema:
```json
{
  "assistant_message": "User-visible text",
  "mode": "thought_work",
  "situation": "...",
  "homework": [...],
  "emotion_ratings": {...},
  ...
}
```

However, the **entire JSON object was being stored in the `message.content` field** instead of:
1. Extracting `assistant_message` for user-visible display
2. Storing the full structured data in `message.metadata`

### Why Reverting the Prompt Didn't Help
- The agent's previous responses were already persisted in the database with raw JSON in the `content` field
- When the Chat UI loaded these historical messages, it rendered them as-is
- MessageBubble had no defensive logic to detect or handle JSON content

### Contributing Factors
1. **No validation layer**: Message processing in `Chat.jsx` assumed content was always plain text
2. **No sanitization**: MessageBubble rendered content directly without checking for JSON
3. **No recovery mechanism**: Once bad data was persisted, there was no way to clean it up

---

## Impact Scope

- **Affected**: All users with active conversations where the agent had responded post-prompt-update
- **Severity**: Complete Chat UI failure (unable to read messages, JSON fragments everywhere)
- **Platforms**: Web and Mobile (both affected equally)
- **Duration**: From prompt update until fix deployment

---

## Fix Applied

### 1. Defensive Rendering in MessageBubble
**File:** `components/chat/MessageBubble.jsx`

Added JSON detection and extraction logic:
```javascript
// If content looks like JSON, extract assistant_message
if (typeof rawContent === 'string' && rawContent.trim().startsWith('{')) {
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed.assistant_message) {
      content = String(parsed.assistant_message).trim();
    } else {
      content = '[Unable to display message]';
    }
  } catch (jsonError) {
    // Treat as regular text
  }
}

// Detect and block JSON fragments
if (content.includes('\\u') || content.includes('"s":') || content.includes('"homework"')) {
  content = '[Unable to display message - invalid format]';
}
```

**Result**: MessageBubble can now safely render both:
- Plain text (legacy messages)
- JSON with `assistant_message` (structured output)
- Corrupted JSON (shows fallback message)

---

### 2. Message Processing Validation
**File:** `pages/Chat.jsx`

Added multi-layer validation:
```javascript
const processedMessages = (data.messages || []).map(msg => {
  if (msg.role === 'assistant' && msg.content) {
    const validated = validateAgentOutput(msg.content);
    
    if (validated) {
      return {
        ...msg,
        content: validated.assistant_message, // User-visible only
        metadata: {
          ...msg.metadata,
          structured_data: validated // Store full data
        }
      };
    }
    
    const extracted = extractAssistantMessage(msg.content);
    return { ...msg, content: extracted };
  }
  return msg;
});

// Additional sanitization pass
processedMessages = sanitizeConversationMessages(processedMessages);
```

**Result**: All messages are validated and sanitized before rendering, with structured data safely stored in metadata.

---

### 3. Validation Utilities
**File:** `components/utils/validateAgentOutput.js`

Created three key functions:

1. **`validateAgentOutput(rawContent)`**
   - Parses and validates JSON against the expected schema
   - Returns normalized structured data or null
   - Enforces safety rules (e.g., `should_offer_save` requires both anxiety + homework)

2. **`extractAssistantMessage(rawContent)`**
   - Extracts user-visible text from any format
   - Handles JSON, plain text, and objects
   - Always returns a safe string

3. **`sanitizeConversationMessages(messages)`**
   - Batch-processes message arrays
   - Extracts `assistant_message` from any JSON content
   - Marks sanitized messages in metadata

---

### 4. Recovery Function
**File:** `functions/sanitizeConversation.js`

Created a backend function to clean up corrupted conversations:
```javascript
// Usage: POST to function with { conversation_id: "..." }
// Returns: { sanitized_count, total_messages }
```

This allows manual recovery of conversations with persisted bad data.

---

## Preventive Guardrails

### For Structured Agent Outputs
1. **Always extract user-visible text first**
   - Never persist full JSON objects in `message.content`
   - Use `assistant_message` or equivalent for display
   - Store structured data in `metadata` only

2. **Validate all agent outputs**
   - Use schema validation (like `validateAgentOutput`)
   - Handle validation failures gracefully
   - Log warnings for debugging

3. **Defensive rendering**
   - Check for JSON before rendering
   - Sanitize content to remove escaped sequences
   - Show fallback messages for invalid formats

4. **Testing checklist**
   - Test with plain text messages (backward compatibility)
   - Test with JSON-structured messages (new format)
   - Test with malformed/corrupted messages (resilience)
   - Test on both web and mobile

---

## Verification Checklist

- [x] Chat UI loads without errors (web)
- [x] Chat UI loads without errors (mobile)
- [x] No JSON fragments visible in chat bubbles
- [x] No escaped unicode sequences (e.g., `\u2019`)
- [x] Historical messages display correctly
- [x] New messages display correctly
- [x] Structured data is stored in metadata (not content)
- [x] MessageBubble handles all message formats
- [x] Validation utilities return safe strings
- [x] Recovery function available for cleanup

---

## Lessons Learned

1. **Never trust agent output format**
   - Always validate and extract before persisting
   - Assume output may be malformed or unexpected

2. **Defensive rendering is mandatory**
   - UI components must handle bad data gracefully
   - Never render raw data without sanitization

3. **Test with real data**
   - Test with production-like scenarios
   - Include edge cases and corrupted data

4. **Provide recovery mechanisms**
   - When bad data is persisted, have a way to clean it up
   - Backend functions for bulk sanitization

5. **Monitor after changes**
   - Check UI immediately after agent prompt updates
   - Test on multiple platforms (web + mobile)

---

## Status: RESOLVED

All fixes have been applied. Chat UI is now resilient to both legacy plain-text messages and new structured JSON output. Historical corrupted messages will be sanitized on load, and new messages will be properly validated before persistence.

**Next Steps:**
- Monitor for any remaining edge cases
- Consider adding automated tests for message validation
- Document structured output best practices for future agent updates
