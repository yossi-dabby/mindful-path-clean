import React from 'react';
import { Button } from '@/components/ui/button';

export default function FormsCollectionCard({
  collection,
  audienceLabel,
  languageLabel,
  collectionTypeLabel,
  browseLabel,
  onBrowse,
  viewMode = 'medium',
}) {
  const cardModeClasses = {
    large: 'p-6 gap-4',
    medium: 'p-5 gap-3',
    compact: 'p-3 gap-2',
    list: 'p-4 gap-3 md:flex-row md:items-center',
    tiles: 'p-3 gap-2',
  };

  const titleClasses = {
    large: 'text-xl',
    medium: 'text-lg',
    compact: 'text-sm',
    list: 'text-base',
    tiles: 'text-sm',
  };

  return (
    <article
      data-testid={`collection-card-${collection.collectionId}`}
      className={`rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] shadow-[var(--shadow-md)] hover:border-border hover:bg-secondary/70 transition-colors flex flex-col ${cardModeClasses[viewMode] || cardModeClasses.medium}`}
    >
      <div className={viewMode === 'list' ? 'flex-1' : ''}>
        <h3 className={`${titleClasses[viewMode] || titleClasses.medium} font-semibold text-primary leading-snug`}>{collection.title}</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-teal-200 border border-border text-primary">{audienceLabel}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary/70 border border-border text-primary">{languageLabel}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-200 border border-border text-primary">{collectionTypeLabel}</span>
        </div>
        <p className="mt-2 text-sm text-foreground">
          {collection.moduleCount} • {collection.worksheetCount}
        </p>
      </div>
      <Button
        type="button"
        onClick={onBrowse}
        className={`mt-auto bg-primary hover:bg-primary text-white ${viewMode === 'list' ? 'md:mt-0 md:ms-auto' : ''}`}
        data-testid={`browse-collection-${collection.collectionId}`}
      >
        {browseLabel}
      </Button>
    </article>
  );
}
