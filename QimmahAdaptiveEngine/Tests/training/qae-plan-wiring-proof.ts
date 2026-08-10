// [CTO-QAE-014] — Split characterization + real buildTrainingPlan wiring proof.
//
// The acceptance criterion is the NEW WIRED PATH, not assembly in isolation:
// a real AthleteProfile must travel
//   AthleteProfile → capability → eligible pool → split → assembly → training.days
// and reproduce the approved plan goldens for day count, day kinds, exercise
// ids, order and optional flags.

import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { ExerciseCatalog } from '../../Domain/Catalog/model'
import type { AthleteProfile } from '../../Domain/Profile/model'
import type { DayKind } from '../../Domain/Training/requirements'
import { generateSplit, splitIdFor, focusDayKind, type MuscleFocus } from '../../Domain/Training/split'
import {
  buildTrainingPlan,
  buildEligiblePool,
  isMachinesOnly,
  tierFromCapability,
  type GymAccess,
} from '../../Domain/Training/plan'
import { deriveTrainingCapabilityProfile } from '../../Domain/Training/capability'

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
  if (r === undefined || !Array.isArray(r.exerciseIds)) throw new Error(`blocklist rule missing/malformed: ${id}`)
  return r.exerciseIds
}
const BLOCKLISTS = {
  injuryByTag: {
    knee: ruleIds('legacy-injury-knee'),
    shoulder: ruleIds('legacy-injury-shoulder'),
    lower_back: ruleIds('legacy-injury-back'),
    wrist: ruleIds('legacy-injury-wrist'),
    elbow: ruleIds('legacy-injury-elbow'),
    ankle: ruleIds('legacy-injury-ankle'),
    overhead: ruleIds('legacy-overhead'),
    impact: ruleIds('legacy-impact'),
  } as Record<string, string[]>,
  levelCapped: ruleIds('legacy-level-cap'),
  freeCable: ruleIds('legacy-free-cable-beginner'),
}

// ═══ 1. SPLIT CHARACTERIZATION (assertions before parity) ══════════════════
const K = (s: string): DayKind => s as DayKind
const EXPECTED_SPLITS: ReadonlyArray<{ days: number; kinds: DayKind[]; splitId: string }> = [
  { days: 1, kinds: [K('full')], splitId: 'gen-fullbody' },
  { days: 2, kinds: [K('full'), K('full')], splitId: 'gen-fullbody' },
  { days: 3, kinds: [K('full'), K('full'), K('full')], splitId: 'gen-fullbody' },
  { days: 4, kinds: [K('upper'), K('lower'), K('upper'), K('lower')], splitId: 'gen-upper-lower-4' },
  { days: 6, kinds: [K('push'), K('pull'), K('lower'), K('push'), K('pull'), K('lower')], splitId: 'gen-ppl-6' },
  { days: 7, kinds: [K('push'), K('pull'), K('lower'), K('push'), K('pull'), K('lower'), K('full')], splitId: 'gen-ppl-7' },
]
for (const e of EXPECTED_SPLITS) {
  const s = generateSplit(e.days)
  check(`SPLIT ${e.days}-day: kind sequence`, s.daySpecs.map((d) => d.kind).join(',') === e.kinds.join(','), s.daySpecs.map((d) => d.kind).join(','))
  check(`SPLIT ${e.days}-day: splitId ${e.splitId}`, s.splitId === e.splitId, s.splitId)
  check(`SPLIT ${e.days}-day: effectiveDays`, s.effectiveDays === e.days, String(s.effectiveDays))
}

// 5-day consults focusDay — every live MuscleFocus mode.
const FOCUS_CASES: ReadonlyArray<[MuscleFocus | undefined, DayKind]> = [
  ['lower', K('lower')], ['upper', K('upper')], ['chest', K('upper')], ['back', K('upper')],
  ['shoulders', K('upper')], ['core', K('core')], ['arms', K('arms')], ['balanced', K('arms')], [undefined, K('arms')],
]
for (const [focus, expected] of FOCUS_CASES) {
  check(`SPLIT focus ${String(focus)}: focusDayKind`, focusDayKind(focus) === expected, focusDayKind(focus))
  const s = generateSplit(5, focus)
  check(`SPLIT 5-day focus ${String(focus)}: sequence`, s.daySpecs.map((d) => d.kind).join(',') === `upper,lower,upper,lower,${expected}`, s.daySpecs.map((d) => d.kind).join(','))
  check(`SPLIT 5-day focus ${String(focus)}: splitId`, s.splitId === 'gen-upper-lower-5')
}

