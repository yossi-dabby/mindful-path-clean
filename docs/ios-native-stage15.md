# שלב 15 — iOS Native

## סטטוס ביצוע

| תחום | מצב |
|---|---|
| פרויקט Xcode | נוצר ונשמר תחת `ios/App/App.xcodeproj` |
| Bundle ID | `me.mindfulpath.app` |
| Signing | Automatic Signing מוגדר; בחירת Team מתבצעת ב-Xcode בלבד |
| Capacitor Sync | App, Keyboard ו-RevenueCat מסונכרנים באמצעות Swift Package Manager |
| Simulator | תשתית ופקודות מוכנות; הרצה דורשת macOS ו-Xcode |
| מכשיר אמיתי | תשתית ופקודות מוכנות; נדרש Apple Developer Team ומכשיר רשום |
| Safe Areas ומקלדת | מיושם ב-CSS וב-`IOSNativeBridge` |
| Apple IAP Sandbox | חיבור RevenueCat, שחזור ואימות שרת מוכנים במצב fail-closed |
| iPhone ו-iPad | מטריצת WebKit אוטומטית + מטריצת Xcode ידנית |

## דרישות סביבת macOS

- macOS עם Xcode עדכני.
- Node.js 22 ומעלה.
- חשבון Apple Developer.
- iPhone או iPad לבדיקת מכשיר אמיתי.
- הרשאות App Store Connect ו-RevenueCat לבדיקות רכישה.

## יצירה וסנכרון

הפרויקט כבר נוצר. לאחר כל שינוי Web:

```bash
npm install
npm run ios:build
npm run ios:open
```

`ios:build` בונה את Vite ומריץ `cap sync ios`. אין להריץ שוב `ios:add` כל עוד התיקייה `ios/` קיימת.

## Bundle ID וגרסאות

- Bundle ID: `me.mindfulpath.app`
- שם מוצר: `Mindful Path`
- יעד מינימלי: iOS 15
- משפחות מכשירים: iPhone ו-iPad
- גרסת שיווק התחלתית: `1.0`
- Build התחלתי: `1`

לפני העלאה נוספת ל-App Store Connect יש להגדיל `CURRENT_PROJECT_VERSION`.

## Signing ב-Xcode

1. פתח `ios/App/App.xcodeproj`.
2. בחר Target בשם **App**.
3. פתח **Signing & Capabilities**.
4. השאר **Automatically manage signing** מסומן.
5. בחר את ה-Development Team של Mindful Path.
6. ודא שה-Bundle Identifier הוא `me.mindfulpath.app`.
7. ודא שאין שגיאת Provisioning Profile.
8. אין לשמור תעודות, קובצי `.p12`, מפתחות או פרופילים בריפו.

## Build על Simulator

1. ב-Xcode בחר Scheme בשם **App**.
2. בחר אחד מהמכשירים שבמטריצה.
3. בחר Product → Clean Build Folder.
4. הרץ באמצעות ⌘R.
5. ודא שהאפליקציה עולה ללא מסך לבן וללא שגיאות Runtime.

אפשר גם:

```bash
npm run ios:run
```

## Build על מכשיר אמיתי

1. חבר iPhone או iPad ל-Mac.
2. אשר Trust במכשיר והפעל Developer Mode אם נדרש.
3. בחר את המכשיר כ-Run Destination.
4. ודא שנבחר Team ושהמכשיר רשום בפרופיל.
5. הרץ באמצעות ⌘R.
6. אשר את מצב הפיתוח במכשיר אם iOS מבקש זאת.
7. בדוק פתיחה, Login, צ'אט, העלאת קובץ, רקע/חזרה ושינוי כיוון.

## Safe Areas ומקלדת

היישום כולל:

- `viewport-fit=cover`.
- שימוש ב-`safe-area-inset-top/right/bottom/left`.
- מדידת `visualViewport`.
- טיפול ב-`keyboardWillShow`, `keyboardDidShow`, `keyboardWillHide` ו-`keyboardDidHide`.
- גלילת שדה הקלט הפעיל לאזור גלוי.
- שמירת `--native-keyboard-height` ו-`--app-viewport-height`.
- רענון שאילתות וחידוש mutations בעת חזרה לחזית.

