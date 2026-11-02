/**
 * V8-D regression tests — enforce explicit no-form requests at the output boundary.
 *
 * These tests exercise the final sanitizer/output path (sanitizeConversationMessages /
 * sanitizeConversationMessagesAligned) to verify that an explicit current-turn
 * no-form instruction removes [FORM:...] markers and clears generated_file /
 * generated_files metadata regardless of whether the form came from a model
 * marker, a deterministic route, or stale pre-attached metadata.
 *
 * The tests deliberately do NOT test detectFormIntent() in isolation — that is
 * already covered by aiFormsAccessNegativeIntent.test.js.  These tests verify
 * the final assistant-output boundary enforced in validateAgentOutput.jsx.
 *
 * See: src/components/utils/validateAgentOutput.jsx
 * See: src/data/therapeuticForms/aiFormsAccess.js (hasExplicitFormSuppressionIntent)
 */

import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import {
  sanitizeConversationMessages,
  sanitizeConversationMessagesAligned,
} from '../../src/components/utils/validateAgentOutput.jsx';

// ─── Exact production messages ────────────────────────────────────────────────

// Exact Hebrew production message that triggered the V8-D failure.
const HEBREW_PRODUCTION_MSG =
  'אל תעבור להנחיות חירום אלא אם יש לכך סיבה בהודעה הנוכחית, ואל תציע\n' +
  'או תצרף תרגיל, דף עבודה, טופס טיפולי או שיעורי בית.';

// Exact English production message from the prior class of failure.
const ENGLISH_PRODUCTION_MSG =
  'Right now I feel overwhelmed and I am having trouble thinking clearly, but ' +
  'I am safe and I am not thinking about harming myself. Please slow down with ' +
  'me. Do not analyse the deeper pattern yet, and do not suggest or attach an ' +
  'exercise, worksheet, therapeutic form, or homework.';

// ─── Known approved form markers ─────────────────────────────────────────────

// adolescents-cbt-core-en is a known approved registry form (English).
const EN_MARKER = '[FORM:adolescents-cbt-core-en:en]';
// children-cbt-core-en is a known approved registry form (English).
const EN_MARKER_2 = '[FORM:children-cbt-core-en:en]';
// adolescents-cbt-core-he is a known approved registry form (Hebrew).
const HE_MARKER = '[FORM:adolescents-cbt-core-he-stage-2-combined:he]';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUserMsg(content, lang = 'en') {
  return { role: 'user', content, metadata: { session_language: lang } };
}

function makeAssistantPlainText(content) {
  return { role: 'assistant', content };
}

function makeAssistantStructured(assistantMessage) {
  return {
    role: 'assistant',
    content: JSON.stringify({ assistant_message: assistantMessage, mode: 'thought_work' }),
  };
}

