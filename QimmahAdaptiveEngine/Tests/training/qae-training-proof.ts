// QAE Training Foundation proof ([CTO-QAE-007] §H).
// Metadata completeness · stable IDs · blocklist coverage (legacy ⊆ new, no
// silent loss) · contraindications · equipment eligibility · complexity
// ceilings · fail-safe on missing metadata · deterministic ranking incl.
// permutation test · no question-ID leakage · no localized-name dependence ·
// 17-fixture legacy parity replay · approved-deviation structure.

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { buildAthleteProfile } from '../../Domain/Profile/build'
import type { FactMap } from '../../Domain/Evidence/model'
import type { ExerciseCatalog, ExerciseMetadata } from '../../Domain/Catalog/model'
import { checkCatalogIntegrity } from '../../Domain/Catalog/model'
import { deriveTrainingCapabilityProfile, type TrainingCapabilityProfile } from '../../Domain/Training/capability'
import { DAY_SLOTS } from '../../Domain/Training/requirements'
import {
  selectCandidates,
  selectCandidatesParity,
  type ParityProfileView,
} from '../../Domain/Training/selection'

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

const catalog = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/exercises/exercise-catalog.qae.json'), 'utf8')) as ExerciseCatalog
const rawCatalogText = readFileSync(resolvePath(qaeRoot, 'Contracts/exercises/exercise-catalog.qae.json'), 'utf8')
const migration = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/exercises/blocklist-migration.json'), 'utf8')) as {
  rules: Array<{ ruleId: string; exerciseIds: string[]; presentInCatalog: string[]; absentFromCatalog: string[]; qaeRepresentation: string; confidence: string; source: string; reason: string }>
}
const deviations = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/training/approved-deviations.json'), 'utf8')) as {
  deviations: Array<{ id: string; legacyOutput: string; qaeOutput: string; reason: string; approvalReference: string; affectedFixtures: string }>
}
const legacyDump = JSON.parse(readFileSync(resolvePath(qaeRoot, 'Contracts/content/question-bank.legacy.json'), 'utf8')) as {
  questions: Array<{ id: string }>
}
const byId = new Map(catalog.exercises.map((e) => [e.exerciseId, e]))

// ── §H·1 metadata schema completeness ───────────────────────────────────────
const issues = checkCatalogIntegrity(catalog)
check('catalog structurally complete (zero integrity issues)', issues.length === 0, issues.slice(0, 5).map((i) => `${i.exerciseId}: ${i.issue}`).join(' | '))
check('catalog covers the full legacy library', catalog.exercises.length === catalog.exerciseCount && catalog.exerciseCount >= 180, String(catalog.exercises.length))
const VALID_PATTERNS = new Set(['push', 'pull', 'squat', 'hinge', 'lunge', 'isolation', 'core', 'cardio', 'mobility'])
check('every movementPattern is a closed-enum member', catalog.exercises.every((e) => VALID_PATTERNS.has(e.movementPattern)))
check('every difficulty/stability/fatigue value is 1..3', catalog.exercises.every((e) => [1, 2, 3].includes(e.technicalDifficulty) && [1, 2, 3].includes(e.stabilityDemand) && [1, 2, 3].includes(e.fatigueCost)))
check('every exercise declares ≥1 suitable band and ≥1 progression kind', catalog.exercises.every((e) => e.suitableExperienceBands.length > 0 && e.progressionCompatibility.length > 0))

// ── §H·2 stable IDs ─────────────────────────────────────────────────────────
check('every exerciseId is a canonical slug', catalog.exercises.every((e) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.exerciseId)))
check('exerciseIds unique', new Set(catalog.exercises.map((e) => e.exerciseId)).size === catalog.exercises.length)
check('every alias resolves to a catalog exercise', Object.values(catalog.aliases).every((t) => byId.has(t)))
check('machines-only pool ids all exist in catalog', catalog.primaryMachineIds.every((id) => byId.has(id)))

