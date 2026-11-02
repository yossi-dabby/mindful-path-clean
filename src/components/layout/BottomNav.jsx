import React, { useMemo, useCallback } from 'react';
import { useChromeSize } from './useChromeSize';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { cn } from "@/lib/utils";
import { Home, MessageCircle, BookOpen, Route, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTabNavigation } from './TabNavigationProvider';
import { getScrollContainer } from '@/lib/scrollContainer';
import { triggerHaptic } from '@/components/utils/hapticFeedback';

// CRITICAL: This height MUST match the padding-bottom in AppContent
export const BOTTOM_NAV_HEIGHT = 80; // 20 * 4 = 80px (h-20)

export default function BottomNav({ currentPageName }) {
  const navRef = useChromeSize('--mobile-bottom-nav-height');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tabNav = useTabNavigation();
  const activeTab = tabNav?.activeTab ?? currentPageName;
  const visibilityClass = 'md:hidden';

  // Memoised so icon/label objects aren't recreated on every render.
  const navItems = useMemo(() => [
  { name: t('sidebar.home.name'), icon: Home, path: 'Home' },
  { name: t('stage_b.nav.coach'), icon: MessageCircle, path: 'Chat' },
  { name: t('stage_b.nav.path'), icon: Route, path: 'MyPath' },
  { name: t('sidebar.journal.name'), icon: BookOpen, path: 'Journal' },
  { name: t('stage_b.nav.tools'), icon: Wrench, path: 'Tools' }],
  [t]);


  // Stable callback — avoids re-creating the function and re-rendering all
  // Link children on every parent render.
  const handleTabClick = useCallback((e, item) => {
    e.preventDefault();
    triggerHaptic('selection');
    if (tabNav) {
      tabNav.switchToTab(item.path);
    } else {
      if (currentPageName === item.path) {
        navigate(createPageUrl(item.path), { replace: true });
        requestAnimationFrame(() => {
          getScrollContainer().scrollTo({ top: 0, behavior: 'smooth' });
        });
      } else {
        navigate(createPageUrl(item.path));
      }
    }
  }, [tabNav, currentPageName, navigate]);

  return (
    <nav
      ref={navRef}
      aria-label={t('shell.main_navigation')}
      data-app-chrome
      data-mobile-bottom-nav
      className={`${visibilityClass} fixed bottom-0 left-0 right-0 border-t border-border/70 bg-[hsl(var(--sidebar-background)/0.9)] backdrop-blur-2xl shadow-[var(--shadow-lg)]`}
      style={{
        zIndex: 35,
        minHeight: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>

      <div className="grid grid-cols-5 items-stretch gap-1 px-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.path;
          return (
            <Link
              key={item.path}
              to={createPageUrl(item.path)}
              onClick={(e) => handleTabClick(e, item)}
              onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.name}
              className={cn(
                'min-w-0 px-1 py-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-calm border',
                isActive
                  ? 'bg-[hsl(var(--sidebar-accent))] border-border/40 text-[hsl(var(--sidebar-primary))]'
                  : 'bg-transparent border-transparent text-muted-foreground'
              )}>
              <Icon
                className={cn('w-[20px] h-[20px] shrink-0', isActive ? 'text-[hsl(var(--sidebar-primary))]' : 'text-muted-foreground')}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn('max-w-full text-center text-xs font-medium leading-snug [overflow-wrap:anywhere]', isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground')}>{item.name}</span>
            </Link>);

        })}
      </div>
    </nav>);

}
