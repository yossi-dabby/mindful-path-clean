import { describe, expect, it } from 'vitest';
import { SUPPORTED_APP_LOCALES } from '../../src/components/i18n/appLocale.js';
import {
  SUBSCRIPTIONS_ENABLED,
  getSubscriptionReadinessCopy,
  isPremiumSubscription
} from '../../src/components/subscription/subscriptionReadiness.js';

describe('subscription readiness gate', () => {
  it('fails closed until store and web billing are explicitly enabled', () => {
    expect(SUBSCRIPTIONS_ENABLED).toBe(false);
  });

  it.each(SUPPORTED_APP_LOCALES)('has complete standby copy for %s', (locale) => {
    const copy = getSubscriptionReadinessCopy(locale);
    expect(copy.pending).toBeTruthy();
    expect(copy.description).toBeTruthy();
    expect(copy.button).toBeTruthy();
    expect(copy.modalTitle).toBeTruthy();
    expect(copy.modalBody).toBeTruthy();
    expect(copy.close).toBeTruthy();
    expect(copy.price).toBeTruthy();
    expect(copy.purchase).toContain('{price}');
    expect(copy.restore).toBeTruthy();
    expect(copy.unavailable).toBeTruthy();
    expect(copy.terms).toBeTruthy();
  });

  it('recognizes only active paid plans as premium', () => {
    expect(isPremiumSubscription({ status: 'active', plan_type: 'premium' })).toBe(true);
    expect(isPremiumSubscription({ status: 'active', plan_type: 'premium_plus' })).toBe(true);
    expect(isPremiumSubscription({ status: 'active', plan_type: 'free' })).toBe(false);
    expect(isPremiumSubscription({ status: 'trial', plan_type: 'premium' })).toBe(true);
    expect(isPremiumSubscription({ status: 'grace_period', plan_type: 'premium' })).toBe(true);
    expect(isPremiumSubscription({ status: 'active', plan_type: 'premium', entitlement_active: false })).toBe(false);
    expect(isPremiumSubscription(null)).toBe(false);
  });

  it('normalizes regional locale codes', () => {
    expect(getSubscriptionReadinessCopy('pt-BR')).toEqual(getSubscriptionReadinessCopy('pt'));
  });
});
