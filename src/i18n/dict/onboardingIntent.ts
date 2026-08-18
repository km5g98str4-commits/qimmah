// نصوص كتلة «النية والمستوى» في الإعداد + صياغة الأهداف الواعية بالمستوى.
//
// ═══ لماذا كتلة النية؟ ═══
// كان التدفّق يسأل «وش هدفك؟» مباشرة بعد الأساسيات، فيقفز من أرقام الجسم إلى
// قرار تنشيف/تضخيم بلا أي فكرة عمّا يريده المستخدم من التطبيق أصلًا، ولا عن
// مستواه. النتيجة: كل المستخدمين يرون **نفس** صياغة الأهداف، والمبتدئ يُواجَه
// بمصطلحات صالة لا يعرفها.
//
// ═══ الصياغة الواعية بالمستوى (المطلب الجوهري) ═══
// نفس ثلاثة الأهداف (cut / maintain / bulk) — القيم المخزّنة لا تتغيّر — لكن
// **الصياغة** تتبع المستوى المُعلن:
//   • المبتدئ: لغة نتيجة بسيطة («خسارة دهون» · «بناء عضل») بلا أي مصطلح صالة.
//   • المتوسط: المصطلح الشائع («تنشيف» · «محافظة» · «تضخيم»).
//   • المتقدّم: المصطلحات القياسية كما تُستخدم فعلًا
//     (Cut · Recomposition · Lean Bulk).
// وممنوع أن يرى المبتدئ مصطلحات الحمل المتقدّمة (RIR · RPE · Deload · 1RM ·
// AMRAP) في أي نص من مساره — يحرسه `onboarding-intent-proof`.
//
// النبرة (§6): عامية بيضاء سعودية، نشرح **أثر** كل إجابة بلا وعود ولا تهويل.

import type { Lang } from '@/lib/appPreferences'
import type { V2GoalValue } from '@/design-system/v2/labels'
import type { V2Intent, V2Level } from '@/lib/onboardingV2Flow'

export interface IntentOption {
  value: V2Intent
  label: string
  /** يشرح **ما يتغيّر فعلًا** عند اختيار هذا الخيار — لا سؤال بلا أثر. */
  desc: string
  icon: string
}

export interface LevelOption {
  value: V2Level
  label: string
  desc: string
  icon: string
}

/** صياغة هدف واحد لمستوى واحد. */
export interface GoalWording {
  label: string
  desc: string
  /**
   * اسم البرنامج كما يظهر في «ملفك» — [CTO-65] البند ٥. اسم مستقلّ لا تركيب
   * على `label`: «برنامج ثبات وتحسين عام» / "Stay steady and improve program"
   * جملة لا عنوان. والمقصد نفسه: مبتدئ يرى لغة نتيجة، لا مصطلح صالة.
   */
  programTitle: string
}

export interface OnboardingIntentStrings {
  title: string
  subtitle: string

  intentQ: string
  intents: readonly IntentOption[]

  levelQ: string
  levels: readonly LevelOption[]

  /** رسالة التحقق حين تنقص النية أو المستوى. */
  validation: string

  /** تسميات مجموعات الاختيار (sr-only). */
  legends: { intent: string; level: string }

  /** صياغة الأهداف الثلاثة لكل مستوى — قلب هذه الموجة. */
  goalWording: Record<V2Level, Record<V2GoalValue, GoalWording>>

  /** أسطر الملخّص في شاشة «خطتك جاهزة». */
  summaryLevel: (label: string) => string
  /**
   * ═══ الإفصاح بدل التصحيح ═══
   * المستوى المُعلن ليس إلّا إشارة واحدة بوزن ١٫٠ من ٦٫٥ داخل
   * `personalization/experience.ts`، فيُلغيه تاريخُ التدريب في **٦٠٪** من
   * السياقات المقيسة: من يقول «مبتدئ» وتمرّن شهورًا يُبرمَج «متوسّط»، ومن
   * يقول «متقدّم» ولم يتمرّن قطّ يُخفَّض إلى «مبتدئ». وكلاهما سياسة محرّك
   * قد تكون صحيحة — لكن **ألّا يُقال له** خرقٌ لـ§6-4.
   *
   * وملفّ الأوزان مجمَّد بالميثاق (§8-7)، فالمخرج هو الإفصاح لا تعديل الوزن:
   * جملة واحدة هادئة، بلا اعتذار وبلا تلميح أنه أخطأ.
   */
  summaryLevelProgrammed: (label: string) => string
  levelAdjustedNote: (declared: string, programmed: string) => string
  summaryFocus: (label: string) => string

