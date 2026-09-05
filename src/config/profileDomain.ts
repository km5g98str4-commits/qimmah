/**
 * مصدر الحقيقة الواحد لحدود الملف الشخصي وأهدافه — [CTO-65] البند ٢.
 *
 * **الفجوة التي يُغلقها:** كان لكل مسار حدوده. `lib/onboardingV2Flow.ts` يعلن
 * `HEIGHT_RANGE = 120–220` و`WEIGHT_RANGE = 30–250`، بينما `lib/validation.ts`
 * يعلن `heightCm = 100–230` و`weightKg = 15–250`. فالمستخدم نفسه يُقبل في مسار
 * ويُرفض في الآخر، **وكلا الرقمين معروض له على أنه حدّ التطبيق**.
 *
 * **ولماذا كان الخطر صامتًا:** رسائل الأخطاء كانت تحمل الأرقام نصًّا صلبًا
 * («بين 100 و230 سم»)، فتوحيد الحدود بلا توحيد السلاسل يعطي **رسالة تكذب**:
 * تُرفض القيمة عند ١٢٠ والرسالة تقول ١٠٠ مسموح. لذلك تُبنى الرسائل هنا **من
 * الأرقام نفسها** ولا تُكتب يدويًا في أي ملف آخر.
 *
 * **القيم المعتمدة هي حدود الإعداد** (١٢–١٠٠ · ١٢٠–٢٢٠ · ٣٠–٢٥٠): هي الأضيق،
 * وهي المطبَّقة فعلًا على كل مستخدم جديد يمرّ بالإعداد، وهي المغطّاة بعقد
 * `test:body-fields`. توسيع الإعداد ليقبل ١٠٠سم/١٥كجم كان سيخالف حدّ العمر
 * المقفل (١٢ فما فوق) — فالتوحيد نزل إلى الأضيق لا إلى الأوسع.
 *
 * **حدّ العمر ١٢ قرار مؤسس مقفل** (QIMMAH-QUALITY-CHARTER §٣-١) — يُقرأ من هنا
 * ولا يُعاد إعلانه في أي ملف.
 */

import type { CalorieGoal, GoalType } from '@/types/profile'

/** نطاق شامل الحدّين. */
export interface NumericRange {
  readonly min: number
  readonly max: number
}

// ===== الحدود =====

/**
 * حدود بيانات الجسم — نطاقات فسيولوجية معقولة تمنع القيم الشاذّة دون أن تُقصي
 * أحدًا. الحدّ الأدنى للعمر 12 لا 18: القاصر **يُقبل** ثم تُقيَّد أهدافه
 * (المحافظة فقط) — الحاجز تقييد لا طرد.
 */
export const AGE_RANGE: NumericRange = { min: 12, max: 100 } as const
export const HEIGHT_RANGE: NumericRange = { min: 120, max: 220 } as const
export const WEIGHT_RANGE: NumericRange = { min: 30, max: 250 } as const
/** وزن الهدف يشترك مع الوزن الحالي في نفس النطاق الفسيولوجي — لا رقم ثانٍ. */
export const TARGET_WEIGHT_RANGE: NumericRange = WEIGHT_RANGE
export const TRAINING_DAYS_RANGE: NumericRange = { min: 1, max: 7 } as const
export const SESSION_DURATION_RANGE: NumericRange = { min: 20, max: 150 } as const

/** هل القيمة داخل النطاق (شامل الحدّين)؟ `null`/`NaN` مرفوضان دائمًا. */
export function withinRange(value: number | null | undefined, range: NumericRange): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max
}

// ===== رسائل الحدود — مبنيّة من الأرقام، لا مكتوبة بجانبها =====

/**
 * تُبنى كل رسالة من `range.min`/`range.max` مباشرةً، فيستحيل أن تتباعد الرسالة
 * عن المدقّق. **هذا شرط البند لا تحسينه:** رسالة تذكر رقمًا غير الذي يرفض عنده
 * المدقّق تكذب على المستخدم (§١-٧ من دستور الجودة).
 */
export interface RangeCopy {
  readonly ar: string
  readonly en: string
}

export function ageRangeCopy(range: NumericRange = AGE_RANGE): RangeCopy {
  return {
    ar: `أدخل عمرًا بين ${range.min} و${range.max} سنة.`,
    en: `Enter an age between ${range.min} and ${range.max}.`,
  }
}

export function heightRangeCopy(range: NumericRange = HEIGHT_RANGE): RangeCopy {
  return {
    ar: `أدخل طولًا بين ${range.min} و${range.max} سم.`,
    en: `Enter a height between ${range.min} and ${range.max} cm.`,
  }
}

export function weightRangeCopy(range: NumericRange = WEIGHT_RANGE): RangeCopy {
  return {
    ar: `أدخل وزنًا بين ${range.min} و${range.max} كجم.`,
    en: `Enter a weight between ${range.min} and ${range.max} kg.`,
  }
}

