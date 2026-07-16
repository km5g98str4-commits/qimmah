// محرّك الرؤى — النواة النقيّة للمقاييس. لا آثار جانبية، لا وصول للمتاجر.
// كل دالة تأخذ شريحة من InsightInput وتُعيد مقياسًا مُطبَّعًا مع عتبة/امتناع صريح.

import type {
  AdherenceMetric, InsightInput, MetricsBundle, MuscleSplitMetric, PrMetric,
  ProteinMetric, StreakMetric, VolumeMetric, WeightMetric,
} from './types'

const DAY_MS = 86400000
const WEEK_START_DAY = 6 // السبت — بداية الأسبوع الخليجي (يطابق streaks.ts)

// عتبات الحدّ الأدنى للبيانات لكل رؤية (تحتها → امتناع).
// Source classification: NON-STANDARD product thresholds. They are abstention/wording guards,
// not clinical cut-points; no external standard is claimed. See docs/features/FORMULAS.md.
export const THRESHOLDS = {
  weightMinPoints: 4,
  weightMinSpanDays: 14,
  weightStaleDays: 9,
  plateauMinWeeks: 3,
  plateauBandKg: 0.6, // ±نطاق الثبات
  proteinMinLoggedDays: 3,
  proteinHitFactor: 0.9, // ≥90% من الهدف يُعدّ إصابة
  prNearMinPct: 2.5, // ضمن 2.5–6% تحت الأفضل = «قريب»
  prNearMaxPct: 6,
} as const

function parseDay(stamp: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null
}
function startOfWeekMs(ms: number): number {
  const d = new Date(ms)
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  base.setDate(base.getDate() - ((base.getDay() - WEEK_START_DAY + 7) % 7))
  return base.getTime()
}
/** Method reference: NIST/SEMATECH e-Handbook §4.1.4.1 (accessed 2026-07-16), ordinary least squares. */
/** انحدار خطّي بالمربّعات الصغرى: يُعيد الميل (وحدة y لكل يوم). */
export function linregSlopePerDay(pts: { x: number; y: number }[]): number | null {
  const n = pts.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (const p of pts) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return (n * sxy - sx * sy) / denom
}
/** Source classification: NON-STANDARD centered, observation-weighted Qimmah smoother (not a calendar-day 7d mean). */
/** تنعيم متحرّك بنافذة أيام (متوسّط النقاط ضمن ±windowDays/2 حول كل نقطة). */
export function rollingSmooth(pts: { t: number; v: number }[], windowDays = 7): { t: number; v: number }[] {
  const half = (windowDays / 2) * DAY_MS
  return pts.map((p) => {
    const win = pts.filter((q) => Math.abs(q.t - p.t) <= half)
    return { t: p.t, v: win.reduce((s, q) => s + q.v, 0) / win.length }
  })
}

// ————— 1) حجم التدريب الأسبوعي —————
export function computeVolume(input: InsightInput): VolumeMetric {
  const wkStart = startOfWeekMs(input.nowMs)
  const lastStart = wkStart - 7 * DAY_MS
  let thisWeek = 0, lastWeek = 0, sessions = 0
  for (const s of input.sessions) {
    const t = parseDay(s.date); if (t == null) continue
    if (t >= wkStart) { thisWeek += s.volume; sessions++ }
    else if (t >= lastStart && t < wkStart) lastWeek += s.volume
  }
  if (thisWeek === 0 && lastWeek === 0) return { key: 'volume', status: 'abstain', reason: 'insufficient', thisWeek: 0, lastWeek: 0, deltaPct: null, sessions: 0 }
  const deltaPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  return { key: 'volume', status: 'ok', thisWeek: Math.round(thisWeek), lastWeek: Math.round(lastWeek), deltaPct, sessions }
}

// ————— 2) توزيع العضلات مقابل الخطة —————
export function computeMuscleSplit(input: InsightInput, minSessions = 2): MuscleSplitMetric {
  if (input.plan.muscleGroups.length === 0) return { key: 'muscleSplit', status: 'abstain', reason: 'noTarget', undertrained: [], covered: [] }
  const wkStart = startOfWeekMs(input.nowMs)
  const wk = input.sessions.filter((s) => { const t = parseDay(s.date); return t != null && t >= wkStart })
  if (wk.length < minSessions) return { key: 'muscleSplit', status: 'abstain', reason: 'insufficient', undertrained: [], covered: [] }
  const counts = new Map<string, number>()
  for (const s of wk) for (const g of s.muscleGroups) counts.set(g, (counts.get(g) || 0) + 1)
  const covered = [...counts.keys()]
  const undertrained = input.plan.muscleGroups.filter((group) => !counts.has(group))
  return { key: 'muscleSplit', status: 'ok', undertrained, covered }
}

