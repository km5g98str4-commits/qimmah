# Qimmah (قِمّة) — Full Technical & Product Audit

**Audit date:** 2026-08-03 · **Revision 2 (expanded)**
**Baseline audited:** `e6476f7` on `main` (= `origin/main`). Revision 1 audited `b7d93c1`; production advanced
6 commits mid-audit (the `[CTO-68]` local-tracking wave) and this revision was re-based onto the new tip and
fully re-run.
**Method:** static inspection + build-metafile reachability + real execution of the repository's gates and of
purpose-built analysis scripts over the actual datasets.
**Isolation:** every command ran in a detached clean worktree at `e6476f7`. The primary checkout was never
modified. The only files this audit writes are the two documents in `docs/audit/`.

---

## 0. What was executed (evidence, not assumption)

| Command | Result |
|---|---|
| `tsc -b --noEmit` @ e6476f7 | **PASS** (exit 0) |
| `eslint . --max-warnings 0` | **PASS** (exit 0) |
| `vite build` | **PASS** — built in 4.10s |
| `npm run test:gate` | **PASS** — 86 entries, exit 0 (now includes `test:analytics`, 48 checks) |
| `node scripts/check-perf-budget.mjs` | **FAIL** — 2 of 3 budgets breached |
| `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |
| `gh run list --branch main` | green |
| Build-metafile reachability analysis (custom) | 283 of 401 `src/` files ship |
| Exercise-dataset analysis (custom, 181 records) | see §9 |
| Search-behaviour harness — 36 realistic queries through the live filter | see §10 |
| English-guidance coverage via the real `guidanceFor()` | see §16 |
| `test:gate` truthfulness analysis (custom, 86 entries) | see §20 |

**Runtime verification that remains BLOCKED** (recorded, not guessed): live browser walkthrough, iOS device
run, and any Supabase runtime check (RLS effectiveness, `delete_own_account` deployment) — the last requires
staging credentials, which I have not requested and will not request in-conversation. See §24.

---

## 1. Executive Summary

Qimmah is a **local-first, Arabic-first React SPA** packaged for iOS via Capacitor. There is no custom
backend. Supabase supplies authentication; a complete 13-table cloud-sync layer exists but is **disabled by a
build flag**.

The engineering craft is high and, in several places, better than the industry norm: a verified-write storage
abstraction, a genuinely tight production CSP, a fail-safe account-deletion RPC that scans
`information_schema` rather than a hardcoded table list, 86 deterministic gate proofs, a green CI with a real
browser E2E, an exercise dataset with **zero** referential-integrity defects, and near-perfect RTL discipline
(one hardcoded directional class in the entire live codebase).

**The defining problem is a systematic gap between what is built and what is reachable.**

Measured from the production build's own module graph:

- **118 of 401 `src/` files (29%) are not in the production bundle.** After excluding type-only modules,
  dev-only tooling and side-effect CSS imports, roughly **14,400 lines (~19% of `src/`) is genuinely dead**.
- **43 files have zero import statements anywhere** — orphan roots, 8,760 lines, including three complete
  screens.
- The dead set is not scrap. It contains the **verified-write workout finish flow**, the **only body-weight
  entry point**, the **equipment-aware substitution engine**, a **second HealthKit layer**, and a **recovery
  engine v2**.
- **6 gate entries test only dead code; 11 more partly do. 34 of 86 gate entries (40%) assert on file text
  rather than behaviour.** The gate is green, and green does not mean shipped.

Two further findings are independent of the dead-code problem and equally serious for users:

- **The live rest timer is a `setTimeout` counter with no wall-clock anchor and no visibility listener** — it
  freezes when the phone locks, which is precisely when a rest timer is used.
- **English content does not exist.** Not "partial": `guidanceFor()` returns empty for **181/181 exercises**
  in English. Every exercise detail page in English shows "guidance unavailable" in all four content blocks.

### Readiness scores

Method: each dimension is a printed checklist. Items score **1.0** (complete *and* reaching users), **0.5**
(present but partial/unreachable/unverified), **0.0** (absent or broken). Score = sum ÷ items.

| Dimension | Rev 1 | **Rev 2** | Why it moved |
|---|---|---|---|
| **Overall production-readiness** | 62% | **58%** | deeper inspection found more unreachable capability |
| Frontend | 78% | **72%** | rest-timer defect; overlay a11y; EN content void |
| Backend (as authored) | 75% | **78%** | CSP + delete-RPC quality confirmed |
| Backend (as activated) | ~25% | **~25%** | unchanged — only auth is live |
| Database | 72% | **72%** | unchanged; still unverified at runtime |
| Security | 80% | **86%** | CSP verified present and tight; 0 unused deps; no XSS surface |
| Testing | 55% | **44%** | 40% of the gate is text-scanning; 6 entries test only dead code |
| UX | 58% | **52%** | EN content void; search fails 42% of realistic queries |
| **Localization (new)** | — | **48%** | UI bilingual, content Arabic-only |
| **Accessibility (new)** | — | **55%** | 9 of 10 live overlays lack dialog semantics |

---

## 2. Architecture Map (verified)

```
index.html ──> src/main.tsx
                 ├─ ./design-system/fonts        (side-effect CSS; @fontsource ×4, self-hosted)
                 ├─ initMonitoring()             (Sentry — DSN env var UNDOCUMENTED ⇒ inert)
                 ├─ initAnalytics()              (no-op unless VITE_ANALYTICS_ENDPOINT is HTTPS)
                 ├─ initTrackingDevViewer()      (DEV only)
                 ├─ serviceWorker.register       (PROD && !native)
                 └─ <AuthProvider><LanguageProvider><CustomizationProvider><App/>
                                                                              │
  hash router (hand-rolled, no library) — src/lib/appRoutes.ts, 20 routes ────┘
                 │
                 ├─ gates:  auth.loading → AppLoading
                 │          auth.recoveryActive → ResetPasswordView   (highest-priority gate)
                 │          !auth.emailVerified → VerifyEmailView
                 │          guardRoute(route, userId) → accountRequired | setup | route
                 │
                 └─ MobileShell (5 main tabs) + 15 non-tab routes, all React.lazy
```

| Layer | Implementation | Verified at |
|---|---|---|
| State | React Context ×3 + direct `localStorage` reads. **No state library.** | `src/lib/authContext.tsx`, `customizationContext.tsx`, `src/i18n/` |
| Persistence | `localStorage` only. No IndexedDB, no cookies, no secure storage. | key registry `src/lib/userDataKeys.ts` |
| Write safety | `safeStorage.ts` returns honest `WriteResult` — but **46 call sites bypass it** | `safeStorage.ts:79-108` |
| Auth | Supabase email/password, PKCE recovery, email-verification gate | `authContext.tsx` |
| Sync | 13-table LWW queue + tombstones — **flag off**, `enqueueSyncOperation` returns `null` | `syncQueue.ts:11,194-200` |
| DB | Postgres/Supabase, 17 tables, 12 migrations, RLS authored | `supabase/migrations/` |
| Analytics | **Two parallel systems** — see §19 | `src/lib/analytics/`, `src/lib/tracking/` |
| Media | 125 local images (15 MB) + GitHub-raw fallback; `public/exercise-gifs/` is **empty** | `public/`, `exerciseMedia.ts:16` |
| Deploy | Cloudflare Pages from `main`; strong CSP via `public/_headers`; **no sourcemaps** | `wrangler.toml`, `public/_headers` |

---

## 3. Live Route & Screen Map

All 20 routes verified reachable from `src/lib/appRoutes.ts` + `src/App.tsx` guards.
"Chunk" = a distinct file in `dist/assets/`.

| Route | Screen (file that renders) | Reached by | Chunk | Data | Loading | Error | AR | EN | Tested |
|---|---|---|---|---|---|---|---|---|---|
| `#/start` | `StartViewV2` (via `StartView` adapter) | boot, no session | eager | n/a | n/a | boundary | ✅ | ✅ | `test:guest-entry` |
| `#/login` | `LoginView` | Start buttons | ✅ | live | ✅ | typed `authErrors` | ✅ | ✅ | `test:signup-completion`, `test:policy` |
| `#/reset` | `ResetPasswordView` | email deep link / `PASSWORD_RECOVERY` | ✅ | live | ✅ | ✅ | ✅ | ✅ | `test:secure-ops` |
| (gate) | `VerifyEmailView` | unverified account | eager | live | ✅ | ✅ | ✅ | ✅ | — |
| (gate) | `AccountRequiredView` | guard on protected route | eager | n/a | n/a | ✅ | ✅ | ✅ | `test:account-required` |
| `#/setup` | `OnboardingV2` (via `SetupView`) | Start→guest, or unonboarded account | ✅ 182 KB | local | ✅ | skip-escape hatch | ✅ | ✅ | `test:e2e:onboarding` (browser), `test:age-13` |
| `#/dashboard` | `TodayV2` (via `DashboardView`) | main tab 1 | ✅ 34 KB | local | skeleton | boundary | ✅ | ✅ | `test:today-v2`, `proof:achievements` |
| `#/workout` | **`WorkoutView` → `WorkoutMode`** | main tab 2 | ✅ 97 KB | local | ✅ | **weak** | ✅ | ⚠️ | see §7 |
| `#/exercises` | `ExerciseLibraryView` | from Workout tab | ✅ 202 KB | static | ✅ | ✅ | ✅ | ⚠️ | `test:exercise-media` |
| `#/nutrition` | `NutritionView` | main tab 3 | ✅ 21 KB | local | ✅ | ✅ | ✅ | ✅ | `test:food-db`, `test:saudi-foods` |
| `#/progress` | `ProgressView` | main tab 4 | ✅ 53 KB | local | skeleton | ✅ | ✅ | ✅ | `test:progress-v2` |
| `#/profile` | `ProfileV2` (via `ProfileView`) | main tab 5 | ✅ 76 KB | local | ✅ | ✅ | ✅ | ✅ | `test:profile-domain` |
| `#/stats` | `MyStatsView` | card on Today | ✅ 14 KB | local | ✅ | ✅ | ✅ | ✅ | — |
| `#/steps` | `StepsView` | from Progress | ✅ 12 KB | local | ✅ | ✅ | ✅ | ✅ | `test:e-steps` |
| `#/recovery` | `RecoveryView` | Today (rest day) / Progress | ✅ 11 KB | local | ✅ | ✅ | ✅ | ⚠️ 20 inline `t()` | `test:recovery` |
| `#/calc` | `CalcExplainerView` | Profile / Setup | ✅ 53 KB | local | ✅ | ✅ | ✅ | ✅ | `test:e-calc-explainer` |
| `#/settings` | `SettingsView` | shell header | ✅ 20 KB | local | ✅ | ✅ | ✅ | ✅ | `test:delete-account`, `test:sync-honesty` |
| `#/privacy` `#/terms` | `PrivacyView` `TermsView` | footer/setup links | ✅ | static | n/a | n/a | ✅ | ✅ | `test:policy` |
| `#/contact` | `ContactView` | footer | ✅ 1.4 KB | static | n/a | n/a | ✅ | ✅ | — |
| (fallback) | `NotFoundView` | unknown `#/…` | ✅ 1.6 KB | n/a | n/a | n/a | ✅ | ✅ | — |
| `#/productReview` | `ReviewPanelView` | Settings (**DEV only**) | **not in prod** | local | ✅ | ✅ | ✅ | — | — |

