# Phase 2 — Agent 3 (Nutrition: grams, restaurants, declutter)

## RESUME — P2 A3 — 2026-06-29
- Branch: `feature/phase2-nutrition` off `integration/phase2` (base 302267e).
- DONE (committed): (1) gram-based food logging; (2) hid non-functional `نسخ`/`مفضّلة · قريبًا`
  meal buttons behind a disabled flag; (3) expanded Saudi/Gulf home dishes + restaurant/fast-food
  (DB 165 → 187 items, all with `servingGrams`).
- User confirmed: point 3 = BOTH restaurants + home dishes; point 3 is the LAST point. Mission complete.
- NOT pushed yet (push feature branch only when instructed; never main).
- Verify after each change: `npm run build && npm run lint && (npm run typecheck || npx tsc -b --noEmit)`.

## Decisions log

### 1. Gram-based logging (point 1) — DONE
- `FoodItem` already carries `servingGrams` + per-serving macros, so per-gram math is exact:
  `macro × (grams / servingGrams)`. No food-data migration needed.
- `QuickMealLogger` search tab: replaced the "عدد الحصص / servings" input with a
  **grams** input (`الكمية (غرام)`), defaulting to the item's `servingGrams` on select.
  Live macro preview scales by `factor = grams / baseGrams`. Reference line shows
  "القيم لكل {baseGrams}غ: …".
- `LoggedFood` gained optional `grams?: number` (the gram amount). `servings` kept for
  backward compatibility, now storing the relative factor (`grams/servingGrams`).
  `logTotals` sums absolute macros, so existing entries are unaffected.
- Custom "إضافة سريعة" tab (direct calories/protein) left unchanged — it is not serving-based.

### 2. Declutter non-functional buttons (point 2) — DONE
- The `نسخ · قريبًا` and `مفضّلة · قريبًا` buttons live in `NutritionView.tsx`
  (`MealCard` → `PlaceholderBtn`). Wrapped both behind module const
  `SHOW_PLACEHOLDER_MEAL_ACTIONS = false` so they do NOT render now but the code +
  strings remain for when the feature ships. The functional `أضف` button stays.

### 3. Saudi/Gulf + restaurants (point 3) — DONE
- User confirmed scope: expand BOTH home dishes and restaurants.
- +10 `أكلات سعودية/خليجية` home dishes: haneeth-lamb, zurbian-chicken, majboos-chicken,
  majboos-lamb, machboos-shrimp, kabsa-shrimp, mofatteh-lamb, madghoot-chicken, thareed, saloona-lamb.
- +12 `مطاعم/وجبات سريعة تقديرية`: tawook-wrap, fajita-chicken, sfiha-meat, mutabbaq-meat,
  onion-rings, loaded-fries, mozzarella-sticks, double-cheeseburger, hotdog, lamb-chops-plate,
  broast-meal, fish-fillet-sandwich.
- All carry `servingGrams` (gram logging works), realistic estimated macros, unique ids
  (verified no dupes), and `notesAr` where the estimate is variable. DB 165 → 187 items.

## Hard rules honored
- Working only on `integration/phase2` + `feature/phase2-nutrition`. No push to main, no deploy, no secrets.
- Untouched: exercise library, workout, onboarding, dashboard layout.
