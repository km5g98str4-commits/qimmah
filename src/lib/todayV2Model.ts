// Today v2.1 (Command Center) model — Qimmah Design v2.1 (Slice 3, PDF §04).
//
// A small, HONEST view-model assembled from real local data (generated plan,
// finished sessions, step log, nutrition log, wellness plan, onboarding). It
// resolves ONE of four states the founder stress-tested — normal · new-user
// (low data) · after-workout · return-after-break (a real ≥3-day workout gap) —
// and, for each, a single hero decision, a four
// pillar «مسار اليوم» track, and verb+destination cards. Every value is real or
// an honest fallback; never a fake number, never an empty ring. Pure/read-only.

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import type { AppRoute } from '@/lib/appRoutes'
import { scheduledDayFor } from '@/lib/workoutCalendar'
import { getSteps, loadStepGoal } from '@/lib/stepCounter'
import { getNutritionLog, getWorkoutSessions } from '@/lib/historyStore'
import { todaysCompletion } from '@/lib/workoutSessionEngine'
import { getDayStamp, weekdayName } from '@/lib/today'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'
import { phraseForDay } from '@/data/dailyPhrases'

export type TodayState = 'normal' | 'newUser' | 'afterWorkout' | 'returnAfterBreak'
export type PillarKey = 'train' | 'nutrition' | 'move' | 'recover'
/** done = complete (✓) · active = in-progress ring (%) · ready = today's focus, filled + icon · locked = dashed placeholder (no empty ring). */
export type PillarState = 'done' | 'active' | 'ready' | 'locked'

export interface TodayPillar {
  key: PillarKey
  labelAr: string
  labelEn: string
  icon: string
  state: PillarState
  percent: number
}

export interface TodayHero {
  eyebrow: string
  /** after-workout eyebrow reads as a green completion line, not an ember prompt. */
  eyebrowDone: boolean
  title: string
  subtitle: string
  ctaLabel: string
  ctaTone: 'ember' | 'green'
  destination: AppRoute | null
}

export interface TodayCard {
  label: string
  hint: string | null
  /** short imperative verb («أضف»/«سجّل»/«عرض»/«فعّل») paired with the chevron; may be '' when the label itself opens with the verb. */
  actionLabel: string
  icon: string
  tone: PillarKey | 'progress'
  destination: AppRoute | null
}

export interface TodayV2Model {
  state: TodayState
  greeting: string
  dateLabel: string
  avatarInitial: string | null
  goalLabel: string | null
  hero: TodayHero
  pillars: TodayPillar[]
  progressLabel: string
  completedCount: number
  totalCount: number
  cards: TodayCard[]
  /**
   * عبارة اليوم التحفيزية — حتمية: نفس التاريخ يعطي نفس العبارة دائمًا (لا تتغيّر
   * مع كل render)، وتتغيّر بتغيّر تاريخ اليوم. بلغة الواجهة الحالية.
   */
  dailyPhrase: string
  trustNote: string | null
  /**
   * (P4) يوم راحة حقيقي من الجدول الأسبوعي — لا تمرين اليوم بقرار الجدولة، لا
   * لغياب الخطة. إضافة متوافقة خلفيًا (workoutAvailable يبقى false في الحالتين).
   */
  restDay: boolean
}

const GOAL_LABEL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }
const GOAL_LABEL_EN: Record<CalorieGoal, string> = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk' }
// Source classification: exact product completion ratio, capped at 100%; not a scientific estimate.
const pct = (cur: number, target: number) => (target > 0 ? Math.max(0, Math.min(100, Math.round((cur / target) * 100))) : 0)
/** Honest session-length heuristic (~9 min/exercise incl. rest), rounded to 5. */
// Source classification: NON-STANDARD Qimmah display heuristic; users can override workoutDuration.
const estimateDurationMin = (exerciseCount: number) => (exerciseCount > 0 ? Math.max(20, Math.round((exerciseCount * 9) / 5) * 5) : 0)
const num = (n: number) => n.toLocaleString('en-US')

