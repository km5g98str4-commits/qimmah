// محرّك حالة جلسة التمرين (P5) — طبقة بيانات نقية، لا واجهة هنا (Codex يربط).
//
// المشكلة القديمة: أي جلسة لها finishedAt كانت تُحسب «يومًا مكتملًا»
// (todaysFinishedSession)، فالإنهاء المبكر يقلب اليوم إلى «أنهيت تمرينك» زورًا،
// والجلسة المستعادة القديمة لا تصنيف لها. هذه الوحدة تملك الحقيقة:
//   • حالة الجلسة: in_progress · completed · ended_early · abandoned —
//     تُختم عند الحفظ (persistFinishedSession) وتُحفظ على WorkoutSession.status
//     (الغياب = جلسة قديمة تُقرأ completed — توافق خلفي كامل).
//   • اكتمال اليوم: dayCompletion(date) = 'complete' فقط بجلسة completed؛
//     ended_early = partial بمعلومات صادقة (عدد التمارين/المجموعات المنجزة).
//   • الجلسة المهجورة: تصنيف فقط — **لا تُحذف المجموعات المنفَّذة أبدًا**.
//   • المجموعات/الأوزان/الأرقام القياسية من الجلسات الجزئية تبقى محسوبة
//     (تمرّ من persistFinishedSession → exerciseHistory كما هي — مُثبَت بالإثبات).
//   • إشعار نهاية الراحة: أحادي عند rest.endsAt عبر محرّك الإشعارات القائم
//     (kind='restEnd') — يُجدول عند بدء الراحة ويُلغى عند التخطّي/الإنهاء،
//     وإعادة الجدولة عند «+وقت» تستبدل القديم. لا-شيء على الويب وبلا إذن.
//
// ما لا يتغيّر (مقصود، تحرسه الإثباتات القائمة): الإنهاء المبكر يبقى مسموحًا
// بتأكيد؛ نافذة التراجع snapshot/restore؛ استعادة الجلسة بعد قتل التطبيق؛
// مؤقّت الراحة على endsAt؛ وdailyLogs.workoutCompleted تبقى «تمرّن هذا اليوم»
// (مؤشّر نشاط) لا «اكتمل اليوم» — الاكتمال الصادق مصدره dayCompletion هنا.

import type { SessionStatus, WorkoutSession } from '@/lib/workoutSessions'
import { getWorkoutSessions } from '@/lib/historyStore'
import { getDayStamp } from '@/lib/today'
import type { V2ActiveSnapshot } from '@/lib/workoutV2Persist'
import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'
import type { SessionPR } from '@/lib/finishWorkout'

import {
  cancelRestEndNotification,
  reconcileRestEndOnColdStart,
  type RestEndColdStartResult,
} from '@/lib/notifications/restEnd'

export type { SessionStatus } from '@/lib/workoutSessions'
// إعادة تصدير واجهة إشعار نهاية الراحة — سطح استيراد واحد لـCodex.
export {
  REST_END_NOTIFICATION_ID,
  cancelRestEndNotification,
  scheduleRestEndNotification,
  reconcileRestEndOnColdStart,
  pendingRestEnd,
  restEndPendingKey,
  type RestEndScheduleResult,
  type RestEndColdStartResult,
  type RestEndColdStartAction,
} from '@/lib/notifications/restEnd'

// ── حالة الجلسة ───────────────────────────────────────────────────────────────

/**
 * الحالة الفعلية لجلسة محفوظة — تحترم الجلسات القديمة:
 * status موجود → هو الحقيقة؛ غائب + finishedAt → 'completed' (قبل P5)؛
 * غائب بلا finishedAt → 'in_progress'.
 */
export function sessionStatus(session: WorkoutSession): SessionStatus {
  if (session.status) return session.status
  return session.finishedAt ? 'completed' : 'in_progress'
}

/**
 * تصنيف جلسة تُنهى الآن: 'completed' فقط حين اكتملت **كل** تمارين الجلسة
 * المطلوبة (exercise.completed = كل مجموعاته منجزة — يضبطها buildV2WorkoutSession)،
 * وإلا 'ended_early'. جلسة بلا تمارين = 'ended_early' (لا اكتمال بصفر عمل).
 */
