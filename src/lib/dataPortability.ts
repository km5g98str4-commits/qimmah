import { loadActiveSession } from '@/lib/activeSession'
import { getLastUser } from '@/lib/accountScope'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { shownLessonIds } from '@/lib/coaching/lessonRotation'
import { loadCommitmentsToday } from '@/lib/commitmentTracking'
import { loadCustomization } from '@/lib/customization'
import { exportHistory, type HistorySnapshot } from '@/lib/historyStore'
import { loadNutritionDay } from '@/lib/nutritionV2Model'
import { loadNutritionToday } from '@/lib/nutritionTracking'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'
import { loadReminderPrefs } from '@/lib/reminderPrefs'
import { getStepSource, loadStepGoal, loadStepLog } from '@/lib/stepCounter'
import { loadToday } from '@/lib/today'
import { loadWellnessToday } from '@/lib/wellnessTracking'
import { loadAchievementState } from '@/features/achievements/engine'
import { loadCustomPlanRecord } from '@/features/customPlan/storage'
import { loadTodos } from '@/features/todo/store'

export const DATA_EXPORT_FORMAT = 'qimmah-data-export' as const
export const DATA_EXPORT_SCHEMA_VERSION = 1 as const
export const MAX_DATA_EXPORT_BYTES = 10 * 1024 * 1024

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
    reminders: ReturnType<typeof loadReminderPrefs>
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
      reminders: loadReminderPrefs(),
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
