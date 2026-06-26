// أنواع البيانات المشتركة عبر المنتج بأكمله.
// كل المحتوى يُغذّى من ملفات data/config — هذه الأنواع تضمن التناسق.

import type { LucideIcon } from 'lucide-react'

export type IconName = string

/** عنصر تنقل في الهيدر */
export interface NavItem {
  label: string
  href: string
}

/** ميزة عامة (بطاقة) */
export interface Feature {
  icon: IconName
  title: string
  description: string
}

/** إحصائية مختصرة */
export interface Stat {
  value: string
  label: string
}

/** تمرين ضمن متتبّع التمارين */
export interface Exercise {
  name: string
  muscle: string
  sets: number
  reps: string
  weight: string
  done: boolean
}

export interface WorkoutDay {
  day: string
  focus: string
  exercises: Exercise[]
}

/** مكمل غذائي أو دواء */
export interface SupplementItem {
  name: string
  dose: string
  timing: string
  type: 'supplement' | 'medication'
  taken: boolean
  note?: string
}

/** وجبة مع الماكروز */
export interface Meal {
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface MacroTarget {
  label: string
  current: number
  target: number
  unit: string
  color: string
}

/** قياس جسم */
export interface BodyMetric {
  label: string
  value: string
  unit: string
  change: number // نسبة التغير، موجب/سالب
  icon: IconName
}

/** نقطة في رسم التقدم */
export interface ProgressPoint {
  label: string
  value: number
}

/** يوم في الروتين الأسبوعي */
export interface RoutineDay {
  day: string
  short: string
  title: string
  type: 'push' | 'pull' | 'legs' | 'cardio' | 'rest' | 'full'
  done: boolean
}

/** خيار تخصيص (ثيم / لون) */
export interface CustomizationOption {
  id: string
  label: string
  swatch: string
  description: string
}

/** خطة تسعير */
export interface PricingPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  badge?: string
}

/** بطاقة معاينة في الداشبورد */
export interface DashboardCard {
  icon: IconName
  label: string
  value: string
  sub: string
  accent: string
}

export type IconComponent = LucideIcon
