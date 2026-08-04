// Sync coverage extension (wave3) — auxiliary-store adapter.
//
// The sync engine (syncService) covers 5 homes that all live inside historyStore
// + onboardingProfile. Four more user stores had a schema table but no client
// wiring: steps → step_logs (per-day), achievements → achievements, custom plan
// → custom_plans, todos → todos (per-account singles). This module is the ONLY
// place that reads/writes those stores for sync, so the engine stays store-shape
// agnostic and nothing here touches src/views/** or src/features/** source.
//
// It reuses each store's own public read/write API (so day-name normalization
// and todo rollover keep working) — except the achievements writer, which the
// engine module intentionally does not export; that one key is read/written here
// directly against its documented v1 shape to avoid importing the heavy
// achievements engine (i18n + celebrations) into the sync path.
//
// Same engine invariants apply: enqueue only for the authenticated runtime owner
// (enqueueSyncOperation self-guards), bounded entity keys (dates + one 'self' per
// single → no unbounded queue growth), idempotent replace-on-enqueue, and every
// hydrate conflict is logged, never silently dropped.

import { enqueueSyncOperation, type SyncTable } from './syncQueue'
import { pendingKey, resolveLww, stampMs } from './syncLww'
import { getSteps, getStepSource, loadStepLog, setSteps, type StepSource } from './stepCounter'
import {
  loadCustomPlanRecord,
  saveCustomPlan,
  setPlanSource,
  type CustomPlanRecord,
  type PlanSource,
} from '@/features/customPlan/storage'
import { loadTodos, saveTodos, type TodoState } from '@/features/todo/store'
import {
  applyTemplateFromSync,
  listTemplates,
  removeTemplateFromSync,
  type PlanTemplate,
} from '@/features/customPlan/templates'
import { ledgerDayStamp, loadLedgerDays, setLedgerDayFromSync, type NutritionEntry } from './nutritionHistory'
import { applyRecoveryEntryFromSync, loadRecoveryEngineLog, type RecoveryEngineEntry } from './recoveryEngine'
import { clearWeeklySchedule, loadWeeklySchedule, setScheduleFromSync, type WeeklySchedule } from './workoutCalendar'
import {
  accountSettingsSlice,
  applyAccountSettingsFromSync,
  hasSavedCustomization,
  loadCustomization,
  type AccountSettings,
  type Customization,
} from './customization'
import type { WorkoutPlan } from '@/types/workout'

/** Stable single-row entity key for per-account (unique user_id) tables. */
const SELF = 'self'

// ── achievements: read/write its v1 key directly (engine exports no writer) ──
const ACHIEVEMENTS_KEY = 'qimmah:achievements:v1'

interface AchievementState {
  unlocked: Record<string, string>
  proteinDays: string[]
  prCount: number
}

function readAchievements(): AchievementState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<AchievementState>
    return {
      unlocked: p.unlocked && typeof p.unlocked === 'object' ? p.unlocked : {},
      proteinDays: Array.isArray(p.proteinDays) ? p.proteinDays.filter((d) => typeof d === 'string') : [],
      prCount: typeof p.prCount === 'number' && p.prCount >= 0 ? p.prCount : 0,
    }
  } catch {
    return null
  }
}

function hasAchievementData(s: AchievementState | null): s is AchievementState {
  return !!s && (Object.keys(s.unlocked).length > 0 || s.proteinDays.length > 0 || s.prCount > 0)
}

function writeAchievements(data: unknown): void {
  if (typeof window === 'undefined' || !data || typeof data !== 'object') return
  const p = data as Partial<AchievementState>
  const safe: AchievementState = {
    unlocked: p.unlocked && typeof p.unlocked === 'object' ? p.unlocked : {},
    proteinDays: Array.isArray(p.proteinDays) ? p.proteinDays.filter((d) => typeof d === 'string') : [],
    prCount: typeof p.prCount === 'number' && p.prCount >= 0 ? p.prCount : 0,
  }
  try {
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(safe))
  } catch {
    /* storage full → local remains authoritative */
  }
}

