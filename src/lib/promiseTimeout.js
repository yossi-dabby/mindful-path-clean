export const AUTH_CHECK_TIMEOUT_MS = 12_000;

export class PromiseTimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'PromiseTimeoutError';
    this.code = 'PROMISE_TIMEOUT';
  }
}

export const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new PromiseTimeoutError(message));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => clearTimeout(timeoutId));
};
