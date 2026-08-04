// هوكات الأوسمة — تربط محرّك الأوسمة (خارج React) بالواجهة عبر useSyncExternalStore.

import { useCallback, useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { useCustomization } from '@/lib/customizationContext'
import { useNutritionToday } from '@/lib/nutritionTracking'
import { useIsDemo } from '@/lib/demoMode'
import {
  computeAchievementView,
  dismissCelebration,
  evaluateAchievements,
  getAchievementVersion,
  getCelebrationQueue,
  subscribeAchievements,
  subscribeCelebrations,
  type AchievementView,
  type Celebration,
} from './engine'

/** مدخلات المحرّك الحقيقية من حالة المستخدم — مصدر واحد للهوكين معًا. */
function useAchievementInputs(): { proteinToday: number; proteinTarget: number; daysPerWeek: number } {
  const { customization } = useCustomization()
  const { totals } = useNutritionToday()

  const proteinToday = Math.round(totals.protein)
  const proteinTarget =
    customization.nutritionPlan.targetProtein || customization.targets.proteinGrams || 0
  const daysPerWeek = customization.workoutPlan.days.length || 3

  return { proteinToday, proteinTarget, daysPerWeek }
}

/**
 * يُبقي محرّك الأوسمة موصولًا ببيانات المستخدم الحقيقية — بلا واجهة.
 *
 * لماذا يوجد: بعد انتقال الشاشات إلى V2 صارت DashboardView/WorkoutView مجرّد
 * محوّلات، وسقط معها آخر استدعاء لـ evaluateAchievements بمدخلات. بقي مسار وحيد
 * داخل registerWorkoutPRs يستدعيه **بلا مدخلات** وخلف حارس `prs.length === 0`،
 * فصارت أوسمة البروتين غير قابلة للفتح إطلاقًا (تحتاج proteinTarget > 0)، وبقيّة
 * الأوسمة لا تُفتح إلا في جلسة تُسجّل رقمًا قياسيًا. يُركَّب هذا الهوك على سطح حيّ
 * دائم (الرئيسية) ليعود التقييم إلى العمل دون فرض تغيير بصري.
 *
 * التقييم idempotent (المحرّك يحرس التكرار بختم اليوم)، فالتركيب آمن.
 */
export function useAchievementsEngine(): void {
  const demo = useIsDemo()
  const { proteinToday, proteinTarget, daysPerWeek } = useAchievementInputs()

  useEffect(() => {
    if (demo) return
    evaluateAchievements({ proteinToday, proteinTarget, daysPerWeek })
  }, [demo, proteinToday, proteinTarget, daysPerWeek])
}

/**
 * يقيّم الأوسمة ويُرجع العرض الحيّ (مفتوحة + الأقرب للفتح).
 * - يعيد التقييم تلقائيًا عند تغيّر بروتين اليوم أو الخطة (فتح أوسمة البروتين لحظيًا).
 * - لا يعمل في الوضع التجريبي (لا نلوّث أوسمة المستخدم الحقيقي).
 */
export function useAchievements(): AchievementView {
  const inputs = useAchievementInputs()

  // إعادة الرسم عند أي فتح جديد (رقم الإصدار من المحرّك).
  useSyncExternalStore(subscribeAchievements, getAchievementVersion, getAchievementVersion)

  useAchievementsEngine()

  return computeAchievementView(inputs)
}

/** طابور الاحتفالات الحيّ + دالة الإغلاق — يستهلكه الـ toaster العام. */
export function useCelebrations(): { queue: Celebration[]; dismiss: (key: string) => void } {
  const queue = useSyncExternalStore(subscribeCelebrations, getCelebrationQueue, getCelebrationQueue)
  const dismiss = useCallback((key: string) => dismissCelebration(key), [])
  return { queue, dismiss }
}
