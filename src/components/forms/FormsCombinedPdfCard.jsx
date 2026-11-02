import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

export default function FormsCombinedPdfCard({ lang = 'en', viewMode = 'medium', onOpen, onDownload }) {
  const isListLike = viewMode === 'list' || viewMode === 'compact';

  return (
    <div
      data-testid="combined-pdf-card"
      className={`rounded-[var(--radius-card)] border-2 border-border bg-secondary/70 p-4 ${
        isListLike ? 'flex flex-wrap items-center gap-3' : 'flex flex-col gap-3 md:flex-row md:items-center'
      }`}
    >
      <span className="inline-flex items-center rounded-full border border-border bg-teal-200 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {lang === 'he' ? 'PDF משולב' : 'Combined PDF'}
      </span>
      <Button type="button" size="sm" onClick={onOpen} className="bg-primary hover:bg-primary text-primary-foreground">
        <ExternalLink className="w-4 h-4" />
        {lang === 'he' ? 'פתח' : 'Open'}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDownload} className="border-border text-primary hover:bg-teal-200">
        <Download className="w-4 h-4" />
        {lang === 'he' ? 'הורד' : 'Download'}
      </Button>
    </div>
  );
}
