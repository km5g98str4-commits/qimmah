# Second pass — verification of every Apple limit + feature claim

## A. Apple limits & specs (verified 2026-07-13; re-verify before submitting — Apple changes these)

| Item | Value | Source | Accessed |
|---|---|---|---|
| App name max | **30 chars** (min 2) | developer.apple.com/help/app-store-connect/reference/app-information/app-information/ | 2026-07-13 |
| Subtitle max | **30 chars** | (same as above) | 2026-07-13 |
| Promotional text max | **170 chars** (editable without new build) | developer.apple.com/app-store/product-page/ | 2026-07-13 |
| Keywords max | **100 chars**, comma-separated, **no spaces** | developer.apple.com/app-store/product-page/ | 2026-07-13 |
| Description max | **~4000 (enforced in ASC editor) but NOT doc-cited by Apple** → **TO-CONFIRM** in the field counter | developer.apple.com/app-store/product-page/ | 2026-07-13 |
| iPhone screenshots | **6.9″ required** (1290×2796 safe; 1320×2868 / 1260×2736 ok). 6.5″ only if no 6.9″. **5.5″ not required.** 1–10 per localization | developer.apple.com/help/app-store-connect/reference/screenshot-specifications/ | 2026-07-13 |
| App previews (video) | optional, up to 3, 15–30s | developer.apple.com/help/app-store-connect/reference/app-preview-specifications/ | 2026-07-13 |
| Age rating (2025) | **new bands 4+/9+/13+/16+/18+** (12+/17+ removed); 4 new categories (In-app controls, Capabilities, Medical/wellness topics, Violent themes); **answer by 2026-01-31** | developer.apple.com/news/?id=ks775ehf | 2026-07-13 |
| Arabic localization | **supported**; primary language = fallback for non-localized viewers | developer.apple.com/help/app-store-connect/reference/app-store-localizations/ | 2026-07-13 |
| Sign in with Apple (4.8) | **not required** for email/password-only apps (own-account exception) | developer.apple.com/app-store/review/guidelines/ | 2026-07-13 |
| Account deletion (5.1.1(v)) | **required** if the app supports account creation | developer.apple.com/app-store/review/guidelines/ | 2026-07-13 |

## B. Naming char counts (code-point measured; re-confirm in ASC counter)
- Name A `قِمّة: تمارين وتغذية وتقدّم` = **27** ✅ (B `قِمّة — تمارين، تغذية، تقدّم` = 28; rejected 31-char option noted).
- Subtitle A `درّب بوضوح. تقدّم بثقة.` = **23** ✅.
- Promotional text A = **140** ✅ (≤170).
- Keywords A = **84** ✅ (≤100, no spaces).

## C. Feature claims → file (every description/screenshot claim traces to code TODAY)
| Claim | File(s) |
|---|---|
| Plan generation (rule-based) | `src/lib/planGenerator.ts`, `src/data/workoutTemplates.ts` |
| Active workout: sets/reps/rest/PRs | `src/components/WorkoutMode.tsx`, `src/lib/finishWorkout.ts`, `workoutSessions.ts` |
| Exercise library / custom builder / machines | `src/data/exercises.ts`, `src/features/customPlan/*`, `src/data/machineCatalog.ts` |
| Weekly muscle coverage | `src/lib/muscleCoverage.ts`, `src/components/MuscleMap.tsx` |
| Calorie/macro targets + meal logging | `src/lib/nutritionPlan.ts`, `calculators.ts`, `src/views/NutritionView.tsx` |
| Saudi foods DB (~130) | `src/data/saudiFoods.ts` |
| Barcode scan (@zxing) + Open Food Facts | `src/features/barcode/BarcodeCamera.tsx`, `openFoodFacts.ts` |
| Water tracking | `src/lib/nutritionTracking.ts` |
| Weight/measurements + chart | `src/lib/measurementLog.ts`, `src/components/LineChart.tsx` |
| Strength/PRs, medals, streaks | `src/lib/exerciseStats.ts`, `src/features/achievements/engine.ts`, `streaks.ts` |
| Steps — **manual only** | `src/lib/stepCounter.ts` (source `'manual'`; HealthKit is an inert seam) |
| Supplements/medications (tracking only) | `src/data/supplements.ts`, `src/data/medications.ts` |
| Local reminder — **iOS only** | `src/lib/reminders.ts`, `@capacitor/local-notifications` |
| Today command center + to-do | `src/views/TodayV2.tsx`, `src/features/todo/*` |
| Auth email/password + deletion | `src/lib/authContext.tsx`, RPC `delete_own_account` |
| Cloud sync (workouts/exercise history/measurements/daily logs) | `src/lib/syncService.ts`, `onboardingSync.ts` |
| No ads/tracking; analytics no-op default | `src/lib/analytics/providers/noop.ts`, `consent.ts`; `docs/legal/app-privacy-labels.md` |
| Arabic-first + English support | `src/config/product.ts`, `src/config/strings.ts` (`en`) |
| Qimmah+ = one line, **no IAP** | `src/lib/profileV2Model.ts` (`subscription.enabled:false`) |
| Camera = barcode only; no HealthKit/location | `ios/App/App/Info.plist` (only `NSCameraUsageDescription`) |

**Not claimed anywhere (verified absent in code):** HealthKit/Apple Health, automatic step counting,
purchasable subscription/premium tier, background web push, "fully offline install", "fully bilingual".

## D. Consolidated TO-CONFIRM (owner / unverifiable-by-me)
1. **Description char limit** — confirm ~4000 in the ASC field counter (Apple doesn't publish it).
2. **Apple-computed content rating** after submitting the questionnaire; the product eligibility age is fixed at 12 and signup now has a blocking 12+ confirmation.
3. **Exact age rating** Apple computes from the questionnaire answers.
4. **Hosted Privacy Policy + Terms public URLs** (domain) — `public/legal/*.html` exist; hosting = owner.
5. **`VITE_DESIGN_V2`** in the shipped build must match the screenshots (v2.1 vs v1).
6. **`VITE_ANALYTICS_ENDPOINT`** set or not → drives the Usage/Diagnostics privacy rows.
7. **Demo account** credentials + a known-good **test barcode** number.
8. **Signing team / Apple Developer entity**, app **category** (secondary), support/marketing URLs.
9. **iPad** in scope? (screenshots + device family) · optional **EN storefront** localization · optional **app preview video**.
10. **Production Supabase**: RLS enabled + `delete_own_account` deployed + verified (`npm run db:verify`).
11. English **name** final trim to ≤30; the spare **keyword** term (16 chars free in option A).
