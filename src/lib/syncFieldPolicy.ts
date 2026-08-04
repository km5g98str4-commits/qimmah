/**
 * سياسة حقول المزامنة — **قائمة سماح لا قائمة حظر** (حارة G · ج-١).
 *
 * لماذا السماح لا الحظر — وهي نقطة المعمار كلها:
 * البيانات الصحية الحسّاسة **لا تركب جدولًا حسّاسًا**. `enqueueOnboardingProfileUpsert`
 * يدفع الملف الشخصي كاملًا في حمولة صفّ `profiles` — وداخله `limitations.injuries`
 * و`wellnessTracking.medications`. فالصفّ بريء المظهر وحمولته ليست كذلك، وحجب
 * الجدول يعطّل المزامنة كلها بينما تمريره يسرّب الأخطر.
 *
 * فالحسم بالحقل لا بالجدول. وبالسماح لا بالحظر: **كل حقل غير معلَن هنا لا
 * يُزامَن**، فحقل جديد يُضاف للملف الشخصي غدًا يكون **آمنًا افتراضيًا لا مكشوفًا
 * افتراضيًا** — وهي نفس فلسفة `accountScope` (كل مفتاح `qimmah:*` يُمسح إلا
 * المُعلَن). القائمة السوداء تنسى؛ القائمة البيضاء تُجبرك على التذكّر.
 *
 * تُطبَّق عند **حدّ الإدراج** في `enqueueSyncOperation` — بنيويًا، لا انضباطًا من
 * المستدعي. لا يوجد مسار يدفع للطابور ويتجاوزها.
 */

/** مسار حقل داخل كائن الإعداد، بنقاط. */
type FieldPath = string

/**
 * الحقول المسموح بمزامنتها بالموافقة الأولى وحدها — غير حسّاسة صحيًّا.
 *
 * `*` في آخر المسار تعني «هذا الفرع بكامله». تُستعمل فقط لفروع أُحصيت حقولها
 * ولا تحمل شيئًا حسّاسًا (تفضيلات تدريب/تغذية، بيانات وصفية).
 */
export const SYNCABLE_PROFILE_FIELDS: readonly FieldPath[] = [
  // الهوية والجسد — أساس الخطة وحساب الطاقة.
  'profile.name',
  'profile.sex',
  'profile.age',
  'bodyMetrics.heightCm',
  'bodyMetrics.currentWeightKg',
  'bodyMetrics.targetWeightKg',
  'goal.type',
  // تفضيلات التدريب والنشاط والتغذية — لا شيء منها حالة صحية.
  'trainingPreferences.*',
  'activityProfile.*',
  'nutritionPreferences.*',
  // تفضيلات الأكل — عدا الحساسيات (حالة طبية، انظر القائمة الحسّاسة).
  'foodPreferences.dietPattern',
  'foodPreferences.dislikedFoods',
  // وضع التتبّع وحده — لا أسماء المكمّلات ولا الأدوية.
  'wellnessTracking.mode',
  'appPreferences.*',
  // سجلّ الموافقات نفسه: بيانات عن الإذن لا بيانات صحية، ومزامنته تُبقي
  // الأجهزة متسقّة على ما وافق عليه المستخدم بدل أن يُسأل مرّتين.
  'consents.*',
  // البيانات الوصفية — طوابع LWW وحالة الإكمال. بدونها لا يعمل دمج الأحدثية.
  '_meta.*',
]

/**
 * الحقول التي **لا تُزامَن إلا بالموافقة الثانية الصريحة**.
 *
 * الاختيار ليس اجتهادًا لغويًا: كلها تصف حالة بدن أو علاجًا، وهي ما يفهمه
 * المستخدم من «بياناتي الصحية». والأدوية والحساسيات أدخل في الحساسية من
 * الإصابات نفسها — فإدراجها ليس توسّعًا بل اتساقًا مع القرار المقفل (§8-5).
 */
export const SENSITIVE_PROFILE_FIELDS: readonly FieldPath[] = [
  'limitations.injuries',
  'limitations.notes',
  'wellnessTracking.supplements',
  'wellnessTracking.medications',
  'foodPreferences.allergies',
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * يبني كائنًا جديدًا لا يحمل إلا المسارات المسموحة الموجودة فعلًا في المصدر.
 * لا يُنشئ مفاتيح غائبة، ولا ينسخ ما لم يُذكر.
 */
function pickAllowed(source: Record<string, unknown>, paths: readonly FieldPath[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const path of paths) {
    const segments = path.split('.')
    const wildcard = segments[segments.length - 1] === '*'
    const parts = wildcard ? segments.slice(0, -1) : segments

    let src: unknown = source
    for (const part of parts) {
      if (!isPlainObject(src) || !(part in src)) {
        src = undefined
        break
      }
      src = src[part]
    }
    if (src === undefined) continue

    let cursor = out
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!isPlainObject(cursor[part])) cursor[part] = {}
      cursor = cursor[part] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]] = src
  }
  return out
}

/**
 * ينقّي كائن الإعداد بقائمة السماح.
 *
 * @param allowSensitive الموافقة الثانية سارية؟ عندها تُضاف الحقول الحسّاسة —
 *                       وهي **الإضافة الوحيدة** التي تفعلها الموافقة الثانية.
 */
export function sanitizeOnboardingForSync(value: unknown, allowSensitive: boolean): Record<string, unknown> {
  if (!isPlainObject(value)) return {}
  const paths = allowSensitive
    ? [...SYNCABLE_PROFILE_FIELDS, ...SENSITIVE_PROFILE_FIELDS]
    : SYNCABLE_PROFILE_FIELDS
  return pickAllowed(value, paths)
}

/**
 * ينقّي حمولة عملية مزامنة قبل إدراجها في الطابور.
 *
 * اليوم الملف الشخصي وحده يحمل حقولًا حسّاسة داخل حمولته، لذا التنقية مقصورة
 * على `profiles`. وأي جدول يُضاف لاحقًا بحمولة مركّبة **يُضاف هنا صراحةً** —
 * ويحرس ذلك تأكيد مضادّ في `run-sync-consent-proof.mjs`.
 */
export function sanitizeSyncPayload(
  table: string,
  payload: Record<string, unknown>,
  allowSensitive: boolean,
): Record<string, unknown> {
  if (table !== 'profiles') return payload
  const data = payload.data
  if (!isPlainObject(data) || !('onboarding' in data)) return payload
  return {
    ...payload,
    data: { ...data, onboarding: sanitizeOnboardingForSync(data.onboarding, allowSensitive) },
  }
}
