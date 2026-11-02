import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BotanicalAccent from '@/components/brand/BotanicalAccent';
import { Button } from '@/components/ui/button';

export default function LibraryPageHeader({ title, subtitle, onBack, backLabel, children }) {
  const { t } = useTranslation();
  return (
    <header className="garden-responsive-heading mb-5 mt-6 rounded-[28px] border border-border/70 bg-card/95 p-5 text-foreground shadow-[var(--shadow-md)] sm:p-6" data-testid="library-page-header">
      {onBack && <Button type="button" variant="ghost" onClick={onBack} aria-label={backLabel || t('common.go_back_aria')} className="mb-3 h-auto max-w-full whitespace-normal text-start text-foreground"><ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" />{backLabel}</Button>}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="botanical-title-row"><h1 className="min-w-0 break-words text-2xl font-semibold text-foreground md:text-3xl">{title}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        {children && <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">{children}</div>}
      </div>
    </header>
  );
}
