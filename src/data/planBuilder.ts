// خيارات ونصوص «باني الخطة» (Plan Builder) — عربية، قابلة للتخصيص (data-driven).

import type {
  Consistency,
  Equipment,
  ExperienceBand,
  Gender,
  GoalType,
  GymAccess,
  MuscleFocus,
} from '@/types/profile'

export interface Choice<T> {
  value: T
  label: string
  desc?: string
  icon?: string
}

export const genderChoices: Choice<Gender>[] = [
  { value: 'male', label: 'ذكر', icon: 'Users' },
  { value: 'female', label: 'أنثى', icon: 'Users' },
]

/** أهداف «باني الخطة» السبعة (تُربط داخليًا بـ GoalType للحسابات). */
export interface GoalChoice {
  value: string
  label: string
  desc: string
  icon: string
  goalType: GoalType
}

export const goalChoices: GoalChoice[] = [
  { value: 'build_muscle', label: 'بناء عضل', desc: 'تضخيم نظيف وزيادة الكتلة العضلية', icon: 'Dumbbell', goalType: 'bulking' },
  { value: 'strength', label: 'زيادة قوة', desc: 'أوزان أثقل وتكرارات أقل', icon: 'Zap', goalType: 'strength' },
  { value: 'cut', label: 'تنشيف', desc: 'إنقاص الدهون مع الحفاظ على العضل', icon: 'Flame', goalType: 'cutting' },
  { value: 'bulk', label: 'تضخيم', desc: 'زيادة وزن وحجم بأقصى سرعة معقولة', icon: 'TrendingUp', goalType: 'bulking' },
  { value: 'recomp', label: 'إعادة تركيب الجسم', desc: 'تنزل دهون وتبني عضل بنفس الوقت', icon: 'Layers', goalType: 'recomposition' },
  { value: 'fitness', label: 'لياقة عامة', desc: 'صحة وطاقة وثبات على الروتين', icon: 'Heart', goalType: 'health' },
  { value: 'weight_loss', label: 'نزول وزن', desc: 'خسارة وزن بشكل آمن ومستمر', icon: 'TrendingDown', goalType: 'cutting' },
]

export const muscleFocusChoices: Choice<MuscleFocus>[] = [
  { value: 'balanced', label: 'توازن كامل', desc: 'تطوير متناسق لكل الجسم', icon: 'Layers' },
  { value: 'upper', label: 'تركيز علوي', desc: 'صدر وظهر وأكتاف وذراع', icon: 'TrendingUp' },
  { value: 'lower', label: 'تركيز سفلي', desc: 'أرجل وجلوتس', icon: 'TrendingDown' },
  { value: 'core', label: 'تركيز البطن/الكور', desc: 'بطن وثبات الجذع', icon: 'Target' },
  { value: 'chest', label: 'صدر', desc: 'تركيز إضافي على الصدر', icon: 'Dumbbell' },
  { value: 'back', label: 'ظهر', desc: 'تركيز إضافي على الظهر', icon: 'Dumbbell' },
  { value: 'shoulders', label: 'أكتاف', desc: 'تركيز إضافي على الأكتاف', icon: 'Dumbbell' },
  { value: 'arms', label: 'ذراع', desc: 'بايسبس وترايسبس', icon: 'Dumbbell' },
]

export const experienceChoices: Choice<ExperienceBand>[] = [
  { value: 'lt1m', label: 'أقل من شهر', icon: 'Sparkles' },
  { value: '1to6m', label: '1–6 أشهر', icon: 'CalendarDays' },
  { value: '6to12m', label: '6–12 شهر', icon: 'CalendarDays' },
  { value: '1to2y', label: '1–2 سنة', icon: 'CalendarDays' },
  { value: 'gt2y', label: 'أكثر من سنتين', icon: 'Trophy' },
]

export const consistencyChoices: Choice<Consistency>[] = [
  { value: 'never', label: 'ما قد تمرنت حديد', desc: 'أول تجربة لك مع الأوزان', icon: 'Sparkles' },
  { value: 'onoff', label: 'أتمرن فترة وأوقف', desc: 'التزام متقطّع', icon: 'Activity' },
  { value: 'regular', label: 'أتمرن بانتظام', desc: 'روتين ثابت حاليًا', icon: 'CheckCircle2' },
  { value: 'returning', label: 'راجع بعد انقطاع', desc: 'كنت تتمرن وتوقفت فترة', icon: 'RotateCcw' },
]

export const gymAccessChoices: Choice<GymAccess>[] = [
  { value: 'full', label: 'نادي كامل', desc: 'أجهزة وأوزان حرة كاملة', icon: 'Building2' },
  { value: 'small', label: 'نادي صغير', desc: 'تجهيزات محدودة', icon: 'Building2' },
  { value: 'home', label: 'نادي منزلي', desc: 'أدوات بسيطة في البيت', icon: 'Home' },
  { value: 'bodyweight', label: 'وزن الجسم', desc: 'بدون أي أدوات', icon: 'Activity' },
]

export const equipmentChoices: Choice<Equipment>[] = [
  { value: 'dumbbell', label: 'دمبلز', icon: 'Dumbbell' },
  { value: 'barbell', label: 'بار', icon: 'Dumbbell' },
  { value: 'bench', label: 'بنش', icon: 'Layers' },
  { value: 'machine', label: 'أجهزة', icon: 'Boxes' },
  { value: 'cable', label: 'كيبل', icon: 'Zap' },
  { value: 'bands', label: 'مقاومة (أحزمة)', icon: 'Activity' },
]

export interface DurationBand {
  value: number // قيمة تمثيلية بالدقائق تُحفظ في الملف
  label: string
}

export const durationBands: DurationBand[] = [
  { value: 25, label: '20–30 دقيقة' },
  { value: 38, label: '30–45 دقيقة' },
  { value: 52, label: '45–60 دقيقة' },
  { value: 68, label: '60–75 دقيقة' },
  { value: 82, label: '75–90 دقيقة' },
]

/** أيام الأسبوع (تطابق ترتيب WEEKDAYS في مولّد الخطة: 0=السبت). */
export const weekdayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

/** توصية أيام التمرين حسب مستوى الخبرة. */
export function recommendedDaysFor(band: ExperienceBand): { days: number; note: string } {
  if (band === 'lt1m' || band === '1to6m') return { days: 3, note: 'ننصح بـ3 أيام للبداية وبناء الالتزام.' }
  if (band === '6to12m' || band === '1to2y') return { days: 4, note: 'ننصح بـ4 أيام لتقدّم متوازن.' }
  return { days: 5, note: 'تقدر تتمرن 5–6 أيام مع خبرتك.' }
}

/** نص تحفيزي عام (بلا إحصاءات وهمية). */
export const motivationalInsight = {
  title: 'الالتزام أهم من الكمال',
  body: 'النتائج تجي من تمارين منتظمة على مدى أسابيع، مو من يوم واحد مثالي. قِمّة بتسهّل عليك الالتزام خطوة بخطوة.',
}
