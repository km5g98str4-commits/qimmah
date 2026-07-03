// اشتقاقات خفيفة من إجابات الإعداد — بلا اعتماد على بيانات التمارين/القوالب.
//
// فُصلت عن planGenerator (P11.5) كي تستطيع وحدات مسار الإقلاع (onboardingProfile)
// استخدامها دون سحب مولّد الخطط وقاعدة التمارين (~80KB) إلى حزمة الدخول.
// planGenerator يعيد تصديرها للحفاظ على التوافق مع المستوردين الحاليين.

import type { ActivityLevel, ExperienceBand, GoalType, TrainingLevel } from '@/types/profile'

/** مستوى التدريب من مدّة الخبرة. */
export function levelFromExperience(band?: ExperienceBand): TrainingLevel {
  if (band === 'lt1m' || band === '1to6m') return 'beginner'
  if (band === '6to12m' || band === '1to2y') return 'intermediate'
  if (band === 'gt2y') return 'advanced'
  return 'intermediate'
}

/** مستوى النشاط مشتقّ من عدد أيام التمرين. */
export function deriveActivityLevel(days: number): ActivityLevel {
  if (days <= 2) return 'light'
  if (days <= 4) return 'moderate'
  if (days <= 6) return 'active'
  return 'very_active'
}

/** وزن هدف منطقي مشتقّ من الوزن والهدف (حين لا يُسأل عنه صراحةً). */
export function deriveTargetWeight(weightKg: number, gt: GoalType): number {
  if (gt === 'cutting') return Math.round(weightKg * 0.92)
  if (gt === 'bulking') return Math.round(weightKg * 1.05)
  return weightKg // recomposition / health / maintenance / returning
}