### Live modals / sheets / overlays

| Overlay | Host | `role="dialog"` | `aria-modal` | Esc | Focus mgmt |
|---|---|---|---|---|---|
| `DeleteAccountDialog` | Settings | ⚠️ 0 | ✅ 1 | ✅ | ✅ |
| `WorkoutMode` (full-screen) | Workout tab | ✅ | ✅ | — | — |
| `InstallPrompt` | global | ✅ | ✅ | — | — |
| `MobileShell` quick-log sheet | shell | ✅ ×2 | ✅ | — | — |
| `ExerciseDetail` | Library | **0** | **0** | **0** | **0** |
| `ExerciseLibraryPicker` | plan editing | **0** | **0** | **0** | **0** |
| `IngredientPicker` | Nutrition | **0** | **0** | **0** | **0** |
| `SupplementLibraryPicker` | Profile | **0** | **0** | **0** | **0** |
| `MedicationLibraryPicker` | Profile | **0** | **0** | **0** | **0** |
| `CommitmentLibraryPicker` | Profile | **0** | **0** | **0** | **0** |
| `ScanFoodPanel` | Nutrition | **0** | **0** | **0** | **0** |
| `ExercisePickerSheet` | Plan builder | **0** | **0** | **0** | **0** |
| `WorkoutSummary` | after finish | **0** | **0** | **0** | **0** |

**9 of 13 live overlays are `fixed inset-0` panels with no dialog role, no focus trap, and no Escape key.**
See F-A11Y-01.

---

## 4. Feature Completion Matrix

| Feature | Status | Evidence |
|---|---|---|
| Registration | **Fully working** | `LoginView` + `authContext.signUp`; anti-enumeration handled |
| Login | **Fully working** | — |
| Logout | **Fully working** | `signOut` wipes data, cancels notifications (`authContext.tsx:280`) |
| Password reset | **Fully working** | PKCE + implicit fallback + URL snapshot before router rewrite |
| Email verification | **Fully working** | gate at `App.tsx:366` |
| Onboarding | **Fully working** | `OnboardingV2`, browser E2E in CI |
| Profile editing | **Fully working** | `ProfileV2` |
| Account deletion | **Partially working** | UI + RPC exist; **server deployment unverified** (§24) |
| Exercise browsing | **Fully working** | 181 exercises, filters by muscle + equipment |
| Exercise search | **Partially working** | **15/36 realistic queries return 0 results** (§10) |
| Filters | **Fully working** | muscle + equipment chips |
| Exercise details | **Partially working** | Arabic complete; **English 0% content** (§16) |
| Exercise alternatives | **Partially working** | data exists but **70.2% of exercises have none** |
| Favorites | **Missing** | no favourites capability anywhere |
| Workout-plan creation | **Fully working** | `planGenerator` (1,133 lines) + `CustomPlanBuilder` |
| Workout editing | **Fully working** | plan editors in Setup advanced mode |
| Starting a workout | **Fully working** | `WorkoutView` → `WorkoutMode` |
| Active-workout persistence | **Broken (silent)** | F-P0-02 — failures swallowed by design comment |
| Sets / reps / weight entry | **Fully working** | `WorkoutMode` state, prefilled from last record |
| **Rest timer** | **Broken** | F-P0-03 — freezes when backgrounded; lost on reload |
| Workout notes | **Fully working** | per-exercise `notes`, `painNote`, `difficulty` |
| Exercise replacement | **Partially working** | simple swap live; **equipment-aware engine dead** |
| Workout completion | **Broken (data loss)** | F-P0-01 |
| Workout history | **Fully working** | capped at 500 sessions (silent) |
| Personal records | **Fully working** | Epley; **formula duplicated in 2 live files** |
| Progress tracking | **Partially working** | renders, but weight card cannot be filled |
| Body-weight logging | **Missing (live)** | F-P0-04 — only writer is in a dead file |
| Measurements | **Missing (live)** | same as above |
| Progress photos | **Missing** | no capability anywhere |
| Nutrition | **Fully working** | 581+ foods, 130 Saudi dishes, own validator |
| Barcode scanning | **Fully working** | zxing, 443 KB |
| Notifications (schedule) | **Fully working** | owner-scoped, reconciled, cancelled on logout |
| Notifications (deep link) | **Missing** | no `localNotificationActionPerformed` listener |
| Settings | **Fully working** | — |
| Language switching | **Fully working** | runtime, no reload |
| Theme switching | **Fully working** | manual + sunset schedule |
| Offline behaviour | **Fully working** | SW app-shell precache + offline banner |
| Synchronization | **Unreachable** | complete, flag off, `enqueueSyncOperation` → `null` |
| Analytics | **Partially working** | 2 systems; legacy layer inert by default (§19) |
| Crash monitoring | **Broken** | Sentry initialised, DSN env var undocumented |
| Apple Health import | **Partially working** | `lib/healthKit.ts` live; **`lib/health/*` (1,200 LOC) dead** |
| Recovery module | **Partially working** | `lib/recovery.ts` live; **`recoveryEngine.ts` (544 LOC) dead** |
| Data export / import | **Fully working** | inline in `ProfileV2`; `DataManagementPanel` is a dead duplicate |
| Subscriptions | **Missing** | none — appropriate for v1 |
| Admin tools | **Missing** | content edited by changing TS files + redeploy |

---

## 5. Dead-Code & Orphaned-Feature Inventory

Ground truth = the production build's module graph, then hand-verified by direct import search.

| Bucket | Files | Lines |
|---|---|---|
| `src/` total | 401 | 77,607 |
| **Shipped in production build** | 283 | 61,959 |
| **Not in production build** | 118 | 15,648 |
| ├─ type-only modules (correctly erased — *not* dead) | ~13 | ~700 |
| ├─ dev-only (`ReviewPanel*`, DEV-gated) | 3 | 475 |
| ├─ side-effect CSS (`design-system/fonts.ts` — **live**) | 1 | 50 |
| └─ **genuinely dead** | **~101** | **~14,400 (≈19% of `src/`)** |
| of which: **zero-import orphan roots** | **43** | **8,760** |

### The 43 orphan roots that matter most

