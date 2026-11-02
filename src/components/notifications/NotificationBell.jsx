import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, ExternalLink, Target, Dumbbell, TrendingUp, Calendar, Flame, FileText, AtSign, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, he, it, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getCurrentAppLocale } from '@/components/i18n/appLocale';

const DATE_FNS_LOCALES = { en: enUS, he, es, fr, de, it, pt: ptBR };

const TYPE_ICON = {
  goal_reminder: Target,
  exercise_reminder: Dumbbell,
  progress_update: TrendingUp,
  daily_checkin: Calendar,
  streak_alert: Flame,
  session_summary: FileText,
  mention: AtSign,
  system: Info
};

const PRIORITY_DOT = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-transparent',
  low: 'bg-transparent'
};

function NotificationItem({ notification, onMarkRead, onDelete, dateLocale, deleteLabel, unknownDate, disabled }) {
  const Icon = TYPE_ICON[notification.type] || Info;
  const date = new Date(notification.created_date);
  const dateText = Number.isNaN(date.getTime()) ? unknownDate : formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  const isUnread = !notification.is_read;
  const Action = notification.action_url ? 'a' : 'button';

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
      className={`flex min-w-0 items-start gap-1 rounded-[var(--radius-control)] border p-2 ${isUnread ? 'bg-secondary/70 border-border/70' : 'bg-card border-transparent'}`}>
      <Action
        {...(notification.action_url ? { href: notification.action_url } : { type: 'button' })}
        onClick={() => { if (isUnread && !disabled) onMarkRead(notification.id); }}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-start text-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-secondary"><Icon className="h-4 w-4 text-primary" /></span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <span dir="auto" className="block text-sm font-medium leading-snug text-foreground">{notification.title}</span>
          <span dir="auto" className="mt-0.5 block text-xs leading-relaxed text-foreground">{notification.message}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-foreground">
            <span>{dateText}</span>
            {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            {(notification.priority === 'high' || notification.priority === 'critical') && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[notification.priority]}`} />}
            {notification.action_url && <ExternalLink className="h-3 w-3 shrink-0 text-primary" />}
          </span>
        </span>
      </Action>
      <button type="button" disabled={disabled} onClick={() => onDelete(notification.id)}
        className="flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center rounded-lg p-1 text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={deleteLabel}>
        <X className="h-4 w-4" />
        <span className="sr-only">{deleteLabel}</span>
      </button>
    </motion.div>
  );
}

// Dropdown panel width in px — must match the w-80/w-96 values used in the panel.
const PANEL_WIDTH_MOBILE = 320; // w-80
const PANEL_WIDTH_DESKTOP = 384; // w-96
const PANEL_GAP = 8; // gap below the bell button

function useDropdownPosition(buttonRef, open) {
  const [pos, setPos] = useState(null);

  const recalculate = useCallback(() => {
    if (typeof window === 'undefined' || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelWidth = Math.min(vw - 16, vw >= 768 ? PANEL_WIDTH_DESKTOP : PANEL_WIDTH_MOBILE);

    // Prefer aligning the panel's right edge with the button's right edge.
    // If that would clip the left side, align left edges instead.
    let left = rect.right - panelWidth;
    if (left < 8) left = Math.min(rect.left, vw - panelWidth - 8);
    left = Math.max(8, left);

    const top = Math.min(rect.bottom + PANEL_GAP, window.innerHeight - 56);
    setPos({ top, left, width: panelWidth, maxHeight: Math.max(48, window.innerHeight - top - 8) });
  }, [buttonRef]);

  useEffect(() => {
    if (!open) {setPos(null);return;}
    recalculate();
    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate, true);
    return () => {
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate, true);
    };
  }, [open, recalculate]);

  return pos;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const dateLocale = DATE_FNS_LOCALES[appLocale] || enUS;

  const { data: notifications = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.AppNotification.list('-created_date', 50),
    refetchInterval: open ? 60000 : false, // only poll when panel is open
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Treat malformed/partial API data as an empty list. React Query will refresh
  // it normally without flooding the console during offline or resume recovery.
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const unreadCount = safeNotifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AppNotification.update(id, { is_read: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (current = []) =>
      current.map((notification) =>
      notification.id === id ? { ...notification, is_read: true } : notification
      )
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = safeNotifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => base44.entities.AppNotification.update(n.id, { is_read: true })));
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (current = []) =>
      current.map((notification) => ({ ...notification, is_read: true }))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppNotification.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (current = []) =>
      current.filter((notification) => notification.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const pos = useDropdownPosition(buttonRef, open);

  const busy = markReadMutation.isPending || markAllReadMutation.isPending || deleteMutation.isPending;
  const mutationError = markReadMutation.isError || markAllReadMutation.isError || deleteMutation.isError;
  const panel = pos &&
  <Dialog.Content asChild aria-describedby={undefined} aria-label={t('settings.notifications.title')}>
    <motion.div
      data-testid="notification-panel"
      ref={dropdownRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: Math.min(480, pos.maxHeight),
        zIndex: 9999
      }}
      className="rounded-[var(--radius-card)] shadow-[var(--shadow-lg)] border border-border/80 bg-popover overflow-hidden flex flex-col"
      dir={appLocale === 'he' ? 'rtl' : 'ltr'}>

          <Dialog.Title className="sr-only">{t('settings.notifications.title')}</Dialog.Title>
          {/* Header */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/70 bg-secondary/55">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">{t('settings.notifications.title')}</span>
              {unreadCount > 0 &&
          <Badge className="text-xs px-1.5 py-0">{t('settings.notifications.panel.new_count', { count: unreadCount })}</Badge>
          }
            </div>
            {unreadCount > 0 &&
        <button
          disabled={busy}
          onClick={() => markAllReadMutation.mutate()}
          className="flex min-h-11 items-center gap-1 text-xs text-foreground hover:text-primary/80 font-medium">

                <CheckCheck className="w-3.5 h-3.5" />
                {t('settings.notifications.panel.mark_all_read')}
              </button>
        }
          </div>

          {/* List */}
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {mutationError && <p role="alert" className="p-3 text-sm text-destructive">{t('stage6.save_error')}</p>}
            {isLoading ? <p role="status" className="p-6 text-foreground">{t('stage6.loading')}</p> : isError ? <div role="alert" className="p-4 text-foreground"><p>{t('stage6.load_error')}</p><button className="min-h-11 underline" onClick={() => refetch()}>{t('stage6.retry')}</button></div> : safeNotifications.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-[var(--radius-control)] bg-secondary flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{t('settings.notifications.panel.empty_title')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('settings.notifications.panel.empty_message')}</p>
              </div> :

        <div className="p-2 space-y-1">
                <AnimatePresence>
                  {safeNotifications.map((n) =>
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              disabled={busy}
              unknownDate={t('stage6.unknown_date')}
              dateLocale={dateLocale}
              deleteLabel={t('settings.notifications.panel.delete_aria')} />

            )}
                </AnimatePresence>
              </div>
        }
          </div>
        </motion.div>
    </Dialog.Content>;


  return (
    <Dialog.Root modal open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
      <button
        data-testid="notification-bell"
        ref={buttonRef}
        className="bg-secondary/70 text-primary rounded-3xl relative w-11 h-11 shrink-0 flex items-center justify-center border border-border/60 transition-colors hover:bg-secondary hover:text-foreground"

        aria-label={t('settings.notifications.panel.bell_aria')}
        aria-expanded={open}
        aria-haspopup="dialog">

        <Bell className="text-primary lucide lucide-bell h-[20px] w-[20px]" /><span className="sr-only">{t('mobile_actions.notifications')}</span>
        {unreadCount > 0 &&
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-500">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        }
      </button>
      </Dialog.Trigger>
      <Dialog.Portal>{panel}</Dialog.Portal>
    </Dialog.Root>);

}
