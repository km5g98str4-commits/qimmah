import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { WorkoutMode } from '@/components/WorkoutMode'
import { WorkoutSummary } from '@/components/WorkoutSummary'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay, planExerciseName } from '@/lib/workoutPlan'
import { planTitle } from '@/lib/planGenerator'
import { getStrings } from '@/config/strings'
import { persistFinishedSession } from '@/lib/finishWorkout'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import { getExercise } from '@/data/exercises'
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
  const { customization } = useCustomization()
  const plan = customization.workoutPlan
  const planDay = todayPlanDay(plan, customization.routine)

  const [activeDay, setActiveDay] = useState<PlanDay | null>(null)
  const [summary, setSummary] = useState<FinishSummary | null>(null)
  const tw = getStrings(lang).workout

  const startDay = (day: PlanDay) => setActiveDay(day)

  const startEmpty = () =>
    setActiveDay({ id: `empty-${Date.now()}`, nameAr: 'تمرين فارغ', nameEn: 'Empty Workout', exercises: [] })

  const finish = (session: WorkoutSession) => {
    const prs = persistFinishedSession(session)
    const daysPerWeek = plan.days.length || 3
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
              تمرين
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">تمرين</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('exercises')}
            aria-label="بحث في المكتبة"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 shadow-card hover:bg-beige"
          >
            <Icon name="Search" className="h-5 w-5" />
          </button>
        </div>

        {/* بدء سريع */}
        <section>
          <H2 icon="Zap">بدء سريع</H2>
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
                  <span className="block text-sm font-black">ابدأ تمرين اليوم</span>
                  <span className="block truncate text-xs text-white/85">{lang === 'en' ? planDay.nameEn : planDay.nameAr} · {planDay.exercises.length} تمارين</span>
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
                <span className="block text-sm font-black text-ink-900">ابدأ تمرين فارغ</span>
                <span className="block text-xs text-ink-400">سجّل مجموعاتك بدون جدول مسبق</span>
              </span>
            </button>
          </div>
        </section>

        {/* خطتي */}
        <section id="workout-myplan">
          <H2 icon="CalendarDays">خطتي</H2>
          {plan.days.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-8 text-center">
              <p className="text-sm text-ink-500">ما عندك جدول حالي — قِمّة تولّد لك خطة من بياناتك وهدفك.</p>
              <button type="button" onClick={() => onNavigate('setup')} className="btn-primary mx-auto mt-4 px-4 py-2.5 text-xs">
                <Icon name="Sparkles" className="h-4 w-4" />
                أنشئ خطتي
              </button>
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-ink-900">{planTitle(plan.templateId, lang)}</p>
                  <p className="text-xs text-ink-400">{plan.days.length} أيام/أسبوع</p>
                </div>
                <button type="button" onClick={() => onNavigate('setup')} className="btn-ghost shrink-0 px-3 py-2 text-xs">
                  <Icon name="Palette" className="h-4 w-4" />
                  تعديل
                </button>
              </div>

              {/* يوم اليوم */}
              {planDay && (
                <div className="mt-4 rounded-xl border border-line bg-page p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary-c">تمرين اليوم</p>
                      <p className="truncate text-sm font-bold text-ink-900">{lang === 'en' ? planDay.nameEn : planDay.nameAr}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {planDay.exercises.slice(0, 4).map((pe) => planExerciseName(pe, lang).split(' — ')[0]).join(' · ') || 'لا تمارين'}
                      </p>
                    </div>
                    {planDay.exercises.length > 0 && (
                      <button type="button" onClick={() => startDay(planDay)} className="btn-primary shrink-0 px-4 py-2.5 text-xs">
                        <Icon name="Flame" className="h-4 w-4" />
                        ابدأ
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* بقية الأيام */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.days.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => startDay(d)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-start hover:bg-beige"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink-900">{lang === 'en' ? d.nameEn : d.nameAr}</span>
                      <span className="block text-[11px] text-ink-400">{d.exercises.length} تمارين · ~{estDayMinutes(d)} د</span>
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
          <H2 icon="Layers">قوالبي</H2>
          <EmptyCard text="خطتك تُولَّد تلقائيًا من بياناتك. عدّل بياناتك من الإعداد لإعادة توليد جدول يناسبك." />
        </section>
      </div>

      {/* وضع التمرين — فوق الشريط السفلي */}
      {activeDay && (
        <div className="fixed inset-0 z-[60]">
          <WorkoutMode lang={lang} day={activeDay} onClose={() => setActiveDay(null)} onFinish={finish} />
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
