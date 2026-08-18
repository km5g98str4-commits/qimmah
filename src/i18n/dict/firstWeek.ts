// نصوص حزمة الأسبوع الأول ([CTO-70]) — أول انتصار · بروتوكول التعثّر · إيقاع
// الأسبوع · ملخّص اليوم السابع.
//
// النبرة **عامية بيضاء سعودية** يفهمها كل عربي (§6)، والإنجليزية غير رسمية ودودة.
// أربعة ثوابت تسري على كل سطر هنا: لا لوم · لا ضغط · لا تهويل · ولا تكديس تعجّب.
// وفي حالات الفوات تحديدًا: **لا أحمر ولا رموز حزن ولا streak** (قرار المجلس).

import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'

export interface FirstWeekStrings {
  // — أول انتصار (ADV-13) —
  firstWinTitle: string
  /** سطر المساء الصادق — يُعرض بعد ٢١:٠٠ فقط. */
  firstWinEveningNote: string
  firstWinDone: string
  firstWinOther: string
  win: Record<'warmup' | 'meal' | 'water' | 'dinner', { label: string; cta: string; minutes: string }>
  /**
   * [SOVEREIGN-TODAY-001] مدّة الإحماء **المحسوبة** لا المكتوبة.
   *
   * كان السطر ثابتًا («دقيقتين») بينما التسليم لا يحتوي إحماءً أصلًا. الآن
   * الرقم يأتي من `buildWarmupPlan` — نفس الباني الذي ترسمه شاشة الإحماء —
   * فالوعد والتسليم لا يفترقان إلا معًا.
   */
  winWarmupMinutes: (minutes: number) => string

  // — سطح إذن الإشعارات (ADV-14م · م١) —
  /** المقابل محدّد: الوقت نصّ قابل للنقر لتغييره **قبل** القبول. */
  notifyAskLine: (time: string) => string
  notifyAskChangeTime: string
  notifyAskYes: string
  notifyAskNo: string
  /** رفض النظام بعد القبول — صدق بلا وعد كاذب بالعمل. */
  notifyAskDenied: string
  notifyAskHome: string

  // — بروتوكول التعثّر (ADV-18) —
  missedTitle: string
  missedBody: string
  missedEasierCta: string
  /** «بدل ٢٥ دقيقة، سوِّ ٨ اليوم» — الرقمان من الخطة الفعلية لا مخترعان. */
  missedEasierLine: (fullMin: number, easyMin: number) => string
  missedTodayOnly: string

  // — إيقاع الأسبوع (ADV-19/21) —
  thursdayHeadsUp: string

  // — ملخّص اليوم السابع (ADV-20 + Q-212) —
  weekTitle: string
  weekBehaviourHeading: string
  weekDaysLine: (days: number, total: number) => string
  weekWorkoutsLine: (n: number) => string
  weekMealsLine: (n: number) => string
  weekScaleTitle: string
  weekScaleBody: string
  weekWeightHeading: string
  weekWeightLine: (kg: string) => string
  weekWeightNone: string
  weekAccountTitle: string
  /** الصياغة الموقّعة — لا وعد حفظ/استعادة، المزامنة مطفأة. */
  weekAccountBody: string
  weekAccountCta: string
  weekClose: string
}

