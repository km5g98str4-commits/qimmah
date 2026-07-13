// Owner-scoped, feature-gated cloud sync. Local writes are durable first; cloud work is queued.

import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import {
  exportHistory,
  importHistory,
  type DailyLog,
  type HistorySnapshot,
  type MedicationLog,
  type NutritionLog,
  type SupplementLog,
  type WaterLog,
} from './historyStore'
import { defaultOnboardingProfile, loadOnboardingProfile, saveOnboardingProfile } from './onboardingProfile'
import {
  enqueueSyncOperation,
  getSyncRuntime,
  isSyncEnabled,
  readSyncQueue,
  removeSyncOperations,
  scheduleSyncRetry,
  setSyncCapturePaused,
  syncAllowedFor,
  writeSyncBackup,
  type SyncTable,
} from './syncQueue'
import { enqueueAuxOperations, hydrateAuxFromCloud, readAuxBackup } from './syncStores'
import type { WorkoutSession } from './workoutSessions'
import type { ExerciseHistory } from './exerciseHistory'
import type { MeasurementLog } from '@/types/progress'
import type { OnboardingProfile } from '@/types/onboarding'

const SYNC_META_PREFIX = 'qimmah:sync:meta:v1:'
const BATCH_SIZE = 50

export type SyncState = 'disabled' | 'guest' | 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

export interface SyncStatus {
  configured: boolean
  signedIn: boolean
  state: SyncState
  lastSyncedAt?: string
  pending: boolean
  message: string
}

interface SyncMeta {
  lastSyncedAt?: string
}

export interface SyncTransport {
  currentUserId(): Promise<string | null>
  upsert(table: SyncTable, rows: Record<string, unknown>[]): Promise<void>
  delete(table: SyncTable, userId: string, entityKeys: string[]): Promise<void>
  select(table: SyncTable, userId: string): Promise<Record<string, unknown>[]>
}

let testTransport: SyncTransport | undefined
let flushPromise: Promise<SyncStatus> | null = null
let hydrationFlight: { userId: string; promise: Promise<SyncStatus> } | null = null

/** Proof-script seam; production always uses the authenticated Supabase transport. */
export function setSyncTransportForTests(transport: SyncTransport | undefined): void {
  testTransport = transport
}

function metaKey(userId: string): string {
  return `${SYNC_META_PREFIX}${userId}`
}

function readMeta(userId: string): SyncMeta {
  if (typeof window === 'undefined' || !userId) return {}
  try {
    const raw = window.localStorage.getItem(metaKey(userId))
    return raw ? (JSON.parse(raw) as SyncMeta) : {}
  } catch {
    return {}
  }
}

function writeMeta(userId: string, meta: SyncMeta): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(metaKey(userId), JSON.stringify(meta))
  } catch {
    /* Local data remains authoritative if metadata persistence fails. */
  }
}

function buildStatus(state: SyncState, userId: string | null, message: string): SyncStatus {
  const meta = userId ? readMeta(userId) : {}
  return {
    configured: isSupabaseConfigured() || Boolean(testTransport),
    signedIn: Boolean(userId),
    state,
    lastSyncedAt: meta.lastSyncedAt,
    pending: userId ? readSyncQueue(userId).length > 0 : false,
    message,
  }
}

async function productionTransport(): Promise<SyncTransport | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  return {
    async currentUserId() {
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
    async upsert(table, rows) {
      if (table === 'profiles') {
        for (const row of rows) {
          const userId = String(row.user_id ?? '')
          const { data: existing, error: readError } = await supabase
            .from('profiles')
            .select('data')
            .eq('user_id', userId)
            .maybeSingle()
          if (readError) throw readError
          const previous =
            existing?.data && typeof existing.data === 'object' ? (existing.data as Record<string, unknown>) : {}
          const incoming = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
          const { error } = await supabase
            .from('profiles')
            .upsert({ ...row, data: { ...previous, ...incoming } }, { onConflict: 'user_id' })
          if (error) throw error
        }
        return
      }
      const { error } = await supabase.from(table).upsert(rows, {
        onConflict:
          table === 'exercise_history'
            ? 'user_id,exercise_id'
            : table === 'daily_logs' || table === 'step_logs'
              ? 'user_id,date'
              : table === 'achievements' || table === 'custom_plans' || table === 'todos'
                ? 'user_id'
                : 'user_id,local_id',
      })
      if (error) throw error
    },
    async delete(table, userId, entityKeys) {
      const entityColumn =
        table === 'exercise_history'
          ? 'exercise_id'
          : table === 'daily_logs' || table === 'step_logs'
            ? 'date'
            : 'local_id'
      const { error } = await supabase.from(table).delete().eq('user_id', userId).in(entityColumn, entityKeys)
      if (error) throw error
    },
    async select(table, userId) {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []) as Record<string, unknown>[]
    },
  }
}