const DAY_MS = 86_400_000
/** Whole days between a YYYY-MM-DD stamp and today (local). Derived from the real clock, never guessed. */
function daysSince(stamp: string, now: Date): number {
  const then = new Date(`${stamp}T00:00:00`).getTime()
  const today = new Date(`${getDayStamp(now)}T00:00:00`).getTime()
  return Math.round((today - then) / DAY_MS)
}

/** Part of day for the honest greeting/date line — from the real clock. */
function partOfDay(ar: boolean, d = new Date()): string {
  const h = d.getHours()
  if (h < 12) return ar ? 'صباحًا' : 'Morning'
  if (h < 17) return ar ? 'ظهرًا' : 'Afternoon'
  return ar ? 'مساءً' : 'Evening'
}

export function buildTodayV2Model(customization: Customization, lang: Lang): TodayV2Model {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const now = new Date()

  const onboarded = loadOnboardingProfile() !== null
  const goal = customization.profile.goal ?? null
  const goalLabel = goal ? (ar ? GOAL_LABEL_AR[goal] : GOAL_LABEL_EN[goal]) : null
  const name = (customization.profile.name ?? '').trim()
  const firstName = name ? name.split(/\s+/)[0] : ''
  const avatarInitial = name ? Array.from(name)[0] : null

  // ── Workout (real: weekly schedule → plan day | honest rest; legacy rotation
  //    only as the documented fallback when no schedule is configured) ──
  const resolved = scheduledDayFor(customization.workoutPlan, now)
  const restDay = resolved?.type === 'rest'
  const day = resolved?.type === 'training' ? resolved.day : undefined
  const exerciseCount = day?.exercises.length ?? 0
  const workoutName = day ? (ar ? day.nameAr : day.nameEn) : ''
  const workoutAvailable = onboarded && exerciseCount > 0
  const durationMin = customization.profile.workoutDuration > 0 ? customization.profile.workoutDuration : estimateDurationMin(exerciseCount)
  // (P5) الاكتمال الصادق بدل «أي finishedAt»: جلسة completed فقط تُكمل اليوم؛
  // الإنهاء المبكر (ended_early) = جزئي — لا يقلب الحالة إلى afterWorkout، ويظهر
  // كتقدّم حقيقي على عمود التدريب. الجلسات القديمة بلا status تبقى completed.
  const completion = todaysCompletion()
  const finished = completion.state === 'complete' ? completion.session : undefined
  const partialTrain = completion.state === 'partial' ? completion.partial : null
  // Prefer the localized plan-day name over the stored session name (which is a
  // single string frozen at finish time) so English never shows an Arabic name.
  const finishedName = finished ? workoutName || finished.workoutDayName : ''

  // ── Nutrition (target real; consumed from today's log — the manually logged
  //    food totals live under `loggedFood`, not top-level fields) ──
  const log = getNutritionLog(getDayStamp())
  const food = log?.loggedFood
  const caloriesConsumed = typeof food?.calories === 'number' ? food.calories : 0
  const proteinConsumed = typeof food?.protein === 'number' ? food.protein : 0
  const calTarget = customization.nutritionPlan?.targetCalories ?? 0
  const proTarget = customization.nutritionPlan?.targetProtein ?? 0
  const proteinRemaining = proTarget > 0 ? Math.max(0, proTarget - proteinConsumed) : null
  const nutritionTarget = calTarget > 0
  const loggedMeal = caloriesConsumed > 0 || proteinConsumed > 0
  const nutritionPercent = nutritionTarget ? pct(caloriesConsumed, calTarget) : 0

  // ── Movement (real: step log; honest missing if no source) ──
  const stepsCurrent = getSteps()
  const stepsTarget = loadStepGoal()
  const movementAvailable = stepsCurrent > 0
  const stepsRemaining = movementAvailable ? Math.max(0, stepsTarget - stepsCurrent) : null
  const movementPercent = movementAvailable ? pct(stepsCurrent, stepsTarget) : 0

  // ── Recovery (wellness reminders) — neutral until scheduled/done ──
  const supplements = customization.wellnessPlan?.supplements ?? []
  const medications = customization.wellnessPlan?.medications ?? []
  const recoveryAvailable = customization.wellnessPlan?.enabled !== false && supplements.length + medications.length > 0

  // ── State discriminator (from real data) ──
  const sessions = getWorkoutSessions()
  const hasHistory = sessions.length > 0 || loggedMeal || movementAvailable
  // Real workout gap: whole days since the last FINISHED session. null when the
  // user has never finished one (they are new, not returning).
  const lastWorkoutStamp = sessions.filter((s) => s.finishedAt).map((s) => s.date).sort().at(-1) ?? null
  const daysSinceWorkout = lastWorkoutStamp ? daysSince(lastWorkoutStamp, now) : null
  // Return-after-break: an onboarded user, no session today, a real ≥3-day gap,
  // and still a plan to come back to. Derived from the log — never assumed.
  const returningGap = daysSinceWorkout !== null && daysSinceWorkout >= 3 && workoutAvailable
  const state: TodayState = finished
    ? 'afterWorkout'
    : !onboarded || !hasHistory
      ? 'newUser'
      : returningGap
        ? 'returnAfterBreak'
        : 'normal'

  // ── Header: greeting + date line, rewritten by state & time-of-day ──
  const weekday = weekdayName(ar ? 'ar' : 'en', now)
  let greeting: string
  let dateLabel: string
  if (state === 'afterWorkout') {
    // الاسم الحقيقي فقط — لا اسم وهمي عند غيابه (صياغة عامة سليمة).
    greeting = firstName
      ? t(`كفو عليك يا ${firstName}`, `Well done today, ${firstName}`)
      : t('كفو عليك اليوم', 'Well done today')
    dateLabel = `${weekday} · ${partOfDay(ar, now)}`
  } else {
    const dayMonth = (() => {
      try {
        // `ar` (not `ar-SA`) keeps the Gregorian calendar to match the approved
        // v2.1 mockups («١١ يوليو»), consistent with the Gregorian weekday above.
        return new Intl.DateTimeFormat(ar ? 'ar' : 'en-US', { day: 'numeric', month: 'long' }).format(now)
      } catch {
        return ''
      }
    })()
    dateLabel = dayMonth ? `${weekday} · ${dayMonth}` : weekday
    greeting =
      state === 'newUser'
        ? firstName ? t(`هلا ${firstName}`, `Hi ${firstName}`) : t('هلا فيك', 'Welcome')
        : state === 'returnAfterBreak'
          ? firstName ? t(`حيّاك من جديد يا ${firstName}`, `Great to see you back, ${firstName}`) : t('حيّاك من جديد', 'Great to see you back')
          : firstName
            ? t(`هلا ${firstName}، يومك في قِمّة`, `Hey ${firstName}, here's your day in Qimmah`)
            : t('يومك في قِمّة', 'Your day in Qimmah')
  }

  // ── Hero: the single top-third decision ──
  const hero = buildHero({ t, state, workoutAvailable, workoutName, exerciseCount, durationMin, finishedName, proteinRemaining, nutritionTarget, loggedMeal })

  // ── مسار اليوم: four pillars (real state each; all locked for new users) ──
  // (P5) جزئي بتقدّم فعلي (>0%) → 'active' بنسبة المجموعات المنجزة الحقيقية؛
  // جزئي صفر إنجاز → يبقى 'ready' (لا حلقة فارغة) واليوم غير مكتمل في الحالين.
  const trainState: PillarState = finished
    ? 'done'
    : partialTrain && partialTrain.percent > 0
      ? 'active'
      : workoutAvailable
        ? 'ready'
        : 'locked'
  const trainPercent = !finished && partialTrain ? partialTrain.percent : 0
  const nutritionState: PillarState = !nutritionTarget ? 'locked' : nutritionPercent >= 100 ? 'done' : nutritionPercent > 0 ? 'active' : 'locked'
  const moveState: PillarState = !movementAvailable ? 'locked' : movementPercent >= 100 ? 'done' : movementPercent > 0 ? 'active' : 'locked'
  const recoverState: PillarState = 'locked' // recovery completes in the evening flow; honest neutral until then
  const lockAll = state === 'newUser'
  const pillars: TodayPillar[] = [
    { key: 'train', labelAr: 'تدريب', labelEn: 'Training', icon: 'Dumbbell', state: lockAll ? 'locked' : trainState, percent: trainPercent },
    { key: 'nutrition', labelAr: 'تغذية', labelEn: 'Nutrition', icon: 'Flame', state: lockAll ? 'locked' : nutritionState, percent: nutritionPercent },
    { key: 'move', labelAr: 'حركة', labelEn: 'Movement', icon: 'Activity', state: lockAll ? 'locked' : moveState, percent: movementPercent },
    { key: 'recover', labelAr: 'تعافي', labelEn: 'Recovery', icon: 'Moon', state: lockAll ? 'locked' : recoverState, percent: 0 },
  ]
  const completedCount = pillars.filter((p) => p.state === 'done').length
  const totalCount = pillars.length
  const progressLabel = state === 'newUser' ? t('ما بدأ لسا', 'Not started yet') : t(`${completedCount} من ${totalCount} مكتمل`, `${completedCount} of ${totalCount} done`)

  // ── Cards: setup guides (new user) or actionable nudges (normal/after) ──
  const cards =
    state === 'newUser'
      ? buildSetupCards(t)
      : state === 'afterWorkout'
        ? buildAfterWorkoutNudges({ t, recoveryAvailable, proteinRemaining })
        : state === 'returnAfterBreak'
          ? buildReturnNudges({ t })
          : buildNormalNudges({ t, proteinRemaining, loggedMeal, movementAvailable, stepsRemaining, nutritionTarget })

  // ── Trust note (single, honest, only when something is genuinely unknown) ──
  let trustNote: string | null = null
  if (state !== 'newUser') {
    if (!movementAvailable) trustNote = t('ما نعرض خطوات وهمية — مصدر الحركة مو مربوط.', 'No fake steps — movement source not connected.')
    else if (!loggedMeal && nutritionTarget) trustNote = t('ما فيه وجبات مسجّلة اليوم لسا.', 'No meals logged yet today.')
  }

  return { state, greeting, dateLabel, avatarInitial, goalLabel, hero, pillars, progressLabel, completedCount, totalCount, cards, dailyPhrase: phraseForDay(now, lang), trustNote, restDay }
}

