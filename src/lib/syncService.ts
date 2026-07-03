// خدمة المزامنة السحابية (Supabase) — local-first مع أساس بسيط.
//
// المبدأ: الجهاز هو مصدر الحقيقة، والسحابة نسخة احتياطية/مزامنة. إن لم يُضبط
// Supabase أو كان المستخدم ضيفًا، تُعيد الدوال حالة واضحة دون أي انهيار.
//
// النطاق الحالي (أساسي، بلا حلّ تعارض معقّد):
//   - جلسات التمرين (workout_sessions)
//   - سجل أداء التمارين (exercise_history)
//   - القياسات (measurement_logs)
//   - اللقطات اليومية (daily_logs)
// القاعدة: عند تساوي updated_at يفوز المحلي.

import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import {
  exportHistory,
  getDailyLogs,
  getExerciseHistory,
  getMeasurementLogs,
  getWorkoutSessions,
  importHistory,
  saveDailyLog,
  saveExerciseHistory,
  saveMeasurementLog,
  saveWorkoutSession,
  type DailyLog,
} from './historyStore'
import type { WorkoutSession } from './workoutSessions'
import type { ExerciseHistory } from './exerciseHistory'
import type { MeasurementLog } from '@/types/progress'

const SYNC_META_KEY = 'qimmah:sync:meta:v1'

export type SyncState = 'disabled' | 'guest' | 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

export interface SyncStatus {
  /** هل Supabase مضبوط في هذه النسخة؟ */
  configured: boolean
  /** هل يوجد مستخدم مسجّل دخول؟ */
  signedIn: boolean
  /** الحالة الكلّية للعرض. */
  state: SyncState
  /** آخر مزامنة ناجحة (ISO) إن وُجدت. */
  lastSyncedAt?: string
  /** توجد تغييرات محلية لم تُرفع بعد. */
  pending: boolean
  /** رسالة عربية جاهزة للعرض. */
  message: string
}

interface SyncMeta {
  lastSyncedAt?: string
  pending?: boolean
}

function readMeta(): SyncMeta {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY)
    return raw ? (JSON.parse(raw) as SyncMeta) : {}
  } catch {
    return {}
  }
}

function writeMeta(meta: SyncMeta): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
  } catch {
    /* تجاهل */
  }
}

/** يعلّم وجود تغييرات محلية بحاجة للرفع. */
export function markPendingSync(): void {
  writeMeta({ ...readMeta(), pending: true })
}

function buildStatus(state: SyncState, message: string): SyncStatus {
  const meta = readMeta()
  return {
    configured: isSupabaseConfigured(),
    signedIn: state !== 'guest' && state !== 'disabled',
    state,
    lastSyncedAt: meta.lastSyncedAt,
    pending: Boolean(meta.pending),
    message,
  }
}

