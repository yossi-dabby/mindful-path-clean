# Android startup diagnostics

Use the diagnostic build when the Google Play build opens to a blank screen. It installs beside the Play build as `me.mindfulpath.app.diagnostic` and enables Chrome WebView inspection only for this debug variant.

## Prepare and build on Windows

From PowerShell in the repository root:

```powershell
$env:VITE_BASE44_APP_ID = "69504b725a07f5aa75aeaf7d"
$env:VITE_BASE44_APP_BASE_URL = "https://app.mindful-path.me"
npm run android:build
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
```

The APK is created at `android\app\build\outputs\apk\debug\app-debug.apk`.

## Install beside the Play build

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
& $adb shell monkey -p me.mindfulpath.app.diagnostic -c android.intent.category.LAUNCHER 1
```

The installed app is labelled **Mindful Path Diagnostic**. The Play build (`me.mindfulpath.app`) remains installed and unchanged.

## Inspect the WebView

1. Keep the diagnostic app open on the device and connect the device with USB debugging enabled.
2. Open `chrome://inspect/#devices` in desktop Chrome.
3. Under `me.mindfulpath.app.diagnostic`, choose **inspect**.
4. Capture the first red Console error and the failed Network request, if any.

If React cannot mount, the app now shows a startup error instead of an empty white screen. If the Base44 authentication check stalls for 12 seconds, it shows a retry screen.
