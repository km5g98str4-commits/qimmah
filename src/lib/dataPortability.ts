import { clearActiveSession, isRestorableSnapshot, loadActiveSession, saveActiveSession } from '@/lib/activeSession'
import { getLastUser } from '@/lib/accountScope'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { restoreShownLessonIds, shownLessonIds } from '@/lib/coaching/lessonRotation'
import { loadCommitmentsToday, saveCommitmentsToday } from '@/lib/commitmentTracking'
import { loadCustomization, normalizeCustomization, saveCustomization } from '@/lib/customization'
import { exportHistory, importHistory, normalizeHistorySnapshot, type HistorySnapshot } from '@/lib/historyStore'
import { loadNutritionDay, restoreNutritionDay } from '@/lib/nutritionV2Model'
import { loadNutritionToday, saveNutritionToday, type NutritionTodayState } from '@/lib/nutritionTracking'
import { loadOnboardingProfile, normalizeOnboardingProfile, saveOnboardingProfile } from '@/lib/onboardingProfile'
import { loadNotificationPrefs, saveNotificationPrefs } from '@/lib/notifications/prefs'
import { getStepSource, loadStepGoal, loadStepLog, replaceStepLog, saveStepGoal, type DaySteps } from '@/lib/stepCounter'
import { getDayStamp, loadToday, saveToday, type TodayState } from '@/lib/today'
import { loadWellnessToday, saveWellnessToday, type WellnessTodayState } from '@/lib/wellnessTracking'
import { loadAchievementState, restoreAchievementState } from '@/features/achievements/engine'
import { clearCustomPlan, loadCustomPlanRecord, saveCustomPlan, setPlanSource } from '@/features/customPlan/storage'
import { loadTodos, saveTodos, type TodoState } from '@/features/todo/store'
import { enqueueAuxOperations } from '@/lib/syncStores'
import { markPendingSync } from '@/lib/syncService'

export const DATA_EXPORT_FORMAT = 'qimmah-data-export' as const
export const DATA_EXPORT_SCHEMA_VERSION = 1 as const
export const MAX_DATA_EXPORT_BYTES = 10 * 1024 * 1024
export const DATA_RESTORE_BACKUP_PREFIX = 'qimmah:restoreBackup:v1:'

export type DataExportErrorCode = 'owner-mismatch' | 'recovery-active' | 'too-large' | 'unavailable'

export class DataExportError extends Error {
  constructor(readonly code: DataExportErrorCode) {
    super(code)
    this.name = 'DataExportError'
  }
}

export interface QimmahDataExport {
  format: typeof DATA_EXPORT_FORMAT
  schemaVersion: typeof DATA_EXPORT_SCHEMA_VERSION
  exportedAt: string
  build: string
  account: { userId: string | null; email: string | null }
  data: {
    onboardingProfile: ReturnType<typeof loadOnboardingProfile>
    customization: ReturnType<typeof loadCustomization>
    history: HistorySnapshot
    steps: { goal: number; days: Array<{ date: string; steps: number; source: ReturnType<typeof getStepSource> }> }
    achievements: ReturnType<typeof loadAchievementState>
    customPlan: ReturnType<typeof loadCustomPlanRecord> | null
    todos: ReturnType<typeof loadTodos>
    currentDay: {
      checklist: ReturnType<typeof loadToday>
      nutrition: ReturnType<typeof loadNutritionDay>
      nutritionLegacyDetail: ReturnType<typeof loadNutritionToday>
      wellness: ReturnType<typeof loadWellnessToday>
      commitments: ReturnType<typeof loadCommitmentsToday>
    }
    reminders: ReturnType<typeof loadNotificationPrefs>
    activeSession: ReturnType<typeof loadActiveSession>
    coaching: { shownLessonIds: string[] }
  }
}

export interface BuildDataExportOptions {
  ownerId: string | null
  email?: string | null
  recoveryActive?: boolean
  now?: Date
}

/**
 * Builds an explicit allowlisted export. Auth tokens, sync queues/backups/meta,
 * analytics identifiers, device caches, and other accounts' registries are
 * deliberately absent. A signed-in export is refused unless accountScope says
 * the same owner currently owns the on-device data.
 */
