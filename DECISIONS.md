# DECISIONS — Phase 2.5, Agent 1 (Onboarding: 2 goals + split choice + nutrition Qs)

## RESUME — P2.5 A1 — 2026-06-30: built + verified (23/23) + ready to merge
- Repo `~/qimmah-p25-a1`; branches `integration/phase2.5` (off origin/main, pushed) + `feature/p25-onboarding`.
- Build ✅ · lint ✅ (0 warnings) · typecheck ✅. Verification harness: 23/23 PASS.
- If interrupted: `cd ~/qimmah-p25-a1`, `git status`; remaining step is commit → push feature → self-merge into integration/phase2.5.
- Untracked `.claude/launch.json` is a local dev helper — do NOT commit it.

## Mission (P2.5 A1) — what was done
1. **Goals = exactly 2 (cut/تنشيف, bulk/تضخيم).** Removed «strength/زيادة القوة» from UI + enums + all branch logic.
   - `OnbGoalType` & `GoalValue` → `'bulk' | 'cut'`. Removed strength `goalChoice`.
   - `GoalType` (profile) dropped `'strength'`; cleaned `SCHEMES`, `COMMITMENTS_BY_GOAL`, `rawCaloriesForGoalType`,
     `calorieGoalFromGoalType`, `deriveTargetWeight`, `goalTypeOptions`, dashboardLayout goal map.
   - **Migration (load, recompute, no crash):**
     - `onboardingProfile.migrateLegacyOnbGoal`: stored `goal.type:'strength'` → `'bulk'`.
     - `customization.migrateLegacyGoal`: stored `goalType:'strength'` → `'bulking'` (→ withFreshTargets recomputes).
   - Decision: kept the broad `GoalType` superset minus strength (recomposition/maintenance/health/returning still
     exist as internal/migration targets, never user-selectable) — least-risk, all paths have safe fallbacks.
2. **Bulk calories — ALREADY CORRECT in this codebase (no bug to fix).** cut & bulk both derive from the SAME
   `TDEE = BMR × (NEAT + days×0.025)`; only the offset differs (cut −400 / bulk +300). Verified the required sample:
   male/25/180cm/75kg/moderate-NEAT/3days → BMR 1755 × 1.425 = TDEE **2501** → bulk **2801** (not 2713). Added a
   code comment locking the invariant so future edits don't give bulk a different multiplier.
3. **Preferred split — ALREADY EXISTED and is honored by the generator** (`advancedSplitDays` overrides auto when
   `splitMode==='advanced' && splitChoice`). Verified honoring for all 5 advanced splits (Full Body, Upper/Lower,
   PPL, Arnold, Bro split) and that auto still works. Decision: kept the existing named-split set (more meaningful
   than raw «4-day/5-day», which are the days-per-week question already present); the 3 mission-named splits
   (Full Body, Upper/Lower, PPL) are all included and honored. No regression, no fake option.
4. **Nutrition: +2 NEW onboarding questions that really change the plan** (gated on `style==='meal_suggestions'`,
   kept inside onboarding):
   - «تفضّل وجباتك أكبر وأقل، ولا أصغر وأكثر؟» → `mealDistribution: balanced | fewer_larger | more_smaller`.
   - «متى تكون أكثر جوعًا؟» → `appetiteTiming: balanced | morning | evening`.
   - Effect: new `redistributeMeals()` in `planGenerator` reweights per-meal calories (slot base × timing × dist),
     **total stays anchored to targetCalories (no double-count)**. Defaults `balanced/balanced` ⇒ old uniform path
     (existing users unchanged). Verified: morning→breakfast>dinner, evening→dinner>breakfast, fewer_larger shrinks
     snack, totals within 0% drift.

## Files changed (11)
- types: `onboarding.ts`, `profile.ts` · data: `planBuilder.ts` · lib: `calculators.ts`, `planGenerator.ts`,
  `onboardingProfile.ts`, `customization.ts`, `dashboardLayout.ts`, `icons.ts` (added 4 lucide icons) ·
  components: `PlanBuilder.tsx` · views: `DashboardView.tsx` (comment only).

