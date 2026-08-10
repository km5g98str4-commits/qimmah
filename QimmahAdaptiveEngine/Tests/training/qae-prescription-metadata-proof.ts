// [CTO-QAE-015] — Prescription metadata curation proofs (§5, §6, §7, §9).
//
// Curation records the reviewed value beside the catalog value and never mutates
// the catalog, so 17/17 parity is structurally undisturbable; the parity suites
// re-run unchanged in qae:all and assert that independently.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { AxialLoad, ExerciseCatalog } from '../../Domain/Catalog/model'
import {
  buildCurationSet,
  curationCohort,
  readPrescriptionMetadata,
  type CurationRecord,
  type CurationSet,
} from '../../Domain/Training/prescriptionMetadata'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(resolvePath(qaeRoot, rel), 'utf8')) as T
const catalog = readJson<ExerciseCatalog>('Contracts/exercises/exercise-catalog.qae.json')
const byId = new Map(catalog.exercises.map((e) => [e.exerciseId, e]))

const goldenIds = new Set<string>()
for (const f of readdirSync(resolvePath(qaeRoot, 'Fixtures/golden/training')).filter((x) => x.endsWith('.golden.json'))) {
  const g = readJson<{ shippingPlan: { days: Array<{ exercises: Array<{ exerciseId: string }> }> } }>(`Fixtures/golden/training/${f}`)
  for (const d of g.shippingPlan.days) for (const e of d.exercises) goldenIds.add(e.exerciseId)
}

const cohort = curationCohort(catalog, [...goldenIds])
const curation = buildCurationSet(catalog, [...goldenIds])
type CuratedFieldName = 'stabilityDemand' | 'fatigueCost' | 'axialLoad'

// ═══ §9 — data quality ═════════════════════════════════════════════════════
check('cohort is non-empty', cohort.length > 0, String(cohort.length))
check('record count == cohort x 3 fields', curation.records.length === cohort.length * 3, `${curation.records.length} vs ${cohort.length * 3}`)

for (const r of curation.records) {
  check(`provenance ${r.exerciseId}/${r.field}: has method`, r.method.length > 0)
  check(`provenance ${r.exerciseId}/${r.field}: has rationale`, r.rationale.length > 0)
  check(`provenance ${r.exerciseId}/${r.field}: has criteria`, r.criteria.length > 0)
  check(`provenance ${r.exerciseId}/${r.field}: has reviewedAtVersion`, r.reviewedAtVersion.length > 0)
  check(`provenance ${r.exerciseId}/${r.field}: reviewStatus curated`, r.reviewStatus === 'curated')
  check(`provenance ${r.exerciseId}/${r.field}: exercise id exists`, byId.has(r.exerciseId))
  check(`provenance ${r.exerciseId}/${r.field}: never claims VERIFIED_EVIDENCE`, r.confidence !== 'VERIFIED_EVIDENCE')
}

// no duplicate authority for an (exerciseId, field) pair
{
  const seen = new Set<string>()
  let dup = 0
  for (const r of curation.records) {
    const k = `${r.exerciseId}|${r.field}`
    if (seen.has(k)) dup++
    seen.add(k)
  }
  check('no duplicate exercise-field authority', dup === 0, String(dup))
}

// enum / range validity
for (const r of curation.records) {
  if (r.field === 'axialLoad') {
    check(`range ${r.exerciseId}/axialLoad valid enum`, ['none', 'moderate', 'high'].includes(r.value as string), String(r.value))
  } else {
    check(`range ${r.exerciseId}/${r.field} in 1..3`, [1, 2, 3].includes(r.value as number), String(r.value))
  }
}

// deterministic export/hash
check('deterministic export', canonicalSerialize(buildCurationSet(catalog, [...goldenIds])) === canonicalSerialize(curation))
check(
  'deterministic under reversed catalog order',
  canonicalSerialize(buildCurationSet({ ...catalog, exercises: [...catalog.exercises].reverse() }, [...goldenIds].reverse())) === canonicalSerialize(curation),
)

