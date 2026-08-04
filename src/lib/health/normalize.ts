// طبقة التطبيع (P9) — تحويل عيّنات HealthKit الخام إلى شكل موحّد صادق.
//
// الضمانات:
//   • الوحدات: القيمة تبقى بوحدة الأساس من الكتالوج (SI/base)؛ العرض عبر toDisplay.
//   • ختم اليوم المحلي (YYYY-MM-DD) من بداية العيّنة — يطابق getDayStamp في today.ts.
//   • اسم المصدر (جهاز/تطبيق) يُحفظ كما ورد — لا يُخترع مصدر.
//   • إزالة التكرار: بمعرّف HealthKit UUID أولًا، وبمفتاح (metric,start,end,source)
//     عند غياب الـ UUID.
//   • أي عيّنة بقيمة غير منتهية أو تاريخ غير صالح تُسقَط — لا تُخمَّن قيمة أبدًا.

import { getDayStamp } from '../today'
import { metricDef, type HealthMetric } from './metrics'

/** مصدر العيّنة كما سجّله HealthKit (تطبيق أو جهاز). */
export interface HealthSource {
  name: string
  bundleId?: string
}

/** عيّنة صحية موحّدة — الشكل الوحيد الذي يخزّنه ويستهلكه قِمّة. */
export interface NormalizedSample {
  metric: HealthMetric
  /** معرّف HealthKit UUID — قد يغيب في مصادر مستقبلية، فيُستخدم مفتاح الاحتياط. */
  uuid: string | null
  /** ISO بداية العيّنة. */
  start: string
  /** ISO نهاية العيّنة. */
  end: string
  /** ختم اليوم المحلي لبداية العيّنة (YYYY-MM-DD). */
  day: string
  /** القيمة بوحدة الأساس من الكتالوج (kg، m، bpm، fraction…). للنوم = مدة بالدقائق. */
  value: number
  unit: string
  source: HealthSource
  /** مرحلة النوم (لمقياس sleepAnalysis فقط): inBed/asleep/awake/core/deep/rem. */
  stage?: string
  /** نشاط التمرين (لمقياس workouts فقط). */
  activity?: string
  /** مدة التمرين بالدقائق (workouts). */
  durationMin?: number
  /** سعرات التمرين — null من المصدر تعني «غير مسجّلة»، فلا تُضاف أصلًا. */
  kcal?: number
  /** مسافة التمرين بالمتر. */
  distanceM?: number
}

// — الأشكال الخام كما يرجعها الجسر السويفت —

export interface RawQuantitySample {
  uuid?: string
  start: string
  end: string
  value: number
  unit?: string
  sourceName?: string
  sourceBundleId?: string
}

export interface RawSleepSample {
  uuid?: string
  start: string
  end: string
  stage?: string
  durationMin?: number
  sourceName?: string
  sourceBundleId?: string
}

export interface RawWorkoutSample {
  uuid?: string
  start: string
  end: string
  activity?: string
  rawType?: number
  durationMin?: number
  kcal?: number | null
  distanceM?: number | null
  sourceName?: string
  sourceBundleId?: string
}

function validISO(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? value : null
}

function sourceOf(raw: { sourceName?: string; sourceBundleId?: string }): HealthSource {
  return {
    name: typeof raw.sourceName === 'string' && raw.sourceName ? raw.sourceName : 'unknown',
    bundleId: typeof raw.sourceBundleId === 'string' && raw.sourceBundleId ? raw.sourceBundleId : undefined,
  }
}

function base(metric: HealthMetric, raw: { uuid?: string; start: string; end: string; sourceName?: string; sourceBundleId?: string }): Pick<NormalizedSample, 'metric' | 'uuid' | 'start' | 'end' | 'day' | 'source'> | null {
  const start = validISO(raw.start)
  const end = validISO(raw.end) ?? start
  if (!start || !end) return null
  return {
    metric,
    uuid: typeof raw.uuid === 'string' && raw.uuid ? raw.uuid : null,
    start,
    end,
    day: getDayStamp(new Date(start)),
    source: sourceOf(raw),
  }
}

/** يطبّع عيّنة كمية واحدة؛ null عند قيمة/تاريخ غير صالح (تُسقَط بصمت). */
export function normalizeQuantity(metric: HealthMetric, raw: RawQuantitySample): NormalizedSample | null {
  const head = base(metric, raw)
  if (!head) return null
  const value = typeof raw.value === 'number' ? raw.value : Number(raw.value)
  if (!Number.isFinite(value)) return null
  return { ...head, value, unit: metricDef(metric).unit }
}

