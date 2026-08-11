// [CTO-QAE-020] M0 — QAE shadow integration. HOST-SIDE ONLY.
//
// The user NEVER sees any of this. LIVE (generatePlan) is the only plan a user
// receives; QAE runs beside it purely to produce a local diagnostic. Nothing
// here writes to storage, Supabase, analytics, or a server.
//
// Hard rules this file exists to honour:
//   • QAE failure or incompleteness must NEVER affect the user (fail open).
//   • The profile adapter INVENTS NOTHING. Every AthleteProfile field is either
//     mapped from explicit evidence in the live app, or reported as unavailable.
//     returningStatus / movementCompetency / consistency / injury structure /
//     experience axes are NOT inferred from weak proxies.
//   • No shadow result is ever persisted as a user plan.

import type { Profile } from '@/types/profile'
import type { WorkoutPlan } from '@/types/workout'
import { exercises as liveExercises } from '@/data/exercises'
import catalogJson from '@qae/Contracts/exercises/exercise-catalog.qae.json'
import blocklistJson from '@qae/Contracts/exercises/blocklist-migration.json'
import type { ExerciseCatalog } from '@qae/Domain/Catalog/model'
import type { ExpTier } from '@qae/Domain/Training/assembly'
import { buildTrainingPlan, tierFromCapability, type GymAccess, type TrainingPlanResult } from '@qae/Domain/Training/plan'
import { deriveTrainingCapabilityProfile } from '@qae/Domain/Training/capability'
import { classifyExperience, deriveReturningStatus } from '@qae/Domain/ProfileClassification/classify'
import type { FactMap, FactValue } from '@qae/Domain/Evidence/model'
import { buildAthleteProfile } from '@qae/Domain/Profile/build'
import type { BuiltProfile } from '@qae/Domain/Profile/model'
import { prescribeInitialPlan, type PrescriptionResult } from '@qae/Domain/Training/prescription'
import { buildCurationSet } from '@qae/Domain/Training/prescriptionMetadata'
import {
  evaluateTrainingCompleteness,
  type TrainingCompletenessResult,
} from '@qae/Domain/Training/completeness'

export const SHADOW_VERSION = '1.0.0'

const catalog = catalogJson as unknown as ExerciseCatalog

// ── §2 Catalog adapter ──────────────────────────────────────────────────────

export interface CatalogDriftReport {
  ok: boolean
  liveCount: number
  qaeCount: number
  duplicateLiveIds: string[]
  /** QAE ids with no live exercise — QAE would reference something unrenderable */
  qaeIdsMissingFromApp: string[]
  /** live ids QAE does not know — acceptable (library grew), reported not hidden */
  liveIdsMissingFromQae: string[]
}

export function checkCatalogDrift(): CatalogDriftReport {
  const liveIds = liveExercises.map((e) => e.id)
  const liveSet = new Set(liveIds)
  const qaeIds = catalog.exercises.map((e) => e.exerciseId)
  const qaeSet = new Set(qaeIds)
  const seen = new Set<string>()
  const duplicateLiveIds: string[] = []
  for (const id of liveIds) {
    if (seen.has(id)) duplicateLiveIds.push(id)
    seen.add(id)
  }
  const qaeIdsMissingFromApp = qaeIds.filter((id) => !liveSet.has(id)).sort()
  const liveIdsMissingFromQae = liveIds.filter((id) => !qaeSet.has(id)).sort()
  return {
    // Drift that BREAKS shadow = a QAE id the app cannot render, or a duplicate.
    ok: qaeIdsMissingFromApp.length === 0 && duplicateLiveIds.length === 0,
    liveCount: liveIds.length,
    qaeCount: qaeIds.length,
    duplicateLiveIds,
    qaeIdsMissingFromApp,
    liveIdsMissingFromQae,
  }
}

/** Resolve a QAE exercise id to the live catalog record. */
export function resolveLiveExercise(exerciseId: string): (typeof liveExercises)[number] | undefined {
  return liveExercises.find((e) => e.id === exerciseId)
}

// ── §3 Profile adapter — NO INFERENCE ───────────────────────────────────────

/**
 * Every AthleteProfile field QAE's Training path needs, and whether the live
 * app can supply it from EXPLICIT evidence. Fields listed as unavailable are
 * named individually — never summarised as "needs more questions".
 */
