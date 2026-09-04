import type { Lang } from '@/lib/appPreferences'
import type {
  ActivityLevel,
  Gender,
  GoalType,
  NutritionStyle,
  TrainingLevel,
  WorkoutEnvironment,
} from '@/types/profile'
import type { RoutineDay } from '@/types'

interface ProfileChoiceStrings {
  gender: Record<Gender, string>
  activity: Record<ActivityLevel, string>
  trainingLevel: Record<TrainingLevel, string>
  environment: Record<WorkoutEnvironment, string>
  goal: Record<GoalType, string>
  nutritionStyle: Record<NutritionStyle, string>
  routineType: Record<RoutineDay['type'], string>
  weekdays: Record<string, string>
  recommendedFor: Record<string, string>
  userType: Record<'individual' | 'coach' | 'creator', string>
  workoutBalanceWarning: Record<string, string>
  minorGoalNote: string
  minorNutritionGuidanceTitle: string
  minorNutritionGuidanceBody: string
  generatedPlanReason: (plan: string, goal: string, level: string, days: number, atHome: boolean) => string
  generatedWarning: Record<string, string>
  generatedWarningFallback: string
}

const ar: ProfileChoiceStrings = {
  gender: { male: 'ذكر', female: 'أنثى', unspecified: 'غير محدّد' },
  activity: { sedentary: 'خامل (قليل الحركة)', light: 'نشاط خفيف', moderate: 'نشاط متوسط', active: 'نشِط', very_active: 'نشِط جدًا' },
  trainingLevel: { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدّم' },
  environment: { gym: 'نادي', home: 'منزل' },
  goal: { cutting: 'تنشيف', bulking: 'تضخيم', maintenance: 'محافظة على العضل', returning: 'رجوع بعد انقطاع', health: 'صحة عامة', recomposition: 'إعادة تشكيل الجسم' },
  nutritionStyle: { simple: 'بسيط', high_protein: 'عالي البروتين', saudi: 'سعودي/خليجي', economical: 'اقتصادي', flexible: 'مرن بالسعرات' },
  routineType: { push: 'دفع', pull: 'سحب', legs: 'أرجل', cardio: 'كارديو', rest: 'راحة', full: 'كامل' },
  weekdays: { السبت: 'السبت', الأحد: 'الأحد', الإثنين: 'الإثنين', الثلاثاء: 'الثلاثاء', الأربعاء: 'الأربعاء', الخميس: 'الخميس', الجمعة: 'الجمعة' },
  recommendedFor: { 'متوسط': 'متوسط', 'مبتدئ–متوسط': 'مبتدئ–متوسط', 'متقدّم': 'متقدّم', 'الكل': 'الكل' },
  userType: { individual: 'فرد', coach: 'مدرب', creator: 'صانع محتوى' },
  workoutBalanceWarning: {},
  minorGoalNote: 'أهداف تعديل الوزن متاحة من 18 سنة — ننصح بمراجعة مختص تغذية',
  minorNutritionGuidanceTitle: 'إرشاد مناسب لعمرك',
  minorNutritionGuidanceBody: 'بنركّز على العادات والتسجيل وإرشاد نوعي بدون أهداف سعرات أو ماكروز أو ماء رقمية. تقدر تراجع مختص نمو أو تغذية لأرقام مناسبة لك.',
  generatedPlanReason: (plan, goal, level, days, atHome) => `اخترنا تقسيمة «${plan}» تلقائيًا لأنك ${goal} بمستوى ${level} و${days} أيام تمرين${atHome ? ' في المنزل' : ''}.`,
  generatedWarning: {},
  generatedWarningFallback: 'راجع ملاحظة الخطة قبل اعتماد التغييرات.',
}

const en: ProfileChoiceStrings = {
  gender: { male: 'Male', female: 'Female', unspecified: 'Not specified' },
  activity: { sedentary: 'Sedentary', light: 'Light activity', moderate: 'Moderate activity', active: 'Active', very_active: 'Very active' },
  trainingLevel: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  environment: { gym: 'Gym', home: 'Home' },
  goal: { cutting: 'Cutting', bulking: 'Bulking', maintenance: 'Maintenance', returning: 'Returning after a break', health: 'General health', recomposition: 'Body recomposition' },
  nutritionStyle: { simple: 'Simple', high_protein: 'High protein', saudi: 'Saudi / Gulf', economical: 'Budget-friendly', flexible: 'Flexible calories' },
  routineType: { push: 'Push', pull: 'Pull', legs: 'Legs', cardio: 'Cardio', rest: 'Rest', full: 'Full body' },
  weekdays: { السبت: 'Saturday', الأحد: 'Sunday', الإثنين: 'Monday', الثلاثاء: 'Tuesday', الأربعاء: 'Wednesday', الخميس: 'Thursday', الجمعة: 'Friday' },
  recommendedFor: { 'متوسط': 'Intermediate', 'مبتدئ–متوسط': 'Beginner–Intermediate', 'متقدّم': 'Advanced', 'الكل': 'Everyone' },
  userType: { individual: 'Individual', coach: 'Coach', creator: 'Content creator' },
  workoutBalanceWarning: {
    'تنبيه: جدولك يمرّن الأرجل أقل من باقي العضلات.': 'Your plan trains legs less than the other muscle groups.',
    'تنبيه: يوجد عدم توازن بين الدفع والسحب.': 'Your plan has an imbalance between pushing and pulling volume.',
    'تنبيه: لا توجد تمارين كافية للظهر.': 'Your plan does not include enough back work.',
    'تنبيه: لا توجد تمارين كافية للأرجل.': 'Your plan does not include enough leg work.',
  },
  minorGoalNote: 'Weight-change goals are available from age 18 — we recommend consulting a nutrition specialist.',
  minorNutritionGuidanceTitle: 'Age-appropriate guidance',
  minorNutritionGuidanceBody: 'We’ll focus on habits, logging, and qualitative guidance without numeric calorie, macro, or water targets. A growth or nutrition specialist can provide numbers suited to you.',
  generatedPlanReason: (plan, goal, level, days, atHome) => `We selected “${plan}” based on your ${goal.toLowerCase()} goal, ${level.toLowerCase()} level, and ${days} training days${atHome ? ' at home' : ''}.`,
  generatedWarning: {
    'بدأنا بحجم أخفّ هذا الأسبوع لبداية آمنة — زِد تدريجيًا بعدها.': 'We started with lighter volume this week for a safer return. Build up gradually afterward.',
    'للمبتدئ ننصح بـ3–4 أيام في البداية لبناء الالتزام والاستشفاء.': 'For beginners, we recommend starting with 3–4 days to build consistency and recovery.',
    // [QIM-V1-018] مفتاح تاريخي — يبقى لأن الخطط **المخزَّنة** عند مستخدمين
    // قائمين تحمل نصّه الخام، والترجمة تقع عند العرض. حذفه يُفقد الإنجليزية
    // عند من ولّد خطّته قبل إعادة الصياغة.
    'راعينا الإصابات المحددة باستبعاد تمارين عالية الخطورة واختيار بدائل أأمن لنفس العضلات.': 'We accounted for the injuries you listed by excluding higher-risk exercises and choosing safer alternatives for the same muscles.',
    // [QIM-V1-018] الصياغة الحيّة (`planGenerator.ts:1101`). غيابها كان يُسقط
    // **ادّعاء السلامة نفسه** إلى نصّ عامّ بالإنجليزية: «راجع ملاحظة الخطة».
    'راعينا مناطق الإصابة التي تعرّفنا عليها: استبعدنا الحركات التي تحمّل المنطقة المصابة واخترنا بدائل لنفس العضلات.': 'We accounted for the injury areas we recognised: we excluded movements that load the injured area and chose alternatives for the same muscles.',
    // [QIM-V1-018] الحالة الثالثة (`planGenerator.ts:1104`) — **وهي الأخطر**:
    // من كتب قيدًا لم نفهمه كان يُترك بالإنجليزية بلا خبر، فيظنّ أن خطّته راعته.
    'كتبت لنا قيدًا ما قدرنا نحوّله لقاعدة تمرين، فما استبعدنا شيئًا بسببه. اختر المنطقة من القائمة (ركبة/كتف/أسفل الظهر/رسغ/مرفق/كاحل) عشان نراعيها.': 'You wrote a limitation we could not turn into a training rule, so nothing was excluded because of it. Pick the area from the list (knee / shoulder / lower back / wrist / elbow / ankle) so we can account for it.',
    // [QIM-V1-018] تنويه القاصرين يدخل نفس المصفوفة (`planGenerator.ts:1091`)،
    // فيحتاج مدخله هنا ولو كان له نصّ مستقلّ في `minorGoalNote`.
    'أهداف تعديل الوزن متاحة من 18 سنة — ننصح بمراجعة مختص تغذية': 'Weight-change goals are available from age 18 — we recommend consulting a nutrition specialist.',
    'تقسيمتك المختارة تدرّب الأرجل أقل من مرّتين أسبوعيًا — فكّر بزيادة الأيام أو تقسيمة أخرى.': 'Your selected split trains legs fewer than twice a week. Consider adding a day or choosing another split.',
    'تأكد من تدريب الأرجل مرتين أسبوعيًا على الأقل في خطط التضخيم.': 'For bulking plans, make sure you train legs at least twice a week.',
    'هذه أمثلة وجبات مبدئية وليست خطة كاملة مطابقة للأهداف.': 'These are starter meal examples, not a complete plan matched exactly to your targets.',
  },
  generatedWarningFallback: 'Review this plan note before applying your changes.',
}

export const profileChoiceStrings: Record<Lang, ProfileChoiceStrings> = { ar, en }

/** ترجمة تحذيرات المولّد عند حدّ العرض، مع إبقاء العربية مصدر المفاتيح التاريخي. */
export function localizeGeneratedWarnings(lang: Lang, warningsAr: readonly string[]): string[] {
  const choices = profileChoiceStrings[lang]
  return warningsAr.map((warning) =>
    lang === 'en' ? choices.generatedWarning[warning] ?? choices.generatedWarningFallback : warning,
  )
}