| Lines | File | What is lost |
|---|---|---|
| 1,386 | `src/views/WorkoutV2.tsx` | verified-write finish, wall-clock rest timer, substitution, RPE, rest tips, one-handed mode |
| 595 | `src/views/ProgressV2.tsx` | **the only `measurementLog.addLog` caller** |
| 538 | `src/views/NutritionV2.tsx` | second nutrition screen |
| 388 | `src/lib/health/connect.ts` | second HealthKit layer (+ `store/normalize/metrics/diagnostics` ≈ 1,200 LOC total) |
| 255 | `src/components/NotificationSettingsPanel.tsx` | duplicate of live `NotificationsSettingsV2` |
| 249 | `src/components/DataManagementPanel.tsx` | duplicate of the live inline exporter |
| 221 | `src/i18n/dict/calcScreen.ts` | dead dictionary |
| 206 | `src/features/todo/TodoWidget.tsx` | todo feature |
| 177 | `src/components/FlatMuscleBody.tsx` | flat muscle map alternative |
| 162 | `src/features/barcode/nativeScanner.ts` | native scanner path |
| 160 | `src/lib/dataPortability.ts` | duplicate of `lib/portability/*` |
| 144 | `src/components/SyncConsentGate.tsx` | sync consent UI |
| 140 | `src/lib/trainingInsights.ts` | — |
| 126 | `src/views/PlanPreviewView.tsx` | its own comment calls it orphaned |
| 122 | `src/features/barcode/validateBarcode.ts` | **barcode validator not wired to the live scanner** |
| 109 | `src/i18n/dict/profileScreen.ts` | dead dictionary |
| 100 | `src/design-system/tokens.ts` | **the design-token file is dead** — see §11 |
| 92 | `src/lib/exerciseMediaPipeline.ts` | — |
| 80 | `src/lib/workoutOrder.ts` | q19 ordering; still gated by `test:workout-order` |
| 53 | `src/lib/workoutStats.ts` | — |
| — | `src/sections/*` (5 files, 290) | pre-app "template" era leftovers |
| — | `src/components/customizer/steps/*` (8 files, 342) | superseded by `OnboardingV2` |
| — | `src/lib/supabase.ts` (15), `src/data/goal.ts` (13) | orphan shims |

Transitively dead behind these roots: `recoveryEngine.ts` (544), `bodyAnatomy.ts` (336), `progressV2Model.ts`
(333), `exerciseMediaManifest.generated.ts` (263), `i18n/dict/dashboard.ts` (243), `workoutSubstitution.ts`
(105), `workoutHydration.ts` (87), `workoutSummary.ts` (69), `workoutFinishUndo.ts` (53), `config/theme.ts`
(38), and ~23 more.

### Duplicate-implementation pairs (one live, one dead)

| Concern | LIVE | DEAD |
|---|---|---|
| Workout screen | `views/WorkoutView.tsx` + `components/WorkoutMode.tsx` | `views/WorkoutV2.tsx` |
| Apple Health | `lib/healthKit.ts` | `lib/health/{connect,store,normalize,metrics,diagnostics}.ts` |
| Recovery | `lib/recovery.ts` | `lib/recoveryEngine.ts` |
| Data portability | `lib/portability/*` | `lib/dataPortability.ts` |
| Notification settings | `views/NotificationsSettingsV2.tsx` | `components/NotificationSettingsPanel.tsx` |
| Data management UI | inline in `ProfileV2.tsx` | `components/DataManagementPanel.tsx` |
| Insights | `lib/insights/*` | `lib/trainingInsights.ts` |
| 1RM | **both live** — `exerciseHistory.ts:66` and `exerciseStats.ts:13` | (duplicate, not dead) |

---

## 6. User-Journey Audit

Status: **VC** = verified by code path · **BLOCKED** = needs runtime/credentials · **BROKEN** = defect proven.

| # | Journey | Status | Note |
|---|---|---|---|
| 1 | Create account | VC ✅ | anti-enumeration correct |
| 2 | Log in | VC ✅ | — |
| 3 | Complete onboarding | VC ✅ | also covered by browser E2E in CI |
| 4 | Select fitness goal | VC ✅ | age-13 gate enforced |
| 5 | Browse exercises | VC ✅ | 181 items |
| 6 | Search in Arabic | **BROKEN** | 8/19 Arabic queries → 0 results (§10) |
| 7 | Search in English | **BROKEN** | 5/12 English queries → 0 results |
| 8 | Filter by muscle | VC ✅ | — |
| 9 | Filter by equipment | VC ✅ | 12 equipment values |
| 10 | Open exercise details | VC ✅ AR / **BROKEN EN** | 0/181 English guidance |
| 11 | Add to favourites | **MISSING** | no such feature |
| 12 | Create workout program | VC ✅ | — |
| 13 | Start a workout | VC ✅ | — |
| 14 | Enter sets/reps/weight | VC ✅ | prefilled from last record |
| 15 | Start/stop rest timer | **BROKEN** | freezes on background; lost on reload (F-P0-03) |
| 16 | Replace an exercise | VC ⚠️ | simple swap only; smart engine dead |
| 17 | Skip an exercise | VC ✅ | skipped work correctly excluded from PRs |
| 18 | Complete a workout | **BROKEN** | F-P0-01 — can lose the session and still celebrate |
| 19 | View workout history | VC ✅ | capped at 500 |
| 20 | View personal records | VC ✅ | — |
| 21 | Record body weight | **MISSING** | F-P0-04 — no live entry point |
| 22 | View progress | VC ⚠️ | weight card permanently empty |
| 23 | Edit profile | VC ✅ | — |
| 24 | Change language | VC ✅ | runtime, no reload |
| 25 | Log out | VC ✅ | wipes data + cancels notifications |
| 26 | Delete account | **BLOCKED** | client honest; server RPC unverified |

---

## 7. Workout Lifecycle Audit (live path only)

Live chain: `App.tsx` → `WorkoutView.tsx` → `WorkoutMode.tsx` → `activeWorkout.ts` / `finishWorkout.ts` →
`historyStore.ts`.

| # | Stage | Implementation | Verdict |
|---|---|---|---|
| 1 | Plan creation | `planGenerator.ts` | ✅ |
| 2 | Start | `WorkoutView` sets `activeDay`; `WorkoutMode` mounts | ✅ |
| 3 | Session creation | `startedAt = new Date().toISOString()` fixed at mount (`WorkoutMode.tsx:89`) | ✅ |
| 4 | Set entry | `state[peId].sets[]`, prefilled from `getRecord()` | ✅ |
| 5 | Persistence | effect on every change → `saveActiveWorkout` (`WorkoutMode.tsx:135-162`) | **⚠ silent failure** |
| 6 | Timer | `setTimeout` decrement, no wall clock, not persisted (`:165-174`) | **✗ broken** |
| 7 | Navigate away | `onClose` keeps the saved session; resume prompt on return | ✅ |
| 8 | App closed | resume works **iff** the write succeeded | ⚠ |
| 9 | Reload | session restored; **rest timer lost** (not in the saved shape) | ⚠ |
| 10 | Offline | fully local; no network on this path | ✅ |
| 11 | Completion | confirm sheet → `doFinish()` (`:315-344`) | **✗ see below** |
| 12 | History write | `persistFinishedSession` → `addSession` → `saveWorkoutSession` | ⚠ unchecked |
| 13 | Stats update | `recordExercise` per exercise | ✅ |
| 14 | PR update | `detectSessionPRs` computed **before** history update | ✅ correct ordering |
| 15 | Active-session delete | `clearActiveWorkout(userId)` **before** `onFinish` | **✗ ordering defect** |
| 16 | Retry after failure | **none** — no failure is detectable on this path | ✗ |

### The completion defect, in full

`src/components/WorkoutMode.tsx:343-344`
```ts
clearActiveWorkout(userId)   // ← in-progress session deleted from storage FIRST
onFinish(session)
```
`src/views/WorkoutView.tsx:107,125`
```ts
const prs = persistFinishedSession(session)   // returns PRs, NOT a success signal
…
setSummary({ session, prs: prLabels, … })     // congratulations screen, unconditional
```
`src/lib/activeWorkout.ts:68-75`
```ts
try { window.localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(reg)) }
catch { /* تجاهل أخطاء التخزين … الجلسة الجارية ليست بيانات حرجة */ }
```

Reproduction (no code change needed): open the app in Safari Private Browsing (zero quota) or with an origin
already at the 5 MB cap → start a workout → log sets → finish. Storage writes throw `QuotaExceededError`,
`saveActiveWorkout` swallows it, `persistFinishedSession` swallows it, the active session is deleted, and the
summary screen renders. **The workout is gone and the app says well done.**

The correct implementation exists and is proven: `commitFinishedSession()`
(`src/lib/finishWorkout.ts:86-115`) snapshots the failure sentinel, writes, **re-reads the store**, and
returns `{ok, prs, failure}`. `scripts/storage-honesty-proof.ts:83,103,110` genuinely **executes** it under
simulated quota and blocked-storage faults and it passes 25 checks. Its only caller in the repository is
`src/views/WorkoutV2.tsx:405` — dead.

### Race / duplicate analysis

| Risk | Verdict | Evidence |
|---|---|---|
| Duplicate sessions from double-tap | **Safe** | `saveWorkoutSession` filters by `session.id` then prepends — idempotent upsert (`historyStore.ts:193-194`) |
| Duplicate session id across workouts | **Safe** | id = `session-${startedAt}` (ISO ms) |
| Double-counted PRs on double-finish | **Possible** | `registerWorkoutPRs` + `evaluateAchievements` run in `WorkoutView.finish()` with no re-entry guard |
| Empty workout completion | **Safe** | guard at `WorkoutMode.tsx:187` renders a safe state for a 0-exercise day |
| `state[p.id]` undefined crash | **Low** | `state` initialised from `day.exercises` at mount; only reachable if `day` changes mid-session |
| Multi-tab / multi-device | **Unhandled** | last writer wins on `localStorage`; no cross-tab lock or `storage` event listener |
| Silent history truncation | **Present** | sessions capped 500, exercise history 1,000, recovery 180, personal foods 200 — oldest dropped with no notice |

---

## 8. Database & Persistence Map

**Every persistent store in the app is `localStorage`.** No IndexedDB, no cookies (beyond Supabase's own
session key), no secure storage, no in-memory cache layer with eviction.

