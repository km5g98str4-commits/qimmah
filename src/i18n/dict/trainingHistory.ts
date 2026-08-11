// نصوص خطوة «تاريخك التدريبي» في الإعداد — [CTO-QAE-022] M1a.
//
// ═══ لماذا هذه الخطوة أصلًا ═══
// الإعداد كان يسأل المستخدم أن **يصنّف نفسه** («مبتدئ/متوسط/متقدّم») ولا يسأله
// واقعة واحدة يُصحَّح بها التصنيف. والفرق ليس أكاديميًا: مَن تمرّن سنتين ثم
// انقطع سنة ليس «متقدّمًا يتمرّن الآن» — قدرته الحالية أقلّ من معرفته بكثير،
// وبناء خطته على تصنيفه الذاتي يعطيه حملًا لا يحتمله بدنه اليوم.
//
// أربعة أسئلة تسدّ هذا: هل تمرّنت · كم المدّة · متى آخر مرّة · وكم انتظمت.
//
// ═══ لماذا هذه المفردات بالذات ═══
// القيم (`never|tried|months|years` … إلخ) **ليست اختيار واجهة**: هي حرفيًا
// مفردات بنك الأسئلة في `personalization/bank/core.ts` التي يقرؤها
// `classifyExperience`. فلا جدول ترجمة بين الشاشة والمحرّك يشيخ أو يخسر معنى.
//
// ═══ «ما تمرّنت من قبل» — جواب كامل لا فراغ ═══
// من يختاره **لا يُسأل الثلاثة الباقية إطلاقًا**. لا لتخفيف الاحتكاك فحسب، بل
// لأن `classifyExperience` يتجاوز أجوبتها بأذرع صريحة عند `'never'` — فسؤالٌ
// جوابه مُهمَل بالبرهان احتكاكٌ بلا مكسب. القاعدة موثّقة في
// `historyFollowUpsApply` بمواضعها في المحرّك.
//
// النبرة (§6): عامية بيضاء، بلا لوم لمن لم يبدأ بعد وبلا إطراء لمن بدأ.
// «ما جرّبت» ليست نقصًا تُعتذر عنه — هي نقطة بداية تُبنى عليها خطة أنسب.

import type { Lang } from '@/lib/appPreferences'
import type {
  V2LastTrained,
  V2TotalMonths,
  V2TrainedBefore,
  V2TrainingConsistency,
} from '@/lib/onboardingV2Flow'

/** خيار واحد: القيمة كما يقرؤها المحرّك + تسميته + سطر يوضّح المقصود. */
export interface HistoryOption<V extends string> {
  value: V
  label: string
  /** يفصل الخيار عن جاره — بلا هذا يصير «شهور» و«سنة» تخمينًا. */
  hint: string
}

export interface TrainingHistoryStrings {
  title: string
  /** سطر «ليش نسأل» — يشرح **أثر** الجواب لا يعتذر عن السؤال. */
  why: string

  trainedBeforeQ: string
  trainedBefore: readonly HistoryOption<V2TrainedBefore>[]

  totalMonthsQ: string
  totalMonths: readonly HistoryOption<V2TotalMonths>[]

  lastTrainedQ: string
  lastTrained: readonly HistoryOption<V2LastTrained>[]

  consistencyQ: string
  consistency: readonly HistoryOption<V2TrainingConsistency>[]

  /** تُعرض لمن اختار «ما تمرّنت» — تؤكّد أن الجواب كافٍ ولا ينقصه شيء. */
  neverNote: string

  /** رسالة التحقق حين ينقص جواب مطلوب في هذه الخطوة. */
  validation: string

  /** legends مخفية بصريًا لمجموعات الاختيار (a11y). */
  legends: {
    trainedBefore: string
    totalMonths: string
    lastTrained: string
    consistency: string
  }
}

