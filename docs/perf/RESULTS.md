# Qimmah — Bundle Optimization Results

Branch `perf/bundle-optimization` off `origin/design/v21-momentum` @ `168a5d7`.
Surface touched: `vite.config.ts` (chunking) + **1** dynamic-import conversion (`NutritionV2.tsx`).
Every step gated (typecheck + lint + **188** unit checks) and the barcode surface browser-smoked.

## Headline
- ✅ **The wave3 >500 kB chunk warning is gone.**
- ✅ **Nutrition route chunk: 623.10 → 171.96 kB raw (−72%); gzip 151.61 → 35.58 kB (−77%).**
- ✅ **The 443 kB ZXing barcode engine no longer loads on the Nutrition route** — it loads only
  when the user opens the scanner (verified in a browser).

> Note on totals: code-splitting **relocates** weight, it does not delete it — total JS stays ~1945 kB.
> What improved is *when* bytes load: the barcode engine is deferred off the initial load **and** the
> Nutrition route, and vendors now cache independently.

## Before → After

### The warning chunk (Nutrition route)
| | Raw kB | Gzip kB |
|---|---|---|
| Before (`NutritionView`, incl. ZXing) | 623.10 | 151.61 |
| After (`NutritionView`, ZXing removed) | **171.96** | **35.58** |
| **Saved on this route** | **−451.14 (−72%)** | **−116.03 (−77%)** |

### Where ZXing went
| Chunk | Raw kB | Gzip kB | Loads when |
|---|---|---|---|
| `vendor-zxing` (@zxing/browser + @zxing/library) | 443.43 | 112.84 | **on demand** — only when the scanner opens |
| `ScanFoodPanel` (lazy glue) | 8.13 | 3.22 | on demand |
| `vendor-charts` (react-body-highlighter) | 14.27 | 4.54 | with ProgressView (already route-lazy) |

### Totals
| | Raw | Gzip |
|---|---|---|
| JS before | 1945.0 kB | 529.3 kB |
| JS after | 1945.5 kB | 529.3 kB |
| CSS | 76.0 kB | 13.1 kB |

Total is intentionally flat — the value is deferral + caching, not deletion (see note above).

## Changes made (2 files)

### 1. `vite.config.ts` — vendor `manualChunks`
Added `vendor-zxing` (`@zxing/browser`, `@zxing/library`) and `vendor-charts`
(`react-body-highlighter`) alongside the existing `vendor-react` / `vendor-icons`. Effect: the barcode
engine and the muscle-map viz are isolated into their own cache-stable files and pulled out of the
view chunks. This alone dropped `NutritionView` 623 → 180 kB and cleared the 500 kB warning.

### 2. `src/views/NutritionV2.tsx` — lazy-load the scanner (conversion 1 of ≤4)
`NutritionV2` statically imported `ScanFoodPanel` → `BarcodeCamera` → `@zxing/*`, which forced the
443 kB engine to load whenever the Nutrition screen mounted — even for users who never scan (and it
defeated the existing `lazy()` in `QuickMealLogger`). Converted to:
```ts
const ScanFoodPanel = lazy(() => import('@/features/barcode/ScanFoodPanel').then((m) => ({ default: m.ScanFoodPanel })))
// …rendered inside <Suspense fallback={null}> only when `scanning` is true
```
Now `vendor-zxing` is referenced solely by the lazy `ScanFoodPanel` chunk, so it downloads only when
the user actually taps “scan barcode”.

**Browser smoke (verified):** mounted `ScanFoodPanel` via the exact lazy path in a headless Chromium
harness — the scanner modal rendered (`<h3>مسح الباركود</h3>`), and `@zxing_library.js` +
`@zxing_browser.js` were fetched **on demand** at that moment, with zero JS errors. (Harness was
throwaway — not committed; surface stays `vite.config.ts` + conversions + `docs/perf/**`.)

## Conversions considered but NOT made (measured, not justified)
- **`vendor-charts` / `WeeklyMuscleMap`** — only **14.27 kB (4.54 kB gz)** and rendered inside
  `ProgressView`, which is already route-lazy (`App.tsx` uses `lazy()` for 17 views). Deferring 14 kB
  behind another Suspense boundary + smoke cycle isn't worth the complexity. Left vendor-split for
  cache stability; not lazy-loaded.
- **Further heavy views** (`SetupView` 155 kB, `WorkoutView` 87 kB, `DashboardView` 71 kB) — already
  route-split and lazy-loaded on navigation, so they’re off the initial load already. No conversion
  adds initial-load value.
- **Food DB `foodItems.ts`** (~213 kB) — only on the Nutrition route (already lazy); splitting further
  within that route adds churn for no initial-load gain.

Net: **1 conversion** delivered the decisive win; the remaining candidates were marginal. Freezing at 1
(well under the ≤4 cap) is the correct call.

## Fonts audit (report-only — no font files changed)
Self-hosted via `@fontsource/*`, shipped as **both** `.woff2` and `.woff` per weight:
| | Files | Size |
|---|---|---|
| woff2 (modern) | 22 | **395 kB** |
| woff (legacy fallback) | 22 | **451 kB** |
| **Total** | 44 | **845 kB** |

By family (woff2+woff): `ibm-plex-sans` 516 kB · `tajawal` 218 kB · `readex-pro` 112 kB.

**Recommendations (owner/build decision, separate change):**
1. **Drop the `.woff` fallback (woff2-only)** → **~451 kB saved**. Every Qimmah target (iOS Safari 15+
   / WKWebView, modern Chrome/Edge) supports woff2; the woff copies are dead weight. Highest-value,
   lowest-risk font win. (Fonts are cached + per-weight, so this is data-usage, not initial-blocking.)
2. **Subset the Arabic faces** to the used glyph range (Arabic + Latin digits/punctuation) via
   `@fontsource`'s subset packages or a build-time subsetter → further trims the 395 kB woff2,
   especially `ibm-plex-sans` (516 kB, the largest).
3. Confirm only the weights actually used are imported (audit `src/design-system/fonts.ts`).

## Images audit (report-only — no image files changed)
`dist/exercise-images` ≈ **16 MB**; all bundled images ≈ **28 MB** across 281 files (mostly exercise
demo JPGs). These are in `public/` and loaded **on demand** per exercise (`ExerciseMedia`), so they do
**not** affect the JS bundle or first paint. Still worth a future pass: convert to **WebP** + add
responsive sizes → large data-usage savings on the Exercise Library surface. Out of scope here
(no image file changes); logged as a follow-up.

## Verification summary
| Step | Gate | Smoke |
|---|---|---|
| manualChunks vendor split | typecheck ✓ · lint ✓ · 188 ✓ | build: warning cleared |
| Lazy ZXing (NutritionV2) | typecheck ✓ · lint ✓ · 188 ✓ | scanner mounts + ZXing loads on demand, 0 errors |