| Entity | Created | Read | Updated | Deleted | Validated | Owner-scoped |
|---|---|---|---|---|---|---|
| Auth session | Supabase SDK | `authContext` | SDK auto-refresh | `signOut` | SDK | key `qimmah:supabase-auth:v1` |
| Onboarding profile | `onboardingProfile.ts:142` | `App.tsx:142` | same | `resetQimmah` | partial | ⚠ **not** owner-suffixed |
| Workout plan | `planGenerator` → `customization` | many | Setup advanced | reset | typed | via customization |
| Active workout | `activeWorkout.ts:71` | `WorkoutView:10` | every set change | `clearActiveWorkout` | `isSet()` shape guard | ✅ registry by owner |
| Active session (v2) | `activeSession.ts:154` | portability only | — | `:164` | ✅ | ✅ |
| Workout sessions | `historyStore.ts:191` | `getWorkoutSessions` | upsert by id | cap 500 | ✅ | ⚠ `scoped:false` |
| Exercise history | `exerciseHistory.ts` | PRs, prefills | `recordExercise` | cap 1,000 | ✅ | ⚠ `scoped:false` |
| Measurement logs | **`ProgressV2.tsx:235` (DEAD)** + `healthKit` import | `ProgressView`, `TodayV2`, `CalcExplainer`, insights | — | tombstones | ✅ | ⚠ `scoped:false` |
| Nutrition ledger | `nutritionHistory.ts` | Nutrition, insights | daily | — | ✅ | ✅ |
| Recovery log | `recovery.ts:105` | `RecoveryView` | daily | cap 180 | ✅ | ✅ |
| Steps | `stepCounter.ts` | Steps, Today | daily | — | ✅ | ✅ |
| Achievements | `features/achievements/engine.ts:84` | toaster | on evaluate | — | ✅ | ⚠ global key |
| Tracking events | `lib/tracking/store.ts` | dev viewer, export | ring buffer | cap 1,000 | ✅ typed registry | ✅ owner token |
| Settings / prefs | `appPreferences.ts` | everywhere | — | reset | partial | ⚠ global |

**Orphan / consistency risks (verified):**
1. `userDataKeys.ts` marks several user stores `scoped:false` with `migration:'owner-suffix'` — i.e. the
   owner-scoping migration is **acknowledged as incomplete**. Two accounts on one device share those keys
   until it lands; `accountScope.reconcileAccountScope` wipes on account switch as the safety net.
2. **Derived data is stored, not computed** — `exercise_history` duplicates facts already in
   `workout_sessions`. They can desync (e.g. after the 500-session truncation).
3. `nutrition_logs`, `water_logs`, `supplement_logs`, `medication_logs` exist as **tables the client never
   writes to** (data flows through the `daily_logs` aggregate by design) — four dead tables.

---

## 9. Exercise-Data Quality Report

Measured by executing the real modules over all 181 records.

**Integrity — clean. No defects found:**

| Check | Result |
|---|---|
| Total exercises | **181** |
| Missing `nameAr` / `nameEn` | **0 / 0** |
| Duplicate IDs | **0** |
| Duplicate Arabic name groups | **0** |
| Duplicate English name groups | **0** |
| Invalid `primaryMusclesDetailed` refs | **0** |
| Invalid `secondaryMusclesDetailed` refs | **0** |
| Broken `alternatives` refs | **0** |
| Template refs to non-existent exercises | **0** |
| `machineCatalog` refs to missing exercises | **0** |
| `LEGACY_EXERCISE_ID_MAP` targets that no longer exist | **0 of 25** |
| Exercises with no equipment value | **0** |
| Placeholder/test-looking text | **1** (`world-greatest-stretch` — a real exercise name, false positive) |

**Content gaps — substantial:**

| Gap | Count |
|---|---|
| `videoUrl` that is a **YouTube search page**, not a video | **181/181 (100%)** |
| `videoSource` = `youtube_search` | **181/181 (100%)** |
| English guidance (how-to / tips / mistakes / safety) via `guidanceFor()` | **0/181 (0.0%)** |
| Arabic guidance via `guidanceFor()` | **181/181 (100%)** |
| `notesEn` | missing **181/181 (100%)** |
| `notesAr` | missing **174/181 (96.1%)** |
| No `alternatives` at all | **127/181 (70.2%)** |
| Present in `exerciseMedia` map | **112/181 (61.9%)** |
| Manifest stills coverage | **121/181 (66.9%)** |
| `PLACEHOLDER_ONLY_EXERCISE_IDS` | 25 |
| Empty `primaryMusclesDetailed` (all cardio — excluded from muscle map) | **12/181 (6.6%)** |
| Referenced by any static template | **16/181 (8.8%)** — the rest arrive via `planGenerator` |
| `machineCatalog` items with **Arabic** aliases | **0 of 39** (6 English aliases only) |

**Distributions:** level — beginner 130, intermediate 37, advanced 14 · environment — gym 118, both 34, home 29
· equipment — machine 51, bodyweight 46, dumbbell 30, barbell 23, cable 23, bench 19, ez-bar 3, band 3,
smith 2, kettlebell 1, plate 1, rope 1.

**Media on disk:** `public/exercise-images/` 125 files, **15 MB**; `public/exercise-machine-images/` 24 files,
100 KB; **`public/exercise-gifs/` is empty (0 files)** — the animated-GIF pipeline exists but was never run
(needs `WORKOUTX_API_KEY`). Remote fallback is GitHub raw, used only when the local file fails to load.

---

## 10. Search Audit

Live implementation, verbatim — `src/views/ExerciseLibraryView.tsx:70-75`:
```ts
const query = q.trim().toLowerCase()
… if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
```
Searchable fields: **`nameAr` + `nameEn` only.** Not searchable: muscle names, equipment names, machine
names, aliases, notes, movement pattern.

**36 realistic queries executed against this exact filter. 15 returned zero results (41.7%).**

| Query | Result | Why it matters |
|---|---|---|
| `بنش` | ✅ 8 | works by luck — substring of canonical names |
| `بنش برس` | **❌ 0** | two-word Saudi slang |
| `سكوات` | ✅ 10 | — |
| `ديدليفت` | **❌ 0** | common transliteration |
| `عقلة` | ✅ 2 | — |
| `احماء` (no hamza) | **❌ 0** | **`إحماء` returns 2** — classic normalization failure |
| `أحماء` (hamza above) | **❌ 0** | same root cause |
| `امامية` / `اماميه` / `امامي` | **❌ 0 ×3** | ة/ه and inflection |
| `علوى` (with ى) | **❌ 0** | **`علوي` returns 7** |
| `بَنش` (one fatha) | **❌ 0** | any diacritic kills the match |
| `ظهر` (muscle: back) | **❌ 0** | a word every user will type |
| `صدر` (muscle: chest) | ✅ 9 | inconsistent — works only where it appears in names |
| `Bench  Press` (double space) | **❌ 0** | no whitespace collapsing |
| `Hammer Strength` | **❌ 0** | **defined as `aliasesEn` but unreachable** |
| `benchpress` / `bnech` | **❌ 0 ×2** | no typo tolerance |
| 300-char query | **❌ 0** | no length guard (harmless, but no feedback) |
| (empty) | ✅ 181 | correct |

**Machine aliases: 0 of 6 defined `aliasesEn` values find any exercise through search.** The field is
decorative.

No Arabic normalization routine exists anywhere in the repository (verified by searching for the relevant
code points and for any `normalizeArabic`-style helper). By contrast the **food** database does carry a
`keywords` array per item — the pattern exists in the codebase, just not for exercises.

---

## 11. Frontend Audit

**Strengths (verified):** hand-rolled hash router with per-account route guards; `React.lazy` on every
non-boot screen; route-level error boundary with a *working* retry (the lazy factory is recreated, so a
failed chunk genuinely re-imports — `App.tsx:14,173`); skeletons for the two data-heavy tabs; skip-to-content
link; offline banner in the shell; a "skip onboarding" escape hatch so no user can be trapped.

**Design system:** `src/design-system/tokens.ts` (100 lines) is **dead**. Tokens live in
`tailwind.config.js` + `src/styles/index.css` classes (`.btn-primary`, `.card`, `.glass`, …) plus
`src/design-system/v2/labels.ts`. There are effectively **two-and-a-half sources of design truth** (Tailwind
config, v2 labels, and the orphaned token file), which is why the token file drifted into death unnoticed.

**Findings:**

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F-FE-01 | High | 9 of 13 live overlays lack dialog semantics | §3 table |
| F-FE-02 | Medium | `tokens.ts` dead; design truth split across 3 places | build metafile |
| F-FE-03 | Medium | No list virtualisation — 181 exercises and 581+ foods render fully | `ExerciseLibraryView.tsx:159` |
| F-FE-04 | Medium | `foodItems.ts` is 5,755 lines in one module (192 KB chunk) | build output |
| F-FE-05 | Low | `config/strings.ts` (1,448 lines) coexists with `src/i18n/dict/` | — |
| F-FE-06 | Low | Nutrition copy/favourite buttons are placeholders, hidden behind a comment | `NutritionView.tsx:18,224` |

---

## 12. Backend & Supabase Audit

