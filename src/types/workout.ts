// أنواع مكتبة التمارين وقوالب الجداول وخطة التمرين (Qimmah v2).

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
