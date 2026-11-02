/** Returns the app's primary scroll container (the inner <main> element). */
export function getScrollContainer() {
  return document.getElementById('app-scroll-container') ?? document.documentElement;
}

/**
 * DEV-ONLY: Walks every ancestor of the scroll container and logs its
 * overflow/height computed styles so you can pinpoint what is clipping scroll.
 *
 * Usage in browser console (or a useEffect):
 *   import { debugScrollChain } from '@/lib/scrollContainer';
 *   debugScrollChain();
 *
 * What to look for:
 *   - Any ancestor with overflow-x/y = hidden  → potential BFC clip
 *   - Any ancestor with height ≠ auto           → potential hard height cap
 *   - More than one element with overflow-y = auto/scroll → nested scroll containers
 */
export function debugScrollChain() {
  if (import.meta.env.PROD) return;

  const sc = getScrollContainer();
  if (!sc) {
    console.warn('[debugScrollChain] #app-scroll-container not found in DOM');
    return;
  }

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const breakpoint = vpW >= 1024 ? 'desktop (lg+)' : vpW >= 768 ? 'tablet (md)' : 'mobile';

  console.groupCollapsed(
    `[debugScrollChain] viewport: ${vpW}×${vpH}  |  breakpoint: ${breakpoint}`
  );

  // Log the scroll container itself
  const scStyle = window.getComputedStyle(sc);
  console.log('%c#app-scroll-container (scroll owner)', 'font-weight:bold;color:#26A69A', {
    clientHeight: sc.clientHeight,
    scrollHeight: sc.scrollHeight,
    scrollTop: sc.scrollTop,
    'overflow-x': scStyle.overflowX,
    'overflow-y': scStyle.overflowY,
    height: scStyle.height,
    'padding-left': scStyle.paddingLeft,
    'padding-bottom': scStyle.paddingBottom,
  });

  if (sc.scrollHeight <= sc.clientHeight) {
    console.warn(
      `[debugScrollChain] ⚠️  scrollHeight (${sc.scrollHeight}) ≤ clientHeight (${sc.clientHeight}): no scrollable content or scroll is blocked`
    );
  }

  // Walk ancestors up to <body>
  let el = sc.parentElement;
  let depth = 0;
  while (el && el !== document.documentElement && depth < 20) {
    const st = window.getComputedStyle(el);
    const overflowX = st.overflowX;
    const overflowY = st.overflowY;
    const height = st.height;
    const display = st.display;
    const flexShrink = st.flexShrink;

    const isScrollContainer = ['auto', 'scroll'].includes(overflowY);
    const isHiddenX = overflowX === 'hidden';
    const hasHardHeight = height !== 'auto' && height !== '' && !height.endsWith('%');

    const label = el.id
      ? `#${el.id}`
      : el.className
      ? `.${String(el.className).trim().split(/\s+/)[0]}`
      : el.tagName.toLowerCase();

    const flags = [
      isScrollContainer && '⚠️ NESTED SCROLL',
      isHiddenX && '⚠️ overflow-x:hidden (BFC)',
      hasHardHeight && '⚠️ hard height',
    ].filter(Boolean);

    if (flags.length) {
      console.warn(`[ancestor ${depth}] ${label}`, flags.join('  '), {
        'overflow-x': overflowX,
        'overflow-y': overflowY,
        height,
        display,
        flexShrink,
      });
    } else {
      console.log(`[ancestor ${depth}] ${label}`, {
        'overflow-x': overflowX,
        'overflow-y': overflowY,
        height,
      });
    }

    el = el.parentElement;
    depth++;
  }

  console.groupEnd();
}