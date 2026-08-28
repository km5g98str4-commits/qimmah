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
  /**
   * يقول **من أين** جاء الإحماء. [FOUNDER-QA] عُدِّل: كان يقول «من تمارين اليوم
   * نفسها» وحدها، وهي الجملة التي جعلت بطاقة «جهاز ضغط الصدر» تبدو منطقية.
   * صار يقول الحقيقة الكاملة: حركات مرونة أوّلًا، ثم تسخين على تمارين اليوم.
   */
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
  /** «٣٠ ثانية» — حركة المرونة بالزمن لا بالعدّ. */
  mobilityLine: (seconds: number) => string
  /**
   * الترويسة الصغيرة فوق اسم خطوة القوّة — [FOUNDER-QA] جوهر الإصلاح النصّي.
   *
   * بلاغ المؤسس: بطاقة إحماء عنوانها «جهاز ضغط الصدر». الاسم كان يقف وحده تحت
   * عنوان «إحماء قصير»، فيُقرأ الجهاز **كأنه نشاط الإحماء نفسه**. هذه الترويسة
   * تفصل الهويّتين في سطرين: ما تفعله (تسخين) وعلى أي جهاز تفعله. الاسم يبقى في
   * `bdi` مستقلّ فلا يُدسّ داخل قالب نصّي يكسر الاتجاه.
   */
  setOfPrefix: string
  /** بديل الصورة النصّي لحركة المرونة — وصف بديل لقارئ الشاشة. */
  mobilityImageAlt: (name: string) => string
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
  subtitle: 'حركتين مرونة، وبعدها تسخين على تمارين اليوم — أخفّ قبل ما تثقّل.',
  estimate: (minutes) => `≈ ${formatNumber(minutes, 'ar')} دقيقة`,
  stepLabel: {
    mobility: 'مرونة',
    bar: 'البار',
    pct40: '٤٠٪',
    pct60: '٦٠٪',
    pct80: '٨٠٪',
    light: 'خفيفة',
  },
  stepCue: {
    mobility: 'حركة فتح قبل الحديد — بهدوء وبمدى مريح، بلا شدّ ولا وجع. تنفّس عادي.',
    bar: 'بالبار فاضي: امشِ الحركة كاملة ببطء وحسّ بمسارها وتوازنك قبل ما تضيف أي وزن.',
    pct40: 'وزن خفيف جدًّا — الهدف تسخين المفصل، مو التعب. نزول متحكّم وطلوع مرتاح.',
    pct60: 'هنا تثبّت مسار الحركة وسرعتها — نفس التكنيك اللي بتشتغل فيه بالثقيل بالضبط.',
    pct80: 'قريب من وزن شغلك — تكرارات قليلة وتوقّف وأنت قوي، خلّ الشدّة للمجموعات الجاية.',
    light: 'مجموعة تسخين على نفس الجهاز، بوزن تقدر عليه براحة — مدى حركة كامل ونزول بطيء.',
  },
  afterWarmup: (exercises) =>
    `بعده على طول: ${formatNumber(exercises, 'ar')} تمارين اليوم، وبعدها الإنهاء.`,
  loadLine: (kg, reps) => `${formatNumber(kg, 'ar')} كجم × ${formatNumber(reps, 'ar')}`,
  lightLine: (reps) => `مجموعة خفيفة × ${formatNumber(reps, 'ar')}`,
  mobilityLine: (seconds) => `${formatNumber(seconds, 'ar')} ثانية`,
  setOfPrefix: 'تسخين على',
  mobilityImageAlt: (name) => `صورة حركة ${name}`,
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
  subtitle: 'Two mobility drills, then a ramp-up on today’s exercises — lighter before you go heavy.',
  estimate: (minutes) => `≈ ${formatNumber(minutes, 'en')} min`,
  stepLabel: {
    mobility: 'Mobility',
    bar: 'Empty bar',
    pct40: '40%',
    pct60: '60%',
    pct80: '80%',
    light: 'Light',
  },
  stepCue: {
    mobility: 'Open things up before the iron — easy range, no forcing, nothing that hurts. Keep breathing normally.',
    bar: 'Empty bar: walk the full movement slowly and feel the path and your balance before you add any weight.',
    pct40: 'Very light — this is to warm the joint, not to tire you. Controlled down, easy up.',
    pct60: 'This is where you lock in the path and the tempo — exactly the technique you will use when it gets heavy.',
    pct80: 'Close to your working weight — few reps, stop while you are still strong, save the effort for the working sets.',
    light: 'A ramp-up set on that same machine, at a weight you handle comfortably — full range, slow on the way down.',
  },
  afterWarmup: (exercises) =>
    `Straight after: today’s ${formatNumber(exercises, 'en')} exercises, then you finish.`,
  loadLine: (kg, reps) => `${formatNumber(kg, 'en')} kg × ${formatNumber(reps, 'en')}`,
  lightLine: (reps) => `Light set × ${formatNumber(reps, 'en')}`,
  mobilityLine: (seconds) => `${formatNumber(seconds, 'en')} sec`,
  setOfPrefix: 'Warm-up set on',
  mobilityImageAlt: (name) => `${name} illustration`,
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
