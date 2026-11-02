export const PREMIUM_ENTITLEMENT_ID = 'premium';

export const PREMIUM_MONTHLY_PLAN = Object.freeze({
  id: 'premium_monthly',
  planType: 'premium',
  amount: 9.99,
  currency: 'USD',
  billingPeriod: 'month',
  revenueCatPackageIdentifier: '$rc_monthly',
  appleProductId: 'mindful_path_premium_monthly',
  googleProductId: 'mindful_path_premium_monthly'
});

export const SUBSCRIPTIONS_ENABLED =
  import.meta.env.VITE_SUBSCRIPTIONS_ENABLED === 'true';

export const WEB_BILLING_ENABLED =
  SUBSCRIPTIONS_ENABLED &&
  import.meta.env.VITE_WEB_BILLING_ENABLED === 'true';

export const NATIVE_BILLING_ENABLED =
  SUBSCRIPTIONS_ENABLED &&
  import.meta.env.VITE_NATIVE_BILLING_ENABLED === 'true';

export function formatMonthlyPrice(locale = 'en') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: PREMIUM_MONTHLY_PLAN.currency,
      minimumFractionDigits: 2
    }).format(PREMIUM_MONTHLY_PLAN.amount);
  } catch {
    return '$9.99';
  }
}
