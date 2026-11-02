/**
 * Tests for conversation sanitization logic.
 *
 * Two related sanitization surfaces are tested here:
 *
 * 1. Pure JSON-extraction logic that mirrors functions/sanitizeConversation.ts.
 *    That file is a Deno serverless function excluded from vitest, so the
 *    core extraction logic is reproduced inline.
 *
 * 2. The exported sanitizeConversationMessages function from
 *    src/components/utils/validateAgentOutput.jsx, which applies the same
 *    pattern at the frontend layer.
 *
 * Covers:
 *   - JSON-like assistant messages: assistant_message field is extracted
 *   - Non-JSON content passes through unchanged
 *   - User messages (role !== 'assistant') are never modified
 *   - Messages without content are returned as-is
 *   - Malformed JSON that cannot be parsed passes through unchanged
 *   - Mixed arrays with a combination of clean and JSON-corrupted messages
 *   - Null/empty message arrays are handled gracefully
 *   - No internal/system data leaks through the extracted content path
 *
 * If the extraction logic in sanitizeConversation.ts or sanitizeConversationMessages
 * changes, update this file to match.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeConversationMessages,
  serializeAttachmentMetadataMarker,
  extractAttachmentMetadataFromUserContent,
  ATTACHMENT_METADATA_MARKER_PREFIX,
  stripAgentOnlyRuntimeBlocksFromUserContent,
  stripLeadingInternalAssistantTags,
  stripLeadingInternalCorrectionBlocks,
} from '../../src/components/utils/validateAgentOutput.jsx';
import {
  THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_END,
  THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START,
  THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER,
} from '../../src/lib/therapeuticFormsPolicy.js';
import {
  createInternalCorrectionIntent,
  consumeInternalCorrectionIntent,
  hasInternalCorrectionIntent,
  hasPendingInternalCorrectionIntent,
  internalCorrectionScopeMatches,
  INTERNAL_CORRECTION_TYPES,
  INTERNAL_CORRECTION_CHANNEL,
} from '../../src/lib/internalCorrectionChannel.js';

// ─── PURE JSON-EXTRACTION LOGIC (mirrors functions/sanitizeConversation.ts) ───

/**
 * Mirrors the per-message extraction logic in sanitizeConversation.ts.
 * Returns the extracted assistant_message if the content is JSON-like and
 * contains that field; otherwise returns the original message unchanged.
 */
function sanitizeMessageIfJsonCorrupted(msg) {
  if (msg.role === 'assistant' && msg.content) {
    const content = msg.content;

    if (typeof content === 'string' && content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.assistant_message) {
          return {
            ...msg,
            content: parsed.assistant_message,
            metadata: {
              ...(msg.metadata || {}),
              structured_data: parsed,
              sanitized_at: new Date().toISOString(),
            },
          };
        }
      } catch (e) {
        // parse error — leave unchanged
      }
    }
  }
  return msg;
}

// ─── TESTS — pure extraction logic (mirrors sanitizeConversation.ts) ──────────

