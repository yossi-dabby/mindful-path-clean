/**
 * Tests for the assistant-generated downloadable file feature.
 *
 * Covers:
 *   - normalizeGeneratedFile — metadata contract validation
 *   - sanitizeConversationMessages — preserves generated_file metadata in assistant messages
 *   - Assistant messages WITHOUT generated_file are unaffected
 *   - Invalid/missing generated_file metadata does not crash the pipeline
 *
 * The normalizeGeneratedFile helper is the single contract enforcement point;
 * if the shape changes, update this test file.
 */

import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import { normalizeGeneratedFile } from '../../src/components/chat/utils/normalizeGeneratedFile.js';
import { sanitizeConversationMessages } from '../../src/components/utils/validateAgentOutput.jsx';
import { resolveFormIntent } from '../../src/utils/resolveFormIntent.js';

// ─── normalizeGeneratedFile — contract validation ─────────────────────────────

describe('normalizeGeneratedFile — valid contract', () => {
  it('returns normalized object for a minimal valid generated_file', () => {
    const input = { type: 'pdf', url: 'https://files.example.com/worksheet.pdf', name: 'worksheet.pdf' };
    const result = normalizeGeneratedFile(input);
    expect(result).not.toBeNull();
    expect(result.type).toBe('pdf');
    expect(result.url).toBe('https://files.example.com/worksheet.pdf');
    expect(result.name).toBe('worksheet.pdf');
  });

  it('returns normalized object with all optional fields present', () => {
    const input = {
      type: 'pdf',
      url: 'https://files.example.com/cbt.pdf',
      name: 'cbt-worksheet.pdf',
      title: 'CBT Thought Record',
      description: 'A worksheet for challenging automatic thoughts',
      therapeutic_purpose: 'cbt_thought_record',
      created_at: '2025-04-27T08:00:00.000Z',
    };
    const result = normalizeGeneratedFile(input);
    expect(result).not.toBeNull();
    expect(result.title).toBe('CBT Thought Record');
    expect(result.description).toBe('A worksheet for challenging automatic thoughts');
    expect(result.therapeutic_purpose).toBe('cbt_thought_record');
  });

  it('falls back to default name when name is an empty string', () => {
    const input = { type: 'pdf', url: 'https://files.example.com/worksheet.pdf', name: '' };
    const result = normalizeGeneratedFile(input);
    expect(result).not.toBeNull();
    expect(result.name).toBe('worksheet.pdf');  // default fallback
  });

  it('trims whitespace from url and name', () => {
    const input = {
      type: 'pdf',
      url: '  https://files.example.com/worksheet.pdf  ',
      name: '  worksheet.pdf  ',
    };
    const result = normalizeGeneratedFile(input);
    expect(result).not.toBeNull();
    expect(result.url).toBe('https://files.example.com/worksheet.pdf');
    expect(result.name).toBe('worksheet.pdf');
  });
});

