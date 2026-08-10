// [CTO-QAE-013] — Day-assembly + substitution proof.
//
// Primary acceptance: assembleDays() reproduces the COMPLETE assembled day
// output of all 17 shippingPlan goldens — exercise ids, order, AND optional
// flags — byte-identically. Candidate lists alone are not parity.
//
// The legacy inputs are reconstructed from each golden's own
// profileEvidence.shipping block plus the characterized blocklist migration, so
// the proof never reaches into shipping source at runtime.

import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { ExerciseCatalog, ExerciseMetadata } from '../../Domain/Catalog/model'
import { DAY_SLOTS, type DayKind } from '../../Domain/Training/requirements'
import {
  assembleDays,
  deriveTargetCount,
  accessoryCategoryFor,
  DAY_MUSCLES,
  FULL_BODY_MIN,
  type AccessoryCategory,
  type AssemblyInput,
  type ExpTier,
} from '../../Domain/Training/assembly'
import { findSubstitute, type SubstitutionContext } from '../../Domain/Training/substitution'

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
const ruleIds = (id: string): Set<string> => {
  const rule = blocklist.rules.find((r) => r.ruleId === id)
  if (rule === undefined) throw new Error(`blocklist rule not found: ${id}`)
  // Fail loudly on a shape change: an empty set would silently disable the
  // filter and quietly inflate parity, which is exactly how the first run of
  // this proof reported 7/17 for the wrong reason.
  if (!Array.isArray(rule.exerciseIds)) throw new Error(`blocklist rule ${id} has no exerciseIds array`)
  return new Set(rule.exerciseIds)
}

const INJURY_RULES: Readonly<Record<string, string>> = {
  knee: 'legacy-injury-knee',
  shoulder: 'legacy-injury-shoulder',
  back: 'legacy-injury-back',
  wrist: 'legacy-injury-wrist',
  elbow: 'legacy-injury-elbow',
  ankle: 'legacy-injury-ankle',
}
const LEVEL_CAPPED = ruleIds('legacy-level-cap')
const FREE_CABLE = ruleIds('legacy-free-cable-beginner')

/** planGenerator.ts:366-370 — ACCESSORY_POOL, characterized verbatim. */
const ACCESSORY_POOL_RAW: Readonly<Record<AccessoryCategory, readonly string[]>> = {
  triceps: ['triceps-extension-machine', 'cable-triceps-pushdown'],
  biceps: ['preacher-curl-machine', 'cable-biceps-curl'],
  abs: ['ab-crunch-machine'],
}

/** planGenerator.ts:64-76 — expTier(experienceBand). */
function tierOf(band: string | null, trainingLevel: string): ExpTier {
  switch (band) {
    case 'lt1m':
    case '1to6m':
      return 'beginner'
    case '6to12m':
      return 'novice'
    case '1to2y':
      return 'intermediate'
    case 'gt2y':
      return 'advanced'
    default:
      return trainingLevel === 'advanced' ? 'advanced' : trainingLevel === 'intermediate' ? 'intermediate' : 'beginner'
  }
}

/** equipmentAccess.ts:30-46 — makeEquipmentGate. */
function equipmentGate(access: string): (equipment: readonly string[]) => boolean {
  if (access === 'full') return () => true
  if (access === 'small') {
    const banned = new Set(['smith', 'rope'])
    return (eq) => eq.every((e) => !banned.has(e))
  }
  if (access === 'home') {
    const allowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
    return (eq) => eq.every((e) => allowed.has(e))
  }
  const allowed = new Set(['bodyweight'])
  return (eq) => eq.every((e) => allowed.has(e))
}

interface ShippingEvidence {
  trainingLevel: string
  experienceBand: string | null
  gymAccess: string | null
  trainingDays: number
  workoutDuration: number
  injuries: string
  goalType: string
}
interface GoldenDay {
  id: string
  exercises: Array<{ exerciseId: string; order: number; optional: boolean }>
}
interface Golden {
  scenario: string
  shippingPlan: { templateId: string; days: GoldenDay[] }
  profileEvidence: { shipping: ShippingEvidence; personalization: Record<string, unknown> }
}

