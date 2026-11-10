import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';
import { createChatRefreshController, listenForChatRefresh } from '../../src/lib/chatRefreshController';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('conversation refresh lifecycle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const state = { scope: 'conversation-A:turn-1', blocked: false };
    const refresh = vi.fn(async () => {});
    const changed = vi.fn();
    const controller = createChatRefreshController({
      getScope: () => state.scope,
      isBlocked: () => state.blocked,
      refresh,
      onStateChange: changed,
    });
    return { state, refresh, changed, controller };
  }

  it('coalesces focus, visible and online events and shares an in-flight read', async () => {
    const { controller, refresh, changed } = setup();
    const gate = deferred(); refresh.mockReturnValue(gate.promise);
    controller.schedule(); controller.schedule(); controller.schedule();
    await vi.advanceTimersByTimeAsync(200);
    const first = controller.request(), second = controller.request();
    expect(first).toBe(second);
    expect(refresh).toHaveBeenCalledTimes(1);
    gate.resolve(); await first;
    expect(changed).toHaveBeenLastCalledWith({ refreshing: false, error: false });
  });

  it('defers while recording or sending and refreshes once after the operation finishes', async () => {
    const { controller, refresh, state } = setup(); state.blocked = true;
    controller.schedule(); await vi.advanceTimersByTimeAsync(500);
    await controller.request();
    expect(refresh).not.toHaveBeenCalled();
    state.blocked = false; controller.flush();
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each(['conversation-B:turn-1', 'conversation-A:turn-2'])('rejects a late read after moving to %s', async (nextScope) => {
    const { controller, refresh, state } = setup();
    const gate = deferred(), committed = vi.fn();
    refresh.mockImplementation(async isCurrent => { await gate.promise; if (isCurrent()) committed(); });
    const request = controller.request(); await Promise.resolve();
    state.scope = nextScope;
    gate.resolve(); await request;
    expect(committed).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('rejects a read when recording starts while it is in flight, then retries after recording', async () => {
    const { controller, refresh, state } = setup();
    const gate = deferred(), committed = vi.fn();
    refresh.mockImplementation(async isCurrent => { await gate.promise; if (isCurrent()) committed(); });
    const request = controller.request(); await Promise.resolve();
    state.blocked = true; gate.resolve(); await request;
    expect(committed).not.toHaveBeenCalled();
    state.blocked = false; controller.flush(); await vi.advanceTimersByTimeAsync(200);
    expect(committed).toHaveBeenCalledTimes(1);
  });

  it('reports an error without retry loops and lets an explicit retry recover', async () => {
    const { controller, refresh, changed } = setup();
    refresh.mockRejectedValueOnce(new Error('Synthetic failure'));
    await controller.request();
    expect(changed).toHaveBeenLastCalledWith({ refreshing: false, error: true });
    await vi.advanceTimersByTimeAsync(10000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await controller.request();
    expect(changed).toHaveBeenLastCalledWith({ refreshing: false, error: false });
  });

  it('reset invalidates pending reads, including leaving and returning to the same conversation', async () => {
    const { controller, refresh, changed } = setup();
    const gate = deferred(), committed = vi.fn();
    refresh.mockImplementation(async isCurrent => { await gate.promise; if (isCurrent()) committed(); });
    const request = controller.request(); await Promise.resolve();
    controller.reset(); const count = changed.mock.calls.length;
    gate.resolve(); await request;
    expect(committed).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(count);
  });

  it('unmount cancels timers and prevents updates from an outstanding request', async () => {
    const { controller, refresh, changed } = setup();
    const gate = deferred(); refresh.mockReturnValue(gate.promise);
    const request = controller.request(); await Promise.resolve();
    controller.schedule(); controller.dispose(); const count = changed.mock.calls.length;
    gate.resolve(); await request; await vi.advanceTimersByTimeAsync(500);
    expect(changed).toHaveBeenCalledTimes(count);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('listens on visibility, focus and reconnect, ignores hidden pages and removes listeners', () => {
    const win = new EventTarget(), doc = new EventTarget(), request = vi.fn();
    doc.hidden = true;
    const stop = listenForChatRefresh(win, doc, request);
    win.dispatchEvent(new Event('online')); doc.dispatchEvent(new Event('visibilitychange'));
    expect(request).not.toHaveBeenCalled();
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange')); win.dispatchEvent(new Event('focus')); win.dispatchEvent(new Event('online'));
    expect(request).toHaveBeenCalledTimes(3);
    const nativeEvent = new Event('mindfulpath:native-app-state');
    nativeEvent.detail = { isActive: false }; win.dispatchEvent(nativeEvent);
    expect(request).toHaveBeenCalledTimes(3);
    nativeEvent.detail = { isActive: true }; win.dispatchEvent(nativeEvent);
    expect(request).toHaveBeenCalledTimes(4);
    stop(); win.dispatchEvent(new Event('online')); win.dispatchEvent(nativeEvent); doc.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('provides refresh and retry copy in all seven UI languages', () => {
    for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
      const copy = translations[language].translation.chat.refresh;
      for (const key of ['menu', 'action', 'list_action', 'loading', 'error', 'load_error', 'list_error', 'retry', 'busy']) {
        expect(copy[key]?.trim().length, `${language}.${key}`).toBeGreaterThan(0);
      }
      if (language !== 'en') expect(copy.action).not.toBe(translations.en.translation.chat.refresh.action);
    }
  });
});
