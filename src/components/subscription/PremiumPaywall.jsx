import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock3, Crown, Loader2, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { getCurrentAppLocale } from '../i18n/appLocale.js';
import {
  SUBSCRIPTIONS_ENABLED,
  getSubscriptionReadinessCopy
} from './subscriptionReadiness.js';
import {
  getNativeBillingState,
  loadNativeMonthlyOffer,
  purchaseNativeMonthly,
  restoreNativePurchases
} from './nativePurchases.js';
import { isWebBillingAvailable, startWebMonthlyCheckout } from './webBilling.js';

export default function PremiumPaywall({ onClose, onSuccess }) {
  const { i18n } = useTranslation();
  const copy = getSubscriptionReadinessCopy(getCurrentAppLocale(i18n));
  const nativeState = useMemo(() => getNativeBillingState(), []);
  const [user, setUser] = useState(null);
  const [nativeOffer, setNativeOffer] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const purchaseAvailable =
    SUBSCRIPTIONS_ENABLED && (nativeState.configured || isWebBillingAvailable());
  const displayPrice = nativeOffer?.localizedPrice || copy.price;

  useEffect(() => {
    let active = true;

    async function prepareNativeOffer() {
      if (!nativeState.configured) return;
      try {
        const currentUser = await base44.auth.me();
        if (!active) return;
        setUser(currentUser);
        const offer = await loadNativeMonthlyOffer(currentUser);
        if (active) setNativeOffer(offer);
      } catch {
        if (active) setMessage(copy.unavailable);
      }
    }

    prepareNativeOffer();
    return () => {
      active = false;
    };
  }, [nativeState.configured, copy.unavailable]);

  async function handlePurchase() {
    setStatus('processing');
    setMessage('');
    try {
      if (nativeState.configured) {
        if (!nativeOffer?.package) throw new Error('NATIVE_OFFER_NOT_READY');
        await purchaseNativeMonthly(user, nativeOffer.package);
        setStatus('success');
        setMessage(copy.success);
        onSuccess?.();
        return;
      }

      await startWebMonthlyCheckout();
    } catch (error) {
      if (error?.userCancelled || error?.code === '1') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setMessage(copy.error);
    }
  }

  async function handleRestore() {
    setStatus('processing');
    setMessage('');
    try {
      const result = await restoreNativePurchases(user);
      if (result.restored && result.verified?.active) {
        setStatus('success');
        setMessage(copy.restored);
        onSuccess?.();
      } else {
        setStatus('idle');
        setMessage(copy.nothingToRestore);
      }
    } catch {
      setStatus('error');
      setMessage(copy.error);
    }
  }

  const isBusy = status === 'processing';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-dialog-title"
      data-testid="premium-paywall"
    >
      <Card className="relative my-auto w-full max-w-xl overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-amber-100 via-teal-50 to-emerald-100" aria-hidden="true" />
        <CardContent className="relative p-6 pt-8 sm:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute end-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border/70 bg-[hsl(var(--card)/0.97)] text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25">
              <Crown className="h-10 w-10" />
            </div>
            <h2 id="premium-dialog-title" className="text-2xl font-bold text-foreground sm:text-3xl">
              {copy.modalTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.modalBody}
            </p>

            <div className="mx-auto mt-6 max-w-sm rounded-3xl border border-amber-200 bg-amber-50/80 p-5">
              <div className="text-3xl font-black text-foreground" data-testid="premium-monthly-price">
                {displayPrice}
              </div>
              <div className="mt-1 text-sm font-semibold text-muted-foreground">{copy.perMonth}</div>
            </div>

            {message && (
              <div
                className={`mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold ${
                  status === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
                role="status"
              >
                {status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Clock3 className="h-4 w-4 shrink-0" />}
                {message}
              </div>
            )}

            {!purchaseAvailable && !message && (
              <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900" role="status">
                <Clock3 className="h-4 w-4 shrink-0" />
                {copy.unavailable}
              </div>
            )}

            {purchaseAvailable && status !== 'success' && (
              <div className="mt-6 space-y-3">
                <Button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isBusy || (nativeState.configured && !nativeOffer)}
                  className="min-h-[50px] w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white hover:from-amber-600 hover:to-orange-600"
                  data-testid="premium-purchase-button"
                >
                  {isBusy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Crown className="me-2 h-4 w-4" />}
                  {isBusy ? copy.processing : copy.purchase.replace('{price}', displayPrice)}
                </Button>
                {nativeState.configured && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={isBusy || !user}
                    className="min-h-[48px] w-full rounded-2xl border-border text-primary"
                    data-testid="premium-restore-button"
                   mobileLabelKey="refresh">
                    <RefreshCw className="me-2 h-4 w-4" />
                    {copy.restore}
                  </Button>
                )}
              </div>
            )}

            <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-muted-foreground">{copy.terms}</p>
            <Button type="button" onClick={onClose} variant="ghost" className="mt-4 min-h-[44px] w-full rounded-2xl text-muted-foreground">
              {copy.close}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
