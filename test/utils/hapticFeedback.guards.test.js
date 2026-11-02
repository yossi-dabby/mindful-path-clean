/**
 * hapticFeedback — unit tests
 *
 * Verifies that triggerHaptic and withHaptic:
 *   1. Call window.navigator.vibrate with the correct pattern when the
 *      Vibration API is available (Android/non-iOS supported).
 *   2. Post a message to window.webkit.messageHandlers.haptic when the
 *      iOS WKWebView haptic bridge is available.
 *   3. Do NOT throw and execute silently when neither API is present
 *      (desktop web / unsupported platform).
 *   4. withHaptic wraps a handler: haptic fires first, then the handler.
 *   5. withHaptic is safe when no onClick handler is provided (no errors).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stubs ─────────────────────────────────────────────────────────────────

// We control the `window` shape per-test via vi.stubGlobal / direct assignment.
vi.stubGlobal('window', { navigator: {}, webkit: undefined });

// ── Import under test ──────────────────────────────────────────────────────
import { triggerHaptic, withHaptic } from '../../src/components/utils/hapticFeedback.jsx';

// ── Helpers ────────────────────────────────────────────────────────────────

function setVibrate(fn) {
  window.navigator = { vibrate: fn };
}

function clearVibrate() {
  window.navigator = {};
}

function setWebkitHaptic(postMessage) {
  window.webkit = { messageHandlers: { haptic: { postMessage } } };
}

function clearWebkitHaptic() {
  window.webkit = undefined;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('triggerHaptic — Vibration API (navigator.vibrate)', () => {
  beforeEach(() => {
    clearVibrate();
    clearWebkitHaptic();
  });

  it('calls navigator.vibrate with [10] for type "light"', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    triggerHaptic('light');
    expect(vibrate).toHaveBeenCalledWith([10]);
  });

  it('calls navigator.vibrate with [20] for type "medium"', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    triggerHaptic('medium');
    expect(vibrate).toHaveBeenCalledWith([20]);
  });

  it('calls navigator.vibrate with [30] for type "heavy"', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    triggerHaptic('heavy');
    expect(vibrate).toHaveBeenCalledWith([30]);
  });

  it('calls navigator.vibrate with [5] for type "selection"', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    triggerHaptic('selection');
    expect(vibrate).toHaveBeenCalledWith([5]);
  });

  it('defaults to [10] (light pattern) for an unknown type', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    triggerHaptic('unknown-type');
    expect(vibrate).toHaveBeenCalledWith([10]);
  });
});

describe('triggerHaptic — iOS WKWebView haptic bridge', () => {
  beforeEach(() => {
    clearVibrate();
    clearWebkitHaptic();
  });

  it('posts a message to webkit.messageHandlers.haptic with the correct type', () => {
    const postMessage = vi.fn();
    setWebkitHaptic(postMessage);
    triggerHaptic('medium');
    expect(postMessage).toHaveBeenCalledWith({ type: 'medium' });
  });

  it('posts "selection" type for BottomNav use-case', () => {
    const postMessage = vi.fn();
    setWebkitHaptic(postMessage);
    triggerHaptic('selection');
    expect(postMessage).toHaveBeenCalledWith({ type: 'selection' });
  });
});

describe('triggerHaptic — unsupported platform (graceful no-op)', () => {
  beforeEach(() => {
    clearVibrate();
    clearWebkitHaptic();
  });

  it('does not throw when navigator.vibrate is absent', () => {
    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('does not throw when webkit bridge is absent', () => {
    expect(() => triggerHaptic('heavy')).not.toThrow();
  });

  it('does not throw when window.navigator is undefined', () => {
    window.navigator = undefined;
    expect(() => triggerHaptic('light')).not.toThrow();
    window.navigator = {};
  });
});

describe('withHaptic — handler wrapper', () => {
  beforeEach(() => {
    clearVibrate();
    clearWebkitHaptic();
  });

  it('calls the wrapped onClick handler after triggering haptic', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    const onClick = vi.fn();
    const enhanced = withHaptic(onClick, 'light');
    const fakeEvent = { type: 'click' };
    enhanced(fakeEvent);
    expect(vibrate).toHaveBeenCalledWith([10]);
    expect(onClick).toHaveBeenCalledWith(fakeEvent);
  });

  it('does not throw when onClick is undefined', () => {
    expect(() => withHaptic(undefined, 'light')({})).not.toThrow();
  });

  it('haptic fires even if onClick is not provided', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    withHaptic(undefined, 'medium')({});
    expect(vibrate).toHaveBeenCalledWith([20]);
  });

  it('uses "light" as the default haptic type', () => {
    const vibrate = vi.fn();
    setVibrate(vibrate);
    withHaptic(vi.fn())({});
    expect(vibrate).toHaveBeenCalledWith([10]);
  });
});
