// إحصاءات تمرين مشتقّة من الجلسات المحفوظة (سلسلة، إنجاز الأسبوع، مدة تقديرية).

import type { PlanDay } from '@/types/workout'
import { getDayStamp } from './today'
import { loadSessions, type WorkoutSession } from './workoutSessions'

/** أيام التمرين المنجزة الفريدة (جلسة منتهية) مرتّبة تنازليًا. */
function finishedDays(sessions: WorkoutSession[]): string[] {
  const days = new Set<string>()
  sessions.forEach((s) => {
    if (s.finishedAt) days.add(s.date)
  })
  return [...days].sort().reverse()
}

function dayStampOffset(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return getDayStamp(d)
}

/** سلسلة الأيام المتتالية المنتهية حتى اليوم أو الأمس. */
export function workoutStreak(sessions = loadSessions()): number {
  const days = new Set(finishedDays(sessions))
  if (days.size === 0) return 0
  // ابدأ من اليوم؛ وإن لم يتمرّن اليوم بعد لكن تمرّن أمس نبدأ من الأمس.
  let start = 0
  if (!days.has(dayStampOffset(0))) {
    if (days.has(dayStampOffset(1))) start = 1
    else return 0
  }
  let count = 0
  for (let i = start; ; i++) {
    if (days.has(dayStampOffset(i))) count++
    else break
  }
  return count
}

/** عدد أيام التمرين المنتهية خلال آخر ٧ أيام. */
export function weeklyCompleted(sessions = loadSessions()): number {
  const recent = new Set<string>()
  for (let i = 0; i < 7; i++) recent.add(dayStampOffset(i))
  return finishedDays(sessions).filter((d) => recent.has(d)).length
}

// ═══ مدّة الجلسة — مقدِّر واحد لا خمسة · [SOVEREIGN-PLAN-004] ═══
//
// كانت في المستودع خمسة تنفيذات حيّة تختلف عن بعضها، فتُعلن ثلاث شاشات ثلاثة
// أرقام **لنفس الجلسة**: «اليوم» ٧٥ · شريحة WorkoutV2 ٥٥ · شاشة التمرين ٤٠.
// الـ٧٥ لم تكن تقديرًا أصلًا بل **تفضيل المستخدم المُعلَن** في الإعداد، والـ٥٥
// heuristic «٩ دقائق لكل تمرين» لا يقرأ المجموعات ولا الراحة — فجلسة ٦ تمارين
// × ٣ مجموعات براحة ٤٥ث تساوي عندها جلسة ٦ × ٥ براحة ١٢٠ث.
//
// المقدِّر الواحد هنا يقرأ **ما هو مكتوب في الجلسة**: عدد التمارين، مجموعات كل
// تمرين، راحته، والإحماء — زائد بدل انتقال بين التمارين (مشي إلى المحطّة، تركيب
// الأقراص، ضبط الجهاز) كان مفقودًا من كل التنفيذات الخمسة.
//
// **الرقم تقدير مُعلَن كتقدير:** يُقرَّب لأقرب خمس دقائق كي لا يدّعي دقّة لا
// يملكها، ولا يُقدَّم أبدًا مقيسًا (المقيس هو `stats.minutes` بعد انتهاء الجلسة).

/** زمن أداء المجموعة الواحدة بالثواني — الوسط المعتمد منذ التنفيذ الأول. */
export const SET_WORK_SEC = 40
/** راحة افتراضية حين لا تحملها الجلسة. */
export const DEFAULT_REST_SEC = 60
/** بدل الانتقال بين تمرينين: محطّة جديدة، أقراص، ضبط مقعد. */
export const EXERCISE_TRANSITION_SEC = 60
/** إحماء افتراضي بالدقائق — يطابق ما يبنيه `buildWarmupPlan` فعليًا (١–٣ دقائق). */
export const DEFAULT_WARMUP_MIN = 2

