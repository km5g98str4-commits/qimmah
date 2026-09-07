// نصوص ميزة «الجدول المخصّص» (باني الخطة اليدوي) — عربي خليجي + إنجليزي.
// مُستقلة عن قواميس الشاشات العامة لتبقى الميزة قائمة بذاتها (P10 A1).

import type { Lang } from '@/lib/appPreferences'
import type { Muscle } from '@/types/workout'

export type MuscleFilter = Muscle | 'all'

export interface CustomPlanStrings {
  // — شاشة الاختيار في الإعداد —
  choiceEyebrow: string
  choiceTitle: string
  choiceHint: string
  autoTitle: string
  autoDesc: string
  customTitle: string
  customDesc: string
  recommendedBadge: string

  // — رأس الباني —
  createTitle: string
  editTitle: string
  stepDays: string
  stepBuild: string
  stepReview: string

  // — خطوة الأيام —
  daysTitle: string
  daysHint: string
  daysUnit: string

  // — بطاقة التعبئة من التقسيمة (H-1) — اختيار صريح يستدعيه المستخدم، لا تعبئة صامتة —
  seedCardTitle: string
  seedCardHint: string
  seedSelectedNote: string

  // — خطوة البناء —
  buildTitle: string
  buildHint: string
  dayNameLabel: string
  dayNamePlaceholder: string
  addExercise: string
  emptyDayTitle: string
  emptyDayHint: string
  setsLabel: string
  repsLabel: string
  moveUp: string
  moveDown: string
  decrease: string
  increase: string
  repsSecondsOption: string
  removeExercise: string
  dayTab: string

  // — عمليات اليوم (H-2): توصيل duplicateDay · copyDayAs · duplicateWeek —
  duplicateDayAction: string
  copyDayAction: string
  copyDayTargetTitle: string
  copyDayReplaceHint: string
  duplicateWeekAction: string
  duplicateWeekHint: string

  // — الصدق البصري الحيّ (H-3): شارة الدقائق + تحذيرات المحقّق —
  minutesUnit: string
  warningsTitle: string

  // — خطوة المراجعة —
  reviewTitle: string
  reviewHint: string
  reviewEmptyWarning: string
  /**
   * [CUSTOM-PLAN-DEADEND-001] المراجعة بلا تمارين كانت تعطّل زرّ الحفظ وتترك
   * السبب أسفل القائمة — جدولٌ ظاهر وباب مقفل. الآن لكل يوم فارغ فعل، وللزرّ
   * الرئيسي فعلٌ دائمًا: تعبئة الأيام الفارغة أو الذهاب لإضافة التمارين.
   */
  reviewEmptyTitle: string
  reviewEmptyBody: string
  fillEmptyDays: string
  addExercisesToDay: string
  totalExercises: string

  // — أزرار التنقّل —
  next: string
  back: string
  save: string
  cancel: string
  exercisesUnit: string

  // — منتقي التمارين —
  pickerTitle: string
  searchPlaceholder: string
  noResults: string
  add: string
  added: string
  close: string
  /** زرّ التذييل اللاصق في المنتقي (H-4) — قبل أي إضافة. */
  pickerDone: string
  /** بعد إضافة واحدة/اثنتين/{n} — عدّاد جارٍ داخل الزرّ نفسه. */
  pickerDoneOne: string
  pickerDoneTwo: string
  pickerDoneFew: string
  pickerDoneMany: string
  /** عنوان قسم التمارين الحرة أسفل أجهزة الكتالوج (P12). */
  freeWeightsSection: string
  /** عنوان قسم أجهزة الإضافات (ذراعان/بطن) — غير أساسية، تُلحَق بالأيام (P12). */
  accessoriesSection: string
  muscleLabels: Record<MuscleFilter, string>

  // — نقاط الدخول في تبويب التمرين —
  customPlanBadge: string
  autoPlanBadge: string
  editMyPlan: string
  createCustom: string
  createCustomDesc: string
  useCustom: string
  useAuto: string
  planSourceTitle: string
  planSavedToast: string
}

