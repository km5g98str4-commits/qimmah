import { useEffect, useMemo } from 'react'
import type { QuickLogTarget } from '@/components/MobileShell'
import { Icon } from '@/components/Icon'
import { MinorGoalNotice } from '@/components/MinorGoalNotice'
import { V2_TODAY } from '@/design-system/v2/labels'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { buildWeeklyInsights } from '@/lib/insights'
import { InsightCardsView } from '@/lib/insights/InsightCardsView'
import { loadLogs } from '@/lib/measurementLog'
import { buildNutritionV2Model } from '@/lib/nutritionV2Model'
import { getDayStamp } from '@/lib/today'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { playHaptic } from '@/lib/nativeFeedback'
import { trackLocal } from '@/lib/tracking'
import { FirstWinCard } from '@/components/today/FirstWinCard'
import { loadFirstWin, suggestFirstWin } from '@/lib/firstWin'
import { hasEventToday } from '@/lib/tracking/signals'
import { useAchievementsEngine } from '@/features/achievements/useAchievements'

interface TodayV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
  onQuickLog?: (target: QuickLogTarget) => void
}

type ActionKey = 'workout' | 'meal' | 'water' | 'progress'

interface TodayAction {
  key: ActionKey
  title: string
  body: string
  cta: string
  icon: string
  tone: 'ember' | 'green' | 'blue' | 'violet'
  done: boolean
  onClick: () => void
}

const ACTION_TONE: Record<TodayAction['tone'], string> = {
  ember: 'var(--v2-pillar-train)',
  green: 'var(--v2-green-text)',
  blue: 'var(--v2-pillar-move)',
  violet: 'var(--v2-pillar-recover)',
}

/**
 * ألوان حلقات الماكروز — سعرات أزرق · كارب كهرماني · بروتين أخضر · دهون بنفسجي.
 * الدهون لا نظير لها في التوكنز (`--v2-pillar-recover` فيروزي = لون التعافي)،
 * فلها لون مسمّى هنا حتى لا تتكرّر دلالة الفيروزي على سطحين مختلفين.
 */
const MACRO_TONE = {
  calories: 'var(--v2-pillar-move)',
  carbs: '#e0941f',
  protein: 'var(--v2-green-text)',
  fat: '#8b8fd6',
} as const

/**
 * الصفحة الرئيسية هي مركز تنفيذ سريع: أربع مهام مفهومة، مرتبة حسب ما بقي فعلًا.
 * المهمة المنجزة لا تختفي؛ تنكمش تحت «تم اليوم» حتى يظل الوصول إليها مباشرًا.
 */
