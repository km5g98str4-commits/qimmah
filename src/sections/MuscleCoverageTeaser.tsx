import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { getExercise } from '@/data/exercises'

// تسميات عربية لمجموعات العضلات.
const MUSCLE_AR: Record<string, string> = {
  chest: 'صدر',
  back: 'ظهر',
  shoulders: 'أكتاف',
  biceps: 'بايسبس',
  triceps: 'ترايسبس',
  quads: 'أمامية الفخذ',
  hamstrings: 'خلفية الفخذ',
  glutes: 'ألوية',
  calves: 'سمانة',
  core: 'بطن',
  cardio: 'كارديو',
}

/** بطاقة تغطية العضلات — يحسب مجموعات العضلات التي تغطّيها خطة التمرين الحالية. */
export function MuscleCoverageTeaser() {
  const { customization } = useCustomization()

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    customization.workoutPlan.days.forEach((d) => {
      d.exercises.forEach((pe) => {
        const ex = getExercise(pe.exerciseId)
        if (!ex) return
        map.set(ex.primaryMuscle, (map.get(ex.primaryMuscle) ?? 0) + 1)
      })
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [customization.workoutPlan])

  const total = Object.keys(MUSCLE_AR).length
  const covered = counts.length

  if (covered === 0) return null

  return (
    <section className="px-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Target" className="h-5 w-5" />
            </span>
            <h2 className="text-base font-black text-ink-900">تغطية العضلات</h2>
          </div>
          <span className="text-xs font-bold text-ink-500">
            {covered}/{total}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {counts.map(([muscle, count]) => (
            <span
              key={muscle}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-beige px-3 py-1.5 text-xs font-bold text-ink-700"
            >
              {MUSCLE_AR[muscle] ?? muscle}
              <span className="text-primary-c">×{count}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
