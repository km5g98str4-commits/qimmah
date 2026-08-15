/**
 * CANONICAL-SURFACE-LOCK — سجلّ الأسطح المزدوجة.
 *
 * ═══ لماذا هذا الملف موجود ═══
 * جهدان مستقلّان أصلحا الملف الخطأ. `formatNumber` (BUG-019) وُضع في
 * `NutritionV2`/`WorkoutV2`، وسجلّ المفاتيح وثّق `WorkoutV2` — بينما `App.tsx`
 * يعرض `NutritionView`/`WorkoutView`. النتيجة: عطلان يُعلَنان «محلولين» وهما
 * حيّان أمام المستخدم، وتسرّب بيانات عبر الحسابات.
 *
 * والسبب ليس إهمالًا بل **تسمية تكذب**: اللاحقة `V2` توحي بالأحدث. وهي أحيانًا
 * حيّة (`ProgressV2` · `ProfileV2` عبر غلاف) وأحيانًا ميتة تمامًا
 * (`NutritionV2` · `WorkoutV2`). لا يمكن لقارئ — إنسانًا كان أو وكيلًا — أن
 * يعرف الفرق من الاسم. فالسجلّ يعلنه، والحارس يثبته من **رسم الوحدات الحقيقي**.
 *
 * ═══ ما ليس هذا الملف ═══
 * ليس خطّة توحيد ولا إذنًا بحذف. التوائم تبقى كما هي؛ حذف أيّها يحتاج إثبات
 * تكافؤ وغياب مستهلكين — وهو قرار مستقلّ خارج هذه الحزمة.
 */

/** الأسطح المزدوجة: مالك حيّ واحد، وتوائم معلَنة غير موجَّهة. */
export const SURFACES = [
  {
    id: 'nutrition',
    canonical: 'src/views/NutritionView.tsx',
    routedBy: "App.tsx → V.NutritionView (lazy import '@/views/NutritionView')",
    twins: ['src/views/NutritionV2.tsx'],
    note: 'تلقّى التوأمُ إصلاح BUG-019 بينما المسار الحيّ بقي بلا منسّق أرقام.',
  },
  {
    id: 'workout',
    canonical: 'src/views/WorkoutView.tsx',
    routedBy: "App.tsx → V.WorkoutView (lazy import '@/views/WorkoutView')",
    twins: ['src/views/WorkoutV2.tsx'],
    note: 'سجلّ المفاتيح وثّق مفتاح التوأم (:active-workout:v2) لا مفتاح المسار الحيّ.',
  },
  {
    id: 'plan-preview',
    canonical: 'src/components/plan/PlanPreview.tsx',
    routedBy: 'مُستهلَك من مسار التسليم/التخصيص الحيّ',
    twins: ['src/views/PlanPreviewView.tsx'],
    note: 'غلاف شاشة غير موجَّه؛ المكوّن هو المستهلَك فعلًا.',
  },
]

/**
 * توائم حيّة **بغلاف** — كلاهما في الرسم، والمنفّذ هو `V2`.
 * تُعلَن حتى لا يظنّها قارئ ميتةً فيحذفها، ولا يظنّ الغلاف هو المنفّذ فيعدّله.
 */
export const WRAPPED = [
  { id: 'progress', wrapper: 'src/views/ProgressView.tsx', implementation: 'src/views/ProgressV2.tsx' },
  { id: 'profile', wrapper: 'src/views/ProfileView.tsx', implementation: 'src/views/ProfileV2.tsx' },
]

/** أقسام قديمة خارج الرسم — ليست أسطحًا مزدوجة، لكنها ليست إنتاجًا أيضًا. */
export const UNROUTED_SECTIONS = [
  'src/sections/CommitmentKeys.tsx',
  'src/sections/Customization.tsx',
  'src/sections/Dashboard.tsx',
  'src/sections/Meals.tsx',
  'src/sections/Supplements.tsx',
]

/**
 * «المعالجات» — سمات يجب ألّا تسبق التوأمَ إلى المالك الحيّ.
 *
 * القاعدة: إن حمل التوأم معالجةً ولم يحملها المالك الحيّ، فالإصلاح هبط على
 * ملفّ لا يراه المستخدم. هذا بالضبط شكل BUG-019، ولذلك يفشل الحارس عنده.
 */
export const TREATMENTS = [
  { id: 'formatNumber', pattern: /\bformatNumber\b/, why: 'سياسة الأرقام المحلية (BUG-019)' },
  { id: 'checked-storage', pattern: /\b(writeJson|safeStorage|WriteResult)\b/, why: 'صدق الحفظ (§5 من الميثاق)' },
  { id: 'paid-guard', pattern: /\buseAccess\b|\bguard\(/, why: 'بوّابة الأفعال المدفوعة' },
]
