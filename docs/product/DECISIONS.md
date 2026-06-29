# Qimmah Decisions Log

## P2 Agent 1 — verify pass + strength summary fix — 2026-06-29 (second run)

A prior P2 A1 run already landed the core mission on `integration/phase2`
(commits `a7013f0` → `9d745de` → `302267e`): 3 goals, recomp→cut migration,
cut/bulk/strength calories, target-weight-once. This run **verified** all of it
end-to-end (build/lint/typecheck green; recomp migration recomputes via
`withFreshTargets`; calories cut=TDEE−400 / bulk=TDEE+300 / strength=TDEE+150)
and **closed the one gap the prior run left**:

- **`MyTargets` (live plan summary, rendered in `ProfileView`) now hides the
  "الوزن الهدف" + "مدة تقديرية" cards for `strength`** — for strength,
  `toLegacyProfile` sets target = current weight and ETA = 0, so showing them was
  misleading. They now render only for `cutting`/`bulking` (the weight goals), and
  the ETA card surfaces the derived weekly rate (e.g. "أسبوع · 0.5 كجم/أسبوع"),
  making the captured target weight visibly *used*. The prior run had explicitly
  left `MyTargets` "intact".
- No other files touched. `recomposition` stays an internal-only `GoalType` engine
  value (see decision below) — unreachable from any UI, migrated to `cut` on every
  load path. Did **not** edit `planGenerator.ts`/`dashboardLayout.ts` (other agents).

## P2 Agent 1 — Goals reduced to 3 + target weight actually used — 2026-06-29

### What changed
- **Goals = exactly 3**: `bulk` (تضخيم), `cut` (تنشيف), `strength` (زيادة قوة).
  Removed `recomp` (تركيب الجسم) from the goal-selection UI (`goalChoices`), the
  onboarding enums (`OnbGoalType`, `GoalValue`), and the broad goal selector
  (`goalTypeOptions` no longer lists `recomposition`).
- **recomp migration (no crash, recomputes with cut formula)**:
  - Stored onboarding profile with `goal.type === 'recomp'` → mapped to `cut` on load
    (`migrateLegacyOnbGoal` in `loadOnboardingProfile`).
  - Stored customization profile with `goalType === 'recomposition'` → mapped to
    `cutting`/`cut` on load (`migrateLegacyGoal` in `loadCustomization`). Because
    `goalType` changes, the profile hash differs and `withFreshTargets` recomputes
    targets with the cut formula (TDEE−400).
  - Legacy `recomposition` profiles in `dashboardLayout.goalFromProfile` normalize to
    `cut` (same nutrition-first path).
- **Goal calories** (unchanged engine, single source `rawCaloriesForGoalType`):
  cut = TDEE−400 (with floor), bulk = TDEE+300, strength = TDEE+150. Removed the
  `recomposition` (=TDEE) branch.
- **Target weight captured once, actually used**: onboarding asks target weight once,
  only for cut/bulk (`showsTargetWeight`). cut/bulk derive `weeklyWeightChangeKg` +
  `estimatedWeeksToGoal` from (current − target) in `computeTargets`. For `strength`,
  target weight is hidden and `toLegacyProfile` sets it to the current weight → no
  misleading weekly-change/ETA. Plan summary (`MyTargets`) already surfaces target
  weight + estimated weeks; left intact.

### Decision: `recomposition` retained ONLY as an internal `GoalType` engine value
- The user-facing/onboarding goal is fully reduced to 3 and `recomp` is gone from every
  selector and onboarding enum. The broad `GoalType` union (`profile.ts`) still contains
  `'recomposition'` because it is a key in `Record<GoalType, …>` tables inside
  `planGenerator.ts` (SCHEMES, COMMITMENTS_BY_GOAL — **workout runtime, out of scope**)
  and a `case` in `dashboardLayout.ts` (**dashboard layout, out of scope**). Removing it
  from the union would force edits to those owned-by-other-agents files. It is now
  **unreachable** from any UI and all onboarding/migration paths map it to `cut`.
