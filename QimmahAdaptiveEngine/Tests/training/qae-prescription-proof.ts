// [CTO-QAE-018] — First-plan prescription proof (§13, §14).
//
// QAE-native prescription fixtures. The 17 legacy assembly goldens are NOT
// touched: they cover split/choice/order/optional and remain byte-identical,
// asserted by their own suites. Prescription is a QAE extension with no legacy
// oracle, so no legacy prescription parity is claimed.

import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { ExerciseCatalog } from '../../Domain/Catalog/model'
import type { TrainingCapabilityProfile } from '../../Domain/Training/capability'
import { assembleDays, type ExpTier } from '../../Domain/Training/assembly'
import { buildEligiblePool, type GymAccess } from '../../Domain/Training/plan'
import { buildCurationSet } from '../../Domain/Training/prescriptionMetadata'
import { prescribeInitialPlan, type PrescriptionResult } from '../../Domain/Training/prescription'
import { PRESCRIPTION_POLICY, policy, policyEntry } from '../../Domain/Training/prescriptionPolicy'

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

const cap = (over: Partial<TrainingCapabilityProfile> = {}): TrainingCapabilityProfile =>
  ({
    schemaVersion: '1.0.0', experienceBand: 'intermediate', planningClass: 'intermediate',
    returningStatus: 'active', trainingDaysPerWeek: 4, sessionDurationMinutes: 60, environment: 'gym',
    equipmentCapabilities: {}, injuryConstraints: [], unmappedConstraintAreas: [],
    stabilityCeiling: 3, exerciseComplexityCeiling: 3, fatigueCeiling: 3,
    preferredTrainingStyle: null, machineDominantPolicy: false, progressionCapability: [],
    recoveryCapacityClass: 'normal', needsClearance: false, ...over,
  }) as TrainingCapabilityProfile

interface Fixture {
  name: string
  access: GymAccess
  tier: ExpTier
  capability: TrainingCapabilityProfile
  injuries?: string[]
  isMinor?: boolean
  targetPerDay?: number
}

const FIXTURES: Fixture[] = [
  { name: 'A beginner-full-gym', access: 'full', tier: 'beginner', capability: cap({ experienceBand: 'beginner', machineDominantPolicy: true }) },
  { name: 'B beginner-home', access: 'home', tier: 'beginner', capability: cap({ experienceBand: 'beginner', machineDominantPolicy: true }) },
  { name: 'C machine-only-beginner', access: 'small', tier: 'beginner', capability: cap({ experienceBand: 'beginner', machineDominantPolicy: true }) },
  { name: 'D intermediate', access: 'full', tier: 'intermediate', capability: cap() },
  { name: 'E advanced', access: 'full', tier: 'advanced', capability: cap({ experienceBand: 'advanced' }) },
  { name: 'F returning-conservative', access: 'full', tier: 'intermediate', capability: cap({ returningStatus: 'returning' }) },
  { name: 'G knee-restriction', access: 'full', tier: 'intermediate', capability: cap({ injuryConstraints: ['knee'] }), injuries: ['knee'] },
  { name: 'H back-restriction', access: 'full', tier: 'intermediate', capability: cap({ injuryConstraints: ['lower_back'] }), injuries: ['lower_back'] },
  { name: 'I short-session', access: 'full', tier: 'intermediate', capability: cap({ sessionDurationMinutes: 30 }), targetPerDay: 4 },
  { name: 'J long-session', access: 'full', tier: 'intermediate', capability: cap({ sessionDurationMinutes: 90 }), targetPerDay: 8 },
  { name: 'K uncurated-metadata', access: 'home', tier: 'advanced', capability: cap({ experienceBand: 'advanced' }) },
  { name: 'L minor-safety', access: 'full', tier: 'beginner', capability: cap({ experienceBand: 'beginner', machineDominantPolicy: true }), isMinor: true },
]

function run(f: Fixture): PrescriptionResult {
  const pool = buildEligiblePool(catalog, {
    access: f.access, tier: f.tier,
    injuryConstraints: (f.injuries ?? []) as never[], blocklists: BLOCKLISTS,
  })
  const assembled = assembleDays(catalog, {
    daySpecs: [{ kind: 'upper' }, { kind: 'lower' }, { kind: 'upper' }, { kind: 'lower' }],
    poolIds: pool.ids, targetPerDay: f.targetPerDay ?? 6,
    machinesOnly: pool.machinesOnly, preferMachines: pool.preferMachines,
    accessoryPool: { triceps: [], biceps: [], abs: [] },
  })
  return prescribeInitialPlan({
    catalog, capability: f.capability, tier: f.tier, curation,
    days: assembled.days, isMinor: f.isMinor === true,
  })
}