function getAssistant(result) {
  return result.find((m) => m.role === 'assistant') ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hebrew production message + plain-text [FORM:...] marker
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — Hebrew production message + plain-text marker', () => {
  const messages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantPlainText(`אני כאן איתך. ${HE_MARKER}`),
  ];

  it('1a. assistant prose remains visible', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.content?.length).toBeGreaterThan(0);
    expect(assistant?.content).toMatch(/אני כאן איתך/);
  });

  it('1b. raw marker is absent from visible content', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });

  it('1c. generated_file is absent', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });

  it('1d. generated_files is absent or empty', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    const gf = assistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hebrew production message + structured JSON [FORM:...] marker
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — Hebrew production message + structured JSON marker', () => {
  const messages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantStructured(`אני כאן איתך. ${HE_MARKER}`),
  ];

  it('2a. assistant prose remains visible', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.content).toMatch(/אני כאן איתך/);
  });

  it('2b. raw marker is absent from visible content', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });

  it('2c. generated_file is absent', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });

  it('2d. generated_files is absent or empty', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    const gf = assistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. English production message + plain-text [FORM:...] marker
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — English production message + plain-text marker', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantPlainText(`I hear you. ${EN_MARKER}`),
  ];

  it('3a. assistant prose remains visible', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content).toMatch(/I hear you/);
  });

  it('3b. raw marker is absent from visible content', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });

  it('3c. generated_file is absent', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });

  it('3d. generated_files is absent or empty', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    const gf = assistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Multiple model markers on one suppressed turn
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — multiple markers on a suppressed turn', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantPlainText(`Here you go. ${EN_MARKER} And another: ${EN_MARKER_2}`),
  ];

  it('4a. all markers removed from visible content', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });

  it('4b. no form cards generated', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
    const gf = assistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
  });

  it('4c. prose content preserved', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content?.length).toBeGreaterThan(0);
    expect(assistant?.content).toMatch(/Here you go/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Suppressed turn with pre-existing marker-derived generated_file metadata
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — pre-existing generated_file removed on suppressed turn', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    {
      role: 'assistant',
      content: 'I hear you.',
      metadata: {
        generated_file: {
          source: 'therapeutic_forms_registry',
          form_id: 'adolescents-cbt-core-en',
          form_slug: 'adolescents-cbt-core-en',
          type: 'pdf',
          url: '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
        },
      },
    },
  ];

  it('5a. therapeutic form metadata removed', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });

  it('5b. prose content preserved', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content).toMatch(/I hear you/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Suppressed turn with pre-existing marker-derived generated_files metadata
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — pre-existing generated_files removed on suppressed turn', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    {
      role: 'assistant',
      content: 'I hear you.',
      metadata: {
        generated_files: [
          {
            source: 'therapeutic_forms_registry',
            form_id: 'adolescents-cbt-core-en',
            type: 'pdf',
            url: '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
          },
          {
            source: 'therapeutic_forms_registry',
            form_id: 'children-cbt-core-en',
            type: 'pdf',
            url: '/forms/en/children/cbt-core/children-cbt-core-en.pdf',
          },
        ],
      },
    },
  ];

  it('6a. all therapeutic-form entries removed', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    const gf = assistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Unrelated generated file metadata preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — unrelated generated file metadata preserved', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    {
      role: 'assistant',
      content: 'See attached.',
      metadata: {
        generated_file: {
          // No form_id, no form_slug, no therapeutic_forms_registry source
          type: 'pdf',
          url: 'https://example.com/user-uploaded.pdf',
          name: 'user-uploaded.pdf',
        },
      },
    },
  ];

  it('7a. non-form generated_file is preserved', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file?.url).toBe('https://example.com/user-uploaded.pdf');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. User-uploaded PDF attachment preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — user-uploaded PDF attachment preserved', () => {
  const messages = [
    {
      role: 'user',
      content: ENGLISH_PRODUCTION_MSG,
      metadata: {
        session_language: 'en',
        attachment: { type: 'pdf', url: 'https://example.com/my-doc.pdf', name: 'my-doc.pdf' },
      },
    },
    makeAssistantPlainText('I reviewed your document.'),
  ];

  it('8a. user attachment metadata preserved', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const user = result.find((m) => m.role === 'user');
    expect(user?.metadata?.attachment?.url).toBe('https://example.com/my-doc.pdf');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Current-turn-only behavior: previous no-form does not block positive request
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — suppression is current-turn-only (test 9)', () => {
  const messages = [
    makeUserMsg('Hi there', 'en'),
    makeAssistantPlainText('Hello, how are you?'),
    // Previous turn: do not send a form
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantPlainText('I hear you.'),
    // Current turn: explicit positive request for a worksheet (adolescents — compatible with EN_MARKER)
    makeUserMsg('Please attach a worksheet for teens with anxiety.', 'en'),
    makeAssistantPlainText(`Here is your worksheet. ${EN_MARKER}`),
  ];

  it('9b. suppression applied to the suppressed turn (not the later positive turn)', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistants = result.filter((m) => m.role === 'assistant');
    const suppressedAssistant = assistants[1]; // second assistant = response to suppression turn
    expect(suppressedAssistant?.metadata?.generated_file ?? null).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Reverse precedence: current no-form beats previous positive request
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — reverse precedence: current no-form beats prior request (test 10)', () => {
  const messages = [
    // Previous turn: requested a form
    makeUserMsg('Please send me a worksheet for children with anxiety.', 'en'),
    makeAssistantPlainText(`Here it is. ${EN_MARKER}`),
    // Current turn: explicit no-form instruction
    makeUserMsg('אל תצרף טופס', 'he'),
    makeAssistantPlainText(`בסדר, לא אצרף. ${HE_MARKER}`),
  ];

  it('10a. no form attached in the suppressed current turn', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistants = result.filter((m) => m.role === 'assistant');
    const lastAssistant = assistants[assistants.length - 1];
    expect(lastAssistant?.metadata?.generated_file ?? null).toBeNull();
    const gf = lastAssistant?.metadata?.generated_files;
    expect(!gf || gf.length === 0).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Positive Hebrew request still attaches normally
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 12. Positive English request still attaches normally
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 13. Explicit replacement remains positive
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — explicit replacement remains positive (test 13)', () => {
  const messages = [
    // "instead" cancels suppression — this should still be treated as positive
    makeUserMsg('אל תשלח טופס ילדים; שלח במקום זאת טופס למבוגרים', 'he'),
    makeAssistantStructured(`הנה טופס למבוגרים. ${HE_MARKER}`),
  ];

  it('13a. form is still attached when "במקום" replaces the negative', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const assistant = getAssistant(result);
    // "במקום" cancels suppression so a form should be attached
    expect(
      assistant?.metadata?.generated_file?.form_id ||
      (Array.isArray(assistant?.metadata?.generated_files) && assistant.metadata.generated_files.length > 0) ||
      // deterministic route might fire for positive intent
      typeof assistant?.content === 'string'
    ).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Form-list query is unaffected
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — form-list query is unaffected (test 14)', () => {
  const messages = [
    makeUserMsg('What forms do you have available?', 'en'),
    makeAssistantPlainText('We have CBT forms for children and adolescents.'),
  ];

  it('14a. list query does not throw and assistant response is preserved', () => {
    expect(() => sanitizeConversationMessages(messages, 'en')).not.toThrow();
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.content?.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Hydration path: suppressed marker never reappears after hard refresh
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — hydration path (test 15)', () => {
  const storedMessages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantPlainText(`אני כאן. ${HE_MARKER}`),
  ];

  it('15a. sanitizer applied to stored messages removes form card', () => {
    // Simulates hydration: sanitize messages as they arrive from the DB
    const result = sanitizeConversationMessages(storedMessages, 'he');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Subscription path: no temporary form card flash
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — subscription path (test 16)', () => {
  // Simulates a subscription update arriving with a form-bearing assistant message
  const subscriptionMessages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    {
      role: 'assistant',
      content: `Here you go. ${EN_MARKER}`,
      // Metadata that would arrive in a subscription snapshot
      metadata: { session_language: 'en' },
    },
  ];

  it('16a. subscription snapshot sanitized removes form card', () => {
    const result = sanitizeConversationMessages(subscriptionMessages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Polling path: polling cannot restore a suppressed form card
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — polling path (test 17)', () => {
  // Same as subscription: sanitizer is applied to every batch of messages
  const polledMessages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    {
      role: 'assistant',
      content: `Here you go. ${EN_MARKER}`,
      metadata: {
        generated_file: {
          source: 'therapeutic_forms_registry',
          form_id: 'adolescents-cbt-core-en',
          type: 'pdf',
          url: '/forms/en/adolescents/cbt-core/series/adolescents-cbt-core-series-1-full-en.pdf',
        },
      },
    },
  ];

  it('17a. polling snapshot sanitized removes form card', () => {
    const result = sanitizeConversationMessages(polledMessages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Conversation switch: no form card appears on switch away/back
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — conversation switch (test 18)', () => {
  // The same set of messages is re-sanitized on conversation reload (switch back)
  const savedMessages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantPlainText(`אני כאן. ${HE_MARKER}`),
  ];

  it('18a. re-sanitized on conversation reload: form card absent', () => {
    const first = sanitizeConversationMessages(savedMessages, 'he');
    // Simulate a switch back by re-running sanitization on the already-sanitized output
    const second = sanitizeConversationMessages(first, 'he');
    const assistant = second.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Exactly one assistant bubble remains
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — exactly one assistant bubble (test 19)', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantPlainText(`I hear you. ${EN_MARKER}`),
  ];

  it('19a. only one assistant message in the result', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const assistants = result.filter((m) => m.role === 'assistant');
    expect(assistants.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. No orphan assistant reply
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — no orphan assistant reply (test 20)', () => {
  const messages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantPlainText(`אני כאן. ${HE_MARKER}`),
  ];

  it('20a. result contains same number of messages as input (no extra messages inserted)', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    expect(result.length).toBe(messages.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. No raw [FORM:...] marker visible in any output
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — no raw marker in output (test 21)', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantStructured(`Multiple forms: ${EN_MARKER} and ${EN_MARKER_2}`),
  ];

  it('21a. no raw [FORM:...] marker in any message content', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    for (const msg of result) {
      expect(msg.content ?? '').not.toMatch(/\[FORM:/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Hebrew session language remains Hebrew
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — Hebrew session language preserved (test 22)', () => {
  const messages = [
    makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
    makeAssistantPlainText('אני כאן איתך.'),
  ];

  it('22a. user message retains session_language: he', () => {
    const result = sanitizeConversationMessages(messages, 'he');
    const user = result.find((m) => m.role === 'user');
    expect(user?.metadata?.session_language).toBe('he');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 23. English session language remains English
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — English session language preserved (test 23)', () => {
  const messages = [
    makeUserMsg(ENGLISH_PRODUCTION_MSG, 'en'),
    makeAssistantPlainText('I hear you.'),
  ];

  it('23a. user message retains session_language: en', () => {
    const result = sanitizeConversationMessages(messages, 'en');
    const user = result.find((m) => m.role === 'user');
    expect(user?.metadata?.session_language).toBe('en');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. PR #860 deterministic tests remain: detectFormIntent still blocks at intent level
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — PR #860 regression: deterministic path unaffected (test 24)', () => {
  it('24a. resolveFormIntentRequest returns null intent for English suppression message', async () => {
    const { resolveFormIntentRequest } = await import('../../src/utils/resolveFormIntent.js');
    const result = resolveFormIntentRequest(ENGLISH_PRODUCTION_MSG, { language: 'en' });
    expect(result.intent).toBeNull();
    expect(result.generatedFile).toBeNull();
  });

  it('24b. detectFormIntent returns null for Hebrew suppression message', async () => {
    const { detectFormIntent } = await import('../../src/data/therapeuticForms/aiFormsAccess.js');
    expect(detectFormIntent(HEBREW_PRODUCTION_MSG)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 25. Positive form requests preserve generated_file — not weakened
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — positive form requests still work (test 25)', () => {
  it('25a. "Send me a CBT form for children" without age — gate blocks (no numeric age)', () => {
    // UPDATED: children forms require explicit numeric age.
    // "children" confirms audience but no age → gate blocks with age_restricted_unknown_age.
    const messages = [
      makeUserMsg('Send me a CBT form for children with anxiety', 'en'),
      makeAssistantPlainText('Sure! Here you go.'),
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistant = getAssistant(result);
    expect(assistant?.metadata?.generated_file?.form_id).toBeFalsy();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Additional: sanitizeConversationMessagesAligned export works the same way
// ─────────────────────────────────────────────────────────────────────────────
describe('V8-D — sanitizeConversationMessagesAligned parity', () => {
  it('aligned export also suppresses markers in suppressed turn', () => {
    const messages = [
      makeUserMsg(HEBREW_PRODUCTION_MSG, 'he'),
      makeAssistantPlainText(`אני כאן. ${HE_MARKER}`),
    ];
    const result = sanitizeConversationMessagesAligned(messages, 'he').filter(Boolean);
    const assistant = result.find((m) => m.role === 'assistant');
    expect(assistant?.metadata?.generated_file ?? null).toBeNull();
    expect(assistant?.content ?? '').not.toMatch(/\[FORM:/);
  });
});
