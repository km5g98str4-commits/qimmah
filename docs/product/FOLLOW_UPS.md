# Qimmah Follow-ups

## P2.7 — Image render confirmed + animated GIFs still optional

**Images render.** Verified in P2.7 that the matched exercises load real `<img>` elements.
The map `src/data/exerciseMedia.ts` holds **136/170** entries pointing at stable raw URLs on
[`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db) (Unlicense / public
domain), e.g. `https://raw.githubusercontent.com/.../exercises/<Name>/0.jpg`. Spot-checked
several URLs → **HTTP 200**. `ExerciseMedia` and `ExerciseThumb` render real `<img>` with an
`onError` handler that falls back to the gradient placeholder, so a missing match or a failed
load never shows a broken image. NOTE: these images are **referenced by remote URL, not copied
into the repo** (`public/` holds only `favicon.svg` + `_redirects`). They require outbound
network at view time; the placeholder covers the offline case.

**Animated muscle-highlight GIFs are still the optional upgrade.** The `gifUrl` slot in the map
is preferred by the UI when present and is filled only when the build runs with a free
**`WORKOUTX_API_KEY`** (workoutxapp.com — free tier, 500 req/month, no card). The integration
seam is already in place — see the P2.5 section just below for the exact steps. No code change
is needed to turn it on; just re-run `WORKOUTX_API_KEY=… npm run build:media` and commit.

## P2.5 — Real exercise media (images now, animated GIFs optional)

**What shipped.** Exercise cards/thumbnails now show **real photos** instead of the empty
gradient placeholder. At build time `scripts/build-exercise-media.mjs` matches Qimmah's 170
exercises to the open public-domain dataset [`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db)
(Unlicense / public domain) and writes a static map `src/data/exerciseMedia.ts`
(`exerciseId → { img0, img1, gifUrl? }`). The UI cross-fades the start frame (`0.jpg`) and
end frame (`1.jpg`) every ~1.1s to fake the motion. **Coverage: 136/170 (80%).** The 34
unmatched are cardio (treadmill/bike/rowing/jump-rope…) and mobility (leg-swings/ankle-mobility…)
that legitimately have no lift frames; they keep the clean gradient placeholder **plus** the
existing working YouTube-search link. No broken `<img>` ever — every image has an `onError`
fallback to the placeholder.

**Re-generate the map** (e.g. after adding exercises): `npm run build:media`. It re-fetches the
dataset, re-matches, and rewrites `src/data/exerciseMedia.ts`. Commit the result.

### Unlock animated GIFs with muscle highlighting (optional — for the founder)

The map already has a `gifUrl` slot that the UI **prefers over the static images** when present.
To fill it from [WorkoutX](https://workoutxapp.com) (animated GIFs + muscle highlighting):

1. Sign up free at **workoutxapp.com** → get an API key. Free tier is **500 requests/month, no
   credit card**.
2. Re-generate the map **with the key set** (the key is read from the environment, never
   committed):
   ```bash
   WORKOUTX_API_KEY=your_key_here npm run build:media
   ```
   The script fetches `https://api.workoutxapp.com/exercises` (header `X-WorkoutX-Key`), matches
   by name, and writes `gifUrl` into the map for every exercise it can match. Commit the result.
3. If `WORKOUTX_API_KEY` is **absent**, the script silently skips WorkoutX and keeps the static
   free-exercise-db images — no setup required for the default build.

**Security note:** the key is only ever read at build time from the shell environment. It is
**not** a `VITE_*` var and is **never** written into the bundle, the committed map, or the repo.
Do not hardcode it.

### Day naming
The bare `أ/ب/ج` day labels are gone. Every workout day the user sees is now `اليوم N · <split>`
(e.g. `اليوم 1 · دفع`, `اليوم 2 · جسم كامل`) via `src/lib/workoutDayLabel.ts`, applied at plan
construction (`generatePlanFromTemplate`, `generateWorkoutPlan`) and the weekly-schedule builders.
The label index follows the day's position in the plan.

## P2 Agent 2 — Exercise library / machines (deferred, out of this scope)

- A2-F1. **Real demos (GIF / trusted video).** All 170 exercises (incl. the 27 machine-catalog
  entries) still use `videoUrl` = YouTube *search* links (`videoSource: 'youtube_search'`), not
  specific embeds. Upgrade catalog machines first to curated `trusted_video` links or short
  looping GIFs. NOTE: must use only legal/owned/embeddable media (no scraping, no broken links) —
  that's why this run added no media. The data model already supports it (`videoSource:
  'trusted_video'`, per-exercise `videoUrl`).
- A2-F2. **Catalog integrity test.** `machineCatalog.catalogMissingIds()` is QA-checked manually
  (bundled via esbuild). When a test runner is added (none configured today), wire a unit test:
  `expect(catalogMissingIds()).toEqual([])` so a renamed/removed exercise id fails CI.
- A2-F3. **Beginner cable policy is "advanced-only".** `cableOk()` excludes free-cable for
  beginner+novice+intermediate (only `advanced` keeps them). If product wants intermediates to
  use cables (e.g. face-pull for shoulder health), relax to `tier !== 'beginner' && tier !==
  'novice'` — single-line change in `planGenerator.ts`.
- A2-F4. **Machine catalog breadth.** Catalog covers the founder's named machines (27). Could add
  more common machines later (e.g. assisted pull-up/dip machine, converging row, pendulum/V-squat
  variants, smith-machine guided lifts) — each needs a real `exercises.ts` entry first.
- A2-F5. **Adductors muscle id.** `adduction-machine` maps to `glutes` (no `adductors` MuscleId in
  the taxonomy). If the muscle map grows an adductor id, retarget it for precise coverage stats.

## Agent 1 — Training Engine (deferred, out of this scope)

- F1. Wrist / elbow / ankle injuries are captured in onboarding but have no exercise
  filtering rule yet. Add curated risky-id sets (e.g. wrist → straight-bar curls/pressing
  grip alternatives; ankle → high-impact/jumping; elbow → heavy direct arm work) similar to
  knee/shoulder/back.
- F2. Injury handling is exclusion-only. A future step could substitute an explicit safer
  *alternative* per excluded exercise (the data model already has `Exercise.alternatives`)
  so the day keeps its exact slot count instead of just dropping the risky pick.
- F3. Advanced `arnold` / `bro_split` would benefit from dedicated day types
  (chest-only, shoulders-only, back-only) for exact classic layouts.
- F4. Session-duration could also tune set count / rest, not only exercise count, for a
  tighter time fit at 30 vs 90 minutes.
- F5. The legacy `CustomizationCenter` template marketplace (`StepWorkoutTemplate`) is the
  advanced editor; only the `StepGeneratePlan` "choose another template" entry is gated for
  beginners. Revisit whether the whole advanced template step should be hidden for beginners.

---

## Agent 2 — Nutrition (deferred)

## F1 — تفعيل foodPreferences في البحث/الاقتراحات
- الحالة: مؤجّل (غير عملي الآن).
- السبب: الإعداد الجديد لا يجمع «أطعمة مكروهة» (تُحفظ فارغة)، ويجمع `dietPattern`
  و`allergies` فقط. قاعدة الأطعمة لا تحمل وسوم حساسية/نمط غذائي، وقوالب الوجبات
  محدودة، فالتصفية الدقيقة غير عملية بثقة الآن.
- المقترح لاحقًا:
  1. إضافة حقل «أطعمة مكروهة» لخطوة تفضيلات الأكل في `PlanBuilder`.
  2. وسم عناصر `foodItems` بمسبّبات الحساسية الشائعة ونمط الأكل (نباتي/كيتو…).
  3. تمرير المكروهات/الحساسيات إلى `searchFood`/مولّد الاقتراحات لخفض ترتيبها أو إخفائها.

## F2 — توزيع السعرات على أقسام الوجبات
- عند `meal_suggestions` نبني عدد الأقسام من `mealsPerDay`، لكن لا نوزّع حصص السعرات
  المقترحة لكل قسم في تبويب التغذية (التسجيل يدوي). يمكن لاحقًا اقتراح حصّة لكل وجبة.

## F3 — خانات وجبات أكثر من أربع
- نموذج التخزين الحالي لخانات الوجبة أربع (فطور/غداء/عشاء/سناك). عند `mealsPerDay` = 5–6
  نطوي الزائد ضمن «سناك». لاحقًا يمكن دعم خانات سناك متعددة دون كسر السجلات القديمة.

---

## Agent 4 — Workout Runtime / History / Adherence (2026-06-29)

- **Empty-workout UX:** decide product-side whether "ابدأ تمرين فارغ" should
  build an in-session "add exercise" flow or be removed for Phase 1. Currently
  it renders a safe empty state and returns to Today (no crash, but no logging).
- **Rest days:** `todayPlanDay` maps every weekday to a training day (modulo
  plan length). A future enhancement could honor the weekly schedule's actual
  rest days so "today" can legitimately be a rest day with no prompted workout.
- **Adherence target source:** today the weekly target is read from the
  generated plan's day count. If onboarding `daysPerWeek` and generated plan
  days ever diverge, re-source the target from `OnboardingProfile` directly.
- **No automated tests:** the repo has no test runner configured. Consider
  adding unit tests for `recordExercise`, `weeklyAdherenceStreak`, and the new
  session normalization to lock in the history/adherence invariants.
- **Bundle size:** the production bundle is ~890 kB (pre-existing warning).
  Code-splitting is a later-phase optimization, untouched here.

---

## Agent 3 — Dashboard binding (2026-06-29)

- **Reactivity to mid-session plan edits.** `useDashboardSignals` reads the onboarding
  profile once per `profile` change. If a future flow edits the OnboardingProfile without
  re-deriving `customization.profile`, add a storage/event subscription so card priority
  refreshes live.
- **Migrated users + wellness mode.** Wellness `enabled` is bound at onboarding completion
  only. Migrated legacy users keep their stored `wellnessPlan.enabled`. A later pass could
  re-derive `enabled` from `wellnessTracking.mode` for migrated profiles too.
- **Bilingual dashboard copy.** New dashboard strings are inline Arabic (language is fixed
  `ar`). When English is unlocked, move BuiltForYou / NextAction / ProgressSnapshot copy
  into `ShellStrings`.
- **NextAction depth.** The beginner helper currently surfaces one step (today's workout or
  nutrition on rest days). A later phase could chain a short guided checklist for the first
  week.

---

## Agent 5 — Trust / Cleanup / Regression QA (Phase 1)

> كلها خارج نطاق Phase 1 / غير حاجبة. مُوثّقة بدل إصلاحها هنا (وكيل QA لا يفعل عمل ميزات).

1. **بذور التخصيص الافتراضي**: `getDefaultCustomization()` يبذر مكملات/وجبات
   افتراضية (مع جرعات) و`defaultSupplements`. التدفّق الحقيقي يفرّغها، لكن يُفضّل
   فصلها صراحةً كـ«demo seed» أو تفريغها في الافتراضي لتقليل خطر التسرّب مستقبلًا.
2. **عنصر التزام `progress-photo`**: باقٍ في `data/commitmentLibrary.ts` كالتزام
   ذاتي يفعله المستخدم (لا يدّعي التطبيق تخزين صور). قرار منتج: إبقاؤه أم إزالته مع
   بقيّة نطاق صور التقدّم في مرحلة لاحقة.
3. **كود غير مُفعّل**: `StepBasics.tsx` غير مستورد في أي مكان، وفرع
   `onboardingSteps` في `CustomizationCenter` غير مُستدعى (الإعداد الأول صار
   `PlanBuilder`). يُنظر في حذفه بأمان ضمن تنظيف لاحق مخصّص.
4. **حجم الحزمة > 500KB**: تحذير بناء غير حاجب. تحسين أداء مستقبلي عبر
   code-splitting / manualChunks.
5. **النوع `MeasurementCategory='photo'`** في `types/progress.ts` باقٍ دون مدخل
   صورة فعلي — تنظيف نوعي عند حسم نطاق الصور.

---

## Phase 2 — Integration QA (Agent 6) — 2026-06-29

> QA of `integration/phase2` at HEAD `1088464` — ALL Phase-2 branches merged
> (goals, exercises, nutrition, simplify, muscle-steps, A2 machine-first, A4 simple/
> greeting/quick-entry). No P0 regressions found. Resolved during Phase 2 (verified):
> greeting "أهلًا يا {name}" + daily rotating phrase + 1-tap entry (A4); beginner cable
> exclusion + machine catalog UI (A2); manual step counter `stepCounter.ts` (A5). Items
> below are the remaining quality/completeness gaps (documented, not fixed — QA scope).
> NOTE: branch was pushed to concurrently by multiple agents during QA.

- **FU-P2-1 (HIGH, robustness):** Onboarding "building" screen (`PlanBuilder.tsx`) completes
  via `requestAnimationFrame`, which browsers pause in a backgrounded tab → stalls at 0%
  until refocus (self-heals). Add a `setTimeout(finishRef.current, 2600)` fallback (cleared
  on unmount) or finish on `visibilitychange`. Only stall observed in QA.
- **FU-P2-3 (MED, content):** Full-body generated days still "جسم كامل أ/ب/ج"
  (`planGenerator.ts:403`); legacy `full-body-3`/`beginner-gym`/`fat-loss` templates also
  أ/ب/ج. Push/Pull/Legs already numbered. Give full-body days professional names (beginners
  on 3 days currently see أ/ب/ج).
- **FU-P2-2 (LOW, consistency):** Generator excludes free-cables for beginners, but the
  static `beginner-gym` template still lists `lat-pulldown`/`seated-cable-row`. Align it
  (low impact: default path is the generated plan, not the template).
- **FU-P2-4 (MED, UX):** Onboarding (`PlanBuilder`) shortened via optional/advanced gating
  but still multi-step; consider trimming the default beginner path further.
- **FU-P2-7 (LOW, content):** Saudi food DB lacks "البيك / Al Baik" (has kabsa/mandi/
  shawarma/broast). Add if wanted.
- **FU-P2-8 (LOW, perf):** Main JS chunk ~0.9 MB (~0.24 MB gzip) — non-blocking; consider
  code-splitting / manualChunks.
- **PRODUCT-Q (confirm):** 3rd onboarding goal is "زيادة القوة" (strength), not "maintain"
  (target/ETA correctly hidden for strength). Confirm intended.

### Resolved during Phase 2 (were earlier follow-ups)
- ✅ Greeting "أهلًا يا {name}" + daily rotating phrase (`data/dailyPhrases.ts`).
- ✅ 1-tap quick-start-workout + quick-add-food cards on home.
- ✅ Beginner machine-first / free-cable exclusion in the plan generator.
- ✅ Machine catalog browsable in `ExerciseLibraryView` (equipment view toggle).
- ✅ Manual daily step counter (`lib/stepCounter.ts` + `StepCounterCard.tsx`).
