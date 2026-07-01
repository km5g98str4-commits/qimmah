// أوسمة قِمّة — تعريف تصريحي (data-driven) لكل الأوسمة القابلة للفتح.
//
// كل وسام يوصف ببياناته فقط: معرّف، عنوان (لهجة خليجية)، وصف، أيقونة (lucide)، فئة،
// والمقياس + العتبة اللازمة لفتحه. منطق التقييم كله في محرّك الأوسمة
// (features/achievements/engine.ts) — هذا الملف بيانات صرفة لا منطق فيه.
//
// البصريات: كل وسام يُرسم كقرص SVG معدني (components/MedalBadge) بلون فئته
// (سلاسل=برتقالي، بروتين=أخضر، خطوات=أزرق، قوّة=ذهبي، بدايات=بنفسجي) مع أيقونة مركزية.

/** المقاييس التي تُقاس عليها الأوسمة (يحسبها المحرّك من السجلّ المحلي). */
export type AchievementMetric =
  | 'finishedWorkouts' // عدد جلسات التمرين المكتملة
  | 'workoutStreakBest' // أطول سلسلة أيام تمرين متتالية
  | 'weeklyStreakBest' // أطول سلسلة أسابيع ملتزمة
  | 'proteinDaysTotal' // مجموع الأيام التي أُقفل فيها هدف البروتين
  | 'stepDaysTotal' // مجموع الأيام التي أُقفل فيها هدف الخطوات
  | 'stepStreakBest' // أطول سلسلة أيام خطوات متتالية
  | 'mealDaysTotal' // عدد الأيام التي سُجّلت فيها وجبة
  | 'prCountTotal' // مجموع الأرقام القياسية (PR) المحقّقة

/** فئات الأوسمة — لتجميع الشبكة الكاملة بصريًا. */
export type AchievementCategory = 'firsts' | 'protein' | 'steps' | 'streak' | 'strength'

export interface AchievementDef {
  /** معرّف ثابت (لا يتغيّر — يُستخدم مفتاحًا للحفظ). */
  id: string
  /** عنوان الوسام بلهجة خليجية. */
  title: string
  /** وصف قصير يشرح كيف يُفتح. */
  description: string
  /** اسم أيقونة الوسام المركزية (من خريطة lucide في src/lib/icons.ts). */
  icon: string
  /** فئة الوسام. */
  category: AchievementCategory
  /** المقياس الذي يُقارَن. */
  metric: AchievementMetric
  /** العتبة المطلوبة لفتح الوسام (value ≥ threshold). */
  threshold: number
}

/** عناوين الفئات للعرض. */
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  firsts: 'بداياتك',
  streak: 'الاستمرارية',
  protein: 'البروتين',
  steps: 'الخطوات',
  strength: 'القوّة',
}

