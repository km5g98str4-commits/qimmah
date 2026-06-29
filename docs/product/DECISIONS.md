# Qimmah Decisions Log

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
- next: commit + push feature work.
- branch_state: working branch `claude/nutrition-onboarding-integration-rfo9j5`
  (rebased onto `origin/integration/phase1-smart-foundation`); dirty → about to commit.

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
