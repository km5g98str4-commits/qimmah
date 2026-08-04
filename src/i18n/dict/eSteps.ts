import type { Lang } from '@/lib/appPreferences'
import type { StepSource } from '@/lib/stepCounter'

export interface EStepsCopy {
  title: string
  eyebrow: string
  back: string
  today: string
  ofGoal: string
  goalReached: string
  remaining: (value: string) => string
  week: string
  month: string
  bestDay: string
  streak: string
  days: string
  distance: string
  approximate: string
  distanceBasis: string
  weeklyPattern: string
  dataSource: string
  lastUpdated: (value: string) => string
  healthConnected: string
  healthNotConnected: string
  healthUnknown: string
  openSettings: string
  refresh: string
  loadingTitle: string
  loadingBody: string
  emptyTitle: string
  emptyBody: string
  errorTitle: string
  errorBody: string
  retry: string
  sourceLabels: Record<StepSource, string>
}

const AR: EStepsCopy = {
  title: 'خطواتك',
  eyebrow: 'الحركة اليومية',
  back: 'الرجوع إلى التقدّم',
  today: 'اليوم',
  ofGoal: 'من هدفك اليومي',
  goalReached: 'وصلت إلى هدف اليوم',
  remaining: (value) => `باقي ${value} خطوة`,
  week: 'آخر 7 أيام',
  month: 'آخر 30 يومًا',
  bestDay: 'أفضل يوم',
  streak: 'السلسلة الحالية',
  days: 'أيام',
  distance: 'مسافة اليوم',
  approximate: 'تقديري',
  distanceBasis: 'تقدير تقريبي على أساس 0.75 م لكل خطوة، وليس قياس GPS.',
  weeklyPattern: 'نمط الأسبوع',
  dataSource: 'مصدر البيانات',
  lastUpdated: (value) => `آخر تحديث ${value}`,
  healthConnected: 'Apple Health مفعّل. يمكنك تحديث السجل دون طلب إذن جديد.',
  healthNotConnected: 'لم تفعّل Apple Health بعد. يمكنك ربطه من الإعدادات، أو تسجيل خطواتك يدويًا هناك.',
  healthUnknown: 'لم تصلنا بيانات من Apple Health، ولا يستطيع iOS إخبارنا إن كانت بلا بيانات أو لم يُسمح بالقراءة.',
  openSettings: 'فتح إعدادات البيانات',
  refresh: 'تحديث من Apple Health',
  loadingTitle: 'نحمّل سجل خطواتك',
  loadingBody: 'نقرأ القيم المحفوظة على هذا الجهاز فقط.',
  emptyTitle: 'لا توجد خطوات مسجّلة بعد',
  emptyBody: 'اربط Apple Health أو أضف مجموع اليوم يدويًا من إعدادات البيانات، وسيظهر تقدمك هنا.',
  errorTitle: 'تعذّر تحديث الخطوات',
  errorBody: 'بقي سجلك المحفوظ كما هو. جرّب مرة أخرى، أو راجع إعدادات البيانات.',
  retry: 'إعادة المحاولة',
  sourceLabels: {
    manual: 'إدخال يدوي',
    healthkit: 'Apple Health',
    'google-fit': 'Google Fit',
    external: 'مصدر خارجي',
  },
}

const EN: EStepsCopy = {
  title: 'Your steps',
  eyebrow: 'Daily movement',
  back: 'Back to progress',
  today: 'Today',
  ofGoal: 'of your daily goal',
  goalReached: 'Today’s goal reached',
  remaining: (value) => `${value} steps to go`,
  week: 'Last 7 days',
  month: 'Last 30 days',
  bestDay: 'Best day',
  streak: 'Current streak',
  days: 'days',
  distance: 'Today’s distance',
  approximate: 'Estimate',
  distanceBasis: 'A rough estimate using 0.75 m per step, not a GPS measurement.',
  weeklyPattern: 'Weekly pattern',
  dataSource: 'Data source',
  lastUpdated: (value) => `Last updated ${value}`,
  healthConnected: 'Apple Health is enabled. You can refresh without another permission request.',
  healthNotConnected: 'Apple Health is not enabled yet. Connect it in settings, or enter today’s steps manually there.',
  healthUnknown: 'No Apple Health data reached us. iOS cannot tell us whether there is no data or reading was not allowed.',
  openSettings: 'Open data settings',
  refresh: 'Refresh from Apple Health',
  loadingTitle: 'Loading your step history',
  loadingBody: 'Reading values stored on this device only.',
  emptyTitle: 'No steps logged yet',
  emptyBody: 'Connect Apple Health or add today’s total manually in data settings, and your progress will appear here.',
  errorTitle: 'Couldn’t refresh steps',
  errorBody: 'Your saved history is unchanged. Try again, or review data settings.',
  retry: 'Try again',
  sourceLabels: {
    manual: 'Manual entry',
    healthkit: 'Apple Health',
    'google-fit': 'Google Fit',
    external: 'External source',
  },
}

export function eStepsCopy(lang: Lang): EStepsCopy {
  return lang === 'en' ? EN : AR
}
