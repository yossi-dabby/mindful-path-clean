import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { AlertCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CommunityDialogShell from './CommunityDialogShell';

const CATEGORIES = ['anxiety','depression','stress_management','goal_achievement','mindfulness','fitness','sleep','relationships','work_life_balance','other'];

export default function GroupForm({ onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', description: '', category: 'other', is_private: false, guidelines: '' });
  const options = CATEGORIES.map((value) => ({ value, label: t(`community_ui.group_categories.${value}`) }));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const group = await base44.entities.CommunityGroup.create({ ...data, name: data.name.trim(), description: data.description.trim(), guidelines: data.guidelines.trim(), is_private: false, member_count: 1 });
      await base44.entities.GroupMembership.create({ group_id: group.id, role: 'admin', joined_date: new Date().toISOString() });
      return group;
    },
    onMutate: async (data) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['communityGroups'] }),
        queryClient.cancelQueries({ queryKey: ['groupMemberships'] })
      ]);
      const previousGroups = queryClient.getQueryData(['communityGroups']);
      const previousMemberships = queryClient.getQueryData(['groupMemberships']);
      const id = `temp-${Date.now()}`;
      queryClient.setQueryData(['communityGroups'], (old = []) => [{ ...data, id, is_private: false, member_count: 1, post_count: 0, created_date: new Date().toISOString() }, ...old]);
      queryClient.setQueryData(['groupMemberships'], (old = []) => [{ id: `membership-${id}`, group_id: id, role: 'admin' }, ...old]);
      return { previousGroups, previousMemberships };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousGroups) queryClient.setQueryData(['communityGroups'], context.previousGroups);
      if (context?.previousMemberships) queryClient.setQueryData(['groupMemberships'], context.previousMemberships);
    },
    onSuccess: onClose,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['communityGroups'] });
      queryClient.invalidateQueries({ queryKey: ['groupMemberships'] });
    }
  });

  const valid = formData.name.trim() && formData.description.trim();

  return (
    <CommunityDialogShell title={t('community_ui.group.title')} closeLabel={t('community_ui.common.close')} onClose={onClose} testId="community-group-dialog">
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid) createMutation.mutate(formData); }}>
        <div>
          <label htmlFor="community-group-name" className="mb-2 block text-sm font-medium">{t('community_ui.group.name')}</label>
          <Input id="community-group-name" value={formData.name} maxLength={120} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('community_ui.group.name_placeholder')} className="min-h-[44px] rounded-xl bg-background" autoFocus />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.name.length}/120</p>
        </div>
        <div>
          <label htmlFor="community-group-description" className="mb-2 block text-sm font-medium">{t('community_ui.group.description')}</label>
          <Textarea id="community-group-description" value={formData.description} maxLength={1000} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('community_ui.group.description_placeholder')} className="min-h-28 rounded-xl bg-background" />
          <p className="mt-1 text-end text-xs text-muted-foreground">{formData.description.length}/1000</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">{t('community_ui.group.category')}</label>
          <BottomSheetSelect autoFocus value={formData.category} onValueChange={(category) => setFormData({ ...formData, category })} options={options} title={t('community_ui.group.category_title')} />
        </div>
        <div>
          <label htmlFor="community-group-guidelines" className="mb-2 block text-sm font-medium">{t('community_ui.group.guidelines')}</label>
          <Textarea id="community-group-guidelines" value={formData.guidelines} maxLength={2000} onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })} placeholder={t('community_ui.group.guidelines_placeholder')} className="min-h-28 rounded-xl bg-background" />
        </div>
        <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />{t('community_ui.group.public_notice')}</p>
        {createMutation.isError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{t('community_ui.group.error')}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px] flex-1">{t('community_ui.common.cancel')}</Button>
          <Button type="submit" disabled={!valid || createMutation.isPending} className="min-h-[44px] flex-1 bg-primary">{t(createMutation.isPending ? 'community_ui.group.submitting' : 'community_ui.group.submit')}</Button>
        </div>
      </form>
    </CommunityDialogShell>
  );
}