/**
 * قائمة الأوسمة (١٩ وسامًا) عبر البدايات + السلاسل + المعالم.
 * مرتّبة تصاعديًا داخل كل فئة حتى يظهر «القادم» بالترتيب الصحيح.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // — بداياتك —
  {
    id: 'first-workout',
    title: 'أول تمرين',
    description: 'خلّصت أول تمرين لك — البداية أصعب خطوة.',
    icon: 'Dumbbell',
    category: 'firsts',
    metric: 'finishedWorkouts',
    threshold: 1,
  },
  {
    id: 'first-meal',
    title: 'أول وجبة',
    description: 'سجّلت أول وجبة — بديت تمسك أكلك.',
    icon: 'Utensils',
    category: 'firsts',
    metric: 'mealDaysTotal',
    threshold: 1,
  },
  {
    id: 'first-week',
    title: 'أول أسبوع كامل',
    description: 'كمّلت التزام أسبوع كامل حسب خطتك.',
    icon: 'CalendarDays',
    category: 'firsts',
    metric: 'weeklyStreakBest',
    threshold: 1,
  },
  {
    id: 'first-pr',
    title: 'أول رقم قياسي',
    description: 'رفعت وزن جديد بأي تمرين لأول مرة.',
    icon: 'TrendingUp',
    category: 'firsts',
    metric: 'prCountTotal',
    threshold: 1,
  },

  // — الاستمرارية (أيام تمرين متتالية) —
  {
    id: 'streak-3',
    title: '٣ أيام متتالية',
    description: 'تمرّنت ٣ أيام ورا بعض بدون ما توقف.',
    icon: 'Flame',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 3,
  },
  {
    id: 'streak-7',
    title: 'أسبوع بلا توقّف',
    description: '٧ أيام تمرين متتالية — التزام نظيف.',
    icon: 'Flame',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 7,
  },
  {
    id: 'streak-14',
    title: 'أسبوعين حديد',
    description: '١٤ يوم متتالية — صرت ماكينة.',
    icon: 'Zap',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 14,
  },
  {
    id: 'streak-30',
    title: '٣٠ يوم أسطورة',
    description: 'شهر كامل بدون ما تكسر السلسلة.',
    icon: 'Trophy',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 30,
  },

  // — البروتين (أيام أُقفل فيها الهدف) —
  {
    id: 'protein-1',
    title: 'قفلت البروتين',
    description: 'وصلت هدف البروتين أول مرة.',
    icon: 'Egg',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 1,
  },
  {
    id: 'protein-3',
    title: 'بروتينك ٣ أيام',
    description: 'قفلت هدف البروتين ٣ أيام.',
    icon: 'Egg',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 3,
  },
  {
    id: 'protein-10',
    title: 'بروتينك ١٠ أيام',
    description: 'قفلت هدف البروتين ١٠ أيام — عضلاتك تشكرك.',
    icon: 'Fish',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 10,
  },
  {
    id: 'protein-30',
    title: 'بروتين شهر كامل',
    description: 'قفلت هدف البروتين ٣٠ يوم — احتراف.',
    icon: 'Trophy',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 30,
  },

  // — الخطوات —
  {
    id: 'steps-1',
    title: 'قفلت خطواتك',
    description: 'وصلت هدف الخطوات أول مرة.',
    icon: 'Footprints',
    category: 'steps',
    metric: 'stepDaysTotal',
    threshold: 1,
  },
  {
    id: 'steps-7',
    title: 'خطواتك ٧ أيام',
    description: 'قفلت هدف الخطوات ٧ أيام متتالية.',
    icon: 'Footprints',
    category: 'steps',
    metric: 'stepStreakBest',
    threshold: 7,
  },
  {
    id: 'steps-30',
    title: 'خطواتك ٣٠ يوم',
    description: 'قفلت هدف الخطوات ٣٠ يوم متتالية.',
    icon: 'Trophy',
    category: 'steps',
    metric: 'stepStreakBest',
    threshold: 30,
  },

  // — القوّة والمعالم —
  {
    id: 'pr-3',
    title: '٣ أرقام قياسية',
    description: 'حطّمت ٣ أرقام قياسية بتمارينك.',
    icon: 'TrendingUp',
    category: 'strength',
    metric: 'prCountTotal',
    threshold: 3,
  },
  {
    id: 'pr-10',
    title: '١٠ أرقام قياسية',
    description: 'حطّمت ١٠ أرقام قياسية — تتقدّم بثبات.',
    icon: 'Sparkles',
    category: 'strength',
    metric: 'prCountTotal',
    threshold: 10,
  },
  {
    id: 'workouts-10',
    title: '١٠ تمارين مكتملة',
    description: 'خلّصت ١٠ تمارين — العادة تترسّخ.',
    icon: 'Target',
    category: 'strength',
    metric: 'finishedWorkouts',
    threshold: 10,
  },
  {
    id: 'workouts-25',
    title: '٢٥ تمرين إنجاز',
    description: 'خلّصت ٢٥ تمرين — رحلة حقيقية.',
    icon: 'Trophy',
    category: 'strength',
    metric: 'finishedWorkouts',
    threshold: 25,
  },
]

/** بحث سريع عن وسام بالمعرّف. */
export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