// ── §H·13 no localized-name dependence ──────────────────────────────────────
check('catalog carries no display-name fields', !rawCatalogText.includes('"nameAr"') && !rawCatalogText.includes('"nameEn"') && !rawCatalogText.includes('"name"'))
check('catalog carries no Arabic text (pure identifiers)', !/[؀-ۿ]/.test(rawCatalogText))

// ── §H·3 blocklist coverage: legacy ⊆ new, no silent loss ───────────────────
const TAG_OF: Record<string, string> = {
  'legacy-injury-knee': 'knee', 'legacy-injury-shoulder': 'shoulder', 'legacy-injury-back': 'lower_back',
  'legacy-injury-wrist': 'wrist', 'legacy-injury-elbow': 'elbow', 'legacy-injury-ankle': 'ankle',
  'legacy-overhead': 'overhead', 'legacy-impact': 'impact',
}
for (const rule of migration.rules) {
  const tag = TAG_OF[rule.ruleId]
  if (tag === undefined) continue
  const uncovered = rule.presentInCatalog.filter((id) => !(byId.get(id)?.contraindications ?? []).includes(tag))
  check(`blocklist ⊆ contraindications: ${rule.ruleId} (${rule.presentInCatalog.length} ids)`, uncovered.length === 0, uncovered.join(','))
  check(`no silent loss: ${rule.ruleId} accounts for every id`, rule.presentInCatalog.length + rule.absentFromCatalog.length === rule.exerciseIds.length)
  check(`${rule.ruleId} has source+reason+confidence`, rule.source.length > 0 && rule.reason.length > 0 && rule.confidence.length > 0)
}
check('migration counts guarded (knee 13 · shoulder 4 · back 9 · wrist 34 · elbow 22 · ankle 12)',
  ['knee:13', 'shoulder:4', 'back:9', 'wrist:34', 'elbow:22', 'ankle:12'].every((s) => {
    const [a, n] = s.split(':')
    return migration.rules.find((r) => r.ruleId === `legacy-injury-${a}`)?.exerciseIds.length === Number(n)
  }))
// Counter-test (§4.2 charter): a neighbouring id must NOT be tagged — the
// mapping is per-id, not per-family.
check('counter: dumbbell-bench-press carries no knee tag', !(byId.get('dumbbell-bench-press')?.contraindications ?? []).includes('knee'))
check('counter: leg-press-machine (kept by legacy knee policy) is NOT knee-tagged', !(byId.get('leg-press-machine')?.contraindications ?? []).includes('knee'))

// ── Build capability profiles from real AthleteProfiles (no question ids) ───
const completeFacts: FactMap = {
  healthConsent: true, age: 30, sex: 'male', heightCm: 178, weightKg: 82,
  trainedBefore: 'never', primaryGoalDisplay: 'general_health', daysPerWeek: 3,
  sessionMinutes: 60, place: 'gym', trainingStyle: 'machines', hasInjury: 'none',
}
const advancedFacts: FactMap = {
  ...completeFacts, trainedBefore: 'years', totalMonths: 'y3_plus', consistency: 'steady',
  lastTrained: 'now', selfLevel: 'advanced', programExperience: 'wrote_own', knowsProgression: 'yes',
  tracksSets: 'always', exerciseFamiliarity: 'all', trainingStyle: 'free_weights',
}
const beginnerProfile = buildAthleteProfile(completeFacts, [], []).profile
const advancedProfile = buildAthleteProfile(advancedFacts, [], []).profile
const beginnerCap = deriveTrainingCapabilityProfile(beginnerProfile)
const advancedCap = deriveTrainingCapabilityProfile(advancedProfile)

check('capability: beginner ceiling 2, machine-dominant policy on', beginnerCap.exerciseComplexityCeiling === 2 && beginnerCap.machineDominantPolicy)
check('capability: advanced ceiling 3, machine-dominant off', advancedCap.exerciseComplexityCeiling === 3 && !advancedCap.machineDominantPolicy)
check('capability: incomplete profile is refused by name', (() => {
  try {
    deriveTrainingCapabilityProfile(buildAthleteProfile({ age: 30 } as FactMap, [], []).profile)
    return false
  } catch (e) {
    return String(e).includes('QAE-TRAINING-INCOMPLETE-PROFILE')
  }
})())

