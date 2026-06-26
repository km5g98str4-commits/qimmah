import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { todayWorkout } from '@/data/workout'

/** قسم متتبّع التمارين — قائمة تمارين اليوم مع حالة الإنجاز. */
export function WorkoutTracker() {
  const done = todayWorkout.exercises.filter((e) => e.done).length
  const total = todayWorkout.exercises.length

  return (
    <section id="workout" className="section bg-ink-900/30">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="متابعة التمارين"
            icon="Dumbbell"
            title="سجّل كل مجموعة وتكرار ووزن"
            description="تابع تقدّمك في كل تمرين، وعلّم ما أنجزته، واعرف بالضبط أين وصلت في برنامجك اليومي."
          />

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
              <div>
                <p className="text-sm font-bold text-white">{todayWorkout.day}</p>
                <p className="mt-1 text-xs text-slate-400">{todayWorkout.focus}</p>
              </div>
              <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-300">
                {done} / {total} مكتمل
              </span>
            </div>

            <ul className="divide-y divide-white/[0.04]">
              {todayWorkout.exercises.map((ex) => (
                <li key={ex.name} className="flex items-center gap-4 p-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                      ex.done
                        ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                        : 'border-white/10 bg-white/[0.02] text-slate-500'
                    }`}
                  >
                    <Icon name={ex.done ? 'CheckCircle2' : 'Circle'} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{ex.name}</p>
                    <p className="text-xs text-slate-400">{ex.muscle}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-bold text-slate-200">
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
