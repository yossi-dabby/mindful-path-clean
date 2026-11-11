import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountAccessPanel() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const run = async (action) => {
    setBusy(true); setError(false);
    const lookupEmail = action === 'lookup' ? email.trim().toLowerCase() : account.email;
    try {
      const { data } = await base44.functions.invoke('accountAccess', {
        action, email: lookupEmail, ...(action === 'lookup' ? {} : { user_id: account.user_id }),
      });
      if (data?.schema_version !== 1 || !data?.user_id || data?.email?.toLowerCase() !== lookupEmail ||
          typeof data.forms_review_allowed !== 'boolean') throw new Error('Invalid response');
      setAccount(data);
    } catch { setAccount(null); setError(true); }
    finally { setBusy(false); }
  };
  return <Card data-testid="account-access-admin">
    <CardHeader><CardTitle>{t('account_access.admin_title')}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">{t('account_access.admin_notice')}</p>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); run('lookup'); }}>
        <label htmlFor="access-email">{t('account_access.email')}</label>
        <Input id="access-email" type="email" dir="ltr" required disabled={busy} value={email}
          onChange={event => { setEmail(event.target.value); setAccount(null); setError(false); }} />
        <Button disabled={busy} type="submit">{t('account_access.lookup')}</Button>
      </form>
      {error && <p role="alert">{t('account_access.admin_error')}</p>}
      {account && <div className="space-y-3" role="status">
        <p dir="ltr" className="break-all">{account.email}</p>
        <p>{t(`account_access.${account.adult_status}`)}</p>
        <p>{t(account.forms_review_allowed ? 'account_access.granted' : 'account_access.not_granted')}</p>
        {account.administrator ? <p>{t('account_access.admin_role')}</p> : <div className="flex flex-wrap gap-3">
          <Button disabled={busy || !account.eligible || account.forms_review_allowed} onClick={() => run('grant_forms')}>{t('account_access.grant')}</Button>
          <Button variant="outline" disabled={busy || !account.forms_review_allowed} onClick={() => run('revoke_forms')}>{t('account_access.revoke')}</Button>
        </div>}
      </div>}
    </CardContent>
  </Card>;
}
