// ═══════════════════════════════════════════════════════════════════════════
//  بناء السياق المُسنَد — [SOVEREIGN-COACH-001].
//
//  طبقتان مفصولتان عمدًا:
//    • `readCoachEnvironment` — **القراءة** من مخازن التطبيق القائمة. غير نقيّة
//      بطبيعتها، ولا تحتوي منطقًا: تجمع ولا تقرّر.
//    • `buildCoachContext` — **دالة نقيّة** تطبيع واشتقاق. لا DOM ولا تخزين ولا
//      شبكة، فتُختبر بشخصيات مركّبة بلا متصفح.
//
//  ═══ قراءة فقط ═══
//  لا كتابة واحدة في هذا الملف ولا في المحرّك كلّه. المرشد **يقرأ ولا يعدّل**:
//  لا يغيّر خطة، ولا يسجّل قرار يوم فائت، ولا يبدّل هدفًا. القاعدة D من مسار
//  اليوم الفائت (`workoutCalendar`) تبقى كما هي: القرار للمستخدم، والمرشد يشرح
//  الخيارات ولا ينفّذ واحدًا منها.
//
//  ═══ المحرّكات تُنادى ولا تُعاد كتابتها ═══
//  يوم التمرين ⇐ `workoutDaySource` · اليوم الفائت ⇐ `detectMissedDay` · اكتمال
//  اليوم ⇐ `dayCompletion` · الحمل الأسبوعي ⇐ `deriveTrainingLoad` · تعليل الخطة
//  ⇐ `buildPlanRationale` · مرشّح الإصابات ⇐ `hasRecognizedInjuryArea`. **لا نسخة
//  ثانية من أي منها هنا** (§2 من الميثاق).
// ═══════════════════════════════════════════════════════════════════════════

import type { Lang } from '@/lib/appPreferences'
import type { Customization } from '@/lib/customization'
import type { InjuryAreaKey, Profile, Targets } from '@/types/profile'
import type { Muscle, WorkoutPlan } from '@/types/workout'
import type { MeasurementLog } from '@/types/progress'
import type { WorkoutSession } from '@/lib/workoutSessions'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { RecoveryEngineEntry, RecoverySuggestion, TrainingLoad } from '@/lib/recoveryEngine'
import {
  detectMissedDay,
  loadWeeklySchedule,
  type MissedDayDecision,
  type ScheduledDay,
  type WeeklySchedule,
} from '@/lib/workoutCalendar'
import { activeWorkoutPlan, currentWorkout, nextWorkout, type NextWorkout } from '@/lib/workoutDaySource'
import { dayCompletion } from '@/lib/workoutSessionEngine'
import { deriveTrainingLoad } from '@/lib/recoveryEngine'
import { getWorkoutSessions } from '@/lib/historyStore'
import { getDayStamp } from '@/lib/today'
import { loadCustomization } from '@/lib/customization'
import { loadLogs } from '@/lib/measurementLog'
import { loadNutritionDay, nutritionDayTotals } from '@/lib/nutritionV2Model'
import { todaysRecoveryEngineEntry } from '@/lib/recoveryEngine'
import { buildPlanRationale } from '@/lib/planRationale'
import { generatePlan, hasRecognizedInjuryArea } from '@/lib/planGenerator'
import { getExercise } from '@/data/exercises'
import { profileHash } from '@/lib/calculators'

// ── المدخل الخام ────────────────────────────────────────────────────────────

export interface CoachEnvironment {
  customization: Customization
  plan: WorkoutPlan
  today: ScheduledDay | undefined
  next: NextWorkout | undefined
  schedule: WeeklySchedule | null
  sessions: readonly WorkoutSession[]
  nutritionDay: ReturnType<typeof loadNutritionDay>
  measurements: readonly MeasurementLog[]
  recoveryToday: RecoveryEngineEntry | null
  rationale: PlanRationale | null
  lang: Lang
}

// ── السياق المطبَّع ─────────────────────────────────────────────────────────

export type CoachToday =
  | { kind: 'noPlan' }
  | { kind: 'rest' }
  | {
      kind: 'training'
      dayName: string
      exerciseCount: number
      setCount: number
    }

/** التمرين الذي يدور عنه سؤال «أقدر أبدّله؟» — أول تمرين في يوم التدريب القريب. */
export interface CoachSubjectExercise {
  id: string
  name: string
  /** `today` تمرين اليوم · `next` تمرين اليوم القادم (يُعلَن للمستخدم لا يُخفى). */
  from: 'today' | 'next'
}