export function buildQimmahDataExport(options: BuildDataExportOptions): QimmahDataExport {
  if (options.recoveryActive) throw new DataExportError('recovery-active')
  if (typeof window === 'undefined') throw new DataExportError('unavailable')
  const currentOwner = getLastUser()
  if (options.ownerId ? currentOwner !== options.ownerId : currentOwner !== null && currentOwner !== undefined) {
    throw new DataExportError('owner-mismatch')
  }

  const stepLog = loadStepLog()
  const stepDays = Object.keys(stepLog)
    .sort()
    .map((date) => ({ date, steps: stepLog[date], source: getStepSource(date) }))

  return {
    format: DATA_EXPORT_FORMAT,
    schemaVersion: DATA_EXPORT_SCHEMA_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    build: BUILD_LABEL,
    account: { userId: options.ownerId, email: options.email ?? null },
    data: {
      onboardingProfile: loadOnboardingProfile(),
      customization: loadCustomization(),
      history: exportHistory(),
      steps: { goal: loadStepGoal(), days: stepDays },
      achievements: loadAchievementState(),
      customPlan: loadCustomPlanRecord(options.ownerId) ?? null,
      todos: loadTodos(options.ownerId),
      currentDay: {
        checklist: loadToday(),
        nutrition: loadNutritionDay(),
        nutritionLegacyDetail: loadNutritionToday(),
        wellness: loadWellnessToday(),
        commitments: loadCommitmentsToday(),
      },
      reminders: loadNotificationPrefs(options.ownerId ?? 'guest'),
      activeSession: loadActiveSession(options.ownerId),
      coaching: { shownLessonIds: shownLessonIds(options.ownerId) },
    },
  }
}

export function serializeQimmahDataExport(bundle: QimmahDataExport): string {
  const json = JSON.stringify(bundle, null, 2)
  if (new TextEncoder().encode(json).byteLength > MAX_DATA_EXPORT_BYTES) throw new DataExportError('too-large')
  return json
}

export function dataExportFilename(exportedAt: string): string {
  const date = /^\d{4}-\d{2}-\d{2}/.exec(exportedAt)?.[0] ?? 'data'
  return `qimmah-data-${date}.json`
}

export type DataExportDelivery = 'shared' | 'downloaded' | 'cancelled'

/** Native-first delivery through the iOS share sheet, with a web download fallback. */
export async function deliverQimmahDataExport(bundle: QimmahDataExport): Promise<DataExportDelivery> {
  if (typeof window === 'undefined' || typeof document === 'undefined') throw new DataExportError('unavailable')
  const json = serializeQimmahDataExport(bundle)
  const filename = dataExportFilename(bundle.exportedAt)
  const file = new File([json], filename, { type: 'application/json' })
  const shareData: ShareData = { files: [file], title: 'Qimmah data export' }

  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(shareData))) {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Some embedded webviews expose share() but reject files. Continue to the
      // deterministic Blob download rather than losing the user's request.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    anchor.click()
    return 'downloaded'
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type DataImportErrorCode =
  | 'invalid-json' | 'invalid-format' | 'unsupported-version' | 'invalid-data'
  | 'dangerous-key' | 'owner-mismatch' | 'recovery-active' | 'too-large' | 'unavailable' | 'apply-failed'

export class DataImportError extends Error {
  constructor(readonly code: DataImportErrorCode) {
    super(code)
    this.name = 'DataImportError'
  }
}

export interface DataImportPreview {
  exportedAt: string
  sourceBuild: string
  sourceOwnerId: string | null
  workoutSessions: number
  measurements: number
  nutritionDays: number
  stepDays: number
  todos: number
  achievements: number
  hasActiveSession: boolean
}

export interface PreparedDataImport {
  readonly ownerId: string | null
  readonly bundle: QimmahDataExport
  readonly preview: DataImportPreview
}

export interface DataImportOptions {
  ownerId: string | null
  email?: string | null
  recoveryActive?: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])
const topLevelKeys = new Set(['format', 'schemaVersion', 'exportedAt', 'build', 'account', 'data'])
const accountKeys = new Set(['userId', 'email'])
const dataKeys = new Set(['onboardingProfile', 'customization', 'history', 'steps', 'achievements', 'customPlan', 'todos', 'currentDay', 'reminders', 'activeSession', 'coaching'])
const currentDayKeys = new Set(['checklist', 'nutrition', 'nutritionLegacyDetail', 'wellness', 'commitments'])

function assertOnlyKeys(value: Record<string, unknown>, allowlist: ReadonlySet<string>): void {
  if (Object.keys(value).some((key) => !allowlist.has(key))) throw new DataImportError('invalid-data')
}

