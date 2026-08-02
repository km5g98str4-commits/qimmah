// ⚠️ DEPRECATED (P11) — وحدة التعافي القديمة (v1).
// المحرّك الجديد مُرقَّم القواعد في src/lib/recoveryEngine.ts (v2): اقتراح
// proceed/reduce_volume/reduce_intensity/rest + ثقة + أثر قرار لكل عامل + اتجاه ٧/٢٨ يومًا.
// تبقى هذه الوحدة تعمل كما هي لأن RecoveryView.tsx (شاشات 37–39) ما زالت تقرأ/تكتب
// سجلّ v1، وسجلّ v1 يُستورد للقراءة في v2 عبر ensureRecoveryEngineMigrated (بلا حذف).
// لا تُضِف منطقًا جديدًا هنا — أي تطوير يذهب إلى recoveryEngine.ts.
// DEPRECATED (P11): legacy v1 recovery module. The rules-versioned engine lives in
// src/lib/recoveryEngine.ts; this stays functional (view + v1 log intact, read-imported
// into v2 without deletion). Do not add new logic here.
//
// Recovery check-in — Qimmah Design Standard v3.0, Recovery area (screens 37–39).
// HONESTY RULE: a recommendation is derived ONLY from what the user self-reports
// (effort · sleep · soreness · energy). It is NEVER medical and is NEVER derived
// from supplements/medications. Every input is optional; the output always
// carries a "based on your own input · not medical advice" label in the view.
//
// Pure logic here (no storage) so the mapping is unit-tested without a browser;
// the owner-scoped log store lives at the bottom and is a thin localStorage wrapper.

import { getDayStamp } from './today'

export type Sleep = 'poor' | 'ok' | 'good'
export type Soreness = 'none' | 'mild' | 'moderate' | 'severe'
export type Energy = 'low' | 'ok' | 'high'

/** All fields optional — the user reports only what they want. */
export interface RecoveryInput {
  /** Perceived exertion of the last session, 1–10 (0/undefined = unset). */
  effort?: number
  sleep?: Sleep
  soreness?: Soreness
  energy?: Energy
  note?: string
}

/** Advisory outcome — NEVER a plan change, NEVER medical. */
export type RecoveryRec = 'rest' | 'light' | 'full' | 'reassess'

const SORENESS_SCORE: Record<Soreness, number> = { none: 0, mild: 1, moderate: 2, severe: 3 }
const SLEEP_SCORE: Record<Sleep, number> = { good: 0, ok: 1, poor: 2 }
const ENERGY_SCORE: Record<Energy, number> = { high: 0, ok: 1, low: 2 }

/** Does the input carry any self-reported signal at all? */
export function hasSignal(input: RecoveryInput): boolean {
  return (
    (typeof input.effort === 'number' && input.effort > 0) ||
    input.sleep !== undefined ||
    input.soreness !== undefined ||
    input.energy !== undefined
  )
}

/**
 * Map self-reported state → an advisory recovery recommendation. Pure. Higher
 * fatigue signals (soreness, poor sleep, low energy, very hard last session)
 * push toward rest; a rested, low-soreness state allows a full session. With no
 * signal we ask for a re-assessment rather than inventing a number.
 */
export function recommendRecovery(input: RecoveryInput): RecoveryRec {
  if (!hasSignal(input)) return 'reassess'
  // Severe soreness is decisive on its own — protect the user, suggest rest.
  if (input.soreness === 'severe') return 'rest'
  let score = 0
  if (input.soreness) score += SORENESS_SCORE[input.soreness]
  if (input.sleep) score += SLEEP_SCORE[input.sleep]
  if (input.energy) score += ENERGY_SCORE[input.energy]
  if (typeof input.effort === 'number' && input.effort > 0) {
    score += input.effort >= 8 ? 2 : input.effort >= 6 ? 1 : 0
  }
  if (score >= 5) return 'rest'
  if (score >= 3) return 'light'
  return 'full'
}

// ————————————————————————————————————————————————————————————————
// Owner-scoped, offline-first log (localStorage). Never a cloud write here.
// ————————————————————————————————————————————————————————————————

export const RECOVERY_LOG_BASE = 'qimmah:recovery-log:v1'
export const recoveryLogKey = (ownerId: string | null): string => `${RECOVERY_LOG_BASE}:${ownerId ?? 'guest'}`

export interface RecoveryEntry extends RecoveryInput {
  date: string
  rec: RecoveryRec
}

export function loadRecoveryLog(ownerId: string | null): RecoveryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(recoveryLogKey(ownerId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecoveryEntry[]) : []
  } catch {
    return []
  }
}

/** Save today's check-in (replacing any earlier entry for the same day). */
export function saveRecoveryEntry(ownerId: string | null, input: RecoveryInput): RecoveryEntry {
  const entry: RecoveryEntry = { ...input, date: getDayStamp(), rec: recommendRecovery(input) }
  const log = loadRecoveryLog(ownerId).filter((e) => e.date !== entry.date)
  const next = [entry, ...log].slice(0, 180)
  try {
    window.localStorage.setItem(recoveryLogKey(ownerId), JSON.stringify(next))
  } catch {
    /* storage full/unavailable — the returned entry still drives the view */
  }
  return entry
}

/** Today's saved check-in, if any. */
export function todaysRecovery(ownerId: string | null): RecoveryEntry | null {
  const today = getDayStamp()
  return loadRecoveryLog(ownerId).find((e) => e.date === today) ?? null
}
