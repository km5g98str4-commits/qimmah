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
import { getSteps, getStepSource, loadStepLog, setSteps, type StepSource } from './stepCounter'
import {
  loadCustomPlanRecord,
  saveCustomPlan,
  setPlanSource,
  type CustomPlanRecord,
  type PlanSource,
} from '@/features/customPlan/storage'
import { loadTodos, saveTodos, type TodoState } from '@/features/todo/store'
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

/** Owner-scoped snapshot of the four aux stores — folded into the hydrate backup. */
export interface AuxBackup {
  steps: { date: string; steps: number; source: StepSource }[]
  achievements: AchievementState | null
  customPlan: CustomPlanRecord | null
  todos: TodoState | null
}

export function readAuxBackup(userId: string): AuxBackup {
  const log = loadStepLog()
  return {
    steps: Object.keys(log).map((date) => ({ date, steps: log[date], source: getStepSource(date) })),
    achievements: readAchievements(),
    customPlan: loadCustomPlanRecord(userId) ?? null,
    todos: loadTodos(userId),
  }
}

/**
 * Enqueue upserts for every aux store the current owner has data in. Called from
 * hydrate's snapshot upload AND at the top of each flush so live edits ship on
 * the next cycle without a per-write hook in the (out-of-surface) feature stores.
 * Bounded: one op per step-day + one 'self' op per single → replace-on-enqueue
 * caps growth. enqueueSyncOperation self-rejects when userId ≠ runtime owner.
 */
export function enqueueAuxOperations(userId: string): void {
  // steps → step_logs (per day). unique(user_id,date); upsert on user_id,date.
  const log = loadStepLog()
  for (const date of Object.keys(log)) {
    enqueueSyncOperation('step_logs', date, { date, steps: log[date], source: getStepSource(date) })
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
  onConflict: (table: SyncTable, entityKey: string) => void,
): void {
  // steps — per-day; server value wins for shared dates, local-only dates stay.
  for (const row of rows.step_logs) {
    const date = typeof row.date === 'string' ? row.date : ''
    if (!date) continue
    const steps = typeof row.steps === 'number' ? row.steps : Number(row.steps)
    if (!Number.isFinite(steps)) continue
    const source = (typeof row.source === 'string' ? row.source : 'external') as StepSource
    if (getSteps(date) > 0) onConflict('step_logs', date)
    setSteps(steps, date, source)
  }
  // achievements — single aggregate row.
  const achRow = rows.achievements[0]
  if (achRow && achRow.data && typeof achRow.data === 'object') {
    if (hasAchievementData(readAchievements())) onConflict('achievements', SELF)
    writeAchievements(achRow.data)
  }
  // custom plan — single row (data = WorkoutPlan, source = 'auto' | 'custom').
  const planRow = rows.custom_plans[0]
  if (planRow && planRow.data && typeof planRow.data === 'object') {
    if (loadCustomPlanRecord(userId)) onConflict('custom_plans', SELF)
    saveCustomPlan(userId, planRow.data as WorkoutPlan)
    const source = planRow.source === 'auto' || planRow.source === 'custom' ? (planRow.source as PlanSource) : 'custom'
    setPlanSource(userId, source)
  }
  // todos — single row (data = TodoState).
  const todoRow = rows.todos[0]
  if (todoRow && todoRow.data && typeof todoRow.data === 'object') {
    const local = loadTodos(userId)
    if (local.items.length > 0) onConflict('todos', SELF)
    const data = todoRow.data as Partial<TodoState>
    if (typeof data.date === 'string' && Array.isArray(data.items)) {
      saveTodos(userId, { date: data.date, items: data.items })
    }
  }
}