// ── Hero builders ────────────────────────────────────────────────────────────

function buildHero(a: {
  t: (ar: string, en: string) => string
  state: TodayState
  workoutAvailable: boolean
  workoutName: string
  exerciseCount: number
  durationMin: number
  finishedName: string
  proteinRemaining: number | null
  nutritionTarget: boolean
  loggedMeal: boolean
}): TodayHero {
  const { t, state, workoutAvailable, workoutName, exerciseCount, durationMin, finishedName, proteinRemaining } = a
  const withPrefix = (n: string) => (n.startsWith('تمرين') ? n : `تمرين ${n}`)

  if (state === 'afterWorkout') {
    const doneLine = finishedName ? t(`خلّصت ${withPrefix(finishedName)}`, `Finished ${finishedName}`) : t('خلّصت تمرين اليوم', 'Workout done')
    if (proteinRemaining !== null && proteinRemaining > 0) {
      return {
        eyebrow: doneLine,
        eyebrowDone: true,
        title: t('سجّل أكلك بعد التمرين', 'Log your post-workout meal'),
        subtitle: t(`بروتين الحين يسرّع التعافي · باقي ${proteinRemaining}g`, `Protein now speeds recovery · ${proteinRemaining}g left`),
        ctaLabel: t('سجّل أكلك', 'Log your food'),
        ctaTone: 'green',
        destination: 'nutrition',
      }
    }
    // protein goal met (or no target) → recovery-first, still a real next action
    return {
      eyebrow: doneLine,
      eyebrowDone: true,
      title: proteinRemaining === 0 ? t('كمّلت بروتين اليوم', 'Protein goal met') : t('خذ قسطك من الراحة', 'Take your recovery'),
      subtitle: t('راحة زينة الليلة تثبّت تقدّمك.', 'Good rest tonight locks in your progress.'),
      ctaLabel: t('شوف التقدّم', 'View progress'),
      ctaTone: 'green',
      destination: 'progress',
    }
  }

  if (state === 'returnAfterBreak') {
    // Blameless re-entry: warm welcome + an HONEST suggestion. The CTA opens
    // today's real plan — the "15 minutes" is guidance to ease in (do the first
    // part), NOT a separate generated session. No fake dual-option.
    return {
      eyebrow: t('حيّاك من جديد', 'Good to have you back'),
      eyebrowDone: false,
      title: t('ارجع بهدوء اليوم', 'Ease back in today'),
      subtitle: t('ابدأ بأول ١٥ دقيقة من خطتك وكمّل إذا حبيت · تقدّمك السابق محفوظ', 'Do the first 15 minutes of your plan, keep going if you feel like it · your progress is saved'),
      ctaLabel: t('ابدأ تمرين اليوم', 'Start today’s workout'),
      ctaTone: 'ember',
      destination: 'workout',
    }
  }

  if (state === 'newUser') {
    if (workoutAvailable) {
      return {
        eyebrow: t('أول خطوة معنا', 'Your first step with us'),
        eyebrowDone: false,
        title: t('ابدأ تمرينك الأول', 'Start your first workout'),
        subtitle: t(`خطتك جاهزة · ${workoutName} · ${durationMin} دقيقة`, `Your plan is ready · ${workoutName} · ${durationMin} min`),
        ctaLabel: t('ابدأ التمرين', 'Start workout'),
        ctaTone: 'ember',
        destination: 'workout',
      }
    }
    return {
      eyebrow: t('أول خطوة معنا', 'Your first step with us'),
      eyebrowDone: false,
      title: t('كمّل إعداد خطتك', 'Finish setting up your plan'),
      subtitle: t('دقيقتين ونجهّز تمرينك وتغذيتك.', 'Two minutes to build your training and nutrition.'),
      ctaLabel: t('ابدأ الإعداد', 'Start setup'),
      ctaTone: 'ember',
      destination: 'setup',
    }
  }

  // normal
  if (workoutAvailable) {
    return {
      eyebrow: t('خطوتك الجاية · الحين', 'Your next step · now'),
      eyebrowDone: false,
      title: t(withPrefix(workoutName), workoutName),
      subtitle: t(`${exerciseCount} تمارين · ${durationMin} دقيقة · جاهز لك`, `${exerciseCount} exercises · ${durationMin} min · ready for you`),
      ctaLabel: t('ابدأ التمرين', 'Start workout'),
      ctaTone: 'ember',
      destination: 'workout',
    }
  }
  // rest day / no workout scheduled → next best real action
  if (a.nutritionTarget && !a.loggedMeal) {
    return {
      eyebrow: t('خطوتك الجاية · الحين', 'Your next step · now'),
      eyebrowDone: false,
      title: t('سجّل وجبتك الجاية', 'Log your next meal'),
      subtitle: proteinRemaining !== null && proteinRemaining > 0 ? t(`باقي ${proteinRemaining}g بروتين لهدف اليوم`, `${proteinRemaining}g protein left today`) : t('يوم راحة — أكلك يصنع الفرق.', 'Rest day — food makes the difference.'),
      ctaLabel: t('سجّل أكلك', 'Log your food'),
      ctaTone: 'ember',
      destination: 'nutrition',
    }
  }
  return {
    eyebrow: t('خطوتك الجاية · الحين', 'Your next step · now'),
    eyebrowDone: false,
    title: t('شوف تقدّمك', 'Check your progress'),
    subtitle: t('يوم راحة — حركة خفيفة تكفي اليوم.', 'Rest day — light movement is enough today.'),
    ctaLabel: t('شوف التقدّم', 'View progress'),
    ctaTone: 'ember',
    destination: 'progress',
  }
}

