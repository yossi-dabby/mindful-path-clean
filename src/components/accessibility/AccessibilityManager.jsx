import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AUTO_DIRECTION_SELECTOR =
  'input:not([dir]), textarea:not([dir]), [contenteditable]:not([dir]), [data-user-content]:not([dir])';

function applyAutomaticDirection(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  if (typeof root.matches === 'function' && root.matches(AUTO_DIRECTION_SELECTOR)) {
    root.setAttribute('dir', 'auto');
  }

  root.querySelectorAll(AUTO_DIRECTION_SELECTOR).forEach((element) => {
    element.setAttribute('dir', 'auto');
  });
}

function getCurrentPageLabel(allowDocumentTitle = false) {
  const main = document.querySelector('#app-scroll-container, main, [role="main"]');
  const heading = main?.querySelector('h1') || (!main ? document.querySelector('h1') : null);
  const headingText = heading?.textContent?.trim();
  return headingText || (allowDocumentTitle ? document.title : '');
}

/**
 * Cross-cutting accessibility behaviour for Stage 13:
 * - announces client-side route changes to screen readers;
 * - moves keyboard/screen-reader focus to the main landmark after navigation;
 * - gives mixed-direction user input an automatic Unicode direction.
 */
export default function AccessibilityManager() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    const routeStartFocus = document.activeElement;
    let observer = null;
    let announcementFrame = null;
    let settleTimeoutId = null;
    let fallbackTimeoutId = null;
    let pendingPageLabel = '';
    let readyForSync = false;
    let disposed = false;

    const synchronizeRoute = (allowDocumentTitle = false) => {
      if (disposed) return false;

      const main = document.querySelector('#app-scroll-container, main, [role="main"]');
      if (!(main instanceof HTMLElement)) return false;

      const pageLabel = getCurrentPageLabel(allowDocumentTitle);
      if (!pageLabel) return false;

      const activeElement = document.activeElement;
      const isEditing =
        activeElement instanceof HTMLElement &&
        (activeElement.matches('input, textarea, select, [contenteditable="true"]') ||
          activeElement.closest('[role="dialog"]'));
      const isAlreadyInsideMain =
        activeElement instanceof HTMLElement && main.contains(activeElement);
      // A delayed heading/route announcement must not override a later user
      // focus choice, including controls in portals outside the main landmark.
      const hasNewFocus =
        activeElement instanceof HTMLElement &&
        activeElement !== document.body && activeElement !== routeStartFocus;

      if (!isEditing && !isAlreadyInsideMain && !hasNewFocus) {
        main.focus({ preventScroll: true });
      }

      setAnnouncement('');
      announcementFrame = requestAnimationFrame(() => setAnnouncement(pageLabel));
      return true;
    };

    const completeSync = () => {
      if (fallbackTimeoutId !== null) clearTimeout(fallbackTimeoutId);
    };

    const attemptSettledSync = () => {
      settleTimeoutId = null;
      if (synchronizeRoute()) completeSync();
    };

    const queueSettledSync = () => {
      const nextPageLabel = getCurrentPageLabel();
      if (!nextPageLabel || nextPageLabel === pendingPageLabel) return;

      pendingPageLabel = nextPageLabel;
      if (settleTimeoutId !== null) clearTimeout(settleTimeoutId);
      settleTimeoutId = setTimeout(attemptSettledSync, 200);
    };

    const firstFrame = requestAnimationFrame(() => {
      observer = new MutationObserver(() => {
        if (readyForSync) queueSettledSync();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });

      // Let the previous animated route leave before reading the next page heading.
      settleTimeoutId = setTimeout(() => {
        settleTimeoutId = null;
        readyForSync = true;
        queueSettledSync();
      }, 600);
      fallbackTimeoutId = setTimeout(() => {
        synchronizeRoute(true);
      }, 5000);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(firstFrame);
      if (announcementFrame !== null) cancelAnimationFrame(announcementFrame);
      if (settleTimeoutId !== null) clearTimeout(settleTimeoutId);
      if (fallbackTimeoutId !== null) clearTimeout(fallbackTimeoutId);
      observer?.disconnect();
    };
  }, [location.pathname, i18n.resolvedLanguage, i18n.language]);

  React.useEffect(() => {
    applyAutomaticDirection(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) applyAutomaticDirection(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-a11y-route-announcer
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
}
