# Qimmah — iOS / Capacitor setup (internal)

## Overview
- **Capacitor 8** (`@capacitor/core` + `@capacitor/ios` deps, `@capacitor/cli` devDep).
- iOS project uses **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`) — **no
  CocoaPods**, so `cap add/sync` works on non-macOS too (only opening Xcode needs a Mac).
- Config: `capacitor.config.ts` → `appId: com.qimmah.mobile`, `appName: Qimmah`,
  `webDir: dist`.
- Deployment target iOS 15; `CODE_SIGN_STYLE = Automatic` (Team set in Xcode on a Mac).

## Build & sync workflow
```
npm run build          # produces dist/
npx cap sync ios       # copies dist → ios/App/App/public, updates Package.swift
npx cap open ios       # macOS only — opens the Xcode project
```
Regenerated/native artifacts are git-ignored (`ios/.gitignore`): `App/App/public`,
`capacitor.config.json`, Pods/DerivedData/xcuserdata. The native project sources ARE tracked.

## Service Worker on native
Registered **web-only** (`src/main.tsx`): `import.meta.env.PROD && !Capacitor.isNativePlatform()`.
Inside the native WebView, Capacitor serves assets locally; a SW would fight the shell cache.

## Safe areas (`src/styles/index.css`)
- `--safe-top: env(safe-area-inset-top)` — applied to sticky headers (MobileShell, AppNav,
  WorkoutMode) so content clears the notch/status bar under `viewport-fit=cover`.
- `--safe-bottom: env(safe-area-inset-bottom)` — applied to the bottom tab nav, install
  prompt, and workout action bar (home-indicator clearance).
- Both resolve to `0` on the web — no web impact.

## Permissions (Info.plist)
- **`NSCameraUsageDescription`** — barcode scanner (`@zxing/browser` via `getUserMedia`).
  Only permission requested. No motion/location/photo permissions.

## Camera flow
`NutritionView` → `ScanFoodPanel` → `BarcodeCamera` (zxing) → Open Food Facts lookup
(`openFoodFacts.ts`, returns `found | not-found | network-error`). Offline is handled with an
honest error state; barcode results are cached.

## Known iOS follow-ups (see backlog)
- App icons + splash (currently Capacitor defaults) — needs the official 1024px asset, then
  `@capacitor/assets`.
- Signing Team must be set in Xcode with an Apple Developer account.
- Keyboard behavior (WKWebView default resize) — evaluate `@capacitor/keyboard` if inputs
  get obscured on device.
- Optional native polish: `@capacitor/status-bar`, `@capacitor/local-notifications`
  (see `docs/ios/milestone-4b-local-reminders-design.md`).

## Related docs
- `docs/ios/milestone-4a-backend-privacy.md` — Supabase deletion RPC, RLS, privacy labels.
- `docs/ios/milestone-4b-local-reminders-design.md` — local reminders design.
