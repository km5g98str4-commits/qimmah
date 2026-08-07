// QAE Oracle Adapter (Phase 1). Executes the LEGACY engines on fixture inputs
// and canonicalizes their outputs into integer-only goldens (NUMERIC-CONTRACT).
// Expectations come from *running* the oracle, never from reading its code.
// Bundled by run-oracle-harness.mjs with the repo's @→src alias.

import { computeTargets, defaultProfile, effectiveGoalTypeForAge } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import type { GoalType as LegacyGoalType, Profile } from '@/types/profile'

export interface FixtureProfile {
  sex: 'male' | 'female' | 'unspecified'
  ageYears?: number
  heightMm: number
  massGrams: number
  targetMassGrams?: number
  goalType?: 'cut' | 'bulk' | 'maintain'
  requestedGoalType?: 'cut' | 'bulk' | 'maintain'
  experienceClass: string
  daysPerWeek: number
  sessionMinutes: number
  environment: 'gym' | 'home' | 'machinesOnly'
  gymAccess?: 'full' | 'small' | 'home' | 'bodyweight'
  equipment?: string[]
  injuryFlags?: string[]
  neatBand?: string
}

const GOAL_TO_LEGACY: Record<string, LegacyGoalType> = {
  cut: 'cutting',
  bulk: 'bulking',
  maintain: 'maintenance',
}

const NEAT_TO_LEGACY: Record<string, Profile['activityLevel']> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  active: 'active',
  veryActive: 'very_active',
}

interface ExperienceMapping {
  trainingLevel: Profile['trainingLevel']
  experienceBand: NonNullable<Profile['experienceBand']>
  consistency?: Profile['consistency']
}

const EXPERIENCE_TO_LEGACY: Record<string, ExperienceMapping> = {
  complete_beginner: { trainingLevel: 'beginner', experienceBand: 'lt1m' },
  beginner: { trainingLevel: 'beginner', experienceBand: '1to6m' },
  early_intermediate: { trainingLevel: 'intermediate', experienceBand: '6to12m' },
  intermediate: { trainingLevel: 'intermediate', experienceBand: '1to2y' },
  advanced: { trainingLevel: 'advanced', experienceBand: 'gt2y' },
  returning: { trainingLevel: 'advanced', experienceBand: 'gt2y', consistency: 'returning' },
}

export function toLegacyProfile(fx: FixtureProfile): Profile {
  const exp = EXPERIENCE_TO_LEGACY[fx.experienceClass] ?? EXPERIENCE_TO_LEGACY.beginner
  const goal = fx.goalType ?? fx.requestedGoalType ?? 'maintain'
  const profile: Profile = {
    ...defaultProfile,
    gender: fx.sex,
    age: fx.ageYears ?? 0,
    heightCm: Math.round(fx.heightMm / 10),
    weightKg: fx.massGrams / 1000,
    targetWeightKg: fx.targetMassGrams !== undefined ? fx.targetMassGrams / 1000 : fx.massGrams / 1000,
    goalType: GOAL_TO_LEGACY[goal],
    goal: goal,
    trainingDays: fx.daysPerWeek,
    workoutDuration: fx.sessionMinutes,
    workoutEnvironment: fx.environment === 'home' ? 'home' : 'gym',
    trainingLevel: exp.trainingLevel,
    experienceBand: exp.experienceBand,
    injuries: (fx.injuryFlags ?? []).join(' '),
  }
  if (exp.consistency) profile.consistency = exp.consistency
  if (fx.gymAccess) profile.gymAccess = fx.gymAccess
  if (fx.environment === 'home') profile.gymAccess = 'home'
  if (fx.neatBand && NEAT_TO_LEGACY[fx.neatBand]) profile.activityLevel = NEAT_TO_LEGACY[fx.neatBand]
  return profile
}

// Legacy emits floats for some fields; the float→canonical-integer boundary is
// crossed exactly once, here, with explicit scaling per field.
const int = (v: number, label: string): number => {
  if (!Number.isFinite(v)) throw new Error(`oracle-adapter: non-finite ${label}`)
  return Math.round(v)
}

export interface OracleGolden {
  targets: Record<string, number | string>
  plan: {
    suggestedWorkoutTemplateId: string
    weeklySchedule: Array<{ day: string; type: string }>
    workoutDays: Array<{ id: string; exercises: Array<{ exerciseId: string; sets: number; reps: string; restSec: number; optional: boolean }> }>
    warningsAr: string[]
    commitments: string[]
  }
}

export function runOracle(fx: FixtureProfile): OracleGolden {
  const profile = toLegacyProfile(fx)
  const targets = computeTargets(profile)
  const generated = generatePlan(profile)

  return {
    targets: {
      bmrKcal: int(targets.bmr, 'bmr'),
      tdeeKcal: int(targets.tdee, 'tdee'),
      targetKcal: int(targets.targetCalories, 'targetCalories'),
      maintenanceKcal: int(targets.maintenanceCalories, 'maintenance'),
      cuttingKcal: int(targets.cuttingCalories, 'cutting'),
      bulkingKcal: int(targets.bulkingCalories, 'bulking'),
      proteinG: int(targets.proteinGrams, 'protein'),
      fatG: int(targets.fatGrams, 'fat'),
      carbsG: int(targets.carbsGrams, 'carbs'),
      waterMl: Math.round(targets.waterLiters * 1000),
      bmiCenti: Math.round(targets.bmi * 100),
      weeklyWeightChangeGrams: Math.round(targets.weeklyWeightChangeKg * 1000),
      estimatedWeeksToGoal: int(targets.estimatedWeeksToGoal, 'weeks'),
      effectiveGoalLegacy: effectiveGoalTypeForAge(profile.goalType, profile.age),
    },
    plan: {
      suggestedWorkoutTemplateId: generated.suggestedWorkoutTemplateId,
      weeklySchedule: generated.weeklySchedule.map((row) => ({ day: row.day, type: row.type })),
      workoutDays: generated.workoutPlan.days.map((day) => ({
        id: day.id,
        exercises: day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          restSec: ex.restSec,
          optional: ex.optional === true,
        })),
      })),
      warningsAr: [...generated.warningsAr],
      commitments: generated.commitmentPlan.items.map((item) => item.id),
    },
  }
}
