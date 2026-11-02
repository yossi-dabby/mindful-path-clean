/**
 * @file test/utils/stuckResponseFix.test.js
 *
 * Stuck-Response Fix — Regression Tests
 *
 * ROOT CAUSE
 * ----------
 * The `safeUpdateMessages` helper in Chat.jsx contains a content regression
 * guard intended to prevent a polling snapshot from overwriting a streamed
 * assistant reply with a shorter stored version.
 *
 * The guard compares the LAST confirmed assistant message with the LAST
 * assistant message in the incoming batch and rejects updates where the new
 * message is materially shorter (< 75% of the old length, when old > 80 chars).
 *
 * Bug: the guard did NOT check whether the two messages were from the SAME
 * turn.  When a user sent turn N+1 and the agent replied with a short message,
 * the guard compared:
 *   - "old"  → the last assistant message from turn N   (e.g. 300 chars)
 *   - "new"  → the last assistant message from turn N+1 (e.g. 80 chars)
 *
 * Because 80 < 300 * 0.75 = 225, the guard rejected the update — the new
 * reply was silently discarded and the UI appeared stuck.  The reply was
 * visible only after exit and re-entry because loadConversation resets
 * lastConfirmedMessagesRef before calling safeUpdateMessages.
 *
 * FIX
 * ---
 * The guard now additionally checks:
 *   1. `isSameMessageCount` — the incoming batch has the same number of
 *      messages as the confirmed baseline (a growing batch means a new turn).
 *   2. `isSameMessageId`    — when both messages carry an `id`, the ids must
 *      match (different ids = different turn).
 *
 * The guard only fires when BOTH conditions are true (isSameTurn = true).
 *
 * TESTS STRUCTURE
 * ---------------
 * Section A — Guard fires correctly for same-turn overwrites (protection preserved)
 * Section B — Guard is bypassed for new-turn shorter replies (the bug, now fixed)
 * Section C — Guard bypassed when IDs differ even at same count (extra safety)
 * Section D — Other safeUpdateMessages gates are unaffected by the fix
 */

import { describe, it, expect } from 'vitest';

// ─── Mirror the regression-guard logic from safeUpdateMessages ────────────────
//
// These helpers replicate the exact decision branches so we can test them
// without mounting the full React component.

/**
 * Returns true when the content regression guard (as patched) would BLOCK
 * an update, false when it would allow it.
 *
 * Mirrors Chat.jsx safeUpdateMessages — the FIXED version.
 */
function regressionGuardWouldBlock(confirmedMessages, incomingMessages) {
  const lastConfirmedAssistant = confirmedMessages
    .filter((m) => m.role === 'assistant')
    .pop();
  const newAssistant = incomingMessages.filter((m) => m.role === 'assistant').pop();

  // Guard only runs when both sides have an assistant message.
  if (!lastConfirmedAssistant || !newAssistant) return false;

  const oldContent = String(lastConfirmedAssistant.content);
  const newContent = String(newAssistant.content);

  // FIXED: only block same-turn overwrites.
  const isSameMessageCount = incomingMessages.length === confirmedMessages.length;
  const isSameMessageId =
    !lastConfirmedAssistant.id ||
    !newAssistant.id ||
    lastConfirmedAssistant.id === newAssistant.id;
  const isSameTurn = isSameMessageCount && isSameMessageId;

  const oldLen = oldContent.length;
  const newLen = newContent.length;
  return isSameTurn && oldLen > 80 && newLen < oldLen * 0.75;
}

/**
 * Returns true when the OLD (pre-fix) guard would BLOCK the update.
 * Used to prove the fix changed behaviour in the bug scenario.
 */
function oldRegressionGuardWouldBlock(confirmedMessages, incomingMessages) {
  const lastConfirmedAssistant = confirmedMessages
    .filter((m) => m.role === 'assistant')
    .pop();
  const newAssistant = incomingMessages.filter((m) => m.role === 'assistant').pop();

  if (!lastConfirmedAssistant || !newAssistant) return false;

  const oldContent = String(lastConfirmedAssistant.content);
  const newContent = String(newAssistant.content);
  const oldLen = oldContent.length;
  const newLen = newContent.length;
  return oldLen > 80 && newLen < oldLen * 0.75;
}

// ─── Section A — Same-turn overwrite protection (guard should still block) ────