בדיקה ידנית:

1. פתח את הצ'אט.
2. הקלד טקסט ארוך בעברית ובאנגלית.
3. ודא שהקלט וכפתור השליחה אינם מוסתרים.
4. סגור ופתח את המקלדת מספר פעמים.
5. סובב Portrait ↔ Landscape כשהמקלדת פתוחה.
6. ודא שהכותרת והניווט אינם מתחת ל-notch או ל-home indicator.

## Apple IAP Sandbox

### App Store Connect

1. צור App Record עם Bundle ID `me.mindfulpath.app`.
2. צור Auto-Renewable Subscription.
3. Product ID: `mindful_path_premium_monthly`.
4. צרף אותו ל-Subscription Group.
5. השלם מחיר, לוקליזציה ומידע לביקורת.
6. ודא שההסכמים, המס והבנקאות פעילים.
7. צור Sandbox Tester שאינו Apple ID רגיל המשמש לרכישות.

### RevenueCat

1. חבר את אפליקציית Apple ל-RevenueCat.
2. הוסף את המוצר `mindful_path_premium_monthly`.
3. חבר אותו ל-Entitlement בשם `premium`.
4. הוסף אותו ל-Current Offering כחבילה חודשית `$rc_monthly`.
5. הגדר את המפתח הציבורי של Apple:
   `VITE_REVENUECAT_APPLE_API_KEY`.
6. בצד השרת הגדר:
   - `REVENUECAT_SECRET_API_KEY`
   - `REVENUECAT_ENTITLEMENT_ID=premium`
   - `REVENUECAT_ALLOWED_PRODUCT_IDS=mindful_path_premium_monthly`

### פתיחת החיוב

רק לאחר אימות המוצרים והחשבונות:

```env
VITE_SUBSCRIPTIONS_ENABLED=true
VITE_NATIVE_BILLING_ENABLED=true
VITE_REVENUECAT_APPLE_API_KEY=appl_...
```

ללא כל התנאים האלו הרכישה נשארת חסומה בכוונה.

### תרחישי Sandbox חובה

- רכישה חדשה.
- ביטול חלון הרכישה ללא חיוב.
- Restore Purchases לאחר התקנה מחדש.
- אותו משתמש ב-iPhone וב-iPad.
- חידוש Sandbox.
- תפוגה וביטול.
- כשל רשת ו-Retry.
- בדיקת Premium רק לאחר `verifyNativeEntitlement`.
- אימות שהרשומה נשמרת עם `store=app_store` ו-`environment=sandbox`.

## מטריצת מכשירים

| מכשיר | כיוון | בדיקה |
|---|---|---|
| iPhone SE דור 3 | Portrait | מסך קטן, מקלדת, גלישה |
| iPhone 15 Pro | Portrait | notch ו-safe areas |
| iPhone 15 Pro | Landscape | מקלדת ושינוי כיוון |
| iPad Pro 11 | Portrait | פריסת טאבלט |
| iPad Pro 11 | Landscape | פריסה רחבה וניווט |

בדיקת WebKit האוטומטית:

```bash
npm run test:e2e:ios:matrix
```

הבדיקה מאמתת את מעטפת הבית, overflow, שינוי כיוון, הצ'אט והמקלדת, העלאת TXT וחזרה מאירועי lifecycle. היא משלימה את בדיקת Xcode אך אינה מחליפה Simulator או מכשיר אמיתי.

## שער סגירה

שלב 15 נסגר לחלוטין רק כאשר כל אלה ירוקים:

- Build ב-Xcode Simulator.
- Build והפעלה על iPhone אמיתי.
- Build והפעלה על iPad אמיתי.
- רכישה ושחזור ב-Apple Sandbox.
- מטריצת WebKit.
- Build, Typecheck, Lint ובדיקות הארכיטקטורה.
