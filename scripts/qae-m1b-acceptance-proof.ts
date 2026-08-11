// [CTO-QAE-023] M1b — real-profile + shadow-plan acceptance.
//
// Every persona below enters through the ACTUAL product contract:
//
//   V2OnboardingChoices → toAnswersFromV2 → buildOnboardingProfile
//     → toLegacyProfile → Profile → buildAthleteProfileAttempt
//     → buildRealAthleteProfile → buildTrainingPlan → prescribeInitialPlan
//
// Nothing here hand-builds an AthleteProfile. That is the point: M0/M1a could
// pass while the app still could not produce a plannable profile, because the
// proofs fed the engine objects the app never makes. A persona that cannot be
// expressed as onboarding answers is not a persona this app has.

import type { Profile } from '@/types/profile'
import type { WorkoutPlan } from '@/types/workout'
import type { OnboardingProfile } from '@/types/onboarding'
import { generatePlan } from '@/lib/planGenerator'
import { toAnswersFromV2, type V2OnboardingChoices } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import {
  TRAINING_BLOCKLISTS,
  buildAthleteProfileAttempt,
  buildQaeFacts,
  buildRealAthleteProfile,
  runShadowComparison,
  type ShadowComparison,
} from '@/lib/qae/shadow'
import {
  DRAFT_VERSION,
  HISTORY_STEP,
  clearDraftV2,
  loadDraftV2,
  saveDraftV2,
  type OnboardingV2Draft,
} from '@/lib/onboardingV2Flow'
import { ONBOARDING_KEY } from '@/lib/onboarding'
import catalogJson from '@qae/Contracts/exercises/exercise-catalog.qae.json'
import type { ExerciseCatalog } from '@qae/Domain/Catalog/model'
import { buildTrainingPlan } from '@qae/Domain/Training/plan'
import { exercises as liveExercises } from '@/data/exercises'

const catalog = catalogJson as unknown as ExerciseCatalog

/**
 * Injected by the runner, which greps `src/` for an import of the shadow module.
 * Computed OUTSIDE the bundle on purpose: a bundled proof cannot see the source
 * tree, and a self-reported "nothing imports me" would be worthless.
 */
declare const __APP_IMPORTS_SHADOW__: boolean
const APP_IMPORTS_SHADOW = __APP_IMPORTS_SHADOW__

let passed = 0
let failed = 0
const failures: string[] = []
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// The real chain, in one place.
// ════════════════════════════════════════════════════════════════════════════

const baseChoices: V2OnboardingChoices = {
  goal: 'maintain', days: 4, duration: 60, place: 'gym', pref: 'mixed',
  injuries: [], healthDataConsent: true,
  age: 30, gender: 'male', heightCm: 178, weightKg: 82,
  intent: 'plan', level: 'intermediate', trainingYears: 2,
  trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady',
}

function chainToOnboardingProfile(over: Partial<V2OnboardingChoices>): OnboardingProfile {
  return buildOnboardingProfile(toAnswersFromV2({ ...baseChoices, ...over }))
}
function chainToProfile(over: Partial<V2OnboardingChoices>): Profile {
  return toLegacyProfile(chainToOnboardingProfile(over))
}

interface Persona {
  id: string
  name: string
  /** onboarding answers, or a post-chain mutation for the legacy cases */
  choices?: Partial<V2OnboardingChoices>
  mutate?: (p: Profile) => Profile
}

/**
 * Persona X: an account completed BEFORE M1a/M1b. Modelled by stripping the
 * fields a pre-wave client never wrote — not by inventing a Profile shape. This
 * is what actually sits in those users' storage today.
 */
const stripPreWaveFields = (p: Profile): Profile => {
  const { trainingHistory: _h, trainingStyle: _s, healthDataConsent: _c, ...rest } = p
  void _h; void _s; void _c
  return rest as Profile
}

