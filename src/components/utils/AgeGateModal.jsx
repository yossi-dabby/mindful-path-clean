import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PremiumDialog from '@/components/ui/PremiumDialog';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AgeGateModal({ onConfirm, onDecline }) {
  const { t } = useTranslation();
  const titleRef = useRef(null);
  return (
    <PremiumDialog role="dialog" aria-modal="true" label={t('age_gate.title')} onClose={() => {}}
      aria-labelledby="age-gate-title" aria-describedby="age-gate-description"
      onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
      className="age-gate-overlay fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="age-gate-card max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[28px] border border-border bg-card text-foreground shadow-2xl">
        <div className="p-5 sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-primary"><ShieldCheck className="h-7 w-7" aria-hidden="true" /></div>
          <h2 ref={titleRef} tabIndex={-1} id="age-gate-title" className="mb-3 text-center text-xl font-semibold outline-none sm:text-2xl">{t('age_gate.title')}</h2>
          <p id="age-gate-description" className="mb-4 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">{t('age_gate.message')}</p>
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-950/35 sm:text-sm">
            <p className="mb-2 font-semibold text-amber-950 dark:text-amber-100">{t('age_gate.teen_support_heading')}</p>
            <ul className="space-y-1 text-amber-900 dark:text-amber-200">
              <li>{t('age_gate.teen_support.counselor')}</li><li>{t('age_gate.teen_support.teen_line')}</li><li>{t('age_gate.teen_support.crisis_text_line')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <Button onClick={onConfirm} className="h-auto min-h-12 w-full whitespace-normal py-3 text-base">{t('age_gate.confirm_button')}</Button>
            <Button onClick={onDecline} variant="outline" className="h-auto min-h-12 w-full whitespace-normal py-3 text-base">{t('age_gate.decline_button')}</Button>
          </div>
        </div>
      </Card>
    </PremiumDialog>
  );
}