describe('stuckResponseFix — regression guard still blocks same-turn overwrites', () => {
  it('blocks a shorter stored snapshot overwriting the same streaming message', () => {
    // Scenario: subscription delivered a 300-char streaming reply for turn 2.
    // A polling snapshot then arrives with the same message count (2) but
    // a shorter stored version (200 chars).  Guard must fire.
    const longReply = 'A'.repeat(300);
    const shorterSnapshot = 'A'.repeat(200); // < 300 * 0.75 = 225

    const confirmed = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: longReply, id: 'a1' },
    ];
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: shorterSnapshot, id: 'a1' }, // SAME id
    ];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(true);
  });

  it('blocks same-turn overwrite when ids are absent (no-id fallback)', () => {
    const longReply = 'B'.repeat(400);
    const veryShort = 'B'.repeat(50); // 50 < 400 * 0.75 = 300

    const confirmed = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: longReply },
    ];
    const incoming = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: veryShort },
    ];

    // Same count, no ids — guard treats as same turn and blocks.
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(true);
  });

  it('blocks overwrite at exactly the 75% boundary (just below threshold)', () => {
    // oldLen = 100; threshold = 75; newLen = 74 → blocked
    const oldContent = 'X'.repeat(100);
    const newContent = 'X'.repeat(74);

    const confirmed = [{ role: 'assistant', content: oldContent, id: 'a1' }];
    const incoming = [{ role: 'assistant', content: newContent, id: 'a1' }];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(true);
  });

  it('does NOT block when new length is exactly 75% of old (boundary inclusive)', () => {
    // oldLen = 100; newLen = 75 → 75 < 75? false → allowed
    const oldContent = 'X'.repeat(100);
    const newContent = 'X'.repeat(75);

    const confirmed = [{ role: 'assistant', content: oldContent, id: 'a1' }];
    const incoming = [{ role: 'assistant', content: newContent, id: 'a1' }];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('does NOT block when old content is ≤ 80 chars (guard minimum threshold)', () => {
    // Guard only fires when oldLen > 80. Short confirmed replies are excluded.
    const oldContent = 'X'.repeat(80);
    const newContent = 'X'.repeat(10);

    const confirmed = [{ role: 'assistant', content: oldContent, id: 'a1' }];
    const incoming = [{ role: 'assistant', content: newContent, id: 'a1' }];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });
});

// ─── Section B — New-turn replies must NOT be blocked (the bug, now fixed) ────

describe('stuckResponseFix — new-turn shorter replies are no longer blocked', () => {
  it('allows a new shorter assistant reply when message count increased (core bug scenario)', () => {
    // Scenario: previous turn had a long reply (a2 = 300 chars).
    // New turn: user sends u3, agent replies with short a3 (80 chars).
    // Confirmed baseline = [u1, a1, u2, a2] (4 messages, a2 = 300 chars).
    // Incoming (via subscription) = [u1, a1, u2, a2, u3, a3] (6 messages, a3 = 80 chars).
    // Fixed guard: isSameMessageCount = false → guard is bypassed → reply shown live.

    const longPreviousReply = 'Previous turn long response '.repeat(12); // ~336 chars
    const shortNewReply = 'That is a great insight!'; // 24 chars — far below 75%

    const confirmed = [
      { role: 'user', content: 'msg 1', id: 'u1' },
      { role: 'assistant', content: 'Reply 1', id: 'a1' },
      { role: 'user', content: 'msg 2', id: 'u2' },
      { role: 'assistant', content: longPreviousReply, id: 'a2' },
    ];

    const incoming = [
      { role: 'user', content: 'msg 1', id: 'u1' },
      { role: 'assistant', content: 'Reply 1', id: 'a1' },
      { role: 'user', content: 'msg 2', id: 'u2' },
      { role: 'assistant', content: longPreviousReply, id: 'a2' },
      { role: 'user', content: 'msg 3', id: 'u3' },
      { role: 'assistant', content: shortNewReply, id: 'a3' }, // NEW turn
    ];

    // OLD guard would have blocked this — prove the bug existed.
    expect(oldRegressionGuardWouldBlock(confirmed, incoming)).toBe(true);

    // FIXED guard must allow it.
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('allows new reply when only user message arrived first (subscription partial)', () => {
    // Subscription fires with [u1, a1, u2] (user msg added, no assistant yet).
    // Confirmed advances to [u1, a1, u2].
    // Subscription fires again with [u1, a1, u2, a2] where a2 is shorter than a1.
    // isSameMessageCount: incoming(4) !== confirmed(3) → guard bypassed.

    const longFirstReply = 'First reply '.repeat(25); // 300 chars
    const shortSecondReply = 'Second reply, brief answer.'; // 27 chars

    const confirmed = [
      { role: 'user', content: 'turn 1', id: 'u1' },
      { role: 'assistant', content: longFirstReply, id: 'a1' },
      { role: 'user', content: 'turn 2', id: 'u2' }, // user msg arrived
    ];

    const incoming = [
      { role: 'user', content: 'turn 1', id: 'u1' },
      { role: 'assistant', content: longFirstReply, id: 'a1' },
      { role: 'user', content: 'turn 2', id: 'u2' },
      { role: 'assistant', content: shortSecondReply, id: 'a2' }, // new reply
    ];

    // OLD guard would block (comparing a1 vs a2).
    expect(oldRegressionGuardWouldBlock(confirmed, incoming)).toBe(true);

    // FIXED guard must allow it.
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('allows a new short reply when conversation was loaded fresh (loadConversation reset)', () => {
    // After loadConversation, lastConfirmedMessagesRef is reset to [].
    // The first subscription/polling response with [u1, a1] must pass.
    // confirmed = [] (empty after reset), incoming = [u1, a1] (short reply).

    const confirmed = []; // after reset
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: 'Hi!', id: 'a1' }, // very short
    ];

    // Guard does not fire when confirmed has no assistant messages.
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('allows new reply with count +1 even when confirmed has a very long assistant reply', () => {
    // Stress test: previous reply was 1000 chars; new reply is only 50 chars.
    // The old guard would absolutely block (50 < 1000 * 0.75 = 750).
    // The new guard sees count increase and allows it.

    const massivePreviousReply = 'Very long previous session response. '.repeat(30); // ~1110 chars
    const quickNewReply = 'Yes, exactly right.'; // 19 chars

    const confirmed = [
      { role: 'user', content: 'q', id: 'u1' },
      { role: 'assistant', content: massivePreviousReply, id: 'a1' },
    ];
    const incoming = [
      { role: 'user', content: 'q', id: 'u1' },
      { role: 'assistant', content: massivePreviousReply, id: 'a1' },
      { role: 'user', content: 'followup', id: 'u2' },
      { role: 'assistant', content: quickNewReply, id: 'a2' },
    ];

    expect(oldRegressionGuardWouldBlock(confirmed, incoming)).toBe(true);
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });
});

// ─── Section C — Different IDs at same message count bypass the guard ─────────

describe('stuckResponseFix — different message IDs bypass guard even at same count', () => {
  it('bypasses guard when IDs differ at same count (message replaced, not same)', () => {
    // Unusual scenario: message count stays the same but the last assistant
    // message has a different id (e.g., a replaced/re-generated reply).
    // The fix treats differing IDs as a different turn — guard bypassed.

    const oldReply = 'A'.repeat(300);
    const newReply = 'B'.repeat(50); // shorter, different id

    const confirmed = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: oldReply, id: 'a1' },
    ];
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: newReply, id: 'a2' }, // different id
    ];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('applies guard when IDs match at same count (unambiguous same-message overwrite)', () => {
    const oldReply = 'A'.repeat(300);
    const shorterVersion = 'A'.repeat(150); // < 225

    const confirmed = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: oldReply, id: 'a1' },
    ];
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: shorterVersion, id: 'a1' }, // SAME id
    ];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(true);
  });
});

