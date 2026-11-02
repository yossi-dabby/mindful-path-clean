# Stripe Webhook Audit — Mindful Path CBT App

> **Audit type:** Read-only security and correctness audit
> **Scope:** Stripe payment flow — webhook handler, checkout session creation, subscription entity updates, frontend payment trigger
> **Relates to:** MB-01, TD-22 (copilot-maintenance-backlog.md, technical-debt-register.md)
> **Audit date:** 2026-03-10
> **No runtime behavior was changed in creating this document.**

---

## 1. Stripe-Related Files and Paths Identified

| File | Role |
|---|---|
| `functions/stripeWebhook.ts` | Inbound Stripe webhook handler — signature verification, event switching, entity writes |
| `functions/createCheckoutSession.ts` | Creates Stripe Checkout sessions on behalf of authenticated users |
| `src/components/subscription/PremiumPaywall.jsx` | Frontend component that triggers checkout; passes `successUrl` and `cancelUrl` |
| `src/api/entities/index.js` (line 208) | Exposes `Subscription` entity through Base44 SDK (`SystemAndSupporting.Subscription`) |
| `src/pages/Settings.jsx` (lines 80–89) | Initializes a `Subscription` record (free/trial) for new users on first visit |
| `src/pages/AdvancedAnalytics.jsx` (line 75) | Reads `subscription.status` and `subscription.plan_type` to gate premium features |

**No additional Stripe-related files were found.** No payment intent handling, no invoice handling, no webhook retry configuration, and no Stripe customer portal integration exist in the repository at this time.

---

## 2. End-to-End Stripe Webhook Flow Summary

### Step 1 — User Initiates Checkout (Frontend)

- **File:** `src/components/subscription/PremiumPaywall.jsx`
- The user clicks "Start Free Trial", which calls `base44.functions.invoke('createCheckoutSession', { priceId, successUrl, cancelUrl })`.
- `priceId` is hard-coded as `'price_premium_monthly'` (line 90).
- `successUrl` is set to `window.location.origin + '/?upgraded=true'`.
- `cancelUrl` is set to `window.location.href`.
- On success, the browser is redirected to `data.url` (the Stripe-hosted checkout page).

### Step 2 — Backend Creates Checkout Session (`createCheckoutSession.ts`)

- Authenticates the request using `base44.auth.me()`. Unauthenticated requests receive HTTP 401.
- Reads `priceId`, `successUrl`, `cancelUrl` from the request body (user-supplied values).
- Queries the user's existing `Subscription` records to retrieve any existing `stripe_customer_id`.
- If no customer exists, creates a new Stripe customer via `stripe.customers.create({ email: user.email, metadata: { user_id, app_id } })`.
- Creates a Stripe Checkout session with `mode: 'subscription'`, the resolved `customerId`, the caller-supplied `priceId`, and caller-supplied `successUrl` / `cancelUrl`.
- Embeds `user.email` in `session.metadata.user_email` for later retrieval in the webhook.
- Returns the session URL and session ID to the frontend.

### Step 3 — User Completes Payment on Stripe-Hosted Page

- User completes payment on the Stripe-hosted checkout page.
- Stripe redirects user back to `successUrl` (`/?upgraded=true`).

### Step 4 — Stripe Sends Webhook to Backend (`stripeWebhook.ts`)

- Stripe POSTs the event payload to the webhook endpoint.
- The handler reads `stripe-signature` from the request headers.
- The handler reads `STRIPE_WEBHOOK_SECRET` from the environment.
- **If either is missing**, the request is rejected with HTTP 400 before reading the body.
- The raw body is read via `req.text()` (required for signature verification; not parsed before verification).
- `stripe.webhooks.constructEvent(body, signature, webhookSecret)` is called to verify the signature. **This is the primary security gate.**
- If verification throws (invalid signature, expired timestamp), the catch block returns HTTP 400.
- After verification, event type is switched:

  | Event Type | Action |
  |---|---|
  | `checkout.session.completed` | Resolves `customerEmail` from `session.customer_email` or `session.metadata.user_email`. Upserts `Subscription` entity with `stripe_customer_id`, `stripe_subscription_id`, `plan_type: 'premium'`, `status: 'active'`. |
  | `customer.subscription.updated` | Looks up `Subscription` by `stripe_subscription_id`. Updates `status`, `current_period_start`, `current_period_end`. |
  | `customer.subscription.deleted` | Looks up `Subscription` by `stripe_subscription_id`. Sets `status: 'cancelled'` and `cancelled_at`. |
  | (all other events) | Switch falls through; no action taken. Returns HTTP 200 `{ received: true }`. |

