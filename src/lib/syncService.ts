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
// القاعدة: يفوز الأحدث `updated_at`، وعند التساوي يفوز المحلي.
//
// الحذف: السحابة لا تعرف الحذف من نفسها (upsert فقط)، لذا نحتفظ محليًا بشواهد
// حذف (tombstones) في historyStore. تُستخدم في اتجاهين:
//   (أ) عند السحب: نتجاهل أي صف سحابي حُذف محليًا بعد طابعه.
//   (ب) عند الرفع: نحذف نظيره السحابي فعليًا ثم نشطب الشاهد.
//
// ملاحظة عن الطوابع: جدول Supabase فيه trigger يضبط `updated_at = now()` عند كل
// UPDATE، فطابع الصفّ المحدَّث هو «وقت وصوله للخادم» لا وقت التحرير على الجهاز.
// هذا يبقى أساسًا صالحًا للمقارنة (رتيب ومشترك بين الأجهزة)، والقيمة التي نرسلها
// تُحترم عند الإدراج الأول.

import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import {
  clearTombstones,
  exportHistory,
  getDailyLogs,
  getExerciseHistory,
  getMeasurementStamp,
  getMeasurementLogs,
  getRecordStamp,
  getSessionStamp,
  getTombstones,
  getWorkoutSessions,
  importHistory,
  isDeletedAfter,
  saveDailyLog,
  saveExerciseHistory,
  saveMeasurementLog,
  saveWorkoutSession,
  stampToMs,
  type DailyLog,
  type RecordKind,
} from './historyStore'
import type { WorkoutSession } from './workoutSessions'
import type { ExerciseHistory } from './exerciseHistory'
import type { MeasurementLog } from '@/types/progress'
import { getStorageFailure, writeJson } from './safeStorage'

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