describe('sanitizeConversation — pure JSON extraction logic', () => {
  it('extracts assistant_message from a JSON-like assistant message', () => {
    const msg = {
      role: 'assistant',
      content: JSON.stringify({ assistant_message: 'That sounds really difficult.' }),
    };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe('That sounds really difficult.');
  });

  it('leaves a plain-text assistant message unchanged', () => {
    const msg = { role: 'assistant', content: 'How are you feeling today?' };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe('How are you feeling today?');
  });

  it('leaves a user message unchanged regardless of content', () => {
    const msg = { role: 'user', content: JSON.stringify({ assistant_message: 'injected' }) };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    // User messages must never be rewritten
    expect(result.content).toBe(msg.content);
  });

  it('leaves a system message unchanged', () => {
    const msg = { role: 'system', content: '{"assistant_message":"should not extract"}' };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe(msg.content);
  });

  it('handles an assistant message with no content field', () => {
    const msg = { role: 'assistant' };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result).toEqual(msg);
  });

  it('handles an assistant message where JSON lacks assistant_message field', () => {
    const msg = {
      role: 'assistant',
      content: JSON.stringify({ other_field: 'some value' }),
    };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe(msg.content);
  });

  it('handles malformed JSON in an assistant message gracefully', () => {
    const msg = { role: 'assistant', content: '{ broken json ::: }' };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    // Cannot parse — must be returned unchanged, no crash
    expect(result.content).toBe('{ broken json ::: }');
  });

  it('does not extract from content that does not start with {', () => {
    const msg = { role: 'assistant', content: 'No JSON here at all.' };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe('No JSON here at all.');
  });

  it('preserves metadata from the original message when extracting', () => {
    const msg = {
      role: 'assistant',
      content: JSON.stringify({ assistant_message: 'I hear you.' }),
      metadata: { session_id: 'abc123' },
    };
    const result = sanitizeMessageIfJsonCorrupted(msg);
    expect(result.content).toBe('I hear you.');
    expect(result.metadata?.session_id).toBe('abc123');
    expect(result.metadata?.structured_data).toBeDefined();
    // sanitized_at should be a valid ISO timestamp string
    expect(typeof result.metadata?.sanitized_at).toBe('string');
    expect(result.metadata?.sanitized_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── TESTS — sanitizeConversationMessages (from validateAgentOutput.jsx) ──────

describe('sanitizeConversationMessages — exported frontend function', () => {
  it('returns an empty array when given an empty array', () => {
    expect(sanitizeConversationMessages([])).toEqual([]);
  });

  it('returns an empty array when given null', () => {
    expect(sanitizeConversationMessages(null)).toEqual([]);
  });

  it('returns an empty array when given undefined', () => {
    expect(sanitizeConversationMessages(undefined)).toEqual([]);
  });

  it('returns an empty array when given a non-array', () => {
    expect(sanitizeConversationMessages('not an array')).toEqual([]);
    expect(sanitizeConversationMessages(42)).toEqual([]);
  });

  it('passes through a plain-text assistant message without modification', () => {
    const messages = [
      { role: 'assistant', content: 'I hear you. How are you feeling today?' },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('I hear you. How are you feeling today?');
  });

  it('passes through user messages without modification', () => {
    const messages = [
      { role: 'user', content: 'I am feeling anxious.' },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('I am feeling anxious.');
  });

  it('does not modify user messages even if they look like JSON', () => {
    const messages = [
      { role: 'user', content: '{"assistant_message":"injected content"}' },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result[0].content).toBe('{"assistant_message":"injected content"}');
  });

  it('sanitizes a JSON-corrupted assistant message and extracts assistant_message', () => {
    const assistantMessage = 'That sounds really difficult to manage.';
    const messages = [
      {
        role: 'assistant',
        content: JSON.stringify({
          assistant_message: assistantMessage,
          mode: 'thought_work',
          situation: 'stress at work',
        }),
      },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result[0].content).toBe(assistantMessage);
  });

  it('handles a mixed array of clean, JSON-corrupted, and user messages', () => {
    const messages = [
      { role: 'user', content: 'I have been stressed lately.' },
      {
        role: 'assistant',
        content: JSON.stringify({ assistant_message: 'I understand. What triggered that?' }),
      },
      { role: 'user', content: 'Work pressure.' },
      { role: 'assistant', content: 'That is really common. How are you managing?' },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(4);
    expect(result[0].content).toBe('I have been stressed lately.');
    expect(result[1].content).toBe('I understand. What triggered that?');
    expect(result[2].content).toBe('Work pressure.');
    expect(result[3].content).toBe('That is really common. How are you managing?');
  });

  it('handles an assistant message without a content field', () => {
    const messages = [{ role: 'assistant' }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    // No crash expected
    expect(result[0].role).toBe('assistant');
  });

  it('handles malformed JSON in an assistant message without crashing', () => {
    const messages = [{ role: 'assistant', content: '{ not valid json' }];
    const result = sanitizeConversationMessages(messages);
    // Should not throw; content passes through as-is or as original
    expect(result).toHaveLength(1);
  });

  it('preserves message role after sanitization', () => {
    const messages = [
      {
        role: 'assistant',
        content: JSON.stringify({ assistant_message: 'I hear you.' }),
      },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result[0].role).toBe('assistant');
  });

  it('extracts attachment metadata marker from a user message and keeps clean content', () => {
    const marker = serializeAttachmentMetadataMarker({
      type: 'image',
      url: 'https://files.example.com/photo.jpg',
      name: 'photo.jpg',
      size: 1234
    });
    const messages = [
      { role: 'user', content: `Here is the photo\n${marker}` },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Here is the photo');
    expect(result[0].metadata?.attachment).toEqual({
      type: 'image',
      url: 'https://files.example.com/photo.jpg',
      name: 'photo.jpg',
      size: 1234
    });
  });

  it('extracts attachment metadata marker when message starts with [START_SESSION] wrapper', () => {
    const marker = serializeAttachmentMetadataMarker({
      type: 'pdf',
      url: 'https://files.example.com/file.pdf',
      name: 'file.pdf'
    });
    const messages = [
      {
        role: 'user',
        content: `[START_SESSION]\n\nI attached the PDF\n${marker}`
      },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('I attached the PDF');
    expect(result[0].metadata?.attachment).toEqual({
      type: 'pdf',
      url: 'https://files.example.com/file.pdf',
      name: 'file.pdf'
    });
  });

  it('strips [ATTACHMENT_CONTEXT] block while preserving attachment metadata', () => {
    const marker = serializeAttachmentMetadataMarker({
      type: 'image',
      url: 'https://files.example.com/image.png',
      name: 'image.png'
    });
    const messages = [
      {
        role: 'user',
        content: `Please review this\n[ATTACHMENT_CONTEXT]\ntype: image\nurl: https://files.example.com/image.png\n${marker}`
      },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Please review this');
    expect(result[0].metadata?.attachment).toEqual({
      type: 'image',
      url: 'https://files.example.com/image.png',
      name: 'image.png'
    });
  });

  it('keeps attachment-only user messages render-safe after sanitization', () => {
    const marker = serializeAttachmentMetadataMarker({
      type: 'pdf',
      url: 'https://files.example.com/doc.pdf',
      name: 'doc.pdf'
    });
    const messages = [
      {
        role: 'user',
        content: `[ATTACHMENT_CONTEXT]\ntype: pdf\nurl: https://files.example.com/doc.pdf\n${marker}`
      },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('');
    expect(result[0].metadata?.attachment).toEqual({
      type: 'pdf',
      url: 'https://files.example.com/doc.pdf',
      name: 'doc.pdf'
    });
  });

  it('separates long assistant PDF analysis into short content plus metadata overflow', () => {
    const longAssistantReply = `I read your PDF.\n- Key point one from the document.\n- Key point two from the document.\n- Key point three from the document.\n${'Additional detail line from the document. '.repeat(30)}`.trim();
    const messages = [
      {
        role: 'user',
        content: 'Please analyze this PDF',
        metadata: {
          attachment: {
            type: 'pdf',
            url: 'https://files.example.com/report.pdf',
            name: 'report.pdf'
          },
          pdf_extracted_text: 'Document body text'
        }
      },
      { role: 'assistant', content: longAssistantReply }
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1].content.length).toBeLessThan(longAssistantReply.length);
    expect(result[1].metadata?.pdf_analysis_overflow).toBeTruthy();
    expect(result[1].metadata.pdf_analysis_overflow.length).toBeGreaterThan(80);
    expect(result[1].content.endsWith('\n')).toBe(false);
    expect(result[1].metadata.pdf_analysis_overflow.startsWith('\n')).toBe(false);
    expect(result[1].content + result[1].metadata.pdf_analysis_overflow).toContain('Additional detail line from the document.');
  });

  it('does not split long assistant text when previous user message is not a PDF turn', () => {
    const longAssistantReply = `I hear you.\n${'This is a long but non-PDF response. '.repeat(30)}`.trim();
    const messages = [
      { role: 'user', content: 'Can you reflect on what I shared?' },
      { role: 'assistant', content: longAssistantReply }
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1].content).toBe(longAssistantReply);
    expect(result[1].metadata?.pdf_analysis_overflow).toBeUndefined();
  });

  it('keeps image-turn assistant replies short and limits follow-up to one prompt', () => {
    const messages = [
      {
        role: 'user',
        content: 'Can you describe this image?',
        metadata: {
          attachment: {
            type: 'image',
            url: 'https://files.example.com/photo.jpg',
            name: 'photo.jpg',
          },
        },
      },
      {
        role: 'assistant',
        content: 'I can see a person sitting near a window with soft lighting and a calm posture. The scene looks quiet and reflective, and the facial expression seems thoughtful. You might be feeling emotionally heavy but still grounded in the moment. Would you like to explore what this moment reminds you of? Would you like me to suggest a short grounding step based on this image?',
      },
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1].content.length).toBeLessThanOrEqual(320);
    const questionCount = (result[1].content.match(/\?/g) || []).length;
    expect(questionCount).toBeLessThanOrEqual(1);
  });

  it('limits PDF-turn assistant replies to max 4 concise bullets in main chat', () => {
    const messages = [
      {
        role: 'user',
        content: 'Please summarize this PDF.',
        metadata: {
          attachment: {
            type: 'pdf',
            url: 'https://files.example.com/summary.pdf',
            name: 'summary.pdf',
          },
          pdf_extracted_text: 'Document content',
        },
      },
      {
        role: 'assistant',
        content: [
          'I reviewed your PDF.',
          '- First key point',
          '- Second key point',
          '- Third key point',
          '- Fourth key point',
          '- Fifth key point',
          '- Sixth key point',
        ].join('\n'),
      },
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    const bullets = result[1].content.match(/^[-*•]\s+/gm) || [];
    expect(bullets.length).toBeLessThanOrEqual(4);
  });

  it('removes raw PDF extraction markers from assistant main chat output', () => {
    const messages = [
      {
        role: 'user',
        content: 'Can you summarize the file?',
        metadata: {
          attachment: {
            type: 'pdf',
            url: 'https://files.example.com/report.pdf',
            name: 'report.pdf',
          },
          pdf_extracted_text: 'Very long extracted source document text',
        },
      },
      {
        role: 'assistant',
        content: `I read your PDF.\nextracted_text: This is a direct raw extraction dump that should not appear in the main chat.\n${'Raw source line from document. '.repeat(35)}`,
      },
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1].content).not.toMatch(/extracted_text\s*:/i);
    expect(result[1].content.length).toBeLessThanOrEqual(420);
  });

  it('limits PDF-turn assistant replies to one follow-up question', () => {
    const messages = [
      {
        role: 'user',
        content: 'What does this document say?',
        metadata: {
          attachment: {
            type: 'pdf',
            url: 'https://files.example.com/doc.pdf',
            name: 'doc.pdf',
          },
          pdf_extracted_text: 'Document content',
        },
      },
      {
        role: 'assistant',
        content: 'I read your PDF. It outlines three key themes. Would you like a quick summary of section one? Would you also like a separate action plan?',
      },
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    const questionCount = (result[1].content.match(/\?/g) || []).length;
    expect(questionCount).toBeLessThanOrEqual(1);
  });

  it('filters likely raw OCR/page-dump lines from PDF-turn assistant replies', () => {
    const rawLine = 'PAGE 2 OF 6';
    const messages = [
      {
        role: 'user',
        content: 'Summarize the attached file.',
        metadata: {
          attachment: {
            type: 'pdf',
            url: 'https://files.example.com/raw.pdf',
            name: 'raw.pdf',
          },
          pdf_extracted_text: 'Document content',
        },
      },
      {
        role: 'assistant',
        // Intentionally punctuation-free and long enough to cross the raw-line
        // threshold used by PDF sanitizer heuristics.
        content: `I reviewed your PDF.\n${rawLine}\nThis line has many words but no punctuation and should be treated as likely extraction output from OCR text blocks that do not belong in concise chat responses`,
      },
    ];

    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[1].content).not.toContain(rawLine);
    expect(result[1].content).not.toContain('OCR text blocks');
  });
});

// ─── TESTS — sanitization boundaries (no internal/system data leaks) ──────────

describe('sanitizeConversationMessages — no internal/system data leaks through', () => {
  it('extracted content does not retain raw JSON structure in the content field', () => {
    const messages = [
      {
        role: 'assistant',
        content: JSON.stringify({
          assistant_message: 'I hear you.',
          situation: 'internal audit field',
          homework: [{ step: 'do x' }],
        }),
      },
    ];
    const result = sanitizeConversationMessages(messages);
    // Content should be the clean message, not the full JSON blob
    expect(result[0].content).toBe('I hear you.');
    expect(result[0].content).not.toContain('"situation"');
    expect(result[0].content).not.toContain('"homework"');
  });

  it('does not introduce new content when an assistant message has no assistant_message field', () => {
    const messages = [
      {
        role: 'assistant',
        content: JSON.stringify({ mode: 'thought_work', situation: 'debug' }),
      },
    ];
    const result = sanitizeConversationMessages(messages);
    // No assistant_message field means original content stays or is null; no new invented content
    // The function should not inject a fabricated message
    expect(result[0].content).toBeDefined();
  });

  it('all messages in output retain their original role', () => {
    const messages = [
      { role: 'user', content: 'Hello.' },
      { role: 'assistant', content: 'Hello back.' },
      { role: 'user', content: 'Thanks.' },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
  });
});

describe('attachment metadata marker helpers', () => {
  it('serializeAttachmentMetadataMarker returns empty string for invalid input', () => {
    expect(serializeAttachmentMetadataMarker(null)).toBe('');
    expect(serializeAttachmentMetadataMarker({})).toBe('');
    expect(serializeAttachmentMetadataMarker({ type: 'image' })).toBe('');
    expect(serializeAttachmentMetadataMarker({ type: 'pdf', url: '' })).toBe('');
  });

  it('serializeAttachmentMetadataMarker serializes valid payloads and keeps optional fields optional', () => {
    const withOptional = serializeAttachmentMetadataMarker({
      type: 'image',
      url: 'https://files.example.com/image.png',
      name: 'image.png',
      size: 2048,
    });
    expect(withOptional.startsWith(ATTACHMENT_METADATA_MARKER_PREFIX)).toBe(true);

    const withoutOptional = serializeAttachmentMetadataMarker({
      type: 'pdf',
      url: 'https://files.example.com/a.pdf',
    });
    const parsedWithoutOptional = JSON.parse(withoutOptional.slice(ATTACHMENT_METADATA_MARKER_PREFIX.length));
    expect(parsedWithoutOptional).toEqual({
      type: 'pdf',
      url: 'https://files.example.com/a.pdf',
    });

    const fileMarker = serializeAttachmentMetadataMarker({
      type: 'file',
      url: 'https://files.example.com/notes.txt',
      name: 'notes.txt',
    });
    const parsedFileMarker = JSON.parse(fileMarker.slice(ATTACHMENT_METADATA_MARKER_PREFIX.length));
    expect(parsedFileMarker).toEqual({
      type: 'file',
      url: 'https://files.example.com/notes.txt',
      name: 'notes.txt',
    });

    const audioMarker = serializeAttachmentMetadataMarker({
      type: 'audio',
      url: 'https://files.example.com/voice.webm',
      name: 'voice.webm',
      size: 4096,
    });
    const parsedAudioMarker = JSON.parse(audioMarker.slice(ATTACHMENT_METADATA_MARKER_PREFIX.length));
    expect(parsedAudioMarker).toEqual({
      type: 'audio',
      url: 'https://files.example.com/voice.webm',
      name: 'voice.webm',
      size: 4096,
    });
  });

  it('extractAttachmentMetadataFromUserContent handles non-string and no-marker inputs', () => {
    expect(extractAttachmentMetadataFromUserContent(null)).toEqual({ content: null, attachment: null });
    expect(extractAttachmentMetadataFromUserContent('plain text')).toEqual({ content: 'plain text', attachment: null });
  });

  it('extractAttachmentMetadataFromUserContent ignores malformed marker JSON', () => {
    const input = `hello\n${ATTACHMENT_METADATA_MARKER_PREFIX}{invalid-json`;
    expect(extractAttachmentMetadataFromUserContent(input)).toEqual({
      content: input,
      attachment: null,
    });
  });

  it('extractAttachmentMetadataFromUserContent uses the last marker occurrence and trims trailing newlines before it', () => {
    const badMarker = `${ATTACHMENT_METADATA_MARKER_PREFIX}{"type":"image","url":"https://files.example.com/old.png"}\n`;
    const goodMarker = `${ATTACHMENT_METADATA_MARKER_PREFIX}{"type":"pdf","url":"https://files.example.com/new.pdf","name":"new.pdf"}`;
    const input = `Body text\n${badMarker}\n${goodMarker}`;
    const result = extractAttachmentMetadataFromUserContent(input);
    expect(result.content).toContain('Body text');
    expect(result.content).toContain('https://files.example.com/old.png');
    expect(result.attachment).toEqual({
      type: 'pdf',
      url: 'https://files.example.com/new.pdf',
      name: 'new.pdf',
    });
  });
});

// ─── TESTS — stripAgentOnlyRuntimeBlocksFromUserContent ───────────────────────

// Exact start/end marker constants (must match workflowContextInjector.js exactly)
const FORM_START = '=== FORMULATION DEEPENING \u2014 THIS TURN ONLY ===';
const FORM_END   = '=== END FORMULATION DEEPENING ===';
const SAFETY_START = '=== SAFETY MODE \u2014 STAGE 2 PHASE 7 ===';
const SAFETY_END   = '=== END SAFETY MODE CONSTRAINTS ===';
const EMERGENCY_START = '=== EMERGENCY RESOURCES \u2014 STAGE 2 PHASE 7 ===';
const EMERGENCY_END   = '=== END EMERGENCY RESOURCES ===';

// Realistic multi-line blocks that mirror actual production supplement structure.
const FORMULATION_BLOCK = [
  FORM_START,
  '',
  'The person is explicitly asking for deeper formulation insight. Apply the following for this response only:',
  '',
  '1. Do not repeat the already-known maintaining cycle.',
  '2. Clearly distinguish: (a) established; (b) inference; (c) unverified hypothesis; (d) still unknown.',
  '3. Any new interpretation MUST be labeled as an unverified hypothesis.',
  '4. Do NOT use certainty language: "the real threat is...", "the true reason is...".',
  '5. End with exactly one collaborative verification question.',
  '',
  FORM_END,
].join('\n');

const SAFETY_BLOCK = [
  SAFETY_START,
  '',
  'DISTRESS DETECTED: Tier-High. Apply safety-first constraints for this response only:',
  '- Acknowledge feelings warmly before any therapeutic move.',
  '- Do not introduce new exercises, homework, or behavioral experiments.',
  '- Keep the response brief and grounding-oriented.',
  '',
  SAFETY_END,
].join('\n');

const EMERGENCY_BLOCK = [
  EMERGENCY_START,
  '',
  'Emergency resources for this session locale (read-only):',
  '- \u05E2\u05E8\u05D5\u05E5 \u05D4\u05E1\u05D9\u05D5\u05E2 \u05DC\u05DE\u05E9\u05D1\u05E8: 1201 (\u05D7\u05D9\u05E0\u05DD, 24/7)',
  '- ERAN: 1201 (free, 24/7)',
  '',
  EMERGENCY_END,
].join('\n');

// Hebrew production message (stored as escaped unicode to avoid test-output leakage)
// Translation: "I feel that you already know the story…"
const HEBREW_USER_MSG =
  '\u05D0\u05E0\u05D9 \u05DE\u05E8\u05D2\u05D9\u05E9 \u05E9\u05D0\u05EA\u05D4 \u05DB\u05D1\u05E8 \u05D9\u05D5\u05D3\u05E2';

describe('stripAgentOnlyRuntimeBlocksFromUserContent — unit tests', () => {

  // A1 — Formulation block + Hebrew message → only Hebrew message
  it('A1. Formulation block followed by a Hebrew user message renders only the Hebrew message', () => {
    const input = `${FORMULATION_BLOCK}\n\n${HEBREW_USER_MSG}`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(input);
    expect(result).toBe(HEBREW_USER_MSG);
    expect(result).not.toContain(FORM_START);
    expect(result).not.toContain(FORM_END);
  });

  // A2 — Safety block + user message → only user message
  it('A2. Safety Mode block followed by a user message renders only the user message', () => {
    const userMsg = 'I feel overwhelmed right now.';
    const input = `${SAFETY_BLOCK}\n\n${userMsg}`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(input);
    expect(result).toBe(userMsg);
    expect(result).not.toContain(SAFETY_START);
    expect(result).not.toContain(SAFETY_END);
  });

  // A3 — Safety + Emergency + user message → only user message
  it('A3. Safety block followed by Emergency Resources block and then the user message renders only the user message', () => {
    const userMsg = 'I need help.';
    const input = `${SAFETY_BLOCK}\n\n${EMERGENCY_BLOCK}\n\n${userMsg}`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(input);
    expect(result).toBe(userMsg);
    expect(result).not.toContain(SAFETY_START);
    expect(result).not.toContain(EMERGENCY_START);
  });

  // A9 — Ordinary multiline user message unchanged
  it('A9. Ordinary multiline user message is returned byte-for-byte unchanged', () => {
    const userMsg = 'Line one.\nLine two.\nLine three with Hebrew: \u05E9\u05DC\u05D5\u05DD.';
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(userMsg);
    expect(result).toBe(userMsg);
  });

  // A10a — Single marker-like start line without closing marker is not stripped
  it('A10a. A lone start-marker line without a closing marker is not stripped', () => {
    const userMsg = `${FORM_START}\nThis is my regular message about formulation.`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(userMsg);
    // The start marker itself must be preserved (incomplete block → no stripping)
    expect(result).toContain(FORM_START);
    // The surrounding user text must also be preserved
    expect(result).toContain('regular message about formulation');
  });

  // A10b — Words like "formulation" or "safety" in ordinary text are not stripped
  it('A10b. Ordinary text containing words like "formulation", "safety", "emergency" is not stripped', () => {
    const userMsg =
      'I want to discuss the formulation and safety plan we have in case of an emergency.';
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(userMsg);
    expect(result).toBe(userMsg);
  });

  // Handles null/undefined gracefully
  it('Returns non-string input unchanged (null, undefined, number)', () => {
    expect(stripAgentOnlyRuntimeBlocksFromUserContent(null)).toBe(null);
    expect(stripAgentOnlyRuntimeBlocksFromUserContent(undefined)).toBe(undefined);
    expect(stripAgentOnlyRuntimeBlocksFromUserContent(42)).toBe(42);
  });
});

// ─── TESTS — sanitizeConversationMessages with agent-only block stripping ─────

describe('sanitizeConversationMessages — agent-only runtime block stripping', () => {

  // A1 via sanitizeConversationMessages
  it('A1. Persisted user message with Formulation block renders only the Hebrew user text', () => {
    const messages = [
      { role: 'user', content: `${FORMULATION_BLOCK}\n\n${HEBREW_USER_MSG}` },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(HEBREW_USER_MSG);
    expect(result[0].content).not.toContain(FORM_START);
  });

  // A2 via sanitizeConversationMessages
  it('A2. Persisted user message with Safety Mode block renders only the user text', () => {
    const userMsg = 'I feel overwhelmed right now.';
    const messages = [
      { role: 'user', content: `${SAFETY_BLOCK}\n\n${userMsg}` },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
    expect(result[0].content).not.toContain(SAFETY_START);
  });

  // A3 via sanitizeConversationMessages
  it('A3. Safety + Emergency Resources blocks with user message renders only the user message', () => {
    const userMsg = 'I need help.';
    const messages = [
      { role: 'user', content: `${SAFETY_BLOCK}\n\n${EMERGENCY_BLOCK}\n\n${userMsg}` },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
    expect(result[0].content).not.toContain(SAFETY_START);
    expect(result[0].content).not.toContain(EMERGENCY_START);
  });

  // A4 — New-conversation: session-start + runtime supplement + user message
  it('A4. New-conversation message with session-start, runtime supplement, and user text renders only the user text', () => {
    const userMsg = 'What is missing from the formulation?';
    // Simulate Chat.jsx new-conversation composition with formulation supplement
    const sessionStartBlock =
      '[START_SESSION]\n=== WORKFLOW CONTEXT ===\nWorkflow instructions here.\n=== END WORKFLOW CONTEXT ===';
    const fullContent = `${sessionStartBlock}\n\n${FORMULATION_BLOCK}\n\n${userMsg}`;
    const messages = [{ role: 'user', content: fullContent }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toBeNull();
    expect(result[0].content).toContain(userMsg);
    expect(result[0].content).not.toContain(FORM_START);
  });

  it('A4b. Hybrid session-start with internal policy blocks keeps only trailing user text', () => {
    const userMsg = 'Please help me process what happened today.';
    const fullContent = [
      '[START_SESSION]',
      '',
      '[ATTACHMENT_HANDLING_POLICY]',
      'Use attachment metadata when present.',
      '',
      '[THERAPEUTIC_FORMS_POLICY]',
      'Forms policy context.',
      '',
      userMsg,
    ].join('\n');
    const result = sanitizeConversationMessages([{ role: 'user', content: fullContent }]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
    expect(result[0].content.startsWith('[')).toBe(false);
  });

  it('A4c. Pure session-start with internal policies and SESSION_LANGUAGE shows no user bubble', () => {
    const fullContent = [
      '[START_SESSION]',
      '',
      '[ATTACHMENT_HANDLING_POLICY]',
      'Do not invent attachment metadata.',
      '',
      '[THERAPEUTIC_FORMS_POLICY]',
      'Do not invent form IDs, file names, URLs, catalogs, or attachments.',
      '',
      '[SESSION_LANGUAGE: he. Open and respond entirely in Hebrew for this session. Do not use another language unless the user explicitly asks to change the session language.]',
    ].join('\n');

    const result = sanitizeConversationMessages([{ role: 'user', content: fullContent }], 'he');
    expect(result).toHaveLength(0);
  });

  it('A4d. Session-start extraction preserves full multi-paragraph first user text', () => {
    const userMsg = 'First paragraph in English.\n\nSecond paragraph in Hebrew:\nשלום, אני משתף בשתי פסקאות.';
    const fullContent = [
      '[START_SESSION]',
      '',
      '[ATTACHMENT_HANDLING_POLICY]',
      'Use attachment metadata when present.',
      '',
      '[SESSION_LANGUAGE: en. Open and respond entirely in English for this session. Do not use another language unless the user explicitly asks to change the session language.]',
      '',
      userMsg,
    ].join('\n');

    const result = sanitizeConversationMessages([{ role: 'user', content: fullContent }], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
  });

  it('A4e. Session-start extraction removes Stage 12 runtime blocks before the user text', () => {
    const userMsg = 'Please send a worksheet for my teenager.';
    const fullContent = [
      '[START_SESSION]',
      '',
      '[SESSION_LANGUAGE: en.]',
      '',
      '[STAGE12_SESSION_CONTRACT]',
      'Never expose this internal contract.',
      '[/STAGE12_SESSION_CONTRACT]',
      '',
      '[STAGE12_CHAT_QUALITY — CURRENT TURN ONLY]',
      'Never expose this internal instruction block.',
      '[/STAGE12_CHAT_QUALITY]',
      '',
      userMsg,
    ].join('\n');

    const result = sanitizeConversationMessages([{ role: 'user', content: fullContent }], 'en');

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
  });

  // A5 — Attachment metadata preserved after stripping
  it('A5. Attachment metadata is preserved when a runtime block is stripped from a user message', () => {
    const userMsg = 'Please look at this file.';
    const attachmentMarker = serializeAttachmentMetadataMarker({
      type: 'pdf',
      url: 'https://files.example.com/doc.pdf',
      name: 'doc.pdf',
    });
    const content = `${FORMULATION_BLOCK}\n\n${userMsg}\n${attachmentMarker}`;
    const messages = [{ role: 'user', content }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain(userMsg);
    expect(result[0].content).not.toContain(FORM_START);
    expect(result[0].metadata?.attachment).toBeDefined();
    expect(result[0].metadata.attachment.type).toBe('pdf');
  });

  // A6 — Voice transcript text preserved
  it('A6. Voice transcript text is preserved byte-for-byte when a runtime block is stripped', () => {
    const voiceTranscript =
      '\u05D4\u05D9\u05D9\u05EA\u05D9 \u05DE\u05D0\u05D5\u05D3 \u05E2\u05E6\u05D1\u05E0\u05D9 \u05D4\u05D9\u05D5\u05DD.'; // "הייתי מאוד עצבני היום."
    const content = `${SAFETY_BLOCK}\n\n${voiceTranscript}`;
    const messages = [{ role: 'user', content }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(voiceTranscript);
  });

  // A8 — Polling and subscription sanitization produce the same visible result
  it('A8. Calling sanitizeConversationMessages twice on the same data produces the same visible result (idempotent)', () => {
    const userMsg = 'Feeling anxious.';
    const messages = [
      { role: 'user', content: `${FORMULATION_BLOCK}\n\n${userMsg}` },
    ];
    const firstPass = sanitizeConversationMessages(messages);
    const secondPass = sanitizeConversationMessages(firstPass.filter(Boolean));
    expect(secondPass[0].content).toBe(firstPass[0].content);
    expect(secondPass[0].content).toBe(userMsg);
  });

  // A9 — Ordinary multiline message unchanged
  it('A9. Ordinary multiline user messages remain byte-for-byte unchanged', () => {
    const userMsg = 'Line one.\nLine two.\n\u05E9\u05DC\u05D5\u05DD line three.';
    const messages = [{ role: 'user', content: userMsg }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(userMsg);
  });

  // A10 — Marker-like user text that is not a complete bounded block is not deleted
  it('A10. A lone start-marker line typed by the user (without a closing marker) does not cause broad deletion', () => {
    const userMsg = `${FORM_START}\nI am just describing the formulation request here.`;
    const messages = [{ role: 'user', content: userMsg }];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('formulation request here');
  });

  // A11 — Agent-facing content is unchanged (smoke-check via workflowContextInjector output)
  it('A11. The supplement content itself (agent-facing) is not affected by this sanitizer', () => {
    // The sanitizer modifies stored/displayed messages, not the string produced by
    // buildRuntimeFormulationSupplement before it is sent to the agent.
    // This test verifies round-trip: a raw supplement string (not wrapped in a message)
    // passed through stripAgentOnlyRuntimeBlocksFromUserContent removes the block,
    // proving the two strings are the same (same markers) — which confirms the sanitizer
    // targets the identical blocks that would be embedded in a persisted message.
    const agentFacingContent = FORMULATION_BLOCK;
    const stripped = stripAgentOnlyRuntimeBlocksFromUserContent(agentFacingContent);
    // The block is stripped when there is no user text after it (empty trim)
    expect(stripped).toBe('');
    // But the same supplement prepended to user text strips correctly
    const withUser = `${FORMULATION_BLOCK}\n\nuser text`;
    const strippedWithUser = stripAgentOnlyRuntimeBlocksFromUserContent(withUser);
    expect(strippedWithUser).toBe('user text');
  });
});

// ─── Formulation Contract Correction block stripping ──────────────────────────

describe('stripAgentOnlyRuntimeBlocksFromUserContent — Formulation Contract Correction block', () => {
  const CORRECTION_START = '=== FORMULATION CONTRACT CORRECTION \u2014 NEXT TURN ONLY ===';
  const CORRECTION_END = '=== END FORMULATION CONTRACT CORRECTION ===';

  function makeBlock(body = 'correction text') {
    return `${CORRECTION_START}\n${body}\n${CORRECTION_END}`;
  }

  it('strips a complete correction block leaving user text intact', () => {
    const userText = 'המשך מכאן';
    const content = makeBlock('some correction instructions') + '\n\n' + userText;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(content);
    expect(result).not.toContain(CORRECTION_START);
    expect(result).not.toContain(CORRECTION_END);
    expect(result.trim()).toBe(userText);
  });

  describe('stripAgentOnlyRuntimeBlocksFromUserContent — Current-turn grounding correction block', () => {
    const CORRECTION_START = '=== CURRENT-TURN GROUNDING CORRECTION — NEXT TURN ONLY ===';
    const CORRECTION_END = '=== END CURRENT-TURN GROUNDING CORRECTION ===';

    function makeBlock(body = 'correction text') {
      return `${CORRECTION_START}\n${body}\n${CORRECTION_END}`;
    }

    it('strips a complete grounding correction block leaving user text intact', () => {
      const userText = 'המשך מכאן';
      const content = makeBlock('some correction instructions') + '\n\n' + userText;
      const result = stripAgentOnlyRuntimeBlocksFromUserContent(content);
      expect(result).not.toContain(CORRECTION_START);
      expect(result).not.toContain(CORRECTION_END);
      expect(result.trim()).toBe(userText);
    });

    it('does NOT strip an incomplete grounding block — start marker only', () => {
      const content = `${CORRECTION_START}\nsome text without end marker`;
      const result = stripAgentOnlyRuntimeBlocksFromUserContent(content);
      expect(result).toContain(CORRECTION_START);
    });

    it('strips duplicated complete grounding correction blocks idempotently', () => {
      const content = `${makeBlock('one')}\n\n${makeBlock('two')}\n\nuser message`;
      const once = stripAgentOnlyRuntimeBlocksFromUserContent(content);
      const twice = stripAgentOnlyRuntimeBlocksFromUserContent(once);
      expect(once).toBe('user message');
      expect(twice).toBe('user message');
    });
  });

  it('strips correction block that is the entire content (no trailing user text)', () => {
    const content = makeBlock('instructions');
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(content);
    expect(result.trim()).toBe('');
  });

  it('does NOT strip an incomplete block — start marker only', () => {
    const content = `${CORRECTION_START}\nsome text without end marker`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(content);
    expect(result).toContain(CORRECTION_START);
  });

  it('does NOT strip ordinary text containing the word "formulation"', () => {
    const ordinary = 'Let us revisit your formulation to explore further.';
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(ordinary);
    expect(result).toBe(ordinary);
  });

  it('does NOT strip ordinary text containing the word "correction"', () => {
    const ordinary = 'I want to make a correction to what I said earlier.';
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(ordinary);
    expect(result).toBe(ordinary);
  });

  it('ordinary user text is byte-for-byte unchanged', () => {
    const ordinary = 'Hello, I would like to talk about my anxiety today.';
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(ordinary);
    expect(result).toBe(ordinary);
  });

  it('idempotent: stripping twice yields the same result as stripping once', () => {
    const content = makeBlock('correction body') + '\n\nuser message';
    const once = stripAgentOnlyRuntimeBlocksFromUserContent(content);
    const twice = stripAgentOnlyRuntimeBlocksFromUserContent(once);
    expect(once).toBe(twice);
  });
});

describe('therapeutic forms policy refresh sanitization', () => {
  const policyVersion = 'forms-test-version';
  const boundedPolicyBlock = [
    THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START,
    THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER,
    '[THERAPEUTIC_FORMS_POLICY]',
    `[THERAPEUTIC_FORMS_POLICY_VERSION: ${policyVersion}]`,
    'Policy payload.',
    THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_END,
  ].join('\n');

  it('strips complete bounded policy block while keeping genuine user text', () => {
    const userText = 'Please help me continue from here.';
    const messages = [{ role: 'user', content: `${boundedPolicyBlock}\n\n${userText}` }];
    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].content).toBe(userText);
  });

  it('stripping complete bounded policy block is idempotent', () => {
    const userText = 'Continue gently.';
    const input = `${boundedPolicyBlock}\n\n${userText}`;
    const once = stripAgentOnlyRuntimeBlocksFromUserContent(input);
    const twice = stripAgentOnlyRuntimeBlocksFromUserContent(once);
    expect(once).toBe(userText);
    expect(twice).toBe(userText);
  });

  it('does not strip incomplete bounded policy block', () => {
    const incomplete = `${THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START}\n${THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER}\nuser text`;
    const result = stripAgentOnlyRuntimeBlocksFromUserContent(incomplete);
    expect(result).toContain(THERAPEUTIC_FORMS_POLICY_REFRESH_BLOCK_START);
    expect(result).toContain('user text');
  });

  it('keeps assistant reply visible after mixed policy+genuine-user turn', () => {
    const userText = 'What can I do now?';
    const mixed = `${boundedPolicyBlock}\n\n${userText}`;
    const sanitized = sanitizeConversationMessages([
      { role: 'user', content: mixed },
      { role: 'assistant', content: 'Let us take one small next step together.' },
    ]);
    expect(sanitized.map((msg) => msg.role)).toEqual(['user', 'assistant']);
    expect(sanitized[0].content).toBe(userText);
    expect(sanitized[1].content).toBe('Let us take one small next step together.');
  });

  it('hides legacy pure policy user message and only the immediately following assistant reply', () => {
    const legacyPolicyUser = `${THERAPEUTIC_FORMS_POLICY_REFRESH_MARKER}\n[THERAPEUTIC_FORMS_POLICY]\n[THERAPEUTIC_FORMS_POLICY_VERSION: ${policyVersion}]`;
    const sanitized = sanitizeConversationMessages([
      { role: 'user', content: legacyPolicyUser },
      { role: 'assistant', content: 'I am here whenever you are ready to take the next step into that.' },
      { role: 'user', content: 'Thanks, continue.' },
      { role: 'assistant', content: 'Of course, let us continue.' },
    ]);

    expect(sanitized.map((msg) => msg.role)).toEqual(['user', 'assistant']);
    expect(sanitized[0].content).toBe('Thanks, continue.');
    expect(sanitized[1].content).toBe('Of course, let us continue.');
  });
});


// ─── V8-F: SESSION-START INTERNAL TURN HIDING ────────────────────────────────

describe('V8-F – session-start internal turn hiding', () => {
  const sessionStartUser = { role: 'user', content: '[START_SESSION]' };

  it('hides an assistant turn whose entire content is an <INTERNAL_PROCESS> block', () => {
    const messages = [
      sessionStartUser,
      { role: 'assistant', content: '<INTERNAL_PROCESS>Initialising session context.</INTERNAL_PROCESS>' },
      { role: 'assistant', content: 'טוב שאתה כאן. מה עולה עבורך היום?' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const assistantMsgs = result.filter((m) => m.role === 'assistant');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe('טוב שאתה כאן. מה עולה עבורך היום?');
  });

  it('hides an assistant turn that is empty or whitespace-only', () => {
    const messages = [
      sessionStartUser,
      { role: 'assistant', content: '   ' },
      { role: 'assistant', content: 'I am here with you.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistantMsgs = result.filter((m) => m.role === 'assistant');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe('I am here with you.');
  });

  it('hides an assistant turn made entirely of INTERNAL_PROCESS regardless of case', () => {
    const messages = [
      sessionStartUser,
      { role: 'assistant', content: '<internal_process>data</internal_process>' },
      { role: 'assistant', content: 'Here for you.' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistantMsgs = result.filter((m) => m.role === 'assistant');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe('Here for you.');
  });

  it('does NOT inject an English failsafe for a hidden internal turn in a Hebrew session', () => {
    const ENGLISH_FAILSAFE = "I'm here with you. What's on your mind right now?";
    const messages = [
      sessionStartUser,
      { role: 'assistant', content: '<INTERNAL_PROCESS>session init</INTERNAL_PROCESS>' },
      { role: 'assistant', content: 'טוב שאתה כאן. מה עולה עבורך היום?' },
    ];
    const result = sanitizeConversationMessages(messages, 'he');
    const contents = result.map((m) => m.content);
    expect(contents).not.toContain(ENGLISH_FAILSAFE);
    expect(result.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('keeps a genuine assistant opener that starts with an INTERNAL_PROCESS block followed by real text', () => {
    const messages = [
      sessionStartUser,
      {
        role: 'assistant',
        content: '<INTERNAL_PROCESS>context</INTERNAL_PROCESS>\nI am here with you.',
      },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const assistantMsgs = result.filter((m) => m.role === 'assistant');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toContain('I am here with you.');
    expect(assistantMsgs[0].content).not.toContain('<INTERNAL_PROCESS>');
  });

  it('preserves user messages unchanged when hiding internal assistant turns', () => {
    // A pure [START_SESSION] user message with actual user text after it is
    // kept; without user text it is intentionally hidden.  Use a real user
    // message to verify user messages are unaffected by the internal-turn filter.
    const messages = [
      { role: 'user', content: 'Hello, I need some help.' },
      { role: 'assistant', content: '<INTERNAL_PROCESS>init</INTERNAL_PROCESS>' },
      { role: 'assistant', content: 'Welcome!' },
    ];
    const result = sanitizeConversationMessages(messages, 'en');
    const userMsgs = result.filter((m) => m.role === 'user');
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].content).toBe('Hello, I need some help.');
  });
});

describe('V8-G – system_instruction internal-tag sanitization', () => {
  it('unwraps system_instruction and preserves inner visible prose', () => {
    const result = sanitizeConversationMessages([
      {
        role: 'assistant',
        content: '<system_instruction>Take one slow breath with me.</system_instruction>',
      },
    ], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Take one slow breath with me.');
  });

  it('hides assistant turn when system_instruction inner content is empty/internal only', () => {
    const result = sanitizeConversationMessages([
      {
        role: 'assistant',
        content: '<system_instruction>THOUGHT: internal only</system_instruction>',
      },
    ], 'en');
    expect(result).toHaveLength(0);
  });

  it('handles case-insensitive system_instruction tags', () => {
    const result = sanitizeConversationMessages([
      {
        role: 'assistant',
        content: '<SyStEm_InStRuCtIoN>הנה אני איתך.</SyStEm_InStRuCtIoN>',
      },
    ], 'he');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('הנה אני איתך.');
  });

  it('fails closed for unterminated leading system_instruction tag', () => {
    const result = sanitizeConversationMessages([
      { role: 'assistant', content: '<system_instruction>internal start with no closing tag' },
      { role: 'assistant', content: 'Visible follow-up' },
    ], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Visible follow-up');
  });

  it('keeps INTERNAL_PROCESS handling and unwraps following system_instruction', () => {
    const stripped = stripLeadingInternalAssistantTags(
      '<INTERNAL_PROCESS>ctx</INTERNAL_PROCESS><system_instruction>Visible text</system_instruction>'
    );
    expect(stripped.hidden).toBe(false);
    expect(stripped.content.trim()).toBe('Visible text');
    const result = sanitizeConversationMessages([
      {
        role: 'assistant',
        content:
          '<INTERNAL_PROCESS>ctx</INTERNAL_PROCESS><system_instruction>Visible text</system_instruction>',
      },
    ], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Visible text');
  });
});

describe('V8-H – hide agent_response turns', () => {
  it('hides agent_response turns and keeps assistant opener only once', () => {
    const result = sanitizeConversationMessages([
      { role: 'user', content: 'Hi' },
      { role: 'agent_response', content: 'Internal transport turn' },
      { role: 'assistant', content: 'I am here with you.' },
    ], 'en');

    expect(result.map((msg) => msg.role)).toEqual(['user', 'assistant']);
    expect(result.filter((msg) => msg.role === 'assistant')).toHaveLength(1);
    expect(result[1].content).toBe('I am here with you.');
  });

  it('does not inject fallback bubble when hidden agent_response turn is empty/internal-only', () => {
    const ENGLISH_FAILSAFE = "I'm here with you. What's on your mind right now?";
    const result = sanitizeConversationMessages([
      { role: 'user', content: '[START_SESSION]' },
      { role: 'agent_response', content: '<SYSTEM_INSTRUCTION>internal only</SYSTEM_INSTRUCTION>' },
      { role: 'assistant', content: 'Visible follow-up opener.' },
    ], 'en');

    const contents = result.map((msg) => msg.content);
    expect(contents).not.toContain(ENGLISH_FAILSAFE);
    expect(result.filter((msg) => msg.role === 'assistant')).toHaveLength(1);
    expect(result.at(-1)?.content).toBe('Visible follow-up opener.');
  });
});

// ─── Phase 2.1: stripLeadingInternalCorrectionBlocks ──────────────────────────

const GROUNDING_START = '=== CURRENT-TURN GROUNDING CORRECTION — NEXT TURN ONLY ===';
const GROUNDING_END   = '=== END CURRENT-TURN GROUNDING CORRECTION ===';
const FORMULATION_START = '=== FORMULATION CONTRACT CORRECTION \u2014 NEXT TURN ONLY ===';
const FORMULATION_END   = '=== END FORMULATION CONTRACT CORRECTION ===';

function makeGroundingBlock(body = 'grounding correction text') {
  return `${GROUNDING_START}\n${body}\n${GROUNDING_END}`;
}

function makeFormulationBlock(body = 'formulation correction text') {
  return `${FORMULATION_START}\n${body}\n${FORMULATION_END}`;
}

describe('Phase 2.1 — stripLeadingInternalCorrectionBlocks', () => {
  it('strips a complete CURRENT-TURN GROUNDING CORRECTION block and preserves real text after it', () => {
    const real = 'I hear you. Let us continue.';
    const result = stripLeadingInternalCorrectionBlocks(makeGroundingBlock() + '\n\n' + real);
    expect(result.content).toBe(real);
    expect(result.removedAny).toBe(true);
    expect(result.content).not.toContain(GROUNDING_START);
    expect(result.content).not.toContain(GROUNDING_END);
  });

  it('strips a complete FORMULATION CONTRACT CORRECTION block and preserves real text after it', () => {
    const real = 'Moving forward carefully.';
    const result = stripLeadingInternalCorrectionBlocks(makeFormulationBlock() + '\n\n' + real);
    expect(result.content).toBe(real);
    expect(result.removedAny).toBe(true);
    expect(result.content).not.toContain(FORMULATION_START);
    expect(result.content).not.toContain(FORMULATION_END);
  });

  it('strips duplicate complete grounding correction blocks', () => {
    const real = 'user message';
    const input = makeGroundingBlock('one') + '\n\n' + makeGroundingBlock('two') + '\n\n' + real;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.content).toBe(real);
    expect(result.removedAny).toBe(true);
  });

  it('strips duplicate complete formulation correction blocks', () => {
    const real = 'continuing here';
    const input = makeFormulationBlock('a') + '\n\n' + makeFormulationBlock('b') + '\n\n' + real;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.content).toBe(real);
    expect(result.removedAny).toBe(true);
  });

  it('strips an unterminated grounding block — start marker at leading position, no end marker', () => {
    const input = `${GROUNDING_START}\nsome correction text without an end marker`;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.content).not.toContain(GROUNDING_START);
    expect(result.removedAny).toBe(true);
  });

  it('strips an unterminated formulation block — start marker at leading position, no end marker', () => {
    const input = `${FORMULATION_START}\nsome correction text without an end marker`;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.content).not.toContain(FORMULATION_START);
    expect(result.removedAny).toBe(true);
  });

  it('preserves legitimate prose that merely mentions "correction" without block markers', () => {
    const prose = 'I want to make a correction to what I said about the formulation earlier.';
    const result = stripLeadingInternalCorrectionBlocks(prose);
    expect(result.content).toBe(prose);
    expect(result.removedAny).toBe(false);
  });

  it('returns empty string when the entire content is a complete correction block', () => {
    const result = stripLeadingInternalCorrectionBlocks(makeGroundingBlock());
    expect(result.content).toBe('');
    expect(result.removedAny).toBe(true);
  });

  it('handles non-string input gracefully', () => {
    expect(stripLeadingInternalCorrectionBlocks(null)).toEqual({ content: null, removedAny: false });
    expect(stripLeadingInternalCorrectionBlocks(undefined)).toEqual({ content: undefined, removedAny: false });
    expect(stripLeadingInternalCorrectionBlocks(42)).toEqual({ content: 42, removedAny: false });
  });

  it('strips grounding correction block from assistant content via sanitizeConversationMessages', () => {
    const realText = 'Thank you for sharing that with me.';
    const messages = [
      { role: 'assistant', content: makeGroundingBlock('instructions') + '\n\n' + realText },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(realText);
    expect(result[0].content).not.toContain(GROUNDING_START);
  });

  it('strips formulation correction block from assistant content via sanitizeConversationMessages', () => {
    const realText = 'Let us explore that thought together.';
    const messages = [
      { role: 'assistant', content: makeFormulationBlock('instructions') + '\n\n' + realText },
    ];
    const result = sanitizeConversationMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(realText);
    expect(result[0].content).not.toContain(FORMULATION_START);
  });
});

// ─── Phase 2.1: Conversation scoping ──────────────────────────────────────────

describe('Phase 2.1 — internalCorrectionScopeMatches', () => {
  it('returns true when the intent scope key matches the conversation ID', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-abc',
    });
    expect(internalCorrectionScopeMatches(intent, 'conv-abc')).toBe(true);
  });

  it('returns false when the intent scope key does not match the conversation ID', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-abc',
    });
    expect(internalCorrectionScopeMatches(intent, 'conv-xyz')).toBe(false);
  });

  it('returns false when the intent has no scope key', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
    });
    expect(internalCorrectionScopeMatches(intent, 'conv-abc')).toBe(false);
  });

  it('returns false when intent is null', () => {
    expect(internalCorrectionScopeMatches(null, 'conv-abc')).toBe(false);
  });

  it('returns false when conversationId is empty', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-abc',
    });
    expect(internalCorrectionScopeMatches(intent, '')).toBe(false);
    expect(internalCorrectionScopeMatches(intent, null)).toBe(false);
  });

  it('scope key is not exposed in the raw intent object as conversation_id', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-secret',
    });
    // Only _scope_key should exist — not a raw conversation_id field
    expect(intent).not.toHaveProperty('conversation_id');
    expect(intent._scope_key).toBe('conv-secret');
  });
});

// ─── Phase 2.1: Consumption lifecycle ─────────────────────────────────────────

describe('Phase 2.1 — correction intent consumption lifecycle', () => {
  it('consumed intent is not pending', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    expect(intent.consumed).toBe(false);
    const consumed = consumeInternalCorrectionIntent(intent);
    expect(consumed.consumed).toBe(true);
  });

  it('hasInternalCorrectionIntent returns true for a non-consumed intent', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.FORMULATION,
      conversationScopeKey: 'conv-1',
    });
    expect(hasInternalCorrectionIntent(intent)).toBe(true);
  });

  it('hasPendingInternalCorrectionIntent returns false for a consumed intent', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    const consumed = consumeInternalCorrectionIntent(intent);
    // consumed intent must NOT be pending
    expect(hasPendingInternalCorrectionIntent(consumed)).toBe(false);
    // But structural check still passes
    expect(hasInternalCorrectionIntent(consumed)).toBe(true);
    expect(consumed.consumed).toBe(true);
  });

  it('failed send retains the pending intent — consuming after success only', () => {
    // Simulate: intent is created, addMessage throws, intent must not be consumed
    let pendingIntent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    // Simulate a failed send: do NOT consume
    const simulateSendFailure = () => {
      throw new Error('network error');
    };
    try {
      simulateSendFailure();
      // Would consume here on success — never reached
      pendingIntent = consumeInternalCorrectionIntent(pendingIntent);
    } catch (_) {
      // Intentionally not consuming on failure
    }
    // Intent must still be pending
    expect(pendingIntent.consumed).toBe(false);
  });

  it('successful retry consumes the intent exactly once', () => {
    let pendingIntent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    // Simulate successful send
    pendingIntent = consumeInternalCorrectionIntent(pendingIntent);
    expect(pendingIntent.consumed).toBe(true);
    // Consuming an already-consumed intent produces a consistently-consumed result
    const consumedAgain = consumeInternalCorrectionIntent(pendingIntent);
    expect(consumedAgain.consumed).toBe(true);
  });

  it('correction created for conversation A does not scope-match conversation B', () => {
    const intentA = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.FORMULATION,
      conversationScopeKey: 'conv-A',
    });
    expect(internalCorrectionScopeMatches(intentA, 'conv-A')).toBe(true);
    expect(internalCorrectionScopeMatches(intentA, 'conv-B')).toBe(false);
  });

  it('LOCAL_GUARD_ONLY mode is preserved through create/consume cycle', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      instructionChannel: INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY,
      conversationScopeKey: 'conv-1',
    });
    const consumed = consumeInternalCorrectionIntent(intent);
    expect(consumed.instruction_channel).toBe(INTERNAL_CORRECTION_CHANNEL.LOCAL_GUARD_ONLY);
  });

  it('V2 (V2-on): scoped intent for conv-A is ignored when active conversation is conv-B', () => {
    // V2-on simulation: intent was created in conv-A context
    const intentForConvA = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-A',
    });
    const currentConvId = 'conv-B';
    // Scope check should return false — intent is stale
    const scopeMatches = internalCorrectionScopeMatches(intentForConvA, currentConvId);
    expect(scopeMatches).toBe(false);
    // The intent should be cleared (not used) when scope doesn't match
    const activePending = hasInternalCorrectionIntent(intentForConvA) && scopeMatches
      ? intentForConvA
      : null;
    expect(activePending).toBeNull();
  });

  it('V2 (V2-off): no scoped intent means scope check returns false safely', () => {
    // V2-off: no intent exists
    const noIntent = null;
    expect(internalCorrectionScopeMatches(noIntent, 'conv-A')).toBe(false);
  });
});