async function transport(): Promise<SyncTransport | null> {
  return testTransport ?? productionTransport()
}

async function guardedOwner(candidate: SyncTransport): Promise<string | null> {
  const runtime = getSyncRuntime()
  if (!runtime.userId || runtime.recoveryActive || !syncAllowedFor(runtime.userId)) return null
  try {
    const authenticated = await candidate.currentUserId()
    return authenticated === runtime.userId ? authenticated : null
  } catch {
    return null
  }
}

export function getSyncStatus(signedIn: boolean): SyncStatus {
  const userId = signedIn ? getSyncRuntime().userId : null
  if (!isSyncEnabled()) return buildStatus('disabled', userId, 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  if (!userId) return buildStatus('guest', null, 'سجّل الدخول لمزامنة بياناتك سحابيًا.')
  if (readSyncQueue(userId).length) return buildStatus('pending', userId, 'توجد تغييرات لم تُرفع بعد.')
  if (readMeta(userId).lastSyncedAt) return buildStatus('synced', userId, 'بياناتك متزامنة مع حسابك السحابي.')
  return buildStatus('idle', userId, 'جاهز للمزامنة.')
}

/** Compatibility hook: local stores now enqueue concrete operations directly. */
export function markPendingSync(): void {
  // Intentionally empty; queue length is the durable pending source of truth.
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

async function flushImpl(now = Date.now()): Promise<SyncStatus> {
  if (!isSyncEnabled()) return buildStatus('disabled', null, 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const client = await transport()
  if (!client) return buildStatus('disabled', null, 'المزامنة السحابية غير مضبوطة.')
  const userId = await guardedOwner(client)
  if (!userId) return buildStatus('guest', null, 'أُوقفت المزامنة: مالك الجلسة غير مطابق أو الاستعادة نشطة.')

  // Capture the latest aux-store state (steps/achievements/custom_plans/todos)
  // each cycle so live edits ship without a per-write hook in the feature stores.
  // Bounded + idempotent (replace-on-enqueue); self-guards to this same owner.
  enqueueAuxOperations(userId)

  const due = readSyncQueue(userId).filter((op) => op.userId === userId && op.nextAttemptAt <= now)
  if (!due.length) return buildStatus('idle', userId, 'لا توجد تغييرات جاهزة للرفع.')

  const groups = [...new Set(due.map((op) => `${op.action}:${op.table}`))]
  for (const group of groups) {
    const [action, tableValue] = group.split(':') as ['upsert' | 'delete', SyncTable]
    const tableOps = due.filter((op) => op.table === tableValue && op.action === action)
    for (const batch of chunks(tableOps, BATCH_SIZE)) {
      // Re-check immediately before every exfiltration boundary.
      if ((await guardedOwner(client)) !== userId) {
        return buildStatus('error', userId, 'أُوقفت المزامنة بسبب تغيّر الحساب.')
      }
      const ids = new Set(batch.map((op) => op.id))
      try {
        if (action === 'delete') await client.delete(tableValue, userId, batch.map((op) => op.entityKey))
        else {
          await client.upsert(
            tableValue,
            batch.map((op) => ({ ...op.payload, user_id: op.userId })),
          )
        }
        removeSyncOperations(userId, ids)
      } catch {
        scheduleSyncRetry(userId, ids, now)
        return buildStatus('error', userId, 'تعذّر الرفع؛ ستُعاد المحاولة تلقائيًا.')
      }
    }
  }

  const lastSyncedAt = new Date(now).toISOString()
  writeMeta(userId, { lastSyncedAt })
  return buildStatus('synced', userId, 'تمت المزامنة بنجاح.')
}

export function flushSyncQueue(now = Date.now()): Promise<SyncStatus> {
  if (flushPromise) return flushPromise
  flushPromise = flushImpl(now).finally(() => {
    flushPromise = null
  })
  return flushPromise
}

function conflict(table: SyncTable, entityKey: string): void {
  // Metadata only: never log payloads, health values, notes, or auth material.
  console.info('[qimmah-sync-conflict]', { table, entityKey, resolution: 'server-wins' })
}

function dailySlices(data: unknown): {
  daily?: DailyLog
  nutrition?: NutritionLog
  water?: WaterLog
  supplements?: SupplementLog
  medications?: MedicationLog
} {
  if (!data || typeof data !== 'object') return {}
  const value = data as Record<string, unknown>
  // Backward compatibility: old rows stored DailyLog directly in data.
  if (typeof value.date === 'string' && typeof value.updatedAt === 'string') return { daily: value as unknown as DailyLog }
  return value as ReturnType<typeof dailySlices>
}

function mergeCloudIntoSnapshot(local: HistorySnapshot, rows: Record<SyncTable, Record<string, unknown>[]>): HistorySnapshot {
  const sessions = new Map(local.workoutSessions.map((item) => [item.id, item]))
  for (const row of rows.workout_sessions) {
    const item = row.data as WorkoutSession | undefined
    if (!item?.id) continue
    if (sessions.has(item.id)) conflict('workout_sessions', item.id)
    sessions.set(item.id, item)
  }

  const exerciseHistory: ExerciseHistory = { ...local.exerciseHistory }
  for (const row of rows.exercise_history) {
    const key = typeof row.exercise_id === 'string' ? row.exercise_id : ''
    const item = row.data as ExerciseHistory[string] | undefined
    if (!key || !item) continue
    if (exerciseHistory[key]) conflict('exercise_history', key)
    exerciseHistory[key] = item
  }

  const measurements = new Map(local.measurementLogs.map((item) => [item.id, item]))
  for (const row of rows.measurement_logs) {
    const id = typeof row.local_id === 'string' ? row.local_id : ''
    if (!id) continue
    if (measurements.has(id)) conflict('measurement_logs', id)
    measurements.set(id, {
      id,
      date: String(row.date ?? ''),
      values: (row.values ?? {}) as MeasurementLog['values'],
      notes: typeof row.notes === 'string' ? row.notes : undefined,
    })
  }

  const next: HistorySnapshot = {
    ...local,
    workoutSessions: [...sessions.values()],
    exerciseHistory,
    measurementLogs: [...measurements.values()],
    dailyLogs: { ...local.dailyLogs },
    nutritionLogs: { ...local.nutritionLogs },
    waterLogs: { ...local.waterLogs },
    supplementLogs: { ...local.supplementLogs },
    medicationLogs: { ...local.medicationLogs },
  }
  for (const row of rows.daily_logs) {
    const date = typeof row.date === 'string' ? row.date : ''
    if (!date) continue
    const slices = dailySlices(row.data)
    if (
      next.dailyLogs[date] ||
      next.nutritionLogs[date] ||
      next.waterLogs[date] ||
      next.supplementLogs[date] ||
      next.medicationLogs[date]
    )
      conflict('daily_logs', date)
    if (slices.daily) next.dailyLogs[date] = slices.daily
    if (slices.nutrition) next.nutritionLogs[date] = slices.nutrition
    if (slices.water) next.waterLogs[date] = slices.water
    if (slices.supplements) next.supplementLogs[date] = slices.supplements
    if (slices.medications) next.medicationLogs[date] = slices.medications
  }
  return next
}

function enqueueSnapshot(snapshot: HistorySnapshot, onboarding: OnboardingProfile | null): void {
  snapshot.workoutSessions.forEach((session) =>
    enqueueSyncOperation('workout_sessions', session.id, {
      local_id: session.id,
      date: session.date,
      started_at: session.startedAt,
      finished_at: session.finishedAt ?? null,
      workout_day_id: session.workoutDayId,
      workout_day_name: session.workoutDayName,
      data: session,
      updated_at: session.finishedAt ?? session.startedAt,
    }),
  )
  Object.entries(snapshot.exerciseHistory).forEach(([exerciseId, data]) =>
    enqueueSyncOperation('exercise_history', exerciseId, { exercise_id: exerciseId, data, updated_at: data.lastCompletedAt }),
  )
  snapshot.measurementLogs.forEach((item) =>
    enqueueSyncOperation('measurement_logs', item.id, {
      local_id: item.id,
      date: item.date,
      values: item.values,
      notes: item.notes ?? null,
    }),
  )
  const dates = new Set([
    ...Object.keys(snapshot.dailyLogs),
    ...Object.keys(snapshot.nutritionLogs),
    ...Object.keys(snapshot.waterLogs),
    ...Object.keys(snapshot.supplementLogs),
    ...Object.keys(snapshot.medicationLogs),
  ])
  dates.forEach((date) =>
    enqueueSyncOperation('daily_logs', date, {
      date,
      data: {
        daily: snapshot.dailyLogs[date],
        nutrition: snapshot.nutritionLogs[date],
        water: snapshot.waterLogs[date],
        supplements: snapshot.supplementLogs[date],
        medications: snapshot.medicationLogs[date],
      },
    }),
  )
  if (onboarding) enqueueSyncOperation('profiles', 'profile', { data: { onboarding } })
}

function mergedCloudOnboarding(cloud: unknown, local: OnboardingProfile | null): OnboardingProfile | null {
  if (!cloud || typeof cloud !== 'object') return local
  if ('_meta' in cloud) return cloud as OnboardingProfile
  const legacy = cloud as Record<string, unknown>
  const base = local ?? defaultOnboardingProfile()
  const goalType = legacy.goalType
  const validGoal = goalType === 'cut' || goalType === 'bulk' || goalType === 'maintain' ? goalType : base.goal.type
  return {
    ...base,
    bodyMetrics: {
      ...base.bodyMetrics,
      heightCm: typeof legacy.heightCm === 'number' ? legacy.heightCm : base.bodyMetrics.heightCm,
      currentWeightKg:
        typeof legacy.currentWeightKg === 'number' ? legacy.currentWeightKg : base.bodyMetrics.currentWeightKg,
      targetWeightKg:
        typeof legacy.targetWeightKg === 'number' ? legacy.targetWeightKg : base.bodyMetrics.targetWeightKg,
    },
    goal: { ...base.goal, type: validGoal },
    _meta: {
      ...base._meta,
      completed: legacy.onboardingCompleted === true || base._meta.completed,
    },
  }
}

/** First-login hydration: backup local, overlay cloud (server wins), then upload the merged snapshot. */
async function hydrateImpl(): Promise<SyncStatus> {
  if (!isSyncEnabled()) return buildStatus('disabled', null, 'المزامنة السحابية غير مفعّلة في هذه النسخة.')
  const client = await transport()
  if (!client) return buildStatus('disabled', null, 'المزامنة السحابية غير مضبوطة.')
  const userId = await guardedOwner(client)
  if (!userId) return buildStatus('guest', null, 'أُوقف السحب: مالك الجلسة غير مطابق أو الاستعادة نشطة.')

  const localHistory = exportHistory()
  const localOnboarding = loadOnboardingProfile()
  const backup = {
    createdAt: new Date().toISOString(),
    userId,
    history: localHistory,
    onboardingProfile: localOnboarding,
    // Fold the four aux stores into the same owner-scoped backup key so a
    // server-wins overlay below is always recoverable (wipeUserData clears it).
    aux: readAuxBackup(userId),
  }
  if (!writeSyncBackup(userId, backup)) {
    return buildStatus('error', userId, 'تعذّر حفظ النسخة المحلية؛ لم تُغيّر أي بيانات.')
  }

  try {
    const tables: SyncTable[] = [
      'profiles',
      'workout_sessions',
      'exercise_history',
      'measurement_logs',
      'daily_logs',
      'step_logs',
      'achievements',
      'custom_plans',
      'todos',
    ]
    const pulled = await Promise.all(tables.map(async (table) => [table, await client.select(table, userId)] as const))
    if ((await guardedOwner(client)) !== userId) return buildStatus('error', userId, 'أُوقف السحب بسبب تغيّر الحساب.')
    const rows = Object.fromEntries(pulled) as Record<SyncTable, Record<string, unknown>[]>
    const merged = mergeCloudIntoSnapshot(localHistory, rows)
    const profileData = rows.profiles[0]?.data
    const cloudOnboardingRaw =
      profileData && typeof profileData === 'object'
        ? (profileData as Record<string, unknown>).onboarding
        : undefined
    const resolvedOnboarding = mergedCloudOnboarding(cloudOnboardingRaw, localOnboarding)

    setSyncCapturePaused(true)
    try {
      importHistory(merged)
      if (cloudOnboardingRaw && resolvedOnboarding) {
        if (localOnboarding) conflict('profiles', 'profile')
        saveOnboardingProfile(resolvedOnboarding)
      }
      // Aux stores: server-wins overlay (backup already persisted above). Local-only
      // entries are kept; every overwrite of existing local data is logged.
      hydrateAuxFromCloud(
        userId,
        {
          step_logs: rows.step_logs,
          achievements: rows.achievements,
          custom_plans: rows.custom_plans,
          todos: rows.todos,
        },
        conflict,
      )
    } finally {
      setSyncCapturePaused(false)
    }
    // enqueueSnapshot uploads the merged history; the merged aux stores are
    // enqueued by the flushSyncQueue() below (flush captures aux each cycle).
    enqueueSnapshot(merged, resolvedOnboarding)
    return flushSyncQueue()
  } catch {
    return buildStatus('error', userId, 'تعذّر سحب البيانات؛ بقيت النسخة المحلية دون تغيير.')
  }
}

export function hydrateFromCloud(): Promise<SyncStatus> {
  const userId = getSyncRuntime().userId
  if (!userId) return hydrateImpl()
  if (hydrationFlight?.userId === userId) return hydrationFlight.promise
  if (hydrationFlight) return hydrationFlight.promise.then(() => hydrateFromCloud())
  const promise = hydrateImpl().finally(() => {
    if (hydrationFlight?.promise === promise) hydrationFlight = null
  })
  hydrationFlight = { userId, promise }
  return promise
}

export async function syncLocalToCloud(): Promise<SyncStatus> {
  return flushSyncQueue()
}

export async function pullCloudToLocal(): Promise<SyncStatus> {
  return hydrateFromCloud()
}

export async function fullSync(): Promise<SyncStatus> {
  const userId = getSyncRuntime().userId
  if (userId && readSyncQueue(userId).length > 0) {
    const flushed = await flushSyncQueue()
    if (readSyncQueue(userId).length > 0) return flushed
  }
  return hydrateFromCloud()
}

export function snapshotForExport(): HistorySnapshot {
  return exportHistory()
}

export function restoreSnapshot(snapshot: Partial<HistorySnapshot>): void {
  importHistory(snapshot)
}

/** Flushes on browser connectivity/foreground and native Capacitor app foreground. */
export function startSyncLifecycle(): () => void {
  if (!isSyncEnabled() || typeof window === 'undefined') return () => undefined
  const flush = () => void flushSyncQueue()
  const onVisibility = () => {
    if (document.visibilityState === 'visible') flush()
  }
  window.addEventListener('online', flush)
  document.addEventListener('visibilitychange', onVisibility)
  let nativeRemove: (() => Promise<void>) | undefined
  let disposed = false
  void import('@capacitor/app')
    .then(async ({ App }) => {
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) flush()
      })
      if (disposed) await handle.remove()
      else nativeRemove = () => handle.remove()
    })
    .catch(() => {
      /* Browser builds and unsupported native shells keep the web lifecycle hooks. */
    })
  return () => {
    disposed = true
    window.removeEventListener('online', flush)
    document.removeEventListener('visibilitychange', onVisibility)
    void nativeRemove?.()
  }
}