## QA results
- Only 2 goals (UI confirmed via served module: 0 strength) · strength→bulk migration (onboarding + customization)
  recomputes, no crash · bulk sample **2801** not 2713, same multiplier as cut · advanced split (PPL/4-day/etc)
  honored by generator (5/5) · new nutrition Qs change meal distribution · build/lint/typecheck PASS.

## Forbidden (respected)
No exercise GIFs · no muscle map · no food DB · no health/steps · no medical advice · BMI stays descriptive ·
no double-count calories · no push to main · no deploy · no secrets. Worked only on `integration/phase2.5` +
`feature/p25-onboarding`.

---

# DECISIONS — Phase 2, Agent 5 (Muscle Map + Step Counter)

## RESUME — P2 A5 — 2026-06-29: built + QA PASSED, merged
- Repo cloned at `~/qimmah-p2-a5`; branches `integration/phase2` + `feature/phase2-muscle-steps` off origin.
- All components built; build/lint/typecheck PASS (0 warnings). Committed `18f2d5e`.
- Browser QA PASSED: front+back muscle highlight from logged session; untrained neutral; manual steps save + ring + persist after reload (`qimmah:steps:v1`); editable goal → green "reached" state; no fake health-sync.
- Merged into `integration/phase2` (DECISIONS.md add/add conflict resolved by keeping both A4 + A5 sections).
- If interrupted: `cd ~/qimmah-p2-a5`, `git status`, finish the push + re-verify build.

## Mission
Two additive, low-risk, isolated features:
1. **Weekly Muscle Map** — SVG body (front/back); muscles trained this week highlight, untrained stay neutral. Descriptive, motivational, no judgment.
2. **Step Counter** — manual entry + ring toward a daily goal (default 10,000, editable), per-day localStorage, weekly mini-chart.

## Decisions
- **Placement: `src/views/ProgressView.tsx`** (progress tab — "one level in", keeps beginner home simple per A4).
- **Muscle map data source:** existing `computeWeeklyCoverage` engine, used **read-only** (no engine edits). A muscle counts as "trained this week" when its weekly `sets > 0`; fill intensity scales with `intensity` (0–1).
- **New isolated files only:**
  - `src/lib/stepCounter.ts` (localStorage, modeled on `reminderPrefs.ts`)
  - `src/components/StepCounterCard.tsx`
  - `src/components/WeeklyMuscleMap.tsx`
  - Edit only `ProgressView.tsx` to surface them (required by mission point 3; a view, not an engine).
- **Premium SVG**, NOT the previously-rejected "beige toy" body. Duotone: neutral silhouette + brand-orange heat fill by intensity.
- **No fake health-sync.** Steps are clearly manual; the existing "health sync coming soon" card stays the only sync messaging.
- Arabic text kept inside components (precedent: existing `MuscleMap.tsx` hardcodes Arabic muscle labels).

## Forbidden (respected)
No engine/nutrition/onboarding logic changes · no health-sync claims · no medical advice · no push to main · no deploy · no secrets.

---

## RESUME — P2 A4 — 2026-06-29 21:35 +03

Status: **COMPLETE** on branch `feature/phase2-simplify` (off `integration/phase2`).
Build ✅ · Typecheck ✅ · Lint ✅. Ready for sequential self-merge into `integration/phase2`.
If resuming: nothing pending. Next step would be the merge + report only.

---

# Phase 2 · Agent 4 — Simplification & Personalization · Decisions

Mission: the #1 complaint is **complexity**. Make the product simple-by-default, add a
personal greeting + daily phrase, and make logging reachable in one tap. Built **on top of**
A1–A3 (goals, exercise library, nutrition engine, dashboard signals) — no engine changes.