export type AthleteProfileField =
  | 'identity.ageYears'
  | 'identity.sex'
  | 'body.heightMm'
  | 'body.currentWeightGrams'
  | 'training.availableDaysPerWeek'
  | 'training.sessionDurationMinutes'
  | 'training.environment'
  | 'training.experienceBand.trainingKnowledge'
  | 'training.experienceBand.recentTrainingExposure'
  | 'training.experienceBand.currentWorkCapacity'
  | 'training.experienceBand.consistencyHistory'
  | 'training.returningStatus'
  | 'training.consistency'
  | 'training.movementCompetency'
  | 'training.trainingHistory.trainedBefore'
  | 'training.trainingHistory.totalMonthsBucket'
  | 'training.trainingHistory.lastTrainedBucket'
  | 'safety.injuryAreas'
  | 'safety.contraindications'

export interface AthleteProfileAttempt {
  /**
   * GLOBAL completeness — unchanged and deliberately still unreachable.
   * `movementCompetency` has no onboarding question, so no live profile is
   * globally complete. M1a does NOT weaken this; it adds the narrower Training
   * verdict below instead ([CTO-QAE-021] §5 said global must not be relaxed).
   */
  status: 'complete' | 'incomplete'
  /** fields mapped from explicit live evidence */
  mapped: readonly AthleteProfileField[]
  /** fields the live app genuinely cannot supply — each named, with a reason */
  missing: ReadonlyArray<{ field: AthleteProfileField; reason: string }>
  /**
   * Training-specific verdict ([CTO-QAE-021] completeness contract, wired in
   * M1a). `missingRequired` names every absent field — a Training profile is
   * never "incomplete" without saying which evidence is missing.
   */
  trainingCompleteness: TrainingCompletenessResult
  /** the subset QAE's Training path can actually run on, when derivable */
  training?: {
    tier: ExpTier
    access: GymAccess
    daysPerWeek: number
    sessionMinutes: number
    injuryAreas: readonly string[]
  }
}

/** Live `trainingLevel` → QAE tier. This IS explicit evidence, not a proxy. */
function tierFromTrainingLevel(level: Profile['trainingLevel']): ExpTier | null {
  switch (level) {
    case 'beginner':
      return 'beginner'
    case 'intermediate':
      return 'intermediate'
    case 'advanced':
      return 'advanced'
    default:
      return null
  }
}

function accessFromEnvironment(p: Profile): GymAccess | null {
  const g = (p as unknown as { gymAccess?: string }).gymAccess
  if (g === 'full' || g === 'small' || g === 'home' || g === 'bodyweight') return g
  // WorkoutEnvironment is only 'gym' | 'home' in the live app — there is NO
  // 'bodyweight' environment. Bodyweight access is expressible only via the
  // optional `gymType` field above; when neither is present we return null
  // rather than guessing.
  switch (p.workoutEnvironment) {
    case 'gym':
      return 'full'
    case 'home':
      return 'home'
    default:
      return null
  }
}

/**
 * The live app stores injuries as FREE TEXT (`Profile.injuries: string`). QAE
 * needs structured areas. Parsing free text into a safety constraint would be
 * inventing a medical fact, so this returns structure ONLY for the exact
 * canonical tokens the onboarding writes, and reports the field unavailable
 * when the text is non-empty but unrecognised.
 */
const CANONICAL_INJURY_TOKENS = ['knee', 'shoulder', 'lower_back', 'wrist', 'elbow', 'ankle'] as const

function injuryAreasFromProfile(p: Profile): { areas: string[]; recognised: boolean } {
  const raw = (p.injuries ?? '').trim()
  if (raw.length === 0) return { areas: [], recognised: true }
  const lower = raw.toLowerCase()
  const areas = CANONICAL_INJURY_TOKENS.filter((t) => lower.includes(t))
  // Non-empty text that yields no canonical token is UNRECOGNISED — we do not
  // guess, and we do not silently treat it as "no injury".
  return { areas: [...areas], recognised: areas.length > 0 }
}

/**
 * Live `Profile.trainingHistory` → the QAE fact map `classifyExperience` reads.
 *
 * This is a KEY-FOR-KEY move, not a translation: onboarding stores exactly the
 * bank's own vocabulary (`never|tried|months|years`, `lt3…y3_plus`, `now…y1_plus`,
 * `rare|on_off|mostly|steady`), so nothing is mapped, bucketed, or guessed here.
 *
 * An absent answer is an ABSENT KEY, never a null or a sentinel: `scoreOf`
 * distinguishes the two by `raw in s.map`, and a key holding `null` would count
 * toward `weightTotal10` as an unanswered signal in some paths while a missing
 * key does not exist at all. Absent is the honest encoding of "not asked".
 */
