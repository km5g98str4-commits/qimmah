// Equipment access — the SINGLE source of truth for "which equipment can this
// user actually train with", derived from the onboarding profile. Extracted from
// planGenerator so the plan generator AND the mid-workout substitution engine
// filter by the exact same rule (no divergence between "what we generated" and
// "what we offer as a swap"). Pure + framework-free → unit-testable.

import type { Profile } from '@/types/profile'

/** يحسم بيئة التمرين الفعلية من الملف — الأولوية لـ gymAccess الصريح، ثم الاشتقاق الاحتياطي. */
export function resolveGymAccess(p: Profile): NonNullable<Profile['gymAccess']> {
  // نشتق احتياطيًا من gymType أو workoutEnvironment للملفّات القديمة
  // كي لا يحصل مستخدم «جيم منزلي» على أجهزة لمجرد غياب حقل واحد.
  const fallback: NonNullable<Profile['gymAccess']> =
    p.gymType === 'home' || p.workoutEnvironment === 'home'
      ? 'home'
      : p.gymType === 'bodyweight'
        ? 'bodyweight'
        : p.gymType === 'small'
          ? 'small'
          : 'full'
  return p.gymAccess ?? fallback
}

/**
 * Does the user's environment allow an exercise requiring `equipment`? An
 * exercise is trainable only if EVERY tool it needs is available. `homeOnly`
 * forces the home ruleset regardless of the profile — the "أنا في المنزل اليوم"
 * substitution case (a gym member training at home for one session).
 */
export function makeEquipmentGate(p: Profile, opts?: { homeOnly?: boolean }): (equipment: string[]) => boolean {
  const access = opts?.homeOnly ? 'home' : resolveGymAccess(p)
  if (access === 'full') return () => true
  if (access === 'small') {
    // نادٍ صغير: وزن حر + أجهزة أساسية + كيبل أساسي — نستبعد المتخصّص فقط (سميث/حبل).
    const banned = new Set(['smith', 'rope'])
    return (equipment) => equipment.every((e) => !banned.has(e))
  }
  if (access === 'home') {
    // دمبل/بار/وزن جسم/مطاط (+ مقعد شائع منزليًا).
    const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
    return (equipment) => equipment.every((e) => allowed.has(e))
  }
  // bodyweight: وزن الجسم فقط.
  const allowed = new Set(['bodyweight'])
  return (equipment) => equipment.every((e) => allowed.has(e))
}
