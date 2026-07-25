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
import {
  defaultOnboardingProfile,
  enqueueOnboardingProfileUpsert,
  loadOnboardingProfile,
  saveOnboardingProfileFromSync,
} from './onboardingProfile'
import { isAdoptionPending } from './dataOwnership'
import {
  MAX_SYNC_ATTEMPTS,
  SYNC_ATTENTION_ATTEMPTS,
  TOMBSTONE_TABLES,
  enqueueSyncOperation,
  getSyncRuntime,
  isSyncEnabled,
  readSyncQueue,
  removeSyncOperations,
  scheduleSyncRetry,
  setSyncCapturePaused,
  syncAllowedFor,
  writeSyncBackup,
  type SyncOperation,
  type SyncTable,
} from './syncQueue'
import {
  enqueueAuxOperations,
  enqueueCoverageSnapshot,
  hydrateAccountSettingsFromCloud,
  hydrateAuxFromCloud,
  hydrateCoverageFromCloud,
  readAuxBackup,
} from './syncStores'
import { buildPendingSet, pendingKey, resolveLww, stampMs, type LwwWinner } from './syncLww'
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
  /** نتيجة آخر دفعة (P12) — «synced» لا تُدّعى قبل أول نجاح فعلي. */
  lastResult?: 'success' | 'error'
  lastErrorAt?: string
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
            : table === 'daily_logs' || table === 'step_logs' || table === 'nutrition_ledger' || table === 'recovery_logs'
              ? 'user_id,date'
              : table === 'achievements' || table === 'custom_plans' || table === 'todos' || table === 'workout_schedule'
                ? 'user_id'
                : 'user_id,local_id',
      })
      if (error) throw error
    },
    async delete(table, userId, entityKeys) {
      // جداول tombstone لا تمرّ من هنا (flush يحوّل حذفها upsert شاهد قبر).
      const entityColumn =
        table === 'exercise_history'
          ? 'exercise_id'
          : table === 'daily_logs' || table === 'step_logs' || table === 'nutrition_ledger' || table === 'recovery_logs'
            ? 'date'
            : 'local_id'
      const query = supabase.from(table).delete().eq('user_id', userId)
      const { error } =
        table === 'workout_schedule' ? await query : await query.in(entityColumn, entityKeys)
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

// ═══ حالة المزامنة المطبوعة للواجهة (عقد Codex — P12) ═══════════════════════

export type SyncUiStateKind = 'local' | 'syncing' | 'synced' | 'attention'

export interface SyncUiState {
  state: SyncUiStateKind
  /** عدد العمليات المنتظرة في طابور الرفع لمالك الجلسة (0 للضيف/المعطَّل). */
  pendingCount: number
  /** آخر مزامنة ناجحة فعلًا — null قبل أول نجاح (لا ادّعاء «متزامن» أبدًا قبله). */
  lastSyncedAt: string | null
  /** سبب مقروء آليًا لحالتي attention/local — للواجهة أن تترجمه. */
  reason?:
    | 'sync-disabled'
    | 'signed-out'
    | 'never-synced'
    | 'adoption-pending'
    | 'repeated-failures'
    | 'retry-exhausted'
}

/**
 * الحقيقة المطبوعة للواجهة:
 *   • «synced» لا تُدّعى إلا وطابور الرفع فارغ **و**آخر دفعة نجحت فعلًا.
 *   • «attention»: تبنٍّ معلّق، فشل متكرر (≥SYNC_ATTENTION_ATTEMPTS)، أو
 *     استنفاد المحاولات (≥MAX_SYNC_ATTEMPTS — يعالجه retryExhaustedSyncOperations).
 *   • «syncing»: عمل جارٍ (flush/ترطيب) أو عمليات منتظرة لم تفشل بعد.
 *   • «local»: المزامنة مطفأة/ضيف/لم تحدث مزامنة ناجحة بعد — البيانات محلية موثوقة.
 */
export function getSyncUiState(): SyncUiState {
  const userId = getSyncRuntime().userId
  if (!isSyncEnabled()) return { state: 'local', pendingCount: 0, lastSyncedAt: null, reason: 'sync-disabled' }
  if (!userId) return { state: 'local', pendingCount: 0, lastSyncedAt: null, reason: 'signed-out' }
  const queue = readSyncQueue(userId)
  const meta = readMeta(userId)
  const lastSyncedAt = meta.lastResult === 'success' && meta.lastSyncedAt ? meta.lastSyncedAt : null
  const base = { pendingCount: queue.length, lastSyncedAt }
  if (isAdoptionPending(userId)) return { state: 'attention', ...base, reason: 'adoption-pending' }
  if (queue.some((op) => op.attempts >= MAX_SYNC_ATTEMPTS)) return { state: 'attention', ...base, reason: 'retry-exhausted' }
  if (queue.some((op) => op.attempts >= SYNC_ATTENTION_ATTEMPTS)) return { state: 'attention', ...base, reason: 'repeated-failures' }
  if (flushPromise || hydrationFlight) return { state: 'syncing', ...base }
  if (queue.length > 0) return { state: 'syncing', ...base }
  if (lastSyncedAt) return { state: 'synced', ...base }
  return { state: 'local', ...base, reason: 'never-synced' }
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

/**
 * صف شاهد القبر (P12) لجداول TOMBSTONE_TABLES: upsert يمسح الحمولة (خصوصية —
 * المحذوف لا يبقى قابلًا للقراءة سحابيًّا) ويثبت deleted_at/updated_at كطابع LWW،
 * فلا يُبعث المحذوف على جهاز آخر بمزامنة أقدم ولا يُحذف أحدث منه بصمت.
 */
function tombstoneRow(op: SyncOperation): Record<string, unknown> {
  const deletedAt = typeof op.payload.deleted_at === 'string' ? op.payload.deleted_at : op.createdAt
  const base = { user_id: op.userId, deleted_at: deletedAt, updated_at: deletedAt }
  switch (op.table) {
    case 'measurement_logs':
      return { ...base, local_id: op.entityKey, values: {}, notes: null }
    case 'nutrition_ledger':
      return { ...base, date: op.entityKey, data: {} }
    case 'workout_schedule':
      return { ...base, data: {} }
    case 'plan_templates':
      return { ...base, local_id: op.entityKey, data: {} }
    default:
      return { ...base, local_id: op.entityKey }
  }
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
        if (action === 'delete') {
          // جداول tombstone: الحذف upsert شاهد قبر بطابع (LWW على الأجهزة الأخرى)؛
          // الباقي يبقى حذفًا مباشرًا (سلوكه الموروث الموثَّق).
          if (TOMBSTONE_TABLES.has(tableValue)) await client.upsert(tableValue, batch.map(tombstoneRow))
          else await client.delete(tableValue, userId, batch.map((op) => op.entityKey))
        } else {
          await client.upsert(
            tableValue,
            batch.map((op) => ({ ...op.payload, user_id: op.userId })),
          )
        }
        removeSyncOperations(userId, ids)
      } catch {
        scheduleSyncRetry(userId, ids, now)
        writeMeta(userId, { ...readMeta(userId), lastResult: 'error', lastErrorAt: new Date(now).toISOString() })
        return buildStatus('error', userId, 'تعذّر الرفع؛ ستُعاد المحاولة تلقائيًا.')
      }
    }
  }

  const lastSyncedAt = new Date(now).toISOString()
  writeMeta(userId, { ...readMeta(userId), lastSyncedAt, lastResult: 'success' })
  return buildStatus('synced', userId, 'تمت المزامنة بنجاح.')
}

