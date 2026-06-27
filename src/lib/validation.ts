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
