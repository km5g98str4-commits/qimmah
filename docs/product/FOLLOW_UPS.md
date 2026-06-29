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
