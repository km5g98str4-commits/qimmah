// خيارات ونصوص «باني الخطة» (Plan Builder) — عربية، قابلة للتخصيص (data-driven).

import type {
  Consistency,
  Equipment,
  ExperienceBand,
  ExperienceLevel,
  Gender,
  GoalType,
  GymAccess,
  GymType,
  MuscleFocus,
} from '@/types/profile'
import type {
  AdvancedSplit,
  AppetiteTiming,
  DietPattern,
  Environment,
  MealDistribution,
  NeatLevel,
  NutritionStyle as OnbNutritionStyle,
  OnbConsistency,
  Sex,
  SplitMode,
  WellnessTrackingMode,
} from '@/types/onboarding'

export interface Choice<T> {
  value: T
  label: string
  desc?: string
  icon?: string
  /** الترجمة الإنجليزية (P10.1) — إضافية فقط؛ `label`/`desc` يبقيان المصدر العربي. */
  labelEn?: string
  descEn?: string
}

export const genderChoices: Choice<Gender>[] = [
  { value: 'male', label: 'ذكر', icon: 'Users' },
  { value: 'female', label: 'أنثى', icon: 'Users' },
]

/** الجنس (إعداد Phase 1) — قيمتان فقط (male/female). */
export const sexChoices: Choice<Sex>[] = [
  { value: 'male', label: 'ذكر', labelEn: 'Male', icon: 'Users' },
  { value: 'female', label: 'أنثى', labelEn: 'Female', icon: 'Users' },
]

/** أهداف الإعداد الثلاثة — يُربطان داخليًا بـ GoalType للحسابات. */
// P2.5: أُلغي مسار «القوة». P10: أُضيف «المحافظة على العضل» (سعرات صيانة بلا عجز/فائض).
export type GoalValue = 'bulk' | 'cut' | 'maintain'

export interface GoalChoice {
  value: GoalValue
  label: string
  desc: string
  icon: string
  goalType: GoalType
  /** الترجمة الإنجليزية (P10.1) — إضافية فقط. */
  labelEn?: string
  descEn?: string
}

