// فحص اتّساق خطة التمرين (للتطوير/التقارير/قائمة المعاينة).

import type { WorkoutPlan } from '@/types/workout'
import { getExercise } from '@/data/exercises'

export interface WorkoutIssue {
  dayId: string
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
      if (!ex.videoUrl) issues.push({ dayId: d.id, message: `تمرين بلا رابط شرح: ${ex.nameEn}` })
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
