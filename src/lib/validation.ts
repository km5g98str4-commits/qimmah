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

export const NUM_MESSAGES: Record<NumLimitKey, string> = {
  workoutWeight: 'أدخل وزنًا بين 0 و500 كجم.',
  reps: 'أدخل تكرارات بين 0 و100.',
  dailyCalories: 'أدخل سعرات يومية بين 800 و8000.',
  quickCalories: 'أدخل سعرات بين 0 و3000 للوجبة.',
  quickProtein: 'أدخل بروتينًا بين 0 و500 غ.',
  quickMacro: 'أدخل قيمة بين 0 و1000 غ.',
  waterMl: 'أدخل كمية ماء بين 50 و3000 مل.',
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
 */
export function sanitizeNumericInput(
  raw: string,
  opts: { max?: number; decimal?: boolean } = {},
): string {
  const { max, decimal = false } = opts
  if (raw === '') return ''
  let cleaned = raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '')
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

/** يحوّل نص/رقم إدخال إلى رقم آمن للتخزين: منتهٍ، غير سالب، ومحصور ضمن النطاق. */
export function parseSafeNumber(
  raw: string | number,
  opts: { min?: number; max?: number; fallback?: number } = {},
): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min } = opts
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return clamp(n, min, max)
}
