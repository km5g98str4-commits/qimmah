// Progress v2 model — Qimmah Design v2.1 (Slice 6). A coach-style "brief" over
// the last 14 days, read-only, HONEST. Uses real local state where present
// (profile weight, workout summary, nutrition v2 log, steps) and explicit
// needs-data prompts otherwise. Never invents weight loss / PRs / body-fat /
// steps. Uncertain language only (يبدو / تقديري / يحتاج بيانات أكثر).

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { getSteps } from '@/lib/stepCounter'
import { NUTRITION_V2_KEY } from '@/lib/nutritionV2Model'

const WORKOUT_SUMMARY_KEY = 'qimmah:workout-summary:v2'

export type BriefStatus = 'improved' | 'stable' | 'needsData' | 'caution' | 'unknown'
export type BriefType = 'weight' | 'strength' | 'nutrition' | 'activity' | 'measurement'

export interface BriefItem { type: BriefType; status: BriefStatus; label: string; value: string; note: string; actionLabel?: string; destination?: 'progress' | 'nutrition' | 'workout' | 'setup' }

export interface ProgressV2Model {
  goal: CalorieGoal | null
  goalLabel: string | null
  period: { label: string }
  brief: { headline: string; items: BriefItem[] }
  weight: { currentKg: number | null; targetKg: number | null; changeKg: number | null; source: 'real' | 'fallback' | 'missing' }
  strength: { lastSessionTitle: string | null; lastVolume: number | null; source: 'localSummary' | 'missing' }
  nutrition: { loggedToday: boolean; source: 'local' | 'missing' }
  activity: { stepsToday: number | null; source: 'real' | 'missing' }
  momentum: { trainingScore: number; nutritionScore: number; activityScore: number; recoveryScore: number; overallScore: number }
  nextActions: { label: string; actionLabel: string; reason: string; destination: 'progress' | 'nutrition' | 'workout' | 'setup' }[]
}

const GOAL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }

function readSummary(): { title: string; volume: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(WORKOUT_SUMMARY_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as { title?: string; volume?: number }
    if (s && typeof s.title === 'string') return { title: s.title, volume: typeof s.volume === 'number' ? s.volume : 0 }
  } catch {
    /* ignore */
  }
  return null
}
function nutritionLoggedToday(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(NUTRITION_V2_KEY)
    const p = raw ? (JSON.parse(raw) as { foods?: unknown[] }) : null
    return !!p && Array.isArray(p.foods) && p.foods.length > 0
  } catch {
    return false
  }
}