// Injury constraints derive from evidence.
const injuredFacts: FactMap = {
  ...advancedFacts, hasInjury: 'current', 'currentInjuryAreas.knee': true, 'currentInjuryAreas.neck': true,
  'painOnMovement.overhead': true, painLevel: 3,
}
const injuredCap = deriveTrainingCapabilityProfile(buildAthleteProfile(injuredFacts, [], []).profile)
check('capability: knee area + overhead pain → constraint tags', injuredCap.injuryConstraints.includes('knee') && injuredCap.injuryConstraints.includes('overhead'))
check('capability: unmappable area (neck) carried visibly, not dropped', injuredCap.unmappedConstraintAreas.includes('neck'))

// ── §H·4 contraindication exclusion ─────────────────────────────────────────
const CHEST_SLOT = DAY_SLOTS.full[1]
const QUAD_SLOT = DAY_SLOTS.full[0]
const kneeCap: TrainingCapabilityProfile = { ...advancedCap, injuryConstraints: ['knee'] }
const kneeResult = selectCandidates(catalog, kneeCap, QUAD_SLOT)
check('knee constraint excludes every knee-tagged candidate, ruleId names the area',
  kneeResult.excluded.some((e) => e.ruleId === 'legacy-injury-knee') &&
  kneeResult.ranked.every((r) => !(byId.get(r.exerciseId)?.contraindications ?? []).includes('knee')))
check('knee constraint still leaves quad candidates (safe alternatives survive)', kneeResult.ranked.length > 0, String(kneeResult.ranked.length))

// ── §H·5 equipment eligibility ──────────────────────────────────────────────
const homeCap: TrainingCapabilityProfile = {
  ...beginnerCap,
  equipmentCapabilities: { bodyweight: true, dumbbell: true, bench: true },
}
const homeResult = selectCandidates(catalog, homeCap, CHEST_SLOT)
check('home capabilities exclude machine exercises by equipment rule',
  homeResult.excluded.some((e) => e.reason === 'equipment' && byId.get(e.exerciseId)?.loadMedium === 'machine'))
check('home candidates all satisfiable by owned capabilities',
  homeResult.ranked.every((r) => (byId.get(r.exerciseId)?.minimumEquipmentCapability ?? ['x']).every((c) => homeCap.equipmentCapabilities[c] === true)))
const bwCap: TrainingCapabilityProfile = { ...beginnerCap, equipmentCapabilities: { bodyweight: true } }
check('bodyweight-only still yields chest candidates (push-up family)', selectCandidates(catalog, bwCap, CHEST_SLOT).ranked.length > 0)

// ── §H·6/§H·7 complexity ceilings + policy stances ──────────────────────────
const begGym = selectCandidates(catalog, { ...beginnerCap, equipmentCapabilities: Object.fromEntries(['machine', 'cable', 'dumbbell', 'barbell', 'bench', 'band', 'kettlebell', 'smith', 'plate', 'bodyweight'].map((k) => [k, true])) }, CHEST_SLOT)
check('beginner ceiling: no difficulty-3 candidate', begGym.ranked.every((r) => (byId.get(r.exerciseId)?.technicalDifficulty ?? 3) <= 2))
check('beginner machine-dominance is preference not filter: non-machine candidates remain',
  begGym.ranked.some((r) => byId.get(r.exerciseId)?.loadMedium === 'machine') &&
  begGym.ranked.some((r) => byId.get(r.exerciseId)?.loadMedium !== 'machine'))
