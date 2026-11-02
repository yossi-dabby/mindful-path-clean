import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const APPROVED_PLAN_ID = 'premium_monthly';
const APPROVED_CHECKOUT_ORIGINS = new Set([
  'https://app.mindful-path.me',
  'https://mindful-path-75aeaf7d.base44.app',
]);

function isApprovedPlanId(planId) {
  return planId === APPROVED_PLAN_ID;
}

function isApprovedRedirectUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      APPROVED_CHECKOUT_ORIGINS.has(parsed.origin);
  } catch {
    return false;
  }
}

describe('createCheckoutSession — approved monthly plan', () => {
  it('accepts only the internal Premium monthly plan ID', () => {
    expect(isApprovedPlanId('premium_monthly')).toBe(true);
    expect(isApprovedPlanId('price_premium_monthly')).toBe(false);
    expect(isApprovedPlanId('premium_monthly_discount')).toBe(false);
    expect(isApprovedPlanId('')).toBe(false);
    expect(isApprovedPlanId(null)).toBe(false);
  });

  it('loads the real Stripe price only from a server environment variable', () => {
    const source = fs.readFileSync('base44/functions/createCheckoutSession/entry.ts', 'utf8');
    expect(source).toContain("Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID')");
    expect(source).toContain('stripe.prices.retrieve(priceId)');
    expect(source).not.toContain("price_premium_monthly'");
  });

  it('verifies the configured Stripe price is active, recurring, monthly USD 9.99', () => {
    const source = fs.readFileSync('base44/functions/createCheckoutSession/entry.ts', 'utf8');
    expect(source).toContain('const EXPECTED_AMOUNT = 999');
    expect(source).toContain("const EXPECTED_CURRENCY = 'usd'");
    expect(source).toContain("const EXPECTED_INTERVAL = 'month'");
    expect(source).toContain("price.type !== 'recurring'");
  });

  it('adds Stripe session confirmation to the approved return URL server-side', () => {
    const source = fs.readFileSync('base44/functions/createCheckoutSession/entry.ts', 'utf8');
    expect(source).toContain('session_id={CHECKOUT_SESSION_ID}');
    expect(source).toContain('success_url: checkoutSuccessUrl');
  });
});

describe('createCheckoutSession — return URL allowlist', () => {
  it('accepts only known HTTPS production origins', () => {
    expect(isApprovedRedirectUrl('https://app.mindful-path.me/?billing=success')).toBe(true);
    expect(isApprovedRedirectUrl('https://mindful-path-75aeaf7d.base44.app/account')).toBe(true);
  });

  it('rejects open redirects, lookalikes and credential-bearing URLs', () => {
    expect(isApprovedRedirectUrl('https://evil.example/phish')).toBe(false);
    expect(isApprovedRedirectUrl('https://app.mindful-path.me.evil.example/')).toBe(false);
    expect(isApprovedRedirectUrl('http://app.mindful-path.me/')).toBe(false);
    expect(isApprovedRedirectUrl('https://user:pass@app.mindful-path.me/')).toBe(false);
    expect(isApprovedRedirectUrl('//evil.example/phish')).toBe(false);
  });

  it('rejects malformed, empty and oversized values', () => {
    expect(isApprovedRedirectUrl('')).toBe(false);
    expect(isApprovedRedirectUrl(null)).toBe(false);
    expect(isApprovedRedirectUrl('not a URL')).toBe(false);
    expect(isApprovedRedirectUrl(`https://app.mindful-path.me/${'a'.repeat(2_100)}`)).toBe(false);
  });
});
