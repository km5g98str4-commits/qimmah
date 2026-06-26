import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { weeklyRoutine, routineTypeColors, routineTypeLabels } from '@/data/routine'
import { sectionCopy, labels } from '@/config/content'

/** قسم الروتين الأسبوعي — أيام الأسبوع مع نوع التدريب وحالة الإنجاز. */
export function WeeklyRoutine() {
  const doneCount = weeklyRoutine.filter((d) => d.done).length

  return (
    <section id="routine" className="section bg-beige">
      <div className="container-page">
        <SectionHeading {...sectionCopy.routine} />

        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">
              {labels.routine.progressPrefix}{' '}
              <span className="font-bold text-brand-300">{doneCount}</span>{' '}
              {labels.routine.progressMid} {weeklyRoutine.length} {labels.routine.progressSuffix}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {weeklyRoutine.map((d) => (
              <div
                key={d.day}
                className={`card flex flex-col p-4 ${d.done ? 'ring-1 ring-brand-500/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-700">{d.day}</span>
                  {d.done && <Icon name="CheckCircle2" className="h-4 w-4 text-brand-400" />}
                </div>
                <span
                  className={`mt-3 inline-flex w-fit rounded-md border px-2 py-0.5 text-[11px] font-bold ${routineTypeColors[d.type]}`}
                >
                  {routineTypeLabels[d.type]}
                </span>
                <p className="mt-3 text-xs leading-relaxed text-ink-500">{d.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
