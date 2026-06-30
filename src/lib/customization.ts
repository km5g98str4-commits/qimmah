// نموذج بيانات «مركز التخصيص» + التخزين المحلي.
// الافتراضي يُبنى من ملفات config/data، والتعديلات تُحفظ في localStorage فقط (بلا backend).

import { product } from '@/config/product'
import { todayWorkout } from '@/data/workouts'
import { supplements as defaultSupplements } from '@/data/supplements'
import { meals as defaultMeals } from '@/data/meals'
import { bodyMetrics } from '@/data/metrics'
import { weeklyRoutine } from '@/data/routine'
import type { RoutineDay, SupplementItem } from '@/types'
import type { Profile, Targets } from '@/types/profile'
import { computeTargets, defaultProfile, profileHash } from './calculators'
import type { WorkoutPlan } from '@/types/workout'
import { generatePlanFromTemplate } from './workoutPlan'
import type { NutritionPlan } from '@/types/nutrition'
import { defaultNutritionPlan } from './nutritionPlan'
import type { WellnessPlan } from '@/types/wellness'
import { defaultWellnessPlan } from './wellnessPlan'
import type { CommitmentPlan, MeasurementPlan } from '@/types/progress'
import { defaultCommitmentPlan } from './commitmentPlan'

export const STORAGE_KEY = 'qimmah:customization:v1'

export type UserType = 'individual' | 'coach' | 'creator'

export const userTypeOptions: { value: UserType; label: string }[] = [
  { value: 'individual', label: 'فرد' },
  { value: 'coach', label: 'مدرب' },
  { value: 'creator', label: 'صانع محتوى' },
]

export interface WorkoutRow {
  name: string
  muscle: string
  sets: number
  reps: string
  weight: string
}

export interface SupplementRow {
  name: string
  dose: string
  timing: string
  type: SupplementItem['type']
}

export interface MealRow {
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface MetricRow {
  label: string
  value: string
  unit: string
}

export interface RoutineRow {
  day: string
  title: string
  type: RoutineDay['type']
}

/** أقسام الصفحة القابلة للإظهار/الإخفاء (بنية v2 — تُوسّع لاحقًا). */
export interface SectionVisibility {
  today: boolean
  workouts: boolean
  meals: boolean
  supplements: boolean
  medications: boolean
  measurements: boolean
  commitments: boolean
  notes: boolean
}

export const defaultSections: SectionVisibility = {
  today: true,
  workouts: true,
  meals: true,
  supplements: true,
  medications: true,
  measurements: true,
  commitments: true,
  notes: true,
}

export interface Customization {
  identity: {
    userName: string
    brandName: string
    tagline: string
    mainGoal: string
    userType: UserType
  }
  colors: {
    primary: string
    accent: string
  }
  sections: SectionVisibility
  profile: Profile
  targets: Targets
  /** حالة الحسابات: هل عُدّلت يدويًا + بصمة الملف الذي حُسبت منه. */
  targetsMeta: {
    manuallyEdited: boolean
    lastCalculatedFromProfileHash?: string
    updatedAt?: string
  }
  workoutPlan: WorkoutPlan
  nutritionPlan: NutritionPlan
  wellnessPlan: WellnessPlan
  commitmentPlan: CommitmentPlan
  measurementPlan: MeasurementPlan
  workouts: WorkoutRow[]
  supplements: SupplementRow[]
  meals: MealRow[]
  metrics: MetricRow[]
  routine: RoutineRow[]
}

/** القيم الافتراضية مأخوذة مباشرة من config/data — مصدر الحقيقة الوحيد. */
export function getDefaultCustomization(): Customization {
  return {
    identity: {
      // لا اسم افتراضي — يُدخله المستخدم في الإعداد (لا أسماء وهمية في اللوحة الحقيقية).
      userName: '',
      brandName: product.name,
      tagline: product.tagline,
      mainGoal: '',
      userType: 'individual',
    },
    colors: {
      primary: '#F26A21',
      accent: '#E0941F',
    },
    sections: { ...defaultSections },
    profile: { ...defaultProfile },
    targets: computeTargets(defaultProfile),
    targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: profileHash(defaultProfile) },
    workoutPlan: generatePlanFromTemplate('full-body-3'),
    nutritionPlan: defaultNutritionPlan(computeTargets(defaultProfile), defaultProfile.goal),
    wellnessPlan: defaultWellnessPlan(),
    commitmentPlan: defaultCommitmentPlan(),
    measurementPlan: { enabled: true, selectedTypeIds: ['weightKg', 'waistCm', 'bodyFatPercent'] },
    workouts: todayWorkout.exercises.map((e) => ({
      name: e.name,
      muscle: e.muscle,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
    })),
    supplements: defaultSupplements.map((s) => ({
      name: s.name,
      dose: s.dose,
      timing: s.timing,
      type: s.type,
    })),
    meals: defaultMeals.map((m) => ({
      name: m.name,
      time: m.time,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fats: m.fats,
    })),
    metrics: bodyMetrics.map((m) => ({
      label: m.label,
      value: m.value,
      unit: m.unit,
    })),
    routine: weeklyRoutine.map((r) => ({
      day: r.day,
      title: r.title,
      type: r.type,
    })),
  }
}

