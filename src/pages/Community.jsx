import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, MessageSquare, TrendingUp, Search, ThumbsUp, Loader2, X, AlertCircle, RefreshCw, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ForumPostCard from '../components/community/ForumPostCard';
import ForumPostForm from '../components/community/ForumPostForm';
import GroupCard from '../components/community/GroupCard';
import GroupForm from '../components/community/GroupForm';
import ProgressShareForm from '../components/community/ProgressShareForm';
import ModerationTools from '../components/community/ModerationTools';
import PullToRefresh from '../components/utils/PullToRefresh';
import { formatCommunityTime, progressTypeKey } from '../components/community/communityFormatters';

const emptyArray = [];

function LoadingCard({ label }) {
  return <Card className="surface-secondary"><CardContent className="flex min-h-36 items-center justify-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>{label}</span></CardContent></Card>;
}

function ErrorCard({ text, retry, retryLabel }) {
  return <Card className="surface-secondary"><CardContent className="flex min-h-36 flex-col items-center justify-center gap-3 p-6 text-center"><AlertCircle className="h-8 w-8 text-red-600" /><p role="alert" className="text-foreground">{text}</p><Button type="button" variant="outline" className="min-h-[44px]" onClick={retry} mobileLabelKey="refresh"><RefreshCw className="me-2 h-4 w-4" />{retryLabel}</Button></CardContent></Card>;
}