function assertSafeTree(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }]
  let nodes = 0
  while (stack.length) {
    const { value, depth } = stack.pop()!
    nodes += 1
    if (nodes > 100000 || depth > 50) throw new DataImportError('invalid-data')
    if (!value || typeof value !== 'object') continue
    if (Array.isArray(value)) {
      if (value.length > 10000) throw new DataImportError('invalid-data')
      value.forEach((item) => stack.push({ value: item, depth: depth + 1 }))
      continue
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (dangerousKeys.has(key)) throw new DataImportError('dangerous-key')
      stack.push({ value: item, depth: depth + 1 })
    })
  }
}

function assertOwner(options: DataImportOptions, sourceOwnerId?: string | null): void {
  if (options.recoveryActive) throw new DataImportError('recovery-active')
  if (typeof window === 'undefined') throw new DataImportError('unavailable')
  const currentOwner = getLastUser()
  if (options.ownerId ? currentOwner !== options.ownerId : currentOwner !== null && currentOwner !== undefined) throw new DataImportError('owner-mismatch')
  if (sourceOwnerId !== undefined && sourceOwnerId !== options.ownerId) throw new DataImportError('owner-mismatch')
}

function validateBundle(value: unknown): QimmahDataExport {
  assertSafeTree(value)
  if (!isRecord(value)) throw new DataImportError('invalid-format')
  assertOnlyKeys(value, topLevelKeys)
  if (value.format !== DATA_EXPORT_FORMAT) throw new DataImportError('invalid-format')
  if (value.schemaVersion !== DATA_EXPORT_SCHEMA_VERSION) throw new DataImportError('unsupported-version')
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) throw new DataImportError('invalid-data')
  if (typeof value.build !== 'string' || !isRecord(value.account) || !isRecord(value.data)) throw new DataImportError('invalid-data')
  assertOnlyKeys(value.account, accountKeys)
  assertOnlyKeys(value.data, dataKeys)
  if (value.account.userId !== null && typeof value.account.userId !== 'string') throw new DataImportError('invalid-data')
  if (value.account.email !== null && typeof value.account.email !== 'string') throw new DataImportError('invalid-data')
  const data = value.data
  if (!isRecord(data.customization) || !isRecord(data.history) || !isRecord(data.steps) || !Array.isArray(data.steps.days)) throw new DataImportError('invalid-data')
  if (!isRecord(data.achievements) || !isRecord(data.todos) || !isRecord(data.currentDay) || !isRecord(data.reminders) || !isRecord(data.coaching)) throw new DataImportError('invalid-data')
  assertOnlyKeys(data.currentDay, currentDayKeys)
  if (!Array.isArray(data.coaching.shownLessonIds) || data.activeSession !== null && !isRecord(data.activeSession)) throw new DataImportError('invalid-data')
  normalizeHistorySnapshot(data.history) // exercise every bounded runtime normalizer before preview.
  return value as unknown as QimmahDataExport
}

export function prepareQimmahDataImport(json: string, options: DataImportOptions): PreparedDataImport {
  if (new TextEncoder().encode(json).byteLength > MAX_DATA_EXPORT_BYTES) throw new DataImportError('too-large')
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { throw new DataImportError('invalid-json') }
  const bundle = validateBundle(parsed)
  assertOwner(options, bundle.account.userId)
  const history = normalizeHistorySnapshot(bundle.data.history)
  const preview: DataImportPreview = {
    exportedAt: bundle.exportedAt,
    sourceBuild: bundle.build,
    sourceOwnerId: bundle.account.userId,
    workoutSessions: history.workoutSessions.length,
    measurements: history.measurementLogs.length,
    nutritionDays: Object.keys(history.nutritionLogs).length,
    stepDays: bundle.data.steps.days.length,
    todos: Array.isArray(bundle.data.todos.items) ? bundle.data.todos.items.length : 0,
    achievements: Object.keys(bundle.data.achievements.unlocked ?? {}).length,
    hasActiveSession: bundle.data.activeSession !== null,
  }
  return { ownerId: options.ownerId, bundle, preview }
}

function boolMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 1000).map(([key, item]) => [key.slice(0, 120), Boolean(item)]))
}

function snapshotQimmahStorage(): Map<string, string> {
  const snapshot = new Map<string, string>()
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith('qimmah:')) snapshot.set(key, window.localStorage.getItem(key) ?? '')
  }
  return snapshot
}

function restoreStorageSnapshot(snapshot: Map<string, string>): void {
  const remove: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith('qimmah:')) remove.push(key)
  }
  remove.forEach((key) => window.localStorage.removeItem(key))
  snapshot.forEach((value, key) => window.localStorage.setItem(key, value))
}

