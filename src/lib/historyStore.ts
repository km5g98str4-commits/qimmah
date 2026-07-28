// المتجر التاريخي المحلي (local-first) — مصدر الحقيقة الدائم لكل سجلّات قِمّة.
//
// الهدف: ألّا تختفي أي بيانات بعد التحديث أو عند تغيّر اليوم. يعمل في وضع الضيف
// بالكامل عبر localStorage بمفاتيح ثابتة، ويصلح كطبقة تُزامَن لاحقًا مع السحابة.
//
// يحافظ على التوافق مع المفاتيح القديمة: عند أول تشغيل ينقل بياناتها بأمان
// (idempotent) إلى المفاتيح الجديدة دون حذف القديمة.

import type { SessionExercise, SetLog, WorkoutSession } from './workoutSessions'
import type { ExerciseHistory } from './exerciseHistory'
import type { MeasurementLog } from '@/types/progress'
import { readRaw, removeKey, writeJson, writeRaw } from './safeStorage'

// ختم اليوم المحلي (YYYY-MM-DD) — مكرّر هنا لكسر الاعتماد الدائري مع today.ts.
function dayStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// — مفاتيح المتجر الجديدة (الثابتة) —
export const HISTORY_KEYS = {
  workoutSessions: 'qimmah:history:workoutSessions:v1',
  exerciseHistory: 'qimmah:history:exerciseHistory:v1',
  dailyLogs: 'qimmah:history:dailyLogs:v1',
  measurementLogs: 'qimmah:history:measurementLogs:v1',
  nutritionLogs: 'qimmah:history:nutritionLogs:v1',
  waterLogs: 'qimmah:history:waterLogs:v1',
  supplementLogs: 'qimmah:history:supplementLogs:v1',
  medicationLogs: 'qimmah:history:medicationLogs:v1',
} as const

// — مفاتيح دفاتر المزامنة (لا تحمل بيانات المستخدم نفسها) —
// مُصدَّرة كي يشملها مسار «تصفير البيانات»؛ تركها بعد التصفير يُبقي شواهد حذف
// وطوابع تخصّ بيانات لم تعد موجودة.
export const SYNC_BOOKKEEPING_KEYS = {
  /** طابع آخر كتابة محلية لكل سجلّ (أساس LWW الحقيقي). */
  stamps: 'qimmah:history:stamps:v1',
  /** شواهد الحذف — كي لا يعود المحذوف من السحابة. */
  tombstones: 'qimmah:history:tombstones:v1',
} as const

const STAMPS_KEY = SYNC_BOOKKEEPING_KEYS.stamps
const TOMBSTONES_KEY = SYNC_BOOKKEEPING_KEYS.tombstones

// — مفاتيح قديمة للترحيل (لا تُحذف) —
const OLD_KEYS = {
  workoutSessions: 'qimmah:workoutSessions:v1',
  exerciseHistory: 'qimmah:exerciseHistory:v1',
  measurementLogs: 'qimmah:measurementLogs:v1',
  nutritionToday: 'qimmah:nutritionToday:v1',
  wellnessToday: 'qimmah:wellnessToday:v1',
  commitmentsToday: 'qimmah:commitmentsToday:v1',
} as const

const MIGRATION_FLAG = 'qimmah:history:migrated:v1'

// ————————————————————————————————————————————————————————————————
// أنواع السجلّات اليومية
// ————————————————————————————————————————————————————————————————

/** سجلّ تغذية ليوم واحد. */
export interface NutritionLog {
  date: string
  doneMeals: Record<string, boolean>
  waterMl?: number
  updatedAt: string
}

/** سجلّ ماء ليوم واحد (مل). */
export interface WaterLog {
  date: string
  waterMl: number
  updatedAt: string
}

/** سجلّ مكملات ليوم واحد. */
export interface SupplementLog {
  date: string
  done: Record<string, boolean>
  updatedAt: string
}

/** سجلّ أدوية ليوم واحد. */
export interface MedicationLog {
  date: string
  done: Record<string, boolean>
  updatedAt: string
}

/** لقطة يومية مجمّعة (للملخّص الأسبوعي والسلاسل). */
export interface DailyLog {
  date: string
  /** علامات «اليوم» العامة (today:v1). */
  done?: Record<string, boolean>
  /** ملاحظات/التزامات اليوم. */
  commitments?: { done: Record<string, boolean>; notes?: string }
  /** هل أُكملت جلسة تمرين في هذا اليوم؟ */
  workoutCompleted?: boolean
  updatedAt: string
}

// خرائط مفهرسة بالتاريخ
type ByDate<T> = Record<string, T>

// ————————————————————————————————————————————————————————————————
// مساعدات قراءة/كتابة JSON آمنة
// ————————————————————————————————————————————————————————————————

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * كتابة إلى المتجر الدائم عبر الطبقة الآمنة.
 * سابقًا كان الفشل يُبتلع صامتًا، فتظهر رسالة «تم الحفظ» بينما لم يُحفظ شيء؛
 * الآن يُسجَّل الفشل في safeStorage كي تقدر الواجهة تُخبر المستخدم بصدق.
 */
