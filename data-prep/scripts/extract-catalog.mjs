#!/usr/bin/env node
// Extracts the REAL Qimmah exercise catalog (no regex guessing): bundles the
// project's own TypeScript modules with esbuild and evaluates them, so every id,
// name, muscle map, ordering rank and media status comes from the source of truth.
//
// Output: data-prep/exercise/catalog-snapshot.json
// Re-run: node data-prep/scripts/extract-catalog.mjs

import { build } from 'esbuild'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '../..')
const SRC = join(ROOT, 'src')
const OUT = join(ROOT, 'data-prep/exercise/catalog-snapshot.json')

const ENTRY = `
import { exercises, getExercise, canonicalExerciseId } from '@/data/exercises'
import { machineCatalog } from '@/data/machineCatalog'
import { machineAlternatives } from '@/data/machineAlternatives'
import { exerciseMediaManifest } from '@/data/exerciseMediaManifest.generated'
import { exerciseOrderRank, isDayOrdered, orderDayExerciseIds, isCompoundExercise } from '@/lib/workoutOrder'
import { workoutTemplates } from '@/data/workoutTemplates'

const out = {
  exercises: exercises.map((e) => ({
    id: e.id, nameAr: e.nameAr, nameEn: e.nameEn,
    primaryMuscle: e.primaryMuscle, secondaryMuscles: e.secondaryMuscles,
    primaryMusclesDetailed: e.primaryMusclesDetailed,
    secondaryMusclesDetailed: e.secondaryMusclesDetailed,
    equipment: e.equipment, level: e.level, movementPattern: e.movementPattern,
    environment: e.environment,
    defaultSets: e.defaultSets, defaultReps: e.defaultReps, defaultRestSec: e.defaultRestSec,
    videoUrl: e.videoUrl, videoSource: e.videoSource,
    alternatives: e.alternatives,
    techniqueTipsAr: e.techniqueTipsAr, commonMistakesAr: e.commonMistakesAr,
    safetyNotesAr: e.safetyNotesAr,
    howToEn: e.howToEn ?? null, commonMistakesEn: e.commonMistakesEn ?? null,
    orderRank: exerciseOrderRank(e.id),
    isCompound: isCompoundExercise(e.id),
  })),
  machineCatalog: machineCatalog.map((g) => ({
    key: g.key, titleEn: g.titleEn, titleAr: g.titleAr,
    items: g.items.map((i) => ({
      exerciseId: i.exerciseId, nameEn: i.nameEn, nameAr: i.nameAr,
      targetMuscleAr: i.targetMuscleAr, subGroup: i.subGroup,
      aliasesEn: i.aliasesEn ?? null, sharedGroups: i.sharedGroups ?? null,
    })),
  })),
  machineAlternatives,
  mediaManifest: exerciseMediaManifest,
  existingTemplates: workoutTemplates.map((t) => ({
    id: t.id, nameEn: t.nameEn,
    days: t.days.map((d) => ({ id: d.id, nameEn: d.nameEn, exerciseIds: d.exerciseIds, ordered: isDayOrdered(d.exerciseIds) })),
  })),
}
console.log(JSON.stringify(out))
`

const dir = mkdtempSync(join(tmpdir(), 'qim-catalog-'))
const entryPath = join(dir, 'entry.ts')
writeFileSync(entryPath, ENTRY)
const bundlePath = join(dir, 'bundle.mjs')

await build({
  entryPoints: [entryPath],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundlePath,
  alias: { '@': SRC },
  logLevel: 'error',
})

const json = execFileSync(process.execPath, [bundlePath], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
mkdirSync(join(ROOT, 'data-prep/exercise'), { recursive: true })
const parsed = JSON.parse(json)
writeFileSync(OUT, JSON.stringify(parsed, null, 2))
console.error(`catalog-snapshot.json written: ${parsed.exercises.length} exercises, ${parsed.machineCatalog.length} catalog groups, ${Object.keys(parsed.mediaManifest).length} media entries`)
void pathToFileURL
