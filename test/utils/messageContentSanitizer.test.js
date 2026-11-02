import { describe, it, expect } from 'vitest';
import { sanitizeMessageContent, hasReasoningLeakage, extractThinkingContent } from '../../src/components/utils/messageContentSanitizer.jsx';

describe('sanitizeMessageContent – <think> block stripping', () => {
  it('strips a single <think>…</think> block', () => {
    const input = '<think>I should respond warmly.</think>Hello! How are you?';
    expect(sanitizeMessageContent(input)).toBe('Hello! How are you?');
  });

  it('strips multiple <think>…</think> blocks', () => {
    const input = '<think>Step 1</think>Hi there.<think>Step 2</think> How can I help?';
    expect(sanitizeMessageContent(input)).toBe('Hi there. How can I help?');
  });

  it('strips multiline <think>…</think> blocks', () => {
    const input = '<think>\nLet me think carefully.\nOkay.\n</think>\nI understand your concern.';
    expect(sanitizeMessageContent(input)).toBe('I understand your concern.');
  });

  it('is case-insensitive for <THINK> tags', () => {
    const input = '<THINK>internal note</THINK>Here is my answer.';
    expect(sanitizeMessageContent(input)).toBe('Here is my answer.');
  });

  it('leaves content unchanged when no <think> block is present', () => {
    const input = 'I am here to help you.';
    expect(sanitizeMessageContent(input)).toBe('I am here to help you.');
  });

  it('returns a failsafe string if stripping removes all content', () => {
    const input = '<think>everything is internal</think>';
    const result = sanitizeMessageContent(input, 'en');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('<think>');
  });

  it('strips raw <tool_call> blocks and keeps user-safe content', () => {
    const input = '<tool_call>{"name":"retrieveRelevantContent","arguments":{"query":"sleep"}}</tool_call>\nYou are not alone.';
    expect(sanitizeMessageContent(input, 'en')).toBe('You are not alone.');
  });

  it('returns a failsafe when raw tool-call markup is the entire content', () => {
    const input = '<tool_call>{"name":"retrieveRelevantContent"}</tool_call>';
    const result = sanitizeMessageContent(input, 'en');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('<tool_call>');
  });

  it('returns a Hebrew failsafe for the observed Base44 function-call envelope', () => {
    const input = '<function_calls><invoke name="retrieveTherapistMemory"><parameter name="payload">{}</parameter></invoke></function_calls>';
    const result = sanitizeMessageContent(input, 'he');
    expect(result).toBe('אני כאן איתך. מה הכי מטריד אותך כרגע?');
    expect(result).not.toContain('<function_calls>');
    expect(result).not.toContain('retrieveTherapistMemory');
  });

  it('replaces a complete leaked Base44 tool transcript instead of partially exposing it', () => {
    const input = [
      '<function_calls><invoke name="retrieveTherapistMemory"><parameter name="payload">{}</parameter></invoke></function_calls>',
      '<function_results><result name="retrieveTherapistMemory">No memory found</result>',
      'LOCKED_DOMAIN = [WORRY]',
      'RESPONSE PLAN: explain the loop before assigning a technique.',
      'טוב שפנית. נשמע שהראש מנסה לפתור שוב ושוב את אותה דאגה.',
      '</function_results>',
    ].join('\n');

    const result = sanitizeMessageContent(input, 'he');
    expect(result).toBe('אני כאן איתך. מה הכי מטריד אותך כרגע?');
    expect(result).not.toContain('function_results');
    expect(result).not.toContain('LOCKED_DOMAIN');
    expect(result).not.toContain('RESPONSE PLAN');
  });
});

describe('hasReasoningLeakage – <think> detection', () => {
  it('detects a <think> block as reasoning leakage', () => {
    expect(hasReasoningLeakage('<think>internal</think>Some reply.')).toBe(true);
  });

  it('returns false when no reasoning markers are present', () => {
    expect(hasReasoningLeakage('Just a normal message.')).toBe(false);
  });

  it('detects existing line-prefixed markers', () => {
    expect(hasReasoningLeakage('THOUGHT: I should say hello\nHello!')).toBe(true);
  });

  it('detects raw tool-call markup as leakage', () => {
    expect(hasReasoningLeakage('<tool_call>{"name":"retrieveRelevantContent"}</tool_call>')).toBe(true);
  });

  it('detects raw tool result transcripts as leakage', () => {
    expect(hasReasoningLeakage('<function_results><result>internal</result></function_results>')).toBe(true);
  });
});

