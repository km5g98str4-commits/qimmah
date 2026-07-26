import type { Lang } from '@/lib/appPreferences'

export interface ProgressScreenStrings {
  // ProgressView — leftover literals
  weightUnit: string
  prWeightUnit: string
  thisWeekWord: string
  totalWord: string
  // StepCounterCard
  stepsTodayTitle: string
  manualEntry: string
  goalDailyAria: string
  saveGoalAria: string
  goalPrefix: string
  ofGoalPrefix: string
  goalReached: string
  remainingPrefix: string
  stepsRemainingSuffix: string
  stepsInputAria: string
  resetStepsAria: string
  last7Days: string
  stepsUnit: string
  weekdayShort: string[]
  // WeeklyMuscleMap
  mapTitle: string
  mapGenderFemale: string
  mapGenderMale: string
  mapGenderNeutral: string
  bodyViewGroupAria: string
  viewFront: string
  viewBack: string
  setsThisWeekSuffix: string
  notLoggedYet: string
  selectedNotLoggedSuffix: string
  activatedPrefix: string
  activatedMiddle: string
  activatedSuffix: string
  emptyCaption: string
  mapSelectHint: string
  /** تلميح الحالة الابتدائية — قبل اختيار أي عضلة. */
  mapTapHint: string
  mapImgAriaPrefix: string
  mapImgAriaView: string
  mapImgAriaFront: string
  mapImgAriaBack: string
  mapImgAriaSuffix: string
  legendTrained: string
  legendUntrained: string
  // MuscleMap (coverage grid)
  statusTrained: string
  statusReady: string
  statusRecovering: string
  statusFresh: string
  statusUndertrained: string
  gridEmptyTitle: string
  gridEmptyBody: string
  setsWord: string
  // MuscleCoverageSection
  coverageEyebrow: string
  coverageTitle: string
  coverageDesc: string
  pillComplete: string
  pillUndertrained: string
  pillRest: string
  sectionEmptyTitle: string
  sectionEmptyBody: string
  // ProgressSection
  privacyNote: string
}

const ar: ProgressScreenStrings = {
  weightUnit: 'كجم',
  prWeightUnit: 'كجم',
  thisWeekWord: 'هذا الأسبوع',
  totalWord: 'بالمجموع',

  stepsTodayTitle: 'خطوات اليوم',
  manualEntry: 'إدخال يدوي',
  goalDailyAria: 'الهدف اليومي للخطوات',
  saveGoalAria: 'حفظ الهدف',
  goalPrefix: 'الهدف',
  ofGoalPrefix: 'من',
  goalReached: '🎉 وصلت هدفك اليوم — كفو عليك!',
  remainingPrefix: 'باقي',
  stepsRemainingSuffix: 'خطوة للهدف',
  stepsInputAria: 'عدد خطوات اليوم',
  resetStepsAria: 'تصفير خطوات اليوم',
  last7Days: 'آخر ٧ أيام',
  stepsUnit: 'خطوة',
  weekdayShort: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],

  mapTitle: 'خريطة عضلاتك',
  mapGenderFemale: 'أنثى',
  mapGenderMale: 'ذكر',
  mapGenderNeutral: 'محايد',
  bodyViewGroupAria: 'جهة عرض الجسم',
  viewFront: 'أمامي',
  viewBack: 'خلفي',
  setsThisWeekSuffix: 'مجموعة هذا الأسبوع',
  notLoggedYet: 'ما تسجّلت لسا',
  selectedNotLoggedSuffix: 'ما تسجّلت لسا — جرّب تضيفها',
  activatedPrefix: 'فعّلت',
  activatedMiddle: 'من',
  activatedSuffix: 'عضلة هذا الأسبوع 💪',
  emptyCaption: 'ابدأ تمرينك وبتشوف عضلاتك تتلوّن هنا.',
  mapSelectHint: 'اضغط عضلة ثانية للتفاصيل',
  mapTapHint: 'اضغط أي منطقة لتفاصيلها',
  mapImgAriaPrefix: 'خريطة العضلات — جسم',
  mapImgAriaView: 'العرض',
  mapImgAriaFront: 'الأمامي',
  mapImgAriaBack: 'الخلفي',
  mapImgAriaSuffix: 'عضلة هذا الأسبوع',
  legendTrained: 'درّبتها (الأغمق أكثر)',
  legendUntrained: 'ما درّبتها',

  statusTrained: 'مكتملة',
  statusReady: 'جاهزة',
  statusRecovering: 'تحتاج راحة',
  statusFresh: 'تمرّنت من قريب',
  statusUndertrained: 'ناقصة',
  gridEmptyTitle: 'لسا ما فيه تغطية — لما تبدأ تمرينك بتظهر العضلات هنا.',
  gridEmptyBody: 'كل مجموعة تسجّلها تبان على توزيع عضلاتك خلال الأسبوع.',
  setsWord: 'مجموعة',

  coverageEyebrow: 'تغطية العضلات',
  coverageTitle: 'عضلاتك هذا الأسبوع',
  coverageDesc: 'اللي تمرّنت عليه، واللي تعافى، واللي يحتاج شغل — توزيع أسبوعي واضح.',
  pillComplete: 'مكتملة',
  pillUndertrained: 'ناقصة',
  pillRest: 'راحة',
  sectionEmptyTitle: 'ابدأ أول تمرينك، وبعدها بنعرض لك توزيع عضلاتك خلال الأسبوع.',
  sectionEmptyBody: 'كل مجموعة تسجّلها تبان مباشرة على تغطية عضلاتك.',

  privacyNote: 'قياساتك وملاحظاتك محفوظة على جهازك بس، وما تنرفع ولا تنرسل لأي خادم.',
}

