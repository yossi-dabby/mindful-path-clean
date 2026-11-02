import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, HeartHandshake, Phone, ShieldAlert, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeAppLocale } from '@/components/i18n/appLocale';
import { getHumanSupportCopy, getHumanSupportRegionOptions, getHumanSupportResources } from '@/lib/humanSupportDirectory';
import { readStoredEmergencyRegion, writeStoredEmergencyRegion } from '@/lib/emergencyResources';

function ResourceCard({ resource, labels }) {
  return <article className="rounded-2xl border border-slate-200 bg-[hsl(var(--card)/0.97)] p-4 shadow-sm" data-testid={`human-support-${resource.id}`}>
    <h3 className="font-semibold text-foreground">{resource.name}</h3>
    {resource.detail && <p className="mt-1 text-sm leading-6 text-muted-foreground">{resource.detail}</p>}
    <p className="mt-1 text-xs text-muted-foreground">{resource.availability === 'always' ? labels.always : labels.checkHours}</p>
    <div className="mt-3 flex flex-wrap gap-2">{resource.channels.map((channel, index) => <a key={`${resource.id}-${channel.type}-${index}`} href={channel.href} target={channel.type === 'web' || channel.type === 'whatsapp' ? '_blank' : undefined} rel={channel.type === 'web' || channel.type === 'whatsapp' ? 'noreferrer' : undefined} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{channel.type === 'phone' ? <Phone className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}{channel.label}</a>)}</div>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{labels.verified}: {resource.lastVerifiedAt}</span><a className="inline-flex min-h-11 items-center underline" href={resource.sourceUrl} target="_blank" rel="noreferrer">{labels.source}</a></div>
  </article>;
}

function SupportSection({ icon: Icon, title, text, tone, resources, labels }) {
  if (!resources.length) return null;
  return <section className={`rounded-3xl border p-5 md:p-6 ${tone}`}><div className="flex items-start gap-3"><span className="rounded-2xl bg-[hsl(var(--card)/0.97)] p-2.5"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm leading-6">{text}</p></div></div><div className="mt-4 grid gap-3">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} labels={labels} />)}</div></section>;
}

export default function Contact() {
  const { i18n } = useTranslation();
  const language = normalizeAppLocale(i18n.resolvedLanguage || i18n.language, 'en');
  const labels = getHumanSupportCopy(language);
  const regionOptions = getHumanSupportRegionOptions(language);
  const [region, setRegion] = React.useState(() => readStoredEmergencyRegion());
  const handleRegionChange = (event) => setRegion(writeStoredEmergencyRegion(event.target.value));

  return <div className="garden-public-background min-h-dvh py-6"><main className="garden-public-document mx-auto max-w-3xl px-4 py-8 text-foreground md:px-6 md:py-12" dir={language === 'he' ? 'rtl' : 'ltr'} data-testid="human-support-page">
    <div className="botanical-title-row"><h1 className="text-3xl font-bold text-foreground">{labels.title}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div><p className="mt-3 leading-7 text-muted-foreground">{labels.intro}</p>
    <section className="mt-6 rounded-2xl border border-border bg-secondary/70 p-4"><label className="block text-sm font-semibold text-primary" htmlFor="human-support-region">{labels.countryLabel}</label><select id="human-support-region" data-testid="human-support-region" value={region || ''} onChange={handleRegionChange} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-[hsl(var(--card)/0.97)] px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="" disabled>{labels.countryPrompt}</option>{regionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="mt-2 text-xs leading-5 text-primary">{labels.privacyNote}</p></section>
    {!region ? <p role="status" className="mt-6 rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">{labels.selectionRequired}</p> : <div className="mt-7 space-y-5"><SupportSection icon={ShieldAlert} title={labels.immediateTitle} text={labels.immediateText} tone="border-red-200 bg-red-50 text-red-950" resources={getHumanSupportResources(region, 'immediate')} labels={labels} /><SupportSection icon={HeartHandshake} title={labels.urgentTitle} text={labels.urgentText} tone="border-amber-200 bg-amber-50 text-amber-950" resources={getHumanSupportResources(region, 'urgent_support')} labels={labels} /><SupportSection icon={Stethoscope} title={labels.otherTitle} text={labels.otherText} tone="border-border bg-secondary/70 text-primary" resources={getHumanSupportResources(region, 'non_emergency')} labels={labels} /></div>}
    <aside className="mt-6 rounded-2xl border border-border bg-secondary p-4 text-sm leading-6 text-muted-foreground">{labels.disclaimer}</aside><p className="mt-6 text-sm">{labels.productSupport} <a className="inline-flex min-h-11 items-center underline" href="mailto:support@mindful-path.app">support@mindful-path.app</a></p><nav className="mt-6 flex flex-wrap gap-4 text-sm"><Link className="inline-flex min-h-11 items-center underline" to="/about">{labels.about}</Link><Link className="inline-flex min-h-11 items-center underline" to="/privacy">{labels.privacy}</Link><Link className="inline-flex min-h-11 items-center underline" to="/terms">{labels.terms}</Link></nav>
  </main></div>;
}