- Forced minimal edits in `dashboardLayout.ts` (return `'cut'` instead of the removed
  `'recomp'` literal; drop the `=== 'recomp'` comparison) were unavoidable type-consistency
  fixes from dropping `'recomp'` from `OnbGoalType`; they are behavior-preserving
  (recomposition still routes to the nutrition-first/cut path).

### Confirmed (no regressions)
- No "what training type do you want" question exists or was added; the split stays
  auto/advanced (training preference, not a goal). BMI label remains descriptive/neutral.
  NEAT activity question + the NEAT-vs-training no-double-count calorie split untouched.
- Verified at runtime (vite-node): recomp profile loads→migrates→recomputes (cut, weeks=16);
  cut/bulk/strength deltas = −400/+300/+150; strength target weight = current, ETA = 0.
- build + lint + typecheck all green.

---

## RESUME — Agent 1 Training — 2026-06-29
- done: implemented all training-engine requirements (advanced split override, session-duration
  exercise count, experience volume, onoff/returning conservative start, equipment filter incl.
  small-gym basic cable, injury filtering with safe alternatives, English-first exercise names,
  beginner marketplace gate). build + lint + typecheck all green. QA harness (7 scenarios) all pass.
- in_progress: none — committing.
- next: commit + push feature/phase1-training-engine; write final report.
- branch_state: feature/phase1-training-engine (local, based on integration), dirty → committing now.

---

## Agent 1 — Training Engine consumes OnboardingProfile

### D1. Advanced split override is honored when "schedulable"
- `trainingPreferences.splitMode='advanced'` + `advancedSplit` overrides the auto split.
- "Valid" = the chosen split's distinct day-cycle fits the chosen `daysPerWeek`
  (full_body≥1, upper_lower≥2, push_pull_legs≥3, arnold≥3, bro_split≥4). If the
  user picks more days than the cycle, the cycle repeats (e.g. PPL over 6 days = PPL×2).
- If not schedulable for the chosen days, we fall back to the auto split (never crash, never empty).
- The 2×/week-per-muscle rule governs the **auto** engine. An explicit advanced choice is
  the user's tradeoff: if it trains legs <2×/week (e.g. `bro_split` 5-day = 1× each) we
  **honor it** but emit a non-blocking warning. We do not silently override an explicit choice.

### D2. arnold / bro_split are approximated on the existing day-type engine
- The slot engine has day types: full / upper / lower / push / pull / arms / core.
- `arnold` → cycle [upper (chest+back), arms (shoulders+arms), lower (legs)].
- `bro_split` → cycle [push (chest+tri), pull (back+bi), arms (shoulders+arms), lower (legs)].
- These are faithful approximations, not exact bodybuilding canon (see ASSUMPTIONS).

### D3. session_minutes controls exercise count (volume), experience controls the base
- Base count from experience (beginner/novice 5, intermediate/advanced 6).
- Duration delta: ≤30→−2, ≤45→−1, ≤60→0, ≤75→+1, ≥76→+2. Clamped to [3,9].
- Guarantees 30-min sessions have fewer exercises than 75+-min sessions at any experience.

### D4. consistency returning/on_and_off start conservative
- `returning` or `on_and_off` (or goalType `returning`) → first-week deload
  (one fewer set per exercise, floor of 2) + a "ramp up gradually" warning.
- `consistent` (and unset) → normal starting volume.

### D5. limitations.injuries filter exercise selection with safe alternatives
- Detected from canonical onboarding ids and Arabic labels: knee / shoulder / back(lower_back).
- knee → exclude heavy axial/again-loaded squats & deep lunges & leg-extension & wall-sit;
  KEEP machine leg-press, goblet & bodyweight squat, all hinge ham/glute work (safe quad/leg path).
- shoulder → exclude barbell overhead press, push press, upright row, arnold press;
  KEEP dumbbell/machine shoulder press, lateral raises, face pull.
- back → exclude deadlift variants, good morning, barbell/T-bar row, RDL variants;
  KEEP machine/cable/dumbbell rows, lat pulldown, hip thrust / glute bridge.
- If exclusion empties a slot, the day simply gets fewer exercises (documented fallback),
  never an impossible/unsafe pick. A non-blocking note is shown. No medical advice is given.

