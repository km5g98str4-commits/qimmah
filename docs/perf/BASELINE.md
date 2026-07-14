# Qimmah — Bundle Baseline

Base: `perf/bundle-optimization` off `origin/design/v21-momentum` @ `168a5d7`.
Command: `npm run build` (`tsc -b && vite build`), production, sourcemaps off.

## Totals (before any optimization)
| | Raw | Gzip |
|---|---|---|
| JS (48 chunks) | **1945.0 kB** | **529.3 kB** |
| CSS (1 file) | 76.0 kB | 13.1 kB |
| **All** | **2021.0 kB** | **542.4 kB** |

Fonts (self-hosted woff2/woff) ship as separate cached assets — see §Fonts.

## The size warning (wave3) — quantified
Vite emitted: *"Some chunks are larger than 500 kB after minification."* The offender:

| Chunk | Raw | Gzip |
|---|---|---|
| **`NutritionView-*.js`** | **623.10 kB** | **151.61 kB** |

That single chunk is **32% of all JS** (raw). Root cause (traced in code):
- `src/views/NutritionV2.tsx:7` **statically** imports `ScanFoodPanel` → `BarcodeCamera.tsx` →
  **`@zxing/browser` + `@zxing/library`** (the barcode engine). So ZXing is baked into the Nutrition
  chunk even though `src/components/nutrition/QuickMealLogger.tsx:13` *already* lazy-loads the same
  `ScanFoodPanel`. The static path in NutritionV2 defeats that split.
- Plus the built-in food database `src/data/foodItems.ts` (5,698 lines) imported by both
  `QuickMealLogger` and `NutritionV2`.

## Top JS chunks
| Chunk | Raw kB | Gzip kB | Notes |
|---|---|---|---|
| NutritionView | 623.10 | 151.61 | ⚠ >500 kB — food DB + ZXing (static via NutritionV2) |
| index (entry) | 258.98 | 79.88 | app entry + shared |
| index (data) | 213.45 | 55.32 | large shared/data chunk (deterministic hash) |
| SetupView | 155.51 | 37.24 | 19-step onboarding |
| vendor-react | 133.93 | 43.13 | react + react-dom (already split) |
| WorkoutView | 87.43 | 23.94 | |
| DashboardView | 71.29 | 20.88 | |
| ProgressView | 53.19 | 17.47 | |
| vendor-icons | 52.26 | 12.25 | lucide-react (already split) |
| wellnessPlan | 48.78 | 10.82 | |
| ExerciseMedia | 47.53 | 5.19 | |

## Existing chunking (vite.config.ts)
`manualChunks` already splits `vendor-react` (react/react-dom) and `vendor-icons` (lucide-react).
**Not yet split:** `@zxing/*` (barcode) and `react-body-highlighter` (the muscle-map "charts"/viz),
both of which are heavy and only needed on specific surfaces.

## Heaviest third-party (unpacked node_modules, indicative)
| Package | Unpacked | Used by | Loadable lazily? |
|---|---|---|---|
| `@zxing/browser` + `@zxing/library` | ~31 MB | `BarcodeCamera.tsx` (barcode scan only) | **Yes** — scan is user-initiated |
| `react-body-highlighter` | ~272 kB | `WeeklyMuscleMap.tsx`, `muscleMapLib.ts` | Yes — only on the muscle-map surface |
| `lucide-react` | ~37 MB (tree-shaken to 52 kB used) | app-wide icons | No (already split, tree-shaken) |
| `react-dom` | ~4.4 MB | app-wide | No (core) |

## Optimization plan (measured, ≤4 conversions)
1. **manualChunks vendor split** — add `vendor-zxing` (`@zxing/*`) + `vendor-charts`
   (`react-body-highlighter`) so they cache independently and leave the view chunks.
2. **Lazy ZXing (conversion 1)** — make `NutritionV2` lazy-load `ScanFoodPanel` (mirror
   `QuickMealLogger`), pulling ZXing out of the Nutrition chunk entirely. Highest-value, and it
   clears the 500 kB warning.
3. **Lazy charts (conversion 2)** — lazy-load `WeeklyMuscleMap` (react-body-highlighter) at its
   surface, if analysis after step 2 still justifies it.
4. **One more heavy view (conversion 3–4)** — only if measured savings justify; each verified.

## Fonts (report-only; no font files changed here)
Self-hosted via `@fontsource/*`: **Tajawal** (ar+latin, weights 400/500/700/800/900), **Readex Pro**
(ar+latin, 600/700), **IBM Plex Sans Arabic**. Each weight ships both `.woff2` and `.woff`. Full
audit + subsetting recommendation in `RESULTS.md §Fonts`.