// Out-of-range / invalid clamping (characterized clamp(days,1,7)).
for (const [input, expected] of [[0, 1], [-5, 1], [8, 7], [99, 7], [3.7, 3], [NaN, 1]] as Array<[number, number]>) {
  check(`SPLIT clamp ${input} => ${expected} days`, generateSplit(input).effectiveDays === expected, String(generateSplit(input).effectiveDays))
  check(`SPLIT clamp ${input}: splitId consistent`, generateSplit(input).splitId === splitIdFor(input))
}

// A/B implication: repeated kinds produce nVar > 1.
{
  const s4 = generateSplit(4)
  const counts = new Map<string, number>()
  for (const d of s4.daySpecs) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1)
  check('SPLIT 4-day: upper appears twice (nVar=2)', counts.get('upper') === 2)
  check('SPLIT 4-day: lower appears twice (nVar=2)', counts.get('lower') === 2)
  const s6 = generateSplit(6)
  const c6 = new Map<string, number>()
  for (const d of s6.daySpecs) c6.set(d.kind, (c6.get(d.kind) ?? 0) + 1)
  check('SPLIT 6-day: push/pull/lower each twice', c6.get('push') === 2 && c6.get('pull') === 2 && c6.get('lower') === 2)
}

// Determinism of split itself.
check('SPLIT deterministic across repeated calls', canonicalSerialize(generateSplit(5, 'core')) === canonicalSerialize(generateSplit(5, 'core')))

// ═══ 2. END-TO-END WIRED PARITY vs the approved plan goldens ═══════════════
interface Golden {
  scenario: string
  shippingPlan: { templateId: string; days: Array<{ id: string; exercises: Array<{ exerciseId: string; order: number; optional: boolean }> }> }
  profileEvidence: {
    shipping: { trainingLevel: string; experienceBand: string | null; gymAccess: string | null; trainingDays: number; workoutDuration: number; injuries: string; goalType: string; muscleFocus: string | null }
  }
}
const goldens = readdirSync(resolvePath(qaeRoot, 'Fixtures/golden/training'))
  .filter((f) => f.endsWith('.golden.json'))
  .sort()
  .map((f) => readJson<Golden>(`Fixtures/golden/training/${f}`))

const BAND_OF: Readonly<Record<string, 'beginner' | 'intermediate' | 'advanced'>> = {
  lt1m: 'beginner', '1to6m': 'beginner', '6to12m': 'beginner', '1to2y': 'intermediate', gt2y: 'advanced',
}
const INJURY_TOKENS: Readonly<Record<string, string>> = {
  knee: 'knee', shoulder: 'shoulder', lower_back: 'lower_back', wrist: 'wrist', elbow: 'elbow', ankle: 'ankle',
}

/** Build a COMPLETE AthleteProfile from the golden's approved evidence. */
function profileFor(g: Golden): AthleteProfile {
  const ev = g.profileEvidence.shipping
  const band = BAND_OF[ev.experienceBand ?? ''] ?? 'beginner'
  const areas = Object.keys(INJURY_TOKENS).filter((t) => ev.injuries.toLowerCase().includes(t))
  return {
    schemaVersion: '1.0.0',
    status: 'complete',
    identity: { ageYears: 30, sex: 'male' },
    body: { heightMm: 1780, currentWeightGrams: 82000, targetWeightGrams: null, weightTargetStatus: 'notCollected' },
    goal: { primaryGoal: 'maintain', secondaryGoal: null, effectiveGoal: 'maintain', minorGoalRestrictions: false },
    training: {
      experienceLevel: band === 'advanced' ? 'advanced' : band === 'intermediate' ? 'intermediate' : 'beginner',
      experienceBand: {
        trainingKnowledge: band,
        recentTrainingExposure: { band: 'consistent', monthsSinceConsistent: 0 },
        currentWorkCapacity: { band, conservative: false },
        consistencyHistory: { band: 'consistent', tenureMonths: 24 },
      },
      returningStatus: 'active',
      consistency: 'steady',
      availableDaysPerWeek: ev.trainingDays,
      sessionDurationMinutes: ev.workoutDuration,
      environment: ev.gymAccess,
      equipmentCapabilities: {},
      movementCompetency: { overhead: null, hinge: null, squatDepth: null, impact: null, standing: null },
      trainingHistory: { trainedBefore: 'years', totalMonthsBucket: 'y3_plus', lastTrainedBucket: 'current', tenureMonths: 24 },
      preferredTrainingStyle: null,
    },
    safety: {
      injuryAreas: areas,
      pastInjuryAreas: [],
      painOnMovement: [],
      reportedPainLevel: null,
      contraindications: areas,
      safetyFlags: [],
      needsClearance: false,
      pregnancyContext: 'notApplicable',
    },
    lifestyle: {},
    evidence: {},
    missingEvidence: [],
  } as unknown as AthleteProfile
}

