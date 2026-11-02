/**
 * chatMarkdownNormalization — regression test suite
 *
 * Verifies that normalizeAssistantMarkdown repairs known malformed token
 * patterns emitted by LLMs without destroying valid content.
 *
 * Each test case corresponds to a documented real-world artefact pattern.
 */

import { describe, it, expect } from 'vitest';
import { normalizeAssistantMarkdown } from '../../src/components/utils/normalizeAssistantMarkdown.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

function normalize(text) {
  return normalizeAssistantMarkdown(text);
}

// ─── No-op guard — valid content must not be modified ────────────────────────

describe('normalizeAssistantMarkdown — valid content pass-through', () => {
  it('returns clean prose unchanged', () => {
    const text = 'I hear you. That sounds really hard.';
    expect(normalize(text)).toBe(text);
  });

  it('returns valid bold unchanged', () => {
    const text = 'Here is a **key point** for you.';
    expect(normalize(text)).toBe(text);
  });

  it('returns valid bullet list unchanged', () => {
    const text = '- First item\n- Second item\n- Third item';
    expect(normalize(text)).toBe(text);
  });

  it('returns valid numbered list unchanged', () => {
    const text = '1. Step one\n2. Step two\n3. Step three';
    expect(normalize(text)).toBe(text);
  });

  it('returns Hebrew text unchanged', () => {
    const text = 'אני כאן איתך. מה הכי מטריד אותך כרגע?';
    expect(normalize(text)).toBe(text);
  });

  it('returns mixed Hebrew + English text unchanged', () => {
    const text = 'הנה כמה טכניקות CBT שיכולות לעזור.';
    expect(normalize(text)).toBe(text);
  });

  it('returns null unchanged', () => {
    expect(normalize(null)).toBeNull();
  });

  it('returns undefined unchanged', () => {
    expect(normalize(undefined)).toBeUndefined();
  });

  it('returns empty string unchanged', () => {
    expect(normalize('')).toBe('');
  });
});

// ─── Space-padded bold repair ─────────────────────────────────────────────────

describe('normalizeAssistantMarkdown — space-padded bold repair', () => {
  it('removes leading space inside bold: "** word **" → "**word**"', () => {
    const result = normalize('Here is ** important ** information.');
    expect(result).toBe('Here is **important** information.');
  });

  it('repairs multi-word space-padded bold', () => {
    const result = normalize('Remember ** take a break ** today.');
    expect(result).toBe('Remember **take a break** today.');
  });

  it('repairs space-padded italic', () => {
    const result = normalize('This is * emphasized * text.');
    expect(result).toBe('This is *emphasized* text.');
  });
});

// ─── Paren/quote-wrapped bold repair ─────────────────────────────────────────

describe('normalizeAssistantMarkdown — paren-wrapped bold repair', () => {
  it('removes surrounding parens from bold: **("text")** → **"text"**', () => {
    const result = normalize('The technique is **("grounding")** which helps.');
    expect(result).toBe('The technique is **"grounding"** which helps.');
  });

  it('handles space before open paren: ** ("text")** → **"text"**', () => {
    const result = normalize('Try ** ("slow breathing")** now.');
    expect(result).toBe('Try **"slow breathing"** now.');
  });
});

// ─── Doubled-asterisk collapse ────────────────────────────────────────────────

describe('normalizeAssistantMarkdown — doubled-asterisk collapse', () => {
  it('removes standalone **** empty bold', () => {
    const result = normalize('Some text **** more text');
    expect(result).toBe('Some text  more text');
  });
});

// ─── Blank-line normalization ─────────────────────────────────────────────────

describe('normalizeAssistantMarkdown — blank-line normalization', () => {
  it('collapses 3+ blank lines to 2', () => {
    const result = normalize('First paragraph.\n\n\n\nSecond paragraph.');
    expect(result).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('preserves single blank line between paragraphs', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    expect(normalize(text)).toBe(text);
  });
});

// ─── List trailing whitespace ─────────────────────────────────────────────────

describe('normalizeAssistantMarkdown — list trailing whitespace', () => {
  it('trims excessive trailing spaces from list items', () => {
    const input = '- First item   \n- Second item   ';
    const result = normalize(input);
    // Rule trims 2+ trailing spaces (threshold is {2,}); verify both items are clean
    expect(result).not.toMatch(/- First item {2,}/);
    expect(result).toContain('- First item');
    expect(result).toContain('- Second item');
  });
});

// ─── Integration: combined malformed message ─────────────────────────────────

describe('normalizeAssistantMarkdown — combined artefacts', () => {
  it('repairs a message with multiple simultaneous artefacts', () => {
    const input =
      'Here is what I suggest:\n\n' +
      '- Try ** deep breathing ** for 5 minutes\n' +
      '- Use **("grounding")** to stay present\n' +
      '- Remember **** you are safe\n\n\n\n' +
      'Let me know how it goes.';

    const result = normalize(input);

    // Space-padded bold repaired
    expect(result).toContain('**deep breathing**');
    // Paren-wrapped bold repaired
    expect(result).toContain('**"grounding"**');
    // Empty bold removed (result should not contain ****)
    expect(result).not.toContain('****');
    // Blank lines normalized
    expect(result).not.toMatch(/\n{3,}/);
    // Clean content preserved
    expect(result).toContain('Let me know how it goes.');
  });
});
