// متجر العيّنات الصحية المستوردة (P9) — localStorage-first، موسوم بالمصدر.
//
//   • كل ما في هذا المتجر مستورد من HealthKit حصرًا (المدخلات اليدوية تعيش في
//     متاجرها الأصلية: stepCounter/measurementLog/…) — لذا «فصل المقياس» يعني
//     حذف عيّناته من هنا بالكامل، دون لمس أي إدخال يدوي.
//   • إزالة التكرار والسقف لكل مقياس عبر mergeSamples (UUID + مفتاح احتياطي).
//   • مرساة (anchor) الاستعلام التزايدي تُحفظ لكل مقياس داخل الغلاف نفسه.
//   • خصوصية: هذا المتجر لا يُصدَّر ولا يُزامَن ولا يلمسه التحليل (track) أبدًا.

import type { HealthMetric } from './metrics'
import { mergeSamples, type NormalizedSample } from './normalize'

export const HEALTH_SAMPLES_KEY = 'qimmah:health:samples:v1'

/** سقف العيّنات المحفوظة لكل مقياس (نافذة ٩٠ يومًا الافتراضية تبقى ضمنه بارتياح). */
export const SAMPLES_CAP_PER_METRIC = 2000

interface HealthSamplesEnvelope {
  version: 1
  metrics: Partial<Record<HealthMetric, NormalizedSample[]>>
  anchors: Partial<Record<HealthMetric, string>>
}

const EMPTY: HealthSamplesEnvelope = { version: 1, metrics: {}, anchors: {} }

function readEnvelope(): HealthSamplesEnvelope {
  if (typeof window === 'undefined') return { ...EMPTY, metrics: {}, anchors: {} }
  try {
    const raw = window.localStorage.getItem(HEALTH_SAMPLES_KEY)
    if (!raw) return { ...EMPTY, metrics: {}, anchors: {} }
    const parsed = JSON.parse(raw) as Partial<HealthSamplesEnvelope>
    return {
      version: 1,
      metrics: parsed.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {},
      anchors: parsed.anchors && typeof parsed.anchors === 'object' ? parsed.anchors : {},
    }
  } catch {
    return { ...EMPTY, metrics: {}, anchors: {} }
  }
}

function writeEnvelope(envelope: HealthSamplesEnvelope): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HEALTH_SAMPLES_KEY, JSON.stringify(envelope))
  } catch {
    /* تخزين ممتلئ — القراءة التالية من HealthKit تعوّض */
  }
}

/** يدمج عيّنات جديدة في متجر المقياس (تكرار يُسقَط) ويعيد عدد المخزون بعده. */
export function ingestSamples(metric: HealthMetric, samples: NormalizedSample[]): number {
  const envelope = readEnvelope()
  const merged = mergeSamples(envelope.metrics[metric] ?? [], samples, SAMPLES_CAP_PER_METRIC)
  envelope.metrics[metric] = merged
  writeEnvelope(envelope)
  return merged.length
}

/** عيّنات مقياس (الأحدث أولًا)، اختياريًا ضمن آخر `days` يومًا. */
export function samplesFor(metric: HealthMetric, options?: { days?: number }): NormalizedSample[] {
  const all = readEnvelope().metrics[metric] ?? []
  if (!options?.days) return all
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - options.days)
  const cutoffISO = cutoff.toISOString()
  return all.filter((sample) => sample.start >= cutoffISO)
}

/**
 * فصل المقياس = تطهير كل عيّناته المستوردة + مرساته (نمط التطهير الموسوم بالمصدر
 * نفسه المتّبع في وزن الصحة). المقاييس الأخرى لا تُمسّ.
 */
export function purgeMetricSamples(metric: HealthMetric): void {
  const envelope = readEnvelope()
  delete envelope.metrics[metric]
  delete envelope.anchors[metric]
  writeEnvelope(envelope)
}

/** مرساة الاستعلام التزايدي لمقياس، إن وُجدت. */
export function anchorFor(metric: HealthMetric): string | null {
  return readEnvelope().anchors[metric] ?? null
}

export function saveAnchor(metric: HealthMetric, anchor: string | null): void {
  const envelope = readEnvelope()
  if (anchor) envelope.anchors[metric] = anchor
  else delete envelope.anchors[metric]
  writeEnvelope(envelope)
}

/** إحصاء مخزون كل مقياس — للوحة الحالة في شاشة الإعدادات (عقد Codex). */
export function storedSampleCounts(): Partial<Record<HealthMetric, number>> {
  const envelope = readEnvelope()
  const out: Partial<Record<HealthMetric, number>> = {}
  for (const [metric, samples] of Object.entries(envelope.metrics)) {
    out[metric as HealthMetric] = samples?.length ?? 0
  }
  return out
}
