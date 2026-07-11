// Today v2 (Command Center) model — Qimmah Design v2.1 (Slice 3).
//
// A small, HONEST view-model assembled from real local data (customization/
// generated plan, step log, nutrition log, onboarding profile). Every field
// degrades to a useful next-action fallback when data is missing — never a fake
// value, never an empty ring. Pure/read-only: no writes, no network, no schema.

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { todayPlanDay } from '@/lib/workoutPlan'
import { getSteps, loadStepGoal } from '@/lib/stepCounter'
import { getNutritionLog } from '@/lib/historyStore'
import { getDayStamp } from '@/lib/today'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

export type TodayCategory = 'train' | 'fuel' | 'move' | 'recover' | 'setup'

export interface TodayNextAction {
  category: TodayCategory
  title: string
  subtitle: string
  ctaLabel: string
  destination: 'setup' | 'workout' | 'nutrition' | 'progress' | null
  disabledReason: string | null
}

export interface TodayNudge {
  label: string
  actionLabel: string
  category: TodayCategory
  destination: 'setup' | 'workout' | 'nutrition' | 'progress' | null
  disabledReason: string | null
}

export interface TodayV2Model {
  currentGoal: CalorieGoal | null
  goalLabel: string | null
  nextAction: TodayNextAction
  nextWorkout: { title: string; durationMin: number; exerciseCount: number; muscles: string[]; source: string; available: boolean }
  nutrition: { caloriesRemaining: number | null; proteinRemainingGrams: number | null; priorityText: string; available: boolean }
  movement: { stepsCurrent: number | null; stepsTarget: number | null; stepsRemaining: number | null; available: boolean }
  recovery: { nextReminder: string | null; available: boolean }
  dayProgress: { trainPercent: number; nutritionPercent: number; movementPercent: number; recoveryPercent: number; completedCount: number; totalCount: number }
  nudges: TodayNudge[]
  trustNotes: string[]
}

const GOAL_LABEL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }
const GOAL_LABEL_EN: Record<CalorieGoal, string> = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk' }
const pct = (cur: number, target: number) => (target > 0 ? Math.max(0, Math.min(100, Math.round((cur / target) * 100))) : 0)

/** Estimated session length from the exercise count (honest heuristic, ~9 min/exercise incl. rest). */
const estimateDurationMin = (exerciseCount: number) => (exerciseCount > 0 ? Math.max(20, Math.round((exerciseCount * 9) / 5) * 5) : 0)

