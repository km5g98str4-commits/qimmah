// Training-selection oracle ([CTO-QAE-007] §A) — characterizes the two legacy
// selection surfaces at their EXPORTED boundaries, byte-identical goldens:
//
//   1. Shipping path  — generatePlan(Profile) → workoutPlan day exercise ids
//      (slot engine: SLOTS × pool filters × machine-first sort × A/B partition).
//   2. Candidate path — deriveProfile(answers) → selectExercises(profile):
//      ranked candidates with score parts, exclusions with named reasons,
//      substitutions (the 4-stage personalization selector).
//
// READ-ONLY over shipping code. Internal planGenerator filters (INJURY_RISKY_IDS,
// cableOk, levelOk) are characterized separately by source extraction in
// extract-legacy-blocklists.ts — this adapter records their *effects*.
//
// Verify mode by default: existing golden files must match byte-identically.
// Set QAE_UPDATE_TRAINING_GOLDENS=1 to (re)write.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { generatePlan } from '@/lib/planGenerator'
import type { Profile } from '@/types/profile'
import {
  applyAnswer,
  createState,
  selectNext,
  skipQuestion,
  visibleOptions,
  CONSENT_QUESTION_ID,
  type EngineConfig,
} from '@/lib/personalization/engine'
import { deriveProfile } from '@/lib/personalization/profile'
import { selectExercises } from '@/lib/personalization/exerciseSelection'
import { DEFAULT_BUDGET, type AnswerValue, type PersonalizationState } from '@/lib/personalization/types'
import { getExercise } from '@/data/exercises'

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const OUT_DIR = resolvePath(qaeRoot, 'Fixtures/golden/training')
mkdirSync(OUT_DIR, { recursive: true })

// Deterministic clock — same convention as scripts/personalization-proof.ts.
let clockValue = 1_700_000_000_000
const CFG: EngineConfig = { budget: DEFAULT_BUDGET, now: () => (clockValue += 1000) }

/** Stable stringify: sorted keys, 2-space, integers only (scores are ints). */
function canonical(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]))
    }
    if (typeof v === 'number' && !Number.isInteger(v)) throw new Error(`float in golden: ${v}`)
    return v
  }
  return JSON.stringify(sort(value), null, 2) + '\n'
}

interface Scenario {
  name: string
  /** shipping-path Profile (legacy plan generator input) */
  profile: Profile
  /** personalization answers (deriveProfile → selectExercises input) */
  answers: Record<string, AnswerValue>
}

const baseProfile: Profile = {
  name: 'oracle',
  gender: 'male',
  age: 30,
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 78,
  activityLevel: 'moderate',
  trainingLevel: 'beginner',
  goal: 'maintain',
  goalType: 'maintenance',
  trainingDays: 3,
  workoutDuration: 60,
  workoutEnvironment: 'gym',
  injuries: '',
  healthNotes: '',
  trackNutrition: true,
  mealsPerDay: 3,
  nutritionStyle: 'simple',
  dislikedFoods: '',
}

const baseAnswers: Record<string, AnswerValue> = {
  age: 30, sex: 'male', heightCm: 178, weightKg: 82,
  trainedBefore: 'never', primaryGoalDisplay: 'general_health',
  daysPerWeek: '3', sessionMinutes: '60', place: 'gym', gymType: 'full',
  trainingStyle: 'machines', hasInjury: 'none',
}

const intermediateAnswers: Record<string, AnswerValue> = {
  ...baseAnswers,
  trainedBefore: 'years', totalMonths: 'y1_3', consistency: 'mostly', lastTrained: 'now',
  selfLevel: 'intermediate', programExperience: 'followed', knowsProgression: 'yes',
  tracksSets: 'always', primaryGoalDisplay: 'muscle_gain', daysPerWeek: '4',
  trainingStyle: 'mixed',
}

const advancedAnswers: Record<string, AnswerValue> = {
  ...intermediateAnswers,
  totalMonths: 'y3_plus', consistency: 'steady', selfLevel: 'advanced',
  programExperience: 'wrote_own', exerciseFamiliarity: 'all', trainingAgeHonest: 'gt5',
  daysPerWeek: '5', sessionMinutes: '75', trainingStyle: 'free_weights',
}

