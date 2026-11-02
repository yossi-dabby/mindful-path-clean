import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, it, expect, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  capturedProps: [],
}));

vi.mock('../../src/components/chat/MessageBubble.jsx', () => ({
  default: function MockMessageBubble(props) {
    mockState.capturedProps.push(props);
    return null;
  },
}));

import MessageList from '../../src/components/chat/MessageList.jsx';

describe('MessageList feedback index targeting', () => {
  beforeEach(() => {
    mockState.capturedProps = [];
  });

  it('prefers raw message indexes for feedback targeting when available', () => {
    renderToStaticMarkup(
      React.createElement(MessageList, {
        messages: [
        { role: 'user', content: 'hello', __rawIndex: 0 },
        { role: 'system', content: 'progress', __rawIndex: 1 },
        { role: 'assistant', content: 'final', __rawIndex: 2 },
        ],
        visibleCount: 3,
        conversationId: 'conv-1',
        sessionLanguage: 'en',
      })
    );

    expect(mockState.capturedProps).toHaveLength(2);
    expect(mockState.capturedProps[0].messageIndex).toBe(0);
    expect(mockState.capturedProps[1].messageIndex).toBe(2);
    expect(mockState.capturedProps[0].showFeedback).toBe(false);
    expect(mockState.capturedProps[1].showFeedback).toBe(true);
  });

  it('falls back to filtered visible indexes when raw indexes are unavailable', () => {
    renderToStaticMarkup(
      React.createElement(MessageList, {
        messages: [
        { role: 'user', content: 'hello' },
        { role: 'system', content: 'progress' },
        { role: 'assistant', content: 'final' },
        ],
        visibleCount: 3,
        conversationId: 'conv-2',
        sessionLanguage: 'en',
      })
    );

    expect(mockState.capturedProps).toHaveLength(2);
    expect(mockState.capturedProps[0].messageIndex).toBe(0);
    expect(mockState.capturedProps[1].messageIndex).toBe(1);
  });

  it('shows feedback only on the latest first or every-third assistant answer', () => {
    const renderConversation = (assistantCount) => {
      mockState.capturedProps = [];
      const messages = [];
      for (let index = 0; index < assistantCount; index++) {
        messages.push({ role: 'user', content: `user-${index}` });
        messages.push({
          role: 'assistant',
          content: `assistant-${index}`,
          metadata: { feedback_finality_verified: true },
        });
      }
      renderToStaticMarkup(
        React.createElement(MessageList, {
          messages,
          visibleCount: messages.length,
          conversationId: 'conv-feedback',
          sessionLanguage: 'he',
        })
      );
      return mockState.capturedProps.filter((props) => props.message.role === 'assistant');
    };

    expect(renderConversation(1).map((props) => props.showFeedback)).toEqual([true]);
    expect(renderConversation(2).map((props) => props.showFeedback)).toEqual([false, false]);
    expect(renderConversation(3).map((props) => props.showFeedback)).toEqual([false, false, true]);
  });
});