  /** عدّاد الخطوات — الأرقام تُمرَّر مُنسَّقة مسبقًا (عربية/لاتينية حسب اللغة). */
  stepOf: (n: string, total: string) => string
}

const ar: OnboardingIntentStrings = {
  title: 'وش تبحث عنه في قِمّة؟',
  subtitle: 'جوابين سريعين يحدّدون شكل خطتك والكلام اللي نعرضه لك.',

  intentQ: 'وش أكثر شيء تحتاج مساعدة فيه؟',
  intents: [
    {
      value: 'plan',
      label: 'خطة تمرين أمشي عليها',
      desc: 'نركّز على جدولك وتمارينك، والتغذية تبقى إرشادًا مبسّطًا.',
      icon: 'Dumbbell',
    },
    {
      value: 'meals',
      label: 'اقتراحات أكل جاهزة',
      desc: 'نقترح وجباتك اليومية موزّعة على سعراتك.',
      icon: 'Utensils',
    },
    {
      value: 'numbers',
      label: 'أرقامي فقط، وأنا أرتّب أكلي',
      desc: 'نعرض سعراتك وماكروزك بلا اقتراح وجبات.',
      icon: 'BarChart3',
    },
  ],

  levelQ: 'مستواك بالتمرين',
  levels: [
    {
      value: 'beginner',
      label: 'مبتدئ',
      desc: 'توّك تبدأ أو لك أقل من ستة شهور.',
      icon: 'Sparkles',
    },
    {
      value: 'intermediate',
      label: 'متوسط',
      desc: 'تتمرّن بانتظام وتعرف الحركات الأساسية.',
      icon: 'CalendarDays',
    },
    {
      value: 'advanced',
      label: 'متقدّم',
      desc: 'لك سنين تتمرّن بانتظام وتعرف تفاصيل خطتك.',
      icon: 'Trophy',
    },
  ],

  validation: 'اختر وش تحتاج ومستواك ونكمل.',

  legends: { intent: 'وش تحتاج في قِمّة', level: 'مستواك بالتمرين' },

  goalWording: {
    // المبتدئ — لغة نتيجة، صفر مصطلحات صالة.
    beginner: {
      cut: { label: 'خسارة دهون', desc: 'تنزل دهونك بهدوء وتحافظ على قوتك.', programTitle: 'برنامج خسارة الدهون' },
      maintain: { label: 'ثبات وتحسين عام', desc: 'تثبّت وزنك وتحسّن شكلك وأداءك.', programTitle: 'برنامج الثبات والتحسين' },
      bulk: { label: 'بناء عضل', desc: 'تزيد عضلك بزيادة محسوبة في الأكل.', programTitle: 'برنامج بناء العضل' },
    },
    // المتوسط — المصطلح الشائع في الصالة.
    intermediate: {
      cut: { label: 'تنشيف', desc: 'تنزل الدهون بعجز محسوب وتحافظ على عضلك.', programTitle: 'برنامج التنشيف' },
      maintain: { label: 'محافظة', desc: 'تثبت وزنك وتطوّر أداءك بسعرات الصيانة.', programTitle: 'برنامج المحافظة' },
      bulk: { label: 'تضخيم', desc: 'تبني عضل بفائض محسوب.', programTitle: 'برنامج التضخيم' },
    },
    // المتقدّم — المصطلحات القياسية كما تُستخدم فعلًا.
    // المسافة داخل «Lean Bulk» غير فاصلة (U+00A0) عن قصد: على عرض 320–375px
    // كان السطر ينكسر بين «(Lean» و«Bulk)» فيتشطّر القوسان في نصّ RTL.
    advanced: {
      cut: { label: 'تنشيف (Cut)', desc: 'عجز موجّه مع بروتين مرتفع للحفاظ على الكتلة والقوة.', programTitle: 'برنامج التنشيف' },
      maintain: { label: 'إعادة تركيب (Recomposition)', desc: 'صيانة تقريبية: عضل يزيد ودهن ينزل — تقدّم أبطأ يحتاج دقّة.', programTitle: 'برنامج إعادة التركيب' },
      bulk: { label: 'تضخيم نظيف (Lean\u00A0Bulk)', desc: 'فائض ضيّق يقلّل الدهن المكتسب مقابل نمو أهدأ.', programTitle: 'برنامج التضخيم النظيف' },
    },
  },

  summaryLevel: (label) => `مستواك: ${label}`,
  summaryLevelProgrammed: (label) => `بدايتك المبرمَجة: ${label}`,
  levelAdjustedNote: (declared, programmed) =>
    `قلت «${declared}»، وحسب تاريخ تمرينك بدّينا من «${programmed}». تقدر تعدّله بعدين من ملفك.`,
  summaryFocus: (label) => `تركيزك: ${label}`,

  stepOf: (n, total) => `الخطوة ${n} من ${total}`,
}

