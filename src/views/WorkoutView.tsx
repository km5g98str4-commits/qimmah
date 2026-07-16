import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WorkoutSummary } from '@/components/WorkoutSummary'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useAuth } from '@/lib/authContext'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay, planExerciseName } from '@/lib/workoutPlan'
import { planTitle } from '@/lib/planGenerator'
import { cn } from '@/lib/cn'
import {
  CustomPlanBuilder,
  customPlanStrings,
  loadCustomPlanRecord,
  saveCustomPlan,
  setPlanSource,
  type PlanSource,
} from '@/features/customPlan'
import { getStrings } from '@/config/strings'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'
import { persistFinishedSession } from '@/lib/finishWorkout'
import { clearActiveSession, loadActiveSession, type ActiveSessionSnapshot } from '@/lib/activeSession'
import { evaluateAchievements, registerWorkoutPRs } from '@/features/achievements/engine'
import { playHaptic } from '@/lib/nativeFeedback'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import { getExercise } from '@/data/exercises'
import { isDesignV2 } from '@/design-system/designPreview'
import { WorkoutV2 } from '@/views/WorkoutV2'
import type { WorkoutSession } from '@/lib/workoutSessions'
import type { PlanDay } from '@/types/workout'

interface FinishSummary {
  session: WorkoutSession
  prs: string[]
  streakWeeks: number
  nextDayLabel?: string
}

interface WorkoutViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** تبويب التمرين — بدء سريع، خطتي المولّدة، وقوالبي. لا «قوالب جاهزة» — الخطة تُولَّد من بياناتك. */
export function WorkoutView({ lang, onNavigate }: WorkoutViewProps) {
  // v2.1 preview (dev-only): the v2 workout loop. Default/production keeps v1.
  if (isDesignV2()) {
    return <WorkoutV2 lang={lang} onNavigate={onNavigate} />
  }
  return <WorkoutViewV1 lang={lang} onNavigate={onNavigate} />
}

