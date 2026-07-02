// أوسمة قِمّة — تعريف تصريحي (data-driven) لكل الأوسمة القابلة للفتح.
//
// كل وسام يوصف ببياناته فقط: معرّف، عنوان (لهجة خليجية)، وصف، أيقونة (lucide)، فئة،
// والمقياس + العتبة اللازمة لفتحه. منطق التقييم كله في محرّك الأوسمة
// (features/achievements/engine.ts) — هذا الملف بيانات صرفة لا منطق فيه.
//
// البصريات: كل وسام يُرسم كقرص SVG معدني (components/MedalBadge) بلون فئته
// (سلاسل=برتقالي، بروتين=أخضر، خطوات=أزرق، قوّة=ذهبي، بدايات=بنفسجي) مع أيقونة مركزية.

import type { Lang } from '@/lib/appPreferences'

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
  /** العنوان بالإنجليزية (يُعرض في وضع اللغة الإنجليزية). */
  titleEn: string
  /** وصف قصير يشرح كيف يُفتح. */
  description: string
  /** الوصف بالإنجليزية. */
  descriptionEn: string
  /** اسم أيقونة الوسام المركزية (من خريطة lucide في src/lib/icons.ts). */
  icon: string
  /** فئة الوسام. */
  category: AchievementCategory
  /** المقياس الذي يُقارَن. */
  metric: AchievementMetric
  /** العتبة المطلوبة لفتح الوسام (value ≥ threshold). */
  threshold: number
}

/** عناوين الفئات للعرض (عربي/إنجليزي). */
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  firsts: 'بداياتك',
  streak: 'الاستمرارية',
  protein: 'البروتين',
  steps: 'الخطوات',
  strength: 'القوّة',
}

const CATEGORY_LABELS_EN: Record<AchievementCategory, string> = {
  firsts: 'Firsts',
  streak: 'Consistency',
  protein: 'Protein',
  steps: 'Steps',
  strength: 'Strength',
}

/** عنوان الفئة حسب اللغة الحالية. */
export function categoryLabel(cat: AchievementCategory, lang: Lang): string {
  return lang === 'en' ? CATEGORY_LABELS_EN[cat] : CATEGORY_LABELS[cat]
}

/** عنوان الوسام حسب اللغة الحالية. */
export function achievementTitle(def: AchievementDef, lang: Lang): string {
  return lang === 'en' ? def.titleEn : def.title
}