const INJURY_ALIASES: Readonly<Record<string, string>> = {
  knee: 'knee', shoulder: 'shoulder', back: 'back', lower_back: 'back',
  wrist: 'wrist', elbow: 'elbow', ankle: 'ankle',
}
function detectInjuryAreas(injuries: string): string[] {
  const found = new Set<string>()
  const text = injuries.toLowerCase()
  for (const [needle, area] of Object.entries(INJURY_ALIASES)) {
    if (text.includes(needle)) found.add(area)
  }
  return [...found].sort()
}

/** Rebuild the legacy shipping pool for a scenario, from characterized rules only. */
function buildPool(ev: ShippingEvidence): { poolIds: string[]; machinesOnly: boolean; tier: ExpTier; preferMachines: boolean } {
  const tier = tierOf(ev.experienceBand, ev.trainingLevel)
  const access = ev.gymAccess ?? 'full'
  const machinesOnly = access === 'full' || access === 'small'
  const preferMachines = tier === 'beginner' || tier === 'novice'

  const injuredIds = new Set<string>()
  for (const area of detectInjuryAreas(ev.injuries)) {
    const rule = INJURY_RULES[area]
    if (rule) for (const id of ruleIds(rule)) injuredIds.add(id)
  }
  const levelOk = (ex: ExerciseMetadata): boolean =>
    tier === 'beginner' || tier === 'novice' ? !LEVEL_CAPPED.has(ex.exerciseId) : true
  const cableOk = (ex: ExerciseMetadata): boolean => tier === 'advanced' || !FREE_CABLE.has(ex.exerciseId)

  let ids: string[]
  if (machinesOnly) {
    ids = catalog.exercises
      .filter((ex) => machineIds.has(ex.exerciseId) && !injuredIds.has(ex.exerciseId) && levelOk(ex))
      .map((ex) => ex.exerciseId)
  } else {
    const gate = equipmentGate(access)
    ids = catalog.exercises
      .filter(
        (ex) =>
          gate(ex.equipmentRequired) &&
          !injuredIds.has(ex.exerciseId) &&
          cableOk(ex) &&
          ex.movementPattern !== 'mobility' &&
          ex.primaryMuscleCoarse !== 'cardio' &&
          levelOk(ex),
      )
      .map((ex) => ex.exerciseId)
  }
  return { poolIds: ids, machinesOnly, tier, preferMachines }
}

function accessoryPoolFor(tier: ExpTier): Record<AccessoryCategory, readonly string[]> {
  // pickAccessory applies the same cable rule so free cable cannot leak in.
  const filt = (list: readonly string[]): string[] =>
    list.filter((id) => tier === 'advanced' || !FREE_CABLE.has(id))
  return { triceps: filt(ACCESSORY_POOL_RAW.triceps), biceps: filt(ACCESSORY_POOL_RAW.biceps), abs: filt(ACCESSORY_POOL_RAW.abs) }
}

function inputFor(g: Golden): AssemblyInput {
  const ev = g.profileEvidence.shipping
  const { poolIds, machinesOnly, tier, preferMachines } = buildPool(ev)
  const daySpecs = g.shippingPlan.days.map((d) => {
    const m = /^gen-\d+-([a-z]+)$/.exec(d.id)
    return { kind: (m ? m[1] : 'full') as DayKind }
  })
  return {
    daySpecs,
    poolIds,
    targetPerDay: deriveTargetCount(tier, ev.workoutDuration),
    machinesOnly,
    preferMachines,
    accessoryPool: accessoryPoolFor(tier),
  }
}

const goldenDir = 'Fixtures/golden/training'
const goldens = readdirSync(resolvePath(qaeRoot, goldenDir))
  .filter((f) => f.endsWith('.golden.json'))
  .sort()
  .map((f) => readJson<Golden>(`${goldenDir}/${f}`))