// ── Card builders ────────────────────────────────────────────────────────────

/** New-user setup guides — always the three first-steps, never empty rings. */
function buildSetupCards(t: (ar: string, en: string) => string): TodayCard[] {
  return [
    { label: t('سجّل أول وجبة عشان نضبط سعراتك', 'Log your first meal to set your calories'), hint: null, actionLabel: t('سجّل', 'Log'), icon: 'Utensils', tone: 'nutrition', destination: 'nutrition' },
    { label: t('سجّل وزنك الحالي · نقطة البداية', 'Log your current weight · your baseline'), hint: null, actionLabel: t('سجّل', 'Log'), icon: 'TrendingUp', tone: 'progress', destination: 'progress' },
    { label: t('فعّل التذكيرات · لا يفوتك تمرين', 'Turn on reminders · never miss a workout'), hint: null, actionLabel: t('فعّل', 'Enable'), icon: 'Bell', tone: 'recover', destination: 'settings' },
  ]
}

/** Normal-day nudges — 2–3, each a verb + destination, never a dead stat. */
function buildNormalNudges(a: {
  t: (ar: string, en: string) => string
  proteinRemaining: number | null
  loggedMeal: boolean
  movementAvailable: boolean
  stepsRemaining: number | null
  nutritionTarget: boolean
}): TodayCard[] {
  const { t, proteinRemaining, loggedMeal, movementAvailable, stepsRemaining, nutritionTarget } = a
  const cards: TodayCard[] = []
  if (proteinRemaining !== null && proteinRemaining > 0) {
    cards.push({ label: t(`باقي ${proteinRemaining}g بروتين لهدف اليوم`, `${proteinRemaining}g protein left for today’s goal`), hint: null, actionLabel: t('أضف', 'Add'), icon: 'Flame', tone: 'nutrition', destination: 'nutrition' })
  } else if (nutritionTarget && !loggedMeal) {
    cards.push({ label: t('سجّل أول وجبة عشان نضبط سعراتك', 'Log your first meal to set your calories'), hint: null, actionLabel: t('سجّل', 'Log'), icon: 'Utensils', tone: 'nutrition', destination: 'nutrition' })
  }
  if (movementAvailable && (stepsRemaining ?? 0) > 0) {
    cards.push({ label: t(`امشِ ${num(stepsRemaining as number)} خطوة وتكمّل هدفك`, `Walk ${num(stepsRemaining as number)} steps to finish your goal`), hint: null, actionLabel: '', icon: 'Activity', tone: 'move', destination: 'progress' })
  } else if (!movementAvailable) {
    cards.push({ label: t('فعّل عدّاد الخطوات وتابع حركتك', 'Turn on the step counter to track movement'), hint: null, actionLabel: t('فعّل', 'Enable'), icon: 'Activity', tone: 'move', destination: 'settings' })
  }
  if (cards.length < 2) {
    cards.push({ label: t('سجّل وزنك الحالي · نقطة البداية', 'Log your current weight · your baseline'), hint: null, actionLabel: t('سجّل', 'Log'), icon: 'TrendingUp', tone: 'progress', destination: 'progress' })
  }
  return cards.slice(0, 3)
}