check('beginner machine-dominance ranks a machine first in a full gym', byId.get(begGym.ranked[0]?.exerciseId ?? '')?.loadMedium === 'machine', begGym.ranked[0]?.exerciseId)
const advGym = selectCandidates(catalog, { ...advancedCap, equipmentCapabilities: Object.fromEntries(['machine', 'cable', 'dumbbell', 'barbell', 'bench', 'band', 'kettlebell', 'smith', 'plate', 'bodyweight'].map((k) => [k, true])) }, QUAD_SLOT)
check('advanced gets difficulty-3 candidates', advGym.ranked.some((r) => byId.get(r.exerciseId)?.technicalDifficulty === 3))
const advNoBarbell = selectCandidates(catalog, { ...advancedCap, equipmentCapabilities: { bodyweight: true, dumbbell: true, bench: true, machine: true, cable: true } }, QUAD_SLOT)
check('advanced without barbell still gets candidates (no mandatory barbell)', advNoBarbell.ranked.length > 0)

// ── §H·9 missing metadata fail-safe ─────────────────────────────────────────
const broken: ExerciseCatalog = {
  ...catalog,
  exercises: catalog.exercises.map((e) =>
    e.exerciseId === 'chest-press-machine' ? ({ ...e, contraindications: undefined } as unknown as ExerciseMetadata) : e),
}
const brokenResult = selectCandidates(broken, beginnerCap, CHEST_SLOT)
check('missing metadata ⇒ fail-safe ineligible by name, never a guess',
  brokenResult.excluded.some((e) => e.exerciseId === 'chest-press-machine' && e.reason === 'missing_metadata') &&
  brokenResult.ranked.every((r) => r.exerciseId !== 'chest-press-machine'))

// ── §H·10/§H·11 determinism + permutation ───────────────────────────────────
const r1 = selectCandidates(catalog, advancedCap, CHEST_SLOT)
const r2 = selectCandidates(catalog, advancedCap, CHEST_SLOT)
check('same inputs ⇒ identical ranking', JSON.stringify(r1.ranked) === JSON.stringify(r2.ranked))
const permuted: ExerciseCatalog = { ...catalog, exercises: [...catalog.exercises].reverse() }
const r3 = selectCandidates(permuted, advancedCap, CHEST_SLOT)
check('catalog registration order permuted ⇒ byte-identical ranking', JSON.stringify(r1.ranked) === JSON.stringify(r3.ranked))
const shuffledCaps: TrainingCapabilityProfile = {
  ...advancedCap,
  equipmentCapabilities: Object.fromEntries(Object.entries(advancedCap.equipmentCapabilities).reverse()),
}
check('capability key insertion order permuted ⇒ identical ranking', JSON.stringify(selectCandidates(catalog, shuffledCaps, CHEST_SLOT).ranked) === JSON.stringify(r1.ranked))
const parityPermuted = selectCandidatesParity(permuted, {
  place: 'gym', equipment: ['machine', 'cable', 'dumbbell', 'barbell', 'bench', 'bodyweight'], excludedExercises: [],
  activeLimitationAreas: [], needsClearance: false, excludedPatterns: [], excludedMuscles: [], noOverhead: false,
  noImpact: false, maxExerciseLevel: 'advanced', primaryGoal: 'bulk', preferredExercises: [], trainingStyle: 'mixed',
  musclePriorities: [], requiredPatterns: [],
})
const parityStraight = selectCandidatesParity(catalog, {
  place: 'gym', equipment: ['machine', 'cable', 'dumbbell', 'barbell', 'bench', 'bodyweight'], excludedExercises: [],
  activeLimitationAreas: [], needsClearance: false, excludedPatterns: [], excludedMuscles: [], noOverhead: false,
  noImpact: false, maxExerciseLevel: 'advanced', primaryGoal: 'bulk', preferredExercises: [], trainingStyle: 'mixed',
  musclePriorities: [], requiredPatterns: [],
})
check('PARITY mode also registration-order invariant', JSON.stringify(parityPermuted.ranked) === JSON.stringify(parityStraight.ranked))

