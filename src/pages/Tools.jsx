import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpenCheck, ChevronRight, Dumbbell, Gamepad2, Library, PlaySquare, Route } from 'lucide-react';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Tools() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const Arrow = isRtl ? ({ className }) => <ChevronRight className={cn(className, 'rotate-180')} /> : ChevronRight;
  const items = [
  { key: 'exercises', path: 'Exercises', Icon: Dumbbell, art: 'progress' },
  { key: 'forms', path: 'TherapeuticForms', Icon: BookOpenCheck, art: 'sprout' },
  { key: 'videos', path: 'Videos', Icon: PlaySquare, art: 'leaves' },
  { key: 'games', path: 'ExperientialGames', Icon: Gamepad2, art: 'sprout' },
  { key: 'journeys', path: 'Journeys', Icon: Route, art: 'route' },
  { key: 'resources', path: 'Resources', Icon: Library, art: 'leaves' }];


  return (
    <main className="page-container mx-auto min-h-[100dvh] max-w-5xl px-4 pb-28 pt-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="botanical-hero rounded-[32px] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-md)]">
        <BotanicalAccent variant="leaves" className="botanical-hero-art" />
        <div className="botanical-hero-copy">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('daily_path.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{t('tools_hub.title')}</h1>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('tools_hub.subtitle')}</p>
        </div>
      </header>
      <section className="botanical-tools-grid mt-5" aria-label={t('tools_hub.title')}>
        {items.map(({ key, path, Icon, art }) =>
        <Link key={path} to={createPageUrl(path)} className="botanical-tool-link group" aria-labelledby={`tool-${key}`}>
            <Card className="botanical-tool-card" data-tool={key}>
              <span className="botanical-tool-art" aria-hidden="true">
                <BotanicalAccent variant={art} />
              </span>
              <div className="botanical-tool-heading">
                <span className="botanical-tool-icon" aria-hidden="true"><Icon strokeWidth={1.4} /></span>
                <h2 id={`tool-${key}`} className="botanical-tool-title">{t(`tools_hub.${key}`)}</h2>
              </div>
              <p className="botanical-tool-description">{t(`tools_hub.descriptions.${key}`)}</p>
              <span className="botanical-open">{t('tools_hub.open')}<Arrow className="h-4 w-4" /></span>
            </Card>
          </Link>
        )}
      </section>
    </main>);

}