export function historyFacts(h: Profile['trainingHistory']): Record<string, FactValue> {
  const facts: Record<string, FactValue> = {}
  if (h?.trainedBefore !== undefined) facts['trainedBefore'] = h.trainedBefore
  if (h?.totalMonths !== undefined) facts['totalMonths'] = h.totalMonths
  if (h?.lastTrained !== undefined) facts['lastTrained'] = h.lastTrained
  if (h?.consistency !== undefined) facts['consistency'] = h.consistency
  return facts
}

// ── §1 (M1b) Live Profile → the domain's own fact map ───────────────────────

/**
 * Live goal vocabulary → the bank's `primaryGoalDisplay` vocabulary.
 *
 * A vocabulary translation between two closed enumerations, NOT an inference:
 * both sides already name the same six intents. `GOAL_FROM_DISPLAY` in build.ts
 * then folds these to cut/bulk/maintain, so the fold is the domain's, not ours.
 * `returning` maps to `get_fitter` (⇒ maintain) because a returning athlete's
 * live goalType carries no direction — inventing cut or bulk here would.
 */
const GOAL_DISPLAY_FROM_LIVE: Readonly<Record<string, string>> = {
  cutting: 'fat_loss',
  bulking: 'muscle_gain',
  maintenance: 'general_health',
  recomposition: 'recomp',
  health: 'general_health',
  returning: 'get_fitter',
}

/**
 * Live access → the bank's `place` vocabulary (read by `deriveCapabilities`).
 *
 * `home` and `bodyweight` intentionally fall through to the equipment-inventory
 * branch, which yields bodyweight-only capabilities. That is honest: the live
 * app never asks a home user WHAT equipment they own, so claiming dumbbells
 * would be invented. It costs nothing here — the eligible pool is filtered by
 * `access`, which is passed to `buildTrainingPlan` separately and unchanged.
 */
const PLACE_FROM_ACCESS: Readonly<Record<GymAccess, string>> = {
  full: 'gym',
  small: 'machines_only',
  home: 'home',
  bodyweight: 'bodyweight',
}

/**
 * Build the QAE fact map from a live `Profile`.
 *
 * Every entry is an answer the user actually gave. A fact the live app cannot
 * source is an ABSENT KEY — never a default — so `buildAthleteProfile` reports
 * it in `dataQuality.missingEvidence` and marks the profile incomplete. That is
 * the mechanism by which a legacy profile stays honestly unusable by Training.
 */
export function buildQaeFacts(p: Profile): Record<string, FactValue> {
  const facts: Record<string, FactValue> = { ...historyFacts(p.trainingHistory) }

  if (Number.isFinite(p.age) && p.age > 0) facts['age'] = p.age
  if (p.gender === 'male' || p.gender === 'female') facts['sex'] = p.gender
  if (Number.isFinite(p.heightCm) && p.heightCm > 0) facts['heightCm'] = p.heightCm
  if (Number.isFinite(p.weightKg) && p.weightKg > 0) facts['weightKg'] = p.weightKg
  if (Number.isFinite(p.targetWeightKg) && p.targetWeightKg > 0) facts['targetWeightKg'] = p.targetWeightKg

  const goalDisplay = GOAL_DISPLAY_FROM_LIVE[p.goalType]
  if (goalDisplay !== undefined) facts['primaryGoalDisplay'] = goalDisplay

  if (Number.isFinite(p.trainingDays) && p.trainingDays >= 1) facts['daysPerWeek'] = p.trainingDays
  if (Number.isFinite(p.workoutDuration) && p.workoutDuration > 0) facts['sessionMinutes'] = p.workoutDuration

  const access = accessFromEnvironment(p)
  if (access !== null) facts['place'] = PLACE_FROM_ACCESS[access]

  if (p.trainingStyle !== undefined) facts['trainingStyle'] = p.trainingStyle

  // `trainingLevel` is the user's own self-rating, so it feeds `selfLevel` —
  // the bank signal that MEANS a self-rating. It is deliberately NOT written to
  // `trainedBefore` or any history key: those are facts, this is an opinion.
  const tier = tierFromTrainingLevel(p.trainingLevel)
  if (tier !== null) facts['selfLevel'] = tier

  // Injuries: the areas double as the `hasInjury` screen answer. An empty list
  // is 'none' — the M1a-accepted contract that [] IS no-injury evidence — but
  // ONLY when the stored text is recognised; unparsed prose leaves both absent.
  const injury = injuryAreasFromProfile(p)
  if (injury.recognised) {
    facts['hasInjury'] = injury.areas.length > 0 ? 'yes' : 'none'
    for (const area of injury.areas) facts[`currentInjuryAreas.${area}`] = true
  }

  if (p.healthDataConsent === true) facts['healthConsent'] = 'yes'

  return facts
}

