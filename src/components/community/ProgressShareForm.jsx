import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CommunityDialogShell from './CommunityDialogShell';

const TYPES = ['mood_improvement','goal_achievement','exercise_completion','habit_formation','challenge_overcome','milestone_reached'];

export default function ProgressShareForm({ onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ title: '', content: '', progress_type: 'mood_improvement', is_anonymous: true });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const options = TYPES.map((value) => ({ value, label: t(`community_ui.progress_types.${value}`) }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.SharedProgress.create({
      ...data,
      title: data.title.trim(),
      content: data.content.trim(),
      author_display_name: data.is_anonymous ? 'Anonymous User' : (user?.full_name || user?.email || 'Community member'),
      upvotes: 0
    }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['sharedProgress'] });
      const previous = queryClient.getQueryData(['sharedProgress']);
      queryClient.setQueryData(['sharedProgress'], (old = []) => [{ ...data, id: `temp-${Date.now()}`, title: data.title.trim(), content: data.content.trim(), author_display_name: data.is_anonymous ? 'Anonymous User' : (user?.full_name || user?.email || 'Community member'), upvotes: 0, created_date: new Date().toISOString() }, ...old]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['sharedProgress'], context.previous);
    },
    onSuccess: onClose,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sharedProgress'] })
  });

  const valid = formData.title.trim() && formData.content.trim();

  return (
    <CommunityDialogShell title={t('community_ui.share.title')} closeLabel={t('community_ui.common.close')} onClose={onClose} testId="progress-share-dialog">
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid) mutation.mutate(formData); }}>
        <div>
          <label htmlFor="community-progress-title" className="mb-2 block text-sm font-medium">{t('community_ui.share.title_label')}</label>
          <Input id="community-progress-title" value={formData.title} maxLength={120} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('community_ui.share.title_placeholder')} className="min-h-[44px] rounded-xl bg-background" autoFocus />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.title.length}/120</p>
        </div>
        <div>
          <label htmlFor="community-progress-content" className="mb-2 block text-sm font-medium">{t('community_ui.share.content')}</label>
          <Textarea id="community-progress-content" value={formData.content} maxLength={5000} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder={t('community_ui.share.content_placeholder')} className="min-h-40 rounded-xl bg-background" />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.content.length}/5000</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">{t('community_ui.share.type')}</label>
          <BottomSheetSelect autoFocus value={formData.progress_type} onValueChange={(progress_type) => setFormData({ ...formData, progress_type })} options={options} title={t('community_ui.share.type_title')} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/70 p-4">
          <div>
            <label htmlFor="community-progress-anonymous" className="font-medium text-primary">{t('community_ui.share.anonymous')}</label>
            <p className="text-sm text-primary">{t('community_ui.share.anonymous_help')}</p>
          </div>
          <Switch id="community-progress-anonymous" checked={formData.is_anonymous} onCheckedChange={(is_anonymous) => setFormData({ ...formData, is_anonymous })} />
        </div>
        {mutation.isError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{t('community_ui.share.error')}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px] flex-1">{t('community_ui.common.cancel')}</Button>
          <Button type="submit" disabled={!valid || mutation.isPending} className="min-h-[44px] flex-1 bg-primary">{t(mutation.isPending ? 'community_ui.share.submitting' : 'community_ui.share.submit')}</Button>
        </div>
      </form>
    </CommunityDialogShell>
  );
}
