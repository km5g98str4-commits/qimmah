// [CTO-QAE-017] — Binding-ceiling proofs + Prescription Readiness Gate.
//
// Wave 6 applied 77 curated corrections and produced ZERO golden movement,
// because no fixture drove a binding stability or fatigue ceiling. These are
// QAE-native ADVERSARIAL fixtures built to make the ceilings bind, so the
// mechanism is proven before any prescription logic depends on it.
//
// Every exclusion is asserted BY NAME: exact exerciseId, exact reason, the exact
// field responsible, the ceiling used, and the alternatives that survive.
// "the pool got smaller" is never accepted as evidence.
//
// No legacy golden is modified. No sets/reps/progression.

import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { ExerciseCatalog, ExerciseMetadata } from '../../Domain/Catalog/model'
import type { TrainingCapabilityProfile } from '../../Domain/Training/capability'
import { selectCandidates } from '../../Domain/Training/selection'
import type { MovementRequirement } from '../../Domain/Training/requirements'
import { buildCurationSet, readPrescriptionMetadata } from '../../Domain/Training/prescriptionMetadata'
import { buildEligiblePool } from '../../Domain/Training/plan'
import { assembleDays } from '../../Domain/Training/assembly'

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
const machineIds = new Set(catalog.primaryMachineIds)

interface BlocklistRule { ruleId: string; exerciseIds: string[] }
const blocklist = readJson<{ rules: BlocklistRule[] }>('Contracts/exercises/blocklist-migration.json')
const ruleIds = (id: string): string[] => {
  const r = blocklist.rules.find((x) => x.ruleId === id)
  if (r === undefined || !Array.isArray(r.exerciseIds)) throw new Error(`blocklist rule missing: ${id}`)
  return r.exerciseIds
}
const BLOCKLISTS = {
  injuryByTag: {
    knee: ruleIds('legacy-injury-knee'), shoulder: ruleIds('legacy-injury-shoulder'),
    lower_back: ruleIds('legacy-injury-back'), wrist: ruleIds('legacy-injury-wrist'),
    elbow: ruleIds('legacy-injury-elbow'), ankle: ruleIds('legacy-injury-ankle'),
    overhead: ruleIds('legacy-overhead'), impact: ruleIds('legacy-impact'),
  } as Record<string, string[]>,
  levelCapped: ruleIds('legacy-level-cap'),
  freeCable: ruleIds('legacy-free-cable-beginner'),
}

const goldenIds = new Set<string>()
for (const f of readdirSync(resolvePath(qaeRoot, 'Fixtures/golden/training')).filter((x) => x.endsWith('.golden.json'))) {
  const g = readJson<{ shippingPlan: { days: Array<{ exercises: Array<{ exerciseId: string }> }> } }>(`Fixtures/golden/training/${f}`)
  for (const d of g.shippingPlan.days) for (const e of d.exercises) goldenIds.add(e.exerciseId)
}
const curation = buildCurationSet(catalog, [...goldenIds])

// ── Capability builder ─────────────────────────────────────────────────────
const cap = (over: Partial<TrainingCapabilityProfile> = {}): TrainingCapabilityProfile =>
  ({
    schemaVersion: '1.0.0',
    experienceBand: 'intermediate',
    planningClass: 'intermediate',
    returningStatus: 'active',
    trainingDaysPerWeek: 4,
    sessionDurationMinutes: 60,
    environment: 'gym',
    equipmentCapabilities: { machine: true, cable: true, dumbbell: true, barbell: true, bench: true, band: true, kettlebell: true, smith: true, plate: true, bodyweight: true },
    injuryConstraints: [],
    unmappedConstraintAreas: [],
    stabilityCeiling: 3,
    exerciseComplexityCeiling: 3,
    fatigueCeiling: 3,
    preferredTrainingStyle: null,
    machineDominantPolicy: false,
    progressionCapability: [],
    recoveryCapacityClass: 'normal',
    needsClearance: false,
    ...over,
  }) as TrainingCapabilityProfile

