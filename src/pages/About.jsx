import BotanicalAccent from '@/components/brand/BotanicalAccent';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function About() {
  const {t,i18n}=useTranslation();
  return <div dir={i18n.dir()} className="garden-public-background min-h-dvh py-6"><main className="garden-public-document mx-auto max-w-3xl px-6 py-12 text-foreground">
    <div className="botanical-title-row"><h1 className="mb-4 text-3xl font-semibold">{t('stage6.about_title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
    {['about_intro','about_routines','about_limits'].map(key=><p key={key} className="mb-4 leading-7">{t(`stage6.${key}`)}</p>)}
    <nav className="mt-8 flex flex-wrap gap-4 text-sm">{['privacy','terms','contact'].map(key=><Link key={key} className="inline-flex min-h-11 items-center underline" to={`/${key}`}>{t(`stage6.${key}`)}</Link>)}</nav>
  </main></div>;
}
