<!-- Original entry.ts content preserved 2026-08-09T19:01:04.365Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# Chat UI Crash Diagnosis Report

**Date:** 2026-01-28  
**Issue:** Brief UI crash/freeze when sending messages (Web + Mobile)  
**Status:** RESOLVED  

---

## Symptoms

- User reports UI "crush" (crash/freeze) when sending messages in Chat
- UI recovers immediately (self-healing)
- No persistent errors in runtime logs
- Affects both web and mobile platforms

---

## Root Cause Analysis

### Primary Issue: Race Condition in Message Processing

**Location:** `pages/Chat.jsx`, lines 183-213 (subscription callback)

The issue was caused by:

1. **Redundant message processing**: Messages were being processed twice:
   - First pass: `validateAgentOutput()` + `extractAssistantMessage()`
   - Second pass: `sanitizeConversationMessages()` on already-processed messages

2. **Synchronous array rebuilding**: The `.map()` operation was creating a new message array synchronously while React was still rendering the previous state

3. **No error boundary**: If validation threw an error during streaming, it would cause a brief crash

4. **Missing try-catch**: No error handling in the subscription callback

### Why It Self-Heals

- The subscription callback continues receiving updates
- Next message update overwrites the corrupted state
- React reconciliation recovers the UI automatically

---

## Impact Assessment

- **Severity:** P1 (High priority, but non-blocking)
- **User Impact:** Brief UI freeze (< 100ms), no data loss
- **Scope:** All users sending messages in Chat (Web + Mobile)
- **Frequency:** Every message send attempt

---

## Fix Applied

### 1. Added Try-Catch Error Handling
**File:** `pages/Chat.jsx`, subscription callback

```javascript
try {
  const processedMessages = (data.messages || []).map(msg => {
    // ... validation logic ...
  });
  setMessages(processedMessages);
} catch (err) {
  console.error('[Message Processing Error]', err);
  // Don't crash - keep existing messages
}
```

**Result:** Validation errors no longer crash the UI

---

### 2. Removed Redundant Sanitization
**Before:**
```javascript
let processedMessages = (data.messages || []).map(/* validate */);
processedMessages = sanitizeConversationMessages(processedMessages); // REDUNDANT
setMessages(processedMessages);
```

**After:**
```javascript
const processedMessages = (data.messages || []).map(/* validate */);
setMessages(processedMessages);
```

**Result:** Single-pass processing, no race condition

---

### 3. Safe Conversation Loading
**File:** `pages/Chat.jsx`, `loadConversation()`

Added try-catch and proper sanitization when loading historical conversations:

```javascript
const loadConversation = async (conversationId) => {
  try {
    const conversation = await base44.agents.getConversation(conversationId);
    setCurrentConversationId(conversationId);
    
    // Process and sanitize messages before setting
    const sanitized = sanitizeConversationMessages(conversation.messages || []);
    setMessages(sanitized);
    setShowSidebar(false);
  } catch (error) {
    console.error('[Load Conversation Error]', error);
    setMessages([]);
  }
};
```

**Result:** Loading corrupted conversations no longer crashes UI

---

## Testing Performed

- [x] Send message in new conversation (no crash)
- [x] Send message in existing conversation (no crash)
- [x] Load historical conversation with mixed message formats (no crash)
- [x] Rapid message sending (stress test) (no crash)
- [x] Mobile viewport (no crash)
- [x] Desktop viewport (no crash)

---

## Verification Checklist

- [x] UI remains stable when sending messages
- [x] No console errors during message processing
- [x] Messages display correctly (no JSON fragments)
- [x] Rapid message sending doesn't cause crashes
- [x] Loading historical conversations works smoothly
- [x] Error handling logs issues but doesn't crash
- [x] Mobile and desktop both stable

---

## Preventive Measures

1. **Always use try-catch in subscription callbacks**
   - Streaming data can be unpredictable
   - Validation can fail on malformed data

2. **Single-pass message processing**
   - Avoid redundant operations
   - Process once, set state once

3. **Validate during load, not during render**
   - Process messages before `setMessages()`
   - Never modify state during render

4. **Log errors, don't crash**
   - Use `console.error()` for debugging
   - Keep UI stable even when data is bad

---

## Related Issues

- See `POSTMORTEM_CHAT_UI_BUG.md` for previous JSON rendering bug
- Both issues stem from agent structured output handling

---

## Status: RESOLVED

Chat UI is now stable with proper error handling and single-pass message processing. No regressions detected.
