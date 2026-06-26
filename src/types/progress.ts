// أنواع الالتزامات والقياسات والتقدّم (Qimmah v2).

export type CommitmentCategory =
  | 'training'
  | 'nutrition'
  | 'hydration'
  | 'sleep'
  | 'recovery'
  | 'health'
  | 'supplements'
  | 'medications'
  | 'measurements'
  | 'lifestyle'
  | 'custom'

export type Frequency = 'daily' | 'weekly' | 'custom'

export interface CommitmentItem {
  id: string
  nameAr: string
  nameEn: string
  category: CommitmentCategory
  descriptionAr?: string
  descriptionEn?: string
  frequency: Frequency
}

export interface PlanCommitment {
  id: string
  commitmentId?: string
  customNameAr?: string
  customNameEn?: string
  category?: string
  frequency: Frequency
  notes?: string
  order: number
}

export interface CommitmentPlan {
  enabled: boolean
  items: PlanCommitment[]
}

export type MeasurementCategory = 'body' | 'health' | 'performance' | 'lifestyle' | 'photo' | 'advanced'

export interface MeasurementType {
  id: string
  nameAr: string
  nameEn: string
  unit: string
  category: MeasurementCategory
  isAdvanced?: boolean
  noteAr?: string
  noteEn?: string
}

export interface MeasurementPlan {
  enabled: boolean
  selectedTypeIds: string[]
}

export interface MeasurementLog {
  id: string
  date: string
  values: Record<string, string | number>
  notes?: string
}
