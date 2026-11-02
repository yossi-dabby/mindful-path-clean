import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import {
  NATIVE_BILLING_ENABLED,
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_MONTHLY_PLAN
} from './subscriptionCatalog.js';

let configuredUserId = null;
let purchasesModulePromise = null;

function getNativeApiKey(platform) {
  if (platform === 'ios') return import.meta.env.VITE_REVENUECAT_APPLE_API_KEY || '';
  if (platform === 'android') return import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY || '';
  return '';
}

async function getPurchasesModule() {
  if (!purchasesModulePromise) {
    purchasesModulePromise = import('@revenuecat/purchases-capacitor');
  }
  return purchasesModulePromise;
}

export function getNativeBillingState() {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform() && (platform === 'ios' || platform === 'android');
  const apiKey = getNativeApiKey(platform);

  return {
    platform,
    isNative,
    configured: Boolean(NATIVE_BILLING_ENABLED && isNative && apiKey)
  };
}

async function ensureConfigured(user) {
  const state = getNativeBillingState();
  if (!state.configured) {
    throw new Error('NATIVE_BILLING_NOT_CONFIGURED');
  }
  if (!user?.id) {
    throw new Error('AUTHENTICATED_USER_REQUIRED');
  }

  const { Purchases } = await getPurchasesModule();
  if (configuredUserId && configuredUserId !== user.id) {
    throw new Error('NATIVE_BILLING_USER_CHANGED');
  }

  if (!configuredUserId) {
    await Purchases.configure({
      apiKey: getNativeApiKey(state.platform),
      appUserID: user.id
    });
    configuredUserId = user.id;
  }

  return Purchases;
}

function hasPremiumEntitlement(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]);
}

async function verifyEntitlementOnServer() {
  const response = await base44.functions.invoke('verifyNativeEntitlement', {});
  return response?.data || response;
}

export async function loadNativeMonthlyOffer(user) {
  const Purchases = await ensureConfigured(user);
  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;

  if (!current) {
    throw new Error('NATIVE_OFFERING_NOT_FOUND');
  }

  const monthlyPackage = current.availablePackages?.find((item) =>
    item.identifier === PREMIUM_MONTHLY_PLAN.revenueCatPackageIdentifier ||
    item.packageType === 'MONTHLY' ||
    item.product?.identifier === PREMIUM_MONTHLY_PLAN.appleProductId ||
    item.product?.identifier === PREMIUM_MONTHLY_PLAN.googleProductId
  );

  if (!monthlyPackage) {
    throw new Error('NATIVE_MONTHLY_PACKAGE_NOT_FOUND');
  }

  return {
    package: monthlyPackage,
    localizedPrice: monthlyPackage.product?.priceString || null
  };
}

export async function purchaseNativeMonthly(user, monthlyPackage) {
  const Purchases = await ensureConfigured(user);
  const result = await Purchases.purchasePackage({ aPackage: monthlyPackage });

  if (!hasPremiumEntitlement(result?.customerInfo)) {
    throw new Error('PREMIUM_ENTITLEMENT_NOT_GRANTED');
  }

  const verified = await verifyEntitlementOnServer();
  if (!verified?.active) {
    throw new Error('PREMIUM_ENTITLEMENT_NOT_VERIFIED');
  }
  return verified;
}

export async function restoreNativePurchases(user) {
  const Purchases = await ensureConfigured(user);
  const result = await Purchases.restorePurchases();
  const verified = await verifyEntitlementOnServer();

  return {
    restored: Boolean(verified?.active),
    storeReportedActive: hasPremiumEntitlement(result?.customerInfo),
    verified
  };
}