const ar: TrainingHistoryStrings = {
  title: 'تاريخك مع التمرين',
  why: 'خبرتك ووقت انقطاعك يحدّدان حملك المناسب اليوم.',

  trainedBeforeQ: 'تمرّنت من قبل؟',
  trainedBefore: [
    { value: 'never', label: 'لا، أول مرة', hint: 'ما دخلت نادي ولا تمرّنت بانتظام' },
    { value: 'tried', label: 'جرّبت شوي', hint: 'أسابيع متفرّقة وتركت' },
    { value: 'months', label: 'شهور', hint: 'تمرّنت فترة معقولة' },
    { value: 'years', label: 'سنوات', hint: 'التمرين جزء من حياتي' },
  ],

  totalMonthsQ: 'كم مدة تمرينك الكلية؟',
  totalMonths: [
    { value: 'lt3', label: 'أقل من ٣ شهور', hint: '' },
    { value: 'm3_6', label: '٣ إلى ٦ شهور', hint: '' },
    { value: 'm6_12', label: '٦ شهور إلى سنة', hint: '' },
    { value: 'y1_3', label: 'سنة إلى ٣ سنوات', hint: '' },
    { value: 'y3_plus', label: 'أكثر من ٣ سنوات', hint: '' },
  ],

  lastTrainedQ: 'متى آخر مرة تمرّنت؟',
  lastTrained: [
    { value: 'now', label: 'أتمرّن حاليًا', hint: '' },
    { value: 'w2', label: 'خلال أسبوعين', hint: '' },
    { value: 'm1_3', label: 'شهر إلى ٣ شهور', hint: '' },
    { value: 'm3_12', label: '٣ شهور إلى سنة', hint: '' },
    { value: 'y1_plus', label: 'أكثر من سنة', hint: '' },
  ],

  consistencyQ: 'كيف كان انتظامك؟',
  consistency: [
    { value: 'rare', label: 'نادر', hint: 'مرّات متباعدة' },
    { value: 'on_off', label: 'متقطّع', hint: 'أبدأ وأوقف' },
    { value: 'mostly', label: 'غالبًا منتظم', hint: 'أفوّت أحيانًا' },
    { value: 'steady', label: 'منتظم', hint: 'ثابت على جدولي' },
  ],

  neverNote: 'تمام — نبدأ من الأساس، وهذا أفضل مكان نبدأ منه.',

  validation: 'جاوب أسئلة هذي الخطوة عشان تكمّل.',

  legends: {
    trainedBefore: 'هل تمرّنت من قبل',
    totalMonths: 'مدة التمرين الكلية',
    lastTrained: 'آخر مرة تمرّنت فيها',
    consistency: 'مستوى الانتظام',
  },
}

const en: TrainingHistoryStrings = {
  title: 'Your training history',
  why: 'Your experience and time off set the right load for you today.',

  trainedBeforeQ: 'Have you trained before?',
  trainedBefore: [
    { value: 'never', label: 'No, first time', hint: 'No gym, no regular training' },
    { value: 'tried', label: 'Tried a bit', hint: 'A few scattered weeks, then stopped' },
    { value: 'months', label: 'Months', hint: 'Trained for a decent stretch' },
    { value: 'years', label: 'Years', hint: 'Training is part of my life' },
  ],

  totalMonthsQ: 'How long have you trained in total?',
  totalMonths: [
    { value: 'lt3', label: 'Under 3 months', hint: '' },
    { value: 'm3_6', label: '3 to 6 months', hint: '' },
    { value: 'm6_12', label: '6 months to a year', hint: '' },
    { value: 'y1_3', label: '1 to 3 years', hint: '' },
    { value: 'y3_plus', label: 'Over 3 years', hint: '' },
  ],

  lastTrainedQ: 'When did you last train?',
  lastTrained: [
    { value: 'now', label: 'Training now', hint: '' },
    { value: 'w2', label: 'Within 2 weeks', hint: '' },
    { value: 'm1_3', label: '1 to 3 months ago', hint: '' },
    { value: 'm3_12', label: '3 months to a year', hint: '' },
    { value: 'y1_plus', label: 'Over a year ago', hint: '' },
  ],

  consistencyQ: 'How consistent were you?',
  consistency: [
    { value: 'rare', label: 'Rarely', hint: 'Far apart sessions' },
    { value: 'on_off', label: 'On and off', hint: 'Start, then stop' },
    { value: 'mostly', label: 'Mostly steady', hint: 'Miss one now and then' },
    { value: 'steady', label: 'Steady', hint: 'Stuck to my schedule' },
  ],

  neverNote: 'Good — we start from the basics, and that is the best place to start.',

  validation: 'Answer this step to continue.',

  legends: {
    trainedBefore: 'Have you trained before',
    totalMonths: 'Total training duration',
    lastTrained: 'Time since last session',
    consistency: 'Consistency level',
  },
}

export const trainingHistoryStrings: Record<Lang, TrainingHistoryStrings> = { ar, en }
