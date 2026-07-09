import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { DailySummary } from '@/sections/DailySummary'
import { Today } from '@/sections/Today'
import { RecentWorkout } from '@/sections/RecentWorkout'
import { AchievementsCard } from '@/features/achievements/AchievementsCard'
import { TodoWidget } from '@/features/todo/TodoWidget'
import { useCustomization } from '@/lib/customizationContext'
import { todayPlanDay } from '@/lib/workoutPlan'
import { planTitle } from '@/lib/planGenerator'
import { goalTypeLabel } from '@/lib/calculators'
import { goalTypeLabelI18n } from '@/lib/i18nLabels'
import { currentWeekSummary } from '@/lib/streaks'
import { experienceChoices } from '@/data/planBuilder'
import { useDashboardSignals, type LeadCard } from '@/lib/dashboardLayout'
import { useUiMode } from '@/lib/uiMode'
import { getRandomPhrase } from '@/data/motivationalPhrases'
import { getStrings } from '@/config/strings'
import { dashboardStrings } from '@/i18n/dict/dashboard'
import { statsScreenStrings } from '@/i18n/dict/statsScreen'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'

interface DashboardViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/**
 * الرئيسية — بسيطة بالافتراض.
 *
 * المبتدئ/المستجد يرى الحدّ الأدنى: ترحيب + تسجيل سريع + تمرين اليوم + سعرات/ماء اليوم.
 * بقيّة الخيارات (الخطوة التالية، التقدّم، قائمة اليوم التفصيلية، آخر تمرين، هوية النظام)
 * تُكشف خلف زرّ «وضع متقدّم». المتوسّط/المتقدّم يبدأ بالوضع المتقدّم.
 *
 * ترتيب التمرين/التغذية يتبع إشارات الإعداد (مصدر الحقيقة) لا ترتيبًا ثابتًا.
 */
export function DashboardView({ lang, onNavigate }: DashboardViewProps) {
  const { customization } = useCustomization()
  const s = customization.sections
  const signals = useDashboardSignals(customization.profile)
  const { isSimple, toggle } = useUiMode(signals.experience)
  const planDay = todayPlanDay(customization.workoutPlan)

  // الأساسيات (تمرين اليوم + سعرات/ماء) دائمًا ظاهرة، مرتّبة حسب المحرّك.
  const essentialLeads = signals.leadOrder.filter((c) => c === 'workout' || c === 'nutrition')
  // الوضع المتقدّم يضيف بطاقات الإشارات الكاملة (الخطوة التالية/التقدّم).
  const leads = isSimple ? essentialLeads : signals.leadOrder

  return (
    <div className="space-y-4 px-4 py-4">
      {/* ترحيب شخصي + عبارة اليوم */}
      <GreetingCard lang={lang} onNavigate={onNavigate} />

      {/* تسجيل سريع — أبرز إجراءين على بُعد نقرة واحدة */}
      <QuickEntry lang={lang} onNavigate={onNavigate} />

      {/* «لوحتي» (P12-C) — مدخل ملخّص أرقام الأسبوع (تمرين/تغذية/وزن) */}
      <MyStatsEntry lang={lang} onNavigate={onNavigate} />

      {/* الأساسيات: تمرين اليوم + سعرات/ماء اليوم */}
      {leads.map((card) => (
        <LeadBlock key={card} card={card} lang={lang} onNavigate={onNavigate} />
      ))}

      {/* أوسمتك — ظاهرة دائمًا (تحفيز المبتدئ)، والشبكة الكاملة على بُعد نقرة */}
      <AchievementsCard />

      {/* مهام اليوم — قائمة سريعة خفيفة قرب أسفل الرئيسية (وصول بالإبهام). */}
      <TodoWidget lang={lang} />

      {/* الوضع المتقدّم — تفاصيل أكثر لمن يريدها */}
      {!isSimple && (
        <>
          <SystemIdentity lang={lang} onNavigate={onNavigate} />

          {s.today && (
            <Today
              lang={lang}
              onStartWorkout={planDay ? () => onNavigate('workout') : undefined}
              onEditPlan={() => onNavigate('setup')}
            />
          )}

          {s.workouts && <RecentWorkout lang={lang} />}

          <div className="grid grid-cols-2 gap-3 px-1">
            <TeaserCard icon="Salad" label={getStrings(lang).tabs.nutrition} onClick={() => onNavigate('nutrition')} />
            <TeaserCard icon="BarChart3" label={getStrings(lang).tabs.progress} onClick={() => onNavigate('progress')} />
          </div>
        </>
      )}

      {/* مبدّل الوضع البسيط/المتقدّم */}
      <ModeToggle lang={lang} isSimple={isSimple} onToggle={toggle} />
    </div>
  )
}

