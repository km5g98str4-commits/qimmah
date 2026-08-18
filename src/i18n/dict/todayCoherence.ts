// نصوص «تماسك اليوم» — [SOVEREIGN-003] حارة اليوم/الرئيسية.
//
// قاموس مستقلّ لحارة واحدة (§1.4/٢: كل حارة تنشئ قاموسها ولا تعدّل قاموس غيرها).
// يحمل ما استجدّ في هذه الموجة وحده: تسجيل الخطوات اليدوي على الويب، والوسم
// الصادق لمصدر كل رقم، والبطاقات التي أُعيد توجيهها إلى وجهة موجودة فعلًا.
//
// ═══ قاعدتان تحكمان الصياغة هنا ═══
// ① **الأرقام لا تُخبَز في النصّ.** كل دالّة تستقبل نصًّا منسَّقًا مسبقًا
//    (`formatNumber(n, lang)`) لا رقمًا خامًا — وإلّا عادت أرقام لاتينية إلى
//    جلسة عربية من باب القاموس بعد أن أُغلق باب المكوّن.
// ② **لا وعد بما لا يستطيعه البناء.** الويب لا يقرأ HealthKit ولا Google Fit،
//    فلا يوجد هنا سطر واحد يعرض «اربط» على الويب. المزامنة الأصلية تُذكر
//    بوصفها قدرة **التطبيق** لا قدرة هذه الشاشة.

import type { Lang } from '@/lib/appPreferences'

export interface TodayCoherenceStrings {
  // — تسجيل الخطوات اليدوي (شاشة الخطوات) —
  manualTitle: string
  manualBody: string
  manualLabel: string
  manualSave: string
  /** يُعرض **بعد** التأكّد من أن القيمة استقرّت في التخزين — لا قبله. */
  manualSaved: (steps: string) => string
  manualFailed: string
  manualAddAria: (amount: string) => string
  goalTitle: string
  goalLabel: string
  goalSave: string
  goalSaved: (goal: string) => string
  goalFailed: string
  logStepsCta: string
  /** وسم مصدر رقم اليوم — «أنت سجّلته» لا «قِسناه لك». */
  manualProvenance: string
  syncNativeOnlyTitle: string
  syncNativeOnlyBody: string

  // — الرئيسية —
  stepsLogLabel: string
  stepsLogAction: string
  stepsOpenAction: string
  noStepsTrust: string
  /** وسم صغير بجانب المدّة حين تكون **مقدَّرة** من تمارين اليوم ومجموعاتها. */
  durationEstimate: string
  durationEstimateAria: string
  /** وسم المدّة حين تكون **تفضيل المستخدم** المضبوط لا تقديرًا محسوبًا. */
  durationPreference: string
  durationPreferenceAria: string
  recoveryLabel: string
  recoveryAction: string
  workoutSummaryLabel: string
}

const ar: TodayCoherenceStrings = {
  manualTitle: 'سجّل خطوات اليوم',
  manualBody: 'اكتب مجموع خطواتك لليوم — الرقم اللي تدخله هو اللي نعرضه، ما نزيد عليه شي.',
  manualLabel: 'مجموع خطوات اليوم',
  manualSave: 'احفظ',
  manualSaved: (steps) => `محفوظ · ${steps} خطوة اليوم`,
  manualFailed: 'ما قدرنا نحفظ الرقم — التخزين على جهازك ممتلئ أو محجوب. رقمك القديم باقٍ مثل ما هو.',
  manualAddAria: (amount) => `أضف ${amount} خطوة`,
  goalTitle: 'هدفك اليومي',
  goalLabel: 'عدد الخطوات في اليوم',
  goalSave: 'احفظ الهدف',
  goalSaved: (goal) => `هدفك اليومي صار ${goal} خطوة`,
  goalFailed: 'ما قدرنا نحفظ الهدف — هدفك القديم باقٍ مثل ما هو.',
  logStepsCta: 'سجّل خطواتك',
  manualProvenance: 'رقم اليوم من تسجيلك أنت',
  syncNativeOnlyTitle: 'المزامنة التلقائية',
  syncNativeOnlyBody: 'قراءة الخطوات من Apple Health تشتغل في تطبيق الآيفون فقط — المتصفّح ما يقدر يوصل لها. هنا تسجّل خطواتك بنفسك.',

  stepsLogLabel: 'سجّل خطوات اليوم وتابع حركتك',
  stepsLogAction: 'سجّل',
  stepsOpenAction: 'افتح',
  noStepsTrust: 'ما فيه خطوات مسجّلة اليوم — الرقم يجي من تسجيلك أنت، ما نخترعه.',
  durationEstimate: 'تقديري',
  durationEstimateAria: 'المدّة تقديرية — محسوبة من تمارين اليوم ومجموعاتها',
  durationPreference: 'من إعدادك',
  durationPreferenceAria: 'المدّة من إعدادك المضبوط، مو محسوبة من تمارين اليوم',
  recoveryLabel: 'مكمّلاتك وتذكيراتك في حسابي',
  recoveryAction: 'عرض',
  workoutSummaryLabel: 'شوف ملخّص تمرين اليوم',
}

const en: TodayCoherenceStrings = {
  manualTitle: 'Log today’s steps',
  manualBody: 'Enter your step total for today — what you type is exactly what we show, nothing added.',
  manualLabel: 'Today’s step total',
  manualSave: 'Save',
  manualSaved: (steps) => `Saved · ${steps} steps today`,
  manualFailed: 'We could not save that number — storage on this device is full or blocked. Your previous number is unchanged.',
  manualAddAria: (amount) => `Add ${amount} steps`,
  goalTitle: 'Your daily goal',
  goalLabel: 'Steps per day',
  goalSave: 'Save goal',
  goalSaved: (goal) => `Your daily goal is now ${goal} steps`,
  goalFailed: 'We could not save the goal — your previous goal is unchanged.',
  logStepsCta: 'Log your steps',
  manualProvenance: 'Today’s number comes from what you logged',
  syncNativeOnlyTitle: 'Automatic sync',
  syncNativeOnlyBody: 'Reading steps from Apple Health only works in the iPhone app — a browser cannot reach it. Here you log your steps yourself.',

  stepsLogLabel: 'Log today’s steps and track your movement',
  stepsLogAction: 'Log',
  stepsOpenAction: 'Open',
  noStepsTrust: 'No steps logged today — that number comes from what you log, we never invent it.',
  durationEstimate: 'estimate',
  durationEstimateAria: 'Duration is an estimate — worked out from today’s exercises and sets',
  durationPreference: 'your setting',
  durationPreferenceAria: 'Duration comes from your saved setting, not from today’s exercises',
  recoveryLabel: 'Your supplements and reminders live in your account',
  recoveryAction: 'View',
  workoutSummaryLabel: 'View today’s workout summary',
}

export const todayCoherenceStrings: Record<Lang, TodayCoherenceStrings> = { ar, en }
