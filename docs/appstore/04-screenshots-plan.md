# App Store — Screenshots plan

> Requirements verified 2026-07-13 (source:
> https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/):
> - **iPhone 6.9" display is REQUIRED** — portrait **1290×2796** (iPhone 16 Pro Max) is the safe
>   choice; 1320×2868 / 1260×2736 also accepted. Everything smaller **scales automatically**.
> - **6.5"** is only needed if you *don't* provide 6.9". **5.5" is NOT required** (skip it).
> - **1–10 screenshots per localization.** `.png`/`.jpg`. No alpha/transparency; RGB.
> - App previews (video) optional, up to 3, 15–30s — **out of scope for v1** (TO-CONFIRM if wanted).
> - iPad: only required **if the app is offered on iPad**. Qimmah is iPhone-first — **TO-CONFIRM**
>   whether to also ship iPad (`capacitor.config.ts` targets iOS; verify device family in Xcode).

## Deliverable set
- **One localization set in Arabic** at **1290×2796** (6.9"), **6 screenshots** (order = story).
- Capture from a **`VITE_DESIGN_V2=true`** build (the v2.1 surfaces) on device/simulator, **RTL**,
  real seeded data (see `05-reviewer-notes.md` seeding). Optionally a matching EN set if the `en`
  storefront is localized (TO-CONFIRM).
- Captions overlaid in the frame (not Apple's field) — **≤6 words, verb-first, warm MSA** (PDF §02).

## Framing (match the PDF visual language)
Deep-night canvas (`#101216`), one ember (`#F26A21`) accent per shot, IBM Plex Sans Arabic, generous
margins, a single dark "hero card" as the focal point, calm — no confetti, no stacked badges, no
device-bezel clutter. Caption sits top or bottom third, high contrast, RTL alignment.

## Shot list → v2.1 surface → caption

| # | Surface (file) | What's on screen | AR caption (≤6 words, verb-first) | words |
|---|---|---|---|---|
| 1 | **Welcome** `src/views/StartViewV2.tsx` | Hero wordmark + «درّب بوضوح. تقدّم بثقة.» + «ابدأ الآن» | **ابدأ رحلتك بوضوح** | 3 |
| 2 | **Today** `src/views/TodayV2.tsx` | Greeting + next-step hero + «مسار اليوم» pillars | **اعرف خطوتك التالية الآن** | 4 |
| 3 | **Active Workout (dark)** `WorkoutV2.tsx` / `WorkoutMode.tsx` | Set logging + rest timer, dark mode | **سجّل كل تمرين بدقّة** | 4 |
| 4 | **Nutrition** `src/views/NutritionV2.tsx` (+ `ScanFoodPanel`) | Calorie ring + barcode-scan affordance | **امسح باركود وسجّل وجبتك** | 4 |
| 5 | **Progress** `src/views/ProgressV2.tsx` | Weight trend chart + honest "brief" language | **تابع تقدّمك بأرقام صادقة** | 4 |
| 6 | **Profile** `src/views/ProfileV2.tsx` | Identity header + medals/streaks; Qimmah+ quiet line | **اجمع أوسمتك وتابع التزامك** | 4 |

> Story arc: promise → daily anchor → the crown-jewel workout → fast nutrition → proof of progress →
> earned identity. This mirrors the PDF's own screen order (§04 Today, §05 Progress, §06 Profile).

## Caption alternates (if a shot's copy needs a swap)
- Today: «افتح يومك في لمحة» (4)
- Nutrition: «سجّل سعراتك في ثانية» (4)
- Progress: «شاهد وزنك يتّجه لهدفك» (5)
- Workout: «درّب مع مؤقّت راحة» (4)

## Production notes
- Do **not** ship the current placeholder icon/splash context in any shot — icon/splash are
  design-gated (`docs/APP-READINESS.md` §7). Screens themselves are final-capable.
- Avoid showing the DEV-only product-review panel (never a user surface).
- Keep any visible numbers realistic (seeded), never lorem/zeros.

**TO-CONFIRM:** iPad set (only if offered on iPad); optional EN localization set; whether an app
preview video is wanted (adds 15–30s capture per size).