// ── §H·12 no question-ID leakage ────────────────────────────────────────────
const questionIds = legacyDump.questions.map((q) => q.id)
const leaks: string[] = []
for (const dir of ['Domain/Training', 'Domain/Catalog']) {
  for (const f of readdirSync(resolvePath(qaeRoot, dir))) {
    const src = readFileSync(join(resolvePath(qaeRoot, dir), f), 'utf8')
    for (const id of questionIds) {
      if (src.includes(`'${id}'`) || src.includes(`"${id}"`)) leaks.push(`${dir}/${f}: ${id}`)
    }
  }
}
for (const file of ['Contracts/exercises/exercise-catalog.qae.json', 'Contracts/training/approved-deviations.json', 'Contracts/training/training-capability.schema.json']) {
  const src = readFileSync(resolvePath(qaeRoot, file), 'utf8')
  for (const id of questionIds) if (src.includes(`"${id}"`)) leaks.push(`${file}: ${id}`)
}
check('Training/Catalog domains + training contracts contain zero question ids', leaks.length === 0, leaks.slice(0, 5).join(' | '))

// ── §H·14 legacy parity fixtures (17 goldens) ───────────────────────────────
interface TrainingGolden {
  scenario: string
  profileEvidence: {
    personalization: {
      place: string
      equipment: string[]
      trainingStyle: string
      maxExerciseLevel: 'beginner' | 'intermediate' | 'advanced'
      requiredPatterns: string[]
      excludedPatterns: string[]
      excludedMuscles: string[]
      noOverhead: boolean
      noImpact: boolean
      needsClearance: boolean
      limitations: Array<{ area: string; kind: string; active: boolean }>
      excludedExercises: string[]
      preferredExercises: string[]
      musclePriorities: string[]
      primaryGoal: 'cut' | 'bulk' | 'maintain'
    }
  }
  candidateSelection: {
    ranked: Array<{ id: string; score: number; parts: Record<string, number> }>
    excluded: Array<{ id: string; reason: string }>
  }
}

const goldenDir = resolvePath(qaeRoot, 'Fixtures/golden/training')
const goldenFiles = readdirSync(goldenDir).filter((f) => f.endsWith('.golden.json')).sort()
check('all 17 training goldens present', goldenFiles.length === 17, String(goldenFiles.length))

const LEGACY_REASON_OF: Record<string, string> = {
  'legacy-user-excluded': 'user_excluded',
  'legacy-environment': 'environment',
  'legacy-equipment-gate': 'equipment',
  'legacy-safety-pattern': 'safety_pattern',
  'legacy-safety-muscle': 'safety_muscle',
  'legacy-safety-area-touch': 'safety_muscle',
  'legacy-overhead': 'overhead',
  'legacy-impact': 'impact',
  'legacy-level-cap': 'level_cap',
}