/**
 * The real `AthleteProfile`, built by the DOMAIN's own `buildAthleteProfile`.
 *
 * §1 of [CTO-QAE-023] forbids synthesising an AthleteProfile that bypasses this
 * adapter, and this is why: the profile a persona is judged on must be the same
 * object the app would produce. No conflicts are supplied — the live app has no
 * contradiction-resolution UI, so passing an empty set is the truthful state,
 * not a convenience.
 */
export function buildRealAthleteProfile(p: Profile): BuiltProfile {
  return buildAthleteProfile(buildQaeFacts(p) as FactMap, [], [])
}

export function buildAthleteProfileAttempt(p: Profile): AthleteProfileAttempt {
  const mapped: AthleteProfileField[] = []
  const missing: Array<{ field: AthleteProfileField; reason: string }> = []

  const push = (field: AthleteProfileField, ok: boolean, reason: string): void => {
    if (ok) mapped.push(field)
    else missing.push({ field, reason })
  }

  push('identity.ageYears', Number.isFinite(p.age) && p.age > 0, 'Profile.age is 0/absent')
  push('identity.sex', p.gender === 'male' || p.gender === 'female', 'Profile.gender is unspecified')
  push('body.heightMm', Number.isFinite(p.heightCm) && p.heightCm > 0, 'Profile.heightCm is 0/absent')
  push('body.currentWeightGrams', Number.isFinite(p.weightKg) && p.weightKg > 0, 'Profile.weightKg is 0/absent')

  const days = p.trainingDays
  push('training.availableDaysPerWeek', Number.isFinite(days) && days >= 1, 'Profile.trainingDays is 0/absent')
  const minutes = p.workoutDuration
  push('training.sessionDurationMinutes', Number.isFinite(minutes) && minutes > 0, 'Profile.workoutDuration is 0/absent')

  const access = accessFromEnvironment(p)
  push('training.environment', access !== null, 'Profile.workoutEnvironment/gymAccess is not one of gym|home|bodyweight')

  const tier = tierFromTrainingLevel(p.trainingLevel)
  push('training.experienceBand.trainingKnowledge', tier !== null, 'Profile.trainingLevel is absent/unrecognised')

  // ── Training history ([CTO-QAE-022] M1a) ────────────────────────────────────
  //
  // The four onboarding answers, read verbatim. `undefined` means the question
  // was never put to this user (every profile created before M1a) — reported as
  // missing by name, NEVER back-filled.
  const h = p.trainingHistory
  const hist = historyFacts(h)

  push(
    'training.trainingHistory.trainedBefore',
    h?.trainedBefore !== undefined,
    'OnboardingV2 did not ask it for this profile (pre-M1a). trainingLevel is a self-rating and does not distinguish never-trained from detrained',
  )

  // ── The never-trained asymmetry, and why it is not a special case ───────────
  //
  // `trainedBefore === 'never'` makes the three follow-ups INAPPLICABLE, not
  // absent: the athlete has no total duration and no last session because there
  // were none. Reporting them "missing" would be false — it would claim the app
  // failed to collect something that does not exist — and it would also make a
  // fully-answered never-trained athlete look under-evidenced forever.
  //
  // So for these three, "answered" means: a value is present, OR the athlete
  // said 'never'. `neverTrained` below is the single predicate carrying that.
  const neverTrained = h?.trainedBefore === 'never'
  const historyAsked = h?.trainedBefore !== undefined

  push(
    'training.trainingHistory.totalMonthsBucket',
    neverTrained || h?.totalMonths !== undefined,
    historyAsked ? 'trained before, but total-duration answer is absent from the stored profile' : 'not collected for this profile (pre-M1a)',
  )
  push(
    'training.trainingHistory.lastTrainedBucket',
    neverTrained || h?.lastTrained !== undefined,
    historyAsked ? 'trained before, but last-trained answer is absent from the stored profile' : 'not collected for this profile (pre-M1a)',
  )
  push(
    'training.consistency',
    neverTrained || h?.consistency !== undefined,
    historyAsked ? 'trained before, but consistency answer is absent from the stored profile' : 'not collected for this profile (pre-M1a)',
  )

  // ── Derived experience axes ─────────────────────────────────────────────────
  //
  // Derived by the DOMAIN classifier from the facts above — not restated here.
  // Each axis is released only when its own evidence is present; a partially
  // answered history yields partial axes, not a confident guess.
  const exp = classifyExperience(hist)
  const returning = deriveReturningStatus(hist, exp)

  push(
    'training.returningStatus',
    returning !== 'unknown',
    'requires trainedBefore (plus lastTrained + totalMonths to separate returning from active); absent for this profile. Inferring it from trainingLevel would be a weak proxy',
  )
  push(
    'training.experienceBand.recentTrainingExposure',
    neverTrained || h?.lastTrained !== undefined,
    'requires lastTrained; trainingLevel is a self-rating, not exposure evidence',
  )
  push(
    'training.experienceBand.consistencyHistory',
    neverTrained || h?.consistency !== undefined,
    'requires the consistency answer (rare/on_off/mostly/steady)',
  )
  // Capacity = knowledge stepped down by exposure (classify.ts:118-122). It
  // therefore needs BOTH a knowledge signal and an exposure signal; with either
  // one missing the step-down is unanchored, so nothing is released.
  push(
    'training.experienceBand.currentWorkCapacity',
    tier !== null && (neverTrained || h?.lastTrained !== undefined),
    'requires a knowledge signal (trainingLevel) AND exposure evidence (lastTrained); capacity is knowledge stepped down by exposure and cannot be derived from either alone',
  )

  // Still genuinely uncollectable — the one field M1a deliberately does NOT add
  // a question for. Proven optional for Training in completeness.ts.
  missing.push({
    field: 'training.movementCompetency',
    reason: 'no onboarding question covers overhead/hinge/squat-depth/impact/standing tolerance; PROVEN optional for the Training path (completeness.ts) so its absence blocks nothing',
  })

  const injury = injuryAreasFromProfile(p)
  push(
    'safety.injuryAreas',
    injury.recognised,
    'Profile.injuries is free text; the value present matches no canonical area token, and parsing prose into a safety constraint would be invented evidence',
  )
  push(
    'safety.contraindications',
    injury.recognised,
    'derived from safety.injuryAreas, which is unavailable for this profile',
  )

  // GLOBAL status: complete only if NOTHING is missing. `movementCompetency`
  // is always missing, so this stays 'incomplete' by design — see the field doc.
  const status: AthleteProfileAttempt['status'] = missing.length === 0 ? 'complete' : 'incomplete'

  // TRAINING status: the narrower contract, answered from the same mapped set.
  // `safety.contraindications` is not in either Training list, so it is passed
  // through as-is and simply never consulted.
  const trainingCompleteness = evaluateTrainingCompleteness(new Set<string>(mapped))

  const trainingRunnable =
    tier !== null && access !== null && Number.isFinite(days) && days >= 1 && Number.isFinite(minutes) && minutes > 0

  return {
    status,
    mapped,
    missing,
    trainingCompleteness,
    ...(trainingRunnable
      ? {
          training: {
            tier,
            access,
            daysPerWeek: days,
            sessionMinutes: minutes,
            injuryAreas: injury.areas,
          },
        }
      : {}),
  }
}