function WorkoutViewV1({ lang, onNavigate }: WorkoutViewProps) {
  const { customization } = useCustomization()
  const auth = useAuth()
  const userId = auth.user?.id ?? null
  const autoPlan = customization.workoutPlan

  // مصدر الجدول لكل حساب: مخصّص (إن وُجد واعتُمد) أو التلقائي المولّد.
  const [customRec, setCustomRec] = useState(() => loadCustomPlanRecord(userId))
  useEffect(() => {
    setCustomRec(loadCustomPlanRecord(userId))
  }, [userId])
  const source: PlanSource = customRec?.source ?? 'auto'
  const hasCustom = !!customRec && customRec.plan.days.length > 0
  const plan = source === 'custom' && hasCustom ? customRec.plan : autoPlan
  const planDay = todayPlanDay(plan)

  const cp = customPlanStrings[lang]
  const [builderOpen, setBuilderOpen] = useState<null | 'create' | 'edit'>(null)
  const [savedToast, setSavedToast] = useState(false)

  const refreshCustom = () => setCustomRec(loadCustomPlanRecord(userId))
  const switchSource = (s: PlanSource) => {
    setPlanSource(userId, s)
    refreshCustom()
  }

  const [activeDay, setActiveDay] = useState<PlanDay | null>(null)
  const [summary, setSummary] = useState<FinishSummary | null>(null)
  // لقطة جلسة نشطة غير مكتملة (< ١٢س) لهذا الحساب — تُعرض كبطاقة «استئناف».
  const [pendingRestore, setPendingRestore] = useState<ActiveSessionSnapshot | null>(null)
  // اللقطة المُمرَّرة فعلًا إلى WorkoutMode عند «متابعة» (null للبدء الجديد).
  const [restoreSnapshot, setRestoreSnapshot] = useState<ActiveSessionSnapshot | null>(null)
  const tw = getStrings(lang).workout
  const d = workoutScreenStrings[lang]

  // عند الإقلاع/تبديل الحساب: افحص وجود لقطة قابلة للاستئناف (لا نعرضها أثناء تمرين قائم).
  useEffect(() => {
    setPendingRestore(loadActiveSession(userId))
  }, [userId])

  const startDay = (day: PlanDay) => {
    setRestoreSnapshot(null)
    setPendingRestore(null)
    setActiveDay(day)
  }

  const startEmpty = () => {
    setRestoreSnapshot(null)
    setPendingRestore(null)
    setActiveDay({ id: `empty-${Date.now()}`, nameAr: d.emptyWorkoutNameAr, nameEn: d.emptyWorkoutNameEn, exercises: [] })
  }

  const resumeWorkout = () => {
    if (!pendingRestore) return
    setRestoreSnapshot(pendingRestore)
    setActiveDay(pendingRestore.day)
    setPendingRestore(null)
  }

  const discardRestore = () => {
    clearActiveSession(userId)
    setPendingRestore(null)
  }

  const finish = (session: WorkoutSession) => {
    const prs = persistFinishedSession(session)
    const daysPerWeek = plan.days.length || 3
    // احتفل بالأرقام القياسية وافتح أوسمة التمرين/السلسلة/الأرقام القياسية فورًا.
    registerWorkoutPRs(prs)
    if (prs.length > 0) void playHaptic('pr')
    evaluateAchievements({ daysPerWeek })
    const weekly = weeklyAdherenceStreak(daysPerWeek)
    const prLabels = prs.map((pr) => {
      const name = lang === 'en' ? pr.nameEn || pr.nameAr : pr.nameAr || pr.nameEn
      return `${name || pr.exerciseId} · ${pr.weight} ${tw.volumeUnit}`
    })
    // تسمية تمرين الغد (اليوم التالي في الخطة) — لمسة تحفيزية.
    const nextDayLabel = plan.days.length
      ? (() => {
          const next = plan.days[(new Date().getDay() + 1) % plan.days.length]
          return next ? (lang === 'en' ? next.nameEn : next.nameAr) : undefined
        })()
      : undefined
    setActiveDay(null)
    setRestoreSnapshot(null)
    setSummary({ session, prs: prLabels, streakWeeks: weekly.streakWeeks, nextDayLabel })
  }

  return (
    <div className="px-4 py-4">
      <div className="space-y-8">
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Dumbbell" className="h-3.5 w-3.5" />
              {d.workoutEyebrow}
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">{d.workoutHeading}</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('exercises')}
            aria-label={d.searchLibrary}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 shadow-card hover:bg-beige"
          >
            <Icon name="Search" className="h-5 w-5" />
          </button>
        </div>

        {/* استئناف تمرين غير مكتمل — لقطة محفوظة (< ١٢س) لهذا الحساب */}
        {pendingRestore && !activeDay && !summary && (
          <section>
            <div className="flex flex-col gap-3 rounded-2xl border border-primary-soft bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white">
                  <Icon name="RotateCcw" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink-900">{tw.resumeTitle}</p>
                  <p dir="auto" className="truncate text-xs text-ink-500">
                    {(lang === 'en' ? pendingRestore.day.nameEn : pendingRestore.day.nameAr) || tw.resumeBody}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={resumeWorkout} className="btn-primary px-4 py-2.5 text-xs">
                  <Icon name="Flame" className="h-4 w-4" />
                  {tw.resume}
                </button>
                <button type="button" onClick={discardRestore} className="btn-ghost px-4 py-2.5 text-xs">
                  {tw.resumeDiscard}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* بدء سريع */}
        <section>
          <H2 icon="Zap">{d.quickStart}</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {planDay && planDay.exercises.length > 0 && (
              <button
                type="button"
                onClick={() => startDay(planDay)}
                className="group flex items-center gap-3 rounded-2xl bg-primary p-4 text-start text-white shadow-glow"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
                  <Icon name="Flame" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{d.startTodayWorkout}</span>
                  <span dir="auto" className="block truncate text-xs text-white/85">{lang === 'en' ? planDay.nameEn : planDay.nameAr} · {planDay.exercises.length} {d.exercisesUnit}</span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={startEmpty}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start shadow-card hover:bg-beige"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name="Plus" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-ink-900">{d.startEmptyWorkout}</span>
                <span className="block text-xs text-ink-400">{d.startEmptyDesc}</span>
              </span>
            </button>
          </div>
        </section>

        {/* خطتي */}
        <section id="workout-myplan">
          <H2 icon="CalendarDays">{d.myPlan}</H2>

          {/* مصدر الجدول (تلقائي/مخصّص) + إدارة الجدول المخصّص */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {hasCustom && (
              <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label={cp.planSourceTitle}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'auto'}
                  onClick={() => switchSource('auto')}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition-colors', source === 'auto' ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900')}
                >
                  {cp.useAuto}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'custom'}
                  onClick={() => switchSource('custom')}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition-colors', source === 'custom' ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900')}
                >
                  {cp.useCustom}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setBuilderOpen(hasCustom ? 'edit' : 'create')}
              className="btn-ghost px-3 py-2 text-xs"
            >
              <Icon name={hasCustom ? 'SlidersHorizontal' : 'Plus'} className="h-4 w-4" />
              {hasCustom ? cp.editMyPlan : cp.createCustom}
            </button>
          </div>

          {plan.days.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
              <p className="text-sm text-ink-500">{d.noPlanYet}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => onNavigate('setup')} className="btn-primary px-4 py-2.5 text-xs">
                  <Icon name="Sparkles" className="h-4 w-4" />
                  {d.createMyPlan}
                </button>
                <button type="button" onClick={() => setBuilderOpen('create')} className="btn-ghost px-4 py-2.5 text-xs">
                  <Icon name="SlidersHorizontal" className="h-4 w-4" />
                  {cp.createCustom}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-ink-900">
                      {source === 'custom' ? cp.customPlanBadge : planTitle(plan.templateId, lang)}
                    </p>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-black text-primary-c">
                      {source === 'custom' ? cp.customPlanBadge : cp.autoPlanBadge}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">{plan.days.length} {d.daysPerWeek}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (source === 'custom' ? setBuilderOpen('edit') : onNavigate('setup'))}
                  className="btn-ghost shrink-0 px-3 py-2 text-xs"
                >
                  <Icon name={source === 'custom' ? 'SlidersHorizontal' : 'Palette'} className="h-4 w-4" />
                  {d.edit}
                </button>
              </div>

              {/* يوم اليوم */}
              {planDay && (
                <div className="mt-4 rounded-xl border border-line bg-page p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary-c">{d.todayWorkout}</p>
                      <p dir="auto" className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? planDay.nameEn : planDay.nameAr}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {planDay.exercises.slice(0, 4).map((pe) => planExerciseName(pe, lang)).join(' · ') || d.noExercises}
                      </p>
                    </div>
                    {planDay.exercises.length > 0 && (
                      <button type="button" onClick={() => startDay(planDay)} className="btn-primary shrink-0 px-4 py-2.5 text-xs">
                        <Icon name="Flame" className="h-4 w-4" />
                        {d.start}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* بقية الأيام */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.days.map((pd) => (
                  <button
                    key={pd.id}
                    type="button"
                    onClick={() => startDay(pd)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-start hover:bg-beige"
                  >
                    <span className="min-w-0">
                      <span dir="auto" className="block truncate text-sm font-bold text-ink-900">{lang === 'en' ? pd.nameEn : pd.nameAr}</span>
                      <span className="block text-[11px] text-ink-400">{pd.exercises.length} {d.exercisesUnit} · ~{estDayMinutes(pd)} {d.minShort}</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* قوالبي */}
        <section>
          <H2 icon="Layers">{d.myTemplates}</H2>
          <EmptyCard text={d.templatesAutoGenerated} />
        </section>
      </div>

      {/* باني الجدول المخصّص — إنشاء/تعديل، يعتمد الجدول لهذا الحساب عند الحفظ */}
      {builderOpen && (
        <div className="fixed inset-0 z-[65]">
          <CustomPlanBuilder
            lang={lang}
            initialPlan={builderOpen === 'edit' ? customRec?.plan : undefined}
            onSave={(p) => {
              saveCustomPlan(userId, p)
              refreshCustom()
              setBuilderOpen(null)
              setSavedToast(true)
              window.setTimeout(() => setSavedToast(false), 2200)
            }}
            onCancel={() => setBuilderOpen(null)}
          />
        </div>
      )}

      {/* إشعار حفظ الجدول المخصّص */}
      {savedToast && (
        <div className="fixed inset-x-0 bottom-24 z-[75] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-glow">
            <Icon name="CheckCircle2" className="h-4 w-4" />
            {cp.planSavedToast}
          </div>
        </div>
      )}

      {/* وضع التمرين — فوق الشريط السفلي */}
      {activeDay && (
        <div className="fixed inset-0 z-[60]">
          <WorkoutMode
            lang={lang}
            day={activeDay}
            ownerId={userId}
            initialSnapshot={restoreSnapshot}
            onClose={() => {
              setActiveDay(null)
              setRestoreSnapshot(null)
            }}
            onFinish={finish}
          />
        </div>
      )}

      {/* ملخّص نهاية التمرين — المدة وعدد التمارين والحجم والأرقام القياسية */}
      {summary && (
        <div className="fixed inset-0 z-[70]">
          <WorkoutSummary
            lang={lang}
            session={summary.session}
            prs={summary.prs}
            streakWeeks={summary.streakWeeks}
            nextDayLabel={summary.nextDayLabel}
            onBackToToday={() => setSummary(null)}
            onViewProgress={() => {
              setSummary(null)
              onNavigate('progress')
            }}
          />
        </div>
      )}
    </div>
  )
}

/** تقدير مدة اليوم بالدقائق من المجموعات والراحة. */
function estDayMinutes(day: PlanDay): number {
  const sec = day.exercises.reduce((sum, pe) => {
    const ex = getExercise(pe.exerciseId)
    const sets = pe.sets || ex?.defaultSets || 3
    const rest = pe.restSec || ex?.defaultRestSec || 90
    return sum + sets * (rest + 40)
  }, 0)
  return Math.max(5, Math.round(sec / 60 / 5) * 5)
}

function H2({ icon, children }: { icon: string; children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-ink-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </h2>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  )
}
