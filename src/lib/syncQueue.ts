/**
 * FEATURE FLAG — cloud sync wiring
 * Name: VITE_SYNC_ENABLED. Default: OFF (only the literal string "true" enables it).
 * Enable only for device testing after Supabase schema/RLS verification; every entry
 * point below also requires a matching authenticated owner and recoveryActive=false.
 */
import { isAdoptionPending } from './dataOwnership'

const ENV_SYNC_ENABLED = import.meta.env.VITE_SYNC_ENABLED === 'true'

export const SYNC_QUEUE_PREFIX = 'qimmah:syncQueue:v1:'
export const SYNC_BACKUP_PREFIX = 'qimmah:syncBackup:v1:'

export type SyncTable =
  | 'profiles'
  | 'workout_sessions'
  | 'exercise_history'
  | 'measurement_logs'
  | 'daily_logs'
  // Coverage extension (wave3): dedicated homes for stores that were sync-blind.
  // Per-day: step_logs (unique user_id,date). Per-account singles: achievements,
  // custom_plans, todos (unique user_id). Nutrition/water/supplement/medication
  // deliberately STAY in the daily_logs aggregate — see docs/sync-coverage-map.md
  // — so nothing double-syncs into their (also-present) dedicated tables.
  | 'step_logs'
  | 'achievements'
  | 'custom_plans'
  | 'todos'
  // Coverage completion (P12): dated nutrition ledger detail (unique user_id,date;
  // aggregates keep flowing via daily_logs — the ledger row carries the entries),
  // recovery engine v2 daily checks (unique user_id,date), the weekly workout
  // schedule (single row, unique user_id) and named plan templates (unique
  // user_id,local_id). Account-linked settings ride profiles.data.settings —
  // no new table. See docs/data/SYNC-COVERAGE.md.
  | 'nutrition_ledger'
  | 'recovery_logs'
  | 'workout_schedule'
  | 'plan_templates'

/**
 * كل جدول يجوز للعميل الدفع إليه. مُصدَّر ليقارنه برهان المخطط
 * (`npm run test:db-schema`) بجداول supabase/migrations — أي انحراف بين العميل
 * وقاعدة البيانات يُسقط البوابة قبل أن يصل جهازًا.
 */
export const SYNC_TABLES: ReadonlySet<string> = new Set<SyncTable>([
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
])

/**
 * جداول tombstone (P12): الحذف لا يمسح صف السحابة بل يرفع شاهد قبر بطابع
 * `deleted_at` (upsert) — فيحترم LWW على الأجهزة الأخرى ولا يُبعث المحذوف من
 * جديد بمزامنة قديمة، ولا يُحذف أحدث منه بصمت. باقي الجداول تبقى على الحذف
 * المباشر (سلوكها الموروث الموثّق).
 */
export const TOMBSTONE_TABLES: ReadonlySet<SyncTable> = new Set<SyncTable>([
  'measurement_logs',
  'nutrition_ledger',
  'workout_schedule',
  'plan_templates',
])

export interface SyncOperation {
  id: string
  userId: string
  table: SyncTable
  action: 'upsert' | 'delete'
  entityKey: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  nextAttemptAt: number
}

interface SyncRuntime {
  userId: string | null
  recoveryActive: boolean
  capturePaused: boolean
}

let runtime: SyncRuntime = { userId: null, recoveryActive: false, capturePaused: false }
let testFlagOverride: boolean | undefined

export function isSyncEnabled(): boolean {
  return testFlagOverride ?? ENV_SYNC_ENABLED
}

/** Proof-script seam only; production code never calls this. */
export function setSyncFeatureEnabledForTests(value: boolean | undefined): void {
  testFlagOverride = value
}

export function setSyncRuntime(userId: string | null, recoveryActive: boolean): void {
  runtime = { userId, recoveryActive, capturePaused: runtime.capturePaused }
}

export function setSyncCapturePaused(capturePaused: boolean): void {
  runtime = { ...runtime, capturePaused }
}

export function getSyncRuntime(): Readonly<SyncRuntime> {
  return runtime
}

export function syncAllowedFor(userId: string): boolean {
  // بوابة التبنّي: بيانات محلية مجهولة المالك تحت حساب حقيقي لا تُرفع للسحابة
  // حتى قرار صريح (adoptPendingData) — يمنع تبنّي بيانات ضيف ضمنيًا في حساب.
  return (
    isSyncEnabled() &&
    !runtime.recoveryActive &&
    Boolean(userId) &&
    runtime.userId === userId &&
    !isAdoptionPending(userId)
  )
}

function queueKey(userId: string): string {
  return `${SYNC_QUEUE_PREFIX}${userId}`
}

export function backupKey(userId: string): string {
  return `${SYNC_BACKUP_PREFIX}${userId}`
}

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function isOperation(value: unknown, userId: string): value is SyncOperation {
  if (!value || typeof value !== 'object') return false
  const op = value as Partial<SyncOperation>
  return (
    typeof op.id === 'string' &&
    op.userId === userId &&
    typeof op.table === 'string' &&
    SYNC_TABLES.has(op.table) &&
    (op.action === 'upsert' || op.action === 'delete') &&
    typeof op.entityKey === 'string' &&
    Boolean(op.payload) &&
    typeof op.payload === 'object' &&
    typeof op.createdAt === 'string' &&
    typeof op.attempts === 'number' &&
    typeof op.nextAttemptAt === 'number'
  )
}

