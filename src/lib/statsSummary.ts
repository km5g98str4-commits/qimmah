// ملخّصات «لوحتي» (P12-C) — تجميعات نقيّة فوق سجلّات المتجر التاريخي المحلي.
//
// كل الدوال هنا نقيّة (تستقبل البيانات ولا تقرأ التخزين بنفسها) حتى تسهل
// قراءتها واختبارها. القراءة الفعلية من historyStore تتم في MyStatsView.
// أرقام وعرض محايد فقط — لا تفسير طبي ولا توصيات صحية.

import type { WorkoutSession, SessionExercise } from './workoutSessions'
import type { NutritionLog } from './historyStore'
import type { MeasurementLog } from '@/types/progress'
import type { PlanMeal } from '@/types/nutrition'
import type { MuscleId, WeeklyCoverageResult } from '@/types/muscles'

const DAY_MS = 24 * 3600_000
const WEEK_MS = 7 * DAY_MS

/** ختم اليوم المحلي (YYYY-MM-DD). */
function dayStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** أفضل ختم زمني للجلسة (انتهاء ← بدء ← ظهر اليوم) — نفس منطق muscleCoverage. */
function sessionTime(s: WorkoutSession): string {
  return s.finishedAt ?? s.startedAt ?? `${s.date}T12:00:00`
}

/** عدد المجموعات المنجزة في تمرين واحد (مع توافق البيانات القديمة بلا sets مفصّلة). */
function completedSetCount(ex: SessionExercise): number {
  if (ex.sets && ex.sets.length) return ex.sets.filter((st) => st.completed).length
  if (ex.completed) return ex.targetSets || 0
  return 0
}

// ————————————————————————————————————————————————————————————————
// ١) ملخّص التمرين الأسبوعي
// ————————————————————————————————————————————————————————————————

export interface TrainingWeekSummary {
  /** جلسات مكتملة (لها finishedAt) خلال آخر ٧ أيام. */
  workouts: number
  /** مجموع المجموعات المنجزة في تلك الجلسات. */
  totalSets: number
}

/**
 * ملخّص تمرين آخر ٧ أيام — نافذة متدحرجة (٧×٢٤ ساعة) مطابقة لنافذة
 * computeWeeklyCoverage حتى تتسق أرقام الجلسات مع تغطية العضلات على نفس الشاشة.
 */
export function trainingWeekSummary(sessions: WorkoutSession[], now: Date = new Date()): TrainingWeekSummary {
  const end = now.getTime()
  const start = end - WEEK_MS
  let workouts = 0
  let totalSets = 0
  sessions.forEach((s) => {
    const t = new Date(sessionTime(s)).getTime()
    if (Number.isNaN(t) || t < start || t > end) return
    if (!s.finishedAt) return
    workouts += 1
    s.exercises.forEach((ex) => {
      totalSets += completedSetCount(ex)
    })
  })
  return { workouts, totalSets }
}

/** تفكيك نتيجة التغطية الأسبوعية إلى «مغطّاة» (لها مجموعات) و«ناقصة» (من الخطة بلا مجموعات). */
export function coverageBreakdown(result: WeeklyCoverageResult): { covered: MuscleId[]; missed: MuscleId[] } {
  const covered = Object.values(result.weeklyCoverage)
    .filter((c) => c.sets > 0)
    .map((c) => c.muscleId)
  return { covered, missed: result.missingMuscles }
}

// ————————————————————————————————————————————————————————————————
// ٢) ملخّص التغذية الأسبوعي
// ————————————————————————————————————————————————————————————————

export interface NutritionWeekSummary {
  /** أيام آخر ٧ أيام التي سُجّلت فيها وجبة واحدة على الأقل من وجبات الخطة. */
  trackedDays: number
  /** متوسط السعرات اليومي عبر الأيام المسجّلة فقط (٠ إن لم تُسجَّل أيام). */
  avgCalories: number
  /** متوسط البروتين اليومي (غ) عبر الأيام المسجّلة فقط. */
  avgProtein: number
}

/**
 * متوسطات التغذية لآخر ٧ أيام من سجلّات historyStore (nutritionLogs).
 * سعرات/بروتين اليوم تُشتق من وجبات الخطة النشطة المعلَّمة «منجزة» في ذلك اليوم
 * (doneMeals بمعرّف الوجبة) — هذا هو الأثر التاريخي الوحيد المتاح محليًا.
 * المتوسط يُقسَم على الأيام المسجّلة فقط حتى لا تسحبه أيام بلا تسجيل نحو الصفر.
 */
