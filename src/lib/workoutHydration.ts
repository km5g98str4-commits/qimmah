// تذكير الترطيب أثناء التمرين (شاشة المعيار 46) — منطق نقي + تفضيل يتحكّم به المستخدم.
//
// المصدر الوحيد للترطيب هو ماء اليوم في سجلّ التغذية (waterMl) الذي تقرأه شاشة
// التغذية؛ هذا الملف يكتب فيه نفسه — لا مصدر مزدوج. التذكير مبنيّ على وقت الجلسة
// الحقيقي فقط (لا حرارة/مدة مُختلقة): كل N دقيقة يضبطها المستخدم، ويمكن إيقافه كليًا.

import { addWaterToDay, loadNutritionDay } from './nutritionV2Model'
import { safeWriteJson } from '@/lib/safeStorage'

export const HYDRATION_PREF_KEY = 'qimmah:workoutHydration:v1'

export interface HydrationPref {
  /** تشغيل/إيقاف التذكير أثناء التمرين. */
  enabled: boolean
  /** الفترة بين التذكيرات بالدقائق (يضبطها المستخدم). */
  intervalMin: number
  /** الكمية الافتراضية للتسجيل السريع (مل). */
  amountMl: number
}

export const DEFAULT_HYDRATION_PREF: HydrationPref = { enabled: true, intervalMin: 20, amountMl: 250 }

const clampInterval = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return DEFAULT_HYDRATION_PREF.intervalMin
  return Math.min(120, Math.max(5, Math.round(v)))
}
const clampAmount = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_HYDRATION_PREF.amountMl
  return Math.min(2000, Math.max(50, Math.round(v)))
}

export function loadHydrationPref(): HydrationPref {
  if (typeof window === 'undefined') return { ...DEFAULT_HYDRATION_PREF }
  try {
    const raw = window.localStorage.getItem(HYDRATION_PREF_KEY)
    if (!raw) return { ...DEFAULT_HYDRATION_PREF }
    const p = JSON.parse(raw) as Partial<HydrationPref>
    return {
      enabled: p.enabled !== false,
      intervalMin: clampInterval(p.intervalMin),
      amountMl: clampAmount(p.amountMl),
    }
  } catch {
    return { ...DEFAULT_HYDRATION_PREF }
  }
}

export function saveHydrationPref(pref: HydrationPref): HydrationPref {
  const clean: HydrationPref = { enabled: pref.enabled !== false, intervalMin: clampInterval(pref.intervalMin), amountMl: clampAmount(pref.amountMl) }
  safeWriteJson(HYDRATION_PREF_KEY, clean)
  return clean
}

// ── Single-source daily water ──
// Both the in-workout reminder AND the Nutrition screen go through the ONE
// canonical store (nutritionV2Model → qimmah:nutrition:v2, mirrored to the
// history water log). No parallel counter.

/** Today's logged water in ml — the same value the Nutrition screen shows. */
export function getTodayWaterMl(): number {
  return loadNutritionDay().waterMl
}

/**
 * Adds (or subtracts, for undo) water to today's total via the canonical
 * nutrition store — the exact path the Nutrition screen uses.
 * @returns the new daily total (clamped ≥ 0).
 */
export function addTodayWaterMl(deltaMl: number): number {
  return addWaterToDay(Math.round(deltaMl)).waterMl
}

// ── Pure reminder-due logic (from real session elapsed time only) ──

/**
 * How many hydration reminders are due since the session started, based purely
 * on real elapsed minutes. 0 at the start (never nags immediately); the first
 * reminder falls due after one full interval. No heat/duration is invented.
 */
export function remindersDue(startedAtMs: number, nowMs: number, intervalMin: number): number {
  if (intervalMin <= 0 || nowMs <= startedAtMs) return 0
  const elapsedMin = (nowMs - startedAtMs) / 60_000
  return Math.floor(elapsedMin / intervalMin)
}
