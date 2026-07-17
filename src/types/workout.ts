// أنواع مكتبة التمارين وقوالب الجداول وخطة التمرين (Qimmah v2).

import type { MuscleId } from './muscles'
import type { Lang } from '@/lib/appPreferences'

// ── Live gym dashboard (v11 experience) ──────────────────────────────────────
// Central home for the live-workout dashboard contracts so views, data, and the
// metrics lib all share one definition instead of re-declaring their own.

/** Self-reported energy level, 1 (very low) … 5 (peak). */
export type EnergyValue = 1 | 2 | 3 | 4 | 5

/** A selectable energy step with its bilingual label. */
export interface EnergyLevelOption {
  value: EnergyValue
  ar: string
  en: string
}

/**
 * A single validated heart-rate sample delivered by a native/watch bridge.
 * Never fabricated by the web app — see `heartRateProviderAvailable`.
 */
export interface HeartRateReading {
  bpm: number
  measuredAt: number
  source: 'watch' | 'health'
}

/** Props for the live workout dashboard shown during an active v2 session. */
export interface LiveGymDashboardProps {
  lang: Lang
  startedAt: number
  now: number
  currentExercise: string
  currentSet: number
  currentSetTotal: number
  completedSets: number
  totalSets: number
  restLeft: number
  isResting: boolean
  /** null until the user explicitly picks a level — no default is preselected. */
  energy: EnergyValue | null
  onEnergyChange: (value: EnergyValue) => void
}

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'calves'
  | 'core'
  | 'cardio'

export type ExLevel = 'beginner' | 'intermediate' | 'advanced'
export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'isolation'
  | 'carry'
  | 'core'
  | 'cardio'
  | 'mobility'
export type ExEnvironment = 'gym' | 'home' | 'both'
// مصدر الفيديو: بحث يوتيوب موثوق، أو فيديو موثوق محدّد، أو مخصّص من المستخدم.
export type VideoSource = 'official' | 'trusted' | 'custom' | 'youtube_search' | 'trusted_video'

export interface Exercise {
  id: string
  nameAr: string
  nameEn: string
  primaryMuscle: Muscle
  secondaryMuscles: string[]
  /** العضلات الأساسية التفصيلية (هوية كمال الأجسام) — للخريطة وحساب التغطية. */
  primaryMusclesDetailed: MuscleId[]
  /** العضلات الثانوية التفصيلية. */
  secondaryMusclesDetailed: MuscleId[]
  equipment: string[]
  level: ExLevel
  movementPattern: MovementPattern
  environment: ExEnvironment
  defaultSets: number
  defaultReps: string
  defaultRestSec: number
  videoUrl: string
  videoSource: VideoSource
  alternatives: string[]
  notesAr: string
  notesEn: string
  techniqueTipsAr: string[]
  commonMistakesAr: string[]
  safetyNotesAr: string[]
}

export interface TemplateDay {
  id: string
  nameAr: string
  nameEn: string
  exerciseIds: string[]
}

export interface WorkoutTemplate {
  id: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  recommendedFor: string
  days: TemplateDay[]
}

export interface PlanExercise {
  id: string
  exerciseId: string
  customNameAr?: string
  customNameEn?: string
  sets: number
  reps: string
  restSec: number
  startingWeight?: string
  videoUrl?: string
  notes?: string
  order: number
  /** إضافة نهاية اليوم (ذراعان/بطن) — اختيارية؛ تُعرَض بوسم «(اختياري)». */
  optional?: boolean
}

export interface PlanDay {
  id: string
  nameAr: string
  nameEn: string
  exercises: PlanExercise[]
}

export interface WorkoutPlan {
  templateId: string
  days: PlanDay[]
}
