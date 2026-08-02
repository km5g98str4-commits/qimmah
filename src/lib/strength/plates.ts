// حاسبة الأقراص — Qimmah Strength. تحسب تحميل كل جهة من البار لوزن هدف، بمجموعة
// أقراص قياسية سعودية قابلة للتعديل لكل مستخدم (مربوطة بالحساب). الأوزان غير القابلة
// للتحقيق تُرجِع أقرب وزن ممكن مع اقتراح ±.
//
// الحساب حتمي وخالٍ من أخطاء العشور: نعمل بوحدات ربع كيلو (integer) داخليًا.

// Source classification: exact load arithmetic/limited-knapsack implementation, not a physiological claim.
const QUARTER = 0.25
const toQ = (kg: number): number => Math.round(kg / QUARTER)
const fromQ = (q: number): number => Math.round((q / 4) * 100) / 100

/** قرص متاح: وزنه (كجم) وعدد أزواجه (زوج = قرص لكل جهة). */
export interface PlateSpec { kg: number; pairs: number }
export interface PlateConfig { barKg: number; plates: PlateSpec[] }

/** المجموعة القياسية في صالات السعودية (كجم لكل قرص). */
export const KSA_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const
export const BAR_OPTIONS_KG = [20, 15] as const
export const PLATES_KEY_BASE = 'qimmah:plates:v1'

/** إعداد افتراضي: بار ٢٠ كجم + مجموعة سعودية بأعداد وافرة (قابلة للتعديل). */
export function defaultPlateConfig(): PlateConfig {
  return { barKg: 20, plates: KSA_PLATES_KG.map((kg) => ({ kg, pairs: kg >= 10 ? 8 : 6 })) }
}

export function plateKey(userId?: string | null): string {
  return `${PLATES_KEY_BASE}:${userId ?? 'guest'}`
}

export function isValidPlateConfig(v: unknown): v is PlateConfig {
  if (!v || typeof v !== 'object') return false
  const c = v as Partial<PlateConfig>
  if (typeof c.barKg !== 'number' || !Number.isFinite(c.barKg) || c.barKg <= 0 || c.barKg > 100) return false
  if (!Array.isArray(c.plates) || c.plates.length === 0 || c.plates.length > 32) return false
  return c.plates.every((p) => p
    && typeof p.kg === 'number'
    && Number.isFinite(p.kg)
    && p.kg > 0
    && p.kg <= 100
    && Number.isInteger(p.pairs)
    && p.pairs >= 0
    && p.pairs <= 100)
}

/** يقرأ إعداد الأقراص لهذا الحساب (مربوط بالحساب — لا يتسرّب بين مستخدمين). */
export function loadPlateConfig(userId?: string | null): PlateConfig {
  if (typeof window === 'undefined') return defaultPlateConfig()
  try {
    const raw = window.localStorage.getItem(plateKey(userId))
    if (!raw) return defaultPlateConfig()
    const parsed = JSON.parse(raw) as unknown
    return isValidPlateConfig(parsed) ? parsed : defaultPlateConfig()
  } catch {
    return defaultPlateConfig()
  }
}

