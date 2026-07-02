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
}

export const genderChoices: Choice<Gender>[] = [
  { value: 'male', label: 'ذكر', icon: 'Users' },
  { value: 'female', label: 'أنثى', icon: 'Users' },
]

/** الجنس (إعداد Phase 1) — قيمتان فقط (male/female). */
export const sexChoices: Choice<Sex>[] = [
  { value: 'male', label: 'ذكر', icon: 'Users' },
  { value: 'female', label: 'أنثى', icon: 'Users' },
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
}

export const goalChoices: GoalChoice[] = [
  { value: 'bulk', label: 'تضخيم', desc: 'زيادة العضل والوزن', icon: 'TrendingUp', goalType: 'bulking' },
  { value: 'cut', label: 'تنشيف', desc: 'خسارة دهون مع الحفاظ على العضل', icon: 'Flame', goalType: 'cutting' },
  { value: 'maintain', label: 'محافظة على العضل', desc: 'ثبات على وزنك مع الحفاظ على عضلك', icon: 'ShieldCheck', goalType: 'maintenance' },
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
}

export const experienceChoices: ExperienceChoice[] = [
  { value: 'beginner', label: 'مبتدئ', desc: 'أقل من ٣ شهور أو ما بدأت', icon: 'Sparkles', band: 'lt1m' },
  { value: 'novice', label: 'مستجد', desc: '٣ شهور – سنة', icon: 'CalendarDays', band: '1to6m' },
  { value: 'intermediate', label: 'متوسط', desc: '١ – ٣ سنوات', icon: 'CalendarDays', band: '1to2y' },
  { value: 'advanced', label: 'متقدّم', desc: 'أكثر من ٣ سنوات', icon: 'Trophy', band: 'gt2y' },
]

/** الانتظام — يظهر فقط لغير المبتدئ (المبتدئ يُخزَّن انتظامه «new» تلقائيًا). */
export const consistencyChoices: Choice<Consistency>[] = [
  { value: 'onoff', label: 'أتمرن وأوقف', desc: 'التزام متقطّع', icon: 'Activity' },
  { value: 'regular', label: 'أتمرن بانتظام', desc: 'روتين ثابت حاليًا', icon: 'CheckCircle2' },
  { value: 'returning', label: 'راجع بعد انقطاع', desc: 'كنت تتمرن وتوقفت فترة', icon: 'RotateCcw' },
]

/** الانتظام (إعداد Phase 1 — قيم مصدر الحقيقة) — يظهر فقط لغير المبتدئ. */
export const consistencyChoicesV2: Choice<OnbConsistency>[] = [
  { value: 'on_and_off', label: 'أتمرن وأوقف', desc: 'التزام متقطّع', icon: 'Activity' },
  { value: 'consistent', label: 'أتمرن بانتظام', desc: 'روتين ثابت حاليًا', icon: 'CheckCircle2' },
  { value: 'returning', label: 'راجع بعد انقطاع', desc: 'كنت تتمرن وتوقفت فترة', icon: 'RotateCcw' },
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
  { value: 'commercial_gym', label: 'صالة كاملة', desc: 'أجهزة وأوزان حرة كاملة', icon: 'Building2' },
  { value: 'small_gym', label: 'صالة صغيرة', desc: 'تجهيزات محدودة', icon: 'Dumbbell' },
  { value: 'home_gym', label: 'جيم منزلي', desc: 'أدوات بسيطة في البيت', icon: 'Home' },
  { value: 'bodyweight', label: 'وزن الجسم', desc: 'بدون أي أدوات', icon: 'Activity' },
]

/** نمط اختيار التقسيمة. */
export const splitModeChoices: Choice<SplitMode>[] = [
  { value: 'auto', label: 'اختر لي تلقائيًا', desc: 'نختار أنسب تقسيمة لمستواك وأيامك', icon: 'Sparkles' },
  { value: 'advanced', label: 'أختار بنفسي', desc: 'تحكّم متقدّم في نوع التقسيمة', icon: 'SlidersHorizontal' },
]

/**
 * خيارات التقسيمة المتقدّمة — تظهر فقط عند splitMode=advanced.
 * مجموعة نظيفة متمايزة بلا تكرار (P2.7): جسم كامل / علوي-سفلي / دفع-سحب-أرجل.
 * (أُزيلت «أرنولد» و«عضلة باليوم» من القائمة لتجنّب التداخل؛ المولّد يبقى يدعمها
 *  للملفّات القديمة المحفوظة فلا تنكسر — راجع ADVANCED_CYCLES في planGenerator.)
 */
export const advancedSplitChoices: Choice<AdvancedSplit>[] = [
  { value: 'full_body', label: 'جسم كامل', desc: 'كل الجسم كل جلسة', icon: 'Layers' },
  { value: 'upper_lower', label: 'علوي/سفلي', desc: 'علوي وسفلي بالتناوب', icon: 'TrendingUp' },
  { value: 'push_pull_legs', label: 'دفع/سحب/أرجل', desc: 'PPL كلاسيكي', icon: 'Dumbbell' },
]

