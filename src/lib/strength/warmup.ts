// مولّد الإحماء — Qimmah Strength. من وزن العمل الهدف يبني سلّم إحماء قياسيًا:
//   البار × ١٠  →  ٤٠٪ × ٨  →  ٦٠٪ × ٥  →  ٨٠٪ × ٣  →  وزن العمل.
// كل وزن يُقرَّب لأقرب تحميل أقراص قابل للتحقيق (computeLoadout)، وتُحذف الخطوة إن
// ساوت البار أو كرّرت سابقتها أو بلغت وزن العمل. التفضيل (إظهار/إخفاء) مربوط بالحساب.

import { computeLoadout, type Loadout, type PlateConfig } from './plates'

export const WARMUP_PREF_BASE = 'qimmah:warmup-pref:v1'

export interface WarmupPref { show: boolean }

export function warmupPrefKey(userId?: string | null): string {
  return `${WARMUP_PREF_BASE}:${userId ?? 'guest'}`
}
export function loadWarmupPref(userId?: string | null): WarmupPref {
  if (typeof window === 'undefined') return { show: true }
  try {
    const raw = window.localStorage.getItem(warmupPrefKey(userId))
    if (!raw) return { show: true }
    const p = JSON.parse(raw) as Partial<WarmupPref>
    return { show: typeof p.show === 'boolean' ? p.show : true }
  } catch {
    return { show: true }
  }
}
export function saveWarmupPref(userId: string | null | undefined, pref: WarmupPref): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(warmupPrefKey(userId), JSON.stringify(pref))
  } catch {
    /* تجاهل */
  }
}

export interface WarmupSet {
  /** الوزن المقرَّب لتحميل قابل للتحقيق. */
  weightKg: number
  reps: number
  /** وسم موجز («البار»، «٤٠٪»…). */
  label: string
  /** تحميل الأقراص لهذا الوزن. */
  loadout: Loadout
  isWork: boolean
}

// Source classification: NON-STANDARD Qimmah warm-up heuristic; percentages/reps are not presented as a consensus prescription.
const RAMP: { pct: number | null; reps: number; label: string }[] = [
  { pct: null, reps: 10, label: 'البار' },
  { pct: 0.4, reps: 8, label: '٤٠٪' },
  { pct: 0.6, reps: 5, label: '٦٠٪' },
  { pct: 0.8, reps: 3, label: '٨٠٪' },
]

/**
 * يبني سلّم الإحماء لوزن عمل. الأوزان مقرّبة لتحميل قابل للتحقيق؛ تُزال الخطوات
 * المكرّرة/التي تبلغ وزن العمل. تُرجِع مصفوفة فارغة إن كان العمل ≤ البار (لا معنى للإحماء).
 */
export function generateWarmup(workingKg: number, config: PlateConfig, workReps = 5): WarmupSet[] {
  const bar = config.barKg
  if (!Number.isFinite(workingKg) || workingKg <= bar) return []
  const out: WarmupSet[] = []
  let lastKg = -1
  for (const step of RAMP) {
    const raw = step.pct == null ? bar : workingKg * step.pct
    const load = computeLoadout(step.pct == null ? bar : raw, config)
    const w = load.achievedKg
    // تخطَّ التكرار، وما يبلغ/يتجاوز وزن العمل (الإحماء أخفّ دائمًا).
    if (w <= lastKg || w >= workingKg) continue
    out.push({ weightKg: w, reps: step.reps, label: step.label, loadout: load, isWork: false })
    lastKg = w
  }
  const workLoad = computeLoadout(workingKg, config)
  out.push({ weightKg: workLoad.achievedKg, reps: workReps, label: 'العمل', loadout: workLoad, isWork: true })
  return out
}