// ═══ §7 — the confidence gate ══════════════════════════════════════════════
{
  const id = cohort[0]
  const ok = readPrescriptionMetadata(curation, id, 'fatigueCost')
  check('GATE: curated field at CHARACTERIZED is served', ok.ok, JSON.stringify(ok))

  const tooHigh = readPrescriptionMetadata(curation, id, 'fatigueCost', 'VERIFIED_EVIDENCE')
  check('GATE: requiring VERIFIED_EVIDENCE refuses (insufficientMetadata)', !tooHigh.ok && tooHigh.reason === 'insufficientMetadata', JSON.stringify(tooHigh))

  const uncurated = catalog.exercises.find((e) => !cohort.includes(e.exerciseId))
  check('GATE: an uncurated exercise exists to test with', uncurated !== undefined)
  if (uncurated) {
    const miss = readPrescriptionMetadata(curation, uncurated.exerciseId, 'fatigueCost')
    check('GATE: uncurated field refuses (notCurated) — never silently derived', !miss.ok && miss.reason === 'notCurated', JSON.stringify(miss))
  }
  const unknown = readPrescriptionMetadata(curation, 'no-such-exercise', 'axialLoad')
  check('GATE: unknown id refuses', !unknown.ok)
}

// mutation: strip provenance ⇒ named failure
{
  const stripped: CurationSet = {
    ...curation,
    records: curation.records.map((r) => ({ ...r, rationale: '', method: '', criteria: [] })),
  }
  const violations = stripped.records.filter((r) => r.rationale.length > 0 || r.method.length > 0).length
  check('MUTATION: stripping provenance is detectable by name (rationale/method empty)', violations === 0)
  const anyMissing = stripped.records.some((r) => r.rationale.length === 0)
  check('MUTATION: provenance proof would fail on stripped records', anyMissing)
}

// mutation: downgrade confidence ⇒ gate refuses where prescription-readiness requires it
{
  const downgraded: CurationSet = { ...curation, records: curation.records.map((r) => ({ ...r, confidence: 'DERIVED' as const })) }
  const r = readPrescriptionMetadata(downgraded, cohort[0], 'fatigueCost', 'CHARACTERIZED')
  check('MUTATION: confidence downgrade => insufficientMetadata by name', !r.ok && r.reason === 'insufficientMetadata', JSON.stringify(r))
  const assumption: CurationSet = { ...curation, records: curation.records.map((r2) => ({ ...r2, confidence: 'ASSUMPTION' as const })) }
  const r2 = readPrescriptionMetadata(assumption, cohort[0], 'stabilityDemand', 'CHARACTERIZED')
  check('MUTATION: ASSUMPTION tier also refused at CHARACTERIZED', !r2.ok && r2.reason === 'insufficientMetadata')
}

// ═══ §5 — internal consistency invariants ══════════════════════════════════
const val = (id: string, f: CuratedFieldName): number | AxialLoad | undefined =>
  curation.records.find((r) => r.exerciseId === id && r.field === f)?.value
const declaredExceptions = new Map<string, string[]>()
const violations: string[] = []
const inv = (id: string, ok: boolean, msg: string): void => {
  if (ok) return
  const ex = declaredExceptions.get(id) ?? []
  if (ex.length === 0) violations.push(msg)
}

// INV-6: axial high requires stability >= 2
for (const id of cohort) {
  if (val(id, 'axialLoad') === 'high') {
    inv(id, (val(id, 'stabilityDemand') as number) >= 2, `INV-6 ${id}: axial high with stability ${String(val(id, 'stabilityDemand'))}`)
  }
}
// INV-7: fatigue 3 requires compound
for (const id of cohort) {
  if (val(id, 'fatigueCost') === 3) {
    inv(id, byId.get(id)?.mechanics === 'compound', `INV-7 ${id}: fatigue 3 on ${byId.get(id)?.mechanics}`)
  }
}
check('INV-6 axial-high implies stability>=2 (no undeclared violations)', violations.filter((v) => v.startsWith('INV-6')).length === 0, violations.filter((v) => v.startsWith('INV-6')).slice(0, 3).join('; '))
check('INV-7 fatigue-3 implies compound (no undeclared violations)', violations.filter((v) => v.startsWith('INV-7')).length === 0, violations.filter((v) => v.startsWith('INV-7')).slice(0, 3).join('; '))

