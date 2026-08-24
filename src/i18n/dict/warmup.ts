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
  /**
   * تعليمة كل نوع خطوة — [WORKOUT-CONTINUITY-001] الإصلاح ٤.
   *
   * الإحماء كان اسمًا ورقمًا بلا كلمة واحدة عن **الغرض**. وقياس المستودع:
   * ١١٢ من ١٨١ تمرينًا لها إطار معروف الحقوق، و٦٩ بلا صورة إطلاقًا — ومنها
   * أجهزة الخطط المولّدة نفسها. فالنصّ هنا ليس بديلًا مؤقّتًا عن صورة، بل هو
   * التعليمة الوحيدة الممكنة الصادقة لأكثر من ثلث الكتالوج. صورةٌ خاطئة أسوأ
   * من لا صورة (§5)، والوسائط المُعلَّمة لا تعود (§8 قرار مقفل ٨).
   */
  stepCue: Record<WarmupStepLabel, string>
  /** ما ينتظر خلف الإحماء — الإحماء مرحلة لا نهاية. */
  afterWarmup: (exercises: number) => string
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
  stepCue: {
    bar: 'بالبار فاضي: امشِ الحركة كاملة ببطء وحسّ بمسارها وتوازنك قبل ما تضيف أي وزن.',
    pct40: 'وزن خفيف جدًّا — الهدف تسخين المفصل، مو التعب. نزول متحكّم وطلوع مرتاح.',
    pct60: 'هنا تثبّت مسار الحركة وسرعتها — نفس التكنيك اللي بتشتغل فيه بالثقيل بالضبط.',
    pct80: 'قريب من وزن شغلك — تكرارات قليلة وتوقّف وأنت قوي، خلّ الشدّة للمجموعات الجاية.',
    light: 'وزن تقدر عليه براحة — مدى حركة كامل، نزول بطيء، وحسّ بالعضلة تصحى.',
  },
  afterWarmup: (exercises) =>
    `بعده على طول: ${formatNumber(exercises, 'ar')} تمارين اليوم، وبعدها الإنهاء.`,
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
  stepCue: {
    bar: 'Empty bar: walk the full movement slowly and feel the path and your balance before you add any weight.',
    pct40: 'Very light — this is to warm the joint, not to tire you. Controlled down, easy up.',
    pct60: 'This is where you lock in the path and the tempo — exactly the technique you will use when it gets heavy.',
    pct80: 'Close to your working weight — few reps, stop while you are still strong, save the effort for the working sets.',
    light: 'A weight you can handle comfortably — full range, slow on the way down, feel the muscle wake up.',
  },
  afterWarmup: (exercises) =>
    `Straight after: today’s ${formatNumber(exercises, 'en')} exercises, then you finish.`,
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
