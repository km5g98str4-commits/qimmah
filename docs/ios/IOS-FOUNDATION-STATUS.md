# iOS / Capacitor Foundation — Status

Snapshot of the native foundation for the Qimmah iPhone app. Companion to
[`../ios-setup.md`](../ios-setup.md) (setup) and
[`../APP-READINESS.md`](../APP-READINESS.md) (store readiness).

## Verified this phase ✅

| Item | Value / result |
|---|---|
| Capacitor | 8.4.1 (`@capacitor/core`, `/ios`, `/cli`) + `@capacitor/local-notifications` 8.2.0 |
| `appId` | `com.qimmah.mobile` |
| `appName` | `Qimmah` |
| `webDir` | `dist` (matches the real Vite build output) |
| iOS platform | exists (`ios/`, SPM-based) |
| Bundle ID (pbxproj, Debug+Release) | `com.qimmah.mobile` — consistent |
| Deployment target | iOS 15.0 |
| `cap sync ios` | **succeeds** (copies web assets, writes Package.swift, updates plugins) |
| Web build | green (`tsc -b && vite build`) |
| Camera usage string | present (`NSCameraUsageDescription`, barcode) |
| Safe areas | `--safe-top`/`--safe-bottom` from `env(safe-area-inset-*)`; `viewport-fit=cover` set; used in `MobileShell` |
| RTL | `<html lang="ar" dir="rtl">`, logical properties in styles |

## Native-readiness done (Option B) ✅

| Item | What was done | Temporary? |
|---|---|---|
| **Font self-hosted** | Tajawal now bundled via `@fontsource/tajawal` (weights 400/500/700/800/900, Arabic+Latin subsets) in `src/design-system/fonts.ts`. **Google Fonts `<link>` removed from `index.html`.** No runtime CDN dependency (verified: 0 `googleapis`/`gstatic` refs in `dist`; 10 woff2 bundled ≈120 KB). Same family — **not** a typography change. | Font *family* still a Cloud Design decision; self-hosting the current font is not. |
| **Status bar wired** | `@capacitor/status-bar@8.0.2` via `src/lib/nativeShell.ts` (native-only, graceful no-op on web): `Style.Dark` (light text) for the current dark background; `overlaysWebView=false`; Android bg `#101216`. | **Yes** — values are temporary (current dark bg) pending Cloud Design. |
| **Splash screen wired** | `@capacitor/splash-screen@8.0.1`: `SplashScreen.hide()` after boot to avoid a lingering native splash. No final splash image. | Behavior only; final splash asset pending Cloud Design. |
| **cap sync** | Registered all 3 plugins; only `ios/App/CapApp-SPM/Package.swift` changed (auto-generated SPM manifest). No pbxproj/Info.plist/signing changes. | — |

## Remaining native-readiness gaps (classified)

| Sev | Item | Detail / action |
|---|---|---|
| **MEDIUM** | No signing team (`DEVELOPMENT_TEAM`) | Required to archive; founder/Apple-account task. Not set. |
| **MEDIUM** | Final icon/splash assets | Pending Cloud Design North Star (see APP-READINESS §7). Plugins are wired; assets are placeholders. |
| **PENDING** | Final status-bar/splash **values** | Wired with **temporary** dark values; final colors/style await approved Cloud Design tokens. |
| LOW | `.env.example` / package metadata branding | Cleaned earlier; watch for stale "Gym OS". |
| DONE / OWNER proof | Haptics + HealthKit steps | Compiles in Simulator; signed physical-device permission/sample/haptic checks remain OWNER. |
| DEFERRED | Background tasks | Later native milestone; current HealthKit refresh occurs on app launch after explicit opt-in. |

## How to work with the iOS project

```bash
npm run build          # produces dist/
npx cap sync ios       # copies dist → ios/App/App/public, updates Package.swift
npx cap open ios       # macOS only — opens Xcode
```

`ios/App/App/public`, `capacitor.config.json`, Pods/DerivedData are git-ignored;
the native project sources ARE tracked. `cap sync` does **not** dirty tracked files.

## Environment limitation (honest)

This foundation was verified on **Linux — no Xcode / no iOS Simulator**. Therefore
the app was **not** built or run on iOS/Simulator here. Structural checks done:
config validity, `cap sync` success, Info.plist keys, bundle ID, deployment target.
Building/running in Xcode + Simulator is the founder's next verification on macOS.

## Wrapper-risk note (App Store 4.2 "minimum functionality")

The app is a rich React product (workouts, nutrition, progress, reminders) inside
Capacitor with a native plugin (local notifications) — not a thin website wrapper.
To stay clearly native-grade: self-host fonts, control the status bar, native
splash, and honor safe-areas/keyboard (foundation present). Track in APP-READINESS.