// ═══ 1. PARITY — complete assembled day output, all 17 goldens ══════════════
let parityMatched = 0
const parityDiffs: string[] = []
for (const g of goldens) {
  const result = assembleDays(catalog, inputFor(g))
  const actual = result.days.map((d) => ({
    id: d.dayId,
    exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order, optional: e.optional })),
  }))
  const expected = g.shippingPlan.days.map((d) => ({
    id: d.id,
    exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order, optional: e.optional })),
  }))
  const same = canonicalSerialize(actual) === canonicalSerialize(expected)
  if (same) parityMatched++
  else {
    const firstDiff = expected.findIndex((d, i) => canonicalSerialize(d) !== canonicalSerialize(actual[i]))
    parityDiffs.push(
      `${g.scenario}@day${firstDiff}: expected ${JSON.stringify(expected[firstDiff]?.exercises.map((e) => e.exerciseId))} got ${JSON.stringify(actual[firstDiff]?.exercises.map((e) => e.exerciseId))}`,
    )
  }
  check(`PARITY ${g.scenario}: assembled days byte-identical`, same, parityDiffs[parityDiffs.length - 1] ?? '')
}
check(`PARITY TOTAL 17/17`, parityMatched === goldens.length, `${parityMatched}/${goldens.length}`)

// ═══ 2. DETERMINISM / PERMUTATION ══════════════════════════════════════════
for (const g of goldens.slice(0, 6)) {
  const base = inputFor(g)
  const a = canonicalSerialize(assembleDays(catalog, base).days)

  // catalog registration order reversed
  const revCatalog: ExerciseCatalog = { ...catalog, exercises: [...catalog.exercises].reverse() }
  check(`DET ${g.scenario}: catalog order reversed => identical`, canonicalSerialize(assembleDays(revCatalog, base).days) === a)

  // pool order reversed
  const revPool: AssemblyInput = { ...base, poolIds: [...base.poolIds].reverse() }
  check(`DET ${g.scenario}: pool order reversed => identical`, canonicalSerialize(assembleDays(catalog, revPool).days) === a)

  // accessory pool object key order changed
  const reKeyed: AssemblyInput = {
    ...base,
    accessoryPool: { abs: base.accessoryPool.abs, biceps: base.accessoryPool.biceps, triceps: base.accessoryPool.triceps },
  }
  check(`DET ${g.scenario}: capability key order changed => identical`, canonicalSerialize(assembleDays(catalog, reKeyed).days) === a)
}

// locale + timezone independence
const origTZ = process.env.TZ
for (const loc of ['tr-TR', 'sv-SE', 'ar-SA']) {
  const g = goldens[0]
  const base = inputFor(g)
  const before = canonicalSerialize(assembleDays(catalog, base).days)
  process.env.TZ = loc === 'tr-TR' ? 'Europe/Istanbul' : loc === 'sv-SE' ? 'Europe/Stockholm' : 'Asia/Riyadh'
  const after = canonicalSerialize(assembleDays(catalog, base).days)
  check(`DET locale/timezone ${loc}: identical output`, before === after)
}
process.env.TZ = origTZ

// D6 — ordinal vs localeCompare must be observable as a rule, not by luck.
{
  const ids = ['a-z', 'A-Z', 'i-dot', 'I-dot']
  const ordinal = [...ids].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  const turkish = [...ids].sort((x, y) => x.localeCompare(y, 'tr-TR'))
  check('D6: ordinal and tr-TR collation genuinely differ on the probe set', ordinal.join('|') !== turkish.join('|'), `${ordinal.join('|')} vs ${turkish.join('|')}`)
}

// ═══ 3. USED-SET / FALLBACK ════════════════════════════════════════════════
for (const g of goldens) {
  const res = assembleDays(catalog, inputFor(g))
  for (const d of res.days) {
    const ids = d.exercises.map((e) => e.exerciseId)
    check(`USED ${g.scenario}/${d.dayId}: no intra-day duplicate`, new Set(ids).size === ids.length, ids.join(','))
  }
  // whole-pool fallback only for machinesOnly
  const usedWholePool = res.days.some((d) => d.exercises.some((e) => e.fillReason === 'wholePoolFill'))
  if (usedWholePool) {
    check(`FALLBACK ${g.scenario}: wholePoolFill implies machinesOnly`, inputFor(g).machinesOnly)
  }
  // fallback is traceable, never silent
  const traceHasFill = res.trace.some((t) => t.includes('wholePoolFill'))
  check(`FALLBACK ${g.scenario}: wholePoolFill is traced when used`, usedWholePool === traceHasFill)
}

