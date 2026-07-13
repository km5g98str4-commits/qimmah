# iOS native hardening — follow-ups for post-merge QA

Branch: `ios/native-hardening` (base `origin/integration/wave1` @ 2b2f0ad).
Author surface was limited to `ios/**`, `capacitor.config.ts`, `Info.plist`,
`.env.example`, `src/lib/deepLinkRecovery.ts`, additive `index.css`, docs.
Items below either touch files outside that surface (needing the owning agent /
post-merge QA to apply) or require **interactive** simulator control, which was
**denied** this session (`request_access` for Simulator → `user_denied`), so
they could not be tapped/typed live. Each item has an exact repro.

---

## A. HIGH — PWA install banner renders inside the native app (App Store risk)

**Observed (simulator screenshot `sim-01-launch.png`, `sim-03`):** the bottom
banner «ثبّت قِمّة على جهازك … من Safari: زر المشاركة ثم أضف إلى الشاشة الرئيسية»
renders on the native iOS welcome screen. A "install this web app" prompt inside
a shipped native app is a common App Store review rejection and is nonsensical
(the app is already installed).

**Root cause:** `InstallBanner`/`InstallPrompt` gate on `isStandalone()` /
`canPromptInstall()` (web PWA signals) but not on `Capacitor.isNativePlatform()`.

**Fix (outside my surface — `src/lib/pwa.ts` + the two banner components).**
This is already implemented on branch `design/v21-nutrition-assets`; the merge of
that branch resolves it. If that branch does not land first, apply:

```diff
# src/lib/pwa.ts
+import { Capacitor } from '@capacitor/core'
+/** Running inside the Capacitor native shell? Then the app is already "installed". */
+export function isNativePlatform(): boolean {
+  try { return Capacitor.isNativePlatform() } catch { return false }
+}
 export function isStandalone(): boolean {
   if (typeof window === 'undefined') return false
+  if (isNativePlatform()) return true
   const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
   return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
 }
 export function canPromptInstall(): boolean {
-  return deferredPrompt !== null
+  return !isNativePlatform() && deferredPrompt !== null
 }
```
Plus an explicit early guard `if (isNativePlatform() || standalone || dismissed) return null`
in both `InstallBanner.tsx` and `InstallPrompt.tsx` (after their hooks — not before,
to keep the Rules of Hooks intact).

**Verify:** rebuild → launch on simulator → welcome screen shows **no** install banner.

---

## B. MEDIUM — Deep-link uses a custom scheme; iOS shows an "Open in Qimmah?" prompt

**Done this branch:** `com.qimmah.mobile://` is registered (`Info.plist` →
`CFBundleURLTypes`) and routing is proven (`npm run test:reset-recovery` = 33/33,
incl. the `com.qimmah.mobile://reset?code=…` case; `deepLinkRecovery` init wired in
`main.tsx`; `AppDelegate` already forwards `open url` to Capacitor).

**Observation:** `xcrun simctl openurl booted "com.qimmah.mobile://reset?type=recovery"`
triggers the iOS system prompt **«فتح في "Qimmah"؟»** (screenshots `sim-02`, `sim-03`).
The prompt appearing *is proof the scheme is registered and iOS routed the URL to the
app* — but custom schemes always show this confirmation when opened from outside the
app (e.g. tapping the reset link in Mail/Safari), adding one tap of friction to the
password-reset flow.

**Recommendation (optional UX polish, needs a web domain + app entitlement):** add a
**Universal Link** (`applinks:qimmah.app` Associated Domain + an
`apple-app-site-association` file on the domain) and set
`VITE_RESET_REDIRECT_URL="https://qimmah.app/#/reset"`. Universal Links open the app
directly with **no** confirmation prompt. The custom scheme remains a valid fallback.

**Interactive QA (blocked this session):** tap **فتح** on the prompt and confirm the
app routes to the `#/reset` password screen.

---

## C. MEDIUM — Keyboard avoidance: live verification of `resize: 'native'`

**Done this branch:** added `@capacitor/keyboard` and configured
`Keyboard.resize: 'native'` (capacitor.config.ts). This shrinks the WKWebView frame
to the area above the keyboard, so sticky-bottom CTAs (onboarding footer, workout
bottom bar, save buttons) stay visible and the focused field is never covered. The
safe-area foundation is already solid: every header/footer/nav/CTA uses
`--safe-top`/`--safe-bottom` (`env(safe-area-inset-*)`), and `index.html` has
`viewport-fit=cover`.

**Interactive QA (blocked — Simulator control denied):** on a notched simulator,
focus each input and confirm the keyboard never covers the focused field or its
primary action, per surface:
- Login email/password (`LoginView`)
- Sign-up name/email/password (`LoginView` signup mode)
- Reset new-password (`ResetPasswordView`)
- Onboarding text/number steps + footer «التالي» (`SetupView`/`OnboardingV2`)
- Workout set steppers / weight & reps inputs (`WorkoutMode`)
- Nutrition search + manual add (`NutritionView` / `QuickMealLogger`)

If any surface still clips (unlikely with `resize: native`), the fix is additive CSS
using `env(safe-area-inset-bottom)` / a keyboard-aware container — no view-file edit
required. Capture before/after screenshots.

---

## D. MEDIUM — Local notification live-fire

**Done this branch (audit):** `@capacitor/local-notifications` is installed + synced;
`src/lib/reminders.ts` is correct — iOS-only, permission requested only on explicit
user enable, a single daily-repeating reminder (`schedule.on {hour,minute}, repeats:true,
allowWhileIdle:true`) with a stable id, fail-safe try/catch, cancel-on-disable. No
Info.plist usage string is required for local notifications. `simctl push` to
`com.qimmah.mobile` was accepted ("Notification sent"), confirming the presentation
pipeline for this bundle.

**Interactive QA (blocked):** in-app, open Progress → enable the workout reminder →
grant the iOS permission prompt → set the time a minute ahead → background the app →
confirm the banner fires. (`xcrun simctl` cannot drive the app UI to reach the
enable toggle, and cannot inject the WebView `localStorage` reminder prefs reliably.)

---

## E. LOW — External links live-tap

**Done this branch (audit):** all external links use `<a target="_blank"
rel="noopener noreferrer">`; there is no same-frame external navigation
(`location.href = http…`) and no `server.allowNavigation` in the Capacitor config.
Capacitor's default WKWebView navigation delegate therefore opens external `_blank`
links in the **system browser** and blocks external in-WebView navigation. No config
change was needed.

**Interactive QA (blocked):** tap a "watch guide" video link (e.g. in `WorkoutMode`
/ `ExerciseDetail`) and confirm it opens in Safari and the app WebView stays on the
current screen.

---

## Splash note (informational)

The base (`wave1`) shipped the default **white Capacitor-logo** splash. This branch
replaced it with the dark-surface + Ember Ascent splash and darkened the LaunchScreen
storyboard background (kills the white flash) + added SplashScreen plugin config
(`launchAutoHide:false`, dark `backgroundColor`, `fadeOutDuration`). The same Ascent
splash asset also lands via `design/v21-nutrition-assets` — the two are identical in
intent; on merge, keep one copy of `Splash.imageset`.