// Source classification: NON-STANDARD product KPI: distinct completed days / planned days, capped at 100%.
// ————— 3) الالتزام (المخطّط مقابل المُنجَز) —————
export function computeAdherence(input: InsightInput): AdherenceMetric {
  const planned = input.plan.daysPerWeek
  if (!planned || planned < 1) return { key: 'adherence', status: 'abstain', reason: 'noTarget', pct: null, doneDays: 0, plannedDays: 0, fourWeekAvgPct: null }
  const wkStart = startOfWeekMs(input.nowMs)
  const daySet = new Set<string>()
  const perWeek = new Map<number, Set<string>>()
  for (const s of input.sessions) {
    const t = parseDay(s.date); if (t == null) continue
    if (t >= wkStart) daySet.add(s.date)
    const w = Math.floor((startOfWeekMs(input.nowMs) - startOfWeekMs(t)) / (7 * DAY_MS))
    if (w >= 0 && w < 4) { const set = perWeek.get(w) ?? new Set<string>(); set.add(s.date); perWeek.set(w, set) }
  }
  if (input.sessions.length === 0) return { key: 'adherence', status: 'abstain', reason: 'insufficient', pct: null, doneDays: 0, plannedDays: planned, fourWeekAvgPct: null }
  const doneDays = daySet.size
  const pct = Math.min(100, Math.round((doneDays / planned) * 100))
  const weekPcts: number[] = []
  for (let w = 0; w < 4; w++) weekPcts.push(Math.min(100, Math.round(((perWeek.get(w)?.size || 0) / planned) * 100)))
  const fourWeekAvgPct = Math.round(weekPcts.reduce((a, b) => a + b, 0) / weekPcts.length)
  return { key: 'adherence', status: 'ok', pct, doneDays, plannedDays: planned, fourWeekAvgPct }
}

// Source classification: OLS is standard; 28d lookback, 7d centered smoother, ±0.6 kg band,
// 3-week minimum, and |slope| <0.1 flat rule are NON-STANDARD Qimmah heuristics.
// ————— 4) اتجاه الوزن: تنعيم 7 أيام + ميل + كشف الثبات —————
export function computeWeight(input: InsightInput): WeightMetric {
  const pts = input.weights.map((w) => ({ t: parseDay(w.date), v: w.kg })).filter((p): p is { t: number; v: number } => p.t != null).sort((a, b) => a.t - b.t)
  const latestKg = pts.length ? pts[pts.length - 1].v : null
  const ageDays = pts.length ? Math.round((input.nowMs - pts[pts.length - 1].t) / DAY_MS) : null
  const stale = ageDays != null && ageDays > THRESHOLDS.weightStaleDays
  const spanDays = pts.length ? (pts[pts.length - 1].t - pts[0].t) / DAY_MS : 0
  if (pts.length < THRESHOLDS.weightMinPoints || spanDays < THRESHOLDS.weightMinSpanDays) {
    return { key: 'weight', status: 'abstain', reason: 'insufficient', slopeKgPerWeek: null, plateau: false, direction: null, latestKg, ageDays, points: pts.length, stale }
  }
  // آخر ~28 يومًا، مُنعَّمة بنافذة 7 أيام، ثم ميل بالمربّعات الصغرى.
  const cutoff = input.nowMs - 28 * DAY_MS
  const recent = pts.filter((p) => p.t >= cutoff)
  const used = recent.length >= THRESHOLDS.weightMinPoints ? recent : pts
  const smooth = rollingSmooth(used, 7)
  const slopePerDay = linregSlopePerDay(smooth.map((p) => ({ x: p.t / DAY_MS, y: p.v })))
  const slopeKgPerWeek = slopePerDay == null ? null : Math.round(slopePerDay * 7 * 100) / 100
  // ثبات: ≥3 أسابيع، والمدى ضمن ±band.
  const weeksSpan = (used[used.length - 1].t - used[0].t) / (7 * DAY_MS)
  const vals = smooth.map((p) => p.v)
  const range = Math.max(...vals) - Math.min(...vals)
  const plateau = weeksSpan >= THRESHOLDS.plateauMinWeeks && range <= THRESHOLDS.plateauBandKg * 2
  const direction = slopeKgPerWeek == null ? null : Math.abs(slopeKgPerWeek) < 0.1 ? 'flat' : slopeKgPerWeek < 0 ? 'down' : 'up'
  return { key: 'weight', status: 'ok', slopeKgPerWeek, plateau, direction, latestKg, ageDays, points: pts.length, stale }
}