let parity = 0
for (const g of goldens) {
  const ev = g.profileEvidence.shipping
  const res = buildTrainingPlan(profileFor(g), {
    catalog,
    access: (ev.gymAccess ?? 'full') as GymAccess,
    muscleFocus: (ev.muscleFocus ?? undefined) as MuscleFocus | undefined,
    blocklists: BLOCKLISTS,
  })
  check(`E2E ${g.scenario}: buildTrainingPlan succeeds`, res.ok, res.ok ? '' : `${res.reason}: ${res.detail}`)
  if (!res.ok) continue

  const actual = res.training.days.map((d) => ({
    id: d.dayId,
    exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order, optional: e.optional })),
  }))
  const expected = g.shippingPlan.days.map((d) => ({
    id: d.id,
    exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order, optional: e.optional })),
  }))
  const same = canonicalSerialize(actual) === canonicalSerialize(expected)
  if (same) parity++
  const firstDiff = expected.findIndex((d, i) => canonicalSerialize(d) !== canonicalSerialize(actual[i]))
  check(
    `E2E PARITY ${g.scenario}: wired training.days byte-identical`,
    same,
    same ? '' : `day${firstDiff}: expected ${JSON.stringify(expected[firstDiff]?.exercises.map((e) => e.exerciseId))} got ${JSON.stringify(actual[firstDiff]?.exercises.map((e) => e.exerciseId))}`,
  )
  check(`E2E ${g.scenario}: day count matches`, actual.length === expected.length, `${actual.length} vs ${expected.length}`)
  check(`E2E ${g.scenario}: day kinds match golden ids`, actual.every((d, i) => d.id === expected[i].id))
  check(`E2E ${g.scenario}: versions + manifest present`, res.training.catalogManifestHash.length > 0 && res.training.policyVersion.length > 0)
  check(`E2E ${g.scenario}: eligiblePoolSize reported`, res.training.eligiblePoolSize > 0)
}
check('E2E PARITY TOTAL 17/17 through the wired path', parity === goldens.length, `${parity}/${goldens.length}`)

// ═══ 3. DETERMINISM / PERMUTATION on the WIRED path ════════════════════════
const origTZ = process.env.TZ
for (const g of goldens.slice(0, 6)) {
  const ev = g.profileEvidence.shipping
  const args = { catalog, access: (ev.gymAccess ?? 'full') as GymAccess, muscleFocus: (ev.muscleFocus ?? undefined) as MuscleFocus | undefined, blocklists: BLOCKLISTS }
  const base = buildTrainingPlan(profileFor(g), args)
  if (!base.ok) continue
  const a = canonicalSerialize(base.training.days)

  const rev = buildTrainingPlan(profileFor(g), { ...args, catalog: { ...catalog, exercises: [...catalog.exercises].reverse() } })
  check(`E2E DET ${g.scenario}: catalog reversal => identical`, rev.ok && canonicalSerialize(rev.training.days) === a)

  const revBlock = buildTrainingPlan(profileFor(g), {
    ...args,
    blocklists: { ...BLOCKLISTS, levelCapped: [...BLOCKLISTS.levelCapped].reverse(), freeCable: [...BLOCKLISTS.freeCable].reverse() },
  })
  check(`E2E DET ${g.scenario}: blocklist order reversal => identical`, revBlock.ok && canonicalSerialize(revBlock.training.days) === a)

  // profile evidence key ordering — deep re-key that PRESERVES every key
  // (an earlier draft used a JSON.stringify replacer array, which filters keys
  // recursively and silently amputated training.experienceBand).
  const deepRekey = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(deepRekey)
    if (v !== null && typeof v === 'object') {
      const src = v as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(src).sort().reverse()) out[key] = deepRekey(src[key])
      return out
    }
    return v
  }
  const reordered = deepRekey(profileFor(g)) as AthleteProfile
  check('E2E DET: re-keyed profile preserves nested evidence', reordered.training.experienceBand !== undefined)
  const reo = buildTrainingPlan(reordered, args)
  check(`E2E DET ${g.scenario}: profile key ordering => identical`, reo.ok && canonicalSerialize(reo.training.days) === a)

  for (const tz of ['Europe/Istanbul', 'Europe/Stockholm', 'Pacific/Kiritimati']) {
    process.env.TZ = tz
    const t = buildTrainingPlan(profileFor(g), args)
    check(`E2E DET ${g.scenario}: TZ ${tz} => identical`, t.ok && canonicalSerialize(t.training.days) === a)
  }
  process.env.TZ = origTZ
}

