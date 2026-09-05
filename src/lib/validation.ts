import type { Profile } from '@/types/profile'
import {
  AGE_RANGE,
  HEIGHT_RANGE,
  SESSION_DURATION_RANGE,
  TARGET_WEIGHT_RANGE,
  TRAINING_DAYS_RANGE,
  WEIGHT_RANGE,
  ageRangeCopy,
  heightRangeCopy,
  sessionDurationRangeCopy,
  targetWeightRangeCopy,
  trainingDaysRangeCopy,
  weightRangeCopy,
  type RangeCopy,
} from '@/config/profileDomain'
import { foldDigits, formatNumber } from '@/lib/numberFormat'
import type { Lang } from '@/lib/appPreferences'
import { numLimitStrings } from '@/i18n/dict/numericInput'

// حدود إدخال واقعية + رسائل ودّية — **كلاهما من `config/profileDomain`**.
//
// [CTO-65] البند ٢: كان هذا الملف يعلن حدودًا خاصّة به (طول 100–230، وزن 15–250)
// تخالف حدود مسار الإعداد (120–220، 30–250)، ورسائله تحمل الأرقام نصًّا صلبًا.
// فالمستخدم يُرفض عند رقم وتُخبره الرسالة برقم آخر. الآن: رقم واحد، ورسالة
// مبنيّة منه — يستحيل أن يتباعدا.

export const LIMITS = {
  age: AGE_RANGE,
  heightCm: HEIGHT_RANGE,
  weightKg: WEIGHT_RANGE,
  targetWeightKg: TARGET_WEIGHT_RANGE,
  trainingDays: TRAINING_DAYS_RANGE,
  workoutDuration: SESSION_DURATION_RANGE,
} as const

export interface FieldError {
  field: keyof typeof LIMITS
  message: string
}

/** الرسائل مبنيّة من نفس النطاقات أعلاه — لا رقم مكتوب بجانب رقم. */
const MESSAGES: Record<keyof typeof LIMITS, RangeCopy> = {
  age: ageRangeCopy(),
  heightCm: heightRangeCopy(),
  weightKg: weightRangeCopy(),
  targetWeightKg: targetWeightRangeCopy(),
  trainingDays: trainingDaysRangeCopy(),
  workoutDuration: sessionDurationRangeCopy(),
}

/**
 * يعيد قائمة أخطاء الملف الشخصي (فارغة = صالح).
 * `lang` يختار سجلّ الرسالة؛ العربية هي الافتراضي (سلوك ما قبل التوحيد).
 */
export function validateProfile(p: Profile, lang: 'ar' | 'en' = 'ar'): FieldError[] {
  const errors: FieldError[] = []
  ;(Object.keys(LIMITS) as (keyof typeof LIMITS)[]).forEach((f) => {
    const v = Number((p as unknown as Record<string, unknown>)[f])
    const { min, max } = LIMITS[f]
    if (!Number.isFinite(v) || v < min || v > max) {
      errors.push({ field: f, message: MESSAGES[f][lang] })
    }
  })
  return errors
}

export function isProfileValid(p: Profile): boolean {
  return validateProfile(p).length === 0
}

// ===== حدود رقمية إضافية (تمرين/تغذية/ماء) + أدوات تعقيم الإدخال =====
// نمنع القيم المستحيلة أو السالبة أو NaN من الوصول للتخزين، برسائل عربية ودّية.

export const NUM_LIMITS = {
  workoutWeight: { min: 0, max: 500 }, // كجم لكل مجموعة
  reps: { min: 0, max: 100 },
  dailyCalories: { min: 800, max: 8000 }, // أهداف يومية
  quickCalories: { min: 0, max: 3000 }, // لكل وجبة مسجّلة
  quickProtein: { min: 0, max: 500 },
  quickMacro: { min: 0, max: 1000 }, // كارب/دهون لكل وجبة
  waterMl: { min: 50, max: 3000 }, // لكل إضافة يدوية
} as const

export type NumLimitKey = keyof typeof NUM_LIMITS

/**
 * رسالة الحدّ بلغة الشاشة وبنظام أرقامها.
 *
 * كانت `NUM_MESSAGES` سبعة نصوص صلبة **عربية وحدها** بأرقام لاتينية مكتوبة
 * داخلها — تظهر عربية في واجهة إنجليزية، وتقول «50» في شاشة أرقامها «٥٠»
 * وتناقض الحدّ الذي تشرحه. الآن النصّ من القاموس والرقم من `NUM_LIMITS` نفسه،
 * فلا يفترق الاثنان.
 */
