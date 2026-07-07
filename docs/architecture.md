# Qimmah — Architecture (internal)

Arabic-first (RTL) fitness app. **Frontend-only**, local-first, with optional cloud
backup/sync via Supabase. Wrapped for iOS with Capacitor 8.

## Stack
- React 18 + TypeScript (strict) + Vite + Tailwind CSS.
- Hash routing (no router library) — `src/lib/appRoutes.ts`.
- lucide-react icons via a curated map (`src/lib/icons.ts`), tree-shaken.
- Capacitor 8 (iOS platform, Swift Package Manager — no CocoaPods).

## Entry & providers
`src/main.tsx` mounts:
```
ErrorBoundary → LanguageProvider → AuthProvider → CustomizationProvider → <App/> + <SplashScreen/>
```
- Service Worker registers **web only** (`!Capacitor.isNativePlatform()`), production only.
- `registerStepBridge()` is a seam for a future native step source (no active sensor).

## Routing & guards (`src/App.tsx`, `src/lib/appRoutes.ts`)
- Hash routes (`#/dashboard`, `#/nutrition`, …). Unknown `#/xyz` → NotFound.
- **`guardRoute(route, userId)`** is the single gate. Account-required routes
  (all MAIN_TABS + `exercises`, `stats`, `setup`, `settings`, `calc`, `demo`*) redirect a
  logged-out user to `start`. Authenticated-but-not-onboarded → `setup`. (*`demo` route was
  removed in hardening; the guard entry is harmless.)
- Views are `React.lazy` code-split; each tab has its own `Suspense` skeleton so the shell
  stays mounted during chunk load.
- Account-first flow: app opens to **Sign Up / Log In only** (`StartView`); onboarding
  (`SetupView` → `PlanBuilder`) runs **only after** an account exists. No guest mode.

## State management
Two complementary layers:
1. **React Context** for cross-cutting state: `authContext`, `customizationContext`,
   `LanguageContext`.
2. **Module-level stores** via `useSyncExternalStore` for day-scoped tracking so all
   components stay in sync without prop drilling: `nutritionTracking`, `wellnessTracking`,
   `commitmentTracking`, `today`, `useTodos`, `useAchievements`. Each keeps a real cache and
   a demo cache keyed by `useIsDemo()` (defaults `false`).

## Data flow (a logged item)
```
UI action (e.g. QuickMealLogger.addLog)
  → module store setState (nutritionTracking)
      → saveNutritionToday()           // day-scoped key, resets at midnight
      → saveNutritionLog(date, {...})  // permanent history (historyStore), incl. loggedFood totals
  → useSyncExternalStore re-renders all subscribers
  → (later) syncService pushes history rows to Supabase (if signed in)
```
Weekly summaries (`statsSummary`, `MyStatsView`, `ProgressView`) read from the **permanent
history store**, so data survives the daily reset.

## Calculations (`src/lib/calculators.ts`)
- **BMR:** Mifflin-St Jeor (sex constant +5 / −161 / −78).
- **TDEE:** BMR × (NEAT multiplier + trainingDays × 0.025), capped 1.9 — NEAT separated from
  training to avoid double-counting.
- **Targets:** cut = TDEE − 400 (floored by sex), bulk = TDEE + 300. Protein 1.8 g/kg,
  fat 27% of kcal, carbs = remainder. Weekly rate/ETA derived from the same deficit/surplus
  via 7700 kcal/kg (`KCAL_PER_KG`). `computeTargets()` is the single source of truth;
  `CalorieExplainer` renders every step with the user's real numbers.

## Data (`src/data/*`)
- `exercises.ts` — exercise catalog + `LEGACY_EXERCISE_ID_MAP` + `PLACEHOLDER_ONLY_*`.
- `foodItems.ts` + `saudiFoods.ts` — food DB (incl. 130 Saudi regional dishes, per-100g).
- `workoutTemplates.ts` — the 4 machine-only programs.
- `machineCatalog.ts`, `machineHowTo.ts`, `machineAlternatives.ts`.
- `supplements.ts`, `medications.ts` — tracking-only, no recommended doses, safety notes.

## Exercise media (`src/components/ExerciseMedia.tsx`)
- **Placeholder-only machines** → `/exercise-machine-images/{slug}.jpg` (curated machine
  photos), else an elegant placeholder.
- **Other exercises** → static frames from `exerciseMedia.ts` (`/exercise-images/{slug}/`),
  resolved by candidate ids (as-is → canonical → legacy). GIF layer intentionally empty
  (watermark removal).

See also: `data-and-storage.md` isn't split out — storage/sync/auth/localization are below.

## Storage (local-first)
- All app data lives in `localStorage` under `qimmah:*` keys. Canonical list:
  `src/lib/resetQimmah.ts` (`QIMMAH_KEYS` + prefix sweep for per-account keys).
- **Permanent history:** `src/lib/historyStore.ts` (`HISTORY_KEYS`) — workout sessions,
  exercise history, daily logs, measurements, nutrition logs, water, supplements,
  medications. Idempotent migration from older keys on first run.
- **Day-scoped** (reset at local midnight): `nutritionToday`, `wellnessToday`,
  `commitmentsToday`, `today` — each mirrors into the permanent history on write.
- Reminders: `qimmah:reminders:v1` (`reminderPrefs.ts`) — local, device-specific.

## Cloud sync (`src/lib/syncService.ts`, `onboardingSync.ts`)
- Opt-in, only when signed in. **Push:** `upsert` with `onConflict` keys
  (`user_id,local_id` / `user_id,exercise_id` / `user_id,date`).
- **Pull:** every query is `.eq('user_id', userId)` (defense-in-depth atop RLS).
- Tables: `profiles`, `workout_sessions`, `exercise_history`, `measurement_logs`,
  `daily_logs`. All keyed by `user_id`.
- Sync states: `disabled | guest | idle | pending | syncing | synced | error`.

## Auth (`src/lib/authContext.tsx`, `supabaseClient.ts`)
- Supabase email/password. `getSupabase()` lazy-loads the SDK after first paint.
- Boot failsafe: an 8s timeout lifts the loading gate so a stalled session never traps the
  user on a spinner.
- **Email-verification guard** (defense-in-depth): unverified email → `VerifyEmailView`.
- **Account deletion:** `deleteAccount()` calls the `delete_own_account` RPC
  (security-definer, no service-role in client), best-effort deletes all 5 user-owned tables
  by `user_id`, signs out; the UI then wipes all local data via `resetQimmah()`.
  See `docs/ios/milestone-4a-backend-privacy.md` for the required SQL/RLS.

## Localization (`src/i18n/*`, `src/config/strings.ts`)
- Two languages: `ar` (default, RTL) / `en` (LTR). `LanguageProvider` sets `dir`/`lang` and
  persists the choice.
- Strings: `getStrings(lang)` (`config/strings.ts`) + per-screen dicts in `i18n/dict/*`.
- **RTL discipline:** logical Tailwind properties only (`ms/me/ps/pe/text-start/text-end/
  start/end`) — 0 physical `left/right` classes in the codebase.

## iOS / Capacitor
See `docs/ios-setup.md`. Key points: `capacitor.config.ts` (`com.qimmah.mobile`, webDir
`dist`), SW disabled on native, safe-area insets (`--safe-top`/`--safe-bottom`), camera
permission for the barcode scanner.
