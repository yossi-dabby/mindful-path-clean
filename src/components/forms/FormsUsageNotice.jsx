import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function FormsUsageNotice() {
  const { t } = useTranslation();
  return (
    <aside role="note" aria-label={t('therapeutic_forms.usage_notice.label')} data-testid="forms-usage-notice"
      className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/95 p-4 text-amber-950">
      <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-sm leading-7">
        <p><strong className="font-bold">{t('therapeutic_forms.usage_notice.text')}</strong></p>
        <Link to="/terms#forms-terms" className="mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {t('therapeutic_forms.usage_notice.link')}
        </Link>
      </div>
    </aside>
  );
}