// writeJson لا يرمي أبدًا (طبقة safeStorage تُرجع نتيجة ولا ترفع استثناءً)،
// فلا حاجة لغلاف try/catch — نُعيد النتيجة كي يتصرّف النداء الأعلى عند الفشل.
function writeMeta(meta: SyncMeta): boolean {
  if (typeof window === 'undefined') return false
  return writeJson(SYNC_META_KEY, meta) === 'ok'
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
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/** خريطة نوع السجلّ → جدوله السحابي وعمود معرّفه (لتطبيق الحذف). */
const TOMBSTONE_TARGETS: ReadonlyArray<{ kind: RecordKind; table: string; idColumn: string }> = [
  { kind: 'workoutSession', table: 'workout_sessions', idColumn: 'local_id' },
  { kind: 'measurementLog', table: 'measurement_logs', idColumn: 'local_id' },
  { kind: 'exerciseHistory', table: 'exercise_history', idColumn: 'exercise_id' },
  { kind: 'dailyLog', table: 'daily_logs', idColumn: 'date' },
]

/**
 * يرفع البيانات المحلية إلى السحابة (upsert + تطبيق الحذف).
 * آمن عند غياب الضبط/المستخدم.
 */
export async function syncLocalToCloud(): Promise<SyncStatus> {
  const supabase = getSupabase()
  if (!supabase) return buildStatus('disabled', 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const userId = await currentUserId()
  if (!userId) return buildStatus('guest', 'سجّل الدخول لمزامنة بياناتك سحابيًا.')

  try {
    const sessions = getWorkoutSessions()
    const history = getExerciseHistory()
    const measurements = getMeasurementLogs()
    const daily = getDailyLogs()

    // 0) الحذف أولًا: طبّق شواهد الحذف على السحابة قبل الرفع.
    //    (نبدأ بالحذف حتى لا يبقى صفّ محذوف لحظةً واحدة بعد رفع البقية.)
    const tombstones = getTombstones()
    const applied: Array<{ kind: RecordKind; id: string }> = []
    for (const spec of TOMBSTONE_TARGETS) {
      const ids = tombstones.filter((t) => t.kind === spec.kind).map((t) => t.id)
      if (!ids.length) continue
      const { error } = await supabase.from(spec.table).delete().eq('user_id', userId).in(spec.idColumn, ids)
      if (error) throw error
      ids.forEach((id) => applied.push({ kind: spec.kind, id }))
    }
    // لا نشطب الشواهد إلّا بعد نجاح الحذف السحابي فعليًا.
    clearTombstones(applied)

    const now = new Date().toISOString()

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
        // طابع التعديل الحقيقي للصفّ (وليس وقت انتهاء التمرين فقط).
        updated_at: getSessionStamp(s) || now,
      }))
      const { error } = await supabase.from('workout_sessions').upsert(rows, { onConflict: 'user_id,local_id' })
      if (error) throw error
    }

    // 2) سجل أداء التمارين — updated_at حقيقي لا lastCompletedAt.
    const exRows = Object.entries(history).map(([exerciseId, rec]) => ({
      user_id: userId,
      exercise_id: exerciseId,
      data: rec,
      updated_at: getRecordStamp('exerciseHistory', exerciseId) || rec.lastCompletedAt || now,
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
        updated_at: getMeasurementStamp(m) || now,
      }))
      const { error } = await supabase.from('measurement_logs').upsert(rows, { onConflict: 'user_id,local_id' })
      if (error) throw error
    }

    // 4) اللقطات اليومية
    const dailyRows = Object.values(daily).map((l) => ({
      user_id: userId,
      date: l.date,
      data: l,
      updated_at: l.updatedAt || now,
    }))
    if (dailyRows.length) {
      const { error } = await supabase.from('daily_logs').upsert(dailyRows, { onConflict: 'user_id,date' })
      if (error) throw error
    }

    const lastSyncedAt = new Date().toISOString()
    if (!writeMeta({ lastSyncedAt, pending: false })) {
      // رُفعت البيانات فعلًا لكن تعذّر حفظ حالة المزامنة على الجهاز —
      // لا نكذب على المستخدم بحالة «متزامن» لن تدوم.
      return buildStatus('error', 'رُفعت بياناتك، لكن تعذّر حفظ حالة المزامنة على هذا الجهاز.')
    }
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
  const supabase = getSupabase()
  if (!supabase) return buildStatus('disabled', 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const userId = await currentUserId()
  if (!userId) return buildStatus('guest', 'سجّل الدخول لسحب بياناتك السحابية.')

  try {
    // مرجع فشل التخزين قبل أي كتابة محلية — كل كتابة تمرّ من safeStorage،
    // فإن ظهر فشل جديد (حصّة ممتلئة/تخزين محجوب) فقد سقطت بيانات مسحوبة
    // ولا يجوز إعلان نجاح المزامنة. (كان هذا الفشل صامتًا تمامًا.)
    const failureBefore = getStorageFailure()

    // 1) جلسات التمرين — يفوز الأحدث، مع احترام شواهد الحذف.
    const localSessions = getWorkoutSessions()
    const localSessionById = new Map(localSessions.map((s) => [s.id, s]))
    const { data: cloudSessions, error: e1 } = await supabase
      .from('workout_sessions')
      .select('local_id,data,updated_at')
      .eq('user_id', userId)
    if (e1) throw e1
    ;(cloudSessions ?? []).forEach((row) => {
      const s = row.data as WorkoutSession | null
      if (!s || !s.id) return
      const cloudStamp = (row.updated_at as string) || s.finishedAt || s.startedAt || ''
      // حُذف محليًا بعد هذا الطابع → لا يعود.
      if (isDeletedAfter('workoutSession', s.id, cloudStamp)) return
      const local = localSessionById.get(s.id)
      if (!local || stampToMs(cloudStamp) > stampToMs(getSessionStamp(local))) {
        saveWorkoutSession(s, cloudStamp || undefined)
      }
    })

    // 2) سجل أداء التمارين — ادمج بحيث يفوز الأحدث updated_at (لا lastCompletedAt).
    const localHistory = getExerciseHistory()
    const { data: cloudHistory, error: e2 } = await supabase
      .from('exercise_history')
      .select('exercise_id,data,updated_at')
      .eq('user_id', userId)
    if (e2) throw e2
    const mergedHistory: ExerciseHistory = { ...localHistory }
    const importedStamps: Record<string, string> = {}
    ;(cloudHistory ?? []).forEach((row) => {
      const exId = row.exercise_id as string
      const rec = row.data as ExerciseHistory[string] | null
      if (!exId || !rec) return
      const cloudStamp = (row.updated_at as string) || rec.lastCompletedAt || ''
      if (isDeletedAfter('exerciseHistory', exId, cloudStamp)) return
      const local = localHistory[exId]
      const localStamp = local ? getRecordStamp('exerciseHistory', exId) || local.lastCompletedAt || '' : ''
      // محلي يفوز عند التساوي؛ السحابي يفوز فقط إن كان أحدث فعلًا.
      if (!local || stampToMs(cloudStamp) > stampToMs(localStamp)) {
        mergedHistory[exId] = rec
        if (cloudStamp) importedStamps[exId] = cloudStamp
      }
    })
    saveExerciseHistory(mergedHistory, importedStamps)

    // 3) القياسات — يفوز الأحدث، مع احترام شواهد الحذف.
    const localMeas = getMeasurementLogs()
    const localMeasById = new Map(localMeas.map((m) => [m.id, m]))
    const { data: cloudMeas, error: e3 } = await supabase
      .from('measurement_logs')
      .select('local_id,date,values,notes,updated_at')
      .eq('user_id', userId)
    if (e3) throw e3
    ;(cloudMeas ?? []).forEach((row) => {
      const id = (row.local_id as string) || ''
      if (!id) return
      const cloudStamp = (row.updated_at as string) || (row.date as string) || ''
      if (isDeletedAfter('measurementLog', id, cloudStamp)) return
      const local = localMeasById.get(id)
      if (local && stampToMs(cloudStamp) <= stampToMs(getMeasurementStamp(local))) return
      const log: MeasurementLog = {
        id,
        date: row.date as string,
        values: (row.values as MeasurementLog['values']) ?? {},
        notes: (row.notes as string) ?? undefined,
      }
      saveMeasurementLog(log, cloudStamp || undefined)
    })

    // 4) اللقطات اليومية — يفوز الأحدث updated_at.
    const localDaily = getDailyLogs()
    const { data: cloudDaily, error: e4 } = await supabase
      .from('daily_logs')
      .select('date,data,updated_at')
      .eq('user_id', userId)
    if (e4) throw e4
    ;(cloudDaily ?? []).forEach((row) => {
      const l = row.data as DailyLog | null
      if (!l || !l.date) return
      const cloudStamp = l.updatedAt || (row.updated_at as string) || ''
      if (isDeletedAfter('dailyLog', l.date, cloudStamp)) return
      const local = localDaily[l.date]
      if (!local || stampToMs(cloudStamp) > stampToMs(local.updatedAt)) {
        const { date, updatedAt, ...rest } = l
        void updatedAt
        // نمرّر الطابع الأصلي: بدونه يُعاد ضبط كل مسحوب إلى «الآن» فينهار LWW.
        saveDailyLog(date, rest, cloudStamp || undefined)
      }
    })

    const failureAfter = getStorageFailure()
    if (failureAfter && failureAfter !== failureBefore) {
      const reason =
        failureAfter.result === 'quota'
          ? 'مساحة التخزين على هذا الجهاز ممتلئة'
          : 'التخزين المحلي غير متاح للكتابة'
      return buildStatus('error', `تعذّر حفظ البيانات المسحوبة: ${reason}. لم تُسجَّل المزامنة كناجحة.`)
    }

    const lastSyncedAt = new Date().toISOString()
    if (!writeMeta({ lastSyncedAt, pending: false })) {
      return buildStatus('error', 'سُحبت بياناتك، لكن تعذّر حفظ حالة المزامنة على هذا الجهاز.')
    }
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
