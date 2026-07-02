import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { MuscleCoverageGrid } from '@/components/MuscleMap'
import { useCustomization } from '@/lib/customizationContext'
import { useIsDemo } from '@/lib/demoMode'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { summarizeMuscleGroups } from '@/lib/muscleGroupCoverage'
import { loadSessions, type WorkoutSession } from '@/lib/workoutSessions'
import { getDayStamp } from '@/lib/today'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'
import type { WorkoutPlan } from '@/types/workout'

/**
 * قسم «عضلاتك هذا الأسبوع» — بطاقات تغطية المجموعات العضلية + ملخّص + توصيات.
 * تصميم كمال أجسام: مدمج، عالي التباين، بلا رسوم طفولية.
 */
export function MuscleCoverageSection({ lang }: { lang: Lang }) {
  const d = progressScreenStrings[lang]
  const { customization } = useCustomization()
  const isDemo = useIsDemo()
  const plan = customization.workoutPlan
  const level = customization.profile.trainingLevel

  const { result, hasData } = useMemo(() => {
    const sessions = isDemo ? demoSessions(plan, lang) : loadSessions()
    const res = computeWeeklyCoverage({ sessions, plan, level })
    const any = Object.values(res.weeklyCoverage).some((c) => c.sets > 0)
    return { result: res, hasData: any }
  }, [isDemo, plan, level, lang])

  const summary = summarizeMuscleGroups(result.weeklyCoverage, level)
  const topRecs = result.recommendationsAr.slice(0, 2)

  return (
    <section id="muscle-coverage" className="section">
      <div className="container-page">
        {/* ترويسة القسم — نبرة كمال أجسام */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Activity" className="h-3.5 w-3.5" />
              {d.coverageEyebrow}
            </span>
            <h2 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">{d.coverageTitle}</h2>
            <p className="mt-1 text-sm text-ink-500">{d.coverageDesc}</p>
          </div>

          {hasData && (
            <div className="flex gap-2">
              <SummaryPill icon="CheckCircle2" value={summary.complete} label={d.pillComplete} tone="#1F9D57" />
              <SummaryPill icon="AlertTriangle" value={summary.undertrained} label={d.pillUndertrained} tone="#D6553A" />
              <SummaryPill icon="Moon" value={summary.needRest} label={d.pillRest} tone="#E0941F" />
            </div>
          )}
        </div>

        {hasData ? (
          <>
            {/* شريط التوصيات — بارز وحيوي */}
            {topRecs.length > 0 && (
              <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-primary-soft bg-primary-soft p-4 sm:flex-row sm:items-center sm:gap-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Icon name="Sparkles" className="h-5 w-5" />
                </span>
                <ul className="flex-1 space-y-1">
                  {topRecs.map((r, i) => (
                    // dir=auto: التوصيات عربية المصدر وقد تُعرض داخل واجهة إنجليزية — عزل الاتجاه يحفظ الترقيم
                    <li key={i} dir="auto" className="text-sm font-bold leading-relaxed text-ink-900">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* بطاقات المجموعات العضلية */}
            <MuscleCoverageGrid coverage={result.weeklyCoverage} level={level} className="mt-5" lang={lang} />
          </>
        ) : (
          <EmptyState lang={lang} />
        )}

        {lang === 'en' && <p className="mt-3 text-xs text-ink-400">Muscle recommendations are shown in Arabic in this preview.</p>}
      </div>
    </section>
  )
}

function SummaryPill({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-card">
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: `${tone}1A`, color: tone }}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="leading-none">
        <p className="text-lg font-black text-ink-900">{value}</p>
        <p className="mt-0.5 text-[10px] text-ink-400">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ lang }: { lang: Lang }) {
  const d = progressScreenStrings[lang]
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="Dumbbell" className="h-7 w-7" />
        </span>
        <p className="max-w-md text-base font-bold leading-relaxed text-ink-900">
          {d.sectionEmptyTitle}
        </p>
        <p className="text-sm text-ink-500">{d.sectionEmptyBody}</p>
      </div>
    </div>
  )
}

/** جلسات تجريبية للنموذج — تُغذّي البطاقات ببيانات واقعية (بلا كتابة في التخزين). */
function demoSessions(plan: WorkoutPlan, lang: Lang): WorkoutSession[] {
  if (!plan.days.length) return []
  const now = Date.now()
  const dayMs = 24 * 3600_000
  const picks = plan.days.slice(0, 2)
  return picks.map((day, di) => {
    const when = new Date(now - (di === 0 ? 1 : 3) * dayMs).toISOString()
    return {
      id: `demo-${day.id}`,
      date: getDayStamp(new Date(when)),
      startedAt: when,
      finishedAt: when,
      workoutDayId: day.id,
      // اسم اليوم بلغة الواجهة (P10.1) — جلسة عرض فقط، لا تُكتب في التخزين.
      workoutDayName: lang === 'en' ? day.nameEn || day.nameAr : day.nameAr,
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
