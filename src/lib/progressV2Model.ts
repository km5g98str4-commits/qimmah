// Progress v2 model — Qimmah Design v2.1 (Slice 6, PDF §05). A coach-style
// "Brief" over the last 14 days, read-only and HONEST. Wired to the REAL local
// stores the app actually writes to:
//   • weight / waist / body-fat  → measurementLog (loadLogs)
//   • strength & momentum        → workout sessions (loadSessions) + exercise history
//   • adherence                  → finished-session dates vs the plan's days/week
// Data over two weeks is a SIGNAL, not a verdict — so every read is hedged:
// «يبدو أنك…», «تقديري», «~», «يحتاج قياس جديد». We never invent weight loss,
// PRs, body-fat, or steps; where there is no data we say so and offer the action.

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { loadLogs } from '@/lib/measurementLog'
import { loadSessions } from '@/lib/workoutSessions'
import { loadHistory } from '@/lib/exerciseHistory'
import { recentVolumes } from '@/lib/progressStats'
import { getExercise } from '@/data/exercises'
import { getDayStamp } from '@/lib/today'

const DAY_MS = 86_400_000
const WINDOW_DAYS = 14
const WAIST_STALE_DAYS = 7

export type NavDest = 'progress' | 'nutrition' | 'workout' | 'setup'
export type RowTone = 'good' | 'neutral' | 'needsData'
export type LiftStatus = 'pr' | 'up' | 'stable'
export type ProgressScreen = 'home' | 'weight' | 'strength' | 'log'

/** One row of the «ملخّص آخر ١٤ يوم» Brief. */
export interface SummaryRow {
  key: 'weight' | 'strength' | 'adherence'
  icon: string
  /** Lead text, e.g. «الوزن نزل». */
  text: string
  /** Emphasised value, e.g. «0.8 كجم» (empty when needs-data). */
  value: string
  /** Right-aligned status tag, e.g. «تقدّم جيد». */
  tag: string
  tone: RowTone
}

/** A "stale / missing measurement" nudge (waist). */
export interface StaleNudge {
  show: boolean
  /** Short form for the Brief home. */
  text: string
  /** Long form (with days) for the weight detail. */
  detailText: string
  actionLabel: string
  destination: NavDest
}

export interface WeightPoint { date: string; kg: number }
export interface MomentumPoint { date: string; value: number }

export interface WeightDetail {
  currentKg: number | null
  targetKg: number | null
  /** Signed change over the window (negative = down). */
  changeKg: number | null
  /** Goal band [target − 1, target + 1] («نطاق الهدف»). */
  band: [number, number] | null
  /** Dated weight series (ascending) — real logged points only. */
  series: WeightPoint[]
  /** Body fat %, real only (logged bodyFatPercent) — always shown as «~ · تقديري». */
  bodyFatPct: number | null
  waistCm: number | null
  waistChangeCm: number | null
  source: 'real' | 'profileOnly' | 'missing'
}

export interface LiftLadder {
  exerciseId: string
  name: string
  bestKg: number
  status: LiftStatus
  /** For 'up': kg gained vs the previous session. */
  deltaKg: number | null
  /** 0..6 filled blocks = logged sessions for this lift (capped). */
  filledBlocks: number
}

export interface StrengthDetail {
  improvedCount: number
  /** «يبدو أن قوّتك تتحسّن باطّراد» when improving, hedged prompt otherwise. */
  headline: string
  lifts: LiftLadder[]
  hasData: boolean
}

export interface ProgressV2Model {
  goal: CalorieGoal | null
  goalLabel: string | null
  period: { label: string }
  /** Hedged Brief header — never the unhedged «أنت في المسار الصحيح». */
  headline: string
  summary: SummaryRow[]
  stale: StaleNudge
  momentum: { series: MomentumPoint[]; weeks: number; hasData: boolean; label: string }
  weight: WeightDetail
  strength: StrengthDetail
  disclaimer: string
}

const GOAL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }

