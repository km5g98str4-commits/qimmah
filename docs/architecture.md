# Qimmah — Architecture (internal)

Arabic-first (RTL) fitness app. **Frontend-only**, local-first, with optional cloud
backup/sync via Supabase. Wrapped for iOS with Capacitor 8.

> Refreshed for `integration/wave3`: adds the **sync queue** (`syncQueue.ts`),
> the **13-table** Supabase schema with RLS, the **recovery guard**, and the
> **design-v2 seam**. See the runtime diagram below.

## Runtime diagram (stores · sync · queue · auth · recovery · design-seam)

```mermaid
flowchart TB
  subgraph UI["UI — src/views/**"]
    seam{"isDesignV2()<br/>designPreview.ts"}
    seam -->|v1| v1["v1 views"]
    seam -->|v2| v2["TodayV2 · WorkoutV2 · ProgressV2<br/>NutritionV2 · OnboardingV2"]
  end
  subgraph LOCAL["Device stores — localStorage qimmah:*"]
    hs["historyStore.ts (HISTORY_KEYS ×8)"]
    cust["customization.ts"]; onb["onboarding.ts + draft"]; ach["achievements/engine.ts"]
  end
  v2 --> hs
  v2 --> cust
  subgraph SYNC["Sync — signed-in only"]
    q["syncQueue.ts<br/>enqueueSyncOperation · gate syncAllowedFor()"]
    svc["syncService.ts<br/>flushSyncQueue · hydrateFromCloud · startSyncLifecycle"]
    q --> svc
  end
  hs -->|auto-enqueue on write| q
  subgraph AUTH["Auth / isolation"]
    ac["authContext.tsx (Supabase GoTrue)"]
    rec["recoveryState.ts"]; scope["accountScope.ts wipeUserData"]
    ac --> rec; ac --> scope
  end
  ac -->|setSyncRuntime(uid, recoveryActive)| q
  ac -->|fullSync / lifecycle| svc
  subgraph CLOUD["Supabase — supabase/migrations/**"]
    tbl["13 tables · RLS own-row (auth.uid()=user_id)"]
    rpc["delete_own_account · handle_new_user"]
  end
  svc <-->|RLS-scoped upsert / hydrate| tbl
  ac --> rpc
```

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
- **Placeholder-only machines** → `/exercise-machine-images/{slug}.svg` (in-house original
  vector schematics; see `docs/content/MEDIA-RIGHTS.md`), else an elegant placeholder.
- **Other exercises** → static frames from `exerciseMedia.ts` (`/exercise-images/{slug}/`),
  resolved by candidate ids (as-is → canonical → legacy). GIF layer intentionally empty
  (watermark removal).

See also: `data-and-storage.md` isn't split out — storage/sync/auth/localization are below.

## Storage (local-first)
- All app data lives in `localStorage` under `qimmah:*` keys. **Wipe path** is now a
  prefix sweep with a global-safe allowlist: `accountScope.wipeUserData(userId?)`
  (also clears sync artifacts); `resetQimmah.ts` delegates to it. `reconcileAccountScope`
  wipes + reloads on account switch. Owner-scoped keys embed the uid (e.g. `activeSession`).
- **Permanent history:** `src/lib/historyStore.ts` (`HISTORY_KEYS`) — workout sessions,
  exercise history, daily logs, measurements, nutrition logs, water, supplements,
  medications. Idempotent migration from older keys on first run.
- **Day-scoped** (reset at local midnight): `nutritionToday`, `wellnessToday`,
  `commitmentsToday`, `today` — each mirrors into the permanent history on write.
- Reminders: `qimmah:reminders:v1` (`reminderPrefs.ts`) — local, device-specific.

## Cloud sync (`src/lib/syncQueue.ts`, `src/lib/syncService.ts`, `onboardingSync.ts`)
- **Queue (wave3):** every `historyStore` write auto-enqueues a sync op via
  `enqueueSyncOperation`/`enqueueSyncDelete`, gated by
  `syncAllowedFor(userId)` = `isSyncEnabled() && !recoveryActive && userId && runtime.userId===userId`.
  The queue persists in `localStorage` (per-owner `qimmah:syncQueue:v1:<uid>`), so nothing is lost offline.
- Opt-in, only when signed in. **Push:** `flushSyncQueue` → `upsert` with `onConflict` keys.
  **Pull:** `hydrateFromCloud`, every query `.eq('user_id', userId)` (defense-in-depth atop RLS).
  **Lifecycle:** `startSyncLifecycle` flushes on foreground/connectivity.
- **13 tables** (all keyed by `user_id`, RLS own-row): core (`…120002`) `profiles,
  workout_sessions, exercise_history, measurement_logs, daily_logs`; sync targets
  (`…120003`) `nutrition_logs, water_logs, supplement_logs, medication_logs, step_logs,
  achievements, custom_plans, todos`.
- Sync states (`SyncState`): `disabled | guest | idle | pending | syncing | synced | error`.
- **Recovery guard:** during `PASSWORD_RECOVERY` (`recoveryState.ts` / `authContext.recoveryActive`)
  the queue never captures and no wipe runs — three-layer guard.
- **Export/restore:** `snapshotForExport()` / `restoreSnapshot()` (see `DATA-EXPORT-DESIGN.md`).

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

## Design seam — v2.1 (`src/design-system/designPreview.ts`)
- Single flag `isDesignV2()` reads `[data-design="v2"]` on `<html>`. Views branch v1 ↔ v2
  on it (e.g. `WorkoutView` → `WorkoutV2`, `ProgressView` → `ProgressV2`).
- **Dev:** `?design=v2` / localStorage via `initDesignPreview()`. **Prod:** a
  `VITE_DESIGN_V2=true` build inlines it on everywhere (wave3 production switch).
- Tokens: `src/design-system/tokens.css` (IBM Plex Sans Arabic, ember/green under v2);
  v2 copy frozen in `src/design-system/v2/labels.ts`.

## Auth recovery (`src/lib/recoveryState.ts`)
- Password-reset deep links parsed by `parseRecoveryParams` / `isRecoveryUrl`;
  `shouldRouteToRecovery` + `decideResetPhase` drive the flow. `authContext.recoveryActive`
  pins the reset screen above all gates and disables sync + wipe until it clears.

## iOS / Capacitor
See `docs/ios-setup.md`. Key points: `capacitor.config.ts` (`com.qimmah.mobile`, webDir
`dist`), SW disabled on native, safe-area insets (`--safe-top`/`--safe-bottom`), camera
permission for the barcode scanner, Keyboard `resize:native`, deep-link URL scheme
`com.qimmah.mobile` (Info.plist `CFBundleURLTypes`).