export function classifyFinishedSession(session: WorkoutSession): Extract<SessionStatus, 'completed' | 'ended_early'> {
  if (!session.exercises.length) return 'ended_early'
  return session.exercises.every((e) => e.completed) ? 'completed' : 'ended_early'
}

/** يختم الحالة على جلسة تُنهى (نقية) — الإنهاء المبكر يبقى مسموحًا، فقط يُسمّى بصدق. */
export function withSessionStatus(session: WorkoutSession): WorkoutSession {
  return { ...session, status: classifyFinishedSession(session) }
}

// ── اكتمال اليوم (الصدق بدل «أي finishedAt») ─────────────────────────────────

export interface PartialDayInfo {
  session: WorkoutSession
  completedExercises: number
  totalExercises: number
  completedSets: number
  totalSets: number
  /** نسبة المجموعات المنجزة 0..100 — للعمود/الحلقة في الواجهة. */
  percent: number
}

export type DayCompletion =
  | { state: 'complete'; session: WorkoutSession }
  | { state: 'partial'; partial: PartialDayInfo }
  | { state: 'none' }

function partialInfo(session: WorkoutSession): PartialDayInfo {
  const totalExercises = session.exercises.length
  const completedExercises = session.exercises.filter((e) => e.completed).length
  let completedSets = 0
  let totalSets = 0
  for (const e of session.exercises) {
    const sets = e.sets ?? []
    totalSets += Math.max(e.targetSets, sets.length)
    completedSets += sets.filter((s) => s.completed).length
  }
  const percent = totalSets > 0 ? Math.max(0, Math.min(100, Math.round((completedSets / totalSets) * 100))) : 0
  return { session, completedExercises, totalExercises, completedSets, totalSets, percent }
}

/**
 * اكتمال يومٍ ما — **نقية** فوق قائمة جلسات تُمرَّر صراحة (افتراضيًا المتجر):
 *   • 'complete' فقط حين توجد جلسة بحالة فعلية completed في هذا التاريخ.
 *   • ended_early ⇒ 'partial' بمعلومات جزئية صادقة (لا يقلب اليوم مكتملًا).
 *   • abandoned/in_progress لا تُكمل اليوم ولا تُحسب جزئية منتهية.
 */
export function dayCompletion(date: string, sessions: readonly WorkoutSession[] = getWorkoutSessions()): DayCompletion {
  const daySessions = sessions.filter((s) => s.date === date)
  const complete = daySessions.find((s) => sessionStatus(s) === 'completed')
  if (complete) return { state: 'complete', session: complete }
  const endedEarly = daySessions.find((s) => sessionStatus(s) === 'ended_early')
  if (endedEarly) return { state: 'partial', partial: partialInfo(endedEarly) }
  return { state: 'none' }
}

/** البديل الصادق لـtodaysFinishedSession المهجورة — اكتمال اليوم الحالي. */
export function todaysCompletion(): DayCompletion {
  return dayCompletion(getDayStamp())
}

// ── الجلسة المهجورة (تصنيف فقط — لا حذف تلقائي أبدًا) ────────────────────────

/** عتبة الهجر: جلسة نشطة بدأت قبل ≥8 ساعات لم تعد «تمرينًا جاريًا» واقعيًا. */
export const ABANDONED_AFTER_MS = 8 * 60 * 60 * 1000

/**
 * تصنيف جلسة نشطة مستعادة (من localStorage بعد قتل التطبيق): قديمة عن العتبة
 * ⇒ 'abandoned'، وإلا تبقى 'in_progress'. **تصنيف بحت** — لا يحذف ولا يكتب شيئًا؛
 * قرار العرض/الحفظ للواجهة (القاعدة D).
 */
export function classifyRestoredSession(
  active: Pick<V2ActiveSnapshot, 'startedAt'>,
  nowMs: number = Date.now(),
  thresholdMs: number = ABANDONED_AFTER_MS,
): Extract<SessionStatus, 'in_progress' | 'abandoned'> {
  return nowMs - active.startedAt >= thresholdMs ? 'abandoned' : 'in_progress'
}

