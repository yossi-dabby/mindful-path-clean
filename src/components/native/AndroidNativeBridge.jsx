import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { focusManager } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { parseAndroidOAuthCallback } from '@/lib/nativeOAuth';
import { queryClientInstance } from '@/lib/query-client';

const OVERLAY_SELECTOR =
  '[role="dialog"][data-state="open"], [data-vaul-drawer-overlay][data-state="open"]';
const ROOT_PATHS = new Set(['/', '/Home', '/Journal', '/Chat', '/MyPath', '/Tools']);

function closeTopOverlay() {
  if (!document.querySelector(OVERLAY_SELECTOR)) return false;

  if (window.history.state?.overlayOpen) {
    window.history.back();
  } else {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    }));
  }
  return true;
}

function updateViewportMetrics() {
  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width || window.innerWidth);
  const height = Math.round(viewport?.height || window.innerHeight);
  const orientation = width > height ? 'landscape' : 'portrait';
  const root = document.documentElement;

  root.style.setProperty('--app-viewport-width', `${width}px`);
  root.style.setProperty('--app-viewport-height', `${height}px`);
  root.dataset.nativeOrientation = orientation;
}

function dispatchNativeEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Android-only Capacitor integration.
 *
 * The component is deliberately inert on the web. It centralizes hardware Back,
 * foreground/background recovery, verified OAuth app links, restored plugin
 * results, keyboard geometry, and orientation metrics so page components do not
 * register competing native listeners.
 */
export default function AndroidNativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return undefined;
    }

    const handles = [];
    const root = document.documentElement;
    let disposed = false;
    let processedOAuthUrl = null;

    root.dataset.nativePlatform = 'android';
    updateViewportMetrics();

    const addHandle = async (promise) => {
      const handle = await promise;
      if (disposed) {
        await handle.remove();
      } else {
        handles.push(handle);
      }
    };

    const handleNativeUrl = ({ url } = {}) => {
      if (!url) return;

      dispatchNativeEvent('mindfulpath:native-url-open', {
        url,
        platform: 'android',
      });

      const callback = parseAndroidOAuthCallback(url);
      if (!callback || processedOAuthUrl === url) return;

      processedOAuthUrl = url;
      base44.auth.setToken(callback.accessToken);
      window.location.replace(callback.returnTo);
    };

    addHandle(CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      if (closeTopOverlay()) return;

      if (ROOT_PATHS.has(window.location.pathname)) {
        await CapacitorApp.minimizeApp();
        return;
      }

      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        window.location.assign('/Home');
      }
    }));

    addHandle(CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      root.dataset.nativeAppState = isActive ? 'active' : 'background';
      focusManager.setFocused(isActive);
      dispatchNativeEvent('mindfulpath:native-app-state', { isActive });

      if (isActive) {
        queryClientInstance.resumePausedMutations().catch(() => {});
        queryClientInstance.invalidateQueries({ refetchType: 'active' }).catch(() => {});
        requestAnimationFrame(updateViewportMetrics);
      }
    }));

    addHandle(CapacitorApp.addListener('appUrlOpen', handleNativeUrl));

    CapacitorApp.getLaunchUrl()
      .then((launchUrl) => {
        if (!disposed && launchUrl?.url) {
          handleNativeUrl(launchUrl);
        }
      })
      .catch(() => {});

    addHandle(CapacitorApp.addListener('appRestoredResult', (result) => {
      dispatchNativeEvent('mindfulpath:native-restored-result', result);
    }));

    addHandle(Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      root.dataset.nativeKeyboard = 'open';
      root.style.setProperty('--native-keyboard-height', `${Math.max(0, keyboardHeight || 0)}px`);
    }));

    addHandle(Keyboard.addListener('keyboardDidShow', () => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(() => {
          activeElement.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: reducedMotion ? 'auto' : 'smooth',
          });
        });
      }
      updateViewportMetrics();
    }));

    const clearKeyboardState = () => {
      delete root.dataset.nativeKeyboard;
      root.style.setProperty('--native-keyboard-height', '0px');
      requestAnimationFrame(updateViewportMetrics);
    };
    addHandle(Keyboard.addListener('keyboardWillHide', clearKeyboardState));
    addHandle(Keyboard.addListener('keyboardDidHide', clearKeyboardState));

    window.addEventListener('resize', updateViewportMetrics, { passive: true });
    window.addEventListener('orientationchange', updateViewportMetrics, { passive: true });
    window.visualViewport?.addEventListener('resize', updateViewportMetrics, { passive: true });

    return () => {
      disposed = true;
      handles.splice(0).forEach((handle) => {
        handle.remove().catch(() => {});
      });
      window.removeEventListener('resize', updateViewportMetrics);
      window.removeEventListener('orientationchange', updateViewportMetrics);
      window.visualViewport?.removeEventListener('resize', updateViewportMetrics);
      focusManager.setFocused(undefined);
      delete root.dataset.nativePlatform;
      delete root.dataset.nativeAppState;
      delete root.dataset.nativeKeyboard;
      delete root.dataset.nativeOrientation;
      root.style.removeProperty('--native-keyboard-height');
      root.style.removeProperty('--app-viewport-width');
      root.style.removeProperty('--app-viewport-height');
    };
  }, []);

  return null;
}
