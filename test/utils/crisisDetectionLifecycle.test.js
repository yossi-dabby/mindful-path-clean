import { describe, expect, it } from 'vitest';
import {
  clearSubmittedDraftIfUnchanged,
  createCrisisDetectionLifecycle,
} from '../../src/lib/crisisDetectionLifecycle.js';

describe('Layer 2 crisis detection lifecycle', () => {
  it('accepts only the latest request in the same conversation', () => {
    const lifecycle = createCrisisDetectionLifecycle();
    const first = lifecycle.begin('conversation-a');
    const second = lifecycle.begin('conversation-a');

    expect(lifecycle.isCurrent(first, 'conversation-a')).toBe(false);
    expect(lifecycle.isCurrent(second, 'conversation-a')).toBe(true);
  });

  it('rejects a result after a conversation switch', () => {
    const lifecycle = createCrisisDetectionLifecycle();
    const request = lifecycle.begin('conversation-a');

    expect(lifecycle.isCurrent(request, 'conversation-b')).toBe(false);
  });

  it('rejects a result after explicit invalidation', () => {
    const lifecycle = createCrisisDetectionLifecycle();
    const request = lifecycle.begin('conversation-a');

    lifecycle.invalidate();

    expect(lifecycle.isCurrent(request, 'conversation-a')).toBe(false);
  });

  it('clears the submitted draft when it is still unchanged', () => {
    expect(clearSubmittedDraftIfUnchanged('submitted text', 'submitted text')).toBe('');
  });

  it('preserves a newer draft while Layer 2 is pending', () => {
    expect(
      clearSubmittedDraftIfUnchanged('new draft', 'submitted text'),
    ).toBe('new draft');
  });
});