const en: ProgressScreenStrings = {
  weightUnit: 'kg',
  prWeightUnit: 'kg',
  thisWeekWord: 'this week',
  totalWord: 'total',

  stepsTodayTitle: "Today's steps",
  manualEntry: 'Manual entry',
  goalDailyAria: 'Daily step goal',
  saveGoalAria: 'Save goal',
  goalPrefix: 'Goal',
  ofGoalPrefix: 'of',
  goalReached: "🎉 You hit your goal today — great work!",
  remainingPrefix: '',
  stepsRemainingSuffix: 'steps left to reach your goal',
  stepsInputAria: "Today's step count",
  resetStepsAria: "Reset today's steps",
  last7Days: 'Last 7 days',
  stepsUnit: 'steps',
  weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  mapTitle: 'Your muscle map',
  mapGenderFemale: 'Female',
  mapGenderMale: 'Male',
  mapGenderNeutral: 'Neutral',
  bodyViewGroupAria: 'Body view side',
  viewFront: 'Front',
  viewBack: 'Back',
  setsThisWeekSuffix: 'sets this week',
  notLoggedYet: 'not logged yet',
  selectedNotLoggedSuffix: 'not logged yet — try adding it',
  activatedPrefix: 'You worked',
  activatedMiddle: 'of',
  activatedSuffix: 'muscles this week 💪',
  emptyCaption: 'Start your workout and watch your muscles light up here.',
  mapSelectHint: 'Tap another muscle for details',
  mapTapHint: 'Tap any area for its details',
  mapImgAriaPrefix: 'Muscle map — a',
  mapImgAriaView: 'body,',
  mapImgAriaFront: 'front',
  mapImgAriaBack: 'back',
  mapImgAriaSuffix: 'muscles this week',
  legendTrained: 'Trained (darker = more)',
  legendUntrained: 'Not trained',

  statusTrained: 'Complete',
  statusReady: 'Ready',
  statusRecovering: 'Needs rest',
  statusFresh: 'Trained recently',
  statusUndertrained: 'Undertrained',
  gridEmptyTitle: 'No coverage yet — your muscles light up here once you start training.',
  gridEmptyBody: 'Every set you log reflects in your muscle distribution across the week.',
  setsWord: 'sets',

  coverageEyebrow: 'Muscle coverage',
  coverageTitle: 'Your muscles this week',
  coverageDesc: "What you trained, what recovered, and what's still missing — a clear weekly breakdown.",
  pillComplete: 'Complete',
  pillUndertrained: 'Undertrained',
  pillRest: 'Rest',
  sectionEmptyTitle: "Start your first workout, then we'll show your muscle distribution across the week.",
  sectionEmptyBody: 'Every set you log reflects directly in your muscle coverage.',

  privacyNote: 'Your measurements and notes are stored on your device only and are never uploaded or sent to any server.',
}

export const progressScreenStrings: Record<Lang, ProgressScreenStrings> = { ar, en }