## 1. Simple-by-default vs Advanced (UI mode)
- New `src/lib/uiMode.ts`: `UiMode = 'simple' | 'advanced'`, persisted at `qimmah:uiMode:v1`.
- **Default is derived from experience** (reusing A1–A3's `dashboardLayout` signals):
  `beginner` / `novice` / unknown ⇒ **simple**; `intermediate` / `advanced` ⇒ **advanced**.
- An explicit user toggle always wins over the derived default (stored override).
- `DashboardView` simple mode shows only: greeting, quick entry, today's workout, today's
  calories + water (`DailySummary`). Everything else (next-action / progress cards, detailed
  `Today` list, recent workout, teasers, system-identity chips) is hidden behind a
  **«خيارات أكثر · وضع متقدّم»** toggle at the bottom.
- Decision: reused A1–A3's `signals.leadOrder` and just **filtered** it to `workout`+`nutrition`
  for simple mode, so goal-based ordering (cut ⇒ nutrition first) still applies. No new ordering
  logic, no duplication of their work.

## 2. Declutter «تعديل خطتي» (CustomizationCenter, advanced mode)
- The advanced editor had 9 steps. Split into:
  - **Essential (always shown):** بياناتك · جدول التمرين · خطة الأكل.
  - **Extra (behind «خيارات متقدّمة» toggle):** الحسابات الذكية · المكملات والأدوية ·
    القياسات والمتابعة · الأقسام · إظهار الأقسام.
  - المراجعة stays last.
- Toggle is collapsed by default. Step index is clamped on toggle so the wizard never lands
  on a missing step. The guided **onboarding** flow is untouched (it's already lean at 6 steps).

## 3. Greeting + daily rotating phrase
- Replaced the «نظامك جاهز / هذا نظامك الشخصي» banner with a `GreetingCard`:
  **«أهلًا يا {الاسم} 👋»**, or a neutral **«أهلًا بك 👋»** when no name is set.
- The system-identity chips (goal/days/split/calories) were not deleted — moved into an
  advanced-only `SystemIdentity` card so the value is preserved without cluttering the
  beginner home. «تعديل خطتي» link kept on the greeting card (always reachable).
- New `src/data/dailyPhrases.ts`: **371** short Arabic phrases (>365 to cover leap years),
  selected by **day-of-year** → deterministic (same date ⇒ same phrase), rotating across the
  whole year via modulo.
- **RED LINE compliance:** phrases are only about effort, consistency, discipline, showing up,
  patience, process, identity, resilience, focus. **No** exaggerated health promises and **no**
  tying self-worth to body/weight/shape. Verified by a grep scan for risky terms (وزن، دهون،
  جسمك، شكلك، أنحف، عضلات، صحة، تشفى…): zero violations. The only «أقوى» occurrences are
  comparative statements about *decisions/discipline* ("a small disciplined decision is stronger
  than a big delayed intention"), not physical-strength or health claims.

  Samples:
  - «الاستمرار أهم من الكمال.»
  - «الانضباط يفعل ما لا يفعله الحماس.»
  - «إن تعثّرت بالأمس، فاليوم فرصة جديدة.»
  - «خطوة صغيرة اليوم خير من قفزة مؤجلة.»

## 4. Quick entry (1 tap from home)
- New `QuickEntry` block on the dashboard with two prominent tap targets:
  **«سجّل أكل»** → `nutrition` (opens the food log immediately) and
  **«ابدأ تمرين»** → `workout` (opens today's workout). Both visible in **both** modes,
  directly under the greeting (above the fold).
- Decision: routes are simple hash routes (no params), and both target tabs already open
  straight into their logging UI, so navigating to the tab = the logging action in one tap.
  No deep-link param plumbing was added (keeps it minimal and avoids touching routing).

## 5. Constraints honored
- Dark, mobile-first preserved (reused existing `card`, `eyebrow`, `btn-primary` classes).
- **No engine changes**: goal logic, exercise library, nutrition formulas, muscle map, steps,
  medical advice all untouched. Only presentation + the welcome/quick-entry layer changed.
- Added `qimmah:uiMode:v1` to `resetQimmah` so a full reset clears the UI-mode preference too.

## Files
- Added: `src/data/dailyPhrases.ts`, `src/lib/uiMode.ts`, `DECISIONS.md`
- Changed: `src/views/DashboardView.tsx`, `src/sections/CustomizationCenter.tsx`,
  `src/lib/resetQimmah.ts`

## Open / future (not in scope)
- Could deep-link quick-add straight to the "add food" sheet (needs a route param or a
  transient store) — deferred to avoid routing changes.
- Could expose the simple/advanced toggle in Settings too (currently on the home screen).

---

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

### 1. Gram-based logging (point 1) — DONE — integrated into integration/phase2
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
