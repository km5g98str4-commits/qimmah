import type { GoalInfo } from '@/types'

// تفاصيل الهدف الحالي — تظهر في قسم «هدفك الحالي».
// نص الهدف الرئيسي نفسه يأتي من مركز التخصيص (identity.mainGoal).
export const goalInfo: GoalInfo = {
  currentLabel: 'وزنك الحالي',
  currentValue: '86 كجم',
  targetLabel: 'وزنك الهدف',
  targetValue: '78 كجم',
  deadline: 'خلال 12 أسبوعًا',
  progress: 38,
}