// ═══ 4. FAILURE / INCOMPLETE INPUTS — fail closed, never fabricate ═════════
{
  const g = goldens[0]
  const args = { catalog, access: 'full' as GymAccess, blocklists: BLOCKLISTS }

  const incomplete = buildTrainingPlan({ ...profileFor(g), status: 'incomplete' } as AthleteProfile, args)
  check('FAIL incomplete profile => typed failure', !incomplete.ok && incomplete.reason === 'incompleteProfile', JSON.stringify(incomplete))

  const badEnv = buildTrainingPlan(profileFor(g), { ...args, access: 'space-station' as unknown as GymAccess })
  check('FAIL unknown environment => typed failure', !badEnv.ok && badEnv.reason === 'unknownEnvironment', JSON.stringify(badEnv))

  const p0 = profileFor(g)
  const zeroDays = buildTrainingPlan(
    { ...p0, training: { ...p0.training, availableDaysPerWeek: 0 } } as AthleteProfile,
    args,
  )
  check('FAIL invalid days (0) => typed failure', !zeroDays.ok && zeroDays.reason === 'invalidTrainingDays', JSON.stringify(zeroDays))

  const nullDays = buildTrainingPlan(
    { ...p0, training: { ...p0.training, availableDaysPerWeek: null } } as AthleteProfile,
    args,
  )
  check('FAIL null days => typed failure', !nullDays.ok && nullDays.reason === 'invalidTrainingDays')

  // Everything blocked by constraints ⇒ noEligibleExercises, not a fabricated plan.
  const allIds = catalog.exercises.map((e) => e.exerciseId)
  const blocked = buildTrainingPlan(profileFor(g), {
    ...args,
    blocklists: { injuryByTag: { knee: allIds }, levelCapped: [], freeCable: [] },
  })
  const pWithKnee = profileFor(g)
  const blockedAll = buildTrainingPlan(
    { ...pWithKnee, safety: { ...pWithKnee.safety, injuryAreas: ['knee'], contraindications: ['knee'] } } as AthleteProfile,
    { ...args, blocklists: { injuryByTag: { knee: allIds }, levelCapped: [], freeCable: [] } },
  )
  check('FAIL all exercises blocked => noEligibleExercises', !blockedAll.ok && blockedAll.reason === 'noEligibleExercises', JSON.stringify(blockedAll).slice(0, 120))
  void blocked

  // Counter-assertion: a normal profile must NOT fail-closed.
  const good = buildTrainingPlan(profileFor(g), args)
  check('FAIL counter-assertion: a valid profile still succeeds', good.ok)
}

// ═══ 5. BRIDGE INVARIANTS ══════════════════════════════════════════════════
{
  const g = goldens[0]
  const cap = deriveTrainingCapabilityProfile(profileFor(g))
  check('BRIDGE: tierFromCapability returns a legacy tier', ['beginner', 'novice', 'intermediate', 'advanced'].includes(tierFromCapability(cap)))
  check('BRIDGE: machines-only only for full/small', isMachinesOnly('full') && isMachinesOnly('small') && !isMachinesOnly('home') && !isMachinesOnly('bodyweight'))

  // machine-dominant != machine-only, through the REAL bridge.
  const homePool = buildEligiblePool(catalog, { access: 'home', tier: 'beginner', injuryConstraints: [], blocklists: BLOCKLISTS })
  check('BRIDGE: home pool is non-empty under machine-dominant tier', homePool.ids.length > 0, String(homePool.ids.length))
  check('BRIDGE: home pool is preferMachines but not machinesOnly', homePool.preferMachines && !homePool.machinesOnly)
  const anyNonMachine = homePool.ids.some((id) => !(catalog.exercises.find((e) => e.exerciseId === id)?.equipmentRequired.includes('machine') ?? false))
  check('BRIDGE: machine-dominant != machine-only (non-machine ids survive)', anyNonMachine)

  // exclusions are reported, never silent
  check('BRIDGE: exclusions are reported with reasons', homePool.excluded.length > 0 && homePool.excluded.every((e) => e.reason.length > 0))

  const bwPool = buildEligiblePool(catalog, { access: 'bodyweight', tier: 'beginner', injuryConstraints: [], blocklists: BLOCKLISTS })
  check('BRIDGE: bodyweight pool non-empty', bwPool.ids.length > 0, String(bwPool.ids.length))
  check('BRIDGE: bodyweight pool has no machine-required ids', bwPool.ids.every((id) => !(catalog.exercises.find((e) => e.exerciseId === id)?.equipmentRequired.includes('machine') ?? false)))
}

console.log(`qae-plan-wiring-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
