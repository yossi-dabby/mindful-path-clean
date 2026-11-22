// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IOSNativeBridge from '../../src/components/native/IOSNativeBridge.jsx';

const mocks = vi.hoisted(() => ({
  native: true, platform: 'ios', listeners: new Map(), removers: [],
  getLaunchUrl: vi.fn(), complete: vi.fn(), setToken: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform },
}));
vi.mock('@capacitor/app', () => ({ App: {
  addListener: vi.fn(async (name, handler) => {
    mocks.listeners.set(name, handler);
    const remove = vi.fn(async () => {});
    mocks.removers.push(remove);
    return { remove };
  }),
  getLaunchUrl: mocks.getLaunchUrl,
} }));
vi.mock('@capacitor/keyboard', () => ({ Keyboard: {
  addListener: vi.fn(async () => ({ remove: vi.fn(async () => {}) })),
} }));
vi.mock('../../src/api/base44Client', () => ({ base44: { auth: { setToken: mocks.setToken } } }));
vi.mock('../../src/lib/nativeOAuth', () => ({ completeIOSOAuthCallback: mocks.complete }));
vi.mock('../../src/lib/query-client', () => ({ queryClientInstance: {} }));

let root;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = true; mocks.platform = 'ios';
  mocks.listeners.clear(); mocks.removers.length = 0;
  mocks.getLaunchUrl.mockResolvedValue(undefined);
  mocks.complete.mockReturnValue(false);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
async function mount() {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(IOSNativeBridge)));
}

describe('iOS OAuth native lifecycle wiring', () => {
  it('handles an app-open callback and passes the token setter to the validated completion flow', async () => {
    mocks.complete.mockImplementation((url, { setToken }) => { setToken('validated-token'); return true; });
    await mount();
    mocks.listeners.get('appUrlOpen')({ url: 'https://callback.example/warm' });
    expect(mocks.complete).toHaveBeenCalledWith('https://callback.example/warm', {
      setToken: expect.any(Function), navigate: expect.any(Function),
    });
    expect(mocks.setToken).toHaveBeenCalledWith('validated-token');
  });

  it('handles the launch URL when authentication cold-starts the app', async () => {
    mocks.getLaunchUrl.mockResolvedValue({ url: 'https://callback.example/cold' });
    await mount();
    expect(mocks.complete).toHaveBeenCalledWith('https://callback.example/cold', expect.any(Object));
  });

  it('ignores late callbacks after unmount and removes listeners', async () => {
    let resolveLaunch;
    mocks.getLaunchUrl.mockReturnValue(new Promise((resolve) => { resolveLaunch = resolve; }));
    await mount();
    const callback = mocks.listeners.get('appUrlOpen');
    await act(async () => root.unmount());
    root = undefined;
    await act(async () => resolveLaunch({ url: 'https://callback.example/late' }));
    callback({ url: 'https://callback.example/late-event' });
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.removers.every((remove) => remove.mock.calls.length === 1)).toBe(true);
  });

  it.each(['web', 'android'])('does not register iOS authentication on %s', async (platform) => {
    mocks.platform = platform; mocks.native = platform !== 'web';
    await mount();
    expect(mocks.getLaunchUrl).not.toHaveBeenCalled();
    expect(mocks.listeners.size).toBe(0);
  });
});
