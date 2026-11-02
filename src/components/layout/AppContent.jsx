import React from 'react';
import { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { SIDEBAR_WIDTH } from './Sidebar';
import MobileHeader, { MOBILE_HEADER_HEIGHT } from './MobileHeader';
import { useTranslation } from 'react-i18next';

/**
 * AppContent - Main content wrapper with proper spacing for navigation
 *
 * CRITICAL LAYOUT RULES:
 * 1. This is the ONLY scrollable container in the app (#app-scroll-container)
 * 2. Mobile (<768px): padding-bottom matches BOTTOM_NAV_HEIGHT, padding-top for header
 * 3. Desktop/tablet (≥768px): padding-left matches SIDEBAR_WIDTH
 * 4. Children should NOT have overflow or fixed heights
 * 5. Pull-to-refresh is handled by page-level PullToRefresh components
 *
 * TABLET SCROLL FIX (768-1023px):
 * - Uses overflow-x-clip (not overflow-x-hidden) so the horizontal clip does NOT
 *   create a Block Formatting Context (BFC).  A BFC on the scroll container can
 *   cause browsers to miscalculate scrollHeight at narrow tablet widths (sidebar
 *   eats 288px, leaving only 480-612px of content area; tall content is cut off).
 * - overflow-x: clip paints the same clip boundary as overflow-x: hidden but
 *   without the BFC side-effect, keeping vertical scrollHeight calculation correct.
 * - The outer Layout shell already uses overflow-x-clip for the same reason.
 */
export default function AppContent({ children, currentPageName }) {
  const mainRef = React.useRef(null);
  const { t } = useTranslation();
  const desktopBreakpoint = 768;
  const sidebarWidth = SIDEBAR_WIDTH;

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#app-scroll-container"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-[var(--radius-control)] focus:text-sm focus:font-medium focus:bg-primary focus:text-primary-foreground focus:shadow-[var(--shadow-md)]">

        {t('shell.skip_to_main')}
      </a>
      <MobileHeader currentPageName={currentPageName} />
      <main
        id="app-scroll-container"
        ref={mainRef}
        tabIndex="-1" className="opacity-100 overflow-y-auto overflow-x-clip"

        style={{
          overscrollBehavior: 'none',
          height: '100dvh',
          WebkitOverflowScrolling: 'touch',
          // Mobile: padding for header + bottom nav + safe areas
          paddingTop: `var(--mobile-header-height, calc(${MOBILE_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px)))`,
          paddingBottom: `var(--mobile-bottom-nav-height, calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px)))`,
          paddingLeft: '0',
          paddingRight: '0'
        }}>

      <style>{`
        @media (min-width: ${desktopBreakpoint}px) {
          #app-scroll-container {
            padding-inline-start: ${sidebarWidth}px !important;
            padding-inline-end: 0 !important;
            /* Reset mobile header/nav paddings; sidebar is fixed so content starts at top */
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
            padding-top: env(safe-area-inset-top, 0px) !important;
            /* Reinforce: no BFC at tablet/desktop — clip, not hidden */
            overflow-x: clip !important;
          }
        }
      `}</style>
      {children}
      </main>
    </>);

}
