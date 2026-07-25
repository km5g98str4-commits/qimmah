import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { BodyModel3D } from '@/components/BodyModel3D'
import { StepCounterCard } from '@/components/StepCounterCard'
import { MUSCLE_AR } from '@/lib/exerciseGuidance'
import { loadLogs, latestLog, trendFor } from '@/lib/measurementLog'
import { musclesThisWeek, recentVolumes, topPRs, workoutCounts } from '@/lib/progressStats'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import { useCustomization } from '@/lib/customizationContext'
import { loadReminderPrefs, saveReminderPrefs, type ReminderPrefs } from '@/lib/reminderPrefs'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

interface ProgressViewProps {
  lang: Lang
}

/** تبويب التقدّم — بطاقات الوزن والحجم والـPRs والعضلات والسلسلة + مزامنة صحة وتذكير (موبايل أولًا). */
export function ProgressView({ lang }: ProgressViewProps) {
  const t = getStrings(lang).progress
  const tw = getStrings(lang).workout
  const { customization } = useCustomization()
  const daysPerWeek = customization.workoutPlan.days.length || 3

  const stats = useMemo(() => {
    const logs = loadLogs()
    const latest = latestLog(logs)
    const weight = latest?.values?.weightKg
    return {
      weight: weight !== undefined && weight !== '' ? String(weight) : null,
      weightTrend: trendFor(logs, 'weightKg'),
      volumes: recentVolumes(8),
      prs: topPRs(5),
      muscles: musclesThisWeek(),
      weekly: weeklyAdherenceStreak(daysPerWeek),
      counts: workoutCounts(),
    }
  }, [daysPerWeek])

  const hasWorkouts = stats.counts.total > 0
  const maxVol = Math.max(1, ...stats.volumes.map((v) => v.volume))

  return (
    <div className="overflow-x-hidden px-4 py-4">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
          <Icon name="BarChart3" className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-black text-ink-900">{t.tabTitle}</h1>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          {/* الوزن */}
          <Card icon="Scale" title={t.cardWeight}>
            {stats.weight ? (
              <p className="text-2xl font-black text-ink-900">
                {stats.weight}<span className="text-xs font-bold text-ink-400"> كجم</span>
                {stats.weightTrend && (
                  <Icon
                    name={stats.weightTrend === 'up' ? 'TrendingUp' : stats.weightTrend === 'down' ? 'TrendingDown' : 'Minus'}
                    className="ms-1 inline h-4 w-4 text-primary-c"
                  />
                )}
              </p>
            ) : (
              <Empty text={t.noWeight} />
            )}
          </Card>

          {/* سلسلة الالتزام الأسبوعي */}
          <Card icon="Flame" title={tw.weeklyStreakTitle}>
            <p className="text-2xl font-black text-ink-900">
              {stats.weekly.streakWeeks}<span className="text-xs font-bold text-ink-400"> {tw.weeksUnit}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {tw.weeklyDonePrefix} {stats.weekly.thisWeekCount} {tw.of} {stats.weekly.daysPerWeek} {tw.weeklyWorkoutsWord}
            </p>
          </Card>
        </div>

        {/* حجم التمرين */}
        <Card icon="BarChart3" title={t.cardVolume} className="mt-3">
          {hasWorkouts && stats.volumes.length > 0 ? (
            <div className="mt-1 flex h-20 items-end gap-1.5">
              {stats.volumes.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${v.volume}`}>
                  <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(6, (v.volume / maxVol) * 100)}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <Empty text={t.noWorkouts} />
          )}
          {hasWorkouts && (
            <p className="mt-2 text-[11px] text-ink-400">{stats.counts.thisWeek} هذا الأسبوع · {stats.counts.total} إجمالًا</p>
          )}
        </Card>

        {/* أفضل الأوزان */}
        <Card icon="Trophy" title={t.cardPRs} className="mt-3">
          {stats.prs.length > 0 ? (
            <ul className="mt-1 space-y-2">
              {stats.prs.map((pr) => (
                <li key={pr.exerciseId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-ink-900">{pr.nameAr}</span>
                  <span className="shrink-0 rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-black text-primary-c">{pr.weight} كجم</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={t.noPRs} />
          )}
        </Card>

        {/* العضلات هذا الأسبوع */}
        <Card icon="Dumbbell" title={t.cardMuscles} className="mt-3">
          {stats.muscles.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {stats.muscles.map((m) => (
                <span key={m.muscle} className="rounded-full bg-beige px-3 py-1 text-xs font-bold text-ink-700">
                  {MUSCLE_AR[m.muscle]} · {m.count}
                </span>
              ))}
            </div>
          ) : (
            <Empty text={t.noWorkouts} />
          )}
        </Card>

        {/* مجسّم العضلات ثلاثي الأبعاد — يدور ٣٦٠° ويُضيء ما درّبته هذا الأسبوع */}
        <BodyModel3D className="mt-3" />

        {/* عدّاد الخطوات اليدوي + الهدف اليومي */}
        <StepCounterCard className="mt-3" />

        {/* مزامنة الصحة — نائب صادق */}
        <div className="mt-3 card border-primary-soft p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="Activity" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-ink-900">{t.healthSyncTitle}</p>
              <p className="text-[11px] font-bold text-primary-c">{t.healthSyncSoon}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">{t.healthSyncBody}</p>
        </div>

        {/* التذكيرات */}
        <ReminderCard lang={lang} />
      </div>
    </div>
  )
}

function Card({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4 text-primary-c" />
        <p className="text-xs font-bold text-ink-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="mt-1 text-xs leading-relaxed text-ink-400">{text}</p>
}

/** بطاقة تفضيل التذكير — وقت + تفعيل، يُحفظ محليًا. لا تنبيهات نظام. */
function ReminderCard({ lang }: { lang: Lang }) {
  const t = getStrings(lang).progress
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => loadReminderPrefs())

  const update = (partial: Partial<ReminderPrefs>) => {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    saveReminderPrefs(next)
  }

  return (
    <div className="mt-3 card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="CalendarDays" className="h-5 w-5" />
        </span>
        <p className="text-sm font-black text-ink-900">{t.remindersTitle}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="text-sm text-ink-700" htmlFor="reminder-enabled">{t.reminderEnabled}</label>
        <button
          id="reminder-enabled"
          type="button"
          role="switch"
          aria-checked={prefs.trainingEnabled}
          onClick={() => update({ trainingEnabled: !prefs.trainingEnabled })}
          className={`relative h-6 w-11 rounded-full transition-colors ${prefs.trainingEnabled ? 'bg-primary' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs.trainingEnabled ? 'start-0.5' : 'end-0.5'}`} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="text-sm text-ink-700" htmlFor="reminder-time">{t.reminderTrainingTime}</label>
        <input
          id="reminder-time"
          type="time"
          value={prefs.trainingTime}
          disabled={!prefs.trainingEnabled}
          onChange={(e) => update({ trainingTime: e.target.value })}
          className="rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c disabled:opacity-40"
        />
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-400">
        <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.reminderNote}
      </p>
    </div>
  )
}