/**
 * يبني جلسة «مهجورة» قابلة للحفظ من اللقطة النشطة — المجموعات المنفَّذة تبقى
 * كاملة (لا حذف)، بلا finishedAt (لم تُنهَ)، وبحالة 'abandoned' صريحة.
 * الحفظ نفسه قرار للمستدعي عبر addSession (idempotent بالمعرّف).
 */
export function abandonedSessionFrom(
  active: V2ActiveSnapshot,
  model: WorkoutV2Model,
  opts: { date: string; nowMs: number },
): WorkoutSession {
  const built = buildV2WorkoutSession(active, model, { date: opts.date, finishedAtMs: opts.nowMs })
  return { ...built, finishedAt: undefined, status: 'abandoned' }
}

// ── عقد الاحتفال/الانتقال للواجهة (Codex) — أنواع + بُناة نقية ────────────────

export interface SessionStats {
  exercises: number
  sets: number
  minutes: number
  volume: number
}

/** حمولة شاشة الإنهاء/الاحتفال — ما يحتاجه Codex بالضبط. */
export interface FinishCelebration {
  nextExerciseId: string | null
  sessionStats: SessionStats
  prs: SessionPR[]
}

/** إحصاءات الجلسة من المجموعات المنجزة فعلًا (حجم = Σ وزن×تكرار للمنجز فقط). */
export function buildSessionStats(session: WorkoutSession): SessionStats {
  let sets = 0
  let volume = 0
  for (const e of session.exercises) {
    for (const s of e.sets ?? []) {
      if (!s.completed) continue
      sets += 1
      const w = Number.parseFloat(s.weightKg) || 0
      const r = Number.parseInt(s.actualReps, 10) || 0
      volume += w * r
    }
  }
  const started = Date.parse(session.startedAt)
  const finished = session.finishedAt ? Date.parse(session.finishedAt) : NaN
  const minutes = Number.isFinite(started) && Number.isFinite(finished) && finished > started
    ? Math.max(1, Math.round((finished - started) / 60_000))
    : 0
  return { exercises: session.exercises.filter((e) => e.completed || (e.sets ?? []).some((s) => s.completed)).length, sets, minutes, volume }
}

/**
 * التمرين التالي بعد فتحة معيّنة في خطة اليوم (انتقال «التالي» بين التمارين):
 * null = كانت الأخيرة (الواجهة تعرض الإنهاء). المطابقة بمعرّف الفتحة (slot id)
 * الثابت عبر الاستبدال، وتُرجع معرّف فتحة التمرين التالي.
 */
export function nextExerciseAfter(model: WorkoutV2Model, currentSlotId: string): string | null {
  const idx = model.exercises.findIndex((e) => e.id === currentSlotId)
  if (idx < 0 || idx + 1 >= model.exercises.length) return null
  return model.exercises[idx + 1].id
}

/** يبني حمولة الاحتفال كاملة — نقية؛ الواجهة تمرّر ما حسبته لحظة التأكيد. */
export function buildFinishCelebration(args: {
  session: WorkoutSession
  prs: SessionPR[]
  model?: WorkoutV2Model | null
  currentSlotId?: string | null
}): FinishCelebration {
  const nextExerciseId = args.model && args.currentSlotId ? nextExerciseAfter(args.model, args.currentSlotId) : null
  return { nextExerciseId, sessionStats: buildSessionStats(args.session), prs: args.prs }
}

// ═════════════════════════════════════════════════════════════════════════════
// مصالحة الإقلاع البارد للجلسة النشطة (P14) — طبقة بيانات، لا واجهة.
//
// المشكلة الحقيقية التي وجدها تدقيق P14: منطق الاستعادة كله يعيش داخل
// `src/views/WorkoutV2.tsx` (محرَّم عليّ)، وهو:
//   ① لا يصنّف الجلسة المهجورة إطلاقًا (classifyRestoredSession غير مستدعاة في
//      أي مكان في المستودع) — فجلسة عمرها ٣ أيام تُستأنف كأنها «جارية».
//   ② لا يلغي إشعار نهاية الراحة عند تجاهل الجلسة — فيبقى إشعار يتيم يرنّ.
//   ③ يخلط «JSON تالف» بـ«الخطة تغيّرت» في مسار حذف صامت واحد، فتُفقد المجموعات
//      المنفَّذة بلا أي تحذير.
// هذه الوحدة تغلّف القرار كاملًا فلا يبقى لـCodex إلا نداء واحد. العقد الحرفي
// للربط في docs/audit/P13-CODEX-HANDOFF.md §P14.
// ═════════════════════════════════════════════════════════════════════════════