const en: OnboardingIntentStrings = {
  title: 'What are you looking for in Qimmah?',
  subtitle: 'Two short answers shape your plan and the goal wording we show you.',

  intentQ: 'Where you need the most help',
  intents: [
    {
      value: 'plan',
      label: 'A workout plan to follow',
      desc: 'We focus on your schedule and exercises; nutrition stays simple guidance.',
      icon: 'Dumbbell',
    },
    {
      value: 'meals',
      label: 'Ready meal suggestions',
      desc: 'We suggest your daily meals spread across your calories.',
      icon: 'Utensils',
    },
    {
      value: 'numbers',
      label: 'Just my numbers — I arrange my food',
      desc: 'We show your calories and macros without suggesting meals.',
      icon: 'BarChart3',
    },
  ],

  levelQ: 'Your training level',
  levels: [
    {
      value: 'beginner',
      label: 'Beginner',
      desc: 'New to training, or under six months.',
      icon: 'Sparkles',
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      desc: 'Training regularly and comfortable with the main movements.',
      icon: 'CalendarDays',
    },
    {
      value: 'advanced',
      label: 'Advanced',
      desc: 'Years of consistent training; you know your own programming.',
      icon: 'Trophy',
    },
  ],

  validation: 'Pick what you are looking for and your level to continue.',

  legends: { intent: 'What you are looking for in Qimmah', level: 'Your training level' },

  goalWording: {
    beginner: {
      cut: { label: 'Fat loss', desc: 'Lose fat steadily while keeping your strength.', programTitle: 'Fat loss program' },
      maintain: { label: 'Stay steady and improve', desc: 'Hold your weight and improve your shape and performance.', programTitle: 'Steady progress program' },
      bulk: { label: 'Build muscle', desc: 'Add muscle with a measured increase in food.', programTitle: 'Muscle building program' },
    },
    intermediate: {
      cut: { label: 'Cut', desc: 'A measured deficit that drops fat and protects muscle.', programTitle: 'Cut program' },
      maintain: { label: 'Maintain', desc: 'Maintenance calories that hold your weight and lift performance.', programTitle: 'Maintain program' },
      bulk: { label: 'Bulk', desc: 'A measured surplus to build muscle.', programTitle: 'Bulk program' },
    },
    advanced: {
      cut: { label: 'Cut', desc: 'A directed deficit with high protein to defend mass and strength.', programTitle: 'Cut program' },
      maintain: { label: 'Recomposition', desc: 'Around maintenance: muscle up, fat down — slower progress, tighter execution.', programTitle: 'Recomposition program' },
      bulk: { label: 'Lean Bulk', desc: 'A tight surplus that limits fat gain in exchange for calmer growth.', programTitle: 'Lean bulk program' },
    },
  },

  summaryLevel: (label) => `Level: ${label}`,
  summaryLevelProgrammed: (label) => `Programmed start: ${label}`,
  levelAdjustedNote: (declared, programmed) =>
    `You picked "${declared}", and from your training history we start you at "${programmed}". You can change it later from your profile.`,
  summaryFocus: (label) => `Focus: ${label}`,

  stepOf: (n, total) => `Step ${n} of ${total}`,
}

export const onboardingIntentStrings: Record<Lang, OnboardingIntentStrings> = { ar, en }

/**
 * صياغة الأهداف المناسبة للمستوى المُعلن. المستوى غير المعروف (مسودّة قديمة قبل
 * هذه الموجة) يسقط على «المتوسط» — وهو مطابق للصياغة التي كانت معروضة للجميع،
 * فلا يرى المستخدم القديم تغيّرًا مفاجئًا.
 */
export function goalWordingFor(lang: Lang, level: V2Level | null): Record<V2GoalValue, GoalWording> {
  const s = onboardingIntentStrings[lang] ?? onboardingIntentStrings.ar
  return s.goalWording[level ?? 'intermediate']
}
