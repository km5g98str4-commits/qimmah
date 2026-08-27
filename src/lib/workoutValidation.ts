// فحص اتّساق خطة التمرين (للتطوير/التقارير/قائمة المعاينة).

import type { WorkoutPlan } from '@/types/workout'
import type { MuscleId } from '@/types/muscles'
import { getExercise } from '@/data/exercises'
import { muscleMap } from '@/data/muscleGroups'

export interface WorkoutIssue {
  dayId: string
  message: string
}

export type BalanceTone = 'warning' | 'info'

export interface BalanceWarning {
  tone: BalanceTone
  message: string
}

/** يتحقق من أن عضلات اليوم تطابق تسمية اليوم (Push/Pull/Legs) ووجود فيديو لكل تمرين. */
export function validateWorkoutPlan(plan: WorkoutPlan): WorkoutIssue[] {
  const issues: WorkoutIssue[] = []
  plan.days.forEach((d) => {
    const label = d.nameEn.toLowerCase()
    if (d.exercises.length === 0) {
      issues.push({ dayId: d.id, message: 'يوم بلا تمارين.' })
      return
    }
    d.exercises.forEach((pe) => {
      const ex = getExercise(pe.exerciseId)
      if (!ex) return
      // [مهمة الصقل §3] فحص «بلا رابط شرح» أُزيل: كان لا يسقط أبدًا لأن طبقة
      // البيانات كانت تولّد رابط بحث لكل تمرين، وبعد إبادة روابط البحث صار
      // غياب الفيديو حالة سجلّ مراجعة (registry) لا عيبًا في خطة المستخدم.
      const m = ex.movementPattern
      if (label.includes('push') && !['push', 'isolation', 'core'].includes(m) && ex.primaryMuscle !== 'chest' && ex.primaryMuscle !== 'shoulders' && ex.primaryMuscle !== 'triceps') {
        issues.push({ dayId: d.id, message: `يوم دفع يحوي تمرينًا غير دفع: ${ex.nameEn}` })
      }
      if (label.includes('pull') && ex.primaryMuscle !== 'back' && ex.primaryMuscle !== 'biceps' && ex.primaryMuscle !== 'shoulders') {
        issues.push({ dayId: d.id, message: `يوم سحب يحوي تمرينًا غير سحب: ${ex.nameEn}` })
      }
    })
  })
  return issues
}

/**
 * يحلّل توازن الخطة عبر الأسبوع (دفع/سحب/أرجل + مجموعات عضلية مفقودة).
 * تنبيهات غير معطِّلة — تُعرض للمستخدم في محرّر الخطة المتقدّم.
 */
export function analyzeWorkoutBalance(plan: WorkoutPlan): BalanceWarning[] {
  const warnings: BalanceWarning[] = []

  // مجموعات مرجّحة لكل منطقة + لكل عضلة
  const region: Record<'push' | 'pull' | 'legs' | 'core', number> = { push: 0, pull: 0, legs: 0, core: 0 }
  const perMuscle: Partial<Record<MuscleId, number>> = {}

  plan.days.forEach((d) =>
    d.exercises.forEach((pe) => {
      const ex = getExercise(pe.exerciseId)
      if (!ex) return
      const sets = pe.sets || 0
      ex.primaryMusclesDetailed.forEach((m) => {
        perMuscle[m] = (perMuscle[m] ?? 0) + sets
        const r = muscleMap[m]?.region
        if (r) region[r] += sets
      })
      ex.secondaryMusclesDetailed.forEach((m) => {
        perMuscle[m] = (perMuscle[m] ?? 0) + sets * 0.5
        const r = muscleMap[m]?.region
        if (r) region[r] += sets * 0.5
      })
    }),
  )

  const upper = Math.max(region.push, region.pull)

  // 1) الأرجل ناقصة مقارنة بالجزء العلوي
  if (upper > 0 && region.legs < upper * 0.6) {
    warnings.push({ tone: 'warning', message: 'تنبيه: جدولك يمرّن الأرجل أقل من باقي العضلات.' })
  }

  // 2) عدم توازن الدفع/السحب
  if (region.push > 0 && region.pull > 0) {
    const ratio = region.push / region.pull
    if (ratio > 1.5 || ratio < 0.67) {
      warnings.push({ tone: 'warning', message: 'تنبيه: يوجد عدم توازن بين الدفع والسحب.' })
    }
  }

  // 3) مجموعات عضلية كبرى مفقودة أو ضعيفة جدًا
  const backSets = (perMuscle.lats ?? 0) + (perMuscle.upper_back ?? 0)
  const legSets = (perMuscle.quads ?? 0) + (perMuscle.hamstrings ?? 0) + (perMuscle.glutes ?? 0)
  if (backSets < 3) warnings.push({ tone: 'warning', message: 'تنبيه: لا توجد تمارين كافية للظهر.' })
  if (legSets < 3) warnings.push({ tone: 'warning', message: 'تنبيه: لا توجد تمارين كافية للأرجل.' })

  return warnings
}
