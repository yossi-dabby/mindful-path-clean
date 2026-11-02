import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  FileText,
  Video,
  Headphones,
  Smartphone,
  BookOpen,
  Globe,
  Sparkles,
  Brain,
  Users,
  CalendarDays,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const localeMap = {
  en: 'en-US',
  he: 'he-IL',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT'
};

const typeIcons = {
  article: FileText,
  video: Video,
  podcast: Headphones,
  app: Smartphone,
  book: BookOpen,
  website: Globe,
  meditation: Sparkles,
  scenario: Brain,
  interview: Users,
  guide: BookOpen
};

const typeColors = {
  article: 'bg-sky-50 text-sky-800 border-sky-200',
  video: 'bg-rose-50 text-rose-800 border-rose-200',
  podcast: 'bg-amber-50 text-amber-800 border-amber-200',
  app: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  book: 'bg-orange-50 text-orange-800 border-orange-200',
  website: 'bg-slate-50 text-slate-800 border-slate-200',
  meditation: 'bg-teal-50 text-teal-800 border-teal-200',
  scenario: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  interview: 'bg-violet-50 text-violet-800 border-violet-200',
  guide: 'bg-teal-50 text-teal-800 border-teal-200'
};

const categoryColors = {
  anxiety: 'bg-amber-50 text-amber-800 border-amber-200',
  depression: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  stress: 'bg-rose-50 text-rose-800 border-rose-200',
  mindfulness: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  relationships: 'bg-teal-50 text-teal-800 border-teal-200',
  'self-esteem': 'bg-cyan-50 text-cyan-800 border-cyan-200',
  sleep: 'bg-sky-50 text-sky-800 border-sky-200',
  general: 'bg-secondary text-secondary-foreground border-border/60',
  coping_skills: 'bg-orange-50 text-orange-800 border-orange-200',
  emotional_regulation: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  communication: 'bg-rose-50 text-rose-800 border-rose-200'
};

function formatDate(value, language) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeMap[language] || localeMap.en, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

export default function ResourceCard({
  resource,
  isSaved,
  onSaveToggle,
  isSavePending = false
}) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const Icon = typeIcons[resource.type] || FileText;
  const publishedDate = formatDate(resource.publication_date, language);
  const verifiedDate = formatDate(resource.verified_at, language);
  const categoryKey = resource.category === 'self-esteem' ? 'self_esteem' : resource.category;
  const typeLabel = t(`resources.content_types.${resource.type}`, {
    defaultValue: resource.type
  });
  const categoryLabel = t(`resources.categories.${categoryKey}`, {
    defaultValue: resource.category
  });
  const saveLabel = t(isSaved ? 'resources_ui.card.remove' : 'resources_ui.card.save', {
    title: resource.title
  });

  return (
    <Card
      data-testid="resource-card"
      className="flex h-full min-w-0 flex-col overflow-hidden border border-border/80 bg-card/95 shadow-[var(--shadow-md)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lg)] focus-within:ring-2 focus-within:ring-primary/40"
    >
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
            typeColors[resource.type] || typeColors.article
          )}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onSaveToggle}
            disabled={isSavePending}
            className="h-11 w-11 shrink-0 rounded-full bg-background/90"
            aria-label={saveLabel}
            aria-pressed={isSaved}
           mobileLabel={saveLabel}>
            {isSaved ? (
              <BookmarkCheck className="h-5 w-5 fill-primary text-primary" aria-hidden="true" />
            ) : (
              <Bookmark className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', typeColors[resource.type])}>
              {typeLabel}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', categoryColors[resource.category])}>
              {categoryLabel}
            </Badge>
          </div>
          <h2 className="text-lg font-semibold leading-snug text-foreground">
            {resource.title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {resource.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <dl className="space-y-2 border-t border-border/60 pt-4 text-sm">
          {resource.source && (
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <dt className="sr-only">{t('resources_ui.card.source')}</dt>
              <dd className="font-medium text-foreground">{resource.source}</dd>
            </div>
          )}
          {publishedDate && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">{t('resources_ui.card.published', { date: publishedDate })}</dt>
              <dd>{t('resources_ui.card.published', { date: publishedDate })}</dd>
            </div>
          )}
          {verifiedDate && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">{t('resources_ui.card.verified', { date: verifiedDate })}</dt>
              <dd>{t('resources_ui.card.verified', { date: verifiedDate })}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {resource.estimated_time && (
            <Badge variant="secondary" className="font-normal">
              {t('resources_ui.card.read_time', { time: resource.estimated_time })}
            </Badge>
          )}
          {(resource.tags || []).slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="max-w-full truncate font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        {resource.url && (
          <Button asChild className="min-h-11 w-full rounded-xl">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t('resources_ui.card.open')}: ${resource.title}. ${t('resources_ui.card.opens_new')}`}
            >
              <span>{t('resources_ui.card.open')}</span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