/** Owner-scoped snapshot of the aux + coverage stores — folded into the hydrate backup. */
export interface AuxBackup {
  steps: { date: string; steps: number; source: StepSource }[]
  achievements: AchievementState | null
  customPlan: CustomPlanRecord | null
  todos: TodoState | null
  /** P12 — يجعل تراكب الترطيب على المخازن الجديدة قابلًا للاسترداد دائمًا. */
  nutritionLedger?: Record<string, NutritionEntry[]>
  recoveryLog?: RecoveryEngineEntry[]
  workoutSchedule?: WeeklySchedule | null
  planTemplates?: PlanTemplate[]
  customization?: Customization | null
}

export function readAuxBackup(userId: string): AuxBackup {
  const log = loadStepLog()
  return {
    steps: Object.keys(log).map((date) => ({ date, steps: log[date], source: getStepSource(date) })),
    achievements: readAchievements(),
    customPlan: loadCustomPlanRecord(userId) ?? null,
    todos: loadTodos(userId),
    nutritionLedger: loadLedgerDays(userId),
    recoveryLog: loadRecoveryEngineLog(userId),
    workoutSchedule: loadWeeklySchedule(),
    planTemplates: listTemplates(userId),
    customization: hasSavedCustomization() ? loadCustomization() : null,
  }
}

/**
 * Enqueue upserts for every aux store the current owner has data in. Called from
 * hydrate's snapshot upload AND at the top of each flush so live edits ship on
 * the next cycle without a per-write hook in the (out-of-surface) feature stores.
 * Bounded: one op per step-day + one 'self' op per single → replace-on-enqueue
 * caps growth. enqueueSyncOperation self-rejects when userId ≠ runtime owner.
 */
/**
 * سياسة خصوصية الصحة (P12): أيام الخطوات الآتية من HealthKit/Google Fit بيانات
 * صحية مستورَدة — لا تُرفع لسحابتنا (مصدر حقيقتها منصّتها). اليدوي و'external'
 * (إدخال جسر التطبيق نفسه) يُزامنان.
 */
const HEALTH_IMPORT_STEP_SOURCES: ReadonlySet<StepSource> = new Set<StepSource>(['healthkit', 'google-fit'])

export function enqueueAuxOperations(userId: string): void {
  // steps → step_logs (per day). unique(user_id,date); upsert on user_id,date.
  const log = loadStepLog()
  for (const date of Object.keys(log)) {
    const source = getStepSource(date)
    if (HEALTH_IMPORT_STEP_SOURCES.has(source)) continue
    enqueueSyncOperation('step_logs', date, { date, steps: log[date], source })
  }
  // achievements → single row (unique user_id).
  const ach = readAchievements()
  if (hasAchievementData(ach)) enqueueSyncOperation('achievements', SELF, { data: ach })
  // custom plan → single row (unique user_id).
  const plan = loadCustomPlanRecord(userId)
  if (plan) enqueueSyncOperation('custom_plans', SELF, { source: plan.source, data: plan.plan })
  // todos → single row (unique user_id).
  const todos = loadTodos(userId)
  if (todos.items.length > 0) enqueueSyncOperation('todos', SELF, { data: todos })
}

/**
 * Server-wins hydrate merge into the four aux stores. The caller has ALREADY
 * persisted the local backup (readAuxBackup) before this runs, so an overwrite is
 * always recoverable. Every overwrite of existing local data is logged via
 * `onConflict` (metadata only). Local-only entries (e.g. a step-day the server
 * lacks) are preserved.
 */