describe('sanitizeMessageContent – <INTERNAL_PROCESS> block stripping', () => {
  it('strips a single <INTERNAL_PROCESS>...</INTERNAL_PROCESS> block', () => {
    const input = '<INTERNAL_PROCESS>session init</INTERNAL_PROCESS>Hello! How can I help?';
    expect(sanitizeMessageContent(input, 'en')).toBe('Hello! How can I help?');
  });

  it('strips multiline <INTERNAL_PROCESS> blocks', () => {
    const input =
      '<INTERNAL_PROCESS>\nChecking context.\nSetting language.\n</INTERNAL_PROCESS>\nI am here with you.';
    expect(sanitizeMessageContent(input, 'en')).toBe('I am here with you.');
  });

  it('is case-insensitive for <INTERNAL_PROCESS> tags', () => {
    const input = '<internal_process>data</internal_process>Real response.';
    expect(sanitizeMessageContent(input, 'en')).toBe('Real response.');
  });

  it('strips <INTERNAL_PROCESS> with attributes', () => {
    const input = '<INTERNAL_PROCESS type="session-start">...</INTERNAL_PROCESS>Good to have you here.';
    expect(sanitizeMessageContent(input, 'en')).toBe('Good to have you here.');
  });

  it('returns a failsafe (not empty) when stripping removes all content', () => {
    const input = '<INTERNAL_PROCESS>everything internal</INTERNAL_PROCESS>';
    const result = sanitizeMessageContent(input, 'en');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('<INTERNAL_PROCESS>');
  });

  it('returns a Hebrew failsafe (not empty) when session language is Hebrew', () => {
    const input = '<INTERNAL_PROCESS>everything internal</INTERNAL_PROCESS>';
    const result = sanitizeMessageContent(input, 'he');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('<INTERNAL_PROCESS>');
  });
});

describe('hasReasoningLeakage – <INTERNAL_PROCESS> detection', () => {
  it('detects an <INTERNAL_PROCESS> block as reasoning leakage', () => {
    expect(hasReasoningLeakage('<INTERNAL_PROCESS>session init</INTERNAL_PROCESS>')).toBe(true);
  });

  it('detects a mixed message with <INTERNAL_PROCESS> as leakage', () => {
    expect(hasReasoningLeakage('<INTERNAL_PROCESS>data</INTERNAL_PROCESS>Some reply.')).toBe(true);
  });

  it('returns false for a normal message without <INTERNAL_PROCESS>', () => {
    expect(hasReasoningLeakage('טוב שאתה כאן. מה עולה עבורך היום?')).toBe(false);
  });
});

describe('extractThinkingContent', () => {
  it('extracts content from a single <think> block', () => {
    const input = '<think>I should respond warmly.</think>Hello!';
    expect(extractThinkingContent(input)).toBe('I should respond warmly.');
  });

  it('extracts and joins content from multiple <think> blocks', () => {
    const input = '<think>Step 1</think>Hi.<think>Step 2</think> How can I help?';
    expect(extractThinkingContent(input)).toBe('Step 1\n\nStep 2');
  });

  it('extracts multiline <think> content', () => {
    const input = '<think>\nLet me think.\nOkay.\n</think>\nI understand.';
    expect(extractThinkingContent(input)).toBe('Let me think.\nOkay.');
  });

  it('returns null when no <think> block is present', () => {
    expect(extractThinkingContent('Just a normal message.')).toBeNull();
  });

  it('returns null for empty or non-string input', () => {
    expect(extractThinkingContent('')).toBeNull();
    expect(extractThinkingContent(null)).toBeNull();
    expect(extractThinkingContent(undefined)).toBeNull();
  });

  it('returns null when <think> block is empty', () => {
    expect(extractThinkingContent('<think>   </think>Hello!')).toBeNull();
  });
});