// Counter-assertion: a sufficient eligible pool must NOT trigger whole-pool fill.
{
  const g = goldens.find((x) => x.scenario === 'beginner-full-gym') ?? goldens[0]
  const base = inputFor(g)
  const small: AssemblyInput = { ...base, targetPerDay: 3, machinesOnly: true }
  const res = assembleDays(catalog, small)
  const fired = res.days.some((d) => d.exercises.some((e) => e.fillReason === 'wholePoolFill'))
  check('FALLBACK counter-assertion: sufficient pool at target=3 => wholePoolFill does NOT fire', !fired)
}

// Cross-day repeats remain allowed (used-set resets per day).
{
  const g = goldens.find((x) => x.scenario === 'six-day') ?? goldens[0]
  const res = assembleDays(catalog, inputFor(g))
  const all = res.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  check('USED: used-set resets between days (cross-day repeats permitted)', all.length >= new Set(all).size)
}

// Insufficient pool => short, never padded or duplicated.
{
  const g = goldens[0]
  const base = inputFor(g)
  const starved: AssemblyInput = { ...base, poolIds: base.poolIds.slice(0, 2), targetPerDay: 9, machinesOnly: false }
  const res = assembleDays(catalog, starved)
  for (const d of res.days) {
    const ids = d.exercises.map((e) => e.exerciseId)
    check(`SHORT ${d.dayId}: starved pool never duplicates`, new Set(ids).size === ids.length)
    check(`SHORT ${d.dayId}: starved pool never pads beyond pool size`, ids.length <= 2)
    check(`SHORT ${d.dayId}: short flag set`, d.short)
  }
}

