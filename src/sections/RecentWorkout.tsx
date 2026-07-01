import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { SectionHeading } from '@/components/SectionHeading'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { dashboardStrings } from '@/i18n/dict/dashboard'
import { lastSession, loadSessions } from '@/lib/workoutSessions'
import { loadHistory } from '@/lib/exerciseHistory'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { generateInsights, type InsightTone } from '@/lib/trainingInsights'
import { useCustomization } from '@/lib/customizationContext'

const TONE_CLS: Record<InsightTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-gold-400/40 bg-gold-200/40 text-gold-600',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-line bg-beige text-ink-700',
}

const TONE_ICON: Record<InsightTone, string> = {
  success: 'TrendingUp',
  warning: 'Minus',
  danger: 'AlertTriangle',
  info: 'Activity',
}

/** قسم «آخر تمرين» — ملخّص مختصر لآخر جلسة + ملاحظات الذكاء التدريبي. */
export function RecentWorkout({ lang }: { lang: Lang }) {
  const t = getStrings(lang).workout
  const d = dashboardStrings[lang]
  const { customization } = useCustomization()
  const session = lastSession()

  const insights = useMemo(() => {
    const sessions = loadSessions()
    if (!sessions.length) return []
    const coverage = computeWeeklyCoverage({
      sessions,
      plan: customization.workoutPlan,
      level: customization.profile.trainingLevel,
    })
    return generateInsights({ sessions, history: loadHistory(), coverage })
  }, [customization.workoutPlan, customization.profile.trainingLevel])

  if (!session) return null

  const completed = session.exercises.filter((e) => e.completed).length
  const total = session.exercises.length
  const hard = session.exercises.filter((e) => e.difficulty === 'hard').length

  return (
    <section id="recent-workout" className="section bg-beige">
      <div className="container-page">
        <SectionHeading eyebrow={t.recentTitle} icon="CheckCircle2" title={t.recentTitle} />

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <Stat icon="CalendarDays" label={d.date} value={session.date} />
          <Stat icon="Dumbbell" label={d.day} value={session.workoutDayName} />
          <Stat icon="CheckCircle2" label={d.completedExercises} value={`${completed}/${total}`} />
          <Stat icon="Flame" label={d.hardExercises} value={`${hard}`} />
        </div>

        {/* ملاحظات الذكاء التدريبي */}
        {insights.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
              <Icon name="Sparkles" className="h-4 w-4 text-primary-c" />
              {d.trainingInsights}
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {insights.slice(0, 6).map((it) => (
                <li
                  key={it.id}
                  className={cn('flex items-start gap-2 rounded-xl border p-3 text-sm leading-relaxed', TONE_CLS[it.tone])}
                >
                  <Icon name={TONE_ICON[it.tone]} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{it.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs text-ink-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-ink-900">{value}</p>
    </div>
  )
}