export interface CoachCalories {
  target: number
  consumed: number
  remaining: number
}

export interface CoachInjury {
  /** أعلن المستخدم إصابة يعرفها مرشّح المولّد أو حقل المناطق المنظَّم. */
  declared: boolean
  /** المناطق المنظَّمة إن وُجدت؛ قد تكون فارغة مع `declared === true` (ملفّ قديم نصّي). */
  areas: readonly InjuryAreaKey[]
}

export interface CoachContext {
  lang: Lang
  todayStamp: string
  hasPlan: boolean
  today: CoachToday
  next: { inDays: number; dayName: string } | null
  subjectExercise: CoachSubjectExercise | null
  recovery: { suggestion: RecoverySuggestion; confidence: number } | null
  calories: CoachCalories | null
  hasSchedule: boolean
  missed: MissedDayDecision | null
  missedDayName: string | null
  load: TrainingLoad | null
  trainingDaysTarget: number
  profile: Profile
  targets: Targets
  targetsMeta: Customization['targetsMeta']
  /** الأهداف محسوبة من ملفّ يطابق الملف الحالي؟ (`profileHash` — المصدر نفسه). */
  targetsFresh: boolean
  latestLoggedWeightKg: number | null
  rationale: PlanRationale | null
  injury: CoachInjury
}

// ── القراءة ─────────────────────────────────────────────────────────────────

/**
 * تعليل الخطة **للخطة المحفوظة** لا لخطة يُعاد توليدها — نفس نمط
 * `components/customizer/steps/StepReview.tsx`: الحقول الثلاثة التي يقرأها
 * المحرّك تُؤخذ من التخصيص المحفوظ، والباقي يُستوفى من توليد فوق الملف نفسه
 * لاستيفاء النوع لا لتغيير رقم. فلو عدّل المستخدم خطته يدويًا بقي الشرح مطابقًا
 * لما بين يديه.
 */
function rationaleForSavedPlan(customization: Customization, plan: WorkoutPlan): PlanRationale | null {
  if (!plan.days.length) return null
  try {
    const base = generatePlan(customization.profile)
    const asSaved: GeneratedPlan = {
      ...base,
      workoutPlan: plan,
      suggestedWorkoutTemplateId: plan.templateId,
      targets: customization.targets,
    }
    return buildPlanRationale(customization.profile, asSaved)
  } catch {
    // تعليل غائب يُقال «غير معروف» ولا يُخترع (انظر `rules.ts`).
    return null
  }
}

/** يجمع الحالة الحقيقية من مخازن التطبيق. لا منطق هنا — جمعٌ فقط. */
export function readCoachEnvironment(
  userId: string | null,
  lang: Lang,
  now: Date = new Date(),
): CoachEnvironment {
  const customization = loadCustomization()
  const plan = activeWorkoutPlan(userId, customization)
  return {
    customization,
    plan,
    today: currentWorkout(userId, customization, now),
    next: nextWorkout(userId, customization, now),
    schedule: loadWeeklySchedule(),
    sessions: getWorkoutSessions(),
    nutritionDay: loadNutritionDay(),
    measurements: loadLogs(),
    recoveryToday: todaysRecoveryEngineEntry(userId),
    rationale: rationaleForSavedPlan(customization, plan),
    lang,
  }
}

// ── الاشتقاق النقي ──────────────────────────────────────────────────────────

const dayName = (day: { nameAr: string; nameEn: string }, lang: Lang): string =>
  lang === 'en' ? day.nameEn : day.nameAr

const exerciseName = (id: string, lang: Lang): string | null => {
  const ex = getExercise(id)
  if (!ex) return null
  return lang === 'en' ? ex.nameEn : ex.nameAr
}