export interface SessionEstimateOptions {
  /**
   * دقائق إحماء **هذه الجلسة** — مرِّر `buildWarmupPlan(day).estMinutes` حيث
   * تتوفّر، و`0` لاستبعاد الإحماء صراحةً. الافتراضي بدل عامّ لا رقم مخترع.
   * (تُمرَّر ولا تُحسب هنا كي يبقى المقدِّر نقيًا بلا تخزين ولا سجلّ تمارين.)
   */
  warmupMin?: number
}

/**
 * **المقدِّر المعتمد الوحيد** لمدّة جلسة بالدقائق.
 *
 * لكل تمرين: `مجموعات × (زمن المجموعة + راحتها)` — الراحة بعد المجموعة الأخيرة
 * هي الفاصل الحقيقي قبل التمرين التالي فلا تُطرَح — زائد بدل الانتقال. ثم الإحماء.
 * يُقرَّب لأقرب خمس دقائق، وحدّه الأدنى خمس. يوم بلا تمارين ⇒ صفر، لا حدّ أدنى.
 */
export function estimateSessionMinutes(day: PlanDay | undefined | null, opts: SessionEstimateOptions = {}): number {
  if (!day || day.exercises.length === 0) return 0
  const workSec = day.exercises.reduce((sum, pe) => {
    const sets = Math.max(1, pe.sets)
    const rest = pe.restSec > 0 ? pe.restSec : DEFAULT_REST_SEC
    return sum + sets * (SET_WORK_SEC + rest) + EXERCISE_TRANSITION_SEC
  }, 0)
  const warmupSec = Math.max(0, opts.warmupMin ?? DEFAULT_WARMUP_MIN) * 60
  return Math.max(5, Math.round((workSec + warmupSec) / 60 / 5) * 5)
}

/**
 * @deprecated [SOVEREIGN-PLAN-004] الاسم المعتمد هو `estimateSessionMinutes`.
 * تُفوِّض إليه حرفيًا (لا صيغة ثانية خلف اسم ثانٍ) وتبقى حتى تنتقل مواضع
 * الاستدعاء خارج هذه الحارة — `todayV2Model` و`WorkoutView`.
 */
export function estimateDurationMin(day: PlanDay | undefined): number {
  return estimateSessionMinutes(day)
}

/**
 * المقارنة بين **المدّة المُعلَنة** في الإعداد (تفضيل المستخدم الأسبوعي) و**تقدير
 * الجلسة** المُسلَّمة. رقمان مختلفان بلا تفسير يقرأهما المستخدم تناقضًا؛ وهذا
 * المشتقّ هو ما تبني عليه الواجهة جملتها (النصّ في القواميس، لا هنا).
 *
 * `withinTolerance` لأن فرق خمس دقائق تقريبٌ لا اختلاف — لا نُفسّر ما لا يُلاحَظ.
 */
export type SessionDurationFit = 'no-declared' | 'match' | 'shorter' | 'longer'

export interface SessionDurationComparison {
  fit: SessionDurationFit
  declaredMin: number
  estimatedMin: number
  /** فرق مطلق بالدقائق (صفر حين لا مُعلَن). */
  deltaMin: number
}

/** تسامح التقريب: فرق ≤ ٥ دقائق ليس اختلافًا يستحقّ تفسيرًا. */
export const SESSION_DURATION_TOLERANCE_MIN = 5

export function compareSessionDuration(declaredMin: number, estimatedMin: number): SessionDurationComparison {
  const declared = Number.isFinite(declaredMin) && declaredMin > 0 ? Math.round(declaredMin) : 0
  const estimated = Number.isFinite(estimatedMin) && estimatedMin > 0 ? Math.round(estimatedMin) : 0
  if (declared === 0 || estimated === 0) return { fit: 'no-declared', declaredMin: declared, estimatedMin: estimated, deltaMin: 0 }
  const delta = estimated - declared
  if (Math.abs(delta) <= SESSION_DURATION_TOLERANCE_MIN) return { fit: 'match', declaredMin: declared, estimatedMin: estimated, deltaMin: Math.abs(delta) }
  return { fit: delta < 0 ? 'shorter' : 'longer', declaredMin: declared, estimatedMin: estimated, deltaMin: Math.abs(delta) }
}
