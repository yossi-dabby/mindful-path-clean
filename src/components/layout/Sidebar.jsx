import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { cn } from "@/lib/utils";
import { Home, MessageCircle, BookOpen, Route, Settings, Wrench } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { useTranslation } from 'react-i18next';
import { AppWordmark, GrowingShieldMark } from '@/components/brand/AppBrand';

export const SIDEBAR_WIDTH = 288; // 72 * 4 = 288px (w-72)

export default function Sidebar({ currentPageName }) {
  const { t } = useTranslation();
  const isCompactChat = currentPageName === 'Chat';
  const visibilityClass = 'hidden md:flex';

  const navItems = [
  { name: t('sidebar.home.name'), icon: Home, path: 'Home', description: t('sidebar.home.description') },
  { name: t('stage_b.nav.coach'), icon: MessageCircle, path: 'Chat', description: t('sidebar.chat.description') },
  { name: t('stage_b.nav.path'), icon: Route, path: 'MyPath', description: t('my_path.subtitle') },
  { name: t('sidebar.journal.name'), icon: BookOpen, path: 'Journal', description: t('sidebar.journal.description') },
  { name: t('stage_b.nav.tools'), icon: Wrench, path: 'Tools', description: t('tools_hub.subtitle') }];


  const secondaryItems = [
  { name: t('sidebar.settings.name'), icon: Settings, path: 'Settings' }];


  return (
    <nav
      data-app-chrome
      aria-label={t('shell.sidebar_navigation')} className={`garden-sidebar ${isCompactChat ? 'py-3' : 'py-6'} ${visibilityClass} fixed start-0 top-0 bottom-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[var(--shadow-md)]`}

      style={{
        zIndex: 35,
        width: `${SIDEBAR_WIDTH}px`
      }}>

      {/* Logo */}
      <div className={isCompactChat ? 'mb-4 px-4' : 'mb-6 px-6'}>
        <div className="flex items-center gap-3">
          <GrowingShieldMark size={42} />
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="min-w-0">
              <AppWordmark name={t('global.app_name')} />
            </h1>
            <p className="mb-0 mt-2 truncate text-xs text-sidebar-foreground/90">{t('global.app_tagline')}</p>
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className={`${isCompactChat ? 'px-2' : 'px-3'} flex-1 overflow-y-auto`} style={{ overscrollBehavior: 'none' }}>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.path;
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'garden-nav-link rounded-2xl flex items-center border transition-calm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isCompactChat ? 'px-3 py-2.5 gap-2' : 'px-4 py-3 gap-3',
                  isActive ? 'bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground' : 'bg-transparent border-transparent text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}>







                <Icon aria-hidden="true" className={`${isCompactChat ? 'w-4 h-4' : 'w-5 h-5'} shrink-0 text-sidebar-primary`} strokeWidth={isActive ? 2.4 : 1.8} />
                <div className="min-w-0 flex-1">
                  <p className={`mb-0 text-inherit font-semibold ${isCompactChat ? 'text-sm leading-4' : 'leading-5'}`}>{item.name}</p>
                  {item.description &&
                  <p className={`mb-0 mt-1 text-sidebar-foreground/90 ${isCompactChat ? 'text-[10px] leading-4' : 'text-xs leading-4'}`}>{item.description}</p>
                  }
                </div>
                {isActive &&
                <div aria-hidden="true" className="shrink-0 rounded-full w-1 h-6 bg-sidebar-primary" />
                }
              </Link>);

          })}
        </div>

        {/* Secondary Items */}
        <div className={`${isCompactChat ? 'mt-4 pt-3' : 'mt-8 pt-6'} border-t border-border/70`}>
          <div className="space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.path;
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    "garden-nav-link flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-control)] border transition-calm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    isActive ?
                    "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground" :
                    "border-transparent text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}>

                  <Icon aria-hidden="true" className="text-sidebar-primary w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-sm">{item.name}</span>
                </Link>);

            })}
          </div>
        </div>
      </div>
    </nav>);

}
