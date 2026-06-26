// أنواع المكملات والأدوية (Qimmah v2).
// ملاحظة طبية: مكتبة الأدوية للمتابعة فقط — بلا جرعات موصى بها.

export type SupplementCategory =
  | 'protein'
  | 'performance'
  | 'vitamins'
  | 'minerals'
  | 'recovery'
  | 'hydration'
  | 'digestive'
  | 'general_health'
  | 'other'

export interface Supplement {
  id: string
  nameAr: string
  nameEn: string
  category: SupplementCategory
  commonTimingAr: string
  commonTimingEn: string
  notesAr: string
  notesEn: string
  cautionAr?: string
  cautionEn?: string
}

export type MedicationCategory =
  | 'thyroid'
  | 'diabetes'
  | 'blood_pressure'
  | 'cholesterol'
  | 'allergy'
  | 'asthma'
  | 'stomach'
  | 'pain_relief'
  | 'antibiotic'
  | 'vitamin_prescription'
  | 'iron'
  | 'mental_health'
  | 'other'

export interface Medication {
  id: string
  nameAr: string
  nameEn: string
  category: MedicationCategory
  trackingPurposeAr: string
  trackingPurposeEn: string
  timingHintAr: string
  timingHintEn: string
  safetyNoteAr: string
  safetyNoteEn: string
}

export type FoodTiming = 'before' | 'after' | 'with' | 'any' | ''

export interface PlanSupplement {
  id: string
  supplementId: string
  customNameAr?: string
  customNameEn?: string
  amount?: string
  timing?: string
  frequency?: string
  notes?: string
  order: number
}

export interface PlanMedication {
  id: string
  medicationId: string
  customNameAr?: string
  customNameEn?: string
  dose?: string // يُدخلها المستخدم بحسب وصف الطبيب — لا توصية من التطبيق
  timing?: string
  frequency?: string
  beforeAfterFood?: FoodTiming
  notes?: string
  doctorNote?: string
  order: number
}

export interface WellnessPlan {
  enabled: boolean
  supplements: PlanSupplement[]
  medications: PlanMedication[]
}