const ar: CustomPlanStrings = {
  choiceEyebrow: 'جدول التمرين',
  choiceTitle: 'كيف تبي جدول تمرينك؟',
  choiceHint: 'اختر الطريقة اللي تناسبك — تقدر تغيّرها في أي وقت.',
  autoTitle: 'جدول جاهز حسب هدفك',
  autoDesc: 'نولّد لك خطة متكاملة من بياناتك وهدفك — جاهزة على طول.',
  customTitle: 'أصمّم جدولي بنفسي',
  customDesc: 'اختر أيامك وتمارينك ورتّبها مثل ما تحب — تحكّم كامل.',
  recommendedBadge: 'موصى به',

  createTitle: 'إنشاء جدول مخصّص',
  editTitle: 'تعديل جدولي',
  stepDays: 'الأيام',
  stepBuild: 'التمارين',
  stepReview: 'مراجعة',

  daysTitle: 'كم يوم تمرين بالأسبوع؟',
  daysHint: 'اختر عدد الأيام ونجهّز لك بطاقة لكل يوم باسم مقترح.',
  daysUnit: 'أيام',

  seedCardTitle: 'عبّي الأيام بتمارين مقترحة',
  seedCardHint: 'وتقدر تعدّلها وتبدّلها مثل ما تبي.',
  seedSelectedNote: 'بنعبّي الأيام الفارغة لما تكمّل — والتعديل كله بيدك.',

  buildTitle: 'ابنِ أيامك',
  buildHint: 'سمِّ كل يوم، وأضف تمارينه، ورتّبها مثل ما تبي.',
  dayNameLabel: 'اسم اليوم',
  dayNamePlaceholder: 'مثال: صدر + ترايسبس',
  addExercise: 'أضف تمرين',
  emptyDayTitle: 'ما أضفت تمارين لهذا اليوم بعد',
  emptyDayHint: 'اضغط «أضف تمرين» واختر تمارينك من المكتبة.',
  setsLabel: 'مجموعات',
  repsLabel: 'تكرار',
  moveUp: 'تحريك لأعلى',
  moveDown: 'تحريك لأسفل',
  decrease: 'إنقاص',
  increase: 'زيادة',
  repsSecondsOption: '30 ث',
  removeExercise: 'حذف التمرين',
  dayTab: 'اليوم',

  duplicateDayAction: 'كرّر اليوم',
  copyDayAction: 'انسخه ليوم آخر',
  copyDayTargetTitle: 'انسخ تمارين هذا اليوم إلى:',
  copyDayReplaceHint: 'اليوم اللي تختاره تتبدّل تمارينه بتمارين هذا اليوم.',
  duplicateWeekAction: 'كرّر الأسبوع',
  duplicateWeekHint: 'ضاعف أيامك بضغطة وحدة — كل يوم يجيه توأمه.',

  minutesUnit: 'دقيقة',
  warningsTitle: 'ملاحظات على جدولك',

  reviewTitle: 'راجع جدولك',
  reviewHint: 'تأكد من كل يوم وتمارينه قبل الحفظ.',
  reviewEmptyWarning: 'أضف تمرين واحد على الأقل في يوم واحد قبل الحفظ.',
  reviewEmptyTitle: 'جدولك ما فيه تمارين بعد',
  reviewEmptyBody: 'عبّي الأيام بتمارين مقترحة بضغطة، أو أضف تمارينك بنفسك لكل يوم.',
  fillEmptyDays: 'عبّي الأيام الفارغة',
  addExercisesToDay: 'أضف تمارين',
  totalExercises: 'إجمالي التمارين',

  next: 'التالي',
  back: 'رجوع',
  save: 'حفظ الجدول',
  cancel: 'إلغاء',
  exercisesUnit: 'تمارين',

  pickerTitle: 'اختر تمرين',
  searchPlaceholder: 'ابحث عن تمرين…',
  noResults: 'ما فيه نتائج مطابقة.',
  add: 'إضافة',
  added: 'أُضيف',
  close: 'إغلاق',
  pickerDone: 'تم',
  pickerDoneOne: 'تم — أضفت تمرين واحد',
  pickerDoneTwo: 'تم — أضفت تمرينين',
  pickerDoneFew: 'تم — أضفت {n} تمارين',
  pickerDoneMany: 'تم — أضفت {n} تمرين',
  freeWeightsSection: 'تمارين حرة (متقدّم)',
  accessoriesSection: 'إضافات (ذراعان وبطن)',
  muscleLabels: {
    all: 'كل العضلات',
    chest: 'صدر',
    back: 'ظهر',
    shoulders: 'أكتاف',
    biceps: 'بايسبس',
    triceps: 'ترايسبس',
    legs: 'أرجل',
    quads: 'أمامية الفخذ',
    hamstrings: 'خلفية الفخذ',
    glutes: 'المؤخرة',
    calves: 'سمانة',
    core: 'بطن',
    cardio: 'كارديو',
  },

  customPlanBadge: 'جدول مخصّص',
  autoPlanBadge: 'جدول تلقائي',
  editMyPlan: 'تعديل جدولي',
  createCustom: 'أنشئ جدول مخصّص',
  createCustomDesc: 'اختر أيامك وتمارينك بنفسك',
  useCustom: 'جدولي المخصّص',
  useAuto: 'الجدول التلقائي',
  planSourceTitle: 'الجدول المعتمد',
  planSavedToast: 'انحفظ جدولك المخصّص',
}