function writeJSON(key: string, value: unknown): boolean {
  return writeJson(key, value) === 'ok'
}

function nowISO(): string {
  return new Date().toISOString()
}

// ————————————————————————————————————————————————————————————————
// طوابع الكتابة المحلية (LWW) + شواهد الحذف (Tombstones)
// ————————————————————————————————————————————————————————————————
//
// المشكلة التي تُحلّ هنا:
//   1) لم يكن للجلسات/القياسات/سجل التمارين طابعُ تعديل حقيقي، فكان الدمج
//      «إضافة ما ليس موجودًا» فقط — أي تعديل من جهاز آخر يُهمَل بصمت.
//   2) لم يكن للحذف أي أثر، فالصف السحابي يبقى ثم يعود عند أول سحب.
//
// القرار التصميمي: لا نغيّر أنواع البيانات نفسها (WorkoutSession/MeasurementLog
// تعيش في ملفات أخرى ويستهلكها نصف التطبيق)، بل نحتفظ بسجلّ جانبي خفيف يربط
// «نوع السجلّ + معرّفه» بطابع آخر كتابة محلية. هذا متوافق رجعيًا تمامًا:
// البيانات القديمة بلا طابع تسقط على أساس احتياطي (finishedAt/startedAt/date).

/** أنواع السجلّات التي تُزامَن ولها معرّف مستقل. */
export type RecordKind = 'workoutSession' | 'measurementLog' | 'exerciseHistory' | 'dailyLog'

/** شاهد حذف: معرّف حُذف محليًا ومتى. */
export interface Tombstone {
  kind: RecordKind
  /** المعرّف المحلي (أو التاريخ للقطات اليومية). */
  id: string
  deletedAt: string
}

/** مدّة بقاء شاهد الحذف — بعدها يُقصّ حتى لا ينمو السجلّ بلا حدود. */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000

/** يحوّل طابعًا نصيًّا إلى ميلي ثانية (0 عند الغياب أو الفساد) للمقارنة الآمنة. */
export function stampToMs(iso?: string | null): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

type StampMap = Partial<Record<RecordKind, Record<string, string>>>

function readStamps(): StampMap {
  const m = readJSON<StampMap>(STAMPS_KEY, {})
  return m && typeof m === 'object' ? m : {}
}

/** طابع آخر كتابة محلية لسجلّ (undefined لبيانات قديمة سابقة لهذه الطبقة). */
export function getRecordStamp(kind: RecordKind, id: string): string | undefined {
  return readStamps()[kind]?.[id]
}

/** يثبّت طابع سجلّ واحد (الافتراضي: الآن). */
export function setRecordStamp(kind: RecordKind, id: string, at: string = nowISO()): void {
  if (!id) return
  const all = readStamps()
  all[kind] = { ...(all[kind] ?? {}), [id]: at }
  writeJSON(STAMPS_KEY, all)
}

/** يستبدل خريطة طوابع نوع كامل (تنظيف تلقائي لما لم يعد موجودًا). */
function replaceRecordStamps(kind: RecordKind, stamps: Record<string, string>): void {
  const all = readStamps()
  all[kind] = stamps
  writeJSON(STAMPS_KEY, all)
}

/**
 * يعيد ترقيم طوابع نوع كامل إلى «الآن» ويُسقط شواهد حذفه.
 * يُستخدم بعد استعادة نسخة مُصدّرة: البيانات المستعادة هي الأحدث بقرار المستخدم،
 * فلا يصحّ أن يحذفها شاهد حذف قديم فور أول مزامنة.
 */
function reindexStamps(kind: RecordKind, ids: string[]): void {
  const at = nowISO()
  const stamps: Record<string, string> = {}
  const alive = ids.filter(Boolean)
  alive.forEach((id) => {
    stamps[id] = at
  })
  replaceRecordStamps(kind, stamps)
  clearTombstones(alive.map((id) => ({ kind, id })))
}

/** يبقي طوابع المعرّفات الحيّة فقط. */
function pruneRecordStamps(kind: RecordKind, keepIds: Set<string>): void {
  const all = readStamps()
  const current = all[kind]
  if (!current) return
  const next: Record<string, string> = {}
  Object.keys(current).forEach((id) => {
    if (keepIds.has(id)) next[id] = current[id]
  })
  all[kind] = next
  writeJSON(STAMPS_KEY, all)
}

/** شواهد الحذف الحيّة (مقصوصة زمنيًا عند كل قراءة). */
export function getTombstones(): Tombstone[] {
  const raw = readJSON<Tombstone[]>(TOMBSTONES_KEY, [])
  if (!Array.isArray(raw)) return []
  const cutoff = Date.now() - TOMBSTONE_TTL_MS
  const alive = raw.filter(
    (t) => t && typeof t.id === 'string' && !!t.id && typeof t.kind === 'string' && stampToMs(t.deletedAt) >= cutoff,
  )
  // نكتب فقط عند حصول قصّ فعلي حتى لا نستهلك التخزين بلا داعٍ.
  if (alive.length !== raw.length) writeJSON(TOMBSTONES_KEY, alive)
  return alive
}

