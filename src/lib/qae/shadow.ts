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
import { assembleDays, deriveTargetCount, type ExpTier } from '@qae/Domain/Training/assembly'
import { generateSplit } from '@qae/Domain/Training/split'
import { buildEligiblePool, isMachinesOnly, type GymAccess } from '@qae/Domain/Training/plan'
import { classifyExperience, deriveReturningStatus } from '@qae/Domain/ProfileClassification/classify'
import type { FactValue } from '@qae/Domain/Evidence/model'
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
  | 'exactMatch'
  | 'structuralMatch'
  | 'expectedDeviation'
  | 'unexpectedDeviation'
  | 'qaeIncompleteProfile'
  | 'qaeFailed'

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
const BLOCKLISTS = {
  injuryByTag: {
    knee: ruleIds('legacy-injury-knee'),
    shoulder: ruleIds('legacy-injury-shoulder'),
    lower_back: ruleIds('legacy-injury-back'),
    wrist: ruleIds('legacy-injury-wrist'),
    elbow: ruleIds('legacy-injury-elbow'),
    ankle: ruleIds('legacy-injury-ankle'),
  } as Record<string, string[]>,
  levelCapped: ruleIds('legacy-level-cap'),
  freeCable: ruleIds('legacy-free-cable-beginner'),
}

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
    const pool = buildEligiblePool(catalog, {
      access: t.access,
      tier: t.tier,
      injuryConstraints: t.injuryAreas as never[],
      blocklists: BLOCKLISTS,
    })
    if (pool.ids.length === 0) {
      return { ...base, classification: 'qaeFailed', detail: 'eligible pool empty', missingProfileFields }
    }
    const split = generateSplit(t.daysPerWeek)
    const assembled = assembleDays(catalog, {
      daySpecs: split.daySpecs,
      poolIds: pool.ids,
      targetPerDay: deriveTargetCount(t.tier, t.sessionMinutes),
      machinesOnly: isMachinesOnly(t.access),
      preferMachines: pool.preferMachines,
      accessoryPool: { triceps: [], biceps: [], abs: [] },
    })

    const qaeDayCount = assembled.days.length
    const liveIds = livePlan.days.map((d) => d.exercises.map((e) => e.exerciseId).join(','))
    const qaeIds = assembled.days.map((d) => d.exercises.map((e) => e.exerciseId).join(','))

    if (qaeDayCount !== livePlan.days.length) {
      return {
        ...base,
        qaeDayCount,
        classification: 'unexpectedDeviation',
        detail: `day count ${qaeDayCount} vs live ${livePlan.days.length}`,
        missingProfileFields,
      }
    }
    if (liveIds.join('|') === qaeIds.join('|')) {
      return { ...base, qaeDayCount, classification: 'exactMatch', detail: 'exercise ids and order identical', missingProfileFields }
    }
    const sameKinds = livePlan.days.every((d, i) => d.id === assembled.days[i]?.dayId)
    return {
      ...base,
      qaeDayCount,
      classification: sameKinds ? 'structuralMatch' : 'unexpectedDeviation',
      detail: sameKinds ? 'same day structure, different exercise selection' : 'day ids differ',
      missingProfileFields,
    }
  } catch (err) {
    return { ...base, classification: 'qaeFailed', detail: `QAE threw: ${String(err)}`, missingProfileFields }
  }
}
