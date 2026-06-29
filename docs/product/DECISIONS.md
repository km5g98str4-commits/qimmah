# Qimmah Decisions Log

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
