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

## Native-readiness gaps (classified)

| Sev | Item | Detail / action |
|---|---|---|
| **HIGH** | Font loads from Google Fonts CDN | `index.html` `<link>` to `fonts.googleapis.com`. In a native WebView (local origin, offline first launch) Tajawal won't load → system fallback. **Self-host the font for native** (Tajawal is OFL, redistributable) — deferred here (no font files downloaded without authorization). Centralize via `--font-family-base`. |
| **MEDIUM** | No `@capacitor/status-bar` plugin | Status-bar style (light/dark text, overlay) is uncontrolled on native. Add + configure when a theme is approved. |
| **MEDIUM** | No `@capacitor/splash-screen` plugin | Uses default Capacitor splash; the React `SplashScreen` runs after. Native launch/splash assets pending Cloud Design. |
| **MEDIUM** | No signing team (`DEVELOPMENT_TEAM`) | Required to archive; founder/Apple-account task. Not set this phase. |
| **MEDIUM** | Icon/splash placeholders | Final assets pending Cloud Design (see APP-READINESS §7). |
| LOW | `.env.example` / package metadata branding | Cleaned earlier; keep an eye out for stale "Gym OS". |
| DEFERRED | Haptics, local notifications (prod), camera prompt copy, HealthKit, background tasks | Later native milestones; not this phase. |

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