/** النشاط اليومي (NEAT) خارج التمرين. */
export const neatChoices: Choice<NeatLevel>[] = [
  { value: 'sedentary', label: 'قليل الحركة', desc: 'مكتبي/جالس أغلب اليوم', icon: 'Armchair' },
  { value: 'light', label: 'حركة خفيفة', desc: 'مشي بسيط خلال اليوم', icon: 'Footprints' },
  { value: 'moderate', label: 'حركة متوسطة', desc: 'واقف/متحرّك بانتظام', icon: 'Activity' },
  { value: 'high', label: 'حركة عالية', desc: 'عمل بدني أو مشي كثير', icon: 'Flame' },
]

/** أسلوب التغذية — طريقة العرض (لا أسلوب الطبخ). */
export const nutritionStyleChoices: Choice<OnbNutritionStyle>[] = [
  { value: 'meal_suggestions', label: 'اقتراح وجبات', desc: 'وجبات جاهزة مقترحة حسب هدفك', icon: 'Salad' },
  { value: 'macros_only', label: 'ماكروز فقط', desc: 'أهداف سعرات وبروتين بدون وجبات', icon: 'Target' },
  { value: 'simple_guidance', label: 'إرشاد مبسّط', desc: 'توجيه عام بدون تفاصيل دقيقة', icon: 'Compass' },
]

/** توزيع حجم الوجبات (P2.5) — يحدّد أين تتركّز السعرات بين الوجبات. */
export const mealDistributionChoices: Choice<MealDistribution>[] = [
  { value: 'balanced', label: 'متوازنة', desc: 'وجبات رئيسية ووجبات خفيفة بحجم طبيعي', icon: 'Scale' },
  { value: 'fewer_larger', label: 'أكبر وأقل', desc: 'سعرات مركّزة في الوجبات الرئيسية', icon: 'UtensilsCrossed' },
  { value: 'more_smaller', label: 'أصغر وأكثر', desc: 'سعرات موزّعة بالتساوي على الوجبات', icon: 'LayoutGrid' },
]

/** وقت الجوع الأكثر (P2.5) — يميل توزيع السعرات للصباح أو المساء. */
export const appetiteTimingChoices: Choice<AppetiteTiming>[] = [
  { value: 'balanced', label: 'متوازن', desc: 'جوعي موزّع على اليوم', icon: 'Clock' },
  { value: 'morning', label: 'الصباح', desc: 'أجوع أكثر بداية اليوم', icon: 'Sunrise' },
  { value: 'evening', label: 'المساء', desc: 'أجوع أكثر آخر اليوم', icon: 'Sunset' },
]

/** نمط الأكل (اختياري). */
export const dietPatternChoices: Choice<DietPattern>[] = [
  { value: 'none', label: 'بدون قيود', icon: 'Check' },
  { value: 'vegetarian', label: 'نباتي (مع ألبان/بيض)', icon: 'Leaf' },
  { value: 'vegan', label: 'نباتي صرف', icon: 'Leaf' },
  { value: 'pescatarian', label: 'سمك بدون لحوم', icon: 'Fish' },
  { value: 'low_carb', label: 'قليل الكارب', icon: 'TrendingDown' },
  { value: 'keto', label: 'كيتو', icon: 'Flame' },
]

/** حساسيات غذائية شائعة (اختياري — قيم مفتاحية ثابتة للتخزين). */
export const allergyChoices: Choice<string>[] = [
  { value: 'lactose', label: 'لاكتوز/ألبان', icon: 'Milk' },
  { value: 'gluten', label: 'جلوتين', icon: 'Wheat' },
  { value: 'nuts', label: 'مكسّرات', icon: 'Nut' },
  { value: 'eggs', label: 'بيض', icon: 'Egg' },
  { value: 'seafood', label: 'مأكولات بحرية', icon: 'Fish' },
]

/** مناطق/مفاصل الإصابة الشائعة (اختياري — بلا نصائح طبية). */
export const injuryChoices: Choice<string>[] = [
  { value: 'knee', label: 'الركبة', icon: 'Activity' },
  { value: 'shoulder', label: 'الكتف', icon: 'Activity' },
  { value: 'lower_back', label: 'أسفل الظهر', icon: 'Activity' },
  { value: 'wrist', label: 'الرسغ', icon: 'Activity' },
  { value: 'elbow', label: 'المرفق', icon: 'Activity' },
  { value: 'ankle', label: 'الكاحل', icon: 'Activity' },
]

/** وضع تتبّع المكملات/الأدوية — الافتراضي «none». */
export const wellnessModeChoices: Choice<WellnessTrackingMode>[] = [
  { value: 'none', label: 'لا أريد التتبّع الآن', desc: 'تقدر تفعّله لاحقًا', icon: 'CircleSlash' },
  { value: 'basic', label: 'تتبّع بسيط', desc: 'تذكير بأخذ المكملات/الأدوية', icon: 'Pill' },
  { value: 'detailed', label: 'تتبّع مفصّل', desc: 'جرعات وأوقات وملاحظات', icon: 'ListChecks' },
]

/** نطاق مدّة الجلسة (دقائق) — يُخزَّن sessionDurationMin. */
export const sessionDurationChoices: Choice<number>[] = [
  { value: 30, label: '30 دقيقة', desc: 'سريع ومركّز' },
  { value: 45, label: '45 دقيقة', desc: 'متوازن' },
  { value: 60, label: '60 دقيقة', desc: 'كامل' },
  { value: 75, label: '75 دقيقة', desc: 'مطوّل' },
  { value: 90, label: '90 دقيقة', desc: 'مكثّف' },
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
