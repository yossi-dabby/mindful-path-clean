import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Stage 15 iOS Native architecture', () => {
  it('contains a generated Xcode project for the configured Bundle ID', () => {
    const config = read('capacitor.config.ts');
    const project = read('ios/App/App.xcodeproj/project.pbxproj');
    expect(config).toContain("appId: 'me.mindfulpath.app'");
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = me.mindfulpath.app;');
    expect(project).toContain('TARGETED_DEVICE_FAMILY = "1,2";');
    expect(project).toContain('IPHONEOS_DEPLOYMENT_TARGET = 15.0;');
  });

  it('keeps signing ready for an Apple Development Team without committing credentials', () => {
    const project = read('ios/App/App.xcodeproj/project.pbxproj');
    expect(project).toContain('CODE_SIGN_STYLE = Automatic;');
    expect(project).not.toContain('PROVISIONING_PROFILE_SPECIFIER =');
    expect(project).not.toContain('DEVELOPMENT_TEAM =');
  });

  it('syncs Capacitor App, Keyboard, and RevenueCat through Swift Package Manager', () => {
    const swiftPackage = read('ios/App/CapApp-SPM/Package.swift');
    expect(swiftPackage).toContain('CapacitorApp');
    expect(swiftPackage).toContain('CapacitorKeyboard');
    expect(swiftPackage).toContain('RevenuecatPurchasesCapacitor');
  });

  it('uses viewport-fit cover and safe-area CSS for notched iPhones and iPads', () => {
    const html = read('index.html');
    const css = read('src/globals.css');
    expect(html).toContain('viewport-fit=cover');
    expect(css).toContain('--sat: env(safe-area-inset-top');
    expect(css).toContain('--sab: env(safe-area-inset-bottom');
    expect(css).toContain('--native-keyboard-height');
  });

  it('centralizes iOS lifecycle, keyboard, URL-open, and orientation listeners', () => {
    const source = read('src/components/native/IOSNativeBridge.jsx');
    expect(source).toContain("Capacitor.getPlatform() !== 'ios'");
    expect(source).toContain("CapacitorApp.addListener('appStateChange'");
    expect(source).toContain("CapacitorApp.addListener('appUrlOpen'");
    expect(source).toContain("Keyboard.addListener('keyboardWillShow'");
    expect(source).toContain("Keyboard.addListener('keyboardDidHide'");
    expect(source).toContain("window.addEventListener('orientationchange'");
    expect(source).toContain('queryClientInstance.resumePausedMutations()');
  });

  it('keeps Apple IAP fail-closed and server verified', () => {
    const catalog = read('src/components/subscription/subscriptionCatalog.js');
    const purchases = read('src/components/subscription/nativePurchases.js');
    const verifier = read('base44/functions/verifyNativeEntitlement/entry.ts');
    expect(catalog).toContain("appleProductId: 'mindful_path_premium_monthly'");
    expect(catalog).toContain("VITE_NATIVE_BILLING_ENABLED === 'true'");
    expect(purchases).toContain('VITE_REVENUECAT_APPLE_API_KEY');
    expect(purchases).toContain('Purchases.purchasePackage');
    expect(purchases).toContain('Purchases.restorePurchases');
    expect(purchases).toContain("base44.functions.invoke('verifyNativeEntitlement'");
    expect(verifier).toContain("normalizeStore(productSubscription?.store)");
    expect(verifier).toContain("environment: productSubscription?.is_sandbox");
  });

  it('declares iPhone and iPad orientation support', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toContain('<key>UISupportedInterfaceOrientations</key>');
    expect(plist).toContain('<key>UISupportedInterfaceOrientations~ipad</key>');
    expect(plist).toContain('<string>UIInterfaceOrientationPortrait</string>');
    expect(plist).toContain('<string>UIInterfaceOrientationLandscapeLeft</string>');
  });
});
