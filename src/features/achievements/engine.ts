// محرّك الأوسمة (local-first) — يقيّم شروط الفتح من السجلّ المحلي الموجود،
// يفتح الوسام مرّة واحدة، يحفظه في localStorage، ويطلق احتفالًا (toast) عند الفتح.
//
// مبادئ:
// - لا يرمي استثناءات أبدًا (يعمل في وضع الضيف وبلا window).
// - مصدر الحقيقة للبيانات هو المتجر التاريخي الدائم + سجل الخطوات (لا تكرار للتخزين).
// - ما لا يُحفظ تاريخيًا (بروتين اليوم، أحداث الأرقام القياسية) يُشتقّ ويُراكم هنا.

import {
  ACHIEVEMENTS,
  getAchievement,
  type AchievementDef,
  type AchievementMetric,
} from '@/data/achievements'
import { getNutritionLogs, getWorkoutSessions } from '@/lib/historyStore'
import { bestWorkoutStreak, weeklyAdherenceStreak } from '@/lib/streaks'
import { loadStepGoal, loadStepLog } from '@/lib/stepCounter'
import { getDayStamp } from '@/lib/today'

export const ACHIEVEMENTS_KEY = 'qimmah:achievements:v1'

/** الحالة المحفوظة للأوسمة. */
export interface AchievementState {
  /** معرّف الوسام → ختم اليوم الذي فُتح فيه (YYYY-MM-DD). */
  unlocked: Record<string, string>
  /** تواريخ الأيام التي أُقفل فيها هدف البروتين (مجموعة بلا تكرار). */
  proteinDays: string[]
  /** مجموع الأرقام القياسية المحقّقة عبر كل الجلسات. */
  prCount: number
}

/** المقاييس المحسوبة لحظيًا للمقارنة مع عتبات الأوسمة. */
export type AchievementStats = Record<AchievementMetric, number>

/** مدخلات التقييم التي لا تُشتقّ من التخزين (بروتين اليوم + عدد أيام الخطة). */
export interface EvaluateInput {
  /** بروتين اليوم المُسجّل (غرام). */
  proteinToday?: number
  /** هدف البروتين اليومي (غرام). */
  proteinTarget?: number
  /** عدد أيام التمرين في الأسبوع (من الخطة) لحساب الالتزام الأسبوعي. */
  daysPerWeek?: number
  /** ختم اليوم (اختباري) — افتراضيًا اليوم الحالي. */
  today?: string
}

/** احتفال معلّق يعرضه الـ toaster (وسام جديد أو رقم قياسي). */
export type Celebration =
  | { key: string; kind: 'medal'; title: string; description: string; emoji: string }
  | { key: string; kind: 'pr'; title: string; body: string; emoji: string }

// ————————————————————————————————————————————————————————————————
// حفظ/قراءة الحالة
// ————————————————————————————————————————————————————————————————

function freshState(): AchievementState {
  return { unlocked: {}, proteinDays: [], prCount: 0 }
}

export function loadAchievementState(): AchievementState {
  if (typeof window === 'undefined') return freshState()
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return freshState()
    const p = JSON.parse(raw) as Partial<AchievementState>
    return {
      unlocked: p.unlocked && typeof p.unlocked === 'object' ? p.unlocked : {},
      proteinDays: Array.isArray(p.proteinDays) ? p.proteinDays.filter((d) => typeof d === 'string') : [],
      prCount: typeof p.prCount === 'number' && p.prCount >= 0 ? p.prCount : 0,
    }
  } catch {
    return freshState()
  }
}

function saveState(state: AchievementState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state))
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

// ————————————————————————————————————————————————————————————————
// اشتراك التحديث + طابور الاحتفالات
// ————————————————————————————————————————————————————————————————

let version = 0
const versionListeners = new Set<() => void>()
const celebrationListeners = new Set<() => void>()
let celebrationQueue: Celebration[] = []
let seq = 0

function nextKey(prefix: string): string {
  seq += 1
  const t = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0
  return `${prefix}-${seq}-${t}`
}

