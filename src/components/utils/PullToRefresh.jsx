import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { MOBILE_HEADER_HEIGHT } from '../layout/MobileHeader';
import { useTranslation } from 'react-i18next';

export default function PullToRefresh({ children, queryKeys = [], onRefresh }) {
  const { t } = useTranslation();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const activeTouchIdRef = useRef(null);
  const mainElRef = useRef(null);
  const containerRef = useRef(null);
  const isPullingRef = useRef(false);    // used in event callbacks to avoid stale closures
  const pullDistanceRef = useRef(0);     // mirrors pullDistance state for event callbacks
  const isRefreshingRef = useRef(false); // prevents starting a new pull while refresh is in progress
  const queryClient = useQueryClient();
  const isTouchDeviceRef = useRef(false);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;
  const PULL_START_SLOP = 12;
  const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

  // Cache the scroll container reference once on mount
  useEffect(() => {
    mainElRef.current = document.getElementById('app-scroll-container') || document.querySelector('main');
    isTouchDeviceRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.('(pointer: coarse)').matches === true);
  }, []);

  const resetPullState = useCallback(() => {
    touchStartY.current = 0;
    activeTouchIdRef.current = null;
    isPullingRef.current = false;
    pullDistanceRef.current = 0;
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  const findTrackedTouch = useCallback((touchList) => {
    if (!touchList?.length || activeTouchIdRef.current === null) return null;

    for (const touch of touchList) {
      if (touch.identifier === activeTouchIdRef.current) {
        return touch;
      }
    }

    return null;
  }, []);

  const handleTouchStart = useCallback((e) => {
    // Do not start a new pull sequence while a refresh is already in progress.
    if (isRefreshingRef.current) return;
    if (!isTouchDeviceRef.current) return;

    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest(EDITABLE_SELECTOR)) return;

    // Activate if we are scrolled to the top, or if there is no scroll container
    // (e.g. Playwright / JSDOM test environments where the element is absent).
    const atTop = !mainElRef.current || mainElRef.current.scrollTop === 0;
    if (atTop && e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      activeTouchIdRef.current = e.touches[0].identifier;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    // Skip if we never recorded a start position.
    // Allow when there is no scroll container (test environments).
    if (touchStartY.current === 0) return;
    if (e.touches.length === 0) {
      resetPullState();
      return;
    }
    if (mainElRef.current && mainElRef.current.scrollTop > 0) {
      resetPullState();
      return;
    }

    const trackedTouch = findTrackedTouch(e.touches);
    if (!trackedTouch) {
      resetPullState();
      return;
    }

    const currentY = trackedTouch.clientY;
    const distance = currentY - touchStartY.current;

    if (distance <= 0) {
      resetPullState();
      return;
    }

    if (distance < PULL_START_SLOP && !isPullingRef.current) {
      return;
    }

    const clampedDistance = Math.min(distance, MAX_PULL);
    isPullingRef.current = true;
    pullDistanceRef.current = clampedDistance;
    setIsPulling(true);
    setPullDistance(clampedDistance);
    // preventDefault requires a non-passive listener (registered via useEffect below)
    e.preventDefault();
  }, [findTrackedTouch, resetPullState]);

  const handleTouchEnd = useCallback(async (e) => {
    const changedTouch = findTrackedTouch(e.changedTouches);
    if (activeTouchIdRef.current !== null && !changedTouch && e.touches?.length > 0) {
      return;
    }

    activeTouchIdRef.current = null;
    touchStartY.current = 0;
    if (!isPullingRef.current) {
      pullDistanceRef.current = 0;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const currentPullDistance = pullDistanceRef.current;
    isPullingRef.current = false;
    pullDistanceRef.current = 0;

    if (currentPullDistance >= PULL_THRESHOLD) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      
      try {
        // Invalidate only the provided query keys when specified; fall back to
        // invalidating all active queries when no keys are given (legacy behaviour).
        if (Array.isArray(queryKeys) && queryKeys.length > 0) {
          await Promise.all(
            queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }))
          );
        } else {
          await queryClient.invalidateQueries();
        }
        
        // Call custom refresh handler if provided
        if (onRefresh) {
          await onRefresh();
        }
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [findTrackedTouch, queryClient, onRefresh]);

  const handleTouchCancel = useCallback(() => {
    resetPullState();
  }, [resetPullState]);

  useEffect(() => {
    const mainEl = mainElRef.current;
    if (!mainEl) return undefined;

    const handleScroll = () => {
      if (mainEl.scrollTop > 0 && !isRefreshingRef.current) {
        resetPullState();
      }
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, [resetPullState]);

  // Register touch listeners with { passive: false } so e.preventDefault() works
  // without triggering browser warnings about passive event listeners.
  // Capture `el` at setup time so the cleanup removes listeners from the same
  // element they were added to, even if containerRef.current changes later.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="relative"
      data-testid="pull-to-refresh"
      data-pull-to-refresh
      data-pulling={isPulling ? 'true' : 'false'}
      data-refreshing={isRefreshing ? 'true' : 'false'}
    >
      {/* Pull indicator - fixed so it appears at the top of the viewport */}
      {(isPulling || isRefreshing) && (
        <div
          role="status"
          aria-live="polite"
          aria-label={isRefreshing ? t('pull_to_refresh.refreshing', 'Refreshing…') : shouldTrigger ? t('pull_to_refresh.release', 'Release to refresh') : t('pull_to_refresh.pull', 'Pull to refresh')}
          className="fixed left-0 right-0 flex justify-center items-center z-50"
          style={{ top: `calc(${MOBILE_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 8px)`, pointerEvents: 'none' }}
        >
          <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-full px-4 py-2 shadow-[var(--shadow-md)] flex items-center gap-2" role="status" aria-live="polite">
            <Loader2
              className={`w-4 h-4 text-primary ${isRefreshing || shouldTrigger ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullProgress * 360}deg)`,
                transition: isRefreshing ? 'none' : 'transform 0.1s linear'
              }}
            />
            <span className="text-xs font-medium text-foreground">
              {isRefreshing ? t('pull_to_refresh.refreshing', 'Refreshing…') : shouldTrigger ? t('pull_to_refresh.release', 'Release to refresh') : t('pull_to_refresh.pull', 'Pull to refresh')}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {/* NOTE: Do NOT apply transform: 'translateY(0)' when idle — even a no-op transform creates
          a new CSS containing block that breaks position:fixed descendants (e.g. full-screen overlays).
          Only apply a transform during an active pull; remove it completely otherwise. */}
      <div style={{ 
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, MAX_PULL * 0.5)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}>
        {children}
      </div>
    </div>
  );
}