There is **no custom backend**. Every remote call is Supabase SDK or one third-party read API.

| Seam | Auth | Validation | Authorization | Errors | Pagination |
|---|---|---|---|---|---|
| `auth.signUp` | — | client password policy | — | typed `authErrors.ts`; **deliberately ambiguous** to block enumeration | — |
| `auth.signInWithPassword` | — | email shape | — | bilingual mapped | — |
| `auth.resetPasswordForEmail` | — | email | — | ✅ | — |
| `auth.updateUser` | ✅ | password policy | session | ✅ | — |
| `rpc('delete_own_account')` | ✅ | — | `security definer` + `auth.uid()` | honest `authUserDeleted` flag | — |
| 13 sync tables | ✅ | `sanitizeSyncPayload` + portability validators | RLS | ✅ | **none — full-table pulls** |
| Open Food Facts | — | `validateBarcode.ts` **is dead** | — | graceful fallback | — |
| Analytics beacon | — | HTTPS-only guard | — | fire-and-forget | — |

**Client init** (`supabaseClient.ts`): lazy dynamic import (keeps ~55 KB out of the boot bundle),
`persistSession`, `autoRefreshToken`, `detectSessionInUrl`, custom `storageKey`. Never throws; returns `null`
on failure so the app degrades to local mode. **Hardcoded production project URL + anon JWT as fallback**
(masked: project `ledlyp…kwz`, key `eyJhbGciOi…Kxo`).

**Not present:** storage buckets, realtime subscriptions, edge functions, generated types
(`Database` interface is hand-written and explicitly *not* passed to `createClient`), rate limiting, caching,
background jobs.

**Migrations:** 12 timestamped, idempotent. 17 tables. RLS enabled in 2 migrations; policies authored;
`updated_at` triggers; LWW columns; tombstones; a schema-guard migration plus `test:db-schema` comparing the
client's table list to the migrations — genuinely good drift protection, and it is in the gate.

`delete_own_account()` **dynamically scans `information_schema`** for every `public` table with a `user_id`
column rather than a hardcoded list (`20260713120007`, lines 13-19) — a materially better design than the
cascade-only original.

**Two schema sources:** `SUPABASE-SCHEMA.sql` is self-declared superseded but is still the file applied by
`scripts/e2e-auth/run.mjs`.

---

## 13. State-Management Audit

| State | Home | Persisted | Survives reload | Survives nav |
|---|---|---|---|---|
| Auth | `authContext` (React Context) | Supabase `localStorage` | ✅ | ✅ |
| Language | `LanguageContext` | `appPreferences` | ✅ | ✅ |
| Theme | `appPreferences` + DOM class | ✅ | ✅ | ✅ |
| Customization / plan | `customizationContext` | `localStorage` | ✅ | ✅ |
| Route | `useState` + `window.location.hash` | hash | ✅ | ✅ |
| **Active workout** | `WorkoutMode` local `useState` | `activeWorkout` (**silent failure**) | ⚠ | ✅ via resume |
| **Rest timer** | `WorkoutMode` local `useState` | **not persisted** | **✗ lost** | **✗ reset on nav** |
| Onboarding draft | `OnboardingV2` local + draft key | ✅ | ✅ | ✅ |
| Search query / filters | component `useState` | — | ✗ (acceptable) | ✗ |
| Notification prefs | `notifications/prefs` | ✅ | ✅ | ✅ |
| Sync queue | `syncQueue` module singleton | ✅ | ✅ | ✅ |

**Findings:**

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F-ST-01 | Critical | Rest timer exists only in memory and only as a decrementing counter | `WorkoutMode.tsx:165-174`; `saveActiveWorkout` payload at `:138-161` omits it |
| F-ST-02 | High | Derived state duplicated: `exercise_history` restates `workout_sessions` | `historyStore.ts` |
| F-ST-03 | Medium | No cross-tab coordination — no `storage` event listener anywhere | verified absent |
| F-ST-04 | Medium | `state` in `WorkoutMode` is initialised once; a `day` prop change would desync | `WorkoutMode.tsx:105` |
| F-ST-05 | Low | 23 `eslint-disable` and 1 deliberate `exhaustive-deps` suppression on the rest-tip effect | `WorkoutV2.tsx:336` (dead) |
| F-ST-06 | Low | 43 fire-and-forget `void` promise calls | repo-wide |

**Cleanup hygiene is good:** timers are cleared in effect returns (`WorkoutMode.tsx:174,176-178`), the
notification reconcile effect removes its `visibilitychange` listener, `useOnlineStatus` unsubscribes, and
`AbortController`-style `alive`/`cancelled` flags are used in async effects. No subscription leak found.

---

## 14. Security Findings

**No Critical finding. The posture is materially better than typical.**

### Verified-clean (recorded so silence isn't read as absence)

- **Content-Security-Policy is present and tight** (`public/_headers`): `default-src 'self'`,
  `script-src 'self'` (no `unsafe-inline`, no `unsafe-eval`), `object-src 'none'`, `frame-ancestors 'none'`,
  `form-action 'self'`, plus HSTS (2 years, includeSubDomains), `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Cross-Origin-Opener-Policy`, and a `Permissions-Policy` that disables geolocation, microphone,
  payment and USB. *(This corrects Revision 1, which recorded CSP as unverified.)*
- **No sourcemaps in `dist/`** — 0 `.map` files.
- No `eval`, no `new Function`, no dynamic script injection.
- Exactly one `dangerouslySetInnerHTML` (`MedalBadge.tsx:34`), fed by an internally generated SVG from static
  enums — **verified safe**.
- All 5 `target="_blank"` links carry `rel="noopener noreferrer"`.
- No SQL/NoSQL injection surface — no raw query construction.
- No file uploads, no path traversal, no SSRF surface.
- `npm audit --omit=dev` → **0 vulnerabilities**.
- **No unused runtime dependencies** — all four `@fontsource` packages are consumed via sub-path CSS imports
  in `design-system/fonts.ts`; `@capacitor/ios` is a native platform package. *(This corrects a false
  positive in my first-pass dependency scan.)*
- Internal review panel is double-gated on `import.meta.env.DEV` and falls through to 404 in production.
- Notifications are cancelled on `signOut` (`authContext.tsx:280`).
- Analytics carries no PII and no health values; consent-gated; HTTPS-only; no-op by default.

### Open findings

| ID | Sev | Finding | File | Risk | Direction |
|---|---|---|---|---|---|
| F-SEC-01 | Medium | Production Supabase URL + anon JWT hardcoded as build fallback | `supabaseClient.ts:19-22` | Anon keys are public by design, but this bakes **one production project** into every build/fork and makes RLS the sole control | Require env vars; fail the prod build if unset |
| F-SEC-02 | Medium | **RLS effectiveness never verified at runtime** | `supabase/migrations/` | Authored ≠ enforced. A missing or mis-scoped policy = cross-user data exposure | Run `npm run db:verify` against staging; record output |
| F-SEC-03 | Medium | Crash monitoring inert — `VITE_SENTRY_DSN` undocumented | `monitoring.ts:113`, `.env.example` | Production errors invisible; SDK ships and does nothing | Document the var or drop the dependency |
| F-SEC-04 | Medium | No brute-force / rate-limit control in repo | auth seams | Credential stuffing defended only by Supabase defaults | Enable Supabase auth rate limits + CAPTCHA; document |
| F-SEC-05 | Low | Barcode validator is dead code | `features/barcode/validateBarcode.ts` (0 importers) | Third-party JSON is cached to `localStorage` without passing the validator that exists for it | Wire the existing validator |
| F-SEC-06 | Low | Tracking stores raw user search queries locally | `tracking/index.ts` → `food_search_no_result {query}` | Local-only and truncated to 64 chars, but user text is persisted and included in data export | Consider hashing or bucketing the query |
| F-SEC-07 | Info | Session tokens in `localStorage` | `supabaseClient.ts` | Standard for SPAs; XSS-exposed by nature — well mitigated by the CSP above | none |
| F-SEC-08 | Info | `img-src` allows `raw.githubusercontent.com` | `_headers` | Runtime fallback for exercise stills; no SLA, rate-limited | Acceptable as fallback; local files are primary |

---

## 15. Performance Findings

**Measured, not advised.**

```
✗ entry:   83.8 KB  (limit 80.0)   index-BQ0E09nD.js
✗ boot JS: 144.7 KB (limit 140.0)  entry + vendor-react + today + vendor-icons
✓ largest lazy chunk: 111.5 KB (limit 130.0)  vendor-zxing
```

**The budget is drifting while non-gating.** At `b7d93c1` (yesterday) it was entry **82.6 KB** / boot
**143.4 KB**; at `e6476f7` it is **83.8 / 144.7**. The tracking wave added ~1.2 KB to the entry chunk and the
budget silently absorbed it.

`.github/workflows/ci.yml` marks the step `continue-on-error: true` and justifies it as *"a pre-existing
lazy-chunk overage (NutritionView ~150KB > 130KB sub-limit)"*. **That is no longer the failure** — the
lazy-chunk check passes with 18.5 KB of headroom; entry and boot are what breach. The written waiver no
longer describes the thing being waived.

