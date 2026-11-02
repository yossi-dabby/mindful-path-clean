import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

export default function FormsWorksheetCard({ worksheet, openLabel, downloadLabel, onOpen, onDownload, viewMode = 'medium', typeLabel, stageLabel }) {
  const cardModeClasses = {
    large: 'p-6 gap-4',
    medium: 'p-5 gap-3',
    compact: 'p-3 gap-2',
    list: 'p-4 gap-3 md:flex-row md:items-center',
    tiles: 'p-3 gap-2',
  };

  const titleClasses = {
    large: 'text-lg',
    medium: 'text-base',
    compact: 'text-sm',
    list: 'text-base',
    tiles: 'text-sm',
  };

  const isList = viewMode === 'list';

  return (
    <article
      data-testid={`worksheet-card-${worksheet.form.id}`}
      className={`rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] shadow-[var(--shadow-md)] hover:border-border hover:bg-secondary/70 transition-colors flex flex-col ${cardModeClasses[viewMode] || cardModeClasses.medium}`}
      dir={worksheet.languageData?.rtl ? 'rtl' : 'ltr'}
    >
      <div className={isList ? 'flex-1' : ''}>
        <h3 className={`${titleClasses[viewMode] || titleClasses.medium} font-semibold text-primary leading-snug`}>{worksheet.languageData.title}</h3>
        {worksheet.languageData.description ? (
          <p className="text-sm text-foreground leading-relaxed">{worksheet.languageData.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {worksheet.form.formNumber ? (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary/70 border border-border text-primary">
              {worksheet.form.formNumber}
            </span>
          ) : null}
          {isList && typeLabel ? (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary/70 border border-border text-primary">{typeLabel}</span>
          ) : null}
          {isList && stageLabel ? (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary/70 border border-border text-primary">{stageLabel}</span>
          ) : null}
          {(worksheet.tags || []).map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-teal-200 border border-border text-primary">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className={`flex gap-2 mt-auto ${isList ? 'md:mt-0 md:w-auto' : ''}`}>
        <Button
          type="button"
          size="sm"
          className={`${isList ? '' : 'flex-1'} bg-primary hover:bg-primary text-white`}
          onClick={onOpen}
          data-testid="forms-file-open"
        >
          <ExternalLink className="w-4 h-4" />
          {openLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`${isList ? '' : 'flex-1'} border-border text-primary hover:bg-secondary/70`}
          onClick={onDownload}
          data-testid="forms-file-download"
        >
          <Download className="w-4 h-4" />
          {downloadLabel}
        </Button>
      </div>
    </article>
  );
}
