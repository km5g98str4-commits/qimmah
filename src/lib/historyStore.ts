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
import { enqueueSyncDelete, enqueueSyncOperation } from './syncQueue'
import { writeJson } from './safeStorage'

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
  /** مجاميع الأطعمة المُسجّلة يدويًا في هذا اليوم (سعرات/ماكروز) — تبقى بعد تصفير اليوم
   *  فتظهر في الملخّص الأسبوعي/التقدّم. تُكتب من مسجّل الوجبات. */
  loggedFood?: { calories: number; protein: number; carbs: number; fat: number }
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

// كل كتابة دائمة تمرّ من الطبقة الآمنة: لا ترمي (فلا تنكسر أي واجهة)، لكنها
// تُسجّل الفشل في مؤشّر عالمي بدل ابتلاعه — فيستطيع مسار إنهاء التمرين أن يعرف
// أن الحفظ لم يحدث ويقول ذلك للمستخدم بدل عرض نجاح زائف.
function writeJSON(key: string, value: unknown): void {
  writeJson(key, value)
}

function nowISO(): string {
  return new Date().toISOString()
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

/** يحفظ جلسة (الأحدث أولًا)، ويستبدل أي جلسة بنفس المعرّف (idempotent). */
export function saveWorkoutSession(session: WorkoutSession): WorkoutSession[] {
  ensureMigrated()
  const existing = getWorkoutSessions().filter((s) => s.id !== session.id)
  const next = [session, ...existing].slice(0, 500)
  writeJSON(HISTORY_KEYS.workoutSessions, next)
  enqueueSyncOperation('workout_sessions', session.id, {
    local_id: session.id,
    date: session.date,
    started_at: session.startedAt,
    finished_at: session.finishedAt ?? null,
    workout_day_id: session.workoutDayId,
    workout_day_name: session.workoutDayName,
    data: session,
    updated_at: session.finishedAt ?? session.startedAt,
  })
  // لقطة يومية: علّم أنّ اليوم فيه تمرين مكتمل.
  if (session.finishedAt) {
    saveDailyLog(session.date, { workoutCompleted: true })
  }
  return next
}

/** يستبدل كامل قائمة الجلسات (لمزامنة/استيراد أو حفظ مجمّع). */
export function setWorkoutSessions(sessions: WorkoutSession[]): void {
  ensureMigrated()
  const retained = new Set(sessions.map((session) => session.id))
  getWorkoutSessions().forEach((session) => {
    if (!retained.has(session.id)) enqueueSyncDelete('workout_sessions', session.id)
  })
  writeJSON(HISTORY_KEYS.workoutSessions, sessions.slice(0, 500))
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

export function saveExerciseHistory(history: ExerciseHistory): void {
  ensureMigrated()
  writeJSON(HISTORY_KEYS.exerciseHistory, history)
  Object.entries(history).forEach(([exerciseId, record]) => {
    enqueueSyncOperation('exercise_history', exerciseId, {
      exercise_id: exerciseId,
      data: record,
      updated_at: record.lastCompletedAt ?? nowISO(),
    })
  })
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

/** يدمج جزءًا في لقطة اليوم (merge آمن، لا يمسح الحقول الأخرى). */
export function saveDailyLog(date: string, partial: Partial<Omit<DailyLog, 'date' | 'updatedAt'>>): void {
  const logs = getDailyLogs()
  const prev = logs[date] ?? { date, updatedAt: nowISO() }
  logs[date] = { ...prev, ...partial, date, updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.dailyLogs, logs)
  enqueueDailySync(date)
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

export function saveMeasurementLog(log: MeasurementLog): MeasurementLog[] {
  ensureMigrated()
  const existing = getMeasurementLogs().filter((l) => l.id !== log.id)
  const next = [log, ...existing].slice(0, 1000)
  writeJSON(HISTORY_KEYS.measurementLogs, next)
  enqueueSyncOperation('measurement_logs', log.id, {
    local_id: log.id,
    date: log.date,
    values: log.values,
    notes: log.notes ?? null,
  })
  return next
}

/** يستبدل كامل قائمة القياسات (لمزامنة/استيراد). */
export function setMeasurementLogs(logs: MeasurementLog[]): void {
  ensureMigrated()
  const retained = new Set(logs.map((log) => log.id))
  getMeasurementLogs().forEach((log) => {
    if (!retained.has(log.id)) enqueueSyncDelete('measurement_logs', log.id)
  })
  writeJSON(HISTORY_KEYS.measurementLogs, logs)
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
  enqueueDailySync(date)
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
  enqueueDailySync(date)
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
  enqueueDailySync(date)
}

export function getMedicationLogs(): ByDate<MedicationLog> {
  ensureMigrated()
  return readJSON<ByDate<MedicationLog>>(HISTORY_KEYS.medicationLogs, {})
}

export function saveMedicationLog(date: string, done: Record<string, boolean>): void {
  const logs = getMedicationLogs()
  logs[date] = { date, done, updatedAt: nowISO() }
  writeJSON(HISTORY_KEYS.medicationLogs, logs)
  enqueueDailySync(date)
}

/** daily_logs is the approved aggregate cloud home for these daily local stores. */
function enqueueDailySync(date: string): void {
  const daily = getDailyLogs()[date]
  const nutrition = getNutritionLogs()[date]
  const water = getWaterLogs()[date]
  const supplements = getSupplementLogs()[date]
  const medications = getMedicationLogs()[date]
  const timestamps = [daily?.updatedAt, nutrition?.updatedAt, water?.updatedAt, supplements?.updatedAt, medications?.updatedAt]
    .filter((value): value is string => Boolean(value))
    .sort()
  enqueueSyncOperation('daily_logs', date, {
    date,
    data: { daily, nutrition, water, supplements, medications },
    updated_at: timestamps.at(-1) ?? nowISO(),
  })
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
}

// ————————————————————————————————————————————————————————————————
// الترحيل من المفاتيح القديمة (آمن + idempotent)
// ————————————————————————————————————————————————————————————————

let migrationRan = false

/** ينقل البيانات القديمة مرة واحدة. آمن للاستدعاء المتكرر. */
export function ensureMigrated(): void {
  if (migrationRan) return
  migrationRan = true
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG) === 'done') return

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

    window.localStorage.setItem(MIGRATION_FLAG, 'done')
  } catch {
    // لا نُفشل التطبيق بسبب الترحيل.
  }
}