function applyBundle(bundle: QimmahDataExport, ownerId: string | null): void {
  const onboarding = normalizeOnboardingProfile(bundle.data.onboardingProfile)
  if (onboarding) saveOnboardingProfile(onboarding)
  saveCustomization(normalizeCustomization(bundle.data.customization))
  importHistory(bundle.data.history)
  saveStepGoal(bundle.data.steps.goal)
  replaceStepLog(bundle.data.steps.days as DaySteps[])
  restoreAchievementState(bundle.data.achievements)
  if (bundle.data.customPlan?.plan?.days) {
    saveCustomPlan(ownerId, bundle.data.customPlan.plan)
    setPlanSource(ownerId, bundle.data.customPlan.source)
  } else clearCustomPlan(ownerId)
  const todoInput = bundle.data.todos as TodoState
  saveTodos(ownerId, { date: typeof todoInput.date === 'string' ? todoInput.date : getDayStamp(), items: Array.isArray(todoInput.items) ? todoInput.items.filter((item) => item && typeof item.id === 'string' && typeof item.text === 'string').slice(0, 1000).map((item) => ({ id: item.id.slice(0, 160), text: item.text.slice(0, 500), done: Boolean(item.done), rolledOver: Boolean(item.rolledOver) })) : [] })

  const today = getDayStamp()
  const current = bundle.data.currentDay
  const checklist = current.checklist as TodayState
  saveToday({ date: today, done: checklist?.date === today ? boolMap(checklist.done) : {} })
  restoreNutritionDay(current.nutrition?.date === today ? current.nutrition : { date: today, foods: [], waterMl: 0 })
  const legacy = current.nutritionLegacyDetail as NutritionTodayState
  saveNutritionToday({ date: today, doneMeals: legacy?.date === today ? boolMap(legacy.doneMeals) : {}, waterMl: legacy?.date === today ? Math.max(0, Math.min(20000, Number(legacy.waterMl) || 0)) : 0, log: legacy?.date === today && Array.isArray(legacy.log) ? legacy.log.slice(0, 500) : [] })
  const wellness = current.wellness as WellnessTodayState
  saveWellnessToday({ date: today, doneSupplements: wellness?.date === today ? boolMap(wellness.doneSupplements) : {}, doneMedications: wellness?.date === today ? boolMap(wellness.doneMedications) : {} })
  const commitments = current.commitments
  saveCommitmentsToday({ date: today, done: commitments?.date === today ? boolMap(commitments.done) : {}, notes: commitments?.date === today && typeof commitments.notes === 'string' ? commitments.notes.slice(0, 2000) : '' })
  saveNotificationPrefs(ownerId ?? 'guest', bundle.data.reminders)
  if (bundle.data.activeSession && isRestorableSnapshot(bundle.data.activeSession, Date.now())) saveActiveSession(ownerId, bundle.data.activeSession)
  else clearActiveSession(ownerId)
  restoreShownLessonIds(ownerId, bundle.data.coaching.shownLessonIds)
  if (ownerId) enqueueAuxOperations(ownerId)
  markPendingSync()
  // Several legacy writers intentionally swallow quota exceptions during normal
  // use. A restore is transactional, so probe storage after every writer: real
  // quota/security failures persist and must trigger the outer rollback.
  const probeKey = `qimmah:restoreProbe:v1:${ownerId ?? 'guest'}`
  window.localStorage.setItem(probeKey, 'ok')
  window.localStorage.removeItem(probeKey)
}

/** Applies only a previously previewed bundle, with a fresh owner/recovery check and rollback. */
export function applyPreparedDataImport(prepared: PreparedDataImport, options: DataImportOptions): { backupKey: string } {
  assertOwner(options, prepared.ownerId)
  if (prepared.ownerId !== options.ownerId || prepared.bundle.account.userId !== options.ownerId) throw new DataImportError('owner-mismatch')
  const storageBefore = snapshotQimmahStorage()
  const backupKey = `${DATA_RESTORE_BACKUP_PREFIX}${options.ownerId ?? 'guest'}`
  const backup = serializeQimmahDataExport(buildQimmahDataExport({ ownerId: options.ownerId, email: options.email, recoveryActive: options.recoveryActive }))
  try {
    window.localStorage.setItem(backupKey, backup)
    applyBundle(prepared.bundle, options.ownerId)
    return { backupKey }
  } catch (error) {
    restoreStorageSnapshot(storageBefore)
    try { window.localStorage.setItem(backupKey, backup) } catch { /* best effort after rollback */ }
    if (error instanceof DataImportError) throw error
    throw new DataImportError('apply-failed')
  }
}
