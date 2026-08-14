// سياسة الوصول — جدول واحد يقرّر ما الذي يحتاج اشتراكًا فعّالًا.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ٢.
//
// المبدأ الذي أقرّه المؤسس: **مرئي ≠ قابل للاستخدام.** وضع المعاينة يفتح كل
// الشاشات للتصفّح ويغلق **الأفعال المنتجة** وحدها. فلا نُخرج المستخدم من
// «التغذية»، بل نفتحها له ونمنع تسجيل الأكل.
//
// ولماذا جدول واحد لا عشرون `if (!premium)` متفرّقة: التحقّق المتفرّق يفشل
// بالنسيان لا بالخطأ — يكفي مسار واحد يُضاف بلا فحص لتسقط البوّابة كلها. الجدول
// يجعل «الفعل المدفوع» نوعًا معدودًا: أي فعل جديد **يجب** أن يُسمّى هنا قبل أن
// يمرّ من الحارس، ولا يوجد طريق ثالث.

/**
 * الأفعال المدفوعة — معدودة صراحةً. القائمة مشتقّة من نصّ المؤسس في
 * [QIM-WEB-FOUNDER-UX-002] §B وأُعيد تأكيدها في [QIM-WEB-FOUNDER-UX-003] §5.
 */
export type PaidAction =
  // ——— التمرين ———
  | 'workout.start' // بدء تمرين اليوم
  | 'workout.startEmpty' // بدء تمرين فارغ (نفس النتيجة: جلسة حقيقية)
  | 'workout.logSet' // تسجيل مجموعة/تكرارات/وزن
  | 'workout.finish' // إنهاء التمرين كجلسة مكتملة
  // ——— التغذية ———
  | 'nutrition.addFood' // إضافة صنف/وجبة
  | 'nutrition.removeFood' // تعديل سجلّ الأكل (الحذف تعديل)
  | 'nutrition.quickAdd' // إضافة سعرات/بروتين سريعة
  | 'nutrition.water' // تسجيل الماء
  | 'nutrition.toggleMeal' // وسم وجبة كمُنجزة
  // ——— التقدّم والقياسات ———
  | 'progress.logWeight' // تسجيل الوزن
  | 'progress.logMeasurement' // تسجيل القياسات
  // ——— الخطة ———
  | 'plan.saveEdit' // حفظ تعديل ينتج حالة مدفوعة
  // ——— التعافي ———
  | 'recovery.log' // تسجيل التعافي

/** كل الأفعال المدفوعة — مصدر واحد للاختبارات وللمصفوفة في التقرير. */
export const PAID_ACTIONS: readonly PaidAction[] = [
  'workout.start',
  'workout.startEmpty',
  'workout.logSet',
  'workout.finish',
  'nutrition.addFood',
  'nutrition.removeFood',
  'nutrition.quickAdd',
  'nutrition.water',
  'nutrition.toggleMeal',
  'progress.logWeight',
  'progress.logMeasurement',
  'plan.saveEdit',
  'recovery.log',
] as const

/**
 * الأسطح المسموح **تصفّحها** دائمًا — تُذكر هنا كعقد صريح لا كتعليق، ويحرسها
 * إثبات المصفوفة: أي مسار يصير محجوبًا بالكامل يُسقط البوابة. الحجب على الفعل
 * لا على الصفحة (نصّ المؤسس: «لا تغلق الصفحات نفسها»).
 */
export const ALWAYS_BROWSABLE = [
  'dashboard',
  'workout',
  'exercises',
  'nutrition',
  'progress',
  'measurements',
  'profile',
  'stats',
  'steps',
  'recovery',
  'settings',
  'privacy',
  'terms',
  'contact',
  'calc',
  'login',
  'start',
] as const

/** حالة الاستحقاق كما يراها العميل. `loading` حالة حقيقية لا افتراض تفاؤلي. */
export type EntitlementStatus = 'loading' | 'none' | 'active'

/**
 * القرار الوحيد. **الافتراض هو المنع**: أي حالة غير `active` تمنع كل فعل مدفوع،
 * بما فيها `loading` — فلا تُفتح نافذة زمنية يمرّ منها فعل قبل حسم الاستحقاق.
 *
 * ولا يقبل هذا الجدول أي مدخل آخر: لا عنوان، ولا تخزين محلّي يقول «مدفوع»، ولا
 * عودة من صفحة الدفع. السلطة النهائية للخادم (نصّ المؤسس §4).
 */
export function isPaidActionAllowed(action: PaidAction, status: EntitlementStatus): boolean {
  void action // كل الأفعال المدفوعة سواء اليوم؛ التوقيع يسمح بتمييزها لاحقًا بلا تغيير المستدعين.
  return status === 'active'
}