describe('normalizeGeneratedFile — invalid / missing fields return null', () => {
  it('returns null for null input', () => {
    expect(normalizeGeneratedFile(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeGeneratedFile(undefined)).toBeNull();
  });

  it('returns null for a non-object input', () => {
    expect(normalizeGeneratedFile('not-an-object')).toBeNull();
    expect(normalizeGeneratedFile(42)).toBeNull();
  });

  it('returns null when type is not "pdf"', () => {
    const input = { type: 'image', url: 'https://files.example.com/worksheet.png', name: 'worksheet.png' };
    expect(normalizeGeneratedFile(input)).toBeNull();
  });

  it('returns null when type is missing', () => {
    const input = { url: 'https://files.example.com/worksheet.pdf', name: 'worksheet.pdf' };
    expect(normalizeGeneratedFile(input)).toBeNull();
  });

  it('returns null when url is missing', () => {
    const input = { type: 'pdf', name: 'worksheet.pdf' };
    expect(normalizeGeneratedFile(input)).toBeNull();
  });

  it('returns null when url is an empty string', () => {
    const input = { type: 'pdf', url: '', name: 'worksheet.pdf' };
    expect(normalizeGeneratedFile(input)).toBeNull();
  });

  it('returns null when url is not a string', () => {
    const input = { type: 'pdf', url: 12345, name: 'worksheet.pdf' };
    expect(normalizeGeneratedFile(input)).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(normalizeGeneratedFile({})).toBeNull();
  });
});

// ─── sanitizeConversationMessages — generated_file metadata preservation ──────

describe('sanitizeConversationMessages — generated_file metadata is preserved', () => {
  it('preserves generated_file metadata on plain-text assistant messages', () => {
    const generatedFile = {
      type: 'pdf',
      url: 'https://files.example.com/thought-record.pdf',
      name: 'thought-record-2025-04-27.pdf',
      title: 'CBT Thought Record',
    };
    const messages = [
      {
        id: 'a1',
        role: 'assistant',
        content: "Here's your thought record worksheet. I've attached it below.",
        metadata: { generated_file: generatedFile },
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].metadata?.generated_file).toEqual(generatedFile);
    expect(sanitized[0].content).toBe("Here's your thought record worksheet. I've attached it below.");
  });

  it('preserves generated_file metadata alongside other metadata fields', () => {
    const generatedFile = {
      type: 'pdf',
      url: 'https://files.example.com/plan.pdf',
      name: 'weekly-plan.pdf',
    };
    const messages = [
      {
        id: 'a2',
        role: 'assistant',
        content: 'Your weekly practice plan is ready.',
        metadata: {
          generated_file: generatedFile,
          sanitized: true,
        },
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].metadata?.generated_file).toEqual(generatedFile);
  });

  it('does not corrupt assistant messages that have no generated_file', () => {
    const messages = [
      {
        id: 'a3',
        role: 'assistant',
        content: 'I am here to support you. What would you like to work on today?',
        metadata: {},
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].content).toBe('I am here to support you. What would you like to work on today?');
    expect(sanitized[0].metadata?.generated_file).toBeUndefined();
  });

  it('does not add generated_file to user messages', () => {
    const messages = [
      {
        id: 'u1',
        role: 'user',
        content: 'Can you give me a thought record worksheet?',
        metadata: {},
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].metadata?.generated_file).toBeUndefined();
  });

  it('handles generated_file with invalid shape without crashing', () => {
    const messages = [
      {
        id: 'a4',
        role: 'assistant',
        content: 'Something went wrong but the message should still render.',
        metadata: {
          // intentionally malformed — normalizeGeneratedFile will reject this
          generated_file: { type: 'unknown', url: null },
        },
      },
    ];

    // Must not throw
    expect(() => sanitizeConversationMessages(messages)).not.toThrow();
    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(1);
    // The malformed field is preserved as-is in metadata (the normalizer rejects it at render time)
    expect(sanitized[0].metadata?.generated_file).toBeDefined();
  });

  it('preserves existing conversation history with user and assistant messages unchanged', () => {
    const messages = [
      { id: 'u1', role: 'user', content: 'Hello', metadata: {} },
      { id: 'a1', role: 'assistant', content: 'Hi, how can I help?', metadata: {} },
      {
        id: 'a2',
        role: 'assistant',
        content: 'Here is your worksheet.',
        metadata: {
          generated_file: {
            type: 'pdf',
            url: 'https://files.example.com/worksheet.pdf',
            name: 'worksheet.pdf',
          },
        },
      },
    ];

    const sanitized = sanitizeConversationMessages(messages);
    expect(sanitized).toHaveLength(3);
    expect(sanitized[0].content).toBe('Hello');
    expect(sanitized[1].content).toBe('Hi, how can I help?');
    expect(sanitized[2].metadata?.generated_file?.url).toBe('https://files.example.com/worksheet.pdf');
  });
});
