# Phase 6 QA — Najdi Phrases + Saudi Dishes + Barcode Scanner

Branch verified: `integration/phase6` (commit `48df207`)
Date: 2026-07-01

## Presence check — all three features confirmed together

| Feature | Status | Evidence |
|---|---|---|
| Najdi motivational phrases | ✅ | `src/data/motivationalPhrases.ts` — 51 phrases (ar/en), wired via `getRandomPhrase()` into `src/views/DashboardView.tsx:15,97` |
| Saudi/شعبية dishes | ✅ | `src/data/foodItems.ts` — new `'أطباق سعودية / شعبية'` category, exactly 63 dishes; 403 total food items |
| Barcode scanner | ✅ | `src/features/barcode/{BarcodeCamera,ScanFoodPanel,openFoodFacts}.tsx/ts`, wired into `src/components/nutrition/QuickMealLogger.tsx` via `lazy(() => import(...))`, Open Food Facts API lookup, honest manual fallback (`onManualFallback`) |

## Build gates

| Gate | Result |
|---|---|
| `npm install` | ✅ clean (2 pre-existing audit advisories, unrelated to phase6) |
| `npm run build` | ✅ passes. `ScanFoodPanel` (zxing) is its own 448.85 kB chunk, separate from the 472.97 kB main `index` bundle — confirms lazy-loading, not bloating initial load |
| `npm run lint` | ✅ zero warnings/errors |
| `npm run typecheck` (`tsc -b --noEmit`) | ✅ zero errors |

## Functional QA (manual, in-browser)

| Scenario | Result |
|---|---|
| Fresh onboarding e2e (18 steps: name → goal → weight → session length → injuries/tracking) | ✅ completes, plan builds, lands on dashboard, no crash |
| Dashboard greeting / phrase rotation | ✅ confirmed 3 distinct phrases across reloads ("أنت قدها" → "لا تخف من الوزن" → "تمرّن كأنك وصلت") |
| Nutrition logging — search "برياني" | ✅ both `برياني دجاج` (640 kcal/32g protein/350g) and `برياني لحم` (700 kcal/30g protein) found, correctly tagged `أطباق سعودية / شعبية` |
| Log a Saudi dish → totals update | ✅ Lunch total became 640 kcal · 32g protein; remaining budget recalculated (2713 → 2073) correctly |
| Barcode scan entry point in meal logger | ✅ "امسح الباركود 📷" button present alongside search + quick-add |
| Corrupted localStorage (all keys set to invalid JSON) → reload | ✅ no crash, no white screen; app falls back gracefully to the landing/onboarding screen |
| Unknown route / random path | ✅ no crash; falls back to landing screen (guest data was cleared in the same test pass) |
| Language toggle ar → en | ✅ `dir` flips to `ltr`, UI strings translate (`Nutrition`, `Needs`, `Add`, etc.) |
| Muscle map (Progress tab) | ✅ "Your muscle map" section renders, Front/Back toggle present, intact from Phase 5 |
| Workout view / exercise media | ✅ "Day 1 · Full Body · 5 exercises" plan renders, no console errors |
| Console errors during full pass | ✅ none observed (only vite/HMR/devtools info logs) |

## Red-line compliance

- No medical advice language observed.
- No BMI or body-fat claims beyond descriptive numbers.
- No fake health-sync / wearable integration claims.
- Barcode/camera flow has an honest manual-entry fallback when scan fails or is unavailable — no fabricated results.
- All nutrition values carry the existing disclaimer: "القيم الغذائية تقديرية وقد تختلف حسب طريقة الطبخ والكمية."
- No copyrighted third-party imagery introduced by this phase (dishes/phrases are text-only data; barcode feature only calls the public Open Food Facts API).

## Known limitation (non-blocking, pre-existing)

- Food item names (e.g. "برياني دجاج") are not localized when the UI language is switched to English — this is an existing behavior across all food data, not something introduced in Phase 6.

## Risk notes for deploy

- **Barcode scanning has not been tested on a real device/camera.** This QA pass only verified the code path, lazy-load boundary, Open Food Facts API wiring, and the manual-fallback UI in a headless browser (no camera hardware available). Recommend a real-device smoke test post-deploy.
