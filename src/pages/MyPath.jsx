import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import BotanicalAccent from '@/components/brand/BotanicalAccent';

export default function MyPath() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const Arrow = isRtl ? ({ className }) => <ChevronRight className={cn(className, 'rotate-180')} /> : ChevronRight;
  const items = [
    { label: t('my_path.goals'), description: t('botanical.goals'), path: 'Goals', art: 'sprout' },
    { label: t('my_path.progress'), description: t('botanical.progress'), path: 'Progress', art: 'progress' },
    { label: t('my_path.starter'), description: t('botanical.starter'), path: 'StarterPath', art: 'route' },
  ];

  return <main className="page-container mx-auto min-h-[100dvh] max-w-5xl px-4 pb-28 pt-6" dir={isRtl ? 'rtl' : 'ltr'}>
    <header className="botanical-hero rounded-[32px] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-md)]">
      <BotanicalAccent variant="leaves" className="botanical-hero-art" />
      <div className="botanical-hero-copy">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('daily_path.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">{t('my_path.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('my_path.subtitle')}</p>
      </div>
    </header>
    <section className="botanical-navigation-grid mt-5 grid gap-3 md:grid-cols-3">
      {items.map(({ label, description, path, art }) => <Link key={path} to={createPageUrl(path)} className="group">
        <Card className="botanical-navigation-card flex flex-col rounded-[26px] border-border bg-gradient-to-br from-white to-teal-50/60 p-5 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-border group-hover:shadow-md">
          <BotanicalAccent variant={art} className="botanical-card-art" />
          <span className="mt-4 font-bold text-foreground">{label}</span>
          <span className="botanical-card-description">{description}</span>
          <span className="botanical-open">{t('botanical.open')}<Arrow className="h-4 w-4" /></span>
        </Card>
      </Link>)}
    </section>
  </main>;
}
