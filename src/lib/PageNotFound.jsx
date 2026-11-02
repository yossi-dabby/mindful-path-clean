import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const {t,i18n}=useTranslation();
  const {pathname}=useLocation();
  const {data:user}=useQuery({queryKey:['not-found-user'],queryFn:()=>base44.auth.me(),retry:false});
  return <main dir={i18n.dir()} className="min-h-dvh flex items-center justify-center p-6 garden-public-background text-foreground">
    <div className="garden-surface max-w-md w-full min-w-0 p-6 sm:p-8 text-center space-y-6">
      <h1 className="text-7xl font-light">404</h1>
      <h2 className="text-2xl font-medium">{t('stage6.not_found')}</h2>
      <p className="leading-relaxed [overflow-wrap:anywhere]">{t('stage6.not_found_body',{path:pathname})}</p>
      {user?.role==='admin' && <aside className="rounded-xl border border-border bg-secondary p-4 text-start"><h3 className="font-medium">{t('stage6.admin_note')}</h3><p className="mt-2 text-sm">{t('stage6.admin_note_body')}</p></aside>}
      <Button asChild><Link to="/">{t('stage6.home')}</Link></Button>
    </div>
  </main>;
}
