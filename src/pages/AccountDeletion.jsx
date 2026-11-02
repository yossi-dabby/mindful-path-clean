import BotanicalAccent from '@/components/brand/BotanicalAccent';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const SUPPORT_EMAIL='support@mindful-path.app';
const subject={partial:'Mindful Path partial data deletion request',account:'Mindful Path account deletion request'};
function Section({title,children,id}) {return <section id={id} className="scroll-mt-6"><h2 className="text-xl font-bold">{title}</h2><div className="mt-3 space-y-3 leading-7 text-muted-foreground">{children}</div></section>;}
function PartialDataDeletion(){const {t}=useTranslation();return <Section id="delete-data" title={t('stage6.selected_data_title')}>
  <p>{t('stage6.selected_data_intro')}</p><ol className="list-decimal space-y-2 ps-6">{['sign_in_step','find_record_step','item_delete_step'].map(key=><li key={key}>{t(`stage6.${key}`)}</li>)}</ol>
  <p>{t('stage6.selected_data_result')}</p><p>{t('stage6.partial_email',{email:SUPPORT_EMAIL})} <a className="underline text-primary [overflow-wrap:anywhere]" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject.partial)}`}>{SUPPORT_EMAIL}</a></p>
</Section>;}
export default function AccountDeletion({defaultSection='account'}){
 const {t,i18n}=useTranslation();const isData=defaultSection==='data';
 return <main dir={i18n.dir()} className="garden-public-background min-h-dvh px-4 py-8 text-foreground sm:px-6 sm:py-12"><article className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-lg">
  <header className="border-b border-border bg-secondary/35 px-5 py-7 sm:px-9">
   <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true"/>{t('stage6.back_app')}</Link>
   <div className="flex flex-col sm:flex-row items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Trash2 className="h-6 w-6" aria-hidden="true"/></span><div className="min-w-0 flex-1"><p className="mb-1 text-sm font-semibold text-primary">Mindful Path</p><div className="botanical-title-row"><h1 className="text-3xl font-bold sm:text-4xl">{t(`stage6.${isData?'data_delete_title':'account_delete_title'}`)}</h1><BotanicalAccent variant="leaves" className="botanical-title-art"/></div></div></div>
   <p className="mt-6 leading-7 text-muted-foreground">{t(`stage6.${isData?'data_delete_intro':'account_delete_intro'}`)}</p>
  </header>
  <div className="space-y-8 px-5 py-8 sm:px-9">
   {!isData&&<Section id="delete-account" title={t('stage6.delete_from_app')}><ol className="list-decimal space-y-2 ps-6">{['sign_in_step','settings_account_step','delete_account_step','confirm_delete_step'].map(key=><li key={key}>{t(`stage6.${key}`)}</li>)}</ol></Section>}
   <PartialDataDeletion/>
   {!isData&&<><Section title={t('stage6.request_delete')}><p>{t('stage6.account_email',{email:SUPPORT_EMAIL})} <a className="text-primary underline [overflow-wrap:anywhere]" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject.account)}`}>{SUPPORT_EMAIL}</a></p></Section>
    <Section title={t('stage6.what_deleted')}><ul className="list-disc space-y-2 ps-6">{['deleted_profile','deleted_records','deleted_preferences'].map(key=><li key={key}>{t(`stage6.${key}`)}</li>)}</ul></Section>
    <Section title={t('stage6.limited_retention')}><p>{t('stage6.retention_body')}</p></Section></>}
   <aside className="flex gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm leading-6"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true"/><p>{t(`stage6.${isData?'data_keeps_account':'uninstall_note'}`)}</p></aside>
  </div>
  <footer className="flex flex-wrap gap-3 border-t border-border bg-card px-5 py-6 text-sm sm:px-9">
   <Link className="inline-flex min-h-11 items-center px-2 text-primary underline" to="/privacy">{t('stage6.privacy')}</Link>
   <Link className="inline-flex min-h-11 items-center px-2 text-primary underline" to={isData?'/account-deletion':'/data-deletion'}>{t(`stage6.${isData?'all_data_link':'data_delete_title'}`)}</Link>
   <Link className="inline-flex min-h-11 items-center px-2 text-primary underline" to="/contact">{t('stage6.contact')}</Link>
   <a className="inline-flex min-h-11 items-center px-2 text-primary underline [overflow-wrap:anywhere]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  </footer>
 </article></main>;
}