export default function Community() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('forum');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moderatingPost, setModeratingPost] = useState(null);
  const [pendingReaction, setPendingReaction] = useState('');
  const [pendingGroup, setPendingGroup] = useState('');
  const [actionError, setActionError] = useState('');

  const userQuery = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const postsQuery = useQuery({ queryKey: ['forumPosts'], queryFn: () => base44.entities.ForumPost.list('-created_date', 50) });
  const groupsQuery = useQuery({ queryKey: ['communityGroups'], queryFn: () => base44.entities.CommunityGroup.list('-created_date') });
  const membershipsQuery = useQuery({ queryKey: ['groupMemberships'], queryFn: () => base44.entities.GroupMembership.list() });
  const progressQuery = useQuery({ queryKey: ['sharedProgress'], queryFn: () => base44.entities.SharedProgress.list('-created_date', 30) });
  const reactionsQuery = useQuery({ queryKey: ['communityReactions'], queryFn: () => base44.entities.CommunityReaction.list('-created_date', 500) });

  const forumPosts = postsQuery.data || emptyArray;
  const groups = groupsQuery.data || emptyArray;
  const memberships = membershipsQuery.data || emptyArray;
  const sharedProgress = progressQuery.data || emptyArray;
  const reactions = reactionsQuery.data || emptyArray;

  const reactedKeys = useMemo(() => new Set(reactions.map((reaction) => `${reaction.target_type}:${reaction.target_id}`)), [reactions]);
  const myGroupIds = useMemo(() => new Set(memberships.map((membership) => membership.group_id)), [memberships]);
  const visibleGroups = useMemo(() => groups.filter((group) => !group.is_private || myGroupIds.has(group.id) || group.created_by === userQuery.data?.email), [groups, myGroupIds, userQuery.data?.email]);
  const filteredPosts = useMemo(() => {
    const search = searchQuery.trim().toLocaleLowerCase();
    if (!search) return forumPosts;
    return forumPosts.filter((post) => (post.title || '').toLocaleLowerCase().includes(search) || (post.content || '').toLocaleLowerCase().includes(search));
  }, [forumPosts, searchQuery]);

  const reactionMutation = useMutation({
    mutationFn: async ({ targetType, item }) => {
      const result = await base44.functions.invoke('toggleCommunityReaction', { target_type: targetType, target_id: item.id });
      return { ...result.data, targetType, item };
    },
    onMutate: async ({ targetType, item }) => {
      setActionError('');
      const key = `${targetType}:${item.id}`;
      setPendingReaction(key);
      const queryKey = targetType === 'forum_post' ? ['forumPosts'] : ['sharedProgress'];
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: ['communityReactions'] })
      ]);
      const previousItems = queryClient.getQueryData(queryKey);
      const previousReactions = queryClient.getQueryData(['communityReactions']);
      const wasReacted = reactedKeys.has(key);
      queryClient.setQueryData(queryKey, (old = []) => old.map((entry) => entry.id === item.id ? { ...entry, upvotes: Math.max(0, (entry.upvotes || 0) + (wasReacted ? -1 : 1)) } : entry));
      queryClient.setQueryData(['communityReactions'], (old = []) => wasReacted
        ? old.filter((entry) => `${entry.target_type}:${entry.target_id}` !== key)
        : [...old, { id: `temp-${key}`, target_type: targetType, target_id: item.id }]
      );
      return { previousItems, previousReactions, queryKey };
    },
    onSuccess: ({ reacted, count, targetType, item }) => {
      const queryKey = targetType === 'forum_post' ? ['forumPosts'] : ['sharedProgress'];
      queryClient.setQueryData(queryKey, (old = []) => old.map((entry) => entry.id === item.id ? { ...entry, upvotes: count } : entry));
      queryClient.setQueryData(['communityReactions'], (old = []) => {
        const key = `${targetType}:${item.id}`;
        const without = old.filter((entry) => `${entry.target_type}:${entry.target_id}` !== key);
        return reacted ? [...without, { id: `confirmed-${key}`, target_type: targetType, target_id: item.id }] : without;
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItems) queryClient.setQueryData(context.queryKey, context.previousItems);
      if (context?.previousReactions) queryClient.setQueryData(['communityReactions'], context.previousReactions);
      setActionError(t('community_ui.page.reaction_error'));
    },
    onSettled: () => setPendingReaction('')
  });

  const joinMutation = useMutation({
    mutationFn: async (group) => {
      const result = await base44.functions.invoke('joinCommunityGroup', { group_id: group.id });
      return { ...result.data, group };
    },
    onMutate: (group) => {
      setActionError('');
      setPendingGroup(group.id);
    },
    onSuccess: ({ group, member_count }) => {
      queryClient.setQueryData(['communityGroups'], (old = []) => old.map((entry) => entry.id === group.id ? { ...entry, member_count } : entry));
      queryClient.invalidateQueries({ queryKey: ['groupMemberships'] });
    },
    onError: (error) => {
      const isPrivate = error?.response?.data?.error === 'PRIVATE_GROUP_REQUIRES_APPROVAL';
      setActionError(t(isPrivate ? 'community_ui.page.private_join' : 'community_ui.page.join_error'));
    },
    onSettled: () => setPendingGroup('')
  });

  const retryAll = () => {
    postsQuery.refetch();
    groupsQuery.refetch();
    membershipsQuery.refetch();
    progressQuery.refetch();
    reactionsQuery.refetch();
  };

  const tabAction = {
    forum: { label: t('community.buttons.new_post'), action: () => setShowPostForm(true) },
    groups: { label: t('community.buttons.create_group'), action: () => setShowGroupForm(true) },
    progress: { label: t('community.buttons.share_progress'), action: () => setShowProgressForm(true) }
  }[activeTab];

  const tabClass = "min-h-[44px] min-w-0 whitespace-normal px-2 text-center text-sm leading-tight text-foreground data-[state=active]:bg-[hsl(var(--card)/0.97)] data-[state=active]:text-primary data-[state=active]:shadow-sm sm:px-4";

  return (
    <PullToRefresh queryKeys={['forumPosts','communityGroups','groupMemberships','sharedProgress','communityReactions']}>
      <div data-testid="community-page" className="mx-auto min-h-[100dvh] max-w-7xl bg-transparent p-3 pb-36 sm:p-5 md:p-8 md:pb-8">
        <header className="mb-6 mt-2 sm:mb-8 sm:mt-4">
          <div className="botanical-title-row"><h1 className="mb-2 break-words text-2xl font-semibold leading-tight text-foreground sm:text-3xl md:text-4xl">{t('community.page_title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
          <p className="max-w-3xl break-words font-medium leading-relaxed text-primary">{t('community.page_subtitle')}</p>
        </header>

        <section aria-label={t('community.page_title')} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            [MessageSquare, forumPosts.length, t('community.stats.forum_posts'), 'text-primary'],
            [Users, visibleGroups.length, t('community.stats.active_groups'), 'text-primary'],
            [TrendingUp, sharedProgress.length, t('community.stats.success_stories'), 'text-primary']
          ].map(([Icon, count, label, color]) => (
            <Card key={label} className="surface-secondary border-border/70 bg-[hsl(var(--card)/0.88)]">
              <CardContent className="flex items-center gap-3 p-4"><Icon className={`h-7 w-7 shrink-0 sm:h-8 sm:w-8 ${color}`} /><div className="min-w-0"><p className={`text-2xl font-bold ${color}`}>{count}</p><p className="break-words text-sm font-medium text-foreground">{label}</p></div></CardContent>
            </Card>
          ))}
        </section>

        {actionError && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}</span><button type="button" onClick={() => setActionError('')} className="min-h-[44px] min-w-[44px]" aria-label={t('community_ui.common.close')}><X className="mx-auto h-4 w-4" /></button></div>}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="surface-secondary mb-6 space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-[hsl(var(--card)/0.9)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid h-auto w-full grid-cols-3 bg-secondary/70 p-1 lg:w-auto">
                <TabsTrigger value="forum" className={tabClass}>{t('community.tabs.forum')}</TabsTrigger>
                <TabsTrigger value="groups" className={tabClass}>{t('community.tabs.groups')}</TabsTrigger>
                <TabsTrigger value="progress" className={tabClass}>{t('community.tabs.progress')}</TabsTrigger>
              </TabsList>
              <Button type="button" onClick={tabAction.action} className="min-h-[44px] w-full bg-primary shadow-[var(--shadow-sm)] sm:w-auto" mobileLabelKey="add"><Plus className="me-2 h-4 w-4" />{tabAction.label}</Button>
            </div>
            {activeTab === 'forum' && (
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
                <Input aria-label={t('community_ui.page.search_label')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('community.search_placeholder')} className="min-h-[44px] rounded-full bg-background ps-10 pe-11" />
                {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label={t('community_ui.page.clear_search')} className="absolute end-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center"><X className="h-4 w-4" /><span className="mobile-action-label md:hidden">{t('community_ui.page.clear_search')}</span></button>}
              </div>
            )}
          </div>

          <TabsContent value="forum" className="mt-0">
            {postsQuery.isLoading ? <LoadingCard label={t('community.loading.posts')} /> :
             postsQuery.isError ? <ErrorCard text={t('community_ui.page.load_error')} retry={postsQuery.refetch} retryLabel={t('community_ui.common.retry')} /> :
             filteredPosts.length === 0 ? (
              <Card className="surface-secondary"><CardContent className="p-8 text-center sm:p-12"><MessageSquare className="mx-auto mb-3 h-14 w-14 text-primary" /><h2 className="mb-2 text-xl font-semibold text-foreground">{t('community.empty_state.no_posts_title')}</h2><p className="mx-auto mb-4 max-w-sm text-primary">{t('community.empty_state.no_posts_message')}</p><Button type="button" onClick={() => setShowPostForm(true)} className="min-h-[44px] bg-primary" data-testid="create-first-post-btn">{t('community.empty_state.create_first_post')}</Button></CardContent></Card>
             ) : (
              <div className="space-y-3">{filteredPosts.map((post) => {
                const key = `forum_post:${post.id}`;
                return <ForumPostCard key={post.id} post={post} onUpvote={(item) => reactionMutation.mutate({ targetType: 'forum_post', item })} onModerate={userQuery.data?.role === 'admin' ? () => setModeratingPost(post) : undefined} isUpvoting={pendingReaction === key} isReacted={reactedKeys.has(key)} />;
              })}</div>
             )}
          </TabsContent>

          <TabsContent value="groups" className="mt-0 space-y-6">
            {groupsQuery.isLoading || membershipsQuery.isLoading ? <LoadingCard label={t('community.loading.groups')} /> :
             groupsQuery.isError || membershipsQuery.isError ? <ErrorCard text={t('community_ui.page.load_error')} retry={retryAll} retryLabel={t('community_ui.common.retry')} /> : (
              <>
                {visibleGroups.some((group) => myGroupIds.has(group.id)) && <section className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{t('community.your_groups')}</h2>{visibleGroups.filter((group) => myGroupIds.has(group.id)).map((group) => <GroupCard key={group.id} group={group} isMember onJoin={() => {}} />)}</section>}
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">{t('community.discover_groups')}</h2>
                  {visibleGroups.filter((group) => !myGroupIds.has(group.id)).length === 0 ? <Card className="surface-secondary"><CardContent className="p-8 text-center sm:p-12"><Users className="mx-auto mb-3 h-14 w-14 text-primary" /><h3 className="mb-2 text-xl font-semibold text-foreground">{t('community.empty_state.no_groups_title')}</h3><p className="mx-auto mb-4 max-w-sm text-primary">{t('community.empty_state.no_groups_message')}</p><Button type="button" onClick={() => setShowGroupForm(true)} className="min-h-[44px] bg-primary" data-testid="create-first-group-btn">{t('community.empty_state.create_first_group')}</Button></CardContent></Card> :
                   visibleGroups.filter((group) => !myGroupIds.has(group.id)).map((group) => <GroupCard key={group.id} group={group} isMember={false} onJoin={(item) => joinMutation.mutate(item)} isJoining={pendingGroup === group.id} />)}
                </section>
              </>
             )}
          </TabsContent>

          <TabsContent value="progress" className="mt-0">
            {progressQuery.isLoading ? <LoadingCard label={t('community_ui.common.loading')} /> :
             progressQuery.isError ? <ErrorCard text={t('community_ui.page.load_error')} retry={progressQuery.refetch} retryLabel={t('community_ui.common.retry')} /> :
             sharedProgress.length === 0 ? <Card className="surface-secondary"><CardContent className="p-8 text-center sm:p-12"><TrendingUp className="mx-auto mb-3 h-14 w-14 text-primary" /><h2 className="mb-2 text-xl font-semibold text-foreground">{t('community.empty_state.no_stories_title')}</h2><p className="mx-auto mb-4 max-w-sm text-primary">{t('community.empty_state.no_stories_message')}</p><Button type="button" onClick={() => setShowProgressForm(true)} className="min-h-[44px] bg-primary" data-testid="share-story-btn">{t('community.empty_state.share_your_story')}</Button></CardContent></Card> :
             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{sharedProgress.map((progress) => {
               const key = `shared_progress:${progress.id}`;
               const author = progress.is_anonymous ? t('community_ui.card.anonymous') : (progress.author_display_name || t('community_ui.card.anonymous'));
               return <Card key={progress.id} data-testid={`shared-progress-${progress.id}`} className="surface-primary overflow-hidden border-border/70 bg-[hsl(var(--card)/0.94)]"><CardContent className="flex h-full flex-col p-4 sm:p-5"><article className="flex h-full flex-col"><h2 className="break-words text-lg font-semibold text-foreground">{progress.title}</h2><p className="mt-2 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{progress.content}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-wrap items-center gap-2"><span className="rounded-full border border-border/60 bg-secondary px-2 py-1 text-xs text-primary">{t(progressTypeKey(progress.progress_type))}</span><span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /><span className="truncate">{author}</span></span><time className="text-xs text-muted-foreground" dateTime={progress.created_date}>{formatCommunityTime(progress.created_date, t)}</time></div><Button type="button" variant={reactedKeys.has(key) ? 'secondary' : 'ghost'} size="sm" className="min-h-[44px] min-w-[44px]" onClick={() => reactionMutation.mutate({ targetType: 'shared_progress', item: progress })} disabled={pendingReaction === key} aria-pressed={reactedKeys.has(key)} aria-label={t(reactedKeys.has(key) ? 'community_ui.card.remove_upvote' : 'community_ui.card.upvote')} mobileLabel={t(reactedKeys.has(key) ? 'community_ui.card.remove_upvote' : 'community_ui.card.upvote')}>{pendingReaction === key ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <ThumbsUp className={`me-1 h-4 w-4 ${reactedKeys.has(key) ? 'fill-current' : ''}`} />}{progress.upvotes || 0}</Button></div></article></CardContent></Card>;
             })}</div>}
          </TabsContent>
        </Tabs>

        {showPostForm && <ForumPostForm onClose={() => setShowPostForm(false)} />}
        {showGroupForm && <GroupForm onClose={() => setShowGroupForm(false)} />}
        {showProgressForm && <ProgressShareForm onClose={() => setShowProgressForm(false)} />}
        {moderatingPost && userQuery.data?.role === 'admin' && <ModerationTools post={moderatingPost} onClose={() => setModeratingPost(null)} />}
      </div>
    </PullToRefresh>
  );
}
