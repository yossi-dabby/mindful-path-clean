# Stage D billing launch runbook

## Approved commercial plan

- Product: Mindful Path Premium
- Billing period: monthly
- Reference price: USD 9.99
- Internal plan ID: `premium_monthly`
- RevenueCat entitlement: `premium`
- RevenueCat package: `$rc_monthly`
- Apple product ID: `mindful_path_premium_monthly`
- Google product ID: `mindful_path_premium_monthly`
- Stripe Price ID: configured only through `STRIPE_PREMIUM_MONTHLY_PRICE_ID`

Apple and Google may show a localized currency and tax-inclusive store price. The app must display the price returned by the store SDK on native platforms.

## Non-negotiable routing

- iOS digital subscription: Apple In-App Purchase through RevenueCat.
- Android digital subscription: Google Play Billing through RevenueCat.
- Website subscription: Stripe Checkout.
- Never open Stripe Checkout from the native iOS or Android build.
- Never grant Premium from a client-provided receipt or entitlement object.
- Crisis and emergency resources remain available without Premium.

## Required accounts and products

### RevenueCat

1. Create the Mindful Path project.
2. Add the Apple app with bundle ID `me.mindfulpath.app`.
3. Add the Google app with package name `me.mindfulpath.app`.
4. Connect App Store Connect and Google Play service credentials.
5. Import both monthly products.
6. Attach both products to entitlement `premium`.
7. Add both products to the current/default offering as `$rc_monthly`.
8. Configure the webhook URL for the Base44 `revenueCatWebhook` function.
9. Set a long random Authorization value and store the exact value as `REVENUECAT_WEBHOOK_AUTHORIZATION`.

### Stripe

1. Create one recurring USD monthly Price for exactly USD 9.99.
2. Store its real `price_...` ID as `STRIPE_PREMIUM_MONTHLY_PRICE_ID`.
3. Configure the Base44 `stripeWebhook` function as a public Stripe webhook endpoint.
4. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Store the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.

## Required configuration

Client build variables:

```
VITE_SUBSCRIPTIONS_ENABLED=false
VITE_WEB_BILLING_ENABLED=false
VITE_NATIVE_BILLING_ENABLED=false
VITE_REVENUECAT_APPLE_API_KEY=
VITE_REVENUECAT_GOOGLE_API_KEY=
```

Server secrets:

```
WEB_BILLING_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
REVENUECAT_SECRET_API_KEY=
REVENUECAT_WEBHOOK_AUTHORIZATION=
REVENUECAT_ENTITLEMENT_ID=premium
REVENUECAT_ALLOWED_PRODUCT_IDS=mindful_path_premium_monthly
```

RevenueCat public Apple/Google SDK keys may be present in the compiled native app. The RevenueCat secret API key and every Stripe secret must remain server-only.

## Activation order

1. Keep all three feature flags false.
2. Complete Apple sandbox and Google license-tester purchases.
3. Test purchase, restore, renewal, cancellation, expiration, refund, billing failure and grace period.
4. Complete Stripe test-mode Checkout and signed webhook tests.
5. Confirm one Subscription record per Base44 user and verify replayed webhooks do not change the result.
6. Enable billing only in staging and repeat the multilingual/device matrix.
7. Enable Production server configuration.
8. Enable only the client channel being released.
9. Monitor webhook errors, subscription mismatches and support requests.
10. Roll back instantly by setting the relevant client and server billing flags to false.

## Release gate

Billing is not ready for real charges until the real store products, credentials and webhook endpoints exist and every scenario above has passed. Code readiness alone is not authorization to enable live billing.