// ─── Phase 2.2: Unterminated correction blocks (new focused behavior tests) ────

describe('Phase 2.2 — unterminated / truncated correction blocks removed', () => {
  const GROUNDING_START = '=== CURRENT-TURN GROUNDING CORRECTION — NEXT TURN ONLY ===';
  const FORMULATION_START = '=== FORMULATION CONTRACT CORRECTION \u2014 NEXT TURN ONLY ===';

  it('removes an unterminated grounding block from historical user content', () => {
    const input = `${GROUNDING_START}\ninternal instruction text`;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.removedAny).toBe(true);
    expect(result.content).not.toContain(GROUNDING_START);
  });

  it('removes an unterminated formulation block from historical user content', () => {
    const input = `${FORMULATION_START}\ninternal instruction text`;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.removedAny).toBe(true);
    expect(result.content).not.toContain(FORMULATION_START);
  });

  it('removes an unterminated grounding block from historical assistant content', () => {
    // An unterminated block (no end marker) at leading position is stripped entirely
    const msgs = [
      { role: 'assistant', content: `${GROUNDING_START}\nunterminated internal section — no real user text here` },
    ];
    // The message has only internal content; after stripping it is empty and gets filtered out
    const result = sanitizeConversationMessages(msgs);
    expect(result).toHaveLength(0);
  });

  it('removes an unterminated formulation block from historical assistant content', () => {
    // An unterminated block at leading position is stripped entirely
    const msgs = [
      { role: 'assistant', content: `${FORMULATION_START}\nunterminated internal section — no real user text here` },
    ];
    const result = sanitizeConversationMessages(msgs);
    expect(result).toHaveLength(0);
  });

  it('removes duplicate and mixed correction blocks, preserving real text', () => {
    const GROUNDING_END = '=== END CURRENT-TURN GROUNDING CORRECTION ===';
    const FORMULATION_END = '=== END FORMULATION CONTRACT CORRECTION ===';
    const realText = 'Genuine reply here.';
    const input =
      `${GROUNDING_START}\nblock one\n${GROUNDING_END}\n\n` +
      `${FORMULATION_START}\nblock two\n${FORMULATION_END}\n\n` +
      realText;
    const result = stripLeadingInternalCorrectionBlocks(input);
    expect(result.removedAny).toBe(true);
    expect(result.content).toBe(realText);
    expect(result.content).not.toContain(GROUNDING_START);
    expect(result.content).not.toContain(FORMULATION_START);
  });

  it('preserves legitimate prose that contains marker words inside a normal sentence', () => {
    const prose = 'I want to make a correction to what I said about the formulation earlier.';
    const result = stripLeadingInternalCorrectionBlocks(prose);
    expect(result.removedAny).toBe(false);
    expect(result.content).toBe(prose);
  });

  it('removes correction block from user content via sanitizeConversationMessages', () => {
    const GROUNDING_END = '=== END CURRENT-TURN GROUNDING CORRECTION ===';
    const realText = 'I am feeling anxious today.';
    const msgs = [
      { role: 'user', content: `${GROUNDING_START}\ninternal\n${GROUNDING_END}\n\n${realText}` },
    ];
    const result = sanitizeConversationMessages(msgs);
    expect(result[0].content).toBe(realText);
    expect(result[0].content).not.toContain(GROUNDING_START);
  });
});

