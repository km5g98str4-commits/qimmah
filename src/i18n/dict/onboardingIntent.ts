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
// النبرة (§6): فصحى دافئة، نشرح **أثر** كل إجابة بلا وعود ولا تهويل.

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
}

export interface OnboardingIntentStrings {
  title: string
  subtitle: string

  intentQ: string
  intents: readonly IntentOption[]

  levelQ: string
  levels: readonly LevelOption[]

  /** سنوات التدريب — تظهر لغير المبتدئ فقط، واختيارية. */
  yearsLabel: string
  yearsUnit: string
  yearsPlaceholder: string
  yearsNote: string

  /** رسالة التحقق حين تنقص النية أو المستوى (أو تخرج السنوات عن نطاقها). */
  validation: string

  /** تسميات مجموعات الاختيار (sr-only). */
  legends: { intent: string; level: string }

  /** صياغة الأهداف الثلاثة لكل مستوى — قلب هذه الموجة. */
  goalWording: Record<V2Level, Record<V2GoalValue, GoalWording>>

  /** أسطر الملخّص في شاشة «خطتك جاهزة». */
  summaryLevel: (label: string) => string
  summaryFocus: (label: string) => string

  /** عدّاد الخطوات — الأرقام تُمرَّر مُنسَّقة مسبقًا (عربية/لاتينية حسب اللغة). */
  stepOf: (n: string, total: string) => string
}

const ar: OnboardingIntentStrings = {
  title: 'وش تبحث عنه في قِمّة؟',
  subtitle: 'إجابتان قصيرتان تحدّدان شكل خطتك ولغة الأهداف اللي نعرضها لك.',

  intentQ: 'أكثر شيء تحتاج مساعدة فيه',
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

  levelQ: 'مستواك في التمرين',
  levels: [
    {
      value: 'beginner',
      label: 'مبتدئ',
      desc: 'جديد على التمرين أو أقل من ستة شهور.',
      icon: 'Sparkles',
    },
    {
      value: 'intermediate',
      label: 'متوسط',
      desc: 'تتمرن بانتظام وتعرف الحركات الأساسية.',
      icon: 'CalendarDays',
    },
    {
      value: 'advanced',
      label: 'متقدّم',
      desc: 'سنوات من التمرين المنتظم وتعرف تفاصيل خطتك.',
      icon: 'Trophy',
    },
  ],

  yearsLabel: 'سنوات التدريب (اختياري)',
  yearsUnit: 'سنة',
  yearsPlaceholder: 'مثال: ٢',
  yearsNote: 'تضبط عدد التمارين في الجلسة بدقّة أكبر. اتركها فارغة لو ما تذكرها.',

  validation: 'اختر ما تبحث عنه ومستواك لنكمل.',

  legends: { intent: 'ما تبحث عنه في قِمّة', level: 'مستواك في التمرين' },

  goalWording: {
    // المبتدئ — لغة نتيجة، صفر مصطلحات صالة.
    beginner: {
      cut: { label: 'خسارة دهون', desc: 'تنزل دهونك بهدوء وتحافظ على قوتك.' },
      maintain: { label: 'ثبات وتحسين عام', desc: 'تثبّت وزنك وتحسّن شكلك وأداءك.' },
      bulk: { label: 'بناء عضل', desc: 'تزيد عضلك بزيادة محسوبة في الأكل.' },
    },
    // المتوسط — المصطلح الشائع في الصالة.
    intermediate: {
      cut: { label: 'تنشيف', desc: 'عجز محسوب تنزل به الدهون وتحافظ على عضلك.' },
      maintain: { label: 'محافظة', desc: 'سعرات صيانة تثبّت وزنك وتحسّن أداءك.' },
      bulk: { label: 'تضخيم', desc: 'فائض محسوب تبني به عضلًا.' },
    },
    // المتقدّم — المصطلحات القياسية كما تُستخدم فعلًا.
    // المسافة داخل «Lean Bulk» غير فاصلة (U+00A0) عن قصد: على عرض 320–375px
    // كان السطر ينكسر بين «(Lean» و«Bulk)» فيتشطّر القوسان في نصّ RTL.
    advanced: {
      cut: { label: 'تنشيف (Cut)', desc: 'عجز موجّه مع بروتين مرتفع للحفاظ على الكتلة والقوة.' },
      maintain: { label: 'إعادة تركيب (Recomposition)', desc: 'صيانة تقريبية: عضل يزيد ودهن ينزل — تقدّم أبطأ يحتاج دقّة.' },
      bulk: { label: 'تضخيم نظيف (Lean\u00A0Bulk)', desc: 'فائض ضيّق يقلّل الدهن المكتسب مقابل نمو أهدأ.' },
    },
  },

  summaryLevel: (label) => `مستواك: ${label}`,
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

  yearsLabel: 'Years of training (optional)',
  yearsUnit: 'years',
  yearsPlaceholder: 'e.g. 2',
  yearsNote: 'It tunes how many exercises fit in a session. Leave it blank if unsure.',

  validation: 'Pick what you are looking for and your level to continue.',

  legends: { intent: 'What you are looking for in Qimmah', level: 'Your training level' },

  goalWording: {
    beginner: {
      cut: { label: 'Fat loss', desc: 'Lose fat steadily while keeping your strength.' },
      maintain: { label: 'Stay steady and improve', desc: 'Hold your weight and improve your shape and performance.' },
      bulk: { label: 'Build muscle', desc: 'Add muscle with a measured increase in food.' },
    },
    intermediate: {
      cut: { label: 'Cut', desc: 'A measured deficit that drops fat and protects muscle.' },
      maintain: { label: 'Maintain', desc: 'Maintenance calories that hold your weight and lift performance.' },
      bulk: { label: 'Bulk', desc: 'A measured surplus to build muscle.' },
    },
    advanced: {
      cut: { label: 'Cut', desc: 'A directed deficit with high protein to defend mass and strength.' },
      maintain: { label: 'Recomposition', desc: 'Around maintenance: muscle up, fat down — slower progress, tighter execution.' },
      bulk: { label: 'Lean Bulk', desc: 'A tight surplus that limits fat gain in exchange for calmer growth.' },
    },
  },

  summaryLevel: (label) => `Level: ${label}`,
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
