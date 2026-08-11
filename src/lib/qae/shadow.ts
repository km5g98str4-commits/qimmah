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
  status: 'complete' | 'incomplete'
  /** fields mapped from explicit live evidence */
  mapped: readonly AthleteProfileField[]
  /** fields the live app genuinely cannot supply — each named, with a reason */
  missing: ReadonlyArray<{ field: AthleteProfileField; reason: string }>
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

  // ── Fields the live app CANNOT supply. Named individually, never inferred. ──
  missing.push({
    field: 'training.experienceBand.recentTrainingExposure',
    reason: 'no onboarding question records when the user last trained; trainingLevel is a self-rating, not exposure evidence',
  })
  missing.push({
    field: 'training.experienceBand.currentWorkCapacity',
    reason: 'requires exposure + consistency evidence, neither of which onboarding collects',
  })
  missing.push({
    field: 'training.experienceBand.consistencyHistory',
    reason: 'no onboarding question records training consistency (rare/on-off/mostly/steady)',
  })
  missing.push({
    field: 'training.returningStatus',
    reason: 'requires lastTrained + totalMonths; onboarding collects neither. Inferring it from trainingLevel would be a weak proxy',
  })
  missing.push({
    field: 'training.consistency',
    reason: 'not collected by OnboardingV2',
  })
  missing.push({
    field: 'training.movementCompetency',
    reason: 'no onboarding question covers overhead/hinge/squat-depth/impact/standing tolerance',
  })
  missing.push({
    field: 'training.trainingHistory.trainedBefore',
    reason: 'not collected; trainingLevel does not distinguish never-trained from detrained',
  })
  missing.push({
    field: 'training.trainingHistory.totalMonthsBucket',
    reason: 'not collected by OnboardingV2',
  })
  missing.push({
    field: 'training.trainingHistory.lastTrainedBucket',
    reason: 'not collected by OnboardingV2',
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

  // A profile is COMPLETE only if nothing is missing. Given the fields above,
  // no live profile can currently be complete — that is the honest result, and
  // it is exactly what M1 has to fix.
  const status: AthleteProfileAttempt['status'] = missing.length === 0 ? 'complete' : 'incomplete'

  const trainingRunnable =
    tier !== null && access !== null && Number.isFinite(days) && days >= 1 && Number.isFinite(minutes) && minutes > 0

  return {
    status,
    mapped,
    missing,
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
  const base = {
    shadowVersion: SHADOW_VERSION,
    liveDayCount: livePlan.days.length,
    qaeDayCount: 0,
  }
  let attempt: AthleteProfileAttempt
  try {
    attempt = buildAthleteProfileAttempt(profile)
  } catch (err) {
    return { ...base, classification: 'qaeFailed', detail: `profileAdapter threw: ${String(err)}`, missingProfileFields: [] }
  }
  const missingProfileFields = attempt.missing.map((m) => m.field)

  if (attempt.training === undefined) {
    return {
      ...base,
      classification: 'qaeIncompleteProfile',
      detail: `insufficient evidence for the Training path (${missingProfileFields.length} fields unavailable)`,
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