// ─── Phase 2.2: hasPendingInternalCorrectionIntent contract ───────────────────

describe('Phase 2.2 — hasPendingInternalCorrectionIntent contract', () => {
  it('returns true for a structurally valid, non-consumed intent', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    expect(hasPendingInternalCorrectionIntent(intent)).toBe(true);
  });

  it('consumed intent is not pending', () => {
    const intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    const consumed = consumeInternalCorrectionIntent(intent);
    expect(hasPendingInternalCorrectionIntent(consumed)).toBe(false);
  });

  it('second send cannot consume the same intent again as pending', () => {
    let intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    // First send — consume
    intent = consumeInternalCorrectionIntent(intent);
    expect(hasPendingInternalCorrectionIntent(intent)).toBe(false);
    // Second consume attempt — still not pending
    intent = consumeInternalCorrectionIntent(intent);
    expect(hasPendingInternalCorrectionIntent(intent)).toBe(false);
  });

  it('failed send followed by successful retry consumes exactly once', () => {
    let intent = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.GROUNDING,
      conversationScopeKey: 'conv-1',
    });
    // Failed send — do NOT consume
    try { throw new Error('network'); } catch (_) { /* not consumed */ }
    expect(hasPendingInternalCorrectionIntent(intent)).toBe(true);
    // Successful retry — consume
    intent = consumeInternalCorrectionIntent(intent);
    expect(hasPendingInternalCorrectionIntent(intent)).toBe(false);
  });

  it('conversation A intent does not affect conversation B', () => {
    const intentA = createInternalCorrectionIntent({
      correctionType: INTERNAL_CORRECTION_TYPES.FORMULATION,
      conversationScopeKey: 'conv-A',
    });
    expect(hasPendingInternalCorrectionIntent(intentA)).toBe(true);
    expect(internalCorrectionScopeMatches(intentA, 'conv-B')).toBe(false);
    // Simulating the Chat.jsx gate: pending AND scope match
    const activeForConvB = hasPendingInternalCorrectionIntent(intentA) &&
      internalCorrectionScopeMatches(intentA, 'conv-B')
      ? intentA
      : null;
    expect(activeForConvB).toBeNull();
  });

  it('returns false for null or invalid intent', () => {
    expect(hasPendingInternalCorrectionIntent(null)).toBe(false);
    expect(hasPendingInternalCorrectionIntent(undefined)).toBe(false);
    expect(hasPendingInternalCorrectionIntent({ correction_type: 'invalid' })).toBe(false);
  });
});