const numOf = (v: string | number | undefined): number => {
  if (v === undefined) return NaN
  const m = String(v).match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** أحدث وزن **مسجَّل فعلًا** (يدوي أو مستورد) — لا وزن الملف الشخصي. */
function latestLoggedWeight(logs: readonly MeasurementLog[]): number | null {
  const withWeight = logs
    .filter((l) => l.values.weightKg !== undefined && l.values.weightKg !== '')
    .map((l) => ({ date: l.date, kg: numOf(l.values.weightKg) }))
    .filter((p) => Number.isFinite(p.kg))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return withWeight.length ? withWeight[0].kg : null
}

/**
 * أيام «حضرها» المستخدم — الاكتمال الكامل **والجزئي** معًا. الإنهاء المبكر
 * ليس يومًا فائتًا: المستخدم جاء وتمرّن، فعدّه فائتًا لومٌ على حضور (§6/١).
 */
function attendedDates(sessions: readonly WorkoutSession[]): string[] {
  const dates = new Set(sessions.map((s) => s.date))
  const out: string[] = []
  for (const date of dates) {
    const state = dayCompletion(date, sessions).state
    if (state === 'complete' || state === 'partial') out.push(date)
  }
  return out
}

function injuryFrom(profile: Profile): CoachInjury {
  const areas = profile.injuryAreas ?? []
  // مصدران: الحقل المنظَّم الجديد، ومرشّح المولّد النصّي للملفّات القديمة.
  // **كلاهما مُصدَّر من الجذع** — لا اكتشاف إصابات مكتوب هنا.
  return { declared: areas.length > 0 || hasRecognizedInjuryArea(profile.injuries), areas }
}

/** دالة نقيّة: البيئة تدخل، السياق يخرج. لا تخزين ولا DOM ولا شبكة. */
export function buildCoachContext(env: CoachEnvironment, now: Date = new Date()): CoachContext {
  const { customization, lang } = env
  const profile = customization.profile
  const todayStamp = getDayStamp(now)
  const hasPlan = env.plan.days.length > 0

  let today: CoachToday = { kind: 'noPlan' }
  if (hasPlan && env.today) {
    today =
      env.today.type === 'training'
        ? {
            kind: 'training',
            dayName: dayName(env.today.day, lang),
            exerciseCount: env.today.day.exercises.length,
            setCount: env.today.day.exercises.reduce((sum, pe) => sum + pe.sets, 0),
          }
        : { kind: 'rest' }
  }

  // موضوع سؤال البدائل: تمرين اليوم إن كان يوم تدريب، وإلا تمرين اليوم القادم —
  // ويُعلَن أيّهما (`from`) فلا يظنّ المستخدم أنه يسأل عن يومه وهو يسأل عن غده.
  let subjectExercise: CoachSubjectExercise | null = null
  const todayFirst = env.today?.type === 'training' ? env.today.day.exercises[0] : undefined
  const nextFirst = env.next?.day.day.exercises[0]
  const pick = todayFirst ?? nextFirst
  if (pick) {
    const name = exerciseName(pick.exerciseId, lang)
    if (name) subjectExercise = { id: pick.exerciseId, name, from: todayFirst ? 'today' : 'next' }
  }

  const totals = nutritionDayTotals(env.nutritionDay.foods)
  const calorieTarget = customization.nutritionPlan?.targetCalories ?? 0
  const calories: CoachCalories | null = calorieTarget > 0
    ? { target: calorieTarget, consumed: totals.calories, remaining: calorieTarget - totals.calories }
    : null

  const missed = detectMissedDay(env.schedule, env.plan, attendedDates(env.sessions), now)
  const missedDay = missed ? env.plan.days[missed.planDayIndex % env.plan.days.length] : null

  return {
    lang,
    todayStamp,
    hasPlan,
    today,
    next: env.next ? { inDays: env.next.inDays, dayName: dayName(env.next.day.day, lang) } : null,
    subjectExercise,
    recovery: env.recoveryToday
      ? { suggestion: env.recoveryToday.suggestion, confidence: env.recoveryToday.confidence }
      : null,
    calories,
    hasSchedule: env.schedule !== null,
    missed,
    missedDayName: missedDay ? dayName(missedDay, lang) : null,
    load: deriveTrainingLoad(env.sessions as WorkoutSession[], now) ?? null,
    trainingDaysTarget: profile.trainingDays,
    profile,
    targets: customization.targets,
    targetsMeta: customization.targetsMeta,
    targetsFresh: customization.targetsMeta.lastCalculatedFromProfileHash === profileHash(profile),
    latestLoggedWeightKg: latestLoggedWeight(env.measurements),
    rationale: env.rationale,
    injury: injuryFrom(profile),
  }
}

/** أعلى عضلة حجمًا أسبوعيًا في التعليل — أو `null` حين لا تعليل. */
export function topWeeklyMuscle(ctx: CoachContext): { muscle: Muscle; sets: number } | null {
  const top = ctx.rationale?.weeklyVolume[0]
  return top ? { muscle: top.muscle, sets: top.sets } : null
}