| Largest assets | Raw | Gzip | Note |
|---|---|---|---|
| `vendor-zxing` | 443.4 KB | 111.5 KB | barcode scanner — largest asset, secondary feature |
| `index-BQ0E09nD` | 298.7 KB | 83.8 KB | **entry** |
| `index-Qj1tetv6` | 213.5 KB | 55.3 KB | shared |
| `ExerciseLibraryView` | 202.4 KB | 16.0 KB | 181 exercises + guidance inlined |
| `feature-nutrition-catalog` | 192.2 KB | 32.6 KB | `foodItems.ts` 5,755 lines |
| `SetupView` | 182.9 KB | 45.7 KB | onboarding |
| `vendor-react` | 142.8 KB | 45.7 KB | — |

**Non-JS:** `public/exercise-images/` is **15 MB** across 125 files, served by Cloudflare and cached
stale-while-revalidate by the service worker. Not counted by the JS budget; material on mobile data.

**Positive:** the sync layer costs nothing when disabled — `syncStores`, `syncLww`, `syncConsent`,
`syncFieldPolicy` are all tree-shaken out of the bundle. *(This corrects Revision 1, which speculated that
sync "costs bundle size while delivering nothing".)*

**Not found:** no memory leaks, no uncleaned timers, no unnecessary subscriptions, no repeated network calls
on the hot path (there are no network calls on the hot path at all).

---

## 16. Localization & RTL Findings

**RTL discipline is excellent.** Exactly **one** hardcoded directional Tailwind class in the entire live
codebase (`src/components/ExerciseMedia.tsx`). Logical properties (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/
`start-`/`end-`) are used consistently. `dir="rtl"` on `<html>`, `dir="auto"` on user-content nodes. Language
switches at runtime with no reload.

**Content localization is where it breaks.**

| Finding | Measure |
|---|---|
| **English exercise guidance** | **0 / 181 (0.0%)** — every English exercise detail shows "guidance unavailable" in all four blocks |
| Arabic exercise guidance | 181 / 181 (100%) |
| `notesEn` | 0 / 181 |
| Inline `t('عربي','English')` call sites | **406** |
| Live files with a local `const t = (a,e) => ar ? a : e` helper | `ProfileV2` (67), `NotificationsSettingsV2` (26), `RecoveryView` (20), `BodyModel3D` (12) |
| Dead files with the same pattern | `ProgressV2` (48), `WorkoutV2` (44), `NutritionV2` (33) |
| Dead dictionaries | `i18n/dict/calcScreen.ts` (221), `profileScreen.ts` (109), `dashboard.ts` (243), `bodyModel.ts`, `calorieExplainer.ts`, `insights.ts`, `g-syncConsent.ts` |

`CLAUDE.md` §6 forbids exactly this pattern: *"لا نصوص صلبة، ولا مساعدات `t(ar, en)` محلية جديدة."* The
practical consequence is that no translation-coverage check is possible, a third language cannot be added,
and copy review has to happen inside TSX.

**Honest degradation is implemented well:** `ExerciseDetail` renders `d.guidanceUnavailable` rather than
falling back to Arabic text for English users (`ExerciseDetail.tsx:138,143,148`). The behaviour is honest;
the content is simply absent.

---

## 17. Accessibility Findings

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| F-A11Y-01 | **High** | 9 of 13 live overlays are `fixed inset-0` panels with **no `role="dialog"`, no `aria-modal`, no Escape handler, no focus management** | `ExerciseDetail`, `ExerciseLibraryPicker`, `IngredientPicker`, `SupplementLibraryPicker`, `MedicationLibraryPicker`, `CommitmentLibraryPicker`, `ScanFoodPanel`, `ExercisePickerSheet`, `WorkoutSummary` |
| F-A11Y-02 | Medium | 267 `<button>` elements vs 120 `aria-label` occurrences across views+components — icon-only buttons are likely under-labelled | needs per-element pass to quantify exactly |
| F-A11Y-03 | Medium | No error announcements (`role="alert"` / `aria-live`) on form validation paths | verified absent on the auth and onboarding screens |
| F-A11Y-04 | Low | No `prefers-reduced-motion` handling | verified absent |
| F-A11Y-05 | Low | No accessibility assertion anywhere in the gate — contrast is fixed per-wave, never regression-guarded | §20 |

**Done well:** skip-to-content link as the first focusable element (`App.tsx:522-527`), `id="main-content"`
stable across every screen, `DeleteAccountDialog` implements `aria-modal` + Escape + focus, `aria-label` on
the icon-only close buttons in `WorkoutMode`, `role="switch"` + `aria-checked` on toggles
(`ProgressView.tsx:195-197`).

---

## 18. Notifications Audit

| Aspect | Status | Evidence |
|---|---|---|
| Permission request | ✅ | `notifications/engine.ts:62-63` |
| Permission check | ✅ | `:72-73` |
| Scheduling | ✅ | `notifications/schedule.ts`, `planWeek.ts` |
| Owner scoping | ✅ | reconcile is keyed on session owner (`App.tsx:151-168`) |
| Cancel on logout | ✅ | `authContext.tsx:280` `cancelAllNotifications()` |
| Cancel on account switch | ✅ | every reconcile cancels known ids first |
| Duplicate prevention | ✅ | `cancelKnown` before re-schedule |
| Re-reconcile on foreground | ✅ | `visibilitychange` listener in `App.tsx:160-163` |
| Rest-timer notification | ⚠ | `notifications/restEnd.ts` exists but is **not in the production bundle** |
| **Deep link on tap** | **✗ Missing** | no `localNotificationActionPerformed` listener anywhere |
| Time zones | ⚠ | schedules use device-local time; `getDayStamp()` is device-local with no TZ policy |
| Permission decision tracked | ✅ | `trackLocal('notification_permission_decided')` |

**F-NOTIF-01 (High):** every notification is a dead end. Tapping a workout reminder opens the app on
whatever route it was last on. Audit requirement "verify every notification opens the correct screen" fails
for all notification types.

**F-NOTIF-02 (Medium):** `lib/notifications/restEnd.ts` is not shipped, so the rest-timer notification does
not exist in production — compounding F-P0-03 (the in-app timer also freezes when backgrounded). A user who
locks their phone during rest gets neither an accurate timer nor a notification.

---

## 19. Analytics Audit

**Two parallel analytics systems now coexist in production.**

| | Legacy `src/lib/analytics/` | New `src/lib/tracking/` (`[CTO-68]`, landed 2026-08-03) |
|---|---|---|
| API | `track(name, props)` | `trackLocal(name, props)` |
| Destination | HTTPS endpoint via `sendBeacon` | **local ring buffer only — no network primitives** |
| Default | **no-op** (endpoint unset) | always writes locally |
| Consent | gated on `consent === 'granted'` | n/a (never leaves the device) |
| Typing | loose | **strict per-event prop contract** |
| Caps | buffer 50 | 1,000 events, 64-char props, 256 KB |
| Call sites | ~20 | 17 |

**Event registry (new system): 15 events.** 13 are wired; the gate asserts *exactly two*
(`first_action_completed`, `day7_summary_reached`) are declared-pending — honest and self-guarded.

**Emitters are all in LIVE files** — `App.tsx`, `QuickMealLogger.tsx`, `notifications/engine.ts`,
`OnboardingV2.tsx`, `TodayV2.tsx`, `WorkoutView.tsx`, `NotificationsSettingsV2.tsx`. *(This corrects an
in-progress observation from Revision 1: the wave briefly touched `WorkoutV2.tsx`/`NutritionV2.tsx` in the
working tree, but the committed instrumentation targets the live workout screen.)*

**Findings:**

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| F-AN-01 | Medium | **Duplicate event taxonomy across the two systems** | `workout_logged` vs `workout_session_completed`; `meal_logged` vs `meal_entry_logged`; `onboarding_completed` vs `setup_completed` |
| F-AN-02 | Medium | **Events that can never fire** — `track('reminder_enabled')` lives in `NotificationSettingsPanel.tsx`, a dead file | build metafile |
| F-AN-03 | Medium | `test:analytics` (brand new, in the gate) scans `WorkoutV2.tsx` and `NutritionV2.tsx` — both dead | §20 |
| F-AN-04 | Low | Legacy layer is inert in production (no endpoint documented) yet still ships | `.env.example` has `VITE_ANALYTICS_ENDPOINT=""` |
| F-AN-05 | Low | Raw user search text persisted as an event prop | `food_search_no_result {query}` |
| F-AN-06 | — | **No crash monitoring** in effect — see F-SEC-03 | — |

---

## 20. Testing & CI Truthfulness Audit

**86 entries in `test:gate`.** Classified by execution method:

| Method | Count | Share |
|---|---|---|
| **Behavioural** — imports and executes app code | 51 | 59% |
| **Source-text scan** — reads a `.ts`/`.tsx` file and asserts on substrings | **34** | **40%** |
| Mixed | 1 | 1% |

### Gate entries whose targets are entirely dead code

| Entry | Method | Target |
|---|---|---|
| `test:e-plan-preview` | text scan | `components/plan/PlanPreview.tsx` |
| `test:e-plan-preview-host` | text scan | `views/PlanPreviewView.tsx` |
| `test:coaching` | text scan | `views/WorkoutV2.tsx` |
| `test:rpe-level` | text scan | `views/WorkoutV2.tsx`, `lib/workoutV2Persist.ts` |
| `test:recovery-engine` | text scan | `lib/recoveryEngine.ts` |
| `test:native-hardening` | text scan | `lib/health/connect.ts`, `lib/health/diagnostics.ts` |