/** بطاقة ترحيب — «أهلًا يا {الاسم}» + عبارة تحفيزية عشوائية + إشارة زخم هادئة. */
function GreetingCard({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const d = dashboardStrings[lang]
  const name = customization.identity.userName?.trim()
  // عبارة عشوائية تُحسب مرة عند دخول/تركيب الرئيسية (تدور مع كل جلسة جديدة).
  const phrase = useMemo(() => getRandomPhrase(), [])

  return (
    <section className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-radial-brand opacity-60" />
      <div className="relative">
        <span className="eyebrow">
          <Icon name="Sparkles" className="h-3.5 w-3.5" />
          {d.brand}
        </span>
        <h1 className="mt-2 text-2xl font-black text-ink-900">
          {name ? `${d.greetNamedPrefix}${name}${d.greetNamedSuffix}` : d.greetGuest}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{lang === 'en' ? phrase.en : phrase.ar}</p>

        {/* إشارة الزخم — هادئة وبارزة، لكل المستخدمين (تعيد استخدام حساب السلسلة القائم). */}
        <MomentumSignal lang={lang} />

        <button
          type="button"
          onClick={() => onNavigate('setup')}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-primary-c"
        >
          <Icon name="SlidersHorizontal" className="h-3.5 w-3.5" />
          {d.editPlan}
        </button>
      </div>
    </section>
  )
}

/**
 * إشارة الزخم — صف واحد هادئ على الرئيسية لكل المستخدمين (بسيط ومتقدّم):
 * سلسلة الأيام المتتالية (إن وُجدت) + التزام الأسبوع {x/y}، أو سطر بدء لطيف بلا سجل.
 * تعيد استخدام currentWeekSummary/streaks القائم — لا حساب جديد ولا نظام تحفيز جديد.
 */
function MomentumSignal({ lang }: { lang: Lang }) {
  const { customization } = useCustomization()
  const d = dashboardStrings[lang]
  const daysPerWeek = customization.workoutPlan.days.length || 3
  const week = useMemo(() => currentWeekSummary(daysPerWeek), [daysPerWeek])
  const streak = week.currentStreak
  const hasHistory = week.weekly.thisWeekCount > 0 || streak > 0 || week.bestStreak > 0

  if (!hasHistory) {
    return (
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-500">
        <Icon name="Sparkles" className="h-3.5 w-3.5 text-primary-c" />
        {d.momentumStart}
      </p>
    )
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      {streak > 0 && (
        <span className="inline-flex items-center gap-1 font-bold text-primary-c">
          <Icon name="Flame" className="h-3.5 w-3.5" />
          {streak} {d.momentumDayStreak}
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-ink-600">
        <Icon name="CalendarDays" className="h-3.5 w-3.5 text-ink-400" />
        {week.weekly.thisWeekCount}/{week.weekly.daysPerWeek} {d.thisWeek}
      </span>
      {week.workedOutToday && (
        <span className="inline-flex items-center gap-1 font-bold text-success">
          <Icon name="Check" className="h-3.5 w-3.5" />
          {d.momentumTodayDone}
        </span>
      )}
    </div>
  )
}

/** تسجيل سريع — سجّل أكل / ابدأ تمرين، كلاهما على بُعد نقرة من الرئيسية. */
function QuickEntry({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const d = dashboardStrings[lang]
  const tw = getStrings(lang).workout
  const tn = getStrings(lang).nutrition
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onNavigate('nutrition')}
        className="card flex flex-col items-start gap-2 p-4 text-start active:scale-[0.99]"
        aria-label={d.logMealAria}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white shadow-glow">
          <Icon name="Plus" className="h-6 w-6" />
        </span>
        <span className="text-sm font-black text-ink-900">{d.logFood}</span>
        <span className="text-[11px] text-ink-500">{tn.tabTitle} — {d.logFoodHint}</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('workout')}
        className="card flex flex-col items-start gap-2 p-4 text-start active:scale-[0.99]"
        aria-label={d.startTodayWorkoutAria}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white shadow-glow">
          <Icon name="Dumbbell" className="h-6 w-6" />
        </span>
        <span className="text-sm font-black text-ink-900">{d.startWorkout}</span>
        <span className="text-[11px] text-ink-500">{tw.start} — {d.startWorkoutHint}</span>
      </button>
    </div>
  )
}

/** بطاقة دخول «لوحتي» — تفتح شاشة ملخّص أرقام المستخدم الأسبوعية (P12-C). */
function MyStatsEntry({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const s = statsScreenStrings[lang]
  return (
    <button
      type="button"
      onClick={() => onNavigate('stats')}
      className="card flex w-full items-center gap-3 p-4 text-start active:scale-[0.99]"
      aria-label={s.entryAria}
      data-testid="stats-entry"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
        <Icon name="Activity" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-ink-900">{s.entryTitle}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-500">{s.entryHint}</span>
      </span>
      <Icon name="ChevronLeft" className="ms-auto h-4 w-4 shrink-0 text-ink-400 rtl:rotate-180" />
    </button>
  )
}

/** زرّ كشف/إخفاء الخيارات الإضافية. */
function ModeToggle({ lang, isSimple, onToggle }: { lang: Lang; isSimple: boolean; onToggle: () => void }) {
  const d = dashboardStrings[lang]
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-page py-3 text-sm font-bold text-ink-600 transition-colors hover:border-primary-soft hover:text-primary-c"
      aria-expanded={!isSimple}
    >
      <Icon name={isSimple ? 'ChevronDown' : 'SlidersHorizontal'} className="h-4 w-4" />
      {isSimple ? d.moreOptions : d.simplerView}
    </button>
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
      return <ProgressSnapshot lang={lang} onNavigate={onNavigate} />
    default:
      return null
  }
}

/** بطاقة هوية النظام (متقدّم فقط) — الهدف، الأيام، التقسيمة، السعرات. */
function SystemIdentity({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const d = dashboardStrings[lang]
  const p = customization.profile
  const days = customization.workoutPlan.days.length
  const split = days ? planTitle(customization.workoutPlan.templateId, lang) : undefined
  const calories = customization.nutritionPlan.targetCalories || customization.targets.targetCalories || 0
  // P10.1: تسمية الخبرة حسب اللغة الحالية مع رجوع للعربية (المصدر الأساسي).
  const expChoice = experienceChoices.find((e) => e.value === p.experienceLevel)
  const expLabel = expChoice ? (lang === 'en' ? expChoice.labelEn ?? expChoice.label : expChoice.label) : undefined

  return (
    <section className="card p-5">
      <span className="eyebrow">
        <Icon name="Sparkles" className="h-3.5 w-3.5" />
        {d.systemBuiltFromSetup}
      </span>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip icon="Target" text={goalTypeLabelI18n(p.goalType, goalTypeLabel(p.goalType), lang)} />
        {days > 0 && <Chip icon="CalendarDays" text={`${days} ${d.daysPerWeek}`} />}
        {split && <Chip icon="Dumbbell" text={split} />}
        {calories > 0 && <Chip icon="Flame" text={`${calories} ${d.caloriesPerDay}`} />}
        {expLabel && <Chip icon="TrendingUp" text={expLabel} />}
      </div>
      <button
        type="button"
        onClick={() => onNavigate('setup')}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-primary-c"
      >
        <Icon name="SlidersHorizontal" className="h-3.5 w-3.5" />
        {d.editPlan}
      </button>
    </section>
  )
}

/** بطاقة تمرين اليوم — تقود مَن هدفه bulk، أو ثانوية لغيرهم. */
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
  const d = dashboardStrings[lang]
  const planDay = todayPlanDay(customization.workoutPlan)
  const dayName = planDay ? (lang === 'en' ? planDay.nameEn : planDay.nameAr) : ''

  // خطوة عملية واحدة واضحة: تمرين اليوم إن وُجد، وإلا مراجعة الخطة/التغذية.
  const hasWorkoutToday = !!planDay
  const title = hasWorkoutToday ? `${d.startTodayPrefix}${dayName}` : d.restDayTitle
  const hint = hasWorkoutToday ? d.workoutTodayHint : d.restDayHint
  const cta = hasWorkoutToday ? d.openTodayWorkout : d.openMealPlan
  const target: AppRoute = hasWorkoutToday ? 'workout' : 'nutrition'

  return (
    <section className="card p-5">
      <span className="eyebrow">
        <Icon name="Compass" className="h-3.5 w-3.5" />
        {d.nextStep}
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
function ProgressSnapshot({ lang, onNavigate }: { lang: Lang; onNavigate: (route: AppRoute) => void }) {
  const { customization } = useCustomization()
  const d = dashboardStrings[lang]
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
          {d.yourProgress}
        </span>
        <Icon name="ChevronLeft" className="h-4 w-4 text-ink-400 rtl:rotate-180" />
      </div>

      {hasHistory ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat value={`${week.weekly.thisWeekCount}/${week.weekly.daysPerWeek}`} label={d.thisWeek} />
          <Stat value={`${week.weekly.streakWeeks}`} label={d.streakWeeks} />
          <Stat value={`${week.bestStreak}`} label={d.longestStreak} />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          {d.progressEmpty}
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