function bumpVersion(): void {
  version += 1
  versionListeners.forEach((l) => l())
}

function notifyCelebrations(): void {
  celebrationListeners.forEach((l) => l())
}

/** رقم إصدار الحالة — لإعادة رسم الواجهة عند أي فتح جديد. */
export function getAchievementVersion(): number {
  return version
}

export function subscribeAchievements(cb: () => void): () => void {
  versionListeners.add(cb)
  return () => {
    versionListeners.delete(cb)
  }
}

export function subscribeCelebrations(cb: () => void): () => void {
  celebrationListeners.add(cb)
  return () => {
    celebrationListeners.delete(cb)
  }
}

/** الطابور الحالي للاحتفالات (مرجع ثابت حتى يتغيّر فعليًا). */
export function getCelebrationQueue(): Celebration[] {
  return celebrationQueue
}

function enqueueCelebration(c: Celebration): void {
  celebrationQueue = [...celebrationQueue, c]
}

/** يزيل احتفالًا بعد عرضه/إغلاقه. */
export function dismissCelebration(key: string): void {
  const next = celebrationQueue.filter((c) => c.key !== key)
  if (next.length !== celebrationQueue.length) {
    celebrationQueue = next
    notifyCelebrations()
  }
}

// ————————————————————————————————————————————————————————————————
// حساب المقاييس
// ————————————————————————————————————————————————————————————————

/** أطول سلسلة أيام متتالية من مجموعة تواريخ (YYYY-MM-DD). */
function bestConsecutiveDays(dates: string[]): number {
  const sorted = [...new Set(dates)].sort()
  if (sorted.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const cur = new Date(sorted[i])
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      run += 1
      best = Math.max(best, run)
    } else if (diff > 1) {
      run = 1
    }
  }
  return best
}

/** تواريخ الأيام التي بلغت فيها الخطوات الهدف اليومي. */
function stepGoalDays(): string[] {
  const log = loadStepLog()
  const goal = loadStepGoal()
  if (goal <= 0) return []
  return Object.entries(log)
    .filter(([, steps]) => steps >= goal)
    .map(([date]) => date)
}

/** عدد الأيام التي سُجّلت فيها وجبة (علامة وجبة واحدة على الأقل). */
function mealLoggedDays(): number {
  const logs = getNutritionLogs()
  return Object.values(logs).filter((l) => Object.values(l.doneMeals ?? {}).some(Boolean)).length
}

/** يحسب كل المقاييس من الحالة المحفوظة + السجلّ المحلي. */
export function computeStats(state: AchievementState, input: EvaluateInput = {}): AchievementStats {
  const finishedWorkouts = getWorkoutSessions().filter((s) => s.finishedAt).length
  const daysPerWeek = Math.max(1, Math.floor(input.daysPerWeek || 3))
  const weekly = weeklyAdherenceStreak(daysPerWeek)
  const steps = stepGoalDays()

  return {
    finishedWorkouts,
    workoutStreakBest: bestWorkoutStreak(),
    weeklyStreakBest: weekly.streakWeeks,
    proteinDaysTotal: state.proteinDays.length,
    stepDaysTotal: steps.length,
    stepStreakBest: bestConsecutiveDays(steps),
    mealDaysTotal: mealLoggedDays(),
    prCountTotal: state.prCount,
  }
}

// ————————————————————————————————————————————————————————————————
// التقييم والفتح
// ————————————————————————————————————————————————————————————————

/**
 * يقيّم كل الأوسمة: يراكم يوم البروتين إن تحقّق، يفتح ما استوفى شرطه (مرّة واحدة)،
 * يحفظ الحالة، ويطلق احتفالًا لكل وسام جديد. يُرجع الأوسمة المفتوحة حديثًا.
 */
