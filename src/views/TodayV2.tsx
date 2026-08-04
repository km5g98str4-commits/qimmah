import { useMemo } from 'react'
import type { QuickLogTarget } from '@/components/MobileShell'
import { Icon } from '@/components/Icon'
import { MinorGoalNotice } from '@/components/MinorGoalNotice'
import { V2_TODAY } from '@/design-system/v2/labels'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { cn } from '@/lib/cn'
import { useCustomization } from '@/lib/customizationContext'
import { buildWeeklyInsights } from '@/lib/insights'
import { InsightCardsView } from '@/lib/insights/InsightCardsView'
import { loadLogs } from '@/lib/measurementLog'
import { buildNutritionV2Model } from '@/lib/nutritionV2Model'
import { getDayStamp } from '@/lib/today'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { playHaptic } from '@/lib/nativeFeedback'
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

        <section aria-labelledby="today-remaining-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="today-remaining-title" className="text-base font-black">{copy.remainingTitle}</h2>
            <span className="text-xs font-bold text-ink-500">{copy.remainingCount(pending.length)}</span>
          </div>

          {pending.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {pending.map((action, index) => (
                <ActionCard key={action.key} action={action} featured={index === 0} lang={lang} />
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

function ActionCard({ action, featured, lang }: { action: TodayAction; featured: boolean; lang: Lang }) {
  const ar = lang !== 'en'
  const color = ACTION_TONE[action.tone]
  return (
    <button
      type="button"
      onClick={() => { void playHaptic('selection'); action.onClick() }}
      className={cn(
        'v2-pressable relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-3xl border p-4 text-start shadow-card',
        featured ? 'col-span-2 bg-ink-900 text-white' : 'bg-surface text-ink-900',
      )}
      style={{ borderColor: featured ? 'transparent' : `color-mix(in srgb, ${color} 24%, rgb(var(--c-line)))` }}
    >
      <span
        className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full opacity-20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className="relative grid h-11 w-11 place-items-center rounded-2xl"
        style={{
          backgroundColor: featured ? 'rgb(255 255 255 / 0.12)' : `color-mix(in srgb, ${color} 14%, transparent)`,
          color: featured ? 'white' : color,
        }}
      >
        <Icon name={action.icon} className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="relative mt-4 block text-lg font-black leading-tight">{action.title}</span>
      <span className={cn('relative mt-1 block text-xs leading-relaxed', featured ? 'text-white/70' : 'text-ink-500')}>
        {action.body}
      </span>
      <span className="relative mt-auto flex items-center gap-1 pt-4 text-xs font-black" style={{ color: featured ? 'white' : color }}>
        {action.cta}
        <Icon name={ar ? 'ChevronLeft' : 'ChevronRight'} className="h-4 w-4" />
      </span>
    </button>
  )
}
