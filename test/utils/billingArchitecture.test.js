import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Stage D billing architecture', () => {
  it('defines one approved Premium monthly plan at $9.99', () => {
    const source = read('src/components/subscription/subscriptionCatalog.js');
    expect(source).toContain("id: 'premium_monthly'");
    expect(source).toContain('amount: 9.99');
    expect(source).toContain("currency: 'USD'");
    expect(source).toContain("billingPeriod: 'month'");
  });

  it('keeps all billing channels fail-closed behind explicit flags', () => {
    const source = read('src/components/subscription/subscriptionCatalog.js');
    expect(source).toContain("VITE_SUBSCRIPTIONS_ENABLED === 'true'");
    expect(source).toContain("VITE_WEB_BILLING_ENABLED === 'true'");
    expect(source).toContain("VITE_NATIVE_BILLING_ENABLED === 'true'");
  });

  it('uses RevenueCat for native purchase and restore but verifies access on the server', () => {
    const source = read('src/components/subscription/nativePurchases.js');
    expect(source).toContain("import('@revenuecat/purchases-capacitor')");
    expect(source).toContain('Purchases.purchasePackage');
    expect(source).toContain('Purchases.restorePurchases');
    expect(source).toContain("base44.functions.invoke('verifyNativeEntitlement'");
    expect(source).toContain('appUserID: user.id');
  });

  it('verifies native entitlements against RevenueCat and an approved product allowlist', () => {
    const source = read('base44/functions/verifyNativeEntitlement/entry.ts');
    expect(source).toContain('api.revenuecat.com/v1/subscribers/');
    expect(source).toContain("Deno.env.get('REVENUECAT_SECRET_API_KEY')");
    expect(source).toContain('EXPECTED_PRODUCT_IDS.has(productId)');
    expect(source).toContain('base44.asServiceRole.entities.Subscription');
  });

  it('never accepts a Stripe price as authority from the browser', () => {
    const source = read('base44/functions/createCheckoutSession/entry.ts');
    expect(source).toContain("planId !== PLAN_ID");
    expect(source).toContain("Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID')");
    expect(source).toContain('stripe.prices.retrieve(priceId)');
    expect(source).toContain('price.unit_amount !== EXPECTED_AMOUNT');
    expect(source).toContain('const EXPECTED_AMOUNT = 999');
    expect(source).not.toContain('const { priceId,');
  });

  it('confirms the Stripe checkout session against the authenticated user', () => {
    const source = read('base44/functions/confirmStripeCheckout/entry.ts');
    expect(source).toContain("stripe.checkout.sessions.retrieve(sessionId)");
    expect(source).toContain('sessionUserId !== user.id');
    expect(source).toContain("session.metadata?.plan_id !== 'premium_monthly'");
    expect(source).toContain('stripe.subscriptions.retrieve(session.subscription)');
  });

  it('validates Stripe signatures and reconciles renewals and failures', () => {
    const source = read('base44/functions/stripeWebhook/entry.ts');
    expect(source).toContain('stripe.webhooks.constructEvent');
    expect(source).toContain("case 'invoice.paid':");
    expect(source).toContain("case 'invoice.payment_failed':");
    expect(source).toContain("case 'customer.subscription.deleted':");
    expect(source).toContain('StripeProcessedEvent');
  });

  it('authenticates and deduplicates RevenueCat webhook events', () => {
    const source = read('base44/functions/revenueCatWebhook/entry.ts');
    expect(source).toContain('secureEquals');
    expect(source).toContain("Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION')");
    expect(source).toContain('RevenueCatProcessedEvent');
    expect(source).toContain('api.revenuecat.com/v1/subscribers/');
  });
});
