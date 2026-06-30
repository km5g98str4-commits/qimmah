// منطق ترتيب أولوية بطاقات اللوحة — يُشتق من مصدر الحقيقة (الإعداد) لا من افتراضات.
//
// المبدأ: اللوحة تعكس «نظامًا بُني لك». ترتيب البطاقات يتبع الهدف والخبرة:
//  - cut  → التغذية أعلى (العجز/التحكم بالسعرات هو المحرّك).
//  - bulk → التمرين أعلى (الحِمل والتقدّم هو المحرّك).
//  - مبتدئ/مستجد → «الخطوة التالية» بارزة (إرشاد عملي).
//  - متقدّم → «التقدّم/السجل» بارز (يتابع الأرقام).
//
// كل القراءة آمنة: إن غاب الإعداد نرجع للملف المُولّد ثم لافتراض محايد (تمرين أولًا).

import { useMemo } from 'react'
import type { OnbGoalType, OnboardingProfile } from '@/types/onboarding'
import type { ExperienceLevel, Profile } from '@/types/profile'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

/** بطاقات الصدارة القابلة لإعادة الترتيب أعلى اللوحة. */
export type LeadCard = 'workout' | 'nutrition' | 'progress' | 'nextAction'

export interface DashboardSignals {
  /** الهدف مُطبّع لأربعة مسارات الإعداد (إن أمكن اشتقاقه). */
  goal: OnbGoalType | undefined
  experience: ExperienceLevel | undefined
  /** هل التغذية هي المحرّك (cut)؟ */
  nutritionFirst: boolean
  /** هل المستخدم في بداية الطريق (إرشاد أبرز)؟ */
  beginnerFocus: boolean
  /** ترتيب بطاقات الصدارة من الأعلى للأسفل. */
  leadOrder: LeadCard[]
}

/** يطبّع GoalType القديم إلى مسار الإعداد الرباعي (للأولوية فقط). */
function goalFromProfile(p: Profile): OnbGoalType | undefined {
  switch (p.goalType) {
    case 'cutting':
      return 'cut'
    case 'bulking':
      return 'bulk'
    case 'recomposition':
      // الهدف الملغى «إعادة التكوين» يُطبّع إلى «تنشيف» (نفس مسار التغذية أولًا).
      return 'cut'
    default:
      return undefined
  }
}

/** يشتق الخبرة من الملف القديم عند غياب القيمة الدلالية. */
function experienceFromProfile(p: Profile): ExperienceLevel | undefined {
  if (p.experienceLevel) return p.experienceLevel
  if (p.trainingLevel === 'beginner') return 'beginner'
  if (p.trainingLevel === 'advanced') return 'advanced'
  if (p.trainingLevel === 'intermediate') return 'intermediate'
  return undefined
}

/** يبني ترتيب الصدارة من إشارات الهدف والخبرة. */
function buildLeadOrder(nutritionFirst: boolean, experience: ExperienceLevel | undefined): LeadCard[] {
  const base: LeadCard[] = nutritionFirst ? ['nutrition', 'workout'] : ['workout', 'nutrition']
  const beginnerish = experience === 'beginner' || experience === 'novice'
  if (beginnerish) return [base[0], 'nextAction', base[1]]
  if (experience === 'advanced') return [base[0], 'progress', base[1]]
  return base
}

/**
 * يحسب إشارات اللوحة من مصدر الحقيقة (الإعداد) مع رجوع آمن للملف المُولّد.
 * الإعداد له الأولوية لأنه المصدر الأصلي؛ الملف المُولّد يحفظ المستخدمين المُهاجَرين.
 */
export function resolveDashboardSignals(
  op: OnboardingProfile | null,
  profile: Profile,
): DashboardSignals {
  const goal = op?.goal.type ?? goalFromProfile(profile)
  const experience = op?.trainingPreferences.experience ?? experienceFromProfile(profile)
  const nutritionFirst = goal === 'cut'
  const beginnerFocus = experience === 'beginner' || experience === 'novice'
  return {
    goal,
    experience,
    nutritionFirst,
    beginnerFocus,
    leadOrder: buildLeadOrder(nutritionFirst, experience),
  }
}

/** هوك يقرأ الإعداد ويحسب إشارات اللوحة (يعاد حسابه عند تغيّر الملف). */
export function useDashboardSignals(profile: Profile): DashboardSignals {
  return useMemo(() => resolveDashboardSignals(loadOnboardingProfile(), profile), [profile])
}