const AR: FirstWeekStrings = {
  firstWinTitle: 'خلّنا نبدأ بشي واحد',
  firstWinEveningNote: 'اليوم انتهى تقريبًا — نبدأ صح من بكرة الصبح.',
  firstWinDone: 'تم · أول خطوة صارت',
  firstWinOther: 'أو سوِّ غيره',
  win: {
    warmup: { label: 'إحماء قصير', cta: 'سوّه الحين', minutes: 'دقيقتين' },
    meal: { label: 'سجّل وجبة', cta: 'سجّلها', minutes: 'دقيقة' },
    water: { label: 'سجّل كوب ماء', cta: 'سجّله', minutes: 'ثواني' },
    dinner: { label: 'سجّل عشاك', cta: 'سجّله', minutes: 'دقيقة' },
  },

  winWarmupMinutes: (minutes) => `${formatNumber(minutes, 'ar')} دقيقة`,

  notifyAskLine: (time) => `نذكّرك بكرة الساعة ${time} بتمرينك — نرسل لك؟`,
  notifyAskChangeTime: 'غيّر الوقت',
  notifyAskYes: 'إي، ذكّرني',
  notifyAskNo: 'لا، شكرًا',
  notifyAskDenied: 'الإشعارات موقوفة لقِمّة من إعدادات iPhone. تقدر تفعّلها من هناك ثم من إعدادات قِمّة.',
  notifyAskHome: 'تقدر تغيّرها أي وقت من الإعدادات.',

  missedTitle: 'يوم عادي. نبدأ من اليوم',
  missedBody: 'ما فات شي. تمرين اليوم في مكانه، وتقدر تبدأ بأخفّ منه.',
  missedEasierCta: 'ابدأ بنسخة أخفّ',
  // الأرقام تمرّ بالمنسّق المركزي: جملة عربية بأرقام لاتينية هي عين BUG-019.
  missedEasierLine: (fullMin, easyMin) => `بدل ${formatNumber(fullMin, 'ar')} دقيقة، سوِّ ${formatNumber(easyMin, 'ar')} اليوم`,
  missedTodayOnly: 'يعدّل جلسة اليوم بس — خطتك ما تتغيّر.',

  thursdayHeadsUp: 'الخميس والجمعة فيها عزايم عادة — خلّينا نخفف اليوم ونعوّض السبت.',

  weekTitle: 'أسبوعك الأول',
  weekBehaviourHeading: 'وش سويت',
  weekDaysLine: (days, total) => `التزمت ${formatNumber(days, 'ar')} من ${formatNumber(total, 'ar')}`,
  weekWorkoutsLine: (n) => `خلّصت ${formatNumber(n, 'ar')} تمارين`,
  weekMealsLine: (n) => `سجّلت ${formatNumber(n, 'ar')} وجبة`,
  weekScaleTitle: 'قبل ما تشوف الميزان',
  weekScaleBody: 'وزنك يطلع وينزل أول أسبوعين طبيعي — الرقم اللي يهم يبان بعد ٣-٤ أسابيع.',
  weekWeightHeading: 'وزنك',
  weekWeightLine: (kg) => `آخر وزن سجّلته: ${kg} كجم`,
  weekWeightNone: 'ما سجّلت وزن هالأسبوع — وهذا عادي.',
  weekAccountTitle: 'خطتك معك',
  weekAccountBody: 'أنشئ حسابًا عشان نقدر نوصلك أول ما تنزل المزامنة — وخطتك تنتقل معك كما هي.',
  weekAccountCta: 'أنشئ حساب',
  weekClose: 'كمّل',
}

const EN: FirstWeekStrings = {
  firstWinTitle: 'Let’s start with one thing',
  firstWinEveningNote: 'The day’s nearly done — we’ll start properly tomorrow morning.',
  firstWinDone: 'Done · first step made',
  firstWinOther: 'Or do something else',
  win: {
    warmup: { label: 'Quick warm-up', cta: 'Do it now', minutes: '2 min' },
    meal: { label: 'Log a meal', cta: 'Log it', minutes: '1 min' },
    water: { label: 'Log a glass of water', cta: 'Log it', minutes: 'seconds' },
    dinner: { label: 'Log your dinner', cta: 'Log it', minutes: '1 min' },
  },

  winWarmupMinutes: (minutes) => `${formatNumber(minutes, 'en')} min`,

  notifyAskLine: (time) => `We'll remind you tomorrow at ${time} about your workout — send it?`,
  notifyAskChangeTime: 'Change the time',
  notifyAskYes: 'Yes, remind me',
  notifyAskNo: 'No thanks',
  notifyAskDenied: 'Notifications are off for Qimmah in iPhone Settings. You can turn them on there, then from Qimmah settings.',
  notifyAskHome: 'You can change this anytime in Settings.',

  missedTitle: 'Just a normal day. We start today',
  missedBody: 'Nothing’s lost. Today’s workout is right here, and you can start with a lighter version.',
  missedEasierCta: 'Start a lighter version',
  missedEasierLine: (fullMin, easyMin) => `Instead of ${formatNumber(fullMin, 'en')} min, do ${formatNumber(easyMin, 'en')} today`,
  missedTodayOnly: 'Changes today’s session only — your plan stays as it is.',

  thursdayHeadsUp: 'Thursdays and Fridays usually have gatherings — let’s go lighter today and make it up on Saturday.',

  weekTitle: 'Your first week',
  weekBehaviourHeading: 'What you did',
  weekDaysLine: (days, total) => `You showed up ${formatNumber(days, 'en')} of ${formatNumber(total, 'en')} days`,
  weekWorkoutsLine: (n) => `Finished ${formatNumber(n, 'en')} workouts`,
  weekMealsLine: (n) => `Logged ${formatNumber(n, 'en')} meals`,
  weekScaleTitle: 'Before you look at the scale',
  weekScaleBody: 'Your weight goes up and down in the first couple of weeks — that’s normal. The number that matters shows up after 3–4 weeks.',
  weekWeightHeading: 'Your weight',
  weekWeightLine: (kg) => `Last weight you logged: ${kg} kg`,
  weekWeightNone: 'You didn’t log a weight this week — that’s fine.',
  weekAccountTitle: 'Your plan, with you',
  weekAccountBody: 'Create an account so we can reach you the moment sync ships — and your plan moves with you exactly as it is.',
  weekAccountCta: 'Create an account',
  weekClose: 'Continue',
}

export const firstWeekStrings: Record<Lang, FirstWeekStrings> = { ar: AR, en: EN }