/**
 * يسجّل حذف سجلّ محليًا. تستدعيه منطق الحذف (مباشرةً أو عبر setWorkoutSessions/
 * setMeasurementLogs التي تكتشف الاختفاء تلقائيًا)، وتستهلكه طبقة المزامنة كي:
 *   (أ) تتجاهل الصف السحابي عند السحب، و(ب) تحذف نظيره السحابي عند الرفع.
 */
export function recordDeletion(kind: RecordKind, id: string, deletedAt: string = nowISO()): void {
  if (!id) return
  const list = getTombstones().filter((t) => !(t.kind === kind && t.id === id))
  list.push({ kind, id, deletedAt })
  writeJSON(TOMBSTONES_KEY, list)
  // لم يعد لطابع الكتابة معنى بعد الحذف.
  const all = readStamps()
  if (all[kind]?.[id]) {
    const next = { ...all[kind] }
    delete next[id]
    all[kind] = next
    writeJSON(STAMPS_KEY, all)
  }
}

/** هل حُذف هذا السجلّ محليًا في وقت لا يسبق الطابع المعطى؟ (الحذف يفوز عند التساوي). */
export function isDeletedAfter(kind: RecordKind, id: string, stamp?: string | null): boolean {
  const t = getTombstones().find((x) => x.kind === kind && x.id === id)
  if (!t) return false
  return stampToMs(t.deletedAt) >= stampToMs(stamp)
}

/**
 * حدّ «الحذف الضمني» عند استبدال قائمة كاملة.
 *
 * لماذا حدّ أصلًا: مسار الحذف في الواجهة يمرّ عبر استبدال القائمة كلّها
 * (setMeasurementLogs/setWorkoutSessions)، والاستبدال وحده لا يميّز بين
 * «حذف المستخدم لسجلّ» و«إعادة بناء/استيراد من قائمة أضيق» (مثلًا مصدر قديم
 * لا يرى ما سُحب من السحابة). لذلك: إسقاط معرّف واحد = حذف مقصود (وهو مسار
 * الواجهة الفعلي — يُحذف سجلّ واحد في كل مرّة)، وأي إسقاط جماعي يُعامَل
 * كإعادة بناء فلا يولّد شواهد حذف. قاعدة «الشكّ لصالح البقاء»: أسوأ نتيجة أن
 * يعود الصفّ من السحابة، لا أن يُمحى منها بلا رجعة.
 * من يعرف نيّته يقينًا يستدعي deleteWorkoutSession/deleteMeasurementLog أو
 * recordDeletion مباشرةً.
 */
const MAX_IMPLICIT_DELETIONS = 1

function recordImplicitDeletions(kind: RecordKind, prevIds: Set<string>, nextIds: Set<string>): void {
  const removed = Array.from(prevIds).filter((id) => id && !nextIds.has(id))
  if (!removed.length || removed.length > MAX_IMPLICIT_DELETIONS) return
  removed.forEach((id) => recordDeletion(kind, id))
}

/** يشطب شواهد حذف بعد تطبيقها سحابيًا بنجاح. */
export function clearTombstones(entries: Array<{ kind: RecordKind; id: string }>): void {
  if (!entries.length) return
  const drop = new Set(entries.map((e) => `${e.kind} ${e.id}`))
  const list = getTombstones()
  const next = list.filter((t) => !drop.has(`${t.kind} ${t.id}`))
  if (next.length !== list.length) writeJSON(TOMBSTONES_KEY, next)
}

/**
 * الطابع المحلي المعتمد لجلسة.
 * قرار: الجلسة لا تحمل `updatedAt` في نوعها العام (WorkoutSession مستهلَك في
 * عشرات المواضع)، فالأساس الاحتياطي للبيانات السابقة لهذه الطبقة هو
 * `finishedAt` ثم `startedAt` ثم `date` — وهو أدقّ ما يمثّل «آخر تغيّر» فيها.
 */
export function getSessionStamp(s: WorkoutSession): string {
  return getRecordStamp('workoutSession', s.id) || s.finishedAt || s.startedAt || s.date || ''
}

/** الطابع المحلي المعتمد لقياس (الأساس الاحتياطي: تاريخ القياس). */
export function getMeasurementStamp(l: MeasurementLog): string {
  return getRecordStamp('measurementLog', l.id) || l.date || ''
}

/** يمسح دفاتر المزامنة (طوابع + شواهد حذف). يُستدعى ضمن «تصفير البيانات». */
export function clearSyncBookkeeping(): void {
  removeKey(STAMPS_KEY)
  removeKey(TOMBSTONES_KEY)
}

// ————————————————————————————————————————————————————————————————
// جلسات التمرين
// ————————————————————————————————————————————————————————————————

