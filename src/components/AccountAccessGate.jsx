import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';
import { AGE_POLICY_VERSION, accountAccessKey, requestAccountAccess, useAccountAccess } from '@/lib/accountAccess';
import AgeGateModal from '@/components/utils/AgeGateModal';
import { Button } from '@/components/ui/button';
import { publicLegalUrl } from '@/lib/publicLegalUrls';

export default function AccountAccessGate({ children }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const query = useAccountAccess();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const attest = async (adult) => {
    if (saving) return;
    setSaving(true); setSaveError(false);
    try {
      const data = await requestAccountAccess({ action: 'attest', adult, policy_version: AGE_POLICY_VERSION, language }, user.id);
      queryClient.setQueryData(accountAccessKey(user.id), data);
    } catch {
      setSaveError(true);
      // The server may have committed the declaration before the connection
      // failed. Re-read instead of assuming that nothing was saved.
      await query.refetch();
    } finally { setSaving(false); }
  };

  // A transient background refresh failure must not erase an adult's in-flight
  // draft/recording. Initial entry is fail-closed; protected backend operations
  // independently check the current server record on every request.
  if (query.data?.eligible && query.data.user_id === user?.id) return children;
  const declined = query.data?.adult_status === 'declined';
  const accountLinks = (<div className="flex flex-wrap gap-4 text-sm">
          <a href={publicLegalUrl('/privacy', language)}>{t('account_access.privacy')}</a>
          <a href={publicLegalUrl('/contact', language)}>{t('account_access.support')}</a>
          <button type="button" onClick={() => logout()}>{t('account_access.sign_out')}</button>
        </div>);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground" dir={language === 'he' ? 'rtl' : 'ltr'} data-testid="account-access-gate">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{t(declined ? 'chat_stage2.restricted_title' : 'account_access.title')}</h1>
        {declined ? <p>{t('account_access.declined')}</p> : query.isError
          ? <><p role="alert">{t('account_access.load_error')}</p><Button onClick={() => query.refetch()}>{t('account_access.retry')}</Button></>
          : <p role="status">{t('account_access.loading')}</p>}
        {accountLinks}
      </section>
      {query.data?.adult_status === 'pending' && !query.isError && <AgeGateModal
        onConfirm={() => attest(true)} onDecline={() => attest(false)} busy={saving}
        error={saveError ? t('account_access.save_error') : ''} accountNotice={t('account_access.notice')} footer={accountLinks}
      />}
    </main>
  );
}