/**
 * هجرة الأهداف الملغاة في الملف المحفوظ (تتغيّر بصمة الملف فتُعاد الأهداف حسابها في withFreshTargets):
 * - «إعادة التكوين» (recomposition) → «تنشيف» (cutting، TDEE−400).
 * - «القوة» (strength، أُلغي في P2.5) → «تضخيم» (bulking، TDEE+300).
 */
function migrateLegacyGoal(p: Profile): Profile {
  if (p.goalType === 'recomposition') return { ...p, goalType: 'cutting', goal: 'cut' }
  if ((p.goalType as string) === 'strength') return { ...p, goalType: 'bulking', goal: 'bulk' }
  return p
}

/** قراءة التخصيص المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة). */
export function loadCustomization(): Customization {
  const base = getDefaultCustomization()
  if (typeof window === 'undefined') return base
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Customization>
    const merged: Customization = {
      identity: { ...base.identity, ...saved.identity },
      colors: { ...base.colors, ...saved.colors },
      sections: { ...base.sections, ...saved.sections },
      profile: migrateLegacyGoal({ ...base.profile, ...saved.profile }),
      targets: { ...base.targets, ...saved.targets },
      targetsMeta: { ...base.targetsMeta, ...saved.targetsMeta },
      workoutPlan: saved.workoutPlan ?? base.workoutPlan,
      nutritionPlan: saved.nutritionPlan
        ? { ...base.nutritionPlan, ...saved.nutritionPlan }
        : base.nutritionPlan,
      wellnessPlan: saved.wellnessPlan
        ? { ...base.wellnessPlan, ...saved.wellnessPlan }
        : base.wellnessPlan,
      commitmentPlan: saved.commitmentPlan
        ? { ...base.commitmentPlan, ...saved.commitmentPlan }
        : base.commitmentPlan,
      measurementPlan: saved.measurementPlan
        ? { ...base.measurementPlan, ...saved.measurementPlan }
        : base.measurementPlan,
      workouts: saved.workouts ?? base.workouts,
      supplements: saved.supplements ?? base.supplements,
      meals: saved.meals ?? base.meals,
      metrics: saved.metrics ?? base.metrics,
      routine: saved.routine ?? base.routine,
    }
    return withFreshTargets(merged)
  } catch {
    return base
  }
}

/**
 * يعيد حساب الأهداف من الملف الشخصي عند تغيّره (أو تحديث صيغة الحساب) ما لم تُعدَّل يدويًا،
 * ثم يزامن أهداف خطة التغذية (سعرات/ماكروز/ماء) مع الأهداف الجديدة مع إبقاء الوجبات.
 * هذا يضمن أن المتابعة واللوحة تعكسان حسابات صحيحة دائمًا.
 */
function withFreshTargets(c: Customization): Customization {
  if (c.targetsMeta.manuallyEdited) return c
  const hash = profileHash(c.profile)
  if (c.targetsMeta.lastCalculatedFromProfileHash === hash) return c
  const targets = computeTargets(c.profile)
  return {
    ...c,
    targets,
    targetsMeta: { ...c.targetsMeta, lastCalculatedFromProfileHash: hash },
    nutritionPlan: {
      ...c.nutritionPlan,
      targetCalories: targets.targetCalories,
      targetProtein: targets.proteinGrams,
      targetCarbs: targets.carbsGrams,
      targetFat: targets.fatGrams,
      targetWaterLiters: targets.waterLiters,
    },
  }
}

export function saveCustomization(value: Customization): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function clearCustomization(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function hasSavedCustomization(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null
}