// — تطبيع الجلسات عند القراءة —
// المتجر قد يحوي جلسات قديمة أو تالفة (مفاتيح سابقة، استيراد، نسخة أقدم).
// نضمن أن كل جلسة تُعاد بشكل آمن: مصفوفة exercises دائمًا موجودة وكل تمرين
// بحقول صالحة، حتى لا تنهار أي واجهة تقرأ السجلّ (لوحة، تقدّم، سلاسل، ذكاء تدريبي).

function normalizeSet(raw: unknown): SetLog | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  return {
    setNumber: typeof s.setNumber === 'number' ? s.setNumber : 0,
    targetReps: typeof s.targetReps === 'string' ? s.targetReps : '',
    actualReps: typeof s.actualReps === 'string' ? s.actualReps : '',
    weightKg: typeof s.weightKg === 'string' ? s.weightKg : '',
    completed: !!s.completed,
    rpe: typeof s.rpe === 'number' ? s.rpe : undefined,
    notes: typeof s.notes === 'string' ? s.notes : undefined,
  }
}

function normalizeExercise(raw: unknown): SessionExercise {
  const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    // نُبقي الحقول القديمة (weight/repsDone/difficulty/painNote/notes) عبر النشر،
    // ثم نضبط الحقول المعروفة بأنواعها الآمنة.
    ...(e as object),
    exerciseId: typeof e.exerciseId === 'string' ? e.exerciseId : '',
    targetSets: typeof e.targetSets === 'number' ? e.targetSets : 0,
    targetReps: typeof e.targetReps === 'string' ? e.targetReps : '',
    targetRestSec: typeof e.targetRestSec === 'number' ? e.targetRestSec : 0,
    completed: !!e.completed,
    sets: Array.isArray(e.sets)
      ? (e.sets.map(normalizeSet).filter(Boolean) as SetLog[])
      : undefined,
  } as SessionExercise
}

function normalizeSession(raw: unknown): WorkoutSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || !s.id) return null
  return {
    id: s.id,
    date: typeof s.date === 'string' ? s.date : '',
    startedAt: typeof s.startedAt === 'string' ? s.startedAt : '',
    finishedAt: typeof s.finishedAt === 'string' ? s.finishedAt : undefined,
    workoutDayId: typeof s.workoutDayId === 'string' ? s.workoutDayId : '',
    workoutDayName: typeof s.workoutDayName === 'string' ? s.workoutDayName : '',
    exercises: Array.isArray(s.exercises) ? s.exercises.map(normalizeExercise) : [],
  }
}

export function getWorkoutSessions(): WorkoutSession[] {
  ensureMigrated()
  const raw = readJSON<unknown[]>(HISTORY_KEYS.workoutSessions, [])
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeSession).filter(Boolean) as WorkoutSession[]
}

/**
 * يحفظ جلسة (الأحدث أولًا)، ويستبدل أي جلسة بنفس المعرّف (idempotent).
 * @param updatedAt طابع أصلي يُستخدم عند الاستيراد من السحابة كي لا يُعاد ضبط
 *                  أساس LWW إلى «الآن» فيبدو المستورَد أحدث من كل شيء.
 */
export function saveWorkoutSession(session: WorkoutSession, updatedAt?: string): WorkoutSession[] {
  ensureMigrated()
  const existing = getWorkoutSessions().filter((s) => s.id !== session.id)
  const next = [session, ...existing].slice(0, 500)
  writeJSON(HISTORY_KEYS.workoutSessions, next)
  // إحياء: إن كانت الجلسة محذوفة سابقًا ثم عادت، يسقط شاهد الحذف.
  clearTombstones([{ kind: 'workoutSession', id: session.id }])
  setRecordStamp('workoutSession', session.id, updatedAt || nowISO())
  // لقطة يومية: علّم أنّ اليوم فيه تمرين مكتمل.
  if (session.finishedAt) {
    saveDailyLog(session.date, { workoutCompleted: true }, updatedAt)
  }
  return next
}

/**
 * يستبدل كامل قائمة الجلسات (لمزامنة/استيراد أو حفظ مجمّع).
 * نقارن قبل الاقتصاص عند السقف حتى لا يُحسب تجاوز السقف حذفًا (السحابة تبقى
 * نسخة الفائض الاحتياطية)، ونطبّق حدّ الحذف الضمني الموضّح أعلاه.
 */
export function setWorkoutSessions(sessions: WorkoutSession[]): void {
  ensureMigrated()
  const prevIds = new Set(getWorkoutSessions().map((s) => s.id))
  const nextIds = new Set(sessions.map((s) => s.id))
  recordImplicitDeletions('workoutSession', prevIds, nextIds)
  writeJSON(HISTORY_KEYS.workoutSessions, sessions.slice(0, 500))
  pruneRecordStamps('workoutSession', nextIds)
}

/** يحذف جلسة نهائيًا محليًا ويسجّل شاهد حذفها كي تُحذف سحابيًا ولا تعود. */
export function deleteWorkoutSession(id: string): WorkoutSession[] {
  ensureMigrated()
  const next = getWorkoutSessions().filter((s) => s.id !== id)
  writeJSON(HISTORY_KEYS.workoutSessions, next)
  recordDeletion('workoutSession', id)
  return next
}

