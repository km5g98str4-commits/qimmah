import {
  BULK_SURPLUS,
  CUT_DEFICIT,
  KCAL_PER_KG,
  computeTargets,
  effectiveGoalTypeForAge,
  mifflinSexConstant,
  totalActivityMultiplier,
} from '@/lib/calculators'
import type { MeasurementLog } from '@/types/progress'
import type { GoalType, Profile, Targets } from '@/types/profile'

export type CalcCertainty = 'measured' | 'estimated' | 'policy' | 'derived'

export interface CalcExplainerData {
  profile: Profile
  calculated: Targets
  saved: Targets
  effectiveGoalType: GoalType
  activityMultiplier: number
  sexConstant: number
  calorieAdjustment: number
  rawTargetCalories: number
  expectedWeeklyChangeKg: number
  calorieFloorApplied: boolean
  manuallyEdited: boolean
  actualWeeklyChangeKg: number | null
  actualRateDays: number | null
}

export type CalcExplainerSnapshot =
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'filled'; data: CalcExplainerData }

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function numericWeight(log: MeasurementLog): number | null {
  const raw = log.values.weightKg
  if (raw === undefined || raw === '') return null
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''))
  return finitePositive(value) ? value : null
}

export function actualWeeklyWeightChange(
  logs: MeasurementLog[],
): { value: number; days: number } | null {
  const points = logs
    .map((log) => {
      const value = numericWeight(log)
      const time = Date.parse(log.date)
      return value === null || !Number.isFinite(time) ? null : { value, time }
    })
    .filter((point): point is { value: number; time: number } => point !== null)
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  const days = Math.round((last.time - first.time) / 86_400_000)
  if (days < 1) return null

  return {
    value: Math.round((((last.value - first.value) / days) * 7) * 10) / 10,
    days,
  }
}

export function buildCalcExplainerSnapshot(
  profile: Profile,
  saved: Targets,
  manuallyEdited: boolean,
  logs: MeasurementLog[],
): CalcExplainerSnapshot {
  if (
    !finitePositive(profile.weightKg) ||
    !finitePositive(profile.heightCm) ||
    !finitePositive(profile.age)
  ) {
    return { status: 'empty' }
  }

  try {
    const calculated = computeTargets(profile)
    const required = [
      calculated.bmr,
      calculated.tdee,
      calculated.targetCalories,
      calculated.proteinGrams,
      calculated.fatGrams,
      calculated.carbsGrams,
      calculated.waterLiters,
    ]
    if (required.some((value) => !Number.isFinite(value) || value < 0)) return { status: 'error' }

    const effectiveGoalType = effectiveGoalTypeForAge(profile.goalType, profile.age)
    const calorieAdjustment =
      effectiveGoalType === 'cutting'
        ? -CUT_DEFICIT
        : effectiveGoalType === 'bulking'
          ? BULK_SURPLUS
          : 0
    const rawTargetCalories = calculated.tdee + calorieAdjustment
    const expectedWeeklyChangeKg =
      Math.round(((calorieAdjustment * 7) / KCAL_PER_KG) * 10) / 10
    const actual = actualWeeklyWeightChange(logs)

    return {
      status: 'filled',
      data: {
        profile,
        calculated,
        saved,
        effectiveGoalType,
        activityMultiplier: totalActivityMultiplier(profile.activityLevel, profile.trainingDays),
        sexConstant: mifflinSexConstant(profile.gender),
        calorieAdjustment,
        rawTargetCalories,
        expectedWeeklyChangeKg,
        calorieFloorApplied: calculated.targetCalories !== rawTargetCalories,
        manuallyEdited,
        actualWeeklyChangeKg: actual?.value ?? null,
        actualRateDays: actual?.days ?? null,
      },
    }
  } catch {
    return { status: 'error' }
  }
}
