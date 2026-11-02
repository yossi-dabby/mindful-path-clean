import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getScrollContainer } from '@/lib/scrollContainer';

// Store scroll positions for each page
const scrollPositions = new Map();

export default function ScrollPreservation() {
  const location = useLocation();

  useEffect(() => {
    // Save current scroll position before navigating away
    return () => {
      const currentPath = location.pathname + location.search;
      const scrollY = getScrollContainer().scrollTop;
      scrollPositions.set(currentPath, scrollY);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    // Restore scroll position for this page
    const currentPath = location.pathname + location.search;
    const savedScrollY = scrollPositions.get(currentPath);

    if (savedScrollY !== undefined) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        getScrollContainer().scrollTop = savedScrollY;
      });
    } else {
      // New page, scroll to top
      getScrollContainer().scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  return null;
}