// نصوص خطوة بيانات الجسم في الإعداد (الخطوة الأولى).
//
// لماذا خطوة أولى؟ حاجز القاصرين يقرأ العمر، وخطوة الهدف تمنع التنشيف/التضخيم
// للقاصر — فلو جاء الهدف قبل العمر لما عمل الحاجز إطلاقًا.
//
// النبرة (§6): فصحى دافئة، بلا لوم ولا تهويل. نشرح **لماذا** نسأل، ونصرّح أن
// الأرقام تقديرية قابلة للتعديل لاحقًا — لا وعود.

import type { Lang } from '@/lib/appPreferences'

export interface BodyStepStrings {
  title: string
  subtitle: string
  /** يشرح سبب السؤال — يبني الثقة بدل أن يبدو استجوابًا. */
  whyNote: string

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
  /** يُعرض حين يقع العمر تحت 18 — تقييد لا طرد. */
  minorNote: string
}

const ar: BodyStepStrings = {
  title: 'نبدأ بأساسياتك',
  subtitle: 'أربعة أرقام تكفي لنحسب احتياجك اليومي بدقّة.',
  whyNote: 'نستخدمها لحساب سعراتك وماكروزك تقديريًا. تقدر تعدّلها في أي وقت من ملفك.',

  ageLabel: 'العمر',
  agePlaceholder: 'مثال: ٢٤',
  ageUnit: 'سنة',

  genderLabel: 'الجنس',
  genderMale: 'ذكر',
  genderFemale: 'أنثى',
  genderNote: 'يدخل في معادلة حساب الطاقة فقط.',

  heightLabel: 'الطول',
  heightPlaceholder: 'مثال: ١٧٥',
  heightUnit: 'سم',

  weightLabel: 'الوزن الحالي',
  weightPlaceholder: 'مثال: ٧٨',
  weightUnit: 'كجم',

  validation: 'أكمل الأربعة بقيم منطقية لنكمل.',
  minorNote: 'لأن عمرك تحت ١٨، نقتصر على أهداف المحافظة على الوزن والصحة العامة — لا تنشيف ولا تضخيم.',
}

const en: BodyStepStrings = {
  title: "Let's start with your basics",
  subtitle: 'Four numbers are enough to estimate your daily needs accurately.',
  whyNote: 'We use these to estimate your calories and macros. You can change them anytime from your profile.',

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
  minorNote: 'Since you are under 18, we keep to weight-maintenance and general-health goals — no cutting or bulking.',
}

export const bodyStepStrings: Record<Lang, BodyStepStrings> = { ar, en }
