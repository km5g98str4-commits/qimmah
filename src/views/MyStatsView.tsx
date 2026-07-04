import { useMemo } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { getMeasurementLogs, getNutritionLogs, getWorkoutSessions } from '@/lib/historyStore'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { weeklyAdherenceStreak } from '@/lib/streaks'
import { muscleGroupLabel } from '@/data/muscleGroups'
import {
  coverageBreakdown,
  linePoints,
  nutritionWeekSummary,
  percentOfTarget,
  trainingWeekSummary,
  weightDelta,
  weightSeries,
} from '@/lib/statsSummary'
import { statsScreenStrings } from '@/i18n/dict/statsScreen'
import type { Lang } from '@/lib/appPreferences'
import type { MuscleId } from '@/types/muscles'

interface MyStatsViewProps {
  lang: Lang
}

// أبعاد الرسم المصغّر (SVG محلي بلا مكتبات — سابقة البيت في ProgressView/StepCounter).
const CHART_W = 300
const CHART_H = 90

/** تنسيق تاريخ قصير محايد (يوم/شهر) من ختم YYYY-MM-DD. */
function shortDate(stamp: string): string {
  return `${stamp.slice(8, 10)}/${stamp.slice(5, 7)}`
}

/**
 * «لوحتي» (P12-C) — أرقام المستخدم من سجلّاته المحلية: ملخّص تمرين الأسبوع،
 * متوسطات التغذية مقابل الهدف، ومؤشّر الوزن. عرض محايد بلا تفسير طبي،
 * وحالات فارغة ودّية في كل قسم (لا NaN ولا فراغ).
 */
export function MyStatsView({ lang }: MyStatsViewProps) {
  const d = statsScreenStrings[lang]
  const { customization } = useCustomization()

  const stats = useMemo(() => {
    const sessions = getWorkoutSessions()
    const plan = customization.workoutPlan
    const level = customization.profile.trainingLevel
    const daysPerWeek = plan.days.length || 3

    const training = trainingWeekSummary(sessions)
    const coverage = coverageBreakdown(computeWeeklyCoverage({ sessions, plan, level }))
    const weekly = weeklyAdherenceStreak(daysPerWeek)

    const np = customization.nutritionPlan
    const targetCalories = np.targetCalories || customization.targets.targetCalories || customization.targets.maintenanceCalories || 2000
    const targetProtein = np.targetProtein || customization.targets.proteinGrams || 120
    const nutrition = nutritionWeekSummary(getNutritionLogs(), np.meals)

    const weights = weightSeries(getMeasurementLogs())

    return { training, coverage, weekly, nutrition, targetCalories, targetProtein, weights }
  }, [customization])

  return (
    <div className="overflow-x-hidden px-4 py-4" data-testid="stats-view">
      {/* الترويسة */}
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
          <Icon name="Activity" className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-black text-ink-900">{d.title}</h1>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-ink-500">{d.subtitle}</p>

      <div className="space-y-3">
        <TrainingCard lang={lang} stats={stats} />
        <NutritionCard lang={lang} stats={stats} />
        <WeightCard lang={lang} weights={stats.weights} />

        {/* تنويه محايد — بيانات محلية للعرض فقط */}
        <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {d.localNote}
        </p>
      </div>
    </div>
  )
}

type Stats = {
  training: { workouts: number; totalSets: number }
  coverage: { covered: MuscleId[]; missed: MuscleId[] }
  weekly: { streakWeeks: number; thisWeekCount: number; daysPerWeek: number }
  nutrition: { trackedDays: number; avgCalories: number; avgProtein: number }
  targetCalories: number
  targetProtein: number
  weights: { date: string; weightKg: number }[]
}

