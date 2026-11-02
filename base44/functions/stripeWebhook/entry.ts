import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).results)) {
    return (value as any).results;
  }
  return [];
}

const safeTimestampToISO = (timestamp: unknown): string | undefined => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0 || !Number.isSafeInteger(timestamp)) {
    return undefined;
  }
  const ms = timestamp * 1000;
  if (!Number.isSafeInteger(ms)) return undefined;
  return new Date(ms).toISOString();
};

const isEventAlreadyProcessed = async (base44: any, eventId: string): Promise<boolean> => {
  try {
    const existing = asRows(
      await base44.asServiceRole.entities.StripeProcessedEvent.filter({
        stripe_event_id: eventId,
      }),
    );
    return existing.length > 0;
  } catch {
    return false;
  }
};

const markEventAsProcessed = async (
  base44: any,
  eventId: string,
  eventType: string,
): Promise<void> => {
  try {
    await base44.asServiceRole.entities.StripeProcessedEvent.create({
      stripe_event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[stripeWebhook] Failed to record processed event:', eventId, error);
  }
};

function resolveStripeAccess(subscription: any) {
  const periodEnd = safeTimestampToISO(subscription.current_period_end);
  const periodEndMs = periodEnd ? new Date(periodEnd).getTime() : 0;
  const stillInsidePaidPeriod = periodEndMs > Date.now();

  if (subscription.status === 'active') return { status: 'active', active: true };
  if (subscription.status === 'trialing') return { status: 'trial', active: true };
  if (subscription.status === 'past_due' && stillInsidePaidPeriod) {
    return { status: 'grace_period', active: true };
  }
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    return { status: 'past_due', active: false };
  }
  if (subscription.status === 'paused') return { status: 'paused', active: false };
  if (subscription.status === 'canceled') return { status: 'cancelled', active: false };
  return { status: 'expired', active: false };
}

async function findSubscriptionRecord(base44: any, stripeSubscription: any) {
  const byStripeId = asRows(
    await base44.asServiceRole.entities.Subscription.filter({
      stripe_subscription_id: stripeSubscription.id,
    }),
  );
  if (byStripeId[0]) return byStripeId[0];

  const ownerUserId = stripeSubscription.metadata?.user_id;
  if (ownerUserId) {
    const byOwner = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ owner_user_id: ownerUserId }),
    );
    if (byOwner[0]) return byOwner[0];
  }

  const customerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id;
  if (customerId) {
    const byCustomer = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: customerId }),
    );
    if (byCustomer[0]) return byCustomer[0];
  }

  const email = stripeSubscription.metadata?.user_email;
  if (email) {
    const byEmail = asRows(
      await base44.asServiceRole.entities.Subscription.filter({ created_by: email }),
    );
    if (byEmail[0]) return byEmail[0];
  }

  return null;
}

async function upsertStripeSubscription(
  base44: any,
  stripeSubscription: any,
  fallbackMetadata: Record<string, string> = {},
) {
  const metadata = {
    ...fallbackMetadata,
    ...(stripeSubscription.metadata || {}),
  };
  const access = resolveStripeAccess(stripeSubscription);
  const item = stripeSubscription.items?.data?.[0];
  const productId = item?.price?.id || undefined;
  const ownerUserId = metadata.user_id || undefined;
  const email = metadata.user_email || undefined;
  const customerId = typeof stripeSubscription.customer === 'string'
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id;

  const data = {
    owner_user_id: ownerUserId,
    plan_type: access.active ? 'premium' : 'free',
    status: access.status,
    entitlement_active: access.active,
    billing_provider: 'stripe',
    store: 'web',
    product_id: productId,
    stripe_customer_id: customerId,
    stripe_subscription_id: stripeSubscription.id,
    current_period_start: safeTimestampToISO(stripeSubscription.current_period_start),
    current_period_end: safeTimestampToISO(stripeSubscription.current_period_end),
    trial_end: safeTimestampToISO(stripeSubscription.trial_end),
    cancelled_at: safeTimestampToISO(stripeSubscription.canceled_at),
    last_verified_at: new Date().toISOString(),
    will_renew: !stripeSubscription.cancel_at_period_end && access.status !== 'cancelled',
    environment: stripeSubscription.livemode ? 'production' : 'sandbox',
  };

  const existing = await findSubscriptionRecord(base44, stripeSubscription);
  if (existing) {
    await base44.asServiceRole.entities.Subscription.update(existing.id, data);
    return;
  }

  if (!email) {
    throw new Error('Cannot create subscription record without verified user email');
  }

  await base44.asServiceRole.entities.Subscription.create({
    ...data,
    created_by: email,
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!signature || !webhookSecret || !stripeSecret) {
    return Response.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1_048_576) {
    return Response.json({ error: 'Request too large' }, { status: 413 });
  }

  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const base44 = createClientFromRequest(req);

    if (await isEventAlreadyProcessed(base44, event.id)) {
      return Response.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertStripeSubscription(base44, subscription, {
            user_id: session.client_reference_id || session.metadata?.user_id || '',
            user_email: session.customer_details?.email || session.metadata?.user_email || '',
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertStripeSubscription(
          base44,
          event.data.object as any,
        );
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (typeof invoice.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await upsertStripeSubscription(base44, subscription);
        }
        break;
      }

      default:
        break;
    }

    await markEventAsProcessed(base44, event.id, event.type);
    return Response.json({ received: true });
  } catch (error) {
    console.error(
      '[stripeWebhook] Rejected event:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Invalid webhook event.' }, { status: 400 });
  }
});
