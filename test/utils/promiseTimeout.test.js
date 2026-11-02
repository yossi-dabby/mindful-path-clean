import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromiseTimeoutError, withTimeout } from '../../src/lib/promiseTimeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the wrapped promise value before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ready'), 100, 'too slow')).resolves.toBe('ready');
  });

  it('rejects a stalled operation with a typed timeout error', async () => {
    vi.useFakeTimers();
    const stalled = new Promise(() => {});
    const result = withTimeout(stalled, 500, 'Authentication check timed out');

    const rejection = expect(result).rejects.toMatchObject({
      name: 'PromiseTimeoutError',
      code: 'PROMISE_TIMEOUT',
      message: 'Authentication check timed out',
    });

    await vi.advanceTimersByTimeAsync(500);
    await rejection;
  });

  it('exports the timeout error class for explicit classification', () => {
    const error = new PromiseTimeoutError('late');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('PROMISE_TIMEOUT');
  });
});