const SCENARIOS: Scenario[] = [
  {
    name: 'beginner-full-gym',
    profile: { ...baseProfile, trainingLevel: 'beginner', experienceBand: 'lt1m', gymAccess: 'full', gymType: 'commercial', trainingDays: 3, workoutDuration: 45 },
    answers: { ...baseAnswers, sessionMinutes: '45' },
  },
  {
    name: 'beginner-home',
    profile: { ...baseProfile, trainingLevel: 'beginner', experienceBand: 'lt1m', gymAccess: 'home', gymType: 'home', workoutEnvironment: 'home', equipment: ['dumbbell', 'bench'], trainingDays: 3, workoutDuration: 45 },
    answers: { ...baseAnswers, sessionMinutes: '45', place: 'home', gymType: undefined as never, equipmentList: ['dumbbell', 'bench', 'bodyweight'], trainingStyle: 'mixed' },
  },
  {
    name: 'beginner-bodyweight',
    profile: { ...baseProfile, trainingLevel: 'beginner', experienceBand: 'lt1m', gymAccess: 'bodyweight', gymType: 'bodyweight', workoutEnvironment: 'home', trainingDays: 3, workoutDuration: 30 },
    answers: { ...baseAnswers, sessionMinutes: '30', place: 'home', gymType: undefined as never, equipmentList: ['bodyweight'], bodyweightOnly: true, trainingStyle: 'bodyweight' },
  },
  {
    name: 'intermediate-full-gym',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', goalType: 'bulking', goal: 'bulk', trainingDays: 4, workoutDuration: 60 },
    answers: { ...intermediateAnswers },
  },
  {
    name: 'advanced-full-gym',
    profile: { ...baseProfile, trainingLevel: 'advanced', experienceBand: 'gt2y', gymAccess: 'full', gymType: 'commercial', goalType: 'bulking', goal: 'bulk', trainingDays: 5, workoutDuration: 75 },
    answers: { ...advancedAnswers },
  },
  {
    name: 'advanced-limited-equipment',
    profile: { ...baseProfile, trainingLevel: 'advanced', experienceBand: 'gt2y', gymAccess: 'home', gymType: 'home', workoutEnvironment: 'home', equipment: ['dumbbell', 'bench'], goalType: 'bulking', goal: 'bulk', trainingDays: 4, workoutDuration: 60 },
    answers: { ...advancedAnswers, daysPerWeek: '4', sessionMinutes: '60', place: 'home', gymType: undefined as never, equipmentList: ['dumbbell', 'bench', 'bodyweight'], dumbbellKind: 'adjustable', dumbbellMaxKg: 30 },
  },
  {
    name: 'returning-advanced',
    profile: { ...baseProfile, trainingLevel: 'advanced', experienceBand: 'gt2y', gymAccess: 'full', gymType: 'commercial', goalType: 'returning', trainingDays: 4, workoutDuration: 60 },
    answers: { ...advancedAnswers, daysPerWeek: '4', sessionMinutes: '60', lastTrained: 'y1_plus', returnReason: 'time', returnRamp: 'easy' },
  },
  {
    name: 'knee-restriction',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 4, workoutDuration: 60, injuries: 'knee' },
    answers: { ...intermediateAnswers, hasInjury: 'current', currentInjuryAreas: ['knee'], kneeDepth: 'avoid', painOnMovement: ['squat'], painLevel: 3 },
  },
  {
    name: 'shoulder-restriction',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 4, workoutDuration: 60, injuries: 'shoulder' },
    answers: { ...intermediateAnswers, hasInjury: 'current', currentInjuryAreas: ['shoulder'], shoulderOverhead: 'cannot', painOnMovement: ['overhead'], painLevel: 4 },
  },
  {
    name: 'back-restriction',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 4, workoutDuration: 60, injuries: 'lower_back' },
    answers: { ...intermediateAnswers, hasInjury: 'current', currentInjuryAreas: ['lower_back'], backHinge: 'avoid', painOnMovement: ['hinge'], painLevel: 3 },
  },
  {
    name: 'multiple-restrictions',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 3, workoutDuration: 45, injuries: 'knee shoulder lower_back' },
    answers: { ...intermediateAnswers, daysPerWeek: '3', sessionMinutes: '45', hasInjury: 'current', currentInjuryAreas: ['knee', 'shoulder', 'lower_back'], kneeDepth: 'avoid', shoulderOverhead: 'cannot', backHinge: 'avoid', painOnMovement: ['squat', 'overhead', 'hinge'], painLevel: 4 },
  },
  {
    name: 'three-day',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '6to12m', gymAccess: 'full', gymType: 'commercial', trainingDays: 3, workoutDuration: 45, goalType: 'cutting', goal: 'cut' },
    answers: { ...intermediateAnswers, trainedBefore: 'months', totalMonths: 'm6_12', selfLevel: undefined as never, primaryGoalDisplay: 'fat_loss', daysPerWeek: '3', sessionMinutes: '45', cardioWilling: 'yes' },
  },
  {
    name: 'four-day',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 4, workoutDuration: 60 },
    answers: { ...intermediateAnswers },
  },
  {
    name: 'five-day',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 5, workoutDuration: 60, muscleFocus: 'arms' },
    answers: { ...intermediateAnswers, daysPerWeek: '5' },
  },
  {
    name: 'six-day',
    profile: { ...baseProfile, trainingLevel: 'intermediate', experienceBand: '1to2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 6, workoutDuration: 60 },
    answers: { ...intermediateAnswers, daysPerWeek: '6' },
  },
  {
    name: 'short-session',
    profile: { ...baseProfile, trainingLevel: 'beginner', experienceBand: '1to6m', gymAccess: 'full', gymType: 'commercial', trainingDays: 3, workoutDuration: 30 },
    answers: { ...baseAnswers, trainedBefore: 'tried', sessionMinutes: '30' },
  },
  {
    name: 'long-session',
    profile: { ...baseProfile, trainingLevel: 'advanced', experienceBand: 'gt2y', gymAccess: 'full', gymType: 'commercial', trainingDays: 4, workoutDuration: 90, goalType: 'bulking', goal: 'bulk' },
    answers: { ...advancedAnswers, daysPerWeek: '4', sessionMinutes: '90' },
  },
]

