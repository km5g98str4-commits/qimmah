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

/**
 * يقيّم الأوسمة ويُرجع العرض الحيّ (مفتوحة + الأقرب للفتح).
 * - يعيد التقييم تلقائيًا عند تغيّر بروتين اليوم أو الخطة (فتح أوسمة البروتين لحظيًا).
 * - لا يعمل في الوضع التجريبي (لا نلوّث أوسمة المستخدم الحقيقي).
 */
export function useAchievements(): AchievementView {
  const demo = useIsDemo()
  const { customization } = useCustomization()
  const { totals } = useNutritionToday()

  const proteinToday = Math.round(totals.protein)
  const proteinTarget =
    customization.nutritionPlan.targetProtein || customization.targets.proteinGrams || 0
  const daysPerWeek = customization.workoutPlan.days.length || 3

  // إعادة الرسم عند أي فتح جديد (رقم الإصدار من المحرّك).
  useSyncExternalStore(subscribeAchievements, getAchievementVersion, getAchievementVersion)

  useEffect(() => {
    if (demo) return
    evaluateAchievements({ proteinToday, proteinTarget, daysPerWeek })
  }, [demo, proteinToday, proteinTarget, daysPerWeek])

  return computeAchievementView({ proteinToday, proteinTarget, daysPerWeek })
}

/** طابور الاحتفالات الحيّ + دالة الإغلاق — يستهلكه الـ toaster العام. */
export function useCelebrations(): { queue: Celebration[]; dismiss: (key: string) => void } {
  const queue = useSyncExternalStore(subscribeCelebrations, getCelebrationQueue, getCelebrationQueue)
  const dismiss = useCallback((key: string) => dismissCelebration(key), [])
  return { queue, dismiss }
}
