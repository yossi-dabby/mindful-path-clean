import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// Keep one list mounted: an inline desktop column or a modal drawer above app
// chrome. Radix owns the small-screen focus trap, background lock and Escape.
export default function ChatConversationsSidebar({ open, desktopCollapsed, onClose, children }) {
  const { t, i18n } = useTranslation();
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const returnFocus = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { if (desktop && open) onClose(); }, [desktop, open, onClose]);

  if (desktop) return desktopCollapsed ? null : <aside aria-label={t('chat.conversations_list.title')} className="relative h-full w-80 shrink-0 border-e border-border/70 bg-card/95" data-testid="chat-desktop-sessions">{children}</aside>;
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side={i18n.dir() === 'rtl' ? 'right' : 'left'} dir={i18n.dir()} aria-describedby={undefined}
        className="w-[min(20rem,calc(100vw_-_1rem))] border-border bg-card p-2 motion-reduce:animate-none motion-reduce:transition-none [&>button]:hidden"
        style={{ padding: 'max(8px, env(safe-area-inset-top, 0px)) 8px max(8px, env(safe-area-inset-bottom, 0px))' }}
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus?.({ preventScroll: true }); }}>
        <SheetTitle asChild><span className="sr-only">{t('chat.conversations_list.title')}</span></SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