export function targetWeightRangeCopy(range: NumericRange = TARGET_WEIGHT_RANGE): RangeCopy {
  return {
    ar: `أدخل وزنًا هدفًا بين ${range.min} و${range.max} كجم.`,
    en: `Enter a target weight between ${range.min} and ${range.max} kg.`,
  }
}

export function trainingDaysRangeCopy(range: NumericRange = TRAINING_DAYS_RANGE): RangeCopy {
  return {
    ar: `اختر عدد أيام تمرين بين ${range.min} و${range.max}.`,
    en: `Pick between ${range.min} and ${range.max} training days.`,
  }
}

export function sessionDurationRangeCopy(range: NumericRange = SESSION_DURATION_RANGE): RangeCopy {
  return {
    ar: `اختر مدة تمرين بين ${range.min} و${range.max} دقيقة.`,
    en: `Pick a session length between ${range.min} and ${range.max} minutes.`,
  }
}

// ===== تلميحات الحقول — نفس المبدأ: الرقم المعروض هو الرقم المطبَّق =====

/**
 * التلميح المكتوب تحت الحقل («كجم (30–250)») — **يُبنى من النطاق نفسه**
 * كالرسائل أعلاه تمامًا — [CTO-67] البند ٣.
 *
 * **الفجوة التي يُغلقها:** [CTO-65] البند ٢ وحّد الحدود وبنى **رسائل الأخطاء**
 * منها، وبقيت **التلميحات** أرقامًا صلبة في القاموس («كجم (15–250)» ·
 * «سم (100–230)») بلغتيها. فصارت الشاشة الواحدة تقول رقمين: التلميح يَعِد بـ15
 * والمدقّق يرفض عند 30 — وهي **رسالة تكذب على المستخدم**، أسوأ من حدّ غير
 * موحّد لأنها تُعلّمه أن أرقام التطبيق لا تُصدَّق.
 *
 * `unit` فارغة ⇒ يُعرض النطاق وحده (حقل الأيام: «1–7» بلا وحدة).
 */
export function rangeHint(range: NumericRange, unit: RangeCopy = { ar: '', en: '' }): RangeCopy {
  const span = `${range.min}–${range.max}`
  return {
    ar: unit.ar ? `${unit.ar} (${span})` : span,
    en: unit.en ? `${unit.en} (${span})` : span,
  }
}

export const AGE_HINT = rangeHint(AGE_RANGE, { ar: 'سنة', en: 'years' })
export const HEIGHT_HINT = rangeHint(HEIGHT_RANGE, { ar: 'سم', en: 'cm' })
export const WEIGHT_HINT = rangeHint(WEIGHT_RANGE, { ar: 'كجم', en: 'kg' })
export const TARGET_WEIGHT_HINT = rangeHint(TARGET_WEIGHT_RANGE, { ar: 'كجم', en: 'kg' })
export const TRAINING_DAYS_HINT = rangeHint(TRAINING_DAYS_RANGE)
export const SESSION_DURATION_HINT = rangeHint(SESSION_DURATION_RANGE, { ar: 'دقيقة', en: 'minutes' })

// ===== الأهداف =====

/**
 * الجسر الوحيد بين الهدف المنظَّم (`GoalType`) وهدف السعرات (`CalorieGoal`).
 *
 * **سجلّ صريح لا سلسلة `if` بافتراضي:** الصيغة القديمة كانت
 * `if (cutting) … if (bulking) … return 'maintain'` — أي أن **إضافة هدف جديد
 * كانت تسقط على «المحافظة» بلا خطأ ترجمة ولا كاشف**. السجلّ الشامل يجعل أي هدف
 * جديد **خطأ ترجمة فوريًا** حتى يُقرَّر مساره الحراري بوعي.
 *
 * ⚠️ `returning` و`health` **ليسا زينة**: `goalTypeLabel` يقرأ تسميتهما،
 * و`planRationale` يمرّرهما سائقَي قرار في تفسير الخطة. إسقاط أيّهما يكسر
 * توليد الخطة صامتًا.
 *
 * `recomposition` هدف ملغى تبقى بياناته عند المستخدمين القدامى — مساره الحراري
 * «المحافظة» **كما كان قبل التوحيد بالضبط** (كان يسقط على الافتراضي). لا تغيير
 * سلوك مُهرَّب داخل موجة توحيد.
 */
export const GOAL_TYPE_TO_CALORIE_GOAL: Readonly<Record<GoalType, CalorieGoal>> = {
  cutting: 'cut',
  bulking: 'bulk',
  maintenance: 'maintain',
  returning: 'maintain',
  health: 'maintain',
  recomposition: 'maintain',
} as const

/**
 * الأهداف المعروضة للاختيار، بترتيب العرض. `recomposition` خارجها عمدًا:
 * ملغى ويُهاجَر، فلا يُعرض لمستخدم جديد — لكنه يبقى في السجلّ أعلاه لأن بياناته
 * ما زالت تُقرأ.
 */
export const PICKABLE_GOAL_TYPES = [
  'cutting',
  'bulking',
  'maintenance',
  'returning',
  'health',
] as const satisfies readonly GoalType[]

export type PickableGoalType = (typeof PICKABLE_GOAL_TYPES)[number]
