// تصنيف العضلات التفصيلي (Qimmah — هوية كمال الأجسام).
// يُستخدم في خريطة العضلات وحساب التغطية والذكاء التدريبي.

/** معرّف العضلة التفصيلية. */
export type MuscleId =
  | 'chest_upper'
  | 'chest_mid'
  | 'chest_lower'
  | 'lats'
  | 'upper_back'
  | 'traps'
  | 'rear_delts'
  | 'front_delts'
  | 'side_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lower_back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'

/** الجهة التي تظهر فيها العضلة على خريطة الجسم. */
export type MuscleView = 'front' | 'back'

/** حجم العضلة — يحدّد نطاق المجموعات الأسبوعية المستهدف. */
export type MuscleSize = 'large' | 'small'

/** حالة العضلة ضمن التغطية الأسبوعية والتعافي. */
export type MuscleStatus =
  | 'fresh' // تُمرّنت للتو (0–24س) — تحت الإجهاد
  | 'trained' // تُمرّنت هذا الأسبوع وتغطيتها كافية
  | 'recovering' // في طور التعافي (24–48س)
  | 'ready' // تعافت وجاهزة للتمرين
  | 'undertrained' // ناقصة هذا الأسبوع

/** تعريف عضلة في التصنيف. */
export interface MuscleGroup {
  id: MuscleId
  /** الاسم العربي المعروض. */
  labelAr: string
  /** الاسم الإنجليزي. */
  labelEn: string
  /** الجهة الأساسية للعرض على الخريطة. */
  view: MuscleView
  /** الحجم (يحدّد الهدف الأسبوعي). */
  size: MuscleSize
  /** نطاق المجموعات الأسبوعية المستهدف. */
  weeklyTarget: { min: number; max: number }
  /** مجموعة الحركة العامة — لتصنيف الدفع/السحب/الأرجل. */
  region: 'push' | 'pull' | 'legs' | 'core'
}

/** تغطية عضلة واحدة خلال الأسبوع. */
export interface MuscleCoverage {
  muscleId: MuscleId
  /** مجموع المجموعات المرجّحة (أساسية 1.0 / ثانوية 0.5). */
  sets: number
  /** عدد التمارين المختلفة التي لمست العضلة. */
  exercises: number
  /** آخر وقت تمرين (ISO) — أو undefined إن لم تُمرّن. */
  lastTrainedAt?: string
  /** شدّة التغطية مقابل الهدف (0–1). */
  intensity: number
  status: MuscleStatus
}

/** نتيجة حساب التغطية الأسبوعية الكاملة. */
export interface WeeklyCoverageResult {
  weeklyCoverage: Record<string, MuscleCoverage>
  /** عضلات لم تُمرّن إطلاقًا هذا الأسبوع. */
  missingMuscles: MuscleId[]
  /** عضلات تجاوزت الحد الأعلى (إفراط). */
  overtrainedMuscles: MuscleId[]
  /** توصيات نصية بالعربية. */
  recommendationsAr: string[]
}
