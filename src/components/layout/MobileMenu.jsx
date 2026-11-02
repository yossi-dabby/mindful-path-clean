import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  BookOpen,
  Home,
  Menu,
  MessageCircle,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Wrench,
  X
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerClose, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function MobileMenu() {
  const triggerRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRtl = i18n.dir() === 'rtl';

  const mainItems = [
    { name: t('sidebar.home.name'), description: t('sidebar.home.description'), icon: Home, path: 'Home', testId: 'mobile-nav-home' },
    { name: t('stage_b.nav.coach'), description: t('sidebar.chat.description'), icon: MessageCircle, path: 'Chat', testId: 'mobile-nav-chat' },
    { name: t('stage_b.nav.path'), description: t('my_path.subtitle'), icon: Route, path: 'MyPath', testId: 'mobile-nav-my-path' },
    { name: t('sidebar.journal.name'), description: t('sidebar.journal.description'), icon: BookOpen, path: 'Journal', testId: 'mobile-nav-journal' },
    { name: t('stage_b.nav.tools'), description: t('tools_hub.subtitle'), icon: Wrench, path: 'Tools', testId: 'mobile-nav-tools' }
  ];

  const secondaryItems = [
    { name: t('sidebar.settings.name'), icon: Settings, path: 'Settings', testId: 'mobile-nav-settings' }
  ];

  const isActive = (path) => location.pathname.toLowerCase().includes('/' + path.toLowerCase());

  const renderItem = (item, compact = false) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        key={item.path}
        to={createPageUrl(item.path)}
        data-testid={item.testId}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active
            ? 'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
            : 'border-transparent text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent/60'
        )}
      >
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
          active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-secondary/70 text-sidebar-primary'
        )}>
          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{item.name}</span>
          {!compact && item.description && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span>
          )}
        </span>
        {active && <span className="h-2 w-2 shrink-0 rounded-full bg-sidebar-primary" aria-hidden="true" />}
      </Link>
    );
  };

  return (
    <div className="md:hidden" data-app-chrome>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        data-testid="mobile-menu-button"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-primary shadow-sm transition-all hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('mobile_menu.open_aria')}
        aria-expanded={open}
        aria-controls="premium-mobile-menu"
      >
        <Menu className="h-6 w-6" />
      <span className="sr-only">{t('mobile_actions.menu')}</span></button>

      <Drawer autoFocus open={open} onOpenChange={setOpen} direction={isRtl ? 'right' : 'left'} shouldScaleBackground={false}>
        <DrawerContent
          onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
          id="premium-mobile-menu"
          data-testid="mobile-drawer"
          className="m-0 flex max-h-none flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground p-0 shadow-2xl"
          style={{
            top: 0,
            bottom: 0,
            left: isRtl ? 'auto' : 0,
            right: isRtl ? 0 : 'auto',
            width: 'min(88vw, 360px)',
            height: '100dvh',
            borderRadius: isRtl ? '28px 0 0 28px' : '0 28px 28px 0',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="relative flex items-start justify-between gap-4 border-b border-sidebar-border px-5 pb-5 pt-[calc(env(safe-area-inset-top,0px)+20px)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sidebar-accent text-sidebar-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <DrawerTitle className="truncate text-xl font-bold text-sidebar-foreground">{t('global.app_name')}</DrawerTitle>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('mobile_menu.subtitle')}</p>
              </div>
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors hover:text-sidebar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('mobile_menu.close_aria')}
              >
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </div>

          <nav
            className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-5"
            aria-label={t('shell.additional_navigation')}
            data-app-chrome
          >
            <section aria-labelledby="mobile-menu-main-title">
              <h2 id="mobile-menu-main-title" className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t('mobile_menu.main_section')}
              </h2>
              <div className="mt-2 space-y-1.5">
                {mainItems.map((item) => renderItem(item))}
              </div>
            </section>

            <section className="mt-6 border-t border-sidebar-border pt-5" aria-labelledby="mobile-menu-more-title">
              <h2 id="mobile-menu-more-title" className="px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t('mobile_menu.more_section')}
              </h2>
              <div className="mt-2 space-y-1.5">
                {secondaryItems.map((item) => renderItem(item, true))}
              </div>
            </section>
          </nav>

          <div className="relative border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-card p-3 text-start shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sidebar-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-xs leading-5 text-muted-foreground">{t('mobile_menu.footer_note')}</p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
