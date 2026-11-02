import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, getLegalCopy } from './legalContent';

export default function LegalDocumentPage({ document }) {
  const { i18n } = useTranslation();
  const copy = getLegalCopy(i18n.resolvedLanguage || i18n.language);
  const content = copy[document];
  const isRtl = copy.direction === 'rtl';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <main
      dir={copy.direction}
      lang={copy.language}
      className="garden-public-background min-h-dvh px-4 py-8 text-foreground sm:px-6 sm:py-12"
    >
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_24px_70px_rgba(15,118,110,0.12)] backdrop-blur-xl">
        <header className="border-b border-border bg-secondary/35 px-5 py-7 sm:px-9 sm:py-9">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-primary hover:bg-secondary/70 focus:outline-none focus:ring-2 focus:ring-ring">
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {copy.common.back}
          </Link>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-teal-600/20">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-semibold tracking-wide text-primary">{copy.common.appName}</p>
              <div className="botanical-title-row"><h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{content.title}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <p className="mt-3 text-sm text-muted-foreground">
                {copy.common.effectiveDateLabel}: <time dateTime={LEGAL_EFFECTIVE_DATE}>{LEGAL_EFFECTIVE_DATE}</time>
              </p>
            </div>
          </div>
          <p className="mt-6 text-base leading-7 text-muted-foreground">{content.intro}</p>
        </header>

        <div className="space-y-8 px-5 py-8 sm:px-9 sm:py-10">
          {content.sections.map((section) => (
            <section key={section.title} className="scroll-mt-6">
              <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">{paragraph}</p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 ps-6 leading-7 text-muted-foreground">
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="flex flex-wrap gap-3 border-t border-border bg-card px-5 py-6 text-sm sm:px-9">
          <Link className="min-h-11 inline-flex items-center [overflow-wrap:anywhere] rounded-lg px-2 py-2 font-medium text-primary underline-offset-4 hover:underline" to={document === 'privacy' ? '/terms' : '/privacy'}>
            {document === 'privacy' ? copy.common.terms : copy.common.privacy}
          </Link>
          <Link className="min-h-11 inline-flex items-center [overflow-wrap:anywhere] rounded-lg px-2 py-2 font-medium text-primary underline-offset-4 hover:underline" to="/contact">
            {copy.common.contact}
          </Link>
          <a className="min-h-11 inline-flex items-center [overflow-wrap:anywhere] rounded-lg px-2 py-2 font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
        </footer>
      </article>
    </main>
  );
}
