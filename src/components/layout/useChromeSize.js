import { useLayoutEffect, useRef } from 'react';

// Text resizing can grow the fixed mobile bars. Keep content and support-link
// offsets synchronized with their rendered size, including safe-area padding.
export function useChromeSize(property) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty(property, `${height}px`);
        if (property === '--mobile-header-height') document.documentElement.toggleAttribute('data-expanded-mobile-chrome', height > 100);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(property);
      if (property === '--mobile-header-height') document.documentElement.removeAttribute('data-expanded-mobile-chrome');
    };
  }, [property]);
  return ref;
}
