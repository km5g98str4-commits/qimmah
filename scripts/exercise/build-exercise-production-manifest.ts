// Builds THE canonical, UI-facing exercise media manifest:
//   src/data/exerciseProductionManifest.generated.ts
//
// It COMPOSES the two evidence layers that already exist, rather than replacing either:
//   • images  ← src/data/exerciseMediaManifest.generated.ts (disk-derived: real files, real
//               pixel sizes, rights row per asset from scripts/media/provenance-manifest.json)
//   • video   ← src/data/exerciseVideoRegistry.ts (verified references, evidence in
//               scripts/exercise/video-research.json)
//
// Why compose instead of extend: the image manifest is generated FROM DISK by
// scripts/build-media-manifest.mjs and guarded by test:media-pipeline. Bolting video fields
// onto it would make one generator own two unrelated evidence chains. Composition keeps each
// layer's proof intact and still gives the UI ONE object to read — so no screen ever again
// reaches into exerciseMedia / exerciseGifs / machineImages / videoUrl separately.
//
// Status vocabulary (mission-mandated): APPROVED | NEEDS_REVIEW | REJECTED | MISSING
//   images: 'stills' → APPROVED · in-house movement illustration → APPROVED (an honest,
//           original vector that says it is a drawing) · 'placeholder-only' → APPROVED when an in-house diagram
//           exists (a deliberate, honest asset) · else MISSING. A placeholder-only card
//           WITHOUT a diagram is MISSING, never APPROVED: refusing a wrong photo is honest,
//           but it still leaves the user with nothing to look at.
//
// Run: npm run build:exercise-production-manifest
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { exercises } from '@/data/exercises'
import { exerciseMediaManifest } from '@/data/exerciseMediaManifest.generated'
import { EXERCISE_VIDEO_REGISTRY } from '@/data/exerciseVideoRegistry'
import { machineImages } from '@/data/machineImages'
import { exerciseIllustrations } from '@/data/exerciseIllustrations'

declare const __OUT_DIR__: string

const today = new Date().toISOString().slice(0, 10)
const diagrams = machineImages as Record<string, string>
const illustrations = exerciseIllustrations as Record<string, string>

interface ImageAsset {
  kind: 'stills' | 'diagram' | 'illustration'
  start: string
  end: string | null
}
interface Entry {
  exerciseId: string
  image: ImageAsset | null
  imageStatus: string
  imageSource: string | null
  imageLicense: string | null
  imageAttribution: string | null
  video: { youtubeVideoId: string; canonicalUrl: string; channel: string | null; title: string | null } | null
  videoStatus: string
  videoConfidence: string | null
  reviewedAt: string
  notes: string
}

const entries: Record<string, Entry> = {}

for (const ex of exercises) {
  const img = exerciseMediaManifest[ex.id]
  if (!img) throw new Error(`image manifest has no entry for catalog id "${ex.id}"`)
  const vid = EXERCISE_VIDEO_REGISTRY[ex.id]
  if (!vid) throw new Error(`video registry has no entry for catalog id "${ex.id}"`)

  const diagram = diagrams[ex.id] ?? null
  let imageStatus: string
  let image: ImageAsset | null
  let imageNote = ''

  if (img.status === 'stills' && img.stillStart) {
    imageStatus = 'APPROVED'
    image = { kind: 'stills', start: img.stillStart.path, end: img.stillEnd ? img.stillEnd.path : null }
  } else if (img.status === 'placeholder-only' && diagram) {
    imageStatus = 'APPROVED'
    image = { kind: 'diagram', start: diagram, end: null }
    imageNote = 'In-house vector diagram: this machine card deliberately refuses free-weight photography.'
  } else if (img.status === 'placeholder-only') {
    imageStatus = 'MISSING'
    image = null
    imageNote = 'Machine card with no in-house diagram yet — upstream photography was a mis-attribution and was withdrawn.'
  } else if (illustrations[ex.id]) {
    // لا لقطة مرخّصة لنمط الحركة هذا — رسم حركة داخلي أصلي يقول عن نفسه إنه رسم.
    imageStatus = 'APPROVED'
    image = { kind: 'illustration', start: illustrations[ex.id], end: null }
    imageNote = 'In-house vector movement illustration — no rights-cleared photography exists for this movement.'
  } else {
    imageStatus = 'MISSING'
    image = null
    imageNote = 'No rights-cleared visual matched this movement yet.'
  }

  entries[ex.id] = {
    exerciseId: ex.id,
    image,
    imageStatus,
    imageSource: image?.kind === 'illustration' ? 'qimmah-inhouse-illustration' : (img.source ?? null),
    imageLicense:
      image?.kind === 'illustration'
        ? 'In-house original vector illustration — Qimmah owns full rights'
        : (img.license ?? null),
    imageAttribution: img.attribution ?? null,
    video:
      vid.youtubeVideoId && vid.canonicalUrl
        ? { youtubeVideoId: vid.youtubeVideoId, canonicalUrl: vid.canonicalUrl, channel: vid.channel, title: vid.videoTitle }
        : null,
    videoStatus: vid.status,
    videoConfidence: vid.matchConfidence,
    reviewedAt: vid.verifiedAt ?? today,
    notes: [imageNote, vid.notes].filter(Boolean).join(' | '),
  }
}