export function flushSyncQueue(now = Date.now()): Promise<SyncStatus> {
  if (flushPromise) return flushPromise
  flushPromise = flushImpl(now).finally(() => {
    flushPromise = null
  })
  return flushPromise
}

function conflict(table: SyncTable, entityKey: string, resolution: 'local-wins-lww' | 'cloud-wins-lww' = 'cloud-wins-lww'): void {
  // Metadata only: never log payloads, health values, notes, or auth material.
  console.info('[qimmah-sync-conflict]', { table, entityKey, resolution })
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

/**
 * دمج LWW فعلي (يستبدل server-wins الأعمى): لكل سجل يُقارن طابع التعديل المحلي
 * بالسحابي، وأي كيان له عملية معلّقة في طابور الرفع يُعامل كأحدث محليًا. لا
 * حذف صامت في أي مسار — السجلات المحلية غير الموجودة سحابيًا تبقى دائمًا.
 */
export function mergeCloudIntoSnapshot(
  local: HistorySnapshot,
  rows: Partial<Record<SyncTable, Record<string, unknown>[]>>,
  pending: ReadonlySet<string> = new Set(),
): HistorySnapshot {
  const decide = (table: SyncTable, key: string, localItem: { exists: boolean; stamp: unknown }, cloudStamp: unknown): LwwWinner => {
    const winner = resolveLww({
      localExists: localItem.exists,
      localStamp: localItem.stamp,
      cloudStamp,
      pendingLocal: pending.has(pendingKey(table, key)),
    })
    if (localItem.exists) conflict(table, key, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
    return winner
  }

  const sessions = new Map(local.workoutSessions.map((item) => [item.id, item]))
  for (const row of rows.workout_sessions ?? []) {
    const item = row.data as WorkoutSession | undefined
    if (!item?.id) continue
    const existing = sessions.get(item.id)
    const winner = decide(
      'workout_sessions',
      item.id,
      { exists: !!existing, stamp: existing ? (existing.finishedAt ?? existing.startedAt) : 0 },
      item.finishedAt ?? item.startedAt ?? row.updated_at,
    )
    if (winner === 'cloud') sessions.set(item.id, item)
  }

  const exerciseHistory: ExerciseHistory = { ...local.exerciseHistory }
  for (const row of rows.exercise_history ?? []) {
    const key = typeof row.exercise_id === 'string' ? row.exercise_id : ''
    const item = row.data as ExerciseHistory[string] | undefined
    if (!key || !item) continue
    const existing = exerciseHistory[key]
    const winner = decide(
      'exercise_history',
      key,
      { exists: !!existing, stamp: existing?.lastCompletedAt ?? 0 },
      item.lastCompletedAt ?? row.updated_at,
    )
    if (winner === 'cloud') exerciseHistory[key] = item
  }

  const measurements = new Map(local.measurementLogs.map((item) => [item.id, item]))
  for (const row of rows.measurement_logs ?? []) {
    const id = typeof row.local_id === 'string' ? row.local_id : ''
    if (!id) continue
    const existing = measurements.get(id)
    // شاهد قبر (P12): حذفٌ من جهاز آخر يفوز فقط إذا كان أحدث من الدليل المحلي —
    // تعديل محلي أحدث (أو معلّق بالطابور) يبقى ويُعيد إحياء الصف عند الرفع.
    if (row.deleted_at) {
      if (!existing) continue
      const winner = decide(
        'measurement_logs',
        id,
        { exists: true, stamp: existing.updatedAt ?? existing.date ?? 0 },
        row.deleted_at,
      )
      if (winner === 'cloud') measurements.delete(id)
      continue
    }
    // سجل محلي قديم بلا updatedAt يسقط لدقّة اليوم (date) — لا يُقلب بلا دليل أحدثية.
    const winner = decide(
      'measurement_logs',
      id,
      { exists: !!existing, stamp: existing?.updatedAt ?? existing?.date ?? 0 },
      row.updated_at ?? row.date,
    )
    if (winner === 'cloud') {
      measurements.set(id, {
        id,
        date: String(row.date ?? ''),
        values: (row.values ?? {}) as MeasurementLog['values'],
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
      })
    }
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
  // daily_logs: الحسم لكل شريحة على حدة بطابعها الداخلي updatedAt — تعديل ماء
  // أحدث محليًا لا يخسر أمام صف سحابي حمل تغذية أحدث، والعكس صحيح.
  for (const row of rows.daily_logs ?? []) {
    const date = typeof row.date === 'string' ? row.date : ''
    if (!date) continue
    const slices = dailySlices(row.data)
    const slice = <T extends { updatedAt?: string }>(bucket: Record<string, T>, incoming: T | undefined) => {
      if (!incoming) return
      const existing = bucket[date]
      const winner = decide(
        'daily_logs',
        date,
        { exists: !!existing, stamp: existing?.updatedAt ?? 0 },
        incoming.updatedAt ?? row.updated_at,
      )
      if (winner === 'cloud') bucket[date] = incoming
    }
    slice(next.dailyLogs, slices.daily)
    slice(next.nutritionLogs, slices.nutrition)
    slice(next.waterLogs, slices.water)
    slice(next.supplementLogs, slices.supplements)
    slice(next.medicationLogs, slices.medications)
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
  // سياسة خصوصية الصحة (P12): القياسات المستوردة من HealthKit (source:'health')
  // لا تُرفع لسحابتنا أبدًا — اليدوي فقط يُزامَن (docs/data/SYNC-COVERAGE.md).
  snapshot.measurementLogs
    .filter((item) => item.source !== 'health')
    .forEach((item) =>
      enqueueSyncOperation('measurement_logs', item.id, {
        local_id: item.id,
        date: item.date,
        values: item.values,
        notes: item.notes ?? null,
        updated_at: item.updatedAt ?? item.date,
        deleted_at: null,
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
  // المسار القانوني الواحد لرفع onboarding (إصلاح سباق الكتّاب الثلاثة — P12).
  if (onboarding) enqueueOnboardingProfileUpsert(onboarding)
}

/**
 * Re-enqueue a user-confirmed local restore through the canonical sync mapping.
 * This is deliberately owner/recovery/feature guarded by the same runtime used
 * by normal store writes; callers never receive a transport or bypass RLS.
 */
export function enqueueImportedStateForSync(userId: string): boolean {
  const runtime = getSyncRuntime()
  if (!userId || runtime.userId !== userId || runtime.recoveryActive || !syncAllowedFor(userId)) return false
  const before = readSyncQueue(userId).length
  enqueueSnapshot(exportHistory(), loadOnboardingProfile())
  enqueueAuxOperations(userId)
  return readSyncQueue(userId).length > before
}

function mergedCloudOnboarding(
  cloud: unknown,
  local: OnboardingProfile | null,
  cloudRowStamp?: unknown,
  pending: ReadonlySet<string> = new Set(),
): OnboardingProfile | null {
  if (!cloud || typeof cloud !== 'object') return local
  if ('_meta' in cloud) {
    const cloudProfile = cloud as OnboardingProfile
    if (!local) return cloudProfile
    // LWW فعلي (P12): طوابع _meta.updatedAt تحسم — الشكل الكامل السحابي لم يعد
    // يفوز بمجرد وجوده؛ التعديل المحلي الأحدث (أو المعلّق بالطابور) يبقى.
    const winner = resolveLww({
      localExists: true,
      localStamp: stampMs(local._meta.updatedAt ?? local._meta.completedAt),
      cloudStamp: stampMs(cloudProfile._meta.updatedAt ?? cloudProfile._meta.completedAt) || stampMs(cloudRowStamp as string),
      pendingLocal: pending.has(pendingKey('profiles', 'profile')),
    })
    return winner === 'cloud' ? cloudProfile : local
  }
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
      'nutrition_ledger',
      'recovery_logs',
      'workout_schedule',
      'plan_templates',
    ]
    const pulled = await Promise.all(tables.map(async (table) => [table, await client.select(table, userId)] as const))
    if ((await guardedOwner(client)) !== userId) return buildStatus('error', userId, 'أُوقف السحب بسبب تغيّر الحساب.')
    const rows = Object.fromEntries(pulled) as Record<SyncTable, Record<string, unknown>[]>
    // الكيانات المعلّقة بطابور الرفع = تعديلات محلية أحدث بالتعريف — تُحمى من الدهس.
    const pendingOps = buildPendingSet(readSyncQueue(userId))
    const merged = mergeCloudIntoSnapshot(localHistory, rows, pendingOps)
    const profileData = rows.profiles[0]?.data
    const cloudOnboardingRaw =
      profileData && typeof profileData === 'object'
        ? (profileData as Record<string, unknown>).onboarding
        : undefined
    const cloudSettingsRaw =
      profileData && typeof profileData === 'object'
        ? (profileData as Record<string, unknown>).settings
        : undefined
    const resolvedOnboarding = mergedCloudOnboarding(
      cloudOnboardingRaw,
      localOnboarding,
      rows.profiles[0]?.updated_at,
      pendingOps,
    )

    setSyncCapturePaused(true)
    try {
      importHistory(merged)
      if (cloudOnboardingRaw && resolvedOnboarding && resolvedOnboarding !== localOnboarding) {
        if (localOnboarding) conflict('profiles', 'profile')
        // كتابة بلا إعادة ختم — إعادة الختم بـ«الآن» تزوّر أحدثية LWW للأجهزة الأخرى.
        saveOnboardingProfileFromSync(resolvedOnboarding)
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
        pendingOps,
      )
      // مخازن التغطية الجديدة (P12): دمج LWW حقيقي لكل سجل + شواهد القبر.
      hydrateCoverageFromCloud(
        userId,
        {
          nutrition_ledger: rows.nutrition_ledger,
          recovery_logs: rows.recovery_logs,
          workout_schedule: rows.workout_schedule,
          plan_templates: rows.plan_templates,
        },
        conflict,
        pendingOps,
      )
      // إعدادات الحساب — شريحة profiles.data.settings بطابعها.
      hydrateAccountSettingsFromCloud(cloudSettingsRaw, conflict, pendingOps)
    } finally {
      setSyncCapturePaused(false)
    }
    // enqueueSnapshot uploads the merged history; the merged aux stores are
    // enqueued by the flushSyncQueue() below (flush captures aux each cycle).
    // مخازن التغطية الجديدة تُرفع لقطتها المدموجة هنا مرة واحدة (خطاطيف الكتابة
    // داخل مخازنها تتولى التعديلات الحية بعد ذلك).
    enqueueSnapshot(merged, resolvedOnboarding)
    enqueueCoverageSnapshot(userId)
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
