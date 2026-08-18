// Exercise metadata completeness audit — the real per-exercise table, not a summary.
//
// Emits two artefacts under docs/execution/qimmah-postweb/exercise/:
//   metadata-audit.tsv   — one row per catalog exercise, every audited field
//   metadata-audit.json  — the same data plus roll-up counters, for the proof + report
//
// This script REPORTS; it never mutates catalog data. It is the evidence base for
// EXERCISE-PRODUCTION-REPORT.md — every count in that report comes from here.
// Run: npm run audit:exercise-metadata
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { exercises, exerciseMap, LEGACY_EXERCISE_ID_MAP, PLACEHOLDER_ONLY_EXERCISE_IDS, isPlaceholderOnlyMedia, canonicalExerciseId } from '@/data/exercises'
import { exerciseMedia, getExerciseMedia } from '@/data/exerciseMedia'
import { exerciseMediaManifest } from '@/data/exerciseMediaManifest.generated'
import { machineImages } from '@/data/machineImages'
import { EXERCISE_CUES } from '@/data/coaching/exerciseCues.generated'
import { EXERCISE_CUES_EN } from '@/data/coaching/exerciseCuesEn.generated'
import { EXERCISE_VIDEO_REGISTRY } from '@/data/exerciseVideoRegistry'

declare const __OUT_DIR__: string

const nonEmpty = (a?: readonly unknown[]): boolean => Array.isArray(a) && a.length > 0

export interface AuditRow {
  id: string
  nameAr: string
  nameEn: string
  primaryMuscle: string
  primaryDetailed: string
  secondaryDetailed: string
  equipment: string
  movementPattern: string
  level: string
  environment: string
  stepsAr: number
  stepsEn: number
  mistakesAr: number
  mistakesEn: number
  safetyAr: number
  safetyEn: number
  tipsAr: number
  alternatives: number
  imageStatus: string
  hasMachineSvg: boolean
  imageLicense: string
  videoStatus: string
  videoConfidence: string
}

const rows: AuditRow[] = exercises.map((e) => {
  const manifest = exerciseMediaManifest[e.id]
  const cueAr = EXERCISE_CUES[e.id]
  const cueEn = EXERCISE_CUES_EN[e.id]
  const video = EXERCISE_VIDEO_REGISTRY[e.id]
  return {
    id: e.id,
    nameAr: e.nameAr,
    nameEn: e.nameEn,
    primaryMuscle: e.primaryMuscle,
    primaryDetailed: e.primaryMusclesDetailed.join('|'),
    secondaryDetailed: e.secondaryMusclesDetailed.join('|'),
    equipment: e.equipment.join('|'),
    movementPattern: e.movementPattern,
    level: e.level,
    environment: e.environment,
    stepsAr: cueAr ? cueAr.steps.length : 0,
    stepsEn: cueEn ? cueEn.steps.length : 0,
    mistakesAr: cueAr ? cueAr.mistakes.length : 0,
    mistakesEn: cueEn ? cueEn.mistakes.length : 0,
    safetyAr: cueAr && cueAr.safety ? 1 : 0,
    safetyEn: cueEn && cueEn.safety ? 1 : 0,
    tipsAr: e.techniqueTipsAr.length,
    alternatives: e.alternatives.length,
    imageStatus: manifest ? manifest.status : 'NO-ENTRY',
    hasMachineSvg: Boolean((machineImages as Record<string, string>)[e.id]),
    imageLicense: manifest?.license ?? '',
    videoStatus: video ? video.status : 'MISSING',
    videoConfidence: video?.matchConfidence ?? '',
  }
})

// ── roll-ups ────────────────────────────────────────────────────────────────
const idList = exercises.map((e) => e.id)
const dup = (xs: string[]): string[] => xs.filter((v, i, a) => a.indexOf(v) !== i)

/** Exercises with NO visual asset of any kind: no still pair AND no in-house machine SVG. */
const noVisualAtAll = rows.filter((r) => r.imageStatus !== 'stills' && !r.hasMachineSvg).map((r) => r.id)

/** Placeholder-only cards that the library GRID would still paint with a free-weight photo. */
const gridPlaceholderLeak = exercises
  .filter((e) => isPlaceholderOnlyMedia(e.id) && Boolean(getExerciseMedia(e.id)))
  .map((e) => ({ id: e.id, wouldRender: getExerciseMedia(e.id)?.img0 ?? '', upstream: getExerciseMedia(e.id)?.img0Remote ?? '' }))