// ————— 5) نسبة إصابة هدف البروتين —————
export function computeProtein(input: InsightInput): ProteinMetric {
  const target = input.plan.targetProtein
  if (!target || target <= 0) return { key: 'protein', status: 'abstain', reason: 'noTarget', hitDays: 0, loggedDays: 0, targetG: null }
  const wkStart = startOfWeekMs(input.nowMs) - 0 // آخر 7 أيام حتى الآن
  const from = input.nowMs - 7 * DAY_MS
  let hit = 0, logged = 0
  for (const [date, p] of Object.entries(input.proteinByDate)) {
    const t = parseDay(date); if (t == null || t < from || t > input.nowMs) continue
    if (p == null) continue
    logged++
    if (p >= target * THRESHOLDS.proteinHitFactor) hit++
  }
  void wkStart
  if (logged < THRESHOLDS.proteinMinLoggedDays) return { key: 'protein', status: 'abstain', reason: 'insufficient', hitDays: hit, loggedDays: logged, targetG: target }
  return { key: 'protein', status: 'ok', hitDays: hit, loggedDays: logged, targetG: target }
}

// ————— 6) صحّة السلسلة —————
export function computeStreak(input: InsightInput): StreakMetric {
  const days = new Set(input.sessions.map((s) => s.date))
  if (days.size === 0) return { key: 'streak', status: 'abstain', reason: 'insufficient', days: 0, weeksConsistent: 0 }
  // سلسلة أيام متتالية حتى اليوم أو أمس.
  let streak = 0
  let cursor = new Date(input.nowMs)
  const stamp = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (!days.has(stamp(cursor))) cursor = new Date(input.nowMs - DAY_MS)
  for (let i = 0; i < 366 && days.has(stamp(cursor)); i++) { streak++; cursor = new Date(cursor.getTime() - DAY_MS) }
  // أسابيع متتالية فيها ≥1 جلسة (حتى 8).
  let weeksConsistent = 0
  for (let w = 0; w < 8; w++) {
    const s = startOfWeekMs(input.nowMs) - w * 7 * DAY_MS
    const has = input.sessions.some((x) => { const t = parseDay(x.date); return t != null && t >= s && t < s + 7 * DAY_MS })
    if (has) weeksConsistent++; else break
  }
  return { key: 'streak', status: 'ok', days: streak, weeksConsistent }
}

// ————— 7) القرب من رقم قياسي —————
export function computePrProximity(input: InsightInput): PrMetric {
  const wkStart = startOfWeekMs(input.nowMs) - 7 * DAY_MS // آخر أسبوعين
  let best: { name: string; pct: number } | null = null
  for (const s of input.sessions) {
    const t = parseDay(s.date); if (t == null || t < wkStart) continue
    for (const ts of s.topSets) {
      const rec = input.prBests[ts.exerciseId]
      if (!rec || rec.best <= 0) continue
      if (ts.weightKg >= rec.best) continue // تجاوز بالفعل = ليس «قريبًا»
      const gapPct = ((rec.best - ts.weightKg) / rec.best) * 100
      if (gapPct >= THRESHOLDS.prNearMinPct && gapPct <= THRESHOLDS.prNearMaxPct) {
        if (!best || gapPct < best.pct) best = { name: rec.name || ts.name, pct: gapPct }
      }
    }
  }
  if (!best) return { key: 'pr', status: 'abstain', reason: 'insufficient', exerciseName: null, nearestPct: null }
  return { key: 'pr', status: 'ok', exerciseName: best.name, nearestPct: Math.round(best.pct * 10) / 10 }
}

export function computeAllMetrics(input: InsightInput): MetricsBundle {
  return {
    volume: computeVolume(input),
    muscleSplit: computeMuscleSplit(input),
    adherence: computeAdherence(input),
    weight: computeWeight(input),
    protein: computeProtein(input),
    streak: computeStreak(input),
    pr: computePrProximity(input),
  }
}
