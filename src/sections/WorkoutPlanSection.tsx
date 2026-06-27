import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { MuscleChips } from '@/components/MuscleChips'
import { useCustomization } from '@/lib/customizationContext'
import { planExerciseName, planExerciseVideo } from '@/lib/workoutPlan'
import { getExercise } from '@/data/exercises'
import { getRecord } from '@/lib/exerciseHistory'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

/** قسم «تماريني» — يعرض خطة التمرين الحالية مع شرح كل تمرين وآخر/أفضل وزن. */
export function WorkoutPlanSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const plan = customization.workoutPlan
  const t = getStrings(lang).workout

  return (
    <section id="workouts" className="section">
      <div className="container-page">
        <SectionHeading eyebrow={t.workoutsTitle} icon="Dumbbell" title={t.workoutsTitle} description={t.workoutsDesc} />

        {plan.days.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
            <p className="text-sm text-ink-500">{t.emptyPlan}</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {plan.days.map((day) => (
              <div key={day.id} className="card overflow-hidden">
                <div className="border-b border-line p-5">
                  <p className="text-sm font-bold text-ink-900">{lang === 'en' ? day.nameEn : day.nameAr}</p>
                  <p className="text-xs text-ink-400">{day.exercises.length} تمارين</p>
                </div>
                <ul className="divide-y divide-line">
                  {day.exercises.map((pe) => {
                    const rec = getRecord(pe.exerciseId)
                    const lib = getExercise(pe.exerciseId)
                    return (
                      <li key={pe.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-900">{planExerciseName(pe, lang)}</p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {pe.sets}×{pe.reps} · {t.rest} {pe.restSec}ث
                              {pe.startingWeight ? ` · ${pe.startingWeight}` : ''}
                            </p>
                            {lib && (
                              <MuscleChips
                                primary={lib.primaryMusclesDetailed}
                                secondary={lib.secondaryMusclesDetailed}
                                className="mt-2"
                              />
                            )}
                            {(rec?.lastWeight || rec?.bestWeight) && (
                              <p className="mt-1 text-[11px] text-primary-c">
                                {rec?.lastWeight ? `${t.prevWeight}: ${rec.lastWeight}` : ''}
                                {rec?.bestWeight ? `  ·  ${t.bestWeight}: ${rec.bestWeight}` : ''}
                              </p>
                            )}
                          </div>
                          <a
                            href={planExerciseVideo(pe)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost shrink-0 px-3 py-2 text-xs"
                          >
                            <Icon name="Globe" className="h-4 w-4" />
                            {t.watch}
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