/** مفتاح الجلسة النشطة v2 — نفس المفتاح الذي تستخدمه WorkoutV2 حرفيًا. */
export const ACTIVE_WORKOUT_KEY_BASE = 'qimmah:active-workout:v2'

export function activeWorkoutKey(ownerId: string | null | undefined): string {
  return `${ACTIVE_WORKOUT_KEY_BASE}:${ownerId ?? 'guest'}`
}

/** صفّ مجموعة كما يُخزّنه v2. */
export interface PersistedSetRow {
  weight: number
  reps: number
  done: boolean
}

/** لقطة الراحة المخزّنة — طابعان زمنيان (مقاومة لتجميد الخلفية وقتل التطبيق). */
export interface PersistedRest {
  endsAt: number
  durationSec: number
}

/** الشكل المخزّن للجلسة النشطة v2 (الحقول التي تلمسها هذه الطبقة). */
export interface PersistedActiveWorkout {
  exIndex: number
  setIndex: number
  startedAt: number
  rows: Record<string, PersistedSetRow[]>
  rest?: PersistedRest | null
  subs?: Record<string, string>
}

/**
 * هل القيمة جلسة نشطة صالحة **لهذه الخطة**؟ نسخة طبقة-بيانات من `isUsableSession`
 * في WorkoutV2 (تُمرَّر معرّفات فتحات الخطة فقط، فلا اعتماد على الواجهة).
 * localStorage يُعامل كمدخل معادٍ.
 */
export function isUsableActiveWorkout(
  value: unknown,
  exerciseIds: readonly string[],
): value is PersistedActiveWorkout {
  if (!value || typeof value !== 'object') return false
  if (exerciseIds.length === 0) return false
  const s = value as Partial<PersistedActiveWorkout>
  if (!Number.isInteger(s.exIndex) || (s.exIndex as number) < 0 || (s.exIndex as number) >= exerciseIds.length) return false
  if (!Number.isInteger(s.setIndex) || (s.setIndex as number) < 0) return false
  if (!Number.isInteger(s.startedAt)) return false
  if (!s.rows || typeof s.rows !== 'object') return false
  const rows = s.rows as Record<string, unknown>
  for (const id of exerciseIds) {
    const r = rows[id]
    if (!Array.isArray(r) || r.length === 0) return false
    for (const item of r) {
      if (!item || typeof item !== 'object') return false
      const row = item as Partial<PersistedSetRow>
      if (typeof row.weight !== 'number' || typeof row.reps !== 'number' || typeof row.done !== 'boolean') return false
    }
  }
  if (s.rest != null) {
    const r = s.rest as Partial<PersistedRest>
    if (typeof r.endsAt !== 'number' || typeof r.durationSec !== 'number') return false
  }
  if (s.subs != null) {
    if (typeof s.subs !== 'object') return false
    for (const [k, v] of Object.entries(s.subs as Record<string, unknown>)) {
      if (typeof k !== 'string' || typeof v !== 'string') return false
    }
  }
  const curRows = rows[exerciseIds[s.exIndex as number]] as PersistedSetRow[]
  if ((s.setIndex as number) >= curRows.length) return false
  return true
}