### Step 5 — Frontend Post-Redirect Behavior

- After Stripe redirects the user back to `/?upgraded=true`, no frontend code was found that:
  - Reads the `?upgraded=true` query parameter
  - Polls for subscription status
  - Shows a confirmation banner
- **The frontend relies entirely on the webhook to update the subscription state** — there is no client-side optimistic update or post-redirect subscription refresh found in the audited code.

---

## 3. Signature Verification Path (Exact)

```
functions/stripeWebhook.ts — lines 21–30

const signature = req.headers.get('stripe-signature');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

if (!signature || !webhookSecret) {
  return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
}

const body = await req.text();
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

**Assessment:** The raw body is consumed as text before any JSON parsing, which is the correct approach for Stripe signature verification. `constructEvent` is the standard Stripe SDK method and performs both HMAC signature verification and timestamp tolerance checking (default: ±300 seconds). If verification fails, the SDK throws, which is caught and results in HTTP 400. This path is **correctly implemented** for the core signature check.

---

## 4. Event Handling Path (Exact)

```
functions/stripeWebhook.ts — lines 34–103

switch (event.type) {
  case 'checkout.session.completed': { ... }
  case 'customer.subscription.updated': { ... }
  case 'customer.subscription.deleted': { ... }
}
return Response.json({ received: true });
```

**Assessment:** Only three event types are explicitly handled. All other event types are silently accepted with HTTP 200 and no action taken. This is standard Stripe webhook practice. However, see Section 7 for an unclear boundary regarding unhandled events.

---

## 5. Entity / State Update Path (Exact)

```
functions/stripeWebhook.ts — checkout.session.completed handler (lines 35–65)

const customerEmail = session.customer_email || session.metadata?.user_email;

if (customerEmail) {
  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
    created_by: customerEmail
  });
  // upsert logic...
}
```

```
functions/stripeWebhook.ts — customer.subscription.updated handler (lines 67–83)

const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
  stripe_subscription_id: subscription.id
});
if (subscriptions.length > 0) { ... }
```

```
functions/stripeWebhook.ts — customer.subscription.deleted handler (lines 86–101)