const en: CustomPlanStrings = {
  choiceEyebrow: 'Workout plan',
  choiceTitle: 'How do you want your plan?',
  choiceHint: 'Pick what suits you — you can change it anytime later.',
  autoTitle: 'Ready plan for your goal',
  autoDesc: 'We build a complete plan from your data and goal — ready instantly.',
  customTitle: 'Build my own plan',
  customDesc: 'Choose your days and exercises and order them however you like — full control.',
  recommendedBadge: 'Recommended',

  createTitle: 'Create custom plan',
  editTitle: 'Edit my plan',
  stepDays: 'Days',
  stepBuild: 'Exercises',
  stepReview: 'Review',

  daysTitle: 'How many training days per week?',
  daysHint: "Pick the number of days and we'll set up a card for each with a suggested name.",
  daysUnit: 'days',

  seedCardTitle: 'Fill the days with suggested exercises',
  seedCardHint: 'You can tweak and swap them however you like.',
  seedSelectedNote: "We'll fill the empty days when you continue — editing stays fully in your hands.",

  buildTitle: 'Build your days',
  buildHint: 'Name each day, add its exercises, and order them the way you want.',
  dayNameLabel: 'Day name',
  dayNamePlaceholder: 'e.g. Chest + Triceps',
  addExercise: 'Add exercise',
  emptyDayTitle: "You haven't added exercises to this day yet",
  emptyDayHint: 'Tap “Add exercise” to pick from the library.',
  setsLabel: 'Sets',
  repsLabel: 'Reps',
  moveUp: 'Move up',
  moveDown: 'Move down',
  decrease: 'Decrease',
  increase: 'Increase',
  repsSecondsOption: '30 s',
  removeExercise: 'Remove exercise',
  dayTab: 'Day',

  duplicateDayAction: 'Duplicate day',
  copyDayAction: 'Copy to another day',
  copyDayTargetTitle: "Copy this day's exercises to:",
  copyDayReplaceHint: "The day you pick gets its exercises replaced with this day's.",
  duplicateWeekAction: 'Duplicate the week',
  duplicateWeekHint: 'Double your days in one tap — every day gets its twin.',

  minutesUnit: 'min',
  warningsTitle: 'Notes on your plan',

  reviewTitle: 'Review your plan',
  reviewHint: 'Check each day and its exercises before saving.',
  reviewEmptyWarning: 'Add at least one exercise to one day before saving.',
  reviewEmptyTitle: 'Your plan has no exercises yet',
  reviewEmptyBody: 'Fill the days with suggested exercises in one tap, or add your own to each day.',
  fillEmptyDays: 'Fill empty days',
  addExercisesToDay: 'Add exercises',
  totalExercises: 'Total exercises',

  next: 'Next',
  back: 'Back',
  save: 'Save plan',
  cancel: 'Cancel',
  exercisesUnit: 'exercises',

  pickerTitle: 'Pick an exercise',
  searchPlaceholder: 'Search for an exercise…',
  noResults: 'No matching results.',
  add: 'Add',
  added: 'Added',
  close: 'Close',
  pickerDone: 'Done',
  pickerDoneOne: 'Done — added 1 exercise',
  pickerDoneTwo: 'Done — added 2 exercises',
  pickerDoneFew: 'Done — added {n} exercises',
  pickerDoneMany: 'Done — added {n} exercises',
  freeWeightsSection: 'Free weights (advanced)',
  accessoriesSection: 'Accessories (arms & abs)',
  muscleLabels: {
    all: 'All muscles',
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    legs: 'Legs',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    glutes: 'Glutes',
    calves: 'Calves',
    core: 'Core',
    cardio: 'Cardio',
  },

  customPlanBadge: 'Custom plan',
  autoPlanBadge: 'Auto plan',
  editMyPlan: 'Edit my plan',
  createCustom: 'Create a custom plan',
  createCustomDesc: 'Choose your days and exercises yourself',
  useCustom: 'My custom plan',
  useAuto: 'Auto plan',
  planSourceTitle: 'Active plan',
  planSavedToast: 'Custom plan saved',
}

export const customPlanStrings: Record<Lang, CustomPlanStrings> = { ar, en }