/** يقرأ الجلسة المخزّنة كما هي (بلا تحقّق) — null عند الغياب/التلف. */
export function readPersistedActiveWorkout(ownerId: string | null | undefined): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(activeWorkoutKey(ownerId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** يمسح مفتاح الجلسة النشطة لهذا المالك فقط. لا يرمي. */
export function clearPersistedActiveWorkout(ownerId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(activeWorkoutKey(ownerId))
  } catch {
    /* تخزين محجوب */
  }
}

/** حالة الراحة عند الاستعادة: لا راحة · جارية · انتهت أثناء موت التطبيق. */
export type RestoredRestState = 'none' | 'running' | 'elapsed'

export type ColdStartAction = 'none' | 'resume' | 'abandoned' | 'discard'

export interface ColdStartDecision {
  action: ColdStartAction
  /** الجلسة الصالحة (resume/abandoned فقط). */
  session: PersistedActiveWorkout | null
  /** سبب التجاهل — يفرّق «تالف» عن «الخطة تغيّرت» (كانت مدمَجة في حذف صامت). */
  discardReason: 'none' | 'empty' | 'malformed' | 'plan-changed'
  restState: RestoredRestState
  /** الثواني المتبقية للراحة، محسوبة من endsAt لا من عدّاد (0 عند none/elapsed). */
  restRemainingSec: number
  /** endsAt للراحة المستعادة أو null. */
  restEndsAt: number | null
  /** عمر الجلسة بالمللي ثانية (الآن − startedAt) — أساس عتبة الهجر. */
  ageMs: number
  /** عدد المجموعات المنجزة داخل الجلسة — يمنع «حذفًا صامتًا» لعمل حقيقي. */
  completedSets: number
}

function countCompletedSets(rows: Record<string, PersistedSetRow[]> | undefined): number {
  if (!rows || typeof rows !== 'object') return 0
  let n = 0
  for (const list of Object.values(rows)) {
    if (!Array.isArray(list)) continue
    for (const row of list) if (row && typeof row === 'object' && row.done === true) n += 1
  }
  return n
}

/**
 * القرار **النقي** للإقلاع البارد — بلا أي أثر جانبي، فيُختبر مباشرة:
 *   • لا شيء مخزّن                       ⇒ none
 *   • غير صالح للخطة الحالية             ⇒ discard('plan-changed'|'malformed')
 *   • صالح وعمره ≥ العتبة (٨ ساعات)     ⇒ abandoned (تصنيف فقط — لا حذف)
 *   • صالح وحديث                         ⇒ resume + حالة الراحة محسوبة من endsAt
 */
export function decideColdStart(args: {
  persisted: unknown
  exerciseIds: readonly string[]
  nowMs?: number
  thresholdMs?: number
}): ColdStartDecision {
  const nowMs = args.nowMs ?? Date.now()
  const threshold = args.thresholdMs ?? ABANDONED_AFTER_MS
  const base: ColdStartDecision = {
    action: 'none',
    session: null,
    discardReason: 'none',
    restState: 'none',
    restRemainingSec: 0,
    restEndsAt: null,
    ageMs: 0,
    completedSets: 0,
  }
  if (args.persisted == null) return base

  if (!isUsableActiveWorkout(args.persisted, args.exerciseIds)) {
    // «الخطة تغيّرت» = جلسة معقولة بنيويًا (بدء + صفوف) لكن لا تطابق خطة اليوم.
    const shape = args.persisted as Partial<PersistedActiveWorkout>
    const plausible =
      typeof args.persisted === 'object' &&
      Number.isInteger(shape.startedAt) &&
      !!shape.rows &&
      typeof shape.rows === 'object'
    return {
      ...base,
      action: 'discard',
      discardReason: plausible ? 'plan-changed' : 'malformed',
      ageMs: plausible && Number.isInteger(shape.startedAt) ? Math.max(0, nowMs - (shape.startedAt as number)) : 0,
      completedSets: plausible ? countCompletedSets(shape.rows) : 0,
    }
  }

  const session = args.persisted
  const ageMs = Math.max(0, nowMs - session.startedAt)
  const restEndsAt = session.rest?.endsAt ?? null
  const restState: RestoredRestState = restEndsAt === null ? 'none' : restEndsAt > nowMs ? 'running' : 'elapsed'
  const restRemainingSec = restState === 'running' ? Math.max(0, Math.ceil(((restEndsAt as number) - nowMs) / 1000)) : 0
  const completedSets = countCompletedSets(session.rows)

  return {
    action: classifyRestoredSession({ startedAt: session.startedAt }, nowMs, threshold) === 'abandoned' ? 'abandoned' : 'resume',
    session,
    discardReason: 'none',
    restState,
    restRemainingSec,
    restEndsAt,
    ageMs,
    completedSets,
  }
}

/**
 * هل حُفظت هذه الجلسة في التاريخ من قبل؟ معرّف v2 مبذور بـstartedAt
 * (`session-v2-<startedAt>`) فالحفظ idempotent — هذا الفحص يمنع **الحفظ المزدوج**
 * بعد «استعادة ثم إنهاء» أو بعد حفظ مهجورة مرّتين.
 */
export function isActiveWorkoutAlreadySaved(
  startedAt: number,
  sessions: readonly WorkoutSession[] = getWorkoutSessions(),
): boolean {
  const id = `session-v2-${startedAt}`
  return sessions.some((s) => s.id === id)
}

export interface ColdStartReconciliation {
  decision: ColdStartDecision
  /** ما حدث لإشعار نهاية الراحة المعلّق. */
  restEnd: RestEndColdStartResult
  /** هل الجلسة محفوظة أصلًا في التاريخ؟ (حماية من الحفظ المزدوج) */
  alreadySaved: boolean
  /** هل مُسح مفتاح الجلسة فعلًا؟ (يحدث في discard الفاسد وحده) */
  clearedKey: boolean
}

/**
 * **النداء الوحيد** الذي يحتاجه Codex عند الإقلاع البارد (mount الأوّل لشاشة
 * التمرين). يفعل بالترتيب:
 *   ① يقرأ الجلسة المخزّنة ويقرّر (decideColdStart).
 *   ② يصالح إشعار نهاية الراحة: بائت (endsAt مضى) ⇒ إلغاء + إزالة من مركز
 *      الإشعارات؛ يتيم (لا راحة جارية) ⇒ إلغاء؛ راحة ما زالت جارية ⇒ يُترك.
 *   ③ 'malformed' ⇒ يمسح المفتاح (لا عمل فيه يُفقد).
 *      'plan-changed' ⇒ **لا يمسح**: قد تكون فيه مجموعات منفَّذة (completedSets)،
 *      والقرار للواجهة بعد إشعار المستخدم — لا حذف صامت من طبقة البيانات.
 *   ④ يخبر عن alreadySaved حتى لا يُحفظ نفس startedAt مرتين.
 * لا يرمي أبدًا.
 */
export async function reconcileWorkoutColdStart(args: {
  ownerId: string | null | undefined
  exerciseIds: readonly string[]
  nowMs?: number
  thresholdMs?: number
}): Promise<ColdStartReconciliation> {
  const nowMs = args.nowMs ?? Date.now()
  const persisted = readPersistedActiveWorkout(args.ownerId)
  const decision = decideColdStart({ persisted, exerciseIds: args.exerciseIds, nowMs, thresholdMs: args.thresholdMs })

  // الراحة «الجارية» وحدها تبرّر إبقاء إشعار مجدول؛ أي شيء آخر يتيم أو بائت.
  const activeRestEndsAt = decision.action === 'resume' && decision.restState === 'running' ? decision.restEndsAt : null
  const restEnd = await reconcileRestEndOnColdStart({ ownerId: args.ownerId, activeRestEndsAt, nowMs })

  let clearedKey = false
  if (decision.action === 'discard' && decision.discardReason === 'malformed') {
    clearPersistedActiveWorkout(args.ownerId)
    clearedKey = true
  }

  const alreadySaved = decision.session ? isActiveWorkoutAlreadySaved(decision.session.startedAt) : false
  return { decision, restEnd, alreadySaved, clearedKey }
}

/**
 * إنهاء الجلسة من ناحية الإشعارات: يُستدعى عند التخطّي/الإنهاء/التجاهل/حفظ
 * المهجورة — يلغي إشعار الراحة ويمسح أثره المعلّق. مساعد رقيق يمنع نسيان الأثر.
 */
export async function releaseRestEndForSession(ownerId: string | null | undefined): Promise<void> {
  await cancelRestEndNotification({ ownerId })
}
