import { describe, expect, it } from 'vitest';
import { evaluateAssistantReplyFinality } from '../../src/lib/pollingAssistantFinality.js';

const options = {
  getAssistantKey: (msg, index) => msg.id || `assistant-${index}`,
  isExplicitlyFinal: (msg) => msg.status === 'completed',
};

describe('evaluateAssistantReplyFinality', () => {
  it('does not reuse an assistant response that precedes the latest user turn', () => {
    const messages = [
      { role: 'user', content: 'first' },
      { id: 'a1', role: 'assistant', content: 'first reply', status: 'completed' },
      { role: 'user', content: 'second' },
    ];
    const result = evaluateAssistantReplyFinality(messages, null, options);
    expect(result.finality).toEqual({
      isFinal: false,
      reason: 'missing_assistant_after_latest_user',
    });
  });

  it('rejects a raw tool-call-only assistant message as non-final', () => {
    const messages = [
      { role: 'user', content: 'second' },
      {
        id: 'a2',
        role: 'assistant',
        content: '<FUNCTION_CALLS><execute><payload>{}</payload></execute></FUNCTION_CALLS>',
        status: 'completed',
      },
    ];
    const result = evaluateAssistantReplyFinality(messages, null, options);
    expect(result.finality).toEqual({ isFinal: false, reason: 'assistant_tool_call_only' });
  });

  it('accepts a genuine assistant after the latest user only when explicitly final or stable', () => {
    const messages = [
      { role: 'user', content: 'second' },
      { id: 'a2', role: 'assistant', content: 'new reply' },
    ];
    const first = evaluateAssistantReplyFinality(messages, null, options);
    expect(first.finality.isFinal).toBe(false);
    const second = evaluateAssistantReplyFinality(messages, first.nextState, options);
    expect(second.finality).toEqual({
      isFinal: true,
      reason: 'stable_across_poll_snapshots',
    });

    const explicit = evaluateAssistantReplyFinality(
      [{ ...messages[0] }, { ...messages[1], status: 'completed' }],
      null,
      options,
    );
    expect(explicit.finality).toEqual({ isFinal: true, reason: 'explicit_final_status' });
  });
});