/** بطاقة ملخّص التمرين الأسبوعي — جلسات/مجموعات/سلسلة + العضلات المغطّاة والناقصة. */
function TrainingCard({ lang, stats }: { lang: Lang; stats: Stats }) {
  const d = statsScreenStrings[lang]
  const { training, coverage, weekly } = stats
  const hasTraining = training.workouts > 0 || training.totalSets > 0

  return (
    <SectionCard icon="Dumbbell" title={d.trainingTitle}>
      {hasTraining ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox testId="stats-workouts" value={`${training.workouts}`} label={d.workoutsLabel} />
            <StatBox testId="stats-sets" value={`${training.totalSets}`} label={d.setsLabel} />
            <StatBox
              testId="stats-streak"
              value={`${weekly.streakWeeks}`}
              label={`${d.streakLabel} (${d.weeksUnit})`}
            />
            <StatBox
              testId="stats-thisweek"
              value={`${weekly.thisWeekCount}/${weekly.daysPerWeek}`}
              label={`${d.thisWeekLabel} (${d.daysUnit})`}
            />
          </div>

          {/* العضلات المغطّاة مقابل الناقصة — أسماء ثنائية اللغة من قاموس العضلات */}
          <MuscleChips
            testId="stats-covered"
            label={d.coveredLabel}
            count={coverage.covered.length}
            ids={coverage.covered}
            lang={lang}
            tone="covered"
          />
          {coverage.missed.length > 0 ? (
            <MuscleChips
              testId="stats-missed"
              label={d.missedLabel}
              count={coverage.missed.length}
              ids={coverage.missed}
              lang={lang}
              tone="missed"
            />
          ) : (
            <p className="mt-3 text-[11px] text-ink-400" data-testid="stats-missed-none">
              {d.noneMissed}
            </p>
          )}
        </>
      ) : (
        <EmptyState testId="stats-training-empty" title={d.trainingEmptyTitle} body={d.trainingEmptyBody} />
      )}
    </SectionCard>
  )
}

/** بطاقة التغذية الأسبوعية — متوسط السعرات والبروتين مقابل الهدف (عرض محايد). */
function NutritionCard({ lang, stats }: { lang: Lang; stats: Stats }) {
  const d = statsScreenStrings[lang]
  const { nutrition, targetCalories, targetProtein } = stats

  if (nutrition.trackedDays === 0) {
    return (
      <SectionCard icon="Salad" title={d.nutritionTitle}>
        <EmptyState testId="stats-nutrition-empty" title={d.nutritionEmptyTitle} body={d.nutritionEmptyBody} />
      </SectionCard>
    )
  }

  return (
    <SectionCard icon="Salad" title={d.nutritionTitle}>
      <div className="mt-3 space-y-3">
        <TargetRow
          testId="stats-avg-calories"
          label={d.avgCaloriesLabel}
          value={nutrition.avgCalories}
          target={targetCalories}
          unit={d.caloriesUnit}
          d={d}
        />
        <TargetRow
          testId="stats-avg-protein"
          label={d.avgProteinLabel}
          value={nutrition.avgProtein}
          target={targetProtein}
          unit={d.gramsUnit}
          d={d}
        />
      </div>
      <p className="mt-3 text-[11px] text-ink-400" data-testid="stats-tracked-days">
        {d.trackedDaysPrefix} {nutrition.trackedDays} {d.trackedDaysSuffix}
      </p>
    </SectionCard>
  )
}