export function hydrateAuxFromCloud(
  userId: string,
  rows: {
    step_logs: Record<string, unknown>[]
    achievements: Record<string, unknown>[]
    custom_plans: Record<string, unknown>[]
    todos: Record<string, unknown>[]
  },
  onConflict: (table: SyncTable, entityKey: string, resolution?: 'local-wins-lww' | 'cloud-wins-lww') => void,
  pending: ReadonlySet<string> = new Set(),
): void {
  // حماية LWW للمخازن المساعدة: هذه المخازن لا تحمل طوابع تعديل محلية لكل سجل،
  // فالبديل الصادق للأحدثية المحلية هو طابور الرفع — أي كيان معلّق فيه هو تعديل
  // محلي أحدث بالتعريف ولا يُدهس. غير المعلّق يبقى السحابي مصدره (كما قبل).
  const localNewer = (table: SyncTable, key: string): boolean => pending.has(pendingKey(table, key))

  // steps — per-day; a pending local day always survives; otherwise cloud fills/overlays.
  for (const row of rows.step_logs) {
    const date = typeof row.date === 'string' ? row.date : ''
    if (!date) continue
    const steps = typeof row.steps === 'number' ? row.steps : Number(row.steps)
    if (!Number.isFinite(steps)) continue
    const source = (typeof row.source === 'string' ? row.source : 'external') as StepSource
    if (localNewer('step_logs', date)) {
      onConflict('step_logs', date, 'local-wins-lww')
      continue
    }
    if (getSteps(date) > 0) onConflict('step_logs', date, 'cloud-wins-lww')
    setSteps(steps, date, source)
  }
  // achievements — single aggregate row.
  const achRow = rows.achievements[0]
  if (achRow && achRow.data && typeof achRow.data === 'object') {
    if (localNewer('achievements', SELF)) {
      onConflict('achievements', SELF, 'local-wins-lww')
    } else {
      if (hasAchievementData(readAchievements())) onConflict('achievements', SELF, 'cloud-wins-lww')
      writeAchievements(achRow.data)
    }
  }
  // custom plan — single row (data = WorkoutPlan, source = 'auto' | 'custom').
  const planRow = rows.custom_plans[0]
  if (planRow && planRow.data && typeof planRow.data === 'object') {
    if (localNewer('custom_plans', SELF)) {
      onConflict('custom_plans', SELF, 'local-wins-lww')
    } else {
      if (loadCustomPlanRecord(userId)) onConflict('custom_plans', SELF, 'cloud-wins-lww')
      saveCustomPlan(userId, planRow.data as WorkoutPlan)
      const source = planRow.source === 'auto' || planRow.source === 'custom' ? (planRow.source as PlanSource) : 'custom'
      setPlanSource(userId, source)
    }
  }
  // todos — single row (data = TodoState).
  const todoRow = rows.todos[0]
  if (todoRow && todoRow.data && typeof todoRow.data === 'object') {
    if (localNewer('todos', SELF)) {
      onConflict('todos', SELF, 'local-wins-lww')
    } else {
      const local = loadTodos(userId)
      if (local.items.length > 0) onConflict('todos', SELF, 'cloud-wins-lww')
      const data = todoRow.data as Partial<TodoState>
      if (typeof data.date === 'string' && Array.isArray(data.items)) {
        saveTodos(userId, { date: data.date, items: data.items })
      }
    }
  }
}

// ═══ تغطية P12 — المخازن الجديدة (nutrition_ledger / recovery_logs /
//     workout_schedule / plan_templates / profiles.data.settings) ═══════════════
//
// بخلاف المخازن المساعدة الأربع (بلا خطاطيف كتابة — تُلتقط كل flush)، للمخازن
// الجديدة خطاطيف رفع عند الكتابة داخل مخازنها. لقطة enqueueCoverageSnapshot
// تُستدعى مرة بعد دمج الترطيب (رفع الحالة المدموجة كاملة) لا في كل flush —
// محدودة بسقوف المخازن نفسها (90 يوم دفتر، 180 فحص، 20 قالبًا، جدول، إعدادات).

