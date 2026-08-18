// نصوص الإحماء — [SOVEREIGN-TODAY-001] المهمّة ١.
//
// قاموس **خاص بهذه الحارة** لا تعديل على قاموس مشترك (§1.4/٢).
// النبرة عامية بيضاء، والإنجليزية ودودة غير رسمية (§6).
//
// كل رقم يمرّ بـ`formatNumber` عند الكتابة هنا: القاموس يعرف لغته، فيربط
// المنسّق بها مباشرةً بدل أن يترك أرقامًا لاتينية داخل جملة عربية (BUG-019).

import type { Lang } from '@/lib/appPreferences'
import { formatNumber } from '@/lib/numberFormat'
import type { WarmupStepLabel } from '@/lib/warmupPlan'

export interface WarmupStrings {
  title: string
  /** يقول **من أين** جاء الإحماء: من تمارين اليوم لا من قائمة عامّة. */
  subtitle: string
  /** «≈ دقيقتان» — الرقم من الخطة المبنيّة لا مكتوبًا بيد. */
  estimate: (minutes: number) => string
  stepLabel: Record<WarmupStepLabel, string>
  /** «٦٠ كجم × ٥» */
  loadLine: (kg: number, reps: number) => string
  /** «مجموعة خفيفة × ١٠» — بلا وزن مقترح؛ الخفّة يقدّرها صاحبها. */
  lightLine: (reps: number) => string
  startCta: string
  skipCta: string
  /** يُقال صراحةً: التخطّي لا يُحتسب إحماءً. */
  skipNote: string
  hideForever: string
  doneBadge: string
  /** عنوان مرحلة الجلسة في مسار «إحماء ← تمارين ← إنهاء». */
  stageWarmup: string
  stageExercises: string
  stageFinish: string
  ariaStage: (current: number, total: number) => string
}

const AR: WarmupStrings = {
  title: 'إحماء قصير',
  subtitle: 'من تمارين اليوم نفسها — أخفّ قبل ما تثقّل.',
  estimate: (minutes) => `≈ ${formatNumber(minutes, 'ar')} دقيقة`,
  stepLabel: {
    bar: 'البار',
    pct40: '٤٠٪',
    pct60: '٦٠٪',
    pct80: '٨٠٪',
    light: 'خفيفة',
  },
  loadLine: (kg, reps) => `${formatNumber(kg, 'ar')} كجم × ${formatNumber(reps, 'ar')}`,
  lightLine: (reps) => `مجموعة خفيفة × ${formatNumber(reps, 'ar')}`,
  startCta: 'خلّصت الإحماء · ابدأ التمرين',
  skipCta: 'تخطّى الإحماء',
  skipNote: 'لو تخطّيته ما نحسبه إحماءً.',
  hideForever: 'لا تعرض الإحماء مرّة ثانية',
  doneBadge: 'تم الإحماء',
  stageWarmup: 'إحماء',
  stageExercises: 'التمارين',
  stageFinish: 'الإنهاء',
  ariaStage: (current, total) => `المرحلة ${formatNumber(current, 'ar')} من ${formatNumber(total, 'ar')}`,
}

const EN: WarmupStrings = {
  title: 'Quick warm-up',
  subtitle: 'Built from today’s own exercises — lighter before you go heavy.',
  estimate: (minutes) => `≈ ${formatNumber(minutes, 'en')} min`,
  stepLabel: {
    bar: 'Empty bar',
    pct40: '40%',
    pct60: '60%',
    pct80: '80%',
    light: 'Light',
  },
  loadLine: (kg, reps) => `${formatNumber(kg, 'en')} kg × ${formatNumber(reps, 'en')}`,
  lightLine: (reps) => `Light set × ${formatNumber(reps, 'en')}`,
  startCta: 'Warm-up done · start the workout',
  skipCta: 'Skip the warm-up',
  skipNote: 'If you skip it, we don’t count it as a warm-up.',
  hideForever: 'Don’t show the warm-up again',
  doneBadge: 'Warm-up done',
  stageWarmup: 'Warm-up',
  stageExercises: 'Exercises',
  stageFinish: 'Finish',
  ariaStage: (current, total) => `Stage ${formatNumber(current, 'en')} of ${formatNumber(total, 'en')}`,
}

export const warmupStrings: Record<Lang, WarmupStrings> = { ar: AR, en: EN }
