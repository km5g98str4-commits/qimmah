// Workout v2 model — Qimmah Design v2.1 (Slice 4). Read-only derivation from the
// real generated plan (customization.workoutPlan). Honest: no fake previous
// performance, no fake PRs. Categories are DERIVED from exercise order (a
// documented heuristic) since the plan template has no explicit category field.

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { todayPlanDay } from '@/lib/workoutPlan'
import { getExercise } from '@/data/exercises'
import { getCue } from '@/lib/coaching'

export type ExCategory = 'primary' | 'support' | 'isolation' | 'finisher'

export const CATEGORY_LABEL: Record<ExCategory, { ar: string; en: string }> = {
  primary: { ar: 'التمرين الأساسي', en: 'Primary lift' },
  support: { ar: 'دعم', en: 'Support' },
  isolation: { ar: 'عزل', en: 'Isolation' },
  finisher: { ar: 'إنهاء', en: 'Finisher' },
}

export interface WorkoutV2Exercise {
  id: string
  exerciseId: string
  nameAr: string
  nameEn: string
  category: ExCategory
  equipment: string[]
  muscles: string[]
  sets: number
  reps: string
  restSec: number
  targetWeightKg: number | null
  lastPerformance: string | null
  cues: string[]
  commonMistake: string | null
  replaceable: boolean
}

export interface WorkoutV2Model {
  available: boolean
  goal: CalorieGoal | null
  program: { titleAr: string; titleEn: string; contextAr: string; contextEn: string; estimatedDurationMin: number }
  session: { title: string; muscles: string[]; durationMin: number; exerciseCount: number; source: string }
  exercises: WorkoutV2Exercise[]
}

/** Category from position: first = primary, last = finisher, else support→isolation. */
function categoryFor(index: number, total: number): ExCategory {
  if (total <= 1) return 'primary'
  if (index === 0) return 'primary'
  if (index === total - 1) return 'finisher'
  return index <= Math.ceil(total / 2) ? 'support' : 'isolation'
}

// Universally-true fallback for an unknown custom exercise. Catalog exercises
// use the commissioned Arabic coaching layer (coverage is proven 181/181).
const GENERIC_CUES_AR = ['تحكّم في الهبوط', 'مدى حركة كامل', 'زفير عند الدفع']
const GENERIC_CUES_EN = ['Control the descent', 'Full range of motion', 'Exhale on the push']

/**
 * Re-skin one workout slot onto a substitute catalog exercise (screen 31). The
 * SLOT is preserved — id, category, sets, reps, restSec, targetWeightKg — so the
 * active session's rows (keyed by slot id) keep working and the prescription is
 * unchanged; only the exercise IDENTITY (name, equipment, muscles, cues) swaps.
 * Uses the same cue/muscle derivation as buildWorkoutV2Model (no divergence).
 * Returns the base unchanged if the substitute id is unknown.
 */
export function substituteWorkoutExercise(base: WorkoutV2Exercise, catalogExerciseId: string, lang: Lang): WorkoutV2Exercise {
  const ar = lang !== 'en'
  const ex = getExercise(catalogExerciseId)
  if (!ex) return base
  const authoredCue = getCue(ex.id)
  const muscles = [ex.primaryMuscle, ...ex.secondaryMuscles].filter(Boolean).slice(0, 3)
  return {
    ...base,
    exerciseId: ex.id,
    nameAr: ex.nameAr,
    nameEn: ex.nameEn,
    equipment: ex.equipment,
    muscles,
    cues: ar ? authoredCue?.steps ?? GENERIC_CUES_AR : GENERIC_CUES_EN,
    commonMistake: ar ? authoredCue?.mistakes[0] ?? null : null,
    lastPerformance: null, // never fake a previous weight for the swapped-in lift
  }
}

export function buildWorkoutV2Model(customization: Customization, lang: Lang): WorkoutV2Model {
  const ar = lang !== 'en'
  const day = todayPlanDay(customization.workoutPlan)
  const goal = customization.profile.goal ?? null
  const list = day?.exercises ?? []
  const total = list.length

  const exercises: WorkoutV2Exercise[] = list.map((pe, i) => {
    const ex = getExercise(pe.exerciseId)
    const authoredCue = ex ? getCue(ex.id) : null
    const muscles = ex ? [ex.primaryMuscle, ...ex.secondaryMuscles].filter(Boolean).slice(0, 3) : []
    return {
      id: pe.id,
      exerciseId: pe.exerciseId,
      nameAr: pe.customNameAr ?? ex?.nameAr ?? pe.exerciseId,
      nameEn: pe.customNameEn ?? ex?.nameEn ?? pe.exerciseId,
      category: categoryFor(i, total),
      equipment: ex?.equipment ?? [],
      muscles,
      sets: pe.sets,
      reps: pe.reps,
      restSec: pe.restSec,
      targetWeightKg: null, // no real history yet — honest null
      lastPerformance: null, // never fake a previous weight
      cues: ar ? authoredCue?.steps ?? GENERIC_CUES_AR : GENERIC_CUES_EN,
      commonMistake: ar ? authoredCue?.mistakes[0] ?? null : null,
      replaceable: true,
    }
  })

  // Source classification: NON-STANDARD Qimmah display heuristic (~9 min/exercise, rounded to 5).
  const durationMin = total > 0 ? Math.max(20, Math.round((total * 9) / 5) * 5) : 0
  const muscles = Array.from(new Set(exercises.flatMap((e) => e.muscles))).slice(0, 4)
  const goalWordAr = goal === 'cut' ? 'التنشيف' : goal === 'bulk' ? 'التضخيم' : goal === 'maintain' ? 'المحافظة' : ''

  return {
    available: total > 0,
    goal,
    program: {
      titleAr: goalWordAr ? `برنامج ${goalWordAr}` : 'برنامجك',
      titleEn: goal ? `${goal} program` : 'Your program',
      contextAr: day ? day.nameAr : '',
      contextEn: day ? day.nameEn : '',
      estimatedDurationMin: durationMin,
    },
    session: {
      title: day ? (ar ? day.nameAr : day.nameEn) : '',
      muscles,
      durationMin,
      exerciseCount: total,
      source: ar ? 'من خطتك المولّدة' : 'from your generated plan',
    },
    exercises,
  }
}