### D6. Exercise display = English first, Arabic second; target muscle in Arabic
- `exerciseDisplayName` (Arabic UI) now renders `"English — العربية"`.
- Muscle chips/labels remain Arabic (target muscle in Arabic) as before.

### D7. Equipment filter: small gym keeps basic cable
- `small` gym now allows free weights + machines + basic cable (bans only specialty: smith, rope),
  matching "small gym prefers dumbbells/machines/basic cable". bodyweight/home/commercial unchanged.

### D8. No template marketplace in the real onboarding for beginners
- The runtime onboarding (`PlanBuilder`) has no template marketplace at all — the plan is
  generated from answers. The legacy editor's "choose another template" is gated to non-beginners.

---

## RESUME — Agent 2 Nutrition — 2026-06-29
- done: Wired OnboardingProfile as the single source of truth for nutrition.
  - New NEAT/training split multiplier + low-calorie warning in `src/lib/calculators.ts`.
  - Nutrition display style (meal_suggestions / macros_only / simple_guidance) +
    meals_per_day threaded through `Profile` → `NutritionPlan` → `NutritionView`.
  - Canonical accessor `nutritionTargetsFromOnboarding()` in `src/lib/onboardingProfile.ts`.
  - Food DB V2: added رز بخاري + كنافة/بسبوسة/لقيمات (new حلويات category).
  - `MyTargets` now uses canonical `targets.targetCalories`.
  - build + lint + typecheck all green; sample-user calc verified.
- in_progress: none (work unit complete).
- next: integration agent to merge branch into `integration/phase1-smart-foundation`.
- branch_state: `claude/nutrition-onboarding-integration-rfo9j5`
  (rebased onto `origin/integration/phase1-smart-foundation`); clean; PUSHED at commit 876858e.

> ملاحظة فرع: مهمّة Agent 2 طلبت فرع `feature/phase1-nutrition-activity-engine`
> أساسه `integration/phase1-smart-foundation`. قواعد الـ harness تُلزم الدفع إلى
> `claude/nutrition-onboarding-integration-rfo9j5` فقط. للتوفيق: أُعيد ضبط فرع العمل
> على `origin/integration/phase1-smart-foundation` (الأساس الصحيح الذي يحوي مصدر
> الحقيقة للإعداد)، ويُدفَع إلى الفرع المصرّح به. لا دمج في integration (يتولّاه وكيل
> التكامل فقط).

---

## D1 — مصدر واحد لأهداف التغذية (Single canonical target source)
- القرار: كل الأهداف (سعرات/ماكروز/ماء) تُحسب في `computeTargets(Profile)` فقط، و`Profile`
  يُشتق من `OnboardingProfile` عبر `toLegacyProfile`. الإعداد (`StepSmartCalculations`)،
  الرئيسية (`DailySummary`)، تبويب التغذية (`NutritionView`)، و«حساباتي» (`MyTargets`)
  كلها تقرأ من نفس المصدر، فتتفق الأرقام دائمًا.
- إضافة `nutritionTargetsFromOnboarding(op)` كمدخل صريح موثَّق لهذا المصدر.
- السبب: المبدأ الأساسي «الإعداد مصدر الحقيقة» ومنع أي أرقام منفصلة.

## D2 — فصل NEAT عن التمرين لتفادي مضاعفة احتساب السعرات
- BMR = Mifflin-St Jeor (ذكر: 10w+6.25h−5age+5، أنثى: −161).
- NEAT (حركة الحياة): خامل/خفيف=1.20، متوسط=1.35، نشِط/عالٍ=1.45.
- إجمالي المعامل = NEAT + (أيام التمرين × 0.025)، بسقف 1.9.
- السبب: المعاملات القياسية 1.2–1.9 تتضمّن التمرين أصلًا؛ لو اشتققنا النشاط من أيام
  التمرين ثم أضفنا التمرين مجددًا لتضخّمت السعرات. الفصل المتعمّد يمنع المضاعفة.
