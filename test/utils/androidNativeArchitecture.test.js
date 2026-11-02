import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Stage 14 Android Native architecture', () => {
  it('uses the official Capacitor App and Keyboard plugins', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@capacitor/app']).toBe('^8.1.1');
    expect(pkg.dependencies['@capacitor/keyboard']).toBe('^8.0.5');

    const config = read('capacitor.config.ts');
    expect(config).toContain('disableBackButtonHandler: false');
    expect(config).toContain('resizeOnFullScreen: true');
  });

  it('keeps the native bridge Android-only and centralizes listeners', () => {
    const source = read('src/components/native/AndroidNativeBridge.jsx');
    expect(source).toContain("Capacitor.getPlatform() !== 'android'");
    expect(source).toContain("CapacitorApp.addListener('backButton'");
    expect(source).toContain("CapacitorApp.addListener('appStateChange'");
    expect(source).toContain("CapacitorApp.addListener('appRestoredResult'");
    expect(source).toContain("Keyboard.addListener('keyboardWillShow'");
    expect(source).toContain("Keyboard.addListener('keyboardDidHide'");
    expect(source).toContain("window.addEventListener('orientationchange'");
  });

  it('handles Back in overlay, page, and root order', () => {
    const source = read('src/components/native/AndroidNativeBridge.jsx');
    const overlay = source.indexOf('if (closeTopOverlay()) return');
    const root = source.indexOf('ROOT_PATHS.has(window.location.pathname)');
    const history = source.indexOf('if (canGoBack || window.history.length > 1)');
    expect(overlay).toBeGreaterThan(0);
    expect(root).toBeGreaterThan(overlay);
    expect(history).toBeGreaterThan(root);
    expect(source).toContain('CapacitorApp.minimizeApp()');
  });

  it('resumes paused mutations and refreshes active queries after foregrounding', () => {
    const source = read('src/components/native/AndroidNativeBridge.jsx');
    expect(source).toContain('focusManager.setFocused(isActive)');
    expect(source).toContain('queryClientInstance.resumePausedMutations()');
    expect(source).toContain("queryClientInstance.invalidateQueries({ refetchType: 'active' })");
  });

  it('configures Android for resize, rotation, stack stability, RTL, and file sharing', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android:windowSoftInputMode="adjustResize"');
    expect(manifest).toContain('android:screenOrientation="unspecified"');
    expect(manifest).toContain('android:resizeableActivity="true"');
    expect(manifest).toContain('android:launchMode="singleTask"');
    expect(manifest).toContain('android:supportsRtl="true"');
    expect(manifest).toContain('androidx.core.content.FileProvider');
  });

  it('keeps billing fail-closed and wired to the Android RevenueCat key', () => {
    const catalog = read('src/components/subscription/subscriptionCatalog.js');
    const purchases = read('src/components/subscription/nativePurchases.js');
    expect(catalog).toContain("VITE_NATIVE_BILLING_ENABLED === 'true'");
    expect(catalog).toContain("googleProductId: 'mindful_path_premium_monthly'");
    expect(purchases).toContain('VITE_REVENUECAT_GOOGLE_API_KEY');
    expect(purchases).toContain('Purchases.purchasePackage');
    expect(purchases).toContain('Purchases.restorePurchases');
    expect(purchases).toContain("base44.functions.invoke('verifyNativeEntitlement'");
  });

  it('exposes the supported chat file types for the Android document picker', () => {
    const source = read('src/pages/Chat.jsx');
    expect(source).toContain('data-testid="chat-file-input"');
    expect(source).toContain('accept="image/*,.pdf,.doc,.docx,.txt,.csv"');
    expect(source).toContain('e.target.value =');
  });
});