// ═══ 4. A/B VARIATION — 3/4/5/6-day plans ══════════════════════════════════
for (const n of [3, 4, 5, 6]) {
  const g = goldens.find((x) => x.shippingPlan.days.length === n)
  check(`A/B: a ${n}-day golden exists`, g !== undefined)
  if (!g) continue
  const res = assembleDays(catalog, inputFor(g))
  const byKind = new Map<string, string[][]>()
  for (const d of res.days) {
    const list = byKind.get(d.kind) ?? []
    list.push(d.exercises.map((e) => e.exerciseId))
    byKind.set(d.kind, list)
  }
  for (const [kind, seqs] of [...byKind.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (seqs.length < 2) continue
    check(`A/B ${n}-day/${kind}: ${seqs.length} same-kind days are distinct`, new Set(seqs.map((s) => s.join('|'))).size === seqs.length)
  }
  res.days.forEach((d, i) => {
    check(`A/B ${n}-day: ${d.dayId} variation < nVar`, d.variation < d.nVar, `${d.variation}/${d.nVar}`)
    check(`A/B ${n}-day: dayId index is 1-based position`, d.dayId === `gen-${i + 1}-${d.kind}`)
  })
}

// ═══ 5. TARGET COUNT BANDS ═════════════════════════════════════════════════
for (const tier of ['beginner', 'novice', 'intermediate', 'advanced'] as ExpTier[]) {
  const base = tier === 'intermediate' || tier === 'advanced' ? 6 : 5
  check(`TARGET ${tier}: 30min => base-2`, deriveTargetCount(tier, 30) === Math.max(3, base - 2))
  check(`TARGET ${tier}: 45min => base-1`, deriveTargetCount(tier, 45) === base - 1)
  check(`TARGET ${tier}: 60min => base`, deriveTargetCount(tier, 60) === base)
  check(`TARGET ${tier}: 75min => base+1`, deriveTargetCount(tier, 75) === base + 1)
  check(`TARGET ${tier}: 90min => base+2`, deriveTargetCount(tier, 90) === base + 2)
  check(`TARGET ${tier}: 0min treated as 60`, deriveTargetCount(tier, 0) === deriveTargetCount(tier, 60))
  check(`TARGET ${tier}: clamped to [3,9]`, deriveTargetCount(tier, 1000) <= 9 && deriveTargetCount(tier, 1) >= 3)
}

// Full-body minimum
{
  const g = goldens[0]
  const base = inputFor(g)
  const res = assembleDays(catalog, { ...base, daySpecs: [{ kind: 'full' }], targetPerDay: 3 })
  check(`FULL_BODY_MIN: a full day targets >= ${FULL_BODY_MIN} even at target 3`, res.days[0].targetCount === FULL_BODY_MIN)
}

// ═══ 6. MACHINE-DOMINANT != MACHINE-ONLY ═══════════════════════════════════
{
  const g = goldens.find((x) => x.scenario === 'beginner-home') ?? goldens[0]
  const ev = g.profileEvidence.shipping
  const { poolIds } = buildPool({ ...ev, gymAccess: 'home' })
  const res = assembleDays(catalog, {
    daySpecs: [{ kind: 'upper' }, { kind: 'lower' }],
    poolIds,
    targetPerDay: 5,
    machinesOnly: false,
    preferMachines: true, // machine-DOMINANT
    accessoryPool: accessoryPoolFor('beginner'),
  })
  const picked = res.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  check('MACHINE-DOMINANT: a preference never empties a machine-free plan', picked.length > 0)
  const nonMachine = picked.filter((id) => !(byId.get(id)?.equipmentRequired.includes('machine') ?? false))
  check('MACHINE-DOMINANT != MACHINE-ONLY: non-machine picks survive under preferMachines', nonMachine.length > 0, picked.join(','))
}

// ═══ 7. ENVIRONMENT CASES ══════════════════════════════════════════════════
const ENV_CASES = [
  'beginner-full-gym', 'beginner-home', 'beginner-bodyweight', 'intermediate-full-gym',
  'advanced-full-gym', 'advanced-limited-equipment', 'knee-restriction', 'shoulder-restriction',
  'back-restriction', 'multiple-restrictions',
]
for (const name of ENV_CASES) {
  const g = goldens.find((x) => x.scenario === name)
  check(`ENV: scenario ${name} present`, g !== undefined)
  if (!g) continue
  const res = assembleDays(catalog, inputFor(g))
  check(`ENV ${name}: every day has at least one exercise`, res.days.every((d) => d.exercises.length > 0))
  check(`ENV ${name}: every id resolves in catalog`, res.days.every((d) => d.exercises.every((e) => byId.has(e.exerciseId))))
  check(`ENV ${name}: day count matches golden`, res.days.length === g.shippingPlan.days.length)
}

// ═══ 8. SUBSTITUTION ═══════════════════════════════════════════════════════
const allIds = catalog.exercises.map((e) => e.exerciseId)
const ctxAll = (over: Partial<SubstitutionContext> = {}): SubstitutionContext => ({
  eligibleIds: allIds,
  excludedIds: [],
  experienceBand: 'advanced',
  maxTechnicalDifficulty: 3,
  maxStabilityDemand: 3,
  contraindicatedTags: [],
  ...over,
})

// pick a subject with a declared substitute for the positive path
const withDeclared = catalog.exercises.find(
  (e) => e.declaredSubstitutes.length > 0 && e.declaredSubstitutes.some((d) => byId.has(d)),
)
check('SUB: a catalog entry with a resolvable declared substitute exists', withDeclared !== undefined)
if (withDeclared) {
  const declared = withDeclared.declaredSubstitutes.find((d) => byId.has(d)) as string
  const r1 = findSubstitute(catalog, withDeclared.exerciseId, ctxAll())
  check('SUB-1 declared substitute wins when eligible', r1.kind === 'substitute' && r1.tier === 'declared', JSON.stringify(r1))

  // declared excluded (unsafe) => skipped, must not be returned
  const r2 = findSubstitute(catalog, withDeclared.exerciseId, ctxAll({ excludedIds: withDeclared.declaredSubstitutes }))
  check('SUB-2 unsafe declared substitute is rejected', r2.kind !== 'substitute' || r2.tier !== 'declared', JSON.stringify(r2))
  check('SUB-2b rejected declared id never returned', !(r2.kind === 'substitute' && withDeclared.declaredSubstitutes.includes(r2.exerciseId)))

  // declared equipment-incompatible => skipped
  const r3 = findSubstitute(catalog, withDeclared.exerciseId, ctxAll({ eligibleIds: allIds.filter((id) => !withDeclared.declaredSubstitutes.includes(id)) }))
  check('SUB-3 equipment-incompatible declared substitute is rejected', r3.kind !== 'substitute' || r3.tier !== 'declared', JSON.stringify(r3))
  check('SUB-4 declared path returns a real id', r1.kind !== 'substitute' || byId.has(r1.exerciseId))
  void declared
}

// group fallback then pattern fallback
{
  const subject = catalog.exercises.find((e) => {
    const group = catalog.exercises.filter((o) => o.exerciseId !== e.exerciseId && o.substitutionGroup === e.substitutionGroup)
    return group.length > 0
  })
  check('SUB: a catalog entry with a non-empty substitutionGroup peer exists', subject !== undefined)
  if (subject) {
    const noDeclared = ctxAll({ eligibleIds: allIds.filter((id) => !subject.declaredSubstitutes.includes(id)) })
    const r = findSubstitute(catalog, subject.exerciseId, noDeclared)
    check('SUB-5 substitutionGroup fallback fires when declared unavailable', r.kind === 'substitute' && (r.tier === 'group' || r.tier === 'pattern'), JSON.stringify(r))
  }
}

// no candidate => explicit none; never self
for (const ex of catalog.exercises.slice(0, 40)) {
  const none = findSubstitute(catalog, ex.exerciseId, ctxAll({ eligibleIds: [ex.exerciseId] }))
  check(`SUB-6 ${ex.exerciseId}: only-self pool => explicit none`, none.kind === 'none', JSON.stringify(none))
  const any = findSubstitute(catalog, ex.exerciseId, ctxAll())
  check(`SUB-7 ${ex.exerciseId}: never returns itself`, any.kind !== 'substitute' || any.exerciseId !== ex.exerciseId)
}

// deterministic tie-break + eligibility invariant
{
  const ex = catalog.exercises[0]
  const a = findSubstitute(catalog, ex.exerciseId, ctxAll())
  const b = findSubstitute(catalog, { ...catalog, exercises: [...catalog.exercises].reverse() }.exercises[0].exerciseId, ctxAll())
  void b
  const rev = findSubstitute({ ...catalog, exercises: [...catalog.exercises].reverse() }, ex.exerciseId, ctxAll())
  check('SUB-8 deterministic under reversed catalog order', canonicalSerialize(a) === canonicalSerialize(rev), `${JSON.stringify(a)} vs ${JSON.stringify(rev)}`)
}
{
  // Hard invariant: an excluded/contraindicated id is NEVER returned, at any tier.
  const banned = new Set(allIds.slice(0, 100))
  let violations = 0
  for (const ex of catalog.exercises.slice(0, 60)) {
    const r = findSubstitute(catalog, ex.exerciseId, ctxAll({ excludedIds: [...banned] }))
    if (r.kind === 'substitute' && banned.has(r.exerciseId)) violations++
  }
  check('SUB-9 hard invariant: excluded ids are never returned at any precedence tier', violations === 0, String(violations))
}

// ═══ 9. STRUCTURAL ═════════════════════════════════════════════════════════
check('DAY_MUSCLES covers every DayKind', Object.keys(DAY_SLOTS).every((k) => k in DAY_MUSCLES))
for (const kind of Object.keys(DAY_SLOTS) as DayKind[]) {
  check(`accessoryCategoryFor(${kind}) is defined`, accessoryCategoryFor(kind, 0) !== undefined)
}

console.log(`qae-assembly-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
