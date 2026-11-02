import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results;
  }
  return [];
}

function timestampToIso(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return undefined;
  const milliseconds = value * 1000;
  if (!Number.isSafeInteger(milliseconds)) return undefined;
  return new Date(milliseconds).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecret) {
    return Response.json({ error: 'Web billing is not configured.' }, { status: 503 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return Response.json({ error: 'Invalid checkout session.' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId = session.client_reference_id || session.metadata?.user_id;
    if (sessionUserId !== user.id || session.metadata?.plan_id !== 'premium_monthly') {
      return Response.json({ error: 'Checkout session does not belong to this user.' }, { status: 403 });
    }
    if (session.status !== 'complete' || typeof session.subscription !== 'string') {
      return Response.json({ active: false, status: 'pending' }, { status: 202 });
    }

    const stripeSubscription: any = await stripe.subscriptions.retrieve(session.subscription);
    const isActive = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
    const status = stripeSubscription.status === 'trialing'
      ? 'trial'
      : isActive
        ? 'active'
        : stripeSubscription.status === 'past_due'
          ? 'past_due'
          : stripeSubscription.status === 'canceled'
            ? 'cancelled'
            : 'expired';
    const firstItem = stripeSubscription.items?.data?.[0];

    const data = {
      owner_user_id: user.id,
      plan_type: isActive ? 'premium' : 'free',
      status,
      entitlement_active: isActive,
      billing_provider: 'stripe',
      store: 'web',
      product_id: firstItem?.price?.id || undefined,
      stripe_customer_id: typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id,
      stripe_subscription_id: stripeSubscription.id,
      current_period_start: timestampToIso(stripeSubscription.current_period_start),
      current_period_end: timestampToIso(stripeSubscription.current_period_end),
      trial_end: timestampToIso(stripeSubscription.trial_end),
      cancelled_at: timestampToIso(stripeSubscription.canceled_at),
      last_verified_at: new Date().toISOString(),
      will_renew: !stripeSubscription.cancel_at_period_end && isActive,
      environment: stripeSubscription.livemode ? 'production' : 'sandbox',
    };

    const owned = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ owner_user_id: user.id }),
    );
    const legacy = owned.length === 0
      ? asRows(await base44.asServiceRole.entities.Subscription.filter({ created_by: user.email }))
      : [];
    const existing = owned[0] || legacy[0];

    if (existing) {
      await base44.asServiceRole.entities.Subscription.update(existing.id, data);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        ...data,
        created_by: user.email,
      });
    }

    return Response.json({
      active: isActive,
      status,
      planType: data.plan_type,
      verifiedAt: data.last_verified_at,
    });
  } catch (error) {
    console.error(
      '[confirmStripeCheckout] Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Unable to confirm checkout.' }, { status: 500 });
  }
});