export function getWorkoutSessionsByDate(date: string): WorkoutSession[] {
  return getWorkoutSessions().filter((s) => s.date === date)
}

export function getWorkoutSessionsByExercise(exerciseId: string): WorkoutSession[] {
  return getWorkoutSessions().filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
}

// ————————————————————————————————————————————————————————————————
// سجل أداء التمارين (آخر/أفضل)
// ————————————————————————————————————————————————————————————————

export function getExerciseHistory(): ExerciseHistory {
  ensureMigrated()
  return readJSON<ExerciseHistory>(HISTORY_KEYS.exerciseHistory, {})
}

/**
 * يحفظ سجل أداء التمارين، ويثبّت طابع تعديل حقيقي لكل تمرين تغيّر محتواه.
 * سابقًا كان أساس المقارنة `lastCompletedAt` — وهو «متى تُمرِّن آخر مرّة» لا
 * «متى عُدِّل الصفّ»، فتضيع تعديلات (تصحيح رقم، إعادة حساب أفضل وزن) بلا أثر.
 * @param stamps طوابع أصلية للسجلّات المستورَدة من السحابة (تُحفظ كما هي).
 */
export function saveExerciseHistory(history: ExerciseHistory, stamps?: Record<string, string>): boolean {
  ensureMigrated()
  const prev = getExerciseHistory()
  const ok = writeJSON(HISTORY_KEYS.exerciseHistory, history)
  const at = nowISO()
  const nextStamps: Record<string, string> = {}
  Object.keys(history).forEach((id) => {
    const imported = stamps?.[id]
    if (imported) {
      nextStamps[id] = imported
      return
    }
    const previous = getRecordStamp('exerciseHistory', id)
    const changed = JSON.stringify(prev[id]) !== JSON.stringify(history[id])
    nextStamps[id] = changed || !previous ? at : previous
  })
  // الاستبدال الكامل ينظّف طوابع ما لم يعد موجودًا.
  replaceRecordStamps('exerciseHistory', nextStamps)
  // إحياء ما عاد بعد حذف سابق (دفعة واحدة).
  const revived = getTombstones()
    .filter((t) => t.kind === 'exerciseHistory' && t.id in history)
    .map((t) => ({ kind: t.kind, id: t.id }))
  clearTombstones(revived)
  recordImplicitDeletions('exerciseHistory', new Set(Object.keys(prev)), new Set(Object.keys(history)))
  return ok
}

// ————————————————————————————————————————————————————————————————
// السجلّات اليومية المجمّعة (DailyLog)
// ————————————————————————————————————————————————————————————————

export function getDailyLogs(): ByDate<DailyLog> {
  ensureMigrated()
  return readJSON<ByDate<DailyLog>>(HISTORY_KEYS.dailyLogs, {})
}

export function getDailyLog(date: string): DailyLog | undefined {
  return getDailyLogs()[date]
}

/**
 * يدمج جزءًا في لقطة اليوم (merge آمن، لا يمسح الحقول الأخرى).
 * @param updatedAt طابع أصلي للاستيراد من السحابة. سابقًا كان السحب يُعيد ضبط
 *                  كل اللقطات المسحوبة إلى «الآن» فيتحوّل المستورَد إلى «الأحدث»
 *                  ويُدمَّر أساس LWW كلّه. نقبله فقط إن لم يكن أقدم من الطابع
 *                  المحلي؛ وإلّا فالمحتوى تغيّر فعلًا محليًا ويستحق طابعًا جديدًا.
 */
export function saveDailyLog(
  date: string,
  partial: Partial<Omit<DailyLog, 'date' | 'updatedAt'>>,
  updatedAt?: string,
): boolean {
  const logs = getDailyLogs()
  const existing = logs[date]
  const prev = existing ?? { date, updatedAt: nowISO() }
  // لقطة جديدة كليًّا: الطابع المستورَد يُؤخذ كما هو (لا يوجد ما يُقارَن به).
  const keepImported = !!updatedAt && (!existing || stampToMs(updatedAt) >= stampToMs(existing.updatedAt))
  logs[date] = { ...prev, ...partial, date, updatedAt: keepImported ? (updatedAt as string) : nowISO() }
  return writeJSON(HISTORY_KEYS.dailyLogs, logs)
}

/** يحذف لقطة يوم نهائيًا محليًا ويسجّل شاهد حذفها كي تُحذف سحابيًا ولا تعود. */
export function deleteDailyLog(date: string): boolean {
  const logs = getDailyLogs()
  if (!(date in logs)) return true
  delete logs[date]
  const ok = writeJSON(HISTORY_KEYS.dailyLogs, logs)
  recordDeletion('dailyLog', date)
  return ok
}

/** آخر 7 أيام من اللقطات اليومية (الأحدث أولًا). */
export function getWeeklyLogs(): DailyLog[] {
  const logs = getDailyLogs()
  const days: string[] = []
  const base = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    days.push(dayStamp(d))
  }
  return days.map((d) => logs[d] ?? { date: d, updatedAt: '' })
}