/** الحالة الحالية للمزامنة (متزامن، بلا شبكة). */
export function getSyncStatus(signedIn: boolean): SyncStatus {
  if (!isSupabaseConfigured()) return buildStatus('disabled', 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  if (!signedIn) return buildStatus('guest', 'أنت في وضع الضيف — بياناتك على هذا الجهاز فقط.')
  const meta = readMeta()
  if (meta.pending) return buildStatus('pending', 'توجد تغييرات لم تُرفع بعد.')
  if (meta.lastSyncedAt) return buildStatus('synced', 'بياناتك متزامنة مع حسابك السحابي.')
  return buildStatus('idle', 'جاهز للمزامنة.')
}

/** يجلب معرّف المستخدم الحالي أو null. */
async function currentUserId(): Promise<string | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * يرفع البيانات المحلية إلى السحابة (upsert). آمن عند غياب الضبط/المستخدم.
 */
export async function syncLocalToCloud(): Promise<SyncStatus> {
  const supabase = await getSupabase()
  if (!supabase) return buildStatus('disabled', 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const userId = await currentUserId()
  if (!userId) return buildStatus('guest', 'سجّل الدخول لمزامنة بياناتك سحابيًا.')

  try {
    const sessions = getWorkoutSessions()
    const history = getExerciseHistory()
    const measurements = getMeasurementLogs()
    const daily = getDailyLogs()

    // 1) جلسات التمرين
    if (sessions.length) {
      const rows = sessions.map((s) => ({
        user_id: userId,
        local_id: s.id,
        date: s.date,
        started_at: s.startedAt,
        finished_at: s.finishedAt ?? null,
        workout_day_id: s.workoutDayId,
        workout_day_name: s.workoutDayName,
        data: s,
        updated_at: s.finishedAt ?? s.startedAt,
      }))
      const { error } = await supabase.from('workout_sessions').upsert(rows, { onConflict: 'user_id,local_id' })
      if (error) throw error
    }

    // 2) سجل أداء التمارين
    const exRows = Object.entries(history).map(([exerciseId, rec]) => ({
      user_id: userId,
      exercise_id: exerciseId,
      data: rec,
      updated_at: rec.lastCompletedAt ?? new Date().toISOString(),
    }))
    if (exRows.length) {
      const { error } = await supabase.from('exercise_history').upsert(exRows, { onConflict: 'user_id,exercise_id' })
      if (error) throw error
    }

    // 3) القياسات
    if (measurements.length) {
      const rows = measurements.map((m) => ({
        user_id: userId,
        local_id: m.id,
        date: m.date,
        values: m.values,
        notes: m.notes ?? null,
      }))
      const { error } = await supabase.from('measurement_logs').upsert(rows, { onConflict: 'user_id,local_id' })
      if (error) throw error
    }

    // 4) اللقطات اليومية
    const dailyRows = Object.values(daily).map((l) => ({
      user_id: userId,
      date: l.date,
      data: l,
      updated_at: l.updatedAt || new Date().toISOString(),
    }))
    if (dailyRows.length) {
      const { error } = await supabase.from('daily_logs').upsert(dailyRows, { onConflict: 'user_id,date' })
      if (error) throw error
    }

    const lastSyncedAt = new Date().toISOString()
    writeMeta({ lastSyncedAt, pending: false })
    return buildStatus('synced', 'تمت المزامنة بنجاح.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ غير معروف'
    return buildStatus('error', `تعذّرت المزامنة: ${msg}`)
  }
}

/**
 * يسحب البيانات السحابية ويدمجها محليًا. local-first: يفوز المحلي عند التساوي.
 */
export async function pullCloudToLocal(): Promise<SyncStatus> {
  const supabase = await getSupabase()
  if (!supabase) return buildStatus('disabled', 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const userId = await currentUserId()
  if (!userId) return buildStatus('guest', 'سجّل الدخول لسحب بياناتك السحابية.')

  try {
    // 1) جلسات التمرين — أضف ما ليس محليًا.
    const localSessions = getWorkoutSessions()
    const localSessionIds = new Set(localSessions.map((s) => s.id))
    const { data: cloudSessions, error: e1 } = await supabase
      .from('workout_sessions')
      .select('local_id,data')
      .eq('user_id', userId)
    if (e1) throw e1
    ;(cloudSessions ?? []).forEach((row) => {
      const s = row.data as WorkoutSession | null
      if (s && s.id && !localSessionIds.has(s.id)) saveWorkoutSession(s)
    })

    // 2) سجل أداء التمارين — ادمج بحيث يفوز الأحدث updated_at.
    const localHistory = getExerciseHistory()
    const { data: cloudHistory, error: e2 } = await supabase
      .from('exercise_history')
      .select('exercise_id,data,updated_at')
      .eq('user_id', userId)
    if (e2) throw e2
    const mergedHistory: ExerciseHistory = { ...localHistory }
    ;(cloudHistory ?? []).forEach((row) => {
      const exId = row.exercise_id as string
      const rec = row.data as ExerciseHistory[string] | null
      if (!rec) return
      const local = localHistory[exId]
      const localTime = local?.lastCompletedAt ?? ''
      const cloudTime = rec.lastCompletedAt ?? ''
      // محلي يفوز عند التساوي؛ السحابي يفوز فقط إن كان أحدث فعلًا.
      if (!local || cloudTime > localTime) mergedHistory[exId] = rec
    })
    saveExerciseHistory(mergedHistory)

    // 3) القياسات — أضف ما ليس محليًا.
    const localMeas = getMeasurementLogs()
    const localMeasIds = new Set(localMeas.map((m) => m.id))
    const { data: cloudMeas, error: e3 } = await supabase
      .from('measurement_logs')
      .select('local_id,date,values,notes')
      .eq('user_id', userId)
    if (e3) throw e3
    ;(cloudMeas ?? []).forEach((row) => {
      const id = (row.local_id as string) || ''
      if (id && !localMeasIds.has(id)) {
        const log: MeasurementLog = {
          id,
          date: row.date as string,
          values: (row.values as MeasurementLog['values']) ?? {},
          notes: (row.notes as string) ?? undefined,
        }
        saveMeasurementLog(log)
      }
    })

    // 4) اللقطات اليومية — يفوز الأحدث updated_at.
    const localDaily = getDailyLogs()
    const { data: cloudDaily, error: e4 } = await supabase
      .from('daily_logs')
      .select('date,data')
      .eq('user_id', userId)
    if (e4) throw e4
    ;(cloudDaily ?? []).forEach((row) => {
      const l = row.data as DailyLog | null
      if (!l || !l.date) return
      const local = localDaily[l.date]
      if (!local || (l.updatedAt || '') > (local.updatedAt || '')) {
        const { date, updatedAt, ...rest } = l
        void updatedAt
        saveDailyLog(date, rest)
      }
    })

    const lastSyncedAt = new Date().toISOString()
    writeMeta({ lastSyncedAt, pending: false })
    return buildStatus('synced', 'تم سحب بياناتك السحابية ودمجها محليًا.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ غير معروف'
    return buildStatus('error', `تعذّر السحب: ${msg}`)
  }
}

/**
 * مزامنة كاملة عند تسجيل الدخول: اسحب أولًا ثم ارفع (لدمج جهازين).
 */
export async function fullSync(): Promise<SyncStatus> {
  const pulled = await pullCloudToLocal()
  if (pulled.state === 'disabled' || pulled.state === 'guest' || pulled.state === 'error') return pulled
  return syncLocalToCloud()
}

/** لقطة كاملة للمتجر (لإعادة الاستخدام في التصدير). */
export function snapshotForExport() {
  return exportHistory()
}

/** استعادة لقطة كاملة (لإعادة الاستخدام في الاستيراد). */
export function restoreSnapshot(snap: ReturnType<typeof exportHistory>) {
  importHistory(snap)
}
