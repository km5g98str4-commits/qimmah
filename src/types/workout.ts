// أنواع مكتبة التمارين وقوالب الجداول وخطة التمرين (Qimmah v2).

import type { MuscleId } from './muscles'

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
// أحمال المفاصل الميكانيكية — مفردات ترشيح الإصابات (تُعلَن على كل تمرين في المكتبة).
export type JointLoad =
  | 'overhead'             // تحميل فوق الرأس — رفع/دفع بزاوية تتجاوز مستوى الكتف
  | 'shoulder_anterior'    // تحميل أمامي مركّز على الدالية الأمامية
  | 'shoulder_abduction'   // تبعيد بقوس واسع (رفرفة جانبية/أمامية/تفتيح)
  | 'deep_knee_flexion'    // ثني ركبة عميق تحت حِمل (نمط القرفصاء والطعن)
  | 'knee_shear'           // حِمل مفتوح السلسلة على الركبة (تمديد الرجل)
  | 'impact'               // قفز/هبوط/جري — حِمل صدمي
  | 'spinal_axial'         // تحميل محوري على العمود (بار على الظهر/وقوف تحت حِمل)
  | 'spinal_hinge'         // ثني/بسط قطني تحت حِمل (رفعة ميتة/صباح الخير)
  | 'wrist_extension'      // بسط رسغ محمَّل (استناد على الكف/وضعية الرَّف الأمامي)
  | 'elbow_extension'      // تمديد مرفق ثقيل (ترايسبس معزول)
  | 'ankle_dorsiflexion'   // ثني كاحل عميق أو حِمل سمانة كامل المدى

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
  /**
   * أحمال المفاصل الميكانيكية لهذا التمرين — أساس ترشيح الإصابات.
   * `[]` = **مراجَع ولا يحمل أيًّا من الأحمال المقيَّدة** (وليس «غير مصنَّف»).
   * غياب الحقل يعني «غير مصنَّف» ويُستبعَد افتراضًا عند وجود إصابة مُعلَنة.
   * هذه ملاءمة تمرين لا تشخيص طبي.
   */
  jointLoads: JointLoad[]
  environment: ExEnvironment
  defaultSets: number
  defaultReps: string
  defaultRestSec: number
  /**
   * [مهمة الصقل §3] فيديو مخصّص صريح فقط — لا قيمة افتراضية ولا رابط بحث أبدًا.
   * مرجع الفيديو المعروض للمستخدم هو سجلّ الإنتاج المُتحقَّق (`approvedVideoFor`).
   */
  videoUrl?: string
  videoSource?: VideoSource
  alternatives: string[]
  notesAr: string
  notesEn: string
  /** Optional authored English guidance; absence is rendered honestly in English. */
  howToEn?: string[]
  techniqueTipsEn?: string[]
  commonMistakesEn?: string[]
  safetyNotesEn?: string[]
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
  /** اسم اختياري للخطة اليدوية (P6) — حقل إضافي متوافق خلفيًّا؛ السجلات القديمة بلا اسم تبقى صالحة. */
  nameAr?: string
  /** الاسم الإنجليزي الاختياري للخطة اليدوية (P6). */
  nameEn?: string
  days: PlanDay[]
}