// ————————————————————————————————————————————————————————————————
// القياسات
// ————————————————————————————————————————————————————————————————

export function getMeasurementLogs(): MeasurementLog[] {
  ensureMigrated()
  return readJSON<MeasurementLog[]>(HISTORY_KEYS.measurementLogs, [])
}

/**
 * يحفظ قياسًا (idempotent بالمعرّف).
 * @param updatedAt طابع أصلي عند الاستيراد من السحابة (لا يُعاد ضبطه إلى «الآن»).
 */
export function saveMeasurementLog(log: MeasurementLog, updatedAt?: string): MeasurementLog[] {
  ensureMigrated()
  const existing = getMeasurementLogs().filter((l) => l.id !== log.id)
  const next = [log, ...existing].slice(0, 1000)
  writeJSON(HISTORY_KEYS.measurementLogs, next)
  clearTombstones([{ kind: 'measurementLog', id: log.id }])
  setRecordStamp('measurementLog', log.id, updatedAt || nowISO())
  return next
}

/**
 * يستبدل كامل قائمة القياسات (لمزامنة/استيراد أو حذف).
 * إسقاط معرّف واحد يُقرأ كحذف مقصود فيُسجَّل شاهد حذفه (فيُحذف سحابيًا ولا يعود)،
 * والإسقاط الجماعي يُعامَل كإعادة بناء — راجع MAX_IMPLICIT_DELETIONS أعلاه.
 */
export function setMeasurementLogs(logs: MeasurementLog[]): void {
  ensureMigrated()
  const prevIds = new Set(getMeasurementLogs().map((l) => l.id))
  const nextIds = new Set(logs.map((l) => l.id))
  recordImplicitDeletions('measurementLog', prevIds, nextIds)
  writeJSON(HISTORY_KEYS.measurementLogs, logs)
  pruneRecordStamps('measurementLog', nextIds)
}

/** يحذف قياسًا نهائيًا محليًا ويسجّل شاهد حذفه كي يُحذف سحابيًا ولا يعود. */
export function deleteMeasurementLog(id: string): MeasurementLog[] {
  ensureMigrated()
  const next = getMeasurementLogs().filter((l) => l.id !== id)
  writeJSON(HISTORY_KEYS.measurementLogs, next)
  recordDeletion('measurementLog', id)
  return next
}

// ————————————————————————————————————————————————————————————————
// تغذية يومية
// ————————————————————————————————————————————————————————————————

export function getNutritionLogs(): ByDate<NutritionLog> {
  ensureMigrated()
  return readJSON<ByDate<NutritionLog>>(HISTORY_KEYS.nutritionLogs, {})
}

export function getNutritionLog(date: string): NutritionLog | undefined {
  return getNutritionLogs()[date]
}

export function saveNutritionLog(date: string, partial: Partial<Omit<NutritionLog, 'date' | 'updatedAt'>>): void {
  const logs = getNutritionLogs()
  const prev = logs[date] ?? { date, doneMeals: {}, updatedAt: nowISO() }
  logs[date] = { ...prev, ...partial, date, updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.nutritionLogs, logs)
}

// ————————————————————————————————————————————————————————————————
// ماء يومي
// ————————————————————————————————————————————————————————————————

export function getWaterLogs(): ByDate<WaterLog> {
  ensureMigrated()
  return readJSON<ByDate<WaterLog>>(HISTORY_KEYS.waterLogs, {})
}

export function saveWaterLog(date: string, waterMl: number): void {
  const logs = getWaterLogs()
  logs[date] = { date, waterMl: Math.max(0, waterMl), updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.waterLogs, logs)
}

// ————————————————————————————————————————————————————————————————
// مكملات / أدوية يومية
// ————————————————————————————————————————————————————————————————

export function getSupplementLogs(): ByDate<SupplementLog> {
  ensureMigrated()
  return readJSON<ByDate<SupplementLog>>(HISTORY_KEYS.supplementLogs, {})
}

export function saveSupplementLog(date: string, done: Record<string, boolean>): void {
  const logs = getSupplementLogs()
  logs[date] = { date, done, updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.supplementLogs, logs)
}

export function getMedicationLogs(): ByDate<MedicationLog> {
  ensureMigrated()
  return readJSON<ByDate<MedicationLog>>(HISTORY_KEYS.medicationLogs, {})
}

export function saveMedicationLog(date: string, done: Record<string, boolean>): void {
  const logs = getMedicationLogs()
  logs[date] = { date, done, updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.medicationLogs, logs)
}

// ————————————————————————————————————————————————————————————————
// تصدير/استيراد كامل المتجر
// ————————————————————————————————————————————————————————————————

export interface HistorySnapshot {
  workoutSessions: WorkoutSession[]
  exerciseHistory: ExerciseHistory
  dailyLogs: ByDate<DailyLog>
  measurementLogs: MeasurementLog[]
  nutritionLogs: ByDate<NutritionLog>
  waterLogs: ByDate<WaterLog>
  supplementLogs: ByDate<SupplementLog>
  medicationLogs: ByDate<MedicationLog>
}