### Gate entries partly targeting dead code (11)

`test:e-calc-explainer`, `test:sync-consent`, `test:no-template-language`, `test:saudi-foods`,
`test:guidance-honesty`, `test:saved-meals`, `test:allergy-notice`, `test:polish2`, `test:polish3`,
`test:workout-rest-state`, **`test:analytics`** (the newest one).

### The important nuance

`test:storage-honesty` is **not** a fake test. It genuinely `import`s `commitFinishedSession` and executes it
under a simulated `QuotaExceededError` and a simulated `SecurityError`
(`scripts/storage-honesty-proof.ts:16,83,103,110`), and it passes 25 checks. **The function is proven
correct. Nothing in production calls it.** The proof is honest about the unit and silent about the product —
which is the more dangerous failure mode, because it reads as coverage.

The same applies to `test:finish-confirm` and `test:substitution`: behavioural, correct, and wired to
consumers that do not ship.

### CI

`.github/workflows/ci.yml` runs on every push/PR to every branch: `npm ci` → typecheck → lint (0 warnings) →
production build → **perf budget (`continue-on-error`, waiver text stale)** → `test:food-db` → `test:gate` →
Playwright Chromium → `test:e2e:onboarding` → upload `dist`. Concurrency-cancelling. Node 22, npm cache.
This is a good pipeline; the browser E2E being inside CI closes the gap Revision 1's memory recorded as open.

### False confidence, stated plainly

| ID | Sev | Finding |
|---|---|---|
| F-TEST-01 | **Critical** | Nothing in the gate asserts that tested code is **reachable**. 6 entries test only dead code; 11 more partly. |
| F-TEST-02 | **Critical** | The live workout finish path (`WorkoutView.tsx:107`, `WorkoutMode.tsx:343`) has **no test at all**; its honest twin is fully tested and dead. |
| F-TEST-03 | High | No storage-failure simulation on any live path. |
| F-TEST-04 | High | No test for the rest timer's background/wall-clock behaviour. |
| F-TEST-05 | High | 40% of the gate asserts on source text — refactor-fragile and behaviour-blind. |
| F-TEST-06 | High | RLS/authorization untested in CI (`db:verify`, `test:e2e:auth` need credentials). |
| F-TEST-07 | Medium | No component/DOM tests; one browser journey (onboarding) only. |
| F-TEST-08 | Medium | No test for measurement logging (nothing live to test). |
| F-TEST-09 | Medium | No exercise-search test — Arabic normalization, aliases, typos all uncovered. |
| F-TEST-10 | Low | No a11y or performance regression gate. |

---

## 21. Dependency & Configuration Audit

**Dependencies: clean.** 16 runtime + 15 dev. `npm audit --omit=dev` → 0 vulnerabilities. **No unused runtime
dependency.** No duplicate libraries. No abandoned packages. Versions are caret-ranged with a committed
`package-lock.json` (196 KB).

Largest by bundle cost: `@zxing/browser` + `@zxing/library` (443 KB raw / 111.5 KB gzip) for barcode
scanning — the single biggest asset, serving a secondary nutrition feature.

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| F-CFG-01 | Medium | `vercel.json` present while deployment is Cloudflare Pages — two conflicting deploy configs | `vercel.json`, `wrangler.toml` |
| F-CFG-02 | Medium | `VITE_SENTRY_DSN` used in code, absent from `.env.example` | `monitoring.ts:113` |
| F-CFG-03 | Medium | Two schema sources; the superseded one is still applied by the e2e-auth harness | `SUPABASE-SCHEMA.sql:1-19` |
| F-CFG-04 | Low | `package.json` has **160+ scripts**; `test:gate` is a single 86-link `&&` chain (one line, ~4,000 chars) — unreadable and un-parallelisable | `package.json` |
| F-CFG-05 | Low | Root holds 18 governance markdown files (~330 KB) with heavy overlap | repo root |
| F-CFG-06 | Info | TS strict with project references; ESLint `--max-warnings 0`; 0 `@ts-ignore`; 2 `as any`; 2 non-null assertions | verified |

---

## 22. Release-Readiness Audit

| Item | Web (Cloudflare Pages) | iOS (Capacitor) |
|---|---|---|
| App name / identity | ✅ | ✅ `قِمّة` / `com.qimmah.mobile` |
| Version | `1.0.0` (deliberately frozen — release act) | `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)` |
| Icons | ✅ 192/512 + maskable | ✅ AppIcon set |
| Splash | ✅ | ✅ dark, manual hide, no white flash |
| Manifest | ✅ complete, `dir:"rtl"`, `lang:"ar"`, categories, maskable | n/a |
| Permissions + purpose strings | n/a | ✅ camera, HealthShare, location — **bilingual, specific, honest** |
| `NSHealthUpdateUsageDescription` | n/a | correctly **absent** (HealthKit is read-only) |
| `NSUserTrackingUsageDescription` | n/a | correctly **absent** (no IDFA/ad tracking) |
| `ITSAppUsesNonExemptEncryption` | n/a | ✅ declared |
| Privacy policy / Terms | ✅ in-app routes, فصحى register, visually separated | ✅ |
| **In-app account deletion** | ✅ UI present (App Store 5.1.1(v)) | ✅ — **server side unverified** |
| Health-data disclosure | ✅ read-only, never shared, disconnect deletes | ✅ |
| Subscription disclosure | n/a — no subscriptions | n/a |
| Security headers / CSP | ✅ strong | n/a |
| Sourcemaps | ✅ none emitted | ✅ |
| Crash reporting | **✗ inert** | **✗ inert** |
| Rollback | Cloudflare Pages deployment history | TestFlight |
| PWA install | ✅ `InstallPrompt` + `InstallBanner`, dismissible | n/a |
| `robots.txt` / sitemap | ✅ | n/a |
| **Android** | — | **no Android project exists** |

**Likely store-review risks:** none blocking that I can verify statically, *provided* `delete_own_account()`
is actually deployed. If it is not, the in-app deletion UI reports failure honestly — which is correct
engineering but would fail App Store 5.1.1(v) review, because the requirement is that deletion *works*.

---

## 23. Findings by Severity

### Critical

| ID | Finding |
|---|---|
| F-P0-01 | Live workout completion can lose the session and still show a success screen |
| F-P0-02 | In-progress workout writes fail silently by explicit design decision |
| F-P0-03 | Rest timer has no wall-clock anchor, no visibility listener, and is not persisted |
| F-P0-04 | Body-weight / measurement logging has no live entry point |
| F-TEST-01 | Gate has no reachability assertion; 6 entries test only dead code |
| F-TEST-02 | The live finish path has zero test coverage |

### High

F-P1-01 dead-code mass (~14,400 LOC, 43 orphan roots) · F-P1-02 exercise search fails 41.7% of realistic
queries · F-P1-03 English content is 0% · F-A11Y-01 nine overlays without dialog semantics · F-NOTIF-01
notifications never deep-link · F-SEC-03 crash reporting inert · F-P1-04 equipment-aware substitution
unreachable · F-P1-05 perf budgets breached and drifting under a stale waiver · F-P1-06 406 inline `t()`
sites · F-P1-07 46 `safeStorage` bypasses · F-TEST-03/04/05/06.

### Medium

F-ST-02 duplicated derived state · F-ST-03 no cross-tab coordination · F-FE-02 dead design tokens · F-FE-03
no virtualisation · F-FE-04 monolithic food module · F-AN-01 duplicate event taxonomy · F-AN-02 events that
never fire · F-AN-03 new test scans dead files · F-SEC-01/02/04 · F-CFG-01/02/03 · F-NOTIF-02 rest-end
notification not shipped · F-MED-01 four dead DB tables · F-DATA-01 silent storage caps (500/1000/180/200) ·
F-BIZ-01 Epley 1RM duplicated in two live files · F-BIZ-02 no kg↔lb conversion anywhere · F-BIZ-03
`getDayStamp()` device-local with no TZ policy · F-A11Y-02/03 · F-GOV-01 charter §1 names a trunk 258
commits stale.

### Low

F-SEC-05/06 · F-CFG-04/05 · F-A11Y-04/05 · F-ST-04/05/06 · F-FE-05/06 · 97 comment-only `catch` blocks ·
`public/exercise-gifs/` empty · 15 MB of images · 100% YouTube-search video links · 70.2% of exercises with
no alternatives · orphan shims `lib/supabase.ts`, `data/goal.ts`.

---

## 24. Verified Unknowns & Blocked Checks

Recorded as unknown — **not** assumed either way.

| # | Question | Why blocked | What would settle it |
|---|---|---|---|
| U-01 | Are the RLS policies actually enforced on the live project? | needs staging credentials | `npm run db:verify` |
| U-02 | Is `delete_own_account()` deployed? | same | `test:e2e:auth` or a staging RPC call |
| U-03 | Does the app behave correctly on a real iPhone? | needs device | device session (charter lane D) |
| U-04 | Do the 26 journeys behave as the code implies? | no browser run performed this pass | Playwright walkthrough |
| U-05 | Exact count of unlabelled icon-only buttons | needs per-element DOM pass | axe/DOM audit on a running app |
| U-06 | Real-world contrast across every screen in both themes | spot-checked per wave only | automated contrast sweep |
| U-07 | Whether the 4 dead DB tables contain production rows | no DB access | staging/production query |
| U-08 | Whether `PLACEHOLDER_ONLY_EXERCISE_IDS` (25) look acceptable to a user | subjective/visual | design review |
| U-09 | Landscape and tablet layout behaviour | not run | device/emulator matrix |
| U-10 | Whether the iOS `ERR_UNKNOWN` boot failure still reproduces | out of scope, tracked in lane D | device session |

