// Builds src/data/exerciseVideoRegistry.ts from the REVIEWED research record
// scripts/exercise/video-research.json.
//
// Why a two-file design (research record → generated registry), mirroring the image side's
// provenance-manifest.json → exerciseMediaManifest.generated.ts:
//   • the JSON carries the EVIDENCE (what was searched, what a fetch actually returned, when),
//     so a reviewer can re-check any claim without re-running the research;
//   • the TS is derived, never hand-edited, so the app can never drift from the evidence.
//
// HARD RULES enforced here (the build FAILS, it does not warn):
//   1. A non-null youtubeVideoId MUST carry verifiedTitle + verifiedAt + verificationEvidence.
//      An id nobody verified cannot reach the app. This is the anti-fabrication gate.
//   2. youtubeVideoId must match /^[A-Za-z0-9_-]{11}$/ — YouTube's actual id shape.
//   3. status APPROVED requires a non-null id AND matchConfidence 'high' | 'medium'.
//   4. Every exercise id in the record must exist in the catalog (no orphans).
//   5. No duplicate exercise ids, and a warning list for the same video reused across exercises.
//
// We store a REFERENCE only — id, canonical URL, channel, title. No video is downloaded,
// re-hosted, or embedded by this pipeline (charter §8 decision 8 / MEDIA-RIGHTS.md).
// Run: npm run build:exercise-video-registry

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')

const research = JSON.parse(readFileSync(resolve(here, 'video-research.json'), 'utf8'))

// Catalog ids straight from the coaching manifest (already the extracted catalog projection).
const catalog = JSON.parse(readFileSync(resolve(root, 'scripts/coaching/manifest.json'), 'utf8'))
const catalogIds = new Set(catalog.map((m) => m.id))

const ID_RE = /^[A-Za-z0-9_-]{11}$/
const VALID_STATUS = new Set(['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'MISSING'])
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', null])

const errors = []
const seen = new Set()
const byVideo = new Map()

for (const row of research.entries) {
  const where = `entry "${row.exerciseId}"`
  if (!catalogIds.has(row.exerciseId)) errors.push(`${where}: not a catalog exercise id (orphan)`)
  if (seen.has(row.exerciseId)) errors.push(`${where}: duplicate entry`)
  seen.add(row.exerciseId)

  if (!VALID_STATUS.has(row.status)) errors.push(`${where}: invalid status "${row.status}"`)
  if (!VALID_CONFIDENCE.has(row.matchConfidence ?? null)) errors.push(`${where}: invalid matchConfidence "${row.matchConfidence}"`)

  const id = row.youtubeVideoId ?? null
  if (id !== null) {
    if (!ID_RE.test(id)) errors.push(`${where}: youtubeVideoId "${id}" is not a valid 11-char YouTube id`)
    // ── the anti-fabrication gate ──
    if (!row.verifiedTitle) errors.push(`${where}: has a video id but no verifiedTitle — unverified ids must not ship`)
    if (!row.verifiedAt) errors.push(`${where}: has a video id but no verifiedAt`)
    if (!row.verificationEvidence) errors.push(`${where}: has a video id but no verificationEvidence`)
    if (row.canonicalUrl !== `https://www.youtube.com/watch?v=${id}`) {
      errors.push(`${where}: canonicalUrl does not match the video id`)
    }
    byVideo.set(id, [...(byVideo.get(id) ?? []), row.exerciseId])
  } else {
    if (row.status === 'APPROVED') errors.push(`${where}: status APPROVED with a null video id`)
    if (row.canonicalUrl) errors.push(`${where}: null video id must not carry a canonicalUrl`)
  }

  if (row.status === 'APPROVED') {
    if (id === null) errors.push(`${where}: APPROVED requires a verified video id`)
    if (!['high', 'medium'].includes(row.matchConfidence)) {
      errors.push(`${where}: APPROVED requires matchConfidence high|medium, got "${row.matchConfidence}"`)
    }
  }
}

const missing = [...catalogIds].filter((id) => !seen.has(id))

if (errors.length) {
  console.error('✗ video-research.json failed validation:')
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}

const reused = [...byVideo.entries()].filter(([, ids]) => ids.length > 1)

// Every catalog id gets a row; ids absent from the research record are honestly MISSING.
const registry = {}
for (const row of research.entries) {
  registry[row.exerciseId] = {
    exerciseId: row.exerciseId,
    youtubeVideoId: row.youtubeVideoId ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    channel: row.channel ?? null,
    videoTitle: row.verifiedTitle ?? null,
    matchConfidence: row.matchConfidence ?? null,
    status: row.status,
    verifiedAt: row.verifiedAt ?? null,
    notes: row.notes ?? '',
  }
}
for (const id of missing) {
  registry[id] = {
    exerciseId: id,
    youtubeVideoId: null,
    canonicalUrl: null,
    channel: null,
    videoTitle: null,
    matchConfidence: null,
    status: 'MISSING',
    verifiedAt: null,
    notes: 'No research record yet — not investigated.',
  }
}

const ordered = {}
for (const m of catalog) ordered[m.id] = registry[m.id]

const counts = Object.values(ordered).reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {})

const header = `// ⚙️ AUTO-GENERATED by scripts/exercise/build-video-registry.mjs — do not edit by hand.
// Source of truth (with evidence): scripts/exercise/video-research.json
// Regenerate: npm run build:exercise-video-registry · Guard: npm run test:exercise-production
//
// A REFERENCE registry, not media. Nothing here is downloaded, re-hosted or auto-played.
// Every non-null youtubeVideoId was fetched during research and returned the videoTitle
// recorded below; the build refuses any id that lacks that evidence.
//
// Coverage at generation time: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' · ')} (total ${catalog.length}).

/** Where a reference sits in review. APPROVED alone is safe to surface to a user. */
export type ExerciseVideoStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | 'MISSING'

/** How well the verified video matches this exact exercise. */
export type ExerciseVideoConfidence = 'high' | 'medium' | 'low'

export interface ExerciseVideoRef {
  exerciseId: string
  /** 11-char YouTube id, or null when nothing trustworthy was verified. */
  youtubeVideoId: string | null
  canonicalUrl: string | null
  channel: string | null
  /** The title the verification fetch actually returned — evidence, not a guess. */
  videoTitle: string | null
  matchConfidence: ExerciseVideoConfidence | null
  status: ExerciseVideoStatus
  /** ISO date the reference was verified. */
  verifiedAt: string | null
  notes: string
}

/** Count of references a user may be shown. */
export const VIDEO_APPROVED_COUNT = ${counts.APPROVED ?? 0}
/** Catalog total at generation time. */
export const VIDEO_CATALOG_TOTAL = ${catalog.length}

export const EXERCISE_VIDEO_REGISTRY: Record<string, ExerciseVideoRef> = ${JSON.stringify(ordered, null, 2)}
`

writeFileSync(resolve(root, 'src/data/exerciseVideoRegistry.ts'), header)
console.log(`wrote ${Object.keys(ordered).length} video refs → src/data/exerciseVideoRegistry.ts`)
console.log('  status:', JSON.stringify(counts))
if (missing.length) console.log(`  ${missing.length} catalog ids had no research record → MISSING`)
if (reused.length) {
  console.log(`  note: ${reused.length} video(s) referenced by more than one exercise:`)
  for (const [vid, ids] of reused) console.log(`    ${vid} → ${ids.join(', ')}`)
}