export function buildTodayV2Model(customization: Customization, lang: Lang): TodayV2Model {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const onboarded = loadOnboardingProfile() !== null
  const goal = customization.profile.goal ?? null
  const goalLabel = goal ? (ar ? GOAL_LABEL_AR[goal] : GOAL_LABEL_EN[goal]) : null

  // ── Workout (real: generated plan) ──
  const day = todayPlanDay(customization.workoutPlan)
  const exerciseCount = day?.exercises.length ?? 0
  const workoutAvailable = onboarded && exerciseCount > 0
  const workoutTitle = day ? (ar ? day.nameAr : day.nameEn) : ''
  const nextWorkout = {
    title: workoutTitle,
    durationMin: estimateDurationMin(exerciseCount),
    exerciseCount,
    muscles: [] as string[],
    source: t('من خطتك المولّدة', 'from your generated plan'),
    available: workoutAvailable,
  }

  // ── Nutrition (target real; consumed from today's log if any) ──
  const log = getNutritionLog(getDayStamp())
  const rec = log as unknown as { calories?: number; protein?: number } | undefined
  const caloriesConsumed = typeof rec?.calories === 'number' ? rec.calories : 0
  const proteinConsumed = typeof rec?.protein === 'number' ? rec.protein : 0
  const calTarget = customization.nutritionPlan?.targetCalories ?? 0
  const proTarget = customization.nutritionPlan?.targetProtein ?? 0
  const loggedMeal = caloriesConsumed > 0 || proteinConsumed > 0
  const nutrition = {
    caloriesRemaining: calTarget > 0 ? Math.max(0, calTarget - caloriesConsumed) : null,
    proteinRemainingGrams: proTarget > 0 ? Math.max(0, proTarget - proteinConsumed) : null,
    priorityText: loggedMeal
      ? t(`بقي ${Math.max(0, proTarget - proteinConsumed)}g بروتين لهدف اليوم`, `${Math.max(0, proTarget - proteinConsumed)}g protein left today`)
      : t('سجّل أول وجبة لنضبط البروتين', 'Log your first meal to hit protein'),
    available: calTarget > 0,
  }

  // ── Movement (real: step log; honest missing if no source) ──
  const stepsCurrent = getSteps()
  const stepsTarget = loadStepGoal()
  const movementAvailable = stepsCurrent > 0
  const movement = {
    stepsCurrent: movementAvailable ? stepsCurrent : null,
    stepsTarget,
    stepsRemaining: movementAvailable ? Math.max(0, stepsTarget - stepsCurrent) : null,
    available: movementAvailable,
  }

  // ── Recovery (reminders/meds) — neutral when nothing scheduled ──
  const supplements = customization.wellnessPlan?.supplements ?? []
  const medications = customization.wellnessPlan?.medications ?? []
  const recoveryAvailable = supplements.length + medications.length > 0
  const recovery = {
    nextReminder: recoveryAvailable ? t('لديك تذكيرات اليوم', 'You have reminders today') : null,
    available: recoveryAvailable,
  }

  // ── Day progress (four pillars) ──
  const trainPercent = 0 // completed-workout tracking lands with the workout loop; honest 0 until then
  const nutritionPercent = nutrition.available ? pct(caloriesConsumed, calTarget) : 0
  const movementPercent = movement.available ? pct(stepsCurrent, stepsTarget) : 0
  const recoveryPercent = 0
  const pillars = [
    { on: onboarded, done: trainPercent >= 100 },
    { on: nutrition.available, done: nutritionPercent >= 100 },
    { on: movement.available, done: movementPercent >= 100 },
    { on: recoveryAvailable, done: false },
  ]
  const dayProgress = {
    trainPercent,
    nutritionPercent,
    movementPercent,
    recoveryPercent,
    completedCount: pillars.filter((p) => p.done).length,
    totalCount: pillars.filter((p) => p.on).length || 4,
  }

  // ── Next action (single most important decision) — priority: setup > train > fuel > move ──
  let nextAction: TodayNextAction
  if (!onboarded) {
    nextAction = {
      category: 'setup',
      title: t('أكمل إعداد خطتك', 'Finish setting up your plan'),
      subtitle: t('دقيقتان لنبني تمرينك وتغذيتك.', 'Two minutes to build your training and nutrition.'),
      ctaLabel: t('ابدأ الإعداد', 'Start setup'),
      destination: 'setup',
      disabledReason: null,
    }
  } else if (workoutAvailable) {
    nextAction = {
      category: 'train',
      title: t(`ابدأ تمرين ${workoutTitle}`, `Start ${workoutTitle}`),
      subtitle: t(`${exerciseCount} تمارين · ~${nextWorkout.durationMin} دقيقة`, `${exerciseCount} exercises · ~${nextWorkout.durationMin} min`),
      ctaLabel: t('ابدأ التمرين', 'Start workout'),
      destination: 'workout',
      disabledReason: null,
    }
  } else if (nutrition.available && !loggedMeal) {
    nextAction = {
      category: 'fuel',
      title: t('سجّل أول وجبة', 'Log your first meal'),
      subtitle: nutrition.priorityText,
      ctaLabel: t('سجّل وجبة', 'Log a meal'),
      destination: 'nutrition',
      disabledReason: null,
    }
  } else if (movement.available && (movement.stepsRemaining ?? 0) > 0) {
    nextAction = {
      category: 'move',
      title: t(`امشِ ${movement.stepsRemaining?.toLocaleString('en-US')} خطوة`, `Walk ${movement.stepsRemaining?.toLocaleString('en-US')} steps`),
      subtitle: t('لتكمل هدف حركتك اليوم.', 'to finish today’s movement goal.'),
      ctaLabel: t('عرض التقدّم', 'View progress'),
      destination: 'progress',
      disabledReason: null,
    }
  } else {
    nextAction = {
      category: 'recover',
      title: t('أنت على المسار', 'You are on track'),
      subtitle: t('راجع تقدّمك أو سجّل وجبتك القادمة.', 'Review progress or log your next meal.'),
      ctaLabel: t('عرض التقدّم', 'View progress'),
      destination: 'progress',
      disabledReason: null,
    }
  }

  // ── Priority nudges (honest, actionable, 2–4) ──
  const nudges: TodayNudge[] = []
  if (workoutAvailable) nudges.push({ label: t('تمرينك القادم جاهز', 'Your next workout is ready'), actionLabel: t('ابدأ', 'Start'), category: 'train', destination: 'workout', disabledReason: null })
  if (!onboarded) nudges.push({ label: t('لم تُكمل الإعداد بعد', 'Setup not finished'), actionLabel: t('أكمل', 'Finish'), category: 'setup', destination: 'setup', disabledReason: null })
  if (nutrition.available && !loggedMeal) nudges.push({ label: t('سجّل أول وجبة', 'Log your first meal'), actionLabel: t('سجّل', 'Log'), category: 'fuel', destination: 'nutrition', disabledReason: null })
  if (!movement.available) nudges.push({ label: t('بيانات الخطوات غير متاحة', 'Step data unavailable'), actionLabel: t('لاحقًا', 'Later'), category: 'move', destination: null, disabledReason: t('اربط مصدر الخطوات لاحقًا', 'Connect a step source later') })
  else if ((movement.stepsRemaining ?? 0) > 0) nudges.push({ label: t(`بقي ${movement.stepsRemaining?.toLocaleString('en-US')} خطوة`, `${movement.stepsRemaining?.toLocaleString('en-US')} steps left`), actionLabel: t('عرض', 'View'), category: 'move', destination: 'progress', disabledReason: null })
  if (nudges.length < 2) nudges.push({ label: t('سجّل وزنك الحالي', 'Log your current weight'), actionLabel: t('نقطة البداية', 'Baseline'), category: 'recover', destination: 'progress', disabledReason: null })

  // ── Trust notes (data source honesty) ──
  const trustNotes: string[] = []
  trustNotes.push(onboarded ? t('خطتك مبنية على إعدادك.', 'Your plan is built from your setup.') : t('أكمل الإعداد لبناء خطتك.', 'Finish setup to build your plan.'))
  if (!movement.available) trustNotes.push(t('لا تُعرض خطوات وهمية — المصدر غير مربوط.', 'No fake steps — no source connected.'))
  if (!loggedMeal && nutrition.available) trustNotes.push(t('لا وجبات مسجّلة اليوم بعد.', 'No meals logged yet today.'))

  return { currentGoal: goal, goalLabel, nextAction, nextWorkout, nutrition, movement, recovery, dayProgress, nudges: nudges.slice(0, 4), trustNotes }
}