/** رفع لقطة المخازن الجديدة (بعد دمج الترطيب). enqueue نفسها محروسة بالمالك. */
export function enqueueCoverageSnapshot(userId: string): void {
  const ledger = loadLedgerDays(userId)
  for (const [date, entries] of Object.entries(ledger)) {
    if (!entries.length) continue
    enqueueSyncOperation('nutrition_ledger', date, {
      date,
      data: { entries },
      updated_at: ledgerDayStamp(entries) || new Date().toISOString(),
      deleted_at: null,
    })
  }
  for (const entry of loadRecoveryEngineLog(userId)) {
    enqueueSyncOperation('recovery_logs', entry.date, {
      date: entry.date,
      data: entry,
      updated_at: entry.updatedAt ?? new Date().toISOString(),
    })
  }
  const schedule = loadWeeklySchedule()
  if (schedule) {
    enqueueSyncOperation('workout_schedule', SELF, {
      data: schedule,
      updated_at: schedule.updatedAt || new Date().toISOString(),
      deleted_at: null,
    })
  }
  for (const template of listTemplates(userId)) {
    enqueueSyncOperation('plan_templates', template.id, {
      local_id: template.id,
      data: template,
      updated_at: template.updatedAt || new Date().toISOString(),
      deleted_at: null,
    })
  }
  if (hasSavedCustomization()) {
    const settings = accountSettingsSlice(loadCustomization())
    enqueueSyncOperation('profiles', 'settings', { data: { settings }, updated_at: settings.updatedAt })
  }
}

/** صفوف السحابة للمخازن الجديدة كما تصل من hydrate. */
export interface CoverageRows {
  nutrition_ledger: Record<string, unknown>[]
  recovery_logs: Record<string, unknown>[]
  workout_schedule: Record<string, unknown>[]
  plan_templates: Record<string, unknown>[]
}

type ConflictLogger = (table: SyncTable, entityKey: string, resolution?: 'local-wins-lww' | 'cloud-wins-lww') => void

/**
 * دمج LWW للمخازن الجديدة — طوابع حقيقية لكل سجل (لا server-wins أعمى):
 *   • المعلّق بطابور الرفع محلي أحدث بالتعريف — لا يُداس.
 *   • شاهد قبر سحابي (deleted_at) يفوز فقط إذا كان أحدث من الدليل المحلي.
 *   • التساوي/غياب الدليل ⇒ المحلي يبقى. لا حذف صامت — كل تراكب يُسجَّل.
 */