const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  catalogTotal: exercises.length,
  uniqueIds: new Set(idList).size,
  duplicateIds: dup(idList),
  duplicateNamesAr: dup(exercises.map((e) => e.nameAr)),
  duplicateNamesEn: dup(exercises.map((e) => e.nameEn)),

  // metadata completeness
  missingNameAr: exercises.filter((e) => !e.nameAr.trim()).map((e) => e.id),
  missingNameEn: exercises.filter((e) => !e.nameEn.trim()).map((e) => e.id),
  missingEquipment: exercises.filter((e) => !nonEmpty(e.equipment)).map((e) => e.id),
  missingPrimaryDetailed: exercises.filter((e) => !nonEmpty(e.primaryMusclesDetailed)).map((e) => e.id),
  withSecondaryDetailed: exercises.filter((e) => nonEmpty(e.secondaryMusclesDetailed)).length,
  withExplicitAlternatives: exercises.filter((e) => nonEmpty(e.alternatives)).length,
  brokenAlternatives: exercises.flatMap((e) =>
    e.alternatives.filter((a) => !exerciseMap[a] && !LEGACY_EXERCISE_ID_MAP[a]).map((a) => `${e.id} -> ${a}`),
  ),

  // coaching content
  cuesAr: Object.keys(EXERCISE_CUES).length,
  cuesEn: Object.keys(EXERCISE_CUES_EN).length,
  cuesArMissing: exercises.filter((e) => !EXERCISE_CUES[e.id]).map((e) => e.id),
  cuesEnMissing: exercises.filter((e) => !EXERCISE_CUES_EN[e.id]).map((e) => e.id),
  cuesArOrphan: Object.keys(EXERCISE_CUES).filter((id) => !exerciseMap[id]),
  cuesEnOrphan: Object.keys(EXERCISE_CUES_EN).filter((id) => !exerciseMap[id]),
  stepCountParityBreaks: rows.filter((r) => r.stepsAr !== r.stepsEn).map((r) => r.id),
  stepsOutOfBand: rows.filter((r) => r.stepsAr < 3 || r.stepsAr > 7 || r.stepsEn < 3 || r.stepsEn > 7).map((r) => r.id),
  mistakesOutOfBand: rows.filter((r) => r.mistakesAr < 2 || r.mistakesAr > 5 || r.mistakesEn < 2 || r.mistakesEn > 5).map((r) => r.id),

  // media — images
  imageStills: rows.filter((r) => r.imageStatus === 'stills').length,
  imagePlaceholderOnly: rows.filter((r) => r.imageStatus === 'placeholder-only').length,
  imageMissing: rows.filter((r) => r.imageStatus === 'missing').length,
  machineSvgCount: Object.keys(machineImages as Record<string, string>).length,
  noVisualAtAll,
  noVisualAtAllCount: noVisualAtAll.length,
  placeholderOnlyDeclared: PLACEHOLDER_ONLY_EXERCISE_IDS.length,
  placeholderOnlyWithoutSvg: PLACEHOLDER_ONLY_EXERCISE_IDS.filter((id) => !(machineImages as Record<string, string>)[id]),
  gridPlaceholderLeak,
  stillsWithoutLicense: rows.filter((r) => r.imageStatus === 'stills' && !r.imageLicense).map((r) => r.id),
  exerciseMediaKeys: Object.keys(exerciseMedia).length,
  exerciseMediaOrphans: Object.keys(exerciseMedia).filter((id) => !exerciseMap[id] && !LEGACY_EXERCISE_ID_MAP[id]),
  manifestOrphans: Object.keys(exerciseMediaManifest).filter((id) => !exerciseMap[id]),

  // media — video
  videoApproved: rows.filter((r) => r.videoStatus === 'APPROVED').length,
  videoNeedsReview: rows.filter((r) => r.videoStatus === 'NEEDS_REVIEW').length,
  videoRejected: rows.filter((r) => r.videoStatus === 'REJECTED').length,
  videoMissing: rows.filter((r) => r.videoStatus === 'MISSING').length,
  videoRegistryOrphans: Object.keys(EXERCISE_VIDEO_REGISTRY).filter((id) => !exerciseMap[id]),

  // legacy catalog aliasing
  legacyAliases: Object.keys(LEGACY_EXERCISE_ID_MAP).length,
  legacyAliasesResolving: Object.entries(LEGACY_EXERCISE_ID_MAP).filter(([, to]) => Boolean(exerciseMap[to])).length,
  canonicalSelfCheck: exercises.filter((e) => canonicalExerciseId(e.id) !== e.id).map((e) => e.id),
}

const headers: (keyof AuditRow)[] = [
  'id', 'nameAr', 'nameEn', 'primaryMuscle', 'primaryDetailed', 'secondaryDetailed', 'equipment',
  'movementPattern', 'level', 'environment', 'stepsAr', 'stepsEn', 'mistakesAr', 'mistakesEn',
  'safetyAr', 'safetyEn', 'tipsAr', 'alternatives', 'imageStatus', 'hasMachineSvg', 'imageLicense',
  'videoStatus', 'videoConfidence',
]
const tsv = [headers.join('\t'), ...rows.map((r) => headers.map((h) => String(r[h])).join('\t'))].join('\n')

const outDir = resolve(__OUT_DIR__, 'docs/execution/qimmah-postweb/exercise')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'metadata-audit.tsv'), tsv + '\n')
writeFileSync(resolve(outDir, 'metadata-audit.json'), JSON.stringify({ summary, rows }, null, 2) + '\n')

console.log(JSON.stringify(summary, null, 2))
console.log(`\nwrote ${rows.length} rows → docs/execution/qimmah-postweb/exercise/metadata-audit.{tsv,json}`)