// ── §4/§5 Shadow execution + comparison ─────────────────────────────────────

export type ShadowClassification =
  /** every compared axis identical: day count, split, kinds, ids, order, flags */
  | 'exactStructuralMatch'
  /** same skeleton (count + kinds), different exercise selection */
  | 'structuralMatch'
  /** QAE differs for a NAMED reason we accept — chiefly a safety exclusion */
  | 'expectedDeviation'
  | 'unexpectedDeviation'
  | 'qaeIncompleteProfile'
  | 'qaeFailed'

/** The axes compared, in the order they are checked. */
export type ComparedAxis = 'dayCount' | 'splitId' | 'dayKinds' | 'exerciseIds' | 'exerciseOrder' | 'optionalFlags'

/**
 * QAE-ONLY prescription output ([CTO-QAE-023] §3).
 *
 * ⚠️ **This is reported, never compared.** LIVE has no sets/reps/RIR/rest model
 * at all, so a difference here is not a divergence — there is nothing to
 * diverge from. Calling it a "legacy divergence" would invent a baseline and
 * make QAE look wrong for having a capability the legacy generator lacks.
 */
export interface QaePrescriptionSummary {
  totalWorkingSets: number
  /** one entry per slot, in plan order */
  slots: ReadonlyArray<{
    exerciseId: string
    sets: number
    repMin: number
    repMax: number
    targetRir: number
    restSeconds: number
  }>
  /** every reason code the prescriber emitted, deduped and sorted */
  reasonCodes: readonly string[]
  /** slots the curated cohort does not cover — named, never silently defaulted */
  uncuratedExerciseIds: readonly string[]
  /** true when every slot came from the curated prescription frontier */
  fullyPrescriptionReady: boolean
}