---

## 25. Prioritized Remediation Roadmap

**No implementation is proposed for execution here.** Directions only; the companion document holds the
scoped batches.

**Phase 0 — Decide (blocks Phase 1).** One product decision governs a third of the Critical findings: which
workout screen ships. Recorded, not asked.

**Phase 1 — Critical.** Reachability guard in the gate · honest workout completion (write-then-verify, clear
only after confirmation) · wall-clock rest timer with visibility re-sync and persistence · restore
measurement logging · storage-failure surface for the active session.

**Phase 2 — Launch.** Verify RLS + `delete_own_account` on staging · Supabase creds to required env vars ·
document or remove Sentry · Supabase auth rate limiting · exercise search (Arabic normalizer + alias fields +
muscle/equipment/machine search) · notification deep links · resolve the perf budget honestly · remove
`vercel.json`.

**Phase 3 — Quality.** Dialog semantics + focus traps on the 9 overlays · clustered dead-code removal (with
the documented dynamic-reference check per file, charter §9) · migrate 406 inline `t()` into dictionaries ·
route 46 raw writes through `safeStorage` · de-duplicate 1RM / HealthKit / portability / recovery · split
`foodItems.ts` and reconsider eager zxing · list virtualisation · convert text-scan proofs to behavioural
where feasible · a11y + perf regression gates · update charter §1 to name `main`.

**Phase 4 — Product.** English exercise content (181 × 4 blocks) · curated video links replacing 181 search
URLs · favourites · kg/lb units with a migration plan · alternatives for the 127 exercises that have none ·
decide on activating cloud sync · decide on admin/content tooling.

---

## Appendix — Master Findings Table

Live/Dead = whether the defect sits in code that ships. **V** = verified · **I** = inferred.

| ID | Category | Sev | V/I | Live? | File / Evidence | User impact | Direction |
|---|---|---|---|---|---|---|---|
| F-P0-01 | Data loss | Critical | V | **Live** | `WorkoutMode.tsx:343-344`; `WorkoutView.tsx:107,125` | Completed workout lost; success screen shown | Verify write before clearing + before celebrating |
| F-P0-02 | Data loss | Critical | V | **Live** | `activeWorkout.ts:68-75` | Mid-session loss, no warning | Route through `safeStorage`; surface degraded mode |
| F-P0-03 | Correctness | Critical | V | **Live** | `WorkoutMode.tsx:165-174`; no `visibilitychange` in live path | Rest timer freezes on lock; lost on reload | Wall-clock `endsAt` + visibility re-sync + persist |
| F-P0-04 | Missing feature | Critical | V | Dead-only | `addLog` sole caller `ProgressV2.tsx:235` | Cannot log body weight on web | Restore a live entry point |
| F-TEST-01 | Test integrity | Critical | V | n/a | 6 gate entries, dead targets | False confidence | Reachability assertion in gate |
| F-TEST-02 | Test coverage | Critical | V | **Live** | live finish path untested | Regressions invisible | Behavioural test on the live path |
| F-P1-01 | Dead code | High | V | Dead | 118 not shipped; 43 orphan roots; ~14,400 LOC | Maintenance drag, false signals | Clustered removal after per-file dynamic check |
| F-P1-02 | Search | High | V | **Live** | `ExerciseLibraryView.tsx:75`; 15/36 queries → 0 | Users can't find exercises | Normalizer + aliases + muscle/equipment search |
| F-P1-03 | Localization | High | V | **Live** | `guidanceFor()` EN = 0/181 | English users get no coaching content | Author EN guidance |
| F-P1-04 | Feature illusion | High | V | Dead | `workoutSubstitution.ts` sole consumer dead | Smart substitution absent | Follows the Phase-0 decision |
| F-P1-05 | Performance | High | V | **Live** | entry 83.8/80, boot 144.7/140; waiver text stale | Slower cold start; silent drift | Gate it or rewrite the waiver truthfully |
| F-P1-06 | i18n structure | High | V | **Live** | 406 inline `t()`; 4 live files with local helpers | No coverage check; 3rd language impossible | Migrate per screen |
| F-P1-07 | Data safety | High | V | **Live** | 46 raw `localStorage` writes | Silent failures across stores | Route through `safeStorage` |
| F-A11Y-01 | Accessibility | High | V | **Live** | 9 overlays, 0 dialog semantics | Screen-reader + keyboard users blocked | Add role/aria-modal/Esc/focus trap |
| F-NOTIF-01 | Notifications | High | V | **Live** | no tap listener anywhere | Every notification is a dead end | Add action handler → route |
| F-SEC-03 | Monitoring | High | V | **Live** | `monitoring.ts:113`; `.env.example` | Production errors invisible | Document DSN or drop Sentry |
| F-SEC-01 | Security | Medium | V | **Live** | `supabaseClient.ts:19-22` | Prod project baked into every build | Required env vars |
| F-SEC-02 | Security | Medium | **I** | n/a | policies authored, never run | Potential cross-user exposure | `db:verify` on staging |
| F-SEC-04 | Security | Medium | V | n/a | no rate-limit config in repo | Credential stuffing | Supabase auth limits + CAPTCHA |
| F-SEC-05 | Security | Low | V | Dead | `validateBarcode.ts` 0 importers | Unvalidated 3rd-party JSON cached | Wire the existing validator |
| F-SEC-06 | Privacy | Low | V | **Live** | `food_search_no_result {query}` | User text persisted + exported | Hash or bucket |
| F-AN-01 | Analytics | Medium | V | **Live** | two overlapping taxonomies | Ambiguous metrics | Converge on one registry |
| F-AN-02 | Analytics | Medium | V | Dead | `NotificationSettingsPanel.tsx:81` | Event never fires | Remove or re-home |
| F-AN-03 | Test integrity | Medium | V | n/a | `test:analytics` scans 2 dead files | New code inherited the trap | Retarget |
| F-ST-02 | State | Medium | V | **Live** | `historyStore.ts` | Stats can desync after truncation | Compute, don't store |
| F-ST-03 | State | Medium | V | **Live** | no `storage` listener | Two tabs overwrite each other | Add cross-tab sync or a lock |
| F-DATA-01 | Data retention | Medium | V | **Live** | caps 500/1000/180/200 | Oldest data silently dropped | Warn, or archive on export |
| F-BIZ-01 | Business logic | Medium | V | **Live** | `exerciseHistory.ts:66`, `exerciseStats.ts:13` | Formulas will drift | Single source |
| F-BIZ-02 | Business logic | Medium | V | n/a | no conversion anywhere | kg-only product | Unit preference + migration |
| F-BIZ-03 | Business logic | Medium | V | **Live** | `today.ts:17-22` | Travel/DST can skip or double a day | Explicit TZ policy |
| F-MED-01 | Database | Medium | V | n/a | 4 tables client never writes | Confuses future maintainers | Drop or document |
| F-CFG-01 | Config | Medium | V | n/a | `vercel.json` + `wrangler.toml` | Ambiguous deploy target | Remove the unused one |
| F-CFG-03 | Config | Medium | V | n/a | `SUPABASE-SCHEMA.sql:1-19` | Two schema truths | Single source |
| F-GOV-01 | Governance | Medium | V | n/a | `main` 258 ahead of `design/v21-promotion` | Agents branch from a stale base | Update charter §1/§11 |
| F-FE-02 | Design system | Medium | V | Dead | `design-system/tokens.ts` 0 importers | Design truth split 3 ways | Consolidate |
| F-FE-03 | Performance | Medium | V | **Live** | `ExerciseLibraryView.tsx:159` | Jank on long lists | Virtualise |
| F-A11Y-02 | Accessibility | Medium | **I** | **Live** | 267 buttons / 120 aria-labels | Unlabelled icon buttons | Per-element pass |
| F-A11Y-03 | Accessibility | Medium | V | **Live** | no `aria-live` on validation | Errors unannounced | Add live regions |
| F-NOTIF-02 | Notifications | Medium | V | Dead | `notifications/restEnd.ts` not shipped | No rest-end alert | Follows Phase-0 decision |
| F-ERR-01 | Error handling | Low | V | **Live** | 97 comment-only `catch` blocks | Failures invisible | Triage the user-facing ones |
| F-CFG-04 | Maintainability | Low | V | n/a | 86-link `test:gate` one-liner | Unreadable, serial | Split into a runner |
| F-MED-02 | Content | Low | V | **Live** | 181/181 YouTube *search* links | "Watch" opens a search page | Curate |
| F-MED-03 | Content | Low | V | **Live** | 127/181 with no alternatives | Alternatives feature mostly empty | Author data |
| F-MED-04 | Assets | Low | V | **Live** | `public/exercise-gifs/` empty; 15 MB stills | No animation; mobile data cost | Run pipeline or drop dir |
