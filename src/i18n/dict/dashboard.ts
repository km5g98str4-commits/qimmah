import type { Lang } from '@/lib/appPreferences'

export interface DashboardStrings {
  // GreetingCard
  brand: string
  greetNamedSuffix: string // "👋" suffix composed after name
  greetNamedPrefix: string // "أهلًا يا " prefix before name
  greetGuest: string
  editPlan: string

  // QuickEntry
  logMealAria: string
  startTodayWorkoutAria: string
  logFood: string
  logFoodHint: string
  startWorkout: string
  startWorkoutHint: string

  // ModeToggle
  moreOptions: string
  simplerView: string

  // SystemIdentity
  systemBuiltFromSetup: string
  daysPerWeek: string // e.g. `${days} أيام/أسبوع`
  caloriesPerDay: string // e.g. `${calories} سعرة/يوم`

  // NextActionCard
  nextStep: string
  startTodayPrefix: string // "ابدأ بتمرين اليوم: " + dayName
  restDayTitle: string
  workoutTodayHint: string
  restDayHint: string
  openTodayWorkout: string
  openMealPlan: string

  // ProgressSnapshot
  yourProgress: string
  thisWeek: string
  streakWeeks: string
  longestStreak: string
  progressEmpty: string

  // إشارة الزخم (الرئيسية — لكل المستخدمين)
  momentumDayStreak: string
  momentumTodayDone: string
  momentumStart: string

  // بطاقة «تطبيق قِمّة قريبًا» — إعلامية هادئة (ويب فقط، بلا CTA حتى تتوفّر وجهة حقيقية)
  appSoonTitle: string
  appSoonBody: string
  appSoonTrust: string

  // Today section
  yourDay: string
  yourDayNamedPrefix: string // "يومك، " + name
  yourDayNamedSuffix: string
  yourDayGuest: string
  todaySubtitle: string
  todayProgressLabel: string
  resetDay: string
  autoResetHint: string
  todayWorkoutTitle: string
  noItemsToday: string
  waterUnit: string // "لتر"
  proteinUnit: string // "غ"

  // DailySummary
  yourPlanToday: string
  todaySummary: string
  weightUnit: string // "كجم"
  thisWeekWorkoutsPrefix: string // "هذا الأسبوع: " + count + suffix
  thisWeekWorkoutsSuffix: string // "تمارين"
  weeklyStreakPrefix: string // "سلسلة أسبوعية: " + count + suffix
  weeklyStreakSuffix: string // "أسبوع"
  nutritionAdherencePrefix: string // "التزام التغذية: " + count + "/7"

  // RecentWorkout
  date: string
  day: string
  completedExercises: string
  hardExercises: string
  trainingInsights: string

  // CurrentGoal — composed as `${goalNamedPrefix}${name}${goalNamedSuffix}`
  goalNamedPrefix: string
  goalNamedSuffix: string
  goalMine: string
  goalUnset: string
}

const ar: DashboardStrings = {
  brand: 'قِمّة',
  greetNamedPrefix: 'أهلًا يا ',
  greetNamedSuffix: ' 👋',
  greetGuest: 'أهلًا بك 👋',
  editPlan: 'تعديل خطتي',

  logMealAria: 'سجّل وجبة بسرعة',
  startTodayWorkoutAria: 'ابدأ تمرين اليوم',
  logFood: 'سجّل أكل',
  logFoodHint: 'أضف وجبتك الآن',
  startWorkout: 'ابدأ تمرين',
  startWorkoutHint: 'افتح تمرين اليوم',

  moreOptions: 'خيارات أكثر · وضع متقدّم',
  simplerView: 'عرض أبسط',

  systemBuiltFromSetup: 'نظامك مبنيّ من إعدادك',
  daysPerWeek: 'أيام/أسبوع',
  caloriesPerDay: 'سعرة/يوم',

  nextStep: 'خطوتك التالية',
  startTodayPrefix: 'ابدأ بتمرين اليوم: ',
  restDayTitle: 'اليوم راحة — جهّز تغذيتك',
  workoutTodayHint: 'خطوة وحدة تكفي اليوم. افتح التمرين وعلّم كل مجموعة وأنت تخلّصها.',
  restDayHint: 'لا تمرين اليوم. راجع وجباتك واشرب ماءك — الالتزام في يوم الراحة جزء من الخطة.',
  openTodayWorkout: 'افتح تمرين اليوم',
  openMealPlan: 'افتح خطة الأكل',

  yourProgress: 'تقدّمك',
  thisWeek: 'هذا الأسبوع',
  streakWeeks: 'أسابيع متتالية',
  longestStreak: 'أطول سلسلة',
  progressEmpty: 'سجّل أول تمرين وتبدأ أرقامك تظهر هنا — الحجم، الأرقام القياسية، والسلسلة الأسبوعية.',
  momentumDayStreak: 'يوم متتالي',
  momentumTodayDone: 'تمرّنت اليوم',
  momentumStart: 'أول تمرين هذا الأسبوع يبدأ سلسلتك.',
  appSoonTitle: 'تطبيق قِمّة قريبًا',
  appSoonBody: 'نعمل على تجربة آيفون أكثر هدوءًا وسلاسة، لتكون خطوتك الصحية معك دائمًا.',
  appSoonTrust: 'نفس الوضوح. نفس الهدوء. أقرب إليك.',

  yourDay: 'يومك',
  yourDayNamedPrefix: 'يومك، ',
  yourDayNamedSuffix: ' 👋',
  yourDayGuest: 'يومك 👋',
  todaySubtitle: 'علّم كل شي تخلّصه — وتابع التزامك خطوة بخطوة.',
  todayProgressLabel: 'إنجاز اليوم',
  resetDay: 'إعادة ضبط اليوم',
  autoResetHint: 'يتصفّر تلقائيًا كل يوم عند منتصف الليل',
  todayWorkoutTitle: 'تمرين اليوم',
  noItemsToday: 'لا عناصر لهذا اليوم.',
  waterUnit: 'لتر',
  proteinUnit: 'غ',

  yourPlanToday: 'خطتك اليوم',
  todaySummary: 'ملخّص اليوم',
  weightUnit: 'كجم',
  thisWeekWorkoutsPrefix: 'هذا الأسبوع: ',
  thisWeekWorkoutsSuffix: 'تمارين',
  weeklyStreakPrefix: 'سلسلة أسبوعية: ',
  weeklyStreakSuffix: 'أسبوع',
  nutritionAdherencePrefix: 'التزام التغذية: ',

  date: 'التاريخ',
  day: 'اليوم',
  completedExercises: 'تمارين مكتملة',
  hardExercises: 'تمارين صعبة',
  trainingInsights: 'ملاحظات الذكاء التدريبي',

  goalNamedPrefix: 'هدف ',
  goalNamedSuffix: '',
  goalMine: 'هدفي',
  goalUnset: 'حدّد هدفك من «الإعدادات → تعديل خطتي».',
}