/** وصف الوسام حسب اللغة الحالية. */
export function achievementDescription(def: AchievementDef, lang: Lang): string {
  return lang === 'en' ? def.descriptionEn : def.description
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
    titleEn: 'First workout',
    description: 'خلّصت أول تمرين لك — البداية أصعب خطوة.',
    descriptionEn: 'You finished your first workout — starting is the hardest step.',
    icon: 'Dumbbell',
    category: 'firsts',
    metric: 'finishedWorkouts',
    threshold: 1,
  },
  {
    id: 'first-meal',
    title: 'أول وجبة',
    titleEn: 'First meal',
    description: 'سجّلت أول وجبة — بديت تمسك أكلك.',
    descriptionEn: 'You logged your first meal — now you own your nutrition.',
    icon: 'Utensils',
    category: 'firsts',
    metric: 'mealDaysTotal',
    threshold: 1,
  },
  {
    id: 'first-week',
    title: 'أول أسبوع كامل',
    titleEn: 'First full week',
    description: 'كمّلت التزام أسبوع كامل حسب خطتك.',
    descriptionEn: 'You stayed consistent for a full week on your plan.',
    icon: 'CalendarDays',
    category: 'firsts',
    metric: 'weeklyStreakBest',
    threshold: 1,
  },
  {
    id: 'first-pr',
    title: 'أول رقم قياسي',
    titleEn: 'First PR',
    description: 'رفعت وزن جديد بأي تمرين لأول مرة.',
    descriptionEn: 'You hit a new best weight on any exercise for the first time.',
    icon: 'TrendingUp',
    category: 'firsts',
    metric: 'prCountTotal',
    threshold: 1,
  },

  // — الاستمرارية (أيام تمرين متتالية) —
  {
    id: 'streak-3',
    title: '٣ أيام متتالية',
    titleEn: '3-day streak',
    description: 'تمرّنت ٣ أيام ورا بعض بدون ما توقف.',
    descriptionEn: 'You trained 3 days in a row without a break.',
    icon: 'Flame',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 3,
  },
  {
    id: 'streak-7',
    title: 'أسبوع بلا توقّف',
    titleEn: 'Week nonstop',
    description: '٧ أيام تمرين متتالية — التزام نظيف.',
    descriptionEn: '7 training days in a row — clean consistency.',
    icon: 'Flame',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 7,
  },
  {
    id: 'streak-14',
    title: 'أسبوعين حديد',
    titleEn: 'Two solid weeks',
    description: '١٤ يوم متتالية — صرت ماكينة.',
    descriptionEn: '14 days in a row — you turned into a machine.',
    icon: 'Zap',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 14,
  },
  {
    id: 'streak-30',
    title: '٣٠ يوم أسطورة',
    titleEn: '30-day legend',
    description: 'شهر كامل بدون ما تكسر السلسلة.',
    descriptionEn: 'A full month without breaking the streak.',
    icon: 'Trophy',
    category: 'streak',
    metric: 'workoutStreakBest',
    threshold: 30,
  },

  // — البروتين (أيام أُقفل فيها الهدف) —
  {
    id: 'protein-1',
    title: 'قفلت البروتين',
    titleEn: 'Protein locked',
    description: 'وصلت هدف البروتين أول مرة.',
    descriptionEn: 'You hit your protein goal for the first time.',
    icon: 'Egg',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 1,
  },
  {
    id: 'protein-3',
    title: 'بروتينك ٣ أيام',
    titleEn: 'Protein 3 days',
    description: 'قفلت هدف البروتين ٣ أيام.',
    descriptionEn: 'You hit your protein goal on 3 days.',
    icon: 'Egg',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 3,
  },
  {
    id: 'protein-10',
    title: 'بروتينك ١٠ أيام',
    titleEn: 'Protein 10 days',
    description: 'قفلت هدف البروتين ١٠ أيام — عضلاتك تشكرك.',
    descriptionEn: 'You hit your protein goal on 10 days — your muscles thank you.',
    icon: 'Fish',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 10,
  },
  {
    id: 'protein-30',
    title: 'بروتين شهر كامل',
    titleEn: 'A full month of protein',
    description: 'قفلت هدف البروتين ٣٠ يوم — احتراف.',
    descriptionEn: 'You hit your protein goal on 30 days — pro level.',
    icon: 'Trophy',
    category: 'protein',
    metric: 'proteinDaysTotal',
    threshold: 30,
  },

  // — الخطوات —
  {
    id: 'steps-1',
    title: 'قفلت خطواتك',
    titleEn: 'Steps locked',
    description: 'وصلت هدف الخطوات أول مرة.',
    descriptionEn: 'You hit your steps goal for the first time.',
    icon: 'Footprints',
    category: 'steps',
    metric: 'stepDaysTotal',
    threshold: 1,
  },
  {
    id: 'steps-7',
    title: 'خطواتك ٧ أيام',
    titleEn: 'Steps 7 days',
    description: 'قفلت هدف الخطوات ٧ أيام متتالية.',
    descriptionEn: 'You hit your steps goal 7 days in a row.',
    icon: 'Footprints',
    category: 'steps',
    metric: 'stepStreakBest',
    threshold: 7,
  },
  {
    id: 'steps-30',
    title: 'خطواتك ٣٠ يوم',
    titleEn: 'Steps 30 days',
    description: 'قفلت هدف الخطوات ٣٠ يوم متتالية.',
    descriptionEn: 'You hit your steps goal 30 days in a row.',
    icon: 'Trophy',
    category: 'steps',
    metric: 'stepStreakBest',
    threshold: 30,
  },

  // — القوّة والمعالم —
  {
    id: 'pr-3',
    title: '٣ أرقام قياسية',
    titleEn: '3 PRs',
    description: 'حطّمت ٣ أرقام قياسية بتمارينك.',
    descriptionEn: 'You broke 3 personal records in your training.',
    icon: 'TrendingUp',
    category: 'strength',
    metric: 'prCountTotal',
    threshold: 3,
  },
  {
    id: 'pr-10',
    title: '١٠ أرقام قياسية',
    titleEn: '10 PRs',
    description: 'حطّمت ١٠ أرقام قياسية — تتقدّم بثبات.',
    descriptionEn: 'You broke 10 personal records — steady progress.',
    icon: 'Sparkles',
    category: 'strength',
    metric: 'prCountTotal',
    threshold: 10,
  },
  {
    id: 'workouts-10',
    title: '١٠ تمارين مكتملة',
    titleEn: '10 workouts done',
    description: 'خلّصت ١٠ تمارين — العادة تترسّخ.',
    descriptionEn: 'You finished 10 workouts — the habit is sticking.',
    icon: 'Target',
    category: 'strength',
    metric: 'finishedWorkouts',
    threshold: 10,
  },
  {
    id: 'workouts-25',
    title: '٢٥ تمرين إنجاز',
    titleEn: '25 workouts milestone',
    description: 'خلّصت ٢٥ تمرين — رحلة حقيقية.',
    descriptionEn: 'You finished 25 workouts — a real journey.',
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