// ─── Section D — Other safeUpdateMessages gates are unaffected ────────────────

describe('stuckResponseFix — other gates remain correct', () => {
  it('same content + same count still triggers no-new-content rejection (separate gate)', () => {
    // The "no new content detected" gate (oldContent === newContent && same length)
    // is separate from the regression guard and must still work.
    const reply = 'This is the same assistant reply content repeated exactly.';

    const confirmed = [
      { role: 'user', content: 'q', id: 'u1' },
      { role: 'assistant', content: reply, id: 'a1' },
    ];
    const incoming = [
      { role: 'user', content: 'q', id: 'u1' },
      { role: 'assistant', content: reply, id: 'a1' }, // identical
    ];

    // This gate is separate and not modelled in regressionGuardWouldBlock,
    // but we verify the regression guard itself does NOT block it
    // (idempotent content is handled by the no-new-content gate, not regression).
    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('new content at same count where new is longer always passes regression guard', () => {
    // Guard condition: newLen < oldLen * 0.75 — longer is never blocked.
    const shortOld = 'A'.repeat(100);
    const longerNew = 'A'.repeat(200);

    const confirmed = [{ role: 'assistant', content: shortOld, id: 'a1' }];
    const incoming = [{ role: 'assistant', content: longerNew, id: 'a1' }];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('new content at same count where new is between 75-100% of old passes guard', () => {
    // 80 chars confirmed → threshold = 60.  New = 65 chars → allowed.
    const oldReply = 'A'.repeat(100);
    const newReply = 'A'.repeat(80); // 80 >= 75

    const confirmed = [{ role: 'assistant', content: oldReply, id: 'a1' }];
    const incoming = [{ role: 'assistant', content: newReply, id: 'a1' }];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('guard is skipped entirely when there are no assistant messages in either list', () => {
    const confirmed = [{ role: 'user', content: 'Hello', id: 'u1' }];
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'user', content: 'Another user msg', id: 'u2' },
    ];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });

  it('guard is skipped when confirmed has no assistant messages (fresh load)', () => {
    // After lastConfirmedMessagesRef.current = [] reset (loadConversation),
    // any incoming content must pass — no confirmed assistant to compare against.
    const confirmed = [];
    const incoming = [
      { role: 'user', content: 'Hello', id: 'u1' },
      { role: 'assistant', content: 'Hi there!', id: 'a1' },
    ];

    expect(regressionGuardWouldBlock(confirmed, incoming)).toBe(false);
  });
});