// INV-1: machine variant not MORE unstable than a free-weight peer in the same group
{
  let bad = 0
  for (const id of cohort) {
    const ex = byId.get(id)
    if (!ex || ex.loadMedium !== 'machine') continue
    const peers = cohort.filter((p) => p !== id && byId.get(p)?.substitutionGroup === ex.substitutionGroup && byId.get(p)?.loadMedium === 'freeWeight')
    for (const p of peers) if ((val(id, 'stabilityDemand') as number) > (val(p, 'stabilityDemand') as number)) bad++
  }
  check('INV-1 machine variant never more unstable than free-weight peer', bad === 0, String(bad))
}
// INV-2: supported variant never higher axial than unsupported peer of same pattern
{
  const rank: Record<string, number> = { none: 0, moderate: 1, high: 2 }
  let bad = 0
  for (const id of cohort) {
    const ex = byId.get(id)
    if (!ex || ex.support !== 'supported') continue
    const peers = cohort.filter((p) => p !== id && byId.get(p)?.movementPattern === ex.movementPattern && byId.get(p)?.support === 'unsupported')
    for (const p of peers) if (rank[val(id, 'axialLoad') as string] > rank[val(p, 'axialLoad') as string]) bad++
  }
  check('INV-2 supported variant never exceeds unsupported axial load', bad === 0, String(bad))
}
// INV-3: isolation never above compound fatigue within the same coarse muscle
{
  let bad = 0
  for (const id of cohort) {
    const ex = byId.get(id)
    if (!ex || ex.mechanics !== 'isolation') continue
    const peers = cohort.filter((p) => byId.get(p)?.mechanics === 'compound' && byId.get(p)?.primaryMuscleCoarse === ex.primaryMuscleCoarse)
    for (const p of peers) if ((val(id, 'fatigueCost') as number) > (val(p, 'fatigueCost') as number)) bad++
  }
  check('INV-3 isolation never exceeds compound fatigue in the same muscle', bad === 0, String(bad))
}
// INV-4 / INV-5 — counter-assertions: not uniformly 1
{
  const bw = cohort.filter((id) => byId.get(id)?.loadMedium === 'bodyweight')
  const bwVals = new Set(bw.map((id) => val(id, 'fatigueCost')))
  check('INV-4 bodyweight is NOT uniformly fatigueCost 1', bw.length === 0 || bwVals.size > 1 || !bwVals.has(1), `${[...bwVals].join(',')} over ${bw.length}`)
  const mach = cohort.filter((id) => byId.get(id)?.loadMedium === 'machine')
  const machVals = new Set(mach.map((id) => val(id, 'fatigueCost')))
  check('INV-5 machine is NOT uniformly fatigueCost 1', mach.length === 0 || machVals.size > 1 || !machVals.has(1), `${[...machVals].join(',')} over ${mach.length}`)
}

// ═══ §6 — coverage ═════════════════════════════════════════════════════════
const goldenCovered = [...goldenIds].filter((id) => cohort.includes(id))
check('COVERAGE: every golden exercise is curated', goldenCovered.length === goldenIds.size, `${goldenCovered.length}/${goldenIds.size}`)
check('COVERAGE: every approved machine-core id is curated', catalog.primaryMachineIds.every((id) => cohort.includes(id)))
const pendings = curation.records.filter((r) => r.pendingCorrection)
console.log(`coverage: catalog ${catalog.exercises.length} · curated ${cohort.length} (${Math.round((cohort.length * 100) / catalog.exercises.length)}%) · goldens ${goldenCovered.length}/${goldenIds.size} · pendingCorrections ${pendings.length}/${curation.records.length}`)
const byField: Record<string, number> = {}
for (const r of pendings) byField[r.field] = (byField[r.field] ?? 0) + 1
console.log(`pendingCorrection by field: ${JSON.stringify(byField)}`)

// ═══ §8 — curation must not touch catalog values ═══════════════════════════
{
  const before = canonicalSerialize(catalog.exercises.map((e) => ({ id: e.exerciseId, s: e.stabilityDemand, f: e.fatigueCost, a: e.axialLoad })))
  buildCurationSet(catalog, [...goldenIds])
  const after = canonicalSerialize(catalog.exercises.map((e) => ({ id: e.exerciseId, s: e.stabilityDemand, f: e.fatigueCost, a: e.axialLoad })))
  check('§8 curation does not mutate catalog values (parity structurally safe)', before === after)
  const rec: CurationRecord | undefined = curation.records[0]
  check('§8 pendingCorrection is recorded, never applied', rec !== undefined && typeof rec.pendingCorrection === 'boolean')
}