export function evaluateAchievements(input: EvaluateInput = {}): AchievementDef[] {
  const state = loadAchievementState()
  let changed = false

  // 1) راكم يوم البروتين إن أُقفل الهدف اليوم (idempotent — لا تكرار).
  const target = input.proteinTarget ?? 0
  const eaten = input.proteinToday ?? 0
  const today = input.today ?? getDayStamp()
  if (target > 0 && eaten >= target && !state.proteinDays.includes(today)) {
    state.proteinDays = [...state.proteinDays, today]
    changed = true
  }

  // 2) احسب المقاييس وافتح ما استوفى شرطه ولم يُفتح بعد.
  const stats = computeStats(state, input)
  const newlyUnlocked: AchievementDef[] = []
  for (const def of ACHIEVEMENTS) {
    if (state.unlocked[def.id]) continue
    if (stats[def.metric] >= def.threshold) {
      state.unlocked[def.id] = today
      newlyUnlocked.push(def)
      enqueueCelebration({
        key: nextKey('medal'),
        kind: 'medal',
        title: def.title,
        description: def.description,
        emoji: def.emoji,
      })
      changed = true
    }
  }

  if (changed) {
    saveState(state)
    bumpVersion()
    if (newlyUnlocked.length > 0) notifyCelebrations()
  }
  return newlyUnlocked
}

/** رقم قياسي جديد في جلسة. */
export interface PRCelebration {
  nameAr?: string
  nameEn?: string
  weight: number
}

/**
 * يسجّل الأرقام القياسية لجلسة منتهية: يزيد العدّاد، يطلق احتفالًا لكل PR،
 * ثم يعيد التقييم لفتح أوسمة الأرقام القياسية. آمن مع قائمة فارغة.
 */
export function registerWorkoutPRs(prs: PRCelebration[]): void {
  if (!prs || prs.length === 0) return
  const state = loadAchievementState()
  state.prCount += prs.length
  saveState(state)

  prs.forEach((pr) => {
    const name = pr.nameAr || pr.nameEn || 'تمرينك'
    enqueueCelebration({
      key: nextKey('pr'),
      kind: 'pr',
      title: 'رقم قياسي جديد! 💪',
      body: `${name} · ${pr.weight} كجم — رقم جديد ما وصلته قبل.`,
      emoji: '🎉',
    })
  })
  notifyCelebrations()

  // فتح أوسمة الأرقام القياسية (first-pr / pr-3 / pr-10) بناءً على العدّاد الجديد.
  evaluateAchievements()
}

// ————————————————————————————————————————————————————————————————
// عرض الأوسمة للواجهة
// ————————————————————————————————————————————————————————————————

export interface AchievementProgress {
  def: AchievementDef
  unlocked: boolean
  /** ختم يوم الفتح إن فُتح. */
  unlockedAt?: string
  /** القيمة الحالية للمقياس. */
  current: number
  /** العتبة المطلوبة. */
  threshold: number
  /** نسبة التقدّم 0..1. */
  ratio: number
}

export interface AchievementView {
  earned: AchievementProgress[]
  /** غير المفتوحة، مرتّبة بالأقرب للفتح أولًا. */
  upcoming: AchievementProgress[]
  earnedCount: number
  total: number
}

/** يبني عرض الأوسمة (مفتوحة + الأقرب للفتح) للبطاقة والشبكة. */
export function computeAchievementView(input: EvaluateInput = {}): AchievementView {
  const state = loadAchievementState()
  const stats = computeStats(state, input)

  const all: AchievementProgress[] = ACHIEVEMENTS.map((def) => {
    const current = stats[def.metric]
    const unlockedAt = state.unlocked[def.id]
    return {
      def,
      unlocked: !!unlockedAt,
      unlockedAt,
      current,
      threshold: def.threshold,
      ratio: def.threshold > 0 ? Math.min(1, current / def.threshold) : 0,
    }
  })

  const earned = all.filter((a) => a.unlocked)
  const upcoming = all.filter((a) => !a.unlocked).sort((a, b) => b.ratio - a.ratio)

  return { earned, upcoming, earnedCount: earned.length, total: ACHIEVEMENTS.length }
}

/** يمسح كل بيانات الأوسمة (يُستخدم مع إعادة الضبط أو الاختبار). */
export function resetAchievements(): void {
  celebrationQueue = []
  saveState(freshState())
  bumpVersion()
}

export { getAchievement }
