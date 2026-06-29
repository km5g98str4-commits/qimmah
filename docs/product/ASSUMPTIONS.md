# Qimmah Assumptions Log

## Agent 1 — Training Engine

- A1. Injury input is matched from the onboarding canonical ids (`knee`, `shoulder`,
  `lower_back`) and their Arabic labels (`الركبة`, `الكتف`, `أسفل الظهر`). `wrist`,
  `elbow`, `ankle` are collected by onboarding but have no exercise-selection rule yet
  (see FOLLOW_UPS) — they pass through harmlessly.
- A2. `arnold` and `bro_split` advanced splits are approximated on the existing 7 day-type
  slot engine (no dedicated chest-only / shoulders-only day types exist):
  arnold = upper / arms / lower; bro_split = push / pull / arms / lower. This preserves
  sensible muscle coverage even if it is not the exact classic layout.
- A3. `leg-press` (machine, controlled) is treated as knee-safe and is kept for knee
  injuries as the quad alternative to barbell squats; `leg-extension` is excluded
  (open-chain knee shear). This is a programming heuristic, not medical advice.
- A4. Session-minute → exercise-count deltas assume the 5 onboarding duration options
  (30/45/60/75/90). Any value maps through the same ≤30/≤45/≤60/≤75/≥76 buckets.
- A5. The 2×/week-per-muscle guarantee applies to the auto engine. An explicit advanced
  split is the user's deliberate tradeoff and is honored even if it trains a muscle 1×/week
  (warning emitted).

---

## Agent 2 — Nutrition

## A1 — تطبيع NEAT (light/low → 1.20)
- `OnbActivityProfile.neat` يأخذ القيم: sedentary/light/moderate/high.
- في معامل NEAT: sedentary و light تُعاملان 1.20، moderate 1.35، high (=active) 1.45.
- إذا وردت قيمة قديمة «low» فهي تُعامَل كـ sedentary (1.20) عبر القيمة الافتراضية الآمنة
  في `totalActivityMultiplier`.

## A2 — اشتقاق NEAT عند غيابه (المستخدمون المهاجَرون فقط)
- الإعداد الجديد يجمع NEAT دائمًا (خطوة 14)، فالقيمة حاضرة عمليًا لكل مستخدم جديد.
- عند الهجرة من تخصيص قديم بلا NEAT يُشتق مستوى النشاط من أيام التمرين. هذا يُدخل
  تداخلًا بسيطًا (NEAT مشتق من الأيام + إضافة الأيام)، لكنه محدود بالسقف 1.9 ولا يؤثّر
  على المستخدمين الجدد. مقبول وموثَّق.

## A3 — الجنس «غير محدّد»
- الإعداد الجديد يطلب الجنس دائمًا (ذكر/أنثى). قيمة «unspecified» تأتي فقط من بيانات
  قديمة؛ نستخدم لها BMR متوسطًا وعتبة تنبيه 1500.

## A4 — أسلوب العرض الافتراضي للمستخدمين الحاليين
- خطط التغذية المحفوظة قبل هذا التغيير لا تحمل `style`؛ نفترض `meal_suggestions`
  للحفاظ على سلوكهم الحالي (إظهار أقسام الوجبات). `mealsPerDay` الغائب → 4 أقسام.

## A5 — قيم Food DB تقديرية
- سعرات/ماكروز رز بخاري والحلويات (كنافة/بسبوسة/لقيمات) تقديرية وتختلف حسب الطبخ
  والكمية، تمامًا كبقية قاعدة الأطعمة (مع تنويه `FOOD_ESTIMATE_NOTE`).
