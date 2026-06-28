import { useMemo } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { WorkoutSession } from '@/lib/workoutSessions'
import { getExercise } from '@/data/exercises'
import { muscleLabel } from '@/lib/muscles'

interface WorkoutSummaryProps {
  lang: Lang
  session: WorkoutSession
  /** أسماء التمارين التي حقّقت رقمًا قياسيًا. */
  prs: string[]
  /** تسمية تمرين الغد/القادم (يوم — اسم). */
  nextDayLabel?: string
  /** عدد أسابيع الالتزام المتتالية. */
  streakWeeks: number
  onBackToToday: () => void
  onViewProgress: () => void
}

const num = (v?: string): number => {
  const m = String(v ?? '').match(/-?[\d.]+/)
  return m ? Number(m[0]) : 0
}

/** ملخّص نهاية التمرين — احتفاء سريع بالإنجاز ودفعة للاستمرار. */
export function WorkoutSummary({ lang, session, prs, nextDayLabel, streakWeeks, onBackToToday, onViewProgress }: WorkoutSummaryProps) {
  const t = getStrings(lang).workout

  const stats = useMemo(() => {
    let setsDone = 0
    let volume = 0
    const muscles = new Set<string>()
    let exDone = 0
    session.exercises.forEach((e) => {
      if (e.completed) exDone++
      const ex = getExercise(e.exerciseId)
      if (ex && (e.sets?.some((x) => x.completed) || e.completed)) muscles.add(muscleLabel(ex.primaryMuscle, lang))
      e.sets?.forEach((x) => {
        if (x.completed) {
          setsDone++
          volume += num(x.weightKg) * num(x.actualReps || x.targetReps)
        }
      })
    })
    let mins = 0
    if (session.finishedAt) {
      mins = Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    }
    return { setsDone, volume: Math.round(volume), muscles: [...muscles], exDone, mins }
  }, [session, lang])

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-page">
      <div className="container-page flex min-h-full flex-col justify-center py-10">
        <div className="mx-auto w-full max-w-md">
          {/* عنوان احتفائي */}
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-glow">
              <Icon name="PartyPopper" className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-2xl font-black text-ink-900">{t.summaryTitle}</h2>
            <p className="mt-1 text-sm text-ink-500">{t.summarySub}</p>
          </div>

          {/* الأرقام الرئيسية */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard icon="Clock" value={`${stats.mins}`} label={t.minShort} />
            <StatCard icon="Dumbbell" value={`${stats.exDone}`} label={t.exercisesDone} />
            <StatCard icon="Layers" value={`${stats.setsDone}`} label={t.setsDone} />
            <StatCard icon="TrendingUp" value={`${stats.volume}`} label={`${t.totalVolume} (${t.volumeUnit})`} />
          </div>

          {/* سلسلة الالتزام الأسبوعي */}
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-ink-700">
              <Icon name="Flame" className="h-5 w-5 text-primary-c" />{t.weeklyStreakTitle}
            </span>
            <span className="text-lg font-black text-primary-c">{streakWeeks} {t.weeksUnit}</span>
          </div>

          {/* الأرقام القياسية */}
          <div className="mt-3 rounded-2xl border border-gold-400/40 bg-gold-200/30 p-4">
            <p className="flex items-center gap-2 text-sm font-black text-ink-900">
              <Icon name="Trophy" className="h-5 w-5 text-gold-600" />{t.prsLabel}
            </p>
            {prs.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {prs.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-bold text-ink-700">
                    <Icon name="Trophy" className="h-3.5 w-3.5 text-gold-600" />{p}
                    <span className="rounded-full bg-gold-200/70 px-2 py-0.5 text-[10px] text-gold-600">{t.newPr}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ink-500">{t.noPrs}</p>
            )}
          </div>

          {/* العضلات */}
          {stats.muscles.length > 0 && (
            <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
              <p className="mb-2 text-xs font-bold text-ink-500">{t.musclesTrained}</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.muscles.map((m) => (
                  <span key={m} className="rounded-full bg-beige px-2.5 py-1 text-xs font-bold text-ink-700">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* التمرين القادم */}
          {nextDayLabel && (
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-page p-4 text-sm text-ink-700">
              <Icon name="CalendarDays" className="h-4 w-4 text-primary-c" />
              {t.nextWorkout}: <span className="font-bold text-ink-900">{nextDayLabel}</span>
            </p>
          )}

          {/* الأزرار */}
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={onBackToToday} className="btn-primary w-full py-3.5 text-base">
              <Icon name="ArrowLeft" className="h-5 w-5" />{t.backToToday}
            </button>
            <button type="button" onClick={onViewProgress} className="btn-ghost w-full py-3 text-sm">
              <Icon name="BarChart3" className="h-4 w-4" />{t.viewProgress}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-center">
      <Icon name={icon} className="mx-auto h-5 w-5 text-primary-c" />
      <p className="mt-1 text-2xl font-black text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  )
}