export function hydrateCoverageFromCloud(
  userId: string,
  rows: CoverageRows,
  onConflict: ConflictLogger,
  pending: ReadonlySet<string> = new Set(),
): void {
  const isPending = (table: SyncTable, key: string): boolean => pending.has(pendingKey(table, key))

  // nutrition_ledger — لكل يوم؛ الدليل المحلي أقصى (addedAt|updatedAt) بين قيوده.
  const localLedger = loadLedgerDays(userId)
  for (const row of rows.nutrition_ledger) {
    const date = typeof row.date === 'string' ? row.date : ''
    if (!date) continue
    const localEntries = localLedger[date]
    const exists = Array.isArray(localEntries) && localEntries.length > 0
    const localStamp = exists ? ledgerDayStamp(localEntries) : 0
    if (row.deleted_at) {
      const winner = resolveLww({ localExists: exists, localStamp, cloudStamp: row.deleted_at, pendingLocal: isPending('nutrition_ledger', date) })
      if (!exists) continue
      onConflict('nutrition_ledger', date, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
      if (winner === 'cloud') setLedgerDayFromSync(userId, date, null)
      continue
    }
    const data = row.data as { entries?: unknown } | null | undefined
    const cloudEntries = Array.isArray(data?.entries) ? (data.entries as NutritionEntry[]) : null
    if (!cloudEntries) continue
    const winner = resolveLww({ localExists: exists, localStamp, cloudStamp: row.updated_at, pendingLocal: isPending('nutrition_ledger', date) })
    if (exists) onConflict('nutrition_ledger', date, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
    if (winner === 'cloud') setLedgerDayFromSync(userId, date, cloudEntries)
  }

  // recovery_logs — لكل يوم؛ الدليل المحلي updatedAt (يغيب في القديم ⇒ 0).
  const localRecovery = new Map(loadRecoveryEngineLog(userId).map((e) => [e.date, e]))
  for (const row of rows.recovery_logs) {
    const date = typeof row.date === 'string' ? row.date : ''
    const entry = row.data as RecoveryEngineEntry | null | undefined
    if (!date || !entry || typeof entry !== 'object' || entry.date !== date) continue
    const existing = localRecovery.get(date)
    const winner = resolveLww({
      localExists: !!existing,
      localStamp: existing?.updatedAt ?? 0,
      cloudStamp: entry.updatedAt ?? row.updated_at,
      pendingLocal: isPending('recovery_logs', date),
    })
    if (existing) onConflict('recovery_logs', date, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
    if (winner === 'cloud') applyRecoveryEntryFromSync(userId, entry)
  }

  // workout_schedule — صف واحد؛ الدليل updatedAt الجدول نفسه.
  const scheduleRow = rows.workout_schedule[0]
  if (scheduleRow) {
    const local = loadWeeklySchedule()
    const cloudSchedule = scheduleRow.data as WeeklySchedule | null | undefined
    if (scheduleRow.deleted_at) {
      const winner = resolveLww({ localExists: !!local, localStamp: local?.updatedAt ?? 0, cloudStamp: scheduleRow.deleted_at, pendingLocal: isPending('workout_schedule', SELF) })
      if (local) {
        onConflict('workout_schedule', SELF, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
        // مسح فائز بالـLWW — عبر مسار المخزن نفسه (لا رفع مضاد: capture موقوف أثناء الترطيب).
        if (winner === 'cloud') clearWeeklySchedule()
      }
    } else if (cloudSchedule && typeof cloudSchedule === 'object') {
      const winner = resolveLww({
        localExists: !!local,
        localStamp: local?.updatedAt ?? 0,
        cloudStamp: cloudSchedule.updatedAt ?? scheduleRow.updated_at,
        pendingLocal: isPending('workout_schedule', SELF),
      })
      if (local) onConflict('workout_schedule', SELF, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
      if (winner === 'cloud') setScheduleFromSync(cloudSchedule)
    }
  }

  // plan_templates — لكل قالب؛ الدليل updatedAt القالب.
  const localTemplates = new Map(listTemplates(userId).map((t) => [t.id, t]))
  for (const row of rows.plan_templates) {
    const id = typeof row.local_id === 'string' ? row.local_id : ''
    if (!id) continue
    const existing = localTemplates.get(id)
    if (row.deleted_at) {
      const winner = resolveLww({ localExists: !!existing, localStamp: existing?.updatedAt ?? 0, cloudStamp: row.deleted_at, pendingLocal: isPending('plan_templates', id) })
      if (!existing) continue
      onConflict('plan_templates', id, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
      if (winner === 'cloud') removeTemplateFromSync(userId, id)
      continue
    }
    const template = row.data as PlanTemplate | null | undefined
    if (!template || typeof template !== 'object') continue
    const winner = resolveLww({
      localExists: !!existing,
      localStamp: existing?.updatedAt ?? 0,
      cloudStamp: template.updatedAt ?? row.updated_at,
      pendingLocal: isPending('plan_templates', id),
    })
    if (existing) onConflict('plan_templates', id, winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
    if (winner === 'cloud') applyTemplateFromSync(userId, template)
  }
}

/**
 * دمج إعدادات الحساب من صف profiles (data.settings) — LWW بطابع الشريحة مقابل
 * settingsUpdatedAt المحلي (البديل: targetsMeta.updatedAt للتخصيصات الأقدم).
 */
export function hydrateAccountSettingsFromCloud(
  cloudSettings: unknown,
  onConflict: ConflictLogger,
  pending: ReadonlySet<string> = new Set(),
): void {
  if (!cloudSettings || typeof cloudSettings !== 'object') return
  const slice = cloudSettings as Partial<AccountSettings>
  const cloudStamp = typeof slice.updatedAt === 'string' ? slice.updatedAt : ''
  if (!stampMs(cloudStamp)) return // لا دليل أحدثية سحابي — المحلي يبقى
  const localExists = hasSavedCustomization()
  const local = localExists ? loadCustomization() : null
  const winner = resolveLww({
    localExists,
    localStamp: local?.settingsUpdatedAt ?? local?.targetsMeta.updatedAt ?? 0,
    cloudStamp,
    pendingLocal: pending.has(pendingKey('profiles', 'settings')),
  })
  if (localExists) onConflict('profiles', 'settings', winner === 'cloud' ? 'cloud-wins-lww' : 'local-wins-lww')
  if (winner === 'cloud') applyAccountSettingsFromSync(slice, cloudStamp)
}
