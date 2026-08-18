import type { Lang } from '@/lib/appPreferences'
import type {
  LastTrainedBucket,
  TotalMonthsBucket,
  TrainedBefore,
  TrainingConsistency,
} from '@/types/onboarding'

export interface HistoryOption<V extends string> {
  value: V
  label: string
  hint: string
}

export interface TrainingHistoryStrings {
  title: string
  why: string
  trainedBeforeQ: string
  trainedBefore: readonly HistoryOption<TrainedBefore>[]
  totalMonthsQ: string
  totalMonths: readonly HistoryOption<TotalMonthsBucket>[]
  lastTrainedQ: string
  lastTrained: readonly HistoryOption<LastTrainedBucket>[]
  consistencyQ: string
  consistency: readonly HistoryOption<TrainingConsistency>[]
  neverNote: string
  validation: string
  legends: {
    trainedBefore: string
    totalMonths: string
    lastTrained: string
    consistency: string
  }
}

const ar: TrainingHistoryStrings = {
  title: 'تاريخك مع التمرين',
  why: 'خبرتك ووقت انقطاعك يحدّدون حمل البداية المناسب لك.',
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
  neverNote: 'تمام — نبدأ من الأساس، وما نحتاج نخترع لك تاريخًا سابقًا.',
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
  why: 'Your experience and time off set a suitable starting load.',
  trainedBeforeQ: 'Have you trained before?',
  trainedBefore: [
    { value: 'never', label: 'No, first time', hint: 'No gym or regular training yet' },
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
    { value: 'rare', label: 'Rarely', hint: 'Sessions far apart' },
    { value: 'on_off', label: 'On and off', hint: 'Start, then stop' },
    { value: 'mostly', label: 'Mostly steady', hint: 'Miss one now and then' },
    { value: 'steady', label: 'Steady', hint: 'Stuck to my schedule' },
  ],
  neverNote: 'Got it — we will start with the basics and will not invent prior training.',
  validation: 'Answer this step to continue.',
  legends: {
    trainedBefore: 'Have you trained before',
    totalMonths: 'Total training duration',
    lastTrained: 'Time since last session',
    consistency: 'Consistency level',
  },
}

export const trainingHistoryStrings: Record<Lang, TrainingHistoryStrings> = { ar, en }