export function buildProgressV2Model(customization: Customization, lang: Lang): ProgressV2Model {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const goal = customization.profile.goal ?? null

  const currentKg = customization.profile.weightKg || null
  const targetKg = customization.profile.targetWeightKg || null
  // We only have a single current weight (no dated history in preview) → no honest change.
  const weight = { currentKg, targetKg, changeKg: null as number | null, source: (currentKg ? 'real' : 'missing') as 'real' | 'fallback' | 'missing' }

  const summary = readSummary()
  const strength = { lastSessionTitle: summary?.title ?? null, lastVolume: summary?.volume ?? null, source: (summary ? 'localSummary' : 'missing') as 'localSummary' | 'missing' }

  const loggedToday = nutritionLoggedToday()
  const nutrition = { loggedToday, source: (loggedToday ? 'local' : 'missing') as 'local' | 'missing' }

  const stepsToday = getSteps()
  const activity = { stepsToday: stepsToday > 0 ? stepsToday : null, source: (stepsToday > 0 ? 'real' : 'missing') as 'real' | 'missing' }

  // Brief items — honest statuses.
  const items: BriefItem[] = []
  items.push(
    currentKg
      ? { type: 'weight', status: 'needsData', label: t('الوزن', 'Weight'), value: `${currentKg} ${t('كجم', 'kg')}`, note: t('سجّل وزنك بانتظام لنقرأ الاتجاه.', 'Log weight regularly to read the trend.'), actionLabel: t('سجّل', 'Log'), destination: 'progress' }
      : { type: 'weight', status: 'needsData', label: t('الوزن', 'Weight'), value: t('غير مسجّل', 'Not logged'), note: t('سجّل وزنك الحالي.', 'Log your current weight.'), actionLabel: t('سجّل', 'Log'), destination: 'progress' },
  )
  items.push(
    summary
      ? { type: 'strength', status: 'needsData', label: t('القوة', 'Strength'), value: t('جلسة واحدة', '1 session'), note: t('أكمل تمرينين على الأقل لنعرض تطور القوة.', 'Complete at least two workouts to read strength trend.'), actionLabel: t('تمرّن', 'Train'), destination: 'workout' }
      : { type: 'strength', status: 'needsData', label: t('القوة', 'Strength'), value: t('لا بيانات', 'No data'), note: t('أكمل تمرينين على الأقل لنقرأ تطور القوة.', 'Complete at least two workouts.'), actionLabel: t('تمرّن', 'Train'), destination: 'workout' },
  )
  items.push(
    loggedToday
      ? { type: 'nutrition', status: 'needsData', label: t('الالتزام', 'Consistency'), value: t('بدأت اليوم', 'Started today'), note: t('سجّل وجباتك لأسبوع لنقرأ الالتزام.', 'Log meals for a week to read consistency.'), actionLabel: t('سجّل', 'Log'), destination: 'nutrition' }
      : { type: 'nutrition', status: 'needsData', label: t('الالتزام', 'Consistency'), value: t('لا تسجيل بعد', 'Not logged'), note: t('سجّل وجباتك لأسبوع لنقرأ الالتزام.', 'Log meals for a week.'), actionLabel: t('سجّل', 'Log'), destination: 'nutrition' },
  )
  items.push(
    activity.source === 'real'
      ? { type: 'activity', status: 'stable', label: t('الحركة', 'Activity'), value: `${activity.stepsToday?.toLocaleString('en-US')} ${t('خطوة', 'steps')}`, note: t('اليوم.', 'today.') }
      : { type: 'activity', status: 'needsData', label: t('الحركة', 'Activity'), value: t('غير متاحة', 'Unavailable'), note: t('بيانات الخطوات غير متاحة — اربط المصدر لاحقًا.', 'Step data unavailable — connect a source later.') },
  )
  items.push({ type: 'measurement', status: 'needsData', label: t('القياسات', 'Measurements'), value: t('قديمة', 'Stale'), note: t('سجّل قياس الخصر لقراءة أدق.', 'Log a waist measurement for a sharper read.'), actionLabel: t('سجّل', 'Log'), destination: 'progress' })

  const hasAny = !!currentKg || !!summary || loggedToday || activity.source === 'real'
  const headline = hasAny ? t('يبدو أنك في بداية الطريق', 'Looks like you’re getting started') : t('نحتاج بيانات أكثر لنقرأ تقدمك', 'We need more data to read your progress')

  // Momentum scores (honest, from what exists).
  const trainingScore = summary ? 40 : 0
  const nutritionScore = loggedToday ? 30 : 0
  const activityScore = activity.source === 'real' ? Math.min(100, Math.round(((activity.stepsToday ?? 0) / 10000) * 100)) : 0
  const recoveryScore = 0
  const overallScore = Math.round((trainingScore + nutritionScore + activityScore + recoveryScore) / 4)

  const nextActions: ProgressV2Model['nextActions'] = []
  if (!summary) nextActions.push({ label: t('أكمل تمرينك الأول', 'Complete your first workout'), actionLabel: t('تمرّن', 'Train'), reason: t('لنبدأ قراءة القوة', 'to start reading strength'), destination: 'workout' })
  if (!loggedToday) nextActions.push({ label: t('سجّل وجباتك اليوم', 'Log your meals today'), actionLabel: t('سجّل', 'Log'), reason: t('لقراءة الالتزام', 'to read consistency'), destination: 'nutrition' })
  nextActions.push({ label: t('سجّل وزنك الحالي', 'Log your current weight'), actionLabel: t('سجّل', 'Log'), reason: t('نقطة البداية', 'a baseline'), destination: 'progress' })

  return {
    goal,
    goalLabel: goal ? GOAL_AR[goal] : null,
    period: { label: t('آخر ١٤ يوم', 'Last 14 days') },
    brief: { headline, items },
    weight,
    strength,
    nutrition,
    activity,
    momentum: { trainingScore, nutritionScore, activityScore, recoveryScore, overallScore },
    nextActions: nextActions.slice(0, 4),
  }
}
