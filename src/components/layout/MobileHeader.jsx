import React from 'react';
import { useChromeSize } from './useChromeSize';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { createPageUrl } from '../../utils';
import { useTabNavigation } from './TabNavigationProvider';
import MobileMenu from './MobileMenu';
import NotificationBell from '../notifications/NotificationBell';
import { useTranslation } from 'react-i18next';
import { AppWordmark, GrowingShieldMark } from '@/components/brand/AppBrand';

export const MOBILE_HEADER_HEIGHT = 60; // Height of mobile header nav area in px (excluding safe area)

export default function MobileHeader({ currentPageName: currentPageNameProp }) {
  const headerRef = useChromeSize('--mobile-header-height');
  const navigate = useNavigate();
  const location = useLocation();
  const tabNav = useTabNavigation();
  const { t } = useTranslation();
  const currentPath = location.pathname;

  // Prefer the prop; fall back to what the TabNavigationProvider knows
  const currentPageName = currentPageNameProp ?? tabNav?.currentPageName;
  const visibilityClass = 'md:hidden';

  // Pages that are always treated as sub-routes (show back button regardless of path depth)
  const ALWAYS_BACK_PAGES = new Set([
  'ExerciseView', 'GoalCoach', 'ThoughtCoach', 'PersonalizedFeed',
  'Journeys', 'PlaylistDetail', 'VideoPlayer', 'StarterPath',
  'CoachingAnalytics', 'AdvancedAnalytics', 'CrisisAlerts', 'TestSetupGuide']
  );

  // Show the Back button when the tab navigation stack has history to go back to,
  // OR when the URL has more than one path segment (genuine sub-route),
  // OR when the current page is always a sub-route (detail/child pages).
  const pathSegments = currentPath.split('/').filter(Boolean);
  const isSubRoute = pathSegments.length > 1 || !!tabNav?.canGoBack() || ALWAYS_BACK_PAGES.has(currentPageName);

  // Get page title based on current page
  const getPageTitle = () => {
    const titles = {
      'Home': t('global.app_name'),
      'Chat': t('sidebar.chat.name'),
      'Coach': t('sidebar.coach.name'),
      'Journal': t('sidebar.journal.name'),
      'MoodTracker': t('mood_tracker.page_title'),
      'Exercises': t('sidebar.exercises.name'),
      'Goals': t('goals.nav_title'),
      'Progress': t('sidebar.progress.name'),
      'Settings': t('sidebar.settings.name'),
      'Community': t('sidebar.community.name'),
      'PersonalizedFeed': t('personalized_feed.nav_title'),
      'ThoughtCoach': t('thought_coach.title'),
      'ExerciseView': t('exercise_view.nav_title'),
      'GoalCoach': t('goal_coach_wizard.title'),
      'MyPath': t('my_path.title'),
      'Tools': t('tools_hub.title')
    };
    return titles[currentPageName] || t('global.app_name');
  };

  const handleBack = () => {
    // Use tab navigation if available for stack-aware back
    if (tabNav?.canGoBack()) {
      const didGoBack = tabNav.goBackInTab();
      if (didGoBack) return;
    }

    // Fallback to browser history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(createPageUrl('Home'));
    }
  };

  return (
    <header
      ref={headerRef}
      data-mobile-header
      data-app-chrome
      className={`${visibilityClass} fixed top-0 left-0 right-0 border-b border-border/70 bg-[hsl(var(--sidebar-background)/0.88)] backdrop-blur-2xl z-40`}
      style={{
        minHeight: 'calc(60px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}>

      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
        {/* Start: Back button on child routes, logo on root */}
        <div className="min-w-0">
          {isSubRoute ?
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack} className="text-primary font-medium tracking-[0.005em] leading-none rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none hover:bg-secondary/78 hover:text-foreground active:bg-secondary/88 h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"

            aria-label={t('common.back')}>

              <ChevronLeft className="text-primary lucide lucide-chevron-left w-6 h-6 rtl:scale-x-[-1]" />
            </Button> :

          <div className="flex items-center">
            <GrowingShieldMark size={36} />
          </div>
          }
        </div>

        {/* Center: Page title */}
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere] overflow-visible text-center text-primary font-semibold">
          {currentPageName === 'Home'
            ? <AppWordmark name={getPageTitle()} compact className="max-w-full" />
            : getPageTitle()}
        </div>

        {/* End: Notification bell + Menu button */}
        <div className="flex items-center gap-1 justify-end">
          <NotificationBell />
          <MobileMenu />
        </div>
      </div>
    </header>);

}
