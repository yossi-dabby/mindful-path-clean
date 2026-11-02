import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { focusManager } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';

function updateViewportMetrics() {
  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width || window.innerWidth);
  const height = Math.round(viewport?.height || window.innerHeight);
  const root = document.documentElement;

  root.style.setProperty('--app-viewport-width', `${width}px`);
  root.style.setProperty('--app-viewport-height', `${height}px`);
  root.dataset.nativeOrientation = width > height ? 'landscape' : 'portrait';
}

function dispatchNativeEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * iOS-only Capacitor integration.
 *
 * Native lifecycle, keyboard and viewport events are centralized here so
 * individual screens never register competing listeners. The bridge is inert
 * in browsers and on Android.
 */
export default function IOSNativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return undefined;
    }

    const handles = [];
    const root = document.documentElement;
    let disposed = false;

    root.dataset.nativePlatform = 'ios';
    updateViewportMetrics();

    const addHandle = async (promise) => {
      const handle = await promise;
      if (disposed) {
        await handle.remove();
      } else {
        handles.push(handle);
      }
    };

    addHandle(CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      root.dataset.nativeAppState = isActive ? 'active' : 'background';
      focusManager.setFocused(isActive);
      dispatchNativeEvent('mindfulpath:native-app-state', { isActive, platform: 'ios' });

      if (isActive) {
        queryClientInstance.resumePausedMutations().catch(() => {});
        queryClientInstance.invalidateQueries({ refetchType: 'active' }).catch(() => {});
        requestAnimationFrame(updateViewportMetrics);
      }
    }));

    addHandle(CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      dispatchNativeEvent('mindfulpath:native-url-open', { url, platform: 'ios' });
    }));

    addHandle(CapacitorApp.addListener('appRestoredResult', (result) => {
      dispatchNativeEvent('mindfulpath:native-restored-result', result);
    }));

    addHandle(Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      root.dataset.nativeKeyboard = 'open';
      root.style.setProperty(
        '--native-keyboard-height',
        `${Math.max(0, keyboardHeight || 0)}px`,
      );
      requestAnimationFrame(updateViewportMetrics);
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
    window.visualViewport?.addEventListener('scroll', updateViewportMetrics, { passive: true });

    return () => {
      disposed = true;
      handles.splice(0).forEach((handle) => {
        handle.remove().catch(() => {});
      });
      window.removeEventListener('resize', updateViewportMetrics);
      window.removeEventListener('orientationchange', updateViewportMetrics);
      window.visualViewport?.removeEventListener('resize', updateViewportMetrics);
      window.visualViewport?.removeEventListener('scroll', updateViewportMetrics);
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