export const goalChoices: GoalChoice[] = [
  { value: 'bulk', label: 'تضخيم', labelEn: 'Bulking', desc: 'زيادة العضل والوزن', descEn: 'Build muscle and gain weight', icon: 'TrendingUp', goalType: 'bulking' },
  { value: 'cut', label: 'تنشيف', labelEn: 'Cutting', desc: 'خسارة دهون مع الحفاظ على العضل', descEn: 'Lose fat while keeping muscle', icon: 'Flame', goalType: 'cutting' },
  { value: 'maintain', label: 'محافظة على العضل', labelEn: 'Maintain muscle', desc: 'ثبات على وزنك مع الحفاظ على عضلك', descEn: 'Hold your weight while keeping your muscle', icon: 'ShieldCheck', goalType: 'maintenance' },
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

/** خبرة الإعداد الأربعة — كل مستوى يحمل نطاق المولّد (band) لاتساق الحسابات. */
export interface ExperienceChoice {
  value: ExperienceLevel
  label: string
  desc: string
  icon: string
  band: ExperienceBand
  /** الترجمة الإنجليزية (P10.1) — إضافية فقط. */
  labelEn?: string
  descEn?: string
}

export const experienceChoices: ExperienceChoice[] = [
  { value: 'beginner', label: 'مبتدئ', labelEn: 'Beginner', desc: 'أقل من ٣ شهور أو ما بدأت', descEn: 'Less than 3 months or not started', icon: 'Sparkles', band: 'lt1m' },
  { value: 'novice', label: 'مستجد', labelEn: 'Novice', desc: '٣ شهور – سنة', descEn: '3 months – 1 year', icon: 'CalendarDays', band: '1to6m' },
  { value: 'intermediate', label: 'متوسط', labelEn: 'Intermediate', desc: '١ – ٣ سنوات', descEn: '1 – 3 years', icon: 'CalendarDays', band: '1to2y' },
  { value: 'advanced', label: 'متقدّم', labelEn: 'Advanced', desc: 'أكثر من ٣ سنوات', descEn: 'More than 3 years', icon: 'Trophy', band: 'gt2y' },
]

/** الانتظام — يظهر فقط لغير المبتدئ (المبتدئ يُخزَّن انتظامه «new» تلقائيًا). */
export const consistencyChoices: Choice<Consistency>[] = [
  { value: 'onoff', label: 'أتمرن وأوقف', desc: 'التزام متقطّع', icon: 'Activity' },
  { value: 'regular', label: 'أتمرن بانتظام', desc: 'روتين ثابت حاليًا', icon: 'CheckCircle2' },
  { value: 'returning', label: 'راجع بعد انقطاع', desc: 'كنت تتمرن وتوقفت فترة', icon: 'RotateCcw' },
]

/** الانتظام (إعداد Phase 1 — قيم مصدر الحقيقة) — يظهر فقط لغير المبتدئ. */
export const consistencyChoicesV2: Choice<OnbConsistency>[] = [
  { value: 'on_and_off', label: 'أتمرن وأوقف', labelEn: 'On and off', desc: 'التزام متقطّع', descEn: 'Inconsistent commitment', icon: 'Activity' },
  { value: 'consistent', label: 'أتمرن بانتظام', labelEn: 'Training consistently', desc: 'روتين ثابت حاليًا', descEn: 'On a steady routine right now', icon: 'CheckCircle2' },
  { value: 'returning', label: 'راجع بعد انقطاع', labelEn: 'Back after a break', desc: 'كنت تتمرن وتوقفت فترة', descEn: 'You trained before and stopped for a while', icon: 'RotateCcw' },
]

/** نوع مكان التمرين الأربعة — تُربط بـ GymAccess للمولّد عبر gymTypeToAccess. */
export interface GymTypeChoice {
  value: GymType
  label: string
  desc: string
  icon: string
}

export const gymTypeChoices: GymTypeChoice[] = [
  { value: 'commercial', label: 'صالة كاملة', desc: 'أجهزة وأوزان حرة كاملة', icon: 'Building2' },
  { value: 'small', label: 'صالة صغيرة', desc: 'تجهيزات محدودة', icon: 'Dumbbell' },
  { value: 'home', label: 'جيم منزلي', desc: 'أدوات بسيطة في البيت', icon: 'Home' },
  { value: 'bodyweight', label: 'وزن الجسم', desc: 'بدون أي أدوات', icon: 'Activity' },
]

// ===== خيارات إعداد Phase 1 (مصدر الحقيقة الموسّع) =====

/** بيئة التمرين (إعداد) — تُخزَّن صراحةً والمنزل/وزن الجسم واضحان. */
export const environmentChoices: Choice<Environment>[] = [
  { value: 'commercial_gym', label: 'صالة كاملة', labelEn: 'Full gym', desc: 'أجهزة وأوزان حرة كاملة', descEn: 'Machines and free weights', icon: 'Building2' },
  { value: 'small_gym', label: 'صالة صغيرة', labelEn: 'Small gym', desc: 'تجهيزات محدودة', descEn: 'Limited equipment', icon: 'Dumbbell' },
  { value: 'home_gym', label: 'جيم منزلي', labelEn: 'Home gym', desc: 'أدوات بسيطة في البيت', descEn: 'Basic equipment at home', icon: 'Home' },
  { value: 'bodyweight', label: 'وزن الجسم', labelEn: 'Bodyweight', desc: 'بدون أي أدوات', descEn: 'No equipment at all', icon: 'Activity' },
]

/** نمط اختيار التقسيمة. */
export const splitModeChoices: Choice<SplitMode>[] = [
  { value: 'auto', label: 'اختر لي تلقائيًا', labelEn: 'Pick for me', desc: 'نختار أنسب تقسيمة لمستواك وأيامك', descEn: 'We pick the best split for your level and days', icon: 'Sparkles' },
  { value: 'advanced', label: 'أختار بنفسي', labelEn: 'I will choose myself', desc: 'تحكّم متقدّم في نوع التقسيمة', descEn: 'Advanced control over your split type', icon: 'SlidersHorizontal' },
]

/**
 * خيارات التقسيمة المتقدّمة — تظهر فقط عند splitMode=advanced.
 * مجموعة نظيفة متمايزة بلا تكرار (P2.7): جسم كامل / علوي-سفلي / دفع-سحب-أرجل.
 * (أُزيلت «أرنولد» و«عضلة باليوم» من القائمة لتجنّب التداخل؛ المولّد يبقى يدعمها
 *  للملفّات القديمة المحفوظة فلا تنكسر — راجع ADVANCED_CYCLES في planGenerator.)
 */
export const advancedSplitChoices: Choice<AdvancedSplit>[] = [
  { value: 'full_body', label: 'جسم كامل', labelEn: 'Full body', desc: 'كل الجسم كل جلسة', descEn: 'Whole body every session', icon: 'Layers' },
  { value: 'upper_lower', label: 'علوي/سفلي', labelEn: 'Upper/Lower', desc: 'علوي وسفلي بالتناوب', descEn: 'Alternating upper and lower days', icon: 'TrendingUp' },
  { value: 'push_pull_legs', label: 'دفع/سحب/أرجل', labelEn: 'Push/Pull/Legs', desc: 'PPL كلاسيكي', descEn: 'Classic PPL', icon: 'Dumbbell' },
]

/** النشاط اليومي (NEAT) خارج التمرين. */
export const neatChoices: Choice<NeatLevel>[] = [
  { value: 'sedentary', label: 'قليل الحركة', labelEn: 'Sedentary', desc: 'مكتبي/جالس أغلب اليوم', descEn: 'Desk job / sitting most of the day', icon: 'Armchair' },
  { value: 'light', label: 'حركة خفيفة', labelEn: 'Lightly active', desc: 'مشي بسيط خلال اليوم', descEn: 'Light walking during the day', icon: 'Footprints' },
  { value: 'moderate', label: 'حركة متوسطة', labelEn: 'Moderately active', desc: 'واقف/متحرّك بانتظام', descEn: 'Standing or moving regularly', icon: 'Activity' },
  { value: 'high', label: 'حركة عالية', labelEn: 'Very active', desc: 'عمل بدني أو مشي كثير', descEn: 'Physical work or lots of walking', icon: 'Flame' },
]

/** أسلوب التغذية — طريقة العرض (لا أسلوب الطبخ). */
export const nutritionStyleChoices: Choice<OnbNutritionStyle>[] = [
  { value: 'meal_suggestions', label: 'اقتراح وجبات', labelEn: 'Meal suggestions', desc: 'وجبات جاهزة مقترحة حسب هدفك', descEn: 'Ready meal ideas based on your goal', icon: 'Salad' },
  { value: 'macros_only', label: 'ماكروز فقط', labelEn: 'Macros only', desc: 'أهداف سعرات وبروتين بدون وجبات', descEn: 'Calorie and protein targets, no meal plans', icon: 'Target' },
  { value: 'simple_guidance', label: 'إرشاد مبسّط', labelEn: 'Simple guidance', desc: 'توجيه عام بدون تفاصيل دقيقة', descEn: 'General direction without fine details', icon: 'Compass' },
]

/** توزيع حجم الوجبات (P2.5) — يحدّد أين تتركّز السعرات بين الوجبات. */
export const mealDistributionChoices: Choice<MealDistribution>[] = [
  { value: 'balanced', label: 'متوازنة', labelEn: 'Balanced', desc: 'وجبات رئيسية ووجبات خفيفة بحجم طبيعي', descEn: 'Normal-sized main meals and snacks', icon: 'Scale' },
  { value: 'fewer_larger', label: 'أكبر وأقل', labelEn: 'Fewer, larger', desc: 'سعرات مركّزة في الوجبات الرئيسية', descEn: 'Calories concentrated in main meals', icon: 'UtensilsCrossed' },
  { value: 'more_smaller', label: 'أصغر وأكثر', labelEn: 'Smaller, more often', desc: 'سعرات موزّعة بالتساوي على الوجبات', descEn: 'Calories spread evenly across meals', icon: 'LayoutGrid' },
]

/** وقت الجوع الأكثر (P2.5) — يميل توزيع السعرات للصباح أو المساء. */
export const appetiteTimingChoices: Choice<AppetiteTiming>[] = [
  { value: 'balanced', label: 'متوازن', labelEn: 'Balanced', desc: 'جوعي موزّع على اليوم', descEn: 'My hunger is spread across the day', icon: 'Clock' },
  { value: 'morning', label: 'الصباح', labelEn: 'Morning', desc: 'أجوع أكثر بداية اليوم', descEn: 'Hungriest early in the day', icon: 'Sunrise' },
  { value: 'evening', label: 'المساء', labelEn: 'Evening', desc: 'أجوع أكثر آخر اليوم', descEn: 'Hungriest late in the day', icon: 'Sunset' },
]

/** نمط الأكل (اختياري). */
export const dietPatternChoices: Choice<DietPattern>[] = [
  { value: 'none', label: 'بدون قيود', labelEn: 'No restrictions', icon: 'Check' },
  { value: 'vegetarian', label: 'نباتي (مع ألبان/بيض)', labelEn: 'Vegetarian (dairy/eggs OK)', icon: 'Leaf' },
  { value: 'vegan', label: 'نباتي صرف', labelEn: 'Vegan', icon: 'Leaf' },
  { value: 'pescatarian', label: 'سمك بدون لحوم', labelEn: 'Pescatarian (fish, no meat)', icon: 'Fish' },
  { value: 'low_carb', label: 'قليل الكارب', labelEn: 'Low carb', icon: 'TrendingDown' },
  { value: 'keto', label: 'كيتو', labelEn: 'Keto', icon: 'Flame' },
]

/** حساسيات غذائية شائعة (اختياري — قيم مفتاحية ثابتة للتخزين). */
export const allergyChoices: Choice<string>[] = [
  { value: 'lactose', label: 'لاكتوز/ألبان', labelEn: 'Lactose/dairy', icon: 'Milk' },
  { value: 'gluten', label: 'جلوتين', labelEn: 'Gluten', icon: 'Wheat' },
  { value: 'nuts', label: 'مكسّرات', labelEn: 'Nuts', icon: 'Nut' },
  { value: 'eggs', label: 'بيض', labelEn: 'Eggs', icon: 'Egg' },
  { value: 'seafood', label: 'مأكولات بحرية', labelEn: 'Seafood', icon: 'Fish' },
]

/** مناطق/مفاصل الإصابة الشائعة (اختياري — بلا نصائح طبية). */
export const injuryChoices: Choice<string>[] = [
  { value: 'knee', label: 'الركبة', labelEn: 'Knee', icon: 'Activity' },
  { value: 'shoulder', label: 'الكتف', labelEn: 'Shoulder', icon: 'Activity' },
  { value: 'lower_back', label: 'أسفل الظهر', labelEn: 'Lower back', icon: 'Activity' },
  { value: 'wrist', label: 'الرسغ', labelEn: 'Wrist', icon: 'Activity' },
  { value: 'elbow', label: 'المرفق', labelEn: 'Elbow', icon: 'Activity' },
  { value: 'ankle', label: 'الكاحل', labelEn: 'Ankle', icon: 'Activity' },
]

/** وضع تتبّع المكملات/الأدوية — الافتراضي «none». */
export const wellnessModeChoices: Choice<WellnessTrackingMode>[] = [
  { value: 'none', label: 'لا أريد التتبّع الآن', labelEn: 'No tracking for now', desc: 'تقدر تفعّله لاحقًا', descEn: 'You can turn it on later', icon: 'CircleSlash' },
  { value: 'basic', label: 'تتبّع بسيط', labelEn: 'Simple tracking', desc: 'تذكير بأخذ المكملات/الأدوية', descEn: 'Reminders to take supplements/meds', icon: 'Pill' },
  { value: 'detailed', label: 'تتبّع مفصّل', labelEn: 'Detailed tracking', desc: 'جرعات وأوقات وملاحظات', descEn: 'Doses, times, and notes', icon: 'ListChecks' },
]

/** نطاق مدّة الجلسة (دقائق) — يُخزَّن sessionDurationMin. */
export const sessionDurationChoices: Choice<number>[] = [
  { value: 30, label: '30 دقيقة', labelEn: '30 minutes', desc: 'سريع ومركّز', descEn: 'Quick and focused' },
  { value: 45, label: '45 دقيقة', labelEn: '45 minutes', desc: 'متوازن', descEn: 'Balanced' },
  { value: 60, label: '60 دقيقة', labelEn: '60 minutes', desc: 'كامل', descEn: 'Complete' },
  { value: 75, label: '75 دقيقة', labelEn: '75 minutes', desc: 'مطوّل', descEn: 'Extended' },
  { value: 90, label: '90 دقيقة', labelEn: '90 minutes', desc: 'مكثّف', descEn: 'Intense' },
]

/** يربط نوع المكان الدلالي بقيمة GymAccess التي يفهمها المولّد. */
export function gymTypeToAccess(t: GymType): GymAccess {
  return t === 'commercial' ? 'full' : t
}

/** يحوّل مستوى الخبرة الدلالي إلى نطاق المولّد. */
export function experienceToBand(level: ExperienceLevel): ExperienceBand {
  return experienceChoices.find((c) => c.value === level)?.band ?? '1to2y'
}

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

/** توصية أيام التمرين حسب مستوى الخبرة (نبرة محايدة). */
export function recommendedDaysFor(level: ExperienceLevel): { days: number; note: string } {
  if (level === 'beginner' || level === 'novice') return { days: 3, note: 'الموصى به لمستواك: ٣ أيام.' }
  if (level === 'intermediate') return { days: 4, note: 'الموصى به لمستواك: ٤ أيام.' }
  return { days: 5, note: 'الموصى به لمستواك: ٥ أيام.' }
}

/** نص تحفيزي عام (بلا إحصاءات وهمية). */
export const motivationalInsight = {
  title: 'الالتزام أهم من الكمال',
  body: 'النتائج تجي من تمارين منتظمة على مدى أسابيع، مو من يوم واحد مثالي. قِمّة بتسهّل عليك الالتزام خطوة بخطوة.',
}
