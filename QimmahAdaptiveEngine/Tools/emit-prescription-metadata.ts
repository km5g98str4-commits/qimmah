// [CTO-QAE-015] Emits Contracts/exercises/prescription-metadata.curation.json.
//
// The curation set is COMPUTED deterministically from the catalog by the named
// criteria in Domain/Training/prescriptionMetadata.ts, then written out so the
// records are reviewable and diffable. Re-running must be a no-op — the proof
// asserts deterministic export.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../Domain/Shared/canonical'
import type { ExerciseCatalog } from '../Domain/Catalog/model'
import { buildCurationSet } from '../Domain/Training/prescriptionMetadata'

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(resolvePath(qaeRoot, rel), 'utf8')) as T

const catalog = readJson<ExerciseCatalog>('Contracts/exercises/exercise-catalog.qae.json')
const goldenIds = new Set<string>()
for (const f of readdirSync(resolvePath(qaeRoot, 'Fixtures/golden/training')).filter((x) => x.endsWith('.golden.json'))) {
  const g = readJson<{ shippingPlan: { days: Array<{ exercises: Array<{ exerciseId: string }> }> } }>(`Fixtures/golden/training/${f}`)
  for (const d of g.shippingPlan.days) for (const e of d.exercises) goldenIds.add(e.exerciseId)
}

const curation = buildCurationSet(catalog, [...goldenIds])
const out = {
  $comment:
    '[CTO-QAE-015] Per-field prescription metadata curation. Catalog values are NOT mutated: each record carries the reviewed value beside catalogValue, and a disagreement is a pendingCorrection that does not feed selection or assembly. Scales, criteria and permitted uses: Docs/QAE-PRESCRIPTION-METADATA-SCALES.md. Every record is CHARACTERIZED at best — none claims VERIFIED_EVIDENCE.',
  ...curation,
}
const path = resolvePath(qaeRoot, 'Contracts/exercises/prescription-metadata.curation.json')
writeFileSync(path, canonicalSerialize(out) + '\n')
console.log(`prescription-metadata: ${curation.records.length} records over ${curation.cohortSize} exercises -> ${path}`)
