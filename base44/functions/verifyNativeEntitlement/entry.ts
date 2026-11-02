import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') || 'premium';
const EXPECTED_PRODUCT_IDS = new Set([
  'mindful_path_premium_monthly',
  ...(Deno.env.get('REVENUECAT_ALLOWED_PRODUCT_IDS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
]);

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results;
  }
  return [];
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStore(value: unknown): string {
  const store = String(value || '').toLowerCase();
  if (store.includes('app_store') || store.includes('mac_app_store')) return 'app_store';
  if (store.includes('play_store')) return 'play_store';
  if (store.includes('promotional')) return 'promotional';
  return 'unknown';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4_096) {
    return Response.json({ error: 'Request too large' }, { status: 413 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!secret) {
      return Response.json({ error: 'Native billing verification is not configured.' }, { status: 503 });
    }

    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error('[verifyNativeEntitlement] RevenueCat verification failed:', response.status);
      return Response.json({ error: 'Unable to verify purchase.' }, { status: 502 });
    }

    const payload = await response.json();
    const subscriber = payload?.subscriber || {};
    const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID] || null;
    const expiresAt = parseDate(entitlement?.expires_date);
    const productId = typeof entitlement?.product_identifier === 'string'
      ? entitlement.product_identifier
      : '';
    const productIsAllowed = Boolean(productId && EXPECTED_PRODUCT_IDS.has(productId));
    const entitlementActive = Boolean(
      entitlement &&
      productIsAllowed &&
      (!expiresAt || expiresAt.getTime() > Date.now())
    );
    const productSubscription = productId
      ? subscriber?.subscriptions?.[productId] || {}
      : {};
    const billingIssue = Boolean(productSubscription?.billing_issues_detected_at);
    const unsubscribed = Boolean(productSubscription?.unsubscribe_detected_at);

    let status = 'expired';
    if (entitlementActive && billingIssue) status = 'grace_period';
    else if (entitlementActive) status = 'active';
    else if (unsubscribed) status = 'cancelled';

    const subscriptionData = {
      owner_user_id: user.id,
      plan_type: entitlementActive ? 'premium' : 'free',
      status,
      entitlement_active: entitlementActive,
      billing_provider: 'revenuecat',
      store: normalizeStore(productSubscription?.store),
      product_id: productId || undefined,
      entitlement_id: ENTITLEMENT_ID,
      revenuecat_app_user_id: user.id,
      latest_transaction_id: productSubscription?.original_transaction_id || undefined,
      current_period_start: parseDate(productSubscription?.purchase_date)?.toISOString() || undefined,
      current_period_end: expiresAt?.toISOString() || undefined,
      cancelled_at: parseDate(productSubscription?.unsubscribe_detected_at)?.toISOString() || undefined,
      last_verified_at: new Date().toISOString(),
      will_renew: entitlementActive && !unsubscribed,
      environment: productSubscription?.is_sandbox === true
        ? 'sandbox'
        : productSubscription?.is_sandbox === false
          ? 'production'
          : 'unknown',
    };

    const owned = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ owner_user_id: user.id }),
    );
    const legacy = owned.length === 0
      ? asRows(await base44.asServiceRole.entities.Subscription.filter({ created_by: user.email }))
      : [];
    const existing = owned[0] || legacy[0];

    if (existing) {
      await base44.asServiceRole.entities.Subscription.update(existing.id, subscriptionData);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        ...subscriptionData,
        created_by: user.email,
      });
    }

    return Response.json({
      active: entitlementActive,
      planType: subscriptionData.plan_type,
      status,
      productId: productId || null,
      expiresAt: expiresAt?.toISOString() || null,
      verifiedAt: subscriptionData.last_verified_at,
    });
  } catch (error) {
    console.error(
      '[verifyNativeEntitlement] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Unable to verify purchase.' }, { status: 500 });
  }
});