// ═══ Fixtures + contract invariants ════════════════════════════════════════
const results = new Map<string, PrescriptionResult>()
for (const f of FIXTURES) {
  const r = run(f)
  results.set(f.name, r)
  check(`${f.name}: produces days`, r.days.length > 0, String(r.days.length))
  check(`${f.name}: policy version stamped`, r.policyVersion.length > 0)
  for (const d of r.days) {
    for (const s of d.slots) {
      // HARD_MAX may legitimately yield 0 sets — that is the CONSTRAINED result,
      // and it must be flagged rather than silently produced.
      check(`${f.name}/${s.exerciseId}: sets is a non-negative integer`, Number.isSafeInteger(s.sets) && s.sets >= 0, String(s.sets))
      if (s.sets === 0) check(`${f.name}/${s.exerciseId}: zero sets is flagged unprescribable`, s.prescriptionReasonCodes.includes('prescription.slotUnprescribableAtHardMax'))
      check(`${f.name}/${s.exerciseId}: repRange min <= max`, s.repRange.min <= s.repRange.max, `${s.repRange.min}-${s.repRange.max}`)
      check(`${f.name}/${s.exerciseId}: rep bounds are integers`, Number.isSafeInteger(s.repRange.min) && Number.isSafeInteger(s.repRange.max))
      check(`${f.name}/${s.exerciseId}: restSeconds within policy bounds`, s.restSeconds >= policy('rest.minSeconds') && s.restSeconds <= policy('rest.maxSeconds'), String(s.restSeconds))
      check(`${f.name}/${s.exerciseId}: targetRir >= floor (never failure)`, s.targetRir >= policy('rir.minimumAllowed'), String(s.targetRir))
      check(`${f.name}/${s.exerciseId}: has reason codes`, s.prescriptionReasonCodes.length > 0)
      check(`${f.name}/${s.exerciseId}: sets <= per-exercise ceiling`, s.sets <= policy('sets.perExerciseCeiling'))
    }
    // [CTO-QAE-019] §2 HARD_MAX: absolute, no exceedance permitted.
    const hardMax = policy('sets.sessionWorkingSetHardMax')
    check(`${f.name}/${d.dayId}: HARD_MAX is absolute`, d.totalWorkingSets <= hardMax, `${d.totalWorkingSets} > ${hardMax}`)
    if (d.constrained) check(`${f.name}/${d.dayId}: constrained day is flagged`, d.reasonCodes.includes('prescription.slotUnprescribableAtHardMax'))
    if (d.totalWorkingSets === hardMax) {
      check(`${f.name}/${d.dayId}: reaching HARD_MAX is flagged, never silent`, d.reasonCodes.includes('prescription.sessionHardMaxReached'))
    }
  }
  // Assembly must be untouched: same ids, same order, same optional flags.
  const pool = buildEligiblePool(catalog, { access: f.access, tier: f.tier, injuryConstraints: (f.injuries ?? []) as never[], blocklists: BLOCKLISTS })
  const asm = assembleDays(catalog, {
    daySpecs: [{ kind: 'upper' }, { kind: 'lower' }, { kind: 'upper' }, { kind: 'lower' }],
    poolIds: pool.ids, targetPerDay: f.targetPerDay ?? 6, machinesOnly: pool.machinesOnly,
    preferMachines: pool.preferMachines, accessoryPool: { triceps: [], biceps: [], abs: [] },
  })
  const asmIds = asm.days.map((d) => d.exercises.map((e) => `${e.exerciseId}@${e.order}:${e.optional}`).join(','))
  const rxIds = r.days.map((d) => d.slots.map((s) => `${s.exerciseId}@${s.order}:${s.optional}`).join(','))
  check(`${f.name}: prescription does not alter exercise choice/order/optional`, canonicalSerialize(asmIds) === canonicalSerialize(rxIds))
}

// ═══ Named policy expectations ═════════════════════════════════════════════
{
  const beginner = results.get('A beginner-full-gym') as PrescriptionResult
  const advanced = results.get('E advanced') as PrescriptionResult
  const returning = results.get('F returning-conservative') as PrescriptionResult
  const inter = results.get('D intermediate') as PrescriptionResult

  const rir = (r: PrescriptionResult): number[] => [...new Set(r.days.flatMap((d) => d.slots.map((s) => s.targetRir)))]
  check('beginner RIR == policy rir.beginner', rir(beginner).every((v) => v === policy('rir.beginner')), rir(beginner).join(','))
  check('advanced RIR == policy rir.advanced', rir(advanced).every((v) => v === policy('rir.advanced')), rir(advanced).join(','))
  check('returning RIR is strictly higher than active intermediate', Math.min(...rir(returning)) > Math.min(...rir(inter)), `${rir(returning)} vs ${rir(inter)}`)
  check('no fixture ever prescribes 0 RIR (failure training)', [...results.values()].every((r) => r.days.every((d) => d.slots.every((s) => s.targetRir > 0))))

  const setsOf = (r: PrescriptionResult): number[] => r.days.flatMap((d) => d.slots.map((s) => s.sets))
  check('returning sets are reduced vs active intermediate', Math.max(...setsOf(returning)) < Math.max(...setsOf(inter)), `${Math.max(...setsOf(returning))} vs ${Math.max(...setsOf(inter))}`)
  check('beginner→advanced changes at least one dimension', canonicalSerialize(rir(beginner)) !== canonicalSerialize(rir(advanced)) || canonicalSerialize(setsOf(beginner)) !== canonicalSerialize(setsOf(advanced)))
  check('minor fixture carries the conservative reason code', (results.get('L minor-safety') as PrescriptionResult).reasonCodes.includes('prescription.minorPolicyConservative'))
}