- مثال المستخدم (ذكر، 30، 180سم، 80كجم، تنشيف، 4 أيام، نشاط منخفض):
  BMR=1780 · المعامل=1.30 · TDEE=2314 · الهدف=1914 · بروتين 160غ · دهون 72غ · كارب 157غ · ماء 3.0ل.

## D3 — سعرات الهدف والماكروز والماء
- سعرات الهدف فوق TDEE: تنشيف −400، تضخيم +300، إعادة تكوين = TDEE، قوة +150.
- الماكروز: بروتين 2.0غ/كجم، دهون 0.9غ/كجم، الكارب = (السعرات − بروتين×4 − دهون×9)/4.
- الماء: الوزن × 0.035، لأقرب 0.5 لتر، بحدّ أدنى 2.5 لتر.

## D4 — تنبيه السعرات المنخفضة (نصّ فقط، لا حظر ولا نصيحة طبية)
- عتبة: أقل من BMR للإناث / أقل من 1500 للذكور (وللجنس غير المحدّد 1500).
- يُقارَن الهدف الخام قبل تطبيق الأرضية؛ عند انخفاضه يُضاف نصّ تنبيه محايد في `targets.notes`
  وتبقى الأرضية الآمنة كما هي (لا حظر — التطبيق لا يحظر أصلًا).

## D5 — أسلوب عرض التغذية (macros_only لا يفرض اقتراح وجبات)
- `nutritionPreferences.style` يُمرَّر من الإعداد إلى `Profile.nutritionDisplayStyle`
  ثم إلى `NutritionPlan.style`.
- `meal_suggestions`: تبويب التغذية يبني أقسام الوجبات حسب `mealsPerDay`
  (2→فطور/عشاء، 3→+غداء، 4↑→+سناك)، والمولّد ينتج وجبات مقترحة.
- `macros_only` / `simple_guidance`: لا اقتراح وجبات — أهداف + مسجّل موحّد فقط،
  والمولّد ينتج خطة بلا وجبات (لا بيانات وهمية).
- أي عنصر مسجّل بخانة غير معروضة يُطوى لآخر قسم متاح حتى لا تختفي السجلات القديمة.

## D6 — Food DB V2
- أُضيف رز بخاري (كارب) وكنافة/بسبوسة/لقيمات تحت تصنيف جديد «حلويات».
- كل الأطعمة المطلوبة تُرجِع نتائج بحث: رز/rice، دجاج/chicken، كبسة، بخاري، كنافة،
  شاورما، بروست(د)، مندي.

---

## RESUME — Agent 4 Workout Runtime — 2026-06-29
- done: Audited the full workout runtime → history → adherence pipeline against
  the 11 hard requirements; it was already largely implemented on the
  integration base. Hardened three concrete reliability gaps:
  (1) empty-workout crash guard in `WorkoutMode`,
  (2) old/malformed session normalization at the read boundary in `historyStore.getWorkoutSessions`,
  (3) skipped-exercise pollution guard in `exerciseHistory.recordExercise`.
  Build + lint + typecheck pass.
- in_progress: none (changes complete, committing).
- next: commit + push `claude/phase1-workout-runtime-history-f3e4r9`, write final report.
- branch_state: `claude/phase1-workout-runtime-history-f3e4r9`, based on
  `origin/integration/phase1-smart-foundation`, dirty (about to commit).

---

## Agent 4 — Workout Runtime / History / Adherence (2026-06-29)

### Branch
- Mission requested base `integration/phase1-smart-foundation` and a
  `feature/phase1-workout-runtime-history` branch, but the session's hard git
  rule mandates the branch name `claude/phase1-workout-runtime-history-f3e4r9`.
  **Decision:** build on `origin/integration/phase1-smart-foundation` (the
  Phase 1 onboarding source-of-truth lives there) and push to the mandated
  `claude/...` branch. No merge into integration (integration agent only).

### Canonical history store (no duplicate stores)
- `src/lib/historyStore.ts` is the single source of truth for all logs
  (`qimmah:history:*:v1`). `workoutSessions.ts` and `exerciseHistory.ts` are
  thin wrappers that read/write through it — the legacy keys
  (`qimmah:workoutSessions:v1`, `qimmah:exerciseHistory:v1`) are kept only for
  one-time migration and are never written to. No second session store exists.