/**
 * Return-after-break nudges — the full-plan alternative + a look back at saved
 * progress. Rule D: both are explicit choices the user taps; nothing is applied
 * automatically. Both open today's real plan — the hero frames easing in, this
 * card frames doing the whole session; there is no separate light-workout yet.
 */
function buildReturnNudges(a: { t: (ar: string, en: string) => string }): TodayCard[] {
  const { t } = a
  // No "full plan" alternative here — it would open the SAME plan as the hero
  // CTA (there is no separate light session), so offering it as a distinct
  // choice would be a false promise. Just reassure that progress is intact.
  return [
    { label: t('شوف تقدّمك — محفوظ بالكامل', 'Check your progress — fully saved'), hint: null, actionLabel: t('عرض', 'View'), icon: 'TrendingUp', tone: 'progress', destination: 'progress' },
  ]
}

/** After-workout nudges — recovery + a real look-back, each with a destination. */
function buildAfterWorkoutNudges(a: { t: (ar: string, en: string) => string; recoveryAvailable: boolean; proteinRemaining: number | null }): TodayCard[] {
  const { t, recoveryAvailable } = a
  const cards: TodayCard[] = []
  if (recoveryAvailable) {
    cards.push({ label: t('تذكيرات المساء · مكمّلاتك قبل النوم', 'Evening reminders · supplements before bed'), hint: null, actionLabel: t('عرض', 'View'), icon: 'Moon', tone: 'recover', destination: 'settings' })
  }
  cards.push({ label: t('شوف ملخّص تمرين اليوم', 'View today’s workout summary'), hint: null, actionLabel: t('عرض', 'View'), icon: 'Trophy', tone: 'progress', destination: 'progress' })
  return cards.slice(0, 3)
}
