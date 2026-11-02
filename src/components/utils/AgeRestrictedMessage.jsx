import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function AgeRestrictedMessage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 text-center shadow-[var(--shadow-md)] sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldAlert className="h-8 w-8" aria-hidden="true" /></div>
        <h1 className="mb-3 text-2xl font-semibold text-foreground">{t('chat_stage2.restricted_title')}</h1>
        <p className="mb-6 text-base leading-relaxed text-muted-foreground">{t('chat_stage2.restricted_description')}</p>
        <Button asChild className="h-auto min-h-11 whitespace-normal"><Link to="/">{t('chat_stage2.back_home')}</Link></Button>
      </Card>
    </div>
  );
}