const PERSONAS: Persona[] = [
  { id: 'A', name: 'never trained / gym', choices: { level: 'beginner', trainingYears: null, place: 'gym', trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null } },
  { id: 'B', name: 'never trained / home', choices: { level: 'beginner', trainingYears: null, place: 'home', trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null } },
  { id: 'C', name: 'trained <3m / active now', choices: { level: 'beginner', trainedBefore: 'tried', totalMonths: 'lt3', lastTrained: 'now', consistency: 'on_off' } },
  { id: 'D', name: 'trained 3-12m / active now', choices: { level: 'intermediate', trainedBefore: 'months', totalMonths: 'm6_12', lastTrained: 'now', consistency: 'mostly' } },
  { id: 'E', name: 'trained 1-3y / active', choices: { level: 'intermediate', trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'w2', consistency: 'mostly' } },
  { id: 'F', name: 'trained 3y+ / highly consistent', choices: { level: 'advanced', trainingYears: 6, trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'now', consistency: 'steady' } },
  { id: 'G', name: 'trained / inactive <3m', choices: { level: 'intermediate', trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'm1_3', consistency: 'mostly' } },
  { id: 'H', name: 'trained / inactive 3-12m', choices: { level: 'intermediate', trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'm3_12', consistency: 'mostly' } },
  { id: 'I', name: 'returning after >12m', choices: { level: 'advanced', trainingYears: 5, trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'y1_plus', consistency: 'steady' } },
  { id: 'J', name: 'inconsistent / on-off', choices: { level: 'intermediate', trainedBefore: 'months', totalMonths: 'm3_6', lastTrained: 'w2', consistency: 'on_off' } },
  { id: 'K', name: 'steady consistent', choices: { level: 'intermediate', trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'now', consistency: 'steady' } },
  { id: 'L', name: 'knee injury', choices: { injuries: ['knee'] } },
  { id: 'M', name: 'shoulder injury', choices: { injuries: ['shoulder'] } },
  { id: 'N', name: 'lower-back injury', choices: { injuries: ['lower_back'] } },
  { id: 'O', name: 'multiple injuries', choices: { injuries: ['knee', 'shoulder', 'lower_back'] } },
  { id: 'P', name: 'no injuries', choices: { injuries: [] } },
  { id: 'Q', name: 'short session (30m)', choices: { duration: 30 } },
  { id: 'R', name: 'long session (75m)', choices: { duration: 75 } },
  { id: 'S', name: '3 days', choices: { days: 3 } },
  { id: 'T', name: '4 days', choices: { days: 4 } },
  { id: 'U', name: '5 days', choices: { days: 5 } },
  { id: 'V', name: '6 days', choices: { days: 6 } },
  { id: 'W', name: 'minor user (15)', choices: { age: 15, goal: 'maintain', level: 'beginner', trainingYears: null, trainedBefore: 'tried', totalMonths: 'lt3', lastTrained: 'now', consistency: 'on_off' } },
  { id: 'X', name: 'legacy completed user (no M1a/M1b fields)', mutate: stripPreWaveFields },
  { id: 'Z1', name: 'machines-only environment', choices: { place: 'machines', pref: 'machines' } },
  { id: 'Z2', name: 'home + cut goal + female', choices: { place: 'home', goal: 'cut', gender: 'female', heightCm: 165, weightKg: 62 } },
  { id: 'Z3', name: 'bulk goal / advanced / 6 days', choices: { goal: 'bulk', level: 'advanced', trainingYears: 8, days: 6, duration: 75, trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'now', consistency: 'steady' } },
  { id: 'Z4', name: 'never trained / machines-only', choices: { level: 'beginner', trainingYears: null, place: 'machines', pref: 'machines', trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null } },
]

interface Row {
  persona: Persona
  profile: Profile
  live: WorkoutPlan | null
  liveError: string | null
  attempt: ReturnType<typeof buildAthleteProfileAttempt>
  athleteStatus: string
  cmp: ShadowComparison
  qaeOk: boolean
}

const rows: Row[] = []