let d1SequenceDifferences = 0
for (const file of goldenFiles) {
  const g = JSON.parse(readFileSync(join(goldenDir, file), 'utf8')) as TrainingGolden
  const p = g.profileEvidence.personalization
  const view: ParityProfileView = {
    place: p.place as ParityProfileView['place'],
    equipment: p.equipment,
    excludedExercises: p.excludedExercises,
    activeLimitationAreas: p.limitations.filter((l) => l.active).map((l) => l.area),
    needsClearance: p.needsClearance,
    excludedPatterns: p.excludedPatterns,
    excludedMuscles: p.excludedMuscles,
    noOverhead: p.noOverhead,
    noImpact: p.noImpact,
    maxExerciseLevel: p.maxExerciseLevel,
    primaryGoal: p.primaryGoal,
    preferredExercises: p.preferredExercises,
    trainingStyle: p.trainingStyle as ParityProfileView['trainingStyle'],
    musclePriorities: p.musclePriorities,
    requiredPatterns: p.requiredPatterns,
  }
  const result = selectCandidatesParity(catalog, view)

  // Exclusions: exact multiset over (id, legacy reason vocabulary).
  const gotExcl = result.excluded.map((e) => `${e.exerciseId}|${LEGACY_REASON_OF[e.ruleId] ?? e.reason}`).sort()
  const wantExcl = g.candidateSelection.excluded.map((e) => `${e.id}|${e.reason}`).sort()
  check(`parity ${g.scenario}: exclusion multiset identical (${wantExcl.length})`, JSON.stringify(gotExcl) === JSON.stringify(wantExcl),
    `first diff: got ${gotExcl.find((x, i) => x !== wantExcl[i]) ?? '-'} want ${wantExcl.find((x, i) => x !== gotExcl[i]) ?? '-'}`)

  // Ranked: same candidates with same scores and parts.
  const gotScores = new Map(result.ranked.map((r) => [r.exerciseId, r.scoreCenti]))
  const scoreMismatch = g.candidateSelection.ranked.filter((r) => gotScores.get(r.id) !== r.score * 100)
  check(`parity ${g.scenario}: every candidate scores identically (${g.candidateSelection.ranked.length})`,
    result.ranked.length === g.candidateSelection.ranked.length && scoreMismatch.length === 0,
    scoreMismatch.slice(0, 3).map((r) => `${r.id}: want ${r.score * 100} got ${gotScores.get(r.id)}`).join(' | '))
  const partsOk = g.candidateSelection.ranked.every((r) => {
    const mine = result.ranked.find((x) => x.exerciseId === r.id)
    return mine !== undefined && JSON.stringify(Object.fromEntries(Object.entries(mine.parts).sort())) === JSON.stringify(Object.fromEntries(Object.entries(r.parts).sort()))
  })
  check(`parity ${g.scenario}: score parts decompose identically`, partsOk)

  // Ordering: exact sequence, else D1 (locale tie-break) — score buckets must
  // still match as sets; anything beyond a within-bucket permutation FAILS.
  const gotSeq = result.ranked.map((r) => r.exerciseId)
  const wantSeq = g.candidateSelection.ranked.map((r) => r.id)
  if (JSON.stringify(gotSeq) !== JSON.stringify(wantSeq)) {
    d1SequenceDifferences++
    const bucket = (list: Array<{ id: string; score: number }>): string =>
      JSON.stringify([...list].sort((a, b) => (b.score !== a.score ? b.score - a.score : 0)).reduce<Record<number, string[]>>((acc, r) => {
        const bucketList = acc[r.score] ?? []
        bucketList.push(r.id)
        acc[r.score] = bucketList
        return acc
      }, {}), (_, v) => (Array.isArray(v) ? [...v].sort() : v))
    const gotBuckets = bucket(result.ranked.map((r) => ({ id: r.exerciseId, score: r.scoreCenti })))
    const wantBuckets = bucket(g.candidateSelection.ranked.map((r) => ({ id: r.id, score: r.score * 100 })))
    check(`parity ${g.scenario}: sequence differs only within equal-score buckets (D1)`, gotBuckets === wantBuckets)
  } else {
    check(`parity ${g.scenario}: candidate sequence byte-identical`, true)
  }
}
console.log(`parity: D1 (tie-break) sequence differences observed in ${d1SequenceDifferences}/17 fixtures`)

// ── §H·15 approved-deviation structure ──────────────────────────────────────
// [CTO-QAE-013] The approval check asserts the SHAPE of a numbered CTO
// reference, not one specific wave number. Pinning it to [CTO-QAE-007] made a
// later wave's deviation (D6) fail a structural test for the wrong reason —
// the entry was fully formed and properly approved. Requiring the numbered
// pattern keeps the guarantee (no deviation without a traceable approval)
// while admitting deviations approved by any numbered directive.
check('every deviation carries legacy output + QAE output + reason + approval + fixtures',
  deviations.deviations.every((d) => d.legacyOutput.length > 0 && d.qaeOutput.length > 0 && d.reason.length > 0 && /\[CTO-QAE-\d+\]/.test(d.approvalReference) && d.affectedFixtures.length > 0))
check('deviation register covers D1–D6', ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].every((p) => deviations.deviations.some((d) => d.id.startsWith(p))))
// Counter-assertion: an unapproved-looking reference must still fail the shape.
check('deviation approval shape rejects an unnumbered reference',
  !/\[CTO-QAE-\d+\]/.test('approved verbally'))
// Every qae-* ruleId the pipeline can emit is covered by a deviation entry (D3).
check('QAE-only stages are covered by the deviation register', deviations.deviations.some((d) => d.id === 'D3-staged-pipeline'))

console.log(`qae-training-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