/** يلتقط كامل المتجر التاريخي لتصديره في نسخة واحدة. */
export function exportHistory(): HistorySnapshot {
  return {
    workoutSessions: getWorkoutSessions(),
    exerciseHistory: getExerciseHistory(),
    dailyLogs: getDailyLogs(),
    measurementLogs: getMeasurementLogs(),
    nutritionLogs: getNutritionLogs(),
    waterLogs: getWaterLogs(),
    supplementLogs: getSupplementLogs(),
    medicationLogs: getMedicationLogs(),
  }
}

/** يستعيد المتجر من نسخة مُصدّرة (استبدال كامل، يُستخدم بعد تأكيد المستخدم). */
export function importHistory(snap: Partial<HistorySnapshot> | undefined | null): void {
  if (!snap || typeof snap !== 'object') return
  if (Array.isArray(snap.workoutSessions)) writeJSON(HISTORY_KEYS.workoutSessions, snap.workoutSessions)
  if (snap.exerciseHistory && typeof snap.exerciseHistory === 'object')
    writeJSON(HISTORY_KEYS.exerciseHistory, snap.exerciseHistory)
  if (snap.dailyLogs && typeof snap.dailyLogs === 'object') writeJSON(HISTORY_KEYS.dailyLogs, snap.dailyLogs)
  if (Array.isArray(snap.measurementLogs)) writeJSON(HISTORY_KEYS.measurementLogs, snap.measurementLogs)
  if (snap.nutritionLogs && typeof snap.nutritionLogs === 'object')
    writeJSON(HISTORY_KEYS.nutritionLogs, snap.nutritionLogs)
  if (snap.waterLogs && typeof snap.waterLogs === 'object') writeJSON(HISTORY_KEYS.waterLogs, snap.waterLogs)
  if (snap.supplementLogs && typeof snap.supplementLogs === 'object')
    writeJSON(HISTORY_KEYS.supplementLogs, snap.supplementLogs)
  if (snap.medicationLogs && typeof snap.medicationLogs === 'object')
    writeJSON(HISTORY_KEYS.medicationLogs, snap.medicationLogs)

  // اضبط أساس LWW على المستعاد وأسقط شواهد حذفه.
  if (Array.isArray(snap.workoutSessions))
    reindexStamps('workoutSession', snap.workoutSessions.map((s) => s?.id))
  if (Array.isArray(snap.measurementLogs))
    reindexStamps('measurementLog', snap.measurementLogs.map((l) => l?.id))
  if (snap.exerciseHistory && typeof snap.exerciseHistory === 'object')
    reindexStamps('exerciseHistory', Object.keys(snap.exerciseHistory))
}

// ————————————————————————————————————————————————————————————————
// الترحيل من المفاتيح القديمة (آمن + idempotent)
// ————————————————————————————————————————————————————————————————

/** اكتمل الترحيل فعلًا (لا يُرفع إلّا بعد النجاح). */
let migrationDone = false
/** حارس ضدّ إعادة الدخول (دوال القراءة تستدعي ensureMigrated). */
let migrationRunning = false
/** عدد المحاولات الفاشلة — نتوقّف بعدها حتى لا ندخل حلقة إعادة محاولة ساخنة. */
let migrationAttempts = 0
const MAX_MIGRATION_ATTEMPTS = 3

/**
 * ينقل البيانات القديمة مرة واحدة. آمن للاستدعاء المتكرر.
 * سابقًا كانت الراية تُرفع قبل تنفيذ الترحيل ويُبتلع أي خطأ بصمت، فأي فشل في
 * المنتصف يترك البيانات القديمة عالقة إلى الأبد بلا أثر يمكن تشخيصه.
 */
