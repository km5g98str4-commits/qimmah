# App Store — Screenshots Plan

> **Verified July 2026** (`developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`, accessed July 2026):
> - **Required set: 6.9-inch iPhone.** If omitted, **6.5-inch** becomes required. Provide **one** high-res set and Apple **auto-scales down** to smaller iPhone sizes.
> - **Count: min 1, max 10** per display size. **iPad not required** (iPhone-only submission).
> - Pixel dims: **6.9" = 1260 × 2736 px** portrait; **6.5" = 1284 × 2778 px** portrait. ⚠️ *TO-CONFIRM:* Apple accepts more than one resolution per class — confirm the exact accepted 6.9" resolution in ASC at upload (see `07-second-pass.md`).
> **Plan: produce the 6.9" portrait set (6 shots).** Build must be compiled `VITE_DESIGN_V2=true` (see `05-reviewer-notes.md`) or these v2 surfaces won't render.

## Shot list (6.9", portrait, RTL) — order = App Store display order

| # | Surface (file) | AR caption (≤6 words, verb-first) | Framing notes |
|---|---|---|---|
| 1 | **Welcome** `StartViewV2.tsx` | **درّب بوضوح، تقدّم بثقة** | Brand mark + ember-glow background (`:27-41`). Caption echoes the brand line. Clean hero, RTL, Arabic UI. |
| 2 | **Today** `TodayV2.tsx` | **ابدأ يومك بخطوة واحدة** | Show the "مسار اليوم" four-ring path (`:85-186`) with 1–2 rings in progress + the next-step hero card. This is the signature screen — lead strength. |
| 3 | **Active Workout (dark)** `WorkoutV2.tsx` | **درّب في وضع مركّز** | The dark focus session (`:32-43,276-318`): set list, weight/reps editor, a visible rest timer. Emphasize the dedicated dark palette. |
| 4 | **Nutrition** `NutritionV2.tsx` | **سجّل تغذيتك بالباركود** | Macro + water rings (`:139-172`) + the barcode/Add-food entry. Optionally a small barcode-scan inset to signal the feature. |
| 5 | **Progress** `ProgressV2.tsx` | **قِس تقدّمك بصدق** | Weight trend line + strength ladder (`:175-286`) with real (seeded) data. Honest, data-first — no fake spikes. |
| 6 | **Profile** `ProfileV2.tsx` | **تابع التزامك أسبوعيًا** | Stat blocks + the 10-week commitment heatmap (`:118-134`). Ends the story on consistency/identity. |

## Caption copy rules applied
- Verb-first, warm MSA, ≤6 words, no hype/emoji (per `DESIGN-DECISIONS.md:19`).
- Captions describe what the user *does*, matching the on-screen surface — no claims beyond code.

## Framing / visual language (match the PDF's momentum direction)
- **Device frame:** clean iPhone frame, no heavy marketing collage; let the RTL UI breathe.
- **Palette:** ember/graphite momentum accents; screen 3 uses the app's dark workout palette as-is.
- **Text overlay:** one short Arabic caption per shot, top or bottom safe area, right-aligned (RTL). Same type family as the app (IBM Plex Sans Arabic).
- **Data honesty:** seed the demo account (see `05-reviewer-notes.md`) first so Progress/Profile show real numbers, not empties.
- **Localization:** this set is Arabic. An English 6.9" set is optional (recommended for the EN storefront) reusing the same 6 surfaces with the EN captions from `02-description.md` verbs.

> ⚠️ *TO-CONFIRM:* exact accepted 6.9" pixel resolution at upload; whether the owner also wants an English screenshot set for the EN storefront (OWNER-DECISION).
