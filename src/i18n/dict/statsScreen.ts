import type { Lang } from '@/lib/appPreferences'

// نصوص شاشة «لوحتي» (P12-C) — أرقام المستخدم المحلية بعرض محايد.

export interface StatsScreenStrings {
  // الترويسة + بطاقة الدخول من الرئيسية
  title: string
  subtitle: string
  entryTitle: string
  entryHint: string
  entryAria: string
  localNote: string

  // ملخّص التمرين الأسبوعي
  trainingTitle: string
  workoutsLabel: string
  setsLabel: string
  streakLabel: string
  weeksUnit: string
  thisWeekLabel: string
  ofWord: string
  daysUnit: string
  coveredLabel: string
  missedLabel: string
  noneMissed: string
  trainingEmptyTitle: string
  trainingEmptyBody: string

  // ملخّص التغذية الأسبوعي
  nutritionTitle: string
  avgCaloriesLabel: string
  avgProteinLabel: string
  caloriesUnit: string
  gramsUnit: string
  targetPrefix: string
  ofTargetSuffix: string
  trackedDaysPrefix: string
  trackedDaysSuffix: string
  nutritionEmptyTitle: string
  nutritionEmptyBody: string

  // مؤشّر الوزن
  weightTitle: string
  latestWeightLabel: string
  changeLabel: string
  weightUnit: string
  onePointNote: string
  weightEmptyTitle: string
  weightEmptyBody: string
  chartAria: string
}

const ar: StatsScreenStrings = {
  title: 'لوحتي',
  subtitle: 'أرقامك من سجلّاتك على هذا الجهاز — آخر ٧ أيام.',
  entryTitle: 'لوحتي',
  entryHint: 'ملخّص أسبوعك: تمرين وتغذية ووزن',
  entryAria: 'افتح لوحتي — ملخّص أرقامك الأسبوعية',
  localNote: 'أرقام للعرض فقط من بياناتك المحفوظة على جهازك — بلا أي تفسير طبي.',

  trainingTitle: 'تمرينك هذا الأسبوع',
  workoutsLabel: 'جلسات مكتملة',
  setsLabel: 'مجموعات مسجّلة',
  streakLabel: 'سلسلة الالتزام',
  weeksUnit: 'أسبوع',
  thisWeekLabel: 'هذا الأسبوع',
  ofWord: 'من',
  daysUnit: 'أيام',
  coveredLabel: 'عضلات غطّيتها',
  missedLabel: 'عضلات لم تُسجَّل بعد',
  noneMissed: 'كل عضلات خطتك سجّلت مجموعات هذا الأسبوع.',
  trainingEmptyTitle: 'ما سجّلت تمرينًا هذا الأسبوع بعد.',
  trainingEmptyBody: 'أكمل جلسة واحدة وبتشوف جلساتك ومجموعاتك وعضلاتك هنا.',

  nutritionTitle: 'تغذيتك هذا الأسبوع',
  avgCaloriesLabel: 'متوسط السعرات اليومي',
  avgProteinLabel: 'متوسط البروتين اليومي',
  caloriesUnit: 'سعرة',
  gramsUnit: 'غ',
  targetPrefix: 'الهدف',
  ofTargetSuffix: 'من الهدف',
  trackedDaysPrefix: 'محسوب من',
  trackedDaysSuffix: 'أيام مسجّلة خلال آخر ٧ أيام',
  nutritionEmptyTitle: 'لا توجد وجبات مسجّلة خلال آخر ٧ أيام.',
  nutritionEmptyBody: 'علّم وجباتك المنجزة في تبويب التغذية، وسيظهر متوسطك هنا.',

  weightTitle: 'مؤشّر وزنك',
  latestWeightLabel: 'آخر قياس',
  changeLabel: 'التغيّر خلال الفترة',
  weightUnit: 'كجم',
  onePointNote: 'سجّل قياسًا ثانيًا، وسيظهر خط الاتجاه هنا.',
  weightEmptyTitle: 'لا توجد قياسات وزن بعد.',
  weightEmptyBody: 'أضف قياس وزنك من تبويب التقدّم، وسيظهر مؤشّره هنا.',
  chartAria: 'رسم مصغّر لاتجاه الوزن عبر آخر القياسات',
}

const en: StatsScreenStrings = {
  title: 'My Stats',
  subtitle: 'Your numbers from the logs on this device — last 7 days.',
  entryTitle: 'My Stats',
  entryHint: 'Your week at a glance: training, nutrition, weight',
  entryAria: 'Open My Stats — your weekly numbers summary',
  localNote: 'Display-only numbers from data saved on your device — no medical interpretation.',

  trainingTitle: 'Your training this week',
  workoutsLabel: 'Completed sessions',
  setsLabel: 'Sets logged',
  streakLabel: 'Consistency streak',
  weeksUnit: 'weeks',
  thisWeekLabel: 'This week',
  ofWord: 'of',
  daysUnit: 'days',
  coveredLabel: 'Muscles covered',
  missedLabel: 'Muscles not logged yet',
  noneMissed: 'Every muscle in your plan logged sets this week.',
  trainingEmptyTitle: "You haven't logged a workout this week yet.",
  trainingEmptyBody: 'Finish one session and your sessions, sets, and muscles will show here.',

  nutritionTitle: 'Your nutrition this week',
  avgCaloriesLabel: 'Avg daily calories',
  avgProteinLabel: 'Avg daily protein',
  caloriesUnit: 'kcal',
  gramsUnit: 'g',
  targetPrefix: 'Target',
  ofTargetSuffix: 'of target',
  trackedDaysPrefix: 'Based on',
  trackedDaysSuffix: 'logged days in the last 7 days',
  nutritionEmptyTitle: 'No meals logged in the last 7 days.',
  nutritionEmptyBody: 'Check off your meals in the Nutrition tab and your averages will show here.',

  weightTitle: 'Your weight trend',
  latestWeightLabel: 'Latest entry',
  changeLabel: 'Change over the period',
  weightUnit: 'kg',
  onePointNote: 'Log a second measurement and the trend line will show here.',
  weightEmptyTitle: 'No weight measurements yet.',
  weightEmptyBody: 'Add a weight entry from the Progress tab and its trend will show here.',
  chartAria: 'Mini chart of weight trend across recent measurements',
}

export const statsScreenStrings: Record<Lang, StatsScreenStrings> = { ar, en }
