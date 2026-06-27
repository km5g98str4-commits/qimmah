import { useMemo } from 'react'
import { SectionHeading } from '@/components/SectionHeading'
import { Icon } from '@/components/Icon'
import { MuscleMap } from '@/components/MuscleMap'
import { cn } from '@/lib/cn'
import { useCustomization } from '@/lib/customizationContext'
import { useIsDemo } from '@/lib/demoMode'
import { computeWeeklyCoverage, summarizeCoverage } from '@/lib/muscleCoverage'
import { loadSessions, type WorkoutSession } from '@/lib/workoutSessions'
import { muscleLabelAr } from '@/data/muscleGroups'
import { getDayStamp } from '@/lib/today'
import type { Lang } from '@/lib/appPreferences'
import type { WorkoutPlan } from '@/types/workout'

/**
 * قسم «عضلاتك هذا الأسبوع» — خريطة العضلات + ملخّص التغطية + توصيات.
 * يظهر قرب الأعلى (بعد «اليوم» والجدول الأسبوعي).
 */
export function MuscleCoverageSection({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const isDemo = useIsDemo()
  const plan = customization.workoutPlan
  const level = customization.profile.trainingLevel

  const result = useMemo(() => {
    const sessions = isDemo ? demoSessions(plan) : loadSessions()
    return computeWeeklyCoverage({ sessions, plan, level })
  }, [isDemo, plan, level])

  const summary = summarizeCoverage(result)

  return (
    <section id="muscle-coverage" className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="عضلاتك هذا الأسبوع"
          icon="Activity"
          title="عضلاتك هذا الأسبوع"
          description="شف وش تمرّنت، وش تعافى، ووش ناقصك هالأسبوع — بنظرة وحدة."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* خريطة العضلات */}
          <div className="card p-6">
            <MuscleMap coverage={result.weeklyCoverage} />
          </div>

          {/* الملخّص + التوصيات */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard icon="CheckCircle2" label="العضلات المكتملة" value={summary.completeCount} tone="success" />
              <SummaryCard icon="AlertTriangle" label="العضلات الناقصة" value={summary.undertrainedCount} tone="danger" />
              <SummaryCard icon="Moon" label="تحتاج راحة" value={summary.needRecoveryCount} tone="gold" />
            </div>

            {/* التوصيات */}
            <div className="card flex-1 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
                  <Icon name="Sparkles" className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-ink-900">توصيات هذا الأسبوع</h3>
              </div>
              {result.recommendationsAr.length ? (
                <ul className="space-y-2.5">
                  {result.recommendationsAr.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
                      <Icon name="ChevronLeft" className="mt-0.5 h-4 w-4 shrink-0 rotate-180 text-primary-c" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">ابدأ تمرينك وسجّل مجموعاتك لتظهر لك توصيات مخصّصة.</p>
              )}

              {/* النواقص كرقائق سريعة */}
              {result.missingMuscles.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-bold text-ink-500">ناقصة هذا الأسبوع</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingMuscles.map((m) => (
                      <span key={m} className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">
                        {muscleLabelAr(m)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {lang === 'en' && (
          <p className="mt-3 text-xs text-ink-400">Muscle coverage is shown in Arabic in this preview.</p>
        )}
      </div>
    </section>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: 'success' | 'danger' | 'gold' }) {
  const toneCls =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-gold-500'
  return (
    <div className="card p-4 text-center">
      <Icon name={icon} className={cn('mx-auto h-5 w-5', toneCls)} />
      <p className="mt-2 text-2xl font-black text-ink-900">{value}</p>
      <p className="text-[11px] leading-tight text-ink-400">{label}</p>
    </div>
  )
}

/** جلسات تجريبية للنموذج — تُضيء الخريطة ببيانات واقعية (بلا كتابة في التخزين). */
function demoSessions(plan: WorkoutPlan): WorkoutSession[] {
  if (!plan.days.length) return []
  const now = Date.now()
  const dayMs = 24 * 3600_000
  // يومان من الخطة: الأول قبل يوم، الثاني قبل ثلاثة أيام
  const picks = plan.days.slice(0, 2)
  return picks.map((day, di) => {
    const when = new Date(now - (di === 0 ? 1 : 3) * dayMs).toISOString()
    return {
      id: `demo-${day.id}`,
      date: getDayStamp(new Date(when)),
      startedAt: when,
      finishedAt: when,
      workoutDayId: day.id,
      workoutDayName: day.nameAr,
      exercises: day.exercises.map((pe) => ({
        exerciseId: pe.exerciseId,
        targetSets: pe.sets,
        targetReps: pe.reps,
        targetRestSec: pe.restSec,
        completed: true,
        sets: Array.from({ length: pe.sets }, (_, i) => ({
          setNumber: i + 1,
          targetReps: pe.reps,
          actualReps: pe.reps,
          weightKg: pe.startingWeight || '20',
          completed: true,
        })),
      })),
    }
  })
}
