import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CommunityDialogShell from './CommunityDialogShell';

const CATEGORIES = ['general','goals','mental_health','exercises','success_stories','questions','tips'];

export default function ForumPostForm({ onClose, groupId }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ title: '', content: '', category: 'general', tags: [], is_anonymous: false, group_id: groupId || null });
  const [newTag, setNewTag] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const options = CATEGORIES.map((value) => ({ value, label: t(`community_ui.categories.${value}`) }));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ForumPost.create({
      ...data,
      title: data.title.trim(),
      content: data.content.trim(),
      author_display_name: data.is_anonymous ? 'Anonymous User' : (user?.full_name || user?.email || 'Community member')
    }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['forumPosts'] });
      const previousPosts = queryClient.getQueryData(['forumPosts']);
      queryClient.setQueryData(['forumPosts'], (old = []) => [{
        ...data,
        id: `temp-${Date.now()}`,
        title: data.title.trim(),
        content: data.content.trim(),
        author_display_name: data.is_anonymous ? 'Anonymous User' : (user?.full_name || user?.email || 'Community member'),
        upvotes: 0,
        comment_count: 0,
        created_date: new Date().toISOString()
      }, ...old]);
      return { previousPosts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPosts) queryClient.setQueryData(['forumPosts'], context.previousPosts);
    },
    onSuccess: onClose,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['forumPosts'] })
  });

  const addTag = () => {
    const tag = newTag.trim().slice(0, 30);
    if (tag && formData.tags.length < 5 && !formData.tags.includes(tag)) {
      setFormData((current) => ({ ...current, tags: [...current.tags, tag] }));
      setNewTag('');
    }
  };

  const valid = formData.title.trim().length > 0 && formData.content.trim().length > 0;

  return (
    <CommunityDialogShell title={t('community_ui.post.title')} closeLabel={t('community_ui.common.close')} onClose={onClose} testId="forum-post-dialog">
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid) createMutation.mutate(formData); }}>
        <div>
          <label htmlFor="community-post-title" className="mb-2 block text-sm font-medium text-foreground">{t('community_ui.post.title_label')}</label>
          <Input id="community-post-title" value={formData.title} maxLength={120} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('community_ui.post.title_placeholder')} className="min-h-[44px] rounded-xl bg-background" autoFocus />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.title.length}/120</p>
        </div>
        <div>
          <label htmlFor="community-post-content" className="mb-2 block text-sm font-medium text-foreground">{t('community_ui.post.content_label')}</label>
          <Textarea id="community-post-content" value={formData.content} maxLength={5000} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder={t('community_ui.post.content_placeholder')} className="min-h-36 rounded-xl bg-background" />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.content.length}/5000</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">{t('community_ui.post.category')}</label>
          <BottomSheetSelect autoFocus value={formData.category} onValueChange={(category) => setFormData({ ...formData, category })} options={options} title={t('community_ui.post.category_title')} />
        </div>
        <div>
          <label htmlFor="community-post-tag" className="mb-2 block text-sm font-medium text-foreground">{t('community_ui.post.tags')}</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="max-w-full gap-1">
                <span className="truncate">{tag}</span>
                <button type="button" aria-label={t('community_ui.post.remove_tag', { tag })} onClick={() => setFormData((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))} className="min-h-6 min-w-6 rounded-full">×<span className="mobile-action-label md:hidden">{t('community_ui.post.remove_tag', { tag })}</span></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input id="community-post-tag" value={newTag} maxLength={30} disabled={formData.tags.length >= 5} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('community_ui.post.tag_placeholder')} className="min-h-[44px] rounded-xl bg-background" />
            <Button type="button" onClick={addTag} variant="outline" size="icon" className="min-h-[44px] min-w-[44px]" aria-label={t('community_ui.post.add_tag')} disabled={!newTag.trim() || formData.tags.length >= 5} mobileLabelKey="add"><Plus className="h-4 w-4" /></Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('community_ui.post.tags_limit')}</p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/70 p-4">
          <div>
            <label htmlFor="community-post-anonymous" className="font-medium text-primary">{t('community_ui.post.anonymous')}</label>
            <p className="text-sm text-primary">{t('community_ui.post.anonymous_help')}</p>
          </div>
          <Switch id="community-post-anonymous" checked={formData.is_anonymous} onCheckedChange={(is_anonymous) => setFormData({ ...formData, is_anonymous })} />
        </div>
        {createMutation.isError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{t('community_ui.post.error')}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px] flex-1">{t('community_ui.common.cancel')}</Button>
          <Button type="submit" disabled={!valid || createMutation.isPending} className="min-h-[44px] flex-1 bg-primary">
            {t(createMutation.isPending ? 'community_ui.post.submitting' : 'community_ui.post.submit')}
          </Button>
        </div>
      </form>
    </CommunityDialogShell>
  );
}