const SLEEP_STAGES = new Set(['inBed', 'asleep', 'awake', 'core', 'deep', 'rem'])

/** يطبّع عيّنة نوم: القيمة = مدة المرحلة بالدقائق، والمرحلة تُحفظ كما هي. */
export function normalizeSleep(raw: RawSleepSample): NormalizedSample | null {
  const head = base('sleepAnalysis', raw)
  if (!head) return null
  const fallbackMin = (new Date(head.end).getTime() - new Date(head.start).getTime()) / 60000
  const durationMin = typeof raw.durationMin === 'number' && Number.isFinite(raw.durationMin) ? raw.durationMin : fallbackMin
  if (!Number.isFinite(durationMin) || durationMin < 0) return null
  const stage = typeof raw.stage === 'string' && SLEEP_STAGES.has(raw.stage) ? raw.stage : 'unknown'
  return { ...head, value: Math.round(durationMin * 10) / 10, unit: 'min', stage }
}

/** يطبّع تمرينًا مسجّلًا: القيمة = المدة بالدقائق؛ سعرات/مسافة غائبة لا تُخترع. */
export function normalizeWorkout(raw: RawWorkoutSample): NormalizedSample | null {
  const head = base('workouts', raw)
  if (!head) return null
  const fallbackMin = (new Date(head.end).getTime() - new Date(head.start).getTime()) / 60000
  const durationMin = typeof raw.durationMin === 'number' && Number.isFinite(raw.durationMin) ? raw.durationMin : fallbackMin
  if (!Number.isFinite(durationMin) || durationMin < 0) return null
  const sample: NormalizedSample = {
    ...head,
    value: Math.round(durationMin * 10) / 10,
    unit: 'min',
    activity: typeof raw.activity === 'string' && raw.activity ? raw.activity : 'other',
    durationMin: Math.round(durationMin * 10) / 10,
  }
  if (typeof raw.kcal === 'number' && Number.isFinite(raw.kcal)) sample.kcal = raw.kcal
  if (typeof raw.distanceM === 'number' && Number.isFinite(raw.distanceM)) sample.distanceM = raw.distanceM
  return sample
}

/**
 * مفتاح إزالة التكرار: HealthKit UUID أولًا، وإلا مفتاح مركّب
 * (metric,start,end,source) — نفس العيّنة من نفس المصدر لا تُخزَّن مرتين.
 */
export function dedupeKey(sample: NormalizedSample): string {
  if (sample.uuid) return `u:${sample.uuid}`
  return `k:${sample.metric}|${sample.start}|${sample.end}|${sample.source.bundleId ?? sample.source.name}`
}

/**
 * يدمج عيّنات جديدة مع الموجود: إزالة تكرار (الجديدة تفوز لنفس المفتاح — قد تكون
 * نسخة محدَّثة)، ترتيب تنازلي بالبداية، وقصّ إلى السقف.
 */
export function mergeSamples(existing: NormalizedSample[], incoming: NormalizedSample[], cap = 2000): NormalizedSample[] {
  const byKey = new Map<string, NormalizedSample>()
  for (const sample of existing) byKey.set(dedupeKey(sample), sample)
  for (const sample of incoming) byKey.set(dedupeKey(sample), sample)
  return Array.from(byKey.values())
    .sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0))
    .slice(0, cap)
}

/** تحويل قيمة الأساس إلى قيمة العرض بوحدتها (ثنائية اللغة). لا يغيّر المخزون. */
export function toDisplay(metric: HealthMetric, value: number): { value: number; unit: string; unitAr: string } {
  const { display } = metricDef(metric)
  return { value: Math.round(value * display.factor * 100) / 100, unit: display.unit, unitAr: display.unitAr }
}

/** مجاميع يومية (الأقدم ← الأحدث) للمقاييس التراكمية، وآخر قيمة يوميًا لللحظية. */
export function dailySeries(metric: HealthMetric, samples: NormalizedSample[]): { day: string; value: number }[] {
  const cumulative = metricDef(metric).cumulative
  const byDay = new Map<string, { value: number; latestStart: string }>()
  for (const sample of samples) {
    const prev = byDay.get(sample.day)
    if (cumulative) {
      byDay.set(sample.day, { value: (prev?.value ?? 0) + sample.value, latestStart: sample.start })
    } else if (!prev || sample.start > prev.latestStart) {
      byDay.set(sample.day, { value: sample.value, latestStart: sample.start })
    }
  }
  return Array.from(byDay.entries())
    .map(([day, v]) => ({ day, value: Math.round(v.value * 100) / 100 }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
}
