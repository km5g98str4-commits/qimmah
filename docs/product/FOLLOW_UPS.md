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