### Same generated source for Today + Workout tab
- Both `DashboardView`/`Today` and `WorkoutView` read the workout from
  `customization.workoutPlan` via `todayPlanDay()`. The plan itself is produced
  by `buildCustomizationFromOnboarding()` → `generatePlan()` on onboarding
  completion (see `PlanBuilder.finishRef`). No demo/seeded data in the real
  flow (demo data is isolated to `DemoCustomizationProvider`).

### Weekly adherence target = generated plan days = onboarding days_per_week
- All consumers (`Today`, `DailySummary`, `WorkoutView`, `ProgressView`,
  `TodayWorkoutHero`) pass `customization.workoutPlan.days.length || 3` as
  `daysPerWeek`. The generated plan's `days.length === clamp(trainingDays,1,7)`
  and `trainingDays` is sourced from onboarding `daysPerWeek`
  (`toLegacyProfile`), so "generated plan days" and "onboarding days_per_week"
  are the same number by construction. `addCutCardio` adds cardio **into**
  existing days, never extra days, so a cut goal does not inflate the target.
- `weeklyAdherenceStreak` (in `streaks.ts`) counts **unique** completed workout
  days per week (a `Set` keyed by date) and does **not** break the streak on an
  incomplete current week (it starts counting from the previous week when the
  current week hasn't met the target yet). Kept as-is — already correct.

### Hardening fixes applied this session
1. **Empty-workout guard** (`WorkoutMode.tsx`): the "ابدأ تمرين فارغ" button
   could launch workout mode with zero exercises, which dereferenced
   `day.exercises[0]` and crashed. Added a safe empty state (close button) after
   all hooks. No redesign of workout mode — purely a crash guard.
2. **Session normalization on read** (`historyStore.getWorkoutSessions`): old
   or corrupt sessions (missing `exercises`, malformed `sets`) could crash every
   downstream reader (`RecentWorkout`, `progressStats`, `exerciseStats`,
   `muscleCoverage`, `trainingInsights`, `streaks`). Normalizing at the single
   read chokepoint guarantees a valid `exercises` array and safe set shape for
   all consumers, while preserving legacy compat fields (`weight`, `repsDone`).
3. **Skipped-exercise guard** (`exerciseHistory.recordExercise`): a fully
   skipped exercise (no completed set, not marked complete) no longer bumps
   `totalSessions`/`lastCompletedAt` or pollutes PR data, keeping "last
   completed" accurate. PR detection already required completed sets, so this
   is consistent.

### Pain notes
- Pain/injury notes in `WorkoutMode` remain **tracking-only** free-text inputs.
  No medical advice or interpretation is rendered around them.

---

## RESUME — Agent 3 Dashboard — 2026-06-29
- done: Dashboard bound to Phase 1 generated system. New `src/lib/dashboardLayout.ts`
  (goal/experience → card priority), rewrote `src/views/DashboardView.tsx`
  (BuiltForYou banner + priority-ordered lead cards + beginner NextAction +
  advanced ProgressSnapshot), wellness gating in
  `buildCustomizationFromOnboarding` (`enabled = mode !== 'none'`).
  build/lint/typecheck all pass.
- in_progress: none — feature complete, committing.
- next: commit + push `feature/phase1-dashboard-progress-binding`, write final report.
- branch_state: feature/phase1-dashboard-progress-binding, dirty (about to commit), not yet pushed.

## Agent 3 — Dashboard / Progress / Wellness Binding (2026-06-29)

1. **Source of truth for layout.** Card priority is derived from the OnboardingProfile
   (`loadOnboardingProfile()`), falling back to the generated `Profile` for migrated
   users. No hardcoded ordering. Logic lives in `src/lib/dashboardLayout.ts`.

2. **Card priority rule** (`buildLeadOrder`):
   - `cut`/`recomp` → nutrition lead (calorie control is the driver).
   - `bulk`/`strength` → workout lead (load/progression is the driver).
   - `beginner`/`novice` → a "Next Action" helper card is inserted in 2nd position.
   - `advanced` → a "Progress Snapshot" card is inserted in 2nd position.
   - `intermediate`/unknown → goal pair only, no inserted card.

3. **"Built for you" communication.** A `BuiltForYou` banner leads the dashboard with
   chips generated from the real plan: goal, days/week, split name, daily calories,
   experience. It makes the generated system feel personal and is data-driven.

4. **Wellness gating moved to the source of truth.** `buildCustomizationFromOnboarding`
   now sets `wellnessPlan.enabled = wellnessTracking.mode !== 'none'`. Mode `none` hides
   the supplement/medication card entirely (no fake cards); `basic`/`detailed` enable it
   with empty lists — an empty tracking shell the user fills in. The existing friendly
   empty state in `Today` is reused (no fabricated supplement/medication data).

5. **Adherence binding unchanged but verified.** Weekly adherence X/Y already reads
   `customization.workoutPlan.days.length` (the generated `daysPerWeek`) in
   `DailySummary`, `ProgressView`, and the new `ProgressSnapshot`. Kept as-is.

6. **Demo isolation preserved.** The `BuiltForYou` banner and priority logic live only in
   `DashboardView` (real flow). `DemoView` renders `DailySummary`/`Today` directly via
   `DemoCustomizationProvider` and is untouched. No demo data leaks into the real flow.

7. **No progress photos** added anywhere (out of scope, and none existed).

8. **Copy is inline Arabic in the view**, consistent with the existing `DailySummary`/
   `Today` sections (which already inline Arabic). Language is fixed `ar`; not bloating
   the bilingual `ShellStrings` interface for view-local strings.

---

## RESUME — Agent 5 Trust/QA — 2026-06-29
- done: full trust/QA pass on `integration/phase1-smart-foundation`. 5 P1 fixes
  applied (reset key coverage, CustomizationCenter chip/save validation, founder
  name placeholder, progress-photo claim removal, privacy/terms safe back).
  QA report written (`PHASE1_QA_REPORT.md`). build + lint + typecheck all green.
- in_progress: committing + pushing feature branch.
- next: push `claude/phase1-trust-cleanup-qa-he6a0w`; integration agent merges.
- branch_state: `claude/phase1-trust-cleanup-qa-he6a0w` (rebased onto
  `origin/integration/phase1-smart-foundation`), to be committed + pushed.

## Agent 5 — Trust / Cleanup / Regression QA (Phase 1)

- **مفاتيح إعادة الضبط (`resetQimmah`)**: تقرّر أن «إعادة الضبط» يجب أن تمسح **كل**
  مفاتيح `qimmah:*` المستخدمة في الكود، بما فيها مصدر الحقيقة للإعداد
  (`qimmah:onboarding:profile:v1`)، تفضيلات التذكير (`qimmah:reminders:v1`)،
  بيانات المزامنة (`qimmah:sync:meta:v1`)، وجلسة Supabase المحليّة
  (`qimmah:supabase-auth:v1`). المبرّر: ترك أي مفتاح يعني بقاء بيانات قديمة بعد
  «إعادة ضبط كامل»، وهو ما يكسر الثقة. إعادة الضبط تُعيد تحميل الصفحة، فمسح مفتاح
  الجلسة آمن (يُعاد البدء نظيفًا؛ Supabase غير مضبوط في القالب أصلًا).
- **حارس الشِّيپس في `CustomizationCenter`**: تقرّر قفل القفز للأمام عبر شِيپس
  الخطوات عند أول خطوة مطلوبة ناقصة، مع السماح بالرجوع للخلف بحرّية، وتعطيل زر
  الإكمال حتى تكتمل كل الخطوات المطلوبة. المبرّر: منع إكمال الإعداد ببيانات غير
  صالحة (كان زر «التالي» محروسًا بينما الشِّيپس و`saveAndClose` غير محروسَين).
- **placeholder الاسم**: تقرّر إزالة اسم المؤسّس «زياد» من placeholders الحقول
  (`StepWelcome`, `StepBasics`) واستبداله بمثال محايد «محمد»، لأن القالب للبيع لا
  يجب أن يحمل اسمًا شخصيًا.
- **صور التقدّم**: تقرّر إزالة أي ادّعاء «رفع الصور قيد التطوير» من التدفّق الحقيقي
  (`ProgressSection` + نص الخصوصية)، لأن صور التقدّم خارج نطاق Phase 1 ولا يجب
  ادّعاء ميزة غير موجودة. أُبقي ضمان الخصوصية «على جهازك فقط».
- **رجوع الخصوصية/الشروط**: تقرّر الرجوع إلى آخر مسار داخلي مُلتقَط بدل
  `window.history.back()`، لمنع قذف المستخدم خارج التطبيق عند فتح الصفحة مباشرةً.
- **عدم حذف الكود الميّت**: `StepBasics`/فرع onboarding في `CustomizationCenter`
  غير مستخدَمَين حاليًا لكن لم يُحذفا (خارج نطاق QA؛ تعديل نصّي آمن فقط).

---

## Splash / 404 / Contact — 2026-06-29

Agent: Splash + 404 + Contact pages (isolated). Branch: `claude/splash-404-contact-c5gch2`
(designated by harness; based on `origin/integration/phase1-smart-foundation`).

### Feature 1 — Splash screen
- New `src/components/SplashScreen.tsx`, mounted as a sibling overlay to `<App />`
  in `src/main.tsx` (root mount only). It is a pure visual layer: App renders
  underneath immediately, so onboarding/auth logic is never blocked or delayed.
- Reuses existing brand identity (Dumbbell icon in `bg-primary` rounded square +
  wordmark `product.name` + `product.tagline`) on the dark brand page background —
  no new logo invented.
- Shows ~1.7s then fades out (450ms) and unmounts. Respects
  `prefers-reduced-motion`: skips the entrance animation and the fade (shows then
  removes instantly).

### Feature 2 — 404 / Not Found
- New `src/views/NotFoundView.tsx` (Arabic, RTL, dark, mirrors Privacy/Terms style).
- Integrated into the EXISTING hash router fallback in `src/App.tsx`: an unknown
  hash (e.g. `#/asdf`) now resolves to an internal `notfound` view instead of the
  previous silent redirect to dashboard/start. The bad hash is kept in the URL
  (view→hash sync skips `notfound`) so it behaves like a real 404.
- `notfound` is added to the `AppRoute` type but intentionally NOT to `ROUTES`, so
  it is fallback-only and never directly navigable / never matched by `routeFromHash`.
- Primary button «ارجع للرئيسية» routes to dashboard or start (guarded by onboarding
  state); secondary «الشاشة السابقة» uses `history.back()`.

### Feature 3 — Contact / Support
- New `src/views/ContactView.tsx` at `#/contact`, registered like `#/privacy` /
  `#/terms`: one route entry (`appRoutes.ts`) + one render branch (`App.tsx`) +
  one menu link in `Footer.tsx` next to الخصوصية/الشروط.
- Contact method: email with a `mailto:` CTA and a separate "report a problem"
  `mailto:` (pre-filled subject). No fake socials/phones/stats.
- **PLACEHOLDER to confirm:** support email `support@qimmah.app` — no real contact
  existed in the repo (`product.contactUrl` was `#goal`). Replace with the real
  support address before release.

### Strings
- All new copy is data-driven in `src/config/strings.ts` (`notFound`, `contact`
  blocks, both `ar` + `en`) per project rules — no hardcoded text in components.

### Shared files touched (router/entry/menu only, per isolation rule)
- `src/main.tsx` (root mount of splash), `src/App.tsx` (route branches + fallback),
  `src/lib/appRoutes.ts` (route entries), `src/components/Footer.tsx` (one menu link),
  `src/config/strings.ts` (copy). No onboarding/dashboard/workout/nutrition/training/
  engine/store/schema files touched.

### QA
- build / lint / typecheck all pass on a clean base and after changes.

## CHECKPOINT — P2 Agent 1 merged into integration/phase2 — 2026-06-29
- feature/phase2-goals-onboarding (a7013f0) merged via --no-ff into integration/phase2.
- build + lint + typecheck green post-merge. Goals reduced to 3; recomp migrates to cut; target weight drives ETA.