for (const persona of PERSONAS) {
  const built = chainToProfile(persona.choices ?? {})
  const profile = persona.mutate ? persona.mutate(built) : built

  let live: WorkoutPlan | null = null
  let liveError: string | null = null
  try {
    live = generatePlan(profile).workoutPlan
  } catch (err) {
    liveError = String(err)
  }

  const attempt = buildAthleteProfileAttempt(profile)
  const athleteStatus = buildRealAthleteProfile(profile).profile.status
  const cmp = runShadowComparison(profile, live ?? { templateId: 'none', days: [] })
  const qaeOk = cmp.classification !== 'qaeFailed' && cmp.qaeDayCount > 0

  rows.push({ persona, profile, live, liveError, attempt, athleteStatus, cmp, qaeOk })
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n① مصفوفة الشخصيات — عبر السلسلة الحقيقية')
console.log(
  '  ' +
    'id '.padEnd(4) + 'persona'.padEnd(42) + 'trainComplete'.padEnd(14) + 'athlete'.padEnd(11) +
    'returning'.padEnd(13) + 'capacity'.padEnd(20) + 'consist'.padEnd(10) + 'injuries'.padEnd(24) +
    'pool'.padEnd(6) + 'qae'.padEnd(5) + 'live'.padEnd(6) + 'classification',
)
for (const r of rows) {
  const real = buildRealAthleteProfile(r.profile).profile
  const cap = real.training.experienceBand.currentWorkCapacity
  console.log(
    '  ' +
      r.persona.id.padEnd(4) +
      r.persona.name.slice(0, 41).padEnd(42) +
      String(r.attempt.trainingCompleteness.completeForTraining).padEnd(14) +
      r.athleteStatus.padEnd(11) +
      String(real.training.returningStatus).padEnd(13) +
      `${cap.band}/${cap.conservative ? 'cons' : 'norm'}`.padEnd(20) +
      String(real.training.consistency ?? '—').padEnd(10) +
      (real.safety.injuryAreas.join(',') || '—').padEnd(24) +
      String(r.cmp.qaeEligiblePoolSize).padEnd(6) +
      (r.qaeOk ? 'ok' : 'NO').padEnd(5) +
      (r.live ? `${r.live.days.length}d` : 'FAIL').padEnd(6) +
      r.cmp.classification,
  )
}

console.log('\n  missing Training-required fields (only where non-empty):')
for (const r of rows) {
  const m = r.attempt.trainingCompleteness.missingRequired
  if (m.length > 0) console.log(`    ${r.persona.id} ${r.persona.name}: ${m.join(', ')}`)
}

// ── Per-persona invariants ──────────────────────────────────────────────────
console.log('\n② ثوابت لكل شخصية')
for (const r of rows) {
  const tag = `${r.persona.id} ${r.persona.name}`
  check(`${tag}: LIVE plan built`, r.live !== null && r.live.days.length > 0, r.liveError ?? '')
  check(`${tag}: shadow never threw`, r.cmp.classification !== 'qaeFailed', r.cmp.detail)
  if (r.persona.id !== 'X') {
    check(`${tag}: AthleteProfile is complete`, r.athleteStatus === 'complete', `missingEvidence=${buildRealAthleteProfile(r.profile).profile.dataQuality.missingEvidence.join(',')}`)
    check(`${tag}: Training contract complete`, r.attempt.trainingCompleteness.completeForTraining, r.attempt.trainingCompleteness.missingRequired.join(','))
    check(`${tag}: QAE produced a plan`, r.qaeOk, r.cmp.detail)
    check(`${tag}: QAE day count == requested days`, r.cmp.qaeDayCount === (r.persona.choices?.days ?? baseChoices.days), `${r.cmp.qaeDayCount}`)
  }
}

// ── §12 acceptance counters ─────────────────────────────────────────────────
const nonLegacy = rows.filter((r) => r.persona.id !== 'X')
const completeProfiles = nonLegacy.filter((r) => r.attempt.trainingCompleteness.completeForTraining)
const qaeSuccess = completeProfiles.filter((r) => r.qaeOk)
const qaeFailuresOnComplete = completeProfiles.filter((r) => !r.qaeOk)
const unexpected = rows.filter((r) => r.cmp.classification === 'unexpectedDeviation')

// ════════════════════════════════════════════════════════════════════════════
console.log('\n③ الأمان يسبق التطابق')
{
  const injuryPersonas = rows.filter((r) => (r.persona.choices?.injuries?.length ?? 0) > 0)
  check('injury personas exist in the matrix', injuryPersonas.length >= 4)

  let violations = 0
  for (const r of injuryPersonas) {
    const tag = `${r.persona.id} ${r.persona.name}`
    const areas = r.persona.choices?.injuries ?? []
    const real = buildRealAthleteProfile(r.profile).profile
    check(`${tag}: injury areas reached the AthleteProfile`, areas.every((a) => real.safety.injuryAreas.includes(a)), real.safety.injuryAreas.join(','))

    // Rebuild the QAE plan and assert NO contraindicated exercise entered it.
    const planResult = buildTrainingPlan(real, {
      catalog,
      access: (r.profile.gymAccess ?? 'full') as 'full' | 'small' | 'home' | 'bodyweight',
      blocklists: TRAINING_BLOCKLISTS,
    })
    check(`${tag}: QAE plan built for an injured athlete`, planResult.ok, planResult.ok ? '' : planResult.reason)
    if (!planResult.ok) continue

    const qaeIds = planResult.training.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    const banned = areas.flatMap((a) => TRAINING_BLOCKLISTS.injuryByTag[a] ?? [])
    const leaked = qaeIds.filter((id) => banned.includes(id))
    if (leaked.length > 0) violations++
    check(`${tag}: NO contraindicated exercise entered the QAE plan`, leaked.length === 0, leaked.join(','))

    // The other direction: if LIVE kept a contraindicated exercise, the shadow
    // must NOT call that parity — it must be an expectedDeviation naming a rule.
    const liveIds = (r.live?.days ?? []).flatMap((d) => d.exercises.map((e) => e.exerciseId))
    const liveLeak = liveIds.filter((id) => banned.includes(id))
    if (liveLeak.length > 0) {
      check(
        `${tag}: LIVE contraindication is flagged, not silently accepted`,
        r.cmp.classification === 'expectedDeviation' && r.cmp.safetyRuleIds.length > 0,
        `classification=${r.cmp.classification} live-leak=${liveLeak.join(',')}`,
      )
    }
  }
  check('SAFETY VIOLATIONS == 0', violations === 0, String(violations))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n④ قبول «ما تمرّن قط» عبر بيئات متعدّدة')
{
  const neverIds = ['A', 'B', 'Z4']
  for (const id of neverIds) {
    const r = rows.find((x) => x.persona.id === id)
    if (!r) { check(`never persona ${id} exists`, false); continue }
    const tag = `${id} ${r.persona.name}`
    const real = buildRealAthleteProfile(r.profile).profile

    check(`${tag}: completeForTraining`, r.attempt.trainingCompleteness.completeForTraining, r.attempt.trainingCompleteness.missingRequired.join(','))
    check(`${tag}: returningStatus === neverTrained`, real.training.returningStatus === 'neverTrained', String(real.training.returningStatus))
    check(`${tag}: capacity conservative`, real.training.experienceBand.currentWorkCapacity.conservative)
    check(`${tag}: no fabricated totalMonths`, real.training.trainingHistory.totalMonthsBucket === null, String(real.training.trainingHistory.totalMonthsBucket))
    check(`${tag}: no fabricated lastTrained`, real.training.trainingHistory.lastTrainedBucket === null, String(real.training.trainingHistory.lastTrainedBucket))
    check(`${tag}: no fabricated tenure`, real.training.experienceBand.consistencyHistory.tenureMonths === 0)
    check(`${tag}: exposure band none`, real.training.experienceBand.recentTrainingExposure.band === 'none')
    check(`${tag}: QAE produced a valid plan`, r.qaeOk, r.cmp.detail)

    // No returning-only logic may fire.
    const codes = r.cmp.prescription?.reasonCodes ?? []
    check(`${tag}: no returning-only prescription code fired`,
      !codes.includes('prescription.returningVolumeReduced') && !codes.includes('prescription.returningRirIncreased'),
      codes.join(','))

    // No advanced-only exercise leakage: beginner tier caps complexity.
    const planResult = buildTrainingPlan(real, { catalog, access: (r.profile.gymAccess ?? 'full') as 'full', blocklists: TRAINING_BLOCKLISTS })
    if (planResult.ok) {
      const ids = planResult.training.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
      const byId = new Map(catalog.exercises.map((e) => [e.exerciseId, e]))
      const tooHard = ids.filter((i) => (byId.get(i)?.technicalDifficulty ?? 1) > 2)
      check(`${tag}: no advanced-complexity exercise leaked to a beginner`, tooHard.length === 0, tooHard.join(','))
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑤ F2 — «العائد» من إجابات المنتج الحقيقية لا من fixtures')
{
  const r = rows.find((x) => x.persona.id === 'I')
  if (!r) check('returning persona I exists', false)
  else {
    const real = buildRealAthleteProfile(r.profile).profile
    check('I: returningStatus === returning', real.training.returningStatus === 'returning', String(real.training.returningStatus))
    check('I: completeForTraining', r.attempt.trainingCompleteness.completeForTraining, r.attempt.trainingCompleteness.missingRequired.join(','))
    check('I: planningClass === returning', real.training.experienceLevel === 'returning', String(real.training.experienceLevel))

    // Classification-critical evidence (bank-config Policy B2) all present.
    const facts = buildQaeFacts(r.profile)
    for (const key of ['trainedBefore', 'totalMonths', 'lastTrained', 'consistency']) {
      check(`I: classification-critical evidence present — ${key}`, key in facts, JSON.stringify(Object.keys(facts)))
    }

    check('I: capacity is conservative (a break lowers capacity, not knowledge)', real.training.experienceBand.currentWorkCapacity.conservative)
    check('I: knowledge retained despite the layoff', real.training.experienceBand.trainingKnowledge === 'advanced', real.training.experienceBand.trainingKnowledge)
    check('I: exposure band none (detrained)', real.training.experienceBand.recentTrainingExposure.band === 'none')
    check('I: months-since-consistent is measured, not zero', real.training.experienceBand.recentTrainingExposure.monthsSinceConsistent > 0)
    check('I: QAE plan builds', r.qaeOk, r.cmp.detail)

    // Returning budget semantics must actually fire in the prescription.
    const codes = r.cmp.prescription?.reasonCodes ?? []
    check('I: returning budget semantics respected (a returning code fired)',
      codes.includes('prescription.returningVolumeReduced') || codes.includes('prescription.returningRirIncreased'),
      codes.join(','))

    // fatigueCeiling must be the conservative 2 for a returning athlete.
    const active = rows.find((x) => x.persona.id === 'F')
    if (active) {
      const activeReal = buildRealAthleteProfile(active.profile).profile
      check('I vs F: returning differs from highly-active on returningStatus',
        real.training.returningStatus !== activeReal.training.returningStatus,
        `${real.training.returningStatus} vs ${activeReal.training.returningStatus}`)
      const rSets = r.cmp.prescription?.totalWorkingSets ?? 0
      const fSets = active.cmp.prescription?.totalWorkingSets ?? 0
      check('I vs F: returning volume is not higher than the active athlete', rSets <= fSets, `returning=${rSets} active=${fSets}`)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑥ المستخدم القديم — لا انحدار')
{
  const r = rows.find((x) => x.persona.id === 'X')
  if (!r) check('legacy persona X exists', false)
  else {
    check('X: LIVE plan still builds', r.live !== null && r.live.days.length > 0)
    check('X: no crash from the shadow path', r.cmp.classification !== 'qaeFailed', r.cmp.detail)
    check('X: QAE reports incomplete, by name', r.cmp.classification === 'qaeIncompleteProfile', r.cmp.classification)
    check('X: missing fields are named', r.cmp.missingTrainingRequired.length > 0, r.cmp.missingTrainingRequired.join(','))
    check('X: no fabricated history inserted into the Profile', r.profile.trainingHistory === undefined)
    check('X: no fabricated trainingStyle inserted', r.profile.trainingStyle === undefined)
    check('X: no fabricated consent inserted', r.profile.healthDataConsent === undefined)

    // The LIVE plan a legacy user gets is IDENTICAL with and without the shadow.
    const before = JSON.stringify(r.live)
    runShadowComparison(r.profile, r.live as WorkoutPlan)
    check('X: LIVE plan byte-identical after running the shadow', JSON.stringify(r.live) === before)

    // And identical to the same profile generated with no shadow involvement.
    const fresh = generatePlan(r.profile).workoutPlan
    check('X: LIVE plan is deterministic and unmutated', JSON.stringify(fresh) === before)
  }

  // A legacy profile must never be silently upgraded by passing through QAE.
  const legacyProfile = stripPreWaveFields(chainToProfile({}))
  const snapshot = JSON.stringify(legacyProfile)
  buildAthleteProfileAttempt(legacyProfile)
  buildRealAthleteProfile(legacyProfile)
  check('legacy Profile object is not mutated by the adapter', JSON.stringify(legacyProfile) === snapshot)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑦ الثبات في التخزين + انتقال trained → never → trained')
{
  clearDraftV2(null)
  const draft: OnboardingV2Draft = {
    step: HISTORY_STEP, age: 30, gender: 'male', heightCm: 178, weightKg: 82,
    intent: 'plan', level: 'intermediate', trainingYears: 2,
    trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'm3_12', consistency: 'mostly',
    goal: 'cut', days: 4, duration: 60, place: 'gym', pref: 'mixed',
    hasInjury: false, injuries: [], healthDataConsent: true,
  }
  saveDraftV2(draft, null)
  const reloaded = loadDraftV2(null)
  check('persist: reload keeps all four history answers',
    reloaded?.trainedBefore === 'years' && reloaded?.totalMonths === 'y1_3' &&
    reloaded?.lastTrained === 'm3_12' && reloaded?.consistency === 'mostly')

  // next/back — the view rewrites the draft on each step change.
  saveDraftV2({ ...draft, step: 5 }, null)
  saveDraftV2({ ...draft, step: HISTORY_STEP }, null)
  const afterNav = loadDraftV2(null)
  check('persist: next/back keeps the answers', afterNav?.lastTrained === 'm3_12' && afterNav?.consistency === 'mostly')

  // completion → Profile round-trip
  const completed = chainToProfile({ trainedBefore: 'years', totalMonths: 'y1_3', lastTrained: 'm3_12', consistency: 'mostly' })
  check('persist: completion carries history into the Profile',
    completed.trainingHistory?.trainedBefore === 'years' &&
    completed.trainingHistory?.totalMonths === 'y1_3' &&
    completed.trainingHistory?.lastTrained === 'm3_12' &&
    completed.trainingHistory?.consistency === 'mostly')
  check('persist: completion carries trainingStyle into the Profile', completed.trainingStyle === 'mixed')
  check('persist: completion carries health consent into the Profile', completed.healthDataConsent === true)

  // ── THE COUNTER-TEST: trained → never → trained ───────────────────────────
  //
  // The hazard is a STALE ANSWER RESURRECTING. A user answers the follow-ups,
  // switches to "never" (which must clear them), then switches back to
  // "trained" — the cleared answers must NOT reappear, because the user has not
  // re-answered them. If they did, the plan would rest on numbers the user
  // believes they erased.
  const trained: OnboardingV2Draft = { ...draft, trainedBefore: 'years', totalMonths: 'y3_plus', lastTrained: 'y1_plus', consistency: 'steady' }
  saveDraftV2(trained, null)
  check('transition: trained state stored', loadDraftV2(null)?.totalMonths === 'y3_plus')

  // The view's `onTrainedBefore` clears the follow-ups when 'never' is chosen.
  const never: OnboardingV2Draft = { ...trained, trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null }
  saveDraftV2(never, null)
  const neverLoaded = loadDraftV2(null)
  check('transition: switching to never CLEARS the follow-ups in storage',
    neverLoaded?.totalMonths === null && neverLoaded?.lastTrained === null && neverLoaded?.consistency === null,
    JSON.stringify({ t: neverLoaded?.totalMonths, l: neverLoaded?.lastTrained, c: neverLoaded?.consistency }))

  const neverProfile = chainToProfile({ trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null })
  check('transition: never-state Profile carries NO stale buckets',
    neverProfile.trainingHistory?.totalMonths === undefined &&
    neverProfile.trainingHistory?.lastTrained === undefined &&
    neverProfile.trainingHistory?.consistency === undefined)

  // Back to trained — the follow-ups must be UNANSWERED again, not restored.
  const backToTrained: OnboardingV2Draft = { ...neverLoaded as OnboardingV2Draft, trainedBefore: 'years' }
  saveDraftV2(backToTrained, null)
  const restored = loadDraftV2(null)
  check('transition: switching back to trained does NOT resurrect stale answers',
    restored?.totalMonths === null && restored?.lastTrained === null && restored?.consistency === null,
    JSON.stringify({ t: restored?.totalMonths, l: restored?.lastTrained, c: restored?.consistency }))
  check('transition: the incomplete trained state is INCOMPLETE for Training',
    !buildAthleteProfileAttempt(chainToProfile({ trainedBefore: 'years', totalMonths: null, lastTrained: null, consistency: null }))
      .trainingCompleteness.completeForTraining)
  clearDraftV2(null)

  // ── Old draft (v5) resumes and completes honestly ─────────────────────────
  saveDraftV2(draft, null)
  const env = JSON.parse(globalThis.localStorage.getItem(ONBOARDING_KEY) as string)
  env.draft = {
    v: 5, step: 4, age: 28, gender: 'male', heightCm: 175, weightKg: 80,
    intent: 'meals', level: 'advanced', trainingYears: 5,
    goal: 'bulk', days: 5, duration: 60, place: 'gym', pref: 'free',
    hasInjury: true, injuries: ['knee'], healthDataConsent: true,
  }
  globalThis.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(env))
  const migrated = loadDraftV2(null)
  check('Y: a v5 draft still loads', migrated !== undefined)
  check('Y: v5 resumes at the history step', migrated?.step === HISTORY_STEP, String(migrated?.step))
  check('Y: v5 history fields are null, not invented', migrated?.trainedBefore === null)
  if (migrated) {
    const yProfile = chainToProfile({
      age: migrated.age, gender: migrated.gender, heightCm: migrated.heightCm, weightKg: migrated.weightKg,
      goal: migrated.goal, days: migrated.days, duration: migrated.duration,
      place: migrated.place, pref: migrated.pref, injuries: migrated.injuries,
      level: migrated.level, trainingYears: migrated.trainingYears, intent: migrated.intent,
      healthDataConsent: migrated.healthDataConsent,
      trainedBefore: migrated.trainedBefore, totalMonths: migrated.totalMonths,
      lastTrained: migrated.lastTrained, consistency: migrated.consistency,
    })
    check('Y: completing an unanswered v5 draft yields an INCOMPLETE Training profile',
      !buildAthleteProfileAttempt(yProfile).trainingCompleteness.completeForTraining)
    check('Y: LIVE still works for that user', generatePlan(yProfile).workoutPlan.days.length > 0)
  }
  check('draft version is 6', DRAFT_VERSION === 6)
  clearDraftV2(null)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑧ الكتالوج وحدود الوصفة')
{
  let fullyReady = 0
  let withUncurated = 0
  const uncuratedIds = new Set<string>()
  const liveIds = new Set(liveExercises.map((e) => e.id))

  for (const r of rows) {
    if (r.cmp.prescription === null) continue
    const ids = r.cmp.prescription.slots.map((s) => s.exerciseId)
    const unresolved = ids.filter((id) => !liveIds.has(id))
    check(`${r.persona.id}: every QAE exercise resolves to the shipping catalog`, unresolved.length === 0, unresolved.join(','))

    if (r.cmp.prescription.fullyPrescriptionReady) fullyReady++
    else {
      withUncurated++
      for (const id of r.cmp.prescription.uncuratedExerciseIds) uncuratedIds.add(id)
    }

    // Uncurated slots must be DECLARED, not silently priced from DERIVED data.
    if (r.cmp.prescription.uncuratedExerciseIds.length > 0) {
      check(`${r.persona.id}: uncurated slots declare metadataInsufficient`,
        r.cmp.prescription.reasonCodes.includes('prescription.metadataInsufficient'),
        r.cmp.prescription.reasonCodes.join(','))
    }
  }
  // QAE-ONLY output, printed so the numbers are on the record. LIVE has no
  // sets/reps/RIR/rest model at all, so there is nothing here to compare against
  // — this is reported, never diffed ([CTO-QAE-023] §3).
  console.log('\n  QAE-only prescription (day 1, first 3 slots) — reported, NOT compared:')
  for (const id of ['A', 'F', 'I', 'W']) {
    const r = rows.find((x) => x.persona.id === id)
    if (!r?.cmp.prescription) continue
    const head = r.cmp.prescription.slots.slice(0, 3)
      .map((s) => `${s.exerciseId} ${s.sets}×${s.repMin}-${s.repMax} RIR${s.targetRir} ${s.restSeconds}s`)
      .join(' · ')
    console.log(`    ${id.padEnd(3)} totalSets=${String(r.cmp.prescription.totalWorkingSets).padEnd(4)} ${head}`)
    console.log(`        codes: ${r.cmp.prescription.reasonCodes.join(', ')}`)
  }
  console.log('')
  console.log(`  plans fully prescription-ready: ${fullyReady}`)
  console.log(`  plans containing uncurated exercises: ${withUncurated}`)
  console.log(`  uncurated exercise ids (${uncuratedIds.size}): ${[...uncuratedIds].sort().join(', ') || '—'}`)
  check('every prescribed slot has positive sets', rows.every((r) => (r.cmp.prescription?.slots ?? []).every((s) => s.sets > 0)))
  check('every prescribed slot has a sane rep range', rows.every((r) => (r.cmp.prescription?.slots ?? []).every((s) => s.repMin > 0 && s.repMax >= s.repMin)))
  check('every prescribed slot has non-negative RIR', rows.every((r) => (r.cmp.prescription?.slots ?? []).every((s) => s.targetRir >= 0)))
  check('every prescribed slot has positive rest', rows.every((r) => (r.cmp.prescription?.slots ?? []).every((s) => s.restSeconds > 0)))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑨ الحتمية')
{
  const sample = rows.filter((r) => ['A', 'F', 'I', 'O', 'V'].includes(r.persona.id))
  const structural = (c: ShadowComparison): string =>
    JSON.stringify({ d: c.qaeDayCount, s: c.qaeSplitId, p: c.qaeEligiblePoolSize, rx: c.prescription?.slots, sets: c.prescription?.totalWorkingSets })

  for (const r of sample) {
    const live = r.live as WorkoutPlan
    const a = structural(runShadowComparison(r.profile, live))

    // 1. reordered object keys on the Profile
    const reordered = Object.fromEntries(Object.entries(r.profile).reverse()) as unknown as Profile
    check(`${r.persona.id}: key order does not change QAE output`, structural(runShadowComparison(reordered, live)) === a)

    // 2. catalog reversal — supported, because buildTrainingPlan takes a catalog
    const real = buildRealAthleteProfile(r.profile).profile
    const access = (r.profile.gymAccess ?? 'full') as 'full' | 'small' | 'home' | 'bodyweight'
    const forward = buildTrainingPlan(real, { catalog, access, blocklists: TRAINING_BLOCKLISTS })
    const reversedCatalog = { ...catalog, exercises: [...catalog.exercises].reverse() } as ExerciseCatalog
    const backward = buildTrainingPlan(real, { catalog: reversedCatalog, access, blocklists: TRAINING_BLOCKLISTS })
    check(`${r.persona.id}: catalog reversal yields an identical plan`,
      forward.ok && backward.ok &&
      JSON.stringify(forward.training.days.map((d) => [d.dayId, d.exercises.map((e) => e.exerciseId)])) ===
        JSON.stringify(backward.training.days.map((d) => [d.dayId, d.exercises.map((e) => e.exerciseId)])))

    // 3. timezone
    const tz = process.env.TZ
    process.env.TZ = 'Pacific/Kiritimati'
    check(`${r.persona.id}: timezone change does not alter QAE output`, structural(runShadowComparison(r.profile, live)) === a)
    process.env.TZ = tz

    // 4. locale
    const lang = process.env.LANG
    process.env.LANG = 'tr_TR.UTF-8'
    check(`${r.persona.id}: locale change does not alter QAE output`, structural(runShadowComparison(r.profile, live)) === a)
    process.env.LANG = lang
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑩ لا تغيّر في مرجعية الخطة')
{
  const r = rows.find((x) => x.persona.id === 'F') as Row
  const live = r.live as WorkoutPlan
  const before = JSON.stringify(live)
  const cmp = runShadowComparison(r.profile, live)

  check('AUTHORITY: LIVE plan object unchanged by the shadow', JSON.stringify(live) === before)
  const asUnknown = cmp as unknown as Record<string, unknown>
  check('AUTHORITY: shadow result has no days[] (cannot masquerade as a plan)', !('days' in asUnknown))
  check('AUTHORITY: shadow result has no templateId', !('templateId' in asUnknown))
  check('AUTHORITY: prescription is reported under its own key, not as a plan',
    cmp.prescription !== null && !('templateId' in (cmp.prescription as unknown as Record<string, unknown>)))

  // Source scan — the shadow module must not reach storage, network or analytics.
  const src = String(runShadowComparison) + String(buildAthleteProfileAttempt) + String(buildRealAthleteProfile) + String(buildQaeFacts)
  for (const forbidden of ['localStorage', 'fetch(', 'supabase', 'sendBeacon', 'XMLHttpRequest', 'trackLocal']) {
    check(`AUTHORITY: shadow does not reference ${forbidden}`, !src.includes(forbidden))
  }
  check('AUTHORITY: no app module imports the shadow (no route consumes QAE)', APP_IMPORTS_SHADOW === false)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑩ب محاكاة الالتفاف — هل يستطيع المقارِن أن يكتشف فرقًا أصلًا؟')
{
  // ═══ WHY THIS SECTION EXISTS ═══════════════════════════════════════════════
  // 26 of 28 personas came back `exactStructuralMatch`, and every injury
  // persona matched LIVE exactly. Both are good news — and both mean two
  // branches of this proof NEVER EXECUTED: the comparator's difference
  // detection, and the "LIVE kept a contraindicated exercise" path. A gate
  // whose failure branch is never taken is not known to work. So we take it.

  const r = rows.find((x) => x.persona.id === 'K') as Row
  const live = r.live as WorkoutPlan
  const clone = (): WorkoutPlan => JSON.parse(JSON.stringify(live)) as WorkoutPlan

  // 1. day count
  const fewerDays = clone()
  fewerDays.days = fewerDays.days.slice(0, 2)
  const c1 = runShadowComparison(r.profile, fewerDays)
  check('DETECT: a day-count difference is caught at days.length',
    c1.firstDifferingPath === 'days.length' && c1.classification === 'unexpectedDeviation', `${c1.classification} @ ${c1.firstDifferingPath}`)

  // 2. day kinds
  const wrongKind = clone()
  wrongKind.days[1].id = 'gen-9-bogus'
  const c2 = runShadowComparison(r.profile, wrongKind)
  check('DETECT: a day-kind difference is caught at days[1].id',
    c2.firstDifferingPath === 'days[1].id', `${c2.classification} @ ${c2.firstDifferingPath}`)

  // 3. exercise ids (a substitution the athlete never asked for)
  const swapped = clone()
  swapped.days[0].exercises[0].exerciseId = 'lat-pulldown-machine'
  const c3 = runShadowComparison(r.profile, swapped)
  check('DETECT: an exercise-id difference is caught and both sides are named',
    c3.firstDifferingPath === 'days[0].exercises[*].exerciseId' &&
      (c3.probableCause ?? '').includes('only in LIVE'), `${c3.classification} @ ${c3.firstDifferingPath} :: ${c3.probableCause}`)

  // 4. ORDER ONLY — same set, different sequence. This is the subtlest axis and
  //    the one a set-based comparison would silently miss.
  const reordered = clone()
  const d0 = reordered.days[0].exercises
  ;[d0[0], d0[1]] = [d0[1], d0[0]]
  const c4 = runShadowComparison(r.profile, reordered)
  check('DETECT: an order-only difference is caught (a set comparison would miss it)',
    c4.firstDifferingPath === 'days[0].exercises[0].exerciseId' &&
      (c4.probableCause ?? '').includes('same set, different order'), `${c4.classification} @ ${c4.firstDifferingPath} :: ${c4.probableCause}`)

  // 5. slot count
  const shortDay = clone()
  shortDay.days[0].exercises = shortDay.days[0].exercises.slice(0, 3)
  const c5 = runShadowComparison(r.profile, shortDay)
  check('DETECT: a slot-count difference is caught at days[0].exercises.length',
    c5.firstDifferingPath === 'days[0].exercises.length', `${c5.classification} @ ${c5.firstDifferingPath}`)

  // 6. optional flags
  const flagged = clone()
  ;(flagged.days[0].exercises[0] as { optional?: boolean }).optional = true
  const c6 = runShadowComparison(r.profile, flagged)
  check('DETECT: an optional-flag difference is caught',
    c6.firstDifferingPath === 'days[0].exercises[0].optional', `${c6.classification} @ ${c6.firstDifferingPath}`)

  // 7. the unmutated plan must STILL match — a comparator that flags everything
  //    is as useless as one that flags nothing.
  const c7 = runShadowComparison(r.profile, live)
  check('DETECT: the unmutated plan still reports exactStructuralMatch',
    c7.classification === 'exactStructuralMatch' && c7.firstDifferingPath === null, c7.classification)

  // ═══ SAFETY BRANCH: LIVE keeps a contraindicated exercise ══════════════════
  // No real persona hits this today because LIVE and QAE agree on exclusions.
  // That agreement is a fact about today's generator, not a guarantee — so the
  // branch that would catch a future LIVE regression is proven here directly.
  const knee = rows.find((x) => x.persona.id === 'L') as Row
  const bannedByKnee = TRAINING_BLOCKLISTS.injuryByTag['knee'] ?? []
  check('SAFETY-BRANCH: the knee blocklist is non-empty', bannedByKnee.length > 0)

  const contaminated = JSON.parse(JSON.stringify(knee.live)) as WorkoutPlan
  contaminated.days[1].exercises[0].exerciseId = bannedByKnee[0]
  const cs = runShadowComparison(knee.profile, contaminated)
  check('SAFETY-BRANCH: a contraindicated LIVE exercise is classified expectedDeviation',
    cs.classification === 'expectedDeviation', `${cs.classification} — ${cs.detail}`)
  check('SAFETY-BRANCH: the deviation names the firing rule id',
    cs.safetyRuleIds.includes('injuryByTag:knee'), cs.safetyRuleIds.join(','))
  check('SAFETY-BRANCH: the offending exercise id is named',
    cs.detail.includes(bannedByKnee[0]), cs.detail)
  check('SAFETY-BRANCH: it is NOT silently accepted as parity',
    cs.classification !== 'exactStructuralMatch' && cs.classification !== 'structuralMatch', cs.classification)
  check('SAFETY-BRANCH: QAE itself still excluded the exercise',
    !(rows.find((x) => x.persona.id === 'L')?.cmp.prescription?.slots ?? []).some((s) => s.exerciseId === bannedByKnee[0]))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n⑪ عتبات القبول')
{
  const structuralCounts: Record<string, number> = {}
  for (const r of rows) structuralCounts[r.cmp.classification] = (structuralCounts[r.cmp.classification] ?? 0) + 1

  console.log(`  personas: ${rows.length}`)
  console.log(`  Training completeness: ${completeProfiles.length} / ${nonLegacy.length} (excluding legacy X)`)
  console.log(`  QAE plan success: ${qaeSuccess.length} / ${completeProfiles.length} complete profiles`)
  console.log(`  QAE failures on complete profiles: ${qaeFailuresOnComplete.length}`)
  console.log(`  unexpected structural deviations: ${unexpected.length}`)
  console.log('  classification histogram: ' + Object.entries(structuralCounts).map(([k, v]) => `${k}=${v}`).join(' · '))

  check('THRESHOLD: at least 25 personas', rows.length >= 25, String(rows.length))
  check('THRESHOLD: QAE failures on complete profiles == 0', qaeFailuresOnComplete.length === 0, qaeFailuresOnComplete.map((r) => r.persona.id).join(','))
  check('THRESHOLD: every complete profile produced a QAE plan', qaeSuccess.length === completeProfiles.length)
  check('THRESHOLD: legacy user regressions == 0', rows.filter((r) => r.persona.id === 'X').every((r) => r.live !== null && r.live.days.length > 0))

  if (unexpected.length > 0) {
    console.log('\n  UNEXPECTED DEVIATIONS:')
    for (const r of unexpected) {
      console.log(`    ${r.persona.id} ${r.persona.name}`)
      console.log(`      LIVE : ${(r.live?.days ?? []).map((d) => `${d.id}[${d.exercises.map((e) => e.exerciseId).join('|')}]`).join(' ')}`)
      console.log(`      QAE  : day count ${r.cmp.qaeDayCount}, split ${r.cmp.qaeSplitId}, pool ${r.cmp.qaeEligiblePoolSize}`)
      console.log(`      first differing path: ${r.cmp.firstDifferingPath}`)
      console.log(`      probable cause     : ${r.cmp.probableCause}`)
    }
  }
}

console.log(`\nqae-m1b-acceptance-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\nFAILURES:')
  for (const f of failures) console.error(`  • ${f}`)
  process.exit(1)
}