export function TodayV2({ lang, onNavigate, onQuickLog }: TodayV2Props) {
  const { customization } = useCustomization()
  // الرئيسية هي السطح الحيّ الدائم — تركيب محرّك الأوسمة هنا يُعيد وصله ببيانات
  // المستخدم الحقيقية (بروتين اليوم/الهدف/أيام الخطة). بلا هذا يبقى المحرّك
  // معزولًا وتصير أوسمة البروتين غير قابلة للفتح. لا أثر بصري.
  useAchievementsEngine()
  const ar = lang !== 'en'
  const copy = V2_TODAY[ar ? 'ar' : 'en']
  const model = useMemo(() => buildTodayV2Model(customization, lang), [customization, lang])
  const nutrition = useMemo(() => buildNutritionV2Model(customization, lang), [customization, lang])
  const todayWeightLogged = loadLogs().some(
    (log) => log.date === getDayStamp() && log.values.weightKg !== undefined && log.values.weightKg !== '',
  )
  // [CTO-68] الحدث ١٣ — عودة بعد يوم فائت: أول عرض لحالة «العودة بعد انقطاع».
  // مرّة واحدة في اليوم لا مرّة في كل تركيب: الشاشة تُركَّب مع كل رجوع لتبويب اليوم،
  // والمقصود عودةُ المستخدم لا عددُ زياراته للتبويب. المخزن نفسه هو دفتر منع التكرار.
  useEffect(() => {
    if (model.state !== 'returnAfterBreak') return
    if (hasEventToday('return_after_missed_day')) return
    trackLocal('return_after_missed_day', { daysAway: model.daysSinceLastWorkout ?? 0 })
  }, [model.state, model.daysSinceLastWorkout])

  // [CTO-70] البند ١ — أول انتصار. يُعرض للقادم الجديد حتى يُنجزه، ثم يبقى معلَّمًا
  // «تم» بقية اليوم. `nutrition`/`model` في التبعيات لأن الإنجاز يقع في سطح آخر
  // (تسجيل ماء/وجبة/بدء تمرين) فتُعاد القراءة عند أول عودة للوحة.
  const firstWin = useMemo(
    () => loadFirstWin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrition.calories.consumed, nutrition.water.consumedMl, model.state],
  )
  const firstWinSuggestion = useMemo(() => suggestFirstWin(), [])
  // البطاقة ترحيبية لا دائمة: تُعرض للقادم الجديد ما دام لم يُنجز، وتبقى معلَّمة «تم»
  // بقيّة يوم الإنجاز وحده ثم تختفي. من لديه تاريخ فعلي ليس قادمًا جديدًا فلا تُلاحقه.
  const firstWinDoneToday = firstWin.completed && !!firstWin.at && getDayStamp(new Date(firstWin.at)) === getDayStamp()
  const showFirstWin = (!firstWin.completed && model.state === 'newUser') || firstWinDoneToday

  const trainPillar = model.pillars.find((pillar) => pillar.key === 'train')
  const workoutDone = trainPillar?.state === 'done'
  const mealDone = nutrition.calories.target > 0 && nutrition.calories.consumed >= nutrition.calories.target
  const waterDone = nutrition.water.targetMl > 0 && nutrition.water.consumedMl >= nutrition.water.targetMl
  const hasMeal = nutrition.meals.some((meal) => meal.logged)

  const quick = (target: QuickLogTarget, fallback: AppRoute) => {
    if (onQuickLog) onQuickLog(target)
    else onNavigate(fallback)
  }

  const actions: TodayAction[] = [
    {
      key: 'workout',
      title: copy.workout,
      body: model.hero.destination === 'workout' ? model.hero.subtitle : copy.workoutFallback,
      cta: trainPillar?.state === 'active' ? copy.workoutContinue : copy.workoutCta,
      icon: 'Dumbbell',
      tone: 'ember',
      done: workoutDone,
      onClick: () => onNavigate('workout'),
    },
    {
      key: 'meal',
      title: hasMeal ? copy.meal : copy.firstMeal,
      body: nutrition.calories.target > 0
        ? copy.calories(nutrition.calories.consumed, nutrition.calories.target)
        : copy.mealFallback,
      cta: copy.mealCta,
      icon: 'Utensils',
      tone: 'green',
      done: mealDone,
      onClick: () => quick('meal', 'nutrition'),
    },
    {
      key: 'water',
      title: copy.water,
      body: nutrition.water.targetMl > 0
        ? copy.waterAmount(nutrition.water.consumedMl, nutrition.water.targetMl)
        : copy.waterFallback,
      cta: copy.waterCta,
      icon: 'Droplets',
      tone: 'blue',
      done: waterDone,
      onClick: () => quick('water', 'nutrition'),
    },
    {
      key: 'progress',
      title: copy.progress,
      body: copy.progressBody,
      cta: copy.progressCta,
      icon: 'TrendingUp',
      tone: 'violet',
      done: todayWeightLogged,
      onClick: () => onNavigate('progress'),
    },
  ]

  const pending = actions.filter((action) => !action.done)
  const completed = actions.filter((action) => action.done)
  const insights = buildWeeklyInsights(ar ? 'ar' : 'en')

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-4 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <header>
          <p className="text-xs font-bold text-ink-500">{model.dateLabel}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{model.greeting}</h2>
        </header>

        <MinorGoalNotice lang={lang} />

        {/* [CTO-70] البند ١ — أول انتصار: أعلى الشاشة لأنه أول ما يجب أن يُرى. */}
        {showFirstWin && (
          <FirstWinCard
            lang={lang}
            suggestion={firstWinSuggestion}
            done={firstWin.completed}
            doneKind={firstWin.kind}
            onPick={(kind) => {
              // الضغطة توصّل للسطح الحيّ؛ الإنجاز يُسجَّل عند وقوع الفعل هناك.
              if (kind === 'warmup') onNavigate('workout')
              else if (kind === 'water') quick('water', 'nutrition')
              else quick('meal', 'nutrition')
            }}
          />
        )}

        {/* ماكروز اليوم — حلّت محلّ البطاقة البارزة. تلك كانت `bg-ink-900`، وهو
            لون ينقلب فاتحًا في السمة الداكنة فيظهر مربعًا أبيض يضرب الخلفية.
            والمحتوى هنا أنفع: أرقام اليوم مباشرةً بدل تكرار زرّ التمرين. */}
        <section aria-labelledby="today-macros-title" className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today-macros-title" className="flex items-center gap-2 text-base font-black">
              <Icon name="Flame" className="h-5 w-5" style={{ color: MACRO_TONE.calories }} />
              {copy.macrosTitle}
            </h2>
            <button
              type="button"
              onClick={() => { void playHaptic('selection'); onNavigate('nutrition') }}
              className="v2-pressable flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-ink-900"
            >
              {copy.macrosLink}
              <Icon name="Sparkles" className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-1 text-sm font-black text-ink-500">
            {nutrition.calories.target > 0
              ? copy.macroCaloriesLine(nutrition.calories.consumed, nutrition.calories.target)
              : copy.macroNoTarget}
          </p>

          {/* أربع حلقات: المستهلَك داخل الحلقة، والمتبقّي تحتها. */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <MacroRing label={copy.macroCaloriesLabel} consumed={nutrition.calories.consumed} target={nutrition.calories.target} color={MACRO_TONE.calories} remainingLabel={copy.macroRemaining} />
            <MacroRing label={`${copy.macroCarbs}${copy.macroGrams}`} consumed={nutrition.macros.carbs.consumed} target={nutrition.macros.carbs.target} color={MACRO_TONE.carbs} remainingLabel={copy.macroRemaining} />
            <MacroRing label={`${copy.macroProtein}${copy.macroGrams}`} consumed={nutrition.macros.protein.consumed} target={nutrition.macros.protein.target} color={MACRO_TONE.protein} remainingLabel={copy.macroRemaining} />
            <MacroRing label={`${copy.macroFat}${copy.macroGrams}`} consumed={nutrition.macros.fat.consumed} target={nutrition.macros.fat.target} color={MACRO_TONE.fat} remainingLabel={copy.macroRemaining} />
          </div>
        </section>

        <section aria-labelledby="today-remaining-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="today-remaining-title" className="text-base font-black">{copy.remainingTitle}</h2>
            <span className="text-xs font-bold text-ink-500">{copy.remainingCount(pending.length)}</span>
          </div>

          {pending.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {/* كل المهام مربّعات صغيرة متساوية — بما فيها التمرين. لا بطاقة بارزة. */}
              {pending.map((action) => (
                <ActionCard key={action.key} action={action} lang={lang} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-[color:var(--v2-green-text)]">
                <Icon name="Check" className="h-5 w-5" strokeWidth={3} />
              </span>
              <h3 className="mt-4 text-lg font-black">{copy.allDoneTitle}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{copy.allDoneBody}</p>
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section aria-labelledby="today-completed-title">
            <h2 id="today-completed-title" className="mb-2 text-sm font-black text-ink-700">{copy.completedTitle}</h2>
            <div className="space-y-2">
              {completed.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => { void playHaptic('selection'); action.onClick() }}
                  className="v2-pressable flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-start"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-[color:var(--v2-green-text)]">
                    <Icon name="Check" className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-black">{action.title}</span>
                  <span className="text-xs font-bold text-[color:var(--v2-green-text)]">{copy.completed}</span>
                  <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4 text-ink-400" />
                </button>
              ))}
            </div>
          </section>
        )}

        <InsightCardsView
          cards={insights.cards}
          lang={ar ? 'ar' : 'en'}
          onNavigate={onNavigate}
          title={copy.weeklyTitle}
          max={1}
        />

        {model.trustNote && (
          <p className="px-2 text-center text-[0.7rem] leading-relaxed text-ink-400">{model.trustNote}</p>
        )}
      </div>
    </div>
  )
}