/** صفّ متوسط مقابل هدف مع شريط تقدّم — أرقام فقط، بلا حكم. */
function TargetRow({
  testId,
  label,
  value,
  target,
  unit,
  d,
}: {
  testId: string
  label: string
  value: number
  target: number
  unit: string
  d: (typeof statsScreenStrings)['ar']
}) {
  const pct = percentOfTarget(value, target)
  const barPct = pct === null ? 0 : Math.min(100, pct)
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs font-bold text-ink-500">{label}</p>
        <p className="text-sm font-black text-ink-900" data-testid={testId}>
          {value}
          <span className="text-[10px] font-bold text-ink-400"> {unit}</span>
        </p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-beige">
        <div className="h-full rounded-full bg-primary" style={{ width: `${barPct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-ink-400" data-testid={`${testId}-target`}>
        {d.targetPrefix} {target} {unit}
        {pct !== null && (
          <span data-testid={`${testId}-pct`}>
            {' '}
            · {pct}% {d.ofTargetSuffix}
          </span>
        )}
      </p>
    </div>
  )
}

/** بطاقة مؤشّر الوزن — رسم SVG مصغّر محلي + آخر قياس والتغيّر (وصف محايد). */
function WeightCard({ lang, weights }: { lang: Lang; weights: { date: string; weightKg: number }[] }) {
  const d = statsScreenStrings[lang]

  if (weights.length === 0) {
    return (
      <SectionCard icon="Scale" title={d.weightTitle}>
        <EmptyState testId="stats-weight-empty" title={d.weightEmptyTitle} body={d.weightEmptyBody} />
      </SectionCard>
    )
  }

  const latest = weights[weights.length - 1]
  const delta = weightDelta(weights)
  const values = weights.map((w) => w.weightKg)
  const pts = linePoints(values, CHART_W, CHART_H)
  const dots = pts.split(' ').map((p) => p.split(',').map(Number))

  return (
    <SectionCard icon="Scale" title={d.weightTitle}>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">{d.latestWeightLabel}</p>
          <p className="text-2xl font-black text-ink-900" data-testid="stats-weight-latest">
            {latest.weightKg}
            <span className="text-xs font-bold text-ink-400"> {d.weightUnit}</span>
          </p>
        </div>
        {delta !== null && (
          <div className="text-end">
            <p className="text-xs font-bold text-ink-500">{d.changeLabel}</p>
            <p className="text-sm font-black text-ink-900" data-testid="stats-weight-delta">
              <Icon
                name={delta > 0 ? 'TrendingUp' : delta < 0 ? 'TrendingDown' : 'Minus'}
                className="me-1 inline h-4 w-4 text-primary-c"
              />
              {delta > 0 ? '+' : ''}
              {delta} {d.weightUnit}
            </p>
          </div>
        )}
      </div>

      {weights.length >= 2 ? (
        <>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="mt-3 h-24 w-full"
            role="img"
            aria-label={d.chartAria}
            data-testid="stats-weight-chart"
            preserveAspectRatio="none"
          >
            <polyline
              points={pts}
              fill="none"
              stroke="var(--c-primary, #F26A21)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {dots.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="var(--c-primary, #F26A21)" />
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[10px] text-ink-400">
            <span>{shortDate(weights[0].date)}</span>
            <span>{shortDate(latest.date)}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-ink-400" data-testid="stats-weight-one-point">
          {d.onePointNote}
        </p>
      )}
    </SectionCard>
  )
}

// ————————————————————————————————————————————————————————————————
// لبنات عرض صغيرة
// ————————————————————————————————————————————————————————————————

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4 text-primary-c" />
        <h2 className="text-sm font-black text-ink-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function StatBox({ testId, value, label }: { testId: string; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-page p-3 text-center">
      <p className="text-lg font-black text-ink-900" data-testid={testId}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-ink-400">{label}</p>
    </div>
  )
}

const MAX_CHIPS = 8

/** شرائح أسماء العضلات — عدد + أول ٨ أسماء بلغة الواجهة، والباقي «+N». */
function MuscleChips({
  testId,
  label,
  count,
  ids,
  lang,
  tone,
}: {
  testId: string
  label: string
  count: number
  ids: MuscleId[]
  lang: Lang
  tone: 'covered' | 'missed'
}) {
  const shown = ids.slice(0, MAX_CHIPS)
  const rest = ids.length - shown.length
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold text-ink-500">
        {label} · <span data-testid={testId}>{count}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid={`${testId}-list`}>
        {shown.map((id) => (
          <span
            key={id}
            className={
              tone === 'covered'
                ? 'rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary-c'
                : 'rounded-full border border-line bg-beige px-2.5 py-1 text-[11px] font-bold text-ink-500'
            }
          >
            {muscleGroupLabel(id, lang)}
          </span>
        ))}
        {rest > 0 && <span className="rounded-full bg-page px-2.5 py-1 text-[11px] font-bold text-ink-400">+{rest}</span>}
      </div>
    </div>
  )
}

function EmptyState({ testId, title, body }: { testId: string; title: string; body: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-line bg-page p-4 text-center" data-testid={testId}>
      <p className="text-xs font-bold text-ink-700">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{body}</p>
    </div>
  )
}
