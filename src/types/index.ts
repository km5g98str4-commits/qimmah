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

/** حقل في البيانات الأساسية (البروفايل) */
export interface ProfileField {
  icon: IconName
  label: string
  value: string
  unit?: string
}

/** معلومات الهدف الحالي */
export interface GoalInfo {
  currentLabel: string
  currentValue: string
  targetLabel: string
  targetValue: string
  deadline: string
  progress: number // 0..100
}

/** مفتاح التزام (عادة/مبدأ) */
export interface CommitmentKey {
  icon: IconName
  title: string
  description: string
}

/** نقطة ألم في قسم المشكلة */
export interface PainPoint {
  icon: IconName
  title: string
  description: string
}

/** ركيزة قيمة في قسم الحل */
export interface ValuePillar {
  icon: IconName
  title: string
  description: string
}

/** عنصر جمهور (لمن هذا / لمن ليس) */
export interface AudienceItem {
  icon: IconName
  title: string
  description: string
}

/** سؤال شائع */
export interface FaqItem {
  question: string
  answer: string
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

/** حالة مراجعة منتج ممسوح/مُضاف — دورة الحياة من الالتقاط حتى التحقق. */
export type ProductReviewStatus = 'pending_review' | 'user_submitted' | 'needs_fix' | 'verified' | 'rejected'

/** مصدر التقاط بيانات المنتج (لأغراض التتبّع فقط). */
export type ProductSource = 'ocr' | 'manual' | 'off' | 'seed'

/** القيم الغذائية لكل 100غ — الأساس الموحّد لأي منتج ممسوح. */
export interface ProductNutrition {
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

/** سجل منتج بانتظار المراجعة الداخلية (باركود/تصوير/OCR). */
export interface ProductRecord {
  id: string
  barcode?: string
  name: string
  brand?: string
  servingSize?: string
  nutrition: ProductNutrition
  /** صورة المنتج المحفوظة (Data URL أو رابط) — قد لا تتوفر بعد. */
  productPhotoUrl?: string
  /** صورة جدول القيم الغذائية المصوَّرة (OCR) — قد لا تتوفر بعد. */
  nutritionPhotoUrl?: string
  status: ProductReviewStatus
  source: ProductSource
  createdAt: string
  updatedAt: string
}

/** إدخال سجلّ تدقيق واحد على منتج — من أنشأه/عدّله وماذا تغيّر. */
export interface ProductAuditEntry {
  id: string
  productId: string
  action: 'created' | 'edited' | 'approved' | 'rejected'
  before?: Partial<ProductRecord>
  after?: Partial<ProductRecord>
  note?: string
  at: string
}

export type IconComponent = LucideIcon