const numOf = (v: string | number | undefined): number => {
  if (v === undefined) return NaN
  const m = String(v).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}
const round1 = (n: number): number => Math.round(n * 10) / 10
const stampMs = (stamp: string): number => new Date(`${stamp}T00:00:00`).getTime()
const daysAgo = (stamp: string, now: number): number => Math.max(0, Math.floor((now - stampMs(stamp)) / DAY_MS))

/** Dated values for a measurement type, ascending, real only. */
function measurementSeries(typeId: string): { date: string; value: number }[] {
  return loadLogs()
    .filter((l) => l.values[typeId] !== undefined && l.values[typeId] !== '')
    .map((l) => ({ date: l.date, value: numOf(l.values[typeId]) }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => stampMs(a.date) - stampMs(b.date))
}

/** Top completed weight for one exercise inside one session (0 if none). */
function topWeightInSession(exercises: { exerciseId: string; sets?: { weightKg?: string; completed?: boolean }[] }[], exId: string): number {
  let top = 0
  for (const ex of exercises) {
    if (ex.exerciseId !== exId || !ex.sets) continue
    for (const st of ex.sets) {
      if (st.completed) top = Math.max(top, numOf(st.weightKg) || 0)
    }
  }
  return top
}

export function buildProgressV2Model(customization: Customization, lang: Lang): ProgressV2Model {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const now = stampMs(getDayStamp()) + DAY_MS - 1 // end of today (local)
  const windowStart = now - WINDOW_DAYS * DAY_MS
  const goal = customization.profile.goal ?? null

  // ── Weight (real dated series + profile fallback) ───────────────────────────
  const weightSeries = measurementSeries('weightKg')
  const profileWeight = customization.profile.weightKg || null
  const targetKg = customization.profile.targetWeightKg || null
  const loggedCurrent = weightSeries.length ? weightSeries[weightSeries.length - 1].value : null
  const currentKg = loggedCurrent ?? profileWeight
  const windowWeights = weightSeries.filter((p) => stampMs(p.date) >= windowStart)
  const changeKg =
    windowWeights.length >= 2 ? round1(windowWeights[windowWeights.length - 1].value - windowWeights[0].value) : null

  // ── Waist (stale detection) ─────────────────────────────────────────────────
  const waistSeries = measurementSeries('waistCm')
  const latestWaist = waistSeries.length ? waistSeries[waistSeries.length - 1] : null
  const waistCm = latestWaist ? latestWaist.value : null
  const waistChangeCm =
    waistSeries.length >= 2 ? round1(waistSeries[waistSeries.length - 1].value - waistSeries[waistSeries.length - 2].value) : null
  const waistAge = latestWaist ? daysAgo(latestWaist.date, now) : null
  const waistStale = waistAge !== null && waistAge > WAIST_STALE_DAYS
  const waistMissing = latestWaist === null
  const stale: StaleNudge = {
    show: waistStale || waistMissing,
    text: waistMissing ? t('ما فيه قياس خصر لسا', 'No waist measurement yet') : t('قياس الخصر قديم — يحتاج قياس جديد', 'Waist reading is old — needs a fresh one'),
    detailText: waistMissing
      ? t('سجّل قياس الخصر عشان تكون القراءة أدق', 'Log a waist measurement for a sharper read')
      : t(`آخر قياس للخصر قبل ${waistAge} ${ar ? 'أيام' : 'days'} — يحتاج قياس جديد`, `Last waist measurement ${waistAge} days ago — needs a fresh one`),
    actionLabel: t('قِس', 'Measure'),
    destination: 'progress',
  }

  // ── Body fat (real only, always estimated) ──────────────────────────────────
  const fatSeries = measurementSeries('bodyFatPercent')
  const bodyFatPct = fatSeries.length ? fatSeries[fatSeries.length - 1].value : null

  // ── Sessions → strength ladders + momentum + adherence ──────────────────────
  const finished = loadSessions().filter((s) => s.finishedAt)
  const history = loadHistory()

  // Per-lift ladders (top lifts by best weight).
  const exIds = Array.from(new Set(finished.flatMap((s) => s.exercises.map((e) => e.exerciseId)))).filter(Boolean)
  const ladders: LiftLadder[] = []
  let improvedCount = 0
  for (const exId of exIds) {
    const tops = finished
      .filter((s) => s.exercises.some((e) => e.exerciseId === exId))
      .sort((a, b) => stampMs(a.date) - stampMs(b.date))
      .map((s) => topWeightInSession(s.exercises, exId))
      .filter((w) => w > 0)
    if (tops.length === 0) continue
    const latest = tops[tops.length - 1]
    const prev = tops.length >= 2 ? tops[tops.length - 2] : null
    const best = Math.max(numOf(history[exId]?.bestWeight) || 0, ...tops)
    let status: LiftStatus = 'stable'
    let deltaKg: number | null = null
    if (prev !== null && latest > prev) {
      status = 'up'
      deltaKg = round1(latest - prev)
      improvedCount++
    } else if (latest >= best && (prev === null || latest > tops[0])) {
      status = 'pr'
      if (prev !== null) improvedCount++
    }
    const ex = getExercise(exId)
    ladders.push({
      exerciseId: exId,
      name: ex ? (ar ? ex.nameAr : ex.nameEn) : exId,
      bestKg: best,
      status,
      deltaKg,
      filledBlocks: Math.min(6, tops.length),
    })
  }
  ladders.sort((a, b) => b.bestKg - a.bestKg)
  const topLadders = ladders.slice(0, 4)
  const strength: StrengthDetail = {
    improvedCount,
    headline: improvedCount > 0
      ? t('شكله قوّتك تتحسّن بثبات', 'Your strength looks like it’s trending up')
      : ladders.length > 0
        ? t('شكله قوّتك ثابتة — واصل', 'Your strength looks steady — keep going')
        : t('خلّص تمرينين ونقدر نقرأ تطوّر قوّتك', 'Complete two workouts to read your strength'),
    lifts: topLadders,
    hasData: ladders.length > 0,
  }

  // Momentum (real session volumes, oldest→newest).
  const volumes = recentVolumes(8)
  const momentum = {
    series: volumes.map((v) => ({ date: v.date, value: v.volume })),
    weeks: volumes.length,
    hasData: volumes.some((v) => v.volume > 0),
    label: t('زخم التدريب', 'Training momentum'),
  }

  // Source classification: NON-STANDARD two-week product KPI (distinct finished days / 2× weekly plan).
  // Adherence over the window (distinct finished-workout days vs plan target).
  const daysPerWeek = customization.workoutPlan.days.length || 3
  const workoutDays = new Set(finished.filter((s) => stampMs(s.date) >= windowStart).map((s) => s.date))
  const expectedDays = Math.max(1, daysPerWeek * 2)
  const adherencePct = finished.length > 0 ? Math.min(100, Math.round((workoutDays.size / expectedDays) * 100)) : null

  // ── Brief summary rows ──────────────────────────────────────────────────────
  // Source classification: NON-STANDARD product labels (±0.2 kg change; ±0.5 kg maintenance band).
  const weightOnTrack =
    changeKg !== null && goal
      ? goal === 'cut'
        ? changeKg <= -0.2
        : goal === 'bulk'
          ? changeKg >= 0.2
          : Math.abs(changeKg) <= 0.5
      : false

  const summary: SummaryRow[] = []
  // Weight
  if (changeKg !== null) {
    const dir = changeKg < 0 ? 'down' : changeKg > 0 ? 'up' : 'flat'
    summary.push({
      key: 'weight',
      icon: dir === 'down' ? 'TrendingDown' : dir === 'up' ? 'TrendingUp' : 'Minus',
      text: dir === 'flat' ? t('الوزن ثابت', 'Weight steady') : dir === 'down' ? t('الوزن نزل', 'Weight down') : t('الوزن زاد', 'Weight up'),
      value: dir === 'flat' ? '' : `${fmt(Math.abs(changeKg))} ${t('كجم', 'kg')}`,
      tag: weightOnTrack ? t('تقدّم جيد', 'Good progress') : t('تغيّر', 'Changed'),
      tone: weightOnTrack ? 'good' : 'neutral',
    })
  } else {
    summary.push({
      key: 'weight',
      icon: 'Scale',
      text: currentKg ? t('الوزن', 'Weight') : t('سجّل وزنك', 'Log your weight'),
      value: currentKg ? `${fmt(currentKg)} ${t('كجم', 'kg')}` : '',
      tag: t('سجّل بانتظام', 'Log regularly'),
      tone: 'needsData',
    })
  }
  // Strength
  if (improvedCount > 0) {
    summary.push({ key: 'strength', icon: 'TrendingUp', text: t('القوة تحسّنت في', 'Strength improved in'), value: t(`${fmt(improvedCount)} تمارين`, `${improvedCount} lifts`), tag: t('تقدّم', 'Progress'), tone: 'good' })
  } else if (strength.hasData) {
    summary.push({ key: 'strength', icon: 'Minus', text: t('القوة ثابتة', 'Strength steady'), value: '', tag: t('واصل', 'Keep on'), tone: 'neutral' })
  } else {
    summary.push({ key: 'strength', icon: 'Dumbbell', text: t('خلّص تمرينين لقراءة القوة', 'Complete two workouts'), value: '', tag: t('لا بيانات', 'No data'), tone: 'needsData' })
  }
  // Adherence
  if (adherencePct !== null) {
    summary.push({ key: 'adherence', icon: 'CalendarCheck', text: t('الالتزام', 'Consistency'), value: `${fmt(adherencePct)}%`, tag: adherencePct >= 70 ? t('جيد', 'Good') : t('واصل', 'Keep on'), tone: adherencePct >= 70 ? 'good' : 'neutral' })
  } else {
    summary.push({ key: 'adherence', icon: 'CalendarCheck', text: t('ما فيه تمارين مسجّلة لسا', 'No workouts logged yet'), value: '', tag: t('ابدأ', 'Start'), tone: 'needsData' })
  }

  // ── Hedged headline ─────────────────────────────────────────────────────────
  const adherentGood = adherencePct !== null && adherencePct >= 70
  const onTrack = weightOnTrack || improvedCount > 0 || adherentGood
  const hasAny = !!currentKg || finished.length > 0 || adherencePct !== null
  const headline = onTrack
    ? t('شكلك ماشي على المسار الصحيح', 'Looks like you’re on the right track')
    : hasAny
      ? t('شكلك في بداية الطريق', 'Looks like you’re getting started')
      : t('نحتاج بيانات أكثر عشان نقرأ تقدّمك', 'We need more data to read your progress')

  const weightDetail: WeightDetail = {
    currentKg: currentKg ? round1(currentKg) : null,
    targetKg,
    changeKg,
    band: targetKg ? [round1(targetKg - 1), round1(targetKg + 1)] : null,
    series: windowWeights.length >= 2 ? weightSeries.slice(-10).map((p) => ({ date: p.date, kg: p.value })) : weightSeries.slice(-10).map((p) => ({ date: p.date, kg: p.value })),
    bodyFatPct,
    waistCm,
    waistChangeCm,
    source: loggedCurrent ? 'real' : profileWeight ? 'profileOnly' : 'missing',
  }

  return {
    goal,
    goalLabel: goal ? GOAL_AR[goal] : null,
    period: { label: t('ملخّص آخر 14 يوم', 'Last 14 days') },
    headline,
    summary,
    stale,
    momentum,
    weight: weightDetail,
    strength,
    disclaimer: t('قراءة تقريبية — تصير أدق كل ما سجّلت أكثر.', 'An estimated read — sharper the more you log.'),
  }
}

// Metrics use WESTERN digits to match the PDF §05 exactly (0.8 كجم · 78% · 14 يوم).
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round1(n))
}
