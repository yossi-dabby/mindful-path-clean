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

async function secureEquals(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
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

async function isProcessed(base44: any, eventId: string) {
  const events = asRows(
    await base44.asServiceRole.entities.RevenueCatProcessedEvent.filter({
      revenuecat_event_id: eventId,
    }),
  );
  return events.length > 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const expectedAuthorization = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  const actualAuthorization = req.headers.get('authorization') || '';
  if (
    !expectedAuthorization ||
    !(await secureEquals(actualAuthorization, expectedAuthorization))
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 262_144) {
    return Response.json({ error: 'Request too large' }, { status: 413 });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const eventId = typeof event?.id === 'string' ? event.id : '';
    const eventType = typeof event?.type === 'string' ? event.type : '';
    const appUserId = typeof event?.app_user_id === 'string' ? event.app_user_id : '';

    if (!eventId || !eventType || !appUserId) {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    if (await isProcessed(base44, eventId)) {
      return Response.json({ received: true, duplicate: true });
    }

    const secret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    if (!secret) {
      return Response.json({ error: 'RevenueCat verification is not configured.' }, { status: 503 });
    }

    let user;
    try {
      user = await base44.asServiceRole.entities.User.get(appUserId);
    } catch {
      console.error('[revenueCatWebhook] Unknown Base44 user:', appUserId);
      return Response.json({ received: true, ignored: true });
    }

    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      console.error('[revenueCatWebhook] Subscriber verification failed:', response.status);
      return Response.json({ error: 'Verification failed' }, { status: 502 });
    }

    const payload = await response.json();
    const subscriber = payload?.subscriber || {};
    const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID] || null;
    const expiresAt = parseDate(entitlement?.expires_date);
    const productId = typeof entitlement?.product_identifier === 'string'
      ? entitlement.product_identifier
      : '';
    const productIsAllowed = Boolean(productId && EXPECTED_PRODUCT_IDS.has(productId));
    const active = Boolean(
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
    if (active && billingIssue) status = 'grace_period';
    else if (active) status = 'active';
    else if (unsubscribed) status = 'cancelled';

    const subscriptionData = {
      owner_user_id: appUserId,
      plan_type: active ? 'premium' : 'free',
      status,
      entitlement_active: active,
      billing_provider: 'revenuecat',
      store: normalizeStore(productSubscription?.store),
      product_id: productId || undefined,
      entitlement_id: ENTITLEMENT_ID,
      revenuecat_app_user_id: appUserId,
      latest_transaction_id: productSubscription?.original_transaction_id || undefined,
      current_period_start: parseDate(productSubscription?.purchase_date)?.toISOString() || undefined,
      current_period_end: expiresAt?.toISOString() || undefined,
      cancelled_at: parseDate(productSubscription?.unsubscribe_detected_at)?.toISOString() || undefined,
      last_verified_at: new Date().toISOString(),
      will_renew: active && !unsubscribed,
      environment: productSubscription?.is_sandbox === true
        ? 'sandbox'
        : productSubscription?.is_sandbox === false
          ? 'production'
          : 'unknown',
    };

    const owned = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ owner_user_id: appUserId }),
    );
    const legacy = owned.length === 0 && user?.email
      ? asRows(await base44.asServiceRole.entities.Subscription.filter({ created_by: user.email }))
      : [];
    const existing = owned[0] || legacy[0];

    if (existing) {
      await base44.asServiceRole.entities.Subscription.update(existing.id, subscriptionData);
    } else if (user?.email) {
      await base44.asServiceRole.entities.Subscription.create({
        ...subscriptionData,
        created_by: user.email,
      });
    } else {
      throw new Error('Verified Base44 user has no email');
    }

    await base44.asServiceRole.entities.RevenueCatProcessedEvent.create({
      revenuecat_event_id: eventId,
      event_type: eventType,
      app_user_id: appUserId,
      processed_at: new Date().toISOString(),
    });

    return Response.json({ received: true, active, status });
  } catch (error) {
    console.error(
      '[revenueCatWebhook] Failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Unable to process event.' }, { status: 500 });
  }
});