/** Engine walk (characterized personalization path — same recipe as the shipping proof). */
function walk(answers: Record<string, AnswerValue>): PersonalizationState {
  let s = createState('ar', null, clockValue)
  for (let guard = 0; guard < 200; guard++) {
    const sel = selectNext(s, CFG)
    if (!sel.question) break
    const q = sel.question
    if (q.id === CONSENT_QUESTION_ID) { s = applyAnswer(s, q.id, true, CFG).state; continue }
    const known = answers[q.key]
    if (known !== undefined) {
      const r = applyAnswer(s, q.id, known, CFG)
      s = r.rejected ? skipQuestion(s, q.id, CFG).state : r.state
      continue
    }
    if (!q.skippable) {
      const opt = visibleOptions(q, s)[0]
      const fallback: AnswerValue = opt ? opt.value : q.range ? Math.round((q.range.min + q.range.max) / 2) : q.answer === 'boolean' ? false : []
      s = applyAnswer(s, q.id, fallback, CFG).state
    } else {
      s = skipQuestion(s, q.id, CFG).state
    }
  }
  return s
}

const update = process.env.QAE_UPDATE_TRAINING_GOLDENS === '1'
let written = 0
let verified = 0
const mismatches: string[] = []

for (const sc of SCENARIOS) {
  clockValue = 1_700_000_000_000
  const generated = generatePlan(sc.profile)
  const state = walk({ ...sc.answers })
  const { profile: pers } = deriveProfile(state, clockValue)
  const sel = selectExercises(pers)

  const golden = {
    oracle: 'training-selection',
    oracleVersion: '1.0.0',
    scenario: sc.name,
    profileEvidence: {
      shipping: {
        trainingLevel: sc.profile.trainingLevel,
        experienceBand: sc.profile.experienceBand ?? null,
        gymAccess: sc.profile.gymAccess ?? null,
        equipment: sc.profile.equipment ?? null,
        trainingDays: sc.profile.trainingDays,
        workoutDuration: sc.profile.workoutDuration,
        injuries: sc.profile.injuries,
        goalType: sc.profile.goalType,
        muscleFocus: sc.profile.muscleFocus ?? null,
      },
      personalization: {
        experience: pers.experience,
        trainingStatus: pers.trainingStatus,
        place: pers.place,
        equipment: [...pers.equipment].sort(),
        trainingStyle: pers.trainingStyle,
        daysPerWeek: pers.daysPerWeek,
        sessionMinutes: pers.sessionMinutes,
        maxExerciseLevel: pers.planConstraints.maxExerciseLevel,
        requiredPatterns: [...pers.planConstraints.requiredPatterns].sort(),
        excludedPatterns: [...pers.safety.excludedPatterns].sort(),
        excludedMuscles: [...pers.safety.excludedMuscles].sort(),
        noOverhead: pers.safety.noOverhead,
        noImpact: pers.safety.noImpact,
        needsClearance: pers.safety.needsClearance,
        limitations: pers.limitations.map((l) => ({ area: l.area, kind: l.kind, active: l.active })),
        excludedExercises: [...pers.excludedExercises].sort(),
        preferredExercises: [...pers.preferredExercises].sort(),
        musclePriorities: [...pers.musclePriorities].sort(),
        primaryGoal: pers.primaryGoal,
      },
    },
    // Shipping slot engine: final selection per day, in slot order.
    shippingPlan: {
      templateId: generated.suggestedWorkoutTemplateId,
      days: generated.workoutPlan.days.map((d) => ({
        id: d.id,
        exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, order: e.order, optional: e.optional === true })),
      })),
    },
    // Personalization candidate machinery: ranked pool, exclusions, substitutions.
    candidateSelection: {
      rankedCount: sel.ranked.length,
      ranked: sel.ranked.map((r) => ({ id: r.id, score: r.score, parts: r.parts })),
      excluded: [...sel.excluded].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.reason < b.reason ? -1 : 1)),
      substitutions: sel.substitutions,
    },
  }

  // Sanity: every id the oracle recorded exists in the shipping catalog.
  for (const day of golden.shippingPlan.days) {
    for (const e of day.exercises) {
      if (!getExercise(e.exerciseId)) throw new Error(`${sc.name}: unknown exercise id in shipping plan: ${e.exerciseId}`)
    }
  }

  const file = resolvePath(OUT_DIR, `${sc.name}.golden.json`)
  const text = canonical(golden)
  if (existsSync(file) && !update) {
    const prior = readFileSync(file, 'utf8')
    if (prior === text) verified++
    else mismatches.push(sc.name)
  } else {
    writeFileSync(file, text)
    written++
  }
}

if (mismatches.length > 0) {
  console.error(`training-oracle: MISMATCH vs goldens: ${mismatches.join(', ')}`)
  process.exit(1)
}
console.log(`training-oracle: ${SCENARIOS.length} scenarios — ${verified} verified byte-identical, ${written} written`)
