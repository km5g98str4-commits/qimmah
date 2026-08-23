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
/**
 * الأدلّة التي تُمشَّط بحثًا عن سطح ميت غير معلَن.
 *
 * كان الحارس يفحص **المعلَن** وحده: توأمًا مسجَّلًا وقسمًا مسجَّلًا. فملفّ يموت
 * ولا يُسجَّل يمرّ صامتًا — وهو الشكل الذي وُجد الحارس أصلًا ليمنعه.
 */
export const SCANNED_DIRS = ['src/views', 'src/components', 'src/features', 'src/sections']

/**
 * مكوّنات خارج حزمة الشحن — **معلَنة لا مكتشَفة لاحقًا**.
 *
 * ⚠️ هذا السجلّ يقول «لا يصل المستخدم»، ولا يقول «آمن الحذف». الحذف موجة
 * مستقلّة بشرطها في الميثاق (§11/٩): كل مرشَّح يحتاج `grep` للمراجع الديناميكية
 * (مفاتيح نصّية · `lazy` · جداول مسارات) موثّقًا في التقرير. أمّا «خارج الرسم»
 * فمُثبَت هنا بالبناء نفسه: ما لا يجمعه esbuild من `src/main.tsx` لا يُشحن.
 */
export const UNROUTED_COMPONENTS = [
  // طبقة المخصِّص القديمة — سبقت `OnboardingV2` ولم يُوجَّه منها شيء.
  'src/components/customizer/EditableTable.tsx',
  'src/components/customizer/steps/StepBasics.tsx',
  'src/components/customizer/steps/StepGoal.tsx',
  'src/components/customizer/steps/StepLook.tsx',
  'src/components/customizer/steps/StepMeals.tsx',
  'src/components/customizer/steps/StepMetrics.tsx',
  'src/components/customizer/steps/StepSchedule.tsx',
  'src/components/customizer/steps/StepSupplements.tsx',
  'src/components/customizer/steps/StepWorkouts.tsx',
  // قشرة الهبوط القديمة.
  'src/components/Header.tsx',
  'src/components/SectionHeading.tsx',
  // بدائل خريطة العضلات — ملفّ التصادم المجمَّد (#7 وما بعده).
  'src/components/FlatMuscleBody.tsx',
  'src/components/MuscleChips.tsx',
  // نداءات التثبيت — النسخة الحيّة غيرها.
  'src/components/InstallBanner.tsx',
  'src/components/InstallPrompt.tsx',
  // بطاقات وأغطية بلا موضع رسم حاليًا.
  //
  // ملحوظة مسجَّلة: `AllergyNotice.tsx` كان هنا، وخرج من السجلّ عند التقاء
  // `QIM-FINAL-RC-001` لأن تلك الموجة **وصلته فعلًا** بـ`NutritionView` الحيّة.
  // ولم يُكتشف بالمراجعة بل أسقط البوّابة باسمه (`canonical-surface-stale-
  // declaration`) — وهو الاتجاه الثاني من القفل يعمل كما وُضع له.
  'src/components/StepCounterCard.tsx',
  'src/components/SyncConsentGate.tsx',
  'src/components/coaching/TodayLearnCard.tsx',
  'src/components/nutrition/CalorieExplainer.tsx',
  // وحدات `features` — الرسم لم يكن يُمشَّط هنا إطلاقًا قبل هذا الحارس.
  'src/features/achievements/AchievementsCard.tsx',
  'src/features/todo/TodoWidget.tsx',
]

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