export function readSyncQueue(userId: string): SyncOperation[] {
  const ls = storage()
  if (!ls || !userId) return []
  try {
    const raw = ls.getItem(queueKey(userId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((op) => isOperation(op, userId)) : []
  } catch {
    return []
  }
}

function writeSyncQueue(userId: string, queue: SyncOperation[]): void {
  const ls = storage()
  if (!ls || !userId) return
  try {
    if (queue.length === 0) ls.removeItem(queueKey(userId))
    else ls.setItem(queueKey(userId), JSON.stringify(queue))
  } catch {
    /* A failed persistence write must not crash the local-first app. */
  }
}

function operationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Enqueues only for the authenticated runtime owner; latest write replaces stale entity work. */
export function enqueueSyncOperation(
  table: SyncTable,
  entityKey: string,
  payload: Record<string, unknown>,
): SyncOperation | null {
  const userId = runtime.userId
  if (!userId || runtime.capturePaused || !syncAllowedFor(userId)) return null
  const now = new Date().toISOString()
  const op: SyncOperation = {
    id: operationId(),
    userId,
    table,
    action: 'upsert',
    entityKey,
    payload,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: 0,
  }
  const queue = readSyncQueue(userId).filter((item) => !(item.table === table && item.entityKey === entityKey))
  queue.push(op)
  writeSyncQueue(userId, queue)
  return op
}

/**
 * Idempotent entity delete; a later write for the same entity replaces the tombstone.
 * `deletedAt` (P12) هو طابع LWW للحذف — جداول TOMBSTONE_TABLES ترفعه صف شاهد قبر
 * بدل الحذف المباشر (انظر syncService.flushImpl).
 */
export function enqueueSyncDelete(table: SyncTable, entityKey: string, deletedAt?: string): SyncOperation | null {
  const userId = runtime.userId
  if (!userId || runtime.capturePaused || !syncAllowedFor(userId)) return null
  const op: SyncOperation = {
    id: operationId(),
    userId,
    table,
    action: 'delete',
    entityKey,
    payload: { deleted_at: deletedAt ?? new Date().toISOString() },
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: 0,
  }
  const queue = readSyncQueue(userId).filter((item) => !(item.table === table && item.entityKey === entityKey))
  queue.push(op)
  writeSyncQueue(userId, queue)
  return op
}

export function removeSyncOperations(userId: string, ids: ReadonlySet<string>): void {
  if (!syncAllowedFor(userId)) return
  writeSyncQueue(userId, readSyncQueue(userId).filter((op) => !ids.has(op.id)))
}

/** فشل متكرر يستحق انتباه الواجهة (state='attention' مع الاستمرار بالمحاولة). */
export const SYNC_ATTENTION_ATTEMPTS = 3

/**
 * سقف المحاولات التلقائية (P12): بعده تتوقف إعادة المحاولة الآلية — العملية
 * تبقى في الطابور (لا فقدان بيانات) لكنها مجمّدة حتى retryExhaustedSyncOperations
 * (إجراء المستخدم اليدوي) أو نجاح دفعة تالية يعيد الحياة للطابور.
 */
export const MAX_SYNC_ATTEMPTS = 8

/** قيمة nextAttemptAt للعمليات المجمّدة بعد استنفاد المحاولات. */
export const RETRY_EXHAUSTED_AT = Number.MAX_SAFE_INTEGER

/** Exponential backoff: 1s·2^n بسقف 5 دقائق؛ بعد MAX_SYNC_ATTEMPTS تُجمَّد العملية. */
export function scheduleSyncRetry(userId: string, ids: ReadonlySet<string>, now = Date.now()): void {
  if (!syncAllowedFor(userId)) return
  const next = readSyncQueue(userId).map((op) => {
    if (!ids.has(op.id)) return op
    const attempts = op.attempts + 1
    if (attempts >= MAX_SYNC_ATTEMPTS) return { ...op, attempts, nextAttemptAt: RETRY_EXHAUSTED_AT }
    const delay = Math.min(300_000, 1_000 * 2 ** Math.min(attempts - 1, 8))
    return { ...op, attempts, nextAttemptAt: now + delay }
  })
  writeSyncQueue(userId, next)
}

/** هل في طابور المالك عمليات مجمّدة (استنفدت المحاولات التلقائية)؟ */
export function hasExhaustedSyncOperations(userId: string): boolean {
  return readSyncQueue(userId).some((op) => op.attempts >= MAX_SYNC_ATTEMPTS)
}

/** عقد «إعادة المحاولة» اليدوي للواجهة: يصفّر عدّاد العمليات المجمّدة ويعيد جدولتها فورًا. */
export function retryExhaustedSyncOperations(userId: string): number {
  if (!syncAllowedFor(userId)) return 0
  let resumed = 0
  const next = readSyncQueue(userId).map((op) => {
    if (op.attempts < MAX_SYNC_ATTEMPTS) return op
    resumed += 1
    return { ...op, attempts: 0, nextAttemptAt: 0 }
  })
  if (resumed > 0) writeSyncQueue(userId, next)
  return resumed
}

export function clearSyncArtifacts(userId: string): void {
  const ls = storage()
  if (!ls || !userId) return
  try {
    ls.removeItem(queueKey(userId))
    ls.removeItem(backupKey(userId))
  } catch {
    /* Best effort during logout/account deletion. */
  }
}

export function writeSyncBackup(userId: string, snapshot: unknown): boolean {
  const ls = storage()
  if (!ls || !syncAllowedFor(userId)) return false
  try {
    ls.setItem(backupKey(userId), JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}
