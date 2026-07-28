// واجهة كتالوج وسائط التمارين (P10) — طبقة مطبوعة فوق الملف المُولَّد
// exerciseMediaManifest.generated.ts: حلّ المعرّفات القديمة، زوج بداية/نهاية مركّب،
// وتحميل مسبق «للتمرين التالي فقط» (يفرضه npm run test:media-pipeline).
//
// مبدأ الأداء: لا تحميل جماعي أبدًا — التمرين التالي وحده يُسخَّن (إطاران فقط)،
// وأي استدعاء جديد يستبدل السابق فلا تنمو الذاكرة مع طول الجلسة.

import {
  exerciseMediaManifest,
  type ExerciseMediaAsset,
  type ExerciseMediaManifestEntry,
} from '@/data/exerciseMediaManifest.generated'
import { canonicalExerciseId } from '@/data/exercises'

export type { ExerciseMediaAsset, ExerciseMediaManifestEntry }

/** سجلّ التمرين من الكتالوج المُولَّد — يقبل المعرّفات القديمة ويحلّها للقانونية. */
export function getMediaManifestEntry(exerciseId: string): ExerciseMediaManifestEntry | undefined {
  return exerciseMediaManifest[exerciseId] ?? exerciseMediaManifest[canonicalExerciseId(exerciseId)]
}

/** زوج مركّب: إطار البداية + إطار النهاية معًا — العقد الذي تستهلكه واجهة التمرين. */
export interface ExerciseStillPair {
  start: ExerciseMediaAsset
  end: ExerciseMediaAsset
}

/**
 * يعيد زوج البداية/النهاية إذا كان للتمرين إطاران حقيقيان، وإلا null بصدق
 * (placeholder-only أو missing) — لا مسارات مُختلَقة أبدًا.
 */
export function exerciseStillPair(exerciseId: string): ExerciseStillPair | null {
  const entry = getMediaManifestEntry(exerciseId)
  if (!entry || entry.status !== 'stills' || !entry.stillStart || !entry.stillEnd) return null
  return { start: entry.stillStart, end: entry.stillEnd }
}

/** مصنع صور قابل للحقن للاختبار — الافتراضي Image الحقيقي في المتصفح. */
export interface PreloadDeps {
  createImage?: () => { src: string }
}

interface PreloadSlot {
  exerciseId: string
  images: { src: string }[]
}

// خانة واحدة فقط — «التالي فقط»: أي تحميل مسبق جديد يحرّر السابق.
let preloadSlot: PreloadSlot | null = null

/**
 * يسخّن وسائط «التمرين التالي» فقط: إطارا البداية/النهاية للتمرين المعطى — لا أكثر.
 * يعيد المسارات المحمَّلة (فارغة إذا لا وسائط للتمرين أو لا بيئة صور).
 * استدعاءٌ جديد يستبدل الخانة السابقة — الذاكرة محدودة بإطارين دائمًا.
 */
export function preloadNextExercise(exerciseId: string, deps: PreloadDeps = {}): string[] {
  const pair = exerciseStillPair(exerciseId)
  if (!pair) {
    preloadSlot = null
    return []
  }
  const createImage =
    deps.createImage ?? (typeof Image !== 'undefined' ? () => new Image() : undefined)
  if (!createImage) {
    preloadSlot = null
    return []
  }
  const paths = [pair.start.path, pair.end.path]
  const images = paths.map((path) => {
    const img = createImage()
    img.src = path
    return img
  })
  preloadSlot = { exerciseId: canonicalExerciseId(exerciseId), images }
  return paths
}

/** التمرين المُسخَّن حاليًا (إن وُجد) — للاختبار وأدوات التشخيص. */
export function getPreloadedExerciseId(): string | null {
  return preloadSlot?.exerciseId ?? null
}

/** عدد الصور المحجوزة في خانة التحميل المسبق — الحارس يتأكد أنها لا تتجاوز 2 أبدًا. */
export function preloadedImageCount(): number {
  return preloadSlot?.images.length ?? 0
}

/** تفريغ الخانة (عند إنهاء الجلسة) — يحرّر المراجع للمتصفح. */
export function clearPreloadedExercise(): void {
  preloadSlot = null
}
