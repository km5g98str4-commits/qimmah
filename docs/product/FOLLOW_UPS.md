# Qimmah Follow-ups

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