/** يحفظ إعداد الأقراص لهذا الحساب. */
export function savePlateConfig(userId: string | null | undefined, config: PlateConfig): void {
  if (typeof window === 'undefined' || !isValidPlateConfig(config)) return
  try {
    window.localStorage.setItem(plateKey(userId), JSON.stringify(config))
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

/** قرص واحد في التحميل: وزنه وعدده لكل جهة. */
export interface PlateInStack { kg: number; count: number }
export interface Loadout {
  /** هل الوزن الهدف قابل للتحقيق تمامًا؟ */
  reachable: boolean
  /** الوزن الفعلي المحقَّق (بار + الأقراص). */
  achievedKg: number
  /** الفرق عن الهدف (achieved − target). */
  deltaKg: number
  /** أقراص كل جهة (من الأثقل للأخف). */
  perSide: PlateInStack[]
  barKg: number
  /** اقتراح ± عند تعذّر التحقيق التام: أقرب وزن أقل وأعلى ممكن. */
  suggestion?: { downKg: number | null; upKg: number | null }
}

/**
 * كل مجاميع «جهة واحدة» الممكنة (بوحدة الربع) وتفكيكها لأقراص — knapsack محدود.
 * مجموعة الأقراص صغيرة فالبحث سريع؛ الغطاء = الهدف + أثقل قرص لضمان إيجاد الأعلى.
 */
function achievablePerSide(plates: PlateSpec[], capQ: number): Map<number, number[]> {
  const platesQ = plates.map((p) => toQ(p.kg))
  let reach = new Map<number, number[]>([[0, plates.map(() => 0)]])
  plates.forEach((p, i) => {
    const next = new Map(reach)
    for (const [sum, counts] of reach) {
      for (let c = 1; c <= p.pairs; c++) {
        const ns = sum + c * platesQ[i]
        if (ns > capQ) break
        if (!next.has(ns)) {
          const nc = counts.slice()
          nc[i] = c
          next.set(ns, nc)
        }
      }
    }
    reach = next
  })
  return reach
}

function stackFrom(plates: PlateSpec[], counts: number[]): PlateInStack[] {
  return plates
    .map((p, i) => ({ kg: p.kg, count: counts[i] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.kg - a.kg)
}

/**
 * يحسب تحميل كل جهة لوزن هدف. عند تعذّر التحقيق التام يعيد أقرب وزن ممكن (الأقرب
 * للهدف، وعند التعادل الأقل) مع اقتراح ± للوزنين المجاورين القابلين للتحقيق.
 */
export function computeLoadout(targetKg: number, config: PlateConfig): Loadout {
  const barKg = config.barKg
  const plates = [...config.plates].sort((a, b) => b.kg - a.kg)
  // البار وحده أو أقل.
  if (targetKg <= barKg) {
    return { reachable: targetKg === barKg, achievedKg: barKg, deltaKg: barKg - targetKg, perSide: [], barKg }
  }
  const perSideTargetQ = toQ((targetKg - barKg) / 2)
  const maxPlateQ = Math.max(...plates.map((p) => toQ(p.kg)))
  const reach = achievablePerSide(plates, perSideTargetQ + maxPlateQ)

  // أقرب مجموع لجهة واحدة (تعادل → الأقل).
  let bestSum = 0
  let bestDist = Infinity
  let down = -1
  let up = -1
  for (const sum of reach.keys()) {
    const dist = Math.abs(sum - perSideTargetQ)
    if (dist < bestDist || (dist === bestDist && sum < bestSum)) { bestDist = dist; bestSum = sum }
    if (sum <= perSideTargetQ && sum > down) down = sum
    if (sum >= perSideTargetQ && (up < 0 || sum < up)) up = sum
  }
  const achievedKg = Math.round((barKg + fromQ(bestSum) * 2) * 100) / 100
  const reachable = bestSum === perSideTargetQ
  const loadout: Loadout = {
    reachable,
    achievedKg,
    deltaKg: Math.round((achievedKg - targetKg) * 100) / 100,
    perSide: stackFrom(plates, reach.get(bestSum) ?? plates.map(() => 0)),
    barKg,
  }
  if (!reachable) {
    loadout.suggestion = {
      downKg: down >= 0 ? Math.round((barKg + fromQ(down) * 2) * 100) / 100 : null,
      upKg: up >= 0 ? Math.round((barKg + fromQ(up) * 2) * 100) / 100 : null,
    }
  }
  return loadout
}

/** الوزن الكلي لتحميل معيّن (للاختبار/العرض). */
export function totalFromPerSide(perSide: PlateInStack[], barKg: number): number {
  const oneSide = perSide.reduce((s, p) => s + p.kg * p.count, 0)
  return Math.round((barKg + oneSide * 2) * 100) / 100
}
