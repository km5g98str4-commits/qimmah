// نصوص خطوة بيانات الجسم في الإعداد (الخطوة الأولى).
//
// لماذا خطوة أولى؟ حاجز القاصرين يقرأ العمر، وخطوة الهدف تمنع التنشيف/التضخيم
// للقاصر — فلو جاء الهدف قبل العمر لما عمل الحاجز إطلاقًا.
//
// النبرة (§6): عامية بيضاء سعودية، بلا لوم ولا تهويل. نشرح **ليش** نسأل، ونصرّح أن
// الأرقام تقديرية قابلة للتعديل لاحقًا — لا وعود.

import type { Lang } from '@/lib/appPreferences'

export interface BodyStepStrings {
  title: string
  /**
   * يشرح سبب السؤال — يبني الثقة بدل أن يبدو استجوابًا.
   *
   * [CTO-72] البند ٢: صار **سطر السياق الوحيد** لهذه الخطوة ويُعرض تحت العنوان
   * مباشرةً (كان في أسفل الشاشة بعد كل الحقول). وأُسقط معه `subtitle` الذي كان
   * يقول الشيء نفسه بصياغة أخرى — سطران للمعنى الواحد ازدحامٌ لا تأكيد.
   * يُقرأ الآن عبر `setupWhyLines()` مع أسطر الخطوات الأربع الأخرى.
   */
  whyNote: string

  /**
   * الاسم — **اختياري تمامًا** ولا يحجب التقدّم أبدًا.
   *
   * كان التدفّق الحيّ لا يسأل عنه في أي موضع، فبقي `profile.name` فارغًا لكل
   * مستخدم بُني عبر `OnboardingV2`، وبقيت تحيّة الرئيسية «هلا فيك» **بنيويًا**
   * لا يمكن أن تقول «هلا زياد». الأنبوب كامل من هنا إلى التحيّة؛ ما كان ينقصه
   * إلّا منبعه.
   */
  nameQ: string
  nameLabel: string
  namePlaceholder: string
  /** يقول صراحةً إنه اختياري وقابل للتغيير — لا يُطلب بلهجة إلزام. */
  nameOptional: string

  ageLabel: string
  agePlaceholder: string
  ageUnit: string

  genderLabel: string
  genderMale: string
  genderFemale: string
  genderNote: string

  heightLabel: string
  heightPlaceholder: string
  heightUnit: string

  weightLabel: string
  weightPlaceholder: string
  weightUnit: string

  /** رسالة التحقق عند نقص أو خروج قيمة عن نطاقها. */
  validation: string
  /**
   * ن٢: يُعرض حين يقع العمر تحت ١٣ — الحدّ الأدنى للتطبيق.
   * يسمّي السبب بهدوء بدل رسالة الحقول العامة، وبلا لهجة اتهام:
   * المستخدم لم يُخطئ، والتطبيق ليس له بعد.
   */
  ageBelowMin: string
  /** يُعرض حين يقع العمر تحت 18 — تقييد لا طرد. */
  minorNote: string
}

const ar: BodyStepStrings = {
  title: 'نبدأ بأساسياتك',
  whyNote: 'نستخدمها عشان نقدّر سعراتك وماكروزك. تقدر تعدّلها بأي وقت من ملفك.',

  nameQ: 'وش نسمّيك؟',
  nameLabel: 'الاسم',
  namePlaceholder: 'اسمك الأول',
  nameOptional: 'اختياري — تقدر تتخطاه وتضيفه بعدين من ملفك.',

  ageLabel: 'العمر',
  agePlaceholder: 'مثال: ٢٤',
  ageUnit: 'سنة',

  genderLabel: 'الجنس',
  genderMale: 'ذكر',
  genderFemale: 'أنثى',
  genderNote: 'ندخله بس في حساب الطاقة.',

  heightLabel: 'الطول',
  heightPlaceholder: 'مثال: ١٧٥',
  heightUnit: 'سم',

  weightLabel: 'الوزن الحالي',
  weightPlaceholder: 'مثال: ٧٨',
  weightUnit: 'كجم',

  validation: 'عبّ الأربعة بأرقام منطقية ونكمل.',
  ageBelowMin: 'قِمّة لعمر ١٣ وفوق — نشوفك قريب.',
  minorNote: 'لأن عمرك تحت ١٨، نقتصر على أهداف المحافظة على الوزن والصحة العامة — لا تنشيف ولا تضخيم.',
}

const en: BodyStepStrings = {
  title: "Let's start with your basics",
  whyNote: 'We use these to estimate your calories and macros. You can change them anytime from your profile.',

  nameQ: 'What should we call you?',
  nameLabel: 'Name',
  namePlaceholder: 'Your first name',
  nameOptional: 'Optional — skip it now and add it later from your profile.',

  ageLabel: 'Age',
  agePlaceholder: 'e.g. 24',
  ageUnit: 'years',

  genderLabel: 'Sex',
  genderMale: 'Male',
  genderFemale: 'Female',
  genderNote: 'Used only in the energy calculation.',

  heightLabel: 'Height',
  heightPlaceholder: 'e.g. 175',
  heightUnit: 'cm',

  weightLabel: 'Current weight',
  weightPlaceholder: 'e.g. 78',
  weightUnit: 'kg',

  validation: 'Fill in all four with sensible values to continue.',
  ageBelowMin: 'Qimmah is for ages 13 and up — see you soon.',
  minorNote: 'Since you are under 18, we keep to weight-maintenance and general-health goals — no cutting or bulking.',
}

export const bodyStepStrings: Record<Lang, BodyStepStrings> = { ar, en }
