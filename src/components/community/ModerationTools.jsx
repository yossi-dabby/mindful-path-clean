import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Flag, CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CommunityDialogShell from './CommunityDialogShell';
import { forumCategoryKey } from './communityFormatters';

export default function ModerationTools({ post, onClose }) {
  const { t } = useTranslation();
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === 'delete') return base44.entities.ForumPost.delete(post.id);
      return base44.entities.ForumPost.update(post.id, {
        flagged: action === 'flag',
        approved: action === 'approve',
        moderation_notes: reason.trim(),
        moderated_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
      onClose();
    }
  });

  const actions = [
    { id: 'approve', icon: CheckCircle, color: 'text-emerald-600' },
    { id: 'flag', icon: Flag, color: 'text-amber-600' },
    { id: 'delete', icon: XCircle, color: 'text-red-600' }
  ];

  return (
    <CommunityDialogShell title={t('community_ui.moderation.title')} closeLabel={t('community_ui.common.close')} onClose={onClose} testId="moderation-dialog">
      <div className="space-y-5">
        <section className="rounded-xl border border-border/70 bg-secondary/40 p-4" aria-label={post.title}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="break-words font-semibold text-foreground">{post.title}</h2>
            <Badge variant="outline">{t(forumCategoryKey(post.category))}</Badge>
          </div>
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{post.content}</p>
          <p className="mt-3 text-xs text-muted-foreground">{t('community_ui.moderation.by', { author: post.is_anonymous ? t('community_ui.card.anonymous') : post.author_display_name })}</p>
        </section>

        {!action ? (
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Shield className="h-5 w-5 text-primary" />{t('community_ui.moderation.select')}</h2>
            <div className="space-y-3">
              {actions.map(({ id, icon: Icon, color }) => (
                <button type="button" key={id} onClick={() => setAction(id)} className="flex min-h-[64px] w-full items-start gap-3 rounded-xl border border-border/80 bg-background p-4 text-start transition hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${color}`} />
                  <span>
                    <span className="block font-semibold text-foreground">{t(`community_ui.moderation.${id}`)}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t(`community_ui.moderation.${id}_help`)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div><h2 className="font-semibold">{t('community_ui.moderation.confirm_title')}</h2><p className="mt-1 text-sm">{t(`community_ui.moderation.warning_${action}`)}</p></div>
            </div>
            <div>
              <label htmlFor="moderation-reason" className="mb-2 block text-sm font-medium">{t('community_ui.moderation.reason')}</label>
              <Textarea id="moderation-reason" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} placeholder={t('community_ui.moderation.reason_placeholder')} className="min-h-28 rounded-xl bg-background" />
            </div>
            {mutation.isError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{t('community_ui.moderation.error')}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={() => setAction(null)}>{t('community_ui.common.cancel')}</Button>
              <Button type="button" className={`min-h-[44px] flex-1 ${action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary'}`} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {t(mutation.isPending ? 'community_ui.moderation.processing' : 'community_ui.moderation.confirm')}
              </Button>
            </div>
          </section>
        )}
      </div>
    </CommunityDialogShell>
  );
}