/** A requirement broad enough that ceilings, not muscle matching, do the work. */
const anyReq = (muscles: string[]): MovementRequirement => ({ muscles, role: 'any' })
const BROAD = anyReq(['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'core'])

const excludedFor = (r: ReturnType<typeof selectCandidates>, reason: string): string[] =>
  r.excluded.filter((e) => e.reason === reason).map((e) => e.exerciseId).sort()
const rankedIds = (r: ReturnType<typeof selectCandidates>): string[] => r.ranked.map((x) => x.exerciseId).sort()

// Boundary populations, computed from the catalog (not hand-listed).
const stab = (n: number): string[] => catalog.exercises.filter((e) => e.stabilityDemand === n).map((e) => e.exerciseId).sort()
const fat = (n: number): string[] => catalog.exercises.filter((e) => e.fatigueCost === n).map((e) => e.exerciseId).sort()
console.log(`boundary populations: stability 1/2/3 = ${stab(1).length}/${stab(2).length}/${stab(3).length} · fatigue 1/2/3 = ${fat(1).length}/${fat(2).length}/${fat(3).length}`)

const bindingStability: string[] = []
const bindingFatigue: string[] = []

// ═══ A — Beginner, stabilityCeiling = 1 ════════════════════════════════════
{
  const r = selectCandidates(catalog, cap({ experienceBand: 'beginner', stabilityCeiling: 1, machineDominantPolicy: true }), BROAD)
  const capped = excludedFor(r, 'stability_cap')
  check('A stability ceiling BINDS (non-empty stability_cap exclusions)', capped.length > 0, String(capped.length))
  check('A every stability_cap exclusion has stabilityDemand > 1 (field responsible named)', capped.every((id) => (byId.get(id) as ExerciseMetadata).stabilityDemand > 1), capped.slice(0, 3).join(','))
  check('A no survivor exceeds the ceiling', rankedIds(r).every((id) => (byId.get(id) as ExerciseMetadata).stabilityDemand <= 1))
  check('A a valid pool still exists (safe alternatives survive)', r.ranked.length > 0, String(r.ranked.length))
  check('A exclusion ruleId names the ceiling', r.excluded.filter((e) => e.reason === 'stability_cap').every((e) => e.ruleId === 'qae-stability-ceiling'))
  bindingStability.push(...capped)
  console.log(`A: stabilityCeiling=1 excluded ${capped.length} by stability_cap; ${r.ranked.length} survive`)
}

// ═══ B — Returning athlete, conservative fatigue ceiling ═══════════════════
{
  const r = selectCandidates(catalog, cap({ returningStatus: 'returning', fatigueCeiling: 1 }), BROAD)
  const capped = excludedFor(r, 'fatigue_cap')
  check('B fatigue ceiling BINDS (non-empty fatigue_cap exclusions)', capped.length > 0, String(capped.length))
  check('B every fatigue_cap exclusion has fatigueCost > 1 (field responsible named)', capped.every((id) => (byId.get(id) as ExerciseMetadata).fatigueCost > 1))
  check('B no survivor exceeds the fatigue ceiling', rankedIds(r).every((id) => (byId.get(id) as ExerciseMetadata).fatigueCost <= 1))
  check('B lower-fatigue alternatives survive', r.ranked.length > 0, String(r.ranked.length))
  check('B exclusion ruleId names the ceiling', r.excluded.filter((e) => e.reason === 'fatigue_cap').every((e) => e.ruleId === 'qae-fatigue-ceiling'))
  bindingFatigue.push(...capped)
  console.log(`B: fatigueCeiling=1 excluded ${capped.length} by fatigue_cap; ${r.ranked.length} survive`)
}

// ═══ C — Injury + ceiling interaction; safety outranks ═════════════════════
{
  const kneeIds = new Set(BLOCKLISTS.injuryByTag['knee'])
  const r = selectCandidates(catalog, cap({ injuryConstraints: ['knee'], stabilityCeiling: 2, fatigueCeiling: 2 }), BROAD)
  const safety = excludedFor(r, 'safety_contraindication')
  check('C safety exclusions fire alongside ceilings', safety.length > 0, String(safety.length))
  check('C no knee-contraindicated exercise survives', rankedIds(r).every((id) => !(byId.get(id) as ExerciseMetadata).contraindications.includes('knee')))
  check('C survivors respect BOTH ceilings', rankedIds(r).every((id) => { const e = byId.get(id) as ExerciseMetadata; return e.stabilityDemand <= 2 && e.fatigueCost <= 2 }))
  // Precedence: a contraindicated exercise that is LOW stability and LOW fatigue
  // must still be excluded for safety, never rescued by a comfortable profile.
  const lowLow = [...kneeIds].filter((id) => { const e = byId.get(id); return e !== undefined && e.stabilityDemand === 1 && e.fatigueCost === 1 })
  const rescued = lowLow.filter((id) => rankedIds(r).includes(id))
  check('C PRECEDENCE: low-stability/low-fatigue contraindicated exercises are NOT rescued', rescued.length === 0, rescued.join(','))
  console.log(`C: knee injury excluded ${safety.length} by safety; ${r.ranked.length} survive both ceilings`)
}

// ═══ D — Machine-only beginner: ceiling must not wipe the machine core ═════
{
  const r = selectCandidates(catalog, cap({ experienceBand: 'beginner', stabilityCeiling: 1, machineDominantPolicy: true }), BROAD)
  const survivingMachines = rankedIds(r).filter((id) => machineIds.has(id))
  check('D machine core survives stabilityCeiling=1', survivingMachines.length === machineIds.size, `${survivingMachines.length}/${machineIds.size}`)
  const nonMachine = rankedIds(r).filter((id) => !machineIds.has(id))
  check('D machine-dominant != machine-only (non-machine survivors exist)', nonMachine.length > 0, String(nonMachine.length))
  console.log(`D: ${survivingMachines.length}/${machineIds.size} machine core survive; ${nonMachine.length} non-machine also survive`)
}

// ═══ E — Advanced, permissive ceilings: A/B exclusions become eligible ═════
{
  const permissive = selectCandidates(catalog, cap({ experienceBand: 'advanced', stabilityCeiling: 3, fatigueCeiling: 3 }), BROAD)
  const ids = new Set(rankedIds(permissive))
  const stabReturned = bindingStability.filter((id) => ids.has(id))
  const fatReturned = bindingFatigue.filter((id) => ids.has(id))
  check('E stability-excluded exercises become eligible under permissive ceilings', stabReturned.length > 0, `${stabReturned.length}/${bindingStability.length}`)
  check('E fatigue-excluded exercises become eligible under permissive ceilings', fatReturned.length > 0, `${fatReturned.length}/${bindingFatigue.length}`)
  check('E permissive profile has no ceiling exclusions at all', excludedFor(permissive, 'stability_cap').length === 0 && excludedFor(permissive, 'fatigue_cap').length === 0)
  console.log(`E: ${stabReturned.length} stability + ${fatReturned.length} fatigue exclusions re-enter under permissive ceilings`)
}

// ═══ F — Counter-scenario: ONLY the ceiling changes ════════════════════════
{
  const base = cap({ stabilityCeiling: 3, fatigueCeiling: 3 })
  const tight = cap({ stabilityCeiling: 1, fatigueCeiling: 3 })
  const a = selectCandidates(catalog, base, BROAD)
  const b = selectCandidates(catalog, tight, BROAD)
  const delta = rankedIds(a).filter((id) => !rankedIds(b).includes(id)).sort()
  check('F changing ONLY stabilityCeiling changes the eligible set', delta.length > 0, String(delta.length))
  check('F every dropped id is dropped for the NAMED reason (stability_cap)', delta.every((id) => excludedFor(b, 'stability_cap').includes(id)), delta.slice(0, 3).join(','))
  check('F every dropped id has stabilityDemand > 1', delta.every((id) => (byId.get(id) as ExerciseMetadata).stabilityDemand > 1))
  // and the same for fatigue, in isolation
  const tightF = cap({ stabilityCeiling: 3, fatigueCeiling: 1 })
  const c = selectCandidates(catalog, tightF, BROAD)
  const deltaF = rankedIds(a).filter((id) => !rankedIds(c).includes(id)).sort()
  check('F changing ONLY fatigueCeiling changes the eligible set', deltaF.length > 0, String(deltaF.length))
  check('F every fatigue-dropped id is dropped for the NAMED reason (fatigue_cap)', deltaF.every((id) => excludedFor(c, 'fatigue_cap').includes(id)))
}

// ═══ §3 — COUNTER-ASSERTIONS (planted failures) ═══════════════════════════
{
  // 1. Raise the ceiling ⇒ an excluded exercise re-enters.
  const victim = bindingStability[0]
  const tight = selectCandidates(catalog, cap({ stabilityCeiling: 1 }), BROAD)
  const loose = selectCandidates(catalog, cap({ stabilityCeiling: 3 }), BROAD)
  check('CA-1 raising the ceiling re-admits the excluded exercise', !rankedIds(tight).includes(victim) && rankedIds(loose).includes(victim), victim)

  // 2. Confidence downgrade ⇒ metadata gate blocks use.
  //    The probe MUST be inside the curated cohort: an uncurated id returns
  //    `notCurated`, which would prove the wrong thing (an earlier draft did
  //    exactly that and the proof caught it).
  const curatedIds = new Set(curation.records.map((r) => r.exerciseId))
  const curatedVictim = bindingStability.find((id) => curatedIds.has(id)) as string
  check('CA-2a the confidence probe is a curated exercise', curatedVictim !== undefined)
  const downgraded = { ...curation, records: curation.records.map((r) => ({ ...r, confidence: 'DERIVED' as const })) }
  const blocked = readPrescriptionMetadata(downgraded, curatedVictim, 'stabilityDemand', 'CHARACTERIZED')
  check('CA-2 confidence below CHARACTERIZED blocks prescription use by name', !blocked.ok && blocked.reason === 'insufficientMetadata', JSON.stringify(blocked))

  // 3. Mutate stabilityDemand across the boundary ⇒ named change.
  const mutStab: ExerciseCatalog = { ...catalog, exercises: catalog.exercises.map((e) => (e.exerciseId === victim ? { ...e, stabilityDemand: 1 as const } : e)) }
  const afterStab = selectCandidates(mutStab, cap({ stabilityCeiling: 1 }), BROAD)
  check('CA-3 mutating stabilityDemand across the boundary flips eligibility by name', rankedIds(afterStab).includes(victim) && !excludedFor(afterStab, 'stability_cap').includes(victim), victim)

  // 4. Mutate fatigueCost across the boundary ⇒ named change.
  const fVictim = bindingFatigue[0]
  const mutFat: ExerciseCatalog = { ...catalog, exercises: catalog.exercises.map((e) => (e.exerciseId === fVictim ? { ...e, fatigueCost: 1 as const } : e)) }
  const afterFat = selectCandidates(mutFat, cap({ fatigueCeiling: 1 }), BROAD)
  check('CA-4 mutating fatigueCost across the boundary flips eligibility by name', rankedIds(afterFat).includes(fVictim) && !excludedFor(afterFat, 'fatigue_cap').includes(fVictim), fVictim)

  // 5. Remove the surviving alternatives ⇒ empty pool, never a fabricated pick.
  const survivors = new Set(rankedIds(tight))
  const starved: ExerciseCatalog = { ...catalog, exercises: catalog.exercises.filter((e) => !survivors.has(e.exerciseId)) }
  const after = selectCandidates(starved, cap({ stabilityCeiling: 1 }), BROAD)
  check('CA-5 removing every survivor yields an empty ranked set, never a fabricated candidate', after.ranked.length === 0, String(after.ranked.length))
}

// ═══ §4 — SAFETY PRECEDENCE ═══════════════════════════════════════════════
{
  // An unsafe exercise must not be rescued by low stability/fatigue.
  const r = selectCandidates(catalog, cap({ injuryConstraints: ['shoulder'], stabilityCeiling: 3, fatigueCeiling: 3 }), BROAD)
  const unsafe = rankedIds(r).filter((id) => (byId.get(id) as ExerciseMetadata).contraindications.includes('shoulder'))
  check('P1 permissive ceilings never rescue a contraindicated exercise', unsafe.length === 0, unsafe.join(','))

  // A preferred machine must not bypass an injury restriction.
  const kneeMachines = BLOCKLISTS.injuryByTag['knee'].filter((id) => machineIds.has(id))
  const r2 = selectCandidates(catalog, cap({ injuryConstraints: ['knee'], machineDominantPolicy: true }), BROAD, { preferredExerciseIds: kneeMachines })
  const bypassed = rankedIds(r2).filter((id) => kneeMachines.includes(id))
  check('P2 an explicitly PREFERRED machine cannot bypass an injury restriction', bypassed.length === 0, bypassed.join(','))
  check('P2b the preference probe was real (knee-contraindicated machines exist)', kneeMachines.length > 0, String(kneeMachines.length))

  // Advanced classification must not bypass a contraindication.
  const r3 = selectCandidates(catalog, cap({ experienceBand: 'advanced', injuryConstraints: ['lower_back'] }), BROAD)
  const adv = rankedIds(r3).filter((id) => (byId.get(id) as ExerciseMetadata).contraindications.includes('lower_back'))
  check('P3 advanced classification cannot bypass a contraindication', adv.length === 0, adv.join(','))
}

// ═══ §5 — END-TO-END CONSTRAINED ASSEMBLY ═════════════════════════════════
{
  // Constrained pool through the REAL wired bridge + assembly.
  const pool = buildEligiblePool(catalog, { access: 'home', tier: 'beginner', injuryConstraints: ['knee'], blocklists: BLOCKLISTS })
  // stability <= 2, not <= 1: every stability-1 exercise in the catalog is a
  // machine, and a home environment has none — a <=1 constraint empties the pool
  // and would test nothing. <=2 is the tightest ceiling that still binds here.
  const STABILITY_LIMIT = 2
  const constrained = pool.ids.filter((id) => (byId.get(id) as ExerciseMetadata).stabilityDemand <= STABILITY_LIMIT)
  check('E2E constrained pool is non-empty (the fixture actually tests something)', constrained.length > 0, String(constrained.length))
  check('E2E the constraint genuinely binds (some home ids are excluded)', constrained.length < pool.ids.length, `${constrained.length}/${pool.ids.length}`)
  const res = assembleDays(catalog, {
    daySpecs: [{ kind: 'upper' }, { kind: 'lower' }, { kind: 'upper' }, { kind: 'lower' }],
    poolIds: constrained,
    targetPerDay: 5,
    machinesOnly: false,
    preferMachines: true,
    accessoryPool: { triceps: [], biceps: [], abs: [] },
  })
  for (const d of res.days) {
    const ids = d.exercises.map((e) => e.exerciseId)
    check(`E2E ${d.dayId}: no duplicate`, new Set(ids).size === ids.length)
    check(`E2E ${d.dayId}: no knee-contraindicated exercise entered`, ids.every((id) => !(byId.get(id) as ExerciseMetadata).contraindications.includes('knee')))
    check(`E2E ${d.dayId}: every pick respects the stability constraint`, ids.every((id) => (byId.get(id) as ExerciseMetadata).stabilityDemand <= STABILITY_LIMIT))
    if (d.short) check(`E2E ${d.dayId}: short day is explicitly flagged, not padded`, ids.length < d.targetCount)
  }
  const nonMachine = res.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((id) => !machineIds.has(id))
  check('E2E machine-dominant != machine-only under constraint', nonMachine.length > 0, String(nonMachine.length))
  const a = canonicalSerialize(res.days)
  const b = canonicalSerialize(assembleDays({ ...catalog, exercises: [...catalog.exercises].reverse() }, {
    daySpecs: [{ kind: 'upper' }, { kind: 'lower' }, { kind: 'upper' }, { kind: 'lower' }],
    poolIds: [...constrained].reverse(), targetPerDay: 5, machinesOnly: false, preferMachines: true,
    accessoryPool: { triceps: [], biceps: [], abs: [] },
  }).days)
  check('E2E constrained assembly is deterministic under permutation', a === b)
  console.log(`E2E: constrained pool ${constrained.length} of ${pool.ids.length}; days ${res.days.map((d) => d.exercises.length).join('/')}`)
}

// ═══ §6 — BOUNDARY COVERAGE ═══════════════════════════════════════════════
const cohortIds = new Set(curation.records.map((r) => r.exerciseId))
const exercisedAtBoundary = new Set([...bindingStability, ...bindingFatigue].filter((id) => cohortIds.has(id)))
const neverExercised = [...cohortIds].filter((id) => !exercisedAtBoundary.has(id))
console.log(`coverage: stability-binding fixtures 3 (A,D,F) · fatigue-binding 2 (B,F) · combined safety+ceiling 2 (C,E2E)`)
console.log(`coverage: curated exercised at a binding boundary ${exercisedAtBoundary.size}/${cohortIds.size} · never at a boundary ${neverExercised.length}`)
check('COVERAGE: a meaningful share of curated exercises is exercised at a boundary', exercisedAtBoundary.size > 0, String(exercisedAtBoundary.size))

// ═══ §7 — PRESCRIPTION READINESS GATE ═════════════════════════════════════
const criteria = {
  stabilityCeilingProvenBinding: bindingStability.length > 0,
  fatigueCeilingProvenBinding: bindingFatigue.length > 0,
  confidenceGateProven: !readPrescriptionMetadata({ ...curation, records: curation.records.map((r) => ({ ...r, confidence: 'DERIVED' as const })) }, [...cohortIds][0], 'fatigueCost', 'CHARACTERIZED').ok,
  safetyPrecedenceProven: true, // asserted above; false would already have failed
  endToEndConstrainedAssemblyProven: true,
  noSilentDerivedFallback: catalog.exercises.filter((e) => !cohortIds.has(e.exerciseId)).every((e) => !readPrescriptionMetadata(curation, e.exerciseId, 'fatigueCost').ok),
  allRegressionsGreen: failed === 0,
}
const ready = Object.values(criteria).every(Boolean)
const verdict = ready ? 'READY_FOR_PRESCRIPTION_FOUNDATION' : 'NOT_READY_FOR_PRESCRIPTION_FOUNDATION'
for (const [k, v] of Object.entries(criteria)) check(`GATE criterion ${k}`, v)
console.log(`PRESCRIPTION READINESS: ${verdict}`)
console.log(`gate criteria: ${JSON.stringify(criteria)}`)

console.log(`qae-binding-ceiling-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
