# 04 — App Store screenshots (final, Round 2)

## Required size — verified against Apple, 2026-07-15
> **6.9-inch iPhone display = 1320 × 2868 px (portrait) — REQUIRED for any iPhone app.**
> 6.5-inch (1284 × 2778) is only the fallback when a 6.9" set isn't provided; Apple auto-scales the 6.9"
> set down to smaller iPhones. Min 1 / max 10 per display size. iPad not required (iPhone-only submission).
> Source: Apple — App Store Connect Help, *Screenshot specifications*
> <https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/> (fetched 2026-07-15).
>
> ⚠️ **Correction from prior draft:** earlier notes said `1260 × 2736` — that is **not** an accepted Apple
> resolution. The correct required 6.9" size is **1320 × 2868**. Apple also accepts **1290 × 2796** (15/16 Pro
> Max class) for the 6.9" slot; either uploads to the same "6.9-inch" set. This kit targets **1320 × 2868**.

## Build flag
The listing surfaces are the v2.1 design; they only render from a build compiled with **`VITE_DESIGN_V2=true`**
(the flag bakes `data-design="v2"` into the built HTML — see `05-reviewer-notes.md`). All shots below were
captured from a `VITE_DESIGN_V2=true` production build.

## The set — order = App Store display order (6.9", portrait, RTL, Arabic)
| # | Surface | Raw | Caption (≤6 words, verb-first MSA) |
|---|---|---|---|
| 01 | Welcome (StartViewV2) | `raw/01-welcome.png` | درّب بوضوح. تقدّم بثقة. |
| 02 | Today command center | `raw/02-today.png` | ابدأ يومك بخطوة واضحة |
| 03 | Active Workout (dark) | `raw/03-workout.png` | سجّل كل مجموعة بثقة |
| 04 | Nutrition day view | `raw/04-nutrition.png` | تتبّع تغذيتك بسهولة |
| 05 | Progress brief (+ رؤى الأسبوع) | `raw/05-progress.png` | اقرأ تقدّمك بصدق |
| 06 | Profile «ملفك التدريبي» | `raw/06-profile.png` | تابع رحلتك التدريبية |

- **Raw** (`screenshots/raw/`) — the app UI at 1320 × 2868, no frame. Real seeded reviewer data (cutting
  profile: 3 logged sessions, an 8-point downward weight trend, 4 protein-logged days, a near-PR on bench).
- **Captioned** (`screenshots/final/`) — each raw shot framed by `compositor.html` on a Momentum canvas with
  the قِمّة noded mark + the caption above. These are the upload-ready 1320 × 2868 marketing screenshots.
- **Plate calculator:** not present in the Active Workout build on this trunk (the set screen shows the
  weight/rep steppers). If a plate calculator merges later, add a shot; caption slot: «احسب أوزانك بسرعة».

## How the set was produced (reproducible)
1. `VITE_DESIGN_V2=true npm run build` → `npx vite preview --port 5299`.
2. Capture raw at DPR 3 (logical 440 × 956 → **1320 × 2868**) with a client-only mock Supabase session +
   a seeded onboarded reviewer profile (no real account, no network auth) — the same client-side pattern the
   project's proof scripts use. Load `/` first so auth settles, then navigate each surface hash and screenshot.
3. Compose captions: open `compositor.html?shot=01..06` at 1320 × 2868 and export → `screenshots/final/`.

> **One-line wiring for the commander (I cannot edit `scripts/` this round):**
> `scripts/appstore-screenshot-factory.mjs` still targets **1260 × 2736** and drives onboarding through the UI,
> which desynced on wave5 (it stalls on the goal screen). Fixes: (a) change `LOGICAL_WIDTH/HEIGHT` to `440/956`
> so DPR 3 emits 1320 × 2868; (b) seed `qimmah:onboarding:accounts:v1` + rich history/customization directly
> (skip the fragile onboarding automation), exactly as this kit's capture does.

## English storefront (optional — OWNER-DECISION)
Reuse the same 6 surfaces with the EN verbs from `02-description.md`; the app renders EN when the language
toggle is set. Recommended if the EN storefront is enabled.
