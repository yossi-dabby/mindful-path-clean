import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Bookmark,
  Library,
  ShieldCheck,
  CalendarClock,
  SlidersHorizontal,
  X,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResourceCard from '../components/resources/ResourceCard';
import AIResourceRecommendations from '../components/resources/AIResourceRecommendations';
import PullToRefresh from '../components/utils/PullToRefresh';

const categoryOrder = [
  'anxiety',
  'depression',
  'stress',
  'mindfulness',
  'relationships',
  'self-esteem',
  'sleep',
  'coping_skills',
  'emotional_regulation',
  'communication',
  'general'
];

const typeOrder = [
  'article',
  'guide',
  'video',
  'podcast',
  'meditation',
  'interview',
  'website',
  'app',
  'book',
  'scenario'
];

function normalize(value, language) {
  return String(value || '').toLocaleLowerCase(language);
}

function ResourceSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-5" aria-hidden="true">
      <div className="flex justify-between">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-5 w-4/5" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <Skeleton className="mt-6 h-16 w-full" />
      <Skeleton className="mt-5 h-11 w-full rounded-xl" />
    </div>
  );
}

export default function Resources() {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTab, setActiveTab] = useState('all');
  const [saveError, setSaveError] = useState('');
  const queryClient = useQueryClient();

  const {
    data: allResources = [],
    isLoading,
    isError,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['resources', language],
    queryFn: () => base44.entities.Resource.filter(
      { language, status: 'active' },
      '-publication_date',
      100
    )
  });

  const {
    data: savedResources = [],
    isError: savedResourcesError
  } = useQuery({
    queryKey: ['savedResources'],
    queryFn: () => base44.entities.SavedResource.list('-created_date', 200)
  });

  const resources = useMemo(
    () => allResources.filter((resource) => (
      resource.status !== 'archived' &&
      resource.status !== 'draft' &&
      resource.language === language
    )),
    [allResources, language]
  );

  const saveResourceMutation = useMutation({
    mutationFn: (resourceId) => base44.entities.SavedResource.create({ resource_id: resourceId }),
    onMutate: async (resourceId) => {
      setSaveError('');
      await queryClient.cancelQueries({ queryKey: ['savedResources'] });
      const previous = queryClient.getQueryData(['savedResources']) || [];
      queryClient.setQueryData(['savedResources'], [
        ...previous,
        { id: `temp-${crypto.randomUUID()}`, resource_id: resourceId }
      ]);
      return { previous };
    },
    onError: (_error, _resourceId, context) => {
      queryClient.setQueryData(['savedResources'], context?.previous || []);
      setSaveError(t('resources_ui.save_error'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['savedResources'] })
  });

  const unsaveResourceMutation = useMutation({
    mutationFn: (savedResourceId) => base44.entities.SavedResource.delete(savedResourceId),
    onMutate: async (savedResourceId) => {
      setSaveError('');
      await queryClient.cancelQueries({ queryKey: ['savedResources'] });
      const previous = queryClient.getQueryData(['savedResources']) || [];
      queryClient.setQueryData(
        ['savedResources'],
        previous.filter((savedResource) => savedResource.id !== savedResourceId)
      );
      return { previous };
    },
    onError: (_error, _savedResourceId, context) => {
      queryClient.setQueryData(['savedResources'], context?.previous || []);
      setSaveError(t('resources_ui.save_error'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['savedResources'] })
  });

  const savedResourceIds = useMemo(
    () => savedResources.map((savedResource) => savedResource.resource_id),
    [savedResources]
  );

  const categories = useMemo(() => {
    const counts = resources.reduce((result, resource) => {
      result[resource.category] = (result[resource.category] || 0) + 1;
      return result;
    }, {});
    return categoryOrder
      .filter((value) => counts[value])
      .map((value) => ({
        value,
        count: counts[value],
        label: t(`resources.categories.${value === 'self-esteem' ? 'self_esteem' : value}`)
      }));
  }, [resources, t]);

  const contentTypes = useMemo(() => {
    const counts = resources.reduce((result, resource) => {
      result[resource.type] = (result[resource.type] || 0) + 1;
      return result;
    }, {});
    return typeOrder
      .filter((value) => counts[value])
      .map((value) => ({
        value,
        count: counts[value],
        label: t(`resources.content_types.${value}`, { defaultValue: value })
      }));
  }, [resources, t]);

  const displayedResources = useMemo(() => {
    const query = normalize(searchQuery.trim(), language);
    const filtered = resources.filter((resource) => {
      const searchableText = [
        resource.title,
        resource.description,
        resource.source,
        ...(resource.tags || [])
      ].map((value) => normalize(value, language)).join(' ');

      return (
        (!query || searchableText.includes(query)) &&
        (selectedCategory === 'all' || resource.category === selectedCategory) &&
        (selectedType === 'all' || resource.type === selectedType) &&
        (activeTab !== 'saved' || savedResourceIds.includes(resource.id))
      );
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === 'title') {
        return first.title.localeCompare(second.title, language, { sensitivity: 'base' });
      }
      return String(second.publication_date || '').localeCompare(
        String(first.publication_date || '')
      );
    });
  }, [
    resources,
    searchQuery,
    language,
    selectedCategory,
    selectedType,
    activeTab,
    savedResourceIds,
    sortBy
  ]);

  const activeFilterCount = [
    searchQuery.trim() !== '',
    selectedCategory !== 'all',
    selectedType !== 'all'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
  };

  const handleSaveToggle = (resource) => {
    const savedResource = savedResources.find(
      (item) => item.resource_id === resource.id
    );
    if (savedResource) {
      unsaveResourceMutation.mutate(savedResource.id);
    } else {
      saveResourceMutation.mutate(resource.id);
    }
  };

  const savePending = saveResourceMutation.isPending || unsaveResourceMutation.isPending;
  const emptyTitle = activeTab === 'saved'
    ? t('resources_ui.saved_empty_title')
    : t('resources_ui.empty_title');
  const emptyMessage = activeTab === 'saved'
    ? t('resources_ui.saved_empty_message')
    : t('resources_ui.empty_message');

  return (
    <PullToRefresh queryKeys={['resources', 'savedResources']}>
      <main className="mx-auto min-h-dvh w-full max-w-7xl box-border bg-transparent px-4 py-5 safe-bottom sm:px-6 md:px-8 md:py-8">
        <header className="mb-7 rounded-[var(--radius-card)] border border-primary/15 bg-card/90 p-5 shadow-[var(--shadow-md)] backdrop-blur-sm sm:p-7">
          <div className="garden-responsive-heading flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {t('resources_ui.eyebrow')}
              </p>
              <div className="botanical-title-row"><h1 className="flex items-center gap-3 text-3xl font-semibold text-foreground md:text-4xl">
                <Library className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                {t('resources.page_title')}
              </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {t('resources_ui.page_subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 text-sm font-medium text-primary">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                {t('resources_ui.recent_badge')}
              </span>
              <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-background/70 px-4 text-sm font-medium text-foreground">
                {t('resources_ui.resource_count', { count: resources.length })}
              </span>
            </div>
          </div>
        </header>

        {!isLoading && !isError && (
          <AIResourceRecommendations
            resources={resources}
            onSaveResource={handleSaveToggle}
            savedResourceIds={savedResourceIds}
          />
        )}

        <section
          aria-labelledby="resource-filters-title"
          className="mb-6 space-y-5 rounded-[var(--radius-card)] border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="resource-filters-title" className="flex items-center gap-2 font-semibold text-foreground">
              <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('resources_ui.filters_title')}
            </h2>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="min-h-11 text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('resources_ui.clear_filters')}
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),auto]">
            <div>
              <label htmlFor="resource-search" className="sr-only">
                {t('resources_ui.search_label')}
              </label>
              <div className="relative">
                <Search className="absolute inset-inline-start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="resource-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('resources_ui.search_placeholder')}
                  className="h-12 rounded-2xl ps-11"
                />
              </div>
            </div>
            <div className="min-w-[12rem]">
              <label htmlFor="resource-sort" className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('resources_ui.sort_label')}
              </label>
              <select
                id="resource-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="newest">{t('resources_ui.sort_newest')}</option>
                <option value="title">{t('resources_ui.sort_title')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t('resources.category_label')}
              </p>
              <div
                data-testid="category-chips"
                className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <Button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={selectedCategory === 'all'}
                  className="min-h-10 shrink-0 whitespace-nowrap rounded-full"
                >
                  {t('resources.categories.all')} ({resources.length})
                </Button>
                {categories.map((category) => (
                  <Button
                    type="button"
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    variant={selectedCategory === category.value ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={selectedCategory === category.value}
                    className="min-h-10 shrink-0 whitespace-nowrap rounded-full"
                  >
                    {category.label} ({category.count})
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t('resources.content_type_label')}
              </p>
              <div
                data-testid="type-chips"
                className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <Button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={selectedType === 'all'}
                  className="min-h-10 shrink-0 whitespace-nowrap rounded-full"
                >
                  {t('resources.content_types.all')} ({resources.length})
                </Button>
                {contentTypes.map((type) => (
                  <Button
                    type="button"
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    variant={selectedType === type.value ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={selectedType === type.value}
                    className="min-h-10 shrink-0 whitespace-nowrap rounded-full"
                  >
                    {type.label} ({type.count})
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {t('resources_ui.active_filters', { count: activeFilterCount })}
            </p>
          )}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid h-auto min-h-12 w-full grid-cols-2 rounded-xl sm:w-auto sm:min-w-[24rem]">
            <TabsTrigger value="all" className="min-h-11 text-foreground">
              {t('resources_ui.tabs_all')}
            </TabsTrigger>
            <TabsTrigger value="saved" className="min-h-11 gap-2 text-foreground">
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.tabs_saved', { count: savedResources.length })}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {(saveError || savedResourcesError) && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <span>{saveError || t('resources_ui.save_error')}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t('resources_ui.loading')}>
            {Array.from({ length: 6 }).map((_, index) => (
              <ResourceSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[var(--radius-card)] border border-destructive/30 bg-card/95 px-5 py-10 text-center shadow-sm" role="alert">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {t('resources_ui.load_error')}
            </h2>
            <Button type="button" onClick={() => refetch()} className="mt-5 min-h-11">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('resources_ui.retry')}
            </Button>
          </div>
        ) : displayedResources.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-card/90 px-5 py-12 text-center shadow-sm">
            <Library className="mx-auto h-14 w-14 text-primary/40" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">{emptyTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
            {activeFilterCount > 0 && (
              <Button type="button" variant="outline" onClick={clearFilters} className="mt-5 min-h-11">
                {t('resources_ui.clear_filters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {t('resources_ui.resource_count', { count: displayedResources.length })}
              {isFetching ? ` — ${t('resources_ui.loading')}` : ''}
            </p>
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayedResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  isSaved={savedResourceIds.includes(resource.id)}
                  onSaveToggle={() => handleSaveToggle(resource)}
                  isSavePending={savePending}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </PullToRefresh>
  );
}