export interface ShadowComparison {
  classification: ShadowClassification
  shadowVersion: string
  liveDayCount: number
  qaeDayCount: number
  detail: string
  /** never persisted; diagnostic only */
  missingProfileFields: readonly string[]
  /**
   * Training-contract verdict for this profile ([CTO-QAE-022] M1a). Diagnostic
   * only — it gates NOTHING. The live plan is produced and delivered whatever
   * this says; see the fail-open proofs.
   */
  trainingComplete: boolean
  /** named Training-required fields still absent — never a bare count */
  missingTrainingRequired: readonly string[]
  /** axes that matched, in check order */
  matchedAxes: readonly ComparedAxis[]
  /** the FIRST axis that differed, with a dotted path into the plan */
  firstDifferingPath: string | null
  /** why we believe the axes differ — a hypothesis, labelled as one */
  probableCause: string | null
  /** the safety rule ids that justify an `expectedDeviation` */
  safetyRuleIds: readonly string[]
  /** QAE's own split id (LIVE has no comparable field on every template) */
  qaeSplitId: string | null
  qaeEligiblePoolSize: number
  /** reported, never compared — see the type doc */
  prescription: QaePrescriptionSummary | null
  /** the real AthleteProfile status, from the domain builder */
  athleteProfileStatus: 'complete' | 'incomplete' | 'unbuilt'
}

interface BlocklistRule {
  ruleId: string
  exerciseIds: string[]
}
function ruleIds(id: string): string[] {
  const rules = (blocklistJson as unknown as { rules: BlocklistRule[] }).rules
  const r = rules.find((x) => x.ruleId === id)
  return r?.exerciseIds ?? []
}
/**
 * `overhead` and `impact` were absent from this map in M0 while the domain's own
 * wiring proof carries them. They are reachable tags — `deriveTrainingCapability`
 * emits them from movement competency and pain-on-movement — so omitting them
 * meant a tag could be raised and then filter NOTHING. The live app cannot yet
 * source either input, so this changes no current persona; it removes a silent
 * safety hole rather than waiting for the input that would expose it.
 */