export function nutritionWeekSummary(
  logs: Record<string, NutritionLog>,
  planMeals: PlanMeal[],
  now: Date = new Date(),
): NutritionWeekSummary {
  const mealById = new Map(planMeals.map((m) => [m.id, m]))
  let trackedDays = 0
  let calories = 0
  let protein = 0

  for (let i = 0; i < 7; i++) {
    const stamp = dayStamp(new Date(now.getTime() - i * DAY_MS))
    const log = logs[stamp]
    if (!log) continue
    let dayCalories = 0
    let dayProtein = 0
    let any = false
    Object.entries(log.doneMeals ?? {}).forEach(([mealId, done]) => {
      if (!done) return
      const meal = mealById.get(mealId)
      if (!meal) return
      any = true
      dayCalories += meal.calories || 0
      dayProtein += meal.protein || 0
    })
    // أطعمة مُسجّلة يدويًا (تشمل الأطباق السعودية) — تُضاف لسعرات/بروتين اليوم فتظهر في المتوسط.
    if (log.loggedFood && (log.loggedFood.calories > 0 || log.loggedFood.protein > 0)) {
      any = true
      dayCalories += log.loggedFood.calories || 0
      dayProtein += log.loggedFood.protein || 0
    }
    if (!any) continue
    trackedDays += 1
    calories += dayCalories
    protein += dayProtein
  }

  return {
    trackedDays,
    avgCalories: trackedDays ? Math.round(calories / trackedDays) : 0,
    avgProtein: trackedDays ? Math.round(protein / trackedDays) : 0,
  }
}

/** نسبة المتوسط من الهدف (٪، مقرّبة ومحدودة 0–999). null إن كان الهدف غير صالح. */
export function percentOfTarget(avg: number, target: number): number | null {
  if (!Number.isFinite(avg) || !Number.isFinite(target) || target <= 0) return null
  return Math.max(0, Math.min(999, Math.round((avg / target) * 100)))
}

// ————————————————————————————————————————————————————————————————
// ٣) سلسلة الوزن (للرسم المصغّر)
// ————————————————————————————————————————————————————————————————

export interface WeightPoint {
  date: string
  weightKg: number
}

/** يستخرج رقمًا من قيمة قياس (قد تكون نصًا مثل "81.5 كجم"). */
function numOf(v: string | number | undefined): number {
  if (typeof v === 'number') return v
  if (v === undefined || v === null) return NaN
  const m = String(v).match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

/**
 * سلسلة الوزن من سجلّات القياس — قيمة واحدة لكل يوم (الأحدث تفوز)،
 * مرتّبة تصاعديًا بالتاريخ، بحد أقصى maxPoints نقطة (الأحدث).
 */
export function weightSeries(logs: MeasurementLog[], maxPoints = 12): WeightPoint[] {
  const byDate = new Map<string, number>()
  // السجلّ محفوظ «الأحدث أولًا» — نمشي من الأقدم للأحدث حتى تفوز أحدث قيمة لليوم.
  ;[...logs].reverse().forEach((l) => {
    const w = numOf(l?.values?.weightKg)
    if (!l?.date || !Number.isFinite(w) || w <= 0) return
    byDate.set(l.date, w)
  })
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-maxPoints)
    .map(([date, weightKg]) => ({ date, weightKg }))
}

/** فرق الوزن بين أول وآخر نقطة (كجم، بمنزلة عشرية واحدة). null لأقل من نقطتين. */
export function weightDelta(series: WeightPoint[]): number | null {
  if (series.length < 2) return null
  const d = series[series.length - 1].weightKg - series[0].weightKg
  return Math.round(d * 10) / 10
}

/**
 * نقاط polyline لرسم SVG محلي خفيف (بلا مكتبات) — يوزّع القيم أفقيًا بالتساوي
 * ويطبّع عموديًا على مدى القيم (مع هامش حتى لا يلتصق الخط بالحواف).
 */
export function linePoints(values: number[], width: number, height: number, pad = 6): string {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return values
    .map((v, i) => {
      const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * innerW
      // مدى صفري (كل القيم متساوية) → خط أفقي في المنتصف.
      const y = span === 0 ? height / 2 : pad + (1 - (v - min) / span) * innerH
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    .join(' ')
}
