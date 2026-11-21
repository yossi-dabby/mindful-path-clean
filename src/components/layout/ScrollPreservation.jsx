import { useLayoutEffect } from 'react';
import { getScrollContainer } from '@/lib/scrollContainer';

/** Mount with the animated page, not with the shared layout. This keeps the
 * outgoing page's save ahead of the incoming page's restore, even with lazy
 * routes, exit animations and content that grows after an API response.
 */
export default function ScrollPreservation({ pageKey, positions, resetScroll = false }) {
  useLayoutEffect(() => {
    const container = getScrollContainer();
    const target = resetScroll ? 0 : positions.get(pageKey) || 0;
    let restoring = true;
    let frame = null;
    let observer = null;
    let timeout = null;

    const finish = () => {
      restoring = false;
      observer?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      positions.set(pageKey, container.scrollTop);
    };
    const restore = () => {
      frame = null;
      if (!restoring) return;
      container.scrollTop = target;
      if (Math.abs(container.scrollTop - target) < 2) finish();
    };
    const scheduleRestore = () => {
      if (restoring && frame === null) frame = requestAnimationFrame(restore);
    };
    const remember = () => {
      if (!restoring) positions.set(pageKey, container.scrollTop);
    };
    // A user's scroll/focus choice always wins over delayed restoration.
    const interrupt = () => { if (restoring) finish(); };
    const onKeyDown = (event) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) interrupt();
    };

    container.addEventListener('scroll', remember, { passive: true });
    for (const event of ['wheel', 'touchstart', 'pointerdown']) {
      container.addEventListener(event, interrupt, { passive: true });
    }
    container.addEventListener('keydown', onKeyDown);
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleRestore);
      observer.observe(container);
      const page = Array.from(container.querySelectorAll('[data-app-page-key]'))
        .find(element => element.getAttribute('data-app-page-key') === pageKey);
      if (page) observer.observe(page);
    }
    timeout = setTimeout(finish, 5000);
    restore();

    return () => {
      // Layout cleanup runs before the outgoing DOM is removed and clamps scroll.
      positions.set(pageKey, restoring ? target : container.scrollTop);
      restoring = false;
      observer?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      if (timeout !== null) clearTimeout(timeout);
      container.removeEventListener('scroll', remember);
      for (const event of ['wheel', 'touchstart', 'pointerdown']) container.removeEventListener(event, interrupt);
      container.removeEventListener('keydown', onKeyDown);
    };
  }, [pageKey, positions, resetScroll]);

  return null;
}