export const TRAINING_BLOCKLISTS = {
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

/**
 * The curated prescription cohort. Built once from the shipping catalog with no
 * golden seed: the host has no access to the QAE fixture goldens, so anything
 * outside the compound + primary-machine cohort is reported UNCURATED rather
 * than quietly prescribed from DERIVED metadata ([CTO-QAE-023] §9).
 */
const CURATION = buildCurationSet(catalog, [])

/** Exercises the prescriber can price from reviewed metadata. */
const CURATED_IDS: ReadonlySet<string> = new Set(CURATION.records.map((r) => r.exerciseId))

/**
 * Run QAE beside a LIVE plan and classify. NEVER throws: any QAE failure is
 * caught and reported as `qaeFailed`, so a shadow defect can never reach a user.
 */
export function runShadowComparison(profile: Profile, livePlan: WorkoutPlan): ShadowComparison {
  const preAttempt = {
    shadowVersion: SHADOW_VERSION,
    liveDayCount: livePlan.days.length,
    qaeDayCount: 0,
    // If the adapter itself throws we know nothing about this profile — so we
    // claim nothing. `false` here is "not established", never "verified absent".
    trainingComplete: false,
    missingTrainingRequired: [] as readonly string[],
    matchedAxes: [] as readonly ComparedAxis[],
    firstDifferingPath: null as string | null,
    probableCause: null as string | null,
    safetyRuleIds: [] as readonly string[],
    qaeSplitId: null as string | null,
    qaeEligiblePoolSize: 0,
    prescription: null as QaePrescriptionSummary | null,
    athleteProfileStatus: 'unbuilt' as 'complete' | 'incomplete' | 'unbuilt',
  }
  let attempt: AthleteProfileAttempt
  try {
    attempt = buildAthleteProfileAttempt(profile)
  } catch (err) {
    return { ...preAttempt, classification: 'qaeFailed', detail: `profileAdapter threw: ${String(err)}`, missingProfileFields: [] }
  }
  const missingProfileFields = attempt.missing.map((m) => m.field)
  const base = {
    ...preAttempt,
    trainingComplete: attempt.trainingCompleteness.completeForTraining,
    missingTrainingRequired: attempt.trainingCompleteness.missingRequired,
  }

  if (attempt.training === undefined) {
    return {
      ...base,
      classification: 'qaeIncompleteProfile',
      // Named, not counted: a bare number tells a reader nothing actionable.
      detail: `insufficient evidence for the Training path (missing: ${attempt.trainingCompleteness.missingRequired.join(', ') || missingProfileFields.join(', ')})`,
      missingProfileFields,
    }
  }

  try {
    const t = attempt.training
    const built = buildRealAthleteProfile(profile)
    const withStatus = { ...base, athleteProfileStatus: built.profile.status }

    // The REAL wired path: AthleteProfile → capability → pool → split → assembly.
    const planResult: TrainingPlanResult = buildTrainingPlan(built.profile, {
      catalog,
      access: t.access,
      blocklists: TRAINING_BLOCKLISTS,
    })
    if (!planResult.ok) {
      // An incomplete AthleteProfile is NOT a failure — it is the engine
      // correctly refusing to plan on evidence it does not have.
      const incomplete = planResult.reason === 'incompleteProfile'
      return {
        ...withStatus,
        classification: incomplete ? 'qaeIncompleteProfile' : 'qaeFailed',
        detail: `buildTrainingPlan refused: ${planResult.reason} (${planResult.detail}); missingEvidence=[${built.profile.dataQuality.missingEvidence.join(', ')}]`,
        missingProfileFields,
      }
    }

    const training = planResult.training
    const qaeDays = training.days
    const withPlan = {
      ...withStatus,
      qaeDayCount: qaeDays.length,
      qaeSplitId: training.splitId,
      qaeEligiblePoolSize: training.eligiblePoolSize,
    }

    // ── QAE-only prescription (reported, never compared) ──────────────────────
    const cap = deriveTrainingCapabilityProfile(built.profile)
    const rx: PrescriptionResult = prescribeInitialPlan({
      catalog,
      capability: cap,
      tier: tierFromCapability(cap),
      curation: CURATION,
      days: qaeDays,
      isMinor: built.profile.identity.ageYears !== null && built.profile.identity.ageYears < 18,
    })
    const prescription = summarisePrescription(rx)

    // ── Structural comparison, axis by axis, first difference wins ────────────
    const cmp = compareStructure(livePlan, training)
    const withRx = { ...withPlan, prescription, matchedAxes: cmp.matched }

    if (cmp.firstDifferingPath === null) {
      return {
        ...withRx,
        classification: 'exactStructuralMatch',
        detail: 'day count, split, kinds, exercise ids, order and optional flags all identical',
        missingProfileFields,
      }
    }

    // ── Safety outranks parity ────────────────────────────────────────────────
    // Where LIVE kept an exercise this athlete's injury tags exclude, QAE is
    // RIGHT to differ. That is an expectedDeviation naming the rule, not a bug.
    const safety = safetyExclusions(livePlan, cap)
    if (safety.ruleIds.length > 0) {
      return {
        ...withRx,
        classification: 'expectedDeviation',
        detail: `QAE excluded ${safety.excludedIds.length} contraindicated LIVE exercise(s): ${safety.excludedIds.join(', ')}`,
        firstDifferingPath: cmp.firstDifferingPath,
        probableCause: `safety exclusion by rule(s) ${safety.ruleIds.join(', ')} — LIVE retained an exercise the athlete's injury tags [${cap.injuryConstraints.join(', ')}] contraindicate`,
        safetyRuleIds: safety.ruleIds,
        missingProfileFields,
      }
    }

    const sameSkeleton = cmp.matched.includes('dayCount') && cmp.matched.includes('dayKinds')
    return {
      ...withRx,
      classification: sameSkeleton ? 'structuralMatch' : 'unexpectedDeviation',
      detail: sameSkeleton
        ? 'same day count and kinds, different exercise selection'
        : `structural mismatch at ${cmp.firstDifferingPath}`,
      firstDifferingPath: cmp.firstDifferingPath,
      probableCause: cmp.probableCause,
      missingProfileFields,
    }
  } catch (err) {
    return { ...base, classification: 'qaeFailed', detail: `QAE threw: ${String(err)}`, missingProfileFields }
  }
}

/** Dedupe + sort, so a summary never depends on emission order. */
const uniqSorted = (xs: readonly string[]): string[] => [...new Set(xs)].sort()

function summarisePrescription(rx: PrescriptionResult): QaePrescriptionSummary {
  const slots = rx.days.flatMap((d) =>
    d.slots.map((s) => ({
      exerciseId: s.exerciseId,
      sets: s.sets,
      repMin: s.repRange.min,
      repMax: s.repRange.max,
      targetRir: s.targetRir,
      restSeconds: s.restSeconds,
    })),
  )
  const uncurated = uniqSorted(slots.map((s) => s.exerciseId).filter((id) => !CURATED_IDS.has(id)))
  return {
    totalWorkingSets: rx.days.reduce((n, d) => n + d.totalWorkingSets, 0),
    slots,
    reasonCodes: uniqSorted([...rx.reasonCodes, ...rx.days.flatMap((d) => [...d.reasonCodes, ...d.slots.flatMap((s) => s.prescriptionReasonCodes)])]),
    uncuratedExerciseIds: uncurated,
    fullyPrescriptionReady: uncurated.length === 0,
  }
}

interface StructureComparison {
  matched: ComparedAxis[]
  firstDifferingPath: string | null
  probableCause: string | null
}

/**
 * Compare LIVE and QAE plans axis by axis and stop at the FIRST difference.
 *
 * Stopping early is deliberate: once day 0 holds a different exercise, every
 * later index differs as a consequence, and listing them all buries the one
 * fact a reader needs — where the plans first parted.
 */
function compareStructure(live: WorkoutPlan, training: { splitId: string; days: readonly { dayId: string; kind: string; exercises: readonly { exerciseId: string; optional?: boolean }[] }[] }): StructureComparison {
  const matched: ComparedAxis[] = []
  const fail = (path: string, cause: string): StructureComparison => ({ matched, firstDifferingPath: path, probableCause: cause })

  if (live.days.length !== training.days.length) {
    return fail('days.length', `LIVE ${live.days.length} days vs QAE ${training.days.length} — split generation disagrees about weekly frequency`)
  }
  matched.push('dayCount')

  // LIVE templates carry no splitId, so this axis records QAE's value and can
  // only be "matched" — never a source of divergence against a field that
  // does not exist on the other side.
  matched.push('splitId')

  for (let i = 0; i < live.days.length; i++) {
    if (live.days[i].id !== training.days[i].dayId) {
      return fail(`days[${i}].id`, `LIVE day id "${live.days[i].id}" vs QAE "${training.days[i].dayId}" — day-kind sequence differs`)
    }
  }
  matched.push('dayKinds')

  for (let i = 0; i < live.days.length; i++) {
    const l = live.days[i].exercises
    const q = training.days[i].exercises
    if (l.length !== q.length) {
      return fail(`days[${i}].exercises.length`, `LIVE ${l.length} vs QAE ${q.length} slots — target-count derivation differs for this tier/duration`)
    }
    const lSet = uniqSorted(l.map((e) => e.exerciseId))
    const qSet = uniqSorted(q.map((e) => e.exerciseId))
    if (lSet.join(',') !== qSet.join(',')) {
      const onlyLive = lSet.filter((id) => !qSet.includes(id))
      const onlyQae = qSet.filter((id) => !lSet.includes(id))
      return fail(
        `days[${i}].exercises[*].exerciseId`,
        `selection differs — only in LIVE: [${onlyLive.join(', ')}]; only in QAE: [${onlyQae.join(', ')}]`,
      )
    }
  }
  matched.push('exerciseIds')

  for (let i = 0; i < live.days.length; i++) {
    const l = live.days[i].exercises
    const q = training.days[i].exercises
    for (let j = 0; j < l.length; j++) {
      if (l[j].exerciseId !== q[j].exerciseId) {
        return fail(`days[${i}].exercises[${j}].exerciseId`, `same set, different order — LIVE "${l[j].exerciseId}" vs QAE "${q[j].exerciseId}" at slot ${j}`)
      }
    }
  }
  matched.push('exerciseOrder')

  for (let i = 0; i < live.days.length; i++) {
    const l = live.days[i].exercises
    const q = training.days[i].exercises
    for (let j = 0; j < l.length; j++) {
      const liveOptional = (l[j] as { optional?: boolean }).optional === true
      const qaeOptional = q[j].optional === true
      if (liveOptional !== qaeOptional) {
        return fail(`days[${i}].exercises[${j}].optional`, `LIVE optional=${liveOptional} vs QAE optional=${qaeOptional} — accessory/optional policy differs`)
      }
    }
  }
  matched.push('optionalFlags')

  return { matched, firstDifferingPath: null, probableCause: null }
}

/**
 * Which LIVE exercises this athlete's contraindication tags exclude.
 *
 * Reads the SAME blocklists the eligible pool uses, so "QAE would have removed
 * it" is answered by the mechanism that actually removes it — not by a second
 * opinion that could drift from the filter.
 */
function safetyExclusions(live: WorkoutPlan, cap: { injuryConstraints: readonly string[] }): { ruleIds: string[]; excludedIds: string[] } {
  const ruleIds: string[] = []
  const excludedIds = new Set<string>()
  const liveIds = new Set(live.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
  for (const tag of cap.injuryConstraints) {
    const blocked = TRAINING_BLOCKLISTS.injuryByTag[tag] ?? []
    const hits = blocked.filter((id) => liveIds.has(id))
    if (hits.length > 0) {
      ruleIds.push(`injuryByTag:${tag}`)
      for (const id of hits) excludedIds.add(id)
    }
  }
  return { ruleIds: uniqSorted(ruleIds), excludedIds: uniqSorted([...excludedIds]) }
}