export function numLimitMessage(key: NumLimitKey, lang: Lang): string {
  const { min, max } = NUM_LIMITS[key]
  return numLimitStrings[lang][key](formatNumber(min, lang), formatNumber(max, lang))
}

/** يحصر رقمًا داخل نطاق، ويعيد min عند NaN/قيمة غير منتهية. */
export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** هل القيمة ضمن نطاق محدّد (شامل الحدّين). */
export function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max
}

/**
 * يعقّم نص إدخال رقمي أثناء الكتابة: يزيل الأحرف غير الرقمية والإشارة السالبة،
 * ويسمح بنقطة عشرية واحدة (إن decimal)، ويحصر الحدّ الأعلى فقط (لا الأدنى حتى لا يقفز أثناء الكتابة).
 * يُبقي السلسلة الفارغة كما هي ليتمكّن المستخدم من المسح.
 *
 * ⚠️ **الطيّ أولًا، قبل أي ترشيح ASCII.** كانت الدالة ترشّح `[^0-9]` مباشرةً
 * فتحذف الأرقام العربية بدل أن ترفضها — يكتب المستخدم «٢٤» فيختفي ما يكتبه،
 * و«78٫5» تصير «785» (خطأ ×١٠ صامت). والحقل كان يعجز عن قراءة مخرجات التطبيق
 * نفسه: `sanitizeNumericInput(formatNumber(250,'ar'))` كانت `""`.
 */
export function sanitizeNumericInput(
  raw: string,
  opts: { max?: number; decimal?: boolean } = {},
): string {
  const { max, decimal = false } = opts
  if (raw === '') return ''
  const folded = foldDigits(raw)
  let cleaned = folded.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '')
  if (decimal) {
    const parts = cleaned.split('.')
    cleaned = parts.shift() ?? ''
    if (parts.length) cleaned += '.' + parts.join('')
  }
  if (cleaned === '' || cleaned === '.') return cleaned
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return ''
  if (max !== undefined && n > max) return String(max)
  return cleaned
}

/**
 * يحوّل نص/رقم إدخال إلى رقم آمن للتخزين: منتهٍ، غير سالب، ومحصور ضمن النطاق.
 *
 * ⚠️ **الطيّ أولًا.** `Number()` تتبع نحو ECMAScript فلا تقبل إلا `0-9` — فكانت
 * `parseSafeNumber('٢٤',{min:12})` تعطي **`12`**: بالغ يُعاد تصنيفه قاصرًا بصمت
 * فتُقفل أهداف التنشيف والتضخيم. القيمة الراجعة **رقم معقول لا خطأ**، وهذا
 * أخطر من الرفض.
 */
export function parseSafeNumber(
  raw: string | number,
  opts: { min?: number; max?: number; fallback?: number } = {},
): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min } = opts
  const n = typeof raw === 'number' ? raw : Number(foldDigits(raw).trim())
  if (!Number.isFinite(n)) return fallback
  return clamp(n, min, max)
}

/**
 * تحليل صادق لحدّ الإدخال: يفرّق بين «فارغ» و«غير مقروء» و«خارج النطاق»
 * و«صالح» — بدل ابتلاع الثلاثة الأولى في رقم معقول.
 *
 * تستعملها الحقول لتُظهر رسالة تقول **ما الخطأ**، فلا يُمسح ما كتبه المستخدم
 * بصمت ولا يُستبدل برقم لم يكتبه.
 */
export type NumericParse =
  | { status: 'empty' }
  | { status: 'unreadable'; raw: string }
  | { status: 'out-of-range'; value: number; min?: number; max?: number }
  | { status: 'ok'; value: number }

export function parseNumericField(
  raw: string,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): NumericParse {
  const { min, max, integer = false } = opts
  const folded = foldDigits(raw).trim()
  if (folded === '') return { status: 'empty' }
  const n = Number(folded)
  if (!Number.isFinite(n)) return { status: 'unreadable', raw }
  if (integer && !Number.isInteger(n)) return { status: 'unreadable', raw }
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    return { status: 'out-of-range', value: n, min, max }
  }
  return { status: 'ok', value: n }
}
