import { applyAppearancePalette } from '@/lib/appearancePalettes';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import BottomNav from './components/layout/BottomNav';
import Sidebar from './components/layout/Sidebar';
import AppContent from './components/layout/AppContent';
import ScrollPreservation from './components/layout/ScrollPreservation';
import { TabNavigationProvider } from './components/layout/TabNavigationProvider';
import { getHumanSupportCopy } from './lib/humanSupportDirectory';
import {
  changeAppLocale,
  getCurrentAppLocale,
  normalizeAppLocale
} from './components/i18n/appLocale';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const isRtl = i18n.dir() === 'rtl';
  const [theme, setTheme] = React.useState('default');
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // Page transitions follow the reading direction and respect the user's
  // reduced-motion preference.
  const pageVariants = prefersReducedMotion
    ? {
        initial: { x: 0, opacity: 1 },
        animate: { x: 0, opacity: 1, transition: { duration: 0 } },
        exit: { x: 0, opacity: 1, transition: { duration: 0 } }
      }
    : {
        initial: {
          x: isRtl ? '-100%' : '100%',
          opacity: 0
        },
        animate: {
          x: 0,
          opacity: 1,
          transition: {
            type: 'tween',
            ease: [0.4, 0.0, 0.2, 1],
            duration: 0.3
          }
        },
        exit: {
          x: isRtl ? '30%' : '-30%',
          opacity: 0,
          transition: {
            type: 'tween',
            ease: [0.4, 0.0, 0.2, 1],
            duration: 0.3
          }
        }
      };

  // Detect system dark mode preference and update theme-color meta tag only.
  // The dark class on <html> is managed by ThemeProvider (next-themes).
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateThemeColor = (isDark) => {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#0c121c' : '#f8f8f6');
      }
    };

    const handleChange = (e) => {
      updateThemeColor(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    updateThemeColor(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Track whether we pushed a sentinel history entry for an open overlay.
  // Using a sentinel push/pop pattern avoids calling history.go(1) from inside
  // a popstate handler, which causes iOS WKWebView "Unified Navigation" warnings.
  const overlayHistoryPushed = React.useRef(false);
  // A unique ID stamped into each sentinel pushState so we can reliably
  // identify it even when other navigations happened while the overlay was open.
  const overlayHistorySentinelId = React.useRef(null);

  // Observe overlay open/close via MutationObserver and manage the sentinel entry.
  React.useEffect(() => {
    const OVERLAY_SELECTOR =
    '[role="dialog"][data-state="open"], [data-vaul-drawer-overlay][data-state="open"]';

    const handleMutation = () => {
      const hasOpenOverlay = !!document.querySelector(OVERLAY_SELECTOR);

      if (hasOpenOverlay && !overlayHistoryPushed.current) {
        // Overlay just opened: push a sentinel entry so back gesture closes the overlay
        // instead of navigating away from the page.
        const sentinelId = Date.now();
        overlayHistorySentinelId.current = sentinelId;
        window.history.pushState({ overlayOpen: true, sentinelId }, '');
        overlayHistoryPushed.current = true;
      } else if (!hasOpenOverlay && overlayHistoryPushed.current) {
        // Overlay closed programmatically (X button, backdrop click, ESC key, etc.)
        // without the user pressing the hardware/gesture back button.
        const expectedId = overlayHistorySentinelId.current;
        overlayHistoryPushed.current = false;
        overlayHistorySentinelId.current = null;
        // Only go back if the sentinel is still the current entry — identified by
        // the unique sentinelId — so that any navigation that occurred while the
        // overlay was open is not accidentally reverted.
        if (
        window.history.state?.overlayOpen &&
        window.history.state?.sentinelId === expectedId)
        {
          window.history.back();
        }
      }
    };

    // Debounce via requestAnimationFrame: Radix UI toggles data-state on multiple
    // elements during open/close animations; batching to one frame avoids redundant
    // selector queries and history mutations.
    let rafId = null;
    const debouncedMutation = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleMutation);
    };

    const observer = new MutationObserver(debouncedMutation);
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-state']
    });
    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Handle back navigation: close any open overlay instead of navigating away.
  // The history.back() / swipe-back already moved history back, so we only need
  // to close the overlay UI — no history.go(1) required.
  React.useEffect(() => {
    const OVERLAY_SELECTOR =
    '[role="dialog"][data-state="open"], [data-vaul-drawer-overlay][data-state="open"]';

    const handlePopState = () => {
      const hasOpenOverlay = !!document.querySelector(OVERLAY_SELECTOR);

      if (hasOpenOverlay) {
        overlayHistoryPushed.current = false;
        // Close the open overlay via ESC (works for Radix Dialog, Sheet, and Vaul Drawer).
        // Only `key` and `code` are used; deprecated `keyCode`/`which` are omitted.
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(escEvent);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    // Load user theme + language preference — only once on mount
    const cached = sessionStorage.getItem('user_prefs_loaded');
    if (cached) {
      try {
        const { theme: t, lang } = JSON.parse(cached);
        setTheme(t || 'default');
        const cachedLocale = normalizeAppLocale(lang);
        if (cachedLocale && cachedLocale !== getCurrentAppLocale(i18n)) {
          void changeAppLocale(i18n, cachedLocale);
        }
      } catch (_) {}
    }
    base44.auth.me().then((user) => {
      const userTheme = user?.preferences?.theme || 'default';
      setTheme(userTheme);

      // Sync saved language preference → i18n (user profile wins over localStorage)
      const savedLang = normalizeAppLocale(user?.preferences?.language);
      if (savedLang && savedLang !== getCurrentAppLocale(i18n)) {
        void changeAppLocale(i18n, savedLang);
      }

      // Apply theme colors
      applyAppearancePalette(userTheme);
      // Cache so subsequent navigations don't re-fetch
      try {
        sessionStorage.setItem('user_prefs_loaded', JSON.stringify({
          theme: userTheme,
          lang: user?.preferences?.language || null
        }));
      } catch (_) {}
    }).catch(() => {

      // User not logged in, use default theme
    });}, []);

  // Detect offline/online status
  React.useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const themeBackgrounds = {
    default: 'bg-warm-gradient',
    ocean: 'bg-calm-gradient',
    sunset: 'bg-warm-gradient',
    forest: 'bg-theme-forest',
    lavender: 'bg-theme-lavender',
    minimal: 'bg-theme-minimal'
  };

  return (
    <TabNavigationProvider currentPageName={currentPageName}>
      {/* overflow-x-clip (not overflow-hidden) so the horizontal clip for page-transition
           animations does not create an ancestor overflow:hidden that would prevent
           iOS WKWebView touch-scroll events from reaching #app-scroll-container. */}
      <div className="app-global-background botanical-theme text-foreground min-h-dvh overflow-x-clip">
        {/* Preserve scroll position between tab switches */}
        <ScrollPreservation />

        {/* Offline Banner - Global */}
        {isOffline &&
        <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 border-b border-border/70 bg-accent text-accent-foreground px-4 py-2 text-center text-sm font-medium shadow-[var(--shadow-md)]" style={{ zIndex: 100 }}>
            {i18n.t('offline_banner', "You're offline. Check your connection.")}
          </div>
        }


      {/* Sidebar - Desktop only */}
      <Sidebar currentPageName={currentPageName} />

      {/* Main Content - Single scroll container with page transitions */}
      <AppContent currentPageName={currentPageName}>
        <AnimatePresence mode="wait" initial={false}>
          {/* min-h-full (not h-full): lets page content taller than the viewport
                 drive #app-scroll-container's scrollHeight. With h-full the wrapper
                 was capped at exactly 100dvh-padding and Safari/WebKit excluded
                 the visual overflow from the scrollable area. */}
          <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="app-page-transition w-full min-h-full"
              data-app-page-transition
              data-app-page-name={currentPageName}>

            {children}
          </motion.div>
        </AnimatePresence>
        {currentPageName !== 'Chat' && <Link
          to="/contact"
          data-testid="persistent-human-support"
          className="fixed end-4 bottom-[calc(var(--mobile-bottom-nav-height,80px)+8px)] z-[36] inline-flex max-w-[min(240px,calc(100vw-32px))] min-h-11 items-center gap-2 rounded-full border border-border bg-[hsl(var(--card)/0.97)] px-4 py-2 text-sm font-semibold text-primary shadow-lg backdrop-blur hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6"
          aria-label={getHumanSupportCopy(i18n.resolvedLanguage || i18n.language).buttonLabel}
        >
          <LifeBuoy className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{getHumanSupportCopy(i18n.resolvedLanguage || i18n.language).buttonLabel}</span>
        </Link>}
      </AppContent>



        {/* Bottom Navigation - Mobile only */}
        <BottomNav currentPageName={currentPageName} />
      </div>
    </TabNavigationProvider>);

}