function ActionCard({ action, lang }: { action: TodayAction; lang: Lang }) {
  const ar = lang !== 'en'
  const color = ACTION_TONE[action.tone]
  return (
    <button
      type="button"
      onClick={() => { void playHaptic('selection'); action.onClick() }}
      className="v2-pressable relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-3xl border bg-surface p-4 text-start text-ink-900 shadow-card"
      style={{ borderColor: `color-mix(in srgb, ${color} 24%, rgb(var(--c-line)))` }}
    >
      <span
        className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full opacity-20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className="relative grid h-11 w-11 place-items-center rounded-2xl"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <Icon name={action.icon} className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="relative mt-4 block text-lg font-black leading-tight">{action.title}</span>
      <span className="relative mt-1 block text-xs leading-relaxed text-ink-500">{action.body}</span>
      <span className="relative mt-auto flex items-center gap-1 pt-4 text-xs font-black" style={{ color }}>
        {action.cta}
        <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4" />
      </span>
    </button>
  )
}

/**
 * حلقة ماكرو واحدة — التسمية والمستهلَك داخل الحلقة، والمتبقّي تحتها.
 * بلا هدف مضبوط نعرض «—» بدل رقم مخترَع (§5: الصدق قبل الطمأنينة).
 */
function MacroRing({
  label,
  consumed,
  target,
  color,
  remainingLabel,
}: { label: string; consumed: number; target: number; color: string; remainingLabel: string }) {
  const hasTarget = target > 0
  const pct = hasTarget ? Math.min(1, consumed / target) : 0
  const remaining = Math.max(0, Math.round(target - consumed))
  const r = 16
  const c = 2 * Math.PI * r
  const dash = pct * c
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[4.25rem] w-[4.25rem]">
        <svg
          viewBox="0 0 40 40"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`${label}: ${Math.round(consumed)}${hasTarget ? ` / ${Math.round(target)}` : ''}`}
        >
          <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-line" />
          {hasTarget && pct > 0 && (
            <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
          )}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[0.55rem] font-bold leading-none text-ink-500">{label}</span>
          <span dir="ltr" className="text-base font-black leading-none tabular-nums text-ink-900">
            {Math.round(consumed)}
          </span>
        </span>
      </div>
      <span dir="ltr" className="text-xs font-bold tabular-nums text-ink-700">
        {hasTarget ? remaining.toLocaleString('en-US') : '—'}
      </span>
      <span className="text-[0.6rem] leading-none text-ink-400">{remainingLabel}</span>
    </div>
  )
}