const en: DashboardStrings = {
  brand: 'Qimmah',
  greetNamedPrefix: 'Hey ',
  greetNamedSuffix: ' 👋',
  greetGuest: 'Welcome 👋',
  editPlan: 'Edit my plan',

  logMealAria: 'Quick-log a meal',
  startTodayWorkoutAria: "Start today's workout",
  logFood: 'Log food',
  logFoodHint: 'Add your meal now',
  startWorkout: 'Start workout',
  startWorkoutHint: "Open today's workout",

  moreOptions: 'More options · Advanced mode',
  simplerView: 'Simpler view',

  systemBuiltFromSetup: 'Your system, built from your setup',
  daysPerWeek: 'days/week',
  caloriesPerDay: 'cal/day',

  nextStep: 'Your next step',
  startTodayPrefix: "Start today's workout: ",
  restDayTitle: 'Rest day — dial in your nutrition',
  workoutTodayHint: "One step is enough today. Open the workout and check off each set as you finish it.",
  restDayHint: "No workout today. Review your meals and drink your water — staying consistent on rest days is part of the plan.",
  openTodayWorkout: "Open today's workout",
  openMealPlan: 'Open meal plan',

  yourProgress: 'Your progress',
  thisWeek: 'This week',
  streakWeeks: 'Weeks in a row',
  longestStreak: 'Longest streak',
  progressEmpty: 'Log your first workout and your numbers start showing up here — volume, PRs, and your weekly streak.',
  momentumDayStreak: 'day streak',
  momentumTodayDone: 'Trained today',
  momentumStart: 'Your first workout this week starts your streak.',
  appSoonTitle: 'Qimmah app coming soon',
  appSoonBody: 'We’re building a calmer, smoother iPhone experience so your next healthy step stays with you.',
  appSoonTrust: 'Same clarity. Same calm. Closer to you.',

  yourDay: 'Your day',
  yourDayNamedPrefix: 'Your day, ',
  yourDayNamedSuffix: ' 👋',
  yourDayGuest: 'Your day 👋',
  todaySubtitle: 'Check off everything you finish — and track your consistency step by step.',
  todayProgressLabel: "Today's progress",
  resetDay: 'Reset day',
  autoResetHint: 'Resets automatically each day at midnight',
  todayWorkoutTitle: "Today's workout",
  noItemsToday: 'Nothing scheduled for today.',
  waterUnit: 'L',
  proteinUnit: 'g',

  yourPlanToday: 'Your plan today',
  todaySummary: "Today's summary",
  weightUnit: 'kg',
  thisWeekWorkoutsPrefix: 'This week: ',
  thisWeekWorkoutsSuffix: 'workouts',
  weeklyStreakPrefix: 'Weekly streak: ',
  weeklyStreakSuffix: 'weeks',
  nutritionAdherencePrefix: 'Nutrition adherence: ',

  date: 'Date',
  day: 'Day',
  completedExercises: 'Exercises done',
  hardExercises: 'Hard exercises',
  trainingInsights: 'Training insights',

  goalNamedPrefix: '',
  goalNamedSuffix: "'s goal",
  goalMine: 'My goal',
  goalUnset: 'Set your goal from “Settings → Edit my plan”.',
}

export const dashboardStrings: Record<Lang, DashboardStrings> = { ar, en }
