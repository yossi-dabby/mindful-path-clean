import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const PLAN_ID = 'premium_monthly';
const EXPECTED_AMOUNT = 999;
const EXPECTED_CURRENCY = 'usd';
const EXPECTED_INTERVAL = 'month';

const APPROVED_CHECKOUT_ORIGINS: ReadonlySet<string> = new Set([
  'https://app.mindful-path.me',
  'https://mindful-path-75aeaf7d.base44.app',
]);

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results;
  }
  return [];
}

function isApprovedRedirectUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return false;

  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      APPROVED_CHECKOUT_ORIGINS.has(parsed.origin)
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  if (Deno.env.get('WEB_BILLING_ENABLED') !== 'true') {
    return Response.json({ error: 'Subscriptions are not available yet.' }, { status: 503 });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const priceId = Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID');
  if (!stripeSecret || !priceId) {
    return Response.json({ error: 'Web billing is not configured.' }, { status: 503 });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 8_192) {
    return Response.json({ error: 'Request too large' }, { status: 413 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, successUrl, cancelUrl } = await req.json();
    if (planId !== PLAN_ID) {
      return Response.json({ error: 'Invalid or unsupported plan.' }, { status: 400 });
    }
    if (!isApprovedRedirectUrl(successUrl) || !isApprovedRedirectUrl(cancelUrl)) {
      return Response.json({ error: 'Invalid checkout return URL.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });
    const price = await stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.type !== 'recurring' ||
      price.unit_amount !== EXPECTED_AMOUNT ||
      price.currency !== EXPECTED_CURRENCY ||
      price.recurring?.interval !== EXPECTED_INTERVAL
    ) {
      console.error('[createCheckoutSession] Configured Stripe price does not match the approved $9.99 monthly plan.');
      return Response.json({ error: 'The billing plan is not configured correctly.' }, { status: 503 });
    }

    const byOwner = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ owner_user_id: user.id }),
    );
    const legacy = byOwner.length === 0
      ? asRows(await base44.asServiceRole.entities.Subscription.filter({ created_by: user.email }))
      : [];
    const subscription = byOwner[0] || legacy[0];

    if (
      subscription?.entitlement_active === true &&
      ['active', 'trial', 'grace_period'].includes(subscription.status)
    ) {
      return Response.json({ error: 'Premium is already active.' }, { status: 409 });
    }

    let customerId = subscription?.stripe_customer_id;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) customerId = undefined;
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          app_id: Deno.env.get('BASE44_APP_ID') || '',
        },
      });
      customerId = customer.id;
    }

    const baseSubscriptionData = {
      owner_user_id: user.id,
      plan_type: 'free',
      status: 'expired',
      entitlement_active: false,
      billing_provider: 'stripe',
      store: 'web',
      stripe_customer_id: customerId,
      last_verified_at: new Date().toISOString(),
      environment: stripeSecret.startsWith('sk_live_') ? 'production' : 'sandbox',
    };

    if (subscription) {
      await base44.asServiceRole.entities.Subscription.update(subscription.id, baseSubscriptionData);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        ...baseSubscriptionData,
        created_by: user.email,
      });
    }

    const parsedSuccessUrl = new URL(successUrl);
    parsedSuccessUrl.hash = '';
    const checkoutSuccessUrl = `${parsedSuccessUrl.toString()}${parsedSuccessUrl.search ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: checkoutSuccessUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan_id: PLAN_ID,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan_id: PLAN_ID,
        },
      },
    });

    if (!session.url) {
      return Response.json({ error: 'Unable to create checkout session.' }, { status: 502 });
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error(
      '[createCheckoutSession] Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Unable to create checkout session.' }, { status: 500 });
  }
});
