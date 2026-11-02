import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Android startup diagnostics', () => {
  it('installs an early browser failure screen before the application module loads', () => {
    const html = read('index.html');
    const diagnosticsPosition = html.indexOf('__MINDFUL_PATH_DIAGNOSTICS__');
    const appModulePosition = html.indexOf('<script type="module" src="/src/main.jsx"></script>');

    expect(diagnosticsPosition).toBeGreaterThan(-1);
    expect(diagnosticsPosition).toBeLessThan(appModulePosition);
    expect(html).toContain("window.addEventListener('unhandledrejection'");
    expect(html).toContain('startup-error-fallback');
    expect(html).toContain('__MINDFUL_PATH_MARK_MOUNTED__');
  });

  it('enables WebView inspection only for debug builds', () => {
    const activity = read('android/app/src/main/java/me/mindfulpath/app/MainActivity.java');
    const buildGradle = read('android/app/build.gradle');

    expect(activity).toContain('if (BuildConfig.DEBUG)');
    expect(activity).toContain('WebView.setWebContentsDebuggingEnabled(true)');
    expect(buildGradle).toContain('buildConfig = true');
  });

  it('uses a separate application id and label for diagnostic builds', () => {
    const buildGradle = read('android/app/build.gradle');
    const debugStrings = read('android/app/src/debug/res/values/strings.xml');

    expect(buildGradle).toContain('applicationIdSuffix ".diagnostic"');
    expect(buildGradle).toContain('versionNameSuffix "-diagnostic"');
    expect(debugStrings).toContain('Mindful Path Diagnostic');
  });

  it('registers the verified Android OAuth app link and Play signing key', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const bridge = read('src/components/native/AndroidNativeBridge.jsx');
    const assetLinks = JSON.parse(read('public/.well-known/assetlinks.json'));
    const target = assetLinks[0]?.target;

    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:host="mindful-path-production-7704.up.railway.app"');
    expect(manifest).toContain('android:pathPrefix="/native-auth-callback"');
    expect(bridge).toContain("CapacitorApp.addListener('appUrlOpen'");
    expect(bridge).toContain('CapacitorApp.getLaunchUrl()');
    expect(bridge).toContain('base44.auth.setToken(callback.accessToken)');

    expect(target?.package_name).toBe('me.mindfulpath.app');
    expect(target?.sha256_cert_fingerprints).toContain(
      'CE:1B:14:79:1E:6B:EA:F6:4B:82:5E:49:75:0D:3E:F9:F5:2A:ED:0A:A4:FB:1F:C9:AD:9C:0B:86:0B:97:72:3F',
    );
  });

  it('keeps the React startup error screen in document flow', () => {
    const app = read('src/App.jsx');
    const startupScreen = app.slice(
      app.indexOf('const StartupErrorScreen'),
      app.indexOf('const LayoutWrapper'),
    );

    expect(startupScreen).toContain('className="min-h-screen');
    expect(startupScreen).not.toContain('className="fixed inset-0');
  });
});
