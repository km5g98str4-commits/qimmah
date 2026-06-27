import type { Profile } from '@/types/profile'

// حدود إدخال واقعية + رسائل عربية ودّية.

export const LIMITS = {
  age: { min: 12, max: 90 },
  heightCm: { min: 100, max: 230 },
  weightKg: { min: 15, max: 250 },
  targetWeightKg: { min: 15, max: 250 },
  trainingDays: { min: 1, max: 7 },
  workoutDuration: { min: 20, max: 150 },
}

export interface FieldError {
  field: keyof typeof LIMITS
  message: string
}

const MESSAGES: Record<keyof typeof LIMITS, string> = {
  age: 'أدخل عمرًا بين 12 و90 سنة.',
  heightCm: 'أدخل طولًا بين 100 و230 سم.',
  weightKg: 'أدخل وزنًا بين 15 و250 كجم.',
  targetWeightKg: 'أدخل وزنًا هدفًا بين 15 و250 كجم.',
  trainingDays: 'اختر عدد أيام تمرين بين 1 و7.',
  workoutDuration: 'اختر مدة تمرين بين 20 و150 دقيقة.',
}

/** يعيد قائمة أخطاء الملف الشخصي (فارغة = صالح). */
export function validateProfile(p: Profile): FieldError[] {
  const errors: FieldError[] = []
  ;(Object.keys(LIMITS) as (keyof typeof LIMITS)[]).forEach((f) => {
    const v = Number((p as unknown as Record<string, unknown>)[f])
    const { min, max } = LIMITS[f]
    if (!Number.isFinite(v) || v < min || v > max) {
      errors.push({ field: f, message: MESSAGES[f] })
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
