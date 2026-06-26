import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { todayWorkout } from '@/data/workouts'
import { sectionCopy, labels } from '@/config/content'

/** قسم متتبّع التمارين — قائمة تمارين اليوم مع حالة الإنجاز. */
export function WorkoutTracker() {
  const done = todayWorkout.exercises.filter((e) => e.done).length
  const total = todayWorkout.exercises.length

  return (
    <section id="workout" className="section bg-beige">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading {...sectionCopy.workout} />

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-5">
              <div>
                <p className="text-sm font-bold text-ink-900">{todayWorkout.day}</p>
                <p className="mt-1 text-xs text-ink-500">{todayWorkout.focus}</p>
              </div>
              <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-300">
                {done} / {total} {labels.workout.completed}
              </span>
            </div>

            <ul className="divide-y divide-line">
              {todayWorkout.exercises.map((ex) => (
                <li key={ex.name} className="flex items-center gap-4 p-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                      ex.done
                        ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                        : 'border-line bg-beige text-ink-400'
                    }`}
                  >
                    <Icon name={ex.done ? 'CheckCircle2' : 'Circle'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{ex.name}</p>
                    <p className="text-xs text-ink-500">{ex.muscle}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-bold text-ink-900">
                      {ex.sets} × {ex.reps}
                    </p>
                    <p className="text-xs text-brand-300">{ex.weight}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
