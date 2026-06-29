import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { DailySummary } from '@/sections/DailySummary'
import { Today } from '@/sections/Today'
import { RecentWorkout } from '@/sections/RecentWorkout'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay } from '@/lib/workoutPlan'
import { planTitle } from '@/lib/planGenerator'
import { goalTypeLabel } from '@/lib/calculators'
import { currentWeekSummary } from '@/lib/streaks'
import { experienceChoices } from '@/data/planBuilder'
import { useDashboardSignals, type LeadCard } from '@/lib/dashboardLayout'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'

interface DashboardViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/**
 * الرئيسية — لوحة شخصية مبنية من الإعداد.
 * ترتيب البطاقات يتبع الهدف والخبرة (مصدر الحقيقة) لا ترتيبًا ثابتًا،
 * وتبدأ ببطاقة «نظامك جاهز» لتوضّح أن النظام بُني لهذا المستخدم تحديدًا.
 */
export function DashboardView({ lang, onNavigate }: DashboardViewProps) {
  const { customization } = useCustomization()
  const s = customization.sections
  const signals = useDashboardSignals(customization.profile)
  const planDay = todayPlanDay(customization.workoutPlan)

  return (
    <div className="space-y-4 px-4 py-4">
      {/* «نظامك جاهز» — يوضّح أن الخطة بُنيت من إجابات الإعداد */}
      <BuiltForYou onNavigate={onNavigate} />

      {/* بطاقات الصدارة — مرتّبة حسب الهدف والخبرة */}
      {signals.leadOrder.map((card) => (
        <LeadBlock key={card} card={card} lang={lang} onNavigate={onNavigate} />
      ))}

      {/* قائمة اليوم — الإجراء اليومي التفصيلي */}
      {s.today && (
        <Today
          lang={lang}
          onStartWorkout={planDay ? () => onNavigate('workout') : undefined}
          onEditPlan={() => onNavigate('setup')}
        />
      )}

      {/* آخر تمرين */}
      {s.workouts && <RecentWorkout lang={lang} />}

      {/* مختصرات للتبويبات الأخرى */}
      <div className="grid grid-cols-2 gap-3 px-1">
        <TeaserCard
          icon="Salad"
          label={getStrings(lang).tabs.nutrition}
          onClick={() => onNavigate('nutrition')}
        />
        <TeaserCard
          icon="BarChart3"
          label={getStrings(lang).tabs.progress}
          onClick={() => onNavigate('progress')}
        />
      </div>
    </div>
  )
}

/** يختار البطاقة الصحيحة لكل موضع في ترتيب الصدارة. */
function LeadBlock({
  card,
  lang,
  onNavigate,
}: {
  card: LeadCard
  lang: Lang
  onNavigate: (route: AppRoute) => void
}) {
  switch (card) {
    case 'nutrition':
      return <DailySummary lang={lang} />
    case 'workout':
      return <WorkoutLead lang={lang} onNavigate={onNavigate} />
    case 'nextAction':
      return <NextActionCard lang={lang} onNavigate={onNavigate} />
    case 'progress':
      return <ProgressSnapshot onNavigate={onNavigate} />
    default:
      return null
  }
}