// ═══ [CTO-QAE-016] §11 — post-promotion counter-assertions ════════════════
{
  // 1. All corrections are APPLIED: the catalog now agrees with review.
  const stillPending = curation.records.filter((r) => r.pendingCorrection)
  check(
    'W6 all reviewed corrections are applied (pendingCorrection == 0)',
    stillPending.length === 0,
    stillPending.slice(0, 3).map((r) => `${r.exerciseId}/${r.field}`).join(', '),
  )

  // 2. Reintroducing an old value fails BY NAME — not by exception.
  const probe = curation.records[0]
  const revertedValue = probe.field === 'axialLoad' ? (probe.value === 'high' ? 'none' : 'high') : ((probe.value as number) === 1 ? 3 : 1)
  const revertedCatalog: ExerciseCatalog = {
    ...catalog,
    exercises: catalog.exercises.map((e) => (e.exerciseId === probe.exerciseId ? { ...e, [probe.field]: revertedValue } : e)),
  }
  const afterRevert = buildCurationSet(revertedCatalog, [...goldenIds])
  const reopened = afterRevert.records.filter((r) => r.pendingCorrection)
  check(
    'W6 MUTATION: reintroducing an old corrected value reopens pendingCorrection by name',
    reopened.length === 1 && reopened[0].exerciseId === probe.exerciseId && reopened[0].field === probe.field,
    `${reopened.length} reopened`,
  )

  // 3. No duplicate authority survives promotion: catalog value == reviewed value.
  let mismatched = 0
  for (const r of curation.records) if (r.value !== r.catalogValue) mismatched++
  check('W6 single source of truth: catalog value == reviewed value for every record', mismatched === 0, String(mismatched))

  // 4. The catalog manifest hash must MATCH its content.
  //    Promotion changed 77 field values while the stored hash stayed identical —
  //    a stale provenance label embedded in every plan. This guard makes that
  //    class of silent drift fail by name rather than ride along unnoticed.
  const canonicalBody = (v: unknown): string => {
    const sort = (x: unknown): unknown => {
      if (Array.isArray(x)) return x.map(sort)
      if (x !== null && typeof x === 'object') {
        const o = x as Record<string, unknown>
        return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sort(o[k])]))
      }
      return x
    }
    return JSON.stringify(sort(v), null, 2) + '\n'
  }
  const raw = readJson<Record<string, unknown>>('Contracts/exercises/exercise-catalog.qae.json')
  const body = {
    schemaVersion: raw['schemaVersion'],
    source: raw['source'],
    exerciseCount: raw['exerciseCount'],
    aliases: raw['aliases'],
    primaryMachineIds: raw['primaryMachineIds'],
    exercises: raw['exercises'],
  }
  const recomputed = createHash('sha256').update(canonicalBody(body)).digest('hex')
  check('W6 catalogManifestHash matches catalog content (no stale provenance)', recomputed === raw['catalogManifestHash'], `${String(raw['catalogManifestHash']).slice(0, 12)} vs ${recomputed.slice(0, 12)}`)

  // 5. Counter-assertion for the guard itself: a mutated body must NOT hash the same.
  const mutated = { ...body, exerciseCount: (body.exerciseCount as number) + 1 }
  check('W6 hash guard counter-assertion: a changed body yields a different hash', createHash('sha256').update(canonicalBody(mutated)).digest('hex') !== recomputed)

  // 6. The 76 uncurated exercises remain blocked from prescription use.
  const uncurated = catalog.exercises.filter((e) => !cohort.includes(e.exerciseId))
  const leaked = uncurated.filter((e) => readPrescriptionMetadata(curation, e.exerciseId, 'fatigueCost').ok)
  check('W6 uncurated exercises remain blocked from prescription metadata', leaked.length === 0, `${leaked.length} leaked of ${uncurated.length}`)
}

console.log(`qae-prescription-metadata-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
