// نموذج بيانات «مركز التخصيص» + التخزين المحلي.
// الافتراضي يُبنى من ملفات config/data، والتعديلات تُحفظ في localStorage فقط (بلا backend).

import { product } from '@/config/product'
import { todayWorkout } from '@/data/workouts'
import { supplements as defaultSupplements } from '@/data/supplements'
import { meals as defaultMeals } from '@/data/meals'
import { bodyMetrics } from '@/data/metrics'
import { weeklyRoutine } from '@/data/routine'
import type { RoutineDay, SupplementItem } from '@/types'

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
      userName: 'زياد العبدالله',
      brandName: product.name,
      tagline: product.tagline,
      mainGoal: 'الوصول إلى 78 كجم وزيادة الكتلة العضلية خلال 12 أسبوعًا',
      userType: 'individual',
    },
    colors: {
      primary: '#10b981',
      accent: '#d4af37',
    },
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

/** قراءة التخصيص المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة). */
export function loadCustomization(): Customization {
  const base = getDefaultCustomization()
  if (typeof window === 'undefined') return base
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Customization>
    return {
      identity: { ...base.identity, ...saved.identity },
      colors: { ...base.colors, ...saved.colors },
      workouts: saved.workouts ?? base.workouts,
      supplements: saved.supplements ?? base.supplements,
      meals: saved.meals ?? base.meals,
      metrics: saved.metrics ?? base.metrics,
      routine: saved.routine ?? base.routine,
    }
  } catch {
    return base
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