const all = Object.values(entries)
const n = (pred: (e: Entry) => boolean) => all.filter(pred).length
const imgApproved = n((e) => e.imageStatus === 'APPROVED')
const imgMissing = n((e) => e.imageStatus === 'MISSING')
const vidApproved = n((e) => e.videoStatus === 'APPROVED')
const vidReview = n((e) => e.videoStatus === 'NEEDS_REVIEW')
const vidMissing = n((e) => e.videoStatus === 'MISSING')
const gapList = all.filter((e) => e.imageStatus === 'MISSING').map((e) => e.exerciseId)

const header = `// ⚙️ AUTO-GENERATED by scripts/exercise/build-exercise-production-manifest.ts — do not edit by hand.
// Regenerate: npm run build:exercise-production-manifest · Guard: npm run test:exercise-production
//
// THE canonical, UI-facing media manifest. Screens read THIS through
// src/lib/exerciseProductionMedia.ts — not exerciseMedia / exerciseGifs / machineImages /
// Exercise.videoUrl. It composes two evidence layers:
//   images → exerciseMediaManifest.generated.ts (disk-derived + rights row per asset)
//   video  → exerciseVideoRegistry.ts (verified references; evidence in
//            scripts/exercise/video-research.json)
//
// Honesty: a status is never optimistic. MISSING means the user gets an honest empty state,
// not a wrong picture. NEEDS_REVIEW never reaches a user surface.
//
// Coverage at generation time — images APPROVED ${imgApproved}/${exercises.length} · MISSING ${imgMissing}
//                              video  APPROVED ${vidApproved}/${exercises.length} · NEEDS_REVIEW ${vidReview} · MISSING ${vidMissing}

/** Review state of one asset. Only APPROVED may be shown to a user. */
export type ExerciseAssetStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | 'MISSING'

/**
 * A still pair (start/end frames of the movement) or a single in-house machine diagram.
 * \`end\` is null for diagrams and for movements with only one usable frame — the UI must
 * not imply motion it does not have.
 */
export interface ExerciseImageAsset {
  kind: 'stills' | 'diagram' | 'illustration'
  start: string
  end: string | null
}

/** A reference to an instructional video. Never downloaded, never re-hosted, never auto-played. */
export interface ExerciseVideoAsset {
  youtubeVideoId: string
  canonicalUrl: string
  channel: string | null
  /** The title the verification fetch returned. Review metadata — NOT UI copy. */
  title: string | null
}

export interface ExerciseProductionEntry {
  exerciseId: string
  image: ExerciseImageAsset | null
  imageStatus: ExerciseAssetStatus
  imageSource: string | null
  imageLicense: string | null
  imageAttribution: string | null
  video: ExerciseVideoAsset | null
  videoStatus: ExerciseAssetStatus
  videoConfidence: 'high' | 'medium' | 'low' | null
  reviewedAt: string
  notes: string
}

/** Exercises a user may be shown a picture for. */
export const PRODUCTION_IMAGE_APPROVED = ${imgApproved}
/** Exercises with no visual asset of any kind — the real image gap. */
export const PRODUCTION_IMAGE_MISSING = ${imgMissing}
/** Exercises a user may be shown a video reference for. */
export const PRODUCTION_VIDEO_APPROVED = ${vidApproved}
/** Catalog total at generation time. */
export const PRODUCTION_CATALOG_TOTAL = ${exercises.length}

/** The exact image gap — every id with no approved visual. Drives the generation spec. */
export const PRODUCTION_IMAGE_GAP_IDS: readonly string[] = ${JSON.stringify(gapList, null, 2)}

export const EXERCISE_PRODUCTION_MANIFEST: Record<string, ExerciseProductionEntry> = ${JSON.stringify(entries, null, 2)}
`

writeFileSync(resolve(__OUT_DIR__, 'src/data/exerciseProductionManifest.generated.ts'), header)
console.log(`wrote ${all.length} entries → src/data/exerciseProductionManifest.generated.ts`)
console.log(`  images: APPROVED ${imgApproved} · MISSING ${imgMissing}`)
console.log(`  video : APPROVED ${vidApproved} · NEEDS_REVIEW ${vidReview} · MISSING ${vidMissing}`)