export function ensureMigrated(): void {
  if (migrationDone || migrationRunning) return
  if (typeof window === 'undefined') return
  if (migrationAttempts >= MAX_MIGRATION_ATTEMPTS) return
  migrationAttempts += 1
  migrationRunning = true
  try {
    if (readRaw(MIGRATION_FLAG) === 'done') {
      migrationDone = true
      return
    }

    // 1) جلسات التمرين — ادمج القديمة مع الجديدة دون تكرار.
    const oldSessions = readJSON<WorkoutSession[]>(OLD_KEYS.workoutSessions, [])
    if (oldSessions.length) {
      const current = readJSON<WorkoutSession[]>(HISTORY_KEYS.workoutSessions, [])
      const seen = new Set(current.map((s) => s.id))
      const merged = [...current, ...oldSessions.filter((s) => !seen.has(s.id))]
      writeJSON(HISTORY_KEYS.workoutSessions, merged)
      // التقط أيام التمرين كلقطات يومية.
      merged.forEach((s) => {
        if (s.finishedAt) {
          const logs = readJSON<ByDate<DailyLog>>(HISTORY_KEYS.dailyLogs, {})
          logs[s.date] = { ...(logs[s.date] ?? { date: s.date, updatedAt: nowISO() }), workoutCompleted: true, date: s.date, updatedAt: nowISO() }
          writeJSON(HISTORY_KEYS.dailyLogs, logs)
        }
      })
    }

    // 2) سجل أداء التمارين — لا نكتب فوق الجديد إن وُجد.
    const oldHistory = readJSON<ExerciseHistory>(OLD_KEYS.exerciseHistory, {})
    if (Object.keys(oldHistory).length) {
      const current = readJSON<ExerciseHistory>(HISTORY_KEYS.exerciseHistory, {})
      writeJSON(HISTORY_KEYS.exerciseHistory, { ...oldHistory, ...current })
    }

    // 3) القياسات — ادمج دون تكرار بالـ id.
    const oldMeas = readJSON<MeasurementLog[]>(OLD_KEYS.measurementLogs, [])
    if (oldMeas.length) {
      const current = readJSON<MeasurementLog[]>(HISTORY_KEYS.measurementLogs, [])
      const seen = new Set(current.map((l) => l.id))
      writeJSON(HISTORY_KEYS.measurementLogs, [...current, ...oldMeas.filter((l) => !seen.has(l.id))])
    }

    // 4) تغذية اليوم القديمة → سجلّ التاريخ ليومها فقط (إن لم يوجد لها سجل).
    const oldNut = readJSON<{ date?: string; doneMeals?: Record<string, boolean>; waterMl?: number }>(
      OLD_KEYS.nutritionToday,
      {},
    )
    if (oldNut.date) {
      const logs = readJSON<ByDate<NutritionLog>>(HISTORY_KEYS.nutritionLogs, {})
      if (!logs[oldNut.date]) {
        logs[oldNut.date] = {
          date: oldNut.date,
          doneMeals: oldNut.doneMeals ?? {},
          waterMl: oldNut.waterMl ?? 0,
          updatedAt: nowISO(),
        }
        writeJSON(HISTORY_KEYS.nutritionLogs, logs)
      }
      if (typeof oldNut.waterMl === 'number') {
        const wlogs = readJSON<ByDate<WaterLog>>(HISTORY_KEYS.waterLogs, {})
        if (!wlogs[oldNut.date]) {
          wlogs[oldNut.date] = { date: oldNut.date, waterMl: oldNut.waterMl, updatedAt: nowISO() }
          writeJSON(HISTORY_KEYS.waterLogs, wlogs)
        }
      }
    }

    // 5) مكملات/أدوية اليوم القديمة → سجلّات يومها.
    const oldWell = readJSON<{
      date?: string
      doneSupplements?: Record<string, boolean>
      doneMedications?: Record<string, boolean>
    }>(OLD_KEYS.wellnessToday, {})
    if (oldWell.date) {
      const slogs = readJSON<ByDate<SupplementLog>>(HISTORY_KEYS.supplementLogs, {})
      if (!slogs[oldWell.date]) {
        slogs[oldWell.date] = { date: oldWell.date, done: oldWell.doneSupplements ?? {}, updatedAt: nowISO() }
        writeJSON(HISTORY_KEYS.supplementLogs, slogs)
      }
      const mlogs = readJSON<ByDate<MedicationLog>>(HISTORY_KEYS.medicationLogs, {})
      if (!mlogs[oldWell.date]) {
        mlogs[oldWell.date] = { date: oldWell.date, done: oldWell.doneMedications ?? {}, updatedAt: nowISO() }
        writeJSON(HISTORY_KEYS.medicationLogs, mlogs)
      }
    }

    // 6) التزامات اليوم القديمة → لقطة يومية ليومها.
    const oldCom = readJSON<{ date?: string; done?: Record<string, boolean>; notes?: string }>(
      OLD_KEYS.commitmentsToday,
      {},
    )
    if (oldCom.date) {
      const logs = readJSON<ByDate<DailyLog>>(HISTORY_KEYS.dailyLogs, {})
      const prev = logs[oldCom.date] ?? { date: oldCom.date, updatedAt: nowISO() }
      if (!prev.commitments) {
        logs[oldCom.date] = {
          ...prev,
          date: oldCom.date,
          commitments: { done: oldCom.done ?? {}, notes: oldCom.notes ?? '' },
          updatedAt: nowISO(),
        }
        writeJSON(HISTORY_KEYS.dailyLogs, logs)
      }
    }

    // الراية تُرفع فقط بعد اكتمال الترحيل ونجاح كتابتها.
    migrationDone = writeRaw(MIGRATION_FLAG, 'done') === 'ok'
  } catch (e) {
    // لا نُفشل التطبيق بسبب الترحيل، لكن لا نبتلع الخطأ صامتًا أيضًا:
    // نسجّله كي يظهر في تقارير الأخطاء، ونُعيد المحاولة في الاستدعاء التالي.
    console.warn('[qimmah] تعذّر ترحيل المتجر التاريخي:', e)
  } finally {
    migrationRunning = false
  }
}