const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
  stripe_subscription_id: subscription.id
});
if (subscriptions.length > 0) { ... }
```

**Entity fields written by webhook:**

| Field | Set by |
|---|---|
| `stripe_customer_id` | `checkout.session.completed` |
| `stripe_subscription_id` | `checkout.session.completed` |
| `plan_type` | `checkout.session.completed` (hardcoded `'premium'`) |
| `status` | All three handlers |
| `current_period_start` | `checkout.session.completed`, `customer.subscription.updated` |
| `current_period_end` | `customer.subscription.updated` |
| `cancelled_at` | `customer.subscription.deleted` |

---

## 6. Confirmed Safe Boundaries

| # | Boundary | Verdict |
|---|---|---|
| S-01 | Raw body read before JSON parse for signature | ✅ SAFE — `req.text()` used; body not parsed before `constructEvent` |
| S-02 | Signature header presence checked before body read | ✅ SAFE — Early return if header or secret missing |
| S-03 | `STRIPE_WEBHOOK_SECRET` loaded from env, not code | ✅ SAFE — `Deno.env.get('STRIPE_WEBHOOK_SECRET')` |
| S-04 | `STRIPE_SECRET_KEY` loaded from env, not code | ✅ SAFE — `Deno.env.get('STRIPE_SECRET_KEY')` |
| S-05 | `stripe.webhooks.constructEvent` used for verification | ✅ SAFE — Standard Stripe SDK method with HMAC + timestamp check |
| S-06 | Webhook uses `base44.asServiceRole` for entity writes | ✅ SAFE — Service role context used; not user-scoped |
| S-07 | Timestamp conversion guarded by numeric safety utility | ✅ SAFE — `safeTimestampToISO` validates `Number.isFinite`, `Number.isSafeInteger`, sign, and overflow |
| S-08 | `createCheckoutSession.ts` authenticates the caller | ✅ SAFE — `base44.auth.me()` called; unauthenticated requests rejected with 401 |
| S-09 | No private user health data flows through Stripe | ✅ SAFE — Only `user.email` and billing metadata |
| S-10 | `createCheckoutSession.ts` embeds `user.email` in session metadata | ✅ SAFE — Email from verified auth context, not from request body |

---

## 7. Unclear Boundaries or Review-Needed Areas

| # | Area | Why Unclear | Recommended Action |
|---|---|---|---|
| U-01 | `checkout.session.completed` email resolution fallback | The handler uses `session.customer_email \|\| session.metadata?.user_email`. If `customer_email` is null (possible for link-based payment methods), it falls back to `metadata.user_email`. The metadata is set by `createCheckoutSession.ts` from the authenticated user's email. However, it is not verified that `metadata.user_email` always matches the authenticated user at webhook time. | **HUMAN REVIEW RECOMMENDED** — Verify in Stripe Dashboard that `metadata.user_email` is always populated by `createCheckoutSession.ts` before production volume. |
| U-02 | Subscription lookup uses `created_by: customerEmail` string filter | The webhook queries `Subscription.filter({ created_by: customerEmail })` using email. If Base44 `created_by` field is not indexed or if email casing differs between auth and Stripe, the filter may return zero results and silently create a duplicate. | **HUMAN REVIEW RECOMMENDED** — Verify Base44 filter behavior on `created_by` for this entity and confirm uniqueness constraints. |
| U-03 | Multiple subscriptions possible | If `subscriptions.length > 0`, only `subscriptions[0]` is used. If the user has multiple subscription records (possible if the subscription singleton initialization race or retry created duplicates), only the first record is updated. | **FUTURE CODE FIX RECOMMENDED** — Add explicit uniqueness enforcement or use `stripe_customer_id` as a unique lookup key. |
| U-04 | `customer.subscription.updated` / `deleted` handlers: no fallback if subscription not found | If `subscriptions.length === 0` (e.g., the webhook fires before `checkout.session.completed` is processed, or the subscription record was deleted externally), the update/cancel is silently ignored. | **FUTURE CODE FIX RECOMMENDED** — Consider logging a warning or returning a non-2xx status to trigger Stripe retry. |
| U-05 | No idempotency key or deduplication | Stripe may deliver the same webhook event more than once. The handler performs an upsert for `checkout.session.completed`, which may be safe under double-delivery, but `customer.subscription.updated` and `customer.subscription.deleted` do not check for already-applied state. | **FUTURE CODE FIX RECOMMENDED** — Add an `event_id` field to Subscription or a separate event log to track processed Stripe event IDs. |
| U-06 | `successUrl` and `cancelUrl` accepted from frontend without validation | `createCheckoutSession.ts` accepts `successUrl` and `cancelUrl` from the frontend request body without server-side URL validation. Stripe validates these for HTTPS scheme in production checkout but the backend does not apply further restrictions. | **HUMAN REVIEW RECOMMENDED** — Confirm that Stripe's own redirect URL validation is sufficient, or add backend allowlist enforcement. |
| U-07 | `priceId` accepted from frontend without validation | The `priceId` value (`'price_premium_monthly'`) is supplied by the frontend and passed directly to `stripe.checkout.sessions.create`. A malicious or manipulated client could substitute a different `priceId` for a different product or price. | **FUTURE CODE FIX RECOMMENDED** — Validate `priceId` server-side against an allowlist of approved price IDs before passing to Stripe. |
| U-08 | Frontend post-redirect behavior after `?upgraded=true` | The `successUrl` includes `?upgraded=true` but no frontend code was found that reads this parameter, polls for the webhook result, or shows a confirmation to the user. The subscription status in the UI depends entirely on the webhook arriving and the frontend re-fetching subscription state. | **HUMAN REVIEW RECOMMENDED** — Verify whether the app re-fetches subscription status automatically post-redirect, and whether the user experience is correct if the webhook is delayed. |
| U-09 | `current_period_start` in `checkout.session.completed` uses `new Date()` | The `checkout.session.completed` handler sets `current_period_start: new Date().toISOString()` rather than reading the actual period start from the Stripe session or subscription object. The Stripe `checkout.session` object does not directly contain billing period dates, but the subscription ID is available to fetch this data. | **FUTURE CODE FIX RECOMMENDED** — Consider fetching the subscription from Stripe API using the `session.subscription` ID to retrieve accurate period dates, or document that `current_period_start` for this event is intentionally approximated. |

---

## 8. Confirmed Risks

| # | Risk | Severity | Affected Paths | Recommended Follow-up |
|---|---|---|---|---|
| R-01 | **No idempotency / replay deduplication** | MEDIUM / HUMAN REVIEW RECOMMENDED | `functions/stripeWebhook.ts` (all three handlers) | Stripe guarantees at-least-once delivery. Double-delivery of `checkout.session.completed` would attempt a second upsert, which may be benign; double-delivery of `customer.subscription.deleted` would attempt a second write of `status: 'cancelled'`, also benign in this implementation. The risk is low in current form because writes are overwrites, not increments — but the gap should be documented and reviewed. Future enhancements (e.g., incrementing usage counters) would require proper idempotency. Recommended follow-up: add Stripe event ID logging to a dedicated table. |
| R-02 | **`priceId` not validated server-side** | MEDIUM / HUMAN REVIEW RECOMMENDED | `functions/createCheckoutSession.ts` (line 46) | A manipulated client could pass any Stripe price ID, potentially creating a checkout for a different product tier (e.g., an annual plan instead of monthly, or a cheaper variant). This depends on what price IDs exist in the Stripe account. If only one price exists, the risk is LOW. If multiple prices exist, the risk is MEDIUM or higher. Recommended follow-up: add a server-side allowlist of valid price IDs before the Stripe API call. |
| R-03 | **Silent failure when subscription record not found for `updated` / `deleted` events** | LOW / REVIEW LATER | `functions/stripeWebhook.ts` (lines 73, 92) | If the internal `Subscription` record is missing when `customer.subscription.updated` or `customer.subscription.deleted` fires, the event is silently acknowledged with HTTP 200. Stripe will not retry. The user's subscription state in the app will not reflect the billing change. Recommended follow-up: add structured logging for this path and consider returning a non-2xx status to trigger Stripe retry. |
| R-04 | **Potential duplicate subscription records** | LOW / REVIEW LATER | `functions/stripeWebhook.ts` (line 40–42), `src/pages/Settings.jsx` (lines 80–89) | Settings.jsx creates an initial `Subscription` record on first visit. `stripeWebhook.ts` creates a new one if `subscriptions.length === 0`. A race between first visit and webhook arrival could create two records. The webhook uses only `subscriptions[0]`, and Settings.jsx uses `.list()` on its own user context. Recommended follow-up: add a unique constraint or strict singleton pattern to the Subscription entity. |

---

## 9. Not Found / No Evidence

| # | Item | Status |
|---|---|---|
| NF-01 | Stripe invoice webhook handling (`invoice.paid`, `invoice.payment_failed`) | NOT FOUND — No handlers for invoice events. Failed payments would not trigger any internal state change. |
| NF-02 | Payment intent webhook handling | NOT FOUND — No handlers for `payment_intent.*` events. |
| NF-03 | Replay prevention / event ID deduplication | NOT FOUND — No Stripe event ID tracking in any entity or log. |
| NF-04 | Stripe customer portal integration | NOT FOUND — No portal session creation or redirect. |
| NF-05 | Explicit webhook retry / exponential backoff logic | NOT FOUND — Stripe handles retries natively; none configured in this repo. |
| NF-06 | Hardcoded Stripe secrets | NOT FOUND — No secrets found in code; all loaded from `Deno.env`. |
| NF-07 | Logging of full payment event payload | NOT FOUND — No `console.log` of event data found in the webhook handler. |
| NF-08 | Any cross-user subscription query | NOT FOUND — All queries are scoped to a specific user email or `stripe_subscription_id`. |
| NF-09 | Health or therapy data flowing through Stripe | NOT FOUND — Only billing metadata flows through Stripe. |
| NF-10 | Frontend code reading `?upgraded=true` query parameter | NOT FOUND — The query parameter is set in `successUrl` but no handler was found in the audited pages. |

---

## 10. Recommended Next Actions

### No Action Needed
- Signature verification implementation (S-01 through S-07) — correctly implemented.
- Use of environment variables for secrets — correctly implemented.
- Service role context for entity writes — correctly implemented.
- Numeric safety utility for timestamp conversion — correctly implemented.

### Human Review Recommended
- **U-01** — Verify `checkout.session.completed` email resolution covers all Stripe payment methods in production.
- **U-02** — Verify Base44 `created_by` filter behavior and email casing consistency.
- **U-06** — Confirm whether Stripe's redirect URL validation is sufficient or whether a backend allowlist is needed.
- **U-08** — Verify frontend post-redirect subscription refresh behavior and user experience after payment.
- **R-01** — Review idempotency risk now; plan deduplication before adding any non-idempotent writes to webhook handlers.
- **R-02** — Confirm how many Stripe price IDs exist in production; if more than one, add a server-side price ID allowlist.

### Future Test Coverage Recommended
- Add unit tests for `safeTimestampToISO` edge cases (already partially covered by the design; confirm test coverage in `test/`).
- Add integration test scenarios for `checkout.session.completed` with a missing `customerEmail` value.
- Add test scenario for `customer.subscription.updated` when no matching internal subscription record exists.
- Add test for `customer.subscription.deleted` replay (second invocation with same subscription ID).

### Future Code Fix Recommended
- **U-03** — Enforce subscription record uniqueness per user; use the first record defensively but log if multiple exist.
- **U-04** — Return a non-2xx status (or log a structured warning) when subscription is not found for `updated` / `deleted` events.
- **U-05** — Add Stripe event ID tracking to prevent silently ignoring replay events once non-idempotent writes are added.
- **U-07** — Add a server-side price ID allowlist in `createCheckoutSession.ts`.
- **U-09** — Resolve `current_period_start` from actual Stripe subscription data rather than `new Date()`.

---

## 11. Risk Summary Table

| ID | Finding | Severity | Action |
|---|---|---|---|
| R-01 | No idempotency / replay deduplication | MEDIUM | Human review recommended |
| R-02 | `priceId` not validated server-side | MEDIUM | Human review recommended |
| R-03 | Silent failure when subscription record missing | LOW | Review later |
| R-04 | Potential duplicate subscription records | LOW | Review later |
| U-01 | Email resolution fallback coverage | UNCLEAR | Human review recommended |
| U-02 | `created_by` filter behavior | UNCLEAR | Human review recommended |
| U-03 | Multiple subscription records only use `[0]` | UNCLEAR | Future code fix |
| U-04 | No retry signal on missing subscription | UNCLEAR | Future code fix |
| U-05 | No event ID deduplication | UNCLEAR | Future code fix |
| U-06 | `successUrl`/`cancelUrl` not validated | UNCLEAR | Human review recommended |
| U-07 | `priceId` not allowlisted | UNCLEAR | Future code fix |
| U-08 | Frontend post-redirect behavior | UNCLEAR | Human review recommended |
| U-09 | `current_period_start` uses `new Date()` | UNCLEAR | Future code fix |

---

## 12. Audit Conclusion

The Stripe webhook implementation in `functions/stripeWebhook.ts` is **structurally sound at its core security boundary**. The critical path — signature verification using `stripe.webhooks.constructEvent` on the raw request body, before any JSON parsing or entity access — is correctly implemented. Secrets are loaded from environment variables. No hardcoded credentials were found.

The implementation has **several operational gaps** that are not security vulnerabilities in the current state but present risk if the payment system scales or if new webhook handlers are added:

- Idempotency is not enforced (current writes are overwrites, limiting immediate risk).
- Price ID is not validated server-side (risk depends on number of Stripe products configured).
- Silent failure paths exist for missing subscription records on subscription lifecycle events.

**No confirmed critical vulnerabilities were found.** The signature verification path is correctly implemented. The risks identified are primarily medium severity operational gaps requiring human review or future code improvement.

**This audit closes the documentation gap for MB-01 and TD-22.** The findings should be reviewed by the repository owner and a security-aware engineer before any changes are made to the webhook handler or before production payment volume increases significantly.

---

*No existing app behavior was changed in creating this document.*
*No Base44 entities were changed. No backend functions were changed. No automations were changed. No live app agents were changed. No secrets were changed. No UI was changed. No routes were changed.*

*Last updated: 2026-03-10 — Stripe Webhook Audit (additive documentation only).*