// ═══ §6 metadata gate — no silent derived fallback ═════════════════════════
{
  const empty = { ...curation, records: [] }
  const pool = buildEligiblePool(catalog, { access: 'full', tier: 'advanced', injuryConstraints: [], blocklists: BLOCKLISTS })
  const asm = assembleDays(catalog, { daySpecs: [{ kind: 'upper' }], poolIds: pool.ids, targetPerDay: 6, machinesOnly: true, preferMachines: false, accessoryPool: { triceps: [], biceps: [], abs: [] } })
  const r = prescribeInitialPlan({ catalog, capability: cap({ experienceBand: 'advanced' }), tier: 'advanced', curation: empty, days: asm.days, isMinor: false })
  const allFlagged = r.days.every((d) => d.slots.every((s) => s.prescriptionReasonCodes.includes('prescription.metadataInsufficient')))
  check('GATE: uncurated metadata flags every slot by name', allFlagged)
  const conservative = r.days.every((d) => d.slots.every((s) => s.sets <= policy('sets.beginner.compound')))
  check('GATE: low-confidence metadata cannot produce an aggressive prescription', conservative)
  const withMeta = prescribeInitialPlan({ catalog, capability: cap({ experienceBand: 'advanced' }), tier: 'advanced', curation, days: asm.days, isMinor: false })
  check('GATE counter-assertion: curated metadata yields a different (non-degraded) prescription', canonicalSerialize(r.days) !== canonicalSerialize(withMeta.days))
}

// ═══ §14 property + counter-assertions ═════════════════════════════════════
{
  const f = FIXTURES[3]
  check('determinism: same inputs => byte-identical output', canonicalSerialize(run(f)) === canonicalSerialize(run(f)))

  // policy register: every key resolves; a missing key throws BY NAME
  check('policy register is non-empty', PRESCRIPTION_POLICY.length > 0, String(PRESCRIPTION_POLICY.length))
  for (const e of PRESCRIPTION_POLICY) {
    check(`policy ${e.key}: integer value`, Number.isSafeInteger(e.value))
    check(`policy ${e.key}: has tier`, ['VERIFIED_EVIDENCE', 'PRODUCT_POLICY', 'ASSUMPTION'].includes(e.tier))
    check(`policy ${e.key}: has rationale`, e.rationale.length > 0)
    check(`policy ${e.key}: VERIFIED_EVIDENCE carries a source`, e.tier !== 'VERIFIED_EVIDENCE' || e.source !== 'none')
  }
  let threw = false
  try {
    policy('sets.does.not.exist' as never)
  } catch (err) {
    threw = (err as Error).message.includes('QAE-PRESCRIPTION-POLICY-MISSING')
  }
  check('CA: removing a policy register entry fails BY NAME', threw)
  check('CA: policyEntry returns undefined for an unknown key', policyEntry('nope' as never) === undefined)

  // unsafe exercise never becomes valid because a prescription exists
  const g = results.get('G knee-restriction') as PrescriptionResult
  const kneeIds = new Set(BLOCKLISTS.injuryByTag['knee'])
  const leaked = g.days.flatMap((d) => d.slots.map((s) => s.exerciseId)).filter((id) => kneeIds.has(id))
  check('CA: prescription never rescues a contraindicated exercise', leaked.length === 0, leaked.join(','))

  // no arbitrary padding on a constrained/short plan
  const short = results.get('I short-session') as PrescriptionResult
  check('CA: short session is prescribed, never padded with extra slots', short.days.every((d) => d.slots.length <= 4))
}

console.log(`prescription fixtures: ${FIXTURES.length} · policy entries: ${PRESCRIPTION_POLICY.length} (VERIFIED ${PRESCRIPTION_POLICY.filter((e) => e.tier === 'VERIFIED_EVIDENCE').length} · POLICY ${PRESCRIPTION_POLICY.filter((e) => e.tier === 'PRODUCT_POLICY').length} · ASSUMPTION ${PRESCRIPTION_POLICY.filter((e) => e.tier === 'ASSUMPTION').length})`)
console.log(`qae-prescription-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