/** بطاقة «نظامك جاهز» — هوية النظام المُولّد: الهدف، الأيام، التقسيمة، السعرات. */
function BuiltForYou({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const p = customization.profile
  const name = customization.identity.userName?.trim()
  const days = customization.workoutPlan.days.length
  const split = days ? planTitle(customization.workoutPlan.templateId, 'ar') : undefined
  const calories = customization.nutritionPlan.targetCalories || customization.targets.targetCalories || 0
  const expLabel = experienceChoices.find((e) => e.value === p.experienceLevel)?.label

  return (
    <section className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-60" />
      <div className="relative">
        <span className="eyebrow">
          <Icon name="Sparkles" className="h-3.5 w-3.5" />
          نظامك جاهز
        </span>
        <h1 className="mt-2 text-xl font-black text-ink-900">
          {name ? `${name}، هذا نظامك` : 'هذا نظامك الشخصي'}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          بنيناه من إجاباتك في الإعداد — خطة التمرين والتغذية والالتزام كلها مفصّلة لك.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip icon="Target" text={goalTypeLabel(p.goalType)} />
          {days > 0 && <Chip icon="CalendarDays" text={`${days} أيام/أسبوع`} />}
          {split && <Chip icon="Dumbbell" text={split} />}
          {calories > 0 && <Chip icon="Flame" text={`${calories} سعرة/يوم`} />}
          {expLabel && <Chip icon="TrendingUp" text={expLabel} />}
        </div>

        <button
          type="button"
          onClick={() => onNavigate('setup')}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-primary-c"
        >
          <Icon name="SlidersHorizontal" className="h-3.5 w-3.5" />
          تعديل خطتي
        </button>
      </div>
    </section>
  )
}

/** بطاقة تمرين اليوم — تقود مَن هدفه bulk/strength، أو ثانوية لغيرهم. */
function WorkoutLead({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const tw = getStrings(lang).workout
  const planDay = todayPlanDay(customization.workoutPlan)
  const dayName = planDay ? (lang === 'en' ? planDay.nameEn : planDay.nameAr) : ''

  return (
    <button
      type="button"
      onClick={() => onNavigate('workout')}
      className="card relative w-full overflow-hidden p-5 text-start active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-70" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="eyebrow">
            <Icon name="Dumbbell" className="h-3.5 w-3.5" />
            {tw.start}
          </span>
          <p className="mt-2 truncate text-xl font-black text-ink-900">
            {planDay ? dayName : tw.emptyPlan}
          </p>
          {planDay && (
            <p className="mt-0.5 text-xs text-ink-500">
              {planDay.exercises.length} {tw.workoutsTitle}
            </p>
          )}
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-glow">
          <Icon name="Flame" className="h-6 w-6" />
        </span>
      </div>
    </button>
  )
}

/** بطاقة «خطوتك التالية» — إرشاد عملي للمبتدئ (بارزة في ترتيبه). */
function NextActionCard({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const planDay = todayPlanDay(customization.workoutPlan)
  const dayName = planDay ? (lang === 'en' ? planDay.nameEn : planDay.nameAr) : ''

  // خطوة عملية واحدة واضحة: تمرين اليوم إن وُجد، وإلا مراجعة الخطة/التغذية.
  const hasWorkoutToday = !!planDay
  const title = hasWorkoutToday ? `ابدأ بتمرين اليوم: ${dayName}` : 'اليوم راحة — جهّز تغذيتك'
  const hint = hasWorkoutToday
    ? 'خطوة وحدة تكفي اليوم. افتح التمرين وعلّم كل مجموعة وأنت تخلّصها.'
    : 'لا تمرين اليوم. راجع وجباتك واشرب ماءك — الالتزام في يوم الراحة جزء من الخطة.'
  const cta = hasWorkoutToday ? 'افتح تمرين اليوم' : 'افتح خطة الأكل'
  const target: AppRoute = hasWorkoutToday ? 'workout' : 'nutrition'

  return (
    <section className="card p-5">
      <span className="eyebrow">
        <Icon name="Compass" className="h-3.5 w-3.5" />
        خطوتك التالية
      </span>
      <p className="mt-2 text-base font-black text-ink-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>
      <button type="button" onClick={() => onNavigate(target)} className="btn-primary mt-3 w-full justify-center py-3 text-sm">
        <Icon name={hasWorkoutToday ? 'Dumbbell' : 'Salad'} className="h-4 w-4" />
        {cta}
      </button>
    </section>
  )
}

/** لقطة تقدّم مختصرة — بارزة للمتقدّم (سلسلة/التزام الأسبوع/تمرين اليوم). */
function ProgressSnapshot({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const daysPerWeek = customization.workoutPlan.days.length || 3
  const week = useMemo(() => currentWeekSummary(daysPerWeek), [daysPerWeek])
  const hasHistory = week.weekly.thisWeekCount > 0 || week.weekly.streakWeeks > 0 || week.bestStreak > 0

  return (
    <button
      type="button"
      onClick={() => onNavigate('progress')}
      className="card w-full p-5 text-start active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          <Icon name="BarChart3" className="h-3.5 w-3.5" />
          تقدّمك
        </span>
        <Icon name="ChevronLeft" className="h-4 w-4 text-ink-400 rtl:rotate-180" />
      </div>

      {hasHistory ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat value={`${week.weekly.thisWeekCount}/${week.weekly.daysPerWeek}`} label="هذا الأسبوع" />
          <Stat value={`${week.weekly.streakWeeks}`} label="أسابيع متتالية" />
          <Stat value={`${week.bestStreak}`} label="أطول سلسلة" />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          سجّل أول تمرين وتبدأ أرقامك تظهر هنا — الحجم، الأرقام القياسية، والسلسلة الأسبوعية.
        </p>
      )}
    </button>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-page p-3 text-center">
      <p className="text-lg font-black text-ink-900">{value}</p>
      <p className="truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-bold text-ink-700">
      <Icon name={icon} className="h-3.5 w-3.5 text-primary-c" />
      {text}
    </span>
  )
}

function TeaserCard({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card flex items-center gap-3 p-4 text-start active:scale-[0.99]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
      <Icon name="ChevronLeft" className="ms-auto h-4 w-4 text-ink-400 rtl:rotate-180" />
    </button>
  )
}
